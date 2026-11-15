import test from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { env } from "../src/config/env.js";
import { pool } from "../src/config/db.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";

function setup(t, state, interpret) {
  let context = { whatsapp_mvp: structuredClone(state) };
  const requests = [];
  const previousKey = env.openai.apiKey;
  env.openai.apiKey = "mock-only-no-network";
  t.after(() => { env.openai.apiKey = previousKey; });
  t.mock.method(pool, "query", async (sql, params = []) => {
    if (/INSERT INTO .*bookings|UPDATE .*bookings/i.test(sql)) throw new Error("No se autorizan reservas en esta prueba");
    if (sql.includes("SELECT booking_context")) return { rows: [{ booking_context: context, booking_context_expires_at: new Date(Date.now() + 3600000) }] };
    if (sql.includes("INSERT INTO ai_conversations") && sql.includes("booking_context")) context = JSON.parse(params[2]);
    return { rows: [] };
  });
  t.mock.method(OpenAI.Responses.prototype, "create", async (request, options) => {
    requests.push({ request, options });
    assert.equal(request.text?.format?.name, "hotel_booking_understanding");
    const answer = await interpret(JSON.parse(request.input));
    return { id: "mock-understanding", status: "completed", output_text: JSON.stringify(answer) };
  });
  return { requests, context: () => context };
}

const active = { state: "collecting", awaiting: "guests", check_in: "2026-11-25", check_out: "2026-11-28", language: "es" };
for (const channel of ["whatsapp", "instagram", "facebook"]) test(channel + ": usa interpretación real del flujo antes de las reglas de reserva", async t => {
  const message = "Voy con mi señora y mis dos peques de tres y siete";
  const db = setup(t, { ...active, customer_email: "private@example.com" }, () => ({
    intent: "details", updates: [["adults", 2], ["children", 2], ["child_ages", [3, 7]]].map(([field, value]) => ({ field, value, evidence: message })), clarification: null,
  }));
  const result = await generateAiReply({ channel, externalUserId: "semantic-family-" + channel, message });
  assert.match(result.reply, /mascotas/);
  assert.equal(db.context().whatsapp_mvp.adults, 2);
  assert.deepEqual(db.context().whatsapp_mvp.child_ages, [3, 7]);
  assert.equal(db.requests.length, 1);
  assert.doesNotMatch(db.requests[0].request.input, /private@example|historial|pricing_quote/);
  assert.equal(db.requests[0].request.store, false);
  assert.equal(db.requests[0].request.previous_response_id, undefined);
  assert.equal(db.requests[0].options.maxRetries, 0);
});

test("una consulta hipotética no cambia ocupantes aunque contenga números reconocibles", async t => {
  const state = { ...active, state: "quoted", adults: 2, children: 0, child_ages: [], pets: 0 };
  const db = setup(t, state, () => ({ intent: "hypothetical", updates: [], clarification: null }));
  const result = await generateAiReply({ channel: "instagram", externalUserId: "hypothetical", message: "¿Y si fuéramos cuatro adultos?" });
  assert.match(result.reply, /cambiar|consultar/);
  assert.deepEqual(db.context().whatsapp_mvp, state);
});

test("una reserva independiente no envía ocupantes anteriores al intérprete", async t => {
  const db = setup(t, { ...active, adults: 4, children: 2, child_ages: [4, 7], pets: 1 }, input => {
    assert.equal(input.solicitud_actual.adults, undefined);
    assert.equal(input.solicitud_actual.child_ages, undefined);
    return { intent: "new_request", updates: [
      { field: "check_in", value: "2026-12-25", evidence: "25 al 28 de diciembre de 2026" },
      { field: "check_out", value: "2026-12-28", evidence: "25 al 28 de diciembre de 2026" },
    ], clarification: null };
  });
  const result = await generateAiReply({ channel: "facebook", externalUserId: "fresh-semantic", message: "Quiero reservar del 25 al 28 de diciembre de 2026" });
  assert.match(result.reply, /Cuántas personas/);
  assert.equal(db.context().whatsapp_mvp.adults, undefined);
});

test("fallo del proveedor mantiene respuesta de aclaración y no modifica una consulta", async t => {
  const state = { ...active, state: "quoted", adults: 2, children: 0, child_ages: [], pets: 0 };
  const db = setup(t, state, () => { throw Object.assign(new Error("mock timeout"), { code: "ETIMEDOUT" }); });
  const result = await generateAiReply({ channel: "instagram", externalUserId: "semantic-failure", message: "¿Y si fuéramos cuatro adultos?" });
  assert.match(result.reply, /cambio|consultar/);
  assert.deepEqual(db.context().whatsapp_mvp, state);
});
