import { pool } from "../../config/db.js";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import {
  sendBookingConfirmedEmail,
  sendBookingPendingEmails,
  sendPaymentReportedEmail,
} from "../../services/email.service.js";
import {
  checkAvailabilityService,
  normalizeAvailabilityInput,
} from "../availability/availability.service.js";

export { checkAvailabilityService };

function normalizeBookingData(bookingData) {
  const customerData = bookingData.customer || {
    full_name: bookingData.full_name,
    phone: bookingData.phone,
    email: bookingData.email,
    document_type: bookingData.document_type || "DNI",
    document_number: bookingData.document_number,
  };

  const categorySlug =
    String(bookingData.category_slug || "").trim().toLowerCase() || null;

  const stay = normalizeAvailabilityInput({
    room_id: bookingData.room_id,
    check_in: bookingData.check_in,
    check_out: bookingData.check_out,
    nights: bookingData.nights,
    check_in_time: bookingData.check_in_time,
    guests_count: bookingData.guests_count || 1,
  });

  return {
    room_id: stay.room_id,
    category_slug: categorySlug,
    check_in: stay.check_in,
    check_out: stay.check_out,
    check_in_time: stay.check_in_time,
    guests_count: stay.guests_count,
    nights: stay.nights,
    special_requests: bookingData.special_requests || null,
    customer: customerData,
  };
}

async function getRoomForBooking(roomId, db = pool) {
  const query = `
    SELECT
      r.id,
      r.name,
      r.room_number,
      r.capacity,
      r.price_per_night,
      r.status,
      r.category_slug,
      rc.name AS category_name,
      rc.capacity AS category_capacity,
      rc.price_per_night AS category_price_per_night,
      rc.is_active AS category_is_active
    FROM rooms r
    LEFT JOIN room_categories rc
      ON rc.slug = r.category_slug
    WHERE r.id = $1;
  `;

  const result = await db.query(query, [roomId]);

  return result.rows[0];
}

async function findCustomerByPhoneOrEmail(phone, email, db = pool) {
  const query = `
    SELECT *
    FROM customers
    WHERE phone = $1
       OR ($2::text IS NOT NULL AND email = $2)
    LIMIT 1;
  `;

  const result = await db.query(query, [phone, email || null]);

  return result.rows[0];
}

async function createCustomer(customerData, db = pool) {
  const { full_name, phone, email, document_type, document_number } =
    customerData;

  const query = `
    INSERT INTO customers (
      full_name,
      phone,
      email,
      document_type,
      document_number
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    full_name,
    phone,
    email || null,
    document_type || null,
    document_number || null,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}

async function updateCustomer(customerId, customerData, db = pool) {
  const {
    full_name,
    phone,
    email,
    document_type,
    document_number,
  } = customerData;

  const result = await db.query(
    `
    UPDATE customers
    SET
      full_name = $1,
      phone = $2,
      email = $3,
      document_type = $4,
      document_number = $5,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *;
    `,
    [
      full_name,
      phone,
      email || null,
      document_type || null,
      document_number || null,
      customerId,
    ]
  );

  return result.rows[0];
}

async function getBookingDetailsById(id, db = pool) {
  const result = await db.query(
    `
    SELECT
      b.*,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      r.name AS room_name,
      r.name AS assigned_room_name,
      r.room_number AS assigned_room_number,
      COALESCE(b.category_slug, r.category_slug) AS category_slug,
      rc.name AS category_name,
      COALESCE(b.unit_price, rc.price_per_night, r.price_per_night) AS price_per_night,
      b.unit_price,
      p.payment_provider,
      p.status AS payment_status,
      p.payment_url,
      p.reported_at,
      p.paid_at
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    JOIN rooms r ON r.id = b.room_id
    LEFT JOIN room_categories rc
      ON rc.slug = COALESCE(b.category_slug, r.category_slug)
    LEFT JOIN LATERAL (
      SELECT payment.*
      FROM payments payment
      WHERE payment.booking_id = b.id
      ORDER BY payment.created_at DESC, payment.id DESC
      LIMIT 1
    ) p ON TRUE
    WHERE b.id = $1
    LIMIT 1;
    `,
    [id]
  );

  return result.rows[0];
}

function toPublicPaymentStatus(details) {
  if (!details) return null;

  return {
    id: details.id,
    booking_code: details.booking_code,
    status: details.status,
    payment_status: details.payment_status,
    payment_url: details.payment_url || env.culqiPaymentUrl,
    payment_reported_at: details.payment_reported_at,
    payment_confirmed_at: details.payment_confirmed_at,
    total_amount: details.total_amount,
    category_slug: details.category_slug || null,
    category_name: inferCategoryName(details),
  };
}

function validateBookingRequest({ customer, room, guests_count, nights }) {
  if (!customer?.full_name || !customer?.phone) {
    const error = new Error("Nombre completo y celular son obligatorios.");
    error.statusCode = 400;
    throw error;
  }

  if (!customer.email) {
    const error = new Error(
      "El correo es obligatorio para enviarte el estado de la reserva."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!room || room.status !== "active") {
    const error = new Error(
      "No hay una unidad activa disponible para la categoría seleccionada."
    );
    error.statusCode = room ? 400 : 404;
    throw error;
  }

  if (room.category_is_active === false) {
    const error = new Error("La categoría seleccionada no está activa.");
    error.statusCode = 400;
    throw error;
  }

  const capacity = Number(room.category_capacity || room.capacity || 0);

  if (Number(guests_count) > capacity) {
    const error = new Error(
      "La categoría seleccionada no admite esa cantidad de huéspedes."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!nights || Number(nights) <= 0) {
    const error = new Error("La cantidad de noches debe ser mayor a cero.");
    error.statusCode = 400;
    throw error;
  }
}

function completedBookingContext(details, bookingIntentId) {
  return {
    state: "booked",
    active: false,
    intent_id: bookingIntentId,
    booking: {
      id: details.id,
      booking_code: details.booking_code,
      status: details.status,
    },
  };
}

async function findBookingByIntent(bookingIntentId, db = pool) {
  if (!bookingIntentId) return null;

  const result = await db.query(
    `
    SELECT id
    FROM bookings
    WHERE booking_intent_id = $1::uuid
    LIMIT 1;
    `,
    [bookingIntentId]
  );

  if (!result.rows[0]) return null;
  return getBookingDetailsById(result.rows[0].id, db);
}

function inferCategoryName(details) {
  if (details?.category_name) return String(details.category_name);

  const roomName = String(
    details?.assigned_room_name || details?.room_name || ""
  ).toLowerCase();
  if (roomName.includes("matrimonial")) return "Matrimonial";
  if (roomName.includes("doble")) return "Doble";
  if (roomName.includes("triple")) return "Triple";
  if (roomName.includes("familiar")) return "Familiar";
  return null;
}

function bookingResult(details, { recovered = false } = {}) {
  const categoryName = inferCategoryName(details);
  const publicCategory = {
    slug: details.category_slug || null,
    name: categoryName,
    price_per_night: details.price_per_night,
  };

  // La respuesta pública nunca expone la habitación física asignada.
  // room_id, room_number y assigned_room_* son exclusivamente operativos.
  const publicBooking = {
    id: details.id,
    booking_code: details.booking_code,
    check_in: details.check_in,
    check_out: details.check_out,
    check_in_time: details.check_in_time,
    guests_count: details.guests_count,
    nights: details.nights,
    total_amount: details.total_amount,
    status: details.status,
    source: details.source,
    special_requests: details.special_requests,
    category_slug: details.category_slug || null,
    category_name: categoryName,
    unit_price: details.unit_price ?? details.price_per_night,
    created_at: details.created_at,
    payment_status: details.payment_status,
  };

  return {
    mode: "booking",
    booking: publicBooking,
    customer: {
      full_name: details.customer_name,
      phone: details.customer_phone,
      email: details.customer_email,
    },
    category: publicCategory,
    // Alias transitorio para clientes desplegados antes de la migración. Solo
    // contiene datos comerciales de categoría, nunca la unidad física.
    room: {
      name: categoryName ? `Habitación ${categoryName}` : "Habitación",
      category: categoryName,
      category_slug: details.category_slug || null,
      price_per_night: details.price_per_night,
    },
    public_token: details.public_token,
    payment_url: env.culqiPaymentUrl,
    recovered,
  };
}

export async function getBookingByIntentService(bookingIntentId) {
  const details = await findBookingByIntent(bookingIntentId);
  return details ? bookingResult(details, { recovered: true }) : null;
}

async function lockAndValidateRoom({
  client,
  roomId,
  categorySlug,
  normalized,
  availabilityChecker,
}) {
  await client.query(
    "SELECT pg_advisory_xact_lock(481516, $1::integer);",
    [Number(roomId)]
  );

  const room = await getRoomForBooking(roomId, client);
  validateBookingRequest({
    customer: normalized.customer,
    room,
    guests_count: normalized.guests_count,
    nights: normalized.nights,
  });

  if (
    categorySlug &&
    String(room.category_slug || "").trim().toLowerCase() !== categorySlug
  ) {
    const error = new Error(
      "La unidad asignada ya no pertenece a la categoría seleccionada."
    );
    error.statusCode = 409;
    throw error;
  }

  const availability = await availabilityChecker(
    {
      room_id: roomId,
      check_in: normalized.check_in,
      check_out: normalized.check_out,
      nights: normalized.nights,
      check_in_time: normalized.check_in_time,
      guests_count: normalized.guests_count,
    },
    client
  );

  return availability.available ? room : null;
}

async function selectSpecificRoom({
  client,
  normalized,
  availabilityChecker,
}) {
  if (!normalized.room_id) {
    const error = new Error("La habitación interna es obligatoria.");
    error.statusCode = 400;
    throw error;
  }

  const room = await lockAndValidateRoom({
    client,
    roomId: normalized.room_id,
    categorySlug: normalized.category_slug,
    normalized,
    availabilityChecker,
  });

  if (!room) {
    const error = new Error(
      "La habitación tiene una reserva o bloqueo que cruza esas fechas."
    );
    error.statusCode = 409;
    throw error;
  }

  return room;
}

async function selectRoomByCategory({
  client,
  normalized,
  availabilityChecker,
}) {
  await client.query(
    "SELECT pg_advisory_xact_lock(481515, hashtext($1));",
    [normalized.category_slug]
  );

  const categoryResult = await client.query(
    `
    SELECT slug, name, capacity, price_per_night, is_active
    FROM room_categories
    WHERE slug = $1
      AND is_active = TRUE
    LIMIT 1;
    `,
    [normalized.category_slug]
  );
  const category = categoryResult.rows[0];

  if (!category) {
    const error = new Error("La categoría seleccionada no es válida.");
    error.statusCode = 400;
    throw error;
  }

  if (Number(normalized.guests_count) > Number(category.capacity)) {
    const error = new Error(
      "La categoría seleccionada no admite esa cantidad de huéspedes."
    );
    error.statusCode = 400;
    throw error;
  }

  const candidateResult = await client.query(
    `
    SELECT id
    FROM rooms
    WHERE category_slug = $1
      AND status = 'active'
    ORDER BY COALESCE(display_order, 9999), id;
    `,
    [normalized.category_slug]
  );

  for (const candidate of candidateResult.rows) {
    const room = await lockAndValidateRoom({
      client,
      roomId: candidate.id,
      categorySlug: normalized.category_slug,
      normalized,
      availabilityChecker,
    });

    if (room) return room;
  }

  const error = new Error(
    "Ya no quedan habitaciones disponibles en esta categoría para las fechas seleccionadas."
  );
  error.statusCode = 409;
  throw error;
}

async function createBookingTransaction(
  bookingData,
  options,
  dependencies,
  roomSelector
) {
  const normalized = normalizeBookingData(bookingData);
  const bookingIntentId = options.bookingIntentId || null;
  const conversation = options.conversation || null;
  const databasePool = dependencies.pool || pool;
  const pendingEmailSender =
    dependencies.sendBookingPendingEmails || sendBookingPendingEmails;
  const availabilityChecker =
    dependencies.checkAvailabilityService || checkAvailabilityService;
  const client = await databasePool.connect();
  let details;
  let created = false;

  try {
    await client.query("BEGIN");

    if (bookingIntentId) {
      await client.query(
        "SELECT pg_advisory_xact_lock(481517, hashtext($1));",
        [bookingIntentId]
      );

      const existing = await findBookingByIntent(bookingIntentId, client);
      if (existing) {
        await client.query("COMMIT");
        return bookingResult(existing, { recovered: true });
      }
    }

    const room = await roomSelector({
      client,
      normalized,
      availabilityChecker,
    });

    const effectiveCategorySlug =
      normalized.category_slug ||
      String(room.category_slug || "").trim().toLowerCase();

    let existingCustomer = await findCustomerByPhoneOrEmail(
      normalized.customer.phone,
      normalized.customer.email,
      client
    );

    existingCustomer = existingCustomer
      ? await updateCustomer(existingCustomer.id, normalized.customer, client)
      : await createCustomer(normalized.customer, client);

    const unitPrice = Number(
      room.category_price_per_night || room.price_per_night || 0
    );
    const totalAmount = unitPrice * Number(normalized.nights);

    if (totalAmount <= 0) {
      const error = new Error(
        "La categoría todavía no tiene un precio configurado. Comunícate con el hospedaje."
      );
      error.statusCode = 400;
      throw error;
    }

    const insertResult = await client.query(
      `
      INSERT INTO bookings (
        customer_id, room_id, category_slug, unit_price,
        check_in, check_out, check_in_time,
        guests_count, nights, total_amount, status, source,
        special_requests, public_token, booking_intent_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        'pending_payment', $11, $12, $13, $14::uuid
      )
      RETURNING *;
      `,
      [
        existingCustomer.id,
        room.id,
        effectiveCategorySlug || null,
        unitPrice,
        normalized.check_in,
        normalized.check_out,
        normalized.check_in_time,
        normalized.guests_count,
        normalized.nights,
        totalAmount,
        options.source || conversation?.channel || bookingData.source || "web",
        normalized.special_requests,
        randomUUID(),
        bookingIntentId,
      ]
    );

    const insertedBooking = insertResult.rows[0];
    const bookingCode = `CHP-${String(insertedBooking.id).padStart(5, "0")}`;

    await client.query(
      `UPDATE bookings
       SET booking_code = $1
       WHERE id = $2
       RETURNING *;`,
      [bookingCode, insertedBooking.id]
    );

    await client.query(
      `
      INSERT INTO payments (
        booking_id, payment_provider, amount, currency, status, payment_url
      )
      VALUES ($1, 'culqi_link', $2, 'PEN', 'pending', $3);
      `,
      [insertedBooking.id, totalAmount, env.culqiPaymentUrl]
    );

    details = await getBookingDetailsById(insertedBooking.id, client);

    if (bookingIntentId && conversation?.channel && conversation?.externalUserId) {
      await client.query(
        `
        INSERT INTO ai_conversations (
          channel, external_user_id, last_response_id, booking_context,
          booking_context_expires_at, updated_at
        )
        VALUES ($1, $2, NULL, $3::jsonb, CURRENT_TIMESTAMP + INTERVAL '24 hours', CURRENT_TIMESTAMP)
        ON CONFLICT (channel, external_user_id)
        DO UPDATE SET
          booking_context = EXCLUDED.booking_context,
          booking_context_expires_at = EXCLUDED.booking_context_expires_at,
          updated_at = CURRENT_TIMESTAMP;
        `,
        [
          conversation.channel,
          conversation.externalUserId,
          JSON.stringify(completedBookingContext(details, bookingIntentId)),
        ]
      );
    }

    await client.query("COMMIT");
    created = true;
  } catch (error) {
    await client.query("ROLLBACK");
    if (
      bookingIntentId &&
      error.code === "23505" &&
      error.constraint === "bookings_booking_intent_id_key"
    ) {
      const existing = await findBookingByIntent(bookingIntentId, client);
      if (existing) return bookingResult(existing, { recovered: true });
    }
    throw error;
  } finally {
    client.release();
  }

  if (created) {
    void pendingEmailSender(details).catch((emailError) => {
      console.error(
        "La reserva fue creada, pero no se pudo enviar su correo:",
        emailError.message
      );
    });
  }

  return bookingResult(details);
}

export async function createBookingService(
  bookingData,
  options = {},
  dependencies = {}
) {
  return createBookingTransaction(
    bookingData,
    options,
    dependencies,
    selectSpecificRoom
  );
}

export async function createBookingByCategoryService(
  bookingData,
  options = {},
  dependencies = {}
) {
  const categorySlug = String(bookingData.category_slug || "")
    .trim()
    .toLowerCase();
  const allowedCategories = new Set([
    "matrimonial",
    "doble",
    "triple",
    "familiar",
  ]);

  if (!allowedCategories.has(categorySlug)) {
    const error = new Error("La categoría seleccionada no es válida.");
    error.statusCode = 400;
    throw error;
  }

  return createBookingTransaction(
    {
      ...bookingData,
      category_slug: categorySlug,
      room_id: undefined,
    },
    options,
    dependencies,
    selectRoomByCategory
  );
}

export async function getBookingPaymentStatusService(id, publicToken) {
  const result = await pool.query(
    `
    SELECT id
    FROM bookings
    WHERE id = $1
      AND public_token = $2
    LIMIT 1;
    `,
    [id, publicToken]
  );

  if (!result.rows[0]) return null;

  const details = await getBookingDetailsById(id);
  return toPublicPaymentStatus(details);
}

async function reportBookingPayment({ id, publicToken, bookingIntentId }, dependencies = {}) {
  const databasePool = dependencies.pool || pool;
  const reportedEmailSender =
    dependencies.sendPaymentReportedEmail || sendPaymentReportedEmail;
  const client = await databasePool.connect();
  let shouldNotifyHotel = false;
  let bookingId = id || null;

  try {
    await client.query("BEGIN");

    const currentResult = bookingIntentId
      ? await client.query(
          `SELECT * FROM bookings
           WHERE booking_intent_id = $1::uuid
           FOR UPDATE;`,
          [bookingIntentId]
        )
      : await client.query(
          `SELECT * FROM bookings
           WHERE id = $1 AND public_token = $2
           FOR UPDATE;`,
          [id, publicToken]
        );

    const currentBooking = currentResult.rows[0];

    if (!currentBooking) {
      const error = new Error("No se encontró la reserva.");
      error.statusCode = 404;
      throw error;
    }

    bookingId = currentBooking.id;

    if (
      ["rejected", "cancelled", "expired", "completed"].includes(
        currentBooking.status
      )
    ) {
      const error = new Error(
        "Esta reserva ya no puede registrar un reporte de pago."
      );
      error.statusCode = 409;
      throw error;
    }

    if (currentBooking.status === "pending_payment") {
      await client.query(
        `
        UPDATE bookings
        SET
          status = 'payment_reported',
          payment_reported_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1;
        `,
        [bookingId]
      );

      await client.query(
        `
        UPDATE payments
        SET
          status = 'reported',
          reported_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id
          FROM payments
          WHERE booking_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        );
        `,
        [bookingId]
      );

      shouldNotifyHotel = true;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const details = await getBookingDetailsById(bookingId, databasePool);

  if (shouldNotifyHotel) {
    void reportedEmailSender(details).catch((emailError) => {
      console.error(
        "El pago fue reportado, pero no se pudo enviar su correo:",
        emailError.message
      );
    });
  }

  return toPublicPaymentStatus(details);
}

export async function reportBookingPaymentService(
  id,
  publicToken,
  dependencies = {}
) {
  return reportBookingPayment({ id, publicToken }, dependencies);
}

export async function reportBookingPaymentByIntentService(
  bookingIntentId,
  dependencies = {}
) {
  return reportBookingPayment({ bookingIntentId }, dependencies);
}

export async function getAllBookingsService() {
  const query = `
    SELECT
      b.*,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      c.document_type,
      c.document_number,
      rc.name AS category_name,
      COALESCE(b.category_slug, r.category_slug) AS category_slug,
      r.name AS assigned_room_name,
      r.room_number AS assigned_room_number,
      r.name AS room_name,
      COALESCE(b.unit_price, rc.price_per_night, r.price_per_night) AS price_per_night,
      b.unit_price,
      p.payment_provider,
      p.status AS payment_status,
      p.payment_url,
      p.reported_at,
      p.paid_at
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    JOIN rooms r ON r.id = b.room_id
    LEFT JOIN room_categories rc
      ON rc.slug = COALESCE(b.category_slug, r.category_slug)
    LEFT JOIN LATERAL (
      SELECT payment.*
      FROM payments payment
      WHERE payment.booking_id = b.id
      ORDER BY payment.created_at DESC, payment.id DESC
      LIMIT 1
    ) p ON TRUE
    ORDER BY b.created_at DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

export async function updateBookingStatusService(
  id,
  status,
  dependencies = {}
) {
  const allowedStatuses = [
    "pending",
    "pending_payment",
    "payment_reported",
    "confirmed",
    "rejected",
    "cancelled",
    "expired",
    "completed",
  ];

  if (!allowedStatuses.includes(status)) {
    const error = new Error("Estado de reserva no válido.");
    error.statusCode = 400;
    throw error;
  }

  const databasePool = dependencies.pool || pool;
  const confirmedEmailSender =
    dependencies.sendBookingConfirmedEmail || sendBookingConfirmedEmail;

  if (status === "confirmed") {
    const client = await databasePool.connect();
    let transitioned = false;
    let updatedDetails;

    try {
      await client.query("BEGIN");

      const currentDetails = await getBookingDetailsById(id, client);
      if (!currentDetails) {
        await client.query("ROLLBACK");
        return null;
      }

      if (currentDetails.status === "confirmed") {
        await client.query("COMMIT");
        return currentDetails;
      }

      if (
        currentDetails.payment_provider === "culqi_link" &&
        currentDetails.status !== "payment_reported"
      ) {
        const error = new Error(
          "El huésped todavía no reportó el pago. Verifica el flujo antes de confirmar."
        );
        error.statusCode = 409;
        throw error;
      }

      const expectedStatus = currentDetails.status;
      const transitionResult = await client.query(
        `
        UPDATE bookings
        SET
          status = 'confirmed',
          payment_confirmed_at = COALESCE(payment_confirmed_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1::integer
          AND status = $2::character varying
        RETURNING *;
        `,
        [Number(id), expectedStatus]
      );

      transitioned = transitionResult.rows.length === 1;

      if (!transitioned) {
        const latest = await getBookingDetailsById(id, client);
        if (latest?.status === "confirmed") {
          await client.query("COMMIT");
          return latest;
        }

        const error = new Error(
          "La reserva cambió de estado y no puede confirmarse con esta operación."
        );
        error.statusCode = 409;
        throw error;
      }

      await client.query(
        `
        UPDATE payments
        SET
          status = 'paid',
          paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id
          FROM payments
          WHERE booking_id = $1::integer
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        );
        `,
        [Number(id)]
      );

      updatedDetails = await getBookingDetailsById(id, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    if (transitioned && updatedDetails) {
      void confirmedEmailSender(updatedDetails).catch((emailError) => {
        console.error(
          "La reserva fue confirmada, pero no se pudo enviar su correo:",
          emailError.message
        );
      });
    }

    return updatedDetails;
  }

  const currentDetails = await getBookingDetailsById(id, databasePool);

  if (!currentDetails) {
    return null;
  }

  /*
   * $1 = nuevo estado
   * $2 = identificador de la reserva
   * $3 = indica si la reserva se está confirmando
   *
   * Se utiliza $3 para no volver a usar $1 dentro del CASE.
   * Así PostgreSQL no mezcla text con character varying.
   */
  const query = `
    UPDATE bookings
    SET
      status = $1::character varying,
      payment_confirmed_at = CASE
        WHEN $3::boolean THEN COALESCE(
          payment_confirmed_at,
          CURRENT_TIMESTAMP
        )
        ELSE payment_confirmed_at
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2::integer
    RETURNING *;
  `;

  const result = await databasePool.query(query, [
    status,
    Number(id),
    status === "confirmed",
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  // Si la reserva se rechaza o cancela, actualizamos el pago pendiente.
  if (["rejected", "cancelled", "expired"].includes(status)) {
    await databasePool.query(
      `
      UPDATE payments
      SET
        status = CASE
          WHEN status = 'paid' THEN status
          ELSE 'failed'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $1::integer;
      `,
      [Number(id)]
    );
  }

  const updatedDetails = await getBookingDetailsById(id, databasePool);

  return updatedDetails || result.rows[0];
}

export async function deleteBookingService(id) {
  const bookingId = Number(id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    const error = new Error("El identificador de la reserva no es válido.");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const bookingResult = await client.query(
      `
      SELECT id, booking_code, customer_id, room_id, status
      FROM bookings
      WHERE id = $1
      FOR UPDATE;
      `,
      [bookingId]
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");
      return null;
    }

    // Los pagos dependen de la reserva y deben eliminarse primero.
    await client.query(
      `
      DELETE FROM payments
      WHERE booking_id = $1;
      `,
      [bookingId]
    );

    const deleteResult = await client.query(
      `
      DELETE FROM bookings
      WHERE id = $1
      RETURNING id, booking_code, customer_id, room_id, status;
      `,
      [bookingId]
    );

    await client.query("COMMIT");

    return deleteResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
