import test from "node:test";
import assert from "node:assert/strict";
import { getHotelGuestPolicyRulesService } from "../src/modules/services/hotelPolicy.service.js";
import { formatPolicyInformationReply } from "../src/modules/ai/ai.policy-info.js";

test("registro comercial se consulta de Supabase sin escribir ni aprobar datos", async () => {
  const db = {
    async query(sql, params) {
      assert.match(sql, /FROM public.hotel_policy_rules/);
      assert.match(sql, /active = TRUE/);
      assert.equal(params[0].includes("mascotas"), true);
      return {
        rows: [
          {code: "mascotas", review_status: "pending_review", config: {amount_pen: 20,vat_included: true,charge_frequency: null}, requires_human_approval: true},
          {code: "ninos_9_mas", review_status: "pending_review", config: {adult_rate_confirmed: false}, requires_human_approval: true},
        ],
      };
    },
  };
  const rules = await getHotelGuestPolicyRulesService(db);
  assert.equal(Object.keys(rules).length, 2);
  const pets = formatPolicyInformationReply("¿Aceptan mascotas y cuál es la tarifa?", { rules });
  assert.match(pets, /S\/ 20/);
  assert.match(pets, /pendiente confirmar/);
  assert.doesNotMatch(pets, /S\/ 20 por mascota y por noche/);
  const nine = formatPolicyInformationReply("¿Qué pasa si mi hijo tiene 9 años?", { rules });
  assert.match(nine, /pendiente de confirmar/);
});

test("no aplica reglas pendientes incluso si contienen una posible frecuencia o tarifa", () => {
  const rules = {
    mascotas: { review_status: "pending_review", config: {amount_pen: 20,vat_included: true,charge_frequency: "pet_per_night"} },
    ninos_9_mas: { review_status: "pending_review", config: {adult_rate_confirmed: true} },
  };
  assert.match(formatPolicyInformationReply("¿Cuánto cuesta llevar perros?", { rules }), /pendiente confirmar/);
  assert.match(formatPolicyInformationReply("¿Mi hija de 9 años paga como adulto?", { rules }), /pendiente de confirmar/);
});

test("una futura aprobación explícita actualiza respuestas sin volver a desplegar el bot", () => {
  const rules = {
    mascotas: { review_status: "verified", config: {amount_pen: 25, vat_included: true, charge_frequency: "pet_per_night"} },
    ninos_9_mas: { review_status: "verified", config: {adult_rate_confirmed: true} },
    ninos_5_8: { review_status: "verified", config: {percent_of_min_max_differential: 50} },
  };
  const pets = formatPolicyInformationReply("¿Cuánto cobras por mascotas?", { rules });
  assert.match(pets, /S\/ 25/);
  assert.match(pets, /por mascota y por noche/);
  assert.match(formatPolicyInformationReply("¿Mi hijo de 9 años paga adulto?", { rules }), /corresponde tarifa de adulto/);
  assert.match(formatPolicyInformationReply("¿Qué condiciones aplican a los niños de 6 años?", { rules }), /50 % del diferencial/);
});

test("no inventa tarifas de una regla ausente o retirada", () => {
  const out = formatPolicyInformationReply("¿Mi hijo de 6 años paga?", { rules: {} });
  assert.match(out, /debe ser revisada por el equipo/);
  assert.doesNotMatch(out, /50 %/);
  const pets = formatPolicyInformationReply("¿Aceptan mascotas?", { rules: {} });
  assert.match(pets, /Nuestro equipo confirmará/);
  assert.doesNotMatch(pets, /S\/ 20/);
});
