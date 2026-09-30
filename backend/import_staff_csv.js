const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function formatRut(runNum, dv) {
  if (!runNum) return '';
  const runStr = String(runNum).trim();
  const dvStr = dv !== undefined && dv !== null ? String(dv).trim().toUpperCase() : '';
  
  let formattedNum = runStr;
  if (runStr.length >= 7) {
    formattedNum = `${runStr.slice(0, -6)}.${runStr.slice(-6, -3)}.${runStr.slice(-3)}`;
  }
  return dvStr ? `${formattedNum}-${dvStr}` : formattedNum;
}

function parseCsvDate(dateStr) {
  if (!dateStr || dateStr === '--') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = parseInt(year, 10) > 30 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  return null;
}

async function runStaffImport() {
  console.log('🚀 Iniciando importación masiva de Docentes y Asistentes a XAMPP MySQL (Codificación latin1)...');

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'ltp_local_db'
  });

  console.log('✅ Conexión establecida a la base de datos `ltp_local_db` en XAMPP.');

  // 1. Asegurar campos en staff_profiles y users
  const alterQueries = [
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS run VARCHAR(50)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS first_name VARCHAR(150)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS paternal_surname VARCHAR(150)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS maternal_surname VARCHAR(150)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(10)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS birth_date DATE",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS staff_type VARCHAR(50)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS job_function VARCHAR(150)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS title VARCHAR(255)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS institution VARCHAR(255)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS contract_hours INT DEFAULT 44",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS classroom_hours INT DEFAULT 0",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS subject_specialty VARCHAR(255)",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS suitability_status VARCHAR(50) DEFAULT 'OK'",
    "ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS user_id VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_type VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS job_function VARCHAR(150)"
  ];

  for (const q of alterQueries) {
    await conn.query(q).catch(() => {});
  }

  const defaultPassHash = await bcrypt.hash('Ltp2026!', 10);

  let docCount = 0;
  let asistCount = 0;

  // 2. Procesar Docentes
  const docentesFile = 'C:\\Users\\david\\Downloads\\lista_docentes_rbd_3941_anio_2026 (4).csv';
  if (fs.existsSync(docentesFile)) {
    const lines = fs.readFileSync(docentesFile, 'latin1').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(';');
      if (cols.length < 10) continue;

      const runNum = cols[0].trim();
      const dvRun = cols[1].trim();
      const nombres = cols[2].trim();
      const apPaterno = cols[3].trim();
      const apMaterno = cols[4].trim();
      const genero = cols[5].trim();
      const fecNac = parseCsvDate(cols[6]);
      const funcionPrincipal = cols[9].trim() === '--' ? 'Docente de Aula' : cols[9].trim();
      const horasContrato = parseInt(cols[11] || '44', 10);
      const horasAula = parseInt(cols[15] || '0', 10);
      const sector = cols[18].trim() === '--' ? 'General' : cols[18].trim();
      const estado = cols[22].trim() || 'OK';

      if (!runNum) continue;

      const formattedRun = formatRut(runNum, dvRun);
      const fullName = `${apPaterno} ${apMaterno} ${nombres}`.trim();
      const userId = `USR-${runNum}`;
      const staffId = `STAFF-${runNum}`;

      // Insertar / Actualizar Usuario
      const userSql = `
        INSERT INTO users (id, run, name, email, password_hash, password_plain, role, staff_type, job_function)
        VALUES (?, ?, ?, ?, ?, 'Ltp2026!', 'Docente', 'Docente', ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          role = 'Docente',
          staff_type = 'Docente',
          job_function = VALUES(job_function)
      `;
      await conn.query(userSql, [userId, formattedRun, fullName, `${runNum}@liceocampanario.cl`, defaultPassHash, funcionPrincipal]);

      // Insertar / Actualizar Perfil de Staff
      const staffSql = `
        INSERT INTO staff_profiles (
          id, user_id, run, first_name, paternal_surname, maternal_surname, full_name,
          gender, birth_date, staff_type, job_function, title, institution,
          contract_hours, classroom_hours, subject_specialty, suitability_status,
          role, email, status
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, 'Docente', ?, 'Título Profesional Pedagógico', 'MINEDUC / Universidad',
          ?, ?, ?, ?,
          'Docente', ?, 'Active'
        ) ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          staff_type = 'Docente',
          job_function = VALUES(job_function),
          contract_hours = VALUES(contract_hours),
          classroom_hours = VALUES(classroom_hours),
          subject_specialty = VALUES(subject_specialty),
          suitability_status = VALUES(suitability_status)
      `;
      await conn.query(staffSql, [
        staffId, userId, formattedRun, nombres, apPaterno, apMaterno, fullName,
        genero, fecNac, funcionPrincipal, horasContrato, horasAula, sector, estado,
        `${runNum}@liceocampanario.cl`
      ]);

      docCount++;
    }
  }

  // 3. Procesar Asistentes de la Educación
  const asistentesFile = 'C:\\Users\\david\\Downloads\\lista_asistentes_rbd_3941_anio_2026.csv';
  if (fs.existsSync(asistentesFile)) {
    const lines = fs.readFileSync(asistentesFile, 'latin1').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(';');
      if (cols.length < 10) continue;

      const runNum = cols[0].trim();
      const dvRun = cols[1].trim();
      const nombres = cols[2].trim();
      const apPaterno = cols[3].trim();
      const apMaterno = cols[4].trim();
      const genero = cols[5].trim();
      const fecNac = parseCsvDate(cols[6]);
      const titulo = cols[9].trim();
      const institucion = cols[10].trim();
      const horasContrato = parseInt(cols[12] || '44', 10);
      const funcionUno = cols[13].trim() === 'SIN DATO / AGREGAR' ? titulo : cols[13].trim();
      const horasFuncion = parseInt(cols[15] || '0', 10);
      const estado = cols[19].trim() || 'HABILITADO';

      if (!runNum) continue;

      const formattedRun = formatRut(runNum, dvRun);
      const fullName = `${apPaterno} ${apMaterno} ${nombres}`.trim();
      const userId = `USR-${runNum}`;
      const staffId = `STAFF-${runNum}`;

      // Insertar / Actualizar Usuario
      const userSql = `
        INSERT INTO users (id, run, name, email, password_hash, password_plain, role, staff_type, job_function)
        VALUES (?, ?, ?, ?, ?, 'Ltp2026!', 'Administrativo', 'Asistente de la Educación', ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          role = 'Administrativo',
          staff_type = 'Asistente de la Educación',
          job_function = VALUES(job_function)
      `;
      await conn.query(userSql, [userId, formattedRun, fullName, `${runNum}@liceocampanario.cl`, defaultPassHash, funcionUno]);

      // Insertar / Actualizar Perfil de Staff
      const staffSql = `
        INSERT INTO staff_profiles (
          id, user_id, run, first_name, paternal_surname, maternal_surname, full_name,
          gender, birth_date, staff_type, job_function, title, institution,
          contract_hours, classroom_hours, subject_specialty, suitability_status,
          role, email, status
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, 'Asistente de la Educación', ?, ?, ?,
          ?, ?, ?, ?,
          'Asistente de la Educación', ?, 'Active'
        ) ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          staff_type = 'Asistente de la Educación',
          job_function = VALUES(job_function),
          title = VALUES(title),
          institution = VALUES(institution),
          contract_hours = VALUES(contract_hours),
          classroom_hours = VALUES(classroom_hours),
          suitability_status = VALUES(suitability_status)
      `;
      await conn.query(staffSql, [
        staffId, userId, formattedRun, nombres, apPaterno, apMaterno, fullName,
        genero, fecNac, funcionUno, titulo, institucion,
        horasContrato, horasFuncion, titulo, estado,
        `${runNum}@liceocampanario.cl`
      ]);

      asistCount++;
    }
  }

  await conn.end();
  console.log(`🎉 ¡ÉXITO TOTAL! Se procesaron e importaron ${docCount} Docentes y ${asistCount} Asistentes de la Educación (${docCount + asistCount} Funcionarios en total) con codificación latin1 en XAMPP MySQL.`);
}

runStaffImport();
