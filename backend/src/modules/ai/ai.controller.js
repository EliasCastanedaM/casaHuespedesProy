import { timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { generateAiReply } from "./ai.service.js";

const ALLOWED_CHANNELS = new Set([
  "web",
  "whatsapp",
  "facebook",
  "instagram",
  "tiktok",
]);

export function requireAiAccess(req, res, next) {
  // Fail-closed: una variable ausente nunca habilita el acceso anónimo
  // a un servicio que realiza llamadas a OpenAI.
  const expected = Buffer.from(env.ai.internalToken || "", "utf8");
  const supplied = Buffer.from(String(req.header("x-ai-token") || ""), "utf8");
  if (
    !expected.length ||
    !supplied.length ||
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return res.status(401).json({
      success: false,
      message: "No autorizado.",
    });
  }

  next();
}

export async function chatController(req, res, next) {
  try {
    const channel = String(req.body.channel || "web").toLowerCase();
    const externalUserId = String(
      req.body.external_user_id || req.body.session_id || ""
    ).trim();
    const message = String(req.body.message || "").trim();

    if (!ALLOWED_CHANNELS.has(channel)) {
      return res.status(400).json({
        success: false,
        message: "Canal no válido.",
      });
    }

    if (!externalUserId || externalUserId.length > 160) {
      return res.status(400).json({
        success: false,
        message: "external_user_id o session_id es obligatorio.",
      });
    }

    if (!message || message.length > 4000) {
      return res.status(400).json({
        success: false,
        message: "El mensaje es obligatorio y admite hasta 4000 caracteres.",
      });
    }

    const result = await generateAiReply({
      channel,
      externalUserId,
      message,
    });

    return res.json({
      success: true,
      data: { reply: result.reply },
    });
  } catch (error) {
    next(error);
  }
}
