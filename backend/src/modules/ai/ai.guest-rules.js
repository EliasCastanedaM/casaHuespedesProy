// Reglas comerciales especiales: nunca deducir tarifas infantiles no validadas.
// Este guard impide convertir solicitudes excepcionales en pre-reservas automáticas.
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
  if (children && (bookingInProgress || hasReservationIntent)) return "reserva con niños";
  if (pets && (bookingInProgress || hasReservationIntent)) return "reserva con mascota";
  return null;
}

export function humanReviewReply(reason, phone = "901551287") {
  return [
    "Con gusto te ayudo. 😊",
    `Para ${reason}, nuestro equipo debe revisar los detalles antes de confirmar el precio y la reserva.`,
    "Voy a dejar esta conversación para que una persona pueda continuar contigo, sin que tengas que repetir lo que ya nos contaste.",
    `También puedes llamar al ${phone}.`,
  ].join("\n");
}

export function whatsAppMvpReservationReply() {
  return "¡Perfecto! 😊 Para ayudarte con la reserva, indícame las fechas de entrada y salida, cuántos adultos y niños viajarán (con sus edades), si llevarán mascotas y qué tipo de habitación prefieres. Nuestro equipo continuará en este mismo chat para verificar disponibilidad y confirmar la reserva.";
}

export function whatsAppMvpWelcome(message = "") {
  const text = normalize(message).trim();
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)$/.test(text)) {
    return "Hello! 👋 Welcome to Casa Huéspedes Pimentel. You can write in any language. Would you like hotel information or help with a reservation?";
  }
  return "¡Hola! 👋 Bienvenido(a) a Casa Huéspedes Pimentel. Puedes escribir en el idioma que prefieras. ¿Buscas información del hospedaje o quieres hacer una reserva?";
}
