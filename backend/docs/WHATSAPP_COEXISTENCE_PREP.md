# WhatsApp Business App + Cloud API: preparación segura

Estado: **preparado en rama, no activo en Meta ni desplegado en producción**.

## Objetivo y alcance

Conservar WhatsApp Business en el teléfono y permitir que la Cloud API
atienda el mismo número después del registro insertado de coexistencia.
No cambiar credenciales, plantillas, números, Instagram o Messenger.

Los eventos de WhatsApp Business App difieren de los mensajes entrantes:
- smb_message_echoes: mensajes enviados desde el teléfono. Se registran
  como direction=outgoing, author=admin, status=sent en meta_messages;
  se marca handoff_active=true en el chat. **Jamás se envían al bot**.
- history: se archiva cada bloque firmado en meta_coexistence_events
  sin generar respuestas automáticas. **No aparece aún en el inbox**.
- smb_app_state_sync: se archivan los cambios de contactos en esa misma
  tabla. **No se importan aún al listado operativo de contactos**.

Todos los eventos se deduplican por huella SHA-256, y los ecos se deduplican
también por ID de mensaje. La recepción HTTP 200 ocurre después del COMMIT;
si Supabase falla se devuelve error para que Meta pueda reintentar. El
contenido histórico puede incluir datos sensibles y requiere control de
acceso, conservación y política de eliminación antes del lanzamiento.

## Orden obligatorio de salida

1. Revisar/aceptar PR y ejecutar pruebas: cd backend && npm ci && npm test.
2. Aplicar en Supabase SQL Editor la migración aditiva
   database/migrations/2026-10-28-meta-coexistence-events.sql.
   Requiere las tablas meta_conversations y meta_messages ya existentes.
   No aplicar el cambio de webhook si falta esta tabla.
3. Desplegar el backend en Render y verificar /api/health, logs,
   firma HMAC y llegada de mensajes de prueba.
4. En **Meta > registro insertado > configura un webhook**, mantener
   la URL/token actuales y messages activo. Activar estos tres campos,
   versión 26.0, únicamente tras completar 1–3:
   history, smb_app_state_sync, smb_message_echoes.
5. Hacer pruebas controladas con un número elegible y consentimiento
   explícito del titular para compartir historial/contactos.
6. Para coexistencia, usar registro insertado con
   featureType: whatsapp_business_app_onboarding y comprobar la
   configuración de versión de lanzamiento vigente en Meta. No iniciar el
   registro normal/migración del número.
7. Tras completar el registro integrado, verificar el WABA y el phone_number_id
   reales antes de cambiar variables de envío en Render. Nunca publicar tokens.
   Historial y contactos suelen poder sincronizarse una sola vez en la ventana
   posterior al alta; no iniciar el flujo antes de que el webhook esté listo.

## Pruebas y limitaciones deliberadas

- node --test test/meta-coexistence.test.js: parseo, archivo, deduplicación,
  ecos manuales, ausencia de bucle IA, rollback.
- npm test: suite existente de WhatsApp, Instagram, Messenger y reservas.
- Para ver historial/contactos importados en el panel hará falta una segunda
  etapa de materialización y reglas de retención, sin reactivar el asesor para
  mensajes históricos.
- El handoff humano evita nuevas respuestas del bot, pero requiere una prueba
  extremo a extremo antes de producción para comprobar carreras con mensajes
  ya enviados y confirmar cómo reanudar la atención automática.
- El archivo solo acepta lotes JSON de hasta 8 MB por petición de webhook.
  Si Meta entrega lotes mayores, requiere una solución de streaming/colas.
- No activar las suscripciones desde esta rama ni ejecutar el onboarding real
  hasta que Meta apruebe los permisos aplicables y se verifique elegibilidad.

Fuentes:
- https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
- https://developers.facebook.com/docs/whatsapp/embedded-signup
