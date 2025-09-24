import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Request, Response, NextFunction } from 'express';
import { query } from '../db.js';

const clientId = process.env.GOOGLE_CLIENT_ID || '';
const allowedDomain = process.env.ALLOWED_DOMAIN || 'insbitacola.cat';
const oauthClient = new OAuth2Client(clientId);

export interface AuthUser {
  email: string;
  role: 'docent' | 'admin';
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DISABLE_AUTH === '1') {
      req.user = { email: 'benet.andujar@insbitacola.cat', role: 'admin' };
      return next();
    }
    try {
      const idToken = (req.headers['x-id-token'] || req.headers.authorization || '').toString().replace('Bearer ', '');
      if (!idToken) return res.status(403).json({ error: 'Permís denegat' });
      const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
      const payload = ticket.getPayload() as TokenPayload | undefined;
      if (!payload?.email) return res.status(403).json({ error: 'Permís denegat' });
      const email = payload.email.toLowerCase();
      if (!email.endsWith('@' + allowedDomain)) return res.status(403).json({ error: 'Permís denegat' });
      // Rol desde BD (usuaris)
      let role: 'docent' | 'admin' = 'docent';
      try {
        const r = await query<{ rol: 'docent' | 'admin' }>('SELECT rol FROM usuaris WHERE email=$1', [email]);
        if (r.rowCount && (r.rows[0].rol === 'admin' || r.rows[0].rol === 'docent')) role = r.rows[0].rol;
      } catch {
        // si no hay tabla, default a docent
      }
      req.user = { email, role };
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Permís denegat' });
    }
  };
}

export function requireRole(roles: Array<'docent' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(403).json({ error: 'Permís denegat' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Permís denegat' });
    next();
  };
}


