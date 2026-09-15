import { pool } from "../../config/db.js";

const BLOCKING_BOOKING_STATUSES = [
  "pending",
  "pending_payment",
  "payment_reported",
  "confirmed",
];

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

export function normalizeAvailabilityInput(input = {}) {
  const checkIn = String(input.check_in || "").trim();
  const nights = input.nights === undefined ? null : Number(input.nights);

  if (!isIsoDate(checkIn)) {
    const error = new Error("La fecha de ingreso debe tener el formato AAAA-MM-DD.");
    error.statusCode = 400;
    throw error;
  }

  const checkOut = input.check_out
    ? String(input.check_out).trim()
    : nights
      ? addDays(checkIn, nights)
      : "";
  const guestsCount =
    input.guests_count === undefined || input.guests_count === null
      ? null
      : Number(input.guests_count);
  const roomId =
    input.room_id === undefined || input.room_id === null
      ? null
      : Number(input.room_id);
  const checkInTime = input.check_in_time
    ? String(input.check_in_time).slice(0, 5)
    : null;

  if (!isIsoDate(checkOut)) {
    const error = new Error("La fecha de salida debe tener el formato AAAA-MM-DD.");
    error.statusCode = 400;
    throw error;
  }

  if (checkOut <= checkIn) {
    const error = new Error(
      "La fecha de salida debe ser posterior a la fecha de ingreso."
    );
    error.statusCode = 400;
    throw error;
  }

  const calculatedNights = Math.round(
    (new Date(`${checkOut}T00:00:00Z`) -
      new Date(`${checkIn}T00:00:00Z`)) /
      86_400_000
  );

  if (calculatedNights < 1 || calculatedNights > 60) {
    const error = new Error("La estadía debe tener entre 1 y 60 noches.");
    error.statusCode = 400;
    throw error;
  }

  if (
    guestsCount !== null &&
    (!Number.isInteger(guestsCount) || guestsCount < 1 || guestsCount > 30)
  ) {
    const error = new Error("La cantidad de huéspedes debe estar entre 1 y 30.");
    error.statusCode = 400;
    throw error;
  }

  if (roomId !== null && (!Number.isInteger(roomId) || roomId < 1)) {
    const error = new Error("La habitación indicada no es válida.");
    error.statusCode = 400;
    throw error;
  }

  if (checkInTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime)) {
    const error = new Error("La hora debe tener el formato HH:MM.");
    error.statusCode = 400;
    throw error;
  }

  return {
    check_in: checkIn,
    check_out: checkOut,
    nights: calculatedNights,
    guests_count: guestsCount,
    room_id: roomId,
    check_in_time: checkInTime,
  };
}

export async function listRoomsForAvailabilityService(db = pool) {
  const result = await db.query(`
    SELECT
      id,
      name,
      description,
      capacity,
      price_per_night,
      status,
      main_image_url,
      room_number,
      floor_label,
      room_type,
      amenities,
      'idle' AS availability_status
    FROM rooms
    ORDER BY display_order ASC, id ASC;
  `);

  return result.rows;
}

export async function searchAvailableRoomsService(input = {}, db = pool) {
  const normalized = normalizeAvailabilityInput(input);

  const result = await db.query(
    `
    WITH requested_range AS (
      SELECT
        $1::date AS requested_check_in,
        $2::date AS requested_check_out
    )
    SELECT
      r.id,
      r.name,
      r.description,
      r.capacity,
      r.price_per_night,
      r.status,
      r.main_image_url,
      r.room_number,
      r.floor_label,
      r.room_type,
      r.amenities,
      CASE
        WHEN r.status <> 'active' THEN 'blocked'
        WHEN EXISTS (
          SELECT 1
          FROM blocked_slots bs, requested_range rr
          WHERE (bs.room_id = r.id OR bs.room_id IS NULL)
            AND bs.block_type = 'day'
            AND bs.blocked_date::date >= rr.requested_check_in
            AND bs.blocked_date::date < rr.requested_check_out
        ) THEN 'blocked'
        WHEN $4::time IS NOT NULL AND EXISTS (
          SELECT 1
          FROM blocked_slots bs, requested_range rr
          WHERE (bs.room_id = r.id OR bs.room_id IS NULL)
            AND bs.block_type = 'time'
            AND bs.blocked_date::date = rr.requested_check_in
            AND bs.blocked_time = $4::time
        ) THEN 'blocked'
        WHEN EXISTS (
          SELECT 1
          FROM bookings b, requested_range rr
          WHERE b.room_id = r.id
            AND b.status = ANY($6::varchar[])
            AND b.check_in < rr.requested_check_out
            AND b.check_out > rr.requested_check_in
        ) THEN 'blocked'
        ELSE 'available'
      END AS availability_status,
      CASE
        WHEN r.status <> 'active' THEN 'La habitación no está activa.'
        WHEN EXISTS (
          SELECT 1
          FROM blocked_slots bs, requested_range rr
          WHERE (bs.room_id = r.id OR bs.room_id IS NULL)
            AND bs.block_type = 'day'
            AND bs.blocked_date::date >= rr.requested_check_in
            AND bs.blocked_date::date < rr.requested_check_out
        ) THEN 'La habitación está bloqueada en una fecha de la estadía.'
        WHEN $4::time IS NOT NULL AND EXISTS (
          SELECT 1
          FROM blocked_slots bs, requested_range rr
          WHERE (bs.room_id = r.id OR bs.room_id IS NULL)
            AND bs.block_type = 'time'
            AND bs.blocked_date::date = rr.requested_check_in
            AND bs.blocked_time = $4::time
        ) THEN 'La hora de ingreso está bloqueada.'
        WHEN EXISTS (
          SELECT 1
          FROM bookings b, requested_range rr
          WHERE b.room_id = r.id
            AND b.status = ANY($6::varchar[])
            AND b.check_in < rr.requested_check_out
            AND b.check_out > rr.requested_check_in
        ) THEN 'La habitación tiene una reserva que cruza esas fechas.'
        ELSE 'Habitación disponible.'
      END AS availability_reason
    FROM rooms r
    WHERE ($3::integer IS NULL OR r.capacity >= $3::integer)
      AND ($5::integer IS NULL OR r.id = $5::integer)
    ORDER BY r.price_per_night ASC, r.display_order ASC, r.id ASC;
    `,
    [
      normalized.check_in,
      normalized.check_out,
      normalized.guests_count,
      normalized.check_in_time,
      normalized.room_id,
      BLOCKING_BOOKING_STATUSES,
    ]
  );

  const rooms = input.available_only === false
    ? result.rows
    : result.rows.filter(
        (room) => room.availability_status === "available"
      );

  return {
    ...normalized,
    available_count: rooms.filter(
      (room) => room.availability_status === "available"
    ).length,
    rooms,
  };
}

export async function checkAvailabilityService(input, db = pool) {
  const result = await searchAvailableRoomsService({
    ...input,
    available_only: false,
  }, db);
  const room = result.rooms[0];

  if (!room) {
    return {
      available: false,
      reason: "La habitación no existe o no tiene capacidad suficiente.",
      check_out: result.check_out,
    };
  }

  return {
    available: room.availability_status === "available",
    reason: room.availability_reason,
    check_out: result.check_out,
  };
}
