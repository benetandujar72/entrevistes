import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAnyActual, query } from '../db.js';
import { createSheetsClient } from '../sheets/client.js';
import { SheetsRepo } from '../sheets/repo.js';
import { z } from 'zod';
import { ulid } from 'ulid';

const router = Router();

// Endpoint para obtener todas las pestañas de un spreadsheet
router.get('/tabs/:spreadsheetId', async (req: Request, res: Response) => {
  try {
    const spreadsheetId = req.params.spreadsheetId;
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
    const tabs = await repo.getAllSheets();
    res.json({ tabs });
  } catch (error: any) {
    console.error('Error obteniendo pestañas:', error);
    res.status(500).json({ error: 'Error obteniendo pestañas', message: error.message });
  }
});

// Endpoint para obtener entrevistas por pestañas
router.get('/tabs/:spreadsheetId/entrevistes', async (req: Request, res: Response) => {
  try {
    const spreadsheetId = req.params.spreadsheetId;
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
    const tabsData = await repo.getAllEntrevistesByTabs();
    res.json({ tabsData });
  } catch (error: any) {
    console.error('Error obteniendo entrevistas por pestañas:', error);
    res.status(500).json({ error: 'Error obteniendo entrevistas', message: error.message });
  }
});

// Endpoint para obtener historial consolidado
router.get('/tabs/:spreadsheetId/historial', async (req: Request, res: Response) => {
  try {
    const spreadsheetId = req.params.spreadsheetId;
    const repo = new SheetsRepo(createSheetsClient(), spreadsheetId);
    const historial = await repo.getHistorialConsolidado();
    res.json({ historial });
  } catch (error: any) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error obteniendo historial', message: error.message });
  }
});

// Endpoint temporal de desarrollo para entrevistas sin autenticación
router.get('/dev', async (req: Request, res: Response) => {
  const alumneId = (req.query.alumneId as string) || undefined;
  const anyCurs = (req.query.anyCurs as string) || undefined;
  
  const where: string[] = [];
  const params: any[] = [];
  if (alumneId) { where.push(`e.alumne_id = $${params.length + 1}`); params.push(alumneId); }
  if (anyCurs) { where.push(`e.any_curs = $${params.length + 1}`); params.push(anyCurs); }
  
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const r = await query<{ 
    id: string; 
    alumne_id: string; 
    alumne_nom: string;
    any_curs: string; 
    data: string; 
    acords: string; 
    usuari_creador_id: string 
  }>(
    `SELECT e.id, e.alumne_id, a.nom as alumne_nom, e.any_curs, e.data, e.acords, e.usuari_creador_id 
     FROM entrevistes e
     LEFT JOIN alumnes a ON a.alumne_id = e.alumne_id
     ${whereClause} 
     ORDER BY e.data DESC`,
    params
  );
  
  const items = r.rows.map(row => ({
    id: row.id,
    alumneId: row.alumne_id,
    alumneNom: row.alumne_nom,
    anyCurs: row.any_curs,
    data: row.data,
    acords: row.acords,
    usuariCreadorId: row.usuari_creador_id
  }));
  
  res.json(items);
});

// Endpoint temporal de desarrollo para historial completo sin autenticación
router.get('/dev/historial/:alumneId', async (req: Request, res: Response) => {
  try {
    const alumneId = req.params.alumneId;
    const anyCurs = req.query.anyCurs as string;
    
    // 1. Obtener entrevistas normales de la BD
    const entrevistesNormales = await query<{
      id: string;
      alumne_id: string;
      any_curs: string;
      data: string;
      acords: string;
      usuari_creador_id: string;
      created_at: string;
    }>(`
      SELECT id, alumne_id, any_curs, data, acords, usuari_creador_id, created_at
      FROM entrevistes 
      WHERE alumne_id = $1 ${anyCurs ? 'AND any_curs = $2' : ''}
      ORDER BY data DESC
    `, anyCurs ? [alumneId, anyCurs] : [alumneId]);
    
    // 2. Obtener entrevistas consolidadas
    const entrevistesConsolidadas = await query<{
      id: string;
      alumne_id: string;
      curso_origen: string;
      pestana_origen: string;
      data_entrevista: string;
      acords: string;
      any_curs: string;
      created_at: string;
    }>(`
      SELECT id, alumne_id, curso_origen, pestana_origen, data_entrevista, acords, any_curs, created_at
      FROM entrevistes_consolidadas 
      WHERE alumne_id = $1 ${anyCurs ? 'AND any_curs = $2' : ''}
      ORDER BY data_entrevista DESC
    `, anyCurs ? [alumneId, anyCurs] : [alumneId]);
    
    // 3. Combinar y formatear resultados
    const historial = [
      // Entrevistas normales
      ...entrevistesNormales.rows.map(row => ({
        id: row.id,
        alumneId: row.alumne_id,
        anyCurs: row.any_curs,
        data: row.data,
        acords: row.acords,
        usuariCreadorId: row.usuari_creador_id,
        tipo: 'normal' as const,
        origen: 'Sistema actual',
        created_at: row.created_at
      })),
      // Entrevistas consolidadas
      ...entrevistesConsolidadas.rows.map(row => ({
        id: row.id,
        alumneId: row.alumne_id,
        anyCurs: row.any_curs,
        data: row.data_entrevista,
        acords: row.acords,
        usuariCreadorId: null,
        tipo: 'consolidada' as const,
        origen: `${row.curso_origen} - ${row.pestana_origen}`,
        created_at: row.created_at
      }))
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    res.json(historial);
  } catch (error) {
    console.error('Error obteniendo historial de entrevistas:', error);
    res.status(500).json({ error: 'Error obteniendo historial de entrevistas' });
  }
});

router.use(requireAuth());

router.get('/', async (req: Request, res: Response) => {
  const alumneId = (req.query.alumneId as string) || undefined;
  const anyCurs = (req.query.anyCurs as string) || undefined;
  const fromDb = (req.query.fromDb as string) === 'true';
  
  // Si se solicita desde BD, usar consulta directa
  if (fromDb) {
    const where: string[] = [];
    const params: any[] = [];
    if (alumneId) { where.push(`alumne_id = $${params.length + 1}`); params.push(alumneId); }
    if (anyCurs) { where.push(`any_curs = $${params.length + 1}`); params.push(anyCurs); }
    
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const r = await query<{ id: string; alumne_id: string; any_curs: string; data: string; acords: string; usuari_creador_id: string }>(
      `SELECT id, alumne_id, any_curs, data, acords, usuari_creador_id FROM entrevistes ${whereClause} ORDER BY data DESC`,
      params
    );
    
    const items = r.rows.map(row => ({
      id: row.id,
      alumneId: row.alumne_id,
      anyCurs: row.any_curs,
      data: row.data,
      acords: row.acords,
      usuariCreadorId: row.usuari_creador_id
    }));
    
    res.json(items);
    return;
  }
  
  // Código original para Sheets
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

// GET /entrevistes/admin/todas - Obtener todas las entrevistas de todos los alumnos (solo admin)
router.get('/admin/todas', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    // Si se proporciona un curso (1r, 2n, 3r, 4t), convertir al año académico actual
    let anyCurs = req.query.anyCurs as string;
    if (anyCurs && ['1r', '2n', '3r', '4t'].includes(anyCurs)) {
      anyCurs = '2025-2026'; // Convertir curso a año académico actual
    }
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    
    // 1. Obtener entrevistas normales de la BD con grupo del alumno
    const entrevistesNormales = await query<{
      id: string;
      alumne_id: string;
      alumne_nom: string;
      any_curs: string;
      data: string;
      acords: string;
      usuari_creador_id: string;
      created_at: string;
      alumne_grup: string | null;
    }>(`
      SELECT e.id, e.alumne_id, a.nom as alumne_nom, e.any_curs, e.data, e.acords, e.usuari_creador_id, e.created_at,
             g.nom as alumne_grup
      FROM entrevistes e
      LEFT JOIN alumnes a ON a.alumne_id = e.alumne_id
      LEFT JOIN alumnes_curs ac ON ac.alumne_id = e.alumne_id AND ac.any_curs = e.any_curs
      LEFT JOIN grups g ON g.grup_id = ac.grup_id
      ${anyCurs ? 'WHERE e.any_curs = $1' : ''}
      ORDER BY e.data DESC
      LIMIT $${anyCurs ? '2' : '1'} OFFSET $${anyCurs ? '3' : '2'}
    `, anyCurs ? [anyCurs, limit, offset] : [limit, offset]);
    
    // 2. Obtener entrevistas consolidadas con grupo del alumno
    const entrevistesConsolidadas = await query<{
      id: string;
      alumne_id: string;
      alumne_nom: string;
      curso_origen: string;
      pestana_origen: string;
      data_entrevista: string;
      acords: string;
      any_curs: string;
      created_at: string;
      alumne_grup: string | null;
    }>(`
      SELECT ec.id, ec.alumne_id, a.nom as alumne_nom, ec.curso_origen, ec.pestana_origen, 
             ec.data_entrevista, ec.acords, ec.any_curs, ec.created_at,
             g.nom as alumne_grup
      FROM entrevistes_consolidadas ec
      LEFT JOIN alumnes a ON a.alumne_id = ec.alumne_id
      LEFT JOIN alumnes_curs ac ON ac.alumne_id = ec.alumne_id AND ac.any_curs = ec.any_curs
      LEFT JOIN grups g ON g.grup_id = ac.grup_id
      ${anyCurs ? 'WHERE ec.any_curs = $1' : ''}
      ORDER BY ec.data_entrevista DESC
      LIMIT $${anyCurs ? '2' : '1'} OFFSET $${anyCurs ? '3' : '2'}
    `, anyCurs ? [anyCurs, limit, offset] : [limit, offset]);
    
    // 3. Combinar y formatear resultados
    const todasLasEntrevistas = [
      // Entrevistas normales
      ...entrevistesNormales.rows.map(row => ({
        id: row.id,
        alumneId: row.alumne_id,
        alumneNom: row.alumne_nom,
        alumneGrup: row.alumne_grup,
        anyCurs: row.any_curs,
        data: row.data,
        acords: row.acords,
        usuariCreadorId: row.usuari_creador_id,
        tipo: 'normal' as const,
        origen: 'Sistema actual',
        created_at: row.created_at
      })),
      // Entrevistas consolidadas
      ...entrevistesConsolidadas.rows.map(row => ({
        id: row.id,
        alumneId: row.alumne_id,
        alumneNom: row.alumne_nom,
        alumneGrup: row.alumne_grup,
        anyCurs: row.any_curs,
        data: row.data_entrevista,
        acords: row.acords,
        usuariCreadorId: null,
        tipo: 'consolidada' as const,
        origen: `${row.curso_origen} - ${row.pestana_origen}`,
        created_at: row.created_at
      }))
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    // 4. Obtener totales para paginación
    const totalNormales = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM entrevistes ${anyCurs ? 'WHERE any_curs = $1' : ''}
    `, anyCurs ? [anyCurs] : []);
    
    const totalConsolidadas = await query<{ count: string }>(`
      SELECT COUNT(*) as count FROM entrevistes_consolidadas ${anyCurs ? 'WHERE any_curs = $1' : ''}
    `, anyCurs ? [anyCurs] : []);
    
    const total = parseInt(totalNormales.rows[0]?.count || '0') + parseInt(totalConsolidadas.rows[0]?.count || '0');
    
    res.json({
      entrevistas: todasLasEntrevistas,
      paginacion: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    console.error('Error obteniendo todas las entrevistas:', error);
    res.status(500).json({ error: 'Error obteniendo todas las entrevistas' });
  }
});

// GET /entrevistes/historial/:alumneId - Obtener historial completo de entrevistas de un alumno
router.get('/historial/:alumneId', async (req: Request, res: Response) => {
  try {
    const alumneId = req.params.alumneId;
    const anyCurs = req.query.anyCurs as string;
    
    // 1. Obtener entrevistas normales de la BD
    const entrevistesNormales = await query<{
      id: string;
      alumne_id: string;
      any_curs: string;
      data: string;
      acords: string;
      usuari_creador_id: string;
      created_at: string;
    }>(`
      SELECT id, alumne_id, any_curs, data, acords, usuari_creador_id, created_at
      FROM entrevistes 
      WHERE alumne_id = $1 ${anyCurs ? 'AND any_curs = $2' : ''}
      ORDER BY data DESC
    `, anyCurs ? [alumneId, anyCurs] : [alumneId]);
    
    // 2. Obtener entrevistas consolidadas
    const entrevistesConsolidadas = await query<{
      id: string;
      alumne_id: string;
      curso_origen: string;
      pestana_origen: string;
      data_entrevista: string;
      acords: string;
      any_curs: string;
      created_at: string;
    }>(`
      SELECT id, alumne_id, curso_origen, pestana_origen, data_entrevista, acords, any_curs, created_at
      FROM entrevistes_consolidadas 
      WHERE alumne_id = $1 ${anyCurs ? 'AND any_curs = $2' : ''}
      ORDER BY data_entrevista DESC
    `, anyCurs ? [alumneId, anyCurs] : [alumneId]);
    
    // 3. Combinar y formatear resultados
    const historial = [
      // Entrevistas normales
      ...entrevistesNormales.rows.map(row => ({
        id: row.id,
        alumneId: row.alumne_id,
        anyCurs: row.any_curs,
        data: row.data,
        acords: row.acords,
        usuariCreadorId: row.usuari_creador_id,
        tipo: 'normal' as const,
        origen: 'Sistema actual',
        created_at: row.created_at
      })),
      // Entrevistas consolidadas
      ...entrevistesConsolidadas.rows.map(row => ({
        id: row.id,
        alumneId: row.alumne_id,
        anyCurs: row.any_curs,
        data: row.data_entrevista,
        acords: row.acords,
        usuariCreadorId: null,
        tipo: 'consolidada' as const,
        origen: `${row.curso_origen} - ${row.pestana_origen}`,
        created_at: row.created_at
      }))
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    res.json(historial);
  } catch (error) {
    console.error('Error obteniendo historial de entrevistas:', error);
    res.status(500).json({ error: 'Error obteniendo historial de entrevistas' });
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

// GET /entrevistes/db/:id - Obtener una entrevista específica de la base de datos
router.get('/db/:id', requireAuth(), async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    // Primero obtener la entrevista básica
    const result = await query(`
      SELECT * FROM entrevistes WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrevista no trobada' });
    }

    const entrevista = result.rows[0];
    
    // Obtener información del alumno
    const alumneResult = await query(`
      SELECT nom FROM alumnes WHERE alumne_id = $1
    `, [entrevista.alumne_id]);
    
    const alumneNom = alumneResult.rows[0]?.nom || 'Alumne desconegut';
    
    // Obtener información del grupo
    const grupResult = await query(`
      SELECT g.nom as grup_nom, g.curs
      FROM alumnes_curs ac
      JOIN grups g ON ac.grup_id = g.grup_id
      WHERE ac.alumne_id = $1 AND ac.any_curs = $2
    `, [entrevista.alumne_id, entrevista.any_curs]);
    
    const grupInfo = grupResult.rows[0] || { grup_nom: 'Grup desconegut', curs: 'Curs desconegut' };

    res.json({
      id: entrevista.id,
      alumneId: entrevista.alumne_id,
      alumneNom: alumneNom,
      grup: grupInfo.grup_nom,
      anyCurs: entrevista.any_curs,
      data: entrevista.data,
      acords: entrevista.acords,
      usuariCreadorId: entrevista.usuari_creador_id,
      createdAt: entrevista.created_at,
      updatedAt: entrevista.updated_at
    });
  } catch (error: any) {
    console.error('Error obtenint entrevista:', error);
    res.status(500).json({ error: 'Error obtenint l\'entrevista' });
  }
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
  // Si és docent, validar que pot crear per aquest alumne (grup assignat o tutor)
  if (req.user?.role === 'docent') {
    const email = req.user.email;
    const alumneId = parsed.data.alumneId;
    // Comprovar tutoría directa
    const t = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM tutories_alumne WHERE alumne_id=$1 AND any_curs=$2 AND tutor_email=$3
       ) AS exists`,
      [alumneId, anyActual, email]
    );
    let allowed = t.rows[0]?.exists === true;
    if (!allowed) {
      // Comprovar assignació a grup de l'alumne en el curs actual
      const r = await query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1
           FROM alumnes_curs ac
           JOIN assignacions_docent_grup adg ON adg.grup_id = ac.grup_id AND adg.any_curs = ac.any_curs AND adg.email = $3
           WHERE ac.alumne_id = $1 AND ac.any_curs = $2
         ) AS exists`,
        [alumneId, anyActual, email]
      );
      allowed = r.rows[0]?.exists === true;
    }
    if (!allowed) return res.status(403).json({ error: 'Permís denegat' });
  }
  // Crear a Sheets
  const id = await repo.createEntrevista({ alumneId: parsed.data.alumneId, data: parsed.data.data, acords: parsed.data.acords, usuariCreadorId: req.user!.email });
  // Persistir també a BD (millor consistència per llistats històrics)
  try {
    await query(
      `INSERT INTO entrevistes(id, alumne_id, any_curs, data, acords, usuari_creador_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [id, parsed.data.alumneId, anyActual, parsed.data.data, parsed.data.acords || null, req.user!.email]
    );
  } catch {}
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

// PUT /entrevistes/:id - Actualizar entrevista en base de datos
router.put('/db/:id', requireAuth(), async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { data, acords } = req.body;
    
    // Validar datos requeridos
    if (!data || !acords) {
      return res.status(400).json({ error: 'Falten dades obligatòries (data, acords)' });
    }

    // Verificar que la entrevista existe
    const result = await query(`
      SELECT id, alumne_id, any_curs, usuari_creador_id 
      FROM entrevistes 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrevista no trobada' });
    }

    const entrevista = result.rows[0];
    const anyActual = await getAnyActual();

    // Verificar permisos (solo el creador o admin puede editar)
    const isAuthor = entrevista.usuari_creador_id?.toLowerCase() === req.user!.email;
    const isCurrentYear = entrevista.any_curs === anyActual;
    
    if (!isAuthor && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'No tens permisos per editar aquesta entrevista' });
    }

    if (!isCurrentYear && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Només es poden editar entrevistes de l\'any actual' });
    }

    // Actualizar la entrevista en la base de datos
    await query(`
      UPDATE entrevistes 
      SET data = $1, acords = $2, updated_at = NOW()
      WHERE id = $3
    `, [data, acords, id]);

    // Obtener información del alumno para sincronizar con Google Sheets
    const alumneResult = await query(`
      SELECT nom FROM alumnes WHERE alumne_id = $1
    `, [entrevista.alumne_id]);
    
    const alumneNom = alumneResult.rows[0]?.nom || 'Alumne desconegut';
    
    // Obtener información del grupo
    const grupResult = await query(`
      SELECT g.nom as grup_nom
      FROM alumnes_curs ac
      JOIN grups g ON ac.grup_id = g.grup_id
      WHERE ac.alumne_id = $1 AND ac.any_curs = $2
    `, [entrevista.alumne_id, entrevista.any_curs]);
    
    const grupInfo = grupResult.rows[0] || { grup_nom: 'Grup desconegut' };

    // Sincronizar con Google Sheets
    try {
      await actualizarEntrevistaEnSheets(entrevista.alumne_id, alumneNom, grupInfo.grup_nom, data, acords);
      console.log(`Entrevista ${id} actualitzada i sincronitzada amb Google Sheets`);
    } catch (sheetsError: any) {
      console.error('Error sincronitzant amb Google Sheets:', sheetsError);
      // No fallar la operación si hay error en Sheets, solo loguear
    }

    res.json({ 
      id, 
      status: 'updated',
      message: 'Entrevista actualitzada correctament'
    });
    
  } catch (error: any) {
    console.error('Error actualitzant entrevista:', error);
    res.status(500).json({ error: 'Error actualitzant l\'entrevista' });
  }
});

// DELETE /entrevistes/db/:id - Borrar entrevista de la base de datos y Google Sheets
router.delete('/db/:id', requireAuth(), async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // Verificar que la entrevista existe
    const result = await query(`
      SELECT id, alumne_id, any_curs, usuari_creador_id 
      FROM entrevistes 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entrevista no trobada' });
    }

    const entrevista = result.rows[0];
    const anyActual = await getAnyActual();

    // Verificar permisos (solo el creador o admin puede borrar)
    const isAuthor = entrevista.usuari_creador_id?.toLowerCase() === req.user!.email;
    const isCurrentYear = entrevista.any_curs === anyActual;
    
    if (!isAuthor && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'No tens permisos per borrar aquesta entrevista' });
    }

    if (!isCurrentYear && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Només es poden borrar entrevistes de l\'any actual' });
    }

    // Obtener información del alumno para sincronizar con Google Sheets
    const alumneResult = await query(`
      SELECT nom FROM alumnes WHERE alumne_id = $1
    `, [entrevista.alumne_id]);
    
    const alumneNom = alumneResult.rows[0]?.nom || 'Alumne desconegut';
    
    // Obtener información del grupo
    const grupResult = await query(`
      SELECT g.nom as grup_nom
      FROM alumnes_curs ac
      JOIN grups g ON ac.grup_id = g.grup_id
      WHERE ac.alumne_id = $1 AND ac.any_curs = $2
    `, [entrevista.alumne_id, entrevista.any_curs]);
    
    const grupInfo = grupResult.rows[0] || { grup_nom: 'Grup desconegut' };

    // Borrar de Google Sheets primero
    try {
      await borrarEntrevistaDeSheets(entrevista.alumne_id, alumneNom, grupInfo.grup_nom);
      console.log(`Entrevista ${id} borrada de Google Sheets`);
    } catch (sheetsError: any) {
      console.error('Error borrant de Google Sheets:', sheetsError);
      // Continuar con el borrado de la base de datos aunque falle Sheets
    }

    // Borrar de la base de datos
    await query(`
      DELETE FROM entrevistes WHERE id = $1
    `, [id]);

    res.json({ 
      id, 
      status: 'deleted',
      message: 'Entrevista borrada correctament'
    });
    
  } catch (error: any) {
    console.error('Error borrant entrevista:', error);
    res.status(500).json({ error: 'Error borrant l\'entrevista' });
  }
});

// POST /entrevistes/nova - Crear nueva entrevista
router.post('/nova', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { alumneId, alumneNom, grup, curs, data, acords } = req.body;
    
    // Validar datos requeridos
    if (!alumneId || !data || !acords) {
      return res.status(400).json({ error: 'Falten dades obligatòries' });
    }

    const anyActual = await getAnyActual();
    const entrevistaId = ulid();
    
    // Insertar en la base de datos
    await query(`
      INSERT INTO entrevistes (id, alumne_id, any_curs, data, acords, usuari_creador_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [entrevistaId, alumneId, anyActual, data, acords, req.user!.email]);

    // Insertar en Google Sheets
    try {
      await insertarEntrevistaEnSheets(alumneId, alumneNom, grup, data, acords);
    } catch (sheetsError: any) {
      console.error('Error insertant en Google Sheets:', sheetsError);
      // No fallar la operación si hay error en Sheets, solo loguear
    }
    
    res.json({ 
      id: entrevistaId, 
      status: 'created',
      message: 'Entrevista creada correctament'
    });
    
  } catch (error: any) {
    console.error('Error creant entrevista:', error);
    res.status(500).json({ error: 'Error creant l\'entrevista' });
  }
});

// Función para insertar entrevista en Google Sheets
async function insertarEntrevistaEnSheets(alumneId: string, alumneNom: string, grup: string, data: string, acords: string) {
  // Obtener configuración de pestañas para el curso actual
  const cursoActual = await obtenerCursoActualDelAlumne(alumneId);
  if (!cursoActual) {
    throw new Error('No s\'ha pogut determinar el curs actual de l\'alumne');
  }

  // Obtener configuración de pestañas para este curso
  const configPestanas = await query(`
    SELECT pestana_nombre, spreadsheet_id 
    FROM curso_pestanas 
    WHERE curso_nombre = $1 AND activo = true
    ORDER BY orden
  `, [cursoActual]);

  if (configPestanas.rows.length === 0) {
    throw new Error(`No hi ha configuració de pestañas per al curs ${cursoActual}`);
  }

  // Usar la primera pestaña disponible
  const pestana = configPestanas.rows[0];
  const spreadsheetId = pestana.spreadsheet_id;
  const pestanaNombre = pestana.pestana_nombre;

  // Crear cliente de Sheets
  const sheetsClient = createSheetsClient();
  const repo = new SheetsRepo(sheetsClient, spreadsheetId);

  // Obtener datos de la pestaña
  const datosPestana = await repo.getSheetData(pestanaNombre);
  if (!datosPestana || datosPestana.length === 0) {
    throw new Error(`No s\'han pogut obtenir dades de la pestaña ${pestanaNombre}`);
  }

  // Buscar la fila del alumno
  const filaAlumne = await buscarFilaAlumne(datosPestana, alumneNom, grup);
  if (!filaAlumne) {
    throw new Error(`No s\'ha trobat l\'alumne ${alumneNom} al grup ${grup}`);
  }

  // Encontrar la primera columna libre para entrevistas (empezando desde columna G, índice 6)
  const columnaLibre = await encontrarPrimeraColumnaLibre(datosPestana[filaAlumne], 6);
  
  console.log(`Insertant entrevista per a ${alumneNom} a la fila ${filaAlumne + 1}, columnes ${columnaLibre + 1}-${columnaLibre + 2}`);
  console.log(`Dades: data=${data}, acords=${acords.substring(0, 50)}...`);
  
  // Insertar la entrevista en la columna libre (G=7, H=8, etc.)
  await repo.updateCell(spreadsheetId, pestanaNombre, filaAlumne + 1, columnaLibre + 1, data);
  await repo.updateCell(spreadsheetId, pestanaNombre, filaAlumne + 1, columnaLibre + 2, acords);

  console.log(`Entrevista insertada per a ${alumneNom} a la columna ${columnaLibre + 1}`);
}

// Función para obtener el curso actual del alumno
async function obtenerCursoActualDelAlumne(alumneId: string): Promise<string | null> {
  const result = await query(`
    SELECT g.curs 
    FROM alumnes_curs ac 
    JOIN grups g ON ac.grup_id = g.grup_id 
    WHERE ac.alumne_id = $1 AND ac.any_curs = (SELECT any_curs FROM cursos WHERE activo = true LIMIT 1)
    LIMIT 1
  `, [alumneId]);

  return result.rows[0]?.curs || null;
}

// Función para buscar la fila del alumno
async function buscarFilaAlumne(datos: any[][], nomAlumne: string, grup: string): Promise<number | null> {
  console.log(`Buscant alumne: "${nomAlumne}" al grup "${grup}"`);
  
  for (let i = 0; i < datos.length; i++) {
    const fila = datos[i];
    const nom = fila[2]?.toString().trim(); // Columna C (índice 2) = NOM
    const grupFila = fila[1]?.toString().trim(); // Columna B (índice 1) = GRUP
    
    console.log(`Fila ${i}: nom="${nom}", grup="${grupFila}"`);
    
    if (nom && grupFila && nom.toLowerCase() === nomAlumne.toLowerCase() && grupFila === grup) {
      console.log(`Trobat alumne a la fila ${i}`);
      return i;
    }
  }
  
  console.log(`No s'ha trobat l'alumne "${nomAlumne}" al grup "${grup}"`);
  return null;
}

// Función para encontrar la primera columna libre
async function encontrarPrimeraColumnaLibre(fila: any[], columnaInicio: number): Promise<number> {
  console.log(`Buscant columna lliure a partir de la columna ${columnaInicio}`);
  console.log(`Contingut de la fila:`, fila);
  
  for (let i = columnaInicio; i < fila.length; i += 2) {
    const fecha = fila[i];
    const acuerdos = fila[i + 1];
    
    console.log(`Columna ${i}: fecha="${fecha}", acuerdos="${acuerdos}"`);
    
    if (!fecha && !acuerdos) {
      console.log(`Columna lliure trobada: ${i}`);
      return i;
    }
  }
  
  // Si no hay columnas libres, devolver la siguiente posición
  console.log(`No hi ha columnes lliures, retornant: ${fila.length}`);
  return fila.length;
}

// Función para actualizar entrevista en Google Sheets
async function actualizarEntrevistaEnSheets(alumneId: string, alumneNom: string, grup: string, data: string, acords: string) {
  // Obtener configuración de pestañas para el curso actual
  const cursoActual = await obtenerCursoActualDelAlumne(alumneId);
  if (!cursoActual) {
    throw new Error('No s\'ha pogut determinar el curs actual de l\'alumne');
  }

  // Obtener configuración de pestañas para este curso
  const configPestanas = await query(`
    SELECT pestana_nombre, spreadsheet_id 
    FROM curso_pestanas 
    WHERE curso_nombre = $1 AND activo = true
    ORDER BY orden
  `, [cursoActual]);

  if (configPestanas.rows.length === 0) {
    throw new Error(`No hi ha configuració de pestañas per al curs ${cursoActual}`);
  }

  // Usar la primera pestaña disponible
  const pestana = configPestanas.rows[0];
  const spreadsheetId = pestana.spreadsheet_id;
  const pestanaNombre = pestana.pestana_nombre;

  // Crear cliente de Sheets
  const sheetsClient = createSheetsClient();
  const repo = new SheetsRepo(sheetsClient, spreadsheetId);

  // Obtener datos de la pestaña
  const datosPestana = await repo.getSheetData(pestanaNombre);
  if (!datosPestana || datosPestana.length === 0) {
    throw new Error(`No s\'han pogut obtenir dades de la pestaña ${pestanaNombre}`);
  }

  // Buscar la fila del alumno
  const filaAlumne = await buscarFilaAlumne(datosPestana, alumneNom, grup);
  if (!filaAlumne) {
    throw new Error(`No s\'ha trobat l\'alumne ${alumneNom} al grup ${grup}`);
  }

  // Buscar la primera columna con datos (para actualizar en lugar de insertar)
  let columnaActualizar = -1;
  for (let i = 6; i < datosPestana[filaAlumne].length; i += 2) {
    const fecha = datosPestana[filaAlumne][i];
    const acuerdos = datosPestana[filaAlumne][i + 1];
    
    if (fecha || acuerdos) {
      columnaActualizar = i;
      break;
    }
  }

  if (columnaActualizar === -1) {
    // Si no hay datos, usar la primera columna libre
    columnaActualizar = await encontrarPrimeraColumnaLibre(datosPestana[filaAlumne], 6);
  }

  console.log(`Actualitzant entrevista per a ${alumneNom} a la fila ${filaAlumne + 1}, columnes ${columnaActualizar + 1}-${columnaActualizar + 2}`);
  console.log(`Dades: data=${data}, acords=${acords.substring(0, 50)}...`);
  
  // Actualizar la entrevista en Google Sheets
  await repo.updateCell(spreadsheetId, pestanaNombre, filaAlumne + 1, columnaActualizar + 1, data);
  await repo.updateCell(spreadsheetId, pestanaNombre, filaAlumne + 1, columnaActualizar + 2, acords);

  console.log(`Entrevista actualitzada per a ${alumneNom} a la columna ${columnaActualizar + 1}`);
}

// Función para borrar entrevista de Google Sheets
async function borrarEntrevistaDeSheets(alumneId: string, alumneNom: string, grup: string) {
  // Obtener configuración de pestañas para el curso actual
  const cursoActual = await obtenerCursoActualDelAlumne(alumneId);
  if (!cursoActual) {
    throw new Error('No s\'ha pogut determinar el curs actual de l\'alumne');
  }

  // Obtener configuración de pestañas para este curso
  const configPestanas = await query(`
    SELECT pestana_nombre, spreadsheet_id 
    FROM curso_pestanas 
    WHERE curso_nombre = $1 AND activo = true
    ORDER BY orden
  `, [cursoActual]);

  if (configPestanas.rows.length === 0) {
    throw new Error(`No hi ha configuració de pestañas per al curs ${cursoActual}`);
  }

  // Usar la primera pestaña disponible
  const pestana = configPestanas.rows[0];
  const spreadsheetId = pestana.spreadsheet_id;
  const pestanaNombre = pestana.pestana_nombre;

  // Crear cliente de Sheets
  const sheetsClient = createSheetsClient();
  const repo = new SheetsRepo(sheetsClient, spreadsheetId);

  // Obtener datos de la pestaña
  const datosPestana = await repo.getSheetData(pestanaNombre);
  if (!datosPestana || datosPestana.length === 0) {
    throw new Error(`No s\'han pogut obtenir dades de la pestaña ${pestanaNombre}`);
  }

  // Buscar la fila del alumno
  const filaAlumne = await buscarFilaAlumne(datosPestana, alumneNom, grup);
  if (!filaAlumne) {
    throw new Error(`No s\'ha trobat l\'alumne ${alumneNom} al grup ${grup}`);
  }

  // Buscar la primera columna con datos para borrar
  let columnaBorrar = -1;
  for (let i = 6; i < datosPestana[filaAlumne].length; i += 2) {
    const fecha = datosPestana[filaAlumne][i];
    const acuerdos = datosPestana[filaAlumne][i + 1];
    
    if (fecha || acuerdos) {
      columnaBorrar = i;
      break;
    }
  }

  if (columnaBorrar === -1) {
    console.log(`No s'han trobat dades per borrar per a ${alumneNom}`);
    return;
  }

  console.log(`Borrant entrevista per a ${alumneNom} a la fila ${filaAlumne + 1}, columnes ${columnaBorrar + 1}-${columnaBorrar + 2}`);
  
  // Borrar la entrevista en Google Sheets (poner celdas vacías)
  await repo.updateCell(spreadsheetId, pestanaNombre, filaAlumne + 1, columnaBorrar + 1, '');
  await repo.updateCell(spreadsheetId, pestanaNombre, filaAlumne + 1, columnaBorrar + 2, '');

  console.log(`Entrevista borrada per a ${alumneNom} a la columna ${columnaBorrar + 1}`);
}

export default router;


