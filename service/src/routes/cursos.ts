import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { query, withTransaction } from '../db';
import { createSheetsClient } from '../sheets/client';
import { SheetsRepo } from '../sheets/repo';
import { z } from 'zod';

const router = Router();
router.use(requireAuth());

const createSchema = z.object({
  anyCurs: z.string().min(4),
  grups: z.array(z.object({ curs: z.string().min(1), nom: z.string().min(1) }))
});

router.post('/', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { anyCurs, grups } = parsed.data;
  // En Sheets: crear pestañas Grups_<ANY> si no existen y setear anyActual en Config
  const sheets = createSheetsClient();
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  // Config anyActual
  await sheets.spreadsheets.values.update({ spreadsheetId, range: 'Config!A2:B2', valueInputOption: 'RAW', requestBody: { values: [['anyActual', JSON.stringify(anyCurs)]] } });
  // Grups_<ANY>
  const title = `Grups_${anyCurs}`;
  try {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title } } }] } });
    await sheets.spreadsheets.values.update({ spreadsheetId, range: `${title}!A1:C1`, valueInputOption: 'RAW', requestBody: { values: [['grupId','curs','nom']] } });
  } catch {
    // ya existe
  }
  const rows = grups.map(g => [`${g.nom}_${anyCurs}`, g.curs, g.nom]);
  if (rows.length) {
    await sheets.spreadsheets.values.append({ spreadsheetId, range: `${title}!A1:C1`, valueInputOption: 'RAW', requestBody: { values: rows } });
  }
  res.status(201).json({ anyCurs, grupsCreats: grups.length, status: 'created' });
});

const importSchema = z.object({
  anyCurs: z.string().min(4),
  alumnes: z.array(z.object({ nom: z.string(), grup: z.string(), personalId: z.string().optional() }))
});

router.post('/importacio', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { anyCurs, alumnes } = parsed.data;
  const repo = new SheetsRepo(createSheetsClient(), process.env.SHEETS_SPREADSHEET_ID!);
  let importats = 0; let duplicats = 0; let senseId = 0;
  const existing = await repo.listAlumnes({ anyCurs });
  for (const al of alumnes) {
    if (existing.find(e => e.nom === al.nom && e.grup === al.grup)) { duplicats++; continue; }
    await repo.createAlumne({ nom: al.nom, grup: al.grup, anyCurs, personalId: al.personalId || '' });
    importats++;
  }
  res.json({ importats, duplicats, senseId, status: 'ok' });
});

router.get('/exportacio', requireRole(['admin','docent']), async (_req: Request, res: Response) => {
  const sheets = createSheetsClient();
  const spreadsheetId = process.env.SHEETS_SPREADSHEET_ID!;
  // Exporta rangos conocidos; para simplicidad, solo hojas activas del curso actual
  const repo = new SheetsRepo(sheets, spreadsheetId);
  const cfg = await repo.getConfig();
  const any = cfg.anyActual;
  const alumnes = await repo.listAlumnes({ anyCurs: any });
  const entrevistes = await repo.listEntrevistes({ anyCurs: any });
  res.json({ scope: 'tot', anyCurs: any, payload: [{ alumnes }, { entrevistes }] });
});

export default router;


