# Démarre le serveur API ISAC ERP et le portail web dans deux fenêtres PowerShell séparées.
# Usage (depuis la racine du projet) : .\infra\windows\start-campus-services.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$ServerEnvPath = Join-Path $env:APPDATA "ISAC ERP\server.env"

function Import-ServerEnv {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

Import-ServerEnv -Path $ServerEnvPath

if (-not $env:PORT) { $env:PORT = "4310" }
if (-not $env:PORTAL_PORT) { $env:PORTAL_PORT = "3000" }

$ApiEntry = Join-Path $ProjectRoot "packages\api\dist\index.js"
$PortalDir = Join-Path $ProjectRoot "apps\web-portail"
$NextBin = Join-Path $PortalDir "node_modules\next\dist\bin\next"

if (-not (Test-Path $ApiEntry)) {
    Write-Error "Serveur API introuvable. Exécutez d'abord : pnpm --filter @isac-erp/api build"
}

if (-not (Test-Path $NextBin)) {
    Write-Error "Portail web introuvable. Exécutez d'abord : pnpm --filter @isac-erp/web-portail build"
}

Write-Host "Démarrage du serveur API (port $($env:PORT))..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ProjectRoot'; `$env:PORT='$($env:PORT)'; node '$ApiEntry'"
)

Write-Host "Démarrage du portail web (port $($env:PORTAL_PORT))..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$PortalDir'; `$env:PORT='$($env:PORTAL_PORT)'; node '$NextBin' start -p $($env:PORTAL_PORT) -H 0.0.0.0"
)

Write-Host ""
Write-Host "Services lancés."
Write-Host "  API     : http://localhost:$($env:PORT)"
Write-Host "  Portail : http://localhost:$($env:PORTAL_PORT)"
