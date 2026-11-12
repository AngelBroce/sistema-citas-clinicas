import { Router } from 'express';
import { CitasController } from '../controllers/citas.controller.js';

const router = Router();

// Consultar disponibilidad horaria de un médico (anti-solapamiento)
router.get('/disponibilidad', CitasController.getDisponibilidad);

// Reservar nueva cita médica con sincronización a Google Calendar
router.post('/reservar', CitasController.crearCita);

// Asignar cita automáticamente (el paciente no elige la hora, el sistema le asigna el primer turno libre)
router.post('/asignar-automatica', CitasController.asignarCitaAutomatica);

// Listar todas las citas
router.get('/', CitasController.listarCitas);

// Actualizar el estado de una cita (ej. PENDIENTE -> CONFIRMADA por Admin o Secretaria)
router.patch('/:id/estado', CitasController.actualizarEstado);
router.post('/:id/estado', CitasController.actualizarEstado);

// Limpiar todas las citas
router.delete('/', CitasController.limpiarCitas);
router.post('/limpiar', CitasController.limpiarCitas);

export default router;
