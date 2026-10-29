import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, List, BookOpen, Star, AlertTriangle, ArrowRight, Calendar, UserCheck, Search, Filter, MessageSquare, Users, CalendarDays, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStudentCourse, sortCoursesList } from '../utils/course';
import { CourseMessageModal } from './CourseMessageModal';
import { CourseSupportModal } from './CourseSupportModal';
import { CardSkeletonGrid, EmptyState, Badge } from './ui';

interface TeacherAssignmentCard {
  id: string;
  courseName: string;
  subjectName: string;
  year: number;
  isHomeroom: boolean;
  teacherName: string;
}

interface TeacherCoursesGridProps {
  onSelectCourse: (courseName: string, subjectName: string, isHomeroom: boolean) => void;
}

// Mapeo temático de imágenes según la asignatura
const getSubjectImage = (subjectName: string, isHomeroom: boolean): string => {
  if (isHomeroom) {
    return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80'; // Jefatura / Sala de clases
  }

  const s = (subjectName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (s.includes('arte') || s.includes('visual')) {
    return 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80'; // Arte / Pintura
  }
  if (s.includes('music')) {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80'; // Música / Micrófono
  }
  if (s.includes('ciencia') || s.includes('natural') || s.includes('biolog') || s.includes('quimic') || s.includes('fisic')) {
    return 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'; // Ciencias
  }
  if (s.includes('tecnolog') || s.includes('comput') || s.includes('informatic') || s.includes('program')) {
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'; // Tecnología / Circuitos
  }
  if (s.includes('matemat')) {
    return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80'; // Matemáticas / Fórmulas
  }
  if (s.includes('lengua') || s.includes('literatur') || s.includes('comunicac') || s.includes('castellano')) {
    return 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80'; // Lenguaje / Libro
  }
  if (s.includes('orientac')) {
    return 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80'; // Orientación / Manzana y lápices
  }
  if (s.includes('historia') || s.includes('geograf') || s.includes('social')) {
    return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80'; // Historia / Planeta / Espacio
  }
  if (s.includes('ingles') || s.includes('idioma')) {
    return 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=600&q=80'; // Inglés
  }
  if (s.includes('educacion fisica') || s.includes('deporte') || s.includes('gimnas')) {
    return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80'; // Educación Física
  }
  if (s.includes('mecanic') || s.includes('metal') || s.includes('torno') || s.includes('industr')) {
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'; // Mecánica Industrial
  }
  if (s.includes('parvul') || s.includes('atencion de parvulos') || s.includes('infantil')) {
    return 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=600&q=80'; // Párvulos
  }

  return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80'; // Educación general
};

export const TeacherCoursesGrid: React.FC<TeacherCoursesGridProps> = ({ onSelectCourse }) => {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [coursesInfo, setCoursesInfo] = useState<any[]>([]);
  const [rawStudents, setRawStudents] = useState<any[]>([]);
  const [averagesSummary, setAveragesSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalCourse, setModalCourse] = useState<string>('');
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
  const [supportModalCourse, setSupportModalCourse] = useState<string>('');

  // Normalización para comparaciones de nombres y RUTs
  const normalizeStr = (str: any) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const getCanonicalSubGroup = (nameOrId: any): string => {
    const n = normalizeStr(nameOrId);
    if (n.includes('fisica') || n.includes('salud')) return 'eq_ed_fisica';
    if (n.includes('ingles') || n.includes('idioma')) return 'eq_ingles';
    if (n.includes('lengua') || n.includes('comunicac') || n.includes('literatur')) return 'eq_lenguaje';
    if (n.includes('tecnolog')) return 'eq_tecnologia';
    if (n.includes('arte') || n.includes('visual')) return 'eq_arte';
    if (n.includes('music')) return 'eq_musica';
    if (n.includes('historia') || n.includes('social')) return 'eq_historia';
    if (n.includes('ciencia') || n.includes('natural') || n.includes('biolog') || n.includes('quimic')) return 'eq_ciencias';
    if (n.includes('matemat')) return 'eq_matematica';
    if (n.includes('orientac')) return 'eq_orientacion';
    if (n.includes('relig')) return 'eq_religion';
    return n;
  };

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

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/assignments', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch(`/api/grades/averages-summary?year=${selectedYear}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => [])
    ]).then(([assignmentsData, coursesRes, studentsData, averagesData]) => {
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setCoursesInfo((coursesRes && Array.isArray(coursesRes.courses)) ? coursesRes.courses : []);
      setRawStudents(Array.isArray(studentsData) ? studentsData : []);
      setAveragesSummary(Array.isArray(averagesData) ? averagesData : []);
    }).catch(err => {
      console.error('Error cargando datos de cursos asignados:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, [token, selectedYear]);

  // Determinar si el usuario es profesor jefe de un curso
  const isHomeroomTeacherOf = (courseName: string): boolean => {
    if (isAdmin) return true;
    if (!user || !courseName) return false;
    const nCourse = normalizeStr(courseName);

    const cObjs = coursesInfo.filter(c => normalizeStr(c.name) === nCourse);
    if (cObjs.some(cObj => isUserMatch(cObj.teacher))) return true;

    const sMatch = rawStudents.find(s => {
      const sC = normalizeStr(getStudentCourse(s));
      return (sC === nCourse || normalizeStr(s.desc_grado) === nCourse) && isUserMatch(s.profesor_jefe);
    });
    return !!sMatch;
  };

  // Construcción de la lista de tarjetas
  const cardsList: TeacherAssignmentCard[] = useMemo(() => {
    const list: TeacherAssignmentCard[] = [];
    const seen = new Set<string>();

    // 1. ASIGNATURAS ASIGNADAS
    assignments.forEach((a: any) => {
      const matchTeacher = isAdmin || isUserMatch(a.teacher_name || a.teacher_id) || isUserMatch(a.teacher_name_2 || a.teacher_id_2);
      if (matchTeacher) {
        const cName = a.level_name || a.level_id || 'Curso Asignado';
        const sName = a.subject_name || a.subject_id || 'Asignatura';
        const key = `${cName}__${sName}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: a.id || `card-${list.length + 1}`,
            courseName: cName,
            subjectName: sName,
            year: a.academic_year || selectedYear,
            isHomeroom: false,
            teacherName: a.teacher_name || user?.name || ''
          });
        }
      }
    });

    // 2. CURSOS DE JEFATURA (Tarjeta especial "Jefatura de Curso")
    const allCoursesList = Array.from(new Set([
      ...coursesInfo.map(c => c.name),
      ...rawStudents.map(s => getStudentCourse(s)).filter(Boolean)
    ]));

    allCoursesList.forEach((cName: string) => {
      if (cName && isHomeroomTeacherOf(cName)) {
        const key = `${cName}__JEFATURA`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `homeroom-${cName}`,
            courseName: cName,
            subjectName: 'Jefatura de Curso',
            year: selectedYear,
            isHomeroom: true,
            teacherName: user?.name || 'Profesor(a) Jefe'
          });
        }
      }
    });

    // Ordenar de menor a mayor curso
    return list.sort((a, b) => {
      const order = sortCoursesList([a.courseName, b.courseName]);
      if (order[0] === a.courseName && order[1] === b.courseName && a.courseName !== b.courseName) return -1;
      if (order[0] === b.courseName && order[1] === a.courseName && a.courseName !== b.courseName) return 1;
      return a.subjectName.localeCompare(b.subjectName, 'es', { sensitivity: 'base' });
    });
  }, [assignments, coursesInfo, rawStudents, isAdmin, user, selectedYear]);

  // Filtrado por buscador
  const filteredCards = useMemo(() => {
    if (!searchTerm.trim()) return cardsList;
    const term = normalizeStr(searchTerm);
    return cardsList.filter(c =>
      normalizeStr(c.courseName).includes(term) ||
      normalizeStr(c.subjectName).includes(term)
    );
  }, [cardsList, searchTerm]);

  // Cálculo de promedios para cada tarjeta
  const getCardAverages = (card: TeacherAssignmentCard) => {
    const nCourse = normalizeStr(card.courseName);
    if (card.isHomeroom) {
      const courseRows = averagesSummary.filter(row => {
        const rC = normalizeStr(row.course_name);
        return rC === nCourse || rC.includes(nCourse) || nCourse.includes(rC);
      });
      if (courseRows.length === 0) return { avgS1: null, avgS2: null, avgAnual: null, totalStudents: 0 };
      
      const s1Vals = courseRows.map(r => parseFloat(r.avg_s1)).filter(v => !isNaN(v) && v > 0);
      const s2Vals = courseRows.map(r => parseFloat(r.avg_s2)).filter(v => !isNaN(v) && v > 0);
      const anVals = courseRows.map(r => parseFloat(r.avg_anual)).filter(v => !isNaN(v) && v > 0);

      const avgS1 = s1Vals.length > 0 ? Number((s1Vals.reduce((a, b) => a + b, 0) / s1Vals.length).toFixed(1)) : null;
      const avgS2 = s2Vals.length > 0 ? Number((s2Vals.reduce((a, b) => a + b, 0) / s2Vals.length).toFixed(1)) : null;
      const avgAnual = anVals.length > 0 ? Number((anVals.reduce((a, b) => a + b, 0) / anVals.length).toFixed(1)) : null;
      return { avgS1, avgS2, avgAnual, totalStudents: courseRows[0]?.total_students || 0 };
    }

    const nSub = getCanonicalSubGroup(card.subjectName);
    const rawSub = normalizeStr(card.subjectName);

    const match = averagesSummary.find(row => {
      const rC = normalizeStr(row.course_name);
      const isCourseMatch = rC === nCourse || rC.includes(nCourse) || nCourse.includes(rC);
      if (!isCourseMatch) return false;
      const rS = getCanonicalSubGroup(row.subject_name);
      const rRaw = normalizeStr(row.subject_name);
      return rS === nSub || rRaw === rawSub || rRaw.includes(rawSub) || rawSub.includes(rRaw);
    });

    if (!match) return { avgS1: null, avgS2: null, avgAnual: null, totalStudents: 0 };
    return {
      avgS1: match.avg_s1 ? parseFloat(match.avg_s1) : null,
      avgS2: match.avg_s2 ? parseFloat(match.avg_s2) : null,
      avgAnual: match.avg_anual ? parseFloat(match.avg_anual) : null,
      totalStudents: parseInt(match.total_students || '0', 10)
    };
  };

  // Resumen global de promedios para el docente
  const teacherStats = useMemo(() => {
    const s1List: number[] = [];
    const s2List: number[] = [];
    const anList: number[] = [];
    let evaluatedCards = 0;

    filteredCards.forEach(c => {
      if (c.isHomeroom) return;
      const avgs = getCardAverages(c);
      if (avgs.avgS1) s1List.push(avgs.avgS1);
      if (avgs.avgS2) s2List.push(avgs.avgS2);
      if (avgs.avgAnual) {
        anList.push(avgs.avgAnual);
        evaluatedCards++;
      }
    });

    const teacherS1 = s1List.length > 0 ? (s1List.reduce((a, b) => a + b, 0) / s1List.length).toFixed(1) : null;
    const teacherS2 = s2List.length > 0 ? (s2List.reduce((a, b) => a + b, 0) / s2List.length).toFixed(1) : null;
    const teacherAnual = anList.length > 0 ? (anList.reduce((a, b) => a + b, 0) / anList.length).toFixed(1) : null;

    return {
      teacherS1,
      teacherS2,
      teacherAnual,
      totalCards: filteredCards.length,
      evaluatedCards
    };
  }, [filteredCards, averagesSummary]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* BARRA SUPERIOR IDÉNTICA A LA MAQUETA: "☰ Mis Cursos Asignados" Y BOTONES DE VISTA */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.75rem',
        padding: '0.5rem 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#1e293b',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <List size={20} />
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Mis Cursos Asignados
          </h2>
        </div>

        {/* SELECTOR DE VISTA: LISTA vs CUADRÍCULA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          
          {/* BUSCADOR RÁPIDO */}
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar curso o asignatura..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                width: '210px',
                outline: 'none',
                background: '#ffffff'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '3px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'list' ? '#e2e8f0' : 'transparent',
                color: viewMode === 'list' ? '#1e293b' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Vista en Lista"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.35rem 0.6rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'grid' ? '#e2e8f0' : 'transparent',
                color: viewMode === 'grid' ? '#1e293b' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Vista en Cuadrícula"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* BANNER DE RESUMEN DE PROMEDIOS DEL DOCENTE */}
      {!loading && filteredCards.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          color: '#ffffff',
          boxShadow: '0 8px 20px -4px rgba(30, 27, 75, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              flexShrink: 0
            }}>
              <Award size={26} color="#fbbf24" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#c7d2fe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rendimiento Académico Docente • Año {selectedYear}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.15rem 0 0 0', color: '#ffffff' }}>
                Resumen de Promedios Semestrales y Anuales
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#e0e7ff', marginTop: '0.2rem' }}>
                {isAdmin ? 'Vista General de Asignaturas' : `Docente: ${user?.name || 'Profesor'}`} • {teacherStats.totalCards} asignación(es) ({teacherStats.evaluatedCards} con notas evaluadas)
              </div>
            </div>
          </div>

          {/* INDICADORES CLAVE KPI */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* 1er Semestre */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.55rem 0.95rem',
              textAlign: 'center',
              minWidth: '105px'
            }}>
              <div style={{ fontSize: '0.68rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase' }}>1° Semestre</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.15, marginTop: '2px' }}>
                {teacherStats.teacherS1 ? teacherStats.teacherS1.replace('.', ',') : '—'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#c7d2fe' }}>Promedio S1</div>
            </div>

            {/* 2do Semestre */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.55rem 0.95rem',
              textAlign: 'center',
              minWidth: '105px'
            }}>
              <div style={{ fontSize: '0.68rem', color: '#86efac', fontWeight: 700, textTransform: 'uppercase' }}>2° Semestre</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.15, marginTop: '2px' }}>
                {teacherStats.teacherS2 ? teacherStats.teacherS2.replace('.', ',') : '—'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#c7d2fe' }}>Promedio S2</div>
            </div>

            {/* Promedio Anual ⭐ */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(251, 191, 36, 0.45)',
              borderRadius: '12px',
              padding: '0.55rem 1.1rem',
              textAlign: 'center',
              minWidth: '115px'
            }}>
              <div style={{ fontSize: '0.68rem', color: '#fef08a', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                ⭐ Prom. Anual
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fef08a', lineHeight: 1.15, marginTop: '2px' }}>
                {teacherStats.teacherAnual ? teacherStats.teacherAnual.replace('.', ',') : '—'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#fde68a' }}>Consolidado Anual</div>
            </div>

          </div>
        </div>
      )}

      {/* ESTADO DE CARGA */}
      {loading && (
        <CardSkeletonGrid count={6} />
      )}

      {/* SIN RESULTADOS */}
      {!loading && filteredCards.length === 0 && (
        <EmptyState
          icon={<BookOpen size={36} color="#4f46e5" />}
          title={searchTerm ? 'No se encontraron coincidencias' : 'Sin asignaturas ni cursos vinculados'}
          description={
            searchTerm
              ? `No hay asignaturas que coincidan con "${searchTerm}". Intenta buscar con otro término.`
              : `Tu perfil docente (${user?.name}) no tiene asignaciones vigentes registradas en el sistema para el año académico ${selectedYear}. Solicita al Administrador o a UTP registrar tus asignaciones docentes.`
          }
          actionLabel={searchTerm ? 'Limpiar Búsqueda' : undefined}
          onAction={searchTerm ? () => setSearchTerm('') : undefined}
        />
      )}

      {/* VISTA EN CUADRÍCULA (GRID IDÉNTICO A LA CAPTURA) */}
      {!loading && viewMode === 'grid' && filteredCards.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          {filteredCards.map(card => {
            const bgImage = getSubjectImage(card.subjectName, card.isHomeroom);
            const avgs = getCardAverages(card);

            return (
              <div
                key={card.id}
                onClick={() => onSelectCourse(card.courseName, card.subjectName, card.isHomeroom)}
                style={{
                  position: 'relative',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  minHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -3px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {/* IMAGEN DE FONDO A LA DERECHA CON DEGRADADO SUAVE IDÉNTICO A LA CAPTURA */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '55%',
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    pointerEvents: 'none'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    background: 'linear-gradient(to right, #ffffff 42%, rgba(255,255,255,0.85) 65%, rgba(255,255,255,0.2) 100%)',
                    pointerEvents: 'none'
                  }}
                />

                {/* CONTENIDO SUPERIOR: ÍCONO TABLET/LIBRO + CURSO + ASIGNATURA */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  {/* Ícono superior izquierda */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    marginBottom: '0.75rem',
                    color: '#0f172a'
                  }}>
                    {card.isHomeroom ? (
                      <Star size={20} color="#059669" fill="#10b981" />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                      </svg>
                    )}
                  </div>

                  {/* Nombre del Curso en Negrita */}
                  <h3 style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: '0 0 0.25rem 0',
                    lineHeight: '1.2'
                  }}>
                    {card.courseName}
                  </h3>

                  {/* Asignatura / Especialidad */}
                  <p style={{
                    fontSize: '0.85rem',
                    color: card.isHomeroom ? '#047857' : '#475569',
                    fontWeight: card.isHomeroom ? 700 : 500,
                    margin: 0,
                    lineHeight: '1.3'
                  }}>
                    {card.subjectName}
                  </p>
                </div>

                {/* PROMEDIOS SEMESTRALES Y ANUAL DE LA ASIGNATURA */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  marginTop: '0.85rem',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.4rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  {/* 1° Semestre */}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>1° Sem</div>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: avgs.avgS1 ? (avgs.avgS1 < 4.0 ? '#dc2626' : '#2563eb') : '#94a3b8'
                    }}>
                      {avgs.avgS1 !== null ? avgs.avgS1.toFixed(1).replace('.', ',') : '—'}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

                  {/* 2° Semestre */}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>2° Sem</div>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: avgs.avgS2 ? (avgs.avgS2 < 4.0 ? '#dc2626' : '#059669') : '#94a3b8'
                    }}>
                      {avgs.avgS2 !== null ? avgs.avgS2.toFixed(1).replace('.', ',') : '—'}
                    </div>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

                  {/* Promedio Anual */}
                  <div style={{
                    textAlign: 'center',
                    flex: 1.15,
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '7px',
                    padding: '2px 4px'
                  }}>
                    <div style={{ fontSize: '0.62rem', color: '#7c3aed', fontWeight: 800, textTransform: 'uppercase' }}>⭐ Anual</div>
                    <div style={{
                      fontSize: '0.96rem',
                      fontWeight: 900,
                      color: avgs.avgAnual ? (avgs.avgAnual < 4.0 ? '#dc2626' : '#6d28d9') : '#94a3b8'
                    }}>
                      {avgs.avgAnual !== null ? avgs.avgAnual.toFixed(1).replace('.', ',') : '—'}
                    </div>
                  </div>
                </div>

                {/* CONTENIDO INFERIOR: AÑO Y COMUNICAR */}
                <div style={{ position: 'relative', zIndex: 2, marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: 600
                  }}>
                    Año: {card.year}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSupportModalCourse(card.courseName);
                        setShowSupportModal(true);
                      }}
                      style={{
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#065f46',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      title={`Ver profesionales de apoyo y equipo PIE en ${card.courseName}`}
                    >
                      <Users size={12} /> Apoyo
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalCourse(card.courseName);
                        setShowModal(true);
                      }}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      title={`Enviar mensaje a los profesores del curso ${card.courseName}`}
                    >
                      <MessageSquare size={12} /> Comunicar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('ltp_navigate_tab', { detail: 'curriculum_plans' }));
                      }}
                      style={{
                        background: '#fdf2f8',
                        border: '1px solid #fbcfe8',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#db2777',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      title={`Abrir módulo de planificaciones curriculares & IA`}
                    >
                      <CalendarDays size={12} /> Planificar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA EN LISTA ALTERNATIVA */}
      {!loading && viewMode === 'list' && filteredCards.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Curso</th>
                <th style={{ padding: '0.85rem 1rem' }}>Asignatura</th>
                <th style={{ padding: '0.85rem 1rem' }}>Tipo</th>
                <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>1° Sem</th>
                <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>2° Sem</th>
                <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', background: '#faf5ff', color: '#6b21a8' }}>⭐ Prom. Anual</th>
                <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>Año</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card, idx) => {
                const avgs = getCardAverages(card);

                return (
                <tr
                  key={card.id}
                  onClick={() => onSelectCourse(card.courseName, card.subjectName, card.isHomeroom)}
                  style={{
                    borderBottom: idx === filteredCards.length - 1 ? 'none' : '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                    {card.courseName}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 600 }}>
                    {card.subjectName}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {card.isHomeroom ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <Star size={12} fill="#10b981" /> Jefatura
                      </span>
                    ) : (
                      <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                        Asignatura
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      background: avgs.avgS1 ? (avgs.avgS1 < 4.0 ? '#fee2e2' : '#eff6ff') : '#f1f5f9',
                      color: avgs.avgS1 ? (avgs.avgS1 < 4.0 ? '#dc2626' : '#1d4ed8') : '#94a3b8',
                      border: `1px solid ${avgs.avgS1 ? (avgs.avgS1 < 4.0 ? '#fca5a5' : '#bfdbfe') : '#e2e8f0'}`
                    }}>
                      {avgs.avgS1 !== null ? avgs.avgS1.toFixed(1).replace('.', ',') : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '6px',
                      background: avgs.avgS2 ? (avgs.avgS2 < 4.0 ? '#fee2e2' : '#ecfdf5') : '#f1f5f9',
                      color: avgs.avgS2 ? (avgs.avgS2 < 4.0 ? '#dc2626' : '#047857') : '#94a3b8',
                      border: `1px solid ${avgs.avgS2 ? (avgs.avgS2 < 4.0 ? '#fca5a5' : '#a7f3d0') : '#e2e8f0'}`
                    }}>
                      {avgs.avgS2 !== null ? avgs.avgS2.toFixed(1).replace('.', ',') : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', background: '#faf5ff' }}>
                    <span style={{
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      background: avgs.avgAnual ? (avgs.avgAnual < 4.0 ? '#fee2e2' : '#f5f3ff') : '#f1f5f9',
                      color: avgs.avgAnual ? (avgs.avgAnual < 4.0 ? '#dc2626' : '#6b21a8') : '#94a3b8',
                      border: `1px solid ${avgs.avgAnual ? (avgs.avgAnual < 4.0 ? '#fca5a5' : '#ddd6fe') : '#e2e8f0'}`
                    }}>
                      {avgs.avgAnual !== null ? avgs.avgAnual.toFixed(1).replace('.', ',') : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', color: '#64748b' }}>
                    {card.year}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSupportModalCourse(card.courseName);
                          setShowSupportModal(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.7rem',
                          borderRadius: '6px',
                          border: '1px solid #a7f3d0',
                          background: '#ecfdf5',
                          color: '#065f46',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                        title={`Ver equipo de apoyo y profesionales PIE de ${card.courseName}`}
                      >
                        <Users size={13} /> Apoyo
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalCourse(card.courseName);
                          setShowModal(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#4f46e5',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                        title={`Enviar mensaje o correo a los profesores del curso ${card.courseName}`}
                      >
                        <MessageSquare size={13} /> Comunicar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(new CustomEvent('ltp_navigate_tab', { detail: 'curriculum_plans' }));
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #fbcfe8',
                          background: '#fdf2f8',
                          color: '#db2777',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                        title={`Abrir módulo de planificaciones curriculares & IA`}
                      >
                        <CalendarDays size={13} /> Planificar
                      </button>
                      <button
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#4f46e5',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Ver Notas <ArrowRight size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE COMUNICACIÓN FOCALIZADA */}
      <CourseMessageModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialCourse={modalCourse}
      />

      {/* MODAL DE EQUIPO DE APOYO Y PROFESIONALES DEL CURSO */}
      <CourseSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        courseName={supportModalCourse}
        availableCourses={coursesInfo.map(c => c.name || c.courseName).filter(Boolean)}
      />
    </div>
  );
};

export default TeacherCoursesGrid;
