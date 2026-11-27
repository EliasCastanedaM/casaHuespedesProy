# Estabilización de la línea base del asesor

Fecha: 27/11/2026. Base: `af42a5b1480ee88420bfdfaa5583008f831f7bec`.
Esta entrega implementa la primera fase aprobada: correcciones y regresiones en
una rama. No implementa todavía la interfaz de AI Testing Lab, no activa el
tarifario pendiente y no autoriza una fusión o publicación en producción.

## Comportamiento corregido

1. Un rango inválido se rechaza como unidad; su salida no se reutiliza como
   entrada. El rango «25 al 28 de noviembre» requiere aclaración si el día actual
   vuelve ambiguo el año de sus extremos. Las fechas pasadas o estancias fuera
   del límite de disponibilidad no generan nuevas ofertas o acciones. Se conserva
   la composición del grupo y se invalidan cotización, consentimiento y aprobación.
2. Los cargos publicados se contrastan con `commercial/operationalPolicy.js`,
   utilizado por el calculador. Una regla con importe/frecuencia incompatible
   produce incertidumbre y no puede aprobarse desde el panel. No se migran datos
   ni se sustituyen los importes actuales por los del tarifario PDF pendiente.
3. QA desactiva los reintentos del SDK, limita cada llamada a diez segundos,
   propaga cancelación y caducidad durante el turno y reserva presupuesto antes
   de invocar. El uso incierto se conserva separado del uso informado; la
   reserva conservadora no equivale a una garantía de facturación del proveedor.
4. Se actualiza el lockfile del frontend dentro de las versiones mayores
   existentes. Se sustituye nodemon por `node --watch` para desarrollo, retirando
   sus dependencias vulnerables. CI audita ahora backend y frontend.
5. README y documentos de operación distinguen reglas vigentes de propuestas,
   memoria local/persistida de estado remoto y ejecución de QA de calidad del modelo.

## Pruebas y resultados locales

| Comprobación | Resultado |
| --- | --- |
| Línea base original, reloj real | 668/670 entradas aprobadas; 2 fallos de fecha |
| Suite corregida, Node 22 | 692 casos con aserciones aprobados; 0 fallidos |
| Nuevas regresiones | 24: fechas, coherencia de cargos y límites de QA |
| Frontend | 10 casos aprobados y build correcto |
| npm audit completo | 0 hallazgos backend y 0 frontend al verificar esta entrega |

El conteo original incluía dos archivos de fixtures sin aserciones. El script de
pruebas los excluye ahora: 668 casos existentes + 24 nuevos = 692. Las suites de
noviembre fijan su reloj; `ai-date-boundaries.test.js` usa fechas explícitas
para probar el paso del tiempo, el cambio de día en Lima, bisiestos y fin de año.
No se rebajaron las expectativas de los dos fallos originales.

`ai-qa-limits.test.js` utiliza el SDK real contra un servidor local que devuelve
429: verifica un solo intento HTTP. También reproduce expiración y cancelación de
una generación pendiente. Los demás proveedores y la base se simulan. No se
ejecutaron reservas, pagos, correos ni mensajes reales.

## Pendientes separados

- Medición del modelo real con credenciales y presupuesto gestionados en staging.
- Contraste de configuración y reglas actuales de la base, sin aprobarlas por SQL.
- PostgreSQL temporal para concurrencia real y cuentas de prueba para entregas.
- Catálogo versionado, calificación, comparación e interfaz de AI Testing Lab.
- Autorización explícita de fusión y despliegue tras revisar esta entrega.

La compilación conserva la advertencia previa sobre el tamaño del bundle. Esta
entrega no introduce rediseño ni cambios de interfaz de huéspedes.
