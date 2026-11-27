import { TARIFF_PROPOSAL } from '../../config/tariffProposal.js';
import { isTariffProposalActive } from './tariffProposal.service.js';

// One contract for the currently implemented calculator. Changing this file
// requires the same release review as quoting, approval and booking. The PDF
// proposal remains inactive until its separate server-owned confirmation.
export const OPERATIONAL_POLICY = Object.freeze({
  childAmount: isTariffProposalActive() ? TARIFF_PROPOSAL.child_amount : 20,
  childFrequency: 'child_per_night',
  petAmount: 20,
  petFrequency: 'pet_per_night',
});

export function matchesOperationalCharge(code, config) {
  const fields = code === 'mascotas' ? ['petAmount', 'petFrequency']
    : code === 'ninos_5_8' ? ['childAmount', 'childFrequency'] : null;
  return !fields || (config?.amount_pen === OPERATIONAL_POLICY[fields[0]] &&
    config?.charge_frequency === OPERATIONAL_POLICY[fields[1]]);
}
