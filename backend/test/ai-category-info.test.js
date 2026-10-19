import test from "node:test";
import assert from "node:assert/strict";
import {
  isRoomDetailsInquiry,
  isHotelInformationInterruption,
  formatRoomDetailsReply,
} from "../src/modules/ai/ai.category-info.js";

const categories = [
  { slug: "matrimonial", name: "Matrimonial Estándar", capacity: 2, bed_description: "1 cama de 2 plazas", price_per_night: 120, is_active: true },
  { slug: "matrimonial-ejecutiva", name: "Matrimonial Ejecutiva", capacity: 2, bed_description: "1 cama de 2 plazas", price_per_night: 140, is_active: true },
  { slug: "doble", name: "Doble - 2 Camas", capacity: 2, bed_description: "2 camas de plaza y media", price_per_night: 140, is_active: true },
  { slug: "triple", name: "Triple - 3 Camas", capacity: 3, bed_description: "3 camas de plaza y media", price_per_night: 210, is_active: true },
  { slug: "familiar", name: "Familiar 1", capacity: 5, bed_description: "Distribución familiar", price_per_night: 250, is_active: true },
  { slug: "familiar-2", name: "Familiar 2", capacity: 5, bed_description: "Distribución familiar", price_per_night: 250, is_active: true },
];

test("responde detalles de las seis habitaciones incluso con reserva activa", () => {
  for (const message of [
    "Cuéntame más sobre esas categorías y esas habitaciones",
    "Explícame cada una y cuál es",
    "Qué habitaciones tienen",
  ]) {
    assert.equal(isRoomDetailsInquiry(message), true, message);
    const reply = formatRoomDetailsReply(categories, message);
    for (const category of categories) assert.ok(reply.includes(category.name), category.name);
    assert.match(reply, /S\/ 210\.00 por noche/);
    assert.doesNotMatch(reply, /confirmada la disponibilidad|reservé|se creó/i);
  }
});

test("filtra una categoría individual y preserva nombre y precio oficiales", () => {
  const reply = formatRoomDetailsReply(categories, "Cuéntame sobre Familiar 2");
  assert.match(reply, /Familiar 2/);
  assert.doesNotMatch(reply, /Familiar 1/);
  assert.match(reply, /S\/ 250\.00/);
});

test("no confunde recomendaciones, selección y disponibilidad con detalles", () => {
  for (const text of [
    "Somos tres adultos qué habitaciones nos recomienda",
    "Ahora quiero hacer una reserva",
    "Matrimonial estándar",
    "¿Tienen disponibilidad del 20/11/2026 al 22/11/2026?",
  ]) assert.equal(isRoomDetailsInquiry(text), false, text);
});

test("las preguntas de hotel interrumpen una reserva sin reiniciarla", () => {
  assert.equal(isHotelInformationInterruption("¿Dónde están ubicados?"), true);
  assert.equal(isHotelInformationInterruption("¿Qué servicios incluyen?"), true);
  assert.equal(isHotelInformationInterruption("¿Aceptan perros?"), true);
  assert.equal(isHotelInformationInterruption("Ahora quiero reservar"), false);
});
