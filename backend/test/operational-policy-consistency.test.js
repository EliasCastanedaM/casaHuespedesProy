import test from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONAL_POLICY, matchesOperationalCharge } from '../src/modules/commercial/operationalPolicy.js';
import { formatPolicyInformationReply } from '../src/modules/ai/ai.policy-info.js';
import { quoteForCategory } from '../src/modules/ai/ai.occupancy-pricing.js';
import { decideRule } from '../src/modules/commercial/commercial.service.js';
import { isTariffProposalActive } from '../src/modules/commercial/tariffProposal.service.js';

const category={slug:'doble',name:'Doble',capacity:2,bed_description:'2 camas de 1½ plazas',occupancy_rates:{2:120}};
const state={adults:2,children:1,child_ages:[6],pets:1,check_in:'2026-12-10',check_out:'2026-12-12'};
const verified=config=>({review_status:'verified',config});

test('cálculo e información comparten importes y la propuesta sigue desactivada',()=>{
  assert.equal(isTariffProposalActive(),false);
  const quote=quoteForCategory(category,state);
  assert.equal(quote.child_supplement_amount,OPERATIONAL_POLICY.childAmount);
  assert.equal(quote.pet_nightly_amount,OPERATIONAL_POLICY.petAmount);
  const rules={
    ninos_5_8:verified({amount_pen:OPERATIONAL_POLICY.childAmount,charge_frequency:OPERATIONAL_POLICY.childFrequency}),
    mascotas:verified({amount_pen:OPERATIONAL_POLICY.petAmount,charge_frequency:OPERATIONAL_POLICY.petFrequency}),
  };
  assert.match(formatPolicyInformationReply('¿Cuánto paga un niño de 6 años?',{rules}),/S\/ 20/);
  assert.match(formatPolicyInformationReply('¿Cuánto cuesta una mascota?',{rules}),/S\/ 20.*por noche/);
});

for(const [code,config,question] of [
  ['ninos_5_8',{amount_pen:30,charge_frequency:'child_per_night'},'¿Cuánto paga un niño de 6 años?'],
  ['mascotas',{amount_pen:30,charge_frequency:'pet_per_night'},'¿Cuánto cuesta una mascota?'],
  ['mascotas',{amount_pen:20,charge_frequency:'per_stay'},'¿Cuánto cuesta una mascota?'],
])test('no publica ni aprueba un cargo incompatible: '+JSON.stringify([code,config]),async()=>{
  assert.equal(matchesOperationalCharge(code,config),false);
  const reply=formatPolicyInformationReply(question,{rules:{[code]:verified(config)}});
  assert.match(reply,/No tengo confirmado/);assert.doesNotMatch(reply,/S\//);
  const current={amount_pen:20,charge_frequency:code==='mascotas'?'pet_per_night':'child_per_night'};
  const sql=[];
  const db={connect:async()=>({release(){},query:async(q)=>{
    sql.push(q);
    if(q.includes('FROM public.hotel_rule_proposals'))return {rows:[{id:1,status:'pending',rule_code:code,previous_updated_at:'2026-11-01',proposed_config:config}]};
    if(q.includes('FROM public.hotel_policy_rules'))return {rows:[{updated_at:'2026-11-01',config:current}]};
    return {rows:[]};
  }})};
  await assert.rejects(decideRule(1,'approved',{id:1},db));
  assert.ok(sql.includes('ROLLBACK'));
  assert.equal(sql.some(q=>q.startsWith('UPDATE')),false);
});
