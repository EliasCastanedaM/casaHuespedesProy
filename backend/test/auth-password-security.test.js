import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  validateNewPassword, changeAdminPassword, hashResetToken,
  requestAdminPasswordRecovery, confirmAdminPasswordRecovery,
} from "../src/modules/auth/auth.passwords.js";
import { env } from "../src/config/env.js";

const currentPassword = "clave-actual-de-prueba-2026";
const newPassword = "nueva-clave-segura-2026!";

function fakeTransaction(userHash, resetRow = null) {
  const log = [];
  const client = {
    async query(query, params) {
      log.push({ query, params });
      if (query.startsWith("SELECT password_hash FROM public.users")) {
        return { rows: [{ password_hash: userHash }] };
      }
      if (query.includes("FROM public.admin_password_resets r")) {
        return { rows: resetRow ? [resetRow] : [] };
      }
      return { rows: [], rowCount: 1 };
    },
    release() { log.push({ query: "RELEASE" }); },
  };
  return { db: { connect: async () => client }, log };
}

test("política de contraseña no acepta cadenas cortas, comunes o truncables por bcrypt", () => {
  for (const password of ["corta", "123456789012", "a".repeat(73), "á".repeat(40)]) {
    assert.throws(() => validateNewPassword(password), { statusCode: 400 });
  }
  assert.equal(validateNewPassword(newPassword), newPassword);
  assert.equal(hashResetToken("a".repeat(43)), createHash("sha256").update("a".repeat(43)).digest("hex"));
  assert.equal(hashResetToken("mal"), null);
});

test("cambiar contraseña requiere la actual, actualiza hash y revoca sesiones en transacción", async () => {
  const oldHash = await bcrypt.hash(currentPassword, 4);
  const { db, log } = fakeTransaction(oldHash);
  assert.equal(await changeAdminPassword(11, currentPassword, newPassword, db), true);
  assert.equal(log[0].query, "BEGIN");
  assert.ok(log.some(x => x.query.includes("UPDATE public.admin_sessions SET revoked_at")));
  assert.ok(log.some(x => x.query.includes("DELETE FROM public.admin_password_resets")));
  assert.ok(log.some(x => x.query === "COMMIT"));
  const changed = log.find(x => x.query.startsWith("UPDATE public.users SET password_hash"));
  assert.ok(await bcrypt.compare(newPassword, changed.params[0]));
  assert.notEqual(changed.params[0], newPassword);
  assert.equal(log.at(-1).query, "RELEASE");
});

test("contraseña actual incorrecta revierte sin actualizar usuario", async () => {
  const { db, log } = fakeTransaction(await bcrypt.hash(currentPassword, 4));
  await assert.rejects(() => changeAdminPassword(11, "equivocada-2026", newPassword, db), { statusCode: 401 });
  assert.ok(log.some(x => x.query === "ROLLBACK"));
  assert.equal(log.some(x => x.query.startsWith("UPDATE public.users")), false);
});

test("recuperación no hace consultas ni envía correo cuando está desactivada", async () => {
  const queries = [];
  const db = { query: async (q) => { queries.push(q); throw Error("unexpected query"); } };
  const result = await requestAdminPasswordRecovery("admin@example.invalid", { db, enabled: false, sendEmail: () => { throw Error("should not send"); } });
  assert.equal(result, false);
  assert.equal(queries.length, 0);
});

test("recuperación ignora cuentas desconocidas sin emitir ningún código", async () => {
  const previous = { ...env.brevo };
  env.brevo.apiKey = "test-api-key";
  env.brevo.senderEmail = "test@example.invalid";
  try {
    let requests = 0;
    const db = { query: async (sql) => {
      requests += 1;
      assert.match(sql, /lower\(email\)/);
      return { rows: [] };
    }};
    assert.equal(await requestAdminPasswordRecovery("UNKNOWN@example.invalid", { db, enabled: true, sendEmail: () => { throw Error("must not send"); } }), false);
    assert.equal(requests, 1);
  } finally {
    env.brevo = previous;
  }
});

test("recuperación válida genera token aleatorio, guarda solo hash y acepta único uso", async () => {
  const previous = { ...env.brevo };
  env.brevo.apiKey = "test-api-key";
  env.brevo.senderEmail = "test@example.invalid";
  try {
    let insertedHash, emailedToken;
    const db = { query: async (sql, params) => {
      if (sql.includes("SELECT id, email FROM")) return { rows: [{ id: 3, email: "admin@example.invalid" }] };
      if (sql.includes("INSERT INTO public.admin_password_resets")) {
        insertedHash = params[1];
        assert.equal(params[0], 3);
        return { rowCount: 1, rows: [{ user_id: 3 }] };
      }
      throw Error("Unexpected SQL");
    } };
    assert.equal(await requestAdminPasswordRecovery("ADMIN@example.invalid", {
      db, enabled: true, sendEmail: async (_, token) => { emailedToken = token; },
    }), true);
    assert.match(emailedToken, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(insertedHash, emailedToken);
    assert.equal(hashResetToken(emailedToken), insertedHash);

    const oldHash = await bcrypt.hash(currentPassword, 4);
    const { db: tx, log } = fakeTransaction(oldHash, { user_id: 3, password_hash: oldHash });
    assert.equal(await confirmAdminPasswordRecovery(emailedToken, newPassword, tx), true);
    assert.ok(log.some(x => x.query.includes("UPDATE public.admin_password_resets SET used_at")));
    assert.ok(log.some(x => x.query.includes("UPDATE public.admin_sessions SET revoked_at")));
    assert.equal(log.some(x => x.query === "COMMIT"), true);
    const { db: expired } = fakeTransaction(oldHash);
    await assert.rejects(() => confirmAdminPasswordRecovery(emailedToken, newPassword, expired), { statusCode: 400 });
  } finally {
    env.brevo = previous;
  }
});
