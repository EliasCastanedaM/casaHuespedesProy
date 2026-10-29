# Cotizaciones, pre-reservas y enlaces de pago en WhatsApp

## Alcance del cambio

- Comparte el flujo transaccional existente de Instagram/Facebook con WhatsApp **solo** cuando las dos banderas operativas están habilitadas.
- Antes de solicitar nombre, correo o celular, el flujo progresivo busca disponibilidad y muestra la **cotización referencial**: noches × tarifa base vigente en Supabase; no calcula cargos especiales no aprobados.
- Después de reunir los datos de la solicitud, revalida inventario y crea una única pre-reserva `pending_payment` con `booking_intent_id`. La habitación física queda protegida mediante las transacciones y bloqueos existentes.
- Solo después de crear correctamente la pre-reserva se envía el enlace Culqi configurado. El mismo enlace existente se comparte en todos los canales: **no es un enlace individual generado por importe**.
- El mensaje «Ya pagué» solo registra `payment_reported`. El personal debe verificar el abono y confirmar la reserva.
- Las excepciones para niños, mascotas, grupos grandes y reglas comerciales pendientes siguen derivándose a recepción.

## Protección de inventario y activación

Valores por defecto (apagados):

```dotenv
WHATSAPP_DIRECT_BOOKING_ENABLED=false
HOTEL_CHANNEL_INVENTORY_VERIFIED=false
```

Las dos variables deben ser exactamente `true` para activar el flujo integral de WhatsApp. Una sola variable no lo habilita. Mantenerlas en `false` hasta que el inventario de Supabase sea una fuente exacta de disponibilidad real, considerando Booking, Airbnb, reservas telefónicas y bloqueos manuales. Marcar `HOTEL_CHANNEL_INVENTORY_VERIFIED=true` **no crea ninguna sincronización** con OTAs ni verifica datos por sí mismo.

La activación es una decisión de administración y debe requerir una prueba de punta a punta en un entorno controlado: disponibilidad, importe, bloqueo de cupo, idempotencia, reintentos, pago reportado, confirmación humana, cancelación y coexistencia de WhatsApp Business App y Cloud API. Antes de todo cambio en Render, asegurar una opción de reversión inmediata cambiando `WHATSAPP_DIRECT_BOOKING_ENABLED=false`.

El backend no registra cobros reales mediante esta función y no verifica pagos de Culqi automáticamente. Antes de comercializar el enlace común, comprobar con Culqi cómo se determina y concilia el monto de cada abono respecto al importe de la pre-reserva; el total indicado en la conversación no configura automáticamente el monto de una página de pago compartida.

## Pruebas de regresión

```bash
cd backend
npm ci
npm test
```

Con los valores por defecto, WhatsApp conserva su MVP actual: recopila datos mínimos y deriva a una persona sin crear reservas ni consultar stock. No activar en producción por el mero hecho de unir este cambio al código.
