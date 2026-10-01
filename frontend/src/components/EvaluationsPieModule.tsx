import React, { useState, useEffect, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  BookOpen,
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
  const [activeTab, setActiveTab] = useState<'nueva' | 'calendario' | 'modificar' | 'pendientes' | 'pie' | 'carpetas'>('nueva');
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [coursesList, setCoursesList] = useState<string[]>(DEFAULT_COURSES);
  const [subjectsList, setSubjectsList] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  // Configuraciones de Integración Google Workspace (ltp.campanario@eduvallediguillin.gob.cl)
  const [calendarId, setCalendarId] = useState('c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com');
  const [folderOriginalsId, setFolderOriginalsId] = useState('13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3');
  const [folderPieId, setFolderPieId] = useState('1JoE4n5kgVYoXQxqh6XlLLE78thRQlEED');
  const [driveAccountEmail, setDriveAccountEmail] = useState('ltp.campanario@eduvallediguillin.gob.cl');
  const [driveConnected, setDriveConnected] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [calendarKey, setCalendarKey] = useState(Date.now());
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalCourse, setSupportModalCourse] = useState('1° Básico');

  // Estado del Calendario Interactivo Mensual
  const [calendarViewMode, setCalendarViewMode] = useState<'interactive' | 'google_embed' | 'both'>('both');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarCourseFilter, setCalendarCourseFilter] = useState<string>('');
  const [calendarSubjectFilter, setCalendarSubjectFilter] = useState<string>('');
  const [selectedDayEvaluations, setSelectedDayEvaluations] = useState<{ dateStr: string; items: Evaluation[] } | null>(null);

  // Explorador de Carpetas Automáticas Google Drive
  const [driveFoldersData, setDriveFoldersData] = useState<any>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolderRoot, setSelectedFolderRoot] = useState<'originals' | 'pie' | 'profiles'>('originals');
  const [selectedFolderCourse, setSelectedFolderCourse] = useState<string>('');

  // Formulario Nueva Evaluación + Archivo directo desde computador
  const [newEvalForm, setNewEvalForm] = useState({
    evaluation_title: '',
    course_name: '',
    subject_name: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    block_label: BLOCKS[0],
    original_file_name: '',
    original_file_url: ''
  });
  const [newEvalSelectedFile, setNewEvalSelectedFile] = useState<File | null>(null);
  const newEvalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal Edición
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);

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

  const handleSyncWithGoogle = async () => {
    setSyncingGoogle(true);
    try {
      const res = await fetch('/api/evaluations/sync-google', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include'
      });
      const data = await res.json();
      await loadEvaluations();
      await loadDriveFolders();
      setCalendarKey(Date.now());
      if (data && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Sincronización Completada',
          text: `${data.message} (${data.synced || 0} evaluaciones verificadas desde ${driveAccountEmail}).`,
          timer: 2800
        });
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo sincronizar con Google Workspace.', 'error');
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

  // 1. REGISTRAR EVALUACIÓN (Con subida directa de archivo e inserción automática en Carpeta Curso -> Asignatura y Google Calendar)
  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEvalForm.evaluation_title.trim() || !newEvalForm.course_name || !newEvalForm.subject_name) {
      Swal.fire('Atención', 'Por favor completa todos los campos obligatorios (Título, Curso y Asignatura).', 'warning');
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
          original_file_url: ''
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
  const allAvailableCourses = useMemo(() => {
    const evalCourses = evaluations.map(e => e.course_name).filter(Boolean);
    return sortCoursesList(Array.from(new Set([...coursesList, ...evalCourses])));
  }, [coursesList, evaluations]);

  const allAvailableSubjects = useMemo(() => {
    const evalSubjects = evaluations.map(e => e.subject_name).filter(Boolean);
    return Array.from(new Set([...subjectsList, ...evalSubjects])).sort((a, b) => a.localeCompare(b));
  }, [subjectsList, evaluations]);

  // Filtros
  const myEvaluationsCount = evaluations.filter(ev => ev.teacher_email === user?.email || ev.teacher_name === user?.name).length;

  const displayedEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      if (filterScope === 'mine' && user) {
        const matchMail = user.email && ev.teacher_email === user.email;
        const matchName = user.name && ev.teacher_name?.toLowerCase().includes(user.name.toLowerCase());
        if (!matchMail && !matchName) return false;
      }
      if (tableCourseFilter && ev.course_name !== tableCourseFilter) return false;
      if (tableSubjectFilter && ev.subject_name !== tableSubjectFilter) return false;
      return true;
    });
  }, [evaluations, filterScope, user, tableCourseFilter, tableSubjectFilter]);

  const pendingFilesEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      if (tableCourseFilter && ev.course_name !== tableCourseFilter) return false;
      if (tableSubjectFilter && ev.subject_name !== tableSubjectFilter) return false;
      return ev.status === 'Pendiente de Archivo' || !ev.original_file_url;
    });
  }, [evaluations, tableCourseFilter, tableSubjectFilter]);

  // Evaluaciones filtradas para el Calendario Institucional
  const calendarFilteredEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      if (calendarCourseFilter && ev.course_name !== calendarCourseFilter) return false;
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
          onClick={() => {
            if (allAvailableCourses.length > 0) setSupportModalCourse(allAvailableCourses[0]);
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
                disabled={loading}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 800 }}
              >
                {loading ? 'Sincronizando con Google Drive y Calendar...' : '🚀 Guardar Planificación y Sincronizar con Google'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PESTAÑA 2: CALENDARIO INSTITUCIONAL (INTERACTIVO + GOOGLE CALENDAR SINCRONIZADO) */}
      {activeTab === 'calendario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Barra de Controles y Filtros del Calendario */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.18rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarIcon size={21} color="#4f46e5" /> Calendario Institucional de Evaluaciones ({calendarFilteredEvaluations.length} evaluaciones)
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                  Sincronizado en vivo con Google Calendar (<code>{calendarId.slice(0, 28)}...</code>) y Google Drive (<code>{driveAccountEmail}</code>)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('both')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: calendarViewMode === 'both' ? '#4f46e5' : 'transparent',
                    color: calendarViewMode === 'both' ? '#ffffff' : '#475569'
                  }}
                >
                  📅 Vista Completa (Interactivo + Google)
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('interactive')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: calendarViewMode === 'interactive' ? '#4f46e5' : 'transparent',
                    color: calendarViewMode === 'interactive' ? '#ffffff' : '#475569'
                  }}
                >
                  🗓️ Solo Grilla Interactiva
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('google_embed')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: calendarViewMode === 'google_embed' ? '#4f46e5' : 'transparent',
                    color: calendarViewMode === 'google_embed' ? '#ffffff' : '#475569'
                  }}
                >
                  🌐 Solo Google Calendar Embed
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
                style={{ padding: '0.42rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
              >
                <option value="">📚 Todos los Cursos ({allAvailableCourses.length})</option>
                {allAvailableCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={calendarSubjectFilter}
                onChange={e => setCalendarSubjectFilter(e.target.value)}
                style={{ padding: '0.42rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
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

            {/* GRILLA MENSUAL INTERACTIVA DE EVALUACIONES */}
            {(calendarViewMode === 'interactive' || calendarViewMode === 'both') && (
              <div style={{ marginTop: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
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

                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date())}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Ir al Mes Actual
                  </button>
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
                          }
                        }}
                        style={{
                          minHeight: '105px',
                          background: !cell.isCurrentMonth ? '#f8fafc' : isToday ? '#eef2ff' : '#ffffff',
                          border: isToday ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '0.4rem',
                          opacity: cell.isCurrentMonth ? 1 : 0.55,
                          cursor: dayEvals.length > 0 ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          overflow: 'hidden'
                        }}
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
                          {dayEvals.length > 0 && (
                            <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#1e1b4b', color: '#ffffff', padding: '1px 5px', borderRadius: '999px' }}>
                              {dayEvals.length}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '76px' }}>
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
                                title={`${ev.course_name} - ${ev.subject_name} (${ev.teacher_name})`}
                              >
                                {ev.course_name}: {ev.subject_name}
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
          </div>

          {/* VISTA EMBEBIDA DE GOOGLE CALENDAR INSTITUCIONAL */}
          {(calendarViewMode === 'google_embed' || calendarViewMode === 'both') && (
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.02rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cloud size={18} color="#4f46e5" /> Vista Directa Google Calendar Institucional ({driveAccountEmail})
                </h4>
                <a
                  href={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=America%2FSantiago`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  Abrir en Google Calendar <ExternalLink size={13} />
                </a>
              </div>

              <div style={{ width: '100%', height: '540px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <iframe
                  key={calendarKey}
                  src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=America%2FSantiago&showTitle=0&showPrint=0&showTabs=1&showCalendars=0&showTz=0&bgcolor=%23ffffff`}
                  style={{ width: '100%', height: '100%', border: 0 }}
                  title="Google Calendar Evaluaciones"
                />
              </div>
            </div>
          )}
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
                            {ev.original_file_url && (
                              <a
                                href={ev.original_file_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 700, textDecoration: 'underline' }}
                              >
                                Ver Prueba
                              </a>
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
              <a
                href={`https://drive.google.com/drive/folders/${folderOriginalsId}`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                📂 Abrir Raíz Evaluaciones Originales en Drive <ExternalLink size={13} />
              </a>
              <a
                href={`https://drive.google.com/drive/folders/${folderPieId}`}
                target="_blank"
                rel="noreferrer"
                style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                🧩 Abrir Raíz Evaluaciones PIE en Drive <ExternalLink size={13} />
              </a>
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
              <Lock size={16} /> 3. Imágenes de Perfiles Codificadas (Nombre Aleatorio)
            </button>
          </div>

          {loadingFolders ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Cargando estructura de carpetas de Google Drive...</div>
          ) : selectedFolderRoot === 'profiles' ? (
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: '#1e1b4b', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={17} color="#4f46e5" /> Bóveda de Imágenes de Perfil con Codificación Interna (<code>LTP_PERFILES_CODIFICADOS_2026 / Avatares</code>)
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                Cada vez que un Docente o Funcionario sube su foto de perfil, el sistema genera un nombre aleatorio criptográfico (ej. <code>AVT_9F3A12B4C8D1E0F2.jpg</code>) en Google Drive y guarda la asociación internamente en la base de datos.
              </p>
              {driveFoldersData?.rootFolders?.profiles?.encodedFiles?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {driveFoldersData.rootFolders.profiles.encodedFiles.map((item: any) => (
                    <div key={item.vaultId} style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3730a3', fontFamily: 'monospace' }}>
                        🔒 {item.randomDriveCode}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                        Carpeta: <code>{item.folderPath}</code>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Codificado internamente para: <strong>{item.uploadedBy}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '1rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#64748b' }}>
                  El canal de codificación automática para fotos de perfil está activo. Al actualizar una foto en &quot;Personalizar mi perfil&quot;, aparecerá registrada aquí con su código aleatorio de Google Drive.
                </div>
              )}
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
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{ev.course_name} — {ev.subject_name}</strong>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                        {ev.evaluation_title} • <strong>{ev.block_label}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
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

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {ev.original_file_url ? (
                      <a
                        href={ev.original_file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '0.32rem 0.7rem', borderRadius: '6px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileText size={13} /> Ver Prueba Original en Drive
                      </a>
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
        availableCourses={allAvailableCourses}
      />
    </div>
  );
};
