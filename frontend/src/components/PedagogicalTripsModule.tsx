import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass, Plus, Printer, Trash2, Edit3, Users, Calendar, Clock,
  MapPin, CheckSquare, Square, Search, X, Check, FileText, ChevronRight,
  Shield, UserCheck, AlertCircle, ArrowLeft, TrendingUp
} from 'lucide-react';
import Swal from 'sweetalert2';
import { getStudentCourse, sortCoursesList } from '../utils/course';

interface PedagogicalTrip {
  id: string;
  title: string;
  destination: string;
  trip_date: string;
  time_range: string;
  departure_time?: string;
  return_time?: string;
  responsible_teacher: string;
  issue_date?: string;
  city?: string;
  institution_name?: string;
  institution_sub?: string;
  director_name?: string;
  description?: string;
  academic_year: number;
  student_count?: number;
  created_at?: string;
  students?: any[];
}

interface PedagogicalTripsModuleProps {
  token: string;
  currentUser?: any;
}

export const PedagogicalTripsModule: React.FC<PedagogicalTripsModuleProps> = ({ token, currentUser }) => {
  const [trips, setTrips] = useState<PedagogicalTrip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>([]);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingTrip, setEditingTrip] = useState<PedagogicalTrip | null>(null);
  const [printingTrip, setPrintingTrip] = useState<PedagogicalTrip | null>(null);

  // Formulario creación / edición
  const [formTitle, setFormTitle] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formTripDate, setFormTripDate] = useState('');
  const [formDepartureTime, setFormDepartureTime] = useState('09:40');
  const [formReturnTime, setFormReturnTime] = useState('13:00');
  const [formTeacher, setFormTeacher] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formCity, setFormCity] = useState('Campanario');
  const [formDescription, setFormDescription] = useState('');
  const [formSelectedStudentIds, setFormSelectedStudentIds] = useState<string[]>([]);

  // Filtros en modal de selección de estudiantes
  const [modalCourseFilter, setModalCourseFilter] = useState('Todos');
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Estudiantes seleccionados para imprimir (en la vista de impresión)
  const [printSelectedIds, setPrintSelectedIds] = useState<string[]>([]);

  // Filtros y búsqueda en el panel principal
  const [tripSearchTerm, setTripSearchTerm] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  // Cálculos estadísticos (KPIs)
  const totalTripsCount = trips.length;
  const totalStudentsMobilized = useMemo(() => {
    return trips.reduce((acc, t) => acc + (Number(t.student_count) || (t.students?.length) || 0), 0);
  }, [trips]);

  const avgStudentsPerTrip = useMemo(() => {
    if (totalTripsCount === 0) return 0;
    return Math.round(totalStudentsMobilized / totalTripsCount);
  }, [totalTripsCount, totalStudentsMobilized]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const upcomingTrips = useMemo(() => {
    return trips.filter(t => {
      const d = (t.trip_date || '').split('T')[0];
      return d >= todayStr;
    });
  }, [trips, todayStr]);

  const nextUpcomingTrip = useMemo(() => {
    if (upcomingTrips.length === 0) return null;
    return [...upcomingTrips].sort((a, b) => (a.trip_date || '').localeCompare(b.trip_date || ''))[0];
  }, [upcomingTrips]);

  // Salidas filtradas para renderizado
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const d = (t.trip_date || '').split('T')[0];
      if (tripStatusFilter === 'upcoming' && d < todayStr) return false;
      if (tripStatusFilter === 'completed' && d >= todayStr) return false;

      if (!tripSearchTerm.trim()) return true;
      const term = tripSearchTerm.toLowerCase();
      return (
        (t.title || '').toLowerCase().includes(term) ||
        (t.destination || '').toLowerCase().includes(term) ||
        (t.responsible_teacher || '').toLowerCase().includes(term) ||
        (t.time_range || '').toLowerCase().includes(term) ||
        (t.city || '').toLowerCase().includes(term)
      );
    });
  }, [trips, tripStatusFilter, tripSearchTerm, todayStr]);

  // Cargar salidas y estudiantes
  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pedagogical-trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrips(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error al cargar salidas pedagógicas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllStudents(data);
          const courses = Array.from(new Set(data.map((s: any) => getStudentCourse(s)))).filter(Boolean) as string[];
          setCoursesList(sortCoursesList(courses));
        }
      }
    } catch (err) {
      console.error('Error al cargar alumnos para salidas:', err);
    }
  };

  useEffect(() => {
    loadTrips();
    loadStudents();
  }, [token]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingTrip(null);
    setFormTitle('');
    setFormDestination('');
    const today = new Date().toISOString().split('T')[0];
    setFormTripDate(today);
    setFormIssueDate(today);
    setFormDepartureTime('09:40');
    setFormReturnTime('13:00');
    setFormTeacher(currentUser?.name || '');
    setFormCity('Campanario');
    setFormDescription('');
    setFormSelectedStudentIds([]);
    setModalCourseFilter('Todos');
    setModalSearchTerm('');
    setShowCreateModal(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = async (trip: PedagogicalTrip) => {
    try {
      const res = await fetch(`/api/pedagogical-trips/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fullTrip: PedagogicalTrip = res.ok ? await res.json() : trip;
      setEditingTrip(fullTrip);
      setFormTitle(fullTrip.title || '');
      setFormDestination(fullTrip.destination || '');
      const rawDate = fullTrip.trip_date ? fullTrip.trip_date.split('T')[0] : '';
      setFormTripDate(rawDate);
      setFormIssueDate(fullTrip.issue_date ? fullTrip.issue_date.split('T')[0] : rawDate);
      setFormDepartureTime(fullTrip.departure_time || '09:40');
      setFormReturnTime(fullTrip.return_time || '13:00');
      setFormTeacher(fullTrip.responsible_teacher || currentUser?.name || '');
      setFormCity(fullTrip.city || 'Campanario');
      setFormDescription(fullTrip.description || '');

      const assignedIds = (fullTrip.students || []).map((s: any) => String(s.id || s.student_id));
      setFormSelectedStudentIds(assignedIds);
      setModalCourseFilter('Todos');
      setModalSearchTerm('');
      setShowCreateModal(true);
    } catch (err) {
      console.error('Error abriendo edición:', err);
    }
  };

  // Guardar creación o edición
  const handleSaveTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDestination.trim() || !formTripDate) {
      Swal.fire('Atención', 'Ingrese el título de la actividad, la sede/destino y la fecha.', 'warning');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      destination: formDestination.trim(),
      trip_date: formTripDate,
      time_range: `${formDepartureTime} Hrs a ${formReturnTime} Hrs.`,
      departure_time: formDepartureTime,
      return_time: formReturnTime,
      responsible_teacher: formTeacher.trim(),
      issue_date: formIssueDate || formTripDate,
      city: formCity.trim() || 'Campanario',
      description: formDescription.trim(),
      student_ids: formSelectedStudentIds
    };

    try {
      const url = editingTrip ? `/api/pedagogical-trips/${editingTrip.id}` : '/api/pedagogical-trips';
      const method = editingTrip ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: editingTrip ? '¡Salida Actualizada!' : '¡Salida Registrada!',
          text: data.message || 'La salida pedagógica ha sido guardada correctamente con los estudiantes seleccionados.',
          timer: 2000,
          showConfirmButton: false
        });
        setShowCreateModal(false);
        loadTrips();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar la salida.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Fallo al comunicarse con el servidor.', 'error');
    }
  };

  // Eliminar salida
  const handleDeleteTrip = (trip: PedagogicalTrip) => {
    Swal.fire({
      title: '¿Eliminar Salida Pedagógica?',
      text: `Se eliminará el registro de "${trip.title}" y las asignaciones de sus ${trip.student_count || 0} estudiantes. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar salida',
      cancelButtonText: 'Cancelar'
    }).then(async res => {
      if (res.isConfirmed) {
        try {
          const resp = await fetch(`/api/pedagogical-trips/${trip.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resp.ok) {
            Swal.fire('Eliminada', 'La salida pedagógica ha sido eliminada.', 'success');
            loadTrips();
          } else {
            Swal.fire('Error', 'No se pudo eliminar la salida.', 'error');
          }
        } catch {
          Swal.fire('Error', 'Fallo al conectar con el servidor.', 'error');
        }
      }
    });
  };

  // Abrir vista de impresión para un viaje
  const handleOpenPrint = async (trip: PedagogicalTrip) => {
    try {
      const res = await fetch(`/api/pedagogical-trips/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const fullTrip: PedagogicalTrip = await res.json();
        if (!fullTrip.students || fullTrip.students.length === 0) {
          Swal.fire('Sin Estudiantes', 'Esta salida aún no tiene estudiantes seleccionados para imprimir autorizaciones. Edite la salida y agregue alumnos.', 'info');
          return;
        }
        setPrintingTrip(fullTrip);
        // Por defecto, todos los estudiantes seleccionados para imprimir
        setPrintSelectedIds(fullTrip.students.map((s: any) => String(s.id || s.student_id)));
      } else {
        Swal.fire('Error', 'No se pudo cargar el detalle para impresión.', 'error');
      }
    } catch (err) {
      console.error('Error abriendo vista de impresión:', err);
    }
  };

  // Filtrado de alumnos en el modal de creación
  const modalFilteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const course = getStudentCourse(s);
      const matchCourse = modalCourseFilter === 'Todos' || course === modalCourseFilter;
      if (!matchCourse) return false;

      const rawTerm = modalSearchTerm.toLowerCase().trim();
      if (!rawTerm) return true;

      const cleanTermRun = rawTerm.replace(/[\.\-]/g, '');
      const sRun = String(s.run || s.RUT || '').toLowerCase();
      const cleanSRun = sRun.replace(/[\.\-]/g, '');
      const sName = String(s.full_name || s.Nombres || '').toLowerCase();

      return sName.includes(rawTerm) || sRun.includes(rawTerm) || cleanSRun.includes(cleanTermRun) || course.toLowerCase().includes(rawTerm);
    });
  }, [allStudents, modalCourseFilter, modalSearchTerm]);

  // Seleccionar / Deseleccionar un curso entero
  const handleToggleWholeCourse = (courseName: string) => {
    const studentsInCourse = allStudents
      .filter(s => getStudentCourse(s) === courseName)
      .map(s => String(s.id || s.run));

    const allAlreadySelected = studentsInCourse.every(id => formSelectedStudentIds.includes(id));

    if (allAlreadySelected) {
      // Quitar todo el curso
      setFormSelectedStudentIds(prev => prev.filter(id => !studentsInCourse.includes(id)));
    } else {
      // Agregar los que faltan
      setFormSelectedStudentIds(prev => Array.from(new Set([...prev, ...studentsInCourse])));
    }
  };

  // Toggle de estudiante individual
  const handleToggleStudent = (studentId: string) => {
    setFormSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Funciones de formato de fecha
  const formatFullDateSpanish = (dateStr: string): string => {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0];
    const [y, m, d] = clean.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayName = days[date.getDay()];
    const monthName = months[m - 1];
    return `${dayName} ${d} de ${monthName} de ${y}.`;
  };

  const formatBirthDate = (dateStr: string): string => {
    if (!dateStr) return '.. - .. - ....';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')} - ${m.padStart(2, '0')} - ${y}`;
    }
    return dateStr;
  };

  const formatRut = (rawRut: string): string => {
    if (!rawRut) return '....................';
    const clean = String(rawRut).replace(/[^0-9kK]/g, '');
    if (clean.length < 2) return rawRut;
    const dv = clean.slice(-1).toUpperCase();
    const num = clean.slice(0, -1);
    const formattedNum = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedNum}-${dv}`;
  };

  const formatShortCourse = (courseName: string): string => {
    if (!courseName) return '1° M';
    const c = courseName.trim();
    // Pre-kínder / 1er Nivel
    if (/pre[- ]?k|1er\s*nivel/i.test(c)) {
      const letter = c.match(/\b([A-D])\b/i)?.[1]?.toUpperCase();
      return letter ? `Pre-Kínder ${letter}` : 'Pre-Kínder';
    }
    // Kínder / 2do Nivel
    if (/k[ií]nder|2do\s*nivel/i.test(c)) {
      const letter = c.match(/\b([A-D])\b/i)?.[1]?.toUpperCase();
      return letter ? `Kínder ${letter}` : 'Kínder';
    }
    // Básico: ej "1° Básico A" o "1 Básico"
    const mBasico = c.match(/^([1-8])°?\s*B[áa]sico\s*([A-Za-z])?/i);
    if (mBasico) {
      return `${mBasico[1]}° Básico${mBasico[2] ? ' ' + mBasico[2].toUpperCase() : ''}`;
    }
    // Medio: ej "1° Medio A" o "3° Medio TP"
    const mMedio = c.match(/^([1-4])°?\s*Medio\s*([A-Za-z])?/i);
    if (mMedio) {
      if (c.includes('TP') || c.includes('Industrial') || c.includes('Técnico')) {
        return `${mMedio[1]}° TP${mMedio[2] ? ' ' + mMedio[2].toUpperCase() : ''}`;
      }
      return `${mMedio[1]}° Medio${mMedio[2] ? ' ' + mMedio[2].toUpperCase() : ''}`;
    }
    return c;
  };

  // ---------------------------------------------------------------------------
  // VISTA DE IMPRESIÓN (AUTORIZACIÓN Y CERTIFICADO DE MATRÍCULA IDÉNTICA A LA FOTO)
  // ---------------------------------------------------------------------------
  if (printingTrip) {
    const studentsToPrint = (printingTrip.students || []).filter((s: any) =>
      printSelectedIds.includes(String(s.id || s.student_id))
    );

    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '1.5rem' }}>
        {/* BARRA SUPERIOR DE ACCIONES DE IMPRESIÓN (NO SE IMPRIME) */}
        <div className="no-print" style={{
          position: 'sticky',
          top: '1rem',
          zIndex: 100,
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
          border: '1.5px solid #cbd5e1',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <button
              onClick={() => setPrintingTrip(null)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={16} /> Volver al Listado
            </button>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>
                Impresión Masiva de Autorizaciones: "{printingTrip.title}"
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                {studentsToPrint.length} estudiante(s) listos para imprimir en formato oficial con certificado de matrícula
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.82rem', color: '#475569' }}>
              <button
                type="button"
                onClick={() => {
                  if (printSelectedIds.length === (printingTrip.students || []).length) {
                    setPrintSelectedIds([]);
                  } else {
                    setPrintSelectedIds((printingTrip.students || []).map((s: any) => String(s.id || s.student_id)));
                  }
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {printSelectedIds.length === (printingTrip.students || []).length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.4rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
              }}
            >
              <Printer size={18} /> IMPRIMIR TODAS LAS AUTORIZACIONES ({studentsToPrint.length})
            </button>
          </div>
        </div>

        {/* CONTENEDOR DE HOJAS IMPRIMIBLES (CADA ALUMNO UNA PÁGINA) */}
        <div className="printable-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <style>{`
            @media print {
              @page {
                size: letter portrait;
                margin: 1.5cm 1.8cm 1.5cm 1.8cm;
              }
              body * {
                visibility: hidden;
              }
              .printable-container, .printable-container * {
                visibility: visible;
              }
              .printable-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
                gap: 0 !important;
              }
              .no-print {
                display: none !important;
              }
              .official-page {
                page-break-after: always !important;
                page-break-inside: avoid !important;
                break-after: page !important;
                width: 100% !important;
                height: 100% !important;
                min-height: 250mm !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }
            }
          `}</style>

          {studentsToPrint.map((student: any) => {
            const courseAbbr = formatShortCourse(student.desc_grado || student.course_name || '1° M');
            const studentCourseFull = student.desc_grado || student.course_name || '1° Año de Educación Media';
            const guardianName = student.guardian_name || student.mother_name || student.father_name || '...................................................';
            const guardianRun = student.guardian_run || student.mother_run || student.father_run || '....................';
            const matriculaNum = student.enrollment_number || student.numero_matricula || student.list_number || '33';
            const directorName = printingTrip.director_name || 'Víctor Robinson Ojeda Ojeda';

            return (
              <div
                key={student.id || student.entry_id}
                className="official-page"
                style={{
                  background: '#ffffff',
                  width: '215.9mm',
                  minHeight: '279.4mm',
                  padding: '3rem 3.5rem',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  boxSizing: 'border-box',
                  fontFamily: '"Times New Roman", Times, serif',
                  color: '#000000',
                  lineHeight: 1.5,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {/* BLOQUE SUPERIOR: ENCABEZADO, EVENTO Y DATOS ALUMNO */}
                <div>
                  {/* ENCABEZADO: LOGO A LA IZQUIERDA Y CURSO EN RECUADRO A LA DERECHA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                      <img
                        src="/logo.png"
                        alt="Logo LTP"
                        style={{ width: '68px', height: '68px', objectFit: 'contain' }}
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div style={{ fontSize: '0.92rem', lineHeight: 1.35, fontWeight: 700, fontFamily: 'Arial, sans-serif', color: '#000000' }}>
                        <div>Liceo Técnico Profesional Campanario</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#333333' }}>Marcos Delucchi Fonck</div>
                      </div>
                    </div>

                    <div style={{
                      border: '2px solid #000000',
                      padding: '0.45rem 1.25rem',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      fontFamily: 'Arial, sans-serif',
                      minWidth: '90px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {courseAbbr}
                    </div>
                  </div>

                  {/* TÍTULO PRINCIPAL */}
                  <h1 style={{
                    textAlign: 'center',
                    fontSize: '1.55rem',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    margin: '0 0 1.75rem 0',
                    textTransform: 'none',
                    fontFamily: '"Times New Roman", Times, serif'
                  }}>
                    Autorización Salida
                  </h1>

                  {/* DETALLE DEL EVENTO */}
                  <div style={{
                    fontSize: '1.05rem',
                    marginLeft: '2.5rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    fontFamily: '"Times New Roman", Times, serif'
                  }}>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '90px', fontWeight: 600 }}>Evento</span>
                      <span style={{ marginRight: '0.5rem', fontWeight: 600 }}>:</span>
                      <span style={{ fontWeight: 500 }}>{printingTrip.title}</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '90px', fontWeight: 600 }}>Sede</span>
                      <span style={{ marginRight: '0.5rem', fontWeight: 600 }}>:</span>
                      <span style={{ fontWeight: 500 }}>{printingTrip.destination}</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '90px', fontWeight: 600 }}>Fecha</span>
                      <span style={{ marginRight: '0.5rem', fontWeight: 600 }}>:</span>
                      <span style={{ fontWeight: 500 }}>{formatFullDateSpanish(printingTrip.trip_date)}</span>
                    </div>
                    <div style={{ display: 'flex' }}>
                      <span style={{ width: '90px', fontWeight: 600 }}>Hora</span>
                      <span style={{ marginRight: '0.5rem', fontWeight: 600 }}>:</span>
                      <span style={{ fontWeight: 500 }}>{printingTrip.time_range || '09:40 Hrs a 13:00 Hrs.'}</span>
                    </div>
                  </div>

                  {/* DETALLE DEL ALUMNO */}
                  <div style={{ fontSize: '1.05rem', marginBottom: '1.75rem', fontFamily: '"Times New Roman", Times, serif' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                      <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Alumno: </span>
                      <span style={{
                        flex: 1,
                        borderBottom: '1px dotted #000000',
                        marginLeft: '0.5rem',
                        fontWeight: 800,
                        paddingLeft: '0.5rem',
                        fontSize: '1.1rem',
                        letterSpacing: '0.2px'
                      }}>
                        {student.full_name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', flex: '1 1 50%' }}>
                        <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Fecha de Nacimiento: </span>
                        <span style={{
                          flex: 1,
                          borderBottom: '1px dotted #000000',
                          marginLeft: '0.5rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          fontSize: '1.02rem',
                          letterSpacing: '0.5px'
                        }}>
                          {formatBirthDate(student.birth_date)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', flex: '1 1 45%' }}>
                        <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>R.U.T. N°: </span>
                        <span style={{
                          flex: 1,
                          borderBottom: '1px dotted #000000',
                          marginLeft: '0.5rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          fontSize: '1.02rem'
                        }}>
                          {formatRut(student.run)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOQUE MEDIO: SECCIÓN AUTORIZACIÓN APODERADO */}
                <div style={{ margin: '1.5rem 0', fontFamily: '"Times New Roman", Times, serif' }}>
                  <h2 style={{
                    textAlign: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    margin: '0 0 1.25rem 0',
                    letterSpacing: '0.3px'
                  }}>
                    Autorización Apoderado
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '0.85rem' }}>
                    <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>Yo, </span>
                    <span style={{
                      flex: '1 1 60%',
                      borderBottom: '1px dotted #000000',
                      marginLeft: '0.5rem',
                      marginRight: '1rem',
                      fontWeight: 700,
                      paddingLeft: '0.5rem'
                    }}>
                      {guardianName}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>RUT. </span>
                    <span style={{
                      flex: '1 1 35%',
                      borderBottom: '1px dotted #000000',
                      marginLeft: '0.5rem',
                      fontWeight: 700,
                      textAlign: 'center'
                    }}>
                      {formatRut(guardianRun)}
                    </span>
                  </div>

                  <p style={{
                    textAlign: 'justify',
                    fontSize: '1.02rem',
                    lineHeight: 1.65,
                    margin: '0.85rem 0 2.25rem 0',
                    textIndent: '2rem'
                  }}>
                    Apoderado del alumno arriba Individualizado vengo en <strong>autorizar</strong> para que participe en el evento arriba señalado, además de que se le pueda tomar fotografías participando del evento para registro del establecimiento. Declaro conocer la fecha y lugar donde tendrá lugar.
                  </p>

                  {/* FIRMA APODERADO Y FECHA */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem' }}>
                    <div style={{ fontSize: '1rem' }}>
                      Campanario, ........ de ........................... de 2026.
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '220px' }}>
                      <div style={{ borderBottom: '1px solid #000000', width: '220px', marginBottom: '0.45rem' }}></div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, fontFamily: 'Arial, sans-serif' }}>Firma Apoderado</div>
                    </div>
                  </div>
                </div>

                {/* BLOQUE INFERIOR: SECCIÓN CERTIFICADO DE MATRÍCULA */}
                <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '1.5rem', fontFamily: '"Times New Roman", Times, serif' }}>
                  <h2 style={{
                    textAlign: 'center',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    margin: '0 0 1.15rem 0',
                    textDecoration: 'underline'
                  }}>
                    Certificado de Matrícula
                  </h2>

                  <p style={{
                    textAlign: 'justify',
                    fontSize: '1.02rem',
                    lineHeight: 1.65,
                    margin: '0 0 1.75rem 0',
                    textIndent: '2.5rem'
                  }}>
                    El Director que suscribe CERTIFICA QUE: el alumno (a) arriba individualizado se encuentra matriculado con el N° <strong style={{ textDecoration: 'underline' }}>{matriculaNum}</strong> del Registro Escolar de <strong style={{ textDecoration: 'underline' }}>{studentCourseFull}</strong> en el presente año.
                  </p>

                  {/* FIRMA DIRECTOR (SIN LOGO INSTITUCIONAL) */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                    <div style={{ textAlign: 'center', minWidth: '240px' }}>
                      <div style={{ borderBottom: '1px dotted #000000', width: '240px', marginBottom: '0.45rem' }}></div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem', fontFamily: 'Arial, sans-serif' }}>{directorName}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827', fontFamily: 'Arial, sans-serif' }}>Director</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.95rem', marginTop: '1.5rem' }}>
                    Campanario, {formatFullDateSpanish(printingTrip.issue_date || printingTrip.trip_date).replace(/^[^,]+,\s*/, '').replace(/\.$/, '')}.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VISTA PRINCIPAL: LISTADO Y GESTIÓN DE SALIDAS PEDAGÓGICAS
  // ---------------------------------------------------------------------------
  return (
    <div style={{ padding: '0 0.5rem' }}>
      {/* ENCABEZADO DEL MÓDULO */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              padding: '0.6rem',
              borderRadius: '12px',
              display: 'flex'
            }}>
              <Compass size={24} />
            </div>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                Salidas Pedagógicas & Autorizaciones
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                Generación oficial de salidas a terreno, selección masiva por curso e impresión con certificado de matrícula
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            fontWeight: 800,
            fontSize: '0.92rem',
            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
          }}
        >
          <Plus size={18} /> + Nueva Salida Pedagógica
        </button>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS Y MÉTRICAS (KPIs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* KPI 1: CANTIDAD DE SALIDAS */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: '16px',
          padding: '1.15rem 1.25rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Salidas Pedagógicas
            </span>
            <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.4rem', borderRadius: '10px', display: 'flex' }}>
              <Compass size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
              {totalTripsCount} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>actividad{totalTripsCount === 1 ? '' : 'es'}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.4rem', fontWeight: 600 }}>
              {upcomingTrips.length > 0 ? `📅 ${upcomingTrips.length} programada${upcomingTrips.length === 1 ? '' : 's'} a futuro` : 'Historial de salidas registrado'}
            </div>
          </div>
        </div>

        {/* KPI 2: CANTIDAD DE ESTUDIANTES */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          border: '1.5px solid #bbf7d0',
          borderRadius: '16px',
          padding: '1.15rem 1.25rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Estudiantes Autorizados
            </span>
            <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.4rem', borderRadius: '10px', display: 'flex' }}>
              <Users size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#14532d', lineHeight: 1 }}>
              {totalStudentsMobilized} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>alumnos</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.4rem', fontWeight: 600 }}>
              Nómina total con autorizaciones emitidas
            </div>
          </div>
        </div>

        {/* KPI 3: PROMEDIO POR SALIDA */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
          border: '1.5px solid #fde68a',
          borderRadius: '16px',
          padding: '1.15rem 1.25rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Promedio por Salida
            </span>
            <div style={{ background: '#fef3c7', color: '#b45309', padding: '0.4rem', borderRadius: '10px', display: 'flex' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#78350f', lineHeight: 1 }}>
              ~{avgStudentsPerTrip} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706' }}>alumnos/salida</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.4rem', fontWeight: 600 }}>
              Participación promedio por evento
            </div>
          </div>
        </div>

        {/* KPI 4: PRÓXIMA SALIDA / AGENDA */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
          border: '1.5px solid #e9d5ff',
          borderRadius: '16px',
          padding: '1.15rem 1.25rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Próxima Salida
            </span>
            <div style={{ background: '#f3e8ff', color: '#7e22ce', padding: '0.4rem', borderRadius: '10px', display: 'flex' }}>
              <Calendar size={20} />
            </div>
          </div>
          <div>
            <div style={{
              fontSize: nextUpcomingTrip ? '1.15rem' : '1.35rem',
              fontWeight: 900,
              color: '#581c87',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {nextUpcomingTrip ? nextUpcomingTrip.destination : 'Agenda al Día'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7e22ce', marginTop: '0.4rem', fontWeight: 600 }}>
              {nextUpcomingTrip ? `📅 ${formatFullDateSpanish(nextUpcomingTrip.trip_date).split(',')[0]}` : 'Sin salidas pendientes inmediatas'}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTRO */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        border: '1.5px solid #cbd5e1',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* INPUT DE BÚSQUEDA */}
        <div style={{
          flex: '1 1 360px',
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          border: tripSearchTerm ? '2px solid #4f46e5' : '1.5px solid #94a3b8',
          borderRadius: '10px',
          padding: '0.55rem 0.95rem',
          gap: '0.75rem',
          boxShadow: tripSearchTerm ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : 'none',
          transition: 'all 0.2s ease'
        }}>
          <Search size={20} color={tripSearchTerm ? '#4f46e5' : '#475569'} style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="🔍 Buscar salida por actividad, destino, docente responsable..."
            value={tripSearchTerm}
            onChange={e => setTripSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#0f172a',
              width: '100%'
            }}
          />
          {tripSearchTerm && (
            <button
              type="button"
              onClick={() => setTripSearchTerm('')}
              style={{
                border: 'none',
                background: '#e0e7ff',
                color: '#4338ca',
                borderRadius: '6px',
                padding: '0.2rem 0.55rem',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 700,
                flexShrink: 0
              }}
            >
              × Borrar
            </button>
          )}
        </div>

        {/* FILTRO DE ESTADO Y CONTADOR */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '3px' }}>
            <button
              type="button"
              onClick={() => setTripStatusFilter('all')}
              style={{
                border: 'none',
                background: tripStatusFilter === 'all' ? '#ffffff' : 'transparent',
                color: tripStatusFilter === 'all' ? '#1e293b' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: tripStatusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Todas ({trips.length})
            </button>
            <button
              type="button"
              onClick={() => setTripStatusFilter('upcoming')}
              style={{
                border: 'none',
                background: tripStatusFilter === 'upcoming' ? '#ffffff' : 'transparent',
                color: tripStatusFilter === 'upcoming' ? '#1e293b' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: tripStatusFilter === 'upcoming' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Próximas ({upcomingTrips.length})
            </button>
            <button
              type="button"
              onClick={() => setTripStatusFilter('completed')}
              style={{
                border: 'none',
                background: tripStatusFilter === 'completed' ? '#ffffff' : 'transparent',
                color: tripStatusFilter === 'completed' ? '#1e293b' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: tripStatusFilter === 'completed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Realizadas ({Math.max(0, trips.length - upcomingTrips.length)})
            </button>
          </div>

          <div style={{
            fontSize: '0.82rem',
            color: '#475569',
            fontWeight: 700,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px'
          }}>
            Mostrando {filteredTrips.length} de {trips.length}
          </div>
        </div>
      </div>

      {/* LISTADO DE SALIDAS REGISTRADAS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          Cargando registro de salidas pedagógicas...
        </div>
      ) : trips.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px dashed #cbd5e1',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#eef2ff',
            color: '#4f46e5',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Compass size={36} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.4rem 0' }}>
            No hay salidas pedagógicas registradas
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 auto 1.5rem auto', maxWidth: '460px' }}>
            Cree una nueva salida indicando el evento, sede, fecha y horario para generar las autorizaciones de los estudiantes de forma masiva.
          </p>
          <button onClick={handleOpenCreate} className="btn btn-primary">
            + Programar Primera Salida
          </button>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid #e2e8f0',
          padding: '3rem 2rem',
          textAlign: 'center'
        }}>
          <Search size={32} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.35rem 0' }}>
            No se encontraron salidas con los filtros aplicados
          </h4>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 auto 1.25rem auto' }}>
            Intente con otro término de búsqueda o cambie el filtro de estado.
          </p>
          <button
            onClick={() => { setTripSearchTerm(''); setTripStatusFilter('all'); }}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            Restablecer Filtros
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredTrips.map(trip => (
            <div
              key={trip.id}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #e2e8f0',
                padding: '1.4rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                {/* CABECERA DE LA TARJETA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                  <div style={{
                    background: '#eef2ff',
                    color: '#4f46e5',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Calendar size={13} /> {formatFullDateSpanish(trip.trip_date).split(',')[0]}
                  </div>

                  <div style={{
                    background: trip.student_count && trip.student_count > 0 ? '#dcfce7' : '#fee2e2',
                    color: trip.student_count && trip.student_count > 0 ? '#15803d' : '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Users size={13} /> {trip.student_count || 0} alumno(s)
                  </div>
                </div>

                {/* TÍTULO Y SEDE */}
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', lineHeight: 1.3 }}>
                  {trip.title}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.86rem', color: '#475569', marginBottom: '1.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="#ef4444" />
                    <span><strong>Sede:</strong> {trip.destination}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} color="#4f46e5" />
                    <span><strong>Horario:</strong> {trip.time_range || '08:30 Hrs a 14:00 Hrs.'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCheck size={16} color="#16a34a" />
                    <span><strong>Responsable:</strong> {trip.responsible_teacher || 'Docente'}</span>
                  </div>
                </div>

                {trip.description && (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', margin: '0 0 1rem 0' }}>
                    {trip.description}
                  </p>
                )}
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  onClick={() => handleOpenPrint(trip)}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    padding: '0.6rem 1rem'
                  }}
                >
                  <Printer size={16} /> Imprimir Autorizaciones ({trip.student_count || 0})
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleOpenEdit(trip)}
                    className="btn btn-secondary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.45rem' }}
                    title="Editar salida y nómina de estudiantes"
                  >
                    <Edit3 size={14} /> Gestionar Alumnos
                  </button>
                  <button
                    onClick={() => handleDeleteTrip(trip)}
                    className="btn"
                    style={{
                      background: '#fff1f2',
                      color: '#be123c',
                      border: '1px solid #fecdd3',
                      borderRadius: '8px',
                      padding: '0.45rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Eliminar salida"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR SALIDA PEDAGÓGICA Y ASIGNAR ESTUDIANTES */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
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
            border: '1.5px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            {/* CABECERA DEL MODAL */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#ffffff',
              padding: '1.25rem 1.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Compass size={24} color="#818cf8" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {editingTrip ? 'Editar Salida Pedagógica & Nómina' : 'Nueva Salida Pedagógica / Actividad'}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}
              >
                <X size={22} />
              </button>
            </div>

            {/* CUERPO DEL MODAL (SCROLLABLE) */}
            <form onSubmit={handleSaveTrip} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                {/* PASO 1: DATOS DEL EVENTO */}
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ background: '#4f46e5', color: '#ffffff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>1</span>
                  Datos del Evento y Lugar
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Nombre del Evento / Actividad *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Concurso de Pintura, Salida a Terreno..."
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Sede / Destino *
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej: Salto del Itata, Museo..."
                      value={formDestination}
                      onChange={e => setFormDestination(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Fecha de la Salida *
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formTripDate}
                      onChange={e => {
                        setFormTripDate(e.target.value);
                        if (!formIssueDate) setFormIssueDate(e.target.value);
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Hora de Salida
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="09:40"
                      value={formDepartureTime}
                      onChange={e => setFormDepartureTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Hora de Regreso
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="13:00"
                      value={formReturnTime}
                      onChange={e => setFormReturnTime(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Docente Responsable
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nombre del profesor..."
                      value={formTeacher}
                      onChange={e => setFormTeacher(e.target.value)}
                    />
                  </div>
                </div>

                {/* PASO 2: SELECCIÓN DE ESTUDIANTES */}
                <div style={{
                  borderTop: '1.5px solid #e2e8f0',
                  paddingTop: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ background: '#4f46e5', color: '#ffffff', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>2</span>
                    Seleccionar Estudiantes ({formSelectedStudentIds.length} seleccionados)
                  </div>

                  {/* BOTÓN RÁPIDO PARA SELECCIONAR TODO EL CURSO */}
                  {modalCourseFilter !== 'Todos' && (
                    <button
                      type="button"
                      onClick={() => handleToggleWholeCourse(modalCourseFilter)}
                      className="btn"
                      style={{
                        background: '#e0e7ff',
                        color: '#4338ca',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.8rem',
                        borderRadius: '8px',
                        border: '1px solid #c7d2fe',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Seleccionar Todo "{modalCourseFilter}"
                    </button>
                  )}
                </div>

                {/* FILTROS EN MODAL */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <select
                      className="form-control"
                      value={modalCourseFilter}
                      onChange={e => setModalCourseFilter(e.target.value)}
                      style={{ fontWeight: 700, fontSize: '0.85rem' }}
                    >
                      <option value="Todos">🏫 Todos los Cursos ({allStudents.length})</option>
                      {coursesList.map(c => {
                        const count = allStudents.filter(s => getStudentCourse(s) === c).length;
                        return <option key={c} value={c}>{c} ({count})</option>;
                      })}
                    </select>
                  </div>

                  <div style={{ flex: '2 1 260px', position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por Nombre o RUT para agregar..."
                      value={modalSearchTerm}
                      onChange={e => setModalSearchTerm(e.target.value)}
                      style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                    />
                    <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                {/* LISTADO DE SELECCIÓN DE ALUMNOS */}
                <div style={{
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  background: '#f8fafc'
                }}>
                  {modalFilteredStudents.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                      No se encontraron estudiantes para este filtro.
                    </div>
                  ) : (
                    modalFilteredStudents.map((s: any) => {
                      const id = String(s.id || s.run);
                      const isSelected = formSelectedStudentIds.includes(id);
                      const courseName = getStudentCourse(s);

                      return (
                        <div
                          key={id}
                          onClick={() => handleToggleStudent(id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 1rem',
                            borderBottom: '1px solid #e2e8f0',
                            background: isSelected ? '#eef2ff' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {isSelected ? (
                              <CheckSquare size={18} color="#4f46e5" />
                            ) : (
                              <Square size={18} color="#94a3b8" />
                            )}
                            <div>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? '#1e1b4b' : '#1e293b' }}>
                                {s.full_name}
                              </span>
                              <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                (RUT: {s.run})
                              </span>
                            </div>
                          </div>

                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isSelected ? '#c7d2fe' : '#f1f5f9',
                            color: isSelected ? '#312e81' : '#475569',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px'
                          }}>
                            {courseName}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* PIE DEL FORMULARIO CON BOTONES */}
              <div style={{
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                padding: '1rem 1.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  <strong style={{ color: '#4f46e5' }}>{formSelectedStudentIds.length}</strong> estudiantes listos para impresión
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ fontWeight: 800, padding: '0.55rem 1.4rem' }}
                  >
                    {editingTrip ? 'Guardar Cambios' : 'Crear Salida Pedagógica'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
