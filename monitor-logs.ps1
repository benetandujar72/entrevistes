# Script para monitorear logs de importación
Write-Host "🔍 Monitoreando logs de importación..." -ForegroundColor Green
Write-Host "Presiona Ctrl+C para salir" -ForegroundColor Yellow
Write-Host ""

docker-compose logs -f service