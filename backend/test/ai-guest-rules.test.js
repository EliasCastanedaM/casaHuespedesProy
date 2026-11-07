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




  assert.match(prompt, /solicita cantidad y edades/);
  assert.doesNotMatch(prompt, /50 % del diferencial|Desde los 9 años/);
  assert.match(prompt, /S\/ 20/);
  assert.ok(prompt.includes("S/ 20 por mascota y por noche"));

  assert.match(prompt, /8 o más huéspedes/);
  assert.match(prompt, /Familiar 1 y Familiar 2/);
  assert.match(prompt, /Familiar 1 y Familiar 2 son dos categorías diferentes/);
  assert.match(prompt, /No escribas símbolos de Markdown/);
  assert.match(prompt, /no traduzcas, abrevies ni combines los nombres/);
  assert.match(prompt, /no confirmes su admisión sin autorización humana/);
});

test("la instrucción global aplica la política humana a todos los canales", () => {
  const prompt = buildHotelAssistantPrompt();
  assert.match(prompt, /Instrucción global/);
  assert.match(prompt, /Nunca confirmes disponibilidad por tu cuenta/);
  assert.match(prompt, /el menú es opcional/);
  assert.match(prompt, /entrega la conversación al equipo/);
  for (const channel of ["whatsapp", "instagram", "facebook"]) {
    assert.equal(buildHotelAssistantPrompt({ channel }), prompt);
  }
  assert.doesNotMatch(prompt, /WhatsApp|Instagram|Facebook|Reglas específicas del canal|consultar_disponibilidad/);
});

test("las solicitudes especiales requieren revisión humana, no reservas automáticas", () => {
  assert.equal(requiresManualReview("Quiero reservar y llevo dos perros", { hasReservationIntent: true }), "reserva con mascota");
  assert.equal(requiresManualReview("Somos 2 adultos y un niño", { bookingInProgress: true }), "reserva con niños");
  assert.equal(requiresManualReview("Somos 8 personas"), "grupo de 8 o más personas");
  assert.equal(requiresManualReview("grupo de 12"), "grupo de 8 o más personas");
  assert.equal(requiresManualReview("Somos 3 personas"), null);
  assert.equal(requiresManualReview("¿Aceptan perros?"), null);
  assert.equal(requiresManualReview("¿Aceptan perros?", { bookingInProgress: true }), null);
  assert.equal(requiresManualReview("¿Desde qué edad pagan los niños?", { bookingInProgress: true }), null);
  assert.equal(requiresManualReview("Llevaré un perro", { bookingInProgress: true }), "reserva con mascota");
  assert.match(humanReviewReply("reserva con mascota"), /una persona/);
});

test("la bienvenida global usa el texto aprobado y las cinco opciones", () => {
  const expected = "¡Hola! 👋 Bienvenido a Casa Huéspedes. Puedes escribirme en el idioma que prefieras.\n\n¿Buscas información del hotel o quieres hacer una reserva? Puedo ayudarte con estas opciones:\n\n1️⃣ Habitaciones y tarifas\n2️⃣ Servicios del hotel\n3️⃣ Ubicación y cómo llegar\n4️⃣ Políticas y preguntas frecuentes\n5️⃣ Reservas\n\nPuedes elegir una opción o escribirme directamente lo que necesitas. 😊";
  for (const greeting of ["Hola", "Hello", "Olá", "Bonjour"]) {
    assert.equal(whatsAppMvpWelcome(greeting), expected);
  }
  assert.ok(buildHotelAssistantPrompt().includes(expected));
  assert.match(whatsAppMvpReservationReply(), /verificar disponibilidad/);
});
