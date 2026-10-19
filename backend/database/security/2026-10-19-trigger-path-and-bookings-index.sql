-- Endurecimiento adicional sin cambios de datos ni de la lógica de negocio.
-- Las funciones son SECURITY INVOKER y usan tablas public calificadas.
-- El orden pg_catalog, public evita la resolución por esquemas inesperados.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.generate_booking_code()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.sync_room_main_image()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.replace_deleted_room_main_image()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.sync_room_category_commercial_values()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.refresh_room_category_quantity()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.propagate_category_commercial_values()
  SET search_path = pg_catalog, public;

-- FK detectada sin índice por advisors. No altera reservas existentes.
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON public.bookings(customer_id);
