import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { processMetaMessage } from '../src/modules/meta/meta.service.js';
import { buildHotelAssistantPrompt } from '../src/modules/ai/ai.prompt.js';
import { classifyServiceInquiry, selectHotelServices, formatHotelServicesReply,
  resolveServiceMessage, isSimpleServiceInquiry } from '../src/modules/ai/ai.services-info.js';
const {services}=JSON.parse(readFileSync(new URL('./fixtures/hotel-reference-20261107.json',import.meta.url),'utf8'));
const channels=['whatsapp','facebook','instagram'];

for(const message of ['¿Tienen aire acondicionado?','¿Tienen servicio de aire acondicionado?',
  'Pero y el aire acondicionado?','¿Tienen piscina?','¿Ofrecen servicio de masajes?',
  '¿Qué servicios tienen de aromaterapia?','¿Tienen secadora?']) {
  test('servicio desconocido sin catálogo: '+message,()=>{
    const selected=selectHotelServices(services,message);
    assert.equal(selected.intent.kind,'specific');
    assert.equal(selected.services.length,0);
    const answer=formatHotelServicesReply(services,message);
    assert.match(answer,/No tengo un servicio confirmado/);
    assert.doesNotMatch(answer,/WiFi|Netflix|desayuno|lavandería|no (?:tenemos|hay|contamos)/i);
  });
}

for(const [message,slug,expected] of [
  ['¿Tienen WiFi?','wifi',/WiFi gratuita/],
  ['¿Y el desayuno?','desayuno-continental',/continental incluido/],
  ['¿Hay internet?','wifi',/WiFi/],
  ['¿Ofrecen lavado?','lavanderia',/Lavandería de pago/],
  ['¿Tienen ventiladores?','ventilador',/ventilador/],
])test('solo el tema solicitado: '+message,()=>{
  assert.deepEqual(selectHotelServices(services,message).services.map(s=>s.slug),[slug]);
  const reply=formatHotelServicesReply(services,message);
  assert.match(reply,expected);
  assert.ok(reply.split(/\s+/).length<65,reply);
  assert.doesNotMatch(reply,/¡Claro!|¿Quieres|¿Deseas/);
});

test('resumen, catálogo completo y ampliación son peticiones diferentes',()=>{
  const brief=formatHotelServicesReply(services,'¿Qué servicios tienen?');
  const all=formatHotelServicesReply(services,'Todos los servicios');
  const details=formatHotelServicesReply(services,'Todos los servicios con detalles');
  assert.match(brief,/Incluidos en la estadía/);
  assert.doesNotMatch(brief,/cámaras|solárium|lavandería/i);
  assert.ok(brief.length<all.length && all.length<details.length);
  assert.match(all,/S\/ 20.*mascota.*noche/);
  assert.match(all,/autorización/i);
  assert.match(details,/cuarto piso/);
  assert.equal(classifyServiceInquiry('¿Hay restaurantes cerca?').kind,'none');
  assert.equal(classifyServiceInquiry('¿Hay algo más barato?').kind,'none');
  assert.equal(classifyServiceInquiry('¿Tienen habitaciones?').kind,'none');
});

test('catálogo ampliado reconoce nombres nuevos; inactivos o pendientes no son fuente',()=>{
  const custom={slug:'secador',name:'Secador de cabello',description:'Disponible previa coordinación.',price_type:'on_request',requires_coordination:true,verification_status:'approved'};
  const reply=formatHotelServicesReply([...services,custom],'¿Tienen secador de cabello?');
  assert.match(reply,/Secador de cabello/);
  assert.match(reply,/confirmará la tarifa y disponibilidad/);
  assert.doesNotMatch(reply,/WiFi/);
  for(const extra of [{is_active:false},{verification_status:'pending_review'}]) {
    assert.match(formatHotelServicesReply([{...custom,...extra}],'¿Tienen secador de cabello?'),/No tengo/);
  }
});

test('no pierde el precio numérico ni la autorización del servicio específico',()=>{
  const custom={slug:'wifi',name:'WiFi',description:'Acceso con autorización previa.',price_type:'on_request',price:8,requires_coordination:true};
  const reply=formatHotelServicesReply([custom],'¿Tienen WiFi?');
  assert.match(reply,/S\/ 8\.00/);
  assert.match(reply,/autorización previa/);
});

test('el seguimiento usa solo el tema más reciente y no atraviesa un cambio de tema',()=>{
  const history=[{author:'client',content:'¿Tienen desayuno?'},{author:'assistant',content:'Desayuno continental incluido.'}];
  const query=resolveServiceMessage('¿Está incluido?',history);
  assert.deepEqual(selectHotelServices(services,query).services.map(s=>s.slug),['desayuno-continental']);
  assert.equal(resolveServiceMessage('¿Está incluido?',[...history,{author:'client',content:'Quiero una triple'}]),'¿Está incluido?');
  assert.equal(resolveServiceMessage('¿Tienen piscina?',history),'¿Tienen piscina?');
  assert.equal(isSimpleServiceInquiry('¿Tienen WiFi?'),true);
  assert.equal(isSimpleServiceInquiry('¿Tienen WiFi? Redacta mi tesis.'),false);
});

function sourceMocks(t,{history=[],context={}}={}) {
  const queries=[];
  t.mock.method(pool,'query',async(sql,params=[])=>{
    queries.push({sql,params});
    if(sql.includes('FROM public.services'))return {rows:services};
    if(sql.includes('SELECT booking_context'))return {rows:[{booking_context:structuredClone(context),booking_context_expires_at:new Date(Date.now()+86400000)}]};
    if(sql.includes('SELECT author, content'))return {rows:history.toReversed()};
    if(sql.includes('last_response_id')||sql.includes('ai_usage_events'))return {rows:[]};
    throw new Error('Unexpected query');
  });
  return queries;
}

for(const channel of channels)test(channel+': preguntas y seguimientos preservan todas las fases de reserva sin LLM',async t=>{
  let stored={};
  const queries=[];
  t.mock.method(pool,'query',async(sql,params=[])=>{
    queries.push(sql);
    if(sql.includes('FROM public.services'))return {rows:services};
    if(sql.includes('SELECT author, content'))return {rows:[]};
    if(sql.includes('SELECT booking_context'))return {rows:[{booking_context:stored,booking_context_expires_at:new Date(Date.now()+86400000)}]};
    throw new Error('An informational turn must not mutate or quote');
  });
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{throw new Error('A simple service question needs no model');});
  for(const phase of ['collecting','quoted','awaiting_customer_name','awaiting_customer_email','awaiting_payment_method','handoff','booked']) {
    stored={state:'whatsapp_mvp',whatsapp_mvp:{state:phase,intent_id:'existing',adults:2,children:1,child_ages:[6],pets:1,
      check_in:'2026-12-20',check_out:'2026-12-22',room_preferences:{view:'sea'},pricing_quote:{total_amount:460},
      staff_confirmation:{category_slug:'triple',total_amount:460}}};
    const before=structuredClone(stored);
    for(const message of ['¿Tienen aire acondicionado?','¿Tienen WiFi?','¿Y el desayuno?','¿Tienen piscina?','¿Qué servicios tienen?']) {
      const result=await generateAiReply({channel,externalUserId:'relevance-'+phase,message});
      assert.equal(result.mode,'hotel_services_information');
      assert.deepEqual(stored,before);
      assert.doesNotMatch(result.reply,/460|nombre|correo|¿Qué fechas|habitaciones libres/i);
    }
  }
  assert.equal(queries.some(sql=>/INSERT|UPDATE|bookings|room_categories/.test(sql)),false);
});

test('seguimiento desde el historial persistido se resuelve sin reabrir la reserva',async t=>{
  const queries=sourceMocks(t,{history:[{author:'client',content:'¿Tienen desayuno?'},{author:'assistant',content:'Sí, está incluido.'}]});
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{throw new Error('No model');});
  const result=await generateAiReply({channel:'instagram',externalUserId:'stored-followup',message:'¿Está incluido?'});
  assert.match(result.reply,/continental incluido/);
  assert.doesNotMatch(result.reply,/WiFi|Netflix/);
  assert.ok(queries.some(x=>x.sql.includes('SELECT author, content')));
  assert.equal(queries.some(x=>/INSERT|UPDATE/.test(x.sql)),false);
});

for(const [message,expected] of [
  ['Do you have WiFi?',/Free WiFi/],['Do you have air conditioning?',/confirmed information/],
  ['And the breakfast?',/Continental breakfast is included/],['Is there a swimming pool?',/confirmed information/],
])test('inglés sin catálogo ni traducción comercial inventada: '+message,async t=>{
  sourceMocks(t);
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{throw new Error('No model for reviewed translation');});
  const result=await generateAiReply({channel:'facebook',externalUserId:'english-'+message,message});
  assert.match(result.reply,expected);
  assert.doesNotMatch(result.reply,/Incluido|estadía|¿|Claro|servicios/);
});

test('una traducción no revisada recibe solo la fuente pertinente, con cargos completos',async t=>{
  sourceMocks(t);
  const savedKey=env.openai.apiKey;env.openai.apiKey='test-no-network';t.after(()=>{env.openai.apiKey=savedKey;});
  const requests=[];
  t.mock.method(OpenAI.Responses.prototype,'create',async req=>{
    requests.push(req);
    return {id:'translated-laundry',output:[],output_text:'Laundry is a paid service, subject to coordination. Our team confirms the fee and availability.'};
  });
  const result=await generateAiReply({channel:'facebook',externalUserId:'english-laundry',message:'Do you have laundry?'});
  assert.match(result.reply,/paid service/);
  assert.equal(requests.length,1);
  const official=requests[0].input.find(x=>x.role==='developer').content;
  assert.match(official,/Lavandería de pago/);
  assert.doesNotMatch(official,/WiFi|Netflix|S\/ 20/);
  assert.equal(requests[0].input.at(-1).content,'Do you have laundry?');
});

for(const channel of channels)test(channel+': la primera pregunta sale por Meta sin menú ni redes, solo una respuesta',async t=>{
  sourceMocks(t);
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{throw new Error('No model');});
  const sent=[];
  const result=await processMetaMessage({channel,externalUserId:'new-question',messageId:'new',messageType:'text',text:'¿Tienen aire acondicionado?'},{
    claim:async()=>true,release:async()=>{},complete:async()=>{},getHandoff:async()=>false,
    loadHistory:async()=>[],isFirstMetaIncomingMessage:async()=>true,
    sendReply:async(_msg,text)=>{sent.push(text);return {messages:[{id:'accepted'}]};},
    recordOutgoing:async()=>{},sleep:async()=>{},
  });
  assert.equal(result.status,'replied');
  assert.equal(sent.length,1);
  assert.match(sent[0],/No tengo un servicio confirmado/);
  assert.doesNotMatch(sent[0],/1️⃣|WiFi|https:|Bienvenido/);
});

test('contrato único contiene ocho capas, datos oficiales y prioridad de la pregunta',()=>{
  const prompt=buildHotelAssistantPrompt();
  for(let i=1;i<=8;i++)assert.match(prompt,new RegExp('\\n'+i+'\\. '));
  assert.match(prompt,/una a tres oraciones/);
  assert.match(prompt,/historial solo aclara/);
  assert.match(prompt,/servicio desconocido no es una solicitud del catálogo/);
  assert.match(prompt,/invalida la aprobación/);
});

test('responde la parte confirmada y reconoce incertidumbre en una consulta mixta',()=>{
  const answer=formatHotelServicesReply(services,'¿Tienen WiFi y servicio de aromaterapia?');
  assert.match(answer,/No tengo un servicio confirmado/);
  assert.match(answer,/WiFi gratuita/);
  assert.doesNotMatch(answer,/Netflix|desayuno/i);
});

test('un seguimiento sobre horario no se responde repitiendo que el desayuno está incluido',()=>{
  const query=resolveServiceMessage('¿A qué hora?',[{author:'client',content:'¿Tienen desayuno?'}]);
  assert.match(formatHotelServicesReply(services,query),/No tengo información confirmada sobre el horario/);
  assert.doesNotMatch(formatHotelServicesReply(services,query),/incluido/);
});

test('preguntar por la terraza no enumera solárium ni mobiliario exterior',()=>{
  const answer=formatHotelServicesReply(services,'¿Tienen terraza?');
  assert.match(answer,/cuarto piso/);
  assert.doesNotMatch(answer,/solárium|mobiliario/);
});

test('las herramientas quedan limitadas al tema original y no repiten consultas a la fuente',async t=>{
  const queries=sourceMocks(t);
  const savedKey=env.openai.apiKey;env.openai.apiKey='test-no-network';t.after(()=>{env.openai.apiKey=savedKey;});
  const requests=[];
  t.mock.method(OpenAI.Responses.prototype,'create',async req=>{
    requests.push(req);
    if(requests.length<=2)return {id:'call-'+requests.length,output:[{type:'function_call',name:'listar_servicios',arguments:'{}',call_id:'service-'+requests.length}]};
    return {id:'final-laundry',output:[],output_text:'Laundry is paid and subject to coordination; the team confirms the fee and availability.'};
  });
  await generateAiReply({channel:'instagram',externalUserId:'scoped-tool',message:'Do you have laundry?'});
  for(const req of requests.slice(1)) {
    const data=JSON.parse(req.input[0].output);
    assert.deepEqual(data.services.map(s=>s.slug),['lavanderia']);
    assert.equal(data.services[0].requires_coordination,true);
    assert.doesNotMatch(req.input[0].output,/WiFi|Netflix|mascotas|source_url/);
    assert.equal(req.max_output_tokens,undefined);
  }
  // One source lookup for grounding, one for the first tool; the repeated call is cached.
  assert.equal(queries.filter(q=>q.sql.includes('FROM public.services')).length,2);
});

test('una respuesta marcada incompleta no se envía como si fuera una respuesta final',async t=>{
  sourceMocks(t);
  const savedKey=env.openai.apiKey;env.openai.apiKey='test-no-network';t.after(()=>{env.openai.apiKey=savedKey;});
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>({id:'incomplete',status:'incomplete',output:[],output_text:'Laundry costs',incomplete_details:{reason:'max_output_tokens'}}));
  await assert.rejects(generateAiReply({channel:'facebook',externalUserId:'partial',message:'Do you have laundry?'}),{code:'AI_INCOMPLETE_RESPONSE'});
});

test('las incidencias de catálogo no imprimen mensajes SQL ni datos del huésped',async t=>{
  const logs=[];
  t.mock.method(console,'warn',(...args)=>logs.push(args.join(' ')));
  t.mock.method(pool,'query',async()=>{throw Object.assign(new Error('guest@example.com 51912345678 INSERT INTO private'),{code:'42P01'});});
  const result=await generateAiReply({channel:'whatsapp',externalUserId:'private-incident',message:'¿Tienen WiFi?'});
  assert.equal(result.mode,'hotel_services_unavailable');
  assert.match(logs.join(' '),/42P01/);
  assert.doesNotMatch(logs.join(' '),/guest@example|519123|INSERT INTO/);
});

test('varios seguimientos consecutivos mantienen el tema sin heredar subpreguntas anteriores',()=>{
  const history=[{author:'client',content:'¿Tienen desayuno?'},{author:'assistant',content:'Sí.'},
    {author:'client',content:'¿A qué hora?'},{author:'assistant',content:'El horario no está confirmado.'}];
  const query=resolveServiceMessage('¿Es gratis?',history);
  assert.match(formatHotelServicesReply(services,query),/continental incluido/);
  assert.doesNotMatch(query,/A qué hora/);
});
