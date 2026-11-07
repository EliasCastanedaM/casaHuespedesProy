export const HUMAN_ATTENTION_PHONE = "+51 943 030 098";

export const SPECIFIC_INQUIRY_REPLY =
  "Claro 😊. Pregúntame lo que necesites sobre habitaciones, tarifas, servicios, ubicación o políticas.";

export const HUMAN_ASSISTANCE_OFFER =
  "Claro 😊. También puedo ayudarte por aquí con las consultas del hospedaje. Si prefieres hablar con una persona, con gusto te comparto el número de atención.";

export const HUMAN_ASSISTANCE_REPLY =
  "Por supuesto 😊. Para recibir atención humana, puedes comunicarte con el señor Pepe, dueño del hotel, al " + HUMAN_ATTENTION_PHONE + ".";

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim();
}

export function isHumanAssistanceRequest(message) {
  const text = normalize(message);
  if (/^no (?:quiero|necesito|deseo|busco)\s+(?:(?:hablar con|contactar a)\s+)?(?:(?:un|una|el|la|al)\s+)?(?:humano|asesor|persona|recepcionista)\b/.test(text)) return false;
  return [
    /\b(?:hablar|comunicar(?:me)?|contactar(?:me)?|llamar)\b.{0,40}\b(?:persona|personal|alguien|humano|asesor|recepcionista|dueno|pepe)\b/,
    /\b(?:asesor|agente|atencion|soporte)\s+(?:human[oa]|personal)\b/,
    /\b(?:necesito|quiero|prefiero|quisiera)\s+(?:que me atienda\s+)?(?:(?:un|una|el|la|al)\s+)?(?:persona|humano|asesor|recepcionista|dueno|pepe)\b/,
    /\bnecesito\s+ayuda\s+de\s+(?:una\s+)?persona\b/,
    /^(?:un )?(?:asesor|humano|recepcionista)$/,
    /\b(?:numero|contacto|telefono)\b.{0,35}\b(?:pepe|dueno|asesor|humano|persona)\b/,
    /\b(?:talk|speak|contact)\b.{0,35}\b(?:human|person|someone|owner|agent)\b/,
    /\b(?:human agent|human support|real person)\b/,
    /\b(?:falar|parler)\b.{0,35}\b(?:pessoa|humano|personne|quelqu'un)\b/,
  ].some((pattern) => pattern.test(text));
}

export function isHumanContactConfirmation(message) {
  return /^(?:si(?: por favor)?|si (?:por favor )?(?:compartelo|dame el numero|pasame el numero)|ok(?:ay)?|claro|dale|por favor|compartelo|pasamelo|(?:dame|pasame|comparteme|brindame) (?:el )?(?:numero|contacto)|(?:numero|contacto)(?: por favor)?|lo prefiero|prefiero (?:una persona|atencion humana|hablar con el)|yes(?: please)?|please|sim(?: por favor)?|oui(?: s il vous plait)?)$/.test(normalize(message));
}

export function isContinueWithAiConfirmation(message) {
  return /^(?:no(?: gracias)?|mejor (?:tu|contigo)|prefiero (?:seguir|continuar) (?:aqui|contigo)|ayudame tu|sigo contigo|continuemos|no quiero (?:el )?(?:numero|contacto))$/.test(normalize(message));
}

export function isSpecificInquiryRequest(message) {
  const text = normalize(message).replace(/^(?:hola|si|claro|bueno)\s+/, "").replace(/\s+por favor$/, "");
  return /^(?:(?:quiero|quisiera|deseo|necesito|me gustaria)\s+)?(?:hablar(?:\s+(?:de|sobre))?|preguntar|consultar|saber)\s+(?:algo|(?:un\s+)?tema)(?:\s+(?:en\s+)?especifico)?$/.test(text) ||
    /^(?:algo(?: en)? especifico|tengo (?:una (?:consulta|pregunta|duda)|algo que (?:preguntar|consultar))|(?:puedo|te puedo) (?:hacer(?:te)? una pregunta|preguntar(?:te)? algo))$/.test(text);
}
