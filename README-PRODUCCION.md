# 🚀 Configuración de Producción - Entrevistes App

## 📋 **Descripción**

Esta configuración está optimizada para producción con datos reales, eliminando hardcodes y datos ficticios. Incluye seguridad, monitoreo, backup automático y optimizaciones de rendimiento.

## 🏗️ **Arquitectura de Producción**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │     Frontend    │    │     Backend     │
│   (Load Balancer)│    │   (SvelteKit)   │    │   (Node.js)     │
│   Port: 80/443  │────│   Port: 5173    │────│   Port: 8081    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                └────────────────────────┼─────────────────┐
                                                         │                 │
                                                ┌─────────────────┐    ┌─────────────────┐
                                                │   PostgreSQL     │    │   Google APIs   │
                                                │   Port: 5432     │    │   (Sheets/Gmail)│
                                                └─────────────────┘    └─────────────────┘
```

## 🔧 **Configuración Inicial**

### **1. Preparar Variables de Entorno**

```bash
# Copiar archivo de ejemplo
cp env.prod.example .env.prod

# Editar con tus valores reales
nano .env.prod
```

### **2. Configurar Variables Críticas**

```bash
# Base de datos
DB_PASSWORD=tu_password_seguro_aqui

# Google API
GOOGLE_CLIENT_EMAIL=tu-service-account@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_AQUI\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_ID=tu-google-client-id
SHEETS_SPREADSHEET_ID=tu-spreadsheet-id

# Seguridad
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Email
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

### **3. Configurar Certificados SSL**

```bash
# Crear directorio para certificados
mkdir -p nginx/ssl

# Para desarrollo (certificados autofirmados)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=ES/ST=Catalunya/L=Barcelona/O=INS Bitacola/CN=insbitacola.cat"

# Para producción (usar Let's Encrypt o certificados reales)
# cp /path/to/your/cert.pem nginx/ssl/cert.pem
# cp /path/to/your/key.pem nginx/ssl/key.pem
```

## 🚀 **Despliegue**

### **Despliegue Automático**

```bash
# Ejecutar script de despliegue
./deploy-prod.sh
```

### **Despliegue Manual**

```bash
# 1. Construir imágenes
docker-compose -f docker-compose.prod.yml build --no-cache

# 2. Iniciar servicios
docker-compose -f docker-compose.prod.yml up -d

# 3. Verificar estado
docker-compose -f docker-compose.prod.yml ps
```

## 📊 **Monitoreo**

### **Verificar Salud de Servicios**

```bash
# Ejecutar monitoreo completo
./monitor-prod.sh

# Verificar servicios individuales
curl http://localhost:8081/health  # Backend
curl http://localhost:5174/health  # Frontend
curl http://localhost:80/health     # Nginx
```

### **Ver Logs**

```bash
# Todos los servicios
docker-compose -f docker-compose.prod.yml logs -f

# Servicio específico
docker-compose -f docker-compose.prod.yml logs -f service
docker-compose -f docker-compose.prod.yml logs -f client
docker-compose -f docker-compose.prod.yml logs -f db
```

## 💾 **Backup y Restauración**

### **Backup Automático**

```bash
# Crear backup
./backup-db.sh

# Programar backup diario (crontab)
0 2 * * * /path/to/entrevistes_app/backup-db.sh
```

### **Restauración**

```bash
# Listar backups disponibles
ls -la backups/

# Restaurar desde backup
./restore-db.sh backups/entrevistes_backup_20241201_143022.sql.gz
```

## 🔒 **Seguridad**

### **Configuraciones Implementadas**

- ✅ **Usuarios no-root** en contenedores
- ✅ **Headers de seguridad** en Nginx
- ✅ **Rate limiting** para API
- ✅ **SSL/TLS** con certificados
- ✅ **Variables de entorno** para secretos
- ✅ **Network isolation** entre servicios
- ✅ **Health checks** automáticos

### **Recomendaciones Adicionales**

1. **Firewall**: Configurar reglas de firewall
2. **SSL Real**: Usar certificados de Let's Encrypt
3. **Backup Remoto**: Configurar backup en servidor remoto
4. **Monitoreo**: Configurar alertas por email
5. **Updates**: Mantener imágenes actualizadas

## 📈 **Optimizaciones de Rendimiento**

### **Implementadas**

- ✅ **Multi-stage builds** para imágenes optimizadas
- ✅ **Gzip compression** en Nginx
- ✅ **Cache headers** para archivos estáticos
- ✅ **Connection pooling** en base de datos
- ✅ **Resource limits** en contenedores
- ✅ **Health checks** optimizados

### **Configuración de Recursos**

```yaml
# En docker-compose.prod.yml
services:
  db:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
  service:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'
```

## 🛠️ **Mantenimiento**

### **Comandos Útiles**

```bash
# Reiniciar servicios
docker-compose -f docker-compose.prod.yml restart

# Actualizar imágenes
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Limpiar sistema
docker system prune -f
docker volume prune -f

# Ver uso de recursos
docker stats
```

### **Logs y Debugging**

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Acceder a contenedor
docker-compose -f docker-compose.prod.yml exec service sh
docker-compose -f docker-compose.prod.yml exec db psql -U entrevistes -d entrevistes
```

## 🌐 **URLs de Acceso**

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8081
- **Nginx**: http://localhost:80
- **Base de Datos**: localhost:5432

## 📞 **Soporte**

### **Problemas Comunes**

1. **Error 500**: Verificar que las tablas existen en la base de datos
2. **Certificados SSL**: Verificar que los certificados son válidos
3. **Memoria**: Ajustar límites de recursos si es necesario
4. **Conectividad**: Verificar que los puertos están abiertos

### **Logs de Error**

```bash
# Ver errores específicos
docker-compose -f docker-compose.prod.yml logs service | grep ERROR
docker-compose -f docker-compose.prod.yml logs nginx | grep error
```

## 🔄 **Actualizaciones**

### **Actualizar Aplicación**

```bash
# 1. Hacer backup
./backup-db.sh

# 2. Parar servicios
docker-compose -f docker-compose.prod.yml down

# 3. Actualizar código
git pull origin main

# 4. Reconstruir y desplegar
./deploy-prod.sh
```

### **Actualizar Base de Datos**

```bash
# Ejecutar migraciones
docker-compose -f docker-compose.prod.yml exec service npm run migrate
```

---

## ✅ **Checklist de Producción**

- [ ] Variables de entorno configuradas
- [ ] Certificados SSL instalados
- [ ] Base de datos inicializada
- [ ] Servicios funcionando
- [ ] Backup configurado
- [ ] Monitoreo activo
- [ ] Seguridad implementada
- [ ] Documentación actualizada
