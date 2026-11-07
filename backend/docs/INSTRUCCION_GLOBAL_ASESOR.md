# Instrucción global del asesor

WhatsApp, Instagram y Facebook comparten una sola instrucción, construida en
`src/modules/ai/ai.prompt.js`. La función `buildHotelAssistantPrompt()` no recibe
el canal ni genera variantes por plataforma.

El comportamiento global usa la política que antes estaba activa en WhatsApp:

- Saludo breve, menú opcional y atención en el idioma del huésped.
- Tarifas actuales del catálogo, sin afirmar disponibilidad automática.
- Recopilación progresiva de fechas, adultos, niños y edades, mascotas y preferencias.
- Revisión humana obligatoria de disponibilidad, categoría e importe.
- Después de la aprobación, datos de contacto y elección entre pago en el
  establecimiento o Culqi. Los avisos de pago no equivalen a verificación.
- Los cambios comerciales posteriores a la aprobación vuelven a revisión.

`src/modules/ai/ai.reservation.js` contiene el flujo común. El servicio IA utiliza
ese flujo en los tres canales y solo expone al modelo la consulta de categorías.
El saludo, las tarifas y la recuperación del borrador tras la atención humana
también comparten reglas. La ventana de historial es la misma en cada canal.

## Compatibilidad y transporte

La clave persistida `whatsapp_mvp` conserva su nombre para mantener los chats
guardados sin migraciones destructivas. No identifica una política exclusiva.
`ai.whatsapp-mvp.js` contiene únicamente exportaciones de compatibilidad; no tiene
instrucciones ni lógica de atención propias. Los borradores antiguos de otros
canales conservan datos e intención; una consulta de disponibilidad antigua no
se transforma en aprobación humana. Las reservas ya registradas conservan su
identificador para los avisos de pago.

Cada canal mantiene sus credenciales, envío, recepción y límites técnicos.
Un identificador de Instagram/Facebook nunca se interpreta como teléfono.
El teléfono de WhatsApp solo se aprovecha cuando el identificador es un número
válido. La restricción operativa de confirmación de WhatsApp que ya existía en
el panel se conserva; su habilitación es independiente de las instrucciones.

## Validación

`npm test` en `backend` incluye pruebas de igualdad del prompt y herramientas,
recopilación y aprobación en los tres canales, contacto, opciones de pago,
invalidación de aprobaciones, historial y compatibilidad con reservas anteriores.
Las pruebas usan servicios simulados: no envían mensajes ni crean reservas reales.
