import { env } from "../config/env.js";
import { pool } from "../config/db.js";
import { roomPreferenceLabel } from "../modules/rooms/roomPreferences.js";

// La alerta usa una plantilla de utilidad aprobada por Meta, no un mensaje
// de sesión: el administrador puede no haber escrito al hotel en 24 horas.
export const BOOKING_ALERT_TEMPLATE_BODY =
  "Nueva solicitud de reserva\n" +
  "Canal: {{1}}\nCliente: {{2}}\nContacto: {{3}}\n" +
  "Fechas: {{4}}\nHuéspedes: {{5}}\nCategoría: {{6}}\n" +
  "Preferencias: {{7}}\nTotal cotizado: {{8}}\n" +
  "Pendiente de revisión de disponibilidad. Abre el panel del hotel.";

function safe(value, fallback = "No indicado") {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 350) || fallback;
}

function formatDate(value) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text.slice(8, 10) + "/" + text.slice(5, 7) + "/" + text.slice(0, 4)
    : "Pendiente";
}

function contactFromAlert(alert) {
  const supplied = String(alert.payload?.customer_phone || "").replace(/[^\d+]/g, "");
  if (/^\+?\d{9,15}$/.test(supplied)) return supplied.startsWith("+") ? supplied : "+" + supplied;
  if (alert.channel === "whatsapp" && /^51\d{9}$/.test(String(alert.external_user_id))) {
    return "+" + alert.external_user_id;
  }
  return "Sin número; responder desde el panel";
}

export function formatBookingAlertParameters(alert) {
  const data = alert.payload || {};
  const names = { whatsapp: "WhatsApp", facebook: "Facebook", instagram: "Instagram" };
  const adultCount = Number(data.adults);
  const childrenCount = Number(data.children);
  const adults = Number.isInteger(adultCount) && adultCount >= 0 ? adultCount + " adulto(s)" : "Adultos sin indicar";
  const children = Number.isInteger(childrenCount) && childrenCount >= 0 ? childrenCount + " niño(s)" : "Niños sin indicar";
  const pets = Number(data.pets) > 0 ? ", " + Number(data.pets) + " mascota(s)" : "";
  const preferred = data.requested_preferences && typeof data.requested_preferences === "object"
    ? roomPreferenceLabel(data.requested_preferences)
    : "";
  const amount = Number(data.total_amount);
  return [
    names[alert.channel] || safe(alert.channel),
    safe(data.customer_name || alert.customer_name, "Sin nombre confirmado"),
    contactFromAlert(alert),
    formatDate(data.check_in) + " al " + formatDate(data.check_out),
    adults + ", " + children + pets,
    safe(data.category_name),
    safe(preferred || data.preferences, "Sin preferencia"),
    Number.isFinite(amount) && amount > 0 ? "S/ " + amount.toFixed(2) : "Pendiente",
  ];
}

export function buildBookingAlertPayload(alert, { to, templateName, language = "es" } = {}) {
  const recipient = String(to || "").replace(/[^\d]/g, "");
  if (!/^51\d{9}$/.test(recipient)) {
    throw new Error("BOOKING_ALERT_TO debe ser un teléfono peruano con código 51.");
  }
  if (!/^[a-z0-9_]{1,512}$/.test(String(templateName || ""))) {
    throw new Error("Falta BOOKING_ALERT_TEMPLATE_NAME o su formato es inválido.");
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [{
        type: "body",
        parameters: formatBookingAlertParameters(alert).map((text) => ({ type: "text", text })),
      }],
    },
  };
}

export async function sendBookingAlert(alert, {
  fetchImpl = fetch,
  accessToken = env.meta.whatsappAccessToken,
  phoneNumberId = env.meta.whatsappPhoneNumberId,
  to = env.bookingAlert.to,
  templateName = env.bookingAlert.templateName,
  language = env.bookingAlert.language,
  graphVersion = env.meta.graphApiVersion,
} = {}) {
  if (!accessToken || !/^\d+$/.test(String(phoneNumberId || ""))) {
    throw new Error("WhatsApp Cloud API no está configurada para enviar alertas.");
  }
  if (!/^v\d+\.\d+$/.test(String(graphVersion))) {
    throw new Error("Versión de Graph API inválida.");
  }
  const payload = buildBookingAlertPayload(alert, { to, templateName, language });
  const response = await fetchImpl(
    "https://graph.facebook.com/" + graphVersion + "/" + phoneNumberId + "/messages",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    }
  );
  let result;
  try { result = await response.json(); } catch { result = {}; }
  if (!response.ok || !result?.messages?.[0]?.id) {
    const code = Number(result?.error?.code) || null;
    const error = new Error("Meta rechazó el aviso. HTTP " + response.status +
      (code ? " · código " + code : ""));
    error.graphErrorCode = code;
    error.nonRetryable = [190, 131047, 132001, 132012].includes(code) || [401, 403].includes(response.status);
    throw error;
  }
  return { messageId: result.messages[0].id };
}

const CLAIM_SQL = [
  "UPDATE public.booking_alert_outbox AS o",
  "SET status = 'sending', attempts = attempts + 1, locked_at = NOW()",
  "WHERE o.id = (",
  "  SELECT id FROM public.booking_alert_outbox",
  "  WHERE ((status IN ('pending', 'failed') AND next_attempt_at <= NOW() AND attempts < 5)",
  "      OR (status = 'sending' AND locked_at < NOW() - INTERVAL '5 minutes' AND attempts < 5))",
  "  ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT 1",
  ")",
  "RETURNING o.id, o.channel, o.external_user_id, o.payload, o.attempts",
].join("\n");

export async function deliverPendingBookingAlerts(db = pool, options = {}) {
  if (!env.bookingAlert.enabled && !options.force) return { attempted: 0, sent: 0, failed: 0 };
  // No retirar elementos de la cola cuando faltan credenciales o plantilla.
  if (!env.bookingAlert.enabled && options.force !== true) return { attempted: 0, sent: 0, failed: 0 };
  const send = options.send || sendBookingAlert;
  const batchSize = Math.min(Math.max(Number(options.limit) || 10, 1), 30);
  let attempted = 0;
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < batchSize; index += 1) {
    const claimed = await db.query(CLAIM_SQL);
    const alert = claimed.rows[0];
    if (!alert) break;
    attempted += 1;
    try {
      const profile = await db.query(
        "SELECT customer_name FROM meta_conversations WHERE channel = $1 AND external_user_id = $2 LIMIT 1",
        [alert.channel, alert.external_user_id]
      );
      alert.customer_name = profile.rows[0]?.customer_name || "";
      const result = await send(alert);
      await db.query(
        "UPDATE public.booking_alert_outbox SET status = 'sent', sent_at = NOW(), " +
        "meta_message_id = $2, last_error = NULL, locked_at = NULL, payload = '{}'::jsonb WHERE id = $1",
        [alert.id, result.messageId]
      );
      sent += 1;
    } catch (error) {
      const message = String(error?.message || "Fallo de entrega").slice(0, 200);
      const delayMinutes = error?.nonRetryable ? 1440 : Math.min(60, Math.pow(2, Number(alert.attempts)));
      await db.query(
        "UPDATE public.booking_alert_outbox SET status = 'failed', last_error = $2, locked_at = NULL, " +
        "next_attempt_at = NOW() + ($3::int * INTERVAL '1 minute') WHERE id = $1",
        [alert.id, message, delayMinutes]
      );
      console.warn(JSON.stringify({
        component: "booking_alerts", event: "delivery_failed",
        alertId: alert.id, httpCode: error?.graphErrorCode || null,
      }));
      failed += 1;
    }
  }
  return { attempted, sent, failed };
}
