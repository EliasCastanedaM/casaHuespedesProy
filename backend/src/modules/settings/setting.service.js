import { pool } from "../../config/db.js";

export async function getAvailabilitySettingsService() {
  const result = await pool.query(
    `
    SELECT *
    FROM availability_settings
    WHERE setting_name = 'default'
    LIMIT 1;
    `
  );

  return result.rows[0];
}

export async function updateAvailabilitySettingsService(settingsData) {
  const {
    start_time,
    end_time,
    slot_minutes,
    monday,
    tuesday,
    wednesday,
    thursday,
    friday,
    saturday,
    sunday,
    is_active,
  } = settingsData;

  const result = await pool.query(
    `
    UPDATE availability_settings
    SET
      start_time = $1,
      end_time = $2,
      slot_minutes = $3,
      monday = $4,
      tuesday = $5,
      wednesday = $6,
      thursday = $7,
      friday = $8,
      saturday = $9,
      sunday = $10,
      is_active = $11,
      updated_at = CURRENT_TIMESTAMP
    WHERE setting_name = 'default'
    RETURNING *;
    `,
    [
      start_time,
      end_time,
      slot_minutes,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      is_active,
    ]
  );

  return result.rows[0];
}