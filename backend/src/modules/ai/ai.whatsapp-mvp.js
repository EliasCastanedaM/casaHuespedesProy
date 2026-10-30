// Flujo seguro y progresivo de WhatsApp MVP, sin crear reservas ni consultar stock.
// El contexto se guarda en ai_conversations.booking_context por conversación.
const MENU = "También puedo ayudarte con: 1) Habitaciones y tarifas 2) Servicios 3) Ubicación y cómo llegar 4) Políticas y preguntas frecuentes 5) Reserva.";

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function detectLanguage(message, prior = "es") {
  const t = normalize(message);
  if (/\b(?:hello|hi|i want|i would|book a|booking|check.in|check.out|adults|children|kids|pets|people|nights)\b/.test(t)) return "en";
  if (/\b(?:ola|bom dia|boa tarde|quero|reservar um|adultos|criancas|cachorro|noites|hospedes)\b/.test(t) && /\b(?:ola|quero|criancas|cachorro|noites|hospedes)\b/.test(t)) return "pt";
  if (/\b(?:bonjour|bonsoir|je voudrais|reserver|chambre|enfants|nuits)\b/.test(t)) return "fr";
  if (/\b(?:hola|buenas|quiero|quisiera|reservar|habitacion|ninos|mascotas|personas)\b/.test(t)) return "es";
  return prior;
}

function reservationIntent(text) {
  return /\b(?:reservar|reserva|separar|apartar|book|booking|reservation|reserve|reservar|reserva|reserver|reservation)\b/.test(text) &&
    !/\b(?:cancelar|cancel|anular|modificar|change|cambiar)\b/.test(text);
}

export function isWhatsAppMenuRequest(message) {
  const cleaned = normalize(message).replace(/[¿?¡!.,]/g, " ").replace(/\s+/g, " ").trim();
  return /^(?:menu|opciones|opcoes|options|choix|mostrar menu|ver menu|show menu|show me the menu|que opciones hay|que opciones hay en el menu|cuales son las opciones|que opciones tienes|what are the options|me muestras el menu|me das el menu)$/.test(cleaned);
}

const NUMBER_WORDS = Object.freeze({
  cero: 0, zero: 0,
  un: 1, uno: 1, una: 1, one: 1, um: 1, uma: 1, une: 1,
  dos: 2, two: 2, dois: 2, duas: 2, deux: 2,
  tres: 3, three: 3, trois: 3,
  cuatro: 4, four: 4, quatre: 4,
  cinco: 5, five: 5, cinq: 5,
  seis: 6, six: 6,
  siete: 7, seven: 7, sete: 7, sept: 7,
  ocho: 8, eight: 8, oito: 8, huit: 8,
  nueve: 9, nine: 9, nove: 9, neuf: 9,
  diez: 10, ten: 10, dez: 10, dix: 10,
  once: 11, eleven: 11, onze: 11,
  doce: 12, twelve: 12, doze: 12, douze: 12,
  trece: 13, thirteen: 13, treize: 13,
  catorce: 14, fourteen: 14, quatorze: 14,
  quince: 15, fifteen: 15, quinze: 15,
  dieciseis: 16, sixteen: 16, dezesseis: 16, seize: 16,
  diecisiete: 17, seventeen: 17,
  dieciocho: 18, eighteen: 18, dezoito: 18,
  diecinueve: 19, nineteen: 19, dezenove: 19,
  veinte: 20, twenty: 20, vinte: 20, vingt: 20,
  veintiuno: 21, veintiun: 21, veintiuna: 21,
  veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30
});

const COUNT_WORD_PATTERN = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|");
const COUNT_TOKEN_PATTERN = "(?:\\d{1,2}|" + COUNT_WORD_PATTERN + ")";
const ADULT_WORDS = "adultos?|adults?|adultes?";
const CHILD_WORDS = "nin[oa]s?|ninos?|children|kids?|criancas?|enfants?|filhos?";
const TOTAL_WORDS = "personas?|huespedes?|guests?|people|pessoas?|hospedes?";
const PET_WORDS = "mascotas?|perros?|gatos?|pets?|dogs?|cats?|cachorros?|animais?";

function parseCountToken(value) {
  const token = normalize(value);
  if (Object.hasOwn(NUMBER_WORDS, token)) return NUMBER_WORDS[token];
  if (/^\d{1,2}$/.test(token)) return Number(token);
  return null;
}

function limaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  return {
    year,
    iso: String(year) + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
  };
}

function datePartsToIso(day, month, year) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCDate() !== day ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCFullYear() !== year
  ) return null;
  return String(year) + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

function addIsoYear(value) {
  const [year, month, day] = value.split("-").map(Number);
  return datePartsToIso(day, month, year + 1);
}

function parseDateToken(token, now = new Date()) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
    const [year, month, day] = token.split("-").map(Number);
    return { value: datePartsToIso(day, month, year), explicitYear: true };
  }

  const parts = token.split(/[/-]/).map(Number);
  if (parts.length < 2 || parts.length > 3) return null;
  const [day, month] = parts;
  const today = limaToday(now);
  const explicitYear = parts.length === 3;
  let year = explicitYear ? (parts[2] < 100 ? parts[2] + 2000 : parts[2]) : today.year;
  let value = datePartsToIso(day, month, year);
  if (!value) return null;

  // Si no se indicó año, se interpreta como la próxima fecha futura en Perú.
  if (!explicitYear && value < today.iso) {
    year += 1;
    value = datePartsToIso(day, month, year);
  }
  return { value, explicitYear };
}

function extractDateTokens(message, now = new Date(), afterDate = null) {
  const pattern = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/g;
  const tokens = String(message || "").match(pattern) || [];
  const parsed = tokens.map((token) => parseDateToken(token, now)).filter((item) => item?.value);

  if (parsed.length >= 2 && parsed[1].value <= parsed[0].value && !parsed[1].explicitYear) {
    parsed[1].value = addIsoYear(parsed[1].value) || parsed[1].value;
  } else if (parsed.length === 1 && afterDate && parsed[0].value <= afterDate && !parsed[0].explicitYear) {
    parsed[0].value = addIsoYear(parsed[0].value) || parsed[0].value;
  }

  return parsed.slice(0, 2).map((item) => item.value);
}

function namedCount(text, words) {
  const before = text.match(new RegExp("\\b(" + COUNT_TOKEN_PATTERN + ")\\s*(?:" + words + ")\\b"));
  const after = text.match(new RegExp("\\b(?:" + words + ")\\s*[:#-]?\\s*(" + COUNT_TOKEN_PATTERN + ")\\b"));
  const match = before || after;
  return match ? parseCountToken(match[1]) : null;
}

function parseStandaloneCount(text) {
  const cleaned = normalize(text)
    .replace(/[.,!?¡¿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match = cleaned.match(new RegExp(
    "^(?:(?:somos|son|seremos|vamos|para|en total|total de|we are|there are|for|nous sommes)\\s+)?(" +
    COUNT_TOKEN_PATTERN +
    ")(?:\\s+(?:personas?|huespedes?|guests?|people|adultos?|adults?))?$"
  ));
  return match ? parseCountToken(match[1]) : null;
}

function parseAgeList(text) {
  const cleaned = normalize(text)
    .replace(/\b(?:tienen|tiene|son|edad(?:es)?|anos?|years?|year|ages?|age|de|y|and|e|et)\b/g, " ")
    .replace(/[,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/^(?:\d{1,2}\s*)+$/.test(cleaned)) return null;
  const ages = cleaned.split(/\s+/).map(Number);
  if (!ages.length || ages.some((age) => !Number.isInteger(age) || age < 0 || age > 17)) return null;
  return ages;
}

function isNegativeAnswer(text) {
  return /^(?:no|nope|ningun[oa]?|ninguna|ninguno|sem|nao|non|none|not any)$/.test(normalize(text));
}

function mentionsNoCategory(text, words) {
  const value = normalize(text);
  return new RegExp(
    "\\b(?:sin|no|ningun[oa]?|without|sem|sans)\\s+(?:(?:hay|viajan|tenemos|llevamos|bring|have)\\s+)?(?:" + words + ")\\b"
  ).test(value) || new RegExp(
    "\\bno\\s+(?:hay|viajan|tenemos|llevamos|bring|have)\\s+(?:" + words + ")\\b"
  ).test(value);
}

function collect(message, previous = {}, now = new Date()) {
  const text = normalize(message);
  const next = { ...previous };

  if (previous.awaiting === "children") {
    if (isNegativeAnswer(text) || mentionsNoCategory(text, CHILD_WORDS)) next.children = 0;
    else {
      const count = namedCount(text, CHILD_WORDS) ?? parseStandaloneCount(text);
      if (count !== null) next.children = count;
    }
  }
  if (previous.awaiting === "pets") {
    if (isNegativeAnswer(text) || mentionsNoCategory(text, PET_WORDS)) next.pets = 0;
    else {
      const count = namedCount(text, PET_WORDS) ?? parseStandaloneCount(text);
      if (count !== null) next.pets = count;
    }
  }
  if (previous.awaiting === "guests") {
    const count = parseStandaloneCount(text);
    if (count !== null) next.total_guests = count;
  }
  if (previous.awaiting === "ages") {
    const ages = parseAgeList(text);
    if (ages) next.child_ages = ages;
  }

  const dates = extractDateTokens(message, now, previous.check_in);
  if (dates.length === 2) {
    next.check_in = dates[0];
    next.check_out = dates[1];
  } else if (dates.length === 1) {
    if (!next.check_in) next.check_in = dates[0];
    else if (!next.check_out && dates[0] !== next.check_in) next.check_out = dates[0];
  }

  const adults = namedCount(text, ADULT_WORDS);
  const children = namedCount(text, CHILD_WORDS);
  const total = namedCount(text, TOTAL_WORDS);
  const pets = namedCount(text, PET_WORDS);
  if (adults !== null) next.adults = adults;
  if (children !== null) next.children = children;
  if (total !== null) next.total_guests = total;
  if (pets !== null) next.pets = pets;

  if (mentionsNoCategory(text, PET_WORDS)) next.pets = 0;
  if (mentionsNoCategory(text, CHILD_WORDS)) next.children = 0;
  if (/\b(?:no llevamos|no tenemos|no hay)\s+(?:mascotas?|perros?|gatos?|pets?|dogs?|cats?|cachorros?)\b/.test(text)) next.pets = 0;
  if (/\b(?:no hay|no viajan|no tenemos)\s+(?:nin[oa]s?|ninos?|children|kids?|criancas?|enfants?)\b/.test(text)) next.children = 0;

  const ageText = text.match(
    /\b(?:nin[oa]s?|ninos?|children|kids?|criancas?|enfants?)\s+(?:de|aged?|ages?)\s+((?:\d{1,2})(?:\s*(?:,|y|and|e|et)\s*\d{1,2})*)/
  )?.[1];
  if (ageText) {
    next.child_ages = (ageText.match(/\d{1,2}/g) || []).map(Number);
    if (next.children === undefined) next.children = next.child_ages.length;
  }

  if (next.children === 0) next.child_ages = [];
  if (next.adults == null && next.total_guests != null && next.children != null) {
    const inferredAdults = next.total_guests - next.children;
    if (inferredAdults >= 0) next.adults = inferredAdults;
  }
  if (next.children != null && next.adults != null) {
    next.total_guests = next.adults + next.children;
  }

  const categories = [
    ["matrimonial-ejecutiva", /\bmatrimonial\s+ejecutiva\b/],
    ["matrimonial", /\bmatrimonial\s+estandar\b/],
    ["doble", /\b(?:doble|double)\b/],
    ["triple", /\b(?:triple|tripl[ea])\b/],
    ["familiar-2", /\bfamiliar\s*(?:2|dos)\b/],
    ["familiar", /\bfamiliar\s*(?:1|uno)\b/],
  ];
  for (const [slug, pattern] of categories) {
    if (pattern.test(text)) { next.category_slug = slug; break; }
  }
  if (/\b(?:vista\s+al\s+mar|sea\s+view|terr?aza|balcon|balcony|cama\s+separada)\b/.test(text)) {
    next.preferences = String(message).slice(0, 300);
  }
  return next;
}

function containsStructuredBookingAnswer(message, state = {}, now = new Date()) {
  const text = normalize(message);
  return extractDateTokens(message, now, state?.check_in).length > 0 ||
    namedCount(text, ADULT_WORDS) !== null ||
    namedCount(text, CHILD_WORDS) !== null ||
    namedCount(text, TOTAL_WORDS) !== null ||
    namedCount(text, PET_WORDS) !== null ||
    parseStandaloneCount(text) !== null ||
    mentionsNoCategory(text, CHILD_WORDS) ||
    mentionsNoCategory(text, PET_WORDS) ||
    (["children", "pets"].includes(state?.awaiting) && isNegativeAnswer(text)) ||
    (state?.awaiting === "ages" && parseAgeList(text) !== null);
}

const labels = {
  es: {
    dates: "¡Perfecto! 😊 ¿Qué fechas de entrada y salida necesitas?",
    guests: "¿Cuántas personas vienen? Indícame los adultos y, si hay niños, sus edades.",
    children: "¿Viajan niños? Si es así, dime cuántos y sus edades.",
    ages: "¿Qué edades tienen los niños?",
    pets: "¿Llevarán mascotas? Si es así, ¿cuántas?",
    handoff: "¡Perfecto! 😊 Voy a comunicarte con una persona de nuestro equipo para confirmar disponibilidad y ayudarte a cerrar la reserva. Ya tiene los datos que compartiste; no necesitas repetirlos.",
    menu: MENU
  },
  en: {
    dates: "Perfect! 😊 What are your check-in and check-out dates?",
    guests: "How many people are coming? Please tell me the number of adults and children's ages, if any.",
    children: "Are there any children? If so, how many and what are their ages?",
    ages: "How old are the children?",
    pets: "Will you bring any pets? If so, how many?",
    handoff: "Perfect! 😊 I'll connect you with our team to check availability and complete the reservation. They will have the details you already shared.",
    menu: "I can also help with: 1) Rooms and rates 2) Services 3) Location and directions 4) Policies and FAQs 5) Reservations."
  },
  pt: {
    dates: "Perfeito! 😊 Quais são as datas de entrada e saída?",
    guests: "Quantas pessoas vêm? Informe o número de adultos e as idades das crianças, se houver.",
    children: "Há crianças na viagem? Se sim, quantas e quais são as idades?",
    ages: "Quais são as idades das crianças?",
    pets: "Vocês trarão animais de estimação? Quantos?",
    handoff: "Perfeito! 😊 Vou encaminhar você à nossa equipe para confirmar a disponibilidade e concluir a reserva. Não será necessário repetir os dados.",
    menu: "Posso ajudar com: 1) Quartos e tarifas 2) Serviços 3) Localização 4) Políticas e perguntas frequentes 5) Reserva."
  },
  fr: {
    dates: "Parfait ! 😊 Quelles sont vos dates d'arrivée et de départ ?",
    guests: "Combien de personnes voyagent ? Précisez le nombre d'adultes et l'âge des enfants, le cas échéant.",
    children: "Y a-t-il des enfants ? Si oui, combien et quel âge ont-ils ?",
    ages: "Quel âge ont les enfants ?",
    pets: "Voyagez-vous avec des animaux ? Si oui, combien ?",
    handoff: "Parfait ! 😊 Je vous mets en relation avec notre équipe pour vérifier les disponibilités et terminer la réservation. Vous n'aurez pas à répéter les informations.",
    menu: "Je peux vous aider : 1) Chambres et tarifs 2) Services 3) Localisation 4) Règlement 5) Réservation."
  }
};

function missingQuestion(data, l) {
  const dictionary = labels[l] || labels.es;
  if (!data.check_in || !data.check_out) return dictionary.dates;
  if (data.total_guests == null && data.adults == null) return dictionary.guests;
  if (data.children == null) return dictionary.children;
  if (data.children > 0 && (!Array.isArray(data.child_ages) || data.child_ages.length < data.children)) return dictionary.ages;
  if (data.pets == null) return dictionary.pets;
  return null;
}

export function formatWhatsAppHandoffSummary(data = {}) {
  const v = (value) => value === undefined || value === null || value === "" ? "Pendiente" : String(value);
  const ages = Array.isArray(data.child_ages) ? data.child_ages.join(", ") || "No aplica" : "Pendiente";
  return [
    "SOLICITUD DE RESERVA — VALIDACIÓN HUMANA",
    "Ingreso: " + v(data.check_in),
    "Salida: " + v(data.check_out),
    "Adultos: " + v(data.adults),
    "Niños: " + v(data.children) + " · edades: " + ages,
    "Huéspedes totales: " + v(data.total_guests),
    "Mascotas: " + v(data.pets),
    "Categoría: " + v(data.category_slug),
    "Preferencias: " + v(data.preferences),
    "Estado: SIN disponibilidad confirmada; SIN reserva creada.",
  ].join("\n");
}

export function handleWhatsAppMvpTurn({ message, context = {}, now = new Date() }) {
  const text = normalize(message);
  const state = context.whatsapp_mvp || null;
  const language = detectLanguage(message, state?.language || "es");
  const dictionary = labels[language] || labels.es;
  const intent = reservationIntent(text);
  if (isWhatsAppMenuRequest(message)) {
    return { handled: true, reply: dictionary.menu, mode: "whatsapp_mvp_menu", context };
  }
  if (!state && !intent) {
    const preliminary = collect(message, {}, now);
    const hasDetails = ["check_in", "total_guests", "adults", "children", "pets", "category_slug", "preferences"]
      .some((key) => preliminary[key] !== undefined);
    if (!hasDetails) return { handled: false, context };
    return {
      handled: false,
      context: {
        ...context,
        whatsapp_mvp: { ...preliminary, language, state: "browsing" },
      },
    };
  }
  if (state?.state === "browsing" && !intent) {
    return {
      handled: false,
      context: {
        ...context,
        whatsapp_mvp: { ...collect(message, state, now), language, state: "browsing" },
      },
    };
  }
  // Una pregunta informativa intermedia no debe reiniciar la reserva ni
  // forzar el siguiente paso del formulario. Las respuestas estructuradas,
  // incluso con números escritos o signos de interrogación, sí se procesan.
  if (state?.state === "collecting" && !intent && /[¿?]/.test(String(message)) &&
      !containsStructuredBookingAnswer(message, state, now)) {
    return { handled: false, context };
  }

  const data = collect(message, state || {}, now);
  data.language = language;
  data.state = "collecting";
  delete data.awaiting;
  const nextContext = { ...context, whatsapp_mvp: data, state: "whatsapp_mvp" };
  const question = missingQuestion(data, language);
  if (question) {
    data.awaiting = !data.check_in || !data.check_out ? "dates"
      : data.total_guests == null && data.adults == null ? "guests"
      : data.children == null ? "children"
      : data.children > 0 && (!Array.isArray(data.child_ages) || data.child_ages.length < data.children) ? "ages"
      : "pets";
    return { handled: true, context: nextContext, reply: question, mode: "whatsapp_mvp_collecting" };
  }
  data.state = "handoff";
  return {
    handled: true,
    context: nextContext,
    reply: dictionary.handoff,
    mode: "human_review_required",
    internalSummary: formatWhatsAppHandoffSummary(data),
  };
}
