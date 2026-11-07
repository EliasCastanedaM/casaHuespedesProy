# Avisos de solicitudes de reserva — primer piloto

Este cambio **NO envía mensajes** hasta que se configure explícitamente el backend.
El primer destinatario autorizado para la prueba es **+51 938 345 478**.
No registrar el número del señor Pepe como destinatario durante el piloto.

## 1. Base de datos

Aplicar la migración `database/migrations/2026-11-07-booking-alert-outbox.sql`
en la base de datos del proyecto Casa Huéspedes Pimentel antes de activar el envío.

El disparador registra una alerta únicamente cuando `ai_conversations.booking_context.whatsapp_mvp.state`
pasa de `quoted` a `handoff` con la misma cotización válida.
Se evita notificar un handoff genérico. La clave única evita duplicados de una
misma aceptación. La cola sobrevive reinicios y se recupera cada 60 segundos.

No se requiere modificar Facebook ni Instagram: las tres plataformas comparten
el mismo flujo de cotización; el destinatario siempre es WhatsApp.

## 2. Meta Business Manager

Para el piloto, el usuario de prueba ya debe haber escrito al hotel por WhatsApp en las últimas 23 horas. El backend verifica esto antes de enviar un mensaje de texto, con la etiqueta PRUEBA — NO ES UNA RESERVA REAL. Para el uso estable con Pepe, crear y obtener aprobación de una plantilla de categoría **UTILITY** con nombre
`solicitud_reserva_admin`, idioma **es** y cuerpo exactamente:

```text
Nueva solicitud de reserva
Canal: {{1}}
Cliente: {{2}}
Contacto: {{3}}
Fechas: {{4}}
Huéspedes: {{5}}
Categoría: {{6}}
Preferencias: {{7}}
Total cotizado: {{8}}
Pendiente de revisión de disponibilidad. Abre el panel del hotel.
```

No inventar estados ni afirmar que la reserva se ha confirmado. Meta puede
rechazar una plantilla por contenido o categoría y solicitar ajustes.
El administrador debe haber autorizado recibir las notificaciones.

## 3. Configuración de Render, solo para la prueba

```env
BOOKING_ALERT_ENABLED=true
BOOKING_ALERT_TO=51938345478
BOOKING_ALERT_MODE=session_text
BOOKING_ALERT_PILOT_SOURCE=51938345478
# Solo al pasar a producción con plantilla aprobada:
BOOKING_ALERT_TEMPLATE_NAME=solicitud_reserva_admin
BOOKING_ALERT_TEMPLATE_LANGUAGE=es
```

Se requieren también `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` y
`META_GRAPH_API_VERSION` con permisos para enviar desde el número comercial.
No colocar tokens en GitHub ni en el navegador.

Mientras no se apruebe la plantilla de uso estable, realizar exclusivamente la prueba `session_text` con el propio número 51938345478, y solo si su conversación sigue dentro de la ventana de 24 horas. El modo piloto restringe las alertas a solicitudes de ese mismo número y canal WhatsApp; no procesa solicitudes reales de otros clientes. Si la ventana ya cerró, el backend no envía el mensaje y registra la falla.

Para migrar a Pepe: `BOOKING_ALERT_MODE=template`, `BOOKING_ALERT_PILOT_SOURCE=` (vacío), `BOOKING_ALERT_TO=51943030098` y plantilla aprobada. Hacerlo solamente después de una confirmación explícita de que el piloto funcionó.

## 4. Pruebas y verificación

1. Ejecutar `npm test` en `backend/`.
2. Aceptar una cotización de prueba desde WhatsApp, Facebook o Instagram;
   verificar que aparece como atención manual en el panel.
3. Comprobar en la base de datos: `SELECT id, channel, status, attempts, sent_at,
   meta_message_id FROM public.booking_alert_outbox ORDER BY id DESC LIMIT 10;`
4. Verificar recepción efectiva de la alerta en el WhatsApp de prueba
   (+51 938 345 478). Un `meta_message_id` significa **aceptación por Meta**,
   pero no garantiza por sí solo que la notificación haya sido entregada.
5. Repetir el webhook no debería crear otra fila de alerta para la misma cotización.
6. Repetir el flujo desde Facebook e Instagram. No se debe mostrar el PSID/IGSID
   como teléfono: se usa el teléfono si el cliente lo proporcionó; de lo contrario,
   el mensaje remite al panel.

Solo después de confirmar la recepción satisfactoria del piloto, actualizar
`BOOKING_ALERT_TO` en Render a `51943030098` (señor Pepe). **Nunca** enviar
la alerta al señor Pepe durante las primeras pruebas.

**Privacidad:** la carga con datos del cliente es privada, inaccesible a los roles
públicos de Supabase, y se elimina de la cola tras un envío aceptado por Meta.
No incluir datos del cliente en logs de aplicación.

**Limitación conocida:** el proceso vuelve a intentar elementos bloqueados si
la instancia se reinicia antes de registrar la aceptación de Meta; en esa ventana
muy específica puede haber una alerta duplicada. Las solicitudes no se convierten
en reservas hasta su aprobación humana.

## 5. Prueba dirigida sin crear una reserva real

Después de desplegar y migrar la base de datos, insertar una fila de prueba
única en `booking_alert_outbox` desde un administrador autorizado, con
`channel='whatsapp'`, `external_user_id='51938345478'`, y datos
marcados como ficticios. La recuperación procesará el evento sin llamar a
`createBooking` ni modificar reservas. El texto debe comenzar con
`PRUEBA DE SISTEMA — NO ES UNA RESERVA REAL`.
