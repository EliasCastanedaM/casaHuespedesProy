import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import { generateAiReply } from "../ai/ai.service.js";

const processedInMemory = new Set();
let warnedMissingProcessedTable = false;

function asObject(value) {
  return value && typeof value === "object" ? value : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseWhatsApp(body) {
  const messages = [];

  for (const entry of asArray(body.entry)) {
    for (const change of asArray(asObject(entry)?.changes)) {
      const value = asObject(asObject(change)?.value);
      for (const item of asArray(value?.messages)) {
        const message = asObject(item);
        const text = asObject(message?.text)?.body?.trim();
        const externalUserId = message?.from;
        if (!text || !externalUserId) continue;

        messages.push({
          channel: "whatsapp",
          externalUserId: String(externalUserId),
          messageId: String(message.id || ""),
          text,
        });
      }
    }
  }

  return messages;
}

function parseMessenger(body, channel) {
  const messages = [];

  for (const entry of asArray(body.entry)) {
    for (const item of asArray(asObject(entry)?.messaging)) {
      const event = asObject(item);
      const message = asObject(event?.message);
      const externalUserId = asObject(event?.sender)?.id;
      const text = message?.text?.trim();
      if (!text || !externalUserId || message?.is_echo === true) continue;

      messages.push({
        channel,
        externalUserId: String(externalUserId),
        messageId: String(message.mid || ""),
        text,
      });
    }
  }

  return messages;
}

export function parseMetaWebhook(body = {}) {
  if (body.object === "whatsapp_business_account") {
    return parseWhatsApp(body);
  }
  if (body.object === "instagram") {
    return parseMessenger(body, "instagram");
  }
  if (body.object === "page") {
    return parseMessenger(body, "facebook");
  }
  return [];
}

export function verifyMetaSignature(signatureHeader, rawBody) {
  // En producción nunca aceptamos webhooks sin verificar su firma.
  if (!env.meta.appSecret) return env.nodeEnv !== "production";
  if (!signatureHeader || !rawBody) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", env.meta.appSecret)
    .update(rawBody)
    .digest("hex")}`;
  const actualBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

async function claimMessage(message) {
  if (!message.messageId) return true;
  const key = `${message.channel}:${message.messageId}`;
  if (processedInMemory.has(key)) return false;

  try {
    const result = await pool.query(
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
    if (!warnedMissingProcessedTable) {
      console.warn(
        "No se pudo usar ai_processed_messages; se usará memoria temporal:",
        error.message
      );
      warnedMissingProcessedTable = true;
    }
  }

  processedInMemory.add(key);
  if (processedInMemory.size > 10_000) processedInMemory.clear();
  return true;
}

async function releaseMessageClaim(message) {
  if (!message.messageId) return;
  const key = `${message.channel}:${message.messageId}`;
  processedInMemory.delete(key);

  try {
    await pool.query(
      `
      DELETE FROM ai_processed_messages
      WHERE channel = $1 AND message_id = $2;
      `,
      [message.channel, message.messageId]
    );
  } catch {
    // La tabla puede no existir antes de ejecutar la migración.
  }
}

function graphBaseUrl() {
  if (!env.meta.graphApiVersion) {
    const error = new Error("Falta META_GRAPH_API_VERSION.");
    error.statusCode = 503;
    throw error;
  }
  return `https://graph.facebook.com/${env.meta.graphApiVersion}`;
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
  if (!env.meta.pageId) throw new Error("Falta META_PAGE_ID.");
  await graphPost(`${env.meta.pageId}/messages`, env.meta.pageAccessToken, {
    recipient: { id: externalUserId },
    message: { text: reply },
  });
}

async function sendInstagram(externalUserId, reply) {
  const accountId = env.meta.instagramAccountId || env.meta.pageId;
  if (!accountId) throw new Error("Falta META_INSTAGRAM_ACCOUNT_ID.");
  await graphPost(`${accountId}/messages`, env.meta.pageAccessToken, {
    recipient: { id: externalUserId },
    message: { text: reply },
  });
}

async function sendReply(message, reply) {
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

export async function processMetaMessage(message) {
  if (!(await claimMessage(message))) return;

  try {
    const result = await generateAiReply({
      channel: message.channel,
      externalUserId: message.externalUserId,
      message: message.text,
    });
    await sendReply(message, result.reply);
  } catch (error) {
    // Permite que el reintento oficial de Meta vuelva a procesar el mensaje.
    await releaseMessageClaim(message);
    throw error;
  }
}
