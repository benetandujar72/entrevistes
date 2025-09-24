# Variables de Entorno para Vercel

## Configuración en Vercel Dashboard

Ve a tu proyecto en Vercel → Settings → Environment Variables y configura:

### 🔐 Autenticación Google OAuth
```
GOOGLE_CLIENT_ID=582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret-aqui
ALLOWED_DOMAIN=insbitacola.cat
```

### 📊 Google Sheets API
```
GOOGLE_CLIENT_EMAIL=entrevistes@insbitacola.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n
SHEETS_SPREADSHEET_ID=tu-spreadsheet-id-aqui
```

### 🗄️ Base de Datos PostgreSQL
```
DATABASE_URL=postgresql://usuario:password@host:5432/entrevistes
```

### 📧 Configuración SMTP
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=entrevistes@insbitacola.cat
SMTP_PASSWORD=tu-app-password-aqui
SMTP_FROM=Entrevistes App <noreply@insbitacola.cat>
```

### 🔒 Seguridad
```
JWT_SECRET=tu-jwt-secret-seguro-aqui
SESSION_SECRET=tu-session-secret-seguro-aqui
```

### 🌍 Configuración General
```
NODE_ENV=production
DISABLE_AUTH=0
ANY_ACTUAL=2025-2026
```
