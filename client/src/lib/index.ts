export type Alumne = {
  id: string;
  nom: string;
  grup: string;
  anyCurs: string;
  estat: 'alta' | 'baixa' | 'migrat';
};

export type Entrevista = {
  id: string;
  alumneId: string;
  anyCurs: string;
  data: string;
  acords: string;
  usuariCreadorId: string;
};

export type Curs = {
  any: string;
  grups: string[];
};

const BASE = 'http://localhost:8080';
import { getToken } from './auth';

export async function fetchAlumnes(): Promise<Alumne[]> {
  const spreadsheetId = getSelectedSpreadsheetId();
  const qs = spreadsheetId ? `?spreadsheetId=${encodeURIComponent(spreadsheetId)}` : '';
  const res = await fetch(`${BASE}/alumnes${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant alumnes');
  return res.json();
}

export async function fetchAlumnesDb(params?: { anyCurs?: string }): Promise<Alumne[]> {
  const qs = params?.anyCurs ? `?anyCurs=${encodeURIComponent(params.anyCurs)}` : '';
  const res = await fetch(`${BASE}/alumnes-db${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant alumnes (BD)');
  return res.json();
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error('Error health');
  return res.json();
}

export async function fetchEntrevistes(): Promise<Entrevista[]> {
  const spreadsheetId = getSelectedSpreadsheetId();
  const qs = spreadsheetId ? `?spreadsheetId=${encodeURIComponent(spreadsheetId)}` : '';
  const res = await fetch(`${BASE}/entrevistes${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant entrevistes');
  return res.json();
}

export async function fetchCursos(): Promise<Curs[]> {
  const res = await fetch(`${BASE}/cursos`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant cursos');
  return res.json();
}

// Config local de spreadsheet IDs por curso
export type ConfigSpreadsheets = {
  '1r': string;
  '2n': string;
  '3r': string;
  '4t': string;
};

const CONFIG_KEY = 'entrevistes.spreadsheets';

export function saveConfigSpreadsheets(cfg: ConfigSpreadsheets) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function loadConfigSpreadsheets(): Partial<ConfigSpreadsheets> {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
  } catch { return {}; }
}

export function setSelectedCourse(course: keyof ConfigSpreadsheets) {
  localStorage.setItem('entrevistes.selectedCourse', course);
}

export function getSelectedCourse(): keyof ConfigSpreadsheets | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined as any;
    const v = localStorage.getItem('entrevistes.selectedCourse') as keyof ConfigSpreadsheets | null;
    return v || undefined;
  } catch {
    return undefined as any;
  }
}

export function getSelectedSpreadsheetId(): string | undefined {
  const course = getSelectedCourse();
  if (!course) return undefined;
  const cfg = loadConfigSpreadsheets();
  return (cfg as any)[course];
}

export function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// place files you want to import through the `$lib` alias in this folder.
