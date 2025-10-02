# Script para ejecutar SQLs de tutores y alumnos
Write-Host "=== EJECUTANDO SQLs DE TUTORES Y ALUMNOS ===" -ForegroundColor Green

# Verificar que la base de datos esté funcionando
Write-Host "1. Verificando conexión a la base de datos..." -ForegroundColor Yellow
try {
    $dbStatus = docker-compose exec -T db pg_isready -U entrevistes
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de datos funcionando" -ForegroundColor Green
    } else {
        Write-Host "❌ Base de datos no disponible" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error verificando base de datos: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Ejecutar script de verificación
Write-Host "`n2. Ejecutando verificación de datos..." -ForegroundColor Yellow
try {
    docker-compose exec -T db psql -U entrevistes -d entrevistes -f /docker-entrypoint-initdb.d/verificar-tutores-alumnos.sql
    Write-Host "✅ Verificación completada" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en verificación: $($_.Exception.Message)" -ForegroundColor Red
}

# Ejecutar script de asignación
Write-Host "`n3. Ejecutando asignación de alumnos..." -ForegroundColor Yellow
try {
    docker-compose exec -T db psql -U entrevistes -d entrevistes -f /docker-entrypoint-initdb.d/asignar-alumnos-tutores.sql
    Write-Host "✅ Asignación completada" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en asignación: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== PROCESO COMPLETADO ===" -ForegroundColor Green
Write-Host "Los datos de tutores y alumnos han sido verificados y actualizados." -ForegroundColor Cyan
