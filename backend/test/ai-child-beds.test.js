import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { guestComposition, bedInventory, categoryBedPlan, CHILD_POLICY_VERSION } from '../src/modules/rooms/guestComposition.js';
import { quoteForCategory, selectOccupancyQuote, formatOccupancyQuote } from '../src/modules/ai/ai.occupancy-pricing.js';
import { generateAiReply, confirmGlobalReservation } from '../src/modules/ai/ai.service.js';
import { withAvailableReservationRooms } from '../src/modules/rooms/roomOccupancyRates.service.js';
import { prepareGlobalReservation, handleGlobalReservationTurn } from '../src/modules/ai/ai.reservation.js';
const categories=[
  ['matrimonial','Matrimonial Estándar',2,'1 cama de 2 plazas',[100,120]],
  ['matrimonial-ejecutiva','Matrimonial Ejecutiva',2,'1 cama de 2 plazas',[120,140]],
  ['doble','Doble - 2 Camas',2,'2 camas de 1½ plazas',[120,140]],
  ['triple','Triple - 3 Camas',3,'3 camas de 1½ plazas',[170,190,210]],
  ['familiar','Familiar 1',5,'2 camas de 2 plazas + 3 camas de 1½ plazas',[170,190,210,230,250]],
  ['familiar-2','Familiar 2',5,'1 cama de 2 plazas + 2 camas de 1½ plazas + 1 cama de 1 plaza',[170,190,210,230,250]],
].map(([slug,name,capacity,bed_description,rates])=>({slug,name,capacity,bed_description,is_active:true,price_per_night:rates.at(-1),occupancy_rates:Object.fromEntries(rates.map((v,i)=>[i+1,v]))}));
const stay=extra=>({adults:2,children:1,child_ages:[1],pets:0,check_in:'2026-11-25',check_out:'2026-11-28',...extra});

for(const age of [0,1,4])test('dos adultos y niño de '+age+' años: matrimonial sin suplemento',()=>{
  const state=stay({child_ages:[age]});
  const result=selectOccupancyQuote(categories,state);
  assert.equal(result.quote.category_slug,'matrimonial');
  assert.equal(result.quote.guests,3);
  assert.equal(result.quote.required_bed_places,2);
  assert.equal(result.quote.nightly_amount,120);
  assert.equal(result.quote.total_amount,360);
  assert.equal(result.quote.shared_children,1);
  assert.deepEqual(result.alternatives.map(q=>q.category_slug),['matrimonial-ejecutiva','doble']);
  assert.equal(result.alternatives[0].total_amount,420);
  const text=formatOccupancyQuote(result.quote,'es',{alternatives:result.alternatives});
  assert.match(text,/Estándar.*S\/ 120\.00.*S\/ 360\.00/);
  assert.match(text,/Ejecutiva.*S\/ 140\.00.*S\/ 420\.00/);
  assert.equal(text.split('\n').length,3);
  assert.doesNotMatch(text,/compartiendo|distribuci[oó]n|equipo|1½|https?:/);
});

test('hasta dos niños de 4 años comparten; un tercero requiere plazas reales',()=>{
  const two=selectOccupancyQuote(categories,stay({children:2,child_ages:[4,4]})).quote;
  assert.equal(two.category_slug,'matrimonial');
  assert.equal(two.guests,4);
  assert.equal(two.shared_children,2);
  assert.equal(two.total_amount,360);
  assert.equal(categoryBedPlan(categories[0],stay({children:3,child_ages:[1,2,3]})).fits,false);
});

test('negar cama compartida cambia categoría sin agregar un cargo infantil inventado',()=>{
  const result=selectOccupancyQuote(categories,stay({young_children_share_bed:false}));
  assert.equal(result.quote.category_slug,'doble');
  assert.equal(result.quote.shared_children,0);
  assert.equal(result.quote.nightly_amount,140);
  assert.equal(result.quote.child_supplement_amount,0);
});

test('el arreglo familiar permite compartir 1½; una cama desconocida no habilita excepciones',()=>{
  assert.equal(categoryBedPlan(categories[2],stay()).fits,true);
  assert.equal(bedInventory(categories[2]).oneHalf,2);
  assert.equal(categoryBedPlan({...categories[0],bed_description:null},stay()).fits,false);
  assert.equal(bedInventory(categories[3]).places,3);
  assert.equal(bedInventory(categories[4]).places,7);
  assert.equal(bedInventory(categories[5]).places,5);
  assert.equal(categoryBedPlan(categories[4],stay({adults:6,children:0,child_ages:[]})).fits,false);
});

for(const [age,priced,extra] of [[4,2,0],[5,2,20],[8,2,20],[9,3,0]])test('límite de edad '+age+' sin solapamiento',()=>{
  const category={...categories[3],occupancy_rates:{1:170,2:195,3:240}};
  const q=quoteForCategory(category,stay({child_ages:[age]}));
  assert.equal(q.priced_adults,priced);
  assert.equal(q.child_supplement_amount,extra);
  assert.equal(q.nightly_amount,age>=9?240:195+extra);
  assert.equal(q.total_amount,q.nightly_amount*3);
  assert.equal(q.child_policy_version,CHILD_POLICY_VERSION);
});

test('cargo infantil fijo por niño y por noche, sin porcentaje ni tope anterior',()=>{
  const q=quoteForCategory(categories[4],stay({children:2,child_ages:[5,8]}));
  assert.equal(q.child_supplement_amount,40);
  assert.equal(q.nightly_amount,230);
  assert.equal(q.total_amount,690);
  assert.equal(q.child_cap_applied,false);
  assert.equal(guestComposition(stay({child_ages:[9]})).pricedAdults,3);
});

test('no cotiza sin edades ni inventa una tarifa de adulto no registrada',()=>{
  assert.equal(quoteForCategory(categories[0],stay({child_ages:[]})),null);
  assert.equal(quoteForCategory({...categories[0],occupancy_rates:{1:100}},stay()),null);
});

test('consulta disponibilidad con plazas de cama sin perder el número real de huéspedes',async()=>{
  const queries=[];
  const state=stay();
  const result=await withAvailableReservationRooms(categories,state,{query:async(sql,params)=>{
    queries.push(params);
    return {rows:categories.map((c,i)=>({id:i+1,category_slug:c.slug,availability_status:i===0?'blocked':'available'}))};
  }});
  assert.equal(queries[0][2],2);
  assert.equal(state.adults+state.children,3);
  assert.equal(result[0].available_rooms.length,0);
  const chosen=selectOccupancyQuote(result,state);
  assert.equal(chosen.quote.category_slug,'matrimonial-ejecutiva');
  assert.ok(chosen.alternatives.every(q=>q.category_slug!=='matrimonial'));
});

function mockChat(t) {
  const contexts=new Map();const queries=[];
  t.mock.method(pool,'query',async(sql,params=[])=>{
    queries.push({sql,params});const key=params.slice(0,2).join(':');
    if(sql.includes('FROM room_categories rc'))return {rows:categories};
    if(sql.includes('FROM public.room_category_occupancy_rates'))return {rows:categories.flatMap(c=>Object.entries(c.occupancy_rates).map(([occupancy,amount])=>({category_slug:c.slug,occupancy,amount})))};
    if(sql.includes('WITH requested_range'))return {rows:categories.map((c,i)=>({id:i+10,category_slug:c.slug,room_number:'internal-'+i,view_type:'Vista interior',availability_status:'available'}))};
    if(sql.includes('SELECT handoff_active'))return {rows:[{handoff_active:true}]};
    if(sql.includes('SELECT booking_context'))return {rows:contexts.has(key)?[{booking_context:structuredClone(contexts.get(key)),booking_context_expires_at:new Date(Date.now()+86400000)}]:[]};
    if(sql.includes('INSERT INTO ai_conversations')&&sql.includes('booking_context')){contexts.set(key,JSON.parse(params[2]));return {rows:[]};}
    if(sql.includes('SELECT author, content'))return {rows:[]};
    throw new Error('Unexpected SQL');
  });
  return {contexts,queries};
}

for(const channel of ['whatsapp','instagram','facebook'])test(channel+': cotiza opciones, elige Ejecutiva y aprueba camas sin forzar Triple',async t=>{
  const {contexts,queries}=mockChat(t);
  const input={channel,externalUserId:'family-example'};
  const send=message=>generateAiReply({...input,message});
  const first=await send('Quiero reservar del 25/11/2026 al 28/11/2026 para 2 adultos y 1 niño sin mascotas');
  assert.match(first.reply,/edades/);
  assert.doesNotMatch(first.reply,/Triple|Matrimonial|S\//);
  const quote=await send('1 año');
  assert.equal(quote.mode,'occupancy_quote');
  assert.match(quote.reply,/1\) Matrimonial Estándar.*120\.00.*360\.00/);
  assert.match(quote.reply,/2\) Matrimonial Ejecutiva.*140\.00.*420\.00/);
  assert.doesNotMatch(quote.reply,/internal-|room_id|room_number/);
  const executive=await send('2');
  assert.match(executive.reply,/Matrimonial Ejecutiva/);
  assert.match(executive.reply,/420\.00/);
  const accepted=await send('Sí');
  assert.equal(accepted.mode,'human_review_required');
  const context=contexts.get(channel+':family-example');
  assert.equal(context.whatsapp_mvp.total_guests,3);
  assert.equal(context.whatsapp_mvp.category_slug,'matrimonial-ejecutiva');
  await assert.rejects(confirmGlobalReservation({...input,categorySlug:'matrimonial-ejecutiva',totalAmount:420}),/camas disponibles/);
  await confirmGlobalReservation({...input,categorySlug:'matrimonial-ejecutiva',totalAmount:420,childBedAvailabilityConfirmed:true});
  assert.equal(contexts.get(channel+':family-example').whatsapp_mvp.staff_confirmation.child_policy_version,CHILD_POLICY_VERSION);
  assert.ok(queries.some(x=>x.sql.includes('WITH requested_range')&&x.params[2]===2));
});

test('rechazar compartir cama invalida cotización y aprobación previas',()=>{
  const context={state:'whatsapp_mvp',whatsapp_mvp:{...stay(),state:'quoted',category_slug:'matrimonial',total_guests:3,pricing_quote:{total_amount:360},staff_confirmation:{confirmed:true}}};
  const turn=handleGlobalReservationTurn({message:'No compartirá la cama; cama separada para el niño',context,categories});
  assert.equal(turn.action,'calculate_quote');
  assert.equal(turn.context.whatsapp_mvp.young_children_share_bed,false);
  assert.equal(turn.context.whatsapp_mvp.staff_confirmation,undefined);
});

test('una aprobación de la política anterior exige revisión antes de crear la reserva',async t=>{
  const {contexts}=mockChat(t);
  const state={...stay(),total_guests:3,state:'awaiting_payment_choice',category_slug:'matrimonial',staff_confirmation:{confirmed:true,category_slug:'matrimonial',total_amount:360},customer_name:'Test',customer_phone:'51900000000',customer_email:'test@example.com'};
  contexts.set('whatsapp:stale',{state:'whatsapp_mvp',whatsapp_mvp:state});
  const result=await generateAiReply({channel:'whatsapp',externalUserId:'stale',message:'Pagar en el establecimiento'});
  assert.equal(result.mode,'human_review_required');
  assert.equal(contexts.get('whatsapp:stale').whatsapp_mvp.staff_confirmation,undefined);
});

test('negaciones de compartir cama se conservan como correcciones, sin invertir su sentido',()=>{
  for(const message of ['El niño no compartirá la cama','No dormirá con nosotros','Cama propia para el niño']) {
    const context={state:'whatsapp_mvp',whatsapp_mvp:{...stay(),state:'quoted',category_slug:'matrimonial',total_guests:3,pricing_quote:{total_amount:360}}};
    const result=handleGlobalReservationTurn({message,context,categories});
    assert.equal(result.context.whatsapp_mvp.young_children_share_bed,false,message);
    assert.equal(result.action,'calculate_quote');
  }
});

test('las opciones muestran habitación y precio; el cálculo de camas queda interno',()=>{
  const {quote,alternatives}=selectOccupancyQuote(categories,stay({children:2,child_ages:[2,8]}));
  assert.equal(quote.parents_share_one_half_bed,true);
  const text=formatOccupancyQuote(quote,'es',{alternatives});
  assert.equal(text, [
    '1) Doble - 2 Camas · S/ 160.00 por noche. Total 3 noche(s): S/ 480.00.',
    '2) Triple - 3 Camas · S/ 210.00 por noche. Total 3 noche(s): S/ 630.00.',
    '3) Familiar 1 · S/ 210.00 por noche. Total 3 noche(s): S/ 630.00.',
  ].join('\n'));
});

test('edades inválidas en texto no provocan una cotización ni un error de tipo',()=>{
  assert.equal(quoteForCategory(categories[0],stay({child_ages:'4'})),null);
  assert.equal(quoteForCategory(categories[0],stay({child_ages:null})),null);
});

test('caso de la captura: dos padres con niños de 2 y 8 años empiezan por Doble a 160 por noche',()=>{
  const state=stay({children:2,child_ages:[2,8]});
  const {quote,alternatives}=selectOccupancyQuote(categories,state);
  assert.equal(quote.category_slug,'doble');
  assert.equal(quote.guests,4);
  assert.equal(quote.shared_children,1);
  assert.equal(quote.parent_bed_size,'1½');
  assert.equal(quote.parents_share_one_half_bed,true);
  assert.equal(quote.adult_base_amount,140);
  assert.equal(quote.child_supplement_amount,20);
  assert.equal(quote.total_amount,480);
  assert.deepEqual(alternatives.map(q=>q.category_slug),['triple','familiar']);
  const ownBed=selectOccupancyQuote(categories,{...state,young_children_share_bed:false}).quote;
  assert.equal(ownBed.category_slug,'triple');
  assert.equal(ownBed.nightly_amount,210);
});

test('la familia respeta camas separadas, camas de una plaza y capacidad adulta',()=>{
  const state=stay({children:2,child_ages:[2,8]});
  assert.equal(categoryBedPlan({...categories[2],bed_description:'2 camas de 1 plaza'},state).fits,false);
  assert.equal(selectOccupancyQuote(categories,{...state,bed_preference:'separate'}).quote.category_slug,'triple');
  assert.equal(categoryBedPlan(categories[2],stay({child_ages:[9]})).fits,false);
  assert.equal(categoryBedPlan(categories[2],state,{allowAssumedSharing:false}).fits,false);
  assert.equal(categoryBedPlan(categories[2],{...state,young_children_share_bed:true,family_bed_arrangement_confirmed:true},{allowAssumedSharing:false}).fits,true);
});

test('dos niños de 5 a 8 usan camas propias en Triple y conservan el suplemento de 40',()=>{
  const q=selectOccupancyQuote(categories,stay({children:2,child_ages:[5,8]})).quote;
  assert.equal(q.category_slug,'triple');
  assert.equal(q.child_supplement_amount,40);
  assert.equal(q.nightly_amount,230);
});

for(const channel of ['whatsapp','instagram','facebook'])test(channel+': flujo 2 y 8 elige Doble, confirma distribución y mantiene cuatro huéspedes',async t=>{
  const {contexts}=mockChat(t);
  const input={channel,externalUserId:'two-beds'};
  const result=await generateAiReply({...input,message:'Quiero reservar del 25/11/2026 al 28/11/2026 para 2 adultos y 2 niños de 2 y 8 años sin mascotas'});
  assert.match(result.reply,/1\) Doble - 2 Camas.*160\.00.*480\.00/);
  assert.doesNotMatch(result.reply,/compartiendo|1½|distribuci[oó]n|https?:/);
  const before=structuredClone(contexts.get(channel+':two-beds'));
  const details=await generateAiReply({...input,message:'Dame más detalles',history:[{author:'assistant',content:result.reply}]});
  assert.equal(details.mode,'category_details');
  assert.equal(details.reply,'Puedes ver fotos y detalles de las habitaciones aquí:\nhttps://www.casahuespedespimentel.com/habitaciones');
  assert.deepEqual(contexts.get(channel+':two-beds'),before);
  await generateAiReply({...input,message:'Sí'});
  await confirmGlobalReservation({...input,categorySlug:'doble',totalAmount:480,childBedAvailabilityConfirmed:true});
  const state=contexts.get(channel+':two-beds').whatsapp_mvp;
  assert.equal(state.total_guests,4);
  assert.equal(state.staff_confirmation.family_bed_arrangement_confirmed,true);
  assert.equal(state.staff_confirmation.child_policy_version,CHILD_POLICY_VERSION);
});
