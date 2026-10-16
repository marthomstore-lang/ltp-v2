import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.fuirjmpmrzhprbtbmxmi:Mavu%40182011199420@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function migrate() {
  console.log('--- Migrando tablas de horarios y planificación ---');

  // 1. Agregar weekly_sessions a annual_curriculum_plans si no existe
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'annual_curriculum_plans' AND column_name = 'weekly_sessions'
      ) THEN
        ALTER TABLE annual_curriculum_plans ADD COLUMN weekly_sessions INT DEFAULT 1;
      END IF;
    END $$;
  `);

  // 2. Agregar unit_name a lesson_plans si no existe para facilitar reportes
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lesson_plans' AND column_name = 'unit_name'
      ) THEN
        ALTER TABLE lesson_plans ADD COLUMN unit_name VARCHAR(255);
      END IF;
    END $$;
  `);

  // 3. Crear tabla de períodos / bloques horarios (school_periods)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS school_periods (
      id VARCHAR(100) PRIMARY KEY,
      period_number INT NOT NULL,
      period_name VARCHAR(100) NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      is_break BOOLEAN DEFAULT FALSE,
      shift VARCHAR(50) DEFAULT 'Mañana',
      sort_order INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 4. Crear tabla de horarios de clases (class_schedules)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_schedules (
      id VARCHAR(150) PRIMARY KEY,
      academic_year INT DEFAULT 2026,
      course_name VARCHAR(255) NOT NULL,
      day_of_week INT NOT NULL, -- 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes
      day_name VARCHAR(50) NOT NULL,
      period_number INT NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      subject_name VARCHAR(255) NOT NULL,
      teacher_name VARCHAR(255),
      classroom VARCHAR(100) DEFAULT 'Sala de Clases',
      source VARCHAR(50) DEFAULT 'manual', -- 'manual' | 'asc_xml' | 'asc_excel'
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // 5. Poblar períodos estándar de colegios chilenos si está vacía
  const countRes = await pool.query('SELECT COUNT(*) FROM school_periods');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    const standardPeriods = [
      { id: 'P1', num: 1, name: 'Bloque 1', start: '08:00', end: '09:30', is_break: false, order: 1 },
      { id: 'P_REC1', num: 0, name: 'Recreo Mañana', start: '09:30', end: '09:45', is_break: true, order: 2 },
      { id: 'P2', num: 2, name: 'Bloque 2', start: '09:45', end: '11:15', is_break: false, order: 3 },
      { id: 'P_REC2', num: 0, name: 'Recreo', start: '11:15', end: '11:30', is_break: true, order: 4 },
      { id: 'P3', num: 3, name: 'Bloque 3', start: '11:30', end: '13:00', is_break: false, order: 5 },
      { id: 'P_LUNCH', num: 0, name: 'Almuerzo', start: '13:00', end: '13:45', is_break: true, order: 6 },
      { id: 'P4', num: 4, name: 'Bloque 4', start: '13:45', end: '15:15', is_break: false, order: 7 },
      { id: 'P_REC3', num: 0, name: 'Recreo Tarde', start: '15:15', end: '15:25', is_break: true, order: 8 },
      { id: 'P5', num: 5, name: 'Bloque 5', start: '15:25', end: '16:55', is_break: false, order: 9 }
    ];

    for (const p of standardPeriods) {
      await pool.query(`
        INSERT INTO school_periods (id, period_number, period_name, start_time, end_time, is_break, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.num, p.name, p.start, p.end, p.is_break, p.order]);
    }
    console.log('Períodos escolares estándar de Chile insertados con éxito.');
  }

  // 6. Si no hay horarios cargados, poblar un set demostrativo con 1° Básico A y 7° Básico A
  const schedCount = await pool.query('SELECT COUNT(*) FROM class_schedules');
  if (parseInt(schedCount.rows[0].count, 10) === 0) {
    const demo = [
      { course: '1° Básico A', day: 1, dayName: 'Lunes', pNum: 1, start: '08:00', end: '09:30', subj: 'Lenguaje y Comunicación', teacher: 'David Eladio Vidal Molina', room: 'Sala 1' },
      { course: '1° Básico A', day: 1, dayName: 'Lunes', pNum: 2, start: '09:45', end: '11:15', subj: 'Matemática', teacher: 'Profesor de Matemática', room: 'Sala 1' },
      { course: '1° Básico A', day: 2, dayName: 'Martes', pNum: 1, start: '08:00', end: '09:30', subj: 'Lenguaje y Comunicación', teacher: 'David Eladio Vidal Molina', room: 'Sala 1' },
      { course: '1° Básico A', day: 3, dayName: 'Miércoles', pNum: 1, start: '08:00', end: '09:30', subj: 'Ciencias Naturales', teacher: 'Docente Ciencias', room: 'Lab Ciencias' },
      { course: '1° Básico A', day: 4, dayName: 'Jueves', pNum: 2, start: '09:45', end: '11:15', subj: 'Lenguaje y Comunicación', teacher: 'David Eladio Vidal Molina', room: 'Sala 1' },
      { course: '1° Básico A', day: 5, dayName: 'Viernes', pNum: 3, start: '11:30', end: '13:00', subj: 'Educación Física y Salud', teacher: 'Profesor Educación Física', room: 'Gimnasio' },

      { course: '7° Básico A', day: 1, dayName: 'Lunes', pNum: 1, start: '08:00', end: '09:30', subj: 'Lengua y Literatura', teacher: 'David Eladio Vidal Molina', room: 'Sala 7' },
      { course: '7° Básico A', day: 3, dayName: 'Miércoles', pNum: 2, start: '09:45', end: '11:15', subj: 'Lengua y Literatura', teacher: 'David Eladio Vidal Molina', room: 'Sala 7' },
      { course: '7° Básico A', day: 5, dayName: 'Viernes', pNum: 1, start: '08:00', end: '09:30', subj: 'Matemática', teacher: 'Profesor Matemática', room: 'Sala 7' }
    ];

    for (let i = 0; i < demo.length; i++) {
      const d = demo[i];
      const sid = `SCHED-${d.course.replace(/\s+/g, '')}-D${d.day}-P${d.pNum}`;
      await pool.query(`
        INSERT INTO class_schedules (id, academic_year, course_name, day_of_week, day_name, period_number, start_time, end_time, subject_name, teacher_name, classroom, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [sid, 2026, d.course, d.day, d.dayName, d.pNum, d.start, d.end, d.subj, d.teacher, d.room, 'manual']);
    }
    console.log('Horarios demostrativos insertados con éxito.');
  }

  console.log('--- Migración completada correctamente ---');
  await pool.end();
}

migrate().catch(err => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
