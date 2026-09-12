import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import { generateAiReply } from "../ai/ai.service.js";

const META_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);
const processedInMemory = new Set();
const handoffInMemory = new Map();
let warnedMissingProcessedTable = false;
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
  return `derived.${crypto.createHash("sha256").update(source).digest("hex")}`;
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

        // Un mensaje de texto vacío no debe llegar al asesor ni causar un 500.
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
  // En producción nunca se aceptan webhooks sin App Secret y firma válida.
  if (!env.meta.appSecret) return env.nodeEnv !== "production";
  if (!signatureHeader || !Buffer.isBuffer(rawBody)) return false;

  const signature = String(signatureHeader);
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", env.meta.appSecret)
    .update(rawBody)
    .digest("hex")}`;
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
  return `${channel}:${externalUserId}`;
}

async function claimMessage(message, db = pool) {
  const key = `${message.channel}:${message.messageId}`;
  if (processedInMemory.has(key)) return false;

  try {
    const result = await db.query(
      `
      INSERT INTO ai_processed_messages (channel, message_id)
      VALUES ($1, $2)
      ON CONFLICT (channel, message_id) DO NOTHING
      RETURNING message_id;
      `,
      [message.channel, message.messageId]
    );

    if (result.rows.length === 0) return false;
  } catch (error) {
    if (env.nodeEnv === "production") throw error;

    if (!warnedMissingProcessedTable) {
      console.warn(
        "No se pudo usar ai_processed_messages; se usará memoria temporal en desarrollo:",
        error.message
      );
      warnedMissingProcessedTable = true;
    }
  }

  processedInMemory.add(key);
  if (processedInMemory.size > 10_000) processedInMemory.clear();
  return true;
}

async function releaseMessageClaim(message, db = pool) {
  const key = `${message.channel}:${message.messageId}`;
  processedInMemory.delete(key);

  try {
    await db.query(
      `
      DELETE FROM ai_processed_messages
      WHERE channel = $1 AND message_id = $2;
      `,
      [message.channel, message.messageId]
    );
  } catch {
    // En desarrollo la tabla puede no existir antes de ejecutar la migración.
  }
}

async function getHandoffState(channel, externalUserId, db = pool) {
  const key = conversationKey(channel, externalUserId);

  try {
    const result = await db.query(
      `
      SELECT handoff_active
      FROM meta_conversations
      WHERE channel = $1 AND external_user_id = $2
      LIMIT 1;
      `,
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
  if (!META_CHANNELS.has(channel)) {
    const error = new Error("Canal de Meta no válido.");
    error.statusCode = 400;
    throw error;
  }

  const key = conversationKey(channel, externalUserId);
  handoffInMemory.set(key, active === true);

  try {
    const result = await db.query(
      `
      INSERT INTO meta_conversations (
        channel,
        external_user_id,
        handoff_active,
        handoff_requested_at,
        handoff_resolved_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,
        CASE WHEN $3 THEN NULL ELSE CURRENT_TIMESTAMP END,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (channel, external_user_id)
      DO UPDATE SET
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
      RETURNING channel, external_user_id, handoff_active,
        handoff_requested_at, handoff_resolved_at, updated_at;
      `,
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
    `
    SELECT channel, external_user_id, handoff_requested_at, updated_at
    FROM meta_conversations
    WHERE handoff_active = TRUE
    ORDER BY handoff_requested_at ASC NULLS LAST, updated_at ASC;
    `
  );
  return result.rows;
}

function graphBaseUrl() {
  const version = cleanText(env.meta.graphApiVersion);
  if (!/^v\d+\.\d+$/.test(version)) {
    const error = new Error("META_GRAPH_API_VERSION no es válida.");
    error.statusCode = 503;
    throw error;
  }
  return `https://graph.facebook.com/${version}`;
}

async function graphPost(path, accessToken, payload) {
  if (!accessToken) {
    throw new Error("Falta el token del canal de Meta.");
  }

  const response = await fetch(`${graphBaseUrl()}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Meta respondió ${response.status}: ${detail.slice(0, 300)}`
    );
  }
}

async function sendWhatsApp(externalUserId, reply) {
  if (!env.meta.whatsappPhoneNumberId) {
    throw new Error("Falta WHATSAPP_PHONE_NUMBER_ID.");
  }

  await graphPost(
    `${env.meta.whatsappPhoneNumberId}/messages`,
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
  await graphPost(
    `${env.meta.facebookPageId}/messages`,
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
  await graphPost(
    `${env.meta.instagramAccountId}/messages`,
    env.meta.instagramAccessToken || env.meta.facebookPageAccessToken,
    {
      recipient: { id: externalUserId },
      message: { text: reply },
    }
  );
}

export async function sendMetaReply(message, reply) {
  if (message.channel === "whatsapp") {
    await sendWhatsApp(message.externalUserId, reply);
    return;
  }
  if (message.channel === "facebook") {
    await sendFacebook(message.externalUserId, reply);
    return;
  }
  if (message.channel === "instagram") {
    await sendInstagram(message.externalUserId, reply);
    return;
  }
  throw new Error(`Canal de Meta no reconocido: ${message.channel}`);
}

async function sendWithRetry(message, reply, send, sleep) {
  const delays = [0, 500, 2_000];
  let lastError;

  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    try {
      await send(message, reply);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function processMetaMessage(message, overrides = {}) {
  const dependencies = {
    claim: overrides.claim ?? claimMessage,
    release: overrides.release ?? releaseMessageClaim,
    getHandoff: overrides.getHandoff ?? getHandoffState,
    setHandoff: overrides.setHandoff ?? setHandoffState,
    generateReply: overrides.generateReply ?? generateAiReply,
    sendReply: overrides.sendReply ?? sendMetaReply,
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
      return { status: "handoff_active" };
    }

    if (isHumanHandoffRequest(message.text)) {
      await dependencies.setHandoff(
        message.channel,
        message.externalUserId,
        true
      );
      await sendWithRetry(
        message,
        HUMAN_HANDOFF_REPLY,
        dependencies.sendReply,
        dependencies.sleep
      );
      return { status: "handoff_requested" };
    }

    if (message.messageType !== "text") {
      await sendWithRetry(
        message,
        UNSUPPORTED_MESSAGE_REPLY,
        dependencies.sendReply,
        dependencies.sleep
      );
      return { status: "unsupported" };
    }

    const result = await dependencies.generateReply({
      channel: message.channel,
      externalUserId: message.externalUserId,
      message: message.text,
    });

    // Si Meta falla temporalmente, se reintenta el envío sin volver a consumir IA.
    await sendWithRetry(
      message,
      result.reply,
      dependencies.sendReply,
      dependencies.sleep
    );

    return { status: "replied" };
  } catch (error) {
    await dependencies.release(message);
    throw error;
  }
}
