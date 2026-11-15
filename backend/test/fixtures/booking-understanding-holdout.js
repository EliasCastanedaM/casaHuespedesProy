// Synthetic holdout set. Do not copy these phrases into the model instructions.
// Expectations are evaluation criteria, not recorded model performance.
const dates = { state: "collecting", awaiting: "guests", language: "es", check_in: "2026-11-25", check_out: "2026-11-28" };
const party = { ...dates, adults: 3, children: 2, child_ages: [4, 8], pets: 0, state: "quoted" };
export const bookingUnderstandingHoldout = [
  { id: "holdout-couple-typo", message: "iremos mi esposo y yoo", state: dates, intent: "details", language: "es", fields: { adults: 2 } },
  { id: "holdout-family-mixed-numbers", message: "Somos dos mayores, una nena de cuatro y un chico de 8; sin animales", state: dates, intent: "details", language: "es", fields: { adults: 2, children: 2, child_ages: [4, 8], pets: 0 } },
  { id: "holdout-age-repair", message: "Me equivoqué con la edad de la mayor: tiene siete, la pequeña sigue con cuatro", state: party, intent: "correction", language: "es", fields: { child_ages: [4, 7] } },
  { id: "holdout-relative-removal-en", message: "Actually my dad cannot join us anymore", state: party, intent: "correction", language: "en", fields: { adults: 2 } },
  { id: "holdout-family-en", message: "It'll be me, my husband and our little girl, aged four", state: dates, intent: "details", language: "en", fields: { adults: 2, children: 1, child_ages: [4] } },
  { id: "holdout-question-en", message: "Would a family of five fit in one room?", state: party, intents: ["hypothetical", "information"], language: "en", fields: {} },
  { id: "holdout-view-is-question", message: "¿Las habitaciones tienen ventanas hacia la calle?", state: party, intent: "information", language: "es", fields: {} },
  { id: "holdout-pets-en", message: "We are bringing two small dogs as well", state: party, intent: "correction", language: "en", fields: { pets: 2 } },
  { id: "holdout-small-child-own-bed", message: "Para la pequeña queremos su propia cama, aunque tenga cuatro", state: party, intent: "details", language: "es", fields: { young_children_share_bed: false } },
  { id: "holdout-one-night-en", message: "Arriving tomorrow for just one night", state: dates, intent: "details", language: "en", fields: { check_in: "2026-11-16", check_out: "2026-11-17" } },
  { id: "holdout-partial-uncertain", message: "Voy con mi marido y nuestro bebé, todavía no sé si para entonces habrá cumplido un año", state: dates, intents: ["unclear", "details"], language: "es", fields: { adults: 2, children: 1 } },
  { id: "holdout-explicit-independent", message: "Iniciemos una nueva reserva para una sola persona adulta y ninguna mascota ni niño", state: party, intent: "new_request", language: "es", fields: { adults: 1, children: 0, pets: 0 } },
];

export const bookingUnderstandingConversations = [
  { id: "conversation-dates-then-family", turns: [
    { message: "Busco alojamiento mañana y también pasado mañana", intent: "details", fields: {}, proposal: { check_in: "2026-11-16", check_out: "2026-11-18" }, expected: { awaiting: "proposal_confirmation" }, absent: ["check_in", "adults", "children", "pets"] },
    { message: "sí", expected: { check_in: "2026-11-16", check_out: "2026-11-18", awaiting: "guests" }, absent: ["pending_proposal", "adults", "children", "pets"] },
    { message: "mi esposo, yo y nuestra hija de cuatro", intent: "details", fields: { adults: 2, children: 1, child_ages: [4] }, expected: { adults: 2, child_ages: [4], awaiting: "pets" }, absent: ["pets"] },
  ] },
  { id: "conversation-language-and-repair", initial: dates, turns: [
    { message: "My partner and I, with a six-year-old boy", intent: "details", fields: { adults: 2, children: 1, child_ages: [6] }, language: "en", expected: { language: "en", adults: 2, awaiting: "pets" } },
    { message: "Perdón, además viene nuestra hija de tres; serían dos niños", intent: "correction", fields: { children: 2, child_ages: [6, 3] }, language: "es", expected: { language: "es", adults: 2, children: 2, child_ages: [6, 3], awaiting: "pets" } },
    { message: "¿Cuánto cambiaría si viniera mi hermano también?", intent: "hypothetical", fields: {}, expected: { adults: 2, children: 2, child_ages: [6, 3] } },
  ] },
  { id: "conversation-new-request-isolation", initial: party, turns: [
    { message: "Quisiera hacer otra reserva del 10 al 12 de diciembre de 2026", intent: "new_request", fields: { check_in: "2026-12-10", check_out: "2026-12-12" }, expected: { check_in: "2026-12-10", check_out: "2026-12-12", awaiting: "guests" }, absent: ["adults", "children", "child_ages", "pets"] },
    { message: "solo yo; no vienen menores y tampoco traigo mascotas", intent: "details", fields: { adults: 1, children: 0, pets: 0 }, expected: { adults: 1, children: 0, pets: 0 } },
  ] },
];
