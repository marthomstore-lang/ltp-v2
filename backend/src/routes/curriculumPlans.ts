import { Router, Request, Response } from 'express';
import { query } from '../config/db';
import { authMiddleware, checkRoles, logAudit } from '../middleware/auth';

const router = Router();

// =============================================================================
// 1. CATÁLOGO DE OBJETIVOS DE APRENDIZAJE (OA) MINEDUC
// =============================================================================

// GET /api/curriculum/learning-goals - Buscar y filtrar OAs MINEDUC
router.get('/learning-goals', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { grade_level, subject, search } = req.query;
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

      if (isLenguaje) {
        sql += ` AND (subject ILIKE '%Lengua%' OR subject ILIKE '%Lenguaje%' OR subject ILIKE '%Literatura%')`;
      } else if (isMatematica) {
        sql += ` AND (subject ILIKE '%Matem%')`;
      } else if (isCiencias) {
        sql += ` AND (subject ILIKE '%Ciencia%' OR subject ILIKE '%Biolog%' OR subject ILIKE '%Físic%' OR subject ILIKE '%Fisic%' OR subject ILIKE '%Químic%' OR subject ILIKE '%Quimic%')`;
      } else if (isHistoria) {
        sql += ` AND (subject ILIKE '%Historia%')`;
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

    sql += ' ORDER BY grade_level ASC, oa_code ASC LIMIT 100';

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
            evaluation_instruments, temporality, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          unitId,
          planId,
          parseInt(String(u.unit_number || i + 1), 10),
          u.unit_name || `Unidad ${i + 1}`,
          u.learning_goals || '',
          u.evaluation_instruments || '',
          u.temporality || '8 Semanas',
          i + 1
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
            evaluation_instruments, temporality, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          unitId,
          id,
          parseInt(String(u.unit_number || i + 1), 10),
          u.unit_name || `Unidad ${i + 1}`,
          u.learning_goals || '',
          u.evaluation_instruments || '',
          u.temporality || '8 Semanas',
          i + 1
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
      unit_id || null,
      unit_name || null,
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

    res.json({ success: true, message: 'Planificación de clase guardada exitosamente.', id });
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

    let subjSql = 'subject ILIKE $2';
    let subjParam = `%${sName}%`;
    if (isLenguaje) {
      subjSql = `(subject ILIKE '%Lengua%' OR subject ILIKE '%Lenguaje%' OR subject ILIKE '%Literatura%')`;
    } else if (isMatematica) {
      subjSql = `subject ILIKE '%Matem%'`;
    } else if (isCiencias) {
      subjSql = `(subject ILIKE '%Ciencia%' OR subject ILIKE '%Biolog%' OR subject ILIKE '%Físic%' OR subject ILIKE '%Químic%')`;
    } else if (isHistoria) {
      subjSql = `subject ILIKE '%Historia%'`;
    }

    const officialGoalsRes = isLenguaje || isMatematica || isCiencias || isHistoria
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
  mode: 'suggest_class_activities' | 'suggest_annual_units' | 'suggest_evaluations' | 'suggest_dua';
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
      dua_accommodations: `• Múltiples formas de representación: Presentar la información mediante organizadores gráficos, esquemas visuales y ejemplos de la vida diaria o del taller.
• Múltiples formas de acción y expresión: Permitir que los estudiantes demuestren su aprendizaje a través de respuestas orales, resolución práctica en pizarra o fichas guiadas.
• Múltiples formas de implicación: Fomentar el trabajo en parejas heterogéneas con apoyo del profesional PIE y asignación de roles colaborativos claros.`
    };
  }

  if (opts.mode === 'suggest_evaluations') {
    return {
      evaluation_instruments: 'Diagnóstico inicial formativo (5 preguntas clave); Registro de observación durante el trabajo práctico; Prueba escrita mixta con resolución de problemas contextualizados; Pauta de cotejo para el cuaderno de aula.'
    };
  }

  // Modo por defecto: suggest_class_activities (Inicio, Desarrollo, Cierre)
  const isMath = opts.subject.toLowerCase().includes('matemát') || opts.subject.toLowerCase().includes('financ');
  const isParvulo = opts.subject.toLowerCase().includes('párvulo') || opts.grade_level.toLowerCase().includes('párvulo');
  const isMecanica = opts.subject.toLowerCase().includes('mecánic') || opts.grade_level.toLowerCase().includes('industrial');

  let goal = `Aplicar los principios de ${opts.subject} para resolver situaciones prácticas vinculadas a ${opts.oa_code}.`;
  let inicio = `1. Saludo y ambientación: Presentar en la pizarra el objetivo de la clase y su relevancia cotidiana.
2. Activación de conocimientos previos: Preguntas dirigidas sobre la clase anterior mediante lluvia de ideas breve (5 min).
3. Desafío motivacional inicial: Presentar un caso o problema detonante real que requiera aplicar el tema del día.`;

  let desarrollo = `1. Modelamiento docente (20 min): Demostración paso a paso del procedimiento o concepto clave, resolviendo un ejemplo guiado en pizarra y aclarando dudas frecuentes.
2. Trabajo colaborativo práctico (30 min): Los estudiantes resuelven en parejas una guía de aplicación práctica o ejercicio de taller con monitoreo y retroalimentación docente en puesto.
3. Socialización y corrección grupal (10 min): Un equipo expone su procedimiento; se contrastan distintos caminos de resolución.`;

  let cierre = `1. Síntesis guiada: El docente recapitula los 3 aprendizajes esenciales de la sesión junto con los estudiantes.
2. Preguntas de metacognición: "¿Qué paso resultó más desafiante hoy y cómo logramos resolverlo?".
3. Ticket de salida: Cada estudiante responde un ejercicio breve de 2 minutos para verificar el logro del objetivo antes de retirarse.`;

  let recursos = `Guía de aprendizaje impresa, proyector multimedia, pizarra, plumones de colores y cuaderno de la asignatura.`;
  let indicadores = `• Identifica correctamente los conceptos clave del ${opts.oa_code}.
• Aplica procedimientos de resolución de forma ordenada y autónoma.
• Justifica sus respuestas utilizando vocabulario técnico de la asignatura.`;

  let dua = `• Proporcionar apoyos visuales y fichas con pasos resumidos para estudiantes que lo requieran.
• Permitir apoyo mutuo entre pares y supervisión prioritaria del equipo de co-docencia / PIE.`;

  if (isMath) {
    goal = `Analizar y resolver problemas aplicando modelos matemáticos y cálculo guiado en torno a ${opts.oa_code}.`;
    inicio = `1. Pregunta activadora: Mostrar un gráfico o factura económica real y preguntar: "¿Cómo influyen las tasas o índices en nuestro presupuesto?".
2. Conexión de conceptos previos: Recordar porcentaje, interés simple y lectura de datos (8 min).
3. Presentación del objetivo y criterio de éxito de la clase.`;
    desarrollo = `1. Modelamiento matemático: Explicación de la fórmula o modelo con un caso práctico resuelto en conjunto.
2. Taller de ejercitación graduada: Los estudiantes avanzan desde ejercicios básicos de comprensión hasta problemas contextualizados de la vida cotidiana.
3. Retroalimentación en tiempo real: Revisión formativa en la pizarra destacando los errores conceptuales más comunes para corregirlos positivamente.`;
    recursos = `Calculadora, guía de ejercicios de matemática financiera/estadística, proyector y tabla de fórmulas de apoyo.`;
  } else if (isParvulo) {
    goal = `Diseñar y planificar actividades lúdicas pertinentes a las bases curriculares de educación parvularia según ${opts.oa_code}.`;
    inicio = `1. Dinámica de inicio: Observación de un recurso didáctico infantil y debate sobre la edad apropiada para su uso.
2. Activación: Repaso de las etapas del desarrollo psicomotor según las Bases Curriculares de Educación Parvularia.`;
    desarrollo = `1. Taller de diseño pedagógico: En grupos de trabajo, las estudiantes elaboran una micro-planificación de experiencia de aprendizaje con inicio, desarrollo y cierre para párvulos.
2. Simulación de aula: Presentación breve de la actividad y análisis de seguridad, pertinencia y estimulación del material.`;
    recursos = `Bases Curriculares de Educación Parvularia MINEDUC, fichas de planificación técnica, materiales de manualidades y cartulinas.`;
  } else if (isMecanica) {
    goal = `Identificar normas de seguridad, parámetros de corte y secuencias de mecanizado según especificaciones técnicas (${opts.oa_code}).`;
    inicio = `1. Charla de 5 minutos sobre seguridad y Elementos de Protección Personal (EPP) en el taller.
2. Lectura e interpretación del plano técnico de la pieza a fabricar.`;
    desarrollo = `1. Demostración en máquina herramienta: Montaje seguro de la pieza y centrado de la herramienta de corte.
2. Operación guiada de mecanizado: Ejecución de operaciones con supervisión directa y control dimensional con pie de metro / micrómetro.`;
    recursos = `Torno convencional / fresadora, plano técnico normalizado, instrumentos de metrología (calibre pie de metro) y EPP.`;
  }

  let ticket = `1. Pregunta rápida de síntesis (2 min): Explica con tus propias palabras o resuelve brevemente el ejercicio clave del día (${opts.oa_code}).
2. Metacognición: ¿Qué paso del procedimiento te pareció más claro y en cuál requieres mayor práctica?`;

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

export default router;
