import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { withTransaction } from '../db.js';

const router = Router();

// Endpoint de desarrollo para inicializar el curso sin autenticación
router.post('/initialize-course-dev', async (req: Request, res: Response) => {
  try {
    await withTransaction(async (tx) => {
      // Eliminar todas las tablas excepto usuarios
      await tx.query('DELETE FROM entrevistes');
      await tx.query('DELETE FROM tutories_alumne');
      await tx.query('DELETE FROM assignacions_docent_grup');
      await tx.query('DELETE FROM alumnes_curs');
      await tx.query('DELETE FROM alumnes');
      await tx.query('DELETE FROM grups');
      await tx.query('DELETE FROM cursos');
      
      // Insertar cursos básicos
      await tx.query("INSERT INTO cursos(any_curs) VALUES ('2024-2025') ON CONFLICT (any_curs) DO NOTHING");
      await tx.query("INSERT INTO cursos(any_curs) VALUES ('2025-2026') ON CONFLICT (any_curs) DO NOTHING");
    });

    res.json({ 
      message: 'Curs inicialitzat correctament',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error inicialitzant curs:', error);
    res.status(500).json({ 
      error: 'Error inicialitzant curs',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para inicializar el curso (limpiar base de datos excepto usuarios)
router.post('/initialize-course', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    await withTransaction(async (tx) => {
      // Eliminar todas las tablas excepto usuarios
      await tx.query('DELETE FROM entrevistes');
      await tx.query('DELETE FROM tutories_alumne');
      await tx.query('DELETE FROM assignacions_docent_grup');
      await tx.query('DELETE FROM alumnes_curs');
      await tx.query('DELETE FROM alumnes');
      await tx.query('DELETE FROM grups');
      await tx.query('DELETE FROM cursos');
      
      // Insertar cursos básicos
      await tx.query("INSERT INTO cursos(any_curs) VALUES ('2024-2025') ON CONFLICT (any_curs) DO NOTHING");
      await tx.query("INSERT INTO cursos(any_curs) VALUES ('2025-2026') ON CONFLICT (any_curs) DO NOTHING");
    });

    res.json({ 
      message: 'Curs inicialitzat correctament',
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error inicialitzant curs:', error);
    res.status(500).json({ 
      error: 'Error inicialitzant curs',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
