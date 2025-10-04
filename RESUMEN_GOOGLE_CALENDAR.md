# 📅 Resumen: Sistema de Google Calendar con Calendarios Individuales

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **Arquitectura de Domain-Wide Delegation**

Se ha modificado el sistema para usar **Domain-Wide Delegation**, lo que permite:

- ✅ **1 único Service Account** con credenciales centralizadas
- ✅ **Calendarios individuales** por tutor (Benet ve solo sus citas, Alba solo las suyas)
- ✅ **Sin configuración por usuario** (los tutores no hacen nada)
- ✅ **Escalable** para todos los profesores del instituto

### 2. **Archivos Modificados**

#### [service/src/calendar/google-calendar.ts](service/src/calendar/google-calendar.ts)
- ✅ Nueva función `getAuthClient(userEmail)` que crea JWT con impersonación
- ✅ Soporte para `GOOGLE_CALENDAR_DOMAIN_WIDE=true`
- ✅ Todos los métodos ahora aceptan `ownerEmail` para identificar el calendario del tutor
- ✅ Logs detallados que muestran en qué calendario se crea cada evento
- ✅ Mensajes de error con sugerencias de solución

**Métodos actualizados:**
```typescript
createEvent({ ..., ownerEmail: 'benet.andujar@insbitacola.cat' })
updateEvent(eventId, { ..., ownerEmail: 'alba.serqueda@insbitacola.cat' })
deleteEvent(eventId, 'benet.andujar@insbitacola.cat')
checkConflicts(start, end, 'alba.serqueda@insbitacola.cat')
```

#### [service/src/routes/citas.ts](service/src/routes/citas.ts)
- ✅ Todas las llamadas a Google Calendar ahora pasan `ownerEmail: validatedData.tutor_email`
- ✅ Verificación de conflictos en el calendario del tutor específico
- ✅ Eventos se crean en el calendario personal del tutor

#### [service/src/routes/calendario-publico.ts](service/src/routes/calendario-publico.ts)
- ✅ Actualizado para pasar el email del tutor en checkConflicts

#### [service/src/routes/dades-personals.ts](service/src/routes/dades-personals.ts)
- ✅ Actualizado para pasar el email del tutor en createEvent y checkConflicts

#### [service/.env.local](service/.env.local)
- ✅ Agregadas variables de configuración con documentación
- ✅ Instrucciones inline sobre cómo configurar

### 3. **Documentación Creada**

#### [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)
Guía completa paso a paso que incluye:
- ✅ Cómo crear Service Account en Google Cloud Console
- ✅ Cómo habilitar Google Calendar API
- ✅ Cómo configurar Domain-Wide Delegation en Google Workspace Admin
- ✅ Cómo extraer y configurar las credenciales
- ✅ Sección de troubleshooting con errores comunes
- ✅ Checklist de verificación
- ✅ Mejores prácticas de seguridad

---

## 🔧 VARIABLES DE ENTORNO NECESARIAS

Para habilitar Google Calendar con calendarios individuales, configura en `service/.env.local`:

```bash
# Email del Service Account
GOOGLE_CALENDAR_EMAIL=entrevistes-calendar@proyecto-id.iam.gserviceaccount.com

# Private Key completa (copia del JSON)
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Habilitar Domain-Wide Delegation (IMPORTANTE)
GOOGLE_CALENDAR_DOMAIN_WIDE=true

# Zona horaria
GOOGLE_CALENDAR_TIMEZONE=Europe/Madrid
```

---

## 🎯 CÓMO FUNCIONA

### Antes (Calendario Único)
```
❌ Todas las citas en 1 calendario compartido
❌ Todos los tutores ven todas las citas
❌ Falta de privacidad
```

### Ahora (Domain-Wide Delegation)
```
✅ Cada cita se crea en el calendario del tutor propietario
✅ Benet solo ve sus citas en su calendario
✅ Alba solo ve sus citas en su calendario
✅ Las familias reciben invitaciones
```

### Ejemplo Práctico

**Caso 1: Cita de Benet**
```typescript
// En service/src/routes/citas.ts
await googleCalendarService.createEvent({
  title: "Cita amb Familia García",
  startTime: new Date("2025-10-15T14:30"),
  endTime: new Date("2025-10-15T15:00"),
  ownerEmail: "benet.andujar@insbitacola.cat"  // ← El evento va a su calendario
});

// Resultado:
// ✅ Evento creado en calendario de benet.andujar@insbitacola.cat
// ✅ Familia García recibe invitación
// ✅ Alba NO ve esta cita en su calendario
```

**Caso 2: Cita de Alba**
```typescript
await googleCalendarService.createEvent({
  title: "Cita amb Familia López",
  startTime: new Date("2025-10-16T10:00"),
  endTime: new Date("2025-10-16T10:30"),
  ownerEmail: "alba.serqueda@insbitacola.cat"  // ← El evento va a su calendario
});

// Resultado:
// ✅ Evento creado en calendario de alba.serqueda@insbitacola.cat
// ✅ Familia López recibe invitación
// ✅ Benet NO ve esta cita en su calendario
```

---

## 📊 VERIFICACIÓN DE LOGS

### Modo Simulado (Sin Credenciales)
```
⚠️ Google Calendar no configurado. Usando modo simulado.
💡 Para habilitar Google Calendar:
   1. Configura GOOGLE_CALENDAR_EMAIL (Service Account email)
   2. Configura GOOGLE_CALENDAR_PRIVATE_KEY (Private key del Service Account)
   3. Configura GOOGLE_CALENDAR_DOMAIN_WIDE=true (para Domain-Wide Delegation)
```

### Modo Activo (Con Credenciales pero SIN Domain-Wide)
```
✅ Google Calendar configurado
📧 Service Account: entrevistes-calendar@proyecto.iam.gserviceaccount.com
🌍 Domain-Wide Delegation: Deshabilitado
⚠️ Domain-Wide Delegation no habilitado. El evento se creará en el calendario del Service Account.
💡 Para usar calendarios individuales, configura GOOGLE_CALENDAR_DOMAIN_WIDE=true
```

### Modo Completo (Con Domain-Wide Delegation)
```
✅ Google Calendar configurado
📧 Service Account: entrevistes-calendar@proyecto.iam.gserviceaccount.com
🌍 Domain-Wide Delegation: Habilitado
🔐 Autenticando como usuario: benet.andujar@insbitacola.cat (Domain-Wide Delegation)
✅ Evento creado en Google Calendar
   📧 Calendario de: benet.andujar@insbitacola.cat
   🆔 Event ID: abc123xyz...
```

---

## 🚀 PASOS PARA ACTIVAR

### Para el Administrador de Google Workspace

1. **Leer la guía completa:** [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)

2. **Crear Service Account:**
   - Google Cloud Console → Crear proyecto
   - Habilitar Google Calendar API
   - Crear Service Account
   - Descargar JSON de credenciales

3. **Configurar Domain-Wide Delegation:**
   - Admin Console → Security → API Controls
   - Domain-wide delegation → Agregar Client ID
   - Scope: `https://www.googleapis.com/auth/calendar`

4. **Configurar Variables de Entorno:**
   - Extraer `client_email` y `private_key` del JSON
   - Actualizar `service/.env.local`
   - Configurar `GOOGLE_CALENDAR_DOMAIN_WIDE=true`

5. **Reiniciar Servicio:**
   ```bash
   docker-compose restart service
   ```

6. **Verificar Logs:**
   ```bash
   docker logs entrevistes-service 2>&1 | grep "Google Calendar"
   ```

7. **Probar con Cita Real:**
   - Crear cita como Benet
   - Verificar que aparece en su Google Calendar
   - Crear cita como Alba
   - Verificar que cada uno solo ve sus citas

---

## 🔒 SEGURIDAD

### Credenciales Protegidas
- ✅ `.env.local` está en `.gitignore`
- ✅ Nunca subir archivos JSON de credenciales al repositorio
- ✅ Rotar claves cada 90 días (recomendación de Google)

### Permisos Mínimos
- ✅ Service Account **solo** tiene acceso a Google Calendar API
- ✅ Scope único: `https://www.googleapis.com/auth/calendar`
- ✅ NO tiene acceso a Gmail, Drive, u otros servicios

### Domain-Wide Delegation
- ✅ Configurado **solo** para el dominio `@insbitacola.cat`
- ✅ Solo el administrador de Google Workspace puede autorizar
- ✅ Auditable desde Admin Console

---

## 📋 CHECKLIST FINAL

Después de configurar, verifica:

- [ ] Los logs muestran `Domain-Wide Delegation: Habilitado`
- [ ] Al crear una cita, los logs muestran `Autenticando como usuario: tutor@insbitacola.cat`
- [ ] La cita aparece en el calendario **personal del tutor**
- [ ] La familia recibe una invitación por email
- [ ] Benet solo ve sus citas, Alba solo ve las suyas
- [ ] No hay eventos en el calendario del Service Account
- [ ] La detección de conflictos funciona correctamente
- [ ] Al cancelar una cita, se elimina del calendario del tutor

---

## 🎉 BENEFICIOS

### Para los Tutores
- ✅ Sus citas aparecen automáticamente en su Google Calendar personal
- ✅ Pueden ver sus citas desde cualquier dispositivo (móvil, tablet, PC)
- ✅ Reciben recordatorios de Google (1 día antes, 30 min antes)
- ✅ Pueden sincronizar con otras apps de calendario
- ✅ **No necesitan configurar nada**

### Para las Familias
- ✅ Reciben invitaciones de calendario automáticamente
- ✅ Pueden aceptar/rechazar la invitación
- ✅ Agregar al calendario con 1 clic
- ✅ Reciben recordatorios automáticos

### Para el Instituto
- ✅ Administración centralizada
- ✅ Escalable para todos los profesores
- ✅ Auditable desde Admin Console
- ✅ Sin costes adicionales (incluido en Google Workspace)
- ✅ Privacidad garantizada (cada tutor ve solo sus citas)

---

## 🆘 SOPORTE

Si tienes problemas durante la configuración:

1. **Revisa la guía completa:** [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)
2. **Verifica los logs:** `docker logs entrevistes-service`
3. **Sección de troubleshooting:** En la guía hay soluciones a errores comunes
4. **Contacta con el desarrollador** si el problema persiste

---

## 📚 DOCUMENTACIÓN RELACIONADA

- [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md) - Guía completa paso a paso
- [service/src/calendar/google-calendar.ts](service/src/calendar/google-calendar.ts) - Implementación técnica
- [Google Calendar API Docs](https://developers.google.com/calendar/api/v3/reference)
- [Domain-Wide Delegation Guide](https://developers.google.com/workspace/guides/create-credentials#service-account)

---

**Versión:** 1.0
**Fecha:** 2025-10-04
**Autor:** Sistema de Entrevistes INS Bitàcola
