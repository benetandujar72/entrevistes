import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { googleCalendarService } from '../calendar/google-calendar.js';
import { emailService } from '../email/email-service.js';

const router = Router();

// GET /calendario-publico/:tutorEmail - Obtener enlace público del calendario del tutor
router.get('/:tutorEmail', async (req: Request, res: Response) => {
  try {
    const { tutorEmail } = req.params;
    
    // Verificar que el tutor existe
    const tutorResult = await query(`
      SELECT email, nom, cognoms FROM usuaris 
      WHERE email = $1 AND role = 'docent'
    `, [tutorEmail]);

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tutor no trobat' });
    }

    const tutor = tutorResult.rows[0];
    
    // Obtener horarios disponibles del tutor
    const horariosResult = await query(`
      SELECT ht.dia, ht.hora_inicio, ht.hora_fin, ht.actiu
      FROM horarios_tutor ht
      WHERE ht.tutor_email = $1 AND ht.actiu = true
      ORDER BY ht.dia, ht.hora_inicio
    `, [tutorEmail]);

    const horarios = horariosResult.rows;

    // Generar enlace de Google Calendar para reservas
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const calendarUrl = `https://calendar.google.com/calendar/appointments/schedules/${calendarId}`;
    
    // Crear página HTML para las familias
    const html = generateCalendarioPublicoHTML(tutor, horarios, calendarUrl);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error: any) {
    console.error('Error generant calendari públic:', error);
    res.status(500).json({ error: 'Error generant calendari públic' });
  }
});

// POST /calendario-publico/reservar - Reserva directa desde el calendario público
router.post('/reservar', async (req: Request, res: Response) => {
  try {
    const { 
      tutorEmail, 
      familiaNombre, 
      familiaEmail, 
      familiaTelefono, 
      fecha, 
      hora, 
      duracion = 30,
      notas = '' 
    } = req.body;

    // Validar datos requeridos
    if (!tutorEmail || !familiaNombre || !familiaEmail || !fecha || !hora) {
      return res.status(400).json({ 
        error: 'Falten dades obligatòries' 
      });
    }

    // Verificar que el tutor existe
    const tutorResult = await query(`
      SELECT email FROM usuaris 
      WHERE email = $1 AND role = 'docent'
    `, [tutorEmail]);

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tutor no trobat' });
    }

    // Crear fecha completa
    const dataCita = new Date(`${fecha}T${hora}:00`);
    const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Verificar conflictos
    const fechaFin = new Date(dataCita);
    fechaFin.setMinutes(fechaFin.getMinutes() + duracion);
    
    const hasConflicts = await googleCalendarService.checkConflicts(dataCita, fechaFin);
    if (hasConflicts) {
      return res.status(409).json({ 
        error: 'Aquest horari ja està ocupat. Si us plau, selecciona un altre horari.' 
      });
    }

    // Crear evento en Google Calendar
    const googleEvent = await googleCalendarService.createEvent({
      title: `Cita amb ${familiaNombre}`,
      description: `Cita programada amb ${familiaNombre} (${familiaEmail}). Telèfon: ${familiaTelefono}.${notas ? ' Notes: ' + notas : ''}`,
      startTime: dataCita,
      endTime: fechaFin,
      attendees: [
        { email: tutorEmail, name: 'Tutor' },
        { email: familiaEmail, name: familiaNombre }
      ],
      location: 'Centro Educativo'
    });

    // Guardar en BD local
    await query(`
      INSERT INTO cites_calendari (
        id, alumne_id, tutor_email, any_curs, data_cita, durada_minuts,
        nom_familia, email_familia, telefon_familia, notes, estat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendent')
    `, [
      citaId,
      null, // alumne_id será null para reservas directas de familias
      tutorEmail,
      '2025-2026',
      dataCita,
      duracion,
      familiaNombre,
      familiaEmail,
      familiaTelefono,
      notas
    ]);

    // Guardar evento en calendario local
    await query(`
      INSERT INTO eventos_calendario (
        tutor_email, google_event_id, titulo, descripcion, 
        fecha_inicio, fecha_fin, estado, datos_familia
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      tutorEmail,
      googleEvent.googleEventId,
      `Cita amb ${familiaNombre}`,
      `Cita programada amb ${familiaNombre} (${familiaEmail}). Telèfon: ${familiaTelefono}.${notas ? ' Notes: ' + notas : ''}`,
      dataCita.toISOString(),
      fechaFin.toISOString(),
      'reservado',
      JSON.stringify({ nom_familia: familiaNombre, email_familia: familiaEmail, telefon_familia: familiaTelefono, notes: notas })
    ]);

    // Enviar notificación por email
    try {
      await emailService.sendCitaNotification({
        tutorEmail: tutorEmail,
        familiaEmail: familiaEmail,
        familiaNombre: familiaNombre,
        fecha: fecha,
        hora: hora,
        duracion: duracion,
        notas: notas,
        tipo: 'nueva'
      });
      console.log(`📧 Notificació enviada a ${familiaEmail}`);
    } catch (emailError: any) {
      console.error('❌ Error enviant notificació:', emailError);
    }

    res.json({
      success: true,
      message: 'Cita reservada correctament',
      citaId: citaId,
      googleEventId: googleEvent.googleEventId,
      eventUrl: googleEvent.eventUrl
    });

  } catch (error: any) {
    console.error('Error reservant cita:', error);
    res.status(500).json({ error: 'Error reservant cita' });
  }
});

function generateCalendarioPublicoHTML(tutor: any, horarios: any[], calendarUrl: string): string {
  const tutorNombre = `${tutor.nom} ${tutor.cognoms}`.trim();
  
  return `
<!DOCTYPE html>
<html lang="ca">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservar Cita amb ${tutorNombre}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        .content {
            padding: 40px;
        }
        .calendar-section {
            background: #f8fafc;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            text-align: center;
        }
        .calendar-section h2 {
            color: #1e293b;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        .calendar-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 1.1rem;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            margin: 10px;
        }
        .calendar-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }
        .horarios-section {
            margin-bottom: 30px;
        }
        .horarios-section h3 {
            color: #374151;
            margin-bottom: 15px;
            font-size: 1.2rem;
        }
        .horarios-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .horario-item {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
            transition: border-color 0.3s ease;
        }
        .horario-item:hover {
            border-color: #3b82f6;
        }
        .dia {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 5px;
        }
        .hora {
            color: #64748b;
            font-size: 0.9rem;
        }
        .info-section {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .info-section h3 {
            color: #92400e;
            margin-bottom: 10px;
        }
        .info-section p {
            color: #78350f;
            line-height: 1.6;
        }
        .contact-info {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
        }
        .contact-info h3 {
            color: #0c4a6e;
            margin-bottom: 10px;
        }
        .contact-info p {
            color: #075985;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 0.9rem;
        }
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .content { padding: 20px; }
            .calendar-section { padding: 20px; }
            .horarios-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Reservar Cita</h1>
            <p>Amb ${tutorNombre}</p>
        </div>
        
        <div class="content">
            <div class="calendar-section">
                <h2>Reserva la teva cita</h2>
                <p>Fes clic al botó per accedir al calendari i reservar la teva cita:</p>
                <a href="${calendarUrl}" class="calendar-button" target="_blank">
                    📅 Obrir Calendari de Google
                </a>
            </div>

            <div class="info-section">
                <h3>ℹ️ Informació important</h3>
                <p>
                    • Les cites tenen una durada de 30 minuts<br>
                    • Rebràs una confirmació per email<br>
                    • Si necessites canviar la cita, contacta amb el tutor<br>
                    • Les cites es realitzen al centre educatiu
                </p>
            </div>

            ${horarios.length > 0 ? `
            <div class="horarios-section">
                <h3>🕐 Horaris disponibles</h3>
                <div class="horarios-grid">
                    ${horarios.map(horario => `
                        <div class="horario-item">
                            <div class="dia">${getDiaNombre(horario.dia)}</div>
                            <div class="hora">${horario.hora_inicio} - ${horario.hora_fin}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="contact-info">
                <h3>📞 Contacte</h3>
                <p>Si tens qualsevol dubte, contacta amb el tutor a: <strong>${tutor.email}</strong></p>
            </div>
        </div>
        
        <div class="footer">
            <p>Sistema de gestió d'entrevistes - Centre Educatiu</p>
        </div>
    </div>

    <script>
        // Redirigir automáticamente al calendario después de 5 segundos
        setTimeout(() => {
            if (confirm('Vols obrir el calendari de Google ara?')) {
                window.open('${calendarUrl}', '_blank');
            }
        }, 5000);
    </script>
</body>
</html>
  `;
}

function getDiaNombre(dia: string): string {
  const dias: Record<string, string> = {
    'lunes': 'Dilluns',
    'martes': 'Dimarts',
    'miercoles': 'Dimecres',
    'jueves': 'Dijous',
    'viernes': 'Divendres',
    'sabado': 'Dissabte',
    'domingo': 'Diumenge'
  };
  return dias[dia] || dia;
}

export default router;
