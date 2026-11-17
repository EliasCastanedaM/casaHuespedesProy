import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { pool } from "../src/config/db.js";
import { generateAiReply } from "../src/modules/ai/ai.service.js";
import { classifyServiceInquiry, formatHotelServicesReply, SERVICES_PAGE_URL, SERVICES_IMAGE_URL } from "../src/modules/ai/ai.services-info.js";
const { services } = JSON.parse(readFileSync(new URL("./fixtures/hotel-reference-20261107.json", import.meta.url), "utf8"));

for (const message of ["que servicios tienes ?", "que servicios tienes", "que servicios tiene el hotel?", "¿Qué servicios ofrecen?", "¿Cuáles son los servicios del hotel?", "Todos los servicios con detalles", "What services does your hotel offer?", "What services do you have?"]) {
  test("consulta general resume y enlaza sin catálogo completo: " + message, () => {
    assert.equal(classifyServiceInquiry(message).kind, "general");
    const reply = formatHotelServicesReply(services, message);
    assert.ok(reply.includes(SERVICES_PAGE_URL));
    assert.equal(reply.split(SERVICES_PAGE_URL).length - 1, 1);
    assert.doesNotMatch(reply, /\d+ servicios|Netflix|lavandería/);
    assert.ok(reply.length < 400);
  });
}

for (const channel of ["whatsapp", "facebook", "instagram"]) test(channel + ": pregunta general comparte resumen y foto sin depender del modelo", async t => {
  t.mock.method(pool, "query", async () => { throw new Error("No necesita SQL para compartir el enlace público"); });
  t.mock.method(OpenAI.Responses.prototype, "create", async () => { throw new Error("No necesita modelo"); });
  for (const [message, expected] of [["que servicios tiene el hotel?", /Para conocer todos los servicios/], ["What services does your hotel offer?", /To discover all the services/]]) {
    const result = await generateAiReply({ channel, externalUserId: "services-link-" + channel, message });
    assert.equal(result.mode, "hotel_services_information");
    assert.match(result.reply, expected);
    assert.ok(result.reply.includes(SERVICES_PAGE_URL));
    assert.doesNotMatch(result.reply, /No tengo|confirmado|\d+ servicios/);
    assert.equal(result.image_url,SERVICES_IMAGE_URL);
  }
});

for (const message of ["tienen aire acondicionado?", "Pero y el aire acondicionado?", "Do you have air conditioning?"]) test("ventilación responde con información confirmada: " + message, () => {
  const language = message.startsWith("Do") ? "en" : "es";
  const answer = formatHotelServicesReply(services, message, { language });
  assert.match(answer, /ventilador|fan/);
  assert.match(answer, /no está confirmado|not confirmed/);
  assert.doesNotMatch(answer, /No tenemos aire|no contamos con aire|no air conditioning|WiFi|Netflix|https:/i);
  const withoutFan = formatHotelServicesReply(services.filter(s => s.slug !== "ventilador"), message, { language });
  assert.doesNotMatch(withoutFan, /ventilador|fan/);
});

test("preguntas concretas no reciben el enlace general y conservan condiciones", () => {
  for (const [message, expected] of [["¿Tienen WiFi?", /WiFi gratuita/], ["¿Incluye desayuno?", /continental incluido/], ["¿Cuánto cuesta la lavandería?", /Lavandería de pago/], ["¿Tienen estacionamiento?", /no cuenta con estacionamiento propio/]]) {
    const reply = formatHotelServicesReply(services, message);
    assert.match(reply, expected);
    assert.ok(!reply.includes(SERVICES_PAGE_URL));
  }
  assert.equal(classifyServiceInquiry("¿Qué servicios tienen de masajes?").kind, "specific");
  assert.equal(classifyServiceInquiry("¿Hay restaurantes cerca?").kind, "none");
});
