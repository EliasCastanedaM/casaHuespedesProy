import test from "node:test";
import assert from "node:assert/strict";
import { processMetaMessage } from "../src/modules/meta/meta.service.js";

const incoming = {
  channel: "whatsapp",
  externalUserId: "test-human-review",
  messageId: "wamid.test-human-review",
  text: "Quiero reservar una habitación",
  messageType: "text",
  timestamp: "1793376000",
};

function deps(overrides = {}) {
  return {
    claim: async () => true,
    complete: async () => {},
    release: async (_message, error) => { throw error; },
    getHandoff: async () => false,
    setHandoff: async () => {},
    loadHistory: async () => [],
    isFirstMetaIncomingMessage: async () => false,
    generateReply: async () => ({
      mode: "human_review_required",
      reply: "La recepción confirmará disponibilidad.",
    }),
    sendReply: async () => ({ messages: [{ id: "wamid.test-sent" }] }),
    recordOutgoing: async () => ({ status: "sent" }),
    sleep: async () => {},
    ...overrides,
  };
}

test("si WhatsApp Business toma el chat durante IA que solicita revisión, IA guarda silencio", async () => {
  const events = [];
  let checks = 0;
  const result = await processMetaMessage(incoming, deps({
    getHandoff: async () => {
      checks += 1;
      return checks >= 2; // Primero IA libre; luego llegó un eco de personal.
    },
    setHandoff: async () => { events.push("setHandoff"); },
    complete: async () => { events.push("complete"); },
    createOutgoing: async () => { throw new Error("No debe persistir ni enviar respuesta"); },
    sendReply: async () => { throw new Error("No debe llamar Meta"); },
  }));

  assert.equal(result.status, "handoff_active_after_generation");
  assert.equal(checks, 2);
  assert.deepEqual(events, ["complete"]);
});

test("si nadie tomó el chat, la IA todavía solicita revisión y envía su aviso", async () => {
  const events = [];
  const result = await processMetaMessage(incoming, deps({
    getHandoff: async () => false,
    setHandoff: async (_channel, _user, active) => {
      assert.equal(active, true);
      events.push("handoff");
    },
    sendReply: async (_message, text) => {
      assert.match(text, /recepción confirmará disponibilidad/i);
      events.push("send");
      return { messages: [{ id: "wamid.test-review" }] };
    },
    recordOutgoing: async () => {
      events.push("record");
      return { status: "sent" };
    },
    complete: async () => { events.push("complete"); },
  }));
  assert.equal(result.status, "replied");
  assert.deepEqual(events, ["handoff", "send", "record", "complete"]);
});
