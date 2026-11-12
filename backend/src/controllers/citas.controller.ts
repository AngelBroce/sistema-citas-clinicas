import { Request, Response } from 'express';
import { AgendamientoService } from '../services/agendamiento.service.js';
import { CrearCitaDTO } from '../types/index.js';

export class CitasController {
  public static async getDisponibilidad(req: Request, res: Response) {
    try {
      const { medicoId, fecha } = req.query;

      if (!medicoId || !fecha) {
        return res.status(400).json({
          ok: false,
          error: 'Parámetros obligatorios faltantes: medicoId y fecha (YYYY-MM-DD).'
        });
      }

      const slots = await AgendamientoService.obtenerDisponibilidad(
        medicoId as string,
        fecha as string
      );

      return res.json({
        ok: true,
        data: {
          medicoId,
          fecha,
          totalSlotsDisponibles: slots.length,
          slots
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error interno al consultar disponibilidad.'
      });
    }
  }

  public static async crearCita(req: Request, res: Response) {
    try {
      const {
        pacienteId,
        medicoId,
        especialidadId,
        consultorioId,
        fecha,
        horaInicio,
        duracionMin,
        motivoConsulta,
        canalOrigen,
        reservadoPor,
        sincronizarGoogleCalendar
      } = req.body;

      if (!pacienteId || !medicoId || !especialidadId || !fecha || !horaInicio) {
        return res.status(400).json({
          ok: false,
          error: 'Campos requeridos: pacienteId, medicoId, especialidadId, fecha (YYYY-MM-DD), horaInicio (HH:mm).'
        });
      }

      const dto: CrearCitaDTO = {
        pacienteId,
        medicoId,
        especialidadId: Number(especialidadId),
        consultorioId: consultorioId ? Number(consultorioId) : undefined,
        fecha,
        horaInicio,
        duracionMin: duracionMin ? Number(duracionMin) : 30,
        motivoConsulta,
        canalOrigen,
        reservadoPor,
        sincronizarGoogleCalendar: sincronizarGoogleCalendar ?? true
      };

      const nuevaCita = await AgendamientoService.reservarCita(dto);

      return res.status(201).json({
        ok: true,
        message: 'Cita reservada y sincronizada exitosamente.',
        data: nuevaCita
      });
    } catch (error: any) {
      if (error.message?.includes('CONFLICTO_HORARIO')) {
        return res.status(409).json({
          ok: false,
          error: error.message
        });
      }

      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al procesar la reserva de cita.'
      });
    }
  }

  public static async listarCitas(req: Request, res: Response) {
    try {
      const { reservadoPor } = req.query;
      const citas = await AgendamientoService.listarCitas(
        reservadoPor as 'PACIENTE' | 'ADMINISTRADOR' | undefined
      );
      return res.json({
        ok: true,
        total: citas.length,
        data: citas,
        datos: citas
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al listar las citas.'
      });
    }
  }

  /**
   * Asignación automática: El paciente no elige la hora.
   * El sistema calcula y asigna el primer turno disponible del médico en la fecha indicada.
   */
  public static async asignarCitaAutomatica(req: Request, res: Response) {
    try {
      const pacienteId = req.body.pacienteId || req.body.paciente_id;
      const medicoId = req.body.medicoId || req.body.medico_id;
      const especialidadId = req.body.especialidadId ?? req.body.especialidad_id;
      const fecha = req.body.fecha;
      const motivoConsulta = req.body.motivoConsulta || req.body.motivo_consulta;
      const canalOrigen = req.body.canalOrigen || req.body.canal_origen;
      const reservadoPor = req.body.reservadoPor || req.body.reservado_por;

      if (!pacienteId || !medicoId || !especialidadId || !fecha) {
        return res.status(400).json({
          ok: false,
          error: 'Campos requeridos: pacienteId, medicoId, especialidadId, fecha (YYYY-MM-DD).'
        });
      }

      const resultado = await AgendamientoService.asignarCitaAutomatica({
        pacienteId,
        medicoId,
        especialidadId: Number(especialidadId),
        fecha,
        motivoConsulta,
        canalOrigen,
        reservadoPor
      });

      return res.status(201).json({
        ok: true,
        message: resultado.mensaje,
        data: resultado
      });
    } catch (error: any) {
      if (error.message?.includes('SIN_TURNOS_DISPONIBLES')) {
        return res.status(404).json({
          ok: false,
          error: error.message
        });
      }
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al asignar la cita automáticamente.'
      });
    }
  }

  /**
   * Permite a Administración o Secretaría confirmar una cita ('PENDIENTE' -> 'CONFIRMADA') o cambiar su estado.
   */
  public static async actualizarEstado(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '');
      const { estado } = req.body;
      if (!id || !estado) {
        return res.status(400).json({
          ok: false,
          error: 'Se requiere el id de la cita y el nuevo estado.'
        });
      }
      const citaActualizada = await AgendamientoService.actualizarEstadoCita(id, estado);
      if (!citaActualizada) {
        return res.status(404).json({
          ok: false,
          error: 'Cita no encontrada en el servidor.'
        });
      }
      return res.json({
        ok: true,
        message: `Estado de cita ${citaActualizada.codigoCita} actualizado a ${estado}.`,
        data: citaActualizada
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al actualizar el estado de la cita.'
      });
    }
  }

  /**
   * Elimina todas las citas para reiniciar pruebas desde cero.
   */
  public static async limpiarCitas(_req: Request, res: Response) {
    try {
      await AgendamientoService.limpiarTodasLasCitas();
      return res.json({
        ok: true,
        message: 'Todas las citas han sido eliminadas correctamente.',
        total: 0,
        data: [],
        datos: []
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al limpiar las citas.'
      });
    }
  }
}
