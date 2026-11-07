import { env } from "../config/env.js";
import { pool } from "../config/db.js";
import { roomPreferenceLabel } from "../modules/rooms/roomPreferences.js";

// En producción se utiliza una plantilla de utilidad aprobada por Meta.
// El piloto puede usar un mensaje libre SOLO si el destinatario está dentro
// de su propia ventana de conversación de 24 horas con el hotel.
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

export function buildPilotBookingAlertPayload(alert, { to } = {}) {
  const recipient = String(to || "").replace(/[^\d]/g, "");
  if (!/^51\d{9}$/.test(recipient)) throw new Error("Teléfono de prueba inválido.");
  const p = formatBookingAlertParameters(alert);
  return {
    messaging_product: "whatsapp", recipient_type: "individual", to: recipient,
    type: "text", text: { preview_url: false, body:
      "PRUEBA DE SISTEMA — NO ES UNA RESERVA REAL\n" +
      "Casa Huéspedes Pimentel\n" +
      "Canal: " + p[0] + "\nCliente: " + p[1] + "\nContacto: " + p[2] +
      "\nFechas: " + p[3] + "\nHuéspedes: " + p[4] +
      "\nCategoría: " + p[5] + "\nPreferencias: " + p[6] +
      "\nTotal cotizado: " + p[7] +
      "\nEstado: pendiente de aprobación.\nConsulta el panel administrativo."
    }
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
  mode = env.bookingAlert.mode,
  pilotSource = env.bookingAlert.pilotSource,
  db = pool,
} = {}) {
  if (!accessToken || !/^\d+$/.test(String(phoneNumberId || ""))) {
    throw new Error("WhatsApp Cloud API no está configurada para enviar alertas.");
  }
  if (!/^v\d+\.\d+$/.test(String(graphVersion))) {
    throw new Error("Versión de Graph API inválida.");
  }
  let payload;
  if (mode === "session_text") {
    const only = String(pilotSource || "").replace(/\D/g, "");
    const number = String(to || "").replace(/\D/g, "");
    if (!only || only !== number || alert.channel !== "whatsapp" ||
      String(alert.external_user_id) !== only) {
      throw new Error("Modo de prueba restringido al chat WhatsApp del destinatario.");
    }
    const recent = await db.query(
      "SELECT EXISTS(SELECT 1 FROM public.meta_messages WHERE channel='whatsapp' " +
      "AND external_user_id=$1 AND direction='incoming' AND meta_timestamp > NOW() - INTERVAL '23 hours') AS allowed",
      [only]
    );
    if (recent.rows[0]?.allowed !== true) {
      const error = new Error("Prueba detenida: el destinatario no tiene ventana WhatsApp vigente.");
      error.nonRetryable = true;
      throw error;
    }
    payload = buildPilotBookingAlertPayload(alert, { to });
  } else if (mode === "template") {
    payload = buildBookingAlertPayload(alert, { to, templateName, language });
  } else {
    throw new Error("Modo de alerta no reconocido.");
  }
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
  "    AND (($2::text <> '' AND alert_key LIKE $2 || '%')",
  "         OR ($2::text = '' AND ($1::text = '' OR (channel = 'whatsapp' AND external_user_id = $1))))",
  "  ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT 1",
  ")",
  "RETURNING o.id, o.channel, o.external_user_id, o.payload, o.attempts",
].join("\n");

export async function deliverPendingBookingAlerts(db = pool, options = {}) {
  if (!env.bookingAlert.enabled && options.force !== true) return { attempted: 0, sent: 0, failed: 0 };
  const send = options.send || sendBookingAlert;
  const batchSize = Math.min(Math.max(Number(options.limit) || 10, 1), 30);
  let attempted = 0;
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < batchSize; index += 1) {
    const claimed = await db.query(CLAIM_SQL, [
      options.pilotSource ?? env.bookingAlert.pilotSource ?? "",
      options.testKeyPrefix ?? env.bookingAlert.testKeyPrefix ?? "",
    ]);
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
        "delivery_status = 'accepted', delivery_updated_at = NOW(), " +
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


// Los webhooks de entrega firmados por Meta, no la respuesta de POST /messages,
// son la fuente de verdad para delivered/read/failed.
export async function applyBookingAlertStatusUpdates(updates, db = pool) {
  const affected = [];
  for (const update of Array.isArray(updates) ? updates : []) {
    const messageId = String(update?.messageId || "").trim();
    const next = String(update?.status || "").toLowerCase();
    if (update?.channel !== "whatsapp" || !messageId ||
        !["sent", "delivered", "read", "failed"].includes(next)) continue;

    const errorCode = Number(update?.errorCode);
    const code = Number.isInteger(errorCode) && errorCode > 0 ? errorCode : null;
    // Solo título de Meta: nunca se guardan tokens ni datos de huéspedes aquí.
    const title = String(update?.errorTitle || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const sql = [
      "UPDATE public.booking_alert_outbox",
      "SET delivery_status = CASE",
      "WHEN $2 = 'read' THEN 'read'",
      "WHEN $2 = 'delivered' AND delivery_status IS DISTINCT FROM 'read' THEN 'delivered'",
      "WHEN $2 = 'failed' AND delivery_status NOT IN ('delivered', 'read') THEN 'failed'",
      "WHEN $2 = 'sent' AND delivery_status IN ('accepted', 'sent') THEN 'sent'",
      "ELSE delivery_status END,",
      "delivery_error_code = CASE",
      "WHEN $2 = 'failed' AND delivery_status NOT IN ('delivered', 'read') THEN $3",
      "WHEN $2 IN ('delivered', 'read') THEN NULL",
      "ELSE delivery_error_code END,",
      "delivery_error_title = CASE",
      "WHEN $2 = 'failed' AND delivery_status NOT IN ('delivered', 'read') THEN NULLIF($4, '')",
      "WHEN $2 IN ('delivered', 'read') THEN NULL",
      "ELSE delivery_error_title END,",
      "delivery_updated_at = NOW()",
      "WHERE meta_message_id = $1 AND status = 'sent'",
      "RETURNING id, delivery_status, delivery_error_code",
    ].join("\n");
    const result = await db.query(sql, [messageId, next, code, title]);
    if (result.rows[0]) affected.push(result.rows[0]);
  }
  return affected;
}
