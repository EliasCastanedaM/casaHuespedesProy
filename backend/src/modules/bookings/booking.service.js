import { pool } from "../../config/db.js";
import { calculateNights } from "../../utils/calculateNights.js";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import {
  sendBookingConfirmedEmail,
  sendBookingPendingEmails,
  sendPaymentReportedEmail,
} from "../../services/email.service.js";

function calculateCheckOutDate(checkIn, nights) {
  const date = new Date(`${checkIn}T00:00:00`);
  date.setDate(date.getDate() + Number(nights || 1));
  return date.toISOString().split("T")[0];
}

function normalizeBookingData(bookingData) {
  const customerData = bookingData.customer || {
    full_name: bookingData.full_name,
    phone: bookingData.phone,
    email: bookingData.email,
    document_type: bookingData.document_type || "DNI",
    document_number: bookingData.document_number,
  };

  const nights = bookingData.nights
    ? Number(bookingData.nights)
    : calculateNights(bookingData.check_in, bookingData.check_out);

  const checkOut = bookingData.check_out
    ? bookingData.check_out
    : calculateCheckOutDate(bookingData.check_in, nights);

  return {
    room_id: bookingData.room_id,
    check_in: bookingData.check_in,
    check_out: checkOut,
    check_in_time: bookingData.check_in_time || null,
    guests_count: bookingData.guests_count || 1,
    nights,
    special_requests: bookingData.special_requests || null,
    customer: customerData,
  };
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

async function getDefaultAvailabilitySettings() {
  const result = await pool.query(
    `
    SELECT *
    FROM availability_settings
    WHERE setting_name = 'default'
    LIMIT 1;
    `
  );

  return result.rows[0];
}

function validateAttentionSchedule(settings) {
  if (!settings || !settings.is_active) {
    return {
      isAvailableSchedule: false,
      reason: "El sistema de atención no se encuentra activo en este momento.",
    };
  }

  const nowInPeru = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Lima",
    })
  );

  const dayMap = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const dayKey = dayMap[nowInPeru.getDay()];

  if (!settings[dayKey]) {
    return {
      isAvailableSchedule: false,
      reason: "No hay atención disponible para confirmar reservas el día de hoy.",
    };
  }

  const currentTime =
    nowInPeru.getHours() * 60 + nowInPeru.getMinutes();

  const startTime = timeToMinutes(settings.start_time);
  const endTime = timeToMinutes(settings.end_time);

  if (currentTime < startTime || currentTime >= endTime) {
    return {
      isAvailableSchedule: false,
      reason: `En este momento no hay personal disponible para confirmar reservas. El horario de atención es de ${String(
        settings.start_time
      ).slice(0, 5)} a ${String(settings.end_time).slice(0, 5)}.`,
    };
  }

  return {
    isAvailableSchedule: true,
    reason: "Hay atención disponible para confirmar reservas.",
  };
}

async function createInquiryFromBookingRequest({
  bookingData,
  checkOut,
  room,
  reason,
}) {
  const customerName =
    bookingData.customer?.full_name || bookingData.full_name || "Cliente web";

  const phone = bookingData.customer?.phone || bookingData.phone;
  const email = bookingData.customer?.email || bookingData.email || null;

  const message = `
Solicitud recibida desde el formulario de reservas, pero fue enviada como consulta porque está fuera del horario de atención.

Motivo: ${reason}

Habitación solicitada: ${room?.name || "No especificada"}
Fecha de ingreso: ${bookingData.check_in}
Fecha de salida: ${checkOut}
Hora solicitada: ${bookingData.check_in_time || "No especificada"}
Noches: ${bookingData.nights || "No especificado"}
Huéspedes: ${bookingData.guests_count || "No especificado"}

Comentario del huésped:
${bookingData.special_requests || "Sin comentario adicional."}
  `.trim();

  const result = await pool.query(
    `
    INSERT INTO inquiries (
      customer_name,
      phone,
      email,
      subject,
      message,
      preferred_check_in,
      preferred_check_out,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *;
    `,
    [
      customerName,
      phone,
      email,
      "Solicitud de reserva fuera de horario",
      message,
      bookingData.check_in,
      checkOut,
    ]
  );

  return result.rows[0];
}

export async function checkRoomAvailabilityService(roomId, checkIn, checkOut) {
  const query = `
    SELECT id
    FROM bookings
    WHERE room_id = $1
      AND status IN (
        'pending',
        'pending_payment',
        'payment_reported',
        'confirmed'
      )
      AND check_in < $3
      AND check_out > $2
    LIMIT 1;
  `;

  const result = await pool.query(query, [roomId, checkIn, checkOut]);

  return result.rows.length === 0;
}

export async function checkAvailabilityService({
  room_id,
  check_in,
  check_out,
  nights,
  check_in_time,
}) {
  const finalCheckOut = check_out || calculateCheckOutDate(check_in, nights);

  // 1. Verificar si el admin bloqueó todo el día
  const blockedDayQuery = `
    SELECT id
    FROM blocked_slots
    WHERE room_id = $1
      AND blocked_date::date = $2::date
      AND block_type = 'day'
    LIMIT 1;
  `;

  const blockedDayResult = await pool.query(blockedDayQuery, [
    room_id,
    check_in,
  ]);

  if (blockedDayResult.rows.length > 0) {
    return {
      available: false,
      reason: "La habitación está bloqueada para la fecha seleccionada.",
      check_out: finalCheckOut,
    };
  }

  // 2. Verificar si el admin bloqueó una hora específica
  if (check_in_time) {
    const blockedTimeQuery = `
      SELECT id
      FROM blocked_slots
      WHERE room_id = $1
        AND blocked_date::date = $2::date
        AND blocked_time = $3
        AND block_type = 'time'
      LIMIT 1;
    `;

    const blockedTimeResult = await pool.query(blockedTimeQuery, [
      room_id,
      check_in,
      check_in_time,
    ]);

    if (blockedTimeResult.rows.length > 0) {
      return {
        available: false,
        reason: "La habitación está bloqueada para el horario seleccionado.",
        check_out: finalCheckOut,
      };
    }
  }

  // 3. Verificar cruce con reservas existentes
  const isAvailable = await checkRoomAvailabilityService(
    room_id,
    check_in,
    finalCheckOut
  );

  if (!isAvailable) {
    return {
      available: false,
      reason:
        "La habitación ya se encuentra ocupada o no disponible para la fecha seleccionada.",
      check_out: finalCheckOut,
    };
  }

  return {
    available: true,
    reason: "Habitación disponible.",
    check_out: finalCheckOut,
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
    SELECT *
    FROM vw_bookings_admin
    ORDER BY created_at DESC;
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