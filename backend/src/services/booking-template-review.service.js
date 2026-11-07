import { env } from "../config/env.js";
import { pool } from "../config/db.js";
import { BOOKING_ALERT_TEMPLATE_BODY } from "./booking-alerts.service.js";

export const RESERVATION_ADMIN_TEMPLATE_NAME = "solicitud_reserva_admin";
export const RESERVATION_ADMIN_TEMPLATE_LANGUAGE = "es";

const EXAMPLES = [
  "WhatsApp", "Cliente de ejemplo", "+51999999999",
  "20/11/2026 al 22/11/2026", "2 adultos, 0 niños",
  "Matrimonial Ejecutiva", "vista al mar", "S/ 280.00",
];

export function reservationAdminTemplateDefinition() {
  return {
    name: RESERVATION_ADMIN_TEMPLATE_NAME,
    language: RESERVATION_ADMIN_TEMPLATE_LANGUAGE,
    category: "UTILITY",
    allow_category_change: false,
    components: [{
      type: "BODY",
      text: BOOKING_ALERT_TEMPLATE_BODY,
      example: { body_text: [EXAMPLES] },
    }],
  };
}

const CLAIM_SQL = [
  "UPDATE public.whatsapp_template_submissions AS t",
  "SET status = 'working', locked_at = NOW(), attempt_count = attempt_count + 1, updated_at = NOW()",
  "WHERE t.id = (SELECT id FROM public.whatsapp_template_submissions",
  "WHERE (status = 'queued' AND attempt_count < 3)",
  "   OR (status = 'submitted' AND next_check_at <= NOW())",
  "   OR (status = 'working' AND locked_at < NOW() - INTERVAL '5 minutes')",
  "ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)",
  "RETURNING t.id, t.template_name, t.language_code, t.waba_id,",
  "t.provider_template_id, t.attempt_count",
].join("\n");

function graphApiBase(graphVersion) {
  if (!/^v\d+\.\d+$/.test(String(graphVersion))) throw new Error("Versión de Graph API inválida.");
  return "https://graph.facebook.com/" + graphVersion;
}

async function graphRequest(path, { token, fetchImpl, graphVersion, method = "GET", body } = {}) {
  if (!token) throw new Error("Falta el token de WhatsApp.");
  const response = await fetchImpl(graphApiBase(graphVersion) + "/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    const code = Number(data?.error?.code) || null;
    throw new Error("Meta HTTP " + response.status + (code ? " · código " + code : ""));
  }
  return data;
}

function exactTemplate(templates) {
  return (Array.isArray(templates) ? templates : []).find(
    (item) => item.name === RESERVATION_ADMIN_TEMPLATE_NAME &&
      item.language === RESERVATION_ADMIN_TEMPLATE_LANGUAGE
  ) || null;
}

function ensureTemplateMatches(existing) {
  if (existing.category && existing.category !== "UTILITY") {
    const error = new Error("Meta cambió la categoría; se requiere revisión antes de enviar.");
    error.templateConflict = true;
    throw error;
  }
  const body = existing.components?.find((component) =>
    String(component.type || "").toUpperCase() === "BODY"
  );
  if (body && body.text !== BOOKING_ALERT_TEMPLATE_BODY) {
    const error = new Error("Existe una plantilla con el mismo nombre, pero con otro contenido.");
    error.templateConflict = true;
    throw error;
  }
}

function mapMetaStatus(value) {
  const status = String(value || "").toUpperCase();
  if (status === "APPROVED") return "approved";
  if (["REJECTED", "DISABLED"].includes(status)) return "rejected";
  return "submitted";
}

async function verifySenderWaba({ wabaId, phoneNumberId, token, fetchImpl, graphVersion }) {
  if (!/^\d{10,25}$/.test(wabaId) || !/^\d+$/.test(phoneNumberId)) {
    throw new Error("Identificador de cuenta o número WhatsApp inválido.");
  }
  const result = await graphRequest(wabaId + "/phone_numbers?fields=id&limit=100", {
    token, fetchImpl, graphVersion,
  });
  if (!Array.isArray(result.data) ||
      !result.data.some((item) => String(item.id) === phoneNumberId)) {
    throw new Error("El emisor configurado no pertenece a esta cuenta WhatsApp.");
  }
}

async function findTemplate({ wabaId, token, fetchImpl, graphVersion }) {
  const path = wabaId + "/message_templates?fields=id,name,status,category,language,components" +
    "&name=" + encodeURIComponent(RESERVATION_ADMIN_TEMPLATE_NAME) + "&limit=100";
  const result = await graphRequest(path, { token, fetchImpl, graphVersion });
  return exactTemplate(result.data);
}

const UPDATE_SQL = [
  "UPDATE public.whatsapp_template_submissions",
  "SET status = $2, provider_template_id = COALESCE($3, provider_template_id),",
  "provider_status = $4, provider_category = $5, last_error = $6,",
  "locked_at = NULL, next_check_at = NOW() + ($7::int * INTERVAL '1 minute'),",
  "updated_at = NOW() WHERE id = $1",
].join("\n");

export async function processMetaTemplateReview(db = pool, {
  fetchImpl = fetch,
  token = env.meta.whatsappAccessToken,
  phoneNumberId = env.meta.whatsappPhoneNumberId,
  graphVersion = env.meta.graphApiVersion,
} = {}) {
  const claimed = await db.query(CLAIM_SQL);
  const job = claimed.rows[0];
  if (!job) return { processed: false };

  let status = "failed";
  let providerId = job.provider_template_id || null;
  let providerStatus = null;
  let category = null;
  let errorText = null;

  try {
    if (job.template_name !== RESERVATION_ADMIN_TEMPLATE_NAME ||
        job.language_code !== RESERVATION_ADMIN_TEMPLATE_LANGUAGE) {
      throw new Error("Solicitud fuera de la lista de plantillas autorizadas.");
    }
    const found = await findTemplate({
      wabaId: job.waba_id, token, fetchImpl, graphVersion,
    });
    if (found) {
      ensureTemplateMatches(found);
      status = mapMetaStatus(found.status);
      providerId = String(found.id || providerId || "") || null;
      providerStatus = String(found.status || "PENDING");
      category = String(found.category || "UTILITY");
    } else {
      if (providerId) {
        throw new Error("Plantilla presentada anteriormente aún no visible en Meta.");
      }
      await verifySenderWaba({
        wabaId: job.waba_id, phoneNumberId: String(phoneNumberId || ""),
        token, fetchImpl, graphVersion,
      });
      const created = await graphRequest(job.waba_id + "/message_templates", {
        token, fetchImpl, graphVersion, method: "POST",
        body: reservationAdminTemplateDefinition(),
      });
      providerId = String(created?.id || "") || null;
      providerStatus = String(created?.status || "PENDING");
      category = String(created?.category || "UTILITY");
      status = mapMetaStatus(providerStatus);
    }
  } catch (error) {
    errorText = String(error?.message || "No se pudo consultar Meta").slice(0, 200);
    status = error.templateConflict ? "conflict" : "failed";
  }

  await db.query(UPDATE_SQL, [
    job.id, status, providerId, providerStatus, category, errorText,
    status === "submitted" ? 15 : 0,
  ]);

  console.info(JSON.stringify({
    component: "meta_template_review",
    event: "review_checked",
    status,
    attempt: job.attempt_count,
    ...(errorText ? { errorCode: "META_TEMPLATE_REVIEW_ERROR" } : {}),
  }));
  return { processed: true, status, providerId, providerStatus, category };
}
