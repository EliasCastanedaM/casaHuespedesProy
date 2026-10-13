import test from "node:test";
import assert from "node:assert/strict";
import { isCategoryPriceInquiry, formatCategoryPricesReply } from "../src/modules/ai/ai.pricing.js";

const categories = [
  { slug: "matrimonial", name: "Matrimonial Estándar", price_per_night: 154.70 },
  { slug: "matrimonial-ejecutiva", name: "Matrimonial Ejecutiva", price_per_night: 163.20 },
  { slug: "doble", name: "Doble", price_per_night: 176.80 },
  { slug: "triple", name: "Triple", price_per_night: 197.20 },
  { slug: "familiar", name: "Familiar", price_per_night: 221.00 },
];

test("consulta general de tarifas incluye las cinco categorías vigentes", () => {
  assert.equal(isCategoryPriceInquiry("¿Cuáles son los precios?"), true);
  const answer = formatCategoryPricesReply(categories, "¿Cuáles son los precios?");
  for (const category of categories) {
    assert.ok(answer.includes(category.name));
    assert.ok(answer.includes(`S/ ${category.price_per_night.toFixed(2)}`));
  }
  assert.doesNotMatch(answer, /habitaci[oó]n 101|habitaci[oó]n 205/i);
});

test("pregunta por matrimonial ofrece ambas opciones sin inventar precio", () => {
  const answer = formatCategoryPricesReply(categories, "Precio de matrimonial");
  assert.match(answer, /Matrimonial Estándar: S\/ 154\.70/);
  assert.match(answer, /Matrimonial Ejecutiva: S\/ 163\.20/);
  assert.doesNotMatch(answer, /Familiar:/);
});

test("el asesor responde precio único del tipo pedido", () => {
  const answer = formatCategoryPricesReply(categories, "¿Cuánto cuesta la familiar?");
  assert.match(answer, /Familiar: S\/ 221\.00/);
  assert.doesNotMatch(answer, /Doble:/);
});

test("tarifas son dinámicas: no quedan importes antiguos incrustados", () => {
  const updated = categories.map((category) => category.slug === "triple"
    ? { ...category, price_per_night: 199.50 }
    : category);
  const answer = formatCategoryPricesReply(updated, "Precio triple");
  assert.match(answer, /S\/ 199\.50/);
  assert.doesNotMatch(answer, /S\/ 197\.20/);
});

test("no intercepta solicitud con fechas ni precios de plataformas externas", () => {
  assert.equal(isCategoryPriceInquiry("¿Cuánto cuesta del 15/10/2026 al 17/10/2026?"), false);
  assert.equal(isCategoryPriceInquiry("Precio para mañana"), false);
  assert.equal(isCategoryPriceInquiry("¿Cuál es la tarifa de Booking?"), false);
});

test("sin un precio válido no inventa un importe", () => {
  const answer = formatCategoryPricesReply([{ slug: "triple", name: "Triple", price_per_night: null }], "Precio triple");
  assert.match(answer, /no puedo confirmar las tarifas/i);
  assert.doesNotMatch(answer, /S\/ 0\.00/);
});
