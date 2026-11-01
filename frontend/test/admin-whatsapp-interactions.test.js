import test from "node:test";
import assert from "node:assert/strict";
import {
  canChangeConversationMode,
  canChangeConversationResolution,
  canComposeManualMessage,
  canSendManualMessage,
} from "../src/pages/admin/messageInteractionPolicy.js";

for (const channel of ["whatsapp", "instagram", "facebook"]) {
  test(`${channel}: permite pasar IA a humano y escribir cuando el chat está tomado`, () => {
    const conversation = {
      channel,
      handoff_active: false,
      resolved_at: null,
    };
    assert.equal(canChangeConversationMode(conversation, false), true);
    assert.equal(canComposeManualMessage(conversation, false), false);
    assert.equal(canSendManualMessage(conversation, false, "Hola"), false);

    const human = { ...conversation, handoff_active: true };
    assert.equal(canChangeConversationMode(human, false), true);
    assert.equal(canComposeManualMessage(human, false), true);
    assert.equal(canSendManualMessage(human, false, "Respuesta manual"), true);
    assert.equal(canSendManualMessage(human, false, "   "), false);
    assert.equal(canSendManualMessage(human, true, "Respuesta manual"), false);
  });

  test(`${channel}: permite reabrir chats resueltos pero no contestar antes`, () => {
    const resolved = { channel, handoff_active: true, resolved_at: "2026-11-01T12:00:00Z" };
    assert.equal(canChangeConversationResolution(resolved, false), true);
    assert.equal(canChangeConversationMode(resolved, false), false);
    assert.equal(canComposeManualMessage(resolved, false), false);
    assert.equal(canSendManualMessage(resolved, false, "Hola"), false);
  });
}

test("no permite acciones de conversaciones inexistentes o durante guardado", () => {
  assert.equal(canChangeConversationMode(null, false), false);
  assert.equal(canChangeConversationResolution(null, false), false);
  assert.equal(canComposeManualMessage(null, false), false);
  assert.equal(canSendManualMessage(null, false, "hola"), false);
  assert.equal(canChangeConversationResolution({ channel: "whatsapp" }, true), false);
  assert.equal(canChangeConversationMode({ channel: "whatsapp" }, true), false);
});
