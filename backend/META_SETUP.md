# Integración Meta de Casa Huéspedes Pimentel

Esta guía configura el mismo asesor de `POST /api/ai/chat` para responder mensajes
de WhatsApp Business, Instagram Direct y Facebook Messenger. No se crea otro
prompt ni otra fuente de datos: el servicio `generateAiReply()` continúa usando
la disponibilidad, habitaciones y precios vigentes en Supabase.

## Datos técnicos

- Callback público: `https://casa-real-huespedes-backend.onrender.com/api/meta/webhook`
- Método de verificación: `GET`
- Recepción de eventos: `POST`
- Firma validada: `X-Hub-Signature-256` con HMAC-SHA256 y `META_APP_SECRET`
- Graph API documentada: `v26.0`, publicada por Meta el 29 de julio de 2026
- Alcance inicial: texto. Imágenes, audio, video, documentos, stickers y ubicación
  reciben una indicación para escribir la consulta como texto.

Documentación oficial de referencia:

- [Graph API v26.0](https://developers.facebook.com/docs/graph-api/changelog/version26.0)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhooks de WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [Instagram Messaging API con Facebook Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/messaging-api)

Meta puede cambiar los nombres o la ubicación de las pantallas. Antes de solicitar
App Review, confirma los requisitos actuales en los enlaces oficiales.

## 1. Preparar Supabase

Antes del nuevo despliegue, abre **Supabase > SQL Editor** y ejecuta, en este
orden, los archivos que todavía no estén aplicados:

1. `database/migrations/2026-09-01-production-ready.sql`
2. `database/migrations/2026-09-11-meta-handoff.sql`

La segunda migración crea `meta_conversations`, donde se guarda si el bot está
pausado para atención humana. También garantiza la tabla de deduplicación
`ai_processed_messages`. Ambas migraciones son aditivas e idempotentes.

## 2. Variables exactas de Render

Las variables comunes obligatorias cuando se activa al menos un canal de Meta son:

```text
META_VERIFY_TOKEN=<texto aleatorio elegido por ti>
META_APP_SECRET=<App Secret de la aplicación Meta>
META_GRAPH_API_VERSION=v26.0
```

El valor de `META_VERIFY_TOKEN` no lo entrega Meta: crea una cadena aleatoria y
coloca exactamente el mismo valor en Render y en el formulario del webhook. No
lo publiques ni lo subas a Git.

Para WhatsApp:

```text
WHATSAPP_ACCESS_TOKEN=<token de acceso de WhatsApp Cloud API>
WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID, no el número telefónico>
```

Para Facebook Messenger:

```text
FACEBOOK_PAGE_ACCESS_TOKEN=<Page Access Token>
FACEBOOK_PAGE_ID=<ID numérico de la página>
```

Para Instagram profesional mediante Facebook Login:

```text
INSTAGRAM_ACCOUNT_ID=<ID numérico de instagram_business_account>
INSTAGRAM_ACCESS_TOKEN=<Page Access Token con permisos de Instagram>
```

`INSTAGRAM_ACCESS_TOKEN` puede omitirse si es exactamente el mismo token ya
guardado en `FACEBOOK_PAGE_ACCESS_TOKEN`; el backend usa ese token como respaldo.
No son necesarias en tiempo de ejecución `META_APP_ID`, el WABA ID ni el Business
Account ID, por eso no se agregaron como variables.

Las variables existentes del asesor deben conservarse:

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
AI_MAX_OUTPUT_TOKENS=500
AI_INTERNAL_TOKEN=...
HOTEL_NAME=Casa Huéspedes Pimentel
HOTEL_PHONE=...
HOTEL_WEBSITE=https://casa-huespedes-proy.vercel.app/
DATABASE_URL=...
```

No coloques ningún token en el frontend, en `META_SETUP.md`, en `.env.example` ni
en los logs.

## 3. Crear o preparar la aplicación de Meta

1. En [Meta for Developers](https://developers.facebook.com/apps/) crea una app
   del tipo **Business** o agrega a una app Business existente los casos de uso
   de WhatsApp, Messenger e Instagram.
2. Vincula la app al portafolio comercial de Casa Huéspedes Pimentel.
3. En **Configuración > Básica**, copia el **App Secret** solamente a
   `META_APP_SECRET` en Render.
4. Mantén la app en modo desarrollo mientras haces pruebas. En ese modo solo los
   administradores, desarrolladores, testers y usuarios de prueba autorizados
   pueden interactuar con ella.
5. Agrega una política de privacidad y una URL de eliminación de datos antes de
   solicitar revisión o pasar a modo Live, si Meta las solicita.

## 4. Registrar el webhook

En cada producto/caso de uso registra:

```text
Callback URL: https://casa-real-huespedes-backend.onrender.com/api/meta/webhook
Verify token: el mismo valor de META_VERIFY_TOKEN
```

Meta hará un `GET` con `hub.mode`, `hub.verify_token` y `hub.challenge`. El backend
solo devuelve el challenge cuando el token coincide. Los `POST` posteriores se
aceptan únicamente con una firma válida en producción.

## 5. WhatsApp Business

1. Agrega el producto/caso de uso **WhatsApp**.
2. Conecta la cuenta de WhatsApp Business y el número que utilizará Casa
   Huéspedes. Si el número ya está en WhatsApp Business App, revisa primero si la
   cuenta admite coexistencia o si requiere migración; no migres el número sin
   respaldo y autorización del propietario.
3. En **WhatsApp > API Setup** copia el **Phone Number ID** a
   `WHATSAPP_PHONE_NUMBER_ID`.
4. Para la primera prueba puedes usar el token temporal del panel. Para producción
   crea un usuario del sistema en Business Manager, asigna los activos necesarios
   y genera un token de larga duración/permanente según las opciones disponibles.
5. Guarda el token en `WHATSAPP_ACCESS_TOKEN`.
6. En la configuración de Webhooks selecciona el objeto
   `whatsapp_business_account` y suscribe el campo `messages`.
7. Permisos normalmente requeridos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management` para administrar/consultar los activos durante
     la configuración
8. Agrega un número destinatario de prueba y envía un texto al número de prueba de
   Meta. Confirma en Render que el webhook respondió `200` y que llegó una sola
   respuesta.

Para conversaciones iniciadas fuera de la ventana permitida por WhatsApp se
requieren plantillas aprobadas. Esta integración responde mensajes entrantes; no
implementa campañas ni mensajes masivos.

## 6. Facebook Messenger

1. Agrega el producto/caso de uso **Messenger**.
2. Vincula la página oficial de Facebook de Casa Huéspedes.
3. Genera un **Page Access Token** para esa página y guárdalo en
   `FACEBOOK_PAGE_ACCESS_TOKEN`.
4. Guarda el ID numérico de la página en `FACEBOOK_PAGE_ID`.
5. Suscribe la página al webhook y activa el campo `messages` del objeto `page`.
   `messaging_postbacks` es opcional; el backend actual lo reconoce como evento no
   textual y no implementa botones/postbacks.
6. Permisos normalmente requeridos:
   - `pages_messaging`
   - `pages_manage_metadata` para suscribir la página al webhook
   - `pages_show_list` para localizar las páginas administradas durante el alta
7. Con una cuenta que tenga rol en la app, abre Messenger y envía un texto a la
   página. Confirma una respuesta y revisa que los mensajes enviados por la propia
   página no generen un bucle.

## 7. Instagram Direct

La implementación está preparada para **Instagram API con Facebook Login**, que
requiere una cuenta profesional de Instagram vinculada a la página de Facebook.

1. Cambia la cuenta de Instagram a Business o Creator si todavía es personal.
2. Vincúlala a la página de Facebook usada en la sección anterior.
3. Agrega Instagram a la aplicación y habilita el acceso a mensajes.
4. Obtén el ID mediante el campo `instagram_business_account` de la página y
   guárdalo en `INSTAGRAM_ACCOUNT_ID`.
5. Usa un Page Access Token con permisos de Instagram en
   `INSTAGRAM_ACCESS_TOKEN`, o reutiliza `FACEBOOK_PAGE_ACCESS_TOKEN`.
6. Suscribe el campo `messages` del objeto `instagram`.
   `messaging_postbacks` es opcional y no se procesa como texto.
7. Permisos normalmente requeridos para este flujo:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_manage_metadata`
   - `pages_show_list`
8. Activa en la cuenta profesional la opción que permite a aplicaciones conectadas
   acceder a mensajes, si aparece en la configuración de Instagram.
9. Desde una cuenta tester distinta, envía un DM de texto y confirma una sola
   respuesta.

Si Meta configura la app con **Instagram Login** en lugar de Facebook Login, los
permisos y el host/token pueden ser distintos (por ejemplo,
`instagram_business_manage_messages`). No mezcles ambos flujos: esta versión del
backend usa el flujo con Facebook Login y `graph.facebook.com`.

## 8. Revisión y paso a producción

1. Graba una prueba completa de cada permiso solicitado para App Review.
2. Solicita acceso avanzado para los permisos que Meta marque como necesarios.
3. Completa la verificación del negocio si Meta la exige.
4. Cambia los tokens temporales por tokens aptos para producción.
5. Pasa la aplicación a modo **Live** solamente después de probar los tres canales.
6. Supervisa errores `401`, `403`, límites de API y expiración de tokens en Render.
7. Respeta las ventanas de atención y políticas de automatización de cada canal.

## 9. Handoff humano

Frases como “quiero hablar con una persona”, “asesor humano” o “necesito ayuda de
una persona” activan el handoff. El bot envía una confirmación una sola vez y deja
de responder automáticamente a ese usuario en ese canal.

Los endpoints de administración están protegidos por el mismo JWT del panel:

```text
GET /api/meta/handoffs
PATCH /api/meta/handoffs/:channel/:externalUserId
Body: { "active": true | false }
```

Ejemplo PowerShell para listar conversaciones pausadas:

```powershell
$headers = @{ Authorization = "Bearer TU_JWT_ADMIN" }
Invoke-RestMethod `
  -Method Get `
  -Uri "https://casa-real-huespedes-backend.onrender.com/api/meta/handoffs" `
  -Headers $headers
```

Para reactivar el bot después de que una persona termine la atención:

```powershell
$headers = @{
  Authorization = "Bearer TU_JWT_ADMIN"
  "Content-Type" = "application/json"
}
Invoke-RestMethod `
  -Method Patch `
  -Uri "https://casa-real-huespedes-backend.onrender.com/api/meta/handoffs/whatsapp/51999999999" `
  -Headers $headers `
  -Body '{"active":false}'
```

Usa `whatsapp`, `instagram` o `facebook` y el identificador externo mostrado por
el endpoint de handoffs. No uses el mismo ID para asumir que una persona es la
misma en canales distintos.

## 10. Prueba técnica del webhook

Verificación local conceptual:

```text
GET /api/meta/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=123
```

Debe responder `123`. Un token incorrecto debe responder `403`. Los eventos `POST`
reales deben ser enviados por Meta, porque requieren una firma calculada con el
App Secret. No envíes mensajes reales a clientes durante pruebas automatizadas.

El endpoint independiente del asesor sigue disponible:

```powershell
$headers = @{
  "x-ai-token" = "TU_AI_INTERNAL_TOKEN"
  "Content-Type" = "application/json"
}
$body = @{
  channel = "web"
  session_id = "prueba-1"
  message = "¿Hay habitaciones disponibles para 2 personas?"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://casa-real-huespedes-backend.onrender.com/api/ai/chat" `
  -Headers $headers `
  -Body $body
```

## 11. Despliegue y diagnóstico

1. Ejecuta las dos migraciones de Supabase.
2. Configura las variables de Render sin comillas adicionales.
3. Despliega el backend. Sí, este cambio requiere redeploy.
4. Comprueba `GET /api/health` y luego la verificación del webhook.
5. Prueba primero WhatsApp, después Messenger y finalmente Instagram.

Si OpenAI o Meta fallan, el error se registra sin tokens ni stack traces para el
cliente. Los envíos a Meta se reintentan hasta tres veces sin volver a llamar al
asesor. En producción, si la deduplicación o el handoff no pueden consultar
Supabase, el mensaje no se procesa para evitar respuestas dobles o mezclar estados.

Limitación operativa: el backend confirma rápidamente el webhook y termina el
trabajo en segundo plano dentro del proceso de Render. Para el volumen previsto de
Casa Huéspedes esto evita infraestructura adicional. Si en el futuro el tráfico o
la criticidad aumentan, conviene migrar el procesamiento a una cola durable con un
worker independiente.
