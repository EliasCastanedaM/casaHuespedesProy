import test from "node:test";
import assert from "node:assert/strict";
import {
  INSTAGRAM_MESSAGE_LIMIT,
  sendInstagramMessageParts,
  splitInstagramMessage,
  instagramDeliveryParts,
  instagramLinkMessage,
  sendInstagramMetaReply,
} from "../src/modules/meta/instagram.transport.js";
import { env } from '../src/config/env.js';
import { SERVICES_IMAGE_URL } from '../src/modules/ai/ai.services-info.js';

test('Instagram convierte los destinos oficiales en botones web_url sin cambiar las URL', async t => {
  const urls=['https://www.casahuespedespimentel.com/habitaciones','https://www.casahuespedespimentel.com/servicios','https://www.google.com/maps/preview?api=1&map_action=shortlist&place_ids=first,second'];
  const parts=instagramDeliveryParts('Consulta estas páginas. 😊\n'+urls.join('\n'));
  assert.deepEqual(parts,['Consulta estas páginas. 😊',urls.join('\n')]);
  assert.deepEqual(instagramLinkMessage(parts[1]).attachment.payload.buttons, urls.map((url,i)=>({type:'web_url',url,title:['Ver habitaciones','Ver servicios','Abrir Google Maps'][i]})));
  const previous={...env.meta};
  Object.assign(env.meta,{instagramAccountId:'mock-account',instagramAccessToken:'mock-token',graphApiVersion:'v26.0'});
  t.after(()=>Object.assign(env.meta,previous));
  let posted;
  t.mock.method(globalThis,'fetch',async (_url,options)=>{
    posted=JSON.parse(options.body);
    return {ok:true,text:async()=>JSON.stringify({message_id:'mock-button'})};
  });
  await sendInstagramMetaReply({externalUserId:'mock-guest'},parts[1]);
  assert.equal(posted.recipient.id,'mock-guest');
  assert.equal(posted.message.attachment.payload.template_type,'button');
  assert.deepEqual(posted.message.attachment.payload.buttons.map(x=>x.url),urls);
  assert.equal(posted.message.text,undefined);
});

test('Instagram agrupa hasta tres botones y mantiene las imágenes como imágenes',()=>{
  const urls=Array.from({length:5},(_,i)=>'https://example.com/place/'+i);
  const parts=instagramDeliveryParts(urls.join('\n'));
  assert.equal(parts.length,2);
  assert.equal(instagramLinkMessage(parts[0]).attachment.payload.buttons.length,3);
  assert.equal(instagramLinkMessage(parts[1]).attachment.payload.buttons.length,2);
  assert.deepEqual(instagramDeliveryParts(SERVICES_IMAGE_URL),[SERVICES_IMAGE_URL]);
  assert.equal(instagramLinkMessage('Una respuesta sin enlaces.'),null);
});

test('los botones excluyen la puntuación Markdown y conservan los parámetros de Maps',()=>{
  const url='https://www.google.com/maps/search/?api=1&query=Pimentel';
  const parts=instagramDeliveryParts('Abre [el mapa]('+url+'). 😊');
  assert.equal(parts.at(-1),url);
  assert.equal(instagramLinkMessage(parts.at(-1)).attachment.payload.buttons[0].url,url);
  assert.doesNotMatch(parts[0],/\]\(|https:/);
});

test("Instagram conserva en una parte un texto menor a 1000 caracteres", () => {
  const text = "Respuesta breve para Instagram.";
  assert.deepEqual(splitInstagramMessage(text), [text]);
});

test("Instagram conserva en una parte un texto de exactamente 1000 caracteres", () => {
  const text = "a".repeat(INSTAGRAM_MESSAGE_LIMIT);
  assert.deepEqual(splitInstagramMessage(text), [text]);
});

test("Instagram divide un texto mayor a 1000 sin cortar una palabra evitable", () => {
  const text = `${"a".repeat(990)} palabra-final ${"b".repeat(30)}`;
  const parts = splitInstagramMessage(text);
  assert.equal(parts.length, 2);
  assert.ok(parts.every((part) => part.length <= INSTAGRAM_MESSAGE_LIMIT));
  assert.equal(parts.join(""), text);
  assert.match(parts[0], / $/);
  assert.match(parts[1], /^palabra-final/);
});

test("Instagram divide textos largos en varias partes y conserva orden y contenido", async () => {
  const text = Array.from(
    { length: 90 },
    (_, index) => `Oración ${index + 1} con información de la habitación.\n`
  ).join("");
  const parts = splitInstagramMessage(text);
  const sent = [];
  await sendInstagramMessageParts(text, async (part) => {
    sent.push(part);
    return { message_id: `ig-${sent.length}` };
  });

  assert.ok(parts.length >= 4);
  assert.ok(parts.every((part) => part.length <= INSTAGRAM_MESSAGE_LIMIT));
  assert.deepEqual(sent, parts);
  assert.equal(sent.join(""), text);
});

test("Instagram detiene el orden cuando falla una parte y propaga el error", async () => {
  const text = `${"a".repeat(1000)}${"b".repeat(1000)}${"c".repeat(100)}`;
  const attempts = [];
  await assert.rejects(
    sendInstagramMessageParts(text, async (part) => {
      attempts.push(part);
      if (attempts.length === 2) throw new Error("falló parte 2");
      return {};
    }),
    /falló parte 2/
  );
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0], "a".repeat(1000));
  assert.equal(attempts[1], "b".repeat(1000));
});
