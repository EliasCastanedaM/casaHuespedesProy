import crypto from "node:crypto";
import { env } from "../../config/env.js";

export const INSTAGRAM_MESSAGE_LIMIT = 1000;

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
      "Instagram respondió " +
        response.status +
        ": " +
        responseText.slice(0, 300)
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

function preferredBreak(window, minimumPreferredIndex) {
  const newline = window.lastIndexOf("\n");
  if (newline >= minimumPreferredIndex) return newline + 1;

  let sentence = -1;
  for (const match of window.matchAll(/[.!?\u2026](?:[\t ]+|\n)/g)) {
    sentence = match.index + match[0].length;
  }
  if (sentence >= minimumPreferredIndex) return sentence;

  const space = Math.max(
    window.lastIndexOf(" "),
    window.lastIndexOf("\t")
  );

  return space >= minimumPreferredIndex ? space + 1 : window.length;
}

export function splitInstagramMessage(
  text,
  limit = INSTAGRAM_MESSAGE_LIMIT
) {
  const message = String(text ?? "");

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("El límite de Instagram debe ser un entero positivo.");
  }

  if (message.length <= limit) return [message];

  const parts = [];
  let offset = 0;
  const minimumPreferredIndex = Math.floor(limit * 0.5);

  while (message.length - offset > limit) {
    const window = message.slice(offset, offset + limit);
    let breakAt = preferredBreak(window, minimumPreferredIndex);

    if (
      breakAt > 1 &&
      /[\uD800-\uDBFF]/.test(window[breakAt - 1]) &&
      /[\uDC00-\uDFFF]/.test(message[offset + breakAt])
    ) {
      breakAt -= 1;
    }

    parts.push(message.slice(offset, offset + breakAt));
    offset += breakAt;
  }

  if (offset < message.length) {
    parts.push(message.slice(offset));
  }

  return parts;
}

export async function sendInstagramMessageParts(text, sendPart) {
  const parts = splitInstagramMessage(text);
  let lastResult = {};

  for (const part of parts) {
    lastResult = await sendPart(part);
  }

  return lastResult;
}

export async function sendManualInstagramMessage(
  externalUserId,
  text,
  db
) {
  const { sendManualMetaMessage } = await import("./meta.service.js");
  return sendManualMetaMessage("instagram", externalUserId, text, db);
}