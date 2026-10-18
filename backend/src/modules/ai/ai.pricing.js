function normalizeMessage(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isCategoryPriceInquiry(message) {
  const normalized = normalizeMessage(message);
  const asksPrice =
    /\b(precios?|tarifas?|costos?)\b/.test(normalized) ||
    /\bcuanto(?:s)?\s+(?:cuesta|cuestan|vale|valen|sale|salen|cobran|esta|estan)\b/.test(normalized);
  const specificStay =
    /\b\d{4}-\d{2}-\d{2}\b/.test(normalized) ||
    /\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/.test(normalized) ||
    /\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(normalized) ||
    /\b(?:hoy|manana|pasado manana|esta noche|este fin de semana)\b/.test(normalized) ||
    /\b(?:del|desde)\s+\d{1,2}\b/.test(normalized) ||
    /\b\d+\s+noches?\b/.test(normalized);

  // Para fechas concretas, el flujo habitual debe consultar disponibilidad.
  // Los precios de otras plataformas no se equiparan a la tarifa de la web.
  const bookingOrHandoff =
    /\b(?:reservar|reserva|pago|pague|pagar|transferencia|humano|asesor|persona|agente|queja)\b/.test(normalized);
  // Precios de mascotas y otros cargos no son tarifas de habitaciones.
  const petInquiry = /\b(?:mascotas?|perros?|gatos?|animales?)\b/.test(normalized);
  return asksPrice && !specificStay && !bookingOrHandoff && !petInquiry &&
    !/\b(?:booking|airbnb)\b/.test(normalized);
}

function requestedSlugs(message) {
  const normalized = normalizeMessage(message);
  const slugs = new Set();

  if (/\bmatrimonial\b/.test(normalized)) {
    if (/\bejecutiva\b/.test(normalized)) {
      slugs.add("matrimonial-ejecutiva");
    } else if (/\bestandar\b/.test(normalized)) {
      slugs.add("matrimonial");
    } else {
      slugs.add("matrimonial");
      slugs.add("matrimonial-ejecutiva");
    }
  }
  for (const slug of ["doble", "triple"]) {
    if (new RegExp(`\\b${slug}\\b`).test(normalized)) slugs.add(slug);
  }
  if (/\bfamiliar\b/.test(normalized)) {
    if (/\bfamiliar\s*(?:1|uno)\b/.test(normalized)) {
      slugs.add("familiar");
    } else if (/\bfamiliar\s*(?:2|dos)\b/.test(normalized)) {
      slugs.add("familiar-2");
    } else {
      slugs.add("familiar");
      slugs.add("familiar-2");
    }
  }
  return slugs;
}

export function formatCategoryPricesReply(categories, message, { channel = "instagram" } = {}) {
  const validCategories = Array.isArray(categories)
    ? categories.filter((category) => category?.is_active !== false)
    : [];
  const asked = requestedSlugs(message);
  const selected = asked.size
    ? validCategories.filter((category) => asked.has(category.slug))
    : validCategories;
  const rows = selected
    .map((category) => {
      const amount = Number(category.price_per_night);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      return `- ${category.name}: S/ ${amount.toFixed(2)} por noche`;
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return "Por el momento no puedo confirmar las tarifas vigentes. Puedo ayudarte a consultar con nuestro equipo.";
  }

  return [
    "Estas son nuestras tarifas vigentes por categoría:",
    ...rows,
    "",
    channel === "whatsapp"
      ? "Si deseas solicitar una reserva, indícame fechas y número de huéspedes; una persona de nuestro equipo confirmará disponibilidad y precio final."
      : "Para confirmar disponibilidad y el total de tu estadía, indícame fecha de entrada, fecha de salida y número de huéspedes.",
  ].join("\n");
}

/**
 * El saludo inicial se genera de forma determinista con el catálogo vigente.
 * Nunca se incrustan importes fijos en este mensaje.
 */
export function formatInitialGreeting(categories) {
  const active = Array.isArray(categories)
    ? categories.filter((category) => category?.is_active !== false)
    : [];
  const rows = active.map((category) => {
    const amount = Number(category.price_per_night);
    const price = category.price_per_night != null && Number.isFinite(amount) && amount > 0
      ? `S/ ${amount.toFixed(2)} por noche`
      : "tarifa por confirmar";
    return `- ${category.name}: ${price}`;
  });

  return [
    "¡Hola! 👋 Bienvenido(a) a Casa Huéspedes Pimentel.",
    rows.length
      ? "Estas son nuestras categorías y tarifas vigentes:"
      : "Por el momento no puedo confirmar nuestras categorías y precios.",
    ...rows,
    "",
    "¿Para qué fechas deseas hospedarte y cuántas personas serían? Así podré confirmar la disponibilidad y el total.",
  ].join("\n");
}

export function isOpeningGreetingOnly(message) {
  const normalized = normalizeMessage(message)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:hola|holi|hello|hi|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hola buenas|hola buenos dias|hola buenas tardes|hola buenas noches|ola|bom dia|boa tarde|boa noite|bonjour|bonsoir|salut)$/.test(normalized);
}
