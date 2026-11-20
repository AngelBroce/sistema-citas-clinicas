/**
 * Configuración central de la URL del backend y utilidades compartidas de sesión.
 */
const rawBase = (import.meta.env.PUBLIC_API_URL as string | undefined) || 'http://localhost:4000';

export const API_BASE = rawBase.replace(/\/+$/, '');

export const apiUrl = (path: string): string =>
  `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

export interface MedPulseSession {
  token: string;
  usuario: {
    id: string;
    email: string;
    nombreCompleto: string;
    rol: 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MEDICO' | 'PACIENTE';
    detalleRol?: string;
    avatar?: string;
    medicoId?: string;
    pacienteId?: string;
    sede?: string;
    especialidad?: string;
    redirectUrl?: string;
  };
  paciente?: Record<string, any> | null;
}

/**
 * Decodifica el payload de un token HMAC/JWT-like y verifica si sigue vigente.
 */
export const isTokenValid = (token: unknown): boolean => {
  if (typeof token !== 'string') return false;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    if (typeof payload?.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      return false;
    }
    return Boolean(payload?.sub && payload?.rol);
  } catch {
    return false;
  }
};

/**
 * Obtiene la sesión activa validando que el token siga siendo estructuralmente válido y no haya expirado.
 */
export const getSession = (): MedPulseSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('medpulse_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.usuario?.rol || !isTokenValid(parsed?.token)) {
      return null;
    }
    return parsed as MedPulseSession;
  } catch {
    return null;
  }
};

/**
 * Construye encabezados JSON + Authorization Bearer si existe un token HMAC válido en sesión.
 */
export const getAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra
  };

  const session = getSession();
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  return headers;
};

/**
 * Escapa texto de usuario antes de renderizar en plantillas HTML para evitar XSS.
 */
export const escapeHtml = (input: unknown): string =>
  String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
