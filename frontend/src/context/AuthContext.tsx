import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'Admin' | 'Director' | 'Docente' | 'Entrevistador' | 'Administrativo' | 'Profesionales' | 'Asistente' | 'Apoderado' | 'Visita' | 'Estudiante';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializar estado desde localStorage para persistir la sesión tras recargar la página (F5)
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('ltp_token');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ltp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (newToken: string, newUser: User) => {
    const userWithOriginal = {
      ...newUser,
      originalRole: newUser.originalRole || newUser.role,
      roles: newUser.roles && newUser.roles.length > 0 ? newUser.roles : [newUser.role]
    };
    setToken(newToken);
    setUser(userWithOriginal);
    try {
      localStorage.setItem('ltp_token', newToken);
      localStorage.setItem('ltp_user', JSON.stringify(userWithOriginal));
    } catch (err) {
      console.warn('Error guardando sesión:', err);
    }
    sessionStorage.removeItem('ltp_a11y_prompt_shown');
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      try {
        localStorage.setItem('ltp_user', JSON.stringify(merged));
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
      const updated = {
        ...prev,
        originalRole: orig,
        role: newRole
      };
      try {
        localStorage.setItem('ltp_user', JSON.stringify(updated));
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
              localStorage.setItem('ltp_token', data.token);
            } catch {}
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
    } catch (err) {
      // Ignorar
    }
  };

  const cleanUserRun = user?.run?.replace(/\./g, '');
  const isSuperAdmin = cleanUserRun === '18803735-6' || user?.originalRole === 'Admin' || user?.role === 'Admin' || (Array.isArray(user?.roles) && user.roles.includes('Admin'));
  const isImpersonating = (!!user?.originalRole && user.originalRole !== user.role) || (isSuperAdmin && user?.role !== 'Admin');

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
      isImpersonating
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
