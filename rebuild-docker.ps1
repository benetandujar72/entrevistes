#!/usr/bin/env pwsh

Write-Host "🔄 Reconstruyendo Docker para Entrevistes App..."

# Detener y limpiar contenedores existentes
Write-Host "1. Deteniendo contenedores..."
docker-compose down --remove-orphans 2>&1

# Limpiar imágenes no utilizadas
Write-Host "2. Limpiando sistema Docker..."
docker system prune -f 2>&1

# Reconstruir desde cero
Write-Host "3. Reconstruyendo imagen del backend..."
docker-compose build --no-cache service 2>&1

Write-Host "4. Reconstruyendo imagen del frontend..."
docker-compose build --no-cache client 2>&1

Write-Host "5. Iniciando servicios..."
docker-compose up -d 2>&1

# Verificar estado
Write-Host "6. Verificando estado de los contenedores..."
Start-Sleep -Seconds 10
docker-compose ps 2>&1

Write-Host "7. Verificando logs del backend..."
docker-compose logs --tail=20 service 2>&1

Write-Host "8. Verificando logs del frontend..."
docker-compose logs --tail=20 client 2>&1

Write-Host "✅ Reconstrucción completada!"
Write-Host "🌐 Frontend: http://localhost:5174"
Write-Host "🔧 Backend: http://localhost:8081/health"
