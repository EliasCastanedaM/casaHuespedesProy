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

function requestedAge(text) {
  const n = normalize(text);
  const match = n.match(/\b(?:edad\s*(?:de|:)?\s*)?(\d{1,2})\s*an[oa]s?\b/);
  return match ? Number(match[1]) : null;
}

// Mantiene un respaldo conservador si hay una incidencia de conexión.
// Cuando se suministran reglas de Supabase, SOLO sus estados activos se usan.
const FALLBACK = {
  ninos_0_4: { review_status: "verified", config: { no_charge_when_using_existing_beds: true } },
  ninos_5_8: { review_status: "verified", config: { percent_of_min_max_differential: 50 } },
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
    const age = requestedAge(message);
    const young = get("ninos_0_4");
    const middle = get("ninos_5_8");
    const adult = get("ninos_9_mas");
    const lines = [];

    if (age === null || age <= 4) {
      lines.push(young?.review_status === "verified" &&
        young.config?.no_charge_when_using_existing_beds === true
        ? "De 0 a 4 años: no pagan cargo adicional si utilizan las camas disponibles y se respeta la capacidad de la habitación."
        : "De 0 a 4 años: las condiciones necesitan revisión de nuestro equipo.");
    }
    if (age === null || (age >= 5 && age <= 8)) {
      const percent = Number(middle?.config?.percent_of_min_max_differential);
      lines.push(middle?.review_status === "verified" &&
        Number.isFinite(percent) && percent > 0 && percent <= 100
        ? "De 5 a 8 años: se contempla el " + percent +
          " % del diferencial entre la tarifa mínima y máxima. El importe y su aplicación deben ser validados por nuestro equipo; no puedo confirmar un monto automático."
        : "De 5 a 8 años: la tarifa final debe ser revisada por el equipo.");
    }
    if (age === null || age >= 9) {
      lines.push(adult?.review_status === "verified" &&
        adult.config?.adult_rate_confirmed === true
        ? "Desde los 9 años: corresponde tarifa de adulto."
        : "Desde los 9 años: la condición tarifaria está pendiente de confirmar con nuestro equipo. No puedo asegurar automáticamente una tarifa de adulto ni un monto final.");
    }
    return ["¡Claro! 😊 Estas son las condiciones para niños:", ...lines,
      "Si deseas cotizar una estadía con niños, nuestro equipo confirmará el importe final."].join("\n");
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
