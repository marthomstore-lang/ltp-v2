import React, { useState, useMemo, useEffect } from 'react';
import { Award, AlertTriangle, CheckCircle, ShieldAlert, Plus, Filter, Users, Clock, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import { getStudentCourse, sortCoursesList, sortStudentsList } from '../utils/course';
import { Button, Badge, Card, EmptyState, TableSkeleton, PageHeader } from './ui';

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

    const hasTime = Boolean(
      createdAtStr ||
        (dateStr &&
          dateStr.includes('T') &&
          !dateStr.endsWith('T00:00:00.000Z') &&
          !dateStr.endsWith('T04:00:00.000Z'))
    );

    return {
      date: dateFormatted,
      time: createdAtStr || hasTime ? timeFormatted : ''
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
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resObs, resStd] = await Promise.all([
        fetch('/api/observations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const dataObs = await resObs.json();
      const dataStd = await resStd.json();

      setObservations(Array.isArray(dataObs) ? dataObs : []);
      if (Array.isArray(dataStd) && dataStd.length > 0) {
        setStudents(dataStd);
      }
    } catch (err) {
      console.error('Error cargando observaciones:', err);
    } finally {
      setLoading(false);
    }
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

  // Filtrar estudiantes pertenecientes al curso seleccionado y ordenar
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selectedCourse !== 'Todos') {
      list = students.filter(s => getStudentCourse(s) === selectedCourse);
    }
    return sortStudentsList(list);
  }, [students, selectedCourse]);

  // Si cambia el curso y el estudiante seleccionado no pertenece a ese curso, re-seleccionar
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

    setSubmitting(true);
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
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Anotación registrada en el sistema',
        timer: 1800,
        showConfirmButton: false
      });
      loadData();
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTypeBadge = (obsType: string) => {
    switch (obsType) {
      case 'Positiva':
        return <Badge variant="success" size="md">Positiva</Badge>;
      case 'Negativa':
        return <Badge variant="danger" size="md">Negativa</Badge>;
      case 'Demérito':
        return <Badge variant="warning" size="md">Demérito</Badge>;
      case 'Medida Pedagógica':
        return <Badge variant="purple" size="md">Medida Pedagógica</Badge>;
      default:
        return <Badge variant="neutral" size="md">{obsType}</Badge>;
    }
  };

  // Filtrado de observaciones en la tabla histórica
  const filteredObservations = useMemo(() => {
    return observations.filter(obs => {
      if (studentId !== 'Todos') {
        const matchStudent = obs.studentId === studentId || obs.student_id === studentId;
        if (!matchStudent) return false;
      }

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageHeader
        title="Hoja de Vida y Anotaciones de Convivencia"
        subtitle="Registro oficial de observaciones Positivas, Negativas, Deméritos y Medidas Pedagógicas RICE"
        badge={
          <Badge variant="purple" size="md" dot>
            {filteredObservations.length} Anotaciones
          </Badge>
        }
      />

      {/* Formulario de Nueva Anotación con Layout Responsivo */}
      <Card padding="md">
        <form onSubmit={handleAddObservation}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}
          >
            {/* 1. SELECCIÓN / FILTRO POR CURSO */}
            <div>
              <label
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.4rem'
                }}
              >
                <Filter size={15} color="#4f46e5" /> Curso / Nivel
              </label>
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none'
                }}
              >
                <option value="Todos">🏫 Todos los Cursos ({students.length})</option>
                {coursesList.map(c => {
                  const count = students.filter(s => getStudentCourse(s) === c).length;
                  return (
                    <option key={c} value={c}>
                      {c} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. SELECCIÓN DE ESTUDIANTE */}
            <div>
              <label
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.4rem'
                }}
              >
                <Users size={15} color="#4f46e5" /> Estudiante
              </label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none'
                }}
              >
                <option value="Todos">👤 Todos los estudiantes ({filteredStudents.length})</option>
                {filteredStudents.map(s => (
                  <option key={s.id || s.run} value={s.id || s.run}>
                    {s.full_name || s.Nombres} ({getStudentCourse(s)})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. TIPO DE ANOTACIÓN */}
            <div>
              <label
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#334155',
                  display: 'block',
                  marginBottom: '0.4rem'
                }}
              >
                Tipo de Anotación RICE
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none'
                }}
              >
                <option value="Positiva">✨ Positiva</option>
                <option value="Negativa">⚠️ Negativa</option>
                <option value="Demérito">⛔ Demérito</option>
                <option value="Medida Pedagógica">📋 Medida Pedagógica</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                display: 'block',
                marginBottom: '0.4rem'
              }}
            >
              Detalle y Fundamento de la Observación
            </label>
            <textarea
              rows={3}
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Describa el hecho, contexto escolar, acuerdos o medidas pedagógicas aplicadas..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            leftIcon={<Plus size={16} />}
          >
            Registrar Anotación
          </Button>
        </form>
      </Card>

      {/* Historial de Anotaciones */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Fecha y Hora</th>
                <th style={{ width: '220px' }}>Estudiante</th>
                <th style={{ width: '150px' }}>Tipo</th>
                <th style={{ width: '180px' }}>Autor / Funcionario</th>
                <th>Detalle de la Observación</th>
              </tr>
            </thead>
            <tbody>
              {filteredObservations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem 1rem' }}>
                    <EmptyState
                      icon={<FileText size={32} color="#6366f1" />}
                      title="No hay anotaciones registradas"
                      description="No se encontraron observaciones en la hoja de vida para el curso o estudiante seleccionado."
                      actionLabel={selectedCourse !== 'Todos' ? 'Ver Todos los Cursos' : undefined}
                      onAction={() => setSelectedCourse('Todos')}
                    />
                  </td>
                </tr>
              ) : (
                filteredObservations.map(obs => {
                  const std = students.find(s => (s.id || s.run) === (obs.studentId || obs.student_id));
                  const studentName = std ? std.full_name || std.Nombres : obs.student_name || 'Estudiante';
                  const studentCourse = std ? getStudentCourse(std) : '';
                  const dateTime = formatDateTime24h(obs.date, obs.created_at || obs.createdAt);

                  return (
                    <tr key={obs.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                            {dateTime.date}
                          </span>
                          {dateTime.time && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#4f46e5',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                background: '#eef2ff',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                width: 'fit-content'
                              }}
                            >
                              <Clock size={11} /> {dateTime.time}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.86rem' }}>
                          {studentName}
                        </strong>
                        {studentCourse && (
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                            {studentCourse}
                          </span>
                        )}
                      </td>
                      <td>{renderTypeBadge(obs.type)}</td>
                      <td>
                        <strong style={{ color: '#334155', fontSize: '0.84rem' }}>
                          {obs.author_name || 'Docente / Funcionario'}
                        </strong>
                      </td>
                      <td style={{ minWidth: '280px', lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 500, wordBreak: 'break-word', color: '#1e293b', fontSize: '0.86rem' }}>
                          {obs.detail || obs.content || (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin detalle especificado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
