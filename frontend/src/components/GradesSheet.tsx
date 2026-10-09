import React, { useState, useEffect, useMemo } from 'react';
import { Lock, Unlock, Save, Plus, Edit2, Trash2, Printer, ArrowUpDown, BarChart2, Layers, Star, BookOpen, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { PrintGradeReportModal } from './PrintGradeReportModal';
import { ReorderStudentsModal } from './ReorderStudentsModal';
import { CumulativeGradesModal } from './CumulativeGradesModal';
import {
  getStudentCourse,
  isStudentRetired,
  getStudentWithdrawalDate,
  sortCoursesList,
  isParvulariaCourse,
  getDefaultSubjectsForCourse
} from '../utils/course';

interface GradeColumn {
  id: string;
  title: string;
  position?: number;
  is_cumulative?: boolean;
  sub_evaluations_count?: number;
}

interface Student {
  id: string;
  run?: string;
  full_name: string;
  list_number?: number;
  enrollment_number?: string;
}

interface GradesSheetProps {
  token: string;
  initialCourseName?: string;
  initialSubjectName?: string;
  onBackToGrid?: () => void;
}

// 1 COLUMNA INICIAL POR DEFECTO (N1) - EL DOCENTE AGREGA MÁS SEGÚN REQUIERA
const defaultSingleColumn: GradeColumn[] = [
  { id: 'col-1', title: 'N1' }
];

export const GradesSheet: React.FC<GradesSheetProps> = ({
  token,
  initialCourseName,
  initialSubjectName,
  onBackToGrid
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [levelId, setLevelId] = useState<number>(1);
  const [subjectId, setSubjectId] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [period, setPeriod] = useState<string>('1er Semestre');

  // MODO DE ESCALA DE NOTAS: 'decimal' (ej: 6,5 / 6.5) vs 'entera' (ej: 65)
  const [gradeScaleMode, setGradeScaleMode] = useState<'decimal' | 'entera'>('decimal');

  const [allLevels, setAllLevels] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([]);
  const [coursesInfo, setCoursesInfo] = useState<any[]>([]);
  const [rawStudents, setRawStudents] = useState<any[]>([]);
  const [courseSubjectOrders, setCourseSubjectOrders] = useState<Record<string, any[]>>({});

  const [students, setStudents] = useState<Student[]>([]);
  const [columns, setColumns] = useState<GradeColumn[]>(defaultSingleColumn);
  const [gradesMap, setGradesMap] = useState<Record<string, number>>({});
  const gradesMapRef = React.useRef<Record<string, number>>({});
  const [editingCell, setEditingCell] = useState<{ key: string; text: string; freshFocus?: boolean } | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showReorderModal, setShowReorderModal] = useState<boolean>(false);
  const [selectedCumulativeCol, setSelectedCumulativeCol] = useState<GradeColumn | null>(null);
  const [cumulativeColumnsMap, setCumulativeColumnsMap] = useState<Record<string, { isCumulative: boolean; count: number }>>({});
  const [printCourseOverview, setPrintCourseOverview] = useState<any>(null);

  useEffect(() => {
    gradesMapRef.current = gradesMap;
  }, [gradesMap]);

  // FUNCIÓN PARA ORDENAR ALUMNOS STRICTAMENTE POR NÚMERO DE LISTA (NUMÉRICO)
  const sortStudentsByListNumber = (arr: Student[]) => {
    return [...arr].sort((a, b) => {
      const rawA = typeof a.list_number === 'number' ? a.list_number : parseInt(String(a.list_number || 0), 10);
      const rawB = typeof b.list_number === 'number' ? b.list_number : parseInt(String(b.list_number || 0), 10);
      const numA = rawA > 0 ? rawA : 9999;
      const numB = rawB > 0 ? rawB : 9999;
      if (numA !== numB) return numA - numB;
      return (a.full_name || '').localeCompare(b.full_name || '', 'es', { sensitivity: 'base' });
    });
  };

  // Helper de normalización para comparar nombres sin tildes ni mayúsculas
  const normalizeStr = (str: any) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Comprueba si un candidato (nombre, RUT, ID) coincide con el usuario conectado
  const isUserMatch = (cand: any) => {
    if (!user || !cand) return false;
    const c = normalizeStr(cand);
    const uName = normalizeStr(user.name);
    const uRun = normalizeStr(user.run).replace(/[^0-9k]/g, '');
    const cRun = c.replace(/[^0-9k]/g, '');
    const uId = normalizeStr(user.id);

    if (c === uName) return true;
    if (uId && c === uId) return true;
    if (uRun && cRun && uRun === cRun && uRun.length >= 6) return true;
    if (c.length > 5 && (uName.includes(c) || c.includes(uName))) return true;

    // Comparación independiente del orden de palabras (ej: "APELLIDOS NOMBRES" vs "NOMBRES APELLIDOS")
    const cWords = c.split(/\s+/).filter(w => w.length >= 3 && !['del', 'las', 'los', 'san'].includes(w));
    const uWords = uName.split(/\s+/).filter(w => w.length >= 3 && !['del', 'las', 'los', 'san'].includes(w));
    if (cWords.length >= 2 && uWords.length >= 2) {
      const matchCount = cWords.filter(cw =>
        uWords.includes(cw) ||
        (cw === 'insotroza' && uWords.includes('inostroza')) ||
        (cw === 'inostroza' && uWords.includes('insotroza'))
      ).length;
      const minRequired = Math.min(cWords.length, uWords.length);
      if (matchCount >= minRequired || matchCount >= 3) return true;
    }

    return false;
  };

  // Determina si el usuario conectado es Profesor(a) Jefe del curso especificado
  const isHomeroomTeacherOfCourse = (courseName: string): boolean => {
    if (isAdmin) return true;
    if (!user || !courseName) return false;
    const nCourse = normalizeStr(courseName);

    // 1. En tabla courses (campo teacher)
    const courseMatches = coursesInfo.filter(c => normalizeStr(c.name) === nCourse);
    if (courseMatches.some(c => isUserMatch(c.teacher))) return true;

    // 2. En nómina de alumnos (campo profesor_jefe)
    const studentMatch = rawStudents.find(s => {
      const sC = normalizeStr(getStudentCourse(s));
      return (sC === nCourse || normalizeStr(s.desc_grado) === nCourse) && isUserMatch(s.profesor_jefe);
    });
    if (studentMatch) return true;

    return false;
  };

  // CARGAR CURSOS, ESTUDIANTES, ASIGNATURAS, ASIGNACIONES DOCENTES Y ORDEN DE ASIGNATURAS
  useEffect(() => {
    Promise.all([
      fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ([])),
      fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ([])),
      fetch('/api/assignments', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ([])),
      fetch('/api/config/course-subject-order', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ orders: {} }))
    ]).then(([coursesRes, studentsData, subjectsData, assignmentsData, orderRes]) => {
      const cList = (coursesRes && Array.isArray(coursesRes.courses)) ? coursesRes.courses : [];
      const sList = Array.isArray(studentsData) ? studentsData : [];
      const subList = Array.isArray(subjectsData) ? subjectsData : [];
      const aList = Array.isArray(assignmentsData) ? assignmentsData : [];
      const orders = (orderRes && orderRes.orders && typeof orderRes.orders === 'object') ? orderRes.orders : {};

      setCoursesInfo(cList);
      setRawStudents(sList);
      setAllSubjects(subList);
      setTeacherAssignments(aList);
      setCourseSubjectOrders(orders);

      const savedCourses = cList.map((c: any) => c.name);
      const studentCourses = sList.map((s: any) => getStudentCourse(s)).filter(Boolean);
      // REGLA MINEDUC: Pre-Kínder y Kínder (Educación Parvularia) no se evalúan con notas numéricas
      // y no deben aparecer en la nómina de calificaciones.
      const combined = Array.from(new Set([...savedCourses, ...studentCourses]))
        .filter(c => !isParvulariaCourse(c));
      const sorted = sortCoursesList(combined);

      if (sorted.length > 0) {
        const usedIds = new Set<number>();
        setAllLevels(sorted.map((cName, idx) => {
          const nName = normalizeStr(cName);
          const foundCourse = cList.find((c: any) => normalizeStr(c.name) === nName);
          let canonicalId = foundCourse && foundCourse.level_id ? Number(foundCourse.level_id) : 0;
          if (!canonicalId || isNaN(canonicalId) || usedIds.has(canonicalId)) {
            canonicalId = idx + 1;
            while (usedIds.has(canonicalId)) canonicalId++;
          }
          usedIds.add(canonicalId);
          return { id: canonicalId, name: cName };
        }));
      } else {
        setAllLevels([]);
      }
    }).catch(() => {
      setAllLevels([]);
      setAllSubjects([]);
    });
  }, [token]);

  // 1. CURSOS PERMITIDOS SEGÚN ROL Y ASIGNACIONES
  const allowedLevels = useMemo(() => {
    if (isAdmin) return allLevels;
    if (!user) return [];

    return allLevels.filter(lvl => {
      const cName = lvl.name;
      const nCourse = normalizeStr(cName);

      // Si es Profesor Jefe de este curso -> TIENE ACCESO TOTAL AL CURSO
      if (isHomeroomTeacherOfCourse(cName)) return true;

      // Si tiene al menos una asignatura asignada en este curso -> TIENE ACCESO
      const hasAssignment = teacherAssignments.some(a => {
        const matchTeacher = isUserMatch(a.teacher_name || a.teacher_id) || isUserMatch(a.teacher_name_2 || a.teacher_id_2);
        if (!matchTeacher) return false;
        const aLevel = normalizeStr(a.level_name || a.level_id);
        return aLevel === nCourse || nCourse.includes(aLevel) || aLevel.includes(nCourse);
      });

      return hasAssignment;
    });
  }, [isAdmin, user, allLevels, coursesInfo, rawStudents, teacherAssignments]);

  const currentLevelObj = allowedLevels.find(l => l.id === levelId) || allowedLevels[0];
  const currentCourseName = currentLevelObj ? currentLevelObj.name : '';
  const isCurrentCourseHomeroom = isHomeroomTeacherOfCourse(currentCourseName);

  // 2. ASIGNATURAS PERMITIDAS PARA EL CURSO SELECCIONADO
  const allowedSubjects = useMemo(() => {
    if (!currentCourseName || !user) return [];

    // Pre-Kínder y Kínder no tienen asignaturas evaluadas con notas numéricas
    if (isParvulariaCourse(currentCourseName)) {
      return [];
    }

    // 1. Obtener las asignaturas oficiales que aplican a este curso específico
    const nCourse = normalizeStr(currentCourseName);
    const isBasic1To6 = /\b[1-6]\s*basico/.test(nCourse);

    const getCanonicalSubGroup = (nameOrId: any, idVal?: any): string => {
      const n = normalizeStr(nameOrId);
      const idStr = String(idVal ?? nameOrId ?? '').trim();
      if (idStr === '111' || idStr === '120' || n === 'educacion fisica y salud') return 'eq_ed_fisica';
      if (idStr === '115' || idStr === '117' || n === 'ingles' || n === 'idioma extranjero ingles') return 'eq_ingles';
      if (idStr === '105' || idStr === '116' || n === 'lenguaje y comunicacion' || n === 'lengua y literatura') return 'eq_lenguaje';
      if (idStr === '113' || idStr === '119' || n === 'tecnologia' || n === 'educacion tecnologica') return 'eq_tecnologia';
      return n || `id_${idStr}`;
    };

    const findSubjectInDb = (nameOrId: any, fallbackId?: any) => {
      const grp = getCanonicalSubGroup(nameOrId, fallbackId);
      if (grp === 'eq_ed_fisica') {
        return { id: 120, name: 'Educación Física y Salud' };
      }
      if (grp === 'eq_ingles') {
        return { id: 117, name: 'Idioma Extranjero Inglés' };
      }
      if (grp === 'eq_tecnologia') {
        return { id: 113, name: 'Tecnología' };
      }
      if (grp === 'eq_lenguaje') {
        return isBasic1To6
          ? { id: 105, name: 'Lenguaje y Comunicación' }
          : { id: 116, name: 'Lengua y Literatura' };
      }
      const n = normalizeStr(nameOrId);
      const fbStr = fallbackId !== undefined && fallbackId !== null ? String(fallbackId).trim() : '';
      let found = allSubjects.find(sub => (fbStr && String(sub.id) === fbStr) || String(sub.id) === String(nameOrId) || normalizeStr(sub.name) === n);
      if (!found && n.includes('historia')) {
        found = allSubjects.find(sub => normalizeStr(sub.name).includes('historia'));
      }
      return found;
    };

    const courseAssigns = teacherAssignments.filter(a => {
      const aLevel = normalizeStr(a.level_name || a.level_id);
      const isSameCourse = aLevel === nCourse || nCourse.includes(aLevel) || aLevel.includes(nCourse);
      if (!isSameCourse) return false;
      const tName = String(a.teacher_name || '').trim();
      return Boolean(tName && tName.toLowerCase() !== 'sin asignar');
    });

    const subMap = new Map<string, { id: number; name: string }>();

    // Si existe un orden personalizado para este curso, agregarlo primero
    if (courseSubjectOrders[currentCourseName] && Array.isArray(courseSubjectOrders[currentCourseName]) && courseSubjectOrders[currentCourseName].length > 0) {
      courseSubjectOrders[currentCourseName].forEach((s: any, idx: number) => {
        const found = findSubjectInDb(s.name, s.id);
        const numId = found ? Number(found.id) : (parseInt(String(s.id), 10) || (idx + 1));
        const subName = found ? found.name : s.name;
        const groupKey = getCanonicalSubGroup(subName, numId);
        if (subName && !subMap.has(groupKey)) {
          subMap.set(groupKey, { id: numId, name: subName });
        }
      });
    }

    // Agregar todas las asignaturas realmente asignadas a docentes en este curso (con su ID y denominación canónica)
    courseAssigns.forEach((a: any, idx: number) => {
      const found = findSubjectInDb(a.subject_name, a.subject_id);
      const numId = found ? Number(found.id) : (parseInt(String(a.subject_id), 10) || (idx + 100));
      const subName = found ? found.name : (a.subject_name || `Asignatura ${numId}`);
      const groupKey = getCanonicalSubGroup(subName, numId);
      if (subName && !subMap.has(groupKey)) {
        subMap.set(groupKey, { id: numId, name: subName });
      }
    });

    // Si aún no hay asignaturas (o para completar el plan base), usar currículum oficial MINEDUC del nivel
    if (subMap.size === 0) {
      const defaultNames = getDefaultSubjectsForCourse(currentCourseName);
      defaultNames.forEach((name, idx) => {
        const found = findSubjectInDb(name);
        const numId = found ? Number(found.id) : (idx + 1);
        const subName = found ? found.name : name;
        const groupKey = getCanonicalSubGroup(subName, numId);
        if (!subMap.has(groupKey)) {
          subMap.set(groupKey, { id: numId, name: subName });
        }
      });
    }

    let courseSubs: { id: number; name: string }[] = Array.from(subMap.values());

    // Si aún así no hay ninguna configurada para este curso, fallback a allSubjects
    if (courseSubs.length === 0) {
      courseSubs = allSubjects;
    }

    // 2. Si es Admin o es Profesor Jefe de este curso -> TIENE ACCESO A TODAS LAS ASIGNATURAS DEL CURSO
    if (isAdmin || isCurrentCourseHomeroom) {
      return courseSubs;
    }

    // 3. SI NO ES PROFESOR JEFE NI ADMIN -> SOLO VE LAS ASIGNATURAS QUE TIENE ASIGNADAS EN ESTE CURSO
    const myAssignmentsInCourse = teacherAssignments.filter(a => {
      const matchTeacher = isUserMatch(a.teacher_name || a.teacher_id) || isUserMatch(a.teacher_name_2 || a.teacher_id_2);
      if (!matchTeacher) return false;
      const aLevel = normalizeStr(a.level_name || a.level_id);
      return aLevel === nCourse || nCourse.includes(aLevel) || aLevel.includes(nCourse);
    });

    return courseSubs.filter(s => {
      const sNameNorm = normalizeStr(s.name);
      const sGroup = getCanonicalSubGroup(s.name, s.id);
      return myAssignmentsInCourse.some(a => {
        const aSubNorm = normalizeStr(a.subject_name || a.subject_id);
        const aGroup = getCanonicalSubGroup(a.subject_name, a.subject_id);
        return aGroup === sGroup || aSubNorm === sNameNorm || String(a.subject_id) === String(s.id) || aSubNorm.includes(sNameNorm) || sNameNorm.includes(aSubNorm);
      });
    });
  }, [isAdmin, currentCourseName, user, allSubjects, teacherAssignments, isCurrentCourseHomeroom, courseSubjectOrders]);

  // Sincronizar automáticamente con initialCourseName cuando se abre desde las tarjetas de cursos
  useEffect(() => {
    if (allowedLevels.length > 0 && initialCourseName) {
      const found = allowedLevels.find(l => normalizeStr(l.name) === normalizeStr(initialCourseName));
      if (found && found.id !== levelId) {
        setLevelId(found.id);
      }
    }
  }, [allowedLevels, initialCourseName]);

  // Asegurar que levelId siempre pertenezca a allowedLevels
  useEffect(() => {
    if (allowedLevels.length > 0 && !allowedLevels.some(l => l.id === levelId)) {
      if (initialCourseName) {
        const found = allowedLevels.find(l => normalizeStr(l.name) === normalizeStr(initialCourseName));
        if (found) {
          setLevelId(found.id);
          return;
        }
      }
      setLevelId(allowedLevels[0].id);
    }
  }, [allowedLevels, levelId, initialCourseName]);

  // Sincronizar automáticamente con initialSubjectName cuando se abre desde las tarjetas
  useEffect(() => {
    if (allowedSubjects.length > 0 && initialSubjectName && initialSubjectName !== 'Jefatura de Curso') {
      const found = allowedSubjects.find(s => normalizeStr(s.name) === normalizeStr(initialSubjectName));
      if (found && found.id !== subjectId) {
        setSubjectId(found.id);
      }
    }
  }, [allowedSubjects, initialSubjectName]);

  // Asegurar que subjectId siempre pertenezca a allowedSubjects
  useEffect(() => {
    if (allowedSubjects.length > 0 && !allowedSubjects.some(s => s.id === subjectId)) {
      if (initialSubjectName && initialSubjectName !== 'Jefatura de Curso') {
        const found = allowedSubjects.find(s => normalizeStr(s.name) === normalizeStr(initialSubjectName));
        if (found) {
          setSubjectId(found.id);
          return;
        }
      }
      setSubjectId(allowedSubjects[0].id);
    }
  }, [allowedSubjects, subjectId, initialSubjectName]);

  // ASIGNATURA ACTUAL Y DETECCIÓN DE ASIGNATURA CONCEPTUAL (RELIGIÓN / ORIENTACIÓN)
  const currentSubjectObj = allowedSubjects.find(s => s.id === subjectId) || allowedSubjects[0];
  const currentSubjectName = currentSubjectObj ? currentSubjectObj.name : '';

  const isConceptualSubject = (name: string): boolean => {
    const norm = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return norm.includes('religion') || norm.includes('orientacion');
  };
  const isConceptual = useMemo(() => isConceptualSubject(currentSubjectName), [currentSubjectName]);

  const conceptToNumber = (concept: string): number => {
    const c = (concept || '').toUpperCase().trim();
    if (c === 'MB' || c === 'M') return 7.0;
    if (c === 'B') return 5.5;
    if (c === 'S') return 4.5;
    if (c === 'I') return 3.0;
    const n = parseFloat(concept);
    return isNaN(n) ? 7.0 : n;
  };

  const numberToConcept = (val: number | string): string => {
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num) || num <= 0) return '';
    if (num >= 6.0) return 'MB';
    if (num >= 5.0) return 'B';
    if (num >= 4.0) return 'S';
    return 'I';
  };

  const getConceptBadgeStyle = (concept: string) => {
    const c = (concept || '').toUpperCase().trim();
    switch (c) {
      case 'MB':
        return { bg: '#dcfce7', color: '#15803d', border: '#86efac', label: 'MB (Muy Bueno)' };
      case 'B':
        return { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', label: 'B (Bueno)' };
      case 'S':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: 'S (Suficiente)' };
      case 'I':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', label: 'I (Insuficiente)' };
      default:
        return { bg: '#ffffff', color: '#64748b', border: '#cbd5e1', label: '-' };
    }
  };

  // Columnas regulares de evaluación (excluyendo columnas de promedio manual en asignaturas conceptuales)
  const evalColumns = useMemo(() => {
    if (!isConceptual) return columns;
    return columns.filter(c => c.title.toLowerCase().trim() !== 'promedio' && !c.id.includes('FINAL'));
  }, [columns, isConceptual]);

  // ID de la columna que almacena el promedio final conceptual
  const finalColumnId = useMemo(() => {
    const existing = columns.find(c => c.title.toLowerCase().trim() === 'promedio' || c.id.includes('FINAL'));
    if (existing) return existing.id;
    const periodCode = period.includes('2') ? 'S2' : 'S1';
    return `COL-${levelId}-${subjectId}-${periodCode}-FINAL`;
  }, [columns, levelId, subjectId, period]);

  // CARGAR ALUMNOS, COLUMNAS Y CALIFICACIONES
  useEffect(() => {
    if (!currentLevelObj || allowedSubjects.length === 0) {
      setStudents([]);
      setColumns(defaultSingleColumn);
      setGradesMap({});
      return;
    }

    // Esperar a que levelId y subjectId estén sincronizados con los cursos/asignaturas permitidos
    // para evitar disparar una petición fantasma del primer curso antes de aplicar initialCourseName
    const validLevel = allowedLevels.find(l => l.id === levelId);
    const validSubject = allowedSubjects.find(s => s.id === subjectId);
    if (!validLevel || !validSubject) {
      return;
    }

    let isCancelled = false;
    const courseParam = validLevel.name;
    const targetLevelId = validLevel.id;
    const targetSubjectId = validSubject.id;

    // Alumnos del nivel seleccionado (SIEMPRE ORDENADOS POR N° DE LISTA) Y FILTRADOS POR AÑO
    fetch(`/api/students?course=${encodeURIComponent(courseParam)}&year=${academicYear}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (isCancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setStudents(sortStudentsByListNumber(data));
        } else {
          setStudents([]);
        }
      })
      .catch(err => console.error(err));

    // Columnas (Iniciar con N1 o las que el docente haya creado)
    fetch(`/api/grade-columns?levelId=${targetLevelId}&subjectId=${targetSubjectId}&courseName=${encodeURIComponent(courseParam)}&subjectName=${encodeURIComponent(validSubject.name)}&academicYear=${academicYear}&period=${encodeURIComponent(period)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (isCancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((c: any) => ({
            ...c,
            is_cumulative: Boolean(Number(c.is_cumulative)) || c.is_cumulative === true || c.title?.toLowerCase().includes('acumulativ')
          }));
          setColumns(mapped);
          const cumMap: Record<string, { isCumulative: boolean; count: number }> = {};
          mapped.forEach((c: any) => {
            if (c.is_cumulative) {
              cumMap[c.id] = { isCumulative: true, count: 2 };
            }
          });
          setCumulativeColumnsMap(prev => ({ ...prev, ...cumMap }));
        } else {
          setColumns(defaultSingleColumn);
        }
      })
      .catch(() => {
        if (!isCancelled) setColumns(defaultSingleColumn);
      });

    // Calificaciones
    fetch(`/api/grades?levelId=${targetLevelId}&subjectId=${targetSubjectId}&courseName=${encodeURIComponent(courseParam)}&subjectName=${encodeURIComponent(validSubject.name)}&academicYear=${academicYear}&period=${encodeURIComponent(period)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (isCancelled) return;
        if (Array.isArray(data)) {
          const map: Record<string, number> = {};
          data.forEach((g: any) => {
            const rawVal = parseFloat(g.grade_value);
            if (!isNaN(rawVal)) {
              map[`${g.student_id}_${g.grade_column_id}`] = rawVal > 7.0 && rawVal <= 70.0 ? rawVal / 10.0 : rawVal;
            }
          });
          setGradesMap(map);
        }
      })
      .catch(err => console.error(err));

    // Reglas de Cierre Semestral / Candados por Curso y Asignatura
    fetch('/api/config/period-locks', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(locks => {
        if (isCancelled) return;
        if (!Array.isArray(locks) || locks.length === 0) {
          setIsLocked(false);
          return;
        }
        const targetCourse = normalizeStr(validLevel.name);
        const targetSubj = normalizeStr(validSubject.name);
        const targetPeriod = normalizeStr(period || '1er Semestre');

        let matchedPriority = -1;
        let lockedState = false;

        for (const rule of locks) {
          const rPeriod = normalizeStr(rule.period);
          const periodMatch =
            rPeriod === targetPeriod ||
            rPeriod.includes('ambos') ||
            rPeriod.includes('anual') ||
            rPeriod === 'todos' ||
            (targetPeriod.includes('final') && (rPeriod.includes('1er') || rPeriod.includes('2do')));
          if (!periodMatch) continue;

          const rCourse = normalizeStr(rule.level_name);
          const rSubj = normalizeStr(rule.subject_name);
          const isAllCourses = !rCourse || rCourse.includes('todos los cursos') || rCourse === 'todos' || rCourse === 'global';
          const isAllSubjects = !rSubj || rSubj.includes('todas las asignaturas') || rSubj === 'todas' || rSubj === 'todos';

          const courseMatches = isAllCourses || (targetCourse && (rCourse === targetCourse || targetCourse.includes(rCourse) || rCourse.includes(targetCourse)));
          const subjMatches = isAllSubjects || (targetSubj && rSubj === targetSubj);

          if (!courseMatches || !subjMatches) continue;

          let priority = 0;
          if (!isAllCourses && !isAllSubjects) priority = 3;
          else if (!isAllCourses && isAllSubjects) priority = 2;
          else if (isAllCourses && !isAllSubjects) priority = 1;
          else priority = 0;

          if (priority >= matchedPriority) {
            matchedPriority = priority;
            lockedState = Boolean(rule.is_locked);
          }
        }

        setIsLocked(lockedState);
      })
      .catch(() => {
        if (!isCancelled) setIsLocked(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [levelId, subjectId, academicYear, period, token, currentLevelObj, allowedLevels, allowedSubjects]);

  useEffect(() => {
    if (!showPrintModal || !currentCourseName) return;
    fetch(`/api/grades/course-overview?courseName=${encodeURIComponent(currentCourseName)}&year=${academicYear}&period=${encodeURIComponent(period)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.students)) {
          setPrintCourseOverview(data);
        }
      })
      .catch(() => {});
  }, [showPrintModal, currentCourseName, academicYear, period, token]);

  const dirtyCellsRef = React.useRef<Set<string>>(new Set());

  // CAMBIO LOCAL DE NOTA CON SOPORTE PARA CONCEPTOS (MB, B, S, I) Y ESCALA 10-70 / DECIMAL
  const handleGradeChange = (studentId: string, columnId: string, valStr: string) => {
    const st = students.find(s => s.id === studentId);
    if (st && isStudentRetired(st)) return;

    const key = `${studentId}_${columnId}`;
    dirtyCellsRef.current.add(key);

    if (!valStr || !valStr.trim()) {
      setEditingCell({ key, text: '', freshFocus: false });
      gradesMapRef.current = { ...gradesMapRef.current, [key]: 0 };
      setGradesMap(prev => ({ ...prev, [key]: 0 }));
      return;
    }

    if (isConceptual) {
      const v = valStr.toUpperCase().replace(/[^MBSI0-9.,]/g, '').slice(0, 2);
      setEditingCell({ key, text: v, freshFocus: false });
      let mappedVal = 0;
      if (v === 'MB' || v === 'M') mappedVal = 7.0;
      else if (v === 'B') mappedVal = 5.5;
      else if (v === 'S') mappedVal = 4.5;
      else if (v === 'I') mappedVal = 3.0;
      else {
        let num = parseFloat(v.replace(',', '.'));
        if (!isNaN(num) && num > 0) {
          if (num > 7.0 && num <= 70.0) num = num / 10.0;
          if (num >= 6.0) mappedVal = 7.0;
          else if (num >= 5.0) mappedVal = 5.5;
          else if (num >= 4.0) mappedVal = 4.5;
          else mappedVal = 3.0;
        }
      }

      gradesMapRef.current = { ...gradesMapRef.current, [key]: mappedVal };
      setGradesMap(prev => ({
        ...prev,
        [key]: mappedVal
      }));
      return;
    }

    let raw = valStr;
    const prevFormatted = formatCellValue(gradesMapRef.current[key]);

    // Si la casilla tenía un valor previo formateado (ej. "5,0") y al hacer clic el cursor quedó al final
    // sin reemplazar la selección (ej. el usuario tecleó "5" generando "5,05" o tecleó "4" generando "5,04"):
    if (editingCell?.key === key && editingCell.freshFocus && prevFormatted && raw.length > prevFormatted.length && raw.startsWith(prevFormatted)) {
      raw = raw.slice(prevFormatted.length);
    } else if (/^([1-7])[,.]0([1-9])$/.test(raw)) {
      raw = raw.replace(/^([1-7])[,.]0([1-9])$/, '$1,$2');
    }

    // Permitir dígitos y a lo sumo un separador decimal (coma o punto)
    let cleaned = raw.replace(/[^0-9,.]/g, '');
    const sepMatch = cleaned.match(/[,.]/);
    if (sepMatch && sepMatch.index !== undefined) {
      const intPart = cleaned.slice(0, sepMatch.index).slice(0, 1);
      const decPart = cleaned.slice(sepMatch.index + 1).replace(/[,.]/g, '').slice(0, 1);
      cleaned = `${intPart},${decPart}`;
    } else {
      // Sin coma ni punto (ej: "54"), permitir hasta 2 dígitos mientras escribe
      cleaned = cleaned.slice(0, 2);
    }

    setEditingCell({ key, text: cleaned, freshFocus: false });

    let val = parseFloat(cleaned.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      gradesMapRef.current = { ...gradesMapRef.current, [key]: 0 };
      setGradesMap(prev => ({ ...prev, [key]: 0 }));
      return;
    }

    // Normalizar escala enteros (ej: 54 -> 5.4, 65 -> 6.5)
    if (val > 7.0 && val <= 70.0) {
      val = Math.round((val / 10.0) * 10) / 10;
    } else if (val > 70.0) {
      val = 7.0;
    }

    gradesMapRef.current = { ...gradesMapRef.current, [key]: val };
    setGradesMap(prev => ({
      ...prev,
      [key]: val
    }));
  };

  // GUARDAR NOTA EN LA BASE DE DATOS
  const handleSaveGrade = async (studentId: string, columnId: string) => {
    const st = students.find(s => s.id === studentId);
    if (st && isStudentRetired(st)) return;

    const key = `${studentId}_${columnId}`;
    setEditingCell(prev => (prev?.key === key ? null : prev));

    if (!dirtyCellsRef.current.has(key)) return;
    dirtyCellsRef.current.delete(key);

    const val = gradesMapRef.current[key] ?? gradesMap[key] ?? 0;

    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId,
          gradeColumnId: columnId,
          gradeValue: val > 0 ? val : 0,
          levelId,
          subjectId,
          courseName: currentCourseName,
          subjectName: currentSubjectName,
          academicYear,
          period
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando calificación');

      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: val > 0 ? 'Nota guardada' : 'Nota eliminada', timer: 1000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Nota guardada en pantalla', timer: 1000, showConfirmButton: false });
    }
  };

  // FORMATO DE VISUALIZACIÓN DE NOTA EN CASILLA
  const formatCellValue = (val: number | string | undefined | null) => {
    if (val === undefined || val === null || val === '' || val === 0 || val === '0') return '';

    if (isConceptual) {
      if (typeof val === 'string' && ['MB', 'B', 'S', 'I'].includes(val.toUpperCase().trim())) {
        return val.toUpperCase().trim();
      }
      return numberToConcept(val);
    }

    let num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num) || num <= 0) return '';

    if (num > 7.0 && num <= 70.0) num = num / 10.0;

    if (gradeScaleMode === 'entera') {
      return Math.round(num * 10).toString();
    } else {
      return num.toFixed(1).replace('.', ',');
    }
  };

  // NAVEGACIÓN TIPO EXCEL POR TECLADO (ENTER, FLECHAS ARRIBA, ABAJO, IZQUIERDA, DERECHA)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    sIndex: number,
    cIndex: number,
    studentId: string,
    colId: string
  ) => {
    let targetS = sIndex;
    let targetC = cIndex;

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveGrade(studentId, colId);
      if (e.shiftKey) {
        targetS = Math.max(0, sIndex - 1);
      } else {
        targetS = Math.min(students.length - 1, sIndex + 1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleSaveGrade(studentId, colId);
      targetS = Math.min(students.length - 1, sIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSaveGrade(studentId, colId);
      targetS = Math.max(0, sIndex - 1);
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (
        input.selectionStart === input.value.length ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (cIndex < columns.length - 1) {
          e.preventDefault();
          handleSaveGrade(studentId, colId);
          targetC = cIndex + 1;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (
        input.selectionStart === 0 ||
        (input.selectionStart === 0 && input.selectionEnd === input.value.length)
      ) {
        if (cIndex > 0) {
          e.preventDefault();
          handleSaveGrade(studentId, colId);
          targetC = cIndex - 1;
        }
      }
    }

    if (targetS !== sIndex || targetC !== cIndex) {
      const targetElement = document.getElementById(`grade-input-${targetS}-${targetC}`) as HTMLInputElement | null;
      if (targetElement) {
        targetElement.focus();
        targetElement.select();
      }
    }
  };

  // RENOMBRAR LA COLUMNA / EVALUACIÓN
  const handleRenameColumn = async (col: GradeColumn) => {
    if (isLocked) return;
    const { value: newTitle } = await Swal.fire({
      title: 'Renombrar Evaluación',
      text: `Escribe el nuevo nombre para "${col.title}":`,
      input: 'text',
      inputValue: col.title,
      showCancelButton: true,
      confirmButtonText: 'Guardar Nombre',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Debes escribir un nombre válido para la evaluación.';
        }
      }
    });

    if (newTitle && newTitle.trim() !== '') {
      const cleanTitle = newTitle.trim();
      setColumns(prev => prev.map(c => c.id === col.id ? { ...c, title: cleanTitle } : c));

      try {
        await fetch('/api/grade-columns/rename', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ id: col.id, title: cleanTitle })
        });
      } catch (err) {
        console.error(err);
      }

      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Evaluación renombrada', timer: 1500, showConfirmButton: false });
    }
  };

  // ELIMINAR COLUMNA DE EVALUACIÓN CON DOBLE VERIFICACIÓN POR CONTRASEÑA
  const handleDeleteColumn = async (col: GradeColumn) => {
    if (isLocked) return;
    const result = await Swal.fire({
      title: '🔒 Doble Verificación de Seguridad',
      html: `
        <div style="font-size: 0.92rem; color: #1e293b; margin-bottom: 0.75rem; text-align: left;">
          ¿Estás seguro de eliminar la evaluación <strong>"${col.title}"</strong>?
        </div>
        <div style="font-size: 0.82rem; color: #991b1b; background: #fee2e2; padding: 0.65rem 0.85rem; border-radius: 8px; border: 1px solid #fca5a5; margin-bottom: 0.85rem; text-align: left; line-height: 1.45;">
          ⚠️ <strong>Advertencia Crítica:</strong> Se eliminará permanentemente esta columna y <strong>todas las calificaciones</strong> que hayan sido ingresadas en ella para los estudiantes del curso.
        </div>
        <div style="font-size: 0.85rem; color: #334155; text-align: left; margin-bottom: 0.4rem; font-weight: 700;">
          Para proceder de forma segura, ingresa tu contraseña de usuario:
        </div>
      `,
      input: 'password',
      inputPlaceholder: 'Ingresa tu contraseña para autorizar...',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: '🔒 Confirmar Eliminación Segura',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: async (password) => {
        if (!password || !password.trim()) {
          Swal.showValidationMessage('Debes ingresar tu contraseña para verificar la acción.');
          return false;
        }
        try {
          const resp = await fetch('/api/auth/verify-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ password: password.trim() })
          });
          const data = await resp.json();
          if (!resp.ok || !data.success) {
            Swal.showValidationMessage(data.error || 'Contraseña incorrecta. Doble verificación rechazada.');
            return false;
          }
          return true;
        } catch (err: any) {
          Swal.showValidationMessage('Error al verificar credenciales en el servidor.');
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (result.isConfirmed) {
      setColumns(prev => prev.filter(c => c.id !== col.id));
      try {
        await fetch(`/api/grade-columns?id=${encodeURIComponent(col.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error(err);
      }
      Swal.fire({
        icon: 'success',
        title: 'Evaluación Eliminada',
        text: `La evaluación "${col.title}" fue eliminada de forma segura tras la doble verificación.`,
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const [savingAll, setSavingAll] = useState<boolean>(false);

  // AGREGAR NUEVA COLUMNA DE NOTA / EVALUACIÓN CON PERSISTENCIA EN BD
  const handleAddColumn = async () => {
    const defaultName = `N${columns.length + 1}`;
    const { value: title } = await Swal.fire({
      title: 'Agregar Nueva Evaluación',
      text: `Ingresa el nombre de la nueva evaluación (ej: ${defaultName}, Taller 1, Prueba 1):`,
      input: 'text',
      inputValue: defaultName,
      showCancelButton: true,
      confirmButtonText: 'Crear Evaluación',
      cancelButtonText: 'Cancelar'
    });

    if (title && title.trim() !== '') {
      const cleanTitle = title.trim();
      try {
        const res = await fetch('/api/grade-columns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            levelId,
            subjectId,
            courseName: currentCourseName,
            subjectName: currentSubjectName,
            academicYear,
            period,
            title: cleanTitle,
            weighting: 0,
            position: columns.length + 1
          })
        });
        const data = await res.json();
        const createdId = data.id || `COL-${Date.now()}`;
        const newCol: GradeColumn = {
          id: createdId,
          title: cleanTitle
        };
        setColumns(prev => [...prev, newCol]);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Evaluación "${cleanTitle}" creada y habilitada en la planilla`,
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err) {
        const newCol: GradeColumn = { id: `col-${Date.now()}`, title: cleanTitle };
        setColumns(prev => [...prev, newCol]);
      }
    }
  };

  // AGREGAR NUEVA EVALUACIÓN ACUMULATIVA CON N SUB-NOTAS
  const handleAddCumulativeColumn = async () => {
    const defaultName = `N${columns.length + 1} (Acumulativa)`;
    const { value: title } = await Swal.fire({
      title: 'Crear Evaluación Acumulativa',
      html: `
        <div style="text-align: left; font-size: 0.88rem; color: #475569; margin-bottom: 0.75rem; line-height: 1.4;">
          Una <strong>evaluación acumulativa</strong> te permite crear N sub-evaluaciones con nombre propio (ej: <em>Control 1</em>, <em>Guía de Trabajo</em>, <em>Disertación</em>) e ingresar sus notas para calcular automáticamente el promedio resultante.
        </div>
      `,
      input: 'text',
      inputValue: defaultName,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Crear y Gestionar Sub-Notas',
      cancelButtonText: 'Cancelar'
    });

    if (title && title.trim() !== '') {
      const cleanTitle = title.trim();
      try {
        const res = await fetch('/api/grade-columns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            levelId,
            subjectId,
            courseName: currentCourseName,
            subjectName: currentSubjectName,
            academicYear,
            period,
            title: cleanTitle,
            weighting: 0,
            position: columns.length + 1,
            is_cumulative: 1
          })
        });
        const data = await res.json();
        const createdId = data.id || `COL-${Date.now()}`;
        const newCol: GradeColumn = {
          id: createdId,
          title: cleanTitle,
          is_cumulative: true
        };
        setColumns(prev => [...prev, newCol]);
        setCumulativeColumnsMap(prev => ({
          ...prev,
          [createdId]: { isCumulative: true, count: 2 }
        }));

        // Persistir inmediatamente el diseño base de sub-evaluaciones en BD
        const defaultSubEvals = [
          { id: 'sub-1', title: 'Sub-Nota 1 (Guía / Tarea)' },
          { id: 'sub-2', title: 'Sub-Nota 2 (Control / Trabajo)' }
        ];
        fetch('/api/grades/cumulative', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            gradeColumnId: createdId,
            title: cleanTitle,
            subEvaluations: defaultSubEvals,
            subGrades: {},
            levelId,
            subjectId,
            courseName: currentCourseName,
            subjectName: currentSubjectName,
            academicYear,
            period
          })
        }).catch(e => console.warn('Error inicializando sub-evaluaciones:', e));

        // Abrir inmediatamente el modal de notas acumulativas para esta columna
        setSelectedCumulativeCol(newCol);
      } catch (err) {
        const newCol: GradeColumn = { id: `col-${Date.now()}`, title: cleanTitle, is_cumulative: true };
        setColumns(prev => [...prev, newCol]);
        setSelectedCumulativeCol(newCol);
      }
    }
  };

  // GUARDADO MASIVO / MANUAL DE TODAS LAS NOTAS EN LA BASE DE DATOS
  const handleSaveAllGrades = async () => {
    setSavingAll(true);
    try {
      const gradesToSave: any[] = [];
      students.forEach(st => {
        if (isStudentRetired(st)) return;
        evalColumns.forEach(col => {
          const val = gradesMap[`${st.id}_${col.id}`];
          if (val !== undefined && val > 0) {
            gradesToSave.push({
              studentId: st.id,
              gradeColumnId: col.id,
              gradeValue: val,
              levelId,
              subjectId,
              courseName: currentCourseName,
              subjectName: currentSubjectName,
              academicYear,
              period
            });
          }
        });
        if (isConceptual) {
          const finalVal = gradesMap[`${st.id}_${finalColumnId}`];
          if (finalVal !== undefined && finalVal > 0) {
            gradesToSave.push({
              studentId: st.id,
              gradeColumnId: finalColumnId,
              gradeValue: finalVal,
              levelId,
              subjectId,
              courseName: currentCourseName,
              subjectName: currentSubjectName,
              academicYear,
              period
            });
          }
        }
      });

      if (gradesToSave.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin calificaciones para guardar',
          text: 'No has ingresado notas en las casillas todavía.',
          timer: 2000,
          showConfirmButton: false
        });
        setSavingAll(false);
        return;
      }

      const res = await fetch('/api/grades/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          grades: gradesToSave,
          levelId,
          subjectId,
          courseName: currentCourseName,
          subjectName: currentSubjectName,
          academicYear,
          period
        })
      });

      if (!res.ok) throw new Error('Error al guardar en el servidor');

      Swal.fire({
        icon: 'success',
        title: '¡Calificaciones Guardadas!',
        text: `Se guardaron ${gradesToSave.length} notas exitosamente en la base de datos.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de guardado',
        text: err.message || 'No se pudieron guardar las calificaciones.'
      });
    } finally {
      setSavingAll(false);
    }
  };

  // SUGERIR Y PRE-RELLENAR CONCEPTOS PREDOMINANTES CON CONFIRMACIÓN
  const handlePrefillPredominantConcepts = async () => {
    const result = await Swal.fire({
      title: '⭐ Rellenar Promedios Conceptuales',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #334155; line-height: 1.5;">
          Esta función calcula el <strong>concepto predominante</strong> según las evaluaciones ingresadas (N1, N2, etc.) para cada estudiante y pre-rellena las casillas de promedio conceptual pendientes.<br/><br/>
          <em>Podrás modificar manualmente cualquier concepto después.</em>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Rellenar Conceptos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a'
    });

    if (!result.isConfirmed) return;

    const newMap = { ...gradesMap };
    const gradesToSave: any[] = [];

    students.forEach(st => {
      if (isStudentRetired(st)) return;
      const existing = newMap[`${st.id}_${finalColumnId}`];
      if (existing && existing > 0) return;

      let sum = 0;
      let count = 0;
      evalColumns.forEach(c => {
        const val = newMap[`${st.id}_${c.id}`];
        if (val && val > 0) {
          sum += val;
          count++;
        }
      });

      if (count > 0) {
        const avgNum = sum / count;
        const concept = numberToConcept(avgNum);
        const numVal = conceptToNumber(concept);
        newMap[`${st.id}_${finalColumnId}`] = numVal;
        gradesToSave.push({
          studentId: st.id,
          gradeColumnId: finalColumnId,
          gradeValue: numVal,
          levelId,
          subjectId,
          courseName: currentCourseName,
          subjectName: currentSubjectName,
          academicYear,
          period
        });
      }
    });

    setGradesMap(newMap);

    if (gradesToSave.length > 0) {
      try {
        await fetch('/api/grades/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ grades: gradesToSave, levelId, subjectId, courseName: currentCourseName, subjectName: currentSubjectName, academicYear, period })
        });
        Swal.fire({
          icon: 'success',
          title: 'Promedios Conceptuales Rellenados',
          text: `Se asignó y guardó el concepto predominante para ${gradesToSave.length} estudiantes. Puedes ajustar cualquiera manualmente.`,
          timer: 2500,
          showConfirmButton: false
        });
      } catch (e) {
        Swal.fire({ icon: 'info', title: 'Conceptos cargados en pantalla', text: 'Haz clic en Guardar Calificaciones para persistir.' });
      }
    } else {
      Swal.fire({ icon: 'info', title: 'Sin cambios', text: 'Todos los estudiantes ya tienen promedio asignado o no registran notas evaluadas.' });
    }
  };

  // CÁLCULO DE PROMEDIO ARITMÉTICO Y REDONDEO SEGÚN REGLA MINEDUC
  const calculateAverage = (studentId: string) => {
    let simpleSum = 0;
    let count = 0;

    columns.forEach(col => {
      const val = gradesMap[`${studentId}_${col.id}`];
      if (val && val > 0) {
        simpleSum += val;
        count++;
      }
    });

    if (count === 0) return '-';
    const rawAvg = simpleSum / count;

    if (gradeScaleMode === 'entera') {
      return Math.round(rawAvg * 10).toString();
    } else {
      return rawAvg.toFixed(1).replace('.', ',');
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      
      {/* BOTÓN VOLVER A MIS CURSOS ASIGNADOS (TARJETAS) */}
      {onBackToGrid && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={onBackToGrid}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#334155';
            }}
          >
            ← Volver a Mis Cursos Asignados
          </button>
        </div>
      )}

      {/* BADGE INFORMATIVO DE ROL Y SUPERVISIÓN */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {isCurrentCourseHomeroom && !isAdmin && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
            <Star size={16} color="#059669" fill="#10b981" />
            <span>⭐ Eres Profesor(a) Jefe de {currentCourseName} — Acceso y control total a todas las asignaturas</span>
          </div>
        )}
        {!isCurrentCourseHomeroom && !isAdmin && allowedSubjects.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
            <BookOpen size={16} color="#2563eb" />
            <span>Docente de Asignatura — Visualizando únicamente tu(s) asignatura(s) asignada(s) en {currentCourseName}</span>
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
            <span>🛡️ Modo Administrador / UTP — Acceso completo a todos los cursos y asignaturas</span>
          </div>
        )}
      </div>

      {/* AVISO SI EL DOCENTE NO TIENE NINGÚN CURSO ASIGNADO */}
      {allowedLevels.length === 0 && !isAdmin ? (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', margin: '1.5rem 0' }}>
          <AlertTriangle size={52} color="#d97706" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#92400e', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.2rem' }}>Sin cursos ni asignaturas asignadas</h3>
          <p style={{ color: '#b45309', maxWidth: '620px', margin: '0 auto', fontSize: '0.92rem', lineHeight: '1.6' }}>
            Tu perfil docente (<strong>{user?.name}</strong>) no registra asignaciones docentes vigentes ni jefaturas de curso en el sistema para este período académico. Solicita al Administrador o a UTP registrar tus asignaciones en el panel institucional (Configuración ➔ 6.4 Asignación Docente / 6.5 Profesor Jefe).
          </p>
        </div>
      ) : (
      <>
      {/* CONTROLES DE FILTROS Y ACCIONES */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Nivel / Curso</label>
          <select value={levelId} onChange={e => setLevelId(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}>
            {allowedLevels.length === 0 ? (
              <option value="">-- Sin Cursos Asignados --</option>
            ) : (
              allowedLevels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Asignatura</label>
          <select value={subjectId} onChange={e => setSubjectId(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}>
            {allowedSubjects.length === 0 ? (
              <option value="">-- Sin Asignaturas Disponibles --</option>
            ) : (
              allowedSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Período</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff' }}>
            <option value="1er Semestre">1er Semestre</option>
            <option value="2do Semestre">2do Semestre</option>
          </select>
        </div>

        {/* SELECTOR DE ESCALA DE NOTAS (DECIMAL 1,0-7,0 VS ENTERA 10-70) */}
        {!isConceptual ? (
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Escala de Notas</label>
            <select
              value={gradeScaleMode}
              onChange={e => setGradeScaleMode(e.target.value as any)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff', color: '#4f46e5', cursor: 'pointer' }}
            >
              <option value="decimal">Escala Decimal (1,0 - 7,0)</option>
              <option value="entera">Escala Entera (10 - 70)</option>
            </select>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', display: 'block', textTransform: 'uppercase' }}>Escala de Calificación</label>
            <div style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #86efac', fontWeight: 800, background: '#f0fdf4', color: '#166534', fontSize: '0.85rem' }}>
              Conceptos (MB, B, S, I)
            </div>
          </div>
        )}

        <button
          onClick={() => setShowReorderModal(true)}
          disabled={isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 700, fontSize: '0.85rem', cursor: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 'not-allowed' : 'pointer', opacity: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 0.6 : 1, marginTop: 'auto' }}
          title="Modificar manualmente el número de lista u orden alfabético A-Z"
        >
          <ArrowUpDown size={16} color="#4f46e5" /> Reordenar Lista N°
        </button>

        <button
          onClick={handleAddColumn}
          disabled={isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 'not-allowed' : 'pointer', opacity: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 0.6 : 1, marginTop: 'auto' }}
        >
          <Plus size={16} /> + Evaluación
        </button>

        {!isConceptual && (
          <button
            onClick={handleAddCumulativeColumn}
            disabled={isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 0.6 : 1,
              marginTop: 'auto',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
            }}
            title="Crear una evaluación que calcula el promedio de N sub-notas con nombre propio"
          >
            <BarChart2 size={16} /> + Nota Acumulativa
          </button>
        )}

        {isConceptual && (
          <button
            onClick={handlePrefillPredominantConcepts}
            disabled={isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid #86efac',
              background: '#f0fdf4',
              color: '#166534',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (isLocked || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 0.6 : 1,
              marginTop: 'auto',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title="Sugerir y pre-rellenar el concepto predominante (MB, B, S, I) según las evaluaciones existentes para los alumnos sin promedio asignado"
          >
            <Star size={16} color="#16a34a" /> Rellenar Conceptos Predominantes
          </button>
        )}

        <button
          onClick={handleSaveAllGrades}
          disabled={isLocked || savingAll || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: '#16a34a',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: (isLocked || savingAll || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (isLocked || savingAll || isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 0.6 : 1,
            marginTop: 'auto',
            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)'
          }}
          title="Guardar todas las calificaciones ingresadas en la base de datos"
        >
          <Save size={16} /> {savingAll ? 'Guardando...' : 'Guardar Calificaciones'}
        </button>

        <button
          onClick={() => setShowPrintModal(true)}
          disabled={isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: (isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 'not-allowed' : 'pointer', opacity: (isParvulariaCourse(currentCourseName) || allowedSubjects.length === 0) ? 0.6 : 1, marginTop: 'auto' }}
        >
          <Printer size={16} /> Imprimir Informes
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isLocked ? (
            <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem' }}>
              <Lock size={15} /> Semestre Cerrado
            </span>
          ) : (
            <span style={{ color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', background: '#dcfce7', padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem' }}>
              <Unlock size={15} /> Edición Habilitada
            </span>
          )}
        </div>
      </div>

      {/* BANNER DE CIERRE SEMESTRAL / BLOQUEO ACTIVO */}
      {isLocked && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '0.75rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', fontWeight: 700, fontSize: '0.86rem' }}>
          <Lock size={18} color="#dc2626" />
          <span>
            <strong>Planilla Cerrada para Edición ({currentCourseName} — {currentSubjectName} — {period}):</strong> El bloqueo de notas por semestre o curso se encuentra activo. Para habilitar el ingreso de calificaciones, un Administrador puede desbloquearlo en <em>Configuración ➔ 6.8 Cierre Semestral</em>.
          </span>
        </div>
      )}

      {/* BANNER INFORMATIVO PARA ASIGNATURA CONCEPTUAL (RELIGIÓN / ORIENTACIÓN) */}
      {isConceptual && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>
            <span style={{ fontSize: '1.1rem' }}>📖</span>
            <span>
              <strong>Asignatura Conceptual ({currentSubjectName}):</strong> Conforme al Decreto 67 y Decreto 924 del MINEDUC, las evaluaciones y el promedio final se expresan en conceptos (<strong>MB</strong>, <strong>B</strong>, <strong>S</strong>, <strong>I</strong>). El promedio se debe rellenar de forma manual y no altera el promedio numérico general del estudiante.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>MB: Muy Bueno</span>
            <span style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>B: Bueno</span>
            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>S: Suficiente</span>
            <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>I: Insuficiente</span>
          </div>
        </div>
      )}

      {/* PLANILLA DE CALIFICACIONES (SIEMPRE ORDENADA STRICTAMENTE POR N° DE LISTA) */}
      {isParvulariaCourse(currentCourseName) ? (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', margin: '1.5rem 0' }}>
          <AlertTriangle size={52} color="#d97706" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#92400e', marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.25rem' }}>
            Educación Parvularia ({currentCourseName})
          </h3>
          <p style={{ color: '#b45309', maxWidth: '640px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Conforme a la normativa MINEDUC y las <strong>Bases Curriculares de la Educación Parvularia (BCEP)</strong>, los niveles de Pre-Kínder y Kínder no contemplan asignaturas tradicionales ni calificaciones numéricas (escala 1.0 a 7.0). Su evaluación es formativa y cualitativa a través de informes al hogar.
          </p>
        </div>
      ) : allowedSubjects.length === 0 ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', margin: '1.5rem 0' }}>
          <p style={{ color: '#64748b', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
            No hay asignaturas disponibles para visualizar en este curso.
          </p>
        </div>
      ) : (
      <div className="table-responsive-wrapper" style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <table className="grades-table-mobile" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ width: '45px', padding: '0.8rem 0.5rem', textAlign: 'center' }}>N°</th>
              <th style={{ width: '105px', padding: '0.8rem 0.5rem', textAlign: 'center', minWidth: '95px' }}>N° Matrícula</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left', minWidth: '220px' }}>Estudiante</th>
              {evalColumns.map(col => {
                const isCumulative = col.is_cumulative || col.title?.toLowerCase().includes('acumulativ') || cumulativeColumnsMap[col.id]?.isCumulative;

                return (
                  <th
                    key={col.id}
                    style={{
                      textAlign: 'center',
                      padding: '0.6rem 0.5rem',
                      position: 'relative',
                      background: isCumulative ? '#faf5ff' : 'transparent',
                      borderLeft: isCumulative ? '2px solid #e9d5ff' : 'none',
                      borderRight: isCumulative ? '2px solid #e9d5ff' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', color: isCumulative ? '#6b21a8' : '#0f172a', fontWeight: 800 }}
                      >
                        <span onClick={() => !isLocked && handleRenameColumn(col)} style={{ cursor: isLocked ? 'default' : 'pointer' }} title={isLocked ? col.title : 'Renombrar evaluación'}>{col.title}</span>
                        {!isLocked && (
                          <>
                            <span onClick={() => handleRenameColumn(col)} style={{ cursor: 'pointer', display: 'inline-flex' }} title="Renombrar evaluación">
                              <Edit2 size={13} color={isCumulative ? '#9333ea' : '#4f46e5'} />
                            </span>
                            <span onClick={() => handleDeleteColumn(col)} style={{ cursor: 'pointer', display: 'inline-flex', marginLeft: '2px' }} title="Eliminar evaluación">
                              <Trash2 size={13} color="#ef4444" />
                            </span>
                          </>
                        )}
                      </div>

                      {isCumulative ? (
                        <button
                          onClick={() => setSelectedCumulativeCol(col)}
                          style={{
                            background: '#f3e8ff',
                            border: '1px solid #d8b4fe',
                            color: '#7e22ce',
                            borderRadius: '6px',
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            marginTop: '2px'
                          }}
                          title="Gestionar sub-notas acumulativas (Controles, Guías, etc.)"
                        >
                          <BarChart2 size={11} /> Sub-Notas
                        </button>
                      ) : null}
                    </div>
                  </th>
                );
              })}
              <th style={{ textAlign: 'center', background: isConceptual ? '#f0fdf4' : '#eff6ff', color: isConceptual ? '#166534' : '#1e40af', fontWeight: 800, padding: '0.8rem 0.75rem' }}>
                {isConceptual ? 'PROMEDIO CONCEPTUAL (MANUAL)' : 'PROMEDIO'}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              const retired = isStudentRetired(s);
              const retiredDate = getStudentWithdrawalDate(s);
              const avg = calculateAverage(s.id);
              const avgNum = parseFloat(avg.replace(',', '.'));
              const avgColor = retired ? '#dc2626' : (isNaN(avgNum) ? '#64748b' : (avgNum < 4.0 || (gradeScaleMode === 'entera' && avgNum < 40)) ? '#ef4444' : '#16a34a');

              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: retired ? '#fef2f2' : 'transparent' }}>
                  <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem', color: retired ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                    {s.list_number || idx + 1}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem', color: retired ? '#dc2626' : '#4f46e5', fontWeight: 700, fontSize: '0.8rem', textDecoration: retired ? 'line-through' : 'none' }}>
                    {s.enrollment_number || s.run || `MAT-${String(idx + 1).padStart(4, '0')}`}
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: retired ? '#dc2626' : '#0f172a', textTransform: 'uppercase' }}>
                    <span style={{ textDecoration: retired ? 'line-through' : 'none' }}>{s.full_name}</span>
                    {retired && (
                      <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, textTransform: 'none' }}>
                        🔴 RETIRADO {retiredDate ? `(${retiredDate})` : ''}
                      </span>
                    )}
                  </td>
                  {evalColumns.map((col, cIdx) => {
                    const isCumulative = col.is_cumulative || col.title?.toLowerCase().includes('acumulativ') || cumulativeColumnsMap[col.id]?.isCumulative;
                    const key = `${s.id}_${col.id}`;
                    const rawVal = gradesMap[key];
                    const formattedVal = formatCellValue(rawVal);
                    const isEditingThis = editingCell?.key === key;
                    const displayVal = isEditingThis ? editingCell.text : formattedVal;
                    const numForColor = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
                    const isRed = !isConceptual && !isNaN(numForColor) && numForColor > 0 && numForColor < 4.0;
                    const conceptBadge = isConceptual && formattedVal ? getConceptBadgeStyle(formattedVal) : null;

                    return (
                      <td
                        key={col.id}
                        style={{
                          textAlign: 'center',
                          padding: '0.4rem',
                          background: isCumulative ? '#faf5ff' : 'transparent',
                          borderLeft: isCumulative ? '1px solid #f3e8ff' : 'none',
                          borderRight: isCumulative ? '1px solid #f3e8ff' : 'none'
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                          <input
                            id={`grade-input-${idx}-${cIdx}`}
                            type="text"
                            disabled={isLocked || retired}
                            value={displayVal}
                            onChange={e => handleGradeChange(s.id, col.id, e.target.value)}
                            onBlur={() => handleSaveGrade(s.id, col.id)}
                            onKeyDown={e => handleKeyDown(e, idx, cIdx, s.id, col.id)}
                            onFocus={e => {
                              if (!retired) {
                                setEditingCell({ key, text: formattedVal, freshFocus: true });
                                e.target.select();
                                setTimeout(() => { try { e.target.select(); } catch (_) {} }, 0);
                              }
                            }}
                            onMouseUp={e => {
                              if (!retired && editingCell?.key === key && editingCell.freshFocus) {
                                e.preventDefault();
                                try { e.currentTarget.select(); } catch (_) {}
                              }
                            }}
                            placeholder={isConceptual ? 'MB/B/S/I' : '-'}
                            title={retired ? `Estudiante retirado ${retiredDate ? `(${retiredDate})` : ''}: No admite ingreso de calificaciones` : (isConceptual ? 'Ingresa concepto (MB, B, S, I)' : undefined)}
                            style={{
                              width: isConceptual ? '75px' : '65px',
                              textAlign: 'center',
                              fontWeight: 800,
                              color: retired ? '#94a3b8' : isConceptual ? (conceptBadge ? conceptBadge.color : '#0f172a') : (isRed ? '#ef4444' : formattedVal ? (isCumulative ? '#7e22ce' : '#2563eb') : '#0f172a'),
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: retired ? '1px dashed #cbd5e1' : isConceptual ? (conceptBadge && formattedVal ? `1.5px solid ${conceptBadge.border}` : '1px solid #cbd5e1') : (isCumulative ? '1px solid #d8b4fe' : '1px solid #cbd5e1'),
                              background: retired ? '#f1f5f9' : (isConceptual && conceptBadge && formattedVal ? conceptBadge.bg : '#ffffff'),
                              cursor: retired ? 'not-allowed' : 'text',
                              outline: 'none',
                              fontSize: isConceptual ? '0.9rem' : '0.95rem'
                            }}
                          />
                          {isCumulative && !retired && (
                            <button
                              onClick={() => setSelectedCumulativeCol(col)}
                              style={{
                                position: 'absolute',
                                right: '-8px',
                                top: '-6px',
                                background: '#7e22ce',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                fontSize: '0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title="Abrir desglose de sub-notas acumulativas"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {isConceptual ? (() => {
                    const finalVal = gradesMap[`${s.id}_${finalColumnId}`];
                    const currentConcept = finalVal ? numberToConcept(finalVal) : '';
                    const badge = getConceptBadgeStyle(currentConcept);

                    return (
                      <td style={{ textAlign: 'center', background: '#f0fdf4', padding: '0.4rem 0.5rem' }}>
                        <select
                          value={currentConcept}
                          disabled={isLocked || retired}
                          onChange={async (e) => {
                            const newConcept = e.target.value;
                            const numVal = newConcept ? conceptToNumber(newConcept) : 0;
                            setGradesMap(prev => ({
                              ...prev,
                              [`${s.id}_${finalColumnId}`]: numVal
                            }));

                            if (!retired) {
                              try {
                                await fetch('/api/grades', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  },
                                  body: JSON.stringify({
                                    studentId: s.id,
                                    gradeColumnId: finalColumnId,
                                    gradeValue: numVal,
                                    levelId,
                                    subjectId,
                                    courseName: currentCourseName,
                                    subjectName: currentSubjectName,
                                    academicYear,
                                    period
                                  })
                                });
                                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Promedio ${newConcept || 'eliminado'} guardado`, timer: 1000, showConfirmButton: false });
                              } catch (_) {}
                            }
                          }}
                          style={{
                            padding: '0.35rem 0.5rem',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            border: `1.5px solid ${badge.border}`,
                            background: badge.bg,
                            color: badge.color,
                            cursor: retired ? 'not-allowed' : 'pointer',
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}
                          title="Promedio final salida conceptual llenado manualmente por el docente (Decreto 67 y 924)"
                        >
                          <option value="">- (Sin asignar)</option>
                          <option value="MB">MB (Muy Bueno)</option>
                          <option value="B">B (Bueno)</option>
                          <option value="S">S (Suficiente)</option>
                          <option value="I">I (Insuficiente)</option>
                        </select>
                      </td>
                    );
                  })() : (
                    <td style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: avgColor, background: '#f8fafc', padding: '0.65rem 0.75rem' }}>
                      {avg}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* MODAL PARA REORDENAR LA LISTA DE ESTUDIANTES */}
      {showReorderModal && (
        <ReorderStudentsModal
          students={students}
          token={token}
          onClose={() => setShowReorderModal(false)}
          onSuccess={(updated) => {
            if (Array.isArray(updated) && updated.length > 0) {
              setStudents(sortStudentsByListNumber(updated));
            }
          }}
        />
      )}

      {/* MODAL DE IMPRESIÓN DE INFORMES DE NOTAS */}
      {showPrintModal && (
        <PrintGradeReportModal
          courseName={currentCourseName || 'Curso'}
          academicYear={academicYear}
          period={period}
          onClose={() => setShowPrintModal(false)}
          students={students.map((s, idx) => {
            const overviewSt = printCourseOverview?.students?.find((os: any) => String(os.id) === String(s.id) || (s.run && os.run === s.run));

            const nVals: Record<string, number | string> = {};
            columns.slice(0, 10).forEach((col, cIdx) => {
              const val = gradesMap[`${s.id}_${col.id}`];
              nVals[`n${cIdx + 1}`] = val !== undefined && val > 0 ? (gradeScaleMode === 'entera' ? Math.round(val * 10) : val.toFixed(1).replace('.', ',')) : '-';
            });

            let azulCount = 0;
            let rojaCount = 0;
            columns.forEach(col => {
              const val = gradesMap[`${s.id}_${col.id}`];
              if (val && val > 0) {
                if (val >= 4.0) azulCount++;
                else rojaCount++;
              }
            });

            const avg = calculateAverage(s.id);

            return {
              id: s.id,
              listNumber: s.list_number || idx + 1,
              fullName: s.full_name,
              run: s.run || '',
              course: currentCourseName || 'Curso',
              promedioGeneral: overviewSt?.promedioGeneral || avg,
              azules: overviewSt?.azules ?? azulCount,
              rojas: overviewSt?.rojas ?? rojaCount,
              subjectGrades: (allowedSubjects.length > 0 ? allowedSubjects : allSubjects).map(sub => {
                if (sub.id === subjectId) {
                  return {
                    name: sub.name,
                    ...nVals,
                    average: avg
                  };
                }
                const perf = overviewSt?.subjectGrades?.[sub.name] ||
                  (overviewSt?.subjectGrades ? Object.entries(overviewSt.subjectGrades).find(([k]) => normalizeStr(k) === normalizeStr(sub.name))?.[1] as any : null);
                if (perf && Array.isArray(perf.grades)) {
                  const subNVals: Record<string, number | string> = {};
                  for (let i = 1; i <= 10; i++) {
                    const foundGrade = perf.grades.find((g: any) => g.label?.toLowerCase() === `nota ${i}` || g.label === `N${i}`);
                    subNVals[`n${i}`] = foundGrade ? foundGrade.value : (i <= perf.grades.length ? perf.grades[i - 1]?.value || '-' : '-');
                  }
                  return {
                    name: sub.name,
                    ...subNVals,
                    average: perf.average || '-'
                  };
                }
                return {
                  name: sub.name,
                  n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', n10: '-',
                  average: '-'
                };
              })
            };
          })}
        />
      )}

      {/* MODAL DE NOTAS ACUMULATIVAS */}
      {selectedCumulativeCol && (
        <CumulativeGradesModal
          token={token}
          gradeColumnId={selectedCumulativeCol.id}
          columnTitle={selectedCumulativeCol.title}
          courseName={currentCourseName || 'Curso'}
          subjectName={(allowedSubjects.find(s => s.id === subjectId) || allSubjects.find(s => s.id === subjectId))?.name || 'Asignatura'}
          levelId={levelId}
          subjectId={subjectId}
          academicYear={academicYear}
          period={period}
          students={students}
          isLocked={isLocked}
          onClose={() => setSelectedCumulativeCol(null)}
          onSaved={(calculatedAverages, subCount) => {
            const updatedMap = { ...gradesMap };
            Object.entries(calculatedAverages).forEach(([studentId, avgVal]) => {
              updatedMap[`${studentId}_${selectedCumulativeCol.id}`] = avgVal;
            });
            setGradesMap(updatedMap);
            setCumulativeColumnsMap(prev => ({
              ...prev,
              [selectedCumulativeCol.id]: { isCumulative: true, count: subCount }
            }));
          }}
        />
      )}
      </>
      )}
    </div>
  );
};

export default GradesSheet;
