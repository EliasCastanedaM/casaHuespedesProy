import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { pool } from '../src/config/db.js';
import { generateAiReply } from '../src/modules/ai/ai.service.js';
import { processMetaMessage } from '../src/modules/meta/meta.service.js';
import { isConversationPresenceCheck, isHumanAssistanceRequest, PRESENCE_REPLY } from '../src/modules/ai/ai.human-assistance.js';
import { classifyServiceInquiry } from '../src/modules/ai/ai.services-info.js';
const examples=['hay alguien?','¿Hay alguien ahí?','Hola, hay alguien','¿Alguien me atiende?','¿Siguen ahí?','me pueden atender?'];
for(const message of examples)test('presencia no equivale a servicio: '+message,()=>{
  assert.equal(isConversationPresenceCheck(message),true);
  assert.equal(classifyServiceInquiry(message).kind,'none');
});
test('servicios concretos y atención humana conservan sus rutas',()=>{
  for(const message of ['¿Hay servicio al cuarto?','¿Tienen piscina?']) {
    assert.equal(isConversationPresenceCheck(message),false);
    assert.equal(classifyServiceInquiry(message).kind,'specific');
  }
  assert.equal(isConversationPresenceCheck('Quiero hablar con una persona'),false);
  assert.equal(isHumanAssistanceRequest('Quiero hablar con una persona'),true);
  assert.equal(isConversationPresenceCheck('Quiero reservar'),false);
});
for(const channel of ['instagram','facebook','whatsapp'])test(channel+': respuesta breve sin datos, IA, reserva, imágenes ni derivación',async t=>{
  let queries=0,modelCalls=0;
  t.mock.method(pool,'query',async()=>{queries++;throw Error('Presence needs no DB');});
  t.mock.method(OpenAI.Responses.prototype,'create',async()=>{modelCalls++;throw Error('Presence needs no model');});
  const history=[{author:'client',content:'Quiero una reserva'},
    {author:'assistant',content:'¿Qué edades tienen los niños?'}];
  for(const message of examples){
    const result=await generateAiReply({channel,externalUserId:'presence-check',message,history});
    assert.equal(result.reply,PRESENCE_REPLY);
    assert.equal(result.mode,'conversation_presence');
    assert.equal(result.image_url,undefined);
    assert.doesNotMatch(result.reply,/servicios|https:|943|reserva confirmada/);
  }
  const sent=[],handoffs=[];
  const result=await processMetaMessage({
    channel,externalUserId:'presence-meta',messageId:'presence-test',messageType:'text',text:'hay alguien?'
  },{
    claim:async()=>true,complete:async()=>{},release:async()=>{},
    getHandoff:async()=>false,setHandoff:async(...args)=>handoffs.push(args),
    loadHistory:async()=>history,generateReply:generateAiReply,
    sendReply:async(_message,reply)=>{sent.push(reply);return {};},
    recordOutgoing:async()=>({}),sleep:async()=>{}
  });
  assert.equal(result.status,'replied');
  assert.deepEqual(sent,[PRESENCE_REPLY]);
  assert.equal(handoffs.length,0);
  assert.equal(queries,0);
  assert.equal(modelCalls,0);
});
