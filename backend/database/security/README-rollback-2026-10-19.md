# Recuperación de la seguridad — 19/10/2026

Migración aplicada mediante Supabase: `harden_hotel_public_access_20261019`.

**No ejecutar este documento de recuperación de forma preventiva.** Revertir RLS o
permisos abre de nuevo accesos a datos sensibles. Ante un fallo real, es mejor
determinar qué rol usa la aplicación, y otorgar **solo** el acceso necesario
a ese rol interno, manteniendo prohibido el acceso `anon`.

## Pruebas posteriores

- Verificar que `anon` y `authenticated` no tienen privilegios en los
  seis archivos históricos, `room_categories` y ambas vistas administrativas.
- Verificar RLS en los siete objetos y `security_invoker` en las dos vistas.
- Verificar listado público de categorías, consulta de disponibilidad y
  funcionamiento de inbox/administración a través del **backend**.
- Confirmar que las seis categorías mantienen 13 habitaciones activas.

## SQL de reversión extrema (solo emergencia y con evaluación)

```sql
-- INSEGURO: vuelve a exponer datos. No aplicar salvo necesidad justificada.
GRANT ALL PRIVILEGES ON TABLE
  public.rooms_archive_catalogo_20260718,
  public.bookings_archive_catalogo_20260718,
  public.payments_archive_catalogo_20260718,
  public.blocked_slots_archive_catalogo_20260718,
  public.room_images_archive_catalogo_20260718,
  public.room_videos_archive_catalogo_20260718,
  public.room_categories,
  public.vw_bookings_admin,
  public.vw_inquiries_admin
TO anon, authenticated;
ALTER TABLE public.rooms_archive_catalogo_20260718 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings_archive_catalogo_20260718 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_archive_catalogo_20260718 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots_archive_catalogo_20260718 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images_archive_catalogo_20260718 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_videos_archive_catalogo_20260718 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_categories DISABLE ROW LEVEL SECURITY;
ALTER VIEW public.vw_bookings_admin RESET (security_invoker);
ALTER VIEW public.vw_inquiries_admin RESET (security_invoker);
```

En condiciones normales no revertir la seguridad; reparar el acceso del rol
privado autorizado mediante conexión desde Render.
