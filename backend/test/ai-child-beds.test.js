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
  assert.deepEqual(result.alternatives.map(q=>q.category_slug),['matrimonial-ejecutiva','triple']);
  assert.equal(result.alternatives[0].total_amount,420);
  const text=formatOccupancyQuote(result.quote,'es',{alternatives:result.alternatives});
  assert.match(text,/Estándar.*S\/ 120\.00.*S\/ 360\.00/);
  assert.match(text,/Ejecutiva.*S\/ 140\.00.*S\/ 420\.00/);
  assert.match(text,/sin cama adicional/);
  assert.match(text,/confirmar disponibilidad/);
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
  assert.equal(result.quote.category_slug,'triple');
  assert.equal(result.quote.shared_children,0);
  assert.equal(result.quote.nightly_amount,190);
  assert.equal(result.quote.child_supplement_amount,0);
});

test('una cama de 1½ no se trata como cama doble; camas desconocidas no permiten compartir',()=>{
  assert.equal(categoryBedPlan(categories[2],stay()).fits,false);
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
  assert.ok(chosen.alternatives.every(q=>q.category_slug!=='matrimonial'&&q.category_slug!=='doble'));
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

test('cada alternativa describe su propia distribución, sin aplicar cama compartida a la Triple',()=>{
  const {quote,alternatives}=selectOccupancyQuote(categories,stay());
  const text=formatOccupancyQuote(quote,'es',{alternatives});
  assert.match(text.split('\n').find(line=>line.startsWith('1)')),/compartiendo/);
  assert.match(text.split('\n').find(line=>line.startsWith('2)')),/compartiendo/);
  assert.doesNotMatch(text.split('\n').find(line=>line.startsWith('3)')),/compartiendo/);
});

test('edades inválidas en texto no provocan una cotización ni un error de tipo',()=>{
  assert.equal(quoteForCategory(categories[0],stay({child_ages:'4'})),null);
  assert.equal(quoteForCategory(categories[0],stay({child_ages:null})),null);
});
