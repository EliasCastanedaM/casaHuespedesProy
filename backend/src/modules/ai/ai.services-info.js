function normalized(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

const BOOKING_WORDS = /\b(?:reservar|reserva|cancelar|cambiar|modificar|confirmar|disponibilidad|bloquear)\b/;

export function isHotelServicesInquiry(message) {
  const text = normalized(message);
  if (!text || BOOKING_WORDS.test(text)) return false;
  const topic = /\b(?:servicios?|wifi|internet|desayuno|cocina|terraza|lavanderia|planchado|limpieza|estacionamiento|taxi|movilidad|salon|turismo)\b/.test(text);
  if (!topic) return false;
  return /[?¿]/.test(message) ||
    /\b(?:que|cuales|cual|incluye|incluyen|tienen|ofrecen|cuanto|cuesta|hay|hablame|cuentame|explicame)\b/.test(text);
}

export function formatHotelServicesReply(services, message) {
  const text = normalized(message);
  if (/\bdesayuno\b/.test(text)) {
    return "Las tarifas Full de nuestras habitaciones incluyen IGV, pero NO incluyen desayuno. Si necesitas opciones de desayuno, nuestro equipo puede confirmar si hay alguna disponible y su costo.";
  }
  const all = (Array.isArray(services) ? services : [])
    .filter((s) => s && s.name);
  const matchers = [
    [/\b(?:wifi|internet)\b/, /wifi/i],
    [/\bcocina\b/, /cocina/i],
    [/\bterraza\b/, /terraza/i],
    [/\blavanderia\b|\bplanchado\b/, /lavander/i],
    [/\blimpieza\b/, /limpieza/i],
    [/\bestacionamiento\b/, /estacionamiento/i],
    [/\b(?:taxi|movilidad)\b/, /taxi|movilidad/i],
    [/\b(?:turismo|orientacion turistica)\b/, /turism|orientaci[oó]n/i],
    [/\bsalon\b/, /sal[oó]n/i],
  ];
  const matched = matchers.find(([re]) => re.test(text));
  const chosen = matched ? all.filter((s) => matched[1].test(s.name)) : all;
  if (!chosen.length) {
    return "No tengo un servicio confirmado para esa consulta. Nuestro equipo puede revisar las condiciones contigo.";
  }
  const rows = chosen.map((s) => {
    const note = s.price_type === "included"
      ? "gratuito"
      : (s.requires_coordination || s.price_type === "on_request")
        ? "requiere coordinación; tarifa a confirmar"
        : "condiciones de uso a consultar";
    return "- " + s.name + ": " + s.description + " (" + note + ")";
  });
  return [
    "¡Claro! 😊 Según la información pública de Casa Huéspedes, ofrecemos:",
    ...rows,
    "",
    "El desayuno no está incluido en la tarifa de habitación. Para servicios adicionales, el equipo confirma disponibilidad y costos antes de contratar.",
  ].join("\n");
}
