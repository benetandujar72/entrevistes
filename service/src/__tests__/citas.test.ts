import request from 'supertest';
import { createApp } from '../app.js';
import { query, withTransaction } from '../db.js';

// Mock de la base de datos
jest.mock('../db.js', () => ({
  query: jest.fn(),
  withTransaction: jest.fn((callback) => callback({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
  }))
}));

// Mock del middleware de autenticación
jest.mock('../middleware/auth.js', () => ({
  requireAuth: () => (req: any, res: any, next: any) => {
    req.user = {
      email: 'test@example.com',
      role: 'admin'
    };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next()
}));

describe('Router de Citas', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /citas/:alumneId', () => {
    it('debería obtener las citas de un alumno', async () => {
      const mockCitas = [
        {
          id: 'cita_123',
          alumne_id: 'alumne_1',
          tutor_email: 'tutor@example.com',
          data_cita: '2025-10-15T10:00:00Z',
          durada_minuts: 30,
          nom_familia: 'Familia Test',
          email_familia: 'familia@example.com',
          telefon_familia: '123456789',
          estat: 'pendent',
          alumne_nom: 'Alumne Test'
        }
      ];

      (query as jest.Mock).mockResolvedValue({ rows: mockCitas });

      const response = await request(app)
        .get('/citas/alumne_1')
        .expect(200);

      expect(response.body).toEqual(mockCitas);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['alumne_1', '2025-2026'])
      );
    });

    it('debería filtrar por año curso', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });

      await request(app)
        .get('/citas/alumne_1?anyCurs=2024-2025')
        .expect(200);

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['alumne_1', '2024-2025'])
      );
    });

    it('debería verificar permisos para docentes', async () => {
      // Cambiar el usuario mock a docente
      jest.mock('../middleware/auth.js', () => ({
        requireAuth: () => (req: any, res: any, next: any) => {
          req.user = {
            email: 'docent@example.com',
            role: 'docent'
          };
          next();
        },
        requireRole: () => (req: any, res: any, next: any) => next()
      }), { virtual: true });

      (query as jest.Mock).mockResolvedValue({ rows: [] });

      await request(app)
        .get('/citas/alumne_1')
        .expect(200);

      // Verificar que se aplica el filtro de tutor_email para docentes
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND cc.tutor_email'),
        expect.any(Array)
      );
    });
  });

  describe('POST /citas/:alumneId', () => {
    const newCita = {
      tutor_email: 'tutor@example.com',
      data_cita: '2025-10-15T10:00:00Z',
      durada_minuts: 30,
      nom_familia: 'Familia Test',
      email_familia: 'familia@example.com',
      telefon_familia: '123456789',
      notes: 'Nota de prueba'
    };

    it('debería crear una nueva cita', async () => {
      const mockCreatedCita = {
        id: 'cita_new',
        alumne_id: 'alumne_1',
        ...newCita,
        estat: 'pendent'
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ alumne_id: 'alumne_1' }] }); // Access check
      (withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [mockCreatedCita] }) // INSERT cita
            .mockResolvedValueOnce({ rows: [] }) // UPDATE google_event_id
        };
        return await callback(client);
      });

      const response = await request(app)
        .post('/citas/alumne_1')
        .send(newCita)
        .expect(201);

      expect(response.body).toMatchObject({
        alumne_id: 'alumne_1',
        nom_familia: 'Familia Test'
      });
    });

    it('debería rechazar datos inválidos', async () => {
      const invalidCita = {
        ...newCita,
        email_familia: 'invalid-email' // Email inválido
      };

      const response = await request(app)
        .post('/citas/alumne_1')
        .send(invalidCita)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Dades invàlides');
    });

    it('debería verificar acceso del tutor al alumno', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Access check fails

      const response = await request(app)
        .post('/citas/alumne_1')
        .send(newCita)
        .expect(403);

      expect(response.body.error).toBe('No tens accés a aquest alumne');
    });
  });

  describe('PUT /citas/:citaId/confirmar', () => {
    it('debería confirmar una cita y crear entrevista', async () => {
      const mockCita = {
        id: 'cita_123',
        alumne_id: 'alumne_1',
        tutor_email: 'tutor@example.com',
        any_curs: '2025-2026',
        data_cita: '2025-10-15T10:00:00Z',
        durada_minuts: 30,
        nom_familia: 'Familia Test',
        email_familia: 'familia@example.com',
        telefon_familia: '123456789',
        alumne_nom: 'Alumne Test',
        alumne_email: 'alumne@example.com'
      };

      const mockEntrevista = {
        id: 'ent_456',
        alumne_id: 'alumne_1',
        cita_id: 'cita_123',
        data: '2025-10-15T10:00:00Z',
        acords: 'Entrevista programada...'
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockCita] }); // Get cita
      (withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // UPDATE cita
            .mockResolvedValueOnce({ rows: [mockEntrevista] }) // INSERT entrevista
        };
        return await callback(client);
      });

      const response = await request(app)
        .put('/citas/cita_123/confirmar')
        .expect(200);

      expect(response.body).toHaveProperty('cita');
      expect(response.body).toHaveProperty('entrevista');
      expect(response.body.cita.estat).toBe('confirmada');
      expect(response.body.entrevista.cita_id).toBe('cita_123');
    });

    it('debería rechazar si la cita no existe', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // Cita no encontrada

      const response = await request(app)
        .put('/citas/cita_inexistente/confirmar')
        .expect(404);

      expect(response.body.error).toBe('Cita no trobada');
    });

    it('debería verificar permisos del tutor', async () => {
      const mockCita = {
        id: 'cita_123',
        tutor_email: 'otro_tutor@example.com',
        // ... otros campos
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockCita] });

      // Cambiar usuario a docente diferente
      jest.mock('../middleware/auth.js', () => ({
        requireAuth: () => (req: any, res: any, next: any) => {
          req.user = {
            email: 'docent@example.com',
            role: 'docent'
          };
          next();
        },
        requireRole: () => (req: any, res: any, next: any) => next()
      }), { virtual: true });

      const response = await request(app)
        .put('/citas/cita_123/confirmar')
        .expect(403);

      expect(response.body.error).toContain('permisos');
    });
  });

  describe('DELETE /citas/:citaId', () => {
    it('debería cancelar una cita', async () => {
      const mockCita = {
        id: 'cita_123',
        tutor_email: 'test@example.com',
        google_event_id: 'event_123',
        nom_familia: 'Familia Test',
        email_familia: 'familia@example.com',
        data_cita: '2025-10-15T10:00:00Z',
        durada_minuts: 30
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockCita] }); // Get cita
      (withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }) // UPDATE cita
        };
        return await callback(client);
      });

      const response = await request(app)
        .delete('/citas/cita_123')
        .expect(200);

      expect(response.body.message).toBe('Cita cancel·lada correctament');
    });

    it('debería eliminar el evento de Google Calendar si existe', async () => {
      const mockCita = {
        id: 'cita_123',
        tutor_email: 'test@example.com',
        google_event_id: 'event_123',
        data_cita: '2025-10-15T10:00:00Z',
        durada_minuts: 30,
        nom_familia: 'Familia Test',
        email_familia: 'familia@example.com'
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockCita] });
      (withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const client = {
          query: jest.fn().mockResolvedValue({ rows: [] })
        };
        return await callback(client);
      });

      await request(app)
        .delete('/citas/cita_123')
        .expect(200);

      // Verificar que se llamó a deleteEvent del mock
      const { googleCalendarService } = await import('../calendar/google-calendar.js');
      expect(googleCalendarService.deleteEvent).toHaveBeenCalledWith('event_123');
    });
  });

  describe('GET /citas/horarios/:tutorEmail', () => {
    it('debería obtener horarios disponibles del tutor', async () => {
      const mockHorariosOcupados = [
        {
          data_cita: '2025-10-15T10:00:00Z',
          durada_minuts: 30
        }
      ];

      const mockHorariosConfigurados = [
        {
          dia_semana: 'lunes',
          hora_inicio: '09:00',
          hora_fin: '17:00'
        }
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockHorariosOcupados })
        .mockResolvedValueOnce({ rows: mockHorariosConfigurados });

      const response = await request(app)
        .get('/citas/horarios/tutor@example.com?fecha=2025-10-15')
        .expect(200);

      expect(response.body).toHaveProperty('tutor_email');
      expect(response.body).toHaveProperty('horarios_disponibles');
      expect(response.body).toHaveProperty('horarios_ocupados');
      expect(response.body.tutor_email).toBe('tutor@example.com');
    });
  });

  describe('POST /citas/horarios/configurar', () => {
    it('debería configurar horarios del tutor', async () => {
      const configuracion = {
        tutor_email: 'tutor@example.com',
        nombre: 'Horario Octubre',
        fecha_inicio: '2025-10-01',
        fecha_fin: '2025-10-31',
        duracion_cita: 30,
        dias_semana: [
          { dia: 'lunes', inicio: '09:00', fin: '13:00', activo: true },
          { dia: 'martes', inicio: '09:00', fin: '13:00', activo: true }
        ]
      };

      (withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const client = {
          query: jest.fn().mockResolvedValue({ rows: [] })
        };
        return await callback(client);
      });

      const response = await request(app)
        .post('/citas/horarios/configurar')
        .send(configuracion)
        .expect(200);

      expect(response.body.message).toBe('Horaris configurats correctament');
      expect(response.body.total_horarios).toBe(2);
    });
  });

  describe('POST /citas/reservar', () => {
    it('debería reservar un horario', async () => {
      const reserva = {
        tutorEmail: 'tutor@example.com',
        alumneId: 'alumne_1',
        fecha: '2025-10-15',
        hora: '10:00',
        durada_minuts: 30,
        nom_familia: 'Familia Test',
        email_familia: 'familia@example.com',
        telefon_familia: '123456789'
      };

      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ alumne_id: 'alumne_1' }] }); // Access check
      (withTransaction as jest.Mock).mockImplementation(async (callback) => {
        const client = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'cita_new', ...reserva }] }) // INSERT
            .mockResolvedValueOnce({ rows: [] }) // UPDATE google_event_id
        };
        return await callback(client);
      });

      const response = await request(app)
        .post('/citas/reservar')
        .send(reserva)
        .expect(201);

      expect(response.body).toHaveProperty('cita');
      expect(response.body.message).toBe('Horari reservat correctament');
    });

    it('debería rechazar si hay conflicto de horario', async () => {
      const reserva = {
        tutorEmail: 'tutor@example.com',
        alumneId: 'alumne_1',
        fecha: '2025-10-15',
        hora: '10:00',
        durada_minuts: 30,
        nom_familia: 'Familia Test',
        email_familia: 'familia@example.com',
        telefon_familia: '123456789'
      };

      // Mock conflicto en Google Calendar
      const { googleCalendarService } = await import('../calendar/google-calendar.js');
      (googleCalendarService.checkConflicts as jest.Mock).mockResolvedValueOnce(true);

      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ alumne_id: 'alumne_1' }] });

      const response = await request(app)
        .post('/citas/reservar')
        .send(reserva)
        .expect(409);

      expect(response.body.error).toContain('Conflicte d\'horari');
    });
  });

  describe('GET /citas/tutor/:tutorEmail/alumnes', () => {
    it('debería obtener los alumnos del tutor con datos de contacto', async () => {
      const mockAlumnes = [
        {
          alumne_id: 'alumne_1',
          nom: 'Alumne 1',
          cognoms: 'Apellidos 1',
          grup: 'Grup A',
          tutor1_nom: 'Tutor 1',
          tutor1_email: 'tutor1@example.com',
          tutor1_tel: '123456789'
        },
        {
          alumne_id: 'alumne_2',
          nom: 'Alumne 2',
          cognoms: 'Apellidos 2',
          grup: 'Grup B',
          tutor1_nom: 'Tutor 2',
          tutor1_email: 'tutor2@example.com',
          tutor1_tel: '987654321'
        }
      ];

      (query as jest.Mock).mockResolvedValueOnce({ rows: mockAlumnes });

      const response = await request(app)
        .get('/citas/tutor/tutor@example.com/alumnes')
        .expect(200);

      expect(response.body).toHaveProperty('alumnes');
      expect(response.body).toHaveProperty('total');
      expect(response.body.alumnes).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('GET /citas/tutor/:tutorEmail/lista', () => {
    it('debería obtener todas las citas del tutor', async () => {
      const mockCitas = [
        {
          id: 'cita_1',
          alumne_id: 'alumne_1',
          data_cita: '2025-10-15T10:00:00Z',
          estat: 'confirmada',
          alumne_nom: 'Alumne 1'
        },
        {
          id: 'cita_2',
          alumne_id: 'alumne_2',
          data_cita: '2025-10-16T11:00:00Z',
          estat: 'pendent',
          alumne_nom: 'Alumne 2'
        }
      ];

      (query as jest.Mock).mockResolvedValueOnce({ rows: mockCitas });

      const response = await request(app)
        .get('/citas/tutor/tutor@example.com/lista')
        .expect(200);

      expect(response.body).toHaveProperty('cites');
      expect(response.body).toHaveProperty('total');
      expect(response.body.cites).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });
  });
});
