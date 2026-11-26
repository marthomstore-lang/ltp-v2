import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Filter,
  Sparkles,
  Edit3
} from 'lucide-react';
import {
  getStudentYear,
  getStudentCourse,
  sortCoursesList,
  sortStudentsList,
  isStudentRetired,
  getSuggestedNextCourse,
  getNextEnrollmentNumberForYear
} from '../utils/course';

export interface EnrollmentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStudents: any[];
  targetYear: number;
  onSelectSingleFromPrevious: (studentFromPrevYear: any, existingTargetStudent?: any) => void;
  onSelectMultipleFromPrevious?: (studentsFromPrevYear: any[]) => void;
  onSelectNewStudent?: () => void;
  titleOverride?: string;
}

const normalizeRutDigits = (rut: any): string =>
  String(rut || '').replace(/[^0-9kK]/g, '').toLowerCase();

export const EnrollmentSelectorModal: React.FC<EnrollmentSelectorModalProps> = ({
  isOpen,
  onClose,
  allStudents,
  targetYear,
  onSelectSingleFromPrevious,
  onSelectMultipleFromPrevious,
  onSelectNewStudent,
  titleOverride
}) => {
  const sourceYear = targetYear - 1;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'enrolled'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds([]);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const targetStudentsMap = useMemo(() => {
    const map = new Map<string, any>();
    (allStudents || []).forEach((s: any) => {
      if (getStudentYear(s) === targetYear) {
        const key = normalizeRutDigits(s.run || s.RUT);
        if (key) map.set(key, s);
      }
    });
    return map;
  }, [allStudents, targetYear]);

  const sourceYearStudents = useMemo(() => {
    const list = (allStudents || []).filter((s: any) => {
      if (getStudentYear(s) !== sourceYear) return false;
      const gradeStr = String(s.desc_grado || '').toLowerCase();
      if (gradeStr.includes('egresado 2025')) return false;
      return true;
    });
    return sortStudentsList(list);
  }, [allStudents, sourceYear]);

  const availableSourceCourses = useMemo(() => {
    const set = new Set<string>();
    sourceYearStudents.forEach((s: any) => {
      const c = getStudentCourse(s);
      if (c && c !== 'Sin Curso') set.add(c);
    });
    return sortCoursesList(Array.from(set));
  }, [sourceYearStudents]);

  const nextEnrollmentNumber = useMemo(
    () => getNextEnrollmentNumberForYear(allStudents, targetYear),
    [allStudents, targetYear]
  );

  const counts = useMemo(() => {
    let enrolled = 0;
    let pending = 0;
    sourceYearStudents.forEach((s: any) => {
      const key = normalizeRutDigits(s.run || s.RUT);
      if (key && targetStudentsMap.has(key)) enrolled++;
      else pending++;
    });
    return { total: sourceYearStudents.length, enrolled, pending };
  }, [sourceYearStudents, targetStudentsMap]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const cleanQ = q.replace(/[.-]/g, '');

    return sourceYearStudents.filter((s: any) => {
      const c = getStudentCourse(s);
      if (courseFilter !== 'Todos' && c !== courseFilter) return false;

      const key = normalizeRutDigits(s.run || s.RUT);
      const isEnrolled = Boolean(key && targetStudentsMap.has(key));
      if (statusFilter === 'pending' && isEnrolled) return false;
      if (statusFilter === 'enrolled' && !isEnrolled) return false;

      if (!q) return true;
      const name = String(s.full_name || s.Nombres || '').toLowerCase();
      const run = String(s.run || s.RUT || '').toLowerCase();
      const mat = String(s.enrollment_number || s.numero_matricula || '').toLowerCase();
      return (
        name.includes(q) ||
        run.includes(q) ||
        key.includes(cleanQ) ||
        mat.includes(q) ||
        c.toLowerCase().includes(q)
      );
    });
  }, [sourceYearStudents, courseFilter, statusFilter, searchTerm, targetStudentsMap]);

  const selectableVisible = useMemo(
    () =>
      filteredStudents.filter((s: any) => {
        const key = normalizeRutDigits(s.run || s.RUT);
        return !(key && targetStudentsMap.has(key));
      }),
    [filteredStudents, targetStudentsMap]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = selectableVisible.map((s: any) => String(s.id));
    if (visibleIds.length === 0) return;
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleStartBatch = () => {
    if (!onSelectMultipleFromPrevious || selectedIds.length === 0) return;
    const picked = sourceYearStudents.filter((s: any) => selectedIds.includes(String(s.id)));
    if (picked.length === 1) {
      onSelectSingleFromPrevious(picked[0]);
    } else if (picked.length > 1) {
      onSelectMultipleFromPrevious(picked);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2500,
        padding: '1rem'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '96vw',
          maxWidth: '1120px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
        }}
      >
        {/* ENCABEZADO MODAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)',
            color: '#ffffff',
            padding: '1.15rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.22rem', fontWeight: 800, margin: 0 }}>
                {titleOverride || `Proceso de Matrícula ${targetYear} — Selección de Estudiantes`}
              </h2>
              <span
                style={{
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  padding: '0.22rem 0.65rem',
                  borderRadius: '9999px'
                }}
              >
                Siguiente N° Matrícula {targetYear}: {nextEnrollmentNumber}
              </span>
            </div>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.82rem', opacity: 0.92 }}>
              Selecciona al o los estudiantes del año {sourceYear} para actualizar sus datos y matricular en {targetYear}, o registra un estudiante nuevo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.16)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Cerrar selector (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* TARJETA INGRESO ESTUDIANTE NUEVO */}
        {onSelectNewStudent && (
          <div
            style={{
              background: 'linear-gradient(90deg, #f0fdf4 0%, #ecfdf5 100%)',
              borderBottom: '1px solid #bbf7d0',
              padding: '0.9rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#14532d', fontSize: '0.92rem' }}>
                  ¿Es un Estudiante Nuevo (Ingreso {targetYear} / No estuvo el {sourceYear})?
                </div>
                <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '2px' }}>
                  Se abrirá una ficha en blanco para completar toda la información del nuevo estudiante con correlativo inicial <strong>{nextEnrollmentNumber}</strong>.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onSelectNewStudent}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.6rem 1.15rem',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)'
              }}
            >
              <UserPlus size={17} /> Matricular Estudiante Nuevo ({nextEnrollmentNumber})
            </button>
          </div>
        )}

        {/* BARRA DE BÚSQUEDA, FILTROS Y PROGRESO */}
        <div
          style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '0.9rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Users size={17} color="#4f46e5" />
              Nómina de Estudiantes {sourceYear} (Continuidad y Actualización de Datos)
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  padding: '0.32rem 0.7rem',
                  borderRadius: '8px',
                  border: statusFilter === 'all' ? '1.5px solid #4f46e5' : '1px solid #cbd5e1',
                  background: statusFilter === 'all' ? '#e0e7ff' : '#ffffff',
                  color: statusFilter === 'all' ? '#3730a3' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                Todos ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                style={{
                  padding: '0.32rem 0.7rem',
                  borderRadius: '8px',
                  border: statusFilter === 'pending' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                  background: statusFilter === 'pending' ? '#fef3c7' : '#ffffff',
                  color: statusFilter === 'pending' ? '#92400e' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                ⏳ Pendientes {targetYear} ({counts.pending})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('enrolled')}
                style={{
                  padding: '0.32rem 0.7rem',
                  borderRadius: '8px',
                  border: statusFilter === 'enrolled' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                  background: statusFilter === 'enrolled' ? '#dcfce7' : '#ffffff',
                  color: statusFilter === 'enrolled' ? '#166534' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                ✅ Ya Matriculados ({counts.enrolled})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={`Buscar estudiante del ${sourceYear} por Nombre, Apellido, RUT o Matrícula ${sourceYear}...`}
                style={{
                  width: '100%',
                  padding: '0.58rem 0.85rem 0.58rem 2.25rem',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '9px',
                padding: '0.45rem 0.75rem'
              }}
            >
              <Filter size={15} color="#64748b" />
              <select
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontWeight: 700,
                  fontSize: '0.83rem',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <option value="Todos">🏫 Todos los Cursos {sourceYear} ({sourceYearStudents.length})</option>
                {availableSourceCourses.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABLA DE ESTUDIANTES DEL AÑO ANTERIOR */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
          {filteredStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <Users size={38} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>
                No hay estudiantes del {sourceYear} que coincidan con el filtro actual
              </div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Prueba limpiando el buscador o cambiando el filtro de estado/curso.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 800 }}>
                  {onSelectMultipleFromPrevious && (
                    <th style={{ padding: '0.65rem 0.6rem', width: '36px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        title="Seleccionar todos los pendientes visibles"
                        checked={selectableVisible.length > 0 && selectableVisible.every(s => selectedIds.includes(String(s.id)))}
                        onChange={toggleSelectAllVisible}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '0.65rem 0.65rem', width: '135px' }}>RUT / Mat. {sourceYear}</th>
                  <th style={{ padding: '0.65rem 0.65rem' }}>Estudiante</th>
                  <th style={{ padding: '0.65rem 0.65rem' }}>Curso {sourceYear} ➔ Proyección {targetYear}</th>
                  <th style={{ padding: '0.65rem 0.65rem', width: '185px' }}>Estado {targetYear}</th>
                  <th style={{ padding: '0.65rem 0.65rem', textAlign: 'right', width: '215px' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s: any, idx: number) => {
                  const rutKey = normalizeRutDigits(s.run || s.RUT);
                  const existingTarget = rutKey ? targetStudentsMap.get(rutKey) : undefined;
                  const retiredPrev = isStudentRetired(s);
                  const proj = getSuggestedNextCourse(s);
                  const isChecked = selectedIds.includes(String(s.id));

                  return (
                    <tr
                      key={s.id || idx}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isChecked ? '#eef2ff' : existingTarget ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                      }}
                    >
                      {onSelectMultipleFromPrevious && (
                        <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            disabled={Boolean(existingTarget)}
                            checked={isChecked}
                            onChange={() => toggleSelect(String(s.id))}
                            title={existingTarget ? `Ya matriculado en ${targetYear}` : `Seleccionar a ${s.full_name}`}
                            style={{ cursor: existingTarget ? 'not-allowed' : 'pointer', width: '15px', height: '15px' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '0.6rem 0.65rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.run || s.RUT}</div>
                        <div style={{ fontSize: '0.73rem', color: '#4f46e5', fontWeight: 700 }}>
                          Mat. {sourceYear}: {s.enrollment_number || s.numero_matricula || 'S/N'}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.65rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {s.full_name || s.Nombres}
                        </div>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '2px' }}>
                          {s.guardian_name && (
                            <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                              Apoderado: {s.guardian_name}
                            </span>
                          )}
                          {retiredPrev && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '0.05rem 0.4rem',
                                borderRadius: '4px'
                              }}
                            >
                              Retirado en {sourceYear}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.65rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                          {proj.currentCourse}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: proj.isGraduating ? '#7c3aed' : '#0369a1', marginTop: '2px' }}>
                          ➔ {proj.isGraduating ? 'Egresado 4° Medio (Solo si repite)' : proj.nextCourse}
                          {proj.is2doMedioBranchChoice && (
                            <span style={{ display: 'block', fontSize: '0.69rem', color: '#b45309', fontWeight: 700 }}>
                              * Confirmar Mecánica o Párvulos
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 0.65rem' }}>
                        {existingTarget ? (
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#dcfce7',
                                color: '#166534',
                                border: '1px solid #86efac',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                padding: '0.18rem 0.5rem',
                                borderRadius: '6px'
                              }}
                            >
                              <CheckCircle2 size={13} /> {existingTarget.enrollment_number || `Matriculado ${targetYear}`}
                            </span>
                            <div style={{ fontSize: '0.71rem', color: '#15803d', marginTop: '2px', fontWeight: 600 }}>
                              {getStudentCourse(existingTarget)}
                            </div>
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              padding: '0.18rem 0.5rem',
                              borderRadius: '6px'
                            }}
                          >
                            <Clock size={12} /> Pendiente {targetYear}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.65rem', textAlign: 'right' }}>
                        {existingTarget ? (
                          <button
                            type="button"
                            onClick={() => onSelectSingleFromPrevious(s, existingTarget)}
                            style={{
                              background: '#ffffff',
                              color: '#166534',
                              border: '1px solid #22c55e',
                              borderRadius: '8px',
                              padding: '0.42rem 0.8rem',
                              fontWeight: 800,
                              fontSize: '0.77rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit3 size={13} /> Editar Ficha {targetYear}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectSingleFromPrevious(s)}
                            style={{
                              background: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.45rem 0.85rem',
                              fontWeight: 800,
                              fontSize: '0.77rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            Matricular y Actualizar <ArrowRight size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* BARRA INFERIOR DE SELECCIÓN MÚLTIPLE / CIERRE */}
        <div
          style={{
            background: selectedIds.length > 0 ? '#eef2ff' : '#f8fafc',
            borderTop: '1px solid #cbd5e1',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          {selectedIds.length > 0 && onSelectMultipleFromPrevious ? (
            <>
              <div style={{ fontWeight: 800, color: '#312e81', fontSize: '0.88rem' }}>
                ✅ {selectedIds.length} estudiante(s) del {sourceYear} seleccionado(s) para matricular y actualizar uno por uno en {targetYear}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.5rem 0.9rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Limpiar Selección
                </button>
                <button
                  type="button"
                  onClick={handleStartBatch}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1.15rem',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
                  }}
                >
                  Iniciar Matrícula de {selectedIds.length} Seleccionado(s) <ArrowRight size={15} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Tip: Puedes hacer clic directo en <strong>"Matricular y Actualizar"</strong> en un alumno, marcar varios con casillas para ir en fila, o usar <strong>"Matricular Estudiante Nuevo"</strong>.
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#e2e8f0',
                  color: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontWeight: 700,
                  fontSize: '0.83rem',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
