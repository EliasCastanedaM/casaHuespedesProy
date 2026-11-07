# Referencia actual del hotel — 7 de noviembre de 2026

Las capturas aportadas por el responsable actualizan la información común que consulta el asesor en WhatsApp, Instagram y Facebook.

## Datos principales aprobados

- Dirección: Calle Quiñonez 233, Pimentel, Chiclayo, Perú. Referencia: a una cuadra del Muelle de Pimentel, en la paralela al primer malecón. Reemplaza la dirección anterior terminada en 237.
- Se conserva el enlace de Maps aprobado y las recomendaciones de taxi y cochera de terceros, sin nombres de proveedores. No hay estacionamiento propio.
- Cada habitación dispone de baño privado con agua caliente, TV y Netflix y ventilador. El baño incluye toallas y papel higiénico.
- Desayuno continental incluido en la tarifa. Este dato reemplaza expresamente la referencia anterior a desayuno no incluido; no modifica los importes numéricos del catálogo.
- WiFi gratuito en todo el establecimiento, cocina compartida abierta a huéspedes y terraza común del cuarto piso con vista al mar. La vista de la terraza no se atribuye a todas las habitaciones.

## Listado complementario

Se registran salón compartido y zona de TV, mobiliario exterior y solárium, limpieza, lavandería, planchado y limpieza en seco, barbacoa, traslado al aeropuerto, cafetería/restaurante/snack-bar, fruta/agua/bombones o galletas, menú infantil y menús dietéticos bajo petición, seguridad en zonas comunes, factura y registro privado, información turística, playa cercana y pediluvio, categorías familiares/no fumadores y atención presencial en español.

Lavandería, barbacoa y traslado al aeropuerto figuran como servicios de pago. Las tarifas y disponibilidad no indicadas requieren coordinación. Los alimentos, bebidas y servicios sin precio no se presentan automáticamente como gratuitos. La admisión de mascotas mantiene autorización previa y S/ 20 por mascota por noche.

La frase de la ficha general “situado frente a la playa” queda registrada como pendiente de contraste; no se presenta como confirmada. Se utiliza la dirección y referencia precisas. No se inventan horarios, tarifas de traslados/servicios ni idiomas adicionales del personal.

## Medios de pago

Efectivo, transferencia a cuenta de ahorros BCP, Yape, Plin y tarjetas Visa y Mastercard. Los números exactos se transcriben en la migración y en la fixture de prueba `hotel-reference-20261107.json`, conservando el CCI como texto con ceros iniciales. No se inventan titular, moneda de la cuenta ni comisiones.

La información se consulta desde `hotel_policy_rules` únicamente si `formas_pago` está activo y verificado. Si no puede consultarse o los destinos no son válidos, no se muestran números supuestos. Las consultas no alteran el borrador de reserva ni solicitan datos bancarios del huésped.

Pedir pagar o avisar un pago por transferencia/Yape/Plin deriva a revisión humana. No verifica movimientos ni los procesa como Culqi. Se conserva el flujo operativo de pago presencial o enlace Culqi después de aprobación humana.

## Persistencia y comprobaciones

La migración `20261107154805_advisor_hotel_reference_data.sql` actualiza el perfil, 24 servicios, la condición de desayuno y las reglas informativas. Reutiliza tablas existentes protegidas por RLS; no modifica importes por ocupación, reservas, pagos ni bloqueos.

Las pruebas verifican números y ceros iniciales, información específica y general, costos adicionales, consultas durante reservas, los tres canales, consulta de servicios mediante herramienta y ausencia de confirmación automática de pagos manuales. El footer y la página de servicios evitan conservar dirección y desayuno antiguos.
