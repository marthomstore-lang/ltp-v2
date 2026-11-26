import { Pool as PgPool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno desde .env (raíz o backend/)
dotenv.config();
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../backend/.env')
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

const connectionString = process.env.DATABASE_URL || '';

export const isMysql = false;

if (connectionString) {
  console.log('⚡ Conexión activa a PostgreSQL Supabase Cloud');
} else {
  console.error('❌ ERROR CRÍTICO: DATABASE_URL no está configurada en las variables de entorno (.env).');
}

const isSupabase =
  connectionString.includes('supabase.co') ||
  connectionString.includes('supabase.com') ||
  connectionString.includes('pooler.supabase.com');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

let pgPool: PgPool | null = null;

if (connectionString) {
  pgPool = new PgPool({
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    max: isServerless ? 2 : 10,
    idleTimeoutMillis: isServerless ? 2000 : 30000,
    connectionTimeoutMillis: 8000,
    keepAlive: true,
    allowExitOnIdle: isServerless
  });

  pgPool.on('error', (err) => {
    console.warn('⚠️ Aviso de reconexión automática en pool PostgreSQL:', err.message);
  });
}

export const pool = pgPool;

/**
 * Helper universal de consulta SQL para PostgreSQL Supabase con reintento automático ante picos transitorios.
 * Mantiene compatibilidad total de llamadas y resultados: { rows: any[], rowCount: number }
 */
export const query = async (text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> => {
  if (!pgPool) {
    throw new Error('Base de datos no conectada: DATABASE_URL no está configurada');
  }

  let pgText = text;
  // Normalización de compatibilidad INSERT IGNORE -> ON CONFLICT DO NOTHING
  if (/\bINSERT\s+IGNORE\s+INTO\b/i.test(pgText)) {
    pgText = pgText.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(pgText)) {
      pgText = pgText.trim().replace(/;$/, '') + ' ON CONFLICT DO NOTHING';
    }
  }

  const runQuery = async () => {
    const res = await pgPool!.query(pgText, params);
    return { rows: res.rows, rowCount: res.rowCount || 0 };
  };

  try {
    return await runQuery();
  } catch (err: any) {
    const errCode = String(err.code || '');
    const errMsg = String(err.message || '');
    // Errores inocuos durante migraciones (ej. columna ya añadida o tabla existente)
    if (errCode === 'ER_DUP_FIELDNAME' || errCode === 'ER_TABLE_EXISTS_ERROR' || errCode === '42701') {
      return { rows: [], rowCount: 0 };
    }

    // Reintento único automático si el pooler Supavisor reportó pico de conexiones (EMAXCONN) o desconexión transitoria
    const isTransient =
      errMsg.includes('EMAXCONN') ||
      errMsg.includes('max client connections reached') ||
      errMsg.includes('ECONNRESET') ||
      errMsg.includes('Connection terminated') ||
      errCode === '57P01';

    if (isTransient) {
      console.warn('⚠️ Pico transitorio detectado en pooler, reintentando consulta en 250ms...');
      await new Promise(r => setTimeout(r, 250));
      try {
        return await runQuery();
      } catch (retryErr: any) {
        console.error('❌ Error persistente tras reintento PostgreSQL:', retryErr.message);
        throw retryErr;
      }
    }

    console.error(`❌ Error en consulta PostgreSQL (${errCode || errMsg}):`, text.substring(0, 100));
    throw err;
  }
};

/**
 * Verifica la conectividad real con la base de datos PostgreSQL
 */
export const checkDbConnection = async (): Promise<boolean> => {
  try {
    if (!pgPool) return false;
    const client = await pgPool.connect();
    client.release();
    return true;
  } catch (err: any) {
    console.error('❌ Error al verificar conexión con PostgreSQL:', err.message || err);
    return false;
  }
};
