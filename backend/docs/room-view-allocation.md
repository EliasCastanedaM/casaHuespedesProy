# Preferencias de vista y asignación física

Se aplica el mismo comportamiento en WhatsApp, Instagram y Facebook. El huésped recibe únicamente categorías, características confirmadas e importes. Los identificadores físicos solo aparecen en recepción.

## Inventario confirmado por el hotel

| Habitación interna | Categoría | Piso | Vista |
| --- | --- | ---: | --- |
| 205 | Matrimonial Estándar | 2 | Interior |
| 305 | Matrimonial Estándar | 3 | Interior |
| 101 | Matrimonial Ejecutiva | 1 | Interior |
| 304 | Matrimonial Ejecutiva | 3 | Interior |
| 505 | Matrimonial Ejecutiva | 5 | Al mar desde segunda fila |
| 201 | Doble - 2 Camas | 2 | Interior |
| 301 | Doble - 2 Camas | 3 | Interior |
| 202 | Triple - 3 Camas | 2 | Interior |
| 302 | Triple - 3 Camas | 3 | Interior |
| 303 | Triple - 3 Camas | 3 | Interior |
| 407 | Triple - 3 Camas | 2 | Interior |
| 203 | Familiar 1 | 2 | Interior |
| 405 | Familiar 2 | 4 | Acceso directo a terraza y vista al mar |

Estos datos ya están registrados en `rooms.view_type`; no se duplican ni se inventan características de ventanas. La preferencia “vista a la calle”, “hacia afuera” o similar se interpreta como exterior; una opción con vista al mar puede cumplirla, pero se explica su vista real y no se afirma que sea una vista exacta de una calle.

## Cotización y alternativas

Las preferencias estructuradas se conservan en el contexto y la nota de reserva: vista exterior, al mar o interior, cerca de ventana, terraza y balcón. No se guardan mensajes completos como preferencias. Se mantienen las fechas, composición del grupo, edades, camas y presupuesto. Dos adultos y 2 adultos tienen la misma interpretación.

Antes de cotizar, el servidor consulta reservas y bloqueos del inventario local. Selecciona la menor capacidad suficiente y prioriza mayor valor dentro de las opciones compatibles. Una categoría mixta como Ejecutiva solo cumple vista al mar si hay una unidad física elegible con esa vista. La consulta es una fotografía del registro local; la disponibilidad final continúa bajo confirmación humana.

Si falta la vista/categoría solicitada, se ofrece una alternativa de capacidad adecuada, se informa la característica que cambia y se espera aceptación. La preferencia original se conserva para recepción. Si la unidad se ocupa entre cotizar, aprobar o registrar, se vuelve a cotizar y no se sustituye silenciosamente por una interior.

## Ventanas y aprobación

La vista no prueba ubicación junto a una ventana. Un dato desconocido se comunica como pendiente. Para aprobar una ubicación cercana a ventana no documentada, el operador debe verificar la unidad sugerida y marcar la casilla correspondiente en recepción. La aprobación queda ligada al ID de esa unidad. Una ficha con ausencia de ventana explícita no admite esa excepción.

La asignación se revalida al registrar dentro de los bloqueos de categoría y habitación ya existentes. Solo una aprobación interna vigente puede habilitar la verificación manual de ventana. Una entrada del huésped o una petición pública no puede suplantarla. Cambiar preferencias invalida una aprobación anterior.

No cambia la restricción operativa que mantiene deshabilitada la confirmación automática desde el panel de WhatsApp hasta la aprobación de Meta y autorización operativa; las consultas y cotizaciones funcionan en los tres canales.

## Validación

`npm test` en backend cubre preferencias, disponibilidad, alternativas con aceptación, cambio de grupo, ventana, privacidad, carreras de inventario y asignación interna. La compilación del frontend y sus pruebas de interacción verifican el panel. No se generan reservas ni mensajes reales durante las pruebas.
