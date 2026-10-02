$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$TempRoot = Join-Path $env:TEMP "casa_huespedes_flutter_android"

if (Test-Path $TempRoot) {
    Remove-Item $TempRoot -Recurse -Force
}

Write-Host "Generando estructura Android con tu versión instalada de Flutter..."
flutter create $TempRoot --platforms=android --org com.casahuespedes --project-name casa_huespedes_mobile

$AndroidSource = Join-Path $TempRoot "android"
$AndroidTarget = Join-Path $ProjectRoot "android"

if (Test-Path $AndroidTarget) {
    Remove-Item $AndroidTarget -Recurse -Force
}

Copy-Item $AndroidSource $AndroidTarget -Recurse -Force
Remove-Item $TempRoot -Recurse -Force

$Manifest = Join-Path $AndroidTarget "app\src\main\AndroidManifest.xml"
$ManifestText = Get-Content $Manifest -Raw
if ($ManifestText -notmatch "android.permission.INTERNET") {
    $Permissions = @"
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
"@
    $ManifestText = $ManifestText -replace "(<manifest[^>]*>)", "`$1`r`n$Permissions"
    Set-Content $Manifest $ManifestText -Encoding UTF8
}

Set-Location $ProjectRoot

Write-Host "Descargando dependencias..."
flutter pub get

Write-Host "Analizando el proyecto..."
flutter analyze

Write-Host "Generando APK release..."
flutter build apk --release

$Apk = Join-Path $ProjectRoot "build\app\outputs\flutter-apk\app-release.apk"
Write-Host ""
Write-Host "APK generado:"
Write-Host $Apk
