import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { answerGuestRequests, fallbackRequests, validateRequestPlan, previousRequestSource, formatRoomComparison } from '../src/modules/ai/ai.requests.js';
import { formatHotelServicesReply } from '../src/modules/ai/ai.services-info.js';
import { BOOKING_UNDERSTANDING_PROMPT } from '../src/modules/ai/ai.booking-understanding.js';
import { REQUEST_PLAN_PROMPT, shouldPlanRequests } from '../src/modules/ai/ai.requests.js';

const NOW = new Date('2026-11-18T01:00:00Z');
const INITIAL = 'Quisiera que me ayudes en reservar para el día 12/12/2026 para 4 personas\nDime la diferencia entre una habitación cuádruple y dos dobles, para evaluarlo\nIndícame si hay servicio de comidas y tmbn ayúdame a saber cómo llegar';
const RETRY = 'Ayúdame con lo demás que te pedí, la reserva para 4 personas y que me ayudes a ver la diferencia entre una cuadruple y una doble\nAparte de confirmarme si hay servicio de comida';
const categories = [
  { slug:'doble', name:'Doble - 2 Camas', capacity:2, bed_description:'2 camas de 1½ plazas', active_quantity:2 },
  { slug:'familiar', name:'Familiar 1', capacity:5, bed_description:'2 camas de 2 plazas y 1 cama de 1½ plazas', active_quantity:1 },
];
const food = {slug:'comida-bebida',name:'Comida y bebida',description:'Cafetería, restaurante y snack-bar; opciones de fruta, botella de agua, bombones o galletas y menú para niños. El equipo confirma horarios, disponibilidad y el precio de cada consumo.',price_type:'on_request',requires_coordination:true,verification_status:'approved'};
const services = [food,{slug:'wifi',name:'WiFi',description:'Conexión WiFi gratuita disponible en todo el establecimiento.',price_type:'included'}];

function database(t, { context={}, history=[] }={}) {
  const contexts = new Map();
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{throw Error('Offline regression: no provider request');});
  t.mock.method(pool,'query',async(sql,values=[])=>{
    assert.doesNotMatch(sql,/INSERT INTO (?:public\.)?(?:bookings|payments|customers)\b/i);
    const key=values[1];
    if(sql.includes('SELECT booking_context'))return {rows:[{booking_context:contexts.get(key)||structuredClone(context),booking_context_expires_at:new Date(Date.now()+86400000)}]};
    if(sql.includes('INSERT INTO ai_conversations')) {contexts.set(key,JSON.parse(values[2]));return {rows:[]};}
    if(sql.includes('SELECT author, content'))return {rows:[...history].reverse()};
    if(sql.includes('FROM room_categories rc'))return {rows:categories};
    if(sql.includes('FROM public.room_category_occupancy_rates'))return {rows:[]};
    if(sql.includes('FROM public.services'))return {rows:services};
    throw Error('Unexpected query: '+sql.slice(0,90));
  });
  return contexts;
}

test('caso real: responde comparación, comida y llegada; conserva fecha y total sin asumir adultos',async t=>{
  const contexts=database(t);
  for(const channel of ['instagram','whatsapp','facebook']) {
    const id='multi-'+channel;
    const result=await generateAiReply({channel,externalUserId:id,message:INITIAL,now:NOW});
    assert.equal(result.mode,'hotel_multiple_requests');
    assert.match(result.reply,/No tenemos una categoría llamada Cuádruple/);
    assert.match(result.reply,/Familiar 1.*capacidad para 5/);
    assert.match(result.reply,/Doble - 2 Camas.*capacidad para 2/);
    assert.match(result.reply,/cafetería, restaurante y snack-bar/);
    assert.match(result.reply,/Calle Quiñonez 233/);
    assert.match(result.reply,/fecha de salida/);
    assert.doesNotMatch(result.reply,/bombones|galletas|taxi|estacionamiento|https:.*habitaciones|S\/|registrad|reserva confirmada/i);
    assert.ok(result.reply.length<1200);
    const state=contexts.get(id).whatsapp_mvp;
    assert.equal(state.check_in,'2026-12-12');
    assert.equal(state.total_guests,4);
    assert.equal(state.adults,undefined);
    assert.equal(state.children,undefined);
    assert.equal(state.category_slug,undefined);
    assert.equal(state.guest_reservation_consent,undefined);
    assert.equal(state.state,'collecting');
  }
});

test('recupera la petición ignorada en el historial reciente sin repetir la ubicación atendida',async t=>{
  const contexts=database(t,{history:[
    {author:'client',content:'Buenas tardes'},
    {author:'assistant',content:'Bienvenido'},
    {author:'client',content:INITIAL},
    {author:'assistant',content:'📍 Calle Quiñonez 233\nhttps://maps.app.goo.gl/PfXxizCYj1YqeY9x7'},
  ]});
  const result=await generateAiReply({channel:'instagram',externalUserId:'recover-old',message:RETRY,now:NOW});
  assert.match(result.reply,/Familiar 1/);
  assert.match(result.reply,/cafetería/);
  assert.doesNotMatch(result.reply,/maps.app.goo.gl/);
  assert.equal(contexts.get('recover-old').whatsapp_mvp.check_in,'2026-12-12');
  assert.equal(contexts.get('recover-old').whatsapp_mvp.total_guests,4);
});

test('una estancia nueva con preguntas no hereda fechas, personas ni consentimiento anteriores',async t=>{
  const contexts=database(t,{context:{whatsapp_mvp:{state:'quoted',check_in:'2026-12-02',check_out:'2026-12-05',adults:3,children:0,pets:0,total_guests:3,category_slug:'triple',guest_reservation_consent:{confirmed:true}}}});
  const result=await generateAiReply({channel:'instagram',externalUserId:'new-stay-mixed',message:'Quiero otra reserva para 4 personas.\n¿Tienen comida?\n¿Cómo llegar?',now:NOW});
  const state=contexts.get('new-stay-mixed').whatsapp_mvp;
  assert.equal(state.check_in,undefined);
  assert.equal(state.adults,undefined);
  assert.equal(state.total_guests,4);
  assert.equal(state.guest_reservation_consent,undefined);
  assert.match(result.reply,/cafetería/);
});

test('recuperar lo pendiente conserva correcciones posteriores de la misma solicitud',async t=>{
  const contexts=database(t,{context:{whatsapp_mvp:{state:'collecting',check_in:'2026-12-14',total_guests:4,awaiting:'dates'}},history:[
    {author:'client',content:INITIAL},{author:'assistant',content:'Ubicación: https://maps.app.goo.gl/PfXxizCYj1YqeY9x7'},
    {author:'client',content:'Corrijo, ingreso el 14/12/2026'},
  ]});
  const result=await generateAiReply({channel:'instagram',externalUserId:'keep-correction',message:RETRY,now:NOW});
  assert.match(result.reply,/Familiar 1/);
  assert.equal(contexts.get('keep-correction').whatsapp_mvp.check_in,'2026-12-14');
});

test('comparar habitaciones no modifica la selección ni acepta una oferta existente',async t=>{
  const context={whatsapp_mvp:{state:'quoted',check_in:'2026-12-12',check_out:'2026-12-13',category_slug:'doble',reservation_offer:{version:1}}};
  const contexts=database(t,{context});
  const result=await generateAiReply({channel:'instagram',externalUserId:'compare-only',message:'Compara una cuádruple y dos dobles',now:NOW});
  assert.match(result.reply,/Dos dobles distribuyen/);
  assert.equal(contexts.size,0);
});

test('el plan semántico admite expresiones naturales solo con evidencia literal; rechaza hechos inventados',()=>{
  const message='Antes de decidir, ¿cómo dormiríamos repartidos? ¿Preparan algo para almorzar?';
  const raw={in_scope:true,requests:[{topic:'rooms',evidence:'¿cómo dormiríamos repartidos?',source:'current'},{topic:'services',evidence:'¿Preparan algo para almorzar?',source:'current'},{topic:'booking',evidence:'Confirmo dos habitaciones',source:'current'}]};
  assert.equal(shouldPlanRequests(message),true);
  assert.equal(validateRequestPlan(raw,message).length,2);
  assert.equal(validateRequestPlan({in_scope:false,requests:[]},message),null);
  assert.deepEqual(validateRequestPlan({in_scope:true,requests:[{topic:'booking',evidence:INITIAL,source:'previous'}]},message,INITIAL),[]);
});

test('el plan interpretado y los datos validados recorren el servicio real sin llamadas ni acciones extra',async t=>{
  const contexts=database(t);
  const key=env.openai.apiKey;env.openai.apiKey='test-no-network';t.after(()=>{env.openai.apiKey=key;});
  const calls=[];
  t.mock.method(OpenAI.Responses.prototype,'create',async request=>{
    calls.push(request.instructions);
    if(request.instructions===REQUEST_PLAN_PROMPT) {
      assert.equal(request.store,false);
      assert.equal(request.text.format.strict,true);
      return {output_text:JSON.stringify({in_scope:true,requests:fallbackRequests(INITIAL)})};
    }
    assert.equal(request.instructions,BOOKING_UNDERSTANDING_PROMPT);
    return {output_text:JSON.stringify({intent:'new_request',language:'es',proposal:null,updates:[
      {field:'check_in',value:'2026-12-12',evidence:'12/12/2026'},
      {field:'total_guests',value:4,evidence:'4 personas'},
    ],clarification:null,clarification_field:null})};
  });
  const result=await generateAiReply({channel:'instagram',externalUserId:'semantic-case',message:INITIAL,now:NOW});
  assert.equal(calls.length,2);
  assert.match(result.reply,/fecha de salida/);
  assert.equal(contexts.get('semantic-case').whatsapp_mvp.check_in,'2026-12-12');
  assert.equal(contexts.get('semantic-case').whatsapp_mvp.adults,undefined);
});

test('los pendientes de una fuente caída se recuperan y se limpian al responder',async()=>{
  let cleared=false;
  const result=await answerGuestRequests({message:'¿Y lo pendiente que te pedí?',now:NOW},{
    loadHistory:async()=>[],loadPending:async()=>({requests:[{topic:'services',evidence:'¿Hay servicio de comidas?'}]}),
    interpret:async()=>null,answer:async()=> 'Opciones de comida verificadas.',
    booking:async()=>{throw Error('No booking requested');},
    clearPending:async()=>{cleared=true;},remember:async()=>{throw Error('All points answered');},
  });
  assert.match(result.reply,/comida verificadas/);
  assert.equal(cleared,true);
});

test('el resumen general de servicios conserva su imagen al responder también otras consultas',async t=>{
  database(t);
  const result=await generateAiReply({channel:'instagram',externalUserId:'multi-services-image',message:'¿Qué servicios ofrecen? ¿Cómo llegar?',now:NOW});
  assert.match(result.reply,/servicios/);
  assert.match(result.reply,/Calle Quiñonez 233/);
  assert.equal(result.image_url,'https://www.casahuespedespimentel.com/img/galeria/galeria-3.jpg');
});

test('recuperación nunca cruza un saludo ni usa historia para una petición nueva',()=>{
  const history=[{author:'client',content:INITIAL},{author:'assistant',content:'algo'},{author:'client',content:'Hola'}];
  assert.equal(previousRequestSource('¿Y lo demás que te pedí?',history),'');
  assert.equal(previousRequestSource('Quiero reservar',history.slice(0,2)),'');
  assert.equal(previousRequestSource('Quiero otra reserva, y lo demás que te pedí',history.slice(0,2)),'');
});

test('fallos de una fuente no descartan las otras peticiones ni los datos de estadía',async()=>{
  const saved=[];
  const result=await answerGuestRequests({message:INITIAL,now:NOW},{
    interpret:async()=>{throw Error('timeout');},loadHistory:async()=>[],
    answer:async topic=>{if(topic==='services')throw Error('source unavailable');return topic==='rooms'?'Comparación verificada':'📍 Ubicación verificada';},
    booking:async evidence=>{saved.push(evidence);return {reply:'¿Qué fecha de salida necesitas? 😊'};},
    remember:async pending=>{assert.equal(pending.length,1);assert.equal(pending[0].topic,'services');},
  });
  assert.match(result.reply,/Comparación verificada/);
  assert.match(result.reply,/fecha de salida/);
  assert.ok(saved[0].includes('12/12/2026'));
});

test('comida usa una respuesta breve sin duplicar avisos; la comparación utiliza el catálogo recibido',()=>{
  const reply=formatHotelServicesReply(services,'¿Hay servicio de comidas?',{concise:true});
  assert.ok(reply.length<180);
  assert.equal((reply.match(/equipo confirma/gi)||[]).length,1);
  assert.match(formatHotelServicesReply(services,'¿Preparan algo para almorzar?',{concise:true}),/cafetería, restaurante y snack-bar/);
  const comparison=formatRoomComparison([{slug:'doble',name:'Doble actual',capacity:2,bed_description:'2 camas registradas'}],'Diferencia entre una cuádruple y dos dobles');
  assert.match(comparison,/Doble actual/);
  assert.doesNotMatch(comparison,/Familiar 1/);
  assert.deepEqual(fallbackRequests(INITIAL).map(x=>x.topic),['booking','rooms','services','location']);
});
