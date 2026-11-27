# Seguimiento de auditoría: idioma, memoria y evaluación privada

Fecha: 27 de noviembre de 2026, America/Lima.

## Problema y cambio propuesto

La consulta `Do you have a room for two adults from December 10 to December 12, 2026?`
no activaba el intérprete de estadía. La respuesta abierta mencionaba las fechas,
pero el borrador conservaba solo los adultos, y la primera respuesta se generó en español.

La rama incorpora consultas de disponibilidad en inglés con datos concretos entre
las candidatas a interpretación. El contrato indica extraer esos datos para evaluar
la estadía, sin confirmar disponibilidad ni autorizar una reserva. Las consultas
generales de características y las hipótesis conservan sus barreras actuales.
La generación abierta y las continuaciones con herramientas reciben el idioma del turno
en el mismo contrato común; los nombres comerciales se mantienen.

El ejecutor QA también acumulaba sus estimaciones conservadoras de bytes UTF-8 como
si fueran el contexto real de cada respuesta anterior. Ahora usa el conteo de entrada
y salida informado por una respuesta completa para estimar su siguiente continuación.
La entrada nueva sigue reservándose conservadoramente. Un error o uso ausente/inválido
retiene la reserva completa. Se conservan límites de tokens, llamadas, caducidad,
cancelación, bloqueo de continuaciones desconocidas y ausencia de reintentos del SDK.

No se modifican importes, tablas comerciales, reglas de niños/mascotas, aprobaciones,
consentimiento de reserva ni transportes Meta. No se implementa AI Testing Lab.

## Evaluación real de la línea base

Estos resultados corresponden exclusivamente al commit desplegado
`426e452a18169b6cfbdddcd3c072ea30f95c6666`, antes de aplicar esta rama.
Modelo observado: `gpt-5.6-luna`. Se usó la cola privada existente con datos sintéticos,
memoria aislada y acceso de lectura a fuentes del hotel. No se enviaron mensajes a Meta.

| Escenario | Resultado observado |
| --- | --- |
| Corregir adultos conservando niño y fechas | Superado: 3 adultos, niño de 7 años y fechas originales. |
| Mes ausente y aclaración posterior | Superado: pidió confirmación sin guardar fechas incompletas; después guardó el rango completo. |
| Entrada/salida invertidas y corrección | Superado: pidió corregir y guardó el nuevo rango completo. |
| Inglés y memoria de fechas | Falló: primera respuesta en español y fechas ausentes del estado; el segundo texto pudo recuperarlas del historial. |
| Petición ajena e instrucciones internas | Superado: rechazo de la petición y respuesta posterior de ubicación. |
| Consulta informativa sin reservar y servicios | Superado: respuesta informativa y estado vacío en ambos turnos. |

La revisión cualitativa observó 5 de 6 escenarios satisfactorios. Es una muestra pequeña
y dirigida, no una estimación estadística de precisión general ni una evaluación completa
del conjunto holdout del intérprete.

Se completaron 12 turnos mediante dos corridas, tras dos interrupciones preventivas:

- Corrida inicial, límite 45.000: 2 llamadas, 3.991 tokens, detenida antes de responder.
- Corrida de seis escenarios, límite 80.000: 21 llamadas, 44.944 tokens; diez respuestas
  completas y una interrupción al comenzar el sexto escenario.
- Corrida separada del sexto escenario, límite 80.000 y 12 llamadas: 4 llamadas reales,
  10.730 tokens, ambos turnos completos. Sin nuevas interrupciones.
- Total consumido, incluidas las partes interrumpidas: 27 llamadas y 59.665 tokens.
- Solo los doce turnos completos: 22 llamadas y 49.635 tokens; mediana 2.736 ms y
  máximo 6.993 ms por turno. Son tiempos del generador, no de entrega al teléfono.

Ninguna llamada del proveedor falló en estas corridas. Las dos interrupciones fueron
`QA_BUDGET_REACHED`, no fallos de transporte o exactitud del modelo. La comprobación
posterior de la última corrida encontró cero conversaciones IA y cero mensajes Meta
persistidos con su identificador sintético, y ninguna corrida en ejecución.

## Validación de la rama

- Siete regresiones nuevas: las siete fallan al ejecutarlas contra el commit de la línea
  base y pasan con los cambios. Se incluyen los tres canales, persistencia de fechas,
  corrección de adultos, idioma en generación y continuación, presupuesto de contexto
  y consumo ausente o inválido.
- Módulos afectados: 83 pruebas aprobadas, cero fallos.
- Backend completo en Node 22.23.5: 695 pruebas aprobadas, cero fallos.
- Entorno local sin credenciales y con conexiones externas bloqueadas.

Las pruebas locales sustituyen las respuestas del proveedor y la persistencia por
dobles controlados. Verifican el enrutamiento, el estado y las protecciones, pero no
demuestran por sí mismas que el modelo real seguirá correctamente el contrato nuevo.

## Pendiente para una liberación

Esta rama no se ha fusionado ni desplegado. La evaluación real descrita arriba mide
la versión anterior, no estas correcciones. Antes de liberar corresponde ejecutar los
casos de inglés y la tanda completa sobre un entorno que ejecute esta rama, con el modelo
configurado y sus credenciales conservadas en el servidor. La cola de producción está
fijada al SHA desplegado y no permite probar una rama distinta sin publicarla allí.

El usuario hará después la comprobación desde sus cuentas en WhatsApp, Instagram y
Facebook. Los comentarios reales de clientes se incorporarán cuando se reciban.

## Referencia del cálculo de contexto

La documentación de Responses distingue el contexto encadenado por `previous_response_id`
de las instrucciones reenviadas en cada solicitud y describe `usage.input_tokens` y
`usage.output_tokens`. El conteo previo informado permite evitar acumular recursivamente
estimaciones de bytes como si fueran tokens. La reserva sigue siendo preventiva y no
equivale a una garantía de facturación.

- [Responses API: crear respuesta](https://developers.openai.com/api/reference/resources/responses/methods/create)
- [Migración a Responses: conversación y uso](https://developers.openai.com/api/docs/guides/migrate-to-responses)
