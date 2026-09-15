import test from "node:test";
import assert from "node:assert/strict";
import {
  createBookingService,
  reportBookingPaymentService,
  updateBookingStatusService,
} from "../src/modules/bookings/booking.service.js";

const INTENT_ID = "22222222-2222-4222-8222-222222222222";
const bookingInput = {
  room_id: 14,
  check_in: "2026-10-10",
  check_out: "2026-10-12",
  guests_count: 2,
  customer: {
    full_name: "Ana Torres",
    phone: "987654321",
    email: "ana@example.com",
    document_type: "DNI",
    document_number: "12345678",
  },
};

function cloneState(state) {
  return structuredClone(state);
}

function createBookingPool({ failPayment = false } = {}) {
  let state = {
    rooms: [{ id: 14, name: "Habitación 407", capacity: 3, price_per_night: 218.91, status: "active" }],
    customers: [],
    bookings: [],
    payments: [],
    contexts: [],
    nextCustomerId: 1,
    nextBookingId: 1,
    nextPaymentId: 1,
  };
  let intentTail = Promise.resolve();

  function details(source, id) {
    const booking = source.bookings.find((item) => item.id === Number(id));
    if (!booking) return null;
    const customer = source.customers.find((item) => item.id === booking.customer_id);
    const room = source.rooms.find((item) => item.id === booking.room_id);
    const payment = source.payments.find((item) => item.booking_id === booking.id);
    return {
      ...booking,
      customer_name: customer?.full_name,
      customer_phone: customer?.phone,
      customer_email: customer?.email,
      room_name: room?.name,
      price_per_night: room?.price_per_night,
      payment_provider: payment?.payment_provider,
      payment_status: payment?.status,
      payment_url: payment?.payment_url,
    };
  }

  return {
    snapshot: () => cloneState(state),
    async connect() {
      let working;
      let releaseIntent;
      return {
        async query(sql, params = []) {
          const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
          if (normalized === "begin") return { rows: [] };
          if (normalized.includes("pg_advisory_xact_lock(481517")) {
            const previous = intentTail;
            intentTail = new Promise((resolve) => { releaseIntent = resolve; });
            await previous;
            working = cloneState(state);
            return { rows: [] };
          }
          if (normalized.includes("pg_advisory_xact_lock(481516")) {
            working ||= cloneState(state);
            return { rows: [] };
          }
          if (normalized === "commit") {
            if (working) state = working;
            releaseIntent?.();
            return { rows: [] };
          }
          if (normalized === "rollback") {
            releaseIntent?.();
            return { rows: [] };
          }

          const source = working || state;
          if (normalized.startsWith("select id from bookings where booking_intent_id")) {
            const booking = source.bookings.find((item) => item.booking_intent_id === params[0]);
            return { rows: booking ? [{ id: booking.id }] : [] };
          }
          if (normalized.includes("from bookings b") && normalized.includes("join customers")) {
            const row = details(source, params[0]);
            return { rows: row ? [row] : [] };
          }
          if (normalized.includes("from rooms") && normalized.includes("where id = $1")) {
            const room = source.rooms.find((item) => item.id === Number(params[0]));
            return { rows: room ? [{ ...room }] : [] };
          }
          if (normalized.includes("from customers") && normalized.includes("where phone = $1")) {
            const customer = source.customers.find(
              (item) => item.phone === params[0] || (params[1] && item.email === params[1])
            );
            return { rows: customer ? [{ ...customer }] : [] };
          }
          if (normalized.startsWith("insert into customers")) {
            const customer = {
              id: source.nextCustomerId++,
              full_name: params[0], phone: params[1], email: params[2],
              document_type: params[3], document_number: params[4],
            };
            source.customers.push(customer);
            return { rows: [{ ...customer }] };
          }
          if (normalized.startsWith("update customers")) {
            const customer = source.customers.find((item) => item.id === Number(params[5]));
            Object.assign(customer, {
              full_name: params[0], phone: params[1], email: params[2],
              document_type: params[3], document_number: params[4],
            });
            return { rows: [{ ...customer }] };
          }
          if (normalized.startsWith("insert into bookings")) {
            const booking = {
              id: source.nextBookingId++, customer_id: params[0], room_id: Number(params[1]),
              check_in: params[2], check_out: params[3], check_in_time: params[4],
              guests_count: Number(params[5]), nights: Number(params[6]),
              total_amount: Number(params[7]), status: "pending_payment", source: "web",
              special_requests: params[8], public_token: params[9], booking_intent_id: params[10],
            };
            source.bookings.push(booking);
            return { rows: [{ ...booking }] };
          }
          if (normalized.startsWith("update bookings") && normalized.includes("set booking_code")) {
            const booking = source.bookings.find((item) => item.id === Number(params[1]));
            booking.booking_code = params[0];
            return { rows: [{ ...booking }] };
          }
          if (normalized.startsWith("insert into payments")) {
            if (failPayment) throw new Error("fallo simulado al crear payment");
            source.payments.push({
              id: source.nextPaymentId++, booking_id: Number(params[0]), amount: Number(params[1]),
              payment_provider: "culqi_link", currency: "PEN", status: "pending", payment_url: params[2],
            });
            return { rows: [] };
          }
          if (normalized.startsWith("insert into ai_conversations")) {
            const parsed = JSON.parse(params[2]);
            source.contexts = source.contexts.filter(
              (item) => item.channel !== params[0] || item.external_user_id !== params[1]
            );
            source.contexts.push({ channel: params[0], external_user_id: params[1], booking_context: parsed });
            return { rows: [] };
          }
          throw new Error(`SQL no simulado: ${normalized}`);
        },
        release() {},
      };
    },
  };
}

function createDependencies(fakePool, emailCalls) {
  return {
    pool: fakePool,
    checkAvailabilityService: async () => ({ available: true }),
    sendBookingPendingEmails: async (details) => { emailCalls.push(details.id); },
  };
}

const options = {
  bookingIntentId: INTENT_ID,
  conversation: { channel: "web", externalUserId: "session-1" },
};

test("misma booking_intent_id secuencial crea un solo booking y un solo correo", async () => {
  const fakePool = createBookingPool();
  const emails = [];
  const dependencies = createDependencies(fakePool, emails);
  const first = await createBookingService(bookingInput, options, dependencies);
  const second = await createBookingService(bookingInput, options, dependencies);
  const snapshot = fakePool.snapshot();
  assert.equal(snapshot.bookings.length, 1);
  assert.equal(snapshot.payments.length, 1);
  assert.equal(emails.length, 1);
  assert.equal(second.recovered, true);
  assert.equal(second.booking.id, first.booking.id);
  assert.equal(snapshot.bookings[0].total_amount, 437.82);
  assert.deepEqual(Object.keys(snapshot.contexts[0].booking_context).sort(), [
    "active", "booking", "intent_id", "state",
  ]);
  assert.doesNotMatch(
    JSON.stringify(snapshot.contexts[0].booking_context),
    /Ana|ana@example|987654321|public_token|payment_url|culqi/i
  );
});

test("dos ejecuciones concurrentes de la misma intención crean un solo booking", async () => {
  const fakePool = createBookingPool();
  const emails = [];
  const dependencies = createDependencies(fakePool, emails);
  const results = await Promise.all([
    createBookingService(bookingInput, options, dependencies),
    createBookingService(bookingInput, options, dependencies),
  ]);
  assert.equal(fakePool.snapshot().bookings.length, 1);
  assert.equal(fakePool.snapshot().payments.length, 1);
  assert.equal(emails.length, 1);
  assert.equal(results[0].booking.id, results[1].booking.id);
  assert.equal(results.filter((item) => item.recovered).length, 1);
});

test("un fallo entre booking y payment revierte booking, cliente y contexto", async () => {
  const fakePool = createBookingPool({ failPayment: true });
  const emails = [];
  await assert.rejects(
    createBookingService(bookingInput, options, createDependencies(fakePool, emails)),
    /fallo simulado/
  );
  const snapshot = fakePool.snapshot();
  assert.equal(snapshot.bookings.length, 0);
  assert.equal(snapshot.customers.length, 0);
  assert.equal(snapshot.payments.length, 0);
  assert.equal(snapshot.contexts.length, 0);
  assert.equal(emails.length, 0);
});

test("un retry después de reinicio recupera el booking existente", async () => {
  const fakePool = createBookingPool();
  const emails = [];
  await createBookingService(bookingInput, options, createDependencies(fakePool, emails));
  const recovered = await createBookingService(
    bookingInput,
    options,
    createDependencies(fakePool, emails)
  );
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.booking.booking_intent_id, INTENT_ID);
  assert.equal(fakePool.snapshot().bookings.length, 1);
  assert.equal(emails.length, 1);
});

test("si falla el correo pendiente, el retry no crea booking ni correo adicionales", async () => {
  const fakePool = createBookingPool();
  let emailAttempts = 0;
  const dependencies = {
    pool: fakePool,
    checkAvailabilityService: async () => ({ available: true }),
    sendBookingPendingEmails: async () => {
      emailAttempts += 1;
      throw new Error("correo no disponible");
    },
  };
  await createBookingService(bookingInput, options, dependencies);
  await new Promise((resolve) => setImmediate(resolve));
  const recovered = await createBookingService(bookingInput, options, dependencies);
  assert.equal(recovered.recovered, true);
  assert.equal(fakePool.snapshot().bookings.length, 1);
  assert.equal(emailAttempts, 1);
});

function createConfirmationPool() {
  const booking = {
    id: 7,
    booking_code: "CHP-00007",
    customer_id: 1,
    room_id: 14,
    status: "payment_reported",
  };
  const payment = { booking_id: 7, payment_provider: "culqi_link", status: "reported" };
  const details = () => ({
    ...booking,
    customer_name: "Ana Torres",
    customer_phone: "987654321",
    customer_email: "ana@example.com",
    room_name: "Habitación 407",
    payment_provider: payment.payment_provider,
    payment_status: payment.status,
  });

  return {
    state: { booking, payment },
    async connect() {
      return {
        async query(sql, params = []) {
          const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
          if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
          if (normalized.includes("from bookings b") && normalized.includes("join customers")) {
            return { rows: Number(params[0]) === booking.id ? [details()] : [] };
          }
          if (normalized.startsWith("update bookings") && normalized.includes("status = 'confirmed'")) {
            if (booking.status !== params[1]) return { rows: [] };
            booking.status = "confirmed";
            booking.payment_confirmed_at = new Date().toISOString();
            return { rows: [{ ...booking }] };
          }
          if (normalized.startsWith("update payments")) {
            payment.status = "paid";
            return { rows: [] };
          }
          throw new Error(`SQL no simulado: ${normalized}`);
        },
        release() {},
      };
    },
  };
}

test("dos confirmaciones manuales concurrentes disparan un solo correo", async () => {
  const fakePool = createConfirmationPool();
  const emails = [];
  const dependencies = {
    pool: fakePool,
    sendBookingConfirmedEmail: async (details) => { emails.push(details.id); },
  };
  const results = await Promise.all([
    updateBookingStatusService(7, "confirmed", dependencies),
    updateBookingStatusService(7, "confirmed", dependencies),
  ]);
  assert.equal(fakePool.state.booking.status, "confirmed");
  assert.equal(fakePool.state.payment.status, "paid");
  assert.equal(emails.length, 1);
  assert.ok(results.every((item) => item.status === "confirmed"));
});

test("reportar ya pagué repetidamente conserva payment_reported y notifica una vez", async () => {
  const booking = {
    id: 9,
    booking_code: "CHP-00009",
    public_token: "33333333-3333-4333-8333-333333333333",
    status: "pending_payment",
    total_amount: 437.82,
  };
  const payment = { status: "pending", payment_provider: "culqi_link" };
  const details = () => ({
    ...booking,
    customer_name: "Ana Torres",
    room_name: "Habitación 407",
    payment_provider: payment.payment_provider,
    payment_status: payment.status,
  });
  const fakePool = {
    async query(sql) {
      const normalized = sql.replace(/\s+/g, " ").toLowerCase();
      if (normalized.includes("from bookings b")) return { rows: [details()] };
      throw new Error(`SQL no simulado: ${normalized}`);
    },
    async connect() {
      return {
        async query(sql, params = []) {
          const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
          if (["begin", "commit", "rollback"].includes(normalized)) return { rows: [] };
          if (normalized.startsWith("select * from bookings")) {
            const valid = Number(params[0]) === booking.id && params[1] === booking.public_token;
            return { rows: valid ? [{ ...booking }] : [] };
          }
          if (normalized.startsWith("update bookings")) {
            booking.status = "payment_reported";
            return { rows: [] };
          }
          if (normalized.startsWith("update payments")) {
            payment.status = "reported";
            return { rows: [] };
          }
          throw new Error(`SQL no simulado: ${normalized}`);
        },
        release() {},
      };
    },
  };
  const emails = [];
  const dependencies = {
    pool: fakePool,
    sendPaymentReportedEmail: async () => { emails.push("reported"); },
  };

  const first = await reportBookingPaymentService(
    booking.id,
    booking.public_token,
    dependencies
  );
  const second = await reportBookingPaymentService(
    booking.id,
    booking.public_token,
    dependencies
  );
  assert.equal(first.status, "payment_reported");
  assert.equal(second.status, "payment_reported");
  assert.equal(payment.status, "reported");
  assert.equal(emails.length, 1);
});
