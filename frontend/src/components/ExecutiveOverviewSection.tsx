import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  CheckCircle2,
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
  Users,
  Trash2,
  Calendar,
  Flame,
  Check,
  X,
  Printer,
  BarChart3,
  PieChart,
  FileText,
  ChevronRight,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { getStudentCourse } from '../utils/course';
import {
  GuardianCallRecord,
  StudentReportTarget,
  CallsSummaryStats,
  isCallAccepted,
  isCallRejected,
  checkWeeklyUnansweredAlert,
  printStudentCallReport,
  printConsolidatedCallReport
} from '../utils/printGuardianCalls';

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
  const [calls, setCalls] = useState<GuardianCallRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [savingCall, setSavingCall] = useState<boolean>(false);

  // Estados visuales y reportes
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [isStudentReportModalOpen, setIsStudentReportModalOpen] = useState<boolean>(false);
  const [selectedReportStudent, setSelectedReportStudent] = useState<StudentReportTarget | null>(null);
  const [studentReportSearch, setStudentReportSearch] = useState<string>('');
  const [isGeneralReportModalOpen, setIsGeneralReportModalOpen] = useState<boolean>(false);

  // Opciones de configuración para el reporte general
  const [reportScope, setReportScope] = useState<'all' | 'filtered'>('all');
  const [includeChartsInReport, setIncludeChartsInReport] = useState<boolean>(true);
  const [includeRankingInReport, setIncludeRankingInReport] = useState<boolean>(true);
  const [includeRecordsInReport, setIncludeRecordsInReport] = useState<boolean>(true);
  const [includeSignaturesInReport, setIncludeSignaturesInReport] = useState<boolean>(false);

  // Filtros de bitácora
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [filterOnlyAlerts, setFilterOnlyAlerts] = useState<boolean>(false);

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
        fetch('/api/guardian-calls?limit=500', {
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

  // Cursos disponibles para filtro
  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    calls.forEach((c) => {
      if (c.course_name && c.course_name.trim().length > 0) {
        set.add(c.course_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [calls]);

  // Métricas reactivas calculadas localmente para total precisión inmediata
  const computedStats: CallsSummaryStats = useMemo(() => {
    const total = calls.length;
    const accepted = calls.filter((c) => isCallAccepted(c.status)).length;
    const rejected = calls.filter((c) => isCallRejected(c.status)).length;
    const contactRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const commitmentsCount = calls.filter((c) => c.commitment && c.commitment.trim().length > 0).length;
    const uniqueStudentsCount = new Set(calls.map((c) => (c.student_name || '').trim().toLowerCase()).filter(Boolean)).size;

    // Desglose por resultado
    const statusCounts: Record<string, number> = {};
    CALL_STATUSES.forEach((s) => (statusCounts[s.value] = 0));
    calls.forEach((c) => {
      const matched = CALL_STATUSES.find((s) => s.value.toLowerCase() === (c.status || '').toLowerCase());
      if (matched) {
        statusCounts[matched.value] = (statusCounts[matched.value] || 0) + 1;
      } else {
        const fallback = CALL_STATUSES.find((s) => c.status && c.status.toLowerCase().includes(s.value.toLowerCase().slice(0, 5)));
        if (fallback) {
          statusCounts[fallback.value] = (statusCounts[fallback.value] || 0) + 1;
        } else {
          statusCounts['Contestada / Aceptada'] = (statusCounts['Contestada / Aceptada'] || 0) + 1;
        }
      }
    });

    const statusBreakdown = CALL_STATUSES.map((s) => {
      const count = statusCounts[s.value] || 0;
      return {
        label: s.label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        color: s.color
      };
    });

    // Desglose por motivo
    const reasonCounts: Record<string, number> = {};
    calls.forEach((c) => {
      const r = c.reason || 'Otro motivo';
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });

    const reasonBreakdown = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      accepted,
      rejected,
      contactRate,
      commitmentsCount,
      uniqueStudentsCount,
      statusBreakdown,
      reasonBreakdown
    };
  }, [calls]);

  // Ranking de estudiantes calculados localmente
  const computedTopStudents = useMemo(() => {
    const studentMap: Record<
      string,
      {
        student_id: string;
        student_name: string;
        student_run: string;
        course_name: string;
        guardian_name: string;
        guardian_phone: string;
        total_calls: number;
        accepted_calls: number;
        rejected_calls: number;
        last_call_date: string;
        last_reason: string;
        last_status: string;
      }
    > = {};

    calls.forEach((c) => {
      const key = (c.student_name || 'Sin Nombre').trim();
      if (!studentMap[key]) {
        studentMap[key] = {
          student_id: c.student_id || '',
          student_name: key,
          student_run: c.student_run || '',
          course_name: c.course_name || '',
          guardian_name: c.guardian_name || '',
          guardian_phone: c.guardian_phone || '',
          total_calls: 0,
          accepted_calls: 0,
          rejected_calls: 0,
          last_call_date: c.call_date,
          last_reason: c.reason,
          last_status: c.status
        };
      }
      studentMap[key].total_calls += 1;
      if (isCallAccepted(c.status)) {
        studentMap[key].accepted_calls += 1;
      }
      if (isCallRejected(c.status)) {
        studentMap[key].rejected_calls += 1;
      }
      if (new Date(c.call_date) > new Date(studentMap[key].last_call_date)) {
        studentMap[key].last_call_date = c.call_date;
        studentMap[key].last_reason = c.reason;
        studentMap[key].last_status = c.status;
      }
    });

    return Object.values(studentMap)
      .sort((a, b) => b.total_calls - a.total_calls)
      .slice(0, 8);
  }, [calls]);

  // Detección de estudiantes con alertas de incontactabilidad semanal (>= 3 llamadas no contestadas en 7 días)
  const studentsInWeeklyAlert = useMemo(() => {
    const studentCallsMap: Record<string, { student: StudentReportTarget; calls: GuardianCallRecord[] }> = {};

    calls.forEach((c) => {
      const key = (c.student_name || 'Desconocido').trim();
      if (!studentCallsMap[key]) {
        studentCallsMap[key] = {
          student: {
            name: key,
            run: c.student_run,
            course: c.course_name,
            guardianName: c.guardian_name,
            guardianPhone: c.guardian_phone
          },
          calls: []
        };
      }
      studentCallsMap[key].calls.push(c);
    });

    const alerts: Array<{
      student: StudentReportTarget;
      unansweredCount: number;
      periodText: string;
      calls: GuardianCallRecord[];
    }> = [];

    Object.values(studentCallsMap).forEach((entry) => {
      const check = checkWeeklyUnansweredAlert(entry.calls);
      if (check.isAlert) {
        alerts.push({
          student: entry.student,
          unansweredCount: check.unansweredCount,
          periodText: check.periodText || 'en una semana',
          calls: entry.calls
        });
      }
    });

    return alerts.sort((a, b) => b.unansweredCount - a.unansweredCount);
  }, [calls]);

  const alertStudentNames = useMemo(() => {
    return new Set(studentsInWeeklyAlert.map((a) => a.student.name.trim().toLowerCase()));
  }, [studentsInWeeklyAlert]);

  // Filtrado de las llamadas en la bitácora
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (filterOnlyAlerts && !alertStudentNames.has((c.student_name || '').trim().toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'accepted' && !isCallAccepted(c.status)) {
          return false;
        }
        if (statusFilter === 'rejected' && !isCallRejected(c.status)) {
          return false;
        }
      }
      if (reasonFilter !== 'all' && c.reason !== reasonFilter) {
        return false;
      }
      if (courseFilter !== 'all' && c.course_name !== courseFilter) {
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
        const commitment = (c.commitment || '').toLowerCase();
        return (
          sName.includes(q) ||
          sRun.includes(q) ||
          gName.includes(q) ||
          gPhone.includes(q) ||
          cName.includes(q) ||
          caller.includes(q) ||
          notes.includes(q) ||
          commitment.includes(q)
        );
      }
      return true;
    });
  }, [calls, filterOnlyAlerts, alertStudentNames, statusFilter, reasonFilter, courseFilter, searchFilter]);

  // Lista de estudiantes para selector de reporte individual
  const studentReportCandidates = useMemo(() => {
    const list: StudentReportTarget[] = [];
    const seen = new Set<string>();

    // Primero los estudiantes con llamadas registradas
    calls.forEach((c) => {
      const key = (c.student_name || '').trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({
          name: c.student_name,
          run: c.student_run,
          course: c.course_name,
          guardianName: c.guardian_name,
          guardianPhone: c.guardian_phone
        });
      }
    });

    // Luego el resto de la nómina si no están
    students.forEach((s) => {
      const fullName = (s.full_name || `${s.first_name || ''} ${s.paternal_surname || ''}`).trim();
      const key = fullName.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({
          name: fullName,
          run: s.run,
          course: getStudentCourse(s) || s.desc_grado,
          guardianName: s.guardian_name || s.father_name || s.mother_name,
          guardianPhone: s.guardian_phone || s.emergency_contact_phone || s.mobile_phone || s.phone
        });
      }
    });

    if (!studentReportSearch.trim()) return list.slice(0, 10);
    const q = studentReportSearch.toLowerCase();
    return list
      .filter((st) => st.name.toLowerCase().includes(q) || (st.run || '').toLowerCase().includes(q) || (st.course || '').toLowerCase().includes(q))
      .slice(0, 10);
  }, [calls, students, studentReportSearch]);

  // Filtrado reactivo de estudiantes para el autocompletado en el modal de nueva llamada
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

  // Abrir reporte de estudiante
  const handleOpenStudentReport = (studentTarget: StudentReportTarget) => {
    setSelectedReportStudent(studentTarget);
    setIsStudentReportModalOpen(true);
  };

  // Llamadas del estudiante seleccionado en el modal
  const targetStudentCalls = useMemo(() => {
    if (!selectedReportStudent) return [];
    const targetName = selectedReportStudent.name.trim().toLowerCase();
    const targetRun = (selectedReportStudent.run || '').trim().toLowerCase();
    return calls.filter((c) => {
      const cName = (c.student_name || '').trim().toLowerCase();
      const cRun = (c.student_run || '').trim().toLowerCase();
      return (targetName && cName.includes(targetName)) || (targetRun && cRun === targetRun);
    });
  }, [calls, selectedReportStudent]);

  // Alerta del estudiante actualmente seleccionado
  const selectedStudentWeeklyAlert = useMemo(() => {
    return checkWeeklyUnansweredAlert(targetStudentCalls);
  }, [targetStudentCalls]);

  // Ejecutar impresión del reporte de estudiante (sin firmas por instrucción de dirección)
  const triggerPrintStudentReport = () => {
    if (!selectedReportStudent) return;
    printStudentCallReport(selectedReportStudent, targetStudentCalls, {
      institutionName: 'LICEO TÉCNICO PROFESIONAL',
      academicYear: 2026
    });
  };

  // Ejecutar impresión del reporte consolidado
  const triggerPrintGeneralReport = () => {
    const callsToPrint = reportScope === 'filtered' ? filteredCalls : calls;
    const filterDescription =
      reportScope === 'filtered'
        ? `Llamadas filtradas (${filteredCalls.length} registros) - Motivo: ${reasonFilter}, Estado: ${statusFilter}, Curso: ${courseFilter}`
        : `Total consolidado (${calls.length} llamadas registradas)`;

    printConsolidatedCallReport(callsToPrint, computedStats, computedTopStudents, {
      institutionName: 'LICEO TÉCNICO PROFESIONAL',
      academicYear: 2026,
      includeCharts: includeChartsInReport,
      includeRanking: includeRankingInReport,
      includeRecords: includeRecordsInReport,
      includeSignatures: includeSignaturesInReport,
      filterDescription
    });
  };

  const getStatusBadge = (status: string) => {
    const config = CALL_STATUSES.find((s) => s.value === status) || {
      color: '#4b5563',
      bg: '#f3f4f6',
      border: '#e5e7eb'
    };
    const isAccepted = isCallAccepted(status);
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
        {isAccepted ? <Check size={12} /> : <X size={12} />}
        {status}
      </span>
    );
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* 1. HEADER EJECUTIVO INSTITUCIONAL */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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

      {/* 2. TARJETAS DE PANORAMA INSTITUCIONAL */}
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
            <CheckCircle2 size={14} /> {data ? data.grades.passRate : '93.4'}% Aprobación ({data ? data.grades.total.toLocaleString('es-CL') : '17.138'} notas)
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
            {data ? data.passes.total : '0'} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Pases Emitidos</span>
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
            {data ? data.interviews.total : '1'} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Actas Firmadas</span>
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
        {/* Encabezado del Marcador con Botones de Impresión y Registro */}
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
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Phone size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Registro y Marcador de Llamadas a Apoderados
              </h3>
              <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b' }}>
                Constancia de contacto institucional, trazabilidad de citaciones, compromisos y análisis gráfico de contactabilidad.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Botón Alternar Gráficos */}
            <button
              onClick={() => setShowCharts(!showCharts)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: showCharts ? '#0284c7' : '#ffffff',
                color: showCharts ? '#ffffff' : '#0369a1',
                border: showCharts ? '1px solid #0284c7' : '1px solid #cbd5e1',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Alternar panel visual de gráficos estadísticos"
            >
              <BarChart3 size={16} /> {showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}
            </button>

            {/* Botón Imprimir Reporte por Estudiante */}
            <button
              onClick={() => {
                if (calls.length > 0) {
                  const first = calls[0];
                  setSelectedReportStudent({
                    name: first.student_name,
                    run: first.student_run,
                    course: first.course_name,
                    guardianName: first.guardian_name,
                    guardianPhone: first.guardian_phone
                  });
                } else if (students.length > 0) {
                  const firstSt = students[0];
                  setSelectedReportStudent({
                    name: firstSt.full_name || `${firstSt.first_name || ''} ${firstSt.paternal_surname || ''}`.trim(),
                    run: firstSt.run,
                    course: getStudentCourse(firstSt) || firstSt.desc_grado,
                    guardianName: firstSt.guardian_name,
                    guardianPhone: firstSt.guardian_phone
                  });
                }
                setIsStudentReportModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#4338ca',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(67, 56, 202, 0.25)',
                transition: 'background 0.2s'
              }}
              title="Generar constancia o reporte individual por estudiante"
            >
              <User size={16} /> Reporte por Estudiante
            </button>

            {/* Botón Imprimir Reporte Consolidado con Gráficos */}
            <button
              onClick={() => setIsGeneralReportModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                transition: 'background 0.2s'
              }}
              title="Imprimir informe consolidado general con gráficos y registros"
            >
              <Printer size={16} /> Imprimir Total Llamadas
            </button>

            {/* Botón Registrar Nueva Llamada */}
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
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
                transition: 'background 0.2s'
              }}
            >
              <Plus size={16} /> Registrar Nueva Llamada
            </button>
          </div>
        </div>

        {/* 3.0. ALERTA CRÍTICA: ESTUDIANTES CON MÁS DE 3 LLAMADAS SIN CONTESTAR EN UNA SEMANA */}
        {studentsInWeeklyAlert.length > 0 && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '12px',
              padding: '1.1rem 1.5rem',
              margin: '1.25rem 1.75rem 0',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={22} color="#dc2626" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#991b1b' }}>
                  🚨 Alerta Institucional: {studentsInWeeklyAlert.length} {studentsInWeeklyAlert.length === 1 ? 'Estudiante' : 'Estudiantes'} con 3 o más llamadas sin contestar en una semana
                </h4>
              </div>
              <button
                onClick={() => setFilterOnlyAlerts(!filterOnlyAlerts)}
                style={{
                  backgroundColor: filterOnlyAlerts ? '#dc2626' : '#ffffff',
                  color: filterOnlyAlerts ? '#ffffff' : '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {filterOnlyAlerts ? 'Ver todas las llamadas' : 'Filtrar solo llamadas en alerta'}
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '0.75rem'
              }}
            >
              {studentsInWeeklyAlert.map((al, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#991b1b' }}>
                      {al.student.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {al.student.course || 'Sin curso'} • {al.student.guardianPhone ? `Tel: ${al.student.guardianPhone}` : 'Sin teléfono'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>
                      ⚠️ {al.unansweredCount} llamadas no contestadas ({al.periodText})
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={() => handleOpenStudentReport(al.student)}
                      style={{
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Ver Ficha
                    </button>
                    <button
                      onClick={() =>
                        handleOpenModal({
                          full_name: al.student.name,
                          run: al.student.run,
                          desc_grado: al.student.course,
                          guardian_name: al.student.guardianName,
                          guardian_phone: al.student.guardianPhone
                        })
                      }
                      style={{
                        backgroundColor: '#dc2626',
                        border: 'none',
                        color: '#ffffff',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Marcador Analítico (Scoreboard de Contacto) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
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
                {computedStats.total}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {computedStats.uniqueStudentsCount} estudiantes contactados
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
                {computedStats.accepted}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                {computedStats.total > 0 ? Math.round((computedStats.accepted / computedStats.total) * 100) : 0}% de efectividad directa
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
                {computedStats.rejected}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                Sin contacto telefónico
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
                backgroundColor: computedStats.contactRate >= 60 ? '#dcfce7' : computedStats.contactRate >= 40 ? '#fef3c7' : '#fee2e2',
                color: computedStats.contactRate >= 60 ? '#15803d' : computedStats.contactRate >= 40 ? '#b45309' : '#b91c1c'
              }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Contactabilidad Efectiva
              </div>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: computedStats.contactRate >= 60 ? '#15803d' : computedStats.contactRate >= 40 ? '#b45309' : '#dc2626'
                }}
              >
                {computedStats.contactRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                🤝 {computedStats.commitmentsCount} compromisos acordados
              </div>
            </div>
          </div>
        </div>

        {/* 3.1. PANEL DE ANÁLISIS GRÁFICO INTEGRADO */}
        {showCharts && calls.length > 0 && (
          <div
            style={{
              padding: '1.5rem 1.75rem',
              borderBottom: '1px solid #f1f5f9',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} color="#0284c7" />
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Análisis Gráfico y Distribución de Contactabilidad Institucional
                </h4>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Datos generados en tiempo real sobre {computedStats.total} llamadas registradas
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {/* Gráfico 1: Resultados y Estados */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                    1. Distribución por Resultado del Contacto
                  </div>
                  <PieChart size={16} color="#64748b" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {computedStats.statusBreakdown.map((s, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '3px' }}>
                        <span style={{ color: '#334155' }}>{s.label}</span>
                        <span style={{ color: s.color, fontWeight: 800 }}>
                          {s.count} ({s.percentage}%)
                        </span>
                      </div>
                      <div style={{ height: '7px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${s.percentage}%`,
                            backgroundColor: s.color,
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gráfico 2: Motivos Principales */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                    2. Motivos de Llamada más Frecuentes
                  </div>
                  <BarChart3 size={16} color="#64748b" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {computedStats.reasonBreakdown.slice(0, 5).map((r, idx) => {
                    const colors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899'];
                    const color = colors[idx % colors.length];
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '3px' }}>
                          <span style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '210px' }}>
                            {r.reason}
                          </span>
                          <span style={{ color, fontWeight: 800 }}>
                            {r.count} ({r.percentage}%)
                          </span>
                        </div>
                        <div style={{ height: '7px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${r.percentage}%`,
                              backgroundColor: color,
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gráfico 3: Indicadores de Compromisos y Efectividad */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.1rem 1.25rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px' }}>
                    3. Diagnóstico de Eficacia Institucional
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
                    Nivel de respuesta familiar frente a requerimientos y citaciones escolares.
                  </p>

                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: computedStats.contactRate >= 60 ? '#f0fdf4' : computedStats.contactRate >= 40 ? '#fefce8' : '#fef2f2',
                      border: `1px solid ${computedStats.contactRate >= 60 ? '#bbf7d0' : computedStats.contactRate >= 40 ? '#fef08a' : '#fecaca'}`,
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: computedStats.contactRate >= 60 ? '#166534' : computedStats.contactRate >= 40 ? '#854d0e' : '#991b1b' }}>
                      {computedStats.contactRate >= 60
                        ? '🟢 Contactabilidad Adecuada'
                        : computedStats.contactRate >= 40
                        ? '🟡 Contactabilidad Media (Insistir)'
                        : '🔴 Alta Tasa de Rechazo / No Contesta'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '3px' }}>
                      De cada 10 llamadas, aproximadamente {Math.round(computedStats.contactRate / 10)} resultan en conversación efectiva con el apoderado.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setIsGeneralReportModalOpen(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Printer size={14} /> Imprimir con Gráficos
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3.2. SECCIÓN INTERMEDIA: RANKING "A QUIÉN SE LLAMA MÁS" */}
        {computedTopStudents.length > 0 && (
          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} color="#ea580c" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  Marcador Destacado: Estudiantes con Mayor Registro de Contacto Telefónico
                </h4>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Acceso rápido a ficha e impresión individual
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '0.75rem'
              }}
            >
              {computedTopStudents.slice(0, 4).map((top, index) => {
                const total = top.total_calls;
                const accepted = top.accepted_calls;
                const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
                const hasWeeklyAlert = alertStudentNames.has(top.student_name.trim().toLowerCase());

                return (
                  <div
                    key={index}
                    style={{
                      border: hasWeeklyAlert ? '1.5px solid #f87171' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      backgroundColor: hasWeeklyAlert ? '#fffafb' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                          {hasWeeklyAlert && (
                            <span
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800
                              }}
                              title="Alerta: 3 o más llamadas sin contestar en 7 días"
                            >
                              🚨 3+ sin contestar
                            </span>
                          )}
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() =>
                            handleOpenStudentReport({
                              name: top.student_name,
                              run: top.student_run,
                              course: top.course_name,
                              guardianName: top.guardian_name,
                              guardianPhone: top.guardian_phone
                            })
                          }
                          style={{
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Imprimir ficha de llamadas de este estudiante"
                        >
                          <Printer size={12} /> Reporte
                        </button>

                        <button
                          onClick={() => {
                            const match = students.find((s) => s.id === top.student_id || s.run === top.student_run);
                            handleOpenModal(
                              match || {
                                full_name: top.student_name,
                                run: top.student_run,
                                desc_grado: top.course_name,
                                guardian_name: top.guardian_name,
                                guardian_phone: top.guardian_phone
                              }
                            );
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
                          Llamar →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3.3. FILTROS Y BUSCADOR DE BITÁCORA */}
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
                placeholder="Buscar por estudiante, apoderado, teléfono, motivo o acuerdo..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Botón Filtro Rápido Alertas Semanales */}
            {studentsInWeeklyAlert.length > 0 && (
              <button
                onClick={() => setFilterOnlyAlerts(!filterOnlyAlerts)}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  backgroundColor: filterOnlyAlerts ? '#dc2626' : '#fef2f2',
                  color: filterOnlyAlerts ? '#ffffff' : '#b91c1c',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Filtrar estudiantes con 3 o más llamadas no contestadas en 7 días"
              >
                <AlertTriangle size={14} />
                {filterOnlyAlerts ? 'Ver Todos' : `En Alerta (${studentsInWeeklyAlert.length})`}
              </button>
            )}

            {/* Filtro por Curso */}
            {availableCourses.length > 0 && (
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="all">Todos los Cursos</option>
                {availableCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Filtro por Resultado */}
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

            {/* Filtro por Motivo */}
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

            {(searchFilter || statusFilter !== 'all' || reasonFilter !== 'all' || courseFilter !== 'all' || filterOnlyAlerts) && (
              <button
                onClick={() => {
                  setSearchFilter('');
                  setStatusFilter('all');
                  setReasonFilter('all');
                  setCourseFilter('all');
                  setFilterOnlyAlerts(false);
                }}
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.8rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* 3.4. TABLA / BITÁCORA DE LLAMADAS */}
        <div style={{ overflowX: 'auto', maxHeight: '460px' }}>
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
                  const isStudentAlert = alertStudentNames.has((c.student_name || '').trim().toLowerCase());

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isStudentAlert ? '#fffafb' : 'transparent',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{c.student_name}</span>
                          {isStudentAlert && (
                            <span
                              style={{
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 800
                              }}
                              title="Alerta: 3 o más llamadas no contestadas en 7 días"
                            >
                              🚨 3+ sin contestar
                            </span>
                          )}
                        </div>
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
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontStyle: 'italic', fontWeight: 600 }}>
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {/* Botón Imprimir Ficha de Estudiante */}
                          <button
                            onClick={() =>
                              handleOpenStudentReport({
                                name: c.student_name,
                                run: c.student_run,
                                course: c.course_name,
                                guardianName: c.guardian_name,
                                guardianPhone: c.guardian_phone
                              })
                            }
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#0284c7',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '6px',
                              transition: 'all 0.15s'
                            }}
                            title="Imprimir reporte de llamadas de este estudiante"
                          >
                            <Printer size={16} />
                          </button>

                          {/* Botón Eliminar Registro */}
                          <button
                            onClick={() => handleDeleteCall(c.id, c.student_name)}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '5px',
                              borderRadius: '6px',
                              transition: 'color 0.15s'
                            }}
                            title="Eliminar registro de llamada"
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Buscar Estudiante en Matrícula (Autocompletado):
                </label>
                <input
                  type="text"
                  placeholder="Escriba nombre o RUN del estudiante..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setFormStudentName(e.target.value);
                    setShowStudentDropdown(true);
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px'
                  }}
                />

                {showStudentDropdown && filteredStudents.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      marginTop: '4px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 10,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {filteredStudents.map((st) => {
                      const fullName = st.full_name || `${st.first_name || ''} ${st.paternal_surname || ''}`.trim();
                      const course = getStudentCourse(st) || st.desc_grado || 'Sin curso';
                      return (
                        <div
                          key={st.id || st.run}
                          onClick={() => handleSelectStudent(st)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.825rem',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <div>
                            <strong>{fullName}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {course} • RUN: {st.run || '-'}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>Seleccionar</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grid 2 columnas: Estudiante y Curso */}
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
                    placeholder="Ej. 1° Medio A / Pre-kinder"
                    value={formCourseName}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Nombre del Apoderado Contactado:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. María Umanzor (Madre)"
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
                    Teléfono al que se llamó:
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

      {/* 5. MODAL: REPORTE INDIVIDUAL POR ESTUDIANTE */}
      {isStudentReportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsStudentReportModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Cabecera del modal de reporte */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#a5b4fc'
                  }}
                >
                  <User size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Reporte Individual de Llamadas por Estudiante
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>
                    Constancia y trazabilidad de contactos telefónicos y acuerdos con el apoderado
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStudentReportModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Buscador / Selector de estudiante dentro del modal */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Seleccionar o Cambiar Estudiante:
                </label>
                <input
                  type="text"
                  placeholder="Filtrar estudiante por nombre, RUN o curso..."
                  value={studentReportSearch}
                  onChange={(e) => setStudentReportSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}
                />

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '110px', overflowY: 'auto' }}>
                  {studentReportCandidates.map((st, idx) => {
                    const isSelected = selectedReportStudent?.name === st.name;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedReportStudent(st)}
                        style={{
                          backgroundColor: isSelected ? '#312e81' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#1e293b',
                          border: isSelected ? '1px solid #312e81' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {st.name} <span style={{ opacity: 0.75, fontSize: '0.72rem' }}>({st.course || 'Sin curso'})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista Previa del Reporte */}
              {selectedReportStudent ? (
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                  {/* Ficha del Alumno */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Ficha del Estudiante</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{selectedReportStudent.name}</div>
                      <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '2px' }}>
                        <strong>RUN:</strong> {selectedReportStudent.run || 'No informado'} • <strong>Curso:</strong> {selectedReportStudent.course || 'Sin curso'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Apoderado Registrado</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{selectedReportStudent.guardianName || 'No especificado'}</div>
                      <div style={{ fontSize: '0.825rem', color: '#0284c7', fontWeight: 700 }}>📞 {selectedReportStudent.guardianPhone || 'Sin teléfono'}</div>
                    </div>
                  </div>

                  {/* Alerta Semanal en Vista Previa si aplica */}
                  {selectedStudentWeeklyAlert.isAlert && (
                    <div
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1.5px solid #f87171',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.85rem', color: '#991b1b' }}>
                          🚨 ALERTA CRÍTICA DE CONTACTABILIDAD ({selectedStudentWeeklyAlert.unansweredCount} llamadas sin contestar {selectedStudentWeeklyAlert.periodText})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '2px' }}>
                          El apoderado no ha respondido a 3 o más llamadas telefónicas en el transcurso de una semana. Se sugiere activar protocolo institucional de citación presencial formal por Inspectoría o visita domiciliaria.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPIs del Alumno (Cálculo exacto: Contestadas + No Contesta = Total) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TOTAL LLAMADOS</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7' }}>{targetStudentCalls.length}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>CONTESTADAS</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>
                        {targetStudentCalls.filter((c) => isCallAccepted(c.status)).length}
                      </div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>NO CONTESTA</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#dc2626' }}>
                        {targetStudentCalls.filter((c) => isCallRejected(c.status)).length}
                      </div>
                    </div>
                    <div style={{ background: '#fefce8', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #fef08a' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e' }}>EFECTIVIDAD</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#b45309' }}>
                        {targetStudentCalls.length > 0
                          ? Math.round((targetStudentCalls.filter((c) => isCallAccepted(c.status)).length / targetStudentCalls.length) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Historial */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{ padding: '8px 12px', background: '#0f172a', color: '#ffffff', fontWeight: 700, fontSize: '0.8rem' }}>
                      HISTORIAL CRONOLÓGICO DE CONTACTOS TELEFÓNICOS ({targetStudentCalls.length})
                    </div>
                    {targetStudentCalls.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                        No existen llamadas registradas para este estudiante aún.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '6px 8px' }}>Folio</th>
                            <th style={{ padding: '6px 8px' }}>Fecha</th>
                            <th style={{ padding: '6px 8px' }}>Motivo</th>
                            <th style={{ padding: '6px 8px' }}>Resultado</th>
                            <th style={{ padding: '6px 8px' }}>Detalle / Compromiso</th>
                            <th style={{ padding: '6px 8px' }}>Funcionario</th>
                          </tr>
                        </thead>
                        <tbody>
                          {targetStudentCalls.map((c, i) => (
                            <tr key={c.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 700 }}>#{c.folio || c.id.slice(-4)}</td>
                              <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                                {new Date(c.call_date).toLocaleDateString('es-CL')}
                              </td>
                              <td style={{ padding: '6px 8px' }}>{c.reason}</td>
                              <td style={{ padding: '6px 8px' }}>{getStatusBadge(c.status)}</td>
                              <td style={{ padding: '6px 8px' }}>
                                {c.notes || '-'}
                                {c.commitment && (
                                  <div style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.75rem' }}>
                                    🤝 Compromiso: {c.commitment}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '6px 8px', color: '#64748b' }}>{c.caller_name || 'Funcionario'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Seleccione un estudiante de la lista superior para visualizar e imprimir su reporte.
                </div>
              )}

              {/* Botones de acción del modal de reporte */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsStudentReportModalOpen(false)}
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
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={triggerPrintStudentReport}
                  disabled={!selectedReportStudent}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Printer size={16} /> Imprimir Reporte Oficial (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: REPORTE CONSOLIDADO GENERAL (TOTAL DE LLAMADAS CON GRÁFICOS Y REGISTROS) */}
      {isGeneralReportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsGeneralReportModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Cabecera del modal consolidado */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
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
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#99f6e4'
                  }}
                >
                  <Printer size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Reporte Consolidado de Total de Llamadas
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccfbf1' }}>
                    Informe institucional con gráficos estadísticos, ranking y registro detallado
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGeneralReportModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ccfbf1',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Opciones de Configuración del Reporte */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Configuración del Reporte a Imprimir:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Alcance de Registros:
                    </label>
                    <select
                      value={reportScope}
                      onChange={(e) => setReportScope(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.825rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="all">Todas las llamadas del sistema ({calls.length} registros)</option>
                      <option value="filtered">Solo llamadas según filtros actuales ({filteredCalls.length} registros)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeChartsInReport}
                      onChange={(e) => setIncludeChartsInReport(e.target.checked)}
                    />
                    <strong>Incluir Gráficos Analíticos</strong> (Resultados y Motivos)
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeRankingInReport}
                      onChange={(e) => setIncludeRankingInReport(e.target.checked)}
                    />
                    <strong>Incluir Ranking de Alumnos</strong>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeRecordsInReport}
                      onChange={(e) => setIncludeRecordsInReport(e.target.checked)}
                    />
                    <strong>Incluir Registro Detallado</strong>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeSignaturesInReport}
                      onChange={(e) => setIncludeSignaturesInReport(e.target.checked)}
                    />
                    <strong>Incluir Bloque de Firmas</strong>
                  </label>
                </div>
              </div>

              {/* Vista previa rápida del reporte */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ textAlign: 'center', borderBottom: '2px solid #0f766e', paddingBottom: '10px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>LICEO TÉCNICO PROFESIONAL</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f766e' }}>INFORME EJECUTIVO CONSOLIDADO DE CONTACTO TELEFÓNICO</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Año Académico 2026 • Constancia Institucional</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>TOTAL LLAMADOS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0284c7' }}>
                      {reportScope === 'filtered' ? filteredCalls.length : computedStats.total}
                    </div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534' }}>CONTESTADAS</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#16a34a' }}>
                      {reportScope === 'filtered'
                        ? filteredCalls.filter((c) => isCallAccepted(c.status)).length
                        : computedStats.accepted}
                    </div>
                  </div>
                  <div style={{ background: '#fef2f2', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b' }}>NO CONTESTA</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#dc2626' }}>
                      {reportScope === 'filtered'
                        ? filteredCalls.filter((c) => isCallRejected(c.status)).length
                        : computedStats.rejected}
                    </div>
                  </div>
                  <div style={{ background: '#fefce8', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid #fef08a' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#854d0e' }}>CONTACTABILIDAD</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b45309' }}>
                      {computedStats.contactRate}%
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                  ℹ️ El documento se imprimirá en formato oficial tamaño Carta/A4 con estilos vectoriales nítidos y paginación institucional.
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsGeneralReportModalOpen(false)}
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
                  type="button"
                  onClick={triggerPrintGeneralReport}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: 'none',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)'
                  }}
                >
                  <Printer size={16} /> Imprimir Reporte Consolidado (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
