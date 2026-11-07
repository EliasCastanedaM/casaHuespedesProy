# Cotización global por ocupación

El mismo flujo atiende WhatsApp, Instagram y Facebook. La disponibilidad siempre requiere aprobación humana antes del registro y del pago.

## Catálogo interno aprobado

Importes por noche en soles. No se publican como tabla al huésped.

| Categoría | Capacidad | 1 | 2 | 3 | 4 | 5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Matrimonial Estándar | 2 | 100 | 120 | — | — | — |
| Matrimonial Ejecutiva | 2 | 120 | 140 | — | — | — |
| Doble - 2 Camas | 2 | 120 | 140 | — | — | — |
| Triple - 3 Camas | 3 | 170 | 190 | 210 | — | — |
| Familiar 1 | 5 | 170 | 190 | 210 | 230 | 250 |
| Familiar 2 | 5 | 170 | 190 | 210 | 230 | 250 |

Todos los huéspedes cuentan para la capacidad, incluidos bebés y niños. Se elige la menor capacidad suficiente y, dentro de ella, primero la opción de mayor valor que respete las preferencias. Una solicitud de menor precio permite ofrecer la alternativa más económica de esa capacidad. Un presupuesto explícito limita las opciones. Las preferencias de camas, terraza y vista se respetan; no se promete una característica no confirmada.

## Niños y mascotas

- Hasta 4 años: sin cargo adicional usando las camas existentes, sujeto a revisión humana de camas.
- De 5 a 8: por niño, 50 % de la diferencia entre la tarifa correspondiente a los adultos computables y la tarifa individual, en la misma categoría.
- Desde 9: se cuentan como adultos para el cálculo comercial.
- El alojamiento no supera la tarifa de esa misma categoría si todos los huéspedes del grupo pagaran como adultos. El tope se aplica al alojamiento antes del cargo por mascotas.
- Mascotas: S/ 20 por mascota y noche, con admisión sujeta a autorización.

Ejemplos por noche: 2 adultos + niño de 6 en Triple = S/ 190 + 50 % × (190 − 170) = S/ 200. Dos adultos + niños de 6 y 3 en Familiar = S/ 190 + S/ 10 = S/ 200. Cuatro adultos + niño de 6 en Familiar: S/ 230 + S/ 30, limitado a S/ 250. Dos adultos sin niños: Ejecutiva S/ 140; al pedir menor precio, Estándar S/ 120.

## Conversación y privacidad

Se solicitan progresivamente fechas, adultos, cantidad y edades de niños, mascotas y preferencias necesarias. No se pide identidad, correo, teléfono adicional ni documentos durante la cotización. La fórmula y los tramos de edad permanecen internos. Se comunica categoría, precio por noche y total de la estadía. Si preguntan por variaciones de precio, se explica que dependen de la categoría y del número de huéspedes y que las edades de los niños se consideran de forma distinta.

El aviso de procesamiento se guarda como mensaje `system`, separado de la respuesta final `assistant`. Ambos se asocian al mensaje entrante con índices únicos independientes. Un reintento recupera la respuesta final o el aviso pendiente sin confundirlos ni repetir un envío ya aceptado por Meta. No se añaden avisos al historial del modelo.

La cotización mantiene el estado `quoted`; permite pedir una alternativa antes de aceptar la revisión humana. Al aceptar, se vuelve a calcular con las tarifas vigentes. Si cambia el importe, se presenta de nuevo y se espera otra aceptación. El estado `handoff` pausa la IA solo en ese chat. Los cambios posteriores invalidan el importe anterior. Grupos que exceden una habitación o de 8 o más se derivan para distribución y tarifa manual.

## Despliegue y validación

Aplicar primero `database/migrations/20261107142116_global_occupancy_pricing.sql` y después desplegar el backend. La tabla interna tiene RLS activo y carece de acceso para roles Data API; solo la conexión del servidor consulta las tarifas. El campo público existente `price_per_night` no es la fuente de las cotizaciones del asesor.

Ejecutar `npm test` en backend. Las pruebas cubren importes, capacidad, edades, tope, mascotas, preferencias, cambios de composición y tarifas, privacidad, filtro de alcance, los tres canales y recuperación del aviso de procesamiento. No envían mensajes reales ni generan reservas reales.
