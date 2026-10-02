# Casa Huéspedes Pimentel - App Android

Aplicación interna de recepción para registrar reservas directamente en la misma base de datos de Casa Huéspedes Pimentel.

## Flujo

1. Iniciar sesión con una cuenta admin/staff existente.
2. Elegir fecha de ingreso, número de noches y huéspedes.
3. Seleccionar una habitación física disponible.
4. Ingresar nombre y celular del huésped.
5. Confirmar. La reserva queda en estado `confirmed`, origen `mobile` y sin flujo de pago.

## Secciones

- Dashboard: ocupación, disponibilidad, llegadas, salidas, reservas e ingresos.
- Reservar: habitaciones físicas con categoría, precio y disponibilidad.
- Reservas: historial de reservas y datos del huésped.

## Backend

Por defecto consume:

`https://casa-real-huespedes-backend.onrender.com/api`

Puede cambiarse al compilar:

`flutter run --dart-define=API_BASE_URL=https://tu-backend.com/api`

## Preparar Android

Este repositorio contiene el código Flutter. En una PC que tenga Flutter instalado, desde esta carpeta ejecuta una sola vez:

```bash
flutter create . --platforms=android --org com.casahuespedes --project-name casa_huespedes_mobile
flutter pub get
flutter run
```

Para generar el APK:

```bash
flutter build apk --release
```

El APK quedará en `build/app/outputs/flutter-apk/app-release.apk`.
