$ErrorActionPreference = 'Stop'
if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  throw 'Flutter SDK is not installed or is not available on PATH.'
}
flutter create --platforms=android,ios --org zw.co.gadgethub --project-name gadgethub_customer .
flutter pub get
flutter analyze
flutter test
