import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { withAssistantEmoji } from '../src/modules/ai/ai.presentation.js';
import { SERVICES_IMAGE_URL, SERVICES_PAGE_URL } from '../src/modules/ai/ai.services-info.js';
import { processMetaMessage, sendMetaReply } from '../src/modules/meta/meta.service.js';

test('presentación conserva importes y enlaces y evita duplicar emojis',()=>{
  for(const text of ['El cargo es S/ 20.','https://www.casahuespedespimentel.com/servicios','¿Qué edad tiene el niño?']) {
    assert.equal(withAssistantEmoji(text),text+' 😊');
    assert.equal(withAssistantEmoji(withAssistantEmoji(text)),withAssistantEmoji(text));
  }
  for(const text of ['⚠️ ATENCIÓN','¡Hola! 👋','1️⃣ Habitaciones',''])assert.equal(withAssistantEmoji(text),text);
});
for(const channel of ['whatsapp','facebook','instagram'])test(channel+': resumen, emoji y fotografía se recuperan sin duplicar',async()=>{
  const rows=[],sent=[];let id=100,fail=true;
  const message={channel,externalUserId:'51900000001',messageId:'services-photo',messageType:'text',text:'que servicios tienes ?'};
  const deps={
    claim:async()=>({id:42}),release:async()=>{},complete:async()=>{},getHandoff:async()=>false,
    loadHistory:async()=>[],sleep:async()=>{},
    findOutgoing:async parent=>rows.find(r=>r.parent===parent)||null,
    createOutgoing:async(_m,content,author,parent)=>{const row={id:id++,content,author,parent,status:'pending'};rows.push(row);return row;},
    generateReply:async()=>({reply:'Servicios para tu estadía. '+SERVICES_PAGE_URL,mode:'hotel_services_information',image_url:SERVICES_IMAGE_URL}),
    sendReply:async(_m,content)=>{
      sent.push(content);
      if(content===SERVICES_IMAGE_URL && fail){fail=false;throw Object.assign(Error('transient image failure'),{nonRetryable:true});}
      return {message_id:'sent-'+sent.length};
    },
    recordOutgoing:async(_m,_c,_a,result,error,_db,row)=>{
      row.status=error?'failed':'sent';if(result)row.meta_message_id=result.message_id;return row;
    },
  };
  await assert.rejects(processMetaMessage(message,deps),/transient image failure/);
  assert.equal(rows.length,2);
  assert.match(rows[0].content,/😊/);
  assert.equal(rows[1].content,SERVICES_IMAGE_URL);
  assert.equal(rows[1].parent,rows[0].id);
  await processMetaMessage(message,deps);
  await processMetaMessage(message,deps);
  assert.equal(sent.filter(s=>s.includes(SERVICES_PAGE_URL)).length,1);
  assert.equal(sent.filter(s=>s===SERVICES_IMAGE_URL).length,2);
});
test('transportes entregan una foto nativa y conservan el texto como texto',async t=>{
  const old={...env.meta};t.after(()=>Object.assign(env.meta,old));
  Object.assign(env.meta,{graphApiVersion:'v23.0',whatsappPhoneNumberId:'wa-page',whatsappAccessToken:'test-token',
    facebookPageId:'fb-page',facebookPageAccessToken:'test-token',instagramAccountId:'ig-page',instagramAccessToken:'test-token'});
  const payloads=[];
  t.mock.method(globalThis,'fetch',async(_url,options)=>{
    payloads.push(JSON.parse(options.body));
    return {ok:true,status:200,text:async()=>JSON.stringify({message_id:'test-id',messages:[{id:'test-id'}]})};
  });
  for(const channel of ['whatsapp','facebook','instagram']) {
    await sendMetaReply({channel,externalUserId:'51900000001'},SERVICES_IMAGE_URL);
    const payload=payloads.at(-1);
    if(channel==='whatsapp'){assert.equal(payload.type,'image');assert.equal(payload.image.link,SERVICES_IMAGE_URL);}
    else {assert.equal(payload.message.attachment.type,'image');assert.equal(payload.message.attachment.payload.url,SERVICES_IMAGE_URL);}
    await sendMetaReply({channel,externalUserId:'51900000001'},'Respuesta específica 😊');
    const text=payloads.at(-1);
    assert.equal(channel==='whatsapp'?text.text.body:text.message.text,'Respuesta específica 😊');
  }
});
