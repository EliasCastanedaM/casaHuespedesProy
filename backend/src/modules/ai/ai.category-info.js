const clean = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function isRoomDetailsInquiry(message) {
  const s = clean(message);
  if (/\b(?:reservar|reserva|cancelar|pagar|disponibilidad|disponibles?|recomendar|recomiendas|recomienda)\b/.test(s)) return false;
  const topic = /\b(?:habitaciones?|categorias?|camas?|matrimonial|doble|triple|familiar)\b/.test(s);
  const asks = /\b(?:cuentame|explicame|explica|describe|detalles?|informacion|cuales|que|tipos|opciones|dime|tienen)\b/.test(s);
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
export function formatRoomDetailsReply(categories, message) {
  const list = (Array.isArray(categories) ? categories : []).filter(c => c && c.is_active !== false && c.name);
  const s = clean(message);
  const filters = [
    [/matrimonial ejecutiva/, ["matrimonial-ejecutiva"]],
    [/matrimonial estandar/, ["matrimonial"]],
    [/familiar\s*(?:2|dos)/, ["familiar-2"]],
    [/familiar\s*(?:1|uno)/, ["familiar"]],
    [/\btriple\b/, ["triple"]],
    [/\bdoble\b/, ["doble"]],
    [/\bmatrimonial\b/, ["matrimonial", "matrimonial-ejecutiva"]],
    [/\bfamiliar\b/, ["familiar", "familiar-2"]],
  ];
  const all = /\b(?:cada una|una por una|todas|esas categorias|esas habitaciones|categorias|habitaciones)\b/.test(s);
  const selected = all ? list : (filters.find(([re]) => re.test(s))?.[1] || []).length
    ? list.filter(c => filters.find(([re]) => re.test(s))[1].includes(c.slug)) : list;
  if (!selected.length) return "No puedo confirmar esos detalles ahora mismo. Una persona del equipo puede ayudarte.";
  const rows = selected.map(c => {
    const parts = [c.name];
    if (Number(c.capacity) > 0) parts.push("hasta " + Number(c.capacity) + " huéspedes");
    if (c.bed_description) parts.push(c.bed_description);
    if (Number(c.price_per_night) > 0) parts.push("S/ " + Number(c.price_per_night).toFixed(2) + " por noche");
    return "- " + parts.join(" · ");
  });
  return ["¡Claro! 😊 Estas son nuestras categorías:", ...rows, "", "La disponibilidad se confirma para las fechas solicitadas. ¿Quieres consultar alguna en particular?"].join("\n");
}
