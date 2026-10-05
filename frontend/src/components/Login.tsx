import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatRut } from '../utils/rut';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import Swal from 'sweetalert2';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface RoleConfig {
  title: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  iconBg: string;
  shadowColor: string;
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  Admin: {
    title: '👑 Administrador',
    subtitle: 'Control total de plataforma, matrículas y configuración general',
    badge: 'Control Total',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
    borderColor: '#6366f1',
    textColor: '#312e81',
    iconBg: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    shadowColor: 'rgba(99, 102, 241, 0.25)'
  },
  Director: {
    title: '🏛️ Equipo Directivo / UTP',
    subtitle: 'Supervisión pedagógica institucional, reportes e inspectoría',
    badge: 'Directivo',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
    borderColor: '#2563eb',
    textColor: '#1e40af',
    iconBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    shadowColor: 'rgba(37, 99, 235, 0.25)'
  },
  Docente: {
    title: '👨‍🏫 Docente de Aula / Jefatura',
    subtitle: 'Libro de clases, leccionario, asistencia y calificaciones',
    badge: 'Gestión Aula',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
    borderColor: '#0284c7',
    textColor: '#0c4a6e',
    iconBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    shadowColor: 'rgba(2, 132, 199, 0.25)'
  },
  Entrevistador: {
    title: '💬 Convivencia Escolar / Entrevistas',
    subtitle: 'Atención a la comunidad, citaciones, actas de entrevista y relatos',
    badge: 'Convivencia',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fdf4ff 100%)',
    borderColor: '#c026d3',
    textColor: '#86198f',
    iconBg: 'linear-gradient(135deg, #c026d3 0%, #a21caf 100%)',
    shadowColor: 'rgba(192, 38, 211, 0.25)'
  },
  Profesionales: {
    title: '🧠 Dupla Psicosocial / PIE',
    subtitle: 'Seguimiento psicosocial, apoyo integral al aprendizaje e inclusión',
    badge: 'PIE / Salud',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
    borderColor: '#9333ea',
    textColor: '#581c87',
    iconBg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
    shadowColor: 'rgba(147, 51, 234, 0.25)'
  },
  Asistente: {
    title: '🤝 Asistente de la Educación',
    subtitle: 'Soporte escolar, inspectoría de patio, apoyo de aula y convivencia',
    badge: 'Soporte Escolar',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderColor: '#475569',
    textColor: '#1e293b',
    iconBg: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    shadowColor: 'rgba(71, 85, 105, 0.25)'
  },
  Administrativo: {
    title: '📋 Administrativo / Matrícula',
    subtitle: 'Gestión documental, expedientes de estudiantes y secretaría',
    badge: 'Secretaría',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)',
    borderColor: '#0d9488',
    textColor: '#115e59',
    iconBg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    shadowColor: 'rgba(13, 148, 136, 0.25)'
  },
  Bibliotecario: {
    title: '📚 Biblioteca CRA',
    subtitle: 'Préstamo de textos, inventario bibliográfico y recursos pedagógicos',
    badge: 'Recursos CRA',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)',
    borderColor: '#d97706',
    textColor: '#92400e',
    iconBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    shadowColor: 'rgba(217, 119, 6, 0.25)'
  },
  Apoderado: {
    title: '👨‍👩‍👧 Apoderado / Tutor',
    subtitle: 'Portal de apoderados: seguimiento académico, asistencia y certificados',
    badge: 'Familia',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
    borderColor: '#10b981',
    textColor: '#064e3b',
    iconBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadowColor: 'rgba(16, 185, 129, 0.25)'
  },
  Estudiante: {
    title: '🎓 Estudiante / Alumno',
    subtitle: 'Portal estudiantil: calificaciones, asistencia y horario escolar',
    badge: 'Alumno',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
    borderColor: '#f59e0b',
    textColor: '#78350f',
    iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    shadowColor: 'rgba(245, 158, 11, 0.25)'
  },
  Visita: {
    title: '👁️ Modo Visita',
    subtitle: 'Acceso de solo lectura para auditorías e inspecciones externas',
    badge: 'Solo Lectura',
    bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
    borderColor: '#94a3b8',
    textColor: '#334155',
    iconBg: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    shadowColor: 'rgba(148, 163, 184, 0.25)'
  }
};

const normalizeRole = (role: string): string => {
  const trimmed = (role || '').trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'asistente de la educación' || lower === 'asistente de la educacion') return 'Asistente';
  if (lower === 'profesor') return 'Docente';
  if (lower === 'alumno') return 'Estudiante';
  if (lower === 'directivo') return 'Director';
  return trimmed;
};

const ROLE_PRIORITY: Record<string, number> = {
  Admin: 1,
  Director: 2,
  Docente: 3,
  Entrevistador: 4,
  Profesionales: 5,
  Asistente: 6,
  Administrativo: 7,
  Bibliotecario: 8,
  Apoderado: 9,
  Estudiante: 10,
  Visita: 11
};

export const Login: React.FC = () => {
  const [run, setRun] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const [multiRoleUser, setMultiRoleUser] = useState<{ token: string; user: any; roles: string[] } | null>(null);

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatRut(rawValue);
    setRun(formatted);
  };

  const executeLoginWithRole = (token: string, userObj: any, activeRole: string) => {
    localStorage.removeItem('ltp_teacher_active_tab');
    sessionStorage.removeItem('ltp_teacher_active_tab');
    localStorage.removeItem('ltp_active_tab');
    sessionStorage.removeItem('ltp_active_tab');
    localStorage.removeItem('ltp_admin_tab');
    sessionStorage.removeItem('ltp_admin_tab');
    try {
      window.history.replaceState(null, '', '/');
    } catch (_) {}
    const finalUser = {
      ...userObj,
      role: activeRole,
      originalRole: userObj.role || activeRole
    };
    login(token, finalUser);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `¡Bienvenido ${finalUser.name}! (${ROLE_CONFIGS[activeRole]?.title || activeRole})`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!run || !password) {
      Swal.fire('Atención', 'Ingresa tu RUT y contraseña', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run, password })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { error: 'Respuesta inválida del servidor.' };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Obtener todos los roles asociados a este RUT, normalizarlos, deduplicarlos y ordenarlos por prioridad
      const rawRoles: string[] = data.roles || data.user?.roles || [data.user?.role || 'Docente'];
      const deduplicatedRoles = Array.from(new Set(rawRoles.map(normalizeRole))).sort((a, b) => {
        const pA = ROLE_PRIORITY[a] ?? 99;
        const pB = ROLE_PRIORITY[b] ?? 99;
        return pA - pB;
      });

      if (deduplicatedRoles.length > 1) {
        setMultiRoleUser({ token: data.token, user: data.user, roles: deduplicatedRoles });
      } else {
        executeLoginWithRole(data.token, data.user, deduplicatedRoles[0] || 'Docente');
      }
    } catch (err: any) {
      Swal.fire('Error de Acceso', err.message || 'Error en la conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', boxSizing: 'border-box' }}>
      
      {showForgotPasswordModal && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPasswordModal(false)}
        />
      )}

      {/* MODAL DE SELECCIÓN DE MODO DE ACCESO PARA USUARIOS MULTI-PERFIL */}
      {multiRoleUser && (
        <div
          className="a11y-active-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Selección de perfil de acceso"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 3000, padding: '1.25rem'
          }}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: multiRoleUser.roles.length > 2 ? '2rem 2rem 1.5rem 2rem' : '2.25rem 2rem 1.75rem 2rem',
            width: '100%',
            maxWidth: multiRoleUser.roles.length > 2 ? '800px' : '520px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
            boxSizing: 'border-box',
            position: 'relative',
            animation: 'fadeInUp 0.25s ease-out'
          }}>
            {/* BOTÓN X PARA CERRAR */}
            <button
              type="button"
              onClick={() => setMultiRoleUser(null)}
              aria-label="Cerrar selección de perfil y volver al inicio de sesión"
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: '#f1f5f9', border: 'none', borderRadius: '9999px',
                width: '32px', height: '32px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', transition: 'all 0.2s ease', zIndex: 10
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            >
              ✕
            </button>

            {/* ENCABEZADO CON BADGE Y SALUDO */}
            <div
              className="a11y-readable"
              aria-label={`Selección de Perfil. ¿Cómo deseas ingresar hoy? Hola ${multiRoleUser.user.name}, dispones de varios perfiles activos. Selecciona el modo para esta sesión con las flechas de dirección y presiona Enter.`}
              style={{ textAlign: 'center', marginBottom: '1.5rem', flexShrink: 0 }}
            >
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: '#1d4ed8', padding: '0.35rem 0.85rem', borderRadius: '9999px',
                fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: '0.6rem', border: '1px solid #bfdbfe'
              }}>
                🎓 Selección de Perfil
              </div>

              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
                ¿Cómo deseas ingresar hoy?
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
                Hola <strong style={{ color: '#0f172a' }}>{multiRoleUser.user.name}</strong>, dispones de varios perfiles activos. Selecciona el modo para esta sesión:
              </p>
            </div>

            {/* LISTA/GRID ADAPTATIVA DE TARJETAS DE ACCESO */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: multiRoleUser.roles.length > 2 ? 'repeat(auto-fit, minmax(310px, 1fr))' : '1fr',
              gap: '0.9rem',
              maxHeight: 'min(62vh, 520px)',
              overflowY: 'auto',
              padding: '0.25rem 0.4rem 0.5rem 0.15rem',
              boxSizing: 'border-box'
            }}>
              {multiRoleUser.roles.map(rKey => {
                const cfg = ROLE_CONFIGS[rKey] || {
                  title: `Modo ${rKey}`,
                  subtitle: `Ingresar con permisos de ${rKey}`,
                  badge: rKey,
                  bgGradient: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  borderColor: '#94a3b8',
                  textColor: '#1e293b',
                  iconBg: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                  shadowColor: 'rgba(0, 0, 0, 0.08)'
                };

                return (
                  <button
                    key={rKey}
                    type="button"
                    aria-label={`Ingresar como ${cfg.title}. ${cfg.subtitle}. Presione Enter para seleccionar este perfil.`}
                    onClick={() => executeLoginWithRole(multiRoleUser.token, multiRoleUser.user, rKey)}
                    style={{
                      width: '100%',
                      minHeight: '82px',
                      padding: '1rem 1.25rem',
                      borderRadius: '16px',
                      border: `1.5px solid ${cfg.borderColor}33`,
                      borderLeft: `5px solid ${cfg.borderColor}`,
                      background: cfg.bgGradient,
                      color: cfg.textColor,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      boxShadow: `0 4px 12px -2px ${cfg.shadowColor}`,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 10px 22px -3px ${cfg.shadowColor}`;
                      e.currentTarget.style.borderColor = cfg.borderColor;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 12px -2px ${cfg.shadowColor}`;
                      e.currentTarget.style.borderColor = `${cfg.borderColor}33`;
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: cfg.textColor, lineHeight: 1.2 }}>
                          {cfg.title}
                        </span>
                        <span style={{
                          background: `${cfg.borderColor}18`,
                          color: cfg.borderColor,
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap'
                        }}>
                          {cfg.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, lineHeight: 1.35 }}>
                        {cfg.subtitle}
                      </div>
                    </div>

                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: cfg.iconBg, color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.95rem', fontWeight: 800, flexShrink: 0,
                      boxShadow: `0 4px 10px ${cfg.shadowColor}`
                    }}>
                      ➔
                    </div>
                  </button>
                );
              })}
            </div>

            {/* BOTÓN INFERIOR DE CANCELAR */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setMultiRoleUser(null)}
                aria-label="Cancelar y volver al inicio de sesión"
                style={{
                  background: 'transparent', border: 'none', color: '#64748b',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  padding: '0.4rem 0.8rem', borderRadius: '8px', transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >
                ← Cancelar y volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TARJETA DE LOGIN CON TODOS LOS TEXTOS CENTRADOS */}
      <div style={{ background: 'white', padding: '2.5rem 2rem', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
        
        <img
          src="/logo.png"
          alt="LTP Logo Oficial"
          style={{ height: '70px', margin: '0 auto 1rem auto', display: 'block', objectFit: 'contain' }}
        />
        
        <h2
          aria-label="Liceo Pro, Plataforma Escolar y Académica. Pantalla de Inicio de Sesión."
          style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', textAlign: 'center', marginBottom: '0.25rem', fontWeight: 800, fontSize: '1.6rem' }}
        >
          LICEO PRO
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem', fontSize: '0.875rem', fontWeight: 500 }}>
          Plataforma Escolar & Académica
        </p>
        
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          
          <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textAlign: 'center' }}>
              RUT Funcionario / Apoderado / Estudiante
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9kK\.\-]*"
                autoComplete="username"
                aria-label="Campo RUT Funcionario, Apoderado o Estudiante. Escriba su RUT y presione flecha abajo para ir a la contraseña."
                value={run}
                onChange={handleRunChange}
                placeholder="12.345.678-9"
                style={{
                  width: '100%',
                  padding: '0.75rem 3.2rem 0.75rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                aria-label="Botón para añadir dígito verificador K al RUT"
                onClick={() => {
                  const clean = run.replace(/[^0-9kK]/g, '');
                  if (clean.length >= 7) {
                    const base = clean.replace(/k$/i, '');
                    setRun(formatRut(base + 'K'));
                  } else if (clean.length > 0) {
                    setRun(formatRut(clean + 'K'));
                  } else {
                    setRun('K');
                  }
                }}
                title="Añadir dígito verificador K al RUT"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#4f46e5',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                - K
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textAlign: 'center' }}>
              Contraseña Secreta
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                inputMode="text"
                autoComplete="current-password"
                aria-label="Campo Contraseña Secreta. Escriba su contraseña y presione Enter para iniciar sesión, o flecha abajo para continuar."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                aria-label={showPassword ? 'Botón Ocultar contraseña' : 'Botón Ver contraseña'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* ENLACE PARA RECUPERACIÓN AUTOSERVICIO DE CONTRASEÑA */}
          <div style={{ textAlign: 'right', marginBottom: '1.75rem' }}>
            <button
              type="button"
              aria-label="Botón ¿Olvidaste tu contraseña? Recuperar acceso"
              onClick={() => setShowForgotPasswordModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4f46e5',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: 0
              }}
            >
              <KeyRound size={14} /> ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-label="Botón Iniciar Sesión. Presione Enter para ingresar a la plataforma."
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>

          {/* GUÍA RÁPIDA DE ACCESO PARA APODERADOS Y ESTUDIANTES */}
          <div
            className="a11y-readable"
            aria-label="Información para Apoderados y Estudiantes: Ingresa con tu RUT registrado en matrícula. Tu contraseña son los primeros 6 dígitos del RUT del estudiante o los primeros 6 dígitos de tu propio RUT sin puntos."
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 0.9rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              fontSize: '0.76rem',
              color: '#166534',
              lineHeight: 1.45,
              textAlign: 'left'
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: '2px', color: '#14532d' }}>
              👨‍👩‍👧 ¿Eres Apoderado o Estudiante del Liceo?
            </div>
            <div>
              Ingresa con tu <strong>RUT</strong> (registrado en matrícula). Tu contraseña son los <strong>primeros 6 dígitos del RUT del estudiante</strong> o los <strong>6 dígitos de tu propio RUT</strong> (sin puntos).
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

