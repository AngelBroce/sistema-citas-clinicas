/**
 * ============================================================================
 * PROYECTO: Sistema Inteligente de Gestión de Citas Clínicas
 * ARCHIVO: database/models/index.ts
 * AUTOR: Elvis (DBA)
 * DESCRIPCIÓN: Definición de tipos e interfaces TypeScript para todas las
 *              entidades de la base de datos PostgreSQL. Compatible con
 *              Backend (Node.js/Express/NestJS) y Frontend (Astro).
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. TIPOS Y ENUMS DE DOMINIO
// ----------------------------------------------------------------------------

export type RolId = 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MEDICO' | 'PACIENTE';

export type Genero = 'MASCULINO' | 'FEMENINO' | 'OTRO';

export type EstadoCita =
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'EN_CONSULTA'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'NO_ASISTIO'
  | 'REPROGRAMADA';

export type CanalOrigenCita =
  | 'WEB_PACIENTE'
  | 'CHATBOT_WHATSAPP'
  | 'RECEPCION_PRESENCIAL'
  | 'RECEPCION_TELEFONICA';

export type EstadoConversacionChatbot =
  | 'ACTIVA'
  | 'EN_TRIAJE'
  | 'ESPERANDO_CONFIRMACION'
  | 'DERIVADA_RECEPCION'
  | 'FINALIZADA';

export type NivelTriaje = 'LEVE' | 'MODERADO' | 'URGENTE' | 'NO_APLICA';

export type RemitenteMensaje = 'USUARIO' | 'BOT' | 'AGENTE_HUMANO';

export type TipoMensajeChatbot = 'TEXTO' | 'BOTONES' | 'AUDIO' | 'UBICACION';

export type CanalRecordatorio = 'WHATSAPP' | 'EMAIL' | 'SMS';

export type EstadoRecordatorio = 'PENDIENTE' | 'ENVIADO' | 'FALLIDO' | 'CANCELADO';

export type EstadoSincronizacionCalendar =
  | 'SINCRONIZADO'
  | 'PENDIENTE_ACTUALIZACION'
  | 'ERROR'
  | 'ELIMINADO';

// ----------------------------------------------------------------------------
// 2. ENTIDADES DE SEGURIDAD Y ACCESO
// ----------------------------------------------------------------------------

export interface Rol {
  id: RolId;
  nombre: string;
  descripcion?: string | null;
  creado_en: Date;
}

export interface Usuario {
  id: string; // UUID
  email: string;
  password_hash: string;
  rol_id: RolId;
  esta_activo: boolean;
  ultimo_login?: Date | null;
  creado_en: Date;
  actualizado_en: Date;
}

export interface Administrador {
  id: string; // UUID (FK usuarios)
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  creado_en: Date;
  actualizado_en: Date;
  usuario?: Usuario;
}

export interface Recepcionista {
  id: string; // UUID (FK usuarios)
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  sede: string;
  creado_en: Date;
  actualizado_en: Date;
  usuario?: Usuario;
}

export interface Paciente {
  id: string; // UUID
  usuario_id?: string | null; // UUID (FK usuarios)
  documento_tipo: string;
  documento_numero: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | Date;
  genero: Genero;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
  grupo_sanguineo?: string | null;
  alergias?: string | null;
  contacto_emergencia_nombre?: string | null;
  contacto_emergencia_telefono?: string | null;
  creado_en: Date;
  actualizado_en: Date;
  usuario?: Usuario | null;
}

// ----------------------------------------------------------------------------
// 3. ENTIDADES DE GESTIÓN MÉDICA
// ----------------------------------------------------------------------------

export interface Especialidad {
  id: number;
  nombre: string;
  descripcion?: string | null;
  duracion_estimada_min: number;
  esta_activa: boolean;
  creado_en: Date;
  actualizado_en: Date;
}

export interface Consultorio {
  id: number;
  nombre: string;
  piso: string;
  sede: string;
  descripcion?: string | null;
  esta_activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
}

export interface Medico {
  id: string; // UUID (FK usuarios)
  numero_colegiatura: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  biografia?: string | null;
  tarifa_consulta: number;
  esta_activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
  usuario?: Usuario;
  especialidades?: Especialidad[];
}

export interface MedicoEspecialidad {
  medico_id: string;
  especialidad_id: number;
  es_principal: boolean;
}

// ----------------------------------------------------------------------------
// 4. ENTIDADES DE HORARIOS Y DISPONIBILIDAD
// ----------------------------------------------------------------------------

export interface HorarioMedico {
  id: number;
  medico_id: string;
  consultorio_id?: number | null;
  dia_semana: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  hora_inicio: string; // HH:mm:ss
  hora_fin: string; // HH:mm:ss
  duracion_cita_min: number;
  esta_activo: boolean;
  creado_en: Date;
  actualizado_en: Date;
  medico?: Medico;
  consultorio?: Consultorio | null;
}

export interface BloqueoAgendaMedico {
  id: number;
  medico_id: string;
  fecha_hora_inicio: Date;
  fecha_hora_fin: Date;
  motivo: string;
  creado_en: Date;
}

// ----------------------------------------------------------------------------
// 5. ENTIDADES DE CITAS Y AUDITORÍA
// ----------------------------------------------------------------------------

export interface Cita {
  id: string; // UUID
  codigo_cita: string;
  paciente_id: string;
  medico_id: string;
  especialidad_id: number;
  consultorio_id?: number | null;
  fecha_hora_inicio: Date;
  fecha_hora_fin: Date;
  estado: EstadoCita;
  motivo_consulta?: string | null;
  notas_paciente?: string | null;
  notas_medicas?: string | null;
  motivo_cancelacion?: string | null;
  canal_origen: CanalOrigenCita;
  creado_por_usuario_id?: string | null;
  creado_en: Date;
  actualizado_en: Date;
  paciente?: Paciente;
  medico?: Medico;
  especialidad?: Especialidad;
  consultorio?: Consultorio | null;
}

export interface HistorialCitaAuditoria {
  id: number;
  cita_id: string;
  estado_anterior?: string | null;
  estado_nuevo: string;
  cambiado_por_usuario_id?: string | null;
  motivo_cambio?: string | null;
  creado_en: Date;
}

// ----------------------------------------------------------------------------
// 6. ENTIDADES DE CHATBOT IA Y WHATSAPP
// ----------------------------------------------------------------------------

export interface ConversacionChatbot {
  id: string; // UUID
  whatsapp_from: string;
  paciente_id?: string | null;
  estado_conversacion: EstadoConversacionChatbot;
  contexto_conversacion: Record<string, unknown>;
  nivel_triaje?: NivelTriaje | null;
  resumen_triaje?: string | null;
  especialidad_sugerida_id?: number | null;
  ultima_interaccion: Date;
  creado_en: Date;
  actualizado_en: Date;
  paciente?: Paciente | null;
  especialidad_sugerida?: Especialidad | null;
  mensajes?: MensajeChatbot[];
}

export interface MensajeChatbot {
  id: number;
  conversacion_id: string;
  remitente: RemitenteMensaje;
  tipo_mensaje: TipoMensajeChatbot;
  contenido: string;
  intencion_detectada?: string | null;
  tokens_utilizados: number;
  creado_en: Date;
}

// ----------------------------------------------------------------------------
// 7. ENTIDADES DE RECORDATORIOS Y GOOGLE CALENDAR
// ----------------------------------------------------------------------------

export interface RecordatorioCita {
  id: string; // UUID
  cita_id: string;
  canal: CanalRecordatorio;
  fecha_hora_programada: Date;
  estado: EstadoRecordatorio;
  mensaje: string;
  respuesta_recibida?: string | null;
  enviado_en?: Date | null;
  creado_en: Date;
  cita?: Cita;
}

export interface CalendarioUsuario {
  id: string; // UUID
  usuario_id: string;
  proveedor: string; // 'GOOGLE_CALENDAR'
  calendar_id: string;
  access_token: string;
  refresh_token: string;
  expira_en: Date;
  esta_activo: boolean;
  ultima_sincronizacion?: Date | null;
  creado_en: Date;
  actualizado_en: Date;
}

export interface EventoCalendarioCita {
  id: number;
  cita_id: string;
  calendario_usuario_id: string;
  google_event_id: string;
  link_evento?: string | null;
  estado_sincronizacion: EstadoSincronizacionCalendar;
  creado_en: Date;
  actualizado_en: Date;
}
