import { Request, Response } from 'express';
import { RolId } from '../types/index.js';
import { pool } from '../config/db.js';

export interface UsuarioPerfil {
  id: string;
  email: string;
  nombreCompleto: string;
  rol: RolId;
  detalleRol: string;
  avatar: string;
  sede?: string;
  especialidad?: string;
  redirectUrl: string;
}

// Usuarios de prueba con sus roles respectivos y correos reales / Gmail
const USUARIOS_BASE: Record<string, UsuarioPerfil> = {
  'admin@medpulse.clinic': {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@medpulse.clinic',
    nombreCompleto: 'Elvis · Administrador General',
    rol: 'ADMINISTRADOR',
    detalleRol: 'Control total de configuración, métricas, especialidades y auditoría',
    avatar: 'EA',
    redirectUrl: '/citas'
  },
  'admin@clinica.com': {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@clinica.com',
    nombreCompleto: 'Elvis · Administrador General',
    rol: 'ADMINISTRADOR',
    detalleRol: 'Control total de configuración, métricas, especialidades y auditoría',
    avatar: 'EA',
    redirectUrl: '/citas'
  },
  'recepcion@medpulse.clinic': {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'recepcion@medpulse.clinic',
    nombreCompleto: 'Elena Ramos (Recepción)',
    rol: 'RECEPCIONISTA',
    detalleRol: 'Gestión de citas presenciales, llegadas y confirmación en sala de espera',
    avatar: 'ER',
    sede: 'Sede Central',
    redirectUrl: '/secretaria'
  },
  'recepcion@clinica.com': {
    id: 'b0000000-0000-0000-0000-000000000001',
    email: 'recepcion@clinica.com',
    nombreCompleto: 'Elena Ramos (Recepción)',
    rol: 'RECEPCIONISTA',
    detalleRol: 'Gestión de citas presenciales, llegadas y confirmación en sala de espera',
    avatar: 'ER',
    sede: 'Sede Central',
    redirectUrl: '/secretaria'
  },
  'dr.mendoza@gmail.com': {
    id: 'c0000000-0000-0000-0000-000000000001',
    email: 'dr.mendoza@gmail.com',
    nombreCompleto: 'Dr. Roberto Mendoza Valdivia',
    rol: 'MEDICO',
    detalleRol: 'Cardiología · Consultorio 201',
    avatar: 'RM',
    especialidad: 'Cardiología',
    redirectUrl: '/doctor/agenda'
  },
  'roberto.mendoza@clinica.com': {
    id: 'c0000000-0000-0000-0000-000000000001',
    email: 'roberto.mendoza@clinica.com',
    nombreCompleto: 'Dr. Roberto Mendoza Valdivia',
    rol: 'MEDICO',
    detalleRol: 'Cardiología · Consultorio 201',
    avatar: 'RM',
    especialidad: 'Cardiología',
    redirectUrl: '/doctor/agenda'
  },
  'dra.silva@gmail.com': {
    id: 'c0000000-0000-0000-0000-000000000002',
    email: 'dra.silva@gmail.com',
    nombreCompleto: 'Dra. Carmen Silva Rojas',
    rol: 'MEDICO',
    detalleRol: 'Pediatría y Medicina General · Consultorio 102',
    avatar: 'CS',
    especialidad: 'Pediatría',
    redirectUrl: '/doctor/agenda'
  },
  'juan.perez@gmail.com': {
    id: 'd0000000-0000-0000-0000-000000000001',
    email: 'juan.perez@gmail.com',
    nombreCompleto: 'Juan Carlos Pérez Salazar',
    rol: 'PACIENTE',
    detalleRol: 'Portal del paciente: reservas de citas, historial y triaje virtual',
    avatar: 'JP',
    redirectUrl: '/paciente'
  },
  'maria.gomez@gmail.com': {
    id: 'd0000000-0000-0000-0000-000000000002',
    email: 'maria.gomez@gmail.com',
    nombreCompleto: 'María Elena Gómez Torres',
    rol: 'PACIENTE',
    detalleRol: 'Portal del paciente: reservas de citas, historial y triaje virtual',
    avatar: 'MG',
    redirectUrl: '/paciente'
  }
};

// Almacén en memoria sincronizado para registrar pacientes nuevos dinámicamente
const USUARIOS_REGISTRADOS: Record<string, UsuarioPerfil> = { ...USUARIOS_BASE };

export class AuthController {
  /**
   * Lista los roles disponibles y usuarios de prueba para fácil interacción
   */
  public static async listarRolesYUsuarios(_req: Request, res: Response) {
    const rolesInfo = [
      {
        rol: 'ADMINISTRADOR',
        nombre: 'Administrador General',
        descripcion: 'Control total de configuración de consultorios, médicos, especialidades y auditoría.',
        usuarioDemo: USUARIOS_BASE['admin@medpulse.clinic']
      },
      {
        rol: 'RECEPCIONISTA',
        nombre: 'Personal de Recepción / Secretaria',
        descripcion: 'Gestión de citas presenciales, confirmación de asistencias y triaje físico.',
        usuarioDemo: USUARIOS_BASE['recepcion@medpulse.clinic']
      },
      {
        rol: 'MEDICO',
        nombre: 'Profesional Médico',
        descripcion: 'Visualización de agenda diaria, bloqueo de horarios y notas de atención.',
        usuarioDemo: USUARIOS_BASE['dr.mendoza@gmail.com']
      },
      {
        rol: 'PACIENTE',
        nombre: 'Paciente Registrado',
        descripcion: 'Reserva web 24/7 con asignación automática de horario y consulta de historial.',
        usuarioDemo: USUARIOS_BASE['juan.perez@gmail.com']
      }
    ];

    return res.json({
      ok: true,
      data: rolesInfo
    });
  }

  /**
   * Registro de un nuevo paciente (soporta correos Gmail u otros)
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
        documento_tipo = 'CEDULA_PANAMA',
        documentoTipo = 'CEDULA_PANAMA',
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
        genero = 'OTRO'
      } = req.body;

      const pNombre = (primer_nombre || primerNombre || '').trim();
      const sNombre = (segundo_nombre || segundoNombre || '').trim();
      const pApellido = (primer_apellido || primerApellido || '').trim();
      const sApellido = (segundo_apellido || segundoApellido || '').trim();

      const nombresFinal = (pNombre ? `${pNombre}${sNombre ? ' ' + sNombre : ''}` : (nombres || '')).trim();
      const apellidosFinal = (pApellido ? `${pApellido}${sApellido ? ' ' + sApellido : ''}` : (apellidos || '')).trim();
      const emailFinal = (email || correo || '').toLowerCase().trim();
      const fNacimientoFinal = fecha_nacimiento || fechaNacimiento || '1995-01-01';

      // Reconstruir o aceptar documento con formato panameño (prefijo-tomo-asiento)
      const prefijo = cedula_prefijo || cedulaPrefijo || '';
      const tomo = cedula_tomo || cedulaTomo || '';
      const asiento = cedula_asiento || cedulaAsiento || '';
      let docFinal = (documento_numero || documentoNumero || '').trim();

      if (!docFinal && prefijo && tomo && asiento) {
        docFinal = `${prefijo}-${tomo}-${asiento}`;
      } else if (!docFinal) {
        docFinal = '8-1234-56789';
      }

      if (!emailFinal || !nombresFinal || !apellidosFinal) {
        return res.status(400).json({
          ok: false,
          error: 'Campos obligatorios faltantes: correo, primer nombre y primer apellido.'
        });
      }

      const emailNormalized = emailFinal;

      if (USUARIOS_REGISTRADOS[emailNormalized]) {
        return res.status(409).json({
          ok: false,
          error: `Ya existe un usuario registrado con el correo ${emailNormalized}. Por favor inicie sesión.`
        });
      }

      const nuevoId = 'p-' + Date.now().toString(16);
      const iniciales = (pNombre[0] || nombresFinal[0] || 'P') + (pApellido[0] || apellidosFinal[0] || 'R');

      const nuevoPerfil: UsuarioPerfil = {
        id: nuevoId,
        email: emailNormalized,
        nombreCompleto: `${nombresFinal} ${apellidosFinal}`,
        rol: 'PACIENTE',
        detalleRol: 'Paciente registrado en MedPulse (Panamá)',
        avatar: iniciales.toUpperCase(),
        redirectUrl: '/paciente'
      };

      const datosPacienteCompleto = {
        id: nuevoId,
        usuario_id: nuevoId,
        nombres: nombresFinal,
        apellidos: apellidosFinal,
        primer_nombre: pNombre || nombresFinal.split(' ')[0],
        segundo_nombre: sNombre || (nombresFinal.split(' ').slice(1).join(' ') || ''),
        primer_apellido: pApellido || apellidosFinal.split(' ')[0],
        segundo_apellido: sApellido || (apellidosFinal.split(' ').slice(1).join(' ') || ''),
        nombreCompleto: `${nombresFinal} ${apellidosFinal}`,
        documento_tipo: documento_tipo || documentoTipo || 'CEDULA_PANAMA',
        documento_numero: docFinal,
        documentoNumero: docFinal,
        cedula_prefijo: prefijo,
        cedula_tomo: tomo,
        cedula_asiento: asiento,
        telefono,
        email: emailNormalized,
        correo: emailNormalized,
        fecha_nacimiento: fNacimientoFinal,
        genero
      };

      // Guardar en almacén en memoria
      USUARIOS_REGISTRADOS[emailNormalized] = nuevoPerfil;

      // Intentar persistir en PostgreSQL si la conexión está disponible
      try {
        const checkClient = await pool.connect();
        try {
          await checkClient.query(`
            INSERT INTO usuarios (id, email, password_hash, rol_id, esta_activo)
            VALUES (gen_random_uuid(), $1, $2, 'PACIENTE', TRUE)
            ON CONFLICT (email) DO NOTHING;
          `, [emailNormalized, password || '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRpH.eQYvM9B6Nl0bFz6yYm6K2Gti']);

          await checkClient.query(`
            INSERT INTO pacientes (
              usuario_id, documento_tipo, documento_numero, nombres, apellidos,
              fecha_nacimiento, genero, telefono, email
            ) VALUES (
              (SELECT id FROM usuarios WHERE email = $1),
              $2, $3, $4, $5, $6, $7, $8, $1
            ) ON CONFLICT DO NOTHING;
          `, [
            emailNormalized,
            datosPacienteCompleto.documento_tipo,
            docFinal,
            nombresFinal,
            apellidosFinal,
            fNacimientoFinal,
            genero,
            telefono
          ]);
        } finally {
          checkClient.release();
        }
      } catch (dbErr: any) {
        console.log('PostgreSQL offline, paciente guardado en memoria local:', dbErr.message);
      }

      return res.status(201).json({
        ok: true,
        mensaje: `¡Paciente ${nuevoPerfil.nombreCompleto} registrado exitosamente!`,
        token: `mock-jwt-token-paciente-${nuevoPerfil.id}`,
        usuario: nuevoPerfil,
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
   * Autenticación / Inicio de sesión por rol o email
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password, cambiarARol } = req.body;

      // Si el cliente pide cambiar de rol directamente para pruebas rápidas
      if (cambiarARol) {
        const usuario = Object.values(USUARIOS_REGISTRADOS).find(u => u.rol === cambiarARol.toUpperCase());
        if (usuario) {
          return res.json({
            ok: true,
            mensaje: `Sesión iniciada con éxito como ${usuario.rol}.`,
            token: `mock-jwt-token-${usuario.rol.toLowerCase()}`,
            usuario
          });
        }
      }

      if (!email) {
        return res.status(400).json({
          ok: false,
          error: 'Debe ingresar un correo electrónico o especificar un rol.'
        });
      }

      const emailNormalized = email.toLowerCase().trim();
      let usuario = USUARIOS_REGISTRADOS[emailNormalized];

      // Si no está en memoria, verificar si existe en PostgreSQL
      if (!usuario) {
        try {
          const client = await pool.connect();
          try {
            const resDb = await client.query(`
              SELECT u.id, u.email, u.rol_id,
                     COALESCE(p.nombres || ' ' || p.apellidos, m.nombres || ' ' || m.apellidos, r.nombres || ' ' || r.apellidos, a.nombres || ' ' || a.apellidos, 'Usuario Clínico') as nombre_completo
              FROM usuarios u
              LEFT JOIN pacientes p ON p.usuario_id = u.id
              LEFT JOIN medicos m ON m.id = u.id
              LEFT JOIN recepcionistas r ON r.id = u.id
              LEFT JOIN administradores a ON a.id = u.id
              WHERE u.email = $1
            `, [emailNormalized]);

            if (resDb.rows.length > 0) {
              const row = resDb.rows[0];
              const rol = row.rol_id as RolId;
              const redirectUrl = rol === 'ADMINISTRADOR' ? '/citas' : rol === 'RECEPCIONISTA' ? '/secretaria' : rol === 'MEDICO' ? '/doctor/agenda' : '/paciente';
              usuario = {
                id: row.id,
                email: row.email,
                nombreCompleto: row.nombre_completo,
                rol,
                detalleRol: `Usuario verificado en base de datos PostgreSQL (${rol})`,
                avatar: (row.nombre_completo[0] || 'U') + (row.nombre_completo.split(' ')[1]?.[0] || 'C'),
                redirectUrl
              };
              USUARIOS_REGISTRADOS[emailNormalized] = usuario;
            }
          } finally {
            client.release();
          }
        } catch {
          // PostgreSQL no disponible, continuar con validación
        }
      }

      if (!usuario) {
        return res.status(404).json({
          ok: false,
          error: `Usuario no encontrado. Puedes registrarte como nuevo paciente con tu correo Gmail, o usar los correos demo: admin@medpulse.clinic, recepcion@medpulse.clinic, dr.mendoza@gmail.com o juan.perez@gmail.com`
        });
      }

      const token = `mock-jwt-token-${usuario.rol.toLowerCase()}`;
      return res.json({
        ok: true,
        success: true,
        mensaje: `Bienvenido de nuevo, ${usuario.nombreCompleto}.`,
        token,
        usuario,
        data: {
          usuario,
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
}
