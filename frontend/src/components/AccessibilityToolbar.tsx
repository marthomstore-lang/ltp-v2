import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Eye, ZoomIn, ZoomOut, Type, Sun, Moon, Sparkles, Sliders } from 'lucide-react';
import Swal from 'sweetalert2';

export const AccessibilityToolbar: React.FC = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [readingRule, setReadingRule] = useState(false);
  const [mousePos, setMousePos] = useState({ y: 0 });
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Aplicar Modo Alto Contraste en el elemento raíz
    if (highContrast) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }

    // Aplicar Tamaño de Fuente
    document.body.classList.remove('font-large', 'font-xlarge');
    if (fontSize === 'large') document.body.classList.add('font-large');
    if (fontSize === 'xlarge') document.body.classList.add('font-xlarge');
  }, [highContrast, fontSize]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (readingRule) {
        setMousePos({ y: e.clientY });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [readingRule]);

  // SÍNTESIS DE VOZ EN ESPAÑOL PARA PERSONAS CON DISCAPACIDAD VISUAL
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      Swal.fire('Atención', 'Su navegador no soporta la lectura por voz', 'warning');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CL';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleReadScreenOutLoud = () => {
    const mainText = document.querySelector('.main-content')?.textContent || 'Plataforma Liceo Pro';
    const cleanText = mainText.replace(/\s+/g, ' ').slice(0, 500);
    speakText(`Asistente de Voz Liceo Pro. Resumen de pantalla: ${cleanText}`);
  };

  return (
    <>
      {/* LÍNEA DE GUÍA / REGLA DE LECTURA VISUAL */}
      {readingRule && (
        <div
          style={{
            position: 'fixed',
            top: `${mousePos.y - 15}px`,
            left: 0,
            right: 0,
            height: '30px',
            background: 'rgba(250, 204, 21, 0.25)',
            borderTop: '2px solid #facc15',
            borderBottom: '2px solid #facc15',
            pointerEvents: 'none',
            zIndex: 9999
          }}
        />
      )}

      {/* BARRA DE ACCESIBILIDAD VISUAL E INCLUSIÓN */}
      <div style={{
        background: highContrast ? '#000000' : '#ffffff',
        border: highContrast ? '2px solid #facc15' : '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '0.5rem 1rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Eye size={18} color={highContrast ? '#facc15' : '#4f46e5'} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: highContrast ? '#facc15' : '#0f172a' }}>
            ♿ Centro de Accesibilidad Visual & Asistencia por Voz
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* BOTÓN LECTOR DE VOZ */}
          <button
            onClick={handleReadScreenOutLoud}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              border: 'none',
              background: isSpeaking ? '#ef4444' : '#4f46e5',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {isSpeaking ? 'Detener Voz' : '🔊 Leer en Voz Alta'}
          </button>

          {/* ALTO CONTRASTE */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: highContrast ? '#facc15' : '#f1f5f9',
              color: highContrast ? '#000000' : '#334155',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {highContrast ? <Sun size={14} /> : <Moon size={14} />}
            {highContrast ? 'Modo Normal' : '👁️ Alto Contraste'}
          </button>

          {/* CONTROLES DE TAMAÑO DE TEXTO */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '9999px', padding: '2px' }}>
            <button
              onClick={() => setFontSize('normal')}
              style={{
                padding: '0.25rem 0.6rem',
                border: 'none',
                borderRadius: '9999px',
                background: fontSize === 'normal' ? '#4f46e5' : 'transparent',
                color: fontSize === 'normal' ? '#ffffff' : '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              A (100%)
            </button>
            <button
              onClick={() => setFontSize('large')}
              style={{
                padding: '0.25rem 0.6rem',
                border: 'none',
                borderRadius: '9999px',
                background: fontSize === 'large' ? '#4f46e5' : 'transparent',
                color: fontSize === 'large' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              A+ (125%)
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              style={{
                padding: '0.25rem 0.6rem',
                border: 'none',
                borderRadius: '9999px',
                background: fontSize === 'xlarge' ? '#4f46e5' : 'transparent',
                color: fontSize === 'xlarge' ? '#ffffff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              A++ (150%)
            </button>
          </div>

          {/* REGLA DE LECTURA VISUAL */}
          <button
            onClick={() => setReadingRule(!readingRule)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: readingRule ? '#e0e7ff' : '#f1f5f9',
              color: readingRule ? '#4338ca' : '#334155',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            🎯 {readingRule ? 'Quitar Guía' : 'Guía de Lectura'}
          </button>
        </div>
      </div>
    </>
  );
};
