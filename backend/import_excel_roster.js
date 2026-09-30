const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

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

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Convert Excel serial date to YYYY-MM-DD
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (!dateObj || dateObj.y === 1900) return null;
    const m = String(dateObj.m).padStart(2, '0');
    const d = String(dateObj.d).padStart(2, '0');
    return `${dateObj.y}-${m}-${d}`;
  }
  if (val instanceof Date) {
    if (val.getFullYear() === 1900) return null;
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (str.includes('1900') || !str) return null;
  return str;
}

async function runImport() {
  console.log('🚀 Iniciando importación de 418 estudiantes desde nomina_excel (16).xlsx a XAMPP MySQL...');

  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'ltp_local_db'
    });

    console.log('✅ Conexión establecida a la base de datos `ltp_local_db` en XAMPP.');

    // Crear/asegurar columnas adicionales
    const alterQueries = [
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year INT DEFAULT 2026",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS rbd INT DEFAULT 3941",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS cod_tipo_ensenanza INT",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS cod_grado INT",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS letra_curso VARCHAR(10)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS run_num VARCHAR(20)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS dv_run VARCHAR(5)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(10)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS first_name VARCHAR(150)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS paternal_surname VARCHAR(150)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS maternal_surname VARCHAR(150)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS commune VARCHAR(100)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS commune_code VARCHAR(20)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS ethnicity_code INT",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_date DATE",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS attendance_percentage DECIMAL(5,2)",
      "ALTER TABLE students ADD COLUMN IF NOT EXISTS final_average DECIMAL(3,1)"
    ];

    for (const q of alterQueries) {
      await connection.query(q).catch(() => {});
    }

    const excelPath = 'C:\\Users\\david\\Downloads\\nomina_excel (16).xlsx';
    const workbook = XLSX.readFile(excelPath);
    const sheetName = 'nomina_excel (16)';
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let count = 0;
    // Fila 0 es la cabecera
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;

      const year = r[0] || 2026;
      const rbd = r[1] || 3941;
      const codTipoEns = r[2];
      const codGrado = r[3];
      const descGradoRaw = String(r[4] || '').trim();
      const letraCurso = String(r[5] || 'A').trim();
      const runNum = r[6];
      const dvRun = r[7];
      const gender = String(r[8] || '').trim();
      const nombres = String(r[9] || '').trim();
      const apPaterno = String(r[10] || '').trim();
      const apMaterno = String(r[11] || '').trim();
      const direccion = String(r[12] || '').trim();
      const comuna = String(r[13] || '').trim();
      const codComuna = r[14];
      const email = String(r[15] || '').trim().toLowerCase();
      const telefono = r[16];
      const celular = r[17];
      const fechaNac = parseExcelDate(r[18]);
      const codEtnia = r[19];
      const fechaInc = parseExcelDate(r[20]);
      const fechaRet = parseExcelDate(r[21]);
      const asistencia = r[22] || 0;
      const promedio = r[23] || 0.0;

      if (!runNum) continue;

      const formattedRun = formatRut(runNum, dvRun);
      const studentId = `STU-${runNum}`;
      let courseName = `${descGradoRaw} ${letraCurso}`.trim();
      const cEns = Number(codTipoEns);
      const cGrad = Number(codGrado);

      if (cEns === 510 || descGradoRaw.includes('510') || descGradoRaw.includes('Industrial') || descGradoRaw.includes('Mecánica')) {
        courseName = cGrad === 4 ? `4° Medio Industrial (Mecánica Industrial) ${letraCurso}` : `3° Medio Industrial (Mecánica Industrial) ${letraCurso}`;
      } else if (cEns === 610 || descGradoRaw.includes('610') || descGradoRaw.includes('Párvulos') || descGradoRaw.includes('Técnico')) {
        courseName = cGrad === 4 ? `4° Medio Técnico Niños (Atención de Párvulos) ${letraCurso}` : `3° Medio Técnico Niños (Atención de Párvulos) ${letraCurso}`;
      } else if (descGradoRaw.startsWith('1er')) {
        courseName = `1er nivel de Transición (Pre-kinder) ${letraCurso}`;
      } else if (descGradoRaw.startsWith('2° nivel')) {
        courseName = `2° nivel de Transición (Kinder) ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('1° básico')) {
        courseName = `1° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('2° básico')) {
        courseName = `2° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('3° básico')) {
        courseName = `3° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('4° básico')) {
        courseName = `4° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('5° básico')) {
        courseName = `5° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('6° básico')) {
        courseName = `6° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('7° básico')) {
        courseName = `7° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('8° básico')) {
        courseName = `8° Básico ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('laboral')) {
        courseName = `Laboral 1 ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('1° medio')) {
        courseName = `1° Medio ${letraCurso}`;
      } else if (descGradoRaw.toLowerCase().includes('2° medio')) {
        courseName = `2° Medio ${letraCurso}`;
      }

      const fullName = `${apPaterno} ${apMaterno} ${nombres}`.trim();
      const isRetired = fechaRet !== null ? 1 : 0;
      const status = isRetired ? 'Withdrawn' : 'Active';

      const insertSql = `
        INSERT INTO students (
          id, run, full_name, desc_grado, status, is_retired, withdrawal_date,
          academic_year, rbd, cod_tipo_ensenanza, cod_grado, letra_curso,
          run_num, dv_run, gender, first_name, paternal_surname, maternal_surname,
          address, commune, commune_code, email, phone, mobile_phone,
          birth_date, ethnicity_code, enrollment_date, attendance_percentage, final_average
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        ) ON DUPLICATE KEY UPDATE
          run = VALUES(run),
          full_name = VALUES(full_name),
          desc_grado = VALUES(desc_grado),
          status = VALUES(status),
          is_retired = VALUES(is_retired),
          withdrawal_date = VALUES(withdrawal_date),
          email = VALUES(email),
          mobile_phone = VALUES(mobile_phone),
          address = VALUES(address)
      `;

      const vals = [
        studentId, formattedRun, fullName, courseName, status, isRetired, fechaRet,
        year, rbd, codTipoEns, codGrado, letraCurso,
        String(runNum), String(dvRun || ''), gender, nombres, apPaterno, apMaterno,
        direccion || null, comuna || null, String(codComuna || ''),
        email || null, telefono ? String(telefono) : null, celular ? String(celular) : null,
        fechaNac, codEtnia, fechaInc, asistencia, promedio
      ];

      await connection.query(insertSql, vals);
      count++;
    }

    await connection.end();
    console.log(`🎉 ¡ÉXITO TOTAL! Se procesaron e importaron ${count} estudiantes correctamente en XAMPP MySQL.`);

  } catch (err) {
    console.error('❌ Error durante la importación:', err.message);
  }
}

runImport();
