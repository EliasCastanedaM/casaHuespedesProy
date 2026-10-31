import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import { sendMetaReply } from "../src/modules/meta/meta.service.js";

test("WhatsApp no enruta respuestas con un numero receptor distinto", async () => {
  const oldConfig = { ...env.meta };
  const oldFetch = globalThis.fetch;
  let sendCalls = 0;
  Object.assign(env.meta, {
    whatsappPhoneNumberId: "configured-number",
    whatsappAccessToken: "mock-token",
    graphApiVersion: "v26.0",
  });
  globalThis.fetch = async () => {
    sendCalls += 1;
    return new Response("{}", { status: 200 });
  };
  try {
    await assert.rejects(
      sendMetaReply({
        channel: "whatsapp",
        externalUserId: "TEST_USER",
        phoneNumberId: "different-number",
      }, "Respuesta de prueba"),
      { code: "WA_PHONE_NUMBER_MISMATCH" }
    );
    assert.equal(sendCalls, 0);
  } finally {
    globalThis.fetch = oldFetch;
    Object.assign(env.meta, oldConfig);
  }
});

test("WhatsApp permite responder con un numero receptor coincidente", async () => {
  const oldConfig = { ...env.meta };
  const oldFetch = globalThis.fetch;
  const requests = [];
  Object.assign(env.meta, {
    whatsappPhoneNumberId: "configured-number",
    whatsappAccessToken: "mock-token",
    graphApiVersion: "v26.0",
  });
  globalThis.fetch = async (url) => {
    requests.push(url);
    return new Response('{"messages":[{"id":"wamid.mock"}]}', { status: 200 });
  };
  try {
    await sendMetaReply({
      channel: "whatsapp",
      externalUserId: "TEST_USER",
      phoneNumberId: "configured-number",
    }, "Respuesta de prueba");
    assert.deepEqual(requests, [
      "https://graph.facebook.com/v26.0/configured-number/messages",
    ]);
  } finally {
    globalThis.fetch = oldFetch;
    Object.assign(env.meta, oldConfig);
  }
});
