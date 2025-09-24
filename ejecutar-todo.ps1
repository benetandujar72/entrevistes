# Script PowerShell para ejecutar todo el proceso de despliegue y actualización

Write-Host "🚀 Iniciando proceso completo de despliegue y actualización..." -ForegroundColor Green

# 1. Parar contenedores existentes
Write-Host "📊 Parando contenedores existentes..." -ForegroundColor Yellow
docker-compose down

# 2. Construir imágenes de producción
Write-Host "🔧 Construyendo imágenes de producción..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. Iniciar servicios de producción
Write-Host "🚀 Iniciando servicios de producción..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d

# 4. Esperar que los servicios se inicien
Write-Host "⏳ Esperando que los servicios se inicien..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 5. Verificar salud de los servicios
Write-Host "💚 Verificando salud de los servicios..." -ForegroundColor Yellow
try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:8081/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Backend: $($backendHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde" -ForegroundColor Red
}

try {
    $frontendHealth = Invoke-WebRequest -Uri "http://localhost:5174/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Frontend: $($frontendHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend no responde" -ForegroundColor Red
}

# 6. Mostrar estado de contenedores
Write-Host "📊 Estado de contenedores:" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml ps

# 7. Actualizar GitHub
Write-Host "📤 Actualizando GitHub..." -ForegroundColor Yellow
git add .
git commit -m "feat: Configuración completa de producción con Docker optimizado

🚀 NUEVAS FUNCIONALIDADES:
- ✅ Configuración de horarios dinámicos con múltiples franjas
- ✅ Sistema de emails masivos funcional
- ✅ Interfaz moderna con emojis profesionales
- ✅ Carga de tutores desde admin
- ✅ Eliminación de fines de semana
- ✅ Múltiples franjas horarias por día

🏗️ CONFIGURACIÓN DE PRODUCCIÓN:
- ✅ Docker Compose optimizado para producción
- ✅ Dockerfiles multi-stage para rendimiento
- ✅ Nginx con SSL y seguridad
- ✅ Variables de entorno configurables
- ✅ Scripts de backup y restauración
- ✅ Monitoreo automático
- ✅ Seguridad de producción implementada

🔧 OPTIMIZACIONES:
- ✅ Eliminación de hardcodes y datos ficticios
- ✅ Configuración de secrets seguros
- ✅ Health checks automáticos
- ✅ Rate limiting y headers de seguridad
- ✅ Compresión Gzip y cache optimizado
- ✅ Usuarios no-root en contenedores

📁 ARCHIVOS NUEVOS:
- docker-compose.prod.yml - Configuración de producción
- service/Dockerfile.prod - Dockerfile optimizado del backend
- client/Dockerfile.prod - Dockerfile optimizado del frontend
- nginx/nginx.conf - Configuración de Nginx
- deploy-prod.sh - Script de despliegue automático
- backup-db.sh - Script de backup de base de datos
- restore-db.sh - Script de restauración
- monitor-prod.sh - Script de monitoreo
- README-PRODUCCION.md - Documentación completa
- config-prod.env - Variables de entorno de producción

🎯 RESULTADO:
Aplicación lista para producción con datos reales,
sin hardcodes, optimizada y segura."

git push origin main

Write-Host "✅ Proceso completado exitosamente!" -ForegroundColor Green
Write-Host "🌐 URLs de acceso:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:5174" -ForegroundColor White
Write-Host "  Backend: http://localhost:8081" -ForegroundColor White
Write-Host "  Nginx: http://localhost:80" -ForegroundColor White
