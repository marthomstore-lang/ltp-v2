import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'Admin' | 'Director' | 'Docente' | 'Entrevistador' | 'Administrativo' | 'Profesionales' | 'Asistente' | 'Comunicaciones' | 'Apoderado' | 'Visita' | 'Estudiante';

export interface UserThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  buttonColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  sidebarColor?: string;
}

export const DEFAULT_PLATFORM_THEME: Required<UserThemeConfig> = {
  primaryColor: '#4f46e5',
  secondaryColor: '#ffffff',
  buttonColor: '#4f46e5',
  accentColor: '#8b5cf6',
  backgroundColor: '#f1f5f9',
  sidebarColor: '#0f172a'
};

export const canUserCustomizeAppearance = (role?: string | null): boolean => {
  const norm = String(role || '').trim().toLowerCase();
  if (!norm) return false;
  if (norm === 'apoderado' || norm === 'estudiante' || norm === 'alumno' || norm === 'visita') {
    return false;
  }
  return !norm.includes('apoderad') && !norm.includes('estudiant') && !norm.includes('alumn') && !norm.includes('visita');
};

export const applyUserThemeToDocument = (theme?: UserThemeConfig | null, role?: string | null) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const allowed = canUserCustomizeAppearance(role);

  if (!allowed || !theme || Object.keys(theme).length === 0) {
    // Restaurar colores predeterminados institucionales
    root.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)');
    root.style.setProperty('--sidebar-solid', '#0f172a');
    root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)');
    root.style.setProperty('--primary', '#4f46e5');
    root.style.setProperty('--primary-hover', '#4338ca');
    root.style.setProperty('--secondary-color', '#ffffff');
    root.style.setProperty('--button-color', '#4f46e5');
    root.style.setProperty('--button-bg', 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)');
    root.style.setProperty('--accent-purple', '#8b5cf6');
    root.style.setProperty('--bg-app', '#f1f5f9');
    root.style.setProperty('--bg-card', '#ffffff');
    root.style.setProperty('--border-focus', '#818cf8');
    return;
  }

  const primary = theme.primaryColor || DEFAULT_PLATFORM_THEME.primaryColor;
  const secondary = theme.secondaryColor || DEFAULT_PLATFORM_THEME.secondaryColor;
  const button = theme.buttonColor || primary;
  const accent = theme.accentColor || DEFAULT_PLATFORM_THEME.accentColor;
  const bgApp = theme.backgroundColor || DEFAULT_PLATFORM_THEME.backgroundColor;
  const sidebar = theme.sidebarColor || DEFAULT_PLATFORM_THEME.sidebarColor;

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-hover', accent);
  root.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`);
  root.style.setProperty('--secondary-color', secondary);
  root.style.setProperty('--bg-card', secondary);
  root.style.setProperty('--button-color', button);
  root.style.setProperty('--button-bg', `linear-gradient(135deg, ${button} 0%, ${primary} 100%)`);
  root.style.setProperty('--accent-purple', accent);
  root.style.setProperty('--border-focus', accent);
  root.style.setProperty('--bg-app', bgApp);
  root.style.setProperty('--sidebar-solid', sidebar);
  root.style.setProperty('--sidebar-bg', `linear-gradient(180deg, ${sidebar} 0%, ${primary}33 100%), ${sidebar}`);
};

export interface User {
  id: string;
  run: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  originalRole?: UserRole;
  roles?: UserRole[];
  tempPassword?: boolean;
  avatar?: string | null;
  themeConfig?: UserThemeConfig | null;
  canCustomize?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  updateUser: (updatedUser: Partial<User>) => void;
  switchRole: (newRole: UserRole) => void;
  restoreOriginalRole: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  canCustomizeProfile: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const normalizeAvatarUrl = (avatar?: string | null): string | null => {
  if (!avatar || typeof avatar !== 'string') return null;
  const clean = avatar.trim().replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/');
  if (!clean || clean === 'null' || clean === 'undefined') return null;
  return clean;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Mantener la sesión activa al actualizar la página (F5) usando sessionStorage,
  // pero limpiar localStorage para evitar sesiones fantasma sin datos al abrir el navegador de cero.
  const [token, setToken] = useState<string | null>(() => {
    try {
      localStorage.removeItem('ltp_token');
      localStorage.removeItem('ltp_user');
      const savedToken = sessionStorage.getItem('ltp_token');
      const savedUserRaw = sessionStorage.getItem('ltp_user');
      if (savedToken && savedUserRaw) {
        const parsed = JSON.parse(savedUserRaw);
        if (parsed && (parsed.id || parsed.run) && parsed.name && parsed.role) {
          return savedToken;
        }
      }
      sessionStorage.removeItem('ltp_token');
      sessionStorage.removeItem('ltp_user');
    } catch {
      // Ignorar errores de almacenamiento
    }
    return null;
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedToken = sessionStorage.getItem('ltp_token');
      const savedUserRaw = sessionStorage.getItem('ltp_user');
      if (savedToken && savedUserRaw) {
        const parsed = JSON.parse(savedUserRaw);
        if (parsed && (parsed.id || parsed.run) && parsed.name && parsed.role) {
          return parsed;
        }
      }
    } catch {
      // Ignorar
    }
    return null;
  });

  // Aplicar tema de apariencia dinámicamente según el usuario autenticado y su rol
  useEffect(() => {
    if (!user || !token) {
      applyUserThemeToDocument(null, null);
      return;
    }
    applyUserThemeToDocument(user.themeConfig || null, user.role);
  }, [user, token]);

  // Sincronizar perfil (avatar y colores personalizados) desde Supabase al cargar sesión activa
  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async res => {
        if (!res.ok) {
          if (active && (res.status === 401 || res.status === 403)) {
            logout();
          }
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!active || !data?.user) return;
        setUser(prev => {
          if (!prev) return data.user;
          const merged: User = {
            ...prev,
            name: data.user.name || prev.name,
            email: data.user.email ?? prev.email,
            phone: data.user.phone ?? prev.phone,
            avatar: normalizeAvatarUrl(data.user.avatar ?? prev.avatar ?? null),
            themeConfig: data.user.themeConfig ?? null,
            canCustomize: data.user.canCustomize ?? canUserCustomizeAppearance(prev.role)
          };
          try {
            sessionStorage.setItem('ltp_user', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    const allowed = canUserCustomizeAppearance(newUser.role);
    const userWithOriginal: User = {
      ...newUser,
      originalRole: newUser.originalRole || newUser.role,
      roles: newUser.roles && newUser.roles.length > 0 ? newUser.roles : [newUser.role],
      avatar: allowed ? normalizeAvatarUrl(newUser.avatar) : null,
      themeConfig: allowed ? (newUser.themeConfig || null) : null,
      canCustomize: allowed
    };
    setToken(newToken);
    setUser(userWithOriginal);
    applyUserThemeToDocument(userWithOriginal.themeConfig, userWithOriginal.role);
    try {
      localStorage.removeItem('ltp_token');
      localStorage.removeItem('ltp_user');
      localStorage.removeItem('ltp_admin_tab');
      sessionStorage.removeItem('ltp_admin_tab');
      sessionStorage.setItem('ltp_token', newToken);
      sessionStorage.setItem('ltp_user', JSON.stringify(userWithOriginal));
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
    } catch (err) {
      console.warn('Error guardando sesión:', err);
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const merged: User = {
        ...prev,
        ...updatedUser,
        avatar: updatedUser.avatar !== undefined ? normalizeAvatarUrl(updatedUser.avatar) : normalizeAvatarUrl(prev.avatar)
      };
      applyUserThemeToDocument(merged.themeConfig || null, merged.role);
      try {
        sessionStorage.setItem('ltp_user', JSON.stringify(merged));
      } catch {}
      return merged;
    });
  };

  // CAMBIADOR RÁPIDO DE PERFIL (MULTI-ROL Y SUPERADMINISTRADOR)
  const switchRole = async (newRole: UserRole) => {
    setUser(prev => {
      if (!prev) return null;
      const cleanRun = prev.run?.replace(/\./g, '');
      const isPrevAdmin = cleanRun === '18803735-6' || prev.role === 'Admin' || (Array.isArray(prev.roles) && prev.roles.includes('Admin'));
      const orig = prev.originalRole || (isPrevAdmin ? 'Admin' : prev.role);
      const allowed = canUserCustomizeAppearance(newRole);
      const updated: User = {
        ...prev,
        originalRole: orig,
        role: newRole,
        canCustomize: allowed
      };
      applyUserThemeToDocument(allowed ? updated.themeConfig : null, newRole);
      try {
        sessionStorage.setItem('ltp_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (token) {
      try {
        const res = await fetch('/api/auth/switch-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ newRole })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            setToken(data.token);
            try {
              sessionStorage.setItem('ltp_token', data.token);
            } catch {}
          }
          if (data.user) {
            setUser(prev => {
              if (!prev) return data.user;
              const merged: User = {
                ...prev,
                role: newRole,
                avatar: data.user.avatar ?? prev.avatar ?? null,
                themeConfig: data.user.themeConfig ?? prev.themeConfig ?? null,
                canCustomize: data.user.canCustomize ?? canUserCustomizeAppearance(newRole)
              };
              applyUserThemeToDocument(merged.themeConfig, newRole);
              try {
                sessionStorage.setItem('ltp_user', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Aviso: cambio de rol sincronizado en memoria local:', err);
      }
    }
  };

  const restoreOriginalRole = () => {
    const orig = user?.originalRole || 'Admin';
    switchRole(orig as UserRole);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    applyUserThemeToDocument(null, null);
    try {
      localStorage.removeItem('ltp_token');
      localStorage.removeItem('ltp_user');
      localStorage.removeItem('ltp_admin_tab');
      localStorage.removeItem('ltp_teacher_active_tab');
      sessionStorage.removeItem('ltp_token');
      sessionStorage.removeItem('ltp_user');
      sessionStorage.removeItem('ltp_admin_tab');
      sessionStorage.removeItem('ltp_teacher_active_tab');
      sessionStorage.removeItem('ltp_a11y_prompt_shown');
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/');
      }
    } catch (err) {
      // Ignorar
    }
  };

  const cleanUserRun = user?.run?.replace(/\./g, '');
  const isSuperAdmin = cleanUserRun === '18803735-6' || user?.originalRole === 'Admin' || user?.role === 'Admin' || (Array.isArray(user?.roles) && user.roles.includes('Admin'));
  const isImpersonating = (!!user?.originalRole && user.originalRole !== user.role) || (isSuperAdmin && user?.role !== 'Admin');
  const canCustomizeProfile = canUserCustomizeAppearance(user?.role);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      updateUser,
      switchRole,
      restoreOriginalRole,
      logout,
      isAuthenticated: !!(token && user),
      isSuperAdmin,
      isImpersonating,
      canCustomizeProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

