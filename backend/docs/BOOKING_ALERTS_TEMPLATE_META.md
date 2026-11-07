# Aviso administrativo de reservas: plantilla WhatsApp

## Objetivo

Enviar al WhatsApp del administrador una alerta cuando un huésped acepte
una cotización en **WhatsApp, Facebook o Instagram**. Ninguna alerta confirma
automáticamente disponibilidad ni crea una reserva.

El primer destinatario autorizado es el número de prueba del responsable.
**No activar envíos al señor Pepe durante la validación.**

## Registro de plantilla ante Meta

La plantilla oficial que usa el código es:
- Nombre: solicitud_reserva_admin
- Idioma: es
- Categoría solicitada: UTILITY
- Ocho variables correlativas: canal, cliente, contacto, fechas, huéspedes,
  categoría, preferencias y total cotizado.
- El cuerpo real se mantiene en booking-alerts.service.js.
- Se solicitan muestras ficticias, sin datos personales reales.

La categoría definitiva y aprobación las decide Meta. Si una plantilla ya
existe pero difiere en texto/categoría, el worker se detiene con estado conflict
y **no** la sobrescribe.

La cuenta WABA se verifica contra el ID del teléfono emisor configurado
antes de presentar la plantilla por API. El token nunca se almacena en SQL.

## Migración y envío a revisión

Aplicar backend/database/migrations/2026-11-07-whatsapp-template-submissions.sql.

Tras verificar la identidad de la WABA en un webhook firmado:

    INSERT INTO public.whatsapp_template_submissions
      (template_name, language_code, waba_id)
    VALUES ('solicitud_reserva_admin', 'es', '<WABA_ID_VERIFICADA>')
    ON CONFLICT (template_name) DO NOTHING;

La conexión PostgreSQL privada del backend recogerá la tarea, consultará si
ya existe una plantilla con ese nombre y presentará exactamente una si no
existe. La revisión posterior se consulta cada 15 minutos mientras esté
pendiente. La aprobación puede demorar y no es garantizable.

Consultar estado:

    SELECT template_name, status, provider_status, provider_category,
           attempt_count, last_error, updated_at
      FROM public.whatsapp_template_submissions;

Estados esperados: queued, working, submitted, approved, rejected, conflict,
failed. Un fallo no activa avisos, y puede requerir permisos adicionales de
WhatsApp Business Management o corregir la cuenta WABA.

## Prueba sin afectar huéspedes reales

Cuando la plantilla esté aprobada y sea de tipo UTILITY, configurar en Render:

    BOOKING_ALERT_TO=51938345478
    BOOKING_ALERT_MODE=template
    BOOKING_ALERT_TEMPLATE_NAME=solicitud_reserva_admin
    BOOKING_ALERT_TEMPLATE_LANGUAGE=es
    BOOKING_ALERT_TEST_KEY_PREFIX=qa-template-20261107
    BOOKING_ALERT_ENABLED=true

La cola selecciona solamente alertas cuya clave empieza con ese prefijo. Una
alerta real con otra clave nunca se envía durante el piloto.

Crear filas ficticias con ese prefijo en la cola, una por canal. Cada alerta
puede usar un identificador ficticio de conversación; el destinatario sigue
siendo el teléfono de prueba. No modificar ai_conversations, meta_conversations,
bookings ni el inventario para esta prueba de envío.

Verificar 1 envío por alerta y recibir los 3 mensajes; luego poner
BOOKING_ALERT_ENABLED=false y esperar a que Render aplique ese despliegue.

**No cambiar al número del señor Pepe sin una nueva revisión** de permisos,
plantilla aprobada, consentimiento del destinatario y pruebas completadas.

Para producción: dejar BOOKING_ALERT_TEST_KEY_PREFIX y
BOOKING_ALERT_PILOT_SOURCE vacíos, usar BOOKING_ALERT_MODE=template y
configurar explícitamente el teléfono del administrador. Revisar y limpiar
alertas antiguas antes de habilitar la entrega general. Meta puede cobrar
mensajes de plantilla según su categoría y condiciones de servicio.
