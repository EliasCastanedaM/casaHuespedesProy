import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import {
  generateAiReply,
  updateWhatsAppMvpContextForHandoff,
} from "../ai/ai.service.js";
import { whatsAppMvpWelcome } from "../ai/ai.guest-rules.js";
import { isCategoryPriceInquiry, isOpeningGreetingOnly, formatInitialGreeting } from "../ai/ai.pricing.js";
import { getPublicRoomCategoriesService } from "../rooms/roomCategory.service.js";
import {
  sendInstagramMessageParts,
  sendInstagramMetaReply,
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

const WHATSAPP_FOLLOWUP_GREETING_REPLY =
  "Con gusto 😊. Puedes consultar información del hotel o solicitar una reserva. Para reservar, comparte tus fechas, cantidad de adultos, niños (con sus edades) y mascotas; una persona confirmará disponibilidad.";

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

function parseWhatsApp(body, onIgnored) {
  const messages = [];

  for (const entry of asArray(body.entry)) {
    for (const change of asArray(asObject(entry)?.changes)) {
      const value = asObject(asObject(change)?.value);
      const wabaId = cleanText(asObject(entry)?.id);
      const phoneNumberId = cleanText(asObject(value?.metadata)?.phone_number_id);
      const contactNames = new Map();

      for (const rawContact of asArray(value?.contacts)) {
        const contact = asObject(rawContact);
        const waId = cleanText(contact?.wa_id);
        const businessUserId = cleanText(contact?.user_id);
        const name = cleanText(asObject(contact?.profile)?.name);
        if (waId && name) contactNames.set(waId, name);
        if (businessUserId && name) contactNames.set(businessUserId, name);
      }

      for (const item of asArray(value?.messages)) {
        const message = asObject(item);
        // Meta may omit the phone-based from value when a user hides their
        // number behind a WhatsApp username. from_user_id (BSUID) is then
        // the routable sender identity.
        const phoneBasedUserId = cleanText(message?.from);
        const businessUserId = cleanText(message?.from_user_id);
        const externalUserId = phoneBasedUserId || businessUserId;
        if (!message || !externalUserId) {
          onIgnored?.({
            messageId: cleanText(message?.id), externalUserId,
            reason: "missing_sender", wabaId, phoneNumberId,
          });
          continue;
        }

        const messageType = cleanText(message.type) || "unknown";
        const text =
          messageType === "text" ? cleanText(asObject(message.text)?.body) : "";

        if (messageType === "text" && !text) {
          onIgnored?.({
            messageId: cleanText(message.id), externalUserId,
            reason: "empty_text", wabaId, phoneNumberId,
          });
          continue;
        }

        messages.push({
          ...normalizedMessage({
            channel: "whatsapp",
            externalUserId,
            messageId: message.id,
            text,
            messageType,
            timestamp: message.timestamp,
            customerName: contactNames.get(externalUserId) || "",
          }),
          ...(wabaId ? { wabaId } : {}),
          ...(phoneNumberId ? { phoneNumberId } : {}),
        });
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
    return parseWhatsApp(payload, options.onIgnored);
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
        const parsedErrorCode = Number(firstError?.code);
        const errorCode = Number.isInteger(parsedErrorCode) && parsedErrorCode > 0
          ? parsedErrorCode
          : null;
        const errorType = cleanText(firstError?.type);
        const errorTitle = cleanText(firstError?.title).slice(0, 120);

        updates.push({
          channel: "whatsapp",
          messageId,
          status: state,
          timestamp: cleanText(status?.timestamp),
          errorDetail: errorDetail.slice(0, 1000),
          errorCode,
          errorType,
          errorTitle,
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

      const insertedMessage = await client.query(
        `INSERT INTO meta_messages
          (channel, external_user_id, meta_message_id, direction, author, message_type, content, status, meta_timestamp)
         VALUES ($1, $2, $3, 'incoming', 'client', $4, $5, 'pending', $6)
         ON CONFLICT (channel, meta_message_id) WHERE meta_message_id IS NOT NULL DO NOTHING
         RETURNING id;`,
        [
          message.channel,
          message.externalUserId,
          message.messageId,
          message.messageType,
          message.text,
          metaTimestamp,
        ]
      );
      if (insertedMessage.rows.length > 0) {
        await client.query(
          `UPDATE meta_conversations SET resolved_at = NULL
           WHERE channel = $1 AND external_user_id = $2 AND resolved_at IS NOT NULL;`,
          [message.channel, message.externalUserId]
        );
      }

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
    `SELECT c.channel, c.external_user_id, c.customer_name, c.handoff_requested_at, c.updated_at,
            a.booking_context -> 'whatsapp_mvp' AS reservation_context
     FROM meta_conversations c
     LEFT JOIN ai_conversations a
       ON a.channel = c.channel AND a.external_user_id = c.external_user_id
     WHERE c.handoff_active = TRUE
     ORDER BY c.handoff_requested_at ASC NULLS LAST, c.updated_at ASC;`
  );
  return result.rows;
}


export async function getConversationDashboard(db = pool) {
  // Conteos sin paginación: las tarjetas nunca dependen de los 50 chats visibles.
  const result = await db.query(
    `SELECT c.channel,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE NOT c.handoff_active AND c.resolved_at IS NULL)::int AS ai,
            COUNT(*) FILTER (WHERE c.handoff_active AND c.resolved_at IS NULL)::int AS manual,
            COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL)::int AS resolved,
            COUNT(*) FILTER (
              WHERE c.resolved_at IS NULL
                AND m.direction = 'incoming' AND m.status IN ('received', 'failed')
            )::int AS unanswered
     FROM meta_conversations c
     LEFT JOIN LATERAL (
       SELECT direction, status
       FROM meta_messages
       WHERE channel = c.channel AND external_user_id = c.external_user_id
       ORDER BY COALESCE(meta_timestamp, created_at) DESC, id DESC
       LIMIT 1
     ) m ON TRUE
     GROUP BY c.channel;`
  );
  const channels = Object.fromEntries(
    ["instagram", "facebook", "whatsapp"].map((channel) => [
      channel, { total: 0, ai: 0, manual: 0, resolved: 0, unanswered: 0 },
    ])
  );
  for (const row of result.rows) {
    if (!channels[row.channel]) continue;
    channels[row.channel] = Object.fromEntries(
      ["total", "ai", "manual", "resolved", "unanswered"].map((key) => [key, Number(row[key]) || 0])
    );
  }
  const sum = (field) => Object.values(channels).reduce((value, channel) => value + channel[field], 0);
  return { total: sum("total"), ai: sum("ai"), manual: sum("manual"),
    resolved: sum("resolved"), unanswered: sum("unanswered"), channels };
}

export async function listConversations(db = pool, options = {}) {
  const allowedChannels = new Set(["instagram", "facebook", "whatsapp"]);
  const allowedStatuses = new Set(["all", "ai", "manual", "resolved", "unanswered"]);
  const channel = allowedChannels.has(options.channel) ? options.channel : null;
  const status = allowedStatuses.has(options.status) ? options.status : "all";
  const search = String(options.search || "").trim().slice(0, 100);
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 100);
  const offset = Math.min(Math.max(Number(options.offset) || 0, 0), 100000);
  const result = await db.query(
    `SELECT c.channel, c.external_user_id, c.customer_name, c.handoff_active,
            c.handoff_requested_at, c.handoff_resolved_at, c.resolved_at,
            c.created_at, c.updated_at,
            a.booking_context -> 'whatsapp_mvp' AS reservation_context,
            m.content AS last_message, m.author AS last_author,
            m.direction AS last_direction, m.message_type AS last_message_type,
            m.status AS last_status,
            COALESCE(m.meta_timestamp, m.created_at, c.last_message_at, c.updated_at) AS last_message_at
     FROM meta_conversations c
     LEFT JOIN ai_conversations a
       ON a.channel = c.channel AND a.external_user_id = c.external_user_id
     LEFT JOIN LATERAL (
       SELECT content, author, direction, message_type, status, meta_timestamp, created_at
       FROM meta_messages
       WHERE channel = c.channel AND external_user_id = c.external_user_id
       ORDER BY COALESCE(meta_timestamp, created_at) DESC, id DESC
       LIMIT 1
     ) m ON TRUE
     WHERE ($1::text IS NULL OR c.channel = $1)
       AND ($2 = '' OR COALESCE(c.customer_name, '') ILIKE '%' || $2 || '%'
         OR c.external_user_id ILIKE '%' || $2 || '%'
         OR COALESCE(m.content, '') ILIKE '%' || $2 || '%')
       AND (
         $3 = 'all'
         OR ($3 = 'ai' AND NOT c.handoff_active AND c.resolved_at IS NULL)
         OR ($3 = 'manual' AND c.handoff_active AND c.resolved_at IS NULL)
         OR ($3 = 'resolved' AND c.resolved_at IS NOT NULL)
         OR ($3 = 'unanswered' AND c.resolved_at IS NULL
           AND m.direction = 'incoming' AND m.status IN ('received', 'failed'))
       )
     ORDER BY COALESCE(m.meta_timestamp, m.created_at, c.last_message_at, c.updated_at) DESC
     LIMIT $4 OFFSET $5;`,
    [channel, search, status, limit, offset]
  );
  return result.rows;
}

export async function setConversationResolved(channel, externalUserId, resolved, db = pool) {
  validateConversation(channel, externalUserId);
  const result = await db.query(
    `UPDATE meta_conversations
     SET resolved_at = CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,
         updated_at = CURRENT_TIMESTAMP
     WHERE channel = $1 AND external_user_id = $2
     RETURNING channel, external_user_id, resolved_at, handoff_active, updated_at;`,
    [channel, externalUserId, resolved === true]
  );
  return result.rows[0] || null;
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

export async function isFirstMetaIncomingMessage(channel, externalUserId, incomingId, db = pool, messageText = "") {
  if (!incomingId || !["instagram", "facebook", "whatsapp"].includes(channel)) return false;
  // El primer mensaje recibe la bienvenida incluso si otros mensajes
  // llegaron en el mismo webhook.
  const result = await db.query(
    "SELECT id, direction FROM meta_messages WHERE channel = $1 AND external_user_id = $2 ORDER BY id ASC LIMIT 1;",
    [channel, externalUserId]
  );
  const firstEverMessage = result.rows.length === 1 &&
    Number(result.rows[0].id) === Number(incomingId) &&
    result.rows[0].direction === "incoming";
  if (firstEverMessage) return true;

  // Los huéspedes antiguos conservan el historial. Si vuelven a escribir
  // un saludo breve y nunca recibieron el nuevo catálogo, se lo presentamos
  // una sola vez sin obligarlos a iniciar un chat distinto.
  // WhatsApp incluye también la primera consulta de reserva en una cuenta
  // de prueba que ya tenía mensajes previos, pero todavía no tenía catálogo.
  // Una conversación existente solo se saluda cuando empieza de forma clara:
  // no se interrumpe una reserva en curso con otra presentación.
  const startsConversation = isOpeningGreetingOnly(messageText) ||
    (channel === "whatsapp" &&
      /\b(?:hola|buenas|buenos dias)\b/i.test(
        String(messageText || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      ));
  if (!startsConversation) return false;
  const previousWelcome = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM meta_messages
       WHERE channel = $1 AND external_user_id = $2
         AND direction = 'outgoing' AND author = 'assistant'
         AND content LIKE '%Estas son nuestras categorías y tarifas vigentes:%'
     ) AS has_welcome;`,
    [channel, externalUserId]
  );
  return previousWelcome.rows[0]?.has_welcome === false;
}

// Confirma que el huésped ya recibió el catálogo antes de convertir otro
// saludo en una invitación a continuar. No depende de memoria volátil.
async function hasPreviouslySentCatalog(channel, externalUserId, db = pool) {
  if (channel !== "whatsapp") return false;
  const result = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM meta_messages
       WHERE channel = $1 AND external_user_id = $2
         AND direction = 'outgoing' AND author = 'assistant'
         AND content LIKE '%Estas son nuestras categorías y tarifas vigentes:%'
     ) AS has_welcome;`,
    [channel, externalUserId]
  );
  return result.rows[0]?.has_welcome === true;
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

function whatsappRecipientAddress(externalUserId) {
  const recipientId = cleanText(externalUserId);
  if (!recipientId) throw new Error("Falta el identificador del destinatario de WhatsApp.");

  // Phone-based WhatsApp IDs continue using to. BSUIDs use recipient.
  return /^\+?\d+$/.test(recipientId)
    ? { to: recipientId }
    : { recipient: recipientId };
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
      ...whatsappRecipientAddress(externalUserId),
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
    return sendInstagramMetaReply(message, reply);
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
    updateHandoffContext: overrides.updateHandoffContext ?? updateWhatsAppMvpContextForHandoff,
    loadHistory: overrides.loadHistory ?? getRecentConversationHistory,
    generateReply: overrides.generateReply ?? generateAiReply,
    isFirstMetaIncomingMessage: overrides.isFirstMetaIncomingMessage ??
      (mockedPersistence ? async () => false : isFirstMetaIncomingMessage),
    listCategories: overrides.listCategories ?? getPublicRoomCategoriesService,
    hasPreviouslySentCatalog: overrides.hasPreviouslySentCatalog ??
      (mockedPersistence ? async () => false : hasPreviouslySentCatalog),
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
      if (message.channel === "whatsapp" && message.messageType === "text" && message.text) {
        try {
          await dependencies.updateHandoffContext({
            channel: message.channel,
            externalUserId: message.externalUserId,
            message: message.text,
          });
        } catch (error) {
          console.warn(JSON.stringify({
            component: "meta_webhook",
            event: "handoff_context_update_failed",
            channel: message.channel,
            errorCode: cleanText(error?.code) || "unknown",
          }));
        }
      }
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
    const firstMessage = await dependencies.isFirstMetaIncomingMessage(
      message.channel,
      message.externalUserId,
      incomingId,
      dependencies.db ?? pool,
      message.text
    );

    let welcome = "";
    if (firstMessage) {
      if (message.channel === "whatsapp") {
        welcome = whatsAppMvpWelcome(message.text);
      } else {
        try {
          welcome = formatInitialGreeting(await dependencies.listCategories());
        } catch (error) {
          console.warn("No se pudieron consultar las tarifas para el saludo:", error.message);
          welcome = formatInitialGreeting([]);
        }
      }
    }

    let reply;
    let handoffActivatedByThisTurn = false;
    if (firstMessage && isOpeningGreetingOnly(message.text)) {
      reply = welcome;
    } else if (message.channel === "whatsapp" &&
               isOpeningGreetingOnly(message.text) &&
               await dependencies.hasPreviouslySentCatalog(
                 message.channel, message.externalUserId, dependencies.db ?? pool
               )) {
      // La bienvenida y el catálogo se presentan solo una vez. Un "hola"
      // posterior continúa orientando la reserva, sin reabrir el saludo
      // ni consumir otra llamada a OpenAI.
      reply = WHATSAPP_FOLLOWUP_GREETING_REPLY;
    } else {
      // Incluso en el primer mensaje, el filtro de alcance debe ejecutarse
      // antes de mostrar el catálogo: un pedido ajeno no recibe precios.
      const result = await dependencies.generateReply({
        channel: message.channel,
        externalUserId: message.externalUserId,
        message: message.text,
        history,
      });
      if (result.mode === "human_review_required") {
        await dependencies.setHandoff(message.channel, message.externalUserId, true);
        handoffActivatedByThisTurn = true;
        reply = result.reply;
      } else if (result.mode === "outside_hotel_scope") {
        reply = result.reply;
      } else if (firstMessage && message.channel !== "whatsapp" &&
                 result.mode === "category_prices" &&
                 isCategoryPriceInquiry(message.text)) {
        reply = welcome;
      } else if (firstMessage && message.channel === "whatsapp" &&
                 result.mode === "booking_details_required") {
        // El flujo de reserva ya dejó guardada la intención y los datos
        // del primer mensaje. Mostramos primero el catálogo, sin pedir
        // todos los datos juntos ni repetir la pregunta de fechas.
        reply = welcome;
      } else {
        reply = firstMessage ? welcome + "\n\n" + result.reply : result.reply;
      }
    }

    // Un agente pudo responder desde WhatsApp Business mientras OpenAI
    // estaba generando texto. Evitamos responder a un turno ya atendido.
    if (!handoffActivatedByThisTurn &&
        await dependencies.getHandoff(message.channel, message.externalUserId)) {
      await dependencies.complete(message);
      return { status: "handoff_active_after_generation" };
    }

    const outgoing = await dependencies.createOutgoing(
      message,
      reply,
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
