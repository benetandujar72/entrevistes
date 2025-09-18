param(
    [int]$Port = 5173
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

Write-Host "==> Levantando Docker (DB y API)..."
docker compose up -d --build

# Esperar health del backend
$healthUrl = "http://localhost:8080/health"
$maxAttempts = 30
$attempt = 0
$healthy = $false
while ($attempt -lt $maxAttempts) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 3
        if ($r.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch { }
    Start-Sleep -Seconds 2
    $attempt++
}
if ($healthy) {
    Write-Host "==> Backend OK en $healthUrl"
} else {
    Write-Warning "Backend no respondió OK tras $($maxAttempts*2) segundos. Revisa logs con: docker compose logs -f service"
}

# Comprobar cliente
$clientUrl = "http://localhost:$Port"
$clientAlive = $false
try {
    $r2 = Invoke-WebRequest -UseBasicParsing -Uri $clientUrl -TimeoutSec 2
    if ($r2.StatusCode -ge 200 -and $r2.StatusCode -lt 500) { $clientAlive = $true }
} catch { }

if ($clientAlive) {
    Write-Host "==> Cliente ya está corriendo en $clientUrl"
} else {
    Write-Host "==> Iniciando cliente Svelte en nueva ventana..."
    $cmd = "Set-Location -LiteralPath '$root/client'; npm run dev -- --host --port $Port"
    Start-Process -FilePath "pwsh" -ArgumentList "-NoExit","-NoProfile","-Command",$cmd | Out-Null
    Start-Sleep -Seconds 2
}

# Abrir navegador
try {
    Start-Process $clientUrl | Out-Null
} catch { }

Write-Host "==> Todo listo. API: http://localhost:8080  |  Cliente: $clientUrl"


