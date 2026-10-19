-- Casa Huéspedes Pimentel: hardening de objetos expuestos por PostgREST.
-- No modifica ni elimina registros. El frontend consume el backend Node/pg.
-- Ejecución de producción: Supabase apply_migration, nombre
-- harden_hotel_public_access_20261019.
--
-- IMPORTANTE: los roles anon/authenticated NO deben consultar estas tablas
-- directamente. El backend usa conexión PostgreSQL del servidor.
-- Conservamos permisos de service_role y del propietario postgres.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Archivos históricos con datos de clientes / inventario antiguo:
REVOKE ALL PRIVILEGES ON TABLE
  public.rooms_archive_catalogo_20260718,
  public.bookings_archive_catalogo_20260718,
  public.payments_archive_catalogo_20260718,
  public.blocked_slots_archive_catalogo_20260718,
  public.room_images_archive_catalogo_20260718,
  public.room_videos_archive_catalogo_20260718
FROM PUBLIC, anon, authenticated;

ALTER TABLE public.rooms_archive_catalogo_20260718 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings_archive_catalogo_20260718 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_archive_catalogo_20260718 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots_archive_catalogo_20260718 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images_archive_catalogo_20260718 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_videos_archive_catalogo_20260718 ENABLE ROW LEVEL SECURITY;

-- Categorías: críticas para tarifas; solo acceso interno backend Node.
REVOKE ALL PRIVILEGES ON TABLE public.room_categories
FROM PUBLIC, anon, authenticated;
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;

-- Vistas administrativas contienen PII: nunca exposiciones públicas.
REVOKE ALL PRIVILEGES ON TABLE
  public.vw_bookings_admin,
  public.vw_inquiries_admin
FROM PUBLIC, anon, authenticated;

-- Defensa en profundidad: una vista no debe tomar privilegios del creador
-- cuando se use con un rol no privilegiado.
ALTER VIEW public.vw_bookings_admin SET (security_invoker = true);
ALTER VIEW public.vw_inquiries_admin SET (security_invoker = true);
