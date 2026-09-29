import test from "node:test";
import assert from "node:assert/strict";
import { createBookingByCategoryService } from "../src/modules/bookings/booking.service.js";
import { searchAvailableRoomCategoriesService } from "../src/modules/rooms/roomCategory.service.js";

const BLOCKING_STATUSES = new Set([
  "pending",
  "pending_payment",
  "payment_reported",
  "confirmed",
]);

function clone(value) {
  return structuredClone(value);
}

function overlaps(checkIn, checkOut, booking) {
  return booking.check_in < checkOut && booking.check_out > checkIn;
}

function roomIsAvailable(state, room, checkIn, checkOut, checkInTime = null) {
  if (room.status !== "active") return false;

  const blocked = state.blockedSlots.some(
    (slot) =>
      (slot.room_id === null || Number(slot.room_id) === Number(room.id)) &&
      ((slot.block_type === "day" &&
        slot.blocked_date >= checkIn &&
        slot.blocked_date < checkOut) ||
        (slot.block_type === "time" &&
          checkInTime &&
          slot.blocked_date === checkIn &&
          slot.blocked_time === checkInTime))
  );

  if (blocked) return false;

  return !state.bookings.some(
    (booking) =>
      Number(booking.room_id) === Number(room.id) &&
      BLOCKING_STATUSES.has(booking.status) &&
      overlaps(checkIn, checkOut, booking)
  );
}

function createInventoryDatabase() {
  let state = {
    categories: [
      {
        id: 1,
        slug: "matrimonial",
        name: "Matrimonial",
        capacity: 2,
        price_per_night: 155,
        bed_description: "1 cama de 2 plazas",
        description: "Categoría matrimonial",
        image_url: "https://example.com/matrimonial.jpg",
        display_order: 1,
        is_active: true,
      },
    ],
    rooms: Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      name: `Habitación Matrimonial #10${index + 1}`,
      room_number: `10${index + 1}`,
      category_slug: "matrimonial",
      capacity: 2,
      price_per_night: 999,
      status: "active",
      display_order: index + 1,
      category_name: "Matrimonial",
      category_capacity: 2,
      category_price_per_night: 155,
      category_is_active: true,
    })),
    blockedSlots: [],
    customers: [],
    bookings: [],
    payments: [],
    nextCustomerId: 1,
    nextBookingId: 1,
    nextPaymentId: 1,
  };
  let categoryTail = Promise.resolve();

  function bookingDetails(source, bookingId) {
    const booking = source.bookings.find(
      (item) => item.id === Number(bookingId)
    );
    if (!booking) return null;
    const customer = source.customers.find(
      (item) => item.id === booking.customer_id
    );
    const room = source.rooms.find((item) => item.id === booking.room_id);
    const category = source.categories.find(
      (item) => item.slug === booking.category_slug
    );
    const payment = source.payments.find(
      (item) => item.booking_id === booking.id
    );

    return {
      ...booking,
      customer_name: customer?.full_name,
      customer_phone: customer?.phone,
      customer_email: customer?.email,
      room_name: room?.name,
      assigned_room_name: room?.name,
      assigned_room_number: room?.room_number,
      category_name: category?.name,
      price_per_night: booking.unit_price,
      payment_provider: payment?.payment_provider,
      payment_status: payment?.status,
      payment_url: payment?.payment_url,
    };
  }

  function categoryRows(source) {
    return source.categories
      .filter((category) => category.is_active)
      .map((category) => {
        const mapped = source.rooms.filter(
          (room) => room.category_slug === category.slug
        );
        return {
          ...category,
          total_quantity: mapped.length,
          mapped_quantity: mapped.length,
          active_quantity: mapped.filter((room) => room.status === "active")
            .length,
        };
      });
  }

  async function readQuery(source, sql, params = []) {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (normalized.startsWith("with requested_range as")) {
      const [checkIn, checkOut, guestsCount, checkInTime, roomId] = params;
      return {
        rows: source.rooms
          .filter(
            (room) =>
              (!guestsCount || room.capacity >= Number(guestsCount)) &&
              (!roomId || room.id === Number(roomId))
          )
          .map((room) => {
            const available = roomIsAvailable(
              source,
              room,
              checkIn,
              checkOut,
              checkInTime
            );
            return {
              ...room,
              availability_status: available ? "available" : "blocked",
              availability_reason: available
                ? "Habitación disponible."
                : "La habitación no está disponible.",
            };
          }),
      };
    }

    if (
      normalized.includes("from room_categories rc") &&
      normalized.includes("count(r.id)")
    ) {
      return { rows: categoryRows(source) };
    }

    if (
      normalized.startsWith("select slug, name, capacity") &&
      normalized.includes("from room_categories")
    ) {
      const category = source.categories.find(
        (item) => item.slug === params[0] && item.is_active
      );
      return { rows: category ? [{ ...category }] : [] };
    }

    if (
      normalized.startsWith("select id from rooms") &&
      normalized.includes("category_slug = $1")
    ) {
      return {
        rows: source.rooms
          .filter(
            (room) =>
              room.category_slug === params[0] && room.status === "active"
          )
          .sort((a, b) => a.display_order - b.display_order || a.id - b.id)
          .map((room) => ({ id: room.id })),
      };
    }

    if (
      normalized.includes("from rooms r") &&
      normalized.includes("where r.id = $1")
    ) {
      const room = source.rooms.find((item) => item.id === Number(params[0]));
      return { rows: room ? [{ ...room }] : [] };
    }

    if (
      normalized.includes("from customers") &&
      normalized.includes("where phone = $1")
    ) {
      const customer = source.customers.find(
        (item) =>
          item.phone === params[0] ||
          (params[1] && item.email === params[1])
      );
      return { rows: customer ? [{ ...customer }] : [] };
    }

    if (
      normalized.includes("from bookings b") &&
      normalized.includes("join customers")
    ) {
      const details = bookingDetails(source, params[0]);
      return { rows: details ? [details] : [] };
    }

    throw new Error(`SQL de lectura no simulado: ${normalized}`);
  }

  const database = {
    snapshot: () => clone(state),
    setRoomStatus(roomId, status) {
      state.rooms.find((room) => room.id === roomId).status = status;
    },
    addBlockedSlot(slot) {
      state.blockedSlots.push({ ...slot });
    },
    setBookingStatus(bookingId, status) {
      state.bookings.find((booking) => booking.id === bookingId).status = status;
    },
    query(sql, params = []) {
      return readQuery(state, sql, params);
    },
    async connect() {
      let working = null;
      let releaseCategory = null;

      const client = {
        getInventoryState: () => working || state,
        async query(sql, params = []) {
          const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

          if (normalized === "begin") return { rows: [] };
          if (normalized.includes("pg_advisory_xact_lock(481515")) {
            const previous = categoryTail;
            categoryTail = new Promise((resolve) => {
              releaseCategory = resolve;
            });
            await previous;
            working = clone(state);
            return { rows: [] };
          }
          if (normalized.includes("pg_advisory_xact_lock(481516")) {
            working ||= clone(state);
            return { rows: [] };
          }
          if (normalized.includes("pg_advisory_xact_lock(481517")) {
            working ||= clone(state);
            return { rows: [] };
          }
          if (normalized === "commit") {
            if (working) state = working;
            releaseCategory?.();
            return { rows: [] };
          }
          if (normalized === "rollback") {
            releaseCategory?.();
            return { rows: [] };
          }

          const source = working || state;
          if (normalized.startsWith("select id from bookings where booking_intent_id")) {
            const booking = source.bookings.find(
              (item) => item.booking_intent_id === params[0]
            );
            return { rows: booking ? [{ id: booking.id }] : [] };
          }
          if (normalized.startsWith("insert into customers")) {
            const customer = {
              id: source.nextCustomerId++,
              full_name: params[0],
              phone: params[1],
              email: params[2],
              document_type: params[3],
              document_number: params[4],
            };
            source.customers.push(customer);
            return { rows: [{ ...customer }] };
          }
          if (normalized.startsWith("update customers")) {
            const customer = source.customers.find(
              (item) => item.id === Number(params[5])
            );
            Object.assign(customer, {
              full_name: params[0],
              phone: params[1],
              email: params[2],
              document_type: params[3],
              document_number: params[4],
            });
            return { rows: [{ ...customer }] };
          }
          if (normalized.startsWith("insert into bookings")) {
            const booking = {
              id: source.nextBookingId++,
              customer_id: params[0],
              room_id: Number(params[1]),
              category_slug: params[2],
              unit_price: Number(params[3]),
              check_in: params[4],
              check_out: params[5],
              check_in_time: params[6],
              guests_count: Number(params[7]),
              nights: Number(params[8]),
              total_amount: Number(params[9]),
              status: "pending_payment",
              source: params[10],
              special_requests: params[11],
              public_token: params[12],
              booking_intent_id: params[13],
            };
            source.bookings.push(booking);
            return { rows: [{ ...booking }] };
          }
          if (
            normalized.startsWith("update bookings") &&
            normalized.includes("set booking_code")
          ) {
            const booking = source.bookings.find(
              (item) => item.id === Number(params[1])
            );
            booking.booking_code = params[0];
            return { rows: [{ ...booking }] };
          }
          if (normalized.startsWith("insert into payments")) {
            source.payments.push({
              id: source.nextPaymentId++,
              booking_id: Number(params[0]),
              amount: Number(params[1]),
              payment_provider: "culqi_link",
              status: "pending",
              payment_url: params[2],
            });
            return { rows: [] };
          }

          return readQuery(source, sql, params);
        },
        release() {},
      };

      return client;
    },
  };

  return database;
}

function bookingInput(sequence, overrides = {}) {
  return {
    category_slug: "matrimonial",
    check_in: "2026-10-10",
    check_out: "2026-10-12",
    guests_count: 2,
    customer: {
      full_name: `Cliente Prueba ${sequence}`,
      phone: `90000000${sequence}`,
      email: `cliente${sequence}@example.com`,
    },
    ...overrides,
  };
}

function dependencies(database) {
  return {
    pool: database,
    checkAvailabilityService: async (input, client) => {
      const state = client.getInventoryState();
      const room = state.rooms.find(
        (item) => item.id === Number(input.room_id)
      );
      return {
        available: Boolean(
          room &&
            roomIsAvailable(
              state,
              room,
              input.check_in,
              input.check_out,
              input.check_in_time
            )
        ),
      };
    },
    sendBookingPendingEmails: async () => true,
  };
}

async function categoryAvailability(database, overrides = {}) {
  return searchAvailableRoomCategoriesService(
    {
      check_in: "2026-10-10",
      check_out: "2026-10-12",
      guests_count: 2,
      ...overrides,
    },
    database
  );
}

test("inventario 5/5 asigna unidades distintas, admite la quinta y rechaza la sexta", async () => {
  const database = createInventoryDatabase();
  const deps = dependencies(database);

  const first = await createBookingByCategoryService(
    bookingInput(1),
    {},
    deps
  );
  let availability = await categoryAvailability(database);

  assert.equal(availability.categories[0].total_quantity, 5);
  assert.equal(availability.categories[0].active_quantity, 5);
  assert.equal(availability.categories[0].available_quantity, 4);
  assert.equal(availability.categories[0].occupied_quantity, 1);
  assert.equal(first.booking.category_name, "Matrimonial");
  assert.doesNotMatch(
    JSON.stringify(first),
    /room_id|room_number|assigned_room/i
  );

  for (let sequence = 2; sequence <= 5; sequence += 1) {
    await createBookingByCategoryService(bookingInput(sequence), {}, deps);
  }

  const snapshot = database.snapshot();
  assert.equal(snapshot.bookings.length, 5);
  assert.equal(new Set(snapshot.bookings.map((item) => item.room_id)).size, 5);
  assert.ok(snapshot.bookings.every((item) => item.unit_price === 155));
  assert.ok(snapshot.bookings.every((item) => item.total_amount === 310));

  availability = await categoryAvailability(database);
  assert.equal(availability.categories[0].available_quantity, 0);
  await assert.rejects(
    createBookingByCategoryService(bookingInput(6), {}, deps),
    (error) => error.statusCode === 409
  );

  database.setBookingStatus(snapshot.bookings[0].id, "cancelled");
  availability = await categoryAvailability(database);
  assert.equal(availability.categories[0].available_quantity, 1);

  const otherDates = await categoryAvailability(database, {
    check_in: "2026-10-20",
    check_out: "2026-10-22",
  });
  assert.equal(otherDates.categories[0].available_quantity, 5);
});

test("dos solicitudes concurrentes reciben habitaciones internas distintas", async () => {
  const database = createInventoryDatabase();
  const deps = dependencies(database);

  await Promise.all([
    createBookingByCategoryService(bookingInput(1), {}, deps),
    createBookingByCategoryService(bookingInput(2), {}, deps),
  ]);

  const bookings = database.snapshot().bookings;
  assert.equal(bookings.length, 2);
  assert.notEqual(bookings[0].room_id, bookings[1].room_id);
});

test("mantenimiento, bloqueo global y capacidad reducen o impiden el stock", async () => {
  const database = createInventoryDatabase();

  database.setRoomStatus(1, "maintenance");
  let availability = await categoryAvailability(database);
  assert.equal(availability.categories[0].total_quantity, 5);
  assert.equal(availability.categories[0].active_quantity, 4);
  assert.equal(availability.categories[0].available_quantity, 4);

  database.addBlockedSlot({
    room_id: null,
    blocked_date: "2026-10-10",
    blocked_time: null,
    block_type: "day",
  });
  availability = await categoryAvailability(database);
  assert.equal(availability.categories[0].available_quantity, 0);
  assert.equal(availability.categories[0].occupied_quantity, 4);
  assert.equal(availability.categories[0].is_available, false);

  const capacityDatabase = createInventoryDatabase();
  await assert.rejects(
    createBookingByCategoryService(
      bookingInput(7, { guests_count: 3 }),
      {},
      dependencies(capacityDatabase)
    ),
    (error) => error.statusCode === 400 && /cantidad de huéspedes/.test(error.message)
  );
});
