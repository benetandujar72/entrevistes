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
      SELECT ht.dia, ht.hora_inicio, ht.hora_fin, ht.actiu
      FROM horarios_tutor ht
      WHERE ht.tutor_email = $1 AND ht.actiu = true
      ORDER BY ht.dia, ht.hora_inicio
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

    // Verificar conflictos
    const fechaFin = new Date(dataCita);
    fechaFin.setMinutes(fechaFin.getMinutes() + duracion);
    
    const hasConflicts = await googleCalendarService.checkConflicts(dataCita, fechaFin);
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

function generateCalendarioConAprobacionHTML(tutor: any, horarios: any[], citasPendientes: any[]): string {
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
            max-width: 900px;
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
        .content {
            padding: 40px;
        }
        .form-section {
            background: #f8fafc;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #374151;
        }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: #3b82f6;
        }
        .btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #6b7280, #4b5563);
        }
        .btn-danger {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        .citas-pendientes {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
        }
        .cita-item {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            border: 1px solid #e5e7eb;
        }
        .cita-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .cita-actions {
            display: flex;
            gap: 10px;
        }
        .status-pendiente {
            background: #fef3c7;
            color: #92400e;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: #6b7280;
        }
        .success {
            background: #d1fae5;
            color: #065f46;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .error {
            background: #fee2e2;
            color: #991b1b;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
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
            <!-- Formulario de solicitud de cita -->
            <div class="form-section">
                <h2>📝 Sol·licitar Cita</h2>
                <p>Completa el formulari per sol·licitar una cita. El tutor la revisarà i t'confirmarà.</p>
                
                <form id="citaForm">
                    <div class="form-group">
                        <label for="familiaNombre">Nom de la família:</label>
                        <input type="text" id="familiaNombre" name="familiaNombre" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="familiaEmail">Email de contacte:</label>
                        <input type="email" id="familiaEmail" name="familiaEmail" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="familiaTelefono">Telèfon:</label>
                        <input type="tel" id="familiaTelefono" name="familiaTelefono" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="fecha">Data preferida:</label>
                        <input type="date" id="fecha" name="fecha" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="hora">Hora preferida:</label>
                        <input type="time" id="hora" name="hora" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="duracion">Durada (minuts):</label>
                        <select id="duracion" name="duracion">
                            <option value="30">30 minuts</option>
                            <option value="45">45 minuts</option>
                            <option value="60">60 minuts</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="notas">Notes addicionals:</label>
                        <textarea id="notas" name="notas" rows="3" placeholder="Informació addicional..."></textarea>
                    </div>
                    
                    <button type="submit" class="btn">Enviar Sol·licitud</button>
                </form>
            </div>

            <!-- Citas pendientes de aprobación (solo para tutores) -->
            <div class="citas-pendientes" id="citasPendientes" style="display: none;">
                <h2>⏳ Cites Pendent d'Aprovació</h2>
                <div id="citasList"></div>
            </div>

            <!-- Información adicional -->
            <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 10px; padding: 20px; text-align: center;">
                <h3>📞 Contacte</h3>
                <p>Si tens qualsevol dubte, contacta amb el tutor a: <strong>${tutor.email}</strong></p>
            </div>
        </div>
    </div>

    <script>
        const tutorEmail = '${tutor.email}';
        
        // Manejar envío del formulario
        document.getElementById('citaForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.tutorEmail = tutorEmail;
            
            try {
                const response = await fetch('/calendario-publico-v2/solicitar-cita', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage('Sol·licitud enviada correctament! El tutor la revisarà i t\'confirmarà.', 'success');
                    e.target.reset();
                } else {
                    showMessage('Error: ' + result.error, 'error');
                }
            } catch (error) {
                showMessage('Error enviant la sol·licitud: ' + error.message, 'error');
            }
        });
        
        function showMessage(message, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = type;
            messageDiv.textContent = message;
            document.querySelector('.content').insertBefore(messageDiv, document.querySelector('.form-section'));
            
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
        
        // Cargar citas pendientes (solo para tutores)
        async function carregarCitesPendientes() {
            try {
                const response = await fetch('/calendario-publico-v2/${tutorEmail}/citas-pendientes');
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
