# Script para iniciar la aplicación en modo red local
# Detecta automáticamente la IP local y configura el entorno

Write-Host "=== Iniciando Aplicación de Entrevistas en Red Local ===" -ForegroundColor Green

# Detectar IP local automáticamente
Write-Host "Detectant IP local..." -ForegroundColor Yellow
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if (-not $localIP) {
    Write-Host "Error: No s'ha pogut detectar la IP local" -ForegroundColor Red
    exit 1
}

Write-Host "IP local detectada: $localIP" -ForegroundColor Green

# Configurar variable de entorno
$env:HOST_IP = $localIP

Write-Host "Configurant variable HOST_IP=$localIP" -ForegroundColor Yellow

# Mostrar información de acceso
Write-Host ""
Write-Host "=== INFORMACIÓ D'ACCÉS ===" -ForegroundColor Cyan
Write-Host "Aplicació web: http://$($localIP):5174" -ForegroundColor White
Write-Host "API backend: http://$($localIP):8081" -ForegroundColor White
Write-Host "Base de dades: $($localIP):5433" -ForegroundColor White
Write-Host ""
Write-Host "Des de qualsevol ordinador de la xarxa local, accedeix a:" -ForegroundColor Yellow
Write-Host "http://$($localIP):5174" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""

# Iniciar Docker Compose
Write-Host "Iniciant Docker Compose..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== APLICACIÓ INICIADA CORRECTAMENT ===" -ForegroundColor Green
    Write-Host "La aplicació està disponible a: http://$($localIP):5174" -ForegroundColor White
    Write-Host ""
    Write-Host "Per aturar l'aplicació, executa: docker compose down" -ForegroundColor Yellow
} else {
    Write-Host "Error iniciant l'aplicació" -ForegroundColor Red
    exit 1
}
