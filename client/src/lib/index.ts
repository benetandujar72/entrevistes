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

export type Me = { email: string; role: 'admin'|'docent' };
export type Tutoria = { alumne_id: string; tutor_email: string; any_curs: string };

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

export async function fetchMe(): Promise<Me> {
  const res = await fetch(`${BASE}/usuaris/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('No autoritzat');
  return res.json();
}

export async function fetchTutories(): Promise<Tutoria[]> {
  const res = await fetch(`${BASE}/tutors/tutories`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant tutories');
  return res.json();
}

export async function importTutoriesCsv(csvText: string): Promise<{ importats: number; ambigus: number; errors: number }>{
  const base64 = btoa(unescape(encodeURIComponent(csvText)));
  const res = await fetch(`${BASE}/tutors/tutories/import`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvBase64: base64 })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error importació tutories');
  return data;
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
