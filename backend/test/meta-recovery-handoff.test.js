import test from "node:test";
import assert from "node:assert/strict";
import { processMetaMessage } from "../src/modules/meta/meta.service.js";

function inbound(channel = "whatsapp") {
  return {
    channel,
    externalUserId: "test-contact",
    messageId: "test-incoming-recovery",
    text: "Necesito una habitación",
    messageType: "text",
    timestamp: "1793376000",
  };
}

function existingOutgoing(status = "failed") {
  return {
    id: 922,
    in_reply_to_message_id: 321,
    channel: "whatsapp",
    external_user_id: "test-contact",
    author: "assistant",
    content: "Esta respuesta anterior ya no debe llegar durante atención humana",
    status,
  };
}

test("una recuperación pendiente no reenvía respuestas si WhatsApp Business activó handoff", async () => {
  const events = [];
  const result = await processMetaMessage(inbound("whatsapp"), {
    claim: async () => ({ id: 321 }),
    findOutgoing: async () => existingOutgoing("failed"),
    getHandoff: async () => { events.push("handoff_checked"); return true; },
    complete: async () => { events.push("incoming_completed"); },
    release: async () => { events.push("released"); },
    generateReply: async () => { throw new Error("No debe invocar IA en recuperación"); },
    sendReply: async () => { events.push("sent"); throw new Error("No debe enviar"); },
    recordOutgoing: async () => { events.push("persisted"); },
  });
  assert.equal(result.status, "handoff_active_during_recovery");
  assert.deepEqual(events, ["handoff_checked", "incoming_completed"]);
});

test("el freno de recuperación también respeta traspaso humano de Instagram y Facebook", async () => {
  for (const channel of ["instagram", "facebook"]) {
    let sent = 0;
    let completed = 0;
    const result = await processMetaMessage(inbound(channel), {
      claim: async () => ({ id: 321 }),
      findOutgoing: async () => existingOutgoing("pending"),
      getHandoff: async () => true,
      complete: async () => { completed += 1; },
      release: async () => { throw new Error("No debe liberar un mensaje atendido"); },
      sendReply: async () => { sent += 1; return {}; },
    });
    assert.equal(result.status, "handoff_active_during_recovery");
    assert.equal(sent, 0, channel);
    assert.equal(completed, 1, channel);
  }
});

test("cuando no hay traspaso humano, la recuperación del mensaje sigue operando", async () => {
  const events = [];
  const result = await processMetaMessage(inbound(), {
    claim: async () => ({ id: 321 }),
    findOutgoing: async () => existingOutgoing("failed"),
    getHandoff: async () => { events.push("handoff_checked"); return false; },
    complete: async () => { events.push("incoming_completed"); },
    sendReply: async () => { events.push("sent"); return { messages: [{ id: "accepted-test" }] }; },
    recordOutgoing: async () => { events.push("recorded"); return { status: "sent" }; },
    release: async () => { throw new Error("No debe fallar"); },
    sleep: async () => {},
    generateReply: async () => { throw new Error("La respuesta ya estaba generada"); },
  });
  assert.equal(result.status, "replied_recovered");
  assert.deepEqual(events, ["handoff_checked", "sent", "recorded", "incoming_completed"]);
});
