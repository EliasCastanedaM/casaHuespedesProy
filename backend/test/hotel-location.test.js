import test from "node:test";
import assert from "node:assert/strict";

import {
  getPublicHotelProfileService,
  formatOfficialHotelAddress,
} from "../src/modules/hotel/hotelProfile.service.js";
import {
  isHotelLocationInquiry,
  isLocationMenuSelection,
  formatHotelLocationReply,
} from "../src/modules/ai/ai.location-info.js";
import { globalAssistantWelcome } from "../src/modules/ai/ai.guest-rules.js";

const verified = {
  name: "Casa Huéspedes Pimentel",
  street_address: "Calle José Quiñones 237",
  district: "Pimentel",
  region: "Lambayeque",
  country: "Perú",
};

test("el perfil público lee solo la dirección verificada sin datos internos", async () => {
  const db = {
    async query(sql) {
      assert.match(sql, /FROM public.hotel_profile/);
      assert.match(sql, /verification_status = 'verified'/);
      assert.doesNotMatch(sql, /SELECT \*/);
      return { rows: [{hotel_name: verified.name, ...verified}] };
    },
  };
  const profile = await getPublicHotelProfileService(db);
  assert.deepEqual(profile, verified);
  assert.equal(formatOfficialHotelAddress(profile),
    "Calle José Quiñones 237, Pimentel, Lambayeque, Perú");
});

test("el mensaje aprobado no depende de una dirección escrita en la base", async () => {
  const result = await getPublicHotelProfileService({
    async query() { return { rows: [] }; },
  });
  assert.equal(result, null);
  const answer = formatHotelLocationReply(result, "¿Dónde están ubicados?");
  assert.doesNotMatch(answer, /237|233/);
  assert.ok(answer.includes("https://maps.app.goo.gl/PfXxizCYj1YqeY9x7"));
});

test("IA responde ubicación oficial sin repetir la reserva", () => {
  for (const question of [
    "Antes de seguir, ¿dónde están ubicados?",
    "¿Cuál es la dirección del hospedaje?",
    "¿Dónde está el hospedaje?",
    "¿Cómo llego a Casa Huéspedes?",
    "¿Dónde queda?",
    "Ubicación y cómo llegar",
    "Antes de reservar, ¿me pasas la ubicación?",
    "¿Cómo llegar desde Chiclayo?",
    "Pásame el mapa",
    "Necesito un taxi",
    "¿Hay cochera o estacionamiento?",
    "What is your address?",
    "Onde fica o hotel?",
  ]) {
    assert.equal(isHotelLocationInquiry(question), true, question);
    const reply = formatHotelLocationReply(verified, question);
    assert.ok(reply.includes("https://maps.app.goo.gl/PfXxizCYj1YqeY9x7"));
    assert.ok(reply.includes("Servicio de taxi: +51 949 489 526"));
    assert.ok(reply.includes("Estacionamiento las 24 horas: +51 979 123 264"));
    assert.match(reply, /servicios de terceros/);
    assert.doesNotMatch(reply, /Víctor|Victor|Obar|Sr\.|maps\/search/);
  }
});

test("no intercepta preguntas de otros lugares ni pasos de reserva", () => {
  for (const question of [
    "¿Dónde está el museo?",
    "¿Cómo llego al muelle?",
    "Quiero reservar la Triple",
    "Cambio de dirección de mi reserva",
    "¿Cuál es la dirección de correo?",
  ]) assert.equal(isHotelLocationInquiry(question), false, question);
});

test("la selección de ubicación acepta número, emoji y opción explícita", () => {
  const menu = [{ author: "assistant", content: globalAssistantWelcome() }];
  for (const message of ["3", "3️⃣", "opción 3", "la opción 3"]) {
    assert.equal(isLocationMenuSelection(message, menu), true, message);
  }
  assert.equal(isLocationMenuSelection("opción 3"), true);
  assert.equal(isLocationMenuSelection("3", [{ author: "assistant", content: "¿Qué edad tiene el niño?" }]), false);
  assert.equal(isLocationMenuSelection("3", []), false);
  assert.equal(isLocationMenuSelection("2", menu), false);
});
