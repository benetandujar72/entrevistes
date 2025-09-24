# Script de diagnóstico completo para la aplicación de entrevistas
param(
    [switch]$Verbose
)

Write-Host "=== DIAGNÓSTICO COMPLETO - ENTREVISTAS APP ===" -ForegroundColor Green
Write-Host ""

# 1. Estado de contenedores
Write-Host "1. ESTADO DE CONTENEDORES:" -ForegroundColor Yellow
docker compose ps
Write-Host ""

# 2. Salud de servicios
Write-Host "2. SALUD DE SERVICIOS:" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080/health" -TimeoutSec 5
    Write-Host "✅ Backend (8080): $($health.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend (8080): Error - $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $client = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:5174" -TimeoutSec 5
    Write-Host "✅ Frontend (5174): $($client.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend (5174): Error - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Conectividad a base de datos
Write-Host "3. CONECTIVIDAD A BASE DE DATOS:" -ForegroundColor Yellow
try {
    $dbTest = docker compose exec -T db psql -U entrevistes -d entrevistes -c "SELECT 1 as test;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Base de datos: Conectada" -ForegroundColor Green
    } else {
        Write-Host "❌ Base de datos: Error de conexión" -ForegroundColor Red
        Write-Host $dbTest -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Base de datos: Error - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 4. Logs recientes del servicio
Write-Host "4. LOGS RECIENTES DEL SERVICIO:" -ForegroundColor Yellow
$logs = docker compose logs service --tail=10 2>&1
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
    Write-Host "❌ No se pudieron obtener logs" -ForegroundColor Red
}
Write-Host ""

# 5. Verificación de tablas críticas
Write-Host "5. VERIFICACIÓN DE TABLAS CRÍTICAS:" -ForegroundColor Yellow
$tables = @("usuaris", "alumnes", "tutories_alumne", "cursos")
foreach ($table in $tables) {
    try {
        $count = docker compose exec -T db psql -U entrevistes -d entrevistes -c "SELECT COUNT(*) FROM $table;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $countValue = ($count | Select-String "\d+").Matches[0].Value
            Write-Host "✅ $table`: $countValue registros" -ForegroundColor Green
        } else {
            Write-Host "❌ $table`: Error" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $table`: Error - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# 6. Verificación de tutores
Write-Host "6. TUTORES EN BASE DE DATOS:" -ForegroundColor Yellow
try {
    $tutors = docker compose exec -T db psql -U entrevistes -d entrevistes -c "SELECT email FROM usuaris WHERE rol = 'docent' ORDER BY email;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $tutors | Where-Object { $_ -match "@" } | ForEach-Object {
            Write-Host "  - $_" -ForegroundColor Cyan
        }
    } else {
        Write-Host "❌ Error obteniendo tutores" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 7. Verificación de estructura de tutories_alumne
Write-Host "7. ESTRUCTURA DE TABLA TUTORIES_ALUMNE:" -ForegroundColor Yellow
try {
    $structure = docker compose exec -T db psql -U entrevistes -d entrevistes -c "\d tutories_alumne" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host $structure
    } else {
        Write-Host "❌ Error obteniendo estructura" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== FIN DEL DIAGNÓSTICO ===" -ForegroundColor Green
Write-Host "Para monitoreo continuo, ejecuta: .\monitor-logs.ps1" -ForegroundColor Yellow
