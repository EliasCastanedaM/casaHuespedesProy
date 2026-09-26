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
    price_low: toNumber(category.price_low),
    price_medium: toNumber(category.price_medium),
    price_high: toNumber(category.price_high),
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

  return result.rows.map(publicCategoryRow);
}

export async function searchAvailableRoomCategoriesService(
  input = {},
  db = pool
) {
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
    .map((category) => ({
      ...category,
      available_quantity: Number(
        availableByCategory.get(category.slug) || 0
      ),
    }));

  return {
    ...availability,
    categories: compatibleCategories,
    available_category_count: compatibleCategories.filter(
      (category) => category.available_quantity > 0
    ).length,
  };
}
