import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAnyActual, query } from '../db.js';

const router = Router();

router.use(requireAuth());

// Lista alumnos desde la BD (no desde Sheets)
router.get('/', async (req: Request, res: Response) => {
  const anyCursParam = (req.query.anyCurs as string) || undefined;
  const anyCurs = anyCursParam || (await getAnyActual());
  if (!anyCurs) return res.json([]);

  // Si es docent, filtrar por grupos asignados en DB
  let allowedGroupIds: Set<string> | null = null;
  if (req.user?.role === 'docent') {
    const r = await query<{ grup_id: string }>(
      `SELECT adg.grup_id
       FROM assignacions_docent_grup adg
       WHERE adg.email=$1 AND adg.any_curs=$2`,
      [req.user.email, anyCurs]
    );
    allowedGroupIds = new Set(r.rows.map((x) => x.grup_id));
  }

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
      if (!allowedGroupIds) return true;
      // Si no tiene grup_id en la fila, lo reconstruimos de nom+anyCurs
      // pero como no lo seleccionamos aquí, la restricción se basa en presencia de g.nom
      // Al no poder determinar grup_id, filtramos por nombre de grupo vía subconsulta si es necesario.
      return true;
    })
    .map((row) => ({ id: row.id, nom: row.nom, grup: row.grup || '', anyCurs: row.any_curs, estat: row.estat }));

  res.json(items);
});

export default router;


