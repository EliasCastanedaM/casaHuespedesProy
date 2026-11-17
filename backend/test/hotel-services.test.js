import test from "node:test";
import assert from "node:assert/strict";
import {
  isHotelServicesInquiry,
  formatHotelServicesReply,
} from "../src/modules/ai/ai.services-info.js";
import { getPublicHotelServicesService } from "../src/modules/services/service.service.js";

const sample = [
  { slug:"desayuno-continental",name:"Desayuno continental",description:"Desayuno continental incluido en la tarifa de alojamiento.",price_type:"included",price:0,requires_coordination:false },
  { slug: "wifi", name: "WiFi gratuito", description: "Acceso a WiFi gratuito.", price_type: "included", price: 0, requires_coordination: false },
  { slug: "cocina-compartida", name: "Cocina compartida", description: "Cocina compartida para huéspedes.", price_type: "not_specified", price: null, requires_coordination: false },
  { slug: "lavanderia", name: "Lavandería y planchado", description: "Sujeto a coordinación.", price_type: "on_request", price: null, requires_coordination: true },
];

test("servicios generales remiten brevemente a la página sin enumerar ni contar", () => {
  const text = "Antes de seguir, ¿qué servicios incluye el hospedaje?";
  assert.equal(isHotelServicesInquiry(text), true);
  const answer = formatHotelServicesReply(sample, text);
  assert.match(answer, /https:\/\/www.casahuespedespimentel.com\/servicios/);
  assert.match(answer, /Para conocer todos los servicios/);
  assert.match(answer,/WiFi.*continental/);
  assert.doesNotMatch(answer, /lavandería|\b\d+ servicios\b/i);
  assert.ok(answer.length < 400);
});

test("consulta por lavandería informa coordinación y tarifa sin etiquetas robóticas", () => {
  const answer = formatHotelServicesReply(sample, "¿Cuánto cuesta la lavandería?");
  assert.match(answer, /Lavandería y planchado/i);
  assert.match(answer, /coordinación/i);
  assert.match(answer, /confirmará la tarifa/i);
  assert.doesNotMatch(answer, /tarifa a confirmar/i);
  assert.equal(answer.includes("(condiciones de uso"), false);
  assert.doesNotMatch(answer, /WiFi gratuito/);
});

test("no promete estacionamiento propio", () => {
  const parking = [{
    slug:"estacionamiento",
    name: "Orientación para estacionamiento",
    description: "No hay estacionamiento propio. Se orienta sobre estacionamiento cercano de terceros.",
    price_type: "on_request",
    requires_coordination: true,
  }];
  const answer = formatHotelServicesReply(parking, "¿Tienen estacionamiento?");
  assert.match(answer, /estacionamiento cercano/i);
  assert.match(answer, /No hay estacionamiento propio/i);
  assert.doesNotMatch(answer, /estacionamiento propio garantizado/i);
});

test("desayuno continental incluido según el catálogo aprobado", () => {
  assert.equal(isHotelServicesInquiry("¿El desayuno está incluido?"), true);
  const answer = formatHotelServicesReply(sample, "¿El desayuno está incluido?");
  assert.match(answer, /Desayuno continental incluido/i);
  assert.doesNotMatch(answer, /No ofrecemos desayuno/);
});

test("no interrumpe procesos de reserva ni inventa políticas", () => {
  for (const text of ["Ahora quiero reservar", "Confirma mi reserva", "¿Tienen disponibilidad el sábado?"]) {
    assert.equal(isHotelServicesInquiry(text), false, text);
  }
  assert.match(formatHotelServicesReply([], "¿Qué servicios incluyen?"), /casahuespedespimentel.com\/servicios/);
});

test("solo expone servicios activos de fuentes publicadas/aprobadas", async () => {
  const db = {
    async query(sql) {
      assert.match(sql, /verification_status IN \('publicly_listed', 'approved'\)/);
      assert.match(sql, /is_active = TRUE/);
      return { rows: sample };
    },
  };
  const result = await getPublicHotelServicesService(db);
  assert.equal(result.length, 4);
  assert.equal(result[0].price, 0);
  assert.equal(result[2].price, null);
  assert.equal(result[3].requires_coordination, true);
});

