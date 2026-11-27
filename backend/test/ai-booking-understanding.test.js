import './helpers/booking-fixture-clock.js';
import test from "node:test";
import assert from "node:assert/strict";
import { validateBookingUnderstanding, applyBookingUnderstanding, bookingUnderstandingInput, shouldUnderstandBooking } from "../src/modules/ai/ai.booking-understanding.js";
import { handleGlobalReservationTurn, reservationContextForMessage } from "../src/modules/ai/ai.reservation.js";
import { bookingUnderstandingCases } from "./fixtures/booking-understanding-cases.js";

function modelOutput(example) {
  return { intent: example.intent, updates: Object.entries(example.fields).map(([field, value]) => ({ field, value, evidence: example.message })), clarification: example.intent === "unclear" ? "¿Puedes aclarar los datos de tu grupo?" : null };
}

for (const example of bookingUnderstandingCases) test("contrato y validación: " + example.id, () => {
  const understood = validateBookingUnderstanding(modelOutput(example), example.message, example.state);
  assert.ok(understood);
  assert.deepEqual(understood.fields, example.fields);
  const context = { whatsapp_mvp: example.state };
  const snapshot = structuredClone(context);
  const result = handleGlobalReservationTurn({ message: example.message, context, understanding: understood, channel: "instagram", now: new Date("2026-11-15T12:00:00Z") });
  assert.deepEqual(context, snapshot, "no debe mutar el contexto de entrada");
  if (["information", "hypothetical", "unclear"].includes(example.intent)) assert.deepEqual(result.context, context);
  else {
    for (const [key, value] of Object.entries(example.fields)) {
      if (key === "view" || key === "near_window") assert.equal(result.context.whatsapp_mvp.room_preferences[key], value);
      else assert.deepEqual(result.context.whatsapp_mvp[key], value);
    }
  }
  if (example.intent === "new_request") {
    for (const key of ["adults", "children", "pets", "check_in", "check_out"]) if (!(key in example.fields)) assert.equal(result.context.whatsapp_mvp[key], undefined);
  }
});

test("rechaza datos inválidos, campos operativos, evidencia inventada e incoherencias", () => {
  const message = "Quiero cambiar mi solicitud";
  const output = updates => ({ intent: "correction", updates: updates.map(([field, value, evidence = message]) => ({ field, value, evidence })), clarification: null });
  for (const updates of [
    [["adults", -1]], [["adults", 31]], [["adults", "2"]], [["adults", 2, "no fue dicho"]],
    [["child_ages", [18]]], [["child_ages", [3, 7]], ["children", 1]],
    [["adults", 2], ["adults", 3]], [["children", 2], ["total_guests", 1]],
    [["check_in", "2026-02-30"]], [["check_in", "2026-12-28"], ["check_out", "2026-12-25"]],
    [["total_amount", 1]], [["staff_confirmation", true]], [["category_slug", "habitacion-405"]],
  ]) assert.equal(validateBookingUnderstanding(output(updates), message), null);
  assert.equal(validateBookingUnderstanding("not JSON", message), null);
  assert.equal(validateBookingUnderstanding({ ...output([]), clarification: "Entra a https://otra-web.test" }, message), null);
  assert.equal(validateBookingUnderstanding({ ...output([["adults", 4]]), intent: "hypothetical" }, message), null);
});

test("el modelo recibe solo datos necesarios de esta solicitud, sin PII ni historial", () => {
  const state = { state: "collecting", adults: 2, customer_email: "private@example.com", customer_phone: "51999999999", pricing_quote: { total_amount: 999 }, staff_confirmation: { confirmed: true } };
  const text = bookingUnderstandingInput("voy con mi esposa", state);
  assert.doesNotMatch(text, /private|51999999999|999|staff_confirmation|pricing_quote/);
  const fresh = reservationContextForMessage("Quiero reservar del 25 al 28 de noviembre", { whatsapp_mvp: state });
  assert.deepEqual(fresh, {});
  assert.equal(JSON.parse(bookingUnderstandingInput("Quiero reservar del 25 al 28 de noviembre", fresh.whatsapp_mvp)).solicitud_actual.adults, undefined);
});

test('la interpretación recibe las opciones mostradas con su orden, sin precios ni inventario',()=>{
  const input=JSON.parse(bookingUnderstandingInput('prefiero la que mencionaste primero',{
    state:'quoted',quote_options:[{category_slug:'doble',category_name:'Doble - 2 Camas',total_amount:999,room_id:123}],
  }));
  assert.deepEqual(input.solicitud_actual.quote_options,[{option:1,category_slug:'doble',category_name:'Doble - 2 Camas'}]);
  assert.doesNotMatch(JSON.stringify(input),/total_amount|room_id|999/);
});

test("conserva barreras de nombres, pagos y respuestas inequívocas", () => {
  assert.equal(shouldUnderstandBooking("Ana Pérez", { state: "awaiting_customer_name" }), false);
  assert.equal(shouldUnderstandBooking("Ya pagué", { state: "booked" }), false);
  assert.equal(shouldUnderstandBooking("no", { state: "collecting", awaiting: "pets" }), false);
  assert.equal(shouldUnderstandBooking("mi señora y mis peques", { state: "collecting" }), true);
  const next = applyBookingUnderstanding({ adults: 2, children: 1, child_ages: [4] }, { children: 2 });
  assert.equal(next.child_ages, undefined);
});

test('consultas inglesas de estadía pasan al intérprete sin convertir características en reservas', () => {
  for (const message of [
    'Do you have a room for two adults from December 10 to December 12, 2026?',
    'Are there rooms for 3 guests tomorrow?',
    'Is a room available for two adults?',
    'Is there accommodation from 2026-12-10 to 2026-12-12?',
  ]) assert.equal(shouldUnderstandBooking(message), true, message);
  for (const message of ['Do you have room service?', 'Do you have rooms with a desk?'])
    assert.equal(shouldUnderstandBooking(message), false, message);
  const message = 'Do you have a room for two adults from December 10 to December 12, 2026?';
  const state = {state:'browsing', adults:1};
  const understanding = {intent:'information', language:'en', fields:{}};
  const result = handleGlobalReservationTurn({message, context:{whatsapp_mvp:state}, understanding});
  assert.deepEqual(result.context.whatsapp_mvp, state);
  assert.equal(result.action, undefined);
});

test("una corrección interpretada no depende de que las reglas reconozcan su redacción", () => {
  const message = "¿Puedes mover nuestra salida un día después, por favor?";
  const state = { state: "collecting", check_in: "2026-11-25", check_out: "2026-11-28", adults: 2, children: 0, child_ages: [] };
  const understanding = validateBookingUnderstanding({ intent: "correction", updates: [{ field: "check_out", value: "2026-11-29", evidence: "mover nuestra salida un día después" }], clarification: null }, message, state);
  const result = handleGlobalReservationTurn({ message, context: { whatsapp_mvp: state }, understanding });
  assert.equal(result.context.whatsapp_mvp.check_out, "2026-11-29");
  assert.match(result.reply, /mascotas/);
});

test('cantidad de habitaciones tiene límites y no hereda una selección de otra categoría',()=>{
  const message='Prefiero dos habitaciones dobles';
  const output=value=>({intent:'details',updates:[{field:'category_slug',value:'doble',evidence:message},{field:'room_quantity',value,evidence:message}],clarification:null});
  for(const invalid of [0,14,'2',true])assert.equal(validateBookingUnderstanding(output(invalid),message),null);
  assert.equal(validateBookingUnderstanding(output(2),message).fields.room_quantity,2);
  assert.equal(applyBookingUnderstanding({category_slug:'doble',room_quantity:2},{category_slug:'familiar'}).room_quantity,undefined);
  assert.equal(applyBookingUnderstanding({category_slug:'doble',room_quantity:2},{check_out:'2026-12-15'}).room_quantity,2);
});
