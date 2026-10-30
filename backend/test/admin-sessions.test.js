import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import app from "../src/app.js";
import { pool } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import {
  registerAdminSession, getActiveAdminSession,
  revokeAdminSession, revokeAllAdminSessions, SESSION_SECONDS,
} from "../src/modules/auth/auth.sessions.js";

test("las sesiones tienen identificadores aleatorios y solo persisten su hash", async () => {
  const calls = [];
  const db = { query: async (sql, values) => {
    calls.push({ sql, values });
    return { rows: [], rowCount: 1 };
  }};
  const sid = await registerAdminSession(7, db);
  assert.match(sid, /^[a-zA-Z0-9_-]{40,100}$/);
  assert.equal(calls[0].values[0], createHash("sha256").update(sid).digest("hex"));
  assert.notEqual(calls[0].values[0], sid);
  assert.equal(calls[0].values[1], 7);
  assert.equal(SESSION_SECONDS, 14400);
  assert.equal(await getActiveAdminSession("invalido", 7, db), null);
  assert.equal(await getActiveAdminSession(sid, 0, db), null);
  assert.equal(calls.length, 1);
});

test("cerrar sesión revoca el JWT del lado del servidor inmediatamente", async (t) => {
  const oldSecret = env.jwtSecret;
  const originalQuery = pool.query;
  env.jwtSecret = "prueba-segura-de-sesiones-casa-huespedes-2026";
  let revoked = false;
  const sid = "c".repeat(43);
  pool.query = async (sql, params) => {
    if (sql.includes("FROM public.admin_sessions s")) {
      return { rows: revoked ? [] : [{
        id: Number(params[1]), role: "admin", name: "Prueba", email: "test@example.invalid",
      }] };
    }
    if (sql.includes("UPDATE public.admin_sessions") && sql.includes("sid_hash")) {
      revoked = true;
      return { rows: [{ sid_hash: "hash" }], rowCount: 1 };
    }
    throw new Error("Consulta inesperada en la prueba de revocación");
  };
  t.after(() => {
    pool.query = originalQuery;
    env.jwtSecret = oldSecret;
  });

  const token = jwt.sign({ id: 1, sid }, env.jwtSecret, {
    expiresIn: "5m", issuer: "casa-huespedes-pimentel", audience: "hotel-admin",
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((e) => e ? reject(e) : resolve()));
  const base = "http://127.0.0.1:" + server.address().port;
  const headers = { Authorization: "Bearer " + token };
  let response = await fetch(base + "/api/auth/session", { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.user.role, "admin");
  response = await fetch(base + "/api/auth/logout", { method: "POST", headers });
  assert.equal(response.status, 200);
  assert.equal(revoked, true);
  response = await fetch(base + "/api/auth/session", { headers });
  assert.equal(response.status, 401);
  const legacy = jwt.sign({ id: 1, role: "admin" }, env.jwtSecret, { expiresIn: "5m" });
  response = await fetch(base + "/api/auth/session", { headers: { Authorization: "Bearer " + legacy } });
  assert.equal(response.status, 401, "JWT anteriores no deben eludir la revocación");
});

test("revocación global afecta solo las sesiones del usuario indicado", async () => {
  let captured;
  const db = { query: async (sql, params) => {
    captured = { sql, params };
    return { rowCount: 3 };
  }};
  const count = await revokeAllAdminSessions(8, db);
  assert.equal(count, 3);
  assert.match(captured.sql, /WHERE user_id = \$1/);
  assert.deepEqual(captured.params, [8]);

  const invalid = await revokeAdminSession("x", 8, db);
  assert.equal(invalid, false);
});
