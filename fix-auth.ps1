# Script para solucionar problemas de autenticación
Write-Host "=== SOLUCIONANDO PROBLEMAS DE AUTENTICACIÓN ===" -ForegroundColor Green

# Parar servicios
Write-Host "Parando servicios..." -ForegroundColor Yellow
docker-compose down

# Reconstruir servicio
Write-Host "Reconstruyendo servicio..." -ForegroundColor Yellow
docker-compose build service

# Iniciar servicios
Write-Host "Iniciando servicios..." -ForegroundColor Yellow
docker-compose up -d

# Esperar un momento
Start-Sleep -Seconds 5

# Verificar estado
Write-Host "Estado de los contenedores:" -ForegroundColor Green
docker-compose ps

# Verificar logs del servicio
Write-Host "Logs del servicio:" -ForegroundColor Green
docker-compose logs service --tail=10

Write-Host "=== SOLUCIÓN COMPLETADA ===" -ForegroundColor Green
Write-Host "Servicios disponibles en:" -ForegroundColor Cyan
Write-Host "  - Cliente: http://localhost:5174" -ForegroundColor White
Write-Host "  - Servicio: http://localhost:8081" -ForegroundColor White
