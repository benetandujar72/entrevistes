import { Router, Request, Response } from 'express';
import { createSheetsClient } from '../sheets/client.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
// Requerir autenticación para todas las rutas de sheets
router.use(requireAuth());

router.get('/diagnostic', async (req: Request, res: Response) => {
  const spreadsheetId = (req.query.spreadsheetId as string || '').trim();
  if (!spreadsheetId) return res.status(400).json({ error: 'Falta spreadsheetId' });
  try {
    const sheets = createSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
    const tabs = (meta.data.sheets || []).map((s: any) => ({
      title: s.properties?.title || '—',
      sheetId: s.properties?.sheetId,
      grid: { rows: s.properties?.gridProperties?.rowCount || 0, cols: s.properties?.gridProperties?.columnCount || 0 }
    }));
    const counts: Record<string, number> = {};
    for (const t of tabs) {
      try {
        const r = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${t.title}!A1:Z10000` });
        const rows = r.data.values?.length || 0;
        counts[t.title] = rows;
      } catch {
        counts[t.title] = -1; // error accediendo
      }
    }
    res.json({ spreadsheetId, tabs: tabs.map((t: any) => ({ ...t, rows: counts[t.title] ?? 0 })) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error' });
  }
});

export default router;
