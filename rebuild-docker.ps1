# Script para limpiar y reconstruir Docker
# Ejecutar como administrador en PowerShell

Write-Host "=== LIMPIEZA Y RECONSTRUCCIÓN DE DOCKER ===" -ForegroundColor Green

# Parar todos los contenedores
Write-Host "Parando contenedores..." -ForegroundColor Yellow
docker-compose down --remove-orphans

# Limpiar contenedores, redes y volúmenes huérfanos
Write-Host "Limpiando contenedores huérfanos..." -ForegroundColor Yellow
docker container prune -f

Write-Host "Limpiando redes huérfanos..." -ForegroundColor Yellow
docker network prune -f

Write-Host "Limpiando volúmenes huérfanos..." -ForegroundColor Yellow
docker volume prune -f

# Limpiar imágenes no utilizadas
Write-Host "Limpiando imágenes no utilizadas..." -ForegroundColor Yellow
docker image prune -f

# Limpiar caché de construcción
Write-Host "Limpiando caché de construcción..." -ForegroundColor Yellow
docker builder prune -f

# Reconstruir sin caché
Write-Host "Reconstruyendo servicios..." -ForegroundColor Yellow
docker-compose build --no-cache

# Iniciar servicios
Write-Host "Iniciando servicios..." -ForegroundColor Yellow
docker-compose up -d

# Mostrar estado
Write-Host "Estado de los contenedores:" -ForegroundColor Green
docker-compose ps

Write-Host "=== RECONSTRUCCIÓN COMPLETADA ===" -ForegroundColor Green
Write-Host "Servicios disponibles en:" -ForegroundColor Cyan
Write-Host "  - Cliente: http://localhost:5174" -ForegroundColor White
Write-Host "  - Servicio: http://localhost:8081" -ForegroundColor White
Write-Host "  - Base de datos: localhost:5433" -ForegroundColor White