import test from "node:test";
import assert from "node:assert/strict";
import { buildHotelAssistantPrompt } from "../src/modules/ai/ai.prompt.js";
import {
  requiresManualReview,
  whatsAppMvpWelcome,
  whatsAppMvpReservationReply,
  humanReviewReply,
} from "../src/modules/ai/ai.guest-rules.js";

test("las reglas de huéspedes incluyen los niños, mascotas, grupos y seis categorías", () => {
  const prompt = buildHotelAssistantPrompt();
  assert.match(prompt, /0 a 4 años/);
  assert.match(prompt, /5 a 8 años/);
  assert.match(prompt, /50 % de la diferencia/);
  assert.match(prompt, /9 años/);
  assert.match(prompt, /S\/ 20 por mascota y por noche/);
  assert.match(prompt, /8 o más personas/);
  assert.match(prompt, /Familiar 1 y Familiar 2/);
  assert.match(prompt, /NO calcules ni prometas un total/);
});

test("las reglas del WhatsApp MVP impiden prometer reservas o disponibilidad", () => {
  const prompt = buildHotelAssistantPrompt({ channel: "whatsapp" });
  assert.match(prompt, /MVP WhatsApp/);
  assert.match(prompt, /no confirmes disponibilidad ni crees reservas/);
  assert.match(prompt, /el menú es opcional/);
  assert.match(prompt, /deriva a una persona/);
  const instagram = buildHotelAssistantPrompt({ channel: "instagram" });
  assert.match(instagram, /Instagram\/Facebook: conserva la consulta de disponibilidad/);
});

test("las solicitudes especiales requieren revisión humana, no reservas automáticas", () => {
  assert.equal(requiresManualReview("Quiero reservar y llevo dos perros", { hasReservationIntent: true }), "reserva con mascota");
  assert.equal(requiresManualReview("Somos 2 adultos y un niño", { bookingInProgress: true }), "reserva con niños");
  assert.equal(requiresManualReview("Somos 8 personas"), "grupo de 8 o más personas");
  assert.equal(requiresManualReview("grupo de 12"), "grupo de 8 o más personas");
  assert.equal(requiresManualReview("Somos 3 personas"), null);
  assert.equal(requiresManualReview("¿Aceptan perros?"), null);
  assert.match(humanReviewReply("reserva con mascota"), /una persona/);
});

test("la bienvenida WhatsApp es breve y acepta idiomas", () => {
  assert.match(whatsAppMvpWelcome("Hola"), /idioma que prefieras/);
  assert.match(whatsAppMvpWelcome("Hello"), /write in any language/);
  assert.doesNotMatch(whatsAppMvpWelcome("Hola"), /S\/ \d+/);
  assert.match(whatsAppMvpReservationReply(), /verificar disponibilidad/);
});