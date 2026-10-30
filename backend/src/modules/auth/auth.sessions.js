import { createHash, randomBytes } from "node:crypto";
import { pool } from "../../config/db.js";

export const SESSION_SECONDS = 4 * 60 * 60;

function hashSessionId(sessionId) {
  if (typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]{30,100}$/.test(sessionId)) {
    return null;
  }
  return createHash("sha256").update(sessionId, "utf8").digest("hex");
}

export async function registerAdminSession(userId, db = pool) {
  const sid = randomBytes(32).toString("base64url");
  const sidHash = hashSessionId(sid);
  await db.query(
    `INSERT INTO public.admin_sessions (sid_hash, user_id, expires_at)
     VALUES ($1, $2, now() + interval '4 hours')`,
    [sidHash, userId]
  );
  return sid;
}

export async function getActiveAdminSession(sessionId, userId, db = pool) {
  const sidHash = hashSessionId(sessionId);
  if (!sidHash || !Number.isSafeInteger(Number(userId)) || Number(userId) < 1) {
    return null;
  }
  const result = await db.query(
    `SELECT u.id, u.name, u.email, u.role
     FROM public.admin_sessions s
     JOIN public.users u ON u.id = s.user_id
     WHERE s.sid_hash = $1 AND s.user_id = $2
       AND s.revoked_at IS NULL AND s.expires_at > now()
       AND u.role IN ('admin', 'staff')
     LIMIT 1`,
    [sidHash, Number(userId)]
  );
  return result.rows[0] || null;
}

export async function revokeAdminSession(sessionId, userId, db = pool) {
  const sidHash = hashSessionId(sessionId);
  if (!sidHash) return false;
  const result = await db.query(
    `UPDATE public.admin_sessions
     SET revoked_at = now()
     WHERE sid_hash = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING sid_hash`,
    [sidHash, userId]
  );
  return result.rows.length > 0;
}

export async function revokeAllAdminSessions(userId, db = pool) {
  const result = await db.query(
    `UPDATE public.admin_sessions
     SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
  return result.rowCount || 0;
}
