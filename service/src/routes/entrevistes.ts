import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAnyActual, query } from '../db.js';
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
  try {
    const spreadsheetId = (req.query.spreadsheetId as string) || process.env.SHEETS_SPREADSHEET_ID!;
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
    let items = await repo.listEntrevistes({ alumneId, anyCurs });

  if (req.user?.role === 'docent') {
    const any = (anyCurs || (await getAnyActual()) || '').toString();
    const email = req.user.email;
    // Obtener grupos asignados al docente
    const r = await query<{ nom: string }>(
      `SELECT g.nom FROM assignacions_docent_grup adg
       JOIN grups g ON g.grup_id = adg.grup_id
       WHERE adg.email=$1 AND adg.any_curs=$2`,
      [email, any]
    );
    const allowedGroups = new Set(r.rows.map((x) => x.nom));
    // Mapear alumnos del curso por grupo
    const alumnes = await repo.listAlumnes({ anyCurs: any });
    const allowedAlumneIdsByGroup = new Set(alumnes.filter((a) => allowedGroups.has(a.grup)).map((a) => a.id));
    // Añadir alumnos por tutorías
    const r2 = await query<{ alumne_id: string }>(
      `SELECT alumne_id FROM tutories_alumne WHERE tutor_email=$1 AND any_curs=$2`,
      [email, any]
    );
    const allowedAlumneIds = new Set<string>([...allowedAlumneIdsByGroup, ...r2.rows.map((x) => x.alumne_id)]);
    // Filtrar entrevistas por alumnos permitidos (y curso)
    items = items.filter((e) => e.anyCurs === any && (!e.alumneId || allowedAlumneIds.has(e.alumneId)));
  }
    res.json(items);
  } catch (e) {
    // No bloquear: si falla Sheets, devolver vacío
    res.json([]);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const spreadsheetId = (req.query.spreadsheetId as string) || process.env.SHEETS_SPREADSHEET_ID!;
  const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
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
  const spreadsheetId = (req.query.spreadsheetId as string) || process.env.SHEETS_SPREADSHEET_ID!;
  const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
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
  const spreadsheetId = (req.query.spreadsheetId as string) || process.env.SHEETS_SPREADSHEET_ID!;
  const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
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


