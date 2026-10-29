# Embedded Signup de WhatsApp: preparación de coexistencia

Esta implementación añade una pantalla administrativa protegida y dos endpoints para preparar el flujo de coexistencia. No activa el flujo automáticamente.

## Configuración en Render

Añadir o verificar estas variables en el servicio backend:

- `META_APP_ID=902787755987875`
- `META_EMBEDDED_SIGNUP_CONFIG_ID=1425475549078422`
- `META_EMBEDDED_SIGNUP_ENABLED=false` mientras la revisión de Meta esté pendiente.
- `META_APP_SECRET`: conservar el secreto ya configurado; nunca copiarlo al frontend.

El backend consulta `META_APP_SECRET` para el intercambio del código, pero no lo devuelve al navegador.

## Configuración en Meta

1. Mantener la configuración de Facebook Login for Business que se creó para WhatsApp Embedded Signup.
2. Confirmar que el dominio del panel y las URLs OAuth permitidas coincidan con el dominio real de despliegue.
3. Mantener las suscripciones de webhooks `messages`, `history`, `smb_app_state_sync` y `smb_message_echoes`.
4. Esperar la aprobación de los permisos solicitados antes de habilitar el botón de registro real.

## Flujo de la página administrativa

La ruta es `/admin/coexistencia-whatsapp`. Requiere sesión administrativa.

- Obtiene el estado de la configuración desde `GET /api/meta/embedded-signup/status`.
- El botón solo se habilita cuando `META_EMBEDDED_SIGNUP_ENABLED=true`, la configuración del backend está completa, el SDK de Meta está listo y el administrador confirma que está autorizado para iniciar el registro.
- El inicio de sesión usa la configuración guardada y el parámetro `featureType: whatsapp_business_app_onboarding` con `sessionInfoVersion: "3"`.
- La página espera el evento `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` y el código de autorización antes de llamar a `POST /api/meta/embedded-signup/complete`.
- El backend intercambia el código en Meta, consulta los números de la WABA y devuelve únicamente sus identificadores y datos públicos del número.
- El token obtenido en el intercambio no se guarda, no se devuelve y no se registra en logs. Este flujo no cambia `WHATSAPP_ACCESS_TOKEN` ni `WHATSAPP_PHONE_NUMBER_ID`.

## Después de la incorporación

No cambiar el Phone Number ID ni el token activos del asesor automáticamente. Primero comprobar que el token de sistema existente tenga acceso a la WABA incorporada. Si no lo tiene, planificar una actualización explícita y segura de credenciales antes de dirigir mensajes de producción al número comercial.

## Seguridad

No habilitar `META_EMBEDDED_SIGNUP_ENABLED=true` hasta que Meta haya aprobado la revisión y el titular del negocio esté preparado para completar la vinculación en el teléfono. El código de autorización es de un solo uso; ante un fallo del intercambio, iniciar una sesión nueva en lugar de reutilizar el código.
