# Script para probar los endpoints de tutores y alumnos
Write-Host "=== PROBANDO ENDPOINTS DE TUTORES Y ALUMNOS ===" -ForegroundColor Green

# Verificar que el servicio esté funcionando
Write-Host "1. Verificando salud del servicio..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8081/health" -Method GET
    Write-Host "✅ Servicio funcionando: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error conectando al servicio: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verificar estado de autenticación
Write-Host "`n2. Verificando estado de autenticación..." -ForegroundColor Yellow
try {
    $authStatus = Invoke-RestMethod -Uri "http://localhost:8081/api/auth/status" -Method GET
    Write-Host "✅ Estado de autenticación: $($authStatus.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error verificando autenticación: $($_.Exception.Message)" -ForegroundColor Red
}

# Probar endpoint de tutores-alumnos (requiere autenticación)
Write-Host "`n3. Probando endpoint de tutores-alumnos..." -ForegroundColor Yellow
Write-Host "   (Este endpoint requiere autenticación Google)" -ForegroundColor Gray

try {
    $tutores = Invoke-RestMethod -Uri "http://localhost:8081/tutores-alumnos/todos" -Method GET
    Write-Host "✅ Endpoint funcionando: $($tutores.total_tutores) tutores encontrados" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en endpoint (esperado sin autenticación): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== PRUEBAS COMPLETADAS ===" -ForegroundColor Green
Write-Host "Para probar con autenticación, usa el cliente web en:" -ForegroundColor Cyan
Write-Host "  http://localhost:5174" -ForegroundColor White
