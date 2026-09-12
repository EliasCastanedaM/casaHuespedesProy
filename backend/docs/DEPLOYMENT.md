# Publicación segura en Render y Supabase

Esta guía está pensada para el frontend existente:
`https://casa-huespedes-proy.vercel.app`.

## 1. Antes del despliegue

1. Crea un respaldo de la base de datos en Supabase.
2. Conserva disponible el último despliegue estable de Render para volver a él.
3. No cambies todavía la URL de API usada por Vercel.
4. Ejecuta en Supabase SQL Editor el archivo
   `database/migrations/2026-09-01-production-ready.sql`.
5. Confirma que la consulta terminó con `COMMIT` y sin errores.

## 2. Variables de Render

Configura en **Environment**:

```text
NODE_ENV=production
DATABASE_URL=...
JWT_SECRET=...              # aleatorio, mínimo 32 caracteres
FRONTEND_URLS=https://casa-huespedes-proy.vercel.app
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
AI_MAX_OUTPUT_TOKENS=500
AI_INTERNAL_TOKEN=...       # aleatorio si /api/ai/chat lo consume otro servidor
HOTEL_NAME=Casa Huéspedes Pimentel
HOTEL_PHONE=...
HOTEL_WEBSITE=https://casa-huespedes-proy.vercel.app/
CULQI_PAYMENT_URL=...
HOTEL_NOTIFICATION_EMAIL=...
BREVO_API_KEY=...
EMAIL_FROM_NAME=Casa Huéspedes Pimentel
EMAIL_FROM_EMAIL=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

No uses `AI_INTERNAL_TOKEN` dentro de JavaScript público del navegador. Sirve
para conexiones servidor-a-servidor, por ejemplo un proveedor de TikTok.

Para Meta agrega, según los canales activados:

```text
META_VERIFY_TOKEN=...
META_APP_SECRET=...
META_GRAPH_API_VERSION=v26.0
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
FACEBOOK_PAGE_ACCESS_TOKEN=...
FACEBOOK_PAGE_ID=...
INSTAGRAM_ACCESS_TOKEN=...  # opcional si reutiliza el Page token anterior
INSTAGRAM_ACCOUNT_ID=...
```

## 3. Publicar

Puedes usar `render.yaml` o estos comandos de Render:

```text
Build command: npm ci
Start command: npm start
Health check: /api/health
Node: 20
```

Después del despliegue prueba, en este orden:

1. `GET https://TU-BACKEND.onrender.com/api/health`
2. `GET https://TU-BACKEND.onrender.com/api/rooms`
3. `POST https://TU-BACKEND.onrender.com/api/availability/search`
4. Inicio de sesión en `/admin/login` desde la web.
5. Listado de reservas del panel.
6. Una consulta a `/api/ai/chat`.
7. Una reserva de prueba con fechas controladas y luego su eliminación desde admin.

El health check debe responder `aiConfigured: true` cuando la clave OpenAI esté
correctamente cargada. Esto comprueba presencia de configuración, no consumo ni
saldo de la cuenta.

## 4. Configurar Meta

En la aplicación de Meta registra como callback:

```text
https://TU-BACKEND.onrender.com/api/meta/webhook
```

Usa exactamente el mismo valor de `META_VERIFY_TOKEN` en Render y Meta. Suscribe
los eventos de mensajes del producto correspondiente. Antes de abrir el canal al
público, valida un mensaje entrante y una respuesta para cada cuenta.

La configuración detallada de productos, campos, permisos, pruebas y handoff está
en `META_SETUP.md`.

La aplicación debe contar con los permisos, revisión y cuentas profesionales que
Meta exija. Tener el código del webhook no concede esos permisos.

## 5. TikTok

TikTok no queda conectado automáticamente. Cuando tengas una API o proveedor de
mensajería autorizado, configura el proveedor para:

1. recibir el mensaje de TikTok;
2. llamar `POST /api/ai/chat` con `channel: "tiktok"`, el identificador externo y
   el mensaje;
3. enviar a TikTok el campo `data.reply` devuelto por el backend.

## 6. Reversión

Si aparece un problema:

1. vuelve al despliegue anterior desde Render;
2. conserva la migración: sus cambios son aditivos y el backend anterior ignora
   las tablas y columnas nuevas;
3. revisa logs y reproduce primero en un entorno de prueba.

No elimines tablas ni columnas para revertir con la web atendiendo reservas.
