import { pool } from "../../config/db.js";
import {
  checkAvailabilityService,
  normalizeAvailabilityInput,
  searchAvailableRoomsService,
} from "../availability/availability.service.js";
import { searchAvailableRoomCategoriesService } from "../rooms/roomCategory.service.js";

const BLOCKING_BOOKING_STATUSES = [
  "pending",
  "pending_payment",
  "payment_reported",
  "confirmed",
];

const NON_TERMINAL_STATUSES = [
  "pending",
  "pending_payment",
  "payment_reported",
  "confirmed",
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function publicBookingRow(row) {
  return {
    id: row.id,
    booking_code: row.booking_code,
    status: row.status,
    source: row.source,
    check_in: row.check_in,
    check_out: row.check_out,
    nights: Number(row.nights || 0),
    guests_count: Number(row.guests_count || 0),
    total_amount: toNumber(row.total_amount),
    unit_price: toNumber(row.unit_price ?? row.price_per_night),
    created_at: row.created_at,
    category_slug: row.category_slug,
    category_name: row.category_name,
    stay_type: row.stay_type || "full_day",
    check_out_time: row.check_out_time || null,
    customer: {
      id: row.customer_id,
      full_name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email,
    },
  };
}

export async function getMobileDashboardService(db = pool) {
  const summaryResult = await db.query(
    `
    WITH today AS (
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date AS day
    )
    SELECT
      COUNT(*) FILTER (WHERE r.status = 'active')::integer AS total_rooms,
      COUNT(*) FILTER (
        WHERE r.status = 'active'
          AND EXISTS (
            SELECT 1
            FROM bookings b, today t
            WHERE b.room_id = r.id
              AND b.status = ANY($1::varchar[])
              AND b.check_in <= t.day
              AND b.check_out > t.day
          )
      )::integer AS occupied_rooms,
      COUNT(*) FILTER (
        WHERE r.status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM bookings b, today t
            WHERE b.room_id = r.id
              AND b.status = ANY($1::varchar[])
              AND b.check_in <= t.day
              AND b.check_out > t.day
          )
          AND EXISTS (
            SELECT 1
            FROM blocked_slots bs, today t
            WHERE (bs.room_id = r.id OR bs.room_id IS NULL)
              AND bs.block_type = 'day'
              AND bs.blocked_date::date = t.day
          )
      )::integer AS blocked_rooms,
      COUNT(*) FILTER (
        WHERE r.status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM bookings b, today t
            WHERE b.room_id = r.id
              AND b.status = ANY($1::varchar[])
              AND b.check_in <= t.day
              AND b.check_out > t.day
          )
          AND NOT EXISTS (
            SELECT 1
            FROM blocked_slots bs, today t
            WHERE (bs.room_id = r.id OR bs.room_id IS NULL)
              AND bs.block_type = 'day'
              AND bs.blocked_date::date = t.day
          )
      )::integer AS available_rooms,
      (
        SELECT COUNT(*)::integer
        FROM bookings b, today t
        WHERE b.status = ANY($1::varchar[])
          AND b.check_in = t.day
      ) AS arrivals_today,
      (
        SELECT COUNT(*)::integer
        FROM bookings b, today t
        WHERE b.status = ANY($1::varchar[])
          AND b.check_out = t.day
      ) AS departures_today,
      (
        SELECT COUNT(*)::integer
        FROM bookings b
        WHERE b.status <> ALL($2::varchar[])
          AND b.check_in >= date_trunc(
            'month',
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'
          )::date
          AND b.check_in < (
            date_trunc(
              'month',
              CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'
            ) + INTERVAL '1 month'
          )::date
      ) AS month_bookings,
      (
        SELECT COALESCE(SUM(b.total_amount), 0)
        FROM bookings b
        WHERE b.status <> ALL($2::varchar[])
          AND b.check_in >= date_trunc(
            'month',
            CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'
          )::date
          AND b.check_in < (
            date_trunc(
              'month',
              CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'
            ) + INTERVAL '1 month'
          )::date
      ) AS month_revenue
    FROM rooms r;
    `,
    [BLOCKING_BOOKING_STATUSES, ["cancelled", "rejected", "expired"]]
  );

  const categoryResult = await db.query(
    `
    WITH today AS (
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date AS day
    ),
    current_bookings AS (
      SELECT DISTINCT b.room_id
      FROM bookings b, today t
      WHERE b.status = ANY($1::varchar[])
        AND b.check_in <= t.day
        AND b.check_out > t.day
    )
    SELECT
      rc.slug,
      rc.name,
      rc.price_per_night,
      COUNT(r.id) FILTER (WHERE r.status = 'active')::integer AS total_rooms,
      COUNT(cb.room_id) FILTER (WHERE r.status = 'active')::integer AS occupied_rooms
    FROM room_categories rc
    LEFT JOIN rooms r
      ON r.category_slug = rc.slug
    LEFT JOIN current_bookings cb
      ON cb.room_id = r.id
    WHERE rc.is_active = TRUE
    GROUP BY rc.id, rc.slug, rc.name, rc.price_per_night, rc.display_order
    ORDER BY rc.display_order, rc.id;
    `,
    [BLOCKING_BOOKING_STATUSES]
  );

  const monthlyResult = await db.query(
    `
    WITH months AS (
      SELECT generate_series(
        date_trunc(
          'month',
          CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'
        ) - INTERVAL '5 months',
        date_trunc(
          'month',
          CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'
        ),
        INTERVAL '1 month'
      )::date AS month_start
    )
    SELECT
      m.month_start,
      COUNT(b.id)::integer AS bookings,
      COALESCE(SUM(b.total_amount), 0) AS revenue
    FROM months m
    LEFT JOIN bookings b
      ON b.created_at >= m.month_start
      AND b.created_at < m.month_start + INTERVAL '1 month'
      AND b.status NOT IN ('cancelled', 'rejected', 'expired')
    GROUP BY m.month_start
    ORDER BY m.month_start;
    `
  );

  const arrivalsResult = await db.query(
    `
    WITH today AS (
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima')::date AS day
    )
    SELECT
      b.id,
      b.booking_code,
      b.check_in,
      b.check_out,
      b.guests_count,
      b.total_amount,
      c.full_name AS customer_name,
      r.room_number,
      rc.name AS category_name
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    JOIN rooms r ON r.id = b.room_id
    LEFT JOIN room_categories rc
      ON rc.slug = COALESCE(b.category_slug, r.category_slug)
    CROSS JOIN today t
    WHERE b.status = ANY($1::varchar[])
      AND b.check_in >= t.day
    ORDER BY b.check_in ASC, r.room_number ASC, b.id ASC
    LIMIT 6;
    `,
    [NON_TERMINAL_STATUSES]
  );

  const summary = summaryResult.rows[0] || {};

  return {
    summary: {
      total_rooms: Number(summary.total_rooms || 0),
      occupied_rooms: Number(summary.occupied_rooms || 0),
      blocked_rooms: Number(summary.blocked_rooms || 0),
      available_rooms: Number(summary.available_rooms || 0),
      arrivals_today: Number(summary.arrivals_today || 0),
      departures_today: Number(summary.departures_today || 0),
      month_bookings: Number(summary.month_bookings || 0),
      month_revenue: toNumber(summary.month_revenue),
    },
    categories: categoryResult.rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      price_per_night: toNumber(row.price_per_night),
      total_rooms: Number(row.total_rooms || 0),
      occupied_rooms: Number(row.occupied_rooms || 0),
    })),
    monthly: monthlyResult.rows.map((row) => ({
      month_start: row.month_start,
      bookings: Number(row.bookings || 0),
      revenue: toNumber(row.revenue),
    })),
    upcoming_arrivals: arrivalsResult.rows.map((row) => ({
      id: row.id,
      booking_code: row.booking_code,
      check_in: row.check_in,
      check_out: row.check_out,
      guests_count: Number(row.guests_count || 0),
      total_amount: toNumber(row.total_amount),
      customer_name: row.customer_name,
      category_name: row.category_name,
    })),
  };
}

export async function getMobileCategoriesService(input = {}, db = pool) {
  const availability = await searchAvailableRoomCategoriesService(
    {
      check_in: input.check_in,
      check_out: input.check_out,
      nights: input.nights,
      guests_count: input.guests_count,
      available_only: true,
    },
    db
  );

  return {
    check_in: availability.check_in,
    check_out: availability.check_out,
    nights: Number(availability.nights || 0),
    guests_count: Number(availability.guests_count || 0),
    available_category_count: Number(
      availability.available_category_count || 0
    ),
    categories: (availability.categories || []).map((category) => ({
      slug: category.slug,
      name: category.name,
      capacity: Number(category.capacity || 0),
      bed_description: category.bed_description,
      description: category.description,
      price_per_night: toNumber(category.price_per_night),
      total_amount:
        toNumber(category.price_per_night) *
        Number(availability.nights || 0),
      image_url: category.image_url,
      total_quantity: Number(category.total_quantity || 0),
      active_quantity: Number(category.active_quantity || 0),
      available_quantity: Number(category.available_quantity || 0),
      occupied_quantity: Number(category.occupied_quantity || 0),
      is_available: Boolean(category.is_available),
    })),
  };
}

export async function getMobileRoomsService(input = {}, db = pool) {
  const availability = await searchAvailableRoomsService(
    {
      check_in: input.check_in,
      check_out: input.check_out,
      nights: input.nights,
      guests_count: input.guests_count,
      available_only: false,
    },
    db
  );

  const categoriesResult = await db.query(
    `
    SELECT slug, name, price_per_night
    FROM room_categories
    WHERE is_active = TRUE;
    `
  );

  const categoryBySlug = new Map(
    categoriesResult.rows.map((category) => [
      String(category.slug),
      category,
    ])
  );

  return {
    check_in: availability.check_in,
    check_out: availability.check_out,
    nights: Number(availability.nights || 0),
    guests_count: Number(availability.guests_count || 0),
    rooms: availability.rooms.map((room) => {
      const category = categoryBySlug.get(String(room.category_slug)) || {};
      const unitPrice = toNumber(
        category.price_per_night ?? room.price_per_night
      );

      return {
        id: room.id,
        room_number: room.room_number,
        name: room.name,
        category_slug: room.category_slug,
        category_name: category.name || room.category_slug,
        capacity: Number(room.capacity || 0),
        price_per_night: unitPrice,
        total_amount: unitPrice * Number(availability.nights || 0),
        image_url: room.main_image_url,
        floor_label: room.floor_label,
        amenities: Array.isArray(room.amenities) ? room.amenities : [],
        availability_status: room.availability_status,
        availability_reason: room.availability_reason,
        is_available: room.availability_status === "available",
      };
    }),
  };
}

export async function createMobileBookingService(input = {}, db = pool) {
  const customerInput = input.customer || {};
  const fullName = cleanText(customerInput.full_name || input.full_name);
  const phone = cleanText(customerInput.phone || input.phone);
  const email = cleanText(customerInput.email || input.email);
  const documentType = cleanText(
    customerInput.document_type || input.document_type
  );
  const documentNumber = cleanText(
    customerInput.document_number || input.document_number
  );
  const categorySlug = String(input.category_slug || "")
    .trim()
    .toLowerCase();
  const stayType = String(input.stay_type || "full_day")
    .trim()
    .toLowerCase();
  const checkOutTime = cleanText(input.check_out_time);

  if (!fullName || !phone) {
    const error = new Error(
      "El nombre del huésped y el celular son obligatorios."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!categorySlug) {
    const error = new Error("Selecciona una categoría.");
    error.statusCode = 400;
    throw error;
  }

  if (!["full_day", "until_time"].includes(stayType)) {
    const error = new Error("El tipo de estadía no es válido.");
    error.statusCode = 400;
    throw error;
  }

  if (
    stayType === "until_time" &&
    !/^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(checkOutTime || ""))
  ) {
    const error = new Error("Selecciona una hora de salida válida.");
    error.statusCode = 400;
    throw error;
  }

  const normalized = normalizeAvailabilityInput({
    check_in: input.check_in,
    check_out: input.check_out,
    nights: input.nights,
    guests_count: input.guests_count || 1,
  });

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Serializa las asignaciones dentro de la misma categoría para evitar
    // que dos dispositivos tomen la misma última unidad disponible.
    await client.query(
      "SELECT pg_advisory_xact_lock(481515, hashtext($1));",
      [categorySlug]
    );

    const categoryResult = await client.query(
      `
      SELECT
        slug,
        name,
        capacity,
        price_per_night,
        is_active
      FROM room_categories
      WHERE slug = $1
        AND is_active = TRUE
      LIMIT 1;
      `,
      [categorySlug]
    );

    const category = categoryResult.rows[0];

    if (!category) {
      const error = new Error("La categoría seleccionada no está activa.");
      error.statusCode = 400;
      throw error;
    }

    if (Number(normalized.guests_count) > Number(category.capacity || 0)) {
      const error = new Error(
        "La cantidad de huéspedes supera la capacidad de esta categoría."
      );
      error.statusCode = 400;
      throw error;
    }

    const candidatesResult = await client.query(
      `
      SELECT id
      FROM rooms
      WHERE category_slug = $1
        AND status = 'active'
      ORDER BY COALESCE(display_order, 9999), id;
      `,
      [categorySlug]
    );

    let assignedRoomId = null;

    for (const candidate of candidatesResult.rows) {
      await client.query(
        "SELECT pg_advisory_xact_lock(481516, $1::integer);",
        [candidate.id]
      );

      const availability = await checkAvailabilityService(
        {
          room_id: candidate.id,
          check_in: normalized.check_in,
          check_out: normalized.check_out,
          guests_count: normalized.guests_count,
        },
        client
      );

      if (availability.available) {
        assignedRoomId = candidate.id;
        break;
      }
    }

    if (!assignedRoomId) {
      const error = new Error(
        "No hay disponibilidad en esta categoría para las fechas seleccionadas."
      );
      error.statusCode = 409;
      throw error;
    }

    const customerResult = await client.query(
      `
      SELECT *
      FROM customers
      WHERE phone = $1
         OR ($2::text IS NOT NULL AND email = $2)
      ORDER BY id ASC
      LIMIT 1;
      `,
      [phone, email]
    );

    let customer = customerResult.rows[0];

    if (customer) {
      const updatedCustomer = await client.query(
        `
        UPDATE customers
        SET
          full_name = $1,
          phone = $2,
          email = COALESCE($3, email),
          document_type = COALESCE($4, document_type),
          document_number = COALESCE($5, document_number),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *;
        `,
        [
          fullName,
          phone,
          email,
          documentType,
          documentNumber,
          customer.id,
        ]
      );

      customer = updatedCustomer.rows[0];
    } else {
      const insertedCustomer = await client.query(
        `
        INSERT INTO customers (
          full_name,
          phone,
          email,
          document_type,
          document_number
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
        `,
        [fullName, phone, email, documentType, documentNumber]
      );

      customer = insertedCustomer.rows[0];
    }

    const unitPrice = toNumber(category.price_per_night);
    const totalAmount = unitPrice * Number(normalized.nights);

    if (unitPrice <= 0) {
      const error = new Error(
        "La categoría no tiene un precio configurado."
      );
      error.statusCode = 400;
      throw error;
    }

    const insertedBooking = await client.query(
      `
      INSERT INTO bookings (
        customer_id,
        room_id,
        category_slug,
        unit_price,
        check_in,
        check_out,
        guests_count,
        nights,
        total_amount,
        status,
        source,
        special_requests,
        payment_status,
        stay_type,
        check_out_time
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        'confirmed', 'mobile', $10, NULL, $11, $12
      )
      RETURNING *;
      `,
      [
        customer.id,
        assignedRoomId,
        category.slug,
        unitPrice,
        normalized.check_in,
        normalized.check_out,
        normalized.guests_count,
        normalized.nights,
        totalAmount,
        cleanText(input.special_requests),
        stayType,
        stayType === "until_time" ? checkOutTime : null,
      ]
    );

    const booking = insertedBooking.rows[0];
    const bookingCode = `CHP-${String(booking.id).padStart(5, "0")}`;

    await client.query(
      `
      UPDATE bookings
      SET booking_code = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
      `,
      [bookingCode, booking.id]
    );

    const detailsResult = await client.query(
      `
      SELECT
        b.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        rc.name AS category_name,
        b.category_slug
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      LEFT JOIN room_categories rc
        ON rc.slug = b.category_slug
      WHERE b.id = $1
      LIMIT 1;
      `,
      [booking.id]
    );

    await client.query("COMMIT");

    return publicBookingRow(detailsResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getMobileBookingsService(
  { limit = 100 } = {},
  db = pool
) {
  const parsedLimit = Math.min(200, Math.max(1, Number(limit) || 100));

  const result = await db.query(
    `
    SELECT
      b.*,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      r.room_number,
      r.name AS room_name,
      rc.name AS category_name,
      COALESCE(b.category_slug, r.category_slug) AS category_slug
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    JOIN rooms r ON r.id = b.room_id
    LEFT JOIN room_categories rc
      ON rc.slug = COALESCE(b.category_slug, r.category_slug)
    WHERE b.status <> 'cancelled'
    ORDER BY b.check_in DESC, b.created_at DESC, b.id DESC
    LIMIT $1;
    `,
    [parsedLimit]
  );

  return result.rows.map(publicBookingRow);
}


export async function cancelMobileBookingService(
  { booking_id, booking_code } = {},
  db = pool
) {
  const bookingId = Number(booking_id);
  const bookingCode = cleanText(booking_code);

  if (!Number.isInteger(bookingId) || bookingId <= 0 || !bookingCode) {
    const error = new Error("La reserva indicada no es válida.");
    error.statusCode = 400;
    throw error;
  }

  const result = await db.query(
    `
    UPDATE bookings
    SET
      status = 'cancelled',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND booking_code = $2
      AND source = 'mobile'
      AND status NOT IN ('cancelled', 'rejected', 'expired')
    RETURNING id, booking_code, status, source, category_slug;
    `,
    [bookingId, bookingCode]
  );

  if (!result.rows[0]) {
    const error = new Error(
      "No se encontró una reserva móvil activa que se pueda eliminar."
    );
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}
