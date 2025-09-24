@echo off
echo 🔧 Solucionando errores 500 en configuracion de horarios...
echo.

echo 📊 Verificando estado de contenedores...
docker-compose ps
echo.

echo 🗄️ Ejecutando script SQL para crear tablas...
docker exec -i entrevistes-db psql -U entrevistes -d entrevistes < crear-tabla-horarios.sql
echo.

echo ✅ Verificando que las tablas se crearon...
docker exec -it entrevistes-db psql -U entrevistes -d entrevistes -c "\d configuracion_horarios_tutor"
echo.

echo 🔄 Reiniciando servicio backend...
docker-compose restart service
echo.

echo ⏳ Esperando que el servicio se inicie...
timeout /t 10 /nobreak
echo.

echo 💚 Verificando salud del backend...
curl -s http://localhost:8081/health
echo.

echo 🧪 Probando endpoint de configuracion...
curl -s http://localhost:8081/dades-personals/configuracion-horarios/test@example.com
echo.

echo ✅ Proceso completado!
pause
