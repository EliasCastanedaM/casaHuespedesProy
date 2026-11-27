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

## Presentación de servicios y emojis

Una pregunta específica recibe únicamente el servicio consultado y sus condiciones.
Una consulta general, incluida «¿qué servicios tienes?», recibe una oración de
resumen con hasta tres servicios del catálogo vigente, una invitación breve a
https://www.casahuespedespimentel.com/servicios y la foto de terraza utilizada por
esa página. Si la fuente falla, el resumen es genérico y no inventa servicios.
No se enumera el catálogo completo ni se informa su cantidad total.

Cada mensaje de texto del asesor lleva emojis discretos. La capa de presentación
conserva los emojis ya presentes y añade uno cuando falta; no cambia importes,
enlaces o condiciones. La regla también cubre avisos de procesamiento y respuestas
fijas. Los mensajes escritos por operadores no se modifican.

La fotografía se entrega como imagen nativa en los tres canales, en un outgoing
separado vinculado a la respuesta principal. Se reutilizan las comprobaciones de
atención humana, persistencia, reintentos y recuperación sin repetir una imagen
ya aceptada por Meta. La API de chat también devuelve image_url para los clientes.

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

> ⚠️ ATENCIÓN: No realices ningún pago hasta que nuestro equipo confirme la disponibilidad para las fechas de tu estadía.

Se conservan todos los medios de pago vigentes. El aviso solo recuerda esperar
la confirmación de disponibilidad del equipo antes de efectuar cualquier pago;
no presenta el contacto humano como único medio de pago ni afirma que haya
una reserva o disponibilidad confirmada. Las consultas sobre pagar ahora
se responden sin emitir enlaces ni iniciar el cierre de reserva; el enlace real
continúa sujeto al proceso y la aprobación existentes.

## Aceptación explícita después de recomendar

La recomendación o cotización finaliza preguntando «¿Quieres reservar esta
habitación? Para confirmar, responde “sí quiero”». Ni los datos aportados ni el
historial ni expresiones como «ok», «me gusta» o «sí» aislado autorizan continuar.

Solo una respuesta explícita posterior a la oferta vigente, como «sí quiero» o
«sí, quiero reservar», acepta la recomendación. Se normalizan tildes, mayúsculas,
puntuación y espacios. Cambiar datos o elegir otra categoría genera otra
recomendación y renueva la pregunta; esa elección no es aceptación.

Después de aceptar: «¡Perfecto! 😊 Nuestro equipo te confirmará la disponibilidad
en breve y se comunicará contigo para continuar con la reserva. ¿Tienes alguna
otra duda?». Se conserva una solicitud pendiente para revisión del equipo,
sin crear una reserva ni solicitar datos personales o pagos. La solicitud figura
en la cola de revisión; la IA continúa disponible para dudas hasta que un operador
tome el chat. La aprobación administrativa sigue requiriendo atención humana activa.

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


### Servicio solicitado que no figura en la lista

Responder brevemente: «Actualmente no contamos con ese servicio en nuestra lista de servicios. 😊 Para conocer todos nuestros servicios, ingresa aquí: https://www.casahuespedespimentel.com/servicios».
No derivar automáticamente al dueño ni añadir su teléfono. Esto aplica al servicio que no aparece en el catálogo vigente; una incidencia al consultar el catálogo no permite afirmar ausencia. Se conserva la alternativa verificada de ventilador para preguntas específicas sobre aire acondicionado.

### Varias peticiones y recuperación de pendientes (17/11/2026)

Antes de las respuestas de un solo tema, `ai.requests.js` interpreta el conjunto
de peticiones. La IA selecciona fragmentos literales con un esquema cerrado;
el catálogo y los validadores existentes conservan la autoridad sobre hechos y
reservas. Una separación literal acotada permite responder las consultas conocidas
si la interpretación no está disponible. Las FAQ simples conservan su ruta directa.

Cada punto solicitado recibe su respuesta breve. Las comparaciones usan las
categorías actuales, capacidades y camas; no eligen habitaciones ni confirman
disponibilidad. Una categoría inexistente se aclara sin inventarla. Las preguntas
de comparación ya no se sustituyen únicamente por el enlace de habitaciones.

Los fragmentos afirmativos de una solicitud pasan al motor de reserva existente.
Comparar alternativas no acepta una oferta. Se conservan las fechas y cantidades
explícitas, sin asumir adultos, ausencia de niños o mascotas, ni fecha de salida.
Si falta solo entrada o salida se pregunta por esa fecha concreta.

La recuperación de «lo demás que te pedí» se limita al intercambio reciente
(máximo 24 horas al cargar historial) y no cruza saludos ni solicitudes nuevas.
Las incidencias al consultar una fuente conservan las preguntas pendientes; se
responden los otros puntos y se reconoce lo que necesita revisión. Nunca se envían
errores técnicos, estados internos ni confirmaciones inventadas al huésped.

`test/ai-multiple-requests.test.js` reproduce el caso de cuatro personas para el
12/12/2026, su reclamo posterior, la separación de estancias y las tres plataformas.


## Vigencia y estabilización del 27/11/2026

El estado ejecutable vigente, las correcciones de fechas y los límites de QA
se documentan en [ESTABILIZACION_LINEA_BASE_2026-11-27.md](ESTABILIZACION_LINEA_BASE_2026-11-27.md).
Los ejemplos e informes fechados anteriores son históricos. El tarifario PDF
permanece pendiente; no debe copiarse como tarifa activa al prompt. Los cargos
informativos deben coincidir con el contrato operativo del calculador; una
fuente verificada con importe o frecuencia incompatible no autoriza publicarlos.
