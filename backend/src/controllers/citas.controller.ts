import { Request, Response } from 'express';
import { AgendamientoService } from '../services/agendamiento.service.js';
import { CrearCitaDTO, EstadoCita } from '../types/index.js';

const ESTADOS_VALIDOS: EstadoCita[] = [
  'PENDIENTE',
  'CONFIRMADA',
  'EN_CONSULTA',
  'COMPLETADA',
  'CANCELADA',
  'NO_ASISTIO',
  'REPROGRAMADA'
];

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

  public static async getCatalogos(req: Request, res: Response) {
    try {
      const isStaff = req.authUser && ['ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO'].includes(req.authUser.rol);
      const resultado = await AgendamientoService.obtenerCatalogos(Boolean(isStaff));
      return res.json(resultado);
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al obtener catálogos clínicos.'
      });
    }
  }

  public static async crearCita(req: Request, res: Response) {
    try {
      const {
        pacienteId,
        pacienteNombre,
        pacienteDocumento,
        pacienteTelefono,
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

      const rolUsuario = req.authUser?.rol;
      const reservadoPorFinal = rolUsuario === 'PACIENTE' ? 'PACIENTE' : reservadoPor;
      const canalFinal = rolUsuario === 'PACIENTE' ? 'WEB_PACIENTE' : canalOrigen;

      const dto: CrearCitaDTO = {
        pacienteId,
        pacienteNombre,
        pacienteDocumento,
        pacienteTelefono,
        medicoId,
        especialidadId: Number(especialidadId),
        consultorioId: consultorioId ? Number(consultorioId) : undefined,
        fecha,
        horaInicio,
        duracionMin: duracionMin ? Number(duracionMin) : 30,
        motivoConsulta,
        canalOrigen: canalFinal,
        reservadoPor: reservadoPorFinal,
        sincronizarGoogleCalendar: sincronizarGoogleCalendar ?? true
      };

      const nuevaCita = await AgendamientoService.reservarCita(dto);

      return res.status(201).json({
        ok: true,
        message: 'Cita reservada y sincronizada exitosamente.',
        data: nuevaCita
      });
    } catch (error: any) {
      if (error.message?.includes('CONFLICTO_HORARIO') || error.message?.includes('MEDICO_BLOQUEADO')) {
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
      let citas = await AgendamientoService.listarCitas(
        reservadoPor as 'PACIENTE' | 'ADMINISTRADOR' | undefined
      );

      // Si llega un médico autenticado, opcionalmente mantener vista de agenda sin filtrar admin si pide ?all=1
      if (req.authUser?.rol === 'MEDICO' && req.query.medicoId) {
        citas = citas.filter(c => c.medicoId === req.query.medicoId);
      }

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

  public static async asignarCitaAutomatica(req: Request, res: Response) {
    try {
      const pacienteId = req.body.pacienteId || req.body.paciente_id;
      const pacienteNombre = req.body.pacienteNombre || req.body.paciente_nombre;
      const pacienteDocumento = req.body.pacienteDocumento || req.body.paciente_documento;
      const pacienteTelefono = req.body.pacienteTelefono || req.body.paciente_telefono;
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

      const rolUsuario = req.authUser?.rol;
      const reservadoPorFinal = rolUsuario === 'PACIENTE' ? 'PACIENTE' : reservadoPor;
      const canalFinal = rolUsuario === 'PACIENTE' ? 'WEB_PACIENTE' : canalOrigen;

      const resultado = await AgendamientoService.asignarCitaAutomatica({
        pacienteId,
        pacienteNombre,
        pacienteDocumento,
        pacienteTelefono,
        medicoId,
        especialidadId: Number(especialidadId),
        fecha,
        motivoConsulta,
        canalOrigen: canalFinal,
        reservadoPor: reservadoPorFinal
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
      if (error.message?.includes('CONFLICTO_HORARIO') || error.message?.includes('MEDICO_BLOQUEADO')) {
        return res.status(409).json({
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

  public static async actualizarEstado(req: Request, res: Response) {
    try {
      const id = String(req.params.id || '');
      const estado = String(req.body?.estado || '').toUpperCase() as EstadoCita;
      if (!id || !ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
          ok: false,
          error: 'Se requiere el id de la cita y un estado clínico válido.'
        });
      }

      // Regla de seguridad: un PACIENTE solo puede cancelar su propia cita, no confirmarla
      if (req.authUser?.rol === 'PACIENTE' && estado !== 'CANCELADA') {
        return res.status(403).json({
          ok: false,
          error: 'Un paciente solo puede cancelar sus citas; la confirmación corresponde a Administración o Recepción.'
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

  public static async listarBloqueos(req: Request, res: Response) {
    try {
      const medicoId = typeof req.query.medicoId === 'string' ? req.query.medicoId : undefined;
      const bloqueos = await AgendamientoService.listarBloqueos(medicoId);
      return res.json({ ok: true, data: bloqueos });
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: error.message || 'Error listando bloqueos.' });
    }
  }

  public static async crearBloqueo(req: Request, res: Response) {
    try {
      const medicoId = req.body?.medicoId || req.authUser?.sub || 'c0000000-0000-0000-0000-000000000001';
      const { fechaInicio, fechaFin, motivo } = req.body || {};
      if (!fechaInicio || !fechaFin || !motivo) {
        return res.status(400).json({
          ok: false,
          error: 'Campos requeridos: motivo, fechaInicio y fechaFin.'
        });
      }
      const bloqueo = await AgendamientoService.crearBloqueo({ medicoId, fechaInicio, fechaFin, motivo });
      return res.status(201).json({
        ok: true,
        message: 'Bloqueo de agenda registrado en Supabase.',
        data: bloqueo
      });
    } catch (error: any) {
      return res.status(400).json({ ok: false, error: error.message || 'Error creando bloqueo.' });
    }
  }

  public static async eliminarBloqueo(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ ok: false, error: 'ID de bloqueo inválido.' });
      const ok = await AgendamientoService.eliminarBloqueo(id);
      if (!ok) return res.status(404).json({ ok: false, error: 'Bloqueo no encontrado.' });
      return res.json({ ok: true, message: 'Bloqueo eliminado.' });
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: error.message || 'Error eliminando bloqueo.' });
    }
  }
}
