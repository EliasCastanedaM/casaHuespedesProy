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
      rc.total_quantity,
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
      rc.total_quantity,
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

export async function searchAvailableRoomCategoriesService(
  input = {},
  db = pool
) {
  const availability = await searchAvailableRoomsService(input, db);
  const categories = await getPublicRoomCategoriesService(db);
  const categorizedRooms = (availability.rooms || []).filter(
    (room) => String(room.category_slug || "").trim()
  );
  const availableByCategory = new Map();

  for (const room of categorizedRooms) {
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
    .map((category) => ({
      ...category,
      available_quantity: Number(
        availableByCategory.get(category.slug) || 0
      ),
    }));

  return {
    ...availability,
    rooms: categorizedRooms,
    available_count: categorizedRooms.length,
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
      rc.total_quantity,
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
              'title', media.title,
              'alt_text', media.alt_text,
              'is_main', media.is_main,
              'display_order', media.display_order
            )
            ORDER BY media.is_main DESC, media.display_order, media.id
          )
          FROM (
            SELECT
              ri.id,
              ri.image_url,
              ri.title,
              ri.alt_text,
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
              'title', media.title,
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
              rv.title,
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
