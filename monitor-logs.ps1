# Script de monitoreo de logs para la aplicación de entrevistas
param(
    [string]$Service = "service",
    [int]$Lines = 20
)

Write-Host "=== MONITOR DE LOGS - ENTREVISTAS APP ===" -ForegroundColor Green
Write-Host "Servicio: $Service" -ForegroundColor Yellow
Write-Host "Líneas: $Lines" -ForegroundColor Yellow
Write-Host "Presiona Ctrl+C para salir" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] === LOGS ===" -ForegroundColor Cyan
        
        $logs = docker compose logs $Service --tail=$Lines 2>&1
        if ($LASTEXITCODE -eq 0) {
            $logs | ForEach-Object {
                if ($_ -match "ERROR|error|Error") {
                    Write-Host $_ -ForegroundColor Red
                } elseif ($_ -match "WARN|warn|Warn") {
                    Write-Host $_ -ForegroundColor Yellow
                } elseif ($_ -match "Service listening|listening") {
                    Write-Host $_ -ForegroundColor Green
                } else {
                    Write-Host $_
                }
            }
        } else {
            Write-Host "Error obteniendo logs: $logs" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Estado de contenedores:" -ForegroundColor Magenta
        docker compose ps
        
        Write-Host ""
        Write-Host "Esperando 10 segundos..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
        Clear-Host
    }
    catch {
        Write-Host "Error en monitoreo: $($_.Exception.Message)" -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}
