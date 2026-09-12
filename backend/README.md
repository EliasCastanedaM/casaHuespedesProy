# Backend Casa Huéspedes Pimentel

API de reservas y asesor GPT para Casa Huéspedes Pimentel. Conserva el flujo
actual del sitio, añade una consulta única de disponibilidad y deja preparados
WhatsApp, Facebook Messenger e Instagram mediante webhooks de Meta.

## Qué incluye

- Reservas, habitaciones, clientes, pagos reportados, galería y consultas.
- Panel administrativo protegido con JWT.
- Disponibilidad por rango completo de fechas, capacidad y bloqueos.
- Bloqueo de concurrencia para evitar dos reservas simultáneas de una habitación.
- Asesor GPT con herramientas que consultan PostgreSQL; no inventa cupos ni precios.
- Memoria de conversación mediante la Responses API de OpenAI.
- Webhook con validación de firma e idempotencia para canales de Meta.
- CORS por lista permitida, cabeceras de seguridad y límites de solicitudes.
- Migración SQL aditiva: no borra reservas ni habitaciones existentes.

## Estructura

```text
database/
  migrations/        Cambios idempotentes para Supabase
  schema.sql          Esquema inicial para una base nueva
src/
  config/             Entorno, PostgreSQL y servicios externos
  middlewares/        Autenticación, seguridad, límites y errores
  modules/            Auth, habitaciones, reservas, disponibilidad, IA y Meta
  services/           Correos
test/                 Pruebas automáticas
```

## Requisitos

- Node.js 20 o superior.
- PostgreSQL/Supabase.
- Una clave de OpenAI para activar el asesor.
- Credenciales de Meta únicamente para los canales que se conectarán.

## Desarrollo local

```bash
npm ci
cp .env.example .env
npm run dev
```

Completa por lo menos `DATABASE_URL` y un `JWT_SECRET` de 32 caracteres o más.
Nunca subas `.env` a Git ni pegues secretos en el frontend.

## Base de datos

Para tu Supabase existente ejecuta solamente:

```text
database/migrations/2026-09-01-production-ready.sql
```

La migración añade columnas, índices, bloqueos y tablas del asesor. Es
idempotente y no contiene `DROP`, `TRUNCATE` ni `DELETE` de datos de negocio.
Haz una copia de seguridad antes de cualquier cambio de producción.

Para una base vacía: ejecuta primero `database/schema.sql`, luego la migración.
`database/seed.sql` contiene datos demostrativos y no debe ejecutarse sobre tu
base real salvo que conscientemente quieras agregarlos.

## Endpoints principales

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| GET | `/api/health` | Público | Estado del proceso y configuración de IA |
| POST | `/api/auth/login` | Público limitado | Inicio de sesión administrativo |
| GET | `/api/bookings` | JWT admin/staff | Estado de todas las reservas |
| POST | `/api/bookings/check-availability` | Público | Compatibilidad con la web actual |
| POST | `/api/availability/search` | Público | Búsqueda estructurada de habitaciones |
| POST | `/api/bookings` | Público limitado | Solicitud de reserva |
| POST | `/api/ai/chat` | `x-ai-token` si se configura | Asesor para web o proveedor externo |
| GET/POST | `/api/meta/webhook` | Verificación/firma Meta | WhatsApp, Facebook e Instagram |

Las operaciones de escritura de habitaciones, galería, bloqueos, consultas y
configuración requieren `Authorization: Bearer <JWT>`.

## Probar disponibilidad

```bash
curl -X POST http://localhost:4000/api/availability/search \
  -H "Content-Type: application/json" \
  -d '{"check_in":"2026-09-10","check_out":"2026-09-13","guests_count":2}'
```

La salida se considera el día de liberación: una reserva que sale el 13 no
bloquea otra que ingresa el 13.

## Probar el asesor

```bash
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "x-ai-token: TU_AI_INTERNAL_TOKEN" \
  -d '{"channel":"web","session_id":"prueba-1","message":"¿Hay habitación del 10 al 13 de septiembre para 2 personas?"}'
```

El asesor solo consulta. No crea reservas, no confirma pagos y no pide tarjetas.
La reserva continúa por el formulario actual de la web.

## Canales

- **WhatsApp:** WhatsApp Cloud API envía eventos a `/api/meta/webhook`.
- **Facebook:** Messenger Platform usa el mismo webhook.
- **Instagram:** Instagram Messaging usa el mismo webhook y el token de página.
- **TikTok:** este paquete acepta `channel: "tiktok"` en `/api/ai/chat`, pero la
  conexión directa requiere acceso a una API o proveedor aprobado por TikTok.
  El proveedor debe reenviar el texto a ese endpoint y publicar la respuesta.

Para Meta configura `META_VERIFY_TOKEN`, `META_APP_SECRET`,
`META_GRAPH_API_VERSION` y las variables del canal. Consulta `META_SETUP.md` para
los pasos completos. En producción el backend
rechaza webhooks sin firma válida.

## Pruebas

```bash
npm test
npm audit --omit=dev
```

Consulta [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para publicar en Render y
conectar los canales sin interrumpir la web actual.

## Referencias de OpenAI

- [Function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [Estado de conversación](https://developers.openai.com/api/docs/guides/conversation-state)
