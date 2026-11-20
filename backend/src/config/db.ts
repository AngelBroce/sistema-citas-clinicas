import pg, { PoolConfig } from 'pg';
import { config } from './env.js';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

function buildPoolConfig(rawUrl: string): PoolConfig {
  let sanitizedUrl = rawUrl;
  let isLocal = false;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const sslMode = parsed.searchParams.get('sslmode');
    isLocal = host === 'localhost' || host === '127.0.0.1' || sslMode === 'disable';

    // Eliminar sslmode del query string para evitar que pg ignore ssl.rejectUnauthorized=false en Supabase Pooler
    if (parsed.searchParams.has('sslmode')) {
      parsed.searchParams.delete('sslmode');
      sanitizedUrl = parsed.toString();
    }
  } catch {
    isLocal = rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
  }

  return {
    connectionString: sanitizedUrl,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    max: process.env.VERCEL ? 3 : 10,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true
  };
}

export const pool = new Pool(buildPoolConfig(config.databaseUrl));

export interface DBStatus {
  conectado: boolean;
  motor: string;
  url: string;
  mensaje: string;
  tablasDetectadas?: string[];
}

export class DatabaseService {
  private static statusCache: DBStatus = {
    conectado: false,
    motor: 'Supabase PostgreSQL',
    url: 'hidden',
    mensaje: 'Inicializando comprobación de conexión...'
  };

  /**
   * Verifica la conectividad con la base de datos PostgreSQL / Supabase.
   */
  public static async verificarConexion(): Promise<DBStatus> {
    const maskedUrl = config.isProduction
      ? 'supabase://pooler'
      : config.databaseUrl.replace(/(:[^:@]+@)/, ':****@');

    try {
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT version(), current_database();');
        const tablesRes = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `);

        const tablas = tablesRes.rows.map(r => r.table_name);

        this.statusCache = {
          conectado: true,
          motor: res.rows[0].version.split(' on ')[0],
          url: maskedUrl,
          mensaje: `Conectado exitosamente a PostgreSQL (Base de datos: ${res.rows[0].current_database}).`,
          tablasDetectadas: tablas
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.statusCache = {
        conectado: false,
        motor: 'Supabase PostgreSQL (Modo Standby / Memoria Activa)',
        url: maskedUrl,
        mensaje: config.isProduction
          ? 'Servicio de base de datos temporalmente no disponible.'
          : `No se detecta servicio PostgreSQL activo. El backend opera en modo resiliente. Código: ${err.code || err.message}`
      };
    }

    return this.statusCache;
  }

  /**
   * Ejecuta los scripts SQL DDL y Seeds iniciales en PostgreSQL.
   */
  public static async ejecutarInicializacionSQL(rutaRaizProyecto: string): Promise<{ ok: boolean; mensaje: string }> {
    const status = await this.verificarConexion();
    if (!status.conectado) {
      return {
        ok: false,
        mensaje: 'PostgreSQL / Supabase no está conectado en este momento.'
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rutaInitCompleto = path.join(rutaRaizProyecto, 'database', 'init_local_db.sql');
      const rutaSchema = path.join(rutaRaizProyecto, 'database', 'schemas', 'schema.sql');
      const rutaSeeds = path.join(rutaRaizProyecto, 'database', 'seeds', '01_initial_seeds.sql');

      if (fs.existsSync(rutaSchema) || fs.existsSync(rutaSeeds)) {
        if (fs.existsSync(rutaSchema)) {
          const sqlSchema = fs.readFileSync(rutaSchema, 'utf8');
          await client.query(sqlSchema);
        }
        if (fs.existsSync(rutaSeeds)) {
          const sqlSeeds = fs.readFileSync(rutaSeeds, 'utf8');
          await client.query(sqlSeeds);
        }
      } else if (fs.existsSync(rutaInitCompleto)) {
        const sqlInit = fs.readFileSync(rutaInitCompleto, 'utf8');
        await client.query(sqlInit);
      }

      await client.query('COMMIT');

      return {
        ok: true,
        mensaje: 'Tablas DDL y datos iniciales cargados exitosamente en PostgreSQL.'
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      return {
        ok: false,
        mensaje: `Error al ejecutar scripts SQL: ${error.message}`
      };
    } finally {
      client.release();
    }
  }

  public static getStatus(): DBStatus {
    return this.statusCache;
  }
}
