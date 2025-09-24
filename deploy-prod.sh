#!/bin/bash

# ===========================================
# SCRIPT DE DESPLIEGUE PARA PRODUCCIÓN
# ===========================================

set -e

echo "🚀 Iniciando despliegue de producción..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar que existe el archivo de variables de entorno
if [ ! -f ".env.prod" ]; then
    error "Archivo .env.prod no encontrado!"
    warning "Copia env.prod.example a .env.prod y configura las variables:"
    echo "cp env.prod.example .env.prod"
    exit 1
fi

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose no está instalado!"
    exit 1
fi

# Cargar variables de entorno
log "Cargando variables de entorno..."
export $(cat .env.prod | grep -v '^#' | xargs)

# Verificar variables críticas
log "Verificando configuración..."

if [ -z "$DB_PASSWORD" ]; then
    error "DB_PASSWORD no está configurado!"
    exit 1
fi

if [ -z "$GOOGLE_CLIENT_EMAIL" ]; then
    error "GOOGLE_CLIENT_EMAIL no está configurado!"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    error "JWT_SECRET no está configurado!"
    exit 1
fi

success "Configuración verificada correctamente"

# Parar contenedores existentes
log "Parando contenedores existentes..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# Limpiar imágenes no utilizadas
log "Limpiando imágenes no utilizadas..."
docker system prune -f

# Construir imágenes de producción
log "Construyendo imágenes de producción..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Crear directorio para logs
log "Creando directorios necesarios..."
mkdir -p nginx/ssl
mkdir -p logs

# Generar certificados SSL si no existen
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    warning "Certificados SSL no encontrados. Generando certificados autofirmados..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=ES/ST=Catalunya/L=Barcelona/O=INS Bitacola/CN=insbitacola.cat"
    success "Certificados SSL generados"
fi

# Iniciar servicios
log "Iniciando servicios de producción..."
docker-compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén listos
log "Esperando a que los servicios estén listos..."
sleep 30

# Verificar salud de los servicios
log "Verificando salud de los servicios..."

# Verificar base de datos
if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U $DB_USER -d $DB_NAME; then
    success "Base de datos: ✅"
else
    error "Base de datos: ❌"
    exit 1
fi

# Verificar servicio backend
if curl -f http://localhost:$SERVICE_PORT/health > /dev/null 2>&1; then
    success "Servicio backend: ✅"
else
    error "Servicio backend: ❌"
    exit 1
fi

# Verificar cliente frontend
if curl -f http://localhost:$CLIENT_PORT/health > /dev/null 2>&1; then
    success "Cliente frontend: ✅"
else
    error "Cliente frontend: ❌"
    exit 1
fi

# Verificar nginx
if curl -f http://localhost:$NGINX_PORT/health > /dev/null 2>&1; then
    success "Nginx: ✅"
else
    error "Nginx: ❌"
    exit 1
fi

# Mostrar estado final
log "Estado de los contenedores:"
docker-compose -f docker-compose.prod.yml ps

# Mostrar URLs de acceso
echo ""
success "🎉 Despliegue completado exitosamente!"
echo ""
echo "📋 URLs de acceso:"
echo "  🌐 Frontend: http://localhost:$CLIENT_PORT"
echo "  🔧 Backend: http://localhost:$SERVICE_PORT"
echo "  🌍 Nginx: http://localhost:$NGINX_PORT"
echo ""
echo "📊 Comandos útiles:"
echo "  Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Parar servicios: docker-compose -f docker-compose.prod.yml down"
echo "  Reiniciar: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "🔒 Para producción real:"
echo "  1. Configura certificados SSL reales en nginx/ssl/"
echo "  2. Configura dominio real en nginx/nginx.conf"
echo "  3. Configura firewall y seguridad del servidor"
echo "  4. Configura backup automático de la base de datos"
