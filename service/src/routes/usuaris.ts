import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { query } from '../db.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth());

// Identidad del usuario autenticado
router.get('/me', async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(403).json({ error: 'Permís denegat' });
    // Confirmar rol desde BD si es posible
    try {
      const r = await query<{ rol: 'docent' | 'admin' }>('SELECT rol FROM usuaris WHERE email=$1', [req.user.email]);
      if (r.rowCount && (r.rows[0].rol === 'admin' || r.rows[0].rol === 'docent')) {
        return res.json({ email: req.user.email, role: r.rows[0].rol });
      }
    } catch {}
    return res.json({ email: req.user.email, role: req.user.role });
  } catch (e) {
    return res.status(500).json({ error: 'Error intern' });
  }
});

const upsertSchema = z.object({
  email: z.string().email(),
  rol: z.enum(['admin', 'docent'])
});

// Crear/actualizar usuario y rol (solo admin)
router.post('/', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dades requerides incompletes' });
    const { email, rol } = parsed.data;
    await query(
      `INSERT INTO usuaris(email, rol) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol`,
      [email.toLowerCase(), rol]
    );
    res.status(201).json({ email: email.toLowerCase(), rol });
  } catch (err) {
    res.status(500).json({ error: 'Error intern' });
  }
});

// Listar usuarios (solo admin)
router.get('/', requireRole(['admin']), async (_req: Request, res: Response) => {
  try {
    const r = await query<{ email: string; rol: 'admin' | 'docent' }>('SELECT email, rol FROM usuaris ORDER BY email ASC');
    res.json(r.rows);
  } catch (err) {
    // si no existe la tabla, devolver vacío para no tumbar el servicio
    res.json([]);
  }
});

router.post('/seed-admin', async (req: Request, res: Response) => {
  try {
    // Crear tabla si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS usuaris (
        email TEXT PRIMARY KEY,
        rol TEXT NOT NULL CHECK (rol IN ('admin','docent'))
      );
    `);
    // Solo permitir si no hay usuarios admin todavía
    const r = await query<{ count: number }>('SELECT COUNT(*)::int as count FROM usuaris WHERE rol = $1', ['admin']);
    const count = (r.rows[0]?.count as unknown as number) || 0;
    if (count > 0) return res.status(200).json({ status: 'exists' });

    const email = (req.body?.email as string) || process.env.SEED_ADMIN_EMAIL || 'admin@insbitacola.cat';
    await query('INSERT INTO usuaris(email, rol) VALUES($1, $2) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol', [email, 'admin']);
    return res.json({ status: 'created', email });
  } catch (e: any) {
    console.error('Seed admin error', e);
    return res.status(500).json({ error: 'Error creant admin' });
  }
});

export default router;


