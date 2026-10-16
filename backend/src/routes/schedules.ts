import { Router, Request, Response } from 'express';
import multer from 'multer';
import { query } from '../config/db';
import { authMiddleware, checkRoles, logAudit } from '../middleware/auth';

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB para XML o planillas

const DAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado'
};

// =============================================================================
// 1. BLOQUES Y CAMPANAS ESCOLARES (school_periods)
// =============================================================================

// GET /api/schedules/periods - Listar bloques horarios
router.get('/periods', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM school_periods ORDER BY sort_order ASC, period_number ASC');
    res.json({ success: true, periods: result.rows || [] });
  } catch (err: any) {
    console.error('Error al obtener períodos escolares:', err);
    res.status(500).json({ error: 'Error al consultar bloques horarios.' });
  }
});

// POST /api/schedules/periods - Crear o actualizar bloque
router.post('/periods', authMiddleware, checkRoles(['Admin', 'Director', 'Jefe UTP', 'Inspector General']), async (req: Request, res: Response) => {
  try {
    const { id, period_number, period_name, start_time, end_time, is_break = false, shift = 'Mañana', sort_order = 1 } = req.body;
    if (!period_name || !start_time || !end_time) {
      return res.status(400).json({ error: 'Nombre, hora inicio y fin son obligatorios.' });
    }

    const periodId = id || `P-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    await query(`
      INSERT INTO school_periods (id, period_number, period_name, start_time, end_time, is_break, shift, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        period_number = EXCLUDED.period_number,
        period_name = EXCLUDED.period_name,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        is_break = EXCLUDED.is_break,
        shift = EXCLUDED.shift,
        sort_order = EXCLUDED.sort_order
    `, [periodId, parseInt(String(period_number || 1), 10), period_name, start_time, end_time, Boolean(is_break), shift, parseInt(String(sort_order || 1), 10)]);

    res.json({ success: true, message: 'Bloque horario guardado exitosamente.', id: periodId });
  } catch (err: any) {
    console.error('Error al guardar bloque horario:', err);
    res.status(500).json({ error: 'Error al guardar bloque horario.' });
  }
});

// =============================================================================
// 2. HORARIOS DE CLASES (class_schedules)
// =============================================================================

// GET /api/schedules - Consultar horarios por curso o por docente
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { course_name, teacher_name, academic_year = 2026, day_of_week } = req.query;
    let sql = 'SELECT * FROM class_schedules WHERE academic_year = $1';
    const params: any[] = [parseInt(String(academic_year), 10)];

    if (course_name && typeof course_name === 'string' && course_name.trim()) {
      params.push(`%${course_name.trim()}%`);
      sql += ` AND course_name ILIKE $${params.length}`;
    }

    if (teacher_name && typeof teacher_name === 'string' && teacher_name.trim()) {
      params.push(`%${teacher_name.trim()}%`);
      sql += ` AND teacher_name ILIKE $${params.length}`;
    }

    if (day_of_week) {
      params.push(parseInt(String(day_of_week), 10));
      sql += ` AND day_of_week = $${params.length}`;
    }

    sql += ' ORDER BY day_of_week ASC, period_number ASC, start_time ASC';

    const result = await query(sql, params);
    res.json({ success: true, schedules: result.rows || [] });
  } catch (err: any) {
    console.error('Error al consultar horarios:', err);
    res.status(500).json({ error: 'Error al consultar horarios de clases.' });
  }
});

// POST /api/schedules - Guardar o actualizar un bloque de horario
router.post('/', authMiddleware, checkRoles(['Admin', 'Director', 'Jefe UTP', 'Inspector General', 'Coordinador']), async (req: Request, res: Response) => {
  try {
    const {
      id,
      academic_year = 2026,
      course_name,
      day_of_week,
      period_number,
      start_time,
      end_time,
      subject_name,
      teacher_name,
      classroom = 'Sala de Clases',
      source = 'manual'
    } = req.body;

    if (!course_name || !day_of_week || !period_number || !subject_name) {
      return res.status(400).json({ error: 'Curso, día, bloque y asignatura son obligatorios.' });
    }

    const dayNum = parseInt(String(day_of_week), 10);
    const dayName = DAY_NAMES[dayNum] || `Día ${dayNum}`;
    const pNum = parseInt(String(period_number), 10);
    const schedId = id || `SCHED-${course_name.replace(/\s+/g, '')}-D${dayNum}-P${pNum}-${Math.random().toString(36).substring(2, 5)}`;

    await query(`
      INSERT INTO class_schedules (
        id, academic_year, course_name, day_of_week, day_name,
        period_number, start_time, end_time, subject_name, teacher_name, classroom, source, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO UPDATE SET
        subject_name = EXCLUDED.subject_name,
        teacher_name = EXCLUDED.teacher_name,
        classroom = EXCLUDED.classroom,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        source = EXCLUDED.source,
        updated_at = NOW()
    `, [
      schedId,
      parseInt(String(academic_year), 10),
      course_name,
      dayNum,
      dayName,
      pNum,
      start_time || '08:00',
      end_time || '09:30',
      subject_name,
      teacher_name || 'Sin Asignar',
      classroom,
      source
    ]);

    await logAudit(req, 'SAVE_SCHEDULE_BLOCK', `Horario asignado: ${course_name} | ${dayName} Bloque ${pNum} | ${subject_name} (${teacher_name}).`);

    res.json({ success: true, message: 'Bloque de horario guardado exitosamente.', id: schedId });
  } catch (err: any) {
    console.error('Error al guardar bloque de horario:', err);
    res.status(500).json({ error: 'Error al registrar bloque de horario.' });
  }
});

// DELETE /api/schedules/:id - Eliminar un bloque de horario
router.delete('/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Jefe UTP', 'Inspector General']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM class_schedules WHERE id = $1', [id]);
    res.json({ success: true, message: 'Bloque de horario eliminado exitosamente.' });
  } catch (err: any) {
    console.error('Error al eliminar horario:', err);
    res.status(500).json({ error: 'Error al eliminar bloque de horario.' });
  }
});

// DELETE /api/schedules/course/:courseName - Limpiar horario completo de un curso
router.delete('/course/:courseName', authMiddleware, checkRoles(['Admin', 'Director', 'Jefe UTP']), async (req: Request, res: Response) => {
  try {
    const { courseName } = req.params;
    const { academic_year = 2026 } = req.query;
    await query('DELETE FROM class_schedules WHERE course_name = $1 AND academic_year = $2', [courseName, parseInt(String(academic_year), 10)]);
    await logAudit(req, 'CLEAR_COURSE_SCHEDULE', `Horario vaciado para curso ${courseName}.`);
    res.json({ success: true, message: `Horario del curso ${courseName} vaciado exitosamente.` });
  } catch (err: any) {
    console.error('Error al vaciar horario de curso:', err);
    res.status(500).json({ error: 'Error al limpiar horario del curso.' });
  }
});

// =============================================================================
// 3. IMPORTADOR NATIVO DE aSc HORARIOS (XML Y EXCEL/PORTAPAPELES)
// =============================================================================

// POST /api/schedules/import-asc - Parsear y cargar archivo XML o datos tabulares de aSc Horarios
router.post('/import-asc', authMiddleware, checkRoles(['Admin', 'Director', 'Jefe UTP', 'Coordinador']), upload.single('asc_file'), async (req: Request, res: Response) => {
  try {
    let xmlContent = '';
    const academicYear = parseInt(String(req.body.academic_year || 2026), 10);
    const replaceExisting = req.body.replace_existing === 'true' || req.body.replace_existing === true;

    if (req.file) {
      xmlContent = req.file.buffer.toString('utf-8');
    } else if (req.body.xml_content) {
      xmlContent = String(req.body.xml_content);
    } else if (req.body.raw_table) {
      // Manejar importación desde texto/Excel portapapeles
      const lines = String(req.body.raw_table).trim().split('\n');
      const imported: any[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(/[\t,;]/).map(c => c.trim());
        if (cols.length >= 4) {
          // Formato esperado: [Día, Bloque, Curso, Asignatura, Docente, Sala]
          const dayStr = cols[0];
          let dayNum = 1;
          if (/lunes/i.test(dayStr)) dayNum = 1;
          else if (/martes/i.test(dayStr)) dayNum = 2;
          else if (/mi[eé]rcoles/i.test(dayStr)) dayNum = 3;
          else if (/jueves/i.test(dayStr)) dayNum = 4;
          else if (/viernes/i.test(dayStr)) dayNum = 5;
          else dayNum = parseInt(dayStr, 10) || 1;

          const pNum = parseInt(cols[1].match(/\d+/)?.[0] || '1', 10);
          const course = cols[2];
          const subj = cols[3];
          const teacher = cols[4] || 'Sin Asignar';
          const room = cols[5] || 'Sala de Clases';

          const sid = `SCHED-${course.replace(/\s+/g, '')}-D${dayNum}-P${pNum}-${Math.random().toString(36).substring(2, 5)}`;
          await query(`
            INSERT INTO class_schedules (
              id, academic_year, course_name, day_of_week, day_name,
              period_number, start_time, end_time, subject_name, teacher_name, classroom, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'asc_excel')
            ON CONFLICT (id) DO UPDATE SET
              subject_name = EXCLUDED.subject_name,
              teacher_name = EXCLUDED.teacher_name,
              classroom = EXCLUDED.classroom,
              updated_at = NOW()
          `, [sid, academicYear, course, dayNum, DAY_NAMES[dayNum] || `Día ${dayNum}`, pNum, '08:00', '09:30', subj, teacher, room]);

          imported.push({ course, subj, teacher, dayNum, pNum });
        }
      }

      await logAudit(req, 'IMPORT_ASC_EXCEL', `Importadas ${imported.length} clases desde portapapeles/Excel aSc Horarios.`);
      return res.json({
        success: true,
        message: `Se importaron ${imported.length} bloques horarios correctamente desde el texto copiado de aSc Horarios.`,
        count: imported.length
      });
    }

    if (!xmlContent || !xmlContent.includes('<timetable')) {
      return res.status(400).json({ error: 'No se encontró un archivo XML válido de aSc Horarios.' });
    }

    // =========================================================================
    // PARSER NATIVO aSc TIMETABLES XML
    // =========================================================================
    // aSc Timetables XML tags: <subjects>, <teachers>, <classes>, <classrooms>, <periods>, <lessons>, <cards>
    const periodsMap: Record<string, { period: number; start: string; end: string; name: string }> = {};
    const subjectsMap: Record<string, string> = {};
    const teachersMap: Record<string, string> = {};
    const classesMap: Record<string, string> = {};
    const classroomsMap: Record<string, string> = {};
    const lessonsMap: Record<string, { subjectId: string; teacherIds: string; classIds: string }> = {};

    // 1. Períodos (<period name="..." short="..." period="1" starttime="08:00" endtime="09:30" />)
    const periodMatches = xmlContent.matchAll(/<period\s+([^>]+)>/gi);
    for (const m of periodMatches) {
      const attrs = m[1];
      const name = attrs.match(/name="([^"]+)"/i)?.[1] || '';
      const period = parseInt(attrs.match(/period="([^"]+)"/i)?.[1] || attrs.match(/id="([^"]+)"/i)?.[1] || '1', 10);
      const start = attrs.match(/starttime="([^"]+)"/i)?.[1] || '08:00';
      const end = attrs.match(/endtime="([^"]+)"/i)?.[1] || '09:30';
      const pid = attrs.match(/id="([^"]+)"/i)?.[1] || String(period);
      periodsMap[pid] = { period, start, end, name: name || `Bloque ${period}` };
    }

    // 2. Asignaturas (<subject id="s1" name="Lenguaje y Comunicación" short="Len" />)
    const subjectMatches = xmlContent.matchAll(/<subject\s+([^>]+)>/gi);
    for (const m of subjectMatches) {
      const attrs = m[1];
      const id = attrs.match(/id="([^"]+)"/i)?.[1];
      const name = attrs.match(/name="([^"]+)"/i)?.[1] || attrs.match(/short="([^"]+)"/i)?.[1];
      if (id && name) subjectsMap[id] = name;
    }

    // 3. Profesores (<teacher id="t1" firstname="David" lastname="Vidal" name="David Vidal" />)
    const teacherMatches = xmlContent.matchAll(/<teacher\s+([^>]+)>/gi);
    for (const m of teacherMatches) {
      const attrs = m[1];
      const id = attrs.match(/id="([^"]+)"/i)?.[1];
      const fn = attrs.match(/firstname="([^"]+)"/i)?.[1] || '';
      const ln = attrs.match(/lastname="([^"]+)"/i)?.[1] || '';
      const fullName = (attrs.match(/name="([^"]+)"/i)?.[1] || `${fn} ${ln}`).trim();
      if (id && fullName) teachersMap[id] = fullName;
    }

    // 4. Cursos (<class id="c1" name="1° Básico A" short="1A" />)
    const classMatches = xmlContent.matchAll(/<class\s+([^>]+)>/gi);
    for (const m of classMatches) {
      const attrs = m[1];
      const id = attrs.match(/id="([^"]+)"/i)?.[1];
      const name = attrs.match(/name="([^"]+)"/i)?.[1] || attrs.match(/short="([^"]+)"/i)?.[1];
      if (id && name) classesMap[id] = name;
    }

    // 5. Salas (<classroom id="r1" name="Sala 1" />)
    const classroomMatches = xmlContent.matchAll(/<classroom\s+([^>]+)>/gi);
    for (const m of classroomMatches) {
      const attrs = m[1];
      const id = attrs.match(/id="([^"]+)"/i)?.[1];
      const name = attrs.match(/name="([^"]+)"/i)?.[1];
      if (id && name) classroomsMap[id] = name;
    }

    // 6. Lecciones (<lesson id="l1" subjectid="s1" teacherids="t1" classids="c1" />)
    const lessonMatches = xmlContent.matchAll(/<lesson\s+([^>]+)>/gi);
    for (const m of lessonMatches) {
      const attrs = m[1];
      const id = attrs.match(/id="([^"]+)"/i)?.[1];
      const subjectId = attrs.match(/subjectid="([^"]+)"/i)?.[1] || '';
      const teacherIds = attrs.match(/teacherids="([^"]+)"/i)?.[1] || '';
      const classIds = attrs.match(/classids="([^"]+)"/i)?.[1] || '';
      if (id) lessonsMap[id] = { subjectId, teacherIds, classIds };
    }

    // 7. Tarjetas/Bloques (<card lessonid="l1" period="1" day="1" classroomids="r1" />)
    const cardMatches = xmlContent.matchAll(/<card\s+([^>]+)>/gi);
    const parsedCards: any[] = [];

    for (const m of cardMatches) {
      const attrs = m[1];
      const lessonId = attrs.match(/lessonid="([^"]+)"/i)?.[1];
      const periodRaw = attrs.match(/period="([^"]+)"/i)?.[1] || '1';
      const dayRaw = attrs.match(/day="([^"]+)"/i)?.[1] || '1';
      const classroomIds = attrs.match(/classroomids="([^"]+)"/i)?.[1] || '';

      if (!lessonId || !lessonsMap[lessonId]) continue;

      const lesson = lessonsMap[lessonId];
      const subjectName = subjectsMap[lesson.subjectId] || 'Asignatura aSc';
      const teacherName = teachersMap[lesson.teacherIds.split(',')[0]] || 'Sin Asignar';
      const courseName = classesMap[lesson.classIds.split(',')[0]] || 'Curso aSc';
      const classroom = classroomsMap[classroomIds.split(',')[0]] || 'Sala de Clases';

      // En aSc día puede venir como '10000' (Lunes), '01000' (Martes) o como número 1 a 5
      let dayNum = 1;
      if (/^[01]{5}$/.test(dayRaw)) {
        dayNum = dayRaw.indexOf('1') + 1;
      } else {
        dayNum = parseInt(dayRaw, 10) || 1;
      }

      const pInfo = periodsMap[periodRaw] || {
        period: parseInt(periodRaw, 10) || 1,
        start: '08:00',
        end: '09:30'
      };

      parsedCards.push({
        courseName,
        subjectName,
        teacherName,
        classroom,
        dayNum,
        pNum: pInfo.period,
        start: pInfo.start,
        end: pInfo.end
      });
    }

    if (parsedCards.length === 0) {
      return res.status(400).json({ error: 'El archivo XML no contiene tarjetas de horario (<card>) reconocibles.' });
    }

    if (replaceExisting) {
      await query('DELETE FROM class_schedules WHERE academic_year = $1', [academicYear]);
    }

    // Insertar registros en Supabase
    let insertedCount = 0;
    for (const card of parsedCards) {
      const sid = `ASC-${card.courseName.replace(/\s+/g, '')}-D${card.dayNum}-P${card.pNum}-${Math.random().toString(36).substring(2, 6)}`;
      await query(`
        INSERT INTO class_schedules (
          id, academic_year, course_name, day_of_week, day_name,
          period_number, start_time, end_time, subject_name, teacher_name, classroom, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'asc_xml')
        ON CONFLICT (id) DO UPDATE SET
          subject_name = EXCLUDED.subject_name,
          teacher_name = EXCLUDED.teacher_name,
          classroom = EXCLUDED.classroom,
          updated_at = NOW()
      `, [
        sid,
        academicYear,
        card.courseName,
        card.dayNum,
        DAY_NAMES[card.dayNum] || `Día ${card.dayNum}`,
        card.pNum,
        card.start,
        card.end,
        card.subjectName,
        card.teacherName,
        card.classroom
      ]);
      insertedCount++;
    }

    await logAudit(req, 'IMPORT_ASC_XML', `Importados exitosamente ${insertedCount} bloques de horario desde aSc Timetables XML.`);

    res.json({
      success: true,
      message: `¡Horario de aSc Horarios importado con éxito! Se cargaron ${insertedCount} bloques para ${Object.keys(classesMap).length} cursos.`,
      insertedCount,
      coursesCount: Object.keys(classesMap).length,
      teachersCount: Object.keys(teachersMap).length
    });
  } catch (err: any) {
    console.error('Error al importar archivo de aSc Horarios:', err);
    res.status(500).json({ error: 'Error al procesar archivo de aSc Horarios: ' + (err.message || 'Error interno') });
  }
});

export default router;
