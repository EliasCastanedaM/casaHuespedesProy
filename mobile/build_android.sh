#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
TEMP_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_ROOT"
}
trap cleanup EXIT

echo "Generando estructura Android con tu versión instalada de Flutter..."
flutter create "$TEMP_ROOT" --platforms=android --org com.casahuespedes --project-name casa_huespedes_mobile

rm -rf "$PROJECT_ROOT/android"
cp -R "$TEMP_ROOT/android" "$PROJECT_ROOT/android"

cd "$PROJECT_ROOT"

echo "Descargando dependencias..."
flutter pub get

echo "Analizando el proyecto..."
flutter analyze

echo "Generando APK release..."
flutter build apk --release

echo
echo "APK generado en:"
echo "$PROJECT_ROOT/build/app/outputs/flutter-apk/app-release.apk"
