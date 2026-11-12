/**
 * Configuración central de la URL del backend.
 *
 * En Vercel se define la variable de entorno PUBLIC_API_URL con la URL
 * del proyecto backend (ej. https://medpulse-backend.vercel.app).
 * En desarrollo local, si no existe la variable, se usa http://localhost:4000.
 */
const rawBase = (import.meta.env.PUBLIC_API_URL as string | undefined) || 'http://localhost:4000';

export const API_BASE = rawBase.replace(/\/+$/, '');

export const apiUrl = (path: string): string =>
  `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Construye encabezados JSON + Authorization Bearer si existe un token HMAC válido en sesión.
 */
export const getAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra
  };

  if (typeof window !== 'undefined') {
    try {
      const session = JSON.parse(localStorage.getItem('medpulse_session') || '{}');
      const token = typeof session?.token === 'string' ? session.token.trim() : '';
      if (token && token.split('.').length === 3) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {}
  }

  return headers;
};
