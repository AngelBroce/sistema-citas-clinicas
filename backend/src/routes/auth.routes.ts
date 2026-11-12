import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();

// Listar los roles y usuarios disponibles en el sistema
router.get('/roles', AuthController.listarRolesYUsuarios);

// Inicio de sesión o cambio rápido de rol
router.post('/login', AuthController.login);

// Registro de nuevo paciente (con correo Gmail o similar)
router.post('/register-paciente', AuthController.registerPaciente);

export default router;
