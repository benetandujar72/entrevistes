# 🔧 Solución para Errores 500 en Configuración de Horarios

## 🚨 **Problema Identificado**
Los endpoints de configuración de horarios están devolviendo error 500 porque las tablas necesarias no existen en la base de datos.

## 📋 **Pasos para Solucionar**

### 1. **Verificar Estado de Contenedores**
```bash
docker-compose ps
```

### 2. **Ejecutar Script SQL para Crear Tablas**
```bash
# Ejecutar el script SQL para crear las tablas necesarias
docker exec -i entrevistes-db psql -U entrevistes -d entrevistes < crear-tabla-horarios.sql
```

### 3. **Verificar que las Tablas se Crearon**
```bash
# Verificar tabla configuracion_horarios_tutor
docker exec -it entrevistes-db psql -U entrevistes -d entrevistes -c "\d configuracion_horarios_tutor"

# Verificar tabla eventos_calendario
docker exec -it entrevistes-db psql -U entrevistes -d entrevistes -c "\d eventos_calendario"
```

### 4. **Reiniciar el Servicio Backend**
```bash
docker-compose restart service
```

### 5. **Verificar Logs del Backend**
```bash
docker-compose logs service --tail=20
```

### 6. **Probar Endpoints**
```bash
# Probar endpoint de salud
curl http://localhost:8081/health

# Probar endpoint de configuración (debería devolver array vacío, no error 500)
curl http://localhost:8081/dades-personals/configuracion-horarios/test@example.com
```

## 🔍 **Diagnóstico del Problema**

### **Causa Raíz:**
- Las tablas `configuracion_horarios_tutor` y `eventos_calendario` no existen en la base de datos
- El script de inicialización `init-dades-personals.sql` no se ejecutó correctamente
- Los endpoints intentan hacer queries a tablas inexistentes, causando error 500

### **Solución:**
1. Crear las tablas manualmente usando el script SQL proporcionado
2. Verificar que las tablas se crearon correctamente
3. Reiniciar el servicio backend
4. Probar los endpoints

## 📁 **Archivos Creados para la Solución**

### `crear-tabla-horarios.sql`
- Script SQL para crear las tablas necesarias
- Incluye índices para optimización
- Verificación de creación exitosa

### `ejecutar-sql.ps1`
- Script PowerShell para automatizar la ejecución
- Verificación de estado de contenedores
- Pruebas de endpoints

## ✅ **Verificación de Éxito**

Después de ejecutar los pasos, deberías ver:
- ✅ Tablas creadas en la base de datos
- ✅ Backend respondiendo correctamente
- ✅ Endpoints devolviendo arrays vacíos (no errores 500)
- ✅ Frontend cargando sin errores de consola

## 🚀 **Próximos Pasos**

Una vez solucionado:
1. Probar la funcionalidad de configuración de horarios
2. Crear una configuración de prueba
3. Verificar que se guarda correctamente
4. Probar la generación de eventos

## 📞 **Si Persisten los Problemas**

Si los errores 500 persisten después de estos pasos:
1. Verificar logs del backend: `docker-compose logs service`
2. Verificar logs de la base de datos: `docker-compose logs db`
3. Reiniciar todos los contenedores: `docker-compose down && docker-compose up -d`
4. Verificar que el volumen de la base de datos esté montado correctamente
