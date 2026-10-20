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

export function formatPolicyInformationReply(message) {
  const type = policyInformationType(message);
  if (!type) return null;

  if (type === "children") {
    const age = requestedAge(message);
    const rules = {
      young: "De 0 a 4 años: no pagan cargo adicional si utilizan las camas disponibles, respetando la capacidad de la habitación.",
      middle: "De 5 a 8 años: se contempla el 50 % del diferencial entre la tarifa mínima y máxima. El importe y su aplicación deben ser validados por nuestro equipo; no puedo confirmar un monto automático.",
      adult: "Desde los 9 años: la condición tarifaria está pendiente de confirmar con nuestro equipo. No puedo asegurar automáticamente una tarifa de adulto ni un monto final.",
    };
    const selected = age === null ? [rules.young, rules.middle, rules.adult]
      : age <= 4 ? [rules.young] : age <= 8 ? [rules.middle] : [rules.adult];
    return ["¡Claro! 😊 Estas son las condiciones para niños:", ...selected,
      "Si deseas cotizar una estadía con niños, nuestro equipo confirmará el importe final."].join("\n");
  }
  if (type === "pets") {
    return "Aceptamos mascotas únicamente con autorización previa del hospedaje. La regla comercial indica un cargo adicional de S/ 20, IGV incluido, pero todavía está pendiente confirmar si se aplica por mascota y noche o por estadía. Nuestro equipo verificará el cobro antes de confirmarlo.";
  }
  if (type === "groups") {
    return "Para grupos de 8 o más huéspedes podemos evaluar una tarifa especial. El precio y las condiciones deben ser confirmados por una persona de nuestro equipo; no hay un descuento automático.";
  }
  return null;
}
