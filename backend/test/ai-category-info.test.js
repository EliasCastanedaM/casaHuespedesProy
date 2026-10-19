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


test("compara Familiar 1 y Familiar 2 sin omitir ninguna y conserva sus diferencias", () => {
  const families = categories.map(category => category.slug === "familiar"
    ? { ...category, bed_description: "2 camas de 2 plazas + 3 camas de 1½ plazas",
        description: "Segundo piso y vista interior." }
    : category.slug === "familiar-2"
      ? { ...category, bed_description: "1 cama de 2 plazas + 3 camas de 1½ plazas",
          description: "Cuarto piso, acceso directo a terraza y vista al mar." }
      : category);
  const question = "Explícame las diferencias entre Familiar 1 y Familiar 2.";
  assert.equal(isRoomDetailsInquiry(question), true);
  const answer = formatRoomDetailsReply(families, question);
  assert.match(answer, /Familiar 1/);
  assert.match(answer, /Familiar 2/);
  assert.match(answer, /Segundo piso y vista interior/);
  assert.match(answer, /acceso directo a terraza y vista al mar/);
  assert.equal((answer.match(/S\/ 250\.00 por noche/g) || []).length, 2);
  assert.doesNotMatch(answer, /Matrimonial Ejecutiva|Triple - 3 Camas/);
});

test("la comparación acepta otras formulaciones y dos nombres concretos", () => {
  for (const question of [
    "¿Cuál es la diferencia entre Familiar 1 y Familiar 2?",
    "Compara Familiar 1 vs Familiar 2",
    "Diferencias entre Familiar 1 y Familiar 2",
    "Explícame las dos categorías, Familiar 1 y Familiar 2",
  ]) {
    assert.equal(isRoomDetailsInquiry(question), true, question);
    const answer = formatRoomDetailsReply(categories, question);
    assert.match(answer, /Familiar 1/);
    assert.match(answer, /Familiar 2/);
    assert.doesNotMatch(answer, /Triple - 3 Camas/);
  }
  const matrimonial = formatRoomDetailsReply(categories, "Compara Matrimonial Estándar y Matrimonial Ejecutiva");
  assert.match(matrimonial, /Matrimonial Estándar/);
  assert.match(matrimonial, /Matrimonial Ejecutiva/);
  assert.doesNotMatch(matrimonial, /Familiar 2/);
});

test("preguntar por Familiar 2 individualmente sigue mostrando solo esa categoría", () => {
  const answer = formatRoomDetailsReply(categories, "Cuéntame solo sobre Familiar 2");
  assert.match(answer, /Familiar 2/);
  assert.doesNotMatch(answer, /Familiar 1/);
});
