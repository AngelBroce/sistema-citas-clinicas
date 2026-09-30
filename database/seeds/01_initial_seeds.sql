-- ============================================================================
-- PROYECTO: Sistema Inteligente de Gestión de Citas Clínicas
-- ARCHIVO: database/seeds/01_initial_seeds.sql
-- AUTOR: Elvis (DBA)
-- MOTOR: PostgreSQL 14+
-- DESCRIPCIÓN: Datos iniciales de prueba (Seeds) para desarrollo y testing.
--              Contraseña por defecto de usuarios de prueba: Password123!
--              (Hash bcrypt: $2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ROLES DEL SISTEMA
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, nombre, descripcion) VALUES
('ADMINISTRADOR', 'Administrador General', 'Control total de configuración, reportes, usuarios y especialidades'),
('RECEPCIONISTA', 'Personal de Recepción', 'Gestión de citas presenciales, confirmación de asistencias y triaje físico'),
('MEDICO', 'Profesional Médico', 'Control y visualización de su agenda diaria, historial y atenciones'),
('PACIENTE', 'Paciente', 'Acceso al portal del paciente para reservas, historial y recordatorios')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. ESPECIALIDADES MÉDICAS
-- ----------------------------------------------------------------------------
INSERT INTO especialidades (id, nombre, descripcion, duracion_estimada_min, esta_activa) VALUES
(1, 'Medicina General', 'Atención médica integral primaria y despistaje preventivo', 20, TRUE),
(2, 'Cardiología', 'Prevención, diagnóstico y tratamiento de patologías cardiovasculares', 30, TRUE),
(3, 'Pediatría', 'Atención integral del recién nacido, infante y adolescente', 30, TRUE),
(4, 'Traumatología y Ortopedia', 'Diagnóstico y tratamiento de lesiones del sistema musculoesquelético', 30, TRUE),
(5, 'Ginecología y Obstetricia', 'Salud integral de la mujer y control prenatal', 30, TRUE),
(6, 'Dermatología', 'Tratamiento y cuidado de la piel, uñas y cabello', 25, TRUE),
(7, 'Oftalmología', 'Salud visual integral y diagnóstico ocular', 20, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Sincronizar secuencia de especialidades
SELECT setval('especialidades_id_seq', (SELECT MAX(id) FROM especialidades));

-- ----------------------------------------------------------------------------
-- 3. CONSULTORIOS CLÍNICOS
-- ----------------------------------------------------------------------------
INSERT INTO consultorios (id, nombre, piso, sede, descripcion, esta_activo) VALUES
(1, 'Consultorio 101', 'Piso 1', 'Sede Central', 'Equipado para Medicina General y Triaje', TRUE),
(2, 'Consultorio 102', 'Piso 1', 'Sede Central', 'Ambiente adaptado para Pediatría', TRUE),
(3, 'Consultorio 201', 'Piso 2', 'Sede Central', 'Equipamiento de Cardiología (Electrocardiograma)', TRUE),
(4, 'Consultorio 202', 'Piso 2', 'Sede Central', 'Consultorio traumatológico con camilla articulada', TRUE),
(5, 'Consultorio 301', 'Piso 3', 'Sede Central', 'Consultorio de Ginecología y Dermatología', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Sincronizar secuencia de consultorios
SELECT setval('consultorios_id_seq', (SELECT MAX(id) FROM consultorios));

-- ----------------------------------------------------------------------------
-- 4. USUARIOS BASE Y PERFILES
-- ----------------------------------------------------------------------------

-- A. Administrador
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@clinica.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'ADMINISTRADOR', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO administradores (id, nombres, apellidos, telefono) VALUES
('a0000000-0000-0000-0000-000000000001', 'Elvis', 'Admin Principal', '+51987654321')
ON CONFLICT (id) DO NOTHING;

-- B. Recepcionista
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('b0000000-0000-0000-0000-000000000001', 'recepcion@clinica.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'RECEPCIONISTA', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO recepcionistas (id, nombres, apellidos, telefono, sede) VALUES
('b0000000-0000-0000-0000-000000000001', 'Laura', 'García Paredes', '+51987654322', 'Sede Central')
ON CONFLICT (id) DO NOTHING;

-- C. Médicos
-- Médico 1: Dr. Roberto Mendoza (Cardiología)
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 'roberto.mendoza@clinica.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'MEDICO', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos (id, numero_colegiatura, nombres, apellidos, telefono, biografia, tarifa_consulta, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 'CMP-45892', 'Roberto', 'Mendoza Valdivia', '+51987654323', 'Especialista en cardiología clínica y preventiva con más de 12 años de trayectoria.', 120.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos_especialidades (medico_id, especialidad_id, es_principal) VALUES
('c0000000-0000-0000-0000-000000000001', 2, TRUE) -- Cardiología
ON CONFLICT (medico_id, especialidad_id) DO NOTHING;

-- Médico 2: Dra. Carmen Silva (Pediatría y Medicina General)
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000002', 'carmen.silva@clinica.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'MEDICO', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos (id, numero_colegiatura, nombres, apellidos, telefono, biografia, tarifa_consulta, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000002', 'CMP-51204', 'Carmen', 'Silva Rojas', '+51987654324', 'Especialista en pediatría y desarrollo infantil integral.', 100.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos_especialidades (medico_id, especialidad_id, es_principal) VALUES
('c0000000-0000-0000-0000-000000000002', 3, TRUE), -- Pediatría (Principal)
('c0000000-0000-0000-0000-000000000002', 1, FALSE) -- Medicina General
ON CONFLICT (medico_id, especialidad_id) DO NOTHING;

-- D. Pacientes
-- Paciente 1: Juan Pérez (Con cuenta web registrada)
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('d0000000-0000-0000-0000-000000000001', 'juan.perez@gmail.com', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti', 'PACIENTE', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pacientes (
    id, usuario_id, documento_tipo, documento_numero, nombres, apellidos,
    fecha_nacimiento, genero, telefono, email, direccion, grupo_sanguineo, alergias,
    contacto_emergencia_nombre, contacto_emergencia_telefono
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
    'Av. Javier Prado Este 2450, San Borja',
    'O+',
    'Penicilina',
    'Rosa Salazar (Madre)',
    '+51912345670'
) ON CONFLICT (id) DO NOTHING;

-- Paciente 2: María Gómez (Registrada inicialmente por WhatsApp sin usuario web aún)
INSERT INTO pacientes (
    id, usuario_id, documento_tipo, documento_numero, nombres, apellidos,
    fecha_nacimiento, genero, telefono, email, direccion, grupo_sanguineo, alergias,
    contacto_emergencia_nombre, contacto_emergencia_telefono
) VALUES (
    'e0000000-0000-0000-0000-000000000002',
    NULL,
    'DNI',
    '44589201',
    'María Elena',
    'Gómez Torres',
    '1988-11-20',
    'FEMENINO',
    '+51988887777',
    'maria.gomez@hotmail.com',
    'Jr. Las Begonias 340, San Isidro',
    'A+',
    'Ninguna conocida',
    'Carlos Gómez (Hermano)',
    '+51988887770'
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. HORARIOS LABORALES DE MÉDICOS
-- ----------------------------------------------------------------------------
-- Dr. Roberto Mendoza: Lunes a Viernes de 08:00 a 13:00 en Consultorio 201
INSERT INTO horarios_medicos (medico_id, consultorio_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 3, 1, '08:00:00', '13:00:00', 30, TRUE), -- Lunes
('c0000000-0000-0000-0000-000000000001', 3, 2, '08:00:00', '13:00:00', 30, TRUE), -- Martes
('c0000000-0000-0000-0000-000000000001', 3, 3, '08:00:00', '13:00:00', 30, TRUE), -- Miércoles
('c0000000-0000-0000-0000-000000000001', 3, 4, '08:00:00', '13:00:00', 30, TRUE), -- Jueves
('c0000000-0000-0000-0000-000000000001', 3, 5, '08:00:00', '13:00:00', 30, TRUE); -- Viernes

-- Dra. Carmen Silva: Lunes, Miércoles y Viernes de 14:00 a 19:00 en Consultorio 102
INSERT INTO horarios_medicos (medico_id, consultorio_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000002', 2, 1, '14:00:00', '19:00:00', 30, TRUE), -- Lunes
('c0000000-0000-0000-0000-000000000002', 2, 3, '14:00:00', '19:00:00', 30, TRUE), -- Miércoles
('c0000000-0000-0000-0000-000000000002', 2, 5, '14:00:00', '19:00:00', 30, TRUE); -- Viernes

-- ----------------------------------------------------------------------------
-- 6. CITAS MÉDICAS DE PRUEBA
-- ----------------------------------------------------------------------------
-- Cita 1: Juan Pérez con Dr. Roberto Mendoza (Cardiología)
INSERT INTO citas (
    id, codigo_cita, paciente_id, medico_id, especialidad_id, consultorio_id,
    fecha_hora_inicio, fecha_hora_fin, estado, motivo_consulta, canal_origen
) VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'CIT-2026-0001',
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    2, -- Cardiología
    3, -- Consultorio 201
    '2026-10-05 09:00:00-05',
    '2026-10-05 09:30:00-05',
    'CONFIRMADA',
    'Chequeo de rutina por presión arterial ligeramente elevada',
    'WEB_PACIENTE'
) ON CONFLICT (id) DO NOTHING;

-- Cita 2: María Gómez con Dra. Carmen Silva (Pediatría/Consulta)
INSERT INTO citas (
    id, codigo_cita, paciente_id, medico_id, especialidad_id, consultorio_id,
    fecha_hora_inicio, fecha_hora_fin, estado, motivo_consulta, canal_origen
) VALUES (
    'f0000000-0000-0000-0000-000000000002',
    'CIT-2026-0002',
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    3, -- Pediatría
    2, -- Consultorio 102
    '2026-10-05 15:00:00-05',
    '2026-10-05 15:30:00-05',
    'PENDIENTE',
    'Control pediátrico de desarrollo infantil para su menor hijo',
    'CHATBOT_WHATSAPP'
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. CONVERSACIÓN DE EJEMPLO DEL CHATBOT WHATSAPP
-- ----------------------------------------------------------------------------
INSERT INTO conversaciones_chatbot (
    id, whatsapp_from, paciente_id, estado_conversacion, contexto_conversacion,
    nivel_triaje, resumen_triaje, especialidad_sugerida_id
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    '+51988887777',
    'e0000000-0000-0000-0000-000000000002',
    'FINALIZADA',
    '{"paso": "reserva_completada", "cita_creada": "CIT-2026-0002"}'::jsonb,
    'LEVE',
    'Paciente solicitó cita para control preventivo infantil. Sin síntomas de alarma respiratoria ni fiebre.',
    3 -- Pediatría
) ON CONFLICT (id) DO NOTHING;

INSERT INTO mensajes_chatbot (conversacion_id, remitente, tipo_mensaje, contenido, intencion_detectada) VALUES
('10000000-0000-0000-0000-000000000001', 'USUARIO', 'TEXTO', 'Hola, buenas tardes, quisiera agendar una cita para mi hijo de 4 años', 'AGENDAR_CITA'),
('10000000-0000-0000-0000-000000000001', 'BOT', 'TEXTO', '¡Hola! Con gusto te ayudo. ¿Tu pequeño presenta algún malestar urgente como fiebre alta o es un control regular?', 'TRIAJE'),
('10000000-0000-0000-0000-000000000001', 'USUARIO', 'TEXTO', 'Es solo su control de crecimiento y vacunas', 'RESPUESTA_TRIAJE'),
('10000000-0000-0000-0000-000000000001', 'BOT', 'TEXTO', 'Perfecto, te sugiero la especialidad de Pediatría con la Dra. Carmen Silva. Tenemos horario el Lunes 5 de Octubre a las 15:00 hrs. ¿Deseas confirmarla?', 'PROPONER_HORARIO'),
('10000000-0000-0000-0000-000000000001', 'USUARIO', 'TEXTO', 'Sí, confirmo por favor', 'CONFIRMAR_CITA'),
('10000000-0000-0000-0000-000000000001', 'BOT', 'TEXTO', '¡Excelente! Tu cita quedó reservada con el código CIT-2026-0002. Te enviaremos un recordatorio previo a la cita.', 'CITA_GENERADA');

COMMIT;
