$ErrorActionPreference = 'Stop'
$backupDir = Join-Path $PSScriptRoot '..\backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$target = Join-Path $backupDir "gadgethub-$stamp.sql.gz"
docker compose exec -T postgres sh -c 'pg_dump -U postgres -d gadgethub --clean --if-exists | gzip' > $target
Get-ChildItem -LiteralPath $backupDir -Filter 'gadgethub-*.sql.gz' | Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Remove-Item -Force
Write-Output "Backup created: $target"
