/**
 * @swagger
 * /google-calendar-webhook:
 *   post:
 *     summary: Webhook de Google Calendar
 *     description: Recibe notificaciones de cambios en Google Calendar y sincroniza con la BD local
 *     tags: [Sincronización]
 *     parameters:
 *       - in: header
 *         name: x-goog-channel-id
 *         schema:
 *           type: string
 *         description: ID del canal de notificación
 *       - in: header
 *         name: x-goog-channel-token
 *         schema:
 *           type: string
 *         description: Token de autenticación del webhook
 *       - in: header
 *         name: x-goog-resource-id
 *         schema:
 *           type: string
 *         description: ID del recurso modificado
 *       - in: header
 *         name: x-goog-resource-state
 *         schema:
 *           type: string
 *           enum: [sync, exists, update, not_exists]
 *         description: Estado del recurso
 *     responses:
 *       200:
 *         description: Notificación procesada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * @swagger
 * /google-calendar-webhook/sync-log:
 *   get:
 *     summary: Obtener log de sincronización
 *     description: Retorna el historial de operaciones de sincronización
 *     tags: [Sincronización]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de registros a retornar
 *     responses:
 *       200:
 *         description: Log de sincronización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 entries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SyncLogEntry'
 *       500:
 *         description: Error obteniendo log
 *
 * @swagger
 * /google-calendar-webhook/sync-all:
 *   post:
 *     summary: Sincronizar todas las citas pendientes
 *     description: Fuerza la sincronización de todas las citas pendientes con Google Calendar
 *     tags: [Sincronización]
 *     responses:
 *       200:
 *         description: Sincronización completada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 success:
 *                   type: integer
 *                   description: Número de citas sincronizadas exitosamente
 *                 errors:
 *                   type: integer
 *                   description: Número de errores durante la sincronización
 *       500:
 *         description: Error en sincronización masiva
 *
 * @swagger
 * /google-calendar-webhook/sync/{citaId}:
 *   post:
 *     summary: Sincronizar cita específica
 *     description: Fuerza la sincronización de una cita específica con Google Calendar
 *     tags: [Sincronización]
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita a sincronizar
 *     responses:
 *       200:
 *         description: Cita sincronizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Error sincronizando cita
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Este archivo solo contiene documentación de Swagger
export {};
