-- ============================================================================
-- SISTEMA INTELIGENTE DE GESTIÓN DE CITAS CLÍNICAS (MEDPULSE)
-- SCRIPT DE INICIALIZACIÓN COMPLETA PARA POSTGRESQL LOCAL
-- Archivo: database/init_local_db.sql
-- Ejecución recomendada en psql o pgAdmin: \i database/init_local_db.sql
-- ============================================================================

-- 1. HABILITAR EXTENSIONES PARA UUID Y EXCLUSIÓN DE HORARIOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. FUNCIÓN DE AUDITORÍA DE TIEMPO
CREATE OR REPLACE FUNCTION actualizar_marca_tiempo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. TABLAS DE SEGURIDAD Y ROLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

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

-- Administradores
CREATE TABLE IF NOT EXISTS administradores (
    id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Recepcionistas / Secretaria
CREATE TABLE IF NOT EXISTS recepcionistas (
    id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    sede VARCHAR(100) DEFAULT 'Sede Central' NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Pacientes
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
    email VARCHAR(255) NOT NULL,
    direccion TEXT,
    grupo_sanguineo VARCHAR(10),
    alergias TEXT,
    contacto_emergencia_nombre VARCHAR(100),
    contacto_emergencia_telefono VARCHAR(25),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. INFRAESTRUCTURA MÉDICA Y HORARIOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    duracion_estimada_min INT DEFAULT 30 NOT NULL,
    esta_activa BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS consultorios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    piso VARCHAR(20) NOT NULL,
    sede VARCHAR(100) DEFAULT 'Sede Central' NOT NULL,
    descripcion TEXT,
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS medicos (
    id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    numero_colegiatura VARCHAR(30) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(25),
    biografia TEXT,
    tarifa_consulta NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL
);

CREATE TABLE IF NOT EXISTS medicos_especialidades (
    medico_id UUID REFERENCES medicos(id) ON DELETE CASCADE,
    especialidad_id INT REFERENCES especialidades(id) ON DELETE CASCADE,
    es_principal BOOLEAN DEFAULT FALSE NOT NULL,
    PRIMARY KEY (medico_id, especialidad_id)
);

CREATE TABLE IF NOT EXISTS horarios_medicos (
    id SERIAL PRIMARY KEY,
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
    consultorio_id INT NOT NULL REFERENCES consultorios(id) ON DELETE RESTRICT,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1: Lunes, 7: Domingo
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_cita_min INT DEFAULT 30 NOT NULL,
    esta_activo BOOLEAN DEFAULT TRUE NOT NULL,
    CONSTRAINT chk_horario_medico_valido CHECK (hora_inicio < hora_fin)
);

-- ----------------------------------------------------------------------------
-- 5. TABLA DE CITAS CON EXCLUSIÓN FÍSICA ANTI DOUBLE-BOOKING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_cita VARCHAR(30) UNIQUE NOT NULL,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
    especialidad_id INT NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    consultorio_id INT REFERENCES consultorios(id) ON DELETE SET NULL,
    fecha_hora_inicio TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    estado VARCHAR(30) DEFAULT 'PENDIENTE' NOT NULL CHECK (
        estado IN ('PENDIENTE', 'CONFIRMADA', 'EN_CONSULTA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO', 'REPROGRAMADA')
    ),
    motivo_consulta TEXT,
    canal_origen VARCHAR(30) DEFAULT 'WEB_PACIENTE' NOT NULL CHECK (
        canal_origen IN ('WEB_PACIENTE', 'CHATBOT_WHATSAPP', 'RECEPCION_PRESENCIAL', 'RECEPCION_TELEFONICA')
    ),
    reservado_por VARCHAR(30) DEFAULT 'PACIENTE' NOT NULL CHECK (
        reservado_por IN ('PACIENTE', 'ADMINISTRADOR')
    ),
    creado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_en TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_rango_cita_valido CHECK (fecha_hora_inicio < fecha_hora_fin)
);

-- Restricción anti-colisión física: un médico no puede tener dos citas que se crucen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_double_booking_medico'
    ) THEN
        ALTER TABLE citas ADD CONSTRAINT no_double_booking_medico
        EXCLUDE USING gist (
            medico_id WITH =,
            tstzrange(fecha_hora_inicio, fecha_hora_fin) WITH &&
        ) WHERE (estado NOT IN ('CANCELADA', 'NO_ASISTIO'));
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. DATOS INICIALES (SEEDS) - TODOS LOS ROLES Y CORREOS REALES / GMAIL
-- ----------------------------------------------------------------------------
BEGIN;

-- Roles
INSERT INTO roles (id, nombre, descripcion) VALUES
('ADMINISTRADOR', 'Administrador General', 'Control total del sistema, reportes y configuración'),
('RECEPCIONISTA', 'Personal de Recepción / Secretaria', 'Mesa de entrada, gestión de sala de espera y pacientes'),
('MEDICO', 'Profesional Médico', 'Control de agenda personal y atenciones'),
('PACIENTE', 'Paciente', 'Autogestión de citas y perfil clínico')
ON CONFLICT (id) DO NOTHING;

-- Especialidades
INSERT INTO especialidades (id, nombre, descripcion, duracion_estimada_min, esta_activa) VALUES
(1, 'Medicina General', 'Atención médica primaria y preventiva', 20, TRUE),
(2, 'Cardiología', 'Evaluación cardiovascular integral', 30, TRUE),
(3, 'Pediatría', 'Atención integral del niño y adolescente', 30, TRUE),
(4, 'Dermatología', 'Tratamiento de piel, cabello y alergias dérmicas', 25, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Consultorios
INSERT INTO consultorios (id, nombre, piso, sede, esta_activo) VALUES
(1, 'Consultorio 101', 'Piso 1', 'Sede Central', TRUE),
(2, 'Consultorio 102', 'Piso 1', 'Sede Central', TRUE),
(3, 'Consultorio 201', 'Piso 2', 'Sede Central', TRUE),
(4, 'Consultorio 202', 'Piso 2', 'Sede Central', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Hash de contraseña por defecto: Password123!
-- $2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti

-- 1. ADMINISTRADOR
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@medpulse.clinic', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'ADMINISTRADOR', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO administradores (id, nombres, apellidos, telefono) VALUES
('a0000000-0000-0000-0000-000000000001', 'Administrador', 'General MedPulse', '+51999888777')
ON CONFLICT (id) DO NOTHING;

-- 2. RECEPCIONISTA / SECRETARIA
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('b0000000-0000-0000-0000-000000000001', 'recepcion@medpulse.clinic', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'RECEPCIONISTA', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO recepcionistas (id, nombres, apellidos, telefono, sede) VALUES
('b0000000-0000-0000-0000-000000000001', 'Elena', 'Ramos (Recepción)', '+51988776655', 'Sede Central')
ON CONFLICT (id) DO NOTHING;

-- 3. MÉDICOS (Con correos Gmail y clínicos)
-- Médico 1: Dr. Roberto Mendoza (Cardiología)
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 'dr.mendoza@gmail.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'MEDICO', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO medicos (id, numero_colegiatura, nombres, apellidos, telefono, biografia, tarifa_consulta, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 'CMP-45892', 'Roberto', 'Mendoza Valdivia', '+51987654323', 'Especialista en cardiología clínica y preventiva.', 120.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos_especialidades (medico_id, especialidad_id, es_principal) VALUES
('c0000000-0000-0000-0000-000000000001', 2, TRUE)
ON CONFLICT (medico_id, especialidad_id) DO NOTHING;

-- Médico 2: Dra. Carmen Silva (Pediatría y Medicina General)
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000002', 'dra.silva@gmail.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'MEDICO', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO medicos (id, numero_colegiatura, nombres, apellidos, telefono, biografia, tarifa_consulta, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000002', 'CMP-51204', 'Carmen', 'Silva Rojas', '+51987654324', 'Especialista en pediatría y desarrollo infantil integral.', 100.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos_especialidades (medico_id, especialidad_id, es_principal) VALUES
('c0000000-0000-0000-0000-000000000002', 3, TRUE),
('c0000000-0000-0000-0000-000000000002', 1, FALSE)
ON CONFLICT (medico_id, especialidad_id) DO NOTHING;

-- Horarios de los médicos (Lunes a Viernes)
-- Dr. Mendoza: Lunes a Viernes de 08:00 a 13:00 en Consultorio 201 (turnos de 30 min)
INSERT INTO horarios_medicos (medico_id, consultorio_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 3, 1, '08:00', '13:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 2, '08:00', '13:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 3, '08:00', '13:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 4, '08:00', '13:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 5, '08:00', '13:00', 30, TRUE)
ON CONFLICT DO NOTHING;

-- 4. PACIENTES INICIALES CON CORREOS GMAIL
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('d0000000-0000-0000-0000-000000000001', 'juan.perez@gmail.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'PACIENTE', TRUE),
('d0000000-0000-0000-0000-000000000002', 'maria.gomez@gmail.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'PACIENTE', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO pacientes (
    id, usuario_id, documento_tipo, documento_numero, nombres, apellidos,
    fecha_nacimiento, genero, telefono, email, direccion, grupo_sanguineo, alergias
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'DNI',
    '72849102',
    'Juan Carlos',
    'Pérez Salazar',
    '1992-05-14',
    'MASCULINO',
    '+51912345678',
    'juan.perez@gmail.com',
    'Av. Principal 123',
    'O+',
    'Penicilina'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000002',
    'DNI',
    '44589201',
    'María Elena',
    'Gómez Torres',
    '1988-11-20',
    'FEMENINO',
    '+51988887777',
    'maria.gomez@gmail.com',
    'Jr. Los Olivos 456',
    'A+',
    'Ninguna conocida'
)
ON CONFLICT (id) DO NOTHING;

-- 5. CITA DE EJEMPLO ASIGNADA
INSERT INTO citas (
    id, codigo_cita, paciente_id, medico_id, especialidad_id, consultorio_id,
    fecha_hora_inicio, fecha_hora_fin, estado, motivo_consulta, canal_origen, reservado_por
) VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'CIT-PAC-1001',
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    2, -- Cardiología
    3, -- Consultorio 201
    '2026-10-20 08:00:00-05',
    '2026-10-20 08:30:00-05',
    'CONFIRMADA',
    'Evaluación médica y control de presión',
    'WEB_PACIENTE',
    'PACIENTE'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
