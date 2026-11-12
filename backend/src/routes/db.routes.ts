import { Router, Request, Response } from 'express';
import { DatabaseService } from '../config/db.js';
import path from 'path';

const router = Router();

// Consultar estado de conexión con PostgreSQL
router.get('/status', async (_req: Request, res: Response) => {
  const status = await DatabaseService.verificarConexion();
  return res.json({
    ok: true,
    data: status
  });
});

// Inicializar / Cargar tablas DDL y Seeds en PostgreSQL
router.post('/init', async (_req: Request, res: Response) => {
  const rutaRaiz = path.resolve(process.cwd(), '..');
  const resultado = await DatabaseService.ejecutarInicializacionSQL(rutaRaiz);
  return res.status(resultado.ok ? 200 : 503).json(resultado);
});

export default router;
