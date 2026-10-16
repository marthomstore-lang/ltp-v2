import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, UserCheck, Shield, BookOpen, Users, User, ArrowRight, Eye, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

interface ImpersonateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export const ImpersonateUserModal: React.FC<ImpersonateUserModalProps> = ({ isOpen, onClose, token }) => {
  const { impersonateUser, user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;
    setLoading(true);
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filtrar para no mostrar al mismo usuario actual
          setUsers(data);
        }
      })
      .catch(err => {
        console.error('Error fetching users for impersonation:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, token]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Excluir al usuario actual si coincide
      if (u.id === currentUser?.id || u.run === currentUser?.run) return false;

      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.run && u.run.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.job_function && u.job_function.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (roleFilter === 'docente') {
        return u.role === 'Docente' || String(u.staff_type || '').includes('Docente');
      }
      if (roleFilter === 'asistente') {
        return u.role === 'Asistente' || u.role === 'Administrativo' || String(u.staff_type || '').includes('Asistente');
      }
      if (roleFilter === 'directivo') {
        return u.role === 'Director' || u.role === 'Admin' || String(u.job_function || '').includes('UTP') || String(u.job_function || '').includes('Inspector');
      }
      if (roleFilter === 'pie') {
        return u.role === 'Profesionales' || String(u.job_function || '').toLowerCase().includes('pie');
      }

      return true;
    });
  }, [users, search, roleFilter, currentUser]);

  const handleSelectUser = async (targetUser: any) => {
    const targetName = targetUser.name || targetUser.full_name || 'Funcionario';
    const targetRole = targetUser.role || 'Docente';

    const confirm = await Swal.fire({
      icon: 'question',
      title: `¿Iniciar sesión como ${targetName}?`,
      html: `
        <div style="text-align: left; font-size: 0.88rem; color: #334155;">
          <p>Vas a ingresar a la plataforma <strong>suplantando la vista y permisos</strong> de:</p>
          <div style="background: #f1f5f9; padding: 0.75rem 1rem; borderRadius: 8px; margin: 0.75rem 0;">
            <div><strong>Nombre:</strong> ${targetName}</div>
            <div><strong>RUT:</strong> ${targetUser.run || '—'}</div>
            <div><strong>Perfil / Rol:</strong> ${targetRole}</div>
            <div><strong>Función:</strong> ${targetUser.job_function || targetUser.staff_type || 'Funcionario'}</div>
          </div>
          <p style="font-size: 0.8rem; color: #64748b;">
            Podrás verificar sus cursos asignados, calificaciones, horarios y planificaciones tal como los ve este usuario. Podrás volver a tu cuenta Administrador en cualquier momento con un solo clic.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar como este usuario',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#7c3aed'
    });

    if (confirm.isConfirmed) {
      setSwitchingId(targetUser.id);
      const result = await impersonateUser({
        targetUserId: targetUser.id,
        targetRun: targetUser.run,
        targetName: targetName
      });

      setSwitchingId(null);
      if (result.success) {
        onClose();
        Swal.fire({
          icon: 'success',
          title: `¡Modo Maestro Activado!`,
          text: `Ahora estás navegando como ${targetName} (${targetRole}).`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error', result.error || 'No se pudo iniciar sesión como el usuario seleccionado.', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '750px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#7c3aed',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)'
            }}>
              <Eye size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1e1b4b', fontFamily: 'Outfit, sans-serif' }}>
                Modo Maestro: Iniciar Sesión como Usuario
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#6d28d9', fontWeight: 600 }}>
                Accede a la plataforma como cualquier docente o asistente registrado para inspeccionar su entorno
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: '#ffffff',
              color: '#64748b',
              padding: '0.4rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por Nombre, RUT, Correo o Cargo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: roleFilter === 'all' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                  background: roleFilter === 'all' ? '#f5f3ff' : '#ffffff',
                  color: roleFilter === 'all' ? '#7c3aed' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Todos ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('docente')}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: roleFilter === 'docente' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                  background: roleFilter === 'docente' ? '#f0fdf4' : '#ffffff',
                  color: roleFilter === 'docente' ? '#15803d' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Docentes
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('asistente')}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: roleFilter === 'asistente' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                  background: roleFilter === 'asistente' ? '#fffbeb' : '#ffffff',
                  color: roleFilter === 'asistente' ? '#b45309' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Asistentes
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('directivo')}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: roleFilter === 'directivo' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                  background: roleFilter === 'directivo' ? '#f0f9ff' : '#ffffff',
                  color: roleFilter === 'directivo' ? '#0369a1' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Directivos / UTP
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangle size={13} color="#f59e0b" />
            <span>Al iniciar sesión como otro usuario, todas las operaciones se registrarán con auditoría indicando suplantación por el Administrador.</span>
          </div>
        </div>

        {/* USERS LIST */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Cargando funcionarios registrados...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <Users size={36} style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 700, color: '#475569' }}>No se encontraron funcionarios</p>
              <span style={{ fontSize: '0.78rem' }}>Intenta ajustar el término de búsqueda o el filtro de rol.</span>
            </div>
          ) : (
            filteredUsers.map(u => {
              const name = u.name || u.full_name || 'Sin Nombre';
              const role = u.role || 'Docente';
              const isDocente = role === 'Docente';
              const isDirector = role === 'Director';
              const isSwitching = switchingId === u.id;

              return (
                <div
                  key={u.id || u.run}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    transition: 'all 0.15s ease',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: isDocente ? '#dcfce7' : isDirector ? '#dbeafe' : '#fef3c7',
                      color: isDocente ? '#15803d' : isDirector ? '#1d4ed8' : '#b45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      flexShrink: 0
                    }}>
                      {name.substring(0, 2).toUpperCase()}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{name}</strong>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px',
                          background: isDocente ? '#f0fdf4' : isDirector ? '#eff6ff' : '#fffbeb',
                          color: isDocente ? '#15803d' : isDirector ? '#1d4ed8' : '#b45309',
                          border: `1px solid ${isDocente ? '#bbf7d0' : isDirector ? '#bfdbfe' : '#fde68a'}`
                        }}>
                          {role}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span>RUT: {u.run || '—'}</span>
                        {u.email && <span>• {u.email}</span>}
                        {u.job_function && <span>• {u.job_function}</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSwitching}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: isSwitching ? 'wait' : 'pointer',
                      flexShrink: 0,
                      boxShadow: '0 2px 5px rgba(124, 58, 237, 0.25)'
                    }}
                  >
                    <Eye size={14} />
                    {isSwitching ? 'Cambiando...' : 'Iniciar Sesión'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '0.85rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <div>
            Mostrando <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> funcionarios registrados.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
