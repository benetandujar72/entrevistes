# 🔐 Configuración de Credenciales para Vercel

## 📋 Funcionalidades que Requieren Credenciales

### 1. 🔑 Autenticación Google OAuth
**Para qué**: Login de usuarios con Google
**Variables necesarias**:
```
GOOGLE_CLIENT_ID=582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret-aqui
ALLOWED_DOMAIN=insbitacola.cat
```

### 2. 📊 Google Sheets API
**Para qué**: Importar datos de alumnos desde Google Sheets
**Variables necesarias**:
```
GOOGLE_CLIENT_EMAIL=entrevistes@insbitacola.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n
SHEETS_SPREADSHEET_ID=tu-spreadsheet-id-aqui
```

### 3. 🗄️ Base de Datos PostgreSQL
**Para qué**: Almacenar datos de alumnos, entrevistas, etc.
**Variables necesarias**:
```
DATABASE_URL=postgresql://usuario:password@host:5432/entrevistes
```

### 4. 📧 Envío de Emails
**Para qué**: Notificaciones a familias y tutores
**Variables necesarias**:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=entrevistes@insbitacola.cat
SMTP_PASSWORD=tu-app-password-aqui
SMTP_FROM=Entrevistes App <noreply@insbitacola.cat>
```

## 🛠️ Cómo Configurar en Vercel

### Paso 1: Acceder a Vercel Dashboard
1. Ve a [vercel.com](https://vercel.com)
2. Selecciona tu proyecto `entrevistesib`
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar Variables de Entorno
Agrega cada variable una por una:

#### 🔑 Google OAuth
- **Name**: `GOOGLE_CLIENT_ID`
- **Value**: `582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com`
- **Environment**: Production

- **Name**: `GOOGLE_CLIENT_SECRET`
- **Value**: `tu-google-client-secret-real`
- **Environment**: Production

#### 📊 Google Sheets
- **Name**: `GOOGLE_CLIENT_EMAIL`
- **Value**: `entrevistes@insbitacola.iam.gserviceaccount.com`
- **Environment**: Production

- **Name**: `GOOGLE_PRIVATE_KEY`
- **Value**: `-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_REAL\n-----END PRIVATE KEY-----\n`
- **Environment**: Production

#### 🗄️ Base de Datos
- **Name**: `DATABASE_URL`
- **Value**: `postgresql://usuario:password@host:5432/entrevistes`
- **Environment**: Production

#### 📧 SMTP
- **Name**: `SMTP_HOST`
- **Value**: `smtp.gmail.com`
- **Environment**: Production

- **Name**: `SMTP_USER`
- **Value**: `entrevistes@insbitacola.cat`
- **Environment**: Production

- **Name**: `SMTP_PASSWORD`
- **Value**: `tu-app-password-real`
- **Environment**: Production

## ✅ Verificar Configuración

### Endpoint de Verificación
Una vez configurado, puedes verificar en:
```
https://entrevistesib.vercel.app/api/health
```

Debería mostrar:
```json
{
  "status": "ok",
  "database": "connected",
  "google": "configured",
  "smtp": "configured"
}
```

## 🚨 Importante

- **Nunca** pongas credenciales reales en archivos de código
- **Siempre** usa variables de entorno en producción
- **Verifica** que las credenciales funcionen antes de desplegar
- **Rota** las credenciales regularmente por seguridad
