// Sencillo gestor de autenticación en localStorage
export type AuthState = {
  token: string | null;
};

const KEY = 'entrevistes.token';

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
  return !!getToken();
}


