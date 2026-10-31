import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { confirmWhatsAppMvpReservation } from "../ai/ai.service.js";
import { pool } from "../../config/db.js";
import { persistCoexistenceEvents } from "./meta.coexistence.js";
import {
  sendInstagramMetaReply,
  sendManualInstagramMessage,
  verifyInstagramSignature,
} from "./instagram.transport.js";
import {
  applyMetaStatusUpdates,
  listActiveHandoffs,
  listConversationMessages,
  listConversations,
  getConversationDashboard,
  setConversationResolved,
  listRecoverableMessages,
  parseMetaStatusUpdates,
  parseMetaWebhook,
  persistIncomingMessages,
  processMetaMessage,
  sendManualMetaMessage,
  sendAssistantMetaMessage,
  setHandoffState,
  verifyMetaSignature,
} from "./meta.service.js";

const META_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);
const conversationQueues = new Map();
const scheduledMessageIds = new Set();

function auditMeta(event, details = {}, level = "info") {
  console[level](JSON.stringify({ component: "meta_webhook", event, ...details }));
}

function privateTag(value) {
  const normalized = String(value || "");
  if (!normalized) return null;
  return crypto.createHmac("sha256", env.meta.appSecret || "development")
    .update(normalized).digest("hex").slice(0, 16);
}

function messageAudit(message) {
  return {
    channel: message.channel,
    ...(privateTag(message.messageId) ? { messageTag: privateTag(message.messageId) } : {}),
    ...(privateTag(message.externalUserId) ? { senderTag: privateTag(message.externalUserId) } : {}),
    ...(message.wabaId ? { wabaId: message.wabaId } : {}),
    ...(message.phoneNumberId ? {
      phoneNumberId: message.phoneNumberId,
      configuredSenderMatchesInbound: message.channel === "whatsapp" &&
        Boolean(env.meta.whatsappPhoneNumberId) &&
        message.phoneNumberId === env.meta.whatsappPhoneNumberId,
    } : {}),
  };
}

function metaErrorAudit(error) {
  const message = String(error?.message || "");
  return {
    errorType: error?.name || "Error",
    errorCode: error?.code || null,
    graphHttpStatus: Number(message.match(/Meta respondió (\d{3})/)?.[1]) || null,
    graphErrorCode: Number(message.match(/"code"\s*:\s*(\d+)/)?.[1]) || null,
    graphErrorType: message.match(/"type"\s*:\s*"([^"]+)"/)?.[1] || null,
  };
}
function webhookEnvelopeAudit(body) {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const changes = entries.flatMap((entry) => Array.isArray(entry?.changes) ? entry.changes : []);
  return {
    entryCount: entries.length,
    changeFields: [...new Set(changes.map((change) => String(change?.field || "")).filter(Boolean))].slice(0, 20),
    wabaIds: [...new Set(entries.map((entry) => String(entry?.id || "")).filter(Boolean))].slice(0, 10),
    phoneNumberIds: [...new Set(changes.map((change) => String(change?.value?.metadata?.phone_number_id || "")).filter(Boolean))].slice(0, 10),
  };
}

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
    if (message.channel === "instagram") {
      const result = await processMetaMessage(message, {
        sendReply: sendInstagramMetaReply,
      });
      auditMeta("processing_finished", { ...messageAudit(message), result: result.status });
      return;
    }

    const result = await processMetaMessage(message);
    auditMeta("processing_finished", { ...messageAudit(message), result: result.status });
  } catch (error) {
    auditMeta("processing_failed", {
      ...messageAudit(message),
      ...metaErrorAudit(error),
    }, "error");
  }
}

function scheduleMessage(message) {
  const messageKey = message.channel + ":" + message.messageId;
  if (scheduledMessageIds.has(messageKey)) return;
  scheduledMessageIds.add(messageKey);
  const key = message.channel + ":" + message.externalUserId;
  const previous = conversationQueues.get(key) ?? Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(() => processInBackground(message))
    .finally(() => {
      scheduledMessageIds.delete(messageKey);
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
  const requestId = crypto.randomUUID();
  try {
    const signature = req.header("x-hub-signature-256");
    const instagramWebhook = req.body?.object === "instagram";
    const signatureIsValid = instagramWebhook
      ? verifyInstagramSignature(signature, req.rawBody)
      : verifyMetaSignature(signature, req.rawBody);

    if (!signatureIsValid) {
      auditMeta("signature_rejected", { requestId, httpStatus: 401 }, "warn");
      return res.sendStatus(401);
    }

    auditMeta("request_verified", {
      requestId,
      object: req.body?.object || null,
      ...webhookEnvelopeAudit(req.body),
    });

    // Primero persistimos los eventos de coexistencia. Un eco del teléfono
    // activa el handoff ANTES de procesar posibles mensajes del huésped.
    // Los eventos de historial/contactos jamás disparan una respuesta IA.
    const coexistence = await persistCoexistenceEvents(req.body, pool);
    if (coexistence.archived > 0 || coexistence.echoes > 0) {
      // Solo conteos: permiten verificar el takeover móvil en Render sin
      // revelar identificadores, texto de huéspedes ni payload de Meta.
      auditMeta("coexistence_persisted", {
        requestId,
        archivedCount: coexistence.archived,
        humanEchoCount: coexistence.echoes,
      });
    }

    const messages = parseMetaWebhook(req.body, {
      onIgnored: ({ externalUserId, messageId, ...ignored }) => auditMeta(
        "incoming_ignored",
        {
          requestId,
          ...ignored,
          ...(privateTag(externalUserId) ? { senderTag: privateTag(externalUserId) } : {}),
          ...(privateTag(messageId) ? { messageTag: privateTag(messageId) } : {}),
        },
        "warn"
      ),
    });
    const statusUpdates = parseMetaStatusUpdates(req.body);

    // La persistencia/actualización durable ocurre antes del 200. Si Supabase
    // falla, Express devolverá error y Meta podrá reintentar el webhook.
    if (messages.length > 0) {
      await persistIncomingMessages(messages);
      for (const message of messages) {
        auditMeta("incoming_persisted", { requestId, ...messageAudit(message), messageType: message.messageType });
      }
    }
    if (statusUpdates.length > 0) {
      await applyMetaStatusUpdates(statusUpdates);
      for (const update of statusUpdates) {
        auditMeta("delivery_status", {
          requestId,
          ...(privateTag(update.messageId) ? { messageTag: privateTag(update.messageId) } : {}),
          status: update.status,
          ...(update.errorCode ? { graphErrorCode: update.errorCode } : {}),
          ...(update.errorType ? { graphErrorType: update.errorType } : {}),
          ...(update.errorTitle ? { graphErrorTitle: update.errorTitle } : {}),
        });
      }
    }

    res.status(200).send("EVENT_RECEIVED");
    auditMeta("request_completed", {
      requestId, httpStatus: 200, incomingCount: messages.length,
      statusCount: statusUpdates.length,
    });

    // OpenAI y los envíos a Meta se ejecutan fuera del tiempo de respuesta HTTP.
    if (messages.length > 0) {
      setImmediate(() => {
        for (const message of messages) scheduleMessage(message);
      });
    }
  } catch (error) {
    auditMeta("request_failed", {
      requestId,
      httpStatus: error?.statusCode || 500,
      ...metaErrorAudit(error),
    }, "error");
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

export async function listConversationsController(req, res, next) {
  try {
    const conversations = await listConversations(undefined, {
      channel: req.query.channel,
      status: req.query.status,
      search: req.query.search,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

export async function dashboardController(_req, res, next) {
  try {
    const dashboard = await getConversationDashboard();
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
}

export async function updateResolvedController(req, res, next) {
  try {
    const conversation = conversationParams(req, res);
    if (!conversation) return;
    if (typeof req.body?.resolved !== "boolean") {
      return res.status(400).json({ success: false, message: "resolved debe ser true o false." });
    }
    const updated = await setConversationResolved(
      conversation.channel, conversation.externalUserId, req.body.resolved
    );
    if (!updated) return res.status(404).json({ success: false, message: "Conversación no encontrada." });
    return res.json({ success: true, data: updated });
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
    const saved =
      conversation.channel === "instagram"
        ? await sendManualInstagramMessage(conversation.externalUserId, message)
        : await sendManualMetaMessage(
            conversation.channel,
            conversation.externalUserId,
            message
          );

    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
}

export async function confirmWhatsAppMvpReservationController(req, res, next) {
  try {
    const conversation = conversationParams(req, res);
    if (!conversation) return;
    if (conversation.channel !== "whatsapp") {
      return res.status(400).json({
        success: false,
        message: "La confirmación de reservas MVP solo está disponible para WhatsApp.",
      });
    }

    const categorySlug = String(req.body?.category_slug || "").trim();
    const totalAmount = Number(req.body?.total_amount);
    if (!categorySlug || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Debes indicar la categoría y el importe total confirmado.",
      });
    }

    const prepared = await confirmWhatsAppMvpReservation({
      channel: conversation.channel,
      externalUserId: conversation.externalUserId,
      categorySlug,
      totalAmount,
      petAuthorized: req.body?.pet_authorized === true,
      childBedAvailabilityConfirmed: req.body?.child_bed_availability_confirmed === true,
    });

    await setHandoffState(conversation.channel, conversation.externalUserId, false);
    try {
      const saved = await sendAssistantMetaMessage(
        conversation.channel,
        conversation.externalUserId,
        prepared.reply
      );
      return res.json({
        success: true,
        data: {
          message: saved,
          category: prepared.category,
          handoff_active: false,
        },
      });
    } catch (sendError) {
      await setHandoffState(conversation.channel, conversation.externalUserId, true);
      throw sendError;
    }
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
