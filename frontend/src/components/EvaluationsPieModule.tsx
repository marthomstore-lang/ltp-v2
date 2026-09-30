import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { BookOpen, Calendar as CalendarIcon, Edit, Trash2, Paperclip, Puzzle, PlusCircle, CheckCircle2, Clock, Eye, Upload, Settings, RefreshCw, X, FileText, Download, AlertTriangle, AlertCircle, Info, ShieldAlert, Users } from 'lucide-react';
import { sortCoursesList } from '../utils/course';
import { CourseSupportModal } from './CourseSupportModal';

export interface EvaluationDeadlineInfo {
  teacherDeadlineDate: string; // DD/MM/YYYY
  teacherDaysRemaining: number;
  teacherStatus: 'uploaded' | 'overdue' | 'warning' | 'ok';
  pieDeadlineDate: string; // DD/MM/YYYY
  pieDaysRemaining: number;
  pieStatus: 'uploaded' | 'waiting_original' | 'overdue' | 'warning' | 'ok';
}

export const getEvaluationDeadlines = (
  evaluationDateStr: string,
  hasOriginal: boolean,
  hasPie: boolean
): EvaluationDeadlineInfo => {
  if (!evaluationDateStr) {
    return {
      teacherDeadlineDate: '-',
      teacherDaysRemaining: 0,
      teacherStatus: hasOriginal ? 'uploaded' : 'ok',
      pieDeadlineDate: '-',
      pieDaysRemaining: 0,
      pieStatus: hasPie ? 'uploaded' : 'ok',
    };
  }

  const parts = evaluationDateStr.split('T')[0].split('-').map(Number);
  const evalDate = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 0, 0, 0);

  // Plazo docente de aula regular: al menos 7 días antes
  const teacherDeadline = new Date(evalDate);
  teacherDeadline.setDate(teacherDeadline.getDate() - 7);

  // Plazo equipo PIE: hasta 3 días antes
  const pieDeadline = new Date(evalDate);
  pieDeadline.setDate(pieDeadline.getDate() - 3);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const teacherDaysRemaining = Math.round((teacherDeadline.getTime() - today.getTime()) / msPerDay);
  const pieDaysRemaining = Math.round((pieDeadline.getTime() - today.getTime()) / msPerDay);

  const formatD = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${mon}/${d.getFullYear()}`;
  };

  let teacherStatus: 'uploaded' | 'overdue' | 'warning' | 'ok' = 'ok';
  if (hasOriginal) {
    teacherStatus = 'uploaded';
  } else if (teacherDaysRemaining < 0) {
    teacherStatus = 'overdue';
  } else if (teacherDaysRemaining <= 2) {
    teacherStatus = 'warning';
  } else {
    teacherStatus = 'ok';
  }

  let pieStatus: 'uploaded' | 'waiting_original' | 'overdue' | 'warning' | 'ok' = 'ok';
  if (hasPie) {
    pieStatus = 'uploaded';
  } else if (!hasOriginal) {
    pieStatus = 'waiting_original';
  } else if (pieDaysRemaining < 0) {
    pieStatus = 'overdue';
  } else if (pieDaysRemaining <= 2) {
    pieStatus = 'warning';
  } else {
    pieStatus = 'ok';
  }

  return {
    teacherDeadlineDate: formatD(teacherDeadline),
    teacherDaysRemaining,
    teacherStatus,
    pieDeadlineDate: formatD(pieDeadline),
    pieDaysRemaining,
    pieStatus,
  };
};

interface EvaluationsPieModuleProps {
  token: string;
  user: any;
}

interface Evaluation {
  id: string;
  created_at: string;
  teacher_name: string;
  teacher_email: string;
  evaluation_title: string;
  course_name: string;
  subject_name: string;
  evaluation_date: string;
  block_label: string;
  status: string;
  original_file_name?: string;
  original_file_url?: string;
  original_uploaded_at?: string;
  pie_file_name?: string;
  pie_file_url?: string;
  pie_teacher_name?: string;
  pie_teacher_email?: string;
  pie_uploaded_at?: string;
  calendar_event_id?: string;
}

const DEFAULT_COURSES: string[] = [];
const DEFAULT_SUBJECTS: string[] = [];

const BLOCKS = [
  "1° Bloque (08:30 - 10:00)",
  "2° Bloque (10:20 - 11:50)",
  "3° Bloque (12:05 - 13:35)",
  "4° Bloque (14:20 - 15:50)",
  "5° Bloque (16:00 - 17:30)"
];

export const EvaluationsPieModule: React.FC<EvaluationsPieModuleProps> = ({ token, user }) => {
  const [activeTab, setActiveTab] = useState<'nueva' | 'calendario' | 'modificar' | 'pendientes' | 'pie'>('nueva');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>(DEFAULT_COURSES);
  const [subjectsList, setSubjectsList] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(false);

  // Configuraciones de Integración (Desacopladas)
  const [calendarId, setCalendarId] = useState('c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com');
  const [folderOriginalsId, setFolderOriginalsId] = useState('13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3');
  const [folderPieId, setFolderPieId] = useState('1JoE4n5kgVYoXQxqh6XlLLE78thRQlEED');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [calendarKey, setCalendarKey] = useState(Date.now());
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalCourse, setSupportModalCourse] = useState('1° Básico');

  // Formulario Nueva Evaluación
  const [newEvalForm, setNewEvalForm] = useState({
    evaluation_title: '',
    course_name: '',
    subject_name: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    block_label: BLOCKS[0],
    original_file_name: '',
    original_file_url: ''
  });

  // Modal Edición
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);

  // Modal Subir Archivo Pendiente
  const [uploadPendingEval, setUploadPendingEval] = useState<Evaluation | null>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState('');
  const [pendingFileName, setPendingFileName] = useState('');

  // Modal Subir Adecuación PIE
  const [uploadPieEval, setUploadPieEval] = useState<Evaluation | null>(null);
  const [pieFileUrl, setPieFileUrl] = useState('');
  const [pieFileName, setPieFileName] = useState('');

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

  useEffect(() => {
    loadEvaluations();
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

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/evaluations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      if (data && Array.isArray(data.evaluations)) {
        setEvaluations(data.evaluations);
      }
    } catch (err) {
      console.error('Error al cargar evaluaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrationSettings = async () => {
    try {
      const res = await fetch('/api/config/integrations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      if (data && data.settings) {
        if (data.settings.EVALUATIONS_CALENDAR_ID) setCalendarId(data.settings.EVALUATIONS_CALENDAR_ID);
        if (data.settings.DRIVE_FOLDER_ORIGINALS_ID) setFolderOriginalsId(data.settings.DRIVE_FOLDER_ORIGINALS_ID);
        if (data.settings.DRIVE_FOLDER_PIE_ID) setFolderPieId(data.settings.DRIVE_FOLDER_PIE_ID);
      }
      if (!data?.settings?.EVALUATIONS_CALENDAR_ID) {
        fetch('/api/config/institutional-settings', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
          .then(r => r.json())
          .then(instData => {
            if (instData?.calendarId) setCalendarId(instData.calendarId);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error('Error al cargar configuraciones:', err);
    }
  };

  const handleSaveIntegrationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/config/integrations', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          settings: {
            EVALUATIONS_CALENDAR_ID: calendarId.trim(),
            DRIVE_FOLDER_ORIGINALS_ID: folderOriginalsId.trim(),
            DRIVE_FOLDER_PIE_ID: folderPieId.trim()
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowConfigModal(false);
        setCalendarKey(Date.now());
        Swal.fire('Guardado', 'Parámetros de Google Drive y Calendar actualizados.', 'success');
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión.', 'error');
    }
  };

  // 1. REGISTRAR EVALUACIÓN
  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEvalForm.evaluation_title.trim() || !newEvalForm.course_name || !newEvalForm.subject_name) {
      Swal.fire('Atención', 'Por favor completa todos los campos obligatorios.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          ...newEvalForm,
          teacher_name: user?.name || 'Docente de Aula',
          teacher_email: user?.email || 'docente@liceocampanario.cl',
          teacher_run: user?.run || ''
        })
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Evaluación Registrada!', data.message, 'success');
        setNewEvalForm({
          evaluation_title: '',
          course_name: '',
          subject_name: '',
          evaluation_date: new Date().toISOString().split('T')[0],
          block_label: BLOCKS[0],
          original_file_name: '',
          original_file_url: ''
        });
        loadEvaluations();
        setCalendarKey(Date.now());
        setActiveTab('modificar');
      } else {
        Swal.fire('Error', data.error || 'No se pudo registrar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. MODIFICAR EVALUACIÓN
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEval) return;

    try {
      const res = await fetch(`/api/evaluations/${editingEval.id}`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          evaluation_title: editingEval.evaluation_title,
          evaluation_date: editingEval.evaluation_date,
          block_label: editingEval.block_label
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('Modificado', data.message, 'success');
        setEditingEval(null);
        loadEvaluations();
        setCalendarKey(Date.now());
      } else {
        Swal.fire('Error', data.error || 'No se pudo modificar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión.', 'error');
    }
  };

  // 3. ELIMINAR EVALUACIÓN
  const handleDeleteEvaluation = async (ev: Evaluation) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar evaluación?',
      html: `¿Estás seguro de eliminar la evaluación <strong>${ev.evaluation_title}</strong> del <strong>${ev.evaluation_date}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/evaluations/${ev.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Eliminado', data.message, 'success');
          loadEvaluations();
          setCalendarKey(Date.now());
        } else {
          Swal.fire('Error', data.error || 'No se pudo eliminar.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión.', 'error');
      }
    }
  };

  // 4. ADJUNTAR ARCHIVO ORIGINAL PENDIENTE
  const handleSavePendingFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPendingEval || !pendingFileUrl.trim()) {
      Swal.fire('Atención', 'Por favor ingresa la URL o enlace del archivo.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/evaluations/${uploadPendingEval.id}/attach-original`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          file_name: pendingFileName || 'Evaluacion_Original.pdf',
          file_url: pendingFileUrl.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Archivo Adjuntado!', data.message, 'success');
        setUploadPendingEval(null);
        setPendingFileUrl('');
        setPendingFileName('');
        loadEvaluations();
      } else {
        Swal.fire('Error', data.error || 'No se pudo adjuntar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión.', 'error');
    }
  };

  // 5. ADJUNTAR ADECUACIÓN PIE
  const handleSavePieFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPieEval || !pieFileUrl.trim()) {
      Swal.fire('Atención', 'Por favor ingresa la URL o enlace de la adecuación PIE.', 'warning');
      return;
    }

    try {
      const res = await fetch(`/api/evaluations/${uploadPieEval.id}/attach-pie`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          pie_file_name: pieFileName || 'Evaluacion_Adaptada_PIE.pdf',
          pie_file_url: pieFileUrl.trim(),
          pie_teacher_name: user?.name || 'Educador(a) PIE',
          pie_teacher_email: user?.email || 'pie@liceocampanario.cl'
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Adecuación PIE Guardada!', data.message, 'success');
        setUploadPieEval(null);
        setPieFileUrl('');
        setPieFileName('');
        loadEvaluations();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión.', 'error');
    }
  };

  const [filterScope, setFilterScope] = useState<'all' | 'mine'>('all');

  // Filtros
  const myEvaluationsCount = evaluations.filter(ev => ev.teacher_email === user?.email).length;

  const displayedEvaluations = evaluations.filter(ev => {
    if (filterScope === 'mine' && user?.email) {
      return ev.teacher_email === user?.email;
    }
    return true;
  });

  const pendingFilesEvaluations = evaluations.filter(ev => {
    return ev.status === 'Pendiente de Archivo' || !ev.original_file_url;
  });

  // Cálculo de plazos y alertas (7 días docentes regular / 3 días PIE)
  const evalDeadlinesMap = useMemo(() => {
    const map = new Map<string, EvaluationDeadlineInfo>();
    evaluations.forEach(ev => {
      const hasOriginal = Boolean(ev.original_file_url);
      const hasPie = Boolean(ev.pie_file_url) || ev.status === 'Adecuado PIE';
      map.set(ev.id, getEvaluationDeadlines(ev.evaluation_date, hasOriginal, hasPie));
    });
    return map;
  }, [evaluations]);

  const overdueTeacherEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      const info = evalDeadlinesMap.get(ev.id);
      return info?.teacherStatus === 'overdue';
    });
  }, [evaluations, evalDeadlinesMap]);

  const warningTeacherEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      const info = evalDeadlinesMap.get(ev.id);
      return info?.teacherStatus === 'warning';
    });
  }, [evaluations, evalDeadlinesMap]);

  const overduePieEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      const info = evalDeadlinesMap.get(ev.id);
      return info?.pieStatus === 'overdue';
    });
  }, [evaluations, evalDeadlinesMap]);

  const warningPieEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      const info = evalDeadlinesMap.get(ev.id);
      return info?.pieStatus === 'warning';
    });
  }, [evaluations, evalDeadlinesMap]);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* HEADER DE MÓDULO */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BookOpen size={26} color="#4f46e5" /> Portal de Evaluaciones Institucionales & Integración PIE
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Planificación de pruebas, calendarización y flujo de adecuaciones curriculares bajo Decretos 83 y 67.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              loadEvaluations();
              loadSubjects();
              setCalendarKey(Date.now());
            }}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700 }}
          >
            <RefreshCw size={15} /> Actualizar
          </button>

          {(user?.role === 'Admin' || user?.role === 'Director') && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700, gap: '4px' }}
            >
              <Settings size={15} /> Configurar Drive / Calendar
            </button>
          )}
        </div>
      </div>

      {/* BANNER REGLAMENTARIO DE PLAZOS Y ESTADO DE ALERTAS */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
        border: '1px solid #cbd5e1',
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: '#1e1b4b', color: '#ffffff', padding: '0.3rem 0.65rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> PLAZOS DE EVALUACIÓN
            </span>
            <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
              Reglamento Interno de Carga Oportuna de Materiales
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {overdueTeacherEvaluations.length > 0 && (
              <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} /> {overdueTeacherEvaluations.length} {overdueTeacherEvaluations.length === 1 ? 'prueba docente vencida' : 'pruebas docentes vencidas'}
              </span>
            )}
            {warningTeacherEvaluations.length > 0 && (
              <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {warningTeacherEvaluations.length} por vencer docentes (&le;48h)
              </span>
            )}
            {overduePieEvaluations.length > 0 && (
              <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> {overduePieEvaluations.length} {overduePieEvaluations.length === 1 ? 'adecuación PIE vencida' : 'adecuaciones PIE vencidas'}
              </span>
            )}
            {warningPieEvaluations.length > 0 && (
              <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {warningPieEvaluations.length} PIE por vencer (&le;48h)
              </span>
            )}
            {overdueTeacherEvaluations.length === 0 && overduePieEvaluations.length === 0 && (
              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Al día: Sin evaluaciones atrasadas
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
          <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>👨‍🏫</span>
            <div>
              <strong style={{ color: '#0f172a', display: 'block' }}>Docentes de Aula Regular (7 días antes):</strong>
              <span style={{ color: '#475569' }}>
                Deben cargar la prueba original al menos <strong>7 días antes</strong> de su aplicación para permitir revisión y trabajo del equipo PIE.
              </span>
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>🧩</span>
            <div>
              <strong style={{ color: '#0f172a', display: 'block' }}>Equipo Diferencial PIE (3 días antes):</strong>
              <span style={{ color: '#475569' }}>
                Disponen de hasta <strong>3 días antes</strong> de la fecha de la prueba para cargar las adecuaciones curriculares (Decretos 83 y 67).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('nueva')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: activeTab === 'nueva' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'nueva' ? '#ffffff' : '#64748b'
          }}
        >
          <PlusCircle size={16} /> 1. Nueva Planificación
        </button>

        <button
          onClick={() => setActiveTab('calendario')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: activeTab === 'calendario' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'calendario' ? '#ffffff' : '#64748b'
          }}
        >
          <CalendarIcon size={16} /> 2. Calendario Institucional
        </button>

        <button
          onClick={() => setActiveTab('modificar')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: activeTab === 'modificar' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'modificar' ? '#ffffff' : '#64748b'
          }}
        >
          <Edit size={16} /> 3. Modificar / Eliminar ({evaluations.length})
        </button>

        <button
          onClick={() => setActiveTab('pendientes')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: activeTab === 'pendientes' ? '#d97706' : '#f1f5f9',
            color: activeTab === 'pendientes' ? '#ffffff' : '#64748b'
          }}
        >
          <Paperclip size={16} /> 4. Archivos Pendientes ({pendingFilesEvaluations.length})
          {overdueTeacherEvaluations.length > 0 && (
            <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
              {overdueTeacherEvaluations.length} vencidas
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('pie')}
          style={{
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: activeTab === 'pie' ? '#059669' : '#f1f5f9',
            color: activeTab === 'pie' ? '#ffffff' : '#64748b'
          }}
        >
          <Puzzle size={16} /> 5. Adecuaciones PIE ({evaluations.length})
          {overduePieEvaluations.length > 0 && (
            <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
              {overduePieEvaluations.length} vencidas
            </span>
          )}
        </button>

        <button
          onClick={() => {
            if (coursesList.length > 0) setSupportModalCourse(coursesList[0]);
            setShowSupportModal(true);
          }}
          style={{
            marginLeft: 'auto',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            border: '1px solid #a7f3d0',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#ecfdf5',
            color: '#065f46'
          }}
          title="Ver y gestionar el equipo de apoyo y profesionales PIE por curso"
        >
          <Users size={16} /> 🤝 Equipo de Apoyo por Curso
        </button>
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

      {/* PESTAÑA 1: NUEVA PLANIFICACIÓN */}
      {activeTab === 'nueva' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '900px' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={22} color="#4f46e5" /> Registrar Nueva Planificación de Evaluación
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
            Completa los datos de la prueba. El evento se sincronizará automáticamente con Google Calendar y quedará disponible para el equipo PIE.
          </p>

          <form onSubmit={handleCreateEvaluation}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  📝 Título / Nombre de la Evaluación: *
                </label>
                <input
                  type="text"
                  value={newEvalForm.evaluation_title}
                  onChange={e => setNewEvalForm({ ...newEvalForm, evaluation_title: e.target.value })}
                  placeholder="Ej: Prueba Parcial N° 1, Control de Lectura..."
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  📚 Curso / Nivel: *
                </label>
                <select
                  value={newEvalForm.course_name}
                  onChange={e => setNewEvalForm({ ...newEvalForm, course_name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="" disabled>-- {coursesList.length === 0 ? 'No hay cursos registrados en base de datos' : 'Seleccione curso'} --</option>
                  {coursesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  📖 Asignatura: *
                </label>
                <select
                  value={newEvalForm.subject_name}
                  onChange={e => setNewEvalForm({ ...newEvalForm, subject_name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="" disabled>-- Seleccione asignatura --</option>
                  {subjectsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  📅 Fecha de Aplicación: *
                </label>
                <input
                  type="date"
                  value={newEvalForm.evaluation_date}
                  onChange={e => setNewEvalForm({ ...newEvalForm, evaluation_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  ⏰ Bloque Horario: *
                </label>
                <select
                  value={newEvalForm.block_label}
                  onChange={e => setNewEvalForm({ ...newEvalForm, block_label: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#3730a3' }}
                >
                  {BLOCKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  📎 Archivo / Enlace de la Prueba Original (Opcional):
                </label>
                <input
                  type="text"
                  value={newEvalForm.original_file_url}
                  onChange={e => setNewEvalForm({ ...newEvalForm, original_file_url: e.target.value, original_file_name: e.target.value ? 'Evaluacion_Original.pdf' : '' })}
                  placeholder="URL de Google Drive, SharePoint o enlace"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
                <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Si no lo tienes ahora, puedes adjuntarlo después en &quot;Archivos Pendientes&quot;.</small>
              </div>

            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 800 }}
              >
                {loading ? 'Guardando...' : '🚀 Guardar Planificación de Evaluación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: CALENDARIO INSTITUCIONAL */}
      {activeTab === 'calendario' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={20} color="#4f46e5" /> Calendario Institucional de Evaluaciones
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Google Calendar ID: <code style={{ color: '#4338ca' }}>{calendarId}</code>
            </span>
          </div>

          <div style={{ width: '100%', height: '620px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <iframe
              key={calendarKey}
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=America%2FSantiago&showTitle=0&showPrint=0&showTabs=1&showCalendars=0&showTz=0&bgcolor=%23ffffff`}
              style={{ width: '100%', height: '100%', border: 0 }}
              title="Google Calendar Evaluaciones"
            />
          </div>
        </div>
      )}

      {/* PESTAÑA 3: MIS EVALUACIONES (MODIFICAR / ELIMINAR) */}
      {activeTab === 'modificar' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit size={20} color="#4f46e5" /> Evaluaciones Planificadas ({displayedEvaluations.length})
            </h3>

            <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setFilterScope('all')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterScope === 'all' ? '#ffffff' : 'transparent',
                  color: filterScope === 'all' ? '#4f46e5' : '#64748b',
                  boxShadow: filterScope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                🌐 Todas ({evaluations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterScope('mine')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterScope === 'mine' ? '#ffffff' : 'transparent',
                  color: filterScope === 'mine' ? '#4f46e5' : '#64748b',
                  boxShadow: filterScope === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                👤 Mis Evaluaciones ({myEvaluationsCount})
              </button>
            </div>
          </div>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Evaluación / Asignatura</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Curso</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Fecha Aplicación</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Bloque</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Estado</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Plazos (7d Docente / 3d PIE)</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedEvaluations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No hay evaluaciones registradas {filterScope === 'mine' ? 'asociadas a tu usuario' : ''}.
                    </td>
                  </tr>
                ) : (
                  displayedEvaluations.map(ev => {
                    const dl = evalDeadlinesMap.get(ev.id);
                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <strong>{ev.evaluation_title}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.subject_name} • Prof. {ev.teacher_name}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {ev.course_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 700, color: '#0f172a' }}>
                          {ev.evaluation_date}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {ev.block_label}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: ev.status === 'Adecuado PIE' ? '#dcfce7' : ev.status === 'Completado' ? '#e0e7ff' : '#fef3c7',
                            color: ev.status === 'Adecuado PIE' ? '#166534' : ev.status === 'Completado' ? '#3730a3' : '#b45309',
                            border: ev.status === 'Adecuado PIE' ? '1px solid #bbf7d0' : ev.status === 'Completado' ? '1px solid #c7d2fe' : '1px solid #fde68a'
                          }}>
                            {ev.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: dl?.teacherStatus === 'uploaded' ? '#dcfce7' : dl?.teacherStatus === 'overdue' ? '#fee2e2' : dl?.teacherStatus === 'warning' ? '#fef3c7' : '#f1f5f9',
                              color: dl?.teacherStatus === 'uploaded' ? '#166534' : dl?.teacherStatus === 'overdue' ? '#991b1b' : dl?.teacherStatus === 'warning' ? '#92400e' : '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              {dl?.teacherStatus === 'uploaded' ? '✓ Docente: Subido' : dl?.teacherStatus === 'overdue' ? `🚨 Docente: Vencido (-${Math.abs(dl?.teacherDaysRemaining || 0)}d)` : dl?.teacherStatus === 'warning' ? `⚠️ Docente: ${dl?.teacherDaysRemaining}d restantes` : `⏳ Docente: ${dl?.teacherDaysRemaining}d`}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              background: dl?.pieStatus === 'uploaded' ? '#dcfce7' : dl?.pieStatus === 'overdue' ? '#fee2e2' : dl?.pieStatus === 'warning' ? '#fef3c7' : '#f8fafc',
                              color: dl?.pieStatus === 'uploaded' ? '#166534' : dl?.pieStatus === 'overdue' ? '#991b1b' : dl?.pieStatus === 'warning' ? '#92400e' : '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              {dl?.pieStatus === 'uploaded' ? '✓ PIE: Adecuado' : dl?.pieStatus === 'waiting_original' ? '⏳ PIE: Espera original' : dl?.pieStatus === 'overdue' ? `🚨 PIE: Vencido (-${Math.abs(dl?.pieDaysRemaining || 0)}d)` : dl?.pieStatus === 'warning' ? `⚠️ PIE: ${dl?.pieDaysRemaining}d restantes` : `⏳ PIE: ${dl?.pieDaysRemaining}d`}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => setEditingEval({ ...ev })}
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}
                              title="Modificar fecha o bloque"
                            >
                              <Edit size={13} /> Modificar
                            </button>
                            <button
                              onClick={() => handleDeleteEvaluation(ev)}
                              style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              title="Eliminar evaluación"
                            >
                              <Trash2 size={13} /> Eliminar
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

      {/* PESTAÑA 4: ARCHIVOS PENDIENTES */}
      {activeTab === 'pendientes' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#b45309', margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Paperclip size={20} color="#b45309" /> Evaluaciones Pendientes de Adjuntar Archivo ({pendingFilesEvaluations.length})
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
            Lista de pruebas que han sido calendarizadas pero aún no tienen cargado el instrumento de evaluación original. Plazo reglamentario docente: al menos 7 días antes de la fecha de aplicación.
          </p>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#fffbeb', borderBottom: '2px solid #fde68a' }}>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Evaluación</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Curso / Asignatura</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Fecha Aplicación</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Docente</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Alerta Plazo Docente (7 días)</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingFilesEvaluations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#059669', fontWeight: 700 }}>
                      🎉 ¡Excelente! No hay evaluaciones pendientes de archivo.
                    </td>
                  </tr>
                ) : (
                  pendingFilesEvaluations.map(ev => {
                    const dl = evalDeadlinesMap.get(ev.id);
                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {ev.evaluation_title}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {ev.course_name} • {ev.subject_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#b45309', fontWeight: 800 }}>
                          {ev.evaluation_date} ({ev.block_label})
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#64748b' }}>
                          {ev.teacher_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {dl?.teacherStatus === 'overdue' ? (
                            <div>
                              <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={13} /> 🚨 Vencido (-{Math.abs(dl.teacherDaysRemaining)} d)
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '2px', fontWeight: 600 }}>
                                Límite era: {dl.teacherDeadlineDate}
                              </div>
                            </div>
                          ) : dl?.teacherStatus === 'warning' ? (
                            <div>
                              <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} /> ⚠️ Por vencer ({dl.teacherDaysRemaining} d restantes)
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '2px' }}>
                                Plazo máx: {dl.teacherDeadlineDate}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} /> ⏳ A tiempo ({dl?.teacherDaysRemaining} d restantes)
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                Plazo máx: {dl?.teacherDeadlineDate}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setUploadPendingEval(ev);
                              setPendingFileUrl(ev.original_file_url || '');
                              setPendingFileName(ev.original_file_name || '');
                            }}
                            style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Upload size={13} /> Adjuntar Archivo
                          </button>
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

      {/* PESTAÑA 5: ADECUACIONES PIE */}
      {activeTab === 'pie' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#059669', margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Puzzle size={22} color="#059669" /> Módulo de Integración y Adecuaciones PIE (Decreto 83 / 67)
            </h3>
            <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontWeight: 800 }}>
              Equipo Diferencial PIE
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
            Revisa las evaluaciones originales subidas por los docentes de aula y adjunta la versión con adecuaciones curriculares para los estudiantes PIE.
          </p>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Docente / Asignatura</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Curso</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Fecha</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Prueba Original</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Estado PIE</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Alerta Plazo PIE (3 días)</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones PIE</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No hay evaluaciones registradas en el sistema.
                    </td>
                  </tr>
                ) : (
                  evaluations.map(ev => {
                    const hasOriginal = Boolean(ev.original_file_url);
                    const hasPie = ev.status === 'Adecuado PIE' && Boolean(ev.pie_file_url);
                    const dl = evalDeadlinesMap.get(ev.id);

                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <strong>{ev.evaluation_title}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.subject_name} • Prof. {ev.teacher_name}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 700 }}>
                          {ev.course_name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 700, color: '#0f172a' }}>
                          {ev.evaluation_date}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {hasOriginal ? (
                            <a
                              href={ev.original_file_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
                            >
                              <FileText size={12} /> Ver Original
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin Archivo</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: hasPie ? '#dcfce7' : '#fef3c7',
                            color: hasPie ? '#166534' : '#b45309',
                            border: hasPie ? '1px solid #bbf7d0' : '1px solid #fde68a'
                          }}>
                            {hasPie ? '✓ Adecuado PIE' : '⏳ Pendiente PIE'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          {hasPie ? (
                            <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> ✓ Adecuación Lista
                            </span>
                          ) : !hasOriginal ? (
                            <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.73rem', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Espera prueba original
                            </span>
                          ) : dl?.pieStatus === 'overdue' ? (
                            <div>
                              <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={13} /> 🚨 Plazo PIE Vencido (-{Math.abs(dl.pieDaysRemaining)} d)
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '2px', fontWeight: 600 }}>
                                Límite era: {dl.pieDeadlineDate}
                              </div>
                            </div>
                          ) : dl?.pieStatus === 'warning' ? (
                            <div>
                              <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} /> ⚠️ Por vencer PIE ({dl.pieDaysRemaining} d restantes)
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '2px' }}>
                                Plazo máx: {dl.pieDeadlineDate}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={13} /> ⏳ A tiempo PIE ({dl?.pieDaysRemaining} d restantes)
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                Plazo máx: {dl?.pieDeadlineDate}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => {
                                setUploadPieEval(ev);
                                setPieFileUrl(ev.pie_file_url || '');
                                setPieFileName(ev.pie_file_name || '');
                              }}
                              style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Upload size={13} /> {hasPie ? 'Reemplazar PIE' : 'Subir PIE'}
                            </button>

                            {hasPie && (
                              <a
                                href={ev.pie_file_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.3rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
                              >
                                <Eye size={13} /> Ver PIE
                              </a>
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

      {/* MODAL 1: EDITAR EVALUACIÓN */}
      {editingEval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit size={18} color="#4f46e5" /> Modificar Evaluación
              </h4>
              <button onClick={() => setEditingEval(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Título / Nombre:
                </label>
                <input
                  type="text"
                  value={editingEval.evaluation_title}
                  onChange={e => setEditingEval({ ...editingEval, evaluation_title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Fecha de Aplicación:
                </label>
                <input
                  type="date"
                  value={editingEval.evaluation_date}
                  onChange={e => setEditingEval({ ...editingEval, evaluation_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Bloque Horario:
                </label>
                <select
                  value={editingEval.block_label}
                  onChange={e => setEditingEval({ ...editingEval, block_label: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  {BLOCKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" onClick={() => setEditingEval(null)} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontWeight: 700 }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUNTAR ARCHIVO ORIGINAL PENDIENTE */}
      {uploadPendingEval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#b45309', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} color="#b45309" /> Adjuntar Archivo Original
              </h4>
              <button onClick={() => setUploadPendingEval(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1rem' }}>
              Evaluación: <strong>{uploadPendingEval.evaluation_title}</strong> ({uploadPendingEval.course_name})
            </p>

            <form onSubmit={handleSavePendingFile}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Nombre del Documento:
                </label>
                <input
                  type="text"
                  value={pendingFileName}
                  onChange={e => setPendingFileName(e.target.value)}
                  placeholder="Ej: Prueba_Lenguaje_1Medio.pdf"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Enlace o URL del Archivo (Google Drive / Enlace):
                </label>
                <input
                  type="text"
                  value={pendingFileUrl}
                  onChange={e => setPendingFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  required
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" onClick={() => setUploadPendingEval(null)} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontWeight: 700, background: '#d97706' }}>
                  Guardar Archivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBIR ADECUACIÓN PIE */}
      {uploadPieEval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#059669', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Puzzle size={18} color="#059669" /> Subir Evaluación Adaptada PIE
              </h4>
              <button onClick={() => setUploadPieEval(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1rem' }}>
              Evaluación: <strong>{uploadPieEval.evaluation_title}</strong> ({uploadPieEval.course_name} • Prof. {uploadPieEval.teacher_name})
            </p>

            <form onSubmit={handleSavePieFile}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Nombre del Documento Adaptado:
                </label>
                <input
                  type="text"
                  value={pieFileName}
                  onChange={e => setPieFileName(e.target.value)}
                  placeholder="Ej: Prueba_Adaptada_PIE_1Medio.pdf"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Enlace o URL del Archivo Adaptado (Google Drive / Enlace):
                </label>
                <input
                  type="text"
                  value={pieFileUrl}
                  onChange={e => setPieFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  required
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" onClick={() => setUploadPieEval(null)} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontWeight: 700, background: '#059669' }}>
                  Guardar Adaptación PIE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIGURACIÓN INTEGRACIONES GOOGLE DRIVE / CALENDAR (DESACOPLADO) */}
      {showConfigModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} color="#4f46e5" /> Configuración de Google Drive & Calendar
              </h4>
              <button onClick={() => setShowConfigModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1rem' }}>
              Configura los IDs de las carpetas de Google Drive y del calendario institucional. Puedes modificarlos en cualquier momento:
            </p>

            <form onSubmit={handleSaveIntegrationSettings}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Google Calendar ID (Evaluaciones):
                </label>
                <input
                  type="text"
                  value={calendarId}
                  onChange={e => setCalendarId(e.target.value)}
                  placeholder="ejemplo@group.calendar.google.com"
                  required
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  ID Carpeta Drive (Pruebas Originales):
                </label>
                <input
                  type="text"
                  value={folderOriginalsId}
                  onChange={e => setFolderOriginalsId(e.target.value)}
                  placeholder="13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  ID Carpeta Drive (Adecuaciones PIE):
                </label>
                <input
                  type="text"
                  value={folderPieId}
                  onChange={e => setFolderPieId(e.target.value)}
                  placeholder="1JoE4n5kgVYoXQxqh6XlLLE78thRQlEED"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" onClick={() => setShowConfigModal(false)} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontWeight: 700 }}>
                  Guardar Configuración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EQUIPO DE APOYO Y PROFESIONALES DEL CURSO */}
      <CourseSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        courseName={supportModalCourse}
        availableCourses={coursesList}
      />

    </div>
  );
};
