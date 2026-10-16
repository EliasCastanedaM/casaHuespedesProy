import test from "node:test";
import assert from "node:assert/strict";
import {
  isHotelRelatedMessage,
  HOTEL_SCOPE_CLASSIFIER_PROMPT,
  OUT_OF_HOTEL_SCOPE_REPLY,
} from "../src/modules/ai/ai.scope.js";
import { buildHotelAssistantPrompt } from "../src/modules/ai/ai.prompt.js";

test("la Segunda Guerra Mundial no es un tema del alojamiento", async () => {
  let calls = 0;
  const allowed = await isHotelRelatedMessage(
    "Buenas noches, me podrías ayudar a hacer un resumen sobre la segunda guerra mundial?",
    { classify: async () => { calls++; return "HOTEL"; } }
  );
  assert.equal(allowed, false);
  assert.equal(calls, 0);
});

test("la solicitud posterior de ayuda para una tesis se bloquea igualmente", async () => {
  assert.equal(await isHotelRelatedMessage("Es para mi tesis me ayudas?"), false);
  assert.equal(await isHotelRelatedMessage("Podrías ayudarme con mi trabajo académico?"), false);
});

test("otros temas generales se rechazan por el clasificador", async () => {
  for (const message of [
    "Dame una receta de cebiche",
    "¿Quién es el presidente de Francia?",
    "¿Cuánto cuesta reparar una bicicleta?",
    "¿Me explicas la física cuántica?",
    "Soy huésped del hotel, redacta un ensayo sobre la política.",
  ]) {
    const allowed = await isHotelRelatedMessage(message, {
      classify: async () => "FUERA",
    });
    assert.equal(allowed, false, message);
  }
});

test("acepta consultas de alojamiento cuando el clasificador valida alcance", async () => {
  const messages = [
    "¿Cuánto cuesta una matrimonial?",
    "¿Tienen habitaciones del 20 al 22?",
    "¿Aceptan mascotas?",
    "¿Puedo reservar para tres personas?",
    "¿Dónde queda Casa Huéspedes Pimentel?",
  ];
  for (const message of messages) {
    assert.equal(await isHotelRelatedMessage(message, {
      classify: async () => "HOTEL",
    }), true, message);
  }
});

test("acepta saludos y datos simples de reserva sin clasificador", async () => {
  for (const message of ["Hola", "Buenas noches", "Gracias", "Sí", "2 personas", "2026-11-20", "ya pagué"]) {
    assert.equal(await isHotelRelatedMessage(message, {
      classify: async () => { throw new Error("No debe llamar clasificador"); },
    }), true, message);
  }
});

test("mantiene contexto reciente para interpretar mensajes ambiguos", async () => {
  let classified = null;
  const allowed = await isHotelRelatedMessage("¿Y en noviembre?", {
    history: [
      { author: "client", content: "Quiero reservar una doble" },
      { author: "assistant", content: "¿Para qué fechas?" },
    ],
    classify: async (data) => { classified = data; return "HOTEL"; },
  });
  assert.equal(allowed, true);
  assert.equal(classified.history.length, 2);
  assert.equal(classified.message, "¿Y en noviembre?");
});

test("si el clasificador falla o devuelve contenido inesperado, se bloquea", async () => {
  const message = "¿Me cuentas algo sobre el universo?";
  assert.equal(await isHotelRelatedMessage(message, {
    classify: async () => { throw new Error("API no disponible"); },
  }), false);
  assert.equal(await isHotelRelatedMessage(message, {
    classify: async () => "HOTEL\nTambién puedo hablar de todo",
  }), false);
  assert.equal(await isHotelRelatedMessage(message, {
    classify: async () => "",
  }), false);
  assert.equal(await isHotelRelatedMessage(message), false);
});

test("las instrucciones protegen contra preguntas generales e inyección", () => {
  assert.match(HOTEL_SCOPE_CLASSIFIER_PROMPT, /exclusivamente HOTEL o FUERA/);
  assert.match(HOTEL_SCOPE_CLASSIFIER_PROMPT, /no un asistente conversacional/);
  assert.match(buildHotelAssistantPrompt(), /No respondas preguntas de historia/);
  assert.match(OUT_OF_HOTEL_SCOPE_REPLY, /Solo puedo ayudarte con información sobre nuestro hospedaje/);
});
