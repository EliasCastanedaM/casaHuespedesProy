import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGlobalReservationTurn } from '../src/modules/ai/ai.reservation.js';

const turn = (message, now, context = {}, understanding) => handleGlobalReservationTurn({
  message, now: new Date(now), context, understanding, channel: 'instagram',
});
const old = { whatsapp_mvp: { state: 'quoted', check_in: '2026-11-25', check_out: '2026-11-28',
  adults: 2, children: 0, child_ages: [], pets: 0, pricing_quote: { total_amount: 360 },
  staff_confirmation: { confirmed: true }, reservation_offer: { version: 1, requires_quote: true } } };

test('un rango compartido no convierte la salida en entrada al pasar el primer día', () => {
  const message = 'Quiero reservar del 25 al 28 de noviembre';
  const before = turn(message, '2026-11-19T12:00:00Z');
  assert.equal(before.context.whatsapp_mvp.check_in, '2026-11-25');
  assert.equal(before.context.whatsapp_mvp.check_out, '2026-11-28');
  const after = turn(message, '2026-11-27T12:00:00Z');
  assert.equal(after.context.whatsapp_mvp.check_in, undefined);
  assert.equal(after.context.whatsapp_mvp.check_out, undefined);
  assert.equal(after.context.whatsapp_mvp.dates_need_confirmation, true);
  assert.match(after.reply, /año/);
  assert.equal(after.action, undefined);
});

for (const message of [
  'Quiero reservar del 31/02/2027 al 02/03/2027',
  'Quiero reservar del 31 al 32 de noviembre de 2026',
  'Quiero reservar del 29/02/2027 al 02/03/2027',
  'Quiero reservar del 20/12/2026 al 19/12/2026',
]) test('rango inválido: pide aclaración sin reutilizar una fecha: ' + message, () => {
  const result = turn(message, '2026-11-27T12:00:00Z');
  const state = result.context.whatsapp_mvp;
  assert.equal(state.check_in, undefined);
  assert.equal(result.action, undefined);
  assert.equal(state.dates_need_confirmation, true);
});

test('una extracción del modelo no puede reparar silenciosamente un rango literal inválido', () => {
  const result = turn('Quiero reservar del 31/02/2027 al 02/03/2027', '2026-11-27T12:00:00Z', {},
    { intent: 'details', fields: { check_in: '2027-03-01', check_out: '2027-03-02', adults: 2 } });
  assert.equal(result.context.whatsapp_mvp.check_in, undefined);
  assert.equal(result.context.whatsapp_mvp.adults, 2);
  assert.equal(result.action, undefined);
});

test('entrada pasada no produce oferta ni consentimiento; conserva el grupo', () => {
  const result = turn('Quiero reservar del 20/11/2026 al 22/11/2026 para 2 adultos sin niños sin mascotas', '2026-11-27T12:00:00Z');
  assert.equal(result.action, undefined);
  assert.equal(result.context.whatsapp_mvp.adults, 2);
  assert.equal(result.context.whatsapp_mvp.reservation_offer, undefined);
  assert.match(result.reply, /ya pasó/);
});

test('aceptar una oferta vencida pide fechas e invalida aprobación y cotización', () => {
  const result = turn('sí quiero', '2026-11-27T12:00:00Z', old);
  assert.equal(result.action, undefined);
  for (const key of ['pricing_quote','staff_confirmation','reservation_offer','guest_reservation_consent']) {
    assert.equal(result.context.whatsapp_mvp[key], undefined, key);
  }
  assert.equal(result.context.whatsapp_mvp.awaiting, 'dates');
});

test('la frontera de día utiliza Lima y permite ingresar hoy', () => {
  const message = 'Quiero reservar del 26/11/2026 al 28/11/2026 para 2 adultos sin niños sin mascotas';
  assert.equal(turn(message, '2026-11-27T04:59:00Z').mode, 'reservation_offer');
  assert.match(turn(message, '2026-11-27T05:00:00Z').reply, /ya pasó/);
});

test('un rango entre años y un día bisiesto válido conservan ambas fechas', () => {
  for (const [message, now, from, to] of [
    ['Quiero reservar del 30/12 al 02/01', '2026-11-27T12:00:00Z','2026-12-30','2027-01-02'],
    ['Quiero reservar del 29/02/2028 al 02/03/2028', '2028-02-01T12:00:00Z','2028-02-29','2028-03-02'],
  ]) {
    const result = turn(message, now);
    assert.equal(result.context.whatsapp_mvp.check_in, from);
    assert.equal(result.context.whatsapp_mvp.check_out, to);
  }
});

test('una consulta informativa no invalida ni modifica un borrador vencido', () => {
  const snapshot = structuredClone(old);
  const result = turn('¿Cuánto paga un niño?', '2026-11-27T12:00:00Z', old, { intent: 'information', fields: {} });
  assert.equal(result.handled, false);
  assert.deepEqual(result.context, snapshot);
  assert.deepEqual(old, snapshot);
});
