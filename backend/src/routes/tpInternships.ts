import { Router, Request, Response } from 'express';
import { query } from '../config/db';
import { authMiddleware, checkRoles, logAudit } from '../middleware/auth';

const router = Router();

// -----------------------------------------------------------------------------
// MATRÍCULAS DE PRÁCTICA PROFESIONAL TP (4° MEDIO 2026 - 2027)
// -----------------------------------------------------------------------------

// GET /api/tp-internships - Listado de matrículas con datos vinculados de students
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || '2026 - 2027').trim();
    const specialty = String(req.query.specialty || '').trim();
    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();

    let sql = `
      SELECT 
        e.*,
        s.run as student_run,
        s.full_name as student_name,
        s.desc_grado as course_name,
        s.birth_date,
        s.letra_curso,
        s.phone as student_phone,
        s.email as student_email,
        s.address as student_address,
        s.commune as student_commune,
        s.guardian_name,
        s.guardian_phone,
        s.emergency_contact_name,
        s.emergency_contact_phone,
        s.profesor_jefe,
        CASE 
          WHEN s.desc_grado ILIKE '%Mecánica%' THEN 'Mecánica Industrial'
          WHEN s.desc_grado ILIKE '%Párvulo%' OR s.desc_grado ILIKE '%Niños%' THEN 'Atención de Párvulos'
          ELSE 'Técnico Profesional'
        END as specialty
      FROM tp_internship_enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (period) {
      params.push(period);
      sql += ` AND e.period = $${params.length}`;
    }

    if (specialty && specialty !== 'all' && specialty !== 'Todas') {
      params.push(`%${specialty}%`);
      sql += ` AND s.desc_grado ILIKE $${params.length}`;
    }

    if (status && status !== 'all' && status !== 'Todos') {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      const sParam = `$${params.length}`;
      sql += ` AND (
        s.full_name ILIKE ${sParam} OR 
        s.run ILIKE ${sParam} OR 
        REPLACE(REPLACE(s.run, '.', ''), '-', '') ILIKE ${sParam} OR 
        e.company_name ILIKE ${sParam} OR 
        e.enrollment_number ILIKE ${sParam}
      )`;
    }

    sql += ` ORDER BY s.desc_grado ASC, s.full_name ASC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error('❌ Error en GET /api/tp-internships:', err);
    res.status(500).json({ error: 'Error al obtener matrículas de práctica.' });
  }
});

// GET /api/tp-internships/candidates - Estudiantes de 4° Medio elegibles y su estado de práctica
router.get('/candidates', authMiddleware, async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || '2026 - 2027').trim();
    const result = await query(`
      SELECT 
        s.id,
        s.run,
        s.full_name,
        s.desc_grado,
        s.birth_date,
        s.letra_curso,
        s.phone,
        s.email,
        s.address,
        s.commune,
        s.guardian_name,
        s.guardian_phone,
        s.emergency_contact_name,
        s.emergency_contact_phone,
        s.profesor_jefe,
        CASE 
          WHEN s.desc_grado ILIKE '%Mecánica%' THEN 'Mecánica Industrial'
          WHEN s.desc_grado ILIKE '%Párvulo%' OR s.desc_grado ILIKE '%Niños%' THEN 'Atención de Párvulos'
          ELSE 'Técnico Profesional'
        END as specialty,
        e.id as enrollment_id,
        e.enrollment_number,
        e.status as enrollment_status,
        e.company_name,
        e.period as enrollment_period,
        e.is_adult_student
      FROM students s
      LEFT JOIN tp_internship_enrollments e ON s.id = e.student_id AND e.period = $1
      WHERE s.desc_grado ILIKE '%4%Medio%' OR s.desc_grado ILIKE '%Egresad%' OR e.id IS NOT NULL
      ORDER BY s.desc_grado ASC, s.full_name ASC
    `, [period]);

    res.json(result.rows);
  } catch (err: any) {
    console.error('❌ Error en GET /api/tp-internships/candidates:', err);
    res.status(500).json({ error: 'Error al obtener candidatos de 4° Medio.' });
  }
});

// GET /api/tp-internships/stats - Estadísticas y métricas ejecutivas de prácticas
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || '2026 - 2027').trim();

    // 1. Total alumnos de 4to medio
    const total4toRes = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN desc_grado ILIKE '%Mecánica%' THEN 1 ELSE 0 END) as total_mecanica,
        SUM(CASE WHEN desc_grado ILIKE '%Párvulo%' OR desc_grado ILIKE '%Niños%' THEN 1 ELSE 0 END) as total_parvulos
      FROM students 
      WHERE desc_grado ILIKE '%4%Medio%'
    `);
    const total4to = total4toRes.rows[0] || {};

    // 2. Matriculados en práctica
    const enrollRes = await query(`
      SELECT 
        COUNT(*) as total_enrolled,
        SUM(CASE WHEN s.desc_grado ILIKE '%Mecánica%' THEN 1 ELSE 0 END) as enrolled_mecanica,
        SUM(CASE WHEN s.desc_grado ILIKE '%Párvulo%' OR s.desc_grado ILIKE '%Niños%' THEN 1 ELSE 0 END) as enrolled_parvulos,
        SUM(CASE WHEN e.status = 'Matriculado' THEN 1 ELSE 0 END) as status_matriculado,
        SUM(CASE WHEN e.status = 'En Curso' THEN 1 ELSE 0 END) as status_en_curso,
        SUM(CASE WHEN e.status = 'Finalizada' THEN 1 ELSE 0 END) as status_finalizada,
        SUM(CASE WHEN e.status = 'Aprobada' THEN 1 ELSE 0 END) as status_aprobada,
        SUM(CASE WHEN e.status = 'Titulado' THEN 1 ELSE 0 END) as status_titulado,
        SUM(CASE WHEN e.has_signed_agreement = true THEN 1 ELSE 0 END) as with_agreement,
        SUM(CASE WHEN e.has_school_insurance = true THEN 1 ELSE 0 END) as with_insurance
      FROM tp_internship_enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.period = $1
    `, [period]);
    const enrollStats = enrollRes.rows[0] || {};

    res.json({
      period,
      total_4medio: parseInt(total4to.total || '0', 10),
      total_mecanica: parseInt(total4to.total_mecanica || '0', 10),
      total_parvulos: parseInt(total4to.total_parvulos || '0', 10),
      total_enrolled: parseInt(enrollStats.total_enrolled || '0', 10),
      by_specialty: {
        mecanica: parseInt(enrollStats.enrolled_mecanica || '0', 10),
        parvulos: parseInt(enrollStats.enrolled_parvulos || '0', 10)
      },
      by_status: {
        'Matriculado': parseInt(enrollStats.status_matriculado || '0', 10),
        'En Curso': parseInt(enrollStats.status_en_curso || '0', 10),
        'Finalizada': parseInt(enrollStats.status_finalizada || '0', 10),
        'Aprobada': parseInt(enrollStats.status_aprobada || '0', 10),
        'Titulado': parseInt(enrollStats.status_titulado || '0', 10)
      },
      with_signed_agreement: parseInt(enrollStats.with_agreement || '0', 10),
      with_school_insurance: parseInt(enrollStats.with_insurance || '0', 10),
      total4toMedio: parseInt(total4to.total || '0', 10),
      totalMecanica: parseInt(total4to.total_mecanica || '0', 10),
      totalParvulos: parseInt(total4to.total_parvulos || '0', 10),
      totalEnrolled: parseInt(enrollStats.total_enrolled || '0', 10),
      enrolledMecanica: parseInt(enrollStats.enrolled_mecanica || '0', 10),
      enrolledParvulos: parseInt(enrollStats.enrolled_parvulos || '0', 10),
      statusMatriculado: parseInt(enrollStats.status_matriculado || '0', 10),
      statusEnCurso: parseInt(enrollStats.status_en_curso || '0', 10),
      statusFinalizada: parseInt(enrollStats.status_finalizada || '0', 10),
      statusAprobada: parseInt(enrollStats.status_aprobada || '0', 10),
      statusTitulado: parseInt(enrollStats.status_titulado || '0', 10),
      withAgreement: parseInt(enrollStats.with_agreement || '0', 10),
      withInsurance: parseInt(enrollStats.with_insurance || '0', 10)
    });
  } catch (err: any) {
    console.error('❌ Error en GET /api/tp-internships/stats:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas de práctica.' });
  }
});

// GET /api/tp-internships/search-student - Buscar estudiante por RUN o Nombre para matrícula
router.get('/search-student', authMiddleware, async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json([]);
    }
    const cleanQ = q.replace(/[\.\-]/g, '');
    const result = await query(`
      SELECT 
        s.id,
        s.run,
        s.full_name,
        s.desc_grado,
        s.birth_date,
        s.letra_curso,
        s.phone,
        s.email,
        s.address,
        s.commune,
        s.guardian_name,
        s.guardian_phone,
        s.profesor_jefe,
        CASE 
          WHEN s.desc_grado ILIKE '%Mecánica%' THEN 'Mecánica Industrial'
          WHEN s.desc_grado ILIKE '%Párvulo%' OR s.desc_grado ILIKE '%Niños%' THEN 'Atención de Párvulos'
          ELSE 'Técnico Profesional'
        END as specialty,
        e.id as existing_enrollment_id,
        e.enrollment_number as existing_enrollment_number,
        e.status as existing_status,
        e.is_adult_student as existing_is_adult
      FROM students s
      LEFT JOIN tp_internship_enrollments e ON s.id = e.student_id AND e.period = '2026 - 2027'
      WHERE 
        s.full_name ILIKE $1 OR 
        s.run ILIKE $1 OR 
        REPLACE(REPLACE(s.run, '.', ''), '-', '') ILIKE $2
      ORDER BY s.full_name ASC
      LIMIT 15
    `, [`%${q}%`, `%${cleanQ}%`]);

    res.json(result.rows);
  } catch (err: any) {
    console.error('❌ Error en GET /api/tp-internships/search-student:', err);
    res.status(500).json({ error: 'Error al buscar estudiante.' });
  }
});

// POST /api/tp-internships - Crear o registrar matrícula de práctica
router.post('/', authMiddleware, checkRoles(['Admin', 'Director', 'Docente']), async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      is_external_or_graduate,
      student_run,
      student_name,
      specialty = 'Mecánica Industrial',
      generation_year = '2025',
      period = '2026 - 2027',
      enrollment_number,
      enrollment_date,
      status = 'Matriculado',
      modality = 'Regular / Estival',
      required_hours = 360,
      completed_hours = 0,
      start_date,
      end_date,
      schedule_shift = 'Jornada Completa',
      company_name,
      company_rut,
      company_address,
      company_commune = 'Yungay',
      company_phone,
      company_email,
      company_mentor_name,
      company_mentor_position,
      company_mentor_phone,
      company_mentor_email,
      school_tutor_teacher,
      final_grade,
      has_signed_agreement = false,
      has_school_insurance = true,
      has_practice_plan = false,
      has_final_evaluation = false,
      has_student_report = false,
      observations,
      guardian_name,
      guardian_phone,
      student_phone,
      student_address,
      student_email,
      student_commune,
      is_adult_student
    } = req.body;

    let resolvedStudentId = student_id;

    // Manejo de estudiantes de años anteriores / egresados fuera de la nómina regular
    if (is_external_or_graduate || !student_id) {
      if (!student_run || !student_name) {
        return res.status(400).json({ error: 'Debe ingresar el RUN y Nombre Completo del estudiante egresado.' });
      }

      const cleanRun = String(student_run).replace(/[\.\-]/g, '').trim().toUpperCase();
      const degreeDesc = `Egresado ${generation_year || 'Anterior'} (${specialty || 'Técnico Profesional'})`;

      // Buscar si ya existe en la base de datos por RUN o ID
      const existingStu = await query(
        "SELECT id, full_name, desc_grado FROM students WHERE REPLACE(REPLACE(run, '.', ''), '-', '') = $1 OR id = $2",
        [cleanRun, student_id || '']
      );

      if (existingStu.rows.length > 0) {
        resolvedStudentId = existingStu.rows[0].id;
        await query(`
          UPDATE students SET
            full_name = COALESCE($1, full_name),
            desc_grado = COALESCE($2, desc_grado),
            phone = COALESCE($3, phone),
            email = COALESCE($4, email),
            address = COALESCE($5, address),
            commune = COALESCE($6, commune),
            guardian_name = COALESCE($7, guardian_name),
            guardian_phone = COALESCE($8, guardian_phone),
            status = 'Active'
          WHERE id = $9
        `, [
          student_name.trim().toUpperCase(),
          degreeDesc,
          student_phone || null,
          student_email || null,
          student_address || null,
          student_commune || 'Yungay',
          guardian_name || null,
          guardian_phone || null,
          resolvedStudentId
        ]);
      } else {
        resolvedStudentId = `STU-EGR-${cleanRun}`;
        await query(`
          INSERT INTO students (
            id, run, full_name, desc_grado, status, academic_year,
            address, commune, email, phone, mobile_phone,
            guardian_name, guardian_phone, emergency_contact_name, emergency_contact_phone,
            profesor_jefe, is_retired, created_at
          ) VALUES (
            $1, $2, $3, $4, 'Active', 2026,
            $5, $6, $7, $8, $8,
            $9, $10, $9, $10,
            $11, 0, NOW()
          )
        `, [
          resolvedStudentId,
          String(student_run).trim().toUpperCase(),
          String(student_name).trim().toUpperCase(),
          degreeDesc,
          student_address || null,
          student_commune || 'Yungay',
          student_email || null,
          student_phone || null,
          guardian_name || null,
          guardian_phone || null,
          school_tutor_teacher || null
        ]);
      }
    }

    if (!resolvedStudentId) {
      return res.status(400).json({ error: 'Debe seleccionar o ingresar un estudiante para la matrícula.' });
    }

    // Verificar si el estudiante ya tiene matrícula en este período
    const existing = await query(
      'SELECT id, enrollment_number FROM tp_internship_enrollments WHERE student_id = $1 AND period = $2',
      [resolvedStudentId, period]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: `Este estudiante ya cuenta con matrícula de práctica para el período ${period} (Folio: ${existing.rows[0].enrollment_number}).` 
      });
    }

    // Generar correlativo de matrícula de práctica automático si no se ingresó
    let autoFolio = enrollment_number;
    if (!autoFolio) {
      const countRes = await query('SELECT COUNT(*) as c FROM tp_internship_enrollments WHERE period = $1', [period]);
      const nextNum = parseInt(countRes.rows[0]?.c || '0', 10) + 1;
      autoFolio = `PRAC-${String(period).split('-')[0].trim().slice(-2)}-${String(nextNum).padStart(3, '0')}`;
    }

    let resolvedIsAdult = Boolean(is_adult_student);
    if (!resolvedIsAdult && resolvedStudentId) {
      const stuCheck = await query('SELECT desc_grado, birth_date FROM students WHERE id = $1', [resolvedStudentId]);
      if (stuCheck.rows.length > 0) {
        const row = stuCheck.rows[0];
        if (row.desc_grado && row.desc_grado.toLowerCase().includes('egresad')) {
          resolvedIsAdult = true;
        }
      }
    }

    const id = `PRAC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const eDate = enrollment_date || new Date().toISOString().slice(0, 10);

    await query(`
      INSERT INTO tp_internship_enrollments (
        id, student_id, period, enrollment_number, enrollment_date, status, modality,
        required_hours, completed_hours, start_date, end_date, schedule_shift,
        company_name, company_rut, company_address, company_commune, company_phone, company_email,
        company_mentor_name, company_mentor_position, company_mentor_phone, company_mentor_email,
        school_tutor_teacher, final_grade, has_signed_agreement, has_school_insurance,
        has_practice_plan, has_final_evaluation, has_student_report, observations,
        is_adult_student
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      )
    `, [
      id, resolvedStudentId, period, autoFolio, eDate, status, modality,
      required_hours || 360, completed_hours || 0, start_date || null, end_date || null, schedule_shift,
      company_name || null, company_rut || null, company_address || null, company_commune || 'Yungay', company_phone || null, company_email || null,
      company_mentor_name || null, company_mentor_position || null, company_mentor_phone || null, company_mentor_email || null,
      school_tutor_teacher || null, final_grade ? parseFloat(final_grade) : null,
      Boolean(has_signed_agreement), Boolean(has_school_insurance), Boolean(has_practice_plan),
      Boolean(has_final_evaluation), Boolean(has_student_report), observations || null,
      resolvedIsAdult
    ]);

    // Actualizar datos de contacto y apoderado en la ficha del estudiante si fueron editados
    if (guardian_name || guardian_phone || student_phone || student_address || student_email || student_commune) {
      await query(`
        UPDATE students SET
          guardian_name = COALESCE($1, guardian_name),
          guardian_phone = COALESCE($2, guardian_phone),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address),
          email = COALESCE($5, email),
          commune = COALESCE($6, commune)
        WHERE id = $7
      `, [
        guardian_name || null,
        guardian_phone || null,
        student_phone || null,
        student_address || null,
        student_email || null,
        student_commune || null,
        resolvedStudentId
      ]);
    }

    await logAudit(req, 'ENROLL_TP_INTERNSHIP', `Matrícula de práctica creada (${autoFolio}) para alumno ${resolvedStudentId} en período ${period}.`);

    res.json({ success: true, id, enrollment_number: autoFolio, message: 'Matrícula de práctica creada exitosamente.' });
  } catch (err: any) {
    console.error('❌ Error en POST /api/tp-internships:', err);
    res.status(500).json({ error: 'Error al registrar matrícula de práctica.' });
  }
});

// PUT /api/tp-internships/:id - Actualizar datos de matrícula de práctica
router.put('/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      period,
      enrollment_number,
      enrollment_date,
      status,
      modality,
      required_hours,
      completed_hours,
      start_date,
      end_date,
      schedule_shift,
      company_name,
      company_rut,
      company_address,
      company_commune,
      company_phone,
      company_email,
      company_mentor_name,
      company_mentor_position,
      company_mentor_phone,
      company_mentor_email,
      school_tutor_teacher,
      final_grade,
      has_signed_agreement,
      has_school_insurance,
      has_practice_plan,
      has_final_evaluation,
      has_student_report,
      observations,
      guardian_name,
      guardian_phone,
      student_phone,
      student_address,
      student_email,
      student_commune,
      is_adult_student
    } = req.body;

    await query(`
      UPDATE tp_internship_enrollments SET
        period = COALESCE($1, period),
        enrollment_number = COALESCE($2, enrollment_number),
        enrollment_date = COALESCE($3, enrollment_date),
        status = COALESCE($4, status),
        modality = COALESCE($5, modality),
        required_hours = COALESCE($6, required_hours),
        completed_hours = COALESCE($7, completed_hours),
        start_date = $8,
        end_date = $9,
        schedule_shift = COALESCE($10, schedule_shift),
        company_name = $11,
        company_rut = $12,
        company_address = $13,
        company_commune = COALESCE($14, company_commune),
        company_phone = $15,
        company_email = $16,
        company_mentor_name = $17,
        company_mentor_position = $18,
        company_mentor_phone = $19,
        company_mentor_email = $20,
        school_tutor_teacher = $21,
        final_grade = $22,
        has_signed_agreement = COALESCE($23, has_signed_agreement),
        has_school_insurance = COALESCE($24, has_school_insurance),
        has_practice_plan = COALESCE($25, has_practice_plan),
        has_final_evaluation = COALESCE($26, has_final_evaluation),
        has_student_report = COALESCE($27, has_student_report),
        observations = $28,
        is_adult_student = COALESCE($29, is_adult_student),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $30
    `, [
      period || null,
      enrollment_number || null,
      enrollment_date || null,
      status || null,
      modality || null,
      required_hours !== undefined ? parseInt(required_hours, 10) : null,
      completed_hours !== undefined ? parseInt(completed_hours, 10) : null,
      start_date || null,
      end_date || null,
      schedule_shift || null,
      company_name || null,
      company_rut || null,
      company_address || null,
      company_commune || null,
      company_phone || null,
      company_email || null,
      company_mentor_name || null,
      company_mentor_position || null,
      company_mentor_phone || null,
      company_mentor_email || null,
      school_tutor_teacher || null,
      final_grade !== undefined && final_grade !== null && final_grade !== '' ? parseFloat(final_grade) : null,
      has_signed_agreement !== undefined ? Boolean(has_signed_agreement) : null,
      has_school_insurance !== undefined ? Boolean(has_school_insurance) : null,
      has_practice_plan !== undefined ? Boolean(has_practice_plan) : null,
      has_final_evaluation !== undefined ? Boolean(has_final_evaluation) : null,
      has_student_report !== undefined ? Boolean(has_student_report) : null,
      observations || null,
      is_adult_student !== undefined && is_adult_student !== null ? Boolean(is_adult_student) : null,
      id
    ]);

    // Sincronizar datos de apoderado y contacto si fueron modificados
    if (guardian_name || guardian_phone || student_phone || student_address || student_email || student_commune) {
      const sRes = await query('SELECT student_id FROM tp_internship_enrollments WHERE id = $1', [id]);
      if (sRes.rows.length > 0) {
        const sId = sRes.rows[0].student_id;
        await query(`
          UPDATE students SET
            guardian_name = COALESCE($1, guardian_name),
            guardian_phone = COALESCE($2, guardian_phone),
            phone = COALESCE($3, phone),
            address = COALESCE($4, address),
            email = COALESCE($5, email),
            commune = COALESCE($6, commune)
          WHERE id = $7
        `, [
          guardian_name || null,
          guardian_phone || null,
          student_phone || null,
          student_address || null,
          student_email || null,
          student_commune || null,
          sId
        ]);
      }
    }

    await logAudit(req, 'UPDATE_TP_INTERNSHIP', `Matrícula de práctica ${id} actualizada.`);
    res.json({ success: true, message: 'Matrícula de práctica actualizada exitosamente.' });
  } catch (err: any) {
    console.error('❌ Error en PUT /api/tp-internships/:id:', err);
    res.status(500).json({ error: 'Error al actualizar matrícula de práctica.' });
  }
});

// DELETE /api/tp-internships/:id - Eliminar matrícula de práctica
router.delete('/:id', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM tp_internship_enrollments WHERE id = $1', [id]);
    await logAudit(req, 'DELETE_TP_INTERNSHIP', `Matrícula de práctica ${id} eliminada.`);
    res.json({ success: true, message: 'Matrícula de práctica eliminada exitosamente.' });
  } catch (err: any) {
    console.error('❌ Error en DELETE /api/tp-internships/:id:', err);
    res.status(500).json({ error: 'Error al eliminar matrícula de práctica.' });
  }
});

export default router;
