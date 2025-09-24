#!/bin/bash

# ===========================================
# SCRIPT DE BACKUP DE BASE DE DATOS
# ===========================================

set -e

# Configuración
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="entrevistes_backup_${DATE}.sql"
RETENTION_DAYS=30

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

# Crear directorio de backup si no existe
mkdir -p "$BACKUP_DIR"

log "Iniciando backup de la base de datos..."

# Verificar que el contenedor de la base de datos está corriendo
if ! docker-compose -f docker-compose.prod.yml ps db | grep -q "Up"; then
    error "El contenedor de la base de datos no está corriendo!"
    exit 1
fi

# Realizar backup
log "Creando backup: $BACKUP_FILE"
docker-compose -f docker-compose.prod.yml exec -T db pg_dump \
    -U entrevistes \
    -d entrevistes \
    --clean \
    --if-exists \
    --create \
    --verbose > "$BACKUP_DIR/$BACKUP_FILE"

# Verificar que el backup se creó correctamente
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    success "Backup creado exitosamente: $BACKUP_FILE"
    
    # Comprimir backup
    log "Comprimiendo backup..."
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    success "Backup comprimido: $BACKUP_FILE.gz"
    
    # Mostrar tamaño del backup
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE.gz" | cut -f1)
    log "Tamaño del backup: $SIZE"
    
else
    error "El backup no se creó correctamente!"
    exit 1
fi

# Limpiar backups antiguos
log "Limpiando backups antiguos (más de $RETENTION_DAYS días)..."
find "$BACKUP_DIR" -name "entrevistes_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
success "Backups antiguos eliminados"

# Mostrar backups disponibles
log "Backups disponibles:"
ls -lh "$BACKUP_DIR"/entrevistes_backup_*.sql.gz 2>/dev/null || warning "No hay backups disponibles"

success "Backup completado exitosamente!"
