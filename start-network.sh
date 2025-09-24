#!/bin/bash

# Script para iniciar la aplicación en modo red local
# Detecta automáticamente la IP local y configura el entorno

echo "=== Iniciando Aplicación de Entrevistas en Red Local ==="

# Detectar IP local automáticamente
echo "Detectando IP local..."
localIP=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)

if [ -z "$localIP" ]; then
    echo "Error: No se pudo detectar la IP local"
    exit 1
fi

echo "IP local detectada: $localIP"

# Configurar variable de entorno
export HOST_IP=$localIP

echo "Configurando variable HOST_IP=$localIP"

# Mostrar información de acceso
echo ""
echo "=== INFORMACIÓN DE ACCESO ==="
echo "Aplicación web: http://$localIP:5174"
echo "API backend: http://$localIP:8081"
echo "Base de datos: $localIP:5432"
echo ""
echo "Desde cualquier ordenador de la red local, accede a:"
echo "http://$localIP:5174"
echo ""

# Iniciar Docker Compose
echo "Iniciando Docker Compose..."
docker compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "=== APLICACIÓN INICIADA CORRECTAMENTE ==="
    echo "La aplicación está disponible en: http://$localIP:5174"
    echo ""
    echo "Para detener la aplicación, ejecuta: docker compose down"
else
    echo "Error iniciando la aplicación"
    exit 1
fi
