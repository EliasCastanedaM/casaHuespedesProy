import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import { setHandoffState } from "./meta.service.js";

function cleanText(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function graphVersion() {
  const version = cleanText(env.meta.graphApiVersion);
  if (!/^v\d+\.\d+$/.test(version)) {
    const error = new Error("META_GRAPH_API_VERSION no es válida.");
    error.statusCode = 503;
    throw error;
  }
  return version;
}

function signatureMatches(secret, signatureHeader, rawBody) {
  if (!secret || !signatureHeader || !Buffer.isBuffer(rawBody)) return false;

  const signature = String(signatureHeader);
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function verifyInstagramSignature(signatureHeader, rawBody) {
  const secrets = [env.meta.instagramAppSecret, env.meta.appSecret].filter(Boolean);

  if (secrets.length === 0) {
    return env.nodeEnv !== "production";
  }

  return secrets.some((secret) =>
    signatureMatches(secret, signatureHeader, rawBody)
  );
}

async function instagramPost(externalUserId, reply) {
  if (!env.meta.instagramAccountId) {
    throw new Error("Falta INSTAGRAM_ACCOUNT_ID.");
  }
  if (!env.meta.instagramAccessToken) {
    throw new Error("Falta INSTAGRAM_ACCESS_TOKEN.");
  }

  const response = await fetch(
    `https://graph.instagram.com/${graphVersion()}/${env.meta.instagramAccountId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.meta.instagramAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: externalUserId },
        message: { text: reply },
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      "Instagram respondió " + response.status + ": " + responseText.slice(0, 300)
    );
  }

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    return {};
  }
}

export async function sendInstagramMetaReply(message, reply) {
  return instagramPost(message.externalUserId, reply);
}

function sentMessageId(result) {
  return cleanText(result?.messages?.[0]?.id || result?.message_id) || null;
}

async function updateOutgoing(outgoingId, result, error, db) {
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
               processing_attempts, meta_timestamp, created_at, updated_at;`,
    [
      outgoingId,
      metaMessageId,
      status,
      error ? cleanText(error.message || error).slice(0, 1000) : null,
    ]
  );
  return saved.rows[0];
}

async function sendWithRetry(externalUserId, reply) {
  const delays = [0, 500, 2_000];
  let lastError;

  for (const delay of delays) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      return await instagramPost(externalUserId, reply);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function sendManualInstagramMessage(
  externalUserId,
  text,
  db = pool
) {
  const userId = cleanText(externalUserId);
  const reply = cleanText(text);

  if (!userId || userId.length > 160) {
    const error = new Error("external_user_id no es válido.");
    error.statusCode = 400;
    throw error;
  }

  if (!reply || reply.length > 4000) {
    const error = new Error("El mensaje debe tener entre 1 y 4000 caracteres.");
    error.statusCode = 400;
    throw error;
  }

  await setHandoffState("instagram", userId, true, db);

  await db.query(
    `INSERT INTO meta_conversations
      (channel, external_user_id, last_message_at, updated_at)
     VALUES ('instagram', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (channel, external_user_id) DO UPDATE SET
       last_message_at = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP;`,
    [userId]
  );

  const inserted = await db.query(
    `INSERT INTO meta_messages
      (channel, external_user_id, direction, author, message_type, content,
       status, meta_timestamp)
     VALUES ('instagram', $1, 'outgoing', 'admin', 'text', $2,
             'pending', CURRENT_TIMESTAMP)
     RETURNING id, channel, external_user_id, meta_message_id, in_reply_to_message_id,
               direction, author, message_type, content, status, error_detail,
               processing_attempts, meta_timestamp, created_at, updated_at;`,
    [userId, reply]
  );

  const outgoing = inserted.rows[0];

  try {
    const result = await sendWithRetry(userId, reply);
    return await updateOutgoing(outgoing.id, result, null, db);
  } catch (error) {
    await updateOutgoing(outgoing.id, null, error, db);
    throw error;
  }
}
