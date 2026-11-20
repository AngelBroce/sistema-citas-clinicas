import { v4 as uuidv4 } from 'uuid';
import { CrearCitaDTO, AsignarCitaAutomaticaDTO, CitaResponse, SlotDisponible, EstadoCita } from '../types/index.js';
import { GoogleCalendarService } from './googleCalendar.service.js';
import { pool } from '../config/db.js';
import { isUuid, sanitizeText } from '../utils/security.js';

interface MedicoHorarioDef {
  medicoId: string;
  consultorioId: number;
  diaSemana: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  horaInicio: string; // "08:00"
  horaFin: string;    // "18:00"
  duracionMin: number;
}

export interface BloqueoAgendaItem {
  id: number;
  medicoId: string;
  inicio: string;
  fin: string;
  motivo: string;
  creadoEn?: string;
}

export class AgendamientoService {
  private static horariosMedicos: MedicoHorarioDef[] = [
    // Dr. Roberto Mendoza - Lunes a Sábado
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 1, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 2, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 3, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 4, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 5, horaInicio: '08:00', horaFin: '18:00', duracionMin: 30 },
    { medicoId: 'c0000000-0000-0000-0000-000000000001', consultorioId: 3, diaSemana: 6, horaInicio: '08:00', horaFin: '14:00', duracionMin: 30 },
    // Dra. Carmen Silva - Lunes a Sábado
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

  private static bloqueos: BloqueoAgendaItem[] = [];
  private static citas: CitaResponse[] = [];
  private static nextBloqueoId = 1;

  private static isDbEnabled(): boolean {
    return process.env.DISABLE_DB !== 'true' && process.env.NODE_ENV !== 'test';
  }

  private static async sincronizarDesdePostgres(): Promise<void> {
    if (!this.isDbEnabled()) return;
    try {
      const [citasRes, bloqueosRes] = await Promise.all([
        pool.query(`
          SELECT c.id, c.codigo_cita, c.paciente_id, c.medico_id, c.especialidad_id,
                 c.consultorio_id, c.fecha_hora_inicio, c.fecha_hora_fin, c.estado,
                 c.motivo_consulta, c.canal_origen, c.reservado_por, c.creado_en,
                 COALESCE(c.paciente_nombre_cache, TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, ''))) AS paciente_nombre,
                 COALESCE(c.paciente_documento_cache, p.documento_numero) AS paciente_documento,
                 COALESCE(c.paciente_telefono_cache, p.telefono) AS paciente_telefono
          FROM public.citas c
          LEFT JOIN public.pacientes p ON p.id = c.paciente_id
          ORDER BY c.fecha_hora_inicio ASC
        `),
        pool.query(`
          SELECT id, medico_id, fecha_hora_inicio, fecha_hora_fin, motivo, creado_en
          FROM public.bloqueos_agenda_medicos
          ORDER BY fecha_hora_inicio ASC
        `)
      ]);

      // Supabase es la fuente de verdad: reemplaza el caché en memoria con el snapshot real
      this.citas = citasRes.rows.map((row) => ({
        id: row.id,
        codigoCita: row.codigo_cita,
        pacienteId: row.paciente_id,
        pacienteNombre: row.paciente_nombre || undefined,
        pacienteDocumento: row.paciente_documento || undefined,
        pacienteTelefono: row.paciente_telefono || undefined,
        medicoId: row.medico_id,
        especialidadId: Number(row.especialidad_id),
        consultorioId: row.consultorio_id ? Number(row.consultorio_id) : 3,
        fechaHoraInicio: new Date(row.fecha_hora_inicio).toISOString(),
        fechaHoraFin: new Date(row.fecha_hora_fin).toISOString(),
        estado: row.estado,
        motivoConsulta: row.motivo_consulta || null,
        canalOrigen: row.canal_origen,
        reservadoPor: row.reservado_por,
        googleCalendarEvent: null,
        creadoEn: new Date(row.creado_en).toISOString()
      }));

      this.bloqueos = bloqueosRes.rows.map((b) => ({
        id: Number(b.id),
        medicoId: b.medico_id,
        inicio: new Date(b.fecha_hora_inicio).toISOString(),
        fin: new Date(b.fecha_hora_fin).toISOString(),
        motivo: b.motivo,
        creadoEn: new Date(b.creado_en).toISOString()
      }));
    } catch {
      // Fallback silencioso a memoria si la base de datos no está disponible
    }
  }

  /**
   * Garantiza que exista fila válida en public.pacientes antes de insertar la cita en Supabase.
   */
  private static async resolverPacienteIdEnPostgres(dto: CrearCitaDTO): Promise<string> {
    if (isUuid(dto.pacienteId)) {
      const byId = await pool.query('SELECT id FROM public.pacientes WHERE id = $1 LIMIT 1', [dto.pacienteId]);
      if (byId.rows.length > 0) return byId.rows[0].id;

      const byUserId = await pool.query('SELECT id FROM public.pacientes WHERE usuario_id = $1 LIMIT 1', [dto.pacienteId]);
      if (byUserId.rows.length > 0) return byUserId.rows[0].id;
    }

    const docClean = sanitizeText(dto.pacienteDocumento, 30);
    if (docClean) {
      const byDoc = await pool.query('SELECT id FROM public.pacientes WHERE documento_numero = $1 LIMIT 1', [docClean]);
      if (byDoc.rows.length > 0) return byDoc.rows[0].id;
    }

    const fullName = sanitizeText(dto.pacienteNombre || 'Paciente Clínico', 160);
    const parts = fullName.split(/\s+/);
    const nombres = parts[0] || 'Paciente';
    const apellidos = parts.slice(1).join(' ') || 'Registrado';
    const docFinal = docClean || `PA-${Date.now().toString().slice(-6)}`;
    const telFinal = sanitizeText(dto.pacienteTelefono || '+507 6598-2118', 25);
    const nuevoPacId = isUuid(dto.pacienteId) ? dto.pacienteId : uuidv4();

    const upRes = await pool.query(
      `INSERT INTO public.pacientes (
        id, documento_tipo, documento_numero, nombres, apellidos,
        fecha_nacimiento, genero, telefono
      ) VALUES ($1, 'CEDULA_NACIONAL', $2, $3, $4, '1995-01-01', 'OTRO', $5)
      ON CONFLICT (documento_numero) DO UPDATE SET
        nombres = EXCLUDED.nombres,
        apellidos = EXCLUDED.apellidos,
        telefono = EXCLUDED.telefono
      RETURNING id`,
      [nuevoPacId, docFinal, nombres, apellidos, telFinal]
    );

    return upRes.rows[0]?.id || 'e0000000-0000-0000-0000-000000000001';
  }

  public static async limpiarTodasLasCitas(): Promise<void> {
    this.citas = [];
    this.bloqueos = [];
    if (!this.isDbEnabled()) return;
    await pool.query('DELETE FROM public.citas;');
  }

  /**
   * Obtiene los bloqueos temporales activos de agenda médica.
   */
  public static async listarBloqueos(medicoId?: string): Promise<BloqueoAgendaItem[]> {
    await this.sincronizarDesdePostgres();
    if (medicoId) {
      return this.bloqueos.filter(b => b.medicoId === medicoId);
    }
    return this.bloqueos;
  }

  /**
   * Registra un bloqueo temporal de agenda médica (congresos, descansos, guardias).
   */
  public static async crearBloqueo(input: {
    medicoId: string;
    fechaInicio: string;
    fechaFin: string;
    motivo: string;
  }): Promise<BloqueoAgendaItem> {
    const medicoId = sanitizeText(input.medicoId, 60) || 'c0000000-0000-0000-0000-000000000001';
    const motivo = sanitizeText(input.motivo, 255);
    if (!motivo) {
      throw new Error('El motivo del bloqueo es obligatorio.');
    }

    const inicioIso = input.fechaInicio.length <= 10
      ? `${input.fechaInicio}T00:00:00Z`
      : new Date(input.fechaInicio).toISOString();
    const finIso = input.fechaFin.length <= 10
      ? `${input.fechaFin}T23:59:59Z`
      : new Date(input.fechaFin).toISOString();

    if (new Date(finIso).getTime() <= new Date(inicioIso).getTime()) {
      throw new Error('La fecha de fin debe ser igual o posterior a la fecha de inicio.');
    }

    if (this.isDbEnabled()) {
      const res = await pool.query(
        `INSERT INTO public.bloqueos_agenda_medicos (medico_id, fecha_hora_inicio, fecha_hora_fin, motivo)
         VALUES ($1, $2, $3, $4)
         RETURNING id, medico_id, fecha_hora_inicio, fecha_hora_fin, motivo, creado_en`,
        [medicoId, inicioIso, finIso, motivo]
      );
      const row = res.rows[0];
      const item: BloqueoAgendaItem = {
        id: Number(row.id),
        medicoId: row.medico_id,
        inicio: new Date(row.fecha_hora_inicio).toISOString(),
        fin: new Date(row.fecha_hora_fin).toISOString(),
        motivo: row.motivo,
        creadoEn: new Date(row.creado_en).toISOString()
      };
      this.bloqueos.push(item);
      return item;
    }

    const item: BloqueoAgendaItem = {
      id: this.nextBloqueoId++,
      medicoId,
      inicio: inicioIso,
      fin: finIso,
      motivo,
      creadoEn: new Date().toISOString()
    };
    this.bloqueos.push(item);
    return item;
  }

  public static async eliminarBloqueo(id: number): Promise<boolean> {
    if (this.isDbEnabled()) {
      const res = await pool.query('DELETE FROM public.bloqueos_agenda_medicos WHERE id = $1', [id]);
      this.bloqueos = this.bloqueos.filter(b => b.id !== id);
      return (res.rowCount || 0) > 0;
    }
    const prevLen = this.bloqueos.length;
    this.bloqueos = this.bloqueos.filter(b => b.id !== id);
    return this.bloqueos.length < prevLen;
  }

  /**
   * Obtiene catálogos clínicos reales desde Supabase (especialidades, consultorios, médicos, horarios).
   */
  public static async obtenerCatalogos(incluirPacientes = false) {
    if (!this.isDbEnabled()) {
      return { ok: true, fuente: 'memoria', data: null };
    }
    const [esps, rooms, docs, rels, horarios, pacs] = await Promise.all([
      pool.query('SELECT * FROM public.especialidades WHERE esta_activa = TRUE ORDER BY id ASC'),
      pool.query('SELECT * FROM public.consultorios WHERE esta_activo = TRUE ORDER BY id ASC'),
      pool.query('SELECT * FROM public.medicos WHERE esta_activo = TRUE ORDER BY apellidos ASC'),
      pool.query('SELECT * FROM public.medicos_especialidades'),
      pool.query('SELECT * FROM public.horarios_medicos WHERE esta_activo = TRUE ORDER BY medico_id, dia_semana'),
      incluirPacientes
        ? pool.query('SELECT id, usuario_id, documento_tipo, documento_numero, nombres, apellidos, telefono, email, grupo_sanguineo, alergias FROM public.pacientes ORDER BY creado_en DESC LIMIT 200')
        : Promise.resolve({ rows: [] })
    ]);

    return {
      ok: true,
      fuente: 'supabase',
      data: {
        especialidades: esps.rows,
        consultorios: rooms.rows,
        medicos: docs.rows,
        medicos_especialidades: rels.rows,
        horarios_medicos: horarios.rows,
        ...(incluirPacientes ? { pacientes: pacs.rows } : {})
      }
    };
  }

  /**
   * Obtiene la disponibilidad horaria de un médico en una fecha específica
   */
  public static async obtenerDisponibilidad(medicoId: string, fechaStr: string): Promise<SlotDisponible[]> {
    await this.sincronizarDesdePostgres();
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

      const hayColisionCita = this.citas.some(c => {
        if (c.medicoId !== medicoId) return false;
        if (['CANCELADA', 'NO_ASISTIO'].includes(c.estado)) return false;

        const cInicio = new Date(c.fechaHoraInicio).getTime();
        const cFin = new Date(c.fechaHoraFin).getTime();
        const sInicio = new Date(fechaHoraInicioIso).getTime();
        const sFin = new Date(fechaHoraFinIso).getTime();

        return Math.max(cInicio, sInicio) < Math.min(cFin, sFin);
      });

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
   * Reserva una nueva cita validando colisión estricta y bloqueos, persistiendo en Supabase.
   */
  public static async reservarCita(dto: CrearCitaDTO): Promise<CitaResponse> {
    await this.sincronizarDesdePostgres();
    const duracion = dto.duracionMin || 30;
    const fechaHoraInicio = new Date(`${dto.fecha}T${dto.horaInicio}:00Z`);
    const fechaHoraFin = new Date(fechaHoraInicio.getTime() + duracion * 60000);

    // 1. Verificar bloqueo médico en ese rango
    const bloqueoActivo = this.bloqueos.find(b => {
      if (b.medicoId !== dto.medicoId) return false;
      const bInicio = new Date(b.inicio).getTime();
      const bFin = new Date(b.fin).getTime();
      return Math.max(bInicio, fechaHoraInicio.getTime()) < Math.min(bFin, fechaHoraFin.getTime());
    });
    if (bloqueoActivo) {
      throw new Error(`MEDICO_BLOQUEADO: El profesional tiene un bloqueo programado (${bloqueoActivo.motivo}).`);
    }

    // 2. Verificación de colisión estricta (Regla anti double-booking)
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

    // 3. Sincronización con Google Calendar
    let gcalResult = null;
    if (dto.sincronizarGoogleCalendar !== false) {
      try {
        gcalResult = await GoogleCalendarService.sincronizarEvento({
          summary: `Consulta Médica - ${dto.motivoConsulta || 'MedPulse'}`,
          description: `Cita médica reservada en MedPulse.`,
          startDateTime: fechaHoraInicio.toISOString(),
          endDateTime: fechaHoraFin.toISOString()
        });
      } catch (err) {
        console.warn('Advertencia al sincronizar con Google Calendar:', err);
      }
    }

    const codigoCita = `CITA-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`.slice(0, 20);
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

    if (this.isDbEnabled()) {
      try {
        const pacienteIdReal = await this.resolverPacienteIdEnPostgres(dto);
        nuevaCita.pacienteId = pacienteIdReal;

        await pool.query(
          `INSERT INTO public.citas (
             id, codigo_cita, paciente_id, medico_id, especialidad_id, consultorio_id,
             fecha_hora_inicio, fecha_hora_fin, estado, motivo_consulta, canal_origen, reservado_por,
             paciente_nombre_cache, paciente_documento_cache, paciente_telefono_cache
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            nuevaCita.id,
            nuevaCita.codigoCita,
            pacienteIdReal,
            nuevaCita.medicoId,
            nuevaCita.especialidadId,
            nuevaCita.consultorioId,
            nuevaCita.fechaHoraInicio,
            nuevaCita.fechaHoraFin,
            nuevaCita.estado,
            nuevaCita.motivoConsulta,
            nuevaCita.canalOrigen,
            nuevaCita.reservadoPor,
            nuevaCita.pacienteNombre || null,
            nuevaCita.pacienteDocumento || null,
            nuevaCita.pacienteTelefono || null
          ]
        );
      } catch (dbErr: any) {
        if (dbErr?.code === '23P01') {
          throw new Error('CONFLICTO_HORARIO: Conflicto físico detectado en Supabase PostgreSQL (anti double-booking).');
        }
        throw new Error(`Error persistiendo la cita en Supabase: ${dbErr.message}`);
      }
    }

    this.citas.push(nuevaCita);
    return nuevaCita;
  }

  /**
   * Actualiza el estado de una cita en Supabase y memoria.
   */
  public static async actualizarEstadoCita(idOrCodigo: string, nuevoEstado: EstadoCita): Promise<CitaResponse | null> {
    await this.sincronizarDesdePostgres();
    const cita = this.citas.find(c => c.id === idOrCodigo || c.codigoCita === idOrCodigo);
    if (!cita) return null;

    if (this.isDbEnabled()) {
      const res = await pool.query(
        `UPDATE public.citas SET estado = $1 WHERE id::text = $2 OR codigo_cita = $2 RETURNING estado`,
        [nuevoEstado, idOrCodigo]
      );
      if (res.rowCount === 0) return null;
    }

    cita.estado = nuevoEstado;
    return cita;
  }

  /**
   * Lista todas las citas registradas, con filtro opcional por rol creador ('PACIENTE' | 'ADMINISTRADOR')
   */
  public static async listarCitas(reservadoPor?: 'PACIENTE' | 'ADMINISTRADOR'): Promise<CitaResponse[]> {
    await this.sincronizarDesdePostgres();
    if (reservadoPor) {
      return this.citas.filter(c => c.reservadoPor === reservadoPor);
    }
    return this.citas;
  }

  /**
   * Asignación automática de cita: toma el primer turno libre del médico en la fecha indicada.
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
   * Verifica un horario específico solicitado por WhatsApp o devuelve las horas alternativas disponibles.
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
