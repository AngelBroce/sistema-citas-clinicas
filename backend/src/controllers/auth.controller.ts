import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RolId } from '../types/index.js';
import { pool } from '../config/db.js';
import { firmarToken } from '../middlewares/auth.middleware.js';
import { hashPassword, isUuid, sanitizeText, verifyPassword } from '../utils/security.js';

export interface UsuarioPerfil {
  id: string;
  pacienteId?: string;
  email: string;
  nombreCompleto: string;
  rol: RolId;
  detalleRol: string;
  avatar: string;
  sede?: string;
  especialidad?: string;
  medicoId?: string;
  redirectUrl: string;
  passwordHash?: string;
}

// Hash precomputado (scrypt) para las cuentas demo permanentes: contraseña "MedPulse2026!"
export const DEMO_PASSWORD_HASH =
  'scrypt$15f68bd918980da8002379c19487b6a2$66ff29f1b4afaf677a0c024276bce4b9a92de45d8692dc9b2ee8653cd1fa65d9054dbd25a102c6b5d951e46af8dbb87f9a207b9c4baa3679bf2f20f7c2f7288f';

// Usuarios permanentes de prueba con credenciales verificadas y correos reales
const USUARIOS_BASE: Record<string, UsuarioPerfil> = {
  'admin@medpulse.clinic': {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@medpulse.clinic',
    nombreCompleto: 'Elvis Admin Principal',
    rol: 'ADMINISTRADOR',
    detalleRol: 'Control total de configuración, métricas, especialidades y auditoría',
    avatar: 'EA',
    redirectUrl: '/citas',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'admin@clinica.com': {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@medpulse.clinic',
    nombreCompleto: 'Elvis Admin Principal',
    rol: 'ADMINISTRADOR',
    detalleRol: 'Control total de configuración, métricas, especialidades y auditoría',
    avatar: 'EA',
    redirectUrl: '/citas',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'recepcion@medpulse.clinic': {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'recepcion@medpulse.clinic',
    nombreCompleto: 'Elena Ramos (Recepción)',
    rol: 'RECEPCIONISTA',
    detalleRol: 'Gestión de citas presenciales, llegadas y confirmación en sala de espera',
    avatar: 'ER',
    sede: 'Sede Central',
    redirectUrl: '/secretaria',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'recepcion@clinica.com': {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'recepcion@medpulse.clinic',
    nombreCompleto: 'Elena Ramos (Recepción)',
    rol: 'RECEPCIONISTA',
    detalleRol: 'Gestión de citas presenciales, llegadas y confirmación en sala de espera',
    avatar: 'ER',
    sede: 'Sede Central',
    redirectUrl: '/secretaria',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'dr.mendoza@gmail.com': {
    id: 'c0000000-0000-0000-0000-000000000001',
    medicoId: 'c0000000-0000-0000-0000-000000000001',
    email: 'dr.mendoza@gmail.com',
    nombreCompleto: 'Dr. Roberto Mendoza Valdivia',
    rol: 'MEDICO',
    detalleRol: 'Cardiología · Consultorio 201',
    avatar: 'RM',
    especialidad: 'Cardiología',
    redirectUrl: '/doctor/agenda',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'roberto.mendoza@clinica.com': {
    id: 'c0000000-0000-0000-0000-000000000001',
    medicoId: 'c0000000-0000-0000-0000-000000000001',
    email: 'dr.mendoza@gmail.com',
    nombreCompleto: 'Dr. Roberto Mendoza Valdivia',
    rol: 'MEDICO',
    detalleRol: 'Cardiología · Consultorio 201',
    avatar: 'RM',
    especialidad: 'Cardiología',
    redirectUrl: '/doctor/agenda',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'dra.silva@gmail.com': {
    id: 'c0000000-0000-0000-0000-000000000002',
    medicoId: 'c0000000-0000-0000-0000-000000000002',
    email: 'dra.silva@gmail.com',
    nombreCompleto: 'Dra. Carmen Silva Rojas',
    rol: 'MEDICO',
    detalleRol: 'Pediatría y Medicina General · Consultorio 102',
    avatar: 'CS',
    especialidad: 'Pediatría',
    redirectUrl: '/doctor/agenda',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'juan.perez@gmail.com': {
    id: 'd0000000-0000-0000-0000-000000000001',
    pacienteId: 'e0000000-0000-0000-0000-000000000001',
    email: 'juan.perez@gmail.com',
    nombreCompleto: 'Juan Carlos Pérez Salazar',
    rol: 'PACIENTE',
    detalleRol: 'Portal del paciente: reservas de citas, historial y recordatorios WhatsApp',
    avatar: 'JP',
    redirectUrl: '/paciente',
    passwordHash: DEMO_PASSWORD_HASH
  },
  'maria.gomez@gmail.com': {
    id: 'd0000000-0000-0000-0000-000000000002',
    pacienteId: 'e0000000-0000-0000-0000-000000000002',
    email: 'maria.gomez@gmail.com',
    nombreCompleto: 'María Elena Gómez Torres',
    rol: 'PACIENTE',
    detalleRol: 'Portal del paciente: reservas de citas, historial y recordatorios WhatsApp',
    avatar: 'MG',
    redirectUrl: '/paciente',
    passwordHash: DEMO_PASSWORD_HASH
  }
};

const ALIAS_EMAILS: Record<string, string> = {
  'admin@clinica.com': 'admin@medpulse.clinic',
  'recepcion@clinica.com': 'recepcion@medpulse.clinic',
  'roberto.mendoza@clinica.com': 'dr.mendoza@gmail.com',
  'carmen.silva@clinica.com': 'dra.silva@gmail.com'
};

const PACIENTES_MEMORIA: Record<string, any> = {
  'juan.perez@gmail.com': {
    id: 'e0000000-0000-0000-0000-000000000001',
    usuario_id: 'd0000000-0000-0000-0000-000000000001',
    documento_tipo: 'CEDULA_NACIONAL',
    documento_numero: '8-1234-56789',
    nombres: 'Juan Carlos',
    apellidos: 'Pérez Salazar',
    nombreCompleto: 'Juan Carlos Pérez Salazar',
    fecha_nacimiento: '1992-05-14',
    genero: 'MASCULINO',
    telefono: '+507 6123-4567',
    email: 'juan.perez@gmail.com',
    correo: 'juan.perez@gmail.com',
    direccion: 'Vía España 245, Bella Vista, Ciudad de Panamá',
    grupo_sanguineo: 'O+',
    alergias: 'Penicilina',
    contacto_emergencia_nombre: 'Rosa Salazar (Madre)',
    contacto_emergencia_telefono: '+507 6123-4560'
  },
  'maria.gomez@gmail.com': {
    id: 'e0000000-0000-0000-0000-000000000002',
    usuario_id: 'd0000000-0000-0000-0000-000000000002',
    documento_tipo: 'CEDULA_NACIONAL',
    documento_numero: '8-9876-54321',
    nombres: 'María Elena',
    apellidos: 'Gómez Torres',
    nombreCompleto: 'María Elena Gómez Torres',
    fecha_nacimiento: '1988-11-20',
    genero: 'FEMENINO',
    telefono: '+507 6888-7777',
    email: 'maria.gomez@gmail.com',
    correo: 'maria.gomez@gmail.com',
    direccion: 'Calle 50, San Francisco, Ciudad de Panamá',
    grupo_sanguineo: 'A+',
    alergias: 'Ninguna conocida',
    contacto_emergencia_nombre: 'Carlos Gómez (Hermano)',
    contacto_emergencia_telefono: '+507 6888-7770'
  }
};

const USUARIOS_REGISTRADOS: Record<string, UsuarioPerfil> = { ...USUARIOS_BASE };

function limpiarPerfilPublico(u: UsuarioPerfil): Omit<UsuarioPerfil, 'passwordHash'> {
  const { passwordHash: _ignored, ...safe } = u;
  return safe;
}

function redirectPorRol(rol: RolId): string {
  if (rol === 'ADMINISTRADOR') return '/citas';
  if (rol === 'RECEPCIONISTA') return '/secretaria';
  if (rol === 'MEDICO') return '/doctor/agenda';
  return '/paciente';
}

function isDbEnabled(): boolean {
  return process.env.DISABLE_DB !== 'true' && process.env.NODE_ENV !== 'test';
}

export class AuthController {
  /**
   * Lista los roles disponibles y correos de prueba (sin exponer contraseñas ni hashes).
   */
  public static async listarRolesYUsuarios(_req: Request, res: Response) {
    const rolesInfo = [
      {
        rol: 'ADMINISTRADOR',
        nombre: 'Administrador General',
        descripcion: 'Control total de consultorios, médicos, especialidades y auditoría.',
        usuarioDemo: limpiarPerfilPublico(USUARIOS_BASE['admin@medpulse.clinic'])
      },
      {
        rol: 'RECEPCIONISTA',
        nombre: 'Personal de Recepción / Secretaria',
        descripcion: 'Gestión de citas presenciales, confirmación de asistencias y registro de pacientes.',
        usuarioDemo: limpiarPerfilPublico(USUARIOS_BASE['recepcion@medpulse.clinic'])
      },
      {
        rol: 'MEDICO',
        nombre: 'Profesional Médico',
        descripcion: 'Visualización de agenda diaria, bloqueo de horarios y atención clínica.',
        usuarioDemo: limpiarPerfilPublico(USUARIOS_BASE['dr.mendoza@gmail.com'])
      },
      {
        rol: 'PACIENTE',
        nombre: 'Paciente Registrado',
        descripcion: 'Reserva web 24/7 con asignación automática de horario y consulta de pases.',
        usuarioDemo: limpiarPerfilPublico(USUARIOS_BASE['juan.perez@gmail.com'])
      }
    ];

    return res.json({ ok: true, data: rolesInfo });
  }

  /**
   * Registro de un nuevo paciente con persistencia real en Supabase y hash scrypt.
   */
  public static async registerPaciente(req: Request, res: Response) {
    try {
      const {
        email,
        correo,
        password,
        nombres,
        apellidos,
        primer_nombre,
        primerNombre,
        segundo_nombre,
        segundoNombre,
        primer_apellido,
        primerApellido,
        segundo_apellido,
        segundoApellido,
        documento_tipo = 'CEDULA_NACIONAL',
        documentoTipo = 'CEDULA_NACIONAL',
        documento_numero,
        documentoNumero,
        cedula_prefijo,
        cedulaPrefijo,
        cedula_tomo,
        cedulaTomo,
        cedula_asiento,
        cedulaAsiento,
        telefono = '+507 6000-0000',
        fecha_nacimiento = '1995-01-01',
        fechaNacimiento,
        genero = 'OTRO',
        grupo_sanguineo = 'O+'
      } = req.body || {};

      const pNombre = sanitizeText(primer_nombre || primerNombre, 60);
      const sNombre = sanitizeText(segundo_nombre || segundoNombre, 60);
      const pApellido = sanitizeText(primer_apellido || primerApellido, 60);
      const sApellido = sanitizeText(segundo_apellido || segundoApellido, 60);

      const nombresFinal = (pNombre ? `${pNombre}${sNombre ? ' ' + sNombre : ''}` : sanitizeText(nombres, 100)).trim();
      const apellidosFinal = (pApellido ? `${pApellido}${sApellido ? ' ' + sApellido : ''}` : sanitizeText(apellidos, 100)).trim();
      const emailNormalized = sanitizeText(email || correo, 255).toLowerCase();
      const fNacimientoFinal = sanitizeText(fecha_nacimiento || fechaNacimiento || '1995-01-01', 20) || '1995-01-01';
      const telefonoFinal = sanitizeText(telefono || '+507 6000-0000', 25);
      const pwdPlain = String(password || '');

      if (!emailNormalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
        return res.status(400).json({ ok: false, error: 'Ingresa un correo electrónico válido.' });
      }
      if (!nombresFinal || !apellidosFinal) {
        return res.status(400).json({
          ok: false,
          error: 'Campos obligatorios faltantes: primer nombre y primer apellido.'
        });
      }
      if (!pwdPlain || pwdPlain.length < 6) {
        return res.status(400).json({
          ok: false,
          error: 'La contraseña debe tener al menos 6 caracteres.'
        });
      }

      const prefijo = sanitizeText(cedula_prefijo || cedulaPrefijo, 10);
      const tomo = sanitizeText(cedula_tomo || cedulaTomo, 10);
      const asiento = sanitizeText(cedula_asiento || cedulaAsiento, 10);
      let docFinal = sanitizeText(documento_numero || documentoNumero, 30).toUpperCase();

      if (!docFinal && prefijo && tomo && asiento) {
        docFinal = `${prefijo}-${tomo}-${asiento}`;
      } else if (!docFinal) {
        docFinal = `8-${Date.now().toString().slice(-4)}-${Math.floor(10000 + Math.random() * 89999)}`;
      }

      if (USUARIOS_REGISTRADOS[emailNormalized] && !isDbEnabled()) {
        return res.status(409).json({
          ok: false,
          error: `Ya existe un usuario registrado con el correo ${emailNormalized}.`
        });
      }

      const usuarioId = uuidv4();
      const pacienteId = uuidv4();
      const passwordHashed = hashPassword(pwdPlain);
      const iniciales = ((nombresFinal[0] || 'P') + (apellidosFinal[0] || 'R')).toUpperCase();
      const generoValido = ['MASCULINO', 'FEMENINO', 'OTRO'].includes(String(genero).toUpperCase())
        ? String(genero).toUpperCase()
        : 'OTRO';

      if (isDbEnabled()) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          await client.query(
            `INSERT INTO public.usuarios (id, email, password_hash, rol_id, esta_activo)
             VALUES ($1, $2, $3, 'PACIENTE', TRUE)`,
            [usuarioId, emailNormalized, passwordHashed]
          );

          await client.query(
            `INSERT INTO public.pacientes (
              id, usuario_id, documento_tipo, documento_numero, nombres, apellidos,
              fecha_nacimiento, genero, telefono, email, grupo_sanguineo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              pacienteId,
              usuarioId,
              sanitizeText(documento_tipo || documentoTipo || 'CEDULA_NACIONAL', 30),
              docFinal,
              nombresFinal,
              apellidosFinal,
              fNacimientoFinal,
              generoValido,
              telefonoFinal,
              emailNormalized,
              sanitizeText(grupo_sanguineo || 'O+', 10)
            ]
          );

          await client.query('COMMIT');
        } catch (dbErr: any) {
          await client.query('ROLLBACK');
          if (dbErr?.code === '23505') {
            return res.status(409).json({
              ok: false,
              error: dbErr.detail?.includes('documento_numero')
                ? `Ya existe un paciente registrado con la cédula/documento ${docFinal}.`
                : `Ya existe un usuario registrado con el correo ${emailNormalized}. Por favor inicia sesión.`
            });
          }
          throw dbErr;
        } finally {
          client.release();
        }
      }

      const nuevoPerfil: UsuarioPerfil = {
        id: usuarioId,
        pacienteId,
        email: emailNormalized,
        nombreCompleto: `${nombresFinal} ${apellidosFinal}`,
        rol: 'PACIENTE',
        detalleRol: 'Paciente registrado en MedPulse (Panamá)',
        avatar: iniciales,
        redirectUrl: '/paciente',
        passwordHash: passwordHashed
      };

      const datosPacienteCompleto = {
        id: pacienteId,
        usuario_id: usuarioId,
        nombres: nombresFinal,
        apellidos: apellidosFinal,
        primer_nombre: pNombre || nombresFinal.split(' ')[0],
        segundo_nombre: sNombre || nombresFinal.split(' ').slice(1).join(' ') || '',
        primer_apellido: pApellido || apellidosFinal.split(' ')[0],
        segundo_apellido: sApellido || apellidosFinal.split(' ').slice(1).join(' ') || '',
        nombreCompleto: `${nombresFinal} ${apellidosFinal}`,
        documento_tipo: sanitizeText(documento_tipo || documentoTipo || 'CEDULA_NACIONAL', 30),
        documento_numero: docFinal,
        documentoNumero: docFinal,
        cedula_prefijo: prefijo,
        cedula_tomo: tomo,
        cedula_asiento: asiento,
        telefono: telefonoFinal,
        email: emailNormalized,
        correo: emailNormalized,
        fecha_nacimiento: fNacimientoFinal,
        genero: generoValido,
        grupo_sanguineo: sanitizeText(grupo_sanguineo || 'O+', 10)
      };

      USUARIOS_REGISTRADOS[emailNormalized] = nuevoPerfil;
      PACIENTES_MEMORIA[emailNormalized] = datosPacienteCompleto;

      const token = firmarToken(nuevoPerfil);

      return res.status(201).json({
        ok: true,
        success: true,
        mensaje: `¡Paciente ${nuevoPerfil.nombreCompleto} registrado exitosamente!`,
        token,
        usuario: limpiarPerfilPublico(nuevoPerfil),
        paciente: datosPacienteCompleto
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al procesar el registro del paciente.'
      });
    }
  }

  /**
   * Autenticación verificada por correo electrónico y contraseña contra Supabase (sin bypass de rol).
   */
  public static async login(req: Request, res: Response) {
    try {
      const emailRaw = sanitizeText(req.body?.email || req.body?.correo, 255).toLowerCase();
      const password = String(req.body?.password || '');

      if (!emailRaw || !password) {
        return res.status(400).json({
          ok: false,
          error: 'Debes ingresar tu correo electrónico y contraseña.'
        });
      }

      const emailCanonical = ALIAS_EMAILS[emailRaw] || emailRaw;
      let usuarioEncontrado: UsuarioPerfil | null = null;
      let pacientePayload: any = null;

      if (isDbEnabled()) {
        try {
          const client = await pool.connect();
          try {
            const resDb = await client.query(
              `SELECT u.id, u.email, u.password_hash, u.rol_id, u.esta_activo,
                      COALESCE(
                        NULLIF(TRIM(COALESCE(p.nombres, '') || ' ' || COALESCE(p.apellidos, '')), ''),
                        NULLIF(TRIM(COALESCE(m.nombres, '') || ' ' || COALESCE(m.apellidos, '')), ''),
                        NULLIF(TRIM(COALESCE(r.nombres, '') || ' ' || COALESCE(r.apellidos, '')), ''),
                        NULLIF(TRIM(COALESCE(a.nombres, '') || ' ' || COALESCE(a.apellidos, '')), ''),
                        'Usuario Clínico'
                      ) AS nombre_completo,
                      p.id AS paciente_id, p.nombres AS p_nombres, p.apellidos AS p_apellidos,
                      p.documento_tipo, p.documento_numero, p.fecha_nacimiento, p.genero,
                      p.telefono AS p_telefono, p.direccion, p.grupo_sanguineo, p.alergias,
                      p.contacto_emergencia_nombre, p.contacto_emergencia_telefono,
                      m.id AS medico_id, m.numero_colegiatura, r.sede
               FROM public.usuarios u
               LEFT JOIN public.pacientes p ON p.usuario_id = u.id
               LEFT JOIN public.medicos m ON m.id = u.id
               LEFT JOIN public.recepcionistas r ON r.id = u.id
               LEFT JOIN public.administradores a ON a.id = u.id
               WHERE LOWER(u.email) = $1 OR LOWER(u.email) = $2
               LIMIT 1`,
              [emailCanonical, emailRaw]
            );

            if (resDb.rows.length > 0) {
              const row = resDb.rows[0];
              if (!row.esta_activo) {
                return res.status(403).json({
                  ok: false,
                  error: 'Esta cuenta se encuentra suspendida o inactiva.'
                });
              }

              if (!verifyPassword(password, row.password_hash)) {
                return res.status(401).json({
                  ok: false,
                  error: 'Correo o contraseña incorrectos.'
                });
              }

              await client.query('UPDATE public.usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [row.id]);

              const rol = row.rol_id as RolId;
              const nombreParts = String(row.nombre_completo || 'U C').trim().split(/\s+/);
              const iniciales = ((nombreParts[0]?.[0] || 'U') + (nombreParts[1]?.[0] || nombreParts[0]?.[1] || 'C')).toUpperCase();

              usuarioEncontrado = {
                id: row.id,
                pacienteId: row.paciente_id || undefined,
                medicoId: row.medico_id || undefined,
                email: row.email,
                nombreCompleto: row.nombre_completo,
                rol,
                detalleRol: rol === 'MEDICO'
                  ? `Médico Especialista · ${row.numero_colegiatura || 'CMP'}`
                  : rol === 'RECEPCIONISTA'
                    ? `Mesa de Recepción · ${row.sede || 'Sede Central'}`
                    : `Usuario verificado en Supabase (${rol})`,
                avatar: iniciales,
                sede: row.sede || 'Sede Central',
                redirectUrl: redirectPorRol(rol)
              };

              if (rol === 'PACIENTE' && row.paciente_id) {
                pacientePayload = {
                  id: row.paciente_id,
                  usuario_id: row.id,
                  nombres: row.p_nombres,
                  apellidos: row.p_apellidos,
                  nombreCompleto: `${row.p_nombres} ${row.p_apellidos}`.trim(),
                  documento_tipo: row.documento_tipo,
                  documento_numero: row.documento_numero,
                  fecha_nacimiento: row.fecha_nacimiento ? new Date(row.fecha_nacimiento).toISOString().slice(0, 10) : '1995-01-01',
                  genero: row.genero,
                  telefono: row.p_telefono,
                  email: row.email,
                  correo: row.email,
                  direccion: row.direccion || '',
                  grupo_sanguineo: row.grupo_sanguineo || 'O+',
                  alergias: row.alergias || 'Ninguna conocida',
                  contacto_emergencia_nombre: row.contacto_emergencia_nombre || '',
                  contacto_emergencia_telefono: row.contacto_emergencia_telefono || ''
                };
              }
            }
          } finally {
            client.release();
          }
        } catch (dbErr: any) {
          console.warn('Error consultando Supabase en login, intentando memoria:', dbErr.message);
        }
      }

      if (!usuarioEncontrado) {
        const memUser = USUARIOS_REGISTRADOS[emailCanonical] || USUARIOS_REGISTRADOS[emailRaw];
        if (!memUser || !verifyPassword(password, memUser.passwordHash || '')) {
          return res.status(401).json({
            ok: false,
            error: 'Correo o contraseña incorrectos.'
          });
        }
        usuarioEncontrado = memUser;
        pacientePayload = PACIENTES_MEMORIA[emailCanonical] || PACIENTES_MEMORIA[emailRaw] || null;
      }

      const token = firmarToken(usuarioEncontrado);
      const usuarioSeguro = limpiarPerfilPublico(usuarioEncontrado);

      return res.json({
        ok: true,
        success: true,
        mensaje: `Bienvenido(a), ${usuarioSeguro.nombreCompleto}.`,
        token,
        usuario: usuarioSeguro,
        paciente: pacientePayload,
        data: {
          usuario: usuarioSeguro,
          paciente: pacientePayload,
          token
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error en el proceso de autenticación.'
      });
    }
  }

  /**
   * Retorna el perfil autenticado verificado a partir del token Bearer.
   */
  public static async obtenerPerfilActual(req: Request, res: Response) {
    if (!req.authUser) {
      return res.status(401).json({ ok: false, error: 'Sesión no autenticada.' });
    }
    const email = req.authUser.email.toLowerCase();
    let usuario = USUARIOS_REGISTRADOS[email] ? limpiarPerfilPublico(USUARIOS_REGISTRADOS[email]) : null;
    let paciente: any = PACIENTES_MEMORIA[email] || null;

    if (isDbEnabled() && isUuid(req.authUser.sub)) {
      try {
        const resDb = await pool.query(
          `SELECT u.id, u.email, u.rol_id,
                  p.id AS paciente_id, p.nombres, p.apellidos, p.documento_tipo, p.documento_numero,
                  p.fecha_nacimiento, p.genero, p.telefono, p.direccion, p.grupo_sanguineo,
                  p.alergias, p.contacto_emergencia_nombre, p.contacto_emergencia_telefono
           FROM public.usuarios u
           LEFT JOIN public.pacientes p ON p.usuario_id = u.id
           WHERE u.id = $1 LIMIT 1`,
          [req.authUser.sub]
        );
        if (resDb.rows.length > 0) {
          const row = resDb.rows[0];
          if (row.paciente_id) {
            paciente = {
              id: row.paciente_id,
              usuario_id: row.id,
              nombres: row.nombres,
              apellidos: row.apellidos,
              nombreCompleto: `${row.nombres} ${row.apellidos}`.trim(),
              documento_tipo: row.documento_tipo,
              documento_numero: row.documento_numero,
              fecha_nacimiento: row.fecha_nacimiento ? new Date(row.fecha_nacimiento).toISOString().slice(0, 10) : '',
              genero: row.genero,
              telefono: row.telefono,
              email: row.email,
              direccion: row.direccion || '',
              grupo_sanguineo: row.grupo_sanguineo || 'O+',
              alergias: row.alergias || 'Ninguna conocida',
              contacto_emergencia_nombre: row.contacto_emergencia_nombre || '',
              contacto_emergencia_telefono: row.contacto_emergencia_telefono || ''
            };
          }
          if (!usuario) {
            usuario = {
              id: row.id,
              pacienteId: row.paciente_id || undefined,
              email: row.email,
              nombreCompleto: paciente?.nombreCompleto || row.email,
              rol: row.rol_id,
              detalleRol: row.rol_id,
              avatar: row.email.slice(0, 2).toUpperCase(),
              redirectUrl: redirectPorRol(row.rol_id)
            };
          }
        }
      } catch {}
    }

    return res.json({
      ok: true,
      data: {
        auth: req.authUser,
        usuario,
        paciente
      }
    });
  }

  /**
   * Actualiza los datos médicos y personales del paciente autenticado en Supabase.
   */
  public static async actualizarPerfilPaciente(req: Request, res: Response) {
    if (!req.authUser) {
      return res.status(401).json({ ok: false, error: 'Autenticación requerida.' });
    }

    const body = req.body || {};
    const nombres = sanitizeText(
      body.primer_nombre ? `${body.primer_nombre}${body.segundo_nombre ? ' ' + body.segundo_nombre : ''}` : body.nombres,
      100
    );
    const apellidos = sanitizeText(
      body.primer_apellido ? `${body.primer_apellido}${body.segundo_apellido ? ' ' + body.segundo_apellido : ''}` : body.apellidos,
      100
    );
    const docTipo = sanitizeText(body.documento_tipo || 'CEDULA_NACIONAL', 30);
    const docNumero = sanitizeText(body.documento_numero, 30);
    const telefono = sanitizeText(body.telefono, 25);
    const fechaNac = sanitizeText(body.fecha_nacimiento || '1995-01-01', 20);
    const direccion = sanitizeText(body.direccion || '', 300);
    const grupoSanguineo = sanitizeText(body.grupo_sanguineo || 'O+', 10);
    const alergias = sanitizeText(body.alergias || 'Ninguna conocida', 400);
    const contactoNom = sanitizeText(body.contacto_emergencia_nombre || '', 100);
    const contactoTel = sanitizeText(body.contacto_emergencia_telefono || '', 25);

    if (!nombres || !apellidos || !docNumero || !telefono) {
      return res.status(400).json({
        ok: false,
        error: 'Nombres, apellidos, documento y teléfono son obligatorios.'
      });
    }

    if (isDbEnabled() && isUuid(req.authUser.sub)) {
      try {
        const upRes = await pool.query(
          `UPDATE public.pacientes
           SET nombres = $1,
               apellidos = $2,
               documento_tipo = $3,
               documento_numero = $4,
               telefono = $5,
               fecha_nacimiento = $6,
               direccion = $7,
               grupo_sanguineo = $8,
               alergias = $9,
               contacto_emergencia_nombre = $10,
               contacto_emergencia_telefono = $11
           WHERE usuario_id = $12
           RETURNING *`,
          [
            nombres,
            apellidos,
            docTipo,
            docNumero,
            telefono,
            fechaNac || '1995-01-01',
            direccion,
            grupoSanguineo,
            alergias,
            contactoNom,
            contactoTel,
            req.authUser.sub
          ]
        );

        if (upRes.rows.length > 0) {
          const row = upRes.rows[0];
          const pacienteActualizado = {
            ...row,
            nombreCompleto: `${row.nombres} ${row.apellidos}`.trim(),
            fecha_nacimiento: row.fecha_nacimiento ? new Date(row.fecha_nacimiento).toISOString().slice(0, 10) : fechaNac
          };
          return res.json({
            ok: true,
            mensaje: 'Perfil médico actualizado en Supabase.',
            paciente: pacienteActualizado
          });
        }
      } catch (err: any) {
        if (err?.code === '23505') {
          return res.status(409).json({ ok: false, error: `La cédula/documento ${docNumero} ya está asignada a otro paciente.` });
        }
        return res.status(500).json({ ok: false, error: err.message || 'Error al actualizar el perfil en base de datos.' });
      }
    }

    const emailKey = req.authUser.email.toLowerCase();
    const actualizado = {
      ...(PACIENTES_MEMORIA[emailKey] || {}),
      nombres,
      apellidos,
      nombreCompleto: `${nombres} ${apellidos}`.trim(),
      documento_tipo: docTipo,
      documento_numero: docNumero,
      telefono,
      fecha_nacimiento: fechaNac,
      direccion,
      grupo_sanguineo: grupoSanguineo,
      alergias,
      contacto_emergencia_nombre: contactoNom,
      contacto_emergencia_telefono: contactoTel
    };
    PACIENTES_MEMORIA[emailKey] = actualizado;

    return res.json({
      ok: true,
      mensaje: 'Perfil actualizado correctamente.',
      paciente: actualizado
    });
  }

  /**
   * Lista usuarios registrados desde Supabase (solo Administrador).
   */
  public static async listarUsuariosAdmin(_req: Request, res: Response) {
    if (isDbEnabled()) {
      try {
        const result = await pool.query(`
          SELECT u.id, u.email, u.rol_id, u.esta_activo, u.ultimo_login,
                 COALESCE(p.nombres || ' ' || p.apellidos, m.nombres || ' ' || m.apellidos, r.nombres || ' ' || r.apellidos, a.nombres || ' ' || a.apellidos, u.email) AS nombre,
                 COALESCE(p.telefono, m.telefono, r.telefono, a.telefono, '-') AS telefono,
                 COALESCE(m.numero_colegiatura, p.documento_numero, r.sede, 'Supervisión Clínica') AS extra
          FROM public.usuarios u
          LEFT JOIN public.pacientes p ON p.usuario_id = u.id
          LEFT JOIN public.medicos m ON m.id = u.id
          LEFT JOIN public.recepcionistas r ON r.id = u.id
          LEFT JOIN public.administradores a ON a.id = u.id
          ORDER BY u.creado_en ASC
        `);
        return res.json({ ok: true, data: result.rows });
      } catch (err: any) {
        return res.status(500).json({ ok: false, error: err.message });
      }
    }

    const memList = Object.values(USUARIOS_BASE).map(u => ({
      id: u.id,
      email: u.email,
      rol_id: u.rol,
      esta_activo: true,
      nombre: u.nombreCompleto,
      telefono: '+507 6598-2118',
      extra: u.detalleRol
    }));
    return res.json({ ok: true, data: memList });
  }

  /**
   * Crea o actualiza estado/rol de usuario desde Administración.
   */
  public static async guardarUsuarioAdmin(req: Request, res: Response) {
    const { email, nombre, rol_id = 'PACIENTE', telefono = '+507 6000-0000', password, esta_activo = true } = req.body || {};
    const emailClean = sanitizeText(email, 255).toLowerCase();
    const nombreClean = sanitizeText(nombre, 160);
    if (!emailClean || !nombreClean) {
      return res.status(400).json({ ok: false, error: 'Nombre y correo son obligatorios.' });
    }

    const rolValido = (['ADMINISTRADOR', 'RECEPCIONISTA', 'MEDICO', 'PACIENTE'].includes(rol_id) ? rol_id : 'PACIENTE') as RolId;
    const partes = nombreClean.split(/\s+/);
    const nombres = partes.slice(0, Math.max(1, Math.floor(partes.length / 2))).join(' ');
    const apellidos = partes.slice(Math.max(1, Math.floor(partes.length / 2))).join(' ') || 'Clínico';

    if (isDbEnabled()) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const userId = uuidv4();
        const pwdHash = hashPassword(String(password || 'MedPulse2026!'));
        const existing = await client.query('SELECT id FROM public.usuarios WHERE LOWER(email) = $1 LIMIT 1', [emailClean]);

        let finalId = userId;
        if (existing.rows.length > 0) {
          finalId = existing.rows[0].id;
          await client.query(
            'UPDATE public.usuarios SET rol_id = $1, esta_activo = $2 WHERE id = $3',
            [rolValido, Boolean(esta_activo), finalId]
          );
        } else {
          await client.query(
            'INSERT INTO public.usuarios (id, email, password_hash, rol_id, esta_activo) VALUES ($1, $2, $3, $4, $5)',
            [finalId, emailClean, pwdHash, rolValido, Boolean(esta_activo)]
          );
          if (rolValido === 'PACIENTE') {
            await client.query(
              `INSERT INTO public.pacientes (usuario_id, documento_tipo, documento_numero, nombres, apellidos, fecha_nacimiento, genero, telefono, email)
               VALUES ($1, 'CEDULA_NACIONAL', $2, $3, $4, '1995-01-01', 'OTRO', $5, $6)
               ON CONFLICT DO NOTHING`,
              [finalId, `8-${Date.now().toString().slice(-4)}-${Math.floor(10000 + Math.random() * 89999)}`, nombres, apellidos, sanitizeText(telefono, 25), emailClean]
            );
          } else if (rolValido === 'MEDICO') {
            await client.query(
              `INSERT INTO public.medicos (id, numero_colegiatura, nombres, apellidos, telefono, biografia, tarifa_consulta, esta_activo)
               VALUES ($1, $2, $3, $4, $5, 'Especialista clínico MedPulse Panamá.', 100.00, TRUE)
               ON CONFLICT (id) DO NOTHING`,
              [finalId, `CMP-${Math.floor(60000 + Math.random() * 39999)}`, nombres, apellidos, sanitizeText(telefono, 25)]
            );
          } else if (rolValido === 'RECEPCIONISTA') {
            await client.query(
              `INSERT INTO public.recepcionistas (id, nombres, apellidos, telefono, sede)
               VALUES ($1, $2, $3, $4, 'Sede Central') ON CONFLICT (id) DO NOTHING`,
              [finalId, nombres, apellidos, sanitizeText(telefono, 25)]
            );
          } else {
            await client.query(
              `INSERT INTO public.administradores (id, nombres, apellidos, telefono)
               VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
              [finalId, nombres, apellidos, sanitizeText(telefono, 25)]
            );
          }
        }
        await client.query('COMMIT');
        return res.status(201).json({ ok: true, id: finalId, email: emailClean, rol_id: rolValido });
      } catch (err: any) {
        await client.query('ROLLBACK');
        return res.status(500).json({ ok: false, error: err.message });
      } finally {
        client.release();
      }
    }

    return res.status(201).json({ ok: true, email: emailClean, rol_id: rolValido });
  }
}
