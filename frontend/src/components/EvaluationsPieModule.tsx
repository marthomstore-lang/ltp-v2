import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  BookOpen,
  Printer,
  FileCheck,
  Check,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  Paperclip,
  Puzzle,
  PlusCircle,
  CheckCircle2,
  Clock,
  Eye,
  Upload,
  Settings,
  RefreshCw,
  X,
  FileText,
  AlertTriangle,
  AlertCircle,
  Users,
  FolderOpen,
  Folder,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Cloud,
  Lock,
  Filter
} from 'lucide-react';
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
  original_folder_path?: string;
  original_uploaded_at?: string;
  pie_file_name?: string;
  pie_file_url?: string;
  pie_folder_path?: string;
  pie_teacher_name?: string;
  pie_teacher_email?: string;
  pie_uploaded_at?: string;
  calendar_event_id?: string;
  material_type?: string;
  requires_copies?: boolean;
  copies_count?: number;
  copies_details?: string;
  utp_status?: string;
  utp_approved_by?: string;
  utp_approved_at?: string;
  utp_notes?: string;
  photocopy_status?: string;
  photocopied_by?: string;
  photocopied_at?: string;
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

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const readFileAsBase64 = (file: File): Promise<{ base64: string; mimeType: string; name: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({
          base64: reader.result,
          mimeType: file.type || 'application/octet-stream',
          name: file.name
        });
      } else {
        reject(new Error('No se pudo leer el archivo.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
};

export const EvaluationsPieModule: React.FC<EvaluationsPieModuleProps> = ({ token, user }) => {
  const [activeTab, setActiveTab] = useState<'nueva' | 'calendario' | 'modificar' | 'pendientes' | 'pie' | 'carpetas' | 'visado_fotocopias'>('nueva');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>(DEFAULT_COURSES);
  const [subjectsList, setSubjectsList] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  // Configuraciones de Integración Google Workspace (ltp.campanario@eduvallediguillin.gob.cl)
  const [calendarId, setCalendarId] = useState('c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com');
  const [folderOriginalsId, setFolderOriginalsId] = useState('1aDa7NJRpNvZpZstzjs4uVJYxCWBOolRO');
  const [folderPieId, setFolderPieId] = useState('1jlMg2sJUUFlabfHmA19-yKS0PEjn0cTU');
  const [driveAccountEmail, setDriveAccountEmail] = useState('ltp.campanario@eduvallediguillin.gob.cl');
  const [driveConnected, setDriveConnected] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [calendarKey, setCalendarKey] = useState(Date.now());
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalCourse, setSupportModalCourse] = useState('1° Medio A');
  const [supportModalTab, setSupportModalTab] = useState<'course' | 'pie_matrix'>('course');
  const [isPieRestricted, setIsPieRestricted] = useState(false);
  const [allowedPieCourses, setAllowedPieCourses] = useState<string[]>([]);

  // Estado del Calendario Interno Institucional (Vista Mensual y Vista Semanal por Bloques)
  const [calendarViewMode, setCalendarViewMode] = useState<'monthly' | 'weekly_blocks'>('monthly');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  });
  const [calendarCourseFilter, setCalendarCourseFilter] = useState<string>('');
  const [calendarSubjectFilter, setCalendarSubjectFilter] = useState<string>('');
  const [selectedDayEvaluations, setSelectedDayEvaluations] = useState<{ dateStr: string; items: Evaluation[] } | null>(null);

  // Explorador de Carpetas Automáticas Google Drive
  const [driveFoldersData, setDriveFoldersData] = useState<any>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolderRoot, setSelectedFolderRoot] = useState<'originals' | 'pie' | 'profiles' | 'calendars'>('originals');
  const [selectedFolderCourse, setSelectedFolderCourse] = useState<string>('');

  // Lista de estudiantes para cálculo automático de matrícula por curso
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Filtros de Tab 7: Visado y Fotocopias
  const [visadoFilterStatus, setVisadoFilterStatus] = useState<'all' | 'with_copies' | 'pending_utp' | 'queue_copies' | 'ready_copies' | 'rejected'>('all');
  const [visadoSearchQuery, setVisadoSearchQuery] = useState('');

  // Formulario Nueva Evaluación + Archivo directo desde computador
  const [newEvalForm, setNewEvalForm] = useState({
    evaluation_title: '',
    course_name: '',
    subject_name: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    block_label: BLOCKS[0],
    original_file_name: '',
    original_file_url: '',
    material_type: 'Evaluación',
    requires_copies: false,
    copies_count: 0,
    copies_details: 'Blanco y Negro, Doble Faz'
  });
  const [newEvalSelectedFile, setNewEvalSelectedFile] = useState<File | null>(null);
  const newEvalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal Edición
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);

  // Modal de Previsualización y Descarga Directa de Instrumentos de Evaluación
  const [previewFileModal, setPreviewFileModal] = useState<{
    ev: Evaluation;
    type: 'original' | 'pie';
    fileUrl: string;
    fileName: string;
    isImage: boolean;
    isPdf: boolean;
  } | null>(null);

  const handleOpenEvaluationDocument = (ev: Evaluation, type: 'original' | 'pie' = 'original') => {
    const fileName = type === 'pie' 
      ? (ev.pie_file_name || 'Adecuacion_PIE.docx') 
      : (ev.original_file_name || 'Evaluacion_Original.pdf');
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isPdf = ext === 'pdf';
    const fileUrl = `/api/evaluations/${ev.id}/file?type=${type}`;
    setPreviewFileModal({ ev, type, fileUrl, fileName, isImage, isPdf });
  };

  // Modal Subir Archivo Pendiente (con selector de archivo físico)
  const [uploadPendingEval, setUploadPendingEval] = useState<Evaluation | null>(null);
  const [pendingFileUrl, setPendingFileUrl] = useState('');
  const [pendingFileName, setPendingFileName] = useState('');
  const [pendingSelectedFile, setPendingSelectedFile] = useState<File | null>(null);
  const [uploadingPendingFile, setUploadingPendingFile] = useState(false);

  // Modal Subir Adecuación PIE (con selector de archivo físico)
  const [uploadPieEval, setUploadPieEval] = useState<Evaluation | null>(null);
  const [pieFileUrl, setPieFileUrl] = useState('');
  const [pieFileName, setPieFileName] = useState('');
  const [pieSelectedFile, setPieSelectedFile] = useState<File | null>(null);
  const [uploadingPieFile, setUploadingPieFile] = useState(false);

  // Filtros en Pestaña 3 y 5
  const [filterScope, setFilterScope] = useState<'all' | 'mine'>('all');
  const [tableCourseFilter, setTableCourseFilter] = useState<string>('');
  const [tableSubjectFilter, setTableSubjectFilter] = useState<string>('');

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

  const loadDriveFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await fetch('/api/drive/folders', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data && data.success) {
        setDriveFoldersData(data);
      }
    } catch (err) {
      console.error('Error al cargar jerarquía de carpetas Drive:', err);
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
    loadIntegrationSettings();
    loadSubjects();
    loadDriveFolders();

    // Escuchar redirección directa desde notificaciones o campana superior
    const handleSwitchTab = (e: any) => {
      if (e.detail?.tab && ['nueva', 'calendario', 'modificar', 'pendientes', 'pie', 'carpetas', 'visado_fotocopias'].includes(e.detail.tab)) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('ltp_evaluations_switch_tab', handleSwitchTab);

    const savedTab = sessionStorage.getItem('ltp_evaluations_active_tab');
    if (savedTab && ['nueva', 'calendario', 'modificar', 'pendientes', 'pie', 'carpetas', 'visado_fotocopias'].includes(savedTab)) {
      setActiveTab(savedTab as any);
      sessionStorage.removeItem('ltp_evaluations_active_tab');
    }


    Promise.all([
      fetch('/api/courses', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch('/api/students', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json()).catch(() => ([]))
    ]).then(([coursesRes, studentsData]) => {
      const stds = Array.isArray(studentsData) ? studentsData : [];
      setAllStudents(stds);
      const savedCourses = (coursesRes && Array.isArray(coursesRes.courses)) ? coursesRes.courses.map((c: any) => c.name) : [];
      const studentCourses = (stds.length > 0)
        ? Array.from(new Set(stds.map((s: any) => s.desc_grado || s.level_name))).filter(Boolean)
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
      if (data && typeof data.isPieRestricted === 'boolean') {
        setIsPieRestricted(data.isPieRestricted);
      }
      if (data && Array.isArray(data.allowedPieCourses)) {
        setAllowedPieCourses(data.allowedPieCourses);
      }
    } catch (err) {
      console.error('Error al cargar evaluaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithGoogle = async () => {
    setSyncingGoogle(true);
    try {
      const [syncRes, consRes] = await Promise.all([
        fetch('/api/evaluations/sync-google', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include'
        }).then(r => r.json()).catch(() => ({})),
        fetch('/api/drive/consolidate-institutional', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include'
        }).then(r => r.json()).catch(() => ({}))
      ]);
      await loadEvaluations();
      await loadDriveFolders();
      setCalendarKey(Date.now());
      Swal.fire({
        icon: 'success',
        title: 'Traspaso y Sincronización Completados',
        text: consRes?.message || syncRes?.message || `Todos los archivos, perfiles (Files / Perfiles) y calendarios están consolidados en ${driveAccountEmail}.`,
        timer: 3400
      });
    } catch (err) {
      Swal.fire('Error', 'No se pudo sincronizar con la cuenta institucional.', 'error');
    } finally {
      setSyncingGoogle(false);
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
        if (data.settings.GOOGLE_DRIVE_ACCOUNT_EMAIL) setDriveAccountEmail(data.settings.GOOGLE_DRIVE_ACCOUNT_EMAIL);
      }
      const statusRes = await fetch('/api/drive/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).then(r => r.json()).catch(() => null);
      if (statusRes) {
        setDriveConnected(Boolean(statusRes.connected));
        if (statusRes.account) setDriveAccountEmail(statusRes.account);
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
            DRIVE_FOLDER_PIE_ID: folderPieId.trim(),
            GOOGLE_DRIVE_ACCOUNT_EMAIL: driveAccountEmail.trim()
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



  const evaluationsWithCopies = useMemo(() => {
    return evaluations.filter(e => e.requires_copies);
  }, [evaluations]);

  const pendingUtpCount = useMemo(() => {
    return evaluations.filter(e => (e.utp_status || 'Pendiente') === 'Pendiente').length;
  }, [evaluations]);

  const queueCopiesCount = useMemo(() => {
    return evaluations.filter(e => e.requires_copies && e.utp_status === 'Visado' && (e.photocopy_status === 'En Cola' || !e.photocopy_status || e.photocopy_status === 'Pendiente' || e.photocopy_status === 'Pendiente Visado')).length;
  }, [evaluations]);

  const readyCopiesCount = useMemo(() => {
    return evaluations.filter(e => e.requires_copies && e.photocopy_status === 'Listo para Retiro').length;
  }, [evaluations]);

  const rejectedCount = useMemo(() => {
    return evaluations.filter(e => e.utp_status === 'Rechazado').length;
  }, [evaluations]);

  const filteredVisadoList = useMemo(() => {
    return evaluations.filter(ev => {
      if (visadoFilterStatus === 'with_copies' && !ev.requires_copies) return false;
      if (visadoFilterStatus === 'pending_utp' && (ev.utp_status || 'Pendiente') !== 'Pendiente') return false;
      if (visadoFilterStatus === 'queue_copies' && (!ev.requires_copies || ev.utp_status !== 'Visado' || ev.photocopy_status === 'Listo para Retiro')) return false;
      if (visadoFilterStatus === 'ready_copies' && (!ev.requires_copies || ev.photocopy_status !== 'Listo para Retiro')) return false;
      if (visadoFilterStatus === 'rejected' && ev.utp_status !== 'Rechazado') return false;
      if (visadoSearchQuery.trim()) {
        const q = visadoSearchQuery.toLowerCase();
        const match = (ev.evaluation_title || '').toLowerCase().includes(q) ||
                      (ev.course_name || '').toLowerCase().includes(q) ||
                      (ev.subject_name || '').toLowerCase().includes(q) ||
                      (ev.teacher_name || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [evaluations, visadoFilterStatus, visadoSearchQuery]);

  // Helpers para regla institucional: Máx 2 evaluaciones por día y cálculo de matrícula
  const getCourseStudentCount = (courseName: string): number => {
    if (!courseName) return 0;
    const trimmed = courseName.trim().toLowerCase();
    const count = allStudents.filter(s => {
      const stdCourse = (s.desc_grado || s.level_name || s.course_name || '').trim().toLowerCase();
      return stdCourse === trimmed;
    }).length;
    return count > 0 ? count : 35; // Default 35 si no hay matrícula registrada
  };

  const getEvaluationsCountOnDate = (course: string, dateStr: string, excludeId?: string): number => {
    if (!course || !dateStr) return 0;
    const cleanCourse = course.trim().toLowerCase();
    const cleanDate = dateStr.split('T')[0];
    return evaluations.filter(ev => {
      if (excludeId && ev.id === excludeId) return false;
      const evCourse = (ev.course_name || '').trim().toLowerCase();
      const evDate = (ev.evaluation_date || '').split('T')[0];
      const matType = (ev.material_type || 'Evaluación').trim();
      const countsTowardsLimit = ['Evaluación', 'Rúbrica'].includes(matType);
      return evCourse === cleanCourse && evDate === cleanDate && countsTowardsLimit;
    }).length;
  };

  const newEvalDailyCount = useMemo(() => {
    return getEvaluationsCountOnDate(newEvalForm.course_name, newEvalForm.evaluation_date);
  }, [evaluations, newEvalForm.course_name, newEvalForm.evaluation_date]);

  const newEvalCountsTowardsLimit = ['Evaluación', 'Rúbrica'].includes(newEvalForm.material_type || 'Evaluación');
  const isNewEvalBlocked = newEvalCountsTowardsLimit && newEvalDailyCount >= 2;

  // Acciones de Visado UTP y Cola de Fotocopiado
  const handleUtpVisa = async (ev: Evaluation, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const confirm = await Swal.fire({
        title: '¿Visar Instrumento Pedagógico?',
        html: `¿Confirmas el Visto Bueno (Visado) de la ${ev.material_type || 'evaluación'} <strong>"${ev.evaluation_title}"</strong> (${ev.course_name})?<br/><br/><span style="color:#059669;font-weight:700">Pasará de inmediato a la Cola de Fotocopiado con ${ev.copies_count || 0} copias requeridas.</span>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Visar y Derivar a Fotocopiado',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#059669'
      });
      if (!confirm.isConfirmed) return;

      try {
        const res = await fetch(`/api/evaluations/${ev.id}/utp-visa`, {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({ action: 'approve' })
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('¡Visado Exitoso!', data.message, 'success');
          await loadEvaluations();
        } else {
          Swal.fire('Error', data.error || 'No se pudo visar.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error al procesar visado.', 'error');
      }
    } else {
      const { value: notes } = await Swal.fire({
        title: 'Devolver / Observar Instrumento',
        text: 'Ingresa las observaciones o correcciones pedagógicas que el docente debe subsanar antes de autorizar la impresión:',
        input: 'textarea',
        inputPlaceholder: 'Ej: Ajustar ponderación de ítems, verificar tiempo del bloque horario...',
        showCancelButton: true,
        confirmButtonText: 'Devolver con Observación',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
        inputValidator: (val) => !val?.trim() && 'Debes ingresar un motivo u observación.'
      });
      if (!notes) return;

      try {
        const res = await fetch(`/api/evaluations/${ev.id}/utp-visa`, {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({ action: 'reject', notes })
        });
        const data = await res.json();
        if (data.success) {
          Swal.fire('Observaciones Enviadas', data.message, 'info');
          await loadEvaluations();
        } else {
          Swal.fire('Error', data.error || 'No se pudo registrar la observación.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error al devolver evaluación.', 'error');
      }
    }
  };

  const handlePhotocopyStatus = async (ev: Evaluation, status: 'Listo para Retiro') => {
    const confirm = await Swal.fire({
      title: '¿Confirmar Copias Listas?',
      html: `¿Confirmas que las <strong>${ev.copies_count || 0} copias</strong> de <strong>"${ev.evaluation_title}"</strong> (${ev.course_name}) ya están impresas?<br/><br/><span style="color:#2563eb;font-weight:700">Se notificará automáticamente al docente (${ev.teacher_name}) para su retiro.</span>`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, Marcar Listo para Retiro',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb'
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/evaluations/${ev.id}/photocopy-status`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Impresión Registrada!', data.message, 'success');
        await loadEvaluations();
      } else {
        Swal.fire('Error', data.error || 'No se pudo actualizar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error al actualizar estado de fotocopias.', 'error');
    }
  };

  // 1. REGISTRAR EVALUACIÓN (Con subida directa de archivo e inserción automática en Carpeta Curso -> Asignatura y Google Calendar)
  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEvalForm.evaluation_title.trim() || !newEvalForm.course_name || !newEvalForm.subject_name) {
      Swal.fire('Atención', 'Por favor completa todos los campos obligatorios (Título, Curso y Asignatura).', 'warning');
      return;
    }

    if (isNewEvalBlocked) {
      Swal.fire({
        icon: 'error',
        title: 'Tope Institucional Alcanzado (2/2)',
        html: `El curso <strong>"${newEvalForm.course_name}"</strong> ya tiene <strong>${newEvalDailyCount} evaluaciones/rúbricas agendadas</strong> para el día <strong>${newEvalForm.evaluation_date}</strong>.<br/><br/>La normativa institucional prohíbe más de 2 evaluaciones formales el mismo día por curso. (Puedes registrar Guías, Material de Apoyo u Otros sin restricción).`
      });
      return;
    }

    setLoading(true);
    try {
      let filePayload: { file_base64?: string; file_mime?: string; original_file_name?: string } = {};
      if (newEvalSelectedFile) {
        const encoded = await readFileAsBase64(newEvalSelectedFile);
        filePayload = {
          file_base64: encoded.base64,
          file_mime: encoded.mimeType,
          original_file_name: encoded.name
        };
      }

      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          ...newEvalForm,
          ...filePayload,
          teacher_name: user?.name || 'Docente de Aula',
          teacher_email: user?.email || driveAccountEmail,
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
          original_file_url: '',
          material_type: 'Evaluación',
          requires_copies: false,
          copies_count: 0,
          copies_details: 'Blanco y Negro, Doble Faz'
        });
        setNewEvalSelectedFile(null);
        if (newEvalFileInputRef.current) newEvalFileInputRef.current.value = '';
        await loadEvaluations();
        await loadDriveFolders();
        setCalendarKey(Date.now());
        setActiveTab('calendario');
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
          block_label: editingEval.block_label,
          material_type: editingEval.material_type || 'Evaluación',
          requires_copies: editingEval.requires_copies || false,
          copies_count: editingEval.copies_count || 0,
          copies_details: editingEval.copies_details || ''
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
      html: `¿Estás seguro de eliminar la evaluación <strong>${ev.evaluation_title}</strong> del <strong>${ev.evaluation_date}</strong>?<br/><small>También se eliminará del Calendario Institucional de Google.</small>`,
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
          loadDriveFolders();
          setCalendarKey(Date.now());
        } else {
          Swal.fire('Error', data.error || 'No se pudo eliminar.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión.', 'error');
      }
    }
  };

  // 4. ADJUNTAR ARCHIVO ORIGINAL PENDIENTE (Soporta archivo desde computador o enlace)
  const handleSavePendingFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPendingEval) return;
    if (!pendingSelectedFile && !pendingFileUrl.trim()) {
      Swal.fire('Atención', 'Por favor selecciona un archivo desde tu computador o ingresa su enlace.', 'warning');
      return;
    }

    setUploadingPendingFile(true);
    try {
      let bodyPayload: Record<string, any> = {
        file_name: pendingFileName || pendingSelectedFile?.name || 'Evaluacion_Original.pdf',
        file_url: pendingFileUrl.trim()
      };

      if (pendingSelectedFile) {
        const encoded = await readFileAsBase64(pendingSelectedFile);
        bodyPayload.file_base64 = encoded.base64;
        bodyPayload.file_mime = encoded.mimeType;
        bodyPayload.file_name = pendingFileName || encoded.name;
      }

      const res = await fetch(`/api/evaluations/${uploadPendingEval.id}/attach-original`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Archivo Subido a Google Drive!', data.message, 'success');
        setUploadPendingEval(null);
        setPendingFileUrl('');
        setPendingFileName('');
        setPendingSelectedFile(null);
        loadEvaluations();
        loadDriveFolders();
      } else {
        Swal.fire('Error', data.error || 'No se pudo adjuntar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión al subir el archivo.', 'error');
    } finally {
      setUploadingPendingFile(false);
    }
  };

  // 5. ADJUNTAR ADECUACIÓN PIE (Carpeta PIE Aparte -> Curso -> Asignatura en Google Drive)
  const handleSavePieFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadPieEval) return;
    if (!pieSelectedFile && !pieFileUrl.trim()) {
      Swal.fire('Atención', 'Por favor selecciona el archivo adaptado PIE desde tu computador o ingresa su enlace.', 'warning');
      return;
    }

    setUploadingPieFile(true);
    try {
      let bodyPayload: Record<string, any> = {
        pie_file_name: pieFileName || pieSelectedFile?.name || 'Evaluacion_Adaptada_PIE.pdf',
        pie_file_url: pieFileUrl.trim(),
        pie_teacher_name: user?.name || 'Educador(a) PIE',
        pie_teacher_email: user?.email || driveAccountEmail
      };

      if (pieSelectedFile) {
        const encoded = await readFileAsBase64(pieSelectedFile);
        bodyPayload.file_base64 = encoded.base64;
        bodyPayload.file_mime = encoded.mimeType;
        bodyPayload.pie_file_name = pieFileName || encoded.name;
      }

      const res = await fetch(`/api/evaluations/${uploadPieEval.id}/attach-pie`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire('¡Adecuación PIE Guardada en Google Drive!', data.message, 'success');
        setUploadPieEval(null);
        setPieFileUrl('');
        setPieFileName('');
        setPieSelectedFile(null);
        loadEvaluations();
        loadDriveFolders();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión al subir la adecuación PIE.', 'error');
    } finally {
      setUploadingPieFile(false);
    }
  };

  // Lista única de cursos y asignaturas presentes en evaluaciones + base de datos
  const allInstitutionalCourses = useMemo(() => {
    const evalCourses = evaluations.map(e => e.course_name).filter(Boolean);
    return sortCoursesList(Array.from(new Set([...coursesList, ...evalCourses])));
  }, [coursesList, evaluations]);

  const allAvailableCourses = useMemo(() => {
    if (isPieRestricted) {
      return sortCoursesList(Array.from(new Set(allowedPieCourses)));
    }
    return allInstitutionalCourses;
  }, [isPieRestricted, allowedPieCourses, allInstitutionalCourses]);

  const allAvailableSubjects = useMemo(() => {
    const evalSubjects = evaluations.map(e => e.subject_name).filter(Boolean);
    return Array.from(new Set([...subjectsList, ...evalSubjects])).sort((a, b) => a.localeCompare(b));
  }, [subjectsList, evaluations]);

  const coursesMatchFrontend = (courseA: string, courseB: string): boolean => {
    const norm = (v: string) =>
      String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    const a = norm(courseA);
    const b = norm(courseB);
    if (!a || !b) return false;
    if (a === b) return true;
    const isPK = (s: string) => s.includes('pre-kinder') || s.includes('prekinder') || s.includes('1er nivel de transicion');
    const isK = (s: string) => !isPK(s) && (s.includes('kinder') || s.includes('2° nivel de transicion') || s.includes('2do nivel de transicion'));
    if (isPK(a) && isPK(b)) return true;
    if (isK(a) && isK(b)) return true;
    const tp = (s: string) => {
      const m = s.match(/\b([34])\s*(?:°|º|ro|to)?\b/);
      if (!m) return null;
      if (s.includes('mecanica')) return `${m[1]}_mecanica`;
      if (s.includes('parvulo')) return `${m[1]}_parvulo`;
      if (s.includes('electricidad')) return `${m[1]}_electricidad`;
      if (s.includes('telecom')) return `${m[1]}_telecom`;
      return null;
    };
    const tpA = tp(a);
    const tpB = tp(b);
    if (tpA || tpB) return Boolean(tpA && tpB && tpA === tpB);
    const gl = (s: string) => {
      const m = s.match(/^([1-8])\s*(?:°|º|er|do|ro|to|vo)?\s*(basico|medio)(?:\s+([ab]))?$/i);
      if (!m) return null;
      return { g: m[1], l: m[2], let: (m[3] || '').toLowerCase() };
    };
    const ga = gl(a);
    const gb = gl(b);
    if (ga && gb && ga.g === gb.g && ga.l === gb.l) {
      if (ga.let && gb.let) return ga.let === gb.let;
      return true;
    }
    return false;
  };

  // Filtros
  const myEvaluationsCount = evaluations.filter(ev => ev.teacher_email === user?.email || ev.teacher_name === user?.name).length;

  const displayedEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      if (filterScope === 'mine' && user) {
        const matchMail = user.email && ev.teacher_email === user.email;
        const matchName = user.name && ev.teacher_name?.toLowerCase().includes(user.name.toLowerCase());
        if (!matchMail && !matchName) return false;
      }
      if (tableCourseFilter && !coursesMatchFrontend(ev.course_name, tableCourseFilter)) return false;
      if (tableSubjectFilter && ev.subject_name !== tableSubjectFilter) return false;
      return true;
    });
  }, [evaluations, filterScope, user, tableCourseFilter, tableSubjectFilter]);

  const pendingFilesEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      if (tableCourseFilter && !coursesMatchFrontend(ev.course_name, tableCourseFilter)) return false;
      if (tableSubjectFilter && ev.subject_name !== tableSubjectFilter) return false;
      return ev.status === 'Pendiente de Archivo' || !ev.original_file_url;
    });
  }, [evaluations, tableCourseFilter, tableSubjectFilter]);

  // Evaluaciones filtradas para el Calendario Institucional
  const calendarFilteredEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      if (calendarCourseFilter && !coursesMatchFrontend(ev.course_name, calendarCourseFilter)) return false;
      if (calendarSubjectFilter && ev.subject_name !== calendarSubjectFilter) return false;
      return true;
    });
  }, [evaluations, calendarCourseFilter, calendarSubjectFilter]);

  // Agrupación de evaluaciones por fecha YYYY-MM-DD para la grilla mensual del calendario
  const evaluationsByDateMap = useMemo(() => {
    const map = new Map<string, Evaluation[]>();
    calendarFilteredEvaluations.forEach(ev => {
      const dateKey = String(ev.evaluation_date || '').split('T')[0];
      if (!dateKey) return;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(ev);
    });
    return map;
  }, [calendarFilteredEvaluations]);

  // Construcción de días del mes activo para el Calendario Interactivo
  const calendarGridDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Lunes = 0 ... Domingo = 6
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();

    const cells: Array<{ dateStr: string; dayNumber: number; isCurrentMonth: boolean }> = [];

    // Días previos de relleno
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const ds = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      cells.push({ dateStr: ds, dayNumber: d, isCurrentMonth: false });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr: ds, dayNumber: d, isCurrentMonth: true });
    }

    // Relleno final para completar múltiplo de 7
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      const nextDate = new Date(year, month + 1, nextDay);
      const ds = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      cells.push({ dateStr: ds, dayNumber: nextDay, isCurrentMonth: false });
      nextDay++;
    }

    return cells;
  }, [calendarMonth]);

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
      {/* HEADER DE MÓDULO CON ESTADO DE INTERCONEXIÓN AUTOMÁTICA GOOGLE WORKSPACE */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BookOpen size={26} color="#4f46e5" /> Portal de Evaluaciones Institucionales & Integración PIE
            </h2>
            <span style={{
              background: driveConnected ? '#ecfdf5' : '#fef3c7',
              color: driveConnected ? '#047857' : '#b45309',
              border: `1px solid ${driveConnected ? '#a7f3d0' : '#fde68a'}`,
              padding: '0.22rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.73rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Cloud size={13} /> Google Drive & Calendar Activo: {driveAccountEmail}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Planificación de pruebas, calendarización institucional sincronizada y almacenamiento automático en Google Drive por <strong>Curso → Asignatura</strong> y <strong>Carpeta PIE Aparte</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncWithGoogle}
            disabled={syncingGoogle}
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid #c7d2fe',
              background: '#eef2ff',
              color: '#4338ca',
              cursor: syncingGoogle ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Sincronizar evaluaciones y eventos con Google Workspace"
          >
            <RefreshCw size={15} className={syncingGoogle ? 'spin' : ''} />
            {syncingGoogle ? 'Sincronizando Google...' : 'Sincronizar Google Drive / Calendar'}
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
                Deben cargar la prueba original al menos <strong>7 días antes</strong>. Se guarda automáticamente en Google Drive bajo <code>Evaluaciones Originales / [Curso] / [Asignatura]</code>.
              </span>
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>🧩</span>
            <div>
              <strong style={{ color: '#0f172a', display: 'block' }}>Equipo Diferencial PIE (3 días antes):</strong>
              <span style={{ color: '#475569' }}>
                Disponen de hasta <strong>3 días antes</strong> para cargar la adecuación curricular, la cual se almacena en la carpeta separada <code>Evaluaciones PIE Aparte / [Curso] / [Asignatura]</code>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="sub-nav-tabs" style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
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
          <CalendarIcon size={16} /> 2. Calendario Institucional ({evaluations.length})
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
            setActiveTab('carpetas');
            loadDriveFolders();
          }}
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
            background: activeTab === 'carpetas' ? '#0284c7' : '#f1f5f9',
            color: activeTab === 'carpetas' ? '#ffffff' : '#64748b'
          }}
        >
          <FolderOpen size={16} /> 6. Carpetas Google Drive
        </button>

                <button
          type="button"
          onClick={() => setActiveTab('visado_fotocopias')}
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
            background: activeTab === 'visado_fotocopias' ? '#0891b2' : '#f1f5f9',
            color: activeTab === 'visado_fotocopias' ? '#ffffff' : '#64748b'
          }}
        >
          <Printer size={16} /> 7. Visado y Fotocopias ({evaluations.length})
          {pendingUtpCount > 0 && (
            <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
              {pendingUtpCount} por visar
            </span>
          )}
          {queueCopiesCount > 0 && (
            <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
              {queueCopiesCount} en cola
            </span>
          )}
          {readyCopiesCount > 0 && (
            <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '9999px', fontWeight: 800 }}>
              {readyCopiesCount} listas
            </span>
          )}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (allAvailableCourses.length > 0) setSupportModalCourse(allAvailableCourses[0]);
              setSupportModalTab('course');
              setShowSupportModal(true);
            }}
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #a7f3d0',
              fontWeight: 700,
              fontSize: '0.84rem',
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

          <button
            onClick={() => {
              if (allAvailableCourses.length > 0) setSupportModalCourse(allAvailableCourses[0]);
              setSupportModalTab('pie_matrix');
              setShowSupportModal(true);
            }}
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #818cf8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#eef2ff',
              color: '#3730a3'
            }}
            title="Asignar cursos exclusivos a Profesores Diferenciales / PIE (Regla de Privacidad)"
          >
            🔐 Asignar Cursos PIE (Privacidad)
          </button>
        </div>
      </div>

      {/* BANNER DE REGLA DE PRIVACIDAD PIE CUANDO EL USUARIO ES PROFESOR DIFERENCIAL / PIE */}
      {isPieRestricted && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
          border: '1px solid #6ee7b7',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '0.84rem', color: '#065f46', fontWeight: 700 }}>
            🔒 <strong>Privacidad de Integración PIE Activa:</strong> Solo visualizas la información, evaluaciones y carpetas de tus cursos asignados ({allowedPieCourses.length > 0 ? allowedPieCourses.join(', ') : 'Sin cursos asignados aún'}). La información de los demás cursos está oculta por normativa PIE.
          </div>
        </div>
      )}

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

      {/* PESTAÑA 1: NUEVA PLANIFICACIÓN CON CARGA DIRECTA A GOOGLE DRIVE (CURSO -> ASIGNATURA) */}
      {activeTab === 'nueva' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '940px' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={22} color="#4f46e5" /> Registrar Nueva Planificación de Evaluación
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
            Completa los datos de la prueba. El evento se agendará automáticamente en el <strong>Calendario Institucional de Google</strong> y el archivo se guardará en la carpeta automática del curso y asignatura en <strong>Google Drive ({driveAccountEmail})</strong>.
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
                  <option value="" disabled>-- Seleccione curso --</option>
                  {allAvailableCourses.map(c => (
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
                  {allAvailableSubjects.map(s => (
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
                  🏷️ Tipo de Material / Asignación: *
                </label>
                <select
                  value={newEvalForm.material_type}
                  onChange={e => setNewEvalForm({ ...newEvalForm, material_type: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1.5px solid #6366f1', fontSize: '0.85rem', fontWeight: 700, color: '#1e1b4b', background: '#f5f3ff' }}
                >
                  <option value="Evaluación">📝 Evaluación (Tope máx. 2/día por curso)</option>
                  <option value="Rúbrica">📐 Rúbrica (Tope máx. 2/día por curso)</option>
                  <option value="Guía">📄 Guía de Trabajo / Aprendizaje (Sin límite diario)</option>
                  <option value="Material de Apoyo">📦 Material de Apoyo Pedagógico (Sin límite diario)</option>
                  <option value="Otros">📌 Otros Instrumentos / Actividades (Sin límite diario)</option>
                </select>
              </div>
            </div>

            {/* BANNER PREVENTIVO DE TOPE DIARIO DE EVALUACIONES (MÁXIMO 2 POR DÍA POR CURSO) */}
            {newEvalForm.course_name && newEvalForm.evaluation_date && (
              <div style={{ marginBottom: '1.25rem' }}>
                {isNewEvalBlocked ? (
                  <div style={{
                    background: '#fef2f2',
                    border: '1.5px solid #ef4444',
                    borderRadius: '12px',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.08)'
                  }}>
                    <AlertCircle size={28} color="#dc2626" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#991b1b', marginBottom: '2px' }}>
                        ⛔ Límite Máximo Alcanzado (2/2) para este Curso y Día
                      </div>
                      <div style={{ fontSize: '0.81rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                        El curso <strong>{newEvalForm.course_name}</strong> ya tiene <strong>{newEvalDailyCount} evaluaciones/rúbricas agendadas</strong> para el día <strong>{newEvalForm.evaluation_date}</strong>. La normativa escolar prohíbe más de 2 evaluaciones formales por día.
                        <br />
                        <span style={{ fontWeight: 600 }}>Sugerencia:</span> Selecciona otra fecha o cambia el tipo a <strong>Guía</strong>, <strong>Material de Apoyo</strong> u <strong>Otros</strong> (no sujetos a este tope).
                      </div>
                    </div>
                  </div>
                ) : newEvalCountsTowardsLimit && newEvalDailyCount === 1 ? (
                  <div style={{
                    background: '#fffbeb',
                    border: '1.5px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <AlertTriangle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.81rem', color: '#92400e' }}>
                      <strong>⚠️ Atención (1/2 evaluaciones agendadas):</strong> El curso <strong>{newEvalForm.course_name}</strong> ya registra 1 evaluación formal en esta fecha. Ésta será la <strong>2da y última evaluación permitida</strong> para este día según la normativa escolar.
                    </div>
                  </div>
                ) : newEvalCountsTowardsLimit ? (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '0.6rem 0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}>
                    <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                      <strong>✓ Disponibilidad Completa (0/2 evaluaciones):</strong> El curso <strong>{newEvalForm.course_name}</strong> tiene disponibilidad total para evaluaciones en el día {newEvalForm.evaluation_date}.
                    </div>
                  </div>
                ) : (
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '10px',
                    padding: '0.6rem 0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}>
                    <CheckCircle2 size={20} color="#0284c7" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>
                      <strong>ℹ️ Material No Sujeto a Tope:</strong> Las <strong>Guías</strong>, <strong>Material de Apoyo</strong> y <strong>Otros</strong> no descuentan cupo del límite institucional de 2 evaluaciones diarias por curso.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN DE DERIVACIÓN Y SOLICITUD DE FOTOCOPIADO INSTITUCIONAL */}
            <div style={{
              background: newEvalForm.requires_copies ? '#eff6ff' : '#f8fafc',
              border: newEvalForm.requires_copies ? '1.5px solid #60a5fa' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.15rem',
              marginBottom: '1.5rem',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: newEvalForm.requires_copies ? '1rem' : '0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={newEvalForm.requires_copies}
                    onChange={e => {
                      const checked = e.target.checked;
                      const autoCount = getCourseStudentCount(newEvalForm.course_name);
                      setNewEvalForm(prev => ({
                        ...prev,
                        requires_copies: checked,
                        copies_count: checked ? (prev.copies_count > 0 ? prev.copies_count : autoCount) : prev.copies_count
                      }));
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                  />
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Printer size={18} color="#2563eb" /> ¿Requiere fotocopias o impresión institucional?
                  </span>
                </label>
                {newEvalForm.requires_copies && (
                  <span style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.73rem', fontWeight: 800 }}>
                    ⚡ Requiere Visado UTP previo
                  </span>
                )}
              </div>

              {newEvalForm.requires_copies && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed #bfdbfe' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#1e3a8a', marginBottom: '0.35rem' }}>
                      📄 Cantidad de Copias Requeridas: *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={newEvalForm.copies_count}
                      onChange={e => setNewEvalForm({ ...newEvalForm, copies_count: parseInt(e.target.value, 10) || 0 })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                    <small style={{ color: '#3b82f6', fontSize: '0.72rem', display: 'block', marginTop: '0.25rem' }}>
                      👥 Matrícula estimada en {newEvalForm.course_name || 'este curso'}: <strong>{getCourseStudentCount(newEvalForm.course_name)} estudiantes</strong>.
                    </small>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#1e3a8a', marginBottom: '0.35rem' }}>
                      🖨️ Detalle de Impresión / Observaciones:
                    </label>
                    <input
                      type="text"
                      value={newEvalForm.copies_details}
                      onChange={e => setNewEvalForm({ ...newEvalForm, copies_details: e.target.value })}
                      placeholder="Ej: Blanco y Negro, Doble Faz, Corcheteada superior izq."
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.85rem' }}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.72rem', display: 'block', marginTop: '0.25rem' }}>
                      Indica formato: simple faz, doble faz, color/B&N o instrucciones especiales.
                    </small>
                  </div>

                  <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#475569' }}>
                    🔔 <strong>Circuito Institucional:</strong> Al guardar, la Jefatura de UTP recibirá una notificación con acceso directo a la prueba para su <strong>visado</strong>. Tras el visto bueno, pasará a la cola de fotocopiado y recibirás un aviso cuando estén impresas.
                  </div>
                </div>
              )}
            </div>

            {/* CAJA DE SUBIDA DE ARCHIVO A GOOGLE DRIVE CON RUTA AUTOMÁTICA POR CURSO Y ASIGNATURA */}
            <div style={{
              background: '#f8fafc',
              border: '1px dashed #94a3b8',
              borderRadius: '12px',
              padding: '1.15rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <label style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Upload size={17} color="#4f46e5" /> 📎 Subir Instrumento de Evaluación Original a Google Drive (Opcional al planificar):
                </label>
                <span style={{
                  background: '#eef2ff',
                  color: '#4338ca',
                  border: '1px solid #c7d2fe',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Folder size={13} /> Destino automático: Evaluaciones Originales / {newEvalForm.course_name || '[Curso]'} / {newEvalForm.subject_name || '[Asignatura]'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <input
                    ref={newEvalFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.ppt,.pptx,.xls,.xlsx"
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      setNewEvalSelectedFile(f);
                      if (f) {
                        setNewEvalForm(prev => ({ ...prev, original_file_name: f.name }));
                      }
                    }}
                    style={{ width: '100%', padding: '0.45rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                  {newEvalSelectedFile && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.76rem', color: '#047857', fontWeight: 700 }}>
                      ✓ Archivo listo para subir a Google Drive: {newEvalSelectedFile.name} ({(newEvalSelectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={newEvalForm.original_file_url}
                    onChange={e => setNewEvalForm({ ...newEvalForm, original_file_url: e.target.value, original_file_name: newEvalForm.original_file_name || (e.target.value ? 'Evaluacion_Original.pdf' : '') })}
                    placeholder="O pega un enlace externo de Google Drive (opcional)"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>
              </div>
              <small style={{ display: 'block', marginTop: '0.45rem', color: '#64748b', fontSize: '0.74rem' }}>
                Formatos admitidos: Word (.doc, .docx), PDF (.pdf), Imágenes (.jpg, .png). Si aún no tienes el archivo listo, puedes dejarlo en blanco y subirlo después en la pestaña <strong>&quot;4. Archivos Pendientes&quot;</strong>.
              </small>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                disabled={loading || isNewEvalBlocked}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  opacity: isNewEvalBlocked ? 0.6 : 1,
                  cursor: isNewEvalBlocked ? 'not-allowed' : 'pointer',
                  background: isNewEvalBlocked ? '#94a3b8' : undefined
                }}
              >
                {loading ? 'Sincronizando con Google Drive y Calendar...' : isNewEvalBlocked ? '⛔ No disponible (Límite 2/2 evaluaciones alcanzado)' : '🚀 Guardar Planificación y Sincronizar con Google'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: CALENDARIO INTERNO INSTITUCIONAL (MENSUAL Y SEMANAL POR BLOQUES) */}
      {activeTab === 'calendario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Barra de Controles y Filtros del Calendario Interno */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.18rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={21} color="#4f46e5" /> Calendario Interno de Evaluaciones y Actividades ({calendarFilteredEvaluations.length})
                  </h3>
                  <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.18rem 0.6rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800 }}>
                    ● Calendario Nativo Integrado (Sin requerir inicio de sesión externo)
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Haz clic sobre cualquier evaluación para ver/descargar sus archivos de Google Drive o sobre un espacio libre para planificar una nueva evaluación.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('monthly')}
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: calendarViewMode === 'monthly' ? '#4f46e5' : 'transparent',
                    color: calendarViewMode === 'monthly' ? '#ffffff' : '#475569'
                  }}
                >
                  🗓️ Vista Mensual Completa
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('weekly_blocks')}
                  style={{
                    padding: '0.42rem 0.85rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: calendarViewMode === 'weekly_blocks' ? '#4f46e5' : 'transparent',
                    color: calendarViewMode === 'weekly_blocks' ? '#ffffff' : '#475569'
                  }}
                >
                  ⏰ Vista Semanal por Bloques
                </button>
              </div>
            </div>

            {/* Filtros por Curso y Asignatura en el Calendario */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={14} color="#4f46e5" /> Filtrar Calendario:
              </span>
              <select
                value={calendarCourseFilter}
                onChange={e => setCalendarCourseFilter(e.target.value)}
                style={{ padding: '0.42rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, background: '#ffffff' }}
              >
                <option value="">📚 Todos los Cursos ({allAvailableCourses.length})</option>
                {allAvailableCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={calendarSubjectFilter}
                onChange={e => setCalendarSubjectFilter(e.target.value)}
                style={{ padding: '0.42rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, background: '#ffffff' }}
              >
                <option value="">📖 Todas las Asignaturas ({allAvailableSubjects.length})</option>
                {allAvailableSubjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {(calendarCourseFilter || calendarSubjectFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setCalendarCourseFilter('');
                    setCalendarSubjectFilter('');
                  }}
                  style={{ padding: '0.38rem 0.7rem', borderRadius: '8px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#be123c', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Limpiar filtros
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', fontSize: '0.74rem', fontWeight: 700, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#166534' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Adecuado PIE
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3730a3' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} /> Original Subido
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b45309' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Pendiente Archivo
                </span>
              </div>
            </div>

            {/* MODO A: GRILLA MENSUAL INTERACTIVA DE EVALUACIONES Y ACTIVIDADES */}
            {calendarViewMode === 'monthly' && (
              <div style={{ marginTop: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                      style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      title="Mes anterior"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', minWidth: '170px', textAlign: 'center' }}>
                      {MONTH_NAMES_ES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                      style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      title="Mes siguiente"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setCalendarMonth(new Date())}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Ir al Mes Actual
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('nueva')}
                      style={{ padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PlusCircle size={14} /> Nueva Evaluación / Actividad
                    </button>
                  </div>
                </div>

                {/* Cabecera Lunes a Domingo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', marginBottom: '6px' }}>
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dayName => (
                    <div key={dayName} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#475569', padding: '0.35rem', background: '#f1f5f9', borderRadius: '6px' }}>
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Celdas del Mes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px' }}>
                  {calendarGridDays.map(cell => {
                    const dayEvals = evaluationsByDateMap.get(cell.dateStr) || [];
                    const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          if (dayEvals.length > 0) {
                            setSelectedDayEvaluations({ dateStr: cell.dateStr, items: dayEvals });
                          } else {
                            setNewEvalForm(prev => ({ ...prev, evaluation_date: cell.dateStr }));
                            setActiveTab('nueva');
                          }
                        }}
                        style={{
                          minHeight: '108px',
                          background: !cell.isCurrentMonth ? '#f8fafc' : isToday ? '#eef2ff' : '#ffffff',
                          border: isToday ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '0.4rem',
                          opacity: cell.isCurrentMonth ? 1 : 0.55,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          overflow: 'hidden'
                        }}
                        title={dayEvals.length > 0 ? `Ver ${dayEvals.length} evaluación(es) del ${cell.dateStr}` : `Clic para planificar evaluación el ${cell.dateStr}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            color: isToday ? '#4f46e5' : '#334155',
                            background: isToday ? '#e0e7ff' : 'transparent',
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}>
                            {cell.dayNumber}
                          </span>
                          {dayEvals.length > 0 ? (
                            <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#1e1b4b', color: '#ffffff', padding: '1px 5px', borderRadius: '999px' }}>
                              {dayEvals.length}
                            </span>
                          ) : (
                            cell.isCurrentMonth && (
                              <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>+ Agendar</span>
                            )
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '78px' }}>
                          {dayEvals.slice(0, 3).map(ev => {
                            const isPieDone = ev.status === 'Adecuado PIE' || Boolean(ev.pie_file_url);
                            const isOrigDone = Boolean(ev.original_file_url);
                            const bg = isPieDone ? '#dcfce7' : isOrigDone ? '#e0e7ff' : '#fef3c7';
                            const fg = isPieDone ? '#166534' : isOrigDone ? '#3730a3' : '#92400e';
                            return (
                              <div
                                key={ev.id}
                                style={{
                                  background: bg,
                                  color: fg,
                                  fontSize: '0.67rem',
                                  fontWeight: 700,
                                  padding: '2px 5px',
                                  borderRadius: '5px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={`${ev.course_name} - ${ev.subject_name}: ${ev.evaluation_title} (${ev.material_type || 'Evaluación'})${ev.requires_copies ? ' • Requiere ' + (ev.copies_count || 0) + ' copias [' + (ev.photocopy_status || 'Pendiente') + ']' : ''}`}
                              >
                                <span style={{ opacity: 0.85, fontSize: '0.62rem', marginRight: '3px' }}>
                                  [{ev.material_type ? ev.material_type.slice(0, 3) : 'Ev'}]
                                </span>
                                {ev.course_name}: {ev.subject_name}
                                {ev.requires_copies && (ev.photocopy_status === 'Listo para Retiro' ? ' 🖨️✓' : ' 🖨️')}
                              </div>
                            );
                          })}
                          {dayEvals.length > 3 && (
                            <div style={{ fontSize: '0.65rem', color: '#4f46e5', fontWeight: 800, textAlign: 'center' }}>
                              +{dayEvals.length - 3} más (ver)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODO B: VISTA SEMANAL POR BLOQUES (LUNES A VIERNES x 1° A 5° BLOQUE) */}
            {calendarViewMode === 'weekly_blocks' && (() => {
              const weekDaysList: Array<{ dateStr: string; dayName: string; dayNum: string; monthShort: string; isToday: boolean }> = [];
              const dayLabels = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
              const todayYMD = new Date().toISOString().split('T')[0];
              for (let i = 0; i < 5; i++) {
                const d = new Date(calendarWeekStart.getFullYear(), calendarWeekStart.getMonth(), calendarWeekStart.getDate() + i);
                const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                weekDaysList.push({
                  dateStr: ds,
                  dayName: dayLabels[i],
                  dayNum: String(d.getDate()).padStart(2, '0'),
                  monthShort: MONTH_NAMES_ES[d.getMonth()].slice(0, 3),
                  isToday: ds === todayYMD
                });
              }

              return (
                <div style={{ marginTop: '1.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(calendarWeekStart);
                          prev.setDate(prev.getDate() - 7);
                          setCalendarWeekStart(prev);
                        }}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        <ChevronLeft size={16} /> Semana Anterior
                      </button>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', padding: '0 0.5rem' }}>
                        Semana del {weekDaysList[0]?.dayNum} {weekDaysList[0]?.monthShort} al {weekDaysList[4]?.dayNum} {weekDaysList[4]?.monthShort} {calendarWeekStart.getFullYear()}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(calendarWeekStart);
                          next.setDate(next.getDate() + 7);
                          setCalendarWeekStart(next);
                        }}
                        style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        Semana Siguiente <ChevronRight size={16} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const day = d.getDay();
                        const diff = day === 0 ? -6 : 1 - day;
                        d.setDate(d.getDate() + diff);
                        setCalendarWeekStart(d);
                      }}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Ir a Esta Semana
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px', minWidth: '680px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '150px', padding: '0.55rem', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 800, color: '#334155', textAlign: 'center' }}>
                            Bloque Horario
                          </th>
                          {weekDaysList.map(d => (
                            <th
                              key={d.dateStr}
                              style={{
                                padding: '0.55rem',
                                background: d.isToday ? '#eef2ff' : '#f8fafc',
                                border: d.isToday ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                                borderRadius: '8px',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: d.isToday ? '#4f46e5' : '#0f172a' }}>{d.dayName}</div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: d.isToday ? '#4338ca' : '#64748b' }}>{d.dayNum} {d.monthShort}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {BLOCKS.map((blockLabel, bIdx) => {
                          const blockNumStr = `${bIdx + 1}° Bloque`;
                          const blockAltStr = `Bloque ${bIdx + 1}`;
                          return (
                            <tr key={blockLabel}>
                              <td style={{ padding: '0.65rem 0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e1b4b' }}>{blockLabel.split('(')[0].trim()}</div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4f46e5' }}>{blockLabel.includes('(') ? `(${blockLabel.split('(')[1]}` : ''}</div>
                              </td>
                              {weekDaysList.map(d => {
                                const dayEvals = (evaluationsByDateMap.get(d.dateStr) || []).filter(ev => {
                                  const bl = String(ev.block_label || '');
                                  if (bl === blockLabel || bl.includes(blockNumStr) || bl.includes(blockAltStr)) return true;
                                  if (bIdx === 0 && !bl) return true;
                                  return false;
                                });

                                return (
                                  <td
                                    key={`${d.dateStr}-${blockLabel}`}
                                    style={{
                                      padding: '0.5rem',
                                      background: dayEvals.length > 0 ? '#ffffff' : '#f8fafc',
                                      border: dayEvals.length > 0 ? '1px solid #c7d2fe' : '1px dashed #cbd5e1',
                                      borderRadius: '10px',
                                      verticalAlign: 'top',
                                      minHeight: '78px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {dayEvals.map(ev => {
                                        const isPieDone = ev.status === 'Adecuado PIE' || Boolean(ev.pie_file_url);
                                        const isOrigDone = Boolean(ev.original_file_url);
                                        const bg = isPieDone ? '#dcfce7' : isOrigDone ? '#e0e7ff' : '#fef3c7';
                                        const fg = isPieDone ? '#166534' : isOrigDone ? '#3730a3' : '#92400e';
                                        return (
                                          <div
                                            key={ev.id}
                                            onClick={() => setSelectedDayEvaluations({ dateStr: d.dateStr, items: [ev] })}
                                            style={{
                                              background: bg,
                                              color: fg,
                                              padding: '0.35rem 0.45rem',
                                              borderRadius: '6px',
                                              fontSize: '0.7rem',
                                              fontWeight: 700,
                                              cursor: 'pointer',
                                              border: '1px solid rgba(0,0,0,0.06)'
                                            }}
                                            title="Clic para ver archivos y detalles"
                                          >
                                            <div style={{ fontWeight: 800 }}>{ev.course_name} • {ev.subject_name}</div>
                                            <div style={{ fontSize: '0.66rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {ev.evaluation_title}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewEvalForm(prev => ({
                                            ...prev,
                                            evaluation_date: d.dateStr,
                                            block_label: blockLabel,
                                            course_name: calendarCourseFilter || prev.course_name,
                                            subject_name: calendarSubjectFilter || prev.subject_name
                                          }));
                                          setActiveTab('nueva');
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#64748b',
                                          fontSize: '0.67rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          padding: '3px 0',
                                          textAlign: 'center'
                                        }}
                                      >
                                        + Agendar aquí
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
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

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={tableCourseFilter}
                onChange={e => setTableCourseFilter(e.target.value)}
                style={{ padding: '0.38rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}
              >
                <option value="">Todos los Cursos</option>
                {allAvailableCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={tableSubjectFilter}
                onChange={e => setTableSubjectFilter(e.target.value)}
                style={{ padding: '0.38rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}
              >
                <option value="">Todas las Asignaturas</option>
                {allAvailableSubjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

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
          </div>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Evaluación / Asignatura</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Curso</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Fecha Aplicación</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Bloque</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Carpeta Drive & Archivos</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Plazos (7d Docente / 3d PIE)</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {displayedEvaluations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No hay evaluaciones registradas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  displayedEvaluations.map(ev => {
                    const dl = evalDeadlinesMap.get(ev.id);
                    const folderLabel = ev.original_folder_path || `Evaluaciones Originales / ${ev.course_name} / ${ev.subject_name}`;
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
                          <div style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Folder size={12} color="#4f46e5" /> {folderLabel}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span style={{
                              padding: '0.18rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: ev.status === 'Adecuado PIE' ? '#dcfce7' : ev.status === 'Completado' ? '#e0e7ff' : '#fef3c7',
                              color: ev.status === 'Adecuado PIE' ? '#166534' : ev.status === 'Completado' ? '#3730a3' : '#b45309'
                            }}>
                              {ev.status}
                            </span>
                            {(ev.original_file_name || ev.original_file_url) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEvaluationDocument(ev, 'original')}
                                style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                title="Abrir y descargar documento de la prueba"
                              >
                                <Eye size={11} /> Ver Prueba
                              </button>
                            )}
                          </div>
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
            Selecciona cualquier evaluación pendiente para subir su archivo (Word, PDF o Imagen) directamente desde tu computador a la carpeta automática del curso y asignatura en Google Drive.
          </p>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#fffbeb', borderBottom: '2px solid #fde68a' }}>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Evaluación</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Curso / Asignatura (Carpeta Drive)</th>
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
                          <strong>{ev.course_name}</strong> • {ev.subject_name}
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            📁 Evaluaciones Originales / {ev.course_name} / {ev.subject_name}
                          </div>
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
                              setPendingSelectedFile(null);
                            }}
                            style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Upload size={13} /> Subir a Drive
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
              <Puzzle size={22} color="#059669" /> Módulo de Integración y Adecuaciones PIE (Carpeta PIE Aparte en Google Drive)
            </h3>
            <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontWeight: 800 }}>
              📁 Evaluaciones PIE Aparte / [Curso] / [Asignatura]
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
            Revisa las evaluaciones originales subidas por los docentes de aula y sube la evaluación adaptada PIE desde tu computador. Se organizará automáticamente en la carpeta exclusiva PIE por curso y asignatura.
          </p>

          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #bbf7d0' }}>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Docente / Asignatura</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Curso</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Fecha</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Prueba Original</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Estado PIE & Carpeta</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Alerta Plazo PIE (3 días)</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones PIE</th>
                </tr>
              </thead>
              <tbody>
                {displayedEvaluations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No hay evaluaciones registradas en el sistema.
                    </td>
                  </tr>
                ) : (
                  displayedEvaluations.map(ev => {
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
                            <button
                              type="button"
                              onClick={() => handleOpenEvaluationDocument(ev, 'original')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                              title="Abrir instrumento original"
                            >
                              <FileText size={12} /> Ver Original
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin Archivo</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '0.22rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: hasPie ? '#dcfce7' : '#fef3c7',
                            color: hasPie ? '#166534' : '#b45309',
                            border: hasPie ? '1px solid #bbf7d0' : '1px solid #fde68a'
                          }}>
                            {hasPie ? '✓ Adecuado PIE' : '⏳ Pendiente PIE'}
                          </span>
                          <div style={{ fontSize: '0.68rem', color: '#047857', marginTop: '2px' }}>
                            📁 PIE Aparte / {ev.course_name} / {ev.subject_name}
                          </div>
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
                                setPieSelectedFile(null);
                              }}
                              style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Upload size={13} /> {hasPie ? 'Reemplazar PIE' : 'Subir PIE'}
                            </button>

                            {hasPie && (
                              <button
                                type="button"
                                onClick={() => handleOpenEvaluationDocument(ev, 'pie')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '0.3rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                title="Abrir adecuación PIE"
                              >
                                <Eye size={13} /> Ver PIE
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

      {/* PESTAÑA 6: EXPLORADOR DE CARPETAS AUTOMÁTICAS EN GOOGLE DRIVE (CURSO -> ASIGNATURA / PIE APARTE / PERFILES CODIFICADOS) */}
      {activeTab === 'carpetas' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#0284c7', margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={22} color="#0284c7" /> Estructura Automática de Carpetas en Google Drive ({driveAccountEmail})
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                Las carpetas se generan automáticamente por cada <strong>Curso</strong> y dentro de cada curso por cada <strong>Asignatura</strong>, manteniendo las <strong>Evaluaciones PIE en una carpeta aparte</strong> y las <strong>Imágenes de Perfil codificadas</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={syncingGoogle}
                onClick={handleSyncWithGoogle}
                style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', background: '#0284c7', color: '#ffffff', border: 'none', fontSize: '0.78rem', fontWeight: 800, cursor: syncingGoogle ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(2,132,199,0.25)' }}
              >
                <RefreshCw size={13} /> {syncingGoogle ? 'Sincronizando archivos y calendarios...' : `Sincronizar Todo con ${driveAccountEmail}`}
              </button>
              <a
                href="https://drive.google.com/drive/folders/1KfDCGyuM4oGPsr5KeUFWaW6U-1FnJlJJ"
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontSize: '0.78rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                🗂️ Abrir Carpeta Maestra General <ExternalLink size={13} />
              </a>
              <a
                href={`https://drive.google.com/drive/folders/${folderOriginalsId}`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                📂 Abrir Planificaciones y Evaluaciones <ExternalLink size={13} />
              </a>
              <a
                href={`https://drive.google.com/drive/folders/${folderPieId}`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                🧩 Abrir Evaluaciones PIE <ExternalLink size={13} />
              </a>
              <a
                href="https://drive.google.com/drive/folders/1Rz6EUbKV0Y9MjHH9Z8JF8Nl6iqh9mY3M"
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                🔒 Abrir Carpeta Perfiles <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Banner de Rutas y API Bloqueadas Permanentemente */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.85rem 1.1rem', marginBottom: '1.15rem', fontSize: '0.78rem', color: '#14532d' }}>
            <div style={{ fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} color="#15803d" /> Carpeta Maestra Única en Google Drive (<code>1KfDCGyuM4oGPsr5KeUFWaW6U-1FnJlJJ</code>) — Todas las subcarpetas bloqueadas e inmutables:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.45rem', color: '#166534' }}>
              <div>• <strong>Carpeta Maestra Raíz:</strong> <code>1KfDCGyuM4oGPsr5KeUFWaW6U-1FnJlJJ</code></div>
              <div>• <strong>Evaluaciones Originales:</strong> <code>1aDa7NJRpNvZpZstzjs4uVJYxCWBOolRO</code> (<code>[Curso] → [Asignatura]</code>)</div>
              <div>• <strong>Evaluaciones PIE Aparte:</strong> <code>1jlMg2sJUUFlabfHmA19-yKS0PEjn0cTU</code> (<code>[Curso] → [Asignatura]</code>)</div>
              <div>• <strong>Files - Perfiles (Avatares):</strong> <code>1Rz6EUbKV0Y9MjHH9Z8JF8Nl6iqh9mY3M</code> (<code>AVT_...jpg</code>)</div>
              <div>• <strong>Calendarios Institucionales:</strong> <code>1fj8WZZzOjzpPQE98mBYFsLuAMUh_cDMO</code></div>
              <div>• <strong>Informes Personalidad/Hogar:</strong> <code>1fGCRgIwvBc2QEUfhg62_Bu0V8l1omjjt</code></div>
              <div>• <strong>Salidas Pedagógicas:</strong> <code>1rg593Kjly91oyHQ9YwUPIvV3YHQqouXZ</code></div>
              <div>• <strong>Expedientes y Documentos LTP:</strong> <code>1pNzZssbwkTC6CfK_uhwDqjBLZNqbz8VK</code></div>
            </div>
          </div>

          {/* Selector de Bóveda Raíz */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setSelectedFolderRoot('originals'); setSelectedFolderCourse(''); }}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: selectedFolderRoot === 'originals' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                background: selectedFolderRoot === 'originals' ? '#e0f2fe' : '#f8fafc',
                color: selectedFolderRoot === 'originals' ? '#0369a1' : '#475569',
                fontWeight: 800,
                fontSize: '0.83rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Folder size={16} /> 1. Evaluaciones Originales (Curso → Asignatura)
            </button>

            <button
              type="button"
              onClick={() => { setSelectedFolderRoot('pie'); setSelectedFolderCourse(''); }}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: selectedFolderRoot === 'pie' ? '2px solid #059669' : '1px solid #cbd5e1',
                background: selectedFolderRoot === 'pie' ? '#dcfce7' : '#f8fafc',
                color: selectedFolderRoot === 'pie' ? '#065f46' : '#475569',
                fontWeight: 800,
                fontSize: '0.83rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Puzzle size={16} /> 2. Evaluaciones PIE Aparte (Curso → Asignatura)
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolderRoot('profiles')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: selectedFolderRoot === 'profiles' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                background: selectedFolderRoot === 'profiles' ? '#e0e7ff' : '#f8fafc',
                color: selectedFolderRoot === 'profiles' ? '#3730a3' : '#475569',
                fontWeight: 800,
                fontSize: '0.83rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock size={16} /> 3. Carpeta Files / Perfiles (Imágenes de Perfil)
            </button>

            <button
              type="button"
              onClick={() => setSelectedFolderRoot('calendars')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: selectedFolderRoot === 'calendars' ? '2px solid #d97706' : '1px solid #cbd5e1',
                background: selectedFolderRoot === 'calendars' ? '#fef3c7' : '#f8fafc',
                color: selectedFolderRoot === 'calendars' ? '#92400e' : '#475569',
                fontWeight: 800,
                fontSize: '0.83rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CalendarIcon size={16} /> 4. Calendarios y Archivos ({driveAccountEmail})
            </button>
          </div>

          {loadingFolders ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando estructura de carpetas de Google Drive...</div>
          ) : selectedFolderRoot === 'profiles' ? (
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#1e1b4b', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={17} color="#4f46e5" /> Carpeta <code>Files / Perfiles</code> — Imágenes de Perfil con Codificación Interna
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                Todas las fotos de perfil de los usuarios quedan almacenadas dentro de la carpeta <code>Files / Perfiles</code> de la cuenta institucional (<code>{driveAccountEmail}</code>) con un nombre aleatorio criptográfico (ej. <code>AVT_4FBC569116AB7295.jpg</code>) codificado internamente por la plataforma.
              </p>
              {driveFoldersData?.rootFolders?.profiles?.encodedFiles?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                  {driveFoldersData.rootFolders.profiles.encodedFiles.map((item: any) => (
                    <div key={item.vaultId} style={{ background: '#ffffff', padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ width: '54px', height: '54px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #4f46e5', background: '#eef2ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={item.fileUrl}
                          alt={item.randomDriveCode}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3730a3', fontFamily: 'monospace' }}>
                          🔒 {item.randomDriveCode}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Carpeta: <code>{item.folderPath || 'Files / Perfiles'}</code>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Asociado a: <strong>{item.uploadedBy}</strong>
                        </div>
                        <div style={{ marginTop: '4px', display: 'flex', gap: '6px' }}>
                          <a
                            href={item.driveFileId || item.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            Ver imagen en Files / Perfiles <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
                  La carpeta <code>Files / Perfiles</code> está activa. Al actualizar una foto en &quot;Personalizar mi perfil&quot;, aparecerá registrada aquí con su código aleatorio.
                </div>
              )}
            </div>
          ) : selectedFolderRoot === 'calendars' ? (
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#78350f', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={17} color="#d97706" /> Calendarios y Archivos Necesarios Traspasados a <code>{driveAccountEmail}</code>
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                Aquí se almacenan los calendarios institucionales (Evaluaciones y Uso Sala de Computación) junto con el manifiesto integral de todos los archivos traspasados a la cuenta institucional <strong>{driveAccountEmail}</strong>.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
                {(driveFoldersData?.rootFolders?.calendars?.files || []).map((cf: any) => (
                  <div key={cf.vaultId} style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #fde68a', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📅 {cf.originalName}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#475569' }}>
                      Carpeta: <code>{cf.folderPath}</code>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Cuenta propietaria: <strong>{cf.uploadedBy}</strong>
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <a
                        href={cf.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '7px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontSize: '0.73rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        Descargar / Ver Archivo Respaldado <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            (() => {
              const coursesTree = selectedFolderRoot === 'originals'
                ? (driveFoldersData?.rootFolders?.originals?.courses || {})
                : (driveFoldersData?.rootFolders?.pie?.courses || {});
              const courseKeys = sortCoursesList(Object.keys(coursesTree));
              const activeCourse = selectedFolderCourse && coursesTree[selectedFolderCourse]
                ? selectedFolderCourse
                : (courseKeys[0] || '');
              const subjectsMap = activeCourse ? (coursesTree[activeCourse] || {}) : {};

              return (
                <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '1.25rem' }}>
                  {/* Columna Izquierda: Carpetas por Curso */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.85rem', border: '1px solid #e2e8f0', maxHeight: '520px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                      📁 Carpetas por Curso ({courseKeys.length})
                    </div>
                    {courseKeys.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '0.5rem' }}>Sin carpetas registradas aún.</div>
                    ) : (
                      courseKeys.map(cName => {
                        const subjKeys = Object.keys(coursesTree[cName] || {});
                        const totalFiles = subjKeys.reduce((acc, sk) => acc + (coursesTree[cName][sk]?.length || 0), 0);
                        const isSelected = cName === activeCourse;
                        return (
                          <button
                            key={cName}
                            type="button"
                            onClick={() => setSelectedFolderCourse(cName)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '0.55rem 0.7rem',
                              marginBottom: '0.35rem',
                              borderRadius: '8px',
                              border: isSelected ? '1px solid #0284c7' : '1px solid transparent',
                              background: isSelected ? '#e0f2fe' : '#ffffff',
                              color: isSelected ? '#0369a1' : '#1e293b',
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <Folder size={15} color={isSelected ? '#0284c7' : '#f59e0b'} /> {cName}
                            </span>
                            <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                              {totalFiles} arch.
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Columna Derecha: Subcarpetas por Asignatura dentro del Curso */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.1rem', border: '1px solid #e2e8f0', maxHeight: '520px', overflowY: 'auto' }}>
                    {!activeCourse ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Selecciona un curso para explorar sus carpetas de asignaturas.</div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FolderOpen size={18} color="#0284c7" />
                          {selectedFolderRoot === 'originals' ? 'Evaluaciones Originales' : 'Evaluaciones PIE Aparte'} / <span style={{ color: '#0284c7' }}>{activeCourse}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          {Object.keys(subjectsMap).map(subjName => {
                            const filesList = subjectsMap[subjName] || [];
                            return (
                              <div key={subjName} style={{ background: '#ffffff', borderRadius: '10px', padding: '0.9rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                  <strong style={{ fontSize: '0.85rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Folder size={15} color="#4f46e5" /> Subcarpeta Asignatura: {subjName}
                                  </strong>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                                    {filesList.length} {filesList.length === 1 ? 'archivo en Drive' : 'archivos en Drive'}
                                  </span>
                                </div>

                                {filesList.length === 0 ? (
                                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Carpeta creada para evaluaciones planificadas (pendiente de carga de archivo).
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem' }}>
                                    {filesList.map((f: any) => (
                                      <a
                                        key={f.id}
                                        href={f.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          padding: '0.45rem 0.65rem',
                                          borderRadius: '8px',
                                          background: '#f8fafc',
                                          border: '1px solid #cbd5e1',
                                          textDecoration: 'none',
                                          color: '#1e293b',
                                          fontSize: '0.76rem'
                                        }}
                                      >
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: '0.4rem' } as any}>
                                          <div style={{ fontWeight: 700, color: '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            📄 {f.fileName}
                                          </div>
                                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                            Fecha: {f.evaluationDate} • {f.teacherName || f.pieTeacherName}
                                          </div>
                                        </div>
                                        <ExternalLink size={13} color="#0284c7" style={{ flexShrink: 0 }} />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* 7. VISADO UTP Y CENTRO DE FOTOCOPIADO */}
      {activeTab === 'visado_fotocopias' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {/* Header y Descripción */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#0891b2', margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={22} color="#0891b2" /> 7. Visado UTP y Centro de Fotocopiado Institucional
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
                Gestión integral del circuito pedagógico: revisión y visado por Jefatura de UTP / Dirección, y cola de impresión para el personal de fotocopiado con descarga directa de instrumentos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={loadEvaluations}
                style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} /> Actualizar Lista
              </button>
            </div>
          </div>

          {/* Tarjetas KPI de Estado / Filtros Rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setVisadoFilterStatus('all')}
              style={{
                background: visadoFilterStatus === 'all' ? '#0891b2' : '#f8fafc',
                color: visadoFilterStatus === 'all' ? '#ffffff' : '#1e293b',
                border: visadoFilterStatus === 'all' ? '2px solid #0e7490' : '1px solid #cbd5e1',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9 }}>🌐 Todas las Evaluaciones</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900 }}>{evaluations.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setVisadoFilterStatus('with_copies')}
              style={{
                background: visadoFilterStatus === 'with_copies' ? '#2563eb' : '#f8fafc',
                color: visadoFilterStatus === 'with_copies' ? '#ffffff' : '#1e293b',
                border: visadoFilterStatus === 'with_copies' ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9 }}>🖨️ Con Fotocopias</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900 }}>{evaluations.filter(e => e.requires_copies).length}</span>
            </button>

            <button
              type="button"
              onClick={() => setVisadoFilterStatus('pending_utp')}
              style={{
                background: visadoFilterStatus === 'pending_utp' ? '#dc2626' : '#fff1f2',
                color: visadoFilterStatus === 'pending_utp' ? '#ffffff' : '#991b1b',
                border: visadoFilterStatus === 'pending_utp' ? '2px solid #b91c1c' : '1px solid #fecaca',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9 }}>⏳ Por Visar UTP</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900 }}>{pendingUtpCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setVisadoFilterStatus('queue_copies')}
              style={{
                background: visadoFilterStatus === 'queue_copies' ? '#d97706' : '#fffbeb',
                color: visadoFilterStatus === 'queue_copies' ? '#ffffff' : '#92400e',
                border: visadoFilterStatus === 'queue_copies' ? '2px solid #b45309' : '1px solid #fde68a',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9 }}>📑 En Cola Fotocopiado</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900 }}>{queueCopiesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setVisadoFilterStatus('ready_copies')}
              style={{
                background: visadoFilterStatus === 'ready_copies' ? '#16a34a' : '#f0fdf4',
                color: visadoFilterStatus === 'ready_copies' ? '#ffffff' : '#166534',
                border: visadoFilterStatus === 'ready_copies' ? '2px solid #15803d' : '1px solid #bbf7d0',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9 }}>✅ Fotocopias Listas</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900 }}>{readyCopiesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setVisadoFilterStatus('rejected')}
              style={{
                background: visadoFilterStatus === 'rejected' ? '#64748b' : '#f8fafc',
                color: visadoFilterStatus === 'rejected' ? '#ffffff' : '#475569',
                border: visadoFilterStatus === 'rejected' ? '2px solid #475569' : '1px solid #cbd5e1',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '0.74rem', fontWeight: 700, opacity: 0.9 }}>⚠️ Devueltas / Obs.</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900 }}>{rejectedCount}</span>
            </button>
          </div>

          {/* Barra de Búsqueda */}
          <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Buscar por título de evaluación, curso, asignatura o docente..."
                value={visadoSearchQuery}
                onChange={(e) => setVisadoSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem'
                }}
              />
              {visadoSearchQuery && (
                <button
                  type="button"
                  onClick={() => setVisadoSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Evaluaciones para Visado y Fotocopias */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Instrumento / Tipo</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Curso y Asignatura</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Fecha / Bloque</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Docente</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Fotocopias</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Estado Visado UTP</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Documento</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisadoList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                      <Printer size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4, display: 'block' }} />
                      No se encontraron evaluaciones con el filtro seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredVisadoList.map(ev => {
                    const matType = ev.material_type || 'Evaluación';
                    const hasFile = Boolean(ev.original_file_name || ev.original_file_url);
                    const isUtpApproved = ev.utp_status === 'Visado';
                    const isUtpRejected = ev.utp_status === 'Rechazado';
                    const isUtpPending = !ev.utp_status || ev.utp_status === 'Pendiente';
                    const isCopiesReady = ev.photocopy_status === 'Listo para Retiro';

                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9', background: isUtpRejected ? '#fff5f5' : 'transparent' }}>
                        {/* 1. Título y Tipo */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: matType === 'Evaluación' ? '#fee2e2' : matType === 'Rúbrica' ? '#fef3c7' : '#e0e7ff',
                              color: matType === 'Evaluación' ? '#991b1b' : matType === 'Rúbrica' ? '#92400e' : '#3730a3'
                            }}>
                              {matType}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {ev.status === 'Adecuado PIE' ? '🧩 PIE' : '📘 Regular'}
                            </span>
                          </div>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{ev.evaluation_title}</strong>
                        </td>

                        {/* 2. Curso y Asignatura */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#1e293b' }}>{ev.course_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.subject_name}</div>
                        </td>

                        {/* 3. Fecha y Bloque */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{ev.evaluation_date}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ev.block_label}</div>
                        </td>

                        {/* 4. Docente */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: '#334155' }}>{ev.teacher_name}</div>
                        </td>

                        {/* 5. Fotocopias Solicitadas */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {ev.requires_copies ? (
                            <div>
                              <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 6px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>
                                🖨️ {ev.copies_count || 0} copias
                              </span>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                {ev.copies_details || 'B&N Doble Faz'}
                              </div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isCopiesReady ? '#16a34a' : '#d97706', marginTop: '2px' }}>
                                {isCopiesReady ? '✓ Listas para retiro' : isUtpApproved ? '⏳ En cola de fotocopiado' : '⏳ Esperando visado'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              No requiere fotocopias
                            </span>
                          )}
                        </td>

                        {/* 6. Estado Visado UTP */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {isUtpApproved ? (
                            <div>
                              <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={13} /> Visado por UTP
                              </span>
                              {ev.utp_approved_by && (
                                <div style={{ fontSize: '0.68rem', color: '#15803d', marginTop: '2px' }}>
                                  Por: {ev.utp_approved_by}
                                </div>
                              )}
                            </div>
                          ) : isUtpRejected ? (
                            <div>
                              <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <X size={13} /> Observado / Devuelto
                              </span>
                              {ev.utp_notes && (
                                <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '3px', maxWidth: '200px', whiteSpace: 'normal', fontStyle: 'italic' }}>
                                  &quot;{ev.utp_notes}&quot;
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} /> Pendiente Visado
                            </span>
                          )}
                        </td>

                        {/* 7. Documento / Descarga */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {hasFile ? (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEvaluationDocument(ev, 'original')}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '6px',
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Abrir visor interactivo del documento"
                                >
                                  <Eye size={13} /> Ver / Abrir
                                </button>
                                <a
                                  href={`/api/evaluations/${ev.id}/file?type=original`}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={ev.original_file_name || 'instrumento.docx'}
                                  style={{
                                    padding: '0.35rem 0.55rem',
                                    borderRadius: '6px',
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Descargar archivo físico directo"
                                >
                                  <FileText size={12} /> Descargar
                                </a>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.73rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                Sin archivo subido
                              </span>
                            )}

                            {ev.pie_file_name && (
                              <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEvaluationDocument(ev, 'pie')}
                                  style={{
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '5px',
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <Puzzle size={11} /> Ver PIE
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 8. Acciones de Visado UTP y Fotocopiado */}
                        <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {/* Botones para Jefe de UTP / Administrador / Director */}
                            {isUtpPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUtpVisa(ev, 'approve')}
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    background: '#059669',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                                  }}
                                  title="Dar Visto Bueno Pedagógico y derivar a Fotocopiado"
                                >
                                  <Check size={13} /> Visar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUtpVisa(ev, 'reject')}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '6px',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    border: '1px solid #fecaca',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Devolver al docente con observaciones"
                                >
                                  <X size={13} /> Devolver
                                </button>
                              </>
                            )}

                            {isUtpRejected && (
                              <button
                                type="button"
                                onClick={() => handleUtpVisa(ev, 'approve')}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Check size={13} /> Re-visar
                              </button>
                            )}

                            {/* Botón para Encargado de Fotocopias / Administrador */}
                            {ev.requires_copies && isUtpApproved && !isCopiesReady && (
                              <button
                                type="button"
                                onClick={() => handlePhotocopyStatus(ev, 'Listo para Retiro')}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  background: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                                }}
                                title="Notificar al docente que sus copias están impresas y listas para retiro"
                              >
                                <Printer size={13} /> Marcar Listas ({ev.copies_count || 0})
                              </button>
                            )}

                            {ev.requires_copies && isCopiesReady && (
                              <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <CheckCircle2 size={14} color="#16a34a" /> Retiro disponible
                              </span>
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

      {/* MODAL DETALLE DE EVALUACIONES DE UN DÍA DEL CALENDARIO */}
      {selectedDayEvaluations && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '620px', maxHeight: '85vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', fontSize: '1.12rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={19} color="#4f46e5" /> Evaluaciones del día {selectedDayEvaluations.dateStr}
              </h4>
              <button onClick={() => setSelectedDayEvaluations(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedDayEvaluations.items.map(ev => (
                <div key={ev.id} style={{ padding: '0.95rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2px' }}>
                        <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                          {ev.material_type || 'Evaluación'}
                        </span>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{ev.course_name} — {ev.subject_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                        {ev.evaluation_title} • <strong>{ev.block_label}</strong>
                      </div>
                      {ev.requires_copies && (
                        <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 700, marginTop: '2px' }}>
                          🖨️ {ev.copies_count || 0} copias ({ev.copies_details || 'B&N Doble Faz'}) • Visado: <strong>{ev.utp_status || 'Pendiente'}</strong> • Impresión: <strong>{ev.photocopy_status || 'En Espera'}</strong>
                        </div>
                      )}
                      <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>
                        Docente: {ev.teacher_name} | Carpeta Drive: <code>Evaluaciones Originales / {ev.course_name} / {ev.subject_name}</code>
                      </div>
                    </div>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: ev.status === 'Adecuado PIE' ? '#dcfce7' : ev.status === 'Completado' ? '#e0e7ff' : '#fef3c7',
                      color: ev.status === 'Adecuado PIE' ? '#166534' : ev.status === 'Completado' ? '#3730a3' : '#b45309'
                    }}>
                      {ev.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {ev.original_file_name || ev.original_file_url ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayEvaluations(null);
                            handleOpenEvaluationDocument(ev, 'original');
                          }}
                          style={{ padding: '0.32rem 0.7rem', borderRadius: '6px', background: '#0284c7', color: '#ffffff', border: 'none', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} /> Ver Instrumento
                        </button>
                        <a
                          href={`/api/evaluations/${ev.id}/file?type=original`}
                          target="_blank"
                          rel="noreferrer"
                          download={ev.original_file_name || true}
                          style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <FileText size={12} /> Descargar
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDayEvaluations(null);
                          setUploadPendingEval(ev);
                          setPendingFileUrl('');
                          setPendingFileName('');
                          setPendingSelectedFile(null);
                        }}
                        style={{ padding: '0.32rem 0.7rem', borderRadius: '6px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Upload size={13} /> Subir Prueba Original
                      </button>
                    )}

                    {ev.pie_file_url ? (
                      <a
                        href={ev.pie_file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '0.32rem 0.7rem', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Puzzle size={13} /> Ver Adecuación PIE en Drive
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDayEvaluations(null);
                          setUploadPieEval(ev);
                          setPieFileUrl('');
                          setPieFileName('');
                          setPieSelectedFile(null);
                        }}
                        style={{ padding: '0.32rem 0.7rem', borderRadius: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Upload size={13} /> Subir Adecuación PIE
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => {
                  const dateToUse = selectedDayEvaluations.dateStr;
                  setSelectedDayEvaluations(null);
                  setNewEvalForm(prev => ({ ...prev, evaluation_date: dateToUse }));
                  setActiveTab('nueva');
                }}
                style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <PlusCircle size={15} /> Planificar otra evaluación en este día
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayEvaluations(null)}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL DE PREVISUALIZACIÓN Y DESCARGA DIRECTA DE INSTRUMENTOS */}
      {previewFileModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: previewFileModal.isImage || previewFileModal.isPdf ? '880px' : '620px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            {/* Header del modal */}
            <div style={{
              padding: '1rem 1.25rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <FileText size={18} color="#0284c7" />
                  {previewFileModal.type === 'pie' ? 'Adecuación Curricular PIE' : 'Instrumento de Evaluación Original'}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  {previewFileModal.ev.course_name} — {previewFileModal.ev.subject_name} ({previewFileModal.fileName})
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <a
                  href={previewFileModal.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={previewFileModal.fileName}
                  style={{
                    padding: '0.38rem 0.8rem',
                    borderRadius: '8px',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Descargar archivo directo a tu equipo"
                >
                  <FileText size={13} /> ⬇️ Descargar
                </a>

                {previewFileModal.ev.original_file_url && (
                  <a
                    href={previewFileModal.ev.original_file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.38rem 0.75rem',
                      borderRadius: '8px',
                      background: '#e0e7ff',
                      color: '#3730a3',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ExternalLink size={13} /> Google Drive
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewFileModal(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
              {previewFileModal.isImage ? (
                <div style={{ textAlign: 'center', background: '#ffffff', padding: '0.75rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <img
                    src={previewFileModal.fileUrl}
                    alt={previewFileModal.fileName}
                    style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: '8px' }}
                  />
                  <div style={{ marginTop: '0.5rem', fontSize: '0.76rem', color: '#64748b' }}>
                    Archivo: <strong>{previewFileModal.fileName}</strong> • Docente: {previewFileModal.ev.teacher_name}
                  </div>
                </div>
              ) : previewFileModal.isPdf ? (
                <iframe
                  src={previewFileModal.fileUrl}
                  title={previewFileModal.fileName}
                  style={{ width: '100%', height: '68vh', border: 'none', borderRadius: '8px', background: '#ffffff' }}
                />
              ) : (
                <div style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  maxWidth: '480px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📄</div>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                    {previewFileModal.fileName}
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                    Documento Word / Office cargado por el docente <strong>{previewFileModal.ev.teacher_name}</strong> para el curso <strong>{previewFileModal.ev.course_name}</strong>.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <a
                      href={previewFileModal.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={previewFileModal.fileName}
                      style={{
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        background: '#0284c7',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileText size={16} /> ⬇️ Descargar Documento Original (.docx)
                    </a>

                    {previewFileModal.ev.original_file_url && (
                      <a
                        href={previewFileModal.ev.original_file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '0.55rem 1rem',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <ExternalLink size={14} /> Abrir en Google Drive / Docs
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer con controles */}
            <div style={{
              padding: '0.75rem 1.25rem',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Almacenamiento seguro interno del Liceo Técnico Profesional
              </span>
              <button
                type="button"
                onClick={() => setPreviewFileModal(null)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
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

              <div style={{ marginBottom: '1rem' }}>
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

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Tipo de Material:
                </label>
                <select
                  value={editingEval.material_type || 'Evaluación'}
                  onChange={e => setEditingEval({ ...editingEval, material_type: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  <option value="Evaluación">📝 Evaluación (Tope máx. 2/día por curso)</option>
                  <option value="Rúbrica">📐 Rúbrica (Tope máx. 2/día por curso)</option>
                  <option value="Guía">📄 Guía de Trabajo / Aprendizaje</option>
                  <option value="Material de Apoyo">📦 Material de Apoyo Pedagógico</option>
                  <option value="Otros">📌 Otros Instrumentos / Actividades</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.82rem' }}>
                  <input
                    type="checkbox"
                    checked={editingEval.requires_copies || false}
                    onChange={e => setEditingEval({ ...editingEval, requires_copies: e.target.checked })}
                    style={{ accentColor: '#2563eb' }}
                  />
                  <span>🖨️ Requiere fotocopias o impresión institucional</span>
                </label>

                {editingEval.requires_copies && (
                  <div style={{ marginTop: '0.65rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>N° Copias:</label>
                      <input
                        type="number"
                        min={1}
                        value={editingEval.copies_count || 0}
                        onChange={e => setEditingEval({ ...editingEval, copies_count: parseInt(e.target.value, 10) || 0 })}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Detalle Impresión:</label>
                      <input
                        type="text"
                        value={editingEval.copies_details || ''}
                        onChange={e => setEditingEval({ ...editingEval, copies_details: e.target.value })}
                        placeholder="Ej: B&N Doble Faz"
                        style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                )}
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

      {/* MODAL 2: ADJUNTAR ARCHIVO ORIGINAL PENDIENTE (SUBIDA DIRECTA A CARPETA CURSO -> ASIGNATURA) */}
      {uploadPendingEval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#b45309', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={18} color="#b45309" /> Subir Prueba Original a Google Drive
              </h4>
              <button onClick={() => setUploadPendingEval(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <div><strong>Evaluación:</strong> {uploadPendingEval.evaluation_title}</div>
              <div style={{ color: '#92400e', marginTop: '3px' }}>
                📁 <strong>Carpeta automática en Google Drive:</strong> <code>Evaluaciones Originales / {uploadPendingEval.course_name} / {uploadPendingEval.subject_name}</code>
              </div>
            </div>

            <form onSubmit={handleSavePendingFile}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  1. Seleccionar Archivo desde tu Computador (Word, PDF o Imagen):
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.ppt,.pptx,.xls,.xlsx"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setPendingSelectedFile(f);
                    if (f && !pendingFileName) setPendingFileName(f.name);
                  }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#f8fafc' }}
                />
                {pendingSelectedFile && (
                  <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, marginTop: '4px' }}>
                    ✓ Seleccionado: {pendingSelectedFile.name} ({(pendingSelectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

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
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#64748b', marginBottom: '0.35rem' }}>
                  O pegar enlace externo de Google Drive (solo si no subes archivo físico):
                </label>
                <input
                  type="text"
                  value={pendingFileUrl}
                  onChange={e => setPendingFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" onClick={() => setUploadPendingEval(null)} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={uploadingPendingFile} className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontWeight: 700, background: '#d97706' }}>
                  {uploadingPendingFile ? 'Subiendo a Google Drive...' : 'Subir y Guardar en Google Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBIR ADECUACIÓN PIE (SUBIDA DIRECTA A CARPETA PIE APARTE -> CURSO -> ASIGNATURA) */}
      {uploadPieEval && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', color: '#059669', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Puzzle size={18} color="#059669" /> Subir Evaluación Adaptada PIE a Google Drive
              </h4>
              <button onClick={() => setUploadPieEval(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
              <div><strong>Evaluación:</strong> {uploadPieEval.evaluation_title} ({uploadPieEval.course_name} • Prof. {uploadPieEval.teacher_name})</div>
              <div style={{ color: '#065f46', marginTop: '3px' }}>
                🧩 <strong>Carpeta exclusiva PIE en Google Drive:</strong> <code>Evaluaciones PIE Aparte / {uploadPieEval.course_name} / {uploadPieEval.subject_name}</code>
              </div>
            </div>

            <form onSubmit={handleSavePieFile}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  1. Seleccionar Evaluación Adaptada PIE desde tu Computador:
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.ppt,.pptx,.xls,.xlsx"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setPieSelectedFile(f);
                    if (f && !pieFileName) setPieFileName(f.name);
                  }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#f8fafc' }}
                />
                {pieSelectedFile && (
                  <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, marginTop: '4px' }}>
                    ✓ Seleccionado: {pieSelectedFile.name} ({(pieSelectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

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
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#64748b', marginBottom: '0.35rem' }}>
                  O pegar enlace externo de Google Drive (opcional):
                </label>
                <input
                  type="text"
                  value={pieFileUrl}
                  onChange={e => setPieFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                <button type="button" onClick={() => setUploadPieEval(null)} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={uploadingPieFile} className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontWeight: 700, background: '#059669' }}>
                  {uploadingPieFile ? 'Subiendo a Carpeta PIE...' : 'Guardar Adaptación PIE en Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIGURACIÓN INTEGRACIONES GOOGLE DRIVE / CALENDAR */}
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
              Cuenta institucional conectada automáticamente: <strong>{driveAccountEmail}</strong>
            </p>

            <form onSubmit={handleSaveIntegrationSettings}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                  Cuenta Institucional Google Workspace:
                </label>
                <input
                  type="email"
                  value={driveAccountEmail}
                  onChange={e => setDriveAccountEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

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
                  ID Carpeta Drive Raíz (Pruebas Originales → Curso → Asignatura):
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
                  ID Carpeta Drive Raíz (Evaluaciones PIE Aparte → Curso → Asignatura):
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
        availableCourses={allInstitutionalCourses.length > 0 ? allInstitutionalCourses : allAvailableCourses}
        initialTab={supportModalTab}
        onPermissionsChanged={() => {
          loadEvaluations();
          loadDriveFolders();
        }}
      />
    </div>
  );
};
