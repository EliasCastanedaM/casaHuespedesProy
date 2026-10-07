import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/config/env.js";
import {
  buildHumanServiceRedirect,
  isAiServiceTime,
} from "../src/modules/ai/ai.schedule.js";

function peruTime(isoWithOffset) {
  return new Date(isoWithOffset);
}

test("el asesor virtual está activo las 24 horas en Perú", () => {
  assert.equal(isAiServiceTime(peruTime("2026-09-18T00:00:00-05:00")), true);
  assert.equal(isAiServiceTime(peruTime("2026-09-18T07:59:00-05:00")), true);
  assert.equal(isAiServiceTime(peruTime("2026-09-18T08:00:00-05:00")), true);
  assert.equal(isAiServiceTime(peruTime("2026-09-18T12:00:00-05:00")), true);
  assert.equal(isAiServiceTime(peruTime("2026-09-18T22:59:00-05:00")), true);
  assert.equal(isAiServiceTime(peruTime("2026-09-18T23:59:00-05:00")), true);
});

test("el mensaje auxiliar informa atención virtual 24/7", () => {
  const previousPhone = env.hotel.phone;
  env.hotel.phone = "901551287";
  try {
    const reply = buildHumanServiceRedirect("web");
    assert.match(reply, /24 horas/i);
    assert.match(reply, /\+51 901 551 287/);
    assert.match(reply, /https:\/\/wa\.me\/51901551287/);
  } finally {
    env.hotel.phone = previousPhone;
  }
});

test("en WhatsApp mantiene disponible el handoff a una persona", () => {
  const reply = buildHumanServiceRedirect("whatsapp");
  assert.match(reply, /24 horas/i);
  assert.match(reply, /atención humana/i);
  assert.match(reply, /se pausará/i);
});
