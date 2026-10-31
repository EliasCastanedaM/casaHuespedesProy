import assert from "node:assert/strict";
import test from "node:test";
import { env } from "../src/config/env.js";
import { processMetaMessage, sendMetaReply } from "../src/modules/meta/meta.service.js";

const inbound = {
  channel: "whatsapp",
  externalUserId: "test-contact",
  messageId: "wamid.test-input",
  phoneNumberId: "test-phone",
  messageType: "text",
  text: "Necesito información de habitaciones",
  timestamp: "1793376000",
};

async function simulate(responses) {
  const oldFetch = globalThis.fetch;
  const oldConfig = { ...env.meta };
  let calls = 0;
  let sleeps = 0;
  let released = 0;
  Object.assign(env.meta, {
    graphApiVersion: "v26.0",
    whatsappAccessToken: "mock-test-only",
    whatsappPhoneNumberId: "test-phone",
  });
  globalThis.fetch = async () => {
    const response = responses[Math.min(calls, responses.length - 1)];
    calls++;
    return new Response(JSON.stringify(response.body), { status: response.status });
  };

  try {
    let thrown;
    let result;
    try {
      result = await processMetaMessage(inbound, {
        claim: async () => true,
        complete: async () => {},
        release: async () => { released++; },
        getHandoff: async () => false,
        loadHistory: async () => [],
        generateReply: async () => ({ mode: "answer", reply: "Respuesta del hospedaje" }),
        sendReply: sendMetaReply,
        recordOutgoing: async () => {},
        sleep: async () => { sleeps++; },
      });
    } catch (error) {
      thrown = error;
    }
    return { calls, sleeps, released, thrown, result };
  } finally {
    globalThis.fetch = oldFetch;
    Object.assign(env.meta, oldConfig);
  }
}

test("Meta 401 / OAuth 190 no reintenta con el mismo token", async () => {
  const out = await simulate([{ status: 401, body: {
    error: { message: "Authentication Error", type: "OAuthException", code: 190 },
  } }]);
  assert.equal(out.calls, 1);
  assert.equal(out.sleeps, 0);
  assert.equal(out.released, 1);
  assert.equal(out.thrown?.graphErrorCode, 190);
  assert.equal(out.thrown?.nonRetryable, true);
});

test("Meta 400 / 131047 no repite mensaje fuera de la ventana de 24 horas", async () => {
  const out = await simulate([{ status: 400, body: {
    error: { message: "Re-engagement message", code: 131047 },
  } }]);
  assert.equal(out.calls, 1);
  assert.equal(out.sleeps, 0);
  assert.equal(out.thrown?.graphErrorCode, 131047);
  assert.equal(out.thrown?.nonRetryable, true);
});

test("Meta 403 deniega permisos sin reintento automático", async () => {
  const out = await simulate([{ status: 403, body: {
    error: { message: "Permissions error", code: 10 },
  } }]);
  assert.equal(out.calls, 1);
  assert.equal(out.thrown?.nonRetryable, true);
});

test("Meta HTTP 503 transitorio mantiene los tres intentos", async () => {
  const out = await simulate([
    { status: 503, body: { error: { message: "Temporary" } } },
    { status: 503, body: { error: { message: "Temporary" } } },
    { status: 200, body: { messages: [{ id: "wamid.mock-accepted" }] } },
  ]);
  assert.equal(out.calls, 3);
  assert.equal(out.sleeps, 2);
  assert.equal(out.released, 0);
  assert.equal(out.thrown, undefined);
  assert.equal(out.result?.status, "replied");
});

test("Meta HTTP 429 conserva la política de reintento", async () => {
  const out = await simulate([
    { status: 429, body: { error: { message: "Rate limited", code: 130429 } } },
    { status: 200, body: { messages: [{ id: "wamid.mock-accepted" }] } },
  ]);
  assert.equal(out.calls, 2);
  assert.equal(out.sleeps, 1);
  assert.equal(out.thrown, undefined);
  assert.equal(out.result?.status, "replied");
});
