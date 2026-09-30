import React, { useState, useEffect } from 'react';
import { X, Send, Users, Mail, Bell, AlertCircle, CheckCircle2, ShieldAlert, Sparkles, Filter, Check, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { sortCoursesList, getStudentCourse } from '../utils/course';

interface CourseTeacher {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  hasEmail: boolean;
  run?: string;
  isHomeroom: boolean;
  roles: string[];
  subjects: string[];
}

interface CourseMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourse?: string;
  onMessageSent?: () => void;
}

export const CourseMessageModal: React.FC<CourseMessageModalProps> = ({
  isOpen,
  onClose,
  initialCourse = '',
  onMessageSent
}) => {
  const { token, user } = useAuth();

  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse);
  const [teachers, setTeachers] = useState<CourseTeacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Record<string, boolean>>({});
  const [loadingTeachers, setLoadingTeachers] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // Formulario
  const [channels, setChannels] = useState<'both' | 'platform' | 'email'>('both');
  const [priority, setPriority] = useState<'normal' | 'importante' | 'urgente'>('normal');
  const [category, setCategory] = useState<string>('General');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // Cargar lista de cursos disponibles
  useEffect(() => {
    if (!isOpen || !token) return;

    Promise.all([
      fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => [])
    ]).then(([coursesRes, studentsData]) => {
      const set = new Set<string>();

      if (coursesRes && Array.isArray(coursesRes.courses)) {
        coursesRes.courses.forEach((c: any) => {
          if (c && c.name) set.add(c.name);
        });
      }

      if (Array.isArray(studentsData)) {
        studentsData.forEach((s: any) => {
          const cName = getStudentCourse(s);
          if (cName && cName !== 'Sin Curso') set.add(cName);
        });
      }

      const sorted = sortCoursesList(Array.from(set).map(name => ({ name }))).map((c: any) => c.name);
      setCoursesList(sorted);

      if (!selectedCourse && sorted.length > 0) {
        setSelectedCourse(initialCourse || sorted[0]);
      } else if (initialCourse) {
        setSelectedCourse(initialCourse);
      }
    }).catch(err => console.error('Error cargando cursos:', err));
  }, [isOpen, token, initialCourse]);

  // Cargar docentes asignados al curso seleccionado
  useEffect(() => {
    if (!isOpen || !token || !selectedCourse) return;

    setLoadingTeachers(true);
    fetch(`/api/courses/teachers-summary?course=${encodeURIComponent(selectedCourse)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          // Por defecto seleccionar a todos los docentes
          const map: Record<string, boolean> = {};
          data.teachers.forEach((t: CourseTeacher) => {
            const key = t.id || t.email || t.name;
            map[key] = true;
          });
          setSelectedTeacherIds(map);
        } else {
          setTeachers([]);
          setSelectedTeacherIds({});
        }
      })
      .catch(err => {
        console.error('Error al cargar docentes del curso:', err);
        setTeachers([]);
      })
      .finally(() => setLoadingTeachers(false));
  }, [isOpen, token, selectedCourse]);

  if (!isOpen) return null;

  // Acciones de selección
  const toggleTeacher = (key: string) => {
    setSelectedTeacherIds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllTeachers = () => {
    const map: Record<string, boolean> = {};
    teachers.forEach(t => {
      map[t.id || t.email || t.name] = true;
    });
    setSelectedTeacherIds(map);
  };

  const deselectAllTeachers = () => {
    setSelectedTeacherIds({});
  };

  const selectedTeachers = teachers.filter(t => selectedTeacherIds[t.id || t.email || t.name]);
  const selectedWithEmail = selectedTeachers.filter(t => t.hasEmail);

  // Enviar mensaje
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourse) {
      Swal.fire('Atención', 'Por favor seleccione un curso.', 'warning');
      return;
    }
    if (!subject.trim()) {
      Swal.fire('Atención', 'Debe ingresar el asunto o título del mensaje.', 'warning');
      return;
    }
    if (!message.trim()) {
      Swal.fire('Atención', 'Debe escribir el contenido del comunicado.', 'warning');
      return;
    }
    if (selectedTeachers.length === 0) {
      Swal.fire('Atención', 'Debe seleccionar al menos un profesor destinatario.', 'warning');
      return;
    }

    const channelList = channels === 'both' ? ['platform', 'email'] : [channels];

    // Confirmación previa
    const confirmResult = await Swal.fire({
      title: '¿Confirmar Envío de Mensaje?',
      html: `
        <div style="text-align: left; font-size: 0.92rem; line-height: 1.5;">
          <p><strong>🏫 Curso:</strong> ${selectedCourse}</p>
          <p><strong>👥 Destinatarios:</strong> ${selectedTeachers.length} profesor(es) seleccionado(s)</p>
          <p><strong>📡 Canales:</strong> ${channels === 'both' ? '🌐 Plataforma y Correo Electrónico' : channels === 'platform' ? '📱 Solo Plataforma' : '📧 Solo Correo Electrónico'}</p>
          <p><strong>📌 Asunto:</strong> ${subject}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Enviar Mensaje',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5'
    });

    if (!confirmResult.isConfirmed) return;

    setSending(true);

    try {
      const res = await fetch('/api/courses/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseName: selectedCourse,
          channels: channelList,
          priority,
          category,
          subject: subject.trim(),
          message: message.trim(),
          recipients: selectedTeachers.map(t => ({
            id: t.id,
            userId: t.userId,
            name: t.name,
            email: t.email,
            run: t.run,
            role: t.roles.join(', ') || 'Docente',
            subject: t.subjects.join(', ') || 'Asignatura'
          }))
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ocurrió un error al despachar el comunicado.');
      }

      await Swal.fire({
        title: '¡Mensaje Enviado Exitosamente!',
        html: `
          <div style="text-align: left; font-size: 0.92rem; line-height: 1.6;">
            <p style="color: #166534; font-weight: 700;">✅ La comunicación fue entregada de forma focalizada al curso <strong>${selectedCourse}</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 8px;">
              <div>📱 <strong>Notificaciones en Plataforma:</strong> ${data.summary?.platformNotificationsCount || 0} entregadas</div>
              <div>📧 <strong>Correos Electrónicos Oficiales:</strong> ${data.summary?.emailsSentCount || 0} despachados</div>
              ${data.summary?.emailsFailedCount > 0 ? `<div style="color: #dc2626;">⚠️ Correos con incidencia: ${data.summary.emailsFailedCount}</div>` : ''}
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#4f46e5'
      });

      // Limpiar formulario y cerrar
      setSubject('');
      setMessage('');
      if (onMessageSent) onMessageSent();
      onClose();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.message || 'Error al enviar la comunicación.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1050,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Send size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
                Comunicación Docente Focalizada
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#e0e7ff' }}>
                Envíe mensajes y correos precisos únicamente a los profesores asignados a un curso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem 1.75rem', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* 1. Selector de Curso y Canales */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1.1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Selector de Curso */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  🏫 Curso Destinatario:
                </label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {coursesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Solo los docentes vinculados a este curso recibirán la notificación.
                </span>
              </div>

              {/* Selector de Canal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  📡 Canal de Envío:
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setChannels('both')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: channels === 'both' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: channels === 'both' ? '#eef2ff' : '#ffffff',
                      color: channels === 'both' ? '#4338ca' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Sparkles size={14} /> Ambos (Recomendado)
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannels('platform')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: channels === 'platform' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: channels === 'platform' ? '#eef2ff' : '#ffffff',
                      color: channels === 'platform' ? '#4338ca' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Bell size={14} /> Solo Plataforma
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannels('email')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: channels === 'email' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: channels === 'email' ? '#eef2ff' : '#ffffff',
                      color: channels === 'email' ? '#4338ca' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Mail size={14} /> Solo Correo
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Lista de Profesores Asignados al Curso */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={17} color="#4f46e5" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                    Equipo Docente Asignado a {selectedCourse} ({teachers.length})
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700
                  }}>
                    {selectedTeachers.length} seleccionados
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={selectAllTeachers}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Seleccionar Todos
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllTeachers}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              {loadingTeachers ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                  ⏳ Buscando equipo docente asignado a {selectedCourse}...
                </div>
              ) : teachers.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#fef2f2', border: '1px dashed #fca5a5', borderRadius: '12px', color: '#991b1b', fontSize: '0.85rem' }}>
                  ⚠️ No se registraron profesores asignados a este curso en el sistema. Revise las asignaciones docentes en Configuración.
                </div>
              ) : (
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#ffffff'
                }}>
                  {teachers.map(t => {
                    const key = t.id || t.email || t.name;
                    const isChecked = !!selectedTeacherIds[key];
                    return (
                      <div
                        key={key}
                        onClick={() => toggleTeacher(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.65rem 0.9rem',
                          borderBottom: '1px solid #f1f5f9',
                          background: isChecked ? '#f8faff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                                {t.name}
                              </span>
                              {t.isHomeroom && (
                                <span style={{
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '6px'
                                }}>
                                  👑 Profesor Jefe
                                </span>
                              )}
                              {t.roles.map(r => r !== 'Profesor Jefe' && (
                                <span key={r} style={{
                                  background: '#e0e7ff',
                                  color: '#3730a3',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '6px'
                                }}>
                                  {r}
                                </span>
                              ))}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                              {t.subjects.length > 0 ? t.subjects.join(' • ') : 'Docencia General'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.74rem' }}>
                          {t.hasEmail ? (
                            <span style={{ color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={13} color="#16a34a" /> {t.email}
                            </span>
                          ) : (
                            <span style={{ color: '#b45309', fontWeight: 600 }}>
                              ⚠️ Sin correo (Solo plataforma)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Prioridad y Categoría */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  ⚡ Nivel de Prioridad:
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: priority === 'urgente' ? '#991b1b' : priority === 'importante' ? '#9a3412' : '#334155',
                    background: priority === 'urgente' ? '#fef2f2' : priority === 'importante' ? '#fffbeb' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="normal">Informativo / Normal</option>
                  <option value="importante">⚠️ Importante (Requiere Atención)</option>
                  <option value="urgente">🚨 URGENTE (Prioridad Máxima)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  📁 Categoría / Ámbito:
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#334155',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="General">General / Institucional</option>
                  <option value="Académico">Académico / Evaluaciones / Calificaciones</option>
                  <option value="Convivencia">Convivencia Escolar / Disciplina</option>
                  <option value="Reunión">Reunión de Curso / Consejo Técnico</option>
                  <option value="Caso Especial">Caso Especial de Estudiante</option>
                  <option value="Administrativo">Coordinación Administrativa / UTP</option>
                </select>
              </div>
            </div>

            {/* 4. Asunto / Título */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                📌 Asunto / Título del Comunicado:
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej: Coordinación de calendario de evaluaciones - Mes en curso"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                maxLength={140}
              />
            </div>

            {/* 5. Mensaje */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                  ✍️ Mensaje / Contenido:
                </label>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {message.length} caracteres
                </span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escriba aquí la información precisa dirigida a los docentes del curso..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Caja resumen */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: '#0369a1'
            }}>
              <span>
                💡 <strong>Destino:</strong> Se comunicará a <strong>{selectedTeachers.length}</strong> docente(s) de <strong>{selectedCourse}</strong>
                {channels !== 'platform' && ` (${selectedWithEmail.length} recibirán correo electrónico)`}.
              </span>
              <span style={{ fontWeight: 700, color: '#0284c7' }}>
                {channels === 'both' ? 'Plataforma + Email' : channels === 'platform' ? 'Solo Plataforma' : 'Solo Email'}
              </span>
            </div>

          </div>

          {/* Botones de acción */}
          <div style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.25rem'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={sending || selectedTeachers.length === 0}
              style={{
                background: sending ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              {sending ? (
                <>⏳ Despachando mensaje...</>
              ) : (
                <>
                  <Send size={16} /> Enviar Mensaje a {selectedTeachers.length} Profesores
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
