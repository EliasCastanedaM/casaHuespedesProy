# Tarifario preparado, pendiente de confirmación

## Estado de esta entrega

El tarifario del PDF del 15/11/2026 está preparado en la rama principal como
propuesta pendiente. Las tarifas operativas, políticas infantiles vigentes,
reservas, pagos e inventario no se modifican. Publicar este código no aprueba
la propuesta ni el calendario.

La configuración controlada por el servidor es
`src/config/tariffProposal.js`. Base, correspondencias de categorías, temporadas
y calendario conservan estados pendientes. No existe una ruta HTTP ni un mensaje
de chat que pueda aprobarlos. Aprobar otras propuestas del panel comercial no
activa este tarifario. Una simulación tampoco genera una reserva ni una
cotización aceptable por el huésped.

## Preparación implementada

- Fórmula base `max(mínimo, 60 × tarifa adulta + 30 × niños de 5 a 8)`.
- Niños de 0 a 4 fuera de la capacidad tarifaria; camas y seguridad se revisan.
- Los de 5 a 8 sí cuentan para la capacidad; desde 9 se conserva tarifa adulta.
- Al menos un adulto acompañante real, sin tratar un menor como acompañante adulto.
- Simulaciones regular, alta (+50 %) y baja (−30 %) en el panel administrativo
  **Reglas y tarifas → Tarifario del cliente**.
- Adaptador de cotización futura conectado detrás de la confirmación de servidor,
  con firma de versión, control de capacidad y sin reutilizar importes anteriores.
- Revalidación física compartida por cotización, aprobación y registro.
- Prompt común, respuestas de política infantil y resumen administrativo preparados
  para usar la regla confirmada; mientras esté pendiente conservan la anterior.
- Cálculo por cada noche para un calendario futuro explícito. La salida no se
  cobra; alta prevalece sobre baja cuando se superponen periodos aprobados.
  Se redondea el importe de alojamiento de cada noche al sol más cercano, con
  empate hacia arriba; esta convención también queda pendiente de confirmación.
  Las mascotas mantienen su importe separado, sin multiplicador estacional.

## Decisiones que siguen pendientes

1. Confirmación expresa de la fórmula base y sus mínimos.
2. Matrimonial Ejecutiva: el PDF no define mínimo propio.
3. Correspondencia de Familiar con Familiar 1 y Familiar 2. Ambas se mantienen
   en inventario; ninguna recibe un precio propuesto por inferencia.
4. Confirmación separada de aumentos y descuentos estacionales.
5. Calendario exacto anual de temporadas, feriados y eventos; fechas de entrada
   y salida de cada periodo, y convención de redondeo.

Los meses del PDF son referencias guardadas, no un calendario aprobado. La base
puede confirmarse sin activar temporadas: en ese caso el factor es 1,00 en todas
las fechas. Una categoría sin correspondencia confirmada pasa a revisión humana
al activar la nueva base; nunca vuelve silenciosamente a la tarifa antigua.

## Aplicación después de la confirmación del propietario

Esta sección describe una operación futura, no autorización ni trabajo ya realizado.

1. Registrar la confirmación exacta y las correspondencias decididas. En la
   configuración del servidor establecer `status: 'approved'` y una
   `confirmation_reference` no vacía para la base. Autorizar individualmente
   solo las correspondencias definidas. Mantener Ejecutiva o Familiares sin
   definición como pendientes; no inventar valores.
2. Conciliar los precios públicos y la matriz de ocupación registrados con las
   categorías expresamente aprobadas, preservando historial y reservas previas.
   Conciliar las reglas infantiles de la fuente administrativa con la nueva
   versión. El adaptador usa la fórmula confirmada, no la matriz antigua.
3. Mantener temporadas pendientes salvo autorización independiente. Para
   activarlas registrar su referencia, confirmar el calendario y cargar
   únicamente periodos exactos aprobados. Los periodos pendientes se ignoran.
4. Ejecutar las pruebas de tarifario y la suite de backend; comprobar el panel,
   categorías sin precio definido y cotizaciones con fechas entre temporadas.
5. Publicar la configuración confirmada y verificar precio, capacidad, resumen,
   aprobación y registro. Las cotizaciones cambian de firma de versión; las
   aprobaciones infantiles antiguas vuelven a revisión. Las reservas y pagos
   ya registrados conservan sus valores.

## Validación de esta entrega

`test/tariff-proposal.test.js` compara las 132 celdas de las tres tablas y los
21 ejemplos de noche/dos noches del PDF. Verifica límites de edad y capacidad,
adulto acompañante, fechas inválidas, confirmación sin referencia, categorías
pendientes, prioridad de alta, salida excluida, calendario pendiente y
aislamiento de la simulación respecto de las cotizaciones vigentes.

El endpoint administrativo agrega la propuesta al resumen existente mediante
solo lectura. No se ejecutan scripts de modificación de tarifas o reservas.

Resultado local: 543 pruebas de backend y 10 de frontend aprobadas; compilación
del frontend aprobada. La vista administrativa se verificó mediante renderizado
de servidor con datos simulados. La inspección visual en navegador no pudo
completarse por una restricción del entorno al iniciar Chromium.
