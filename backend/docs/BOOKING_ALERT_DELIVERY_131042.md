# Diagnóstico: plantillas de reserva recibidas por Meta pero no entregadas

Fecha: 07-11-2026. Proyecto Casa Huéspedes Pimentel.

## Resultado del incidente

Tres alertas de prueba (origen WhatsApp, Facebook e Instagram) fueron
aceptadas inicialmente por Graph API alrededor de las 17:15:17-18 UTC.
Sin embargo, Meta envió tres webhooks firmados a las 17:15:24-25 UTC:
- status = failed
- error code = 131042
- title = Business eligibility payment issue

La plantilla solicitud_reserva_admin estaba aprobada y en categoría UTILITY.
Meta registró una validación de elegibilidad de pago fallida; el motivo
específico dentro de la facturación WABA no se puede establecer solo
con ese código. Puede corresponder a falta de método de pago, fallo de
autorización, crédito o situación transitoria del proveedor.

### Problema de observabilidad previo

booking_alert_outbox.status='sent' se asignaba al recibir el message ID,
aunque aún no se había entregado el WhatsApp.
Los webhooks actualizaban meta_messages, pero no booking_alert_outbox:
las notificaciones de administrador no están en meta_messages.

## Cambio técnico

La tabla incorpora delivery_status:
- accepted: Graph API aceptó el mensaje; NO equivale a entrega.
- sent: Meta reportó el estado sent (NO garantiza recepción).
- delivered: Meta informó entrega al destinatario.
- read: Meta informó lectura.
- failed: Meta rechazó la entrega; delivery_error_code y
  delivery_error_title identifican el motivo.

El webhook firmado actualiza el outbox por meta_message_id sin exponer
teléfonos ni mensajes en los logs. Se ignoran duplicados y eventos
fuera de orden que pretendan degradar delivered/read.

El campo status anterior se mantiene para no reintentar mensajes ya
aceptados por Graph API. La aplicación no reenvía automáticamente un
fallo 131042, lo cual evita notificaciones duplicadas al corregir pagos.

## Operación: revisar facturación en Meta

1. Ir a https://business.facebook.com/wa/manage
2. Seleccionar la cuenta WhatsApp del hospedaje (WABA ID informado en
   los webhooks firmados: 1568903304317286).
3. Revisar Herramientas de la cuenta / Configuración de pagos; o
   Facturación y pagos → Cuentas de mensajería en Business Suite.
4. Comprobar método de pago, moneda, país, saldo, bloqueos, vencimientos,
   línea de crédito y permisos del titular; corregir solo dentro de Meta.
5. No poner datos de tarjeta ni tokens en ChatGPT, GitHub o Supabase.
6. Tras solucionar Meta, ejecutar UNA nueva prueba de plantilla dirigida
   al número autorizado. Corroborar que delivery_status cambie de
   accepted a delivered/read. Mantener BOOKING_ALERT_ENABLED=false en
   el resto del tiempo.
7. No activar avisos al señor Pepe hasta confirmar recepción definitiva.

Nota: la verificación de pagos de Meta también puede dar errores
transitorios. En caso de duda, consultar avisos de Meta y soporte.
