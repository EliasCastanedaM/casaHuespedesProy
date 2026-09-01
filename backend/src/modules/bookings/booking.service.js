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
    check_in: stay.check_in,
    check_out: stay.check_out,
    check_in_time: stay.check_in_time,
    guests_count: stay.guests_count,
    nights: stay.nights,
    special_requests: bookingData.special_requests || null,
    customer: customerData,
  };
}

async function getRoomForBooking(roomId) {
  const query = `
    SELECT id, name, capacity, price_per_night, status
    FROM rooms
    WHERE id = $1;
  `;

  const result = await pool.query(query, [roomId]);

  return result.rows[0];
}

async function findCustomerByPhoneOrEmail(phone, email) {
  const query = `
    SELECT *
    FROM customers
    WHERE phone = $1
       OR ($2::text IS NOT NULL AND email = $2)
    LIMIT 1;
  `;

  const result = await pool.query(query, [phone, email || null]);

  return result.rows[0];
}

async function createCustomer(customerData) {
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

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function updateCustomer(customerId, customerData) {
  const {
    full_name,
    phone,
    email,
    document_type,
    document_number,
  } = customerData;

  const result = await pool.query(
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

async function getBookingDetailsById(id) {
  const result = await pool.query(
    `
    SELECT
      b.*,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      r.name AS room_name,
      r.price_per_night,
      p.payment_provider,
      p.status AS payment_status,
      p.payment_url,
      p.reported_at,
      p.paid_at
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    JOIN rooms r ON r.id = b.room_id
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
  };
}

export async function createBookingService(bookingData) {
  const {
    room_id,
    check_in,
    check_out,
    check_in_time,
    guests_count,
    nights,
    special_requests,
    customer,
  } = normalizeBookingData(bookingData);

  if (!customer?.full_name || !customer?.phone) {
    const error = new Error("Nombre completo y celular son obligatorios.");
    error.statusCode = 400;
    throw error;
  }

  const room = await getRoomForBooking(room_id);

  if (!room) {
    const error = new Error(
      "La habitación seleccionada no está disponible para reservar."
    );
    error.statusCode = 404;
    throw error;
  }

  if (room.status !== "active") {
    const error = new Error(
      "La habitación seleccionada no está disponible para reservar."
    );
    error.statusCode = 400;
    throw error;
  }

  if (Number(guests_count) > Number(room.capacity)) {
    const error = new Error(
      "La habitación seleccionada no está disponible para esa cantidad de huéspedes."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!nights || Number(nights) <= 0) {
    const error = new Error("La cantidad de noches debe ser mayor a cero.");
    error.statusCode = 400;
    throw error;
  }

  if (!customer?.email) {
    const error = new Error(
      "El correo es obligatorio para enviarte el estado de la reserva."
    );
    error.statusCode = 400;
    throw error;
  }

  // Serializa la creación por habitación. Así dos solicitudes simultáneas
  // no pueden aprobar la misma disponibilidad antes de insertar la reserva.
  const bookingLockClient = await pool.connect();

  try {
    await bookingLockClient.query(
      "SELECT pg_advisory_lock(481516, $1::integer);",
      [Number(room_id)]
    );

  // 1. Validar disponibilidad real de habitación.
  // La reserva puede registrarse las 24 horas. Si no hay personal,
  // quedará pendiente hasta que el hospedaje revise el pago.
  const availability = await checkAvailabilityService({
    room_id,
    check_in,
    check_out,
    nights,
    check_in_time,
  });

  if (!availability.available) {
    const error = new Error(availability.reason);
    error.statusCode = 409;
    throw error;
  }

  // 2. Buscar o crear cliente
  let existingCustomer = await findCustomerByPhoneOrEmail(
    customer.phone,
    customer.email
  );

  if (!existingCustomer) {
    existingCustomer = await createCustomer(customer);
  } else {
    // Conserva el correo y los datos usados en esta reserva. Esto evita que
    // una ficha antigua reciba la confirmación destinada al huésped actual.
    existingCustomer = await updateCustomer(
      existingCustomer.id,
      customer
    );
  }

  // 3. Calcular monto total
  const totalAmount = Number(room.price_per_night || 0) * Number(nights || 1);

  if (totalAmount <= 0) {
    const error = new Error(
      "La habitación todavía no tiene un precio configurado. Comunícate con el hospedaje."
    );
    error.statusCode = 400;
    throw error;
  }

  // 4. Insertar reserva
  const publicToken = randomUUID();
  const query = `
    INSERT INTO bookings (
      customer_id,
      room_id,
      check_in,
      check_out,
      check_in_time,
      guests_count,
      nights,
      total_amount,
      status,
      source,
      special_requests,
      public_token
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      'pending_payment',
      'web',
      $9,
      $10
    )
    RETURNING *;
  `;

  const values = [
    existingCustomer.id,
    room_id,
    check_in,
    check_out,
    check_in_time,
    guests_count,
    nights,
    totalAmount,
    special_requests,
    publicToken,
  ];

  const result = await pool.query(query, values);
  const insertedBooking = result.rows[0];
  const bookingCode = `CHP-${String(insertedBooking.id).padStart(5, "0")}`;

  const bookingResult = await pool.query(
    `
    UPDATE bookings
    SET booking_code = $1
    WHERE id = $2
    RETURNING *;
    `,
    [bookingCode, insertedBooking.id]
  );

  await pool.query(
    `
    INSERT INTO payments (
      booking_id,
      payment_provider,
      amount,
      currency,
      status,
      payment_url
    )
    VALUES ($1, 'culqi_link', $2, 'PEN', 'pending', $3);
    `,
    [insertedBooking.id, totalAmount, env.culqiPaymentUrl]
  );

  const booking = bookingResult.rows[0];
  const details = await getBookingDetailsById(booking.id);

  // El correo se procesa en segundo plano. La reserva responde de inmediato
  // para que el huésped avance a la pantalla de pago sin esperar a Gmail.
  void sendBookingPendingEmails(details).catch((emailError) => {
    console.error(
      "La reserva fue creada, pero no se pudo enviar su correo:",
      emailError.message
    );
  });

  return {
    mode: "booking",
    booking,
    customer: existingCustomer,
    room,
    public_token: publicToken,
    payment_url: env.culqiPaymentUrl,
  };
  } finally {
    try {
      await bookingLockClient.query(
        "SELECT pg_advisory_unlock(481516, $1::integer);",
        [Number(room_id)]
      );
    } finally {
      bookingLockClient.release();
    }
  }
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

export async function reportBookingPaymentService(id, publicToken) {
  const client = await pool.connect();
  let shouldNotifyHotel = false;

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
      SELECT *
      FROM bookings
      WHERE id = $1
        AND public_token = $2
      FOR UPDATE;
      `,
      [id, publicToken]
    );

    const currentBooking = currentResult.rows[0];

    if (!currentBooking) {
      const error = new Error("No se encontró la reserva.");
      error.statusCode = 404;
      throw error;
    }

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
        [id]
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
        [id]
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

  const details = await getBookingDetailsById(id);

  if (shouldNotifyHotel) {
    void sendPaymentReportedEmail(details).catch((emailError) => {
      console.error(
        "El pago fue reportado, pero no se pudo enviar su correo:",
        emailError.message
      );
    });
  }

  return toPublicPaymentStatus(details);
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
      r.name AS room_name,
      r.price_per_night,
      p.payment_provider,
      p.status AS payment_status,
      p.payment_url,
      p.reported_at,
      p.paid_at
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    JOIN rooms r ON r.id = b.room_id
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

export async function updateBookingStatusService(id, status) {
  const allowedStatuses = [
    "pending",
    "pending_payment",
    "payment_reported",
    "confirmed",
    "rejected",
    "cancelled",
    "completed",
  ];

  if (!allowedStatuses.includes(status)) {
    const error = new Error("Estado de reserva no válido.");
    error.statusCode = 400;
    throw error;
  }

  const currentDetails = await getBookingDetailsById(id);

  if (!currentDetails) {
    return null;
  }

  if (
    status === "confirmed" &&
    currentDetails.payment_provider === "culqi_link" &&
    !["payment_reported", "confirmed"].includes(currentDetails.status)
  ) {
    const error = new Error(
      "El huésped todavía no reportó el pago. Verifica el flujo antes de confirmar."
    );

    error.statusCode = 409;
    throw error;
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

  const result = await pool.query(query, [
    status,
    Number(id),
    status === "confirmed",
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  // Cuando se confirma la reserva, registramos el pago como pagado.
  if (status === "confirmed") {
    await pool.query(
      `
      UPDATE payments
      SET
        status = 'paid',
        paid_at = COALESCE(
          paid_at,
          CURRENT_TIMESTAMP
        ),
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
  }

  // Si la reserva se rechaza o cancela, actualizamos el pago pendiente.
  if (["rejected", "cancelled"].includes(status)) {
    await pool.query(
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

  const updatedDetails = await getBookingDetailsById(id);

  /*
   * El correo se envía únicamente cuando la reserva pasa por primera vez
   * al estado confirmed.
   */
  if (
    status === "confirmed" &&
    currentDetails.status !== "confirmed" &&
    updatedDetails
  ) {
    void sendBookingConfirmedEmail(updatedDetails).catch(
      (emailError) => {
        console.error(
          "La reserva fue confirmada, pero no se pudo enviar su correo:",
          emailError.message
        );
      }
    );
  }

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
