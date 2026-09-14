import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import { generateAiReply } from "../ai/ai.service.js";

const META_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);
const processedInMemory = new Set();
const handoffInMemory = new Map();
let warnedMissingMessagesTable = false;
let warnedMissingHandoffTable = false;

const UNSUPPORTED_MESSAGE_REPLY =
  "Por ahora puedo ayudarte mediante mensajes de texto. Escríbeme tu consulta, por favor.";

const HUMAN_HANDOFF_REPLY =
  "Claro, dejaré esta conversación para que la atienda una persona. El asistente automático quedará pausado en este chat.";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function fallbackMessageId({ channel, externalUserId, timestamp, text, messageType }) {
  const source = [channel, externalUserId, timestamp, messageType, text].join(":");
  return "derived." + crypto.createHash("sha256").update(source).digest("hex");
}

function normalizeMetaTimestamp(value, channel) {
  const raw = cleanText(value);
  if (!raw) return null;

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;

  const milliseconds = channel === "whatsapp" ? numeric * 1000 : numeric;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizedMessage({
  channel,
  externalUserId,
  messageId,
  text,
  messageType = "text",
  timestamp = "",
}) {
  const normalized = {
    channel,
    externalUserId: String(externalUserId),
    messageId: cleanText(messageId),
    text: cleanText(text),
    messageType: cleanText(messageType) || "unknown",
    timestamp: cleanText(timestamp),
  };

  if (!normalized.messageId) {
    normalized.messageId = fallbackMessageId(normalized);
  }

  return normalized;
}

function parseWhatsApp(body) {
  const messages = [];

  for (const entry of asArray(body.entry)) {
    for (const change of asArray(asObject(entry)?.changes)) {
      const value = asObject(asObject(change)?.value);

      for (const item of asArray(value?.messages)) {
        const message = asObject(item);
        const externalUserId = cleanText(message?.from);
        if (!message || !externalUserId) continue;

        const messageType = cleanText(message.type) || "unknown";
        const text =
          messageType === "text" ? cleanText(asObject(message.text)?.body) : "";

        if (messageType === "text" && !text) continue;

        messages.push(
          normalizedMessage({
            channel: "whatsapp",
            externalUserId,
            messageId: message.id,
            text,
            messageType,
            timestamp: message.timestamp,
          })
        );
      }
    }
  }

  return messages;
}

function messengerMessageType(message) {
  if (typeof message?.text === "string") return "text";
  if (asArray(message?.attachments).length > 0) {
    return cleanText(asObject(message.attachments[0])?.type) || "attachment";
  }
  return "unknown";
}

function parseMessenger(body, channel, ownAccountId) {
  const messages = [];

  for (const entry of asArray(body.entry)) {
    for (const item of asArray(asObject(entry)?.messaging)) {
      const event = asObject(item);
      const message = asObject(event?.message);
      const externalUserId = cleanText(asObject(event?.sender)?.id);

      if (
        !message ||
        !externalUserId ||
        message.is_echo === true ||
        (ownAccountId && externalUserId === ownAccountId)
      ) {
        continue;
      }

      const messageType = messengerMessageType(message);
      const text = cleanText(message.text);
      if (messageType === "text" && !text) continue;

      messages.push(
        normalizedMessage({
          channel,
          externalUserId,
          messageId: message.mid,
          text,
          messageType,
          timestamp: event.timestamp,
        })
      );
    }
  }

  return messages;
}

export function parseMetaWebhook(body = {}, options = {}) {
  const payload = asObject(body);
  if (!payload) return [];

  if (payload.object === "whatsapp_business_account") {
    return parseWhatsApp(payload);
  }
  if (payload.object === "instagram") {
    return parseMessenger(
      payload,
      "instagram",
      cleanText(options.instagramAccountId ?? env.meta.instagramAccountId)
    );
  }
  if (payload.object === "page") {
    return parseMessenger(
      payload,
      "facebook",
      cleanText(options.facebookPageId ?? env.meta.facebookPageId)
    );
  }
  return [];
}

export function verifyMetaSignature(signatureHeader, rawBody) {
  if (!env.meta.appSecret) return env.nodeEnv !== "production";
  if (!signatureHeader || !Buffer.isBuffer(rawBody)) return false;

  const signature = String(signatureHeader);
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", env.meta.appSecret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function isHumanHandoffRequest(text) {
  const normalized = cleanText(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    /\b(hablar|comunicar(?:me)?|contactar(?:me)?)\b.{0,35}\b(persona|alguien|humano|asesor|recepcionista)\b/,
    /\b(asesor|agente|atencion|soporte)\s+(humano|personal)\b/,
    /\bnecesito\s+ayuda\s+de\s+(una\s+)?persona\b/,
  ].some((pattern) => pattern.test(normalized));
}

function conversationKey(channel, externalUserId) {
  return channel + ":" + externalUserId;
}

function validateConversation(channel, externalUserId) {
  if (!META_CHANNELS.has(channel)) {
    const error = new Error("Canal de Meta no válido.");
    error.statusCode = 400;
    throw error;
  }

  if (!externalUserId || String(externalUserId).length > 160) {
    const error = new Error("external_user_id no es válido.");
    error.statusCode = 400;
    throw error;
  }
}

export async function persistIncomingMessages(messages, db = pool) {
  if (messages.length === 0) return [];

  const client = typeof db.connect === "function" ? await db.connect() : db;
  const shouldRelease = client !== db;

  try {
    if (shouldRelease) await client.query("BEGIN");
    const stored = [];

    for (const message of messages) {
      validateConversation(message.channel, message.externalUserId);

      await client.query(
        "INSERT INTO meta_conversations (channel, external_user_id, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (channel, external_user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;",
        [message.channel, message.externalUserId]
      );

      await client.query(
        "INSERT INTO meta_messages (channel, external_user_id, meta_message_id, direction, author, message_type, content, status, meta_timestamp) VALUES ($1, $2, $3, 'incoming', 'client', $4, $5, 'pending', $6) ON CONFLICT (channel, meta_message_id) WHERE meta_message_id IS NOT NULL DO NOTHING;",
        [
          message.channel,
          message.externalUserId,
          message.messageId,
          message.messageType,
          message.text,
          normalizeMetaTimestamp(message.timestamp, message.channel),
        ]
      );

      const result = await client.query(
        "SELECT id, channel, external_user_id, meta_message_id, message_type, content, status, meta_timestamp, created_at FROM meta_messages WHERE channel = $1 AND meta_message_id = $2 LIMIT 1;",
        [message.channel, message.messageId]
      );
      if (result.rows[0]) stored.push(result.rows[0]);
    }

    if (shouldRelease) await client.query("COMMIT");
    return stored;
  } catch (error) {
    if (shouldRelease) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldRelease) client.release();
  }
}

async function claimMessage(message, db = pool) {
  const key = conversationKey(message.channel, message.messageId);
  if (processedInMemory.has(key)) return false;

  try {
    await persistIncomingMessages([message], db);
    const result = await db.query(
      "UPDATE meta_messages SET status = 'processing', processing_attempts = processing_attempts + 1, last_attempt_at = CURRENT_TIMESTAMP, error_detail = NULL, updated_at = CURRENT_TIMESTAMP WHERE channel = $1 AND meta_message_id = $2 AND direction = 'incoming' AND status IN ('pending', 'failed') RETURNING id;",
      [message.channel, message.messageId]
    );
    return result.rows.length > 0;
  } catch (error) {
    if (env.nodeEnv === "production") throw error;

    if (!warnedMissingMessagesTable) {
      console.warn(
        "No se pudo usar meta_messages; se usará memoria temporal en desarrollo:",
        error.message
      );
      warnedMissingMessagesTable = true;
    }

    processedInMemory.add(key);
    if (processedInMemory.size > 10_000) processedInMemory.clear();
    return true;
  }
}

async function releaseMessageClaim(message, db = pool, error = null) {
  const key = conversationKey(message.channel, message.messageId);
  processedInMemory.delete(key);

  try {
    await db.query(
      "UPDATE meta_messages SET status = 'failed', error_detail = $3, updated_at = CURRENT_TIMESTAMP WHERE channel = $1 AND meta_message_id = $2 AND direction = 'incoming';",
      [message.channel, message.messageId, cleanText(error?.message || error).slice(0, 1000) || null]
    );
  } catch {
    // En desarrollo la tabla puede no existir antes de ejecutar la migración.
  }
}

async function completeMessage(message, db = pool) {
  const key = conversationKey(message.channel, message.messageId);
  processedInMemory.add(key);

  try {
    await db.query(
      "UPDATE meta_messages SET status = 'received', error_detail = NULL, updated_at = CURRENT_TIMESTAMP WHERE channel = $1 AND meta_message_id = $2 AND direction = 'incoming';",
      [message.channel, message.messageId]
    );
  } catch (error) {
    if (env.nodeEnv === "production") throw error;
  }
}

async function getHandoffState(channel, externalUserId, db = pool) {
  const key = conversationKey(channel, externalUserId);

  try {
    const result = await db.query(
      "SELECT handoff_active FROM meta_conversations WHERE channel = $1 AND external_user_id = $2 LIMIT 1;",
      [channel, externalUserId]
    );
    return result.rows[0]?.handoff_active === true;
  } catch (error) {
    if (env.nodeEnv === "production") throw error;

    if (!warnedMissingHandoffTable) {
      console.warn(
        "No se pudo usar meta_conversations; el handoff será temporal en desarrollo:",
        error.message
      );
      warnedMissingHandoffTable = true;
    }
    return handoffInMemory.get(key) === true;
  }
}

export async function setHandoffState(
  channel,
  externalUserId,
  active,
  db = pool
) {
  validateConversation(channel, externalUserId);
  const key = conversationKey(channel, externalUserId);
  handoffInMemory.set(key, active === true);

  try {
    const result = await db.query(
      "INSERT INTO meta_conversations (channel, external_user_id, handoff_active, handoff_requested_at, handoff_resolved_at, updated_at) VALUES ($1, $2, $3, CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END, CASE WHEN $3 THEN NULL ELSE CURRENT_TIMESTAMP END, CURRENT_TIMESTAMP) ON CONFLICT (channel, external_user_id) DO UPDATE SET handoff_active = EXCLUDED.handoff_active, handoff_requested_at = CASE WHEN EXCLUDED.handoff_active THEN CURRENT_TIMESTAMP ELSE meta_conversations.handoff_requested_at END, handoff_resolved_at = CASE WHEN EXCLUDED.handoff_active THEN NULL ELSE CURRENT_TIMESTAMP END, updated_at = CURRENT_TIMESTAMP RETURNING channel, external_user_id, handoff_active, handoff_requested_at, handoff_resolved_at, updated_at;",
      [channel, externalUserId, active === true]
    );
    return result.rows[0];
  } catch (error) {
    if (env.nodeEnv === "production") throw error;
    return {
      channel,
      external_user_id: externalUserId,
      handoff_active: active === true,
    };
  }
}

export async function listActiveHandoffs(db = pool) {
  const result = await db.query(
    "SELECT channel, external_user_id, handoff_requested_at, updated_at FROM meta_conversations WHERE handoff_active = TRUE ORDER BY handoff_requested_at ASC NULLS LAST, updated_at ASC;"
  );
  return result.rows;
}

export async function listConversations(db = pool) {
  const result = await db.query(
    "SELECT c.channel, c.external_user_id, c.handoff_active, c.handoff_requested_at, c.handoff_resolved_at, c.created_at, c.updated_at, m.content AS last_message, m.author AS last_author, m.message_type AS last_message_type, m.status AS last_status, m.created_at AS last_message_at FROM meta_conversations c LEFT JOIN LATERAL (SELECT content, author, message_type, status, created_at FROM meta_messages WHERE channel = c.channel AND external_user_id = c.external_user_id ORDER BY COALESCE(meta_timestamp, created_at) DESC, id DESC LIMIT 1) m ON TRUE ORDER BY COALESCE(m.created_at, c.updated_at) DESC;"
  );
  return result.rows;
}

export async function listConversationMessages(
  channel,
  externalUserId,
  { limit = 100 } = {},
  db = pool
) {
  validateConversation(channel, externalUserId);
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const result = await db.query(
    "SELECT * FROM (SELECT id, channel, external_user_id, meta_message_id, direction, author, message_type, content, status, meta_timestamp, error_detail, created_at, updated_at FROM meta_messages WHERE channel = $1 AND external_user_id = $2 ORDER BY COALESCE(meta_timestamp, created_at) DESC, id DESC LIMIT $3) recent ORDER BY COALESCE(meta_timestamp, created_at) ASC, id ASC;",
    [channel, externalUserId, safeLimit]
  );
  return result.rows;
}

async function getRecentConversationHistory(
  channel,
  externalUserId,
  excludeMessageId,
  db = pool
) {
  const result = await db.query(
    "WITH last_ai AS (SELECT MAX(created_at) AS created_at FROM meta_messages WHERE channel = $1 AND external_user_id = $2 AND author = 'assistant' AND status = 'sent') SELECT author, content, created_at FROM meta_messages, last_ai WHERE channel = $1 AND external_user_id = $2 AND content <> '' AND ($3::text IS NULL OR meta_message_id IS DISTINCT FROM $3) AND (last_ai.created_at IS NULL OR meta_messages.created_at > last_ai.created_at) ORDER BY meta_messages.created_at DESC, id DESC LIMIT 20;",
    [channel, externalUserId, excludeMessageId || null]
  );

  const history = result.rows.reverse();
  return history.some((item) => item.author === "admin") ? history : [];
}

export async function listRecoverableMessages(db = pool) {
  const result = await db.query(
    "UPDATE meta_messages SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE direction = 'incoming' AND status = 'processing' AND last_attempt_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes';"
  );
  void result;

  const pending = await db.query(
    "SELECT channel, external_user_id, meta_message_id, content, message_type, meta_timestamp FROM meta_messages WHERE direction = 'incoming' AND status IN ('pending', 'failed') ORDER BY created_at ASC LIMIT 100;"
  );

  return pending.rows.map((row) =>
    normalizedMessage({
      channel: row.channel,
      externalUserId: row.external_user_id,
      messageId: row.meta_message_id,
      text: row.content,
      messageType: row.message_type,
      timestamp: row.meta_timestamp ? new Date(row.meta_timestamp).getTime() : "",
    })
  );
}

function graphBaseUrl() {
  const version = cleanText(env.meta.graphApiVersion);
  if (!/^v\d+\.\d+$/.test(version)) {
    const error = new Error("META_GRAPH_API_VERSION no es válida.");
    error.statusCode = 503;
    throw error;
  }
  return "https://graph.facebook.com/" + version;
}

async function graphPost(path, accessToken, payload) {
  if (!accessToken) {
    throw new Error("Falta el token del canal de Meta.");
  }

  const response = await fetch(graphBaseUrl() + "/" + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      "Meta respondió " + response.status + ": " + responseText.slice(0, 300)
    );
  }

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    return {};
  }
}

async function sendWhatsApp(externalUserId, reply) {
  if (!env.meta.whatsappPhoneNumberId) {
    throw new Error("Falta WHATSAPP_PHONE_NUMBER_ID.");
  }

  return graphPost(
    env.meta.whatsappPhoneNumberId + "/messages",
    env.meta.whatsappAccessToken,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: externalUserId,
      type: "text",
      text: { preview_url: false, body: reply },
    }
  );
}

async function sendFacebook(externalUserId, reply) {
  if (!env.meta.facebookPageId) throw new Error("Falta FACEBOOK_PAGE_ID.");
  return graphPost(
    env.meta.facebookPageId + "/messages",
    env.meta.facebookPageAccessToken,
    {
      messaging_type: "RESPONSE",
      recipient: { id: externalUserId },
      message: { text: reply },
    }
  );
}

async function sendInstagram(externalUserId, reply) {
  if (!env.meta.instagramAccountId) {
    throw new Error("Falta INSTAGRAM_ACCOUNT_ID.");
  }
  return graphPost(
    env.meta.instagramAccountId + "/messages",
    env.meta.instagramAccessToken || env.meta.facebookPageAccessToken,
    {
      recipient: { id: externalUserId },
      message: { text: reply },
    }
  );
}

export async function sendMetaReply(message, reply) {
  if (message.channel === "whatsapp") {
    return sendWhatsApp(message.externalUserId, reply);
  }
  if (message.channel === "facebook") {
    return sendFacebook(message.externalUserId, reply);
  }
  if (message.channel === "instagram") {
    return sendInstagram(message.externalUserId, reply);
  }
  throw new Error("Canal de Meta no reconocido: " + message.channel);
}

function sentMessageId(result) {
  return cleanText(result?.messages?.[0]?.id || result?.message_id) || null;
}

async function recordOutgoingMessage(
  message,
  reply,
  author,
  result,
  error = null,
  db = pool
) {
  const status = error ? "failed" : "sent";
  const metaMessageId = sentMessageId(result);

  await db.query(
    "INSERT INTO meta_conversations (channel, external_user_id, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (channel, external_user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;",
    [message.channel, message.externalUserId]
  );

  const saved = await db.query(
    "INSERT INTO meta_messages (channel, external_user_id, meta_message_id, direction, author, message_type, content, status, error_detail, meta_timestamp) VALUES ($1, $2, $3, 'outgoing', $4, 'text', $5, $6, $7, CURRENT_TIMESTAMP) RETURNING id, channel, external_user_id, meta_message_id, direction, author, message_type, content, status, error_detail, meta_timestamp, created_at, updated_at;",
    [
      message.channel,
      message.externalUserId,
      metaMessageId,
      author,
      reply,
      status,
      error ? cleanText(error.message || error).slice(0, 1000) : null,
    ]
  );
  return saved.rows[0];
}

async function sendWithRetry(message, reply, send, sleep) {
  const delays = [0, 500, 2_000];
  let lastError;

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    try {
      return await send(message, reply);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function sendManualMetaMessage(
  channel,
  externalUserId,
  text,
  db = pool
) {
  validateConversation(channel, externalUserId);
  const reply = cleanText(text);
  if (!reply || reply.length > 4000) {
    const error = new Error("El mensaje debe tener entre 1 y 4000 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  const target = normalizedMessage({
    channel,
    externalUserId,
    messageId: "",
    text: reply,
    messageType: "text",
    timestamp: "",
  });

  await setHandoffState(channel, externalUserId, true, db);

  try {
    const result = await sendMetaReply(target, reply);
    return await recordOutgoingMessage(target, reply, "admin", result, null, db);
  } catch (error) {
    await recordOutgoingMessage(target, reply, "admin", null, error, db);
    throw error;
  }
}

export async function processMetaMessage(message, overrides = {}) {
  const dependencies = {
    claim: overrides.claim ?? claimMessage,
    release: overrides.release ?? releaseMessageClaim,
    complete: overrides.complete ?? completeMessage,
    getHandoff: overrides.getHandoff ?? getHandoffState,
    setHandoff: overrides.setHandoff ?? setHandoffState,
    loadHistory: overrides.loadHistory ?? getRecentConversationHistory,
    generateReply: overrides.generateReply ?? generateAiReply,
    sendReply: overrides.sendReply ?? sendMetaReply,
    recordOutgoing: overrides.recordOutgoing ?? recordOutgoingMessage,
    sleep:
      overrides.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds))),
  };

  if (!(await dependencies.claim(message))) {
    return { status: "duplicate" };
  }

  try {
    if (
      await dependencies.getHandoff(message.channel, message.externalUserId)
    ) {
      await dependencies.complete(message);
      return { status: "handoff_active" };
    }

    if (isHumanHandoffRequest(message.text)) {
      await dependencies.setHandoff(
        message.channel,
        message.externalUserId,
        true
      );
      const sent = await sendWithRetry(
        message,
        HUMAN_HANDOFF_REPLY,
        dependencies.sendReply,
        dependencies.sleep
      );
      await dependencies.recordOutgoing(
        message,
        HUMAN_HANDOFF_REPLY,
        "assistant",
        sent
      );
      await dependencies.complete(message);
      return { status: "handoff_requested" };
    }

    if (message.messageType !== "text") {
      const sent = await sendWithRetry(
        message,
        UNSUPPORTED_MESSAGE_REPLY,
        dependencies.sendReply,
        dependencies.sleep
      );
      await dependencies.recordOutgoing(
        message,
        UNSUPPORTED_MESSAGE_REPLY,
        "assistant",
        sent
      );
      await dependencies.complete(message);
      return { status: "unsupported" };
    }

    const history = await dependencies.loadHistory(
      message.channel,
      message.externalUserId,
      message.messageId
    );
    const result = await dependencies.generateReply({
      channel: message.channel,
      externalUserId: message.externalUserId,
      message: message.text,
      history,
    });

    const sent = await sendWithRetry(
      message,
      result.reply,
      dependencies.sendReply,
      dependencies.sleep
    );
    await dependencies.recordOutgoing(
      message,
      result.reply,
      "assistant",
      sent
    );
    await dependencies.complete(message);

    return { status: "replied" };
  } catch (error) {
    await dependencies.release(message, undefined, error);
    throw error;
  }
}
