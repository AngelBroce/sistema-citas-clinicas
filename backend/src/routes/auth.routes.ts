import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requerirAutenticacion, requerirRoles } from '../middlewares/auth.middleware.js';
import { crearRateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

const authLimiter = crearRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 25,
  mensaje: 'Demasiados intentos de autenticación. Intenta de nuevo en unos minutos.'
});

// Listar los roles y cuentas de prueba disponibles (sin credenciales)
router.get('/roles', AuthController.listarRolesYUsuarios);

// Obtener y actualizar el perfil verificado de la sesión actual
router.get('/me', requerirAutenticacion, AuthController.obtenerPerfilActual);
router.get('/perfil', requerirAutenticacion, AuthController.obtenerPerfilActual);
router.patch('/perfil', requerirAutenticacion, AuthController.actualizarPerfilPaciente);

// Inicio de sesión verificado con contraseña (sin bypass)
router.post('/login', authLimiter, AuthController.login);

// Registro de nuevo paciente en Supabase
router.post('/register-paciente', authLimiter, AuthController.registerPaciente);

// Gestión administrativa de usuarios
router.get('/usuarios', requerirRoles(['ADMINISTRADOR']), AuthController.listarUsuariosAdmin);
router.post('/usuarios', requerirRoles(['ADMINISTRADOR']), AuthController.guardarUsuarioAdmin);

export default router;
