import { minimumRequiredBedPlaces, categoryBedPlan } from './guestComposition.js';
import { pool } from "../../config/db.js";
import { getPublicRoomCategoriesService } from "./roomCategory.service.js";

// Internal only: never return the occupancy grid through public room endpoints.
export async function getReservationRoomCategoriesService(db = pool) {
  const categories = await getPublicRoomCategoriesService(db);
  const result = await db.query(`
    SELECT category_slug, occupancy, amount
    FROM public.room_category_occupancy_rates
    ORDER BY category_slug, occupancy;
  `);
  const rates = new Map();
  for (const row of result.rows) {
    if (!rates.has(row.category_slug)) rates.set(row.category_slug, {});
    rates.get(row.category_slug)[Number(row.occupancy)] = Number(row.amount);
  }
  return categories.map((category) => ({ ...category, occupancy_rates: rates.get(category.slug) || {} }));
}

// Availability is a local inventory snapshot; final confirmation remains human.
export async function withAvailableReservationRooms(categories, state, db = pool) {
  const { searchAvailableRoomsService } = await import("../availability/availability.service.js");
  const result = await searchAvailableRoomsService({
    check_in: state.check_in, check_out: state.check_out,
    guests_count: minimumRequiredBedPlaces(state),
    check_in_time: state.check_in_time,
  }, db);
  return categories.map(c=>({ ...c, available_rooms: result.rooms.filter(room=>room.category_slug===c.slug && categoryBedPlan(c,state).fits) }));
}

