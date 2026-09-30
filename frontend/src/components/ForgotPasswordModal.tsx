import React, { useState } from 'react';
import { formatRut } from '../utils/rut';
import { Mail, Lock, KeyRound, X, CheckCircle, AlertCircle, Clock, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devTempPass, setDevTempPass] = useState<string | null>(null);

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes('@')) {
      setIdentifier(val);
    } else {
      setIdentifier(formatRut(val));
    }
  };

  const handleRequestTempPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      Swal.fire('Atención', 'Por favor ingresa tu RUT o Correo Electrónico registrado.', 'warning');
      return;
    }

    setLoading(true);
    setInfoMessage(null);
    setDevTempPass(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al solicitar clave temporal');
      }

      setInfoMessage(data.message);
      if (data.tempPassword) {
        setDevTempPass(data.tempPassword);
        setTempPassword(data.tempPassword);
      }

      Swal.fire({
        icon: 'success',
        title: '¡Correo Enviado!',
        text: data.message,
        confirmButtonColor: '#4f46e5'
      });

      setStep(2);
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !tempPassword || !newPassword || !confirmPassword) {
      Swal.fire('Atención', 'Por favor completa todos los campos del formulario.', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      Swal.fire('Atención', 'Las nuevas contraseñas no coinciden.', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      Swal.fire('Atención', 'La nueva contraseña debe tener al menos 6 caracteres.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password-with-temp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          tempPassword: tempPassword.trim().toUpperCase().replace(/\s+/g, ''),
          newPassword: newPassword.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar contraseña');
      }

      await Swal.fire({
        icon: 'success',
        title: '¡Contraseña Actualizada!',
        text: 'Tu contraseña se ha cambiado exitosamente. Ya puedes iniciar sesión con tu nueva clave.',
        confirmButtonColor: '#4f46e5'
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      Swal.fire('Error al Cambiar Clave', err.message || 'No se pudo actualizar la contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Cabecera del Modal */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <KeyRound size={22} color="#a5b4fc" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
              Restablecer Contraseña
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Indicador de Pasos */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{
            flex: 1,
            padding: '0.75rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: step === 1 ? '#4f46e5' : '#64748b',
            borderBottom: step === 1 ? '3px solid #4f46e5' : 'none',
            background: step === 1 ? '#ffffff' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            <Mail size={16} /> 1. Solicitar Clave
          </div>
          <div style={{
            flex: 1,
            padding: '0.75rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: step === 2 ? '#4f46e5' : '#64748b',
            borderBottom: step === 2 ? '3px solid #4f46e5' : 'none',
            background: step === 2 ? '#ffffff' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            <Lock size={16} /> 2. Cambiar Clave
          </div>
        </div>

        {/* Contenido según el paso activo */}
        <div style={{ padding: '1.5rem' }}>
          {step === 1 ? (
            <form onSubmit={handleRequestTempPassword}>
              <div style={{ marginBottom: '1rem', background: '#eef2ff', padding: '1rem', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3730a3', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                  <Clock size={18} /> Validez de 20 Minutos
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#4338ca', lineHeight: '1.4' }}>
                  Ingresa tu RUT o Correo Electrónico. Te enviaremos una clave de uso temporal que vencerá en 20 minutos para que puedas definir tu nueva contraseña.
                </p>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  RUT o Correo Electrónico Registrado
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  placeholder="Ej: 12.345.678-9 o usuario@liceo.cl"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn"
                  style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '0.75rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  {loading ? 'Enviando Correo...' : 'Solicitar Clave Temporal'}
                </button>
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ¿Ya tienes una clave temporal? Pasa al Paso 2
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              {infoMessage && (
                <div style={{ marginBottom: '1rem', background: '#f0fdf4', padding: '0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.83rem', fontWeight: 600 }}>
                  <CheckCircle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  {infoMessage}
                </div>
              )}

              {devTempPass && (
                <div style={{ marginBottom: '1rem', background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #f59e0b', color: '#92400e', fontSize: '0.82rem' }}>
                  <strong>modo desarrollo local:</strong> Clave temporal asignada: <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #d97706' }}>{devTempPass}</span>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  RUT / Correo
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={handleIdentifierChange}
                  placeholder="RUT o Correo registrado"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Contraseña Temporal de 20 Minutos
                </label>
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="Ej: TP-8X4A9L"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em', boxSizing: 'border-box' }}
                  required
                />
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Ingresa el código alfanumérico recibido en tu correo institucional (ej: TP-XY1GX1).
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Nueva Contraseña Definitiva
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn"
                  style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '0.75rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
