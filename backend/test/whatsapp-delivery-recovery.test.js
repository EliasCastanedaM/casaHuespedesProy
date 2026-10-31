import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMetaStatusUpdates,
  processMetaMessage,
} from "../src/modules/meta/meta.service.js";

const message = {
  channel: "whatsapp",
  externalUserId: "test-recipient",
  messageId: "wamid.inbound.recovery",
  text: "Hola, deseo una habitación",
  messageType: "text",
  timestamp: "1793376000",
};

test("Meta ya aceptó respuesta IA: recuperación no reenvía un fallo posterior de entrega", async () => {
  const events = [];
  const result = await processMetaMessage(message, {
    claim: async () => ({ id: 101 }),
    getHandoff: async () => { events.push("handoff"); return false; },
    findOutgoing: async () => ({
      id: 202,
      channel: "whatsapp",
      author: "assistant",
      content: "Respuesta de reserva previa",
      status: "failed",
      meta_message_id: "wamid.accepted.by.meta",
      in_reply_to_message_id: 101,
    }),
    complete: async () => { events.push("complete"); },
    release: async () => { throw new Error("No debe liberar un turno registrado"); },
    generateReply: async () => { throw new Error("No debe ejecutar OpenAI"); },
    sendReply: async () => { throw new Error("No debe reenviar /messages"); },
    recordOutgoing: async () => { throw new Error("No debe cambiar failed por sent"); },
  });
  assert.equal(result.status, "outgoing_already_accepted_by_meta");
  assert.deepEqual(events, ["handoff", "complete"]);
});

test("WhatsApp pendiente con ID reconocido por Meta tampoco se reenvía", async () => {
  let sends = 0;
  const result = await processMetaMessage(message, {
    claim: async () => ({ id: 101 }),
    findOutgoing: async () => ({
      id: 202, channel: "whatsapp", content: "Ya aceptado",
      status: "pending", meta_message_id: "wamid.known",
    }),
    getHandoff: async () => false,
    complete: async () => {},
    sendReply: async () => { sends++; return {}; },
    generateReply: async () => { throw new Error("No se regenera IA"); },
  });
  assert.equal(result.status, "outgoing_already_accepted_by_meta");
  assert.equal(sends, 0);
});

test("WhatsApp sin acuse de Meta conserva reintento recuperable", async () => {
  const events = [];
  const result = await processMetaMessage(message, {
    claim: async () => ({ id: 101 }),
    findOutgoing: async () => ({
      id: 202, channel: "whatsapp", content: "Primera respuesta no enviada",
      status: "failed", meta_message_id: null,
    }),
    getHandoff: async () => false,
    complete: async () => { events.push("complete"); },
    sendReply: async () => { events.push("send"); return { messages: [{ id: "wamid.new" }] }; },
    recordOutgoing: async () => { events.push("record"); return { status: "sent" }; },
    sleep: async () => {},
    generateReply: async () => { throw new Error("No se regenera IA"); },
  });
  assert.equal(result.status, "replied_recovered");
  assert.deepEqual(events, ["send", "record", "complete"]);
});

test("actualización SQL de WhatsApp mantiene delivered/read ante fallo tardío", async () => {
  const queries = [];
  const db = {
    async query(sql, params) {
      queries.push({ sql: sql.replace(/\s+/g, " "), params });
      return { rows: [{ id: 12, status: "read", meta_message_id: params[0] }] };
    },
  };
  await applyMetaStatusUpdates([{
    channel: "whatsapp",
    messageId: "wamid.outgoing",
    status: "failed",
    errorDetail: "Error tardío de Meta",
  }], db);
  assert.equal(queries.length, 1);
  const sql = queries[0].sql;
  assert.match(sql, /WHEN \$2 = 'failed' AND status NOT IN \('delivered', 'read'\) THEN 'failed'/);
  assert.match(sql, /error_detail = CASE WHEN \$2 = 'failed' AND status NOT IN \('delivered', 'read'\) THEN NULLIF\(\$3, ''\)/);
  assert.equal(queries[0].params[1], "failed");
});
