import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Monitor, Calendar as CalendarIcon, Clock, Users, BookOpen, PlusCircle, Trash2, CheckCircle2, AlertTriangle, Settings, RefreshCw, X } from 'lucide-react';
import { sortCoursesList } from '../utils/course';

interface ComputerLabModuleProps {
  token: string;
  user: any;
}

interface Reservation {
  id: string;
  created_at: string;
  teacher_name: string;
  teacher_email: string;
  course_name: string;
  subject_name: string;
  activity_detail: string;
  reservation_date: string;
  block_key: string;
  block_label: string;
  start_time: string;
  end_time: string;
  status: string;
  calendar_event_id?: string;
}

const DEFAULT_COURSES: string[] = [];
const DEFAULT_SUBJECTS: string[] = [];

const BLOCKS = [
  { key: 'Bloque 1', label: 'Bloque 1 (08:30 - 10:00)', start: '08:30', end: '10:00' },
  { key: 'Bloque 2', label: 'Bloque 2 (10:20 - 11:50)', start: '10:20', end: '11:50' },
  { key: 'Bloque 3', label: 'Bloque 3 (12:05 - 13:35)', start: '12:05', end: '13:35' },
  { key: 'Bloque 4', label: 'Bloque 4 (14:20 - 15:50)', start: '14:20', end: '15:50' },
  { key: 'Bloque 5', label: 'Bloque 5 (16:00 - 17:30)', start: '16:00', end: '17:30' }
];

export const ComputerLabModule: React.FC<ComputerLabModuleProps> = ({ token, user }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>(DEFAULT_COURSES);
  const [subjectsList, setSubjectsList] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [calendarId, setCalendarId] = useState('c_19d0bf8733f11c48ab179877049714b6a4c2bec9ee54190075af32f2384aa4fc@group.calendar.google.com');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newCalendarIdInput, setNewCalendarIdInput] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [calendarKey, setCalendarKey] = useState(Date.now());

  // Formulario de Reserva
  const [formData, setFormData] = useState({
    course_name: '',
    subject_name: '',
    activity_detail: '',
    block_key: 'Bloque 1',
    teacher_name: user?.name || '',
    teacher_email: user?.email || ''
  });

  // Selector Multi-Fecha (Chips de fechas seleccionadas)
  const [selectedDates, setSelectedDates] = useState<string[]>([
    new Date().toISOString().split('T')[0]
  ]);
  const [currentDateInput, setCurrentDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Cargar asignaturas registradas en el sistema
  const loadSubjects = async () => {
    try {
      const res = await fetch('/api/subjects', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const dbNames = data.map((s: any) => s.name || s.nombre).filter(Boolean);
        setSubjectsList(dbNames);
      } else {
        setSubjectsList([]);
      }
    } catch (err) {
      console.error('Error al cargar asignaturas:', err);
    }
  };

  // Cargar lista de cursos de la institución y reservas
  useEffect(() => {
    loadReservations();
    loadIntegrationSettings();
    loadSubjects();

    Promise.all([
      fetch('/api/courses', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch('/api/students', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => ([]))
    ]).then(([coursesRes, studentsData]) => {
      const savedCourses = (coursesRes && Array.isArray(coursesRes.courses)) ? coursesRes.courses.map((c: any) => c.name) : [];
      const studentCourses = (Array.isArray(studentsData) && studentsData.length > 0)
        ? Array.from(new Set(studentsData.map((s: any) => s.desc_grado || s.level_name))).filter(Boolean)
        : [];
      const combined = Array.from(new Set([...savedCourses, ...studentCourses]));
      if (combined.length > 0) {
        setCoursesList(sortCoursesList(combined));
      } else {
        setCoursesList([]);
      }
    }).catch(() => setCoursesList([]));
  }, [token]);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/room-reservations', { credentials: 'include' });
      const data = await res.json();
      if (data && Array.isArray(data.reservations)) {
        setReservations(data.reservations);
      }
    } catch (err) {
      console.error('Error al cargar reservas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrationSettings = async () => {
    try {
      const res = await fetch('/api/config/integrations', { credentials: 'include' });
      const data = await res.json();
      if (data && data.settings && data.settings.COMPUTER_LAB_CALENDAR_ID) {
        setCalendarId(data.settings.COMPUTER_LAB_CALENDAR_ID);
        setNewCalendarIdInput(data.settings.COMPUTER_LAB_CALENDAR_ID);
      }
    } catch (err) {
      console.error('Error al cargar configuraciones:', err);
    }
  };

  const handleSaveCalendarId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalendarIdInput.trim()) return;

    try {
      const res = await fetch('/api/config/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settings: { COMPUTER_LAB_CALENDAR_ID: newCalendarIdInput.trim() }
        })
      });
      const data = await res.json();
      if (data.success) {
        setCalendarId(newCalendarIdInput.trim());
        setShowConfigModal(false);
        setCalendarKey(Date.now());
        Swal.fire('Guardado', 'ID de Google Calendar para Sala de Computación actualizado.', 'success');
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
  };

  // Agregar fecha a la lista
  const handleAddDate = () => {
    if (!currentDateInput) return;
    if (selectedDates.includes(currentDateInput)) {
      Swal.fire('Aviso', 'La fecha seleccionada ya está en la lista.', 'info');
      return;
    }
    setSelectedDates(prev => [...prev, currentDateInput].sort());
  };

  // Quitar fecha de la lista
  const handleRemoveDate = (d: string) => {
    if (selectedDates.length === 1) {
      Swal.fire('Aviso', 'Debe mantener al menos una fecha para la reserva.', 'warning');
      return;
    }
    setSelectedDates(prev => prev.filter(item => item !== d));
  };

  // Enviar formulario de reserva
  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.course_name) {
      Swal.fire('Atención', 'Por favor selecciona un curso.', 'warning');
      return;
    }
    if (!formData.subject_name.trim()) {
      Swal.fire('Atención', 'Por favor ingresa la asignatura.', 'warning');
      return;
    }
    if (selectedDates.length === 0) {
      Swal.fire('Atención', 'Selecciona al menos una fecha.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/room-reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          dates: selectedDates,
          teacher_name: user?.name || formData.teacher_name || 'Docente',
          teacher_email: user?.email || formData.teacher_email || 'docente@liceocampanario.cl',
          teacher_run: user?.run || ''
        })
      });

      const result = await res.json();

      if (result.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: '¡Reservas Confirmadas!',
          text: result.message,
          confirmButtonColor: '#4f46e5'
        });
        setFormData(prev => ({ ...prev, subject_name: '', activity_detail: '' }));
        setSelectedDates([new Date().toISOString().split('T')[0]]);
        loadReservations();
        setCalendarKey(Date.now());
      } else if (result.status === 'warning') {
        Swal.fire({
          icon: 'warning',
          title: 'Reservas Parciales',
          html: `<div style="text-align: left; font-size: 0.9rem;">${result.message.replace(/\n/g, '<br>')}</div>`,
          confirmButtonColor: '#f59e0b'
        });
        loadReservations();
        setCalendarKey(Date.now());
      } else {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo reservar',
          html: `<div style="text-align: left; font-size: 0.9rem;">${(result.message || result.error || 'Error al procesar').replace(/\n/g, '<br>')}</div>`,
          confirmButtonColor: '#ec4899'
        });
      }
    } catch (err) {
      Swal.fire('Error', 'Hubo un problema de conexión con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancelar / liberar reserva
  const handleCancelReservation = async (resItem: Reservation) => {
    const confirm = await Swal.fire({
      title: '¿Liberar este horario?',
      html: `¿Estás seguro de cancelar la reserva del <strong>${resItem.reservation_date}</strong> en <strong>${resItem.block_label}</strong> para <strong>${resItem.course_name}</strong>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, liberar horario',
      cancelButtonText: 'No mantener',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/room-reservations/${resItem.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Horario Liberado', data.message, 'success');
          loadReservations();
          setCalendarKey(Date.now());
        } else {
          Swal.fire('Error', data.error || 'No se pudo cancelar.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
      }
    }
  };

  const filteredReservations = reservations.filter(r => {
    if (filterDate && r.reservation_date !== filterDate) return false;
    return true;
  });

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* HEADER DE MÓDULO */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Monitor size={26} color="#4f46e5" /> Reserva de Sala de Computación & Laboratorio de Informática
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Sistema institucional de agendamiento de bloques, detección de colisiones de horario y sincronización con Google Calendar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              loadReservations();
              loadSubjects();
              setCalendarKey(Date.now());
            }}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700 }}
            title="Refrescar datos y calendario"
          >
            <RefreshCw size={15} /> Actualizar
          </button>

          {(user?.role === 'Admin' || user?.role === 'Director') && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700, gap: '4px' }}
              title="Configurar ID de Google Calendar"
            >
              <Settings size={15} /> Configurar Calendario
            </button>
          )}
        </div>
      </div>

      {/* LAYOUT PRINCIPAL: SPLIT-VIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LADO IZQUIERDO: CALENDARIO EN VIVO & CUADRÍCULA DE HORARIOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TARJETA GOOGLE CALENDAR EMBEBIDO */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CalendarIcon size={18} color="#4f46e5" /> Horarios Reservados en Google Calendar
              </h3>
              <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 800 }}>
                ● En vivo (Semanal)
              </span>
            </div>

            <div style={{ width: '100%', height: '480px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <iframe
                key={calendarKey}
                src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=America%2FSantiago&mode=WEEK&showTitle=0&showPrint=0&showTabs=1&showCalendars=0&showTz=0&bgcolor=%23ffffff`}
                style={{ width: '100%', height: '100%', border: 0 }}
                title="Google Calendar Sala Computación"
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'right' }}>
              ID Calendario: <code style={{ color: '#4338ca' }}>{calendarId}</code>
            </div>
          </div>

          {/* HISTORIAL / LISTA DE RESERVAS EN BASE DE DATOS LOCAL */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                📋 Nómina de Reservas Registradas en Base de Datos ({filteredReservations.length})
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    title="Ver todas las fechas"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>Fecha</th>
                    <th style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>Bloque</th>
                    <th style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>Curso</th>
                    <th style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>Asignatura</th>
                    <th style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>Docente</th>
                    <th style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                        No hay reservas registradas {filterDate ? `para el ${filterDate}` : ''}.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap', fontWeight: 700, color: '#0f172a' }}>
                          {r.reservation_date}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                            {r.block_key}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {r.course_name}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap' }}>
                          {r.subject_name}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#475569' }}>
                          {r.teacher_name}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {(user?.role === 'Admin' || user?.role === 'Director' || r.teacher_email === user?.email) && (
                            <button
                              onClick={() => handleCancelReservation(r)}
                              style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="Liberar este horario"
                            >
                              <Trash2 size={12} /> Liberar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* LADO DERECHO: FORMULARIO DE SOLICITUD DE RESERVA */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'sticky', top: '1rem' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
              <Monitor size={24} />
            </div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Solicitar Reserva de Sala
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              Selecciona curso, asignatura, bloque y una o varias fechas
            </p>
          </div>

          {/* BADGE DEL DOCENTE SOLICITANTE */}
          <div style={{ background: '#eef2ff', border: '1px dashed #a5b4fc', borderRadius: '10px', padding: '0.6rem 0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={18} color="#4f46e5" />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3730a3' }}>
                {user?.name || formData.teacher_name || 'Docente'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6366f1' }}>
                {user?.email || formData.teacher_email || 'docente@liceocampanario.cl'}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitReservation}>
            
            {/* SELECCIÓN DE CURSO */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                📚 Curso / Nivel:
              </label>
              <select
                value={formData.course_name}
                onChange={e => setFormData({ ...formData, course_name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#f8fafc' }}
              >
                <option value="" disabled>-- {coursesList.length === 0 ? 'No hay cursos registrados en base de datos' : 'Seleccione un curso'} --</option>
                {coursesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* ASIGNATURA */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                📖 Asignatura:
              </label>
              <select
                value={formData.subject_name}
                onChange={e => setFormData({ ...formData, subject_name: e.target.value })}
                required
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#f8fafc' }}
              >
                <option value="" disabled>-- Seleccione una asignatura --</option>
                {subjectsList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* DETALLE DE LA ACTIVIDAD */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                📝 Detalle de la Actividad Pedagógica:
              </label>
              <textarea
                rows={2}
                value={formData.activity_detail}
                onChange={e => setFormData({ ...formData, activity_detail: e.target.value })}
                placeholder="Ej: Investigación web, uso de procesador de texto, proyecto..."
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#f8fafc' }}
              />
            </div>

            {/* BLOQUE HORARIO */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                ⏰ Bloque Horario:
              </label>
              <select
                value={formData.block_key}
                onChange={e => setFormData({ ...formData, block_key: e.target.value })}
                required
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, background: '#f8fafc', color: '#3730a3' }}
              >
                {BLOCKS.map(b => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
            </div>

            {/* SELECTOR MULTI-FECHA */}
            <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                📅 Fechas a Reservar (Permite Múltiples Días):
              </label>
              
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
                <input
                  type="date"
                  value={currentDateInput}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setCurrentDateInput(e.target.value)}
                  style={{ flex: 1, padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddDate}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, gap: '4px' }}
                >
                  <PlusCircle size={14} /> Añadir
                </button>
              </div>

              {/* CHIPS DE FECHAS SELECCIONADAS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {selectedDates.map(d => (
                  <span
                    key={d}
                    style={{
                      background: '#e0e7ff',
                      color: '#3730a3',
                      border: '1px solid #c7d2fe',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(d)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex', alignItems: 'center' }}
                      title="Quitar esta fecha"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* REGLAS INSTITUCIONALES RECORDATORIO */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '1.25rem', fontSize: '0.75rem', color: '#b45309', lineHeight: 1.4 }}>
              <strong>⚠️ Reglas del Establecimiento:</strong>
              <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0 }}>
                <li>Viernes la jornada termina a las 13:35 (Bloques 4 y 5 no disponibles).</li>
                <li>No se permite agendar en días sábado o domingo.</li>
                <li>Detección automática de choques con otros cursos.</li>
              </ul>
            </div>

            {/* BOTÓN SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, justifyContent: 'center', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' }}
            >
              {loading ? 'Procesando reservas...' : `🚀 Confirmar Reserva (${selectedDates.length} fecha${selectedDates.length > 1 ? 's' : ''})`}
            </button>
          </form>

        </div>

      </div>

      {/* MODAL: CONFIGURAR ID DE GOOGLE CALENDAR (DESACOPLADO) */}
      {showConfigModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} color="#4f46e5" /> Configurar ID de Google Calendar
              </h4>
              <button onClick={() => setShowConfigModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1rem', lineHeight: 1.4 }}>
              Ingresa el ID del Google Calendar institucional de la Sala de Computación. Puedes cambiarlo en cualquier momento:
            </p>

            <form onSubmit={handleSaveCalendarId}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Google Calendar ID:
                </label>
                <input
                  type="text"
                  value={newCalendarIdInput}
                  onChange={e => setNewCalendarIdInput(e.target.value)}
                  placeholder="ejemplo@group.calendar.google.com"
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  Guardar ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
