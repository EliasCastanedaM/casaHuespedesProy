import test from "node:test";
import assert from "node:assert/strict";
import {
  globalAssistantWelcome,
  globalAssistantSocialLinks,
} from "../src/modules/ai/ai.guest-rules.js";
import { processMetaMessage } from "../src/modules/meta/meta.service.js";

const message = (text, channel = "whatsapp") => ({
  channel, externalUserId: "51123456789", messageId: "in-001",
  messageType: "text", text, timestamp: "1794189600",
});

test("el mensaje informativo usa los cuatro enlaces oficiales sin precios ni promociones", () => {
  const text = globalAssistantSocialLinks();
  assert.match(text, /^📸/);
  assert.match(text, /https:\/\/www\.casahuespedespimentel\.com\//);
  assert.match(text, /https:\/\/www\.instagram\.com\/casahuespedes\.pimentel\//);
  assert.match(text, /https:\/\/www\.facebook\.com\/casadehuespedespimentel\//);
  assert.match(text, /https:\/\/www\.tiktok\.com\/@casahuespedespimentel/);
  assert.doesNotMatch(text, /descuent|S\/\s*\d|reserva ya/i);
});

test("reintento de bienvenida no duplica el menú ni añade promoción", async () => {
  const outbox=[],sent=[];
  const deps={claim:async()=>({id:42}),complete:async()=>{},release:async()=>{},
    getHandoff:async()=>false,loadHistory:async()=>[],
    findOutgoing:async parent=>outbox.find(row=>row.in_reply_to_message_id===parent)||null,
    createOutgoing:async(_m,content,author,parent)=>{const row={id:101,content,author,in_reply_to_message_id:parent,status:'pending'};outbox.push(row);return row;},
    sendReply:async(_m,content)=>{sent.push(content);return {messages:[{id:'accepted'}]};},
    recordOutgoing:async(_m,_r,_a,result,_e,_db,outgoing)=>{outgoing.status='sent';outgoing.meta_message_id=result.messages[0].id;return outgoing;},
    sleep:async()=>{},generateReply:async()=>{throw Error('No model needed for greeting');},
  };
  await processMetaMessage(message('Hola'),deps);
  await processMetaMessage(message('Hola'),deps);
  assert.equal(outbox.length,1);
  assert.deepEqual(sent,[globalAssistantWelcome()]);
  assert.doesNotMatch(sent.join(''),/casahuespedespimentel.com|conocer mejor/);
});

test("el menú puede repetirse al saludar sin enviar enlaces no solicitados", async () => {
  for (const channel of ["whatsapp", "facebook", "instagram"]) {
    const sent = [];
    const inputs = ["Hola", "¿Qué habitaciones tienen?", "Buenas noches"];
    for (const [index, text] of inputs.entries()) {
      await processMetaMessage({
        ...message(text, channel), messageId: "new-" + index,
      }, {
        claim: async () => true,
        complete: async () => {},
        release: async () => {},
        getHandoff: async () => false,
        isFirstMetaIncomingMessage: async () => index === 0,
        loadHistory: async () => index ? [{ author: "client", content: "Consulta de ayer" }] : [],
        generateReply: async () => ({ reply: "Tenemos varias categorías de habitaciones." }),
        createOutgoing: async (_message, content, author, parentId) => ({
          id: null, content, author, in_reply_to_message_id: parentId, status: "pending",
        }),
        sendReply: async (_message, content) => {
          sent.push(content);
          return { messages: [{ id: "meta" }] };
        },
        recordOutgoing: async () => {},
        sleep: async () => {},
      });
    }

    assert.equal(sent.length, 3);
    assert.equal(sent[0], globalAssistantWelcome());
    assert.equal(sent[1], "Tenemos varias categorías de habitaciones. 😊");
    assert.equal(sent[2], globalAssistantWelcome());
  }
});

test("con atención humana activa no interrumpe la conversación con saludos", async () => {
  let totalSent = 0;
  const result = await processMetaMessage(message("Hola"), {
    claim: async () => true, complete: async () => {},
    getHandoff: async () => true,
    sendReply: async () => { totalSent++; return {}; },
  });
  assert.equal(result.status, "handoff_active");
  assert.equal(totalSent, 0);
});
