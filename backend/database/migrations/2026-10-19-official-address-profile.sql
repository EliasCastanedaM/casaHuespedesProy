-- Fuente única para la dirección oficial confirmada por la administración.
-- No cambia inventario, reservas, pagos, bloqueo ni precios.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.hotel_profile (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hotel_name text NOT NULL,
  street_address text NOT NULL,
  district text NOT NULL,
  region text NOT NULL,
  country text NOT NULL DEFAULT 'Perú',
  verification_status text NOT NULL DEFAULT 'verified'
    CHECK (verification_status IN ('verified', 'pending_review')),
  verified_source text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_profile ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.hotel_profile FROM PUBLIC, anon, authenticated;

INSERT INTO public.hotel_profile
  (id, hotel_name, street_address, district, region, country,
   verification_status, verified_source)
VALUES
  (1, 'Casa Huéspedes Pimentel', 'Calle José Quiñones 237',
   'Pimentel', 'Lambayeque', 'Perú', 'verified',
   'Confirmación directa del responsable del proyecto, 2026-10-19')
ON CONFLICT (id) DO UPDATE
  SET street_address = EXCLUDED.street_address,
      district = EXCLUDED.district,
      region = EXCLUDED.region,
      country = EXCLUDED.country,
      verification_status = EXCLUDED.verification_status,
      verified_source = EXCLUDED.verified_source,
      updated_at = now();
