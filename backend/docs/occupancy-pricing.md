# Cotización por ocupación y distribución de camas

Actualización del propietario: 14/11/2026. La aclaración confirma que los 9 años
se cobran como adulto y que el cargo infantil es por cada noche.

## Tarifas de adultos

Se conserva la matriz vigente de `room_category_occupancy_rates`; no se inventan
importes ni se recalculan tarifas de ocupación a partir del precio Full.

| Categoría | Plazas independientes registradas | 1 adulto | 2 adultos | 3 adultos | 4 adultos | 5 adultos |
|---|---:|---:|---:|---:|---:|---:|
| Matrimonial Estándar | 2 | 100 | 120 | — | — | — |
| Matrimonial Ejecutiva | 2 | 120 | 140 | — | — | — |
| Doble - 2 Camas | 2 | 120 | 140 | — | — | — |
| Triple - 3 Camas | 3 | 170 | 190 | 210 | — | — |
| Familiar 1 | 5 | 170 | 190 | 210 | 230 | 250 |
| Familiar 2 | 5 | 170 | 190 | 210 | 230 | 250 |

Importes en soles por noche, según la lectura del catálogo durante la revisión.
El motor consulta siempre el registro vigente al cotizar y vuelve a verificarlo
al aceptar. Una categoría no aparece en las opciones si el inventario consultado
no tiene una unidad compatible libre para esas fechas.

## Nueva regla infantil

- Hasta 4 años inclusive: sin cargo cuando no se añaden camas adicionales. Hasta
  dos pueden compartir la cama de sus padres, de 2 o 1½ plazas. El motor conserva
  la distribución internamente; el equipo debe confirmarla antes del registro.
- De 5 a 8 años inclusive: S/ 20 por niño y por noche.
- Desde 9 años: tarifa de adulto.

Se retiran la fórmula del 50 % del diferencial y el tope por ocupación equivalente.
Las mascotas conservan su cargo y autorización actuales.

## Camas y huéspedes

`guestComposition.js` comparte la validación entre cotización, aprobación y
registro transaccional. Todos los huéspedes permanecen en el conteo: dos adultos
y un bebé son tres huéspedes, aunque requieran dos plazas independientes.

Una cama de 2 plazas proporciona dos plazas independientes; una de 1½ o 1 plaza,
una. El propietario autoriza que dos padres compartan una cama de 1½ plazas al
viajar con niños. Hasta dos niños de hasta 4 años pueden compartir la cama de sus
padres. Los niños restantes necesitan camas existentes disponibles. Esta excepción
familiar no habilita adultos adicionales fuera de la capacidad y tarifa registradas.
Si falta la ficha de camas, no se aplica automáticamente la excepción.

Si un niño pequeño necesita cama propia, se buscan opciones desde Doble hacia
arriba según las camas necesarias. No se añade una cama supletoria ni se inventa
un suplemento para ese niño: cambia el precio de la categoría cuando corresponde.
Los niños de 5 a 8 años conservan S/ 20 por niño/noche. Una preferencia de camas
separadas para los adultos impide agrupar a ambos padres en una cama.
Los grupos de ocho o más y las solicitudes de varias habitaciones mantienen
gestión humana.

## Recomendación y disponibilidad

La primera opción es la categoría básica compatible y disponible. Se muestran
como máximo dos alternativas superiores compatibles, manteniendo vistas, camas,
presupuesto y preferencias. No se ofrece primero la más cara por defecto.
Los números 1–3 eligen exclusivamente las opciones recién mostradas en la cotización.

La búsqueda inicial usa la ocupación con tarifa adulta para no excluir familias
por su conteo total; después se comprueba cada
categoría con su ficha real y preferencias. Al aceptar se revalida inventario y
precio. La aprobación humana y el registro final repiten la comprobación de camas.
El registro guarda el total real de huéspedes; un cuerpo de petición pública no
puede habilitar la excepción de capacidad mediante una composición inventada.
Solo la ruta interna con aprobación humana admite esa composición validada.

## Ejemplos

Para entrada el 25/11 y salida el 28/11 son tres noches, sin mascotas:

| Grupo y condición | Categoría | Por noche | Total |
|---|---|---:|---:|
| 2 adultos + niño de 1 o 4 años compartiendo cama | Matrimonial Estándar | 120 | 360 |
| Mismo grupo compartiendo cama | Matrimonial Ejecutiva | 140 | 420 |
| 2 adultos + dos niños de hasta 4 años compartiendo cama | Matrimonial Estándar | 120 | 360 |
| 2 adultos + niño pequeño con cama propia, padres comparten 1½ | Doble - 2 Camas | 140 | 420 |
| 2 adultos + niño de 5 a 8 años, padres comparten 1½ | Doble - 2 Camas | 160 | 480 |
| 2 adultos + niños de 2 y 8, pequeño comparte con padres | Doble - 2 Camas | 160 | 480 |
| Mismo grupo, ambos niños con cama propia | Triple - 3 Camas | 210 | 630 |
| 2 adultos + niños de 5 y 8, cada niño con cama propia | Triple - 3 Camas | 230 | 690 |
| 2 adultos + niño de 9 años | Triple - 3 Camas | 210 | 630 |

Los precios dependen del catálogo y las opciones de disponibilidad en las fechas
consultadas; estos ejemplos no prometen stock real.

## Publicación y datos

El SQL `database/proposals/2026-11-14-child-beds-policy.sql` está preparado y **no
se ha ejecutado en producción**. Debe acompañar el despliegue autorizado para
reemplazar la regla anterior en `hotel_policy_rules` y ajustar la descripción de
Familiar 2 a la imagen del propietario. No altera cantidades de habitaciones,
capacidades registradas ni tarifas de adultos.

La ficha de Familiar 1 describe siete plazas en camas, pero su capacidad
administrativa sigue siendo cinco y no hay tarifas registradas para seis o siete
adultos. Esta entrega conserva ese límite; no supone tarifas o autorizaciones
adicionales. La propuesta de Familiar 2 distingue dos camas de 1½ y una de 1 plaza,
conservando cinco plazas independientes en total.

Las aprobaciones infantiles antiguas sin `children-2026-11-14-shared-parent-beds` vuelven a revisión
antes de crear una reserva. Las reservas ya registradas y sus pagos no se recalculan.

## Pruebas

`npm test` en `backend` verifica importes, límites de edades, plazas de cama,
negaciones de compartir, tres canales, selección de alternativas, disponibilidad,
aprobación, registros transaccionales y ausencia de cambios en reservas existentes.

## Mensaje al huésped

La cotización presenta únicamente habitación, importe por noche y total. Las
validaciones de distribución e inventario permanecen internas; no se repiten
explicaciones por opción. Los detalles y fotos se consultan en la página oficial
de habitaciones, cuyo enlace se envía cuando el huésped lo pide.
