@echo off
echo 🔍 Diagnosticando problema de conexión...

echo.
echo 📊 Verificando estado de Docker...
docker --version
docker-compose --version

echo.
echo 🧹 Limpiando contenedores existentes...
docker-compose down
docker system prune -f

echo.
echo 🔧 Construyendo contenedores...
docker-compose build --no-cache

echo.
echo 🚀 Iniciando servicios...
docker-compose up -d

echo.
echo ⏳ Esperando que los servicios se inicien...
timeout /t 30 /nobreak

echo.
echo 📊 Estado de contenedores:
docker-compose ps

echo.
echo 💚 Verificando salud de servicios...
echo Backend (puerto 8081):
curl -s http://localhost:8081/health || echo "❌ Backend no responde"

echo.
echo Frontend (puerto 5174):
curl -s http://localhost:5174/health || echo "❌ Frontend no responde"

echo.
echo 📋 Logs del servicio:
docker-compose logs service --tail=10

echo.
echo 📋 Logs del cliente:
docker-compose logs client --tail=10

echo.
echo ✅ Diagnóstico completado!
echo.
echo 🌐 URLs para probar:
echo   Frontend: http://localhost:5174
echo   Backend: http://localhost:8081
echo.
pause
