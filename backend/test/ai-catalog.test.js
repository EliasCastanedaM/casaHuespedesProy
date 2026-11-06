import assert from "node:assert/strict";
import test from "node:test";
import { publicAiCategory, withoutPhysicalRoomReferences } from "../src/modules/ai/ai.catalog.js";
import { formatRoomDetailsReply } from "../src/modules/ai/ai.category-info.js";

test("la comparación no revela la unidad física incluida en la descripción oficial", () => {
  const categories = [
    { slug: "matrimonial", name: "Matrimonial Estándar", capacity: 2,
      price_per_night: 120, description: "Vista interior." },
    { slug: "matrimonial-ejecutiva", name: "Matrimonial Ejecutiva", capacity: 2,
      price_per_night: 140,
      description: "La unidad 505 tiene vista al mar desde segunda fila; las demás tienen vista interior." },
  ];
  const before = structuredClone(categories);
  const reply = formatRoomDetailsReply(categories,
    "Compara Matrimonial Estándar y Matrimonial Ejecutiva");
  assert.doesNotMatch(reply, /505/);
  assert.match(reply, /vista al mar desde segunda fila/);
  assert.match(reply, /las demás tienen vista interior/);
  assert.match(reply, /Matrimonial Ejecutiva.*S\/ 140\.00/);
  assert.deepEqual(categories, before);
});

test("el catálogo para herramientas excluye campos físicos y conserva los datos comerciales", () => {
  const category = {
    slug: "familiar-2", name: "Familiar 2", room_number: "405", room_id: 42,
    capacity: "5", total_quantity: "1", available_quantity: "1",
    bed_description: "1 cama de 2 plazas + 3 camas de 1½ plazas",
    description: "Habitación #405, cuarto piso y terraza. Tarifa S/ 250.",
    price_per_night: "250.00", internal_notes: "Solo recepción",
  };
  const projected = publicAiCategory(category);
  assert.equal(projected.room_number, undefined);
  assert.equal(projected.room_id, undefined);
  assert.equal(projected.internal_notes, undefined);
  assert.doesNotMatch(projected.description, /405|#/);
  assert.match(projected.description, /cuarto piso y terraza/);
  assert.match(projected.description, /S\/ 250/);
  assert.equal(projected.name, "Familiar 2");
  assert.equal(projected.bed_description, category.bed_description);
  assert.equal(projected.capacity, 5);
  assert.equal(projected.price_per_night, 250);
  assert.equal(projected.available_quantity, 1);
});

test("se ocultan referencias explícitas sin borrar precios, capacidades ni nombres de categoría", () => {
  for (const value of ["Habitación 203", "habitación número 203", "unidad n.º 505",
    "Las habitaciones 101 y 304", "Room #405", "Familiar 2 #405"]) {
    assert.doesNotMatch(withoutPhysicalRoomReferences(value), /\b(?:101|203|304|405|505)\b/, value);
  }
  for (const value of ["Familiar 1", "Familiar 2", "Triple - 3 Camas", "Habitación 2 camas",
    "Hasta 5 huéspedes; 2 camas; S/ 250 por noche; cuarto piso."]) {
    assert.equal(withoutPhysicalRoomReferences(value), value);
  }
  assert.equal(withoutPhysicalRoomReferences(null), null);
});
