import test from "node:test";
import assert from "node:assert/strict";
import {
  handleDeterministicBookingFlow,
  mergeAvailabilityIntoBookingContext,
} from "../src/modules/ai/ai.booking-flow.js";
import { activeBookingContextFromRow } from "../src/modules/ai/ai.service.js";
import { buildHotelAssistantPrompt } from "../src/modules/ai/ai.prompt.js";

const PAYMENT_URL = "https://express.culqi.com/pago/prueba";
const INTENT_ID = "11111111-1111-4111-8111-111111111111";
const room407 = {
  id: 14,
  name: "Habitación 407",
  room_number: "407",
  capacity: 3,
  price_per_night: 218.91,
  status: "active",
};
const room205 = {
  id: 5,
  name: "Habitación 205",
  room_number: "205",
  capacity: 2,
  price_per_night: 151.53,
  status: "active",
};

function availabilityContext() {
  return mergeAvailabilityIntoBookingContext({}, {
    check_in: "2026-10-10",
    check_out: "2026-10-12",
    nights: 2,
    guests_count: 2,
    rooms: [room407],
  });
}

function bookingResult(input) {
  return {
    mode: "booking",
    booking: {
      id: 81,
      booking_code: "CHP-00081",
      status: "pending_payment",
      check_in: "2026-10-10",
      check_out: "2026-10-12",
      nights: 2,
      guests_count: 2,
      total_amount: 437.82,
    },
    customer: input.customer,
    room: room407,
    public_token: "token-transitorio-no-persistido",
    payment_url: "valor-ignorado-del-servicio",
  };
}

function successfulBookingServices(calls) {
  return {
    listRooms: async () => [room407, room205],
    searchAvailableRooms: async (input) => {
      calls.searches.push(input);
      return {
        ...input,
        check_out: input.check_out || "2026-10-12",
        nights: 2,
        rooms: [room205],
      };
    },
    checkAvailability: async (input) => {
      calls.availability.push(input);
      return { available: true, reason: "Habitación disponible." };
    },
    createBooking: async (input, options) => {
      calls.bookings.push({ input, options });
      return bookingResult(input);
    },
    getBooking: async (intentId) => {
      calls.recoveries.push(intentId);
      return bookingResult({ customer: {} });
    },
    reportPayment: async (intentId) => {
      calls.paymentReports.push(intentId);
      return { status: "payment_reported" };
    },
  };
}

function emptyCalls() {
  return {
    availability: [],
    bookings: [],
    paymentReports: [],
    recoveries: [],
    searches: [],
  };
}

function flow(input) {
  return handleDeterministicBookingFlow({
    paymentUrl: PAYMENT_URL,
    createIntentId: () => INTENT_ID,
    ...input,
  });
}

test("el asesor ofrece llamada y reserva directa después de disponibilidad", () => {
  const prompt = buildHotelAssistantPrompt();
  assert.match(prompt, /901551287/);
  assert.match(prompt, /reservar directamente en esta conversación/);
  assert.match(prompt, /no envíes un enlace de pago/);
  assert.match(prompt, /mascotas se aceptan únicamente bajo petición previa/i);
  assert.match(prompt, /S\/ 35/);
  assert.match(prompt, /No se permite ruido excesivo/i);
});

test("consultar disponibilidad no crea una reserva", async () => {
  const calls = emptyCalls();
  const result = await flow({
    message: "¿Tienen disponibilidad del 10/10/2026 al 12/10/2026?",
    context: {},
    services: successfulBookingServices(calls),
  });
  assert.equal(result.handled, false);
  assert.equal(calls.bookings.length, 0);
});

test("la intención incompleta pide los faltantes juntos y conserva la intención", async () => {
  const calls = emptyCalls();
  const result = await flow({
    message: "Quiero la 407",
    context: availabilityContext(),
    services: successfulBookingServices(calls),
  });
  assert.equal(result.handled, true);
  assert.match(result.reply, /nombre completo, correo, celular/);
  assert.doesNotMatch(result.reply, /fecha de ingreso/);
  assert.equal(result.context.intent_id, INTENT_ID);
  assert.equal(calls.bookings.length, 0);
});

test("reutiliza lo conocido, revalida y crea una sola pending_payment", async () => {
  const calls = emptyCalls();
  const services = successfulBookingServices(calls);
  const started = await flow({ message: "Quiero la 407", context: availabilityContext(), services });
  const completed = await flow({
    message: "Nombre: Ana Torres; correo: ana@example.com; celular: 987654321; DNI: 12345678; hora de ingreso: 15:30; solicitud especial: cuna",
    context: started.context,
    services,
  });
  assert.equal(calls.availability.length, 1);
  assert.equal(calls.bookings.length, 1);
  assert.equal(calls.bookings[0].input.room_id, 14);
  assert.equal(calls.bookings[0].input.check_in, "2026-10-10");
  assert.equal(calls.bookings[0].input.guests_count, 2);
  assert.equal(calls.bookings[0].options.bookingIntentId, INTENT_ID);
  assert.equal(completed.context.booking.status, "pending_payment");
  assert.match(completed.reply, /CHP-00081/);
  assert.match(completed.reply, /https:\/\/express\.culqi\.com\/pago\/prueba/);
});

test("una reserva creada limpia PII, public_token y payment_url del contexto", async () => {
  const calls = emptyCalls();
  const result = await flow({
    message: "Quiero la 407. Nombre: Ana Torres; correo: ana@example.com; celular: 987654321",
    context: availabilityContext(),
    services: successfulBookingServices(calls),
  });
  assert.deepEqual(Object.keys(result.context).sort(), ["active", "booking", "intent_id", "state"]);
  assert.deepEqual(Object.keys(result.context.booking).sort(), ["booking_code", "id", "status"]);
  const persisted = JSON.stringify(result.context);
  assert.doesNotMatch(persisted, /Ana|ana@example|987654321|public_token|payment_url|culqi/i);
  assert.match(result.reply, /https:\/\/express\.culqi\.com\/pago\/prueba/);
});

test("no entrega CULQI_PAYMENT_URL cuando la creación falla", async () => {
  const calls = emptyCalls();
  const services = successfulBookingServices(calls);
  services.createBooking = async () => { throw new Error("Fallo interno."); };
  const result = await flow({
    message: "Quiero la 407. Nombre: Ana Torres; correo: ana@example.com; celular: 987654321",
    context: availabilityContext(),
    services,
  });
  assert.doesNotMatch(result.reply, /express\.culqi\.com/);
  assert.match(result.reply, /No se generó ningún enlace de pago/);
});

test("ya pagué usa la intención durable, solo reporta y repetir es idempotente", async () => {
  const calls = emptyCalls();
  const services = successfulBookingServices(calls);
  const context = {
    state: "booked",
    intent_id: INTENT_ID,
    booking: { id: 81, booking_code: "CHP-00081", status: "pending_payment" },
  };
  const result = await flow({ message: "Listo, ya pagué", context, services });
  assert.deepEqual(calls.paymentReports, [INTENT_ID]);
  assert.match(result.reply, /verificará el pago/);
  assert.match(result.reply, /todavía no está confirmada/);
  assert.equal(result.context.booking.status, "payment_reported");
  await flow({ message: "Ya hice el pago", context: result.context, services });
  assert.equal(calls.paymentReports.length, 1);
});

test("si la habitación deja de estar disponible devuelve alternativas reales", async () => {
  const calls = emptyCalls();
  const services = successfulBookingServices(calls);
  services.checkAvailability = async (input) => {
    calls.availability.push(input);
    return { available: false, reason: "La habitación tiene una reserva." };
  };
  const result = await flow({
    message: "Quiero la 407. Nombre: Ana Torres; correo: ana@example.com; celular: 987654321",
    context: availabilityContext(),
    services,
  });
  assert.equal(calls.bookings.length, 0);
  assert.equal(calls.searches.length, 1);
  assert.match(result.reply, /Habitación 205/);
  assert.match(result.reply, /S\/ 151\.53/);
  assert.doesNotMatch(result.reply, /express\.culqi\.com/);
  assert.equal(result.context.available_rooms[0].room_number, "205");
});

test("un contexto vencido no reutiliza datos antiguos", () => {
  const old = {
    booking_context: { customer: { email: "antiguo@example.com" }, room: room407 },
    booking_context_expires_at: "2026-09-15T10:00:00.000Z",
  };
  assert.deepEqual(activeBookingContextFromRow(old, Date.parse("2026-09-15T10:00:01.000Z")), {});
  assert.deepEqual(
    activeBookingContextFromRow({ booking_context: old.booking_context }),
    {}
  );
});

test("nueva reserva limpia la intención y los datos anteriores", async () => {
  const calls = emptyCalls();
  const result = await flow({
    message: "Quiero hacer una nueva reserva",
    context: {
      state: "booked",
      intent_id: "00000000-0000-4000-8000-000000000000",
      booking: { id: 80, booking_code: "CHP-00080", status: "pending_payment" },
      customer: { email: "anterior@example.com" },
    },
    services: successfulBookingServices(calls),
  });
  assert.equal(result.context.intent_id, INTENT_ID);
  assert.equal(result.context.booking, undefined);
  assert.equal(result.context.customer?.email, undefined);
  assert.match(result.reply, /habitación, fecha de ingreso/);
});
