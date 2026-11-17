// Server-owned proposal. Neither a guest message, request body nor an existing
// administrative rate/season decision can activate this release.
const proposal = {
  version: 'tarifario-pdf-2026-11-15',
  source: 'CASA HUESPEDES TARIFARIO.pdf · 15/11/2026 · páginas 1–3',
  status: 'pending_confirmation',
  confirmation_reference: null,
  adult_amount: 60,
  child_amount: 30,
  child_min_age: 5,
  child_max_age: 8,
  adult_rate_from_age: 9, // Retained previously approved policy, not redefined by the PDF.
  tariffs: {
    matrimonial: { name: 'Matrimonial', minimum: 100, capacity: 2 },
    doble: { name: 'Doble — 2 camas', minimum: 100, capacity: 2 },
    triple: { name: 'Triple — 3 camas', minimum: 140, capacity: 3 },
    familiar: { name: 'Familiar', minimum: 180, capacity: 5 },
  },
  category_mapping: {
    matrimonial: { tariff_key: 'matrimonial', status: 'pending_confirmation' },
    'matrimonial-ejecutiva': { tariff_key: null, status: 'pending_definition' },
    doble: { tariff_key: 'doble', status: 'pending_confirmation' },
    triple: { tariff_key: 'triple', status: 'pending_confirmation' },
    familiar: { tariff_key: null, status: 'pending_definition', proposed_tariff_key: 'familiar' },
    'familiar-2': { tariff_key: null, status: 'pending_definition', proposed_tariff_key: 'familiar' },
  },
  seasons: {
    status: 'pending_confirmation',
    confirmation_reference: null,
    rounding: 'nearest_sol_half_up',
    regular: { name: 'Regular', percent: 100, proposed_dates: 'Marzo, agosto y 1–14 de diciembre.' },
    high: { name: 'Alta', percent: 150, proposed_dates: 'Enero, febrero, julio, 15–31 de diciembre, Semana Santa y feriados largos.' },
    low: { name: 'Baja', percent: 70, proposed_dates: 'Abril, mayo, junio, septiembre, octubre y noviembre; excluye feriados y eventos especiales.' },
    calendar_status: 'pending_confirmation',
    // Exact annual dates must be confirmed. The month descriptions above never
    // select a live price. Approved periods use inclusive start_date/end_date.
    periods: [],
  },
};

function deepFreeze(value) {
  for (const item of Object.values(value)) if (item && typeof item === 'object') deepFreeze(item);
  return Object.freeze(value);
}

export const TARIFF_PROPOSAL = deepFreeze(proposal);
