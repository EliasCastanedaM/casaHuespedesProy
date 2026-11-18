import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/db.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import OpenAI from 'openai';
import { env } from '../src/config/env.js';
import { handleGlobalReservationTurn, formatGlobalHandoffSummary } from '../src/modules/ai/ai.reservation.js';
import { acceptsReservationOffer, reservationInterestReply } from '../src/modules/ai/ai.reservation-consent.js';
import { processMetaMessage } from '../src/modules/meta/meta.service.js';
const categories = [
  ["matrimonial", "Matrimonial Estándar", 2, [100,120]],
  ["matrimonial-ejecutiva", "Matrimonial Ejecutiva", 2, [120,140]],
  ["doble", "Doble - 2 Camas", 2, [120,140]],
  ["triple", "Triple - 3 Camas", 3, [170,190,210]],
  ["familiar", "Familiar 1", 5, [170,190,210,230,250]],
  ["familiar-2", "Familiar 2", 5, [170,190,210,230,250]],
].map(([slug,name,capacity,rates]) => ({ slug,name,capacity,price_per_night: rates.at(-1),
  bed_description: ({matrimonial:'1 cama de 2 plazas','matrimonial-ejecutiva':'1 cama de 2 plazas',doble:'2 camas de 1½ plazas',triple:'3 camas de 1½ plazas',familiar:'2 camas de 2 plazas + 3 camas de 1½ plazas','familiar-2':'1 cama de 2 plazas + 2 camas de 1½ plazas + 1 cama de 1 plaza'})[slug],
  occupancy_rates: Object.fromEntries(rates.map((amount,i) => [i+1,amount])) }));

function mockDatabase(t, options = {}) {
  const contexts=new Map();
  t.mock.method(pool,"query",async (sql,params=[])=>{
    const key=params.slice(0,2).join(":");
    if(sql.includes("FROM room_categories rc")) return {rows:categories};
    if(sql.includes("FROM public.room_category_occupancy_rates")) return {rows:categories.flatMap(c=>Object.entries(c.occupancy_rates).map(([occupancy,amount])=>({category_slug:c.slug,occupancy,amount})))};
    if(sql.includes("WITH requested_range") && options.failInventory)throw new Error("Inventario temporalmente inaccesible");
    if(sql.includes("WITH requested_range")) return {rows:(options.rooms || categories.map((c,i)=>({id:i+1,category_slug:c.slug,room_number:String(200+i),view_type:c.slug==="familiar-2"||c.slug==="matrimonial-ejecutiva"?"Vista al mar":"Vista interior",amenities:[],availability_status:"available"}))).filter(r=>r.availability_status==="available")};
    if(sql.includes("SELECT handoff_active")) return {rows:[{handoff_active:true}]};
    if(sql.includes("SELECT booking_context")) return {rows:contexts.has(key)?[{booking_context:structuredClone(contexts.get(key)),booking_context_expires_at:new Date(Date.now()+86400000)}]:[]};
    if(sql.includes("INSERT INTO ai_conversations")&&sql.includes("booking_context")){contexts.set(key,JSON.parse(params[2]));return {rows:[]};}
    if(sql.includes("SELECT author, content")) return {rows:[]};
    throw new Error("Unexpected SQL: "+sql);
  });
  return contexts;
}

const now=new Date('2026-11-17T12:00:00Z');
test('aceptación exige intención explícita y tolera mayúsculas, tildes y puntuación',()=>{
  for(const value of ['si quiero','SÍ QUIERO','Sí, quiero reservar.','  SI   QUIERO  ','Sí deseo reservar','Sí, reservemos','yes, I want to book'])assert.equal(acceptsReservationOffer(value),true,value);
  for(const value of ['sí','ok','perfecto','dale','me gusta','gracias','no quiero reservar','si quiero saber los precios','¿puedo reservar?'])assert.equal(acceptsReservationOffer(value),false,value);
});
for(const [channel,acceptance] of [['whatsapp','SÍ QUIERO'],['instagram','si quiero'],['facebook','Sí, quiero reservar.']])test(channel+': recomendar y aportar datos nunca equivale a aceptar',async t=>{
  const contexts=mockDatabase(t),externalUserId='explicit-consent-'+channel;
  const send=message=>generateAiReply({channel,externalUserId,message,now});
  const quote=await send('Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños y sin mascotas');
  assert.equal(quote.mode,'occupancy_quote');
  assert.match(quote.reply,/Cuál de estas categorías prefieres/);
  assert.doesNotMatch(quote.reply,/Para confirmar, responde «sí quiero»/);
  assert.equal(contexts.get(channel+':'+externalUserId).whatsapp_mvp.state,'quoted');
  for(const message of ['sí','ok','perfecto','me gusta',acceptance]) {
    const result=await send(message);
    assert.equal(result.mode,'room_category_choice');
    assert.equal(contexts.get(channel+':'+externalUserId).whatsapp_mvp.guest_reservation_consent,undefined);
    assert.equal(contexts.get(channel+':'+externalUserId).whatsapp_mvp.state,'quoted');
  }
  const chosen=await send('Opción 1');
  assert.equal(chosen.mode,'occupancy_quote');
  assert.match(chosen.reply,/Quieres reservar esta habitación/);
  const result=await send(acceptance);
  assert.equal(result.mode,'reservation_interest_confirmed');
  assert.equal(result.reply,reservationInterestReply('es'));
  assert.doesNotMatch(result.reply,/registrad|ya tiene|repetir|https:|nombre|correo|pago/i);
  const state=contexts.get(channel+':'+externalUserId).whatsapp_mvp;
  assert.equal(state.guest_reservation_consent.confirmed,true);
  assert.equal(state.booking,undefined);
  let pauses=0;
  await processMetaMessage({channel,externalUserId,messageId:'consent',messageType:'text',text:acceptance},{
    claim:async()=>true,complete:async()=>{},release:async()=>{},getHandoff:async()=>false,
    setHandoff:async()=>{pauses++;},loadHistory:async()=>[],generateReply:async()=>result,
    sendReply:async()=>({message_id:'mock'}),recordOutgoing:async()=>{},sleep:async()=>{},
  });
  assert.equal(pauses,0,'La IA sigue disponible para otras dudas hasta que el equipo tome el chat');
  const revised=await send('Ahora somos tres adultos sin niños ni mascotas');
  assert.equal(revised.mode,'occupancy_quote');
  assert.match(revised.reply,/Triple/);
  assert.match(revised.reply,/Cuál de estas categorías prefieres|Quieres reservar/);
  assert.equal(contexts.get(channel+':'+externalUserId).whatsapp_mvp.guest_reservation_consent,undefined);
});
test('una oferta antigua sin pregunta vigente no autoriza revisión por contexto',()=>{
  const context={whatsapp_mvp:{state:'quoted',check_in:'2026-11-20',check_out:'2026-11-22',adults:2,children:0,child_ages:[],pets:0,total_guests:2,max_single_room_capacity:5}};
  const first=handleGlobalReservationTurn({message:'Sí quiero',context,categories,now});
  assert.equal(first.action,undefined);
  assert.equal(first.mode,'reservation_offer');
  const next=handleGlobalReservationTurn({message:'Sí quiero',context:first.context,categories,now});
  assert.equal(next.action,'request_staff_review');
});
test('varias habitaciones también esperan aceptación explícita',()=>{
  const first=handleGlobalReservationTurn({message:'Quiero reservar del 20/11/2026 al 22/11/2026 para 8 adultos sin niños ni mascotas',categories,now});
  assert.equal(first.mode,'reservation_offer');
  assert.equal(first.context.whatsapp_mvp.state,'quoted');
  assert.match(first.reply,/varias habitaciones/);
  const next=handleGlobalReservationTurn({message:'Sí quiero',context:first.context,categories,now});
  assert.equal(next.action,'request_staff_review');
});

for(const channel of ['whatsapp','instagram','facebook'])test(channel+': dos dobles conservan cantidad y esperan consentimiento sin cotizar una sola',async t=>{
  const contexts=mockDatabase(t),externalUserId='two-double-'+channel;
  const send=message=>generateAiReply({channel,externalUserId,message,now});
  await send('Quiero reservar del 12/12/2026 al 14/12/2026 para cuatro adultos sin niños ni mascotas');
  const previousKey=env.openai.apiKey;env.openai.apiKey='mock-no-network';
  t.after(()=>{env.openai.apiKey=previousKey;});
  t.mock.method(OpenAI.Responses.prototype,'create',async request=>{
    assert.equal(request.text.format.name,'hotel_booking_understanding');
    const input=JSON.parse(request.input),single=input.mensaje_actual.includes('una familiar');
    return {output_text:JSON.stringify({intent:'correction',language:'es',proposal:null,clarification:null,clarification_field:null,updates:[
      {field:'category_slug',value:single?'familiar':'doble',evidence:input.mensaje_actual},
      {field:'room_quantity',value:single?1:2,evidence:input.mensaje_actual},
    ]})};
  });
  const result=await send('Prefiero dos habitaciones dobles.');
  assert.match(result.reply,/2 habitaciones.*Doble/);
  assert.match(result.reply,/disponibilidad y el importe/);
  assert.match(result.reply,/reserva de estas habitaciones/);
  assert.doesNotMatch(result.reply,/S\/|Familiar|reserva confirmada|registrad/);
  const state=contexts.get(channel+':'+externalUserId).whatsapp_mvp;
  assert.equal(state.room_quantity,2);assert.equal(state.category_slug,'doble');
  assert.equal(state.state,'quoted');assert.equal(state.pricing_quote,undefined);
  assert.equal(state.guest_reservation_consent,undefined);
  assert.match(formatGlobalHandoffSummary(state),/Cantidad de habitaciones solicitadas: 2/);
  assert.match((await send('ok')).reply,/estas habitaciones/);
  const accepted=await send('SÍ QUIERO');
  assert.equal(accepted.mode,'reservation_interest_confirmed');
  assert.equal(contexts.get(channel+':'+externalUserId).whatsapp_mvp.room_quantity,2);
  assert.equal(contexts.get(channel+':'+externalUserId).whatsapp_mvp.booking,undefined);
  const revised=await send('Mejor prefiero una familiar.');
  assert.equal(revised.mode,'occupancy_quote');
  const updated=contexts.get(channel+':'+externalUserId).whatsapp_mvp;
  assert.equal(updated.room_quantity,1);assert.equal(updated.guest_reservation_consent,undefined);
});
