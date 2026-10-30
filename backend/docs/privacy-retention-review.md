# Auditoría de privacidad y conservación — Casa Huéspedes Pimentel

**Fecha:** 2026-10-30. **Estado:** diagnóstico, sin borrado automático de registros.

## Alcance verificado
- `customers`: nombres, teléfonos, correos, tipo y número de documento, notas.
- `bookings` y `payments`: reservas, estados, referencias y pagos. Su retención debe coordinarse con obligaciones contractuales, tributarias y atención al huésped.
- `inquiries`: datos de contacto y contenido de consultas.
- `meta_messages`: contenido íntegro de mensajes y eventos de entrega, utilizado por el panel, las respuestas IA, el contexto conversacional y el handoff.
- `meta_conversations`: contacto de canal y estado de atención humana.
- `meta_coexistence_events`: payload JSON original de sincronización de la app de WhatsApp Business. Puede incluir historial y contactos; se archiva para importación explícita.
- `ai_conversations`: contexto de reserva y su expiración. La expiración lógica no implica limpieza física si nadie vuelve a escribir.
- `ai_processed_messages`: identificadores de mensajes para evitar re-procesar webhooks.
- `ai_usage_events`: métricas y etiquetas seudónimas de costo; no se guarda contenido de mensajes.
- Archivos y logs de proveedores (Render, Meta, OpenAI, Cloudinary, Brevo): confirmar sus propias políticas de acceso/retención. Esta auditoría de PostgreSQL no los limpia.

## Hallazgos del diagnóstico inicial (solo recuentos)
- `meta_messages`: 488 filas; `meta_conversations`: 20; `ai_conversations`: 19.
- `customers`: 5; `bookings`: 0; `inquiries`: 1.
- Contextos de reserva con datos: 12; vencidos: 9; ninguno de los vencidos tenía handoff humano activo al evaluar.
- `meta_coexistence_events`: 2 eventos con payload original.
Estos recuentos son una instantánea, no un requisito de conservación.

## Cambios implantados
- Endpoint `GET /api/admin/privacy/retention-preview`, solo rol `admin`, con conteos agregados, sin identificadores ni mensajes, y sin operaciones de modificación.
- Logs de envío de correos y fallos de notificación: no registran destinatario, asunto/código de reserva ni respuesta textual del proveedor.
- No se programó tarea de limpieza automática y no se eliminó ninguna fila.

## Decisiones pendientes antes de eliminar o anonimizar datos
1. Definir el responsable del tratamiento y los tiempos adecuados por categoría, con revisión de la normativa aplicable. El indicador de 90 días en el panel es solo un umbral de exploración, **no** una política de borrado.
2. Revisar la necesidad operativa de conservar mensajes durante atención humana, reclamos, disputas y reservas pendientes.
3. Verificar respaldo y restauración antes de cualquier operación irreversible.
4. Para solicitudes de titulares: verificar identidad de la persona, identificar todos sus registros y relaciones entre canales; preservar únicamente los datos sujetos a obligaciones legales, si aplica; documentar la decisión sin guardar copias de su identidad en tickets.
5. Establecer un procedimiento de eliminación por lotes con simulación, autorización explícita, registro auditable y reversión donde sea posible. No eliminar `meta_messages` directamente: el flujo de deduplicación y referencias `in_reply_to_message_id` podrían romperse.
6. Evitar dejar raw payloads de `meta_coexistence_events` de forma indefinida tras completar una importación; primero diseñar una política de importación y confirmación.
7. Revisar los periodos de retención en servicios externos por separado; borrar en la base de datos no garantiza eliminación en sus sistemas y copias.

## Verificación
- Recuento y roles del endpoint: nunca exponer `phone`, `email`, `document_number`, `external_user_id`, `content` ni `booking_context`.
- Verificar que `staff` obtenga 403 y usuarios sin sesión 401.
- Confirmar que las pruebas de Meta y reservas siguen aprobadas.

**Nota:** la vista de retención no ejecuta purgas ni activa eliminaciones. La limpieza física de los 9 contextos vencidos requiere un procedimiento aprobado independiente.
