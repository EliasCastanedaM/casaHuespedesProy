import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { SERVICES_PAGE_URL, formatHotelServicesReply } from '../src/modules/ai/ai.services-info.js';
for(const channel of ['instagram','facebook','whatsapp'])test(channel+': servicio al cuarto ausente responde con enlace sin derivar ni usar IA',async t=>{
  const original=env.openai.apiKey;env.openai.apiKey='test-no-network';t.after(()=>{env.openai.apiKey=original;});
  let calls=0;const queries=[];
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{calls++;throw Error('No model');});
  t.mock.method(pool,'query',async sql=>{
    queries.push(sql);
    if(sql.includes('FROM public.services'))return {rows:[]};
    throw Error('An informational interruption must not change booking data');
  });
  const result=await generateAiReply({channel,externalUserId:'unlisted-room-service',
    message:'primero queria saber si traen servicio al cuarto',
    history:[{author:'client',content:'quiero hacer una reserva'},{author:'assistant',content:'¿Qué fechas de entrada y salida necesitas?'}]});
  assert.equal(result.mode,'hotel_services_information');
  assert.match(result.reply,/Actualmente no contamos con ese servicio en nuestra lista de servicios/);
  assert.ok(result.reply.endsWith(SERVICES_PAGE_URL));
  assert.doesNotMatch(result.reply,/Pepe|dueño|943|¿Qué fechas|reserva confirmada/);
  assert.equal(calls,0);
  assert.equal(result.image_url,undefined);
  assert.equal(queries.some(sql=>/INSERT|UPDATE|booking_context|room_categories/.test(sql)),false);
});
test('un servicio aprobado nuevo sí se responde desde su ficha',()=>{
  const service={slug:'servicio-habitacion',name:'Servicio al cuarto',description:'Disponible previa coordinación.',verification_status:'approved',requires_coordination:true};
  const reply=formatHotelServicesReply([service],'¿Tienen servicio al cuarto?');
  assert.match(reply,/Disponible previa coordinación/);
  assert.doesNotMatch(reply,/Actualmente no contamos/);
});
