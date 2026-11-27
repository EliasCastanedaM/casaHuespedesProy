import './helpers/booking-fixture-clock.js';
import test from "node:test";
import assert from "node:assert/strict";
import { appendRoomInvitation, ROOMS_PAGE_URL } from "../src/modules/ai/ai.room-invitation.js";
import { handleGlobalReservationTurn } from "../src/modules/ai/ai.reservation.js";

test("la invitación conserva la respuesta y añade el enlace una sola vez", () => {
  for (const language of ["es", "en", "pt", "fr"]) {
    const reply = appendRoomInvitation("Solicitud actualizada.", language);
    assert.ok(reply.startsWith("Solicitud actualizada."));
    assert.ok(reply.endsWith(ROOMS_PAGE_URL));
    assert.equal(appendRoomInvitation(reply, language), reply);
  }
  assert.equal(appendRoomInvitation(""), "");
});

for (const channel of ["whatsapp", "instagram", "facebook"]) {
  test(channel + ": corregir una reserva no interrumpe con un enlace repetitivo", () => {
    const context = { whatsapp_mvp: {
      state: "handoff", language: "es", check_in: "2026-11-25", check_out: "2026-11-28",
      adults: 2, children: 0, child_ages: [], pets: 0, total_guests: 2,
    } };
    const result = handleGlobalReservationTurn({ message: "Ahora somos tres adultos", context, channel });
    assert.equal(result.context.whatsapp_mvp.adults, 3);
    assert.match(result.reply, /Actualicé tu solicitud/);
    assert.doesNotMatch(result.reply, /¿Quieres saber cómo son nuestras habitaciones\?/);
    assert.doesNotMatch(result.reply, /https:\/\//);
    const summary = handleGlobalReservationTurn({ message: "¿Cuántas personas somos en total?", context: result.context, channel });
    assert.doesNotMatch(summary.reply, /https:\/\//);
  });
}


for (const channel of ["whatsapp", "instagram", "facebook"]) {
  test(channel + ": charla natural pregunta edades y mascotas sin repetir el enlace", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    const first = handleGlobalReservationTurn({
      channel, now,
      message: "Hola, quisiera reservar del 5 al 7 de diciembre de 2026 para 2 adultos y 2 niños",
    });
    assert.equal(first.context.whatsapp_mvp.check_in, "2026-12-05");
    assert.equal(first.context.whatsapp_mvp.check_out, "2026-12-07");
    assert.equal(first.context.whatsapp_mvp.adults, 2);
    assert.equal(first.context.whatsapp_mvp.children, 2);
    assert.match(first.reply, /edades/i);
    assert.doesNotMatch(first.reply, /https?:/);

    const ages = handleGlobalReservationTurn({
      channel, now, context: first.context, message: "Tienen 4 y 15 años",
    });
    assert.deepEqual(ages.context.whatsapp_mvp.child_ages, [4,15]);
    assert.match(ages.reply, /mascotas/i);
    assert.doesNotMatch(ages.reply, /https?:/);

    const noPets = handleGlobalReservationTurn({
      channel, now, context: ages.context, message: "No llevamos mascotas",
    });
    assert.equal(noPets.context.whatsapp_mvp.pets, 0);
    assert.equal(noPets.context.whatsapp_mvp.total_guests, 4);
    assert.equal(noPets.context.whatsapp_mvp.state, "quoted");
    assert.equal(noPets.reply.split(ROOMS_PAGE_URL).length - 1, 1);
    assert.match(noPets.reply, /reservar/i);

    const interest = handleGlobalReservationTurn({
      channel, now, context: noPets.context, message: "Sí quiero",
    });
    assert.equal(interest.action, "request_staff_review");
    assert.equal(interest.reply, undefined);
    assert.equal(interest.context.whatsapp_mvp.check_in, "2026-12-05");
    assert.equal(interest.context.whatsapp_mvp.children, 2);
    assert.equal(interest.context.whatsapp_mvp.pets, 0);
  });
}

test("una aclaración incierta no añade promoción de habitaciones", () => {
  const result = handleGlobalReservationTurn({
    message: "Creo que sería desde el 12, todavía no sé",
    context: { whatsapp_mvp: { state: "collecting", awaiting: "dates", language: "es" } },
    understanding: {
      intent: "unclear", fields: {}, clarification_field: "dates",
      clarification: "¿Me confirmas la fecha de entrada?",
    },
  });
  assert.match(result.reply, /confirmas la fecha de entrada/);
  assert.doesNotMatch(result.reply, /habitaciones|https?:/i);
});
