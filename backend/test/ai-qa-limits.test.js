import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import OpenAI from 'openai';
import { createQaContext, withQaContext, prepareQaCall, finishQaCall, qaRequestOptions, qaUsage } from '../src/modules/ai/ai.qa-context.js';
import { executeQaRun } from '../src/modules/ai/ai.qa-worker.js';

test('QA desactiva los reintentos reales del SDK incluso ante HTTP 429', async t => {
  let attempts=0;
  const server=http.createServer((req,res)=>{
    attempts++;req.resume();res.writeHead(429,{'content-type':'application/json','retry-after-ms':'1'});
    res.end(JSON.stringify({error:{message:'Synthetic rate limit',code:'rate_limit_exceeded'}}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const client=new OpenAI({apiKey:'synthetic-local-test',baseURL:'http://127.0.0.1:'+server.address().port+'/v1'});
  const qa=createQaContext({maxCalls:1});
  await withQaContext(qa,async()=>{
    const options=qaRequestOptions({maxRetries:5,timeout:60000});
    assert.equal(options.maxRetries,0);assert.ok(options.timeout<=10000);
    await assert.rejects(async()=>{
      try {await client.responses.create(prepareQaCall({model:'synthetic',input:'Hi'}),options);}
      catch(error){finishQaCall(null,error);throw error;}
    });
    assert.throws(()=>prepareQaCall({model:'synthetic'}),{code:'QA_BUDGET_REACHED'});
  });
  assert.equal(attempts,1);assert.equal(qa.calls.length,1);
  assert.ok(qaUsage(qa).uncertain_tokens>0);
});

test('las peticiones normales conservan sus opciones sin límites de QA',()=>{
  const options={timeout:50000,maxRetries:2};assert.equal(qaRequestOptions(options),options);
  const request={model:'normal',max_output_tokens:4000};assert.equal(prepareQaCall(request),request);
});

test('presupuesto insuficiente bloquea antes de llamar al proveedor',async()=>{
  const qa=createQaContext({maxTokens:1000});
  await withQaContext(qa,()=>assert.throws(()=>prepareQaCall({model:'test',input:'hello'}),{code:'QA_BUDGET_REACHED'}));
  assert.equal(qa.calls.length,0);
});

test('reserva salida, limita la siguiente llamada y conserva uso desconocido',async()=>{
  const qa=createQaContext({maxTokens:7000});
  await withQaContext(qa,()=>{
    const request=prepareQaCall({model:'test',input:'hello'});
    assert.ok(request.max_output_tokens<=2000);
    finishQaCall({id:'r',status:'completed'});
    assert.ok(qa.uncertainTokens>0);assert.equal(qa.reservedTokens,0);
    assert.throws(()=>prepareQaCall({model:'test',input:'next'}),{code:'QA_BUDGET_REACHED'});
  });
});

test('continuación remota desconocida y contexto demasiado grande quedan bloqueados',async()=>{
  for(const request of [{model:'t',previous_response_id:'untracked'}, {model:'t',input:'a'.repeat(90000)}]) {
    const qa=createQaContext();
    await withQaContext(qa,()=>assert.throws(()=>prepareQaCall(request),{code:'QA_BUDGET_REACHED'}));
    assert.equal(qa.calls.length,0);
  }
});

test('continuaciones usan el contexto medido sin acumular reservas UTF-8 anteriores', async () => {
  const qa = createQaContext({maxTokens:45000});
  const instructions = 'a'.repeat(15000);
  await withQaContext(qa, () => {
    prepareQaCall({model:'synthetic', instructions, input:'x'.repeat(1000)});
    finishQaCall({id:'first',status:'completed',usage:{input_tokens:3539,output_tokens:107}});
    const next = prepareQaCall({model:'synthetic',instructions,previous_response_id:'first',
      input:[{type:'function_call_output',call_id:'catalog',output:'y'.repeat(3000)}]});
    assert.equal(next.max_output_tokens, 2000);
    assert.equal(qa.responseBounds.get('first'), 3646);
    assert.ok(qa.reservedTokens + qa.inputTokens + qa.outputTokens <= qa.maxTokens);
    finishQaCall({id:'second',status:'completed',usage:{input_tokens:4500,output_tokens:100}});
    assert.equal(qa.responseBounds.get('second'), 4600);
    assert.equal(qaUsage(qa).total_tokens, 8246);
    assert.equal(qa.budgetHit, false);
  });
});

test('consumo ausente o inválido conserva reserva completa y nunca autoriza contexto desconocido', async () => {
  for (const usage of [undefined, {input_tokens:-1,output_tokens:10}, {input_tokens:100,output_tokens:-1}]) {
    const qa = createQaContext({maxTokens:7000});
    await withQaContext(qa, () => {
      prepareQaCall({model:'synthetic',input:'Hi'});
      const reserved = qa.reservedTokens;
      finishQaCall({id:'unknown-usage',status:'completed',usage});
      assert.equal(qa.uncertainTokens, reserved);
      assert.throws(() => prepareQaCall({model:'synthetic',previous_response_id:'unknown-usage'}),
        {code:'QA_BUDGET_REACHED'});
    });
  }
});

test('la señal de cancelación llega a la solicitud del proveedor',async()=>{
  const controller=new AbortController(),qa=createQaContext({signal:controller.signal});
  await withQaContext(qa,()=>{
    const options=qaRequestOptions();controller.abort();assert.equal(options.signal.aborted,true);
    assert.throws(()=>prepareQaCall({model:'t'}));
  });
});

const run=expires_at=>({id:'synthetic',expected_commit:'a'.repeat(40),expires_at,
  payload:{scenarios:[{channel:'web',messages:['Hi','Next']} ]}});

test('una tanda vencida no ejecuta ni un turno',async()=>{
  let calls=0;
  const result=await executeQaRun(run(new Date(Date.now()-1).toISOString()),{generate:async()=>{calls++;}});
  assert.equal(calls,0);assert.equal(result.stopped,true);assert.equal(result.transcript.length,0);
});

test('caducidad interrumpe un turno pendiente y no inicia el siguiente',async()=>{
  let calls=0;
  const result=await executeQaRun(run(new Date(Date.now()+40).toISOString()),{
    generate:async()=>{calls++;return new Promise(()=>{});},
  });
  assert.equal(calls,1);assert.equal(result.stopped,true);
  assert.equal(result.transcript[0].error_code,'QA_EXPIRED');
});

test('cancelación se observa durante un turno pendiente',async()=>{
  let checks=0,calls=0;
  const result=await executeQaRun(run(new Date(Date.now()+10000).toISOString()),{
    shouldStop:async()=>++checks>1,
    generate:async()=>{calls++;return new Promise(()=>{});},
  });
  assert.equal(calls,1);assert.equal(result.stopped,true);
  assert.equal(result.transcript[0].error_code,'QA_CANCELLED');
});
