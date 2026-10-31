import { pool } from "../../config/db.js";

// Snapshot operativo interno; NO agrega inventario de Booking, Airbnb ni otros PMS.
export function calendarPeriod(start, days) {
  const count = Number(days);
  if (!Number.isInteger(count) || count < 1 || count > 31) {
    const error = new Error("El calendario admite entre 1 y 31 días.");
    error.statusCode = 400;
    throw error;
  }
  const dateText = String(start || "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateText)
    ? new Date(dateText + "T00:00:00.000Z") : new Date(NaN);
  if (!Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dateText) {
    const error = new Error("La fecha de inicio debe ser AAAA-MM-DD válida.");
    error.statusCode = 400;
    throw error;
  }
  // Limita consultas abusivas sin impedir calendarios de períodos normales.
  const today = new Date();
  if (Math.abs(date.getUTCFullYear() - today.getUTCFullYear()) > 3) {
    const error = new Error("La fecha está fuera del intervalo permitido.");
    error.statusCode = 400;
    throw error;
  }
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + count);
  return { start: dateText, endExclusive: end.toISOString().slice(0, 10), days: count };
}

export async function getInternalCalendarService({ start, days }, db = pool) {
  const period = calendarPeriod(start, days);
  const rooms = await db.query(
    `SELECT id, name, room_number, floor_label, category_slug, main_image_url
     FROM rooms WHERE status = 'active'
     ORDER BY display_order NULLS LAST, room_number, id;`
  );
  const bookings = await db.query(
    `SELECT id, room_id, check_in, check_out, status, booking_code
     FROM bookings
     WHERE check_in < $2::date AND check_out > $1::date
       AND status NOT IN ('cancelled', 'rejected', 'expired')
     ORDER BY check_in, id;`,
    [period.start, period.endExclusive]
  );
  const blocked = await db.query(
    `SELECT id, room_id, blocked_date, blocked_time, block_type, reason
     FROM blocked_slots WHERE blocked_date >= $1::date AND blocked_date < $2::date
     ORDER BY blocked_date, id;`,
    [period.start, period.endExclusive]
  );
  return {
    period,
    scope: "internal_only",
    external_inventory_synchronized: false,
    rooms: rooms.rows,
    bookings: bookings.rows,
    blocked_slots: blocked.rows,
  };
}
