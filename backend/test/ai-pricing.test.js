import test from "node:test";
import assert from "node:assert/strict";
import { isCategoryPriceInquiry, formatCategoryPricesReply, formatInitialGreeting, isOpeningGreetingOnly } from "../src/modules/ai/ai.pricing.js";

const categories = [
  { slug: "matrimonial", name: "Matrimonial Estándar", price_per_night: 120.00 },
  { slug: "matrimonial-ejecutiva", name: "Matrimonial Ejecutiva", price_per_night: 140.00 },
  { slug: "doble", name: "Doble - 2 Camas", price_per_night: 140.00 },
  { slug: "triple", name: "Triple - 3 Camas", price_per_night: 210.00 },
  { slug: "familiar", name: "Familiar 1", price_per_night: 250.00 },
  { slug: "familiar-2", name: "Familiar 2", price_per_night: 250.00 },
];

test("consulta general de tarifas incluye las seis categorías vigentes", () => {
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
  assert.match(answer, /Matrimonial Estándar: S\/ 120\.00/);
  assert.match(answer, /Matrimonial Ejecutiva: S\/ 140\.00/);
  assert.doesNotMatch(answer, /Familiar:/);
});

test("el asesor responde precio único del tipo pedido", () => {
  const answer = formatCategoryPricesReply(categories, "¿Cuánto cuesta la familiar?");
  assert.match(answer, /Familiar 1: S\/ 250\.00/);
  assert.match(answer, /Familiar 2: S\/ 250\.00/);
  assert.doesNotMatch(answer, /Doble:/);
});

test("el precio de Familiar 2 se consulta sin mezclar Familiar 1", () => {
  const answer = formatCategoryPricesReply(categories, "Precio Familiar 2");
  assert.match(answer, /Familiar 2: S\/ 250\.00/);
  assert.doesNotMatch(answer, /Familiar 1:/);
});

test("tarifas son dinámicas: no quedan importes antiguos incrustados", () => {
  const updated = categories.map((category) => category.slug === "triple"
    ? { ...category, price_per_night: 199.50 }
    : category);
  const answer = formatCategoryPricesReply(updated, "Precio triple");
  assert.match(answer, /S\/ 199\.50/);
  assert.doesNotMatch(answer, /S\/ 210\.00/);
});

test("no intercepta solicitud con fechas ni precios de plataformas externas", () => {
  assert.equal(isCategoryPriceInquiry("¿Cuánto cuesta del 15/10/2026 al 17/10/2026?"), false);
  assert.equal(isCategoryPriceInquiry("Precio para mañana"), false);
  assert.equal(isCategoryPriceInquiry("¿Cuánto cuesta llevar una mascota?"), false);
  assert.equal(isCategoryPriceInquiry("Precio por perro"), false);
  assert.equal(isCategoryPriceInquiry("¿Cuál es la tarifa de Booking?"), false);
  assert.equal(isCategoryPriceInquiry("Quiero reservar, ¿cuál es el precio?"), false);
  assert.equal(isCategoryPriceInquiry("Ya pagué el precio acordado"), false);
  assert.equal(isCategoryPriceInquiry("¿Cuánto cuesta por 2 noches?"), false);
});

test("sin un precio válido no inventa un importe", () => {
  const answer = formatCategoryPricesReply([{ slug: "triple", name: "Triple", price_per_night: null }], "Precio triple");
  assert.match(answer, /no puedo confirmar las tarifas/i);
  assert.doesNotMatch(answer, /S\/ 0\.00/);
});

test("el saludo inicial incluye todas las categorías con el precio vigente", () => {
  const answer = formatInitialGreeting(categories);
  assert.match(answer, /¡Hola!/);
  for (const category of categories) {
    assert.ok(answer.includes(category.name));
    assert.ok(answer.includes(`S/ ${category.price_per_night.toFixed(2)} por noche`));
  }
  assert.doesNotMatch(answer, /habitaci[oó]n 101/i);
});

test("el saludo refleja cambios en Supabase y no inventa precios faltantes", () => {
  const answer = formatInitialGreeting([
    { slug: "triple", name: "Triple", price_per_night: 215.50 },
    { slug: "familiar", name: "Familiar 1", price_per_night: null },
  ]);
  assert.match(answer, /Triple: S\/ 215\.50/);
  assert.match(answer, /Familiar 1: tarifa por confirmar/);
  assert.doesNotMatch(answer, /S\/ 0\.00/);
});

test("detecta saludos sencillos sin consumir una respuesta del modelo", () => {
  for (const greeting of ["Hola", "¡Hola!", "Buenas tardes", "Buenos días", "Hola, buenas noches"]) {
    assert.equal(isOpeningGreetingOnly(greeting), true);
  }
  assert.equal(isOpeningGreetingOnly("Hola, quiero reservar una doble"), false);
  assert.equal(isOpeningGreetingOnly("Quiero reservar"), false);
});


test("WhatsApp informa tarifas vigentes pero no confirma disponibilidad", () => {
  const reply = formatCategoryPricesReply(categories, "¿Cuánto cuestan?", { channel: "whatsapp" });
  assert.match(reply, /una persona de nuestro equipo confirmará disponibilidad/);
  assert.doesNotMatch(reply, /podré confirmar disponibilidad/);
});
