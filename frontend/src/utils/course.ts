/**
 * Utility helper to derive exact Chilean MINEDUC course names
 * distinguishing Code 510 (Industrial / Mecánica Industrial)
 * and Code 610 (Técnico Niños / Atención de Párvulos)
 */
export const getStudentCourse = (s: any): string => {
  if (!s) return 'Sin Curso';

  let raw = '';
  if (typeof s === 'string') {
    raw = s;
  } else if (s.desc_grado) {
    raw = s.desc_grado;
  } else if (s.level_name) {
    raw = s.level_name;
  } else if (s.course) {
    raw = s.course;
  } else if (s.name) {
    raw = s.name;
  }

  raw = (raw || '').trim();
  const rawLetter = (typeof s === 'object' && s.letra_curso) ? String(s.letra_curso).trim() : '';
  const letterStr = (rawLetter === 'null' || rawLetter === 'undefined') ? '' : rawLetter;
  const codEnse = typeof s === 'object' ? parseInt(String(s.cod_tipo_ensenanza || s.cod_ense || 0), 10) : 0;

  // Extraer letra (A o B) si ya está al final o en letra_curso
  let letter = letterStr;
  if (!letter || letter === 'null' || letter === 'undefined') {
    const parts = raw.split(' ');
    const lastWord = parts[parts.length - 1] || '';
    if (['A', 'B', 'C', 'D'].includes(lastWord.toUpperCase())) {
      letter = lastWord.toUpperCase();
    }
  }
  if (!letter || letter === 'null' || letter === 'undefined') letter = 'A';

  const low = raw.toLowerCase();

  // 1. Pre-Kinder
  if (low.includes('pre-kinder') || low.includes('prekinder') || low.includes('1er nivel')) {
    return `1er nivel de Transición (Pre-kinder) ${letter}`;
  }
  // 2. Kinder
  if (low.includes('kinder') || low.includes('2° nivel')) {
    return `2° nivel de Transición (Kinder) ${letter}`;
  }
  // 3. Básica 1° a 8°
  if (low.includes('1° básico') || low.includes('1° basico') || low.includes('1 basico')) return `1° Básico ${letter}`;
  if (low.includes('2° básico') || low.includes('2° basico') || low.includes('2 basico')) return `2° Básico ${letter}`;
  if (low.includes('3° básico') || low.includes('3° basico') || low.includes('3 basico')) return `3° Básico ${letter}`;
  if (low.includes('4° básico') || low.includes('4° basico') || low.includes('4 basico')) return `4° Básico ${letter}`;
  if (low.includes('5° básico') || low.includes('5° basico') || low.includes('5 basico')) return `5° Básico ${letter}`;
  if (low.includes('6° básico') || low.includes('6° basico') || low.includes('6 basico')) return `6° Básico ${letter}`;
  if (low.includes('7° básico') || low.includes('7° basico') || low.includes('7 basico')) return `7° Básico ${letter}`;
  if (low.includes('8° básico') || low.includes('8° basico') || low.includes('8 basico')) return `8° Básico ${letter}`;

  // 4. Laboral
  if (low.includes('laboral')) return `Laboral 1 ${letter}`;

  // 5. Media 1° y 2°
  if (low.includes('1° medio') || low.includes('1 medio')) return `1° Medio ${letter}`;
  if (low.includes('2° medio') || low.includes('2 medio')) return `2° Medio ${letter}`;

  // 6. 3° Medio TP
  if (low.includes('3° medio') || low.includes('3 medio')) {
    if (codEnse === 610 || (!codEnse && (low.includes('párvulo') || low.includes('parvulo') || low.includes('técnico') || low.includes('tecnico') || low.includes('610')))) {
      return `3° Medio Técnico Niños (Atención de Párvulos) ${letter}`;
    }
    if (codEnse === 510 || (!codEnse && (low.includes('industrial') || low.includes('mecánica') || low.includes('mecanica') || low.includes('510')))) {
      return `3° Medio Industrial (Mecánica Industrial) ${letter}`;
    }
    return `3° Medio Industrial (Mecánica Industrial) ${letter}`;
  }

  // 7. 4° Medio TP
  if (low.includes('4° medio') || low.includes('4 medio')) {
    if (codEnse === 610 || (!codEnse && (low.includes('párvulo') || low.includes('parvulo') || low.includes('técnico') || low.includes('tecnico') || low.includes('610')))) {
      return `4° Medio Técnico Niños (Atención de Párvulos) ${letter}`;
    }
    if (codEnse === 510 || (!codEnse && (low.includes('industrial') || low.includes('mecánica') || low.includes('mecanica') || low.includes('510')))) {
      return `4° Medio Industrial (Mecánica Industrial) ${letter}`;
    }
    return `4° Medio Industrial (Mecánica Industrial) ${letter}`;
  }

  return raw || 'Sin Curso';
};

/**
 * Official School Hierarchy Sorting:
 * Pre-Kinder -> Kinder -> 1° a 8° Básico -> Taller Laboral -> 1° Medio (A, B) -> 2° Medio (A, B) -> 3° Mecánica -> 3° Párvulos -> 4° Mecánica -> 4° Párvulos
 */
export const getCourseSortRank = (courseName: string): number => {
  if (!courseName) return 999;
  const name = String(courseName).toLowerCase().trim();

  // 1. Pre-Kinder
  if (name.includes('pre-kinder') || name.includes('prekinder') || name.includes('1er nivel de transición') || name.includes('transición 1')) {
    return 10;
  }

  // 2. Kinder
  if (name.includes('kinder') || name.includes('2° nivel de transición') || name.includes('transición 2')) {
    return 20;
  }

  // 3. Educación Básica 1° a 8°
  if (name.includes('1° básico') || name.includes('1° basico')) return 100 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('2° básico') || name.includes('2° basico')) return 110 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('3° básico') || name.includes('3° basico')) return 120 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('4° básico') || name.includes('4° basico')) return 130 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('5° básico') || name.includes('5° basico')) return 140 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('6° básico') || name.includes('6° basico')) return 150 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('7° básico') || name.includes('7° basico')) return 160 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('8° básico') || name.includes('8° basico')) return 170 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);

  // 4. Taller Laboral / Laboral 1
  if (name.includes('laboral')) return 180 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);

  // 5. Educación Media 1° y 2° (A y B)
  if (name.includes('1° medio') || name.includes('1 medio')) return 200 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);
  if (name.includes('2° medio') || name.includes('2 medio')) return 210 + (name.endsWith(' b') || name.includes(' b ') ? 1 : 0);

  // 6. 3° Medio TP: Mecánica Industrial (Mec) -> Párvulos (Parv)
  if ((name.includes('3° medio') || name.includes('3 medio')) && (name.includes('mecánica') || name.includes('mecanica') || name.includes('industrial') || name.includes('510'))) return 300;
  if ((name.includes('3° medio') || name.includes('3 medio')) && (name.includes('párvulos') || name.includes('parvulos') || name.includes('parvulo') || name.includes('técnico') || name.includes('tecnico') || name.includes('610'))) return 310;
  if (name.includes('3° medio') || name.includes('3 medio')) return 305;

  // 7. 4° Medio TP: Mecánica Industrial (Mec) -> Párvulos (Parv)
  if ((name.includes('4° medio') || name.includes('4 medio')) && (name.includes('mecánica') || name.includes('mecanica') || name.includes('industrial') || name.includes('510'))) return 400;
  if ((name.includes('4° medio') || name.includes('4 medio')) && (name.includes('párvulos') || name.includes('parvulos') || name.includes('parvulo') || name.includes('técnico') || name.includes('tecnico') || name.includes('610'))) return 410;
  if (name.includes('4° medio') || name.includes('4 medio')) return 405;

  return 900;
};

export const sortCoursesList = <T extends any>(courses: T[]): T[] => {
  return [...courses].sort((a: any, b: any) => {
    const nameA = typeof a === 'string' ? a : (a.name || a.courseName || a.desc_grado || getStudentCourse(a) || '');
    const nameB = typeof b === 'string' ? b : (b.name || b.courseName || b.desc_grado || getStudentCourse(b) || '');
    const rankA = getCourseSortRank(nameA);
    const rankB = getCourseSortRank(nameB);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });
};

/**
 * Utility helper to determine if a student is retired
 */
export const isStudentRetired = (s: any): boolean => {
  if (!s) return false;
  if (s.is_retired === true || s.is_retired === 'true') return true;
  if (s.withdrawal_date && String(s.withdrawal_date).trim() !== '' && String(s.withdrawal_date) !== 'null') return true;
  if (s.fecha_retiro && String(s.fecha_retiro).trim() !== '' && String(s.fecha_retiro) !== 'null') return true;
  if (s.status && (String(s.status).toLowerCase().includes('retirad') || String(s.status).toLowerCase().includes('inactive'))) return true;
  return false;
};

/**
 * Utility helper to get retirement date formatted as DD-MM-YYYY (Día-Mes-Año)
 */
export const getStudentWithdrawalDate = (s: any): string => {
  if (!s) return '';
  const raw = s.withdrawal_date || s.fecha_retiro || s.withdrawalDate || s.fechaRetiro || '';
  if (!raw || String(raw).trim() === '' || String(raw) === 'null') return '';

  const str = String(raw).trim();

  // If already in DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    return str.replace(/\//g, '-');
  }

  // Handle ISO string like "2026-03-27T03:00:00.000Z" or "2026-03-27"
  if (str.includes('T')) {
    const datePart = str.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
    }
  }

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [year, month, day] = str.slice(0, 10).split('-');
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // Handle Date object or other timestamp strings
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const y = parsed.getUTCFullYear();
    return `${d}-${m}-${y}`;
  }

  return str;
};

/**
 * Utility helper to derive the academic year of a student (defaults to 2026 for legacy records)
 */
export const getStudentYear = (s: any): number => {
  if (!s) return 2026;
  const raw = s.anno !== undefined && s.anno !== null && s.anno !== '' ? s.anno :
              (s.academic_year !== undefined && s.academic_year !== null && s.academic_year !== '' ? s.academic_year :
              (s.entry_year !== undefined && s.entry_year !== null && s.entry_year !== '' ? s.entry_year : null));
  const num = parseInt(String(raw), 10);
  if (!isNaN(num) && num >= 2000 && num <= 2100) {
    return num;
  }
  return 2026;
};

/**
 * Utility helper to determine if a course belongs to Educación Parvularia
 * (Pre-Kínder / Kínder / Niveles de Transición).
 * Parvularia does NOT have numeric grades (1.0 to 7.0) nor traditional subjects.
 * NOTE: Must NEVER match '3°/4° Medio Técnico Niños (Atención de Párvulos)'!
 */
export const isParvulariaCourse = (courseName: any): boolean => {
  if (!courseName) return false;
  const name = String(
    typeof courseName === 'string'
      ? courseName
      : (courseName.name || courseName.course || courseName.desc_grado || courseName.level_name || '')
  ).toLowerCase().trim();

  // Guard: If it belongs to Educación Media (e.g. Atención de Párvulos), it is NOT Parvularia
  if (
    name.includes('medio') ||
    name.includes('media') ||
    name.includes('técnico') ||
    name.includes('tecnico') ||
    name.includes('atención') ||
    name.includes('atencion')
  ) {
    return false;
  }

  // Guard: If it belongs to Educación Básica or Laboral, it is NOT Parvularia
  if (
    name.includes('básico') ||
    name.includes('basico') ||
    name.includes('laboral')
  ) {
    return false;
  }

  return (
    name.includes('pre-kinder') ||
    name.includes('prekinder') ||
    name.includes('kinder') ||
    name.includes('transición') ||
    name.includes('transicion') ||
    name.includes('párvulo') ||
    name.includes('parvulo') ||
    name.includes('parvularia')
  );
};

/**
 * Official Chilean MINEDUC Curriculum Subjects by Course Level:
 * - Parvularia: No numeric subjects ([]).
 * - 1° a 6° Básico: 10 subjects (Sin Filosofía).
 * - 7° y 8° Básico: 10 subjects (Sin Filosofía).
 * - 1° y 2° Medio: 10 subjects (Formación General, Sin Filosofía).
 * - 3° y 4° Medio TP Mecánica: Formación General (con Filosofía) + Módulos TP Mecánica.
 * - 3° y 4° Medio TP Párvulos: Formación General (con Filosofía) + Módulos TP Párvulos.
 * - Taller Laboral: Asignaturas especiales de formación laboral y adaptada.
 */
export const getDefaultSubjectsForCourse = (courseName: string): string[] => {
  if (!courseName || isParvulariaCourse(courseName)) {
    return [];
  }
  const low = String(courseName).toLowerCase().trim();

  // 1. Taller Laboral / Educación Especial
  if (low.includes('laboral')) {
    return [
      'Taller Laboral y Oficio',
      'Cálculo y Lenguaje Aplicado',
      'Autonomía Personal y Social',
      'Educación Física Adaptada'
    ];
  }

  // 2. 3° y 4° Medio Técnico Profesional - Mecánica Industrial
  if (
    (low.includes('3° medio') || low.includes('4° medio') || low.includes('3 medio') || low.includes('4 medio')) &&
    (low.includes('mecanica') || low.includes('mecánica') || low.includes('industrial') || low.includes('510'))
  ) {
    return [
      'Lengua y Literatura',
      'Matemática',
      'Inglés',
      'Educación Ciudadana',
      'Filosofía',
      'Ciencias Para La Ciudadanía',
      'Educación Física y Salud'
    ];
  }

  // 3. 3° y 4° Medio Técnico Profesional - Atención de Párvulos
  if (
    (low.includes('3° medio') || low.includes('4° medio') || low.includes('3 medio') || low.includes('4 medio')) &&
    (low.includes('párvulo') || low.includes('parvulo') || low.includes('niños') || low.includes('tecnico') || low.includes('técnico') || low.includes('610'))
  ) {
    return [
      'Lengua y Literatura',
      'Matemática',
      'Inglés',
      'Educación Ciudadana',
      'Filosofía',
      'Ciencias Para La Ciudadanía',
      'Educación Física y Salud'
    ];
  }

  // 4. 1° y 2° Medio (Formación General Científico-Humanista / TP Común - Sin Filosofía)
  if (low.includes('1° medio') || low.includes('2° medio') || low.includes('1 medio') || low.includes('2 medio')) {
    return [
      'Lengua y Literatura',
      'Matemática',
      'Historia, Geografía Y Cs. Sociales',
      'Ciencias Naturales',
      'Idioma Extranjero Ingles',
      'Educación Física y Salud',
      'Artes Visuales',
      'Música',
      'Educación Tecnológica',
      'Orientación',
      'Religión'
    ];
  }

  // 5. Educación Básica: 1° a 8° Básico (Currículum Oficial MINEDUC - Sin Filosofía)
  return [
    'Lenguaje y Comunicación',
    'Matemática',
    'Ciencias Naturales',
    'Historia, Geografía Y Cs. Sociales',
    'Inglés',
    'Educación Física y Salud',
    'Artes Visuales',
    'Música',
    'Tecnología',
    'Orientación',
    'Religión'
  ];
};

