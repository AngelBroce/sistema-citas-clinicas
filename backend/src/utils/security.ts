import crypto from 'node:crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Genera un hash seguro de contraseña usando scrypt nativo de Node.js.
 */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifica una contraseña en texto plano contra un hash almacenado en formato scrypt$salt$hash.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored || !stored.startsWith('scrypt$')) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;

  try {
    const derived = crypto.scryptSync(plain, salt, 64);
    const storedBuf = Buffer.from(hashHex, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Valida si una cadena tiene formato UUID estándar.
 */
export function isUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Limpia y acota cadenas de texto provenientes del cliente.
 */
export function sanitizeText(val: unknown, maxLen = 500): string {
  return String(val ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}
