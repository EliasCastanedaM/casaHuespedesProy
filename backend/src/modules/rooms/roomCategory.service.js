import { pool } from "../../config/db.js";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
      rc.price_low,
      rc.price_medium,
      rc.price_high,
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
      rc.price_low,
      rc.price_medium,
      rc.price_high,
      rc.image_url,
      rc.display_order
    ORDER BY rc.display_order ASC, rc.id ASC;
  `);

  return result.rows.map((category) => ({
    ...category,
    total_quantity: Number(category.total_quantity || 0),
    capacity: Number(category.capacity || 1),
    mapped_quantity: Number(category.mapped_quantity || 0),
    active_quantity: Number(category.active_quantity || 0),
    price_low: toNumber(category.price_low),
    price_medium: toNumber(category.price_medium),
    price_high: toNumber(category.price_high),
  }));
}
