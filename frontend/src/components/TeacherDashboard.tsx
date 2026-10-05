import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, BookOpen, Award, Link, LogOut, CheckSquare, User, ArrowRight, ArrowLeft, Clock, PenTool, Bell, MessageSquare, Palette } from 'lucide-react';
import Swal from 'sweetalert2';
import { InstitutionalPlatformsSection } from './InstitutionalPlatformsSection';
import { SubmitStatementModal, PendingStatementItem } from './SubmitStatementModal';
import { TeacherTabId, getTeacherTabFromUrl, syncTeacherUrl } from '../utils/urlRouter';

const GradesSheet = lazy(() => import('./GradesSheet').then(m => ({ default: m.GradesSheet })));
const GradesOverview = lazy(() => import('./GradesOverview').then(m => ({ default: m.GradesOverview })));
const ObservationsModule = lazy(() => import('./ObservationsModule').then(m => ({ default: m.ObservationsModule })));
const UserProfileModal = lazy(() => import('./UserProfileModal').then(m => ({ default: m.UserProfileModal })));
const TeacherCoursesGrid = lazy(() => import('./TeacherCoursesGrid').then(m => ({ default: m.TeacherCoursesGrid })));
const CourseMessageModal = lazy(() => import('./CourseMessageModal').then(m => ({ default: m.CourseMessageModal })));

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

export const TeacherDashboard: React.FC = () => {
  const { user, logout, token, switchRole, isSuperAdmin, isImpersonating, restoreOriginalRole, canCustomizeProfile } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'info' | 'customize'>('info');
  const [showCourseMessageModal, setShowCourseMessageModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [pendingStatements, setPendingStatements] = useState<PendingStatementItem[]>([]);
  const [selectedStatementItem, setSelectedStatementItem] = useState<PendingStatementItem | null>(null);
  const [selectedCourseSubject, setSelectedCourseSubject] = useState<{
    courseName: string;
    subjectName: string;
    isHomeroom: boolean;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<TeacherTabId>(() => {
    const urlTab = getTeacherTabFromUrl();
    if (urlTab) return urlTab;
    try {
      const saved = localStorage.getItem('ltp_teacher_active_tab');
      if (saved && ['home', 'my_courses', 'homeroom', 'observations', 'links'].includes(saved)) {
        return saved as TeacherTabId;
      }
    } catch {}
    return 'home';
  });
  const [tabHistory, setTabHistory] = useState<TeacherTabId[]>([]);

  const navigateTeacherTab = (nextTab: TeacherTabId) => {
    setActiveTab(prev => {
      if (prev !== nextTab) {
        setTabHistory(hist => [...hist.slice(-15), prev]);
      }
      return nextTab;
    });
  };

  const handleTeacherGoBack = () => {
    if (activeTab === 'my_courses' && selectedCourseSubject) {
      setSelectedCourseSubject(null);
      return;
    }
    if (tabHistory.length > 0) {
      const nextHistory = [...tabHistory];
      const prevTab = nextHistory.pop() || 'home';
      setTabHistory(nextHistory);
      setActiveTab(prevTab);
      return;
    }
    setActiveTab('home');
  };

  React.useEffect(() => {
    try {
      localStorage.setItem('ltp_teacher_active_tab', activeTab);
    } catch {}
    syncTeacherUrl(activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    const handlePopState = () => {
      const urlTab = getTeacherTabFromUrl() || 'home';
      setActiveTab(urlTab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      .catch(() => {});
  };

  const markNotificationsAsRead = () => {
    if (!token) return;
    fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPendingStatements();
    loadNotifications();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadPendingStatements();
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="app-container">
      {/* Sidebar Docente */}
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div className="sidebar-brand">
          <BookOpen size={28} />
          <span>LTP Docente</span>
        </div>

        <nav className="nav-menu" style={{ flex: 1 }}>
          <div
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => {
              navigateTeacherTab('home');
              setSelectedCourseSubject(null);
            }}
          >
            <Home size={20} /> Inicio
          </div>
          <div
            className={`nav-item ${activeTab === 'my_courses' ? 'active' : ''}`}
            onClick={() => {
              navigateTeacherTab('my_courses');
              setSelectedCourseSubject(null);
            }}
          >
            <BookOpen size={20} /> Mis Cursos Asignados
          </div>
          <div className={`nav-item ${activeTab === 'homeroom' ? 'active' : ''}`} onClick={() => navigateTeacherTab('homeroom')}>
            <CheckSquare size={20} /> Informe Jefatura
          </div>
          <div className={`nav-item ${activeTab === 'observations' ? 'active' : ''}`} onClick={() => navigateTeacherTab('observations')}>
            <Award size={20} /> Anotaciones
          </div>
          <div className={`nav-item ${activeTab === 'links' ? 'active' : ''}`} onClick={() => navigateTeacherTab('links')}>
            <Link size={20} /> Enlaces Institucionales
          </div>
        </nav>

        {/* ACCESO RÁPIDO A MI PERFIL Y BOTÓN CERRAR SESIÓN EN LA PARTE INFERIOR DEL MENÚ */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div
            className="nav-item"
            onClick={() => {
              setProfileModalTab(canCustomizeProfile ? 'customize' : 'info');
              setShowProfileModal(true);
            }}
            style={{ color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.6rem 0.85rem' }}
          >
            <Palette size={19} color="#a5b4fc" />
            <span style={{ marginLeft: '0.2rem' }}>Personalizar mi perfil</span>
          </div>
          <div
            className="nav-item"
            onClick={() => logout()}
            style={{ color: '#f87171', fontWeight: 700, cursor: 'pointer', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '8px', padding: '0.65rem 0.85rem' }}
          >
            <LogOut size={19} color="#f87171" />
            <span style={{ marginLeft: '0.2rem' }}>Cerrar Sesión</span>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="main-content">
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            {activeTab !== 'home' && (
              <button
                type="button"
                onClick={handleTeacherGoBack}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #4f46e5',
                  background: '#eef2ff',
                  color: '#312e81',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
                title="Volver a la pantalla anterior"
              >
                <ArrowLeft size={16} /> Volver Atrás
              </button>
            )}
            <div
              onClick={() => {
                setProfileModalTab('info');
                setShowProfileModal(true);
              }}
              title="Haga clic para abrir Mi Perfil"
              className="avatar-circle"
              style={{ width: '44px', height: '44px', cursor: 'pointer', overflow: 'visible', flexShrink: 0 }}
            >
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {canCustomizeProfile && user?.avatar ? (
                  <img src={user.avatar} alt={user.name || 'Docente'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.name ? user.name.substring(0, 2).toUpperCase() : 'DC'
                )}
              </div>
              <div className="status-dot"></div>
            </div>
            <div>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Panel del Profesor</h1>
              <p style={{ color: '#64748b', fontSize: '0.9rem', cursor: 'pointer', margin: '0.15rem 0 0 0' }} onClick={() => { setProfileModalTab('info'); setShowProfileModal(true); }} title="Haga clic para editar su perfil">
                Bienvenido, <strong style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>{user?.name}</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* BADGE DEL PERFIL ACTIVO */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '0.78rem',
              background: '#e0e7ff',
              color: '#3730a3',
              border: '1px solid #c7d2fe',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <span>👨‍🏫 Perfil Activo:</span>
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.3px' }}>Docente</span>
            </div>

            <button
              onClick={() => setShowCourseMessageModal(true)}
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.45rem 1.1rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
              }}
              title="Enviar mensaje o correo a los profesores de un curso en específico"
            >
              <MessageSquare size={16} /> Comunicar a Curso
            </button>

            {/* CAMPANA DE NOTIFICACIONES DOCENTE */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setShowNotificationDropdown(prev => !prev);
                  if (!showNotificationDropdown && unreadCount > 0) {
                    markNotificationsAsRead();
                  }
                }}
                style={{
                  background: showNotificationDropdown ? '#e0e7ff' : '#f8fafc',
                  border: '1px solid #cbd5e1',
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
                title="Notificaciones y Comunicados"
              >
                <Bell size={19} color={unreadCount > 0 ? '#4f46e5' : '#64748b'} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
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
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Bell size={16} color="#4f46e5" /> Notificaciones y Avisos ({notifications.length})
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
                              background: n.type === 'COURSE_MESSAGE' ? '#e0e7ff' : '#fef3c7',
                              color: n.type === 'COURSE_MESSAGE' ? '#4338ca' : '#92400e',
                              marginTop: '2px'
                            }}>
                              <MessageSquare size={16} />
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

            <button
              onClick={() => {
                setProfileModalTab('info');
                setShowProfileModal(true);
              }}
              className="btn"
              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
            >
              <User size={16} color="#4f46e5" /> Mi perfil
            </button>

            {canCustomizeProfile && (
              <button
                onClick={() => {
                  setProfileModalTab('customize');
                  setShowProfileModal(true);
                }}
                className="btn"
                style={{ background: '#f5f3ff', color: '#4f46e5', border: '1px solid #c7d2fe', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
              >
                <Palette size={16} color="#4f46e5" /> Personalizar mi perfil
              </button>
            )}

            {((user?.roles && user.roles.length > 1) || isSuperAdmin) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#eef2ff', padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid #c7d2fe' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4338ca' }}>🔀 Perfil:</span>
                <select
                  value={user?.role}
                  onChange={e => switchRole(e.target.value as any)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #a5b4fc',
                    borderRadius: '12px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#3730a3',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
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
                        {r === 'Docente' ? '👨‍🏫 Docente' :
                         r === 'Director' ? '🎓 Directivo' :
                         r === 'Entrevistador' ? '🗣️ Entrevistador' :
                         r === 'Asistente' ? '🤝 Asistente Ed.' :
                         r === 'Administrativo' ? '📋 Administrativo' :
                         r === 'Profesionales' ? '🧠 Profesional PIE' :
                         r === 'Apoderado' ? '👨‍👩‍👧 Apoderado' :
                         r === 'Admin' ? '👑 Admin' : r}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <button
              onClick={() => logout()}
              className="btn"
              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
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
            marginBottom: '1.25rem',
            borderRadius: '10px',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔀</span>
              <span>
                <strong>Modo Vista Simulada:</strong> Estás navegando actualmente con el perfil <strong>&quot;Docente&quot;</strong> ({user?.name}). Las funciones y accesos corresponden al aula y jefatura.
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
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 14px rgba(49, 46, 129, 0.25)',
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
                  <span>Tienes {pendingStatements.length} solicitud{pendingStatements.length > 1 ? 'es' : ''} de relato oficial de entrevista pendiente{pendingStatements.length > 1 ? 's' : ''}</span>
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 800,
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <PenTool size={16} /> Completar Relato y Firmar Ahora →
            </button>
          </div>
        )}

        {/* PESTAÑA 1: INICIO (BIENVENIDA, PLATAFORMAS INSTITUCIONALES Y ACCESOS RÁPIDOS) */}
        {activeTab === 'home' && (
          <div>
            <InstitutionalPlatformsSection
              token={token || ''}
              userName={user?.name}
              userRole={user?.role}
              customSubtitle="Panel Docente • Liceo Pro / LTP v2.0"
            />

            {/* ACCESOS DIRECTOS PRINCIPALES DE GESTIÓN ESCOLAR */}
            <div style={{ marginTop: '1.75rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Accesos Directos de Gestión
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                
                {/* ACCESO A MIS CURSOS */}
                <div
                  onClick={() => {
                    navigateTeacherTab('my_courses');
                    setSelectedCourseSubject(null);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 18px -3px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#6366f1';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Mis Cursos Asignados</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Ingreso de notas, libro de clases y evaluaciones</p>
                  </div>
                  <ArrowRight size={18} color="#94a3b8" />
                </div>

                {/* ACCESO A INFORME JEFATURA */}
                <div
                  onClick={() => navigateTeacherTab('homeroom')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 18px -3px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#059669';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckSquare size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Informe Jefatura</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Supervisión general, asignaturas y promedios del curso</p>
                  </div>
                  <ArrowRight size={18} color="#94a3b8" />
                </div>

                {/* ACCESO A ANOTACIONES */}
                <div
                  onClick={() => navigateTeacherTab('observations')}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 18px -3px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#d97706';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Award size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Hoja de Vida y Anotaciones</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Registro de anotaciones positivas y observaciones</p>
                  </div>
                  <ArrowRight size={18} color="#94a3b8" />
                </div>

              </div>
            </div>
          </div>
        )}

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
                onClick={handleTeacherGoBack}
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
                onClick={() => {
                  navigateTeacherTab('home');
                  setSelectedCourseSubject(null);
                }}
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
                {activeTab === 'my_courses'
                  ? selectedCourseSubject
                    ? `${selectedCourseSubject.courseName} — ${selectedCourseSubject.subjectName}`
                    : 'Mis Cursos Asignados'
                  : activeTab === 'homeroom'
                    ? 'Informe Jefatura'
                    : activeTab === 'observations'
                      ? 'Hoja de Vida y Anotaciones'
                      : 'Enlaces Institucionales'}
              </strong>
            </div>
          </div>
        )}

        <Suspense fallback={<ModuleLoader />}>
          {/* PESTAÑA 2: MIS CURSOS ASIGNADOS (GRID Y CALIFICACIONES) */}
          {activeTab === 'my_courses' && (
            selectedCourseSubject === null ? (
              <TeacherCoursesGrid
                onSelectCourse={(courseName, subjectName, isHomeroom) => {
                  setSelectedCourseSubject({ courseName, subjectName, isHomeroom });
                }}
              />
            ) : (
              <GradesSheet
                token={token || ''}
                initialCourseName={selectedCourseSubject.courseName}
                initialSubjectName={selectedCourseSubject.subjectName}
                onBackToGrid={() => setSelectedCourseSubject(null)}
              />
            )
          )}

          {/* PESTAÑA 3: INFORME JEFATURA */}
          {activeTab === 'homeroom' && <GradesOverview token={token || ''} />}

          {/* PESTAÑA 4: ANOTACIONES */}
          {activeTab === 'observations' && <ObservationsModule token={token || ''} />}

          {/* PESTAÑA 5: ENLACES INSTITUCIONALES */}
          {activeTab === 'links' && (
            <InstitutionalPlatformsSection
              token={token || ''}
              userName={user?.name}
              userRole={user?.role}
              customSubtitle="Enlaces y Accesos Institucionales • Liceo Pro / LTP v2.0"
            />
          )}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        {/* MODAL DE EDICIÓN DE PERFIL DEL USUARIO DOCENTE */}
        {showProfileModal && (
          <UserProfileModal initialTab={profileModalTab} onClose={() => setShowProfileModal(false)} />
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

      {/* MODAL REDACTAR Y FIRMAR RELATO DIGITAL */}
      {selectedStatementItem && (
        <SubmitStatementModal
          item={selectedStatementItem}
          token={token || ''}
          onClose={() => setSelectedStatementItem(null)}
          onSubmitted={() => {
            setSelectedStatementItem(null);
            loadPendingStatements();
          }}
        />
      )}
    </div>
  );
};
