import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  CheckCircle2,
  XCircle,
  TrendingUp,
  GraduationCap,
  Award,
  BookOpen,
  ShieldAlert,
  MessageSquare,
  RefreshCw,
  Plus,
  Search,
  Filter,
  User,
  Trash2,
  Calendar,
  Clock,
  ChevronRight,
  ExternalLink,
  Flame,
  Check,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';
import { getStudentCourse } from '../utils/course';

interface ExecutiveOverviewData {
  grades: {
    total: number;
    avg: number;
    approved: number;
    failed: number;
    passRate: number;
  };
  observations: {
    total: number;
    positive: number;
    negative: number;
  };
  cra: {
    total: number;
    active: number;
    returned: number;
  };
  passes: {
    total: number;
    today: number;
  };
  interviews: {
    total: number;
  };
  calls: {
    total: number;
    accepted: number;
    rejected: number;
    contactRate: number;
  };
  topCalledStudents: Array<{
    student_id: string;
    student_name: string;
    student_run: string;
    course_name: string;
    guardian_name: string;
    guardian_phone: string;
    total_calls: number | string;
    accepted_calls: number | string;
    rejected_calls: number | string;
    last_call_date: string;
    last_reason: string;
    last_status: string;
  }>;
}

interface GuardianCall {
  id: string;
  folio: number;
  student_id: string;
  student_run: string;
  student_name: string;
  course_name: string;
  guardian_name: string;
  guardian_phone: string;
  caller_name: string;
  caller_id: string;
  call_date: string;
  reason: string;
  status: string;
  notes?: string;
  commitment?: string;
  academic_year: number;
  period: string;
  created_at: string;
}

interface Props {
  token: string;
  user: any;
  students: any[];
  onNavigateTab: (tabId: any, tabTitle: string) => void;
}

const CALL_REASONS = [
  'Citación a Entrevista',
  'Inasistencia reiterada',
  'Atrasos reiterados',
  'Rendimiento académico / Calificaciones',
  'Felicitación / Reconocimiento',
  'Conducta / Convivencia escolar',
  'Salud / Emergencia médica',
  'Entrega de documentación / Beneficios',
  'Informativo general',
  'Otro motivo'
];

const CALL_STATUSES = [
  { value: 'Contestada / Aceptada', label: 'Contestada / Aceptada', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'Compromiso acordado', label: 'Compromiso acordado', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { value: 'No contesta', label: 'No contesta', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { value: 'Rechazada / Cortó', label: 'Rechazada / Cortó llamada', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  { value: 'Ocupado / Buzón', label: 'Ocupado / Buzón de voz', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
  { value: 'Número equivocado', label: 'Número erróneo / Inexistente', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
];

export const ExecutiveOverviewSection: React.FC<Props> = ({
  token,
  user,
  students,
  onNavigateTab
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ExecutiveOverviewData | null>(null);
  const [calls, setCalls] = useState<GuardianCall[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [savingCall, setSavingCall] = useState<boolean>(false);

  // Filtros de bitácora
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  // Formulario de nueva llamada
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [showStudentDropdown, setShowStudentDropdown] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [formStudentName, setFormStudentName] = useState<string>('');
  const [formStudentRun, setFormStudentRun] = useState<string>('');
  const [formCourseName, setFormCourseName] = useState<string>('');
  const [formGuardianName, setFormGuardianName] = useState<string>('');
  const [formGuardianPhone, setFormGuardianPhone] = useState<string>('');
  const [formCallerName, setFormCallerName] = useState<string>(user?.name || 'Administrador');
  const [formReason, setFormReason] = useState<string>('Citación a Entrevista');
  const [formStatus, setFormStatus] = useState<string>('Contestada / Aceptada');
  const [formCallDate, setFormCallDate] = useState<string>(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [formNotes, setFormNotes] = useState<string>('');
  const [formCommitment, setFormCommitment] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, callsRes] = await Promise.all([
        fetch('/api/dashboard/executive-overview', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/guardian-calls?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (overviewRes.ok) {
        const overviewJson = await overviewRes.json();
        setData(overviewJson);
      }

      if (callsRes.ok) {
        const callsJson = await callsRes.json();
        setCalls(callsJson.calls || []);
      }
    } catch (err) {
      console.error('Error al cargar datos del panorama ejecutivo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Filtrado reactivo de estudiantes para el autocompletado en el modal
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const query = studentSearch.toLowerCase().trim();
    return students
      .filter((s) => {
        const name = (s.full_name || `${s.first_name || ''} ${s.paternal_surname || ''}`).toLowerCase();
        const run = (s.run || '').toLowerCase();
        return name.includes(query) || run.includes(query);
      })
      .slice(0, 8);
  }, [studentSearch, students]);

  const handleSelectStudent = (st: any) => {
    setSelectedStudent(st);
    const fullName = st.full_name || `${st.first_name || ''} ${st.paternal_surname || ''}`.trim();
    setFormStudentName(fullName);
    setFormStudentRun(st.run || '');
    setFormCourseName(getStudentCourse(st) || st.desc_grado || '');
    const guardian = st.guardian_name || st.father_name || st.mother_name || st.emergency_contact_name || '';
    const phone = st.guardian_phone || st.emergency_contact_phone || st.mobile_phone || st.phone || st.father_phone || st.mother_phone || '';
    setFormGuardianName(guardian);
    setFormGuardianPhone(phone);
    setShowStudentDropdown(false);
    setStudentSearch(fullName);
  };

  const handleOpenModal = (prefillStudent?: any) => {
    if (prefillStudent) {
      handleSelectStudent(prefillStudent);
    } else {
      setSelectedStudent(null);
      setStudentSearch('');
      setFormStudentName('');
      setFormStudentRun('');
      setFormCourseName('');
      setFormGuardianName('');
      setFormGuardianPhone('');
    }
    setFormCallerName(user?.name || 'Administrador');
    setFormReason('Citación a Entrevista');
    setFormStatus('Contestada / Aceptada');
    const now = new Date();
    setFormCallDate(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setFormNotes('');
    setFormCommitment('');
    setIsModalOpen(true);
  };

  const handleSubmitCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentName.trim()) {
      Swal.fire('Atención', 'Debe ingresar el nombre del estudiante.', 'warning');
      return;
    }
    if (!formReason) {
      Swal.fire('Atención', 'Debe seleccionar el motivo del contacto.', 'warning');
      return;
    }

    setSavingCall(true);
    try {
      const res = await fetch('/api/guardian-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: selectedStudent?.id || null,
          student_run: formStudentRun,
          student_name: formStudentName,
          course_name: formCourseName,
          guardian_name: formGuardianName,
          guardian_phone: formGuardianPhone,
          call_date: formCallDate,
          reason: formReason,
          status: formStatus,
          notes: formNotes,
          commitment: formCommitment,
          academic_year: 2026,
          period: '1er Semestre'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo guardar la llamada');
      }

      Swal.fire({
        icon: 'success',
        title: 'Llamada Registrada',
        text: `Se registró correctamente el contacto telefónico para ${formStudentName}.`,
        timer: 2000,
        showConfirmButton: false
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al guardar la llamada.', 'error');
    } finally {
      setSavingCall(false);
    }
  };

  const handleDeleteCall = async (id: string, studentName: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      text: `Se eliminará la constancia de llamada de ${studentName}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/guardian-calls/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al eliminar');

        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'El registro fue eliminado exitosamente.',
          timer: 1500,
          showConfirmButton: false
        });
        loadData();
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar el registro.', 'error');
      }
    }
  };

  // Filtrado de las llamadas en la bitácora
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'accepted' && !['Contestada / Aceptada', 'Contestada', 'Aceptada', 'Compromiso acordado'].includes(c.status)) {
          return false;
        }
        if (statusFilter === 'rejected' && ['Contestada / Aceptada', 'Contestada', 'Aceptada', 'Compromiso acordado'].includes(c.status)) {
          return false;
        }
      }
      if (reasonFilter !== 'all' && c.reason !== reasonFilter) {
        return false;
      }
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const sName = (c.student_name || '').toLowerCase();
        const sRun = (c.student_run || '').toLowerCase();
        const gName = (c.guardian_name || '').toLowerCase();
        const gPhone = (c.guardian_phone || '').toLowerCase();
        const cName = (c.course_name || '').toLowerCase();
        const caller = (c.caller_name || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();
        return (
          sName.includes(q) ||
          sRun.includes(q) ||
          gName.includes(q) ||
          gPhone.includes(q) ||
          cName.includes(q) ||
          caller.includes(q) ||
          notes.includes(q)
        );
      }
      return true;
    });
  }, [calls, statusFilter, reasonFilter, searchFilter]);

  const getStatusBadge = (status: string) => {
    const config = CALL_STATUSES.find((s) => s.value === status) || {
      color: '#4b5563',
      bg: '#f3f4f6',
      border: '#e5e7eb'
    };
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: config.color,
          backgroundColor: config.bg,
          border: `1px solid ${config.border}`
        }}
      >
        {status.includes('Contestada') || status.includes('acordado') ? (
          <Check size={12} />
        ) : (
          <X size={12} />
        )}
        {status}
      </span>
    );
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* 1. HEADER EJECUTIVO */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)',
          borderRadius: '16px',
          padding: '1.75rem 2rem',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          marginBottom: '1.75rem'
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                backgroundColor: 'rgba(20, 184, 166, 0.25)',
                color: '#5eead4',
                padding: '2px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Exclusivo Dirección & Administración
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>• Año Académico 2026</span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Panorama Institucional y Tablero Ejecutivo
          </h2>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.4' }}>
            Control global en tiempo real: Calificaciones oficiales, convivencia escolar, biblioteca CRA, inspectoría y bitácora activa de contacto telefónico con apoderados.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Refrescar métricas directas"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>

          <button
            onClick={() => handleOpenModal()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease'
            }}
          >
            <PhoneCall size={18} />
            + Registrar Llamada a Apoderado
          </button>
        </div>
      </div>

      {/* 2. TARJETAS DE PANORAMA INSTITUCIONAL (NOTAS, ANOTACIONES, CRA, PASES, ENTREVISTAS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Calificaciones */}
        <div
          onClick={() => onNavigateTab('grades', 'Libro de Calificaciones')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Ver Libro de Calificaciones"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>Panorama de Calificaciones</span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <GraduationCap size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
            {data ? data.grades.avg.toFixed(1) : '5.9'} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Promedio</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> {data ? data.grades.passRate : '93.4'}% Aprobación ({data ? data.grades.total.toLocaleString('es-CL') : '17.136'} notas)
          </div>
        </div>

        {/* Convivencia Escolar / Hoja de Vida */}
        <div
          onClick={() => onNavigateTab('observations', 'Hoja de Vida y Anotaciones')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Ver Hoja de Vida RICE"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>Convivencia y Hoja de Vida</span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              <Award size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
            {data ? data.observations.total : '1'} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Anotaciones</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <span>🟢 {data ? data.observations.positive : '1'} Positivas</span>
            <span>•</span>
            <span style={{ color: '#dc2626' }}>🔴 {data ? data.observations.negative : '0'} Negativas</span>
          </div>
        </div>

        {/* Biblioteca CRA */}
        <div
          onClick={() => onNavigateTab('cra', 'Biblioteca CRA')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Ver Módulo Biblioteca CRA"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>Biblioteca CRA</span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
            {data ? data.cra.active : '0'} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Prestados</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6d28d9', fontWeight: 600 }}>
            {data ? data.cra.returned : '2'} Devueltos • Total: {data ? data.cra.total : '2'} Préstamos
          </div>
        </div>

        {/* Inspectoría General */}
        <div
          onClick={() => onNavigateTab('inspectoria', 'Inspectoría')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Ver Inspectoría y Pases de Salida"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>Inspectoría General</span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fff7ed', color: '#ea580c' }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
            {data ? data.passes.total : '5'} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Pases Emitidos</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#c2410c', fontWeight: 600 }}>
            {data ? data.passes.today : '0'} Pases emitidos hoy
          </div>
        </div>

        {/* Actas de Entrevistas */}
        <div
          onClick={() => onNavigateTab('interviews', 'Actas de Entrevistas')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Ver Actas de Entrevistas a Apoderados"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#64748b' }}>Entrevistas con Apoderados</span>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
              <MessageSquare size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
            {data ? data.interviews.total : '0'} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Actas Firmadas</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#4338ca', fontWeight: 600 }}>
            Compromisos oficiales y citaciones
          </div>
        </div>
      </div>

      {/* 3. MARCADOR Y BITÁCORA DE LLAMADAS A APODERADOS */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}
      >
        {/* Encabezado del Marcador */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Phone size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Registro y Marcador de Llamadas a Apoderados
              </h3>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b' }}>
                Constancia de contacto institucional, trazabilidad de citaciones, y análisis de contactabilidad efectiva.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleOpenModal()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <Plus size={16} /> Registrar Nueva Llamada
          </button>
        </div>

        {/* Marcador Analítico (Scoreboard de Contacto) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#f8fafc'
          }}
        >
          {/* Total llamadas */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: '#e0f2fe',
                color: '#0369a1'
              }}
            >
              <Phone size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Total Llamados
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
                {data ? data.calls.total : calls.length}
              </div>
            </div>
          </div>

          {/* Contestadas / Aceptadas */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#15803d'
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Contestadas / Aceptadas
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a' }}>
                {data ? data.calls.accepted : 0}
              </div>
            </div>
          </div>

          {/* Rechazadas / No contesta */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: '#fee2e2',
                color: '#b91c1c'
              }}
            >
              <PhoneMissed size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                No Contesta / Rechazadas
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#dc2626' }}>
                {data ? data.calls.rejected : 0}
              </div>
            </div>
          </div>

          {/* Tasa de Contactabilidad */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                color: '#b45309'
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Contactabilidad Efectiva
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b45309' }}>
                {data ? data.calls.contactRate : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN INTERMEDIA: RANKING "A QUIÉN SE LLAMA MÁS" */}
        {data && data.topCalledStudents && data.topCalledStudents.length > 0 && (
          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem' }}>
              <Flame size={18} color="#ea580c" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                Marcador Destacado: Estudiantes con Mayor Registro de Contacto Telefónico
              </h4>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0.75rem'
              }}
            >
              {data.topCalledStudents.slice(0, 4).map((top, index) => {
                const total = parseInt(String(top.total_calls || '0'), 10);
                const accepted = parseInt(String(top.accepted_calls || '0'), 10);
                const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;

                return (
                  <div
                    key={index}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              backgroundColor: index === 0 ? '#fef08a' : index === 1 ? '#e2e8f0' : '#fed7aa',
                              color: '#854d0e',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            #{index + 1}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            {top.student_name}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          {top.course_name || 'Sin curso'} {top.guardian_phone ? `• Tel: ${top.guardian_phone}` : ''}
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}
                        title="Cantidad total de llamados"
                      >
                        {total} {total === 1 ? 'llamada' : 'llamadas'}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: '#64748b',
                        borderTop: '1px dashed #f1f5f9',
                        paddingTop: '6px'
                      }}
                    >
                      <span>
                        Respuesta: <strong style={{ color: rate >= 60 ? '#16a34a' : '#dc2626' }}>{rate}%</strong> ({accepted} exitosas)
                      </span>
                      <button
                        onClick={() => {
                          const match = students.find((s) => s.id === top.student_id || s.run === top.student_run);
                          handleOpenModal(match || { full_name: top.student_name, run: top.student_run, desc_grado: top.course_name, guardian_name: top.guardian_name, guardian_phone: top.guardian_phone });
                        }}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: 'none',
                          color: '#0369a1',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        Volver a llamar →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FILTROS Y BUSCADOR DE BITÁCORA */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 280px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar por estudiante, apoderado, teléfono o motivo..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  fontSize: '0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">Todos los Resultados</option>
              <option value="accepted">Solo Contestadas / Aceptadas</option>
              <option value="rejected">Solo No Contesta / Rechazadas</option>
            </select>

            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="all">Todos los Motivos</option>
              {CALL_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLA / BITÁCORA DE LLAMADAS */}
        <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
          {filteredCalls.length === 0 ? (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <Phone size={36} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155' }}>
                No hay llamadas registradas que coincidan con la búsqueda
              </div>
              <p style={{ margin: '4px 0 1rem', fontSize: '0.85rem' }}>
                Comience a registrar los contactos telefónicos con apoderados para llevar constancia institucional.
              </p>
              <button
                onClick={() => handleOpenModal()}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                + Registrar Primera Llamada
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>Folio / Fecha</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>Estudiante & Curso</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>Apoderado & Teléfono</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>Motivo</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>Resultado</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>Detalle / Acuerdos</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>Funcionario</th>
                  <th style={{ padding: '0.65rem 1rem', fontWeight: 700, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map((c) => {
                  const callDate = new Date(c.call_date);
                  const formattedDate = callDate.toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                  const formattedTime = callDate.toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>#{c.folio || c.id.slice(-4)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formattedDate} {formattedTime}
                        </div>
                      </td>

                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {c.course_name || 'Sin curso'} {c.student_run ? `• ${c.student_run}` : ''}
                        </div>
                      </td>

                      <td style={{ padding: '0.65rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          {c.guardian_name || 'Apoderado no especificado'}
                        </div>
                        {c.guardian_phone ? (
                          <a
                            href={`tel:${c.guardian_phone}`}
                            style={{
                              fontSize: '0.75rem',
                              color: '#0284c7',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600
                            }}
                          >
                            <Phone size={11} /> {c.guardian_phone}
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin teléfono</span>
                        )}
                      </td>

                      <td style={{ padding: '0.65rem 1rem' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {c.reason}
                        </span>
                      </td>

                      <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                        {getStatusBadge(c.status)}
                      </td>

                      <td style={{ padding: '0.65rem 1rem', maxWidth: '280px' }}>
                        {c.notes && (
                          <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '2px' }}>
                            {c.notes}
                          </div>
                        )}
                        {c.commitment && (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontStyle: 'italic' }}>
                            🤝 Compromiso: {c.commitment}
                          </div>
                        )}
                        {!c.notes && !c.commitment && (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>

                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {c.caller_name || 'Funcionario'}
                      </td>

                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleDeleteCall(c.id, c.student_name)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            transition: 'color 0.15s'
                          }}
                          title="Eliminar registro de llamada"
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. MODAL: REGISTRAR LLAMADA A APODERADO */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Cabecera del Modal */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#ffffff',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399'
                  }}
                >
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Registrar Contacto Telefónico a Apoderado
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Constancia oficial de llamada, acuerdo o citación
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmitCall} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Buscador de Estudiante */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Buscar Estudiante en Matrícula (Autocompletar):
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Escriba nombre o RUT del estudiante..."
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentDropdown(true);
                      setFormStudentName(e.target.value);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2rem',
                      fontSize: '0.875rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      outline: 'none'
                    }}
                  />
                </div>

                {showStudentDropdown && filteredStudents.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    {filteredStudents.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleSelectStudent(st)}
                        style={{
                          padding: '0.5rem 0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>
                            {st.full_name || `${st.first_name || ''} ${st.paternal_surname || ''}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {getStudentCourse(st) || st.desc_grado || 'Sin curso'} • RUT: {st.run || 'S/R'}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                          Seleccionar →
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid 2 columnas: Alumno y Curso */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nombre del Estudiante *:
                  </label>
                  <input
                    type="text"
                    required
                    value={formStudentName}
                    onChange={(e) => setFormStudentName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Curso / Nivel:
                  </label>
                  <input
                    type="text"
                    value={formCourseName}
                    placeholder="Ej. 1° Medio A"
                    onChange={(e) => setFormCourseName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              </div>

              {/* Grid 2 columnas: Apoderado y Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nombre del Apoderado / Contacto:
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del apoderado o tutor"
                    value={formGuardianName}
                    onChange={(e) => setFormGuardianName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Teléfono Marcado:
                  </label>
                  <input
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={formGuardianPhone}
                    onChange={(e) => setFormGuardianPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              </div>

              {/* Grid 2 columnas: Motivo y Resultado */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Motivo de la Llamada *:
                  </label>
                  <select
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {CALL_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Resultado del Llamado *:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      fontWeight: 700
                    }}
                  >
                    {CALL_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid 2 columnas: Fecha/Hora y Quién Llama */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Fecha y Hora del Contacto:
                  </label>
                  <input
                    type="datetime-local"
                    value={formCallDate}
                    onChange={(e) => setFormCallDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Funcionario / Quién Llama:
                  </label>
                  <input
                    type="text"
                    value={formCallerName}
                    onChange={(e) => setFormCallerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              </div>

              {/* Detalle de lo conversado */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Detalle / Resumen de la Conversación:
                </label>
                <textarea
                  rows={3}
                  placeholder="Explique brevemente de qué se trató el llamado, información entregada o respuesta del apoderado..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Compromiso acordado */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Compromiso o Acuerdo con el Apoderado (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej. Asistirá a entrevista este jueves 10:00 hrs / Justificará inasistencia mañana"
                  value={formCommitment}
                  onChange={(e) => setFormCommitment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px'
                  }}
                />
              </div>

              {/* Botones de acción */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1rem',
                  marginTop: '0.5rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingCall}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {savingCall ? 'Guardando...' : 'Guardar Registro de Llamada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
