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
  test(channel + ": la corrección de la reserva incluye la invitación", () => {
    const context = { whatsapp_mvp: {
      state: "handoff", language: "es", check_in: "2026-11-25", check_out: "2026-11-28",
      adults: 2, children: 0, child_ages: [], pets: 0, total_guests: 2,
    } };
    const result = handleGlobalReservationTurn({ message: "Ahora somos tres adultos", context, channel });
    assert.equal(result.context.whatsapp_mvp.adults, 3);
    assert.match(result.reply, /Actualicé tu solicitud/);
    assert.match(result.reply, /¿Quieres saber cómo son nuestras habitaciones\?/);
    assert.equal(result.reply.split(ROOMS_PAGE_URL).length - 1, 1);
    const summary = handleGlobalReservationTurn({ message: "¿Cuántas personas somos en total?", context: result.context, channel });
    assert.doesNotMatch(summary.reply, /https:\/\//);
  });
}
