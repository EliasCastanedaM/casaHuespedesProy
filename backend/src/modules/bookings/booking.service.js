import { pool } from "../../config/db.js";
import { calculateNights } from "../../utils/calculateNights.js";

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
      AND status IN ('pending', 'pending_payment', 'confirmed')
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

  // 1. Validar si hay personal disponible AHORA
  const settings = await getDefaultAvailabilitySettings();

  const scheduleValidation = validateAttentionSchedule(settings);

  if (!scheduleValidation.isAvailableSchedule) {
    const inquiry = await createInquiryFromBookingRequest({
      bookingData: {
        room_id,
        check_in,
        check_out,
        check_in_time,
        guests_count,
        nights,
        special_requests,
        customer,
      },
      checkOut: check_out,
      room,
      reason: scheduleValidation.reason,
    });

    return {
      mode: "inquiry",
      message:
        "Tu solicitud fue enviada como consulta porque en este momento no hay personal disponible para confirmar reservas. El hospedaje se comunicará contigo para revisar tu solicitud.",
      reason: scheduleValidation.reason,
      inquiry,
      room,
    };
  }

  // 2. Validar disponibilidad real de habitación
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

  // 3. Buscar o crear cliente
  let existingCustomer = await findCustomerByPhoneOrEmail(
    customer.phone,
    customer.email
  );

  if (!existingCustomer) {
    existingCustomer = await createCustomer(customer);
  }

  // 4. Calcular monto total
  const totalAmount = Number(room.price_per_night || 0) * Number(nights || 1);

  // 5. Insertar reserva
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
      special_requests
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment', 'web', $9)
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
  ];

  const result = await pool.query(query, values);

  return {
    mode: "booking",
    booking: result.rows[0],
    customer: existingCustomer,
    room,
  };
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

  const query = `
    UPDATE bookings
    SET
      status = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;

  const result = await pool.query(query, [status, id]);

  return result.rows[0];
}