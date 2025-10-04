import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
import { googleCalendarService } from '../calendar/google-calendar.js';
import { emailService } from '../email/email-service.js';

const router = Router();

// Esquemas de validación
const DadesPersonalsSchema = z.object({
  personal_id: z.string(),
  sexe: z.enum(['H', 'D', 'X']).optional(),
  data_naixement: z.string().optional(),
  municipi_naixement: z.string().optional(),
  nacionalitat: z.string().optional(),
  adreca: z.string().optional(),
  municipi_residencia: z.string().optional(),
  codi_postal: z.string().optional(),
  doc_identitat: z.string().optional(),
  tis: z.string().optional(),
  ralc: z.string().optional(),
  link_fotografia: z.string().optional(),
  tutor1_nom: z.string().optional(),
  tutor1_tel: z.string().optional(),
  tutor1_email: z.string().email().optional(),
  tutor2_nom: z.string().optional(),
  tutor2_tel: z.string().optional(),
  tutor2_email: z.string().email().optional()
});

const CitaCalendariSchema = z.object({
  alumne_id: z.string(),
  data_cita: z.string().datetime(),
  durada_minuts: z.number().min(15).max(240).default(30),
  nom_familia: z.string().min(1),
  email_familia: z.string().email(),
  telefon_familia: z.string().min(1),
  notes: z.string().optional()
});

const SolicitutCanviSchema = z.object({
  alumne_id: z.string(),
  camp_modificar: z.string(),
  valor_actual: z.string().optional(),
  valor_nou: z.string(),
  justificacio: z.string().min(10)
});

// POST /dades-personals/import - Importar datos personales
router.post('/import', requireAuth(), requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const {
      personal_id,
      alumne_nom,
      alumne_email,
      sexe,
      data_naixement,
      municipi_naixement,
      nacionalitat,
      adreca,
      municipi_residencia,
      codi_postal,
      doc_identitat,
      tis,
      ralc,
      link_fotografia,
      tutor_personal_nom,
      tutor_personal_email,
      tutor1_nom,
      tutor1_tel,
      tutor1_email,
      tutor2_nom,
      tutor2_tel,
      tutor2_email
    } = req.body;

    // Validar datos requeridos
    if (!personal_id || !alumne_nom || !alumne_email) {
      return res.status(400).json({ error: 'Datos requeridos: personal_id, alumne_nom, alumne_email' });
    }

    // Buscar alumno por nombre (más confiable que email)
    const alumneResult = await query(
      'SELECT alumne_id, email FROM alumnes WHERE nom = $1',
      [alumne_nom]
    );

    if (alumneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado en la base de datos' });
    }

    const alumneId = alumneResult.rows[0].alumne_id;

    // Insertar o actualizar datos personales
    await query(`
      INSERT INTO pf (
        personal_id, sexe, data_naixement, municipi_naixement, nacionalitat,
        adreca, municipi_residencia, codi_postal, doc_identitat, tis, ralc,
        link_fotografia, tutor_personal_nom, tutor_personal_email, tutor1_nom, 
        tutor1_tel, tutor1_email, tutor2_nom, tutor2_tel, tutor2_email
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      ON CONFLICT (personal_id) DO UPDATE SET
        sexe = EXCLUDED.sexe,
        data_naixement = EXCLUDED.data_naixement,
        municipi_naixement = EXCLUDED.municipi_naixement,
        nacionalitat = EXCLUDED.nacionalitat,
        adreca = EXCLUDED.adreca,
        municipi_residencia = EXCLUDED.municipi_residencia,
        codi_postal = EXCLUDED.codi_postal,
        doc_identitat = EXCLUDED.doc_identitat,
        tis = EXCLUDED.tis,
        ralc = EXCLUDED.ralc,
        link_fotografia = EXCLUDED.link_fotografia,
        tutor_personal_nom = EXCLUDED.tutor_personal_nom,
        tutor_personal_email = EXCLUDED.tutor_personal_email,
        tutor1_nom = EXCLUDED.tutor1_nom,
        tutor1_tel = EXCLUDED.tutor1_tel,
        tutor1_email = EXCLUDED.tutor1_email,
        tutor2_nom = EXCLUDED.tutor2_nom,
        tutor2_tel = EXCLUDED.tutor2_tel,
        tutor2_email = EXCLUDED.tutor2_email,
        updated_at = NOW()
    `, [
      personal_id, sexe, data_naixement, municipi_naixement, nacionalitat,
      adreca, municipi_residencia, codi_postal, doc_identitat, tis, ralc,
      link_fotografia, tutor_personal_nom, tutor_personal_email, tutor1_nom, 
      tutor1_tel, tutor1_email, tutor2_nom, tutor2_tel, tutor2_email
    ]);

    // Actualizar referencia en tabla alumnes y email si es diferente
    await query(
      'UPDATE alumnes SET personal_id = $1, email = $2 WHERE alumne_id = $3',
      [personal_id, alumne_email, alumneId]
    );

    res.json({ 
      success: true, 
      message: 'Datos personales importados correctamente',
      alumne_id: alumneId,
      personal_id: personal_id
    });

  } catch (error: any) {
    console.error('Error importando datos personales:', error);
    res.status(500).json({ error: 'Error importando datos personales' });
  }
});

// GET /dades-personals/:alumneId - Obtener datos personales de un alumno
router.get('/:alumneId', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { alumneId } = req.params;
    const anyCurs = req.query.anyCurs as string || '2025-2026';

    // Verificar que el usuario tiene acceso al alumno
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    let accessQuery = '';
    let queryParams: any[] = [alumneId, anyCurs];

    if (user.role === 'admin') {
      // Los administradores pueden ver todos los alumnos
      accessQuery = '';
    } else {
      // Los tutores solo pueden ver sus alumnos
      accessQuery = `AND ta.tutor_email = $3`;
      queryParams.push(user.email);
    }

    const result = await query(`
      SELECT 
        a.alumne_id,
        a.nom as alumne_nom,
        a.email as alumne_email,
        pf.*,
        g.nom as grup_nom,
        g.curs,
        ta.tutor_email,
        pf.tutor_personal_nom,
        pf.tutor_personal_email
      FROM alumnes a
      LEFT JOIN pf ON a.personal_id = pf.personal_id
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = $2
      JOIN grups g ON ac.grup_id = g.grup_id
      LEFT JOIN tutories_alumne ta ON a.alumne_id = ta.alumne_id AND ta.any_curs = $2
      WHERE a.alumne_id = $1 ${accessQuery}
    `, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alumne no trobat o sense accés' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error obtenint dades personals:', error);
    res.status(500).json({ error: 'Error obtenint dades personals' });
  }
});

// GET /dades-personals/:alumneId/entrevistes - Obtener historial de entrevistas
router.get('/:alumneId/entrevistes', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { alumneId } = req.params;
    const anyCursActual = req.query.anyCurs as string || '2025-2026';

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Para tutores, verificar acceso al alumno (en cualquier año)
    if (user.role !== 'admin') {
      const accessCheck = await query(`
        SELECT 1 FROM tutories_alumne
        WHERE alumne_id = $1 AND tutor_email = $2
      `, [alumneId, user.email]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tens accés a aquest alumne' });
      }
    }

    // Obtener TODAS las entrevistas de TODOS los cursos (limitadas a 100 más recientes)
    // Combinar entrevistes normals + consolidades
    const result = await query(`
      SELECT
        e.id,
        e.any_curs,
        e.data,
        e.acords,
        e.usuari_creador_id,
        e.created_at,
        CASE WHEN e.any_curs = $2 THEN true ELSE false END as es_curs_actual,
        NULL as pestana_origen,
        NULL as curso_origen
      FROM entrevistes e
      WHERE e.alumne_id = $1

      UNION ALL

      SELECT
        ec.id,
        ec.any_curs,
        ec.data_entrevista as data,
        ec.acords,
        ec.usuari_creador_id,
        ec.created_at,
        CASE WHEN ec.any_curs = $2 THEN true ELSE false END as es_curs_actual,
        ec.pestana_origen,
        ec.curso_origen
      FROM entrevistes_consolidadas ec
      WHERE ec.alumne_id = $1

      ORDER BY data DESC, created_at DESC
      LIMIT 100
    `, [alumneId, anyCursActual]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint historial entrevistes:', error);
    res.status(500).json({ error: 'Error obtenint historial entrevistes' });
  }
});

// GET /dades-personals/:alumneId/cites - Obtener citas de calendario
router.get('/:alumneId/cites', requireAuth(), async (req: Request, res: Response) => {
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
    console.error('Error obtenint cites calendari:', error);
    res.status(500).json({ error: 'Error obtenint cites calendari' });
  }
});

// POST /dades-personals/:alumneId/cites - Crear nueva cita
router.post('/:alumneId/cites', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { alumneId } = req.params;
    const anyCurs = req.query.anyCurs as string || '2025-2026';
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Validar datos de entrada
    const validatedData = CitaCalendariSchema.parse({
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

    // Insertar cita
    const result = await query(`
      INSERT INTO cites_calendari (
        id, alumne_id, tutor_email, any_curs, data_cita, durada_minuts,
        nom_familia, email_familia, telefon_familia, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      citaId,
      alumneId,
      user.email,
      anyCurs,
      validatedData.data_cita,
      validatedData.durada_minuts,
      validatedData.nom_familia,
      validatedData.email_familia,
      validatedData.telefon_familia,
      validatedData.notes || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dades invàlides', details: error.errors });
    }
    console.error('Error creant cita:', error);
    res.status(500).json({ error: 'Error creant cita' });
  }
});

// PUT /dades-personals/cites/:citaId/confirmar - Confirmar cita y crear entrevista automáticamente
router.put('/cites/:citaId/confirmar', requireAuth(), async (req: Request, res: Response) => {
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

    // Verificar acceso (solo el tutor o admin puede confirmar)
    if (user.role === 'docent' && cita.tutor_email !== user.email) {
      return res.status(403).json({ error: 'No tens permisos per confirmar aquesta cita' });
    }

    // Actualizar estado de la cita a confirmada
    await query(`
      UPDATE cites_calendari 
      SET estat = 'confirmada', updated_at = NOW()
      WHERE id = $1
    `, [citaId]);

    // Crear entrevista automáticamente
    const entrevistaId = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entrevistaResult = await query(`
      INSERT INTO entrevistes (
        id, alumne_id, any_curs, data, acords, usuari_creador_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      entrevistaId,
      cita.alumne_id,
      cita.any_curs,
      cita.data_cita,
      `Entrevista programada amb ${cita.nom_familia} (${cita.email_familia}). Telèfon: ${cita.telefon_familia}.${cita.notes ? ' Notes: ' + cita.notes : ''}`,
      user.email
    ]);

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

// GET /dades-personals/programador/:tutorEmail - Obtener horarios disponibles del tutor
router.get('/programador/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { tutorEmail } = req.params;
    const { fecha } = req.query;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Solo el tutor o admin puede ver sus horarios
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquests horaris' });
    }

    const fechaConsulta = fecha as string || new Date().toISOString().split('T')[0];

    // Obtener horarios ocupados del tutor
    const horariosOcupados = await query(`
      SELECT data_cita, durada_minuts
      FROM cites_calendari 
      WHERE tutor_email = $1 
      AND DATE(data_cita) = $2
      AND estat IN ('pendent', 'confirmada')
      ORDER BY data_cita
    `, [tutorEmail, fechaConsulta]);

    // Obtener horarios configurados para esta fecha
    const horariosConfigurados = await query(`
      SELECT dia_semana, hora_inicio, hora_fin
      FROM horarios_tutor 
      WHERE tutor_email = $1 
      AND fecha_inicio <= $2 
      AND fecha_fin >= $2
      AND activo = true
    `, [tutorEmail, fechaConsulta]);

    // Generar horarios disponibles basados en la configuración
    const horariosDisponibles = [];
    
    if (horariosConfigurados.rows.length > 0) {
      // Usar horarios configurados
      for (const config of horariosConfigurados.rows) {
        const diaSemana = new Date(fechaConsulta).getDay(); // 0=domingo, 1=lunes, etc.
        const diaConfig = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][diaSemana];
        
        if (config.dia_semana === diaConfig) {
          const [horaInicio, minutoInicio] = config.hora_inicio.split(':').map(Number);
          const [horaFin, minutoFin] = config.hora_fin.split(':').map(Number);
          
          const inicioMinutos = horaInicio * 60 + minutoInicio;
          const finMinutos = horaFin * 60 + minutoFin;
          const duracionSlot = 30; // 30 minutos por slot
          
          for (let minutos = inicioMinutos; minutos < finMinutos; minutos += duracionSlot) {
            const hora = Math.floor(minutos / 60);
            const minuto = minutos % 60;
            const horaSlot = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
            const fechaHora = new Date(`${fechaConsulta}T${horaSlot}:00`);
            
            // Verificar si este horario está ocupado
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
      }
    } else {
      // Horarios por defecto (9:00 a 17:00, cada 30 minutos)
      const horaInicio = 9;
      const horaFin = 17;
      const duracionSlot = 30;

      for (let hora = horaInicio; hora < horaFin; hora++) {
        for (let minuto = 0; minuto < 60; minuto += duracionSlot) {
          const horaSlot = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
          const fechaHora = new Date(`${fechaConsulta}T${horaSlot}:00`);
          
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

// POST /dades-personals/programador/configurar - Configurar horarios del tutor
router.post('/programador/configurar', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { tutorEmail, fechaInicio, fechaFin, horarios } = req.body;

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per configurar aquests horaris' });
    }

    // Validar datos
    if (!fechaInicio || !fechaFin || !horarios || !Array.isArray(horarios)) {
      return res.status(400).json({ error: 'Dades de configuració incompletes' });
    }

    // Eliminar horarios existentes para este tutor en este rango
    await query(`
      DELETE FROM horarios_tutor 
      WHERE tutor_email = $1 
      AND fecha_inicio <= $2 
      AND fecha_fin >= $3
    `, [tutorEmail, fechaFin, fechaInicio]);

    // Insertar nuevos horarios
    const horariosActivos = horarios.filter(h => h.activo);
    
    for (const horario of horariosActivos) {
      await query(`
        INSERT INTO horarios_tutor (
          tutor_email, dia_semana, hora_inicio, hora_fin, 
          fecha_inicio, fecha_fin, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
      `, [
        tutorEmail,
        horario.dia,
        horario.inicio,
        horario.fin,
        fechaInicio,
        fechaFin
      ]);
    }

    res.json({
      message: 'Horaris configurats correctament',
      total_horarios: horariosActivos.length,
      periodo: `${fechaInicio} - ${fechaFin}`
    });

  } catch (error: any) {
    console.error('Error configurant horaris:', error);
    res.status(500).json({ error: 'Error configurant horaris' });
  }
});

// POST /dades-personals/programador/reservar - Reservar horario desde el programador
router.post('/programador/reservar', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { tutorEmail, alumneId, fecha, hora, durada_minuts, nom_familia, email_familia, telefon_familia, notes } = req.body;

    // Verificar que el tutor tiene acceso al alumno
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per reservar per aquest tutor' });
    }

    // Verificar acceso al alumno
    if (user.role === 'docent') {
      const accessCheck = await query(`
        SELECT 1 FROM tutories_alumne 
        WHERE alumne_id = $1 AND tutor_email = $2 AND any_curs = '2025-2026'
      `, [alumneId, user.email]);

      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'No tens accés a aquest alumne' });
      }
    }

    // Crear fecha completa
    const dataCita = new Date(`${fecha}T${hora}:00`);
    const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insertar cita
    const result = await query(`
      INSERT INTO cites_calendari (
        id, alumne_id, tutor_email, any_curs, data_cita, durada_minuts,
        nom_familia, email_familia, telefon_familia, notes, estat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendent')
      RETURNING *
    `, [
      citaId,
      alumneId,
      tutorEmail,
      '2025-2026',
      dataCita,
      durada_minuts || 30,
      nom_familia,
      email_familia,
      telefon_familia,
      notes || null
    ]);

    // Integrar con Google Calendar API
    try {
      const fechaFin = new Date(dataCita);
      fechaFin.setMinutes(fechaFin.getMinutes() + (durada_minuts || 30));

      // Verificar conflictos en el calendario del tutor antes de crear el evento
      const hasConflicts = await googleCalendarService.checkConflicts(
        dataCita,
        fechaFin,
        tutorEmail
      );
      if (hasConflicts) {
        return res.status(409).json({
          error: 'Conflicto de horario detectado. Por favor, selecciona otro horario.'
        });
      }

      // Crear evento en Google Calendar del tutor
      const googleEvent = await googleCalendarService.createEvent({
        title: `Cita con ${nom_familia}`,
        description: `Cita programada con ${nom_familia} (${email_familia}). Teléfono: ${telefon_familia}.${notes ? ' Notas: ' + notes : ''}`,
        startTime: dataCita,
        endTime: fechaFin,
        attendees: [
          { email: tutorEmail, name: 'Tutor' },
          { email: email_familia, name: nom_familia }
        ],
        location: 'Centro Educativo',
        ownerEmail: tutorEmail // El evento se crea en el calendario del tutor
      });
      
      // Guardar en BD local con referencia a Google Calendar
      await query(`
        INSERT INTO eventos_calendario (
          tutor_email, alumne_id, google_event_id, titulo, descripcion, 
          fecha_inicio, fecha_fin, estado, datos_familia
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        tutorEmail,
        alumneId,
        googleEvent.googleEventId,
        `Cita con ${nom_familia}`,
        `Cita programada con ${nom_familia} (${email_familia}). Teléfono: ${telefon_familia}.${notes ? ' Notas: ' + notes : ''}`,
        dataCita.toISOString(),
        fechaFin.toISOString(),
        'reservado',
        JSON.stringify({ nom_familia, email_familia, telefon_familia, notes })
      ]);
      
      console.log(`✅ Cita ${citaId} creada y sincronizada con Google Calendar: ${googleEvent.googleEventId}`);
      
      // Enviar notificación por email
      try {
        await emailService.sendCitaNotification({
          tutorEmail: tutorEmail,
          familiaEmail: email_familia,
          familiaNombre: nom_familia,
          fecha: fecha,
          hora: hora,
          duracion: durada_minuts || 30,
          notas: notes,
          tipo: 'nueva'
        });
        console.log(`📧 Notificación enviada a ${email_familia}`);
      } catch (emailError: any) {
        console.error('❌ Error enviando notificación por email:', emailError);
        // No fallar la operación principal si hay error con email
      }
    } catch (calendarError: any) {
      console.error('❌ Error creando evento en Google Calendar:', calendarError);
      // Crear solo en BD local si hay error con Google Calendar
      try {
        const fechaFin = new Date(dataCita);
        fechaFin.setMinutes(fechaFin.getMinutes() + (durada_minuts || 30));
        
        await query(`
          INSERT INTO eventos_calendario (
            tutor_email, alumne_id, titulo, descripcion, 
            fecha_inicio, fecha_fin, estado, datos_familia
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          tutorEmail,
          alumneId,
          `Cita con ${nom_familia}`,
          `Cita programada con ${nom_familia} (${email_familia}). Teléfono: ${telefon_familia}.${notes ? ' Notas: ' + notes : ''}`,
          dataCita.toISOString(),
          fechaFin.toISOString(),
          'reservado',
          JSON.stringify({ nom_familia, email_familia, telefon_familia, notes })
        ]);
        
        console.log(`⚠️ Cita ${citaId} creada solo en BD local (Google Calendar no disponible)`);
      } catch (localError: any) {
        console.error('❌ Error creando evento en BD local:', localError);
      }
    }

    res.status(201).json({
      cita: result.rows[0],
      message: 'Horari reservat correctament'
    });

  } catch (error: any) {
    console.error('Error reservant horari:', error);
    res.status(500).json({ error: 'Error reservant horari' });
  }
});

// GET /dades-personals/tutor/:tutorEmail/alumnes - Obtener alumnos del tutor
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

    // Obtener alumnos del tutor con datos de contacto
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

// POST /dades-personals/solicituts-canvi - Crear solicitud de cambio de datos
router.post('/solicituts-canvi', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role === 'admin') {
      return res.status(403).json({ error: 'Només els tutors poden crear sol·licituds' });
    }

    const validatedData = SolicitutCanviSchema.parse(req.body);

    // Verificar que el tutor tiene acceso al alumno
    const accessCheck = await query(`
      SELECT 1 FROM tutories_alumne 
      WHERE alumne_id = $1 AND tutor_email = $2 AND any_curs = $3
    `, [validatedData.alumne_id, user.email, '2025-2026']);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'No tens accés a aquest alumne' });
    }

    // Generar ID único
    const solicitutId = `sol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insertar solicitud
    const result = await query(`
      INSERT INTO solicituts_canvi_dades (
        id, alumne_id, tutor_solicitant, camp_modificar, 
        valor_actual, valor_nou, justificacio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      solicitutId,
      validatedData.alumne_id,
      user.email,
      validatedData.camp_modificar,
      validatedData.valor_actual || null,
      validatedData.valor_nou,
      validatedData.justificacio
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dades invàlides', details: error.errors });
    }
    console.error('Error creant sol·licitud:', error);
    res.status(500).json({ error: 'Error creant sol·licitud' });
  }
});

// GET /dades-personals/solicituts-canvi - Obtener solicitudes (solo admin)
router.get('/solicituts-canvi', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        sc.*,
        a.nom as alumne_nom,
        u.email as tutor_email
      FROM solicituts_canvi_dades sc
      JOIN alumnes a ON sc.alumne_id = a.alumne_id
      JOIN usuaris u ON sc.tutor_solicitant = u.email
      ORDER BY sc.created_at DESC
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint sol·licituds:', error);
    res.status(500).json({ error: 'Error obtenint sol·licituds' });
  }
});

// PUT /dades-personals/solicituts-canvi/:id - Resolver solicitud (solo admin)
router.put('/solicituts-canvi/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estat, notes_admin } = req.body;
    const user = req.user;

    if (!['aprovada', 'rebutjada'].includes(estat)) {
      return res.status(400).json({ error: 'Estat invàlid' });
    }

    // Actualizar solicitud
    const result = await query(`
      UPDATE solicituts_canvi_dades 
      SET estat = $1, admin_responsable = $2, data_resolucio = NOW(), notes_admin = $3
      WHERE id = $4
      RETURNING *
    `, [estat, user?.email, notes_admin || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sol·licitud no trobada' });
    }

    // Si se aprueba, aplicar el cambio (esto se puede expandir según el campo)
    if (estat === 'aprovada') {
      const solicitut = result.rows[0];
      // Aquí se implementaría la lógica para aplicar el cambio según el campo
      console.log(`Aplicant canvi: ${solicitut.camp_modificar} = ${solicitut.valor_nou}`);
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error resolent sol·licitud:', error);
    res.status(500).json({ error: 'Error resolent sol·licitud' });
  }
});

// DELETE /dades-personals/:alumneId - Eliminar alumno (solo admin)
router.delete('/:alumneId', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { alumneId } = req.params;

    // Eliminar en cascada (las foreign keys se encargan del resto)
    const result = await query(`
      DELETE FROM alumnes WHERE alumne_id = $1 RETURNING *
    `, [alumneId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alumne no trobat' });
    }

    res.json({ message: 'Alumne eliminat correctament' });
  } catch (error: any) {
    console.error('Error eliminant alumne:', error);
    res.status(500).json({ error: 'Error eliminant alumne' });
  }
});

// GET /dades-personals/export/csv - Exportar datos a CSV (solo admin)
router.get('/export/csv', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const anyCurs = req.query.anyCurs as string || '2025-2026';

    const result = await query(`
      SELECT 
        a.alumne_id,
        a.nom as alumne_nom,
        a.email as alumne_email,
        pf.sexe,
        pf.data_naixement,
        pf.municipi_naixement,
        pf.nacionalitat,
        pf.adreca,
        pf.municipi_residencia,
        pf.codi_postal,
        pf.doc_identitat,
        pf.tis,
        pf.ralc,
        pf.tutor1_nom,
        pf.tutor1_tel,
        pf.tutor1_email,
        pf.tutor2_nom,
        pf.tutor2_tel,
        pf.tutor2_email,
        g.nom as grup_nom,
        g.curs,
        ta.tutor_email
      FROM alumnes a
      LEFT JOIN pf ON a.personal_id = pf.personal_id
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = $1
      JOIN grups g ON ac.grup_id = g.grup_id
      LEFT JOIN tutories_alumne ta ON a.alumne_id = ta.alumne_id AND ta.any_curs = $1
      ORDER BY g.curs, g.nom, a.nom
    `, [anyCurs]);

    // Generar CSV
    const headers = [
      'ID', 'Nom', 'Email', 'Sexe', 'Data Naixement', 'Municipi Naixement', 'Nacionalitat',
      'Adreça', 'Municipi Residència', 'Codi Postal', 'Doc Identitat', 'TIS', 'RALC',
      'Tutor 1 Nom', 'Tutor 1 Tel', 'Tutor 1 Email', 'Tutor 2 Nom', 'Tutor 2 Tel', 'Tutor 2 Email',
      'Grup', 'Curs', 'Tutor Personal'
    ];

    const csvRows = [
      headers.join(','),
      ...result.rows.map(row => 
        headers.map(header => {
          const value = row[header.toLowerCase().replace(/\s+/g, '_')] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dades_personals_${anyCurs}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exportant dades:', error);
    res.status(500).json({ error: 'Error exportant dades' });
  }
});

// ========= FUNCIONES AUXILIARES =========

// Función para generar slots de tiempo
function generarSlotsTiempo(horaInicio: string, horaFin: string, duracionMinutos: number): string[] {
  const slots: string[] = [];
  const [horaIni, minIni] = horaInicio.split(':').map(Number);
  const [horaFinNum, minFin] = horaFin.split(':').map(Number);
  
  const inicioMinutos = horaIni * 60 + minIni;
  const finMinutos = horaFinNum * 60 + minFin;
  
  for (let minutos = inicioMinutos; minutos < finMinutos; minutos += duracionMinutos) {
    const hora = Math.floor(minutos / 60);
    const minuto = minutos % 60;
    const slot = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
    slots.push(slot);
  }
  
  return slots;
}

// ========= NUEVOS ENDPOINTS PARA CONFIGURACIÓN DINÁMICA =========

// POST /dades-personals/configuracion-horarios - Crear nueva configuración de horarios
router.post('/configuracion-horarios', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { tutor_email, nombre, fecha_inicio, fecha_fin, duracion_cita, dias_semana } = req.body;

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutor_email) {
      return res.status(403).json({ error: 'No tens permisos per configurar aquests horaris' });
    }

    // Validar datos
    if (!tutor_email || !nombre || !fecha_inicio || !fecha_fin || !dias_semana) {
      return res.status(400).json({ error: 'Dades de configuració incompletes' });
    }

    // Normalizar fechas (convertir de ISO a yyyy-MM-dd)
    const normalizarFecha = (fecha: string): string => {
      if (!fecha) return fecha;
      // Si ya está en formato yyyy-MM-dd, devolverlo tal como está
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
      }
      // Si es formato ISO, extraer solo la parte de la fecha
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) {
        throw new Error('Formato de fecha inválido');
      }
      return fechaObj.toISOString().split('T')[0];
    };

    const fechaInicioNormalizada = normalizarFecha(fecha_inicio);
    const fechaFinNormalizada = normalizarFecha(fecha_fin);

    // Crear la tabla si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS configuracion_horarios_tutor (
        id SERIAL PRIMARY KEY,
        tutor_email VARCHAR(255) NOT NULL,
        nombre_configuracion VARCHAR(255) NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        duracion_cita INTEGER DEFAULT 30,
        dias_semana JSONB NOT NULL,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insertar nueva configuración
    const result = await query(`
      INSERT INTO configuracion_horarios_tutor (
        tutor_email, nombre_configuracion, fecha_inicio, fecha_fin, 
        duracion_cita, dias_semana
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [tutor_email, nombre, fechaInicioNormalizada, fechaFinNormalizada, duracion_cita, JSON.stringify(dias_semana)]);

    res.json({
      message: 'Configuració creada correctament',
      configuracion_id: result.rows[0].id
    });

  } catch (error: any) {
    console.error('Error creant configuració:', error);
    res.status(500).json({ error: 'Error creant configuració' });
  }
});

// GET /dades-personals/configuracion-horarios/:tutorEmail - Obtener configuraciones de un tutor
router.get('/configuracion-horarios/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.params.tutorEmail;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquestes configuracions' });
    }

    // Verificar si la tabla existe, si no, devolver array vacío
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'configuracion_horarios_tutor'
      );
    `);

    if (!tableExists.rows[0].exists) {
      return res.json([]);
    }

    const result = await query(`
      SELECT id, nombre_configuracion, fecha_inicio, fecha_fin, 
             duracion_cita, dias_semana, activo, created_at
      FROM configuracion_horarios_tutor 
      WHERE tutor_email = $1 
      ORDER BY created_at DESC
    `, [tutorEmail]);

    // Parsear JSON de días de semana
    const configuraciones = result.rows.map(row => ({
      ...row,
      dias_semana: typeof row.dias_semana === 'string' ? JSON.parse(row.dias_semana) : row.dias_semana
    }));

    res.json(configuraciones);
  } catch (error: any) {
    console.error('Error obtenint configuracions:', error);
    res.status(500).json({ error: 'Error obtenint configuracions' });
  }
});

// POST /dades-personals/generar-eventos - Generar eventos en Google Calendar
router.post('/generar-eventos', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { tutorEmail, configuracionId } = req.body;

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per generar events' });
    }

    // Obtener configuración
    const configResult = await query(`
      SELECT * FROM configuracion_horarios_tutor 
      WHERE id = $1 AND tutor_email = $2 AND activo = true
    `, [configuracionId, tutorEmail]);

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'Configuració no trobada' });
    }

    const config = configResult.rows[0];
    const diasSemana = JSON.parse(config.dias_semana);
    const fechaInicio = new Date(config.fecha_inicio);
    const fechaFin = new Date(config.fecha_fin);
    const duracionCita = config.duracion_cita;

    // Generar eventos para cada día en el rango
    const eventosGenerados = [];
    const currentDate = new Date(fechaInicio);

    while (currentDate <= fechaFin) {
      const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][currentDate.getDay()];
      const configuracionDia = diasSemana.find((d: any) => d.dia === diaSemana && d.activo);

      if (configuracionDia) {
        const horaInicio = configuracionDia.inicio;
        const horaFin = configuracionDia.fin;
        
        // Generar slots de tiempo
        const slots = generarSlotsTiempo(horaInicio, horaFin, duracionCita);
        
        for (const slot of slots) {
          const fechaInicioEvento = new Date(currentDate);
          const [hora, minuto] = slot.split(':');
          fechaInicioEvento.setHours(parseInt(hora), parseInt(minuto), 0, 0);
          
          const fechaFinEvento = new Date(fechaInicioEvento);
          fechaFinEvento.setMinutes(fechaFinEvento.getMinutes() + duracionCita);

          // Crear evento en la base de datos
          const eventoResult = await query(`
            INSERT INTO eventos_calendario (
              tutor_email, titulo, descripcion, fecha_inicio, fecha_fin, estado
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `, [
            tutorEmail,
            `Cita disponible - ${slot}`,
            `Slot de ${duracionCita} minutos disponible para cita`,
            fechaInicioEvento.toISOString(),
            fechaFinEvento.toISOString(),
            'disponible'
          ]);

          eventosGenerados.push({
            id: eventoResult.rows[0].id,
            fecha: currentDate.toISOString().split('T')[0],
            hora: slot,
            duracion: duracionCita
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      message: 'Events generats correctament',
      total_eventos: eventosGenerados.length,
      eventos: eventosGenerados
    });

  } catch (error: any) {
    console.error('Error generant events:', error);
    res.status(500).json({ error: 'Error generant events' });
  }
});

// GET /dades-personals/eventos-calendario/:tutorEmail - Obtener eventos de calendario
router.get('/eventos-calendario/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.params.tutorEmail;
    const { fecha_inicio, fecha_fin } = req.query;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquests events' });
    }

    let querySql = `
      SELECT * FROM eventos_calendario 
      WHERE tutor_email = $1
    `;
    const params = [tutorEmail];

    if (fecha_inicio) {
      querySql += ` AND fecha_inicio >= $${params.length + 1}`;
      params.push(fecha_inicio as string);
    }
    if (fecha_fin) {
      querySql += ` AND fecha_inicio <= $${params.length + 1}`;
      params.push(fecha_fin as string);
    }

    querySql += ` ORDER BY fecha_inicio ASC`;

    const result = await query(querySql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint events:', error);
    res.status(500).json({ error: 'Error obtenint events' });
  }
});

// POST /dades-personals/replicar-configuracion - Replicar configuración de un día a otros
router.post('/replicar-configuracion', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { tutorEmail, diaOrigen, diasDestino, configuracionId } = req.body;

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per modificar aquesta configuració' });
    }

    // Obtener configuración actual
    const configResult = await query(`
      SELECT * FROM configuracion_horarios_tutor 
      WHERE id = $1 AND tutor_email = $2
    `, [configuracionId, tutorEmail]);

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'Configuració no trobada' });
    }

    const config = configResult.rows[0];
    const diasSemana = JSON.parse(config.dias_semana);

    // Encontrar configuración del día origen
    const configuracionOrigen = diasSemana.find((d: any) => d.dia === diaOrigen);
    if (!configuracionOrigen) {
      return res.status(400).json({ error: 'Dia origen no trobat en la configuració' });
    }

    // Replicar configuración a días destino
    for (const diaDestino of diasDestino) {
      const indexDestino = diasSemana.findIndex((d: any) => d.dia === diaDestino);
      if (indexDestino !== -1) {
        diasSemana[indexDestino] = {
          ...configuracionOrigen,
          dia: diaDestino
        };
      }
    }

    // Actualizar configuración
    await query(`
      UPDATE configuracion_horarios_tutor 
      SET dias_semana = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(diasSemana), configuracionId]);

    res.json({
      message: 'Configuració replicada correctament',
      dias_actualizados: diasDestino
    });

  } catch (error: any) {
    console.error('Error replicant configuració:', error);
    res.status(500).json({ error: 'Error replicant configuració' });
  }
});


// GET /dades-personals/horarios-tutor/:tutorEmail - Obtener horarios específicos del tutor
router.get('/horarios-tutor/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.params.tutorEmail;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquests horaris' });
    }

    // La tabla horarios_tutor ya existe en el schema
    const result = await query(`
      SELECT dia_semana, hora_inicio, hora_fin, activo
      FROM horarios_tutor 
      WHERE tutor_email = $1 
      ORDER BY dia_semana, hora_inicio
    `, [tutorEmail]);

    res.json({
      horarios: result.rows,
      total: result.rows.length
    });

  } catch (error: any) {
    console.error('Error obtenint horarios del tutor:', error);
    res.status(500).json({ error: 'Error obtenint horarios del tutor' });
  }
});

// GET /dades-personals/cites-calendari/:tutorEmail - Obtener citas del calendario
router.get('/cites-calendari/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.params.tutorEmail;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquestes cites' });
    }

    // Crear la tabla si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS cites_calendari (
        id VARCHAR(255) PRIMARY KEY,
        alumne_id VARCHAR(255),
        tutor_email VARCHAR(255) NOT NULL,
        any_curs VARCHAR(20) NOT NULL,
        data_cita TIMESTAMP NOT NULL,
        durada_minuts INTEGER DEFAULT 30,
        nom_familia VARCHAR(255) NOT NULL,
        email_familia VARCHAR(255) NOT NULL,
        telefon_familia VARCHAR(50),
        notes TEXT,
        estat VARCHAR(50) DEFAULT 'pendent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await query(`
      SELECT id, alumne_id, data_cita, durada_minuts, nom_familia, 
             email_familia, telefon_familia, notes, estat, created_at
      FROM cites_calendari 
      WHERE tutor_email = $1 
      ORDER BY data_cita DESC
    `, [tutorEmail]);

    res.json({
      cites: result.rows,
      total: result.rows.length
    });

  } catch (error: any) {
    console.error('Error obtenint cites del calendari:', error);
    res.status(500).json({ error: 'Error obtenint cites del calendari' });
  }
});

// GET /dades-personals/borradores-entrevista/:tutorEmail - Obtener borradores de entrevistas
router.get('/borradores-entrevista/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.params.tutorEmail;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquests borradors' });
    }

    // Crear la tabla si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS borradores_entrevista (
        id SERIAL PRIMARY KEY,
        cita_id VARCHAR(255) NOT NULL,
        alumne_id VARCHAR(255) NOT NULL,
        tutor_email VARCHAR(255) NOT NULL,
        fecha_entrevista TIMESTAMP NOT NULL,
        observaciones TEXT,
        puntos_tratados TEXT,
        acuerdos TEXT,
        seguimiento TEXT,
        estado VARCHAR(50) DEFAULT 'borrador',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await query(`
      SELECT be.id, be.cita_id, be.alumne_id, be.fecha_entrevista, 
             be.observaciones, be.puntos_tratados, be.acuerdos, 
             be.seguimiento, be.estado, be.created_at,
             cc.nom_familia, cc.email_familia
      FROM borradores_entrevista be
      LEFT JOIN cites_calendari cc ON be.cita_id = cc.id
      WHERE be.tutor_email = $1 
      ORDER BY be.fecha_entrevista DESC
    `, [tutorEmail]);

    res.json({
      borradores: result.rows,
      total: result.rows.length
    });

  } catch (error: any) {
    console.error('Error obtenint borradors d\'entrevista:', error);
    res.status(500).json({ error: 'Error obtenint borradors d\'entrevista' });
  }
});

// POST /dades-personals/borradores-entrevista - Crear borrador de entrevista
router.post('/borradores-entrevista', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { cita_id, alumne_id, tutor_email, fecha_entrevista, observaciones, puntos_tratados, acuerdos, seguimiento } = req.body;

    // Validar datos requeridos
    if (!cita_id || !alumne_id || !tutor_email || !fecha_entrevista) {
      return res.status(400).json({ error: 'Falten dades obligatòries' });
    }

    // Verificar permisos
    if (user.role === 'docent' && user.email !== tutor_email) {
      return res.status(403).json({ error: 'No tens permisos per crear aquest borrador' });
    }

    const result = await query(`
      INSERT INTO borradores_entrevista (
        cita_id, alumne_id, tutor_email, fecha_entrevista, 
        observaciones, puntos_tratados, acuerdos, seguimiento
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [cita_id, alumne_id, tutor_email, fecha_entrevista, observaciones, puntos_tratados, acuerdos, seguimiento]);

    res.status(201).json({
      message: 'Borrador creat correctament',
      borrador: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error creant borrador:', error);
    res.status(500).json({ error: 'Error creant borrador' });
  }
});

// PUT /dades-personals/borradores-entrevista/:id - Actualizar borrador de entrevista
router.put('/borradores-entrevista/:id', requireAuth(), async (req: Request, res: Response) => {
  try {
    const borradorId = req.params.id;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const { observaciones, puntos_tratados, acuerdos, seguimiento, estado } = req.body;

    // Verificar que el borrador existe y pertenece al usuario
    const borradorResult = await query(`
      SELECT * FROM borradores_entrevista WHERE id = $1
    `, [borradorId]);

    if (borradorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Borrador no trobat' });
    }

    const borrador = borradorResult.rows[0];

    // Verificar permisos
    if (user.role === 'docent' && user.email !== borrador.tutor_email) {
      return res.status(403).json({ error: 'No tens permisos per actualitzar aquest borrador' });
    }

    const result = await query(`
      UPDATE borradores_entrevista 
      SET observaciones = $1, puntos_tratados = $2, acuerdos = $3, 
          seguimiento = $4, estado = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [observaciones, puntos_tratados, acuerdos, seguimiento, estado || 'borrador', borradorId]);

    res.json({
      message: 'Borrador actualitzat correctament',
      borrador: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error actualitzant borrador:', error);
    res.status(500).json({ error: 'Error actualitzant borrador' });
  }
});

export default router;
