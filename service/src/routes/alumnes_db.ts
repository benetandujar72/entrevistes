import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAnyActual, query } from '../db.js';

const router = Router();

// Endpoint de desarrollo eliminado por seguridad

router.use(requireAuth());

// Lista alumnos desde la BD (no desde Sheets)
router.get('/', async (req: Request, res: Response) => {
  const anyCursParam = (req.query.anyCurs as string) || undefined;
  const anyCurs = anyCursParam || (await getAnyActual());
  if (!anyCurs) return res.json([]);

  // Si es docent, filtrar por grupos asignados en DB o tutorías
  let allowedGroupIds: Set<string> | null = null;
  let allowedAlumneIds: Set<string> | null = null;
  if (req.user?.role === 'docent') {
    const r = await query<{ grup_id: string }>(
      `SELECT adg.grup_id
       FROM assignacions_docent_grup adg
       WHERE adg.email=$1 AND adg.any_curs=$2`,
      [req.user.email, anyCurs]
    );
    allowedGroupIds = new Set(r.rows.map((x) => x.grup_id));
    const r2 = await query<{ alumne_id: string }>(
      `SELECT alumne_id FROM tutories_alumne WHERE tutor_email=$1 AND any_curs=$2`,
      [req.user.email, anyCurs]
    );
    allowedAlumneIds = new Set(r2.rows.map((x) => x.alumne_id));
  }
  // Los administradores ven todos los alumnos

  const r = await query<{
    id: string;
    nom: string;
    grup: string | null;
    any_curs: string;
    estat: 'alta' | 'baixa' | 'migrat';
  }>(
    `SELECT a.alumne_id AS id, a.nom, g.nom AS grup, ac.any_curs, ac.estat
     FROM alumnes a
     JOIN alumnes_curs ac ON ac.alumne_id = a.alumne_id
     LEFT JOIN grups g ON g.grup_id = ac.grup_id
     WHERE ac.any_curs = $1`,
    [anyCurs]
  );

  const items = r.rows
    .filter((row) => {
      // Los administradores ven todos los alumnos
      if (req.user?.role === 'admin') return true;
      if (!allowedGroupIds && !allowedAlumneIds) return true;
      // permitir si está en grupo permitido o si el alumno está asignado por tutoría
      const inGroup = allowedGroupIds ? allowedGroupIds.has(`${row.grup || ''}_${row.any_curs}`) : false;
      const inTutory = allowedAlumneIds ? allowedAlumneIds.has(row.id) : false;
      return inGroup || inTutory;
    })
    .map((row) => ({ id: row.id, nom: row.nom, grup: row.grup || '', anyCurs: row.any_curs, estat: row.estat }));

  res.json(items);
});

export default router;


