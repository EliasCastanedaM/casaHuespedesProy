# Cambio de política infantil y recomendación por camas

Fuente: instrucción del propietario y respuestas de aclaración del 14/11/2026.
Se incorpora al PR de revisión del asesor, sin fusionar ni desplegar a producción.

## Problema corregido

La selección y la búsqueda de inventario usaban el total de huéspedes como si todos
necesitaran una plaza independiente. La cotización, aprobación y transacción final
rechazaban una matrimonial para dos adultos con un niño pequeño. Cambiar solo el
prompt habría dejado esas tres validaciones incompatibles.

## Regla implementada

| Edad | Cobro |
|---|---|
| 0 a 4 años | Sin cargo si no se añaden camas; hasta dos comparten cama de 2 plazas con sus padres |
| 5 a 8 años | S/ 20 por niño y por noche |
| Desde 9 años | Tarifa de adulto |

El huésped conserva su conteo real; la distribución de camas se verifica aparte.
Una cotización que supone compartir lo dice expresamente y exige confirmación
humana de las camas antes del registro. Rechazar compartir o cambiar edades invalida
las condiciones anteriores y provoca una nueva evaluación.

## Archivos y controles

- `rooms/guestComposition.js`: composición, edades, lectura de camas y excepción
  de hasta dos niños, sin elevar plazas independientes registradas.
- `ai.occupancy-pricing.js`: suplemento fijo, categorías básicas primero y hasta dos
  alternativas; precios consultados, sin fórmula anterior ni tope antiguo.
- `roomOccupancyRates.service.js`: búsqueda por plazas y filtrado por camas reales.
- `ai.reservation.js` y `ai.service.js`: opciones numeradas, negaciones de compartir,
  revalidación y versión de la política en aprobaciones.
- `booking.service.js`: validación de camas dentro de la transacción y persistencia
  de todos los huéspedes; la composición solo se admite con aprobación interna.
- `ai.prompt.js`, `ai.guest-rules.js` y `ai.policy-info.js`: reglas comunes y textos
  coherentes. Las reglas pendientes o ausentes de la fuente administrativa no se
  publican como condiciones aprobadas.
- Pruebas existentes actualizadas por el cambio comercial autorizado y nuevas
  pruebas en `ai-child-beds.test.js` y `category-inventory.test.js`.

Se conservan bloqueos de fechas, asignación interna, vistas, autorización de
mascotas, revisión humana, métodos de pago y privacidad de números de habitación.

## Caso de la captura

25 al 28 de noviembre de 2026: tres noches, dos adultos, un niño de un año, sin
mascotas y compartiendo cama con sus padres:

| Opción | Por noche | Tres noches |
|---|---:|---:|
| Matrimonial Estándar | S/ 120 | S/ 360 |
| Matrimonial Ejecutiva | S/ 140 | S/ 420 |
| Triple con cama propia existente para el niño | S/ 190 | S/ 570 |

Se presentan únicamente las opciones compatibles que tengan unidades libres en el
inventario consultado; el equipo confirma disponibilidad antes de cerrar.

## Datos y alcance pendiente

El script `database/proposals/2026-11-14-child-beds-policy.sql` está preparado,
no aplicado. Reemplaza las configuraciones infantiles antiguas y ajusta la descripción
de camas de Familiar 2 según la imagen, sin cambiar tarifas de adultos ni cantidades.
Familiar 1 mantiene su máximo administrativo de cinco plazas independientes aunque
la descripción física suma siete; no se inventan tarifas de seis o siete adultos.

La publicación del backend y la aplicación coordinada del SQL requieren autorización
expresa. Las pruebas usan base y proveedores simulados; no se realizaron cobros,
reservas reales ni envíos de prueba a huéspedes.

La especificación operativa completa y los ejemplos están en
[occupancy-pricing.md](occupancy-pricing.md).

## Validación de esta ampliación

La suite completa terminó con 439 pruebas aprobadas, cero fallidas y cero omitidas
(Node v24.22.1). Incluye 25 pruebas nuevas frente a las 414 de la entrega anterior.
Se verificaron sintaxis de los 14 archivos JavaScript modificados y consistencia del
diff. Las pruebas de registro confirman que se guardan tres huéspedes y se validan
dos plazas para dos adultos con un niño compartiendo, sin saltarse los bloqueos de
inventario. La composición incluida en una petición pública no habilita la excepción.
