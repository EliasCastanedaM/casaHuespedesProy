import { pool } from "../../config/db.js";

// Public business payment instructions, never guest banking credentials.
// Only the currently verified record can supply destination numbers.
export async function getHotelPaymentInfoService(db = pool) {
  const result=await db.query(`
    SELECT config FROM public.hotel_policy_rules
    WHERE code='formas_pago' AND active=TRUE AND review_status='verified'
    LIMIT 1;
  `);
  return result.rows[0]?.config || null;
}
