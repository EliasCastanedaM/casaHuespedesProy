# Instagram: enlaces y recomendaciones

La invitación a ver habitaciones se añade a la primera recomendación de cada
solicitud. `room_invitation_sent` evita repetirla al elegir una categoría o
actualizar la misma solicitud. Una solicitud nueva empieza sin esa marca.
Las cotizaciones anteriores a esta versión ya contenían la invitación y se
tratan como enviadas. Un saludo muestra el menú, sin una promoción adicional.

Los enlaces de las respuestas de Instagram se entregan mediante botones
`web_url`. El texto y los grupos de hasta tres botones son partes independientes.
Las URL completas se conservan en el contenido original para el historial;
los parámetros de Maps no se sustituyen por búsquedas ni rutas diferentes.
El envío solicitado de la imagen de servicios mantiene su tipo `image`.

Antes de desplegar, aplicar
`database/migrations/2026-11-19-instagram-link-delivery-parts.sql`.
`meta_messages.delivery_parts` guarda el plan antes del primer envío. Cada parte
aceptada conserva su ID de Meta; la recuperación reintenta únicamente lo que
falta, sin volver a generar la respuesta. Las entregas iniciadas por versiones
anteriores conservan su división original.

Las pruebas cubren el payload HTTP con transporte simulado, los destinos
exactos y la recuperación después de fallar un botón. No envían mensajes a
huéspedes. La apertura del botón en la aplicación de Instagram requiere una
comprobación en ese cliente.

Referencias del proveedor:

- [Novedades oficiales de Instagram Messaging](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/changelog/)
- [Google Maps URLs: listas de lugares](https://developers.google.com/maps/documentation/urls/get-started)
