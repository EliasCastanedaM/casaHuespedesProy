// Selection and presentation share one intent contract; an unmatched specific
// question NEVER falls back to the catalogue. Commercial text stays in sources.
function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
const BOOKING_WORDS=/\b(?:reservar|reserva|cancelar|cambiar|modificar|confirmar|disponibilidad|bloquear|book|booking|reserve)\b/;
const groups=[
  [/\b(?:wi[ -]?fi|internet)\b/,['wifi']],
  [/\b(?:estacionamiento|cochera)\b/,['estacionamiento']],
  [/\b(?:taxi|movilidad)\b/,['taxi']],
  [/\b(?:desayuno|breakfast)\b/,['desayuno-continental']],
  [/\b(?:bano|ducha|agua caliente|toallas?|papel higienico)\b/,['bano-privado']],
  [/\b(?:tv|television|netflix)\b/,['tv-netflix']],
  [/\b(?:ventiladores?|ventilacion|fans?)\b/,['ventilador']],
  [/\b(?:cocina|kitchen)\b/,['cocina-compartida']],
  [/\bterraza\b/,['terraza']],
  [/\b(?:solarium|mobiliario exterior)\b/,['exteriores']],
  [/\b(?:laundry|lavanderia|lavado|planchado|limpieza en seco)\b/,['lavanderia']],
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

const UNKNOWN_AMENITY = /\b(?:aire acondicionado|air condition(?:ing|er)?|a\/c|piscinas?|swimming pool|pool|jacuzzi|sauna|ascensor|elevator|gimnasio|gym|spa)\b/;
const EXTERNAL = /\b(?:restaurantes?|cafeterias?|restaurants?|cafes?)\b.*\b(?:cerca|cercanos?|alrededor|nearby|near|fuera)\b|\b(?:donde comer|where to eat)\b/;
// Anchored whole-request grammar: a trailing unknown subject ("de masajes")
// makes a query specific, even if it starts with "qué servicios".
const GENERAL = /^(?:(?:antes de seguir|hola|por favor|dime|muestrame|cuentame|dame)\s*,?\s*)*(?:(?:que|cuales|what|which)\s+)?(?:(?:otros?|todos los|todas las|all|every)\s+)?(?:servicios?|comodidades|amenidades|services|amenities|facilities)(?:\s+(?:tienen|ofrecen|incluye|incluyen|hay|estan incluidos|do you have|are available))?(?:\s+(?:en|del|el|la|mi|su|de|the|at|your)\s*(?:hotel|hospedaje|reserva|alojamiento|establecimiento|property))?(?:\s+(?:con detalles|en detalle|completos|completo|detallados|in detail))?$/;
function isGeneralRequest(text) { return GENERAL.test(text.replace(/[¿?¡!.,]/g,' ').replace(/\s+/g,' ').trim()); }

const EXPAND = /\b(?:detallad[oa]s?|detalles|descripcion completa|en detalle|detailed|in detail)\b/;
const ALL = /\b(?:todos|todas|completo|completa|all|every)\b/;
const FOLLOWUP = /^(?:[¿? ]*)(?:(?:y|and|pero) )?(?:esta incluido|estan incluidos|es gratis|es gratuito|cuanto cuesta|cuanto vale|tiene costo|esta disponible|como funciona|a que hora|en que horario|mas detalles|explicame mas|is it free|is it included|how much is it|tell me more)[?¿.! ]*$/;

export function isServiceFollowup(message) { return FOLLOWUP.test(normalized(message)); }

export function resolveServiceMessage(message, history = []) {
  if (!isServiceFollowup(message)) return message;
  // Only the most recent guest topic may resolve a pronoun. Never cross a
  // change of topic to recover an old service from farther back in history.
  const prior = [...history].filter(x => x.author === 'client' || x.role === 'user');
  if (prior.at(-1)?.content?.trim() === String(message).trim()) prior.pop();
  // Traverse only consecutive pronoun follow-ups, stopping at the first
  // substantive topic. The current question replaces earlier subquestions.
  while (prior.length && isServiceFollowup(prior.at(-1).content)) prior.pop();
  const topic = prior.at(-1)?.content;
  if (!topic) return message;
  const intent = classifyServiceInquiry(topic);
  return intent.kind === 'specific' ? topic + ' — ' + message : message;
}

export function classifyServiceInquiry(message, services = []) {
  const text=normalized(message);
  const empty={kind:'none', slugs:[], unknown:false, detailed:false, all:false};
  if (!text || EXTERNAL.test(text)) return empty;
  if (/\b(?:prefiero|quisiera|quiero|me gustaria|puede ser|podria ser)\b.{0,30}\b(?:terraza|balcon|vista|ventana)\b/.test(text) && !/terraza comun|usar la terraza/.test(text)) return empty;
  const asks=/[?¿]/.test(message)||/\b(?:que|cuales|cual|incluye|incluyen|tienen|tiene|ofrecen|cuanto|cuesta|costo|hay|hablame|cuentame|explicame|aceptan|permiten|proporcionan|do you|is there|what|which|is|are|services|servicios)\b/.test(text);
  const commonTerrace=/\b(?:terraza comun|usar la terraza|subir a la terraza)\b/.test(text);
  if (!asks && !commonTerrace && !/^(?:y |and |pero y )/.test(text)) return empty;
  if (BOOKING_WORDS.test(text) && (!asks || /\b(?:quiero|quisiera|deseo) (?:hacer una reserva|reservar)\b|\b(?:want to book|book a room)\b/.test(text))) return empty;
  const slugs=new Set(groups.filter(([pattern])=>pattern.test(text)).flatMap(([,ids])=>ids));
  // Exact catalogue names extend recognition without adding another prompt.
  for(const s of services) {
    const name=normalized(s.name);
    if(name && text.includes(name)) slugs.add(s.slug);
  }
  if(/\b(?:agua caliente|ducha)\b/.test(text))slugs.delete('comida-bebida');
  if(/\b(?:netflix|tv en la habitacion|television en la habitacion)\b/.test(text))slugs.delete('salon-compartido');
  const amenityRequest=/^(?:[¿? ]*)(?:(?:el hotel|el hospedaje) )?(?:tienen|tiene|ofrecen|hay|do you have|is there|are there)\b/.test(text) &&
    !/\b(?:habitaciones?|categorias?|camas?|matrimonial|doble|triple|familiar|reservas?|disponibilidad|tarifas?|precios?|promociones?|descuentos?|barato|economico|algo|opciones?|pago|human[oa]|persona|rooms?|beds?|booking)\b/.test(text);
  const missingAmenity=UNKNOWN_AMENITY.exec(text)?.[0];
  const unmatchedPart=text.split(/\s+(?:y|and)\s+/).slice(1).some(part=>
    !/^(?:cuanto|como|que|a que|con que|cual|how|what|which)\b/.test(part) &&
    !groups.some(([pattern])=>pattern.test(part)) &&
    !services.some(s=>part.includes(normalized(s.name))) &&
    /^(?:(?:el|la|un|una|the|servicio de) )?[a-z ]+[? .]*$/.test(part));
  const unknown=unmatchedPart || Boolean(missingAmenity && !allMatchingNames(services,missingAmenity)) ||
    (amenityRequest && !slugs.size && !isGeneralRequest(text));
  // General enumeration must be explicit. "servicio de X" is specific even
  // when X is new and has no synonym in this module.
  const general=isGeneralRequest(text) && !unknown;
  const topic=general||slugs.size||unknown||amenityRequest||/\b(?:servicios?|comodidades|amenidades|amenities)\b/.test(text);
  if(!topic)return empty;
  return {kind:general?'general':'specific',slugs:[...slugs],unknown:unknown||(!general&&!slugs.size), detailed:EXPAND.test(text),all:ALL.test(text)};
}

export function isHotelServicesInquiry(message) {
  return classifyServiceInquiry(message).kind !== 'none';
}

// Restricted, short questions can be answered without an LLM scope call.
// Uncertain or mixed requests still go through the existing scope classifier.
export function isSimpleServiceInquiry(message) {
  const intent=classifyServiceInquiry(message);
  if(intent.kind==='none')return false;
  let rest=normalized(message).replace(/[¿?¡!.,:—-]/g,' ');
  for(const [pattern] of groups)rest=rest.replace(new RegExp(pattern.source,'g'),' ');
  rest=rest.replace(new RegExp(UNKNOWN_AMENITY.source,'g'),' ');
  rest=rest.replace(/\b(?:y|and|pero|el|la|los|las|un|una|de|del|en|con|por|para|mi|su|sus|al|a|esta|estan|es|son|se|que|cuales|cual|tienen|tiene|hay|ofrecen|incluye|incluyen|servicio|servicios|comodidades|amenidades|todos|todas|otros|mas|hotel|hospedaje|establecimiento|habitacion|habitaciones|reserva|gratuito|gratuita|gratis|incluido|incluida|incluidos|costo|cuanto|cuesta|vale|do|you|have|is|it|there|are|what|which|all|services|amenities|included|free|the|rooms|room|at|your|and|how|much|does|cost|before|seguir|antes)\b/g,' ');
  return !rest.trim();
}

export function selectHotelServices(services,message) {
  const all=(Array.isArray(services)?services:[]).filter(s=>s?.name && s.is_active!==false && (!s.verification_status||['approved','publicly_listed'].includes(s.verification_status)));
  const intent=classifyServiceInquiry(message,all);
  const selected=intent.kind==='general' ? all : all.filter(s=>intent.slugs.includes(s.slug));
  return {intent,services:selected};
}

// These are exact translations of source sentences, not a parallel catalogue.
// A changed/longer source falls back to grounded generation in the caller.
const ENGLISH = new Map([
  ['Conexión WiFi gratuita disponible en todo el establecimiento.','Free WiFi is available throughout the property.'],
  ['Acceso a WiFi gratuito.','Free WiFi is available.'],
  ['Desayuno continental incluido en la tarifa de alojamiento.','Continental breakfast is included in the accommodation rate.'],
  ['Cada habitación cuenta con ventilador.','Each room has a fan.'],
  ['Cada habitación cuenta con TV y Netflix.','Each room has a TV and Netflix.'],
  ['Cada habitación cuenta con baño privado con agua caliente, toallas y papel higiénico.','Each room has a private bathroom with hot water, towels and toilet paper.'],
  ['Cocina abierta y compartida para uso de los huéspedes.','Guests can use the shared kitchen.'],
]);
export function serviceReplyLanguage(message, history = []) {
  const lang = value => /\b(?:do you|have|is it|is there|are there|what|which|air condition|swimming pool|breakfast|and the|services|amenities)\b/.test(normalized(value)) ? 'en'
    : /\b(?:bonjour|avez|piscine|petit dejeuner|quels|chambre)\b/.test(normalized(value)) ? 'fr'
    : /\b(?:voces|tem|cafe da manha|quais|piscina disponivel)\b/.test(normalized(value)) ? 'pt' : null;
  return lang(message) || (/\b(?:tienen|hay|que|desayuno|cuanto|incluido|gratis)\b/.test(normalized(message)) ? 'es' :
    lang([...history].reverse().find(x=>x.author==='client'||x.role==='user')?.content)) || 'es';
}

export function formatHotelServicesReply(services,message,{language='es'}={}) {
  const {intent,services:chosen}=selectHotelServices(services,message);
  const unknown=intent.unknown || intent.slugs.some(id=>!chosen.some(s=>s.slug===id));
  const uncertain=language==='en' ? "I don't have confirmed information about that service." : 'No tengo un servicio confirmado para esa consulta.';
  if(!['es','en'].includes(language))return null;
  if(!chosen.length)return uncertain;
  const aspect=serviceQuestionAspect(message);
  if(aspect && !chosen.every(s=>aspect.evidence.test(s.description||'')))return language==='en'
    ? "I don't have confirmed information about " + aspect.en + ' for that service.'
    : 'No tengo información confirmada sobre '+aspect.es+' de ese servicio.';
  if(language==='en' && chosen.some(s=>!ENGLISH.has(s.description)))return null;
  if(intent.kind==='general' && !intent.detailed) {
    const visible=intent.all?chosen:chosen.slice(0,6);
    // Names alone do not preserve charges, e.g. a pet charge per night. Keep
    // paid/coordinated services out of the short included-services summary.
    const included=visible.filter(s=>s.price_type==='included'&&!s.requires_coordination);
    const other=visible.filter(s=>!included.includes(s));
    if(language==='en')return chosen.map(s=>ENGLISH.get(s.description)).join(' ');
    const lines=[];
    if(included.length)lines.push('Incluidos en la estadía: '+included.map(s=>s.name).join(', ')+'.');
    for(const s of other)lines.push(detail(s));
    if(chosen.length>visible.length)lines.push('También hay otros servicios; puedes preguntarme por alguno en particular.');
    if(other.some(s=>s.requires_coordination||s.price_type==='on_request'))lines.push('El equipo confirmará la tarifa y disponibilidad antes de contratar los servicios adicionales.');
    return lines.join('\n');
  }
  const lines=chosen.map(s=>language==='en'?ENGLISH.get(s.description):detail(s));
  if(unknown)lines.unshift(uncertain);
  if(chosen.some(s=>s.requires_coordination||s.price_type==='on_request'))lines.push(language==='en'
    ?'Our team will confirm the fee and availability before you book the service.'
    :'El equipo confirmará la tarifa y disponibilidad antes de contratar el servicio.');
  return lines.join(chosen.length===1?' ':'\n');
}

function detail(service) {
  const description=service.description||service.name;
  const included=service.price_type==='included' && !/incluid|gratuit/.test(normalized(description)) ? ' Incluido en la estadía.' : '';
  const price=Number(service.price);
  const charge=price>0 && !/S\/\s*\d/.test(description) ? ' Cargo registrado: S/ '+price.toFixed(2)+'.' : '';
  const label=normalized(description).includes(normalized(service.name).split(' ')[0]) && !service.requires_coordination ? '' : service.name+': ';
  return label+description+included+charge;
}

function allMatchingNames(services, topic) {
  return services.some(s=>normalized(s.name).includes(topic));
}

// Topic recognition is not enough: an inclusion statement does not answer a
// question about the schedule, connection speed or access credentials.
function serviceQuestionAspect(message) {
  const text=normalized(message);
  if(/\b(?:horario|a que hora|en que horario|what time|opening hours)\b/.test(text))return {es:'el horario',en:'the schedule',evidence:/\b\d{1,2}(?::\d{2})?\s*(?:h|am|pm|a\.m|p\.m)|horario.*\d/i};
  if(/\b(?:contrasena|clave|password|credentials)\b/.test(text))return {es:'los datos de acceso',en:'access details',evidence:/clave|contraseña|password/i};
  if(/\b(?:velocidad|megas|mbps|speed)\b/.test(text))return {es:'la velocidad de conexión',en:'the connection speed',evidence:/\d+\s*(?:mbps|megas|gbps)/i};
  return null;
}
