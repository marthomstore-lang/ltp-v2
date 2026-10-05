import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query, isMysql } from '../config/db';
import { authMiddleware, checkRoles, logAudit } from '../middleware/auth';

const router = Router();

const getLocalStorePath = () => {
  const p1 = path.join(process.cwd(), 'local_store.json');
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(process.cwd(), 'backend', 'local_store.json');
  if (fs.existsSync(p2)) return p2;
  const p3 = path.resolve(__dirname, '../../local_store.json');
  if (fs.existsSync(p3)) return p3;
  return p1;
};

// Garantizar tabla mineduc_reports vinculada por RUT del estudiante
export async function ensureMineducReportsTable() {
  try {
    if (isMysql) {
      await query(`
        CREATE TABLE IF NOT EXISTS mineduc_reports (
          id VARCHAR(255) PRIMARY KEY,
          student_run VARCHAR(50) NOT NULL,
          report_type VARCHAR(50) NOT NULL,
          academic_year INT DEFAULT 2026,
          evaluation_date VARCHAR(50),
          professional_run VARCHAR(50),
          professional_name VARCHAR(255),
          professional_role VARCHAR(100),
          professional_reg VARCHAR(100),
          report_data LONGTEXT,
          status VARCHAR(50) DEFAULT 'Borrador',
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_mineduc_reports_run (student_run),
          INDEX idx_mineduc_reports_type (report_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
      `).catch(() => {});
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS mineduc_reports (
          id TEXT PRIMARY KEY,
          student_run TEXT NOT NULL,
          report_type TEXT NOT NULL,
          academic_year INTEGER DEFAULT 2026,
          evaluation_date TEXT,
          professional_run TEXT,
          professional_name TEXT,
          professional_role TEXT,
          professional_reg TEXT,
          report_data TEXT,
          status TEXT DEFAULT 'Borrador',
          created_by TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_mineduc_reports_run ON mineduc_reports(student_run);
      `).catch(() => {});

      // Limpiar valores de diagnóstico inválidos o códigos de plantillas guardados por error en pie_diagnosis
      await query(
        `UPDATE students SET pie_diagnosis = NULL WHERE pie_diagnosis IN ('S/I', '152', 'INFORME_FAMILIA_SEMESTRAL', 'FUS_MINEDUC', 'SIMCE_NEEP', 'PAEC_PLAN_TEA', 'PSICOPEDAGOGICO_DEC170', 'Informe para la Familia (Semestral PIE)', 'Formulario Único Síntesis (FUS - MINEDUC)', 'Necesidades Educativas Especiales')`
      ).catch(() => {});
      await query(
        `DELETE FROM mineduc_reports WHERE id = '433e851b-7706-402c-bb42-c75eacad06f3'`
      ).catch(() => {});
      await query(
        `UPDATE students SET pie_program = 1, pie_diagnosis = 'Trastorno del Lenguaje' WHERE UPPER(REPLACE(REPLACE(run, '.', ''), '-', '')) = '276439227' AND (pie_diagnosis IS NULL OR pie_diagnosis = '')`
      ).catch(() => {});
    }
  } catch (err) {
    console.error('Error al inicializar tabla mineduc_reports:', err);
  }
}

// Importar informes y mapeos desde scratch/informes_export_completo.json
export async function importScratchReportsIfAvailable() {
  try {
    const scratchPath = 'c:\\proyectos\\integracion-2026\\scratch\\informes_export_completo.json';
    if (!fs.existsSync(scratchPath)) return;

    const countRes = await query('SELECT COUNT(*) as total FROM mineduc_reports').catch(() => ({ rows: [{ total: 0 }] }));
    const existingCount = parseInt(String(countRes.rows?.[0]?.total || '0'), 10);
    if (existingCount >= 140) {
      return;
    }

    const fileContent = fs.readFileSync(scratchPath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    const reports = parsed.reports || [];
    if (!Array.isArray(reports) || reports.length === 0) return;

    console.log(`📦 Importando ${reports.length} informes oficiales desde ${scratchPath}...`);

    const storePath = getLocalStorePath();
    let localStore: any = {};
    try {
      if (fs.existsSync(storePath)) {
        localStore = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      }
    } catch (_) {}
    if (!Array.isArray(localStore.mineduc_reports)) localStore.mineduc_reports = [];
    if (!Array.isArray(localStore.students)) localStore.students = [];

    let importedCount = 0;
    for (const r of reports) {
      if (r.type === 'course_teachers') {
        const mapping = r.data?.mapping || {};
        for (const [courseName, teacherName] of Object.entries(mapping)) {
          if (teacherName) {
            await query(`
              UPDATE students
              SET profesor_jefe = $1
              WHERE desc_grado = $2 OR CONCAT(desc_grado, ' ', letra_curso) = $2
            `, [teacherName, courseName]).catch(() => {});

            localStore.students.forEach((s: any) => {
              const cName = s.desc_grado || s.curso;
              if (cName === courseName) s.profesor_jefe = teacherName;
            });
          }
        }
        continue;
      }
      if (r.type === 'print_settings') continue;

      let targetType = 'FUS_MINEDUC';
      if (r.type === 'simce') targetType = 'SIMCE_NEEP';
      else if (r.type === 'familia') targetType = 'INFORME_FAMILIA_SEMESTRAL';
      else if (r.type === 'paec') targetType = 'PAEC_PLAN_TEA';
      else if (r.type === 'psicopedagogico') targetType = 'PSICOPEDAGOGICO_DEC170';

      const rData = r.data || {};
      const cleanRun = String(r.student_run || '').trim();
      if (!cleanRun || cleanRun === 'SYSTEM') continue;

      const rawRunDigits = cleanRun.replace(/[^0-9kK]/g, '').toUpperCase();
      let targetRun = cleanRun;

      // Buscar si el estudiante ya existe en la base de datos oficial por RUN limpio
      const existingStudentRes = await query(`
        SELECT id, run, pie_diagnosis, pie_program, full_name, desc_grado FROM students 
        WHERE REPLACE(REPLACE(run, '.', ''), '-', '') = $1
        LIMIT 1
      `, [rawRunDigits]).catch(() => ({ rows: [] }));

      if (existingStudentRes && existingStudentRes.rows && existingStudentRes.rows.length > 0) {
        const existingStudent = existingStudentRes.rows[0];
        targetRun = existingStudent.run; // Usar el RUN oficial (ej: 23.223.795-3)
        const diagToSet = r.student_diagnostico || rData.diagnostico || null;
        if (diagToSet && (!existingStudent.pie_diagnosis || existingStudent.pie_diagnosis === 'NEE')) {
          await query(`
            UPDATE students 
            SET pie_diagnosis = $1, pie_program = 1 
            WHERE id = $2
          `, [diagToSet, existingStudent.id]).catch(() => {});
        } else {
          await query(`
            UPDATE students SET pie_program = 1 WHERE id = $1
          `, [existingStudent.id]).catch(() => {});
        }

        // Sincronizar en localStore si existe
        const exIdx = localStore.students.findIndex((s: any) => 
          String(s.run || '').replace(/[^0-9kK]/g, '').toUpperCase() === rawRunDigits
        );
        if (exIdx !== -1) {
          if (diagToSet && (!localStore.students[exIdx].pie_diagnosis || localStore.students[exIdx].pie_diagnosis === 'NEE')) {
            localStore.students[exIdx].pie_diagnosis = diagToSet;
          }
          localStore.students[exIdx].pie_program = 1;
        }
      } else if (r.student_name) {
        // Solo si NO existe bajo ningún formato, insertar registro nuevo
        await query(`
          INSERT INTO students (id, run, full_name, desc_grado, pie_diagnosis, pie_program)
          VALUES ($1, $2, $3, $4, $5, 1)
        `, [
          `STU-${rawRunDigits}`,
          cleanRun,
          r.student_name,
          r.student_course || 'Sin Asignar',
          r.student_diagnostico || rData.diagnostico || null
        ]).catch(() => {});

        localStore.students.push({
          id: `STU-${rawRunDigits}`,
          run: cleanRun,
          full_name: r.student_name,
          desc_grado: r.student_course || 'Sin Asignar',
          pie_diagnosis: r.student_diagnostico || rData.diagnostico || 'NEE',
          pie_program: 1
        });
      }

      const profRun = rData.profesional_data?.rut || rData.profesionalRut || '';
      const profName = rData.profesional_data?.nombre || rData.profesionalNombre || rData.coordinadorNombre || rData.firma_usuario_nombre || 'Scarlette Burgos Sandoval';
      const profRole = rData.profesional_data?.cargo || rData.profesionalProfesion || rData.firma_usuario_cargo || 'Especialista PIE';
      const profReg = rData.profesionalRegistro || '';
      const evalDate = rData.profesional_data?.fecha || rData.fechaEvaluacion || rData.fecha_elaboracion || (rData.anio && rData.mes && rData.dia ? `${rData.anio}-${rData.mes}-${rData.dia}` : r.created_at?.split('T')[0]);

      const reportDataStr = JSON.stringify({
        ...rData,
        estudianteNombre: r.student_name || rData.estudianteNombre,
        estudianteRut: targetRun,
        estudianteCurso: r.student_course || rData.estudianteCurso,
        diagnostico: r.student_diagnostico || rData.diagnostico,
        semester: r.semester || 1
      });

      const reportId = r.id || `REP-${rawRunDigits}-${targetType}`;


      if (isMysql) {
        await query(`
          INSERT INTO mineduc_reports (
            id, student_run, report_type, academic_year, evaluation_date,
            professional_run, professional_name, professional_role, professional_reg,
            report_data, status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON DUPLICATE KEY UPDATE
            report_type = VALUES(report_type),
            academic_year = VALUES(academic_year),
            evaluation_date = VALUES(evaluation_date),
            professional_run = VALUES(professional_run),
            professional_name = VALUES(professional_name),
            professional_role = VALUES(professional_role),
            professional_reg = VALUES(professional_reg),
            report_data = VALUES(report_data),
            status = VALUES(status),
            updated_at = CURRENT_TIMESTAMP
        `, [
          reportId, cleanRun, targetType, 2026, evalDate || null,
          profRun || null, profName || null, profRole || null, profReg || null,
          reportDataStr, 'Completado', 'Importación Scratch Integración 2026'
        ]).catch(() => {});
      } else {
        await query(`
          INSERT INTO mineduc_reports (
            id, student_run, report_type, academic_year, evaluation_date,
            professional_run, professional_name, professional_role, professional_reg,
            report_data, status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            report_type = EXCLUDED.report_type,
            academic_year = EXCLUDED.academic_year,
            evaluation_date = EXCLUDED.evaluation_date,
            professional_run = EXCLUDED.professional_run,
            professional_name = EXCLUDED.professional_name,
            professional_role = EXCLUDED.professional_role,
            professional_reg = EXCLUDED.professional_reg,
            report_data = EXCLUDED.report_data,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          reportId, cleanRun, targetType, 2026, evalDate || null,
          profRun || null, profName || null, profRole || null, profReg || null,
          reportDataStr, 'Completado', 'Importación Scratch Integración 2026'
        ]).catch(() => {});
      }

      // Guardar también en localStore como respaldo de memoria y offline
      const storeItem = {
        id: reportId,
        student_run: cleanRun,
        student_name: r.student_name,
        desc_grado: r.student_course,
        pie_diagnosis: r.student_diagnostico || rData.diagnostico,
        report_type: targetType,
        academic_year: 2026,
        evaluation_date: evalDate || '2026-08-20',
        professional_run: profRun,
        professional_name: profName,
        professional_role: profRole,
        professional_reg: profReg,
        report_data: JSON.parse(reportDataStr),
        status: 'Completado',
        created_at: r.created_at || new Date().toISOString()
      };
      const exIdx = localStore.mineduc_reports.findIndex((rep: any) => rep.id === reportId);
      if (exIdx !== -1) localStore.mineduc_reports[exIdx] = storeItem;
      else localStore.mineduc_reports.push(storeItem);

      importedCount++;
    }

    try {
      fs.writeFileSync(storePath, JSON.stringify(localStore, null, 2), 'utf-8');
    } catch (_) {}

    console.log(`✅ ${importedCount} informes importados exitosamente desde Scratch.`);
  } catch (err) {
    console.error('Error al importar informes desde scratch:', err);
  }
}

ensureMineducReportsTable().then(() => {
  importScratchReportsIfAvailable();
});

// Función auxiliar para formatear fecha al estándar chileno (DD/MM/AAAA)
function formatChileDate(val: any): string {
  if (!val) return 'No registrada';
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [_, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return str;
}

// Función auxiliar para calcular edad en años y meses exactos
function calculateAge(birthDateVal: any) {
  if (!birthDateVal) return { years: 0, months: 0, text: 'No registrada' };
  let birth: Date;
  if (birthDateVal instanceof Date) {
    birth = birthDateVal;
  } else {
    const str = String(birthDateVal).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      birth = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    } else {
      birth = new Date(str);
    }
  }
  if (isNaN(birth.getTime())) return { years: 0, months: 0, text: 'Fecha no válida' };
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    text: `${Math.max(0, years)} años y ${Math.max(0, months)} meses`
  };
}

// -----------------------------------------------------------------------------
// 1. LISTAR TODOS LOS INFORMES MINEDUC (CON JOIN A TABLA STUDENTS POR RUN)
// -----------------------------------------------------------------------------
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { year, type, search, course } = req.query;
    const academicYear = year ? parseInt(String(year), 10) : 2026;

    let sql = `
      SELECT 
        r.id,
        r.student_run,
        r.report_type,
        r.academic_year,
        r.evaluation_date,
        r.professional_run,
        r.professional_name,
        r.professional_role,
        r.professional_reg,
        r.status,
        r.created_by,
        r.created_at,
        r.updated_at,
        s.full_name AS student_name,
        s.desc_grado,
        s.letra_curso,
        s.birth_date,
        s.pie_diagnosis,
        s.pie_program,
        s.profesor_jefe,
        s.profesor_pie
      FROM mineduc_reports r
      LEFT JOIN students s ON (s.run = r.student_run OR REPLACE(REPLACE(s.run, '.', ''), '-', '') = REPLACE(REPLACE(r.student_run, '.', ''), '-', ''))
      WHERE (r.academic_year = $1 OR $1 IS NULL)
    `;
    const params: any[] = [academicYear];

    if (type && type !== 'TODOS') {
      params.push(type);
      sql += ` AND r.report_type = $${params.length}`;
    }

    if (course && course !== 'TODOS') {
      params.push(course);
      sql += ` AND s.desc_grado = $${params.length}`;
    }

    if (search && String(search).trim() !== '') {
      params.push(`%${String(search).trim()}%`);
      sql += ` AND (s.full_name LIKE $${params.length} OR r.student_run LIKE $${params.length} OR r.professional_name LIKE $${params.length})`;
    }

    sql += ` ORDER BY r.updated_at DESC`;

    const result = await query(sql, params);
    let rows = result.rows || [];
    if (rows.length === 0) {
      const storePath = getLocalStorePath();
      if (fs.existsSync(storePath)) {
        try {
          const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
          if (Array.isArray(store.mineduc_reports)) {
            rows = store.mineduc_reports;
            if (type && type !== 'TODOS') {
              rows = rows.filter((r: any) => r.report_type === type);
            }
            if (course && course !== 'TODOS') {
              rows = rows.filter((r: any) => (r.desc_grado === course || r.student_course === course));
            }
            if (search && String(search).trim() !== '') {
              const term = String(search).trim().toLowerCase();
              rows = rows.filter((r: any) =>
                (r.student_name && r.student_name.toLowerCase().includes(term)) ||
                (r.student_run && r.student_run.toLowerCase().includes(term)) ||
                (r.professional_name && r.professional_name.toLowerCase().includes(term))
              );
            }
          }
        } catch (_) {}
      }
    }
    res.json(rows);
  } catch (err: any) {
    console.error('Error al listar informes MINEDUC:', err);
    res.status(500).json({ error: 'Error al obtener informes MINEDUC.' });
  }
});

// -----------------------------------------------------------------------------
// 2. CONTEXTO COMPLETO DEL ESTUDIANTE POR RUT (PRE-CARGA Y AUTOCOMPLETADO)
// -----------------------------------------------------------------------------
router.get('/student-context/:run', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rawRun = req.params.run || '';
    const cleanRun = rawRun.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
    const { studentId, course } = req.query;

    if (!cleanRun) {
      return res.status(400).json({ error: 'RUT de estudiante requerido.' });
    }

    // 1. Obtener datos maestros del estudiante desde tabla 'students'
    let studentSql = `
      SELECT 
        id, run, full_name, first_name, paternal_surname, maternal_surname,
        desc_grado, letra_curso, cod_grado, cod_tipo_ensenanza, rbd,
        birth_date, edad, gender, address, commune,
        pie_program, pie_diagnosis, differential_group, profesor_jefe, profesor_pie,
        guardian_name, guardian_run, guardian_phone, guardian_email, guardian_relation,
        has_psychological_care, psychological_care_detail,
        has_neurological_care, neurological_care_detail,
        health_observations, is_retired
      FROM students
      WHERE (REPLACE(REPLACE(run, '.', ''), '-', '') = $1 OR id = $2)
    `;
    const sParams: any[] = [cleanRun, `STU-${cleanRun}`];

    if (studentId) {
      sParams.push(studentId);
      studentSql += ` AND id = $${sParams.length}`;
    } else if (course) {
      sParams.push(course);
      studentSql += ` AND desc_grado = $${sParams.length}`;
    }

    // Si no se especificó curso o id, priorizar matrícula activa (is_retired = 0)
    studentSql += ` ORDER BY is_retired ASC LIMIT 1`;

    const studentRes = await query(studentSql, sParams);

    if (!studentRes.rows || studentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Estudiante no encontrado en la base de datos de matrícula.' });
    }

    const student = studentRes.rows[0];
    const ageInfo = calculateAge(student.birth_date);

    // 2. Obtener resumen de rendimiento académico del estudiante desde 'grades'
    let gradesSummary = {
      overallAverage: null as number | null,
      topSubjects: [] as string[],
      needsSupportSubjects: [] as string[],
      totalGradesCount: 0
    };

    try {
      const gradesRes = await query(`
        SELECT 
          subject_name,
          AVG(score) AS avg_score,
          COUNT(score) AS total_scores
        FROM grades
        WHERE (student_id = $1 OR student_id = $2) AND score > 0
        GROUP BY subject_name
        ORDER BY avg_score DESC
      `, [student.id, `STU-${cleanRun}`]);

      if (gradesRes.rows && gradesRes.rows.length > 0) {
        const rows = gradesRes.rows;
        let sum = 0;
        let count = 0;
        rows.forEach((r: any) => {
          const val = parseFloat(r.avg_score);
          if (!isNaN(val)) {
            sum += val;
            count++;
          }
        });

        const overall = count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
        const top = rows.slice(0, 3).map((r: any) => `${r.subject_name} (${parseFloat(r.avg_score).toFixed(1)})`);
        const bottom = rows.length > 3 
          ? rows.slice(-3).reverse().map((r: any) => `${r.subject_name} (${parseFloat(r.avg_score).toFixed(1)})`)
          : [];

        gradesSummary = {
          overallAverage: overall,
          topSubjects: top,
          needsSupportSubjects: bottom,
          totalGradesCount: rows.reduce((acc: number, r: any) => acc + parseInt(r.total_scores || '0', 10), 0)
        };
      }
    } catch (gErr) {
      console.warn('Advertencia al consultar calificaciones para MINEDUC:', gErr);
    }

    // 3. Obtener nómina de profesionales activos desde 'users' para selección rápida
    let staffList: any[] = [];
    try {
      const staffRes = await query(`
        SELECT name, run, role, email
        FROM users
        WHERE role IN ('Docente', 'PIE', 'Profesionales', 'Asistente', 'Director', 'Admin')
        ORDER BY name ASC
      `);
      staffList = staffRes.rows || [];
    } catch (_) {}

    // 4. Obtener director(a) y datos oficiales de la institución desde configuración centralizada
    let instSettings: any = null;
    try {
      const sRes = await query("SELECT config_value FROM system_settings WHERE config_key = 'institution_settings' LIMIT 1");
      if (sRes.rows && sRes.rows.length > 0 && sRes.rows[0].config_value) {
        instSettings = JSON.parse(sRes.rows[0].config_value);
      }
    } catch (_) {}

    const institution = {
      name: instSettings?.schoolName || 'Liceo Técnico Profesional',
      shortName: instSettings?.shortName || 'LTP',
      rbd: student.rbd || instSettings?.rbd || '',
      director: instSettings?.directorName || 'Director(a) Establecimiento',
      directorRun: instSettings?.directorRun || '',
      directorEmail: instSettings?.directorEmail || '',
      commune: instSettings?.commune || '',
      region: instSettings?.region || ''
    };

    // 5. Historial de informes previos de este estudiante
    let history: any[] = [];
    try {
      const histRes = await query(`
        SELECT id, report_type, academic_year, evaluation_date, professional_run, professional_name, professional_role, professional_reg, report_data, status, created_at, updated_at
        FROM mineduc_reports
        WHERE REPLACE(REPLACE(student_run, '.', ''), '-', '') = $1
        ORDER BY updated_at DESC, created_at DESC
      `, [cleanRun]);
      history = (histRes.rows || []).map((r: any) => {
        let parsed = {};
        if (r.report_data) {
          try {
            parsed = typeof r.report_data === 'string' ? JSON.parse(r.report_data) : r.report_data;
          } catch (_) {
            parsed = {};
          }
        }
        return { ...r, report_data: parsed };
      });
    } catch (_) {}

    res.json({
      student: {
        ...student,
        birth_date: formatChileDate(student.birth_date),
        raw_birth_date: student.birth_date,
        calculatedAge: ageInfo
      },
      gradesSummary,
      institution,
      staffList,
      history
    });
  } catch (err: any) {
    console.error('Error al obtener contexto de estudiante para MINEDUC:', err);
    res.status(500).json({ error: 'Error al consultar contexto del estudiante.' });
  }
});

// -----------------------------------------------------------------------------
// 3. OBTENER DETALLE DE UN INFORME POR ID (CON DATOS DEL ESTUDIANTE)
// -----------------------------------------------------------------------------
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reportRes = await query(`
      SELECT 
        r.*,
        s.full_name AS student_name,
        s.first_name,
        s.paternal_surname,
        s.maternal_surname,
        s.desc_grado,
        s.letra_curso,
        s.birth_date,
        s.rbd,
        s.guardian_name,
        s.guardian_run,
        s.guardian_phone,
        s.guardian_relation,
        s.profesor_jefe,
        s.profesor_pie
      FROM mineduc_reports r
      LEFT JOIN students s ON s.run = r.student_run
      WHERE r.id = $1
      LIMIT 1
    `, [id]);

    if (!reportRes.rows || reportRes.rows.length === 0) {
      return res.status(404).json({ error: 'Informe MINEDUC no encontrado.' });
    }

    const row = reportRes.rows[0];
    let parsedData = {};
    if (row.report_data) {
      try {
        parsedData = typeof row.report_data === 'string' ? JSON.parse(row.report_data) : row.report_data;
      } catch (_) {
        parsedData = {};
      }
    }

    res.json({
      ...row,
      report_data: parsedData,
      calculatedAge: calculateAge(row.birth_date)
    });
  } catch (err: any) {
    console.error('Error al obtener detalle del informe MINEDUC:', err);
    res.status(500).json({ error: 'Error al consultar el informe.' });
  }
});

// -----------------------------------------------------------------------------
// 4. GUARDAR O ACTUALIZAR INFORME MINEDUC
// -----------------------------------------------------------------------------
router.post('/', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'PIE', 'Profesionales', 'Asistente']), async (req: Request, res: Response) => {
  try {
    const {
      id,
      student_run,
      report_type,
      academic_year,
      evaluation_date,
      professional_run,
      professional_name,
      professional_role,
      professional_reg,
      report_data,
      status
    } = req.body;

    if (!student_run || !report_type) {
      return res.status(400).json({ error: 'RUT del estudiante y Tipo de Informe son obligatorios.' });
    }

    const userRole = (req.user?.role || '').toLowerCase();
    const isAdminOrCoord = userRole === 'admin' || userRole === 'director' || userRole.includes('coordinad');

    const cleanRunDigits = String(student_run).replace(/[^0-9kK]/g, '').toUpperCase();
    const reportYear = academic_year || 2026;

    // Si no viene id explícito, verificar si ya existe un informe para este estudiante, tipo y año para actualizarlo en lugar de duplicar
    let resolvedId = id;
    if (!resolvedId) {
      const existingByStudent = await query(
        `SELECT id FROM mineduc_reports
         WHERE UPPER(REPLACE(REPLACE(student_run, '.', ''), '-', '')) = $1
           AND report_type = $2
           AND academic_year = $3
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1`,
        [cleanRunDigits, report_type, reportYear]
      ).catch(() => ({ rows: [] as any[] }));
      if (existingByStudent.rows && existingByStudent.rows.length > 0) {
        resolvedId = existingByStudent.rows[0].id;
      }
    }

    // Validación de permisos de edición
    if (resolvedId) {
      const existing = await query('SELECT professional_run, professional_name, created_by FROM mineduc_reports WHERE id = $1', [resolvedId]);
      if (existing.rows && existing.rows.length > 0) {
        const rep = existing.rows[0];
        if (!isAdminOrCoord) {
          // Si es profesor de aula regular, no tiene permiso de edición técnica sobre informes del PIE
          if (userRole === 'docente' || userRole === 'profesor') {
            return res.status(403).json({ error: 'Acceso restringido: Los profesores de aula tienen permiso de lectura y no pueden modificar informes técnicos del PIE.' });
          }
          // Si es profesional del PIE, solo puede editar sus propios informes
          const userRunNorm = (req.user?.run || '').replace(/[^0-9kK]/g, '').toUpperCase();
          const repRunNorm = (rep.professional_run || '').replace(/[^0-9kK]/g, '').toUpperCase();
          const isAuthor = !repRunNorm || (userRunNorm && repRunNorm && userRunNorm === repRunNorm) ||
                           (req.user?.name && rep.professional_name && req.user.name.toLowerCase() === rep.professional_name.toLowerCase()) ||
                           (req.user?.name && rep.created_by && req.user.name.toLowerCase() === rep.created_by.toLowerCase());
          if (!isAuthor) {
            return res.status(403).json({ error: 'Acceso restringido: Solo el profesional evaluador autor o la Coordinación PIE pueden modificar este informe.' });
          }
        }
      }
    } else {
      // Para crear informe nuevo: profesores de aula no pueden emitir informes PIE
      if (!isAdminOrCoord && (userRole === 'docente' || userRole === 'profesor')) {
        return res.status(403).json({ error: 'Acceso restringido: La emisión de informes y formularios del PIE corresponde exclusivamente a profesionales especialistas y equipo PIE.' });
      }
    }

    const cleanRun = String(student_run).replace(/\./g, '').trim();
    const cleanId = resolvedId || `REP-${cleanRun.replace(/[^0-9kK]/g, '')}-${Date.now()}`;
    const reportStatus = status || 'Borrador';
    const parsedReportObj = typeof report_data === 'object' && report_data !== null ? { ...report_data, id: cleanId, status: reportStatus } : {};
    const reportDataStr = typeof report_data === 'object' ? JSON.stringify(parsedReportObj) : (report_data || '{}');
    const createdBy = req.user?.name || 'Usuario del Sistema';

    // Insertar o actualizar usando ON DUPLICATE KEY UPDATE / ON CONFLICT
    if (isMysql) {
      await query(`
        INSERT INTO mineduc_reports (
          id, student_run, report_type, academic_year, evaluation_date,
          professional_run, professional_name, professional_role, professional_reg,
          report_data, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON DUPLICATE KEY UPDATE
          report_type = VALUES(report_type),
          academic_year = VALUES(academic_year),
          evaluation_date = VALUES(evaluation_date),
          professional_run = VALUES(professional_run),
          professional_name = VALUES(professional_name),
          professional_role = VALUES(professional_role),
          professional_reg = VALUES(professional_reg),
          report_data = VALUES(report_data),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
      `, [
        cleanId, student_run, report_type, reportYear, evaluation_date || null,
        professional_run || null, professional_name || null, professional_role || null, professional_reg || null,
        reportDataStr, reportStatus, createdBy
      ]);
    } else {
      await query(`
        INSERT INTO mineduc_reports (
          id, student_run, report_type, academic_year, evaluation_date,
          professional_run, professional_name, professional_role, professional_reg,
          report_data, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          report_type = EXCLUDED.report_type,
          academic_year = EXCLUDED.academic_year,
          evaluation_date = EXCLUDED.evaluation_date,
          professional_run = EXCLUDED.professional_run,
          professional_name = EXCLUDED.professional_name,
          professional_role = EXCLUDED.professional_role,
          professional_reg = EXCLUDED.professional_reg,
          report_data = EXCLUDED.report_data,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [
        cleanId, student_run, report_type, reportYear, evaluation_date || null,
        professional_run || null, professional_name || null, professional_role || null, professional_reg || null,
        reportDataStr, reportStatus, createdBy
      ]);
    }

    // Actualizar de forma sincronizada el diagnóstico clínico real en la ficha del estudiante
    const rawDiag = String(parsedReportObj?.diagnostico || parsedReportObj?.sintesis?.diagnostico_actual || parsedReportObj?.sintesis?.diagnostico_ingreso || '').trim();
    const invalidDiags = new Set([
      '', 'S/I', '152', 'SIN REGISTRO', 'NO', 'NINGUNO',
      'INFORME_FAMILIA_SEMESTRAL', 'FUS_MINEDUC', 'SIMCE_NEEP', 'PAEC_PLAN_TEA', 'PSICOPEDAGOGICO_DEC170',
      'INFORME PARA LA FAMILIA (SEMESTRAL PIE)', 'FORMULARIO ÚNICO SÍNTESIS (FUS - MINEDUC)', 'NECESIDADES EDUCATIVAS ESPECIALES'
    ]);
    if (rawDiag && !invalidDiags.has(rawDiag.toUpperCase())) {
      await query(`
        UPDATE students
        SET pie_program = 1, pie_diagnosis = $1
        WHERE UPPER(REPLACE(REPLACE(run, '.', ''), '-', '')) = $2
      `, [rawDiag, cleanRunDigits]).catch(() => {});
    } else if (reportStatus === 'Completado' || reportStatus === 'Firmado') {
      await query(`
        UPDATE students
        SET pie_program = 1
        WHERE UPPER(REPLACE(REPLACE(run, '.', ''), '-', '')) = $1
      `, [cleanRunDigits]).catch(() => {});
    }

    await logAudit(req, 'SAVE_MINEDUC_REPORT', `Informe MINEDUC ${report_type} guardado para estudiante RUT ${student_run} con estado ${reportStatus}.`);

    res.json({
      success: true,
      id: cleanId,
      message: 'Informe MINEDUC guardado exitosamente.'
    });
  } catch (err: any) {
    console.error('Error al guardar informe MINEDUC:', err);
    res.status(500).json({ error: 'Error al guardar el informe MINEDUC.' });
  }
});

// -----------------------------------------------------------------------------
// 5. ELIMINAR INFORME MINEDUC
// -----------------------------------------------------------------------------
router.delete('/:id', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT student_run, report_type FROM mineduc_reports WHERE id = $1', [id]);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: 'Informe no encontrado.' });
    }

    await query('DELETE FROM mineduc_reports WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_MINEDUC_REPORT', `Informe MINEDUC ${existing.rows[0].report_type} (${id}) eliminado para estudiante RUT ${existing.rows[0].student_run}.`);

    res.json({ success: true, message: 'Informe eliminado correctamente.' });
  } catch (err: any) {
    console.error('Error al eliminar informe MINEDUC:', err);
    res.status(500).json({ error: 'Error al eliminar el informe.' });
  }
});

export default router;
