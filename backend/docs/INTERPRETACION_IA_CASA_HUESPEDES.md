# Interpretación del asesor de Casa Huéspedes Pimentel

## Objetivo y alcance

Comprender solicitudes de alojamiento expresadas con lenguaje natural, jerga, errores de escritura y correcciones, manteniendo el control de tarifas y operaciones en el backend. Se trabaja sobre el asesor existente y el modelo configurado en OPENAI_MODEL; no se migra de proveedor ni se reentrenan pesos.

La mejora es una combinación de instrucciones especializadas, ejemplos de interpretación, salidas estructuradas, validaciones y un conjunto versionado de evaluación. No equivale a un fine-tuning ni a una certificación de precisión del modelo.

## Hallazgo

El flujo de reserva contestaba antes de llegar al modelo. Las expresiones regulares resolvían fechas, cantidades y preguntas pendientes; por eso una frase no prevista podía provocar la misma pregunta repetida aunque un modelo pudiera interpretarla.

## Diseño implementado

1. Se identifica si el mensaje pertenece a una solicitud de reserva y si puede requerir interpretación. Las respuestas inequívocas breves, los datos de identidad y los pasos de pago conservan su tratamiento específico.
2. Antes de analizar el mensaje se limpia el contexto si el huésped inicia otra solicitud. El intérprete recibe el mensaje actual, la fecha de Perú y únicamente datos operativos de la solicitud vigente. No recibe nombres, teléfono, correo, historial de otros chats, cotizaciones ni aprobaciones.
3. El modelo distingue datos, corrección, reserva nueva, continuación, consulta hipotética, consulta informativa y ambigüedad.
4. Los datos propuestos deben pertenecer a una lista de campos permitidos y aportar evidencia literal del mensaje. Se validan tipos, cantidades, edades, fechas, categorías y coherencia antes de aplicarlos.
5. El flujo existente pregunta por datos pendientes y consulta el motor de camas, tarifas e inventario. La interpretación no puede establecer importes, descuentos, unidades físicas, confirmaciones, reservas ni pagos.

Los mensajes hipotéticos y ambiguos conservan la solicitud sin modificaciones. Una salida estructurada inválida se convierte en una aclaración. Si el proveedor falla o no devuelve JSON utilizable, se conserva el tratamiento anterior; las preguntas ambiguas de una reserva no modifican su estado durante ese fallo.

## Especialización del hotel

- Reconocer parejas y familias: «mi señora», «mi flaca», «mis peques», «mi bebé», sin exigir palabras concretas.
- Conservar edades reales: un menor de 9 a 17 años sigue figurando como niño en los datos; la tarifa de adulto se resuelve después en el motor comercial.
- No inferir edades, ausencia de niños ni mascotas por silencio.
- Distinguir «¿tienen vista al mar?» de «quiero vista al mar».
- Diferenciar «¿y si fuéramos cuatro?» de una corrección afirmativa del grupo.
- Mantener independientes las seis categorías, sin inventar habitaciones ni disponibilidad.
- Conservar las reglas del propietario: camas compartidas de niños pequeños, suplementos infantiles, disponibilidad verificada, categorías compatibles y aprobación humana antes de registrar la reserva.
- Mantener los mensajes breves y el enlace de habitaciones aprobado por el propietario.

## Evaluación

El conjunto `test/fixtures/booking-understanding-cases.js` contiene 30 casos ficticios: parejas, familias, bebés sin edad, correcciones, edades parciales, niños mayores, mascotas, vistas, camas, fechas, reservas independientes, grupos grandes y cuatro idiomas.

Las pruebas de contrato y orquestación verifican validaciones y efectos del flujo usando respuestas simuladas. No prueban que el modelo acierte esos casos. Las pruebas de integración comprueban además el orden de interpretación, los tres canales, la exclusión de datos anteriores, los fallos del proveedor y la ausencia de cambios en consultas hipotéticas.

Para medir el modelo real, con la clave y el modelo ya configurados en el entorno del backend:

```sh
node scripts/evaluate-booking-understanding.mjs 30
```

El número permite una evaluación menor, con un máximo de 30 solicitudes. Consume llamadas al proveedor; utiliza solo los casos ficticios y no almacena respuestas del modelo. Falla explícitamente si no hay clave o si algún caso no satisface la expectativa. No imprime credenciales ni mensajes reales de huéspedes.

Antes de dar por demostrada la calidad semántica, revisar los errores del modelo real, ajustar instrucciones y repetir el conjunto. Mantener ejemplos de evaluación reservados, ampliar con fallos anonimizados autorizados y revisar manualmente casos ambiguos. No incorporar conversaciones privadas sin autorización ni cambiar expectativas para ocultar errores.

## Límites de verificación de esta implementación

La revisión local dispone del código y sus dependencias, pero no de una clave de OpenAI para llamadas reales. Por tanto se verifican el contrato y la integración, y se entrega el evaluador real; no se declara un porcentaje de precisión semántica ni que se haya realizado fine-tuning.

La interpretación agrega una llamada al modelo en mensajes de reserva que lo requieren y un tiempo máximo de diez segundos sin reintentos automáticos. Su uso se contabiliza con la telemetría existente como `assistant_response`, compatible con la restricción actual de la base de datos.

## Referencias consultadas

- Documentación oficial de OpenAI, Structured model outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Documentación oficial de OpenAI, Evaluation best practices: https://developers.openai.com/api/docs/guides/evaluation-best-practices

Las salidas estructuradas limitan la forma de la respuesta; la exactitud de la interpretación requiere evaluación independiente y validación de aplicación.
