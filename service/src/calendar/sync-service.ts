import { google } from 'googleapis';
import { query, withTransaction } from '../db.js';
import { googleCalendarService } from './google-calendar.js';

interface SyncLogEntry {
  id?: number;
  action: 'push' | 'pull' | 'conflict';
  entity_type: 'cita' | 'event';
  entity_id: string;
  google_event_id?: string;
  status: 'success' | 'error' | 'pending';
  error_message?: string;
  sync_direction: 'to_google' | 'from_google' | 'bidirectional';
  created_at?: Date;
}

/**
 * Servicio de sincronización bidireccional con Google Calendar
 */
class SyncService {
  /**
   * Sincronizar una cita local con Google Calendar
   */
  async syncCitaToGoogle(citaId: string): Promise<void> {
    try {
      // Obtener datos de la cita
      const citaResult = await query(`
        SELECT * FROM cites_calendari WHERE id = $1
      `, [citaId]);

      if (citaResult.rows.length === 0) {
        throw new Error(`Cita ${citaId} no trobada`);
      }

      const cita = citaResult.rows[0];

      const dataCita = new Date(cita.data_cita);
      const fechaFin = new Date(dataCita);
      fechaFin.setMinutes(fechaFin.getMinutes() + cita.durada_minuts);

      // Si ya tiene google_event_id, actualizar; sino, crear
      if (cita.google_event_id) {
        await googleCalendarService.updateEvent(cita.google_event_id, {
          title: `Cita amb ${cita.nom_familia}`,
          description: `Cita programada amb ${cita.nom_familia} (${cita.email_familia}).\nTelèfon: ${cita.telefon_familia}${cita.notes ? '\nNotes: ' + cita.notes : ''}`,
          startTime: dataCita,
          endTime: fechaFin,
          attendees: [
            { email: cita.tutor_email, name: 'Tutor' },
            { email: cita.email_familia, name: cita.nom_familia }
          ]
        });

        await this.logSync({
          action: 'push',
          entity_type: 'cita',
          entity_id: citaId,
          google_event_id: cita.google_event_id,
          status: 'success',
          sync_direction: 'to_google'
        });
      } else {
        const googleEvent = await googleCalendarService.createEvent({
          title: `Cita amb ${cita.nom_familia}`,
          description: `Cita programada amb ${cita.nom_familia} (${cita.email_familia}).\nTelèfon: ${cita.telefon_familia}${cita.notes ? '\nNotes: ' + cita.notes : ''}`,
          startTime: dataCita,
          endTime: fechaFin,
          attendees: [
            { email: cita.tutor_email, name: 'Tutor' },
            { email: cita.email_familia, name: cita.nom_familia }
          ],
          location: 'Centre Educatiu'
        });

        // Actualizar BD con google_event_id
        await query(`
          UPDATE cites_calendari
          SET google_event_id = $1, google_event_url = $2
          WHERE id = $3
        `, [googleEvent.googleEventId, googleEvent.eventUrl, citaId]);

        await this.logSync({
          action: 'push',
          entity_type: 'cita',
          entity_id: citaId,
          google_event_id: googleEvent.googleEventId,
          status: 'success',
          sync_direction: 'to_google'
        });
      }

      console.log(`✅ Cita ${citaId} sincronitzada amb Google Calendar`);
    } catch (error: any) {
      console.error(`❌ Error sincronitzant cita ${citaId}:`, error);

      await this.logSync({
        action: 'push',
        entity_type: 'cita',
        entity_id: citaId,
        status: 'error',
        error_message: error.message,
        sync_direction: 'to_google'
      });

      throw error;
    }
  }

  /**
   * Sincronizar evento de Google Calendar a BD local
   */
  async syncEventFromGoogle(googleEventId: string, eventData: any): Promise<void> {
    try {
      // Buscar si ya existe una cita con este google_event_id
      const citaResult = await query(`
        SELECT * FROM cites_calendari WHERE google_event_id = $1
      `, [googleEventId]);

      if (citaResult.rows.length > 0) {
        // Actualizar cita existente
        const cita = citaResult.rows[0];

        await query(`
          UPDATE cites_calendari
          SET
            data_cita = $1,
            durada_minuts = $2,
            notes = COALESCE(notes, '') || '\n[Actualitzat des de Google Calendar]',
            updated_at = NOW()
          WHERE id = $3
        `, [
          eventData.start.dateTime,
          this.calculateDuration(eventData.start.dateTime, eventData.end.dateTime),
          cita.id
        ]);

        await this.logSync({
          action: 'pull',
          entity_type: 'cita',
          entity_id: cita.id,
          google_event_id: googleEventId,
          status: 'success',
          sync_direction: 'from_google'
        });

        console.log(`✅ Cita ${cita.id} actualitzada des de Google Calendar`);
      } else {
        // Nuevo evento de Google Calendar sin cita asociada
        console.log(`⚠️ Event ${googleEventId} no té cita associada a la BD local`);

        await this.logSync({
          action: 'pull',
          entity_type: 'event',
          entity_id: googleEventId,
          google_event_id: googleEventId,
          status: 'pending',
          error_message: 'No hay cita asociada en BD local',
          sync_direction: 'from_google'
        });
      }
    } catch (error: any) {
      console.error(`❌ Error sincronitzant event ${googleEventId}:`, error);

      await this.logSync({
        action: 'pull',
        entity_type: 'event',
        entity_id: googleEventId,
        google_event_id: googleEventId,
        status: 'error',
        error_message: error.message,
        sync_direction: 'from_google'
      });

      throw error;
    }
  }

  /**
   * Procesar notificación de webhook de Google Calendar
   */
  async processWebhookNotification(notification: any): Promise<void> {
    try {
      const { channelId, resourceId, resourceState } = notification;

      console.log(`📥 Webhook notification: ${resourceState} - ${resourceId}`);

      if (resourceState === 'sync') {
        // Initial sync - skip
        return;
      }

      if (resourceState === 'exists' || resourceState === 'update') {
        // Evento creado o actualizado
        // Aquí deberíamos obtener el evento de Google Calendar y sincronizarlo
        console.log(`🔄 Processant actualització de Google Calendar`);
      } else if (resourceState === 'not_exists') {
        // Evento eliminado
        await this.handleDeletedEvent(resourceId);
      }
    } catch (error: any) {
      console.error('❌ Error processant webhook notification:', error);
      throw error;
    }
  }

  /**
   * Manejar evento eliminado de Google Calendar
   */
  private async handleDeletedEvent(resourceId: string): Promise<void> {
    try {
      // Buscar cita con este google_event_id
      const citaResult = await query(`
        SELECT * FROM cites_calendari WHERE google_event_id = $1
      `, [resourceId]);

      if (citaResult.rows.length > 0) {
        const cita = citaResult.rows[0];

        // Actualizar estado a cancelada
        await query(`
          UPDATE cites_calendari
          SET estat = 'cancelada', updated_at = NOW()
          WHERE id = $1
        `, [cita.id]);

        await this.logSync({
          action: 'pull',
          entity_type: 'cita',
          entity_id: cita.id,
          google_event_id: resourceId,
          status: 'success',
          sync_direction: 'from_google'
        });

        console.log(`✅ Cita ${cita.id} cancel·lada (event eliminat de Google Calendar)`);
      }
    } catch (error: any) {
      console.error(`❌ Error manejant event eliminat ${resourceId}:`, error);
      throw error;
    }
  }

  /**
   * Calcular duración en minutos entre dos fechas
   */
  private calculateDuration(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  }

  /**
   * Registrar operación de sincronización
   */
  private async logSync(entry: SyncLogEntry): Promise<void> {
    try {
      // Crear tabla si no existe
      await query(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id SERIAL PRIMARY KEY,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          google_event_id VARCHAR(255),
          status VARCHAR(50) NOT NULL,
          error_message TEXT,
          sync_direction VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(`
        INSERT INTO sync_log (
          action, entity_type, entity_id, google_event_id,
          status, error_message, sync_direction
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        entry.action,
        entry.entity_type,
        entry.entity_id,
        entry.google_event_id || null,
        entry.status,
        entry.error_message || null,
        entry.sync_direction
      ]);
    } catch (error: any) {
      console.error('Error registrant sync log:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Obtener log de sincronización
   */
  async getSyncLog(limit: number = 100): Promise<SyncLogEntry[]> {
    try {
      const result = await query(`
        SELECT * FROM sync_log
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error: any) {
      console.error('Error obtenint sync log:', error);
      return [];
    }
  }

  /**
   * Sincronizar todas las citas pendientes
   */
  async syncAllPendingCitas(): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    try {
      // Obtener citas sin google_event_id o actualizadas recientemente
      const citasResult = await query(`
        SELECT id FROM cites_calendari
        WHERE estat IN ('pendent', 'confirmada')
        AND (google_event_id IS NULL OR updated_at > NOW() - INTERVAL '1 hour')
      `);

      for (const cita of citasResult.rows) {
        try {
          await this.syncCitaToGoogle(cita.id);
          success++;
        } catch (error) {
          errors++;
        }
      }

      console.log(`✅ Sync complet: ${success} èxits, ${errors} errors`);
    } catch (error: any) {
      console.error('❌ Error en sync massiu:', error);
    }

    return { success, errors };
  }
}

export const syncService = new SyncService();
