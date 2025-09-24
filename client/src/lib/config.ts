// Configuración de Google OAuth
export const GOOGLE_CONFIG = {
  CLIENT_ID: '582773400896-0io28jocfebl0aec7u5bnr6up367chs6.apps.googleusercontent.com',
  ALLOWED_DOMAINS: ['insbitacola.cat'],
  REDIRECT_URI: typeof window !== 'undefined' ? window.location.origin : ''
};

// Configuración de la aplicación
export const APP_CONFIG = {
  NAME: 'Entrevistes App',
  VERSION: '1.0.0',
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://entrevistesib.vercel.app/api' 
    : 'http://localhost:8081'
};
