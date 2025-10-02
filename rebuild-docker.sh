#!/bin/bash

# Script para limpiar y reconstruir Docker
# Ejecutar con permisos de administrador

echo "=== LIMPIEZA Y RECONSTRUCCIÓN DE DOCKER ==="

# Parar todos los contenedores
echo "Parando contenedores..."
docker-compose down --remove-orphans

# Limpiar contenedores, redes y volúmenes huérfanos
echo "Limpiando contenedores huérfanos..."
docker container prune -f

echo "Limpiando redes huérfanos..."
docker network prune -f

echo "Limpiando volúmenes huérfanos..."
docker volume prune -f

# Limpiar imágenes no utilizadas
echo "Limpiando imágenes no utilizadas..."
docker image prune -f

# Limpiar caché de construcción
echo "Limpiando caché de construcción..."
docker builder prune -f

# Reconstruir sin caché
echo "Reconstruyendo servicios..."
docker-compose build --no-cache

# Iniciar servicios
echo "Iniciando servicios..."
docker-compose up -d

# Mostrar estado
echo "Estado de los contenedores:"
docker-compose ps

echo "=== RECONSTRUCCIÓN COMPLETADA ==="
echo "Servicios disponibles en:"
echo "  - Cliente: http://localhost:5174"
echo "  - Servicio: http://localhost:8081"
echo "  - Base de datos: localhost:5433"
