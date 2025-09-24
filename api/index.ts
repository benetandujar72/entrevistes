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
      environment: process.env.NODE_ENV || 'development'
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

  // Mock user data
  if (req.url === '/usuaris/me') {
    res.status(200).json({
      email: 'benet.andujar@insbitacola.cat',
      role: 'admin',
      name: 'Benet Andujar'
    });
    return;
  }

  // Default response
  res.status(404).json({ 
    error: 'Not Found',
    message: 'API endpoint not found',
    path: req.url
  });
}
