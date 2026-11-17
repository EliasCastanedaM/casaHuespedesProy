import { TARIFF_PROPOSAL } from '../../config/tariffProposal.js';

const DAY = 86_400_000;
const approved = value => value?.status === 'approved' &&
  typeof value.confirmation_reference === 'string' && value.confirmation_reference.trim().length > 0;

export function isTariffProposalActive() { return approved(TARIFF_PROPOSAL); }

export function hasConfirmedTariffForCategory(slug) {
  const mapping = Object.hasOwn(TARIFF_PROPOSAL.category_mapping,slug) ? TARIFF_PROPOSAL.category_mapping[slug] : null;
  return isTariffProposalActive() && mapping?.status === 'approved' &&
    Object.hasOwn(TARIFF_PROPOSAL.tariffs,mapping.tariff_key);
}

function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const n = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0,10) === value ? n : null;
}

function composition(adults, childAges, config) {
  if (!Number.isInteger(adults) || adults < 1 || !Array.isArray(childAges) ||
      childAges.some(age => !Number.isInteger(age) || age < 0 || age > 17)) {
    throw new Error('Indica al menos un adulto acompañante y edades válidas para todos los niños.');
  }
  const pricedAdults = adults + childAges.filter(age => age >= config.adult_rate_from_age).length;
  const chargedChildren = childAges.filter(age => age >= config.child_min_age && age <= config.child_max_age).length;
  return { pricedAdults, chargedChildren, tariffPlaces: pricedAdults + chargedChildren,
    totalGuests: adults + childAges.length };
}

function baseAmount(tariffKey, adults, childAges, config) {
  const tariff = Object.hasOwn(config.tariffs,tariffKey) ? config.tariffs[tariffKey] : null;
  if (!tariff) throw new Error('La categoría no tiene tarifa propuesta definida.');
  const party = composition(adults, childAges, config);
  if (party.tariffPlaces > tariff.capacity) throw new Error('El grupo excede la capacidad tarifaria.');
  return { tariff, party,
    adultAmount: config.adult_amount * party.pricedAdults,
    childAmount: config.child_amount * party.chargedChildren,
    base: Math.max(tariff.minimum, config.adult_amount * party.pricedAdults + config.child_amount * party.chargedChildren) };
}

function adjusted(amount, percent) {
  // Integer soles and integer percentages; round the complete nightly amount,
  // not each person/minimum separately. Positive .5 rounds upward.
  return Math.floor((amount * percent + 50) / 100);
}

// Administrative simulation only. It never checks or promises room availability,
// never writes to a database and never creates a quote usable by the booking flow.
export function previewTariff({ tariff_key, adults, child_ages = [], nights = 1, season = 'regular' }) {
  if (!Number.isInteger(nights) || nights < 1 || nights > 365) throw new Error('Cantidad de noches inválida.');
  if (!['regular','high','low'].includes(season)) throw new Error('Temporada desconocida.');
  const result = baseAmount(tariff_key, adults, child_ages, TARIFF_PROPOSAL);
  const amount = adjusted(result.base, TARIFF_PROPOSAL.seasons[season].percent);
  return { status: 'pending_confirmation', simulation_only: true, availability_checked: false,
    tariff_key, season, guests: result.party.totalGuests, tariff_places: result.party.tariffPlaces,
    base_amount: result.base, nightly_amount: amount, nights, total_amount: amount * nights };
}

function percentForDate(date, seasons) {
  if (!approved(seasons) || seasons.calendar_status !== 'approved') return 100;
  const priorities = { low: 1, regular: 2, high: 3 };
  const matches = seasons.periods.filter(period => period.status === 'approved' &&
    dateNumber(period.start_date) !== null && dateNumber(period.end_date) !== null &&
    period.start_date <= date && period.end_date >= date &&
    ['regular','high','low'].includes(period.season));
  matches.sort((a,b) => priorities[b.season] - priorities[a.season]);
  return matches.length ? seasons[matches[0].season].percent : 100;
}

// Pure activation adapter. The runtime wrapper below always passes the frozen,
// server-owned proposal, never a request body or conversation context.
// An unmapped category has no new price and must go to commercial review.
export function calculateConfirmedTariff(category, state, config = TARIFF_PROPOSAL) {
  if (!approved(config)) return null;
  const mapping = Object.hasOwn(config.category_mapping,category.slug) ? config.category_mapping[category.slug] : null;
  if (mapping?.status !== 'approved' || !mapping.tariff_key) return null;
  if (state.children == null || !Array.isArray(state.child_ages) || state.children !== state.child_ages.length) return null;
  const from = dateNumber(state.check_in), to = dateNumber(state.check_out);
  if (from === null || to === null || to <= from || (to-from)/DAY > 365) return null;
  let result;
  try { result = baseAmount(mapping.tariff_key,state.adults,state.child_ages,config); }
  catch { return null; }
  if (result.party.tariffPlaces > Number(category.capacity)) return null;
  const nightly = [];
  for (let day = from; day < to; day += DAY) {
    const date = new Date(day).toISOString().slice(0,10);
    const percent = percentForDate(date,config.seasons);
    nightly.push({ date, percent, amount: adjusted(result.base,percent) });
  }
  return { version: config.version, ...result, nightly,
    total_amount: nightly.reduce((sum,row) => sum+row.amount,0),
    min_nightly_amount: Math.min(...nightly.map(row=>row.amount)),
    max_nightly_amount: Math.max(...nightly.map(row=>row.amount)),
    signature: JSON.stringify([config.version,mapping,result.tariff,config.adult_amount,
      config.child_amount,config.adult_rate_from_age,config.seasons,nightly]) };
}

export function getConfirmedTariff(category,state) {
  return calculateConfirmedTariff(category,state,TARIFF_PROPOSAL);
}

export function getTariffProposalOverview() {
  const compositions = [[1,[]],[2,[]],[1,[6]],[2,[7]],[3,[]],[2,[5,8]],
    [3,[6]],[4,[]],[3,[5,8]],[4,[6]],[5,[]]];
  return {
    version: TARIFF_PROPOSAL.version, source: TARIFF_PROPOSAL.source,
    status: TARIFF_PROPOSAL.status, active: isTariffProposalActive(),
    adult_amount: TARIFF_PROPOSAL.adult_amount, child_amount: TARIFF_PROPOSAL.child_amount,
    seasons_status: TARIFF_PROPOSAL.seasons.status, calendar_status: TARIFF_PROPOSAL.seasons.calendar_status,
    category_mapping: TARIFF_PROPOSAL.category_mapping,
    note: isTariffProposalActive()
      ? 'La base autorizada se aplica solo a correspondencias confirmadas. Las temporadas se autorizan por separado.'
      : 'Propuesta pendiente de tu confirmación. Las tarifas vigentes continúan activas.',
    columns: ['1A','2A','1A+1N','2A+1N','3A','2A+2N','3A+1N','4A','3A+2N','4A+1N','5A'],
    seasons: ['regular','high','low'].map(key=>({ key, ...TARIFF_PROPOSAL.seasons[key],
      rows: Object.entries(TARIFF_PROPOSAL.tariffs).map(([tariff_key,tariff])=>({
        tariff_key, ...tariff,
        amounts: compositions.map(([adults,child_ages])=>{
          try { return previewTariff({tariff_key,adults,child_ages,season:key}).nightly_amount; }
          catch { return null; }
        }),
      })),
    })),
  };
}
