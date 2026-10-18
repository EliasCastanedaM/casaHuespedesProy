import test from "node:test";
import assert from "node:assert/strict";
import {
  handleWhatsAppMvpTurn,
  formatWhatsAppHandoffSummary,
} from "../src/modules/ai/ai.whatsapp-mvp.js";

function turn(message, context = {}) {
  return handleWhatsAppMvpTurn({ message, context });
}

test("MVP pregunta solamente los datos pendientes antes de pasar al equipo", () => {
  const start = turn("Hola, quiero reservar");
  assert.equal(start.mode, "whatsapp_mvp_collecting");
  assert.match(start.reply, /fechas de entrada y salida/);
  const dates = turn("Del 20/11/2026 al 22/11/2026", start.context);
  assert.match(dates.reply, /Cuántas personas|Cuántas|Cu[aá]ntas personas/);
  const guests = turn("Somos 2 adultos y 1 niño", dates.context);
  assert.match(guests.reply, /edades/i);
  const ages = turn("6", guests.context);
  assert.match(ages.reply, /mascotas/i);
  const done = turn("No", ages.context);
  assert.equal(done.mode, "human_review_required");
  assert.match(done.reply, /una persona de nuestro equipo/i);
  assert.deepEqual(done.context.whatsapp_mvp.child_ages, [6]);
  assert.equal(done.context.whatsapp_mvp.total_guests, 3);
  assert.equal(done.context.whatsapp_mvp.pets, 0);
  assert.equal(done.context.whatsapp_mvp.state, "handoff");
  const summary = formatWhatsAppHandoffSummary(done.context.whatsapp_mvp);
  assert.match(summary, /20\/11\/2026/);
  assert.match(summary, /22\/11\/2026/);
  assert.match(summary, /SIN reserva creada/);
});

test("intención tras consulta de habitaciones retiene datos sin iniciar reserva prematuramente", () => {
  const info = turn("Somos 2 adultos y queremos una doble");
  assert.equal(info.handled, false);
  assert.equal(info.context.whatsapp_mvp.state, "browsing");
  const booking = turn("Quiero reservar del 20/11/2026 al 22/11/2026 sin mascotas", info.context);
  assert.equal(booking.mode, "human_review_required");
  assert.equal(booking.context.whatsapp_mvp.category_slug, "doble");
  assert.equal(booking.context.whatsapp_mvp.adults, 2);
});

test("menú opcional no obliga a elegir ni elimina contexto", () => {
  const info = turn("Quiero reservar");
  const menu = turn("¿Qué opciones hay en el menú?", info.context);
  assert.equal(menu.mode, "whatsapp_mvp_menu");
  assert.match(menu.reply, /Habitaciones y tarifas/);
  assert.deepEqual(menu.context, info.context);
});

test("reserva en inglés recoge datos y deriva en su idioma", () => {
  const start = turn("I want to book a room");
  assert.match(start.reply, /check-in and check-out/i);
  const details = turn("20/11/2026 to 22/11/2026, 2 adults, no pets, no children", start.context);
  assert.equal(details.mode, "human_review_required");
  assert.match(details.reply, /I'll connect you with our team/);
});

test("el MVP nunca crea reservas aunque el cliente entregue todos los datos", () => {
  const result = turn("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin mascotas y sin niños");
  assert.equal(result.mode, "human_review_required");
  assert.match(result.reply, /confirmar disponibilidad/);
  assert.doesNotMatch(result.reply, /pre-reserva creada|pago|confirmada/i);
});

test("reserva con niños sin edad pregunta antes de escalar", () => {
  const result = turn("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos y 1 niño sin mascotas");
  assert.equal(result.mode, "whatsapp_mvp_collecting");
  assert.match(result.reply, /edades/i);
});
