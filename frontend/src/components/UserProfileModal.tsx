import React, { useState } from 'react';
import { UserCheck, Key, Save, LogOut, X, User as UserIcon, Mail, Phone, ShieldCheck } from 'lucide-react';
import { formatPhone } from '../utils/phone';
import { useAuth } from '../context/AuthContext';
import { formatRut } from '../utils/rut';
import Swal from 'sweetalert2';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { user, token, updateUser, logout } = useAuth();
  const [editName, setEditName] = useState(user?.name || '');
  const [editRun, setEditRun] = useState(user?.run || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setEditRun(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          run: editRun,
          email: editEmail,
          phone: editPhone,
          newPassword: editPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar el perfil');

      if (updateUser) {
        updateUser({
          name: editName,
          run: editRun,
          email: editEmail,
          phone: editPhone
        });
      }

      // CERRAR LA VENTANA DE EDICIÓN PRIMERO
      setEditPassword('');
      onClose();

      // MOSTRAR CONFIRMACIÓN DE GUARDADO SOBRE CUALQUIER VENTANA
      Swal.fire({
        icon: 'success',
        title: '¡Datos Guardados Exitosamente!',
        text: 'Los datos personales del funcionario han sido actualizados en la plataforma.',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Aceptar'
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al guardar los datos', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
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
        maxWidth: '520px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflowY: 'auto',
        border: '1px solid #e2e8f0'
      }}>
        {/* Encabezado del Modal */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1rem',
              color: '#ffffff'
            }}>
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Ficha de Perfil — Docentes & Asistentes
              </h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.9, margin: 0 }}>
                RUT: {user?.run} | Perfil: {user?.role}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.8 }}>
            <X size={22} />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Datos Personales del Funcionario
            </div>

            {/* DATO 1: NOMBRE COMPLETO */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                1. Nombre Completo
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <UserIcon size={18} color="#64748b" />
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Ej: María López González"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%', fontWeight: 500 }}
                />
              </div>
            </div>

            {/* DATO 2: RUT CON FORMATEO AUTOMÁTICO */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                2. RUT Funcionario
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <ShieldCheck size={18} color="#64748b" />
                <input
                  type="text"
                  value={editRun}
                  onChange={handleRunChange}
                  placeholder="12.345.678-9"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%', fontWeight: 600 }}
                />
              </div>
            </div>

            {/* DATO 3: CORREO ELECTRÓNICO */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                3. Correo Electrónico Institucional
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <Mail size={18} color="#64748b" />
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="ejemplo@liceo.cl"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>

            {/* DATO 4: NÚMERO DE TELÉFONO DE CONTACTO */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                4. Número de Teléfono de Contacto
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <Phone size={18} color="#64748b" />
                <input
                  type="text"
                  value={editPhone}
                  onFocus={e => { if (!e.target.value) setEditPhone('+56'); }}
                  onChange={e => setEditPhone(formatPhone(e.target.value))}
                  placeholder="+56912345678"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>

            {/* DATO 5: NUEVA CONTRASEÑA */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                5. Nueva Contraseña Secreta (Opcional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <Key size={18} color="#64748b" />
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="Dejar en blanco para mantener la actual"
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}
            >
              <Save size={18} /> {saving ? 'Guardando Datos...' : 'Guardar Datos Personales'}
            </button>
          </form>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => { onClose(); logout(); }}
              className="btn"
              style={{ width: '100%', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
