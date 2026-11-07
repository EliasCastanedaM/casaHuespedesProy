function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
const BOOKING_WORDS=/\b(?:reservar|reserva|cancelar|cambiar|modificar|confirmar|disponibilidad|bloquear)\b/;
const groups=[
  [/\b(?:wifi|internet)\b/,['wifi']],
  [/\b(?:estacionamiento|cochera)\b/,['estacionamiento']],
  [/\b(?:taxi|movilidad)\b/,['taxi']],
  [/\b(?:desayuno|breakfast)\b/,['desayuno-continental']],
  [/\b(?:bano|ducha|agua caliente|toallas?|papel higienico)\b/,['bano-privado']],
  [/\b(?:tv|television|netflix)\b/,['tv-netflix','salon-compartido']],
  [/\b(?:ventilador|ventilacion)\b/,['ventilador']],
  [/\bcocina\b/,['cocina-compartida']],
  [/\b(?:terraza|solarium|mobiliario exterior)\b/,['terraza','exteriores']],
  [/\b(?:lavanderia|lavado|planchado|limpieza en seco)\b/,['lavanderia']],
  [/\blimpieza\b(?! en seco)/,['limpieza-diaria']],
  [/\b(?:parrilla|barbacoa)\b/,['barbacoa']],
  [/\baeropuerto\b/,['traslado-aeropuerto']],
  [/\b(?:restaurante|cafeteria|snack.?bar|comida|bebida|fruta|botella|agua|galletas|bombones|menu para ninos)\b/,['comida-bebida']],
  [/\b(?:dieta|dietetic[oa]s?|alergias|menu especial)\b/,['menus-dieteticos']],
  [/\b(?:seguridad|extintores?|camaras?)\b/,['seguridad']],
  [/\b(?:factura|recepcion|registro de entrada|registro de salida)\b/,['recepcion']],
  [/\b(?:turismo|orientacion turistica|informacion turistica)\b/,['orientacion-turistica']],
  [/\b(?:playa|pediluvio)\b/,['playa-pediluvio']],
  [/\b(?:idioma|idiomas|espanol|ingles)\b/,['idiomas']],
  [/\b(?:fumar|fumadores)\b/,['habitaciones-familiares']],
  [/\b(?:salon|sala comun)\b/,['salon-compartido']],
  [/\b(?:mascota|mascotas|perros|gatos)\b/,['mascotas']],
];

export function isHotelServicesInquiry(message) {
  const text=normalized(message);
  if(!text)return false;
  const asks=/[?¿]/.test(message)||/\b(?:que|cuales|cual|incluye|incluyen|tienen|tiene|ofrecen|cuanto|cuesta|costo|hay|hablame|cuentame|explicame|aceptan|permiten)\b/.test(text);
  const commonTerrace=/\b(?:terraza comun|usar la terraza|subir a la terraza)\b/.test(text);
  if(commonTerrace && !BOOKING_WORDS.test(text))return true;
  if (/\b(?:prefiero|quisiera|quiero|me gustaria|puede ser|podria ser)\b.{0,30}\b(?:terraza|balcon|vista|ventana)\b/.test(text)) return false;
  if(BOOKING_WORDS.test(text) && (!asks ||
      /\b(?:quiero|quisiera|deseo) (?:hacer una reserva|reservar)\b/.test(text)))return false;
  const topic=/\b(?:servicios?|comodidades|amenidades)\b/.test(text)||groups.some(([pattern])=>pattern.test(text));
  return topic && asks;
}

export function formatHotelServicesReply(services,message) {
  const text=normalized(message);
  const all=(Array.isArray(services)?services:[]).filter(s=>s?.name);
  const slugs=new Set(groups.filter(([pattern])=>pattern.test(text)).flatMap(([,ids])=>ids));
  if(/\b(?:agua caliente|ducha)\b/.test(text))slugs.delete('comida-bebida');
  // Room TV and Netflix are distinct from the shared TV lounge.
  if(/\b(?:netflix|tv en la habitacion|television en la habitacion)\b/.test(text))slugs.delete('salon-compartido');
  const chosen=slugs.size?all.filter(s=>slugs.has(s.slug)):all;
  if(!chosen.length)return "No tengo un servicio confirmado para esa consulta. El equipo puede revisar tu consulta.";
  const lines=chosen.map(service=>{
    const details=service.description||service.name;
    const included=service.price_type==='included' && !/incluid|gratuit/.test(normalized(details)) ? " Incluido en la estadía." : "";
    return "- "+service.name+": "+details+included;
  });
  const coordinated=chosen.some(s=>s.requires_coordination||s.price_type==='on_request');
  return ["¡Claro! 😊",...lines,...(coordinated?["","El equipo confirmará la tarifa y disponibilidad de los servicios adicionales antes de contratarlos."]:[])].join("\n");
}
