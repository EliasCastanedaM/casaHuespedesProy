import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { check_in, nights = 1 } = req.query;

    if (!check_in) {
      const roomsResult = await pool.query(`
        SELECT 
          id,
          name,
          description,
          capacity,
          price_per_night,
          status,
          main_image_url,
          'idle' AS availability_status
        FROM rooms
        ORDER BY id ASC
      `);

      return res.json(roomsResult.rows);
    }

    const result = await pool.query(
      `
      WITH requested_range AS (
        SELECT
          $1::date AS requested_check_in,
          ($1::date + ($2::int || ' days')::interval)::date AS requested_check_out
      )
      SELECT 
        r.id,
        r.name,
        r.description,
        r.capacity,
        r.price_per_night,
        r.status,
        r.main_image_url,
        CASE
          WHEN r.status <> 'active' THEN 'blocked'
          WHEN EXISTS (
            SELECT 1
            FROM bookings b, requested_range rr
            WHERE b.room_id = r.id
              AND b.status NOT IN ('cancelled', 'completed')
              AND b.check_in < rr.requested_check_out
              AND (b.check_in + (b.nights || ' days')::interval)::date > rr.requested_check_in
          ) THEN 'blocked'
          ELSE 'available'
        END AS availability_status
      FROM rooms r
      ORDER BY r.id ASC
      `,
      [check_in, nights]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Availability error:", error);
    return res.status(500).json({
      message: "No se pudo consultar la disponibilidad.",
    });
  }
});

export default router;