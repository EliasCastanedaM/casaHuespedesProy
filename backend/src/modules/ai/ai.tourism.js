// Catálogo turístico informativo del entorno de Pimentel (revisión 2026-11-08).
// Fuentes públicas en cada registro. No contiene precios, menús ni horarios
// porque pueden cambiar; tampoco promete proximidad a pie desde el hotel.
// Los identificadores y ubicaciones de habitación nunca se comparten aquí.

export const TOURISM_PLACES = Object.freeze([
  // Restaurantes y cafés dentro del distrito de Pimentel.
  { id:"tintorera", name:"Picantería La Tintorera", kind:"dining", area:"pimentel",
    address:"Manuel Seoane 733, Pimentel", source:"https://www.google.com/maps/search/?api=1&query=Picanteria+La+Tintorera+Manuel+Seoane+733+Pimentel" },
  { id:"bertikas", name:"Bertika's", kind:"dining", area:"pimentel",
    address:"Calle Lima 200, Pimentel", source:"https://pe.todosnegocios.com/bertikas-979-732-537" },
  { id:"tienda-pato", name:"La Tienda del Pato", kind:"dining", area:"pimentel",
    address:"Calle José Quiñones, Pimentel (numeración por confirmar)", source:"https://www.google.com/maps/search/?api=1&query=La+Tienda+del+Pato+Pimentel" },
  { id:"picanteria-mar", name:"Picantería del Mar", kind:"dining", area:"pimentel",
    address:"Rivera del Mar 164, Pimentel", source:"https://www.google.com/maps/search/?api=1&query=Picanteria+del+Mar+Rivera+del+Mar+164+Pimentel" },
  { id:"mintha", name:"Mintha Café Pimentel", kind:"dining", area:"pimentel",
    address:"Manuel Seoane 725, Pimentel", source:"https://www.google.com/maps/search/?api=1&query=Mintha+Cafe+Manuel+Seoane+725+Pimentel" },
  { id:"muelle-cafe", name:"El Muelle Café - Lab", kind:"dining", area:"pimentel",
    address:"Manuel Seoane 510, Pimentel", source:"https://www.google.com/maps/search/?api=1&query=El+Muelle+Cafe+Lab+Manuel+Seoane+510+Pimentel" },
  { id:"proa", name:"La Proa", kind:"dining", area:"pimentel",
    address:"Zona del muelle, Pimentel (calle y numeración por confirmar)", source:"https://www.google.com/maps/search/?api=1&query=La+Proa+Pimentel" },
  { id:"frio-fuego", name:"Al Frío y Al Fuego", kind:"dining", area:"pimentel",
    address:"Zona del malecón Manuel Seoane, Pimentel (numeración por confirmar)", source:"https://www.google.com/maps/search/?api=1&query=Al+Frio+y+Al+Fuego+Pimentel" },

  // Costa y cultura pesquera de Pimentel.
  { id:"muelle", name:"Muelle de Pimentel", kind:"coast", area:"pimentel",
    address:"Malecón Manuel Seoane, Pimentel", source:"https://www.google.com/maps/search/?api=1&query=Muelle+de+Pimentel" },
  { id:"playa", name:"Playa de Pimentel", kind:"coast", area:"pimentel",
    address:"Litoral junto al malecón de Pimentel", source:"https://www.google.com/maps/search/?api=1&query=Playa+Pimentel" },
  { id:"malecon", name:"Malecón de Pimentel", kind:"coast", area:"pimentel",
    address:"Avenida Manuel Seoane, Pimentel", source:"https://www.google.com/maps/search/?api=1&query=Malecon+de+Pimentel" },
  { id:"totora", name:"Zona de caballitos de totora", kind:"coast", area:"pimentel",
    address:"Sector de pesca artesanal de la playa de Pimentel", source:"https://www.munipimentel.gob.pe/documentos_gestion/normasmunicipales/ordenanzas/Ordenanza%20Municipal%20N%20031%202023.pdf" },

  // Paseos y cultura urbana de Chiclayo.
  { id:"parque-chiclayo", name:"Parque Principal de Chiclayo", kind:"city", area:"chiclayo",
    address:"Centro de Chiclayo", source:"https://www.google.com/maps/search/?api=1&query=Parque+Principal+Chiclayo" },
  { id:"catedral", name:"Catedral de Chiclayo", kind:"city", area:"chiclayo",
    address:"Frente al Parque Principal, centro de Chiclayo", source:"https://www.google.com/maps/search/?api=1&query=Catedral+Chiclayo" },
  { id:"musas", name:"Paseo de las Musas", kind:"city", area:"chiclayo",
    address:"Avenida Garcilaso de la Vega, Chiclayo", source:"https://www.google.com/maps/search/?api=1&query=Paseo+de+las+Musas+Chiclayo" },
  { id:"mercado", name:"Mercado Modelo de Chiclayo", kind:"city", area:"chiclayo",
    address:"Centro de Chiclayo", source:"https://www.google.com/maps/search/?api=1&query=Mercado+Modelo+Chiclayo" },

  // Museos y complejos arqueológicos: excursiones fuera de Pimentel.
  { id:"tumbas", name:"Museo Tumbas Reales de Sipán", kind:"museum", area:"lambayeque",
    address:"Av. Juan Pablo Vizcardo y Guzmán 895, Lambayeque",
    source:"https://www.gob.pe/institucion/naylamp/sedes" },
  { id:"bruning", name:"Museo Arqueológico Nacional Brüning", kind:"museum", area:"lambayeque",
    address:"Av. Huamachuco, cuadra 8, Lambayeque",
    source:"https://www.gob.pe/institucion/naylamp/sedes" },
  { id:"sican", name:"Museo Nacional de Sicán", kind:"museum", area:"ferrenafe",
    address:"Av. Batán Grande, cuadra 9 s/n, carretera Pítipo–Ferreñafe",
    source:"https://www.gob.pe/institucion/naylamp/sedes" },
  { id:"tucume", name:"Museo de Sitio y Pirámides de Túcume", kind:"museum", area:"tucume",
    address:"Campiña de San Antonio s/n, distrito de Túcume",
    source:"https://museos.cultura.pe/museos/museo-de-sitio-t%C3%BAcume" },
  { id:"huaca-rajada", name:"Museo de Sitio y complejo arqueológico Huaca Rajada–Sipán", kind:"museum", area:"sipan",
    address:"Campiña Huaca Rajada s/n, carretera Sipán–Pampa Grande",
    source:"https://www.gob.pe/10988-visitar-el-museo-de-sitio-huaca-rajada-sipan" },
  { id:"chotuna", name:"Museo de Sitio Huaca Chotuna–Chornancap", kind:"museum", area:"lambayeque",
    address:"A 1,5 km del caserío Ranchería, comunidad campesina de San José, Lambayeque",
    source:"https://www.gob.pe/institucion/naylamp/campa%C3%B1as/107721-museos-abiertos-visita-los-museos-de-lambayeque-gratis" },

  // Naturaleza y conservación: requieren desplazamiento desde Pimentel.
  { id:"pomac", name:"Santuario Histórico Bosque de Pómac", kind:"nature", area:"pitipo",
    address:"Distrito de Pítipo, provincia de Ferreñafe; acceso por el sector La Zaranda",
    source:"https://visitaareasnaturales.sernanp.gob.pe/anps/santuario-historico-bosque-de-pomac/" },
  { id:"chaparri", name:"Reserva Ecológica Chaparrí", kind:"nature", area:"chongoyape",
    address:"Distrito de Chongoyape, acceso coordinado por la comunidad Muchik Santa Catalina",
    source:"https://consultasenlinea.mincetur.gob.pe/fichaInventario/index.aspx?cod_Ficha=2350" },
]);

const normalize = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();

const LABELS = {
  es: { intro:"Estos son algunos lugares de interés en", near:"Pimentel", outer:"Lambayeque", address:"Ubicación",
    dining:"Algunos restaurantes y cafés en Pimentel:", coast:"Para pasear por Pimentel:",
    museum:"Museos y lugares arqueológicos para visitar en la región:",
    city:"Paseos en Chiclayo:", nature:"Lugares de naturaleza en la región:",
    general:"Puedes conocer estos lugares durante tu estadía:",
    note:"Los horarios, accesos y condiciones pueden variar; conviene confirmarlos antes de ir.",
    travel:"Los museos y reservas naturales están fuera de Pimentel y requieren desplazamiento.",
    more:"Si deseas, puedo mencionarte más lugares de esta categoría.",
    uncertain:"La dirección exacta de algunos negocios aún necesita confirmación.",
    notfound:"Por ahora no tengo una ubicación verificada para ese lugar. Puedo indicarte otros sitios conocidos de la zona." },
  en: { address:"Location", dining:"Some restaurants and cafés in Pimentel:", coast:"Places to visit along Pimentel's coast:",
    museum:"Museums and archaeological sites in the region:", city:"Places to visit in Chiclayo:",
    nature:"Nature destinations in the region:", general:"Some places to explore during your stay:",
    note:"Opening hours and access conditions may change; please check before visiting.",
    travel:"Museums and nature reserves are outside Pimentel and require transport.",
    more:"I can share more places in this category if you'd like.",
    uncertain:"Some business addresses still need confirmation.",
    notfound:"I don't have a verified address for that place yet. I can suggest other destinations nearby." },
  pt: { address:"Localização", dining:"Alguns restaurantes e cafés em Pimentel:", coast:"Passeios em Pimentel:",
    museum:"Museus e sítios arqueológicos da região:", city:"Passeios em Chiclayo:",
    nature:"Destinos naturais da região:", general:"Lugares para conhecer durante sua estadia:",
    note:"Horários e condições de acesso podem mudar; confirme antes de visitar.",
    travel:"Museus e reservas ficam fora de Pimentel e exigem transporte.",
    more:"Posso indicar mais lugares dessa categoria, se desejar.",
    uncertain:"Alguns endereços ainda precisam de confirmação.",
    notfound:"Ainda não tenho endereço verificado para esse local. Posso sugerir outros passeios na região." },
  fr: { address:"Adresse", dining:"Quelques restaurants et cafés à Pimentel :", coast:"Promenades à Pimentel :",
    museum:"Musées et sites archéologiques de la région :", city:"Sites à découvrir à Chiclayo :",
    nature:"Espaces naturels dans la région :", general:"Quelques lieux à découvrir pendant votre séjour :",
    note:"Les horaires et conditions d'accès peuvent changer ; vérifiez avant la visite.",
    travel:"Les musées et réserves naturelles sont hors de Pimentel et nécessitent un déplacement.",
    more:"Je peux vous indiquer d'autres lieux dans cette catégorie.",
    uncertain:"Certaines adresses doivent encore être confirmées.",
    notfound:"Je n'ai pas encore d'adresse vérifiée pour ce lieu. Je peux proposer d'autres visites." },
};

function detectLanguage(message) {
  const value = normalize(message);
  if (/\b(?:where|nearby|restaurants|museums|places to visit|what to do|nature|beach|food)\b/.test(value)) return "en";
  if (/\b(?:onde|quais|passeios|museus|praias|perto|comer em)\b/.test(value)) return "pt";
  if (/\b(?:ou sont|quels|musees|visiter|pres de|restaurants a|naturel)\b/.test(value)) return "fr";
  return "es";
}

const TOURIST_TOPIC = /\b(?:restaurantes?|restobares?|picanterias?|cevicherias?|cafeterias?|cafes?|comer|almorzar|cenar|desayunar|gastronomia|comida marina|where to eat|places to eat|restaurants?|cafes?|dining|manger|museos?|museums?|museus?|musees?|arqueologi[a-z]*|pir[aá]mides|piramides|huacas?|sitios arqueologicos|nature|naturaleza|natureza|reservas ecologicas|bosques?|senderismo|fauna|paseos?|excursiones?|atractivos?|turisticos?|tourist|sightseeing|places to visit|que hacer|que visitar|donde pasear|visitar|playas?|beaches?|muelle|malecon|malecon|caballitos de totora|atardecer|parques?|mercado modelo|catedral|paseo de las musas|chiclayo|tucume|tumbas reales|chaparri|pomac|sican|bruning)\b/;
const OUTSIDE_DOMAIN = /\b(?:tesis|tarea|ensayo|redacta|redaccion|re[cț]eta|como cocinar|ingredientes|programacion|programar|python|javascript|segunda guerra|presidente|matematicas|politica|codigo fuente|historia universal)\b/;
const BOOKING_TURN = /\b(?:habitacion|habitaciones|alojamiento|cotizacion|reservar habitacion|reserva de habitacion|cambiar fechas|fechas de mi reserva|precio de la habitacion)\b/;
const OWN_SERVICE = /\b(?:tienen|ofrecen|incluye|cuenta con|hay)\b.{0,28}\b(?:restaurante|cafeteria)\b.{0,25}\b(?:en (?:el )?hotel|en (?:el )?hospedaje|en (?:la )?casa huespedes)\b|\b(?:restaurante|cafeteria)\b.{0,30}\b(?:del hotel|del hospedaje|dentro del hotel)\b/;
const MORE = /\b(?:mas|otros?|otras?|otra lista|additional|more|outros|mais|autres|encore)\b/;
const DINING = /\b(?:restaurantes?|restobares?|picanterias?|cevicherias?|cafeterias?|cafes?|comer|almorzar|cenar|desayunar|gastronomia|comida marina|where to eat|places to eat|restaurants?|cafes?|dining|manger)\b/;
const MUSEUMS = /\b(?:museos?|museums?|museus?|musees?|arqueolog|piramides|huaca|huacas|tumbas reales|sipan|sican|tucume|bruning)\b/;
const NATURE = /\b(?:naturaleza|nature|natureza|bosques?|reservas ecologicas|fauna|chaparri|pomac|senderismo)\b/;
const COAST = /\b(?:playa|playas|beach|beaches|muelle|malecon|caballitos|atardecer)\b/;
const CITY = /\b(?:chiclayo|catedral|mercado modelo|musas|parque principal)\b/;
const GENERAL = /\b(?:que visitar|que hacer|atractivos|turistic|lugares para|donde pasear|excursiones|places to visit|sightseeing|tourist|visiter|passeios|paseos)\b/;

export function isTourismInquiry(message) {
  const text = normalize(message);
  if (!text || text.length > 600 || OUTSIDE_DOMAIN.test(text) || BOOKING_TURN.test(text) || OWN_SERVICE.test(text)) return false;
  if (/\b(?:quiero reservar|deseo reservar|cancelar reserva|confirmar reserva|pagar reserva)\b/.test(text)) return false;
  return TOURIST_TOPIC.test(text) ||
    TOURISM_PLACES.some((place) => text.includes(normalize(place.name)));
}

function categoryFor(message) {
  if (DINING.test(message)) return "dining";
  if (MUSEUMS.test(message)) return "museum";
  if (NATURE.test(message)) return "nature";
  if (COAST.test(message)) return "coast";
  if (CITY.test(message)) return "city";
  return "general";
}

function isSpecificPlaceMention(message, item) {
  const name = normalize(item.name);
  const cleanName = name.replace(/^(museo de sitio y |museo de sitio |museo arqueologico nacional |museo nacional |museo |picanteria |santuario historico |reserva ecologica )/, "");
  return message.includes(name) || (cleanName.length >= 8 && message.includes(cleanName));
}

export function formatTourismReply(message) {
  if (!isTourismInquiry(message)) return null;
  const locale = LABELS[detectLanguage(message)];
  const text = normalize(message);
  const kind = categoryFor(text);
  const more = MORE.test(text);
  const specific = TOURISM_PLACES.find((place) => isSpecificPlaceMention(text, place));
  const genericQuestion = GENERAL.test(text) || DINING.test(text) && /(opciones|otros|varios|algunos|cuales|que restaurantes|hay restaurantes|restaurants near)/.test(text);
  let selected;
  if (specific && !genericQuestion && !more) {
    selected = [specific];
  } else if (kind === "general") {
    selected = ["muelle", "playa", "tintorera", "tumbas"].map((id) => TOURISM_PLACES.find((item) => item.id === id));
  } else {
    const candidates = TOURISM_PLACES.filter((place) => place.kind === kind);
    const start = more && candidates.length > 4 ? 4 : 0;
    selected = candidates.slice(start, start + 4);
    if (!selected.length) selected = candidates.slice(0, 4);
  }

  if (!selected.length) return locale.notfound;
  const title = selected.length === 1 ? "" : locale[kind] || locale.general;
  const lines = selected.map((place) => "- " + place.name + " — " + place.address + ".");
  const note = kind === "museum" || kind === "nature" ||
    selected.some((place) => place.kind === "museum" || place.kind === "nature")
    ? locale.travel + " " + locale.note : locale.note;
  return [title, ...lines, note, selected.length > 1 ? locale.more : ""]
    .filter(Boolean).join("\n");
}
