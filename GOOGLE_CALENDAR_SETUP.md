# 📅 Configuración de Google Calendar con Domain-Wide Delegation

Esta guía explica cómo configurar la integración de Google Calendar para que **cada tutor vea solo sus citas en su calendario personal**.

## 🎯 ¿Qué conseguimos?

✅ **Calendarios individuales:** Benet solo ve sus citas, Alba solo ve las suyas
✅ **Sin configuración por usuario:** Los tutores no necesitan hacer nada
✅ **Administración centralizada:** Solo el admin de Google Workspace configura
✅ **Escalable:** Funciona para todos los profesores del instituto

---

## 📋 Requisitos Previos

- ✅ Acceso de **administrador de Google Workspace** para `@insbitacola.cat`
- ✅ Acceso a [Google Cloud Console](https://console.cloud.google.com)
- ✅ Dominio verificado en Google Workspace

---

## 🚀 PASO 1: Crear Service Account en Google Cloud

### 1.1 Crear o Seleccionar Proyecto

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente:
   - Nombre sugerido: `Entrevistes INS Bitacola`
   - ID del proyecto: `entrevistes-ins-bitacola`

### 1.2 Habilitar Google Calendar API

1. En el menú lateral → **APIs & Services** → **Library**
2. Busca: `Google Calendar API`
3. Clic en **Enable** (Habilitar)

### 1.3 Crear Service Account

1. En el menú lateral → **APIs & Services** → **Credentials**
2. Clic en **+ CREATE CREDENTIALS** → **Service Account**
3. Configuración:
   - **Service account name:** `Entrevistes Calendar Service`
   - **Service account ID:** `entrevistes-calendar` (se genera automáticamente)
   - **Description:** `Service account para gestión de citas en calendarios de tutores`
4. Clic en **CREATE AND CONTINUE**
5. En **Grant this service account access to project** → Skip (siguiente)
6. En **Grant users access to this service account** → Skip (siguiente)
7. Clic en **DONE**

### 1.4 Crear Credenciales (Private Key)

1. En la lista de Service Accounts, clic en el que acabas de crear
2. Ve a la pestaña **KEYS**
3. Clic en **ADD KEY** → **Create new key**
4. Selecciona **JSON**
5. Clic en **CREATE**
6. Se descargará un archivo JSON automáticamente
7. **⚠️ IMPORTANTE:** Guarda este archivo en un lugar seguro

---

## 🔐 PASO 2: Configurar Domain-Wide Delegation

### 2.1 Obtener Client ID

1. Abre el archivo JSON descargado
2. Busca el campo `client_id` (es un número largo)
3. Cópialo, lo necesitarás en el siguiente paso

### 2.2 Configurar en Google Workspace Admin Console

1. Ve a [Google Admin Console](https://admin.google.com)
2. Inicia sesión como **administrador** de `@insbitacola.cat`
3. En el menú lateral → **Security** → **Access and data control** → **API Controls**
4. En la sección **Domain-wide delegation** → clic en **MANAGE DOMAIN-WIDE DELEGATION**
5. Clic en **Add new**
6. Configuración:
   - **Client ID:** Pega el `client_id` copiado anteriormente
   - **OAuth scopes:** `https://www.googleapis.com/auth/calendar`
   - **Description:** `Gestión de citas en calendarios de tutores`
7. Clic en **AUTHORIZE**

### 2.3 Verificar Configuración

En la lista de clientes autorizados deberías ver:
- ✅ Tu Client ID
- ✅ Scope: `https://www.googleapis.com/auth/calendar`
- ✅ Estado: Autorizado

---

## ⚙️ PASO 3: Configurar Variables de Entorno

### 3.1 Extraer Credenciales del JSON

Abre el archivo JSON descargado y busca:

```json
{
  "type": "service_account",
  "project_id": "entrevistes-ins-bitacola",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nXXXXXXXXXXXX...",
  "client_email": "entrevistes-calendar@entrevistes-ins-bitacola.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  ...
}
```

### 3.2 Actualizar `service/.env.local`

Abre el archivo `service/.env.local` y agrega/actualiza estas variables:

```bash
# Google Calendar Configuration
GOOGLE_CALENDAR_EMAIL=entrevistes-calendar@entrevistes-ins-bitacola.iam.gserviceaccount.com
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_DOMAIN_WIDE=true
GOOGLE_CALENDAR_TIMEZONE=Europe/Madrid
```

**⚠️ IMPORTANTE:**
- Copia el `private_key` **completo** incluyendo `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Mantén los `\n` (saltos de línea) dentro de la clave
- Usa comillas dobles `"` alrededor de la clave privada
- **NO compartas este archivo** en repositorios públicos

### 3.3 Actualizar Docker Compose

Si ejecutas la aplicación con Docker, actualiza `docker-compose.yml`:

```yaml
service:
  environment:
    # ... otras variables ...
    GOOGLE_CALENDAR_EMAIL: ${GOOGLE_CALENDAR_EMAIL}
    GOOGLE_CALENDAR_PRIVATE_KEY: ${GOOGLE_CALENDAR_PRIVATE_KEY}
    GOOGLE_CALENDAR_DOMAIN_WIDE: ${GOOGLE_CALENDAR_DOMAIN_WIDE:-true}
    GOOGLE_CALENDAR_TIMEZONE: Europe/Madrid
```

Y crea un archivo `.env` en la raíz del proyecto con las mismas variables.

---

## 🧪 PASO 4: Probar la Configuración

### 4.1 Reiniciar el Servicio

```bash
# Si usas Docker
docker-compose restart service

# O si ejecutas directamente
cd service
npm run dev
```

### 4.2 Verificar Logs

Al iniciar, deberías ver en los logs:

```
✅ Google Calendar configurado
📧 Service Account: entrevistes-calendar@entrevistes-ins-bitacola.iam.gserviceaccount.com
🌍 Domain-Wide Delegation: Habilitado
```

### 4.3 Crear una Cita de Prueba

1. Inicia sesión en la aplicación como tutor (ej: `benet.andujar@insbitacola.cat`)
2. Crea una nueva cita para un alumno
3. Verifica los logs:

```
🔐 Autenticando como usuario: benet.andujar@insbitacola.cat (Domain-Wide Delegation)
✅ Evento creado en Google Calendar
   📧 Calendario de: benet.andujar@insbitacola.cat
   🆔 Event ID: abc123xyz...
```

4. **Abre Google Calendar** de `benet.andujar@insbitacola.cat`
5. ✅ Deberías ver la cita en su calendario personal

### 4.4 Verificar Calendarios Individuales

1. Crea una cita para `benet.andujar@insbitacola.cat`
2. Crea otra cita para `alba.serqueda@insbitacola.cat`
3. Verifica:
   - ✅ Benet **solo** ve su cita en su calendario
   - ✅ Alba **solo** ve su cita en su calendario
   - ✅ Las familias reciben invitaciones de calendario

---

## 🔧 Solución de Problemas

### Error: "Request had insufficient authentication scopes"

**Causa:** El Service Account no tiene los scopes correctos en Admin Console

**Solución:**
1. Ve a [Admin Console](https://admin.google.com) → Security → API Controls → Domain-wide delegation
2. Verifica que el scope sea exactamente: `https://www.googleapis.com/auth/calendar`
3. Si está incorrecto, elimina y vuelve a agregar el Client ID con el scope correcto

### Error: "Not Authorized to access this resource/api"

**Causa:** Domain-Wide Delegation no está habilitado correctamente

**Solución:**
1. Verifica que `GOOGLE_CALENDAR_DOMAIN_WIDE=true` en `.env.local`
2. Verifica que el Client ID esté autorizado en Admin Console
3. Espera 5-10 minutos (los cambios pueden tardar en propagarse)

### Error: "Invalid private key"

**Causa:** La clave privada no está formateada correctamente

**Solución:**
1. Verifica que hayas copiado la clave **completa** desde el JSON
2. Asegúrate de mantener los `\n` (saltos de línea)
3. Usa comillas dobles `"` alrededor de la clave
4. Ejemplo correcto:
   ```bash
   GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
   ```

### La cita se crea pero no aparece en el calendario del tutor

**Causa:** Posiblemente el evento se está creando en el calendario del Service Account

**Solución:**
1. Verifica los logs: debe aparecer `🌍 Domain-Wide Delegation: Habilitado`
2. Verifica que `ownerEmail` se esté pasando correctamente en las llamadas
3. Revisa que el tutor tenga permisos de calendario en Google Workspace

---

## 📊 Verificación de Funcionamiento

Después de la configuración, verifica:

- [x] Los logs muestran `Domain-Wide Delegation: Habilitado`
- [x] Al crear una cita, los logs muestran `Autenticando como usuario: tutor@insbitacola.cat`
- [x] La cita aparece en el calendario **personal del tutor**
- [x] La familia recibe una invitación por email
- [x] Benet solo ve sus citas, Alba solo ve las suyas
- [x] No hay eventos en el calendario del Service Account

---

## 🔒 Seguridad

### Proteger las Credenciales

1. **NUNCA** subas el archivo JSON al repositorio
2. Agrega a `.gitignore`:
   ```
   service/.env.local
   service/*.json
   *.pem
   ```
3. Usa variables de entorno en producción
4. Rota las claves cada 90 días (recomendación de Google)

### Permisos Mínimos

El Service Account **solo** tiene acceso a:
- ✅ Google Calendar API
- ✅ Scope: `https://www.googleapis.com/auth/calendar`
- ❌ NO tiene acceso a Gmail, Drive, u otros servicios

---

## 📚 Referencias

- [Google Calendar API - Service Accounts](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Domain-Wide Delegation Guide](https://developers.google.com/workspace/guides/create-credentials#service-account)
- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)

---

## ✅ Resumen

Una vez configurado Domain-Wide Delegation:

1. **1 único Service Account** con credenciales centralizadas
2. **Cada tutor** ve solo sus citas en su calendario personal
3. **Sin configuración** por parte de los tutores
4. **Escalable** para todos los profesores del instituto
5. **Seguro** con permisos mínimos necesarios

¡Ya está listo para producción! 🎉
