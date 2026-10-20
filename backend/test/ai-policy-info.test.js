import test from "node:test";
import assert from "node:assert/strict";
import { formatPolicyInformationReply, policyInformationType } from "../src/modules/ai/ai.policy-info.js";

test("responde condiciones de un niño de 6 años sin preguntar fechas ni calcular montos", () => {
  const message = "¿Qué condiciones aplican a los niños de 6 años?";
  assert.equal(policyInformationType(message), "children");
  const reply = formatPolicyInformationReply(message);
  assert.match(reply, /5 a 8 años/);
  assert.match(reply, /50 % del diferencial/);
  assert.match(reply, /importe y su aplicación deben ser validados/);
  assert.doesNotMatch(reply, /fechas de ingreso|fechas de salida|¿Cuándo viajas\?|S\/\s*\d+/i);
});

test("responde tramos infantiles correctamente sin inventar precio", () => {
  const four = formatPolicyInformationReply("¿Cuánto pagan los niños de 4 años?");
  assert.match(four, /0 a 4 años/);
  assert.match(four, /camas disponibles/);
  const six = formatPolicyInformationReply("¿Qué descuento tiene mi hijo de 6 años?");
  assert.match(six, /5 a 8 años/);
  const nine = formatPolicyInformationReply("¿Desde qué edad pagan los niños? Mi hijo tiene 9 años");
  assert.match(nine, /Desde los 9 años/);
  assert.match(nine, /pendiente de confirmar/);
  assert.doesNotMatch(nine, /corresponde tarifa de adulto/);
  assert.doesNotMatch(nine, /descuento equivalente/i);
  const overview = formatPolicyInformationReply("¿Qué reglas hay para niños?");
  assert.match(overview, /0 a 4 años/);
  assert.match(overview, /5 a 8 años/);
  assert.match(overview, /Desde los 9 años/);
});

test("preguntas sobre mascotas y descuentos de grupo mantienen validación humana", () => {
  const pets = formatPolicyInformationReply("¿Aceptan perros y cuánto cuesta?");
  assert.match(pets, /S\/ 20/);
  assert.match(pets, /IGV incluido/);
  assert.match(pets, /pendiente confirmar/);
  assert.doesNotMatch(pets, /S\/ 20 por mascota y por noche/);
  assert.match(pets, /autorización previa/);
  const groups = formatPolicyInformationReply("¿Hay descuento para 8 huéspedes?");
  assert.match(groups, /8 o más huéspedes/);
  assert.match(groups, /persona de nuestro equipo/);
  assert.doesNotMatch(groups, /20 %|30 %/);
});

test("una excepción en una reserva no se transforma en una pregunta informativa", () => {
  for (const text of [
    "Quiero reservar con mi hijo de 6 años",
    "Somos 2 adultos y un niño",
    "Voy con 2 perros",
    "Llevo un perro",
    "Quisiera reservar con una mascota",
    "Ingreso 20/11/2026 y salida 22/11/2026",
    "Sí, quiero la Triple.",
  ]) {
    assert.equal(formatPolicyInformationReply(text), null, text);
  }
});

test("la consulta de políticas es informativa y no requiere mutar el contexto", () => {
  const context = Object.freeze({
    active: true, state: "draft", guests_count: 3,
    category: Object.freeze({ category_slug: "triple" }),
    check_in: null, check_out: null,
  });
  const before = JSON.stringify(context);
  const reply = formatPolicyInformationReply("¿Qué condiciones aplican a los niños de 6 años?");
  assert.match(reply, /5 a 8 años/);
  assert.equal(JSON.stringify(context), before);
});
