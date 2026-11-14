// Shared by quoting, administrative approval and transactional booking. Guest
// headcount is never reduced; this models existing sleeping places separately.
export const CHILD_POLICY_VERSION = 'children-2026-11-14-shared-parent-beds';
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
  const beds = { double: 0, single: 0, oneHalf: 0, known: false };
  // Both a 1½-plaza and a 1-plaza bed provide one independent sleeping place.
  const pattern = /(\d+)\s+camas?\s+de\s+(2|1(?:\s*1\/2|[.,]5)?)\s+plazas?/g;
  let match;
  while ((match = pattern.exec(text))) {
    beds.known = true;
    beds[match[2] === '2' ? 'double' : 'single'] += Number(match[1]);
    if (match[2] !== '2' && match[2] !== '1') beds.oneHalf += Number(match[1]);
  }
  return { ...beds, places: beds.double * 2 + beds.single };
}

export function categoryBedPlan(category, state, { allowAssumedSharing = true } = {}) {
  const party = guestComposition(state);
  if (!party) return { fits: false, reason: 'composition_incomplete' };
  const beds = bedInventory(category);
  const declared = Number(category.capacity);
  if (!Number.isInteger(declared) || declared < 1) return { fits: false, reason: 'capacity_unknown' };
  // Adult-priced guests must still fit the registered adult rate/capacity.
  // Children's sleeping arrangements are checked against the actual beds.
  if (party.pricedAdults > declared) return { fits: false, reason: 'adult_capacity' };
  const sharingAllowed = state.young_children_share_bed !== false &&
    (allowAssumedSharing || state.young_children_share_bed === true);
  const eligibleParentBed = beds.double > 0 || beds.oneHalf > 0;
  const shared = sharingAllowed && eligibleParentBed ? Math.min(2, party.young) : 0;
  const required = party.total - shared;
  const separate = state.bed_preference === 'separate';
  const familyConfirmed = allowAssumedSharing || state.family_bed_arrangement_confirmed === true;
  const physicalPlaces = separate ? beds.double + beds.single : beds.places;
  // Owner-approved family arrangement: two parents may share a 1½-plaza
  // bed (with up to two young children); another child uses another bed.
  // This never creates a third adult tariff/slot in the Doble category.
  const parentsShareOneHalf = party.children > 0 && party.adults >= 2 && !separate &&
    beds.oneHalf > 0 && familyConfirmed && (beds.double === 0 || required > physicalPlaces);
  const places = beds.known ? physicalPlaces + (parentsShareOneHalf ? 1 : 0) : declared;
  const fits = required <= places;
  const parentBedSize = parentsShareOneHalf || beds.double === 0
    ? (beds.oneHalf > 0 ? '1½' : null) : '2';
  return { fits, required_places: required, shared_children: shared,
    sharing_assumed: shared > 0 && state.young_children_share_bed !== true,
    parent_bed_size: parentBedSize,
    parents_share_one_half_bed: parentsShareOneHalf,
    family_bed_review_required: shared > 0 || parentsShareOneHalf,
    available_places: places, total_guests: party.total, beds,
    inventory_capacity_required: party.pricedAdults,
    reason: fits ? null : 'insufficient_beds' };
}

export function minimumRequiredBedPlaces(state) {
  const party = guestComposition(state);
  if (!party) return Number(state.adults || 0) + Number(state.children || 0);
  // Search broadly by adult-priced occupancy, then validate the complete
  // family layout per category. Searching by total headcount hides the Doble.
  return party.pricedAdults;
}
