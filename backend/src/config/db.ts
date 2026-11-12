import pg from 'pg';
import { config } from './env.js';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 2000, // 2s timeout rápido para no bloquear si no está activo
  idleTimeoutMillis: 10000
});

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
    motor: 'PostgreSQL 14+',
    url: config.databaseUrl.replace(/(:[^:@]+@)/, ':****@'), // ocultar contraseña
    mensaje: 'Inicializando comprobación de conexión...'
  };

  /**
   * Verifica la conectividad con la base de datos PostgreSQL
   */
  public static async verificarConexion(): Promise<DBStatus> {
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
          url: config.databaseUrl.replace(/(:[^:@]+@)/, ':****@'),
          mensaje: `Conectado exitosamente a PostgreSQL (Base de datos: ${res.rows[0].current_database}).`,
          tablasDetectadas: tablas
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.statusCache = {
        conectado: false,
        motor: 'PostgreSQL 14+ (Modo Standby / Memoria Activa)',
        url: config.databaseUrl.replace(/(:[^:@]+@)/, ':****@'),
        mensaje: `No se detecta servicio PostgreSQL activo en ${config.databaseUrl.split('@')[1] || 'localhost:5432'}. El backend opera en modo resiliente con datos de prueba (Seeds) precargados. Código: ${err.code || err.message}`
      };
    }

    return this.statusCache;
  }

  /**
   * Ejecuta los scripts SQL DDL y Seeds iniciales en PostgreSQL
   */
  public static async ejecutarInicializacionSQL(rutaRaizProyecto: string): Promise<{ ok: boolean; mensaje: string }> {
    const status = await this.verificarConexion();
    if (!status.conectado) {
      return {
        ok: false,
        mensaje: 'PostgreSQL no está activo en este momento. Inicie el servicio PostgreSQL para cargar las tablas.'
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const rutaInitCompleto = path.join(rutaRaizProyecto, 'database', 'init_local_db.sql');
      const rutaSchema = path.join(rutaRaizProyecto, 'database', 'schemas', 'schema.sql');
      const rutaSeeds = path.join(rutaRaizProyecto, 'database', 'seeds', '01_initial_seeds.sql');

      if (fs.existsSync(rutaInitCompleto)) {
        const sqlInit = fs.readFileSync(rutaInitCompleto, 'utf8');
        await client.query(sqlInit);
      } else {
        if (fs.existsSync(rutaSchema)) {
          const sqlSchema = fs.readFileSync(rutaSchema, 'utf8');
          await client.query(sqlSchema);
        }

        if (fs.existsSync(rutaSeeds)) {
          const sqlSeeds = fs.readFileSync(rutaSeeds, 'utf8');
          await client.query(sqlSeeds);
        }
      }

      await client.query('COMMIT');

      return {
        ok: true,
        mensaje: 'Tablas DDL y datos de prueba (Seeds) cargados exitosamente en PostgreSQL.'
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
