import test from "node:test";
import assert from "node:assert/strict";
import { BOOKING_UNDERSTANDING_SCHEMA, bookingUnderstandingInput, validateBookingUnderstanding } from "../src/modules/ai/ai.booking-understanding.js";
import { handleGlobalReservationTurn } from "../src/modules/ai/ai.reservation.js";

const now = new Date("2026-11-15T12:00:00Z");
const message = "Quiero reservar para mañana y el día siguiente";
const proposal = { check_in: "2026-11-16", check_out: "2026-11-18" };
const parsed = (extra = {}) => validateBookingUnderstanding({ intent: "details", language: "es", updates: [], clarification: null,
  proposal: { ...proposal, evidence: "mañana y el día siguiente" }, ...extra }, message);
const turn = (message, context = {}, understanding = null) => handleGlobalReservationTurn({ message, context, understanding, now });

test("el contrato del proveedor exige idioma y propuesta separados de datos confirmados", () => {
  assert.ok(BOOKING_UNDERSTANDING_SCHEMA.required.includes("language"));
  assert.ok(BOOKING_UNDERSTANDING_SCHEMA.required.includes("proposal"));
  assert.deepEqual(parsed().proposal, proposal);
  for (const p of [ { ...proposal, check_out: "2026-11-15" }, { ...proposal, check_in: "2026-02-30" },
    { ...proposal, evidence: "no lo dijo" }, { ...proposal, total_amount: 1 } ]) {
    assert.equal(parsed({ proposal: p }), null);
  }
  assert.equal(parsed({ updates: [{ field: "check_in", value: proposal.check_in, evidence: "mañana" }] }), null);
  assert.equal(parsed({ intent: "hypothetical" }), null);
  assert.equal(parsed({ intent: "information" }), null);
  assert.equal(parsed({ language: "inventado" }), null);
});

test("propuesta no confirma fechas, no cotiza ni hereda el grupo anterior", () => {
  const old = { whatsapp_mvp: { state: "quoted", adults: 4, children: 0, pets: 0, check_in: "2026-11-25", check_out: "2026-11-28", staff_confirmation: { confirmed: true } } };
  const result = turn(message, old, parsed());
  assert.deepEqual(result.context.whatsapp_mvp.pending_proposal, proposal);
  for (const key of ["check_in", "check_out", "adults", "children", "pets", "staff_confirmation"]) assert.equal(result.context.whatsapp_mvp[key], undefined);
  assert.equal(result.action, undefined);
  assert.match(result.reply, /2 noches.*16.*18/);
  assert.doesNotMatch(result.reply, /S\//);
});

for (const answer of ["sí", "sí por favor", "correcto", "confirmo", "yes", "yes please"]) test("confirmar propuesta continúa sin repetir fechas: " + answer, () => {
  const first = turn(message, {}, parsed());
  const result = turn(answer, first.context);
  assert.equal(result.context.whatsapp_mvp.check_in, proposal.check_in);
  assert.equal(result.context.whatsapp_mvp.check_out, proposal.check_out);
  assert.equal(result.context.whatsapp_mvp.pending_proposal, undefined);
  assert.equal(result.context.whatsapp_mvp.awaiting, "guests");
  assert.equal(result.action, undefined);
  assert.doesNotMatch(result.reply, /S\//);
  assert.equal(result.context.whatsapp_mvp.language, answer.startsWith("yes") ? "en" : "es");
});

test("puede aportar grupo mientras confirma fechas y conserva lo conocido", () => {
  const first = turn(message, {}, parsed());
  const understanding = { intent: "details", language: "en", fields: { adults: 2, children: 1, child_ages: [3] } };
  const group = turn("My husband and I with our child aged three", first.context, understanding);
  assert.equal(group.context.whatsapp_mvp.adults, 2);
  assert.deepEqual(group.context.whatsapp_mvp.pending_proposal, proposal);
  assert.equal(group.context.whatsapp_mvp.check_in, undefined);
  assert.match(group.reply, /Would you stay 2 nights/);
  const accepted = turn("yes", group.context);
  assert.equal(accepted.context.whatsapp_mvp.awaiting, "pets");
  assert.match(accepted.reply, /pets/);
  assert.equal(accepted.context.whatsapp_mvp.language, "en");
});

test("rechazar propuesta conserva personas pero exige aclarar fechas antes de cotizar", () => {
  const context = { whatsapp_mvp: { state: "collecting", adults: 2, children: 0, child_ages: [], pets: 0,
    check_in: "2026-11-25", check_out: "2026-11-28", pending_proposal: proposal } };
  const no = turn("no", context);
  assert.equal(no.context.whatsapp_mvp.adults, 2);
  assert.equal(no.context.whatsapp_mvp.dates_need_confirmation, true);
  assert.equal(no.context.whatsapp_mvp.pending_proposal, undefined);
  const notADate = turn("2 adultos", no.context, { intent: "details", fields: { adults: 2 } });
  assert.equal(notADate.action, undefined);
  assert.equal(notADate.context.whatsapp_mvp.awaiting, "dates");
  const corrected = turn("del 20 al 22 de noviembre", no.context, { intent: "correction", fields: { check_in: "2026-11-20", check_out: "2026-11-22" } });
  assert.equal(corrected.context.whatsapp_mvp.dates_need_confirmation, undefined);
});

test("una nueva solicitud no hereda una propuesta pendiente", () => {
  const first = turn(message, {}, parsed());
  const next = turn("Quiero otra reserva para mí solo", first.context, { intent: "new_request", fields: { adults: 1 } });
  assert.equal(next.context.whatsapp_mvp.pending_proposal, undefined);
  assert.equal(next.context.whatsapp_mvp.check_in, undefined);
  assert.equal(next.context.whatsapp_mvp.adults, 1);
});

test("edad dudosa no elimina adultos y niño claramente expresados", () => {
  const message = "Somos dos adultos y nuestro niño casi cumple cinco";
  const understanding = validateBookingUnderstanding({ intent: "unclear", language: "es", proposal: null,
    updates: [{ field: "adults", value: 2, evidence: "dos adultos" }, { field: "children", value: 1, evidence: "nuestro niño" }],
    clarification: "¿Cuántos años cumplidos tiene el niño?", clarification_field: "ages" }, message);
  assert.ok(understanding);
  const result = turn(message, {}, understanding);
  assert.equal(result.context.whatsapp_mvp.adults, 2);
  assert.equal(result.context.whatsapp_mvp.children, 1);
  assert.equal(result.context.whatsapp_mvp.child_ages, undefined);
  assert.match(result.reply, /años cumplidos/);
  assert.equal(result.action, undefined);
  const clarified = turn("4", result.context);
  assert.deepEqual(clarified.context.whatsapp_mvp.child_ages, [4]);
  assert.equal(clarified.context.whatsapp_mvp.adults, 2);
  assert.equal(clarified.context.whatsapp_mvp.awaiting, "dates");
});

test("una edad corta completa la lista parcial sin borrar la primera edad", () => {
  const result = turn("7", { whatsapp_mvp: { state: "collecting", awaiting: "ages", adults: 2, children: 2, child_ages: [4] } });
  assert.deepEqual(result.context.whatsapp_mvp.child_ages, [4, 7]);
});

test("fecha peruana, idioma y propuesta mínima llegan al intérprete sin detalles privados", () => {
  const input = JSON.parse(bookingUnderstandingInput("yes please", { language: "en", pending_proposal: { ...proposal, customer_email: "private@example.com" } }, new Date("2026-11-16T02:00:00Z")));
  assert.equal(input.fecha_hoy_peru, "2026-11-15");
  assert.equal(input.solicitud_actual.language, "en");
  assert.deepEqual(input.solicitud_actual.pending_proposal, proposal);
  assert.doesNotMatch(JSON.stringify(input), /private/);
});

test("una propuesta vencida o corrupta nunca se confirma", () => {
  for (const pending_proposal of [{ check_in: "2026-11-10", check_out: "2026-11-12" }, { check_in: "2026-02-30", check_out: "2026-12-01" }]) {
    const result = turn("sí", { whatsapp_mvp: { state: "collecting", pending_proposal } });
    assert.equal(result.context.whatsapp_mvp.check_in, undefined);
    assert.equal(result.context.whatsapp_mvp.awaiting, "dates");
    assert.equal(result.action, undefined);
  }
});
