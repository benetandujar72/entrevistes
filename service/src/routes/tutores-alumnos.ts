import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(requireAuth());

// GET /tutores-alumnos/mis-alumnos - Obtener alumnos asignados al tutor autenticado
router.get('/mis-alumnos', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ error: 'Usuario no autenticado' });
    }

    const tutorEmail = req.user.email;
    const anyCurs = req.query.any_curs as string || '2025-2026';

    console.log(`📚 Obteniendo alumnos para tutor: ${tutorEmail}, curso: ${anyCurs}`);

    // Obtener alumnos asignados al tutor
    const alumnosResult = await query(`
      SELECT 
        a.alumne_id,
        a.nom,
        a.cognoms,
        a.curs,
        a.grup,
        a.email,
        a.telefon,
        ta.any_curs,
        ta.tutor_email
      FROM alumnes a
      INNER JOIN tutories_alumne ta ON a.alumne_id = ta.alumne_id
      WHERE ta.tutor_email = $1 AND ta.any_curs = $2
      ORDER BY a.cognoms, a.nom
    `, [tutorEmail, anyCurs]);

    const alumnos = alumnosResult.rows;

    console.log(`📚 Encontrados ${alumnos.length} alumnos para ${tutorEmail}`);

    res.json({
      success: true,
      tutor_email: tutorEmail,
      any_curs: anyCurs,
      total_alumnos: alumnos.length,
      alumnos: alumnos
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo alumnos del tutor:', error);
    res.status(500).json({ 
      error: 'Error obteniendo alumnos del tutor',
      details: error.message 
    });
  }
});

// GET /tutores-alumnos/todos - Obtener todos los tutores con sus alumnos (solo admin)
router.get('/todos', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden ver todos los tutores' });
    }

    const anyCurs = req.query.any_curs as string || '2025-2026';

    console.log(`📚 Obteniendo todos los tutores y sus alumnos para curso: ${anyCurs}`);

    // Obtener todos los tutores con sus alumnos
    const tutoresResult = await query(`
      SELECT 
        u.email as tutor_email,
        u.nom as tutor_nom,
        u.cognoms as tutor_cognoms,
        u.role as tutor_role,
        COUNT(ta.alumne_id) as total_alumnos,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'alumne_id', a.alumne_id,
            'nom', a.nom,
            'cognoms', a.cognoms,
            'curs', a.curs,
            'grup', a.grup,
            'email', a.email,
            'telefon', a.telefon
          ) ORDER BY a.cognoms, a.nom
        ) as alumnos
      FROM usuaris u
      LEFT JOIN tutories_alumne ta ON u.email = ta.tutor_email AND ta.any_curs = $1
      LEFT JOIN alumnes a ON ta.alumne_id = a.alumne_id
      WHERE u.role = 'docent'
      GROUP BY u.email, u.nom, u.cognoms, u.role
      ORDER BY u.cognoms, u.nom
    `, [anyCurs]);

    const tutores = tutoresResult.rows;

    console.log(`📚 Encontrados ${tutores.length} tutores con alumnos`);

    res.json({
      success: true,
      any_curs: anyCurs,
      total_tutores: tutores.length,
      tutores: tutores
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo todos los tutores:', error);
    res.status(500).json({ 
      error: 'Error obteniendo todos los tutores',
      details: error.message 
    });
  }
});

// GET /tutores-alumnos/estadisticas - Estadísticas de asignación de alumnos
router.get('/estadisticas', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden ver estadísticas' });
    }

    const anyCurs = req.query.any_curs as string || '2025-2026';

    // Estadísticas generales
    const statsResult = await query(`
      SELECT 
        COUNT(DISTINCT ta.tutor_email) as total_tutores,
        COUNT(ta.alumne_id) as total_alumnos_asignados,
        AVG(COUNT(ta.alumne_id)) OVER() as promedio_alumnos_por_tutor,
        MIN(COUNT(ta.alumne_id)) OVER() as min_alumnos_por_tutor,
        MAX(COUNT(ta.alumne_id)) OVER() as max_alumnos_por_tutor
      FROM tutories_alumne ta
      WHERE ta.any_curs = $1
      GROUP BY ta.tutor_email
    `, [anyCurs]);

    // Tutores con más/menos alumnos
    const distribucionResult = await query(`
      SELECT 
        u.nom || ' ' || u.cognoms as tutor_nom,
        u.email as tutor_email,
        COUNT(ta.alumne_id) as total_alumnos
      FROM usuaris u
      LEFT JOIN tutories_alumne ta ON u.email = ta.tutor_email AND ta.any_curs = $1
      WHERE u.role = 'docent'
      GROUP BY u.email, u.nom, u.cognoms
      ORDER BY total_alumnos DESC
    `, [anyCurs]);

    res.json({
      success: true,
      any_curs: anyCurs,
      estadisticas: statsResult.rows[0] || {},
      distribucion: distribucionResult.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      error: 'Error obteniendo estadísticas',
      details: error.message 
    });
  }
});

export default router;
