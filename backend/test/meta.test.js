import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import {
  isHumanHandoffRequest,
  parseMetaWebhook,
  processMetaMessage,
  sendMetaReply,
  verifyMetaSignature,
} from "../src/modules/meta/meta.service.js";

function message(overrides = {}) {
  return {
    channel: "whatsapp",
    externalUserId: "51999999999",
    messageId: "wamid.1",
    text: "Hola",
    messageType: "text",
    timestamp: "1780000000",
    ...overrides,
  };
}

function successfulDependencies(overrides = {}) {
  return {
    claim: async () => true,
    release: async () => {},
    getHandoff: async () => false,
    setHandoff: async () => {},
    generateReply: async () => ({ reply: "Respuesta IA" }),
    sendReply: async () => {},
    sleep: async () => {},
    ...overrides,
  };
}

async function startApp() {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("extrae y normaliza mensajes de WhatsApp", () => {
  const messages = parseMetaWebhook({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: "wamid.1",
                  from: "51999999999",
                  timestamp: "1780000000",
                  type: "text",
                  text: { body: " Hola " },
                },
              ],
            },
          },
        ],
      },
    ],
  });

  assert.deepEqual(messages, [message()]);
});

test("extrae Instagram y conserva el identificador externo", () => {
  const messages = parseMetaWebhook({
    object: "instagram",
    entry: [
      {
        messaging: [
          {
            sender: { id: "ig-user" },
            timestamp: 1780000001,
            message: { mid: "ig-mid", text: "Precio" },
          },
        ],
      },
    ],
  });

  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], {
    channel: "instagram",
    externalUserId: "ig-user",
    messageId: "ig-mid",
    text: "Precio",
    messageType: "text",
    timestamp: "1780000001",
  });
});

test("extrae Facebook Messenger", () => {
  const messages = parseMetaWebhook({
    object: "page",
    entry: [
      {
        messaging: [
          {
            sender: { id: "psid-user" },
            message: { mid: "fb-mid", text: "Disponibilidad" },
          },
        ],
      },
    ],
  });

  assert.equal(messages[0].channel, "facebook");
  assert.equal(messages[0].externalUserId, "psid-user");
  assert.equal(messages[0].messageId, "fb-mid");
});

test("ignora ecos, mensajes propios, textos vacíos y payloads desconocidos", () => {
  const instagram = parseMetaWebhook(
    {
      object: "instagram",
      entry: [
        {
          messaging: [
            {
              sender: { id: "ig-user" },
              message: { mid: "m1", text: "eco", is_echo: true },
            },
            {
              sender: { id: "ig-business" },
              message: { mid: "m2", text: "propio" },
            },
            {
              sender: { id: "ig-user" },
              message: { mid: "m3", text: "   " },
            },
          ],
        },
      ],
    },
    { instagramAccountId: "ig-business" }
  );

  assert.deepEqual(instagram, []);
  assert.deepEqual(parseMetaWebhook({ object: "desconocido" }), []);
  assert.deepEqual(parseMetaWebhook(null), []);
});

test("normaliza adjuntos sin intentar inventar contenido", () => {
  const [attachment] = parseMetaWebhook({
    object: "page",
    entry: [
      {
        messaging: [
          {
            sender: { id: "psid-user" },
            message: {
              mid: "attachment-mid",
              attachments: [{ type: "image", payload: { url: "https://x" } }],
            },
          },
        ],
      },
    ],
  });

  assert.equal(attachment.messageType, "image");
  assert.equal(attachment.text, "");
});

test("valida una firma HMAC y rechaza firmas inválidas", () => {
  const previousSecret = env.meta.appSecret;
  env.meta.appSecret = "app-secret-de-prueba";
  const rawBody = Buffer.from('{"object":"page"}');
  const signature = `sha256=${crypto
    .createHmac("sha256", env.meta.appSecret)
    .update(rawBody)
    .digest("hex")}`;

  try {
    assert.equal(verifyMetaSignature(signature, rawBody), true);
    assert.equal(verifyMetaSignature("sha256=incorrecta", rawBody), false);
    assert.equal(verifyMetaSignature(null, rawBody), false);
  } finally {
    env.meta.appSecret = previousSecret;
  }
});

test("detecta solicitudes claras de atención humana", () => {
  assert.equal(isHumanHandoffRequest("Quiero hablar con una persona"), true);
  assert.equal(isHumanHandoffRequest("Necesito un asesor humano"), true);
  assert.equal(isHumanHandoffRequest("¿Qué habitaciones tienen?"), false);
});

test("llama al mismo asesor con canal y usuario separados", async () => {
  const calls = [];
  const dependencies = successfulDependencies({
    generateReply: async (input) => {
      calls.push(input);
      return { reply: "Respuesta IA" };
    },
  });

  await processMetaMessage(
    message({ channel: "facebook", externalUserId: "usuario-a" }),
    dependencies
  );
  await processMetaMessage(
    message({ channel: "instagram", externalUserId: "usuario-b", messageId: "m2" }),
    dependencies
  );

  assert.deepEqual(calls, [
    { channel: "facebook", externalUserId: "usuario-a", message: "Hola" },
    { channel: "instagram", externalUserId: "usuario-b", message: "Hola" },
  ]);
});

test("un mensaje duplicado no llama al asesor ni envía respuesta", async () => {
  let aiCalls = 0;
  let sends = 0;
  const result = await processMetaMessage(
    message(),
    successfulDependencies({
      claim: async () => false,
      generateReply: async () => {
        aiCalls += 1;
        return { reply: "Respuesta" };
      },
      sendReply: async () => {
        sends += 1;
      },
    })
  );

  assert.equal(result.status, "duplicate");
  assert.equal(aiCalls, 0);
  assert.equal(sends, 0);
});

test("un handoff activo pausa el bot", async () => {
  let aiCalls = 0;
  let sends = 0;
  const result = await processMetaMessage(
    message(),
    successfulDependencies({
      getHandoff: async () => true,
      generateReply: async () => {
        aiCalls += 1;
      },
      sendReply: async () => {
        sends += 1;
      },
    })
  );

  assert.equal(result.status, "handoff_active");
  assert.equal(aiCalls, 0);
  assert.equal(sends, 0);
});

test("una solicitud humana activa handoff y no consume IA", async () => {
  let handoff;
  let sentReply = "";
  let aiCalls = 0;

  const result = await processMetaMessage(
    message({ text: "Necesito ayuda de una persona" }),
    successfulDependencies({
      setHandoff: async (channel, externalUserId, active) => {
        handoff = { channel, externalUserId, active };
      },
      generateReply: async () => {
        aiCalls += 1;
      },
      sendReply: async (_incoming, reply) => {
        sentReply = reply;
      },
    })
  );

  assert.equal(result.status, "handoff_requested");
  assert.deepEqual(handoff, {
    channel: "whatsapp",
    externalUserId: "51999999999",
    active: true,
  });
  assert.match(sentReply, /persona/i);
  assert.equal(aiCalls, 0);
});

test("un adjunto recibe respuesta controlada sin consumir IA", async () => {
  let aiCalls = 0;
  let sentReply = "";
  const result = await processMetaMessage(
    message({ text: "", messageType: "image" }),
    successfulDependencies({
      generateReply: async () => {
        aiCalls += 1;
      },
      sendReply: async (_incoming, reply) => {
        sentReply = reply;
      },
    })
  );

  assert.equal(result.status, "unsupported");
  assert.match(sentReply, /texto/i);
  assert.equal(aiCalls, 0);
});

test("reintenta Meta sin volver a llamar a OpenAI", async () => {
  let aiCalls = 0;
  let sendAttempts = 0;
  const result = await processMetaMessage(
    message(),
    successfulDependencies({
      generateReply: async () => {
        aiCalls += 1;
        return { reply: "Respuesta" };
      },
      sendReply: async () => {
        sendAttempts += 1;
        if (sendAttempts < 3) throw new Error("Meta temporalmente no disponible");
      },
    })
  );

  assert.equal(result.status, "replied");
  assert.equal(aiCalls, 1);
  assert.equal(sendAttempts, 3);
});

test("envía la respuesta al endpoint y formato correctos de cada canal", async () => {
  const previousFetch = globalThis.fetch;
  const previousConfig = { ...env.meta };
  const requests = [];

  Object.assign(env.meta, {
    graphApiVersion: "v26.0",
    whatsappAccessToken: "wa-token",
    whatsappPhoneNumberId: "wa-phone-id",
    facebookPageAccessToken: "page-token",
    facebookPageId: "page-id",
    instagramAccessToken: "ig-token",
    instagramAccountId: "ig-account-id",
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return new Response("{}", { status: 200 });
  };

  try {
    await sendMetaReply(message(), "Respuesta WhatsApp");
    await sendMetaReply(
      message({ channel: "facebook", externalUserId: "psid" }),
      "Respuesta Facebook"
    );
    await sendMetaReply(
      message({ channel: "instagram", externalUserId: "igsid" }),
      "Respuesta Instagram"
    );

    assert.equal(
      requests[0].url,
      "https://graph.facebook.com/v26.0/wa-phone-id/messages"
    );
    assert.deepEqual(requests[0].body, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "51999999999",
      type: "text",
      text: { preview_url: false, body: "Respuesta WhatsApp" },
    });
    assert.equal(
      requests[1].url,
      "https://graph.facebook.com/v26.0/page-id/messages"
    );
    assert.equal(requests[1].body.messaging_type, "RESPONSE");
    assert.equal(requests[1].body.recipient.id, "psid");
    assert.equal(
      requests[2].url,
      "https://graph.facebook.com/v26.0/ig-account-id/messages"
    );
    assert.equal(requests[2].body.recipient.id, "igsid");
  } finally {
    globalThis.fetch = previousFetch;
    Object.assign(env.meta, previousConfig);
  }
});

test("libera la deduplicación si OpenAI falla", async () => {
  let releases = 0;
  await assert.rejects(
    processMetaMessage(
      message(),
      successfulDependencies({
        generateReply: async () => {
          throw new Error("OpenAI no disponible");
        },
        release: async () => {
          releases += 1;
        },
      })
    ),
    /OpenAI no disponible/
  );
  assert.equal(releases, 1);
});

test("propaga un fallo de Supabase antes de consumir IA", async () => {
  let aiCalls = 0;
  await assert.rejects(
    processMetaMessage(
      message(),
      successfulDependencies({
        claim: async () => {
          throw new Error("Supabase no disponible");
        },
        generateReply: async () => {
          aiCalls += 1;
        },
      })
    ),
    /Supabase no disponible/
  );
  assert.equal(aiCalls, 0);
});

test("GET del webhook acepta el token correcto y rechaza el incorrecto", async () => {
  const previousToken = env.meta.verifyToken;
  env.meta.verifyToken = "verify-token-prueba";
  const { server, baseUrl } = await startApp();

  try {
    const valid = await fetch(
      `${baseUrl}/api/meta/webhook?hub.mode=subscribe&hub.verify_token=verify-token-prueba&hub.challenge=12345`
    );
    assert.equal(valid.status, 200);
    assert.equal(await valid.text(), "12345");

    const invalid = await fetch(
      `${baseUrl}/api/meta/webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=12345`
    );
    assert.equal(invalid.status, 403);
  } finally {
    env.meta.verifyToken = previousToken;
    await closeServer(server);
  }
});

test("los endpoints de handoff exigen autenticación administrativa", async () => {
  const { server, baseUrl } = await startApp();
  try {
    const response = await fetch(`${baseUrl}/api/meta/handoffs`);
    assert.equal(response.status, 401);
  } finally {
    await closeServer(server);
  }
});

test("POST del webhook acepta firma válida y rechaza firma inválida", async () => {
  const previousSecret = env.meta.appSecret;
  env.meta.appSecret = "app-secret-http";
  const body = JSON.stringify({ object: "evento_desconocido", entry: [] });
  const signature = `sha256=${crypto
    .createHmac("sha256", env.meta.appSecret)
    .update(body)
    .digest("hex")}`;
  const { server, baseUrl } = await startApp();

  try {
    const valid = await fetch(`${baseUrl}/api/meta/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signature,
      },
      body,
    });
    assert.equal(valid.status, 200);
    assert.equal(await valid.text(), "EVENT_RECEIVED");

    const invalid = await fetch(`${baseUrl}/api/meta/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${"0".repeat(64)}`,
      },
      body,
    });
    assert.equal(invalid.status, 401);
  } finally {
    env.meta.appSecret = previousSecret;
    await closeServer(server);
  }
});
