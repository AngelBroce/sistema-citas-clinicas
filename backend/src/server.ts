import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { crearRateLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Encabezados de seguridad HTTP estándar
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CORS endurecido: acepta CORS_ORIGIN y previews propios del proyecto medpulse en *.vercel.app
const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
const VERCEL_PROJECT_ORIGIN = /^https:\/\/medpulse[a-z0-9-]*\.vercel\.app$/i;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, '');
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(normalized) ||
      VERCEL_PROJECT_ORIGIN.test(normalized) ||
      (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized))
    ) {
      return callback(null, true);
    }
    return callback(Object.assign(new Error(`Origen no permitido por CORS: ${origin}`), { statusCode: 403 }));
  }
}));

app.use(express.json({ limit: '100kb' }));

// Rate limiting general de API
app.use('/api', crearRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  mensaje: 'Límite de solicitudes excedido. Espera un minuto antes de reintentar.'
}));

// Montaje de rutas de la API REST
app.use('/api', apiRouter);

// Ruta raíz informativa
app.get('/', (_req, res) => {
  res.json({
    message: '🏥 Bienvenido a MedPulse Backend API',
    endpoints: {
      health: '/api/health',
      dbStatus: '/api/db/status',
      citas: '/api/citas',
      disponibilidad: '/api/citas/disponibilidad?medicoId=...&fecha=YYYY-MM-DD',
      reservarCita: 'POST /api/citas/reservar',
      triaje: 'POST /api/triaje/evaluar'
    }
  });
});

// Manejador de errores (CORS 403 / JSON malformado 400)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err?.statusCode || err?.status || 500;
  res.status(status).json({
    ok: false,
    error: status === 403 ? err.message : (config.isProduction ? 'Error procesando la solicitud.' : err.message)
  });
});

// En Vercel la app se ejecuta como función serverless (api/index.ts), sin listen()
if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`🚀 MedPulse Backend Server escuchando en http://localhost:${config.port}`);
    console.log(`📌 Entorno: ${config.nodeEnv}`);
  });
}

export default app;
