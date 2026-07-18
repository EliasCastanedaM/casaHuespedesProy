import { pool } from "../../config/db.js";

export async function getBlockedSlotsService() {
  const result = await pool.query(
    `
    SELECT
      bs.id,
      bs.room_id,
      bs.blocked_date,
      bs.blocked_time,
      bs.block_type,
      bs.reason,
      bs.created_at,
      r.name AS room_name
    FROM blocked_slots bs
    LEFT JOIN rooms r ON r.id = bs.room_id
    ORDER BY bs.blocked_date DESC, bs.blocked_time ASC;
    `
  );

  return result.rows;
}

export async function createBlockedSlotService(blockedSlotData) {
  const {
    room_id,
    blocked_date,
    blocked_time,
    block_type,
    reason,
  } = blockedSlotData;

  const result = await pool.query(
    `
    INSERT INTO blocked_slots (
      room_id,
      blocked_date,
      blocked_time,
      block_type,
      reason
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
    `,
    [
      room_id || null,
      blocked_date,
      block_type === "day" ? null : blocked_time,
      block_type || "time",
      reason || null,
    ]
  );

  return result.rows[0];
}

export async function deleteBlockedSlotService(id) {
  const result = await pool.query(
    `
    DELETE FROM blocked_slots
    WHERE id = $1
    RETURNING *;
    `,
    [id]
  );

  return result.rows[0];
}