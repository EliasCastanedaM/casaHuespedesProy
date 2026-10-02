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

MANIFEST="$PROJECT_ROOT/android/app/src/main/AndroidManifest.xml"
python3 - "$MANIFEST" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
permission = '    <uses-permission android:name="android.permission.INTERNET" />\n'
network = '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n'
if "android.permission.INTERNET" not in text:
    marker = text.find(">")
    text = text[:marker + 1] + "\n" + permission + network + text[marker + 1:]
path.write_text(text)
PY

cd "$PROJECT_ROOT"

mkdir -p assets
base64 -d assets/app_icon.b64 > assets/app_icon.jpg

echo "Descargando dependencias..."
flutter pub get
dart run flutter_launcher_icons

echo "Analizando el proyecto..."
flutter analyze

echo "Generando APK release..."
flutter build apk --release

echo
echo "APK generado en:"
echo "$PROJECT_ROOT/build/app/outputs/flutter-apk/app-release.apk"
