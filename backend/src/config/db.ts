import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';
export const isMysql = process.env.DB_TYPE === 'mysql' || connectionString.startsWith('mysql://') || connectionString.includes('3306');

let pgPool: PgPool | null = null;
let mysqlPool: mysql.Pool | null = null;

if (isMysql) {
  console.log('🐬 Conexión activa a Motor de Base de Datos MySQL');
  mysqlPool = mysql.createPool({
    uri: connectionString || process.env.MYSQL_URL || 'mysql://127.0.0.1:3306/ltp_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
} else {
  if (connectionString) {
    console.log('⚡ Conexión activa a PostgreSQL Supabase Cloud');
  } else {
    console.error('❌ ERROR CRÍTICO: DATABASE_URL no está configurada en backend/.env');
  }
  pgPool = new PgPool({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
  });
}

// Fallback store en memoria cuando MySQL/PostgreSQL local está inactivo
const fallbackStore: {
  users: any[];
  students: any[];
  interviews: any[];
  grades: any[];
  teacher_assignments: any[];
  observations: any[];
  staff_profiles: any[];
  institutional_links: any[];
  audit_logs: any[];
  cra_books: any[];
  cra_daily_materials: any[];
  courses?: any[];
  subjects: any[];
  student_passes?: any[];
} = {
  users: [],
  students: [],
  courses: [],
  interviews: [],
  grades: [],
  teacher_assignments: [],
  subjects: [],
  observations: [],
  staff_profiles: [],
  institutional_links: [],
  audit_logs: [],
  cra_books: [],
  cra_daily_materials: [],
  student_passes: []
};

// Cargar estado dinámicamente desde local_store.json si existe
try {
  const getStorePath = () => {
    const p1 = path.join(process.cwd(), 'local_store.json');
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(process.cwd(), 'backend', 'local_store.json');
    if (fs.existsSync(p2)) return p2;
    const p3 = path.resolve(__dirname, '../local_store.json');
    if (fs.existsSync(p3)) return p3;
    return p1;
  };
  const storePath = getStorePath();
  if (fs.existsSync(storePath)) {
    const diskStore = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    if (Array.isArray(diskStore.users)) fallbackStore.users = diskStore.users;
    // Por seguridad y política estricta de base de datos, los estudiantes NUNCA se cargan en fallback offline
    fallbackStore.students = [];
    if (Array.isArray(diskStore.courses)) fallbackStore.courses = diskStore.courses;
    if (Array.isArray(diskStore.teacher_assignments)) fallbackStore.teacher_assignments = diskStore.teacher_assignments;
    if (Array.isArray(diskStore.subjects)) fallbackStore.subjects = diskStore.subjects;
  }
} catch (_) {}

function executeFallbackQuery(text: string, params?: any[]): { rows: any[]; rowCount: number } {
  const upperSql = text.toUpperCase();
  const inputParams = params || [];

  if (upperSql.includes('FROM USERS')) {
    if (upperSql.includes('COUNT(')) {
      return { rows: [{ total: fallbackStore.users.length }], rowCount: 1 };
    }
    if (inputParams.length >= 1) {
      const cleanTarget = String(inputParams[0] || '').replace(/\./g, '').trim().toLowerCase();
      const rawTarget = String(inputParams[1] || inputParams[0] || '').trim().toLowerCase();

      const found = fallbackStore.users.filter(u => {
        const uCleanRun = String(u.run || '').replace(/\./g, '').trim().toLowerCase();
        const uRun = String(u.run || '').trim().toLowerCase();
        const uEmail = String(u.email || '').trim().toLowerCase();
        const uId = String(u.id || '').trim().toLowerCase();
        return uCleanRun === cleanTarget || uRun === rawTarget || uEmail === rawTarget || uId === rawTarget;
      });
      return { rows: found, rowCount: found.length };
    }
    return { rows: fallbackStore.users, rowCount: fallbackStore.users.length };
  }

  if (upperSql.includes('UPDATE USERS')) {
    const newHash = inputParams[0];
    const newPlain = inputParams[1];
    const targetId = inputParams[inputParams.length - 1];
    fallbackStore.users.forEach(u => {
      if (String(u.id) === String(targetId)) {
        u.password_hash = newHash;
        u.password_plain = newPlain;
        u.temp_password = 0;
      }
    });
    return { rows: [], rowCount: 1 };
  }

  if (upperSql.includes('UPDATE PASSWORD_RESETS')) {
    return { rows: [], rowCount: 1 };
  }

  if (upperSql.includes('UPDATE STUDENTS')) {
    const newTeacher = inputParams[0];
    const targetCourse = inputParams[1];
    fallbackStore.students.forEach(s => {
      const cName = s.desc_grado || s.level_name;
      if (!targetCourse || cName === targetCourse || String(cName).replace(/°/g, '') === String(targetCourse).replace(/°/g, '')) {
        s.profesor_jefe = newTeacher;
      }
    });
    return { rows: [], rowCount: fallbackStore.students.length };
  }

  if (upperSql.includes('STUDENTS')) {
    // Bloqueo estricto: Ningún dato de estudiante es devuelto sin conexión a la base de datos real
    return { rows: [], rowCount: 0 };
  }

  if (upperSql.includes('FROM INTERVIEWS')) {
    if (upperSql.includes('COUNT(')) return { rows: [{ total: fallbackStore.interviews.length }], rowCount: 1 };
    return { rows: fallbackStore.interviews, rowCount: fallbackStore.interviews.length };
  }

  if (upperSql.includes('INSERT INTO TEACHER_ASSIGNMENTS')) {
    const item = {
      id: inputParams[0] || `ASN-${Date.now()}`,
      teacher_id: inputParams[1],
      teacher_name: inputParams[2],
      teacher_id_2: inputParams[3] || null,
      teacher_name_2: inputParams[4] || null,
      level_id: inputParams[5] || inputParams[6],
      level_name: inputParams[6] || inputParams[5],
      subject_id: inputParams[7] || inputParams[8],
      subject_name: inputParams[8] || inputParams[7],
      academic_year: inputParams[9] || inputParams[7] || 2026
    };
    fallbackStore.teacher_assignments.push(item);
    return { rows: [item], rowCount: 1 };
  }

  if (upperSql.includes('UPDATE TEACHER_ASSIGNMENTS')) {
    const id = inputParams[inputParams.length - 1];
    fallbackStore.teacher_assignments.forEach(a => {
      if (String(a.id) === String(id)) {
        a.teacher_id = inputParams[0];
        a.teacher_name = inputParams[1];
        a.teacher_id_2 = inputParams[2] || null;
        a.teacher_name_2 = inputParams[3] || null;
        a.level_id = inputParams[4];
        a.level_name = inputParams[5];
        a.subject_id = inputParams[6];
        a.subject_name = inputParams[7];
        a.academic_year = inputParams[8] || 2026;
      }
    });
    return { rows: [], rowCount: 1 };
  }

  if (upperSql.includes('DELETE FROM TEACHER_ASSIGNMENTS')) {
    const id = inputParams[0];
    fallbackStore.teacher_assignments = fallbackStore.teacher_assignments.filter(a => String(a.id) !== String(id));
    return { rows: [], rowCount: 1 };
  }

  if (upperSql.includes('FROM TEACHER_ASSIGNMENTS')) {
    if (upperSql.includes('COUNT(')) return { rows: [{ total: fallbackStore.teacher_assignments.length }], rowCount: 1 };
    return { rows: fallbackStore.teacher_assignments, rowCount: fallbackStore.teacher_assignments.length };
  }

  if (upperSql.includes('FROM COURSES')) {
    let coursesList = (fallbackStore as any).courses || [];
    const getStorePath = () => {
      const p1 = path.join(process.cwd(), 'local_store.json');
      if (fs.existsSync(p1)) return p1;
      const p2 = path.join(process.cwd(), 'backend', 'local_store.json');
      if (fs.existsSync(p2)) return p2;
      const p3 = path.resolve(__dirname, '../local_store.json');
      if (fs.existsSync(p3)) return p3;
      return p1;
    };
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.courses)) {
          coursesList = store.courses;
          (fallbackStore as any).courses = store.courses;
        }
      } catch (_) {}
    }
    if (inputParams.length >= 1 && (upperSql.includes('WHERE NAME') || upperSql.includes('WHERE ID') || upperSql.includes('WHERE'))) {
      const param1 = String(inputParams[0] || '').toLowerCase();
      const param2 = String(inputParams[1] || param1).toLowerCase();
      const filtered = coursesList.filter((c: any) => 
        (c.name && c.name.toLowerCase() === param1) ||
        (c.id && c.id.toLowerCase() === param1) ||
        (c.name && c.name.toLowerCase() === param2) ||
        (c.id && c.id.toLowerCase() === param2)
      );
      return { rows: filtered, rowCount: filtered.length };
    }
    return { rows: coursesList, rowCount: coursesList.length };
  }

  if (upperSql.includes('INSERT INTO COURSES')) {
    const id = inputParams[0];
    const name = inputParams[1];
    const teacher = inputParams[2];
    const capacity = inputParams[3];
    const item = { id, name, teacher, capacity };

    if (!(fallbackStore as any).courses) (fallbackStore as any).courses = [];
    const existingIdx = (fallbackStore as any).courses.findIndex((c: any) => c.name === name || c.id === id);
    if (existingIdx !== -1) {
      (fallbackStore as any).courses[existingIdx] = item;
    } else {
      (fallbackStore as any).courses.push(item);
    }

    const getStorePath = () => {
      const p1 = path.join(process.cwd(), 'local_store.json');
      if (fs.existsSync(p1)) return p1;
      const p2 = path.join(process.cwd(), 'backend', 'local_store.json');
      if (fs.existsSync(p2)) return p2;
      const p3 = path.resolve(__dirname, '../local_store.json');
      if (fs.existsSync(p3)) return p3;
      return p1;
    };
    try {
      const storePath = getStorePath();
      let store: any = { courses: [] };
      if (fs.existsSync(storePath)) {
        store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      }
      if (!store.courses) store.courses = [];
      const idx = store.courses.findIndex((c: any) => c.name === name || c.id === id);
      if (idx !== -1) store.courses[idx] = item;
      else store.courses.push(item);
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (_) {}

    return { rows: [item], rowCount: 1 };
  }

  if (upperSql.includes('UPDATE COURSES')) {
    const teacher = inputParams[0];
    const capacity = inputParams[1];
    const name = inputParams[2];
    const id = inputParams[3] || name;
    const item = { id, name, teacher, capacity };

    if (!(fallbackStore as any).courses) (fallbackStore as any).courses = [];
    const existingIdx = (fallbackStore as any).courses.findIndex((c: any) => c.name === name || c.id === id);
    if (existingIdx !== -1) {
      (fallbackStore as any).courses[existingIdx] = item;
    } else {
      (fallbackStore as any).courses.push(item);
    }

    const getStorePath = () => {
      const p1 = path.join(process.cwd(), 'local_store.json');
      if (fs.existsSync(p1)) return p1;
      const p2 = path.join(process.cwd(), 'backend', 'local_store.json');
      if (fs.existsSync(p2)) return p2;
      const p3 = path.resolve(__dirname, '../local_store.json');
      if (fs.existsSync(p3)) return p3;
      return p1;
    };
    try {
      const storePath = getStorePath();
      let store: any = { courses: [] };
      if (fs.existsSync(storePath)) {
        store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      }
      if (!store.courses) store.courses = [];
      const idx = store.courses.findIndex((c: any) => c.name === name || c.id === id);
      if (idx !== -1) store.courses[idx] = item;
      else store.courses.push(item);
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (_) {}

    return { rows: [item], rowCount: 1 };
  }

  if (upperSql.includes('FROM SUBJECTS')) {
    return { rows: fallbackStore.subjects, rowCount: fallbackStore.subjects.length };
  }

  if (upperSql.includes('INSERT INTO SUBJECTS')) {
    const item = { id: inputParams[0] || `${Date.now()}`, name: inputParams[1] };
    fallbackStore.subjects.push(item);
    return { rows: [item], rowCount: 1 };
  }

  if (upperSql.includes('UPDATE SUBJECTS')) {
    const name = inputParams[0];
    const id = inputParams[1];
    fallbackStore.subjects.forEach(s => {
      if (String(s.id) === String(id)) s.name = name;
    });
    return { rows: [], rowCount: 1 };
  }

  if (upperSql.includes('DELETE FROM SUBJECTS')) {
    const id = inputParams[0];
    fallbackStore.subjects = fallbackStore.subjects.filter(s => String(s.id) !== String(id));
    return { rows: [], rowCount: 1 };
  }

  if (upperSql.includes('INSERT INTO AUDIT_LOGS')) {
    fallbackStore.audit_logs.push({ id: `AUD-${Date.now()}`, created_at: new Date() });
    return { rows: [], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

// Helper universal de consulta SQL adaptable a PostgreSQL y MySQL
export const query = async (text: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> => {
  try {
    if (isMysql && mysqlPool) {
      // Adaptar sintaxis de PostgreSQL ($1, $2) a MySQL (?)
      const paramIndices: number[] = [];
      let mysqlText = text.replace(/\$(\d+)/g, (_, idx) => {
        paramIndices.push(parseInt(idx, 10));
        return '?';
      });
      mysqlText = mysqlText.replace(/\bILIKE\b/gi, 'LIKE');
      if (/ON\s+CONFLICT\s*(?:\([^)]+\))?\s*DO\s+NOTHING/i.test(mysqlText)) {
        mysqlText = mysqlText.replace(/\bINSERT\s+INTO\b/gi, 'INSERT IGNORE INTO');
        mysqlText = mysqlText.replace(/ON\s+CONFLICT\s*(?:\([^)]+\))?\s*DO\s+NOTHING/gis, '');
      }
      mysqlText = mysqlText.replace(/ON\s+CONFLICT\s*\([^)]+\)\s*DO\s+UPDATE\s+SET/gis, 'ON DUPLICATE KEY UPDATE');
      mysqlText = mysqlText.replace(/EXCLUDED\.(\w+)/gi, 'VALUES($1)');
      mysqlText = mysqlText.replace(/WITH TIME ZONE/gi, '');
      mysqlText = mysqlText.replace(/INTERVAL '(\d+)\s*days?'/gi, 'INTERVAL $1 DAY');
      mysqlText = mysqlText.replace(/INTERVAL '(\d+)\s*minutes?'/gi, 'INTERVAL $1 MINUTE');
      mysqlText = mysqlText.replace(/\(CURRENT_DATE - due_date\)/gi, 'DATEDIFF(CURRENT_DATE, due_date)');
      mysqlText = mysqlText.replace(/\(due_date - CURRENT_DATE\)/gi, 'DATEDIFF(due_date, CURRENT_DATE)');
      mysqlText = mysqlText.replace(/\(desc_grado \|\| ' ' \|\| letra_curso\)/g, "CONCAT(desc_grado, ' ', letra_curso)");
      mysqlText = mysqlText.replace(/\(desc_grado \|\| '° ' \|\| letra_curso\)/g, "CONCAT(desc_grado, '° ', letra_curso)");
      mysqlText = mysqlText.replace(/\(desc_grado \|\| ' ' \|\| letra_curso \|\| '°'\)/g, "CONCAT(desc_grado, ' ', letra_curso, '°')");
      mysqlText = mysqlText.replace(/\bgen_random_uuid\(\)/gi, 'UUID()');
      mysqlText = mysqlText.replace(/\b(anno|entry_year)\b/gi, 'academic_year');

      const inputParams = params || [];
      const cleanParams = paramIndices.length > 0
        ? paramIndices.map(i => {
            const val = inputParams[i - 1];
            return val === undefined ? null : val;
          })
        : inputParams.map(p => (p === undefined ? null : p));

      const [rows]: any = await mysqlPool.execute(mysqlText, cleanParams);
      const rowsArray = Array.isArray(rows) ? rows : [];
      return { rows: rowsArray, rowCount: rowsArray.length };
    } else if (pgPool) {
      let pgText = text;
      if (/\bINSERT\s+IGNORE\s+INTO\b/i.test(pgText)) {
        pgText = pgText.replace(/\bINSERT\s+IGNORE\s+INTO\b/gi, 'INSERT INTO');
        if (!/ON\s+CONFLICT/i.test(pgText)) {
          pgText = pgText.trim().replace(/;$/, '') + ' ON CONFLICT DO NOTHING';
        }
      }
      const res = await pgPool.query(pgText, params);
      return { rows: res.rows, rowCount: res.rowCount || 0 };
    }
    throw new Error('Base de datos no conectada');
  } catch (err: any) {
    const errCode = String(err.code || '');
    if (errCode === 'ER_DUP_FIELDNAME' || errCode === 'ER_TABLE_EXISTS_ERROR' || errCode === '42701') {
      return { rows: [], rowCount: 0 };
    }
    const upperText = text.toUpperCase();
    const isStudentQuery = upperText.includes('STUDENTS');
    const isConnectionError = ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'ER_ACCESS_DENIED_ERROR', 'ENETUNREACH'].includes(errCode) || String(err.message || '').includes('connect');

    if (isStudentQuery && (isConnectionError || upperText.trim().startsWith('SELECT'))) {
      console.error(`⛔ BLOQUEO ESTRICTO: Base de datos no disponible (${errCode || err.message}). Consulta de estudiantes rechazada.`);
      throw new Error(`Base de datos desconectada (${errCode || err.message}). Acceso a nómina de estudiantes bloqueado.`);
    }
    console.warn(`⚠️ BD offline o error (${err.code || err.message}). Consulta: ${text.substring(0, 60)}...`);
    return executeFallbackQuery(text, params);
  }
};

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    if (isMysql && mysqlPool) {
      const conn = await mysqlPool.getConnection();
      conn.release();
      return true;
    } else if (pgPool) {
      const client = await pgPool.connect();
      client.release();
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const pool = pgPool;

