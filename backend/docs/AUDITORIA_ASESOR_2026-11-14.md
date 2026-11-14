# Auditoría y reestructuración del asesor — Casa Huéspedes Pimentel

> Ampliación posterior solicitada por el propietario: la política infantil y el
> orden de categorías de esta primera entrega fueron reemplazados según
> [CAMBIO_INFANTIL_CAMAS_2026-11-14.md](CAMBIO_INFANTIL_CAMAS_2026-11-14.md).
> La suite ampliada tiene 447 pruebas aprobadas. Las cifras de 414 y la afirmación
> de no cambiar reglas comerciales que siguen a continuación corresponden a la
> primera entrega, antes de esa nueva autorización. El SQL comercial sigue preparado
> para revisión y no se ha aplicado en producción.


Fecha: 14 de noviembre de 2026, America/Lima.
Base inspeccionada: `main`, commit `5c6a47ce5baf89d8a23e2117b962e834d02574a9`.
Rama de revisión: `codex/advisor-relevance-20261114`.

## Resultado y alcance

Implementación de selección por intención, prompt único en ocho capas, respuestas
específicas, seguimientos acotados, herramientas filtradas y presentación inicial
sin mensajes masivos ante preguntas concretas. No se modificaron precios,
políticas, inventario, esquema ni registros de producción. No se desplegó.

Se inspeccionaron código, pruebas, migraciones, configuración y fuentes comerciales
actuales de Supabase mediante consultas de lectura. Los 14 registros de habitación
se componen de 13 activos y uno inactivo; existen seis categorías. No es una
inconsistencia que deba corregirse borrando el registro inactivo. Los servicios
actuales consultados están aprobados; aire acondicionado y piscina no figuran en
el catálogo leído. Esto significa información no confirmada, no una negativa
categórica sobre su existencia.

## Recorrido completo de un mensaje

1. `meta.routes.js` y `meta.controller.js`: reciben el webhook y verifican firma,
   normalizan eventos, persisten entradas y organizan su procesamiento por chat.
2. `meta.service.js`: unifica mensajes de los tres canales, reclama el mensaje,
   deduplica y recupera salidas pendientes. Comprueba atención humana antes de
   responder y otra vez después de generar; conserva la outbox y los reintentos.
3. Saludos: bienvenida aprobada y redes. Una pregunta concreta de un nuevo huésped
   recibe únicamente su respuesta. La solicitud explícita de menú sigue disponible.
4. `ai.service.js`: identifica respuestas especiales, menú, turismo, servicios,
   ubicación, políticas y pagos; los servicios se distinguen antes de interpretar
   los datos de una reserva. Los casos de alcance dudoso conservan el clasificador.
5. Información: los formateadores deterministas usan fuentes oficiales.
   `ai.services-info.js` selecciona temas, condiciones, idioma y tipo de pregunta.
6. Reserva: `ai.reservation.js`, `ai.booking-flow.js`, `ai.occupancy-pricing.js`,
   `roomOccupancyRates.service.js` y `roomPreferences.js` conservan cotización,
   composición del grupo, inventario, vistas y aprobación administrativa.
7. Generación abierta: Responses API recibe el mismo prompt en todos los canales,
   historial reciente y mensaje actual completo. Para traducir servicios sin una
   traducción exacta revisada, recibe solamente sus datos oficiales pertinentes.
   Las herramientas son de lectura y la consulta de servicios queda vinculada a
   la pregunta original, aunque el modelo intente pedir un catálogo genérico.
8. Entrega: Meta persiste y envía la respuesta, aplica división técnica de mensajes
   y registra su estado. La aceptación de Meta no se confunde con entrega efectiva.

## Diagnóstico y causas

| Hallazgo | Causa | Corrección |
|---|---|---|
| Un servicio no reconocido produce el catálogo completo | La ausencia de slugs se interpretaba como solicitud general | Contrato explícito `none/general/specific`; un tema desconocido selecciona cero registros |
| Respuestas extensas pese al prompt | Formateador fijo: saludo, nombre, descripción completa y cierre genérico | Respuesta directa por tema; resumen inicial y ampliación solo cuando se solicita |
| El modelo recibe información innecesaria | `listar_servicios` entregaba todos los registros sin relación con el mensaje | Mismo selector tanto en la respuesta determinista como en la herramienta |
| La primera consulta recibe menú y redes | El transporte añadía bienvenida por ser el primer mensaje | Bienvenida completa para saludos; respuesta directa ante pregunta concreta |
| Riesgo de confundir una interrupción con datos de reserva | Servicio desconocido o seguimiento no reconocido llegaba al flujo de reserva | Reconocimiento de consultas específicas y resolución de pronombres antes de ese flujo |
| Reglas repetidas y prioridades difusas | Prompt mezclaba varios bloques de reserva, bienvenida y listas de servicios | Ocho capas ordenadas; información recuperada por pregunta; acciones en el motor existente |
| Respuestas generadas potencialmente incompletas | Tope general de 500 tokens y ausencia de validación del estado de Responses | Se elimina ese tope de conversación y se rechazan estados incompletos/fallidos |
| Texto de excepciones en diagnósticos | Se imprimía `error.message`, que puede contener datos SQL o del proveedor | Códigos técnicos en el servicio IA y estado HTTP en el clasificador; error público genérico en herramientas |

El historial remoto ya estaba deshabilitado entre turnos mediante
`shouldReuseOpenAiResponseId()`. Se conserva esa decisión y la ventana de ocho
mensajes/3200 caracteres del servicio. La reserva persiste separadamente con TTL;
no se borran sus datos para acortar respuestas. El historial explícito del llamador
ahora tiene prioridad sobre una segunda lectura de recuperación.

No se encontró un prompt administrativo alternativo en las rutas/configuración
inspeccionadas ni una tabla de instrucciones entre las tablas pertinentes del
esquema actual. Las reglas comerciales residen en `hotel_policy_rules`, los
servicios en `services`, las tarifas en sus catálogos y la conversación en
`ai_conversations`/`meta_messages`. Se mantuvieron las reglas pendientes de revisión
como pendientes; no se aprobaron ni activaron condiciones nuevas.

## Arquitectura final de instrucciones

La implementación exacta está en `src/modules/ai/ai.prompt.js` y se usa tanto en
la primera generación como en las continuaciones de herramientas.

| Capa | Responsabilidad |
|---|---|
| 1. Identidad y propósito | Recepcionista oficial, atención y ámbito del hospedaje |
| 2. Conversación | Pregunta actual primero, idioma, una a tres oraciones como guía flexible, tono y ampliación pertinente |
| 3. Intención actual | Tema específico/general, seguimiento, cambio de tema, turismo y alcance |
| 4. Información oficial | Fuentes vigentes, confirmación, cargos, coordinación y límites de conocimiento |
| 5. Reglas comerciales y reserva | Categorías, ocupación, niños, mascotas, vistas, aprobación, pagos y cambios |
| 6. Herramientas y acciones | Recuperación mínima, lectura filtrada y acciones exclusivas del backend |
| 7. Seguridad y escalamiento | Datos mínimos, atención humana, pausa por operador y protección de información interna |
| 8. Comportamiento común y transporte | Un solo contrato; bienvenida y entrega gestionadas por mensajería |

No se usa un truncamiento de texto para generar brevedad. La división técnica de
mensajes largos de Instagram permanece intacta. `AI_MAX_OUTPUT_TOKENS` deja de
controlar la conversación y se retira de la configuración y ejemplos; la
clasificación binaria mantiene su presupuesto independiente de 128 tokens.
Permanecen los límites propios del modelo y proveedor. Un estado incompleto no se
entrega como respuesta terminada. Se conserva el límite de rondas de herramientas,
con rechazo explícito si queda una llamada pendiente y caché por turno para evitar
consultas repetidas.

## Archivos modificados y motivo

| Archivo o grupo | Cambio |
|---|---|
| `src/modules/ai/ai.prompt.js` | Contrato único de ocho capas, sin duplicar el cierre de reserva |
| `src/modules/ai/ai.services-info.js` | Clasificación, sinónimos, nombres de catálogo, selección, resumen, seguimiento, condiciones e idiomas |
| `src/modules/ai/ai.service.js` | Enrutamiento informativo, fuentes filtradas para modelo/herramientas, contexto, caché, respuestas completas y diagnósticos |
| `src/modules/ai/ai.scope.js` | Evita imprimir texto de excepciones del proveedor |
| `src/modules/meta/meta.service.js` | Respuesta directa en la primera consulta; conserva saludos, outbox y toma humana |
| `src/config/env.js`, `.env.example`, `META_SETUP.md`, `docs/DEPLOYMENT.md` | Retirada del antiguo límite de respuesta conversacional |
| `test/ai-relevance.test.js` | 36 pruebas nuevas de comportamiento y regresión |
| Cuatro archivos de pruebas existentes | Expectativas actualizadas para resumen, herramienta filtrada y primera respuesta sin menú/redes |
| `docs/INSTRUCCION_GLOBAL_ASESOR.md` y este informe | Arquitectura operativa, evidencia, limitaciones y revisión |

No se modificaron los motores de reserva, pagos, inventario ni el esquema SQL.

## Pruebas ejecutadas

Entorno local: Node `v24.22.1`, npm `11.9.0`. Dependencias instaladas con
`npm ci --ignore-scripts --no-audit --no-fund` y el lockfile existente.

| Verificación | Resultado |
|---|---|
| Suite original, antes de cambios | 378 aprobadas, 0 fallidas |
| Suite final completa `npm test --prefix backend` | 414 aprobadas, 0 fallidas, 0 omitidas |
| Sintaxis de JavaScript modificado | Correcta |
| `git diff --check` | Sin errores de espacios ni conflictos |
| Supabase: esquema pertinente, servicios, reglas y conteos de inventario | Lectura realizada; sin escrituras |
| Entrega real en Meta o generación real con OpenAI | No ejecutada; proveedores simulados en pruebas |

Las pruebas se ejecutaron varias veces durante la corrección. Se detectó y corrigió
una regresión que trataba “¿Hay algo más barato?” como un servicio. Las expectativas
antiguas que exigían menú/redes al contestar una primera consulta se cambiaron porque
ese comportamiento es precisamente una de las causas de mensajes no solicitados.
No quedan pruebas fallidas en la ejecución final.

| Criterio solicitado | Evidencia |
|---|---|
| Aire acondicionado, piscina y servicios no registrados | Pruebas específicas y variantes nuevas como aromaterapia/secadora; cero catálogo |
| WiFi y desayuno | Selección de un único tema y respuesta confirmada |
| Todos los servicios y ampliación | Resumen, lista completa y detalles se diferencian; se conservan cargos |
| Restaurantes cercanos | Suite turística existente; rutas de turismo previas al catálogo del hotel |
| Seguimiento breve | Tema inmediato, historial persistido y varios seguimientos; no atraviesa cambio de tema |
| Cambio de tema durante reserva | Consultas repetidas en siete estados sin escribir ni recotizar |
| Tarifas, niños y mascotas | Suite completa de ocupación y reserva, sin cambios de fórmulas |
| Vistas y ventana | Suite existente de inventario, alternativas, preferencias y aprobación |
| Atención humana y nuevo huésped | Invitación única, pausa y recuperación; saludos aprobados; primera pregunta directa |
| Inglés y fuentes desconocidas | Traducciones exactas revisadas o generación con fuente seleccionada; incertidumbre sin inventar |
| Los tres canales | Recorrido `processMetaMessage → generateAiReply → envío simulado`, más pruebas previas de transporte y recuperación |
| Pertinencia y privacidad | Ausencia de temas ajenos, conservación de cargos, herramientas filtradas y logs sin texto SQL/datos del huésped |

## Comparación de respuestas

Son salidas deterministas reproducibles con la ficha del catálogo inspeccionado;
la columna anterior describe el comportamiento del código previo o el incidente
reportado, no una evaluación nueva de una conversación real de Instagram.

| Consulta | Antes | Después |
|---|---|---|
| ¿Tienen servicio de aire acondicionado? | Listado de servicios al no reconocer un slug | No tengo un servicio confirmado para esa consulta. |
| ¿Tienen WiFi? | Saludo, viñeta con nombre/descripción y posible bienvenida/redes en primer turno | Conexión WiFi gratuita disponible en todo el establecimiento. |
| ¿Y el desayuno? | Tema reconocido con formato fijo extenso | Desayuno continental incluido en la tarifa de alojamiento. |
| ¿Qué servicios tienen? | Todas las descripciones | Resumen de los principales servicios incluidos; ofrece ampliar sin enumerar todo |
| ¿Tienen piscina? | Sin garantía de selección específica | No tengo un servicio confirmado para esa consulta. |
| Do you have WiFi? | El camino determinista no controlaba el idioma | Free WiFi is available throughout the property. |
| ¿A qué hora?, después de preguntar por desayuno | Sin resolución dedicada del seguimiento | No tengo información confirmada sobre el horario de ese servicio. |

## Riesgos, límites y verificación pendiente

- Las consultas ambiguas y traducciones no revisadas siguen dependiendo del modelo;
  las pruebas simuladas verifican entradas, selección y enrutamiento, no garantizan
  cada redacción futura del modelo real.
- La detección determinista usa gramáticas conservadoras y sinónimos. Una expresión
  nueva puede necesitar ampliación; jamás debe usar todo el catálogo como respaldo.
- El catálogo turístico existente conserva sus fuentes y reservas sobre direcciones.
  No se revalidó externamente la vigencia de todos los negocios, horarios o accesos.
- La ficha de un servicio es texto libre: sus condiciones se conservan completas en
  preguntas específicas para no perder cargos. Una descripción administrativa muy
  extensa puede requerir síntesis con el modelo o una futura ficha estructurada.
- La revisión de Supabase no cambia ni certifica globalmente RLS. El asesor de
  seguridad devolvió avisos informativos de RLS sin políticas, coherentes con un
  backend de acceso privilegiado pero pendientes de una auditoría de permisos
  independiente. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- No se realizaron reservas reales, cobros, envíos a huéspedes ni despliegues. Queda
  pendiente la prueba real supervisada en los tres canales después de autorizar la
  publicación. También debe observarse consumo y longitud de respuestas generativas
  tras retirar el tope anterior; no se promete un ahorro de tokens sin medición real.
- Las diferencias de despliegue entre la rama de código y Render no se resolvieron
  porque publicar producción está excluido de esta entrega.

## Estado de revisión y despliegue

Código preparado en rama separada y enviado como propuesta de revisión mediante
pull request, sin fusionarlo con `main`. El identificador definitivo del commit y
el estado de CI constan en GitHub. Este informe no afirma que Render esté ejecutando
estos cambios ni que un huésped ya haya recibido las respuestas corregidas.

Para reproducir la verificación: instalar las dependencias del lockfile, ejecutar
`npm test` desde `backend` y revisar el diff. La revisión debe mantener fuera del
alcance cambios de precios, políticas o datos personales. Publicar en producción
requiere la autorización expresa solicitada por el propietario del proyecto.

Referencia técnica consultada: documentación oficial de Responses API,
https://developers.openai.com/api/reference/resources/responses/methods/create
(instrucciones en cada continuación, estado incompleto y límite opcional de salida).
