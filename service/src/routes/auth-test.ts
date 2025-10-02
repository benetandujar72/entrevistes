import { Router, Request, Response } from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

const router = Router();
const clientId = process.env.GOOGLE_CLIENT_ID || '';
const oauthClient = new OAuth2Client(clientId);

// Endpoint para probar la autenticación sin middleware
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    console.log('🔐 Auth test - Token recibido:', token ? 'Presente' : 'Ausente');
    console.log('🔐 Auth test - Client ID:', clientId);

    // Verificar token con Google
    const ticket = await oauthClient.verifyIdToken({ 
      idToken: token, 
      audience: clientId 
    });
    
    const payload = ticket.getPayload() as TokenPayload | undefined;
    
    if (!payload?.email) {
      return res.status(403).json({ error: 'Token inválido o sin email' });
    }

    const email = payload.email.toLowerCase();
    console.log('🔐 Auth test - Email extraído:', email);

    // Verificar dominio
    const allowedDomain = process.env.ALLOWED_DOMAIN || 'insbitacola.cat';
    if (!email.endsWith('@' + allowedDomain)) {
      return res.status(403).json({ 
        error: `Dominio no permitido: ${email} debe terminar en @${allowedDomain}` 
      });
    }

    res.json({
      success: true,
      email: email,
      domain: allowedDomain,
      message: 'Token válido'
    });

  } catch (error: any) {
    console.error('❌ Auth test - Error:', error);
    res.status(500).json({ 
      error: 'Error validando token',
      details: error.message 
    });
  }
});

export default router;
