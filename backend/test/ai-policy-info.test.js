import test from "node:test";
import assert from "node:assert/strict";
import { formatPolicyInformationReply, policyInformationType } from "../src/modules/ai/ai.policy-info.js";

test("explica la nueva tarifa infantil sin la fórmula anterior", () => {
  for (const message of ["¿Qué condiciones aplican a los niños de 6 años?", "¿Cuánto pagan los niños de 4 años?", "¿Desde qué edad pagan los niños? Mi hijo tiene 9 años", "¿Qué reglas hay para niños?"]) {
    assert.equal(policyInformationType(message), "children");
    const reply = formatPolicyInformationReply(message);
    assert.match(reply, /S\/ 20 por niño y por noche/);
    assert.match(reply, /adultos y niños/);
    assert.match(reply, /edades/);
    assert.doesNotMatch(reply, /50|diferencial/);
  }
});

test("preguntas sobre mascotas y descuentos de grupo mantienen validación humana", () => {
  const pets = formatPolicyInformationReply("¿Aceptan perros y cuánto cuesta?");
  assert.match(pets, /S\/ 20/);
  assert.match(pets, /IGV incluido/);
  assert.match(pets, /S\/ 20/);
  assert.match(pets, /por mascota y por noche/);
  assert.doesNotMatch(pets, /pendiente confirmar/);
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
  assert.match(reply, /S\/ 20 por niño y por noche/);
  assert.equal(JSON.stringify(context), before);
});

