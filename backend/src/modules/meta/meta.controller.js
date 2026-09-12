import { env } from "../../config/env.js";
import {
  listActiveHandoffs,
  parseMetaWebhook,
  processMetaMessage,
  setHandoffState,
  verifyMetaSignature,
} from "./meta.service.js";

const META_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);
const conversationQueues = new Map();

async function processInBackground(message) {
  try {
    await processMetaMessage(message);
  } catch (error) {
    console.error(
      `No se pudo procesar el mensaje ${message.messageId} de ${message.channel}:`,
      error.message
    );
  }
}

function scheduleMessage(message) {
  const key = `${message.channel}:${message.externalUserId}`;
  const previous = conversationQueues.get(key) ?? Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(() => processInBackground(message))
    .finally(() => {
      if (conversationQueues.get(key) === current) {
        conversationQueues.delete(key);
      }
    });

  conversationQueues.set(key, current);
}

export function verifyWebhookController(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token &&
    token === env.meta.verifyToken &&
    typeof challenge === "string"
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

export function receiveWebhookController(req, res) {
  const signature = req.header("x-hub-signature-256");
  if (!verifyMetaSignature(signature, req.rawBody)) {
    return res.sendStatus(401);
  }

  const messages = parseMetaWebhook(req.body);
  res.status(200).send("EVENT_RECEIVED");

  // Render mantiene el proceso activo después de responder al webhook.
  setImmediate(() => {
    for (const message of messages) {
      scheduleMessage(message);
    }
  });
}

export async function listHandoffsController(_req, res, next) {
  try {
    const conversations = await listActiveHandoffs();
    return res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

export async function updateHandoffController(req, res, next) {
  try {
    const channel = String(req.params.channel || "").toLowerCase();
    const externalUserId = String(req.params.externalUserId || "").trim();
    const active = req.body?.active;

    if (!META_CHANNELS.has(channel)) {
      return res.status(400).json({
        success: false,
        message: "Canal de Meta no válido.",
      });
    }

    if (!externalUserId || externalUserId.length > 160) {
      return res.status(400).json({
        success: false,
        message: "external_user_id no es válido.",
      });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "active debe ser true o false.",
      });
    }

    const conversation = await setHandoffState(
      channel,
      externalUserId,
      active
    );

    return res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
}
