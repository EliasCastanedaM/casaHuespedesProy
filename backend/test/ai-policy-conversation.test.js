import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { HOTEL_SCOPE_CLASSIFIER_PROMPT } from '../src/modules/ai/ai.scope.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
const rows=[
 {code:'ninos_0_4',review_status:'verified',config:{no_charge_when_using_existing_beds:true,max_children_sharing_parent_bed:2}},
 {code:'ninos_5_8',review_status:'verified',config:{amount_pen:20,charge_frequency:'child_per_night'}},
 {code:'ninos_9_mas',review_status:'verified',config:{adult_rate_confirmed:true}},
 {code:'mascotas',review_status:'pending_review',config:{amount_pen:999,charge_frequency:'pet_per_night'}},
];
function source(t,{history=[],fail=false}={}) {
 const queries=[];
 const key=env.openai.apiKey;env.openai.apiKey='test-no-network';t.after(()=>{env.openai.apiKey=key;});
 t.mock.method(pool,'query',async sql=>{
  queries.push(sql);
  if(sql.includes('FROM public.hotel_policy_rules')) {
   if(fail)throw Object.assign(new Error('private@example.com sensitive raw error'),{code:'42P01'});
   return {rows};
  }
  if(sql.includes('SELECT author, content'))return {rows:history.toReversed()};
  if(sql.includes('ai_usage_events')||sql.includes('last_response_id'))return {rows:[]};
  throw Error('La pregunta informativa no debe consultar ni escribir reservas.');
 });
 t.mock.method(OpenAI.Responses.prototype,'create',async request=>{
  if(request.instructions===HOTEL_SCOPE_CLASSIFIER_PROMPT)return {output_text:'HOTEL',output:[]};
  throw Error('La respuesta de política debe salir de la fuente aprobada, no del generador.');
 });
 return queries;
}
for(const channel of ['whatsapp','facebook','instagram']) {
 test(channel+': captura y consultas posteriores son breves, verificadas y no cambian reservas',async t=>{
  const queries=source(t);
  const send=message=>generateAiReply({channel,externalUserId:'policy-focus',message});
  const six=await send('¿Cuánto paga un niño de 6 años por noche?');
  assert.equal(six.mode,'policy_information');
  assert.equal(six.reply,'Para un niño de 6 años, el cargo adicional es de S/ 20 por noche.');
  assert.doesNotMatch(six.reply,/4 años|9 años|adultos|reserva|fórmula|mínimo|plazas|30/);
  assert.match((await send('¿Cuánto paga mi hijo de cuatro años?')).reply,/no hay cargo adicional.*camas existentes/);
  assert.doesNotMatch((await send('¿Aceptan mascotas?')).reply,/999|S\/|por noche/);
  assert.match((await send('¿Cuánto pagan los niños?')).reply,/^¿Qué edad tiene el niño\?$/);
  assert.equal(queries.some(sql=>/room_categories|booking_context|bookings/.test(sql)),false);
 });
 test(channel+': seguimiento utiliza solo la edad nueva sin modificar la solicitud',async t=>{
  const queries=source(t,{history:[{author:'client',content:'¿Cuánto paga un niño de 6 años?'},{author:'assistant',content:'Para un niño de 6 años, el cargo adicional es de S/ 20 por noche.'}]});
  const result=await generateAiReply({channel,externalUserId:'policy-followup',message:'¿Y uno de 9 años?'});
  assert.equal(result.mode,'policy_information');
  assert.match(result.reply,/9 años.*tarifa de adulto/);
  assert.doesNotMatch(result.reply,/6 años|20|fecha|adultos y niños/);
  assert.equal(queries.some(sql=>/booking_context|bookings/.test(sql)),false);
 });
}
test('una fuente caída no publica precios de respaldo ni mensajes técnicos',async t=>{
 const queries=source(t,{fail:true});const logs=[];
 t.mock.method(console,'warn',(...args)=>logs.push(args.join(' ')));
 const result=await generateAiReply({channel:'whatsapp',externalUserId:'policy-unavailable',message:'¿Cuánto paga un niño de 6 años?'});
 assert.match(result.reply,/No tengo confirmado ese importe/);
 assert.doesNotMatch(result.reply,/S\/|20|30|fórmula|mínimo/);
 assert.doesNotMatch(logs.join(' '),/private@example|sensitive raw error/);
 assert.equal(queries.some(sql=>/booking_context|bookings/.test(sql)),false);
});
