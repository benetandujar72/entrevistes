# 🔧 Guía: Configurar Variables de Entorno en Vercel

## 📋 Variables Necesarias

### 1. 🔑 **Autenticación Google OAuth**
```
GOOGLE_CLIENT_ID=582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET_AQUI
ALLOWED_DOMAIN=insbitacola.cat
```

### 2. 📊 **Google Sheets API**
```
GOOGLE_CLIENT_EMAIL=entrevistes@insbitacola.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n
SHEETS_SPREADSHEET_ID=TU_SPREADSHEET_ID_AQUI
```

### 3. 🗄️ **Base de Datos PostgreSQL**
```
DATABASE_URL=postgresql://usuario:password@host:5432/entrevistes
```

### 4. 📧 **Configuración SMTP**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=entrevistes@insbitacola.cat
SMTP_PASSWORD=TU_SMTP_PASSWORD_AQUI
SMTP_FROM=Entrevistes App <noreply@insbitacola.cat>
```

### 5. 🔒 **Seguridad**
```
JWT_SECRET=TU_JWT_SECRET_SEGURO_AQUI
SESSION_SECRET=TU_SESSION_SECRET_SEGURO_AQUI
```

### 6. 🌍 **Configuración General**
```
NODE_ENV=production
DISABLE_AUTH=0
ANY_ACTUAL=2025-2026
```

## 🛠️ Cómo Configurar en Vercel

### Paso 1: Acceder a Vercel Dashboard
1. Ve a [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Inicia sesión con tu cuenta
3. Selecciona el proyecto **entrevistesib**

### Paso 2: Ir a Environment Variables
1. En el menú lateral, haz clic en **Settings**
2. Busca la sección **Environment Variables**
3. Haz clic en **Add New**

### Paso 3: Agregar Cada Variable
Para cada variable de la lista anterior:

1. **Name**: Copia el nombre de la variable
2. **Value**: Copia el valor (reemplaza `TU_..._AQUI` con valores reales)
3. **Environment**: Selecciona **Production**
4. **Save**: Haz clic en **Save**

### Paso 4: Valores que Necesitas Obtener

#### 🔑 Google OAuth
- **GOOGLE_CLIENT_SECRET**: Obténlo de [Google Cloud Console](https://console.cloud.google.com)
- Ve a APIs & Services → Credentials
- Busca tu OAuth 2.0 Client ID
- Copia el Client Secret

#### 📊 Google Sheets
- **GOOGLE_PRIVATE_KEY**: Obténlo del Service Account JSON
- **SHEETS_SPREADSHEET_ID**: ID de tu hoja de cálculo de Google Sheets

#### 🗄️ Base de Datos
- **DATABASE_URL**: URL de tu base de datos PostgreSQL
- Formato: `postgresql://usuario:password@host:5432/entrevistes`

#### 📧 SMTP
- **SMTP_PASSWORD**: Contraseña de aplicación de Gmail
- Genera una en [Google Account Security](https://myaccount.google.com/security)

#### 🔒 Seguridad
- **JWT_SECRET**: Genera una cadena aleatoria segura
- **SESSION_SECRET**: Genera otra cadena aleatoria segura

## ✅ Verificar Configuración

### 1. Health Check
Visita: `https://entrevistesib.vercel.app/api/health`

Debería mostrar:
```json
{
  "status": "ok",
  "database": "connected",
  "google": "configured",
  "smtp": "configured"
}
```

### 2. Auth Status
Visita: `https://entrevistesib.vercel.app/api/auth/status`

Debería mostrar:
```json
{
  "authDisabled": false,
  "allowedDomain": "insbitacola.cat"
}
```

## 🚨 Importante

- **Nunca** pongas credenciales reales en archivos de código
- **Siempre** usa variables de entorno en producción
- **Verifica** que las credenciales funcionen antes de desplegar
- **Rota** las credenciales regularmente por seguridad

## 📞 Soporte

Si tienes problemas:
1. Verifica que todas las variables estén configuradas
2. Revisa que los valores sean correctos
3. Haz redeploy del proyecto
4. Consulta los logs de Vercel para errores
