import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { query, isMysql, checkDbConnection } from '../config/db';
import { authMiddleware, checkRoles, logAudit } from '../middleware/auth';
import { sendPasswordResetEmail, sendTeacherWelcomeEmail, sendCourseBroadcastEmail } from '../utils/mailer';
import mineducReportsRouter from './mineducReports';

const router = Router();

// Endpoint de diagnóstico del estado de la base de datos
router.get('/db-status', async (_req: Request, res: Response) => {
  try {
    const isConnected = await checkDbConnection();
    if (isConnected) {
      return res.json({ connected: true, engine: isMysql ? 'MySQL' : 'PostgreSQL' });
    }
    return res.status(503).json({ connected: false, error: 'Base de datos desconectada o no disponible' });
  } catch (err: any) {
    return res.status(503).json({ connected: false, error: err.message });
  }
});

const uploadMemory = multer({ limits: { fileSize: 30 * 1024 * 1024 } });
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_ltp_v2_2026';
const DRIVE_AUTH_TOKEN = process.env.DRIVE_AUTH_TOKEN || 'LTP_SEC_2026_LEGAL_VAULT_KEY';

const getStorePath = () => {
  const p1 = path.join(process.cwd(), 'local_store.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), 'backend', 'local_store.json');
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(__dirname, '../local_store.json');
  if (fs.existsSync(p3)) return p3;
  return p1;
};

// Garantizar existencia de tablas dinámicas para notificaciones y recuperación de claves
async function ensureTablesExist() {
  try {
    if (isMysql) {
      await query(`
        CREATE TABLE IF NOT EXISTS courses (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          teacher VARCHAR(255) DEFAULT 'Sin Asignar',
          capacity INT DEFAULT 45,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => {});
      await query(`
        CREATE TABLE IF NOT EXISTS secure_file_vault (
          id VARCHAR(255) PRIMARY KEY,
          file_id VARCHAR(255) NOT NULL,
          storage_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          entity_type VARCHAR(100) DEFAULT 'general',
          entity_id VARCHAR(255),
          mime_type VARCHAR(100),
          file_url TEXT,
          file_size INT DEFAULT 0,
          uploaded_by VARCHAR(255),
          is_anonymized TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => {});
      const alterCols = [
        'ALTER TABLE users ADD COLUMN phone VARCHAR(255)',
        'ALTER TABLE users ADD COLUMN email VARCHAR(255)',
        'ALTER TABLE users ADD COLUMN roles TEXT',
        'ALTER TABLE users ADD COLUMN staff_type VARCHAR(100)',
        'ALTER TABLE users ADD COLUMN job_function VARCHAR(150)',
        'ALTER TABLE staff_profiles ADD COLUMN roles TEXT',
        'ALTER TABLE students ADD COLUMN profesor_jefe VARCHAR(255)',
        'ALTER TABLE students ADD COLUMN enrollment_number VARCHAR(255)',
        'ALTER TABLE students ADD COLUMN list_number INT',
        'ALTER TABLE students ADD COLUMN is_retired TINYINT(1) DEFAULT 0',
        'ALTER TABLE students ADD COLUMN withdrawal_date VARCHAR(255)',
        'ALTER TABLE students ADD COLUMN enrolled_by_name VARCHAR(255)',
        'ALTER TABLE students ADD COLUMN enrolled_by_run VARCHAR(255)',
        'ALTER TABLE students ADD COLUMN enrolled_by_role VARCHAR(255)',
        'ALTER TABLE interview_participants ADD COLUMN user_run VARCHAR(50)',
        'ALTER TABLE interview_participants ADD COLUMN requested_at DATETIME',
        'ALTER TABLE interview_participants ADD COLUMN request_deadline DATETIME',
        'ALTER TABLE interview_participants ADD COLUMN time_limit_minutes INT DEFAULT 30',
        'ALTER TABLE system_notifications ADD COLUMN target_run VARCHAR(50)',
        'ALTER TABLE system_notifications ADD COLUMN reference_id VARCHAR(100)'
      ];
      for (const sql of alterCols) {
        await query(sql).catch(() => {});
      }
      const adminRun = process.env.ADMIN_RUN;
      if (adminRun) {
        await query(`
          INSERT INTO users (id, run, name, email, password_hash, role, temp_password)
          VALUES ($1, $2, $3, $4, $5, 'Admin', 0)
          ON DUPLICATE KEY UPDATE name = VALUES(name);
        `, [
          `USR-ADMIN-${adminRun.replace(/\./g, '')}`,
          adminRun,
          process.env.ADMIN_NAME || 'Administrador Principal',
          process.env.ADMIN_EMAIL || 'admin@liceo.cl',
          process.env.ADMIN_PASSWORD_HASH || '$2a$10$oKDX.qJqcMtS/4hr6IA.5uwpr8lZfpRDkUl11ZpXMd63Pk3OltpzG'
        ]).catch(() => {});
      }
      await query(`
        CREATE TABLE IF NOT EXISTS pedagogical_trips (
          id VARCHAR(255) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          trip_date DATE NOT NULL,
          time_range VARCHAR(255),
          departure_time VARCHAR(50),
          return_time VARCHAR(50),
          responsible_teacher VARCHAR(255),
          issue_date DATE,
          city VARCHAR(100) DEFAULT 'Campanario',
          institution_name VARCHAR(255) DEFAULT 'Liceo Técnico Profesional',
          institution_sub VARCHAR(255) DEFAULT 'Campanario / Yungay',
          director_name VARCHAR(255) DEFAULT 'VICTOR HUGO BENITEZ MONSALVES',
          description TEXT,
          academic_year INT DEFAULT 2026,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `).catch(() => {});
      await query(`
        CREATE TABLE IF NOT EXISTS pedagogical_trip_students (
          id VARCHAR(255) PRIMARY KEY,
          trip_id VARCHAR(255) NOT NULL,
          student_id VARCHAR(255) NOT NULL,
          student_run VARCHAR(50),
          student_name VARCHAR(255),
          course_name VARCHAR(100),
          authorized TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_trip_student (trip_id, student_id)
        );
      `).catch(() => {});
      return;
    }
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_type TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS job_function TEXT;
      ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS roles TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS profesor_jefe TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_number TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS list_number INTEGER;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS is_retired BOOLEAN DEFAULT FALSE;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS withdrawal_date TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS enrolled_by_name TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS enrolled_by_run TEXT;
      ALTER TABLE students ADD COLUMN IF NOT EXISTS enrolled_by_role TEXT;

      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        teacher TEXT DEFAULT 'Sin Asignar',
        capacity INTEGER DEFAULT 45,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        temp_password_hash TEXT NOT NULL,
        temp_password_plain TEXT,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

      CREATE TABLE IF NOT EXISTS system_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        target_role TEXT DEFAULT 'Admin',
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        target_run TEXT,
        reference_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_system_notifications_target ON system_notifications(target_role, is_read);

      CREATE TABLE IF NOT EXISTS pedagogical_trips (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        destination TEXT NOT NULL,
        trip_date DATE NOT NULL,
        time_range TEXT,
        departure_time TEXT,
        return_time TEXT,
        responsible_teacher TEXT,
        issue_date DATE,
        city TEXT DEFAULT 'Campanario',
        institution_name TEXT DEFAULT 'Liceo Técnico Profesional',
        institution_sub TEXT DEFAULT 'Campanario / Yungay',
        director_name TEXT DEFAULT 'VICTOR HUGO BENITEZ MONSALVES',
        description TEXT,
        academic_year INTEGER DEFAULT 2026,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pedagogical_trip_students (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL REFERENCES pedagogical_trips(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL,
        student_run TEXT,
        student_name TEXT,
        course_name TEXT,
        authorized INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_trip_student UNIQUE (trip_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS student_passes (
        id TEXT PRIMARY KEY,
        folio SERIAL,
        student_id TEXT,
        student_run TEXT,
        student_name TEXT,
        course_name TEXT,
        pass_type TEXT,
        pass_date DATE,
        pass_time TIME,
        reason TEXT,
        status TEXT DEFAULT 'Injustificado',
        justification_detail TEXT,
        inspector_name TEXT,
        inspector_id TEXT,
        academic_year INTEGER DEFAULT 2026,
        period TEXT DEFAULT '1er Semestre',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('⚠️ Error al verificar tablas y columnas en la base de datos:', err);
  }
}
ensureTablesExist();

// -----------------------------------------------------------------------------
// 1. STATS & BUSCADOR GLOBAL (CAMPANARIO 4.1 & LICEO PRO 3.1)
// -----------------------------------------------------------------------------
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const studentsRes = await query("SELECT COUNT(*) as total, SUM(CASE WHEN (is_retired = 0 OR is_retired IS NULL) AND status NOT IN ('Retirado', 'Withdrawn') THEN 1 ELSE 0 END) as vigentes, SUM(CASE WHEN is_retired = 1 OR status IN ('Retirado', 'Withdrawn') THEN 1 ELSE 0 END) as retirados FROM students");
    const interviewsRes = await query('SELECT COUNT(*) as total FROM interviews');
    const usersRes = await query('SELECT COUNT(*) as total FROM users');
    const assignmentsRes = await query('SELECT COUNT(*) as total FROM teacher_assignments');

    const stats = studentsRes.rows[0] || {};
    res.json({
      totalEstudiantes: parseInt(stats.total || '0', 10),
      vigentes: parseInt(stats.vigentes || '0', 10),
      retirados: parseInt(stats.retirados || '0', 10),
      totalEntrevistas: parseInt(interviewsRes.rows[0]?.total || '0', 10),
      totalUsuarios: parseInt(usersRes.rows[0]?.total || '0', 10),
      totalAsignaciones: parseInt(assignmentsRes.rows[0]?.total || '0', 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar estadísticas.' });
  }
});

router.get('/personas/buscar', authMiddleware, async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const term = `%${q}%`;
    const result = await query(
      `SELECT run as "RUT", full_name as "Nombres", 'Estudiante' as "Cargo" FROM students WHERE full_name ILIKE $1 OR run ILIKE $1
       UNION
       SELECT run as "RUT", name as "Nombres", role as "Cargo" FROM users WHERE name ILIKE $1 OR run ILIKE $1`,
      [term]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error en búsqueda global.' });
  }
});

// -----------------------------------------------------------------------------
// 2. AUTENTICACIÓN Y MI CUENTA (LICEO PRO 1.1 & 3.8)
// -----------------------------------------------------------------------------
const loginHandler = async (req: Request, res: Response) => {
  const { username, run, password } = req.body;
  const rawIdentifier = String(username || run || '').trim();
  const cleanRun = rawIdentifier.replace(/\./g, '').trim();
  const passStr = String(password !== undefined && password !== null ? password : '').trim();

  if (!rawIdentifier || !passStr) {
    return res.status(400).json({ error: 'Proporcione usuario/RUT y contraseña.' });
  }

  try {
    const result = await query(
      'SELECT * FROM users WHERE REPLACE(run, \'.\', \'\') = $1 OR run = $2 OR id = $2 OR email = $2',
      [cleanRun, rawIdentifier]
    ).catch(() => ({ rows: [] }));

    let userRows = result.rows || [];

    // Fallback a local_store.json si la BD no retorna filas
    if (userRows.length === 0) {
      const storePath = getStorePath();
      if (fs.existsSync(storePath)) {
        try {
          const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
          if (Array.isArray(store.users)) {
            userRows = store.users.filter((u: any) => {
              const uRun = String(u.run || '').replace(/\./g, '').trim();
              return uRun === cleanRun || u.run === rawIdentifier || u.id === rawIdentifier || u.email === rawIdentifier;
            });
          }
        } catch (_) {}
      }
    }

    if (userRows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const matchedUser = userRows.find((u: any) => {
      let isHashMatch = false;
      try {
        if (u.password_hash) {
          isHashMatch = bcrypt.compareSync(passStr, u.password_hash);
        }
      } catch (err) {
        console.error('Bcrypt compare error:', err);
      }
      const plain = String(u.password_plain || '').trim();
      const isPlainMatch = Boolean(plain && (passStr === plain ||
        passStr.toLowerCase() === `admin${plain}`.toLowerCase() ||
        `admin${passStr}`.toLowerCase() === plain.toLowerCase()));
      return isHashMatch || isPlainMatch;
    });

    if (!matchedUser) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const normalizeRole = (r: string): string => {
      const trimmed = (r || '').trim();
      const lower = trimmed.toLowerCase();
      if (lower === 'asistente de la educación' || lower === 'asistente de la educacion') return 'Asistente';
      if (lower === 'profesor') return 'Docente';
      if (lower === 'alumno') return 'Estudiante';
      if (lower === 'directivo') return 'Director';
      return trimmed;
    };

    const user = matchedUser;
    const userRolesSet = new Set<string>();

    result.rows.forEach(u => {
      if (u.role) userRolesSet.add(normalizeRole(u.role));
    });

    if (user.role === 'Admin') {
      userRolesSet.add('Admin');
      userRolesSet.add('Docente');
      userRolesSet.add('Administrativo');
    }

    try {
      const studentCheck = await query(
        `SELECT run, guardian_run, guardian_sec_run, father_run, mother_run 
         FROM students 
         WHERE REPLACE(run, '.', '') = $1 
            OR REPLACE(guardian_run, '.', '') = $1 
            OR REPLACE(guardian_sec_run, '.', '') = $1 
            OR REPLACE(father_run, '.', '') = $1 
            OR REPLACE(mother_run, '.', '') = $1`,
        [cleanRun]
      );
      studentCheck.rows.forEach((s: any) => {
        const cleanStuRun = (s.run || '').replace(/\./g, '');
        if (cleanStuRun === cleanRun) {
          userRolesSet.add('Estudiante');
        } else {
          userRolesSet.add('Apoderado');
        }
      });
    } catch (_) { }

    if (user.roles) {
      try {
        const parsed = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles;
        if (Array.isArray(parsed)) {
          parsed.forEach((r: any) => { if (r) userRolesSet.add(normalizeRole(String(r))); });
        }
      } catch (_) {
        String(user.roles).split(',').forEach((r: string) => { if (r) userRolesSet.add(normalizeRole(r)); });
      }
    }

    const rolesList = Array.from(userRolesSet);

    const token = jwt.sign(
      { id: user.id, run: user.run, name: user.name, role: user.role, roles: rolesList },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await logAudit(req, 'LOGIN_SUCCESS', `Usuario ${user.name} (${user.role}) inició sesión`);

    res.json({
      success: true,
      perfil: user.role,
      token,
      roles: rolesList,
      user: {
        id: user.id,
        username: user.id,
        run: user.run,
        name: user.name,
        email: user.email,
        perfil: user.role,
        role: user.role,
        tempPassword: user.temp_password,
        roles: rolesList
      }
    });
  } catch (err) {
    console.error('❌ Error en loginHandler:', err);
    res.status(500).json({ error: 'Error en la autenticación.' });
  }
};

router.post('/auth/login', loginHandler);

// -----------------------------------------------------------------------------
// CAMBIO DINÁMICO DE ROL ACTIVO (MULTI-PERFIL)
// -----------------------------------------------------------------------------
router.post('/auth/switch-role', authMiddleware, async (req: Request, res: Response) => {
  const { newRole } = req.body;
  if (!newRole) {
    return res.status(400).json({ error: 'Debe especificar el nuevo rol activo.' });
  }

  const userId = req.user?.id;
  const userRun = req.user?.run;
  const cleanRun = String(userRun || '').replace(/\./g, '').trim();
  const isSuperAdmin = req.user?.role === 'Admin' || (Array.isArray((req.user as any)?.roles) && (req.user as any)?.roles.includes('Admin'));

  try {
    const userRes = await query(
      'SELECT * FROM users WHERE id = $1 OR REPLACE(run, \'.\', \'\') = $2 OR run = $3',
      [userId, cleanRun, userRun]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const dbUser = userRes.rows[0];
    const userRolesSet = new Set<string>();
    if (dbUser.role) userRolesSet.add(dbUser.role);

    if (dbUser.roles) {
      try {
        const parsed = typeof dbUser.roles === 'string' ? JSON.parse(dbUser.roles) : dbUser.roles;
        if (Array.isArray(parsed)) parsed.forEach((r: any) => userRolesSet.add(String(r).trim()));
      } catch (_) {
        String(dbUser.roles).split(',').forEach((r: string) => userRolesSet.add(r.trim()));
      }
    }

    if (isSuperAdmin || dbUser.role === 'Admin') {
      ['Admin', 'Director', 'Docente', 'Entrevistador', 'Asistente', 'Administrativo', 'Profesionales', 'Apoderado', 'Visita'].forEach(r => userRolesSet.add(r));
    }

    if (!userRolesSet.has(newRole) && !isSuperAdmin) {
      return res.status(403).json({ error: `No tienes asignado el perfil "${newRole}".` });
    }

    const rolesList = Array.from(userRolesSet);
    const newToken = jwt.sign(
      { id: dbUser.id, run: dbUser.run, name: dbUser.name, role: newRole, roles: rolesList },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await logAudit(req, 'SWITCH_ROLE', `Usuario ${dbUser.name} alternó su rol activo a "${newRole}"`);

    res.json({
      success: true,
      token: newToken,
      role: newRole,
      perfil: newRole,
      roles: rolesList,
      user: {
        id: dbUser.id,
        username: dbUser.id,
        run: dbUser.run,
        name: dbUser.name,
        email: dbUser.email,
        role: newRole,
        perfil: newRole,
        roles: rolesList
      }
    });
  } catch (err: any) {
    console.error('❌ Error en /auth/switch-role:', err);
    res.status(500).json({ error: 'Error al cambiar de perfil activo.' });
  }
});

// -----------------------------------------------------------------------------
// ASIGNACIÓN DOCENTE DE ASIGNATURAS Y NIVELES (6.4 ASIGNACIÓN DOCENTE - 2 DOCENTES PERMITIDOS)
// -----------------------------------------------------------------------------
// Asegurar que la tabla teacher_assignments tenga las columnas para co-docencia
(async () => {
  try {
    await query('ALTER TABLE teacher_assignments ADD COLUMN teacher_id_2 VARCHAR(100) NULL');
  } catch (_) { }
  try {
    await query('ALTER TABLE teacher_assignments ADD COLUMN teacher_name_2 VARCHAR(255) NULL');
  } catch (_) { }
})();

router.get('/assignments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM teacher_assignments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener asignaciones docentes.' });
  }
});

router.post('/assignments', authMiddleware, async (req: Request, res: Response) => {
  const { teacherId, teacherName, teacherId2, teacherName2, levelId, levelName, subjectId, subjectName, academicYear } = req.body;
  const tName = String(teacherName || teacherId || '').trim();
  const tName2 = String(teacherName2 || teacherId2 || '').trim();
  const lName = String(levelName || levelId || '').trim();
  const sName = String(subjectName || subjectId || '').trim();

  if (!tName || !lName || !sName) {
    return res.status(400).json({ error: 'Profesor, Curso y Asignatura son obligatorios.' });
  }

  try {
    const year = academicYear || 2026;

    const userRes = await query(
      'SELECT id FROM users WHERE id = $1 OR name = $2 OR email = $2 OR run = $2',
      [String(teacherId || ''), tName]
    );
    const validTeacherId = userRes.rows[0] ? userRes.rows[0].id : null;

    let validTeacherId2 = null;
    let finalTName2: string | null = null;
    if (tName2 && tName2 !== 'Sin Co-Docente' && tName2 !== 'Ninguno' && tName2 !== '🚫 Ninguno / Sin Co-Docente') {
      finalTName2 = tName2;
      const userRes2 = await query(
        'SELECT id FROM users WHERE id = $1 OR name = $2 OR email = $2 OR run = $2',
        [String(teacherId2 || ''), tName2]
      );
      validTeacherId2 = userRes2.rows[0] ? userRes2.rows[0].id : null;
    }

    const id = `ASN-${Date.now()}`;

    // Intentar insertar con teacher_name_2 si la columna existe en el esquema
    try {
      await query(
        `INSERT INTO teacher_assignments (id, teacher_id, teacher_name, teacher_id_2, teacher_name_2, level_id, level_name, subject_id, subject_name, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, validTeacherId, tName, validTeacherId2, finalTName2, String(levelId || lName), lName, String(subjectId || sName), sName, year]
      );
    } catch (_) {
      // Fallback para esquemas legacy sin teacher_name_2
      await query(
        `INSERT INTO teacher_assignments (id, teacher_id, teacher_name, level_id, level_name, subject_id, subject_name, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, validTeacherId, finalTName2 ? `${tName} / ${finalTName2}` : tName, String(levelId || lName), lName, String(subjectId || sName), sName, year]
      );
    }

    await logAudit(req, 'CREATE_ASSIGNMENT', `Asignado profesor "${tName}" ${finalTName2 ? `y co-docente "${finalTName2}"` : ''} a asignatura "${sName}" en curso "${lName}"`);

    res.json({
      success: true,
      assignment: {
        id,
        teacher_id: validTeacherId,
        teacher_name: tName,
        teacher_id_2: validTeacherId2,
        teacher_name_2: finalTName2,
        level_id: levelId || lName,
        level_name: lName,
        subject_id: subjectId || sName,
        subject_name: sName,
        academic_year: year
      }
    });
  } catch (err: any) {
    console.error('❌ Error al crear asignación docente:', err.message);
    res.status(500).json({ error: 'No se pudo guardar la asignación docente.' });
  }
});

router.put('/assignments/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { teacherId, teacherName, teacherId2, teacherName2, levelId, levelName, subjectId, subjectName, academicYear } = req.body;
  const tName = String(teacherName || teacherId || '').trim();
  const tName2 = String(teacherName2 || teacherId2 || '').trim();
  const lName = String(levelName || levelId || '').trim();
  const sName = String(subjectName || subjectId || '').trim();

  if (!tName || !lName || !sName) {
    return res.status(400).json({ error: 'Profesor, Curso y Asignatura son obligatorios.' });
  }

  try {
    const year = academicYear || 2026;

    const userRes = await query(
      'SELECT id FROM users WHERE id = $1 OR name = $2 OR email = $2 OR run = $2',
      [String(teacherId || ''), tName]
    );
    const validTeacherId = userRes.rows[0] ? userRes.rows[0].id : null;

    let validTeacherId2 = null;
    let finalTName2: string | null = null;
    if (tName2 && tName2 !== 'Sin Co-Docente' && tName2 !== 'Ninguno' && tName2 !== '🚫 Ninguno / Sin Co-Docente') {
      finalTName2 = tName2;
      const userRes2 = await query(
        'SELECT id FROM users WHERE id = $1 OR name = $2 OR email = $2 OR run = $2',
        [String(teacherId2 || ''), tName2]
      );
      validTeacherId2 = userRes2.rows[0] ? userRes2.rows[0].id : null;
    }

    try {
      await query(
        `UPDATE teacher_assignments
         SET teacher_id = $1, teacher_name = $2, teacher_id_2 = $3, teacher_name_2 = $4,
             level_id = $5, level_name = $6, subject_id = $7, subject_name = $8, academic_year = $9
         WHERE id = $10`,
        [validTeacherId, tName, validTeacherId2, finalTName2, String(levelId || lName), lName, String(subjectId || sName), sName, year, id]
      );
    } catch (_) {
      await query(
        `UPDATE teacher_assignments
         SET teacher_id = $1, teacher_name = $2, level_id = $3, level_name = $4, subject_id = $5, subject_name = $6, academic_year = $7
         WHERE id = $8`,
        [validTeacherId, finalTName2 ? `${tName} / ${finalTName2}` : tName, String(levelId || lName), lName, String(subjectId || sName), sName, year, id]
      );
    }

    await logAudit(req, 'UPDATE_ASSIGNMENT', `Actualizada asignación docente ID "${id}" (${sName} en ${lName})`);

    res.json({
      success: true,
      assignment: {
        id,
        teacher_id: validTeacherId,
        teacher_name: tName,
        teacher_id_2: validTeacherId2,
        teacher_name_2: finalTName2,
        level_id: levelId || lName,
        level_name: lName,
        subject_id: subjectId || sName,
        subject_name: sName,
        academic_year: year
      }
    });
  } catch (err: any) {
    console.error('❌ Error al actualizar asignación docente:', err.message);
    res.status(500).json({ error: 'No se pudo actualizar la asignación docente.' });
  }
});

router.delete('/assignments/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM teacher_assignments WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_ASSIGNMENT', `Eliminada asignación docente ID "${id}"`);
    res.json({ success: true, message: 'Asignación eliminada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la asignación.' });
  }
});

// -----------------------------------------------------------------------------
// ASIGNATURAS INSTITUCIONALES (6.2 EDICIÓN DE ASIGNATURAS)
// -----------------------------------------------------------------------------
router.get('/subjects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM subjects ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar asignaturas.' });
  }
});

router.post('/subjects', authMiddleware, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la asignatura es requerido.' });
  }
  try {
    const id = `SUB-${Date.now()}`;
    await query('INSERT INTO subjects (id, name) VALUES ($1, $2)', [id, name.trim()]);
    await logAudit(req, 'CREATE_SUBJECT', `Creada asignatura "${name}"`);
    res.json({ success: true, subject: { id, name: name.trim() } });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear asignatura.' });
  }
});

router.put('/subjects/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la asignatura es requerido.' });
  }
  try {
    await query('UPDATE subjects SET name = $1 WHERE id = $2', [name.trim(), id]);
    await logAudit(req, 'UPDATE_SUBJECT', `Actualizada asignatura ID "${id}" a "${name}"`);
    res.json({ success: true, message: 'Asignatura actualizada.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar asignatura.' });
  }
});

router.delete('/subjects/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM subjects WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_SUBJECT', `Eliminada asignatura ID "${id}"`);
    res.json({ success: true, message: 'Asignatura eliminada.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar asignatura.' });
  }
});


// -----------------------------------------------------------------------------
// RESTABLECIMIENTO AUTOSERVICIO DE CONTRASEÑA POR CORREO (TEMPORAL 20 MIN)
// -----------------------------------------------------------------------------
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  const { identifier } = req.body;
  const rawId = String(identifier || '').trim();
  const cleanRun = rawId.replace(/\./g, '').trim();

  if (!rawId) {
    return res.status(400).json({ error: 'Por favor ingrese su RUT o Correo Electrónico.' });
  }

  try {
    const userRes = await query(
      'SELECT * FROM users WHERE REPLACE(run, \'.\', \'\') = $1 OR run = $2 OR LOWER(email) = LOWER($2)',
      [cleanRun, rawId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún usuario registrado con el RUT o Correo proporcionado.' });
    }

    const user = userRes.rows[0];

    if (!user.email || !user.email.includes('@')) {
      return res.status(400).json({
        error: `El usuario ${user.name} (RUT: ${user.run}) no posee un correo electrónico válido registrado en el sistema. Por favor solicite el cambio al encargado de TI.`
      });
    }

    // Generar clave temporal criptográficamente segura (CSPRNG) de 6 caracteres alfanuméricos en mayúsculas
    const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const tempPassword = `TP-${randomCode}`;

    const salt = await bcrypt.genSalt(10);
    const tempHash = await bcrypt.hash(tempPassword, salt);
    const resetId = `RST-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

    // Expiración estricta a 20 minutos en BD
    await query(
      `INSERT INTO password_resets (id, user_id, temp_password_hash, temp_password_plain, expires_at, used)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL 20 MINUTE, 0)`,
      [resetId, user.id, tempHash, tempPassword]
    );

    // Enviar correo por SMTP con control de tiempo de espera (máx 6 seg)
    let mailResult: { success: boolean; simulated: boolean; error?: string } = { success: true, simulated: false };
    try {
      mailResult = await Promise.race([
        sendPasswordResetEmail(user.email, user.name, tempPassword, 20),
        new Promise<{ success: boolean; simulated: boolean; error?: string }>((resolve) =>
          setTimeout(() => resolve({ success: true, simulated: false, error: 'background' }), 6000)
        )
      ]);
    } catch (mErr: any) {
      console.error('⚠️ Error al enviar correo de restablecimiento:', mErr.message || mErr);
      mailResult = { success: false, simulated: false, error: mErr.message };
    }

    // Registrar Notificación de Sistema y Auditoría de forma no bloqueante
    try {
      const notifId = `NOTIF-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
      const notifMessage = `El usuario ${user.name} (RUT: ${user.run}) solicitó restablecimiento de contraseña. Se envió una clave temporal válida por 20 minutos a ${user.email}.`;

      await query(
        `INSERT INTO system_notifications (id, user_id, target_role, type, title, message)
         VALUES ($1, $2, 'Admin', 'PASSWORD_RESET_REQUEST', 'Solicitud de Clave Temporal', $3)`,
        [notifId, user.id, notifMessage]
      );

      await logAudit(req, 'PASSWORD_RESET_REQUEST', `Clave temporal solicitada para ${user.name} (${user.run}) enviada a ${user.email}`);
    } catch (notifErr) {
      console.warn('Aviso: error al registrar notificación o auditoría:', notifErr);
    }

    // Mascarizar email para respuesta al cliente
    const parts = user.email.split('@');
    const maskedEmail = parts[0].substring(0, Math.min(3, parts[0].length)) + '***@' + parts[1];

    res.json({
      success: true,
      message: `Se ha generado y enviado una clave temporal válida por 20 minutos al correo ${maskedEmail}.`,
      simulated: mailResult.simulated,
      email: maskedEmail
    });
  } catch (err: any) {
    console.error('Error en /auth/forgot-password:', err);
    res.status(500).json({ error: 'Error al procesar la solicitud de restablecimiento de contraseña.' });
  }
});

router.post('/auth/reset-password-with-temp', async (req: Request, res: Response) => {
  const { identifier, tempPassword, newPassword } = req.body;
  const rawId = String(identifier || '').trim();
  const cleanRun = rawId.replace(/\./g, '').trim();
  const rawTempPass = String(tempPassword || '').trim();
  // Normalizar: remover espacios y pasar a mayúsculas ("TP - XY1GX1" -> "TP-XY1GX1")
  const cleanTempPass = rawTempPass.replace(/\s+/g, '').toUpperCase();
  const codeOnly = cleanTempPass.replace(/^TP-?/, '');
  const newPassStr = String(newPassword || '').trim();

  if (!rawId || !cleanTempPass || !newPassStr) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios (RUT/Correo, Clave Temporal y Nueva Clave).' });
  }

  if (newPassStr.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const userRes = await query(
      'SELECT * FROM users WHERE REPLACE(run, \'.\', \'\') = $1 OR run = $2 OR LOWER(email) = LOWER($2)',
      [cleanRun, rawId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado con el RUT o correo indicado.' });
    }

    const user = userRes.rows[0];

    // Buscar TODOS los tokens vigentes de reseteo para el usuario (creados en los últimos 25 min y no usados)
    const resetRes = await query(
      `SELECT * FROM password_resets 
       WHERE user_id = $1 AND (used = 0 OR used = false)
         AND (expires_at > NOW() OR created_at >= NOW() - INTERVAL 25 MINUTE)
       ORDER BY created_at DESC`,
      [user.id]
    );

    if (resetRes.rows.length === 0) {
      return res.status(400).json({
        error: 'La contraseña temporal ha expirado (más de 20 minutos) o ya fue utilizada. Solicita una nueva en el Paso 1.'
      });
    }

    // Verificar si la clave temporal ingresada coincide con cualquiera de los tokens activos del usuario
    let matchedRecord: any = null;
    for (const record of resetRes.rows) {
      const recordPlain = String(record.temp_password_plain || '').replace(/\s+/g, '').toUpperCase();
      const recordCodeOnly = recordPlain.replace(/^TP-?/, '');

      const isPlainMatch = (cleanTempPass === recordPlain) || 
                           (cleanTempPass === recordCodeOnly) ||
                           (codeOnly.length >= 5 && codeOnly === recordCodeOnly);

      let isHashMatch = false;
      if (!isPlainMatch && record.temp_password_hash) {
        try {
          isHashMatch = await bcrypt.compare(cleanTempPass, record.temp_password_hash) ||
                        await bcrypt.compare(rawTempPass, record.temp_password_hash) ||
                        await bcrypt.compare(codeOnly, record.temp_password_hash);
        } catch (_) {}
      }

      if (isPlainMatch || isHashMatch) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      return res.status(400).json({ 
        error: 'La contraseña temporal ingresada es incorrecta o no coincide con los códigos vigentes.' 
      });
    }

    // Hash de la nueva contraseña definitiva
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassStr, salt);

    // Actualizar usuario en BD: nueva clave hash, password_plain y desactivar temp_password
    await query(
      'UPDATE users SET password_hash = $1, password_plain = $2, temp_password = 0 WHERE id = $3',
      [newHash, newPassStr, user.id]
    );

    // Marcar todos los tokens de reseteo de este usuario como utilizados
    await query('UPDATE password_resets SET used = 1 WHERE user_id = $1', [user.id]);

    // Generar Notificación y Auditoría
    try {
      const notifId = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const notifMessage = `El usuario ${user.name} (RUT: ${user.run}) ha restablecido y actualizado exitosamente su contraseña mediante autoservicio por correo.`;

      await query(
        `INSERT INTO system_notifications (id, user_id, target_role, type, title, message)
         VALUES ($1, $2, 'Admin', 'PASSWORD_RESET_SUCCESS', 'Contraseña Cambiada Exitosamente', $3)`,
        [notifId, user.id, notifMessage]
      );

      await logAudit(req, 'PASSWORD_RESET_SUCCESS', `Contraseña cambiada exitosamente mediante autoservicio por correo para ${user.name}`);
    } catch (auditErr) {
      console.warn('Aviso: error al registrar notificación de éxito de reseteo:', auditErr);
    }

    res.json({
      success: true,
      message: '¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión con tu nueva clave.'
    });
  } catch (err: any) {
    console.error('Error en /auth/reset-password-with-temp:', err);
    res.status(500).json({ error: 'Error al procesar el cambio de contraseña.' });
  }
});

// -----------------------------------------------------------------------------
// NOTIFICACIONES DEL SISTEMA PARA TI Y ADMINISTRACIÓN
// -----------------------------------------------------------------------------
router.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role || 'Admin';
    const userId = req.user?.id || '';
    const userRun = req.user?.run || '';
    const cleanRun = userRun.replace(/\./g, '').trim();

    const result = await query(
      `SELECT * FROM system_notifications 
       WHERE (target_role = $1 OR user_id = $2 OR (target_run IS NOT NULL AND (target_run = $3 OR target_run = $4)))
       ORDER BY created_at DESC LIMIT 50`,
      [userRole, userId, userRun, cleanRun]
    );

    const unreadCountRes = await query(
      `SELECT COUNT(*) as count FROM system_notifications 
       WHERE (target_role = $1 OR user_id = $2 OR (target_run IS NOT NULL AND (target_run = $3 OR target_run = $4))) AND is_read = false`,
      [userRole, userId, userRun, cleanRun]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCountRes.rows[0]?.count || '0', 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar notificaciones.' });
  }
});

router.put('/notifications/read-all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role || 'Admin';
    const userId = req.user?.id || '';
    const userRun = req.user?.run || '';
    const cleanRun = userRun.replace(/\./g, '').trim();

    await query(
      `UPDATE system_notifications SET is_read = true WHERE (target_role = $1 OR user_id = $2 OR (target_run IS NOT NULL AND (target_run = $3 OR target_run = $4)))`,
      [userRole, userId, userRun, cleanRun]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificaciones como leídas.' });
  }
});

router.put('/notifications/:id/read', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('UPDATE system_notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar notificación.' });
  }
});

// POST /api/admin/set-password (CAMBIAR CONTRASEÑA DIRECTA A CUALQUIER USUARIO POR RUT - SOLO ADMIN/DIRECTOR)
router.post('/admin/set-password', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  const { run, newPassword } = req.body;
  const targetRun = String(run || '').replace(/\./g, '').trim();
  const passStr = String(newPassword || '').trim();

  if (!targetRun || !passStr) {
    return res.status(400).json({ error: 'Proporcione el RUT del usuario y la nueva contraseña.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(passStr, salt);

    const result = await query(
      'UPDATE users SET password_hash = $1, password_plain = $2, temp_password = false WHERE REPLACE(run, \'.\', \'\') = $3 OR run = $4 OR id = $4 RETURNING id, run, name',
      [newHash, passStr, targetRun, run]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado con el RUT proporcionado.' });
    }

    res.json({ success: true, message: `Contraseña actualizada exitosamente para ${result.rows[0].name}`, user: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar clave:', err);
    res.status(500).json({ error: 'Error al actualizar la contraseña.' });
  }
});

router.post('/auth/change-password', authMiddleware, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  try {
    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch && currentPassword !== user.password_plain) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query('UPDATE users SET password_hash = $1, password_plain = $2, temp_password = false WHERE id = $3', [newHash, newPassword, userId]);
    await logAudit(req, 'CHANGE_PASSWORD', `Cambio de contraseña para usuario ${user.name}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
});

// POST /api/auth/verify-password - DOBLE VERIFICACIÓN DE SEGURIDAD PARA ACCIONES CRÍTICAS
router.post('/auth/verify-password', authMiddleware, async (req: Request, res: Response) => {
  const { password } = req.body;
  const userId = req.user?.id;

  if (!password || String(password).trim() === '') {
    return res.status(400).json({ success: false, error: 'Debes ingresar tu contraseña para verificar la acción.' });
  }

  try {
    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    const user = userRes.rows[0];
    let isMatch = false;

    if (user.password_hash) {
      isMatch = await bcrypt.compare(String(password), user.password_hash);
    }
    if (!isMatch && user.password_plain) {
      isMatch = String(password) === String(user.password_plain);
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta. Doble verificación de seguridad rechazada.' });
    }

    return res.json({ success: true, message: 'Doble verificación exitosa.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


router.post('/auth/update-profile', authMiddleware, async (req: Request, res: Response) => {
  const { name, run, email, phone, newPassword } = req.body;
  const userId = req.user?.id;

  try {
    // Asegurar que existan las columnas de teléfono en Supabase
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);').catch(() => { });
    await query('ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);').catch(() => { });

    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const user = userRes.rows[0];
    let updateFields: string[] = [];
    let params: any[] = [];

    const updatedName = (name && name.trim() !== '') ? name.trim() : user.name;
    const updatedRun = (run && run.trim() !== '') ? run.trim() : user.run;
    const updatedEmail = email !== undefined ? email.trim() : user.email;
    const updatedPhone = phone !== undefined ? phone.trim() : (user.phone || '');

    if (name && name.trim() !== '') {
      params.push(updatedName);
      updateFields.push(`name = $${params.length}`);
    }

    if (run && run.trim() !== '') {
      params.push(updatedRun);
      updateFields.push(`run = $${params.length}`);
    }

    if (email !== undefined) {
      params.push(updatedEmail);
      updateFields.push(`email = $${params.length}`);
    }

    if (phone !== undefined) {
      params.push(updatedPhone);
      updateFields.push(`phone = $${params.length}`);
    }

    if (newPassword && newPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword.trim(), salt);
      params.push(newHash);
      updateFields.push(`password_hash = $${params.length}`);
      params.push(newPassword.trim());
      updateFields.push(`password_plain = $${params.length}`);
    }

    if (updateFields.length > 0) {
      params.push(userId);
      await query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = $${params.length}`, params);

      // Sincronizar también staff_profiles si corresponde a un funcionario / docente
      const cleanRun = updatedRun.replace(/\./g, '').trim();
      await query(
        `UPDATE staff_profiles SET full_name = $1, phone = $2 
         WHERE user_id = $3 OR run = $4 OR REPLACE(REPLACE(run, '.', ''), '-', '') = REPLACE(REPLACE($4, '.', ''), '-', '')`,
        [updatedName, updatedPhone, userId, cleanRun]
      ).catch(() => { });

      await logAudit(req, 'UPDATE_PROFILE', `Actualización de perfil (Nombre/RUT/Email/Teléfono/Clave) para ${updatedName}`);
    }

    res.json({
      success: true,
      updatedUser: {
        ...user,
        name: updatedName,
        run: updatedRun,
        email: updatedEmail,
        phone: updatedPhone
      }
    });
  } catch (err) {
    console.error('Error actualizando perfil:', err);
    res.status(500).json({ error: 'Error al actualizar el perfil de usuario.' });
  }
});

router.get('/usuarios', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT id as username, run, name as nombre, role as perfil FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

const normalizeProfileRoleId = (r: any): string => {
  const raw = String(r || '').trim();
  const low = raw.toLowerCase();
  if (!raw) return 'Docente';
  if (low === 'admin' || low === 'administrador') return 'Admin';
  if (low === 'director' || low === 'directivo' || low === 'directivo / utp' || low === 'utp') return 'Director';
  if (low === 'docente' || low === 'profesor' || low === 'docente de aula') return 'Docente';
  if (low === 'entrevistador' || low === 'convivencia') return 'Entrevistador';
  if (low === 'asistente' || low === 'asistente de la educación' || low === 'asistente de la educacion' || low === 'asistente ed.') return 'Asistente';
  if (low === 'administrativo' || low === 'inspector' || low === 'inspector/a' || low === 'secretario/a') return 'Administrativo';
  if (low === 'profesionales' || low === 'profesional pie' || low === 'pie') return 'Profesionales';
  if (low === 'apoderado') return 'Apoderado';
  if (low === 'visita') return 'Visita';
  return raw;
};

const parseRolesArray = (rawRoles: any, primaryRole?: any): string[] => {
  const normPrimary = normalizeProfileRoleId(primaryRole || 'Docente');
  let list: string[] = [];
  if (Array.isArray(rawRoles)) {
    list = rawRoles.map(normalizeProfileRoleId).filter(Boolean);
  } else if (typeof rawRoles === 'string' && rawRoles.trim() !== '' && rawRoles.trim() !== 'null') {
    try {
      const parsed = JSON.parse(rawRoles);
      if (Array.isArray(parsed)) {
        list = parsed.map(normalizeProfileRoleId).filter(Boolean);
      }
    } catch (_) {
      list = rawRoles
        .replace(/^\[|\]$/g, '')
        .replace(/"/g, '')
        .split(',')
        .map(s => normalizeProfileRoleId(s))
        .filter(Boolean);
    }
  }
  if (list.length === 0) {
    list = [normPrimary];
  } else if (primaryRole && !list.includes(normPrimary)) {
    list = [normPrimary, ...list];
  }
  return Array.from(new Set(list));
};

// CRUD DE USUARIOS INSTITUCIONALES (PERSISTIDO EN SUPABASE/MYSQL)
router.get('/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const isStaffAdmin =
      req.user?.role === 'Admin' ||
      req.user?.role === 'Director' ||
      (Array.isArray((req.user as any)?.roles) && ((req.user as any).roles.includes('Admin') || (req.user as any).roles.includes('Director')));
    const result = await query('SELECT id, run, name, email, role, roles, staff_type, job_function, password_plain, temp_password, created_at FROM users ORDER BY name ASC');
    const users = result.rows.map(u => {
      const primaryRole = normalizeProfileRoleId(u.role || 'Docente');
      const parsedRoles = parseRolesArray(u.roles, primaryRole);
      const cleanMail = u.email && String(u.email) !== 'null' ? String(u.email) : '';
      return {
        id: u.id,
        run: u.run,
        name: u.name,
        email: cleanMail,
        role: primaryRole,
        roles: parsedRoles,
        staff_type: u.staff_type || (primaryRole === 'Administrativo' || primaryRole === 'Asistente' ? 'Asistente de la Educación' : 'Docente'),
        job_function: u.job_function || 'Docente de Aula',
        // Proteger contraseñas: solo accesibles por Administrador / Director en módulo de configuración
        password_plain: isStaffAdmin ? u.password_plain : undefined,
        temp_password: isStaffAdmin ? u.temp_password : undefined,
        created_at: u.created_at
      };
    });
    res.json(users);
  } catch (err) {
    res.json([]);
  }
});

router.post('/users', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  const { run, name, email, role, roles, password, staff_type, job_function } = req.body;
  const rawRun = String(run || '').trim();
  const cleanRun = rawRun.replace(/\./g, '').trim();
  const alnumRun = cleanRun.replace(/[^0-9kK]/g, '');
  const passStr = String(password || 'Ltp2026!').trim();

  if (!cleanRun || !name) {
    return res.status(400).json({ error: 'RUT y Nombre son requeridos.' });
  }

  const roleArray = parseRolesArray(roles, role);
  const primaryRole = role ? normalizeProfileRoleId(role) : (roleArray[0] || 'Docente');
  if (!roleArray.includes(primaryRole)) roleArray.unshift(primaryRole);
  const rolesJson = JSON.stringify(roleArray);
  const stType = staff_type || (primaryRole === 'Administrativo' || primaryRole === 'Asistente' ? 'Asistente de la Educación' : 'Docente');
  const safeEmail = email && String(email).trim() !== '' && String(email).trim() !== 'null'
    ? String(email).trim()
    : `${alnumRun || Date.now()}@liceocampanario.cl`;

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passStr, salt);
    const id = `USR-${alnumRun}`;

    // Verificar si ya existe por id o run
    const existingRes = await query(
      `SELECT id FROM users WHERE id = $1 OR run = $2 OR run = $3 OR REPLACE(REPLACE(run, '.', ''), '-', '') = $4 LIMIT 1`,
      [id, rawRun, cleanRun, alnumRun]
    );

    if (existingRes.rows.length > 0) {
      const targetId = existingRes.rows[0].id;
      await query(
        `UPDATE users SET name = $1, email = $2, role = $3, roles = $4, staff_type = $5, job_function = $6, password_hash = $7, password_plain = $8 WHERE id = $9`,
        [name.trim(), safeEmail, primaryRole, rolesJson, stType, job_function || 'Docente de Aula', passwordHash, passStr, targetId]
      );
    } else {
      await query(
        `INSERT INTO users (id, run, name, email, password_hash, password_plain, role, roles, staff_type, job_function, temp_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
        [id, rawRun, name.trim(), safeEmail, passwordHash, passStr, primaryRole, rolesJson, stType, job_function || 'Docente de Aula']
      );
    }

    // Sincronizar o insertar también en staff_profiles
    const spRes = await query(
      `SELECT id FROM staff_profiles WHERE user_id = $1 OR run = $2 OR run = $3 OR REPLACE(REPLACE(run, '.', ''), '-', '') = $4 LIMIT 1`,
      [id, rawRun, cleanRun, alnumRun]
    );
    if (spRes.rows.length > 0) {
      await query(
        `UPDATE staff_profiles SET full_name = $1, staff_type = $2, role = $3, roles = $4, job_function = $5, email = $6 WHERE id = $7`,
        [name.trim(), stType, primaryRole, rolesJson, job_function || 'Docente de Aula', safeEmail, spRes.rows[0].id]
      ).catch(() => {});
    } else {
      const staffId = `STAFF-${alnumRun}`;
      await query(
        `INSERT INTO staff_profiles (id, user_id, run, full_name, email, role, roles, staff_type, job_function, contract_hours, suitability_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 44, 'HABILITADO')`,
        [staffId, id, rawRun, name.trim(), safeEmail, primaryRole, rolesJson, stType, job_function || 'Docente de Aula']
      ).catch(() => {});
    }

    await logAudit(req, 'CREATE_USER', `Usuario ${name} (${rawRun}) creado/actualizado con roles [${roleArray.join(', ')}]`);
    res.json({
      success: true,
      user: {
        id,
        run: rawRun,
        name: name.trim(),
        email: safeEmail,
        role: primaryRole,
        roles: roleArray,
        staff_type: stType,
        job_function: job_function || 'Docente de Aula',
        password_plain: passStr
      }
    });
  } catch (err) {
    console.error('Error creando usuario:', err);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

router.put('/users/:id', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { run, name, email, role, roles, password, staff_type, job_function } = req.body;
  const rawRun = String(run || '').trim();
  const cleanRun = rawRun.replace(/\./g, '').trim();
  const alnumRun = cleanRun.replace(/[^0-9kK]/g, '');
  const usrIdFromRun = alnumRun ? `USR-${alnumRun}` : id;
  const passStr = password ? String(password).trim() : null;
  const cleanEmail = email && String(email).trim() !== '' && String(email).trim() !== 'null' ? String(email).trim() : null;

  const roleArray = parseRolesArray(roles, role);
  const primaryRole = role ? normalizeProfileRoleId(role) : (roleArray[0] || 'Docente');
  if (!roleArray.includes(primaryRole)) roleArray.unshift(primaryRole);
  const rolesJson = JSON.stringify(roleArray);
  const stType = staff_type || (primaryRole === 'Administrativo' || primaryRole === 'Asistente' ? 'Asistente de la Educación' : 'Docente');

  try {
    // 1. Buscar usuario existente en tabla users por id, USR-run, run con puntos o sin puntos
    const existingUserRes = await query(
      `SELECT id, email, run FROM users 
       WHERE id = $1 
          OR id = $2 
          OR run = $3 
          OR run = $4 
          OR REPLACE(REPLACE(run, '.', ''), '-', '') = $5
       LIMIT 1`,
      [id, usrIdFromRun, rawRun, cleanRun, alnumRun]
    );

    if (existingUserRes.rows.length > 0) {
      const targetUserId = existingUserRes.rows[0].id;
      const fields = ['name = $1', 'role = $2', 'roles = $3', 'staff_type = $4'];
      const params: any[] = [name.trim(), primaryRole, rolesJson, stType];

      if (cleanEmail) {
        params.push(cleanEmail);
        fields.push(`email = $${params.length}`);
      }

      if (job_function !== undefined) {
        params.push(job_function || 'Docente de Aula');
        fields.push(`job_function = $${params.length}`);
      }

      if (rawRun) {
        params.push(rawRun);
        fields.push(`run = $${params.length}`);
      }

      if (passStr) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passStr, salt);
        params.push(passwordHash);
        fields.push(`password_hash = $${params.length}`);
        params.push(passStr);
        fields.push(`password_plain = $${params.length}`);
      }

      params.push(targetUserId);
      await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${params.length}`, params);
    } else {
      // Si el funcionario estaba en staff_profiles pero no en users, crearlo en users
      const salt = await bcrypt.genSalt(10);
      const defaultPass = passStr || 'Profe2026!';
      const passwordHash = await bcrypt.hash(defaultPass, salt);
      const fallbackEmail = cleanEmail || `${alnumRun || Date.now()}@liceocampanario.cl`;
      await query(
        `INSERT INTO users (id, run, name, email, password_hash, password_plain, role, roles, staff_type, job_function, temp_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
        [usrIdFromRun, rawRun, name.trim(), fallbackEmail, passwordHash, defaultPass, primaryRole, rolesJson, stType, job_function || 'Docente de Aula']
      ).catch(() => {});
    }

    // 2. Sincronizar también staff_profiles (incluyendo roles, role, staff_type, job_function, email)
    const spFields = ['full_name = $1', 'staff_type = $2', 'role = $3', 'roles = $4'];
    const spParams: any[] = [name.trim(), stType, primaryRole, rolesJson];

    if (job_function !== undefined) {
      spParams.push(job_function || 'Docente de Aula');
      spFields.push(`job_function = $${spParams.length}`);
    }
    if (cleanEmail) {
      spParams.push(cleanEmail);
      spFields.push(`email = $${spParams.length}`);
    }

    spParams.push(id);
    const spIdIdx = spParams.length;
    spParams.push(usrIdFromRun);
    const spUsrIdx = spParams.length;
    spParams.push(rawRun);
    const spRawRunIdx = spParams.length;
    spParams.push(cleanRun);
    const spCleanRunIdx = spParams.length;
    spParams.push(alnumRun);
    const spAlnumIdx = spParams.length;

    await query(
      `UPDATE staff_profiles SET ${spFields.join(', ')} 
       WHERE id = $${spIdIdx}
          OR user_id = $${spIdIdx}
          OR user_id = $${spUsrIdx}
          OR run = $${spRawRunIdx}
          OR run = $${spCleanRunIdx}
          OR REPLACE(REPLACE(run, '.', ''), '-', '') = $${spAlnumIdx}`,
      spParams
    ).catch(() => {});

    await logAudit(req, 'UPDATE_USER', `Usuario ${name} (${id}) modificado con roles [${roleArray.join(', ')}]`);
    res.json({
      success: true,
      role: primaryRole,
      roles: roleArray,
      user: {
        id: existingUserRes.rows[0]?.id || usrIdFromRun,
        run: rawRun,
        name: name.trim(),
        email: cleanEmail || existingUserRes.rows[0]?.email || '',
        role: primaryRole,
        roles: roleArray,
        staff_type: stType,
        job_function: job_function || 'Docente de Aula'
      }
    });
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

// -----------------------------------------------------------------------------
// GESTIÓN DE FUNCIONARIOS Y CARGOS INSTITUCIONALES (DOCENTES Y ASISTENTES)
// -----------------------------------------------------------------------------
router.get('/staff-positions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM staff_job_positions ORDER BY category ASC, name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cargos institucionales.' });
  }
});

router.post('/staff-positions', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { category, name, description } = req.body;
  if (!category || !name) {
    return res.status(400).json({ error: 'Categoría (Docente/Asistente) y Nombre del cargo son requeridos.' });
  }
  try {
    const result = await query(
      'INSERT INTO staff_job_positions (category, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category RETURNING *;',
      [category, name.trim(), description || null]
    );
    res.json({ success: true, position: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cargo institucional.' });
  }
});

router.delete('/staff-positions/:id', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM staff_job_positions WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cargo institucional.' });
  }
});

router.get('/staff', authMiddleware, async (req: Request, res: Response) => {
  const { type, staff_type, job_function } = req.query;
  const targetType = type || staff_type;
  try {
    let sql = `
      SELECT 
        sp.*, 
        u.id as user_account_id,
        COALESCE(u.email, sp.email) as merged_email, 
        COALESCE(u.role, sp.role) as merged_role, 
        COALESCE(u.roles, sp.roles) as merged_roles,
        COALESCE(u.staff_type, sp.staff_type) as merged_staff_type,
        COALESCE(u.job_function, sp.job_function) as merged_job_function,
        u.password_plain
      FROM staff_profiles sp
      LEFT JOIN users u ON (
        sp.user_id = u.id 
        OR sp.run = u.run 
        OR REPLACE(REPLACE(sp.run, '.', ''), '-', '') = REPLACE(REPLACE(u.run, '.', ''), '-', '')
      )
    `;
    let params: any[] = [];
    let conditions: string[] = [];

    if (targetType && String(targetType) !== 'Todos') {
      params.push(targetType);
      conditions.push(`sp.staff_type = $${params.length}`);
    }

    if (job_function && String(job_function) !== 'Todos') {
      params.push(job_function);
      conditions.push(`sp.job_function = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY sp.full_name ASC';
    const result = await query(sql, params);
    const mapped = result.rows.map(r => {
      const primaryRole = normalizeProfileRoleId(r.merged_role || r.role || 'Docente');
      const parsedRoles = parseRolesArray(r.merged_roles || r.roles, primaryRole);
      const rawEmail = r.merged_email || r.email || '';
      const cleanMail = String(rawEmail) === 'null' ? '' : String(rawEmail);
      return {
        ...r,
        id: r.user_account_id || r.user_id || r.id,
        staff_id: r.id,
        user_id: r.user_account_id || r.user_id || r.id,
        email: cleanMail,
        role: primaryRole,
        roles: parsedRoles,
        staff_type: r.merged_staff_type || r.staff_type || 'Docente',
        job_function: r.merged_job_function || r.job_function || 'Docente de Aula'
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar nómina de funcionarios.' });
  }
});

// POST /api/users/send-credentials-batch (ENVÍO EN LOTE DE CREDENCIALES A FUNCIONARIOS/DOCENTES - SOLO ADMIN/DIRECTOR)
router.post('/users/send-credentials-batch', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { userIds, users: inputUsers } = req.body;
    const requestedIds = Array.isArray(userIds) ? userIds : [];
    const requestedUsers = Array.isArray(inputUsers) ? inputUsers : [];

    if (requestedIds.length === 0 && requestedUsers.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos un funcionario.' });
    }

    console.log(`[send-credentials-batch] Solicitud recibida: ${requestedUsers.length} usuarios, ${requestedIds.length} IDs.`);

    // Consultar todos los usuarios y perfiles en la base de datos
    const allUsersRes = await query('SELECT id, run, name, email, password_plain, role FROM users');
    const allStaffRes = await query('SELECT id, user_id, run, full_name, email FROM staff_profiles').catch(() => ({ rows: [] }));

    const normRun = (r: any) => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();

    // Mapas de búsqueda rápida y exhaustiva
    const userByNormRun = new Map<string, any>();
    const userById = new Map<string, any>();
    const userByEmail = new Map<string, any>();

    allUsersRes.rows.forEach((u: any) => {
      const nr = normRun(u.run);
      if (nr) userByNormRun.set(nr, u);
      if (u.id) userById.set(String(u.id), u);
      if (u.email) userByEmail.set(String(u.email).toLowerCase().trim(), u);
    });

    const staffByNormRun = new Map<string, any>();
    const staffById = new Map<string, any>();
    const staffByEmail = new Map<string, any>();

    (allStaffRes.rows || []).forEach((s: any) => {
      const nr = normRun(s.run);
      if (nr) staffByNormRun.set(nr, s);
      if (s.id) staffById.set(String(s.id), s);
      if (s.user_id) staffById.set(String(s.user_id), s);
      if (s.email) staffByEmail.set(String(s.email).toLowerCase().trim(), s);
    });

    const loginUrl = process.env.APP_URL || 'http://localhost:3000';
    const targetsToNotify: any[] = [];
    
    // Sets de deduplicación estricta para garantizar 1 solo correo por persona
    const seenEmails = new Set<string>();
    const seenRuns = new Set<string>();

    // Consolidar candidatos: primero los objetos de usuarios recibidos
    const candidates: any[] = [];
    for (const u of requestedUsers) {
      candidates.push({ ...u, source: 'users' });
    }
    for (const id of requestedIds) {
      candidates.push({ id, source: 'ids' });
    }

    for (const item of candidates) {
      const nr = normRun(item.run || item.id);
      
      // Buscar en BD
      const dbUser = (nr ? userByNormRun.get(nr) : null) || 
                     (item.id ? userById.get(String(item.id)) : null) ||
                     (item.email ? userByEmail.get(String(item.email).toLowerCase().trim()) : null);

      const dbStaff = (nr ? staffByNormRun.get(nr) : null) || 
                      (item.id ? staffById.get(String(item.id)) : null) ||
                      (item.email ? staffByEmail.get(String(item.email).toLowerCase().trim()) : null);

      const finalEmail = (dbUser?.email || item.email || dbStaff?.email || '').toLowerCase().trim();
      const finalRun = dbUser?.run || dbStaff?.run || item.run || '';
      const finalNormRun = normRun(finalRun) || nr;

      if (!finalEmail) continue;

      // Deduplicar: si ya vimos este correo o este RUN, omitir estrictamente
      if (seenEmails.has(finalEmail)) continue;
      if (finalNormRun && seenRuns.has(finalNormRun)) continue;

      seenEmails.add(finalEmail);
      if (finalNormRun) seenRuns.add(finalNormRun);

      // Prioridad de contraseña:
      // 1. dbUser.password_plain (la que está guardada en la tabla users de la BD)
      // 2. item.password_plain (la que viene del frontend que refleja la tabla)
      // 3. Fallback solo si ninguna existe
      const finalPassword = dbUser?.password_plain || item.password_plain || 'Profe2026!';
      const finalName = dbUser?.name || dbStaff?.full_name || item.name || 'Docente / Funcionario';

      targetsToNotify.push({
        id: dbUser?.id || item.id,
        run: finalRun,
        name: finalName,
        email: finalEmail,
        password: finalPassword
      });
    }

    console.log(`[send-credentials-batch] Total de destinatarios únicos estrictos a notificar: ${targetsToNotify.length}`);
    const sendResults: any[] = [];

    for (const target of targetsToNotify) {
      console.log(`📨 Enviando credenciales de acceso a: ${target.name} (${target.email}) con clave oficial: [${target.password}]...`);
      const mailResult = await sendTeacherWelcomeEmail(target.email, target.name, target.password, loginUrl);
      console.log(`  └─ Resultado: success=${mailResult.success}, messageId=${mailResult.messageId}`);

      sendResults.push({
        id: target.id,
        run: target.run,
        name: target.name,
        email: target.email,
        success: mailResult.success,
        simulated: mailResult.simulated,
        messageId: mailResult.messageId,
        error: mailResult.error
      });
    }

    const successCount = sendResults.filter(r => r.success).length;
    const errorCount = sendResults.filter(r => !r.success).length;

    res.json({
      success: successCount > 0 || targetsToNotify.length === 0,
      processedCount: targetsToNotify.length,
      successCount,
      errorCount,
      results: sendResults
    });
  } catch (err: any) {
    console.error('Error al procesar envío de credenciales batch:', err);
    res.status(500).json({ error: 'Error al procesar el envío de credenciales en el servidor.' });
  }
});


// GET /api/students (NÓMINA INSTITUCIONAL COMPLETA DE ALUMNOS)
router.get('/students', authMiddleware, async (req: Request, res: Response) => {
  const { levelId, course, year, anno } = req.query;
  const targetYear = year || anno;
  try {
    let sql = 'SELECT * FROM students';
    let params: any[] = [];
    let conditions: string[] = [];

    if (levelId || course) {
      const courseStr = String(levelId || course);
      if (courseStr.includes('510') || courseStr.includes('Industrial') || courseStr.includes('Mecánica')) {
        conditions.push(`(cod_tipo_ensenanza = 510 OR desc_grado ILIKE '%Industrial%' OR desc_grado ILIKE '%Mecánica%')`);
        if (courseStr.includes('3')) {
          conditions.push(`(desc_grado ILIKE '%3%' OR cod_grado = 3)`);
        } else if (courseStr.includes('4')) {
          conditions.push(`(desc_grado ILIKE '%4%' OR cod_grado = 4)`);
        }
      } else if (courseStr.includes('610') || courseStr.includes('Técnico') || courseStr.includes('Párvulos') || courseStr.includes('Niños')) {
        conditions.push(`(cod_tipo_ensenanza = 610 OR desc_grado ILIKE '%Técnico%' OR desc_grado ILIKE '%Párvulos%')`);
        if (courseStr.includes('3')) {
          conditions.push(`(desc_grado ILIKE '%3%' OR cod_grado = 3)`);
        } else if (courseStr.includes('4')) {
          conditions.push(`(desc_grado ILIKE '%4%' OR cod_grado = 4)`);
        }
      } else {
        params.push(courseStr);
        conditions.push(`(desc_grado = $${params.length} OR (desc_grado || ' ' || letra_curso) = $${params.length} OR id = $${params.length})`);
      }
    }

    if (targetYear) {
      const yearInt = parseInt(String(targetYear), 10) || 2026;
      params.push(yearInt);
      if (yearInt === 2026) {
        conditions.push(`(anno = $${params.length} OR academic_year = $${params.length} OR entry_year = $${params.length} OR (anno IS NULL AND academic_year IS NULL))`);
      } else {
        conditions.push(`(anno = $${params.length} OR academic_year = $${params.length} OR entry_year = $${params.length})`);
      }
    }

    // Aislamiento de privacidad (Ley 19.628): Apoderados solo ven a sus pupilos, Alumnos solo ven su propia ficha
    const userRole = req.user?.role;
    const cleanUserRun = String(req.user?.run || '').replace(/\./g, '').trim();
    if (userRole === 'Apoderado' && cleanUserRun) {
      params.push(cleanUserRun);
      const pIdx = params.length;
      conditions.push(`(REPLACE(guardian_run, '.', '') = $${pIdx} OR REPLACE(guardian_sec_run, '.', '') = $${pIdx} OR REPLACE(father_run, '.', '') = $${pIdx} OR REPLACE(mother_run, '.', '') = $${pIdx})`);
    } else if (userRole === 'Estudiante' && cleanUserRun) {
      params.push(cleanUserRun);
      const pIdx = params.length;
      conditions.push(`REPLACE(run, '.', '') = $${pIdx}`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY list_number ASC, full_name ASC';
    const result = await query(sql, params);

    // Obtener mapa de profesores jefes asignados por curso
    const coursesRes = await query('SELECT name, teacher FROM courses').catch(() => ({ rows: [] }));
    const courseTeacherMap: Record<string, string> = {};
    (coursesRes.rows || []).forEach((c: any) => {
      if (c.name && c.teacher && c.teacher !== 'null' && c.teacher !== 'Sin Asignar') {
        courseTeacherMap[c.name] = c.teacher;
      }
    });

    const sanitizedRows = (result.rows || []).map((s: any) => {
      let pj = s.profesor_jefe;
      if (!pj || pj === 'null' || pj === 'undefined') {
        const cName = getStudentCourseHelper(s);
        pj = courseTeacherMap[cName] || courseTeacherMap[s.desc_grado] || null;
      }
      const rawWd = s.withdrawal_date ? String(s.withdrawal_date).trim() : '';
      const isInvalidWd = !rawWd || rawWd.startsWith('1899') || rawWd.startsWith('1900') || rawWd.startsWith('0000') || rawWd === 'null' || rawWd === 'Invalid Date';
      const isRetiredFlag = s.is_retired === 1 || s.is_retired === '1' || s.is_retired === true || String(s.status || '').toLowerCase().includes('retirad') || String(s.status || '').toLowerCase() === 'withdrawn';
      return {
        ...s,
        profesor_jefe: pj,
        is_retired: isRetiredFlag ? 1 : 0,
        status: isRetiredFlag ? 'Retirado' : (s.status || 'Active'),
        withdrawal_date: (!isRetiredFlag || isInvalidWd) ? null : s.withdrawal_date
      };
    });

    res.json(sanitizedRows);
  } catch (err: any) {
    console.error('⛔ Error en /api/students:', err?.message || err);
    res.status(503).json({
      error: 'Base de datos desconectada',
      message: 'No se puede acceder a la nómina de estudiantes porque el motor de base de datos no está disponible.',
      disconnected: true
    });
  }
});

// POST /api/students/promote-academic-year (PROMOCIÓN MASIVA DE AÑO LECTIVO 2026 -> 2027)
router.post('/students/promote-academic-year', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { fromYear, toYear } = req.body;
  const sourceYear = parseInt(fromYear || 2026, 10);
  const targetYear = parseInt(toYear || 2027, 10);

  try {
    const currentStudents = await query('SELECT * FROM students WHERE anno = $1 OR entry_year = $1', [sourceYear]);

    if (currentStudents.rows.length === 0) {
      return res.status(400).json({ error: `No se encontraron estudiantes registrados en el año lectivo ${sourceYear}.` });
    }

    const nextGradeMap: Record<string, string> = {
      '1er nivel de Transición (Pre-kinder)': '2° nivel de Transición (Kinder)',
      '2° nivel de Transición (Kinder)': '1° básico',
      '1° básico': '2° básico',
      '2° básico': '3° básico',
      '3° básico': '4° básico',
      '4° básico': '5° básico',
      '5° básico': '6° básico',
      '6° básico': '7° básico',
      '7° básico': '8° básico',
      '8° básico': '1° medio',
      '1° medio': '2° medio',
      '2° medio': '3° medio',
      '3° medio': '4° medio',
      '4° medio': 'Egresado',
      'Laboral 1': 'Laboral 1'
    };

    let promotedCount = 0;

    for (const student of currentStudents.rows) {
      const currentGrade = student.desc_grado || '';
      const nextGrade = nextGradeMap[currentGrade] || currentGrade;
      const isGraduated = nextGrade === 'Egresado';
      const newStatus = isGraduated ? 'Egresado' : 'Active';
      const newId = `STD-${student.run}-${targetYear}`;

      if (isGraduated) {
        await query('UPDATE students SET status = \'Egresado\' WHERE id = $1', [student.id]);
      } else {
        await query(`
          INSERT INTO students (
            id, run, full_name, first_name, paternal_surname, maternal_surname,
            document_type, birth_date, gender, nationality, address, region, commune,
            phone, email, health_system, enrollment_number, list_number,
            desc_grado, letra_curso, anno, entry_year, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18,
            $19, $20, $21, $21, $22
          ) ON CONFLICT (run) DO UPDATE SET
            desc_grado = EXCLUDED.desc_grado,
            letra_curso = EXCLUDED.letra_curso,
            anno = EXCLUDED.anno,
            status = EXCLUDED.status;
        `, [
          newId, student.run, student.full_name, student.first_name, student.paternal_surname, student.maternal_surname,
          student.document_type, student.birth_date, student.gender, student.nationality, student.address, student.region, student.commune,
          student.phone, student.email, student.health_system, student.enrollment_number, student.list_number,
          nextGrade, student.letra_curso || 'A', targetYear, newStatus
        ]);
        promotedCount++;
      }
    }

    await logAudit(req, 'PROMOTE_ACADEMIC_YEAR', `Promoción masiva de año lectivo realizada: ${sourceYear} -> ${targetYear} (${promotedCount} alumnos promovidos)`);

    res.json({
      success: true,
      message: `Promoción al año lectivo ${targetYear} realizada exitosamente. ${promotedCount} estudiantes promovidos al nuevo año.`,
      promotedCount,
      targetYear
    });
  } catch (err) {
    console.error('Error en promoción de año lectivo:', err);
    res.status(500).json({ error: 'Error al realizar la promoción de año lectivo en Supabase.' });
  }
});

// POST /api/students/import-batch (CARGA MASIVA EXCEL CON MAPPING MINEDUC OFICIAL)
router.post('/students/import-batch', authMiddleware, checkRoles(['Admin', 'Administrativo']), async (req: Request, res: Response) => {
  const { studentsList } = req.body;
  if (!Array.isArray(studentsList) || studentsList.length === 0) {
    return res.status(400).json({ error: 'Proporcione una lista de estudiantes válida.' });
  }

  let importedCount = 0;

  try {
    for (const item of studentsList) {
      const numSrn = String(item.num_srn || item.run || '').split('-')[0].replace(/\./g, '').trim();
      const dvRun = String(item.dv_run || (String(item.run || '').includes('-') ? String(item.run).split('-')[1] : '')).toUpperCase().trim();
      const runFull = numSrn ? `${numSrn}-${dvRun}` : String(item.run || '').trim();

      if (!runFull) continue;

      const firstName = (item.nombres || item.first_name || '').trim();
      const patSurname = (item.apellido_paterno || item.paternal_surname || '').trim();
      const matSurname = (item.apellido_materno || item.maternal_surname || '').trim();
      const fullName = (item.full_name || `${patSurname} ${matSurname} ${firstName}`).trim();

      const courseName = item.desc_grado
        ? (item.letra_curso ? `${item.desc_grado} ${item.letra_curso}` : item.desc_grado)
        : (item.course || '1° Medio A');

      const id = `STU-${runFull.replace(/[^0-9kK]/g, '')}`;

      const sql = `
        INSERT INTO students (
          id, run, num_srn, dv_run, full_name, first_name, paternal_surname, maternal_surname,
          anno, rbd, cod_tipo_ensenanza, cod_grado, desc_grado, letra_curso,
          direccion, cod_comuna_residencia, email, phone, mobile_phone,
          birth_date, cod_etnia, fecha_incorporacion_curso, withdrawal_date,
          porcentaje_asistencia, promedio_final, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25, 'Active'
        )
        ON CONFLICT (run) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          first_name = EXCLUDED.first_name,
          paternal_surname = EXCLUDED.paternal_surname,
          maternal_surname = EXCLUDED.maternal_surname,
          direccion = EXCLUDED.direccion,
          email = EXCLUDED.email,
          mobile_phone = EXCLUDED.mobile_phone,
          porcentaje_asistencia = EXCLUDED.porcentaje_asistencia,
          promedio_final = EXCLUDED.promedio_final;
      `;

      await query(sql, [
        id, runFull, numSrn, dvRun, fullName, firstName, patSurname, matSurname,
        parseInt(item.anno || 2026, 10), parseInt(item.rbd || 0, 10),
        parseInt(item.cod_tipo_ensenanza || 0, 10), parseInt(item.cod_grado || 0, 10),
        courseName, item.letra_curso || 'A',
        item.direccion || '', item.cod_comuna_residencia || '', item.email || '',
        item.telefono || '', item.celular || item.mobile_phone || '',
        item.fecha_nacimiento || item.birth_date || null,
        parseInt(item.cod_etnia || 0, 10),
        item.fecha_incorporacion_curso || null,
        item.fecha_retiro || null,
        parseFloat(item.porcentaje_asistencia || 100),
        parseFloat(item.promedio_final || 0)
      ]);
      importedCount++;
    }

    await logAudit(req, 'IMPORT_EXCEL_STUDENTS', `Carga masiva procesada: ${importedCount} estudiantes cargados`);
    res.json({ success: true, count: importedCount });
  } catch (err) {
    console.error('Error importando lote:', err);
    res.status(500).json({ error: 'Error al procesar la carga masiva de estudiantes.' });
  }
});

// POST /api/students/reorder (ACTUALIZAR NÚMEROS DE LISTA OFICIALES EN BASE DE DATOS)
router.post('/students/reorder', authMiddleware, checkRoles(['Admin', 'Docente', 'Administrativo']), async (req: Request, res: Response) => {
  const { reorderedStudents } = req.body;
  if (!Array.isArray(reorderedStudents)) {
    return res.status(400).json({ error: 'Formato inválido de estudiantes.' });
  }

  try {
    for (const item of reorderedStudents) {
      if (item.id && typeof item.list_number === 'number') {
        await query('UPDATE students SET list_number = $1 WHERE id = $2 OR run = $3', [
          item.list_number,
          item.id,
          item.run || ''
        ]);
      }
    }
    await logAudit(req, 'REORDER_STUDENTS', `Actualizados ${reorderedStudents.length} números de lista`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al reordenar estudiantes:', err);
    res.status(500).json({ error: 'Error al guardar el nuevo orden de lista.' });
  }
});

// -----------------------------------------------------------------------------
// 3. CURSOS, NIVELES Y ASIGNATURAS (LICEO PRO 2.2 & 2.3)
// -----------------------------------------------------------------------------
router.get('/levels', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM levels ORDER BY id ASC');
    if (result.rows.length === 0) {
      return res.json([]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar cursos.' });
  }
});

router.post('/levels', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { name, totalCapacity } = req.body;
  try {
    await query('INSERT INTO levels (name, total_capacity) VALUES ($1, $2)', [name, totalCapacity || 45]);
    await logAudit(req, 'CREATE_LEVEL', `Nuevo nivel creado: ${name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear nivel.' });
  }
});

router.get('/subjects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM subjects ORDER BY id ASC');
    res.json(result.rows || []);
  } catch (err) {
    res.json([]);
  }
});

// -----------------------------------------------------------------------------
// CONFIGURACIÓN DE FICHA DE MATRÍCULA Y TEXTO DE COMPROMISO INSTITUCIONAL
// -----------------------------------------------------------------------------
router.get('/config/enrollment-settings', async (req: Request, res: Response) => {
  try {
    const storePath = path.join(__dirname, '../../local_store.json');
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      if (store.enrollment_settings) {
        return res.json(store.enrollment_settings);
      }
    }
    res.json({
      commitment_text: "Yo, {GUARDIAN_NAME}, RUN: {GUARDIAN_RUN}, declaro conocer, respetar, cumplir, hacer cumplir y aceptar de forma íntegra el Proyecto Educativo Institucional, el Reglamento de Convivencia Educativa y el Reglamento de Evaluación y Promoción Escolar del Liceo Técnico Profesional Campanario Marcos Delucchi Fonck. AUTORIZO LAS SALIDAS DE MI PUPILO (A) a actividades curriculares y extracurriculares programadas fuera del establecimiento (actos, ceremonias, salidas pedagógicas, compromisos deportivos, recreativos y culturales, campañas solidarias y otras...) dentro de la comuna.",
      show_guardian_suplente: true,
      show_health_pie: true,
      show_family_convivencia: true,
      show_religion_ethnicity: true,
      show_school_signatures: true,
      show_student_contacts: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar configuración de matrícula.' });
  }
});

router.post('/config/enrollment-settings', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  try {
    const storePath = path.join(__dirname, '../../local_store.json');
    let store: any = {};
    if (fs.existsSync(storePath)) {
      store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    }
    store.enrollment_settings = {
      ...(store.enrollment_settings || {}),
      ...req.body
    };
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
    await logAudit(req, 'UPDATE_ENROLLMENT_CONFIG', 'Configuración de Texto de Compromiso y Ficha de Matrícula actualizada');
    res.json({ success: true, settings: store.enrollment_settings });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar configuración de matrícula.' });
  }
});

// CONFIGURACIÓN DE PLANTILLAS DE CHECKLIST DOCUMENTAL (RETIRO Y MATRÍCULA)
// -----------------------------------------------------------------------------
const DEFAULT_CHECKLIST_TEMPLATES = {
  withdrawal: [
    { id: 'w1', label: 'Certificado de Retiro Oficial MINEDUC / LTP', category: 'Ministerial', checked: true },
    { id: 'w2', label: 'Concentración de Notas Parciales / Calificaciones al Día', category: 'Académico', checked: true },
    { id: 'w3', label: 'Informe de Desarrollo Personal y Social (Informe al Hogar)', category: 'Académico', checked: true },
    { id: 'w4', label: 'Copia de Ficha Oficial de Matrícula (FIDE / Registro Institucional)', category: 'Administrativo', checked: true },
    { id: 'w5', label: 'Informe Técnico Pedagógico PIE / PAI (si corresponde a PIE)', category: 'PIE', checked: false },
    { id: 'w6', label: 'Informes de Especialistas en Custodia (Psicología / Fonoaudiología)', category: 'PIE', checked: false },
    { id: 'w7', label: 'Certificado de No Deuda Biblioteca / CRA (Libros y textos escolares)', category: 'Materiales', checked: true },
    { id: 'w8', label: 'Devolución de Dispositivos / Equipamiento Escolar (Tablet / Notebook)', category: 'Materiales', checked: false },
    { id: 'w9', label: 'Entrega de Certificado de Nacimiento Original en Archivo', category: 'Administrativo', checked: true },
    { id: 'w10', label: 'Informe de Asistencia Escolar Acumulada', category: 'Académico', checked: true }
  ],
  enrollment_new: [
    { id: 'm_n1', label: 'Certificado de Nacimiento para Matrícula (con RUN legible)', category: 'Identificación', checked: false },
    { id: 'm_n2', label: 'Certificado Anual de Estudios / Calificaciones de años anteriores', category: 'Académico', checked: false },
    { id: 'm_n3', label: 'Informe de Personalidad / Conducta del establecimiento de origen', category: 'Académico', checked: false },
    { id: 'm_n4', label: 'Certificado de Matrícula o Traslado del colegio anterior (si ingresa a mitad de año)', category: 'Administrativo', checked: false },
    { id: 'm_n5', label: 'Fotocopia Cédula de Identidad del Estudiante (ambos lados)', category: 'Identificación', checked: false },
    { id: 'm_n6', label: 'Fotocopia Cédula de Identidad del Apoderado Titular y Suplente', category: 'Identificación', checked: false },
    { id: 'm_n7', label: 'Ficha de Antecedentes de Salud / Carnet de Vacunación al día', category: 'Salud', checked: false },
    { id: 'm_n8', label: 'Documentación Integral PIE / FUDEC / Diagnóstico Médico (si postula a PIE)', category: 'PIE', checked: false },
    { id: 'm_n9', label: 'Ficha Oficial de Matrícula FIDE / LTP completada y firmada', category: 'Administrativo', checked: false },
    { id: 'm_n10', label: 'Toma de Conocimiento y Firma del RICE (Reglamento Interno)', category: 'Convivencia', checked: false },
    { id: 'm_n11', label: 'Consentimiento y Autorización de Uso de Imagen Escolar', category: 'Convivencia', checked: false }
  ],
  enrollment_old: [
    { id: 'm_o1', label: 'Actualización y Ratificación de Ficha Oficial de Matrícula FIDE / LTP', category: 'Administrativo', checked: false },
    { id: 'm_o2', label: 'Fotocopia actualizada de Cédula de Identidad del Apoderado Titular', category: 'Identificación', checked: false },
    { id: 'm_o3', label: 'Verificación y actualización de Teléfonos, Correos y Domicilio de Emergencia', category: 'Contacto', checked: false },
    { id: 'm_o4', label: 'Actualización de Ficha de Salud / Certificado Médico si hubiese patología nueva', category: 'Salud', checked: false },
    { id: 'm_o5', label: 'Firma de Consentimiento de Continuidad de Apoyo PIE (si aplica)', category: 'PIE', checked: false },
    { id: 'm_o6', label: 'Firma y Renovación de Compromiso con el RICE vigente', category: 'Convivencia', checked: false },
    { id: 'm_o7', label: 'Renovación de Consentimiento de Uso de Imagen y Difusión Institucional', category: 'Convivencia', checked: false },
    { id: 'm_o8', label: 'Paz y Salvo / Devolución de Textos Escolares y Material CRA año anterior', category: 'Materiales', checked: false }
  ]
};

router.get('/config/checklist-templates', async (req: Request, res: Response) => {
  try {
    const storePath = path.join(__dirname, '../../local_store.json');
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      if (store.checklist_templates) {
        return res.json({ success: true, templates: store.checklist_templates });
      }
    }
    res.json({ success: true, templates: DEFAULT_CHECKLIST_TEMPLATES });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar plantillas de checklists.' });
  }
});

router.post('/config/checklist-templates', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { templates } = req.body;
    if (!templates || typeof templates !== 'object') {
      return res.status(400).json({ error: 'Formato de plantillas inválido.' });
    }

    const storePath = path.join(__dirname, '../../local_store.json');
    let store: any = {};
    if (fs.existsSync(storePath)) {
      store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    }

    store.checklist_templates = {
      withdrawal: Array.isArray(templates.withdrawal) ? templates.withdrawal : DEFAULT_CHECKLIST_TEMPLATES.withdrawal,
      enrollment_new: Array.isArray(templates.enrollment_new) ? templates.enrollment_new : DEFAULT_CHECKLIST_TEMPLATES.enrollment_new,
      enrollment_old: Array.isArray(templates.enrollment_old) ? templates.enrollment_old : DEFAULT_CHECKLIST_TEMPLATES.enrollment_old
    };

    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
    await logAudit(req, 'UPDATE_CHECKLIST_TEMPLATES', 'Plantillas de Requisitos y Documentos para Retiro y Matrícula actualizadas');
    res.json({ success: true, message: 'Plantillas de checklists guardadas correctamente.', templates: store.checklist_templates });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar plantillas de checklists.' });
  }
});

// CONFIGURACIÓN INSTITUCIONAL (DIRECTIVA, DIRECTOR, ESTABLECIMIENTO)
// Helper para obtener configuración institucional centralizada
export async function getInstitutionalSettingsHelper() {
  const storePath = path.join(__dirname, '../../local_store.json');
  let fileSettings: any = {};
  if (fs.existsSync(storePath)) {
    try {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      if (store.institutional_settings) fileSettings = store.institutional_settings;
    } catch (_) {}
  }

  let dbSettings: any = null;
  try {
    const dbRes = await query("SELECT config_value FROM system_settings WHERE config_key = 'institution_settings' LIMIT 1");
    if (dbRes.rows && dbRes.rows.length > 0 && dbRes.rows[0].config_value) {
      dbSettings = JSON.parse(dbRes.rows[0].config_value);
    }
  } catch (_) {}

  // Configuración base por defecto (los valores reales se cargan desde la base de datos o local_store)
  const base = {
    schoolName: 'Liceo Técnico Profesional',
    shortName: 'LTP',
    rbd: '',
    commune: '',
    locality: '',
    region: '',
    dependence: 'Municipal / SLEP',
    directorId: '',
    directorName: 'Director(a) Establecimiento',
    directorRun: '',
    directorEmail: '',
    address: '',
    phone: '',
    email: '',
    ...fileSettings,
    ...(dbSettings || {})
  };

  // Si hay un directorId configurado, sincronizar con la tabla users
  if (base.directorId) {
    try {
      const uRes = await query("SELECT id, name, run, email, role FROM users WHERE id = $1 OR run = $2 LIMIT 1", [base.directorId, base.directorRun || base.directorId]);
      if (uRes.rows && uRes.rows.length > 0) {
        const u = uRes.rows[0];
        base.directorName = u.name || base.directorName;
        base.directorRun = u.run || base.directorRun;
        base.directorEmail = u.email || base.directorEmail;
      }
    } catch (_) {}
  }

  return base;
}

// CONFIGURACIÓN INSTITUCIONAL (DIRECTIVA, DIRECTOR, ESTABLECIMIENTO)
router.get('/config/institutional-settings', async (req: Request, res: Response) => {
  try {
    const settings = await getInstitutionalSettingsHelper();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar configuración institucional.' });
  }
});

router.post('/config/institutional-settings', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  try {
    const existing = await getInstitutionalSettingsHelper();
    const updated = {
      ...existing,
      ...req.body
    };

    // Si se especificó directorId, sincronizar y asegurar datos maestros del usuario
    if (req.body.directorId) {
      try {
        const uRes = await query("SELECT id, name, run, email, role, roles FROM users WHERE id = $1 LIMIT 1", [req.body.directorId]);
        if (uRes.rows && uRes.rows.length > 0) {
          const u = uRes.rows[0];
          updated.directorId = u.id;
          updated.directorName = u.name;
          updated.directorRun = u.run;
          updated.directorEmail = u.email;

          // Asignar rol Director al usuario si no lo tiene
          let rolesList: string[] = [];
          if (Array.isArray(u.roles)) rolesList = u.roles;
          else if (typeof u.roles === 'string') {
            try { rolesList = JSON.parse(u.roles); } catch (_) { rolesList = [u.role]; }
          } else {
            rolesList = [u.role];
          }

          if (!rolesList.includes('Director')) {
            rolesList.push('Director');
            await query("UPDATE users SET role = 'Director', roles = $1 WHERE id = $2", [JSON.stringify(rolesList), u.id]);
          }
        }
      } catch (uErr) {
        console.warn('Advertencia al vincular usuario director:', uErr);
      }
    }

    // Persistir en local_store.json
    const storePath = path.join(__dirname, '../../local_store.json');
    let store: any = {};
    if (fs.existsSync(storePath)) {
      try { store = JSON.parse(fs.readFileSync(storePath, 'utf-8')); } catch (_) {}
    }
    store.institutional_settings = updated;
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');

    // Persistir en MySQL system_settings
    try {
      const serialized = JSON.stringify(updated);
      if (isMysql) {
        await query(
          "INSERT INTO system_settings (id, config_key, config_value, updated_at) VALUES ('SET-INSTITUTION', 'institution_settings', ?, NOW()) ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()",
          [serialized, serialized]
        );
      } else {
        await query(
          "INSERT INTO system_settings (id, config_key, config_value, updated_at) VALUES ('SET-INSTITUTION', 'institution_settings', $1, NOW()) ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()",
          [serialized]
        );
      }
    } catch (e) {
      console.error('Error guardando institution_settings en system_settings:', e);
    }

    // Sincronizar parámetros de Calendar con integration_settings
    try {
      if (updated.calendarId) {
        if (isMysql) {
          await query(
            "INSERT INTO integration_settings (setting_key, setting_value) VALUES ('EVALUATIONS_CALENDAR_ID', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
            [updated.calendarId, updated.calendarId]
          );
        } else {
          await query(
            "INSERT INTO integration_settings (setting_key, setting_value) VALUES ('EVALUATIONS_CALENDAR_ID', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1",
            [updated.calendarId]
          );
        }
      }
      if (updated.calendarEmail) {
        if (isMysql) {
          await query(
            "INSERT INTO integration_settings (setting_key, setting_value) VALUES ('INSTITUTIONAL_CALENDAR_EMAIL', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
            [updated.calendarEmail, updated.calendarEmail]
          );
        } else {
          await query(
            "INSERT INTO integration_settings (setting_key, setting_value) VALUES ('INSTITUTIONAL_CALENDAR_EMAIL', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1",
            [updated.calendarEmail]
          );
        }
      }
    } catch (syncErr) {
      console.warn('Advertencia al sincronizar integration_settings:', syncErr);
    }

    await logAudit(req, 'UPDATE_INSTITUTIONAL_CONFIG', `Configuración institucional y director (${updated.directorName}) actualizada en toda la plataforma`);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al actualizar configuración institucional.' });
  }
});

// ORDEN OFICIAL DE ASIGNATURAS POR CURSO (SUB-VENTANA 6.6)
router.get('/config/course-subject-order', authMiddleware, async (req: Request, res: Response) => {
  try {
    const storePath = path.join(__dirname, '../../local_store.json');
    let store: any = {};
    if (fs.existsSync(storePath)) {
      store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    }

    // Consultar en MySQL si existe
    let dbOrders: any = null;
    try {
      const dbRes = await query("SELECT config_value FROM system_settings WHERE config_key = 'course_subject_orders' LIMIT 1");
      if (dbRes.rows && dbRes.rows.length > 0 && dbRes.rows[0].config_value) {
        dbOrders = JSON.parse(dbRes.rows[0].config_value);
      }
    } catch (_) {}

    const orders = dbOrders || store.course_subject_orders || {};
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener orden de asignaturas por curso.' });
  }
});

router.post('/config/course-subject-order', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  try {
    const { courseName, subjects, orders } = req.body;
    const storePath = path.join(__dirname, '../../local_store.json');
    let store: any = {};
    if (fs.existsSync(storePath)) {
      store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    }

    let existingOrders = store.course_subject_orders || {};

    // Obtener de MySQL si existe
    try {
      const dbRes = await query("SELECT config_value FROM system_settings WHERE config_key = 'course_subject_orders' LIMIT 1");
      if (dbRes.rows && dbRes.rows.length > 0 && dbRes.rows[0].config_value) {
        existingOrders = { ...existingOrders, ...JSON.parse(dbRes.rows[0].config_value) };
      }
    } catch (_) {}

    if (orders && typeof orders === 'object') {
      existingOrders = { ...existingOrders, ...orders };
    } else if (courseName && Array.isArray(subjects)) {
      existingOrders[courseName] = subjects;
    }

    // Persistir en local_store.json
    store.course_subject_orders = existingOrders;
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');

    // Persistir en MySQL system_settings
    try {
      const serialized = JSON.stringify(existingOrders);
      if (isMysql) {
        await query(
          "INSERT INTO system_settings (id, config_key, config_value, updated_at) VALUES ('SET-COURSE-SUBJ-ORDER', 'course_subject_orders', ?, NOW()) ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()",
          [serialized, serialized]
        );
      } else {
        await query(
          "INSERT INTO system_settings (id, config_key, config_value, updated_at) VALUES ('SET-COURSE-SUBJ-ORDER', 'course_subject_orders', $1, NOW()) ON CONFLICT (config_key) DO UPDATE SET config_value = $1, updated_at = NOW()",
          [serialized]
        );
      }
    } catch (e) {
      console.error('Error guardando en system_settings:', e);
    }

    await logAudit(req, 'UPDATE_COURSE_SUBJECT_ORDER', `Orden de asignaturas actualizado para ${courseName || 'múltiples cursos'}`);
    res.json({ success: true, orders: existingOrders });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al guardar orden de asignaturas por curso.' });
  }
});

// GESTIÓN DE CANDADOS Y BLOQUEO SEMESTRAL (PERSISTIDO EN SUPABASE / POSTGRESQL system_settings)
const DEFAULT_PERIOD_LOCKS = [
  { id: '1', level_name: '1° Medio A', subject_name: 'Matemática', period: '1er Semestre', is_locked: false },
  { id: '2', level_name: '3° Medio Industrial (Mecánica Industrial) A', subject_name: 'Taller de Especialidad TP', period: '1er Semestre', is_locked: false }
];

async function getSavedPeriodLocks(): Promise<any[]> {
  try {
    const dbRes = await query("SELECT config_value FROM system_settings WHERE id = 'SET-PERIOD-LOCKS' OR config_key = 'period_locks' ORDER BY updated_at DESC LIMIT 1");
    if (dbRes.rows && dbRes.rows.length > 0 && dbRes.rows[0].config_value) {
      const parsed = JSON.parse(dbRes.rows[0].config_value);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}

  try {
    const storePath = path.join(__dirname, '../../local_store.json');
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      if (Array.isArray(store.period_locks)) return store.period_locks;
    }
  } catch (_) {}

  return DEFAULT_PERIOD_LOCKS;
}

async function isGradeEntryLocked(levelId: any, subjectId: any, period: string): Promise<boolean> {
  try {
    const locks = await getSavedPeriodLocks();
    if (!Array.isArray(locks) || locks.length === 0) return false;

    let courseName = '';
    let subjectName = '';
    if (levelId) {
      const lRes = await query('SELECT name FROM levels WHERE id = $1 LIMIT 1', [levelId]).catch(() => ({ rows: [] }));
      if (lRes.rows.length > 0) courseName = String(lRes.rows[0].name || '').trim();
    }
    if (subjectId) {
      const sRes = await query('SELECT name FROM subjects WHERE id = $1 LIMIT 1', [subjectId]).catch(() => ({ rows: [] }));
      if (sRes.rows.length > 0) subjectName = String(sRes.rows[0].name || '').trim();
    }

    const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const targetCourse = norm(courseName);
    const targetSubj = norm(subjectName);
    const targetPeriod = norm(period || '1er Semestre');

    // Precedence: 3 = exact course + exact subject, 2 = exact course + all subjects, 1 = all courses + exact subject, 0 = global all courses + all subjects
    let matchedPriority = -1;
    let lockedState = false;

    for (const rule of locks) {
      const rPeriod = norm(rule.period);
      const periodMatch = rPeriod === targetPeriod || rPeriod.includes('ambos') || rPeriod.includes('anual') || rPeriod === 'todos';
      if (!periodMatch) continue;

      const rCourse = norm(rule.level_name);
      const rSubj = norm(rule.subject_name);
      const isAllCourses = !rCourse || rCourse.includes('todos los cursos') || rCourse === 'todos' || rCourse === 'global';
      const isAllSubjects = !rSubj || rSubj.includes('todas las asignaturas') || rSubj === 'todas' || rSubj === 'todos';

      const courseMatches = isAllCourses || (targetCourse && (rCourse === targetCourse || targetCourse.includes(rCourse) || rCourse.includes(targetCourse)));
      const subjMatches = isAllSubjects || (targetSubj && (rSubj === targetSubj));

      if (!courseMatches || !subjMatches) continue;

      let priority = 0;
      if (!isAllCourses && !isAllSubjects) priority = 3;
      else if (!isAllCourses && isAllSubjects) priority = 2;
      else if (isAllCourses && !isAllSubjects) priority = 1;
      else priority = 0;

      if (priority >= matchedPriority) {
        matchedPriority = priority;
        lockedState = Boolean(rule.is_locked);
      }
    }

    return lockedState;
  } catch (_) {
    return false;
  }
}

router.get('/config/period-locks', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const locks = await getSavedPeriodLocks();
    res.json(locks);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reglas de bloqueo.' });
  }
});

router.post('/config/period-locks', authMiddleware, checkRoles(['Admin', 'Director', 'UTP']), async (req: Request, res: Response) => {
  try {
    const { locks } = req.body;
    const normalizedLocks = Array.isArray(locks) ? locks : [];
    const serialized = JSON.stringify(normalizedLocks);

    // 1. Persistir en PostgreSQL / MySQL (system_settings)
    try {
      const existing = await query("SELECT id FROM system_settings WHERE id = 'SET-PERIOD-LOCKS' OR config_key = 'period_locks' LIMIT 1");
      if (existing.rows && existing.rows.length > 0) {
        await query(
          "UPDATE system_settings SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 OR config_key = 'period_locks'",
          [serialized, existing.rows[0].id]
        );
      } else {
        await query(
          "INSERT INTO system_settings (id, config_key, config_value, updated_at) VALUES ('SET-PERIOD-LOCKS', 'period_locks', $1, CURRENT_TIMESTAMP)",
          [serialized]
        );
      }
    } catch (dbErr) {
      console.error('Error guardando period_locks en system_settings:', dbErr);
    }

    // 2. Persistir en local_store.json si el sistema de archivos es escribible (entorno local)
    try {
      const storePath = path.join(__dirname, '../../local_store.json');
      let store: any = {};
      if (fs.existsSync(storePath)) {
        store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      }
      store.period_locks = normalizedLocks;
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
    } catch (_) {}

    await logAudit(req, 'UPDATE_PERIOD_LOCKS', `Reglas de candados y cierre semestral actualizadas (${normalizedLocks.length} reglas)`);
    res.json({ success: true, locks: normalizedLocks });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar reglas de bloqueo.' });
  }
});

// CIERRE DE AÑO LECTIVO Y PROMOCIÓN ESCOLAR ASISTIDA MULTI-AÑO (2026 -> 2027)
router.post('/academic-year/promote', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { fromYear = 2026, toYear = 2027, studentDecisions = [] } = req.body;
  try {
    // 1. Obtener todos los alumnos del año lectivo actual
    const studentsRes = await query('SELECT * FROM students WHERE anno = $1 OR entry_year = $1 OR anno IS NULL', [fromYear]);
    const students = studentsRes.rows;

    let promotedCount = 0;
    let repeaterCount = 0;
    let transferredCount = 0;
    let graduatedCount = 0;

    // Mapa de decisiones indexado por ID y por RUN
    const decisionMap = new Map<string, { status: string; targetGrade?: string }>();
    if (Array.isArray(studentDecisions)) {
      for (const d of studentDecisions) {
        if (d.studentId) decisionMap.set(String(d.studentId), d);
        if (d.run) decisionMap.set(String(d.run).trim().toLowerCase(), d);
      }
    }

    for (const s of students) {
      const currentGrade = (s.desc_grado || '').trim();
      const currentLetter = (s.letra_curso || 'A').trim();
      const cleanRun = String(s.run || '').trim().toLowerCase();
      const decision = decisionMap.get(String(s.id)) || decisionMap.get(cleanRun);

      const chosenStatus = decision?.status || 'PROMOVIDO';

      if (chosenStatus === 'REPITENTE') {
        repeaterCount++;
        await query(
          'UPDATE students SET anno = $1, estado_matricula = $2, enrolled_by_name = $3, enrolled_by_run = $4, enrolled_by_role = $5, updated_at = NOW() WHERE id = $6',
          [toYear, 'ACTIVO', req.user?.name || 'Administrador', req.user?.run || null, req.user?.role || 'Admin', s.id]
        );
        continue;
      }

      if (chosenStatus === 'CAMBIO_LICEO' || chosenStatus === 'TRASLADO' || chosenStatus === 'RETIRADO') {
        transferredCount++;
        await query(
          "UPDATE students SET estado_matricula = 'RETIRADO', updated_at = NOW() WHERE id = $1",
          [s.id]
        );
        continue;
      }

      if (chosenStatus === 'EGRESADO') {
        graduatedCount++;
        await query(
          "UPDATE students SET estado_matricula = 'EGRESADO', updated_at = NOW() WHERE id = $1",
          [s.id]
        );
        continue;
      }

      // Progresión regular (PROMOVIDO)
      let nextGrade = decision?.targetGrade || currentGrade;
      let nextState = s.estado_matricula || 'ACTIVO';

      if (!decision?.targetGrade) {
        const low = currentGrade.toLowerCase();
        if (low.includes('pre-kinder') || low.includes('prekinder') || low.includes('1er nivel')) {
          nextGrade = `2° nivel de Transición (Kinder) ${currentLetter}`;
        } else if (low.includes('kinder') || low.includes('2° nivel')) {
          nextGrade = `1° Básico ${currentLetter}`;
        } else if (low.includes('1° básico') || low.includes('1° basico')) {
          nextGrade = `2° Básico ${currentLetter}`;
        } else if (low.includes('2° básico') || low.includes('2° basico')) {
          nextGrade = `3° Básico ${currentLetter}`;
        } else if (low.includes('3° básico') || low.includes('3° basico')) {
          nextGrade = `4° Básico ${currentLetter}`;
        } else if (low.includes('4° básico') || low.includes('4° basico')) {
          nextGrade = `5° Básico ${currentLetter}`;
        } else if (low.includes('5° básico') || low.includes('5° basico')) {
          nextGrade = `6° Básico ${currentLetter}`;
        } else if (low.includes('6° básico') || low.includes('6° basico')) {
          nextGrade = `7° Básico ${currentLetter}`;
        } else if (low.includes('7° básico') || low.includes('7° basico')) {
          nextGrade = `8° Básico ${currentLetter}`;
        } else if (low.includes('8° básico') || low.includes('8° basico')) {
          nextGrade = `1° Medio ${currentLetter}`;
        } else if (low.includes('1° medio')) {
          nextGrade = `2° Medio ${currentLetter}`;
        } else if (low.includes('2° medio')) {
          nextGrade = `3° Medio Industrial (Mecánica Industrial) ${currentLetter}`;
        } else if (low.includes('3° medio')) {
          if (low.includes('párvulo') || low.includes('parvulo') || low.includes('técnico') || low.includes('tecnico')) {
            nextGrade = `4° Medio Técnico Niños (Atención de Párvulos) ${currentLetter}`;
          } else {
            nextGrade = `4° Medio Industrial (Mecánica Industrial) ${currentLetter}`;
          }
        } else if (low.includes('4° medio')) {
          nextState = 'EGRESADO';
          graduatedCount++;
        }
      }

      if (nextState !== 'EGRESADO') {
        promotedCount++;
      }

      await query(
        'UPDATE students SET desc_grado = $1, anno = $2, estado_matricula = $3, enrolled_by_name = $4, enrolled_by_run = $5, enrolled_by_role = $6, updated_at = NOW() WHERE id = $7',
        [nextGrade, toYear, nextState, req.user?.name || 'Administrador', req.user?.run || null, req.user?.role || 'Admin', s.id]
      );
    }

    await logAudit(
      req,
      'PROMOTE_ACADEMIC_YEAR',
      `Promoción escolar asistida de ${fromYear} a ${toYear}: ${promotedCount} alumnos promovidos, ${repeaterCount} repitentes, ${transferredCount} cambios de liceo/retirados, ${graduatedCount} egresados.`
    );

    res.json({
      success: true,
      promotedCount,
      repeaterCount,
      transferredCount,
      graduatedCount,
      totalProcessed: students.length,
      fromYear,
      toYear
    });
  } catch (err) {
    console.error('Error al ejecutar promoción escolar asistida:', err);
    res.status(500).json({ error: 'Error al ejecutar la promoción de año lectivo en la base de datos.' });
  }
});

router.get('/subjects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM subjects ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener asignaturas:', err);
    res.status(500).json({ error: 'Error al obtener asignaturas.' });
  }
});

router.post('/subjects', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    await query('INSERT INTO subjects (name) VALUES ($1)', [name]);
    await logAudit(req, 'CREATE_SUBJECT', `Asignatura creada: ${name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear asignatura.' });
  }
});

router.put('/subjects/:id', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Nombre de asignatura requerido.' });
  }
  try {
    await query('UPDATE subjects SET name = $1 WHERE id = $2', [name, id]);
    await logAudit(req, 'UPDATE_SUBJECT', `Asignatura ${id} actualizada a: ${name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar asignatura.' });
  }
});

// VALIDACIÓN DE SEGURIDAD checkSubjectGrades: No borrar materias con notas ingresadas
router.delete('/subjects', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.query;
  try {
    const checkRes = await query('SELECT COUNT(*) as count FROM grade_columns gc JOIN grades g ON gc.id = g.grade_column_id WHERE gc.subject_id = $1', [id as string]);
    const count = parseInt(checkRes.rows[0]?.count || '0', 10);

    if (count > 0) {
      return res.status(400).json({ error: `No es posible eliminar la asignatura porque posee ${count} calificaciones registradas.` });
    }

    await query('DELETE FROM subjects WHERE id = $1', [id as string]);
    await logAudit(req, 'DELETE_SUBJECT', `Asignatura ${id} eliminada`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar asignatura.' });
  }
});

// -----------------------------------------------------------------------------
// 4. ASIGNACIÓN DOCENTE Y PROFESOR JEFE (LICEO PRO 2.4 & 2.9)
// -----------------------------------------------------------------------------
router.get('/assignments', authMiddleware, async (req: Request, res: Response) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_assignments (
        id VARCHAR(50) PRIMARY KEY,
        teacher_id VARCHAR(100),
        teacher_name VARCHAR(255),
        level_id VARCHAR(100),
        level_name VARCHAR(255),
        subject_id VARCHAR(100),
        subject_name VARCHAR(255),
        academic_year INT DEFAULT 2026,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => { });

    const result = await query('SELECT * FROM teacher_assignments ORDER BY level_name ASC, subject_name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar asignaciones docentes.' });
  }
});

router.post('/assignments', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { teacherId, teacherName, levelId, levelName, subjectId, subjectName, academicYear } = req.body;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS teacher_assignments (
        id VARCHAR(50) PRIMARY KEY,
        teacher_id VARCHAR(100),
        teacher_name VARCHAR(255),
        level_id VARCHAR(100),
        level_name VARCHAR(255),
        subject_id VARCHAR(100),
        subject_name VARCHAR(255),
        academic_year INT DEFAULT 2026,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => { });

    const id = `ASN-${Date.now()}`;
    await query(
      `INSERT INTO teacher_assignments (id, teacher_id, teacher_name, level_id, level_name, subject_id, subject_name, academic_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, String(teacherId), teacherName || teacherId, String(levelId), levelName || levelId, String(subjectId), subjectName || subjectId, academicYear || 2026]
    );

    await logAudit(req, 'CREATE_ASSIGNMENT', `Asignación docente de ${subjectName} en ${levelName} a ${teacherName}`);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Error al crear asignación:', err);
    res.status(500).json({ error: 'Error al registrar asignación docente.' });
  }
});

router.delete('/assignments/:id', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM teacher_assignments WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_ASSIGNMENT', `Asignación docente ${id} eliminada`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar asignación docente.' });
  }
});

// -----------------------------------------------------------------------------
// 5. CALIFICACIONES, EVALUACIONES Y PANORAMA GENERAL (LICEO PRO 2.11 - 2.13)
// -----------------------------------------------------------------------------
router.get('/grade-columns', authMiddleware, async (req: Request, res: Response) => {
  const { levelId, subjectId, academicYear, period } = req.query;
  try {
    let sql = `
      SELECT gc.* 
      FROM grade_columns gc
      LEFT JOIN subjects s ON CAST(gc.subject_id AS TEXT) = CAST(s.id AS TEXT)
      LEFT JOIN levels l ON CAST(gc.level_id AS TEXT) = CAST(l.id AS TEXT)
      WHERE (CAST(gc.level_id AS TEXT) = $1 OR CAST(l.id AS TEXT) = $1 OR l.name = $1)
        AND (CAST(gc.subject_id AS TEXT) = $2 OR CAST(s.id AS TEXT) = $2 OR s.name = $2)
        AND (gc.academic_year = $3 OR gc.academic_year IS NULL)
    `;
    const params: any[] = [String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10)];
    if (period) {
      sql += ' AND (gc.period = $' + (params.length + 1) + ' OR gc.period IS NULL)';
      params.push(String(period));
    }
    sql += ' ORDER BY gc.position ASC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener columnas de evaluación.' });
  }
});

router.post('/grade-columns', authMiddleware, checkRoles(['Admin', 'Docente']), async (req: Request, res: Response) => {
  const { levelId, subjectId, academicYear, title, weighting, position, is_cumulative } = req.body;
  try {
    const colId = `COL-${Date.now()}`;
    await query(
      `INSERT INTO grade_columns (id, level_id, subject_id, academic_year, title, weighting, position, is_cumulative) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [colId, String(levelId), String(subjectId), academicYear || 2026, title, weighting || 0, position || 1, is_cumulative ? 1 : 0]
    ).catch(async () => {
      await query(
        `INSERT INTO grade_columns (id, level_id, subject_id, academic_year, title, weighting, position) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [colId, String(levelId), String(subjectId), academicYear || 2026, title, weighting || 0, position || 1]
      );
    });

    await logAudit(req, 'CREATE_GRADE_COLUMN', `Columna de evaluación "${title}" creada en BD`, String(levelId), String(subjectId));
    res.json({ success: true, id: colId });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear columna de evaluación en la base de datos.' });
  }
});

// PANORAMA GLOBAL DE NOTAS POR CURSO Y ASIGNATURA (DESDE BASE DE DATOS)
router.get('/grades/overview', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT l.name as level_name, s.name as subject_name, ROUND(AVG(g.grade_value), 1) as promedio_general,
              SUM(CASE WHEN g.grade_value >= 4.0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(g.grade_value), 0) as porcentaje_aprobacion
       FROM grades g
       JOIN grade_columns gc ON g.grade_column_id = gc.id
       JOIN levels l ON CAST(gc.level_id AS TEXT) = CAST(l.id AS TEXT)
       JOIN subjects s ON CAST(gc.subject_id AS TEXT) = CAST(s.id AS TEXT)
       GROUP BY l.name, s.name`
    );

    let atRiskStudents: any[] = [];
    try {
      const riskRes = await query(`
        SELECT s.id, s.run, s.full_name, s.desc_grado as level_name,
               ROUND(AVG(g.grade_value), 1) as promedio,
               SUM(CASE WHEN g.grade_value < 4.0 THEN 1 ELSE 0 END) as asignaturas_reprobadas,
               CASE
                 WHEN AVG(g.grade_value) < 3.5 THEN 'Riesgo Crítico'
                 WHEN AVG(g.grade_value) < 4.0 THEN 'Riesgo Medio'
                 ELSE 'En Seguimiento'
               END as estado
        FROM students s
        JOIN grades g ON s.id = g.student_id
        GROUP BY s.id, s.run, s.full_name, s.desc_grado
        HAVING AVG(g.grade_value) < 4.0
        ORDER BY promedio ASC
        LIMIT 15
      `);
      atRiskStudents = riskRes.rows || [];
    } catch (_) {
      atRiskStudents = [];
    }

    res.json({
      overview: result.rows,
      atRiskStudents
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar el panorama general de notas.' });
  }
});

// Helper de normalización oficial MINEDUC para cursos
const getNormalizedStudentCourse = (s: any): string => {
  if (!s) return 'Sin Curso';
  let raw = (s.desc_grado || s.level_name || s.course || s.name || '').trim();
  const letterStr = s.letra_curso ? String(s.letra_curso).trim() : '';
  const codEnse = parseInt(String(s.cod_tipo_ensenanza || s.cod_ense || 0), 10);

  let letter = letterStr;
  if (!letter) {
    const parts = raw.split(' ');
    const lastWord = parts[parts.length - 1] || '';
    if (['A', 'B', 'C', 'D'].includes(lastWord.toUpperCase())) {
      letter = lastWord.toUpperCase();
    }
  }
  if (!letter) letter = 'A';

  const low = raw.toLowerCase();
  if (low.includes('pre-kinder') || low.includes('prekinder') || low.includes('1er nivel')) return `1er nivel de Transición (Pre-kinder) ${letter}`;
  if (low.includes('kinder') || low.includes('2° nivel')) return `2° nivel de Transición (Kinder) ${letter}`;
  if (low.includes('1° básico') || low.includes('1° basico') || low.includes('1 basico')) return `1° Básico ${letter}`;
  if (low.includes('2° básico') || low.includes('2° basico') || low.includes('2 basico')) return `2° Básico ${letter}`;
  if (low.includes('3° básico') || low.includes('3° basico') || low.includes('3 basico')) return `3° Básico ${letter}`;
  if (low.includes('4° básico') || low.includes('4° basico') || low.includes('4 basico')) return `4° Básico ${letter}`;
  if (low.includes('5° básico') || low.includes('5° basico') || low.includes('5 basico')) return `5° Básico ${letter}`;
  if (low.includes('6° básico') || low.includes('6° basico') || low.includes('6 basico')) return `6° Básico ${letter}`;
  if (low.includes('7° básico') || low.includes('7° basico') || low.includes('7 basico')) return `7° Básico ${letter}`;
  if (low.includes('8° básico') || low.includes('8° basico') || low.includes('8 basico')) return `8° Básico ${letter}`;
  if (low.includes('laboral')) return `Laboral 1 ${letter}`;
  if (low.includes('1° medio') || low.includes('1 medio')) return `1° Medio ${letter}`;
  if (low.includes('2° medio') || low.includes('2 medio')) return `2° Medio ${letter}`;
  if (low.includes('3° medio') || low.includes('3 medio')) {
    if (codEnse === 510 || low.includes('industrial') || low.includes('mecánica') || low.includes('mecanica') || low.includes('510')) {
      return `3° Medio Industrial (Mecánica Industrial) ${letter}`;
    }
    if (codEnse === 610 || low.includes('párvulo') || low.includes('parvulo') || low.includes('técnico') || low.includes('tecnico') || low.includes('610')) {
      return `3° Medio Técnico Niños (Atención de Párvulos) ${letter}`;
    }
    return `3° Medio Industrial (Mecánica Industrial) ${letter}`;
  }
  if (low.includes('4° medio') || low.includes('4 medio')) {
    if (codEnse === 510 || low.includes('industrial') || low.includes('mecánica') || low.includes('mecanica') || low.includes('510')) {
      return `4° Medio Industrial (Mecánica Industrial) ${letter}`;
    }
    if (codEnse === 610 || low.includes('párvulo') || low.includes('parvulo') || low.includes('técnico') || low.includes('tecnico') || low.includes('610')) {
      return `4° Medio Técnico Niños (Atención de Párvulos) ${letter}`;
    }
    return `4° Medio Industrial (Mecánica Industrial) ${letter}`;
  }
  return raw || 'Sin Curso';
};

const getCourseSortRankHelper = (courseName: string): number => {
  if (!courseName) return 999;
  const name = String(courseName).toLowerCase().trim();
  if (name.includes('pre-kinder') || name.includes('prekinder') || name.includes('1er nivel')) return 10;
  if (name.includes('kinder') || name.includes('2° nivel')) return 20;
  if (name.includes('1° básico') || name.includes('1° basico') || name.includes('1 basico')) return 110;
  if (name.includes('2° básico') || name.includes('2° basico') || name.includes('2 basico')) return 120;
  if (name.includes('3° básico') || name.includes('3° basico') || name.includes('3 basico')) return 130;
  if (name.includes('4° básico') || name.includes('4° basico') || name.includes('4 basico')) return 140;
  if (name.includes('5° básico') || name.includes('5° basico') || name.includes('5 basico')) return 150;
  if (name.includes('6° básico') || name.includes('6° basico') || name.includes('6 basico')) return 160;
  if (name.includes('7° básico') || name.includes('7° basico') || name.includes('7 basico')) return 170;
  if (name.includes('8° básico') || name.includes('8° basico') || name.includes('8 basico')) return 180;
  if (name.includes('laboral')) return 250;
  if (name.includes('1° medio') || name.includes('1 medio')) return 310;
  if (name.includes('2° medio') || name.includes('2 medio')) return 320;
  if (name.includes('3° medio') || name.includes('3 medio')) {
    if (name.includes('industrial') || name.includes('mecánica') || name.includes('mecanica') || name.includes('510')) return 350;
    if (name.includes('párvulos') || name.includes('parvulos') || name.includes('parvulo') || name.includes('técnico') || name.includes('tecnico') || name.includes('610')) return 360;
    return 355;
  }
  if (name.includes('4° medio') || name.includes('4 medio')) {
    if (name.includes('industrial') || name.includes('mecánica') || name.includes('mecanica') || name.includes('510')) return 400;
    if (name.includes('párvulos') || name.includes('parvulos') || name.includes('parvulo') || name.includes('técnico') || name.includes('tecnico') || name.includes('610')) return 410;
    return 405;
  }
  return 900;
};

const sortCoursesListHelper = (courses: string[]): string[] => {
  return [...courses].sort((a, b) => {
    const rankA = getCourseSortRankHelper(a);
    const rankB = getCourseSortRankHelper(b);
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
  });
};

const isStudentRetiredHelper = (s: any): boolean => {
  if (!s) return false;
  if (s.is_retired === 1 || s.is_retired === '1' || s.is_retired === true || s.is_retired === 'true') return true;
  if (s.status && (String(s.status).toLowerCase().includes('retirad') || String(s.status).toLowerCase().includes('inactive') || String(s.status).toLowerCase() === 'withdrawn')) return true;
  if (s.is_retired === 0 && String(s.status || '').toLowerCase() === 'active') return false;
  const wd = s.withdrawal_date ? String(s.withdrawal_date).trim() : '';
  if (wd && wd !== 'null' && wd !== 'Invalid Date' && !wd.startsWith('1899') && !wd.startsWith('1900') && !wd.startsWith('0000')) return true;
  const fr = s.fecha_retiro ? String(s.fecha_retiro).trim() : '';
  if (fr && fr !== 'null' && !fr.startsWith('1899') && !fr.startsWith('1900') && !fr.startsWith('0000')) return true;
  return false;
};

// HELPERS PARA ASIGNATURAS CONCEPTUALES (RELIGIÓN Y ORIENTACIÓN - DECRETO 67 Y DECRETO 924 MINEDUC)
const isConceptualSubjectHelper = (name: string): boolean => {
  const norm = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return norm.includes('religion') || norm.includes('orientacion');
};

const numberToConceptHelper = (val: number | string): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || num <= 0) return '-';
  if (num >= 6.0) return 'MB';
  if (num >= 5.0) return 'B';
  if (num >= 4.0) return 'S';
  return 'I';
};

const conceptToNumberHelper = (concept: string): number => {
  const c = (concept || '').toUpperCase().trim();
  if (c === 'MB' || c === 'M') return 7.0;
  if (c === 'B') return 5.5;
  if (c === 'S') return 4.5;
  if (c === 'I') return 3.0;
  const n = parseFloat(concept);
  return isNaN(n) ? 7.0 : n;
};

// ENDPOINT DE PANORAMA DE NOTAS DINÁMICO DESDE BASE DE DATOS POR CURSO
router.get('/grades/course-overview', authMiddleware, async (req: Request, res: Response) => {
  const { courseName, year, period, onlyRed } = req.query;
  const course = (courseName as string) || '1° Básico A';
  const selectedYear = parseInt((year as string) || '2026', 10);
  const selectedPeriod = (period as string) || '1er Semestre';
  const isOnlyRed = onlyRed === 'true';

  try {
    // 1. Alumnos reales del curso (o de toda la institución si se selecciona TODOS)
    const isAllCourses = !course || course.toUpperCase() === 'TODOS';
    const allStudentsRes = await query(`SELECT * FROM students ORDER BY list_number ASC, full_name ASC`);
    const allDbStudents = allStudentsRes.rows;

    const dbStudents = isAllCourses
      ? allDbStudents
      : allDbStudents.filter((s: any) => {
        const norm = getNormalizedStudentCourse(s);
        return norm.toLowerCase() === course.toLowerCase() ||
          s.desc_grado === course ||
          `${s.desc_grado} ${s.letra_curso}`.trim().toLowerCase() === course.toLowerCase();
      });

    // 2. Asignaciones y asignaturas del curso
    const subjectsRes = await query(`SELECT * FROM subjects ORDER BY id ASC`);
    const dbSubjects = subjectsRes.rows;

    const assignmentsRes = await query(
      `SELECT * FROM teacher_assignments WHERE (academic_year = $1 OR academic_year IS NULL)`,
      [selectedYear]
    ).catch(() => ({ rows: [] }));
    const allAssignments = assignmentsRes.rows || [];

    let courseOrdersMap: Record<string, any[]> = {};
    try {
      const dbOrders = await query("SELECT config_value FROM system_settings WHERE config_key = 'course_subject_orders' LIMIT 1");
      if (dbOrders.rows && dbOrders.rows[0]?.config_value) {
        courseOrdersMap = JSON.parse(dbOrders.rows[0].config_value);
      }
    } catch (_) {}

    // 3. Notas reales registradas para los alumnos correspondientes
    let gradesRows: any[] = [];
    if (dbStudents.length > 0) {
      const gradesRes = await query(
        `SELECT g.*, 
                COALESCE(CAST(gc.subject_id AS TEXT), CAST(g.subject_id AS TEXT), '1') as subject_id, 
                COALESCE(gc.title, g.evaluation_name, 'Nota') as col_title, 
                COALESCE(s.name, g.subject_name, '') as subject_name
         FROM grades g
         LEFT JOIN grade_columns gc ON g.grade_column_id = gc.id
         LEFT JOIN subjects s ON (CAST(gc.subject_id AS TEXT) = CAST(s.id AS TEXT) OR CAST(g.subject_id AS TEXT) = CAST(s.id AS TEXT))
         WHERE (g.academic_year = $1 OR gc.academic_year = $1 OR g.academic_year IS NULL)`,
        [selectedYear]
      );
      if (isAllCourses) {
        gradesRows = gradesRes.rows;
      } else {
        const studentIdSet = new Set(dbStudents.map(s => s.id));
        gradesRows = gradesRes.rows.filter((g: any) => studentIdSet.has(g.student_id));
      }

      // Filtrar por período si no es 'Anual'
      if (selectedPeriod && selectedPeriod !== 'Anual') {
        gradesRows = gradesRows.filter((g: any) => !g.period || g.period === selectedPeriod);
      }
    }

    // Filtrar asignaciones asociadas a este curso
    const courseAssigns = isAllCourses ? allAssignments : allAssignments.filter((a: any) => {
      const normA = (a.level_name || a.level_id || '').toLowerCase().trim();
      const normC = course.toLowerCase().trim();
      return normA === normC || normA.includes(normC) || normC.includes(normA);
    });

    const assignedSubjectNames = new Set<string>();
    const assignedSubjectIds = new Set<string>();
    const assignTeacherMap = new Map<string, string>();

    courseAssigns.forEach((a: any) => {
      const rawTeacher = (a.teacher_name || '').trim();
      const isAssigned = Boolean(rawTeacher && rawTeacher.toLowerCase() !== 'sin asignar');
      const sName = (a.subject_name || '').trim().toLowerCase();
      if (isAssigned) {
        if (sName) assignedSubjectNames.add(sName);
        if (a.subject_id) assignedSubjectIds.add(String(a.subject_id));
      }
      const tName = a.teacher_name_2 ? `${a.teacher_name} / ${a.teacher_name_2}` : (rawTeacher || 'Sin Asignar');
      if (sName && (!assignTeacherMap.has(sName) || assignTeacherMap.get(sName) === 'Sin Asignar')) assignTeacherMap.set(sName, tName);
      if (a.subject_id && (!assignTeacherMap.has(String(a.subject_id)) || assignTeacherMap.get(String(a.subject_id)) === 'Sin Asignar')) assignTeacherMap.set(String(a.subject_id), tName);
    });

    if (!isAllCourses && courseOrdersMap[course] && Array.isArray(courseOrdersMap[course])) {
      courseOrdersMap[course].forEach((s: any) => {
        if (s.name) assignedSubjectNames.add(s.name.trim().toLowerCase());
        if (s.id) assignedSubjectIds.add(String(s.id));
      });
    }

    // Incluir también cualquier asignatura que tenga notas reales en este curso
    gradesRows.forEach((g: any) => {
      if (g.subject_name) assignedSubjectNames.add(g.subject_name.trim().toLowerCase());
      if (g.subject_id) assignedSubjectIds.add(String(g.subject_id));
    });

    // Seleccionar asignaturas relevantes para este curso
    let relevantSubjects: any[] = [];
    if (isAllCourses) {
      relevantSubjects = dbSubjects;
    } else {
      relevantSubjects = dbSubjects.filter((sb: any) => {
        const sName = (sb.name || '').trim().toLowerCase();
        return assignedSubjectNames.has(sName) || assignedSubjectIds.has(String(sb.id));
      });

      if (relevantSubjects.length === 0 && courseAssigns.length > 0) {
        relevantSubjects = courseAssigns.map((a: any, idx: number) => ({
          id: a.subject_id || (idx + 1),
          name: a.subject_name,
          academic_year: selectedYear
        }));
      }
    }

    // Deduplicar asignaturas por nombre normalizado
    const seenSubjNames = new Set<string>();
    const courseSubjects = relevantSubjects.filter((sb: any) => {
      const n = (sb.name || '').trim().toLowerCase();
      if (seenSubjNames.has(n)) return false;
      seenSubjNames.add(n);
      return true;
    });

    // Ordenar asignaturas respetando el orden oficial si existe
    if (!isAllCourses && courseOrdersMap[course] && Array.isArray(courseOrdersMap[course])) {
      const orderList = courseOrdersMap[course].map((s: any) => s.name.trim().toLowerCase());
      courseSubjects.sort((a: any, b: any) => {
        const idxA = orderList.indexOf(a.name.trim().toLowerCase());
        const idxB = orderList.indexOf(b.name.trim().toLowerCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      });
    }

    // 4. Mapeo de notas y cálculo de estadísticas reales
    let totalAzules = 0;
    let totalRojas = 0;
    let sumGradedValues = 0;
    let countGradedValues = 0;

    // Estructura por alumno
    const mappedStudents = dbStudents.map((st, idx) => {
      const studentGrades = gradesRows.filter(g => g.student_id === st.id);
      let stAzules = 0;
      let stRojas = 0;
      let stSum = 0;
      let stCount = 0;
      const subjectGrades: Record<string, any> = {};
      const alerts: { subject: string; grade: number; concept?: string }[] = [];

      // Agrupar por asignatura relevante del curso
      courseSubjects.forEach(sb => {
        const isConceptual = isConceptualSubjectHelper(sb.name);
        const sbGrades = studentGrades.filter(g => String(g.subject_id) === String(sb.id) || (g.subject_name && g.subject_name.trim().toLowerCase() === sb.name.trim().toLowerCase()));
        if (sbGrades.length > 0) {
          let sbSum = 0;
          let manualFinalConcept = '';

          const gradeDetails = sbGrades.map(g => {
            const val = parseFloat(g.grade_value);
            const colTitleNorm = (g.col_title || g.evaluation_name || '').toLowerCase();
            const isFinalCol = colTitleNorm.includes('promedio') || (g.grade_column_id && String(g.grade_column_id).includes('FINAL'));

            if (isConceptual && isFinalCol) {
              manualFinalConcept = numberToConceptHelper(val);
            }

            if (!isConceptual) {
              sbSum += val;
              stSum += val;
              stCount++;
              sumGradedValues += val;
              countGradedValues++;

              if (val >= 4.0) {
                stAzules++;
                totalAzules++;
              } else {
                stRojas++;
                totalRojas++;
              }
            } else {
              // Asignatura conceptual (Religión / Orientación - Decreto 67 / 924):
              // Excluida del promedio general numérico institucional (GPA), pero se registran sus conceptos.
              if (!isFinalCol) {
                sbSum += val;
              }
              if (val >= 4.0) {
                stAzules++;
                totalAzules++;
              } else {
                stRojas++;
                totalRojas++;
              }
            }

            return {
              label: g.col_title || 'Nota',
              value: val,
              concept: isConceptual ? numberToConceptHelper(val) : undefined
            };
          });

          if (isConceptual) {
            let finalConcept: string = '-';
            let sbAvg: number = 0;

            if (manualFinalConcept) {
              finalConcept = manualFinalConcept;
              sbAvg = conceptToNumberHelper(manualFinalConcept);
            } else {
              const evalGrades = gradeDetails.filter(g => !g.label.toLowerCase().includes('promedio'));
              const avgNum = evalGrades.length > 0 ? (sbSum / evalGrades.length) : (gradeDetails.length > 0 ? gradeDetails[0].value : 0);
              finalConcept = numberToConceptHelper(avgNum);
              sbAvg = Math.round(avgNum * 10) / 10;
            }

            const status = finalConcept === 'I' ? 'REPROBADO' : (finalConcept !== '-' ? 'APROBADO' : 'SIN NOTAS');
            if (finalConcept === 'I') {
              alerts.push({ subject: sb.name, grade: sbAvg, concept: 'I' });
            }

            subjectGrades[sb.name] = {
              subjectName: sb.name,
              isConceptual: true,
              average: finalConcept,
              numericAverage: sbAvg,
              status,
              grades: gradeDetails
            };
          } else {
            const sbAvg = Math.round((sbSum / sbGrades.length) * 10) / 10;
            const status = sbAvg >= 4.0 ? 'APROBADO' : 'REPROBADO';

            if (sbAvg < 4.0) {
              alerts.push({ subject: sb.name, grade: sbAvg });
            }

            subjectGrades[sb.name] = {
              subjectName: sb.name,
              isConceptual: false,
              average: sbAvg,
              status,
              grades: gradeDetails
            };
          }
        } else {
          subjectGrades[sb.name] = {
            subjectName: sb.name,
            isConceptual,
            average: '-',
            status: 'SIN NOTAS',
            grades: []
          };
        }
      });

      const stAverage = stCount > 0 ? Math.round((stSum / stCount) * 10) / 10 : 0;

      return {
        number: st.list_number || (idx + 1),
        id: st.id,
        fullName: st.full_name,
        run: st.run,
        course: course,
        azules: stAzules,
        rojas: stRojas,
        promedioGeneral: stAverage,
        alerts,
        subjectGrades
      };
    });

    // Columnas de evaluación existentes para calcular el total esperado real
    let dbGradeCols: any[] = [];
    try {
      const gradeColsRes = await query(`SELECT * FROM grade_columns WHERE academic_year = $1`, [selectedYear]);
      dbGradeCols = gradeColsRes.rows;
    } catch (_) { }

    // Determinar niveles (level_id) asociados a este curso para filtrar exclusivamente sus columnas
    let dbLevels: any[] = [];
    try {
      const lvlRes = await query(`SELECT * FROM levels`);
      dbLevels = lvlRes.rows;
    } catch (_) { }

    const rawAllCourses = Array.from(new Set(allDbStudents.map((s: any) => getNormalizedStudentCourse(s)).filter(Boolean))) as string[];
    const sortedNonParvularia = sortCoursesListHelper(rawAllCourses).filter((c: string) => {
      const low = c.toLowerCase();
      return !low.includes('pre-kinder') && !low.includes('kinder') && !low.includes('transición');
    });

    const calculatedLevelId = String(sortedNonParvularia.indexOf(course) + 1);
    const matchingLevelDbIds = dbLevels
      .filter((l: any) => l.name && (l.name.toLowerCase() === course.toLowerCase() || getNormalizedStudentCourse(l).toLowerCase() === course.toLowerCase()))
      .map((l: any) => String(l.id));

    const courseLevelIds = new Set<string>([calculatedLevelId, ...matchingLevelDbIds].filter(id => id && id !== '0'));

    // Separar alumnos activos y retirados del curso
    const activeStudents = dbStudents.filter(s => !isStudentRetiredHelper(s));
    const retiredStudents = dbStudents.filter(s => isStudentRetiredHelper(s));

    // Estructura por asignatura del curso (solo asignaturas relevantes)
    const mappedSubjects = courseSubjects.map(sb => {
      const isConceptual = isConceptualSubjectHelper(sb.name);
      const sbGradesAll = gradesRows.filter(g => String(g.subject_id) === String(sb.id) || (g.subject_name && g.subject_name.trim().toLowerCase() === sb.name.trim().toLowerCase()));
      const regCount = sbGradesAll.length;
      let sbSumTotal = 0;
      let nonFinalCount = 0;
      sbGradesAll.forEach(g => {
        const val = parseFloat(g.grade_value);
        const colTitleNorm = (g.col_title || g.evaluation_name || '').toLowerCase();
        const isFinalCol = colTitleNorm.includes('promedio') || (g.grade_column_id && String(g.grade_column_id).includes('FINAL'));
        if (!isConceptual || !isFinalCol) {
          sbSumTotal += val;
          nonFinalCount++;
        }
      });

      const effectiveCount = (isConceptual && nonFinalCount > 0) ? nonFinalCount : regCount;
      const courseAvg = effectiveCount > 0 ? Math.round((sbSumTotal / effectiveCount) * 10) / 10 : 0;
      const conceptAvg = isConceptual ? (effectiveCount > 0 ? numberToConceptHelper(courseAvg) : '-') : undefined;
      const status = regCount > 0 ? 'CON NOTAS' : 'SIN NOTAS';

      // Docente asignado real
      const sName = (sb.name || '').trim().toLowerCase();
      const teacherName = assignTeacherMap.get(sName) || assignTeacherMap.get(String(sb.id)) || 'Sin Asignar';

      // Identificar las columnas reales creadas para este curso y asignatura en este período
      const matchingColsInDb = dbGradeCols.filter((gc: any) => {
        const matchSub = String(gc.subject_id) === String(sb.id) || (gc.subject_name && gc.subject_name.trim().toLowerCase() === sName);
        const matchLvl = isAllCourses ? true : courseLevelIds.has(String(gc.level_id));
        const matchPeriod = (!selectedPeriod || selectedPeriod === 'Anual') ? true : (!gc.period || gc.period === selectedPeriod);
        return matchSub && matchLvl && matchPeriod;
      });

      // Identificar IDs de columnas con calificaciones registradas en este curso
      const colsFromGrades = Array.from(new Set(sbGradesAll.map((g: any) => g.grade_column_id).filter(Boolean)));
      
      const distinctColsCount = Array.from(new Set([
        ...matchingColsInDb.map((c: any) => c.id || c.title),
        ...colsFromGrades
      ])).length;

      // Por defecto en la planilla de notas existe siempre N1 (1 evaluación inicial)
      const effectiveColumnsCount = Math.max(1, distinctColsCount);

      // CÁLCULO EXACTO DEL TOTAL ESPERADO Y DESCUENTO DE ALUMNOS RETIRADOS:
      let maxExpectedNotes = activeStudents.length * effectiveColumnsCount;

      retiredStudents.forEach(ret => {
        const retGrades = sbGradesAll.filter((g: any) => g.student_id === ret.id);
        if (retGrades.length > 0) {
          maxExpectedNotes += Math.min(effectiveColumnsCount, retGrades.length);
        }
      });

      return {
        name: sb.name,
        teacher: teacherName,
        status,
        registeredCount: regCount,
        maxCount: maxExpectedNotes,
        percentage: maxExpectedNotes > 0 ? Math.min(100, Math.round((regCount / maxExpectedNotes) * 100)) : 0,
        courseAverage: courseAvg,
        isConceptual,
        conceptAverage: conceptAvg
      };
    });

    const totalCalificaciones = totalAzules + totalRojas;
    const promedioCursoGeneral = countGradedValues > 0 ? Math.round((sumGradedValues / countGradedValues) * 10) / 10 : 0;
    const alumnosRiesgoCount = mappedStudents.filter(st => st.promedioGeneral > 0 && (st.promedioGeneral < 4.0 || st.rojas > 0)).length;
    const alumnosBajoCuatroCount = mappedStudents.filter(st => st.promedioGeneral > 0 && st.promedioGeneral < 4.0).length;

    res.json({
      courseName: course,
      promedioCurso: promedioCursoGeneral,
      alumnosRegistrados: dbStudents.length,
      alumnosActivos: activeStudents.length,
      alumnosRetirados: retiredStudents.length,
      calificacionesTotales: totalCalificaciones,
      azulesTotales: totalAzules,
      azulesPorcentaje: totalCalificaciones > 0 ? Math.round((totalAzules / totalCalificaciones) * 1000) / 10 : 0,
      rojasTotales: totalRojas,
      rojasPorcentaje: totalCalificaciones > 0 ? Math.round((totalRojas / totalCalificaciones) * 1000) / 10 : 0,
      alumnosEnRiesgo: alumnosRiesgoCount,
      alumnosBajoCuatro: alumnosBajoCuatroCount,
      subjects: mappedSubjects,
      students: mappedStudents
    });
  } catch (err) {
    console.error('Error al generar panorama de notas:', err);
    res.status(500).json({ error: 'Error al consultar panorama de notas desde Supabase.' });
  }
});

// GET /api/grades
router.get('/grades', authMiddleware, async (req: Request, res: Response) => {
  const { levelId, subjectId, academicYear, period } = req.query;
  try {
    let sql = `SELECT g.*, 
              COALESCE(gc.level_id, g.level_id) as level_id, 
              COALESCE(gc.subject_id, g.subject_id) as subject_id, 
              COALESCE(gc.academic_year, g.academic_year) as academic_year
       FROM grades g
       LEFT JOIN grade_columns gc ON g.grade_column_id = gc.id
       LEFT JOIN subjects s ON (CAST(gc.subject_id AS TEXT) = CAST(s.id AS TEXT) OR CAST(g.subject_id AS TEXT) = CAST(s.id AS TEXT))
       LEFT JOIN levels l ON (CAST(gc.level_id AS TEXT) = CAST(l.id AS TEXT) OR CAST(g.level_id AS TEXT) = CAST(l.id AS TEXT))
       WHERE (CAST(gc.level_id AS TEXT) = $1 OR CAST(g.level_id AS TEXT) = $1 OR g.course_name = $1 OR l.name = $1 OR CAST(l.id AS TEXT) = $1) 
         AND (CAST(gc.subject_id AS TEXT) = $2 OR CAST(g.subject_id AS TEXT) = $2 OR g.subject_name = $2 OR s.name = $2 OR CAST(s.id AS TEXT) = $2) 
         AND (gc.academic_year = $3 OR g.academic_year = $3 OR g.academic_year IS NULL)`;
    const params: any[] = [String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10)];
    if (period) {
      sql += ' AND (g.period = $' + (params.length + 1) + ' OR g.period IS NULL)';
      params.push(String(period));
    }
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener calificaciones.' });
  }
});

// POST /api/grades (GUARDAR NOTA)
router.post('/grades', authMiddleware, checkRoles(['Admin', 'Docente']), async (req: Request, res: Response) => {
  const { studentId, gradeColumnId, gradeValue, period, levelId, subjectId, academicYear } = req.body;
  try {
    // 1. Verificar bloqueo semestral / por curso / asignatura
    if (await isGradeEntryLocked(levelId, subjectId, period || '1er Semestre')) {
      return res.status(403).json({ error: `El ingreso y edición de calificaciones para ${period || 'este semestre'} se encuentra bloqueado por Cierre Semestral.` });
    }

    // 2. REGLA MINEDUC: Si un estudiante está retirado, no admite nuevas calificaciones
    const stCheck = await query('SELECT is_retired, status, withdrawal_date FROM students WHERE id = $1 OR run = $1 LIMIT 1', [studentId]);
    if (stCheck.rows.length > 0 && isStudentRetiredHelper(stCheck.rows[0])) {
      return res.status(400).json({ error: 'No se pueden registrar calificaciones para un estudiante retirado.' });
    }

    let valNum = parseFloat(gradeValue);
    if (isNaN(valNum)) {
      valNum = conceptToNumberHelper(gradeValue);
    }

    const gradeId = `GRD-${studentId}-${gradeColumnId}`;
    await query(
      `INSERT INTO grades (id, student_id, grade_column_id, grade_value, period, level_id, subject_id, academic_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, grade_column_id)
       DO UPDATE SET grade_value = EXCLUDED.grade_value, period = EXCLUDED.period, level_id = EXCLUDED.level_id, subject_id = EXCLUDED.subject_id, academic_year = EXCLUDED.academic_year`,
      [gradeId, studentId, gradeColumnId, valNum, period || '1er Semestre', String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10)]
    );

    await logAudit(req, 'SAVE_GRADE', `Nota ${gradeValue} registrada para estudiante ${studentId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al guardar la calificación:', err);
    res.status(500).json({ error: 'Error al guardar la calificación.' });
  }
});

// POST /api/grades/batch (GUARDADO MASIVO DE CALIFICACIONES)
router.post('/grades/batch', authMiddleware, checkRoles(['Admin', 'Docente']), async (req: Request, res: Response) => {
  const { grades } = req.body;
  if (!Array.isArray(grades) || grades.length === 0) {
    return res.json({ success: true, count: 0 });
  }

  try {
    const sample = grades[0];
    if (sample && (await isGradeEntryLocked(sample.levelId, sample.subjectId, sample.period || '1er Semestre'))) {
      return res.status(403).json({ error: `El ingreso y edición de calificaciones para ${sample.period || 'este semestre'} se encuentra bloqueado por Cierre Semestral.` });
    }

    // Excluir automáticamente a cualquier estudiante retirado
    const validGrades: any[] = [];
    for (const g of grades) {
      const stCheck = await query('SELECT is_retired, status, withdrawal_date FROM students WHERE id = $1 OR run = $1 LIMIT 1', [g.studentId]);
      if (stCheck.rows.length === 0 || !isStudentRetiredHelper(stCheck.rows[0])) {
        validGrades.push(g);
      }
    }

    for (const g of validGrades) {
      let valNum = parseFloat(g.gradeValue);
      if (isNaN(valNum)) {
        valNum = conceptToNumberHelper(g.gradeValue);
      }

      const gradeId = `GRD-${g.studentId}-${g.gradeColumnId}`;
      await query(
        `INSERT INTO grades (id, student_id, grade_column_id, grade_value, period, level_id, subject_id, academic_year)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_id, grade_column_id)
         DO UPDATE SET grade_value = EXCLUDED.grade_value, period = EXCLUDED.period, level_id = EXCLUDED.level_id, subject_id = EXCLUDED.subject_id, academic_year = EXCLUDED.academic_year`,
        [gradeId, g.studentId, g.gradeColumnId, valNum, g.period || '1er Semestre', String(g.levelId || 1), String(g.subjectId || 1), parseInt(String(g.academicYear || 2026), 10)]
      );
    }

    await logAudit(req, 'SAVE_GRADES_BATCH', `Guardado masivo de ${validGrades.length} calificaciones`);
    res.json({ success: true, count: validGrades.length });
  } catch (err) {
    console.error('Error al guardar calificaciones masivas:', err);
    res.status(500).json({ error: 'Error al guardar calificaciones masivas.' });
  }
});

// POST /api/grade-columns/rename (RENOMBRAR EVALUACIÓN)
router.post('/grade-columns/rename', authMiddleware, checkRoles(['Admin', 'Docente']), async (req: Request, res: Response) => {
  const { id, title } = req.body;
  try {
    await query('UPDATE grade_columns SET title = $1 WHERE id = $2', [title, id]);
    await logAudit(req, 'RENAME_GRADE_COLUMN', `Columna de evaluación renombrada a "${title}"`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al renombrar la evaluación.' });
  }
});

// -----------------------------------------------------------------------------
// SISTEMA DE EVALUACIONES Y NOTAS ACUMULATIVAS (SUB-EVALUACIONES DINÁMICAS)
// -----------------------------------------------------------------------------
async function ensureCumulativeTablesExist() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS grade_columns (
        id VARCHAR(100) PRIMARY KEY,
        level_id VARCHAR(50),
        subject_id VARCHAR(50),
        academic_year INT DEFAULT 2026,
        title VARCHAR(255) NOT NULL,
        weighting DECIMAL(5,2) DEFAULT 0,
        position INT DEFAULT 1,
        is_cumulative TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `).catch(() => { });

    await query(`
      CREATE TABLE IF NOT EXISTS grades (
        id VARCHAR(150) PRIMARY KEY,
        student_id VARCHAR(100) NOT NULL,
        grade_column_id VARCHAR(100) NOT NULL,
        grade_value DECIMAL(3,1) NOT NULL,
        period VARCHAR(50) DEFAULT '1er Semestre',
        level_id VARCHAR(50),
        subject_id VARCHAR(50),
        academic_year INT DEFAULT 2026,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_grade_col (student_id, grade_column_id)
      )
    `).catch(() => { });

    await query(`
      CREATE TABLE IF NOT EXISTS cumulative_evaluations (
        id VARCHAR(100) PRIMARY KEY,
        grade_column_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        sub_evaluations JSON NOT NULL,
        level_id VARCHAR(50),
        subject_id VARCHAR(50),
        academic_year INT DEFAULT 2026,
        period VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `).catch(() => { });

    await query(`
      CREATE TABLE IF NOT EXISTS cumulative_sub_grades (
        id VARCHAR(150) PRIMARY KEY,
        grade_column_id VARCHAR(100) NOT NULL,
        sub_evaluation_id VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        sub_grade_value DECIMAL(3,1) NOT NULL,
        period VARCHAR(50),
        level_id VARCHAR(50),
        subject_id VARCHAR(50),
        academic_year INT DEFAULT 2026,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sub_grade (student_id, grade_column_id, sub_evaluation_id)
      )
    `).catch(() => { });
  } catch (err) {
    console.error('Error creando tablas de calificaciones en MySQL:', err);
  }
}
ensureCumulativeTablesExist();

// GET /api/grades/cumulative (Obtener configuración de sub-evaluaciones y sub-notas)
router.get('/grades/cumulative', authMiddleware, async (req: Request, res: Response) => {
  const { gradeColumnId, levelId, subjectId, academicYear, period } = req.query;
  if (!gradeColumnId) {
    return res.status(400).json({ error: 'gradeColumnId es requerido.' });
  }

  try {
    const evalRes = await query(
      'SELECT * FROM cumulative_evaluations WHERE grade_column_id = $1 LIMIT 1',
      [String(gradeColumnId)]
    );

    let evaluation = null;
    if (evalRes.rows.length > 0) {
      evaluation = evalRes.rows[0];
      if (typeof evaluation.sub_evaluations === 'string') {
        try {
          evaluation.sub_evaluations = JSON.parse(evaluation.sub_evaluations);
        } catch (_) { }
      }
    }

    const subGradesRes = await query(
      'SELECT * FROM cumulative_sub_grades WHERE grade_column_id = $1 AND (period = $2 OR $2 IS NULL)',
      [String(gradeColumnId), period ? String(period) : null]
    );

    const subGradesMap: Record<string, number> = {};
    subGradesRes.rows.forEach((r: any) => {
      subGradesMap[`${r.student_id}_${r.sub_evaluation_id}`] = parseFloat(r.sub_grade_value);
    });

    res.json({
      evaluation,
      subGrades: subGradesMap
    });
  } catch (err: any) {
    console.error('Error al obtener notas acumulativas:', err);
    res.status(500).json({ error: 'Error al consultar notas acumulativas.' });
  }
});

// POST /api/grades/cumulative (Guardar sub-evaluaciones, sub-notas y actualizar promedio en grades)
router.post('/grades/cumulative', authMiddleware, checkRoles(['Admin', 'Docente']), async (req: Request, res: Response) => {
  const {
    gradeColumnId,
    title,
    subEvaluations,
    subGrades,
    levelId,
    subjectId,
    academicYear,
    period
  } = req.body;

  if (!gradeColumnId || !Array.isArray(subEvaluations)) {
    return res.status(400).json({ error: 'gradeColumnId y subEvaluations son requeridos.' });
  }

  try {
    const evalId = `CUM-${gradeColumnId}`;
    const subEvalsJson = JSON.stringify(subEvaluations);

    // 1. Guardar o actualizar definición de la evaluación acumulativa
    await query(
      `INSERT INTO cumulative_evaluations (id, grade_column_id, title, sub_evaluations, level_id, subject_id, academic_year, period)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON DUPLICATE KEY UPDATE title = $3, sub_evaluations = $4, level_id = $5, subject_id = $6, academic_year = $7, period = $8`,
      [evalId, gradeColumnId, title || 'Evaluación Acumulativa', subEvalsJson, String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10), period || '1er Semestre']
    ).catch(async () => {
      await query(
        `INSERT INTO cumulative_evaluations (id, grade_column_id, title, sub_evaluations, level_id, subject_id, academic_year, period)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, sub_evaluations = EXCLUDED.sub_evaluations, level_id = EXCLUDED.level_id, subject_id = EXCLUDED.subject_id, academic_year = EXCLUDED.academic_year, period = EXCLUDED.period`,
        [evalId, gradeColumnId, title || 'Evaluación Acumulativa', subEvalsJson, String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10), period || '1er Semestre']
      ).catch(() => { });
    });

    // 2. Procesar y guardar cada sub-nota
    const studentGradesSum: Record<string, { sum: number; count: number }> = {};

    if (subGrades && typeof subGrades === 'object') {
      for (const [key, val] of Object.entries(subGrades)) {
        const numVal = parseFloat(String(val));
        if (isNaN(numVal) || numVal <= 0) continue;

        // Key format: studentId_subEvaluationId
        const parts = key.split('_');
        if (parts.length < 2) continue;
        const studentId = parts[0];
        const subEvalId = parts.slice(1).join('_');

        const subGradeId = `SUB-${studentId}-${gradeColumnId}-${subEvalId}`;
        await query(
          `INSERT INTO cumulative_sub_grades (id, grade_column_id, sub_evaluation_id, student_id, sub_grade_value, period, level_id, subject_id, academic_year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON DUPLICATE KEY UPDATE sub_grade_value = $5, period = $6, level_id = $7, subject_id = $8, academic_year = $9`,
          [subGradeId, gradeColumnId, subEvalId, studentId, numVal, period || '1er Semestre', String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10)]
        ).catch(async () => {
          await query(
            `INSERT INTO cumulative_sub_grades (id, grade_column_id, sub_evaluation_id, student_id, sub_grade_value, period, level_id, subject_id, academic_year)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET sub_grade_value = EXCLUDED.sub_grade_value, period = EXCLUDED.period, level_id = EXCLUDED.level_id, subject_id = EXCLUDED.subject_id, academic_year = EXCLUDED.academic_year`,
            [subGradeId, gradeColumnId, subEvalId, studentId, numVal, period || '1er Semestre', String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10)]
          ).catch(() => { });
        });

        if (!studentGradesSum[studentId]) {
          studentGradesSum[studentId] = { sum: 0, count: 0 };
        }
        studentGradesSum[studentId].sum += numVal;
        studentGradesSum[studentId].count += 1;
      }
    }

    // 3. Calcular promedio acumulativo de cada estudiante y actualizar la nota final en la tabla grades
    const calculatedAverages: Record<string, number> = {};
    for (const [studentId, stats] of Object.entries(studentGradesSum)) {
      if (stats.count > 0) {
        const avg = Math.round((stats.sum / stats.count) * 10) / 10;
        calculatedAverages[studentId] = avg;

        const mainGradeId = `GRD-${studentId}-${gradeColumnId}`;
        await query(
          `INSERT INTO grades (id, student_id, grade_column_id, grade_value, period, level_id, subject_id, academic_year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON DUPLICATE KEY UPDATE grade_value = $4, period = $5, level_id = $6, subject_id = $7, academic_year = $8`,
          [mainGradeId, studentId, gradeColumnId, avg, period || '1er Semestre', String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10)]
        ).catch(async () => {
          await query(
            `INSERT INTO grades (id, student_id, grade_column_id, grade_value, period, level_id, subject_id, academic_year)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (student_id, grade_column_id)
             DO UPDATE SET grade_value = EXCLUDED.grade_value, period = EXCLUDED.period, level_id = EXCLUDED.level_id, subject_id = EXCLUDED.subject_id, academic_year = EXCLUDED.academic_year`,
            [mainGradeId, studentId, gradeColumnId, avg, period || '1er Semestre', String(levelId || 1), String(subjectId || 1), parseInt(String(academicYear || 2026), 10)]
          ).catch(() => { });
        });
      }
    }

    await logAudit(req, 'SAVE_CUMULATIVE_GRADES', `Notas acumulativas guardadas para evaluación "${title}" (${gradeColumnId})`);
    res.json({ success: true, calculatedAverages });
  } catch (err: any) {
    console.error('Error al guardar notas acumulativas:', err);
    res.status(500).json({ error: 'Error al guardar notas acumulativas en el servidor.' });
  }
});

// BLOQUEOS SEMESTRALES DE CALIFICACIONES
router.get('/grades-locks', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM grades_locks');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar bloqueos semestrales.' });
  }
});

router.post('/grades-locks', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { levelId, subjectId, academicYear, period, isLocked } = req.body;
  try {
    await query(
      `INSERT INTO grades_locks (level_id, subject_id, academic_year, period, is_locked)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (level_id, subject_id, academic_year, period)
       DO UPDATE SET is_locked = EXCLUDED.is_locked`,
      [levelId, subjectId, academicYear || 2026, period || '1er Semestre', isLocked ? 1 : 0]
    );

    await logAudit(req, 'TOGGLE_GRADE_LOCK', `Cierre semestral ${period} ${isLocked ? 'BLOQUEADO' : 'DESBLOQUEADO'}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar bloqueo semestral.' });
  }
});

// -----------------------------------------------------------------------------
// 6. ENLACES EXTERNOS Y PARÁMETROS INSTITUCIONALES (LICEO PRO 2.16 & 2.17)
// -----------------------------------------------------------------------------
router.get('/external-links', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM external_links ORDER BY created_at DESC');
    if (result.rows.length === 0) {
      return res.json([
        { id: '1', name: 'Lira Mineduc', url: 'https://lira.mineduc.cl' },
        { id: '2', name: 'Google Classroom', url: 'https://classroom.google.com' }
      ]);
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar enlaces externos.' });
  }
});

router.post('/external-links', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { name, url } = req.body;
  try {
    const linkId = `LNK-${Date.now()}`;
    await query('INSERT INTO external_links (id, name, url) VALUES ($1, $2, $3)', [linkId, name, url]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear enlace externo.' });
  }
});

// -----------------------------------------------------------------------------
// 7. MATRIZ DINÁMICA DE PERMISOS POR ROL (RBAC SECURITY MATRIX)
// -----------------------------------------------------------------------------
let cachedPermissionsMatrix: any[] | null = null;

const DEFAULT_SYSTEM_PERMISSIONS = [
  { functionId: 'dashboard', functionName: 'Dashboard General & KPIs / Portal', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: true, Apoderado: true },
  { functionId: 'enrollment', functionName: 'Matrícula Completa MINEDUC/FIDE', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'apoderados', functionName: 'Nómina & Registro Institucional de Apoderados', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'enrollment_docs_gen', functionName: 'Generador de Ficha de Matrícula & Compromiso', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'enrollment_config', functionName: 'Configuración de Texto de Compromiso & Ficha', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'pie_sep_health', functionName: 'Programa PIE / SEP & Salud Estudiantil', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'grades', functionName: 'Libro de Calificaciones Ponderadas', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'overview', functionName: 'Panorama de Notas & Rendimiento', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'computer_lab', functionName: 'Reserva Sala de Computación & Horarios', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'evaluations_pie', functionName: 'Portal de Evaluaciones & Integración PIE', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'mineduc_reports', functionName: 'Informes y Formularios Únicos MINEDUC (Dec. 170)', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'interviews', functionName: 'Actas de Entrevistas & Compromisos', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'multiview', functionName: 'Multivista QR Dual Screen', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'observations', functionName: 'Hoja de Vida & Anotaciones RICE', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'inspector_passes', functionName: 'Control de Atrasos & Pases de Inspectoría', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'hr_staff', functionName: 'Recursos Humanos & Idoneidad', Admin: true, Director: true, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'admin_docs', functionName: 'Documentos & Protocolos', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: true, Apoderado: true },
  { functionId: 'personality', functionName: 'Informes de Desarrollo Personal', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'library', functionName: 'Biblioteca CRA', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
  { functionId: 'jefatura_report', functionName: 'Reporte de Jefatura & Análisis de Curso', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'config', functionName: 'Ajustes y Configuración del Sistema (10 Sub-ventanas)', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'permissions', functionName: 'Matriz de Permisos RBAC', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'password_assist', functionName: 'Asistencia de Claves Administrador', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'semester_locks', functionName: 'Cierre y Bloqueo Semestral', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
  { functionId: 'audit_logs', functionName: 'Auditoría Silent-Watch', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false }
];

router.get('/permissions', authMiddleware, async (req: Request, res: Response) => {
  if (req.user?.role === 'Apoderado' || req.user?.role === 'Estudiante') {
    return res.status(403).json({ error: 'Acceso denegado. Los apoderados y estudiantes no tienen acceso a la gestión de permisos del establecimiento.' });
  }
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS system_permissions_matrix (
        id VARCHAR(50) PRIMARY KEY,
        matrix_json JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => { });

    const dbRes = await query("SELECT matrix_json FROM system_permissions_matrix WHERE id = 'current_matrix'").catch(() => ({ rows: [] }));
    if (dbRes.rows && dbRes.rows.length > 0 && dbRes.rows[0].matrix_json) {
      const parsed = typeof dbRes.rows[0].matrix_json === 'string' ? JSON.parse(dbRes.rows[0].matrix_json) : dbRes.rows[0].matrix_json;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json(parsed);
      }
    }

    if (cachedPermissionsMatrix && cachedPermissionsMatrix.length > 0) {
      return res.json(cachedPermissionsMatrix);
    }

    res.json(DEFAULT_SYSTEM_PERMISSIONS);
  } catch (err) {
    res.json(DEFAULT_SYSTEM_PERMISSIONS);
  }
});

router.post('/permissions', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { matrix } = req.body;
  try {
    if (Array.isArray(matrix)) {
      cachedPermissionsMatrix = matrix;
      await query(`
        CREATE TABLE IF NOT EXISTS system_permissions_matrix (
          id VARCHAR(50) PRIMARY KEY,
          matrix_json JSON NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).catch(() => { });

      const matrixStr = JSON.stringify(matrix);
      await query(`
        INSERT INTO system_permissions_matrix (id, matrix_json, updated_at) 
        VALUES ('current_matrix', $1, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE matrix_json = $1, updated_at = CURRENT_TIMESTAMP
      `, [matrixStr]).catch(async () => {
        // Fallback para Postgres
        await query(`
          INSERT INTO system_permissions_matrix (id, matrix_json, updated_at) 
          VALUES ('current_matrix', $1, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET matrix_json = EXCLUDED.matrix_json, updated_at = CURRENT_TIMESTAMP
        `, [matrixStr]).catch(() => { });
      });
    }

    await logAudit(req, 'UPDATE_PERMISSIONS_MATRIX', 'Matriz de permisos por rol actualizada exitosamente');
    res.json({ success: true, matrix });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar la matriz de permisos.' });
  }
});

export const checkMatrixPermission = (functionId: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let matrix = cachedPermissionsMatrix;
      if (!matrix || matrix.length === 0) {
        const dbRes = await query("SELECT matrix_json FROM system_permissions_matrix WHERE id = 'current_matrix'").catch(() => ({ rows: [] }));
        if (dbRes.rows && dbRes.rows.length > 0 && dbRes.rows[0].matrix_json) {
          matrix = typeof dbRes.rows[0].matrix_json === 'string' ? JSON.parse(dbRes.rows[0].matrix_json) : dbRes.rows[0].matrix_json;
          cachedPermissionsMatrix = matrix;
        }
      }
      if (!matrix || !Array.isArray(matrix)) {
        matrix = DEFAULT_SYSTEM_PERMISSIONS;
      }

      const row = matrix.find((r: any) => r.functionId === functionId);
      if (row) {
        const userRole = (req.user?.role || 'Docente') as string;
        let roleCol: string = userRole;
        if (['Admin', 'Administrador'].includes(userRole)) roleCol = 'Admin';
        else if (['Director', 'Directivo', 'UTP', 'Inspectoría General'].includes(userRole)) roleCol = 'Director';
        else if (['Docente', 'Docente de Aula', 'Docente Jefatura'].includes(userRole)) roleCol = 'Docente';
        else if (['Asistente', 'Asistente de la Educación', 'PIE'].includes(userRole)) roleCol = 'Asistente';
        else if (['Profesionales', 'Convivencia Escolar', 'Entrevistador', 'Psicólogo'].includes(userRole)) roleCol = 'Profesionales';
        else if (userRole === 'Estudiante') roleCol = 'Estudiante';
        else if (userRole === 'Apoderado') roleCol = 'Apoderado';

        // Administrador siempre tiene acceso total asegurado
        if (roleCol === 'Admin') {
          return next();
        }

        // Si el permiso está denegado en la matriz para este rol, denegar con 403
        if (row[roleCol] === false || (row[userRole] !== undefined && row[userRole] === false)) {
          return res.status(403).json({
            error: `No tienes el permiso para abrir o ver este módulo. Acceso denegado en la Matriz de Permisos para el rol "${userRole}".`,
            functionId,
            functionName: row.functionName
          });
        }
      }
      next();
    } catch (err) {
      next();
    }
  };
};

// -----------------------------------------------------------------------------
// 8. ESTUDIANTES, PORTAL DE APODERADOS, BÚSQUEDA EN TIEMPO REAL (> 4 DÍGITOS) Y AUDITORÍA
// -----------------------------------------------------------------------------
router.get('/apoderados/lookup', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rawRut = String(req.query.rut || req.query.run || '').trim();
    const cleanDigits = rawRut.replace(/[^0-9kK]/g, '').toLowerCase();

    if (cleanDigits.length <= 4) {
      return res.json({ success: true, match: null });
    }

    // 1. Buscar en la tabla de estudiantes cualquier apoderado o alumno coincidente
    const studentsRes = await query(
      `SELECT * FROM students 
       WHERE LOWER(REPLACE(REPLACE(guardian_run, '.', ''), '-', '')) LIKE $1 
          OR LOWER(REPLACE(REPLACE(guardian_sec_run, '.', ''), '-', '')) LIKE $1 
          OR LOWER(REPLACE(REPLACE(father_run, '.', ''), '-', '')) LIKE $1 
          OR LOWER(REPLACE(REPLACE(mother_run, '.', ''), '-', '')) LIKE $1 
          OR LOWER(REPLACE(REPLACE(run, '.', ''), '-', '')) LIKE $1 
       LIMIT 10`,
      [`%${cleanDigits}%`]
    );

    let matchData: any = null;

    for (const s of studentsRes.rows) {
      const g1 = String(s.guardian_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const g2 = String(s.guardian_sec_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const m = String(s.mother_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const f = String(s.father_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const st = String(s.run || '').replace(/[^0-9kK]/g, '').toLowerCase();

      if (g1.includes(cleanDigits)) {
        matchData = { run: s.guardian_run, name: s.guardian_name, phone: s.guardian_phone, email: s.guardian_email, occupation: s.guardian_occupation, relation: s.guardian_relation };
        break;
      }
      if (g2.includes(cleanDigits)) {
        matchData = { run: s.guardian_sec_run, name: s.guardian_sec_name, phone: s.guardian_sec_phone, email: s.guardian_sec_email, occupation: s.guardian_sec_occupation, relation: s.guardian_sec_relation };
        break;
      }
      if (m.includes(cleanDigits)) {
        matchData = { run: s.mother_run, name: s.mother_name, phone: s.mother_phone, email: s.mother_email, occupation: s.mother_occupation, education: s.mother_education, relation: 'Madre' };
        break;
      }
      if (f.includes(cleanDigits)) {
        matchData = { run: s.father_run, name: s.father_name, phone: s.father_phone, email: s.father_email, occupation: s.father_occupation, education: s.father_education, relation: 'Padre' };
        break;
      }
      if (st.includes(cleanDigits)) {
        matchData = { run: s.run, name: s.full_name, phone: s.student_phone, email: s.student_email, relation: 'Estudiante' };
        break;
      }
    }

    // 2. Si no se encontró en tabla students, consultar en la tabla users
    if (!matchData) {
      const usersRes = await query(
        `SELECT * FROM users WHERE LOWER(REPLACE(REPLACE(run, '.', ''), '-', '')) LIKE $1 LIMIT 5`,
        [`%${cleanDigits}%`]
      );
      if (usersRes.rows.length > 0) {
        const u = usersRes.rows[0];
        matchData = { run: u.run, name: u.name, phone: u.phone, email: u.email };
      }
    }

    res.json({ success: true, match: matchData });
  } catch (err: any) {
    console.error('❌ Error en GET /api/apoderados/lookup:', err);
    res.status(500).json({ error: 'Error al consultar datos de apoderado.' });
  }
});

// GET /api/apoderados/list (LISTADO GENERAL DE APODERADOS Y TUTORES REGISTRADOS)
router.get('/apoderados/list', authMiddleware, async (req: Request, res: Response) => {
  try {
    const studentsRes = await query('SELECT * FROM students');
    const guardiansMap = new Map<string, any>();
    const studentsWithoutGuardian: any[] = [];

    const isValidGuardian = (run: any, name: any): boolean => {
      if (!run) return false;
      const sRun = String(run).trim().toLowerCase();
      const sName = String(name || '').trim().toLowerCase();
      if (!sRun || sRun === 'null' || sRun === 'undefined' || sRun === 'sin rut' || sRun === 's/r') return false;
      if (sName === 'null' || sName === 'undefined') return false;
      const digits = sRun.replace(/[^0-9kK]/g, '');
      return digits.length >= 6;
    };

    const cleanStr = (val: any, fallback = ''): string => {
      if (!val) return fallback;
      const s = String(val).trim();
      const lower = s.toLowerCase();
      if (lower === '' || lower === 'null' || lower === 'undefined' || lower === 'none') return fallback;
      return s;
    };

    studentsRes.rows.forEach((s: any) => {
      const studentName = cleanStr(s.full_name || s.name, 'Estudiante');
      const course = s.desc_grado || s.level_name || (s.letra_curso ? `${s.desc_grado || ''} ${s.letra_curso}` : '') || 'Sin curso asignado';

      let hasAssignedGuardian = false;

      // 1. Apoderado Titular
      if (isValidGuardian(s.guardian_run, s.guardian_name)) {
        hasAssignedGuardian = true;
        const cleanR = String(s.guardian_run).replace(/[^0-9kK]/g, '').toLowerCase();
        if (!guardiansMap.has(cleanR)) {
          guardiansMap.set(cleanR, {
            run: cleanStr(s.guardian_run),
            name: cleanStr(s.guardian_name, 'Apoderado Titular'),
            phone: cleanStr(s.guardian_phone),
            email: cleanStr(s.guardian_email),
            occupation: cleanStr(s.guardian_occupation),
            relation: cleanStr(s.guardian_relation, 'Apoderado Titular'),
            pupils: []
          });
        }
        guardiansMap.get(cleanR).pupils.push(`${studentName} (${course})`);
      }

      // 2. Apoderado Suplente
      if (isValidGuardian(s.guardian_sec_run, s.guardian_sec_name)) {
        hasAssignedGuardian = true;
        const cleanR = String(s.guardian_sec_run).replace(/[^0-9kK]/g, '').toLowerCase();
        if (!guardiansMap.has(cleanR)) {
          guardiansMap.set(cleanR, {
            run: cleanStr(s.guardian_sec_run),
            name: cleanStr(s.guardian_sec_name, 'Apoderado Suplente'),
            phone: cleanStr(s.guardian_sec_phone),
            email: cleanStr(s.guardian_sec_email),
            occupation: cleanStr(s.guardian_sec_occupation),
            relation: cleanStr(s.guardian_sec_relation, 'Apoderado Suplente'),
            pupils: []
          });
        }
        guardiansMap.get(cleanR).pupils.push(`${studentName} (${course})`);
      }

      // 3. Madre
      if (isValidGuardian(s.mother_run, s.mother_name)) {
        hasAssignedGuardian = true;
        const cleanR = String(s.mother_run).replace(/[^0-9kK]/g, '').toLowerCase();
        if (!guardiansMap.has(cleanR)) {
          guardiansMap.set(cleanR, {
            run: cleanStr(s.mother_run),
            name: cleanStr(s.mother_name, 'Madre'),
            phone: cleanStr(s.mother_phone),
            email: cleanStr(s.mother_email),
            occupation: cleanStr(s.mother_occupation),
            relation: 'Madre',
            pupils: []
          });
        }
        guardiansMap.get(cleanR).pupils.push(`${studentName} (${course})`);
      }

      // 4. Padre
      if (isValidGuardian(s.father_run, s.father_name)) {
        hasAssignedGuardian = true;
        const cleanR = String(s.father_run).replace(/[^0-9kK]/g, '').toLowerCase();
        if (!guardiansMap.has(cleanR)) {
          guardiansMap.set(cleanR, {
            run: cleanStr(s.father_run),
            name: cleanStr(s.father_name, 'Padre'),
            phone: cleanStr(s.father_phone),
            email: cleanStr(s.father_email),
            occupation: cleanStr(s.father_occupation),
            relation: 'Padre',
            pupils: []
          });
        }
        guardiansMap.get(cleanR).pupils.push(`${studentName} (${course})`);
      }

      if (!hasAssignedGuardian) {
        studentsWithoutGuardian.push({
          id: s.id,
          run: cleanStr(s.run, 'Sin RUT'),
          name: studentName,
          course: course,
          phone: cleanStr(s.phone || s.mobile_phone, 'Sin contacto'),
          email: cleanStr(s.email, 'Sin correo')
        });
      }
    });

    const resultList = Array.from(guardiansMap.values()).map(g => ({
      ...g,
      pupilsSummary: g.pupils.length > 0 ? Array.from(new Set(g.pupils)).join(', ') : 'Sin pupilos asociados'
    }));

    res.json({
      success: true,
      guardians: resultList,
      totalStudents: studentsRes.rows.length,
      studentsWithoutGuardianCount: studentsWithoutGuardian.length,
      studentsWithoutGuardian
    });
  } catch (err: any) {
    console.error('❌ Error en GET /api/apoderados/list:', err);
    res.status(500).json({ error: 'Error al consultar listado de apoderados.' });
  }
});

router.get('/apoderado/pupilos', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userRun = (req.user as any)?.run || '';
    const queryRun = String(req.query.run || req.query.guardianRun || userRun || '').trim();
    const cleanUserRun = queryRun.replace(/\./g, '').trim().toLowerCase();

    const studentsRes = await query('SELECT * FROM students ORDER BY list_number ASC, full_name ASC').catch(() => ({ rows: [] }));
    let allStudents = studentsRes.rows || [];

    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.students) && store.students.length > 0) {
          const map = new Map<string, any>();
          allStudents.forEach((s: any) => map.set(s.id || s.run, s));
          store.students.forEach((s: any) => map.set(s.id || s.run, s));
          allStudents = Array.from(map.values());
        }
      } catch (_) {}
    }

    let matchedStudents = allStudents;
    if (cleanUserRun) {
      const filtered = allStudents.filter((s: any) => {
        const gRun = String(s.guardian_run || s.run_apoderado || '').replace(/\./g, '').trim().toLowerCase();
        const g2Run = String(s.guardian_sec_run || s.run_apoderado_2 || '').replace(/\./g, '').trim().toLowerCase();
        const mRun = String(s.mother_run || '').replace(/\./g, '').trim().toLowerCase();
        const fRun = String(s.father_run || '').replace(/\./g, '').trim().toLowerCase();
        const sRun = String(s.run || '').replace(/\./g, '').trim().toLowerCase();
        return gRun === cleanUserRun || g2Run === cleanUserRun || mRun === cleanUserRun || fRun === cleanUserRun || sRun === cleanUserRun;
      });
      if (filtered.length > 0) {
        matchedStudents = filtered;
      }
    }

    const gradesRes = await query('SELECT * FROM grades').catch(() => ({ rows: [] }));
    const gradeColsRes = await query('SELECT * FROM grade_columns').catch(() => ({ rows: [] }));
    const subjectsRes = await query('SELECT * FROM subjects').catch(() => ({ rows: [] }));
    const teacherAssignRes = await query('SELECT * FROM teacher_assignments').catch(() => ({ rows: [] }));
    const obsRes = await query('SELECT * FROM student_observations ORDER BY created_at DESC').catch(async () => {
      return await query('SELECT * FROM observations ORDER BY created_at DESC').catch(() => ({ rows: [] }));
    });
    const intRes = await query('SELECT * FROM interviews').catch(() => ({ rows: [] }));
    const passesRes = await query('SELECT * FROM student_passes ORDER BY pass_date DESC, pass_time DESC').catch(() => ({ rows: [] }));

    let allGrades = gradesRes.rows || [];
    let allCols = gradeColsRes.rows || [];
    let allSubjects = subjectsRes.rows || [];
    let allTeacherAssign = teacherAssignRes.rows || [];
    let allObs = obsRes.rows || [];
    let allInts = intRes.rows || [];

    const passMap = new Map<string, any>();
    (passesRes.rows || []).forEach((p: any) => {
      const key = String(p.id || p.folio);
      const cleanDate = p.pass_date instanceof Date ? p.pass_date.toISOString().slice(0, 10) : String(p.pass_date || '').split('T')[0];
      passMap.set(key, { ...p, pass_date: cleanDate });
    });

    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.grades)) allGrades = [...allGrades, ...store.grades];
        if (Array.isArray(store.grade_columns)) allCols = [...allCols, ...store.grade_columns];
        if (Array.isArray(store.subjects)) allSubjects = [...allSubjects, ...store.subjects];
        if (Array.isArray(store.teacher_assignments)) allTeacherAssign = [...allTeacherAssign, ...store.teacher_assignments];
        if (Array.isArray(store.observations)) allObs = [...allObs, ...store.observations];
        if (Array.isArray(store.interviews)) allInts = [...allInts, ...store.interviews];
        if (Array.isArray(store.student_passes)) {
          store.student_passes.forEach((p: any) => {
            const key = String(p.id || p.folio);
            if (!passMap.has(key)) {
              const cleanDate = p.pass_date instanceof Date ? p.pass_date.toISOString().slice(0, 10) : String(p.pass_date || '').split('T')[0];
              passMap.set(key, { ...p, pass_date: cleanDate });
            }
          });
        }
      } catch (_) {}
    }
    const allPasses = Array.from(passMap.values());

    const pupilos = matchedStudents.map((st: any) => {
      const studentCourse = getStudentCourseHelper(st);
      const studentGrades = allGrades.filter((g: any) => String(g.student_id) === String(st.id) || String(g.student_run) === String(st.run));

      const subjectMap = new Map<string, any>();
      allSubjects.forEach((sub: any) => {
        const sName = sub.name || sub.nombre;
        if (!sName) return;

        const subCols = allCols.filter((c: any) =>
          (c.subject_name === sName || String(c.subject_id) === String(sub.id)) &&
          (!c.level_name || !c.level_id || String(c.level_name || c.level_id) === String(studentCourse))
        );
        const colIds = new Set(subCols.map((c: any) => String(c.id)));

        const isAssignedToCourse = allTeacherAssign.some((ta: any) =>
          (ta.subject_name === sName || String(ta.subject_id) === String(sub.id)) &&
          (String(ta.level_name || ta.level_id) === String(studentCourse))
        );

        const hasColumnsInCourse = allCols.some((c: any) =>
          (c.subject_name === sName || String(c.subject_id) === String(sub.id)) &&
          (String(c.level_name || c.level_id) === String(studentCourse))
        );

        const hasGrades = studentGrades.some((g: any) => colIds.has(String(g.grade_column_id)));

        // Si la asignatura no ha sido asignada a este curso ni tiene evaluaciones/notas creadas para este curso, no mostrar
        if (!isAssignedToCourse && !hasColumnsInCourse && !hasGrades) {
          return;
        }

        const assign = allTeacherAssign.find((ta: any) => (ta.subject_name === sName || ta.subject_id === sub.id) && (ta.level_name === studentCourse || ta.level_id === studentCourse));
        const teacherName = assign ? (assign.teacher_name || 'Profesor Asignado') : (st.profesor_jefe || 'Sin Asignar');

        const subGradesList: any[] = [];
        let sum = 0;
        let count = 0;

        studentGrades.forEach((g: any) => {
          if (colIds.has(String(g.grade_column_id))) {
            const val = parseFloat(g.grade_value);
            if (!isNaN(val) && val > 0) {
              const colObj = subCols.find((c: any) => String(c.id) === String(g.grade_column_id));
              subGradesList.push({
                label: colObj ? colObj.title : `NOTA ${subGradesList.length + 1}`,
                value: val > 7.0 ? val / 10.0 : val,
                date: colObj?.created_at || colObj?.date || g.created_at || null
              });
              sum += val > 7.0 ? val / 10.0 : val;
              count++;
            }
          }
        });

        const average = count > 0 ? sum / count : 0;
        const status = count === 0 ? 'SIN NOTAS' : (average >= 4.0 ? 'APROBADO' : 'REPROBADO');

        subjectMap.set(sName, {
          name: sName,
          teacher: teacherName,
          average: average,
          status: status,
          grades: subGradesList
        });
      });

      let overallSum = 0;
      let overallCount = 0;
      subjectMap.forEach(subObj => {
        if (subObj.average > 0) {
          overallSum += subObj.average;
          overallCount++;
        }
      });
      const overallAvg = overallCount > 0 ? overallSum / overallCount : 0;

      const studentObs = allObs
        .filter((o: any) => String(o.student_id) === String(st.id) || String(o.student_run) === String(st.run))
        .map((o: any) => ({
          ...o,
          detail: o.detail || o.content || '',
          content: o.detail || o.content || '',
          author: o.author_name || o.author || 'Docente / Funcionario',
          date: o.date,
          created_at: o.created_at || o.date
        }));
      const studentInts = allInts.filter((i: any) => String(i.student_id) === String(st.id) || String(i.student_run) === String(st.run));

      const cleanStRun = String(st.run || '').replace(/\./g, '').trim().toLowerCase();
      const studentPasses = allPasses.filter((p: any) => {
        const pRun = String(p.student_run || '').replace(/\./g, '').trim().toLowerCase();
        return (p.student_id && String(p.student_id) === String(st.id)) || (cleanStRun && pRun === cleanStRun);
      });
      const totalLates = studentPasses.filter((p: any) => String(p.pass_type || '').toLowerCase().includes('atraso')).length;
      const unjustifiedLates = studentPasses.filter((p: any) => String(p.pass_type || '').toLowerCase().includes('atraso') && String(p.status || '').toLowerCase() === 'injustificado').length;
      const justifiedLates = studentPasses.filter((p: any) => String(p.pass_type || '').toLowerCase().includes('atraso') && String(p.status || '').toLowerCase() === 'justificado').length;

      return {
        id: st.id,
        fullName: st.full_name || st.name,
        run: st.run,
        levelName: studentCourse,
        relacion: 'Apoderado Titular',
        profesorJefe: st.profesor_jefe || 'Sin Asignar',
        promedioGeneral: overallAvg,
        asistencia: typeof st.asistencia === 'number' && st.asistencia > 0 ? st.asistencia : (typeof st.attendance_percentage === 'number' && st.attendance_percentage > 0 ? st.attendance_percentage : null),
        subjects: Array.from(subjectMap.values()),
        observations: studentObs,
        interviews: studentInts,
        passes: studentPasses,
        totalLates,
        unjustifiedLates,
        justifiedLates
      };
    });

    res.json({ success: true, pupilos });
  } catch (err: any) {
    console.error('❌ Error en GET /api/apoderado/pupilos:', err);
    res.status(500).json({ error: 'Error al consultar pupilos del apoderado.' });
  }
});


router.post('/students/reorder', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reorderedStudents } = req.body;
    const storePath = path.join(__dirname, '../../local_store.json');
    if (fs.existsSync(storePath)) {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      if (Array.isArray(store.students) && Array.isArray(reorderedStudents)) {
        reorderedStudents.forEach((updatedStd: any) => {
          const idx = store.students.findIndex((s: any) => s.id === updatedStd.id || (s.run && s.run === updatedStd.run));
          if (idx !== -1) {
            store.students[idx].list_number = updatedStd.list_number;
          }
        });
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
      }
    }
    await logAudit(req, 'REORDER_STUDENTS', 'Reordenamiento de N° de lista de estudiantes actualizado');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al reordenar lista de estudiantes.' });
  }
});

router.post('/students', authMiddleware, checkRoles(['Admin', 'Director', 'Administrativo', 'Docente']), async (req: Request, res: Response) => {
  try {
    const std = req.body;
    const cleanRun = String(std.run || std.RUT || '').trim();
    if (!cleanRun && !std.id) {
      return res.status(400).json({ error: 'RUT o identificador del estudiante es requerido.' });
    }

    const studentId = std.id || `STU-${cleanRun.replace(/[^0-9kK]/g, '') || Date.now()}`;
    const fullName = std.full_name || `${std.paternal_surname || ''} ${std.maternal_surname || ''} ${std.first_name || ''}`.trim() || std.Nombres || 'Estudiante';
    const isRetired = std.is_retired ? 1 : (std.status === 'Retirado' ? 1 : 0);
    const status = isRetired ? 'Retirado' : (std.status || 'Active');

    // Verificar si ya existe en la base de datos
    const checkRes = await query('SELECT id FROM students WHERE id = $1 OR run = $2 LIMIT 1', [studentId, cleanRun]);

    const booleanFields = [
      'has_religion', 'father_living', 'mother_living', 'guardian_is_financial', 'guardian_is_health_load',
      'has_allergies', 'has_chronic_disease', 'has_psychological_care', 'has_neurological_care',
      'pie_program', 'differential_group', 'is_repeater', 'uses_mineduc_texts', 'is_priority',
      'is_preferential', 'is_vulnerable', 'is_high_vulnerability', 'scholarship_indigenous',
      'scholarship_president', 'scholarship_retention', 'scholarship_junaeb',
      'has_complementary_insurance', 'authorize_image_use'
    ];

    const stringFields = [
      'run', 'full_name', 'first_name', 'paternal_surname', 'maternal_surname', 'document_type',
      'birth_date', 'gender', 'nationality', 'marital_status', 'religion', 'ethnicity',
      'indigenous_origin', 'address', 'region', 'commune', 'postal_code', 'previous_school',
      'phone', 'mobile_phone', 'phone_type', 'email', 'email_type', 'health_system',
      'emergency_contact_name', 'emergency_contact_phone', 'enrollment_number', 'enrollment_date',
      'incorporation_date', 'withdrawal_date', 'withdrawal_reason', 'profesor_jefe',
      'profesor_asignatura', 'profesor_pie', 'desc_grado', 'letra_curso', 'guardian_name',
      'guardian_run', 'guardian_phone', 'guardian_email', 'guardian_relation', 'guardian_occupation',
      'guardian_education', 'guardian_address', 'guardian_sec_name', 'guardian_sec_run',
      'guardian_sec_phone', 'guardian_sec_email', 'guardian_sec_relation', 'father_name',
      'father_run', 'father_phone', 'father_email', 'father_occupation', 'father_education',
      'mother_name', 'mother_run', 'mother_phone', 'mother_email', 'mother_occupation',
      'mother_education', 'lives_with', 'lives_with_other', 'family_type', 'allergies_detail',
      'chronic_disease_detail', 'health_observations', 'psychological_care_detail',
      'neurological_care_detail', 'pie_diagnosis', 'scholarship_other', 'observaciones',
      'enrolled_by_name', 'enrolled_by_run', 'enrolled_by_role',
      'complementary_insurance_name', 'complementary_insurance_coverage',
      'image_auth_scope'
    ];

    const numberFields = [
      'edad', 'entry_year', 'academic_year', 'anno', 'list_number', 'family_members',
      'total_siblings', 'school_siblings', 'school_age_siblings', 'liceo_siblings',
      'sibling_position', 'porcentaje_asistencia', 'promedio_final'
    ];

    const studentData: Record<string, any> = {
      id: studentId,
      run: cleanRun,
      full_name: fullName,
      status,
      is_retired: isRetired
    };

    stringFields.forEach(f => {
      if (std[f] !== undefined) {
        studentData[f] = std[f] === '' ? null : String(std[f]).trim();
      }
    });

    // Auto-completar funcionario responsable de matrícula desde la sesión activa si no viene especificado
    if (!studentData.enrolled_by_name && req.user) {
      studentData.enrolled_by_name = req.user.name;
      studentData.enrolled_by_run = req.user.run;
      studentData.enrolled_by_role = req.user.role;
    }

    booleanFields.forEach(f => {
      if (std[f] !== undefined) {
        studentData[f] = std[f] === true || std[f] === 1 || std[f] === 'true' || std[f] === '1' ? 1 : 0;
      }
    });

    numberFields.forEach(f => {
      if (std[f] !== undefined && std[f] !== null && std[f] !== '') {
        studentData[f] = Number(std[f]);
      }
    });

    // Auto-generación de N° de Matrícula único (ej: 2026-004) si viene nulo, vacío o 'null'
    if (!studentData.enrollment_number || studentData.enrollment_number === 'null' || studentData.enrollment_number === 'undefined') {
      const allStdsRes = await query('SELECT enrollment_number FROM students');
      let maxSeq = 0;
      allStdsRes.rows.forEach((r: any) => {
        const str = String(r.enrollment_number || '').trim();
        if (str && str !== 'null' && str !== 'undefined') {
          const parts = str.split('-');
          let lastPart = parts[parts.length - 1].replace(/[^0-9]/g, '');
          if (lastPart.startsWith('2026') && lastPart.length > 4) {
            lastPart = lastPart.slice(4);
          }
          const num = parseInt(lastPart, 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });
      const year = new Date().getFullYear();
      const nextSeq = String(maxSeq + 1).padStart(3, '0');
      studentData.enrollment_number = `${year}-${nextSeq}`;
    }

    if (checkRes.rows.length > 0) {
      // UPDATE
      const targetId = checkRes.rows[0].id;
      const keys = Object.keys(studentData).filter(k => k !== 'id');
      const setClauses = keys.map((k, idx) => `${k} = $${idx + 1}`).join(', ');
      const values = keys.map(k => studentData[k]);
      values.push(targetId);

      await query(`UPDATE students SET ${setClauses} WHERE id = $${values.length}`, values);
      await logAudit(req, 'UPDATE_STUDENT', `Ficha del estudiante ${fullName} (${cleanRun}) actualizada`);
    } else {
      // INSERT
      const keys = Object.keys(studentData);
      const cols = keys.join(', ');
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = keys.map(k => studentData[k]);

      await query(`INSERT INTO students (${cols}) VALUES (${placeholders})`, values);
      await logAudit(req, 'CREATE_STUDENT', `Nuevo estudiante ${fullName} (${cleanRun}) registrado`);
    }

    // Sincronización masiva de datos de apoderado en cascada para todos los demás alumnos vinculados al mismo RUT
    const updateGuardianCascade = async (gRun: string, gName: string, gPhone: string, gEmail: string, gOcc: string, gRel: string, type: 'primary' | 'secondary' | 'mother' | 'father') => {
      const cleanR = String(gRun || '').replace(/[^0-9kK]/g, '').toLowerCase();
      if (!cleanR || cleanR.length < 4) return;

      if (type === 'primary') {
        await query(
          `UPDATE students 
           SET guardian_name = COALESCE(NULLIF($1, ''), guardian_name),
               guardian_phone = COALESCE(NULLIF($2, ''), guardian_phone),
               guardian_email = COALESCE(NULLIF($3, ''), guardian_email),
               guardian_occupation = COALESCE(NULLIF($4, ''), guardian_occupation),
               guardian_relation = COALESCE(NULLIF($5, ''), guardian_relation)
           WHERE LOWER(REPLACE(REPLACE(guardian_run, '.', ''), '-', '')) = $6`,
          [gName || '', gPhone || '', gEmail || '', gOcc || '', gRel || '', cleanR]
        ).catch(() => { });
      } else if (type === 'secondary') {
        await query(
          `UPDATE students 
           SET guardian_sec_name = COALESCE(NULLIF($1, ''), guardian_sec_name),
               guardian_sec_phone = COALESCE(NULLIF($2, ''), guardian_sec_phone),
               guardian_sec_email = COALESCE(NULLIF($3, ''), guardian_sec_email),
               guardian_sec_occupation = COALESCE(NULLIF($4, ''), guardian_sec_occupation),
               guardian_sec_relation = COALESCE(NULLIF($5, ''), guardian_sec_relation)
           WHERE LOWER(REPLACE(REPLACE(guardian_sec_run, '.', ''), '-', '')) = $6`,
          [gName || '', gPhone || '', gEmail || '', gOcc || '', gRel || '', cleanR]
        ).catch(() => { });
      } else if (type === 'mother') {
        await query(
          `UPDATE students 
           SET mother_name = COALESCE(NULLIF($1, ''), mother_name),
               mother_phone = COALESCE(NULLIF($2, ''), mother_phone),
               mother_email = COALESCE(NULLIF($3, ''), mother_email),
               mother_occupation = COALESCE(NULLIF($4, ''), mother_occupation)
           WHERE LOWER(REPLACE(REPLACE(mother_run, '.', ''), '-', '')) = $5`,
          [gName || '', gPhone || '', gEmail || '', gOcc || '', cleanR]
        ).catch(() => { });
      } else if (type === 'father') {
        await query(
          `UPDATE students 
           SET father_name = COALESCE(NULLIF($1, ''), father_name),
               father_phone = COALESCE(NULLIF($2, ''), father_phone),
               father_email = COALESCE(NULLIF($3, ''), father_email),
               father_occupation = COALESCE(NULLIF($4, ''), father_occupation)
           WHERE LOWER(REPLACE(REPLACE(father_run, '.', ''), '-', '')) = $5`,
          [gName || '', gPhone || '', gEmail || '', gOcc || '', cleanR]
        ).catch(() => { });
      }

      // Sincronizar también en la tabla users si el apoderado tiene usuario de sistema
      await query(
        `UPDATE users 
         SET phone = COALESCE(NULLIF($1, ''), phone),
             email = COALESCE(NULLIF($2, ''), email),
             name = COALESCE(NULLIF($3, ''), name)
         WHERE LOWER(REPLACE(REPLACE(run, '.', ''), '-', '')) = $4`,
        [gPhone || '', gEmail || '', gName || '', cleanR]
      ).catch(() => { });
    };

    if (studentData.guardian_run) {
      await updateGuardianCascade(studentData.guardian_run, studentData.guardian_name, studentData.guardian_phone, studentData.guardian_email, studentData.guardian_occupation, studentData.guardian_relation, 'primary');
    }
    if (studentData.guardian_sec_run) {
      await updateGuardianCascade(studentData.guardian_sec_run, studentData.guardian_sec_name, studentData.guardian_sec_phone, studentData.guardian_sec_email, studentData.guardian_sec_occupation, studentData.guardian_sec_relation, 'secondary');
    }
    if (studentData.mother_run) {
      await updateGuardianCascade(studentData.mother_run, studentData.mother_name, studentData.mother_phone, studentData.mother_email, studentData.mother_occupation, '', 'mother');
    }
    if (studentData.father_run) {
      await updateGuardianCascade(studentData.father_run, studentData.father_name, studentData.father_phone, studentData.father_email, studentData.father_occupation, '', 'father');
    }

    res.json({ success: true, student: studentData });
  } catch (err: any) {
    console.error('Error al registrar/actualizar alumno:', err);
    res.status(500).json({ error: `Error al registrar alumno: ${err.message}` });
  }
});

router.put('/students/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Administrativo', 'Docente']), async (req: Request, res: Response) => {
  req.body.id = req.params.id;
  // Llamar al mismo manejador
  const nextHandler = (router as any).handle.bind(router);
  req.url = '/students';
  req.method = 'POST';
  nextHandler(req, res);
});

router.delete('/students/:id', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const studentId = req.params.id;
    await query('DELETE FROM students WHERE id = $1 OR run = $1', [studentId]);
    await logAudit(req, 'DELETE_STUDENT', `Estudiante ID/RUN ${studentId} eliminado de la plataforma`);
    res.json({ success: true, message: 'Estudiante eliminado correctamente' });
  } catch (err: any) {
    console.error('Error al eliminar estudiante:', err);
    res.status(500).json({ error: `Error al eliminar estudiante: ${err.message}` });
  }
});

// -----------------------------------------------------------------------------
// GESTIÓN DE CURSOS, PROFESORES JEFES Y CAPACIDAD
// -----------------------------------------------------------------------------
function getStudentCourseHelper(s: any): string {
  if (!s) return 'Sin Curso';
  let raw = s.desc_grado || s.level_name || s.course || s.name || '';
  raw = String(raw).trim();
  const rawLetter = s.letra_curso ? String(s.letra_curso).trim() : '';
  const letter = (rawLetter && rawLetter !== 'null' && rawLetter !== 'undefined') ? rawLetter : 'A';

  const low = raw.toLowerCase();
  if (low.includes('pre-kinder') || low.includes('prekinder') || low.includes('1er nivel')) return `1er nivel de Transición (Pre-kinder) ${letter}`;
  if (low.includes('kinder') || low.includes('2° nivel')) return `2° nivel de Transición (Kinder) ${letter}`;
  if (low.includes('1° básico') || low.includes('1° basico') || low.includes('1 basico')) return `1° Básico ${letter}`;
  if (low.includes('2° básico') || low.includes('2° basico') || low.includes('2 basico')) return `2° Básico ${letter}`;
  if (low.includes('3° básico') || low.includes('3° basico') || low.includes('3 basico')) return `3° Básico ${letter}`;
  if (low.includes('4° básico') || low.includes('4° basico') || low.includes('4 basico')) return `4° Básico ${letter}`;
  if (low.includes('5° básico') || low.includes('5° basico') || low.includes('5 basico')) return `5° Básico ${letter}`;
  if (low.includes('6° básico') || low.includes('6° basico') || low.includes('6 basico')) return `6° Básico ${letter}`;
  if (low.includes('7° básico') || low.includes('7° basico') || low.includes('7 basico')) return `7° Básico ${letter}`;
  if (low.includes('8° básico') || low.includes('8° basico') || low.includes('8 basico')) return `8° Básico ${letter}`;
  if (low.includes('laboral')) return `Laboral 1 ${letter}`;
  if (low.includes('1° medio') || low.includes('1 medio')) return `1° Medio ${letter}`;
  if (low.includes('2° medio') || low.includes('2 medio')) return `2° Medio ${letter}`;
  if (low.includes('3° medio') || low.includes('3 medio')) {
    if (low.includes('industrial') || low.includes('mecánica') || low.includes('mecanica') || low.includes('510')) return `3° Medio Industrial (Mecánica Industrial) ${letter}`;
    return `3° Medio Técnico Niños (Atención de Párvulos) ${letter}`;
  }
  if (low.includes('4° medio') || low.includes('4 medio')) {
    if (low.includes('industrial') || low.includes('mecánica') || low.includes('mecanica') || low.includes('510')) return `4° Medio Industrial (Mecánica Industrial) ${letter}`;
    return `4° Medio Técnico Niños (Atención de Párvulos) ${letter}`;
  }
  return raw || 'Sin Curso';
}

router.put('/courses/homeroom', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { courseName, teacherName, capacity } = req.body;
    console.log('🚀 RECEIVED PUT /courses/homeroom:', { courseName, teacherName, capacity });
    if (!courseName) {
      return res.status(400).json({ error: 'courseName es requerido' });
    }

    const cleanTeacher = (!teacherName || teacherName === 'null' || teacherName === 'undefined') ? 'Sin Asignar' : teacherName;
    const cleanCap = Number(capacity) || 45;

    // 1. Actualizar o Insertar en tabla courses en Base de Datos SQL
    const courseId = `course_${courseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    const checkCourse = await query('SELECT id FROM courses WHERE name = $1 OR id = $2', [courseName, courseId]).catch(() => ({ rows: [] }));
    if (checkCourse.rows.length > 0) {
      await query('UPDATE courses SET teacher = $1, capacity = $2 WHERE name = $3 OR id = $4', [cleanTeacher, cleanCap, courseName, courseId]).catch(() => {});
    } else {
      await query('INSERT INTO courses (id, name, teacher, capacity) VALUES ($1, $2, $3, $4)', [courseId, courseName, cleanTeacher, cleanCap]).catch(() => {});
    }

    // 1.1 Sincronizar en tabla levels por compatibilidad
    await query('UPDATE levels SET total_capacity = $1 WHERE name = $2', [cleanCap, courseName]).catch(() => {});

    // 2. Cascadas masivas a todos los estudiantes que pertenezcan a este curso en DB SQL
    await query(
      'UPDATE students SET profesor_jefe = $1 WHERE desc_grado = $2 OR desc_grado LIKE $3',
      [cleanTeacher, courseName, `${courseName}%`]
    ).catch(() => {});

    const allStRes = await query('SELECT id, run, desc_grado, letra_curso FROM students').catch(() => ({ rows: [] }));
    const stRows = allStRes.rows || [];
    const matchingStudents = stRows.filter((s: any) => getStudentCourseHelper(s) === courseName || s.desc_grado === courseName);
    
    for (const s of matchingStudents) {
      if (s.id) {
        await query('UPDATE students SET profesor_jefe = $1 WHERE id = $2', [cleanTeacher, s.id]).catch(() => {});
      } else if (s.run) {
        await query('UPDATE students SET profesor_jefe = $1 WHERE run = $2', [cleanTeacher, s.run]).catch(() => {});
      }
    }

    // 3. Sincronizar en local_store.json
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (!store.courses) store.courses = [];
        let existingCourse = store.courses.find((c: any) => c.name === courseName || c.id === courseId);
        if (existingCourse) {
          existingCourse.teacher = cleanTeacher;
          existingCourse.capacity = cleanCap;
        } else {
          store.courses.push({ id: courseId, name: courseName, teacher: cleanTeacher, capacity: cleanCap });
        }

        if (Array.isArray(store.students)) {
          store.students.forEach((s: any) => {
            const c = getStudentCourseHelper(s);
            if (c === courseName || s.desc_grado === courseName || s.level_name === courseName) {
              s.profesor_jefe = cleanTeacher;
            }
          });
        }
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
      } catch (err) {
        console.error('Error al guardar en local_store.json:', err);
      }
    }

    await logAudit(req, 'UPDATE_HOMEROOM_TEACHER', `Profesor Jefe ${cleanTeacher} y capacidad ${cleanCap} asignados al curso ${courseName}`);
    res.json({ success: true, message: 'Curso y jefatura actualizados correctamente' });
  } catch (err: any) {
    console.error('Error al actualizar jefatura de curso:', err);
    res.status(500).json({ error: `Error al actualizar jefatura: ${err.message}` });
  }
});

router.post('/courses/homeroom', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  req.url = '/courses/homeroom';
  req.method = 'PUT';
  (router as any).handle(req, res);
});

router.post('/courses', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  req.url = '/courses/homeroom';
  req.method = 'PUT';
  (router as any).handle(req, res);
});

router.delete('/courses', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const courseName = String(req.query.name || req.body.name || req.query.id || '').trim();
    if (!courseName) return res.status(400).json({ error: 'Falta nombre de curso' });

    const courseId = `course_${courseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    await query('DELETE FROM courses WHERE name = $1 OR id = $2 OR id = $3', [courseName, courseId, req.query.id]).catch(() => {});

    // Reset profesor_jefe for matching students
    await query(
      'UPDATE students SET profesor_jefe = \'Sin Asignar\' WHERE desc_grado = $1 OR desc_grado LIKE $2',
      [courseName, `${courseName}%`]
    ).catch(() => {});

    const allStRes = await query('SELECT id, run, desc_grado, letra_curso FROM students').catch(() => ({ rows: [] }));
    const stRows = allStRes.rows || [];
    const matchingStudents = stRows.filter((s: any) => getStudentCourseHelper(s) === courseName || s.desc_grado === courseName);
    for (const s of matchingStudents) {
      if (s.id) {
        await query('UPDATE students SET profesor_jefe = \'Sin Asignar\' WHERE id = $1', [s.id]).catch(() => {});
      }
    }

    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.courses)) {
          store.courses = store.courses.filter((c: any) => c.name !== courseName && c.id !== courseId && String(c.id) !== String(req.query.id));
        }
        if (Array.isArray(store.students)) {
          store.students.forEach((s: any) => {
            if (getStudentCourseHelper(s) === courseName || s.desc_grado === courseName || s.level_name === courseName) {
              s.profesor_jefe = 'Sin Asignar';
            }
          });
        }
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
      } catch (_) {}
    }

    res.json({ success: true, message: 'Curso eliminado de la base de datos' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/courses', authMiddleware, async (req: Request, res: Response) => {
  try {
    const coursesRes = await query('SELECT * FROM courses').catch(() => ({ rows: [] }));
    const dbCourses = coursesRes.rows || [];
    
    const levelsRes = await query('SELECT name, total_capacity as capacity FROM levels WHERE total_capacity IS NOT NULL').catch(() => ({ rows: [] }));
    const dbLevels = levelsRes.rows || [];

    let storeCourses: any[] = [];
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.courses)) {
          storeCourses = store.courses;
        }
      } catch (_) {}
    }

    const courseMap = new Map();
    dbLevels.forEach((l: any) => {
      if (l && l.name) {
        courseMap.set(l.name, {
          id: `level_${l.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
          name: l.name,
          capacity: Number(l.capacity) || 45,
          teacher: 'Sin Asignar'
        });
      }
    });
    storeCourses.forEach((c: any) => {
      if (c && c.name) {
        const existing = courseMap.get(c.name) || {};
        courseMap.set(c.name, { ...existing, ...c, capacity: Number(c.capacity) || existing.capacity || 45 });
      }
    });
    dbCourses.forEach((c: any) => {
      if (c && c.name) {
        const existing = courseMap.get(c.name) || {};
        courseMap.set(c.name, { ...existing, ...c, capacity: Number(c.capacity) || existing.capacity || 45 });
      }
    });

    res.json({ success: true, courses: Array.from(courseMap.values()) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// COMUNICACIÓN FOCALIZADA: MENSAJES Y CORREOS A DOCENTES DE UN CURSO ESPECÍFICO
// -----------------------------------------------------------------------------

function normalizeTeacherStr(str: any): string {
  if (!str) return '';
  return String(str).toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTeacherRun(r: any): string {
  if (!r) return '';
  return String(r).replace(/\./g, '').trim();
}

router.get('/courses/teachers-summary', authMiddleware, async (req: Request, res: Response) => {
  try {
    const targetCourse = String(req.query.course || '').trim();

    const [usersRes, staffRes, assignmentsRes, coursesRes, studentsRes, pieRes] = await Promise.all([
      query('SELECT id, name, email, role, run FROM users').catch(() => ({ rows: [] })),
      query('SELECT id, full_name, email, role, run, user_id FROM staff_profiles').catch(() => ({ rows: [] })),
      query('SELECT teacher_id, teacher_name, teacher_id_2, teacher_name_2, level_name, subject_name FROM teacher_assignments').catch(() => ({ rows: [] })),
      query('SELECT id, name, teacher FROM courses').catch(() => ({ rows: [] })),
      query('SELECT DISTINCT desc_grado, letra_curso, profesor_jefe, profesor_pie FROM students WHERE (profesor_jefe IS NOT NULL AND profesor_jefe != \'\') OR (profesor_pie IS NOT NULL AND profesor_pie != \'\')').catch(() => ({ rows: [] })),
      query('SELECT teacher_email, teacher_name, courses_allowed FROM pie_course_permissions').catch(() => ({ rows: [] }))
    ]);

    const usersList = usersRes.rows || [];
    const staffList = staffRes.rows || [];
    const assignmentsList = assignmentsRes.rows || [];
    const coursesList = coursesRes.rows || [];
    const studentsList = studentsRes.rows || [];
    const pieList = pieRes.rows || [];

    // Helper para asociar datos oficiales de usuario o funcionario
    const matchOfficialTeacher = (rawName: string, rawId?: string, rawEmail?: string, rawRun?: string) => {
      let matchedUser: any = null;
      let matchedStaff: any = null;

      if (rawId) {
        matchedUser = usersList.find((u: any) => u.id === rawId);
        matchedStaff = staffList.find((s: any) => s.id === rawId || s.user_id === rawId);
      }

      if (!matchedUser && rawEmail) {
        const cleanE = rawEmail.trim().toLowerCase();
        matchedUser = usersList.find((u: any) => (u.email || '').trim().toLowerCase() === cleanE);
        matchedStaff = staffList.find((s: any) => (s.email || '').trim().toLowerCase() === cleanE);
      }

      if (!matchedUser && rawRun) {
        const cRun = cleanTeacherRun(rawRun);
        matchedUser = usersList.find((u: any) => cleanTeacherRun(u.run) === cRun);
        matchedStaff = staffList.find((s: any) => cleanTeacherRun(s.run) === cRun);
      }

      if (!matchedUser && rawName) {
        const normRaw = normalizeTeacherStr(rawName);
        const rawTokens = normRaw.split(' ').filter(t => t.length >= 3);
        if (rawTokens.length > 0) {
          matchedUser = usersList.find((u: any) => {
            const uTokens = normalizeTeacherStr(u.name).split(' ').filter(t => t.length >= 3);
            const common = rawTokens.filter(t => uTokens.includes(t));
            return common.length >= 2 || (rawTokens.length === 1 && common.length === 1);
          });
          matchedStaff = staffList.find((s: any) => {
            const sTokens = normalizeTeacherStr(s.full_name).split(' ').filter(t => t.length >= 3);
            const common = rawTokens.filter(t => sTokens.includes(t));
            return common.length >= 2 || (rawTokens.length === 1 && common.length === 1);
          });
        }
      }

      const officialName = (matchedUser && matchedUser.name) || (matchedStaff && matchedStaff.full_name) || rawName;
      const email = (matchedUser && matchedUser.email) || (matchedStaff && matchedStaff.email) || rawEmail || '';
      const run = (matchedUser && matchedUser.run) || (matchedStaff && matchedStaff.run) || rawRun || '';
      const userId = (matchedUser && matchedUser.id) || (matchedStaff && matchedStaff.user_id) || null;

      return { officialName, email, run, userId };
    };

    // Mapeador de profesores para el curso solicitado
    const teachersMap = new Map<string, any>();

    const registerTeacher = (rawName: string, role: string, subject: string, rawId?: string, rawEmail?: string) => {
      if (!rawName || rawName === 'Sin Asignar' || rawName === 'null' || rawName === 'undefined') return;
      const official = matchOfficialTeacher(rawName, rawId, rawEmail);

      const key = official.email
        ? official.email.toLowerCase()
        : (official.run ? cleanTeacherRun(official.run) : normalizeTeacherStr(official.officialName));

      if (!key) return;

      if (teachersMap.has(key)) {
        const existing = teachersMap.get(key);
        if (subject && !existing.subjects.includes(subject)) existing.subjects.push(subject);
        if (role && !existing.roles.includes(role)) existing.roles.push(role);
        if (role === 'Profesor Jefe') existing.isHomeroom = true;
        if (!existing.email && official.email) {
          existing.email = official.email;
          existing.hasEmail = true;
        }
        if (!existing.userId && official.userId) existing.userId = official.userId;
      } else {
        teachersMap.set(key, {
          id: official.userId || `teacher_${key}`,
          userId: official.userId,
          name: official.officialName,
          email: official.email,
          hasEmail: Boolean(official.email && official.email.includes('@')),
          run: official.run,
          isHomeroom: role === 'Profesor Jefe',
          roles: role ? [role] : [],
          subjects: subject ? [subject] : []
        });
      }
    };

    const normTarget = normalizeTeacherStr(targetCourse);

    // 1. Asignaciones de asignatura
    assignmentsList.forEach((a: any) => {
      const aCourseNorm = normalizeTeacherStr(a.level_name);
      if (!targetCourse || aCourseNorm === normTarget) {
        registerTeacher(a.teacher_name, 'Docente de Asignatura', a.subject_name || 'Asignatura', a.teacher_id);
        if (a.teacher_name_2) {
          registerTeacher(a.teacher_name_2, 'Co-Docente', a.subject_name || 'Asignatura', a.teacher_id_2);
        }
      }
    });

    // 2. Cursos institucionales (Profesor Jefe)
    coursesList.forEach((c: any) => {
      const cCourseNorm = normalizeTeacherStr(c.name);
      if (!targetCourse || cCourseNorm === normTarget) {
        if (c.teacher) {
          registerTeacher(c.teacher, 'Profesor Jefe', 'Jefatura de Curso');
        }
      }
    });

    // 3. Estudiantes (Profesor Jefe y PIE)
    studentsList.forEach((st: any) => {
      const fullCourseName = `${st.desc_grado || ''} ${st.letra_curso || ''}`.trim();
      const norm1 = normalizeTeacherStr(fullCourseName);
      const norm2 = normalizeTeacherStr(st.desc_grado);
      if (!targetCourse || norm1 === normTarget || norm2 === normTarget) {
        if (st.profesor_jefe) {
          registerTeacher(st.profesor_jefe, 'Profesor Jefe', 'Jefatura de Curso');
        }
        if (st.profesor_pie) {
          registerTeacher(st.profesor_pie, 'Docente PIE', 'PIE');
        }
      }
    });

    // 4. Permisos PIE
    pieList.forEach((p: any) => {
      const allowedStr = normalizeTeacherStr(p.courses_allowed || '');
      if (!targetCourse || allowedStr.includes(normTarget)) {
        registerTeacher(p.teacher_name, 'Docente PIE', 'PIE', undefined, p.teacher_email);
      }
    });

    const teachers = Array.from(teachersMap.values()).sort((a, b) => {
      if (a.isHomeroom && !b.isHomeroom) return -1;
      if (!a.isHomeroom && b.isHomeroom) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      course: targetCourse,
      totalTeachers: teachers.length,
      teachers
    });
  } catch (err: any) {
    console.error('Error al obtener resumen de docentes del curso:', err);
    res.status(500).json({ error: 'Error al consultar docentes del curso.' });
  }
});

router.post('/courses/send-message', authMiddleware, async (req: Request, res: Response) => {
  const {
    courseName,
    channels = ['platform', 'email'],
    priority = 'normal',
    category = 'General',
    subject,
    message,
    recipients
  } = req.body;

  const cName = String(courseName || '').trim();
  const sub = String(subject || '').trim();
  const msg = String(message || '').trim();
  const prio = (['normal', 'importante', 'urgente'].includes(priority) ? priority : 'normal') as 'normal' | 'importante' | 'urgente';
  const selectedChannels: string[] = Array.isArray(channels) && channels.length > 0 ? channels : ['platform', 'email'];

  if (!cName) {
    return res.status(400).json({ error: 'Debe especificar el curso destinatario.' });
  }
  if (!sub) {
    return res.status(400).json({ error: 'El asunto o título del mensaje es obligatorio.' });
  }
  if (!msg) {
    return res.status(400).json({ error: 'El contenido del mensaje no puede estar vacío.' });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'Debe haber al menos un profesor destinatario seleccionado.' });
  }

  const senderName = req.user?.name || 'Administración LTP';
  const senderRole = req.user?.role || 'Docente';
  const senderEmail = req.user?.email || undefined;
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  let platformCount = 0;
  let emailSentCount = 0;
  let emailFailedCount = 0;
  const emailErrors: string[] = [];

  try {
    // 1. ENVÍO POR PLATAFORMA (Notificaciones Internas en system_notifications)
    if (selectedChannels.includes('platform')) {
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        const notifId = `NOTIF-CRS-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        const notifTitle = `[${cName}] ${prio === 'urgente' ? '🚨 ' : prio === 'importante' ? '⚠️ ' : '📢 '}${sub}`;
        const notifBody = `📌 Comunicado Oficial para el Equipo Docente del curso ${cName}\n👤 De: ${senderName} (${senderRole})\n⚡ Prioridad: ${prio.toUpperCase()} | 📁 Categoría: ${category}\n\n${msg}`;

        try {
          await query(
            `INSERT INTO system_notifications (id, user_id, target_role, target_run, reference_id, type, title, message, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW())`,
            [
              notifId,
              r.userId || null,
              'Docente',
              r.run ? cleanTeacherRun(r.run) : null,
              cName,
              'COURSE_MESSAGE',
              notifTitle,
              notifBody
            ]
          );
          platformCount++;
        } catch (dbErr: any) {
          console.error(`Error guardando notificación para docente ${r.name}:`, dbErr.message);
        }
      }
    }

    // 2. ENVÍO POR CORREO ELECTRÓNICO (Vía nodemailer SMTP Google Workspace)
    if (selectedChannels.includes('email')) {
      for (const r of recipients) {
        if (r.email && r.email.includes('@')) {
          try {
            const mailRes = await sendCourseBroadcastEmail({
              toEmail: r.email,
              recipientName: r.name,
              senderName,
              senderRole,
              senderEmail,
              courseName: cName,
              subject: sub,
              message: msg,
              priority: prio,
              category,
              loginUrl
            });

            if (mailRes.success) {
              emailSentCount++;
            } else {
              emailFailedCount++;
              emailErrors.push(`${r.name} (${r.email}): ${mailRes.error || 'Fallo de entrega'}`);
            }
          } catch (mErr: any) {
            emailFailedCount++;
            emailErrors.push(`${r.name} (${r.email}): ${mErr.message}`);
          }
        }
      }
    }

    // 3. REGISTRO DE AUDITORÍA
    const auditDetail = `Mensaje enviado al curso "${cName}" (${recipients.length} docentes seleccionados). Canales: [${selectedChannels.join(', ')}]. Plataforma: ${platformCount}, Correos: ${emailSentCount}${emailFailedCount > 0 ? `, Fallidos: ${emailFailedCount}` : ''}. Asunto: "${sub}".`;
    await logAudit(req, 'SEND_COURSE_MESSAGE', auditDetail);

    res.json({
      success: true,
      message: `Mensaje enviado exitosamente a los docentes del curso ${cName}.`,
      summary: {
        courseName: cName,
        totalRecipients: recipients.length,
        channels: selectedChannels,
        platformNotificationsCount: platformCount,
        emailsSentCount: emailSentCount,
        emailsFailedCount: emailFailedCount,
        emailErrors
      }
    });
  } catch (err: any) {
    console.error('Error al procesar envío de mensaje a curso:', err);
    res.status(500).json({ error: 'Error interno al enviar comunicación al curso.' });
  }
});

router.get('/subjects', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM subjects ORDER BY id ASC').catch(() => ({ rows: [] }));
    const dbSubjects = result.rows || [];

    let storeSubjects: any[] = [];
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.subjects)) {
          storeSubjects = store.subjects;
        }
      } catch (_) {}
    }

    const map = new Map<string, any>();
    dbSubjects.forEach((s: any) => { if (s && (s.name || s.nombre)) map.set(s.name || s.nombre, { id: s.id, name: s.name || s.nombre }); });
    storeSubjects.forEach((s: any) => { if (s && (s.name || s.nombre)) map.set(s.name || s.nombre, { id: s.id, name: s.name || s.nombre }); });

    res.json(Array.from(map.values()));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/grade-columns', authMiddleware, checkRoles(['Admin', 'Director', 'Docente']), async (req: Request, res: Response) => {
  try {
    const columnId = String(req.query.id || req.body.id || '').trim();
    if (!columnId) return res.status(400).json({ error: 'Falta ID de columna' });

    await query('DELETE FROM grade_columns WHERE id = $1', [columnId]).catch(() => {});
    await query('DELETE FROM grades WHERE grade_column_id = $1', [columnId]).catch(() => {});
    await query('DELETE FROM cumulative_grades WHERE grade_column_id = $1', [columnId]).catch(() => {});

    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.grade_columns)) {
          store.grade_columns = store.grade_columns.filter((c: any) => String(c.id) !== columnId);
        }
        if (Array.isArray(store.grades)) {
          store.grades = store.grades.filter((g: any) => String(g.grade_column_id) !== columnId);
        }
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
      } catch (_) {}
    }

    res.json({ success: true, message: 'Columna de evaluación eliminada' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// GESTIÓN DE ENTREVISTAS (PERSISTENCIA TOTAL EN BASE DE DATOS)
// -----------------------------------------------------------------------------
router.get('/interviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM interviews ORDER BY date DESC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar entrevistas.' });
  }
});

// Búsqueda cruzada de Estudiantes, Funcionarios y Apoderados
router.get('/interviews/search-entities', authMiddleware, async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.json({ students: [], staff: [], guardians: [] });
  }
  const term = `%${q}%`;
  try {
    const studentsPromise = query(
      `SELECT id, run, full_name, desc_grado, profesor_jefe, profesor_asignatura, profesor_pie, guardian_name, guardian_run, guardian_phone, guardian_relation
       FROM students
       WHERE full_name LIKE $1 OR run LIKE $1
       LIMIT 8`,
      [term]
    ).catch(() => ({ rows: [] }));

    const staffPromise = query(
      `SELECT id, run, name, email, role
       FROM users
       WHERE name LIKE $1 OR run LIKE $1
       LIMIT 8`,
      [term]
    ).catch(() => ({ rows: [] }));

    const guardiansPromise = query(
      `SELECT id as student_id, guardian_name, guardian_run, guardian_phone, guardian_relation, full_name as student_name, desc_grado as student_course, profesor_jefe, profesor_asignatura, profesor_pie
       FROM students
       WHERE guardian_name IS NOT NULL AND guardian_name != '' AND (guardian_name LIKE $1 OR guardian_run LIKE $1)
       LIMIT 8`,
      [term]
    ).catch(() => ({ rows: [] }));

    const [studentsRes, staffRes, guardiansRes] = await Promise.all([studentsPromise, staffPromise, guardiansPromise]);

    res.json({
      students: studentsRes.rows || [],
      staff: staffRes.rows || [],
      guardians: guardiansRes.rows || []
    });
  } catch (err: any) {
    res.status(500).json({ error: `Error buscando entidades: ${err.message}` });
  }
});

router.get('/interviews/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const intRes = await query('SELECT * FROM interviews WHERE id = $1 LIMIT 1', [id]);
    if (intRes.rows.length === 0) {
      return res.status(404).json({ error: 'Entrevista no encontrada.' });
    }
    const interview = intRes.rows[0];
    const partRes = await query('SELECT * FROM interview_participants WHERE interview_id = $1 ORDER BY id ASC', [id]).catch(() => ({ rows: [] }));
    interview.participants = partRes.rows || [];
    res.json(interview);
  } catch (err: any) {
    res.status(500).json({ error: `Error al consultar la entrevista: ${err.message}` });
  }
});

router.post('/interviews', authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const interviewId = body.id || `INT-${Date.now()}`;
    const interviewerName = body.interviewerName || body.interviewer_name || req.user?.name || 'Entrevistador Institucional';
    const interviewerId = body.interviewerId || body.interviewer_id || req.user?.id || 'USR-SYSTEM';
    const privacy = body.privacy || 'Pública';
    const status = body.status || 'Abierta';
    const dateVal = body.date || new Date().toISOString().split('T')[0];
    const timeVal = body.time || '10:00';
    const intervieweeName = body.intervieweeName || body.interviewee_name || 'Estudiante / Apoderado';
    const intervieweeRun = body.intervieweeRun || body.interviewee_run || '';
    const intervieweeRole = body.intervieweeRole || body.interviewee_role || 'Estudiante';
    const courseName = body.courseName || body.course_name || '';
    const homeroomTeacher = body.homeroomTeacher || body.homeroom_teacher || '';
    const subjectTeacher = body.subjectTeacher || body.subject_teacher || '';
    const pieSpecialist = body.pieSpecialist || body.pie_specialist || '';
    const followupDate = body.followupDate || body.followup_date || '';
    const driveUrl = body.driveUrl || body.drive_url || '';
    const driveTitle = body.driveTitle || body.drive_title || '';
    const showInResume = body.showInResume !== undefined ? (body.showInResume ? 1 : 0) : 1;
    const objective = body.objective || '';
    const reason = body.reason || '';
    const agreements = body.agreements || '';
    const topics = body.topics || reason || objective || 'Entrevista Institucional';
    const generalObservations = body.generalObservations || body.general_observations || '';
    let studentId = body.studentId || body.student_id || null;

    if (!studentId && intervieweeRun) {
      const stuRes = await query('SELECT id FROM students WHERE run = $1 LIMIT 1', [intervieweeRun]).catch(() => ({ rows: [] }));
      if (stuRes.rows.length > 0) {
        studentId = stuRes.rows[0].id;
      }
    }

    await query(
      `INSERT INTO interviews (
        id, student_id, student_name, interviewee_run, interviewee_name, interviewee_role,
        course_name, homeroom_teacher, subject_teacher, pie_specialist,
        date, time, interviewer_name, interviewer_id, status, privacy, followup_date,
        objective, topics, reason, agreements, general_observations,
        drive_url, drive_title, show_in_resume
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
      [
        interviewId, studentId, intervieweeName, intervieweeRun, intervieweeName, intervieweeRole,
        courseName, homeroomTeacher, subjectTeacher, pieSpecialist,
        dateVal, timeVal, interviewerName, interviewerId, status, privacy, followupDate,
        objective, topics, reason, agreements, generalObservations,
        driveUrl, driveTitle, showInResume
      ]
    );

    // Guardar participantes si vienen en la petición
    if (Array.isArray(body.participants) && body.participants.length > 0) {
      for (let idx = 0; idx < body.participants.length; idx++) {
        const p = body.participants[idx];
        const pId = p.id || `PRT-${Date.now()}-${idx + 1}`;
        await query(
          `INSERT INTO interview_participants (
            id, interview_id, user_id, username, role, comment, signature, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            pId, interviewId, p.user_id || interviewerId, p.username || p.name || 'Participante',
            p.role || 'Participante', p.comment || p.statement || '', p.signature || '', 'COMPLETADO'
          ]
        ).catch(() => {});
      }
    }

    // Si está marcado para mostrar en la hoja de vida y hay estudiante asociado
    if (showInResume && studentId) {
      const obsId = `OBS-INT-${interviewId}`;
      const obsContent = `[Acta Entrevista ${interviewId}] ${objective ? 'Objetivo: ' + objective + '. ' : ''}${agreements ? 'Acuerdos: ' + agreements : ''}`;
      await query(
        `INSERT INTO observations (id, student_id, type, detail, author_name, date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON DUPLICATE KEY UPDATE detail = VALUES(detail)`,
        [obsId, studentId, 'Positiva', obsContent, interviewerName, dateVal]
      ).catch(() => {});
    }

    await logAudit(req, 'CREATE_INTERVIEW', `Acta de entrevista ${interviewId} registrada para ${intervieweeName} (${privacy})`);
    res.json({ success: true, id: interviewId });
  } catch (err: any) {
    console.error('Error al registrar entrevista:', err);
    res.status(500).json({ error: `Error al registrar entrevista: ${err.message}` });
  }
});

router.get('/interviews/:id/participants', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM interview_participants WHERE interview_id = $1 ORDER BY id ASC', [id]);
    res.json(result.rows || []);
  } catch (err: any) {
    res.status(500).json({ error: `Error al consultar participantes: ${err.message}` });
  }
});

router.post('/interviews/:id/participants', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const p = req.body;
    const pId = p.id || `PRT-${Date.now()}`;
    await query(
      `INSERT INTO interview_participants (
        id, interview_id, user_id, username, role, comment, signature, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        pId, id, p.user_id || req.user?.id || 'USR-SYSTEM', p.username || p.name || 'Participante',
        p.role || 'Participante', p.comment || p.statement || '', p.signature || '', 'COMPLETADO'
      ]
    );
    res.json({ success: true, id: pId });
  } catch (err: any) {
    res.status(500).json({ error: `Error al guardar participante: ${err.message}` });
  }
});

// -----------------------------------------------------------------------------
// GESTIÓN DE RELATOS CON TEMPORIZADOR Y NOTIFICACIONES DE PARTICIPANTES
// -----------------------------------------------------------------------------
router.post('/interviews/request-participant-statement', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      interviewId = 'EN-REDACCION',
      participantId,
      timeLimitMinutes = 30,
      targetUserId,
      targetRun,
      targetName,
      targetRole = 'Participante',
      intervieweeName,
      objective
    } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'ID de participante es obligatorio' });
    }

    const minutes = Math.max(1, parseInt(String(timeLimitMinutes), 10) || 30);
    const now = new Date();
    const deadline = new Date(now.getTime() + minutes * 60 * 1000);

    const formatSqlDate = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
    const requestedAtStr = formatSqlDate(now);
    const deadlineStr = formatSqlDate(deadline);

    const existing = await query('SELECT * FROM interview_participants WHERE id = $1', [participantId]);
    if (existing.rows && existing.rows.length > 0) {
      await query(
        `UPDATE interview_participants SET
          status = 'PENDIENTE',
          user_id = $1,
          user_run = $2,
          username = $3,
          role = $4,
          requested_at = $5,
          request_deadline = $6,
          time_limit_minutes = $7
        WHERE id = $8`,
        [targetUserId || existing.rows[0].user_id, targetRun || existing.rows[0].user_run, targetName || existing.rows[0].username, targetRole, requestedAtStr, deadlineStr, minutes, participantId]
      );
    } else {
      await query(
        `INSERT INTO interview_participants (
          id, interview_id, user_id, user_run, username, role, status, requested_at, request_deadline, time_limit_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE', $7, $8, $9)`,
        [participantId, interviewId, targetUserId || 'USR-PENDING', targetRun || '', targetName || 'Participante', targetRole, requestedAtStr, deadlineStr, minutes]
      );
    }

    // Crear notificación en system_notifications
    const notifId = `NOTIF-STMT-${Date.now()}`;
    const cleanRun = targetRun ? targetRun.replace(/\./g, '').trim() : '';
    const notifMsg = `Se ha solicitado su relato oficial para la entrevista${intervieweeName ? ' con ' + intervieweeName : ''}. Plazo límite: ${minutes} minutos.`;

    await query(
      `INSERT INTO system_notifications (
        id, user_id, target_run, target_role, type, title, message, reference_id, is_read
      ) VALUES ($1, $2, $3, $4, 'INTERVIEW_STATEMENT_REQUEST', 'Solicitud de Declaración en Entrevista', $5, $6, 0)`,
      [
        notifId,
        targetUserId || null,
        targetRun || cleanRun || null,
        targetRole,
        notifMsg,
        `${interviewId}:${participantId}`
      ]
    ).catch(err => console.error('Error creando notificación:', err));

    res.json({
      success: true,
      participantId,
      requestedAt: requestedAtStr,
      requestDeadline: deadlineStr,
      timeLimitMinutes: minutes
    });
  } catch (err: any) {
    console.error('Error solicitando relato:', err);
    res.status(500).json({ error: `Error solicitando relato: ${err.message}` });
  }
});

router.get('/interviews/pending-statements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || '';
    const userRun = req.user?.run || '';
    const cleanRun = userRun.replace(/\./g, '').trim();

    const result = await query(
      `SELECT
        p.id as participant_id,
        p.interview_id,
        p.username as participant_name,
        p.user_run,
        p.role as participant_role,
        p.status,
        p.comment,
        p.requested_at,
        p.request_deadline,
        p.time_limit_minutes,
        i.interviewee_name,
        i.interviewee_role,
        i.course_name,
        i.date as interview_date,
        i.time as interview_time,
        i.objective,
        i.reason,
        i.interviewer_name
      FROM interview_participants p
      LEFT JOIN interviews i ON p.interview_id = i.id
      WHERE (p.user_id = $1 OR p.user_run = $2 OR REPLACE(p.user_run, '.', '') = $3)
        AND p.status = 'PENDIENTE'
      ORDER BY p.requested_at DESC`,
      [userId, userRun, cleanRun]
    );

    const now = Date.now();
    const rows = (result.rows || []).map((row: any) => {
      let secondsRemaining = 0;
      if (row.request_deadline) {
        const deadlineMs = new Date(row.request_deadline).getTime();
        secondsRemaining = Math.max(0, Math.floor((deadlineMs - now) / 1000));
      }
      return {
        ...row,
        secondsRemaining,
        isExpired: secondsRemaining <= 0
      };
    });

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: `Error al consultar relatos pendientes: ${err.message}` });
  }
});

router.post('/interviews/submit-participant-statement', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { participantId, statement, signature } = req.body;
    if (!participantId || !statement) {
      return res.status(400).json({ error: 'ID de participante y relato son obligatorios' });
    }

    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await query(
      `UPDATE interview_participants SET
        comment = $1,
        signature = $2,
        status = 'COMPLETADO',
        comment_date = $3
      WHERE id = $4`,
      [statement, signature || '', nowStr, participantId]
    );

    await query(
      `UPDATE system_notifications SET is_read = 1 WHERE reference_id LIKE $1`,
      [`%:${participantId}`]
    ).catch(() => {});

    await logAudit(req, 'SUBMIT_INTERVIEW_STATEMENT', `Relato oficial registrado para participante ${participantId}`);
    res.json({ success: true, message: 'Relato y firma guardados exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: `Error al guardar relato: ${err.message}` });
  }
});

router.get('/interviews/participants-status', authMiddleware, async (req: Request, res: Response) => {
  const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean);
  if (ids.length === 0) return res.json([]);
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(
      `SELECT id, interview_id, user_id, user_run, username, role, status, comment, signature, requested_at, request_deadline, time_limit_minutes, comment_date
       FROM interview_participants WHERE id IN (${placeholders})`,
      ids
    );
    const now = Date.now();
    const rows = (result.rows || []).map((p: any) => {
      let secondsRemaining = 0;
      if (p.request_deadline) {
        const deadlineMs = new Date(p.request_deadline).getTime();
        secondsRemaining = Math.max(0, Math.floor((deadlineMs - now) / 1000));
      }
      return {
        ...p,
        secondsRemaining,
        isExpired: p.status === 'PENDIENTE' && secondsRemaining <= 0
      };
    });
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/interviews/:id', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM interview_participants WHERE interview_id = $1', [id]).catch(() => {});
    await query('DELETE FROM interviews WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_INTERVIEW', `Entrevista ${id} eliminada`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar entrevista.' });
  }
});

// -----------------------------------------------------------------------------
// MULTIVISTA DUAL EN VIVO (SINCRONIZACIÓN EN TIEMPO REAL CON QR)
// -----------------------------------------------------------------------------
const MAX_MULTIVIEW_SESSIONS = 100;
const multiviewSessions = new Map<string, { interviewee_name: string; objective: string; agreements: string; status: string; updatedAt: number }>();

// Limpieza periódica de sesiones con más de 12 horas
setInterval(() => {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [code, item] of multiviewSessions.entries()) {
    if (item.updatedAt < cutoff) {
      multiviewSessions.delete(code);
    }
  }
}, 15 * 60 * 1000);

router.post('/multiview/sync', (req: Request, res: Response) => {
  const { sessionCode, data } = req.body;
  const cleanCode = String(sessionCode || '').trim();
  // Validar formato de sessionCode seguro (ej. LTP-123456 o alfanumérico de 4 a 32 caracteres)
  if (!cleanCode || !/^[A-Za-z0-9_-]{4,32}$/.test(cleanCode)) {
    return res.status(400).json({ error: 'Código de sesión inválido.' });
  }

  // Prevenir agotamiento de memoria por DoS (límite máximo de sesiones activas)
  if (multiviewSessions.size >= MAX_MULTIVIEW_SESSIONS && !multiviewSessions.has(cleanCode)) {
    const oldestKey = multiviewSessions.keys().next().value;
    if (oldestKey) multiviewSessions.delete(oldestKey);
  }

  const safeData = {
    interviewee_name: String(data?.interviewee_name || '').slice(0, 150),
    objective: String(data?.objective || '').slice(0, 500),
    agreements: String(data?.agreements || '').slice(0, 2000),
    status: String(data?.status || 'Redacción en Vivo').slice(0, 50),
    updatedAt: Date.now()
  };

  multiviewSessions.set(cleanCode, safeData);
  res.json({ success: true });
});

router.get('/multiview/live', (req: Request, res: Response) => {
  const sessionCode = String(req.query.session || '').trim();
  if (sessionCode && multiviewSessions.has(sessionCode)) {
    res.json(multiviewSessions.get(sessionCode));
  } else {
    res.json({
      interviewee_name: 'Esperando datos...',
      objective: 'Sincronizando sesión...',
      agreements: 'Aún no se han redactado acuerdos.',
      status: 'Conectado'
    });
  }
});

// -----------------------------------------------------------------------------
// HOJA DE VIDA Y ANOTACIONES DE CONVIVENCIA (PERSISTENCIA TOTAL EN BASE DE DATOS)
// -----------------------------------------------------------------------------
router.get(['/observations', '/student-observations'], authMiddleware, async (req: Request, res: Response) => {
  const { studentId } = req.query;
  try {
    let sql = 'SELECT * FROM student_observations';
    const params: any[] = [];
    if (studentId) {
      params.push(studentId);
      sql += ' WHERE student_id = $1';
    }
    sql += ' ORDER BY created_at DESC, date DESC';
    const result = await query(sql, params).catch(async () => {
      let fallbackSql = 'SELECT * FROM observations';
      const fallbackParams: any[] = [];
      if (studentId) {
        fallbackParams.push(studentId);
        fallbackSql += ' WHERE student_id = $1';
      }
      fallbackSql += ' ORDER BY created_at DESC, date DESC';
      return await query(fallbackSql, fallbackParams).catch(() => ({ rows: [] }));
    });

    const rows = (result.rows || []).map((r: any) => ({
      ...r,
      content: r.detail || r.content || '',
      detail: r.detail || r.content || '',
      studentId: r.student_id || r.studentId,
      student_id: r.student_id || r.studentId,
      author_name: r.author_name || r.author || 'Docente / Funcionario',
      date: r.date,
      created_at: r.created_at || r.date
    }));

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar observaciones.' });
  }
});

router.post(['/observations', '/student-observations'], authMiddleware, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const obsId = body.id || `OBS-${Date.now()}`;
    const studentId = body.studentId || body.student_id || 'STU-001';
    const obsType = body.type || 'Positiva';
    const detail = body.detail || body.content || '';
    const authorId = body.authorId || body.author_id || req.user?.id || 'USR-SYSTEM';
    const authorName = body.authorName || body.author_name || req.user?.name || 'Docente Institucional';
    const now = new Date();
    const dateVal = body.date || now.toISOString().split('T')[0];

    if (!detail.trim()) {
      return res.status(400).json({ error: 'El detalle de la observación es obligatorio.' });
    }

    await query(
      `INSERT INTO student_observations (id, student_id, type, detail, author_id, author_name, date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [obsId, studentId, obsType, detail.trim(), authorId, authorName, dateVal, now]
    ).catch(async () => {
      return await query(
        `INSERT INTO student_observations (id, student_id, type, detail, author_id, author_name, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [obsId, studentId, obsType, detail.trim(), authorId, authorName, dateVal]
      ).catch(async () => {
        return await query(
          `INSERT INTO observations (id, student_id, type, detail, author_name, date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [obsId, studentId, obsType, detail.trim(), authorName, dateVal]
        );
      });
    });

    await logAudit(req, 'CREATE_OBSERVATION', `Anotación ${obsType} registrada para alumno ${studentId} por ${authorName}`);
    res.json({ success: true, id: obsId, observation: { id: obsId, student_id: studentId, type: obsType, detail, content: detail, author_name: authorName, date: dateVal, created_at: now } });
  } catch (err: any) {
    console.error('Error al registrar observación:', err);
    res.status(500).json({ error: `Error al registrar observación: ${err.message}` });
  }
});

router.delete(['/observations/:id', '/student-observations/:id'], authMiddleware, checkRoles(['Admin', 'Docente']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM student_observations WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_OBSERVATION', `Observación ${id} eliminada`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar observación.' });
  }
});

// -----------------------------------------------------------------------------
// GESTIÓN DOCUMENTAL Y PROTOCOLOS INSTITUCIONALES (ADMINISTRATION MODULE)
// -----------------------------------------------------------------------------
router.get('/admin/documents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM institutional_documents ORDER BY date DESC, id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar documentos institucionales.' });
  }
});

router.post('/admin/documents', authMiddleware, checkRoles(['Admin', 'Administrativo']), async (req: Request, res: Response) => {
  const { date, type, title, responsible, status, description } = req.body;
  if (!title || !responsible) {
    return res.status(400).json({ error: 'Título y Responsable del documento son requeridos.' });
  }
  try {
    const dateVal = date || new Date().toISOString().split('T')[0];
    const typeVal = type || 'Protocolo';
    const statusVal = status || 'Pendiente';

    await query(
      `INSERT INTO institutional_documents (date, type, title, responsible, status, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [dateVal, typeVal, title.trim(), responsible.trim(), statusVal, description || title.trim()]
    );

    await logAudit(req, 'CREATE_INSTITUTIONAL_DOCUMENT', `Documento institucional "${title}" (${typeVal}) registrado`);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error registrando documento:', err);
    res.status(500).json({ error: 'Error al registrar documento institucional.' });
  }
});

router.delete('/admin/documents/:id', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM institutional_documents WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_INSTITUTIONAL_DOCUMENT', `Documento ${id} eliminado`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar documento.' });
  }
});

// -----------------------------------------------------------------------------
// AUDITORÍA INALTERABLE SILENT-WATCH
// -----------------------------------------------------------------------------
router.get(['/audit', '/audit-logs'], authMiddleware, checkMatrixPermission('audit_logs'), async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 300');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar auditoría:', err);
    res.status(500).json({ error: 'Error al consultar auditoría.' });
  }
});

// -----------------------------------------------------------------------------
// PLATAFORMAS DE INTERÉS Y ENLACES INSTITUCIONALES EN SUPABASE CLOUD
// -----------------------------------------------------------------------------
router.get('/institutional-links', authMiddleware, async (req: Request, res: Response) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS institutional_links (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        color VARCHAR(255),
        category VARCHAR(100) DEFAULT 'Plataforma Institucional'
      );
    `).catch(() => { });

    let result = await query('SELECT * FROM institutional_links ORDER BY id ASC');
    if (result.rows.length === 0) {
      const defaultLinks = [
        { id: '1', name: 'Uso de Dispositivos Móviles', url: 'https://mineduc.cl', color: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', category: 'Plataforma Institucional' },
        { id: '2', name: 'Netcore / Lira Mineduc', url: 'https://lira.mineduc.cl', color: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', category: 'Plataforma Institucional' },
        { id: '3', name: 'Registro de Evaluaciones', url: 'https://classroom.google.com', color: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', category: 'Plataforma Institucional' },
        { id: '4', name: 'Registro de Uso de Sala de Computación', url: 'https://sep.mineduc.cl', color: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', category: 'Plataforma Institucional' }
      ];

      for (const l of defaultLinks) {
        await query(
          'INSERT INTO institutional_links (id, name, url, color, category) VALUES ($1, $2, $3, $4, $5)',
          [l.id, l.name, l.url, l.color, l.category]
        ).catch(() => { });
      }
      result = await query('SELECT * FROM institutional_links ORDER BY id ASC');
    }
    res.json(result.rows);
  } catch (err) {
    res.json([
      { id: '1', name: 'Uso de Dispositivos Móviles', url: 'https://mineduc.cl', color: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', category: 'Plataforma Institucional' },
      { id: '2', name: 'Netcore / Lira Mineduc', url: 'https://lira.mineduc.cl', color: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', category: 'Plataforma Institucional' },
      { id: '3', name: 'Registro de Evaluaciones', url: 'https://classroom.google.com', color: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', category: 'Plataforma Institucional' },
      { id: '4', name: 'Registro de Uso de Sala de Computación', url: 'https://sep.mineduc.cl', color: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', category: 'Plataforma Institucional' }
    ]);
  }
});

router.put('/institutional-links', authMiddleware, checkRoles(['Admin']), async (req: Request, res: Response) => {
  const { links } = req.body;
  if (!Array.isArray(links)) {
    return res.status(400).json({ error: 'La lista de enlaces debe ser un arreglo.' });
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS institutional_links (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        color VARCHAR(255),
        category VARCHAR(100) DEFAULT 'Plataforma Institucional'
      );
    `).catch(() => { });

    await query('DELETE FROM institutional_links').catch(() => {});

    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const id = String(l.id || `lnk_${Date.now()}_${i}`);
      const color = l.color || 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)';
      const category = l.category || 'Plataforma Institucional';
      await query(
        'INSERT INTO institutional_links (id, name, url, color, category) VALUES ($1, $2, $3, $4, $5)',
        [id, (l.name || '').trim(), (l.url || '').trim(), color, category]
      ).catch(() => {});
    }

    await logAudit(req, 'UPDATE_INSTITUTIONAL_LINKS', `Enlaces de plataformas de interés actualizados (${links.length} registros)`);
    const finalRows = await query('SELECT * FROM institutional_links ORDER BY id ASC');
    res.json({ success: true, links: finalRows.rows });
  } catch (err) {
    console.error('Error al guardar enlaces institucionales:', err);
    res.status(500).json({ error: 'Error al guardar plataformas de interés.' });
  }
});

// -----------------------------------------------------------------------------
// 10. BIBLIOTECA CRA – LICEO CAMPANARIO (SISTEMA INTEGRAL DE PRÉSTAMOS Y CONTROL)
// -----------------------------------------------------------------------------
async function ensureCraTablesExist() {
  if (isMysql) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cra_books (
        id VARCHAR(50) PRIMARY KEY,
        biblio_code VARCHAR(100) UNIQUE,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        publisher VARCHAR(255),
        year INT,
        isbn VARCHAR(50),
        category VARCHAR(100) DEFAULT 'Lectura Complementaria',
        level_suggested VARCHAR(100),
        is_reading_plan BOOLEAN DEFAULT FALSE,
        reading_period VARCHAR(100),
        location VARCHAR(100) DEFAULT 'Estante A-1',
        total_copies INT DEFAULT 1,
        available_copies INT DEFAULT 1,
        borrowed_copies INT DEFAULT 0,
        observations TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cra_book_copies (
        id VARCHAR(50) PRIMARY KEY,
        book_id VARCHAR(50) REFERENCES cra_books(id) ON DELETE CASCADE,
        copy_code VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'Disponible',
        condition_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cra_loans (
        id VARCHAR(50) PRIMARY KEY,
        book_id VARCHAR(50) REFERENCES cra_books(id) ON DELETE CASCADE,
        copy_id VARCHAR(50) REFERENCES cra_book_copies(id) ON DELETE CASCADE,
        student_id VARCHAR(100),
        student_name VARCHAR(255) NOT NULL,
        course_name VARCHAR(100) NOT NULL,
        teacher_name VARCHAR(255),
        book_title VARCHAR(255) NOT NULL,
        book_author VARCHAR(255) NOT NULL,
        copy_code VARCHAR(100) NOT NULL,
        loan_date DATE DEFAULT CURRENT_DATE,
        due_date DATE NOT NULL,
        return_date DATE,
        status VARCHAR(50) DEFAULT 'Activo',
        overdue_days INT DEFAULT 0,
        registered_by VARCHAR(255) NOT NULL,
        returned_by VARCHAR(255),
        override_reason TEXT,
        return_condition TEXT,
        observations TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cra_daily_materials (
        id VARCHAR(50) PRIMARY KEY,
        material_code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        total_qty INT DEFAULT 1,
        available_qty INT DEFAULT 1,
        borrowed_qty INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Disponible',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cra_daily_loans (
        id VARCHAR(50) PRIMARY KEY,
        material_id VARCHAR(50) REFERENCES cra_daily_materials(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,
        material_code VARCHAR(100) NOT NULL,
        student_id VARCHAR(100),
        student_name VARCHAR(255) NOT NULL,
        course_name VARCHAR(100) NOT NULL,
        loan_date DATE DEFAULT CURRENT_DATE,
        time_out VARCHAR(20) NOT NULL,
        time_in VARCHAR(20),
        status VARCHAR(50) DEFAULT 'Pendiente',
        registered_by VARCHAR(255) NOT NULL,
        returned_by VARCHAR(255),
        observations TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cra_email_logs (
        id VARCHAR(50) PRIMARY KEY,
        teacher_name VARCHAR(255) NOT NULL,
        teacher_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_text TEXT NOT NULL,
        student_cases_count INT DEFAULT 1,
        cases_json JSONB,
        sent_by VARCHAR(255) NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Enviado'
      );
    `).catch(err => console.error('⚠️ DDL CRA Error:', err));

    // Datos iniciales de demostración si las tablas están vacías
    const checkBooks = await query('SELECT COUNT(*) as count FROM cra_books');
    if (parseInt(checkBooks.rows[0]?.count || '0', 10) === 0) {
      const demoBooks = [
        { id: 'BK-001', code: 'CRA-101', title: 'Cien años de soledad', author: 'Gabriel García Márquez', publisher: 'Editorial Sudamericana', year: 1967, category: 'Novela / Plan Lector', level: '1° Medio A', isPlan: true, period: 'Marzo - Abril', location: 'Estante A1', total: 30, available: 30, borrowed: 0 },
        { id: 'BK-002', code: 'CRA-102', title: 'El Principito', author: 'Antoine de Saint-Exupéry', publisher: 'Reynal & Hitchcock', year: 1943, category: 'Cuento / Infantil', level: '6° Básico A', isPlan: true, period: 'Marzo', location: 'Estante B2', total: 35, available: 35, borrowed: 0 },
        { id: 'BK-003', code: 'CRA-103', title: 'La ciudad y los perros', author: 'Mario Vargas Llosa', publisher: 'Seix Barral', year: 1963, category: 'Novela / Realismo', level: '3° Medio Industrial (Mecánica Industrial) A', isPlan: true, period: 'Mayo - Junio', location: 'Estante A2', total: 25, available: 25, borrowed: 0 },
        { id: 'BK-004', code: 'CRA-104', title: 'Papelucho', author: 'Marcela Paz', publisher: 'Editorial del Pacífico', year: 1947, category: 'Infantil / Clásico', level: '2° Básico A', isPlan: true, period: 'Abril', location: 'Estante B1', total: 40, available: 40, borrowed: 0 }
      ];

      for (const b of demoBooks) {
        await query(
          `INSERT INTO cra_books (id, biblio_code, title, author, publisher, year, category, level_suggested, is_reading_plan, reading_period, location, total_copies, available_copies, borrowed_copies)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO NOTHING`,
          [b.id, b.code, b.title, b.author, b.publisher, b.year, b.category, b.level, b.isPlan, b.period, b.location, b.total, b.available, b.borrowed]
        );

        for (let i = 1; i <= b.total; i++) {
          const copyId = `CPY-${b.code}-${i}`;
          const copyCode = `${b.code}-${String(i).padStart(2, '0')}`;
          await query(
            `INSERT INTO cra_book_copies (id, book_id, copy_code, status)
             VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
            [copyId, b.id, copyCode, 'Disponible']
          );
        }
      }
    }

    const checkMaterials = await query('SELECT COUNT(*) as count FROM cra_daily_materials');
    if (parseInt(checkMaterials.rows[0]?.count || '0', 10) === 0) {
      const demoMats = [
        { id: 'MAT-001', code: 'CALC-SCI-01', name: 'Calculadora Científica Casio fx-82MS', category: 'Matemática / Ciencias', total: 15, available: 15, borrowed: 0 },
        { id: 'MAT-002', code: 'REGL-30-01', name: 'Regla Plástica 30 cm con Bisel', category: 'Geometría / Dibujo', total: 30, available: 30, borrowed: 0 },
        { id: 'MAT-003', code: 'DICC-ESP-01', name: 'Diccionario Lengua Española RAE (Ilustrado)', category: 'Lenguaje / Idiomas', total: 20, available: 20, borrowed: 0 },
        { id: 'MAT-004', code: 'CUEN-INF-01', name: 'Set Cuentos Ilustrados Chilenos (Lectura Corta)', category: 'Lectura Rápida', total: 10, available: 10, borrowed: 0 }
      ];

      for (const m of demoMats) {
        await query(
          `INSERT INTO cra_daily_materials (id, material_code, name, category, total_qty, available_qty, borrowed_qty)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
          [m.id, m.code, m.name, m.category, m.total, m.available, m.borrowed]
        );
      }
    }
  } catch (err) {
    console.error('⚠️ Error al asegurar tablas de Biblioteca CRA:', err);
  }
}
ensureCraTablesExist();

function formatCraDateStr(val: any): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val).split('T')[0];
}

function enrichCraLoan(l: any) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
  const dueStr = formatCraDateStr(l.due_date) || todayStr;
  const dueMs = new Date(`${dueStr}T00:00:00Z`).getTime();
  const diffDays = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
  const overdue_days = diffDays < 0 ? Math.abs(diffDays) : 0;
  const days_remaining = diffDays >= 0 ? diffDays : 0;

  let current_status = 'Activo';
  if (l.status === 'Devuelto') {
    current_status = 'Devuelto';
  } else if (overdue_days > 7) {
    current_status = 'Atraso Crítico';
  } else if (overdue_days > 0) {
    current_status = 'Atrasado';
  } else if (days_remaining === 0) {
    current_status = 'Vence Hoy';
  } else if (days_remaining <= 3) {
    current_status = 'Vence Pronto';
  }

  return {
    ...l,
    loan_date: formatCraDateStr(l.loan_date),
    due_date: dueStr,
    return_date: l.return_date ? formatCraDateStr(l.return_date) : null,
    overdue_days,
    days_remaining,
    current_status
  };
}

// DASHBOARD KPI Y ALERTAS BIBLIOTECA CRA
router.get('/library/dashboard', authMiddleware, checkMatrixPermission('library'), async (req: Request, res: Response) => {
  try {
    const booksRes = await query('SELECT * FROM cra_books');
    const allLoansRes = await query('SELECT * FROM cra_loans ORDER BY created_at DESC');
    const dailyMatRes = await query("SELECT COUNT(*) as pending_daily FROM cra_daily_loans WHERE status = 'Pendiente'");

    const enrichedLoans = (allLoansRes.rows || []).map(enrichCraLoan);
    const activeLoansList = enrichedLoans.filter((l: any) => l.status !== 'Devuelto');

    const totalTitles = (booksRes.rows || []).length;
    const totalExemplars = (booksRes.rows || []).reduce((acc: number, b: any) => acc + (parseInt(b.total_copies || '0', 10) || 0), 0);
    const borrowedExemplars = activeLoansList.length;
    const availableExemplars = Math.max(0, totalExemplars - borrowedExemplars);

    const dueToday = activeLoansList.filter((l: any) => l.days_remaining === 0 && l.overdue_days === 0).length;
    const dueSoon = activeLoansList.filter((l: any) => l.days_remaining > 0 && l.days_remaining <= 3).length;
    const dueInWeek = activeLoansList.filter((l: any) => l.days_remaining > 3 && l.days_remaining <= 7).length;
    const overdueNormal = activeLoansList.filter((l: any) => l.overdue_days > 0 && l.overdue_days <= 7).length;
    const overdueCritical = activeLoansList.filter((l: any) => l.overdue_days > 7).length;
    const studentsWithDebt = new Set(
      activeLoansList.filter((l: any) => l.overdue_days > 0).map((l: any) => l.student_name)
    ).size;

    const priorityOrder = (l: any) => {
      if (l.overdue_days > 7) return 1;
      if (l.overdue_days > 0) return 2;
      if (l.days_remaining === 0) return 3;
      if (l.days_remaining <= 3) return 4;
      return 5;
    };

    const priorityAlerts = [...activeLoansList]
      .sort((a: any, b: any) => {
        const pa = priorityOrder(a);
        const pb = priorityOrder(b);
        if (pa !== pb) return pa - pb;
        return String(a.due_date).localeCompare(String(b.due_date));
      })
      .slice(0, 50);

    const dailyStats = dailyMatRes.rows[0] || {};

    res.json({
      totalTitles,
      totalExemplars,
      availableExemplars,
      borrowedExemplars,
      activeLoans: activeLoansList.length,
      dueToday,
      dueSoon,
      dueInWeek,
      overdueNormal,
      overdueCritical,
      pendingDailyMaterials: parseInt(dailyStats.pending_daily || '0', 10),
      studentsWithDebt,
      priorityAlerts
    });
  } catch (err) {
    console.error('Error al obtener dashboard de Biblioteca CRA:', err);
    res.status(500).json({ error: 'Error al consultar dashboard CRA.' });
  }
});

// LISTA DE LIBROS E INVENTARIO COMPLETO
router.get('/library/books', authMiddleware, checkMatrixPermission('library'), async (req: Request, res: Response) => {
  const { search, category, level, isReadingPlan } = req.query;
  try {
    const booksRes = await query('SELECT * FROM cra_books ORDER BY title ASC');
    const activeLoansRes = await query("SELECT book_id, student_name, course_name, copy_code, due_date FROM cra_loans WHERE status != 'Devuelto'");
    const activeByBook: Record<string, any[]> = {};
    (activeLoansRes.rows || []).forEach((l: any) => {
      if (!activeByBook[l.book_id]) activeByBook[l.book_id] = [];
      activeByBook[l.book_id].push(l);
    });

    let rows = (booksRes.rows || []).map((b: any) => {
      const total = parseInt(b.total_copies || '1', 10);
      const activeForBook = activeByBook[b.id] || [];
      const borrowed = activeForBook.length;
      const available = Math.max(0, total - borrowed);
      return {
        ...b,
        total_copies: total,
        available_copies: available,
        borrowed_copies: borrowed,
        active_borrowers: activeForBook
      };
    });

    if (search) {
      const q = String(search).toLowerCase().trim();
      rows = rows.filter((b: any) =>
        String(b.title || '').toLowerCase().includes(q) ||
        String(b.author || '').toLowerCase().includes(q) ||
        String(b.biblio_code || '').toLowerCase().includes(q)
      );
    }
    if (category && category !== 'Todos') {
      rows = rows.filter((b: any) => b.category === category);
    }
    if (level && level !== 'Todos') {
      const lv = String(level).toLowerCase();
      rows = rows.filter((b: any) => String(b.level_suggested || '').toLowerCase().includes(lv));
    }
    if (isReadingPlan === 'true') {
      rows = rows.filter((b: any) => Boolean(b.is_reading_plan));
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar catálogo de libros.' });
  }
});

// REGISTRAR NUEVO LIBRO Y GENERAR EJEMPLARES AUTOMÁTICAMENTE
router.post('/library/books', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Asistente', 'Administrativo', 'Profesionales', 'Bibliotecario']), async (req: Request, res: Response) => {
  const { title, author, publisher, year, isbn, category, levelSuggested, isReadingPlan, readingPeriod, location, totalCopies, observations } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'Título y Autor son requeridos.' });
  }

  try {
    const bookId = `BK-${Date.now()}`;
    const biblioCode = `CRA-${Math.floor(100 + Math.random() * 900)}`;
    const copiesCount = parseInt(totalCopies || 1, 10);

    await query(
      `INSERT INTO cra_books (id, biblio_code, title, author, publisher, year, isbn, category, level_suggested, is_reading_plan, reading_period, location, total_copies, available_copies, borrowed_copies, observations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, 0, $13)`,
      [bookId, biblioCode, title, author, publisher || 'Editorial Escolar', year || 2024, isbn || '', category || 'Lectura Complementaria', levelSuggested || 'General', Boolean(isReadingPlan), readingPeriod || '', location || 'Estante A1', copiesCount, observations || '']
    );

    for (let i = 1; i <= copiesCount; i++) {
      const copyId = `CPY-${biblioCode}-${i}`;
      const copyCode = `${biblioCode}-${String(i).padStart(2, '0')}`;
      await query(
        'INSERT INTO cra_book_copies (id, book_id, copy_code, status) VALUES ($1, $2, $3, $4)',
        [copyId, bookId, copyCode, 'Disponible']
      );
    }

    await logAudit(req, 'CREATE_CRA_BOOK', `Nuevo libro creado: ${title} (${copiesCount} ejemplares)`);
    res.json({ success: true, bookId, biblioCode });
  } catch (err) {
    console.error('Error al crear libro CRA:', err);
    res.status(500).json({ error: 'Error al registrar libro.' });
  }
});

// CONSULTAR EJEMPLARES DE UN LIBRO (CON ESTUDIANTE ASIGNADO SI ESTÁ PRESTADO)
router.get('/library/books/:id/copies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bookId = req.params.id;
    const bookRes = await query('SELECT * FROM cra_books WHERE id = $1', [bookId]);
    const copiesRes = await query('SELECT * FROM cra_book_copies WHERE book_id = $1 ORDER BY copy_code ASC', [bookId]);
    const activeLoansRes = await query("SELECT * FROM cra_loans WHERE book_id = $1 AND status != 'Devuelto'", [bookId]);

    const activeByCopyCode: Record<string, any> = {};
    (activeLoansRes.rows || []).forEach((l: any) => {
      if (l.copy_code) activeByCopyCode[l.copy_code] = enrichCraLoan(l);
      if (l.copy_id) activeByCopyCode[l.copy_id] = enrichCraLoan(l);
    });

    let copies = copiesRes.rows || [];
    if (bookRes.rows.length > 0) {
      const b = bookRes.rows[0];
      const total = parseInt(b.total_copies || '5', 10);
      const existingCodes = new Set(copies.map((c: any) => c.copy_code));
      for (let i = 1; i <= total; i++) {
        const code = `${b.biblio_code}-${String(i).padStart(2, '0')}`;
        if (!existingCodes.has(code)) {
          copies.push({
            id: `CPY-${b.biblio_code}-${i}`,
            book_id: b.id,
            copy_code: code,
            status: 'Disponible'
          });
        }
      }
    }

    const enrichedCopies = copies.map((c: any) => {
      const activeLoan = activeByCopyCode[c.copy_code] || activeByCopyCode[c.id] || null;
      return {
        ...c,
        status: activeLoan ? 'Prestado' : (c.status === 'Prestado' ? 'Disponible' : c.status),
        student_name: activeLoan ? activeLoan.student_name : null,
        course_name: activeLoan ? activeLoan.course_name : null,
        loan_date: activeLoan ? activeLoan.loan_date : null,
        due_date: activeLoan ? activeLoan.due_date : null,
        loan_id: activeLoan ? activeLoan.id : null
      };
    });

    res.json(enrichedCopies);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar ejemplares.' });
  }
});

// PLAN DE LECTURA COMPLEMENTARIA DE 1° BÁSICO A 4° MEDIO
router.get('/library/reading-plan', authMiddleware, async (req: Request, res: Response) => {
  const { level } = req.query;
  try {
    const booksRes = await query('SELECT * FROM cra_books WHERE is_reading_plan = TRUE ORDER BY level_suggested ASC, title ASC');
    let rows = booksRes.rows || [];
    if (level && level !== 'Todos') {
      const lv = String(level).toLowerCase();
      rows = rows.filter((b: any) => String(b.level_suggested || '').toLowerCase().includes(lv));
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar Plan de Lectura.' });
  }
});

// REGLA CRÍTICA DE BLOQUEO POR DEUDA DE ESTUDIANTE
router.get('/library/students/check-debt/:studentId', authMiddleware, async (req: Request, res: Response) => {
  const { studentId } = req.params;
  try {
    const studentRes = await query('SELECT id, full_name, desc_grado, status FROM students WHERE id = $1 OR run = $1 OR full_name = $1 LIMIT 1', [studentId]);
    const s = studentRes.rows.length > 0 ? studentRes.rows[0] : { id: studentId, full_name: studentId, desc_grado: '' };

    const allActiveLoansRes = await query("SELECT * FROM cra_loans WHERE status != 'Devuelto'");
    const stNameUpper = String(s.full_name || '').trim().toUpperCase();
    const pendingLoansRows = (allActiveLoansRes.rows || [])
      .filter((l: any) =>
        (s.id && l.student_id === s.id) ||
        (stNameUpper && String(l.student_name || '').trim().toUpperCase().includes(stNameUpper))
      )
      .map(enrichCraLoan);

    const allPendingDailyRes = await query("SELECT * FROM cra_daily_loans WHERE status = 'Pendiente'");
    const pendingDailyRows = (allPendingDailyRes.rows || []).filter((d: any) =>
      (s.id && d.student_id === s.id) ||
      (stNameUpper && String(d.student_name || '').trim().toUpperCase().includes(stNameUpper))
    );

    const hasDebt = pendingLoansRows.length > 0 || pendingDailyRows.length > 0;
    const isOverdue = pendingLoansRows.some((l: any) => l.overdue_days > 0);

    res.json({
      hasDebt,
      isOverdue,
      studentName: s.full_name,
      courseName: s.desc_grado,
      pendingLoansCount: pendingLoansRows.length,
      pendingLoans: pendingLoansRows,
      pendingDailyCount: pendingDailyRows.length,
      pendingDaily: pendingDailyRows,
      message: hasDebt
        ? (isOverdue ? `⚠️ ESTUDIANTE CON DEVOLUCIÓN ATRASADA. Tiene ${pendingLoansRows.length} libro(s) pendiente(s).` : `🔴 ESTUDIANTE CON PRÉSTAMO ACTIVO (${pendingLoansRows.length} libro(s)). Se sugiere devolución o ingrese motivo de excepción.`)
        : '🟢 ESTUDIANTE HABILITADO PARA PRÉSTAMO (Sin deudas).'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar deuda de estudiante.' });
  }
});

// NUEVO PRÉSTAMO DE LIBRO (CÁLCULO AUTOMÁTICO 21 DÍAS)
router.post('/library/loans', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Asistente', 'Administrativo', 'Profesionales', 'Bibliotecario']), async (req: Request, res: Response) => {
  const { studentId, studentName, courseName, teacherName, bookId, copyCode, customDueDate, overrideReason, observations } = req.body;
  if (!studentName || !bookId) {
    return res.status(400).json({ error: 'Estudiante y Libro son requeridos.' });
  }

  try {
    // 1. Verificar disponibilidad de ejemplares del libro
    const bookRes = await query('SELECT * FROM cra_books WHERE id = $1 OR biblio_code = $1', [bookId]);
    if (bookRes.rows.length === 0) {
      return res.status(404).json({ error: 'Libro no encontrado.' });
    }
    const book = bookRes.rows[0];
    if (book.available_copies <= 0) {
      return res.status(400).json({ error: `El libro "${book.title}" no posee ejemplares disponibles para préstamo.` });
    }

    // 2. Verificar Deuda del Estudiante (Regla de Bloqueo)
    const activeLoansRes = await query("SELECT * FROM cra_loans WHERE status != 'Devuelto'");
    const stUpper = String(studentName).trim().toUpperCase();
    const studentOverdueLoans = (activeLoansRes.rows || [])
      .map(enrichCraLoan)
      .filter((l: any) => String(l.student_name || '').trim().toUpperCase().includes(stUpper) && l.overdue_days > 0);

    if (studentOverdueLoans.length > 0 && !overrideReason) {
      return res.status(400).json({
        error: `ESTUDIANTE CON DEVOLUCIÓN PENDIENTE. ${studentName} mantiene ${studentOverdueLoans.length} libro(s) atrasado(s). Para autorizar excepcionalmente, proporcione un motivo de excepción.`
      });
    }

    // 3. Asignar Ejemplar Físico Disponible (evitando códigos ya prestados activamente)
    const usedCodes = new Set(
      (activeLoansRes.rows || [])
        .filter((l: any) => l.book_id === book.id)
        .map((l: any) => l.copy_code)
    );

    let assignedCopyCode = copyCode || '';
    let assignedCopyId = '';

    if (!assignedCopyCode) {
      const totalCopies = parseInt(book.total_copies || '10', 10);
      for (let i = 1; i <= totalCopies; i++) {
        const candidateCode = `${book.biblio_code}-${String(i).padStart(2, '0')}`;
        if (!usedCodes.has(candidateCode)) {
          assignedCopyCode = candidateCode;
          assignedCopyId = `CPY-${book.biblio_code}-${i}`;
          break;
        }
      }
    }
    if (!assignedCopyCode) {
      assignedCopyCode = `${book.biblio_code}-01`;
      assignedCopyId = `CPY-${book.biblio_code}-1`;
    }

    // Asegurar que el ejemplar exista en cra_book_copies
    await query(
      `INSERT INTO cra_book_copies (id, book_id, copy_code, status)
       VALUES ($1, $2, $3, 'Prestado')
       ON CONFLICT (id) DO UPDATE SET status = 'Prestado'`,
      [assignedCopyId, book.id, assignedCopyCode]
    ).catch(() => {});

    // 4. Calcular Fecha de Devolución (Estándar 21 Días = 3 Semanas)
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0];
    const defaultDueDate = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const finalDueDate = customDueDate || defaultDueDate;

    const loanId = `LOAN-${Date.now()}`;
    const userRoleName = (req as any).user?.name || 'Encargado CRA';

    await query(
      `INSERT INTO cra_loans (id, book_id, copy_id, student_id, student_name, course_name, teacher_name, book_title, book_author, copy_code, loan_date, due_date, status, registered_by, override_reason, observations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Activo', $13, $14, $15)`,
      [loanId, book.id, assignedCopyId, studentId || '', studentName, courseName || 'Sin Curso', teacherName || 'Sin Asignar', book.title, book.author, assignedCopyCode, todayDateStr, finalDueDate, userRoleName, overrideReason || '', observations || '']
    );

    // 5. Actualizar Inventario sincronizado con préstamos reales
    const newBorrowedCount = usedCodes.size + 1;
    const totalCount = parseInt(book.total_copies || '1', 10);
    const newAvailableCount = Math.max(0, totalCount - newBorrowedCount);
    await query('UPDATE cra_books SET available_copies = $1, borrowed_copies = $2 WHERE id = $3', [newAvailableCount, newBorrowedCount, book.id]);

    if (overrideReason) {
      await logAudit(req, 'OVERRIDE_LIBRARY_LOAN', `Excepción de préstamo autorizada para ${studentName} con deuda por motivo: ${overrideReason}`);
    } else {
      await logAudit(req, 'CREATE_CRA_LOAN', `Préstamo CRA registrado: ${book.title} a ${studentName} (Vence: ${finalDueDate})`);
    }

    res.json({ success: true, loanId, assignedCopyCode, dueDate: finalDueDate });
  } catch (err) {
    console.error('Error registrando préstamo CRA:', err);
    res.status(500).json({ error: 'Error al registrar préstamo.' });
  }
});

// LISTA DE PRÉSTAMOS CON CONTADOR DE DÍAS Y FILTROS
router.get('/library/loans', authMiddleware, checkMatrixPermission('library'), async (req: Request, res: Response) => {
  const { search, status, course } = req.query;
  try {
    const result = await query('SELECT * FROM cra_loans ORDER BY created_at DESC');
    let rows = (result.rows || []).map(enrichCraLoan);

    if (search) {
      const q = String(search).toLowerCase().trim();
      rows = rows.filter((l: any) =>
        String(l.student_name || '').toLowerCase().includes(q) ||
        String(l.book_title || '').toLowerCase().includes(q) ||
        String(l.copy_code || '').toLowerCase().includes(q) ||
        String(l.course_name || '').toLowerCase().includes(q)
      );
    }
    if (status && status !== 'Todos') {
      if (status === 'Activos') rows = rows.filter((l: any) => l.status !== 'Devuelto');
      else if (status === 'Atrasados') rows = rows.filter((l: any) => l.status !== 'Devuelto' && l.overdue_days > 0);
      else if (status === 'VenceHoy') rows = rows.filter((l: any) => l.status !== 'Devuelto' && l.days_remaining === 0 && l.overdue_days === 0);
      else if (status === 'Devueltos' || status === 'Devuelto') rows = rows.filter((l: any) => l.status === 'Devuelto');
      else rows = rows.filter((l: any) => l.status === status);
    }
    if (course && course !== 'Todos') {
      const c = String(course).toLowerCase().trim();
      rows = rows.filter((l: any) => String(l.course_name || '').toLowerCase().includes(c));
    }

    res.json(rows);
  } catch (err) {
    console.error('Error al consultar lista de préstamos CRA:', err);
    res.status(500).json({ error: 'Error al consultar lista de préstamos.' });
  }
});

// REGISTRAR DEVOLUCIÓN DE LIBRO
router.post('/library/loans/:id/return', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Asistente', 'Administrativo', 'Profesionales', 'Bibliotecario']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { returnCondition, observations } = req.body;
  try {
    const loanRes = await query('SELECT * FROM cra_loans WHERE id = $1', [id]);
    if (loanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Préstamo no encontrado.' });
    }
    const loan = loanRes.rows[0];
    if (loan.status === 'Devuelto') {
      return res.status(400).json({ error: 'El libro ya ha sido devuelto anteriormente.' });
    }

    const userName = (req as any).user?.name || 'Encargado CRA';
    const todayDateStr = new Date().toISOString().split('T')[0];

    await query(
      `UPDATE cra_loans 
       SET return_date = $1, status = 'Devuelto', returned_by = $2, return_condition = $3, observations = $4 
       WHERE id = $5`,
      [todayDateStr, userName, returnCondition || 'Devuelto Correctamente', observations || '', id]
    );

    // Actualizar disponibilidad de inventario según préstamos activos restantes
    const remRes = await query("SELECT COUNT(*) as cnt FROM cra_loans WHERE book_id = $1 AND status != 'Devuelto'", [loan.book_id]);
    const remBorrowed = parseInt(remRes.rows[0]?.cnt || '0', 10);
    const bkRes = await query('SELECT total_copies FROM cra_books WHERE id = $1', [loan.book_id]);
    const totalCopies = parseInt(bkRes.rows[0]?.total_copies || '1', 10);
    await query('UPDATE cra_books SET available_copies = $1, borrowed_copies = $2 WHERE id = $3', [Math.max(0, totalCopies - remBorrowed), remBorrowed, loan.book_id]);

    if (loan.copy_id || loan.copy_code) {
      const copyStatus = returnCondition === 'Dañado' ? 'Dañado' : (returnCondition === 'Perdido' || returnCondition === 'Extraviado' ? 'Extraviado' : 'Disponible');
      await query('UPDATE cra_book_copies SET status = $1 WHERE id = $2 OR copy_code = $3', [copyStatus, loan.copy_id || '', loan.copy_code || '']).catch(() => {});
    }

    await logAudit(req, 'RETURN_CRA_LOAN', `Devolución de libro "${loan.book_title}" realizada por estudiante ${loan.student_name}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar devolución.' });
  }
});

// PRÉSTAMO Y DEVOLUCIÓN DE MATERIALES DIARIOS (CALCULADORAS, REGLAS, DICCIONARIOS)
router.get('/library/daily-materials', authMiddleware, async (req: Request, res: Response) => {
  try {
    const materials = await query('SELECT * FROM cra_daily_materials ORDER BY name ASC');
    const loans = await query("SELECT * FROM cra_daily_loans WHERE status = 'Pendiente' ORDER BY created_at DESC");
    res.json({ materials: materials.rows, pendingLoans: loans.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar materiales diarios.' });
  }
});

router.post('/library/daily-materials/loan', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Asistente', 'Administrativo', 'Profesionales', 'Bibliotecario']), async (req: Request, res: Response) => {
  const { materialId, studentName, courseName, observations } = req.body;
  if (!materialId || !studentName) {
    return res.status(400).json({ error: 'Material y Estudiante son requeridos.' });
  }

  try {
    const matRes = await query('SELECT * FROM cra_daily_materials WHERE id = $1 OR material_code = $1', [materialId]);
    if (matRes.rows.length === 0) return res.status(404).json({ error: 'Material no encontrado.' });
    const mat = matRes.rows[0];

    if (mat.available_qty <= 0) {
      return res.status(400).json({ error: `El material "${mat.name}" no posee stock disponible.` });
    }

    const loanId = `DLOAN-${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const todayDateStr = new Date().toISOString().split('T')[0];
    const userName = (req as any).user?.name || 'Encargado CRA';

    await query(
      `INSERT INTO cra_daily_loans (id, material_id, material_name, material_code, student_name, course_name, loan_date, time_out, status, registered_by, observations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendiente', $9, $10)`,
      [loanId, mat.id, mat.name, mat.material_code, studentName, courseName || 'Sin Curso', todayDateStr, nowTime, userName, observations || '']
    );

    await query('UPDATE cra_daily_materials SET available_qty = GREATEST(0, available_qty - 1), borrowed_qty = borrowed_qty + 1 WHERE id = $1', [mat.id]);

    await logAudit(req, 'CREATE_DAILY_LOAN', `Préstamo diario de ${mat.name} entregado a ${studentName}`);
    res.json({ success: true, loanId, timeOut: nowTime });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar préstamo diario.' });
  }
});

router.post('/library/daily-materials/return/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Asistente', 'Administrativo', 'Profesionales', 'Bibliotecario']), async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const loanRes = await query('SELECT * FROM cra_daily_loans WHERE id = $1', [id]);
    if (loanRes.rows.length === 0) return res.status(404).json({ error: 'Préstamo diario no encontrado.' });
    const loan = loanRes.rows[0];

    const nowTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const userName = (req as any).user?.name || 'Encargado CRA';

    await query(
      `UPDATE cra_daily_loans SET time_in = $1, status = 'Devuelto', returned_by = $2 WHERE id = $3`,
      [nowTime, userName, id]
    );

    await query('UPDATE cra_daily_materials SET available_qty = available_qty + 1, borrowed_qty = GREATEST(0, borrowed_qty - 1) WHERE id = $1', [loan.material_id]);

    await logAudit(req, 'RETURN_DAILY_LOAN', `Material diario ${loan.material_name} devuelto por ${loan.student_name}`);
    res.json({ success: true, timeIn: nowTime });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar devolución de material diario.' });
  }
});

// CENTRO DE COMUNICACIONES PARA ENVIAR Y PREVISUALIZAR CORREOS A DOCENTES
router.get('/library/communications/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const loansRes = await query("SELECT * FROM cra_loans WHERE status != 'Devuelto' ORDER BY teacher_name ASC");
    const enriched = (loansRes.rows || []).map(enrichCraLoan);

    const grouped: Record<string, { teacherName: string; teacherEmail: string; cases: any[] }> = {};

    enriched.forEach((l: any) => {
      const teacher = l.teacher_name || 'Docente General';
      const email = `${teacher.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.')}@eduvallediguillin.gob.cl`;
      if (!grouped[teacher]) {
        grouped[teacher] = { teacherName: teacher, teacherEmail: email, cases: [] };
      }
      grouped[teacher].cases.push(l);
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar casos pendientes para comunicación.' });
  }
});

router.post('/library/communications/send', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Asistente', 'Administrativo', 'Profesionales', 'Bibliotecario']), async (req: Request, res: Response) => {
  const { teacherName, teacherEmail, subject, bodyText, casesCount, cases } = req.body;
  if (!teacherEmail || !bodyText) {
    return res.status(400).json({ error: 'Correo de destino y contenido del mensaje son requeridos.' });
  }

  try {
    const userSender = (req as any).user?.name || 'Biblioteca CRA';

    // Intentar enviar mediante Nodemailer / SMTP
    let emailSentStatus = 'Enviado';
    try {
      const mailer = require('../utils/mailer');
      if (mailer && mailer.sendGeneralNotification) {
        await mailer.sendGeneralNotification({
          to: teacherEmail,
          subject: subject || 'Recordatorio Devolución Libros Biblioteca CRA – Liceo Técnico Profesional Campanario Marcos Delucchi Fonck',
          text: bodyText,
          html: `<div style="font-family: Arial, sans-serif; padding: 1rem; color: #0f172a;">${bodyText.replace(/\n/g, '<br/>')}</div>`
        });
      }
    } catch (mailErr) {
      console.warn('⚠️ SMTP directo no configurado o falló. Guardando registro y entregando preview Gmail:', mailErr);
      emailSentStatus = 'Abrir Gmail';
    }

    const emailId = `EMAIL-${Date.now()}`;
    await query(
      `INSERT INTO cra_email_logs (id, teacher_name, teacher_email, subject, body_text, student_cases_count, cases_json, sent_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [emailId, teacherName || 'Docente', teacherEmail, subject || 'Recordatorio Biblioteca CRA', bodyText, casesCount || 1, JSON.stringify(cases || []), userSender, emailSentStatus]
    );

    await logAudit(req, 'SEND_CRA_EMAIL', `Correo de recordatorio enviado a ${teacherEmail} (${casesCount || 1} casos)`);
    res.json({ success: true, emailId, status: emailSentStatus });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar envío de comunicación.' });
  }
});

// MÓDULO DE REVISIÓN PARA RETIRO DE ESTUDIANTES
router.get('/library/withdrawal-check/:studentId', authMiddleware, async (req: Request, res: Response) => {
  const { studentId } = req.params;
  try {
    const q = String(studentId).trim();
    const studentRes = await query('SELECT id, full_name, run, desc_grado FROM students WHERE id = $1 OR run = $1 OR full_name ILIKE $2 LIMIT 1', [q, `%${q}%`]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }
    const student = studentRes.rows[0];

    const allActiveLoansRes = await query("SELECT * FROM cra_loans WHERE status != 'Devuelto'");
    const stNameUpper = String(student.full_name || '').trim().toUpperCase();
    const activeLoans = (allActiveLoansRes.rows || [])
      .filter((l: any) =>
        l.student_id === student.id ||
        (stNameUpper && String(l.student_name || '').trim().toUpperCase().includes(stNameUpper))
      )
      .map(enrichCraLoan);

    const allActiveDailyRes = await query("SELECT * FROM cra_daily_loans WHERE status = 'Pendiente'");
    const activeDaily = (allActiveDailyRes.rows || []).filter((d: any) =>
      d.student_id === student.id ||
      (stNameUpper && String(d.student_name || '').trim().toUpperCase().includes(stNameUpper))
    );

    const hasDebt = activeLoans.length > 0 || activeDaily.length > 0;

    res.json({
      studentId: student.id,
      studentName: student.full_name,
      run: student.run,
      courseName: student.desc_grado,
      hasDebt,
      canWithdraw: !hasDebt,
      pendingBooksCount: activeLoans.length,
      pendingBooks: activeLoans,
      pendingDailyCount: activeDaily.length,
      pendingDaily: activeDaily
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al realizar verificación de retiro de estudiante.' });
  }
});

// =========================================================================
// MÓDULO 1: SALA DE COMPUTACIÓN Y RESERVA DE ESPACIOS
// =========================================================================

const OFFICIAL_BLOCKS: Record<string, { label: string; start: string; end: string }> = {
  'Bloque 1': { label: 'Bloque 1 (08:30 - 10:00)', start: '08:30', end: '10:00' },
  'Bloque 2': { label: 'Bloque 2 (10:20 - 11:50)', start: '10:20', end: '11:50' },
  'Bloque 3': { label: 'Bloque 3 (12:05 - 13:35)', start: '12:05', end: '13:35' },
  'Bloque 4': { label: 'Bloque 4 (14:20 - 15:50)', start: '14:20', end: '15:50' },
  'Bloque 5': { label: 'Bloque 5 (16:00 - 17:30)', start: '16:00', end: '17:30' }
};

// Obtener bloques horarios oficiales
router.get('/room-reservations/blocks', authMiddleware, async (_req: Request, res: Response) => {
  res.json({ blocks: OFFICIAL_BLOCKS });
});

// Listar todas las reservas con filtros opcionales
router.get('/room-reservations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { date, month, year, teacher_email } = req.query;
    let sql = 'SELECT * FROM room_reservations WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (date) {
      sql += ` AND reservation_date = $${pIdx++}`;
      params.push(date);
    }
    if (month && year) {
      sql += ` AND MONTH(reservation_date) = $${pIdx++} AND YEAR(reservation_date) = $${pIdx++}`;
      params.push(month, year);
    } else if (year) {
      sql += ` AND YEAR(reservation_date) = $${pIdx++}`;
      params.push(year);
    }
    if (teacher_email) {
      sql += ` AND teacher_email = $${pIdx++}`;
      params.push(teacher_email);
    }

    sql += ' ORDER BY reservation_date DESC, start_time ASC';
    const result = await query(sql, params);
    res.json({ reservations: result.rows });
  } catch (err: any) {
    console.error('Error al listar reservas:', err);
    res.status(500).json({ error: 'Error al consultar reservas de sala de computación.' });
  }
});

// Procesar reservas multi-fecha
router.post('/room-reservations', authMiddleware, async (req: Request, res: Response) => {
  const { course_name, subject_name, activity_detail, dates, block_key, teacher_name, teacher_email, teacher_run } = req.body;
  const user = (req as any).user;

  const tEmail = (teacher_email || user?.email || 'docente@liceo.cl').trim();
  const tName = (teacher_name || user?.name || 'Docente').trim();
  const tRun = (teacher_run || user?.run || '').trim();

  if (!course_name || !subject_name || !dates || !block_key) {
    return res.status(400).json({ error: 'Curso, Asignatura, Fechas y Bloque Horario son obligatorios.' });
  }

  const blockInfo = OFFICIAL_BLOCKS[block_key] || { label: block_key, start: '08:30', end: '10:00' };

  // Parsear fechas (pueden venir como array o string separado por comas)
  let dateList: string[] = [];
  if (Array.isArray(dates)) {
    dateList = dates.map(d => String(d).trim()).filter(Boolean);
  } else if (typeof dates === 'string') {
    dateList = dates.split(',').map(d => d.trim()).filter(Boolean);
  }

  if (dateList.length === 0) {
    return res.status(400).json({ error: 'Debe especificar al menos una fecha para la reserva.' });
  }

  let successCount = 0;
  const errors: string[] = [];
  const processedRows: any[] = [];

  for (const dateStr of dateList) {
    try {
      // Validar formato YYYY-MM-DD
      const dateParts = dateStr.split('-').map(Number);
      if (dateParts.length !== 3 || isNaN(dateParts[0]) || isNaN(dateParts[1]) || isNaN(dateParts[2])) {
        errors.push(`- ${dateStr}: Formato de fecha inválido.`);
        continue;
      }

      const resDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const dayOfWeek = resDate.getDay(); // 0=Domingo, 5=Viernes, 6=Sábado

      // Regla 1: Fin de semana
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        errors.push(`- ${dateStr}: No se permiten reservas los fines de semana.`);
        continue;
      }

      // Regla 2: Viernes tarde (Bloques 4 y 5 terminan después de las 13:35)
      if (dayOfWeek === 5 && (block_key === 'Bloque 4' || block_key === 'Bloque 5')) {
        errors.push(`- ${dateStr}: Los viernes la jornada finaliza a las 13:35 (Bloques 4 y 5 no disponibles).`);
        continue;
      }

      // Regla 3: Detección de colisiones atómica en MySQL
      const conflictCheck = await query(`
        SELECT id, course_name, teacher_name, subject_name 
        FROM room_reservations 
        WHERE reservation_date = $1 AND block_key = $2 AND status = 'Aprobado'
      `, [dateStr, block_key]);

      if (conflictCheck.rows.length > 0) {
        const c = conflictCheck.rows[0];
        errors.push(`- ${dateStr}: Horario ocupado por ${c.course_name} (${c.subject_name} - ${c.teacher_name}).`);
        continue;
      }

      // Crear ID único de reserva
      const resId = `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await query(`
        INSERT INTO room_reservations (
          id, teacher_name, teacher_email, teacher_run, course_name, subject_name,
          activity_detail, reservation_date, block_key, block_label, start_time, end_time, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Aprobado')
      `, [
        resId, tName, tEmail, tRun, course_name, subject_name,
        activity_detail || null, dateStr, block_key, blockInfo.label, blockInfo.start, blockInfo.end
      ]);

      successCount++;
      processedRows.push({
        id: resId,
        date: dateStr,
        block: blockInfo.label,
        course: course_name,
        subject: subject_name
      });

    } catch (dateErr: any) {
      console.error(`Error procesando fecha ${dateStr}:`, dateErr);
      errors.push(`- ${dateStr}: Error interno del sistema.`);
    }
  }

  await logAudit(req, 'ROOM_RESERVATION', `Reserva Sala Computación: ${successCount} de ${dateList.length} fechas agendadas para ${course_name}`);

  if (successCount === dateList.length) {
    return res.json({
      status: 'success',
      message: `¡Éxito! Las ${successCount} fechas solicitadas han sido reservadas y aprobadas en el sistema.`,
      successCount,
      totalCount: dateList.length,
      reservations: processedRows
    });
  } else if (successCount > 0) {
    return res.json({
      status: 'warning',
      message: `Se reservaron ${successCount} fecha(s), pero las siguientes no estuvieron disponibles:\n\n${errors.join('\n')}`,
      successCount,
      totalCount: dateList.length,
      errors,
      reservations: processedRows
    });
  } else {
    return res.status(400).json({
      status: 'error',
      message: `No se pudo reservar ninguna fecha por los siguientes motivos:\n\n${errors.join('\n')}`,
      errors
    });
  }
});

// Cancelar / liberar reserva
router.delete('/room-reservations/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const check = await query('SELECT * FROM room_reservations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    await query('DELETE FROM room_reservations WHERE id = $1', [id]);
    await logAudit(req, 'CANCEL_ROOM_RESERVATION', `Reserva ${id} cancelada/liberada`);
    res.json({ success: true, message: 'Reserva cancelada y horario liberado exitosamente.' });
  } catch (err: any) {
    console.error('Error al cancelar reserva:', err);
    res.status(500).json({ error: 'Error al cancelar la reserva.' });
  }
});


// =========================================================================
// MÓDULO 2: PLANIFICACIÓN DE EVALUACIONES & ADECUACIONES PIE
// =========================================================================

// Listar evaluaciones con filtros avanzados
router.get('/evaluations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { teacher_email, course_name, is_pie, status } = req.query;
    let sql = 'SELECT * FROM pedagogical_evaluations WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (teacher_email) {
      sql += ` AND teacher_email = $${pIdx++}`;
      params.push(teacher_email);
    }
    if (course_name) {
      sql += ` AND course_name = $${pIdx++}`;
      params.push(course_name);
    }
    if (status) {
      sql += ` AND status = $${pIdx++}`;
      params.push(status);
    }

    sql += ' ORDER BY evaluation_date DESC, created_at DESC';
    const result = await query(sql, params);
    res.json({ evaluations: result.rows });
  } catch (err: any) {
    console.error('Error al consultar evaluaciones:', err);
    res.status(500).json({ error: 'Error al consultar evaluaciones pedagógicas.' });
  }
});

// Registrar nueva evaluación
router.post('/evaluations', authMiddleware, async (req: Request, res: Response) => {
  const { evaluation_title, course_name, subject_name, evaluation_date, block_label, original_file_url, original_file_name, teacher_name, teacher_email, teacher_run } = req.body;
  const user = (req as any).user;

  const tEmail = (teacher_email || user?.email || 'docente@liceo.cl').trim();
  const tName = (teacher_name || user?.name || 'Docente').trim();
  const tRun = (teacher_run || user?.run || '').trim();

  if (!evaluation_title || !course_name || !subject_name || !evaluation_date) {
    return res.status(400).json({ error: 'Título, Curso, Asignatura y Fecha de Aplicación son requeridos.' });
  }

  try {
    const id = `EV-${Date.now()}`;
    const initialStatus = original_file_url ? 'Completado' : 'Pendiente de Archivo';
    const originalUploadedAt = original_file_url ? new Date() : null;

    await query(`
      INSERT INTO pedagogical_evaluations (
        id, teacher_name, teacher_email, teacher_run, evaluation_title,
        course_name, subject_name, evaluation_date, block_label, status,
        original_file_url, original_file_name, original_uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      id, tName, tEmail, tRun, evaluation_title,
      course_name, subject_name, evaluation_date, block_label || 'Bloque 1 (08:30 - 10:00)', initialStatus,
      original_file_url || null, original_file_name || null, originalUploadedAt
    ]);

    await logAudit(req, 'CREATE_EVALUATION', `Evaluación creada: ${evaluation_title} para ${course_name} (${id})`);

    res.json({
      success: true,
      message: `¡Evaluación registrada correctamente con ID: ${id}!`,
      evaluation: {
        id,
        evaluation_title,
        course_name,
        subject_name,
        evaluation_date,
        block_label,
        status: initialStatus
      }
    });
  } catch (err: any) {
    console.error('Error al registrar evaluación:', err);
    res.status(500).json({ error: 'Error al registrar la evaluación pedagógica.' });
  }
});

// Modificar fecha, título o bloque de evaluación
router.put('/evaluations/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { evaluation_title, evaluation_date, block_label } = req.body;

  if (!evaluation_title || !evaluation_date) {
    return res.status(400).json({ error: 'Título y Fecha son requeridos.' });
  }

  try {
    const check = await query('SELECT * FROM pedagogical_evaluations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Evaluación no encontrada.' });
    }

    await query(`
      UPDATE pedagogical_evaluations 
      SET evaluation_title = $1, evaluation_date = $2, block_label = $3
      WHERE id = $4
    `, [evaluation_title, evaluation_date, block_label || 'Bloque 1 (08:30 - 10:00)', id]);

    await logAudit(req, 'UPDATE_EVALUATION', `Evaluación modificada: ${evaluation_title} (${id})`);
    res.json({ success: true, message: '¡Evaluación modificada correctamente!' });
  } catch (err: any) {
    console.error('Error al modificar evaluación:', err);
    res.status(500).json({ error: 'Error al modificar la evaluación.' });
  }
});

// Eliminar evaluación
router.delete('/evaluations/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const check = await query('SELECT * FROM pedagogical_evaluations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Evaluación no encontrada.' });
    }

    await query('DELETE FROM pedagogical_evaluations WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_EVALUATION', `Evaluación eliminada: ${id}`);
    res.json({ success: true, message: 'Evaluación eliminada correctamente.' });
  } catch (err: any) {
    console.error('Error al eliminar evaluación:', err);
    res.status(500).json({ error: 'Error al eliminar la evaluación.' });
  }
});

// Adjuntar archivo original (Word/PDF)
router.post('/evaluations/:id/attach-original', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { file_name, file_url } = req.body;

  if (!file_url) {
    return res.status(400).json({ error: 'URL o archivo es requerido.' });
  }

  try {
    const check = await query('SELECT * FROM pedagogical_evaluations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Evaluación no encontrada.' });
    }

    const currentStatus = check.rows[0].status;
    const newStatus = currentStatus === 'Adecuado PIE' ? 'Adecuado PIE' : 'Completado';

    await query(`
      UPDATE pedagogical_evaluations 
      SET original_file_name = $1, original_file_url = $2, original_uploaded_at = NOW(), status = $3
      WHERE id = $4
    `, [file_name || 'Evaluacion_Original.pdf', file_url, newStatus, id]);

    await logAudit(req, 'ATTACH_ORIGINAL_EVAL', `Archivo original adjuntado para evaluación ${id}`);
    res.json({ success: true, message: '¡Archivo original adjuntado con éxito!' });
  } catch (err: any) {
    console.error('Error al adjuntar archivo original:', err);
    res.status(500).json({ error: 'Error al adjuntar archivo original.' });
  }
});

// Adjuntar adecuación PIE por el educador diferencial
router.post('/evaluations/:id/attach-pie', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { pie_file_name, pie_file_url, pie_teacher_name, pie_teacher_email } = req.body;
  const user = (req as any).user;

  if (!pie_file_url) {
    return res.status(400).json({ error: 'Archivo de adecuación PIE es requerido.' });
  }

  try {
    const check = await query('SELECT * FROM pedagogical_evaluations WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Evaluación no encontrada.' });
    }

    const pieName = (pie_teacher_name || user?.name || 'Educador(a) PIE').trim();
    const pieEmail = (pie_teacher_email || user?.email || 'pie@liceo.cl').trim();

    await query(`
      UPDATE pedagogical_evaluations 
      SET pie_file_name = $1, pie_file_url = $2, pie_teacher_name = $3, pie_teacher_email = $4,
          pie_uploaded_at = NOW(), status = 'Adecuado PIE'
      WHERE id = $5
    `, [pie_file_name || 'Evaluacion_Adaptada_PIE.pdf', pie_file_url, pieName, pieEmail, id]);

    await logAudit(req, 'ATTACH_PIE_EVAL', `Adecuación PIE subida para evaluación ${id} por ${pieName}`);
    res.json({ success: true, message: '¡Evaluación adaptada PIE guardada con éxito!' });
  } catch (err: any) {
    console.error('Error al adjuntar adecuación PIE:', err);
    res.status(500).json({ error: 'Error al guardar adecuación PIE.' });
  }
});

// Permisos PIE por Curso
router.get('/evaluations/pie-permissions', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM pie_course_permissions ORDER BY teacher_name ASC');
    res.json({ permissions: result.rows });
  } catch (err: any) {
    console.error('Error al consultar permisos PIE:', err);
    res.status(500).json({ error: 'Error al consultar permisos PIE.' });
  }
});

router.post('/evaluations/pie-permissions', authMiddleware, checkRoles(['Admin', 'Director', 'PIE']), async (req: Request, res: Response) => {
  const { teacher_email, teacher_name, courses_allowed } = req.body;
  if (!teacher_email || !courses_allowed) {
    return res.status(400).json({ error: 'Correo de docente y cursos permitidos son obligatorios.' });
  }

  try {
    await query(`
      INSERT INTO pie_course_permissions (teacher_email, teacher_name, courses_allowed)
      VALUES ($1, $2, $3)
      ON CONFLICT (teacher_email) DO UPDATE SET
        teacher_name = EXCLUDED.teacher_name,
        courses_allowed = EXCLUDED.courses_allowed
    `, [teacher_email.toLowerCase().trim(), teacher_name || teacher_email, courses_allowed]);

    res.json({ success: true, message: 'Permisos PIE actualizados correctamente.' });
  } catch (err: any) {
    console.error('Error al guardar permisos PIE:', err);
    res.status(500).json({ error: 'Error al guardar permisos PIE.' });
  }
});


// -----------------------------------------------------------------------------
// GESTIÓN DE PROFESIONALES DE APOYO QUE INTERVIENEN EN EL CURSO
// -----------------------------------------------------------------------------
router.get('/courses/:courseName/support-professionals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { courseName } = req.params;
    const cleanCourse = decodeURIComponent(courseName).trim();
    const result = await query(
      'SELECT * FROM course_support_professionals WHERE course_name = $1 ORDER BY created_at ASC',
      [cleanCourse]
    );
    res.json({ success: true, courseName: cleanCourse, professionals: result.rows });
  } catch (err: any) {
    console.error('Error al consultar profesionales de apoyo:', err);
    res.status(500).json({ error: 'Error al consultar profesionales de apoyo del curso.' });
  }
});

router.post('/courses/:courseName/support-professionals', authMiddleware, async (req: Request, res: Response) => {
  const { courseName } = req.params;
  const {
    professional_name,
    role,
    intervention_days,
    intervention_type = 'Co-docencia en Aula',
    target_students,
    contact_email,
    contact_phone,
    notes,
    academic_year = 2026
  } = req.body;

  const cleanCourse = decodeURIComponent(courseName).trim();
  const profName = String(professional_name || '').trim();
  const profRole = String(role || '').trim();
  const days = String(intervention_days || '').trim();

  if (!profName || !profRole || !days) {
    return res.status(400).json({ error: 'Nombre del profesional, Rol/Especialidad y Días de intervención son obligatorios.' });
  }

  try {
    const id = `SUP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(`
      INSERT INTO course_support_professionals (
        id, course_name, professional_name, role, intervention_days,
        intervention_type, target_students, contact_email, contact_phone,
        notes, academic_year
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id, cleanCourse, profName, profRole, days,
      intervention_type, target_students || null, contact_email || null, contact_phone || null,
      notes || null, academic_year
    ]);

    await logAudit(req, 'ADD_COURSE_SUPPORT', `Asignado profesional de apoyo "${profName}" (${profRole}) al curso "${cleanCourse}"`);

    res.json({
      success: true,
      message: 'Profesional de apoyo asignado al curso correctamente.',
      professional: {
        id,
        course_name: cleanCourse,
        professional_name: profName,
        role: profRole,
        intervention_days: days,
        intervention_type,
        target_students,
        contact_email,
        contact_phone,
        notes
      }
    });
  } catch (err: any) {
    console.error('Error al registrar profesional de apoyo:', err);
    res.status(500).json({ error: 'Error al registrar profesional de apoyo.' });
  }
});

router.put('/courses/support-professionals/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    professional_name,
    role,
    intervention_days,
    intervention_type,
    target_students,
    contact_email,
    contact_phone,
    notes
  } = req.body;

  try {
    await query(`
      UPDATE course_support_professionals
      SET professional_name = COALESCE($1, professional_name),
          role = COALESCE($2, role),
          intervention_days = COALESCE($3, intervention_days),
          intervention_type = COALESCE($4, intervention_type),
          target_students = COALESCE($5, target_students),
          contact_email = COALESCE($6, contact_email),
          contact_phone = COALESCE($7, contact_phone),
          notes = COALESCE($8, notes)
      WHERE id = $9
    `, [
      professional_name, role, intervention_days, intervention_type,
      target_students, contact_email, contact_phone, notes, id
    ]);

    res.json({ success: true, message: 'Datos del profesional de apoyo actualizados.' });
  } catch (err: any) {
    console.error('Error al actualizar profesional de apoyo:', err);
    res.status(500).json({ error: 'Error al actualizar profesional de apoyo.' });
  }
});

router.delete('/courses/support-professionals/:id', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM course_support_professionals WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_COURSE_SUPPORT', `Eliminado profesional de apoyo ID ${id}`);
    res.json({ success: true, message: 'Profesional de apoyo desvinculado del curso.' });
  } catch (err: any) {
    console.error('Error al eliminar profesional de apoyo:', err);
    res.status(500).json({ error: 'Error al eliminar profesional de apoyo.' });
  }
});

// -----------------------------------------------------------------------------
// CHECKLISTS DOCUMENTALES DE RETIRO Y MATRÍCULA
// -----------------------------------------------------------------------------
router.get('/students/:id/checklists', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const type = req.query.type as string;
    let sql = 'SELECT * FROM student_checklists WHERE student_id = $1';
    const params: any[] = [id];

    if (type) {
      sql += ' AND type = $2';
      params.push(type);
    }
    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, checklists: result.rows });
  } catch (err: any) {
    console.error('Error al consultar checklists del estudiante:', err);
    res.status(500).json({ error: 'Error al consultar checklists del estudiante.' });
  }
});

router.post('/students/:id/checklists', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    type,
    student_type = 'Nuevo',
    items = [],
    receiver_name,
    receiver_run,
    destination_school,
    notes,
    academic_year = 2026
  } = req.body;

  if (!type || !['withdrawal', 'enrollment', 'retiro', 'matricula'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de checklist inválido (debe ser "retiro"/"withdrawal" o "matricula"/"enrollment").' });
  }

  const normalizedType = (type === 'retiro' || type === 'withdrawal') ? 'retiro' : 'matricula';
  const officerName = req.user?.name || req.body.officer_name || 'Encargado de Matrícula';
  const completedCount = req.body.completed_items !== undefined 
    ? Number(req.body.completed_items)
    : (Array.isArray(items) ? items.filter((i: any) => i.status === 'delivered' || i.delivered || i.checked).length : 0);
  const totalCount = req.body.total_items !== undefined 
    ? Number(req.body.total_items) 
    : (Array.isArray(items) ? items.length : 0);

  try {
    const checklistId = `CHK-${normalizedType.toUpperCase()}-${id}-${Date.now()}`;
    const itemsJson = JSON.stringify(items);

    await query(`
      INSERT INTO student_checklists (
        id, student_id, type, student_type, items, completed_items, total_items,
        receiver_name, receiver_run, officer_name, destination_school, notes, academic_year
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      checklistId, id, normalizedType, student_type, itemsJson, completedCount, totalCount,
      receiver_name || null, receiver_run || null, officerName, destination_school || null,
      notes || null, academic_year
    ]);

    await logAudit(
      req,
      type === 'withdrawal' ? 'STUDENT_WITHDRAWAL_CHECKLIST' : 'STUDENT_ENROLLMENT_CHECKLIST',
      `Registrado checklist de ${type === 'withdrawal' ? 'retiro' : 'matrícula'} para estudiante ID ${id} (${completedCount}/${totalCount} documentos conformes)`
    );

    res.json({
      success: true,
      message: `Checklist de ${type === 'withdrawal' ? 'retiro' : 'matrícula'} guardado exitosamente.`,
      checklistId
    });
  } catch (err: any) {
    console.error('Error al guardar checklist documental:', err);
    res.status(500).json({ error: 'Error al guardar checklist documental.' });
  }
});

// =========================================================================
// MÓDULO 3: CONFIGURACIÓN DE INTEGRACIONES (DRIVE & GOOGLE CALENDAR)
// =========================================================================

router.get('/config/integrations', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM integration_settings ORDER BY setting_key ASC');
    const settings: Record<string, string> = {};
    result.rows.forEach((r: any) => {
      settings[r.setting_key] = r.setting_value;
    });
    res.json({ settings, raw: result.rows });
  } catch (err: any) {
    console.error('Error al consultar configuraciones de integración:', err);
    res.status(500).json({ error: 'Error al consultar parámetros de integración.' });
  }
});

router.post('/config/integrations', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Objeto de configuraciones requerido.' });
  }

  try {
    for (const [key, val] of Object.entries(settings)) {
      await query(`
        INSERT INTO integration_settings (setting_key, setting_value)
        VALUES ($1, $2)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
      `, [key, String(val || '').trim()]);
    }

    await logAudit(req, 'UPDATE_INTEGRATIONS', 'Parámetros de Google Drive y Calendar actualizados');
    res.json({ success: true, message: 'Parámetros de integración guardados correctamente.' });
  } catch (err: any) {
    console.error('Error al guardar configuraciones de integración:', err);
    res.status(500).json({ error: 'Error al guardar parámetros de integración.' });
  }
});

// =========================================================================
// MÓDULO 4: INTEGRACIÓN SEGURA CON GOOGLE DRIVE (WEBHOOK APPS SCRIPT CIFRADO)
// CUMPLIMIENTO LEY DE PROTECCIÓN DE DATOS PERSONALES Y GARANTÍAS DE LA NIÑEZ
// =========================================================================

router.get('/drive/status', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const row = await query("SELECT setting_value FROM integration_settings WHERE setting_key = 'GOOGLE_DRIVE_WEBHOOK_URL'");
    const webhookUrl = row.rows[0]?.setting_value;
    if (!webhookUrl) {
      return res.json({ connected: false, message: 'Google Drive no configurado aún.' });
    }

    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping', authToken: DRIVE_AUTH_TOKEN }),
        signal: AbortSignal.timeout(8000)
      });
      const data: any = await resp.json();
      if (data && data.success) {
        return res.json({
          connected: true,
          user: data.user,
          webhookUrl,
          message: 'Conectado exitosamente con Google Drive (Modo Cifrado y Disociado Activo).',
          security: 'ANONYMIZED_VAULT_ENABLED'
        });
      }
      return res.json({ connected: false, webhookUrl, message: data.error || 'Respuesta inválida de Google Apps Script' });
    } catch (fetchErr: any) {
      return res.json({ connected: false, webhookUrl, message: 'No se pudo conectar con el Webhook de Google Drive.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Error al verificar estado de Google Drive.' });
  }
});

router.post('/drive/configure', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return res.status(400).json({ error: 'Se requiere la URL del Webhook de Google Apps Script.' });
    }

    // Probar conexión antes de guardar
    const testResp = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping', authToken: DRIVE_AUTH_TOKEN }),
      signal: AbortSignal.timeout(10000)
    });
    const testData: any = await testResp.json();
    if (!testData || !testData.success) {
      return res.status(400).json({ error: testData?.error || 'La URL no respondió correctamente. Asegúrate de implementar el script con el token de seguridad.' });
    }

    await query(`
      INSERT INTO integration_settings (setting_key, setting_value)
      VALUES ('GOOGLE_DRIVE_WEBHOOK_URL', $1)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
    `, [webhookUrl.trim()]);

    await logAudit(req, 'CONFIGURE_GOOGLE_DRIVE', `Webhook de Google Drive configurado para: ${testData.user || 'Desconocido'} con anonimización de datos`);
    res.json({ success: true, message: 'Google Drive conectado correctamente en modo seguro y anonimizado.', user: testData.user });
  } catch (err: any) {
    console.error('Error al configurar Google Drive:', err);
    res.status(500).json({ error: 'Error al conectar con Google Drive. Revisa la URL proporcionada.' });
  }
});

router.post('/drive/upload', authMiddleware, uploadMemory.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se adjuntó ningún archivo.' });
    }

    const row = await query("SELECT setting_value FROM integration_settings WHERE setting_key = 'GOOGLE_DRIVE_WEBHOOK_URL'");
    const webhookUrl = row.rows[0]?.setting_value;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Google Drive no está configurado en el sistema.' });
    }

    const subFolder = req.body.subFolder || 'General';
    const entityType = req.body.entityType || subFolder || 'general';
    const entityId = req.body.entityId || null;
    const userIdentifier = (req as any).user?.run || (req as any).user?.name || 'Sistema';

    // CUMPLIMIENTO LEGAL DE PROTECCIÓN DE IDENTIDAD:
    // 1. El nombre físico almacenado en Google Drive NUNCA contiene RUNs, nombres de alumnos ni pistas personales.
    // Se genera un código aleatorio criptográfico único con su extensión sanitizada.
    const fileExt = path.extname(file.originalname).toLowerCase() || '.dat';
    const randomHex = crypto.randomBytes(16).toString('hex');
    const storageFileName = `ENC_DOC_${randomHex}${fileExt}`;

    // 2. La subcarpeta en Google Drive tampoco delata el expediente
    const folderHash = crypto.createHash('sha256').update(subFolder).digest('hex').substring(0, 8).toUpperCase();
    const secureFolder = `SEC_VAULT_${folderHash}`;

    const payload = {
      authToken: DRIVE_AUTH_TOKEN,
      action: 'upload',
      rootFolderName: 'LTP_EXPEDIENTES_CIFRADOS_2026',
      secureFolder,
      storageFileName,
      mimeType: file.mimetype,
      base64: file.buffer.toString('base64')
    };

    const gResp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const gData: any = await gResp.json();
    if (!gData || !gData.success) {
      return res.status(500).json({ error: gData?.error || 'Error al subir archivo a Google Drive.' });
    }

    // 3. Registrar el mapeo de disociación en la base de datos local (solo accesible desde el sistema LTP)
    const vaultId = `VLT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    await query(`
      INSERT INTO secure_file_vault (
        id, file_id, storage_name, original_name, entity_type, entity_id, mime_type, file_url, file_size, uploaded_by, is_anonymized
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
    `, [
      vaultId,
      gData.fileId,
      storageFileName,
      file.originalname,
      entityType,
      entityId,
      file.mimetype,
      gData.fileUrl,
      file.size,
      userIdentifier
    ]).catch(e => console.error('Error al registrar en secure_file_vault:', e));

    await logAudit(req, 'UPLOAD_TO_DRIVE_SECURE', `Archivo disociado subido a Drive. Original: [RESERVADO], Hash en Drive: ${storageFileName}`);

    res.json({
      success: true,
      vaultId,
      fileId: gData.fileId,
      originalName: file.originalname,
      storageFileName,
      fileUrl: gData.fileUrl,
      downloadUrl: gData.downloadUrl,
      secureFolder: gData.secureFolder,
      anonymized: true
    });
  } catch (err: any) {
    console.error('Error al subir archivo cifrado a Google Drive:', err);
    res.status(500).json({ error: 'Error al procesar subida anónima a Google Drive.' });
  }
});

// =========================================================================
// MÓDULO DE INSPECTORÍA: CONTROL DE ATRASOS, INASISTENCIAS Y PASES DE ENTRADA
// =========================================================================

// GET /api/passes - Listado y filtrado de pases
router.get('/passes', authMiddleware, checkMatrixPermission('inspector_passes'), async (req: Request, res: Response) => {
  try {
    const { date, startDate, endDate, course, studentRun, passType, status, search } = req.query;

    let queryStr = 'SELECT * FROM student_passes WHERE 1=1';
    const params: any[] = [];

    if (date) {
      params.push(date);
      queryStr += ` AND pass_date = $${params.length}`;
    } else if (startDate && endDate) {
      params.push(startDate);
      queryStr += ` AND pass_date >= $${params.length}`;
      params.push(endDate);
      queryStr += ` AND pass_date <= $${params.length}`;
    }

    if (course) {
      params.push(course);
      queryStr += ` AND course_name = $${params.length}`;
    }

    if (studentRun) {
      params.push(String(studentRun).trim());
      queryStr += ` AND student_run = $${params.length}`;
    }

    if (passType) {
      params.push(passType);
      queryStr += ` AND pass_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      queryStr += ` AND status = $${params.length}`;
    }

    if (search) {
      const s = `%${String(search).trim()}%`;
      params.push(s);
      const pIdx = params.length;
      queryStr += ` AND (student_name LIKE $${pIdx} OR student_run LIKE $${pIdx} OR reason LIKE $${pIdx} OR course_name LIKE $${pIdx})`;
    }

    queryStr += ' ORDER BY pass_date DESC, pass_time DESC, folio DESC';

    const result = await query(queryStr, params).catch(() => ({ rows: [] }));
    let rawPasses = result.rows || [];
    const passMap = new Map<string, any>();
    rawPasses.forEach((p: any) => {
      const key = String(p.id || p.folio);
      const cleanDate = p.pass_date instanceof Date ? p.pass_date.toISOString().slice(0, 10) : String(p.pass_date || '').split('T')[0];
      passMap.set(key, { ...p, pass_date: cleanDate });
    });

    // Fallback store
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.student_passes) && store.student_passes.length > 0) {
          store.student_passes.forEach((p: any) => {
            const key = String(p.id || p.folio);
            if (!passMap.has(key)) {
              const cleanDate = p.pass_date instanceof Date ? p.pass_date.toISOString().slice(0, 10) : String(p.pass_date || '').split('T')[0];
              passMap.set(key, { ...p, pass_date: cleanDate });
            }
          });
        }
      } catch (_) {}
    }

    const passes = Array.from(passMap.values());
    res.json({ success: true, passes });
  } catch (err: any) {
    console.error('❌ Error en GET /api/passes:', err);
    res.status(500).json({ error: 'Error al consultar pases de inspectoría.' });
  }
});

// GET /api/passes/student-stats/:studentRun - Estadísticas de atrasos del estudiante
router.get('/passes/student-stats/:studentRun', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rawRun = String(req.params.studentRun || '').trim();
    const cleanRun = rawRun.replace(/\./g, '').trim().toLowerCase();

    const passesRes = await query(
      'SELECT * FROM student_passes ORDER BY pass_date DESC, pass_time DESC'
    ).catch(() => ({ rows: [] }));
    
    const statsPassMap = new Map<string, any>();
    (passesRes.rows || []).forEach((p: any) => {
      const key = String(p.id || p.folio);
      const cleanDate = p.pass_date instanceof Date ? p.pass_date.toISOString().slice(0, 10) : String(p.pass_date || '').split('T')[0];
      statsPassMap.set(key, { ...p, pass_date: cleanDate });
    });

    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.student_passes)) {
          store.student_passes.forEach((p: any) => {
            const key = String(p.id || p.folio);
            if (!statsPassMap.has(key)) {
              const cleanDate = p.pass_date instanceof Date ? p.pass_date.toISOString().slice(0, 10) : String(p.pass_date || '').split('T')[0];
              statsPassMap.set(key, { ...p, pass_date: cleanDate });
            }
          });
        }
      } catch (_) {}
    }
    const allPasses = Array.from(statsPassMap.values());

    const studentPasses = allPasses.filter((p: any) => {
      const pRun = String(p.student_run || '').replace(/\./g, '').trim().toLowerCase();
      return pRun === cleanRun || String(p.student_id) === rawRun;
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyLates = studentPasses.filter((p: any) => {
      if (!String(p.pass_type || '').toLowerCase().includes('atraso')) return false;
      const d = new Date(p.pass_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const yearlyLates = studentPasses.filter((p: any) => {
      return String(p.pass_type || '').toLowerCase().includes('atraso');
    }).length;

    const todayStr = now.toISOString().slice(0, 10);
    const todayPasses = studentPasses.filter((p: any) => {
      const pDate = p.pass_date instanceof Date ? p.pass_date.toISOString().slice(0, 10) : String(p.pass_date || '').slice(0, 10);
      return pDate === todayStr;
    });

    res.json({
      success: true,
      studentRun: rawRun,
      stats: {
        monthlyLates,
        yearlyLates,
        totalPasses: studentPasses.length,
        hasLateToday: todayPasses.length > 0,
        alertTriggered: monthlyLates >= 3 || yearlyLates >= 5
      },
      passes: studentPasses
    });
  } catch (err: any) {
    console.error('❌ Error en GET /api/passes/student-stats:', err);
    res.status(500).json({ error: 'Error al consultar estadísticas del estudiante.' });
  }
});

// POST /api/passes - Emitir nuevo pase de entrada
router.post('/passes', authMiddleware, checkMatrixPermission('inspector_passes'), async (req: Request, res: Response) => {
  try {
    const studentId = req.body.studentId || req.body.student_id || '';
    const studentRun = req.body.studentRun || req.body.student_run || '';
    const studentName = req.body.studentName || req.body.student_name || '';
    const courseName = req.body.courseName || req.body.course_name || '';
    const passType = req.body.passType || req.body.pass_type || 'Atraso a la Jornada';
    const passDate = req.body.passDate || req.body.pass_date;
    const passTime = req.body.passTime || req.body.pass_time;
    const reason = req.body.reason || 'Sin motivo especificado';
    const status = req.body.status || 'Injustificado';
    const justificationDetail = req.body.justificationDetail || req.body.justification_detail || null;
    const academicYear = req.body.academicYear || req.body.academic_year || 2026;
    const period = req.body.period || '1er Semestre';

    if (!studentRun || !studentName || !courseName) {
      return res.status(400).json({ error: 'Faltan datos requeridos del estudiante (RUN, Nombre, Curso).' });
    }

    const passId = `PAS-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const user = req.user as any;
    const inspectorName = user?.name || req.body.inspectorName || 'Inspector de Turno';
    const inspectorId = user?.id || req.body.inspectorId || null;

    const now = new Date();
    const finalDate = passDate || now.toISOString().slice(0, 10);
    const finalTime = passTime || now.toTimeString().slice(0, 8);
    const finalType = passType || 'Atraso a la Jornada';
    const finalStatus = status || 'Injustificado';
    const finalYear = academicYear || 2026;
    const finalPeriod = period || '1er Semestre';

    // Insertar en MySQL
    let insertedFolio = 1;
    try {
      const insertSql = `
        INSERT INTO student_passes (
          id, student_id, student_run, student_name, course_name, pass_type,
          pass_date, pass_time, reason, status, justification_detail,
          inspector_name, inspector_id, academic_year, period
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      await query(insertSql, [
        passId,
        studentId || studentRun,
        studentRun,
        studentName,
        courseName,
        finalType,
        finalDate,
        finalTime,
        reason || 'Sin motivo especificado',
        finalStatus,
        justificationDetail || null,
        inspectorName,
        inspectorId,
        finalYear,
        finalPeriod
      ]);

      // Consultar el pase insertado para obtener su folio auto-incremental
      const rowRes = await query('SELECT * FROM student_passes WHERE id = $1 LIMIT 1', [passId]);
      if (rowRes.rows && rowRes.rows.length > 0) {
        insertedFolio = rowRes.rows[0].folio || 1;
      }
    } catch (dbErr: any) {
      console.warn('⚠️ Error al insertar pase en DB, guardando en store:', dbErr.message);
    }

    // Persistir en local_store.json
    const storePath = getStorePath();
    let existingPasses: any[] = [];
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        existingPasses = store.student_passes || [];
        if (!insertedFolio || insertedFolio === 1) {
          const maxFolio = existingPasses.reduce((max: number, p: any) => Math.max(max, p.folio || 0), 0);
          insertedFolio = maxFolio + 1;
        }
        const newPassObj = {
          id: passId,
          folio: insertedFolio,
          student_id: studentId || studentRun,
          student_run: studentRun,
          student_name: studentName,
          course_name: courseName,
          pass_type: finalType,
          pass_date: finalDate,
          pass_time: finalTime,
          reason: reason || 'Sin motivo especificado',
          status: finalStatus,
          justification_detail: justificationDetail || null,
          inspector_name: inspectorName,
          inspector_id: inspectorId,
          academic_year: finalYear,
          period: finalPeriod,
          created_at: new Date().toISOString()
        };
        store.student_passes = [newPassObj, ...existingPasses];
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
      } catch (_) {}
    }

    // Calcular estadísticas actualizadas del alumno
    const allPassesRes = await query('SELECT * FROM student_passes WHERE student_run = $1', [studentRun]).catch(() => ({ rows: [] }));
    const sPasses = allPassesRes.rows || [];
    const currentMonth = new Date(finalDate).getMonth();
    const currentYear = new Date(finalDate).getFullYear();

    const monthlyLates = sPasses.filter((p: any) => {
      if (!String(p.pass_type || '').toLowerCase().includes('atraso')) return false;
      const d = new Date(p.pass_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const yearlyLates = sPasses.filter((p: any) => String(p.pass_type || '').toLowerCase().includes('atraso')).length;

    const fullPass = {
      id: passId,
      folio: insertedFolio,
      student_id: studentId || studentRun,
      student_run: studentRun,
      student_name: studentName,
      course_name: courseName,
      pass_type: finalType,
      pass_date: finalDate,
      pass_time: finalTime,
      reason: reason || 'Sin motivo especificado',
      status: finalStatus,
      justification_detail: justificationDetail || null,
      inspector_name: inspectorName,
      inspector_id: inspectorId,
      academic_year: finalYear,
      period: finalPeriod,
      created_at: new Date().toISOString()
    };

    await logAudit(req, 'CREATE_STUDENT_PASS', `Pase emitido: Folio #${insertedFolio} a ${studentName} (${courseName}) por ${finalType}. Motivo: ${reason}`);

    res.json({
      success: true,
      pass: fullPass,
      studentStats: {
        monthlyLates,
        yearlyLates,
        alertTriggered: monthlyLates >= 3 || yearlyLates >= 5
      }
    });
  } catch (err: any) {
    console.error('❌ Error en POST /api/passes:', err);
    res.status(500).json({ error: 'Error al emitir pase de inspectoría.' });
  }
});

// PUT /api/passes/:id/justify - Justificar un pase emitido
router.put('/passes/:id/justify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { justificationDetail } = req.body;
    const user = req.user as any;

    await query(
      'UPDATE student_passes SET status = $1, justification_detail = $2, updated_at = NOW() WHERE id = $3',
      ['Justificado', justificationDetail || 'Justificado por Inspectoría', id]
    );

    // Actualizar en local_store si existe
    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.student_passes)) {
          store.student_passes = store.student_passes.map((p: any) => {
            if (p.id === id) {
              return { ...p, status: 'Justificado', justification_detail: justificationDetail || 'Justificado por Inspectoría' };
            }
            return p;
          });
          fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
        }
      } catch (_) {}
    }

    await logAudit(req, 'JUSTIFY_STUDENT_PASS', `Pase ${id} justificado por ${user?.name || 'Inspector'}. Detalle: ${justificationDetail}`);

    res.json({ success: true, message: 'Pase justificado exitosamente.' });
  } catch (err: any) {
    console.error('❌ Error en PUT /api/passes/:id/justify:', err);
    res.status(500).json({ error: 'Error al justificar pase.' });
  }
});

// DELETE /api/passes/:id - Anular pase emitido
router.delete('/passes/:id', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM student_passes WHERE id = $1', [id]);

    const storePath = getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        if (Array.isArray(store.student_passes)) {
          store.student_passes = store.student_passes.filter((p: any) => p.id !== id);
          fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
        }
      } catch (_) {}
    }

    await logAudit(req, 'DELETE_STUDENT_PASS', `Pase ${id} anulado por el Administrador.`);

    res.json({ success: true, message: 'Pase anulado correctamente.' });
  } catch (err: any) {
    console.error('❌ Error en DELETE /api/passes/:id:', err);
    res.status(500).json({ error: 'Error al anular pase.' });
  }
});

// -----------------------------------------------------------------------------
// SALIDAS PEDAGÓGICAS Y AUTORIZACIONES INSTITUCIONALES (LTP PRO 2.0)
// -----------------------------------------------------------------------------

// GET /api/pedagogical-trips - Listar todas las salidas pedagógicas con cantidad de alumnos
router.get('/pedagogical-trips', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    let sql = `
      SELECT t.*,
             (SELECT COUNT(*) FROM pedagogical_trip_students pts WHERE pts.trip_id = t.id) as student_count
      FROM pedagogical_trips t
    `;
    const params: any[] = [];
    if (year) {
      sql += ' WHERE t.academic_year = $1';
      params.push(parseInt(String(year), 10));
    }
    sql += ' ORDER BY t.trip_date DESC, t.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('❌ Error en GET /api/pedagogical-trips:', err);
    res.status(500).json({ error: 'Error al consultar salidas pedagógicas.' });
  }
});

// GET /api/pedagogical-trips/:id - Obtener detalle de salida con nómina completa de estudiantes para impresión
router.get('/pedagogical-trips/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tripRes = await query('SELECT * FROM pedagogical_trips WHERE id = $1', [id]);
    if (tripRes.rows.length === 0) {
      return res.status(404).json({ error: 'Salida pedagógica no encontrada.' });
    }

    const trip = tripRes.rows[0];

    // Obtener alumnos asignados con datos completos de matrícula, apoderado y fecha nacimiento
    const studentsRes = await query(`
      SELECT pts.id as entry_id, pts.trip_id, pts.authorized,
             s.id, s.run, s.full_name, s.birth_date, s.desc_grado, s.letra_curso,
             s.enrollment_number, s.guardian_name, s.guardian_run,
             s.guardian_phone, s.guardian_email, s.father_name, s.father_run,
             s.mother_name, s.mother_run, s.gender, s.list_number,
             COALESCE(pts.course_name, s.desc_grado) as course_name
      FROM pedagogical_trip_students pts
      JOIN students s ON (s.id = pts.student_id OR s.run = pts.student_run)
      WHERE pts.trip_id = $1
      ORDER BY s.desc_grado ASC, s.list_number ASC, s.full_name ASC
    `, [id]);

    res.json({
      ...trip,
      students: studentsRes.rows
    });
  } catch (err: any) {
    console.error('❌ Error en GET /api/pedagogical-trips/:id:', err);
    res.status(500).json({ error: 'Error al consultar detalle de la salida pedagógica.' });
  }
});

// POST /api/pedagogical-trips - Crear nueva salida pedagógica con estudiantes seleccionados
router.post('/pedagogical-trips', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Administrativo', 'Asistente', 'Asistente de la Educación']), async (req: Request, res: Response) => {
  try {
    const {
      title,
      destination,
      trip_date,
      time_range,
      departure_time,
      return_time,
      responsible_teacher,
      issue_date,
      city,
      description,
      academic_year,
      student_ids
    } = req.body;

    if (!title || !destination || !trip_date) {
      return res.status(400).json({ error: 'Título del evento, Sede/Destino y Fecha son obligatorios.' });
    }

    const tripId = `TRIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const finalCity = city || 'Campanario';
    const finalYear = academic_year || 2026;
    const finalSchedule = time_range || (departure_time && return_time ? `${departure_time} Hrs a ${return_time} Hrs.` : '08:30 Hrs a 14:00 Hrs.');
    const finalTeacher = responsible_teacher || req.user?.name || 'Docente Responsable';
    const finalIssueDate = issue_date || trip_date;

    await query(`
      INSERT INTO pedagogical_trips (
        id, title, destination, trip_date, time_range, departure_time, return_time,
        responsible_teacher, issue_date, city, description, academic_year, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      tripId,
      title.trim(),
      destination.trim(),
      trip_date,
      finalSchedule,
      departure_time || '08:30',
      return_time || '14:00',
      finalTeacher,
      finalIssueDate,
      finalCity,
      description || null,
      finalYear,
      req.user?.name || 'Administrador'
    ]);

    // Insertar estudiantes seleccionados
    const studentList: string[] = Array.isArray(student_ids) ? student_ids : [];
    if (studentList.length > 0) {
      for (const stdId of studentList) {
        const stdRes = await query('SELECT id, run, full_name, desc_grado FROM students WHERE id = $1 OR run = $1', [stdId]);
        if (stdRes.rows.length > 0) {
          const s = stdRes.rows[0];
          const entryId = `PTS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await query(`
            INSERT IGNORE INTO pedagogical_trip_students (
              id, trip_id, student_id, student_run, student_name, course_name
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            entryId,
            tripId,
            s.id,
            s.run,
            s.full_name,
            s.desc_grado || '1° Medio'
          ]).catch(err => console.error('Error inserting student in trip:', err));
        }
      }
    }

    await logAudit(req, 'CREATE_PEDAGOGICAL_TRIP', `Salida "${title}" a "${destination}" creada con ${studentList.length} alumnos.`);

    res.status(201).json({
      success: true,
      tripId,
      trip: { id: tripId },
      message: `Salida pedagógica registrada exitosamente con ${studentList.length} estudiantes asignados.`
    });
  } catch (err: any) {
    console.error('❌ Error en POST /api/pedagogical-trips:', err);
    res.status(500).json({ error: 'Error al registrar salida pedagógica.' });
  }
});

// PUT /api/pedagogical-trips/:id - Modificar datos de la salida o actualizar nómina de alumnos
router.put('/pedagogical-trips/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Administrativo', 'Asistente', 'Asistente de la Educación']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      destination,
      trip_date,
      time_range,
      departure_time,
      return_time,
      responsible_teacher,
      issue_date,
      city,
      description,
      student_ids
    } = req.body;

    const finalSchedule = time_range || (departure_time && return_time ? `${departure_time} Hrs a ${return_time} Hrs.` : '08:30 Hrs a 14:00 Hrs.');

    await query(`
      UPDATE pedagogical_trips SET
        title = $1,
        destination = $2,
        trip_date = $3,
        time_range = $4,
        departure_time = $5,
        return_time = $6,
        responsible_teacher = $7,
        issue_date = $8,
        city = $9,
        description = $10
      WHERE id = $11
    `, [
      title.trim(),
      destination.trim(),
      trip_date,
      finalSchedule,
      departure_time || '08:30',
      return_time || '14:00',
      responsible_teacher || 'Docente Responsable',
      issue_date || trip_date,
      city || 'Campanario',
      description || null,
      id
    ]);

    // Si se envían student_ids, sincronizar nómina
    if (Array.isArray(student_ids)) {
      await query('DELETE FROM pedagogical_trip_students WHERE trip_id = $1', [id]);
      for (const stdId of student_ids) {
        const stdRes = await query('SELECT id, run, full_name, desc_grado FROM students WHERE id = $1 OR run = $1', [stdId]);
        if (stdRes.rows.length > 0) {
          const s = stdRes.rows[0];
          const entryId = `PTS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await query(`
            INSERT IGNORE INTO pedagogical_trip_students (
              id, trip_id, student_id, student_run, student_name, course_name
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            entryId,
            id,
            s.id,
            s.run,
            s.full_name,
            s.desc_grado || '1° Medio'
          ]).catch(err => console.error('Error updating student in trip:', err));
        }
      }
    }

    await logAudit(req, 'UPDATE_PEDAGOGICAL_TRIP', `Salida "${title}" actualizada correctamente.`);

    res.json({ success: true, message: 'Salida pedagógica actualizada exitosamente.' });
  } catch (err: any) {
    console.error('❌ Error en PUT /api/pedagogical-trips/:id:', err);
    res.status(500).json({ error: 'Error al actualizar salida pedagógica.' });
  }
});

// DELETE /api/pedagogical-trips/:id - Eliminar salida pedagógica
router.delete('/pedagogical-trips/:id', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM pedagogical_trip_students WHERE trip_id = $1', [id]);
    await query('DELETE FROM pedagogical_trips WHERE id = $1', [id]);

    await logAudit(req, 'DELETE_PEDAGOGICAL_TRIP', `Salida ${id} eliminada por el Administrador.`);

    res.json({ success: true, message: 'Salida pedagógica eliminada correctamente.' });
  } catch (err: any) {
    console.error('❌ Error en DELETE /api/pedagogical-trips/:id:', err);
    res.status(500).json({ error: 'Error al eliminar salida pedagógica.' });
  }
});

// Rutas de Informes Oficiales MINEDUC (Decreto 170)
router.use('/mineduc-reports', mineducReportsRouter);

export default router;

