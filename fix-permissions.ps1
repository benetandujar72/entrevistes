#!/usr/bin/env pwsh

Write-Host "🔧 Solucionando permisos y configuración de la aplicación..."

# 1. Verificar estado de Docker
Write-Host "1. Verificando estado de Docker..."
docker-compose ps

# 2. Reiniciar todos los servicios
Write-Host "2. Reiniciando servicios..."
docker-compose restart

# 3. Esperar a que los servicios estén listos
Write-Host "3. Esperando a que los servicios estén listos..."
Start-Sleep -Seconds 10

# 4. Crear usuario administrador
Write-Host "4. Creando usuario administrador..."
docker exec -i entrevistes-db psql -U entrevistes -d entrevistes -c "INSERT INTO usuaris (email, rol, created_at) VALUES ('benet.andujar@insbitacola.cat', 'admin', NOW()) ON CONFLICT (email) DO UPDATE SET rol = 'admin';"

# 5. Verificar que el usuario se creó
Write-Host "5. Verificando usuario creado..."
docker exec -i entrevistes-db psql -U entrevistes -d entrevistes -c "SELECT email, rol FROM usuaris;"

# 6. Verificar estado de la aplicación
Write-Host "6. Verificando estado de la aplicación..."
Write-Host "Frontend: http://localhost:5174"
Write-Host "Backend: http://localhost:8081/health"

# 7. Probar conexión al backend
Write-Host "7. Probando conexión al backend..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/health" -TimeoutSec 5
    Write-Host "✅ Backend funcionando: $($response.StatusCode)"
} catch {
    Write-Host "❌ Backend no responde: $($_.Exception.Message)"
}

Write-Host "✅ Configuración completada!"
Write-Host "🌐 Accede a: http://localhost:5174"
Write-Host "👤 Usuario: benet.andujar@insbitacola.cat"
Write-Host "🔑 Rol: admin"
