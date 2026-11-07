import test from "node:test";
import assert from "node:assert/strict";
import OpenAI from "openai";
import { pool } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { buildHotelAssistantPrompt } from "../src/modules/ai/ai.prompt.js";
import {
  generateAiReply,
  confirmGlobalReservation,
  updateGlobalReservationContextForHandoff,
} from "../src/modules/ai/ai.service.js";
import { globalReservationContext, handleGlobalReservationTurn } from "../src/modules/ai/ai.reservation.js";
import { formatCategoryPricesReply } from "../src/modules/ai/ai.pricing.js";
import { setHandoffState } from "../src/modules/meta/meta.service.js";

const channels = ["whatsapp", "instagram", "facebook"];
const categories = [{
  slug: "matrimonial", name: "Matrimonial Estándar", capacity: 2,
  price_per_night: 120, total_quantity: 3,
}];

test("las tarifas dan la misma indicación de validación humana en cada plataforma", () => {
  const expected = formatCategoryPricesReply(categories, "Precios");
  assert.match(expected, /una persona de nuestro equipo confirmará disponibilidad/);
  for (const channel of channels) {
    assert.equal(formatCategoryPricesReply(categories, "Precios", { channel }), expected);
  }
});

test("los borradores anteriores conservan datos sin heredar una aprobación de disponibilidad", () => {
  const context = globalReservationContext({
    intent_id: "old-draft", state: "draft", active: true,
    check_in: "2026-11-20", check_out: "2026-11-22", guests_count: 2,
    category_slug: "matrimonial", availability: { available_count: 3 },
    customer: { full_name: "Ana Pérez", phone: "51912345678", email: "ana@example.com" },
  });
  assert.equal(context.whatsapp_mvp.intent_id, "old-draft");
  assert.equal(context.whatsapp_mvp.check_in, "2026-11-20");
  assert.equal(context.whatsapp_mvp.customer_email, "ana@example.com");
  assert.equal(context.whatsapp_mvp.state, "browsing");
  assert.equal(context.whatsapp_mvp.staff_confirmation, undefined);
  const booked = globalReservationContext({
    state: "booked", intent_id: "old-booking",
    booking: { id: 7, booking_code: "OLD-7", status: "pending_payment" },
  });
  const report = handleGlobalReservationTurn({ message: "Ya pagué", context: booked, channel: "instagram" });
  assert.equal(report.action, "report_payment");
  assert.equal(report.context.whatsapp_mvp.intent_id, "old-booking");
});

function fakeDatabase(t) {
  const contexts = new Map();
  const queries = [];
  let handoff = true;
  const key = (params) => params.slice(0, 2).join(":");
  t.mock.method(pool, "connect", async () => {
    throw new Error("El asesor no debe consultar inventario ni iniciar una reserva sin aprobación");
  });
  t.mock.method(pool, "query", async (sql, params = []) => {
    queries.push({ sql, params });
    if (sql.includes("FROM room_categories rc")) return { rows: categories };
    if (sql.includes("SELECT handoff_active")) return { rows: [{ handoff_active: handoff }] };
    if (sql.includes("SELECT booking_context")) {
      const stored = contexts.get(key(params));
      return { rows: stored ? [{
        booking_context: structuredClone(stored),
        booking_context_expires_at: new Date(Date.now() + 86_400_000),
      }] : [] };
    }
    if (sql.includes("INSERT INTO ai_conversations") && sql.includes("booking_context")) {
      contexts.set(key(params), JSON.parse(params[2]));
      return { rows: [] };
    }
    if (sql.includes("SELECT last_response_id")) return { rows: [{ last_response_id: "old_channel_response" }] };
    if (sql.includes("SELECT author, content FROM meta_messages")) return { rows: [] };
    if (sql.includes("INSERT INTO ai_conversations") || sql.includes("ai_usage_events")) return { rows: [] };
    throw new Error("Consulta inesperada: " + sql);
  });
  return { contexts, queries, setHandoff: (active) => { handoff = active; } };
}

test("los tres canales envían la misma instrucción y herramientas en generación y continuación", async (t) => {
  fakeDatabase(t);
  const previousKey = env.openai.apiKey;
  env.openai.apiKey = "test-key-no-network";
  t.after(() => { env.openai.apiKey = previousKey; });
  const requests = [];
  t.mock.method(OpenAI.Responses.prototype, "create", async (request) => {
    requests.push(request);
    if (requests.length % 2 === 1) return {
      id: "test-tool-" + requests.length,
      output: [{ type: "function_call", name: "listar_habitaciones", arguments: "{}", call_id: "catalog" }],
    };
    return { id: "test-reply-" + requests.length, output: [], output_text: "Con gusto te ayudo con el hospedaje." };
  });
  for (const channel of channels) {
    const result = await generateAiReply({ channel, externalUserId: "global-model", message: "Gracias" });
    assert.match(result.reply, /hospedaje/);
  }
  assert.equal(requests.length, 6);
  for (let i = 0; i < requests.length; i++) {
    assert.equal(requests[i].instructions, buildHotelAssistantPrompt());
    assert.deepEqual(requests[i].tools.map((tool) => tool.name), ["listar_habitaciones"]);
    if (i % 2 === 0) assert.equal(requests[i].previous_response_id, undefined);
  }
});

test("cada canal recoge datos, espera al equipo y continúa con los mismos pagos", async (t) => {
  const db = fakeDatabase(t);
  const externalUserId = "51987654321";
  const now = new Date("2026-11-06T18:00:00-05:00");
  let commonHandoffReply;
  for (const channel of channels) {
    const send = (message) => generateAiReply({ channel, externalUserId, message, now });
    const start = await send("Quiero reservar");
    assert.match(start.reply, /fechas/);
    const dates = await send("Del 20/11/2026 al 22/11/2026");
    assert.match(dates.reply, /personas/i);
    const done = await send("2 adultos, sin niños y sin mascotas");
    assert.equal(done.mode, "human_review_required");
    assert.equal(done.reply, commonHandoffReply ?? done.reply);
    commonHandoffReply = done.reply;
    assert.doesNotMatch(done.reply, /Pagar ahora|https:\/\//);

    db.setHandoff(false);
    await assert.rejects(confirmGlobalReservation({
      channel, externalUserId, categorySlug: "matrimonial", totalAmount: 240,
    }), /atención humana activa/);
    db.setHandoff(true);
    const approved = await confirmGlobalReservation({
      channel, externalUserId, categorySlug: "matrimonial", totalAmount: 240,
    });
    assert.match(approved.reply, /nombre/i);
    const named = await send("Ana Pérez");
    if (channel === "whatsapp") {
      assert.match(named.reply, /correo/i);
    } else {
      // A social-network ID that looks like a phone must never become contact data.
      assert.match(named.reply, /teléfono|celular|número/i);
      assert.ok(!db.contexts.get(channel + ":" + externalUserId).whatsapp_mvp.customer_phone);
      const phone = await send("51912345678");
      assert.match(phone.reply, /correo/i);
    }
    const payment = await send("ana@example.com");
    assert.match(payment.reply, /establecimiento/i);
    assert.match(payment.reply, /Culqi/i);
    const context = db.contexts.get(channel + ":" + externalUserId);
    for (const [message, method] of [["1", "pay_at_property"], ["2", "culqi_link"]]) {
      const result = handleGlobalReservationTurn({ message, context, channel, externalUserId, now });
      assert.equal(result.action, "create_booking");
      assert.equal(result.paymentMethod, method);
    }
    const changed = await send("Cambio las fechas al 23/11/2026 al 25/11/2026");
    assert.equal(changed.mode, "human_review_required");
    assert.equal(db.contexts.get(channel + ":" + externalUserId).whatsapp_mvp.staff_confirmation, undefined);
  }
  assert.equal(db.queries.some(({ sql }) => /FROM bookings|INSERT INTO bookings/.test(sql)), false);
});

test("las actualizaciones durante revisión humana se conservan en todos los canales", async (t) => {
  const db = fakeDatabase(t);
  for (const channel of channels) {
    const id = channel + "-handoff";
    db.contexts.set(channel + ":" + id, {
      state: "whatsapp_mvp",
      whatsapp_mvp: {
        state: "handoff", check_in: "2026-11-20", check_out: "2026-11-22",
        adults: 2, children: 0, pets: 0, total_guests: 2, language: "es",
      },
    });
    assert.equal(await updateGlobalReservationContextForHandoff({
      channel, externalUserId: id, message: "Ahora somos 3 adultos",
    }), true);
    assert.equal(db.contexts.get(channel + ":" + id).whatsapp_mvp.total_guests, 3);
  }
});

test("devolver un chat a la IA aplica la misma liberación de borrador en cada canal", async () => {
  for (const channel of channels) {
    const queries = [];
    const db = { query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [{ channel, handoff_active: false }] };
    } };
    await setHandoffState(channel, "global-release", false, db);
    assert.equal(queries.length, 2);
    assert.deepEqual(queries[1].params, [channel, "global-release"]);
    assert.match(queries[1].sql, /NOT .*staff_confirmation/);
  }
});
