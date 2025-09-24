# Script PowerShell para solucionar el problema de conexión

Write-Host "🔍 Solucionando problema de conexión..." -ForegroundColor Yellow

# 1. Parar todos los contenedores
Write-Host "🧹 Parando contenedores existentes..." -ForegroundColor Yellow
docker-compose down
docker-compose -f docker-compose.prod.yml down

# 2. Limpiar sistema Docker
Write-Host "🧹 Limpiando sistema Docker..." -ForegroundColor Yellow
docker system prune -f

# 3. Construir contenedores desde cero
Write-Host "🔧 Construyendo contenedores..." -ForegroundColor Yellow
docker-compose build --no-cache

# 4. Iniciar servicios
Write-Host "🚀 Iniciando servicios..." -ForegroundColor Yellow
docker-compose up -d

# 5. Esperar que se inicien
Write-Host "⏳ Esperando que los servicios se inicien..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 6. Verificar estado
Write-Host "📊 Estado de contenedores:" -ForegroundColor Cyan
docker-compose ps

# 7. Verificar salud de servicios
Write-Host "💚 Verificando salud de servicios..." -ForegroundColor Yellow

# Backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:8081/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Backend (8081): $($backendResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend (8081): No responde" -ForegroundColor Red
    Write-Host "Logs del backend:" -ForegroundColor Yellow
    docker-compose logs service --tail=5
}

# Frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:5174" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Frontend (5174): $($frontendResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend (5174): No responde" -ForegroundColor Red
    Write-Host "Logs del frontend:" -ForegroundColor Yellow
    docker-compose logs client --tail=5
}

# 8. Mostrar URLs de acceso
Write-Host "🌐 URLs de acceso:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5174" -ForegroundColor White
Write-Host "  Backend: http://localhost:8081" -ForegroundColor White

# 9. Mostrar comandos útiles
Write-Host "🛠️ Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Ver logs: docker-compose logs -f" -ForegroundColor White
Write-Host "  Reiniciar: docker-compose restart" -ForegroundColor White
Write-Host "  Parar: docker-compose down" -ForegroundColor White

Write-Host "✅ Proceso completado!" -ForegroundColor Green
