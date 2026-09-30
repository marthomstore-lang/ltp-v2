import React, { useState, useMemo, useEffect } from 'react';
import { Award, AlertTriangle, CheckCircle, ShieldAlert, Plus, Filter, Users, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import { getStudentCourse, sortCoursesList } from '../utils/course';

interface ObservationsModuleProps {
  token: string;
}

const formatDateTime24h = (dateStr?: string, createdAtStr?: string) => {
  const target = createdAtStr || dateStr;
  if (!target) return { date: '-', time: '' };

  try {
    const d = new Date(target);
    if (isNaN(d.getTime())) {
      return { date: String(target), time: '' };
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes} hrs`;

    const hasTime = Boolean(createdAtStr || (dateStr && dateStr.includes('T') && !dateStr.endsWith('T00:00:00.000Z') && !dateStr.endsWith('T04:00:00.000Z')));

    return {
      date: dateFormatted,
      time: (createdAtStr || hasTime) ? timeFormatted : ''
    };
  } catch (_) {
    return { date: String(target), time: '' };
  }
};

export const ObservationsModule: React.FC<ObservationsModuleProps> = ({ token }) => {
  const [selectedCourse, setSelectedCourse] = useState<string>('Todos');
  const [studentId, setStudentId] = useState<string>('Todos');
  const [students, setStudents] = useState<any[]>([]);
  const [type, setType] = useState<'Positiva' | 'Negativa' | 'Demérito' | 'Medida Pedagógica'>('Positiva');
  const [content, setContent] = useState('');
  const [observations, setObservations] = useState<any[]>([]);

  const loadData = () => {
    fetch('/api/observations', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setObservations(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setStudents(data);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Obtener lista única y ordenada de cursos
  const coursesList = useMemo(() => {
    if (!students.length) return [];
    const unique = Array.from(new Set(students.map(s => getStudentCourse(s)))).filter(Boolean);
    return sortCoursesList(unique);
  }, [students]);

  // Filtrar estudiantes pertenecientes al curso seleccionado
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedCourse !== 'Todos') {
      list = students.filter(s => getStudentCourse(s) === selectedCourse);
    }
    return [...list].sort((a, b) => {
      const nameA = a.full_name || a.Nombres || '';
      const nameB = b.full_name || b.Nombres || '';
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  }, [students, selectedCourse]);

  // Si cambia el curso y el estudiante seleccionado no pertenece a ese curso, re-seleccionar 'Todos' o el primero
  useEffect(() => {
    if (studentId !== 'Todos') {
      const exists = filteredStudents.some(s => (s.id || s.run) === studentId);
      if (!exists && filteredStudents.length > 0) {
        setStudentId(filteredStudents[0].id || filteredStudents[0].run);
      }
    }
  }, [selectedCourse, filteredStudents]);

  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!studentId || studentId === 'Todos') {
      Swal.fire('Atención', 'Seleccione un estudiante específico para registrar la observación', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentId,
          type,
          content: content.trim(),
          detail: content.trim(),
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!res.ok) throw new Error('Error al registrar anotación');

      setContent('');
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Anotación registrada en el sistema', timer: 1500, showConfirmButton: false });
      loadData();
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const getTypeBadge = (obsType: string) => {
    switch (obsType) {
      case 'Positiva':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>Positiva</span>;
      case 'Negativa':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>Negativa</span>;
      case 'Demérito':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>Demérito</span>;
      case 'Medida Pedagógica':
        return <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700 }}>Medida Pedagógica</span>;
      default:
        return null;
    }
  };

  // Filtrado de observaciones en la tabla histórica
  const filteredObservations = useMemo(() => {
    return observations.filter(obs => {
      // Si se filtró por un estudiante específico
      if (studentId !== 'Todos') {
        const matchStudent = obs.studentId === studentId || obs.student_id === studentId;
        if (!matchStudent) return false;
      }

      // Si se filtró por un curso específico
      if (selectedCourse !== 'Todos') {
        const student = students.find(s => (s.id || s.run) === (obs.studentId || obs.student_id));
        if (student && getStudentCourse(student) !== selectedCourse) {
          return false;
        }
      }

      return true;
    });
  }, [observations, selectedCourse, studentId, students]);

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem', color: '#0f172a' }}>
        Hoja de Vida y Anotaciones de Convivencia
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Registro unificado de anotaciones Positivas, Negativas, Deméritos y Medidas Pedagógicas
      </p>

      {/* Formulario de Nueva Anotación con Filtro por Curso y Estudiante */}
      <form onSubmit={handleAddObservation} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          
          {/* 1. SELECCIÓN / FILTRO POR CURSO */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
              <Filter size={14} color="#4f46e5" /> Curso / Nivel
            </label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#ffffff', color: '#1e293b' }}
            >
              <option value="Todos">🏫 Todos los Cursos ({students.length})</option>
              {coursesList.map(c => {
                const count = students.filter(s => getStudentCourse(s) === c).length;
                return (
                  <option key={c} value={c}>{c} ({count})</option>
                );
              })}
            </select>
          </div>

          {/* 2. SELECCIÓN DE ESTUDIANTE (FILTRADO POR CURSO) */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
              <Users size={14} color="#4f46e5" /> Estudiante
            </label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#ffffff', color: '#1e293b' }}
            >
              <option value="Todos">👤 Todos los estudiantes del filtro ({filteredStudents.length})</option>
              {filteredStudents.map(s => (
                <option key={s.id || s.run} value={s.id || s.run}>
                  {s.full_name || s.Nombres} ({getStudentCourse(s)})
                </option>
              ))}
            </select>
          </div>

          {/* 3. TIPO DE ANOTACIÓN */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
              Tipo de Anotación
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as any)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#ffffff', color: '#1e293b' }}
            >
              <option value="Positiva">Positiva</option>
              <option value="Negativa">Negativa</option>
              <option value="Demérito">Demérito</option>
              <option value="Medida Pedagógica">Medida Pedagógica</option>
            </select>
          </div>

        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
            Detalle de la Observación
          </label>
          <textarea
            rows={2}
            required
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escriba el detalle de la anotación..."
            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
          <Plus size={16} /> Registrar Anotación
        </button>
      </form>

      {/* Historial de Anotaciones */}
      <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>
              <th style={{ padding: '0.75rem 1rem' }}>FECHA Y HORA</th>
              <th style={{ padding: '0.75rem 1rem' }}>ESTUDIANTE</th>
              <th style={{ padding: '0.75rem 1rem' }}>TIPO</th>
              <th style={{ padding: '0.75rem 1rem' }}>AUTOR / FUNCIONARIO</th>
              <th style={{ padding: '0.75rem 1rem' }}>DETALLE DE LA OBSERVACIÓN</th>
            </tr>
          </thead>
          <tbody>
            {filteredObservations.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No hay anotaciones registradas para el filtro seleccionado.
                </td>
              </tr>
            ) : (
              filteredObservations.map(obs => {
                const std = students.find(s => (s.id || s.run) === (obs.studentId || obs.student_id));
                const studentName = std ? (std.full_name || std.Nombres) : (obs.student_name || 'Estudiante');
                const studentCourse = std ? getStudentCourse(std) : '';
                const dateTime = formatDateTime24h(obs.date, obs.created_at || obs.createdAt);

                return (
                  <tr key={obs.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                          {dateTime.date}
                        </span>
                        {dateTime.time && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#4f46e5', 
                            fontWeight: 700, 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            background: '#eef2ff',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            width: 'fit-content'
                          }}>
                            <Clock size={11} /> {dateTime.time}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{studentName}</strong>
                      {studentCourse && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{studentCourse}</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{getTypeBadge(obs.type)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}><strong>{obs.author_name || 'Docente / Funcionario'}</strong></td>
                    <td style={{ padding: '0.75rem 1rem', color: '#1e293b', fontSize: '0.88rem', lineHeight: 1.5, minWidth: '280px' }}>
                      <div style={{ fontWeight: 500, wordBreak: 'break-word', color: '#1e293b' }}>
                        {obs.detail || obs.content || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin detalle especificado</span>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

