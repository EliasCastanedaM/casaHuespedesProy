function normalize(value) {
  return String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function isHotelLocationInquiry(message) {
  const text = normalize(message);
  if (!text) return false;

  if (/\b(?:referencia|estan|hotel|hospedaje|casa huespedes)\b/.test(text) &&
      /\b(?:playa|muelle|malecon)\b/.test(text)) return true;

  // No confundir preguntas de atractivos turísticos con la dirección del hotel.
  if (/\b(?:museo|muelle|playa|restaurante|aeropuerto|chiclayo|caballitos)\b/.test(text) &&
      !/\b(?:hospedaje|hotel|casa huespedes)\b/.test(text) &&
      !/\b(?:llegar|llego|llegamos)\b.*\bdesde\b/.test(text)) return false;
  if (/\b(?:cancelar|cambio de direccion|direccion de correo|direccion ip)\b/.test(text)) return false;

  return (
    /\b(?:direccion|ubicacion|ubicados?|ubicadas?|ubicado|ubicada|queda|quedan|llegar|llego|encuentran|situados?|donde estan|donde se ubica|como llegar|mapa|maps|taxi|taxis|cochera|estacionamiento)\b/.test(text) ||
    /\b(?:donde esta(?: el| la)? (?:hotel|hospedaje|casa huespedes))\b/.test(text) ||
    /\b(?:address|location|located|where are you|how to get there|directions)\b/.test(text) ||
    /\b(?:endereco|localizacao|onde fica|como chegar|adresse|ou etes vous|comment arriver)\b/.test(text)
  );
}

export function isLocationMenuChoice(message) {
  const text = normalize(message).replace(/[\uFE0F\u20E3]/g, "").replace(/[.!¿?]/g, "").trim();
  return /^(?:(?:la\s+)?opcion\s*)?3$/.test(text);
}

export function isLocationMenuSelection(message, history = []) {
  if (!isLocationMenuChoice(message)) return false;
  if (/\bopcion\b/.test(normalize(message))) return true;
  const lastAssistant = [...history].reverse().find((item) => item.author === "assistant");
  const text = normalize(lastAssistant?.content);
  // Un número aislado solo representa el menú si el último mensaje del asesor
  // presentó esas opciones; no confundirlo con edades, huéspedes o pagos.
  return text.includes("habitaciones y tarifas") &&
    text.includes("ubicacion y como llegar") &&
    text.includes("politicas y preguntas frecuentes");
}

export function formatHotelLocationReply() {
  return [
    "📍 Casa Huéspedes: Calle Quiñonez 233, Pimentel, Chiclayo, Perú.",
    "A una cuadra del Muelle de Pimentel, en la paralela al primer malecón.",
    "Encuentra nuestra ubicación y las indicaciones para llegar aquí:",
    "https://maps.app.goo.gl/PfXxizCYj1YqeY9x7",
    "",
    "No contamos con estacionamiento propio. También te compartimos estas opciones de taxi y estacionamiento para facilitar tu llegada. Son servicios de terceros; puedes consultar directamente sus tarifas y disponibilidad:",
    "",
    "🚕 Servicio de taxi: +51 949 489 526",
    "🅿️ Estacionamiento las 24 horas: +51 979 123 264",
  ].join("\n");
}
