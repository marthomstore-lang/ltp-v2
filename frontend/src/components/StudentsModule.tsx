import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Calendar,
  Filter,
  UserCheck,
  User,
  Heart,
  UserX,
  Printer,
  ArrowUpDown,
  Compass,
  ShieldAlert,
  Plus
} from 'lucide-react';
import {
  getStudentCourse,
  isStudentRetired,
  getStudentWithdrawalDate,
  sortStudentsList,
  getStudentYear,
  getNextEnrollmentNumberForYear,
  prepareStudentForYearEnrollment
} from '../utils/course';
import {
  Button,
  Badge,
  StatCard,
  EmptyState,
  PageHeader,
  Card
} from './ui';
import { StudentWindow } from './StudentWindow';
import { OfficialEnrollmentForm } from './OfficialEnrollmentForm';
import { ReorderStudentsModal } from './ReorderStudentsModal';
import { EnrollmentSelectorModal } from './EnrollmentSelectorModal';

export interface StudentsModuleProps {
  students: any[];
  token: string;
  canEdit: boolean;
  canAccessPedagogicalTrips?: boolean;
  onNavigateToTrips?: () => void;
  onDataReload: () => void;
  dbDisconnected?: boolean;
}

export const StudentsModule: React.FC<StudentsModuleProps> = ({
  students,
  token,
  canEdit,
  canAccessPedagogicalTrips = false,
  onNavigateToTrips,
  onDataReload,
  dbDisconnected = false
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ltp_selected_academic_year');
      if (saved) return parseInt(saved, 10);
    } catch (_) {}
    return 2026;
  });

  const [courseFilter, setCourseFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [printStudent, setPrintStudent] = useState<any | null>(null);
  const [showReorderModal, setShowReorderModal] = useState<boolean>(false);
  const [showEnrollmentSelector, setShowEnrollmentSelector] = useState<boolean>(false);
  const [enrollmentQueue, setEnrollmentQueue] = useState<any[]>([]);
  const [enrollmentQueueIndex, setEnrollmentQueueIndex] = useState<number>(0);
  const [sessionSavedStudents, setSessionSavedStudents] = useState<any[]>([]);

  const mergedAllStudents = useMemo(() => {
    const map = new Map<string, any>();
    sessionSavedStudents.forEach((s: any) => {
      if (s?.id) map.set(String(s.id), s);
    });
    (students || []).forEach((s: any) => {
      if (s?.id) map.set(String(s.id), s);
    });
    return Array.from(map.values());
  }, [students, sessionSavedStudents]);

  const previousYearStudents = useMemo(() => {
    const prevYear = selectedYear - 1;
    return (students || []).filter(s => {
      if (getStudentYear(s) !== prevYear) return false;
      const g = String(s.desc_grado || '').toLowerCase();
      return !g.includes('egresado 2025');
    });
  }, [students, selectedYear]);

  const hasPreviousYearStudents = selectedYear >= 2027 && previousYearStudents.length > 0;

  const previousYearPendingCount = useMemo(() => {
    if (!hasPreviousYearStudents) return 0;
    const enrolledRuns = new Set(
      mergedAllStudents
        .filter(s => getStudentYear(s) === selectedYear)
        .map(s => String(s.run || s.RUT || '').replace(/[^0-9kK]/g, '').toLowerCase())
        .filter(Boolean)
    );
    return previousYearStudents.filter(s => {
      const r = String(s.run || s.RUT || '').replace(/[^0-9kK]/g, '').toLowerCase();
      return !r || !enrolledRuns.has(r);
    }).length;
  }, [hasPreviousYearStudents, mergedAllStudents, previousYearStudents, selectedYear]);

  const nextEnrollmentNumber = useMemo(
    () => getNextEnrollmentNumberForYear(mergedAllStudents, selectedYear),
    [mergedAllStudents, selectedYear]
  );

  const openNewBlankStudent = () => {
    setEnrollmentQueue([]);
    setEnrollmentQueueIndex(0);
    setSelectedStudent({ anno: selectedYear, academic_year: selectedYear });
  };

  const handleOpenNewEnrollmentFlow = () => {
    if (hasPreviousYearStudents) {
      setShowEnrollmentSelector(true);
    } else {
      openNewBlankStudent();
    }
  };

  const handleSelectSingleFromPrevious = (studentPrev: any, existingTarget?: any) => {
    setEnrollmentQueue([]);
    setEnrollmentQueueIndex(0);
    setShowEnrollmentSelector(false);
    if (existingTarget) {
      setSelectedStudent({ ...existingTarget, anno: getStudentYear(existingTarget) });
    } else {
      setSelectedStudent(prepareStudentForYearEnrollment(studentPrev, selectedYear, mergedAllStudents));
    }
  };

  const handleSelectMultipleFromPrevious = (pickedStudents: any[]) => {
    if (!pickedStudents || pickedStudents.length === 0) return;
    setShowEnrollmentSelector(false);
    setEnrollmentQueue(pickedStudents);
    setEnrollmentQueueIndex(0);
    setSelectedStudent(
      prepareStudentForYearEnrollment(pickedStudents[0], selectedYear, mergedAllStudents, {
        batchIndex: 1,
        batchTotal: pickedStudents.length
      })
    );
  };

  const handleAdvanceQueue = () => {
    const nextIdx = enrollmentQueueIndex + 1;
    if (nextIdx >= enrollmentQueue.length) {
      setEnrollmentQueue([]);
      setEnrollmentQueueIndex(0);
      setSelectedStudent(null);
      return;
    }
    setEnrollmentQueueIndex(nextIdx);
    setSelectedStudent(
      prepareStudentForYearEnrollment(enrollmentQueue[nextIdx], selectedYear, mergedAllStudents, {
        batchIndex: nextIdx + 1,
        batchTotal: enrollmentQueue.length
      })
    );
  };

  // Años disponibles ordenados descendentemente
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2026, 2025, 2027]);
    students.forEach(s => {
      const y = getStudentYear(s);
      if (y && !isNaN(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [students]);

  // Alumnos del año seleccionado
  const yearStudents = useMemo(() => {
    return students.filter(s => getStudentYear(s) === selectedYear);
  }, [students, selectedYear]);

  // Cursos disponibles para el año
  const availableCourses = useMemo(() => {
    const cSet = new Set<string>();
    yearStudents.forEach(s => {
      const c = getStudentCourse(s);
      if (c && c !== 'Sin Asignar' && c !== 'null') cSet.add(c);
    });
    return Array.from(cSet).sort();
  }, [yearStudents]);

  // Alumnos en el alcance del filtro de curso
  const scopeStudents = useMemo(() => {
    return courseFilter === 'Todos'
      ? yearStudents
      : yearStudents.filter(s => getStudentCourse(s) === courseFilter);
  }, [yearStudents, courseFilter]);

  // Métricas
  const totalRegistros = scopeStudents.length;
  const retiradosList = useMemo(() => scopeStudents.filter(s => isStudentRetired(s)), [scopeStudents]);
  const cantidadRetirados = retiradosList.length;

  const activosList = useMemo(() => scopeStudents.filter(s => !isStudentRetired(s)), [scopeStudents]);
  const matriculaActiva = activosList.length;

  const varonesActivos = useMemo(() => {
    return activosList.filter(s => {
      const g = String(s.gender || s.genero || s.sexo || s.GENERO || '').toUpperCase();
      return g === 'M' || g === '1' || g.includes('MASC') || g.includes('VAR');
    }).length;
  }, [activosList]);

  const damasActivas = useMemo(() => {
    return activosList.filter(s => {
      const g = String(s.gender || s.genero || s.sexo || s.GENERO || '').toUpperCase();
      return g === 'F' || g === '2' || g.includes('FEM') || g.includes('DAM');
    }).length;
  }, [activosList]);

  const pctVarones = matriculaActiva > 0 ? Math.round((varonesActivos / matriculaActiva) * 100) : 0;
  const pctDamas = matriculaActiva > 0 ? Math.round((damasActivas / matriculaActiva) * 100) : 0;

  // Filtrado final con búsqueda
  const filteredStudents = useMemo(() => {
    let list = sortStudentsList(scopeStudents);
    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(s => {
      const run = String(s.run || s.RUT || '').toLowerCase();
      const name = String(s.full_name || s.Nombres || '').toLowerCase();
      const mat = String(s.enrollment_number || s.numero_matricula || '').toLowerCase();
      return run.includes(q) || name.includes(q) || mat.includes(q);
    });
  }, [scopeStudents, searchTerm]);

  return (
    <div className="students-module-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER DE PÁGINA */}
      <PageHeader
        title="Nómina Institucional de Estudiantes"
        subtitle="Fichas escolares oficiales FIDE, matrícula activa, apoderados y estados de retiro"
        badge={
          <Badge variant="purple" size="md" dot>
            Periodo Escolar {selectedYear}
          </Badge>
        }
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* SELECTOR DE AÑO LECTIVO */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.45rem 0.85rem',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
              }}
            >
              <Calendar size={16} color="#4f46e5" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Año:</span>
              <select
                value={selectedYear}
                onChange={e => {
                  const y = parseInt(e.target.value, 10);
                  setSelectedYear(y);
                  setCourseFilter('Todos');
                  try {
                    localStorage.setItem('ltp_selected_academic_year', String(y));
                  } catch (_) {}
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  color: '#4338ca',
                  cursor: 'pointer'
                }}
              >
                {availableYears.map(y => {
                  const count = students.filter(s => getStudentYear(s) === y).length;
                  return (
                    <option key={y} value={y}>
                      {y} {y === 2026 ? '(Vigente)' : y === 2027 ? '(Próximo)' : ''} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* FILTRAR POR CURSO */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.45rem 0.85rem',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
              }}
            >
              <Filter size={15} color="#64748b" />
              <select
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <option value="Todos">🏫 Todos los Cursos ({yearStudents.length})</option>
                {availableCourses.map(c => {
                  const countInCourse = yearStudents.filter(s => getStudentCourse(s) === c).length;
                  return (
                    <option key={c} value={c}>
                      {c} ({countInCourse})
                    </option>
                  );
                })}
              </select>
            </div>

            {canAccessPedagogicalTrips && onNavigateToTrips && (
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Compass size={16} color="#059669" />}
                onClick={onNavigateToTrips}
              >
                Salidas Pedagógicas
              </Button>
            )}

            {canEdit && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<ArrowUpDown size={15} />}
                  onClick={() => setShowReorderModal(true)}
                >
                  Reordenar A-Z
                </Button>
                {hasPreviousYearStudents && (
                  <Button
                    variant="secondary"
                    size="md"
                    leftIcon={<Users size={15} color="#4f46e5" />}
                    onClick={() => setShowEnrollmentSelector(true)}
                  >
                    Nómina {selectedYear - 1} ({previousYearPendingCount} pend.)
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Plus size={16} />}
                  onClick={handleOpenNewEnrollmentFlow}
                >
                  Nueva Matrícula {selectedYear}
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* BLOQUEO POR BASE DE DATOS DESCONECTADA */}
      {dbDisconnected && (
        <div
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.08)'
          }}
        >
          <div
            style={{
              background: '#ffe4e6',
              color: '#e11d48',
              padding: '0.85rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#881337' }}>
              Base de Datos Fuera de Línea — Bloqueo de Seguridad Activo
            </div>
            <div style={{ fontSize: '0.84rem', color: '#9f1239', marginTop: '0.25rem', lineHeight: 1.45 }}>
              No se detecta conexión con el servidor oficial PostgreSQL en línea. Para resguardar la confidencialidad, la nómina está pausada.
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => onDataReload()}>
            Reintentar Conexión
          </Button>
        </div>
      )}

      {/* PANEL DE PROCESO DE MATRÍCULA PARA NUEVO AÑO LECTIVO (EJ. 2027) */}
      {!dbDisconnected && canEdit && hasPreviousYearStudents && (
        <div
          style={{
            background: 'linear-gradient(90deg, #eef2ff 0%, #f0fdf4 100%)',
            border: '1.5px solid #c7d2fe',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.06)'
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#312e81', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              🎓 Proceso de Matrícula Escolar {selectedYear}
              <span style={{ background: '#4f46e5', color: '#ffffff', fontSize: '0.74rem', padding: '0.18rem 0.6rem', borderRadius: '9999px', fontWeight: 800 }}>
                Próximo N°: {nextEnrollmentNumber}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.25rem' }}>
              <strong>{matriculaActiva}</strong> matriculados en {selectedYear} • <strong>{previousYearPendingCount}</strong> pendientes desde nómina {selectedYear - 1} ({previousYearStudents.length} totales). Selecciona estudiantes del {selectedYear - 1} para actualizar sus datos o ingresa un estudiante nuevo.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Users size={16} />}
              onClick={() => setShowEnrollmentSelector(true)}
            >
              📋 Seleccionar de Nómina {selectedYear - 1}
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Plus size={16} color="#16a34a" />}
              onClick={openNewBlankStudent}
            >
              ✨ Estudiante Nuevo {selectedYear}
            </Button>
          </div>
        </div>
      )}

      {/* GRID DE KPIs Y TARJETAS MÉTRICAS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.15rem'
        }}
      >
        <StatCard
          label="Matrícula Activa"
          value={dbDisconnected ? '-' : matriculaActiva}
          subtitle={
            dbDisconnected
              ? 'Conexión no disponible'
              : cantidadRetirados > 0
              ? `Descontados los ${cantidadRetirados} retirados`
              : 'Sin retiros registrados'
          }
          icon={<UserCheck size={20} />}
          colorScheme="emerald"
        />

        <StatCard
          label="Varones"
          value={dbDisconnected ? '-' : varonesActivos}
          subtitle={dbDisconnected ? 'Sin conexión' : `${pctVarones}% de la matrícula efectiva`}
          icon={<User size={20} />}
          colorScheme="sky"
        />

        <StatCard
          label="Damas"
          value={dbDisconnected ? '-' : damasActivas}
          subtitle={dbDisconnected ? 'Sin conexión' : `${pctDamas}% de la matrícula efectiva`}
          icon={<Heart size={20} />}
          colorScheme="rose"
        />

        <StatCard
          label="Alumnos Retirados"
          value={dbDisconnected ? '-' : cantidadRetirados}
          subtitle={dbDisconnected ? 'Sin conexión' : `De ${totalRegistros} registros totales`}
          icon={<UserX size={20} />}
          colorScheme="amber"
        />
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRADO RÁPIDO */}
      <Card padding="sm">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div
            style={{
              flex: '1 1 320px',
              display: 'flex',
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0.45rem 0.85rem',
              gap: '0.65rem'
            }}
          >
            <Search size={18} color="#64748b" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar por Nombre, Apellido, RUN o N° de Matrícula..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.88rem',
                fontWeight: 500,
                color: '#0f172a',
                width: '100%'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  border: 'none',
                  background: '#e2e8f0',
                  color: '#475569',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                Limpiar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Badge variant={searchTerm ? 'purple' : 'neutral'} size="md">
              <Users size={14} style={{ marginRight: '4px' }} />
              {filteredStudents.length} estudiantes {searchTerm ? `de ${scopeStudents.length}` : 'visibles'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* TABLA PRINCIPAL DE ESTUDIANTES */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: '85px' }}>N° Lista</th>
              <th style={{ width: '150px' }}>RUN / Matrícula</th>
              <th>Nombre Completo</th>
              <th style={{ width: '130px' }}>Curso</th>
              <th>Profesor Jefe</th>
              <th style={{ width: '220px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem 1rem' }}>
                  {dbDisconnected ? (
                    <EmptyState
                      icon={<ShieldAlert size={32} color="#dc2626" />}
                      title="Nómina Pausada por Seguridad"
                      description="No hay enlace activo con la base de datos oficial. Los registros no se renderizan para salvaguardar la privacidad."
                      actionLabel="Reintentar Conexión"
                      onAction={() => onDataReload()}
                    />
                  ) : searchTerm.trim() ? (
                    <EmptyState
                      icon={<Search size={32} color="#6366f1" />}
                      title={`No se encontraron resultados para "${searchTerm}"`}
                      description="Comprueba que el RUN o los apellidos coincidan con la nómina oficial del establecimiento."
                      actionLabel="Limpiar Búsqueda"
                      onAction={() => setSearchTerm('')}
                    />
                  ) : (
                    <EmptyState
                      icon={<Calendar size={32} color="#4f46e5" />}
                      title={`No hay alumnos registrados en el periodo ${selectedYear}`}
                      description={
                        courseFilter !== 'Todos'
                          ? `No se registran matrículas para el curso "${courseFilter}" en el año lectivo ${selectedYear}.`
                          : hasPreviousYearStudents
                          ? `El año académico ${selectedYear} comienza desde el N° ${nextEnrollmentNumber}. Selecciona estudiantes del ${selectedYear - 1} para actualizar datos o matricula estudiantes nuevos.`
                          : `El año académico ${selectedYear} aún no tiene nómina importada o activa.`
                      }
                      actionLabel={canEdit ? (hasPreviousYearStudents ? `📋 Seleccionar de Nómina ${selectedYear - 1} / Nuevo ${selectedYear}` : `+ Iniciar Nueva Matrícula ${selectedYear}`) : undefined}
                      onAction={
                        canEdit
                          ? handleOpenNewEnrollmentFlow
                          : undefined
                      }
                    />
                  )}
                </td>
              </tr>
            ) : (
              filteredStudents.map((s: any, idx: number) => {
                const studentWithYear = { ...s, anno: getStudentYear(s) };
                const retired = isStudentRetired(s);
                const retiredDate = getStudentWithdrawalDate(s);
                return (
                  <tr
                    key={s.id || idx}
                    style={{
                      backgroundColor: retired ? '#fff5f5' : undefined,
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: retired ? '#dc2626' : '#4f46e5',
                          fontSize: '0.85rem'
                        }}
                      >
                        #{s.list_number || idx + 1}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong
                          style={{
                            color: retired ? '#dc2626' : '#0f172a',
                            textDecoration: retired ? 'line-through' : 'none',
                            fontSize: '0.85rem'
                          }}
                        >
                          {s.run || s.RUT}
                        </strong>
                      </div>
                      {(s.enrollment_number || s.numero_matricula) && (
                        <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 700, marginTop: '2px' }}>
                          Matrícula: {s.enrollment_number || s.numero_matricula}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: retired ? '#dc2626' : '#0f172a',
                            textDecoration: retired ? 'line-through' : 'none'
                          }}
                        >
                          {s.full_name || s.Nombres}
                        </span>
                        {retired && (
                          <Badge variant="danger" size="sm">
                            Retirado {retiredDate ? `(${retiredDate})` : ''}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge variant={retired ? 'danger' : 'info'} size="md">
                        {getStudentCourse(s)}
                      </Badge>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.84rem', color: '#475569' }}>
                        {!s.profesor_jefe || s.profesor_jefe === 'null' || s.profesor_jefe === 'undefined'
                          ? s.teacher_name && s.teacher_name !== 'null'
                            ? s.teacher_name
                            : 'Sin Asignar'
                          : s.profesor_jefe}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'center' }}>
                        <Button
                          variant={retired ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => setSelectedStudent(studentWithYear)}
                        >
                          {canEdit ? '👁️ Ficha Completa' : '👁️ Ver Ficha'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Printer size={13} />}
                          onClick={() => setPrintStudent(studentWithYear)}
                        >
                          FIDE
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL FICHA DE ESTUDIANTE */}
      {selectedStudent && (
        <StudentWindow
          key={selectedStudent.id || selectedStudent._clonedFromStudentId || `new-${selectedYear}-${enrollmentQueueIndex}`}
          student={selectedStudent}
          token={token}
          readOnly={!canEdit}
          onClose={() => {
            setSelectedStudent(null);
            setEnrollmentQueue([]);
            setEnrollmentQueueIndex(0);
          }}
          onSave={savedStudent => {
            if (savedStudent) {
              setSessionSavedStudents(prev => {
                const filtered = prev.filter(item => item.id !== savedStudent.id);
                return [...filtered, savedStudent];
              });
            }
            onDataReload();
          }}
          onPrint={s => setPrintStudent(s)}
          batchInfo={
            enrollmentQueue.length > 1
              ? {
                  current: enrollmentQueueIndex + 1,
                  total: enrollmentQueue.length,
                  nextStudentName: enrollmentQueue[enrollmentQueueIndex + 1]?.full_name,
                  onNextStudent:
                    enrollmentQueueIndex + 1 < enrollmentQueue.length ? handleAdvanceQueue : undefined
                }
              : undefined
          }
        />
      )}

      {/* MODAL SELECTOR DE ESTUDIANTES DEL AÑO ANTERIOR Y NUEVO INGRESO */}
      {showEnrollmentSelector && (
        <EnrollmentSelectorModal
          isOpen={showEnrollmentSelector}
          onClose={() => setShowEnrollmentSelector(false)}
          allStudents={mergedAllStudents}
          targetYear={selectedYear}
          onSelectSingleFromPrevious={handleSelectSingleFromPrevious}
          onSelectMultipleFromPrevious={handleSelectMultipleFromPrevious}
          onSelectNewStudent={() => {
            setShowEnrollmentSelector(false);
            openNewBlankStudent();
          }}
        />
      )}

      {/* MODAL DE IMPRESIÓN OFICIAL FIDE */}
      {printStudent && (
        <OfficialEnrollmentForm
          student={printStudent}
          onClose={() => setPrintStudent(null)}
        />
      )}

      {/* MODAL REORDENAR N° LISTA */}
      {showReorderModal && (
        <ReorderStudentsModal
          students={yearStudents}
          token={token}
          onClose={() => setShowReorderModal(false)}
          onSuccess={() => onDataReload()}
        />
      )}
    </div>
  );
};
