import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface GoogleCalendarConfig {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
  timezone: string;
}

class GoogleCalendarService {
  private auth: OAuth2Client | null = null;
  private calendar: calendar_v3.Calendar | null = null;
  private config: GoogleCalendarConfig | null = null;

  constructor() {
    this.config = {
      clientEmail: process.env.GOOGLE_CALENDAR_EMAIL || '',
      privateKey: (process.env.GOOGLE_CALENDAR_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timezone: process.env.GOOGLE_CALENDAR_TIMEZONE || 'Europe/Madrid'
    };

    if (!this.config.clientEmail || !this.config.privateKey) {
      console.warn('⚠️ Google Calendar no configurado. Usando modo simulado.');
      return;
    }

    this.auth = new google.auth.JWT(
      this.config.clientEmail,
      undefined,
      this.config.privateKey,
      ['https://www.googleapis.com/auth/calendar'],
      undefined
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  async createEvent(eventData: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees?: Array<{ email: string; name?: string }>;
    location?: string;
  }): Promise<{ googleEventId: string; eventUrl: string }> {
    if (!this.calendar || !this.config) {
      console.log('📅 [SIMULADO] Creando evento:', eventData.title);
      return {
        googleEventId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventUrl: 'https://calendar.google.com'
      };
    }

    try {
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

      const response = await this.calendar!.events.insert({
        calendarId: this.config!.calendarId,
        requestBody: event
      });

      console.log('✅ Evento creado en Google Calendar:', response.data.id);
      
      return {
        googleEventId: response.data.id!,
        eventUrl: response.data.htmlLink || 'https://calendar.google.com'
      };

    } catch (error: any) {
      console.error('❌ Error creando evento en Google Calendar:', error);
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
  }): Promise<void> {
    if (!this.calendar || !this.config) {
      console.log('📅 [SIMULADO] Actualizando evento:', googleEventId);
      return;
    }

    try {
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

      await this.calendar!.events.update({
        calendarId: this.config!.calendarId,
        eventId: googleEventId,
        requestBody: event
      });

      console.log('✅ Evento actualizado en Google Calendar:', googleEventId);

    } catch (error: any) {
      console.error('❌ Error actualizando evento en Google Calendar:', error);
      throw new Error(`Error actualizando evento: ${error.message}`);
    }
  }

  async deleteEvent(googleEventId: string): Promise<void> {
    if (!this.calendar || !this.config) {
      console.log('📅 [SIMULADO] Eliminando evento:', googleEventId);
      return;
    }

    try {
      await this.calendar!.events.delete({
        calendarId: this.config!.calendarId,
        eventId: googleEventId
      });

      console.log('✅ Evento eliminado de Google Calendar:', googleEventId);

    } catch (error: any) {
      console.error('❌ Error eliminando evento de Google Calendar:', error);
      throw new Error(`Error eliminando evento: ${error.message}`);
    }
  }

  async checkConflicts(startTime: Date, endTime: Date, excludeEventId?: string): Promise<boolean> {
    if (!this.calendar || !this.config) {
      console.log('📅 [SIMULADO] Verificando conflictos');
      return false; // No hay conflictos en modo simulado
    }

    try {
      const response = await this.calendar!.events.list({
        calendarId: this.config!.calendarId,
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

      console.log(`📅 Verificación de conflictos: ${hasConflicts ? 'CONFLICTO DETECTADO' : 'Sin conflictos'}`);
      return hasConflicts;

    } catch (error: any) {
      console.error('❌ Error verificando conflictos:', error);
      return false; // En caso de error, permitir la reserva
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
