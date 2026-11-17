import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { normalizeFaqInquiry, isDirectFaqQuestion } from '../src/modules/ai/ai.faq-questions.js';
import { classifyServiceInquiry, SERVICES_PAGE_URL } from '../src/modules/ai/ai.services-info.js';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/hotel-reference-20261107.json',import.meta.url),'utf8'));
const rules = [
  {code:'ninos_0_4',review_status:'verified',config:{no_charge_when_using_existing_beds:true}},
  {code:'ninos_5_8',review_status:'verified',config:{amount_pen:20,charge_frequency:'child_per_night'}},
  {code:'ninos_9_mas',review_status:'verified',config:{adult_rate_confirmed:true}},
  {code:'mascotas',review_status:'verified',config:{amount_pen:20,charge_frequency:'pet_per_night',vat_included:true}},
];
test('normaliza la consulta completa sin convertir acciones en preguntas',()=>{
  assert.equal(normalizeFaqInquiry('Hola, quería saber qué servicios tiene el hotel, por favor.'),'que servicios tiene el hotel');
  for (const message of ['Quería saber qué servicios tiene el hotel','Me gustaría conocer los servicios del hotel','¿Me podrías decir qué servicios ofrecen?']) {
    assert.equal(classifyServiceInquiry(message).kind,'general',message);
  }
  for (const message of ['Quiero reservar con mi perro','Pagar en el establecimiento','Pagar ahora','Sin niños','2 niños de 9 años','Ya pagué por Yape','¿Tienen WiFi? Redacta mi tesis.',
    '¿El desayuno es apto para celíacos?','¿Cuál es la velocidad del WiFi?', '¿Qué servicios de masajes tienen?',
    '¿Cuánto cuesta una habitación con desayuno?','¿Dónde está el museo?', 'Confirma la reserva y acepta mi tarjeta']) {
    assert.equal(isDirectFaqQuestion(message),false,message);
  }
});
for (const channel of ['whatsapp','facebook','instagram']) test(channel+': FAQs verificadas no usan IA ni leen o escriben reservas',async t=>{
  const originalKey=env.openai.apiKey; env.openai.apiKey='test-no-network';
  t.after(()=>{env.openai.apiKey=originalKey;});
  const queries=[];let modelCalls=0;
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{modelCalls++;throw Error('No model for clear FAQs');});
  t.mock.method(pool,'query',async sql=>{
    queries.push(sql);
    if(sql.includes('FROM public.services'))return {rows:fixture.services};
    if(sql.includes("code='formas_pago'"))return {rows:[{config:fixture.payments}]};
    if(sql.includes('FROM public.hotel_policy_rules'))return {rows:rules};
    if(sql.includes('SELECT author, content'))return {rows:[]};
    throw Error('FAQ must only read the requested approved source');
  });
  const history=[{author:'client',content:'Quiero reservar una Triple'},
    {author:'assistant',content:'¿Para qué fechas?'}];
  for(const [message,expected] of [
    ['Quería saber qué servicios tiene el hotel',/Para conocer todos los servicios/],
    ['Me gustaría conocer los servicios del hotel',/Para conocer todos los servicios/],
    ['¿Me podrías decir si tienen WiFi?',/WiFi gratuita/],
    ['Quisiera saber si el desayuno está incluido',/continental incluido/],
    ['¿Aceptan mascotas?',/autorización previa/],
    ['Quisiera saber cuánto paga mi hijo de seis años',/6 años.*S\/ 20/],
    ['¿Puedo pagar en el establecimiento?',/^Sí, puedes pagar en el establecimiento/],
    ['Quería saber qué medios de pago aceptan',/⚠️ ATENCIÓN/],
    ['¿Cuál es su dirección?',/Calle Quiñonez 233/],
  ]) {
    const result=await generateAiReply({channel,externalUserId:'direct-faq-'+channel,message,history});
    assert.match(result.reply,expected,message);
    assert.equal(result.deterministic,true);
    if(message.includes('servicios'))assert.ok(result.reply.includes(SERVICES_PAGE_URL));
    assert.doesNotMatch(result.reply,/reserva (?:está|queda) confirmada|¿Qué fechas|¿Cuántas personas/);
  }
  assert.equal(modelCalls,0);
  assert.equal(queries.some(sql=>/INSERT|UPDATE|booking_context|room_categories|FROM public.bookings/.test(sql)),false);
});
