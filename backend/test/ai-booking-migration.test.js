import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL(
  "../database/migrations/2026-09-15-ai-direct-booking-context.sql",
  import.meta.url
);

test("la migración define idempotencia durable, expiración y cierre de Data API", async () => {
  const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();
  assert.match(sql, /add column if not exists booking_intent_id uuid/);
  assert.match(sql, /add constraint bookings_booking_intent_id_key/);
  assert.match(sql, /unique \(booking_intent_id\)/);
  assert.match(sql, /add column if not exists booking_context_expires_at timestamptz/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.ai_conversations/);
  assert.match(sql, /public, anon, authenticated, service_role/);
  assert.doesNotMatch(sql, /create policy/);
  assert.doesNotMatch(sql, /add column if not exists (?:payment_url|public_token)/);
});
