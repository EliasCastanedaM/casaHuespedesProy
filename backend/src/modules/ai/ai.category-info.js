const clean = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function isRoomDetailsInquiry(message) {
  const s = clean(message);
  if (/\b(?:reservar|reserva|cancelar|pagar|disponibilidad|disponibles?|recomendar|recomiendas|recomienda)\b/.test(s)) return false;
  const topic = /\b(?:habitaciones?|categorias?|camas?|matrimonial|doble|triple|familiar)\b/.test(s);
  const asks = /\b(?:cuentame|explicame|explica|describe|detalles?|informacion|cuales|que|tipos|opciones|dime|tienen|compara|comparame|comparar|diferencias?)\b/.test(s);
  const followup = /\b(?:explicame|cuentame|describe)\b.*\b(?:cada una|una por una|todas|esas|las opciones)\b/.test(s);
  return (topic && asks) || followup;
}
export function isHotelInformationInterruption(message) {
  const s = clean(message);
  if (/\b(?:reservar|reserva|pagar|cancelar|disponibilidad)\b/.test(s)) return false;
  if (isRoomDetailsInquiry(message)) return true;
  return /\b(?:que|como|donde|cuales|cuentame|explicame|informacion|horario|incluye|tienen|aceptan|permiten|admiten)\b/.test(s) &&
    /\b(?:servicios?|ubicacion|ubicad[oa]s?|direccion|desayuno|wifi|mascotas?|perros?|gatos?|politicas?|fotos?|terraza|estacionamiento)\b/.test(s);
}
export function formatRoomDetailsReply(categories, message) {
  const list = (Array.isArray(categories) ? categories : [])
    .filter((category) => category && category.is_active !== false && category.name);
  const text = clean(message);

  // Capturar TODAS las categorías nombradas antes de filtrar. En preguntas
  // como "diferencias entre Familiar 1 y Familiar 2", first-match omitía Familiar 1.
  const requested = new Set();
  const add = (slug) => requested.add(slug);
  const standard = /\bmatrimonial\s+(?:estandar|standard)\b/.test(text);
  const executive = /\bmatrimonial\s+ejecutiva\b/.test(text);
  if (standard) add("matrimonial");
  if (executive) add("matrimonial-ejecutiva");
  if (!standard && !executive && /\bmatrimonial(?:es)?\b/.test(text)) {
    add("matrimonial");
    add("matrimonial-ejecutiva");
  }
  if (/\bdoble\b/.test(text)) add("doble");
  if (/\btriple\b/.test(text)) add("triple");

  const familiarOne = /\bfamiliar\s*(?:1|uno)\b/.test(text);
  const familiarTwo = /\bfamiliar\s*(?:2|dos)\b/.test(text);
  if (familiarOne) add("familiar");
  if (familiarTwo) add("familiar-2");
  if (!familiarOne && !familiarTwo && /\bfamiliar(?:es)?\b/.test(text)) {
    add("familiar");
    add("familiar-2");
  }

  const selected = requested.size
    ? list.filter((category) => requested.has(category.slug))
    : list;
  if (!selected.length) {
    return "No puedo confirmar esos detalles ahora mismo. Una persona del equipo puede ayudarte.";
  }

  const comparing = selected.length > 1 &&
    /\b(?:diferencias?|compara|comparame|comparar|comparacion|versus|vs)\b/.test(text);
  const rows = selected.map((category) => {
    const parts = [category.name];
    if (Number(category.capacity) > 0) parts.push("hasta " + Number(category.capacity) + " huéspedes");
    if (category.bed_description) parts.push(category.bed_description);
    if (Number(category.price_per_night) > 0) {
      parts.push("S/ " + Number(category.price_per_night).toFixed(2) + " por noche");
    }
    const base = "- " + parts.join(" · ");
    // Las descripciones oficiales incluyen piso, vista y acceso a terraza:
    // datos útiles para comparar más allá de camas/capacidad/tarifa.
    return comparing && category.description?.trim()
      ? base + "\n  " + category.description.trim()
      : base;
  });

  const intro = comparing
    ? "¡Claro! 😊 Estas son las diferencias entre las categorías que mencionas:"
    : "¡Claro! 😊 Estas son nuestras categorías:";
  return [
    intro,
    ...rows,
    "",
    "La disponibilidad se confirma para las fechas solicitadas. ¿Quieres consultar alguna en particular?",
  ].join("\n");
}
