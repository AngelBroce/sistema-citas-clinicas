export type RolId = 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MEDICO' | 'PACIENTE';
export type TipoReserva = 'PACIENTE' | 'ADMINISTRADOR';

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

export type NivelTriaje = 'LEVE' | 'MODERADO' | 'URGENTE' | 'NO_APLICA';

export interface SlotDisponible {
  horaInicio: string; // "09:00"
  horaFin: string;    // "09:30"
  fecha: string;      // "YYYY-MM-DD"
  medicoId: string;
  consultorioId: number;
  duracionMin: number;
}

export interface CrearCitaDTO {
  pacienteId: string;
  pacienteNombre?: string;
  pacienteDocumento?: string;
  pacienteTelefono?: string;
  medicoId: string;
  especialidadId: number;
  consultorioId?: number;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  duracionMin?: number;
  motivoConsulta?: string;
  canalOrigen?: CanalOrigenCita;
  reservadoPor?: TipoReserva;
  sincronizarGoogleCalendar?: boolean;
}

export interface AsignarCitaAutomaticaDTO {
  pacienteId: string;
  pacienteNombre?: string;
  pacienteDocumento?: string;
  pacienteTelefono?: string;
  medicoId: string;
  especialidadId: number;
  fecha: string; // "YYYY-MM-DD"
  motivoConsulta?: string;
  canalOrigen?: CanalOrigenCita;
  reservadoPor?: TipoReserva;
}

export interface CitaResponse {
  id: string;
  codigoCita: string;
  pacienteId: string;
  pacienteNombre?: string;
  pacienteDocumento?: string;
  pacienteTelefono?: string;
  medicoId: string;
  especialidadId: number;
  consultorioId: number | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  estado: EstadoCita;
  motivoConsulta: string | null;
  canalOrigen: CanalOrigenCita;
  reservadoPor: TipoReserva;
  googleCalendarEvent?: {
    eventId: string;
    linkEvento?: string;
    sincronizado: boolean;
  } | null;
  creadoEn: string;
}

export interface TriajeInputDTO {
  pacienteId?: string;
  motivoPrincipal: string;
  sintomas: string[];
  duracionDias?: number;
  temperatura?: number;
  presionArterial?: string;
  tieneDolorPecho?: boolean;
  dificultadRespiratoria?: boolean;
  perdidaConocimiento?: boolean;
  alergiasConocidas?: string;
}

export interface TriajeResultadoDTO {
  triajeId: string;
  nivelTriaje: NivelTriaje;
  colorAlerta: 'verde' | 'amarillo' | 'rojo';
  prioridadAtencion: string;
  resumenClinico: string;
  especialidadSugeridaId: number;
  especialidadNombre: string;
  requiereAtencionInmediata: boolean;
  recomendaciones: string[];
  fechaEvaluacion: string;
}

export type EstadoConversacionWhatsApp =
  | 'ACTIVA'
  | 'EN_TRIAJE'
  | 'ESPERANDO_CEDULA_FECHA'
  | 'ESPERANDO_CONFIRMACION'
  | 'DERIVADA_RECEPCION'
  | 'FINALIZADA';

export interface ConfiguracionEmpresaWhatsApp {
  nombreEmpresa: string;
  numeroWhatsAppEmpresa: string;
  phoneNumberId: string;
  wabaId: string;
  verifyToken: string;
  accessTokenConfigurado: boolean;
  modoOperacion: 'SIMULACION_LOCAL_Y_WEBHOOK' | 'META_CLOUD_API_LIVE';
  mensajeBienvenida: string;
  actualizadoEn: string;
}

export interface MensajeChatbotItem {
  id: string;
  conversacionId: string;
  remitente: 'USUARIO' | 'BOT' | 'AGENTE_HUMANO';
  tipoMensaje: 'TEXTO' | 'BOTONES' | 'AUDIO' | 'UBICACION';
  contenido: string;
  intencionDetectada?: string;
  creadoEn: string;
}

export interface ConversacionWhatsAppItem {
  id: string;
  whatsappFrom: string;
  nombrePaciente?: string;
  cedulaPaciente?: string;
  pacienteId?: string | null;
  estadoConversacion: EstadoConversacionWhatsApp;
  nivelTriaje?: NivelTriaje;
  resumenTriaje?: string;
  especialidadSugeridaId?: number;
  especialidadSugeridaNombre?: string;
  medicoSugeridoId?: string;
  medicoSugeridoNombre?: string;
  fechaDeseada?: string;
  horaDeseada?: string;
  citaCreadaCodigo?: string;
  citaCreadaId?: string;
  ultimaInteraccion: string;
  mensajes: MensajeChatbotItem[];
}

export interface EstadoConexionQRWhatsApp {
  estado: 'DESCONECTADO' | 'GENERANDO_QR' | 'ESPERANDO_ESCANEO_QR' | 'CONECTADO' | 'ERROR';
  qrDataUrl?: string | null;
  qrRaw?: string | null;
  numeroConectado?: string | null;
  nombreConectado?: string | null;
  ultimaActualizacion: string;
  mensajeEstado: string;
}

