import React, { useState } from 'react';
import { BookOpen, Award, AlertTriangle, CheckCircle2, X, ChevronRight, ChevronDown, User, Printer, RefreshCw, BarChart3, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PrintGradeReportModal } from './PrintGradeReportModal';
import { isStudentRetired, getStudentWithdrawalDate, sortCoursesList, getStudentCourse } from '../utils/course';

interface SubjectGradeDetail {
  label: string;
  value: number;
}

interface StudentSubjectPerformance {
  subjectName: string;
  average: number | string;
  status: 'APROBADO' | 'REPROBADO' | 'SIN NOTAS';
  grades: SubjectGradeDetail[];
}

interface StudentData {
  number: number;
  id: string;
  fullName: string;
  run: string;
  course: string;
  azules: number;
  rojas: number;
  promedioGeneral: number;
  alerts: { subject: string; grade: number }[];
  subjectGrades: Record<string, StudentSubjectPerformance>;
}

interface CourseSubject {
  name: string;
  teacher: string;
  status: 'CON NOTAS' | 'SIN NOTAS';
  registeredCount: number;
  maxCount: number;
  percentage: number;
  courseAverage: number;
  isConceptual?: boolean;
  conceptAverage?: string;
}

// HELPERS PARA ASIGNATURAS CONCEPTUALES (RELIGIÓN Y ORIENTACIÓN)
const isConceptualSubject = (name: string): boolean => {
  const norm = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return norm.includes('religion') || norm.includes('orientacion');
};

const numberToConcept = (val: number | string): string => {
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || num <= 0) return '-';
  if (num >= 6.0) return 'MB';
  if (num >= 5.0) return 'B';
  if (num >= 4.0) return 'S';
  return 'I';
};

const getConceptBadgeStyle = (concept: string) => {
  const c = (concept || '').toUpperCase().trim();
  switch (c) {
    case 'MB':
      return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: 'MB (Muy Bueno)' };
    case 'B':
      return { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', label: 'B (Bueno)' };
    case 'S':
      return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: 'S (Suficiente)' };
    case 'I':
      return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', label: 'I (Insuficiente)' };
    default:
      return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', label: '-' };
  }
};

interface CourseData {
  courseName: string;
  promedioCurso: number;
  alumnosRegistrados: number;
  alumnosActivos?: number;
  alumnosRetirados?: number;
  calificacionesTotales: number;
  azulesTotales: number;
  azulesPorcentaje: number;
  rojasTotales: number;
  rojasPorcentaje: number;
  alumnosEnRiesgo: number;
  alumnosBajoCuatro: number;
  subjects: CourseSubject[];
  students: StudentData[];
}

interface GradesOverviewProps {
  token: string;
}

export const GradesOverview: React.FC<GradesOverviewProps> = ({ token }) => {
  const { user, token: authCtxToken } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const authToken = token || authCtxToken || (typeof window !== 'undefined' ? (sessionStorage.getItem('ltp_token') || localStorage.getItem('ltp_token')) : '') || '';

  // FILTROS PRINCIPALES DE ENCABEZADO
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1er Semestre');
  const [onlyRedGrades, setOnlyRedGrades] = useState<boolean>(false);

  // CARGA DINÁMICA DE CURSOS Y ALUMNOS DESDE LA BASE DE DATOS
  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [realStudents, setRealStudents] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);

  const normalizeStr = (str: any) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

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

  React.useEffect(() => {
    setLoadingCourses(true);
    Promise.all([
      fetch(`/api/students?year=${selectedYear}`, { headers: { Authorization: `Bearer ${authToken}` } }).then(r => r.json()).catch(() => []),
      fetch(`/api/courses`, { headers: { Authorization: `Bearer ${authToken}` } }).then(r => r.json()).catch(() => ({ courses: [] }))
    ]).then(([studentsData, coursesRes]) => {
      const rawCourses = (coursesRes && Array.isArray(coursesRes.courses)) ? coursesRes.courses : [];
      const savedCourses = rawCourses.map((c: any) => c.name);
      const studentCourses = Array.isArray(studentsData) ? studentsData.map((s: any) => getStudentCourse(s)) : [];

      if (Array.isArray(studentsData)) {
        setRealStudents(studentsData);
      }

      let combined = Array.from(new Set([...savedCourses, ...studentCourses])).filter(Boolean) as string[];

      // Si es docente (no Admin), filtrar únicamente los cursos donde es Profesor Jefe
      if (!isAdmin && user) {
        combined = combined.filter(cName => {
          const nCourse = normalizeStr(cName);
          const matchingCourseObjs = rawCourses.filter((c: any) => normalizeStr(c.name) === nCourse);
          if (matchingCourseObjs.some((cObj: any) => isUserMatch(cObj.teacher))) return true;

          const sMatch = Array.isArray(studentsData) && studentsData.some((s: any) => {
            const sCourse = normalizeStr(getStudentCourse(s));
            return (sCourse === nCourse || normalizeStr(s.desc_grado) === nCourse) && isUserMatch(s.profesor_jefe);
          });
          return sMatch;
        });
      }

      if (combined.length > 0) {
        const sorted = sortCoursesList(combined);
        setCoursesList(sorted);
        if (!selectedCourse || !sorted.includes(selectedCourse)) {
          setSelectedCourse(sorted[0]);
        }
      } else {
        setCoursesList([]);
        setSelectedCourse('');
      }
    }).catch(() => {}).finally(() => {
      setLoadingCourses(false);
    });
  }, [authToken, selectedYear, isAdmin, user]);

  // MODAL DE DETALLE DE ALUMNO Y EXPANSIONES
  const [selectedStudentModal, setSelectedStudentModal] = useState<StudentData | null>(null);
  const [selectedSubjectModal, setSelectedSubjectModal] = useState<CourseSubject | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // ESTADOS PARA MODAL DE IMPRESIÓN DE INFORMES DE NOTAS
  const [showPrintReportsModal, setShowPrintReportsModal] = useState<boolean>(false);
  const [initialPrintStudentId, setInitialPrintStudentId] = useState<string | undefined>(undefined);

  // ESTRUCTURA VACÍA POR DEFECTO PARA CURSOS SIN NOTAS EN BASE DE DATOS
  const emptyCourseData = (cName: string): CourseData => ({
    courseName: cName,
    promedioCurso: 0,
    alumnosRegistrados: realStudents.length || 0,
    calificacionesTotales: 0,
    azulesTotales: 0,
    azulesPorcentaje: 0,
    rojasTotales: 0,
    rojasPorcentaje: 0,
    alumnosEnRiesgo: 0,
    alumnosBajoCuatro: 0,
    subjects: [],
    students: []
  });

  // ESTADO DE DATOS EN VIVO DESDE SUPABASE
  const [liveCourseData, setLiveCourseData] = useState<CourseData | null>(null);

  // OBTENER EL CURSO SELECCIONADO ACTUALMENTE (EXCLUSIVAMENTE DESDE SUPABASE)
  const currentCourseData = liveCourseData || emptyCourseData(selectedCourse);

  // FILTRADO DE ALUMNOS (SEGÚN "SOLO PROMEDIOS ROJOS (< 4,0)" O CON ALERTAS)
  const displayStudents = currentCourseData.students.filter(st => {
    if (onlyRedGrades) {
      return st.promedioGeneral < 4.0 || st.rojas > 0 || st.alerts.length > 0;
    }
    return true;
  });

  // MANEJO DE ACORDEÓN EN EL MODAL DE DETALLE DE ALUMNO
  const toggleSubjectExpand = (subjectName: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectName]: !prev[subjectName]
    }));
  };

  // REFRESCAR DATOS AUTOMÁTICAMENTE DE LA BASE DE DATOS AL CAMBIAR FILTROS O CERRAR VENTANAS
  const [loadingDb, setLoadingDb] = useState<boolean>(false);

  const refreshDataFromDatabase = () => {
    if (!selectedCourse) return;
    setLoadingDb(true);
    fetch(`/api/grades/course-overview?courseName=${encodeURIComponent(selectedCourse)}&year=${selectedYear}&period=${encodeURIComponent(selectedPeriod)}&onlyRed=${onlyRedGrades}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.students && Array.isArray(data.students)) {
          setLiveCourseData(data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoadingDb(false));
  };

  React.useEffect(() => {
    if (selectedCourse) {
      refreshDataFromDatabase();
    }
  }, [selectedCourse, selectedYear, selectedPeriod, onlyRedGrades, authToken]);

  const handleRefresh = () => {
    refreshDataFromDatabase();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loadingCourses && coursesList.length === 0) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '3.5rem 2rem', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <RefreshCw size={40} color="#4f46e5" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: '#1e293b', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.15rem' }}>Cargando Informe de Jefatura...</h3>
        <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem' }}>
          Consultando cursos y calificaciones asignadas...
        </p>
      </div>
    );
  }

  if (coursesList.length === 0 && !isAdmin) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '3.5rem 2rem', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <AlertTriangle size={52} color="#d97706" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ color: '#92400e', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.25rem' }}>Informe de Jefatura no disponible</h3>
        <p style={{ color: '#b45309', maxWidth: '580px', margin: '0 auto', fontSize: '0.92rem', lineHeight: '1.6' }}>
          Tu perfil docente (<strong>{user?.name}</strong>) no figura actualmente como <strong>Profesor(a) Jefe</strong> de ningún curso en el sistema. El Informe de Jefatura está reservado para los docentes con jefatura asignada y el equipo directivo.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#f4f6f9', padding: '1.25rem', borderRadius: '16px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* 1. BARRA SUPERIOR DE FILTROS IDÉNTICA A LA CAPTURA DE PANTALLA */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          
          {/* AÑO (SIN TEXTO EXTRA COMO "Año Actual") */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Año:</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', fontWeight: 700, color: '#4f46e5' }}
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2025">2025</option>
            </select>
          </div>

          {/* CURSO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Curso:</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', fontWeight: 700, color: '#0f172a' }}
            >
              {coursesList.length === 0 ? (
                <option value="">-- No hay cursos registrados en base de datos --</option>
              ) : (
                <>
                  {isAdmin && <option value="TODOS">TODOS</option>}
                  {sortCoursesList(coursesList).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* PERÍODO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Período:</label>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', fontWeight: 600 }}
            >
              <option value="1er Semestre">1er Semestre</option>
              <option value="2do Semestre">2do Semestre</option>
              <option value="Anual">Anual</option>
            </select>
          </div>

          {/* CHECKBOX SOLO PROMEDIOS ROJOS */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626', cursor: 'pointer', marginLeft: '0.5rem' }}>
            <input
              type="checkbox"
              checked={onlyRedGrades}
              onChange={e => setOnlyRedGrades(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#dc2626', cursor: 'pointer' }}
            />
            ⚠️ Solo Promedios Rojos (&lt; 4,0)
          </label>

        </div>

        {/* BOTONES DERECHA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Actualizar
          </button>

          <button
            onClick={() => {
              let csvContent = 'data:text/csv;charset=utf-8,';
              csvContent += 'N°,Estudiante,RUT,Curso,Asignaturas Sin Notas,Promedio Actual\n';
              currentCourseData.students.forEach(st => {
                const pendingSubjects: string[] = [];
                Object.entries(st.subjectGrades).forEach(([sbName, perf]) => {
                  if (perf.status === 'SIN NOTAS') {
                    pendingSubjects.push(sbName);
                  }
                });
                csvContent += `"${st.number}","${st.fullName}","${st.run}","${st.course}","${pendingSubjects.length > 0 ? pendingSubjects.join('; ') : 'Al día'}","${st.promedioGeneral > 0 ? st.promedioGeneral.toFixed(1) : '-'}"\n`;
              });
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `Notas_Pendientes_${selectedCourse}_${selectedYear}_${selectedPeriod}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: '8px', border: 'none', background: '#d97706', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)' }}
          >
            📥 Notas Pendientes (Excel)
          </button>

          <button
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)' }}
          >
            <Printer size={16} /> Imprimir Panorama
          </button>

          <button
            onClick={() => {
              setInitialPrintStudentId(undefined);
              setShowPrintReportsModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)' }}
          >
            <Printer size={16} /> Imprimir Informes
          </button>
        </div>
      </div>

      {/* 2. TARJETAS KPI SUPERIORES IDÉNTICAS A LA CAPTURA DE PANTALLA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        
        {/* TARJETA 1: PROMEDIO DEL CURSO */}
        <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#4f46e5', color: '#ffffff', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>PROMEDIO DEL CURSO</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: currentCourseData.promedioCurso > 0 ? '#2563eb' : '#64748b', lineHeight: '1.1' }}>
              {currentCourseData.promedioCurso > 0 ? currentCourseData.promedioCurso.toFixed(1) : '-'}
            </div>
          </div>
        </div>

        {/* TARJETA 2: ALUMNOS REGISTRADOS */}
        <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#0284c7', color: '#ffffff', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ALUMNOS REGISTRADOS</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.1' }}>
              {currentCourseData.alumnosRegistrados}
            </div>
            {currentCourseData.alumnosRetirados !== undefined && currentCourseData.alumnosRetirados > 0 && (
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '0.2rem' }}>
                <span style={{ color: '#059669', fontWeight: 700 }}>{currentCourseData.alumnosActivos} activos</span> • <span style={{ color: '#dc2626', fontWeight: 700 }}>{currentCourseData.alumnosRetirados} retirado</span>
              </div>
            )}
          </div>
        </div>

        {/* TARJETA 3: CALIFICACIONES TOTALES */}
        <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#059669', color: '#ffffff', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>CALIFICACIONES TOTALES</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: '1.1' }}>
              {currentCourseData.calificacionesTotales}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.1rem' }}>
              <span style={{ color: '#2563eb' }}>{currentCourseData.azulesTotales} azules ({currentCourseData.azulesPorcentaje}%)</span> / <span style={{ color: '#dc2626' }}>{currentCourseData.rojasTotales} rojas ({currentCourseData.rojasPorcentaje}%)</span>
            </div>
          </div>
        </div>

        {/* TARJETA 4: ALUMNOS EN RIESGO */}
        <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ background: '#d97706', color: '#ffffff', width: '46px', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ALUMNOS EN RIESGO</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', lineHeight: '1.1' }}>
              {currentCourseData.alumnosEnRiesgo}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '0.1rem' }}>
              {currentCourseData.alumnosBajoCuatro} alumnos con promedio bajo 4,0
            </div>
          </div>
        </div>

      </div>

      {/* 3. SECCIÓN DIVIDIDA EN DOS COLUMNAS (ASIGNATURAS Y RENDIMIENTO) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* TARJETA IZQUIERDA: ASIGNATURAS DEL CURSO */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', marginTop: 0 }}>
            Asignaturas del Curso
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>ASIGNATURA</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>ESTADO</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>NOTAS REGISTRADAS</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>PROMEDIO CURSO</th>
                </tr>
              </thead>
              <tbody>
                {currentCourseData.subjects.map((sub, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setSelectedSubjectModal(sub)}
                    style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title={`Haz clic para ver el desglose completo de notas de ${sub.name}`}
                  >
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#1e293b' }}>
                      <span style={{ color: '#4f46e5', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{sub.name}</span>
                      {sub.teacher && sub.teacher !== 'Sin Asignar' && sub.teacher !== 'Docente de Asignatura' && (
                        <div style={{ fontSize: '0.73rem', color: '#64748b', fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} color="#94a3b8" /> {sub.teacher}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <span style={{
                        background: sub.status === 'CON NOTAS' ? '#dcfce7' : '#f1f5f9',
                        color: sub.status === 'CON NOTAS' ? '#15803d' : '#64748b',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 800
                      }}>
                        {sub.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                      {sub.registeredCount}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem' }}>
                      {sub.isConceptual || isConceptualSubject(sub.name) ? (() => {
                        const c = sub.conceptAverage || (sub.courseAverage > 0 ? numberToConcept(sub.courseAverage) : '-');
                        const style = getConceptBadgeStyle(c);
                        return (
                          <span style={{
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                            padding: '0.2rem 0.65rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            display: 'inline-block'
                          }} title={style.label}>
                            {c}
                          </span>
                        );
                      })() : (
                        <span style={{ color: sub.courseAverage >= 6.0 ? '#16a34a' : sub.courseAverage >= 5.0 ? '#2563eb' : sub.courseAverage > 0 ? '#dc2626' : '#64748b' }}>
                          {sub.courseAverage > 0 ? sub.courseAverage.toFixed(1) : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TARJETA DERECHA: RENDIMIENTO POR ALUMNO */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', marginTop: 0 }}>
            Rendimiento por Alumno
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', width: '35px' }}>N°</th>
                  <th style={{ padding: '0.6rem 0.6rem', textAlign: 'left' }}>ESTUDIANTE</th>
                  <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#2563eb' }}>AZULES</th>
                  <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center', color: '#dc2626' }}>ROJAS</th>
                  <th style={{ padding: '0.6rem 0.4rem', textAlign: 'center' }}>PROMEDIO</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left' }}>DETALLE ALERTAS / ASIGNATURAS REPROBADAS</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((st) => (
                  <tr key={st.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '0.75rem 0.4rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{st.number}</td>
                    <td style={{ padding: '0.75rem 0.6rem', fontWeight: 700, color: '#1e293b' }}>
                      <button
                        onClick={() => setSelectedStudentModal(st)}
                        style={{ background: 'none', border: 'none', padding: 0, fontWeight: 700, color: '#4f46e5', textAlign: 'left', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontSize: '0.85rem' }}
                      >
                        {st.fullName}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem 0.4rem', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>{st.azules}</td>
                    <td style={{ padding: '0.75rem 0.4rem', textAlign: 'center', fontWeight: 800, color: '#dc2626' }}>{st.rojas}</td>
                    <td style={{ padding: '0.75rem 0.4rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: st.promedioGeneral >= 5.5 ? '#16a34a' : st.promedioGeneral >= 4.0 ? '#2563eb' : st.promedioGeneral > 0 ? '#dc2626' : '#64748b' }}>
                      {st.promedioGeneral > 0 ? st.promedioGeneral.toFixed(1) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {st.azules === 0 && st.rojas === 0 ? (
                        <span style={{ background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Sin notas
                        </span>
                      ) : st.alerts.length === 0 ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          ✓ Al día
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {st.alerts.map((al, aIdx) => (
                            <span key={aIdx} style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.45rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {al.subject} ({al.grade.toFixed(1)})
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 4. CANTIDAD DE NOTAS POR ASIGNATURA */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen color="#4f46e5" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Cantidad de Notas por Asignatura
            </h3>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            💡 Haz clic en cualquier tarjeta para ver el desglose detallado de notas
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {currentCourseData.subjects.map((sub, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedSubjectModal(sub)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.9rem',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#4f46e5';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(79, 70, 229, 0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
              title="Haz clic para ver el desglose de notas de esta asignatura"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', maxWidth: '140px', lineHeight: '1.2' }}>{sub.name}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: sub.registeredCount > 0 ? '#4f46e5' : '#64748b' }}>
                  {sub.registeredCount} / {sub.maxCount} ({sub.percentage}%)
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.75rem', height: '28px', overflow: 'hidden' }}>
                Docente: {sub.teacher}
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${sub.percentage}%`, height: '100%', background: sub.registeredCount > 0 ? '#4f46e5' : '#cbd5e1' }}></div>
              </div>
              <div style={{ marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: (sub.isConceptual || isConceptualSubject(sub.name)) ? '#4f46e5' : (sub.courseAverage >= 5.5 ? '#16a34a' : sub.courseAverage >= 4.0 ? '#2563eb' : sub.courseAverage > 0 ? '#dc2626' : '#94a3b8') }}>
                  Promedio: {(sub.isConceptual || isConceptualSubject(sub.name)) ? (sub.conceptAverage || (sub.courseAverage > 0 ? numberToConcept(sub.courseAverage) : '-')) : (sub.courseAverage > 0 ? sub.courseAverage.toFixed(1) : '-')}
                </span>
                <span style={{ color: '#4f46e5', fontWeight: 800, fontSize: '0.72rem' }}>
                  Ver Detalle ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. PLANILLA GENERAL DE CALIFICACIONES (MATRIZ DE NOTAS) */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', marginTop: 0 }}>
          Planilla General de Calificaciones (Matriz de Notas)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', width: '40px' }}>N°</th>
                <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', minWidth: '200px' }}>ESTUDIANTE</th>
                {currentCourseData.subjects.map((sub, sIdx) => (
                  <th key={sIdx} style={{ padding: '0.7rem 0.4rem', textAlign: 'center', fontSize: '0.7rem', maxWidth: '100px' }}>
                    {sub.name.toUpperCase()}
                  </th>
                ))}
                <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', background: '#eff6ff', color: '#1e40af', fontWeight: 800 }}>PROMEDIO GRAL.</th>
              </tr>
            </thead>
            <tbody>
              {displayStudents.map((st) => {
                const retired = isStudentRetired(st);
                const retiredDate = getStudentWithdrawalDate(st);
                return (
                  <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', background: retired ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: '0.7rem 0.5rem', textAlign: 'center', color: retired ? '#dc2626' : '#64748b', fontWeight: 600 }}>{st.number}</td>
                    <td style={{ padding: '0.7rem 0.75rem', fontWeight: 700, color: retired ? '#dc2626' : '#0f172a' }}>
                      <button
                        onClick={() => setSelectedStudentModal(st)}
                        style={{ background: 'none', border: 'none', padding: 0, color: retired ? '#dc2626' : '#0f172a', fontWeight: 700, cursor: 'pointer', textAlign: 'left', textDecoration: retired ? 'line-through' : 'none' }}
                      >
                        {st.fullName}
                      </button>
                      {retired && (
                        <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                          🔴 RETIRADO {retiredDate ? `(${retiredDate})` : ''}
                        </span>
                      )}
                    </td>
                    {currentCourseData.subjects.map((sub, sIdx) => {
                      const perf = st.subjectGrades[sub.name];
                      const isConceptSub = sub.isConceptual || isConceptualSubject(sub.name);
                      const avgVal = perf ? perf.average : '-';

                      if (isConceptSub) {
                        const conceptStr = typeof avgVal === 'string' && ['MB', 'B', 'S', 'I'].includes(avgVal.toUpperCase())
                          ? avgVal.toUpperCase()
                          : (typeof avgVal === 'number' && avgVal > 0 ? numberToConcept(avgVal) : (typeof avgVal === 'string' && avgVal !== '-' ? avgVal : '-'));
                        const style = getConceptBadgeStyle(conceptStr);

                        return (
                          <td key={sIdx} style={{ padding: '0.7rem 0.4rem', textAlign: 'center', fontWeight: 800 }}>
                            {conceptStr !== '-' ? (
                              <span style={{
                                background: style.bg,
                                color: style.color,
                                border: `1px solid ${style.border}`,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                display: 'inline-block'
                              }} title={style.label}>
                                {conceptStr}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                        );
                      }

                      const numAvg = typeof avgVal === 'number' ? avgVal : parseFloat(String(avgVal));
                      const isRed = !isNaN(numAvg) && numAvg < 4.0;
                      return (
                        <td key={sIdx} style={{ padding: '0.7rem 0.4rem', textAlign: 'center', fontWeight: 700, color: isRed || retired ? '#dc2626' : '#1e293b', textDecoration: retired ? 'line-through' : 'none' }}>
                          {typeof avgVal === 'number' ? avgVal.toFixed(1) : avgVal}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0.7rem 0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', background: retired ? '#fee2e2' : '#f8fafc', color: retired ? '#dc2626' : (st.promedioGeneral >= 6.0 ? '#16a34a' : st.promedioGeneral >= 4.0 ? '#2563eb' : st.promedioGeneral > 0 ? '#dc2626' : '#64748b'), textDecoration: retired ? 'line-through' : 'none' }}>
                      {st.promedioGeneral > 0 ? st.promedioGeneral.toFixed(1) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL DETALLE DE ESTUDIANTE: "PANORAMA DE PROMEDIOS" */}
      {selectedStudentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', padding: '1.5rem', position: 'relative' }}>
            
            {/* BOTÓN CERRAR SUPERIOR */}
            <button
              onClick={() => setSelectedStudentModal(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={18} />
            </button>

            {/* ENCABEZADO DEL MODAL */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PANORAMA DE PROMEDIOS
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                {selectedStudentModal.fullName}
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                RUN: {selectedStudentModal.run} | Curso: {selectedStudentModal.course}
              </div>
            </div>

            {/* CAJA DE RESUMEN: PROMEDIO GENERAL, AZULES, ROJAS */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PROMEDIO GENERAL</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb' }}>{selectedStudentModal.promedioGeneral.toFixed(1)}</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>APROBADAS (AZULES)</div>
                <div style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontWeight: 800, fontSize: '1.2rem', marginTop: '0.2rem' }}>
                  {selectedStudentModal.azules}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REPROBADAS (ROJAS)</div>
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontWeight: 800, fontSize: '1.2rem', marginTop: '0.2rem' }}>
                  {selectedStudentModal.rojas}
                </div>
              </div>
            </div>

            {/* SUBTITULO DETALLE */}
            <div style={{ borderLeft: '4px solid #0f172a', paddingLeft: '0.6rem', marginBottom: '1rem', fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              DETALLE DE CALIFICACIONES POR ASIGNATURA
            </div>

            {/* TABLA DE ASIGNATURAS CON ACORDEÓN PARA MOSTRAR NOTAS */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '0.7rem 0.85rem', textAlign: 'left' }}>ASIGNATURA</th>
                    <th style={{ padding: '0.7rem 0.85rem', textAlign: 'center' }}>PROMEDIO</th>
                    <th style={{ padding: '0.7rem 0.85rem', textAlign: 'right' }}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(selectedStudentModal.subjectGrades).map((sg, sIdx) => {
                    const isExpanded = !!expandedSubjects[sg.subjectName];
                    const isConceptSub = isConceptualSubject(sg.subjectName);
                    const isReprobado = sg.status === 'REPROBADO';
                    const isSinNotas = sg.status === 'SIN NOTAS';

                    const conceptStr = isConceptSub
                      ? (typeof sg.average === 'string' && ['MB', 'B', 'S', 'I'].includes(sg.average.toUpperCase())
                          ? sg.average.toUpperCase()
                          : (typeof sg.average === 'number' && sg.average > 0 ? numberToConcept(sg.average) : (typeof sg.average === 'string' && sg.average !== '-' ? sg.average : '-')))
                      : undefined;
                    const conceptStyle = isConceptSub && conceptStr ? getConceptBadgeStyle(conceptStr) : undefined;

                    return (
                      <React.Fragment key={sIdx}>
                        <tr
                          onClick={() => sg.grades.length > 0 && toggleSubjectExpand(sg.subjectName)}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: sg.grades.length > 0 ? 'pointer' : 'default', background: isExpanded ? '#f8fafc' : '#ffffff' }}
                        >
                          <td style={{ padding: '0.75rem 0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {sg.grades.length > 0 ? (
                              isExpanded ? <ChevronDown size={16} color="#4f46e5" /> : <ChevronRight size={16} color="#94a3b8" />
                            ) : (
                              <span style={{ width: '16px' }}></span>
                            )}
                            {sg.subjectName}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center', fontWeight: 800 }}>
                            {isConceptSub ? (
                              conceptStr !== '-' && conceptStyle ? (
                                <span style={{ background: conceptStyle.bg, color: conceptStyle.color, border: `1px solid ${conceptStyle.border}`, padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem', display: 'inline-block' }} title={conceptStyle.label}>
                                  {conceptStr}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>-</span>
                              )
                            ) : (
                              <span style={{ color: isReprobado ? '#dc2626' : isSinNotas ? '#94a3b8' : '#0f172a' }}>
                                {typeof sg.average === 'number' ? sg.average.toFixed(1) : sg.average}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                            {isSinNotas ? (
                              <span style={{ background: '#f1f5f9', color: '#64748b', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                SIN NOTAS
                              </span>
                            ) : isReprobado ? (
                              <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                REPROBADO
                              </span>
                            ) : (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700 }}>
                                APROBADO
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* SUB-FILA DESPLEGABLE CON LAS NOTAS INDIVIDUALES */}
                        {isExpanded && sg.grades.length > 0 && (
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <td colSpan={3} style={{ padding: '0.75rem 1.25rem' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {sg.grades.map((gr, gIdx) => {
                                  if (isConceptSub) {
                                    const cVal = (gr as any).concept || numberToConcept(gr.value);
                                    const grStyle = getConceptBadgeStyle(cVal);
                                    return (
                                      <div key={gIdx} style={{ background: '#ffffff', border: `1px solid ${grStyle.border}`, borderRadius: '10px', padding: '0.5rem 0.85rem', minWidth: '90px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{gr.label}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: grStyle.color, marginTop: '0.1rem' }}>
                                          {cVal}
                                        </div>
                                      </div>
                                    );
                                  }
                                  const isBlue = gr.value >= 4.0;
                                  return (
                                    <div key={gIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.5rem 0.85rem', minWidth: '90px', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{gr.label}</div>
                                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isBlue ? '#2563eb' : '#dc2626', marginTop: '0.1rem' }}>
                                        {gr.value.toFixed(1)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BOTÓN CERRAR Y BOTÓN IMPRIMIR ABAJO A LA DERECHA */}
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setInitialPrintStudentId(selectedStudentModal.id);
                  setShowPrintReportsModal(true);
                }}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} /> Imprimir Informe de este Alumno
              </button>
              <button
                onClick={() => setSelectedStudentModal(null)}
                style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE DESGLOSE DE ASIGNATURA */}
      {selectedSubjectModal && (() => {
        const subName = selectedSubjectModal.name;
        const isConceptSubject = selectedSubjectModal.isConceptual || isConceptualSubject(subName);

        const subStudents = currentCourseData.students.map(st => {
          const perf = st.subjectGrades[subName];
          return {
            ...st,
            perf,
            grades: perf?.grades || [],
            average: perf?.average || '-',
            status: perf?.status || 'SIN NOTAS'
          };
        });

        const studentsWithNotes = subStudents.filter(s => {
          if (isConceptSubject) {
            return s.average && s.average !== '-' && s.status !== 'SIN NOTAS';
          }
          return typeof s.average === 'number' && s.average > 0;
        });

        const aprobados = studentsWithNotes.filter(s => {
          if (isConceptSubject) {
            const c = String(s.average).toUpperCase();
            return ['MB', 'B', 'S'].includes(c) || (typeof s.average === 'number' && s.average >= 4.0);
          }
          return (s.average as number) >= 4.0;
        }).length;

        const reprobados = studentsWithNotes.filter(s => {
          if (isConceptSubject) {
            const c = String(s.average).toUpperCase();
            return c === 'I' || (typeof s.average === 'number' && s.average < 4.0 && s.average > 0);
          }
          return (s.average as number) < 4.0;
        }).length;

        const activeOrGradedStudents = subStudents.filter(s => !isStudentRetired(s) || (s.average && s.average !== '-' && s.status !== 'SIN NOTAS'));
        const sinNotas = Math.max(0, activeOrGradedStudents.length - studentsWithNotes.length);

        let totalSubAzules = 0;
        let totalSubRojas = 0;
        subStudents.forEach(s => {
          s.grades.forEach(g => {
            if (typeof g.value === 'number') {
              if (g.value >= 4.0) totalSubAzules++;
              else if (g.value > 0) totalSubRojas++;
            }
          });
        });

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* ENCABEZADO */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                color: '#ffffff',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '0.85rem',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <BookOpen size={28} color="#ffffff" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#a5b4fc' }}>
                      DETALLE Y PANORAMA DE ASIGNATURA {isConceptSubject ? '(EVALUACIÓN CONCEPTUAL)' : ''}
                    </span>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.2rem 0', color: '#ffffff' }}>
                      {subName}
                    </h2>
                    <div style={{ fontSize: '0.85rem', color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                      <span><strong>Curso:</strong> {currentCourseData.courseName}</span>
                      <span><strong>Período:</strong> {selectedPeriod}</span>
                      <span><strong>Año:</strong> {selectedYear}</span>
                      <span><strong>Docente:</strong> {selectedSubjectModal.teacher}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubjectModal(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* CONTENIDO DEL MODAL */}
              <div style={{ padding: '1.5rem', flex: 1 }}>
                
                {/* 4 TARJETAS RESUMEN DE LA ASIGNATURA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>PROMEDIO ASIGNATURA</div>
                    {isConceptSubject ? (() => {
                      const c = selectedSubjectModal.conceptAverage || (selectedSubjectModal.courseAverage > 0 ? numberToConcept(selectedSubjectModal.courseAverage) : '-');
                      const style = getConceptBadgeStyle(c);
                      return (
                        <div style={{ marginTop: '0.35rem' }}>
                          <span style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}`, padding: '0.25rem 0.85rem', borderRadius: '8px', fontSize: '1.5rem', fontWeight: 800, display: 'inline-block' }} title={style.label}>
                            {c}
                          </span>
                        </div>
                      );
                    })() : (
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: selectedSubjectModal.courseAverage >= 5.5 ? '#16a34a' : selectedSubjectModal.courseAverage >= 4.0 ? '#2563eb' : selectedSubjectModal.courseAverage > 0 ? '#dc2626' : '#64748b', marginTop: '0.2rem' }}>
                        {selectedSubjectModal.courseAverage > 0 ? selectedSubjectModal.courseAverage.toFixed(1) : '-'}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {selectedSubjectModal.registeredCount > 0 ? 'Con evaluaciones registradas' : 'Sin calificaciones'}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>NOTAS INGRESADAS</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                      {selectedSubjectModal.registeredCount} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>/ {selectedSubjectModal.maxCount}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700, marginTop: '0.2rem' }}>
                      {selectedSubjectModal.percentage}% del total esperado
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>APROBACIÓN DE ALUMNOS</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
                      {aprobados} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>/ {studentsWithNotes.length}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: reprobados > 0 ? '#dc2626' : '#15803d', fontWeight: 700, marginTop: '0.2rem' }}>
                      {reprobados > 0 ? `⚠️ ${reprobados} con concepto I (Insuficiente)` : '✓ 100% aprobados'}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>DISTRIBUCIÓN DE NOTAS</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.4rem', display: 'flex', gap: '0.5rem' }}>
                      <span style={{ color: '#2563eb' }}>🔵 {totalSubAzules}</span>
                      <span style={{ color: '#dc2626' }}>🔴 {totalSubRojas}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                      {sinNotas} estudiantes sin calificar
                    </div>
                  </div>

                </div>

                {/* TABLA DE DETALLE POR ESTUDIANTE */}
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} color="#4f46e5" /> Nómina y Calificaciones del Curso en esta Asignatura
                </h3>

                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', width: '40px' }}>N°</th>
                        <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left', minWidth: '220px' }}>ESTUDIANTE</th>
                        <th style={{ padding: '0.7rem 0.75rem', textAlign: 'left' }}>NOTAS / EVALUACIONES REGISTRADAS</th>
                        <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', width: '105px' }}>PROMEDIO</th>
                        <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', width: '110px' }}>ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subStudents.map((st) => {
                        const retired = isStudentRetired(st);

                        let conceptStr = '-';
                        let avgBadgeStyle = undefined;

                        if (isConceptSubject) {
                          conceptStr = typeof st.average === 'string' && ['MB', 'B', 'S', 'I'].includes(st.average.toUpperCase())
                            ? st.average.toUpperCase()
                            : (typeof st.average === 'number' && st.average > 0 ? numberToConcept(st.average) : (typeof st.average === 'string' && st.average !== '-' ? st.average : '-'));
                          avgBadgeStyle = getConceptBadgeStyle(conceptStr);
                        }

                        const avgNum = typeof st.average === 'number' ? st.average : parseFloat(String(st.average));
                        const avgColor = retired ? '#dc2626' : isNaN(avgNum) ? '#64748b' : avgNum >= 5.5 ? '#16a34a' : avgNum >= 4.0 ? '#2563eb' : '#dc2626';

                        return (
                          <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', background: retired ? '#fef2f2' : 'transparent' }}>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', color: retired ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                              {st.number}
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: retired ? '#dc2626' : '#0f172a' }}>
                              <div>{st.fullName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{st.run}</div>
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem' }}>
                              {st.grades.length === 0 ? (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Sin calificaciones</span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                  {st.grades.map((g, gIdx) => {
                                    if (isConceptSubject) {
                                      const cVal = (g as any).concept || numberToConcept(g.value);
                                      const grStyle = getConceptBadgeStyle(cVal);
                                      return (
                                        <span
                                          key={gIdx}
                                          style={{
                                            background: grStyle.bg,
                                            color: grStyle.color,
                                            border: `1px solid ${grStyle.border}`,
                                            padding: '0.2rem 0.55rem',
                                            borderRadius: '6px',
                                            fontWeight: 800,
                                            fontSize: '0.8rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                          title={`${g.label}: ${cVal}`}
                                        >
                                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{g.label}:</span>
                                          {cVal}
                                        </span>
                                      );
                                    }
                                    const val = g.value;
                                    const isRed = typeof val === 'number' && val < 4.0;
                                    return (
                                      <span
                                        key={gIdx}
                                        style={{
                                          background: isRed ? '#fee2e2' : '#eff6ff',
                                          color: isRed ? '#dc2626' : '#2563eb',
                                          border: `1px solid ${isRed ? '#fca5a5' : '#bfdbfe'}`,
                                          padding: '0.2rem 0.55rem',
                                          borderRadius: '6px',
                                          fontWeight: 800,
                                          fontSize: '0.8rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title={`${g.label}: ${val.toFixed(1)}`}
                                      >
                                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{g.label}:</span>
                                        {val.toFixed(1)}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}>
                              {isConceptSubject ? (
                                conceptStr !== '-' && avgBadgeStyle ? (
                                  <span style={{ background: avgBadgeStyle.bg, color: avgBadgeStyle.color, border: `1px solid ${avgBadgeStyle.border}`, padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.85rem', display: 'inline-block' }} title={avgBadgeStyle.label}>
                                    {conceptStr}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8' }}>-</span>
                                )
                              ) : (
                                <span style={{ color: avgColor }}>
                                  {typeof st.average === 'number' ? st.average.toFixed(1) : st.average}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                              <span style={{
                                background: st.status === 'APROBADO' ? '#dcfce7' : st.status === 'REPROBADO' ? '#fee2e2' : '#f1f5f9',
                                color: st.status === 'APROBADO' ? '#15803d' : st.status === 'REPROBADO' ? '#dc2626' : '#64748b',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 800
                              }}>
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* PIE DEL MODAL CON BOTONES */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderBottomLeftRadius: '20px',
                borderBottomRightRadius: '20px'
              }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Printer size={16} /> Imprimir Reporte de Asignatura
                </button>
                <button
                  onClick={() => setSelectedSubjectModal(null)}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.6rem 1.5rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL IMPRESIÓN DE INFORMES DE NOTAS */}
      {showPrintReportsModal && (
        <PrintGradeReportModal
          courseName={currentCourseData.courseName}
          academicYear={selectedYear}
          period={selectedPeriod}
          initialStudentId={initialPrintStudentId}
          onClose={() => setShowPrintReportsModal(false)}
          students={currentCourseData.students.map(st => {
            const subjectsList = currentCourseData.subjects.map(sub => {
              const perf = st.subjectGrades[sub.name];
              const gradesArr = perf?.grades || [];
              const nVals: Record<string, number | string> = {};
              
              for (let i = 1; i <= 10; i++) {
                const foundGrade = gradesArr.find(g => g.label.toLowerCase() === `nota ${i}` || g.label === `N${i}`);
                nVals[`n${i}`] = foundGrade ? foundGrade.value : (i <= gradesArr.length ? gradesArr[i - 1]?.value || '-' : '-');
              }

              return {
                name: sub.name,
                ...nVals,
                average: perf?.average || '-'
              };
            });

            return {
              id: st.id,
              listNumber: st.number,
              fullName: st.fullName,
              run: st.run,
              course: currentCourseData.courseName,
              promedioGeneral: st.promedioGeneral,
              azules: st.azules,
              rojas: st.rojas,
              subjectGrades: subjectsList,
              homeroomTeacher: realStudents.find(r => r.id === st.id)?.profesor_jefe || undefined
            };
          })}
        />
      )}

    </div>
  );
};

export default GradesOverview;
