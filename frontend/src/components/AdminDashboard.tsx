import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, GraduationCap, FileText, ClipboardList, Shield, LogOut, MessageSquare, Award, FolderOpen, Briefcase, Settings, Monitor, TrendingUp, Printer, ArrowUpDown, Search, Bell, Activity, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Globe, Lock, Filter, KeyRound, BookOpen, UserCheck, UserX, Heart, User, Puzzle, Calendar, Clock, PenTool, ShieldAlert, FileCheck2, Compass } from 'lucide-react';
import Swal from 'sweetalert2';
import { StudentWindow } from './StudentWindow';
import { GradesSheet } from './GradesSheet';
import { GradesOverview } from './GradesOverview';
import { InterviewsModule } from './InterviewsModule';
import { ObservationsModule } from './ObservationsModule';
import { AdministrationModule } from './AdministrationModule';
import { StaffModule } from './StaffModule';
import { ConfigModule } from './ConfigModule';
import { PermissionsMatrix } from './PermissionsMatrix';
import { MultiviewWindow } from './MultiviewWindow';
import { OfficialEnrollmentForm } from './OfficialEnrollmentForm';
import { ReorderStudentsModal } from './ReorderStudentsModal';
import { UserProfileModal } from './UserProfileModal';
import { ApoderadoView } from './ApoderadoView';
import { InstitutionalPlatformsSection } from './InstitutionalPlatformsSection';
import { LibraryCRAModule } from './LibraryCRAModule';
import { ComputerLabModule } from './ComputerLabModule';
import { EvaluationsPieModule } from './EvaluationsPieModule';
import { GuardiansListModule } from './GuardiansListModule';
import { SubmitStatementModal, PendingStatementItem } from './SubmitStatementModal';
import { InspectorPassesModule } from './InspectorPassesModule';
import { MineducReportsModule } from './MineducReportsModule';
import { CourseMessageModal } from './CourseMessageModal';
import { PedagogicalTripsModule } from './PedagogicalTripsModule';
import { getStudentCourse, isStudentRetired, getStudentWithdrawalDate, sortCoursesList, getStudentYear } from '../utils/course';

export const AdminDashboard: React.FC = () => {
  const { user, token, logout, switchRole, restoreOriginalRole, isSuperAdmin, isImpersonating } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'students' | 'apoderados' | 'grades' | 'overview' | 'computer_lab' | 'evaluations_pie' | 'mineduc_reports' | 'interviews' | 'observations' | 'staff' | 'admin_docs' | 'library' | 'permissions' | 'config' | 'audit' | 'inspector_passes' | 'pedagogical_trips'>(() => {
    try {
      localStorage.removeItem('ltp_admin_tab');
      const saved = sessionStorage.getItem('ltp_admin_tab');
      if (saved && ['home', 'students', 'apoderados', 'grades', 'overview', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'permissions', 'config', 'audit', 'inspector_passes', 'pedagogical_trips'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'home';
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('ltp_admin_tab', activeTab);
    } catch {}
  }, [activeTab]);

  useEffect(() => {
    const handleNav = (e: any) => {
      if (e.detail && ['home', 'students', 'apoderados', 'grades', 'overview', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'permissions', 'config', 'audit', 'inspector_passes', 'pedagogical_trips'].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('ltp_navigate_tab', handleNav);
    return () => window.removeEventListener('ltp_navigate_tab', handleNav);
  }, []);

  const [gradesSubTab, setGradesSubTab] = useState<'sheet' | 'overview'>('sheet');

  const [dynamicMatrix, setDynamicMatrix] = useState<any[]>([]);

  const TAB_TO_FUNCTION: Record<string, string> = {
    home: 'dashboard',
    students: 'enrollment',
    apoderados: 'apoderados',
    grades: 'grades',
    overview: 'overview',
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
    pedagogical_trips: 'pedagogical_trips'
  };

  const rolePermissions: Record<string, string[]> = {
    Admin: ['home', 'students', 'apoderados', 'grades', 'overview', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'permissions', 'config', 'audit', 'inspector_passes', 'pedagogical_trips'],
    Director: ['home', 'students', 'apoderados', 'grades', 'overview', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'staff', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips'],
    Docente: ['home', 'apoderados', 'grades', 'overview', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'admin_docs', 'library', 'pedagogical_trips'],
    Bibliotecario: ['home', 'computer_lab', 'evaluations_pie', 'library', 'admin_docs'],
    Entrevistador: ['home', 'computer_lab', 'evaluations_pie', 'interviews', 'observations', 'admin_docs'],
    Administrativo: ['home', 'students', 'apoderados', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips'],
    Profesionales: ['home', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'interviews', 'observations', 'admin_docs', 'pedagogical_trips'],
    Asistente: ['home', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips'],
    'Asistente de la Educación': ['home', 'computer_lab', 'evaluations_pie', 'mineduc_reports', 'admin_docs', 'library', 'inspector_passes', 'pedagogical_trips'],
    Apoderado: ['home', 'admin_docs'],
    Estudiante: ['home', 'admin_docs'],
    Visita: ['home', 'computer_lab', 'evaluations_pie', 'overview', 'admin_docs']
  };

  const currentRole = user?.role || 'Admin';

  const canAccess = (tab: string) => {
    // Protección vital: El Administrador no debe bloquearse a sí mismo de la Matriz de Permisos
    if (tab === 'permissions' && (currentRole === 'Admin' || isSuperAdmin)) {
      return true;
    }

    if (currentRole === 'Apoderado') {
      return tab === 'home' || tab === 'admin_docs';
    }

    if (dynamicMatrix && dynamicMatrix.length > 0) {
      const funcId = TAB_TO_FUNCTION[tab] || tab;
      const row = dynamicMatrix.find(r => r.functionId === funcId);
      if (row) {
        let roleCol: string = currentRole;
        if (['Admin', 'Administrador'].includes(currentRole)) roleCol = 'Admin';
        else if (['Director', 'Directivo', 'UTP', 'Inspectoría General'].includes(currentRole)) roleCol = 'Director';
        else if (['Docente', 'Docente de Aula', 'Docente Jefatura'].includes(currentRole)) roleCol = 'Docente';
        else if (['Asistente', 'Asistente de la Educación', 'PIE'].includes(currentRole)) roleCol = 'Asistente';
        else if (['Profesionales', 'Convivencia Escolar', 'Entrevistador', 'Psicólogo'].includes(currentRole)) roleCol = 'Profesionales';
        else if ((currentRole as string) === 'Estudiante') roleCol = 'Estudiante';
        else if ((currentRole as string) === 'Apoderado') roleCol = 'Apoderado';

        if (row[roleCol] !== undefined) return Boolean(row[roleCol]);
        if (row[currentRole] !== undefined) return Boolean(row[currentRole]);
      }
    }

    const fallbackList = rolePermissions[currentRole] || rolePermissions['Admin'];
    return fallbackList.includes(tab);
  };

  const getFunctionName = (tab: string): string => {
    const funcId = TAB_TO_FUNCTION[tab] || tab;
    const row = dynamicMatrix.find(r => r.functionId === funcId);
    if (row && row.functionName) return row.functionName;
    const defaultNames: Record<string, string> = {
      home: 'Dashboard General & KPIs',
      students: 'Matrícula Completa MINEDUC/FIDE',
      apoderados: 'Nómina & Registro Institucional de Apoderados',
      grades: 'Libro de Calificaciones Ponderadas',
      overview: 'Panorama de Notas & Rendimiento',
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
    if (!canAccess(tab)) {
      const moduleName = label || getFunctionName(tab);
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
    setActiveTab(tab as any);
  };

  useEffect(() => {
    if (!token || user?.role === 'Apoderado' || user?.role === 'Estudiante') return;
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
      setActiveTab('home');
    }
  }, [user?.role, dynamicMatrix]);
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
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
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
    fetch('/api/notifications/read-all', {
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

    loadAuditLogs();
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
      loadNotifications();
      loadPendingStatements();
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const detectedYears = Array.from(new Set(students.map(getStudentYear))).filter(Boolean) as number[];
  const availableYears = Array.from(new Set([...detectedYears, 2026, 2027, 2028])).sort((a, b) => a - b);
  const yearStudents = students.filter(s => getStudentYear(s) === selectedYear);
  const availableCourses = sortCoursesList(Array.from(new Set(yearStudents.map(getStudentCourse))).filter(Boolean) as string[]);

  const filteredStudents = yearStudents.filter(s => {
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
  });

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
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* MODAL DE COMUNICACIÓN FOCALIZADA A DOCENTES DEL CURSO */}
      <CourseMessageModal
        isOpen={showCourseMessageModal}
        onClose={() => setShowCourseMessageModal(false)}
        onMessageSent={loadNotifications}
      />

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
            { id: 'grades', label: 'Calificaciones', icon: ClipboardList, activeMatch: (t: string) => t === 'grades' || t === 'overview' },
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
              const isActive = item.activeMatch ? item.activeMatch(activeTab) : activeTab === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigateToTab(item.id, item.label)}
                  title={sidebarCollapsed ? item.label : undefined}
                  style={{
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', width: '100%' }}>
                    <item.icon size={19} style={{ flexShrink: 0 }} />
                    {!sidebarCollapsed && (
                      <span style={{ fontWeight: isActive ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </nav>

        {/* BOTÓN CERRAR SESIÓN EN LA PARTE INFERIOR DEL MENÚ SIDEBAR (FIJO Y NUNCA SE TRASLAPA) */}
        <div className="sidebar-footer" style={{ padding: sidebarCollapsed ? '0.75rem 0.35rem' : '0.75rem 0.65rem' }}>
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
          <div className="search-bar">
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Buscar por RUT, Alumno o Funcionario..."
              className="search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div ref={headerDropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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

            <button onClick={() => setShowMultiview(true)} className="btn btn-primary" style={{ gap: '0.4rem', borderRadius: '9999px', padding: '0.5rem 1.1rem' }}>
              <Monitor size={16} /> Multivista QR Dual
            </button>

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
                color: user?.role === 'Admin' ? '#4338ca' : user?.role === 'Director' ? '#1d4ed8' : user?.role === 'Docente' ? '#15803d' : '#c2410c'
              }}>
                {user?.role === 'Admin' ? '👑 Administrador' :
                 user?.role === 'Director' ? '🎓 Directivo' :
                 user?.role === 'Docente' ? '👨‍🏫 Docente' :
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
                <div className="avatar-circle">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
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
                  width: '230px',
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
                            <option value="Entrevistador">🗣️ Convivencia Escolar / Entrevistas</option>
                            <option value="Asistente">🤝 Asistente de la Educación / PIE</option>
                            <option value="Administrativo">📋 Administrativo / Matrícula</option>
                            <option value="Profesionales">🧠 Profesional PIE / Salud</option>
                            <option value="Apoderado">👨‍👩‍👧 Apoderado (Titular / Suplente)</option>
                            <option value="Visita">👁️ Visita (Solo Lectura)</option>
                          </>
                        ) : (
                          (user?.roles || [user?.role || 'Docente']).map(r => (
                            <option key={r} value={r}>
                              {r === 'Docente' ? '👨‍🏫 Docente de Aula / Jefatura' :
                               r === 'Director' ? '🎓 Directivo / UTP / Inspectoría' :
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
                      setShowProfileModal(true);
                    }}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9' }}
                  >
                    ✏️ Editar Mi Perfil / Datos
                  </button>

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

        {/* VISTA SEGÚN EL ROL SELECCIONADO (SI ES APODERADO SE MUESTRA EL PORTAL APODERADO) */}
        {user?.role === 'Apoderado' && activeTab === 'home' ? (
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

        {/* VISTA 1: DASHBOARD GENERAL CON BANNER Y PLATAFORMAS DE INTERÉS */}
        {activeTab === 'home' && (
          <div>
            <InstitutionalPlatformsSection
              token={token || ''}
              userName={user?.name}
              userRole={user?.role}
              customSubtitle="Panel de Administración • Liceo Pro / LTP v2.0"
            />

            {/* TARJETAS ESTADÍSTICAS KPI CON NAVEGACIÓN DIRECTA */}
            <div className="card-grid">
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
            </div>
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

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                  <button onClick={() => setShowReorderModal(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ArrowUpDown size={16} /> Reordenar A-Z
                  </button>
                  <button onClick={() => setSelectedStudent({ anno: selectedYear, academic_year: selectedYear })} className="btn btn-primary">
                    + Nueva Matrícula {selectedYear}
                  </button>
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
                                👁️ Ficha Completa
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
              width: 'fit-content'
            }}>
              <button
                onClick={() => setGradesSubTab('sheet')}
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
              <button
                onClick={() => setGradesSubTab('overview')}
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
            </div>

            {gradesSubTab === 'sheet' ? (
              <GradesSheet token={token || ''} />
            ) : (
              <GradesOverview token={token || ''} />
            )}
          </div>
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
      </div>
    </div>
  );
};
