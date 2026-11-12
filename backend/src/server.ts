import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';

const app = express();

// CORS: CORS_ORIGIN puede ser '*', una URL o varias separadas por comas.
// Se aceptan también las URLs de preview/producción *.vercel.app (sin dominio propio).
const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  }
}));
app.use(express.json());

// Montaje de rutas de la API REST
app.use('/api', apiRouter);

// Ruta raíz informativa
app.get('/', (_req, res) => {
  res.json({
    message: '🏥 Bienvenido a MedPulse Backend API',
    endpoints: {
      health: '/api/health',
      citas: '/api/citas',
      disponibilidad: '/api/citas/disponibilidad?medicoId=...&fecha=YYYY-MM-DD',
      reservarCita: 'POST /api/citas/reservar',
      triaje: 'POST /api/triaje/evaluar'
    }
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
