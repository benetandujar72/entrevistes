# 📅 Configuración del Calendario de Citas

## 🔧 Configuración Inicial

### 1. **Configurar Google Calendar API**

1. **Ve a Google Cloud Console**: https://console.cloud.google.com/
2. **Crea un nuevo proyecto** o selecciona uno existente
3. **Habilita la Google Calendar API**:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google Calendar API"
   - Haz clic en "Enable"

### 2. **Crear Credenciales de Servicio**

1. **Ve a "APIs & Services" > "Credentials"**
2. **Haz clic en "Create Credentials" > "Service Account"**
3. **Completa los datos**:
   - Name: `entrevistes-calendar-service`
   - Description: `Servicio para gestión de citas de entrevistas`
4. **Haz clic en "Create and Continue"**
5. **En "Grant access"**, selecciona "Editor" o "Owner"
6. **Haz clic en "Done"**

### 3. **Generar Clave JSON**

1. **En la lista de Service Accounts**, haz clic en el que acabas de crear
2. **Ve a la pestaña "Keys"**
3. **Haz clic en "Add Key" > "Create new key"**
4. **Selecciona "JSON" y haz clic en "Create"**
5. **Descarga el archivo JSON** y guárdalo como `calendar-service-account.json`

### 4. **Configurar Variables de Entorno**

Crea un archivo `.env` en la raíz del proyecto:

```env
# Google Calendar Configuration
GOOGLE_CALENDAR_SERVICE_ACCOUNT_PATH=./calendar-service-account.json
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=Europe/Madrid

# O si prefieres usar variables de entorno directas:
GOOGLE_CALENDAR_EMAIL=tu-servicio@tu-proyecto.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 5. **Compartir Calendario**

1. **Ve a Google Calendar** (https://calendar.google.com/)
2. **En el panel izquierdo**, haz clic en los tres puntos junto a tu calendario
3. **Selecciona "Settings and sharing"**
4. **En "Share with specific people"**, añade:
   - Email del service account: `tu-servicio@tu-proyecto.iam.gserviceaccount.com`
   - Permisos: "Make changes to events"
5. **Haz clic en "Send"**

## 🚀 Funcionalidades del Calendario

### **Crear Citas**
- **Desde la ficha del alumno**: `/alumnes/[id]` > pestaña "Calendari"
- **Campos requeridos**:
  - Fecha y hora
  - Duración (15, 30, 45, 60 minutos)
  - Nombre de la familia
  - Email de contacto
  - Teléfono de contacto
  - Notas adicionales

### **Estados de las Citas**
- **Pendent**: Cita creada, pendiente de confirmación
- **Confirmada**: Cita confirmada por la familia
- **Realitzada**: Cita completada
- **Cancelada**: Cita cancelada

### **Integración con Google Calendar**
- ✅ **Creación automática** de eventos en Google Calendar
- ✅ **Sincronización bidireccional** de cambios
- ✅ **Notificaciones** por email
- ✅ **Recordatorios** automáticos
- ✅ **Gestión de conflictos** de horarios

## 🔧 Configuración Avanzada

### **Personalizar Horarios de Trabajo**

En el archivo de configuración del backend, puedes definir:

```typescript
const WORKING_HOURS = {
  start: '09:00',
  end: '17:00',
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
};
```

### **Configurar Recordatorios**

```typescript
const REMINDERS = [
  { method: 'email', minutes: 24 * 60 }, // 1 día antes
  { method: 'popup', minutes: 30 }       // 30 minutos antes
];
```

### **Gestión de Conflictos**

El sistema automáticamente:
- ✅ **Detecta conflictos** de horarios
- ✅ **Sugiere horarios alternativos**
- ✅ **Envía notificaciones** de conflicto
- ✅ **Permite reprogramación** automática

## 📱 Uso del Sistema

### **Para Administradores**
1. **Accede a cualquier alumno**: `/alumnes/[id]`
2. **Ve a la pestaña "Calendari"**
3. **Haz clic en "Nova Cita"**
4. **Completa el formulario**
5. **La cita se crea automáticamente en Google Calendar**

### **Para Tutores**
1. **Ve a "Cursos"** en el menú principal
2. **Sección "Els meus alumnes"**
3. **Haz clic en un alumno**
4. **Pestaña "Calendari"**
5. **Gestiona las citas de tus alumnos**

## 🔍 Monitoreo y Reportes

### **Estadísticas Disponibles**
- 📊 **Citas por mes/semana**
- 📈 **Tasa de asistencia**
- ⏰ **Horarios más populares**
- 👥 **Tutores más activos**

### **Exportación de Datos**
- 📄 **CSV de citas** por período
- 📊 **Reportes PDF** personalizados
- 📧 **Envío automático** de reportes

## 🆘 Solución de Problemas

### **Error: "Calendar not found"**
- Verifica que el calendario esté compartido con el service account
- Comprueba los permisos del service account

### **Error: "Invalid credentials"**
- Verifica que el archivo JSON esté en la ruta correcta
- Comprueba que las credenciales sean válidas

### **Error: "Permission denied"**
- Asegúrate de que el service account tenga permisos de escritura
- Verifica que el calendario esté compartido correctamente

## 📞 Soporte

Si tienes problemas con la configuración:
1. **Revisa los logs** del servicio: `docker-compose logs service`
2. **Verifica la conectividad**: `curl http://localhost:8081/health`
3. **Comprueba la base de datos**: `docker-compose exec db psql -U entrevistes -d entrevistes -c "SELECT COUNT(*) FROM cites_calendari;"`
