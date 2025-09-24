import { google } from 'googleapis';

export interface SheetsConfig {
  spreadsheetId: string; // Spreadsheet principal (per nivell) que conté Alumnes_<CURS>, Entrevistes_<ANY>, Grups_<ANY>, Config
}

function normalizePrivateKey(key: string): string {
  // Sustituir secuencias \n por saltos de línea reales
  const withNewlines = key.replace(/\\n/g, '\n');
  return withNewlines;
}

function loadServiceAccount(): { client_email: string; private_key: string } | null {
  // 1) Variables separadas
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKeyRaw) {
    return { client_email: clientEmail, private_key: normalizePrivateKey(privateKeyRaw) };
  }

  // 2) JSON en texto (posible base64)
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) {
    // En desarrollo local, permitir que no haya credenciales
    if (process.env.NODE_ENV === 'development' || process.env.DISABLE_AUTH === '1') {
      console.log('Advertencia: No hay credenciales de Google Sheets configuradas. Funcionalidad limitada.');
      return null;
    }
    throw new Error(
      'Faltan credenciales: define GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY, o GOOGLE_SERVICE_ACCOUNT_JSON'
    );
  }

  let jsonText = raw;
  // Intentar decodificar base64 si no parece JSON
  if (!raw.startsWith('{')) {
    try {
      jsonText = Buffer.from(raw, 'base64').toString('utf8');
    } catch {
      // ignorar, se intentará parsear tal cual
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    // Mensaje de ayuda si hay saltos de línea sin escapar
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido. Asegúrate de que la clave privada use \\n en lugar de saltos de línea reales, o usa GOOGLE_PRIVATE_KEY/GOOGLE_CLIENT_EMAIL.'
    );
  }

  parsed.private_key = normalizePrivateKey(parsed.private_key || '');
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Credenciales de servicio incompletas: faltan client_email o private_key');
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

export function createSheetsClient() {
  const credentials = loadServiceAccount();
  if (!credentials) {
    // Retornar un cliente mock para desarrollo
    return {
      spreadsheets: {
        get: () => Promise.resolve({ data: { sheets: [] } }),
        values: {
          get: () => Promise.resolve({ data: { values: [] } }),
          update: () => Promise.resolve({ data: {} }),
          append: () => Promise.resolve({ data: {} })
        }
      }
    } as any;
  }
  
  const { client_email, private_key } = credentials;
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  const auth = new google.auth.JWT(client_email, undefined, private_key, scopes);
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}


