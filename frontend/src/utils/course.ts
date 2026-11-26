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

export const sortStudentsList = <T extends any>(students: T[]): T[] => {
  return [...students].sort((a: any, b: any) => {
    const courseA = getStudentCourse(a);
    const courseB = getStudentCourse(b);
    const rankA = getCourseSortRank(courseA);
    const rankB = getCourseSortRank(courseB);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const rawNumA = typeof a?.list_number === 'number' ? a.list_number : parseInt(String(a?.list_number || 0), 10);
    const rawNumB = typeof b?.list_number === 'number' ? b.list_number : parseInt(String(b?.list_number || 0), 10);
    const numA = rawNumA > 0 ? rawNumA : 9999;
    const numB = rawNumB > 0 ? rawNumB : 9999;
    if (numA !== numB) {
      return numA - numB;
    }
    const nameA = String(a?.full_name || a?.Nombres || a?.name || '');
    const nameB = String(b?.full_name || b?.Nombres || b?.name || '');
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
 * Validador oficial de nivel: Determina si un curso pertenece a Educación Básica (1° a 6° Básico).
 * En estos niveles, la asignatura oficial MINEDUC es "Lenguaje y Comunicación" (ID 105).
 * A partir de 7° Básico a 4° Medio, la asignatura oficial es "Lengua y Literatura" (ID 116).
 */
export const isBasic1To6Course = (courseName: any): boolean => {
  if (!courseName) return false;
  const low = String(
    typeof courseName === 'string'
      ? courseName
      : (courseName.name || courseName.course || courseName.desc_grado || courseName.level_name || '')
  )
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return /\b[1-6](\xba|°|\s)?\s*basico/.test(low) || ['1', '2', '3', '4', '5', '6'].includes(low.trim());
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
      'Idioma Extranjero Inglés',
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
      'Idioma Extranjero Inglés',
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
      'Idioma Extranjero Inglés',
      'Educación Física y Salud',
      'Artes Visuales',
      'Música',
      'Tecnología',
      'Orientación',
      'Religión'
    ];
  }

  // 5. Educación Básica: 7° y 8° Básico (Lengua y Literatura, Idioma Extranjero Inglés, Tecnología)
  if (low.includes('7° básico') || low.includes('8° básico') || low.includes('7° basico') || low.includes('8° basico') || low.includes('7 basico') || low.includes('8 basico')) {
    return [
      'Lengua y Literatura',
      'Matemática',
      'Ciencias Naturales',
      'Historia, Geografía Y Cs. Sociales',
      'Idioma Extranjero Inglés',
      'Educación Física y Salud',
      'Artes Visuales',
      'Música',
      'Tecnología',
      'Orientación',
      'Religión'
    ];
  }

  // 6. Educación Básica: 1° a 6° Básico (Lenguaje y Comunicación, Idioma Extranjero Inglés, Tecnología)
  return [
    'Lenguaje y Comunicación',
    'Matemática',
    'Ciencias Naturales',
    'Historia, Geografía Y Cs. Sociales',
    'Idioma Extranjero Inglés',
    'Educación Física y Salud',
    'Artes Visuales',
    'Música',
    'Tecnología',
    'Orientación',
    'Religión'
  ];
};

export const OFFICIAL_SCHOOL_COURSES: string[] = [
  '1er nivel de Transición (Pre-kinder) A',
  '2° nivel de Transición (Kinder) A',
  '1° Básico A',
  '2° Básico A',
  '3° Básico A',
  '4° Básico A',
  '5° Básico A',
  '6° Básico A',
  '7° Básico A',
  '8° Básico A',
  'Laboral 1 A',
  '1° Medio A',
  '2° Medio A',
  '2° Medio B',
  '3° Medio Industrial (Mecánica Industrial) A',
  '3° Medio Técnico Niños (Atención de Párvulos) A',
  '4° Medio Industrial (Mecánica Industrial) A',
  '4° Medio Técnico Niños (Atención de Párvulos) A'
];

export const parseCourseMetadata = (courseName: string): {
  desc_grado: string;
  level_name: string;
  letra_curso: string;
  cod_tipo_ensenanza?: number;
  cod_grado?: number;
} => {
  const clean = String(courseName || '').trim();
  if (!clean || clean === 'Sin Curso') {
    return { desc_grado: '', level_name: '', letra_curso: 'A' };
  }
  const parts = clean.split(' ');
  const lastWord = (parts[parts.length - 1] || '').toUpperCase();
  const letra_curso = ['A', 'B', 'C', 'D'].includes(lastWord) ? lastWord : 'A';
  const low = clean.toLowerCase();

  let cod_tipo_ensenanza: number | undefined;
  let cod_grado: number | undefined;

  if (low.includes('pre-kinder') || low.includes('prekinder') || low.includes('1er nivel')) {
    cod_tipo_ensenanza = 10;
    cod_grado = 4;
  } else if (low.includes('kinder') || low.includes('2° nivel')) {
    cod_tipo_ensenanza = 10;
    cod_grado = 5;
  } else if (low.includes('laboral')) {
    cod_tipo_ensenanza = 299;
    cod_grado = 31;
  } else if (low.includes('básico') || low.includes('basico')) {
    cod_tipo_ensenanza = 110;
    const m = low.match(/([1-8])°?\s*b[aá]sico/);
    if (m) cod_grado = parseInt(m[1], 10);
  } else if (low.includes('medio')) {
    if (low.includes('párvulo') || low.includes('parvulo') || low.includes('técnico niños') || low.includes('tecnico ninos') || low.includes('610')) {
      cod_tipo_ensenanza = 610;
    } else if (low.includes('industrial') || low.includes('mecánica') || low.includes('mecanica') || low.includes('510')) {
      cod_tipo_ensenanza = 510;
    } else {
      cod_tipo_ensenanza = 310;
    }
    const m = low.match(/([1-4])°?\s*medio/);
    if (m) cod_grado = parseInt(m[1], 10);
  }

  return {
    desc_grado: clean,
    level_name: clean,
    letra_curso,
    cod_tipo_ensenanza,
    cod_grado
  };
};

/**
 * Calcula el próximo número de matrícula correlativo (ej: 2027-001) estrictamente
 * dentro del año académico destino, partiendo desde 1 si aún no hay matriculados en ese año.
 */
export const getNextEnrollmentNumberForYear = (
  students: any[],
  targetYear: number,
  excludeStudentId?: string
): string => {
  const yearInt = Number(targetYear) || new Date().getFullYear();
  const prefix = `${yearInt}-`;
  let maxSeq = 0;

  (students || []).forEach((s: any) => {
    if (!s) return;
    if (excludeStudentId && s.id === excludeStudentId) return;
    const raw = String(s.enrollment_number || s.numero_matricula || '').trim();
    if (!raw || raw === 'null' || raw === 'undefined') return;

    const sYear = getStudentYear(s);
    const belongsToTargetYear = sYear === yearInt || raw.startsWith(prefix);
    if (!belongsToTargetYear) return;

    if (raw.startsWith(prefix)) {
      const suffix = raw.slice(prefix.length).replace(/[^0-9]/g, '');
      const n = parseInt(suffix, 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    } else if (sYear === yearInt) {
      const parts = raw.split('-');
      const lastPart = parts[parts.length - 1].replace(/[^0-9]/g, '');
      const n = parseInt(lastPart, 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });

  return `${yearInt}-${String(maxSeq + 1).padStart(3, '0')}`;
};

/**
 * Proyecta el curso sugerido para el año siguiente manteniendo el estándar oficial MINEDUC/LTP.
 */
export const getSuggestedNextCourse = (
  studentOrCourse: any
): {
  currentCourse: string;
  nextCourse: string;
  isGraduating: boolean;
  is2doMedioBranchChoice: boolean;
} => {
  const currentCourse =
    typeof studentOrCourse === 'string'
      ? studentOrCourse
      : getStudentCourse(studentOrCourse);

  const low = (currentCourse || '').toLowerCase();
  const letterMatch = currentCourse.match(/\b([A-D])$/i);
  const letter = letterMatch ? letterMatch[1].toUpperCase() : 'A';

  if (low.includes('pre-kinder') || low.includes('prekinder') || low.includes('1er nivel')) {
    return { currentCourse, nextCourse: '2° nivel de Transición (Kinder) A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('kinder') || low.includes('2° nivel')) {
    return { currentCourse, nextCourse: '1° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('1° básico') || low.includes('1° basico')) {
    return { currentCourse, nextCourse: '2° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('2° básico') || low.includes('2° basico')) {
    return { currentCourse, nextCourse: '3° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('3° básico') || low.includes('3° basico')) {
    return { currentCourse, nextCourse: '4° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('4° básico') || low.includes('4° basico')) {
    return { currentCourse, nextCourse: '5° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('5° básico') || low.includes('5° basico')) {
    return { currentCourse, nextCourse: '6° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('6° básico') || low.includes('6° basico')) {
    return { currentCourse, nextCourse: '7° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('7° básico') || low.includes('7° basico')) {
    return { currentCourse, nextCourse: '8° Básico A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('8° básico') || low.includes('8° basico')) {
    return { currentCourse, nextCourse: '1° Medio A', isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('1° medio') || low.includes('1 medio')) {
    return { currentCourse, nextCourse: `2° Medio ${letter === 'B' ? 'B' : 'A'}`, isGraduating: false, is2doMedioBranchChoice: false };
  }
  if (low.includes('2° medio') || low.includes('2 medio')) {
    return {
      currentCourse,
      nextCourse: '3° Medio Industrial (Mecánica Industrial) A',
      isGraduating: false,
      is2doMedioBranchChoice: true
    };
  }
  if (low.includes('3° medio') || low.includes('3 medio')) {
    if (low.includes('párvulo') || low.includes('parvulo') || low.includes('técnico') || low.includes('tecnico') || low.includes('610')) {
      return {
        currentCourse,
        nextCourse: '4° Medio Técnico Niños (Atención de Párvulos) A',
        isGraduating: false,
        is2doMedioBranchChoice: false
      };
    }
    return {
      currentCourse,
      nextCourse: '4° Medio Industrial (Mecánica Industrial) A',
      isGraduating: false,
      is2doMedioBranchChoice: false
    };
  }
  if (low.includes('4° medio') || low.includes('4 medio')) {
    return {
      currentCourse,
      nextCourse: currentCourse,
      isGraduating: true,
      is2doMedioBranchChoice: false
    };
  }
  if (low.includes('laboral')) {
    return {
      currentCourse,
      nextCourse: 'Laboral 1 A',
      isGraduating: false,
      is2doMedioBranchChoice: false
    };
  }

  return {
    currentCourse: currentCourse || 'Sin Curso',
    nextCourse: currentCourse === 'Sin Curso' ? '' : currentCourse,
    isGraduating: false,
    is2doMedioBranchChoice: false
  };
};

export const getTodayIsoDate = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Prepara los datos de un estudiante de un año anterior (ej. 2026) para matricularlo
 * y actualizar su ficha en el nuevo año lectivo (ej. 2027), conservando el registro histórico.
 */
export const prepareStudentForYearEnrollment = (
  sourceStudent: any,
  targetYear: number,
  allStudents: any[],
  options?: { batchIndex?: number; batchTotal?: number }
): any => {
  const projection = getSuggestedNextCourse(sourceStudent);
  const nextEnrollmentNumber = getNextEnrollmentNumberForYear(allStudents, targetYear);
  const courseMeta = parseCourseMetadata(projection.nextCourse);

  // Calcular N° de lista correlativo dentro del curso sugerido del año destino
  const existingInTargetCourse = (allStudents || []).filter(
    (s: any) => getStudentYear(s) === targetYear && getStudentCourse(s) === projection.nextCourse
  );
  const maxListNum = existingInTargetCourse.reduce((max: number, s: any) => {
    const n = Number(s.list_number || 0);
    return !isNaN(n) && n > max ? n : max;
  }, 0);

  // Buscar profesor jefe ya asignado a ese curso (o en cursos 2026/2027)
  const targetTeacher =
    (allStudents || []).find((s: any) => getStudentYear(s) === targetYear && getStudentCourse(s) === projection.nextCourse && s.profesor_jefe)?.profesor_jefe ||
    (allStudents || []).find((s: any) => getStudentCourse(s) === projection.nextCourse && s.profesor_jefe && s.profesor_jefe !== 'Sin Asignar')?.profesor_jefe ||
    '';

  const todayIso = getTodayIsoDate();

  return {
    ...sourceStudent,
    // Desvincular ID e identificadores propios del año 2026 para crear registro limpio en targetYear
    id: undefined,
    anno: targetYear,
    academic_year: targetYear,
    entry_year: sourceStudent?.entry_year || getStudentYear(sourceStudent) || 2026,
    enrollment_number: nextEnrollmentNumber,
    numero_matricula: nextEnrollmentNumber,
    list_number: maxListNum + 1,
    // Curso proyectado 2027
    desc_grado: courseMeta.desc_grado,
    level_name: courseMeta.level_name,
    letra_curso: courseMeta.letra_curso,
    cod_tipo_ensenanza: courseMeta.cod_tipo_ensenanza ?? sourceStudent?.cod_tipo_ensenanza,
    cod_grado: courseMeta.cod_grado ?? sourceStudent?.cod_grado,
    profesor_jefe: targetTeacher,
    previous_school: sourceStudent?.previous_school || 'Liceo Técnico Profesional Campanario Marcos Delucchi Fonck',
    // Estado activo limpio para el nuevo período
    status: 'Active',
    is_retired: false,
    withdrawal_date: null,
    withdrawal_reason: null,
    fecha_retiro: null,
    // Fechas y funcionario responsable frescos
    enrollment_date: todayIso,
    incorporation_date: todayIso,
    enrolled_by_name: undefined,
    enrolled_by_run: undefined,
    enrolled_by_role: undefined,
    // Metadatos UI de continuidad (no afectan guardado SQL)
    _isContinuityFromPreviousYear: true,
    _clonedFromStudentId: sourceStudent?.id,
    _previousYear: getStudentYear(sourceStudent),
    _previousCourse: projection.currentCourse,
    _is2doMedioBranchChoice: projection.is2doMedioBranchChoice,
    _isGraduatingPreviousYear: projection.isGraduating,
    _batchIndex: options?.batchIndex,
    _batchTotal: options?.batchTotal
  };
};



