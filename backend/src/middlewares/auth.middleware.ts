import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { RolId } from '../types/index.js';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  rol: RolId;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthTokenPayload;
    }
  }
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 12; // 12 horas

function toBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Firma un token estilo JWT usando HMAC-SHA256 nativo sin dependencias externas.
 */
export function firmarToken(
  usuario: { id: string; email: string; rol: RolId },
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: AuthTokenPayload = {
    sub: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    iat: now,
    exp: now + ttlSeconds
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${header}.${encodedPayload}`)
    .digest();

  return `${header}.${encodedPayload}.${toBase64Url(signature)}`;
}

/**
 * Verifica firma HMAC-SHA256 y expiración de un token emitido por MedPulse.
 */
export function verificarToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadB64, signatureB64] = parts;
    const expectedSig = toBase64Url(
      crypto
        .createHmac('sha256', config.jwtSecret)
        .update(`${header}.${payloadB64}`)
        .digest()
    );

    const a = Buffer.from(signatureB64, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const parsed = JSON.parse(fromBase64Url(payloadB64)) as AuthTokenPayload;
    if (!parsed.sub || !parsed.rol || !parsed.exp) return null;

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) return null;

    return parsed;
  } catch {
    return null;
  }
}

function extraerBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * Exige un token Bearer válido y adjunta `req.authUser`.
 */
export function requerirAutenticacion(req: Request, res: Response, next: NextFunction) {
  const token = extraerBearerToken(req);
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: 'Autenticación requerida. Inicia sesión para obtener un token válido.'
    });
  }

  const payload = verificarToken(token);
  if (!payload) {
    return res.status(401).json({
      ok: false,
      error: 'Token inválido o expirado.'
    });
  }

  req.authUser = payload;
  return next();
}

export interface RoleGuardOptions {
  /** En modo demo (`AUTH_STRICT=false`), permite peticiones sin Authorization pero siempre valida si se envía token. */
  permitirSinTokenEnDemo?: boolean;
}

/**
 * Control de acceso basado en roles (RBAC).
 * - Si el cliente envía Authorization inválido -> siempre 401.
 * - Si el token es válido pero el rol no tiene permiso -> siempre 403.
 * - Si no hay token -> 401 cuando `AUTH_STRICT=true` o `permitirSinTokenEnDemo=false`.
 */
export function requerirRoles(rolesPermitidos: RolId[], options: RoleGuardOptions = {}) {
  const permitirDemo = options.permitirSinTokenEnDemo !== false;

  return (req: Request, res: Response, next: NextFunction) => {
    const token = extraerBearerToken(req);

    if (!token) {
      const strictEnv = process.env.AUTH_STRICT === 'true' || config.authStrict;
      if (strictEnv || !permitirDemo) {
        return res.status(401).json({
          ok: false,
          error: 'Autenticación requerida para ejecutar esta operación.'
        });
      }
      return next();
    }

    const payload = verificarToken(token);
    if (!payload) {
      return res.status(401).json({
        ok: false,
        error: 'Token de sesión inválido o expirado.'
      });
    }

    req.authUser = payload;
    if (!rolesPermitidos.includes(payload.rol)) {
      return res.status(403).json({
        ok: false,
        error: `Acceso denegado para el rol ${payload.rol}. Se requiere: ${rolesPermitidos.join(', ')}.`
      });
    }

    return next();
  };
}

