import test from "node:test";
import assert from "node:assert/strict";

import {
  getPublicHotelProfileService,
  formatOfficialHotelAddress,
} from "../src/modules/hotel/hotelProfile.service.js";
import {
  isHotelLocationInquiry,
  formatHotelLocationReply,
} from "../src/modules/ai/ai.location-info.js";

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

test("si no existe dirección verificada no inventa un número", async () => {
  const result = await getPublicHotelProfileService({
    async query() { return { rows: [] }; },
  });
  assert.equal(result, null);
  const answer = formatHotelLocationReply(result, "¿Dónde están ubicados?");
  assert.doesNotMatch(answer, /237|233/);
});

test("IA responde ubicación oficial sin repetir la reserva", () => {
  for (const question of [
    "Antes de seguir, ¿dónde están ubicados?",
    "¿Cuál es la dirección del hospedaje?",
    "¿Dónde está el hospedaje?",
    "¿Cómo llego a Casa Huéspedes?",
    "What is your address?",
    "Onde fica o hotel?",
  ]) {
    assert.equal(isHotelLocationInquiry(question), true, question);
    const reply = formatHotelLocationReply(verified, question);
    assert.match(reply, /José Quiñones 237/);
    assert.doesNotMatch(reply, /José Quiñones 233/);
  }
});

test("no intercepta preguntas de otros lugares ni pasos de reserva", () => {
  for (const question of [
    "¿Dónde está el museo?",
    "¿Cómo llego al muelle?",
    "Quiero reservar la Triple",
    "Cambio de dirección de mi reserva",
  ]) assert.equal(isHotelLocationInquiry(question), false, question);
});
