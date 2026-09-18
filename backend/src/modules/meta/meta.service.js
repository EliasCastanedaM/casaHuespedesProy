import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import { generateAiReply } from "../ai/ai.service.js";
import {
  sendInstagramMessageParts,
  splitInstagramMessage,
} from "./instagram.transport.js";

const META_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);
const processedInMemory = new Set();
const handoffInMemory = new Map();
const MAX_PROCESSING_ATTEMPTS = 5;
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
  customerName = "",
}) {
  const normalized = {
    channel,
    externalUserId: String(externalUserId),
    messageId: cleanText(messageId),
    text: cleanText(text),
    messageType: cleanText(messageType) || "unknown",
    timestamp: cleanText(timestamp),
  };

  const name = cleanText(customerName);
  if (name) normalized.customerName = name;

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
      const contactNames = new Map();

      for (const rawContact of asArray(value?.contacts)) {
        const contact = asObject(rawContact);
        const waId = cleanText(contact?.wa_id);
        const name = cleanText(asObject(contact?.profile)?.name);
        if (waId && name) contactNames.set(waId, name);
      }

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
            customerName: contactNames.get(externalUserId) || "",
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

export function parseMetaStatusUpdates(body = {}) {
  const payload = asObject(body);
  if (!payload || payload.object !== "whatsapp_business_account") return [];

  const updates = [];
  for (const entry of asArray(payload.entry)) {
    for (const change of asArray(asObject(entry)?.changes)) {
      const value = asObject(asObject(change)?.value);
      for (const rawStatus of asArray(value?.statuses)) {
        const status = asObject(rawStatus);
        const messageId = cleanText(status?.id);
        const state = cleanText(status?.status).toLowerCase();
        if (!messageId || !["sent", "delivered", "read", "failed"].includes(state)) {
          continue;
        }

        const firstError = asObject(asArray(status?.errors)[0]);
        const errorDetail = cleanText(
          firstError?.message || firstError?.title || firstError?.error_data?.details
        );

        updates.push({
          channel: "whatsapp",
          messageId,
          status: state,
          timestamp: cleanText(status?.timestamp),
          errorDetail: errorDetail.slice(0, 1000),
        });
      }
    }
  }
  return updates;
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
      const metaTimestamp = normalizeMetaTimestamp(message.timestamp, message.channel);

      await client.query(
        `INSERT INTO meta_conversations
          (channel, external_user_id, customer_name, last_message_at, updated_at)
         VALUES ($1, $2, NULLIF($3, ''), COALESCE($4::timestamptz, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
         ON CONFLICT (channel, external_user_id) DO UPDATE SET
           customer_name = COALESCE(NULLIF(EXCLUDED.customer_name, ''), meta_conversations.customer_name),
           last_message_at = GREATEST(
             COALESCE(meta_conversations.last_message_at, '-infinity'::timestamptz),
             COALESCE(EXCLUDED.last_message_at, CURRENT_TIMESTAMP)
           ),
           updated_at = CURRENT_TIMESTAMP;`,
        [
          message.channel,
          message.externalUserId,
          cleanText(message.customerName),
          metaTimestamp,
        ]
      );

      await client.query(
        `INSERT INTO meta_messages
          (channel, external_user_id, meta_message_id, direction, author, message_type, content, status, meta_timestamp)
         VALUES ($1, $2, $3, 'incoming', 'client', $4, $5, 'pending', $6)
         ON CONFLICT (channel, meta_message_id) WHERE meta_message_id IS NOT NULL DO NOTHING;`,
        [
          message.channel,
          message.externalUserId,
          message.messageId,
          message.messageType,
          message.text,
          metaTimestamp,
        ]
      );

      const result = await client.query(
        `SELECT id, channel, external_user_id, meta_message_id, message_type, content,
                status, meta_timestamp, processing_attempts, created_at
         FROM meta_messages
         WHERE channel = $1 AND meta_message_id = $2
         LIMIT 1;`,
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

  try {
    await persistIncomingMessages([message], db);
    const result = await db.query(
      `UPDATE meta_messages
       SET status = 'processing',
           processing_attempts = processing_attempts + 1,
           last_attempt_at = CURRENT_TIMESTAMP,
           error_detail = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE channel = $1
         AND meta_message_id = $2
         AND direction = 'incoming'
         AND status IN ('pending', 'failed')
         AND processing_attempts < $3
       RETURNING id, processing_attempts;`,
      [message.channel, message.messageId, MAX_PROCESSING_ATTEMPTS]
    );
    return result.rows[0] || false;
  } catch (error) {
    if (env.nodeEnv === "production") throw error;

    if (!warnedMissingMessagesTable) {
      console.warn(
        "No se pudo usar meta_messages; se usará memoria temporal en desarrollo:",
        error.message
      );
      warnedMissingMessagesTable = true;
    }

    if (processedInMemory.has(key)) return false;
    processedInMemory.add(key);
    if (processedInMemory.size > 10_000) processedInMemory.clear();
    return true;
  }
}

async function releaseMessageClaim(message, error = null, db = pool) {
  const key = conversationKey(message.channel, message.messageId);
  processedInMemory.delete(key);

  try {
    await db.query(
      `UPDATE meta_messages
       SET status = 'failed', error_detail = $3, updated_at = CURRENT_TIMESTAMP
       WHERE channel = $1 AND meta_message_id = $2 AND direction = 'incoming';`,
      [
        message.channel,
        message.messageId,
        cleanText(error?.message || error).slice(0, 1000) || null,
      ]
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
      `UPDATE meta_messages
       SET status = 'received', error_detail = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE channel = $1 AND meta_message_id = $2 AND direction = 'incoming';`,
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
      `INSERT INTO meta_conversations
        (channel, external_user_id, handoff_active, handoff_requested_at, handoff_resolved_at, updated_at)
       VALUES ($1, $2, $3,
         CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,
         CASE WHEN $3 THEN NULL ELSE CURRENT_TIMESTAMP END,
         CURRENT_TIMESTAMP)
       ON CONFLICT (channel, external_user_id) DO UPDATE SET
         handoff_active = EXCLUDED.handoff_active,
         handoff_requested_at = CASE
           WHEN EXCLUDED.handoff_active THEN CURRENT_TIMESTAMP
           ELSE meta_conversations.handoff_requested_at
         END,
         handoff_resolved_at = CASE
           WHEN EXCLUDED.handoff_active THEN NULL
           ELSE CURRENT_TIMESTAMP
         END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING channel, external_user_id, customer_name, handoff_active,
                 handoff_requested_at, handoff_resolved_at, updated_at;`,
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
    `SELECT channel, external_user_id, customer_name, handoff_requested_at, updated_at
     FROM meta_conversations
     WHERE handoff_active = TRUE
     ORDER BY handoff_requested_at ASC NULLS LAST, updated_at ASC;`
  );
  return result.rows;
}

export async function listConversations(db = pool) {
  const result = await db.query(
    `SELECT c.channel, c.external_user_id, c.customer_name, c.handoff_active,
            c.handoff_requested_at, c.handoff_resolved_at, c.created_at, c.updated_at,
            m.content AS last_message, m.author AS last_author,
            m.message_type AS last_message_type, m.status AS last_status,
            COALESCE(m.meta_timestamp, m.created_at, c.last_message_at, c.updated_at) AS last_message_at
     FROM meta_conversations c
     LEFT JOIN LATERAL (
       SELECT content, author, message_type, status, meta_timestamp, created_at
       FROM meta_messages
       WHERE channel = c.channel AND external_user_id = c.external_user_id
       ORDER BY COALESCE(meta_timestamp, created_at) DESC, id DESC
       LIMIT 1
     ) m ON TRUE
     ORDER BY COALESCE(m.meta_timestamp, m.created_at, c.last_message_at, c.updated_at) DESC
     LIMIT 50;`
  );
  return result.rows;
}

export async function listConversationMessages(
  channel,
  externalUserId,
  { limit = 50 } = {},
  db = pool
) {
  validateConversation(channel, externalUserId);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const result = await db.query(
    `SELECT * FROM (
       SELECT id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
              direction, author, message_type, content, status, meta_timestamp,
              error_detail, processing_attempts, created_at, updated_at
       FROM meta_messages
       WHERE channel = $1 AND external_user_id = $2
       ORDER BY COALESCE(meta_timestamp, created_at) DESC, id DESC
       LIMIT $3
     ) recent
     ORDER BY COALESCE(meta_timestamp, created_at) ASC, id ASC;`,
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
    `WITH last_ai AS (
       SELECT MAX(created_at) AS created_at
       FROM meta_messages
       WHERE channel = $1
         AND external_user_id = $2
         AND author = 'assistant'
         AND status IN ('sent', 'delivered', 'read')
     )
     SELECT author, content, meta_messages.created_at
     FROM meta_messages, last_ai
     WHERE channel = $1
       AND external_user_id = $2
       AND content <> ''
       AND ($3::text IS NULL OR meta_message_id IS DISTINCT FROM $3)
       AND (direction = 'incoming' OR status IN ('sent', 'delivered', 'read'))
       AND (last_ai.created_at IS NULL OR meta_messages.created_at > last_ai.created_at)
     ORDER BY meta_messages.created_at DESC, id DESC
     LIMIT 20;`,
    [channel, externalUserId, excludeMessageId || null]
  );

  const history = result.rows.reverse();
  return history.some((item) => item.author === "admin") ? history : [];
}

async function findAssistantOutgoingForIncoming(incomingId, db = pool) {
  if (!incomingId) return null;
  const result = await db.query(
    `SELECT id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
            direction, author, message_type, content, status, error_detail,
            processing_attempts, delivery_part_count, delivery_next_part_index,
            delivery_part_message_ids, created_at, updated_at
     FROM meta_messages
     WHERE in_reply_to_message_id = $1
       AND direction = 'outgoing'
       AND author = 'assistant'
     ORDER BY id ASC
     LIMIT 1;`,
    [incomingId]
  );
  return result.rows[0] || null;
}

async function createOutgoingMessage(
  message,
  reply,
  author,
  inReplyToMessageId = null,
  db = pool
) {
  await db.query(
    `INSERT INTO meta_conversations
      (channel, external_user_id, last_message_at, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (channel, external_user_id) DO UPDATE SET
       last_message_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP;`,
    [message.channel, message.externalUserId]
  );

  try {
    const saved = await db.query(
      `INSERT INTO meta_messages
        (channel, external_user_id, direction, author, message_type, content,
         status, meta_timestamp, in_reply_to_message_id)
       VALUES ($1, $2, 'outgoing', $3, 'text', $4, 'pending', CURRENT_TIMESTAMP, $5)
       RETURNING id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
                 direction, author, message_type, content, status, error_detail,
                 processing_attempts, delivery_part_count, delivery_next_part_index,
                 delivery_part_message_ids, meta_timestamp, created_at, updated_at;`,
      [message.channel, message.externalUserId, author, reply, inReplyToMessageId]
    );
    return saved.rows[0];
  } catch (error) {
    if (error?.code === "23505" && inReplyToMessageId && author === "assistant") {
      return findAssistantOutgoingForIncoming(inReplyToMessageId, db);
    }
    throw error;
  }
}

export async function listRecoverableMessages(db = pool) {
  await db.query(
    `UPDATE meta_messages AS incoming
     SET status = 'failed',
         error_detail = COALESCE(
           incoming.error_detail,
           'Entrega de Instagram interrumpida antes de completarse.'
         ),
         updated_at = CURRENT_TIMESTAMP
     WHERE incoming.channel = 'instagram'
       AND incoming.direction = 'incoming'
       AND incoming.status = 'processing'
       AND EXISTS (
         SELECT 1
         FROM meta_messages AS outgoing
         WHERE outgoing.in_reply_to_message_id = incoming.id
           AND outgoing.channel = 'instagram'
           AND outgoing.direction = 'outgoing'
           AND outgoing.author = 'assistant'
           AND outgoing.status IN ('pending', 'failed')
       );`
  );

  await db.query(
    `UPDATE meta_messages
     SET status = 'failed',
         error_detail = COALESCE(error_detail, 'Procesamiento interrumpido antes de completarse.'),
         updated_at = CURRENT_TIMESTAMP
     WHERE direction = 'incoming'
       AND status = 'processing'
       AND last_attempt_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes';`
  );

  const pending = await db.query(
    `SELECT channel, external_user_id, meta_message_id, content, message_type, meta_timestamp
     FROM meta_messages
     WHERE direction = 'incoming'
       AND status IN ('pending', 'failed')
       AND processing_attempts < $1
     ORDER BY created_at ASC
     LIMIT 100;`,
    [MAX_PROCESSING_ATTEMPTS]
  );

  return pending.rows.map((row) => {
    let timestamp = "";
    if (row.meta_timestamp) {
      const milliseconds = new Date(row.meta_timestamp).getTime();
      timestamp =
        row.channel === "whatsapp"
          ? String(Math.floor(milliseconds / 1000))
          : String(milliseconds);
    }
    return normalizedMessage({
      channel: row.channel,
      externalUserId: row.external_user_id,
      messageId: row.meta_message_id,
      text: row.content,
      messageType: row.message_type,
      timestamp,
    });
  });
}

export async function applyMetaStatusUpdates(updates, db = pool) {
  const changed = [];
  for (const update of updates) {
    if (update.channel !== "whatsapp") continue;

    const result = await db.query(
      `UPDATE meta_messages
       SET status = CASE
         WHEN $2 = 'read' AND status IN ('pending', 'processing', 'failed', 'sent', 'delivered', 'read') THEN 'read'
         WHEN $2 = 'delivered' AND status IN ('pending', 'processing', 'failed', 'sent', 'delivered') THEN 'delivered'
         WHEN $2 = 'sent' AND status IN ('pending', 'processing', 'failed', 'sent') THEN 'sent'
         WHEN $2 = 'failed' AND status <> 'read' THEN 'failed'
         ELSE status
       END,
       error_detail = CASE
         WHEN $2 = 'failed' THEN NULLIF($3, '')
         WHEN $2 IN ('sent', 'delivered', 'read') THEN NULL
         ELSE error_detail
       END,
       updated_at = CURRENT_TIMESTAMP
       WHERE channel = 'whatsapp'
         AND meta_message_id = $1
         AND direction = 'outgoing'
       RETURNING id, meta_message_id, status;`,
      [update.messageId, update.status, cleanText(update.errorDetail).slice(0, 1000)]
    );
    if (result.rows[0]) changed.push(result.rows[0]);
  }
  return changed;
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
  return sendInstagramMessageParts(reply, (part) =>
    graphPost(
      env.meta.instagramAccountId + "/messages",
      env.meta.instagramAccessToken || env.meta.facebookPageAccessToken,
      {
        recipient: { id: externalUserId },
        message: { text: part },
      }
    )
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
  db = pool,
  outgoing = null
) {
  const savedOutgoing =
    outgoing || (await createOutgoingMessage(message, reply, author, null, db));
  const status = error ? "failed" : "sent";
  const metaMessageId = sentMessageId(result);

  const saved = await db.query(
    `UPDATE meta_messages
     SET meta_message_id = COALESCE($2, meta_message_id),
         status = $3,
         error_detail = $4,
         processing_attempts = processing_attempts + 1,
         last_attempt_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
               direction, author, message_type, content, status, error_detail,
               processing_attempts, delivery_part_count, delivery_next_part_index,
               delivery_part_message_ids, meta_timestamp, created_at, updated_at;`,
    [
      savedOutgoing.id,
      metaMessageId,
      status,
      error ? cleanText(error.message || error).slice(0, 1000) : null,
    ]
  );
  return saved.rows[0];
}

async function sendWithRetry(message, reply, send, sleep) {
  const delays = [0, 500, 2_000];
  const parts = message.channel === "instagram"
    ? splitInstagramMessage(reply)
    : [reply];
  let lastResult;

  for (const part of parts) {
    lastResult = await sendPartWithRetry(message, part, send, sleep, delays);
  }

  return lastResult;
}

async function sendPartWithRetry(
  message,
  part,
  send,
  sleep,
  delays = [0, 500, 2_000]
) {
  let lastError;
  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    try {
      return await send(message, part);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const INSTAGRAM_DELIVERY_LOCK_NAMESPACE = "instagram-outgoing:";

async function loadOutgoingForDelivery(id, db) {
  const result = await db.query(
    `SELECT id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
            direction, author, message_type, content, status, error_detail,
            processing_attempts, delivery_part_count, delivery_next_part_index,
            delivery_part_message_ids, meta_timestamp, created_at, updated_at
     FROM meta_messages
     WHERE id = $1
     LIMIT 1;`,
    [id]
  );
  return result.rows[0] || null;
}

async function initializeInstagramDelivery(outgoingId, partCount, db) {
  const result = await db.query(
    `UPDATE meta_messages
     SET delivery_part_count = COALESCE(delivery_part_count, $2),
         updated_at = CASE
           WHEN delivery_part_count IS NULL THEN CURRENT_TIMESTAMP
           ELSE updated_at
         END
     WHERE id = $1
       AND channel = 'instagram'
       AND direction = 'outgoing'
       AND (delivery_part_count IS NULL OR delivery_part_count = $2)
     RETURNING id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
               direction, author, message_type, content, status, error_detail,
               processing_attempts, delivery_part_count, delivery_next_part_index,
               delivery_part_message_ids, meta_timestamp, created_at, updated_at;`,
    [outgoingId, partCount]
  );

  if (!result.rows[0]) {
    throw new Error(
      "La división actual del mensaje de Instagram no coincide con el progreso persistido."
    );
  }
  return result.rows[0];
}

async function recordInstagramPartAccepted(
  outgoingId,
  partCount,
  partIndex,
  result,
  db
) {
  const messageId = sentMessageId(result);
  const saved = await db.query(
    `UPDATE meta_messages
     SET delivery_next_part_index = $4,
         delivery_part_message_ids =
           delivery_part_message_ids || jsonb_build_array($5::text),
         meta_message_id = COALESCE($5, meta_message_id),
         error_detail = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND delivery_part_count = $2
       AND delivery_next_part_index = $3
     RETURNING id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
               direction, author, message_type, content, status, error_detail,
               processing_attempts, delivery_part_count, delivery_next_part_index,
               delivery_part_message_ids, meta_timestamp, created_at, updated_at;`,
    [outgoingId, partCount, partIndex, partIndex + 1, messageId]
  );

  if (!saved.rows[0]) {
    throw new Error(
      "No se pudo guardar el progreso de entrega de Instagram de forma consistente."
    );
  }
  return saved.rows[0];
}

async function finalizeInstagramDelivery(outgoingId, db) {
  const result = await db.query(
    `UPDATE meta_messages
     SET status = 'sent',
         error_detail = NULL,
         processing_attempts = processing_attempts + 1,
         last_attempt_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND delivery_part_count IS NOT NULL
       AND delivery_next_part_index = delivery_part_count
     RETURNING id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
               direction, author, message_type, content, status, error_detail,
               processing_attempts, delivery_part_count, delivery_next_part_index,
               delivery_part_message_ids, meta_timestamp, created_at, updated_at;`,
    [outgoingId]
  );

  if (!result.rows[0]) {
    throw new Error(
      "Instagram no puede marcar el outgoing como enviado antes de completar todas sus partes."
    );
  }
  return result.rows[0];
}

async function acquireInstagramDeliveryClient(db, outgoingId) {
  const client = typeof db.connect === "function" ? await db.connect() : db;
  let locked = false;
  try {
    await client.query(
      `SELECT pg_advisory_lock(
         hashtextextended($1::text || $2::text, 0)
       );`,
      [INSTAGRAM_DELIVERY_LOCK_NAMESPACE, outgoingId]
    );
    locked = true;
    return {
      client,
      async release() {
        try {
          if (locked) {
            await client.query(
              `SELECT pg_advisory_unlock(
                 hashtextextended($1::text || $2::text, 0)
               );`,
              [INSTAGRAM_DELIVERY_LOCK_NAMESPACE, outgoingId]
            );
          }
        } finally {
          if (typeof client.release === "function") client.release();
        }
      },
    };
  } catch (error) {
    if (typeof client.release === "function") client.release();
    throw error;
  }
}

async function deliverInstagramPersistedOutgoing(
  message,
  outgoing,
  dependencies,
  author
) {
  const lock = await acquireInstagramDeliveryClient(dependencies.db, outgoing.id);
  let current = outgoing;

  try {
    current = await loadOutgoingForDelivery(outgoing.id, lock.client);
    if (!current) throw new Error("No se encontró el outgoing de Instagram.");
    if (["sent", "delivered", "read"].includes(current.status)) return current;

    const parts = splitInstagramMessage(current.content);
    current = await initializeInstagramDelivery(current.id, parts.length, lock.client);

    const nextPartIndex = Number(current.delivery_next_part_index);
    if (
      !Number.isInteger(nextPartIndex) ||
      nextPartIndex < 0 ||
      nextPartIndex > parts.length
    ) {
      throw new Error("El progreso persistido de Instagram no es válido.");
    }

    for (let index = nextPartIndex; index < parts.length; index += 1) {
      const result = await sendPartWithRetry(
        message,
        parts[index],
        dependencies.sendReply,
        dependencies.sleep
      );
      current = await recordInstagramPartAccepted(
        current.id,
        parts.length,
        index,
        result,
        lock.client
      );
    }

    return await finalizeInstagramDelivery(current.id, lock.client);
  } catch (error) {
    await dependencies.recordOutgoing(
      message,
      current?.content || outgoing.content,
      author,
      null,
      error,
      lock.client,
      current || outgoing
    );
    throw error;
  } finally {
    await lock.release();
  }
}

async function deliverPersistedOutgoing(
  message,
  outgoing,
  dependencies,
  author = outgoing?.author || "assistant"
) {
  if (["sent", "delivered", "read"].includes(outgoing?.status)) {
    return outgoing;
  }

  if (message.channel === "instagram" && outgoing?.id && dependencies.db) {
    return deliverInstagramPersistedOutgoing(
      message,
      outgoing,
      dependencies,
      author
    );
  }

  try {
    const sent = await sendWithRetry(
      message,
      outgoing.content,
      dependencies.sendReply,
      dependencies.sleep
    );
    return await dependencies.recordOutgoing(
      message,
      outgoing.content,
      author,
      sent,
      null,
      dependencies.db || pool,
      outgoing
    );
  } catch (error) {
    await dependencies.recordOutgoing(
      message,
      outgoing.content,
      author,
      null,
      error,
      dependencies.db || pool,
      outgoing
    );
    throw error;
  }
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
  const outgoing = await createOutgoingMessage(target, reply, "admin", null, db);

  if (channel === "instagram") {
    return deliverPersistedOutgoing(
      target,
      outgoing,
      {
        db,
        sendReply: sendMetaReply,
        recordOutgoing: recordOutgoingMessage,
        sleep: (milliseconds) =>
          new Promise((resolve) => setTimeout(resolve, milliseconds)),
      },
      "admin"
    );
  }

  try {
    const result = await sendWithRetry(
      target,
      reply,
      sendMetaReply,
      (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
    );
    return await recordOutgoingMessage(
      target,
      reply,
      "admin",
      result,
      null,
      db,
      outgoing
    );
  } catch (error) {
    await recordOutgoingMessage(
      target,
      reply,
      "admin",
      null,
      error,
      db,
      outgoing
    );
    throw error;
  }
}

export async function processMetaMessage(message, overrides = {}) {
  const mockedPersistence = overrides.claim !== undefined;
  const dependencies = {
    db: overrides.db ?? (mockedPersistence ? null : pool),
    claim: overrides.claim ?? claimMessage,
    release: overrides.release ?? releaseMessageClaim,
    complete: overrides.complete ?? completeMessage,
    getHandoff: overrides.getHandoff ?? getHandoffState,
    setHandoff: overrides.setHandoff ?? setHandoffState,
    loadHistory: overrides.loadHistory ?? getRecentConversationHistory,
    generateReply: overrides.generateReply ?? generateAiReply,
    sendReply: overrides.sendReply ?? sendMetaReply,
    findOutgoing:
      overrides.findOutgoing ??
      (mockedPersistence ? async () => null : findAssistantOutgoingForIncoming),
    createOutgoing:
      overrides.createOutgoing ??
      (mockedPersistence
        ? async (_message, reply, author) => ({
            id: null,
            content: reply,
            author,
            status: "pending",
          })
        : createOutgoingMessage),
    recordOutgoing: overrides.recordOutgoing ?? recordOutgoingMessage,
    sleep:
      overrides.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds))),
  };

  const claimed = await dependencies.claim(message);
  if (!claimed) {
    return { status: "duplicate" };
  }

  const incomingId = typeof claimed === "object" ? claimed.id : null;

  try {
    if (incomingId) {
      const existingOutgoing = await dependencies.findOutgoing(incomingId);
      if (existingOutgoing) {
        await deliverPersistedOutgoing(
          message,
          existingOutgoing,
          dependencies,
          "assistant"
        );
        await dependencies.complete(message);
        return { status: "replied_recovered" };
      }
    }

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
      const outgoing = await dependencies.createOutgoing(
        message,
        HUMAN_HANDOFF_REPLY,
        "assistant",
        incomingId
      );
      await deliverPersistedOutgoing(message, outgoing, dependencies, "assistant");
      await dependencies.complete(message);
      return { status: "handoff_requested" };
    }

    if (message.messageType !== "text") {
      const outgoing = await dependencies.createOutgoing(
        message,
        UNSUPPORTED_MESSAGE_REPLY,
        "assistant",
        incomingId
      );
      await deliverPersistedOutgoing(message, outgoing, dependencies, "assistant");
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

    const outgoing = await dependencies.createOutgoing(
      message,
      result.reply,
      "assistant",
      incomingId
    );
    await deliverPersistedOutgoing(message, outgoing, dependencies, "assistant");
    await dependencies.complete(message);

    return { status: "replied" };
  } catch (error) {
    await dependencies.release(message, error);
    throw error;
  }
}
