import { HUMAN_ATTENTION_PHONE } from "./ai.human-assistance.js";

// Reglas comerciales confirmadas: 0–4 años sin cargo con cama disponible,
// 5–8 años al 50 % del diferencial de tarifa y desde 9 años tarifa de adulto.
// Niños, mascotas y grupos especiales conservan validación humana antes del cierre.
function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function requiresManualReview(message, { bookingInProgress = false, hasReservationIntent = false } = {}) {
  const text = normalize(message);
  const pets = /\b(?:mascotas?|perros?|perrit[oa]s?|gatos?|gatit[oa]s?)\b/.test(text);
  const children = /\b(?:nin[oa]s?|bebes?|menores?|hij[oa]s?|infantes?)\b/.test(text);
  const groupWords = /\b(?:grupos?|personas?|huespedes?|adultos?)\b/.test(text);
  const numberedParty = [...text.matchAll(/\b(\d{1,2})\s*(?:personas?|huespedes?|adultos?)\b/g)]
    .some((match) => Number(match[1]) >= 8);
  const groupOfEight = numberedParty || /\bgrupos?\s+de\s+(?:8|9|1\d|2\d|3\d)\b/.test(text);

  if (groupOfEight && groupWords) return "grupo de 8 o más personas";
  // Una pregunta general sobre políticas NO significa que el huésped ya
  // incluyó mascotas o niños en su reserva. El bot debe informar primero.
  const generalQuestion = /^[^a-z0-9]*(?:aceptan|permiten|admiten|cuanto|cuantos|desde|hasta|a partir|que|como|puedo)\b/.test(text) && !hasReservationIntent;
  if (generalQuestion) return null;
  if (children && (bookingInProgress || hasReservationIntent)) return "reserva con niños";
  if (pets && (bookingInProgress || hasReservationIntent)) return "reserva con mascota";
  return null;
}

export function humanReviewReply(reason, phone = HUMAN_ATTENTION_PHONE) {
  return [
    "Con gusto te ayudo. 😊",
    `Para ${reason}, nuestro equipo debe revisar los detalles antes de confirmar el precio y la reserva.`,
    "Voy a dejar esta conversación para que una persona pueda continuar contigo, sin que tengas que repetir lo que ya nos contaste.",
    `También puedes llamar al ${phone}.`,
  ].join("\n");
}

export function globalAssistantReservationReply() {
  return "¡Perfecto! 😊 Para ayudarte con la reserva, indícame las fechas de entrada y salida, cuántos adultos y niños viajarán (con sus edades), si llevarán mascotas y qué tipo de habitación prefieres. Nuestro equipo continuará en este mismo chat para verificar disponibilidad y confirmar la reserva.";
}

export function globalAssistantWelcome() {
  return [
    "¡Hola! 👋 Bienvenido a Casa Huéspedes. Puedes escribirme en el idioma que prefieras.",
    "",
    "¿Buscas información del hotel o quieres hacer una reserva? Puedo ayudarte con estas opciones:",
    "",
    "1️⃣ Habitaciones y tarifas",
    "2️⃣ Servicios del hotel",
    "3️⃣ Ubicación y cómo llegar",
    "4️⃣ Políticas y preguntas frecuentes",
    "5️⃣ Reservas",
    "",
    "Puedes elegir una opción o escribirme directamente lo que necesitas. 😊",
  ].join("\n");
}

// Segundo mensaje fijo de presentación, enviado por el backend después
// del menú de bienvenida, también cuando un huésped vuelve a saludar.
// Son enlaces oficiales publicados en el sitio web del hospedaje.
export function globalAssistantSocialLinks() {
  return [
    "📸 ¿Te gustaría conocer mejor nuestras habitaciones e instalaciones?",
    "",
    "Puedes ver fotografías, videos y más información sobre Casa Huéspedes Pimentel en nuestra página web y redes sociales:",
    "",
    "🌐 Página web: https://www.casahuespedespimentel.com/",
    "📷 Instagram: https://www.instagram.com/casahuespedes.pimentel/",
    "📘 Facebook: https://www.facebook.com/casadehuespedespimentel/",
    "🎥 TikTok: https://www.tiktok.com/@casahuespedespimentel",
    "",
    "Si deseas hacer una consulta o reservar, puedes seguir escribiéndonos aquí. 😊",
  ].join("\n");
}

// Consultas explícitas por fotografías, videos y enlaces oficiales.
// No enviar automáticamente el catálogo si el huésped habla de materiales
// de terceros, tutoriales de redes sociales o contenidos ajenos al hospedaje.
export function isHotelSocialMediaInquiry(message) {
  const text = String(message || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (!text || text.length > 500) return false;
  if (/\b(?:tesis|ensayo|tarea|receta|codigo|programacion|tutorial|crear cuenta|iniciar sesion|contrasena|hackear|museos?|restaurantes?|arqueologia|tumbas reales|huacas?)\b/.test(text)) return false;
  const media = /\b(?:fotos?|fotografias?|imagenes?|videos?|instagram|facebook|tiktok|redes sociales|pagina web|sitio web|website|social media)\b/.test(text);
  const context = /\b(?:hotel|hospedaje|habitacion|habitaciones|instalaciones|alojamiento|casa huespedes|pimentel|ustedes|nuestras|nuestro|sus|su|tienen|puedo ver|donde veo|compartir|comparteme|pasame|mandame)\b/.test(text);
  const ownerSocial = /\b(?:su|sus|del hotel|del hospedaje|de ustedes)\s+(?:instagram|facebook|tiktok|redes sociales|pagina web|sitio web)\b/.test(text);
  return media && (context || ownerSocial);
}

// Compatibility names for existing consumers.
export { globalAssistantWelcome as whatsAppMvpWelcome, globalAssistantReservationReply as whatsAppMvpReservationReply };
