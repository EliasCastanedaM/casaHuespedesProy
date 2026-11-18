import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { createQaContext, currentQa, withQaContext, prepareQaCall, finishQaCall, qaUsage } from '../src/modules/ai/ai.qa-context.js';
import { validateQaPayload, executeQaRun, processNextQaRun } from '../src/modules/ai/ai.qa-worker.js';
import { REQUEST_PLAN_PROMPT, fallbackRequests } from '../src/modules/ai/ai.requests.js';
import { BOOKING_UNDERSTANDING_PROMPT } from '../src/modules/ai/ai.booking-understanding.js';

const category={slug:'matrimonial',name:'Matrimonial Estándar',capacity:2,bed_description:'1 cama de 2 plazas',price_per_night:120,active_quantity:1};
const wifi={slug:'wifi',name:'WiFi',description:'Conexión WiFi gratuita disponible en todo el establecimiento.',price_type:'included'};
function publicSources(t, normalWrites=[]) {
  t.mock.method(pool,'connect',async()=>{throw Error('No real booking transaction permitted');});
  t.mock.method(pool,'query',async(sql,values=[])=>{
    if(sql.includes('FROM room_categories rc'))return {rows:[category]};
    if(sql.includes('FROM public.room_category_occupancy_rates'))return {rows:[]};
    if(sql.includes('FROM public.services'))return {rows:[wifi]};
    if(sql.includes('SELECT booking_context')) {assert.equal(currentQa(),undefined);return {rows:[]};}
    if(sql.includes('INSERT INTO ai_conversations')) {assert.equal(currentQa(),undefined);normalWrites.push(values);return {rows:[]};}
    throw Error('Forbidden QA database access: '+sql.slice(0,80));
  });
}

test('private conversations and normal guest requests remain isolated during concurrent execution',async t=>{
  publicSources(t);
  const key=env.openai.apiKey;env.openai.apiKey='';t.after(()=>{env.openai.apiKey=key;});
  const a=createQaContext(),b=createQaContext();
  await Promise.all([
    withQaContext(a,()=>generateAiReply({channel:'instagram',externalUserId:'qa-a',message:'Quiero reservar para 4 personas el 12/12/2026'})),
    withQaContext(b,()=>generateAiReply({channel:'whatsapp',externalUserId:'qa-b',message:'Quiero reservar para 2 personas el 15/12/2026'})),
    generateAiReply({channel:'facebook',externalUserId:'real-guest-context-test',message:'Quiero reservar para 3 personas el 20/12/2026'}),
  ]);
  assert.equal(a.contexts.get('instagram:qa-a').whatsapp_mvp.total_guests,4);
  assert.equal(b.contexts.get('whatsapp:qa-b').whatsapp_mvp.total_guests,2);
  assert.equal(a.contexts.size,1);
  assert.equal(b.contexts.size,1);
  assert.equal(currentQa(),undefined);
});

test('a payment selection after staff approval cannot create a real booking in QA',async t=>{
  publicSources(t);
  const qa=createQaContext();
  qa.contexts.set('instagram:qa-payment',{whatsapp_mvp:{state:'awaiting_payment_choice',
    check_in:'2026-12-12',check_out:'2026-12-13',adults:2,children:0,child_ages:[],pets:0,total_guests:2,
    category_slug:'matrimonial',customer_name:'Persona de prueba',customer_email:'qa@example.invalid',
    customer_phone:'51900000000',staff_confirmation:{category_slug:'matrimonial',total_amount:120}}});
  const result=await withQaContext(qa,()=>generateAiReply({channel:'instagram',externalUserId:'qa-payment',message:'1'}));
  assert.equal(result.mode,'qa_transaction_blocked');
  assert.deepEqual(qa.blockedActions,['create_booking']);
});

test('real provider response usage is collected in QA without guest telemetry writes',async t=>{
  publicSources(t);
  const key=env.openai.apiKey;env.openai.apiKey='qa-test-no-network';t.after(()=>{env.openai.apiKey=key;});
  const message='Quiero reservar para 4 personas el 12/12/2026.\n¿Tienen WiFi?';
  t.mock.method(OpenAI.Responses.prototype,'create',async request=>{
    let output;
    if(request.instructions===REQUEST_PLAN_PROMPT)output={in_scope:true,requests:fallbackRequests(message)};
    else {
      assert.equal(request.instructions,BOOKING_UNDERSTANDING_PROMPT);
      output={intent:'new_request',language:'es',proposal:null,clarification:null,clarification_field:null,
        updates:[{field:'check_in',value:'2026-12-12',evidence:'12/12/2026'},{field:'total_guests',value:4,evidence:'4 personas'}]};
    }
    return {id:'test-response',status:'completed',model:'test-model',output_text:JSON.stringify(output),usage:{input_tokens:300,output_tokens:50,input_tokens_details:{cached_tokens:100}}};
  });
  const qa=createQaContext();
  const result=await withQaContext(qa,()=>generateAiReply({channel:'instagram',externalUserId:'qa-usage',message}));
  assert.match(result.reply,/WiFi/);
  assert.equal(qaUsage(qa).input_tokens,600);
  assert.equal(qaUsage(qa).output_tokens,100);
  assert.equal(qaUsage(qa).cached_input_tokens,200);
  assert.equal(qaUsage(qa).model_responses,2);
});

test('a call budget prevents additional model requests and records safe provider errors',async()=>{
  const qa=createQaContext({maxCalls:1});
  await withQaContext(qa,async()=>{
    const request=prepareQaCall({model:'test'});
    assert.equal(request.max_output_tokens,2000);
    finishQaCall(null,{code:'invalid_api_key',message:'must never be stored'});
    assert.throws(()=>prepareQaCall({model:'test'}),{code:'QA_BUDGET_REACHED'});
  });
  assert.equal(qa.calls.length,1);
  assert.equal(qa.budgetHit,true);
  assert.doesNotMatch(JSON.stringify(qaUsage(qa)),/must never be stored/);
});

test('worker creates synthetic identities, keeps separate histories and returns only safe state fields',async()=>{
  let n=0;
  const run={id:'isolated-run',expected_commit:'a'.repeat(40),expires_at:new Date(Date.now()+60000).toISOString(),
    payload:{scenarios:[{name:'Presencia',channel:'instagram',messages:['Hola','¿Hay alguien?']} ]}};
  const result=await executeQaRun(run,{generate:async input=>{
    assert.match(input.externalUserId,/^private-qa-isolated-run-/);
    assert.equal(input.history.length,n*2);n++;
    currentQa().contexts.set(input.channel+':'+input.externalUserId,{whatsapp_mvp:{state:'collecting',customer_email:'secret@example.invalid',check_in:'2026-12-12'}});
    return {reply:'Soy el asesor virtual.',mode:'conversation_presence'};
  }});
  assert.equal(result.transcript.length,2);
  assert.equal(result.usage.total_tokens,0);
  assert.doesNotMatch(JSON.stringify(result),/secret@example/);
});

test('invalid or oversized scenarios cannot run arbitrary channels or unbounded conversations',()=>{
  for(const payload of [{},{scenarios:[]},{scenarios:[{channel:'other',messages:['Hi']}]},
    {scenarios:[{channel:'web',messages:Array(7).fill('Hi')}]}])assert.throws(()=>validateQaPayload(payload));
  assert.throws(()=>validateQaPayload({scenarios:Array(4).fill({channel:'web',messages:Array(6).fill('Hi')})}));
});

test('the queue claims the pinned release only and prevents duplicate processing in one instance',async()=>{
  let release, executions=0, claims=0;
  const wait=new Promise(r=>{release=r;});
  const db={query:async(sql,values)=>{
    if(sql.includes('WITH candidate')) {claims++;assert.deepEqual(values,['a'.repeat(40)]);assert.match(sql,/FOR UPDATE SKIP LOCKED/);return {rows:[{id:'run'}]};}
    return {rows:[]};
  }};
  const first=processNextQaRun(db,{commit:'a'.repeat(40),execute:async()=>{executions++;await wait;return {stopped:false};}});
  assert.equal(await processNextQaRun(db,{commit:'a'.repeat(40)}),false);
  release();assert.equal(await first,true);
  assert.equal(claims,1);assert.equal(executions,1);
});
