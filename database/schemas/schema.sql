-- ============================================================================
-- PROYECTO: Sistema Inteligente de Gestión de Citas Clínicas
-- ARCHIVO: database/schemas/schema.sql
-- AUTOR: Elvis (DBA)
-- MOTOR: PostgreSQL 14+
-- DESCRIPCIÓN: Esquema DDL consolidado para la base de datos relacional.
--              Incluye control de roles, motor de agendamiento con validación
--              anti-solapamiento (double-booking), soporte para triaje por
--              Chatbot WhatsApp y sincronización con Google Calendar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONES REQUERIDAS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- 2. FUNCIONES Y DISPARADORES AUXILIARES
-- ----------------------------------------------------------------------------
-- Función para actualización automática de timestamps 'actualizado_en'
CREATE OR REPLACE FUNCTION actualizar_marca_tiempo_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. MÓDULO DE SEGURIDAD, ROLES Y ACCESOS
-- ----------------------------------------------------------------------------

-- Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla: usuarios (Autenticación centralizada)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id VARCHAR(30) NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL,
    ultimo_login TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);

CREATE TRIGGER trg_usuarios_actualizado_en
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: administradores
CREATE TABLE IF NOT EXISTS administradores (
    id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER trg_administradores_actualizado_en
BEFORE UPDATE ON administradores
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: recepcionistas
CREATE TABLE IF NOT EXISTS recepcionistas (
    id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    sede VARCHAR(100) DEFAULT 'Sede Principal' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER trg_recepcionistas_actualizado_en
BEFORE UPDATE ON recepcionistas
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: pacientes
CREATE TABLE IF NOT EXISTS pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID UNIQUE REFERENCES usuarios(id) ON DELETE SET NULL,
    documento_tipo VARCHAR(20) DEFAULT 'DNI' NOT NULL,
    documento_numero VARCHAR(30) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(20) NOT NULL CHECK (genero IN ('MASCULINO', 'FEMENINO', 'OTRO')),
    telefono VARCHAR(25) NOT NULL,
    email VARCHAR(255),
    direccion TEXT,
    grupo_sanguineo VARCHAR(10),
    alergias TEXT,
    contacto_emergencia_nombre VARCHAR(100),
    contacto_emergencia_telefono VARCHAR(25),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pacientes_documento ON pacientes(documento_numero);
CREATE INDEX IF NOT EXISTS idx_pacientes_telefono ON pacientes(telefono);
CREATE INDEX IF NOT EXISTS idx_pacientes_apellidos_nombres ON pacientes(apellidos, nombres);

CREATE TRIGGER trg_pacientes_actualizado_en
BEFORE UPDATE ON pacientes
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- ----------------------------------------------------------------------------
-- 4. MÓDULO DE GESTIÓN MÉDICA E INFRAESTRUCTURA
-- ----------------------------------------------------------------------------

-- Tabla: especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    duracion_estimada_min INT DEFAULT 30 NOT NULL CHECK (duracion_estimada_min > 0),
    esta_activa BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_especialidades_nombre ON especialidades(nombre);

CREATE TRIGGER trg_especialidades_actualizado_en
BEFORE UPDATE ON especialidades
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: consultorios
CREATE TABLE IF NOT EXISTS consultorios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    piso VARCHAR(20) DEFAULT '1' NOT NULL,
    sede VARCHAR(100) DEFAULT 'Sede Principal' NOT NULL,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_consultorio_sede UNIQUE (nombre, sede)
);

CREATE TRIGGER trg_consultorios_actualizado_en
BEFORE UPDATE ON consultorios
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: medicos
CREATE TABLE IF NOT EXISTS medicos (
    id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    numero_colegiatura VARCHAR(50) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    biografia TEXT,
    tarifa_consulta NUMERIC(10,2) DEFAULT 0.00 NOT NULL CHECK (tarifa_consulta >= 0),
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medicos_colegiatura ON medicos(numero_colegiatura);
CREATE INDEX IF NOT EXISTS idx_medicos_apellidos_nombres ON medicos(apellidos, nombres);

CREATE TRIGGER trg_medicos_actualizado_en
BEFORE UPDATE ON medicos
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla relacional: medicos_especialidades
CREATE TABLE IF NOT EXISTS medicos_especialidades (
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    especialidad_id INT NOT NULL REFERENCES especialidades(id) ON DELETE CASCADE,
    es_principal BOOLEAN DEFAULT FALSE NOT NULL,
    PRIMARY KEY (medico_id, especialidad_id)
);

-- ----------------------------------------------------------------------------
-- 5. MÓDULO DE HORARIOS Y GESTIÓN DE DISPONIBILIDAD
-- ----------------------------------------------------------------------------

-- Tabla: horarios_medicos (Turnos base recurrentes por día de semana)
CREATE TABLE IF NOT EXISTS horarios_medicos (
    id SERIAL PRIMARY KEY,
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    consultorio_id INT REFERENCES consultorios(id) ON DELETE SET NULL,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, ..., 6=Sábado
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_cita_min INT DEFAULT 30 NOT NULL CHECK (duracion_cita_min > 0),
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_horario_valido CHECK (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_horarios_medico_dia ON horarios_medicos(medico_id, dia_semana) WHERE esta_activo = TRUE;

CREATE TRIGGER trg_horarios_medicos_actualizado_en
BEFORE UPDATE ON horarios_medicos
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: bloqueos_agenda_medicos (Excepciones temporales: vacaciones, descansos, emergencias)
CREATE TABLE IF NOT EXISTS bloqueos_agenda_medicos (
    id SERIAL PRIMARY KEY,
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_bloqueo_fechas_validas CHECK (fecha_hora_fin > fecha_hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_bloqueos_medico_fechas ON bloqueos_agenda_medicos(medico_id, fecha_hora_inicio, fecha_hora_fin);

-- ----------------------------------------------------------------------------
-- 6. MOTOR DE AGENDAMIENTO DE CITAS Y CONTROL ANTI-COLISIÓN
-- ----------------------------------------------------------------------------

-- Tabla: citas
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cita VARCHAR(20) UNIQUE NOT NULL,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
    especialidad_id INT NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    consultorio_id INT REFERENCES consultorios(id) ON DELETE SET NULL,
    fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    -- Rango de tiempo para soporte de exclusión y consultas temporales
    rango_tiempo TSRANGE GENERATED ALWAYS AS (tsrange(fecha_hora_inicio::timestamp, fecha_hora_fin::timestamp, '[)')) STORED,
    estado VARCHAR(30) DEFAULT 'PENDIENTE' NOT NULL CHECK (
        estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CONSULTA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO', 'REPROGRAMADA')
    ),
    motivo_consulta TEXT,
    notas_paciente TEXT,
    notas_medicas TEXT,
    motivo_cancelacion TEXT,
    canal_origen VARCHAR(30) DEFAULT 'WEB_PACIENTE' NOT NULL CHECK (
        canal_origen IN ('WEB_PACIENTE', 'CHATBOT_WHATSAPP', 'RECEPCION_PRESENCIAL', 'RECEPCION_TELEFONICA')
    ),
    creado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_cita_fechas_validas CHECK (fecha_hora_fin > fecha_hora_inicio),
    -- REGLA DE ORO DE DBA: Previene físicamente que el mismo médico tenga 2 citas solapadas en estados activos
    CONSTRAINT uq_medico_no_doble_agendamiento EXCLUDE USING gist (
        medico_id WITH =,
        rango_tiempo WITH &&
    ) WHERE (estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CONSULTA'))
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_medico_fechas ON citas(medico_id, fecha_hora_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_fecha_inicio ON citas(fecha_hora_inicio);

CREATE TRIGGER trg_citas_actualizado_en
BEFORE UPDATE ON citas
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla de auditoría: historial_citas_auditoria
CREATE TABLE IF NOT EXISTS historial_citas_auditoria (
    id BIGSERIAL PRIMARY KEY,
    cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    cambiado_por_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo_cambio TEXT,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historial_citas_cita_id ON historial_citas_auditoria(cita_id);

-- Disparador para registrar auditoría de cambio de estado automáticamente
CREATE OR REPLACE FUNCTION auditar_cambio_estado_cita()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado) THEN
        INSERT INTO historial_citas_auditoria (
            cita_id,
            estado_anterior,
            estado_nuevo,
            cambiado_por_usuario_id,
            motivo_cambio
        ) VALUES (
            NEW.id,
            OLD.estado,
            NEW.estado,
            NEW.creado_por_usuario_id,
            COALESCE(NEW.motivo_cancelacion, 'Actualización de estado en flujo de atención')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditar_citas_estado
AFTER UPDATE ON citas
FOR EACH ROW EXECUTE FUNCTION auditar_cambio_estado_cita();

-- ----------------------------------------------------------------------------
-- 7. MÓDULO DE INTEGRACIÓN WHATSAPP Y CHATBOT CON IA (24/7)
-- ----------------------------------------------------------------------------

-- Tabla: conversaciones_chatbot
CREATE TABLE IF NOT EXISTS conversaciones_chatbot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_from VARCHAR(30) NOT NULL,
    paciente_id UUID REFERENCES pacientes(id) ON DELETE SET NULL,
    estado_conversacion VARCHAR(30) DEFAULT 'ACTIVA' NOT NULL CHECK (
        estado_conversacion IN ('ACTIVA', 'EN_TRIAJE', 'ESPERANDO_CONFIRMACION', 'DERIVADA_RECEPCION', 'FINALIZADA')
    ),
    contexto_conversacion JSONB DEFAULT '{}'::jsonb NOT NULL,
    nivel_triaje VARCHAR(20) CHECK (nivel_triaje IN ('LEVE', 'MODERADO', 'URGENTE', 'NO_APLICA')),
    resumen_triaje TEXT,
    especialidad_sugerida_id INT REFERENCES especialidades(id) ON DELETE SET NULL,
    ultima_interaccion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_whatsapp ON conversaciones_chatbot(whatsapp_from);
CREATE INDEX IF NOT EXISTS idx_conversaciones_estado ON conversaciones_chatbot(estado_conversacion);
CREATE INDEX IF NOT EXISTS idx_conversaciones_paciente ON conversaciones_chatbot(paciente_id);

CREATE TRIGGER trg_conversaciones_chatbot_actualizado_en
BEFORE UPDATE ON conversaciones_chatbot
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: mensajes_chatbot
CREATE TABLE IF NOT EXISTS mensajes_chatbot (
    id BIGSERIAL PRIMARY KEY,
    conversacion_id UUID NOT NULL REFERENCES conversaciones_chatbot(id) ON DELETE CASCADE,
    remitente VARCHAR(20) NOT NULL CHECK (remitente IN ('USUARIO', 'BOT', 'AGENTE_HUMANO')),
    tipo_mensaje VARCHAR(20) DEFAULT 'TEXTO' NOT NULL CHECK (tipo_mensaje IN ('TEXTO', 'BOTONES', 'AUDIO', 'UBICACION')),
    contenido TEXT NOT NULL,
    intencion_detectada VARCHAR(50),
    tokens_utilizados INT DEFAULT 0 NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes_chatbot(conversacion_id);

-- ----------------------------------------------------------------------------
-- 8. MÓDULO DE RECORDATORIOS Y ALERTAS PREVIAS (ANTI-AUSENTISMO)
-- ----------------------------------------------------------------------------

-- Tabla: recordatorios_citas
CREATE TABLE IF NOT EXISTS recordatorios_citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    canal VARCHAR(20) DEFAULT 'WHATSAPP' NOT NULL CHECK (canal IN ('WHATSAPP', 'EMAIL', 'SMS')),
    fecha_hora_programada TIMESTAMPTZ NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' NOT NULL CHECK (
        estado IN ('PENDIENTE', 'ENVIADO', 'FALLIDO', 'CANCELADO')
    ),
    mensaje TEXT NOT NULL,
    respuesta_recibida VARCHAR(30) CHECK (respuesta_recibida IN ('CONFIRMO', 'CANCELO', 'REPROGRAMO', 'OTRO')),
    enviado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recordatorios_programados ON recordatorios_citas(fecha_hora_programada, estado);
CREATE INDEX IF NOT EXISTS idx_recordatorios_cita ON recordatorios_citas(cita_id);

-- ----------------------------------------------------------------------------
-- 9. MÓDULO DE SINCRONIZACIÓN CON GOOGLE CALENDAR
-- ----------------------------------------------------------------------------

-- Tabla: calendarios_usuarios
CREATE TABLE IF NOT EXISTS calendarios_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    proveedor VARCHAR(30) DEFAULT 'GOOGLE_CALENDAR' NOT NULL,
    calendar_id VARCHAR(255) DEFAULT 'primary' NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expira_en TIMESTAMPTZ NOT NULL,
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL,
    ultima_sincronizacion TIMESTAMPTZ,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_usuario_proveedor UNIQUE (usuario_id, proveedor)
);

CREATE TRIGGER trg_calendarios_usuarios_actualizado_en
BEFORE UPDATE ON calendarios_usuarios
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- Tabla: eventos_calendario_citas
CREATE TABLE IF NOT EXISTS eventos_calendario_citas (
    id BIGSERIAL PRIMARY KEY,
    cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    calendario_usuario_id UUID NOT NULL REFERENCES calendarios_usuarios(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    link_evento TEXT,
    estado_sincronizacion VARCHAR(30) DEFAULT 'SINCRONIZADO' NOT NULL CHECK (
        estado_sincronizacion IN ('SINCRONIZADO', 'PENDIENTE_ACTUALIZACION', 'ERROR', 'ELIMINADO')
    ),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_cita_calendario UNIQUE (cita_id, calendario_usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_eventos_google_event_id ON eventos_calendario_citas(google_event_id);

CREATE TRIGGER trg_eventos_calendario_actualizado_en
BEFORE UPDATE ON eventos_calendario_citas
FOR EACH ROW EXECUTE FUNCTION actualizar_marca_tiempo_modificacion();

-- ============================================================================
-- FIN DEL ESQUEMA DDL
-- ============================================================================
