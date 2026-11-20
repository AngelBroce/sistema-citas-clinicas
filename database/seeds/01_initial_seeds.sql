-- ============================================================================
-- PROYECTO: Sistema Inteligente de Gestión de Citas Clínicas (MedPulse)
-- ARCHIVO: database/seeds/01_initial_seeds.sql
-- MOTOR: PostgreSQL 14+ / Supabase
-- DESCRIPCIÓN: Datos iniciales de prueba permanentes (Seeds).
--              Contraseña de cuentas de prueba: MedPulse2026!
--              (Hash scrypt verificado por AuthController)
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

SELECT setval('consultorios_id_seq', (SELECT MAX(id) FROM consultorios));

-- ----------------------------------------------------------------------------
-- 4. USUARIOS PERMANENTES DE PRUEBA Y PERFILES (Contraseña: MedPulse2026!)
-- ----------------------------------------------------------------------------

-- A. Administrador
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@medpulse.clinic', 'scrypt$15f68bd918980da8002379c19487b6a2$66ff29f1b4afaf677a0c024276bce4b9a92de45d8692dc9b2ee8653cd1fa65d9054dbd25a102c6b5d951e46af8dbb87f9a207b9c4baa3679bf2f20f7c2f7288f', 'ADMINISTRADOR', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO administradores (id, nombres, apellidos, telefono) VALUES
('a0000000-0000-0000-0000-000000000001', 'Elvis', 'Admin Principal', '+507 6300-2001')
ON CONFLICT (id) DO NOTHING;

-- B. Recepcionista
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('b0000000-0000-0000-0000-000000000001', 'recepcion@medpulse.clinic', 'scrypt$15f68bd918980da8002379c19487b6a2$66ff29f1b4afaf677a0c024276bce4b9a92de45d8692dc9b2ee8653cd1fa65d9054dbd25a102c6b5d951e46af8dbb87f9a207b9c4baa3679bf2f20f7c2f7288f', 'RECEPCIONISTA', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO recepcionistas (id, nombres, apellidos, telefono, sede) VALUES
('b0000000-0000-0000-0000-000000000001', 'Elena', 'Ramos Morales', '+507 6300-2101', 'Sede Central')
ON CONFLICT (id) DO NOTHING;

-- C. Médicos
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 'dr.mendoza@gmail.com', 'scrypt$15f68bd918980da8002379c19487b6a2$66ff29f1b4afaf677a0c024276bce4b9a92de45d8692dc9b2ee8653cd1fa65d9054dbd25a102c6b5d951e46af8dbb87f9a207b9c4baa3679bf2f20f7c2f7288f', 'MEDICO', TRUE),
('c0000000-0000-0000-0000-000000000002', 'dra.silva@gmail.com', 'scrypt$15f68bd918980da8002379c19487b6a2$66ff29f1b4afaf677a0c024276bce4b9a92de45d8692dc9b2ee8653cd1fa65d9054dbd25a102c6b5d951e46af8dbb87f9a207b9c4baa3679bf2f20f7c2f7288f', 'MEDICO', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos (id, numero_colegiatura, nombres, apellidos, telefono, biografia, tarifa_consulta, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 'CMP-45892', 'Roberto', 'Mendoza Valdivia', '+507 6300-2201', 'Especialista en cardiología clínica y preventiva con más de 12 años de trayectoria.', 120.00, TRUE),
('c0000000-0000-0000-0000-000000000002', 'CMP-51204', 'Carmen', 'Silva Rojas', '+507 6300-2202', 'Especialista en pediatría y desarrollo infantil integral.', 100.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicos_especialidades (medico_id, especialidad_id, es_principal) VALUES
('c0000000-0000-0000-0000-000000000001', 2, TRUE),
('c0000000-0000-0000-0000-000000000002', 3, TRUE),
('c0000000-0000-0000-0000-000000000002', 1, FALSE)
ON CONFLICT (medico_id, especialidad_id) DO NOTHING;

-- D. Pacientes (Panamá)
INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo) VALUES
('d0000000-0000-0000-0000-000000000001', 'juan.perez@gmail.com', 'scrypt$15f68bd918980da8002379c19487b6a2$66ff29f1b4afaf677a0c024276bce4b9a92de45d8692dc9b2ee8653cd1fa65d9054dbd25a102c6b5d951e46af8dbb87f9a207b9c4baa3679bf2f20f7c2f7288f', 'PACIENTE', TRUE),
('d0000000-0000-0000-0000-000000000002', 'maria.gomez@gmail.com', 'scrypt$15f68bd918980da8002379c19487b6a2$66ff29f1b4afaf677a0c024276bce4b9a92de45d8692dc9b2ee8653cd1fa65d9054dbd25a102c6b5d951e46af8dbb87f9a207b9c4baa3679bf2f20f7c2f7288f', 'PACIENTE', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pacientes (
    id, usuario_id, documento_tipo, documento_numero, nombres, apellidos,
    fecha_nacimiento, genero, telefono, email, direccion, grupo_sanguineo, alergias,
    contacto_emergencia_nombre, contacto_emergencia_telefono
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'CEDULA_NACIONAL',
    '8-1234-56789',
    'Juan Carlos',
    'Pérez Salazar',
    '1992-05-14',
    'MASCULINO',
    '+507 6123-4567',
    'juan.perez@gmail.com',
    'Vía España 245, Bella Vista, Ciudad de Panamá',
    'O+',
    'Penicilina',
    'Rosa Salazar (Madre)',
    '+507 6123-4560'
), (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000002',
    'CEDULA_NACIONAL',
    '8-9876-54321',
    'María Elena',
    'Gómez Torres',
    '1988-11-20',
    'FEMENINO',
    '+507 6888-7777',
    'maria.gomez@gmail.com',
    'Calle 50, San Francisco, Ciudad de Panamá',
    'A+',
    'Ninguna conocida',
    'Carlos Gómez (Hermano)',
    '+507 6888-7770'
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. HORARIOS LABORALES DE MÉDICOS (Lunes a Sábado)
-- ----------------------------------------------------------------------------
INSERT INTO horarios_medicos (medico_id, consultorio_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min, esta_activo) VALUES
('c0000000-0000-0000-0000-000000000001', 3, 1, '08:00:00', '18:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 2, '08:00:00', '18:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 3, '08:00:00', '18:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 4, '08:00:00', '18:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 5, '08:00:00', '18:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000001', 3, 6, '08:00:00', '14:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000002', 2, 1, '08:00:00', '19:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000002', 2, 2, '08:00:00', '19:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000002', 2, 3, '08:00:00', '19:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000002', 2, 4, '08:00:00', '19:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000002', 2, 5, '08:00:00', '19:00:00', 30, TRUE),
('c0000000-0000-0000-0000-000000000002', 2, 6, '08:00:00', '14:00:00', 30, TRUE)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. CITAS MÉDICAS DE PRUEBA
-- ----------------------------------------------------------------------------
INSERT INTO citas (
    id, codigo_cita, paciente_id, medico_id, especialidad_id, consultorio_id,
    fecha_hora_inicio, fecha_hora_fin, estado, motivo_consulta, canal_origen, reservado_por
) VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'CIT-2026-0001',
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    2,
    3,
    '2026-11-23 09:00:00-05',
    '2026-11-23 09:30:00-05',
    'CONFIRMADA',
    'Chequeo de rutina por presión arterial ligeramente elevada',
    'WEB_PACIENTE',
    'PACIENTE'
), (
    'f0000000-0000-0000-0000-000000000002',
    'CIT-2026-0002',
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    3,
    2,
    '2026-11-24 15:00:00-05',
    '2026-11-24 15:30:00-05',
    'PENDIENTE',
    'Control pediátrico de desarrollo infantil para su menor hijo',
    'CHATBOT_WHATSAPP',
    'PACIENTE'
) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. CONVERSACIÓN DE EJEMPLO DEL CHATBOT WHATSAPP (+507)
-- ----------------------------------------------------------------------------
INSERT INTO conversaciones_chatbot (
    id, whatsapp_from, paciente_id, estado_conversacion, contexto_conversacion,
    nivel_triaje, resumen_triaje, especialidad_sugerida_id
) VALUES (
    '10000000-0000-0000-0000-000000000001',
    '+50768887777',
    'e0000000-0000-0000-0000-000000000002',
    'FINALIZADA',
    '{"paso": "reserva_completada", "cita_creada": "CIT-2026-0002"}'::jsonb,
    'LEVE',
    'Paciente solicitó cita para control preventivo infantil por WhatsApp.',
    3
) ON CONFLICT (id) DO NOTHING;

INSERT INTO mensajes_chatbot (conversacion_id, remitente, tipo_mensaje, contenido, intencion_detectada) VALUES
('10000000-0000-0000-0000-000000000001', 'USUARIO', 'TEXTO', 'Hola, buenas tardes, quisiera agendar una cita para mi hijo de 4 años', 'AGENDAR_CITA'),
('10000000-0000-0000-0000-000000000001', 'BOT', 'TEXTO', '¡Hola! Con gusto te ayudo. ¿Tu pequeño presenta algún malestar urgente como fiebre alta o es un control regular?', 'TRIAJE'),
('10000000-0000-0000-0000-000000000001', 'USUARIO', 'TEXTO', 'Es solo su control de crecimiento y vacunas', 'RESPUESTA_TRIAJE'),
('10000000-0000-0000-0000-000000000001', 'BOT', 'TEXTO', 'Perfecto, te sugiero Pediatría con la Dra. Carmen Silva. Tenemos horario el Martes 24 de Noviembre a las 15:00 hrs. ¿Deseas confirmarla?', 'PROPONER_HORARIO'),
('10000000-0000-0000-0000-000000000001', 'USUARIO', 'TEXTO', 'Sí, confirmo por favor', 'CONFIRMAR_CITA'),
('10000000-0000-0000-0000-000000000001', 'BOT', 'TEXTO', '¡Excelente! Tu cita quedó reservada con el código CIT-2026-0002. Te enviaremos un recordatorio previo por WhatsApp.', 'CITA_GENERADA');

COMMIT;
