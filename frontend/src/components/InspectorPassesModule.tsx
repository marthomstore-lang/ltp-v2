import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Printer,
  Search,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  ShieldAlert,
  User,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  Download,
  Type
} from 'lucide-react';
import Swal from 'sweetalert2';
import { getStudentCourse, sortCoursesList } from '../utils/course';
import { formatRut } from '../utils/rut';
import { getModuleSubTabFromUrl, syncModuleSubUrl } from '../utils/urlRouter';
import { printThermalPass, ThermalReceiptPreviewModal, PassData, formatDateDMY, PassFontScale, getSavedPassFontScale } from './ThermalPassReceipt';

interface InspectorPassesModuleProps {
  token: string;
  user: any;
}

const COMMON_REASONS = [
  'Problemas de locomoción / locomoción colectiva',
  'Cita médica / dental',
  'Trámite personal / familiar urgente',
  'Se quedó dormido / atraso matinal',
  'Factores climáticos / lluvia / temporal',
  'Cuidado de familiar enfermo',
  'Causa de fuerza mayor',
  'Otro motivo (especificar)'
];

export const InspectorPassesModule: React.FC<InspectorPassesModuleProps> = ({ token, user }) => {
  const [activeTab, setActiveTab] = useState<'emit' | 'today' | 'history'>(() =>
    getModuleSubTabFromUrl('inspector_passes', 'emit') as any
  );

  useEffect(() => {
    syncModuleSubUrl('inspector_passes', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handlePop = () => {
      setActiveTab(getModuleSubTabFromUrl('inspector_passes', 'emit') as any);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);

  // Reloj en vivo
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Búsqueda de Estudiante para emisión
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentStats, setStudentStats] = useState<{
    monthlyLates: number;
    yearlyLates: number;
    totalPasses: number;
    hasLateToday: boolean;
    alertTriggered: boolean;
  }>({
    monthlyLates: 0,
    yearlyLates: 0,
    totalPasses: 0,
    hasLateToday: false,
    alertTriggered: false
  });
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // Formulario de emisión
  const [passType, setPassType] = useState<string>('Atraso a la Jornada');
  const [reason, setReason] = useState<string>(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [passStatus, setPassStatus] = useState<'Injustificado' | 'Justificado'>('Injustificado');
  const [justificationDetail, setJustificationDetail] = useState<string>('');
  const [passTimeInput, setPassTimeInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Escala de fuente para impresión térmica EPSON TM-T20II
  const [passFontScale, setPassFontScale] = useState<PassFontScale>(() => getSavedPassFontScale());

  const handleFontScaleChange = (scale: PassFontScale) => {
    setPassFontScale(scale);
    try {
      localStorage.setItem('ltp_pass_font_size', scale);
    } catch (e) {
      console.warn('Error guardando tamaño de letra:', e);
    }
  };

  // Modal de vista previa de voucher
  const [previewPass, setPreviewPass] = useState<PassData | null>(null);

  // Listado de pases de hoy e histórico
  const [todayPasses, setTodayPasses] = useState<PassData[]>([]);
  const [historyPasses, setHistoryPasses] = useState<PassData[]>([]);
  const [loadingPasses, setLoadingPasses] = useState<boolean>(false);

  // Filtros de historial
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar estudiantes del establecimiento
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setStudents(list);
    } catch (err) {
      console.error('Error cargando estudiantes:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Cargar pases de hoy
  const fetchTodayPasses = async () => {
    setLoadingPasses(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/passes?date=${todayStr}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data && Array.isArray(data.passes)) {
        setTodayPasses(data.passes);
      }
    } catch (err) {
      console.error('Error cargando pases de hoy:', err);
    } finally {
      setLoadingPasses(false);
    }
  };

  // Cargar historial de pases
  const fetchHistoryPasses = async () => {
    setLoadingPasses(true);
    try {
      let url = `/api/passes?startDate=${filterStartDate}&endDate=${filterEndDate}`;
      if (filterCourse) url += `&course=${encodeURIComponent(filterCourse)}`;
      if (filterType) url += `&passType=${encodeURIComponent(filterType)}`;
      if (filterStatus) url += `&status=${encodeURIComponent(filterStatus)}`;
      if (filterSearch) url += `&search=${encodeURIComponent(filterSearch)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data && Array.isArray(data.passes)) {
        setHistoryPasses(data.passes);
      }
    } catch (err) {
      console.error('Error cargando historial de pases:', err);
    } finally {
      setLoadingPasses(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchTodayPasses();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'today') {
      fetchTodayPasses();
    } else if (activeTab === 'history') {
      fetchHistoryPasses();
    }
  }, [activeTab, filterStartDate, filterEndDate, filterCourse, filterType, filterStatus]);

  // Consultar estadísticas inmediatas al seleccionar estudiante
  useEffect(() => {
    if (!selectedStudent) {
      setStudentStats({ monthlyLates: 0, yearlyLates: 0, totalPasses: 0, hasLateToday: false, alertTriggered: false });
      return;
    }

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const cleanRun = String(selectedStudent.run || '').trim();
        const res = await fetch(`/api/passes/student-stats/${encodeURIComponent(cleanRun)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.stats) {
          setStudentStats(data.stats);
        }
      } catch (err) {
        console.error('Error consultando estadísticas del estudiante:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
    // Fijar hora actual por defecto
    const now = new Date();
    setPassTimeInput(now.toTimeString().slice(0, 5));
  }, [selectedStudent]);

  // Filtrado reactivo de estudiantes para el buscador en vivo
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[\.\-]/g, '');

    return students.filter(s => {
      const name = String(s.full_name || s.name || '').toLowerCase();
      const run = String(s.run || '').toLowerCase().replace(/[\.\-]/g, '');
      const course = String(getStudentCourse(s)).toLowerCase();
      const numMat = String(s.enrollment_number || s.numero_matricula || '').toLowerCase();

      return name.includes(q) || run.includes(cleanQ) || course.includes(q) || numMat.includes(q);
    }).slice(0, 10);
  }, [students, searchQuery]);

  // Lista única de cursos para filtros
  const availableCourses = useMemo(() => {
    const setCourses = new Set<string>();
    students.forEach(s => {
      const c = getStudentCourse(s);
      if (c && c !== 'Sin Curso') setCourses.add(c);
    });
    return sortCoursesList(Array.from(setCourses));
  }, [students]);

  // KPIs de la jornada de hoy
  const todayKpis = useMemo(() => {
    const total = todayPasses.length;
    const unjustified = todayPasses.filter(p => String(p.status).toLowerCase() === 'injustificado').length;
    const justified = todayPasses.filter(p => String(p.status).toLowerCase() === 'justificado').length;
    const uniqueStudents = new Set(todayPasses.map(p => p.student_run)).size;
    return { total, unjustified, justified, uniqueStudents };
  }, [todayPasses]);

  // Manejar selección de estudiante
  const handleSelectStudent = (st: any) => {
    setSelectedStudent(st);
    setSearchQuery('');
  };

  // Manejar emisión del pase
  const handleEmitPass = async (autoPrint: boolean = true) => {
    if (!selectedStudent) {
      Swal.fire('Atención', 'Por favor selecciona un estudiante para emitir el pase.', 'warning');
      return;
    }

    const finalReason = reason === 'Otro motivo (especificar)' ? customReason.trim() : reason;
    if (!finalReason) {
      Swal.fire('Atención', 'Debes especificar el motivo del atraso o inasistencia.', 'warning');
      return;
    }

    const courseName = getStudentCourse(selectedStudent);
    const now = new Date();
    const passDate = now.toISOString().slice(0, 10);
    const passTime = passTimeInput ? `${passTimeInput}:00` : now.toTimeString().slice(0, 8);

    setSubmitting(true);
    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentRun: selectedStudent.run,
          studentName: selectedStudent.full_name || selectedStudent.name,
          courseName,
          passType,
          passDate,
          passTime,
          reason: finalReason,
          status: passStatus,
          justificationDetail: justificationDetail.trim() || null,
          inspectorName: user?.name || 'Inspector de Turno',
          inspectorId: user?.id || null,
          academicYear: 2026,
          period: '1er Semestre'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar el pase.');
      }

      const createdPass: PassData = data.pass;
      const updatedMonthly = data.studentStats?.monthlyLates || studentStats.monthlyLates + 1;
      const updatedYearly = data.studentStats?.yearlyLates || studentStats.yearlyLates + 1;

      // Actualizar listas locales
      setTodayPasses(prev => [createdPass, ...prev]);

      // Alerta de reincidencia si aplica
      if (data.studentStats?.alertTriggered) {
        Swal.fire({
          icon: 'warning',
          title: '⚠️ Alerta de Reincidencia Escolar',
          html: `
            <div style="text-align: left; font-size: 0.95rem;">
              <p>El estudiante <strong>${createdPass.student_name}</strong> ha alcanzado <strong>${updatedMonthly} atrasos este mes</strong> (total anual: <strong>${updatedYearly}</strong>).</p>
              <p style="color: #dc2626; font-weight: 700; margin-top: 0.5rem;">
                Conforme al RICE, se debe citar al apoderado o enviar notificación oficial de Inspectoría.
              </p>
            </div>
          `,
          confirmButtonColor: '#4f46e5'
        });
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Pase #${String(createdPass.folio).padStart(5, '0')} emitido correctamente`,
          showConfirmButton: false,
          timer: 2000
        });
      }

      // Si autoPrint es true, lanzar impresión térmica directa en EPSON TM-T20II
      if (autoPrint) {
        printThermalPass(createdPass, updatedMonthly, updatedYearly, passFontScale);
      }

      // Limpiar formulario y enfocar buscador
      setSelectedStudent(null);
      setCustomReason('');
      setJustificationDetail('');
      setPassStatus('Injustificado');
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo emitir el pase.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Justificar pase existente
  const handleJustifyPass = async (pass: PassData) => {
    const { value: detail } = await Swal.fire({
      title: `Justificar Pase #${String(pass.folio).padStart(5, '0')}`,
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #334155;">
          <p>Estudiante: <strong>${pass.student_name}</strong> (${pass.course_name})</p>
          <p>Motivo original: <em>${pass.reason}</em></p>
          <label style="display: block; font-weight: 700; margin-top: 0.75rem; margin-bottom: 0.25rem;">
            Detalle de justificación (comunicación / certificado):
          </label>
        </div>
      `,
      input: 'textarea',
      inputPlaceholder: 'Ej: Apoderado presenta certificado médico o justifica presencialmente en portería...',
      showCancelButton: true,
      confirmButtonText: 'Guardar Justificación',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a'
    });

    if (detail !== undefined) {
      try {
        const res = await fetch(`/api/passes/${pass.id}/justify`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ justificationDetail: detail })
        });
        if (res.ok) {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pase justificado', timer: 1500, showConfirmButton: false });
          fetchTodayPasses();
          if (activeTab === 'history') fetchHistoryPasses();
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo justificar el pase.', 'error');
      }
    }
  };

  // Exportar historial a CSV
  const handleExportCSV = () => {
    if (historyPasses.length === 0) {
      Swal.fire('Información', 'No hay registros para exportar con los filtros actuales.', 'info');
      return;
    }

    const headers = ['Folio', 'Fecha', 'Hora', 'Estudiante', 'RUN', 'Curso', 'Tipo', 'Motivo', 'Estado', 'Inspector'];
    const rows = historyPasses.map(p => [
      `#${String(p.folio).padStart(5, '0')}`,
      formatDateDMY(p.pass_date),
      p.pass_time || '',
      `"${p.student_name.replace(/"/g, '""')}"`,
      p.student_run,
      `"${p.course_name.replace(/"/g, '""')}"`,
      `"${p.pass_type.replace(/"/g, '""')}"`,
      `"${p.reason.replace(/"/g, '""')}"`,
      p.status,
      `"${p.inspector_name.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Atrasos_Inspectoría_${filterStartDate}_a_${filterEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '85vh' }}>
      {/* ENCABEZADO PRINCIPAL */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            color: '#ffffff',
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
          }}>
            <Clock size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                Control de Atrasos & Pases de Entrada
              </h1>
              <span style={{
                background: '#e0e7ff',
                color: '#4338ca',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: '1px solid #c7d2fe'
              }}>
                EPSON TM-T20II Ready (80mm)
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              Inspectoría General & Portería — Emisión y registro de pases escolares sincronizados con el portal de apoderados.
            </p>
          </div>
        </div>

        {/* RELOJ DIGITAL EN VIVO Y SESIÓN */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          background: '#f8fafc',
          padding: '0.6rem 1.2rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
              {currentTime.toTimeString().slice(0, 8)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
              {currentTime.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '1rem', textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Inspector en Turno:
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3730a3' }}>
              {user?.name || 'Administrador'}
            </span>
          </div>
        </div>
      </div>

      {/* TARJETAS KPI RESUMEN DE LA JORNADA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Pases Emitidos Hoy</span>
            <FileText size={18} color="#4f46e5" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
            {todayKpis.total}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{todayKpis.uniqueStudents} alumnos distintos</span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #fed7aa', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase' }}>Atrasos Injustificados</span>
            <AlertTriangle size={18} color="#ea580c" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#c2410c' }}>
            {todayKpis.unjustified}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#ea580c' }}>Pendientes de justificación</span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #bbf7d0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>Atrasos Justificados</span>
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d' }}>
            {todayKpis.justified}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Con certificado o aviso</span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #fecdd3', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>Alerta Reincidencia</span>
            <ShieldAlert size={18} color="#e11d48" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#be123c' }}>
            {todayPasses.filter(p => (p.monthlyLatesCount || 0) >= 3).length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#be123c' }}>≥ 3 atrasos en el mes</span>
        </div>
      </div>

      {/* BARRA DE NAVEGACIÓN POR PESTAÑAS */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => setActiveTab('emit')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'emit' ? '3px solid #4f46e5' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'emit' ? '#4f46e5' : '#64748b',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Plus size={18} /> Emisión de Pase Rápido
        </button>

        <button
          onClick={() => setActiveTab('today')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'today' ? '3px solid #4f46e5' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'today' ? '#4f46e5' : '#64748b',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Calendar size={18} /> Pases de Hoy ({todayPasses.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.65rem 1.25rem',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #4f46e5' : '3px solid transparent',
            background: 'transparent',
            color: activeTab === 'history' ? '#4f46e5' : '#64748b',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <TrendingUp size={18} /> Historial General & Reportes
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: EMISIÓN DE PASE RÁPIDO */}
      {activeTab === 'emit' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* COLUMNA 1: BUSCADOR DE ESTUDIANTE */}
          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={20} color="#4f46e5" /> 1. Buscar Estudiante
            </h2>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Ingresa el RUN, Nombre o Curso del estudiante para registrar su llegada tardía.
            </p>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Escribe el nombre, RUN (ej: 22.345.678-9) o curso..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.6rem',
                  borderRadius: '10px',
                  border: '1.5px solid #6366f1',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxShadow: '0 1px 3px rgba(99, 102, 241, 0.12)'
                }}
                autoFocus
              />
              <Search size={18} color="#6366f1" style={{ position: 'absolute', left: '0.85rem', top: '0.85rem' }} />
            </div>

            {/* LISTA DE RESULTADOS DE BÚSQUEDA */}
            {searchResults.length > 0 && (
              <div style={{
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                marginBottom: '1rem',
                background: '#ffffff'
              }}>
                {searchResults.map((st, idx) => {
                  const cName = getStudentCourse(st);
                  return (
                    <div
                      key={st.id || idx}
                      onClick={() => handleSelectStudent(st)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                          {st.full_name || st.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.75rem', marginTop: '2px' }}>
                          <span>RUN: <strong>{formatRut(st.run)}</strong></span>
                          <span>Curso: <strong>{cName}</strong></span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#6366f1" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* FICHA DEL ESTUDIANTE SELECCIONADO */}
            {selectedStudent ? (
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1.5px solid #cbd5e1',
                marginTop: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' }}>
                      Estudiante Seleccionado
                    </span>
                    <h3 style={{ margin: '0.2rem 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                      {selectedStudent.full_name || selectedStudent.name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginTop: '4px' }}>
                      <span>RUN: <strong>{formatRut(selectedStudent.run)}</strong></span>
                      <span>Curso: <strong>{getStudentCourse(selectedStudent)}</strong></span>
                      <span>Prof. Jefe: <strong>{selectedStudent.profesor_jefe || 'Sin Asignar'}</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    style={{
                      background: '#fee2e2',
                      border: 'none',
                      color: '#dc2626',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Cambiar
                  </button>
                </div>

                {/* CONTADOR DE REINCIDENCIA DE ATRASOS */}
                <div style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: studentStats.alertTriggered ? '#fff1f2' : '#f0fdf4',
                  border: studentStats.alertTriggered ? '1.5px solid #fecdd3' : '1.5px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: studentStats.alertTriggered ? '#9f1239' : '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      {studentStats.alertTriggered ? <AlertTriangle size={18} color="#e11d48" /> : <CheckCircle2 size={18} color="#16a34a" />}
                      Atrasos del Mes: <strong>{studentStats.monthlyLates}</strong> | Acumulados en el Año: <strong>{studentStats.yearlyLates}</strong>
                    </div>
                    {studentStats.alertTriggered && (
                      <span style={{ fontSize: '0.75rem', color: '#be123c', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                        ⚠️ ALERTA: 3 o más atrasos acumulados — Requiere citación al apoderado.
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 900,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    background: studentStats.alertTriggered ? '#e11d48' : '#16a34a',
                    color: '#ffffff'
                  }}>
                    {studentStats.alertTriggered ? 'REINCIDENTE' : 'REGULAR'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
                <User size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontWeight: 700 }}>Busca y selecciona un alumno en el buscador superior</p>
                <span style={{ fontSize: '0.8rem' }}>Puedes buscar por nombre, apellido, RUT o curso</span>
              </div>
            )}
          </div>

          {/* COLUMNA 2: FORMULARIO DE EMISIÓN DE PASE */}
          {selectedStudent && (
            <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={20} color="#4f46e5" /> 2. Datos del Pase & Impresión
              </h2>
              <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                Completa los datos del ingreso y emite el ticket térmico para la sala de clases.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Tipo de Pase:
                  </label>
                  <select
                    value={passType}
                    onChange={e => setPassType(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.88rem', background: '#ffffff' }}
                  >
                    <option value="Atraso a la Jornada">Atraso a la Jornada (Ingreso Matinal)</option>
                    <option value="Atraso Inter-clases">Atraso Inter-clases (Recreo / Módulo)</option>
                    <option value="Reincorporación Inasistencia">Reincorporación por Inasistencia</option>
                    <option value="Salida Anticipada">Salida Anticipada con Apoderado</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Hora de Registro:
                  </label>
                  <input
                    type="time"
                    value={passTimeInput}
                    onChange={e => setPassTimeInput(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.88rem', background: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Motivo de la Llegada Tardía:
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.88rem', background: '#ffffff' }}
                >
                  {COMMON_REASONS.map((r, idx) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>

                {reason === 'Otro motivo (especificar)' && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Escribe el motivo detallado..."
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginTop: '0.5rem', fontSize: '0.85rem' }}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Estado del Pase:
                  </label>
                  <select
                    value={passStatus}
                    onChange={e => setPassStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: passStatus === 'Justificado' ? '1.5px solid #16a34a' : '1.5px solid #ea580c',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      background: passStatus === 'Justificado' ? '#f0fdf4' : '#fff7ed',
                      color: passStatus === 'Justificado' ? '#15803d' : '#c2410c'
                    }}
                  >
                    <option value="Injustificado">Injustificado (Por defecto)</option>
                    <option value="Justificado">Justificado (Aviso / Certificado)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Inspector Emisor:
                  </label>
                  <input
                    type="text"
                    value={user?.name || 'Inspector de Turno'}
                    disabled
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', background: '#f1f5f9', color: '#475569' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Observaciones adicionales (Opcional):
                </label>
                <textarea
                  value={justificationDetail}
                  onChange={e => setJustificationDetail(e.target.value)}
                  placeholder="Detalles adicionales, número de documento médico, o notas de portería..."
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* SELECTOR DE TAMAÑO DE VOUCHER TÉRMICO */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Type size={16} color="#4f46e5" />
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                        Tamaño Impresión Voucher:
                      </span>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                        Optimizado para rollo 80mm EPSON TM-T20II
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
                    {(['normal', 'large', 'extralarge'] as PassFontScale[]).map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => handleFontScaleChange(scale)}
                        style={{
                          border: 'none',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: passFontScale === scale ? 800 : 600,
                          background: passFontScale === scale ? '#ffffff' : 'transparent',
                          color: passFontScale === scale ? '#4f46e5' : '#64748b',
                          boxShadow: passFontScale === scale ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {scale === 'normal' ? 'Normal' : scale === 'large' ? '⭐ Grande' : 'Extra Grande'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleEmitPass(true)}
                  disabled={submitting}
                  className="btn"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 3px 8px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  <Printer size={18} /> {submitting ? 'Emitiendo...' : 'Emitir e Imprimir Voucher (TM-T20II)'}
                </button>

                <button
                  onClick={() => {
                    const tempPass: PassData = {
                      id: 'preview',
                      folio: 1,
                      student_id: selectedStudent.id,
                      student_run: selectedStudent.run,
                      student_name: selectedStudent.full_name || selectedStudent.name,
                      course_name: getStudentCourse(selectedStudent),
                      pass_type: passType,
                      pass_date: new Date().toISOString().slice(0, 10),
                      pass_time: passTimeInput || new Date().toTimeString().slice(0, 5),
                      reason: reason === 'Otro motivo (especificar)' ? customReason : reason,
                      status: passStatus,
                      justification_detail: justificationDetail || null,
                      inspector_name: user?.name || 'Inspector de Turno',
                      academic_year: 2026,
                      monthlyLatesCount: studentStats.monthlyLates + 1,
                      yearlyLatesCount: studentStats.yearlyLates + 1
                    };
                    setPreviewPass(tempPass);
                  }}
                  className="btn"
                  style={{
                    background: '#ffffff',
                    color: '#4f46e5',
                    border: '1.5px solid #c7d2fe',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Eye size={16} /> Vista Previa
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: PASES DE HOY */}
      {activeTab === 'today' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="#4f46e5" /> Pases Emitidos Hoy ({currentTime.toLocaleDateString('es-CL')})
            </h2>
            <button
              onClick={fetchTodayPasses}
              disabled={loadingPasses}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <RefreshCw size={14} /> Refrescar
            </button>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', width: '90px' }}>Folio</th>
                  <th style={{ padding: '0.75rem', width: '85px' }}>Hora</th>
                  <th style={{ padding: '0.75rem' }}>Estudiante</th>
                  <th style={{ padding: '0.75rem' }}>Curso</th>
                  <th style={{ padding: '0.75rem' }}>Motivo</th>
                  <th style={{ padding: '0.75rem', width: '120px' }}>Estado</th>
                  <th style={{ padding: '0.75rem' }}>Inspector</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '140px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {todayPasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                      No se han emitido pases de entrada durante la jornada de hoy.
                    </td>
                  </tr>
                ) : (
                  todayPasses.map((p, idx) => {
                    const isJustified = String(p.status).toLowerCase() === 'justificado';
                    return (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 900, color: '#4338ca' }}>
                          #{String(p.folio).padStart(5, '0')}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                          {String(p.pass_time || '').slice(0, 5)} hrs
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <strong style={{ color: '#0f172a' }}>{p.student_name}</strong><br/>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>RUN: {formatRut(p.student_run)}</span>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#334155' }}>
                          {p.course_name}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#475569' }}>
                          {p.reason}
                          {p.justification_detail && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#059669', fontStyle: 'italic' }}>
                              Detalle: {p.justification_detail}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: isJustified ? '#dcfce7' : '#ffedd5',
                            color: isJustified ? '#15803d' : '#c2410c',
                            border: isJustified ? '1px solid #bbf7d0' : '1px solid #fed7aa'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                          {p.inspector_name}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => printThermalPass(p, undefined, undefined, passFontScale)}
                              title="Reimprimir Voucher en EPSON TM-T20II"
                              style={{
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #c7d2fe',
                                background: '#e0e7ff',
                                color: '#4338ca',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.75rem',
                                fontWeight: 800
                              }}
                            >
                              <Printer size={13} /> Imprimir
                            </button>

                            {!isJustified && (
                              <button
                                onClick={() => handleJustifyPass(p)}
                                title="Justificar atraso"
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '6px',
                                  border: '1px solid #bbf7d0',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800
                                }}
                              >
                                <Check size={13} /> Justificar
                              </button>
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
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: HISTORIAL & REPORTES */}
      {activeTab === 'history' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="#4f46e5" /> Historial de Pases de Inspectoría
            </h2>

            <button
              onClick={handleExportCSV}
              style={{
                background: '#ffffff',
                color: '#15803d',
                border: '1.5px solid #86efac',
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Download size={15} /> Exportar Excel (CSV)
            </button>
          </div>

          {/* BARRA DE FILTROS */}
          <div style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '1.25rem'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Desde:</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Hasta:</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Curso:</label>
              <select
                value={filterCourse}
                onChange={e => setFilterCourse(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', minWidth: '160px' }}
              >
                <option value="">-- Todos los Cursos --</option>
                {availableCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Estado:</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                <option value="">-- Todos --</option>
                <option value="Injustificado">Injustificado</option>
                <option value="Justificado">Justificado</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Buscar alumno:</label>
              <input
                type="text"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchHistoryPasses()}
                placeholder="Nombre o RUN..."
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <button
              onClick={fetchHistoryPasses}
              disabled={loadingPasses}
              style={{
                alignSelf: 'flex-end',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Filtrar
            </button>
          </div>

          {/* TABLA DE RESULTADOS HISTÓRICOS */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem', width: '85px' }}>Folio</th>
                  <th style={{ padding: '0.75rem', width: '105px' }}>Fecha / Hora</th>
                  <th style={{ padding: '0.75rem' }}>Estudiante</th>
                  <th style={{ padding: '0.75rem' }}>Curso</th>
                  <th style={{ padding: '0.75rem' }}>Tipo / Motivo</th>
                  <th style={{ padding: '0.75rem', width: '115px' }}>Estado</th>
                  <th style={{ padding: '0.75rem' }}>Inspector</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '130px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historyPasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                      No se encontraron pases registrados en el período y filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  historyPasses.map((p, idx) => {
                    const isJustified = String(p.status).toLowerCase() === 'justificado';
                    return (
                      <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 900, color: '#4338ca' }}>
                          #{String(p.folio).padStart(5, '0')}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.82rem' }}>
                          <strong>{formatDateDMY(p.pass_date)}</strong><br/>
                          <span style={{ color: '#64748b' }}>{String(p.pass_time || '').slice(0, 5)} hrs</span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <strong style={{ color: '#0f172a' }}>{p.student_name}</strong><br/>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatRut(p.student_run)}</span>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#334155' }}>
                          {p.course_name}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ fontSize: '0.78rem', color: '#6366f1', fontWeight: 700, display: 'block' }}>{p.pass_type}</span>
                          <span style={{ color: '#334155' }}>{p.reason}</span>
                          {p.justification_detail && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: '#059669', fontStyle: 'italic' }}>
                              {p.justification_detail}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: isJustified ? '#dcfce7' : '#ffedd5',
                            color: isJustified ? '#15803d' : '#c2410c',
                            border: isJustified ? '1px solid #bbf7d0' : '1px solid #fed7aa'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                          {p.inspector_name}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => printThermalPass(p, undefined, undefined, passFontScale)}
                              title="Reimprimir Voucher en EPSON TM-T20II"
                              style={{
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #c7d2fe',
                                background: '#e0e7ff',
                                color: '#4338ca',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.75rem',
                                fontWeight: 800
                              }}
                            >
                              <Printer size={13} />
                            </button>
                            <button
                              onClick={() => setPreviewPass(p)}
                              title="Ver Voucher en Pantalla"
                              style={{
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.75rem',
                                fontWeight: 800
                              }}
                            >
                              <Eye size={13} />
                            </button>
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
      )}

      {/* MODAL DE VISTA PREVIA Y REIMPRESIÓN */}
      {previewPass && (
        <ThermalReceiptPreviewModal
          pass={previewPass}
          onClose={() => setPreviewPass(null)}
          onPrint={() => setPreviewPass(null)}
        />
      )}
    </div>
  );
};
