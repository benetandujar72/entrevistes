import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { googleCalendarService } from '../calendar/google-calendar.js';
import { emailService } from '../email/email-service.js';

const router = Router();

// GET /calendario-publico-v2/:tutorEmail - Página pública con sistema de aprobación
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
      SELECT ht.dia_semana, ht.hora_inicio, ht.hora_fin, ht.activo
      FROM horarios_tutor ht
      WHERE ht.tutor_email = $1 AND ht.activo = true
      ORDER BY ht.dia_semana, ht.hora_inicio
    `, [tutorEmail]);

    const horarios = horariosResult.rows;

    // Obtener citas pendientes de aprobación
    const citasPendientes = await query(`
      SELECT cc.*, ec.google_event_id
      FROM cites_calendari cc
      LEFT JOIN eventos_calendario ec ON cc.id = ec.cita_id
      WHERE cc.tutor_email = $1 AND cc.estat = 'pendent_aprovacio'
      ORDER BY cc.data_cita ASC
    `, [tutorEmail]);

    // Crear página HTML con sistema de aprobación
    const html = generateCalendarioConAprobacionHTML(tutor, horarios, citasPendientes.rows);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error: any) {
    console.error('Error generant calendari públic:', error);
    res.status(500).json({ error: 'Error generant calendari públic' });
  }
});

// POST /calendario-publico-v2/solicitar-cita - Solicitar cita (pendiente de aprobación)
router.post('/solicitar-cita', async (req: Request, res: Response) => {
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
      SELECT email, nom, cognoms FROM usuaris 
      WHERE email = $1 AND role = 'docent'
    `, [tutorEmail]);

    if (tutorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tutor no trobat' });
    }

    const tutor = tutorResult.rows[0];

    // Crear fecha completa
    const dataCita = new Date(`${fecha}T${hora}:00`);
    const citaId = `cita_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Verificar conflictos en el calendario del tutor
    const fechaFin = new Date(dataCita);
    fechaFin.setMinutes(fechaFin.getMinutes() + duracion);

    const hasConflicts = await googleCalendarService.checkConflicts(
      dataCita,
      fechaFin,
      tutorEmail as string
    );
    if (hasConflicts) {
      return res.status(409).json({
        error: 'Aquest horari ja està ocupat. Si us plau, selecciona un altre horari.'
      });
    }

    // Guardar solicitud en BD (PENDIENTE DE APROBACIÓN)
    await query(`
      INSERT INTO cites_calendari (
        id, alumne_id, tutor_email, any_curs, data_cita, durada_minuts,
        nom_familia, email_familia, telefon_familia, notes, estat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendent_aprovacio')
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

    // Enviar notificación al tutor para aprobación
    try {
      await emailService.sendCitaNotification({
        tutorEmail: tutorEmail,
        familiaEmail: familiaEmail,
        familiaNombre: familiaNombre,
        fecha: fecha,
        hora: hora,
        duracion: duracion,
        notas: notas,
        tipo: 'solicitud_aprobacion',
        citaId: citaId
      });
      console.log(`📧 Notificació d'aprovació enviada a ${tutorEmail}`);
    } catch (emailError: any) {
      console.error('❌ Error enviant notificació d\'aprovació:', emailError);
    }

    res.json({
      success: true,
      message: 'Solicitud de cita enviada. El tutor la revisará y te confirmará.',
      citaId: citaId,
      estado: 'pendent_aprovacio'
    });

  } catch (error: any) {
    console.error('Error sol·licitant cita:', error);
    res.status(500).json({ error: 'Error sol·licitant cita' });
  }
});

// POST /calendario-publico-v2/aprobar-cita - Aprobar cita (solo para tutores)
router.post('/aprobar-cita', async (req: Request, res: Response) => {
  try {
    const { citaId, tutorEmail, aprobar } = req.body;

    // Verificar que el tutor tiene permisos
    const tutorResult = await query(`
      SELECT email FROM usuaris 
      WHERE email = $1 AND role = 'docent'
    `, [tutorEmail]);

    if (tutorResult.rows.length === 0) {
      return res.status(403).json({ error: 'No tens permisos per aprovar aquesta cita' });
    }

    // Obtener datos de la cita
    const citaResult = await query(`
      SELECT * FROM cites_calendari 
      WHERE id = $1 AND tutor_email = $2 AND estat = 'pendent_aprovacio'
    `, [citaId, tutorEmail]);

    if (citaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no trobada o ja processada' });
    }

    const cita = citaResult.rows[0];

    if (aprobar) {
      // APROBAR LA CITA
      const fechaFin = new Date(cita.data_cita);
      fechaFin.setMinutes(fechaFin.getMinutes() + cita.durada_minuts);

      // Crear evento en Google Calendar
      const googleEvent = await googleCalendarService.createEvent({
        title: `Cita amb ${cita.nom_familia}`,
        description: `Cita programada amb ${cita.nom_familia} (${cita.email_familia}). Telèfon: ${cita.telefon_familia}.${cita.notes ? ' Notes: ' + cita.notes : ''}`,
        startTime: cita.data_cita,
        endTime: fechaFin,
        attendees: [
          { email: tutorEmail, name: 'Tutor' },
          { email: cita.email_familia, name: cita.nom_familia }
        ],
        location: 'Centro Educativo'
      });

      // Actualizar estado de la cita
      await query(`
        UPDATE cites_calendari 
        SET estat = 'reservado' 
        WHERE id = $1
      `, [citaId]);

      // Guardar evento en calendario local
      await query(`
        INSERT INTO eventos_calendario (
          tutor_email, cita_id, google_event_id, titulo, descripcion, 
          fecha_inicio, fecha_fin, estado, datos_familia
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        tutorEmail,
        citaId,
        googleEvent.googleEventId,
        `Cita amb ${cita.nom_familia}`,
        `Cita programada amb ${cita.nom_familia} (${cita.email_familia}). Telèfon: ${cita.telefon_familia}.${cita.notes ? ' Notes: ' + cita.notes : ''}`,
        cita.data_cita.toISOString(),
        fechaFin.toISOString(),
        'reservado',
        JSON.stringify({ nom_familia: cita.nom_familia, email_familia: cita.email_familia, telefon_familia: cita.telefon_familia, notes: cita.notes })
      ]);

      // Enviar confirmación a la familia
      await emailService.sendCitaNotification({
        tutorEmail: tutorEmail,
        familiaEmail: cita.email_familia,
        familiaNombre: cita.nom_familia,
        fecha: cita.data_cita.toISOString().split('T')[0],
        hora: cita.data_cita.toISOString().split('T')[1].substring(0, 5),
        duracion: cita.durada_minuts,
        notas: cita.notes,
        tipo: 'aprobada',
        citaId: citaId,
        googleEventUrl: googleEvent.eventUrl
      });

      res.json({
        success: true,
        message: 'Cita aprovada i creada en Google Calendar',
        googleEventId: googleEvent.googleEventId,
        eventUrl: googleEvent.eventUrl
      });

    } else {
      // RECHAZAR LA CITA
      await query(`
        UPDATE cites_calendari 
        SET estat = 'rebutjada' 
        WHERE id = $1
      `, [citaId]);

      // Enviar notificación de rechazo a la familia
      await emailService.sendCitaNotification({
        tutorEmail: tutorEmail,
        familiaEmail: cita.email_familia,
        familiaNombre: cita.nom_familia,
        fecha: cita.data_cita.toISOString().split('T')[0],
        hora: cita.data_cita.toISOString().split('T')[1].substring(0, 5),
        duracion: cita.durada_minuts,
        notas: cita.notes,
        tipo: 'rebutjada',
        citaId: citaId
      });

      res.json({
        success: true,
        message: 'Cita rebutjada'
      });
    }

  } catch (error: any) {
    console.error('Error processant aprovació:', error);
    res.status(500).json({ error: 'Error processant aprovació' });
  }
});

// GET /calendario-publico-v2/:tutorEmail/citas-pendientes - Obtener citas pendientes
router.get('/:tutorEmail/citas-pendientes', async (req: Request, res: Response) => {
  try {
    const { tutorEmail } = req.params;
    
    const citasResult = await query(`
      SELECT * FROM cites_calendari 
      WHERE tutor_email = $1 AND estat = 'pendent_aprovacio'
      ORDER BY data_cita ASC
    `, [tutorEmail]);

    res.json({
      success: true,
      citas: citasResult.rows
    });

  } catch (error: any) {
    console.error('Error obtenint cites pendients:', error);
    res.status(500).json({ error: 'Error obtenint cites pendients' });
  }
});

function generateCalendarioConAprobacionHTML(tutor: any, horarios: any[], citasPendientes: any[]): string {
  const tutorNombre = `${tutor.nom} ${tutor.cognoms}`.trim();
  
  return `
<!DOCTYPE html>
<html lang="ca">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendari de ${tutorNombre}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .citas-pendientes { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: none; }
        .citas-pendientes h3 { color: #856404; margin-bottom: 15px; }
        .cita-item { background: white; border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 5px; }
        .cita-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .cita-header h4 { color: #2c3e50; }
        .status-pendiente { background: #ffc107; color: #212529; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .cita-actions { margin-top: 10px; }
        .btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px; }
        .btn:hover { background: #0056b3; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .formulario { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .formulario h3 { color: #2c3e50; margin-bottom: 15px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .form-row { display: flex; gap: 15px; }
        .form-row .form-group { flex: 1; }
        .submit-btn { background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 1em; }
        .submit-btn:hover { background: #218838; }
        .message { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Calendari de ${tutorNombre}</h1>
            <p>Sol·licita una cita amb el tutor</p>
        </div>

        <div id="citasPendientes" class="citas-pendientes">
            <h3>Cites Pendents d'Aprovació</h3>
            <div id="citasList"></div>
        </div>

        <div class="formulario">
            <h3>Sol·licitar Nova Cita</h3>
            <form id="citaForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="familiaNombre">Nom de la Família *</label>
                        <input type="text" id="familiaNombre" name="familiaNombre" required>
                    </div>
                    <div class="form-group">
                        <label for="familiaEmail">Email *</label>
                        <input type="email" id="familiaEmail" name="familiaEmail" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="familiaTelefono">Telèfon</label>
                        <input type="tel" id="familiaTelefono" name="familiaTelefono">
                    </div>
                    <div class="form-group">
                        <label for="duracion">Durada (minuts)</label>
                        <input type="number" id="duracion" name="duracion" value="30" min="15" max="120">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="fecha">Data *</label>
                        <input type="date" id="fecha" name="fecha" required>
                    </div>
                    <div class="form-group">
                        <label for="hora">Hora *</label>
                        <input type="time" id="hora" name="hora" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="notas">Notes (opcional)</label>
                    <textarea id="notas" name="notas" rows="3" placeholder="Informació addicional sobre la cita..."></textarea>
                </div>
                
                <button type="submit" class="submit-btn">Sol·licitar Cita</button>
            </form>
        </div>
    </div>

    <script>
        const tutorEmail = '${tutor.email}';
        
        // Configurar fecha mínima (hoy)
        document.getElementById('fecha').min = new Date().toISOString().split('T')[0];
        
        // Manejar envío del formulario
        document.getElementById('citaForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/calendario-publico-v2/solicitar-cita', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...data,
                        tutorEmail: tutorEmail
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(result.message, 'success');
                    e.target.reset();
                    carregarCitesPendientes();
                } else {
                    showMessage('Error: ' + result.error, 'error');
                }
            } catch (error) {
                showMessage('Error sol·licitant la cita: ' + error.message, 'error');
            }
        });
        
        function showMessage(message, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.textContent = message;
            
            document.querySelector('.container').insertBefore(messageDiv, document.querySelector('.formulario'));
            
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
        
        // Cargar citas pendientes (solo para tutores)
        async function carregarCitesPendientes() {
            try {
                const tutorEmail = new URLSearchParams(window.location.search).get('tutor');
                if (!tutorEmail) return;
                
                const response = await fetch(\`/calendario-publico-v2/\${tutorEmail}/citas-pendientes\`);
                const result = await response.json();
                
                if (result.citas && result.citas.length > 0) {
                    document.getElementById('citasPendientes').style.display = 'block';
                    document.getElementById('citasList').innerHTML = result.citas.map(cita => \`
                        <div class="cita-item">
                            <div class="cita-header">
                                <h4>Cita amb \${cita.nom_familia}</h4>
                                <span class="status-pendiente">Pendent d'aprovació</span>
                            </div>
                            <p><strong>Data:</strong> \${new Date(cita.data_cita).toLocaleDateString()}</p>
                            <p><strong>Hora:</strong> \${new Date(cita.data_cita).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p><strong>Email:</strong> \${cita.email_familia}</p>
                            <p><strong>Telèfon:</strong> \${cita.telefon_familia}</p>
                            <div class="cita-actions">
                                <button onclick="aprobarCita('\${cita.id}')" class="btn">Aprovar</button>
                                <button onclick="rebutjarCita('\${cita.id}')" class="btn btn-danger">Rebutjar</button>
                            </div>
                        </div>
                    \`).join('');
                }
            } catch (error) {
                console.error('Error carregant cites pendients:', error);
            }
        }
        
        async function aprobarCita(citaId) {
            if (!confirm('Estàs segur que vols aprovar aquesta cita?')) return;
            
            try {
                const tutorEmail = new URLSearchParams(window.location.search).get('tutor');
                if (!tutorEmail) return;
                
                const response = await fetch('/calendario-publico-v2/aprobar-cita', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        citaId: citaId,
                        tutorEmail: tutorEmail,
                        aprobar: true
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage('Cita aprovada correctament!', 'success');
                    carregarCitesPendientes();
                } else {
                    showMessage('Error: ' + result.error, 'error');
                }
            } catch (error) {
                showMessage('Error aprobant la cita: ' + error.message, 'error');
            }
        }
        
        async function rebutjarCita(citaId) {
            if (!confirm('Estàs segur que vols rebutjar aquesta cita?')) return;
            
            try {
                const tutorEmail = new URLSearchParams(window.location.search).get('tutor');
                if (!tutorEmail) return;
                
                const response = await fetch('/calendario-publico-v2/aprobar-cita', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        citaId: citaId,
                        tutorEmail: tutorEmail,
                        aprobar: false
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage('Cita rebutjada', 'success');
                    carregarCitesPendientes();
                } else {
                    showMessage('Error: ' + result.error, 'error');
                }
            } catch (error) {
                showMessage('Error rebutjant la cita: ' + error.message, 'error');
            }
        }
        
        // Cargar citas pendientes al cargar la página
        carregarCitesPendientes();
    </script>
</body>
</html>
  `;
}

export default router;
