import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Users, Mail, Bell, CheckCircle2, Sparkles, GraduationCap, Globe, Search } from 'lucide-react';
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

interface CourseStudent {
  id: string;
  name: string;
  run: string;
  courseName: string;
  studentEmail?: string;
  guardianName?: string;
  guardianRun?: string;
  guardianEmail?: string;
  guardianSecName?: string;
  guardianSecRun?: string;
  guardianSecEmail?: string;
  emails: string[];
  email?: string;
  hasEmail: boolean;
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
  const { token } = useAuth();

  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse || 'ALL');
  const [audience, setAudience] = useState<'teachers' | 'students' | 'both'>('students');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [teachers, setTeachers] = useState<CourseTeacher[]>([]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Record<string, boolean>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
  const [loadingRecipients, setLoadingRecipients] = useState<boolean>(false);
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

      if (initialCourse) {
        setSelectedCourse(initialCourse);
      } else if (!selectedCourse) {
        setSelectedCourse('ALL');
      }
    }).catch(err => console.error('Error cargando cursos:', err));
  }, [isOpen, token, initialCourse]);

  // Cargar docentes y estudiantes asignados al curso seleccionado (o todo el liceo si es 'ALL')
  useEffect(() => {
    if (!isOpen || !token || !selectedCourse) return;

    setLoadingRecipients(true);
    fetch(`/api/courses/teachers-summary?course=${encodeURIComponent(selectedCourse)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          const tMap: Record<string, boolean> = {};
          data.teachers.forEach((t: CourseTeacher) => {
            const key = t.id || t.email || t.name;
            tMap[key] = true;
          });
          setSelectedTeacherIds(tMap);
        } else {
          setTeachers([]);
          setSelectedTeacherIds({});
        }

        if (data && Array.isArray(data.students)) {
          setStudents(data.students);
          const sMap: Record<string, boolean> = {};
          data.students.forEach((s: CourseStudent) => {
            const key = s.id || s.run || s.name;
            sMap[key] = true;
          });
          setSelectedStudentIds(sMap);
        } else {
          setStudents([]);
          setSelectedStudentIds({});
        }
      })
      .catch(err => {
        console.error('Error al cargar destinatarios:', err);
        setTeachers([]);
        setStudents([]);
      })
      .finally(() => setLoadingRecipients(false));
  }, [isOpen, token, selectedCourse]);

  const selectedTeachers = useMemo(
    () => (audience === 'teachers' || audience === 'both')
      ? teachers.filter(t => selectedTeacherIds[t.id || t.email || t.name])
      : [],
    [teachers, selectedTeacherIds, audience]
  );

  const selectedStudents = useMemo(
    () => (audience === 'students' || audience === 'both')
      ? students.filter(s => selectedStudentIds[s.id || s.run || s.name])
      : [],
    [students, selectedStudentIds, audience]
  );

  const totalSelectedCount = selectedTeachers.length + selectedStudents.length;

  const totalUniqueEmails = useMemo(() => {
    const emailSet = new Set<string>();
    selectedTeachers.forEach(t => {
      if (t.email && t.email.includes('@')) emailSet.add(t.email.toLowerCase());
    });
    selectedStudents.forEach(s => {
      if (Array.isArray(s.emails)) {
        s.emails.forEach(em => {
          if (em && em.includes('@')) emailSet.add(em.toLowerCase());
        });
      } else if (s.email && s.email.includes('@')) {
        emailSet.add(s.email.toLowerCase());
      }
    });
    return emailSet.size;
  }, [selectedTeachers, selectedStudents]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      t.subjects.join(' ').toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.run || '').toLowerCase().includes(q) ||
      (s.guardianName || '').toLowerCase().includes(q) ||
      (s.courseName || '').toLowerCase().includes(q) ||
      s.emails.join(' ').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  if (!isOpen) return null;

  const isAllCourses = selectedCourse === 'ALL';
  const scopeDisplay = isAllCourses ? 'Todos los Cursos (Masivo Liceo)' : selectedCourse;

  // Acciones de selección
  const toggleTeacher = (key: string) => {
    setSelectedTeacherIds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStudent = (key: string) => {
    setSelectedStudentIds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllVisible = () => {
    if (audience === 'teachers' || audience === 'both') {
      const tMap = { ...selectedTeacherIds };
      filteredTeachers.forEach(t => {
        tMap[t.id || t.email || t.name] = true;
      });
      setSelectedTeacherIds(tMap);
    }
    if (audience === 'students' || audience === 'both') {
      const sMap = { ...selectedStudentIds };
      filteredStudents.forEach(s => {
        sMap[s.id || s.run || s.name] = true;
      });
      setSelectedStudentIds(sMap);
    }
  };

  const deselectAllVisible = () => {
    if (audience === 'teachers' || audience === 'both') {
      const tMap = { ...selectedTeacherIds };
      filteredTeachers.forEach(t => {
        delete tMap[t.id || t.email || t.name];
      });
      setSelectedTeacherIds(tMap);
    }
    if (audience === 'students' || audience === 'both') {
      const sMap = { ...selectedStudentIds };
      filteredStudents.forEach(s => {
        delete sMap[s.id || s.run || s.name];
      });
      setSelectedStudentIds(sMap);
    }
  };

  // Enviar mensaje
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourse) {
      Swal.fire('Atención', 'Por favor seleccione un curso o alcance.', 'warning');
      return;
    }
    if (!subject.trim()) {
      Swal.fire('Atención', 'Debe ingresar el asunto o título del comunicado.', 'warning');
      return;
    }
    if (!message.trim()) {
      Swal.fire('Atención', 'Debe escribir el contenido del comunicado.', 'warning');
      return;
    }
    if (totalSelectedCount === 0) {
      Swal.fire('Atención', 'Debe seleccionar al menos un destinatario.', 'warning');
      return;
    }

    const channelList = channels === 'both' ? ['platform', 'email'] : [channels];
    const audienceText = audience === 'students'
      ? `${selectedStudents.length} Estudiante(s) / Apoderado(s)`
      : audience === 'teachers'
        ? `${selectedTeachers.length} Docente(s)`
        : `${selectedTeachers.length} Docente(s) + ${selectedStudents.length} Estudiante(s)/Apoderado(s)`;

    const confirmResult = await Swal.fire({
      title: '¿Confirmar Envío de Comunicado Oficial?',
      html: `
        <div style="text-align: left; font-size: 0.92rem; line-height: 1.55;">
          <p><strong>🏫 Alcance:</strong> ${scopeDisplay}</p>
          <p><strong>👥 Destinatarios:</strong> ${audienceText}</p>
          <p><strong>📡 Canales:</strong> ${channels === 'both' ? `🌐 Plataforma y Correo (${totalUniqueEmails} casillas únicas)` : channels === 'platform' ? '📱 Solo Plataforma (Portal Apoderado/Docente)' : `📧 Solo Correo Electrónico (${totalUniqueEmails} casillas)`}</p>
          <p><strong>📌 Asunto:</strong> ${subject}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Despachar Comunicado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5'
    });

    if (!confirmResult.isConfirmed) return;

    setSending(true);

    try {
      const combinedRecipients = [
        ...selectedTeachers.map(t => ({
          recipientType: 'teacher',
          id: t.id,
          userId: t.userId,
          name: t.name,
          email: t.email,
          emails: t.email ? [t.email] : [],
          run: t.run,
          role: 'Docente',
          courseName: isAllCourses ? 'ALL' : selectedCourse
        })),
        ...selectedStudents.map(s => ({
          recipientType: 'student',
          id: s.id,
          name: s.name,
          run: s.run,
          guardianName: s.guardianName,
          guardianRun: s.guardianRun,
          email: s.email,
          emails: s.emails,
          role: 'Estudiante',
          courseName: s.courseName || (isAllCourses ? 'ALL' : selectedCourse)
        }))
      ];

      const res = await fetch('/api/courses/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseName: selectedCourse,
          audience,
          channels: channelList,
          priority,
          category,
          subject: subject.trim(),
          message: message.trim(),
          recipients: combinedRecipients
        })
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (_) {
        throw new Error(
          res.status === 504 || rawText.includes('TIMEOUT') || rawText.includes('An error occurred')
            ? 'El servidor demoró demasiado procesando el envío masivo. Por favor intente nuevamente.'
            : `Respuesta inesperada del servidor (HTTP ${res.status}).`
        );
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Ocurrió un error al despachar el comunicado.');
      }

      await Swal.fire({
        title: '¡Comunicado Despachado Exitosamente!',
        html: `
          <div style="text-align: left; font-size: 0.92rem; line-height: 1.6;">
            <p style="color: #166534; font-weight: 700;">✅ La comunicación fue entregada a <strong>${scopeDisplay}</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 8px;">
              <div>📱 <strong>Notificaciones en Plataforma (Portal Docente / Apoderado / Estudiante):</strong> ${data.summary?.platformNotificationsCount || 0} entregadas</div>
              <div>📧 <strong>Correos Electrónicos Oficiales:</strong> ${data.summary?.emailsSentCount || 0} despachados</div>
              ${data.summary?.emailsFailedCount > 0 ? `<div style="color: #dc2626;">⚠️ Correos con incidencia: ${data.summary.emailsFailedCount}</div>` : ''}
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#4f46e5'
      });

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
        maxWidth: '920px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '1.2rem 1.75rem',
          background: 'linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Send size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
                Centro de Comunicaciones Masivas y por Curso
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#e0e7ff' }}>
                Envíe comunicados oficiales a Estudiantes, Apoderados y/o Docentes (por curso o a todo el Liceo)
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
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.35rem 1.75rem', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

            {/* 1. Selector de Alcance (Curso o Liceo Completo) y Canal */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Selector de Alcance / Curso */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                  🏫 Alcance / Curso Destinatario:
                </label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '10px',
                    border: selectedCourse === 'ALL' ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: selectedCourse === 'ALL' ? '#3730a3' : '#1e293b',
                    background: selectedCourse === 'ALL' ? '#eef2ff' : '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">📢 TODOS LOS CURSOS — Masivo a Todo el Liceo</option>
                  <optgroup label="Cursos Específicos del Establecimiento">
                    {coursesList.map(c => (
                      <option key={c} value={c}>🏫 Curso: {c}</option>
                    ))}
                  </optgroup>
                </select>
                <span style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {isAllCourses
                    ? 'Se enviará de forma masiva a todos los cursos del establecimiento.'
                    : `Focalizado exclusivamente en el curso ${selectedCourse}.`}
                </span>
              </div>

              {/* Selector de Canal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                  📡 Canal de Entrega:
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setChannels('both')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
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
                    <Sparkles size={14} /> Ambos Canales
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannels('platform')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
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
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
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

            {/* 2. Selector de Audiencia (Estudiantes/Apoderados, Docentes o Ambos) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.45rem' }}>
                🎯 ¿A quién va dirigido este comunicado?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setAudience('students')}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    border: audience === 'students' ? '2px solid #10b981' : '1px solid #cbd5e1',
                    background: audience === 'students' ? '#ecfdf5' : '#ffffff',
                    color: audience === 'students' ? '#065f46' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left'
                  }}
                >
                  <GraduationCap size={20} color={audience === 'students' ? '#059669' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>🎓 Estudiantes y Apoderados</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{students.length} alumno(s) / familia(s)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAudience('teachers')}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    border: audience === 'teachers' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: audience === 'teachers' ? '#eef2ff' : '#ffffff',
                    color: audience === 'teachers' ? '#3730a3' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left'
                  }}
                >
                  <Users size={20} color={audience === 'teachers' ? '#4f46e5' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>👨‍🏫 Equipo Docente</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{teachers.length} profesor(es)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAudience('both')}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    border: audience === 'both' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: audience === 'both' ? '#f0f9ff' : '#ffffff',
                    color: audience === 'both' ? '#075985' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left'
                  }}
                >
                  <Globe size={20} color={audience === 'both' ? '#0284c7' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>🌐 Comunidad Completa</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>Docentes + Estudiantes/Apoderados</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Nómina de Destinatarios con Buscador y Selección */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                    Destinatarios en {scopeDisplay}
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '2px 9px',
                    borderRadius: '12px',
                    fontWeight: 800
                  }}>
                    {totalSelectedCount} seleccionado(s)
                  </span>
                  <span style={{
                    fontSize: '0.73rem',
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '2px 9px',
                    borderRadius: '12px',
                    fontWeight: 700
                  }}>
                    📧 {totalUniqueEmails} correo(s) activo(s)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} color="#64748b" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Filtrar por nombre, RUT o curso..."
                      style={{
                        padding: '4px 8px 4px 26px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        width: '190px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllVisible}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {loadingRecipients ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                  ⏳ Cargando nómina de destinatarios de {scopeDisplay}...
                </div>
              ) : (
                <div style={{
                  maxHeight: '195px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#ffffff'
                }}>
                  {/* Lista de Docentes si aplica */}
                  {(audience === 'teachers' || audience === 'both') && filteredTeachers.map(t => {
                    const key = t.id || t.email || t.name;
                    const isChecked = !!selectedTeacherIds[key];
                    return (
                      <div
                        key={`t-${key}`}
                        onClick={() => toggleTeacher(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.9rem',
                          borderBottom: '1px solid #f1f5f9',
                          background: isChecked ? '#f8faff' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                                👨‍🏫 {t.name}
                              </span>
                              {t.isHomeroom && (
                                <span style={{
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '6px'
                                }}>
                                  👑 Prof. Jefe
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {t.subjects.length > 0 ? t.subjects.join(' • ') : 'Docencia General'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.72rem' }}>
                          {t.hasEmail ? (
                            <span style={{ color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} color="#16a34a" /> {t.email}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontWeight: 600 }}>📱 Notif. Plataforma</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Lista de Estudiantes y Apoderados si aplica */}
                  {(audience === 'students' || audience === 'both') && filteredStudents.map(s => {
                    const key = s.id || s.run || s.name;
                    const isChecked = !!selectedStudentIds[key];
                    return (
                      <div
                        key={`s-${key}`}
                        onClick={() => toggleStudent(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.9rem',
                          borderBottom: '1px solid #f1f5f9',
                          background: isChecked ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                                🎓 {s.name}
                              </span>
                              <span style={{
                                background: '#e0f2fe',
                                color: '#0369a1',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '6px'
                              }}>
                                {s.courseName}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                              RUT Alumno: {s.run || 'S/R'} • 👨‍👩‍👧 Apoderado: {s.guardianName || 'Sin registro'} {s.guardianRun ? `(${s.guardianRun})` : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.72rem' }}>
                          {s.hasEmail ? (
                            <span style={{ color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} color="#16a34a" /> {s.emails.join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: '#0369a1', fontWeight: 600 }}>
                              📱 Portal Apoderado / Alumno
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Prioridad y Categoría */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
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
                    fontSize: '0.84rem',
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
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
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#334155',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="General">General / Comunicado Oficial</option>
                  <option value="Reunión de Apoderados">Reunión de Apoderados / Citación</option>
                  <option value="Académico">Académico / Evaluaciones / Calificaciones</option>
                  <option value="Convivencia">Convivencia Escolar / Inspectoría</option>
                  <option value="Suspensión o Cambio Horario">Cambio de Horario / Actividad Especial</option>
                  <option value="Administrativo">Coordinación Administrativa / UTP</option>
                </select>
              </div>
            </div>

            {/* 5. Asunto / Título */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                📌 Asunto / Título del Comunicado:
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej: Citación a Reunión de Apoderados / Informativo General del Liceo"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                maxLength={140}
              />
            </div>

            {/* 6. Mensaje */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  ✍️ Mensaje / Contenido del Comunicado:
                </label>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {message.length} caracteres
                </span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escriba aquí el comunicado para los estudiantes, apoderados y/o docentes..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
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
              padding: '0.7rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: '#0369a1'
            }}>
              <span>
                💡 <strong>Resumen de Envío:</strong> {totalSelectedCount} destinatario(s) en <strong>{scopeDisplay}</strong>
                {channels !== 'platform' && ` (${totalUniqueEmails} correo(s) electrónico(s) + Portal de Apoderados/Docentes)`}.
              </span>
              <span style={{ fontWeight: 800, color: '#0284c7' }}>
                {channels === 'both' ? 'Plataforma + Email' : channels === 'platform' ? 'Solo Plataforma' : 'Solo Email'}
              </span>
            </div>

          </div>

          {/* Botones de acción */}
          <div style={{
            marginTop: '1.25rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1rem'
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
                padding: '0.6rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={sending || totalSelectedCount === 0}
              style={{
                background: sending ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.6rem 1.4rem',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              {sending ? (
                <>⏳ Despachando Comunicado...</>
              ) : (
                <>
                  <Send size={16} /> Despachar a {totalSelectedCount} Destinatario(s)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
