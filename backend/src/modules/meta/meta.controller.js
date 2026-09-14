import { env } from "../../config/env.js";
import {
  applyMetaStatusUpdates,
  listActiveHandoffs,
  listConversationMessages,
  listConversations,
  listRecoverableMessages,
  parseMetaStatusUpdates,
  parseMetaWebhook,
  persistIncomingMessages,
  processMetaMessage,
  sendManualMetaMessage,
  setHandoffState,
  verifyMetaSignature,
} from "./meta.service.js";

const META_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);
const conversationQueues = new Map();

function conversationParams(req, res) {
  const channel = String(req.params.channel || "").toLowerCase();
  const externalUserId = String(req.params.externalUserId || "").trim();

  if (!META_CHANNELS.has(channel)) {
    res.status(400).json({
      success: false,
      message: "Canal de Meta no válido.",
    });
    return null;
  }

  if (!externalUserId || externalUserId.length > 160) {
    res.status(400).json({
      success: false,
      message: "external_user_id no es válido.",
    });
    return null;
  }

  return { channel, externalUserId };
}

async function processInBackground(message) {
  try {
    await processMetaMessage(message);
  } catch (error) {
    console.error(
      "No se pudo procesar el mensaje " +
        message.messageId +
        " de " +
        message.channel +
        ":",
      error.message
    );
  }
}

function scheduleMessage(message) {
  const key = message.channel + ":" + message.externalUserId;
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

export async function recoverPendingMessages() {
  const messages = await listRecoverableMessages();
  for (const message of messages) scheduleMessage(message);
  return messages.length;
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

export async function receiveWebhookController(req, res, next) {
  try {
    const signature = req.header("x-hub-signature-256");
    if (!verifyMetaSignature(signature, req.rawBody)) {
      return res.sendStatus(401);
    }

    const messages = parseMetaWebhook(req.body);
    const statusUpdates = parseMetaStatusUpdates(req.body);

    // La persistencia/actualización durable ocurre antes del 200. Si Supabase
    // falla, Express devolverá error y Meta podrá reintentar el webhook.
    if (messages.length > 0) {
      await persistIncomingMessages(messages);
    }
    if (statusUpdates.length > 0) {
      await applyMetaStatusUpdates(statusUpdates);
    }

    res.status(200).send("EVENT_RECEIVED");

    // OpenAI y los envíos a Meta se ejecutan fuera del tiempo de respuesta HTTP.
    if (messages.length > 0) {
      setImmediate(() => {
        for (const message of messages) scheduleMessage(message);
      });
    }
  } catch (error) {
    next(error);
  }
}

export async function listHandoffsController(_req, res, next) {
  try {
    const conversations = await listActiveHandoffs();
    return res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

export async function listConversationsController(_req, res, next) {
  try {
    const conversations = await listConversations();
    return res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

export async function listMessagesController(req, res, next) {
  try {
    const conversation = conversationParams(req, res);
    if (!conversation) return;

    const messages = await listConversationMessages(
      conversation.channel,
      conversation.externalUserId,
      { limit: req.query.limit }
    );
    return res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
}

export async function sendManualMessageController(req, res, next) {
  try {
    const conversation = conversationParams(req, res);
    if (!conversation) return;

    const message = typeof req.body?.message === "string" ? req.body.message : "";
    const saved = await sendManualMetaMessage(
      conversation.channel,
      conversation.externalUserId,
      message
    );

    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
}

export async function updateHandoffController(req, res, next) {
  try {
    const conversationParamsValue = conversationParams(req, res);
    if (!conversationParamsValue) return;

    const active = req.body?.active;
    if (typeof active !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "active debe ser true o false.",
      });
    }

    const conversation = await setHandoffState(
      conversationParamsValue.channel,
      conversationParamsValue.externalUserId,
      active
    );

    return res.json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
}
