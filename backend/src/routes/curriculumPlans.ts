import { Router, Request, Response } from 'express';
import { query } from '../config/db';
import { authMiddleware, checkRoles, logAudit } from '../middleware/auth';

const router = Router();

// Garantizar columnas para Planificación por Unidad en Supabase PostgreSQL
query(`
  ALTER TABLE annual_curriculum_units 
  ADD COLUMN IF NOT EXISTS class_count INT DEFAULT 8,
  ADD COLUMN IF NOT EXISTS hours_count INT DEFAULT 16,
  ADD COLUMN IF NOT EXISTS unit_goal TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS transversal_goals TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS resources TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS evaluation_type TEXT DEFAULT 'Formativa y Sumativa',
  ADD COLUMN IF NOT EXISTS estimated_date VARCHAR(255) DEFAULT '';
`).catch(() => {});

// Garantizar tabla para Material de Continuidad y Actividades de Reemplazo con IA
query(`
  CREATE TABLE IF NOT EXISTS pedagogical_continuity_activities (
    id VARCHAR(150) PRIMARY KEY,
    academic_year INT DEFAULT 2026,
    annual_plan_id VARCHAR(150),
    unit_name VARCHAR(255),
    course_name VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    substitute_teacher_name VARCHAR(255),
    oa_code VARCHAR(100),
    oa_title TEXT,
    duration_minutes INT DEFAULT 90,
    activity_type VARCHAR(100) DEFAULT 'guia_autonoma',
    title VARCHAR(255) NOT NULL,
    instructions_for_students TEXT,
    instructions_for_substitute TEXT,
    content_summary TEXT,
    activities_json JSONB,
    exit_ticket TEXT,
    answer_key TEXT,
    rubric_criteria TEXT,
    status VARCHAR(50) DEFAULT 'generada',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  ALTER TABLE pedagogical_continuity_activities 
  ADD COLUMN IF NOT EXISTS slides_json JSONB,
  ADD COLUMN IF NOT EXISTS scaffold_json JSONB,
  ADD COLUMN IF NOT EXISTS stretch_json JSONB,
  ADD COLUMN IF NOT EXISTS warm_up_json JSONB;
`).catch((err) => {
  console.warn('Aviso al garantizar tabla pedagogical_continuity_activities:', err.message);
});

// =============================================================================
// 1. CATÁLOGO DE OBJETIVOS DE APRENDIZAJE (OA) MINEDUC
// =============================================================================

// GET /api/curriculum/learning-goals - Buscar y filtrar OAs MINEDUC
router.get('/learning-goals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { grade_level, subject, search, is_prioritized } = req.query;
    let sql = 'SELECT * FROM curriculum_learning_goals WHERE 1=1';
    const params: any[] = [];

    if (grade_level && typeof grade_level === 'string' && grade_level.trim()) {
      const rawGrade = grade_level.trim();
      const baseGradeMatch = rawGrade.match(/\d+°\s*(Básico|Medio)/i);
      const cleanGrade = baseGradeMatch ? baseGradeMatch[0] : rawGrade.replace(/\s+[A-Z]$/i, '').trim();

      params.push(`%${cleanGrade}%`);
      const p1 = params.length;
      params.push(`%${rawGrade}%`);
      const p2 = params.length;
      params.push(rawGrade);
      const p3 = params.length;

      sql += ` AND (grade_level ILIKE $${p1} OR grade_level ILIKE $${p2} OR $${p3} ILIKE '%' || grade_level || '%')`;
    }

    if (subject && typeof subject === 'string' && subject.trim()) {
      const rawSubj = subject.trim();
      const isLenguaje = /lengua|literatura|lenguaje/i.test(rawSubj);
      const isMatematica = /matem/i.test(rawSubj);
      const isCiencias = /ciencia|biolog|fisic|quimic/i.test(rawSubj);
      const isHistoria = /historia|geograf|social/i.test(rawSubj);
      const isIngles = /ingl[eé]s/i.test(rawSubj);
      const isArtes = /arte/i.test(rawSubj);
      const isMusica = /m[uú]sica/i.test(rawSubj);
      const isEdFisica = /f[ií]sica\s+y\s+salud|educaci[oó]n\s+f[ií]sica/i.test(rawSubj);
      const isTecnologia = /tecnolog/i.test(rawSubj);
      const isFilosofia = /filosof/i.test(rawSubj);
      const isCiudadana = /ciudadan/i.test(rawSubj);
      const isParvulos = /p[aá]rvulo|infantil|l[uú]dica/i.test(rawSubj);
      const isMecanica = /mec[aá]nica|torno|soldadura|mantenimiento|montaje|electrotecnia/i.test(rawSubj);

      if (isLenguaje) {
        sql += ` AND (subject ILIKE '%Lengua%' OR subject ILIKE '%Lenguaje%' OR subject ILIKE '%Literatura%')`;
      } else if (isMatematica) {
        sql += ` AND (subject ILIKE '%Matem%')`;
      } else if (isCiencias) {
        sql += ` AND (subject ILIKE '%Ciencia%' OR subject ILIKE '%Biolog%' OR subject ILIKE '%Físic%' OR subject ILIKE '%Fisic%' OR subject ILIKE '%Químic%' OR subject ILIKE '%Quimic%')`;
      } else if (isHistoria) {
        sql += ` AND (subject ILIKE '%Historia%')`;
      } else if (isIngles) {
        sql += ` AND (subject ILIKE '%Inglés%' OR subject ILIKE '%Ingles%' OR subject ILIKE '%Idioma Extranjero%')`;
      } else if (isArtes) {
        sql += ` AND (subject ILIKE '%Arte%')`;
      } else if (isMusica) {
        sql += ` AND (subject ILIKE '%Música%' OR subject ILIKE '%Musica%')`;
      } else if (isEdFisica) {
        sql += ` AND (subject ILIKE '%Física y Salud%' OR subject ILIKE '%Educación Física%')`;
      } else if (isTecnologia) {
        sql += ` AND (subject ILIKE '%Tecnolog%')`;
      } else if (isFilosofia) {
        sql += ` AND (subject ILIKE '%Filosof%')`;
      } else if (isCiudadana) {
        sql += ` AND (subject ILIKE '%Ciudadan%')`;
      } else if (isParvulos) {
        sql += ` AND (subject ILIKE '%Párvulo%' OR subject ILIKE '%Parvulo%')`;
      } else if (isMecanica) {
        sql += ` AND (subject ILIKE '%Mecánica%' OR subject ILIKE '%Soldadura%' OR subject ILIKE '%Industrial%' OR subject ILIKE '%Torno%')`;
      } else {
        params.push(`%${rawSubj}%`);
        const pSubj = params.length;
        sql += ` AND (subject ILIKE $${pSubj} OR $${pSubj} ILIKE '%' || subject || '%')`;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      params.push(`%${search.trim()}%`);
      sql += ` AND (oa_code ILIKE $${params.length} OR oa_title ILIKE $${params.length} OR axis ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    if (is_prioritized !== undefined && is_prioritized !== null && is_prioritized !== '' && is_prioritized !== 'all') {
      const isPri = String(is_prioritized).toLowerCase() === 'true';
      params.push(isPri);
      sql += ` AND is_prioritized = $${params.length}`;
    }

    sql += ' ORDER BY grade_level ASC, oa_code ASC LIMIT 1000';

    const result = await query(sql, params);
    res.json({ success: true, learningGoals: result.rows || [] });
  } catch (err: any) {
    console.error('Error al consultar Objetivos de Aprendizaje:', err);
    res.status(500).json({ error: 'Error al consultar catálogo de Objetivos de Aprendizaje.' });
  }
});

// POST /api/curriculum/learning-goals - Registrar o importar nuevos OAs
router.post('/learning-goals', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { grade_level, subject, oa_code, oa_title, description, axis, is_prioritized = true } = req.body;
    if (!grade_level || !subject || !oa_code || !oa_title) {
      return res.status(400).json({ error: 'Nivel, asignatura, código y descripción del OA son obligatorios.' });
    }

    const id = `OA-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await query(`
      INSERT INTO curriculum_learning_goals (
        id, grade_level, subject, oa_code, oa_title, description, axis, is_prioritized
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, grade_level, subject, oa_code, oa_title, description || oa_title, axis || 'Eje Curricular', Boolean(is_prioritized)]);

    res.json({ success: true, message: 'Objetivo de aprendizaje registrado exitosamente.', id });
  } catch (err: any) {
    console.error('Error al crear OA:', err);
    res.status(500).json({ error: 'Error al registrar Objetivo de Aprendizaje.' });
  }
});

// =============================================================================
// 2. PLANIFICACIÓN ANUAL (ENCABEZADO INSTITUCIONAL Y MATRIZ DE UNIDADES)
// =============================================================================

// GET /api/curriculum/annual-plans - Listar planificaciones anuales
router.get('/annual-plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { course_name, subject_name, teacher_name, academic_year = 2026 } = req.query;
    let sql = 'SELECT * FROM annual_curriculum_plans WHERE academic_year = $1';
    const params: any[] = [parseInt(String(academic_year), 10)];

    if (course_name && typeof course_name === 'string' && course_name.trim()) {
      params.push(`%${course_name.trim()}%`);
      sql += ` AND course_name ILIKE $${params.length}`;
    }

    if (subject_name && typeof subject_name === 'string' && subject_name.trim()) {
      params.push(`%${subject_name.trim()}%`);
      sql += ` AND subject_name ILIKE $${params.length}`;
    }

    if (teacher_name && typeof teacher_name === 'string' && teacher_name.trim()) {
      params.push(`%${teacher_name.trim()}%`);
      sql += ` AND teacher_name ILIKE $${params.length}`;
    }

    sql += ' ORDER BY course_name ASC, subject_name ASC, created_at DESC';

    const plansRes = await query(sql, params);
    const plans = plansRes.rows || [];

    // Cargar unidades asociadas para cada plan
    if (plans.length > 0) {
      const planIds = plans.map(p => p.id);
      const unitsRes = await query(
        `SELECT * FROM annual_curriculum_units WHERE plan_id = ANY($1::varchar[]) ORDER BY sort_order ASC, unit_number ASC`,
        [planIds]
      );
      const unitsByPlan: Record<string, any[]> = {};
      (unitsRes.rows || []).forEach(u => {
        if (!unitsByPlan[u.plan_id]) unitsByPlan[u.plan_id] = [];
        unitsByPlan[u.plan_id].push(u);
      });

      plans.forEach(p => {
        p.units = unitsByPlan[p.id] || [];
      });
    }

    res.json({ success: true, plans });
  } catch (err: any) {
    console.error('Error al listar planificaciones anuales:', err);
    res.status(500).json({ error: 'Error al consultar planificaciones anuales.' });
  }
});

// GET /api/curriculum/annual-plans/:id - Detalle de un plan anual
router.get('/annual-plans/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const planRes = await query('SELECT * FROM annual_curriculum_plans WHERE id = $1', [id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Planificación anual no encontrada.' });
    }

    const plan = planRes.rows[0];
    const unitsRes = await query(
      'SELECT * FROM annual_curriculum_units WHERE plan_id = $1 ORDER BY sort_order ASC, unit_number ASC',
      [id]
    );
    plan.units = unitsRes.rows || [];

    res.json({ success: true, plan });
  } catch (err: any) {
    console.error('Error al consultar planificación anual:', err);
    res.status(500).json({ error: 'Error al obtener planificación anual.' });
  }
});

// POST /api/curriculum/annual-plans - Crear planificación anual con sus unidades
router.post('/annual-plans', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const {
      academic_year = 2026,
      semester = 'PRIMER Y SEGUNDO SEMESTRE',
      course_name,
      subject_name,
      teacher_name,
      teacher_email,
      total_hours = 4,
      weekly_sessions = 1,
      description,
      status = 'Borrador',
      units = []
    } = req.body;

    const effectiveTeacher = teacher_name || (req as any).user?.name;
    if (!course_name || !subject_name || !effectiveTeacher) {
      return res.status(400).json({ error: 'Curso, asignatura y profesor son campos obligatorios.' });
    }

    const planId = `PLAN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userEmail = (req as any).user?.email || teacher_email || '';
    const userName = (req as any).user?.name || effectiveTeacher;

    await query(`
      INSERT INTO annual_curriculum_plans (
        id, academic_year, semester, course_name, subject_name,
        teacher_name, teacher_email, total_hours, weekly_sessions, description, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      planId,
      parseInt(String(academic_year), 10),
      semester,
      course_name,
      subject_name,
      effectiveTeacher,
      userEmail,
      parseInt(String(total_hours || 4), 10),
      parseInt(String(weekly_sessions || 1), 10),
      description || '',
      userName,
      status
    ]);

    // Insertar unidades si vienen en la petición
    if (Array.isArray(units) && units.length > 0) {
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const unitId = `UNIT-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`;
        await query(`
          INSERT INTO annual_curriculum_units (
            id, plan_id, unit_number, unit_name, learning_goals,
            evaluation_instruments, temporality, sort_order,
            class_count, hours_count, unit_goal, transversal_goals, resources, evaluation_type, estimated_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          unitId,
          planId,
          parseInt(String(u.unit_number || i + 1), 10),
          u.unit_name || `Unidad ${i + 1}`,
          u.learning_goals || '',
          u.evaluation_instruments || '',
          u.temporality || '8 Semanas',
          i + 1,
          parseInt(String(u.class_count || 8), 10),
          parseInt(String(u.hours_count || 16), 10),
          u.unit_goal || '',
          u.transversal_goals || '',
          u.resources || '',
          u.evaluation_type || 'Formativa y Sumativa',
          u.estimated_date || ''
        ]);
      }
    }

    await logAudit(
      req,
      'CREATE_ANNUAL_PLAN',
      `Creada Planificación Anual ${academic_year} para ${course_name} - ${subject_name} (${effectiveTeacher}).`
    );

    res.json({ success: true, message: 'Planificación Anual creada exitosamente.', planId });
  } catch (err: any) {
    console.error('Error al crear planificación anual:', err);
    res.status(500).json({ error: 'Error al registrar planificación anual.' });
  }
});

// PUT /api/curriculum/annual-plans/:id - Actualizar planificación anual y reemplazar unidades
router.put('/annual-plans/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      academic_year,
      semester,
      course_name,
      subject_name,
      teacher_name,
      teacher_email,
      total_hours,
      weekly_sessions,
      description,
      status,
      units = []
    } = req.body;

    const check = await query('SELECT * FROM annual_curriculum_plans WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Planificación anual no encontrada.' });
    }

    await query(`
      UPDATE annual_curriculum_plans SET
        academic_year = COALESCE($1, academic_year),
        semester = COALESCE($2, semester),
        course_name = COALESCE($3, course_name),
        subject_name = COALESCE($4, subject_name),
        teacher_name = COALESCE($5, teacher_name),
        teacher_email = COALESCE($6, teacher_email),
        total_hours = COALESCE($7, total_hours),
        weekly_sessions = COALESCE($8, weekly_sessions),
        description = COALESCE($9, description),
        status = COALESCE($10, status),
        updated_at = NOW()
      WHERE id = $11
    `, [
      academic_year ? parseInt(String(academic_year), 10) : null,
      semester,
      course_name,
      subject_name,
      teacher_name,
      teacher_email,
      total_hours ? parseInt(String(total_hours), 10) : null,
      weekly_sessions ? parseInt(String(weekly_sessions), 10) : null,
      description,
      status,
      id
    ]);

    // Si se enviaron unidades, actualizar la matriz de unidades
    if (Array.isArray(units)) {
      await query('DELETE FROM annual_curriculum_units WHERE plan_id = $1', [id]);
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        const unitId = u.id || `UNIT-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`;
        await query(`
          INSERT INTO annual_curriculum_units (
            id, plan_id, unit_number, unit_name, learning_goals,
            evaluation_instruments, temporality, sort_order,
            class_count, hours_count, unit_goal, transversal_goals, resources, evaluation_type, estimated_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          unitId,
          id,
          parseInt(String(u.unit_number || i + 1), 10),
          u.unit_name || `Unidad ${i + 1}`,
          u.learning_goals || '',
          u.evaluation_instruments || '',
          u.temporality || '8 Semanas',
          i + 1,
          parseInt(String(u.class_count || 8), 10),
          parseInt(String(u.hours_count || 16), 10),
          u.unit_goal || '',
          u.transversal_goals || '',
          u.resources || '',
          u.evaluation_type || 'Formativa y Sumativa',
          u.estimated_date || ''
        ]);
      }
    }

    await logAudit(
      req,
      'UPDATE_ANNUAL_PLAN',
      `Actualizada Planificación Anual ${id} (${course_name || check.rows[0].course_name} - ${subject_name || check.rows[0].subject_name}).`
    );

    res.json({ success: true, message: 'Planificación Anual actualizada exitosamente.' });
  } catch (err: any) {
    console.error('Error al actualizar planificación anual:', err);
    res.status(500).json({ error: 'Error al actualizar planificación anual.' });
  }
});

// DELETE /api/curriculum/annual-plans/:id - Eliminar planificación anual y sus clases asociadas
router.delete('/annual-plans/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const planRes = await query('SELECT * FROM annual_curriculum_plans WHERE id = $1', [id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Planificación anual no encontrada.' });
    }

    const plan = planRes.rows[0];
    const userRole = (req as any).user?.role;
    const userName = (req as any).user?.name;

    // Si no es Admin/Director, solo puede eliminar su propio plan
    if (userRole !== 'Admin' && userRole !== 'Director') {
      if (plan.teacher_name !== userName && plan.created_by !== userName) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta planificación.' });
      }
    }

    // Borrado en cascada: clases, unidades y plan anual
    await query('DELETE FROM lesson_plans WHERE annual_plan_id = $1', [id]);
    await query('DELETE FROM annual_curriculum_units WHERE plan_id = $1', [id]);
    await query('DELETE FROM annual_curriculum_plans WHERE id = $1', [id]);

    await logAudit(req, 'DELETE_ANNUAL_PLAN', `Eliminada Planificación Anual ${id} (${plan.course_name} - ${plan.subject_name}).`);
    res.json({ success: true, message: 'Planificación Anual y sus clases fueron eliminadas exitosamente.' });
  } catch (err: any) {
    console.error('Error al eliminar planificación anual:', err);
    res.status(500).json({ error: 'Error al eliminar planificación anual.' });
  }
});

// DELETE /api/curriculum/teacher-plans - Eliminar masivamente todas las planificaciones de un docente (Admin / Director)
router.delete('/teacher-plans', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { teacher_name } = req.body;
    if (!teacher_name || typeof teacher_name !== 'string') {
      return res.status(400).json({ error: 'teacher_name es obligatorio.' });
    }

    // 1. Obtener los IDs de los planes de este docente
    const plansRes = await query('SELECT id FROM annual_curriculum_plans WHERE teacher_name ILIKE $1', [teacher_name]);
    const planIds = plansRes.rows.map(p => p.id);

    if (planIds.length > 0) {
      await query('DELETE FROM lesson_plans WHERE annual_plan_id = ANY($1::varchar[])', [planIds]);
      await query('DELETE FROM annual_curriculum_units WHERE plan_id = ANY($1::varchar[])', [planIds]);
      await query('DELETE FROM annual_curriculum_plans WHERE id = ANY($1::varchar[])', [planIds]);
    }

    await logAudit(
      req,
      'BULK_DELETE_TEACHER_PLANS',
      `Eliminadas todas las planificaciones (${planIds.length} planes) del docente ${teacher_name}.`
    );

    res.json({
      success: true,
      message: `Se eliminaron exitosamente todas las planificaciones (${planIds.length}) del docente ${teacher_name}.`,
      deletedCount: planIds.length
    });
  } catch (err: any) {
    console.error('Error al eliminar planificaciones del docente:', err);
    res.status(500).json({ error: 'Error al eliminar planificaciones del docente.' });
  }
});

// POST /api/curriculum/transfer-plan - Traspasar planificación a docente reemplazante o nuevo titular
router.post('/transfer-plan', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const {
      plan_id,
      new_teacher_name,
      new_teacher_email,
      transfer_mode = 'transfer_ownership', // 'transfer_ownership' | 'set_substitute'
      reason = 'Licencia médica / reemplazo docente'
    } = req.body;

    if (!plan_id || !new_teacher_name) {
      return res.status(400).json({ error: 'plan_id y new_teacher_name son obligatorios.' });
    }

    const planRes = await query('SELECT * FROM annual_curriculum_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Planificación anual no encontrada.' });
    }

    const plan = planRes.rows[0];
    const currentTeacher = plan.teacher_name;

    if (transfer_mode === 'transfer_ownership') {
      // Traspaso total: nuevo titular
      await query(`
        UPDATE annual_curriculum_plans SET
          teacher_name = $1,
          teacher_email = COALESCE($2, teacher_email),
          substitute_teacher_name = NULL,
          description = CASE 
            WHEN description IS NULL OR description = '' THEN $3
            ELSE description || ' | ' || $3
          END,
          updated_at = NOW()
        WHERE id = $4
      `, [
        new_teacher_name,
        new_teacher_email || null,
        `Traspaso pedagógico desde ${currentTeacher} a ${new_teacher_name} (${reason}) el ${new Date().toLocaleDateString('es-CL')}`,
        plan_id
      ]);

      await query(`
        UPDATE lesson_plans SET
          teacher_name = $1,
          substitute_teacher_name = NULL,
          updated_at = NOW()
        WHERE annual_plan_id = $2
      `, [new_teacher_name, plan_id]);
    } else {
      // Asignar reemplazo temporal manteniendo al titular
      await query(`
        UPDATE annual_curriculum_plans SET
          substitute_teacher_name = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [new_teacher_name, plan_id]);

      await query(`
        UPDATE lesson_plans SET
          substitute_teacher_name = $1,
          updated_at = NOW()
        WHERE annual_plan_id = $2
      `, [new_teacher_name, plan_id]);
    }

    await logAudit(
      req,
      'TRANSFER_CURRICULUM_PLAN',
      `Plan ${plan_id} (${plan.course_name} - ${plan.subject_name}) reasignado a ${new_teacher_name}. Modo: ${transfer_mode}. Motivo: ${reason}.`
    );

    res.json({
      success: true,
      message: `Planificación reasignada exitosamente a ${new_teacher_name}.`,
      transferMode: transfer_mode
    });
  } catch (err: any) {
    console.error('Error al traspasar planificación:', err);
    res.status(500).json({ error: 'Error al traspasar planificación curricular.' });
  }
});

// =============================================================================
// 2.5. GESTIÓN Y PLANIFICACIÓN DETALLADA POR UNIDAD
// =============================================================================

// PUT /api/curriculum/units/:id - Actualizar una unidad individualmente con todos sus campos pedagógicos
router.put('/units/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      unit_name,
      unit_number,
      unit_goal,
      class_count,
      hours_count,
      estimated_date,
      learning_goals,
      transversal_goals,
      resources,
      evaluation_type,
      evaluation_instruments,
      temporality
    } = req.body;

    const check = await query('SELECT * FROM annual_curriculum_units WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Unidad de planificación no encontrada.' });
    }

    await query(`
      UPDATE annual_curriculum_units SET
        unit_name = COALESCE($1, unit_name),
        unit_number = COALESCE($2, unit_number),
        unit_goal = COALESCE($3, unit_goal),
        class_count = COALESCE($4, class_count),
        hours_count = COALESCE($5, hours_count),
        estimated_date = COALESCE($6, estimated_date),
        learning_goals = COALESCE($7, learning_goals),
        transversal_goals = COALESCE($8, transversal_goals),
        resources = COALESCE($9, resources),
        evaluation_type = COALESCE($10, evaluation_type),
        evaluation_instruments = COALESCE($11, evaluation_instruments),
        temporality = COALESCE($12, temporality),
        updated_at = NOW()
      WHERE id = $13
    `, [
      unit_name,
      unit_number ? parseInt(String(unit_number), 10) : null,
      unit_goal,
      class_count !== undefined && class_count !== null ? parseInt(String(class_count), 10) : null,
      hours_count !== undefined && hours_count !== null ? parseInt(String(hours_count), 10) : null,
      estimated_date,
      learning_goals,
      transversal_goals,
      resources,
      evaluation_type,
      evaluation_instruments,
      temporality,
      id
    ]);

    res.json({ success: true, message: 'Unidad de aprendizaje actualizada exitosamente.' });
  } catch (err: any) {
    console.error('Error al actualizar unidad:', err);
    res.status(500).json({ error: 'Error al actualizar unidad pedagógica.' });
  }
});

// =============================================================================
// 3. PLANIFICACIÓN CLASE A CLASE (INICIO, DESARROLLO, CIERRE, RECURSOS, DUA)
// =============================================================================

// GET /api/curriculum/lesson-plans - Listar clases planificadas
router.get('/lesson-plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { annual_plan_id, unit_id, course_name, subject_name } = req.query;
    let sql = 'SELECT * FROM lesson_plans WHERE 1=1';
    const params: any[] = [];

    if (annual_plan_id && typeof annual_plan_id === 'string' && annual_plan_id.trim()) {
      params.push(annual_plan_id.trim());
      sql += ` AND annual_plan_id = $${params.length}`;
    }

    if (unit_id && typeof unit_id === 'string' && unit_id.trim()) {
      params.push(unit_id.trim());
      sql += ` AND unit_id = $${params.length}`;
    }

    if (course_name && typeof course_name === 'string' && course_name.trim()) {
      params.push(`%${course_name.trim()}%`);
      sql += ` AND course_name ILIKE $${params.length}`;
    }

    if (subject_name && typeof subject_name === 'string' && subject_name.trim()) {
      params.push(`%${subject_name.trim()}%`);
      sql += ` AND subject_name ILIKE $${params.length}`;
    }

    sql += ' ORDER BY class_number ASC, class_date ASC, created_at ASC';

    const result = await query(sql, params);
    res.json({ success: true, lessonPlans: result.rows || [] });
  } catch (err: any) {
    console.error('Error al listar clases planificadas:', err);
    res.status(500).json({ error: 'Error al obtener planificaciones de clases.' });
  }
});

// POST /api/curriculum/lesson-plans - Crear planificación de clase
router.post('/lesson-plans', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const {
      annual_plan_id,
      unit_id,
      unit_name,
      course_name,
      subject_name,
      teacher_name,
      class_number = 1,
      class_date,
      class_goal,
      status = 'por_realizar',
      oa_codes = '',
      ticket_salida = '',
      moment_start,
      moment_development,
      moment_closing,
      pedagogical_resources,
      evaluation_indicators,
      dua_accommodations,
      homework,
      reflection_notes
    } = req.body;

    if (!course_name || !subject_name || !class_goal) {
      return res.status(400).json({ error: 'Curso, asignatura y objetivo de la clase son obligatorios.' });
    }

    let finalUnitId = unit_id || null;
    let finalUnitName = unit_name || null;

    if ((!finalUnitId || !finalUnitName) && annual_plan_id) {
      try {
        const uRes = await query(
          'SELECT id, unit_name FROM annual_curriculum_units WHERE plan_id = $1 ORDER BY sort_order ASC, unit_number ASC LIMIT 1',
          [annual_plan_id]
        );
        if (uRes.rows.length > 0) {
          finalUnitId = finalUnitId || uRes.rows[0].id;
          finalUnitName = finalUnitName || uRes.rows[0].unit_name;
        }
      } catch (_) {}
    }

    const id = `LESSON-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveTeacher = teacher_name || (req as any).user?.name || 'Docente';

    await query(`
      INSERT INTO lesson_plans (
        id, annual_plan_id, unit_id, unit_name, course_name, subject_name, teacher_name,
        class_number, class_date, class_goal, status, oa_codes, ticket_salida,
        moment_start, moment_development, moment_closing,
        pedagogical_resources, evaluation_indicators, dua_accommodations, homework, reflection_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      id,
      annual_plan_id || null,
      finalUnitId,
      finalUnitName,
      course_name,
      subject_name,
      effectiveTeacher,
      parseInt(String(class_number || 1), 10),
      class_date || null,
      class_goal,
      status || 'por_realizar',
      oa_codes || '',
      ticket_salida || '',
      moment_start || '',
      moment_development || '',
      moment_closing || '',
      pedagogical_resources || '',
      evaluation_indicators || '',
      dua_accommodations || '',
      homework || '',
      reflection_notes || ''
    ]);

    res.json({
      success: true,
      message: 'Planificación de clase guardada exitosamente.',
      id,
      lesson: {
        id,
        annual_plan_id,
        unit_id: finalUnitId,
        unit_name: finalUnitName,
        course_name,
        subject_name,
        teacher_name: effectiveTeacher,
        class_number: parseInt(String(class_number || 1), 10),
        class_date,
        class_goal,
        status: status || 'por_realizar',
        oa_codes: oa_codes || '',
        ticket_salida: ticket_salida || ''
      }
    });
  } catch (err: any) {
    console.error('Error al guardar planificación de clase:', err);
    res.status(500).json({ error: 'Error al registrar planificación de clase.' });
  }
});

// PUT /api/curriculum/lesson-plans/:id - Actualizar planificación de clase
router.put('/lesson-plans/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      unit_id,
      unit_name,
      class_number,
      class_date,
      class_goal,
      status,
      oa_codes,
      ticket_salida,
      moment_start,
      moment_development,
      moment_closing,
      pedagogical_resources,
      evaluation_indicators,
      dua_accommodations,
      homework,
      reflection_notes
    } = req.body;

    await query(`
      UPDATE lesson_plans SET
        unit_id = COALESCE($1, unit_id),
        unit_name = COALESCE($2, unit_name),
        class_number = COALESCE($3, class_number),
        class_date = COALESCE($4, class_date),
        class_goal = COALESCE($5, class_goal),
        status = COALESCE($6, status),
        oa_codes = COALESCE($7, oa_codes),
        ticket_salida = COALESCE($8, ticket_salida),
        moment_start = COALESCE($9, moment_start),
        moment_development = COALESCE($10, moment_development),
        moment_closing = COALESCE($11, moment_closing),
        pedagogical_resources = COALESCE($12, pedagogical_resources),
        evaluation_indicators = COALESCE($13, evaluation_indicators),
        dua_accommodations = COALESCE($14, dua_accommodations),
        homework = COALESCE($15, homework),
        reflection_notes = COALESCE($16, reflection_notes),
        updated_at = NOW()
      WHERE id = $17
    `, [
      unit_id || null,
      unit_name || null,
      class_number ? parseInt(String(class_number), 10) : null,
      class_date || null,
      class_goal,
      status,
      oa_codes,
      ticket_salida,
      moment_start,
      moment_development,
      moment_closing,
      pedagogical_resources,
      evaluation_indicators,
      dua_accommodations,
      homework,
      reflection_notes,
      id
    ]);

    res.json({ success: true, message: 'Planificación de clase actualizada.' });
  } catch (err: any) {
    console.error('Error al actualizar clase:', err);
    res.status(500).json({ error: 'Error al actualizar clase.' });
  }
});

// PATCH /api/curriculum/lesson-plans/:id/status - Cambiar estado rápido de clase (por_realizar / realizada)
router.patch('/lesson-plans/:id/status', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['por_realizar', 'realizada'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser "por_realizar" o "realizada".' });
    }

    const result = await query(
      'UPDATE lesson_plans SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, class_number',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clase no encontrada.' });
    }

    res.json({
      success: true,
      message: `Clase marcada como ${status === 'realizada' ? 'Realizada' : 'Por Realizar'}.`,
      lesson: result.rows[0]
    });
  } catch (err: any) {
    console.error('Error al actualizar estado de clase:', err);
    res.status(500).json({ error: 'Error al cambiar estado de clase.' });
  }
});

// DELETE /api/curriculum/lesson-plans/:id - Eliminar clase
router.delete('/lesson-plans/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Profesor', 'Profesor Jefe', 'Inspector General', 'Jefe UTP', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM lesson_plans WHERE id = $1', [id]);
    res.json({ success: true, message: 'Clase eliminada exitosamente.' });
  } catch (err: any) {
    console.error('Error al eliminar clase:', err);
    res.status(500).json({ error: 'Error al eliminar clase.' });
  }
});

// GET /api/curriculum/coverage-stats - Cobertura curricular oficial en tiempo real
router.get('/coverage-stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { course_name, subject_name } = req.query;

    if (!course_name || !subject_name) {
      return res.status(400).json({ error: 'course_name y subject_name son requeridos.' });
    }

    const cName = String(course_name).trim();
    const sName = String(subject_name).trim();

    // 1. Extraer nivel (ej: "7° Básico A" -> "7° Básico")
    const gradeMatch = cName.match(/\d+°\s*(Básico|Medio)/i);
    const gradeLevel = gradeMatch ? gradeMatch[0] : cName.replace(/\s+[A-Z]$/i, '').trim();

    // 2. OAs oficiales del catálogo MINEDUC con soporte a sinónimos
    const isLenguaje = /lengua|literatura|lenguaje/i.test(sName);
    const isMatematica = /matem/i.test(sName);
    const isCiencias = /ciencia|biolog|fisic|quimic/i.test(sName);
    const isHistoria = /historia|geograf|social/i.test(sName);
    const isIngles = /ingl[eé]s/i.test(sName);
    const isArtes = /arte/i.test(sName);
    const isMusica = /m[uú]sica/i.test(sName);
    const isEdFisica = /f[ií]sica\s+y\s+salud|educaci[oó]n\s+f[ií]sica/i.test(sName);
    const isTecnologia = /tecnolog/i.test(sName);
    const isFilosofia = /filosof/i.test(sName);
    const isCiudadana = /ciudadan/i.test(sName);
    const isParvulos = /p[aá]rvulo|infantil|l[uú]dica/i.test(sName);
    const isMecanica = /mec[aá]nica|torno|soldadura|mantenimiento|montaje|electrotecnia/i.test(sName);

    let subjSql = 'subject ILIKE $2';
    let subjParam = `%${sName}%`;
    let isSpecial = true;

    if (isLenguaje) {
      subjSql = `(subject ILIKE '%Lengua%' OR subject ILIKE '%Lenguaje%' OR subject ILIKE '%Literatura%')`;
    } else if (isMatematica) {
      subjSql = `subject ILIKE '%Matem%'`;
    } else if (isCiencias) {
      subjSql = `(subject ILIKE '%Ciencia%' OR subject ILIKE '%Biolog%' OR subject ILIKE '%Físic%' OR subject ILIKE '%Químic%')`;
    } else if (isHistoria) {
      subjSql = `subject ILIKE '%Historia%'`;
    } else if (isIngles) {
      subjSql = `(subject ILIKE '%Inglés%' OR subject ILIKE '%Ingles%' OR subject ILIKE '%Idioma Extranjero%')`;
    } else if (isArtes) {
      subjSql = `subject ILIKE '%Arte%'`;
    } else if (isMusica) {
      subjSql = `(subject ILIKE '%Música%' OR subject ILIKE '%Musica%')`;
    } else if (isEdFisica) {
      subjSql = `(subject ILIKE '%Física y Salud%' OR subject ILIKE '%Educación Física%')`;
    } else if (isTecnologia) {
      subjSql = `subject ILIKE '%Tecnolog%'`;
    } else if (isFilosofia) {
      subjSql = `subject ILIKE '%Filosof%'`;
    } else if (isCiudadana) {
      subjSql = `subject ILIKE '%Ciudadan%'`;
    } else if (isParvulos) {
      subjSql = `(subject ILIKE '%Párvulo%' OR subject ILIKE '%Parvulo%')`;
    } else if (isMecanica) {
      subjSql = `(subject ILIKE '%Mecánica%' OR subject ILIKE '%Soldadura%' OR subject ILIKE '%Industrial%' OR subject ILIKE '%Torno%')`;
    } else {
      isSpecial = false;
    }

    const officialGoalsRes = isSpecial
      ? await query(`
          SELECT * FROM curriculum_learning_goals 
          WHERE (grade_level ILIKE $1 OR grade_level ILIKE $2 OR $3 ILIKE '%' || grade_level || '%')
            AND ${subjSql}
          ORDER BY oa_code ASC
        `, [`%${gradeLevel}%`, `%${cName}%`, cName])
      : await query(`
          SELECT * FROM curriculum_learning_goals 
          WHERE (grade_level ILIKE $1 OR grade_level ILIKE $2 OR $3 ILIKE '%' || grade_level || '%')
            AND (subject ILIKE $4 OR $4 ILIKE '%' || subject || '%')
          ORDER BY oa_code ASC
        `, [`%${gradeLevel}%`, `%${cName}%`, cName, subjParam]);

    const officialGoals = officialGoalsRes.rows || [];

    // 3. Clases de esta asignatura y curso
    const lessonsRes = await query(`
      SELECT id, class_number, class_date, class_goal, status, oa_codes, ticket_salida
      FROM lesson_plans 
      WHERE course_name ILIKE $1 AND subject_name ILIKE $2
      ORDER BY class_number ASC
    `, [`%${cName}%`, `%${sName}%`]);

    const lessons = lessonsRes.rows || [];
    const plannedClassesCount = lessons.length;
    const completedClasses = lessons.filter(l => l.status === 'realizada');
    const completedClassesCount = completedClasses.length;
    const pendingClassesCount = plannedClassesCount - completedClassesCount;

    // 4. OAs abordados en clases REALIZADAS
    const completedOAs = new Set<string>();
    completedClasses.forEach(l => {
      const raw = `${l.oa_codes || ''} ${l.class_goal || ''}`;
      const matches = raw.match(/OA\s*\d+/gi) || [];
      matches.forEach(m => completedOAs.add(m.toUpperCase().replace(/\s+/, ' ')));
    });

    // 5. OAs planificados en total
    const plannedOAs = new Set<string>();
    lessons.forEach(l => {
      const raw = `${l.oa_codes || ''} ${l.class_goal || ''}`;
      const matches = raw.match(/OA\s*\d+/gi) || [];
      matches.forEach(m => plannedOAs.add(m.toUpperCase().replace(/\s+/, ' ')));
    });

    const totalOfficialOAs = officialGoals.length > 0 ? officialGoals.length : Math.max(plannedOAs.size, 1);
    const coveredOAsCount = completedOAs.size;

    const coveragePercentage = totalOfficialOAs > 0
      ? Math.round((coveredOAsCount / totalOfficialOAs) * 100)
      : 0;

    const executionPercentage = plannedClassesCount > 0
      ? Math.round((completedClassesCount / plannedClassesCount) * 100)
      : 0;

    let coverageLevel: 'optima' | 'media' | 'critica' = 'critica';
    if (coveragePercentage >= 85) coverageLevel = 'optima';
    else if (coveragePercentage >= 60) coverageLevel = 'media';

    res.json({
      success: true,
      stats: {
        totalOfficialOAs,
        coveredOAsCount,
        coveredOAList: Array.from(completedOAs),
        plannedClassesCount,
        completedClassesCount,
        pendingClassesCount,
        coveragePercentage: Math.min(coveragePercentage, 100),
        executionPercentage: Math.min(executionPercentage, 100),
        coverageLevel,
        officialGoals: officialGoals.map(g => ({
          ...g,
          isCompleted: completedOAs.has(g.oa_code.toUpperCase().replace(/\s+/, ' ')),
          isPlanned: plannedOAs.has(g.oa_code.toUpperCase().replace(/\s+/, ' '))
        }))
      }
    });
  } catch (err: any) {
    console.error('Error calculando cobertura curricular:', err);
    res.status(500).json({ error: 'Error al calcular cobertura curricular.' });
  }
});

// =============================================================================
// 4. ASISTENTE PEDAGÓGICO DE INTELIGENCIA ARTIFICIAL (CON APRENDIZAJE Y MEMORIA)
// =============================================================================

interface AiAssistantRequestBody {
  mode: 'suggest_class_activities' | 'suggest_annual_units' | 'suggest_evaluations' | 'suggest_dua' | 'suggest_unit_detail';
  oa_code?: string;
  oa_title?: string;
  grade_level: string;
  subject: string;
  unit_name?: string;
  context?: string;
  class_duration_mins?: number;
}

// POST /api/curriculum/ai-assistant - Generar propuestas pedagógicas didácticas
router.post('/ai-assistant', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      mode = 'suggest_class_activities',
      oa_code = 'OA 1',
      oa_title = '',
      grade_level = '4° Medio',
      subject = 'Matemática',
      unit_name = '',
      context = '',
      class_duration_mins = 90
    } = req.body as AiAssistantRequestBody;

    const userEmail = (req as any).user?.email || '';
    const userName = (req as any).user?.name || 'Docente';

    // 1. Consultar memoria y preferencias del docente
    let teacherMemory: any = null;
    if (userEmail) {
      const memRes = await query(
        'SELECT * FROM teacher_ai_pedagogical_memory WHERE teacher_email = $1',
        [userEmail]
      ).catch(() => ({ rows: [] }));
      if (memRes.rows.length > 0) {
        teacherMemory = memRes.rows[0];
      }
    }

    const preferredStyle = teacherMemory?.preferred_style || 'Equilibrado y Práctico';
    const isConcise = teacherMemory?.concise_mode !== false; // por defecto conciso para agilizar
    const includeDua = teacherMemory?.include_dua !== false;

    // Actualizar contador de interacción en memoria
    if (userEmail) {
      await query(`
        INSERT INTO teacher_ai_pedagogical_memory (
          id, teacher_email, teacher_name, total_interactions, updated_at
        ) VALUES ($1, $2, $3, 1, NOW())
        ON CONFLICT (teacher_email) DO UPDATE SET
          total_interactions = teacher_ai_pedagogical_memory.total_interactions + 1,
          updated_at = NOW()
      `, [`MEM-${Date.now()}`, userEmail, userName]).catch(() => {});
    }

    // 2. Verificar si hay clave Google Gemini en variables de entorno para consulta directa
    const geminiKey = process.env.GEMINI_API_KEY || '';
    if (geminiKey) {
      try {
        const prompt = buildGeminiPrompt({
          mode,
          oa_code,
          oa_title,
          grade_level,
          subject,
          unit_name,
          context,
          class_duration_mins,
          preferredStyle,
          isConcise,
          includeDua
        });

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 1200
              }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = parseGeminiResponse(rawText, mode);
            if (parsed) {
              return res.json({
                success: true,
                source: 'gemini-ai',
                data: parsed,
                memoryContext: {
                  preferredStyle,
                  totalInteractions: (teacherMemory?.total_interactions || 0) + 1
                }
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Fallo en llamada a Gemini API, usando motor pedagógico curricular integrado:', geminiErr);
      }
    }

    // 3. Motor Curricular Pedagógico Inteligente Integrado (Curriculum Engine MINEDUC)
    const engineResponse = generatePedagogicalResponse({
      mode,
      oa_code,
      oa_title,
      grade_level,
      subject,
      unit_name,
      context,
      class_duration_mins,
      preferredStyle,
      isConcise,
      includeDua
    });

    res.json({
      success: true,
      source: 'pedagogical-engine',
      data: engineResponse,
      memoryContext: {
        preferredStyle,
        isConcise,
        totalInteractions: (teacherMemory?.total_interactions || 0) + 1
      }
    });

  } catch (err: any) {
    console.error('Error en asistente IA curricular:', err);
    res.status(500).json({ error: 'Error al generar sugerencias pedagógicas con IA.' });
  }
});

// GET /api/curriculum/ai-preferences - Obtener preferencias de IA del docente
router.get('/ai-preferences', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).user?.email || '';
    if (!userEmail) return res.json({ preferences: null });

    const memRes = await query('SELECT * FROM teacher_ai_pedagogical_memory WHERE teacher_email = $1', [userEmail]);
    res.json({
      preferences: memRes.rows[0] || {
        preferred_style: 'Equilibrado y Práctico',
        concise_mode: true,
        include_dua: true,
        focus_areas: 'Actividades dinámicas y aplicación contextualizada'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener preferencias de IA.' });
  }
});

// POST /api/curriculum/ai-preferences - Guardar preferencias de IA del docente
router.post('/ai-preferences', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).user?.email || '';
    const userName = (req as any).user?.name || '';
    const { preferred_style, concise_mode, include_dua, focus_areas } = req.body;

    if (!userEmail) return res.status(400).json({ error: 'Usuario no identificado.' });

    await query(`
      INSERT INTO teacher_ai_pedagogical_memory (
        id, teacher_email, teacher_name, preferred_style, concise_mode,
        include_dua, focus_areas, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (teacher_email) DO UPDATE SET
        preferred_style = EXCLUDED.preferred_style,
        concise_mode = EXCLUDED.concise_mode,
        include_dua = EXCLUDED.include_dua,
        focus_areas = EXCLUDED.focus_areas,
        updated_at = NOW()
    `, [
      `MEM-${Date.now()}`,
      userEmail,
      userName,
      preferred_style || 'Equilibrado y Práctico',
      Boolean(concise_mode),
      Boolean(include_dua),
      focus_areas || ''
    ]);

    res.json({ success: true, message: 'Preferencias de Inteligencia Artificial actualizadas.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar preferencias de IA.' });
  }
});

// =============================================================================
// FUNCIONES AUXILIARES: PROMPTS Y MOTOR CURRICULAR PEDAGÓGICO
// =============================================================================

function buildGeminiPrompt(opts: any): string {
  const isTp = opts.grade_level.includes('Técnico') || opts.grade_level.includes('Industrial') || opts.subject.includes('Industrial') || opts.subject.includes('Párvulo');

  return `
Actúa como un Asistente Técnico Pedagógico experto en el Curriculum Nacional de Chile (MINEDUC) y marco de la Buena Enseñanza para el Liceo Técnico Profesional Campanario.
Tu tarea es asistir al docente generando propuestas didácticas de alta calidad, claras, realizables y adaptadas al contexto técnico-profesional y científico-humanista chileno.

DATOS DEL CURSO Y ASIGNATURA:
- Curso / Nivel: ${opts.grade_level} ${isTp ? '(Educación Técnico-Profesional)' : ''}
- Asignatura: ${opts.subject}
- Unidad temática: ${opts.unit_name || 'General'}
- Objetivo de Aprendizaje (OA): ${opts.oa_code}: ${opts.oa_title}
- Tiempo de la clase: ${opts.class_duration_mins} minutos
- Estilo pedagógico preferido por el docente: ${opts.preferredStyle} (Modo conciso: ${opts.isConcise ? 'SÍ, directo y sintético' : 'Extendido'})
- Contexto adicional: ${opts.context || 'Establecimiento polivalente con aula de recursos PIE y talleres TP.'}

SOLICITUD: ${opts.mode}
Devuelve la respuesta estrictamente en formato JSON con la siguiente estructura según el modo:

Si el modo es "suggest_class_activities":
{
  "class_goal": "Objetivo de la clase específico, medible y redactado con verbo de acción Bloom",
  "moment_start": "Puntos clave para el Inicio (15 min): motivación conectada con la vida cotidiana/oficio, activación de conocimientos previos y presentación del objetivo.",
  "moment_development": "Actividades del Desarrollo (60 min): modelamiento docente, trabajo práctico/colaborativo de los estudiantes y retroalimentación formativa.",
  "moment_closing": "Cierre (15 min): síntesis, preguntas de metacognición y ticket de salida concreto.",
  "pedagogical_resources": "Materiales didácticos sugeridos (guía, proyector, material concreto, TIC, etc.)",
  "evaluation_indicators": "2 o 3 indicadores de evaluación observables para la clase.",
  "dua_accommodations": "Adecuaciones DUA / PIE prácticas (representación visual, opciones de expresión y apoyo entre pares)."
}

Si el modo es "suggest_annual_units":
{
  "units": [
    {
      "unit_number": 1,
      "unit_name": "Nombre de la unidad",
      "learning_goals": "OA1, OA2...",
      "evaluation_instruments": "Diagnóstico inicial, prueba escrita, rúbrica de proyecto...",
      "temporality": "8 Semanas"
    }
  ]
}

Si el modo es "suggest_unit_detail":
{
  "unit_goal": "Propósito formativo integral y objetivo general de la unidad, vinculado a los aprendizajes clave MINEDUC.",
  "transversal_goals": "Objetivos de Aprendizaje Transversales (OAT MINEDUC): actitudes, valores de responsabilidad, trabajo colaborativo, rigurosidad técnica y ética.",
  "resources": "Recursos didácticos y materiales recomendados (guías de aprendizaje, textos de estudio, TIC, plataformas, instrumental de laboratorio o taller).",
  "evaluation_type": "Diagnóstica, Formativa y Sumativa",
  "evaluation_instruments": "Rúbrica de evaluación analítica, pautas de cotejo de desempeño, prueba sumativa mixta.",
  "class_count": 8,
  "hours_count": 16,
  "estimated_date": "8 Semanas (Estimado)"
}

Responde SOLO el JSON válido, sin delimitadores adicionales innecesarios.
`;
}

function parseGeminiResponse(raw: string, mode: string): any {
  try {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

function generatePedagogicalResponse(opts: any): any {
  const isTp = opts.grade_level.includes('Técnico') || opts.grade_level.includes('Industrial') || opts.subject.includes('Industrial') || opts.subject.includes('Párvulo');
  const oa = opts.oa_title || 'Aplicación práctica y comprensión de conceptos fundamentales.';
  const contextNote = opts.context ? String(opts.context).trim() : '';

  if (opts.mode === 'suggest_annual_units') {
    return {
      units: [
        {
          unit_number: 1,
          unit_name: `Fundamentos y diagnóstico aplicado a ${opts.subject}`,
          learning_goals: `${opts.oa_code}: ${oa.substring(0, 120)}...`,
          evaluation_instruments: 'Evaluación diagnóstica inicial; Guías de trabajo formativo; Rúbrica de desempeño práctico.',
          temporality: '8 Semanas'
        },
        {
          unit_number: 2,
          unit_name: `Desarrollo de competencias y resolución de problemas en ${opts.subject}`,
          learning_goals: `${opts.oa_code}: Modelamiento y aplicación en situaciones contextualizadas.`,
          evaluation_instruments: 'Prueba escrita de aplicación; Evaluación sumativa intermedia; Resolución de casos reales.',
          temporality: '9 Semanas'
        },
        {
          unit_number: 3,
          unit_name: `Profundización, análisis crítico e integración interdisciplinaria`,
          learning_goals: `Integración de OAs del semestre con foco en toma de decisiones y pensamiento crítico.`,
          evaluation_instruments: 'Proyecto colaborativo; Informe técnico o portafolio de evidencias; Coevaluación.',
          temporality: '9 Semanas'
        },
        {
          unit_number: 4,
          unit_name: `Síntesis anual y transferencia a contextos reales ${isTp ? 'laborales / TP' : 'ciudadanos'}`,
          learning_goals: `Evaluación global de aprendizajes y consolidación de competencias para el nivel.`,
          evaluation_instruments: 'Evaluación sumativa de síntesis; Presentación oral / Defensa de producto o maqueta.',
          temporality: '8 Semanas'
        }
      ]
    };
  }

  if (opts.mode === 'suggest_dua') {
    return {
      dua_accommodations: `• Múltiples formas de representación: Presentar la información mediante organizadores gráficos, esquemas visuales y ejemplos de la vida diaria o del taller${contextNote ? ` (orientado a: ${contextNote})` : ''}.
• Múltiples formas de acción y expresión: Permitir que los estudiantes demuestren su aprendizaje a través de respuestas orales, resolución práctica en pizarra o fichas guiadas.
• Múltiples formas de implicación: Fomentar el trabajo en parejas heterogéneas con apoyo del profesional PIE y asignación de roles colaborativos claros.`
    };
  }

  if (opts.mode === 'suggest_evaluations') {
    return {
      evaluation_instruments: 'Diagnóstico inicial formativo (5 preguntas clave); Registro de observación durante el trabajo práctico; Prueba escrita mixta con resolución de problemas contextualizados; Pauta de cotejo para el cuaderno de aula.'
    };
  }

  if (opts.mode === 'suggest_unit_detail') {
    const isTp = opts.grade_level.includes('Técnico') || opts.grade_level.includes('Industrial') || opts.subject.includes('Industrial') || opts.subject.includes('Párvulo');
    const uName = opts.unit_name || 'la Unidad';

    return {
      unit_goal: `Desarrollar y consolidar aprendizajes fundamentales en ${opts.subject} para ${opts.grade_level}, potenciando la capacidad de análisis, resolución de problemas y aplicación práctica contextualizada a través de ${uName}.`,
      transversal_goals: `• OAT Dimensión Cognitiva: Desarrollar el pensamiento reflexivo y metacognitivo aplicando estrategias sistemáticas de indagación y resolución de problemas.
• OAT Dimensión Trabajo y Proactividad: Demostrar rigor, puntualidad y perseverancia en el desarrollo de actividades escolares y técnicas individuales y grupales.
• OAT Dimensión Afectiva y Social: Trabajar colaborativamente, respetando la diversidad de opiniones y cuidando el entorno de aprendizaje${isTp ? ' y las normas de seguridad en taller' : ''}.`,
      resources: `• Guías de aprendizaje y aplicación práctica elaboradas por el docente.
• Textos de estudio y lecturas MINEDUC complementarias.
• Proyector multimedia, presentaciones interactivas y recursos digitales en red.
• Material concreto e instrumental pedagógico especializado según requerimientos del aula${isTp ? ' y herramientas técnicas del taller' : ''}.`,
      evaluation_type: 'Diagnóstica, Formativa y Sumativa',
      evaluation_instruments: 'Evaluación diagnóstica inicial; Guías de avance formativo con retroalimentación inmediata; Rúbrica analítica de desempeño para la actividad central; Prueba sumativa de unidad con situaciones problemáticas contextualizadas.',
      class_count: 8,
      hours_count: 16,
      estimated_date: '8 Semanas (Estimado)'
    };
  }

  // Modo por defecto: suggest_class_activities (Inicio, Desarrollo, Cierre)
  const isMath = opts.subject.toLowerCase().includes('matemát') || opts.subject.toLowerCase().includes('financ');
  const isParvulo = opts.subject.toLowerCase().includes('párvulo') || opts.grade_level.toLowerCase().includes('párvulo');
  const isMecanica = opts.subject.toLowerCase().includes('mecánic') || opts.grade_level.toLowerCase().includes('industrial');

  let goal = contextNote
    ? `Aplicar los principios de ${opts.subject} mediante ${contextNote}, resolviendo situaciones vinculadas a ${opts.oa_code}.`
    : `Aplicar los principios de ${opts.subject} para resolver situaciones prácticas vinculadas a ${opts.oa_code}.`;

  let inicio = `1. Saludo y ambientación: Presentar en la pizarra el objetivo de la clase y su relevancia cotidiana.
2. Activación de conocimientos previos: Preguntas dirigidas sobre la clase anterior mediante lluvia de ideas breve (5 min).
3. Desafío motivacional inicial: Presentar un caso o problema detonante real${contextNote ? ` enfocado en ${contextNote}` : ''} que requiera aplicar el tema del día.`;

  let desarrollo = contextNote
    ? `1. Modelamiento docente (20 min): Demostración guiada del docente vinculada a "${contextNote}", explicando el procedimiento paso a paso en pizarra o proyector.
2. Trabajo colaborativo práctico (30 min): Los estudiantes se organizan en parejas o equipos para desarrollar la actividad de "${contextNote}", aplicando los conceptos de ${opts.oa_code} con monitoreo docente.
3. Socialización y corrección grupal (10 min): Un equipo expone su procedimiento o producto; se contrastan distintos caminos de resolución y se aclaran dudas.`
    : `1. Modelamiento docente (20 min): Demostración paso a paso del procedimiento o concepto clave, resolviendo un ejemplo guiado en pizarra y aclarando dudas frecuentes.
2. Trabajo colaborativo práctico (30 min): Los estudiantes resuelven en parejas una guía de aplicación práctica o ejercicio de taller con monitoreo y retroalimentación docente en puesto.
3. Socialización y corrección grupal (10 min): Un equipo expone su procedimiento; se contrastan distintos caminos de resolución.`;

  let cierre = `1. Síntesis guiada: El docente recapitula los 3 aprendizajes esenciales de la sesión junto con los estudiantes.
2. Preguntas de metacognición: "¿Qué paso resultó más desafiante hoy${contextNote ? ` durante ${contextNote}` : ''} y cómo logramos resolverlo?".
3. Ticket de salida: Cada estudiante responde un ejercicio breve de 2 minutos para verificar el logro del objetivo antes de retirarse.`;

  let recursos = contextNote
    ? `Materiales para "${contextNote}", guía de aprendizaje impresa, proyector multimedia, pizarra, plumones y cuaderno de la asignatura.`
    : `Guía de aprendizaje impresa, proyector multimedia, pizarra, plumones de colores y cuaderno de la asignatura.`;

  let indicadores = `• Identifica correctamente los conceptos clave del ${opts.oa_code}.
• Aplica procedimientos de resolución de forma ordenada y autónoma${contextNote ? ` en ${contextNote}` : ''}.
• Justifica sus respuestas utilizando vocabulario técnico de la asignatura.`;

  let dua = `• Proporcionar apoyos visuales y fichas con pasos resumidos para estudiantes que lo requieran.
• Permitir apoyo mutuo entre pares y supervisión prioritaria del equipo de co-docencia / PIE en las actividades prácticas.`;

  if (isMath) {
    goal = contextNote
      ? `Analizar y resolver problemas aplicando modelos matemáticos y cálculo guiado en torno a ${opts.oa_code} (${contextNote}).`
      : `Analizar y resolver problemas aplicando modelos matemáticos y cálculo guiado en torno a ${opts.oa_code}.`;
    inicio = `1. Pregunta activadora: Mostrar un gráfico o caso económico real${contextNote ? ` sobre ${contextNote}` : ''} y preguntar: "¿Cómo influyen estos datos en nuestro resultado?".
2. Conexión de conceptos previos: Recordar porcentaje, fórmulas o procedimientos previos (8 min).
3. Presentación del objetivo y criterio de éxito de la clase.`;
    desarrollo = `1. Modelamiento matemático: Explicación de la fórmula o modelo con un caso práctico resuelto en conjunto.
2. Taller de ejercitación graduada: Los estudiantes avanzan desde ejercicios básicos de comprensión hasta problemas contextualizados${contextNote ? ` basados en ${contextNote}` : ''}.
3. Retroalimentación en tiempo real: Revisión formativa en la pizarra destacando los errores conceptuales más comunes para corregirlos positivamente.`;
    recursos = `Calculadora, guía de ejercicios de matemática contextualizada, proyector y tabla de fórmulas de apoyo.`;
  } else if (isParvulo) {
    goal = `Diseñar y planificar experiencias lúdicas pertinentes a las bases curriculares de educación parvularia según ${opts.oa_code}${contextNote ? ` con enfoque en ${contextNote}` : ''}.`;
    inicio = `1. Dinámica de inicio: Observación de un recurso didáctico infantil y debate sobre la edad apropiada para su uso.
2. Activación: Repaso de las etapas del desarrollo psicomotor según las Bases Curriculares de Educación Parvularia.`;
    desarrollo = `1. Taller de diseño pedagógico: En grupos de trabajo, las estudiantes elaboran una micro-planificación con inicio, desarrollo y cierre${contextNote ? ` centrada en ${contextNote}` : ''}.
2. Simulación de aula: Presentación breve de la actividad y análisis de seguridad, pertinencia y estimulación del material.`;
    recursos = `Bases Curriculares de Educación Parvularia MINEDUC, fichas de planificación técnica, materiales de manualidades y cartulinas.`;
  } else if (isMecanica) {
    goal = `Identificar normas de seguridad, parámetros de corte y secuencias de mecanizado según especificaciones técnicas (${opts.oa_code})${contextNote ? ` aplicados a ${contextNote}` : ''}.`;
    inicio = `1. Charla de 5 minutos sobre seguridad y Elementos de Protección Personal (EPP) en el taller.
2. Lectura e interpretación del plano técnico de la pieza a fabricar.`;
    desarrollo = `1. Demostración en máquina herramienta: Montaje seguro de la pieza y centrado de la herramienta de corte.
2. Operación guiada de mecanizado: Ejecución de operaciones con supervisión directa y control dimensional con pie de metro / micrómetro${contextNote ? ` en ${contextNote}` : ''}.`;
    recursos = `Torno convencional / fresadora, plano técnico normalizado, instrumentos de metrología (calibre pie de metro) y EPP.`;
  }

  let ticket = `1. Pregunta rápida de síntesis (2 min): Explica con tus propias palabras o resuelve brevemente el ejercicio clave del día (${opts.oa_code})${contextNote ? ` realizado en ${contextNote}` : ''}.
2. Metacognición: ¿Qué paso del procedimiento te pareció más claro y en cuál requieres mayor práctica?`;

  if (opts.mode === 'suggest_goal') {
    return { class_goal: goal };
  }
  if (opts.mode === 'suggest_moments') {
    return { moment_start: inicio, moment_development: desarrollo, moment_closing: cierre };
  }
  if (opts.mode === 'suggest_ticket') {
    return { ticket_salida: ticket };
  }
  if (opts.mode === 'suggest_indicators') {
    return { evaluation_indicators: indicadores, ticket_salida: ticket };
  }

  return {
    class_goal: goal,
    moment_start: inicio,
    moment_development: desarrollo,
    moment_closing: cierre,
    ticket_salida: ticket,
    pedagogical_resources: recursos,
    evaluation_indicators: indicadores,
    dua_accommodations: dua
  };
}

// =============================================================================
// 6. MÓDULO DE CONTINUIDAD PEDAGÓGICA Y ACTIVIDADES DE REEMPLAZO CON IA
// =============================================================================

// GET /api/curriculum/continuity-context - Detectar contexto curricular en tiempo real
router.get('/continuity-context', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { course_name, subject_name, teacher_name } = req.query;
    if (!course_name || !subject_name) {
      return res.status(400).json({ error: 'course_name y subject_name son requeridos.' });
    }

    const cName = String(course_name).trim();
    const sName = String(subject_name).trim();

    // 1. Buscar plan anual vigente
    let planSql = 'SELECT * FROM annual_curriculum_plans WHERE course_name ILIKE $1 AND subject_name ILIKE $2';
    const planParams: any[] = [`%${cName}%`, `%${sName}%`];

    if (teacher_name && String(teacher_name).trim()) {
      planParams.push(`%${String(teacher_name).trim()}%`);
      planSql += ` AND (teacher_name ILIKE $${planParams.length} OR substitute_teacher_name ILIKE $${planParams.length})`;
    }
    planSql += ' ORDER BY created_at DESC LIMIT 1';

    const planRes = await query(planSql, planParams);
    const annualPlan = planRes.rows[0] || null;

    let units: any[] = [];
    if (annualPlan) {
      const unitsRes = await query(
        'SELECT * FROM annual_curriculum_units WHERE plan_id = $1 ORDER BY unit_number ASC',
        [annualPlan.id]
      );
      units = unitsRes.rows || [];
    }

    // 2. Buscar clases planificadas
    const lessonsRes = await query(`
      SELECT id, class_number, class_date, class_goal, status, oa_codes, unit_name, moment_start, moment_development, pedagogical_resources
      FROM lesson_plans
      WHERE course_name ILIKE $1 AND subject_name ILIKE $2
      ORDER BY class_number ASC, class_date ASC
    `, [`%${cName}%`, `%${sName}%`]);
    const lessons = lessonsRes.rows || [];

    const completedLessons = lessons.filter(l => l.status === 'realizada');
    const pendingLessons = lessons.filter(l => l.status !== 'realizada');

    const lastLesson = completedLessons.length > 0 
      ? completedLessons[completedLessons.length - 1] 
      : (lessons.length > 0 ? lessons[0] : null);

    const nextLesson = pendingLessons.length > 0 
      ? pendingLessons[0] 
      : (completedLessons.length > 0 ? completedLessons[completedLessons.length - 1] : null);

    // Deducir unidad sugerida
    let suggestedUnit = nextLesson?.unit_name || lastLesson?.unit_name || '';
    if (!suggestedUnit && units.length > 0) {
      suggestedUnit = units[0].unit_name;
    }

    // Deducir OA sugerido
    let suggestedOa = nextLesson?.oa_codes || lastLesson?.oa_codes || '';
    if (!suggestedOa && units.length > 0) {
      suggestedOa = units[0].learning_goals;
    }

    // Deducir resumen del último tema tratado
    let lastCoveredSummary = '';
    if (lastLesson) {
      lastCoveredSummary = `Clase #${lastLesson.class_number}: ${lastLesson.class_goal || 'Sin objetivo registrado'}. ${lastLesson.oa_codes ? `(OA: ${lastLesson.oa_codes})` : ''}`;
    }

    res.json({
      success: true,
      annualPlan,
      units,
      lastLesson,
      nextLesson,
      suggestedUnit,
      suggestedOa,
      lastCoveredSummary,
      recentLessons: lessons.slice(-6)
    });
  } catch (err: any) {
    console.error('Error al obtener contexto de continuidad:', err);
    res.status(500).json({ error: 'Error al obtener contexto pedagógico de continuidad.' });
  }
});

// POST /api/curriculum/generate-continuity-activity - Generar material con Inteligencia Artificial
router.post('/generate-continuity-activity', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      course_name,
      subject_name,
      teacher_name,
      substitute_teacher_name,
      annual_plan_id,
      unit_name,
      oa_code,
      oa_title,
      duration_minutes = 90,
      activity_type = 'guia_autonoma',
      last_covered_topics,
      additional_instructions
    } = req.body;

    if (!course_name || !subject_name) {
      return res.status(400).json({ error: 'Curso y asignatura son requeridos para generar el material.' });
    }

    const payload = {
      course_name: String(course_name).trim(),
      subject_name: String(subject_name).trim(),
      teacher_name: String(teacher_name || 'Docente Titular').trim(),
      substitute_teacher_name: String(substitute_teacher_name || 'Docente de Reemplazo / Apoyo').trim(),
      annual_plan_id: annual_plan_id || null,
      unit_name: String(unit_name || 'Unidad de Aprendizaje').trim(),
      oa_code: String(oa_code || 'OA Priorizado').trim(),
      oa_title: String(oa_title || 'Aplicación contextualizada y resolución de actividades prácticas').trim(),
      duration_minutes: parseInt(String(duration_minutes), 10) || 90,
      activity_type: activity_type || 'guia_autonoma',
      last_covered_topics: String(last_covered_topics || '').trim(),
      additional_instructions: String(additional_instructions || '').trim()
    };

    // 1. Intentar con Google Gemini API si está configurada la llave
    const geminiKey = process.env.GEMINI_API_KEY || '';
    if (geminiKey) {
      try {
        const prompt = `
Actúa como un Diseñador Curricular y Asesor Técnico Pedagógico del Liceo Técnico Profesional Campanario (Chile).
Crea una GUÍA DE TRABAJO AUTÓNOMO Y CONTINUIDAD PEDAGÓGICA lista para aplicar en el aula debido a la ausencia imprevista o licencia del profesor titular.
La guía debe permitir que los estudiantes sigan avanzando sin perder tiempo pedagógico, guiados por un docente de reemplazo o asistente de aula.

DATOS INSTITUCIONALES Y CURRICULARES:
- Establecimiento: Liceo Técnico Profesional Campanario
- Curso / Nivel: ${payload.course_name}
- Asignatura o Módulo: ${payload.subject_name}
- Docente Titular ausente: ${payload.teacher_name}
- Docente de Reemplazo: ${payload.substitute_teacher_name}
- Unidad Temática: ${payload.unit_name}
- Objetivo de Aprendizaje (OA): ${payload.oa_code}: ${payload.oa_title}
- Duración estimada: ${payload.duration_minutes} minutos (${Math.round(payload.duration_minutes / 45)} horas pedagógicas)
- Tipo de material solicitado: ${payload.activity_type}
- Lo último enseñado por el profesor titular (Continuidad): ${payload.last_covered_topics || 'Continuidad regular del programa'}
- Instrucciones adicionales del solicitante: ${payload.additional_instructions || 'Ninguna'}

Devuelve un JSON estrictamente estructurado sin texto adicional:
{
  "title": "Título formal y atractivo de la Guía de Aprendizaje",
  "pedagogical_context": "Breve párrafo explicando cómo esta guía da continuidad al último tema enseñado por el profesor titular.",
  "instructions_for_students": "Instrucciones claras y directas para el estudiante (lectura atenta, desarrollo ordenado, tiempo disponible, trabajo individual/duplas).",
  "instructions_for_substitute": "Pauta e instrucciones paso a paso para el Docente de Reemplazo (minuto a minuto: cómo iniciar, monitoreo en sala, resolución de dudas y recolección final).",
  "content_summary": "Marco teórico conceptual sintético (1/2 página con explicaciones accesibles, definiciones clave y 1 ejemplo resuelto paso a paso).",
  "activities": [
    {
      "number": 1,
      "title": "Actividad 1: Activación y Comprensión Conceptual",
      "points": 6,
      "description": "Instrucciones específicas de este ítem",
      "questions": [
        "1. Pregunta o ejercicio 1...",
        "2. Pregunta o ejercicio 2...",
        "3. Pregunta o ejercicio 3..."
      ]
    },
    {
      "number": 2,
      "title": "Actividad 2: Aplicación Práctica / Resolución de Problemas",
      "points": 10,
      "description": "Instrucciones específicas de resolución o taller",
      "questions": [
        "1. Situación problemática o ejercicio práctico 1...",
        "2. Situación problemática o ejercicio práctico 2..."
      ]
    },
    {
      "number": 3,
      "title": "Actividad 3: Desafío de Pensamiento Crítico / Aplicación en la Vida Cotidiana o Taller TP",
      "points": 8,
      "description": "Desafío contextualizado de mayor profundidad",
      "questions": [
        "1. Caso o pregunta reflexiva..."
      ]
    }
  ],
  "exit_ticket": "Ticket de Salida (3 minutos antes del timbre): 2 preguntas breves de metacognición o síntesis para verificar el logro del objetivo.",
  "answer_key": "Solucionario detallado para el Docente de Reemplazo con las respuestas esperadas ítem por ítem y desglose de puntajes.",
  "rubric_criteria": "Criterios formativos de evaluación con escala de logro (Logrado: 20-24 pts, Medianamente Logrado: 14-19 pts, Por Lograr: <14 pts)."
}
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 2500,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = parseGeminiResponse(rawText, 'continuity_activity');
            if (parsed && parsed.title && parsed.activities) {
              return res.json({
                success: true,
                source: 'gemini-ai',
                data: parsed
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Fallo en Gemini para actividad de continuidad, usando motor pedagógico curricular integrado:', geminiErr);
      }
    }

    // 2. Motor Curricular Pedagógico Integrado (LTP Campanario - Curriculum Engine)
    const engineData = generatePedagogicalContinuityActivity(payload);

    res.json({
      success: true,
      source: 'pedagogical-engine',
      data: engineData
    });
  } catch (err: any) {
    console.error('Error al generar actividad de continuidad:', err);
    res.status(500).json({ error: 'Error al generar material de continuidad pedagógica.' });
  }
});

// GET /api/curriculum/continuity-activities - Listar actividades de reemplazo guardadas
router.get('/continuity-activities', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { course_name, subject_name, teacher_name, academic_year = 2026 } = req.query;
    let sql = 'SELECT * FROM pedagogical_continuity_activities WHERE academic_year = $1';
    const params: any[] = [parseInt(String(academic_year), 10)];

    if (course_name && typeof course_name === 'string' && course_name.trim()) {
      params.push(`%${course_name.trim()}%`);
      sql += ` AND course_name ILIKE $${params.length}`;
    }

    if (subject_name && typeof subject_name === 'string' && subject_name.trim()) {
      params.push(`%${subject_name.trim()}%`);
      sql += ` AND subject_name ILIKE $${params.length}`;
    }

    if (teacher_name && typeof teacher_name === 'string' && teacher_name.trim()) {
      params.push(`%${teacher_name.trim()}%`);
      sql += ` AND (teacher_name ILIKE $${params.length} OR substitute_teacher_name ILIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC LIMIT 200';

    const result = await query(sql, params);
    res.json({ success: true, activities: result.rows || [] });
  } catch (err: any) {
    console.error('Error al listar actividades de continuidad:', err);
    res.status(500).json({ error: 'Error al obtener actividades de continuidad pedagógica.' });
  }
});

// POST /api/curriculum/continuity-activities - Guardar o actualizar actividad de reemplazo
router.post('/continuity-activities', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      id,
      academic_year = 2026,
      annual_plan_id,
      unit_name,
      course_name,
      subject_name,
      teacher_name,
      substitute_teacher_name,
      oa_code,
      oa_title,
      duration_minutes = 90,
      activity_type = 'guia_autonoma',
      title,
      instructions_for_students,
      instructions_for_substitute,
      content_summary,
      activities_json,
      exit_ticket,
      answer_key,
      rubric_criteria,
      status = 'generada'
    } = req.body;

    if (!course_name || !subject_name || !title) {
      return res.status(400).json({ error: 'Curso, asignatura y título de la actividad son obligatorios.' });
    }

    const userEmail = (req as any).user?.email || (req as any).user?.name || '';
    const resolvedId = id || `ACT-CONT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await query(`
      INSERT INTO pedagogical_continuity_activities (
        id, academic_year, annual_plan_id, unit_name, course_name, subject_name,
        teacher_name, substitute_teacher_name, oa_code, oa_title, duration_minutes,
        activity_type, title, instructions_for_students, instructions_for_substitute,
        content_summary, activities_json, exit_ticket, answer_key, rubric_criteria,
        status, created_by, updated_at, slides_json, scaffold_json, stretch_json, warm_up_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(),
        $23, $24, $25, $26
      )
      ON CONFLICT (id) DO UPDATE SET
        annual_plan_id = EXCLUDED.annual_plan_id,
        unit_name = EXCLUDED.unit_name,
        course_name = EXCLUDED.course_name,
        subject_name = EXCLUDED.subject_name,
        teacher_name = EXCLUDED.teacher_name,
        substitute_teacher_name = EXCLUDED.substitute_teacher_name,
        oa_code = EXCLUDED.oa_code,
        oa_title = EXCLUDED.oa_title,
        duration_minutes = EXCLUDED.duration_minutes,
        activity_type = EXCLUDED.activity_type,
        title = EXCLUDED.title,
        instructions_for_students = EXCLUDED.instructions_for_students,
        instructions_for_substitute = EXCLUDED.instructions_for_substitute,
        content_summary = EXCLUDED.content_summary,
        activities_json = EXCLUDED.activities_json,
        exit_ticket = EXCLUDED.exit_ticket,
        answer_key = EXCLUDED.answer_key,
        rubric_criteria = EXCLUDED.rubric_criteria,
        status = EXCLUDED.status,
        slides_json = COALESCE(EXCLUDED.slides_json, pedagogical_continuity_activities.slides_json),
        scaffold_json = COALESCE(EXCLUDED.scaffold_json, pedagogical_continuity_activities.scaffold_json),
        stretch_json = COALESCE(EXCLUDED.stretch_json, pedagogical_continuity_activities.stretch_json),
        warm_up_json = COALESCE(EXCLUDED.warm_up_json, pedagogical_continuity_activities.warm_up_json),
        updated_at = NOW()
    `, [
      resolvedId,
      parseInt(String(academic_year), 10) || 2026,
      annual_plan_id || null,
      unit_name || '',
      course_name,
      subject_name,
      teacher_name || '',
      substitute_teacher_name || null,
      oa_code || '',
      oa_title || '',
      parseInt(String(duration_minutes), 10) || 90,
      activity_type,
      title,
      instructions_for_students || '',
      instructions_for_substitute || '',
      content_summary || '',
      JSON.stringify(activities_json || []),
      exit_ticket || '',
      answer_key || '',
      rubric_criteria || '',
      status,
      userEmail,
      JSON.stringify(req.body.slides_json || []),
      JSON.stringify(req.body.scaffold_json || {}),
      JSON.stringify(req.body.stretch_json || {}),
      JSON.stringify(req.body.warm_up_json || {})
    ]);

    await logAudit(
      req,
      'SAVE_CONTINUITY_ACTIVITY',
      `Actividad de Continuidad Pedagógica guardada: "${title}" para curso ${course_name} (${subject_name}).`
    );

    res.json({ success: true, message: 'Actividad de continuidad guardada exitosamente.', id: resolvedId });
  } catch (err: any) {
    console.error('Error al guardar actividad de continuidad:', err);
    res.status(500).json({ error: 'Error al guardar actividad de continuidad pedagógica.' });
  }
});

// POST /api/curriculum/refine-activity - Asistente Co-Piloto estilo Chalkie para refinar actividades con IA
router.post('/refine-activity', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentActivity, prompt } = req.body;
    if (!currentActivity || !prompt) {
      return res.status(400).json({ error: 'Actividad e instrucción de refinamiento son requeridas.' });
    }

    const geminiKey = process.env.GEMINI_API_KEY || '';
    if (geminiKey) {
      try {
        const fullPrompt = `
Actúa como un Diseñador Curricular experto de Chalkie AI adaptado al Liceo Técnico Profesional Campanario.
El docente solicita modificar o enriquecer la siguiente actividad pedagógica:

ACTIVIDAD ACTUAL:
${JSON.stringify(currentActivity, null, 2)}

INSTRUCCIÓN ESPECÍFICA DEL DOCENTE PARA EL REFINAMIENTO:
"${prompt}"

REGLAS DE REFINAMIENTO:
- Modifica los campos necesarios respetando exactamente la instrucción dada.
- Devuelve la misma estructura JSON completa:
{
  "title": "string",
  "pedagogical_context": "string",
  "instructions_for_students": "string",
  "instructions_for_substitute": "string",
  "content_summary": "string",
  "activities": [ ... ],
  "exit_ticket": "string",
  "answer_key": "string",
  "rubric_criteria": "string",
  "slides": [
    {
      "slide_number": 1,
      "title": "Título de la diapositiva",
      "subtitle": "Subtítulo explicativo",
      "bullets": ["Punto 1", "Punto 2", "Punto 3"],
      "teacher_prompt": "Instrucción o pregunta para proyectar",
      "time_estimate": "10 min"
    }
  ],
  "scaffold": {
    "title": "Versión de Apoyo DUA / PIE",
    "hints": ["Pista 1...", "Pista 2..."],
    "simplified_questions": ["Pregunta guiada 1...", "Pregunta guiada 2..."]
  },
  "stretch": {
    "title": "Versión Desafío y Extensión",
    "challenge_questions": ["Pregunta de pensamiento crítico y análisis avanzado..."]
  }
}
Devuelve estrictamente el JSON sin texto introductorio ni explicaciones adicionales.
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 3000,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = parseGeminiResponse(rawText, 'refined_activity');
            if (parsed && parsed.title) {
              return res.json({
                success: true,
                source: 'gemini-ai',
                activity: {
                  ...currentActivity,
                  ...parsed
                }
              });
            }
          }
        }
      } catch (gemErr) {
        console.warn('Fallo en Gemini al refinar actividad, aplicando motor pedagógico:', gemErr);
      }
    }

    // Fallback motor pedagógico: aplicar modificaciones según prompt
    const updated = { ...currentActivity };
    const pLower = prompt.toLowerCase();

    if (pLower.includes('dua') || pLower.includes('pie') || pLower.includes('facil') || pLower.includes('simple') || pLower.includes('apoyo')) {
      updated.instructions_for_students += '\n\n• Adecuación DUA: Utiliza las pistas destacadas y apóyate en tu compañero asignado.';
      if (updated.activities_json && Array.isArray(updated.activities_json)) {
        updated.activities_json = updated.activities_json.map((act: any) => ({
          ...act,
          description: `${act.description} (Pista de apoyo: Subraya las palabras clave y revisa el ejemplo antes de responder).`
        }));
      }
    } else if (pLower.includes('taller') || pLower.includes('practic') || pLower.includes('mecanic') || pLower.includes('parvulo')) {
      updated.title = `${updated.title} (Enfoque Práctico de Taller LTP)`;
      updated.content_summary += '\n\nAPLICACIÓN EN TALLER: Aplica los principios técnicos en las estaciones de trabajo bajo supervisión de seguridad y normas EPP.';
    } else if (pLower.includes('desafio') || pLower.includes('avanzad') || pLower.includes('profund')) {
      if (updated.activities_json && Array.isArray(updated.activities_json)) {
        updated.activities_json.push({
          number: updated.activities_json.length + 1,
          title: 'Actividad de Desafío y Extensión (Pensamiento Crítico)',
          points: 6,
          description: 'Para estudiantes que deseen profundizar en la materia:',
          questions: ['Plantea una solución innovadora vinculada al entorno productivo o comunal de Campanario.']
        });
      }
    } else {
      updated.pedagogical_context = `${updated.pedagogical_context || ''}\n• Nota de refinamiento: ${prompt}`;
    }

    res.json({
      success: true,
      source: 'pedagogical-engine',
      activity: updated
    });
  } catch (err: any) {
    console.error('Error al refinar actividad con IA:', err);
    res.status(500).json({ error: 'Error al refinar la actividad.' });
  }
});

// DELETE /api/curriculum/continuity-activities/:id - Eliminar actividad de reemplazo
router.delete('/continuity-activities/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM pedagogical_continuity_activities WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_CONTINUITY_ACTIVITY', `Actividad de continuidad ${id} eliminada.`);
    res.json({ success: true, message: 'Actividad de continuidad eliminada exitosamente.' });
  } catch (err: any) {
    console.error('Error al eliminar actividad de continuidad:', err);
    res.status(500).json({ error: 'Error al eliminar actividad de continuidad.' });
  }
});

// Función de Motor Curricular para Actividades de Continuidad (LTP Campanario)
function generatePedagogicalContinuityActivity(opts: any): any {
  const isTp = opts.course_name.includes('Técnico') || opts.course_name.includes('Medio') && (opts.subject_name.includes('Mecánic') || opts.subject_name.includes('Párvulo') || opts.subject_name.includes('Industrial'));
  const isMath = /matem|cálcul|financ/i.test(opts.subject_name);
  const isLanguage = /lengua|lenguaje|literat/i.test(opts.subject_name);
  const isScience = /ciencia|biolog|físic|químic/i.test(opts.subject_name);
  const isHistory = /historia|geograf|social/i.test(opts.subject_name);
  const isParvulo = /párvulo|infantil/i.test(opts.subject_name) || /párvulo/i.test(opts.course_name);
  const isMecanica = /mecánic|torno|soldadur|mantenim/i.test(opts.subject_name) || /mecánic/i.test(opts.course_name);

  const oaCode = opts.oa_code || 'OA 1';
  const oaTitle = opts.oa_title || 'Aplicación contextualizada de conceptos y procedimientos fundamentales.';
  const lastTopic = opts.last_covered_topics ? opts.last_covered_topics : 'los aprendizajes desarrollados en la sesión anterior';

  let title = `Guía de Aprendizaje Autónomo: Continuidad y Aplicación en ${opts.subject_name}`;
  let contextText = `Esta guía pedagógica ha sido diseñada para asegurar la continuidad del proceso formativo en el curso ${opts.course_name}, conectando directamente con ${lastTopic} en el marco de la ${opts.unit_name}. Los estudiantes consolidarán los aprendizajes vinculados a ${oaCode}.`;

  let substituteGuide = `1. INICIO (10 min): 
- Salude al curso y registre la asistencia.
- Explique con claridad: "El profesor(a) ${opts.teacher_name} dejó esta guía de trabajo programada para dar continuidad a lo que estaban viendo sobre ${lastTopic}. Esta actividad será revisada y evaluada formativamente al reincorporarse".
- Entregue una copia impresa a cada estudiante y verifique que todos cuenten con lápiz, goma y cuaderno.

2. DESARROLLO (${opts.duration_minutes - 25} min):
- Indique que lean con atención el marco conceptual resumido antes de responder las actividades.
- Modalidad permitida: Trabajo individual o en parejas colaborativas según la disciplina del aula.
- Monitoree activamente la sala, recorriendo los puestos y asegurando un clima de concentración y respeto.
- En caso de dudas conceptuales, consulte el Solucionario y Pauta de Corrección adjunta a este documento.

3. CIERRE (15 min):
- Avise al curso 10 minutos antes del timbre para que completen el "Ticket de Salida" individual.
- Recoja todas las guías ordenadas por lista o fila.
- Entregue las guías en la Unidad Técnica Pedagógica (UTP) o en el casillero del docente titular.`;

  let studentInstructions = `Estimado(a) estudiante:
1. Lee atentamente el marco conceptual y los ejemplos incluidos en esta guía antes de responder.
2. Desarrolla las actividades con letra clara, orden y rigurosidad en los espacios asignados.
3. Puedes apoyarte en tu compañero(a) de puesto para discutir las respuestas con volumen moderado.
4. Recuerda completar el Ticket de Salida antes de finalizar la clase, ya que será recolectado por el docente a cargo y entregado a tu profesor(a) titular para su evaluación.`;

  let contentSummary = '';
  let activities: any[] = [];
  let exitTicket = '';
  let answerKey = '';
  let rubricCriteria = '';

  if (isMath) {
    title = `Guía Práctica y Modelamiento Matemático: Continuidad Curricular (${oaCode})`;
    contentSummary = `CONCEPTOS CLAVE Y MODELAMIENTO MATEMÁTICO:
En las sesiones anteriores analizamos los principios de resolución numérica y algebraico-geométrica. Para dar continuidad efectiva a ${lastTopic}, recordemos los 3 pasos fundamentales para la resolución de situaciones problemáticas:
1. Identificación de datos e incógnita: Leer el enunciado subrayando los datos explícitos y la pregunta central.
2. Formulación y modelamiento: Expresar la relación matemática mediante operaciones ordenadas, ecuaciones o proporciones pertinentes.
3. Ejecución, verificación y respuesta contextualizada: Realizar los cálculos con cuidado en los signos y redactar la respuesta indicando las unidades correspondientes ($, cm, %, horas, etc.).

EJEMPLO GUIADO:
Si en un taller se requiere calcular el rendimiento de un proceso donde entran 120 piezas y se aprueban 108:
- Proporción de aprobación = 108 / 120 = 0.90 -> 90% de eficiencia.
- Merma o descarte = 120 - 108 = 12 piezas (10%).`;

    activities = [
      {
        number: 1,
        title: "Ítem I: Ejercitación Directa y Comprensión Numérica (6 Puntos)",
        points: 6,
        description: "Resuelve los siguientes ejercicios de cálculo directo aplicando las propiedades matemáticas revisadas:",
        questions: [
          "a) Resuelve la operación paso a paso justificando el orden de prioridad: 45 + 15 x (8 - 3).",
          "b) Calcula el valor correspondiente al 18% de un total de $350.000 aplicado a insumos técnicos.",
          "c) Determina el valor de la incógnita en la proporción directa: x / 24 = 15 / 6."
        ]
      },
      {
        number: 2,
        title: "Ítem II: Resolución de Situaciones Problemáticas Contextualizadas (10 Puntos)",
        points: 10,
        description: "Analiza el siguiente caso de la vida práctica y resuelve demostrando tu desarrollo completo:",
        questions: [
          "Caso 1: En una microempresa comunal de Campanario se adquieren 8 cajas de repuestos por un valor neto total de $160.000. Si se debe agregar el 19% de IVA y se ofrece un descuento promocional del 5% sobre el total bruto por pago al contado: ¿Cuál es el precio final a pagar? Realiza el desglose ordenado.",
          "Caso 2: Un equipo de trabajo avanza a una razón de 12 metros de cerca construidos cada 3 horas de jornada. Si deben completar un tramo total de 68 metros: ¿Cuántas horas completas de trabajo requerirán y cuántos metros quedarán para la última fracción?"
        ]
      },
      {
        number: 3,
        title: "Ítem III: Desafío de Análisis Crítico y Toma de Decisiones (8 Puntos)",
        points: 8,
        description: "Evalúa las dos opciones de presupuesto y fundamenta cuál es la más conveniente económica y técnicamente para el Liceo:",
        questions: [
          "Opción A: Proveedor local que cobra $4.500 por unidad con entrega inmediata sin costo de flete.",
          "Opción B: Proveedor de la capital provincial que cobra $3.800 por unidad, pero agrega un costo fijo de envío de $15.000. ¿A partir de cuántas unidades conviene contratar la Opción B? Justifica con una tabla o ecuación."
        ]
      }
    ];

    exitTicket = `TICKET DE SALIDA (Para entregar al docente de reemplazo):
1. ¿Cuál fue el paso matemático que te demandó mayor atención o esfuerzo durante los ejercicios de hoy?
2. Resuelve en 1 minuto: Si un valor pasa de 50 a 60, ¿cuál fue el porcentaje exacto de incremento?`;

    answerKey = `SOLUCIONARIO Y PAUTA DE CORRECCIÓN PARA EL DOCENTE DE REEMPLAZO:
ÍTEM I (6 pts, 2 pts c/u):
a) 45 + 15 x 5 = 45 + 75 = 120. (2 pts: 1 pt por prioridad de paréntesis/multiplicación, 1 pt resultado).
b) 350.000 x 0.18 = $63.000. (2 pts).
c) x = (24 x 15) / 6 = 360 / 6 = 60. (2 pts).

ÍTEM II (10 pts, 5 pts c/u):
Caso 1: Neto $160.000 -> IVA 19% = $30.400 -> Bruto = $190.400. Descuento 5% = $9.520 -> Total final = $180.880. (5 pts por desarrollo completo).
Caso 2: Velocidad = 4 m/hora. Tiempo para 68 m = 68 / 4 = 17 horas exactas. (5 pts).

ÍTEM III (8 pts):
Igualdad de costos: 4.500x = 3.800x + 15.000 -> 700x = 15.000 -> x = 21.43 unidades.
Conclusión: A partir de 22 unidades o más conviene la Opción B; para 21 unidades o menos conviene la Opción A. (8 pts por planteamiento y conclusión fundamentada).

PUNTAJE TOTAL: 24 PUNTOS.`;

    rubricCriteria = `ESCALA DE APRECIACIÓN Y LOGRO FORMATIVO:
• Nivel Muy Bueno / Sobresaliente (20 a 24 puntos): Procedimientos matemáticos correctos, fundamentación clara y ticket de salida completo.
• Nivel Aceptable / En Desarrollo (14 a 19 puntos): Comprende los conceptos centrales, comete errores menores de cálculo pero mantiene la coherencia.
• Nivel Inicial / Requiere Reforzamiento (< 14 puntos): Dificultad para formular el modelo; requiere apoyo del profesor titular en la próxima clase.`;

  } else if (isMecanica) {
    title = `Guía Técnica de Taller y Mantenimiento Industrial: Continuidad Formativa (${oaCode})`;
    contentSummary = `MARCO CONCEPTUAL TÉCNICO Y SEGURIDAD INDUSTRIAL:
En el área Técnico-Profesional de Mecánica Industrial del LTP Campanario, la precisión dimensional y el cumplimiento irrestricto de las normas de prevención de riesgos son indispensables.
Dando continuidad a ${lastTopic}:
1. Metrología y Tolerancias: El uso de instrumentos de medición directa (calibre pie de metro milimétrico y en fracciones de pulgada, micrómetro de exteriores) exige verificar siempre el cero del instrumento y evitar el error de paralaje.
2. Parámetros de Operación en Máquinas Herramientas: La velocidad de corte (Vc), avance (f) y profundidad de pasada (ap) determinan la vida útil del inserto de metal duro o herramienta de acero rápido (HSS) y la rugosidad superficial (Ra).
3. Normativa de Seguridad: Jamás operar máquinas con ropa holgada, cabello suelto, guantes en zonas de husillos giratorios o sin lentes de protección contra viruta proyectada.`;

    activities = [
      {
        number: 1,
        title: "Ítem I: Seguridad de Taller y Vocabulario Técnico (6 Puntos)",
        points: 6,
        description: "Responde de forma clara las preguntas fundamentales de taller:",
        questions: [
          "a) Explica por qué está estrictamente prohibido utilizar guantes al operar el torno convencional o la taladradora de columna.",
          "b) Define qué es el error de paralaje en una lectura de nonio y cómo debe colocarse el operador para evitarlo.",
          "c) ¿Cuál es la diferencia entre mantenimiento preventivo sistemático y mantenimiento correctivo en una línea de producción?"
        ]
      },
      {
        number: 2,
        title: "Ítem II: Cálculo de Parámetros de Mecanizado y Metrología (10 Puntos)",
        points: 10,
        description: "Aplica las fórmulas técnicas aprendidas para resolver las siguientes situaciones:",
        questions: [
          "Problema 1: Se debe tornear un eje cilíndrico de acero SAE 1020 con un diámetro inicial de 50 mm. Si la velocidad de corte recomendada por el fabricante del inserto es Vc = 80 m/min, calcula las RPM que se deben seleccionar en la caja Norton del torno (Fórmula: N = (Vc x 1000) / (pi x D)).",
          "Problema 2: En una medición con pie de metro de precisión 0.05 mm, el cero del nonio se ubica pasado los 37 mm de la regla principal y coincide exactamente en la 7° línea del nonio. ¿Cuál es la lectura milimétrica exacta? Explica el cálculo."
        ]
      },
      {
        number: 3,
        title: "Ítem III: Análisis de Caso de Taller y Prevención de Fallas (8 Puntos)",
        points: 8,
        description: "Analiza el caso técnico y propón una solución según el estándar TP:",
        questions: [
          "Caso: Durante el cilindrado de una pieza esbelta de 300 mm de largo sostenida solo en el plato de tres mordazas, el estudiante nota una vibración excesiva (chatter) y un acabado superficial rugoso e irregular. Identifica 2 causas probables de esta anomalía y describe 2 acciones correctivas inmediatas que debió tomar antes de continuar."
        ]
      }
    ];

    exitTicket = `TICKET DE SALIDA TÉCNICO:
1. Nombra el EPP más crítico e indispensable antes de pulsar el botón de encendido de cualquier máquina herramienta.
2. Si una pieza torneada queda cónica en vez de perfectamente cilíndrica, ¿qué elemento mecánico del torno podría estar desalineado?`;

    answerKey = `SOLUCIONARIO TÉCNICO PARA EL DOCENTE DE REEMPLAZO:
ÍTEM I (6 pts):
a) Porque el guante puede ser atrapado por la viruta o el husillo giratorio, provocando un arrastre severo y amputación. (2 pts).
b) Es la desviación de lectura por mirar oblicuamente la escala; se evita situando la vista en ángulo de 90° exactos frente a la escala. (2 pts).
c) El preventivo se realiza antes de la falla según horas de servicio; el correctivo repara una avería ya ocurrida. (2 pts).

ÍTEM II (10 pts):
Problema 1: N = (80 x 1000) / (3.1416 x 50) = 80.000 / 157.08 = 509.29 RPM. Se selecciona la velocidad estándar más cercana en la caja (ej: 500 RPM). (5 pts).
Problema 2: Lectura = 37 mm + (7 x 0.05 mm) = 37 mm + 0.35 mm = 37.35 mm. (5 pts).

ÍTEM III (8 pts):
Causas: Falta de apoyo en contrapunto (voladizo excesivo sin centro giratorio), velocidad o avance inadecuado, herramienta desalineada o desafilada.
Acciones: Montar contrapunto con centro giratorio o luneta fija, verificar altura del buril al centro del torno y reducir la profundidad de pasada. (8 pts).

PUNTAJE TOTAL: 24 PUNTOS.`;

    rubricCriteria = `CRITERIOS DE LOGRO TÉCNICO PROFESIONAL:
• Competente Destacado (20-24 pts): Demuestra dominio riguroso de normas de seguridad, fórmulas de mecanizado y diagnóstico técnico.
• En Desarrollo Técnico (14-19 pts): Aplica fórmulas pero omite detalles de seguridad o unidades.
• No Alcanzado (< 14 pts): Confunde conceptos elementales de taller; requiere supervisión directa del docente titular.`;

  } else if (isParvulo) {
    title = `Guía Didáctica de Educación Parvularia: Continuidad Curricular (${oaCode})`;
    contentSummary = `PRINCIPIOS PEDAGÓGICOS EN EDUCACIÓN PARVULARIA (BCEP MINEDUC):
Dando continuidad a ${lastTopic}, recordamos los principios rectores de las Bases Curriculares:
1. Principio de Bienestar y Singularidad: Cada niña y niño es un sujeto de derechos único, con ritmo y estilo de aprendizaje propio.
2. Principio del Juego y Actividad: El juego es la herramienta pedagógica y natural por excelencia en la primera infancia; no es un momento accesorio, sino el eje del aprendizaje significativo.
3. Principio de Relación y Potenciación: Ambientes afectivos y seguros que potencian la autonomía progresiva, el lenguaje verbal y la convivencia democrática.`;

    activities = [
      {
        number: 1,
        title: "Ítem I: Fundamentos y Bases Curriculares (6 Puntos)",
        points: 6,
        description: "Responde brevemente según la normativa educativa vigente:",
        questions: [
          "a) Define en tus palabras el Principio del Juego según las BCEP y menciona una situación donde se aplique.",
          "b) ¿Cuál es la diferencia entre el Núcleo de Lenguaje Verbal y el Núcleo de Convivencia y Ciudadanía?",
          "c) ¿Qué rol cumple la educadora/asistente de párvulos en la mediación de un conflicto entre dos párvulos de nivel medio?"
        ]
      },
      {
        number: 2,
        title: "Ítem II: Diseño de Experiencias de Aprendizaje Lúdicas (10 Puntos)",
        points: 10,
        description: "Elabora una propuesta concreta de micro-experiencia para niños y niñas de Nivel Transición (Pre-Kínder o Kínder):",
        questions: [
          "Propuesta: Diseña una actividad de 25 minutos con Inicio (activación lúdica), Desarrollo (manipulación de material concreto no estructurado) y Cierre (canción o metacognición sencilla) que favorezca la motricidad fina y la expresión artística.",
          "Especifica: Materiales seguros a utilizar, rol de la asistente durante la experiencia e indicador de observación para la pauta de evaluación."
        ]
      },
      {
        number: 3,
        title: "Ítem III: Protocolos de Convivencia y Primeros Auxilios en el Aula Infantil (8 Puntos)",
        points: 8,
        description: "Analiza el siguiente caso de aula y fundamenta tu actuar profesional:",
        questions: [
          "Caso: Durante el recreo en el patio techado, un párvulo sufre un tropiezo y golpe leve en la rodilla con raspadura. Describe los pasos ordenados del protocolo a seguir: contención emocional, atención de primeros auxilios básicos, aviso a la educadora y registro en la libreta/ficha institucional."
        ]
      }
    ];

    exitTicket = `TICKET DE SALIDA PEDAGÓGICO:
1. Menciona un material didáctico reciclado que potencie la imaginación sin representar riesgo de ingesta o asfixia para los niños.
2. ¿Por qué es fundamental anticipar la rutina diaria a los párvulos al inicio de cada jornada?`;

    answerKey = `SOLUCIONARIO Y PAUTA DE EVALUACIÓN PARA EL DOCENTE DE REEMPLAZO:
ÍTEM I (6 pts): 2 pts por cada respuesta fundamentada en las BCEP MINEDUC.
ÍTEM II (10 pts): Estructura clara con inicio, desarrollo y cierre coherente (6 pts); materiales pertinentes y seguros (2 pts); indicador observable de logro (2 pts).
ÍTEM III (8 pts): Pasos ordenados: Calmar y contener al párvulo (2 pts); limpiar con suero/agua y cubrir sin aplicar medicamentos sin autorización (3 pts); comunicar y registrar formalmente (3 pts).
PUNTAJE TOTAL: 24 PUNTOS.`;

    rubricCriteria = `ESCALA DE EVALUACIÓN TÉCNICA:
• Excelente (20-24 pts): Demuestra vocación pedagógica, apego irrestricto a normas de protección infantil y creatividad lúdica.
• Adecuado (14-19 pts): Experiencia lúdica válida pero con imprecisiones en los tiempos o evaluación.
• Insuficiente (< 14 pts): Falta de conocimiento de los principios básicos de la educación parvularia.`;

  } else {
    // Humanista / General (Lenguaje, Historia, Ciencias, Inglés, etc.)
    title = `Guía de Aprendizaje y Análisis Autónomo: Continuidad Pedagógica (${oaCode})`;
    contentSummary = `MARCO TEÓRICO Y CONCEPTOS FUNDAMENTALES:
Dando continuidad a los aprendizajes del curso ${opts.course_name} y conectando directamente con ${lastTopic}:
1. Ideas Centrales: Los contenidos curriculares cobran sentido cuando los conectamos con la realidad, la sociedad y nuestro propio pensamiento crítico.
2. Estrategia de Comprensión y Análisis:
- Lectura Global: Comprender de qué trata el tema en su conjunto.
- Localización de Evidencias: Identificar hechos, datos o argumentos que respaldan una afirmación.
- Inferencia e Interpretación: Explicar las causas, consecuencias y significados no explícitos.
- Valoración Crítica: Expresar una opinión informada fundamentada con argumentos sólidos.`;

    activities = [
      {
        number: 1,
        title: "Actividad 1: Reconocimiento y Comprensión Directa (6 Puntos)",
        points: 6,
        description: "Responde de forma concisa basándote en los contenidos estudiados:",
        questions: [
          `a) Explica con tus propias palabras el concepto principal trabajado en ${oaCode}.`,
          "b) Identifica 2 diferencias o características esenciales asociadas al tema central.",
          "c) ¿De qué manera este contenido se vincula con lo que aprendiste en la clase anterior?"
        ]
      },
      {
        number: 2,
        title: "Actividad 2: Análisis Aplicado y Argumentación (10 Puntos)",
        points: 10,
        description: "Desarrolla las siguientes situaciones de análisis y fundamenta tus respuestas:",
        questions: [
          "a) Analiza la siguiente afirmación y explica si estás de acuerdo o en desacuerdo, aportando al menos dos argumentos sólidos.",
          "b) Elabora un esquema, mapa conceptual o cuadro comparativo de 4 elementos que sintetice las ideas centrales de la unidad."
        ]
      },
      {
        number: 3,
        title: "Actividad 3: Reflexión Contextualizada en el Entorno Escolar o Comunitario (8 Puntos)",
        points: 8,
        description: "Conecta lo aprendido con tu entorno y vida diaria:",
        questions: [
          "a) Plantea un ejemplo real de tu comunidad (Campanario, Yungay o región de Ñuble) donde este aprendizaje sea útil o visible.",
          "b) Propón una solución innovadora o mejora ante un problema detectado en relación con este tema."
        ]
      }
    ];

    exitTicket = `TICKET DE SALIDA (Para entregar al docente de reemplazo):
1. ¿Qué concepto o idea clave de la sesión de hoy te pareció más relevante y por qué?
2. Escribe una pregunta o duda que te gustaría que el profesor titular responda al regresar a clases.`;

    answerKey = `SOLUCIONARIO Y PAUTA PARA EL DOCENTE DE REEMPLAZO:
Actividad 1 (6 pts): 2 pts por definición clara, 2 pts por las dos diferencias identificadas y 2 pts por la conexión con la clase previa.
Actividad 2 (10 pts): 5 pts por argumentación lógica fundamentada en hechos o lecturas; 5 pts por el organizador gráfico con al menos 4 elementos clave.
Actividad 3 (8 pts): 4 pts por pertinencia del ejemplo comunitario local; 4 pts por la propuesta de mejora factible y coherente.
PUNTAJE TOTAL: 24 PUNTOS.`;

    rubricCriteria = `ESCALA DE EVALUACIÓN:
• Logro Sobresaliente (20-24 pts): Respuestas completas, vocabulario adecuado y fundamentación sólida.
• Logro Intermedio (14-19 pts): Respuestas correctas pero con escasa profundización o argumentación.
• Requiere Refuerzo (< 14 pts): Respuestas incompletas o erróneas; requiere apoyo del docente titular.`;
  }

  const slides = [
    {
      slide_number: 1,
      title: title,
      subtitle: `${opts.course_name} • ${opts.subject_name}`,
      bullets: [
        `Docente Titular: ${opts.teacher_name}`,
        `Docente a Cargo: ${opts.substitute_teacher_name || 'Docente de Apoyo'}`,
        `Objetivo de Aprendizaje: ${oaCode}`
      ],
      teacher_prompt: 'Presentar en proyector al iniciar la sesión y verificar materiales.',
      time_estimate: '5 min'
    },
    {
      slide_number: 2,
      title: 'Activación & Pregunta Detonante (Warm-up)',
      subtitle: `Conexión con la clase previa: ${lastTopic.substring(0, 60)}...`,
      bullets: [
        '¿Qué recuerdas del último procedimiento o concepto visto en la clase anterior?',
        '¿Dónde se aplica este conocimiento en situaciones cotidianas o en el taller?',
        'Lluvia de ideas rápida (3 estudiantes voluntarios responden).'
      ],
      teacher_prompt: 'Moderar la participación en la pizarra antes de repartir las guías.',
      time_estimate: '10 min'
    },
    {
      slide_number: 3,
      title: 'Conceptos Clave & Vocabulario Central',
      subtitle: `Marco Teórico de la Unidad: ${opts.unit_name}`,
      bullets: [
        `Concepto Principal: ${oaTitle.substring(0, 80)}...`,
        'Paso 1: Identificación y análisis ordenado de la información.',
        'Paso 2: Aplicación del método o procedimiento paso a paso.',
        'Paso 3: Verificación y redacción clara de conclusiones.'
      ],
      teacher_prompt: 'Dejar proyectado durante el trabajo autónomo para referencia.',
      time_estimate: '15 min'
    },
    {
      slide_number: 4,
      title: 'Taller Práctico & Ejercitación Autónoma',
      subtitle: `Tiempo de trabajo estimado: ${opts.duration_minutes - 25} minutos`,
      bullets: [
        'Modalidad: Trabajo individual o en parejas colaborativas.',
        'Desarrollar ítems I, II y III de la guía impresa.',
        'Dudas: Levantar la mano para atención en el puesto.',
        'Ambiente de concentración, rigurosidad y respeto.'
      ],
      teacher_prompt: 'Monitorear la sala y circular entre las filas resolviendo consultas.',
      time_estimate: `${opts.duration_minutes - 25} min`
    },
    {
      slide_number: 5,
      title: 'Cierre de Sesión & Ticket de Salida',
      subtitle: 'Comprobación de Aprendizaje antes del Timbre',
      bullets: [
        '10 minutos antes: Detener el trabajo y responder el Ticket de Salida.',
        'Responder individualmente las preguntas de síntesis.',
        'Entregar la guía firmada al docente a cargo al sonar el timbre.',
        'El profesor titular revisará y registrará tu avance al reincorporarse.'
      ],
      teacher_prompt: 'Recolectar todas las guías en orden de lista y entregar en UTP.',
      time_estimate: '10 min'
    }
  ];

  const scaffold = {
    title: 'Nivel Apoyo / DUA / PIE (Scaffolded Tier)',
    guidelines: 'Diseñado con organizadores visuales y pistas explícitas para estudiantes que requieren apoyo pedagógico adicional.',
    hints: [
      `Pista 1: Revisa el concepto clave destacado en el marco conceptual para responder el Ítem I.`,
      `Pista 2: En el Ítem II, subraya los datos numéricos o palabras clave antes de realizar las operaciones.`,
      `Pista 3: Puedes responder oralmente o con palabras clave breves si te resulta más claro.`
    ],
    simplified_questions: [
      `1. ¿Cuál es la idea o paso más importante que aprendiste hoy sobre ${oaCode}?`,
      `2. Completa la frase: "Para resolver esta situación, primero debemos..."`,
      `3. Marca con un visto bueno (✓) la opción correcta según lo leído.`
    ]
  };

  const stretch = {
    title: 'Nivel Desafío y Extensión (Stretch Tier)',
    guidelines: 'Para estudiantes que terminan con rapidez o requieren mayor profundización y pensamiento crítico avanzado.',
    challenge_questions: [
      `1. ¿Cómo transformarías el procedimiento de hoy para resolver un problema de mayor escala en una empresa o taller real?`,
      `2. Diseña un contraejemplo o identifica una limitación del método aplicado.`,
      `3. Propón una versión mejorada o alternativa de resolución justificando tu postura con criterios técnicos o científicos.`
    ]
  };

  const warmUp = {
    title: 'Dinámica de Inicio / Hook de 5 Minutos',
    time_minutes: 5,
    prompt: `¿Cómo aplicarías los conceptos de ${oaCode} en una situación cotidiana o en el taller productivo de Campanario?`,
    instructions: 'Presentar la pregunta en la pizarra. Dar 1 minuto de reflexión individual y pedir a 2 estudiantes que compartan su respuesta.'
  };

  return {
    title,
    pedagogical_context: contextText,
    instructions_for_students: studentInstructions,
    instructions_for_substitute: substituteGuide,
    content_summary: contentSummary,
    activities,
    exit_ticket: exitTicket,
    answer_key: answerKey,
    rubric_criteria: rubricCriteria,
    slides,
    scaffold,
    stretch,
    warm_up: warmUp
  };
}

export default router;
