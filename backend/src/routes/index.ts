import { Router } from 'express';
import citasRoutes from './citas.routes.js';
import triajeRoutes from './triaje.routes.js';
import authRoutes from './auth.routes.js';
import dbRoutes from './db.routes.js';
import whatsappRoutes from './whatsapp.routes.js';

const apiRouter = Router();

// Módulo 1: Citas y Conexión de Calendario
apiRouter.use('/citas', citasRoutes);

// Módulo 2: Triaje Clínico Inteligente
apiRouter.use('/triaje', triajeRoutes);

// Módulo 3: Autenticación y Control de Roles
apiRouter.use('/auth', authRoutes);

// Módulo 4: Diagnóstico y Conexión de PostgreSQL
apiRouter.use('/db', dbRoutes);

// Módulo 5: WhatsApp Cloud API (Webhook de Triaje y Mensajería)
apiRouter.use('/whatsapp', whatsappRoutes);

// Endpoint de verificación de salud
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'MedPulse Backend API',
    version: '1.0.0'
  });
});

export default apiRouter;
