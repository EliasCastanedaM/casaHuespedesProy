# Entrega operativa del panel — 31 de octubre de 2026

## Actualización del 5 de noviembre de 2026

El estado de solo lectura de WhatsApp descrito abajo corresponde al alcance
histórico de la entrega del 31 de octubre. El PR #76, incluido en `main`
(`b1d0d07`) y en el despliegue de producción READY de Vercel, habilita respuestas
manuales, cambio IA/humano y resolución/reapertura mediante Cloud API.
Esas acciones no requieren activar Embedded Signup y no vinculan la aplicación
WhatsApp Business del celular. La configuración de coexistencia continúa fuera
de la navegación. La confirmación de reservas WhatsApp sigue bloqueada tanto
en el botón como en `confirmReservation()`; el endpoint administrativo existe,
pero ese paso requiere una decisión operativa posterior.

El backend de Render ejecuta `15f5f8c`. La comparación con `b1d0d07` contiene
solo cambios de frontend y CI; no hay diferencia de código del backend entre
ambas revisiones. Consultar `AUDITORIA_ASESOR_IA_2026-11-05.md` para las
evidencias, límites y plan de pruebas.

## Registro histórico de la entrega del 31 de octubre

## Alcance y reglas

- **Meta / WhatsApp Business:** la coexistencia no está aprobada. No se ejecutó configuración, activación, intercambio de números, webhooks ni pruebas con el teléfono. El enlace de configuración de coexistencia se retira de la navegación; una visita directa se redirige a Mensajes. El historial de WhatsApp permanece visible **solo para consulta** y las acciones de escritura/confirmación en esa pantalla están deshabilitadas mientras no exista aprobación.
- **Booking / Airbnb:** la sincronización de Booking es **otro proyecto**. No se consultan ni escriben API o inventarios externos; tampoco se afirma disponibilidad de otros canales.
- **Reservas reales y privacidad:** ningún dato de reservas, pagos, habitaciones o conversaciones existentes fue modificado en la base.
- **Copia/restauración Supabase:** aún pendiente y no realizada. No ejecutar cambios destructivos hasta respaldos verificados.

## Fase 1 — Control de acceso

- Se reutilizan `ProtectedAdminRoute`, `GET /api/auth/session`, JWT con sesión revocable (backend) y `sessionStorage` (frontend); ninguna vista del calendario se expone públicamente.
- El backend aplica `requireAdminAuth` a `GET /api/bookings/calendar`. Permite `admin` y `staff` autenticados; no permite escritura.
- El código de inicio de sesión/cierre de sesión ya existe. Verificar con un usuario autorizado desde navegador antes de declarar aceptación operativa.

## Fase 2 — Calendario real interno

- Nueva ruta protegida `/admin/calendario` con vistas día/semana/mes y filtro temporal acotado (máximo 31 días).
- Nuevo endpoint `GET /api/bookings/calendar?start=AAAA-MM-DD&days=1..31`, consulta las habitaciones `status='active'`, reservas internas no canceladas/rechazadas/expiradas y bloqueos del período.
- Los estados son: reserva confirmada, solicitud por verificar, bloqueo de día, bloqueo parcial o **sin registro interno**. «Sin registro» nunca significa «disponible para vender».
- Verificación SQL en producción al 31/10: **13 habitaciones activas y 1 inactiva (406), 0 reservas internas**. No borrar la 406 ni generar reservas de ejemplo.

## Fase 3 — Atención de conversaciones

- Se reutiliza `/admin/mensajes` con datos protegidos de Instagram y Facebook y sus acciones ya existentes de atención humana.
- WhatsApp queda en **consulta**: se inhabilitan acciones de modo, marcar resolución, envío y confirmación desde la interfaz, sin tocar backend de Meta ni números. Las conversaciones históricas permanecen visibles.
- Validación del envío real a Instagram/Facebook requiere una conversación de prueba consentida o personal autorizado; no automatizar envíos a huéspedes.

## Fase 4 — Pruebas y salida a producción

- Pruebas `backend/test/admin-calendar.test.js`: fechas inválidas y límites, consulta SQL de solo lectura, filtros internos y 401 sin autenticación.
- Compilación Vite/frontend, pruebas backend, coexistencia Meta sin actividad real y auditoría npm mediante GitHub Actions.
- Verificar Render `live` por SHA y endpoint de salud. Verificar en Vercel **deploy `READY` con el mismo commit o uno posterior** antes de afirmar que la nueva ruta está disponible en la web.
- Las pruebas automáticas no equivalen a una sesión real de administrador; queda por hacer UAT de navegación, lectura, chat Instagram/Facebook, vistas responsive y accesibilidad.

## Criterios de cierre

1. GitHub CI aprobado, sin vulnerabilidades críticas/altas.
2. Render backend con el SHA esperado y smoke test aprobado.
3. Vercel frontend desplegado con el código del calendario y controles de WhatsApp.
4. Prueba autorizada de acceso y calendario en escritorio/móvil, sin crear reservas.
5. Chat Instagram/Facebook confirmado con usuarios de prueba si se autoriza.
6. Aprobación/ejecución separada del procedimiento de respaldo y restauración.

