const clean = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function isRoomDetailsInquiry(message) {
  const s = clean(message);
  if (/\b(?:reservar|reserva|cancelar|pagar|disponibilidad|disponibles?|recomendar|recomiendas|recomienda|book|booking|reserve|cancel|pay|availability|available|recommend|precios?|tarifas?|prices?|rates?)\b/.test(s)) return false;
  const topic = /\b(?:habitaciones?|categorias?|camas?|matrimonial|doble|triple|familiar|rooms?|bedrooms?|quartos?|chambres?)\b/.test(s);
  const asks = /\b(?:cuentame|explicame|explica|describe|detalles?|informacion|cuales|que|tipos|opciones|dime|tienen|compara|comparame|comparar|diferencias?|fotos?|fotografias?|imagenes?|videos?|enlace|link|photos?|pictures?|details|information|tell|show|detalhes)\b/.test(s);
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
export const ROOMS_PAGE_URL = 'https://www.casahuespedespimentel.com/habitaciones';

export function formatRoomDetailsReply(_categories, _message, language = 'es') {
  const intro = {
    es: 'Puedes ver fotos y detalles de las habitaciones aquí:',
    en: 'You can see room photos and details here:',
    pt: 'Veja fotos e detalhes dos quartos aqui:',
    fr: 'Vous pouvez voir les photos et les détails des chambres ici :',
  }[language] || 'Puedes ver fotos y detalles de las habitaciones aquí:';
  return intro + '\n' + ROOMS_PAGE_URL;
}

export function isRoomDetailsFollowup(message) {
  return /^(?:quiero |dame |ver |muestrame |puedo ver |can i see |show me |i want )?(?:mas (?:detalles|informacion|fotos)|detalles|fotos|more (?:details|information|photos)|photos|details)[.!?¿¡\s]*$/.test(clean(message).trim());
}

export function followsRoomQuote(history = []) {
  const last = [...history].reverse().find(item => item.author === 'assistant' || item.role === 'assistant');
  return /S\/\s*\d/.test(last?.content || '') &&
    /matrimonial|doble|triple|familiar/i.test(last?.content || '');
}

// Commercial tariff labels and individual room numbers are internal hotel data.
export function guestCategoryDescription(value) {
  return String(value || "")
    .replace(/[^.!?]*(?:tarifa\s*Full)[^.!?]*[.!?]?/gi, "")
    .replace(/La unidad\s+\d+\s+tiene/gi, "Una de las habitaciones tiene")
    .replace(/\s+/g, " ").trim();
}

