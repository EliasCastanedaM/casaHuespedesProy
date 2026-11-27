import { isTariffProposalActive } from '../commercial/tariffProposal.service.js';
import { TARIFF_PROPOSAL } from '../../config/tariffProposal.js';
import { policyQuestionFocus } from './ai.policy-focus.js';
import { matchesOperationalCharge } from '../commercial/operationalPolicy.js';

// Consultas informativas sobre políticas del hospedaje: no modifican reservas.
// Una petición real de reserva con menores o mascotas sigue requiriendo revisión humana.
function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function policyInformationType(message) {
  const text = normalize(message);
  if (!text) return null;
  // Evita convertir una solicitud real en una simple respuesta informativa.
  if (/^(?:quiero|quisiera|deseo|necesito|vamos a|voy a)\b.{0,45}\b(?:reservar|reserva|llevar|hospedar)/.test(text)) {
    return null;
  }
  if (/^(?:somos|vamos con|viajo con|viajamos con|llevare|llevo|tenemos)\b/.test(text)) {
    return null;
  }
  const asks = /[?¿]/.test(message) ||
    /\b(?:condiciones?|reglas?|politicas?|informacion|explicame|cuentame|descuentos?|tarifas?|precio|costo|cuanto|cuantos|desde|pagan|paga|cobran|cobro|aceptan|permiten|admiten)\b/.test(text);
  if (!asks) return null;

  // A children's menu or breakfast is a service question, not child pricing.
  if (/\b(?:menu|desayuno|comida|bebida|restaurante|cafeteria|dieteticos?)\b/.test(text) &&
      !/\b(?:reserva|cotizacion|alojamiento|pagan|paga|hospedar)\b/.test(text)) return null;
  const children = /\b(?:nin[oa]s?|bebes?|menores?|hij[oa]s?|infantes?|children|kids?)\b/.test(text);
  const pets = /\b(?:mascotas?|perros?|perrit[oa]s?|gatos?|gatit[oa]s?|pets?)\b/.test(text);
  const largeGroups = /\b(?:grupos?|8\s*(?:o mas\s*)?(?:personas?|huespedes?)|ocho\s+(?:personas?|huespedes?))\b/.test(text);
  if (children) return "children";
  if (pets) return "pets";
  if (largeGroups) return "groups";
  return null;
}

// Only approved facts are publishable. Missing/unavailable/retired sources
// never fall back to an embedded price. Private calculation fields stay here.
const unavailable = 'No tengo confirmado ese importe; nuestro equipo puede verificarlo.';
function verified(rule) {
  return rule?.active !== false && rule?.review_status === 'verified' ? rule.config || {} : null;
}

function childReply(age, get) {
  const activeProposal=isTariffProposalActive();
  if(age<=4) {
    const config=activeProposal ? {no_charge_when_using_existing_beds:true} : verified(get('ninos_0_4'));
    return config?.no_charge_when_using_existing_beds === true
      ? `Para un niño de ${age} años no hay cargo adicional si utiliza las camas existentes.` : unavailable;
  }
  if(age<=8) {
    const config=activeProposal ? {amount_pen:TARIFF_PROPOSAL.child_amount,charge_frequency:'child_per_night'} : verified(get('ninos_5_8'));
    if (!matchesOperationalCharge('ninos_5_8', config)) return unavailable;
    const amount=config?.amount_pen;
    if(typeof amount!=='number' || !Number.isFinite(amount) || amount<=0 || config.charge_frequency!=='child_per_night')return unavailable;
    return activeProposal
      ? `Para un niño de ${age} años se consideran S/ ${amount} por noche en el precio de la habitación.`
      : `Para un niño de ${age} años, el cargo adicional es de S/ ${amount} por noche.`;
  }
  const config=activeProposal ? {adult_rate_confirmed:true} : verified(get('ninos_9_mas'));
  return config?.adult_rate_confirmed===true
    ? `Para un niño de ${age} años se aplica la tarifa de adulto.` : unavailable;
}

function childrenReply(message,get) {
  const focus=policyQuestionFocus(message);
  if(focus.sharing) {
    const rule=verified(get('ninos_0_4'));
    if(focus.sharingCount && Number.isInteger(rule?.max_children_sharing_parent_bed) && rule.max_children_sharing_parent_bed>0) {
      return `Pueden compartir hasta ${rule.max_children_sharing_parent_bed} niños de hasta 4 años, según las camas disponibles.`;
    }
    return 'La distribución de camas debe confirmarla el hospedaje para la habitación elegida.';
  }
  if(focus.ages.length) {
    if(focus.ageRange) {
      return [focus.ages.filter(age=>age<=4),focus.ages.filter(age=>age>=5&&age<=8),focus.ages.filter(age=>age>=9)]
        .filter(ages=>ages.length).map(ages=>{
          const first=Math.min(...ages),last=Math.max(...ages);
          const reply=childReply(first,get);
          return first===last ? reply : reply.replace(`Para un niño de ${first} años`,`Para niños de ${first} a ${last} años`)
            .replace('por noche.','por niño y noche.');
        }).filter((reply,index,all)=>all.indexOf(reply)===index).join(' ');
    }
    // One short fact per requested age; no other age band, formula, room minimum
    // or invitation to reserve is appended.
    return focus.ages.map(age=>childReply(age,get)).filter((reply,index,all)=>all.indexOf(reply)===index).join(' ');
  }
  if(focus.threshold) {
    if(focus.adultThreshold)return isTariffProposalActive() || verified(get('ninos_9_mas'))?.adult_rate_confirmed===true
      ? 'Desde los 9 años se aplica la tarifa de adulto.' : unavailable;
    const free=verified(get('ninos_0_4'));
    if(focus.freeThreshold)return isTariffProposalActive() || free?.no_charge_when_using_existing_beds===true
      ? 'Hasta los 4 años no hay cargo adicional si utiliza las camas existentes.' : unavailable;
    const paid=verified(get('ninos_5_8'));
    return isTariffProposalActive() || (free?.no_charge_when_using_existing_beds===true && matchesOperationalCharge('ninos_5_8',paid))
      ? 'Desde los 5 años se aplica el cobro por alojamiento.' : unavailable;
  }
  if(focus.general) {
    const free=childReply(4,get), paid=childReply(6,get), adult=childReply(9,get);
    if([free,paid,adult].some(reply=>reply===unavailable))return 'Nuestro equipo debe confirmar las condiciones para niños.';
    const amount=isTariffProposalActive() ? TARIFF_PROPOSAL.child_amount : verified(get('ninos_5_8')).amount_pen;
    return isTariffProposalActive()
      ? `Hasta 4 años, sin cargo usando las camas existentes. De 5 a 8, se consideran S/ ${amount} por niño y noche en el precio de la habitación. Desde 9 años, tarifa adulta.`
      : `Hasta 4 años, sin cargo usando las camas existentes. De 5 a 8, S/ ${amount} adicionales por niño y noche. Desde 9 años, tarifa adulta.`;
  }
  if(focus.admission && !focus.price) {
    return isTariffProposalActive() || verified(get('ninos_0_4'))
      ? 'Sí, los niños pueden alojarse acompañados por un adulto.'
      : 'Nuestro equipo debe confirmar las condiciones para alojarse con niños.';
  }
  return '¿Qué edad tiene el niño?';
}

export function formatPolicyInformationReply(message, { rules } = {}) {
  const type = policyInformationType(message);
  if (!type) return null;
  const catalog=rules || {};
  const get=code=>catalog[code] || null;
  if(type==='children')return childrenReply(message,get);
  if(type==='pets') {
    const focus=policyQuestionFocus(message);
    const config=verified(get('mascotas'));
    if(!config)return focus.price
      ? 'Nuestro equipo debe confirmar el importe y la admisión de la mascota.'
      : 'La admisión de mascotas debe confirmarla el hospedaje.';
    if(!focus.price && !focus.general)return 'Sí, con autorización previa del hospedaje.';
    if (!matchesOperationalCharge('mascotas', config)) return unavailable;
    const amount=config.amount_pen;
    const frequency={pet_per_night:'por mascota y por noche',per_stay:'por estadía'}[config.charge_frequency];
    if(typeof amount!=='number' || !Number.isFinite(amount) || amount<=0 || !frequency)return unavailable;
    return `El cargo es de S/ ${amount}${config.vat_included===true ? ' (IGV incluido)' : ''} ${frequency}, con autorización previa del hospedaje.`;
  }
  if(type==='groups') {
    const config=verified(get('grupos_8'));
    if(!Number.isInteger(config?.min_total_guests) || config.min_total_guests<8)return 'Las tarifas para grupos deben consultarse con el hospedaje.';
    return `Podemos evaluar una tarifa especial para grupos de ${config.min_total_guests} o más huéspedes, con confirmación del equipo.`;
  }
  return null;
}
