import React, { useState, useRef, useEffect } from 'react';
import {
  Key,
  Save,
  LogOut,
  X,
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  Palette,
  Camera,
  Trash2,
  RotateCcw,
  Eye,
  Sparkles,
  CheckCircle2,
  Upload,
  Lock
} from 'lucide-react';
import { formatPhone } from '../utils/phone';
import {
  useAuth,
  UserThemeConfig,
  DEFAULT_PLATFORM_THEME,
  applyUserThemeToDocument,
  canUserCustomizeAppearance,
  normalizeAvatarUrl
} from '../context/AuthContext';
import { formatRut } from '../utils/rut';
import Swal from 'sweetalert2';

interface UserProfileModalProps {
  onClose: () => void;
  initialTab?: 'info' | 'customize';
}

const PRESET_THEMES: Array<{ name: string; colors: Required<UserThemeConfig> }> = [
  {
    name: 'Índigo Institucional',
    colors: { ...DEFAULT_PLATFORM_THEME }
  },
  {
    name: 'Esmeralda Académico',
    colors: {
      primaryColor: '#059669',
      secondaryColor: '#ffffff',
      buttonColor: '#047857',
      accentColor: '#10b981',
      backgroundColor: '#f0fdf4',
      sidebarColor: '#064e3b'
    }
  },
  {
    name: 'Azul Océano',
    colors: {
      primaryColor: '#0284c7',
      secondaryColor: '#ffffff',
      buttonColor: '#0369a1',
      accentColor: '#38bdf8',
      backgroundColor: '#f0f9ff',
      sidebarColor: '#0c4a6e'
    }
  },
  {
    name: 'Borgoña Ejecutivo',
    colors: {
      primaryColor: '#be123c',
      secondaryColor: '#ffffff',
      buttonColor: '#9f1239',
      accentColor: '#f43f5e',
      backgroundColor: '#fff1f2',
      sidebarColor: '#4c0519'
    }
  },
  {
    name: 'Violeta Real',
    colors: {
      primaryColor: '#7c3aed',
      secondaryColor: '#ffffff',
      buttonColor: '#6d28d9',
      accentColor: '#a855f7',
      backgroundColor: '#f5f3ff',
      sidebarColor: '#2e1065'
    }
  },
  {
    name: 'Pizarra Moderno',
    colors: {
      primaryColor: '#334155',
      secondaryColor: '#ffffff',
      buttonColor: '#1e293b',
      accentColor: '#0ea5e9',
      backgroundColor: '#f8fafc',
      sidebarColor: '#0f172a'
    }
  }
];

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const clean = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { firstName: '', lastName: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };
  if (parts.length === 3) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  return {
    firstName: parts.slice(0, 2).join(' '),
    lastName: parts.slice(2).join(' ')
  };
};

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose, initialTab = 'info' }) => {
  const { user, token, updateUser, logout, canCustomizeProfile } = useAuth();
  const allowedToCustomize = canCustomizeProfile && canUserCustomizeAppearance(user?.role);

  const [activeTab, setActiveTab] = useState<'info' | 'customize'>(
    allowedToCustomize && initialTab === 'customize' ? 'customize' : 'info'
  );

  const initialNameParts = splitFullName(user?.name || '');
  const [firstName, setFirstName] = useState(initialNameParts.firstName);
  const [lastName, setLastName] = useState(initialNameParts.lastName);
  const [editRun, setEditRun] = useState(user?.run || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editPassword, setEditPassword] = useState('');

  // Estado de imagen de perfil (Avatar) y código aleatorio en Google Drive
  const [avatarDraft, setAvatarDraft] = useState<string | null>(
    allowedToCustomize ? normalizeAvatarUrl(user?.avatar) : null
  );
  const [avatarDriveCode, setAvatarDriveCode] = useState<string | null>(null);

  // Estado de colores de la plataforma
  const [themeDraft, setThemeDraft] = useState<Required<UserThemeConfig>>(() => ({
    primaryColor: user?.themeConfig?.primaryColor || DEFAULT_PLATFORM_THEME.primaryColor,
    secondaryColor: user?.themeConfig?.secondaryColor || DEFAULT_PLATFORM_THEME.secondaryColor,
    buttonColor: user?.themeConfig?.buttonColor || DEFAULT_PLATFORM_THEME.buttonColor,
    accentColor: user?.themeConfig?.accentColor || DEFAULT_PLATFORM_THEME.accentColor,
    backgroundColor: user?.themeConfig?.backgroundColor || DEFAULT_PLATFORM_THEME.backgroundColor,
    sidebarColor: user?.themeConfig?.sidebarColor || DEFAULT_PLATFORM_THEME.sidebarColor
  }));

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedOnExitRef = useRef(false);

  useEffect(() => {
    if (!allowedToCustomize || !token) return;
    fetch('/api/auth/my-avatar-vault', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d?.vault?.storage_name) {
          setAvatarDriveCode(d.vault.storage_name);
        }
      })
      .catch(() => {});
  }, [allowedToCustomize, token]);

  // Aplicar vista previa en tiempo real sobre las variables CSS del documento mientras edita
  useEffect(() => {
    if (!allowedToCustomize) return;
    applyUserThemeToDocument(themeDraft, user?.role);
  }, [themeDraft, allowedToCustomize, user?.role]);

  // Si cierra el modal sin guardar, restaurar el tema guardado del usuario
  const handleCloseModal = () => {
    if (!savedOnExitRef.current) {
      applyUserThemeToDocument(user?.themeConfig || null, user?.role);
    }
    onClose();
  };

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setEditRun(formatted);
  };

  // Procesar imagen subida desde el computador y recortarla/ajustarla a cuadrado 256x256
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!allowedToCustomize) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Archivo inválido', 'Por favor selecciona un archivo de imagen (JPG, PNG o WEBP).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 256;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Recorte centrado cuadrado (center crop) para que luzca perfecto en formato circular o cuadrado
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.86);
          setAvatarDraft(compressedDataUrl);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    if (!allowedToCustomize) return;
    setAvatarDraft(null);
  };

  const handleColorChange = (key: keyof UserThemeConfig, value: string) => {
    if (!allowedToCustomize) return;
    setThemeDraft(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRestoreDefaultColors = () => {
    if (!allowedToCustomize) return;
    setThemeDraft({ ...DEFAULT_PLATFORM_THEME });
    applyUserThemeToDocument(null, user?.role);
  };

  const isDefaultTheme = (t: Required<UserThemeConfig>) =>
    t.primaryColor.toLowerCase() === DEFAULT_PLATFORM_THEME.primaryColor.toLowerCase() &&
    t.secondaryColor.toLowerCase() === DEFAULT_PLATFORM_THEME.secondaryColor.toLowerCase() &&
    t.buttonColor.toLowerCase() === DEFAULT_PLATFORM_THEME.buttonColor.toLowerCase() &&
    t.accentColor.toLowerCase() === DEFAULT_PLATFORM_THEME.accentColor.toLowerCase() &&
    t.backgroundColor.toLowerCase() === DEFAULT_PLATFORM_THEME.backgroundColor.toLowerCase() &&
    t.sidebarColor.toLowerCase() === DEFAULT_PLATFORM_THEME.sidebarColor.toLowerCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const composedName = `${firstName.trim()} ${lastName.trim()}`.trim() || user?.name || '';

    try {
      const payload: Record<string, any> = {
        name: composedName,
        run: editRun,
        email: editEmail,
        phone: editPhone,
        newPassword: editPassword
      };

      if (allowedToCustomize) {
        payload.avatar = avatarDraft;
        payload.themeConfig = isDefaultTheme(themeDraft) ? null : themeDraft;
      }

      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el perfil');

      const nextTheme = allowedToCustomize
        ? (isDefaultTheme(themeDraft) ? null : themeDraft)
        : null;
      const nextAvatar = allowedToCustomize ? avatarDraft : null;

      savedOnExitRef.current = true;

      if (updateUser) {
        updateUser({
          name: composedName,
          run: editRun,
          email: editEmail,
          phone: editPhone,
          avatar: nextAvatar,
          themeConfig: nextTheme
        });
      }

      setEditPassword('');
      onClose();

      if (data?.avatarDriveCode) {
        setAvatarDriveCode(data.avatarDriveCode);
      }

      Swal.fire({
        icon: 'success',
        title: '¡Perfil y Apariencia Guardados!',
        text: allowedToCustomize
          ? (data?.avatarDriveCode
            ? `Tus datos personales, colores e imagen de perfil han sido guardados y respaldados en Google Drive con código interno ${data.avatarDriveCode}.`
            : 'Tus datos personales, imagen de perfil y colores personalizados han sido guardados en tu cuenta.')
          : 'Tus datos personales han sido actualizados exitosamente.',
        confirmButtonColor: themeDraft.buttonColor || '#4f46e5',
        confirmButtonText: 'Aceptar'
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al guardar los datos', 'error');
    } finally {
      setSaving(false);
    }
  };

  const composedDisplayName = `${firstName.trim()} ${lastName.trim()}`.trim() || user?.name || 'Usuario';
  const initials = composedDisplayName.substring(0, 2).toUpperCase();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: activeTab === 'customize' ? '880px' : '560px',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.28)',
        overflowY: 'auto',
        border: '1px solid #e2e8f0',
        transition: 'max-width 0.25s ease'
      }}>
        {/* Encabezado del Modal */}
        <div style={{
          background: allowedToCustomize
            ? `linear-gradient(135deg, ${themeDraft.primaryColor} 0%, ${themeDraft.accentColor} 100%)`
            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          padding: '1.35rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.22)',
              border: '2px solid rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              color: '#ffffff',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {allowedToCustomize && avatarDraft ? (
                <img
                  src={avatarDraft}
                  alt={composedDisplayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Mi Perfil — {composedDisplayName}
              </h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.92, margin: '0.15rem 0 0 0' }}>
                RUT: {user?.run} | Rol activo: <strong>{user?.role}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', cursor: 'pointer', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Navegación de Pestañas (Información personal vs Personalizar mi perfil) */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 1.5rem',
          gap: '0.5rem'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              padding: '0.9rem 1.15rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'info' ? `3px solid ${allowedToCustomize ? themeDraft.primaryColor : '#4f46e5'}` : '3px solid transparent',
              color: activeTab === 'info' ? (allowedToCustomize ? themeDraft.primaryColor : '#4f46e5') : '#64748b',
              fontWeight: activeTab === 'info' ? 700 : 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <UserIcon size={16} /> Información personal
          </button>

          {allowedToCustomize && (
            <button
              type="button"
              onClick={() => setActiveTab('customize')}
              style={{
                padding: '0.9rem 1.15rem',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'customize' ? `3px solid ${themeDraft.primaryColor}` : '3px solid transparent',
                color: activeTab === 'customize' ? themeDraft.primaryColor : '#64748b',
                fontWeight: activeTab === 'customize' ? 700 : 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Palette size={16} /> Personalizar mi perfil
            </button>
          )}
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: '1.5rem 1.75rem' }}>
          <form onSubmit={handleSubmit}>
            {activeTab === 'info' && (
              <div>
                {/* Tarjeta resumen superior con Avatar, Nombre, Apellido y Rol */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  padding: '1rem 1.2rem',
                  background: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: allowedToCustomize
                        ? `linear-gradient(135deg, ${themeDraft.primaryColor} 0%, ${themeDraft.accentColor} 100%)`
                        : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.35rem',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                      flexShrink: 0
                    }}>
                      {allowedToCustomize && avatarDraft ? (
                        <img
                          src={avatarDraft}
                          alt={composedDisplayName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                        {composedDisplayName}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.15rem' }}>
                        Rol institucional: <span style={{ fontWeight: 700, color: '#4f46e5' }}>{user?.role}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {allowedToCustomize && avatarDraft ? 'Imagen de perfil personalizada activa' : 'Avatar institucional predeterminado'}
                      </div>
                    </div>
                  </div>

                  {allowedToCustomize ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('customize')}
                      style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid #c7d2fe',
                        background: '#eef2ff',
                        color: '#4338ca',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Palette size={15} /> Personalizar mi perfil
                    </button>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.76rem',
                      color: '#64748b',
                      background: '#f1f5f9',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <Lock size={14} /> Apariencia institucional predeterminada
                    </div>
                  )}
                </div>

                {/* NOMBRE Y APELLIDO */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Nombre(s)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <UserIcon size={16} color="#64748b" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Ej: María"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%', fontWeight: 500 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Apellido(s)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <UserIcon size={16} color="#64748b" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Ej: López González"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%', fontWeight: 500 }}
                      />
                    </div>
                  </div>
                </div>

                {/* RUT Y ROL */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      RUT
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <ShieldCheck size={16} color="#64748b" />
                      <input
                        type="text"
                        value={editRun}
                        onChange={handleRunChange}
                        placeholder="12.345.678-9"
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                      Rol / Perfil en Plataforma
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.88rem', fontWeight: 700 }}>
                      {user?.role}
                    </div>
                  </div>
                </div>

                {/* CORREO ELECTRÓNICO */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Correo Electrónico
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <Mail size={17} color="#64748b" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="ejemplo@liceo.cl"
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%' }}
                    />
                  </div>
                </div>

                {/* TELÉFONO */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Teléfono de Contacto
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <Phone size={17} color="#64748b" />
                    <input
                      type="text"
                      value={editPhone}
                      onFocus={e => { if (!e.target.value) setEditPhone('+56'); }}
                      onChange={e => setEditPhone(formatPhone(e.target.value))}
                      placeholder="+56912345678"
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%' }}
                    />
                  </div>
                </div>

                {/* CONTRASEÑA */}
                <div style={{ marginBottom: '1.35rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Nueva Contraseña Secreta (Opcional)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <Key size={17} color="#64748b" />
                    <input
                      type="password"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      placeholder="Dejar en blanco para mantener la actual"
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customize' && allowedToCustomize && (
              <div>
                {/* SECCIÓN B: CAMBIAR IMAGEN DE PERFIL */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '1.15rem 1.25rem',
                  marginBottom: '1.35rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {/* Vista previa circular y cuadrada */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          title="Formato Circular"
                          style={{
                            width: '68px',
                            height: '68px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${themeDraft.primaryColor} 0%, ${themeDraft.accentColor} 100%)`,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.35rem',
                            overflow: 'hidden',
                            border: '3px solid #ffffff',
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
                          }}
                        >
                          {avatarDraft ? (
                            <img src={avatarDraft} alt="Vista previa circular" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials
                          )}
                        </div>

                        <div
                          title="Formato Cuadrado"
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${themeDraft.primaryColor} 0%, ${themeDraft.accentColor} 100%)`,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.05rem',
                            overflow: 'hidden',
                            border: '2px solid #ffffff',
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.1)'
                          }}
                        >
                          {avatarDraft ? (
                            <img src={avatarDraft} alt="Vista previa cuadrada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initials
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Camera size={16} color={themeDraft.primaryColor} /> Cambiar imagen de perfil
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Sube una foto desde tu computador. Se ajustará a formato circular/cuadrado y se respaldará en Google Drive con un código aleatorio interno.
                        </div>
                        {avatarDraft && (
                          <div style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '0.18rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace' }}>
                            <Lock size={12} /> Google Drive Codificado: {avatarDriveCode || 'AVT_AUTO_HASH.jpg'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleAvatarFileChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '0.5rem 0.9rem',
                          borderRadius: '9px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <Upload size={15} /> {avatarDraft ? 'Reemplazar imagen' : 'Subir imagen'}
                      </button>

                      {avatarDraft && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          style={{
                            padding: '0.5rem 0.85rem',
                            borderRadius: '9px',
                            border: '1px solid #fecdd3',
                            background: '#fff1f2',
                            color: '#be123c',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          title="Eliminar imagen actual y volver al avatar predeterminado"
                        >
                          <Trash2 size={15} /> Eliminar y usar predeterminado
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECCIÓN A: CAMBIAR COLORES DE LA PLATAFORMA + VISTA PREVIA EN TIEMPO REAL */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem', marginBottom: '1.35rem' }}>
                  {/* Controles de Color */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '1.15rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Sparkles size={16} color={themeDraft.primaryColor} /> Combinación de Colores
                      </div>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultColors}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <RotateCcw size={13} /> Restaurar colores predeterminados
                      </button>
                    </div>

                    {/* Paletas rápidas sugeridas */}
                    <div style={{ marginBottom: '0.95rem' }}>
                      <div style={{ fontSize: '0.73rem', fontWeight: 600, color: '#64748b', marginBottom: '0.4rem' }}>
                        Paletas rápidas recomendadas:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {PRESET_THEMES.map(preset => {
                          const isSelected = preset.colors.primaryColor.toLowerCase() === themeDraft.primaryColor.toLowerCase() &&
                            preset.colors.sidebarColor.toLowerCase() === themeDraft.sidebarColor.toLowerCase();
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setThemeDraft({ ...preset.colors })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.3rem 0.55rem',
                                borderRadius: '999px',
                                border: isSelected ? `2px solid ${preset.colors.primaryColor}` : '1px solid #cbd5e1',
                                background: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                cursor: 'pointer'
                              }}
                            >
                              <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: preset.colors.primaryColor,
                                display: 'inline-block'
                              }} />
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 6 Selectores Visuales de Color */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                      {[
                        { key: 'primaryColor' as const, label: 'Color principal', desc: 'Encabezados y activos' },
                        { key: 'secondaryColor' as const, label: 'Color secundario', desc: 'Tarjetas y paneles' },
                        { key: 'buttonColor' as const, label: 'Color de botones', desc: 'Acciones principales' },
                        { key: 'accentColor' as const, label: 'Color de acento', desc: 'Bordes y destacados' },
                        { key: 'backgroundColor' as const, label: 'Color de fondo', desc: 'Fondo general' },
                        { key: 'sidebarColor' as const, label: 'Color menú lateral', desc: 'Barra de navegación' }
                      ].map(item => (
                        <label
                          key={item.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            background: '#ffffff',
                            padding: '0.55rem 0.65rem',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="color"
                            value={themeDraft[item.key]}
                            onChange={e => handleColorChange(item.key, e.target.value)}
                            style={{
                              width: '32px',
                              height: '32px',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: 'transparent',
                              padding: 0,
                              flexShrink: 0
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {themeDraft[item.key].toUpperCase()} · {item.desc}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* VISTA PREVIA INTERACTIVA EN TIEMPO REAL */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Eye size={16} color={themeDraft.primaryColor} /> Vista previa en tiempo real
                    </div>

                    {/* Maqueta visual interactiva de la plataforma */}
                    <div style={{
                      flex: 1,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      background: themeDraft.backgroundColor,
                      boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.12)',
                      minHeight: '250px'
                    }}>
                      {/* Header del mockup */}
                      <div style={{
                        background: '#ffffff',
                        borderBottom: '1px solid #e2e8f0',
                        padding: '0.55rem 0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            background: themeDraft.primaryColor,
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            L
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                            LTP 2026
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#f8fafc',
                          padding: '0.2rem 0.55rem 0.2rem 0.25rem',
                          borderRadius: '999px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${themeDraft.primaryColor} 0%, ${themeDraft.accentColor} 100%)`,
                            color: '#fff',
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {avatarDraft ? (
                              <img src={avatarDraft} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              initials
                            )}
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#1e293b' }}>
                            {firstName || 'Mi Perfil'}
                          </span>
                        </div>
                      </div>

                      {/* Cuerpo del mockup: Sidebar + Área Principal */}
                      <div style={{ display: 'flex', flex: 1 }}>
                        {/* Sidebar del mockup */}
                        <div style={{
                          width: '110px',
                          background: `linear-gradient(180deg, ${themeDraft.sidebarColor} 0%, ${themeDraft.primaryColor}33 100%), ${themeDraft.sidebarColor}`,
                          color: '#ffffff',
                          padding: '0.65rem 0.45rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}>
                          <div style={{
                            background: `linear-gradient(135deg, ${themeDraft.primaryColor} 0%, ${themeDraft.accentColor} 100%)`,
                            color: '#ffffff',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}>
                            • Inicio
                          </div>
                          <div style={{
                            color: 'rgba(255,255,255,0.78)',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.66rem'
                          }}>
                            • Asistencia
                          </div>
                          <div style={{
                            color: 'rgba(255,255,255,0.78)',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.66rem'
                          }}>
                            • Cursos
                          </div>
                          <div style={{
                            color: 'rgba(255,255,255,0.78)',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.66rem'
                          }}>
                            • Mi perfil
                          </div>
                        </div>

                        {/* Área Principal del mockup */}
                        <div style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: themeDraft.backgroundColor,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div style={{
                              background: themeDraft.secondaryColor,
                              borderRadius: '8px',
                              padding: '0.55rem',
                              border: `1px solid ${themeDraft.accentColor}44`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>Tarjeta 1</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: themeDraft.primaryColor, marginTop: '0.1rem' }}>96.4%</div>
                            </div>
                            <div style={{
                              background: themeDraft.secondaryColor,
                              borderRadius: '8px',
                              padding: '0.55rem',
                              border: `1px solid ${themeDraft.accentColor}44`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 600 }}>Tarjeta 2</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: themeDraft.accentColor, marginTop: '0.1rem' }}>18 Cursos</div>
                            </div>
                          </div>

                          <div style={{
                            background: themeDraft.secondaryColor,
                            borderRadius: '8px',
                            padding: '0.6rem',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.4rem',
                            marginTop: 'auto'
                          }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.45rem',
                              borderRadius: '999px',
                              background: `${themeDraft.accentColor}22`,
                              color: themeDraft.accentColor
                            }}>
                              Acento activo
                            </span>
                            <span style={{
                              background: `linear-gradient(135deg, ${themeDraft.buttonColor} 0%, ${themeDraft.primaryColor} 100%)`,
                              color: '#ffffff',
                              padding: '0.32rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.66rem',
                              fontWeight: 700
                            }}>
                              Botón de ejemplo
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={13} color="#10b981" /> Esta personalización es exclusiva para tu sesión y no afecta a otros usuarios.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de Acción Inferiores */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {activeTab === 'customize' && allowedToCustomize && (
                <button
                  type="button"
                  onClick={handleRestoreDefaultColors}
                  className="btn btn-secondary"
                  style={{
                    flex: '1 1 220px',
                    padding: '0.8rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <RotateCcw size={17} /> Restaurar colores predeterminados
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{
                  flex: '2 1 260px',
                  padding: '0.8rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: allowedToCustomize
                    ? `linear-gradient(135deg, ${themeDraft.buttonColor} 0%, ${themeDraft.primaryColor} 100%)`
                    : undefined
                }}
              >
                <Save size={18} /> {saving ? 'Guardando cambios...' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.9rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Sesión activa: <strong>{user?.name}</strong> ({user?.role})
            </span>
            <button
              type="button"
              onClick={() => { handleCloseModal(); logout(); }}
              className="btn"
              style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', fontSize: '0.82rem', fontWeight: 700, padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

