import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPrivacyRetentionPreview } from "../src/modules/privacy/privacy.service.js";

test("el resumen de retención usa SELECT y solo expone totales agregados", async () => {
  const queries = [];
  const db = { async query(sql) {
    queries.push(sql);
    assert.match(sql.trim(), /^SELECT/i);
    assert.doesNotMatch(sql, /\bDELETE\b|\bUPDATE\b|\bINSERT\b/i);
    if (sql.includes("FROM public.ai_conversations a")) {
      return { rows: [{
        populated: 12, expired_without_handoff: 9,
        expired_with_active_handoff: 0, active_contexts: 3,
      }] };
    }
    return { rows: [
      { category: "messages", total: 488, older_than_90d: 0 },
      { category: "customers", total: 5, older_than_90d: 0 },
    ] };
  }};
  const result = await getPrivacyRetentionPreview(db);
  assert.equal(queries.length, 2);
  assert.equal(result.mode, "read_only");
  assert.equal(result.bookingContext.expiredWithoutHandoff, 9);
  assert.equal(result.records[0].total, 488);
  assert.equal(result.policy.bookingAndCustomerDeletion, "manual_review_required");
  const serialized = JSON.stringify(result);
  for (const forbidden of ["external_user_id", "phone", "email", "content", "document_number", "booking_context_expires_at"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("el endpoint de privacidad requiere rol admin y no permite mutaciones", () => {
  const source = readFileSync(new URL("../src/modules/privacy/privacy.routes.js", import.meta.url), "utf8");
  assert.match(source, /router\.get\("\/retention-preview", requireAdminAuth, requireAdminRole/);
  assert.doesNotMatch(source, /router\.(post|put|patch|delete)\(/);
});

test("los logs de envío no imprimen direcciones, códigos ni errores del proveedor", () => {
  const mail = readFileSync(new URL("../src/services/email.service.js", import.meta.url), "utf8");
  const booking = readFileSync(new URL("../src/modules/bookings/booking.service.js", import.meta.url), "utf8");
  assert.doesNotMatch(mail, /Correo enviado correctamente por Brevo:|error\.message\)/);
  assert.doesNotMatch(booking, /"La reserva fue creada, pero no se pudo enviar su correo:"/);
});
