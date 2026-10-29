# Demostración administrativa — Casa Huéspedes Pimentel

Prototipo interactivo independiente para mostrar la experiencia de administración del alojamiento.

## Qué muestra

- Chat administrativo para consultar disponibilidad, llegadas, reservas de la semana y tarifas base.
- Preparación de solicitudes de reserva, bloqueo y liberación de habitaciones desde el chat.
- Calendario con vistas **Hoy**, **Semana** y **Mes**.
- Las **13 habitaciones activas** del inventario aprobado: 101, 201, 202, 203, 205, 301, 302, 303, 304, 305, 405, 407 y 505.
- Ficha visual de detalle de una reserva de ejemplo.
- Fotografías principales de las habitaciones alojadas en Cloudinary.

## Inventario y tarifas de referencia

| Categoría | Habitaciones | Tarifa base por noche |
|---|---|---:|
| Matrimonial Estándar | 205, 305 | S/ 120 |
| Matrimonial Ejecutiva | 101, 304, 505 | S/ 140 |
| Doble · 2 camas | 201, 301 | S/ 140 |
| Triple · 3 camas | 202, 302, 303, 407 | S/ 210 |
| Familiar 1 | 203 | S/ 250 |
| Familiar 2 | 405 | S/ 250 |

Tarifas de catálogo con IGV incluido. Desayuno no incluido. No se calculan tarifas dinámicas ni se consulta Beds24.

La habitación **406 está inactiva y excluida** del inventario de reservas; por eso no aparece entre las 13 habitaciones.

## Importante: alcance de la demostración

- No se conecta a Beds24, Booking.com, WhatsApp ni a la base de datos de producción.
- Las ocupaciones, fechas, huéspedes, códigos y solicitudes de recepción son ficticios.
- Confirmar una acción solo modifica el estado temporal de esta demostración en el navegador.
- Al recargar la página, los cambios locales se restablecen.
- No utilizar esta página para atender huéspedes ni para tomar decisiones operativas reales.

## Publicar con GitHub Pages

El repositorio `EliasCastanedaM/casaHuespedesProy` ya es público. Para publicar esta demostración:

1. En GitHub, abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Abre la pestaña **Actions** y ejecuta **Deploy demo Casa Huéspedes Pimentel** si el flujo no se ejecutó automáticamente.
4. Cuando termine correctamente, la página estará disponible en:

   https://eliascastanedam.github.io/casaHuespedesProy/demo-casa-huespedes/

El flujo copia solo esta demostración y el logotipo necesario al artefacto de Pages; no publica el resto del código fuente del proyecto como parte del sitio.
