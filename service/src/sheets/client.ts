import { google } from 'googleapis';

export interface SheetsConfig {
  spreadsheetId: string; // Spreadsheet principal (per nivell) que conté Alumnes_<CURS>, Entrevistes_<ANY>, Grups_<ANY>, Config
}

export function createSheetsClient() {
  const creds = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!creds) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON');
  const key = JSON.parse(creds);
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  const auth = new google.auth.JWT(key.client_email, undefined, key.private_key, scopes);
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}


