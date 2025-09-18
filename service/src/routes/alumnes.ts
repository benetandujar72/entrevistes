import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createSheetsClient } from '../sheets/client.js';
import { SheetsRepo } from '../sheets/repo.js';
import { query } from '../db.js';
import { z } from 'zod';
import { ulid } from 'ulid';

const router = Router();

router.use(requireAuth());

router.get('/', async (req: Request, res: Response) => {
  const anyCurs = (req.query.anyCurs as string) || undefined;
  try {
    const spreadsheetId = (req.query.spreadsheetId as string) || process.env.SHEETS_SPREADSHEET_ID!;
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
    const items = await repo.listAlumnes({ anyCurs, estat: req.query.estat as string });

  // Si es docent, filtrar por grupos asignados en DB
  if (req.user?.role === 'docent') {
    const email = req.user.email;
    const ac = anyCurs || (await (await import('../db.js')).getAnyActual());
    const r = await query<{ nom: string }>(
      `SELECT g.nom FROM assignacions_docent_grup adg
       JOIN grups g ON g.grup_id = adg.grup_id
       WHERE adg.email=$1 AND adg.any_curs=$2`,
      [email, ac]
    );
    const allowed = new Set(r.rows.map((x) => x.nom));
    return res.json(items.filter((a) => allowed.has(a.grup)));
  }

    res.json(items);
  } catch (e) {
    res.json([]);
  }
});

const createSchema = z.object({
  nom: z.string().min(1),
  grup: z.string().min(1),
  anyCurs: z.string().min(4),
  personalId: z.string().min(1)
});

router.post('/', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  const id = await repo.createAlumne(parsed.data);
  res.status(201).json({ id, status: 'created' });
});

const updateSchema = z.object({
  grup: z.string().min(1).optional(),
  estat: z.enum(['alta','baixa','migrat']).optional()
});

router.put('/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  const ok = await repo.updateAlumne(id, parsed.data);
  if (!ok) return res.status(404).json({ error: 'No trobat' });
  res.json({ id, status: 'updated' });
});

router.get('/:id', async (req: Request, res: Response) => {
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  const r = await repo.getAlumneFull(req.params.id);
  if (!r) return res.status(404).json({ error: 'No trobat' });
  res.json(r);
});

export default router;


