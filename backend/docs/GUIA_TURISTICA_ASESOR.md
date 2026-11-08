# Guía turística informativa para el asesor IA

Actualización de fuentes: 8 de noviembre de 2026.

## Alcance

El asesor puede responder consultas sobre restaurantes, cafeterías, playa,
malecón, museos, arqueología y naturaleza de Pimentel y Lambayeque usando
backend/src/modules/ai/ai.tourism.js. Este archivo es la fuente de verdad
para los lugares; está separado de las tablas de reservas, tarifas y pagos.

Por solicitud del hotel:
- Mencionar, sin promocionar, los negocios de terceros.
- Dar nombres y direcciones comprobadas o una referencia geográfica clara.
- No mostrar cartas, precios de restaurantes, horarios ni descuentos.
- No afirmar "el más cercano" ni inventar minutos o kilómetros desde el hotel.
- Separar Pimentel de excursiones en otras localidades.
- No reservar restaurantes, comprar entradas ni prometer que estén abiertos.
- Respuestas cortas de hasta cuatro lugares; ante "otros restaurantes" se
  muestra un grupo diferente.
- No modificar conversaciones, presupuestos, inventario, habitaciones, pagos
  ni el flujo de atención humana por responder turismo.
- Para ubicaciones incompletas, el usuario ve "por confirmar" en el texto.

## Restaurantes de la infografía original

Picantería La Tintorera, Bertika's y La Tienda del Pato.
La numeración de La Tienda del Pato no se ha corroborado; solo se muestra
la calle José Quiñones.

## Fuentes principales y actualización

Museos y arqueología:
- https://www.gob.pe/institucion/naylamp/sedes
- https://www.gob.pe/institucion/naylamp/campa%C3%B1as/107721-museos-abiertos-visita-los-museos-de-lambayeque-gratis
- https://museos.cultura.pe/museos/museo-de-sitio-t%C3%BAcume
- https://www.gob.pe/10988-visitar-el-museo-de-sitio-huaca-rajada-sipan

Naturaleza:
- https://visitaareasnaturales.sernanp.gob.pe/anps/santuario-historico-bosque-de-pomac/
- https://consultasenlinea.mincetur.gob.pe/fichaInventario/index.aspx?cod_Ficha=2350

Restaurantes: fichas locales y directorios consultados en noviembre de 2026.
- Bertika's, calle Lima 200: https://pe.todosnegocios.com/bertikas-979-732-537
- La Tintorera, Manuel Seoane 733: registro de establecimiento de Pimentel.
- La Tienda del Pato, calle José Quiñones: ficha pública de establecimiento.
- Picantería del Mar, Rivera del Mar 164: registro de establecimiento.
- Mintha Café, Manuel Seoane 725: registro de establecimiento.
- El Muelle Café - Lab, Manuel Seoane 510: registro de establecimiento.

La consulta de museos no confirma apertura para una fecha específica.
Si existe un cierre temporal, se deberá actualizar la información antes de
proporcionar una recomendación puntual de visita.

## Pruebas previstas

- Restaurantes, museos, naturaleza y lugares de Pimentel.
- Respuesta por nombre de establecimiento y dirección.
- Preguntas en español e inglés.
- No responder recetas, tareas, programación, ni consultas generales.
- Preguntas turísticas no deben pedir fechas ni afectar contexto de reserva.
- Mismo comportamiento en WhatsApp, Facebook e Instagram.
