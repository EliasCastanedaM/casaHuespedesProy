import { randomUUID } from "node:crypto";

// Flujo progresivo de WhatsApp MVP. La disponibilidad y el importe requieren aprobación humana;
// después de esa aprobación, el backend registra la reserva y procesa el método de pago elegido.
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

function normalizeStoredDate(value, now = new Date(), afterDate = null) {
  const raw = String(value || "").trim();
  if (!raw || /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return extractDateTokens(raw, now, afterDate)[0] || raw;
}

function namedCount(text, words) {
  const before = text.match(new RegExp("\\b(" + COUNT_TOKEN_PATTERN + ")\\s*(?:" + words + ")\\b"));
  const after = text.match(new RegExp("\\b(?:" + words + ")\\s*[:#-]?\\s*(" + COUNT_TOKEN_PATTERN + ")\\b"));
  const match = before || after;
  return match ? parseCountToken(match[1]) : null;
}

function additionalAdultRelativeCount(text) {
  return /\b(?:y|ademas|tambien)\s+(?:mi\s+)?(?:mama|madre|papa|padre|abuela|abuelo)\b/.test(text)
    ? 1
    : 0;
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
  const cleaned = normalize(text).replace(/[.,!?¡¿]/g, " ").replace(/\s+/g, " ").trim();
  return /^(?:no|nope|ningun[oa]?|ninguna|ninguno|sem|nao|non|none|not any)$/.test(cleaned);
}

function mentionsNoCategory(text, words) {
  const value = normalize(text);
  const negative = "(?:sin|no|tampoco|ningun[oa]?|without|sem|sans)";
  const verb = "(?:(?:hay|viajan|tenemos|llevamos|llevaremos|traemos|traeremos|viajamos\\s+con|vamos\\s+con|vamos\\s+a\\s+llevar|bring|have)\\s+)?";
  return new RegExp("\\b" + negative + "\\s+" + verb + "(?:" + words + ")\\b").test(value);
}

function collect(message, previous = {}, now = new Date()) {
  const text = normalize(message);
  const next = { ...previous };
  // Normaliza también borradores guardados por versiones anteriores, que
  // podían conservar fechas como "10/12" sin año.
  if (next.check_in) next.check_in = normalizeStoredDate(next.check_in, now);
  if (next.check_out) next.check_out = normalizeStoredDate(next.check_out, now, next.check_in);

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
  if (adults !== null) {
    next.adults = Math.min(adults + additionalAdultRelativeCount(text), 30);
  }
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

function changedBookingFields(previous, next) {
  const keys = [
    "check_in", "check_out", "adults", "children", "child_ages",
    "total_guests", "pets", "category_slug", "preferences",
  ];
  return keys.filter((key) =>
    next[key] !== undefined &&
    JSON.stringify(previous?.[key]) !== JSON.stringify(next[key])
  );
}

function isGuestCountQuestion(text) {
  return /\b(?:cuantas|cuantos)\b/.test(text) &&
    /\b(?:personas|huespedes|serian|somos|total)\b/.test(text);
}

function formatGuestCountReply(data = {}) {
  const total = Number(data.total_guests ?? 0);
  const adults = Number(data.adults ?? total);
  const children = Number(data.children ?? 0);
  return "Según los datos que me compartiste, serían " + total +
    (total === 1 ? " huésped" : " huéspedes") + " en total: " +
    adults + (adults === 1 ? " adulto" : " adultos") + " y " +
    (children === 0 ? "ningún niño." : children + (children === 1 ? " niño." : " niños."));
}

function formatHandoffUpdateReply(data = {}, changed = []) {
  const parts = [];
  if (changed.some((key) => ["adults", "children", "total_guests"].includes(key))) {
    const total = Number(data.total_guests ?? 0);
    const adults = Number(data.adults ?? 0);
    const children = Number(data.children ?? 0);
    parts.push(total + (total === 1 ? " huésped" : " huéspedes") + " en total: " +
      adults + (adults === 1 ? " adulto" : " adultos") + " y " +
      (children === 0 ? "ningún niño" : children + (children === 1 ? " niño" : " niños")));
  }
  if (changed.includes("check_in") || changed.includes("check_out")) {
    parts.push("fechas " + formatSummaryDate(data.check_in) + " al " + formatSummaryDate(data.check_out));
  }
  if (changed.includes("pets")) {
    const pets = Number(data.pets ?? 0);
    parts.push(pets === 0 ? "sin mascotas" : pets + (pets === 1 ? " mascota" : " mascotas"));
  }
  return "Gracias por la aclaración. Actualicé tu solicitud: " + parts.join("; ") +
    ". La disponibilidad y la confirmación final siguen pendientes del equipo.";
}

const labels = {
  es: {
    dates: "¡Perfecto! 😊 ¿Qué fechas de entrada y salida necesitas?",
    guests: "¿Cuántas personas vienen? Indícame los adultos y, si hay niños, sus edades.",
    children: "¿Viajan niños? Si es así, dime cuántos y sus edades.",
    ages: "¿Qué edades tienen los niños?",
    pets: "¿Llevarán mascotas? Si es así, ¿cuántas?",
    handoff: "¡Perfecto! 😊 Voy a comunicarte con una persona de nuestro equipo para confirmar disponibilidad y ayudarte a cerrar la reserva. Ya tiene los datos que compartiste; no necesitas repetirlos.",
    largeGroupHandoff: "¡Perfecto! 😊 Para grupos de 8 o más personas, nuestro equipo revisará la tarifa especial y la distribución de habitaciones. Ya tiene los datos que compartiste; no necesitas repetirlos.",
    customerName: "Para registrar la reserva, ¿me indicas tu nombre completo?",
    customerEmail: "Gracias. ¿Cuál es tu correo electrónico para enviarte los detalles de la reserva y el estado del pago?",
    customerEmailInvalid: "No pude reconocer ese correo. Escríbelo nuevamente, por ejemplo: nombre@correo.com.",
    customerPhone: "¿Me compartes un número de celular con código de país para asociarlo a la reserva?",
    customerPhoneInvalid: "No pude reconocer el número. Envíalo con código de país, por ejemplo +51987654321.",
    menu: MENU
  },
  en: {
    dates: "Perfect! 😊 What are your check-in and check-out dates?",
    guests: "How many people are coming? Please tell me the number of adults and children's ages, if any.",
    children: "Are there any children? If so, how many and what are their ages?",
    ages: "How old are the children?",
    pets: "Will you bring any pets? If so, how many?",
    handoff: "Perfect! 😊 I'll connect you with our team to check availability and complete the reservation. They will have the details you already shared.",
    largeGroupHandoff: "Perfect! 😊 For groups of 8 or more, our team will review the special rate and room allocation. They already have your details.",
    customerName: "To register the reservation, may I have your full name?",
    customerEmail: "Thank you. What email address should receive your reservation and payment updates?",
    customerEmailInvalid: "I couldn't recognize that email. Please enter it again, for example: name@example.com.",
    customerPhone: "Please share a phone number with country code so we can attach it to the reservation.",
    customerPhoneInvalid: "I couldn't recognize that number. Please include the country code, for example +51987654321.",
    menu: "I can also help with: 1) Rooms and rates 2) Services 3) Location and directions 4) Policies and FAQs 5) Reservations."
  },
  pt: {
    dates: "Perfeito! 😊 Quais são as datas de entrada e saída?",
    guests: "Quantas pessoas vêm? Informe o número de adultos e as idades das crianças, se houver.",
    children: "Há crianças na viagem? Se sim, quantas e quais são as idades?",
    ages: "Quais são as idades das crianças?",
    pets: "Vocês trarão animais de estimação? Quantos?",
    handoff: "Perfeito! 😊 Vou encaminhar você à nossa equipe para confirmar a disponibilidade e concluir a reserva. Não será necessário repetir os dados.",
    largeGroupHandoff: "Perfeito! 😊 Para grupos de 8 ou mais pessoas, nossa equipe avaliará a tarifa especial e a distribuição dos quartos.",
    customerName: "Para registrar a reserva, qual é seu nome completo?",
    customerEmail: "Obrigado. Qual é seu e-mail para receber os detalhes da reserva e do pagamento?",
    customerEmailInvalid: "Não reconheci esse e-mail. Envie novamente, por exemplo: nome@exemplo.com.",
    customerPhone: "Informe um telefone com código do país para associarmos à reserva.",
    customerPhoneInvalid: "Não reconheci o telefone. Inclua o código do país, por exemplo +51987654321.",
    menu: "Posso ajudar com: 1) Quartos e tarifas 2) Serviços 3) Localização 4) Políticas e perguntas frequentes 5) Reserva."
  },
  fr: {
    dates: "Parfait ! 😊 Quelles sont vos dates d'arrivée et de départ ?",
    guests: "Combien de personnes voyagent ? Précisez le nombre d'adultes et l'âge des enfants, le cas échéant.",
    children: "Y a-t-il des enfants ? Si oui, combien et quel âge ont-ils ?",
    ages: "Quel âge ont les enfants ?",
    pets: "Voyagez-vous avec des animaux ? Si oui, combien ?",
    handoff: "Parfait ! 😊 Je vous mets en relation avec notre équipe pour vérifier les disponibilités et terminer la réservation. Vous n'aurez pas à répéter les informations.",
    largeGroupHandoff: "Parfait ! 😊 Pour les groupes de 8 personnes ou plus, notre équipe vérifiera le tarif spécial et la répartition des chambres.",
    customerName: "Pour enregistrer la réservation, quel est votre nom complet ?",
    customerEmail: "Merci. Quelle adresse e-mail doit recevoir les détails de la réservation et du paiement ?",
    customerEmailInvalid: "Je n'ai pas reconnu cette adresse e-mail. Veuillez la saisir à nouveau.",
    customerPhone: "Veuillez indiquer un numéro de téléphone avec l'indicatif du pays.",
    customerPhoneInvalid: "Je n'ai pas reconnu ce numéro. Veuillez inclure l'indicatif du pays.",
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

function formatSummaryDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? match[3] + "/" + match[2] + "/" + match[1] : value;
}

export function formatWhatsAppHandoffSummary(data = {}) {
  const v = (value) => value === undefined || value === null || value === "" ? "Pendiente" : String(value);
  const ages = Array.isArray(data.child_ages) ? data.child_ages.join(", ") || "No aplica" : "Pendiente";
  const nights = data.check_in && data.check_out
    ? Math.max(0, Math.round((Date.parse(data.check_out + "T00:00:00Z") - Date.parse(data.check_in + "T00:00:00Z")) / 86400000))
    : null;
  const childPolicy = Array.isArray(data.child_ages)
    ? data.child_ages.map((age) => age <= 4 ? age + " años: sin cargo si usa cama disponible"
      : age <= 8 ? age + " años: 50 % del diferencial de tarifa; validar importe"
      : age + " años: tarifa de adulto").join("; ") || "No aplica"
    : "Pendiente";
  const petCharge = Number(data.pets || 0) > 0 && nights
    ? "S/ " + (20 * Number(data.pets) * nights).toFixed(2) + " estimado (" + data.pets + " mascota(s) × S/ 20 × " + nights + " noche(s)); autorización previa"
    : Number(data.pets || 0) > 0 ? "S/ 20 por mascota/noche; autorización previa" : "No aplica";
  const recommendation = data.recommended_category
    ? data.recommended_category.name + " (capacidad " + data.recommended_category.capacity + ")"
    : "Pendiente de recomendación";
  return [
    "SOLICITUD DE RESERVA — VALIDACIÓN HUMANA",
    "Ingreso: " + v(formatSummaryDate(data.check_in)),
    "Salida: " + v(formatSummaryDate(data.check_out)),
    "Noches: " + v(nights),
    "Adultos: " + v(data.adults),
    "Niños: " + v(data.children) + " · edades: " + ages,
    "Regla infantil: " + childPolicy,
    "Huéspedes totales: " + v(data.total_guests),
    "Mascotas: " + v(data.pets) + " · cargo de referencia: " + petCharge,
    "Categoría solicitada: " + v(data.category_slug),
    "Categoría sugerida: " + recommendation,
    "Preferencias: " + v(data.preferences),
    Number(data.total_guests || 0) >= 8
      ? "ATENCIÓN: grupo de 8 o más; tarifa especial y distribución de varias habitaciones a cargo del equipo."
      : "Estado: disponibilidad e importe pendientes de validación humana; todavía no existe reserva.",
  ].join("\n");
}


function recommendCategory(categories, guests) {
  const count = Number(guests || 0);
  if (!count || count >= 8 || !Array.isArray(categories)) return null;
  const active = categories
    .filter((item) => item?.slug && Number(item.capacity) >= count)
    .sort((a, b) =>
      Number(a.capacity) - Number(b.capacity) ||
      Number(a.price_per_night || 0) - Number(b.price_per_night || 0)
    );
  const item = active[0];
  return item ? {
    slug: String(item.slug),
    name: String(item.name || item.slug),
    capacity: Number(item.capacity),
    price_per_night: Number(item.price_per_night || 0),
  } : null;
}

function validPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function validEmail(value) {
  const candidate = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(candidate) ? candidate : null;
}

function paymentChoice(text) {
  const value = normalize(text).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (/^(?:1|pagar en el establecimiento|pago en el establecimiento|establecimiento|pagar al llegar|pago al llegar|pay at (?:the )?hotel|pay at property|pay on arrival|at the hotel|no estabelecimento|pagar no hotel|payer sur place|sur place)$/.test(value)) {
    return "pay_at_property";
  }
  if (/^(?:2|pagar ahora|pago ahora|pagar en linea|pagar online|culqi|pagar con culqi|pay now|pay online|pay with culqi|pagar agora|payer maintenant)$/.test(value)) {
    return "culqi_link";
  }
  return null;
}

function paymentReportedMessage(text) {
  return /\b(?:ya pague|he pagado|pago realizado|pague|ya realice el pago|ya hice el pago|paid|i have paid|payment sent|payment completed|ja paguei|paguei|j ai paye|j ai deja paye)\b/.test(normalize(text));
}

function asksBookingStatus(text) {
  return /\b(?:estado de mi reserva|como va mi reserva|mi reserva esta|esta confirmada|ya esta confirmada|confirmaron mi reserva|booking status|is my reservation|is it confirmed|reservation status|status da reserva|minha reserva|etat de ma reservation|ma reservation est)\b/.test(normalize(text));
}

function paymentOptionsReply(data, language = "es") {
  const amount = Number(data?.staff_confirmation?.total_amount || 0);
  const amountText = amount > 0 ? " Total confirmado: S/ " + amount.toFixed(2) + "." : "";
  const messages = {
    es: "¿Cómo prefieres realizar el pago?\\n1) Pagar en el establecimiento: registraremos tu reserva y pagarás al llegar.\\n2) Pagar ahora: te enviaremos un enlace seguro de Culqi." + amountText,
    en: "How would you like to pay?\\n1) Pay at the property: we will register your reservation and you will pay when you arrive.\\n2) Pay now: we will send you a secure Culqi payment link." + amountText,
    pt: "Como prefere pagar?\\n1) Pagar no estabelecimento: registraremos sua reserva e você pagará na chegada.\\n2) Pagar agora: enviaremos um link seguro da Culqi." + amountText,
    fr: "Comment souhaitez-vous payer ?\\n1) Payer sur place : nous enregistrerons votre réservation et vous paierez à votre arrivée.\\n2) Payer maintenant : nous vous enverrons un lien de paiement sécurisé Culqi." + amountText,
  };
  return messages[language] || messages.es;
}

function postApprovalReply(language, categoryName, amount) {
  const formatted = "S/ " + Number(amount).toFixed(2);
  const messages = {
    es: "¡Listo! Nuestro equipo verificó la disponibilidad de " + categoryName + " y confirmó el importe total de " + formatted + ". Para registrar tu reserva, ¿me indicas tu nombre completo?",
    en: "Great! Our team checked availability for " + categoryName + " and confirmed the total amount of " + formatted + ". To register your reservation, may I have your full name?",
    pt: "Perfeito! Nossa equipe verificou a disponibilidade de " + categoryName + " e confirmou o valor total de " + formatted + ". Para registrar sua reserva, qual é seu nome completo?",
    fr: "Parfait ! Notre équipe a vérifié la disponibilité de " + categoryName + " et confirmé le montant total de " + formatted + ". Pour enregistrer votre réservation, quel est votre nom complet ?",
  };
  return messages[language] || messages.es;
}

function paymentStatusReply(language, status) {
  const confirmed = status === "confirmed";
  const messages = {
    es: confirmed
      ? "¡Tu reserva está confirmada! El equipo verificó el pago. Gracias por elegir Casa Huéspedes Pimentel."
      : "Tu aviso de pago ya fue recibido. El equipo debe verificar el movimiento en Culqi; la reserva todavía no está confirmada. Te avisaremos cuando termine la revisión.",
    en: confirmed
      ? "Your reservation is confirmed. Our team verified the payment. Thank you for choosing Casa Huéspedes Pimentel."
      : "We received your payment notice. Our team must verify the transaction in Culqi; the reservation is not confirmed yet. We will notify you when the review is complete.",
    pt: confirmed
      ? "Sua reserva está confirmada. Nossa equipe verificou o pagamento. Obrigado por escolher a Casa Huéspedes Pimentel."
      : "Recebemos seu aviso de pagamento. Nossa equipe precisa verificar a transação na Culqi; a reserva ainda não está confirmada.",
    fr: confirmed
      ? "Votre réservation est confirmée. Notre équipe a vérifié le paiement. Merci d'avoir choisi Casa Huéspedes Pimentel."
      : "Nous avons reçu votre avis de paiement. Notre équipe doit vérifier la transaction dans Culqi ; la réservation n'est pas encore confirmée.",
  };
  return messages[language] || messages.es;
}

export function prepareWhatsAppMvpReservation({ context = {}, category, totalAmount, externalUserId }) {
  const current = context.whatsapp_mvp || {};
  const amount = Number(totalAmount);
  const categorySlug = String(category?.slug || "").trim().toLowerCase();
  const categoryName = String(category?.name || categorySlug).trim();
  if (current.state !== "handoff") {
    const error = new Error("La solicitud no está esperando validación humana.");
    error.statusCode = 409;
    throw error;
  }
  if (Number(current.total_guests || 0) >= 8) {
    const error = new Error("Los grupos de 8 o más huéspedes requieren gestión manual de varias habitaciones.");
    error.statusCode = 409;
    throw error;
  }
  if (!current.check_in || !current.check_out || !current.adults && !current.total_guests ||
      current.children == null || current.pets == null ||
      (Number(current.children) > 0 && (!Array.isArray(current.child_ages) || current.child_ages.length < Number(current.children)))) {
    const error = new Error("Faltan datos de la solicitud para confirmar disponibilidad.");
    error.statusCode = 409;
    throw error;
  }
  if (!categorySlug || !Number.isFinite(amount) || amount <= 0) {
    const error = new Error("Debes indicar una categoría y un importe total válidos.");
    error.statusCode = 400;
    throw error;
  }
  const language = current.language || "es";
  const next = {
    ...current,
    category_slug: categorySlug,
    recommended_category: {
      slug: categorySlug,
      name: categoryName,
      capacity: Number(category.capacity),
      price_per_night: Number(category.price_per_night || 0),
    },
    customer_phone: current.customer_phone || validPhone(externalUserId),
    staff_confirmation: {
      confirmed: true,
      category_slug: categorySlug,
      category_name: categoryName,
      total_amount: amount,
      confirmed_at: new Date().toISOString(),
    },
    state: "awaiting_customer_name",
    awaiting: "customer_name",
  };
  return {
    context: { ...context, state: "whatsapp_mvp", whatsapp_mvp: next },
    reply: postApprovalReply(language, categoryName, amount),
  };
}

export function handleWhatsAppMvpTurn({
  message,
  context = {},
  now = new Date(),
  externalUserId = "",
  categories = [],
}) {
  const text = normalize(message);
  const state = context.whatsapp_mvp || null;
  const language = detectLanguage(message, state?.language || "es");
  const dictionary = labels[language] || labels.es;
  const intent = reservationIntent(text);
  if (isWhatsAppMenuRequest(message)) {
    return { handled: true, reply: dictionary.menu, mode: "whatsapp_mvp_menu", context };
  }

  if (state?.state === "handoff") {
    const updated = collect(message, state, now);
    updated.language = language;
    updated.state = "handoff";
    delete updated.awaiting;
    const changed = changedBookingFields(state, updated);
    if (changed.length > 0) {
      return {
        handled: true,
        context: { ...context, whatsapp_mvp: updated, state: "whatsapp_mvp" },
        reply: formatHandoffUpdateReply(updated, changed),
        mode: "whatsapp_mvp_handoff_update",
      };
    }
    if (isGuestCountQuestion(text) && state.total_guests != null) {
      return {
        handled: true,
        context,
        reply: formatGuestCountReply(state),
        mode: "whatsapp_mvp_summary",
      };
    }
    return { handled: false, context };
  }

  if (["awaiting_customer_name", "awaiting_customer_email", "awaiting_customer_phone", "awaiting_payment_choice"].includes(state?.state)) {
    const updatedBooking = collect(message, state, now);
    const changed = changedBookingFields(state, updatedBooking);
    if (changed.length > 0) {
      const reset = { ...updatedBooking, state: "handoff" };
      delete reset.awaiting;
      delete reset.staff_confirmation;
      return {
        handled: true,
        context: { ...context, state: "whatsapp_mvp", whatsapp_mvp: reset },
        reply: formatHandoffUpdateReply(reset, changed) + " El equipo debe validar nuevamente la disponibilidad y el importe.",
        mode: "human_review_required",
      };
    }

    const next = { ...state, language };
    if (state.state === "awaiting_customer_name") {
      const name = String(message || "").trim().replace(/\s+/g, " ");
      if (name.length < 3 || name.length > 120 || /@/.test(name) || /^\d+$/.test(name)) {
        return { handled: true, context, reply: labels[language]?.customerName || labels.es.customerName, mode: "whatsapp_mvp_collecting" };
      }
      next.customer_name = name;
      const phone = validPhone(externalUserId) || validPhone(next.customer_phone);
      if (phone) {
        next.customer_phone = phone;
        next.state = "awaiting_customer_email";
        next.awaiting = "customer_email";
        return { handled: true, context: { ...context, state: "whatsapp_mvp", whatsapp_mvp: next }, reply: labels[language]?.customerEmail || labels.es.customerEmail, mode: "whatsapp_mvp_collecting" };
      }
      next.state = "awaiting_customer_phone";
      next.awaiting = "customer_phone";
      return { handled: true, context: { ...context, state: "whatsapp_mvp", whatsapp_mvp: next }, reply: labels[language]?.customerPhone || labels.es.customerPhone, mode: "whatsapp_mvp_collecting" };
    }

    if (state.state === "awaiting_customer_email") {
      const email = validEmail(message);
      if (!email) {
        return { handled: true, context, reply: labels[language]?.customerEmailInvalid || labels.es.customerEmailInvalid, mode: "whatsapp_mvp_collecting" };
      }
      next.customer_email = email;
      next.state = "awaiting_payment_choice";
      next.awaiting = "payment_choice";
      return { handled: true, context: { ...context, state: "whatsapp_mvp", whatsapp_mvp: next }, reply: paymentOptionsReply(next, language), mode: "whatsapp_mvp_payment_choice" };
    }

    if (state.state === "awaiting_customer_phone") {
      const phone = validPhone(message);
      if (!phone) {
        return { handled: true, context, reply: labels[language]?.customerPhoneInvalid || labels.es.customerPhoneInvalid, mode: "whatsapp_mvp_collecting" };
      }
      next.customer_phone = phone;
      next.state = "awaiting_customer_email";
      next.awaiting = "customer_email";
      return { handled: true, context: { ...context, state: "whatsapp_mvp", whatsapp_mvp: next }, reply: labels[language]?.customerEmail || labels.es.customerEmail, mode: "whatsapp_mvp_collecting" };
    }

    const selectedMethod = paymentChoice(text);
    if (!selectedMethod) {
      return { handled: true, context, reply: paymentOptionsReply(state, language), mode: "whatsapp_mvp_payment_choice" };
    }
    const selectedContext = {
      ...context,
      state: "whatsapp_mvp",
      whatsapp_mvp: {
        ...state,
        language,
        payment_method: selectedMethod,
        state: "creating_booking",
      },
    };
    return {
      handled: true,
      action: "create_booking",
      paymentMethod: selectedMethod,
      context: selectedContext,
      mode: "whatsapp_mvp_create_booking",
    };
  }

  if (["booked", "payment_reported", "confirmed"].includes(state?.state)) {
    if (state.payment_method === "culqi_link" && paymentReportedMessage(text)) {
      if (state.state === "payment_reported") {
        return {
          handled: true,
          context,
          reply: paymentStatusReply(language, "payment_reported"),
          mode: "whatsapp_mvp_payment_reported",
        };
      }
      return { handled: true, action: "report_payment", context, mode: "whatsapp_mvp_report_payment" };
    }
    if (state.payment_method === "pay_at_property" && paymentReportedMessage(text)) {
      return {
        handled: true,
        context,
        reply: "Tu reserva ya está registrada y el pago quedó pendiente para realizarse directamente en el establecimiento.",
        mode: "whatsapp_mvp_booking_created",
      };
    }
    if (asksBookingStatus(text)) {
      return { handled: true, action: "refresh_booking_status", context, mode: "whatsapp_mvp_booking_status" };
    }
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
  if (state?.state === "collecting" && !intent && /[¿?]/.test(String(message)) &&
      !containsStructuredBookingAnswer(message, state, now)) {
    return { handled: false, context };
  }

  const data = collect(message, state || {}, now);
  data.language = language;
  data.state = "collecting";
  data.intent_id = state?.intent_id || randomUUID();
  delete data.awaiting;

  const suggested = recommendCategory(categories, data.total_guests);
  if (data.total_guests != null && Number(data.total_guests) < 8 && suggested) {
    const selected = categories.find((item) => item.slug === data.category_slug);
    data.recommended_category = selected && Number(selected.capacity) >= Number(data.total_guests)
      ? {
          slug: String(selected.slug),
          name: String(selected.name || selected.slug),
          capacity: Number(selected.capacity),
          price_per_night: Number(selected.price_per_night || 0),
        }
      : suggested;
  } else if (Number(data.total_guests || 0) >= 8) {
    data.recommended_category = null;
  }

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
  const largeGroup = Number(data.total_guests || 0) >= 8;
  let handoffReply = largeGroup
    ? (labels[language]?.largeGroupHandoff || labels.es.largeGroupHandoff)
    : dictionary.handoff;
  if (!largeGroup && data.recommended_category) {
    const recommendation = data.recommended_category.name;
    handoffReply += " Por el tamaño del grupo, la categoría que mejor se ajusta es " + recommendation +
      " (capacidad " + data.recommended_category.capacity + "). Esto no confirma disponibilidad.";
  }
  return {
    handled: true,
    context: nextContext,
    reply: handoffReply,
    mode: "human_review_required",
    internalSummary: formatWhatsAppHandoffSummary(data),
  };
}
