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

// Listar tutorías de alumnos (admin)
router.get('/tutories', requireRole(['admin']), async (_req: Request, res: Response) => {
  const r = await query<{ alumne_id: string; alumne_nom: string; alumne_email: string; tutor_email: string; any_curs: string }>(
    `SELECT ta.alumne_id, a.nom as alumne_nom, a.email as alumne_email, ta.tutor_email, ta.any_curs 
     FROM tutories_alumne ta
     LEFT JOIN alumnes a ON a.alumne_id = ta.alumne_id
     ORDER BY ta.any_curs, a.nom`
  );
  res.json(r.rows);
});

// Import CSV de tutorías alumno-tutor (admin)
// Columnas mínimas: anyCurs, alumne_email | alumne_nom, tutor_email
const importTutoriesSchema = z.object({ csvBase64: z.string() });
router.post('/tutories/import', requireRole(['admin']), async (req: Request, res: Response) => {
  const parsed = importTutoriesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
  const csvText = Buffer.from(parsed.data.csvBase64, 'base64').toString('utf8');
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return res.status(400).json({ error: 'CSV buit' });
  
  // Función para parsear CSV correctamente (maneja comas dentro de valores)
  function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
  
  // Función alternativa para CSV sin comillas (heurística: asume que los emails son las últimas columnas)
  function parseCSVLineHeuristic(line: string, expectedColumns: number): string[] {
    const parts = line.split(',');
    if (parts.length === expectedColumns) {
      return parts.map(p => p.trim());
    }
    // Si hay más partes que columnas esperadas, asume que las comas extra están en el nombre
    if (parts.length > expectedColumns) {
      const result = [];
      // Primera columna: anyCurs
      result.push(parts[0].trim());
      // Todo lo del medio: alumne_nom
      const middleParts = parts.slice(1, parts.length - 2);
      result.push(middleParts.join(',').trim());
      // Últimas dos columnas: alumne_mail, tutor_email
      result.push(parts[parts.length - 2].trim()); // alumne_mail
      result.push(parts[parts.length - 1].trim()); // tutor_email
      return result;
    }
    return parts.map(p => p.trim());
  }
  
  const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  console.log(`Header detectado: [${header.join(', ')}]`);
  const idx = (k: string) => header.indexOf(k);
  const iAny = idx('anycurs');
  const iAlumneEmail = Math.max(idx('alumne_email'), idx('alumne_mail'), idx('alumne_id')); // Aceptar alumne_id también
  const iAlumneNom = idx('alumne_nom');
  const iTutor = idx('tutor_email');
  
  console.log(`Índices detectados: anyCurs=${iAny}, alumneEmail=${iAlumneEmail}, alumneNom=${iAlumneNom}, tutor=${iTutor}`);
  if (iAny < 0 || iTutor < 0 || (iAlumneEmail < 0 && iAlumneNom < 0)) return res.status(400).json({ error: 'Capçaleres requerides: anyCurs,tutor_email,(alumne_email|alumne_mail|alumne_id|alumne_nom)' });

  let importats = 0; let ambigus = 0; let errors = 0;
  await withTransaction(async (tx) => {
    for (let r = 1; r < lines.length; r++) {
      let cols = parseCSVLine(lines[r]);
      // Si el parsing normal falla, usar heurística
      if (cols.length !== header.length) {
        cols = parseCSVLineHeuristic(lines[r], header.length);
      }
      if (cols.length < header.length) continue;
      const anyCurs = cols[iAny]?.trim();
      const tutor = cols[iTutor]?.trim().toLowerCase();
      if (!anyCurs || !tutor) { errors++; continue; }
      
      let alumneEmail = iAlumneEmail >= 0 ? cols[iAlumneEmail]?.trim().toLowerCase() : '';
      let alumneNom = '';
      let alumneId = '';
      
      if (!alumneEmail) {
        const nom = (iAlumneNom >= 0 ? cols[iAlumneNom] : '').trim();
        if (!nom) { errors++; continue; }
        alumneNom = nom;
        // Resolver por nombre dentro del curso (case-insensitive)
        const r = await tx.query<{ alumne_id: string }>(
          `SELECT a.alumne_id FROM alumnes a
           JOIN alumnes_curs ac ON ac.alumne_id = a.alumne_id
           WHERE ac.any_curs=$1 AND lower(trim(a.nom)) = lower(trim($2))`,
          [anyCurs, nom]
        );
        if (r.rowCount !== 1) { ambigus++; continue; }
        alumneId = r.rows[0].alumne_id;
      } else {
        // Si tenemos email, buscar el alumno por email o por nombre
        const r = await tx.query<{ alumne_id: string; nom: string }>(
          `SELECT a.alumne_id, a.nom FROM alumnes a
           JOIN alumnes_curs ac ON ac.alumne_id = a.alumne_id
           WHERE ac.any_curs=$1 AND (a.email=$2 OR lower(trim(a.nom)) = lower(trim($2)))`,
          [anyCurs, alumneEmail]
        );
        if (r.rowCount === 1) {
          alumneId = r.rows[0].alumne_id;
          alumneNom = r.rows[0].nom;
        } else {
          ambigus++; continue;
        }
      }
      
      // Debug: log para verificar los valores
      console.log(`Procesando fila ${r}: anyCurs=${anyCurs}, alumneEmail=${alumneEmail}, tutor=${tutor}`);
      console.log(`Columnas originales: [${cols.join(', ')}]`);
      console.log(`Header esperado: [${header.join(', ')}]`);
      
      await tx.query('INSERT INTO cursos(any_curs) VALUES ($1) ON CONFLICT (any_curs) DO NOTHING', [anyCurs]);
      
      // Asegurar que el tutor existe en la tabla usuaris
      await tx.query(
        `INSERT INTO usuaris(email, rol) VALUES ($1, 'docent') ON CONFLICT (email) DO NOTHING`,
        [tutor]
      );
      
      try {
        if (alumneId) {
          await tx.query(
            `INSERT INTO tutories_alumne(alumne_id, tutor_email, any_curs)
             VALUES($1,$2,$3)
             ON CONFLICT(alumne_id, any_curs) DO UPDATE SET tutor_email=EXCLUDED.tutor_email`,
            [alumneId, tutor, anyCurs]
          );
          importats++;
        } else {
          console.log(`No se encontró alumno: ${alumneEmail || alumneNom}`);
          errors++;
        }
      } catch (err: any) {
        console.error(`Error insertando tutoría para ${alumneEmail || alumneNom}:`, err.message);
        errors++;
      }
    }
  });

  res.json({ importats, ambigus, errors, status: 'ok' });
});

// DELETE /tutors/tutories - Eliminar todas las asignaciones de tutorías
router.delete('/tutories', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const result = await query('DELETE FROM tutories_alumne');
    res.json({ 
      eliminats: result.rowCount || 0,
      status: 'ok',
      message: 'Totes les assignacions de tutories han estat eliminades'
    });
  } catch (error: any) {
    console.error('Error eliminant tutories:', error);
    res.status(500).json({ error: 'Error eliminant les tutories' });
  }
});

// POST /tutors/asignar-manual - Asignar tutorías manualmente por nombre de alumno
router.post('/asignar-manual', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { tutorEmail, alumneNom, anyCurs } = req.body;
    
    if (!tutorEmail || !alumneNom || !anyCurs) {
      return res.status(400).json({ error: 'Falten dades requerides' });
    }

    // Buscar el alumno por nombre
    const alumneResult = await query<{ alumne_id: string }>(
      `SELECT a.alumne_id FROM alumnes a
       JOIN alumnes_curs ac ON ac.alumne_id = a.alumne_id
       WHERE ac.any_curs = $1 AND lower(trim(a.nom)) = lower(trim($2))`,
      [anyCurs, alumneNom]
    );

    if (alumneResult.rowCount !== 1) {
      return res.status(404).json({ error: `No s'ha trobat l'alumne: ${alumneNom}` });
    }

    const alumneId = alumneResult.rows[0].alumne_id;

    // Asegurar que el tutor existe
    await query(
      `INSERT INTO usuaris(email, rol) VALUES ($1, 'docent') ON CONFLICT (email) DO NOTHING`,
      [tutorEmail]
    );

    // Asignar tutoría
    await query(
      `INSERT INTO tutories_alumne(alumne_id, tutor_email, any_curs)
       VALUES($1,$2,$3)
       ON CONFLICT(alumne_id, any_curs) DO UPDATE SET tutor_email=EXCLUDED.tutor_email`,
      [alumneId, tutorEmail, anyCurs]
    );

    res.json({ 
      status: 'ok', 
      message: `Tutoria assignada: ${alumneNom} -> ${tutorEmail}` 
    });
  } catch (error: any) {
    console.error('Error assignant tutoria manual:', error);
    res.status(500).json({ error: 'Error assignant tutoria' });
  }
});

// GET /tutors/lista - Obtener lista de tutores únicos (admin)
router.get('/lista', requireRole(['admin']), async (_req: Request, res: Response) => {
  try {
    const result = await query<{ tutor_email: string; total_alumnes: number }>(`
      SELECT 
        ta.tutor_email,
        COUNT(DISTINCT ta.alumne_id) as total_alumnes
      FROM tutories_alumne ta
      GROUP BY ta.tutor_email
      ORDER BY ta.tutor_email
    `);
    
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint llista de tutors:', error);
    res.status(500).json({ error: 'Error obtenint llista de tutors' });
  }
});

// GET /tutors/alumnes/:tutorEmail - Obtener alumnos de un tutor específico (admin)
router.get('/alumnes/:tutorEmail', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.params.tutorEmail;
    const anyCurs = req.query.anyCurs as string || '2025-2026';
    
    const result = await query(`
      SELECT 
        a.alumne_id as id,
        a.nom,
        a.email,
        g.nom as grup_nom,
        g.curs,
        ac.any_curs,
        COUNT(e.id) as total_entrevistes
      FROM tutories_alumne ta
      JOIN alumnes a ON ta.alumne_id = a.alumne_id
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = ta.any_curs
      JOIN grups g ON ac.grup_id = g.grup_id
      LEFT JOIN entrevistes e ON a.alumne_id = e.alumne_id AND e.any_curs = ta.any_curs
      WHERE ta.tutor_email = $1 AND ta.any_curs = $2
      GROUP BY a.alumne_id, a.nom, a.email, g.nom, g.curs, ac.any_curs
      ORDER BY a.nom
    `, [tutorEmail, anyCurs]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint alumnes del tutor:', error);
    res.status(500).json({ error: 'Error obtenint alumnes del tutor' });
  }
});

// GET /tutors/mis-alumnes - Obtener alumnos del tutor actual
router.get('/mis-alumnes', requireAuth(), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.user?.email;
    if (!tutorEmail) {
      return res.status(401).json({ error: 'No autenticat' });
    }
    
    const anyCurs = req.query.anyCurs as string || '2025-2026';
    
    const result = await query(`
      SELECT 
        a.alumne_id as id,
        a.nom,
        a.email,
        g.nom as grup_nom,
        g.curs,
        ac.any_curs,
        COUNT(e.id) as total_entrevistes
      FROM tutories_alumne ta
      JOIN alumnes a ON ta.alumne_id = a.alumne_id
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = ta.any_curs
      JOIN grups g ON ac.grup_id = g.grup_id
      LEFT JOIN entrevistes e ON a.alumne_id = e.alumne_id AND e.any_curs = ta.any_curs
      WHERE ta.tutor_email = $1 AND ta.any_curs = $2
      GROUP BY a.alumne_id, a.nom, a.email, g.nom, g.curs, ac.any_curs
      ORDER BY a.nom
    `, [tutorEmail, anyCurs]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint alumnes del tutor:', error);
    res.status(500).json({ error: 'Error obtenint alumnes del tutor' });
  }
});

// GET /tutors/alumnes/:tutorEmail - Obtener alumnos asignados a un tutor
router.get('/alumnes/:tutorEmail', requireAuth(), async (req: Request, res: Response) => {
  try {
    const tutorEmail = req.params.tutorEmail;
    const anyCurs = req.query.anyCurs as string || '2025-2026';
    
    const result = await query(`
      SELECT 
        a.alumne_id as id,
        a.nom,
        a.email,
        g.nom as grup_nom,
        g.curs,
        ac.any_curs,
        COUNT(e.id) as total_entrevistes
      FROM tutories_alumne ta
      JOIN alumnes a ON ta.alumne_id = a.alumne_id
      JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = ta.any_curs
      JOIN grups g ON ac.grup_id = g.grup_id
      LEFT JOIN entrevistes e ON a.alumne_id = e.alumne_id AND e.any_curs = ta.any_curs
      WHERE ta.tutor_email = $1 AND ta.any_curs = $2
      GROUP BY a.alumne_id, a.nom, a.email, g.nom, g.curs, ac.any_curs
      ORDER BY a.nom
    `, [tutorEmail, anyCurs]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error obtenint alumnes del tutor:', error);
    res.status(500).json({ error: 'Error obtenint alumnes del tutor' });
  }
});

export default router;


