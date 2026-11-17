# Cotización por composición: revisión del tarifario

La especificación comercial actual solicitada se encuentra en
[INSTRUCCIONES_ASESOR_TARIFARIO_BASE.md](INSTRUCCIONES_ASESOR_TARIFARIO_BASE.md).
Fuente: CASA HUESPEDES TARIFARIO.pdf, 15/11/2026, páginas 1–3.

## Cálculo solicitado

**Por noche = máximo(mínimo de categoría, 60 × A + 30 × N).**
A representa huéspedes con tarifa adulta; N, niños de 5 a 8 años. Se conserva
el criterio previo de tarifa adulta desde 9 años y la exigencia de un adulto
acompañante real. Los niños de 0 a 4 no incrementan precio ni plazas tarifarias;
todos los huéspedes conservan su conteo y sus validaciones físicas.

| Categoría del PDF | Mínimo | Plazas tarifarias |
|---|---:|---:|
| Matrimonial | S/ 100 | 2 |
| Doble | S/ 100 | 2 |
| Triple | S/ 140 | 3 |
| Familiar | S/ 180 | 5 |

Los niños de 5 a 8 cuentan para la capacidad. El mínimo se aplica después de
sumar adultos y niños, no antes de agregar un suplemento. Se retira la matriz
anterior de adultos y el cargo infantil de S/ 20 de la especificación revisada.
No aplicar descuentos o aumentos estacionales: factor efectivo 1,00 para todas
las fechas. Los factores futuros 1,50 y 0,70 y el calendario del PDF permanecen
como propuesta desactivada.

## Casos y publicación

La especificación enlazada reproduce la matriz completa y los siete ejemplos de
la primera página del PDF. También corrige los casos antiguos de Doble con niños
de 2 y 8 años y Triple con dos niños de 5 a 8.

Matrimonial Ejecutiva no tiene mínimo propio definido; el PDF deja pendiente su
tratamiento. Familiar aparece como una sola fila y debe conciliarse con Familiar
1 y Familiar 2 antes de reemplazar tarifas de ambas. Conservar seis categorías,
trece habitaciones y las capacidades físicas registradas.

**Estado de esta entrega: implementación preparada y pendiente de confirmación.**
El motor conserva los importes anteriores mientras la propuesta siga pendiente.
El adaptador, las instrucciones y el panel administrativo están preparados sin
aplicar SQL ni modificar reservas. Los estados de base y temporadas permanecen
pendientes y no pueden cambiarse por mensajes del huésped ni aprobando otras
propuestas comerciales. Consulte
[TARIFARIO_PENDIENTE_ACTIVACION.md](TARIFARIO_PENDIENTE_ACTIVACION.md) antes de
activar la nueva base, correspondencias o calendario.

Las reservas existentes y sus pagos no se recalculan. No afirmar disponibilidad
sin consultar inventario ni modificar políticas de servicios, mascotas o pagos a
partir de ejemplos que no los incluyen.
