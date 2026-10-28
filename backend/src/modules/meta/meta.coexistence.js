// Eventos de coexistencia de WhatsApp Business App + Cloud API.
// Nunca se envían a OpenAI. El historial y los contactos se archivan para
// importación explícita; los ecos del teléfono se registran como atención humana.
import crypto from "node:crypto";

const FIELDS = new Set(["history", "smb_app_state_sync", "smb_message_echoes"]);

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

// Meta puede incluir prefijos + en el destinatario de un eco, mientras que
// los mensajes entrantes usan el wa_id numérico. Ambos deben coincidir.
function normalizeWaId(value) {
  const raw = text(value);
  return /^\\+?[0-9 ()-]+$/.test(raw) ? raw.replace(/\\D/g, "") : raw;
}

function metaDate(timestamp) {
  const seconds = Number(timestamp);
  if (!text(timestamp) || !Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseCoexistenceEvents(body) {
  if (body?.object !== "whatsapp_business_account") return [];
  const events = [];
  for (const entry of array(body.entry)) {
    for (const change of array(entry?.changes)) {
      const field = text(change?.field);
      if (!FIELDS.has(field)) continue;
      const value = object(change?.value);
      const wabaId = text(entry?.id);
      if (!value || !wabaId) {
        throw new Error("Evento de coexistencia sin cuenta o contenido válido.");
      }
      const echoes = field === "smb_message_echoes" ? value.message_echoes : [];
      if (field === "smb_message_echoes" && !Array.isArray(echoes)) {
        throw new Error("Evento smb_message_echoes sin lista de mensajes.");
      }
      for (const echo of array(echoes)) {
        if (!text(echo?.id) || !text(echo?.to) || text(echo.to).length > 160) {
          throw new Error("Eco de WhatsApp sin identificador o destinatario válido.");
        }
      }
      events.push({
        eventId: crypto.createHash("sha256")
          .update([wabaId, field, JSON.stringify(value)].join("|")).digest("hex"),
        field,
        wabaId,
        phoneNumberId: text(value.metadata?.phone_number_id),
        payload: value,
        echoes: array(echoes).map((echo) => ({
          messageId: text(echo.id),
          externalUserId: normalizeWaId(echo.to),
          messageType: text(echo.type) || "unknown",
          content: text(echo.type) === "text"
            ? text(echo.text?.body)
            : text(echo[echo.type]?.caption),
          timestamp: metaDate(echo.timestamp),
        })),
      });
    }
  }
  return events;
}

// Transacción única: no respondemos 200 a Meta si el evento no se ha guardado.
// La restricción única evita que los reintentos reactiven una atención ya resuelta.
export async function persistCoexistenceEvents(body, db) {
  const events = parseCoexistenceEvents(body);
  if (!events.length) return { archived: 0, echoes: 0 };
  const client = typeof db.connect === "function" ? await db.connect() : db;
  const ownTransaction = client !== db;
  let archived = 0;
  let echoes = 0;
  try {
    if (ownTransaction) await client.query("BEGIN");
    for (const event of events) {
      const result = await client.query(
        "INSERT INTO meta_coexistence_events " +
        "(event_id, waba_id, phone_number_id, event_type, payload) " +
        "VALUES ($1, $2, NULLIF($3, ''), $4, $5::jsonb) " +
        "ON CONFLICT (event_id) DO NOTHING RETURNING event_id",
        [event.eventId, event.wabaId, event.phoneNumberId,
          event.field, JSON.stringify(event.payload)]
      );
      if (!result.rows.length) continue;
      archived += 1;

      // El historial anterior y los contactos permanecen archivados, no se
      // convierten en mensajes nuevos ni despiertan al asesor automático.
      if (event.field !== "smb_message_echoes") continue;
      for (const echo of event.echoes) {
        await client.query(
          "INSERT INTO meta_conversations " +
          "(channel, external_user_id, last_message_at, updated_at) " +
          "VALUES ('whatsapp', $1, COALESCE($2::timestamptz, CURRENT_TIMESTAMP), " +
          "CURRENT_TIMESTAMP) " +
          "ON CONFLICT (channel, external_user_id) DO UPDATE SET " +
          "last_message_at = GREATEST(" +
          "COALESCE(meta_conversations.last_message_at, '-infinity'::timestamptz), " +
          "COALESCE(EXCLUDED.last_message_at, CURRENT_TIMESTAMP)), " +
          "updated_at = CURRENT_TIMESTAMP",
          [echo.externalUserId, echo.timestamp]
        );
        const inserted = await client.query(
          "INSERT INTO meta_messages " +
          "(channel, external_user_id, meta_message_id, direction, author, " +
          "message_type, content, status, meta_timestamp) " +
          "VALUES ('whatsapp', $1, $2, 'outgoing', 'admin', $3, $4, 'sent', $5) " +
          "ON CONFLICT (channel, meta_message_id) " +
          "WHERE meta_message_id IS NOT NULL DO NOTHING RETURNING id",
          [echo.externalUserId, echo.messageId, echo.messageType,
            echo.content, echo.timestamp]
        );
        if (inserted.rows.length) {
          // Una nueva intervención del móvil activa atención humana; un
          // reintento de Meta NO debe reactivar un chat ya devuelto al bot.
          await client.query(
            "UPDATE meta_conversations SET handoff_active = TRUE, " +
            "handoff_requested_at = CURRENT_TIMESTAMP, handoff_resolved_at = NULL, " +
            "resolved_at = NULL, updated_at = CURRENT_TIMESTAMP " +
            "WHERE channel = 'whatsapp' AND external_user_id = $1",
            [echo.externalUserId]
          );
          echoes += 1;
        }
      }
    }
    if (ownTransaction) await client.query("COMMIT");
    return { archived, echoes };
  } catch (error) {
    if (ownTransaction) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (ownTransaction) client.release();
  }
}
