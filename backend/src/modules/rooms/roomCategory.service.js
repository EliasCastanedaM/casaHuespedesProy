import { pool } from "../../config/db.js";
import { searchAvailableRoomsService } from "../availability/availability.service.js";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function publicCategoryRow(category) {
  return {
    ...category,
    total_quantity: Number(category.total_quantity || 0),
    capacity: Number(category.capacity || 1),
    mapped_quantity: Number(category.mapped_quantity || 0),
    active_quantity: Number(category.active_quantity || 0),
    price_per_night: toNumber(category.price_per_night),
  };
}

export async function getPublicRoomCategoriesService(db = pool) {
  const result = await db.query(`
    SELECT
      rc.id,
      rc.slug,
      rc.name,
      COUNT(r.id)::INTEGER AS total_quantity,
      rc.capacity,
      rc.bed_description,
      rc.description,
      rc.price_per_night,
      rc.image_url,
      rc.display_order,
      COUNT(r.id)::INTEGER AS mapped_quantity,
      COUNT(r.id) FILTER (WHERE r.status = 'active')::INTEGER AS active_quantity
    FROM room_categories rc
    LEFT JOIN rooms r
      ON r.category_slug = rc.slug
    WHERE rc.is_active = TRUE
    GROUP BY
      rc.id,
      rc.slug,
      rc.name,
      rc.capacity,
      rc.bed_description,
      rc.description,
      rc.price_per_night,
      rc.image_url,
      rc.display_order
    ORDER BY rc.display_order ASC, rc.id ASC;
  `);

  return result.rows.map(publicCategoryRow);
}

export async function updateRoomCategoryService(
  slug,
  categoryData = {},
  db = pool
) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const currentResult = await db.query(
    `
    SELECT *
    FROM room_categories
    WHERE slug = $1
    LIMIT 1;
    `,
    [normalizedSlug]
  );
  const current = currentResult.rows[0];

  if (!current) return null;

  const has = (key) =>
    Object.prototype.hasOwnProperty.call(categoryData, key);

  const capacity = has("capacity")
    ? Number(categoryData.capacity)
    : Number(current.capacity);
  const pricePerNight = has("price_per_night")
    ? Number(categoryData.price_per_night)
    : Number(current.price_per_night || 0);

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) {
    const error = new Error(
      "La capacidad de la categoría debe estar entre 1 y 30."
    );
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
    const error = new Error(
      "El precio de la categoría no puede ser negativo."
    );
    error.statusCode = 400;
    throw error;
  }

  const result = await db.query(
    `
    UPDATE room_categories
    SET
      capacity = $1,
      price_per_night = $2,
      bed_description = $3,
      description = $4,
      image_url = $5,
      is_active = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE slug = $7
    RETURNING *;
    `,
    [
      capacity,
      pricePerNight,
      has("bed_description")
        ? categoryData.bed_description || null
        : current.bed_description,
      has("description")
        ? categoryData.description || null
        : current.description,
      has("image_url")
        ? categoryData.image_url || null
        : current.image_url,
      has("is_active")
        ? Boolean(categoryData.is_active)
        : current.is_active,
      normalizedSlug,
    ]
  );

  return publicCategoryRow(result.rows[0]);
}

export async function searchAvailableRoomCategoriesService(
  input = {},
  db = pool
) {
  // La disponibilidad comercial se calcula por categoría, pero la ocupación
  // real continúa respaldada por las habitaciones físicas y sus reservas.
  // Los detalles de esas unidades no se devuelven al huésped.
  const availability = await searchAvailableRoomsService(input, db);
  const categories = await getPublicRoomCategoriesService(db);
  const availableByCategory = new Map();

  for (const room of availability.rooms || []) {
    const slug = String(room.category_slug || "").trim().toLowerCase();
    if (!slug) continue;

    availableByCategory.set(
      slug,
      Number(availableByCategory.get(slug) || 0) + 1
    );
  }

  const compatibleCategories = categories
    .filter(
      (category) =>
        !availability.guests_count ||
        Number(category.capacity) >= Number(availability.guests_count)
    )
    .map((category) => {
      const availableQuantity = Number(
        availableByCategory.get(category.slug) || 0
      );
      const activeQuantity = Number(category.active_quantity || 0);

      return {
        ...category,
        available_quantity: availableQuantity,
        occupied_quantity: Math.max(0, activeQuantity - availableQuantity),
        is_available: availableQuantity > 0,
      };
    });

  return {
    check_in: availability.check_in,
    check_out: availability.check_out,
    nights: availability.nights,
    guests_count: availability.guests_count,
    available_count: compatibleCategories.reduce(
      (total, category) => total + Number(category.available_quantity || 0),
      0
    ),
    categories: compatibleCategories,
    available_category_count: compatibleCategories.filter(
      (category) => category.available_quantity > 0
    ).length,
  };
}


export async function getPublicRoomCategoryBySlugService(slug, db = pool) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();

  const result = await db.query(
    `
    SELECT
      rc.id,
      rc.slug,
      rc.name,
      (
        SELECT COUNT(*)::INTEGER
        FROM rooms inventory_room
        WHERE inventory_room.category_slug = rc.slug
      ) AS total_quantity,
      rc.capacity,
      rc.bed_description,
      rc.description,
      rc.price_per_night,
      rc.image_url,
      rc.display_order,
      (
        SELECT COUNT(*)::INTEGER
        FROM rooms r
        WHERE r.category_slug = rc.slug
          AND r.status = 'active'
      ) AS active_quantity,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', media.id,
              'image_url', media.image_url,
              'is_main', media.is_main,
              'display_order', media.display_order
            )
            ORDER BY media.is_main DESC, media.display_order, media.id
          )
          FROM (
            SELECT
              ri.id,
              ri.image_url,
              ri.is_main,
              ri.display_order
            FROM room_images ri
            JOIN rooms r ON r.id = ri.room_id
            WHERE r.category_slug = rc.slug
              AND r.status = 'active'
            ORDER BY ri.is_main DESC, ri.display_order, ri.id
            LIMIT 24
          ) media
        ),
        '[]'::jsonb
      ) AS images,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', media.id,
              'video_url', media.video_url,
              'poster_url', media.poster_url,
              'is_main', media.is_main,
              'display_order', media.display_order
            )
            ORDER BY media.is_main DESC, media.display_order, media.id
          )
          FROM (
            SELECT
              rv.id,
              rv.video_url,
              rv.poster_url,
              rv.is_main,
              rv.display_order
            FROM room_videos rv
            JOIN rooms r ON r.id = rv.room_id
            WHERE r.category_slug = rc.slug
              AND r.status = 'active'
            ORDER BY rv.is_main DESC, rv.display_order, rv.id
            LIMIT 8
          ) media
        ),
        '[]'::jsonb
      ) AS videos,
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT amenity)
          FROM rooms r,
          LATERAL jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(r.amenities) = 'array' THEN r.amenities
              ELSE '[]'::jsonb
            END
          ) amenity
          WHERE r.category_slug = rc.slug
            AND r.status = 'active'
        ),
        '[]'::jsonb
      ) AS amenities
    FROM room_categories rc
    WHERE rc.slug = $1
      AND rc.is_active = TRUE
    LIMIT 1;
    `,
    [normalizedSlug]
  );

  const category = result.rows[0];
  if (!category) return null;

  return {
    ...publicCategoryRow(category),
    images: Array.isArray(category.images) ? category.images : [],
    videos: Array.isArray(category.videos) ? category.videos : [],
    amenities: Array.isArray(category.amenities) ? category.amenities : [],
  };
}
