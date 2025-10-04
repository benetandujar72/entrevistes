import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';

interface GoogleCalendarConfig {
  clientEmail: string;
  privateKey: string;
  timezone: string;
  domainWideDelegation: boolean;
}

class GoogleCalendarService {
  private config: GoogleCalendarConfig | null = null;

  constructor() {
    this.config = {
      clientEmail: process.env.GOOGLE_CALENDAR_EMAIL || '',
      privateKey: (process.env.GOOGLE_CALENDAR_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      timezone: process.env.GOOGLE_CALENDAR_TIMEZONE || 'Europe/Madrid',
      domainWideDelegation: process.env.GOOGLE_CALENDAR_DOMAIN_WIDE === 'true'
    };

    if (!this.config.clientEmail || !this.config.privateKey) {
      console.warn('⚠️ Google Calendar no configurado. Usando modo simulado.');
      console.warn('💡 Para habilitar Google Calendar:');
      console.warn('   1. Configura GOOGLE_CALENDAR_EMAIL (Service Account email)');
      console.warn('   2. Configura GOOGLE_CALENDAR_PRIVATE_KEY (Private key del Service Account)');
      console.warn('   3. Configura GOOGLE_CALENDAR_DOMAIN_WIDE=true (para Domain-Wide Delegation)');
      return;
    }

    console.log('✅ Google Calendar configurado');
    console.log(`📧 Service Account: ${this.config.clientEmail}`);
    console.log(`🌍 Domain-Wide Delegation: ${this.config.domainWideDelegation ? 'Habilitado' : 'Deshabilitado'}`);
  }

  /**
   * Crea un cliente JWT con permisos para actuar como un usuario específico (Domain-Wide Delegation)
   * @param userEmail Email del usuario para el cual crear eventos (ej: benet.andujar@insbitacola.cat)
   */
  private getAuthClient(userEmail?: string): JWT | null {
    if (!this.config || !this.config.clientEmail || !this.config.privateKey) {
      return null;
    }

    const authConfig: any = {
      email: this.config.clientEmail,
      key: this.config.privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar']
    };

    // Si Domain-Wide Delegation está habilitado y tenemos un userEmail, actuar como ese usuario
    if (this.config.domainWideDelegation && userEmail) {
      authConfig.subject = userEmail;
      console.log(`🔐 Autenticando como usuario: ${userEmail} (Domain-Wide Delegation)`);
    } else if (userEmail) {
      console.warn(`⚠️ Domain-Wide Delegation no habilitado. El evento se creará en el calendario del Service Account.`);
      console.warn(`💡 Para usar calendarios individuales, configura GOOGLE_CALENDAR_DOMAIN_WIDE=true`);
    }

    return new google.auth.JWT(authConfig);
  }

  async createEvent(eventData: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees?: Array<{ email: string; name?: string }>;
    location?: string;
    ownerEmail?: string; // Email del tutor propietario del evento
  }): Promise<{ googleEventId: string; eventUrl: string }> {
    const auth = this.getAuthClient(eventData.ownerEmail);

    if (!auth) {
      console.log('📅 [SIMULADO] Creando evento:', eventData.title);
      console.log(`   👤 Propietario: ${eventData.ownerEmail || 'N/A'}`);
      return {
        googleEventId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventUrl: 'https://calendar.google.com'
      };
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const event: calendar_v3.Schema$Event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: this.config!.timezone,
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: this.config!.timezone,
        },
        attendees: eventData.attendees?.map(att => ({
          email: att.email,
          displayName: att.name,
          responseStatus: 'needsAction'
        })),
        location: eventData.location,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 día antes
            { method: 'popup', minutes: 30 }       // 30 minutos antes
          ]
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: false
      };

      // Crear en el calendario del usuario (primary = calendario principal del usuario)
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all' // Enviar notificaciones a todos los asistentes
      });

      console.log(`✅ Evento creado en Google Calendar`);
      console.log(`   📧 Calendario de: ${eventData.ownerEmail || 'Service Account'}`);
      console.log(`   🆔 Event ID: ${response.data.id}`);

      return {
        googleEventId: response.data.id!,
        eventUrl: response.data.htmlLink || 'https://calendar.google.com'
      };

    } catch (error: any) {
      console.error('❌ Error creando evento en Google Calendar:', error);
      console.error(`   👤 Usuario: ${eventData.ownerEmail}`);
      console.error(`   📝 Detalles: ${error.message}`);

      // Proporcionar información útil para debugging
      if (error.message?.includes('delegation')) {
        console.error('💡 Solución: Verifica que Domain-Wide Delegation esté configurado correctamente en Google Workspace Admin');
      }
      if (error.message?.includes('insufficient')) {
        console.error('💡 Solución: Verifica que el Service Account tenga los scopes correctos en Admin Console');
      }

      throw new Error(`Error creando evento: ${error.message}`);
    }
  }

  async updateEvent(googleEventId: string, eventData: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    attendees?: Array<{ email: string; name?: string }>;
    location?: string;
    ownerEmail?: string; // Email del tutor propietario del evento
  }): Promise<void> {
    const auth = this.getAuthClient(eventData.ownerEmail);

    if (!auth) {
      console.log('📅 [SIMULADO] Actualizando evento:', googleEventId);
      console.log(`   👤 Propietario: ${eventData.ownerEmail || 'N/A'}`);
      return;
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth });
      const event: calendar_v3.Schema$Event = {};

      if (eventData.title) event.summary = eventData.title;
      if (eventData.description) event.description = eventData.description;
      if (eventData.startTime) {
        event.start = {
          dateTime: eventData.startTime.toISOString(),
          timeZone: this.config!.timezone,
        };
      }
      if (eventData.endTime) {
        event.end = {
          dateTime: eventData.endTime.toISOString(),
          timeZone: this.config!.timezone,
        };
      }
      if (eventData.attendees) {
        event.attendees = eventData.attendees.map(att => ({
          email: att.email,
          displayName: att.name,
          responseStatus: 'needsAction'
        }));
      }
      if (eventData.location) event.location = eventData.location;

      await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: event,
        sendUpdates: 'all'
      });

      console.log(`✅ Evento actualizado en Google Calendar`);
      console.log(`   🆔 Event ID: ${googleEventId}`);
      console.log(`   📧 Calendario de: ${eventData.ownerEmail || 'Service Account'}`);

    } catch (error: any) {
      console.error('❌ Error actualizando evento en Google Calendar:', error);
      throw new Error(`Error actualizando evento: ${error.message}`);
    }
  }

  async deleteEvent(googleEventId: string, ownerEmail?: string): Promise<void> {
    const auth = this.getAuthClient(ownerEmail);

    if (!auth) {
      console.log('📅 [SIMULADO] Eliminando evento:', googleEventId);
      console.log(`   👤 Propietario: ${ownerEmail || 'N/A'}`);
      return;
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
        sendUpdates: 'all' // Notificar a los asistentes
      });

      console.log(`✅ Evento eliminado de Google Calendar`);
      console.log(`   🆔 Event ID: ${googleEventId}`);
      console.log(`   📧 Calendario de: ${ownerEmail || 'Service Account'}`);

    } catch (error: any) {
      console.error('❌ Error eliminando evento de Google Calendar:', error);
      throw new Error(`Error eliminando evento: ${error.message}`);
    }
  }

  async checkConflicts(
    startTime: Date,
    endTime: Date,
    ownerEmail: string,
    excludeEventId?: string
  ): Promise<boolean> {
    const auth = this.getAuthClient(ownerEmail);

    if (!auth) {
      console.log('📅 [SIMULADO] Verificando conflictos');
      console.log(`   👤 Usuario: ${ownerEmail}`);
      return false; // No hay conflictos en modo simulado
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth });

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];
      const hasConflicts = events.some(event =>
        event.id !== excludeEventId &&
        event.start?.dateTime &&
        event.end?.dateTime
      );

      console.log(`📅 Verificación de conflictos para ${ownerEmail}: ${hasConflicts ? 'CONFLICTO DETECTADO' : 'Sin conflictos'}`);
      return hasConflicts;

    } catch (error: any) {
      console.error('❌ Error verificando conflictos:', error);
      return false; // En caso de error, permitir la reserva
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
