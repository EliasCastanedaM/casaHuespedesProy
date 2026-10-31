import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import { processMetaMessage, sendMetaReply } from "../src/modules/meta/meta.service.js";

test("la respuesta desde un emisor incorrecto falla sin reintentos ni llamadas a Meta", async () => {
  const oldConfig = { ...env.meta };
  const oldFetch = globalThis.fetch;
  let sends = 0;
  let sleeps = 0;
  let releasedError = null;
  let outgoingError = null;
  Object.assign(env.meta, {
    whatsappPhoneNumberId: "configured-number",
    whatsappAccessToken: "mock-token",
    graphApiVersion: "v26.0",
  });
  globalThis.fetch = async () => {
    sends++;
    return new Response("{}", { status: 200 });
  };
  try {
    await assert.rejects(processMetaMessage({
      channel: "whatsapp",
      externalUserId: "TEST_USER",
      messageId: "wamid.incoming",
      phoneNumberId: "other-number",
      messageType: "text",
      text: "Hola",
      timestamp: "1793376000",
    }, {
      claim: async () => ({ id: 123 }),
      findOutgoing: async () => null,
      getHandoff: async () => false,
      loadHistory: async () => [],
      isFirstMetaIncomingMessage: async () => false,
      generateReply: async () => ({ reply: "Prueba de respuesta" }),
      sendReply: sendMetaReply,
      recordOutgoing: async (...args) => { outgoingError = args[4]; },
      release: async (_message, error) => { releasedError = error; },
      complete: async () => { throw new Error("No debe completar"); },
      sleep: async () => { sleeps++; },
    }), { code: "WA_PHONE_NUMBER_MISMATCH" });
    assert.equal(sends, 0);
    assert.equal(sleeps, 0);
    assert.equal(releasedError?.code, "WA_PHONE_NUMBER_MISMATCH");
    assert.equal(outgoingError?.code, "WA_PHONE_NUMBER_MISMATCH");
  } finally {
    globalThis.fetch = oldFetch;
    Object.assign(env.meta, oldConfig);
  }
});
