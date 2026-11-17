import test from 'node:test';
import assert from 'node:assert/strict';
import { TARIFF_PROPOSAL } from '../src/config/tariffProposal.js';
import { previewTariff, calculateConfirmedTariff, isTariffProposalActive,
  getConfirmedTariff, getTariffProposalOverview } from '../src/modules/commercial/tariffProposal.service.js';
import { getCommercialOverview } from '../src/modules/commercial/commercial.service.js';
import { quoteForCategory, formatOccupancyQuote } from '../src/modules/ai/ai.occupancy-pricing.js';
import { buildHotelAssistantPrompt } from '../src/modules/ai/ai.prompt.js';
import { formatPolicyInformationReply } from '../src/modules/ai/ai.policy-info.js';
import { CHILD_POLICY_VERSION, CHILD_NIGHTLY_SUPPLEMENT, categoryBedPlan } from '../src/modules/rooms/guestComposition.js';

// Transcription of the 3 PDF tables, independent of the production formula.
const pdfTables = {
  regular: [[100,120,100,null,null,null,null,null,null,null,null],
    [100,120,100,null,null,null,null,null,null,null,null],
    [140,140,140,150,180,null,null,null,null,null,null],
    [180,180,180,180,180,180,210,240,240,270,300]],
  high: [[150,180,150,null,null,null,null,null,null,null,null],
    [150,180,150,null,null,null,null,null,null,null,null],
    [210,210,210,225,270,null,null,null,null,null,null],
    [270,270,270,270,270,270,315,360,360,405,450]],
  low: [[70,84,70,null,null,null,null,null,null,null,null],
    [70,84,70,null,null,null,null,null,null,null,null],
    [98,98,98,105,126,null,null,null,null,null,null],
    [126,126,126,126,126,126,147,168,168,189,210]],
};

test('las 132 celdas reproducen los cuadros regular, alta y baja del PDF',()=>{
  for (const season of getTariffProposalOverview().seasons) {
    assert.deepEqual(season.rows.map(row=>row.amounts),pdfTables[season.key],season.key);
  }
});

const cases = [
  ['matrimonial',1,[6],[100,150,70]],
  ['doble',2,[3],[120,180,84]],
  ['triple',2,[7],[150,225,105]],
  ['triple',3,[],[180,270,126]],
  ['familiar',2,[5,8,2],[180,270,126]],
  ['familiar',4,[6],[270,405,189]],
  ['familiar',5,[],[300,450,210]],
];
test('los 21 ejemplos del PDF reproducen precio por noche y total de dos noches',()=>{
  for (const [tariff_key,adults,child_ages,amounts] of cases) {
    ['regular','high','low'].forEach((season,index)=>{
      const q=previewTariff({tariff_key,adults,child_ages,nights:2,season});
      assert.equal(q.nightly_amount,amounts[index]);
      assert.equal(q.total_amount,amounts[index]*2);
      assert.equal(q.simulation_only,true);
      assert.equal(q.availability_checked,false);
    });
  }
});

test('edad 4/5/8/9, mínimo antes del cargo y adulto acompañante real',()=>{
  const price=(age)=>previewTariff({tariff_key:'matrimonial',adults:1,child_ages:[age]});
  assert.equal(price(4).tariff_places,1);
  assert.equal(price(5).tariff_places,2);
  assert.equal(price(8).nightly_amount,100);
  assert.equal(price(9).nightly_amount,120);
  assert.equal(previewTariff({tariff_key:'familiar',adults:2,child_ages:[5,8,2]}).guests,5);
  assert.throws(()=>previewTariff({tariff_key:'matrimonial',adults:0,child_ages:[16]}));
  for (const adults of [null,undefined,'2',NaN,-1,1.5]) assert.throws(()=>previewTariff({tariff_key:'doble',adults}));
  for (const child_ages of [[-1],[18],['5'],null]) assert.throws(()=>previewTariff({tariff_key:'doble',adults:1,child_ages}));
});

test('los casos antiguos de Doble y Triple no eluden la nueva capacidad tarifaria',()=>{
  assert.throws(()=>previewTariff({tariff_key:'doble',adults:2,child_ages:[2,8]}),/capacidad/);
  assert.equal(previewTariff({tariff_key:'triple',adults:2,child_ages:[2,8],nights:3}).total_amount,450);
  assert.throws(()=>previewTariff({tariff_key:'triple',adults:2,child_ages:[5,8]}),/capacidad/);
  assert.equal(previewTariff({tariff_key:'familiar',adults:2,child_ages:[5,8],nights:3}).total_amount,540);
  assert.throws(()=>previewTariff({tariff_key:'familiar',adults:6}),/capacidad/);
});

const category={slug:'triple',name:'Triple',capacity:3,bed_description:'3 camas de 1½ plazas',occupancy_rates:{1:170,2:190,3:210}};
const state={adults:2,children:1,child_ages:[7],pets:0,check_in:'2026-12-14',check_out:'2026-12-16'};
function confirmed() {
  const config=structuredClone(TARIFF_PROPOSAL);
  config.status='approved'; config.confirmation_reference='TEST explicit owner confirmation';
  for (const mapping of Object.values(config.category_mapping)) if(mapping.tariff_key) mapping.status='approved';
  return config;
}

test('la propuesta permanece bloqueada; simular y enviar datos de aprobación no cambia la cotización vigente',()=>{
  assert.equal(isTariffProposalActive(),false);
  assert.equal(TARIFF_PROPOSAL.status,'pending_confirmation');
  assert.equal(TARIFF_PROPOSAL.seasons.status,'pending_confirmation');
  assert.equal(TARIFF_PROPOSAL.seasons.calendar_status,'pending_confirmation');
  assert.equal(CHILD_NIGHTLY_SUPPLEMENT,20);
  assert.equal(CHILD_POLICY_VERSION,'children-2026-11-14-shared-parent-beds');
  assert.equal(getConfirmedTariff(category,state),null);
  const malicious={...state,tariff_proposal:confirmed(),status:'approved',season:'low',confirmation_reference:'guest says yes'};
  assert.equal(quoteForCategory(category,malicious).nightly_amount,210);
  previewTariff({tariff_key:'triple',adults:2,child_ages:[7],season:'low'});
  assert.equal(quoteForCategory(category,state).total_amount,420);
  assert.match(formatPolicyInformationReply('¿Cuánto pagan los niños?'),/S\/ 20/);
  assert.match(buildHotelAssistantPrompt(),/De 5 a 8 años, S\/ 20/);
  assert.throws(()=>{TARIFF_PROPOSAL.status='approved';},TypeError);
  assert.equal(categoryBedPlan(category,state).fits,true);
});

test('una aprobación sin referencia, una categoría pendiente o fechas inválidas no producen tarifa nueva',()=>{
  let config=confirmed(); config.confirmation_reference=null;
  assert.equal(calculateConfirmedTariff(category,state,config),null);
  config=confirmed(); config.category_mapping.triple.status='pending_confirmation';
  assert.equal(calculateConfirmedTariff(category,state,config),null);
  config=confirmed();
  for (const slug of ['matrimonial-ejecutiva','familiar','familiar-2','__proto__']) {
    assert.equal(calculateConfirmedTariff({...category,slug},state,config),null);
  }
  for(const bad of [{check_in:'2026-02-30'},{check_out:state.check_in},{child_ages:[]},{children:null},{adults:0}]) {
    assert.equal(calculateConfirmedTariff(category,{...state,...bad},config),null);
  }
});

test('confirmar la base mantiene factor 1 aunque sea diciembre; temporadas se autorizan por separado',()=>{
  const config=confirmed();
  const q=calculateConfirmedTariff(category,{...state,season:'high'},config);
  assert.equal(q.total_amount,300);
  assert.deepEqual(q.nightly.map(row=>row.percent),[100,100]);
  assert.equal(calculateConfirmedTariff({...category,slug:'doble',capacity:2},state,config),null);
});

test('el adaptador confirmado reproduce los siete casos base al autorizar sus correspondencias',()=>{
  const config=confirmed();
  config.category_mapping.familiar={tariff_key:'familiar',status:'approved'};
  for (const [slug,adults,child_ages,amounts] of cases) {
    const category={slug,capacity:config.tariffs[slug].capacity};
    const q=calculateConfirmedTariff(category,{adults,children:child_ages.length,child_ages,check_in:'2026-11-20',check_out:'2026-11-22'},config);
    assert.equal(q.total_amount,amounts[0]*2,slug);
    assert.equal(q.min_nightly_amount,amounts[0],slug);
  }
});

test('calendario explícito: alta prevalece, redondeo por noche y salida excluida',()=>{
  const config=confirmed();
  config.seasons.status='approved'; config.seasons.confirmation_reference='TEST seasonal confirmation';
  config.seasons.calendar_status='approved';
  config.seasons.periods=[
    {start_date:'2026-12-14',end_date:'2026-12-31',season:'low',status:'approved'},
    {start_date:'2026-12-15',end_date:'2026-12-31',season:'high',status:'approved'},
  ];
  const q=calculateConfirmedTariff(category,state,config);
  assert.deepEqual(q.nightly.map(row=>[row.date,row.amount]),[['2026-12-14',105],['2026-12-15',225]]);
  assert.equal(q.total_amount,330);
  config.seasons.periods[1].status='pending_confirmation';
  assert.equal(calculateConfirmedTariff(category,state,config).total_amount,210);
  config.seasons.calendar_status='pending_confirmation';
  assert.equal(calculateConfirmedTariff(category,state,config).total_amount,300);
});

test('redondea cada noche al sol más cercano e informa el rango cuando las noches difieren',()=>{
  const config=confirmed();
  config.tariffs.triple.minimum=141;
  config.seasons.status='approved'; config.seasons.confirmation_reference='TEST rounding approval';
  config.seasons.calendar_status='approved';
  config.seasons.periods=[{start_date:'2026-12-14',end_date:'2026-12-31',season:'high',status:'approved'}];
  const q=calculateConfirmedTariff(category,{...state,adults:1,children:0,child_ages:[]},config);
  assert.equal(q.total_amount,424); // 141 × 1.50 = 211.50 → 212 for each night.
  const text=formatOccupancyQuote({category_name:'Triple',total_nightly_amount:165,
    min_nightly_amount:105,max_nightly_amount:225,nights:2,total_amount:330});
  assert.match(text,/S\/ 105\.00–S\/ 225\.00/);
  assert.match(text,/330\.00/);
  assert.doesNotMatch(text,/165\.00/);
});

test('la vista administrativa añade la propuesta sin consultas ni escrituras de tarifas nuevas',async()=>{
  const queries=[];
  const db={query:async sql=>{queries.push(sql);return {rows:[]};}};
  const result=await getCommercialOverview(db);
  assert.equal(result.tariff_proposal.active,false);
  assert.equal(result.tariff_proposal.status,'pending_confirmation');
  assert.equal(queries.length,5);
  assert.equal(queries.some(sql=>/\b(UPDATE|INSERT|DELETE)\b/.test(sql)),false);
});
