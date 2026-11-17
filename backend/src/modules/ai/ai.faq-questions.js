// Small, bounded informational fast path. It recognizes a complete question,
// never authorizes a booking, a payment or a change to conversation state.
export function normalizeFaqInquiry(value) {
  let text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 4; i++) {
    const next = text
      .replace(/^(?:hola|buenas(?: tardes| noches)?|buenos dias|por favor|una consulta|consulta|disculpa|disculpe)\s+/, '')
      .replace(/^(?:(?:yo )?(?:queria|quisiera|quiero|deseo|necesito|me gustaria) (?:saber|conocer|consultar)(?: sobre)?|(?:me )?(?:puedes|podrias|puede|podria) (?:decir|decirme|contar|contarme|indicar|indicarme|explicar|explicarme))\s+/, '');
    if (next === text) break;
    text = next;
  }
  return text.replace(/\s+(?:por favor|gracias|muchas gracias)$/, '').trim();
}

export function isDirectFaqQuestion(message) {
  const text = normalizeFaqInquiry(message);
  if (!text || text.length > 240) return false;
  const raw = String(message || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const asks = /[¿?]/.test(raw) ||
    /\b(?:saber|conocer|consultar|decirme|contarme|indicarme|explicarme)\b/.test(raw) ||
    /^(?:que|cual|cuales|cuanto|cuantos|cuantas|como|donde|tiene|tienen|hay|aceptan|admiten|permiten|incluye|incluyen|puedo|podemos|es posible)\b/.test(text) ||
    /^(?:wifi|internet|desayuno|servicios|ubicacion|direccion|medios de pago|formas de pago)$/.test(text);
  if (!asks) return false;
  // All words must belong to a single FAQ domain. Unrecognized subjects,
  // mixed requests and commands retain the normal AI interpretation.
  const domains = [
    /\b(?:wifi|wi fi|internet|desayuno|ventilador|ventiladores|netflix|television|tv|bano|ducha|agua caliente|toallas|cocina|terraza|lavanderia|limpieza|servicios|comodidades|amenidades)\b/,
    /\b(?:nino|nina|ninos|ninas|bebe|bebes|hijo|hija|hijos|hijas|menores|mascota|mascotas|perro|perros|perrito|perritos|gato|gatos)\b/,
    /\b(?:pagar|pago|pagos|yape|plin|bcp|cci|transferencia|tarjeta|tarjetas|visa|mastercard|efectivo|cuenta bancaria)\b/,
    /\b(?:direccion|ubicacion|ubicados|ubicado|donde estan|donde queda|donde se encuentran|como llegar|mapa|maps)\b/,
  ];
  if (domains.filter(pattern => pattern.test(text)).length !== 1) return false;
  const remainder = text
    .replace(/\b(?:wifi|wi fi|internet|desayuno|continental|ventilador|ventiladores|netflix|television|tv|bano|privado|ducha|agua|caliente|toallas|cocina|compartida|terraza|comun|lavanderia|limpieza|diaria|servicios|comodidades|amenidades|nino|nina|ninos|ninas|bebe|bebes|hijo|hija|hijos|hijas|menores|mascota|mascotas|perro|perros|perrito|perritos|gato|gatos|pagar|pago|pagos|yape|plin|bcp|cci|transferencia|tarjeta|tarjetas|visa|mastercard|efectivo|cuenta|bancaria|ahorros|numero|enlace|link|direccion|ubicacion|ubicados|ubicado|donde|queda|quedan|encuentran|llegar|mapa|maps|que|cual|cuales|cuanto|cuantos|cuantas|como|a|al|el|la|los|las|un|una|uno|unos|unas|de|del|en|por|para|con|sin|y|o|es|son|esta|estan|se|su|sus|tu|tus|mi|mis|nuestro|ustedes|hotel|hospedaje|alojamiento|establecimiento|tiene|tienes|tienen|hay|cuenta|cuentan|ofrece|ofrecen|incluye|incluyen|incluido|incluida|incluidos|incluidas|disponible|disponibles|gratis|gratuito|gratuita|gratuitos|costo|precio|tarifa|cargo|cobra|cobran|paga|pagan|aceptan|permiten|admiten|puedo|podemos|pueden|llevar|alojarse|adulto|adultos|edad|anos|meses|noche|noches|desde|hasta|partir|total|todos|todas|otros|otras|metodo|metodos|medio|medios|forma|formas|opciones|ahora|existe|posible|llegada|llegar|datos|saber|solo|solamente|sobre|si|no|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\b/g, ' ')
    .replace(/\b(?:[0-9]|1[0-7])\b/g, ' ')
    .replace(/\s+/g, '').trim();
  return !remainder;
}
