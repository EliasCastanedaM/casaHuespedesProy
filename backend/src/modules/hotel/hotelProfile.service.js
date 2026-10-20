import { pool } from "../../config/db.js";

// Fuente verificada: el responsable confirmó Calle José Quiñones 237.
// No incluir campos internos (source/verification) en la API pública.
export async function getPublicHotelProfileService(db = pool) {
  const result = await db.query(`
    SELECT hotel_name, street_address, district, region, country
    FROM public.hotel_profile
    WHERE id = 1 AND verification_status = 'verified';
  `);
  const row = result.rows[0];
  if (!row) return null;
  return {
    name: row.hotel_name,
    street_address: row.street_address,
    district: row.district,
    region: row.region,
    country: row.country,
  };
}

export function formatOfficialHotelAddress(profile) {
  if (!profile?.street_address || !profile.district || !profile.region) return null;
  return [profile.street_address, profile.district, profile.region, profile.country]
    .filter(Boolean).join(", ");
}
