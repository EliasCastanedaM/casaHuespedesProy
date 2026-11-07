// Consultas informativas sobre políticas del hospedaje: no modifican reservas.
// Una petición real de reserva con menores o mascotas sigue requiriendo revisión humana.
function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function policyInformationType(message) {
  const text = normalize(message);
  if (!text) return null;
  // Evita convertir una solicitud real en una simple respuesta informativa.
  if (/^(?:quiero|quisiera|deseo|necesito|vamos a|voy a)\b.{0,45}\b(?:reservar|reserva|llevar|hospedar)/.test(text)) {
    return null;
  }
  if (/^(?:somos|vamos con|viajo con|viajamos con|llevare|llevo|tenemos)\b/.test(text)) {
    return null;
  }
  const asks = /[?¿]/.test(message) ||
    /\b(?:condiciones?|reglas?|politicas?|informacion|explicame|cuentame|descuentos?|tarifas?|precio|costo|cuanto|cuantos|desde|pagan|paga|cobran|cobro|aceptan|permiten|admiten)\b/.test(text);
  if (!asks) return null;

  const children = /\b(?:nin[oa]s?|bebes?|menores?|hij[oa]s?|infantes?|children|kids?)\b/.test(text);
  const pets = /\b(?:mascotas?|perros?|perrit[oa]s?|gatos?|gatit[oa]s?|pets?)\b/.test(text);
  const largeGroups = /\b(?:grupos?|8\s*(?:o mas\s*)?(?:personas?|huespedes?)|ocho\s+(?:personas?|huespedes?))\b/.test(text);
  if (children) return "children";
  if (pets) return "pets";
  if (largeGroups) return "groups";
  return null;
}

// Mantiene un respaldo conservador si hay una incidencia de conexión.
// Cuando se suministran reglas de Supabase, SOLO sus estados activos se usan.
const FALLBACK = {
  ninos_0_4: { review_status: "verified", config: { no_charge_when_using_existing_beds: true } },
  ninos_5_8: { review_status: "verified", config: { percent_of_adult_single_differential: 50 } },
  ninos_9_mas: { review_status: "verified", config: { adult_rate_confirmed: true, quote_requires_manual_review: false } },
  mascotas: { review_status: "verified", config: { amount_pen: 20, vat_included: true, charge_frequency: "pet_per_night", approval_required: true, automatic_final_quote: false } },
  grupos_8: { review_status: "verified", config: { min_total_guests: 8 } },
};

export function formatPolicyInformationReply(message, { rules } = {}) {
  const type = policyInformationType(message);
  if (!type) return null;
  const catalog = rules === undefined ? FALLBACK : rules;
  const get = (code) => catalog?.[code] || null;
  const human = "Nuestro equipo confirmará los detalles antes de cotizar o autorizar una excepción.";

  if (type === "children") {
    return "Los niños tienen un tratamiento distinto en la cotización. Para calcular el importe de tu estadía, dime cuántos adultos y niños viajarán y qué edades tienen los niños. 😊";
  }

  if (type === "pets") {
    const rule = get("mascotas");
    if (!rule) return "Las mascotas están sujetas a autorización del hospedaje. " + human;
    const amount = Number(rule.config?.amount_pen);
    const amountLabel = Number.isFinite(amount) && amount > 0
      ? "La regla comercial indica un cargo adicional de S/ " + amount.toFixed(0) +
        (rule.config?.vat_included === true ? ", IGV incluido" : "")
      : "El cargo adicional debe confirmarlo el equipo";
    const frequency = rule.review_status === "verified"
      ? rule.config?.charge_frequency : null;
    const frequencyText = frequency === "pet_per_night"
      ? ", por mascota y por noche."
      : frequency === "per_stay"
        ? ", por estadía."
        : ", pero todavía está pendiente confirmar si se aplica por mascota y noche o por estadía.";
    return "Aceptamos mascotas únicamente con autorización previa del hospedaje. " +
      amountLabel + frequencyText + " Nuestro equipo verificará el cobro antes de confirmarlo.";
  }

  if (type === "groups") {
    const rule = get("grupos_8");
    const threshold = Number(rule?.config?.min_total_guests);
    const min = Number.isInteger(threshold) && threshold >= 8 ? threshold : 8;
    return "Para grupos de " + min +
      " o más huéspedes podemos evaluar una tarifa especial. El precio y las condiciones deben ser confirmados por una persona de nuestro equipo; no hay un descuento automático.";
  }
  return null;
}
