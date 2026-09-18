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

test("el asesor se activa exactamente a las 23:00 en Perú", () => {
  assert.equal(isAiServiceTime(peruTime("2026-09-18T22:59:00-05:00")), false);
  assert.equal(isAiServiceTime(peruTime("2026-09-18T23:00:00-05:00")), true);
});

test("el asesor permanece activo hasta las 07:59 y se apaga a las 08:00", () => {
  assert.equal(isAiServiceTime(peruTime("2026-09-19T07:59:00-05:00")), true);
  assert.equal(isAiServiceTime(peruTime("2026-09-19T08:00:00-05:00")), false);
});

test("el mensaje diurno deriva al WhatsApp de Casa Huéspedes", () => {
  const previousPhone = env.hotel.phone;
  env.hotel.phone = "901551287";
  try {
    const reply = buildHumanServiceRedirect("web");
    assert.match(reply, /asesor virtual atiende de 23:00 a 08:00/i);
    assert.match(reply, /\+51 901 551 287/);
    assert.match(reply, /https:\/\/wa\.me\/51901551287/);
  } finally {
    env.hotel.phone = previousPhone;
  }
});

test("en WhatsApp indica que el huésped puede continuar en el mismo chat", () => {
  const reply = buildHumanServiceRedirect("whatsapp");
  assert.match(reply, /mismo chat/i);
  assert.doesNotMatch(reply, /wa\.me/);
});
