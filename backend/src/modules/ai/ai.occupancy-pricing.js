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
  const ages = state.child_ages || [];
  const pets = Number(state.pets);
  const guests = adults + children;
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 ||
      !Number.isInteger(pets) || pets < 0 || ages.length !== children ||
      ages.some((age) => !Number.isInteger(age) || age < 0 || age > 17) ||
      guests > Number(category.capacity) || guests >= 8) return null;
  const checkIn = Date.parse(state.check_in + "T00:00:00Z");
  const checkOut = Date.parse(state.check_out + "T00:00:00Z");
  const nights = (checkOut - checkIn) / 86_400_000;
  if (!Number.isInteger(nights) || nights < 1 || nights > 365) return null;
  const rates = category.occupancy_rates || {};
  const pricedAdults = adults + ages.filter((age) => age >= 9).length;
  const discountedChildren = ages.filter((age) => age >= 5 && age <= 8).length;
  const adultRate = cents(rates[pricedAdults]);
  const singleRate = cents(rates[1]);
  const samePartyAdultRate = cents(rates[guests]);
  if (![adultRate, singleRate, samePartyAdultRate].every((value) => Number.isSafeInteger(value) && value > 0) || adultRate < singleRate) return null;
  const childSupplement = Math.round((adultRate - singleRate) / 2) * discountedChildren;
  const raw = adultRate + childSupplement;
  const lodging = Math.min(raw, samePartyAdultRate);
  const petNightly = pets * 2000;
  return {
    category_slug: category.slug, category_name: category.name, capacity: Number(category.capacity),
    guests, priced_adults: pricedAdults, discounted_children: discountedChildren,
    adult_base_amount: adultRate / 100, child_supplement_amount: childSupplement / 100,
    child_cap_applied: raw > samePartyAdultRate,
    nightly_amount: lodging / 100, pet_nightly_amount: petNightly / 100,
    total_nightly_amount: (lodging + petNightly) / 100,
    nights, total_amount: (lodging + petNightly) * nights / 100,
    check_in: state.check_in, check_out: state.check_out,
    pets, child_bed_review_required: ages.some((age) => age <= 4),
    rate_signature: JSON.stringify([category.slug, category.occupancy_rates]),
  };
}

export function selectOccupancyQuote(categories, state, { cheaper = false, explicitCategory = false } = {}) {
  const guests = Number(state.adults) + Number(state.children);
  const active = categories.filter((c) => c.is_active !== false && Number(c.capacity) >= guests);
  if (!active.length || guests >= 8) return { quote: null, reason: "multiple_rooms" };
  const minimumCapacity = Math.min(...active.map((c) => Number(c.capacity)));
  let fitting = active.filter((c) => Number(c.capacity) === minimumCapacity);
  if (explicitCategory && state.category_slug) {
    const requested = active.find((c) => c.slug === state.category_slug);
    if (requested) fitting = [requested];
    else return { quote: null, reason: "category_capacity" };
  } else if (state.bed_preference === "separate" && minimumCapacity === 2) {
    fitting = fitting.filter((c) => c.slug === "doble");
  } else if (state.bed_preference === "matrimonial" && minimumCapacity === 2) {
    fitting = fitting.filter((c) => c.slug !== "doble");
  }
  if (state.preferences) {
    const requested = clean(state.preferences).split(";").map((v) => v.trim()).filter(Boolean);
    fitting = fitting.filter((c) => requested.every((preference) =>
      clean([c.name, c.description, c.bed_description].join(" ")).includes(preference)));
  }
  let quotes = fitting.map((c) => quoteForCategory(c, state)).filter(Boolean);
  if (Number(state.max_nightly_budget) > 0) quotes = quotes.filter((q) => q.total_nightly_amount <= Number(state.max_nightly_budget));
  if (!quotes.length) return { quote: null, reason: state.max_nightly_budget ? "budget" : "rates_unavailable" };
  const lower = cheaper || state.price_preference === "lower";
  quotes.sort((a, b) => (lower ? 1 : -1) * (a.total_nightly_amount - b.total_nightly_amount) ||
    (a.category_slug === "matrimonial-ejecutiva" ? -1 : b.category_slug === "matrimonial-ejecutiva" ? 1 : a.category_slug.localeCompare(b.category_slug)));
  const quote = quotes[0];
  if (cheaper && state.pricing_quote && quote.total_nightly_amount >= state.pricing_quote.total_nightly_amount) {
    return { quote, reason: "no_lower_price" };
  }
  return { quote, reason: null };
}

export function formatOccupancyQuote(quote, language = "es", { noLowerPrice = false } = {}) {
  if (noLowerPrice) return ({
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
  return ({
    es: "Para tu grupo, te recomiendo " + quote.category_name + ". El alojamiento cuesta " + money(quote.nightly_amount) + " por noche. Total por " + quote.nights + " noche(s): " + money(quote.total_amount) + "." + petNote + " La disponibilidad debe confirmarla nuestro equipo. ¿Deseas que solicitemos la confirmación para esas fechas?",
    en: "For your group, I recommend " + quote.category_name + " at " + money(quote.nightly_amount) + " per night. Total for " + quote.nights + " night(s): " + money(quote.total_amount) + "." + petNote + " Our team must confirm availability. Shall I request confirmation?",
    pt: "Para o grupo, recomendo " + quote.category_name + " por " + money(quote.nightly_amount) + " por noite. Total de " + quote.nights + " noite(s): " + money(quote.total_amount) + "." + petNote + " A equipe deve confirmar a disponibilidade. Deseja solicitar a confirmação?",
    fr: "Pour votre groupe, je recommande " + quote.category_name + " à " + money(quote.nightly_amount) + " par nuit. Total pour " + quote.nights + " nuit(s) : " + money(quote.total_amount) + "." + petNote + " L'équipe doit confirmer la disponibilité. Souhaitez-vous demander confirmation ?",
  })[language] || formatOccupancyQuote(quote, "es");
}
