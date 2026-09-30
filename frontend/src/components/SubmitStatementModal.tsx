import React, { useState, useEffect, useRef } from 'react';
import { FileText, Clock, AlertTriangle, PenTool, CheckCircle, X, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';

export interface PendingStatementItem {
  participant_id: string;
  interview_id: string;
  participant_name: string;
  user_run?: string;
  participant_role?: string;
  status: string;
  requested_at?: string;
  request_deadline?: string;
  time_limit_minutes?: number;
  secondsRemaining?: number;
  isExpired?: boolean;
  interviewee_name?: string;
  interviewee_role?: string;
  course_name?: string;
  interview_date?: string;
  interview_time?: string;
  objective?: string;
  reason?: string;
  interviewer_name?: string;
}

interface SubmitStatementModalProps {
  item: PendingStatementItem;
  token: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export const SubmitStatementModal: React.FC<SubmitStatementModalProps> = ({
  item,
  token,
  onClose,
  onSubmitted
}) => {
  const [statement, setStatement] = useState('');
  const [saving, setSaving] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(
    typeof item.secondsRemaining === 'number' ? item.secondsRemaining : 1800
  );

  // Canvas de Firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Temporizador en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Dibujo táctil y ratón en el canvas de firma
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCoordinates(e);
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) {
      Swal.fire('Atención', 'Por favor redacte su relato antes de enviar.', 'warning');
      return;
    }

    let signatureBase64 = '';
    if (canvasRef.current && hasSignature) {
      signatureBase64 = canvasRef.current.toDataURL('image/png');
    }

    setSaving(true);
    try {
      const res = await fetch('/api/interviews/submit-participant-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          participantId: item.participant_id,
          statement: statement.trim(),
          signature: signatureBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el relato');

      Swal.fire({
        icon: 'success',
        title: '¡Relato Guardado con Éxito!',
        text: 'Tu testimonio y firma han sido incorporados al acta oficial de la entrevista.',
        confirmButtonColor: '#4f46e5'
      });

      onSubmitted();
      onClose();
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isCriticalTime = secondsLeft < 300 && secondsLeft > 0;
  const isExpired = secondsLeft <= 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3500,
        padding: '1rem'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1'
        }}
      >
        {/* Cabecera con Temporizador */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            background: isExpired ? '#fef2f2' : isCriticalTime ? '#fffbeb' : '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="#4f46e5" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                Aportar Relato Oficial en Entrevista
              </h3>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
              Participante: <strong>{item.participant_name}</strong> ({item.participant_role || 'Participante'})
            </div>
          </div>

          {/* Temporizador */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.45rem 0.9rem',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '0.9rem',
              background: isExpired ? '#fee2e2' : isCriticalTime ? '#fef3c7' : '#ecfdf5',
              color: isExpired ? '#dc2626' : isCriticalTime ? '#b45309' : '#047857',
              border: `1px solid ${isExpired ? '#fca5a5' : isCriticalTime ? '#fde68a' : '#a7f3d0'}`
            }}
          >
            <Clock size={16} />
            <span>
              {isExpired
                ? 'Plazo Cumplido'
                : `Tiempo Restante: ${formatTimer(secondsLeft)}`}
            </span>
          </div>
        </div>

        {/* Cuerpo del Formulario */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Ficha Resumen de la Entrevista */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
              fontSize: '0.84rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.65rem'
            }}
          >
            <div>
              <strong>Entrevista:</strong> #{item.interview_id}
            </div>
            <div>
              <strong>Entrevistado:</strong> {item.interviewee_name || 'Estudiante'} {item.course_name ? `(${item.course_name})` : ''}
            </div>
            <div>
              <strong>Responsable:</strong> {item.interviewer_name || 'Convivencia Escolar'}
            </div>
            <div>
              <strong>Fecha:</strong> {item.interview_date || 'Hoy'} {item.interview_time ? `• ${item.interview_time}` : ''}
            </div>
            {item.objective && (
              <div style={{ gridColumn: '1 / -1', color: '#475569', marginTop: '0.25rem' }}>
                <strong>Objetivo:</strong> {item.objective}
              </div>
            )}
          </div>

          {isExpired && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#991b1b',
                fontSize: '0.82rem'
              }}
            >
              <AlertTriangle size={18} color="#dc2626" />
              <span>
                El plazo límite ha expirado. Aún puedes enviar tu relato para que quede registrado en el acta antes de su impresión.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Campo Relato / Testimonio */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '0.4rem'
                }}
              >
                Tu Declaración / Relato de los Hechos:
              </label>
              <textarea
                rows={6}
                value={statement}
                onChange={e => setStatement(e.target.value)}
                placeholder="Escribe con detalle tu declaración, aporte o aclaración respecto al caso tratado en esta entrevista..."
                required
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem', textAlign: 'right' }}>
                {statement.length} caracteres
              </div>
            </div>

            {/* Firma Digital en Canvas */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PenTool size={15} color="#4f46e5" /> Firma Digital del Participante:
                </label>
                {hasSignature && (
                  <button
                    type="button"
                    onClick={clearSignature}
                    style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} /> Borrar Firma
                  </button>
                )}
              </div>

              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{
                    width: '100%',
                    height: '150px',
                    display: 'block',
                    cursor: 'crosshair',
                    touchAction: 'none'
                  }}
                />
                {!hasSignature && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#94a3b8',
                      fontSize: '0.82rem',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <PenTool size={16} /> Firma aquí con el mouse, lápiz o tu dedo en pantalla táctil
                  </div>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '1rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1.25rem'
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                }}
              >
                <CheckCircle size={16} />
                {saving ? 'Guardando Relato...' : 'Guardar y Validar Relato Oficial'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
