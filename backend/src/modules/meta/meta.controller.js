import { env } from "../../config/env.js";
import {
  parseMetaWebhook,
  processMetaMessage,
  verifyMetaSignature,
} from "./meta.service.js";

async function processWithRetry(message) {
  const delays = [0, 2_000, 10_000];

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }

    try {
      await processMetaMessage(message);
      return;
    } catch (error) {
      if (attempt === delays.length - 1) {
        console.error(
          `No se pudo responder por ${message.channel} después de 3 intentos:`,
          error.message
        );
      }
    }
  }
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
      void processWithRetry(message);
    }
  });
}
