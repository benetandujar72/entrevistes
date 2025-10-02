/**
 * @swagger
 * /citas/{alumneId}:
 *   post:
 *     summary: Crear nueva cita para un alumno
 *     description: Crea una nueva cita y la sincroniza con Google Calendar
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alumneId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del alumno
 *       - in: query
 *         name: anyCurs
 *         schema:
 *           type: string
 *           default: '2025-2026'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NuevaCita'
 *     responses:
 *       201:
 *         description: Cita creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cita'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Conflicto de horario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Conflicte d'horari detectat. Selecciona un altre horari."
 *
 * @swagger
 * /citas/{citaId}/confirmar:
 *   put:
 *     summary: Confirmar cita y crear entrevista
 *     description: Confirma una cita pendiente y crea automáticamente una entrevista asociada
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita confirmada y entrevista creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cita:
 *                   $ref: '#/components/schemas/Cita'
 *                 entrevista:
 *                   $ref: '#/components/schemas/Entrevista'
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * @swagger
 * /citas/{citaId}:
 *   delete:
 *     summary: Cancelar cita
 *     description: Cancela una cita y elimina el evento de Google Calendar
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: citaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la cita
 *     responses:
 *       200:
 *         description: Cita cancelada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * @swagger
 * /citas/horarios/{tutorEmail}:
 *   get:
 *     summary: Obtener horarios disponibles del tutor
 *     description: Retorna los slots disponibles para un tutor en una fecha específica
 *     tags: [Horarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del tutor
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha a consultar (default hoy)
 *     responses:
 *       200:
 *         description: Horarios disponibles del tutor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tutor_email:
 *                   type: string
 *                 fecha:
 *                   type: string
 *                 horarios_disponibles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hora:
 *                         type: string
 *                       disponible:
 *                         type: boolean
 *                       fecha:
 *                         type: string
 *                 horarios_ocupados:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *
 * @swagger
 * /citas/horarios/configurar:
 *   post:
 *     summary: Configurar horarios del tutor
 *     description: Establece los horarios disponibles para un tutor
 *     tags: [Horarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfiguracionHorarios'
 *     responses:
 *       200:
 *         description: Horarios configurados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 total_horarios:
 *                   type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *
 * @swagger
 * /citas/reservar:
 *   post:
 *     summary: Reservar horario
 *     description: Reserva un slot de horario específico para una cita
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tutorEmail, alumneId, fecha, hora, nom_familia, email_familia, telefon_familia]
 *             properties:
 *               tutorEmail:
 *                 type: string
 *                 format: email
 *               alumneId:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date
 *               hora:
 *                 type: string
 *                 pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
 *               durada_minuts:
 *                 type: integer
 *                 default: 30
 *               nom_familia:
 *                 type: string
 *               email_familia:
 *                 type: string
 *                 format: email
 *               telefon_familia:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Horario reservado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cita:
 *                   $ref: '#/components/schemas/Cita'
 *                 message:
 *                   type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Conflicto de horario
 *
 * @swagger
 * /citas/tutor/{tutorEmail}/alumnes:
 *   get:
 *     summary: Obtener alumnos del tutor
 *     description: Retorna lista de alumnos asignados al tutor con datos de contacto
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del tutor
 *     responses:
 *       200:
 *         description: Lista de alumnos del tutor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alumnes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *
 * @swagger
 * /citas/tutor/{tutorEmail}/lista:
 *   get:
 *     summary: Obtener todas las citas del tutor
 *     description: Retorna historial completo de citas del tutor
 *     tags: [Citas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tutorEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email del tutor
 *     responses:
 *       200:
 *         description: Lista de citas del tutor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cita'
 *                 total:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */

// Este archivo solo contiene documentación de Swagger
// No exporta ningún código funcional
export {};
