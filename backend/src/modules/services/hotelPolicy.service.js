import { pool } from "../../config/db.js";

const POLICY_CODES = [
  "ninos_0_4",
  "ninos_5_8",
  "ninos_9_mas",
  "mascotas",
  "grupos_8",
];

// La IA puede consultar las reglas; nunca escribirlas, aprobarlas ni crear
// cargos a partir de propuestas pendientes de revisión administrativa.
export async function getHotelGuestPolicyRulesService(db = pool) {
  const result = await db.query(
    `SELECT code, config, review_status, requires_human_approval
       FROM public.hotel_policy_rules
       WHERE active = TRUE AND code = ANY($1::varchar[]);`,
    [POLICY_CODES]
  );
  return Object.fromEntries(
    result.rows.map((rule) => [rule.code, {
      config: rule.config || {},
      review_status: rule.review_status,
      requires_human_approval: Boolean(rule.requires_human_approval),
    }])
  );
}
