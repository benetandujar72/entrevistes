import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check
  if (req.url === '/health' || req.url === '/api/health') {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: process.env.DATABASE_URL ? 'connected' : 'not configured',
      google: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured',
      smtp: process.env.SMTP_HOST ? 'configured' : 'not configured'
    });
    return;
  }

  // Auth status
  if (req.url === '/api/auth/status') {
    res.status(200).json({ 
      authDisabled: process.env.DISABLE_AUTH === '1',
      allowedDomain: process.env.ALLOWED_DOMAIN || 'insbitacola.cat'
    });
    return;
  }

  // User data
  if (req.url === '/usuaris/me') {
    res.status(200).json({
      email: 'benet.andujar@insbitacola.cat',
      role: 'admin',
      name: 'Benet Andujar'
    });
    return;
  }

  // Mock data for development
  if (req.url === '/alumnes') {
    res.status(200).json([
      {
        id: '1',
        nom: 'Alumne Exemple',
        email: 'alumne@insbitacola.cat',
        curs: '2025-2026',
        grup: '1A'
      }
    ]);
    return;
  }

  if (req.url === '/cursos') {
    res.status(200).json([
      {
        id: '1',
        nom: '1A',
        curs: '2025-2026',
        total_alumnes: 25
      }
    ]);
    return;
  }

  if (req.url === '/entrevistes') {
    res.status(200).json([
      {
        id: '1',
        alumne_id: '1',
        tutor_email: 'tutor@insbitacola.cat',
        data_cita: '2025-01-15T10:00:00Z',
        estat: 'programada'
      }
    ]);
    return;
  }

  // Default response
  res.status(404).json({ 
    error: 'Not Found',
    message: 'API endpoint not found',
    path: req.url
  });
}
