# Entrevistes Service

Servicio Node/Express en TypeScript para el backend de entrevistes.

## Requisitos
- Node.js 18+
- PostgreSQL (DATABASE_URL)
- Google OAuth (ID de cliente web)

## Configuración
Crea un archivo `.env` en `service/` con:

```
PORT=8080
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
ALLOWED_DOMAIN=insbitacola.cat
DATABASE_URL=postgres://user:pass@host:5432/entrevistes
ANY_ACTUAL=2025-2026
SHEETS_SPREADSHEET_ID=1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"svc@project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/svc%40project.iam.gserviceaccount.com"}
DISABLE_AUTH=0
```

## Desarrollo
```
npm install
npm run dev
```

## Producción
```
npm run build
npm start
```

Rutas principales: `/alumnes`, `/entrevistes`, `/cursos`.

Autenticación: enviar Google ID Token en `Authorization: Bearer <token>` o cabecera `x-id-token`.

Acceso a Sheets: usar cuenta de servicio; comparte el Spreadsheet con el `client_email` de la cuenta de servicio.

Modo desarrollo: puedes poner `DISABLE_AUTH=1` para saltar auth localmente.

## Despliegue (Cloud Run)
- Requisitos: habilitar Cloud Build y Cloud Run; crear SA con permisos de Cloud Run Admin y Artifact Registry Writer.
- Configura en GitHub Secrets: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SA`, `ALLOWED_DOMAIN`, `GOOGLE_CLIENT_ID`, `SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `ANY_ACTUAL`.
- Al hacer push a `main`, el workflow `.github/workflows/deploy.yml` construye y despliega.

## Despliegue (Docker)
Para construir la imagen de Docker, desde la carpeta `service/`:
```
docker build -t entrevistes-service .
```

Para correr la imagen, pasando las variables de entorno desde un archivo `.env`:
```
docker run --rm -p 8080:8080 --env-file ./.env entrevistes-service
```
