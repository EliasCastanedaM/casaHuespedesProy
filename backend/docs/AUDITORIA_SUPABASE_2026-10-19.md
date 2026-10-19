# Auditoría técnica — Base de datos Casa Huéspedes Pimentel
**Fecha:** 19/10/2026 · **Entorno:** Supabase producción (proyecto casa-huespedes-pimentel)  
**Alcance:** inventario, relaciones, consistencia de tarifas, reservas/pagos, disponibilidad, Meta/IA, contenido, seguridad y contraste con la rama principal de GitHub.

> El diagnóstico utiliza consultas de solo lectura. Las **dos únicas intervenciones DDL**
> autorizadas y ejecutadas se documentan en `backend/database/security/`. No se han
> eliminado, cambiado ni insertado registros comerciales.

## Inventario de 25 tablas y tratamiento

| Tablas | Filas observadas | Diagnóstico y decisión |
|---|---:|---|
| `room_categories` | 6 | CRÍTICA. Fuente de capacidad/precio/comercial. Mantener. RLS protegido. |
| `rooms` | 14 (13 activas) | CRÍTICA. Una unidad, 406, inactiva sin categoría; mantener hasta decisión comercial. |
| `room_images`, `room_videos` | 90 / 3 | MANTENER. Todas las unidades tienen una foto principal. |
| `blocked_slots` | 21 | CRÍTICA. 21 bloqueos **globales** de día; confirmar con administración antes de cambiar. |
| `availability_settings` | 1 | MANTENER. Controles de horario y disponibilidad. |
| `bookings`, `payments` | 0 / 0 | MANTENER. El sistema puede reservar y registrar pagos; falta prueba transaccional aislada. No equivale a reservas inexistentes en OTAs. |
| `customers`, `inquiries`, `users` | 5 / 1 / 1 | MANTENER y controlar acceso a datos personales. |
| `ai_conversations`, `ai_processed_messages` | 16 / 3 | MANTENER. Contexto, reserva progresiva e idempotencia. |
| `meta_conversations`, `meta_messages` | 12 / 322 | MANTENER. Atención IG/FB, handoff, mensajes. |
| `services` | 0 | PENDIENTE. La página de servicios usa datos hardcoded en React. Unificar con datos aprobados por el cliente. |
| `gallery` | 0 | REVISAR. Existe módulo CRUD backend; no confundir con las 90 fotos de `room_images`. |
| `tourism_places` | 0 | REVISAR. `Tourism.jsx` almacena contenido estático. |
| `rooms_backup_before_physical_rooms_20260716` | 10 | HISTÓRICA. RLS ya activado; no borrar aún. |
| `rooms_archive_catalogo_20260718` | 10 | HISTÓRICA protegida en la intervención. |
| `bookings_archive_catalogo_20260718` | 9 | HISTÓRICA/SENSIBLE. Protegida: posiblemente datos personales. |
| `payments_archive_catalogo_20260718` | 0 | HISTÓRICA protegida. |
| `blocked_slots_archive_catalogo_20260718` | 1 | HISTÓRICA protegida. |
| `room_images_archive_catalogo_20260718` | 10 | HISTÓRICA protegida. |
| `room_videos_archive_catalogo_20260718` | 0 | HISTÓRICA protegida. |

## Control de consistencia comercial — APROBADO

- Seis categorías vigentes con **13 unidades activas**: Estándar 2 × S/120, Ejecutiva 3 × S/140, Doble 2 × S/140, Triple 4 × S/210, Familiar 1 1 × S/250, Familiar 2 1 × S/250.
- Categorías/rooms: **0** diferencias entre capacidades registradas; **0** diferencias de precio base; cantidades coincidentes.
- La 406 está `inactive`, `category_slug = NULL`, con precio residual S/197.20. No afecta inventario activo. **No borrarla** hasta confirmación.
- 14 unidades tienen foto principal; tres videos asociados a habitaciones. **Todos los arreglos `rooms.amenities` están vacíos**, por lo que la ficha de categoría carece de servicios extra modelados por unidad.
- `price_low`, `price_medium`, `price_high` duplican `price_per_night`: mantener temporalmente por compatibilidad. Eliminar campos únicamente después de revisar referencias y migrar el motor de tarifas dinámicas.

## Disponibilidad — ALERTA COMERCIAL, NO ERROR DE BASE

21 bloqueos con `room_id = NULL` y `block_type = day`, aplicables al **hotel completo**:
- 24/10/2026 (1 día).
- 08–15/11/2026 (8 días).
- 23/12/2026–03/01/2027 (12 días).

La función `searchAvailableRoomsService()` contempla explícitamente `bs.room_id IS NULL`; por tanto, bloquea todas las habitaciones en esas fechas. **No retirar** hasta que la administración confirme el calendario.

## Seguridad — CORREGIDO EN PRODUCCIÓN

Aplicadas mediante migraciones Supabase:
1. `harden_hotel_public_access_20261019`: elimina los privilegios de `anon`/`authenticated` sobre seis archivos históricos, categorías y dos vistas administrativas. Activa RLS en 7 tablas. Configura `security_invoker=true` en las dos vistas.
2. `pin_hotel_trigger_search_paths_20261019`: fija `search_path=pg_catalog, public` en siete funciones trigger y añade `idx_bookings_customer_id` para una FK sin índice.

**Verificación posterior:** todos los objetos afectados sin permisos públicos de lectura/actualización; lectura del rol interno conservada; vistas internas consultables; conteo de categorías, habitaciones y bloqueos intacto. Advisors ya no informa las alertas de RLS desactivado, vistas SECURITY DEFINER, search_path mutable ni FK de bookings sin índice.

**Advertencias aún presentes:** 25 tablas con RLS sin políticas (arquitectura backend/pg; verificar necesidades de roles), una tabla histórica sin PK e índices aún no utilizados. **No eliminarlos** basándose solo en estadísticas de uso.

## Arquitectura actual vs. lógica deseada

`React/Vite (web) → API Node/Express (Render) → PostgreSQL/Supabase`; Meta IG/FB → backend IA → Supabase. La web no utiliza `supabase-js` directamente según el código revisado. El channel manager/Beds24 y WhatsApp Meta son integraciones **separadas**.

### Pendientes por fase y criterio de aceptación

1. **Verificar producción real:** realizar GET del endpoint `/api/rooms/categories` y disponibilidad de categoría con Render desde entorno accesible, probar panel administrativo y el asesor después del cambio de RLS. Las pruebas SQL como propietario no garantizan el usuario de BD configurado en Render.
2. **Confirmación comercial:** validar con propietarios los 21 bloqueos globales, uso de habitación 406, lista de servicios publicada y tarifa infantil 5–8 años. Sin aprobación **no actualizar contenidos ni inventarios**.
3. **Fuente única de servicios:** migrar la lista de `Services.jsx` al catálogo `services` aprobado; exponer API de solo lectura, conectar frontend e IA, y probar sin inventar servicios.
4. **Tarifas dinámicas:** diseñar `rate_rules`, `rate_calendar` y un flujo de aprobación humana; precios vigentes del catálogo no deben cambiar sin autorización. Evitar que reglas de fines de semana/feriados afecten canales OTAs mientras no haya PMS/Channel Manager.
5. **Reservas y pagos:** pruebas controladas de creación por categoría, idempotencia, capacidad, bloqueos globales, verificación de pagos y cancelaciones, con rollback/limpieza de datos de prueba. No generar reservas ficticias en producción.
6. **Depuración futura:** solo después de pruebas de dependencia, respaldar y sacar archivos históricos del esquema expuesto, evaluar `gallery` y `tourism_places` sin uso, y posibles campos de tarifas antiguos.

**Sin autorización adicional no eliminar historiales, desactivar bloqueos o cambiar tarifas.**


## Fase 2 — Auditoría ampliada (continuación del 19/10/2026)

### Correcciones realizadas en el backend

- [PR #33 — Disponibilidad](https://github.com/EliasCastanedaM/casaHuespedesProy/pull/33): `searchAvailableRoomCategoriesService` ahora verifica `availability_status='available'` y `rooms.status='active'` al computar `available_quantity`, aun cuando el consumidor especifique `available_only=false`. Antes podía sumar unidades bloqueadas como disponibles en un resumen administrativo. Pruebas de mantenimiento, bloqueo de unidad y bloqueo global sin cambios de inventario.
- [PR #34 — Precios](https://github.com/EliasCastanedaM/casaHuespedesProy/pull/34): cuando el administrador actualiza expresamente `price_per_night`, el backend sincroniza `price_low`, `price_medium`, `price_high` para evitar incoherencias de legado. Cambios de descripción/fotos no modifican los campos antiguos. **No se han alterado tarifas actuales.**

La rama principal ha pasado **148/148 pruebas del backend** y compilación web en CI sobre PR #34. La validación real en Render sigue pendiente por limitaciones de acceso a su endpoint desde este entorno.

### Verificación de integridad con SQL de solo lectura

| Prueba | Resultado |
|---|---|
| Habitaciones activas sin categoría | 0 |
| Fotografías huérfanas | 0 |
| Videos huérfanos | 0 |
| Habitaciones activas sin fotos | 0 |
| Habitaciones activas sin exactamente una foto principal | 0 |
| Bloqueos de mismo cuarto/fecha/tipo/hora duplicados | 0 |
| Correos o teléfonos de clientes duplicados | 0 |
| Reservas operativas / pagos operativos | 0 / 0 |
| Conversaciones Meta / mensajes Meta | 12 / 322 |

Simulación read-only del calendario con los filtros equivalentes al backend:

| Ejemplo | Unidades activas | Unidades sin bloqueo |
|---|---:|---:|
| 22–23/oct | 13 | 13 |
| 24–25/oct (bloqueo global) | 13 | 0 |
| 08–09/nov (bloqueo global) | 13 | 0 |
| 16–17/nov | 13 | 13 |
| 24–25/dic (bloqueo global) | 13 | 0 |

Esto valida que los bloqueos globales se reconocen correctamente. **NO implica que 13 unidades estén realmente disponibles en Booking o Airbnb:** dichos canales no sincronizan todavía con esta base mediante channel manager; podrían tener reservas externas.

### Reservas y pagos: controles identificados en el código

- `createBookingByCategoryService` selecciona una unidad activa dentro de su categoría, usa locks transaccionales (categoría + unidad) y vuelve a verificar disponibilidad antes del INSERT.
- Hay pruebas automatizadas de idempotencia por `booking_intent_id`, dos solicitudes concurrentes, reversión si falla el INSERT de pago y ausencia de correos duplicados en reintentos.
- `reportBookingPaymentService` marca `payment_reported`, **no acredita cobro por sí solo**; la confirmación final del personal es indispensable y está protegida con transición de estado.
- `bookings` y `payments` están vacías: todavía falta prueba de extremo a extremo **en un entorno aislado**, incluyendo bloqueo, anticoincidencia de reservas simultáneas, reporte de pago, verificación humana, cancelación y liberación de stock.
- Verificar en fase 3 si todas las transiciones administrativas de estado deben restringirse por una máquina de estados más estricta; no modificar estados sin aprobación operativa.

### Integraciones y contenido pendientes

- El sitio web toma categorías/precios de PostgreSQL, pero los servicios `frontend/src/pages/public/Services.jsx` y los lugares turísticos están definidos en el frontend, mientras `services` y `tourism_places` permanecen vacías.
- Antes de mover información a `services`, validar con la administración qué servicio está incluido, adicional, sujeto a disponibilidad y a qué tarifa; no publicar precios ni servicios no aprobados.
- Los bloqueos de 21 días, la unidad 406 y las tarifas de temporada deben permanecer intactos hasta confirmación comercial. También se requiere diseñar cómo accederán los administradores autorizados a la futura edición por WhatsApp.
- El backend Render no fue accesible desde el ambiente de auditoría para una prueba directa de los endpoints; sí se verificó ejecución SQL interna, pruebas CI y compilación. La prueba con el usuario/rol real de Render queda pendiente.
