import { Router } from 'express';
import { CitasController } from '../controllers/citas.controller.js';
import { requerirRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Consultar disponibilidad horaria de un médico (anti-solapamiento)
router.get('/disponibilidad', CitasController.getDisponibilidad);

// Reservar nueva cita médica con sincronización a Google Calendar
router.post('/reservar', CitasController.crearCita);

// Asignar cita automáticamente (el paciente no elige la hora, el sistema le asigna el primer turno libre)
router.post('/asignar-automatica', CitasController.asignarCitaAutomatica);

// Listar todas las citas
router.get('/', CitasController.listarCitas);

// Actualizar el estado de una cita (confirmar por Admin/Secretaria/Médico o cancelar por Paciente)
router.patch(
  '/:id/estado',
  requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO', 'PACIENTE']),
  CitasController.actualizarEstado
);
router.post(
  '/:id/estado',
  requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO', 'PACIENTE']),
  CitasController.actualizarEstado
);

// Limpiar todas las citas (solo Administración / Recepción)
router.delete('/', requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA']), CitasController.limpiarCitas);
router.post('/limpiar', requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA']), CitasController.limpiarCitas);

export default router;
