import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { HOTEL_SCOPE_CLASSIFIER_PROMPT } from '../src/modules/ai/ai.scope.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { paymentInformationType, formatHotelPaymentInfoReply, PAYMENT_AVAILABILITY_WARNING } from '../src/modules/ai/ai.payment-info.js';

const info={"bank":{"name":"BCP","account_number":"12345678901234","cci":"12345678901234567890"},"cards":["Visa","Mastercard"],"yape":"900000001","plin":"900000002"};
const questions=["¿Puedo pagar en el establecimiento?","Puedo pagar en el hotel","¿Podemos pagar al llegar?","¿Se puede pagar en el hospedaje?","¿Es posible pagar a la llegada?"];
for(const message of questions)test('consulta de pago sin afirmar una reserva: '+message,()=>{
  assert.equal(paymentInformationType(message),'payment_information');
  assert.equal(formatHotelPaymentInfoReply(info,message),'Sí, puedes pagar en el establecimiento.');
});
test('la elección expresa de pago sigue perteneciendo al cierre autorizado',()=>{
  assert.equal(paymentInformationType('Quiero pagar en el establecimiento'),null);
  assert.equal(paymentInformationType('Pagar al llegar'),null);
});
test('una fuente ausente no confirma un medio de pago',()=>{
  assert.match(formatHotelPaymentInfoReply(null,questions[0]),/^No puedo confirmar/);
});
for(const channel of ['whatsapp','facebook','instagram'])test(channel+': consultar el pago no accede ni modifica reservas',async t=>{
  const key=env.openai.apiKey;
  env.openai.apiKey='test-no-network';
  t.after(()=>{env.openai.apiKey=key;});
  const queries=[];
  t.mock.method(pool,'query',async sql=>{
    queries.push(sql);
    if(sql.includes('FROM public.hotel_policy_rules'))return {rows:[{config:info}]};
    if(sql.includes('SELECT author, content'))return {rows:[]};
    if(sql.includes('ai_usage_events')||sql.includes('last_response_id'))return {rows:[]};
    throw Error('Una consulta de pago no debe acceder a reservas ni escribir sus datos.');
  });
  t.mock.method(OpenAI.Responses.prototype,'create',async request=>{
    if(request.instructions===HOTEL_SCOPE_CLASSIFIER_PROMPT)return {output_text:'HOTEL',output:[]};
    throw Error('El medio de pago debe responderse desde la fuente verificada.');
  });
  // Even a conversation that mentioned a booking must not imply it was created.
  const history=[{author:'client',content:'Quisiera reservar una habitación.'},
    {author:'assistant',content:'¿Qué fechas tienes previstas?'}];
  const result=await generateAiReply({channel,externalUserId:'payment-question',history,message:questions[0]});
  assert.equal(result.mode,'hotel_payment_information');
  assert.equal(result.reply,'Sí, puedes pagar en el establecimiento.');
  assert.doesNotMatch(result.reply,/registrad|confirmad|separad|reserva|pendiente/i);
  for(const message of ['¿Qué otros medios de pago hay?','¿Y si quiero pagar ahora? ¿Existe algún link o algo?']) {
    const payment=await generateAiReply({channel,externalUserId:'payment-question',history,message});
    assert.equal(payment.mode,'hotel_payment_information');
    assert.ok(payment.reply.endsWith(PAYMENT_AVAILABILITY_WARNING));
  }
  assert.equal(queries.some(sql=>/booking_context|bookings|room_categories/i.test(sql)),false);
});

test('medios de pago y enlace llevan solo el aviso temporal de disponibilidad',()=>{
  for(const message of ['¿Qué otros medios de pago hay?','¿Cuál es su CCI?','¿Puedo pagar por Yape?','¿Y si quiero pagar ahora? ¿Existe algún link o algo?']) {
    assert.equal(paymentInformationType(message),'payment_information');
    const reply=formatHotelPaymentInfoReply(info,message);
    assert.ok(reply.endsWith(PAYMENT_AVAILABILITY_WARNING));
    assert.match(reply,/⚠️ ATENCIÓN: No realices ningún pago/);
    assert.equal(PAYMENT_AVAILABILITY_WARNING,"⚠️ ATENCIÓN: No realices ningún pago hasta que nuestro equipo confirme la disponibilidad para las fechas de tu estadía.");
    assert.equal(reply.split(PAYMENT_AVAILABILITY_WARNING).length,2);
    assert.doesNotMatch(reply,/reserva (?:está|queda) confirmada|registramos|https?:/i);
  }
  assert.equal(paymentInformationType('Pagar ahora'),null);
  assert.ok(formatHotelPaymentInfoReply(null,'¿Qué medios de pago hay?').endsWith(PAYMENT_AVAILABILITY_WARNING));
});
