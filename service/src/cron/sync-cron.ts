import cron from 'node-cron';
import { syncService } from '../calendar/sync-service.js';

/**
 * Configurar tareas programadas para sincronización con Google Calendar
 */
export function setupSyncCronJobs() {
  // Sincronización cada 15 minutos
  const syncInterval = process.env.SYNC_INTERVAL_MINUTES || '15';

  cron.schedule(`*/${syncInterval} * * * *`, async () => {
    console.log(`🔄 [CRON] Iniciando sincronización periódica...`);

    try {
      const result = await syncService.syncAllPendingCitas();
      console.log(`✅ [CRON] Sync completada: ${result.success} èxits, ${result.errors} errors`);
    } catch (error: any) {
      console.error(`❌ [CRON] Error en sync periódica:`, error);
    }
  });

  console.log(`✅ Cron job de sincronización configurado: cada ${syncInterval} minutos`);

  // Limpieza de logs antiguos - cada día a las 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    console.log(`🧹 [CRON] Iniciando limpieza de logs antiguos...`);

    try {
      // Eliminar logs de más de 30 días
      const { query } = await import('../db.js');

      const result = await query(`
        DELETE FROM sync_log
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);

      console.log(`✅ [CRON] Logs eliminados: ${result.rowCount || 0} registros`);
    } catch (error: any) {
      console.error(`❌ [CRON] Error limpiando logs:`, error);
    }
  });

  console.log(`✅ Cron job de limpieza de logs configurado: diario a las 3:00 AM`);

  // Verificación de citas próximas - cada hora
  cron.schedule('0 * * * *', async () => {
    console.log(`📅 [CRON] Verificando citas próximas...`);

    try {
      const { query } = await import('../db.js');
      const { emailService } = await import('../email/email-service.js');

      // Obtener citas de las próximas 24 horas que no han sido recordadas
      const citasProximas = await query(`
        SELECT
          c.*,
          a.nom as alumne_nom,
          a.email as alumne_email
        FROM cites_calendari c
        LEFT JOIN alumnes a ON c.alumne_id = a.alumne_id
        WHERE c.estat = 'confirmada'
        AND c.data_cita BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        AND (c.reminder_sent IS NULL OR c.reminder_sent = false)
      `);

      for (const cita of citasProximas.rows) {
        try {
          // Enviar recordatorio
          await emailService.sendCitaNotification({
            tutorEmail: cita.tutor_email,
            familiaEmail: cita.email_familia,
            familiaNombre: cita.nom_familia,
            fecha: new Date(cita.data_cita).toISOString().split('T')[0],
            hora: new Date(cita.data_cita).toTimeString().split(' ')[0].substring(0, 5),
            duracion: cita.durada_minuts,
            notas: cita.notes,
            tipo: 'recordatorio',
            citaId: cita.id,
            googleEventUrl: cita.google_event_url
          });

          // Marcar como recordada
          await query(`
            UPDATE cites_calendari
            SET reminder_sent = true
            WHERE id = $1
          `, [cita.id]);

          console.log(`📧 [CRON] Recordatorio enviado para cita ${cita.id}`);
        } catch (error: any) {
          console.error(`❌ [CRON] Error enviando recordatorio para cita ${cita.id}:`, error);
        }
      }

      console.log(`✅ [CRON] Verificación de citas próximas completada: ${citasProximas.rows.length} recordatorios enviados`);
    } catch (error: any) {
      console.error(`❌ [CRON] Error verificando citas próximas:`, error);
    }
  });

  console.log(`✅ Cron job de recordatorios configurado: cada hora`);
}

/**
 * Detener todos los cron jobs (útil para tests)
 */
export function stopAllCronJobs() {
  cron.getTasks().forEach(task => task.stop());
  console.log('🛑 Todos los cron jobs detenidos');
}
