# Configuración para Acceso en Red Local

Este documento explica cómo configurar la aplicación para que sea accesible desde cualquier ordenador de la red local del centro.

## 🚀 Inicio Rápido

### Windows (PowerShell)
```powershell
.\start-network.ps1
```

### Linux/Mac (Bash)
```bash
./start-network.sh
```

## 📋 Configuración Manual

Si prefieres configurar manualmente:

1. **Detecta tu IP local:**
   ```powershell
   # Windows
   ipconfig | findstr "IPv4"
   
   # Linux/Mac
   ip route get 1.1.1.1 | awk '{print $7; exit}'
   ```

2. **Configura la variable de entorno:**
   ```powershell
   # Windows
   $env:HOST_IP = "192.168.1.100"  # Reemplaza con tu IP
   
   # Linux/Mac
   export HOST_IP="192.168.1.100"  # Reemplaza con tu IP
   ```

3. **Inicia la aplicación:**
   ```bash
   docker compose up -d
   ```

## 🌐 Acceso desde la Red

Una vez iniciada, la aplicación será accesible desde cualquier ordenador de la red local en:

- **Aplicación web:** `http://TU_IP:5174`
- **API backend:** `http://TU_IP:8081`
- **Base de datos:** `TU_IP:5433`

## 🔧 Configuración de Google OAuth

Para que Google OAuth funcione con IPs locales, necesitas configurar:

### 1. Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a "APIs y servicios" > "Credenciales"
4. Edita tu OAuth 2.0 Client ID
5. En "Orígenes autorizados de JavaScript", añade:
   ```
   http://TU_IP:5174
   http://localhost:5174
   ```
6. En "URI de redirección autorizados", añade:
   ```
   http://TU_IP:5174/auth/callback
   http://localhost:5174/auth/callback
   ```

### 2. Variables de Entorno
Crea un archivo `.env` basado en `env.example`:
```bash
cp env.example .env
```

Edita `.env` con tus valores reales.

## 🔒 Seguridad

- La aplicación está configurada para funcionar en red local
- Solo es accesible desde la misma red (no desde internet)
- Para producción, configura un dominio real y HTTPS

## 🛠️ Solución de Problemas

### La aplicación no es accesible desde otros ordenadores
1. Verifica que el firewall permita los puertos 5174 y 8081
2. Confirma que estás en la misma red local
3. Verifica que la IP sea correcta

### Google OAuth no funciona
1. Verifica que las URLs estén configuradas en Google Cloud Console
2. Asegúrate de que la IP sea exacta (sin espacios)
3. Espera unos minutos para que los cambios se propaguen

### Error de conexión a la base de datos
1. Verifica que el puerto 5433 esté abierto
2. Confirma que PostgreSQL esté funcionando
3. Revisa los logs: `docker compose logs db`

## 📱 Acceso Móvil

La aplicación también es accesible desde dispositivos móviles conectados a la misma red WiFi:

```
http://TU_IP:5174
```

## 🔄 Reiniciar la Aplicación

Para reiniciar con la nueva configuración:
```bash
docker compose down
docker compose up -d
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `docker compose logs`
2. Verifica la conectividad de red
3. Confirma que Docker esté funcionando correctamente
