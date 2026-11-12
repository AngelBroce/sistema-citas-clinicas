import { Router } from 'express';
import { TriajeController } from '../controllers/triaje.controller.js';

const router = Router();

// Evaluar síntomas del paciente y clasificar triaje clínico
router.post('/evaluar', TriajeController.evaluar);

export default router;
