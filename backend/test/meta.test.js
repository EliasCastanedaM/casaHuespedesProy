import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import {
  isHumanHandoffRequest,
  listRecoverableMessages,
  parseMetaWebhook,
  processMetaMessage,
  sendManualMetaMessage,
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
    complete: async () => {},
    getHandoff: async () => false,
    setHandoff: async () => {},
    loadHistory: async () => [],
    generateReply: async () => ({ reply: "Respuesta IA" }),
    sendReply: async () => ({}),
    recordOutgoing: async () => {},
    sleep: async () => {},
    ...overrides,
  };
}

function createInstagramDeliveryDb(initialOutgoing = null) {
  let outgoing = initialOutgoing
    ? {
        delivery_part_count: null,
        delivery_next_part_index: 0,
        delivery_part_message_ids: [],
        processing_attempts: 0,
        ...initialOutgoing,
      }
    : null;
  let nextId = Number(outgoing?.id || 800);
  const lockTails = new Map();

  const clone = () =>
    outgoing
      ? {
          ...outgoing,
          delivery_part_message_ids: [...outgoing.delivery_part_message_ids],
        }
      : null;

  async function runQuery(sql, params = [], heldLocks = null) {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (normalized.includes("pg_advisory_lock")) {
      const key = String(params[1]);
      const previous = lockTails.get(key) || Promise.resolve();
      let unlock;
      const current = new Promise((resolve) => {
        unlock = resolve;
      });
      const tail = previous.then(() => current);
      lockTails.set(key, tail);
      await previous;
      heldLocks.set(key, { tail, unlock });
      return { rows: [{}] };
    }

    if (normalized.includes("pg_advisory_unlock")) {
      const key = String(params[1]);
      const held = heldLocks.get(key);
      if (held) {
        held.unlock();
        heldLocks.delete(key);
        if (lockTails.get(key) === held.tail) lockTails.delete(key);
      }
      return { rows: [{ pg_advisory_unlock: Boolean(held) }] };
    }

    if (normalized.includes("insert into meta_conversations")) {
      return { rows: [{ channel: params[0], external_user_id: params[1] }] };
    }

    if (normalized.includes("insert into meta_messages")) {
      outgoing = {
        id: nextId,
        channel: params[0],
        external_user_id: params[1],
        meta_message_id: null,
        in_reply_to_message_id: params[4] || null,
        direction: "outgoing",
        author: params[2],
        message_type: "text",
        content: params[3],
        status: "pending",
        error_detail: null,
        processing_attempts: 0,
        delivery_part_count: null,
        delivery_next_part_index: 0,
        delivery_part_message_ids: [],
      };
      nextId += 1;
      return { rows: [clone()] };
    }

    if (
      normalized.startsWith("select id, channel") &&
      normalized.includes("from meta_messages") &&
      normalized.includes("where id = $1")
    ) {
      return {
        rows: outgoing && outgoing.id === params[0] ? [clone()] : [],
      };
    }

    if (normalized.includes("set delivery_part_count = coalesce")) {
      if (
        !outgoing ||
        outgoing.id !== params[0] ||
        (outgoing.delivery_part_count !== null &&
          outgoing.delivery_part_count !== params[1])
      ) {
        return { rows: [] };
      }
      outgoing.delivery_part_count = params[1];
      return { rows: [clone()] };
    }

    if (normalized.includes("set delivery_next_part_index = $4")) {
      if (
        !outgoing ||
        outgoing.id !== params[0] ||
        outgoing.delivery_part_count !== params[1] ||
        outgoing.delivery_next_part_index !== params[2]
      ) {
        return { rows: [] };
      }
      outgoing.delivery_next_part_index = params[3];
      outgoing.delivery_part_message_ids.push(params[4]);
      if (params[4]) outgoing.meta_message_id = params[4];
      outgoing.error_detail = null;
      return { rows: [clone()] };
    }

    if (normalized.includes("set status = 'sent'")) {
      if (
        !outgoing ||
        outgoing.id !== params[0] ||
        outgoing.delivery_part_count === null ||
        outgoing.delivery_next_part_index !== outgoing.delivery_part_count
      ) {
        return { rows: [] };
      }
      outgoing.status = "sent";
      outgoing.error_detail = null;
      outgoing.processing_attempts += 1;
      return { rows: [clone()] };
    }

    if (normalized.includes("set meta_message_id = coalesce")) {
      if (!outgoing || outgoing.id !== params[0]) return { rows: [] };
      if (params[1]) outgoing.meta_message_id = params[1];
      outgoing.status = params[2];
      outgoing.error_detail = params[3];
      outgoing.processing_attempts += 1;
      return { rows: [clone()] };
    }

    throw new Error(`SQL no simulado: ${normalized}`);
  }

  return {
    query: (sql, params) => runQuery(sql, params, new Map()),
    async connect() {
      const heldLocks = new Map();
      return {
        query: (sql, params) => runQuery(sql, params, heldLocks),
        release() {
          for (const [key, held] of heldLocks) {
            held.unlock();
            if (lockTails.get(key) === held.tail) lockTails.delete(key);
          }
          heldLocks.clear();
        },
      };
    },
    current: clone,
    async createOutgoing(message, content, author, inReplyToMessageId = null) {
      outgoing = {
        id: nextId,
        channel: message.channel,
        external_user_id: message.externalUserId,
        meta_message_id: null,
        in_reply_to_message_id: inReplyToMessageId,
        direction: "outgoing",
        author,
        message_type: "text",
        content,
        status: "pending",
        error_detail: null,
        processing_attempts: 0,
        delivery_part_count: null,
        delivery_next_part_index: 0,
        delivery_part_message_ids: [],
      };
      nextId += 1;
      return clone();
    },
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
    {
      channel: "facebook",
      externalUserId: "usuario-a",
      message: "Hola",
      history: [],
    },
    {
      channel: "instagram",
      externalUserId: "usuario-b",
      message: "Hola",
      history: [],
    },
  ]);
});

test("entrega el tramo manual a la IA y registra la respuesta enviada", async () => {
  const history = [
    { author: "client", content: "Llegaré tarde" },
    { author: "admin", content: "No hay problema, te esperamos" },
  ];
  let aiInput;
  let recorded;
  let completed = 0;

  const result = await processMetaMessage(
    message({ text: "Gracias" }),
    successfulDependencies({
      loadHistory: async () => history,
      generateReply: async (input) => {
        aiInput = input;
        return { reply: "Con gusto" };
      },
      sendReply: async () => ({ messages: [{ id: "wamid.out" }] }),
      recordOutgoing: async (...args) => {
        recorded = args;
      },
      complete: async () => {
        completed += 1;
      },
    })
  );

  assert.equal(result.status, "replied");
  assert.deepEqual(aiInput.history, history);
  assert.equal(recorded[1], "Con gusto");
  assert.equal(recorded[2], "assistant");
  assert.equal(recorded[3].messages[0].id, "wamid.out");
  assert.equal(completed, 1);
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

test("un mensaje manual largo de Instagram persiste completo antes de enviar sus partes", async () => {
  const previousFetch = globalThis.fetch;
  const previousConfig = { ...env.meta };
  const requests = [];
  let persistedBeforeFirstSend = false;
  const text = Array.from(
    { length: 70 },
    (_, index) => `Línea manual ${index + 1}: información para el huésped.\n`
  ).join("");
  const db = createInstagramDeliveryDb();

  Object.assign(env.meta, {
    graphApiVersion: "v26.0",
    instagramAccessToken: "ig-token",
    instagramAccountId: "ig-account-id",
  });
  globalThis.fetch = async (_url, options) => {
    if (requests.length === 0) {
      persistedBeforeFirstSend =
        db.current()?.status === "pending" && db.current()?.content === text.trim();
    }
    requests.push(JSON.parse(options.body).message.text);
    return new Response(JSON.stringify({ message_id: `ig-part-${requests.length}` }), {
      status: 200,
    });
  };

  try {
    const saved = await sendManualMetaMessage("instagram", "ig-manual", text, db);
    assert.equal(persistedBeforeFirstSend, true);
    assert.equal(db.current().content, text.trim());
    assert.ok(requests.length > 2);
    assert.ok(requests.every((part) => part.length <= 1000));
    assert.equal(requests.join(""), text.trim());
    assert.equal(saved.status, "sent");
    assert.equal(db.current().status, "sent");
    assert.equal(db.current().delivery_next_part_index, requests.length);
    assert.equal(db.current().delivery_part_count, requests.length);
    assert.deepEqual(
      db.current().delivery_part_message_ids,
      requests.map((_, index) => `ig-part-${index + 1}`)
    );
  } finally {
    globalThis.fetch = previousFetch;
    Object.assign(env.meta, previousConfig);
  }
});

test("si falla una parte de Instagram conserva el outgoing completo y no repite OpenAI", async () => {
  const previousFetch = globalThis.fetch;
  const previousConfig = { ...env.meta };
  const reply = `${"A".repeat(1000)}${"FALLO".repeat(30)}`;
  let aiCalls = 0;
  let persistedOutgoing;
  let failedRecord;
  const sentParts = [];

  Object.assign(env.meta, {
    graphApiVersion: "v26.0",
    instagramAccessToken: "ig-token",
    instagramAccountId: "ig-account-id",
  });
  globalThis.fetch = async (_url, options) => {
    const part = JSON.parse(options.body).message.text;
    sentParts.push(part);
    if (part.startsWith("FALLO")) {
      return new Response('{"error":{"message":"fallo parte"}}', { status: 400 });
    }
    return new Response('{"message_id":"ig-ok"}', { status: 200 });
  };

  try {
    await assert.rejects(
      processMetaMessage(
        message({ channel: "instagram", externalUserId: "ig-error", messageId: "ig-in" }),
        successfulDependencies({
          claim: async () => ({ id: 99 }),
          generateReply: async () => {
            aiCalls += 1;
            return { reply };
          },
          createOutgoing: async (_message, content, author, inReplyToMessageId) => {
            persistedOutgoing = {
              id: 700,
              content,
              author,
              in_reply_to_message_id: inReplyToMessageId,
              status: "pending",
            };
            return persistedOutgoing;
          },
          sendReply: sendMetaReply,
          recordOutgoing: async (...args) => {
            if (args[4]) failedRecord = args;
            return { ...persistedOutgoing, status: args[4] ? "failed" : "sent" };
          },
          sleep: async () => {},
        })
      ),
      /Meta respondió 400/
    );

    assert.equal(aiCalls, 1);
    assert.equal(persistedOutgoing.content, reply);
    assert.equal(persistedOutgoing.status, "pending");
    assert.equal(failedRecord[1], reply);
    assert.equal(failedRecord[6], persistedOutgoing);
    assert.equal(sentParts.filter((part) => part.length === 1000).length, 1);
    assert.equal(sentParts.filter((part) => part.startsWith("FALLO")).length, 3);
  } finally {
    globalThis.fetch = previousFetch;
    Object.assign(env.meta, previousConfig);
  }
});

test("Instagram reanuda durablemente desde la parte fallida después de un reinicio", async () => {
  const reply = `${"A".repeat(1000)}${"B".repeat(1000)}${"C".repeat(1000)}`;
  const db = createInstagramDeliveryDb();
  const calls = [];
  let aiCalls = 0;
  let failPartB = true;
  const incoming = message({
    channel: "instagram",
    externalUserId: "ig-recovery",
    messageId: "ig-in-recovery",
  });
  const sendReply = async (_message, part) => {
    calls.push(part[0]);
    if (part[0] === "B" && failPartB) throw new Error("falló parte 2");
    return { message_id: `ig-part-${part[0]}` };
  };

  await assert.rejects(
    processMetaMessage(
      incoming,
      successfulDependencies({
        db,
        claim: async () => ({ id: 901 }),
        generateReply: async () => {
          aiCalls += 1;
          return { reply };
        },
        createOutgoing: (...args) => db.createOutgoing(...args),
        sendReply,
        recordOutgoing: undefined,
      })
    ),
    /falló parte 2/
  );

  assert.equal(aiCalls, 1);
  assert.equal(db.current().status, "failed");
  assert.equal(db.current().content, reply);
  assert.equal(db.current().delivery_part_count, 3);
  assert.equal(db.current().delivery_next_part_index, 1);
  assert.deepEqual(db.current().delivery_part_message_ids, ["ig-part-A"]);
  assert.equal(calls.filter((part) => part === "A").length, 1);
  assert.equal(calls.filter((part) => part === "B").length, 3);

  failPartB = false;
  const recovered = await processMetaMessage(
    incoming,
    successfulDependencies({
      db,
      claim: async () => ({ id: 901 }),
      findOutgoing: async () => db.current(),
      generateReply: async () => {
        aiCalls += 1;
        throw new Error("OpenAI no debe ejecutarse durante recovery");
      },
      sendReply,
      recordOutgoing: undefined,
    })
  );

  assert.equal(recovered.status, "replied_recovered");
  assert.equal(aiCalls, 1);
  assert.equal(calls.filter((part) => part === "A").length, 1);
  assert.deepEqual(calls.slice(-2), ["B", "C"]);
  assert.equal(db.current().delivery_next_part_index, 3);
  assert.equal(db.current().delivery_part_count, 3);
  assert.equal(db.current().status, "sent");
  assert.equal(db.current().meta_message_id, "ig-part-C");
  assert.deepEqual(db.current().delivery_part_message_ids, [
    "ig-part-A",
    "ig-part-B",
    "ig-part-C",
  ]);

  const callCountAfterCompletion = calls.length;
  await processMetaMessage(
    incoming,
    successfulDependencies({
      db,
      claim: async () => ({ id: 901 }),
      findOutgoing: async () => db.current(),
      generateReply: async () => {
        aiCalls += 1;
        throw new Error("OpenAI no debe ejecutarse para un outgoing terminado");
      },
      sendReply,
      recordOutgoing: undefined,
    })
  );

  assert.equal(calls.length, callCountAfterCompletion);
  assert.equal(aiCalls, 1);
});

test("recovery vuelve a encolar de inmediato una entrega parcial de Instagram", async () => {
  const queries = [];
  const db = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      queries.push(normalized);
      if (normalized.startsWith("select channel")) {
        return {
          rows: [
            {
              channel: "instagram",
              external_user_id: "ig-restart",
              meta_message_id: "ig-in-restart",
              content: "Hola",
              message_type: "text",
              meta_timestamp: new Date("2026-09-15T12:00:00.000Z"),
            },
          ],
        };
      }
      return { rows: [] };
    },
  };

  const recovered = await listRecoverableMessages(db);

  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].channel, "instagram");
  assert.match(queries[0], /incoming\.channel = 'instagram'/);
  assert.match(queries[0], /outgoing\.status in \('pending', 'failed'\)/);
  assert.match(queries[0], /outgoing\.in_reply_to_message_id = incoming\.id/);
});

test("dos workers de Instagram comparten un lock durable y envían una sola secuencia", async () => {
  const reply = `${"A".repeat(1000)}${"B".repeat(1000)}${"C".repeat(1000)}`;
  const db = createInstagramDeliveryDb({
    id: 920,
    channel: "instagram",
    external_user_id: "ig-concurrent",
    in_reply_to_message_id: 902,
    direction: "outgoing",
    author: "assistant",
    message_type: "text",
    content: reply,
    status: "failed",
  });
  const calls = [];
  let aiCalls = 0;
  const incoming = message({
    channel: "instagram",
    externalUserId: "ig-concurrent",
    messageId: "ig-in-concurrent",
  });
  const overrides = successfulDependencies({
    db,
    claim: async () => ({ id: 902 }),
    findOutgoing: async () => db.current(),
    generateReply: async () => {
      aiCalls += 1;
      throw new Error("OpenAI no debe ejecutarse en recovery concurrente");
    },
    sendReply: async (_message, part) => {
      calls.push(part[0]);
      await new Promise((resolve) => setImmediate(resolve));
      return { message_id: `ig-concurrent-${part[0]}` };
    },
    recordOutgoing: undefined,
  });

  const results = await Promise.all([
    processMetaMessage(incoming, overrides),
    processMetaMessage(incoming, overrides),
  ]);

  assert.deepEqual(
    results.map((result) => result.status),
    ["replied_recovered", "replied_recovered"]
  );
  assert.deepEqual(calls, ["A", "B", "C"]);
  assert.equal(aiCalls, 0);
  assert.equal(db.current().delivery_next_part_index, 3);
  assert.equal(db.current().status, "sent");
});

test("un outgoing corto de Instagram también finaliza con progreso consistente", async () => {
  const db = createInstagramDeliveryDb({
    id: 930,
    channel: "instagram",
    external_user_id: "ig-short",
    in_reply_to_message_id: 903,
    direction: "outgoing",
    author: "assistant",
    message_type: "text",
    content: "Mensaje corto",
    status: "pending",
  });
  let sends = 0;

  await processMetaMessage(
    message({
      channel: "instagram",
      externalUserId: "ig-short",
      messageId: "ig-in-short",
    }),
    successfulDependencies({
      db,
      claim: async () => ({ id: 903 }),
      findOutgoing: async () => db.current(),
      sendReply: async (_message, part) => {
        sends += 1;
        assert.equal(part, "Mensaje corto");
        return { message_id: "ig-short-id" };
      },
      recordOutgoing: undefined,
    })
  );

  assert.equal(sends, 1);
  assert.equal(db.current().delivery_part_count, 1);
  assert.equal(db.current().delivery_next_part_index, 1);
  assert.deepEqual(db.current().delivery_part_message_ids, ["ig-short-id"]);
  assert.equal(db.current().status, "sent");
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

test("los endpoints de mensajes exigen autenticación administrativa", async () => {
  const { server, baseUrl } = await startApp();
  try {
    const responses = await Promise.all([
      fetch(baseUrl + "/api/meta/handoffs"),
      fetch(baseUrl + "/api/meta/conversations"),
      fetch(baseUrl + "/api/meta/conversations/whatsapp/51999999999/messages"),
      fetch(baseUrl + "/api/meta/conversations/whatsapp/51999999999/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Hola" }),
      }),
    ]);

    for (const response of responses) assert.equal(response.status, 401);
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
