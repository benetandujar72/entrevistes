// Sencillo gestor de autenticación en localStorage
export type AuthState = {
  token: string | null;
};

const KEY = 'entrevistes.token';
const AUTH_DISABLED_KEY = 'entrevistes.authDisabled';

export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setToken(token: string) {
  localStorage.setItem(KEY, token);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken() || isAuthDisabled();
}

export function isAuthDisabled(): boolean {
  try { 
    return localStorage.getItem(AUTH_DISABLED_KEY) === '1'; 
  } catch { 
    return false; 
  }
}

export function setAuthDisabled(disabled: boolean) {
  try {
    if (disabled) {
      localStorage.setItem(AUTH_DISABLED_KEY, '1');
    } else {
      localStorage.removeItem(AUTH_DISABLED_KEY);
    }
  } catch {}
}

// Función para verificar si la autenticación está deshabilitada en el servidor
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const BASE = import.meta.env.VITE_BACKEND_BASE || 'http://localhost:8081';
    const response = await fetch(`${BASE}/api/auth/status`);
    if (response.ok) {
      const data = await response.json();
      setAuthDisabled(data.authDisabled);
      return data.authDisabled;
    }
  } catch (error) {
    console.log('No se pudo verificar el estado de autenticación:', error);
  }
  return false;
}


