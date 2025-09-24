#!/bin/bash

# ===========================================
# SCRIPT DE MONITOREO PARA PRODUCCIÓN
# ===========================================

# Configuración
LOG_FILE="./logs/monitor.log"
ALERT_EMAIL="admin@insbitacola.cat"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Crear directorio de logs si no existe
mkdir -p logs

# Función para verificar salud de un servicio
check_service() {
    local service_name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        success "$service_name: ✅"
        return 0
    else
        error "$service_name: ❌"
        return 1
    fi
}

# Función para verificar uso de recursos
check_resources() {
    log "Verificando uso de recursos..."
    
    # CPU
    CPU_USAGE=$(docker stats --no-stream --format "table {{.CPUPerc}}" | tail -n +2 | head -1 | sed 's/%//')
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        warning "CPU usage alto: ${CPU_USAGE}%"
    else
        success "CPU usage: ${CPU_USAGE}%"
    fi
    
    # Memoria
    MEM_USAGE=$(docker stats --no-stream --format "table {{.MemUsage}}" | tail -n +2 | head -1)
    success "Memoria: $MEM_USAGE"
    
    # Espacio en disco
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 80 ]; then
        warning "Espacio en disco bajo: ${DISK_USAGE}%"
    else
        success "Espacio en disco: ${DISK_USAGE}%"
    fi
}

# Función para verificar logs de errores
check_error_logs() {
    log "Verificando logs de errores..."
    
    # Verificar errores en los últimos 5 minutos
    ERROR_COUNT=$(docker-compose -f docker-compose.prod.yml logs --since=5m 2>&1 | grep -i error | wc -l)
    
    if [ "$ERROR_COUNT" -gt 0 ]; then
        warning "Se encontraron $ERROR_COUNT errores en los últimos 5 minutos"
        docker-compose -f docker-compose.prod.yml logs --since=5m 2>&1 | grep -i error | tail -5
    else
        success "No se encontraron errores recientes"
    fi
}

# Función para verificar conectividad de base de datos
check_database() {
    log "Verificando base de datos..."
    
    if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U entrevistes -d entrevistes > /dev/null 2>&1; then
        success "Base de datos: ✅"
        
        # Verificar conexiones activas
        CONNECTIONS=$(docker-compose -f docker-compose.prod.yml exec -T db psql -U entrevistes -d entrevistes -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
        success "Conexiones activas: $CONNECTIONS"
        
        # Verificar tamaño de la base de datos
        DB_SIZE=$(docker-compose -f docker-compose.prod.yml exec -T db psql -U entrevistes -d entrevistes -t -c "SELECT pg_size_pretty(pg_database_size('entrevistes'));" 2>/dev/null | tr -d ' ')
        success "Tamaño de la base de datos: $DB_SIZE"
        
    else
        error "Base de datos: ❌"
        return 1
    fi
}

# Función para enviar alerta por email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log "Alerta enviada por email: $subject"
    else
        warning "Comando 'mail' no disponible. Alerta no enviada: $subject"
    fi
}

# Función principal de monitoreo
main() {
    log "Iniciando monitoreo de producción..."
    
    local errors=0
    
    # Verificar servicios
    log "Verificando servicios..."
    
    if ! check_service "Backend" "http://localhost:8081/health"; then
        ((errors++))
        send_alert "ALERTA: Backend no responde" "El servicio backend no está respondiendo correctamente."
    fi
    
    if ! check_service "Frontend" "http://localhost:5174/health"; then
        ((errors++))
        send_alert "ALERTA: Frontend no responde" "El servicio frontend no está respondiendo correctamente."
    fi
    
    if ! check_service "Nginx" "http://localhost:80/health"; then
        ((errors++))
        send_alert "ALERTA: Nginx no responde" "El servicio nginx no está respondiendo correctamente."
    fi
    
    # Verificar base de datos
    if ! check_database; then
        ((errors++))
        send_alert "ALERTA: Base de datos no responde" "La base de datos no está respondiendo correctamente."
    fi
    
    # Verificar recursos
    check_resources
    
    # Verificar logs de errores
    check_error_logs
    
    # Mostrar estado de contenedores
    log "Estado de contenedores:"
    docker-compose -f docker-compose.prod.yml ps
    
    # Resumen
    if [ $errors -eq 0 ]; then
        success "Monitoreo completado: Todos los servicios funcionan correctamente"
    else
        error "Monitoreo completado: Se encontraron $errors problemas"
    fi
    
    log "Monitoreo finalizado"
}

# Ejecutar monitoreo
main "$@"
