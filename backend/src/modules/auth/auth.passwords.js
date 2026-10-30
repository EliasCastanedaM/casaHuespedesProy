import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sendPasswordRecoveryEmail } from "./auth.recovery-mail.js";

const BCRYPT_ROUNDS = 12;
const RESET_TTL_MINUTES = 15;

function credentialError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function validateNewPassword(value) {
  if (typeof value !== "string" || value.length < 12 ||
      Buffer.byteLength(value, "utf8") > 72) {
    throw credentialError("La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes.");
  }
  if (/^[\s]+$/.test(value)) {
    throw credentialError("Elige una contraseña más segura.");
  }
  if (["123456789012", "password12345", "contraseña123", "admin12345678"].includes(value.toLowerCase())) {
    throw credentialError("Elige una contraseña distinta de las más habituales.");
  }
  return value;
}

export async function changeAdminPassword(userId, oldPassword, newPassword, db = pool) {
  if (typeof oldPassword !== "string" || !oldPassword) {
    throw credentialError("Debes indicar tu contraseña actual.");
  }
  validateNewPassword(newPassword);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT password_hash FROM public.users WHERE id = $1 FOR UPDATE",
      [userId]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(oldPassword, user.password_hash))) {
      throw credentialError("La contraseña actual es incorrecta.", 400);
    }
    if (await bcrypt.compare(newPassword, user.password_hash)) {
      throw credentialError("La nueva contraseña debe ser diferente de la actual.");
    }
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await client.query(
      "UPDATE public.users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [hash, userId]
    );
    await client.query(
      "UPDATE public.admin_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
    await client.query("DELETE FROM public.admin_password_resets WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function hashResetToken(token) {
  if (typeof token !== "string" || !/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// Caller receives the same answer for an unknown email or an existing account.
export async function requestAdminPasswordRecovery(email, {
  db = pool,
  enabled = env.auth.passwordRecoveryEnabled,
  sendEmail = sendPasswordRecoveryEmail,
} = {}) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) {
    throw credentialError("Introduce un correo electrónico válido.");
  }
  // Do not generate unusable reset links before the frontend is deployed.
  if (!enabled || !env.brevo.apiKey || !env.brevo.senderEmail) return false;

  const found = await db.query(
    "SELECT id, email FROM public.users WHERE lower(email) = $1 AND role IN ('admin', 'staff') LIMIT 1",
    [normalized]
  );
  if (!found.rows.length) return false;
  const user = found.rows[0];
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const inserted = await db.query(
    `INSERT INTO public.admin_password_resets (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '15 minutes')
     ON CONFLICT (user_id) DO UPDATE SET
       token_hash = EXCLUDED.token_hash, issued_at = now(),
       expires_at = EXCLUDED.expires_at, used_at = NULL
     WHERE admin_password_resets.issued_at < now() - interval '5 minutes'
       OR admin_password_resets.used_at IS NOT NULL
     RETURNING user_id`,
    [user.id, tokenHash]
  );
  if (!inserted.rowCount) return false;
  try {
    await sendEmail(user.email, token);
    return true;
  } catch {
    // Never reveal the email address or raw token, including in logs.
    await db.query("DELETE FROM public.admin_password_resets WHERE user_id = $1 AND token_hash = $2",
      [user.id, tokenHash]);
    return false;
  }
}

export async function confirmAdminPasswordRecovery(token, newPassword, db = pool) {
  const tokenHash = hashResetToken(token);
  if (!tokenHash) throw credentialError("El enlace ya no es válido.", 400);
  validateNewPassword(newPassword);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT r.user_id, u.password_hash
       FROM public.admin_password_resets r
       JOIN public.users u ON u.id = r.user_id
       WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now()
       FOR UPDATE OF r, u`,
      [tokenHash]
    );
    const account = result.rows[0];
    if (!account) throw credentialError("El enlace venció o ya fue utilizado.", 400);
    if (await bcrypt.compare(newPassword, account.password_hash)) {
      throw credentialError("La nueva contraseña debe ser diferente de la anterior.");
    }
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await client.query("UPDATE public.users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [hash, account.user_id]);
    await client.query("UPDATE public.admin_password_resets SET used_at = now() WHERE user_id = $1",
      [account.user_id]);
    await client.query(
      "UPDATE public.admin_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
      [account.user_id]
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
