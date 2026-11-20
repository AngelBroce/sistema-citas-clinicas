import { Router } from 'express';
import { CitasController } from '../controllers/citas.controller.js';
import { requerirRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Catálogos clínicos desde Supabase
router.get('/catalogos', CitasController.getCatalogos);

// Consultar disponibilidad horaria de un médico (anti-solapamiento)
router.get('/disponibilidad', CitasController.getDisponibilidad);

// Bloqueos temporales de agenda médica
router.get('/bloqueos', CitasController.listarBloqueos);
router.post('/bloqueos', requerirRoles(['MEDICO', 'ADMINISTRADOR']), CitasController.crearBloqueo);
router.delete('/bloqueos/:id', requerirRoles(['MEDICO', 'ADMINISTRADOR']), CitasController.eliminarBloqueo);

// Reservar nueva cita médica (Admin / Secretaria / Médico)
router.post('/reservar', requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO', 'PACIENTE']), CitasController.crearCita);

// Asignar cita automáticamente (el paciente no elige la hora, el sistema asigna el primer turno libre)
router.post('/asignar-automatica', requerirRoles(['PACIENTE', 'ADMINISTRADOR', 'RECEPCIONISTA']), CitasController.asignarCitaAutomatica);

// Listar citas
router.get('/', CitasController.listarCitas);

// Actualizar el estado de una cita
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

// Limpiar todas las citas (exclusivo Administración / Recepción)
router.delete('/', requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA']), CitasController.limpiarCitas);
router.post('/limpiar', requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA']), CitasController.limpiarCitas);

export default router;
