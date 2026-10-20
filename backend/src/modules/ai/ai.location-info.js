import { formatOfficialHotelAddress } from "../hotel/hotelProfile.service.js";

function normalize(value) {
  return String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function isHotelLocationInquiry(message) {
  const text = normalize(message);
  if (!text) return false;

  // No confundir preguntas de atractivos turísticos con la dirección del hotel.
  if (/\b(?:museo|muelle|playa|restaurante|aeropuerto|chiclayo|caballitos)\b/.test(text) &&
      !/\b(?:hospedaje|hotel|casa huespedes)\b/.test(text)) return false;
  if (/\b(?:reservar|reserva|cancelar|cambio de direccion)\b/.test(text)) return false;

  return (
    /\b(?:direccion|ubicacion|ubicados?|ubicadas?|ubicado|ubicada|queda|quedan|llegar|llego|encuentran|situados?|donde estan|donde se ubica|como llegar)\b/.test(text) ||
    /\b(?:donde esta(?: el| la)? (?:hotel|hospedaje|casa huespedes))\b/.test(text) ||
    /\b(?:address|location|located|where are you|how to get there|directions)\b/.test(text) ||
    /\b(?:endereco|localizacao|onde fica|como chegar|adresse|ou etes vous|comment arriver)\b/.test(text)
  ) && (
    !/\b(?:cual es la direccion de|donde queda|donde se ubica|ubicacion de)\b/.test(text) ||
    /\b(?:hospedaje|hotel|casa huespedes|ustedes|estan|están|su|del|se)\b/.test(text)
  );
}

export function formatHotelLocationReply(profile, message = "") {
  const address = formatOfficialHotelAddress(profile);
  if (!address) {
    return "En este momento no puedo consultar la dirección exacta del hospedaje. Nuestro equipo puede orientarte por teléfono.";
  }
  const text = normalize(message);
  if (/\b(?:where|address|location|directions|located|how to get)\b/.test(text)) {
    return "Casa Huéspedes Pimentel is located at " + address +
      ". For directions, search this full address on your maps app.";
  }
  if (/\b(?:onde|endereco|localizacao|chegar)\b/.test(text)) {
    return "Casa Huéspedes Pimentel fica em " + address +
      ". Você pode procurar este endereço no seu aplicativo de mapas.";
  }
  if (/\b(?:adresse|comment arriver|ou etes)\b/.test(text)) {
    return "Casa Huéspedes Pimentel se trouve à " + address +
      ". Recherchez cette adresse dans votre application de cartes.";
  }
  return "📍 Estamos en " + address +
    ". Para llegar, puedes buscar esta dirección en Google Maps o compartir desde dónde vienes y te orientamos.";
}
