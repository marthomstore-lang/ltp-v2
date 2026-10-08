import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  Monitor,
  Calendar as CalendarIcon,
  Clock,
  Users,
  PlusCircle,
  Trash2,
  CheckCircle2,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';
import { sortCoursesList } from '../utils/course';

interface ComputerLabModuleProps {
  token: string;
  user: any;
  roomName?: string;
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
  { key: 'Bloque 1', label: 'Bloque 1 (08:30 - 10:00)', shortLabel: '1° Bloque', time: '08:30 - 10:00', start: '08:30', end: '10:00' },
  { key: 'Bloque 2', label: 'Bloque 2 (10:20 - 11:50)', shortLabel: '2° Bloque', time: '10:20 - 11:50', start: '10:20', end: '11:50' },
  { key: 'Bloque 3', label: 'Bloque 3 (12:05 - 13:35)', shortLabel: '3° Bloque', time: '12:05 - 13:35', start: '12:05', end: '13:35' },
  { key: 'Bloque 4', label: 'Bloque 4 (14:20 - 15:50)', shortLabel: '4° Bloque', time: '14:20 - 15:50', start: '14:20', end: '15:50' },
  { key: 'Bloque 5', label: 'Bloque 5 (16:00 - 17:30)', shortLabel: '5° Bloque', time: '16:00 - 17:30', start: '16:00', end: '17:30' }
];

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(refDate: Date): Date {
  const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const day = d.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export const ComputerLabModule: React.FC<ComputerLabModuleProps> = ({ token, user, roomName = "Sala de Computación" }) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>(DEFAULT_COURSES);
  const [subjectsList, setSubjectsList] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [calendarCourseFilter, setCalendarCourseFilter] = useState('');

  // Estado del Calendario Interno (Vista Semanal por Bloques o Vista Mensual)
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedReservationDetail, setSelectedReservationDetail] = useState<Reservation | null>(null);

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
    formatDateYMD(new Date())
  ]);
  const [currentDateInput, setCurrentDateInput] = useState(formatDateYMD(new Date()));

  const loadSubjects = async () => {
    try {
      const res = await fetch('/api/subjects', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const dbNames = Array.from(new Set(data.map((s: any) => s.name || s.nombre).filter(Boolean))) as string[];
        setSubjectsList(dbNames);
      } else {
        setSubjectsList([]);
      }
    } catch (err) {
      console.error('Error al cargar asignaturas:', err);
    }
  };

  useEffect(() => {
    loadReservations();
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
      const res = await fetch(`/api/room-reservations?room_name=${encodeURIComponent(roomName)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
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

  // Seleccionar un bloque disponible directamente desde el Calendario Interno
  const handleSelectAvailableSlot = (dateStr: string, blockKey: string) => {
    setFormData(prev => ({ ...prev, block_key: blockKey }));
    setCurrentDateInput(dateStr);
    setSelectedDates([dateStr]);
  };

  // Enviar formulario de reserva
  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.course_name) {
      Swal.fire('Atención', 'Por favor selecciona un curso.', 'warning');
      return;
    }
    if (!formData.subject_name.trim()) {
      Swal.fire('Atención', 'Por favor selecciona la asignatura.', 'warning');
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
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
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
        setFormData(prev => ({ ...prev, activity_detail: '' }));
        loadReservations();
      } else if (result.status === 'warning') {
        Swal.fire({
          icon: 'warning',
          title: 'Reservas Parciales',
          html: `<div style="text-align: left; font-size: 0.9rem;">${result.message.replace(/\n/g, '<br>')}</div>`,
          confirmButtonColor: '#f59e0b'
        });
        loadReservations();
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
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Horario Liberado', data.message, 'success');
          setSelectedReservationDetail(null);
          loadReservations();
        } else {
          Swal.fire('Error', data.error || 'No se pudo cancelar.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
      }
    }
  };

  // Días de la semana activa (Lunes a Viernes)
  const weekDays = useMemo(() => {
    const days: Array<{ dateStr: string; dayName: string; dayNumber: string; monthShort: string; isFriday: boolean; isToday: boolean }> = [];
    const todayStr = formatDateYMD(new Date());
    for (let i = 0; i < 5; i++) {
      const d = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
      const ds = formatDateYMD(d);
      days.push({
        dateStr: ds,
        dayName: DAY_NAMES_ES[i],
        dayNumber: String(d.getDate()).padStart(2, '0'),
        monthShort: MONTH_NAMES_ES[d.getMonth()].slice(0, 3),
        isFriday: i === 4,
        isToday: ds === todayStr
      });
    }
    return days;
  }, [currentWeekStart]);

  // Mapa rápido de reservas por clave "YYYY-MM-DD|Bloque X"
  const reservationsBySlot = useMemo(() => {
    const map = new Map<string, Reservation>();
    reservations.forEach(r => {
      if (r.status === 'Cancelado') return;
      if (calendarCourseFilter && r.course_name !== calendarCourseFilter) return;
      const cleanDate = String(r.reservation_date || '').split('T')[0];
      const key = `${cleanDate}|${r.block_key}`;
      map.set(key, r);
    });
    return map;
  }, [reservations, calendarCourseFilter]);

  // Mapa de reservas por fecha "YYYY-MM-DD" para la vista mensual
  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    reservations.forEach(r => {
      if (r.status === 'Cancelado') return;
      if (calendarCourseFilter && r.course_name !== calendarCourseFilter) return;
      const cleanDate = String(r.reservation_date || '').split('T')[0];
      if (!cleanDate) return;
      if (!map.has(cleanDate)) map.set(cleanDate, []);
      map.get(cleanDate)!.push(r);
    });
    return map;
  }, [reservations, calendarCourseFilter]);

  // Celdas para la vista mensual
  const monthGridDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Lunes=0 .. Domingo=6
    const totalDays = lastDay.getDate();

    const cells: Array<{ dateStr: string; dayNumber: number; isCurrentMonth: boolean; isWeekend: boolean }> = [];
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const dt = new Date(year, month - 1, d);
      const wd = dt.getDay();
      cells.push({ dateStr: formatDateYMD(dt), dayNumber: d, isCurrentMonth: false, isWeekend: wd === 0 || wd === 6 });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(year, month, d);
      const wd = dt.getDay();
      cells.push({ dateStr: formatDateYMD(dt), dayNumber: d, isCurrentMonth: true, isWeekend: wd === 0 || wd === 6 });
    }
    let nextD = 1;
    while (cells.length % 7 !== 0) {
      const dt = new Date(year, month + 1, nextD);
      const wd = dt.getDay();
      cells.push({ dateStr: formatDateYMD(dt), dayNumber: nextD, isCurrentMonth: false, isWeekend: wd === 0 || wd === 6 });
      nextD++;
    }
    return cells;
  }, [currentMonthDate]);

  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      if (filterDate && String(r.reservation_date || '').split('T')[0] !== filterDate) return false;
      if (calendarCourseFilter && r.course_name !== calendarCourseFilter) return false;
      return true;
    });
  }, [reservations, filterDate, calendarCourseFilter]);

  const canCancelReservation = (r: Reservation) => {
    return (
      user?.role === 'Admin' ||
      user?.role === 'Director' ||
      (user?.email && r.teacher_email === user.email) ||
      (user?.name && r.teacher_name === user.name)
    );
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* HEADER DE MÓDULO */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Monitor size={26} color="#4f46e5" /> Reserva de Sala de Computación & Laboratorio de Informática
            </h2>
            <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.22rem 0.65rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 800 }}>
              ● Calendario Interno Activo (Sin inicio de sesión externo)
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Calendario institucional integrado en la plataforma. Haz clic sobre cualquier bloque disponible para seleccionarlo y reservar inmediatamente.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              loadReservations();
              loadSubjects();
            }}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700 }}
            title="Refrescar reservas y bloques"
          >
            <RefreshCw size={15} /> Actualizar Horarios
          </button>
        </div>
      </div>

      {/* LAYOUT PRINCIPAL: SPLIT-VIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LADO IZQUIERDO: CALENDARIO INTERNO INTERACTIVO POR BLOQUES Y MES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* TARJETA CALENDARIO INTERNO DE SALA DE COMPUTACIÓN */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.35rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            {/* Cabecera y Selector de Modo (Semanal por Bloques vs Mensual) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <CalendarIcon size={19} color="#4f46e5" /> Calendario Interno — Uso Sala de Computación
                </h3>
                <div style={{ fontSize: '0.77rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Haz clic en un bloque <strong>Disponible</strong> para agendar o en uno <strong>Reservado</strong> para ver su detalle
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCalendarMode('week')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: calendarMode === 'week' ? '#4f46e5' : 'transparent',
                    color: calendarMode === 'week' ? '#ffffff' : '#475569'
                  }}
                >
                  ⏰ Vista Semanal por Bloques
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('month')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: calendarMode === 'month' ? '#4f46e5' : 'transparent',
                    color: calendarMode === 'month' ? '#ffffff' : '#475569'
                  }}
                >
                  🗓️ Vista Mensual
                </button>
              </div>
            </div>

            {/* Barra de Navegación de Fechas y Filtro de Curso */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc', padding: '0.7rem 0.95rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              {calendarMode === 'week' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(currentWeekStart);
                      prev.setDate(prev.getDate() - 7);
                      setCurrentWeekStart(prev);
                    }}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}
                  >
                    <ChevronLeft size={15} /> Anterior
                  </button>

                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e1b4b', padding: '0 0.4rem' }}>
                    Semana del {weekDays[0]?.dayNumber} {weekDays[0]?.monthShort} al {weekDays[4]?.dayNumber} {weekDays[4]?.monthShort} {currentWeekStart.getFullYear()}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date(currentWeekStart);
                      next.setDate(next.getDate() + 7);
                      setCurrentWeekStart(next);
                    }}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}
                  >
                    Siguiente <ChevronRight size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentWeekStart(getMondayOfWeek(new Date()))}
                    style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Hoy / Esta Semana
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e1b4b', minWidth: '150px', textAlign: 'center' }}>
                    {MONTH_NAMES_ES[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date())}
                    style={{ padding: '0.35rem 0.7rem', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Mes Actual
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Filter size={14} color="#4f46e5" />
                <select
                  value={calendarCourseFilter}
                  onChange={e => setCalendarCourseFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600, background: '#ffffff' }}
                >
                  <option value="">📚 Todos los Cursos</option>
                  {coursesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* MODO 1: GRILLA SEMANAL POR BLOQUES (LUNES A VIERNES x BLOQUES 1 A 5) */}
            {calendarMode === 'week' ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px', minWidth: '640px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '135px', padding: '0.55rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, color: '#334155', textAlign: 'center' }}>
                        Bloque / Horario
                      </th>
                      {weekDays.map(day => (
                        <th
                          key={day.dateStr}
                          style={{
                            padding: '0.55rem',
                            background: day.isToday ? '#eef2ff' : '#f8fafc',
                            border: day.isToday ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: day.isToday ? '#4f46e5' : '#0f172a' }}>
                            {day.dayName}
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: day.isToday ? '#4338ca' : '#64748b' }}>
                            {day.dayNumber} {day.monthShort}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BLOCKS.map(block => (
                      <tr key={block.key}>
                        {/* Columna de Bloque Horario */}
                        <td style={{
                          padding: '0.65rem 0.5rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '10px',
                          textAlign: 'center',
                          verticalAlign: 'middle'
                        }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e1b4b' }}>
                            {block.shortLabel}
                          </div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4f46e5', marginTop: '2px' }}>
                            {block.time}
                          </div>
                        </td>

                        {/* Celdas de Lunes a Viernes para este Bloque */}
                        {weekDays.map(day => {
                          const isFridayAfternoon = day.isFriday && (block.key === 'Bloque 4' || block.key === 'Bloque 5');
                          const slotKey = `${day.dateStr}|${block.key}`;
                          const resItem = reservationsBySlot.get(slotKey);
                          const isSelectedInForm = selectedDates.includes(day.dateStr) && formData.block_key === block.key;

                          if (isFridayAfternoon) {
                            return (
                              <td
                                key={slotKey}
                                style={{
                                  padding: '0.55rem',
                                  background: '#f1f5f9',
                                  border: '1px dashed #cbd5e1',
                                  borderRadius: '10px',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  color: '#94a3b8',
                                  fontSize: '0.7rem',
                                  fontWeight: 700
                                }}
                              >
                                Cerrado (13:35)
                              </td>
                            );
                          }

                          if (resItem) {
                            return (
                              <td
                                key={slotKey}
                                onClick={() => setSelectedReservationDetail(resItem)}
                                style={{
                                  padding: '0.55rem',
                                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                                  border: '1px solid #818cf8',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  verticalAlign: 'top',
                                  transition: 'transform 0.12s ease'
                                }}
                                title="Haz clic para ver detalles o liberar este bloque"
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#312e81', background: '#c7d2fe', padding: '1px 6px', borderRadius: '5px' }}>
                                    {resItem.course_name}
                                  </span>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4f46e5' }}>
                                    Ocupado
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#1e1b4b', lineHeight: 1.25, marginTop: '3px' }}>
                                  {resItem.subject_name}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  👨‍🏫 {resItem.teacher_name}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={slotKey}
                              onClick={() => handleSelectAvailableSlot(day.dateStr, block.key)}
                              style={{
                                padding: '0.55rem',
                                background: isSelectedInForm ? '#dcfce7' : '#f0fdf4',
                                border: isSelectedInForm ? '2px solid #059669' : '1px dashed #86efac',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Agendar ${day.dayName} ${day.dayNumber} en ${block.label}`}
                            >
                              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: isSelectedInForm ? '#065f46' : '#15803d' }}>
                                {isSelectedInForm ? '✓ Seleccionado' : '+ Disponible'}
                              </div>
                              <div style={{ fontSize: '0.66rem', color: '#16a34a', marginTop: '1px' }}>
                                Clic para reservar
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* MODO 2: VISTA MENSUAL COMPLETA */
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', marginBottom: '6px' }}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dName => (
                    <div key={dName} style={{ textAlign: 'center', fontSize: '0.74rem', fontWeight: 800, color: '#475569', padding: '0.35rem', background: '#f1f5f9', borderRadius: '6px' }}>
                      {dName}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
                  {monthGridDays.map(cell => {
                    const dayItems = reservationsByDate.get(cell.dateStr) || [];
                    const isToday = cell.dateStr === formatDateYMD(new Date());
                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          if (!cell.isWeekend) {
                            setCurrentDateInput(cell.dateStr);
                            setSelectedDates([cell.dateStr]);
                            setCurrentWeekStart(getMondayOfWeek(new Date(cell.dateStr + 'T12:00:00')));
                          }
                        }}
                        style={{
                          minHeight: '92px',
                          background: cell.isWeekend ? '#f8fafc' : isToday ? '#eef2ff' : '#ffffff',
                          border: isToday ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '0.35rem',
                          opacity: cell.isCurrentMonth ? 1 : 0.5,
                          cursor: cell.isWeekend ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isToday ? '#4f46e5' : '#334155' }}>
                            {cell.dayNumber}
                          </span>
                          {dayItems.length > 0 && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#4f46e5', color: '#ffffff', padding: '1px 5px', borderRadius: '999px' }}>
                              {dayItems.length}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', maxHeight: '64px' }}>
                          {dayItems.map(item => (
                            <div
                              key={item.id}
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedReservationDetail(item);
                              }}
                              style={{
                                background: '#e0e7ff',
                                color: '#312e81',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '2px 4px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={`${item.block_key}: ${item.course_name} - ${item.subject_name}`}
                            >
                              {item.block_key.replace('Bloque ', 'B')}: {item.course_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leyenda rápida del Calendario Interno */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: '#f0fdf4', border: '1px solid #22c55e', display: 'inline-block' }} /> Disponible (Clic para seleccionar)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: '#e0e7ff', border: '1px solid #6366f1', display: 'inline-block' }} /> Reservado (Clic para ver detalle / liberar)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: '#f1f5f9', border: '1px dashed #94a3b8', display: 'inline-block' }} /> Viernes Tarde (Jornada finaliza 13:35)
              </span>
            </div>
          </div>

          {/* HISTORIAL / LISTA DE RESERVAS EN BASE DE DATOS */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                📋 Nómina de Reservas Registradas ({filteredReservations.length})
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

            <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
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
                          {String(r.reservation_date || '').split('T')[0]}
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
                          {canCancelReservation(r) && (
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
                <option value="" disabled>-- {coursesList.length === 0 ? 'Cargando cursos...' : 'Seleccione un curso'} --</option>
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

      {/* MODAL DETALLE DE RESERVA SELECCIONADA EN EL CALENDARIO INTERNO */}
      {selectedReservationDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={20} color="#4f46e5" /> Detalle de Reserva de Sala
              </h4>
              <button onClick={() => setSelectedReservationDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>📅 Fecha:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{String(selectedReservationDetail.reservation_date || '').split('T')[0]}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>⏰ Bloque Horario:</span>{' '}
                <strong style={{ color: '#3730a3' }}>{selectedReservationDetail.block_label || selectedReservationDetail.block_key}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>📚 Curso:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{selectedReservationDetail.course_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>📖 Asignatura:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{selectedReservationDetail.subject_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontWeight: 600 }}>👨‍🏫 Docente Responsable:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{selectedReservationDetail.teacher_name}</strong>
              </div>
              {selectedReservationDetail.activity_detail && (
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>📝 Actividad Pedagógica:</span>
                  <div style={{ marginTop: '3px', padding: '0.5rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
                    {selectedReservationDetail.activity_detail}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.25rem' }}>
              {canCancelReservation(selectedReservationDetail) && (
                <button
                  type="button"
                  onClick={() => handleCancelReservation(selectedReservationDetail)}
                  style={{ padding: '0.5rem 0.95rem', borderRadius: '8px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#be123c', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Trash2 size={14} /> Liberar Horario
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedReservationDetail(null)}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
