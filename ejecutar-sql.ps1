# Script PowerShell para ejecutar SQL en la base de datos
Write-Host "🔧 Ejecutando script SQL para crear tablas de horarios..." -ForegroundColor Yellow

# Ejecutar el script SQL
docker exec -i entrevistes-db psql -U entrevistes -d entrevistes < crear-tabla-horarios.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Script SQL ejecutado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error ejecutando script SQL" -ForegroundColor Red
}

# Verificar estado de los contenedores
Write-Host "`n📊 Estado de los contenedores:" -ForegroundColor Cyan
docker-compose ps

# Verificar salud del backend
Write-Host "`n💚 Verificando salud del backend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/health" -UseBasicParsing
    Write-Host "✅ Backend respondiendo correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde: $($_.Exception.Message)" -ForegroundColor Red
}

# Probar endpoint de configuración de horarios
Write-Host "`n🧪 Probando endpoint de configuración de horarios..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/dades-personals/configuracion-horarios/test@example.com" -UseBasicParsing
    Write-Host "✅ Endpoint de configuración funcionando" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en endpoint de configuración: $($_.Exception.Message)" -ForegroundColor Red
}
