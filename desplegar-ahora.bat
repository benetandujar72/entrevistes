@echo off
echo 🚀 Desplegando aplicacion en modo produccion...

echo 📊 Parando contenedores existentes...
docker-compose down

echo 🔧 Construyendo imagenes de produccion...
docker-compose -f docker-compose.prod.yml build --no-cache

echo 🚀 Iniciando servicios de produccion...
docker-compose -f docker-compose.prod.yml up -d

echo ⏳ Esperando que los servicios se inicien...
timeout /t 30 /nobreak

echo 💚 Verificando salud de los servicios...
curl -s http://localhost:8081/health
curl -s http://localhost:5174/health

echo 📊 Estado de contenedores:
docker-compose -f docker-compose.prod.yml ps

echo ✅ Despliegue completado!
pause
