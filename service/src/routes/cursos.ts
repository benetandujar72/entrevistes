import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { query, withTransaction } from '../db.js';
import { createSheetsClient } from '../sheets/client.js';
import { SheetsRepo } from '../sheets/repo.js';
import { z } from 'zod';

const router = Router();
router.use(requireAuth());
// Llistar cursos (per solucionar "carregant cursos")
router.get('/', async (_req: Request, res: Response) => {
  try {
    const r = await query<{ any_curs: string }>('SELECT any_curs FROM cursos ORDER BY any_curs DESC');
    res.json(r.rows.map((x) => ({ any: x.any_curs, grups: [] })));
  } catch {
    res.json([]);
  }
});

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

// DELETE /cursos - Eliminar todos los cursos y datos relacionados
router.delete('/', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    await withTransaction(async (tx) => {
      // Eliminar en orden para respetar las foreign keys
      await tx.query('DELETE FROM entrevistes');
      await tx.query('DELETE FROM entrevistes_consolidadas');
      await tx.query('DELETE FROM tutories_alumne');
      await tx.query('DELETE FROM assignacions_docent_grup');
      await tx.query('DELETE FROM alumnes_curs');
      await tx.query('DELETE FROM grups');
      await tx.query('DELETE FROM cursos');
    });
    
    res.json({ 
      status: 'ok',
      message: 'Tots els cursos i dades relacionades han estat eliminats'
    });
  } catch (error: any) {
    console.error('Error eliminant cursos:', error);
    res.status(500).json({ error: 'Error eliminant els cursos' });
  }
});

// DELETE /cursos/:anyCurs - Eliminar un curso específico y sus datos relacionados
router.delete('/:anyCurs', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const anyCurs = req.params.anyCurs;
    
    await withTransaction(async (tx) => {
      // Eliminar en orden para respetar las foreign keys
      await tx.query('DELETE FROM entrevistes WHERE any_curs = $1', [anyCurs]);
      await tx.query('DELETE FROM entrevistes_consolidadas WHERE any_curs = $1', [anyCurs]);
      await tx.query('DELETE FROM tutories_alumne WHERE any_curs = $1', [anyCurs]);
      await tx.query('DELETE FROM assignacions_docent_grup WHERE any_curs = $1', [anyCurs]);
      await tx.query('DELETE FROM alumnes_curs WHERE any_curs = $1', [anyCurs]);
      await tx.query('DELETE FROM grups WHERE any_curs = $1', [anyCurs]);
      await tx.query('DELETE FROM cursos WHERE any_curs = $1', [anyCurs]);
    });
    
    res.json({ 
      status: 'ok',
      message: `Curs ${anyCurs} i dades relacionades han estat eliminats`
    });
  } catch (error: any) {
    console.error('Error eliminant curs:', error);
    res.status(500).json({ error: 'Error eliminant el curs' });
  }
});

// GET /cursos/estadisticas/:anyCurs - Obtener estadísticas de un curso específico
router.get('/estadisticas/:anyCurs', requireRole(['admin', 'docent']), async (req: Request, res: Response) => {
  try {
    const anyCurs = req.params.anyCurs;
    
    // Estadísticas básicas
    const [alumnesResult, tutoresResult, entrevistesResult] = await Promise.all([
      query(`
        SELECT COUNT(*) as total_alumnes,
               COUNT(DISTINCT ac.grup_id) as total_grups
        FROM alumnes_curs ac
        WHERE ac.any_curs = $1
      `, [anyCurs]),
      
      query(`
        SELECT COUNT(DISTINCT ta.tutor_email) as total_tutores
        FROM tutories_alumne ta
        WHERE ta.any_curs = $1
      `, [anyCurs]),
      
      query(`
        SELECT COUNT(*) as total_entrevistes
        FROM entrevistes e
        WHERE e.any_curs = $1
      `, [anyCurs])
    ]);

    // Entrevistas por mes
    const entrevistesPorMes = await query(`
      SELECT 
        TO_CHAR(e.data, 'YYYY-MM') as mes,
        COUNT(*) as total
      FROM entrevistes e
      WHERE e.any_curs = $1
      GROUP BY TO_CHAR(e.data, 'YYYY-MM')
      ORDER BY mes
    `, [anyCurs]);

    // Entrevistas por grupo
    const entrevistesPorGrupo = await query(`
      SELECT 
        g.nom as grup_nom,
        COUNT(e.id) as total_entrevistes
      FROM entrevistes e
      JOIN alumnes_curs ac ON e.alumne_id = ac.alumne_id AND ac.any_curs = e.any_curs
      JOIN grups g ON ac.grup_id = g.grup_id
      WHERE e.any_curs = $1
      GROUP BY g.nom
      ORDER BY g.nom
    `, [anyCurs]);

    // Alumnes por grupo
    const alumnesPorGrupo = await query(`
      SELECT 
        g.nom as grup_nom,
        COUNT(ac.alumne_id) as total_alumnes
      FROM alumnes_curs ac
      JOIN grups g ON ac.grup_id = g.grup_id
      WHERE ac.any_curs = $1
      GROUP BY g.nom
      ORDER BY g.nom
    `, [anyCurs]);

    res.json({
      anyCurs,
      estadisticas: {
        totalAlumnes: parseInt(alumnesResult.rows[0]?.total_alumnes || '0'),
        totalGrups: parseInt(alumnesResult.rows[0]?.total_grups || '0'),
        totalTutores: parseInt(tutoresResult.rows[0]?.total_tutores || '0'),
        totalEntrevistes: parseInt(entrevistesResult.rows[0]?.total_entrevistes || '0')
      },
      graficos: {
        entrevistesPorMes: entrevistesPorMes.rows,
        entrevistesPorGrupo: entrevistesPorGrupo.rows,
        alumnesPorGrupo: alumnesPorGrupo.rows
      }
    });
  } catch (error: any) {
    console.error('Error obtenint estadístiques:', error);
    res.status(500).json({ error: 'Error obtenint estadístiques del curs' });
  }
});

// GET /cursos/control-alumnes/:anyCurs - Obtener cuadro de control de alumnos
router.get('/control-alumnes/:anyCurs', requireRole(['admin', 'docent']), async (req: Request, res: Response) => {
  try {
    const anyCurs = req.params.anyCurs;
    
    // Alumnos con más entrevistas
    const masEntrevistas = await query(`
      SELECT 
        a.alumne_id as id,
        a.nom,
        a.email,
        g.nom as grup_nom,
        COUNT(e.id) as total_entrevistes
      FROM alumnes a
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = $1
      JOIN grups g ON ac.grup_id = g.grup_id
      LEFT JOIN entrevistes e ON a.alumne_id = e.alumne_id AND e.any_curs = $1
      GROUP BY a.alumne_id, a.nom, a.email, g.nom
      HAVING COUNT(e.id) > 0
      ORDER BY COUNT(e.id) DESC
      LIMIT 10
    `, [anyCurs]);

    // Alumnos sin entrevistas
    const sinEntrevistas = await query(`
      SELECT 
        a.alumne_id as id,
        a.nom,
        a.email,
        g.nom as grup_nom
      FROM alumnes a
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = $1
      JOIN grups g ON ac.grup_id = g.grup_id
      LEFT JOIN entrevistes e ON a.alumne_id = e.alumne_id AND e.any_curs = $1
      WHERE e.id IS NULL
      ORDER BY a.nom
    `, [anyCurs]);

    // Alumnos con alertas especiales (PSI, NESE, etc.)
    const conAlertas = await query(`
      SELECT 
        a.alumne_id as id,
        a.nom,
        a.email,
        g.nom as grup_nom,
        a.observacions
      FROM alumnes a
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = $1
      JOIN grups g ON ac.grup_id = g.grup_id
      WHERE a.observacions IS NOT NULL 
        AND a.observacions != ''
        AND (
          LOWER(a.observacions) LIKE '%psi%' OR
          LOWER(a.observacions) LIKE '%nese%' OR
          LOWER(a.observacions) LIKE '%tipus a%' OR
          LOWER(a.observacions) LIKE '%tipus b%' OR
          LOWER(a.observacions) LIKE '%atenció especial%' OR
          LOWER(a.observacions) LIKE '%necesitats especials%'
        )
      ORDER BY a.nom
    `, [anyCurs]);

    // Estadísticas generales
    const estadisticas = await query(`
      SELECT 
        COUNT(DISTINCT a.alumne_id) as total_alumnes,
        COUNT(DISTINCT e.id) as total_entrevistes,
        COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN a.alumne_id END) as alumnes_entrevistats,
        COUNT(DISTINCT CASE WHEN e.id IS NULL THEN a.alumne_id END) as alumnes_sin_entrevista
      FROM alumnes a
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = $1
      LEFT JOIN entrevistes e ON a.alumne_id = e.alumne_id AND e.any_curs = $1
    `, [anyCurs]);

    res.json({
      anyCurs,
      estadisticas: estadisticas.rows[0],
      masEntrevistas: masEntrevistas.rows,
      sinEntrevistas: sinEntrevistas.rows,
      conAlertas: conAlertas.rows
    });
  } catch (error: any) {
    console.error('Error obtenint control d\'alumnes:', error);
    res.status(500).json({ error: 'Error obtenint control d\'alumnes' });
  }
});

export default router;


