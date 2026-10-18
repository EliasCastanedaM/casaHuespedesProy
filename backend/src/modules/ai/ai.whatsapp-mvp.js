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

function extractDateTokens(message) {
  const pattern = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/g;
  const matches = String(message || "").match(pattern) || [];
  const valid = matches.filter((v) => {
    if (/^\d{4}-/.test(v)) {
      const d = new Date(v + "T12:00:00Z");
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
    }
    const parts = v.split(/[/-]/).map(Number);
    if (parts.length === 2) return parts[0] >= 1 && parts[0] <= 31 && parts[1] >= 1 && parts[1] <= 12;
    if (parts.length !== 3) return false;
    const year = parts[2] < 100 ? parts[2] + 2000 : parts[2];
    const d = new Date(Date.UTC(year, parts[1] - 1, parts[0]));
    return d.getUTCDate() === parts[0] && d.getUTCMonth() + 1 === parts[1];
  });
  return valid.slice(0, 2);
}

function namedCount(text, words) {
  const a = text.match(new RegExp("\\b(\\d{1,2})\\s*(?:" + words + ")\\b"));
  const b = text.match(new RegExp("\\b(?:" + words + ")\\s*[:#-]?\\s*(\\d{1,2})\\b"));
  return a || b ? Number((a || b)[1]) : null;
}

function collect(message, previous = {}) {
  const text = normalize(message);
  const next = { ...previous };
  if (previous.awaiting === "children") {
    if (/^(?:no|ninguna|ninguno|nope|sem|nao|non)$/i.test(text)) next.children = 0;
    if (/^(?:uno|una|un|one|um|uma)$/i.test(text)) next.children = 1;
    if (/^\d{1,2}$/.test(text)) next.children = Number(text);
  }
  if (previous.awaiting === "pets") {
    if (/^(?:no|ninguna|ninguno|nope|sem|nao|non)$/i.test(text)) next.pets = 0;
    if (/^(?:uno|una|un|one|um|uma|one pet|um animal)$/i.test(text)) next.pets = 1;
    if (/^\d{1,2}$/.test(text)) next.pets = Number(text);
  }
  if (previous.awaiting === "ages" && /^\d{1,2}(?:\s*(?:,|y|and|e|et)\s*\d{1,2})*$/.test(text)) {
    next.child_ages = (text.match(/\d{1,2}/g) || []).map(Number);
  }
  if (previous.awaiting === "guests" && /^\d{1,2}$/.test(text)) {
    next.total_guests = Number(text);
  }
  const dates = extractDateTokens(message);
  if (dates.length === 2) {
    next.check_in = dates[0];
    next.check_out = dates[1];
  } else if (dates.length === 1) {
    if (!next.check_in) next.check_in = dates[0];
    else if (!next.check_out && dates[0] !== next.check_in) next.check_out = dates[0];
  }

  const adults = namedCount(text, "adultos?|adults?|adultes?");
  const children = namedCount(text, "nin[oa]s?|ninos?|children|kids?|criancas?|enfants?");
  const total = namedCount(text, "personas?|huespedes?|guests?|people|pessoas?|hospedes?");
  const pets = namedCount(text, "mascotas?|perros?|gatos?|pets?|dogs?|cats?|cachorros?");
  if (adults !== null) next.adults = adults;
  if (children !== null) next.children = children;
  if (total !== null) next.total_guests = total;
  if (pets !== null) next.pets = pets;
  if (/\b(?:sin|no|ningun|ninguna|without|sem|sans)\s+(?:mascotas?|perros?|gatos?|pets?|dogs?|cats?|cachorros?)\b/.test(text)) next.pets = 0;
  if (/\b(?:sin|no|ningun|ninguna|without|sem|sans)\s+(?:nin[oa]s?|ninos?|children|kids?|criancas?|enfants?)\b/.test(text)) next.children = 0;
  if (/\b(?:no llevamos|no tenemos)\s+(?:mascotas?|perros?|gatos?)\b/.test(text)) next.pets = 0;

  const ageText = text.match(/\b(?:nin[oa]s?|ninos?|children|kids?|criancas?|enfants?)\s+(?:de|aged?|ages?)\s+(\d{1,2})(?:\s*(?:y|and|e|,)\s*(\d{1,2}))?/);
  if (ageText) {
    next.child_ages = [ageText[1], ageText[2]].filter(Boolean).map(Number);
    if (next.children === undefined) next.children = next.child_ages.length;
  }
  if (next.children === 0) next.child_ages = [];
  if (next.children != null && next.adults != null) next.total_guests = next.adults + next.children;

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

export function handleWhatsAppMvpTurn({ message, context = {} }) {
  const text = normalize(message);
  const state = context.whatsapp_mvp || null;
  const language = detectLanguage(message, state?.language || "es");
  const dictionary = labels[language] || labels.es;
  const intent = reservationIntent(text);
  if (isWhatsAppMenuRequest(message)) {
    return { handled: true, reply: dictionary.menu, mode: "whatsapp_mvp_menu", context };
  }
  if (!state && !intent) {
    const preliminary = collect(message);
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
        whatsapp_mvp: { ...collect(message, state), language, state: "browsing" },
      },
    };
  }
  // Una pregunta informativa intermedia no debe reiniciar la reserva ni
  // forzar el siguiente paso del formulario: responde la IA y conserva datos.
  if (state?.state === "collecting" && !intent && /[¿?]/.test(String(message)) &&
      extractDateTokens(message).length === 0 &&
      !/\b\d{1,2}\s*(?:adultos?|adults?|ninos?|nin[oa]s?|children|guests?|huespedes?|personas?)\b/.test(text)) {
    return { handled: false, context };
  }
  const data = collect(message, state || {});
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
