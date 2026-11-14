# Instrucción global y arquitectura conversacional del asesor

WhatsApp, Facebook e Instagram comparten `buildHotelAssistantPrompt()` en
`src/modules/ai/ai.prompt.js`. No hay variantes por canal ni un segundo prompt
administrativo detectado en las fuentes inspeccionadas. El contrato se divide en:

1. Identidad y propósito.
2. Reglas de conversación.
3. Intención actual.
4. Información oficial.
5. Reglas comerciales y reserva.
6. Herramientas y acciones.
7. Seguridad y escalamiento.
8. Comportamiento común y transporte.

Las tarifas, servicios y políticas actuales pertenecen a sus fuentes comerciales;
los cálculos y aprobaciones se mantienen en el motor determinista de reserva.
El prompt no sustituye esas validaciones.

## Selección de servicios

`ai.services-info.js` devuelve una intención `none`, `general` o `specific`, con
slugs, incertidumbre y nivel de detalle. Solamente una petición general explícita
permite consultar todo el catálogo. Un servicio desconocido devuelve incertidumbre,
no todos los registros. Los nombres exactos del catálogo amplían el reconocimiento.

La misma selección se aplica al formateador y a `listar_servicios`. Las condiciones,
cargos y coordinación de los registros elegidos se conservan. Las consultas simples
inequívocas no necesitan clasificador ni modelo generativo. Una traducción exacta
revisada se usa solo cuando coincide con la descripción vigente; las demás se
resuelven con el modelo y únicamente los datos pertinentes.

## Contexto y continuidad

La pregunta actual tiene prioridad. Los seguimientos sin tema usan el último tema
explícito del huésped, atravesando solo seguimientos consecutivos, nunca un cambio
de tema. Una consulta informativa no modifica el contexto ni repite cotizaciones.
El historial del llamador prevalece sobre el de recuperación. Se conservan la
ventana de contexto y la separación entre historial y estado persistido de reserva.

La clave `whatsapp_mvp` conserva su nombre para compatibilidad; no es una política
exclusiva de WhatsApp. No se migran ni borran borradores. Los identificadores sociales
nunca se convierten en teléfono. Se mantienen aprobación humana, capacidad física,
niños, mascotas, preferencias, invalidación de aprobación ante cambios y verificación
de pagos. Ningún mensaje del modelo registra reservas por sí mismo.

## Presentación y entrega

Los saludos reciben la bienvenida aprobada y las redes, gestionadas por Meta.
Una pregunta concreta recibe su respuesta directamente, incluso en el primer turno.
El menú continúa disponible bajo solicitud. El transporte conserva outbox,
reintentos, límites de cada canal y pausa por operador antes y después de generar.

La concisión depende de selección y redacción, no de recortar caracteres o imponer
un límite pequeño de salida. `AI_MAX_OUTPUT_TOKENS` se retira de la conversación;
se rechazan respuestas incompletas y llamadas pendientes tras agotar las rondas.

## Verificación

`npm test` en `backend` cubre contrato único, reservas, pagos, inventario y entrega
simulada. `test/ai-relevance.test.js` añade consultas específicas, desconocidas,
idiomas, seguimiento, preservación de siete fases de reserva, herramientas filtradas,
respuestas incompletas y privacidad de diagnósticos.

El informe [AUDITORIA_ASESOR_2026-11-14.md](AUDITORIA_ASESOR_2026-11-14.md) registra
causas, archivos, resultados, ejemplos y limitaciones. Estas pruebas no sustituyen
la validación en chats reales después de autorizar un despliegue.

## Actualización infantil del 14/11/2026

Las opciones se ordenan desde la categoría básica compatible, con un máximo de
dos alternativas superiores. Se diferencia el total real de huéspedes de las
plazas de cama: hasta dos niños de 0 a 4 años pueden compartir una cama de 2 plazas
con sus padres, sin cama adicional; de 5 a 8 años se cobran S/ 20 por niño/noche y
desde los 9 se aplica tarifa de adulto. La aprobación y la transacción revalidan
la distribución. Véase [CAMBIO_INFANTIL_CAMAS_2026-11-14.md](CAMBIO_INFANTIL_CAMAS_2026-11-14.md).
