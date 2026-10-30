import test from "node:test";
import assert from "node:assert/strict";
import { canUseWhatsAppDirectBooking } from "../src/modules/ai/ai.channel-capabilities.js";

test("WhatsApp permanece en modo handoff por defecto", () => {
  assert.equal(canUseWhatsAppDirectBooking(), false);
  assert.equal(canUseWhatsAppDirectBooking({ whatsappDirectBookingEnabled: true }), false);
  assert.equal(canUseWhatsAppDirectBooking({ channelInventoryVerified: true }), false);
  assert.equal(canUseWhatsAppDirectBooking({ whatsappDirectBookingEnabled: "true", channelInventoryVerified: true }), false);
});

test("solo habilita reservas de WhatsApp con dos aprobaciones explícitas", () => {
  assert.equal(canUseWhatsAppDirectBooking({ whatsappDirectBookingEnabled: true, channelInventoryVerified: true }), true);
});
