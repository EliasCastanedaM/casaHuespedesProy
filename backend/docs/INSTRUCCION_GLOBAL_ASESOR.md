# Instrucción global y arquitectura conversacional del asesor

## Revisión comercial del tarifario del 15/11/2026

La especificación solicitada más reciente está en
[INSTRUCCIONES_ASESOR_TARIFARIO_BASE.md](INSTRUCCIONES_ASESOR_TARIFARIO_BASE.md).
Después de su confirmación sustituirá las instrucciones anteriores de tarifas y
capacidad tarifaria: adulto
S/ 60, niño de 5 a 8 años S/ 30 dentro de una suma sujeta al mínimo de habitación;
niños de 0 a 4 sin cargo ni plaza tarifaria, con validación física separada.
Temporadas alta y baja desactivadas: factor 1,00 para todas las fechas.

Esta entrega prepara instrucciones, cálculo y vista administrativa detrás de
confirmaciones de servidor. Mientras estén pendientes, el asesor conserva la
política anterior. La base, las temporadas, el calendario y las correspondencias
siguen sin confirmar. El procedimiento está en
[TARIFARIO_PENDIENTE_ACTIVACION.md](TARIFARIO_PENDIENTE_ACTIVACION.md).

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

### Consultas de políticas: datos mínimos y confirmados

Una consulta sobre una edad recibe únicamente la condición vigente para esa edad,
normalmente en una oración. No enumera otros tramos ni invita a reservar o pide
fechas, adultos o mascotas. Si falta la edad necesaria, pregunta solo esa edad.
Un seguimiento sustituye la edad anterior sin modificar la composición de una
reserva. No atraviesa un cambio de tema para recuperar una política antigua.

Cada dato publicado necesita su propia regla activa y verificada. Una propuesta,
regla retirada, valor ausente o error de consulta no autoriza publicar importes.
Se retira el respaldo de precios fijos ante fallos de la fuente. El prompt no
contiene cantidades comerciales ni fórmulas: el cálculo, las capacidades y las
aprobaciones permanecen en el motor. La vista administrativa conserva las
propuestas pendientes sin exponerlas en las respuestas a huéspedes.

Para mascotas se distingue admisión de precio: preguntar si se aceptan no publica
el cargo. Las consultas generales explícitas reciben un resumen breve; los
detalles se amplían únicamente cuando se solicitan.

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

## Consultas de pago y lenguaje de reserva

Preguntar «¿Puedo pagar en el establecimiento?» recibe únicamente «Sí, puedes
pagar en el establecimiento», cuando los medios vigentes estén verificados.
La consulta no elige un medio de pago para una reserva ni modifica el borrador,
incluso si hay una solicitud en curso. Si la fuente no está disponible, se
reconoce que no se puede confirmar el dato.

No se afirma que el huésped esté registrado ni que tenga una habitación separada,
una reserva creada o confirmada por haber consultado precios, políticas o pagos.
Los estados internos permanecen en el sistema. Solo se comunica una confirmación
cuando el proceso real haya terminado, exista aprobación del equipo y la acción
autorizada del backend haya devuelto una reserva confirmada.

Aviso temporal al informar medios, cuentas o enlaces de pago:

> ⚠️ ATENCIÓN: No realices pagos sin que nuestro equipo haya confirmado la disponibilidad para las fechas de tu estadía. Consulta aquí: +51 943 030 098.

El número procede del contacto de atención humana del sistema. El aviso no afirma
que haya una reserva ni disponibilidad confirmada. Las consultas sobre pagar ahora
se responden sin emitir enlaces ni iniciar el cierre de reserva; el enlace real
continúa sujeto al proceso y la aprobación existentes.

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

## Niños, camas y capacidad tarifaria: instrucciones revisadas

El importe de alojamiento por noche se define como el máximo entre el mínimo de
la categoría y S/ 60 por huésped con tarifa adulta más S/ 30 por niño de 5 a 8.
El importe infantil entra en la suma antes de aplicar el mínimo. Desde 9 años se
conserva la tarifa adulta previamente aprobada, sin convertir a los menores en
adultos acompañantes. Se exige al menos un adulto real por reserva.

Los niños de 0 a 4 no añaden cargo ni plaza tarifaria; conservan su registro como
huéspedes y la validación de camas y seguridad. Los de 5 a 8 sí ocupan plaza
tarifaria. Compartir una cama de 1½ plazas no permite exceder ese límite.

Para dos adultos y niños de 2 y 8 años corresponden tres plazas tarifarias:
Triple S/ 150 por noche, sujeto a camas y disponibilidad. El ejemplo anterior de
Doble S/ 160 queda sustituido. Dos adultos y dos niños de 5 a 8 necesitan cuatro
plazas tarifarias: Familiar S/ 180, no Triple. Un adulto y un niño de 6 años en
Matrimonial cuestan S/ 100 por el mínimo, no S/ 130.

Las categorías pendientes de correspondencia no reciben importes por inferencia.
La Ejecutiva no tiene tarifa nueva definida y el PDF no distingue Familiar 1 de
Familiar 2. La especificación enlazada detalla estos límites y el control de
publicación conjunta del motor y sus instrucciones.

## Presentación de cotizaciones y detalles (14/11/2026)

Por indicación del propietario, cada opción muestra solo nombre de la habitación,
precio por noche y total de la estancia. Se omiten introducciones, camas,
distribución, condiciones infantiles y párrafos de revisión humana. El cálculo,
el inventario y la aprobación siguen validados internamente. Si una preferencia
solicitada no está disponible, se informa la alternativa para no sustituirla
silenciosamente. Las solicitudes de fotos o detalles de habitaciones reciben
una frase breve y https://www.casahuespedespimentel.com/habitaciones, sin catálogo
ni redes sociales. Las consultas informativas no modifican la reserva.
