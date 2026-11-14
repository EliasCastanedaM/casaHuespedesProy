import { CHILD_POLICY_VERSION, CHILD_NIGHTLY_SUPPLEMENT, guestComposition, categoryBedPlan } from '../rooms/guestComposition.js';
import { normalizeRoomPreferences, collectRoomPreferences, hasRoomPreferences, roomPreferenceMatch, roomFeatures, roomPreferenceLabel } from "../rooms/roomPreferences.js";

// All monetary operations use integer cents. These details stay in the backend.
const clean = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const cents = (n) => Math.round(Number(n) * 100);
const money = (n) => "S/ " + Number(n).toFixed(2);

export function isCheaperRequest(message) {
  return /\b(?:mas (?:barat[oa]|economic[oa])|menos (?:car[oa]|costos[oa])|bajar (?:el )?precio|otra mas barata|cheaper|less expensive|mais barato|moins cher)\b/.test(clean(message));
}

export function isPriceVariationInquiry(message) {
  const s = clean(message);
  return /\b(?:precio|precios|tarifa|tarifas|price|prices)\b/.test(s) &&
    /\b(?:persona|personas|huespedes|people|guests)\b/.test(s) &&
    /\b(?:cambia|cambian|diferencia|diferentes|varia|varian|depende|dependen|different|vary)\b/.test(s);
}

export function priceVariationReply() {
  return "El precio varía según la categoría elegida y la cantidad de huéspedes. Cuando viajan niños, también tomamos en cuenta sus edades para calcular el importe de la estadía. 😊";
}

export function acceptsQuote(message) {
  return /^(?:si(?: por favor)?|si quiero|si quiero reservar|si reservemos|si esta bien|esta bien|perfecto|de acuerdo|me gusta|acepto|confirmo|dale|esa|esa esta bien|quiero esa|quiero reservar|reservar|reserva|ok|okay|yes|yes please|book it|sim|oui)[.!\s]*$/.test(clean(message).replace(/[¡!¿?,]/g, "").trim());
}

export function hasOccupancyRates(categories) {
  return categories.some((c) => c.occupancy_rates && Object.keys(c.occupancy_rates).length > 0);
}

export function processingQuoteReply(language = "es") {
  return ({
    es: "Estoy revisando qué categoría se ajusta mejor a tu grupo y calculando el importe de la estadía. En un momento te respondo. 😊",
    en: "I'm checking which room category best fits your group and calculating the total for your stay. I'll reply shortly. 😊",
    pt: "Estou verificando a categoria mais adequada ao grupo e calculando o valor da estadia. Já respondo. 😊",
    fr: "Je vérifie la catégorie adaptée à votre groupe et calcule le montant du séjour. Je vous réponds dans un instant. 😊",
  })[language] || processingQuoteReply("es");
}

export function quoteForCategory(category, state) {
  const adults = Number(state.adults);
  const children = Number(state.children);
  const ages = Array.isArray(state.child_ages) ? state.child_ages : [];
  const pets = Number(state.pets);
  const guests = adults + children;
  const party = guestComposition(state);
  const bedPlan = categoryBedPlan(category, state);
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 ||
      !Number.isInteger(pets) || pets < 0 || ages.length !== children ||
      ages.some((age) => !Number.isInteger(age) || age < 0 || age > 17) ||
      !party || !bedPlan.fits || guests >= 8) return null;
  const checkIn = Date.parse(state.check_in + "T00:00:00Z");
  const checkOut = Date.parse(state.check_out + "T00:00:00Z");
  const nights = (checkOut - checkIn) / 86_400_000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 365) return null;
  const rates = category.occupancy_rates || {};
  const pricedAdults = party.pricedAdults;
  const discountedChildren = party.supplemented;
  const adultRate = cents(rates[pricedAdults]);
  if (!Number.isSafeInteger(adultRate) || adultRate <= 0) return null;
  const childSupplement = cents(CHILD_NIGHTLY_SUPPLEMENT) * discountedChildren;
  const lodging = adultRate + childSupplement;
  const petNightly = pets * 2000;
  return {
    category_slug: category.slug, category_name: category.name, capacity: Number(category.capacity),
    guests, priced_adults: pricedAdults, discounted_children: discountedChildren,
    adult_base_amount: adultRate / 100, child_supplement_amount: childSupplement / 100,
    child_cap_applied: false,
    child_policy_version: CHILD_POLICY_VERSION,
    shared_children: bedPlan.shared_children, sharing_assumed: bedPlan.sharing_assumed,
    required_bed_places: bedPlan.required_places,
    parent_bed_size:bedPlan.parent_bed_size,parents_share_one_half_bed:bedPlan.parents_share_one_half_bed, bed_description: category.bed_description || null,
    nightly_amount: lodging / 100, pet_nightly_amount: petNightly / 100,
    total_nightly_amount: (lodging + petNightly) / 100,
    nights, total_amount: (lodging + petNightly) * nights / 100,
    check_in: state.check_in, check_out: state.check_out,
    pets, child_bed_review_required: ages.some((age) => age <= 4),
    rate_signature: JSON.stringify([CHILD_POLICY_VERSION, category.slug, category.occupancy_rates, category.capacity, category.bed_description]),
  };
}

export function selectOccupancyQuote(categories, state, { cheaper = false, explicitCategory = false } = {}) {
  const guests = Number(state.adults) + Number(state.children);
  const active = categories.filter(c => c.is_active !== false && categoryBedPlan(c,state).fits);
  if (!active.length || guests >= 8) return { quote: null, reason: "multiple_rooms" };
  let fitting = active;
  if (explicitCategory && state.category_slug) {
    const requested = active.find(c => c.slug === state.category_slug);
    if (requested) fitting = [requested];
    else return { quote: null, reason: "category_capacity" };
  }
  const bedPreference = list => list.filter(c => {
    const plan=categoryBedPlan(c,state);
    if(state.bed_preference === 'separate' && plan.required_places <= 2) return c.slug === 'doble';
    if(state.bed_preference === 'matrimonial' && plan.required_places <= 2) return c.slug !== 'doble';
    return true;
  });
  fitting=bedPreference(fitting);
  const categoryOrder=['matrimonial','matrimonial-ejecutiva','doble','triple','familiar','familiar-2'];
  const rank=(a,b)=>Number(a.capacity)-Number(b.capacity)||Number(a.price_per_night)-Number(b.price_per_night)||categoryOrder.indexOf(a.slug)-categoryOrder.indexOf(b.slug);
  const availableTiers=list=>list.filter(c=>!Array.isArray(c.available_rooms)||c.available_rooms.length>0).sort(rank).slice(0,3);
  if(!explicitCategory)fitting=availableTiers(fitting);
  const preferences = normalizeRoomPreferences(state.room_preferences || collectRoomPreferences(state.preferences));
  const hasAvailability = active.some(c=>Array.isArray(c.available_rooms));
  const selectRooms = (list,prefs) => list.map(c=>({
    ...c,
    matching_rooms: Array.isArray(c.available_rooms)
      ? c.available_rooms.filter(room=>roomPreferenceMatch(room,prefs,{allowUnverifiedWindow:true})) : null,
  })).filter(c=>c.matching_rooms === null || c.matching_rooms.length>0);
  let candidates = selectRooms(fitting,preferences);
  // In isolated calculator use, metadata may be absent. Runtime always supplies
  // physical-room availability and never infers a view from a whole category.
  if(!hasAvailability && hasRoomPreferences(preferences)) {
    const requested = roomPreferenceLabel(preferences).split(";").map(v=>v.trim()).filter(Boolean);
    candidates=candidates.filter(c=>requested.every(p=>clean([c.name,c.description,c.bed_description].join(" ")).includes(p)));
  }
  let fallback = false;
  if(!candidates.length && hasAvailability) {
    fallback=true;
    const relaxed = preferences.near_window ? {near_window:true} : {};
    const alternatives=availableTiers(bedPreference(active));
    candidates=selectRooms(alternatives,preferences);
    if(!candidates.length)candidates=selectRooms(alternatives,relaxed);
  }
  let quotes=candidates.map(c=>{
    const quote=quoteForCategory(c,state);
    if(!quote)return null;
    if(c.matching_rooms) {
      const room=c.matching_rooms.find(r=>roomFeatures(r).near_window===true)||c.matching_rooms[0];
      const features=roomFeatures(room);
      const effective=fallback ? normalizeRoomPreferences({view:features.view,near_window:preferences.near_window}) : preferences;
      Object.assign(quote,{
        room_preferences:effective,
        preference_fallback:fallback,
        requested_room_preferences:preferences,
        actual_view:features.view,
        sea_second_row:features.view==="sea" && /segunda fila/.test(clean(room.view_type)),
        window_verification_required:preferences.near_window===true && features.near_window===null,
        internal_assignment:{room_id:Number(room.id),room_number:room.room_number||null,view_type:room.view_type||null},
      });
    }
    return quote;
  }).filter(Boolean);
  if (Number(state.max_nightly_budget) > 0) quotes = quotes.filter((q) => q.total_nightly_amount <= Number(state.max_nightly_budget));
  if (!quotes.length) return { quote: null, reason: state.max_nightly_budget ? "budget" : hasAvailability ? "no_availability" : "rates_unavailable" };
  const order=['matrimonial','matrimonial-ejecutiva','doble','triple','familiar','familiar-2'];
  quotes.sort((a,b)=>a.capacity-b.capacity || a.total_nightly_amount-b.total_nightly_amount ||
    order.indexOf(a.category_slug)-order.indexOf(b.category_slug));
  const quote = quotes[0];
  if (cheaper && state.pricing_quote && quote.total_nightly_amount >= state.pricing_quote.total_nightly_amount) {
    return { quote, reason: "no_lower_price" };
  }
  return { quote, alternatives: explicitCategory ? [] : quotes.slice(1,3), reason: null };
}

export function formatOccupancyQuote(quote, language = "es", { noLowerPrice = false, alternatives = [] } = {}) {
  if (alternatives.length && !quote.preference_fallback && !quote.window_verification_required) return formatQuoteOptions([quote,...alternatives],language);
  if (noLowerPrice && !quote.preference_fallback) return ({
    es: "Para tu grupo, la opción de capacidad adecuada más económica mantiene el precio de " + money(quote.total_nightly_amount) + " por noche. Nuestro equipo puede evaluar otra alternativa para esas fechas. ¿Deseas que lo consulte?",
    en: "The lowest-priced category that fits your group remains " + money(quote.total_nightly_amount) + " per night. Would you like our team to review other options?",
    pt: "A opção mais econômica com capacidade para o grupo mantém o valor de " + money(quote.total_nightly_amount) + " por noite. Deseja que a equipe avalie outra alternativa?",
    fr: "La catégorie la moins chère adaptée au groupe reste à " + money(quote.total_nightly_amount) + " par nuit. Souhaitez-vous que l'équipe étudie une autre solution ?",
  })[language] || formatOccupancyQuote(quote, "es", { noLowerPrice });
  const petNote = quote.pets > 0 ? ({
    es: " El total incluye " + quote.pets + " mascota(s); su admisión requiere autorización del hospedaje.",
    en: " The total includes " + quote.pets + " pet(s); admission requires hotel approval.",
    pt: " O total inclui " + quote.pets + " animal(is); a admissão exige autorização.",
    fr: " Le total inclut " + quote.pets + " animal(aux), sous réserve d'autorisation.",
  })[language] : "";
  const view = (quote.actual_view ? roomPreferenceLabel({view:quote.actual_view},language) : "") +
    (quote.sea_second_row ? ({es:" desde segunda fila",en:" from the second row",pt:" da segunda fileira",fr:" depuis la deuxième rangée"})[language] || "" : "");
  const requested=roomPreferenceLabel(quote.requested_room_preferences,language);
  const prefix=quote.preference_fallback ? ({
    es:"Para esas fechas, la opción solicitada" + (requested ? " con " + requested : "") + " no figura disponible en nuestro registro. Te propongo una alternativa de capacidad adecuada" + (view ? " con " + view : "") + ". ",
    en:"The requested option" + (requested ? " with " + requested : "") + " is not available in our records for those dates. Here is a suitable alternative" + (view ? " with " + view : "") + ". ",
    pt:"A opção solicitada não consta disponível para essas datas. Proponho uma alternativa com capacidade adequada" + (view ? " e " + view : "") + ". ",
    fr:"L'option demandée n'est pas disponible dans notre registre à ces dates. Voici une autre catégorie adaptée" + (view ? ", " + view : "") + ". ",
  })[language] || "" : "";
  const detail = !quote.preference_fallback && view && hasRoomPreferences(quote.room_preferences) ? ({es:" Vista: ",en:" View: ",pt:" Vista: ",fr:" Vue : "})[language]+view+"." : "";
  const windowNote=quote.window_verification_required ? ({
    es:" Guardé tu preferencia de estar cerca de una ventana; nuestro equipo debe verificar esa ubicación antes de confirmar.",
    en:" Your preference to be near a window is saved and must be checked by our team before confirmation.",
    pt:" A preferência por ficar perto de uma janela foi registrada e será verificada pela equipe.",
    fr:" Votre souhait d'être près d'une fenêtre est enregistré et doit être vérifié par l'équipe.",
  })[language] || "" : "";
  const sharingNote=sharingCondition(quote,language)+parentBedCondition(quote,language);
  return prefix + ({
    es: "Para tu grupo, te recomiendo " + quote.category_name + ". El alojamiento cuesta " + money(quote.nightly_amount) + " por noche. Total por " + quote.nights + " noche(s): " + money(quote.total_amount) + "." + detail + petNote + windowNote + sharingNote + " La disponibilidad debe confirmarla nuestro equipo. ¿Deseas que solicitemos la confirmación para esas fechas?",
    en: "For your group, I recommend " + quote.category_name + " at " + money(quote.nightly_amount) + " per night. Total for " + quote.nights + " night(s): " + money(quote.total_amount) + "." + detail + petNote + windowNote + sharingNote + " Our team must confirm availability. Shall I request confirmation?",
    pt: "Para o grupo, recomendo " + quote.category_name + " por " + money(quote.nightly_amount) + " por noite. Total de " + quote.nights + " noite(s): " + money(quote.total_amount) + "." + detail + petNote + windowNote + sharingNote + " A equipe deve confirmar a disponibilidade. Deseja solicitar a confirmação?",
    fr: "Pour votre groupe, je recommande " + quote.category_name + " à " + money(quote.nightly_amount) + " par nuit. Total pour " + quote.nights + " nuit(s) : " + money(quote.total_amount) + "." + detail + petNote + windowNote + sharingNote + " L'équipe doit confirmer la disponibilité. Souhaitez-vous demander confirmation ?",
  })[language] || formatOccupancyQuote(quote, "es");
}


function sharingCondition(quote,language) {
  if(!quote.shared_children)return '';
  return ({
    es:' El importe supone que '+quote.shared_children+' niño(s) de hasta 4 años comparte(n) la cama de '+quote.parent_bed_size+' plazas con sus padres, sin cama adicional; el equipo debe confirmar esta distribución.',
    en:' This amount assumes '+quote.shared_children+' child(ren) aged 4 or under share the parent bed with their parents, without an extra bed; our team must confirm this arrangement.',
    pt:' O valor considera '+quote.shared_children+' criança(s) de até 4 anos compartilhando a cama dos pais, sem cama extra; a equipe deve confirmar a distribuição.',
    fr:' Ce montant suppose que '+quote.shared_children+' enfant(s) de 4 ans ou moins partagent le lit de leurs parents, sans lit supplémentaire ; notre équipe doit confirmer cette disposition.',
  })[language] || sharingCondition(quote,'es');
}
function formatQuoteOptions(quotes,language='es') {
  const labels={
    es:{intro:'Estas son las opciones que se ajustan a tu grupo, de la más básica a las siguientes categorías:',night:'por noche',total:'Total',nights:'noche(s)',note:'Nuestro equipo debe confirmar disponibilidad y distribución de camas. ¿Cuál prefieres?'},
    en:{intro:'These options fit your group, starting with the most basic category:',night:'per night',total:'Total',nights:'night(s)',note:'Our team must confirm availability and sleeping arrangements. Which would you prefer?'},
    pt:{intro:'Estas opções atendem ao grupo, começando pela categoria mais básica:',night:'por noite',total:'Total',nights:'noite(s)',note:'A equipe deve confirmar a disponibilidade e as camas. Qual prefere?'},
    fr:{intro:'Voici les options adaptées au groupe, de la catégorie la plus simple aux suivantes :',night:'par nuit',total:'Total',nights:'nuit(s)',note:'Notre équipe doit confirmer la disponibilité et les couchages. Laquelle préférez-vous ?'},
  }[language];
  if(!labels)return formatQuoteOptions(quotes,'es');
  const rows=quotes.map((q,i)=>{
    const shared=q.shared_children ? ({
      es:' Niño(s) compartiendo la cama de '+q.parent_bed_size+' plazas con sus padres, sin cama adicional.',
      en:' Young child(ren) share the parent bed with their parents, without an extra bed.',
      pt:' Criança(s) compartilham a cama dos pais, sem cama extra.',
      fr:' Les jeunes enfants partagent le lit de leurs parents, sans lit supplémentaire.',
    })[language] : '';
    const view=hasRoomPreferences(q.room_preferences)&&q.actual_view ? ' · '+roomPreferenceLabel({view:q.actual_view},language) : '';
    return (i+1)+') '+q.category_name+(q.bed_description?' · '+q.bed_description:'')+
      view+' · '+money(q.total_nightly_amount)+' '+labels.night+'. '+labels.total+' '+q.nights+' '+labels.nights+': '+money(q.total_amount)+'.'+shared+parentBedCondition(q,language);
  });
  const pet=quotes[0].pets>0 ? ({es:' El total incluye mascotas; su admisión requiere autorización.',en:' The total includes pets, subject to hotel approval.',pt:' O total inclui animais, sujeitos a autorização.',fr:' Le total inclut les animaux, sous réserve d’autorisation.'})[language] : '';
  return [labels.intro,...rows,pet.trim(),labels.note].filter(Boolean).join('\n');
}

function parentBedCondition(quote,language='es') {
  if(!quote.parents_share_one_half_bed)return '';
  return ({
    es:' Esta opción supone que los dos padres comparten una cama de 1½ plazas; las camas restantes son para quienes necesiten cama propia. El equipo confirmará la distribución.',
    en:' This option assumes both parents share one 1½-plaza bed; the remaining beds are for guests needing their own bed. Our team must confirm the arrangement.',
    pt:' Esta opção considera os dois pais compartilhando uma cama de 1½ praça; as outras camas são para quem precisar de cama própria. A equipe confirmará a distribuição.',
    fr:' Cette option suppose que les deux parents partagent un lit de 1½ place ; les autres lits sont destinés aux occupants souhaitant leur propre lit. Notre équipe confirmera la disposition.',
  })[language] || parentBedCondition(quote,'es');
}
