# Manual de uso — Panel comercial Casa Huéspedes Pimentel

**Ruta interna:** `/admin/reglas-comerciales`  
**Acceso:** iniciar sesión en `/admin/login` con el acceso existente.  
**Pensado para recepción y gerencia:** formularios grandes, lenguaje sencillo, usable en Android e iPhone desde el navegador. No es una aplicación móvil instalable.

## Tres secciones

### 1. Reglas de la casa
- Se visualizan las 19 reglas almacenadas en `hotel_policy_rules`.
- No se editan documentos JSON ni se necesita acceso a Supabase.
- Para cambiar un dato permitido: elegir la regla → cambiar número/opción → escribir el motivo → «Enviar para aprobación».
- La propuesta NO cambia la regla vigente hasta que un usuario con rol `admin` apruebe.
- Se bloquean modificaciones de banderas de seguridad y automatización (p.ej. `auto_charge`, `automatic_price_changes`).
- Se valida el rango de porcentajes e importes; si se intenta aprobar una propuesta basada en una regla que ya cambió, se rechaza y se solicita revisión.
- Para mascotas: no se puede aprobar como regla definitiva sin especificar si se cobra `por mascota y noche` o `por estadía`. La IA seguirá respondiendo con cautela mientras permanezca pendiente.
- Para 9 años o más: la regla exige confirmar explícitamente la condición antes de marcarla como verificada.

### 2. Temporadas y feriados
- Registrar título, tipo, fechas incluidas, noches mínimas, aumento o reducción sugerida, adelanto y observaciones.
- Solo `admin` aprueba. No permite dos temporadas aprobadas **del mismo tipo** en fechas superpuestas.
- **Una temporada aprobada NO bloquea habitaciones ni aplica mínimos, anticipos o precios automáticamente.** Es un calendario comercial documentado para la siguiente fase del motor de reservas.
- El calendario operativo de `blocked_slots` sigue siendo independiente. Los 21 bloqueos existentes no cambian.

### 3. Tarifas propuestas
- Elegir una de las seis categorías y fechas de aplicación; introducir tarifa sugerida y motivo.
- El formulario muestra precio Full vigente y variación porcentual.
- No acepta propuestas fuera de -30 % a +50 % del precio Full, según la matriz comercial aportada.
- La aprobación se registra con usuario/fecha. No se aprueba una tarifa cuando la base cambió desde que se creó la propuesta, ni cuando ya hay otra aprobada para la misma categoría y fechas.
- **No altera `room_categories`, no cobra al huésped, ni sincroniza Booking/Airbnb.**
- Una recomendación aprobada aquí NO es una tarifa activa del motor de reservas. La integración del calendario de tarifas por fecha sigue pendiente y requerirá pruebas de pagos y ocupación.

## Roles y seguridad
- `staff`: ver y presentar propuestas.
- `admin`: ver, presentar, aprobar o rechazar propuestas.
- Las tres tablas de auditoría están protegidas por RLS y sin acceso directo `anon`/`authenticated`; la interfaz se comunica con Node/Render usando JWT del administrador.
- El endpoint directo que modifica la tarifa Full por categoría ahora requiere rol `admin`, evitando que `staff` evite el flujo de aprobación.
- Cada registro conserva identificador, fecha, proponente, estado y decisión.

## Datos y despliegue

Migración: `backend/database/migrations/2026-10-19-admin-commercial-panel.sql`.
Aplicada a producción como `commercial_admin_approval_workflow_20261019`.
Tablas creadas:
- `hotel_rule_proposals`
- `hotel_seasons`
- `hotel_rate_proposals`

Se reutilizan:
- `hotel_policy_rules`, `room_categories`, `users`

Ruta backend protegida: `/api/admin/commercial/overview` y solicitudes/decisiones REST de reglas, temporadas y tarifas.

**Pruebas:** `node --test` del backend, compilación de frontend, validación de auth y concurrencia. La comprobación final de la interfaz de producción depende de que Render y Vercel hayan desplegado `main`.

## Validación manual posterior al despliegue

1. Abrir el panel y entrar en «Reglas y tarifas».
2. Verificar que se muestran 19 reglas, seis categorías y cero solicitudes iniciales.
3. Crear una propuesta para una regla editable sin aprobarla. Verificar que aparece en «Por aprobar» y que la regla vigente no cambia.
4. Aprobar o rechazar desde un usuario `admin` y comprobar historial.
5. Crear una temporada de prueba futura, **no** autorizar una condición comercial real sin acuerdo del cliente. Verificar que no aparece en `blocked_slots`.
6. Proponer una tarifa dentro del rango y comprobar que la base y los cobros no cambian tras aprobar.
7. Verificar que un usuario `staff` recibe 403 al intentar aprobar o cambiar directamente la tarifa Full.

## Próxima fase (NO implementada aquí)

- Definir un motor de precios por fecha aprobado y conectado a `bookings`.
- Calcular tarifa por ocupación, niños, estadías mínimas y anticipos según valores confirmados.
- Automatizar propuestas de la IA y enviarlas a la misma cola de aprobación.
- Si se contrata PMS/channel manager (Beds24 u otro), sincronizar precios aprobados, inventario y reservas con Booking/Airbnb.
