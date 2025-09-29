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
    // Solo autenticación a través de Google OAuth
    try {
      console.log('🔐 Middleware auth - Headers:', req.headers);
      console.log('🔐 Middleware auth - Authorization:', req.headers.authorization);
      console.log('🔐 Middleware auth - X-ID-Token:', req.headers['x-id-token']);
      
      const idToken = (req.headers['x-id-token'] || req.headers.authorization || '').toString().replace('Bearer ', '');
      console.log('🔐 Middleware auth - Token extraído:', idToken ? 'Presente' : 'Ausente');
      
      if (!idToken) {
        console.log('❌ Middleware auth - No hay token');
        return res.status(403).json({ error: 'Permís denegat - No hay token' });
      }
      
      console.log('🔐 Middleware auth - Verificando token con Google...');
      const ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId });
      const payload = ticket.getPayload() as TokenPayload | undefined;
      
      if (!payload?.email) {
        console.log('❌ Middleware auth - Token inválido o sin email');
        return res.status(403).json({ error: 'Permís denegat - Token inválido' });
      }
      
      const email = payload.email.toLowerCase();
      console.log('🔐 Middleware auth - Email extraído:', email);
      
      if (!email.endsWith('@' + allowedDomain)) {
        console.log('❌ Middleware auth - Dominio no permitido:', email, 'debe terminar en @' + allowedDomain);
        return res.status(403).json({ error: 'Permís denegat - Dominio no permitido' });
      }
      
      // Rol desde BD (usuaris)
      let role: 'docent' | 'admin' = 'docent';
      try {
        const r = await query<{ rol: 'docent' | 'admin' }>('SELECT rol FROM usuaris WHERE email=$1', [email]);
        if (r.rowCount && (r.rows[0].rol === 'admin' || r.rows[0].rol === 'docent')) role = r.rows[0].rol;
        console.log('🔐 Middleware auth - Rol asignado:', role);
      } catch (error) {
        console.log('⚠️ Middleware auth - Error consultando BD, usando rol por defecto:', error);
        // si no hay tabla, default a docent
      }
      
      req.user = { email, role };
      console.log('✅ Middleware auth - Usuario autenticado:', req.user);
      next();
    } catch (err) {
      console.log('❌ Middleware auth - Error:', err);
      return res.status(403).json({ error: 'Permís denegat - Error de autenticación' });
    }
  };
}

export function requireRole(roles: Array<'docent' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(403).json({ error: 'Permís denegat' });
    
    // Los administradores tienen acceso a todo
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Los docentes solo tienen acceso a las rutas específicas de docente
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Permís denegat' });
    next();
  };
}


