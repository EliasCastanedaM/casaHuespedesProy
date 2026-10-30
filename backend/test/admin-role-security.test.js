import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { pool } from "../src/config/db.js";
import { requireRole } from "../src/middlewares/authMiddleware.js";

test("el middleware de roles conserva acciones de staff pero limita administración", () => {
  const adminOnly = requireRole("admin");
  let status = null;
  let nextCount = 0;
  const res = {
    status(code) { status = code; return this; },
    json(result) { return result; },
  };
  adminOnly({ user: { role: "staff" } }, res, () => { nextCount += 1; });
  assert.equal(status, 403);
  assert.equal(nextCount, 0);
  adminOnly({ user: { role: "admin" } }, res, () => { nextCount += 1; });
  assert.equal(nextCount, 1);
});

test("rutas sensibles deniegan JWT staff sin ejecutar consultas ni modificaciones", async (t) => {
  const old = env.jwtSecret;
  env.jwtSecret = "secret-local-exclusivo-para-pruebas-de-roles-2026";
  t.after(() => { env.jwtSecret = old; });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((e) => e ? reject(e) : resolve())));
  const base = "http://127.0.0.1:" + server.address().port;
  const originalQuery = pool.query;
  pool.query = async (sql, params) => {
    if (sql.includes("FROM public.admin_sessions s")) {
      const userId = Number(params[1]);
      return { rows: [{ id: userId, name: "Test", email: "test@example.invalid",
        role: userId === 42 ? "staff" : "admin" }] };
    }
    throw new Error("Consulta inesperada en prueba aislada");
  };
  t.after(() => { pool.query = originalQuery; });
  const options = { expiresIn: "5m", issuer: "casa-huespedes-pimentel", audience: "hotel-admin" };
  const staff = jwt.sign({ id: 42, sid: "s".repeat(43) }, env.jwtSecret, options);
  const admin = jwt.sign({ id: 43, sid: "a".repeat(43) }, env.jwtSecret, options);

  const sensitive = [
    ["DELETE", "/api/bookings/123"],
    ["PUT", "/api/bookings/123/status"],
    ["POST", "/api/blocked-slots"],
    ["DELETE", "/api/blocked-slots/123"],
    ["PUT", "/api/settings/availability"],
    ["POST", "/api/rooms"],
    ["PUT", "/api/rooms/1"],
    ["DELETE", "/api/rooms/1"],
    ["POST", "/api/gallery"],
    ["DELETE", "/api/gallery/1"],
    ["GET", "/api/admin/ai-usage?days=7"],
    ["GET", "/api/admin/privacy/retention-preview"],
    ["POST", "/api/meta/embedded-signup/complete"],
    ["POST", "/api/meta/conversations/whatsapp/123/confirm-reservation"],
  ];
  for (const [method, url] of sensitive) {
    const response = await fetch(base + url, {
      method, headers: { Authorization: "Bearer " + staff, "Content-Type": "application/json" },
      ...(method === "GET" ? {} : { body: "{}" }),
    });
    assert.equal(response.status, 403, method + " " + url);
  }
  const noToken = await fetch(base + "/api/admin/ai-usage");
  assert.equal(noToken.status, 401);
  const adminPost = await fetch(base + "/api/rooms", {
    method: "POST", headers: { Authorization: "Bearer " + admin, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(adminPost.status, 400, "admin llega al controlador sin ejecutar creación vacía");
});
