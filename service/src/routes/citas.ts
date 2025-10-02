import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
import { googleCalendarService } from '../calendar/google-calendar.js';
import { emailService } from '../email/email-service.js';

const router = Router();

// ========= ESQUEMAS DE VALIDACIÓN =========

const CitaSchema = z.object({
  alumne_id: z.string(),
  tutor_email: z.string().email(),
  data_cita: z.string().datetime(),
  durada_minuts: z.number().min(15).max(240).default(30),
  nom_familia: z.string().min(1),
  email_familia: z.string().email(),
  telefon_familia: z.string().min(1),
  notes: z.string().optional()
});

const ReservaHorarioSchema = z.object({
  tutorEmail: z.string().email(),
  alumneId: z.string(),
  fecha: z.string(),
  hora: z.string(),
  durada_minuts: z.number().min(15).max(240).default(30),
  nom_familia: z.string().min(1),
  email_familia: z.string().email(),
  telefon_familia: z.string().min(1),
  notes: z.string().optional()
});

const ConfiguracionHorariosSchema = z.object({
  tutor_email: z.string().email(),
  nombre: z.string().min(1),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  duracion_cita: z.number().min(15).max(240).default(30),
  dias_semana: z.array(z.object({
    dia: z.string(),
    inicio: z.string(),
    fin: z.string(),
    activo: z.boolean()
  }))
});

// ========= ENDPOINTS DE CITAS =========

/**
 * @swagger
 * /citas/{alumneId}:
 *   get:
 *     summary: Obtener citas de un alumno
 *     description: Retorna todas las citas de un alumno específico. Los docentes solo pueden ver citas de sus propios alumnos.
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
 *         description: Año curso a consultar
 *     responses:
 *       200:
 *         description: Lista de citas del alumno
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cita'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Error interno del servidor
 */
router.get('/:alumneId', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { alumneId } = req.params;
    const anyCurs = req.query.anyCurs as string || '2025-2026';
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    let accessQuery = '';
    let queryParams: any[] = [alumneId, anyCurs];

    if (user.role !== 'admin') {
      accessQuery = `AND cc.tutor_email = $3`;
      queryParams.push(user.email);
    }

    const result = await query(`
      SELECT
        cc.*,
        a.nom as alumne_nom
      FROM cites_calendari cc
      JOIN alumnes a ON cc.alumne_id = a.alumne_id
      WHERE cc.alumne_id = $1 AND cc.any_curs = $2 ${accessQuery}
      ORDER BY cc.data_cita ASC
    `, queryParams);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint cites:', error);
    res.status(500).json({ error: 'Error obtenint cites' });
  }
});

// POST /citas/:alumneId - Crear nueva cita para un alumno
router.post('/:alumneId', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { alumneId } = req.params;
    const anyCurs = req.query.anyCurs as string || '2025-2026';
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Validar datos de entrada
    const validatedData = CitaSchema.parse({
      ...req.body,
      alumne_id: alumneId
    });

    // Verificar que el tutor tiene acceso al alumno
    if (user.role !== 'admin') {
      const accessCheck = await query(`
        SELECT 1 FROM tutories_alumne
        WHERE alumne_id = $1 AND tutor_email = $2 AND any_curs = $3
      `, [alumneId, user.email, anyCurs]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tens accés a aquest alumne' });
      }
    }

    // Generar ID único para la cita
    const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Integrar con Google Calendar antes de la transacción
    const dataCita = new Date(validatedData.data_cita);
    const fechaFin = new Date(dataCita);
    fechaFin.setMinutes(fechaFin.getMinutes() + validatedData.durada_minuts);

    // Verificar conflictos
    const hasConflicts = await googleCalendarService.checkConflicts(dataCita, fechaFin);
    if (hasConflicts) {
      return res.status(409).json({
        error: 'Conflicte d\'horari detectat. Selecciona un altre horari.'
      });
    }

    // Insertar cita con transacción
    const citaResult = await withTransaction(async (client) => {
      // Insertar cita
      const result = await client.query(`
        INSERT INTO cites_calendari (
          id, alumne_id, tutor_email, any_curs, data_cita, durada_minuts,
          nom_familia, email_familia, telefon_familia, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        citaId,
        alumneId,
        validatedData.tutor_email,
        anyCurs,
        validatedData.data_cita,
        validatedData.durada_minuts,
        validatedData.nom_familia,
        validatedData.email_familia,
        validatedData.telefon_familia,
        validatedData.notes || null
      ]);

      try {
        // Crear evento en Google Calendar
        const googleEvent = await googleCalendarService.createEvent({
          title: `Cita amb ${validatedData.nom_familia}`,
          description: `Cita programada amb ${validatedData.nom_familia} (${validatedData.email_familia}).\nTelèfon: ${validatedData.telefon_familia}${validatedData.notes ? '\nNotes: ' + validatedData.notes : ''}`,
          startTime: dataCita,
          endTime: fechaFin,
          attendees: [
            { email: validatedData.tutor_email, name: 'Tutor' },
            { email: validatedData.email_familia, name: validatedData.nom_familia }
          ],
          location: 'Centre Educatiu'
        });

        // Guardar referencia de Google Calendar
        await client.query(`
          UPDATE cites_calendari
          SET google_event_id = $1, google_event_url = $2
          WHERE id = $3
        `, [googleEvent.googleEventId, googleEvent.eventUrl, citaId]);

        console.log(`✅ Cita ${citaId} creada i sincronitzada amb Google Calendar`);

      } catch (calendarError: any) {
        console.error('⚠️ Error amb Google Calendar, continuant amb BD local:', calendarError);
        // Continuar sin Google Calendar
      }

      return result;
    });

    // Enviar notificación por email (asíncrono, no bloqueante)
    emailService.sendCitaNotification({
      tutorEmail: validatedData.tutor_email,
      familiaEmail: validatedData.email_familia,
      familiaNombre: validatedData.nom_familia,
      fecha: dataCita.toISOString().split('T')[0],
      hora: dataCita.toTimeString().split(' ')[0].substring(0, 5),
      duracion: validatedData.durada_minuts,
      notas: validatedData.notes,
      tipo: 'nueva'
    }).catch(err => console.error('Error enviant email:', err));

    res.status(201).json(citaResult.rows[0]);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dades invàlides', details: error.errors });
    }
    console.error('Error creant cita:', error);
    res.status(500).json({ error: 'Error creant cita' });
  }
});

// PUT /citas/:citaId/confirmar - Confirmar cita y crear entrevista
router.put('/:citaId/confirmar', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { citaId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Obtener datos de la cita
    const citaResult = await query(`
      SELECT cc.*, a.nom as alumne_nom, a.email as alumne_email
      FROM cites_calendari cc
      JOIN alumnes a ON cc.alumne_id = a.alumne_id
      WHERE cc.id = $1
    `, [citaId]);

    if (citaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no trobada' });
    }

    const cita = citaResult.rows[0];

    // Verificar acceso
    if (user.role === 'docent' && cita.tutor_email !== user.email) {
      return res.status(403).json({ error: 'No tens permisos per confirmar aquesta cita' });
    }

    const entrevistaResult = await withTransaction(async (client) => {
      // Actualizar estado de la cita
      await client.query(`
        UPDATE cites_calendari
        SET estat = 'confirmada', updated_at = NOW()
        WHERE id = $1
      `, [citaId]);

      // Crear entrevista automáticamente en la tabla principal
      const entrevistaId = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await client.query(`
        INSERT INTO entrevistes (
          id, alumne_id, any_curs, data, acords, usuari_creador_id, cita_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        entrevistaId,
        cita.alumne_id,
        cita.any_curs,
        cita.data_cita,
        `Entrevista programada amb ${cita.nom_familia} (${cita.email_familia}).\nTelèfon: ${cita.telefon_familia}.${cita.notes ? '\nNotes: ' + cita.notes : ''}`,
        user.email,
        citaId
      ]);

      return result;
    });

    // Enviar email de confirmación
    emailService.sendCitaNotification({
      tutorEmail: cita.tutor_email,
      familiaEmail: cita.email_familia,
      familiaNombre: cita.nom_familia,
      fecha: new Date(cita.data_cita).toISOString().split('T')[0],
      hora: new Date(cita.data_cita).toTimeString().split(' ')[0].substring(0, 5),
      duracion: cita.durada_minuts,
      notas: cita.notes,
      tipo: 'confirmada',
      citaId: citaId,
      googleEventUrl: cita.google_event_url
    }).catch(err => console.error('Error enviant email:', err));

    res.json({
      cita: { ...cita, estat: 'confirmada' },
      entrevista: entrevistaResult.rows[0],
      message: 'Cita confirmada i entrevista creada automàticament'
    });

  } catch (error: any) {
    console.error('Error confirmant cita:', error);
    res.status(500).json({ error: 'Error confirmant cita' });
  }
});

// DELETE /citas/:citaId - Cancelar cita
router.delete('/:citaId', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { citaId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Obtener datos de la cita
    const citaResult = await query(`
      SELECT * FROM cites_calendari WHERE id = $1
    `, [citaId]);

    if (citaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no trobada' });
    }

    const cita = citaResult.rows[0];

    // Verificar acceso
    if (user.role === 'docent' && cita.tutor_email !== user.email) {
      return res.status(403).json({ error: 'No tens permisos per cancel·lar aquesta cita' });
    }

    // Eliminar de Google Calendar si existe
    if (cita.google_event_id) {
      try {
        await googleCalendarService.deleteEvent(cita.google_event_id);
        console.log(`✅ Event ${cita.google_event_id} eliminat de Google Calendar`);
      } catch (calendarError: any) {
        console.error('⚠️ Error eliminant event de Google Calendar:', calendarError);
      }
    }

    await withTransaction(async (client) => {
      // Actualizar estado a cancelada en lugar de eliminar
      await client.query(`
        UPDATE cites_calendari
        SET estat = 'cancelada', updated_at = NOW()
        WHERE id = $1
      `, [citaId]);
    });

    // Enviar email de cancelación
    emailService.sendCitaNotification({
      tutorEmail: cita.tutor_email,
      familiaEmail: cita.email_familia,
      familiaNombre: cita.nom_familia,
      fecha: new Date(cita.data_cita).toISOString().split('T')[0],
      hora: new Date(cita.data_cita).toTimeString().split(' ')[0].substring(0, 5),
      duracion: cita.durada_minuts,
      notas: cita.notes,
      tipo: 'cancelada'
    }).catch(err => console.error('Error enviant email:', err));

    res.json({ message: 'Cita cancel·lada correctament' });

  } catch (error: any) {
    console.error('Error cancel·lant cita:', error);
    res.status(500).json({ error: 'Error cancel·lant cita' });
  }
});

// ========= ENDPOINTS DE HORARIOS =========

// GET /citas/horarios/:tutorEmail - Obtener horarios disponibles del tutor
router.get('/horarios/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { tutorEmail } = req.params;
    const { fecha } = req.query;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquests horaris' });
    }

    const fechaConsulta = fecha as string || new Date().toISOString().split('T')[0];

    // Obtener horarios ocupados
    const horariosOcupados = await query(`
      SELECT data_cita, durada_minuts
      FROM cites_calendari
      WHERE tutor_email = $1
      AND DATE(data_cita) = $2
      AND estat IN ('pendent', 'confirmada')
      ORDER BY data_cita
    `, [tutorEmail, fechaConsulta]);

    // Obtener horarios configurados
    const horariosConfigurados = await query(`
      SELECT dia_semana, hora_inicio, hora_fin
      FROM horarios_tutor
      WHERE tutor_email = $1
      AND activo = true
    `, [tutorEmail]);

    // Generar slots disponibles
    const horariosDisponibles = [];
    const diaSemana = new Date(fechaConsulta).getDay();
    const diaConfig = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][diaSemana];

    const configDia = horariosConfigurados.rows.find(c => c.dia_semana === diaConfig);

    if (configDia) {
      const [horaInicio, minutoInicio] = configDia.hora_inicio.split(':').map(Number);
      const [horaFin, minutoFin] = configDia.hora_fin.split(':').map(Number);

      const inicioMinutos = horaInicio * 60 + minutoInicio;
      const finMinutos = horaFin * 60 + minutoFin;
      const duracionSlot = 30;

      for (let minutos = inicioMinutos; minutos < finMinutos; minutos += duracionSlot) {
        const hora = Math.floor(minutos / 60);
        const minuto = minutos % 60;
        const horaSlot = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
        const fechaHora = new Date(`${fechaConsulta}T${horaSlot}:00`);

        // Verificar si está ocupado
        const ocupado = horariosOcupados.rows.some(ocupado => {
          const horaOcupada = new Date(ocupado.data_cita);
          const duracionOcupada = ocupado.durada_minuts;
          const finOcupada = new Date(horaOcupada.getTime() + duracionOcupada * 60000);

          return fechaHora >= horaOcupada && fechaHora < finOcupada;
        });

        if (!ocupado) {
          horariosDisponibles.push({
            hora: horaSlot,
            disponible: true,
            fecha: fechaConsulta
          });
        }
      }
    }

    res.json({
      tutor_email: tutorEmail,
      fecha: fechaConsulta,
      horarios_disponibles: horariosDisponibles,
      horarios_ocupados: horariosOcupados.rows
    });

  } catch (error: any) {
    console.error('Error obtenint horaris:', error);
    res.status(500).json({ error: 'Error obtenint horaris' });
  }
});

// POST /citas/horarios/configurar - Configurar horarios del tutor
router.post('/horarios/configurar', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const validatedData = ConfiguracionHorariosSchema.parse(req.body);

    // Verificar permisos
    if (user.role === 'docent' && user.email !== validatedData.tutor_email) {
      return res.status(403).json({ error: 'No tens permisos per configurar aquests horaris' });
    }

    const horariosActivos = validatedData.dias_semana.filter(h => h.activo);

    await withTransaction(async (client) => {
      // Eliminar horarios existentes
      await client.query(`
        DELETE FROM horarios_tutor WHERE tutor_email = $1
      `, [validatedData.tutor_email]);

      // Insertar nuevos horarios
      for (const horario of horariosActivos) {
        await client.query(`
          INSERT INTO horarios_tutor (
            tutor_email, dia_semana, hora_inicio, hora_fin, activo
          ) VALUES ($1, $2, $3, $4, true)
        `, [
          validatedData.tutor_email,
          horario.dia,
          horario.inicio,
          horario.fin
        ]);
      }
    });

    res.json({
      message: 'Horaris configurats correctament',
      total_horarios: horariosActivos.length
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dades invàlides', details: error.errors });
    }
    console.error('Error configurant horaris:', error);
    res.status(500).json({ error: 'Error configurant horaris' });
  }
});

// POST /citas/reservar - Reservar horario desde el programador
router.post('/reservar', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const validatedData = ReservaHorarioSchema.parse(req.body);

    // Verificar permisos
    if (user.role === 'docent' && user.email !== validatedData.tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per reservar per aquest tutor' });
    }

    // Verificar acceso al alumno
    if (user.role === 'docent') {
      const accessCheck = await query(`
        SELECT 1 FROM tutories_alumne
        WHERE alumne_id = $1 AND tutor_email = $2 AND any_curs = '2025-2026'
      `, [validatedData.alumneId, user.email]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tens accés a aquest alumne' });
      }
    }

    // Crear fecha completa
    const dataCita = new Date(`${validatedData.fecha}T${validatedData.hora}:00`);
    const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Integrar con Google Calendar
    const fechaFin = new Date(dataCita);
    fechaFin.setMinutes(fechaFin.getMinutes() + validatedData.durada_minuts);

    // Verificar conflictos antes de la transacción
    const hasConflicts = await googleCalendarService.checkConflicts(dataCita, fechaFin);
    if (hasConflicts) {
      return res.status(409).json({
        error: 'Conflicte d\'horari detectat. Selecciona un altre horari.'
      });
    }

    const citaResult = await withTransaction(async (client) => {
      // Insertar cita
      const result = await client.query(`
        INSERT INTO cites_calendari (
          id, alumne_id, tutor_email, any_curs, data_cita, durada_minuts,
          nom_familia, email_familia, telefon_familia, notes, estat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendent')
        RETURNING *
      `, [
        citaId,
        validatedData.alumneId,
        validatedData.tutorEmail,
        '2025-2026',
        dataCita,
        validatedData.durada_minuts,
        validatedData.nom_familia,
        validatedData.email_familia,
        validatedData.telefon_familia,
        validatedData.notes || null
      ]);

      try {
        // Crear evento en Google Calendar
        const googleEvent = await googleCalendarService.createEvent({
          title: `Cita amb ${validatedData.nom_familia}`,
          description: `Cita programada amb ${validatedData.nom_familia} (${validatedData.email_familia}).\nTelèfon: ${validatedData.telefon_familia}${validatedData.notes ? '\nNotes: ' + validatedData.notes : ''}`,
          startTime: dataCita,
          endTime: fechaFin,
          attendees: [
            { email: validatedData.tutorEmail, name: 'Tutor' },
            { email: validatedData.email_familia, name: validatedData.nom_familia }
          ],
          location: 'Centre Educatiu'
        });

        // Actualizar con referencia de Google Calendar
        await client.query(`
          UPDATE cites_calendari
          SET google_event_id = $1, google_event_url = $2
          WHERE id = $3
        `, [googleEvent.googleEventId, googleEvent.eventUrl, citaId]);

        console.log(`✅ Cita ${citaId} creada i sincronitzada amb Google Calendar`);

      } catch (calendarError: any) {
        console.error('⚠️ Error amb Google Calendar, continuant amb BD local:', calendarError);
      }

      return result;
    });

    // Enviar notificación por email
    emailService.sendCitaNotification({
      tutorEmail: validatedData.tutorEmail,
      familiaEmail: validatedData.email_familia,
      familiaNombre: validatedData.nom_familia,
      fecha: validatedData.fecha,
      hora: validatedData.hora,
      duracion: validatedData.durada_minuts,
      notas: validatedData.notes,
      tipo: 'nueva'
    }).catch(err => console.error('Error enviant email:', err));

    res.status(201).json({
      cita: citaResult.rows[0],
      message: 'Horari reservat correctament'
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dades invàlides', details: error.errors });
    }
    console.error('Error reservant horari:', error);
    res.status(500).json({ error: 'Error reservant horari' });
  }
});

// GET /citas/tutor/:tutorEmail/alumnes - Obtener alumnos del tutor con datos de contacto
router.get('/tutor/:tutorEmail/alumnes', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { tutorEmail } = req.params;

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquests alumnes' });
    }

    const result = await query(`
      SELECT DISTINCT
        a.alumne_id,
        a.nom,
        pf.cognoms,
        ac.grup_id as grup,
        pf.tutor1_nom,
        pf.tutor1_email,
        pf.tutor1_tel,
        pf.tutor2_nom,
        pf.tutor2_email,
        pf.tutor2_tel
      FROM alumnes a
      JOIN tutories_alumne ta ON a.alumne_id = ta.alumne_id
      LEFT JOIN pf ON a.personal_id = pf.personal_id
      LEFT JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = ta.any_curs
      WHERE ta.tutor_email = $1 AND ta.any_curs = '2025-2026'
      ORDER BY a.nom, pf.cognoms
    `, [tutorEmail]);

    res.json({
      alumnes: result.rows,
      total: result.rows.length
    });

  } catch (error: any) {
    console.error('Error obtenint alumnes del tutor:', error);
    res.status(500).json({ error: 'Error obtenint alumnes' });
  }
});

// GET /citas/tutor/:tutorEmail/lista - Obtener todas las citas del tutor
router.get('/tutor/:tutorEmail/lista', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { tutorEmail } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquestes cites' });
    }

    const result = await query(`
      SELECT
        cc.id,
        cc.alumne_id,
        cc.data_cita,
        cc.durada_minuts,
        cc.nom_familia,
        cc.email_familia,
        cc.telefon_familia,
        cc.notes,
        cc.estat,
        cc.created_at,
        cc.google_event_url,
        a.nom as alumne_nom
      FROM cites_calendari cc
      LEFT JOIN alumnes a ON cc.alumne_id = a.alumne_id
      WHERE cc.tutor_email = $1
      ORDER BY cc.data_cita DESC
    `, [tutorEmail]);

    res.json({
      cites: result.rows,
      total: result.rows.length
    });

  } catch (error: any) {
    console.error('Error obtenint cites del tutor:', error);
    res.status(500).json({ error: 'Error obtenint cites del tutor' });
  }
});

export default router;
