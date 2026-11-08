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

test("reintento de webhook: envía solo el segundo mensaje faltante sin duplicar bienvenida", async () => {
  const outbox = [];
  let nextId = 101;
  let attemptSocial = 0;
  let completed = 0;
  const attempts = [];

  const deps = {
    claim: async () => ({ id: 42 }),
    release: async () => {},
    complete: async () => { completed += 1; },
    getHandoff: async () => false,
    setHandoff: async () => {},
    loadHistory: async () => [],
    findOutgoing: async (parentId) =>
      outbox.find(row => row.in_reply_to_message_id === parentId) || null,
    createOutgoing: async (_message, text, author, parentId) => {
      const prev = outbox.find(row => row.in_reply_to_message_id === parentId && row.author === author);
      if (prev) return prev;
      const saved = {
        id: nextId++, author, in_reply_to_message_id: parentId,
        content: text, status: "pending", meta_message_id: null,
      };
      outbox.push(saved);
      return saved;
    },
    sendReply: async (_message, text) => {
      attempts.push(text);
      if (text.startsWith("📸") && attemptSocial++ === 0) {
        throw Object.assign(new Error("Fallo transitorio de Meta"), { nonRetryable: true });
      }
      return { messages: [{ id: "wamid.test." + attempts.length }] };
    },
    recordOutgoing: async (_message, _text, _author, result, err, _db, outgoing) => {
      outgoing.status = err ? "failed" : "sent";
      if (result) outgoing.meta_message_id = result.messages[0].id;
      return outgoing;
    },
    sleep: async () => {},
    isFirstMetaIncomingMessage: async () => true,
    generateReply: async () => { throw new Error("Los saludos no invocan OpenAI"); },
  };

  await assert.rejects(
    processMetaMessage(message("Hola"), deps),
    /Fallo transitorio de Meta/
  );
  assert.equal(outbox.length, 2);
  assert.equal(outbox[0].content, globalAssistantWelcome());
  assert.equal(outbox[1].content, globalAssistantSocialLinks());
  assert.equal(outbox[1].in_reply_to_message_id, outbox[0].id);
  assert.equal(outbox[0].status, "sent");
  assert.equal(outbox[1].status, "failed");

  const recovered = await processMetaMessage(message("Hola"), deps);
  assert.equal(recovered.status, "outgoing_already_accepted_by_meta");
  assert.equal(completed, 1);
  assert.equal(outbox[1].status, "sent");
  assert.equal(attempts.filter(t => t === globalAssistantWelcome()).length, 1);

  await processMetaMessage(message("Hola"), deps);
  assert.equal(outbox.length, 2);
  assert.equal(attempts.filter(t => t === globalAssistantWelcome()).length, 1);
  assert.equal(attempts.filter(t => t === globalAssistantSocialLinks()).length, 2);
});

test("el menú y las redes se repiten al saludar otro día, pero no en una pregunta normal", async () => {
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

    assert.equal(sent.length, 5);
    assert.equal(sent[0], globalAssistantWelcome());
    assert.equal(sent[1], globalAssistantSocialLinks());
    assert.equal(sent[2], "Tenemos varias categorías de habitaciones.");
    assert.equal(sent[3], globalAssistantWelcome());
    assert.equal(sent[4], globalAssistantSocialLinks());
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
