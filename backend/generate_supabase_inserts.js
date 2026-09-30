const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\david\\Downloads\\nomina_excel (16).xlsx';

if (!fs.existsSync(excelPath)) {
  console.error(`❌ No se encontró el archivo Excel en: ${excelPath}`);
  process.exit(1);
}

console.log('📖 Leyendo la segunda hoja del archivo Excel...');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[1] || 'nomina_excel (16)';
const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

console.log(`✅ Total de registros leídos: ${rawRows.length}`);

// Convertir fecha serie de Excel a formato YYYY-MM-DD
function parseExcelDate(val) {
  if (!val || val === 1 || val === '1') return null;
  if (typeof val === 'string' && val.includes('-')) return val;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || num <= 1000) return null;
  
  // Excel base date offset
  const dateObj = new Date(Math.round((num - (25567 + 2)) * 86400 * 1000));
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().split('T')[0];
}

// Escapar comillas para SQL
function cleanText(str) {
  if (str === undefined || str === null) return '';
  return String(str).trim().replace(/'/g, "''");
}

// 1. EXTRAER CURSOS ÚNICOS
const courseMap = new Map();
const communeMap = new Map();
const studentInserts = [];

rawRows.forEach((row, idx) => {
  const descGrado = cleanText(row['Desc Grado'] || '1° Medio');
  const letraCurso = cleanText(row['Letra Curso'] || 'A');
  const fullCourseName = `${descGrado} ${letraCurso}`;

  if (!courseMap.has(fullCourseName)) {
    courseMap.set(fullCourseName, courseMap.size + 1);
  }
  const levelId = courseMap.get(fullCourseName);

  const codigoComuna = cleanText(row['Código Comuna Residencia'] || '13101');
  const nombreComuna = cleanText(row['Comuna Residencia'] || 'SANTIAGO');
  if (!communeMap.has(codigoComuna)) {
    communeMap.set(codigoComuna, { codigo: codigoComuna, nombre: nombreComuna });
  }

  const runNum = String(row['Run'] || '').trim();
  const dvRun = String(row['Dígito Ver.'] || '').trim().toUpperCase();
  const runFull = runNum ? `${runNum}-${dvRun}` : `STU-${idx + 1}`;

  const id = `STU-${runNum || idx + 1}`;
  const firstName = cleanText(row['Nombres']);
  const patSurname = cleanText(row['Apellido Paterno']);
  const matSurname = cleanText(row['Apellido Materno']);
  const fullName = `${patSurname} ${matSurname} ${firstName}`.trim();

  const anno = parseInt(row['Año'] || 2026, 10);
  const rbd = parseInt(row['RBD'] || 3941, 10);
  const codTipoEnsenanza = parseInt(row['Cod Tipo Enseñanza'] || 10, 10);
  const codGrado = parseInt(row['Cod Grado'] || 1, 10);
  const gender = cleanText(row['Genero']);
  const address = cleanText(row['Dirección']);
  const email = cleanText(row['Email']);
  const mobilePhone = cleanText(row['Celular']);
  const birthDate = parseExcelDate(row['Fecha Nacimiento']);
  const codEtnia = parseInt(row['Código Etnia'] || 0, 10);
  const fechaInc = parseExcelDate(row['Fecha Incorporación Curso']);
  const fechaRetiro = parseExcelDate(row['Fecha Retiro']);
  const asistencia = parseFloat(row['%Asistenca'] || 100);
  const promedioFinal = parseFloat(row['Promedio Final'] || 0.0);
  const listNum = idx + 1;

  const birthDateSql = birthDate ? `'${birthDate}'` : 'NULL';
  const fechaIncSql = fechaInc ? `'${fechaInc}'` : 'NULL';
  const fechaRetiroSql = fechaRetiro ? `'${fechaRetiro}'` : 'NULL';

  studentInserts.push(`
INSERT INTO students (
  id, run, num_srn, dv_run, full_name, first_name, paternal_surname, maternal_surname,
  anno, rbd, cod_tipo_ensenanza, cod_grado, desc_grado, letra_curso,
  gender, address, cod_comuna_residencia, commune, email, mobile_phone,
  birth_date, cod_etnia, fecha_incorporacion_curso, withdrawal_date,
  porcentaje_asistencia, promedio_final, list_number, status
) VALUES (
  '${id}', '${runFull}', '${runNum}', '${dvRun}', '${fullName}', '${firstName}', '${patSurname}', '${matSurname}',
  ${anno}, ${rbd}, ${codTipoEnsenanza}, ${codGrado}, '${descGrado}', '${letraCurso}',
  '${gender}', '${address}', '${codigoComuna}', '${nombreComuna}', '${email}', '${mobilePhone}',
  ${birthDateSql}, ${codEtnia}, ${fechaIncSql}, ${fechaRetiroSql},
  ${asistencia}, ${promedioFinal}, ${listNum}, 'Active'
) ON CONFLICT (run) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  first_name = EXCLUDED.first_name,
  paternal_surname = EXCLUDED.paternal_surname,
  maternal_surname = EXCLUDED.maternal_surname,
  desc_grado = EXCLUDED.desc_grado,
  letra_curso = EXCLUDED.letra_curso,
  address = EXCLUDED.address,
  email = EXCLUDED.email,
  mobile_phone = EXCLUDED.mobile_phone;`);
});

// GENERAR ARCHIVO SQL COMPLETO
const schemaPath = path.join(__dirname, '..', 'database', 'unified_schema.sql');
const baseSchemaSql = fs.readFileSync(schemaPath, 'utf-8');

let fullSql = baseSchemaSql + '\n\n-- =============================================================================\n';
fullSql += '-- INSERCIÓN DE CURSOS EXTRAÍDOS DEL EXCEL (16 CURSOS ÚNICOS)\n';
fullSql += '-- =============================================================================\n';

Array.from(courseMap.entries()).forEach(([name, id]) => {
  fullSql += `INSERT INTO levels (id, name, total_capacity) VALUES (${id}, '${name}', 45) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
});

fullSql += '\n-- =============================================================================\n';
fullSql += `-- INSERCIÓN DE ESTUDIANTES REALES (${rawRows.length} ALUMNOS OFICIALES)\n`;
fullSql += '-- =============================================================================\n';
fullSql += studentInserts.join('\n');

const outputPath = path.join(__dirname, '..', 'database', 'supabase_full_seed.sql');
fs.writeFileSync(outputPath, fullSql, 'utf-8');

console.log(`🎉 Archivo SQL generado exitosamente en: ${outputPath}`);
console.log(`📊 Estadísticas: ${rawRows.length} alumnos, ${courseMap.size} cursos creados.`);
