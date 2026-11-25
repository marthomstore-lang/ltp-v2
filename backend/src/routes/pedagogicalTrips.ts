import { Router, Request, Response } from 'express';
import { query } from '../config/db';
import { authMiddleware, checkRoles, logAudit } from '../middleware/auth';

const router = Router();

// -----------------------------------------------------------------------------
// SALIDAS PEDAGÓGICAS Y AUTORIZACIONES INSTITUCIONALES (LTP PRO 2.0)
// -----------------------------------------------------------------------------

// GET /api/pedagogical-trips - Listar todas las salidas pedagógicas con cantidad de alumnos
router.get('/', authMiddleware, async (req: Request, res: Response) => {
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
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
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
router.post('/', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Administrativo', 'Asistente', 'Asistente de la Educación']), async (req: Request, res: Response) => {
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
router.put('/:id', authMiddleware, checkRoles(['Admin', 'Director', 'Docente', 'Administrativo', 'Asistente', 'Asistente de la Educación']), async (req: Request, res: Response) => {
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
router.delete('/:id', authMiddleware, checkRoles(['Admin', 'Director']), async (req: Request, res: Response) => {
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

export default router;
