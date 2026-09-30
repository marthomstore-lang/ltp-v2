import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, List, BookOpen, Star, AlertTriangle, ArrowRight, Calendar, UserCheck, Search, Filter, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getStudentCourse, sortCoursesList } from '../utils/course';
import { CourseMessageModal } from './CourseMessageModal';
import { CourseSupportModal } from './CourseSupportModal';

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
      fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ([]))
    ]).then(([assignmentsData, coursesRes, studentsData]) => {
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setCoursesInfo((coursesRes && Array.isArray(coursesRes.courses)) ? coursesRes.courses : []);
      setRawStudents(Array.isArray(studentsData) ? studentsData : []);
    }).catch(err => {
      console.error('Error cargando datos de cursos asignados:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, [token]);

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

      {/* ESTADO DE CARGA */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontWeight: 600 }}>Cargando asignaturas y cursos asignados...</p>
        </div>
      )}

      {/* SIN RESULTADOS */}
      {!loading && filteredCards.length === 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}>
          <AlertTriangle size={48} color="#d97706" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#92400e', marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.2rem' }}>
            {searchTerm ? 'No se encontraron coincidencias' : 'Sin asignaturas ni cursos vinculados'}
          </h3>
          <p style={{ color: '#b45309', maxWidth: '580px', margin: '0 auto', fontSize: '0.92rem', lineHeight: '1.6' }}>
            {searchTerm
              ? `No hay asignaturas que coincidan con "${searchTerm}". Intenta con otro término.`
              : `Tu perfil docente (${user?.name}) no tiene asignaciones vigentes registradas en el sistema para el año académico ${selectedYear}. Solicita al Administrador o a UTP registrar tus asignaciones docentes.`}
          </p>
        </div>
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

                {/* CONTENIDO INFERIOR: AÑO Y COMUNICAR */}
                <div style={{ position: 'relative', zIndex: 2, marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <th style={{ padding: '0.85rem 1.25rem' }}>Curso</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Asignatura</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Tipo</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Año</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card, idx) => (
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
                  <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    {card.courseName}
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem', color: '#334155', fontWeight: 600 }}>
                    {card.subjectName}
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem' }}>
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
                  <td style={{ padding: '0.85rem 1.25rem', color: '#64748b' }}>
                    {card.year}
                  </td>
                  <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
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
              ))}
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
