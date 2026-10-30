import test from "node:test";
import assert from "node:assert/strict";
import {
  handleWhatsAppMvpTurn,
  formatWhatsAppHandoffSummary,
} from "../src/modules/ai/ai.whatsapp-mvp.js";

function turn(message, context = {}, now = new Date()) {
  return handleWhatsAppMvpTurn({ message, context, now });
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
  const booking = turn("Quiero reservar del 20/11/2026 al 22/11/2026 sin mascotas y sin niños", info.context);
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


test("nunca supone que dos adultos implica ausencia de niños", () => {
  const start = turn("Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin mascotas");
  assert.equal(start.mode, "whatsapp_mvp_collecting");
  assert.match(start.reply, /Viajan niños/i);
  const done = turn("No", start.context);
  assert.equal(done.mode, "human_review_required");
  assert.equal(done.context.whatsapp_mvp.children, 0);
});

test("un mensaje autónomo sobre el menú no inicia reserva", () => {
  const menu = turn("¿Qué opciones hay en el menú?");
  assert.equal(menu.mode, "whatsapp_mvp_menu");
  assert.equal(menu.context.whatsapp_mvp, undefined);
});


test("una consulta de información no reinicia una reserva en curso", () => {
  const progress = turn("Quiero reservar");
  const info = turn("¿Cuáles son las tarifas?", progress.context);
  assert.equal(info.handled, false);
  assert.deepEqual(info.context, progress.context);
  const resumed = turn("20/11/2026 al 22/11/2026", info.context);
  assert.equal(resumed.mode, "whatsapp_mvp_collecting");
  assert.match(resumed.reply, /personas/i);
});


test("reconoce números escritos con palabras y conserva el contexto de la reserva", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const start = turn("Me podría ayudar a reservar por favor", {}, now);
  const dates = turn("Fecha: 8/12 Salida: 10/12", start.context, now);
  assert.equal(dates.context.whatsapp_mvp.check_in, "2026-12-08");
  assert.equal(dates.context.whatsapp_mvp.check_out, "2026-12-10");
  const guests = turn("Dos adultos, sin niños", dates.context, now);
  assert.equal(guests.context.whatsapp_mvp.adults, 2);
  assert.equal(guests.context.whatsapp_mvp.children, 0);
  assert.equal(guests.context.whatsapp_mvp.total_guests, 2);
  assert.match(guests.reply, /mascotas/i);
  const done = turn("No llevamos mascotas", guests.context, now);
  assert.equal(done.mode, "human_review_required");
  assert.equal(done.context.whatsapp_mvp.pets, 0);
  const summary = formatWhatsAppHandoffSummary(done.context.whatsapp_mvp);
  assert.match(summary, /Adultos: 2/);
  assert.match(summary, /Niños: 0/);
  assert.match(summary, /Huéspedes totales: 2/);
});

test("interpreta respuestas cortas, edades con años y preguntas con número escrito", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const start = turn("Quiero reservar", {}, now);
  const dates = turn("20/11/2026 al 22/11/2026", start.context, now);
  const guests = turn("Somos dos adultos y dos niños", dates.context, now);
  assert.match(guests.reply, /edades/i);
  const ages = turn("5 años y 7 años", guests.context, now);
  assert.deepEqual(ages.context.whatsapp_mvp.child_ages, [5, 7]);
  assert.match(ages.reply, /mascotas/i);
  const done = turn("No.", ages.context, now);
  assert.equal(done.mode, "human_review_required");
  assert.equal(done.context.whatsapp_mvp.total_guests, 4);
});

test("infiere el año siguiente para fechas sin año y acepta 'dos adultos?' como respuesta", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const start = turn("Quiero reservar", {}, now);
  const dates = turn("8/1 al 10/1", start.context, now);
  assert.equal(dates.context.whatsapp_mvp.check_in, "2027-01-08");
  assert.equal(dates.context.whatsapp_mvp.check_out, "2027-01-10");
  const guests = turn("Dos adultos?", dates.context, now);
  assert.equal(guests.context.whatsapp_mvp.adults, 2);
  assert.match(guests.reply, /niños/i);
  const noChildren = turn("No hay niños", guests.context, now);
  assert.equal(noChildren.context.whatsapp_mvp.children, 0);
  assert.match(noChildren.reply, /mascotas/i);
});


test("normaliza fechas sin año que ya estaban guardadas en el contexto", () => {
  const now = new Date("2026-10-30T15:00:00.000Z");
  const context = {
    state: "whatsapp_mvp",
    whatsapp_mvp: {
      state: "collecting",
      awaiting: "guests",
      check_in: "10/12",
      check_out: "12/12",
      children: 0,
      child_ages: [],
      language: "es"
    }
  };
  const result = turn("Dos adultos", context, now);
  assert.equal(result.context.whatsapp_mvp.check_in, "2026-12-10");
  assert.equal(result.context.whatsapp_mvp.check_out, "2026-12-12");
  assert.equal(result.context.whatsapp_mvp.adults, 2);
  assert.match(result.reply, /mascotas/i);
});
