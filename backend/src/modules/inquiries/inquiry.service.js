import { pool } from "../../config/db.js";

export async function createInquiryService(inquiryData) {
  const {
    customer_name,
    phone,
    email,
    subject,
    message,
    preferred_check_in,
    preferred_check_out,
  } = inquiryData;

  const result = await pool.query(
    `
    INSERT INTO inquiries (
      customer_name,
      phone,
      email,
      subject,
      message,
      preferred_check_in,
      preferred_check_out,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *;
    `,
    [
      customer_name,
      phone,
      email || null,
      subject || "Consulta desde la web",
      message,
      preferred_check_in || null,
      preferred_check_out || null,
    ]
  );

  return result.rows[0];
}

export async function getAllInquiriesService() {
  const result = await pool.query(
    `
    SELECT *
    FROM vw_inquiries_admin
    ORDER BY created_at DESC;
    `
  );

  return result.rows;
}

export async function updateInquiryStatusService(id, status) {
  const result = await pool.query(
    `
    UPDATE inquiries
    SET status = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
    `,
    [status, id]
  );

  return result.rows[0];
}