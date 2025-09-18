import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { query, withTransaction } from '../db.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth());

// Listar asignaciones (admin)
router.get('/assignacions', requireRole(['admin']), async (_req: Request, res: Response) => {
  const r = await query<{ email: string; grup_id: string; any_curs: string }>(
    'SELECT email, grup_id, any_curs FROM assignacions_docent_grup ORDER BY any_curs, grup_id, email'
  );
  res.json(r.rows);
});

const upsertSchema = z.object({
  email: z.string().email(),
  anyCurs: z.string().min(4),
  grup: z.string().min(1)
});

// Crear asignación (admin)
router.post('/assignacions', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { email, anyCurs, grup } = parsed.data;

  await withTransaction(async (tx) => {
    // asegurar curso
    await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
    // asegurar usuario docent
    await tx.query(
      `INSERT INTO usuaris(email, rol) VALUES ($1,'docent')
       ON CONFLICT (email) DO UPDATE SET rol=usuaris.rol`,
      [email.toLowerCase()]
    );
    // asegurar grupo
    const grupId = `${grup}_${anyCurs}`;
    await tx.query(
      `INSERT INTO grups(grup_id, any_curs, curs, nom)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (grup_id) DO NOTHING`,
      [grupId, anyCurs, grup.split(' ')[0] || grup[0], grup]
    );
    // asignación
    await tx.query(
      `INSERT INTO assignacions_docent_grup(email, grup_id, any_curs)
       VALUES($1,$2,$3)
       ON CONFLICT(email, grup_id, any_curs) DO NOTHING`,
      [email.toLowerCase(), grupId, anyCurs]
    );
  });

  res.status(201).json({ email: email.toLowerCase(), anyCurs, grup });
});

// Eliminar asignación (admin)
router.delete('/assignacions', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { email, anyCurs, grup } = parsed.data;
  const grupId = `${grup}_${anyCurs}`;
  await query('DELETE FROM assignacions_docent_grup WHERE email=$1 AND grup_id=$2 AND any_curs=$3', [email.toLowerCase(), grupId, anyCurs]);
  res.json({ status: 'deleted' });
});

// Import CSV (admin)
const importSchema = z.object({ csvBase64: z.string() });

router.post('/import', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const csvText = Buffer.from(parsed.data.csvBase64, 'base64').toString('utf8');
  // columnas esperadas: curs,grup,alumne_nom,alumne_mail,tutor_nom,tutor_mail
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return res.status(400).json({ error: 'CSV buit' });
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);
  const iCurs = idx('curs');
  const iGrup = idx('grup');
  const iTutorMail = idx('tutor_mail');
  if (iCurs < 0 || iGrup < 0 || iTutorMail < 0) return res.status(400).json({ error: 'Capçaleres requerides: curs,grup,tutor_mail' });

  let importats = 0;
  await withTransaction(async (tx) => {
    for (let r = 1; r < lines.length; r++) {
      const cols = lines[r].split(',');
      if (cols.length < header.length) continue;
      const anyCurs = cols[iCurs].trim();
      const grup = cols[iGrup].trim();
      const tutor = cols[iTutorMail].trim().toLowerCase();
      if (!anyCurs || !grup || !tutor) continue;
      await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
      await tx.query(`INSERT INTO usuaris(email, rol) VALUES ($1,'docent') ON CONFLICT (email) DO NOTHING`, [tutor]);
      const grupId = `${grup}_${anyCurs}`;
      await tx.query(
        `INSERT INTO grups(grup_id, any_curs, curs, nom) VALUES ($1,$2,$3,$4) ON CONFLICT (grup_id) DO NOTHING`,
        [grupId, anyCurs, grup.split(' ')[0] || grup[0], grup]
      );
      await tx.query(
        `INSERT INTO assignacions_docent_grup(email, grup_id, any_curs) VALUES ($1,$2,$3)
         ON CONFLICT(email, grup_id, any_curs) DO NOTHING`,
        [tutor, grupId, anyCurs]
      );
      importats++;
    }
  });

  res.json({ importats, status: 'ok' });
});

export default router;


