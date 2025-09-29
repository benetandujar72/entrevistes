import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createSheetsClient } from '../sheets/client.js';
import { SheetsRepo } from '../sheets/repo.js';
import { query, withTransaction } from '../db.js';
import { z } from 'zod';
import { ulid } from 'ulid';

const router = Router();

const bodySchema = z.object({
  spreadsheetId: z.string().min(10),
  anyCurs: z.string().min(4)
});

// Endpoint temporal de desarrollo para importar entrevistas sin autenticación
router.post('/entrevistes-dev', async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId, anyCurs } = parsed.data;
  
  try {
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
    const entrevistes = await repo.listEntrevistes({ anyCurs });
    let importats = 0; let ignorades = 0;
    
    await withTransaction(async (tx) => {
      await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
      for (const e of entrevistes) {
        if (!e.id || !e.alumneId || !e.data) { ignorades++; continue; }
        await tx.query(
          `INSERT INTO entrevistes(id, alumne_id, any_curs, data, acords, usuari_creador_id)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO UPDATE SET acords=EXCLUDED.acords, data=EXCLUDED.data, updated_at=NOW()`,
          [e.id, e.alumneId, anyCurs, e.data, e.acords || null, e.usuariCreadorId || null]
        );
        importats++;
      }
    });
    res.json({ importats, ignorades, status: 'ok' });
  } catch (e: any) {
    console.error('Error import entrevistes dev:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Error import entrevistes' });
  }
});

// Endpoint para previsualizar entrevistas de todas las pestañas
router.post('/entrevistes-tabs-preview', async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId } = parsed.data;
  
  try {
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
    const tabsData = await repo.getAllEntrevistesByTabs();
    const historial = await repo.getHistorialConsolidado();
    
    res.json({ 
      tabsData, 
      historial,
      totalEntrevistes: tabsData.reduce((total, tab) => total + tab.entrevistes.length, 0),
      totalTabs: tabsData.length,
      status: 'ok' 
    });
  } catch (e: any) {
    console.error('Error previsualizando entrevistas por pestañas:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Error previsualizando entrevistas' });
  }
});

// Endpoint para importar entrevistas desde previsualización
router.post('/entrevistes-tabs-import', async (req: Request, res: Response) => {
  console.log('[IMPORT] Entrevistes-tabs-import - Body recibido:', JSON.stringify(req.body, null, 2));
  
  const importSchema = z.object({
    spreadsheetId: z.string().min(1),
    anyCurs: z.string().min(1),
    tabsData: z.array(z.object({
      tabName: z.string(),
      entrevistes: z.array(z.object({
        id: z.string().optional(),
        alumneId: z.string().optional(),
        data: z.string().optional(),
        acords: z.string().optional(),
        usuariCreadorId: z.string().optional(),
        tabName: z.string().optional()
      }))
    }))
  });
  
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log('[IMPORT] Error de validación:', parsed.error);
    return res.status(400).json({ error: 'Dades requerides incompletes', details: parsed.error });
  }
  const { spreadsheetId, anyCurs, tabsData } = parsed.data;
  
  try {
    let importats = 0; let ignorades = 0;
    
    await withTransaction(async (tx) => {
      await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
      
      for (const tab of tabsData) {
        for (const e of tab.entrevistes) {
          // Validar que tengamos datos mínimos
          if (!e.alumneId) { 
            console.log('[IMPORT] Ignorando entrevista sin alumneId:', e);
            ignorades++; 
            continue; 
          }
          
          // Generar ID si no existe
          const id = e.id || ulid();
          
          // Usar fecha actual si no hay fecha específica
          const data = e.data || new Date().toISOString().slice(0, 10);
          
          // Agregar nombre de pestaña a los acuerdos
          const acords = e.acords ? `[${e.tabName || tab.tabName}] ${e.acords}` : `[${e.tabName || tab.tabName}]`;
          
          console.log('[IMPORT] Importando entrevista:', { id, alumneId: e.alumneId, data, acords });
          
          await tx.query(
            `INSERT INTO entrevistes(id, alumne_id, any_curs, data, acords, usuari_creador_id)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (id) DO UPDATE SET acords=EXCLUDED.acords, data=EXCLUDED.data, updated_at=NOW()`,
            [id, e.alumneId, anyCurs, data, acords, e.usuariCreadorId || 'import@system']
          );
          importats++;
        }
      }
    });
    
    res.json({ 
      importats, 
      ignorades, 
      tabsProcessed: tabsData.length,
      status: 'ok' 
    });
  } catch (e: any) {
    console.error('Error importando entrevistas por pestañas:', e?.message || e);
    res.status(500).json({ error: e?.message || 'Error importando entrevistas' });
  }
});

router.use(requireAuth());

// Importar alumnes desde Sheets a BD
router.post('/alumnes', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
    const { spreadsheetId, anyCurs } = parsed.data;
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);

    const alumnes = await repo.listAlumnes({ anyCurs });
    let importats = 0;
    await withTransaction(async (tx) => {
      await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
      for (const a of alumnes) {
        if (!a.id || !a.nom) continue;
        await tx.query('INSERT INTO alumnes(alumne_id, nom) VALUES ($1,$2) ON CONFLICT (alumne_id) DO UPDATE SET nom=EXCLUDED.nom', [a.id, a.nom]);
        await tx.query(
          `INSERT INTO alumnes_curs(id, alumne_id, any_curs, grup_id, estat)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (alumne_id, any_curs) DO UPDATE SET grup_id=EXCLUDED.grup_id, estat=EXCLUDED.estat, updated_at=NOW()`,
          [`${a.id}_${anyCurs}`, a.id, anyCurs, a.grup ? `${a.grup}_${anyCurs}` : null, a.estat || 'alta']
        );
        if (a.grup) {
          await tx.query(
            `INSERT INTO grups(grup_id, any_curs, curs, nom) VALUES ($1,$2,$3,$4) ON CONFLICT (grup_id) DO NOTHING`,
            [`${a.grup}_${anyCurs}`, anyCurs, a.grup.split(' ')[0] || a.grup[0], a.grup]
          );
        }
        importats++;
      }
    });
    res.json({ importats, status: 'ok' });
  } catch (e: any) {
    // No bloquear: reportar error pero mantener proceso vivo
    // eslint-disable-next-line no-console
    console.error('Import alumnes failed:', e?.message || e);
    res.status(500).json({ error: 'Error important alumnes' });
  }
});

// Previsualitzar import d'alumnes sense fer canvis
router.post('/alumnes/preview', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId, anyCurs } = parsed.data;
  const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);

  const alumnes = (await repo.listAlumnes({ anyCurs }))
    .filter(a => a && a.id && a.nom)
    .map(a => ({ id: a.id, nom: a.nom, grup: a.grup || null, estat: a.estat || 'alta' }));

  const ids = alumnes.map(a => a.id);
  const existsAlum = await query<{ alumne_id: string; nom: string }>(
    `SELECT alumne_id, nom FROM alumnes WHERE alumne_id = ANY($1)`,
    [ids]
  );
  const existsMap = new Map(existsAlum.rows.map(r => [r.alumne_id, r]));

  const enrol = await query<{ alumne_id: string; grup_id: string | null; estat: string }>(
    `SELECT alumne_id, grup_id, estat FROM alumnes_curs WHERE any_curs=$1 AND alumne_id = ANY($2)`,
    [anyCurs, ids]
  );
  const enrolMap = new Map(enrol.rows.map(r => [r.alumne_id, r]));

  const groups = await query<{ grup_id: string }>(
    `SELECT grup_id FROM grups WHERE any_curs=$1`,
    [anyCurs]
  );
  const groupSet = new Set(groups.rows.map(g => g.grup_id));

  let toCreateAlumnes = 0;
  let toCreateEnrolments = 0;
  let toUpdateEnrolments = 0;
  let toCreateGroups = 0;

  const items = alumnes.map(a => {
    const desiredGroupId = a.grup ? `${a.grup}_${anyCurs}` : null;
    const hasAlum = existsMap.has(a.id);
    const existing = enrolMap.get(a.id);
    let action: 'insert' | 'update' | 'skip' = 'skip';
    if (!hasAlum) {
      toCreateAlumnes++;
    }
    if (!existing) {
      toCreateEnrolments++;
      action = 'insert';
    } else {
      const needsUpdate = (existing.grup_id || null) !== (desiredGroupId || null) || (existing.estat || 'alta') !== (a.estat || 'alta');
      if (needsUpdate) { toUpdateEnrolments++; action = 'update'; }
    }
    if (desiredGroupId && !groupSet.has(desiredGroupId)) {
      toCreateGroups++;
    }
    return { id: a.id, nom: a.nom, grup: a.grup, anyCurs, estat: a.estat, action };
  });

  const MAX = 200;
  const truncated = items.length > MAX;
  const list = truncated ? items.slice(0, MAX) : items;

  res.json({
    total: items.length,
    toCreateAlumnes,
    toCreateEnrolments,
    toUpdateEnrolments,
    toCreateGroups,
    truncated,
    items: list
  });
});

// ====== Importació ESO per nivell (llegint de pestanya "<nivell> ESO" i rang C4:D<lastRow>) ======
const esoBodySchema = z.object({
  spreadsheetId: z.string().min(10),
  anyCurs: z.string().min(4),
  nivell: z.enum(['1r','2n','3r','4t'])
});

function normalize(text: string | null | undefined): string {
  return (text || '').toString().trim();
}

function looksLikeName(s: string): boolean {
  const v = s.trim();
  if (!v) return false;
  if (/^(nom|nombre|alumne|alumno)$/i.test(v)) return false;
  // Heurística: contiene espacio o minúsculas y longitud > 2
  return /[a-záéíóúüñ]/i.test(v) && v.length >= 2;
}

function normalizeGroup(raw: string): string {
  // Quitar espacios internos tipo "1 A" -> "1A"
  return raw.replace(/\s+/g, '').toUpperCase();
}

function groupRegexFor(nivell: '1r'|'2n'|'3r'|'4t'): RegExp {
  const digit = { '1r': '1', '2n': '2', '3r': '3', '4t': '4' }[nivell];
  return new RegExp(`^${digit}[A-Z]{1,2}$`);
}

async function findEsoTabTitle(spreadsheetId: string, nivell: '1r'|'2n'|'3r'|'4t'): Promise<string> {
  const sheets = createSheetsClient();
  const digit = { '1r': '1', '2n': '2', '3r': '3', '4t': '4' }[nivell];
  const meta = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
  const candidates = (meta.data.sheets || []).map((s: any) => s.properties?.title || '');
  const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/\s+/g,'');
  const target = normalize(`${digit}eso`);
  // Prefer exact startswith like "3reso", then contains digit+"eso"
  const ordered = candidates.sort((a: any, b: any) => a.length - b.length);
  for (const t of ordered) {
    const n = normalize(t);
    if (n.startsWith(`${digit}reso`) || n.startsWith(`${digit}eso`)) return t;
  }
  for (const t of ordered) {
    const n = normalize(t);
    if (n.includes(target) || (n.includes(digit) && n.includes('eso'))) return t;
  }
  // Fallback al esperado "<nivell> ESO"
  return `${nivell} ESO`;
}

async function readEsoAlumnes(params: { spreadsheetId: string; nivell: '1r'|'2n'|'3r'|'4t' }): Promise<Array<{ nom: string; grup: string | null }>> {
  const sheets = createSheetsClient();
  const tab = await findEsoTabTitle(params.spreadsheetId, params.nivell);
  // Obtener última fila no vacía de columna D
  const dcol = await sheets.spreadsheets.values.get({ spreadsheetId: params.spreadsheetId, range: `${tab}!D:D` });
  const valuesD = dcol.data.values || [];
  let lastRow = 0;
  for (let i = valuesD.length; i >= 1; i--) {
    const v = (valuesD[i - 1] || [])[0];
    if (v !== undefined && v !== null && String(v).trim() !== '') { lastRow = i; break; }
  }
  if (lastRow < 4) return [];
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId: params.spreadsheetId, range: `${tab}!C4:D${lastRow}` });
  const rows = resp.data.values || [];
  const gRegex = groupRegexFor(params.nivell);
  const out: Array<{ nom: string; grup: string | null }> = [];
  for (const r of rows) {
    const c = normalize(r?.[0]);
    const d = normalize(r?.[1]);
    if (!c && !d) continue;
    // Detectar qué columna es grupo
    const cAsGroup = gRegex.test(normalizeGroup(c));
    const dAsGroup = gRegex.test(normalizeGroup(d));
    let nom = '';
    let grup: string | null = null;
    if (dAsGroup && looksLikeName(c)) { nom = c; grup = normalizeGroup(d); }
    else if (cAsGroup && looksLikeName(d)) { nom = d; grup = normalizeGroup(c); }
    else if (dAsGroup && !cAsGroup) { nom = c || d; grup = normalizeGroup(d); }
    else if (cAsGroup && !dAsGroup) { nom = d || c; grup = normalizeGroup(c); }
    else {
      // Ninguna parece grupo; asumir C=nom, D=grup si D corto tipo "A/B/C"; si no, sin grupo
      if (looksLikeName(c)) nom = c; else if (looksLikeName(d)) nom = d; else nom = c || d;
      const dN = normalizeGroup(d);
      grup = gRegex.test(dN) ? dN : null;
    }
    if (!nom) continue;
    out.push({ nom, grup });
  }
  return out;
}

router.post('/alumnes-eso/preview', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = esoBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId, anyCurs, nivell } = parsed.data;
  const itemsRaw = await readEsoAlumnes({ spreadsheetId, nivell });
  const idsLike = itemsRaw.map(i => `${(i.grup || '').replace(/\s+/g,' ').trim()}_${anyCurs}`);

  // Construir vista previa similar a l'import general
  const existsAlum = await query<{ alumne_id: string; nom: string }>(`SELECT alumne_id, nom FROM alumnes WHERE nom = ANY($1)`, [itemsRaw.map(i => i.nom)]);
  const enrol = await query<{ alumne_id: string }>(`SELECT alumne_id FROM alumnes_curs WHERE any_curs=$1`, [anyCurs]);
  const existNames = new Set(existsAlum.rows.map(r => r.nom));
  const enrolled = new Set(enrol.rows.map(r => r.alumne_id));

  // En esta importació, generarem IDs nous per noms nous
  const items = itemsRaw.map(r => ({ nom: r.nom, grup: r.grup, anyCurs, nivell }));
  const toCreateAlumnes = items.filter(i => !existNames.has(i.nom)).length;
  // Para preview, solo estimamos matrículas nuevas = total
  const toCreateEnrolments = items.length;

  const MAX = 200;
  const truncated = items.length > MAX;
  res.json({ total: items.length, toCreateAlumnes, toCreateEnrolments, truncated, items: truncated ? items.slice(0, MAX) : items });
});

router.post('/alumnes-eso', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = esoBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId, anyCurs, nivell } = parsed.data;
  const items = await readEsoAlumnes({ spreadsheetId, nivell });

  let importats = 0; let duplicats = 0;
  await withTransaction(async (tx) => {
    await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
    for (const r of items) {
      const grupId = r.grup ? `${r.grup}_${anyCurs}` : null;
      if (grupId) {
        await tx.query(`INSERT INTO grups(grup_id, any_curs, curs, nom) VALUES ($1,$2,$3,$4) ON CONFLICT (grup_id) DO NOTHING`, [grupId, anyCurs, nivell, r.grup]);
      }
      // Buscar si ya existe alumno por nombre (heurística simple). Si no, crearlo.
      const existing = await tx.query<{ alumne_id: string }>('SELECT alumne_id FROM alumnes WHERE nom=$1', [r.nom]);
      let alumneId = existing.rows[0]?.alumne_id;
      if (!alumneId) {
        alumneId = ulid();
        await tx.query('INSERT INTO alumnes(alumne_id, nom) VALUES ($1,$2)', [alumneId, r.nom]);
      }
      // Matriculación en el curso
      await tx.query(
        `INSERT INTO alumnes_curs(id, alumne_id, any_curs, grup_id, estat)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (alumne_id, any_curs) DO UPDATE SET grup_id=EXCLUDED.grup_id, estat=EXCLUDED.estat, updated_at=NOW()`,
        [`${alumneId}_${anyCurs}`, alumneId, anyCurs, grupId, 'alta']
      );
      importats++;
    }
  });
  res.json({ importats, duplicats, status: 'ok' });
});

// ====== Entrevistes ESO: previsualització i import (tab per nivell)
function headerIndex(header: string[], keys: string[]): number {
  const lc = header.map(h => (h || '').toString().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase());
  for (const k of keys) {
    const nk = k.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
    const i = lc.indexOf(nk);
    if (i !== -1) return i;
  }
  return -1;
}

async function readEsoEntrevistes(params: { spreadsheetId: string; nivell: '1r'|'2n'|'3r'|'4t' }): Promise<Array<{ nom: string; when: string; acords: string; persones?: string }>> {
  const sheets = createSheetsClient();
  const tab = await findEsoTabTitle(params.spreadsheetId, params.nivell);
  // Leer un rango amplio y detectar cabeceras
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: params.spreadsheetId, range: `${tab}!A1:Z10000` });
  const values = r.data.values || [];
  if (values.length === 0) return [];
  // Buscar la primera fila que parezca cabecera
  let headerRow = 0;
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    const row = values[i] || [];
    const joined = row.join(' ').toLowerCase();
    if (/nom|alumne|persona/i.test(joined) && /(data|hora)/i.test(joined)) { headerRow = i; break; }
  }
  const header = values[headerRow] || [];
  const iNom = headerIndex(header, ['nom','alumne','alumne/a','nom i cognoms']);
  const iWhen = headerIndex(header, ['data i hora','data','hora','dia']);
  const iAcords = headerIndex(header, ['acords','acord','descripcio','descripció','notes']);
  const iPersones = headerIndex(header, ['persones reunides','persones','participants']);
  const out: Array<{ nom: string; when: string; acords: string; persones?: string }> = [];
  for (let rix = headerRow + 1; rix < values.length; rix++) {
    const row = values[rix] || [];
    const nom = String((iNom >= 0 ? row[iNom] : (row[0] || '')) || '').trim();
    const when = String((iWhen >= 0 ? row[iWhen] : '') || '').trim();
    const acords = String((iAcords >= 0 ? row[iAcords] : '') || '').trim();
    const persones = iPersones >= 0 ? String((row[iPersones] || '') || '').trim() : undefined;
    if (!nom && !acords) continue;
    out.push({ nom, when, acords, persones });
  }
  return out;
}

function shiftAnyCurs(anyCurs: string, negativeYears: number): string {
  // anyCurs formato "YYYY-YYYY"; restar N años
  const m = anyCurs.match(/^(\d{4})-(\d{4})$/);
  if (!m) return anyCurs;
  const a = parseInt(m[1], 10) - negativeYears;
  const b = parseInt(m[2], 10) - negativeYears;
  return `${a}-${b}`;
}

function pastLevels(nivell: '1r'|'2n'|'3r'|'4t'): Array<{ lvl: '1r'|'2n'|'3r'|'4t'; offset: number }> {
  switch (nivell) {
    case '2n': return [{ lvl: '1r', offset: 1 }];
    case '3r': return [{ lvl: '2n', offset: 1 }, { lvl: '1r', offset: 2 }];
    case '4t': return [{ lvl: '3r', offset: 1 }, { lvl: '2n', offset: 2 }, { lvl: '1r', offset: 3 }];
    default: return [];
  }
}

async function readEntrevistesWithHistoric(spreadsheetId: string, nivell: '1r'|'2n'|'3r'|'4t', anyCurs: string): Promise<Array<{ nom: string; when: string; acords: string; persones?: string; any: string }>> {
  const current = await readEsoEntrevistes({ spreadsheetId, nivell });
  const out: Array<{ nom: string; when: string; acords: string; persones?: string; any: string }>= [];
  // Actual
  for (const it of current) out.push({ ...it, any: anyCurs });
  // Históricos
  for (const h of pastLevels(nivell)) {
    // Para histórico, leer a partir de las primeras parejas D/E (índice 3)
    const byAlum = await readEsoEntrevistesByAlumne({ spreadsheetId, nivell: h.lvl, startColIndex: 3 });
    const rows = byAlum.flatMap(a => a.entrevistes.map(e => ({ nom: a.nom, when: e.when, acords: e.acords })));
    const anyPast = shiftAnyCurs(anyCurs, h.offset);
    for (const it of rows) out.push({ ...it, any: anyPast });
  }
  return out;
}

// Lectura agrupada per alumne: parelles Data(A partir de D), Acords(E), i així successivament (G/H, I/J, ...)
async function readEsoEntrevistesByAlumne(params: { spreadsheetId: string; nivell: '1r'|'2n'|'3r'|'4t', startColIndex?: number }): Promise<Array<{ nom: string; entrevistes: Array<{ when: string; acords: string }> }>> {
  const sheets = createSheetsClient();
  const tab = await findEsoTabTitle(params.spreadsheetId, params.nivell);
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: params.spreadsheetId, range: `${tab}!A1:Z10000` });
  const values = r.data.values || [];
  if (values.length === 0) return [];
  // Detectar fila de capçalera
  let headerRow = 0;
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    const row = values[i] || [];
    const joined = row.join(' ').toLowerCase();
    if (/nom|alumne/.test(joined)) { headerRow = i; break; }
  }
  const header = values[headerRow] || [];
  let iNom = headerIndex(header, ['nom','alumne','alumne/a','nom i cognoms']);
  if (iNom < 0) iNom = 0; // fallback a columna A
  const startCol = typeof params.startColIndex === 'number' ? params.startColIndex : 6; // G (0-based) por especificación
  const out: Array<{ nom: string; entrevistes: Array<{ when: string; acords: string }> }> = [];
  for (let rix = headerRow + 1; rix < values.length; rix++) {
    const row = values[rix] || [];
    const nom = String((row[iNom] || '') || '').trim();
    if (!nom) continue;
    const arr: Array<{ when: string; acords: string }> = [];
    for (let c = startCol; c < row.length; c += 2) {
      const when = String((row[c] || '') || '').trim();
      const acords = String((row[c + 1] || '') || '').trim();
      if (!when && !acords) continue;
      arr.push({ when, acords });
    }
    if (arr.length) out.push({ nom, entrevistes: arr });
  }
  return out;
}

router.post('/entrevistes-eso/preview', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = esoBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId, nivell, anyCurs } = parsed.data as any;
  try {
    const rows = anyCurs ? await readEntrevistesWithHistoric(spreadsheetId, nivell, anyCurs) : await readEsoEntrevistes({ spreadsheetId, nivell }).then(xs=>xs.map(x=>({ ...x, any: anyCurs })));
    const perAlumne = await readEsoEntrevistesByAlumne({ spreadsheetId, nivell, startColIndex: nivell === '1r' ? 6 : 6 });
    res.json({ total: rows.length, items: rows.slice(0, 200), truncated: rows.length > 200, byAlumne: perAlumne.slice(0, 200) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error preview entrevistes' });
  }
});

router.post('/entrevistes-eso', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = esoBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId, anyCurs, nivell } = parsed.data;
  try {
    const items = await readEntrevistesWithHistoric(spreadsheetId, nivell, anyCurs);
    let importats = 0; let senseId = 0;
    await withTransaction(async (tx) => {
      // Asegurar cursos de todos los anys referenciados
      const anys = Array.from(new Set(items.map(i => i.any)));
      for (const any of anys) {
        await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [any]);
      }
      for (const it of items) {
        // Buscar alumno por nombre dentro del curso correspondiente (case-insensitive)
        const q = await tx.query<{ alumne_id: string }>(
          `SELECT a.alumne_id
           FROM alumnes a
           JOIN alumnes_curs ac ON ac.alumne_id = a.alumne_id
           WHERE ac.any_curs = $1 AND lower(trim(a.nom)) = lower(trim($2))
           LIMIT 1`,
          [it.any, it.nom]
        );
        const alumneId = q.rows[0]?.alumne_id;
        if (!alumneId) { senseId++; continue; }
        const id = ulid();
        await tx.query(
          `INSERT INTO entrevistes(id, alumne_id, any_curs, data, acords, usuari_creador_id)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [id, alumneId, it.any, (it.when || new Date().toISOString().slice(0,10)), it.acords || null, 'import@system']
        );
        importats++;
      }
    });
    res.json({ importats, senseId, status: 'ok' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error import entrevistes' });
  }
});

// Importar entrevistes desde Sheets a BD
router.post('/entrevistes', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const { spreadsheetId, anyCurs } = parsed.data;
  const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);

  const entrevistes = await repo.listEntrevistes({ anyCurs });
  let importats = 0; let ignorades = 0;
  await withTransaction(async (tx) => {
    await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
    for (const e of entrevistes) {
      if (!e.id || !e.alumneId || !e.data) { ignorades++; continue; }
      await tx.query(
        `INSERT INTO entrevistes(id, alumne_id, any_curs, data, acords, usuari_creador_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET acords=EXCLUDED.acords, data=EXCLUDED.data, updated_at=NOW()`,
        [e.id, e.alumneId, anyCurs, e.data, e.acords || null, e.usuariCreadorId || null]
      );
      importats++;
    }
  });
  res.json({ importats, ignorades, status: 'ok' });
});

export default router;


