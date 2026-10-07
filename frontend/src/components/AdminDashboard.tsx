import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, GraduationCap, FileText, ClipboardList, Shield, LogOut, MessageSquare, Award, FolderOpen, Briefcase, Settings, Monitor, TrendingUp, Printer, ArrowUpDown, Search, Bell, Activity, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Globe, Lock, Filter, KeyRound, BookOpen, UserCheck, UserX, Heart, User, Puzzle, Calendar, Clock, PenTool, ShieldAlert, FileCheck2, Compass, Eye, Palette, ArrowLeft, Home, Send } from 'lucide-react';
import Swal from 'sweetalert2';
import { InstitutionalPlatformsSection } from './InstitutionalPlatformsSection';
import { SubmitStatementModal, PendingStatementItem } from './SubmitStatementModal';
import { getStudentCourse, isStudentRetired, getStudentWithdrawalDate, sortCoursesList, sortStudentsList, getStudentYear } from '../utils/course';
import { AdminTabId, getAdminTabFromUrl, syncAdminUrl, AccessLevel, normalizeAccessLevel } from '../utils/urlRouter';

const StudentWindow = lazy(() => import('./StudentWindow').then(m => ({ default: m.StudentWindow })));
const GradesSheet = lazy(() => import('./GradesSheet').then(m => ({ default: m.GradesSheet })));
const GradesOverview = lazy(() => import('./GradesOverview').then(m => ({ default: m.GradesOverview })));
const InterviewsModule = lazy(() => import('./InterviewsModule').then(m => ({ default: m.InterviewsModule })));
const ObservationsModule = lazy(() => import('./ObservationsModule').then(m => ({ default: m.ObservationsModule })));
const AdministrationModule = lazy(() => import('./AdministrationModule').then(m => ({ default: m.AdministrationModule })));
const StaffModule = lazy(() => import('./StaffModule').then(m => ({ default: m.StaffModule })));
const ConfigModule = lazy(() => import('./ConfigModule').then(m => ({ default: m.ConfigModule })));
const PermissionsMatrix = lazy(() => import('./PermissionsMatrix').then(m => ({ default: m.PermissionsMatrix })));
const MultiviewWindow = lazy(() => import('./MultiviewWindow').then(m => ({ default: m.MultiviewWindow })));
const OfficialEnrollmentForm = lazy(() => import('./OfficialEnrollmentForm').then(m => ({ default: m.OfficialEnrollmentForm })));
const ReorderStudentsModal = lazy(() => import('./ReorderStudentsModal').then(m => ({ default: m.ReorderStudentsModal })));
const UserProfileModal = lazy(() => import('./UserProfileModal').then(m => ({ default: m.UserProfileModal })));
const ApoderadoView = lazy(() => import('./ApoderadoView').then(m => ({ default: m.ApoderadoView })));
const LibraryCRAModule = lazy(() => import('./LibraryCRAModule').then(m => ({ default: m.LibraryCRAModule })));
const ComputerLabModule = lazy(() => import('./ComputerLabModule').then(m => ({ default: m.ComputerLabModule })));
const EvaluationsPieModule = lazy(() => import('./EvaluationsPieModule').then(m => ({ default: m.EvaluationsPieModule })));
const GuardiansListModule = lazy(() => import('./GuardiansListModule').then(m => ({ default: m.GuardiansListModule })));
const InspectorPassesModule = lazy(() => import('./InspectorPassesModule').then(m => ({ default: m.InspectorPassesModule })));
const MineducReportsModule = lazy(() => import('./MineducReportsModule').then(m => ({ default: m.MineducReportsModule })));
const PersonalityReportsModule = lazy(() => import('./PersonalityReportsModule').then(m => ({ default: m.PersonalityReportsModule })));
const CourseMessageModal = lazy(() => import('./CourseMessageModal').then(m => ({ default: m.CourseMessageModal })));
const PedagogicalTripsModule = lazy(() => import('./PedagogicalTripsModule').then(m => ({ default: m.PedagogicalTripsModule })));
const TeacherCoursesGrid = lazy(() => import('./TeacherCoursesGrid').then(m => ({ default: m.TeacherCoursesGrid })));
import { DEFAULT_PERMISSIONS_MATRIX } from './PermissionsMatrix';

const ModuleLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#475569',
    gap: '0.65rem',
    fontWeight: 600,
    fontSize: '0.9rem'
  }}>
    <div style={{
      width: '24px',
      height: '24px',
      border: '3px solid #e2e8f0',
      borderTopColor: '#4f46e5',
      borderRadius: '50%',
      animation: 'spin 0.65s linear infinite'
    }} />
    <span>Cargando módulo...</span>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { user, token, logout, switchRole, restoreOriginalRole, isSuperAdmin, isImpersonating, canCustomizeProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabId>(() => {
    if (user?.role === 'Apoderado' || user?.role === 'Estudiante') {
      return 'home';
    }
    const urlTab = getAdminTabFromUrl();
    if (urlTab) return urlTab;
    try {
      localStorage.removeItem('ltp_admin_tab');
      const saved = sessionStorage.getItem('ltp_admin_tab');
      if (saved && ['home', 'students', 'apoderados', 'communications', 'grades', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'permissions', 'config', 'audit', 'inspector_passes', 'pedagogical_trips'].includes(saved)) {
        return saved as AdminTabId;
      }
    } catch {}
    return 'home';
  });
  const [tabHistory, setTabHistory] = useState<AdminTabId[]>([]);

  const [gradesSubTab, setGradesSubTab] = useState<'courses' | 'sheet' | 'overview'>(() =>
    getAdminTabFromUrl() === 'overview' ? 'overview' : 'sheet'
  );
  const [selectedCourseSubject, setSelectedCourseSubject] = useState<{
    courseName: string;
    subjectName: string;
    isHomeroom: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('ltp_admin_tab', activeTab);
    } catch {}
    syncAdminUrl(activeTab);
    if (activeTab === 'overview' && gradesSubTab !== 'overview') {
      setGradesSubTab('overview');
    } else if (activeTab === 'grades' && gradesSubTab === 'overview') {
      setGradesSubTab('sheet');
    }
  }, [activeTab]);

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail && ['home', 'students', 'apoderados', 'communications', 'grades', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'permissions', 'config', 'audit', 'inspector_passes', 'pedagogical_trips'].includes(e.detail)) {
        setActiveTab(prev => {
          if (prev !== e.detail) {
            setTabHistory(hist => [...hist.slice(-15), prev]);
          }
          return e.detail;
        });
      }
    };
    window.addEventListener('ltp_navigate_tab', handleNav);
    return () => window.removeEventListener('ltp_navigate_tab', handleNav);
  }, []);

  const [dynamicMatrix, setDynamicMatrix] = useState<any[]>(() =>
    DEFAULT_PERMISSIONS_MATRIX.map(r => ({ ...r }))
  );

  const TAB_TO_FUNCTION: Record<string, string> = {
    home: 'dashboard',
    students: 'enrollment',
    apoderados: 'apoderados',
    communications: 'communications',
    grades: 'grades',
    overview: 'overview',
    personality_reports: 'overview',
    computer_lab: 'computer_lab',
    evaluations_pie: 'evaluations_pie',
    interviews: 'interviews',
    observations: 'observations',
    staff: 'hr_staff',
    admin_docs: 'admin_docs',
    library: 'library',
    permissions: 'permissions',
    config: 'config',
    audit: 'audit_logs',
    inspector_passes: 'inspector_passes',
    mineduc_reports: 'mineduc_reports',
    pedagogical_trips: 'pedagogical_trips',
    course_messaging: 'course_messaging',
    multiview: 'multiview'
  };

  const rolePermissions: Record<string, string[]> = {
    Admin: ['home', 'students', 'apoderados', 'communications', 'grades', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'permissions', 'config', 'audit', 'inspector_passes', 'pedagogical_trips', 'course_messaging', 'multiview'],
    Director: ['home', 'students', 'apoderados', 'communications', 'grades', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips', 'course_messaging', 'multiview'],
    Docente: ['home', 'students', 'apoderados', 'communications', 'grades', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'inspector_passes', 'admin_docs', 'library', 'pedagogical_trips', 'course_messaging', 'multiview'],
    Comunicaciones: ['home', 'communications', 'students', 'apoderados', 'computer_lab', 'pedagogical_trips', 'admin_docs', 'course_messaging', 'multiview'],
    Bibliotecario: ['home', 'computer_lab', 'evaluations_pie', 'library', 'admin_docs', 'multiview'],
    Entrevistador: ['home', 'students', 'communications', 'computer_lab', 'evaluations_pie', 'interviews', 'observations', 'admin_docs', 'course_messaging', 'multiview'],
    Administrativo: ['home', 'students', 'apoderados', 'communications', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips', 'multiview'],
    Profesionales: ['home', 'students', 'apoderados', 'communications', 'grades', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'inspector_passes', 'admin_docs', 'library', 'pedagogical_trips', 'course_messaging', 'multiview'],
    Asistente: ['home', 'students', 'apoderados', 'communications', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips', 'multiview'],
    'Asistente de la Educación': ['home', 'students', 'apoderados', 'communications', 'overview', 'personality_reports', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips', 'multiview'],
    Apoderado: ['home', 'admin_docs'],
    Estudiante: ['home', 'admin_docs'],
    Visita: ['home', 'computer_lab', 'evaluations_pie', 'overview', 'admin_docs']
  };

  const currentRole = user?.role || 'Admin';

  const getAccessLevel = (tab: string): AccessLevel => {
    // Protección vital: Todo usuario autenticado siempre tiene acceso a 'home' (Dashboard / Portal Apoderado / Portal Estudiante)
    if (tab === 'home') {
      return (currentRole === 'Apoderado' || currentRole === 'Estudiante' || currentRole === 'Visita') ? 'view' : 'edit';
    }

    // Protección vital: El Administrador siempre tiene Edición en la Matriz de Permisos
    if (tab === 'permissions' && (currentRole === 'Admin' || isSuperAdmin)) {
      return 'edit';
    }

    // Protección vital: Apoderado y Estudiante nunca pueden acceder a gestión de permisos, configuración ni auditoría
    if ((currentRole === 'Apoderado' || currentRole === 'Estudiante') && ['permissions', 'config', 'audit'].includes(tab)) {
      return 'none';
    }

    if (dynamicMatrix && dynamicMatrix.length > 0) {
      const funcId = TAB_TO_FUNCTION[tab] || tab;
      const row = dynamicMatrix.find(r => r.functionId === funcId);
      if (row) {
        let roleCol: string = currentRole;
        if (['Admin', 'Administrador'].includes(currentRole)) roleCol = 'Admin';
        else if (['Director', 'Directivo', 'UTP', 'Inspectoría General'].includes(currentRole)) roleCol = 'Director';
        else if (['Docente', 'Profesor', 'Docente de Aula', 'Docente Jefatura'].includes(currentRole)) roleCol = 'Docente';
        else if (['Asistente', 'Asistente de la Educación', 'PIE', 'Administrativo', 'Bibliotecario'].includes(currentRole)) roleCol = 'Asistente';
        else if (['Profesionales', 'Convivencia Escolar', 'Entrevistador', 'Psicólogo'].includes(currentRole)) roleCol = 'Profesionales';
        else if (['Comunicaciones', 'Encargado de Comunicaciones'].includes(currentRole)) roleCol = 'Comunicaciones';
        else if ((currentRole as string) === 'Estudiante') roleCol = 'Estudiante';
        else if ((currentRole as string) === 'Apoderado') roleCol = 'Apoderado';

        if (row[roleCol] !== undefined) return normalizeAccessLevel(row[roleCol], 'none');
        if (row[currentRole] !== undefined) return normalizeAccessLevel(row[currentRole], 'none');
      }
    }

    const fallbackList = rolePermissions[currentRole] || rolePermissions['Admin'];
    if (!fallbackList.includes(tab)) return 'none';
    if (tab === 'students' && ['Asistente', 'Asistente de la Educación', 'Docente', 'Profesionales', 'Comunicaciones'].includes(currentRole)) {
      return 'view';
    }
    return 'edit';
  };

  const canAccess = (tab: string) => getAccessLevel(tab) !== 'none';
  const canEdit = (tab: string) => getAccessLevel(tab) === 'edit';

  const getFunctionName = (tab: string): string => {
    if (tab === 'personality_reports') return 'Informes al Hogar e Informes de Personalidad';
    const funcId = TAB_TO_FUNCTION[tab] || tab;
    const row = dynamicMatrix.find(r => r.functionId === funcId);
    if (row && row.functionName) return row.functionName;
    const defaultNames: Record<string, string> = {
      home: 'Dashboard General & KPIs',
      students: 'Matrícula Completa MINEDUC/FIDE',
      apoderados: 'Nómina & Registro Institucional de Apoderados',
      communications: 'Centro de Comunicaciones y Registro Oficial de Envíos',
      grades: 'Libro de Calificaciones Ponderadas',
      overview: 'Panorama de Notas & Reporte de Jefatura',
      personality_reports: 'Informes al Hogar e Informes de Personalidad',
      computer_lab: 'Reserva Sala de Computación & Horarios',
      evaluations_pie: 'Portal de Evaluaciones & Integración PIE',
      mineduc_reports: 'Informes PIE & Formularios Oficiales MINEDUC (Dec. 170)',
      interviews: 'Actas de Entrevistas & Compromisos',
      observations: 'Hoja de Vida & Anotaciones RICE',
      inspector_passes: 'Control de Atrasos & Pases de Inspectoría',
      staff: 'Recursos Humanos & Idoneidad',
      admin_docs: 'Documentos & Protocolos',
      library: 'Biblioteca CRA',
      permissions: 'Matriz de Permisos RBAC',
      config: 'Ajustes y Configuración del Sistema',
      audit: 'Auditoría Silent-Watch',
      pedagogical_trips: 'Salidas Pedagógicas & Autorizaciones'
    };
    return defaultNames[tab] || tab;
  };

  const navigateToTab = (tab: string, label?: string) => {
    let targetTab = tab;
    if (tab === 'grades' && !canAccess('grades') && canAccess('overview')) {
      targetTab = 'overview';
    }
    if (!canAccess(targetTab)) {
      const moduleName = label || getFunctionName(targetTab);
      Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        html: `
          <div style="text-align: center; padding: 0.5rem 0.2rem;">
            <div style="font-size: 2.5rem; margin-bottom: 0.6rem;">🚫</div>
            <p style="font-size: 1.05rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem;">
              No tienes el permiso para abrir o ver este módulo.
            </p>
            <p style="font-size: 0.92rem; color: #475569; margin-bottom: 0.75rem; line-height: 1.5;">
              El acceso a <strong>"${moduleName}"</strong> se encuentra establecido como <span style="color: #ef4444; font-weight: 800; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">DENEGADO</span> en la Matriz de Permisos para tu perfil actual (<strong>${user?.role || 'Usuario'}</strong>).
            </p>
            <p style="font-size: 0.8rem; color: #94a3b8;">
              Comunícate con el Administrador institucional si requieres habilitar este acceso en la Matriz Dinámica RBAC.
            </p>
          </div>
        `,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    setActiveTab(prev => {
      if (prev !== (targetTab as AdminTabId)) {
        setTabHistory(hist => [...hist.slice(-15), prev]);
      }
      return targetTab as AdminTabId;
    });
  };

  const handleGoBack = () => {
    if (selectedStudent) {
      setSelectedStudent(null);
      return;
    }
    if (printStudent) {
      setPrintStudent(null);
      return;
    }
    if (activeTab === 'grades' && gradesSubTab === 'sheet' && selectedCourseSubject) {
      setSelectedCourseSubject(null);
      setGradesSubTab('courses');
      return;
    }
    if (tabHistory.length > 0) {
      const nextHistory = [...tabHistory];
      const previousTab = nextHistory.pop() || 'home';
      setTabHistory(nextHistory);
      if (canAccess(previousTab)) {
        setActiveTab(previousTab);
        return;
      }
    }
    setActiveTab('home');
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlTab = getAdminTabFromUrl() || 'home';
      if (canAccess(urlTab)) {
        setActiveTab(urlTab);
      } else {
        setActiveTab('home');
        syncAdminUrl('home', true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user?.role, dynamicMatrix]);

  useEffect(() => {
    const handleMatrixUpdate = (e: any) => {
      if (Array.isArray(e?.detail)) {
        setDynamicMatrix(e.detail);
      }
    };
    window.addEventListener('ltp_permissions_updated', handleMatrixUpdate);
    return () => window.removeEventListener('ltp_permissions_updated', handleMatrixUpdate);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch('/api/permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDynamicMatrix(data);
        }
      })
      .catch(() => {});
  }, [token, user?.role]);

  useEffect(() => {
    // Si la pestaña actual no tiene acceso tras recargar o cambiar de perfil, restaurar automáticamente a 'home'
    if (!canAccess(activeTab)) {
      if (activeTab === 'grades' && canAccess('overview')) {
        setActiveTab('overview');
      } else {
        setActiveTab('home');
        syncAdminUrl('home', true);
      }
    }
    if (typeof window !== 'undefined') {
      (window as any).__ltpCurrentModuleAccess = getAccessLevel(activeTab);
    }
  }, [activeTab, user?.role, dynamicMatrix]);
  const [students, setStudents] = useState<any[]>([]);
  const [dbDisconnected, setDbDisconnected] = useState<boolean>(false);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [printStudent, setPrintStudent] = useState<any | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showMultiview, setShowMultiview] = useState(false);
  const [showCourseMessageModal, setShowCourseMessageModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'info' | 'customize'>('info');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('Todos');
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ltp_selected_academic_year');
      return saved ? parseInt(saved, 10) : 2026;
    } catch (_) {
      return 2026;
    }
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [pendingStatements, setPendingStatements] = useState<PendingStatementItem[]>([]);
  const [selectedStatementItem, setSelectedStatementItem] = useState<PendingStatementItem | null>(null);
  const headerDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1100) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    const handleClickOutside = (event: MouseEvent) => {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(event.target as Node)) {
        setShowNotificationDropdown(false);
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const loadNotifications = () => {
    if (!token) return;
    fetch(`/api/notifications?role=${encodeURIComponent(user?.role || '')}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(err => console.error('Error cargando notificaciones:', err));
  };

  const loadPendingStatements = () => {
    if (!token) return;
    fetch('/api/interviews/pending-statements', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPendingStatements(data);
        }
      })
      .catch(err => console.error('Error cargando relatos pendientes:', err));
  };

  const markNotificationsAsRead = () => {
    fetch(`/api/notifications/read-all?role=${encodeURIComponent(user?.role || '')}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      })
      .catch(err => console.error(err));
  };

  const loadAllData = () => {
    fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      .then(async res => {
        if (!res.ok) {
          throw new Error('Base de datos desconectada');
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data);
          setDbDisconnected(false);
        } else {
          setStudents([]);
        }
      })
      .catch(err => {
        console.error('Error cargando nómina de estudiantes (BD desconectada):', err);
        setStudents([]);
        setDbDisconnected(true);
      });

    fetch('/api/interviews', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setInterviews(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch('/api/observations', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setObservations(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    if (activeTab === 'audit') {
      loadAuditLogs();
    }
    loadNotifications();
    loadPendingStatements();
  };

  const loadAuditLogs = () => {
    if (!token) return;
    fetch('/api/audit', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error cargando auditoría:', err));
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadNotifications();
      loadPendingStatements();
    }, 30000);
    return () => clearInterval(interval);
  }, [token, user?.role]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const detectedYears = Array.from(new Set(students.map(getStudentYear))).filter(Boolean) as number[];
  const availableYears = Array.from(new Set([...detectedYears, 2026, 2027, 2028])).sort((a, b) => a - b);
  const yearStudents = students.filter(s => getStudentYear(s) === selectedYear);
  const availableCourses = sortCoursesList(Array.from(new Set(yearStudents.map(getStudentCourse))).filter(Boolean) as string[]);

  const filteredStudents = sortStudentsList(
    yearStudents.filter(s => {
      const rawTerm = searchTerm.toLowerCase().trim();
      const studentCourse = getStudentCourse(s);
      const matchCourse = courseFilter === 'Todos' || studentCourse === courseFilter;

      if (!rawTerm) return matchCourse;

      const cleanTermRun = rawTerm.replace(/[\.\-]/g, '');
      const sRun = String(s.run || s.RUT || '').toLowerCase();
      const cleanSRun = sRun.replace(/[\.\-]/g, '');
      const sName = String(s.full_name || s.Nombres || '').toLowerCase();

      const matchSearch =
        sName.includes(rawTerm) ||
        sRun.includes(rawTerm) ||
        cleanSRun.includes(cleanTermRun) ||
        studentCourse.toLowerCase().includes(rawTerm);

      return matchSearch && matchCourse;
    })
  );

  const filteredAuditLogs = auditLogs.filter((a: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (a.user_name || '').toLowerCase().includes(term) ||
      (a.action || '').toLowerCase().includes(term) ||
      (a.details || '').toLowerCase().includes(term) ||
      (a.ip_address || '').toLowerCase().includes(term) ||
      (a.user_role || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="app-container">
      <Suspense fallback={null}>
        {/* Multivista Dual Screen Modal */}
        {showMultiview && (
          <MultiviewWindow
            sessionCode="MVT-89201"
            onClose={() => setShowMultiview(false)}
          />
        )}

        {/* Modal Ficha Oficial de Impresión FIDE */}
        {printStudent && (
          <OfficialEnrollmentForm
            student={printStudent}
            onClose={() => setPrintStudent(null)}
          />
        )}

        {/* Modal Reordenar Lista A-Z / Manual */}
        {showReorderModal && (
          <ReorderStudentsModal
            students={yearStudents}
            token={token || ''}
            onClose={() => setShowReorderModal(false)}
            onSuccess={(updatedList) => {
              if (updatedList) {
                setStudents(updatedList);
              }
              loadAllData();
            }}
          />
        )}

        {/* VENTANA EMERGENTE DE PERFIL DE USUARIO */}
        {showProfileModal && (
          <UserProfileModal
            initialTab={profileModalTab}
            onClose={() => setShowProfileModal(false)}
          />
        )}

        {/* MODAL DE COMUNICACIÓN FOCALIZADA A DOCENTES DEL CURSO */}
        {showCourseMessageModal && (
          <CourseMessageModal
            isOpen={showCourseMessageModal}
            onClose={() => setShowCourseMessageModal(false)}
            onMessageSent={loadNotifications}
          />
        )}
      </Suspense>

      {/* MODAL REDACTAR Y FIRMAR RELATO DIGITAL DE ENTREVISTA */}
      {selectedStatementItem && (
        <SubmitStatementModal
          item={selectedStatementItem}
          token={token || ''}
          onClose={() => setSelectedStatementItem(null)}
          onSubmitted={() => {
            setSelectedStatementItem(null);
            loadPendingStatements();
            loadNotifications();
          }}
        />
      )}

      {/* Sidebar Estilo Intranet Behance Adaptativo */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ transition: 'all 0.25s ease' }}>
        <div className="sidebar-brand" style={{ gap: '0.5rem', padding: sidebarCollapsed ? '1rem 0.5rem' : '1rem 1.25rem', justifyContent: sidebarCollapsed ? 'center' : 'space-between', flexWrap: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src="/logo.png" alt="LTP Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain', borderRadius: '4px', background: '#ffffff', padding: '2px' }} />
            {(!sidebarCollapsed || (typeof window !== 'undefined' && window.innerWidth <= 1100)) && (
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#ffffff', whiteSpace: 'nowrap' }}>LICEO PRO</span>
            )}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expandir menú completo' : 'Colapsar menú (Solo ver íconos)'}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#ffffff', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="nav-menu" style={{ padding: sidebarCollapsed ? '0.75rem 0.35rem' : '0.75rem 0.65rem' }}>
          {[
            { 
              id: 'home', 
              label: currentRole === 'Apoderado' ? 'Portal Familia y Notas' : (currentRole === 'Estudiante' ? 'Portal Estudiante' : 'Dashboard General'), 
              icon: currentRole === 'Apoderado' ? UserCheck : GraduationCap 
            },
            { id: 'students', label: 'Matrícula Completa', icon: Users },
            { id: 'apoderados', label: 'Nómina de Apoderados', icon: UserCheck },
            { id: 'communications', label: 'Comunicaciones & Registro', icon: Send },
            { id: 'grades', label: 'Libro de Calificaciones', icon: ClipboardList },
            { id: 'overview', label: 'Panorama & Jefatura', icon: TrendingUp },
            { id: 'personality_reports', label: 'Informes Hogar y Personalidad', icon: Award },
            { id: 'computer_lab', label: 'Sala de Computación', icon: Monitor },
            { id: 'evaluations_pie', label: 'Evaluaciones & PIE', icon: Puzzle },
            { id: 'mineduc_reports', label: 'Informes PIE', icon: FileCheck2 },
            { id: 'interviews', label: 'Actas y Entrevistas', icon: MessageSquare },
            { id: 'observations', label: 'Hoja de Vida', icon: Award },
            { id: 'inspector_passes', label: 'Pases & Atrasos', icon: Clock },
            { id: 'pedagogical_trips', label: 'Salidas Pedagógicas', icon: Compass },
            { id: 'staff', label: 'Recursos Humanos', icon: Briefcase },
            { id: 'admin_docs', label: 'Documentos & Protocolos', icon: FolderOpen },
            { id: 'library', label: 'Biblioteca CRA', icon: BookOpen },
            { id: 'permissions', label: 'Matriz de Permisos', icon: Shield },
            { id: 'config', label: 'Configuración', icon: Settings },
            { id: 'audit', label: 'Auditoría "Silent-Watch"', icon: Lock },
          ]
            .filter(item => canAccess(item.id))
            .map(item => {
              const isActive = activeTab === item.id;
              const accessLevel = getAccessLevel(item.id);
              const isViewOnly = accessLevel === 'view' && item.id !== 'home' && item.id !== 'audit';
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigateToTab(item.id, item.label)}
                  title={sidebarCollapsed ? `${item.label}${isViewOnly ? ' (Solo Vista)' : ''}` : undefined}
                  style={{
                    justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', flex: 1 }}>
                    <item.icon size={19} style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && (
                      <span style={{ fontWeight: isActive ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && isViewOnly && (
                    <span
                      title="Modo Solo Vista configurado en la Matriz de Permisos"
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(59, 130, 246, 0.22)',
                        color: isActive ? '#ffffff' : '#93c5fd',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        flexShrink: 0,
                        marginLeft: '4px',
                        letterSpacing: '0.2px'
                      }}
                    >
                      Vista
                    </span>
                  )}
                </div>
              );
            })}
        </nav>

        {/* ACCESO RÁPIDO A MI PERFIL Y BOTÓN CERRAR SESIÓN EN LA PARTE INFERIOR DEL MENÚ SIDEBAR */}
        <div className="sidebar-footer" style={{ padding: sidebarCollapsed ? '0.75rem 0.35rem' : '0.75rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div
            className="nav-item"
            onClick={() => {
              setProfileModalTab(canCustomizeProfile ? 'customize' : 'info');
              setShowProfileModal(true);
            }}
            title={sidebarCollapsed ? (canCustomizeProfile ? 'Mi perfil / Personalizar mi perfil' : 'Mi perfil') : undefined}
            style={{
              color: '#e2e8f0',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              padding: '0.6rem 0.85rem'
            }}
          >
            {canCustomizeProfile ? <Palette size={18} color="#a5b4fc" style={{ flexShrink: 0 }} /> : <User size={18} color="#a5b4fc" style={{ flexShrink: 0 }} />}
            {!sidebarCollapsed && (
              <span style={{ marginLeft: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {canCustomizeProfile ? 'Personalizar mi perfil' : 'Mi perfil'}
              </span>
            )}
          </div>

          <div
            className="nav-item"
            onClick={() => logout()}
            title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
            style={{
              color: '#f87171',
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(239, 68, 68, 0.12)',
              borderRadius: '8px',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              padding: '0.65rem 0.85rem'
            }}
          >
            <LogOut size={19} color="#f87171" style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span style={{ marginLeft: '0.2rem' }}>Cerrar Sesión</span>}
          </div>
        </div>
      </div>

      {/* Área Principal con Top Bar Estilo Diagnostic Clinic */}
      <div 
        className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={{ 
          boxSizing: 'border-box',
          transition: 'all 0.25s ease' 
        }}
      >
        <div className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
            {(activeTab !== 'home' || selectedStudent || printStudent) && (
              <button
                type="button"
                onClick={handleGoBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.48rem 0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #c7d2fe',
                  background: '#eef2ff',
                  color: '#312e81',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 5px rgba(79, 70, 229, 0.12)',
                  transition: 'all 0.2s ease'
                }}
                title="Volver a la ventana o pantalla anterior"
              >
                <ArrowLeft size={16} /> Volver Atrás
              </button>
            )}
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                placeholder="Buscar por RUT, Alumno o Funcionario..."
                className="search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div ref={headerDropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canAccess('course_messaging') && (
              <button
                onClick={() => setShowCourseMessageModal(true)}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  color: '#ffffff',
                  gap: '0.45rem',
                  borderRadius: '9999px',
                  padding: '0.5rem 1.15rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
                }}
                title="Enviar mensaje o correo electrónico a todos los profesores asignados a un curso"
              >
                <MessageSquare size={16} /> Comunicar a Curso
              </button>
            )}

            {canAccess('multiview') && (
              <button onClick={() => setShowMultiview(true)} className="btn btn-primary" style={{ gap: '0.4rem', borderRadius: '9999px', padding: '0.5rem 1.1rem' }}>
                <Monitor size={16} /> Multivista QR Dual
              </button>
            )}

            {/* MENÚ DESPLEGABLE DE NOTIFICACIONES TI */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowNotificationDropdown(prev => {
                    const next = !prev;
                    if (next) setShowUserDropdown(false);
                    return next;
                  });
                  if (!showNotificationDropdown && unreadCount > 0) {
                    markNotificationsAsRead();
                  }
                }}
                style={{
                  background: showNotificationDropdown ? '#e0e7ff' : 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s ease'
                }}
                title="Notificaciones de Seguridad y TI"
              >
                <Bell size={20} color={unreadCount > 0 ? '#4f46e5' : '#64748b'} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    borderRadius: '9999px',
                    padding: '1px 5px',
                    border: '2px solid #ffffff'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 20px 30px -10px rgba(0,0,0,0.18)',
                  border: '1px solid #e2e8f0',
                  width: '360px',
                  maxHeight: '450px',
                  zIndex: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Bell size={16} color="#4f46e5" /> Alertas de TI & Sistema ({notifications.length})
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markNotificationsAsRead}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Marcar leídas
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No hay notificaciones recientes.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          style={{
                            padding: '0.85rem 1rem',
                            borderBottom: '1px solid #f1f5f9',
                            background: n.is_read ? '#ffffff' : '#f0f4ff',
                            transition: 'background 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                            <div style={{
                              padding: '6px',
                              borderRadius: '8px',
                              background: n.type === 'COURSE_MESSAGE' ? '#e0e7ff' : n.type === 'INTERVIEW_STATEMENT_REQUEST' ? '#e0e7ff' : n.type === 'PASSWORD_RESET_SUCCESS' ? '#dcfce7' : n.type === 'PASSWORD_RESET_REQUEST' ? '#e0e7ff' : '#fef3c7',
                              color: n.type === 'COURSE_MESSAGE' ? '#4338ca' : n.type === 'INTERVIEW_STATEMENT_REQUEST' ? '#4338ca' : n.type === 'PASSWORD_RESET_SUCCESS' ? '#166534' : n.type === 'PASSWORD_RESET_REQUEST' ? '#3730a3' : '#92400e',
                              marginTop: '2px'
                            }}>
                              {n.type === 'COURSE_MESSAGE' ? <MessageSquare size={16} /> : n.type === 'INTERVIEW_STATEMENT_REQUEST' ? <PenTool size={16} /> : <KeyRound size={16} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.83rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
                                {n.title}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: '1.35', marginBottom: '0.35rem', whiteSpace: 'pre-line' }}>
                                {n.message}
                              </div>
                              {n.type === 'COURSE_MESSAGE' && (
                                <div style={{ marginBottom: '0.4rem' }}>
                                  <button
                                    onClick={() => {
                                      setShowNotificationDropdown(false);
                                      Swal.fire({
                                        title: n.title,
                                        html: `<div style="text-align: left; font-size: 0.92rem; line-height: 1.6; white-space: pre-line; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; max-height: 350px; overflow-y: auto;">${n.message}</div>`,
                                        icon: 'info',
                                        confirmButtonColor: '#4f46e5',
                                        confirmButtonText: 'Entendido'
                                      });
                                    }}
                                    style={{
                                      background: '#4f46e5',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.3rem 0.65rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem'
                                    }}
                                  >
                                    <MessageSquare size={12} /> Ver Comunicado Completo
                                  </button>
                                </div>
                              )}
                              {n.type === 'INTERVIEW_STATEMENT_REQUEST' && (
                                <div style={{ marginBottom: '0.4rem' }}>
                                  <button
                                    onClick={() => {
                                      setShowNotificationDropdown(false);
                                      fetch('/api/interviews/pending-statements', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
                                        .then(r => r.json())
                                        .then(list => {
                                          if (Array.isArray(list) && list.length > 0) {
                                            const found = list.find((item: any) => String(item.id) === String(n.reference_id)) || list[0];
                                            setSelectedStatementItem(found);
                                          }
                                        });
                                    }}
                                    style={{
                                      background: '#4f46e5',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '0.3rem 0.65rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem'
                                    }}
                                  >
                                    <PenTool size={12} /> Redactar y Firmar Relato Digital
                                  </button>
                                </div>
                              )}
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                                {new Date(n.created_at).toLocaleString('es-CL')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BADGE DESTACADO DE PERFIL ACTIVO */}
            <div
              title="Perfil con el que estás trabajando actualmente en la plataforma"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                background: user?.role === 'Admin' ? '#f5f3ff' : user?.role === 'Director' ? '#eff6ff' : user?.role === 'Docente' ? '#f0fdf4' : '#fff7ed',
                border: `1.5px solid ${user?.role === 'Admin' ? '#c7d2fe' : user?.role === 'Director' ? '#bfdbfe' : user?.role === 'Docente' ? '#bbf7d0' : '#fed7aa'}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Perfil Activo:
              </span>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 900,
                color: user?.role === 'Admin' ? '#4338ca' : user?.role === 'Director' ? '#1d4ed8' : user?.role === 'Docente' ? '#15803d' : user?.role === 'Comunicaciones' ? '#0284c7' : '#c2410c'
              }}>
                {user?.role === 'Admin' ? '👑 Administrador' :
                 user?.role === 'Director' ? '🎓 Directivo' :
                 user?.role === 'Docente' ? '👨‍🏫 Docente' :
                 user?.role === 'Comunicaciones' ? '📢 Comunicaciones' :
                 user?.role === 'Asistente' ? '🤝 Asistente' :
                 user?.role === 'Administrativo' ? '📋 Administrativo' :
                 user?.role === 'Profesionales' ? '🧠 Profesional PIE' :
                 user?.role === 'Apoderado' ? '👨‍👩‍👧 Apoderado' :
                 user?.role === 'Estudiante' ? '🎓 Estudiante' : user?.role}
              </span>
            </div>

            {/* BOTÓN CON MENÚ DESPLEGABLE PARA PERFIL Y CERRAR SESIÓN */}
            <div style={{ position: 'relative' }}>
              <div
                className="user-profile-badge"
                onClick={() => {
                  setShowUserDropdown(prev => {
                    const next = !prev;
                    if (next) setShowNotificationDropdown(false);
                    return next;
                  });
                }}
                style={{ cursor: 'pointer', padding: '0.3rem 0.6rem', borderRadius: '12px', transition: 'background 0.2s ease' }}
              >
                <div className="avatar-circle" style={{ overflow: 'visible' }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {canCustomizeProfile && user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'Perfil'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'
                    )}
                  </div>
                  <div className="status-dot"></div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {user?.name || 'Administrador Principal'}
                    <ChevronDown size={14} color="#64748b" />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{user?.role}</div>
                </div>
              </div>

              {/* MENÚ DESPLEGABLE AL HACER CLIC EN EL PERFIL */}
              {showUserDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0',
                  width: '245px',
                  zIndex: 500,
                  overflow: 'hidden'
                }}>
                  {/* CAMBIADOR RÁPIDO DE PERFIL (SUPERADMIN O USUARIO CON MULTI-ROL) */}
                  {(isSuperAdmin || user?.run === '18803735-6' || (user?.roles && user.roles.length > 1)) && (
                    <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        🔀 {isSuperAdmin ? 'Cambiar Perfil (Simular):' : 'Mis Perfiles Asignados:'}
                      </div>
                      <select
                        value={user?.role}
                        onChange={e => {
                          switchRole(e.target.value as any);
                          setShowUserDropdown(false);
                        }}
                        style={{ width: '100%', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700, background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
                      >
                        {isSuperAdmin ? (
                          <>
                            <option value="Admin">👑 Administrador (Control Total)</option>
                            <option value="Director">🎓 Directivo / UTP / Inspectoría</option>
                            <option value="Docente">👨‍🏫 Docente de Aula / Jefatura</option>
                            <option value="Comunicaciones">📢 Comunicaciones (Mensajería y Registro Oficial)</option>
                            <option value="Entrevistador">🗣️ Convivencia Escolar / Entrevistas</option>
                            <option value="Asistente">🤝 Asistente de la Educación / PIE</option>
                            <option value="Administrativo">📋 Administrativo / Matrícula</option>
                            <option value="Profesionales">🧠 Profesional PIE / Salud</option>
                            <option value="Apoderado">👨‍👩‍👧 Apoderado (Titular / Suplente)</option>
                            <option value="Estudiante">🎓 Estudiante (Portal Estudiantil)</option>
                            <option value="Visita">👁️ Visita (Solo Lectura)</option>
                          </>
                        ) : (
                          (user?.roles || [user?.role || 'Docente']).map(r => (
                            <option key={r} value={r}>
                              {r === 'Docente' ? '👨‍🏫 Docente de Aula / Jefatura' :
                               r === 'Director' ? '🎓 Directivo / UTP / Inspectoría' :
                               r === 'Comunicaciones' ? '📢 Comunicaciones (Mensajería y Registro Oficial)' :
                               r === 'Entrevistador' ? '🗣️ Convivencia Escolar / Entrevistas' :
                               r === 'Asistente' ? '🤝 Asistente de la Educación' :
                               r === 'Administrativo' ? '📋 Administrativo / Matrícula' :
                               r === 'Profesionales' ? '🧠 Profesional PIE / Salud' :
                               r === 'Apoderado' ? '👨‍👩‍👧 Portal Apoderado' :
                               r === 'Admin' ? '👑 Administrador' : r}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setProfileModalTab('info');
                      setShowProfileModal(true);
                    }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <User size={16} color="#4f46e5" /> Mi perfil (Información personal)
                  </button>

                  {canCustomizeProfile && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setProfileModalTab('customize');
                        setShowProfileModal(true);
                      }}
                      style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#f5f3ff', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e2e8f0' }}
                    >
                      <Palette size={16} color="#4f46e5" /> Personalizar mi perfil
                    </button>
                  )}

                  <button
                    onClick={() => logout()}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: '#fff1f2', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#e11d48', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <LogOut size={16} color="#e11d48" /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BANNER DE ADVERTENCIA MODO SIMULACIÓN DE PERFIL */}
        {isImpersonating && (
          <div style={{
            background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
            color: '#ffffff',
            padding: '0.65rem 1.5rem',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 10px rgba(180, 83, 9, 0.25)',
            zIndex: 90,
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔀</span>
              <span>
                <strong>Modo Vista Simulada:</strong> Estás explorando la plataforma con el perfil de <strong>&quot;{user?.role}&quot;</strong> ({user?.name}). Se adaptan permisos y vistas a este perfil.
              </span>
            </div>
            <button
              onClick={restoreOriginalRole}
              style={{
                background: '#ffffff',
                color: '#92400e',
                border: 'none',
                padding: '0.45rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.82rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              👑 Volver a Administrador
            </button>
          </div>
        )}

        {/* BANNER DE SOLICITUD DE RELATO DIGITAL PENDIENTE */}
        {pendingStatements.length > 0 && (
          <div style={{
            background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            color: '#ffffff',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 14px rgba(49, 46, 129, 0.3)',
            zIndex: 100,
            borderBottom: '2px solid #818cf8',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={22} color="#fbbf24" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>Tienes {pendingStatements.length} solicitud{pendingStatements.length > 1 ? 'es' : ''} de declaración / relato de entrevista pendiente{pendingStatements.length > 1 ? 's' : ''}</span>
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    Plazo Activo
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '2px' }}>
                  {pendingStatements[0]?.objective ? `"${pendingStatements[0].objective}" • ` : ''}
                  Tiempo restante aproximado: <strong style={{ color: '#fbbf24' }}>{Math.max(0, Math.floor((pendingStatements[0]?.secondsRemaining || 0) / 60))} min</strong>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedStatementItem(pendingStatements[0])}
              style={{
                background: '#fbbf24',
                color: '#1e1b4b',
                border: 'none',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
              }}
            >
              <PenTool size={16} /> Completar Relato y Firmar Ahora →
            </button>
          </div>
        )}

        {/* VISTA SEGÚN EL ROL SELECCIONADO (SI ES APODERADO O ESTUDIANTE SE MUESTRA EL PORTAL FAMILIAR/ESTUDIANTIL) */}
        <Suspense fallback={<ModuleLoader />}>
        {(user?.role === 'Apoderado' || user?.role === 'Estudiante') && activeTab === 'home' ? (
          <ApoderadoView token={token || ''} />
        ) : !canAccess(activeTab) ? (
          /* ACCESO DENEGADO POR MATRIZ DE PERMISOS */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2.5rem',
            textAlign: 'center',
            background: '#ffffff',
            borderRadius: '16px',
            margin: '1.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            border: '1px solid #fee2e2'
          }}>
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '1.25rem',
              borderRadius: '50%',
              marginBottom: '1rem',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)'
            }}>
              <ShieldAlert size={48} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              Acceso Restringido por Matriz de Permisos
            </h2>
            <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '540px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              No tienes el permiso para abrir o ver el módulo <strong>"{getFunctionName(activeTab)}"</strong>. En la Matriz Dinámica de Permisos este ítem se encuentra configurado como <strong style={{ color: '#ef4444' }}>DENEGADO</strong> para el perfil <strong>{user?.role}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setActiveTab('home')}
                className="btn"
                style={{ background: '#4f46e5', color: '#ffffff', fontWeight: 700, padding: '0.65rem 1.4rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                🏠 Volver al Inicio
              </button>
              {(user?.role === 'Admin' || isSuperAdmin) && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className="btn"
                  style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontWeight: 700, padding: '0.65rem 1.4rem', borderRadius: '8px', cursor: 'pointer' }}
                >
                  🛡️ Configurar en Matriz de Permisos
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeTab !== 'home' && (
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.6rem 1.1rem',
                  marginBottom: '1rem',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleGoBack}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.95rem',
                      borderRadius: '8px',
                      border: '1.5px solid #4f46e5',
                      background: '#eef2ff',
                      color: '#312e81',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    <ArrowLeft size={16} /> Volver Atrás
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateToTab('home')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Home size={15} color="#4f46e5" /> Ir al Inicio
                  </button>
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#94a3b8' }}>Ventana actual:</span>
                  <strong style={{ color: '#1e1b4b', background: '#f1f5f9', padding: '0.22rem 0.65rem', borderRadius: '6px' }}>
                    {getFunctionName(activeTab)}
                  </strong>
                </div>
              </div>
            )}

            {activeTab !== 'home' && activeTab !== 'audit' && !canEdit(activeTab) && (
              <div style={{
                background: 'linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1.5px solid #93c5fd',
                color: '#1e3a8a',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem' }}>
                  <span style={{ background: '#2563eb', color: '#ffffff', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                    <Eye size={14} /> MODO SOLO VISTA
                  </span>
                  <span>
                    Tu perfil actual (<strong>{user?.role}</strong>) cuenta con permiso de <strong>consulta e impresión</strong> en <strong>{getFunctionName(activeTab)}</strong>. La creación, edición y eliminación están deshabilitadas.
                  </span>
                </div>
              </div>
            )}

        {/* VISTA 1: DASHBOARD GENERAL CON BANNER Y PLATAFORMAS DE INTERÉS */}
        {activeTab === 'home' && (
          <div>
            <InstitutionalPlatformsSection
              token={token || ''}
              userName={user?.name}
              userRole={user?.role}
              customSubtitle={
                currentRole === 'Docente' ? 'Panel Docente • Liceo Pro / LTP v2.0' :
                currentRole === 'Director' ? 'Panel Directivo • Liceo Pro / LTP v2.0' :
                currentRole === 'Comunicaciones' ? 'Portal Oficial de Comunicaciones y Registro de Envíos • Liceo Pro / LTP v2.0' :
                currentRole === 'Asistente' ? 'Portal Asistentes de la Educación • Liceo Pro / LTP v2.0' :
                currentRole === 'Profesionales' ? 'Portal Profesionales PIE & Convivencia • Liceo Pro / LTP v2.0' :
                'Panel de Administración • Liceo Pro / LTP v2.0'
              }
            />

            {/* TARJETAS ESTADÍSTICAS KPI CON NAVEGACIÓN DIRECTA SEGÚN PERMISOS DEL PERFIL */}
            <div className="card-grid">
              {canAccess('students') && (
                <div
                  className="stat-card"
                  onClick={() => navigateToTab('students', 'Matrícula Completa')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Ver Nómina de Matrícula Completa"
                >
                  <div className="stat-card-header">
                    <span>Matrícula Total Registrada</span>
                    <div className="stat-icon-wrapper">
                      <Users size={22} />
                    </div>
                  </div>
                  <div className="stat-value">{students.length} Alumnos</div>
                  <div className="stat-trend">
                    <CheckCircle2 size={14} /> {students.filter(s => !s.is_retired).length} Vigentes (Ver Nómina →)
                  </div>
                </div>
              )}

              {canAccess('communications') && (
                <div
                  className="stat-card"
                  onClick={() => navigateToTab('communications', 'Centro de Comunicaciones y Registro de Envíos')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Abrir Centro de Comunicaciones y Registro de a quién se envió cada mensaje"
                >
                  <div className="stat-card-header">
                    <span>Comunicaciones & Registro</span>
                    <div className="stat-icon-wrapper" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      <Send size={22} />
                    </div>
                  </div>
                  <div className="stat-value" style={{ fontSize: '1.35rem', color: '#3730a3' }}>Envíos y Bitácora</div>
                  <div className="stat-trend" style={{ color: '#4f46e5' }}>
                    Ver a quién se envió (Abrir →)
                  </div>
                </div>
              )}

              {canAccess('interviews') && (
                <div
                  className="stat-card"
                  onClick={() => navigateToTab('interviews', 'Actas de Entrevistas')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Ver Actas de Entrevistas"
                >
                  <div className="stat-card-header">
                    <span>Actas de Entrevistas</span>
                    <div className="stat-icon-wrapper" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                      <MessageSquare size={22} />
                    </div>
                  </div>
                  <div className="stat-value">{interviews.length} Actas</div>
                  <div className="stat-trend" style={{ color: '#4f46e5' }}>
                    Aportes Firmados (Ver Actas →)
                  </div>
                </div>
              )}

              {canAccess('observations') && (
                <div
                  className="stat-card"
                  onClick={() => navigateToTab('observations', 'Hoja de Vida y Anotaciones')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Ver Hoja de Vida y Anotaciones"
                >
                  <div className="stat-card-header">
                    <span>Anotaciones Hoja de Vida</span>
                    <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#047857' }}>
                      <Award size={22} />
                    </div>
                  </div>
                  <div className="stat-value">{observations.length} Hojas RICE</div>
                  <div className="stat-trend">
                    Registro Disciplinario (Ver Hojas →)
                  </div>
                </div>
              )}

              {canAccess('audit') ? (
                <div
                  className="stat-card"
                  onClick={() => navigateToTab('audit', 'Auditoría Silent-Watch')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Ver Auditoría Silent-Watch"
                >
                  <div className="stat-card-header">
                    <span>Auditoría "Silent-Watch"</span>
                    <div className="stat-icon-wrapper" style={{ background: '#fef3c7', color: '#b45309' }}>
                      <Shield size={22} />
                    </div>
                  </div>
                  <div className="stat-value" style={{ color: '#10b981' }}>{auditLogs.length} Registros</div>
                  <div className="stat-trend" style={{ color: '#64748b' }}>
                    Trazabilidad e IP (Ver Registro →)
                  </div>
                </div>
              ) : canAccess('evaluations_pie') ? (
                <div
                  className="stat-card"
                  onClick={() => navigateToTab('evaluations_pie', 'Evaluaciones & PIE')}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  title="Abrir Portal de Evaluaciones & Integración PIE"
                >
                  <div className="stat-card-header">
                    <span>Evaluaciones & PIE</span>
                    <div className="stat-icon-wrapper" style={{ background: '#f5f3ff', color: '#6d28d9' }}>
                      <Puzzle size={22} />
                    </div>
                  </div>
                  <div className="stat-value" style={{ color: '#4f46e5', fontSize: '1.35rem' }}>Calendario & Bóveda</div>
                  <div className="stat-trend" style={{ color: '#6d28d9' }}>
                    Instrumentos y Adecuaciones (Abrir →)
                  </div>
                </div>
              ) : null}
            </div>

            {/* PANEL DIRECTO DE COMUNICACIONES Y REGISTRO PARA EL PERFIL DE COMUNICACIONES */}
            {currentRole === 'Comunicaciones' && (
              <div style={{ marginTop: '1.75rem' }}>
                <CourseMessageModal
                  isOpen={true}
                  isEmbedded={true}
                  initialTab="history"
                  onClose={() => {}}
                  onMessageSent={loadNotifications}
                  readOnly={!canEdit('communications')}
                />
              </div>
            )}

            {/* SECCIÓN DE CURSOS Y ASIGNATURAS ASIGNADAS PARA EL PERFIL DOCENTE */}
            {['Docente', 'Profesor', 'Docente de Aula', 'Docente Jefatura'].includes(currentRole) && canAccess('grades') && (
              <div style={{ marginTop: '2rem' }}>
                <TeacherCoursesGrid
                  onSelectCourse={(courseName, subjectName, isHomeroom) => {
                    setSelectedCourseSubject({ courseName, subjectName, isHomeroom });
                    setGradesSubTab('sheet');
                    navigateToTab('grades', 'Libro de Calificaciones');
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: MATRÍCULA COMPLETA MINEDUC/FIDE */}
        {activeTab === 'students' && (() => {
          const scopeStudents = courseFilter === 'Todos' ? yearStudents : yearStudents.filter(s => getStudentCourse(s) === courseFilter);
          const totalRegistros = scopeStudents.length;
          const retiradosList = scopeStudents.filter(s => isStudentRetired(s));
          const cantidadRetirados = retiradosList.length;

          const activosList = scopeStudents.filter(s => !isStudentRetired(s));
          const matriculaActiva = activosList.length;

          const varonesActivos = activosList.filter(s => {
            const g = String(s.gender || s.genero || s.sexo || s.GENERO || '').toUpperCase();
            return g === 'M' || g === '1' || g.includes('MASC') || g.includes('VAR');
          }).length;

          const damasActivas = activosList.filter(s => {
            const g = String(s.gender || s.genero || s.sexo || s.GENERO || '').toUpperCase();
            return g === 'F' || g === '2' || g.includes('FEM') || g.includes('DAM');
          }).length;

          const pctVarones = matriculaActiva > 0 ? Math.round((varonesActivos / matriculaActiva) * 100) : 0;
          const pctDamas = matriculaActiva > 0 ? Math.round((damasActivas / matriculaActiva) * 100) : 0;

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.2rem 0' }}>
                    Nómina Institucional de Estudiantes
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                    Fichas FIDE, apoderados titulares, suplentes, padres y prioridades SEP/PIE
                  </p>
                </div>

                {/* SELECTOR DE AÑO LECTIVO DINÁMICO */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #6366f1',
                  boxShadow: '0 1px 3px rgba(99,102,241,0.12)'
                }}>
                  <Calendar size={17} color="#4f46e5" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e1b4b' }}>Año Lectivo:</span>
                  <select
                    value={selectedYear}
                    onChange={e => {
                      const y = parseInt(e.target.value, 10);
                      setSelectedYear(y);
                      setCourseFilter('Todos');
                      try { localStorage.setItem('ltp_selected_academic_year', String(y)); } catch (_) {}
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: '#4338ca',
                      cursor: 'pointer'
                    }}
                  >
                    {availableYears.map(y => {
                      const count = students.filter(s => getStudentYear(s) === y).length;
                      return (
                        <option key={y} value={y}>
                          📅 Año {y} {y === 2026 ? '(Vigente)' : y === 2027 ? '(Próximo)' : ''} ({count} alumnos)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* FILTRADO POR CURSO */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#ffffff', padding: '0.4rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <Filter size={16} color="#64748b" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Filtrar por Curso:</span>
                  <select
                    value={courseFilter}
                    onChange={e => setCourseFilter(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, fontSize: '0.85rem', color: '#4f46e5', cursor: 'pointer' }}
                  >
                    <option value="Todos">🏫 Todos los Cursos ({yearStudents.length})</option>
                    {availableCourses.map(c => {
                      const countInCourse = yearStudents.filter(s => getStudentCourse(s) === c).length;
                      return (
                        <option key={c} value={c}>{c} ({countInCourse})</option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {canAccess('pedagogical_trips') && (
                    <button 
                      onClick={() => setActiveTab('pedagogical_trips')} 
                      className="btn btn-secondary" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.45rem', 
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                        border: '1.5px solid #86efac', 
                        color: '#166534', 
                        fontWeight: 700 
                      }}
                      title="Crear y autorizar salidas a terreno con nómina de estudiantes"
                    >
                      <Compass size={17} color="#15803d" /> Salidas Pedagógicas
                    </button>
                  )}
                  {canEdit('students') && (
                    <>
                      <button onClick={() => setShowReorderModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowUpDown size={16} /> Reordenar A-Z
                      </button>
                      <button onClick={() => setSelectedStudent({ anno: selectedYear, academic_year: selectedYear })} className="btn btn-primary">
                        + Nueva Matrícula {selectedYear}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ALERTA DE BASE DE DATOS DESCONECTADA */}
              {dbDisconnected && (
                <div style={{
                  background: '#fef2f2',
                  border: '2px solid #ef4444',
                  borderRadius: '14px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.12)'
                }}>
                  <div style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShieldAlert size={32} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>⛔ Base de Datos Desconectada — Bloqueo de Seguridad Activo</span>
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#b91c1c', marginTop: '0.35rem', lineHeight: 1.5 }}>
                      No hay comunicación con el servidor de base de datos MySQL (127.0.0.1:3306). Para salvaguardar la privacidad y confidencialidad institucional, la nómina de estudiantes permanece completamente bloqueada y no se muestran registros en pantalla.
                    </div>
                  </div>
                  <button
                    onClick={() => loadAllData()}
                    className="btn"
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                    }}
                  >
                    🔄 Reintentar
                  </button>
                </div>
              )}

              {/* TARJETAS DE MÉTRICAS KPI Y REPORTE DE MATRÍCULA Y RETIRADOS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                {/* CARD 1: MATRÍCULA EFECTIVA ACTIVA */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                  border: '1px solid #bbf7d0',
                  borderRadius: '14px',
                  padding: '1.1rem 1.25rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Matrícula Activa
                    </span>
                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.35rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                      <UserCheck size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#14532d', lineHeight: 1 }}>
                    {dbDisconnected ? '-' : matriculaActiva} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>{dbDisconnected ? 'no disponible' : 'alumnos activos'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.4rem', fontWeight: 600 }}>
                    {dbDisconnected ? 'Base de datos offline' : (cantidadRetirados > 0 ? `Descontados los ${cantidadRetirados} retirados` : '0 alumnos retirados en este filtro')}
                  </div>
                </div>

                {/* CARD 2: VARONES (HOMBRES) */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                  border: '1px solid #bfdbfe',
                  borderRadius: '14px',
                  padding: '1.1rem 1.25rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Varones (Hombres)
                    </span>
                    <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.35rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                      <User size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
                    {dbDisconnected ? '-' : varonesActivos} {!dbDisconnected && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>({pctVarones}%)</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.4rem', fontWeight: 600 }}>
                    {dbDisconnected ? 'Base de datos offline' : 'Alumnos varones activos'}
                  </div>
                </div>

                {/* CARD 3: DAMAS (MUJERES) */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)',
                  border: '1px solid #fbcfe8',
                  borderRadius: '14px',
                  padding: '1.1rem 1.25rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#9d174d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Damas (Mujeres)
                    </span>
                    <div style={{ background: '#fce7f3', color: '#be185d', padding: '0.35rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                      <Heart size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#831843', lineHeight: 1 }}>
                    {dbDisconnected ? '-' : damasActivas} {!dbDisconnected && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#db2777' }}>({pctDamas}%)</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#db2777', marginTop: '0.4rem', fontWeight: 600 }}>
                    {dbDisconnected ? 'Base de datos offline' : 'Alumnas damas activas'}
                  </div>
                </div>

                {/* CARD 4: ALUMNOS RETIRADOS */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
                  border: '1px solid #fecaca',
                  borderRadius: '14px',
                  padding: '1.1rem 1.25rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Estudiantes Retirados
                    </span>
                    <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.35rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                      <UserX size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7f1d1d', lineHeight: 1 }}>
                    {dbDisconnected ? '-' : cantidadRetirados} {!dbDisconnected && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>retirados</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.4rem', fontWeight: 600 }}>
                    {dbDisconnected ? 'Base de datos offline' : `Bajas del año (${totalRegistros} reg. en sistema)`}
                  </div>
                </div>
              </div>

              {/* BARRA DE BÚSQUEDA DESTACADA (ALTO CONTRASTE) */}
              <div style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.25rem',
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
                  border: searchTerm ? '2px solid #4f46e5' : '1.5px solid #94a3b8',
                  borderRadius: '10px',
                  padding: '0.55rem 0.95rem',
                  gap: '0.75rem',
                  boxShadow: searchTerm ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}>
                  <Search size={20} color={searchTerm ? '#4f46e5' : '#475569'} style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="🔍 Buscar estudiante por Nombre, Apellido o RUT (ej: 21.456.789-0 o González)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
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
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      style={{
                        border: 'none',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        borderRadius: '6px',
                        padding: '0.2rem 0.55rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                      title="Borrar texto"
                    >
                      × Borrar
                    </button>
                  )}
                </div>

                {/* CONTADOR DE RESULTADOS */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  background: searchTerm ? '#eef2ff' : '#f1f5f9',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  border: searchTerm ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                  color: searchTerm ? '#3730a3' : '#334155',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  <Users size={16} color={searchTerm ? '#4f46e5' : '#64748b'} />
                  <span>
                    {searchTerm
                      ? `${filteredStudents.length} coincidencia${filteredStudents.length === 1 ? '' : 's'}`
                      : `${filteredStudents.length} alumnos en lista`}
                  </span>
                  {searchTerm && (
                    <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>
                      (de {yearStudents.length})
                    </span>
                  )}
                </div>
              </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>N° Lista</th>
                    <th>RUT Alumno</th>
                    <th>Nombre Completo</th>
                    <th>Curso</th>
                    <th>Profesor Jefe</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                        {dbDisconnected ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '50%', display: 'inline-flex' }}>
                              <ShieldAlert size={40} />
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991b1b' }}>
                              Nómina Bloqueada: Base de Datos Desconectada
                            </div>
                            <p style={{ fontSize: '0.88rem', color: '#b91c1c', margin: 0, maxWidth: '520px', lineHeight: 1.55 }}>
                              No es posible desplegar información de los estudiantes porque el motor de base de datos MySQL (127.0.0.1:3306) se encuentra fuera de línea. Por estrictas políticas de protección de datos, ningún alumno es renderizado sin conexión activa y verificada.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                              <button
                                onClick={() => loadAllData()}
                                className="btn"
                                style={{ background: '#dc2626', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
                              >
                                🔄 Reintentar Conexión
                              </button>
                            </div>
                          </div>
                        ) : searchTerm.trim() ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                            <div style={{ background: '#f1f5f9', color: '#6366f1', padding: '0.85rem', borderRadius: '50%', display: 'inline-flex' }}>
                              <Search size={32} />
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                              No se encontraron estudiantes para "{searchTerm}"
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '440px' }}>
                              Verifique si el nombre o RUT está bien escrito, o intente buscar por un fragmento.
                            </p>
                            <button
                              onClick={() => setSearchTerm('')}
                              className="btn btn-secondary"
                              style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                            >
                              Limpiar Búsqueda
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                            <div style={{ background: '#e0e7ff', color: '#4f46e5', padding: '0.85rem', borderRadius: '50%', display: 'inline-flex' }}>
                              <Calendar size={32} />
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                              No hay estudiantes registrados en el Año Lectivo {selectedYear}
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, maxWidth: '440px' }}>
                              {courseFilter !== 'Todos'
                                ? `No hay alumnos matriculados para el curso "${courseFilter}" en el periodo escolar ${selectedYear}.`
                                : `El año académico ${selectedYear} aún no cuenta con matrícula activa o registros coincidentes.`}
                            </p>
                            <button
                              onClick={() => setSelectedStudent({ anno: selectedYear, academic_year: selectedYear })}
                              className="btn btn-primary"
                              style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}
                            >
                              + Iniciar Nueva Matrícula {selectedYear}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s: any, idx: number) => {
                      const studentWithYear = { ...s, anno: getStudentYear(s) };
                      const retired = isStudentRetired(s);
                      const retiredDate = getStudentWithdrawalDate(s);
                      return (
                        <tr key={s.id} style={retired ? { background: '#fef2f2', color: '#991b1b' } : {}}>
                          <td><span style={{ fontWeight: 700, color: retired ? '#dc2626' : '#4f46e5' }}>#{s.list_number || idx + 1}</span></td>
                          <td>
                            <div><strong style={retired ? { color: '#dc2626', textDecoration: 'line-through' } : {}}>{s.run || s.RUT}</strong></div>
                            {(s.enrollment_number || s.numero_matricula) && (
                              <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 800 }}>Matrícula: {s.enrollment_number || s.numero_matricula}</div>
                            )}
                          </td>
                          <td>
                            <span style={retired ? { textDecoration: 'line-through', color: '#dc2626', fontWeight: 700 } : { fontWeight: 600 }}>
                              {s.full_name || s.Nombres}
                            </span>
                            {retired && (
                              <span style={{ marginLeft: '8px', fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                                🔴 RETIRADO {retiredDate ? `(${retiredDate})` : ''}
                              </span>
                            )}
                          </td>
                          <td><span className={retired ? "status-chip danger" : "status-chip info"}>{getStudentCourse(s)}</span></td>
                          <td>{(!s.profesor_jefe || s.profesor_jefe === 'null' || s.profesor_jefe === 'undefined') ? (s.teacher_name && s.teacher_name !== 'null' ? s.teacher_name : 'Sin Asignar') : s.profesor_jefe}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button onClick={() => setSelectedStudent(studentWithYear)} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: retired ? '#dc2626' : undefined }}>
                                {canEdit('students') ? '👁️ Ficha Completa' : '👁️ Ver Ficha'}
                              </button>
                              <button onClick={() => setPrintStudent(studentWithYear)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                                <Printer size={14} /> Imprimir FIDE
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

            {selectedStudent && (
              <StudentWindow
                student={selectedStudent}
                token={token || ''}
                readOnly={!canEdit('students')}
                onClose={() => setSelectedStudent(null)}
                onSave={() => loadAllData()}
                onPrint={(s) => setPrintStudent(s)}
              />
            )}
          </div>
        );
      })()}

        {/* VISTA 3: APARTADO ÚNICO DE CALIFICACIONES Y REPORTES POR ASIGNATURA */}
        {(activeTab === 'grades' || activeTab === 'overview') && (
          <div>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              background: '#f1f5f9',
              padding: '0.35rem',
              borderRadius: '12px',
              width: 'fit-content',
              flexWrap: 'wrap'
            }}>
              {canAccess('grades') && ['Docente', 'Profesor', 'Docente de Aula', 'Docente Jefatura'].includes(currentRole) && (
                <button
                  onClick={() => {
                    setSelectedCourseSubject(null);
                    setGradesSubTab('courses');
                    navigateToTab('grades', 'Mis Cursos Asignados');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '9px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: gradesSubTab === 'courses' ? '#ffffff' : 'transparent',
                    color: gradesSubTab === 'courses' ? '#4338ca' : '#64748b',
                    boxShadow: gradesSubTab === 'courses' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <BookOpen size={17} /> Mis Cursos Asignados
                </button>
              )}
              {canAccess('grades') && (
                <button
                  onClick={() => {
                    setGradesSubTab('sheet');
                    navigateToTab('grades', 'Planilla de Calificaciones');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '9px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: gradesSubTab === 'sheet' ? '#ffffff' : 'transparent',
                    color: gradesSubTab === 'sheet' ? '#4338ca' : '#64748b',
                    boxShadow: gradesSubTab === 'sheet' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ClipboardList size={17} /> Planilla de Calificaciones
                </button>
              )}
              {canAccess('overview') && (
                <button
                  onClick={() => {
                    setGradesSubTab('overview');
                    navigateToTab('overview', 'Panorama y Reporte por Asignatura');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '9px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: gradesSubTab === 'overview' ? '#ffffff' : 'transparent',
                    color: gradesSubTab === 'overview' ? '#4338ca' : '#64748b',
                    boxShadow: gradesSubTab === 'overview' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <TrendingUp size={17} /> Panorama y Reporte por Asignatura
                </button>
              )}
              {canAccess('personality_reports') && (
                <button
                  onClick={() => {
                    navigateToTab('personality_reports', 'Informes al Hogar y Personalidad');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '9px',
                    border: '1px solid #86efac',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: '#f0fdf4',
                    color: '#15803d',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Award size={17} /> 🌟 Informes al Hogar y Personalidad (PK a 4° Medio)
                </button>
              )}
            </div>

            {gradesSubTab === 'courses' && canAccess('grades') ? (
              <TeacherCoursesGrid
                onSelectCourse={(courseName, subjectName, isHomeroom) => {
                  setSelectedCourseSubject({ courseName, subjectName, isHomeroom });
                  setGradesSubTab('sheet');
                }}
              />
            ) : gradesSubTab === 'sheet' && canAccess('grades') ? (
              <GradesSheet
                token={token || ''}
                initialCourseName={selectedCourseSubject?.courseName}
                initialSubjectName={selectedCourseSubject?.subjectName}
                onBackToGrid={
                  ['Docente', 'Profesor', 'Docente de Aula', 'Docente Jefatura'].includes(currentRole)
                    ? () => {
                        setSelectedCourseSubject(null);
                        setGradesSubTab('courses');
                      }
                    : undefined
                }
              />
            ) : (
              <GradesOverview token={token || ''} />
            )}
          </div>
        )}

        {/* VISTA: INFORMES AL HOGAR E INFORMES DE PERSONALIDAD (PRE-KÍNDER A 4° MEDIO) */}
        {activeTab === 'personality_reports' && (
          <PersonalityReportsModule
            token={token || ''}
            selectedYear={selectedYear}
            onBack={handleGoBack}
          />
        )}

        {/* VISTA: SALA DE COMPUTACIÓN */}
        {activeTab === 'computer_lab' && <ComputerLabModule token={token || ''} user={user} />}

        {/* VISTA: EVALUACIONES & PIE */}
        {activeTab === 'evaluations_pie' && <EvaluationsPieModule token={token || ''} user={user} />}

        {/* VISTA: INFORMES & FORMULARIOS MINEDUC (DECRETO 170) */}
        {activeTab === 'mineduc_reports' && (
          <MineducReportsModule
            token={token || ''}
            user={user}
            selectedYear={selectedYear}
            onOpenStudentProfile={(s) => setSelectedStudent(s)}
          />
        )}

        {/* VISTA 5: ENTREVISTAS */}
        {activeTab === 'interviews' && <InterviewsModule token={token || ''} />}

        {/* VISTA 6: HOJA DE VIDA */}
        {activeTab === 'observations' && <ObservationsModule token={token || ''} />}

        {/* VISTA 6.5: CONTROL DE ATRASOS & PASES DE ENTRADA (INSPECTORÍA) */}
        {activeTab === 'inspector_passes' && <InspectorPassesModule token={token || ''} user={user} />}

        {/* VISTA: SALIDAS PEDAGÓGICAS Y AUTORIZACIONES */}
        {activeTab === 'pedagogical_trips' && <PedagogicalTripsModule token={token || ''} currentUser={user} />}

        {/* VISTA 7: RECURSOS HUMANOS */}
        {activeTab === 'staff' && <StaffModule token={token || ''} />}

        {/* VISTA 8: DOCUMENTOS INSTITUCIONALES */}
        {activeTab === 'admin_docs' && <AdministrationModule token={token || ''} />}

        {/* VISTA 2.5: NÓMINA GENERAL DE APODERADOS */}
        {activeTab === 'apoderados' && <GuardiansListModule token={token || ''} />}

        {/* VISTA 2.6: CENTRO DE COMUNICACIONES Y REGISTRO DE ENVÍOS */}
        {activeTab === 'communications' && (
          <CourseMessageModal
            isOpen={true}
            isEmbedded={true}
            initialTab="history"
            onClose={() => navigateToTab('home')}
            onMessageSent={loadNotifications}
            readOnly={!canEdit('communications')}
          />
        )}

        {/* VISTA 8.5: BIBLIOTECA CRA */}
        {activeTab === 'library' && <LibraryCRAModule token={token || ''} />}

        {/* VISTA 9: MATRIZ DE PERMISOS POR ROL */}
        {activeTab === 'permissions' && <PermissionsMatrix token={token || ''} />}

        {/* VISTA 10: CONFIGURACIÓN */}
        {activeTab === 'config' && <ConfigModule token={token || ''} />}

        {/* VISTA 11: AUDITORÍA SILENT-WATCH */}
        {activeTab === 'audit' && (
          <div className="table-container" style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={20} color="#4f46e5" /> Registro Inalterable de Auditoría "Silent-Watch"
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                  Mostrando {filteredAuditLogs.length} de {auditLogs.length} eventos registrados en el sistema.
                </p>
              </div>
              <button
                onClick={loadAuditLogs}
                className="btn"
                style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                🔄 Actualizar Registro
              </button>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <Shield size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
                <h4 style={{ fontWeight: 700, color: '#334155', margin: '0 0 0.5rem 0' }}>No se encontraron registros de auditoría</h4>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>
                  {searchTerm ? 'No hay eventos que coincidan con la búsqueda actual.' : 'A medida que se realicen acciones en la plataforma, aparecerán aquí registradas automáticamente.'}
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>Usuario</th>
                    <th>Acción Realizada</th>
                    <th>Detalles del Registro</th>
                    <th>Dirección IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((a: any) => (
                    <tr key={a.id}>
                      <td style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleString('es-CL')}
                      </td>
                      <td>
                        <strong>{a.user_name || 'Sistema'}</strong>
                        {a.user_role && (
                          <span style={{ marginLeft: '6px', fontSize: '0.72rem', background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.45rem', borderRadius: '6px', fontWeight: 700 }}>
                            {a.user_role}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="status-chip info" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                          {a.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.88rem', color: '#334155' }}>{a.details}</td>
                      <td style={{ color: '#64748b', fontSize: '0.82rem', fontFamily: 'monospace' }}>{a.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        </>
        )}
        </Suspense>
      </div>
    </div>
  );
};
