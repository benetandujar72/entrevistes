import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Esquemas de validación
const EmailMasivoSchema = z.object({
  tutor_email: z.string().email(),
  alumne_ids: z.array(z.string()),
  plantilla_id: z.string(),
  asunto: z.string().min(1),
  contingut: z.string().min(1),
  variables: z.record(z.string()).optional()
});

const PlantillaSchema = z.object({
  nom: z.string().min(1),
  contingut: z.string().min(1),
  variables: z.array(z.string()).optional()
});

// GET /emails/plantillas - Obtener plantillas disponibles
router.get('/plantillas', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Plantillas predefinidas (en un futuro se pueden cargar desde Google Drive)
    const plantillas = [
      {
        id: 'plantilla_1',
        nom: 'Recordatori d\'entrevista',
        contingut: 'Hola {{nom_familia}},\n\nT\'esperem a l\'entrevista programada per {{data_entrevista}} a les {{hora_entrevista}}.\n\nSalutacions,\n{{tutor_nom}}',
        variables: ['nom_familia', 'data_entrevista', 'hora_entrevista', 'tutor_nom']
      },
      {
        id: 'plantilla_2',
        nom: 'Informació acadèmica',
        contingut: 'Hola {{nom_familia}},\n\nVolem informar-te sobre el progrés acadèmic de {{nom_alumne}}.\n\n{{contingut_personalitzat}}\n\nSalutacions,\n{{tutor_nom}}',
        variables: ['nom_familia', 'nom_alumne', 'contingut_personalitzat', 'tutor_nom']
      },
      {
        id: 'plantilla_3',
        nom: 'Convocatòria reunió',
        contingut: 'Hola {{nom_familia}},\n\nConvoquem a una reunió per {{motiu}} el {{data_reunio}} a les {{hora_reunio}}.\n\nLloc: {{lloc}}\n\nSalutacions,\n{{tutor_nom}}',
        variables: ['nom_familia', 'motiu', 'data_reunio', 'hora_reunio', 'lloc', 'tutor_nom']
      }
    ];

    res.json(plantillas);
  } catch (error: any) {
    console.error('Error obtenint plantilles:', error);
    res.status(500).json({ error: 'Error obtenint plantilles' });
  }
});

// GET /emails/alumnes/:tutorEmail - Obtener alumnos del tutor para envío masivo
router.get('/alumnes/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { tutorEmail } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    // Solo el tutor o admin puede ver sus alumnos
    if (user.role === 'docent' && user.email !== tutorEmail) {
      return res.status(403).json({ error: 'No tens permisos per veure aquests alumnes' });
    }

    // Obtener alumnos del tutor con datos de contacto
    const result = await query(`
      SELECT 
        a.alumne_id,
        a.nom as alumne_nom,
        a.email as alumne_email,
        pf.tutor1_nom,
        pf.tutor1_email,
        pf.tutor2_nom,
        pf.tutor2_email,
        pf.tutor1_tel,
        pf.tutor2_tel
      FROM alumnes a
      LEFT JOIN pf ON a.personal_id = pf.personal_id
      JOIN tutories_alumne ta ON a.alumne_id = ta.alumne_id
      WHERE ta.tutor_email = $1 AND ta.any_curs = '2025-2026'
      ORDER BY a.nom
    `, [tutorEmail]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint alumnes:', error);
    res.status(500).json({ error: 'Error obtenint alumnes' });
  }
});

// POST /emails/enviar-masivo - Enviar emails masivos
router.post('/enviar-masivo', requireAuth(), async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticat' });
    }

    const validatedData = EmailMasivoSchema.parse(req.body);

    // Verificar que el tutor tiene acceso a los alumnos
    if (user.role === 'docent' && user.email !== validatedData.tutor_email) {
      return res.status(403).json({ error: 'No tens permisos per enviar emails per aquest tutor' });
    }

    // Obtener datos de los alumnos
    const alumnesResult = await query(`
      SELECT 
        a.alumne_id,
        a.nom as alumne_nom,
        a.email as alumne_email,
        pf.tutor1_nom,
        pf.tutor1_email,
        pf.tutor2_nom,
        pf.tutor2_email,
        pf.tutor1_tel,
        pf.tutor2_tel
      FROM alumnes a
      LEFT JOIN pf ON a.personal_id = pf.personal_id
      WHERE a.alumne_id = ANY($1)
    `, [validatedData.alumne_ids]);

    // Obtener datos del tutor
    const tutorResult = await query(`
      SELECT nom, email FROM usuaris WHERE email = $1
    `, [validatedData.tutor_email]);

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tutor no trobat' });
    }

    const tutor = tutorResult.rows[0];

    // Procesar cada alumno y enviar email
    const resultados = [];
    const emailsEnviados = [];

    for (const alumne of alumnesResult.rows) {
      try {
        // Procesar variables del email
        let contingutPersonalitzat = validatedData.contingut;
        const variables = {
          ...validatedData.variables,
          nom_alumne: alumne.alumne_nom,
          tutor_nom: tutor.nom,
          tutor_email: tutor.email
        };

        // Reemplazar variables en el contenido
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          contingutPersonalitzat = contingutPersonalitzat.replace(regex, value || '');
        }

        // Determinar destinatarios (tutores del alumno)
        const destinatarios = [];
        if (alumne.tutor1_email) {
          destinatarios.push({
            email: alumne.tutor1_email,
            nom: alumne.tutor1_nom || 'Tutor/a 1'
          });
        }
        if (alumne.tutor2_email) {
          destinatarios.push({
            email: alumne.tutor2_email,
            nom: alumne.tutor2_nom || 'Tutor/a 2'
          });
        }

        // Enviar email a cada destinatario
        for (const destinatario of destinatarios) {
          // Aquí se integraría con Gmail API
          // Por ahora simulamos el envío
          const emailData = {
            to: destinatario.email,
            subject: validatedData.asunto,
            body: contingutPersonalitzat,
            alumne: alumne.alumne_nom,
            destinatario: destinatario.nom
          };

          emailsEnviados.push(emailData);
          
          // TODO: Integrar con Gmail API para envío real
          console.log('Email simulat:', emailData);
        }

        resultados.push({
          alumne_id: alumne.alumne_id,
          alumne_nom: alumne.alumne_nom,
          emails_enviats: destinatarios.length,
          destinatarios: destinatarios.map(d => d.email)
        });

      } catch (error: any) {
        console.error(`Error processant alumne ${alumne.alumne_id}:`, error);
        resultados.push({
          alumne_id: alumne.alumne_id,
          alumne_nom: alumne.alumne_nom,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Emails processats',
      total_alumnes: alumnesResult.rows.length,
      total_emails: emailsEnviados.length,
      resultats: resultados,
      emails_enviats: emailsEnviados
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dades invàlides', details: error.errors });
    }
    console.error('Error enviant emails:', error);
    res.status(500).json({ error: 'Error enviant emails' });
  }
});

// POST /emails/plantilla - Crear nueva plantilla
router.post('/plantilla', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const validatedData = PlantillaSchema.parse(req.body);
    
    const plantillaId = `plantilla_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // En un futuro se guardaría en la base de datos o Google Drive
    const plantilla = {
      id: plantillaId,
      ...validatedData,
      creada_per: req.user?.email,
      creada_el: new Date().toISOString()
    };

    res.status(201).json(plantilla);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dades invàlides', details: error.errors });
    }
    console.error('Error creant plantilla:', error);
    res.status(500).json({ error: 'Error creant plantilla' });
  }
});

export default router;
