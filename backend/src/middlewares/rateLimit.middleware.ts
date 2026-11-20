import { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  mensaje?: string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter en memoria por IP para proteger endpoints de autenticación y API.
 */
export function crearRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, BucketEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const fwd = req.headers['x-forwarded-for'];
    const clientIp = Array.isArray(fwd)
      ? fwd[0]
      : (typeof fwd === 'string' ? fwd.split(',')[0].trim() : req.ip || 'unknown');

    const key = `${clientIp}:${req.baseUrl || ''}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      if (buckets.size > 5000) {
        for (const [k, v] of buckets.entries()) {
          if (v.resetAt <= now) buckets.delete(k);
        }
      }
      return next();
    }

    existing.count += 1;
    if (existing.count > options.maxRequests) {
      const retrySec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({
        ok: false,
        error: options.mensaje || 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.'
      });
    }

    return next();
  };
}
