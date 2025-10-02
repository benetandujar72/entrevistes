import { Router, Request, Response } from 'express';
import { syncService } from '../calendar/sync-service.js';

const router = Router();

/**
 * POST /google-calendar-webhook
 * Endpoint para recibir notificaciones de Google Calendar
 *
 * Google Calendar envía notificaciones cuando un evento cambia
 * Documentación: https://developers.google.com/calendar/api/guides/push
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Headers de Google Calendar
    const channelId = req.headers['x-goog-channel-id'] as string;
    const channelToken = req.headers['x-goog-channel-token'] as string;
    const resourceId = req.headers['x-goog-resource-id'] as string;
    const resourceState = req.headers['x-goog-resource-state'] as string;
    const resourceUri = req.headers['x-goog-resource-uri'] as string;
    const messageNumber = req.headers['x-goog-message-number'] as string;

    console.log(`📥 Webhook de Google Calendar rebut:`, {
      channelId,
      resourceId,
      resourceState,
      messageNumber
    });

    // Verificar token de autenticación (si está configurado)
    const expectedToken = process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN;
    if (expectedToken && channelToken !== expectedToken) {
      console.warn('⚠️ Token de webhook invàlid');
      return res.status(401).json({ error: 'Token invàlid' });
    }

    // Procesar notificación
    await syncService.processWebhookNotification({
      channelId,
      resourceId,
      resourceState,
      resourceUri,
      messageNumber
    });

    // Google Calendar espera una respuesta 200 OK
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('❌ Error processant webhook:', error);
    // Siempre devolver 200 para no que Google reintente
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * GET /google-calendar-webhook/sync-log
 * Obtener log de sincronización
 */
router.get('/sync-log', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const log = await syncService.getSyncLog(limit);

    res.json({
      total: log.length,
      entries: log
    });
  } catch (error: any) {
    console.error('Error obtenint sync log:', error);
    res.status(500).json({ error: 'Error obtenint sync log' });
  }
});

/**
 * POST /google-calendar-webhook/sync-all
 * Forzar sincronización de todas las citas pendientes
 */
router.post('/sync-all', async (req: Request, res: Response) => {
  try {
    const result = await syncService.syncAllPendingCitas();

    res.json({
      message: 'Sincronització completa',
      ...result
    });
  } catch (error: any) {
    console.error('Error en sync massiu:', error);
    res.status(500).json({ error: 'Error en sync massiu' });
  }
});

/**
 * POST /google-calendar-webhook/sync/:citaId
 * Forzar sincronización de una cita específica
 */
router.post('/sync/:citaId', async (req: Request, res: Response) => {
  try {
    const { citaId } = req.params;

    await syncService.syncCitaToGoogle(citaId);

    res.json({
      message: `Cita ${citaId} sincronitzada correctament`
    });
  } catch (error: any) {
    console.error(`Error sincronitzant cita ${req.params.citaId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
