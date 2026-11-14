// Shared by quoting, administrative approval and transactional booking. Guest
// headcount is never reduced; this models existing sleeping places separately.
export const CHILD_POLICY_VERSION = 'children-2026-11-14';
export const CHILD_NIGHTLY_SUPPLEMENT = 20;

export function guestComposition(state = {}) {
  const adults = Number(state.adults);
  const children = Number(state.children);
  const ages = state.child_ages ?? (children === 0 ? [] : null);
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0 ||
      !Array.isArray(ages) || ages.length !== children ||
      ages.some(age => !Number.isInteger(age) || age < 0 || age > 17)) return null;
  return { adults, children, ages, total: adults + children,
    young: ages.filter(age => age <= 4).length,
    supplemented: ages.filter(age => age >= 5 && age < 9).length,
    pricedAdults: adults + ages.filter(age => age >= 9).length };
}

export function bedInventory(category = {}) {
  const text = String(category.bed_description || '').toLowerCase()
    .replace(/½/g, ' 1/2').replace(/\s+/g, ' ').trim();
  const beds = { double: 0, single: 0, known: false };
  // Both a 1½-plaza and a 1-plaza bed provide one independent sleeping place.
  const pattern = /(\d+)\s+camas?\s+de\s+(2|1(?:\s*1\/2|[.,]5)?)\s+plazas?/g;
  let match;
  while ((match = pattern.exec(text))) {
    beds.known = true;
    beds[match[2] === '2' ? 'double' : 'single'] += Number(match[1]);
  }
  return { ...beds, places: beds.double * 2 + beds.single };
}

export function categoryBedPlan(category, state, { allowAssumedSharing = true } = {}) {
  const party = guestComposition(state);
  if (!party) return { fits: false, reason: 'composition_incomplete' };
  const beds = bedInventory(category);
  const declared = Number(category.capacity);
  if (!Number.isInteger(declared) || declared < 1) return { fits: false, reason: 'capacity_unknown' };
  // Do not raise an administratively registered capacity from a bed description.
  const places = beds.known ? Math.min(declared, beds.places) : declared;
  const sharingAllowed = state.young_children_share_bed !== false &&
    (allowAssumedSharing || state.young_children_share_bed === true);
  // The owner permits at most two young children sharing with their parents.
  // A confirmed double bed is necessary; do not infer sharing on a 1½ bed.
  const shared = sharingAllowed && beds.double > 0 ? Math.min(2, party.young) : 0;
  const required = party.total - shared;
  return { fits: required <= places, required_places: required, shared_children: shared,
    sharing_assumed: shared > 0 && state.young_children_share_bed !== true,
    available_places: places, total_guests: party.total, beds,
    reason: required <= places ? null : 'insufficient_beds' };
}

export function minimumRequiredBedPlaces(state) {
  const party = guestComposition(state);
  if (!party) return Number(state.adults || 0) + Number(state.children || 0);
  return party.total - (state.young_children_share_bed === false ? 0 : Math.min(2, party.young));
}
