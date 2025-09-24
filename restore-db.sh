#!/bin/bash

# ===========================================
# SCRIPT DE RESTAURACIÓN DE BASE DE DATOS
# ===========================================

set -e

# Configuración
BACKUP_DIR="./backups"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verificar que se proporcionó un archivo de backup
if [ $# -eq 0 ]; then
    error "Uso: $0 <archivo_backup>"
    echo ""
    echo "Archivos de backup disponibles:"
    ls -la "$BACKUP_DIR"/entrevistes_backup_*.sql.gz 2>/dev/null || echo "No hay backups disponibles"
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    error "El archivo de backup no existe: $BACKUP_FILE"
    exit 1
fi

# Verificar que el archivo no está vacío
if [ ! -s "$BACKUP_FILE" ]; then
    error "El archivo de backup está vacío: $BACKUP_FILE"
    exit 1
fi

log "Iniciando restauración desde: $BACKUP_FILE"

# Verificar que el contenedor de la base de datos está corriendo
if ! docker-compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    error "El contenedor de la base de datos no está corriendo!"
    log "Iniciando contenedor de base de datos..."
    docker-compose -f docker-compose.prod.yml up -d db
    sleep 10
fi

# Confirmar restauración
warning "⚠️  ADVERTENCIA: Esta operación eliminará todos los datos existentes!"
echo -n "¿Estás seguro de que quieres continuar? (sí/no): "
read -r CONFIRM

if [ "$CONFIRM" != "sí" ] && [ "$CONFIRM" != "si" ] && [ "$CONFIRM" != "yes" ] && [ "$CONFIRM" != "y" ]; then
    log "Operación cancelada por el usuario"
    exit 0
fi

# Parar servicios que usan la base de datos
log "Parando servicios que usan la base de datos..."
docker-compose -f docker-compose.prod.yml stop service client nginx

# Realizar restauración
log "Restaurando base de datos..."

# Si el archivo está comprimido, descomprimirlo temporalmente
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log "Descomprimiendo backup..."
    TEMP_FILE="/tmp/restore_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    BACKUP_FILE="$TEMP_FILE"
fi

# Restaurar la base de datos
docker-compose -f docker-compose.prod.yml exec -T db psql \
    -U entrevistes \
    -d postgres \
    -f /dev/stdin < "$BACKUP_FILE"

# Limpiar archivo temporal si se creó
if [ -f "/tmp/restore_"*.sql ]; then
    rm -f /tmp/restore_*.sql
fi

success "Base de datos restaurada exitosamente"

# Reiniciar servicios
log "Reiniciando servicios..."
docker-compose -f docker-compose.prod.yml up -d

# Verificar que los servicios están funcionando
log "Verificando servicios..."
sleep 10

if curl -f http://localhost:8081/health > /dev/null 2>&1; then
    success "Servicio backend: ✅"
else
    error "Servicio backend: ❌"
fi

if curl -f http://localhost:5174/health > /dev/null 2>&1; then
    success "Cliente frontend: ✅"
else
    error "Cliente frontend: ❌"
fi

success "Restauración completada exitosamente!"
