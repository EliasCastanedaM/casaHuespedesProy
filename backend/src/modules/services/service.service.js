import { pool } from "../../config/db.js";

// El catálogo público se alimenta de fuentes publicadas y/o aprobadas.
// "publicly_listed" indica que consta en una ficha pública, no que se hayan
// verificado personalmente los importes y condiciones operativas.
export async function getPublicHotelServicesService(db = pool) {
  const result = await db.query(`
    SELECT slug, name, description, price_type, price,
           source_kind, source_url, verification_status,
           requires_coordination, display_order
    FROM public.services
    WHERE is_active = TRUE
      AND verification_status IN ('publicly_listed', 'approved')
    ORDER BY display_order ASC, id ASC;
  `);
  return result.rows.map((item) => ({
    ...item,
    requires_coordination: Boolean(item.requires_coordination),
    price: item.price === null || item.price === undefined
      ? null : Number(item.price),
  }));
}
