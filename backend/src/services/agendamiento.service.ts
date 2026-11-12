import { v4 as uuidv4 } from 'uuid';
import { CrearCitaDTO, AsignarCitaAutomaticaDTO, CitaResponse, SlotDisponible } from '../types/index.js';
import { GoogleCalendarService } from './googleCalendar.service.js';

interface MedicoHorarioDef {
  medicoId: string;
  consultorioId: number;
  diaSemana: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  horaInicio: string; // "08:00"
  horaFin: string;    // "13:00"
  duracionMin: number;
}

interface BloqueoDef {
  medicoId: string;
  inicio: string; // ISO
  fin: string;    // ISO
  motivo: string;
}

export class AgendamientoService {
  // Mock store o estado sincronizado en memoria para pruebas rápidas y funcionamiento autónomo
  private static horariosMedicos: MedicoHorarioDef[] = [
    // Dr. Roberto Mendoza (seeds.json) - Lunes a Sábado
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 1, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 2, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 3, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 4, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 5, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 6, horaInicio: '08:00', horaFin: '14:00', duracionMin: 30 },
    // Dra. Carmen Silva (seeds.json) - Lunes a Sábado (14:00 a 19:00 / Sábado mañana)
    { medicoId: 'c0000000-0000-0000-0000-000000000002', consultorioId: 2, diaSemana: 1, horaInicio: '08:00', horaFin: '19:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000002', consultorioId: 2, diaSemana: 2, horaInicio: '08:00', horaFin: '19:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000002', consultorioId: 2, diaSemana: 3, horaInicio: '08:00', horaFin: '19:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000002', consultorioId: 2, diaSemana: 4, horaInicio: '08:00', horaFin: '19:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000002', consultorioId: 2, diaSemana: 5, horaInicio: '08:00', horaFin: '19:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000002', consultorioId: 2, diaSemana: 6, horaInicio: '08:00', horaFin: '14:00', duracionMin: 30 },
    // Identificadores heredados (compatibilidad)
    { medicoId: 'd0000000-0000-0000-0000-000000000001', consultorioId: 101, diaSemana: 1, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'd0000000-0000-0000-0000-000000000001', consultorioId: 101, diaSemana: 2, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'd0000000-0000-0000-0000-000000000001', consultorioId: 101, diaSemana: 3, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'd0000000-0000-0000-0000-000000000001', consultorioId: 101, diaSemana: 4, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'd0000000-0000-0000-0000-000000000001', consultorioId: 101, diaSemana: 5, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'd0000000-0000-0000-0000-000000000002', consultorioId: 102, diaSemana: 1, horaInicio: '14:00', horaFin: '19:00', duracionMin: 30 },
    { medicoId: 'd0000000-0000-0000-0000-000000000002', consultorioId: 102, diaSemana: 3, horaInicio: '14:00', horaFin: '19:00', duracionMin: 30 },
    { medicoId: 'd0000000-0000-0000-0000-000000000002', consultorioId: 102, diaSemana: 5, horaInicio: '14:00', horaFin: '19:00', duracionMin: 30 }
  ];

  private static bloqueos: BloqueoDef[] = [];
  
  private static citas: CitaResponse[] = [];

  public static async limpiarTodasLasCitas(): Promise<void> {
    this.citas = [];
  }

  /**
   * Obtiene la disponibilidad horaria de un médico en una fecha específica
   */
  public static async obtenerDisponibilidad(medicoId: string, fechaStr: string): Promise<SlotDisponible[]> {
    const fecha = new Date(fechaStr + 'T12:00:00Z');
    const diaSemana = fecha.getDay(); // 0 a 6

    const horario = this.horariosMedicos.find(h => h.medicoId === medicoId && h.diaSemana === diaSemana);
    if (!horario) {
      return [];
    }

    const slots: SlotDisponible[] = [];
    const duracion = horario.duracionMin;

    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    };

    const toHHMM = (minTotal: number) => {
      const h = Math.floor(minTotal / 60).toString().padStart(2, '0');
      const m = (minTotal % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const startMin = toMin(horario.horaInicio);
    const endMin = toMin(horario.horaFin);

    for (let current = startMin; current + duracion <= endMin; current += duracion) {
      const slotInicioStr = toHHMM(current);
      const slotFinStr = toHHMM(current + duracion);

      const fechaHoraInicioIso = `${fechaStr}T${slotInicioStr}:00Z`;
      const fechaHoraFinIso = `${fechaStr}T${slotFinStr}:00Z`;

      // Validar si existe colisión con citas activas
      const hayColisionCita = this.citas.some(c => {
        if (c.medicoId !== medicoId) return false;
        if (['CANCELADA', 'NO_ASISTIO'].includes(c.estado)) return false;

        const cInicio = new Date(c.fechaHoraInicio).getTime();
        const cFin = new Date(c.fechaHoraFin).getTime();
        const sInicio = new Date(fechaHoraInicioIso).getTime();
        const sFin = new Date(fechaHoraFinIso).getTime();

        return Math.max(cInicio, sInicio) < Math.min(cFin, sFin);
      });

      // Validar si existe bloqueo médico
      const hayBloqueo = this.bloqueos.some(b => {
        if (b.medicoId !== medicoId) return false;
        const bInicio = new Date(b.inicio).getTime();
        const bFin = new Date(b.fin).getTime();
        const sInicio = new Date(fechaHoraInicioIso).getTime();
        const sFin = new Date(fechaHoraFinIso).getTime();

        return Math.max(bInicio, sInicio) < Math.min(bFin, sFin);
      });

      if (!hayColisionCita && !hayBloqueo) {
        slots.push({
          horaInicio: slotInicioStr,
          horaFin: slotFinStr,
          fecha: fechaStr,
          medicoId,
          consultorioId: horario.consultorioId,
          duracionMin: duracion
        });
      }
    }

    return slots;
  }

  /**
   * Reserva una nueva cita validando reglas de colisión estricta y sincronizando con Google Calendar
   */
  public static async reservarCita(dto: CrearCitaDTO): Promise<CitaResponse> {
    const duracion = dto.duracionMin || 30;
    const [h, m] = dto.horaInicio.split(':').map(Number);
    const fechaHoraInicio = new Date(`${dto.fecha}T${dto.horaInicio}:00Z`);
    const fechaHoraFin = new Date(fechaHoraInicio.getTime() + duracion * 60000);

    // 1. Verificación de colisión estricta (Regla anti double-booking)
    const conflicto = this.citas.find(c => {
      if (c.medicoId !== dto.medicoId) return false;
      if (['CANCELADA', 'NO_ASISTIO'].includes(c.estado)) return false;

      const cInicio = new Date(c.fechaHoraInicio).getTime();
      const cFin = new Date(c.fechaHoraFin).getTime();

      return Math.max(cInicio, fechaHoraInicio.getTime()) < Math.min(cFin, fechaHoraFin.getTime());
    });

    if (conflicto) {
      throw new Error(`CONFLICTO_HORARIO: El profesional ya tiene una cita asignada en ese rango horario (${conflicto.codigoCita}).`);
    }

    // 2. Sincronización con Google Calendar si está habilitada
    let gcalResult = null;
    if (dto.sincronizarGoogleCalendar !== false) {
      try {
        gcalResult = await GoogleCalendarService.sincronizarEvento({
          summary: `Consulta Médica - ${dto.motivoConsulta || 'MedPulse'}`,
          description: `Cita médica reservada en MedPulse. Código provisional.`,
          startDateTime: fechaHoraInicio.toISOString(),
          endDateTime: fechaHoraFin.toISOString()
        });
      } catch (err) {
        console.warn('Advertencia al sincronizar con Google Calendar:', err);
      }
    }

    // 3. Crear entidad Cita
    const codigoCita = `CITA-${Date.now().toString().slice(-6)}`;
    const reservadoPor = dto.reservadoPor || (
      dto.canalOrigen === 'RECEPCION_PRESENCIAL' || dto.canalOrigen === 'RECEPCION_TELEFONICA'
        ? 'ADMINISTRADOR'
        : 'PACIENTE'
    );

    const nuevaCita: CitaResponse = {
      id: uuidv4(),
      codigoCita,
      pacienteId: dto.pacienteId,
      pacienteNombre: dto.pacienteNombre,
      pacienteDocumento: dto.pacienteDocumento,
      pacienteTelefono: dto.pacienteTelefono,
      medicoId: dto.medicoId,
      especialidadId: dto.especialidadId,
      consultorioId: dto.consultorioId || 3,
      fechaHoraInicio: fechaHoraInicio.toISOString(),
      fechaHoraFin: fechaHoraFin.toISOString(),
      estado: reservadoPor === 'ADMINISTRADOR' ? 'CONFIRMADA' : 'PENDIENTE',
      motivoConsulta: dto.motivoConsulta || null,
      canalOrigen: dto.canalOrigen || (reservadoPor === 'ADMINISTRADOR' ? 'RECEPCION_PRESENCIAL' : 'WEB_PACIENTE'),
      reservadoPor,
      googleCalendarEvent: gcalResult ? {
        eventId: gcalResult.googleEventId,
        linkEvento: gcalResult.linkEvento,
        sincronizado: true
      } : null,
      creadoEn: new Date().toISOString()
    };

    this.citas.push(nuevaCita);
    return nuevaCita;
  }

  /**
   * Actualiza el estado de una cita (ej. cuando Admin o Secretaria confirma la cita PENDIENTE -> CONFIRMADA)
   */
  public static async actualizarEstadoCita(idOrCodigo: string, nuevoEstado: any): Promise<CitaResponse | null> {
    const cita = this.citas.find(c => c.id === idOrCodigo || c.codigoCita === idOrCodigo);
    if (!cita) return null;
    cita.estado = nuevoEstado;
    return cita;
  }

  /**
   * Lista todas las citas registradas, con filtro opcional por rol creador ('PACIENTE' | 'ADMINISTRADOR')
   */
  public static async listarCitas(reservadoPor?: 'PACIENTE' | 'ADMINISTRADOR'): Promise<CitaResponse[]> {
    if (reservadoPor) {
      return this.citas.filter(c => c.reservadoPor === reservadoPor);
    }
    return this.citas;
  }

  /**
   * Asignación automática de cita:
   * El paciente NO elige la hora. El sistema analiza el horario médico del día,
   * toma el primer turno libre garantizando no-colisión (anti double-booking)
   * y le informa inmediatamente al paciente la hora asignada.
   */
  public static async asignarCitaAutomatica(dto: AsignarCitaAutomaticaDTO): Promise<{
    cita: CitaResponse;
    horaAsignada: string;
    consultorioId: number;
    mensaje: string;
  }> {
    const slots = await this.obtenerDisponibilidad(dto.medicoId, dto.fecha);

    if (slots.length === 0) {
      throw new Error(`SIN_TURNOS_DISPONIBLES: El médico no cuenta con turnos disponibles para la fecha ${dto.fecha}. Por favor seleccione otra fecha.`);
    }

    // Seleccionar el primer turno libre
    const slotSeleccionado = slots[0];

    const cita = await this.reservarCita({
      pacienteId: dto.pacienteId,
      pacienteNombre: dto.pacienteNombre,
      pacienteDocumento: dto.pacienteDocumento,
      pacienteTelefono: dto.pacienteTelefono,
      medicoId: dto.medicoId,
      especialidadId: dto.especialidadId,
      consultorioId: slotSeleccionado.consultorioId,
      fecha: dto.fecha,
      horaInicio: slotSeleccionado.horaInicio,
      duracionMin: slotSeleccionado.duracionMin,
      motivoConsulta: dto.motivoConsulta,
      canalOrigen: dto.canalOrigen || 'WEB_PACIENTE',
      reservadoPor: dto.reservadoPor || 'PACIENTE',
      sincronizarGoogleCalendar: true
    });

    return {
      cita,
      horaAsignada: `${slotSeleccionado.horaInicio} - ${slotSeleccionado.horaFin}`,
      consultorioId: slotSeleccionado.consultorioId,
      mensaje: `Cita asignada automáticamente para las ${slotSeleccionado.horaInicio} hrs (${slotSeleccionado.duracionMin} min de consulta).`
    };
  }

  /**
   * Verifica un horario específico solicitado por WhatsApp o devuelve las horas alternativas disponibles si esa hora está llena o fuera de turno.
   */
  public static async verificarSlotEspecifico(
    medicoId: string,
    fechaStr: string,
    horaSolicitada: string
  ): Promise<{
    disponible: boolean;
    slotExacto?: SlotDisponible;
    motivoRechazo?: 'HORA_OCUPADA' | 'FUERA_DE_HORARIO' | 'DIA_SIN_ATENCION';
    citaExistenteCodigo?: string;
    alternativasDisponibles: SlotDisponible[];
  }> {
    const fecha = new Date(fechaStr + 'T12:00:00Z');
    const diaSemana = fecha.getDay();
    const horario = this.horariosMedicos.find(h => h.medicoId === medicoId && h.diaSemana === diaSemana);

    if (!horario) {
      return {
        disponible: false,
        motivoRechazo: 'DIA_SIN_ATENCION',
        alternativasDisponibles: []
      };
    }

    const todosSlotsLibres = await this.obtenerDisponibilidad(medicoId, fechaStr);
    const slotMatch = todosSlotsLibres.find(s => s.horaInicio === horaSolicitada);

    if (slotMatch) {
      return {
        disponible: true,
        slotExacto: slotMatch,
        alternativasDisponibles: todosSlotsLibres
      };
    }

    // Verificar si está ocupada por otra cita en esa hora
    const fechaHoraSolicitadaIso = `${fechaStr}T${horaSolicitada}:00Z`;
    const sInicio = new Date(fechaHoraSolicitadaIso).getTime();
    const sFin = sInicio + 30 * 60000;

    const citaEnConflicto = this.citas.find(c => {
      if (c.medicoId !== medicoId) return false;
      if (['CANCELADA', 'NO_ASISTIO'].includes(c.estado)) return false;
      const cInicio = new Date(c.fechaHoraInicio).getTime();
      const cFin = new Date(c.fechaHoraFin).getTime();
      return Math.max(cInicio, sInicio) < Math.min(cFin, sFin);
    });

    if (citaEnConflicto) {
      return {
        disponible: false,
        motivoRechazo: 'HORA_OCUPADA',
        citaExistenteCodigo: citaEnConflicto.codigoCita,
        alternativasDisponibles: todosSlotsLibres
      };
    }

    return {
      disponible: false,
      motivoRechazo: 'FUERA_DE_HORARIO',
      alternativasDisponibles: todosSlotsLibres
    };
  }
}
