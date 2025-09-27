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
  alumneNom?: string;
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

// Función para obtener información del usuario actual
export async function getMe(): Promise<Me | null> {
  try {
    const token = localStorage.getItem('entrevistes.token');
    if (!token) return null;
    
    const response = await fetch(`${BASE}/usuaris/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error obtenint informació del usuari:', error);
  }
  return null;
}
export type Tutoria = { alumne_id: string; alumne_nom: string; alumne_email: string; tutor_email: string; any_curs: string };
export type Tutor = { tutor_email: string; total_alumnes: number };

// ========= Tipos para Datos Personales =========

export type DadesPersonals = {
  alumne_id: string;
  alumne_nom: string;
  alumne_email: string;
  personal_id: string;
  sexe: 'H' | 'D' | 'X';
  data_naixement: string;
  municipi_naixement: string;
  nacionalitat: string;
  adreca: string;
  municipi_residencia: string;
  codi_postal: string;
  doc_identitat: string;
  tis: string;
  ralc: string;
  link_fotografia: string;
  tutor1_nom: string;
  tutor1_tel: string;
  tutor1_email: string;
  tutor2_nom: string;
  tutor2_tel: string;
  tutor2_email: string;
  grup_nom: string;
  curs: string;
  tutor_email: string;
};

export type CitaCalendari = {
  id: string;
  alumne_id: string;
  tutor_email: string;
  any_curs: string;
  data_cita: string;
  durada_minuts: number;
  nom_familia: string;
  email_familia: string;
  telefon_familia: string;
  estat: 'pendent' | 'confirmada' | 'realitzada' | 'cancelada';
  notes: string;
  google_event_id: string;
  alumne_nom: string;
  created_at: string;
  updated_at: string;
};

export type SolicitutCanvi = {
  id: string;
  alumne_id: string;
  tutor_solicitant: string;
  camp_modificar: string;
  valor_actual: string;
  valor_nou: string;
  justificacio: string;
  estat: 'pendent' | 'aprovada' | 'rebutjada';
  admin_responsable: string;
  data_resolucio: string;
  notes_admin: string;
  alumne_nom: string;
  tutor_email: string;
  created_at: string;
  updated_at: string;
};

// ========= Tipos para Consolidación de Pestañas =========

export type CursDisponible = {
  nom: string;
  descripcio: string;
};

export type CursoPestana = {
  id: string;
  cursoNombre: string; // '1r ESO', '2n ESO', etc.
  pestanaNombre: string;
  spreadsheetId: string;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EntrevistaConsolidada = {
  id: string;
  alumneId: string;
  cursOrigen: string;
  pestanyaOrigen: string;
  dataEntrevista: string;
  acords: string;
  anyCurs: string;
  spreadsheetId: string;
  creatAt: string;
  actualitzatAt: string;
  alumneNom: string;
};

export type EntrevistaHistorial = {
  id: string;
  alumneId: string;
  anyCurs: string;
  data: string;
  acords: string;
  usuariCreadorId: string | null;
  tipo: 'normal' | 'consolidada';
  origen: string;
  created_at: string;
};

export type EntrevistaAdmin = {
  id: string;
  alumneId: string;
  alumneNom: string;
  anyCurs: string;
  data: string;
  acords: string;
  usuariCreadorId: string | null;
  tipo: 'normal' | 'consolidada';
  origen: string;
  created_at: string;
};

export type EntrevistasAdminResponse = {
  entrevistas: EntrevistaAdmin[];
  paginacion: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type ConsolidacionLog = {
  id: string;
  cursNom: string;
  spreadsheetId: string;
  pestanyesProcessades: number;
  alumnesProcessats: number;
  entrevistesImportades: number;
  errors: number;
  estat: 'iniciado' | 'procesando' | 'completado' | 'error';
  detalls: any;
  iniciatPer: string;
  creatAt: string;
  completatAt?: string;
};

export type PestanaData = {
  nombre: string;
  spreadsheetId: string;
  entrevistas: EntrevistaData[];
  totalEntrevistas: number;
};

export type EntrevistaData = {
  id?: string;
  alumneId?: string;
  data: string;
  acords: string;
  anyCurs: string;
  usuariCreadorId?: string;
};

export type AlumnoConsolidado = {
  nombre: string;
  nombreNormalizado: string;
  grupo: string;
  tutor: string;
  infoExtra: string;
  historial: Map<string, EntrevistaData[]>; // pestana -> entrevistas
  totalEntrevistas: number;
};

export type ConsolidacionPreview = {
  curso: string;
  pestanas: PestanaData[];
  alumnos: AlumnoConsolidado[];
  totalAlumnos: number;
  totalEntrevistas: number;
  totalPestanas: number;
};

export type ConsolidacionResult = {
  exit: boolean;
  curs: string;
  alumnesProcessats: number;
  entrevistesImportades: number;
  errors: number;
  detalls: string;
};

const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8081';
import { getToken, isAuthDisabled } from './auth';

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
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error('Error health');
  return res.json();
}

export async function fetchEntrevistes(): Promise<Entrevista[]> {
  // Temporal: usar endpoint de desarrollo sin autenticación
  const res = await fetch(`${BASE}/entrevistes/dev`);
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

// Función para eliminar todas las tutorías
export async function eliminarTodasLasTutories(): Promise<{ eliminats: number }> {
  const res = await fetch(`${BASE}/tutors/tutories`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error eliminant tutories');
  return data;
}

// Función para eliminar todos los cursos
export async function eliminarTodosLosCursos(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE}/cursos`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error eliminant cursos');
  return data;
}

// Tipos para estadísticas
export type EstadisticasCurso = {
  anyCurs: string;
  estadisticas: {
    totalAlumnes: number;
    totalGrups: number;
    totalTutores: number;
    totalEntrevistes: number;
  };
  graficos: {
    entrevistesPorMes: Array<{ mes: string; total: number }>;
    entrevistesPorGrupo: Array<{ grup_nom: string; total_entrevistes: number }>;
    alumnesPorGrupo: Array<{ grup_nom: string; total_alumnes: number }>;
  };
};

// Función para obtener estadísticas de un curso
export async function obtenerEstadisticasCurso(anyCurs: string): Promise<EstadisticasCurso> {
  const res = await fetch(`${BASE}/cursos/estadisticas/${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint estadístiques del curs');
  return data;
}

// Tipos para control de alumnos
export type AlumneTutor = {
  id: string;
  nom: string;
  email: string;
  grup_nom: string;
  curs: string;
  any_curs: string;
  total_entrevistes: number;
};

export type ControlAlumnes = {
  anyCurs: string;
  estadisticas: {
    total_alumnes: number;
    total_entrevistes: number;
    alumnes_entrevistats: number;
    alumnes_sin_entrevista: number;
  };
  masEntrevistas: Array<{
    id: string;
    nom: string;
    email: string;
    grup_nom: string;
    total_entrevistes: number;
  }>;
  sinEntrevistas: Array<{
    id: string;
    nom: string;
    email: string;
    grup_nom: string;
  }>;
  conAlertas: Array<{
    id: string;
    nom: string;
    email: string;
    grup_nom: string;
    observacions: string;
  }>;
};

// Función para obtener lista de tutores (admin)
export async function obtenerListaTutores(): Promise<Tutor[]> {
  const res = await fetch(`${BASE}/tutors/lista`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint llista de tutors');
  return data;
}

// Función para obtener alumnos del tutor actual
export async function obtenerMisAlumnes(anyCurs: string = '2025-2026'): Promise<AlumneTutor[]> {
  const res = await fetch(`${BASE}/tutors/mis-alumnes?anyCurs=${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint els meus alumnes');
  return data;
}

// Función para obtener alumnos de un tutor
export async function obtenerAlumnesTutor(tutorEmail: string, anyCurs: string = '2025-2026'): Promise<AlumneTutor[]> {
  const res = await fetch(`${BASE}/tutors/alumnes/${encodeURIComponent(tutorEmail)}?anyCurs=${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint alumnes del tutor');
  return data;
}

// Función para obtener control de alumnos
export async function obtenerControlAlumnes(anyCurs: string): Promise<ControlAlumnes> {
  const res = await fetch(`${BASE}/cursos/control-alumnes/${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint control d\'alumnes');
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
  // Si la autenticación está deshabilitada, no enviar headers de autorización
  if (isAuthDisabled()) {
    return {};
  }
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ========= Funciones para Consolidación de Pestañas =========

export async function fetchCursosDisponibles(): Promise<CursDisponible[]> {
  const res = await fetch(`${BASE}/consolidacion/cursos`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error obtenint cursos disponibles');
  return res.json();
}

export async function consolidarCurs(curs: string): Promise<ConsolidacionResult> {
  const res = await fetch(`${BASE}/consolidacion/consolidar`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ curs })
  });
  if (!res.ok) throw new Error('Error consolidant curs');
  return res.json();
}

export async function fetchEntrevistesConsolidadas(curs?: string): Promise<EntrevistaConsolidada[]> {
  const qs = curs ? `?curs=${encodeURIComponent(curs)}` : '';
  const res = await fetch(`${BASE}/consolidacion/entrevistas${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant entrevistes consolidadas');
  return res.json();
}

export async function fetchConsolidacionLogs(curs?: string): Promise<ConsolidacionLog[]> {
  const qs = curs ? `?curs=${encodeURIComponent(curs)}` : '';
  const res = await fetch(`${BASE}/consolidacion/logs${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant logs de consolidació');
  return res.json();
}

export async function fetchHistorialEntrevistas(alumneId: string, anyCurs?: string): Promise<EntrevistaHistorial[]> {
  // Usar endpoint de desarrollo temporalmente (sin autenticación)
  const url = anyCurs 
    ? `${BASE}/entrevistes/dev/historial/${alumneId}?anyCurs=${encodeURIComponent(anyCurs)}`
    : `${BASE}/entrevistes/dev/historial/${alumneId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error obtenint historial d\'entrevistes');
  return res.json();
}

export async function fetchTodasLasEntrevistasAdmin(anyCurs?: string, limit?: number, offset?: number): Promise<EntrevistasAdminResponse> {
  const params = new URLSearchParams();
  if (anyCurs) params.append('anyCurs', anyCurs);
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  
  const url = `${BASE}/entrevistes/admin/todas${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error obtenint totes les entrevistes');
  return res.json();
}

// Función para obtener una entrevista específica
export async function fetchEntrevista(id: string): Promise<EntrevistaHistorial> {
  const res = await fetch(`${BASE}/entrevistes/db/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error carregant entrevista');
  return res.json();
}

// Función para actualizar una entrevista
export async function updateEntrevista(id: string, data: { data: string; acords: string }): Promise<void> {
  const res = await fetch(`${BASE}/entrevistes/db/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.error || 'Error actualitzant entrevista');
  }
}

// Función para borrar una entrevista
export async function deleteEntrevista(id: string): Promise<void> {
  const res = await fetch(`${BASE}/entrevistes/db/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData?.error || 'Error borrant entrevista');
  }
}

export async function limpiarConsolidacion(curso: string, anyCurs: string): Promise<{ eliminats: number }> {
  const res = await fetch(`${BASE}/consolidacion/limpiar`, {
    method: 'DELETE',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ curso, anyCurs })
  });
  if (!res.ok) throw new Error('Error netejant consolidació');
  return res.json();
}

// Funciones utilitarias para formateo de fechas
export function formatearFechaMadrid(fechaISO: string): string {
  if (!fechaISO) return '—';
  
  try {
    const fecha = new Date(fechaISO);
    
    // Formatear en zona horaria de Madrid (Europe/Madrid)
    const opciones: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    return fecha.toLocaleString('es-ES', opciones);
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return fechaISO;
  }
}

export function formatearFechaMadridSoloFecha(fechaISO: string): string {
  if (!fechaISO) return '—';
  
  try {
    const fecha = new Date(fechaISO);
    
    // Formatear solo la fecha en zona horaria de Madrid
    const opciones: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    return fecha.toLocaleDateString('es-ES', opciones);
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return fechaISO;
  }
}

export function formatearFechaMadridSoloHora(fechaISO: string): string {
  if (!fechaISO) return '—';
  
  try {
    const fecha = new Date(fechaISO);
    
    // Formatear solo la hora en zona horaria de Madrid
    const opciones: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    return fecha.toLocaleTimeString('es-ES', opciones);
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return fechaISO;
  }
}

// ========= Funciones para Datos Personales =========

// Obtener datos personales de un alumno
export async function obtenirDadesPersonals(alumneId: string, anyCurs: string = '2025-2026'): Promise<DadesPersonals> {
  const res = await fetch(`${BASE}/dades-personals/${alumneId}?anyCurs=${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint dades personals');
  return data;
}

// Obtener historial de entrevistas de un alumno
export async function obtenirHistorialEntrevistes(alumneId: string, anyCurs: string = '2025-2026'): Promise<Entrevista[]> {
  const res = await fetch(`${BASE}/dades-personals/${alumneId}/entrevistes?anyCurs=${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint historial entrevistes');
  return data;
}

// Obtener citas de calendario de un alumno
export async function obtenirCitesCalendari(alumneId: string, anyCurs: string = '2025-2026'): Promise<CitaCalendari[]> {
  const res = await fetch(`${BASE}/dades-personals/${alumneId}/cites?anyCurs=${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint cites calendari');
  return data;
}

// Crear nueva cita de calendario
export async function crearCitaCalendari(alumneId: string, cita: Partial<CitaCalendari>, anyCurs: string = '2025-2026'): Promise<CitaCalendari> {
  const res = await fetch(`${BASE}/dades-personals/${alumneId}/cites?anyCurs=${anyCurs}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(cita)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error creant cita');
  return data;
}

// Crear solicitud de cambio de datos
export async function crearSolicitutCanvi(solicitut: Partial<SolicitutCanvi>): Promise<SolicitutCanvi> {
  const res = await fetch(`${BASE}/dades-personals/solicituts-canvi`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(solicitut)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error creant sol·licitud');
  return data;
}

// Obtener solicitudes de cambio (solo admin)
export async function obtenirSolicitutsCanvi(): Promise<SolicitutCanvi[]> {
  const res = await fetch(`${BASE}/dades-personals/solicituts-canvi`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint sol·licituds');
  return data;
}

// Resolver solicitud de cambio (solo admin)
export async function resoldreSolicitutCanvi(solicitutId: string, estat: 'aprovada' | 'rebutjada', notes?: string): Promise<SolicitutCanvi> {
  const res = await fetch(`${BASE}/dades-personals/solicituts-canvi/${solicitutId}`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ estat, notes_admin: notes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error resolent sol·licitud');
  return data;
}

// Eliminar alumno (solo admin)
export async function eliminarAlumne(alumneId: string): Promise<void> {
  const res = await fetch(`${BASE}/dades-personals/${alumneId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error || 'Error eliminant alumne');
  }
}

// Exportar datos a CSV (solo admin)
export async function exportarDadesCSV(anyCurs: string = '2025-2026'): Promise<Blob> {
  const res = await fetch(`${BASE}/dades-personals/export/csv?anyCurs=${anyCurs}`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error || 'Error exportant dades');
  }
  return res.blob();
}

// Funciones para programador de citas
export type HorarioDisponible = {
  hora: string;
  disponible: boolean;
  fecha: string;
  duracion: number; // Duración en minutos
  evento_id?: string; // ID del evento en Google Calendar
};

export type ProgramadorCitas = {
  tutor_email: string;
  fecha: string;
  horarios_disponibles: HorarioDisponible[];
  horarios_ocupados: any[];
};

// Nuevos tipos para configuración dinámica
export type FranjaHoraria = {
  inicio: string;
  fin: string;
  activo: boolean;
};

export type ConfiguracionHorario = {
  dia: string;
  inicio: string;
  fin: string;
  activo: boolean;
  duracion_cita: number; // 15, 30, 60 minutos
  franjas?: FranjaHoraria[];
};

export type ConfiguracionHorariosTutor = {
  id: number;
  tutor_email: string;
  nombre_configuracion: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_cita: number;
  dias_semana: ConfiguracionHorario[];
  created_at: string;
  updated_at: string;
};

export type EventoCalendario = {
  id: number;
  tutor_email: string;
  alumne_id?: string;
  google_event_id?: string;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'disponible' | 'reservado' | 'confirmado' | 'cancelado';
  datos_familia?: any;
};

export async function obtenirHorariosTutor(tutorEmail: string, fecha?: string): Promise<ProgramadorCitas> {
  const fechaParam = fecha ? `?fecha=${fecha}` : '';
  const res = await fetch(`${BASE}/dades-personals/programador/${tutorEmail}${fechaParam}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint horaris');
  return data;
}

export async function configurarHorarios(datos: {
  tutorEmail: string;
  fechaInicio: string;
  fechaFin: string;
  horarios: Array<{
    dia: string;
    inicio: string;
    fin: string;
    activo: boolean;
  }>;
}): Promise<any> {
  const res = await fetch(`${BASE}/dades-personals/programador/configurar`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error configurant horaris');
  return data;
}

export async function reservarHorario(datos: {
  tutorEmail: string;
  alumneId: string;
  fecha: string;
  hora: string;
  durada_minuts?: number;
  nom_familia: string;
  email_familia: string;
  telefon_familia: string;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${BASE}/dades-personals/programador/reservar`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error reservant horari');
  return data;
}

export async function confirmarCita(citaId: string): Promise<any> {
  const res = await fetch(`${BASE}/dades-personals/cites/${citaId}/confirmar`, {
    method: 'PUT',
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error confirmant cita');
  return data;
}

// Nuevas funciones para configuración dinámica
export async function crearConfiguracionHorarios(datos: ConfiguracionHorariosTutor): Promise<any> {
  const res = await fetch(`${BASE}/dades-personals/configuracion-horarios`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error creant configuració');
  return data;
}

export async function obtenirConfiguracionHorarios(tutorEmail: string): Promise<ConfiguracionHorariosTutor[]> {
  const res = await fetch(`${BASE}/dades-personals/configuracion-horarios/${tutorEmail}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint configuracions');
  return data;
}

export async function generarEventosCalendario(tutorEmail: string, configuracionId: number): Promise<any> {
  const res = await fetch(`${BASE}/dades-personals/generar-eventos`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ tutorEmail, configuracionId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error generant events');
  return data;
}

export async function obtenirEventosCalendario(tutorEmail: string, fechaInicio?: string, fechaFin?: string): Promise<EventoCalendario[]> {
  let url = `${BASE}/dades-personals/eventos-calendario/${tutorEmail}`;
  const params = new URLSearchParams();
  if (fechaInicio) params.append('fecha_inicio', fechaInicio);
  if (fechaFin) params.append('fecha_fin', fechaFin);
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint events');
  return data;
}

export async function replicarConfiguracionDia(datos: {
  tutorEmail: string;
  diaOrigen: string;
  diasDestino: string[];
  configuracionId: number;
}): Promise<any> {
  const res = await fetch(`${BASE}/dades-personals/replicar-configuracion`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error replicant configuració');
  return data;
}

export async function obtenirTutores(): Promise<Tutor[]> {
  const res = await fetch(`${BASE}/tutors/lista`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint tutors');
  return data;
}

// Funciones para emails masivos
export type PlantillaEmail = {
  id: string;
  nom: string;
  contingut: string;
  variables?: string[];
};

export type AlumneEmail = {
  alumne_id: string;
  alumne_nom: string;
  alumne_email: string;
  tutor1_nom: string;
  tutor1_email: string;
  tutor2_nom: string;
  tutor2_email: string;
  tutor1_tel: string;
  tutor2_tel: string;
};

export async function obtenirPlantillas(): Promise<PlantillaEmail[]> {
  const res = await fetch(`${BASE}/emails/plantillas`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint plantilles');
  return data;
}

export async function obtenirAlumnesTutorEmail(tutorEmail: string): Promise<AlumneEmail[]> {
  const res = await fetch(`${BASE}/emails/alumnes/${tutorEmail}`, {
    headers: { ...authHeaders() }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error obtenint alumnes');
  return data;
}

export async function enviarEmailsMasivos(datos: {
  tutor_email: string;
  alumne_ids: string[];
  plantilla_id: string;
  asunto: string;
  contingut: string;
  variables?: Record<string, string>;
}): Promise<any> {
  const res = await fetch(`${BASE}/emails/enviar-masivo`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error enviant emails');
  return data;
}

export async function crearPlantilla(datos: {
  nom: string;
  contingut: string;
  variables?: string[];
}): Promise<PlantillaEmail> {
  const res = await fetch(`${BASE}/emails/plantilla`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Error creant plantilla');
  return data;
}

// place files you want to import through the `$lib` alias in this folder.
