# Conciliación comercial — Casa Huéspedes Pimentel
**Fecha:** 19/10/2026 (hora Perú)  
**Fuentes examinadas:**
1. Captura «Inventario Maestro»: categorías, capacidades, camas, IGV, desayuno y tarifa Full.
2. Captura «CH-01 a CH-13»: numeración real, piso y vistas.
3. Captura «Casa Huéspedes - Reglas Comerciales».
4. Ficha pública Booking: https://www.booking.com/hotel/pe/casa-huespedes-pimentel.es.html
5. Web propia: https://www.casahuespedespimentel.com/
6. Base real de producción Supabase: tablas `room_categories`, `rooms`, `services`, `hotel_policy_rules`.

## Jerarquía de verdad

- **Inventario aprobado**: base interna de categorías y tarifas S/. Booking puede tener comisiones, descuentos y nombres distintos; **no sustituye los precios base propios**.
- **Supabase**: fuente técnica actual de inventario activo, bloqueos, clientes y pre-reservas. Los datos se actualizan tras aprobación comercial, nunca por un scraping de OTA.
- **Booking / web propia**: prueba de información *publicada*, útil para documentar servicios y condiciones. `verification_status='publicly_listed'` **NO** significa aprobado personalmente por la gerencia ni precio confirmado.
- **Reglas con «pendiente»**: se registran en `hotel_policy_rules` con `review_status='pending_review'`; el asistente no calcula importes ni aplica cargos de forma automática.

## Inventario conciliado — sin diferencias operativas

| Categoría | Habitaciones reales | Cantidad | Capacidad/unidad | Full/noche |
|---|---|---:|---:|---:|
| Matrimonial Estándar | 205, 305 | 2 | 2 | S/120 |
| Matrimonial Ejecutiva | 101, 304, 505 | 3 | 2 | S/140 |
| Doble - 2 Camas | 201, 301 | 2 | 2 | S/140 |
| Triple - 3 Camas | 202, 302, 303, 407 | 4 | 3 | S/210 |
| Familiar 1 | 203 | 1 | 5 | S/250 |
| Familiar 2 | 405 | 1 | 5 | S/250 |

**13 habitaciones activas.** La 406 se conserva **inactiva y sin categoría**, a falta de decisión explícita. El número 407 está correctamente asociado al **piso 2**, no al cuarto piso; el número físico no define la planta (otro edificio). Tarifas **IGV incluido** y **desayuno NO incluido**.

**Error de rótulo del Excel:** la columna «Capacidad Total» muestra 240, 420, 280, 840, 250 y 250, que son cantidad × tarifa Full, **no plazas de alojamiento**. Las capacidades reales por unidad son 2,2,2,3,5,5; no importar esa columna como ocupación. Verificar en hoja maestra si pretende decir «tarifa total a ocupación completa».

**Familiar 2 — descripción de camas:** la nueva captura dice únicamente «1 plaza», incompatible/incompleto para cinco personas; Supabase tiene registrada «1 cama de 2 plazas + 3 camas de 1½ plazas». **Se conserva el dato de BD** por ahora sin reescribir automáticamente; propietario debe confirmar cama por cama.

## Reglas diferenciadas entre dato, propuesta y autorización

| Regla | Estado de implementación |
|---|---|
| Full S/120/140/140/210/250/250, con IGV; no incluye desayuno | Oficial en categorías; no cambiar. |
| Niños 0–4: sin cargo si usan cama existente | Confirmado en hoja; IA puede informar; revisar capacidad. |
| Niños 5–8: 50 % del diferencial mínimo/máximo | Informar fórmula, **sin monto automático**; cotización humana. |
| Niños desde 9 años | **PENDIENTE**: hoja dice «pendiente de confirmar». IA ya no afirma automáticamente tarifa de adulto. |
| Mascotas S/20 IGV incluido | **PENDIENTE periodicidad**: hoja no confirma por mascota/noche o estadía; IA no fija esa unidad. |
| Grupos de 8+ | Cotización especial posible, humano debe aprobar. |
| Descuento ocupación: S/20 por persona por debajo de capacidad total | Propuesta **no automática**; requiere definición de tarifa mínima y autorización. |
| Rango anual -30 % a +50 % | Para recomendaciones futuras; no alterar inventario sin aprobación. |
| Feriado con fin de semana: 3 noches; sin fin de semana: 2 | Pendiente cargar/calificar fechas en calendario. No usar para bloquear reservas aún. |
| Adelanto temporada alta 50 % | **Pendiente** calendario y aprobación; no exigir pago automático. |
| Revenue IA semanal y campañas | Solo sugerencias; admin siempre aprueba tarifas y contenido. |
| Asignación categoría mínima suficiente | Lógica actual de IA; excepciones previa aprobación humana. |
| Mascotas/niños/excepciones reales | Handoff al equipo antes de cotizar/cerrar. |
| Temporada alta | Precargar fechas y validar antes de modificar inventario. |

## Servicios registrados — sin precios inventados

Los siguientes **9** servicios/ayudas se cargaron en `services`, indicando la fuente (Booking/web), y ahora son consultables por `/api/services`, la web y el asesor IA:

1. WiFi gratuito (es el único servicio de la lista con gratuidad explícita).
2. Cocina compartida.
3. Terraza.
4. Salón compartido.
5. Limpieza diaria.
6. Lavandería/planchado (coordinar; costo sin confirmar).
7. Información turística.
8. Orientación para estacionamiento cercano (no prometer estacionamiento propio).
9. Apoyo para coordinar taxi (no prometer taxi incluido).

**No afirmar** que los servicios con precio no especificado son gratuitos, que hay cuna/cama extra garantizada, ni que el desayuno está incluido. Booking puede ofrecer servicios adicionales con precios propios por canal.

## Diferencias pendientes con Booking / terceros

- **Dirección:** ficha Booking y sitio propio muestran «Calle José Quiñones 237». Google Hoteles muestra «José Quiñones 233». Gerencia debe confirmar oficialmente antes de uniformar ficha Google, Meta e IA.
- **Tipos de habitación:** Booking usa sus propias descripciones y en búsquedas puede mostrar capacidades distintas de las seis categorías internas. No importar ocupación/nombres OTA sin validación por categoría.
- **Check-in 14:00–22:00, check-out 11:30–12:00:** horarios publicados en Booking; se guardan como *regla pendiente* hasta confirmar si valen también para reservas por la web.
- **Descanso 23:00–08:00, sin fumar ni fiestas:** aparece publicado en Booking. Informar con cuidado; el reglamento definitivo debe alinearse entre plataformas.
- **Mascotas:** Booking dice «bajo petición, puede tener suplemento» sin fijar frecuencia, reforzando la necesidad de validarla.
- **Desayuno:** Booking puede mostrar servicio disponible, pero no implica que esté incluido en las tarifas Full de la hoja interna.

## Arquitectura implementada / por implementar

**Ya implementado:** `services` con fuente y estado público, nueve registros; `hotel_policy_rules` con 19 reglas registradas (7 `verified`, 12 `pending_review`); endpoint público de solo lectura `/api/services`; página web de servicios dinámica y respuestas deterministas del asesor para preguntas sobre servicios; corrección de respuestas infantiles/mascotas ambiguas.

**Implementación adicional [PR #39](https://github.com/EliasCastanedaM/casaHuespedesProy/pull/39):** el asesor ahora consulta `hotel_policy_rules` en Supabase al responder sobre niños, mascotas y grupos. Valida `review_status` antes de mostrar una frecuencia de cobro o una tarifa adulta y ofrece fallback prudente si hay error de conexión. Pruebas de backend: **157/157** (compilación web correcta).

**Pendiente de implementación:** panel administrativo para aprobar/cambiar reglas sin SQL, sincronización de reglas de **precios dinámicos** con el cálculo transaccional de reservas, calendario de feriados/temporadas, política de noches mínimas y adelantos, comprobación del nuevo endpoint público en Render y conexión PMS/channel manager por separado. El registro de reglas por sí solo NO activa aumentos, cobros ni bloqueos.

**Seguridad:** `services` y `hotel_policy_rules` con RLS activo, sin privilegios directos `anon`/`authenticated`. Acceso mediante backend Node PostgreSQL.

**Antes de cerrar el trabajo:** verificar servicio web público y asesor en Render tras despliegue; comprobar los nueve servicios en la web, preguntar por desayuno/cocina/lavandería en Instagram; confirmar dirección oficial, periodicidad de mascotas, regla desde nueve años y camas de Familiar 2. No se ha creado ninguna reserva de prueba en producción.
