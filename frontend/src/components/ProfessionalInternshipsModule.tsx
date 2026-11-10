import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  Users,
  Search,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Edit,
  Trash2,
  Eye,
  Building,
  GraduationCap,
  ShieldCheck,
  FileCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Award,
  ChevronRight,
  X,
  FileText
} from 'lucide-react';
import Swal from 'sweetalert2';

export interface InternshipEnrollment {
  id: string;
  student_id: string;
  period: string;
  enrollment_number: string;
  enrollment_date: string;
  status: 'Matriculado' | 'En Curso' | 'Finalizada' | 'Aprobada' | 'Reprobada' | 'Suspendida';
  modality: string;
  required_hours: number;
  completed_hours: number;
  start_date: string | null;
  end_date: string | null;
  schedule_shift: string;
  company_name: string | null;
  company_rut: string | null;
  company_address: string | null;
  company_commune: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_mentor_name: string | null;
  company_mentor_position: string | null;
  company_mentor_phone: string | null;
  company_mentor_email: string | null;
  school_tutor_teacher: string | null;
  final_grade: number | null;
  has_signed_agreement: boolean;
  has_school_insurance: boolean;
  has_practice_plan: boolean;
  has_final_evaluation: boolean;
  has_student_report: boolean;
  observations: string | null;
  created_at?: string;
  updated_at?: string;
  student_run: string;
  student_name: string;
  course_name: string;
  letra_curso?: string;
  student_phone?: string;
  student_email?: string;
  student_address?: string;
  student_commune?: string;
  guardian_name?: string;
  guardian_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profesor_jefe?: string;
  specialty: string;
}

export interface CandidateStudent {
  id: string;
  run: string;
  full_name: string;
  desc_grado: string;
  letra_curso: string;
  phone: string;
  email: string;
  address: string;
  commune: string;
  guardian_name: string;
  guardian_phone: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profesor_jefe: string;
  specialty: string;
  is_enrolled: boolean;
  enrollment_id: string | null;
  enrollment_number: string | null;
  enrollment_status: string | null;
  company_name: string | null;
}

export interface InternshipStats {
  period: string;
  total_4medio: number;
  by_specialty: {
    mecanica: number;
    parvulos: number;
  };
  total_enrolled: number;
  by_status: Record<string, number>;
  with_signed_agreement: number;
  with_school_insurance: number;
  with_practice_plan: number;
}

interface ProfessionalInternshipsModuleProps {
  token: string;
  currentUser?: any;
}

export const ProfessionalInternshipsModule: React.FC<ProfessionalInternshipsModuleProps> = ({
  token,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'enrollments' | 'universe'>('enrollments');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026 - 2027');
  const [enrollments, setEnrollments] = useState<InternshipEnrollment[]>([]);
  const [candidates, setCandidates] = useState<CandidateStudent[]>([]);
  const [stats, setStats] = useState<InternshipStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros de la nómina
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal de Matrícula (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEnrollment, setEditingEnrollment] = useState<InternshipEnrollment | null>(null);

  // Modal Ficha Imprimible
  const [printModalEnrollment, setPrintModalEnrollment] = useState<InternshipEnrollment | null>(null);

  // Form State
  const [formStudentId, setFormStudentId] = useState<string>('');
  const [formPeriod, setFormPeriod] = useState<string>('2026 - 2027');
  const [formEnrollmentNumber, setFormEnrollmentNumber] = useState<string>('');
  const [formEnrollmentDate, setFormEnrollmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<string>('Matriculado');
  const [formModality, setFormModality] = useState<string>('Regular / Estival');
  const [formRequiredHours, setFormRequiredHours] = useState<number>(360);
  const [formCompletedHours, setFormCompletedHours] = useState<number>(0);
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formScheduleShift, setFormScheduleShift] = useState<string>('Jornada Completa (Lunes a Viernes)');
  const [formCompanyName, setFormCompanyName] = useState<string>('');
  const [formCompanyRut, setFormCompanyRut] = useState<string>('');
  const [formCompanyAddress, setFormCompanyAddress] = useState<string>('');
  const [formCompanyCommune, setFormCompanyCommune] = useState<string>('Yungay');
  const [formCompanyPhone, setFormCompanyPhone] = useState<string>('');
  const [formCompanyEmail, setFormCompanyEmail] = useState<string>('');
  const [formCompanyMentorName, setFormCompanyMentorName] = useState<string>('');
  const [formCompanyMentorPosition, setFormCompanyMentorPosition] = useState<string>('');
  const [formCompanyMentorPhone, setFormCompanyMentorPhone] = useState<string>('');
  const [formCompanyMentorEmail, setFormCompanyMentorEmail] = useState<string>('');
  const [formSchoolTutorTeacher, setFormSchoolTutorTeacher] = useState<string>('');
  const [formFinalGrade, setFormFinalGrade] = useState<string>('');
  const [formHasSignedAgreement, setFormHasSignedAgreement] = useState<boolean>(false);
  const [formHasSchoolInsurance, setFormHasSchoolInsurance] = useState<boolean>(true);
  const [formHasPracticePlan, setFormHasPracticePlan] = useState<boolean>(false);
  const [formHasFinalEvaluation, setFormHasFinalEvaluation] = useState<boolean>(false);
  const [formHasStudentReport, setFormHasStudentReport] = useState<boolean>(false);
  const [formObservations, setFormObservations] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [resEnrollments, resCandidates, resStats] = await Promise.all([
        fetch(`/api/tp-internships?period=${encodeURIComponent(selectedPeriod)}`, { headers }),
        fetch(`/api/tp-internships/candidates?period=${encodeURIComponent(selectedPeriod)}`, { headers }),
        fetch(`/api/tp-internships/stats?period=${encodeURIComponent(selectedPeriod)}`, { headers })
      ]);

      if (resEnrollments.ok) {
        const data = await resEnrollments.json();
        setEnrollments(Array.isArray(data) ? data : []);
      }

      if (resCandidates.ok) {
        const data = await resCandidates.json();
        setCandidates(Array.isArray(data) ? data : []);
      }

      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error al cargar datos de prácticas:', err);
      Swal.fire('Error', 'No se pudieron cargar los registros de práctica profesional.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  // Alumno seleccionado en el formulario para previsualizar datos vinculados
  const selectedCandidateForForm = useMemo(() => {
    return candidates.find(c => c.id === formStudentId) || null;
  }, [candidates, formStudentId]);

  // Abrir Modal para Nueva Matrícula
  const handleOpenNewModal = (preselectedStudentId?: string) => {
    setEditingEnrollment(null);
    setFormStudentId(preselectedStudentId || '');
    setFormPeriod(selectedPeriod);
    setFormEnrollmentNumber('');
    setFormEnrollmentDate(new Date().toISOString().split('T')[0]);
    setFormStatus('Matriculado');
    setFormModality('Regular / Estival');
    setFormRequiredHours(360);
    setFormCompletedHours(0);
    setFormStartDate('');
    setFormEndDate('');
    setFormScheduleShift('Jornada Completa (Lunes a Viernes)');
    setFormCompanyName('');
    setFormCompanyRut('');
    setFormCompanyAddress('');
    setFormCompanyCommune('Yungay');
    setFormCompanyPhone('');
    setFormCompanyEmail('');
    setFormCompanyMentorName('');
    setFormCompanyMentorPosition('');
    setFormCompanyMentorPhone('');
    setFormCompanyMentorEmail('');
    setFormSchoolTutorTeacher('');
    setFormFinalGrade('');
    setFormHasSignedAgreement(false);
    setFormHasSchoolInsurance(true);
    setFormHasPracticePlan(false);
    setFormHasFinalEvaluation(false);
    setFormHasStudentReport(false);
    setFormObservations('');
    setIsModalOpen(true);
  };

  // Abrir Modal para Editar
  const handleOpenEditModal = (enrollment: InternshipEnrollment) => {
    setEditingEnrollment(enrollment);
    setFormStudentId(enrollment.student_id);
    setFormPeriod(enrollment.period || selectedPeriod);
    setFormEnrollmentNumber(enrollment.enrollment_number || '');
    setFormEnrollmentDate(enrollment.enrollment_date ? enrollment.enrollment_date.split('T')[0] : '');
    setFormStatus(enrollment.status || 'Matriculado');
    setFormModality(enrollment.modality || 'Regular / Estival');
    setFormRequiredHours(enrollment.required_hours || 360);
    setFormCompletedHours(enrollment.completed_hours || 0);
    setFormStartDate(enrollment.start_date ? enrollment.start_date.split('T')[0] : '');
    setFormEndDate(enrollment.end_date ? enrollment.end_date.split('T')[0] : '');
    setFormScheduleShift(enrollment.schedule_shift || 'Jornada Completa');
    setFormCompanyName(enrollment.company_name || '');
    setFormCompanyRut(enrollment.company_rut || '');
    setFormCompanyAddress(enrollment.company_address || '');
    setFormCompanyCommune(enrollment.company_commune || 'Yungay');
    setFormCompanyPhone(enrollment.company_phone || '');
    setFormCompanyEmail(enrollment.company_email || '');
    setFormCompanyMentorName(enrollment.company_mentor_name || '');
    setFormCompanyMentorPosition(enrollment.company_mentor_position || '');
    setFormCompanyMentorPhone(enrollment.company_mentor_phone || '');
    setFormCompanyMentorEmail(enrollment.company_mentor_email || '');
    setFormSchoolTutorTeacher(enrollment.school_tutor_teacher || '');
    setFormFinalGrade(enrollment.final_grade !== null && enrollment.final_grade !== undefined ? String(enrollment.final_grade) : '');
    setFormHasSignedAgreement(Boolean(enrollment.has_signed_agreement));
    setFormHasSchoolInsurance(enrollment.has_school_insurance !== undefined ? Boolean(enrollment.has_school_insurance) : true);
    setFormHasPracticePlan(Boolean(enrollment.has_practice_plan));
    setFormHasFinalEvaluation(Boolean(enrollment.has_final_evaluation));
    setFormHasStudentReport(Boolean(enrollment.has_student_report));
    setFormObservations(enrollment.observations || '');
    setIsModalOpen(true);
  };

  // Guardar Matrícula
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId) {
      Swal.fire('Atención', 'Debe seleccionar un estudiante de 4° Medio.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        student_id: formStudentId,
        period: formPeriod,
        enrollment_number: formEnrollmentNumber,
        enrollment_date: formEnrollmentDate,
        status: formStatus,
        modality: formModality,
        required_hours: formRequiredHours,
        completed_hours: formCompletedHours,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        schedule_shift: formScheduleShift,
        company_name: formCompanyName,
        company_rut: formCompanyRut,
        company_address: formCompanyAddress,
        company_commune: formCompanyCommune,
        company_phone: formCompanyPhone,
        company_email: formCompanyEmail,
        company_mentor_name: formCompanyMentorName,
        company_mentor_position: formCompanyMentorPosition,
        company_mentor_phone: formCompanyMentorPhone,
        company_mentor_email: formCompanyMentorEmail,
        school_tutor_teacher: formSchoolTutorTeacher,
        final_grade: formFinalGrade !== '' ? parseFloat(formFinalGrade) : null,
        has_signed_agreement: formHasSignedAgreement,
        has_school_insurance: formHasSchoolInsurance,
        has_practice_plan: formHasPracticePlan,
        has_final_evaluation: formHasFinalEvaluation,
        has_student_report: formHasStudentReport,
        observations: formObservations
      };

      const url = editingEnrollment
        ? `/api/tp-internships/${editingEnrollment.id}`
        : '/api/tp-internships';
      const method = editingEnrollment ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar');
      }

      Swal.fire({
        icon: 'success',
        title: editingEnrollment ? '¡Matrícula Actualizada!' : '¡Matrícula Registrada!',
        text: data.message || 'La matrícula de práctica se guardó con éxito.',
        timer: 2000,
        showConfirmButton: false
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Error al guardar matrícula:', err);
      Swal.fire('Error', err.message || 'No se pudo guardar la matrícula.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Matrícula
  const handleDelete = async (enrollment: InternshipEnrollment) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar matrícula de práctica?',
      html: `¿Está seguro de eliminar el registro de práctica de <strong>${enrollment.student_name}</strong>?<br/><br/><small style="color: #64748b;">Nota: Los datos del estudiante en el liceo NO se eliminarán.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/tp-internships/${enrollment.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al eliminar');
        Swal.fire('Eliminada', 'La matrícula de práctica ha sido eliminada.', 'success');
        loadData();
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la matrícula.', 'error');
      }
    }
  };

  // Filtrado de la nómina de matrículas
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(e => {
      const matchSearch =
        !searchTerm.trim() ||
        (e.student_name && e.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.student_run && e.student_run.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.enrollment_number && e.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.company_name && e.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.school_tutor_teacher && e.school_tutor_teacher.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSpecialty =
        specialtyFilter === 'all' ||
        (specialtyFilter === 'mecanica' && e.specialty === 'Mecánica Industrial') ||
        (specialtyFilter === 'parvulos' && e.specialty === 'Atención de Párvulos');

      const matchStatus = statusFilter === 'all' || e.status === statusFilter;

      return matchSearch && matchSpecialty && matchStatus;
    });
  }, [enrollments, searchTerm, specialtyFilter, statusFilter]);

  // Exportar a Excel / CSV con BOM
  const handleExportCSV = () => {
    if (enrollments.length === 0) {
      Swal.fire('Aviso', 'No hay registros de matrícula para exportar.', 'info');
      return;
    }

    const headers = [
      'Folio Matrícula',
      'Período',
      'RUN Estudiante',
      'Nombre Completo',
      'Especialidad TP',
      'Curso',
      'Teléfono Alumno',
      'Email Alumno',
      'Apoderado',
      'Teléfono Apoderado',
      'Empresa / Centro Práctica',
      'RUT Empresa',
      'Dirección Empresa',
      'Comuna Empresa',
      'Maestro Guía',
      'Cargo Maestro Guía',
      'Teléfono Maestro Guía',
      'Email Maestro Guía',
      'Profesor Tutor Liceo',
      'Modalidad',
      'Horas Requeridas',
      'Horas Completadas',
      'Fecha Inicio',
      'Fecha Fin',
      'Estado',
      'Nota Final',
      'Convenio Firmado',
      'Seguro Escolar D.S. 313',
      'Plan Práctica',
      'Evaluación Final',
      'Informe Memoria',
      'Observaciones'
    ];

    const rows = enrollments.map(e => [
      `"${e.enrollment_number || ''}"`,
      `"${e.period || ''}"`,
      `"${e.student_run || ''}"`,
      `"${(e.student_name || '').replace(/"/g, '""')}"`,
      `"${e.specialty || ''}"`,
      `"${e.course_name || ''}"`,
      `"${e.student_phone || ''}"`,
      `"${e.student_email || ''}"`,
      `"${(e.guardian_name || '').replace(/"/g, '""')}"`,
      `"${e.guardian_phone || ''}"`,
      `"${(e.company_name || '').replace(/"/g, '""')}"`,
      `"${e.company_rut || ''}"`,
      `"${(e.company_address || '').replace(/"/g, '""')}"`,
      `"${e.company_commune || ''}"`,
      `"${(e.company_mentor_name || '').replace(/"/g, '""')}"`,
      `"${(e.company_mentor_position || '').replace(/"/g, '""')}"`,
      `"${e.company_mentor_phone || ''}"`,
      `"${e.company_mentor_email || ''}"`,
      `"${(e.school_tutor_teacher || '').replace(/"/g, '""')}"`,
      `"${e.modality || ''}"`,
      e.required_hours || 360,
      e.completed_hours || 0,
      `"${e.start_date ? e.start_date.split('T')[0] : ''}"`,
      `"${e.end_date ? e.end_date.split('T')[0] : ''}"`,
      `"${e.status || ''}"`,
      e.final_grade !== null && e.final_grade !== undefined ? e.final_grade : '',
      e.has_signed_agreement ? 'SÍ' : 'NO',
      e.has_school_insurance ? 'SÍ' : 'NO',
      e.has_practice_plan ? 'SÍ' : 'NO',
      e.has_final_evaluation ? 'SÍ' : 'NO',
      e.has_student_report ? 'SÍ' : 'NO',
      `"${(e.observations || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Matriculas_Practica_Profesional_TP_${selectedPeriod.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Matriculado':
        return <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Matriculado</span>;
      case 'En Curso':
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>En Curso</span>;
      case 'Finalizada':
        return <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Finalizada</span>;
      case 'Aprobada':
        return <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Aprobada</span>;
      case 'Reprobada':
        return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Reprobada</span>;
      case 'Suspendida':
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Suspendida</span>;
      default:
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '1.25rem', maxWidth: '1440px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* HEADER PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#4f46e5', color: '#ffffff', padding: '0.55rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Matrículas de Práctica Profesional TP (4° Medio)
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                Liceo Bicentenario Polivalente Enrique Kirberg Baltiansky · Gestión Oficial de Prácticas y Centros Formativos
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES SUPERIORES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
            <Calendar size={16} color="#64748b" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Período:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="2026 - 2027">2026 - 2027 (Oficial)</option>
              <option value="2025 - 2026">2025 - 2026</option>
              <option value="2027 - 2028">2027 - 2028</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer'
            }}
            title="Exportar nómina a Excel / CSV"
          >
            <FileSpreadsheet size={16} color="#059669" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.75rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
            title="Refrescar datos"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={() => handleOpenNewModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              background: '#4f46e5',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
            }}
          >
            <Plus size={16} />
            <span>Nueva Matrícula</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Universo 4° Medio TP</span>
            <Users size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            {stats?.total_4medio ?? candidates.length ?? 38} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>alumnos</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            23 Mecánica · 15 Párvulos
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Matriculados en Práctica</span>
            <UserCheck size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>
            {stats?.total_enrolled ?? enrollments.length}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginLeft: '0.4rem' }}>
              ({(stats?.total_4medio || candidates.length || 38) > 0 ? Math.round(((stats?.total_enrolled ?? enrollments.length) / (stats?.total_4medio || candidates.length || 38)) * 100) : 0}%)
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Registrados con Folio Oficial
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>En Curso / En Desarrollo</span>
            <Clock size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706' }}>
            {stats?.by_status?.['En Curso'] ?? enrollments.filter(e => e.status === 'En Curso').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Cumpliendo 360 horas
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Aprobadas / Titulables</span>
            <Award size={18} color="#4338ca" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4338ca' }}>
            {((stats?.by_status?.['Aprobada'] ?? 0) + (stats?.by_status?.['Finalizada'] ?? 0)) || enrollments.filter(e => e.status === 'Aprobada' || e.status === 'Finalizada').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Listos para titulación
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Seguro Escolar D.S. 313</span>
            <ShieldCheck size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7' }}>
            {stats?.with_school_insurance ?? enrollments.filter(e => e.has_school_insurance).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Cobertura Legal MINEDUC
          </div>
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem', gap: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('enrollments')}
          style={{
            padding: '0.65rem 0.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'enrollments' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
            color: activeTab === 'enrollments' ? '#4f46e5' : '#64748b',
            fontWeight: activeTab === 'enrollments' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Briefcase size={18} />
          <span>Nómina de Matrículas ({enrollments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('universe')}
          style={{
            padding: '0.65rem 0.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'universe' ? '2.5px solid #4f46e5' : '2.5px solid transparent',
            color: activeTab === 'universe' ? '#4f46e5' : '#64748b',
            fontWeight: activeTab === 'universe' ? 700 : 500,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <GraduationCap size={18} />
          <span>Universo Estudiantes 4° Medio ({candidates.length})</span>
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: NÓMINA DE MATRÍCULAS */}
      {activeTab === 'enrollments' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem' }}>
          {/* BARRA DE FILTROS */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar por estudiante, RUN, folio, empresa o profesor tutor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.1rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              <option value="all">Todas las Especialidades</option>
              <option value="mecanica">Mecánica Industrial</option>
              <option value="parvulos">Atención de Párvulos</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: '#ffffff',
                color: '#334155'
              }}
            >
              <option value="all">Todos los Estados</option>
              <option value="Matriculado">Matriculado</option>
              <option value="En Curso">En Curso</option>
              <option value="Finalizada">Finalizada</option>
              <option value="Aprobada">Aprobada</option>
              <option value="Reprobada">Reprobada</option>
              <option value="Suspendida">Suspendida</option>
            </select>
          </div>

          {/* TABLA DE NÓMINA */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Cargando matrículas de práctica...
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
              <Briefcase size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#334155' }}>
                No se encontraron matrículas de práctica registradas.
              </div>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 1rem 0' }}>
                {enrollments.length === 0
                  ? 'Inicie matriculando a los estudiantes de 4° Medio en la pestaña "Universo Estudiantes" o con el botón superior.'
                  : 'No hay resultados que coincidan con los filtros aplicados.'}
              </p>
              {enrollments.length === 0 && (
                <button
                  onClick={() => handleOpenNewModal()}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Registrar Primera Matrícula
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Folio / Fecha</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Estudiante (4° Medio)</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Especialidad TP</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Empresa & Maestro Guía</th>
                    <th style={{ padding: '0.75rem 0.6rem', minWidth: '130px' }}>Progreso Horas</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Fechas</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Doc. MINEDUC</th>
                    <th style={{ padding: '0.75rem 0.6rem' }}>Estado</th>
                    <th style={{ padding: '0.75rem 0.6rem', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.map((item) => {
                    const percent = item.required_hours > 0
                      ? Math.min(100, Math.round(((item.completed_hours || 0) / item.required_hours) * 100))
                      : 0;

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                        <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#4f46e5' }}>{item.enrollment_number || 'S/N'}</strong>
                          <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                            {item.enrollment_date ? item.enrollment_date.split('T')[0] : '—'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            RUN: {item.student_run} {item.student_phone ? `· 📞 ${item.student_phone}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              background: item.specialty === 'Mecánica Industrial' ? '#f0fdf4' : '#fdf2f8',
                              color: item.specialty === 'Mecánica Industrial' ? '#166534' : '#9d174d',
                              border: item.specialty === 'Mecánica Industrial' ? '1px solid #bbf7d0' : '1px solid #fbcfe8'
                            }}
                          >
                            {item.specialty}
                          </span>
                          <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {item.course_name}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {item.company_name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Empresa por asignar</span>}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                            {item.company_commune ? `${item.company_commune} · ` : ''}
                            {item.company_mentor_name ? `Guía: ${item.company_mentor_name}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', marginBottom: '0.2rem' }}>
                            <span><strong>{item.completed_hours || 0}</strong> / {item.required_hours || 360} hrs</span>
                            <span>{percent}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: percent >= 100 ? '#10b981' : '#4f46e5' }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem', whiteSpace: 'nowrap', fontSize: '0.725rem' }}>
                          <div>Ini: {item.start_date ? item.start_date.split('T')[0] : '—'}</div>
                          <div>Fin: {item.end_date ? item.end_date.split('T')[0] : '—'}</div>
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span
                              title={item.has_school_insurance ? 'Seguro Escolar D.S. 313 Activo' : 'Sin Seguro Escolar'}
                              style={{
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                background: item.has_school_insurance ? '#e0f2fe' : '#fee2e2',
                                color: item.has_school_insurance ? '#0369a1' : '#991b1b'
                              }}
                            >
                              D.S. 313
                            </span>
                            <span
                              title={item.has_signed_agreement ? 'Convenio de Práctica Firmado' : 'Convenio Pendiente de Firma'}
                              style={{
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                background: item.has_signed_agreement ? '#dcfce7' : '#f1f5f9',
                                color: item.has_signed_agreement ? '#15803d' : '#64748b'
                              }}
                            >
                              Convenio
                            </span>
                            <span
                              title={item.has_practice_plan ? 'Plan de Práctica Aprobado' : 'Plan Pendiente'}
                              style={{
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                background: item.has_practice_plan ? '#fef3c7' : '#f1f5f9',
                                color: item.has_practice_plan ? '#b45309' : '#64748b'
                              }}
                            >
                              Plan
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem' }}>
                          {getStatusBadge(item.status)}
                          {item.final_grade && (
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginTop: '0.2rem' }}>
                              Nota: {item.final_grade}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.6rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                            <button
                              onClick={() => setPrintModalEnrollment(item)}
                              title="Ver / Imprimir Ficha Oficial de Práctica"
                              style={{
                                padding: '0.35rem 0.5rem',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#1e293b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Printer size={14} color="#4f46e5" />
                              <span style={{ fontSize: '0.725rem', fontWeight: 600 }}>Ficha</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Editar Matrícula"
                              style={{
                                padding: '0.35rem 0.45rem',
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#334155',
                                cursor: 'pointer'
                              }}
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              onClick={() => handleDelete(item)}
                              title="Eliminar Matrícula"
                              style={{
                                padding: '0.35rem 0.45rem',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                color: '#dc2626',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: UNIVERSO ESTUDIANTES 4° MEDIO */}
      {activeTab === 'universe' && (
        <div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#475569' }}>
            <strong>Nómina Oficial de 4° Medio TP:</strong> Se muestran los <strong>{candidates.length} estudiantes</strong> matriculados en 4° Medio en la base de datos oficial. Puede matricular directamente a cada alumno con el botón <strong>"Matricular en Práctica"</strong> sin duplicar RUN ni datos personales.
          </div>

          {/* GRUPO 1: MECÁNICA INDUSTRIAL */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={18} />
                  4° Medio Industrial (Mecánica Industrial) A
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Profesor(a) Jefe: Patricia Soledad Chandía Sáez · Matrícula Curso: {candidates.filter(c => c.desc_grado.includes('Mecánica')).length} alumnos
                </p>
              </div>

              <span style={{ fontSize: '0.8rem', fontWeight: 700, background: '#dcfce7', color: '#166534', padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
                {candidates.filter(c => c.desc_grado.includes('Mecánica') && c.is_enrolled).length} / {candidates.filter(c => c.desc_grado.includes('Mecánica')).length} Matriculados
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
              {candidates
                .filter(c => c.desc_grado.includes('Mecánica'))
                .map((student, idx) => (
                  <div
                    key={student.id}
                    style={{
                      border: student.is_enrolled ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      background: student.is_enrolled ? '#f0fdf4' : '#ffffff',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>#{idx + 1}</span>
                        {student.is_enrolled ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {student.enrollment_number} ({student.enrollment_status})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            Pendiente Matrícula
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginTop: '0.25rem' }}>
                        {student.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        RUN: <strong>{student.run}</strong>
                        {student.phone ? ` · 📞 ${student.phone}` : ''}
                      </div>
                      {student.guardian_name && (
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Apoderado: {student.guardian_name} {student.guardian_phone ? `(${student.guardian_phone})` : ''}
                        </div>
                      )}
                      {student.company_name && (
                        <div style={{ fontSize: '0.725rem', color: '#15803d', fontWeight: 600, marginTop: '0.25rem' }}>
                          🏢 Empresa: {student.company_name}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.35rem' }}>
                      {student.is_enrolled ? (
                        <button
                          onClick={() => {
                            const found = enrollments.find(e => e.id === student.enrollment_id);
                            if (found) setPrintModalEnrollment(found);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.65rem',
                            background: '#ffffff',
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#15803d',
                            cursor: 'pointer'
                          }}
                        >
                          <Printer size={13} />
                          <span>Ver Ficha</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenNewModal(student.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.75rem',
                            background: '#4f46e5',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={13} />
                          <span>Matricular en Práctica</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* GRUPO 2: ATENCIÓN DE PÁRVULOS */}
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#9d174d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={18} />
                  4° Medio Técnico Niños (Atención de Párvulos) A
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Profesor(a) Jefe: Bárbara Alejandra Pereira López · Matrícula Curso: {candidates.filter(c => c.desc_grado.includes('Párvulo') || c.desc_grado.includes('Niños')).length} alumnos
                </p>
              </div>

              <span style={{ fontSize: '0.8rem', fontWeight: 700, background: '#fce7f3', color: '#9d174d', padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
                {candidates.filter(c => (c.desc_grado.includes('Párvulo') || c.desc_grado.includes('Niños')) && c.is_enrolled).length} / {candidates.filter(c => c.desc_grado.includes('Párvulo') || c.desc_grado.includes('Niños')).length} Matriculados
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
              {candidates
                .filter(c => c.desc_grado.includes('Párvulo') || c.desc_grado.includes('Niños'))
                .map((student, idx) => (
                  <div
                    key={student.id}
                    style={{
                      border: student.is_enrolled ? '1.5px solid #f472b6' : '1px solid #e2e8f0',
                      background: student.is_enrolled ? '#fdf2f8' : '#ffffff',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>#{idx + 1}</span>
                        {student.is_enrolled ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9d174d', background: '#fce7f3', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {student.enrollment_number} ({student.enrollment_status})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            Pendiente Matrícula
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', marginTop: '0.25rem' }}>
                        {student.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        RUN: <strong>{student.run}</strong>
                        {student.phone ? ` · 📞 ${student.phone}` : ''}
                      </div>
                      {student.guardian_name && (
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Apoderado: {student.guardian_name} {student.guardian_phone ? `(${student.guardian_phone})` : ''}
                        </div>
                      )}
                      {student.company_name && (
                        <div style={{ fontSize: '0.725rem', color: '#9d174d', fontWeight: 600, marginTop: '0.25rem' }}>
                          🏢 Centro: {student.company_name}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', marginTop: '0.35rem' }}>
                      {student.is_enrolled ? (
                        <button
                          onClick={() => {
                            const found = enrollments.find(e => e.id === student.enrollment_id);
                            if (found) setPrintModalEnrollment(found);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.65rem',
                            background: '#ffffff',
                            border: '1px solid #f472b6',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#9d174d',
                            cursor: 'pointer'
                          }}
                        >
                          <Printer size={13} />
                          <span>Ver Ficha</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenNewModal(student.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.75rem',
                            background: '#4f46e5',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={13} />
                          <span>Matricular en Práctica</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE MATRÍCULA (CREAR / EDITAR) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px'
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  {editingEnrollment ? 'Editar Matrícula de Práctica TP' : 'Nueva Matrícula de Práctica Profesional TP'}
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Período Oficial {formPeriod} · Liceo Bicentenario Polivalente Enrique Kirberg
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} style={{ padding: '1.25rem' }}>
              {/* SECCIÓN 1: ESTUDIANTE */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <GraduationCap size={16} color="#4f46e5" />
                  1. Antecedentes del Estudiante (4° Medio TP)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' }}>
                      Estudiante *
                    </label>
                    <select
                      value={formStudentId}
                      onChange={(e) => setFormStudentId(e.target.value)}
                      disabled={Boolean(editingEnrollment)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="">-- Seleccionar Alumno de 4° Medio --</option>
                      {candidates.map((c) => (
                        <option key={c.id} value={c.id} disabled={c.is_enrolled && (!editingEnrollment || editingEnrollment.student_id !== c.id)}>
                          {c.full_name} ({c.run}) - {c.desc_grado.includes('Mecánica') ? 'Mecánica Ind.' : 'Párvulos'}
                          {c.is_enrolled && (!editingEnrollment || editingEnrollment.student_id !== c.id) ? ' (Ya matriculado)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCandidateForForm && (
                    <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569' }}>
                      <div><strong>RUN:</strong> {selectedCandidateForForm.run}</div>
                      <div><strong>Especialidad:</strong> {selectedCandidateForForm.specialty}</div>
                      <div><strong>Curso:</strong> {selectedCandidateForForm.desc_grado}</div>
                      <div><strong>Prof. Jefe:</strong> {selectedCandidateForForm.profesor_jefe || '—'}</div>
                      <div><strong>Apoderado:</strong> {selectedCandidateForForm.guardian_name || '—'} ({selectedCandidateForForm.guardian_phone || 'Sin fono'})</div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 2: EMPRESA Y CENTRO DE PRÁCTICA */}
              <div style={{ marginBottom: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building size={16} color="#059669" />
                  2. Datos del Centro de Práctica / Empresa
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Razón Social / Empresa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Maestranza Biobío SpA / Jardín Campanita"
                      value={formCompanyName}
                      onChange={(e) => setFormCompanyName(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      RUT Empresa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 76.123.456-7"
                      value={formCompanyRut}
                      onChange={(e) => setFormCompanyRut(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Dirección Empresa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Av. Principal #120"
                      value={formCompanyAddress}
                      onChange={(e) => setFormCompanyAddress(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Comuna
                    </label>
                    <input
                      type="text"
                      placeholder="Yungay, Chillán, Cabrero..."
                      value={formCompanyCommune}
                      onChange={(e) => setFormCompanyCommune(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Teléfono Empresa
                    </label>
                    <input
                      type="text"
                      placeholder="+56 9 1234 5678"
                      value={formCompanyPhone}
                      onChange={(e) => setFormCompanyPhone(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Correo Empresa
                    </label>
                    <input
                      type="email"
                      placeholder="contacto@empresa.cl"
                      value={formCompanyEmail}
                      onChange={(e) => setFormCompanyEmail(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* MAESTRO GUÍA */}
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                    Maestro Guía (Supervisor del Alumno en la Empresa)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', marginBottom: '0.15rem' }}>Nombre Maestro Guía</label>
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={formCompanyMentorName}
                        onChange={(e) => setFormCompanyMentorName(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', marginBottom: '0.15rem' }}>Cargo / Rol</label>
                      <input
                        type="text"
                        placeholder="Jefe de Taller / Educadora"
                        value={formCompanyMentorPosition}
                        onChange={(e) => setFormCompanyMentorPosition(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', marginBottom: '0.15rem' }}>Teléfono Maestro Guía</label>
                      <input
                        type="text"
                        placeholder="+56 9 ..."
                        value={formCompanyMentorPhone}
                        onChange={(e) => setFormCompanyMentorPhone(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', marginBottom: '0.15rem' }}>Email Maestro Guía</label>
                      <input
                        type="email"
                        placeholder="supervisor@empresa.cl"
                        value={formCompanyMentorEmail}
                        onChange={(e) => setFormCompanyMentorEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: CONDICIONES, HORAS Y FECHAS */}
              <div style={{ marginBottom: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} color="#d97706" />
                  3. Condiciones de la Práctica & Cronograma
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Período
                    </label>
                    <input
                      type="text"
                      value={formPeriod}
                      onChange={(e) => setFormPeriod(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Folio Matrícula
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-generado (ej: PRAC-26-001)"
                      value={formEnrollmentNumber}
                      onChange={(e) => setFormEnrollmentNumber(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Modalidad
                    </label>
                    <select
                      value={formModality}
                      onChange={(e) => setFormModality(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    >
                      <option value="Regular / Estival">Regular / Estival (Ene - Mar)</option>
                      <option value="Durante Año Escolar">Durante Año Escolar (Alternada)</option>
                      <option value="Dual / Continuada">Dual / Continuada</option>
                      <option value="Extensión Horaria">Extensión Horaria</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Horas Requeridas
                    </label>
                    <input
                      type="number"
                      value={formRequiredHours}
                      onChange={(e) => setFormRequiredHours(parseInt(e.target.value, 10) || 360)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Horas Completadas
                    </label>
                    <input
                      type="number"
                      value={formCompletedHours}
                      onChange={(e) => setFormCompletedHours(parseInt(e.target.value, 10) || 0)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Fecha Término
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Profesor Tutor Liceo
                    </label>
                    <input
                      type="text"
                      placeholder="Docente supervisor del liceo"
                      value={formSchoolTutorTeacher}
                      onChange={(e) => setFormSchoolTutorTeacher(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: DOCUMENTACIÓN, SEGURO Y EVALUACIÓN */}
              <div style={{ marginBottom: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.6rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={16} color="#0284c7" />
                  4. Control Documental MINEDUC & Evaluación
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#1e293b', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formHasSchoolInsurance}
                      onChange={(e) => setFormHasSchoolInsurance(e.target.checked)}
                    />
                    <strong>Seguro Escolar D.S. N° 313 Activo</strong>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#1e293b', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formHasSignedAgreement}
                      onChange={(e) => setFormHasSignedAgreement(e.target.checked)}
                    />
                    <span>Convenio Tripartito Firmado</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#1e293b', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formHasPracticePlan}
                      onChange={(e) => setFormHasPracticePlan(e.target.checked)}
                    />
                    <span>Plan de Práctica Aprobado</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#1e293b', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formHasFinalEvaluation}
                      onChange={(e) => setFormHasFinalEvaluation(e.target.checked)}
                    />
                    <span>Pauta Evaluación Empresa</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#1e293b', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formHasStudentReport}
                      onChange={(e) => setFormHasStudentReport(e.target.checked)}
                    />
                    <span>Informe / Memoria del Alumno</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Estado de la Práctica
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    >
                      <option value="Matriculado">Matriculado</option>
                      <option value="En Curso">En Curso</option>
                      <option value="Finalizada">Finalizada</option>
                      <option value="Aprobada">Aprobada</option>
                      <option value="Reprobada">Reprobada</option>
                      <option value="Suspendida">Suspendida</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                      Calificación Final (1.0 a 7.0)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="7.0"
                      placeholder="Ej: 6.8"
                      value={formFinalGrade}
                      onChange={(e) => setFormFinalGrade(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                    Observaciones y Acuerdos
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre el centro, condiciones especiales, turno, etc."
                    value={formObservations}
                    onChange={(e) => setFormObservations(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#4f46e5',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {saving ? 'Guardando...' : editingEnrollment ? 'Guardar Cambios' : 'Confirmar Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FICHA OFICIAL IMPRIMIBLE DE MATRÍCULA DE PRÁCTICA TP */}
      {/* ========================================================================= */}
      {printModalEnrollment && (
        <PrintInternshipCardModal
          enrollment={printModalEnrollment}
          onClose={() => setPrintModalEnrollment(null)}
        />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTE: FICHA OFICIAL IMPRIMIBLE (PORTAL & CSS @media print)
// =============================================================================
interface PrintInternshipCardModalProps {
  enrollment: InternshipEnrollment;
  onClose: () => void;
}

const PrintInternshipCardModal: React.FC<PrintInternshipCardModalProps> = ({
  enrollment,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div
      className="print-internship-modal-portal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      {/* ESTILOS DE IMPRESIÓN OFICIALES */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 8mm 8mm 8mm 8mm;
          }

          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #root,
          #root * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }

          body > *:not(.print-internship-modal-portal) {
            display: none !important;
            visibility: hidden !important;
          }

          .print-internship-modal-portal,
          .print-internship-modal-portal * {
            visibility: visible !important;
          }

          .print-internship-modal-portal {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 99999999 !important;
            overflow: visible !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .printable-card-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div
        className="printable-card-sheet"
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '1.75rem',
          boxSizing: 'border-box',
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        {/* BARRA SUPERIOR (SOLO PANTALLA) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '1.5px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#4f46e5" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
              Vista Previa Ficha de Matrícula de Práctica
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 1rem',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} />
              <span>Imprimir Ficha</span>
            </button>

            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.85rem',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* DOCUMENTO OFICIAL A IMPRIMIR */}
        <div style={{ border: '2px solid #0f172a', padding: '1.25rem', borderRadius: '4px' }}>
          {/* MEMBRETE OFICIAL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#1e293b' }}>
                REPÚBLICA DE CHILE · MINISTERIO DE EDUCACIÓN
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                LICEO BICENTENARIO POLIVALENTE ENRIQUE KIRBERG BALTIANSKY
              </div>
              <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                RBD: 11462-6 · Comuna de Yungay · Región de Ñuble
              </div>
              <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                Área Técnico-Profesional · Formación por Alternancia y Centros de Práctica
              </div>
            </div>

            <div style={{ textAlign: 'right', border: '1.5px solid #0f172a', padding: '0.35rem 0.65rem', borderRadius: '4px', background: '#f8fafc' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>FOLIO MATRÍCULA</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4f46e5' }}>
                {enrollment.enrollment_number || 'PRAC-26-S/N'}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0f172a' }}>
                PERÍODO: {enrollment.period || '2026 - 2027'}
              </div>
            </div>
          </div>

          {/* TÍTULO PRINCIPAL */}
          <div style={{ textAlign: 'center', marginBottom: '1rem', background: '#0f172a', color: '#ffffff', padding: '0.35rem', borderRadius: '2px' }}>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              FICHA DE MATRÍCULA Y REGISTRO OFICIAL DE PRÁCTICA PROFESIONAL TP
            </h2>
          </div>

          {/* I. ANTECEDENTES DEL ESTUDIANTE */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.775rem', borderLeft: '4px solid #4f46e5', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              I. Antecedentes del Estudiante
            </div>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.25rem', width: '20%', fontWeight: 700 }}>Nombre Completo:</td>
                  <td style={{ padding: '0.25rem', width: '45%' }}>{enrollment.student_name}</td>
                  <td style={{ padding: '0.25rem', width: '15%', fontWeight: 700 }}>RUN:</td>
                  <td style={{ padding: '0.25rem', width: '20%' }}>{enrollment.student_run}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Especialidad TP:</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700, color: '#1e40af' }}>{enrollment.specialty}</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Curso:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.course_name}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Teléfono / Celular:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.student_phone || 'No registrado'}</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Email:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.student_email || 'No registrado'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Domicilio Alumno:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.student_address || 'Comuna de Yungay'}</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Apoderado(a):</td>
                  <td style={{ padding: '0.25rem' }}>
                    {enrollment.guardian_name || 'No informado'} {enrollment.guardian_phone ? `(${enrollment.guardian_phone})` : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* II. ANTECEDENTES DE LA EMPRESA O CENTRO DE PRÁCTICA */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.775rem', borderLeft: '4px solid #059669', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              II. Antecedentes del Centro de Práctica / Empresa Formadora
            </div>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.25rem', width: '20%', fontWeight: 700 }}>Razón Social:</td>
                  <td style={{ padding: '0.25rem', width: '45%' }}>{enrollment.company_name || 'Por definir'}</td>
                  <td style={{ padding: '0.25rem', width: '15%', fontWeight: 700 }}>RUT Empresa:</td>
                  <td style={{ padding: '0.25rem', width: '20%' }}>{enrollment.company_rut || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Dirección y Comuna:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.company_address || '—'} {enrollment.company_commune ? `(${enrollment.company_commune})` : ''}</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Teléfono:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.company_phone || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Maestro Guía:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.company_mentor_name || 'Por asignar'}</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Cargo Guía:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.company_mentor_position || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Contacto Guía:</td>
                  <td style={{ padding: '0.25rem' }} colSpan={3}>
                    {enrollment.company_mentor_phone ? `Fono: ${enrollment.company_mentor_phone}` : ''}
                    {enrollment.company_mentor_email ? ` · Email: ${enrollment.company_mentor_email}` : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* III. CONDICIONES TÉCNICAS Y CRONOGRAMA */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.775rem', borderLeft: '4px solid #d97706', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              III. Condiciones de la Práctica & Seguro Escolar
            </div>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.25rem', width: '20%', fontWeight: 700 }}>Total Horas Exigidas:</td>
                  <td style={{ padding: '0.25rem', width: '30%', fontWeight: 700 }}>
                    {enrollment.required_hours || 360} Horas Cronológicas
                  </td>
                  <td style={{ padding: '0.25rem', width: '20%', fontWeight: 700 }}>Modalidad:</td>
                  <td style={{ padding: '0.25rem', width: '30%' }}>{enrollment.modality || 'Regular / Estival'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Fecha de Inicio:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.start_date ? enrollment.start_date.split('T')[0] : 'A convenir'}</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Fecha de Término:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.end_date ? enrollment.end_date.split('T')[0] : 'A convenir'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Jornada / Horario:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.schedule_shift || 'Jornada Completa'}</td>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Profesor Tutor Liceo:</td>
                  <td style={{ padding: '0.25rem' }}>{enrollment.school_tutor_teacher || 'Equipo Técnico Profesional LTP'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.25rem', fontWeight: 700 }}>Seguro Escolar:</td>
                  <td style={{ padding: '0.25rem', color: '#0369a1', fontWeight: 700 }} colSpan={3}>
                    Amparado bajo el Decreto Supremo N° 313 de la Ley N° 16.744 sobre Accidentes Escolares (trayecto directo y permanencia en la empresa).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* IV. CONTROL DOCUMENTAL */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', fontWeight: 700, fontSize: '0.775rem', borderLeft: '4px solid #0284c7', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              IV. Registro de Requisitos y Documentación
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', fontSize: '0.725rem' }}>
              <div style={{ border: '1px solid #cbd5e1', padding: '0.35rem', borderRadius: '3px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700 }}>Convenio Tripartito</div>
                <div style={{ color: enrollment.has_signed_agreement ? '#15803d' : '#64748b', fontWeight: 800 }}>
                  {enrollment.has_signed_agreement ? '✓ SUSCRITO' : 'PENDIENTE'}
                </div>
              </div>
              <div style={{ border: '1px solid #cbd5e1', padding: '0.35rem', borderRadius: '3px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700 }}>Plan de Práctica</div>
                <div style={{ color: enrollment.has_practice_plan ? '#15803d' : '#64748b', fontWeight: 800 }}>
                  {enrollment.has_practice_plan ? '✓ APROBADO' : 'PENDIENTE'}
                </div>
              </div>
              <div style={{ border: '1px solid #cbd5e1', padding: '0.35rem', borderRadius: '3px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700 }}>Evaluación Empresa</div>
                <div style={{ color: enrollment.has_final_evaluation ? '#15803d' : '#64748b', fontWeight: 800 }}>
                  {enrollment.has_final_evaluation ? '✓ ENTREGADA' : 'PENDIENTE'}
                </div>
              </div>
              <div style={{ border: '1px solid #cbd5e1', padding: '0.35rem', borderRadius: '3px', textAlign: 'center' }}>
                <div style={{ fontWeight: 700 }}>Nota Final Práctica</div>
                <div style={{ color: enrollment.final_grade ? '#15803d' : '#64748b', fontWeight: 800 }}>
                  {enrollment.final_grade ? `${enrollment.final_grade} / 7.0` : 'PENDIENTE'}
                </div>
              </div>
            </div>
          </div>

          {/* OBSERVACIONES */}
          {enrollment.observations && (
            <div style={{ fontSize: '0.725rem', color: '#334155', background: '#f8fafc', padding: '0.45rem', border: '1px solid #e2e8f0', borderRadius: '3px', marginBottom: '1.25rem' }}>
              <strong>Observaciones:</strong> {enrollment.observations}
            </div>
          )}

          {/* V. FIRMAS OFICIALES TRIPARTITAS */}
          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center', fontSize: '0.7rem', color: '#1e293b' }}>
            <div>
              <div style={{ borderBottom: '1.5px solid #0f172a', height: '40px', marginBottom: '0.35rem' }} />
              <strong>{enrollment.student_name}</strong>
              <div style={{ color: '#64748b' }}>Firma Estudiante en Práctica</div>
            </div>

            <div>
              <div style={{ borderBottom: '1.5px solid #0f172a', height: '40px', marginBottom: '0.35rem' }} />
              <strong>{enrollment.guardian_name || 'Apoderado(a)'}</strong>
              <div style={{ color: '#64748b' }}>Firma y Autorización Apoderado</div>
            </div>

            <div>
              <div style={{ borderBottom: '1.5px solid #0f172a', height: '40px', marginBottom: '0.35rem' }} />
              <strong>{enrollment.company_mentor_name || 'Maestro Guía'}</strong>
              <div style={{ color: '#64748b' }}>Firma y Timbre Empresa</div>
            </div>

            <div>
              <div style={{ borderBottom: '1.5px solid #0f172a', height: '40px', marginBottom: '0.35rem' }} />
              <strong>Encargado(a) TP / Dirección</strong>
              <div style={{ color: '#64748b' }}>LTP Enrique Kirberg</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default ProfessionalInternshipsModule;
