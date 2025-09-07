import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAnyActual } from '../db.js';
import { createSheetsClient } from '../sheets/client.js';
import { SheetsRepo } from '../sheets/repo.js';
import { z } from 'zod';
import { ulid } from 'ulid';

const router = Router();
router.use(requireAuth());

router.get('/', async (req: Request, res: Response) => {
  const alumneId = (req.query.alumneId as string) || undefined;
  const anyCurs = (req.query.anyCurs as string) || undefined;
  const where: string[] = [];
  const params: any[] = [];
  if (alumneId) { where.push(`alumne_id = $${params.length + 1}`); params.push(alumneId); }
  if (anyCurs) { where.push(`any_curs = $${params.length + 1}`); params.push(anyCurs); }
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  const items = await repo.listEntrevistes({ alumneId, anyCurs });
  res.json(items);
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  const r = await repo.getEntrevista(id);
  if (!r) return res.status(404).json({ error: 'No trobat' });
  res.json(r);
});

const createSchema = z.object({
  alumneId: z.string().min(1),
  data: z.string().min(1),
  acords: z.string().min(1)
});

router.post('/', requireRole(['docent','admin']), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const anyActual = await getAnyActual();
  if (!anyActual) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  const id = await repo.createEntrevista({ alumneId: parsed.data.alumneId, data: parsed.data.data, acords: parsed.data.acords, usuariCreadorId: req.user!.email });
  res.status(201).json({ id, status: 'created' });
});

const updateSchema = z.object({
  acords: z.string().min(1)
});

router.put('/:id', requireRole(['docent','admin']), async (req: Request, res: Response) => {
  const id = req.params.id;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const anyActual = await getAnyActual();
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  const current = await repo.getEntrevista(id);
  if (!current) return res.status(404).json({ error: 'No trobat' });
  const isAuthor = current.usuariCreadorId?.toLowerCase() === req.user!.email;
  if (current.anyCurs !== anyActual && req.user!.role !== 'admin') return res.status(403).json({ error: 'Permís denegat' });
  if (!isAuthor && req.user!.role !== 'admin') return res.status(403).json({ error: 'Permís denegat' });
  const ok = await repo.updateEntrevista(id, { acords: parsed.data.acords });
  if (!ok) return res.status(404).json({ error: 'No trobat' });
  res.json({ id, status: 'updated' });
});

export default router;


