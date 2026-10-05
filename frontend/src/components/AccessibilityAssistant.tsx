import React, { useState, useEffect, useRef } from 'react';
import { User, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessibilityAssistant: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(true);
  const [a11yEnabled, setA11yEnabled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const elementsRef = useRef<HTMLElement[]>([]);
  const hasAnnouncedModalRef = useRef(false);

  // SÍNTESIS DE VOZ EN ESPAÑOL
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CL';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Mostrar la consulta de accesibilidad al iniciar o volver a la pantalla de inicio de sesión
  useEffect(() => {
    if (!isAuthenticated && !a11yEnabled && !sessionStorage.getItem('ltp_a11y_prompt_shown')) {
      setShowModal(true);
    }
  }, [isAuthenticated, a11yEnabled]);

  // Anunciar por voz la pregunta inicial cuando el modal está visible
  useEffect(() => {
    if (!showModal) {
      hasAnnouncedModalRef.current = false;
      return;
    }

    const promptMessage = 'Bienvenido a Liceo Pro. ¿Desea activar las funciones de asistencia por voz y navegación simplificada para personas con discapacidad visual? Presione la tecla Enter para activar, o la tecla Escape para continuar sin asistencia.';

    const timer = setTimeout(() => {
      speakText(promptMessage);
      hasAnnouncedModalRef.current = true;
    }, 350);

    const handleFirstInteraction = () => {
      if (showModal && 'speechSynthesis' in window && !window.speechSynthesis.speaking) {
        speakText(promptMessage);
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, [showModal]);

  // RECOLECTAR ELEMENTOS NAVEGABLES EN LA PANTALLA
  const getNavigableElements = (): HTMLElement[] => {
    const selectors = 'button, input, select, textarea, a[href], .nav-item, .stat-card, .btn, [tabindex="0"]';
    const rawList = Array.from(document.querySelectorAll<HTMLElement>(selectors));
    return rawList.filter(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
  };

  // LEER EL ELEMENTO ENFOCADO
  const announceElement = (el: HTMLElement) => {
    el.focus();
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    // Aplicar resalte visual de alto contraste
    document.querySelectorAll('.a11y-focused-ring').forEach(item => item.classList.remove('a11y-focused-ring'));
    el.classList.add('a11y-focused-ring');

    let speechText = '';
    const tagName = el.tagName.toLowerCase();
    const ariaLabel = el.getAttribute('aria-label');
    const label = ariaLabel || el.getAttribute('title') || el.innerText || (el as HTMLInputElement).placeholder || '';

    if (ariaLabel) {
      speechText = ariaLabel;
    } else if (tagName === 'input') {
      const inputEl = el as HTMLInputElement;
      const placeholder = (inputEl.placeholder || '').toLowerCase();
      const type = inputEl.type || '';

      if (type === 'password' || placeholder.includes('•') || placeholder.includes('contra')) {
        speechText = 'Ingrese su contraseña';
      } else if (placeholder.includes('12.345') || placeholder.includes('rut') || placeholder.includes('run')) {
        speechText = 'Ingrese su RUT';
      } else {
        speechText = `Ingrese su ${label || 'dato'}`;
      }
    } else if (tagName === 'button' || el.classList.contains('btn')) {
      speechText = label || 'Botón';
    } else if (el.classList.contains('nav-item')) {
      speechText = `Ir a ${label}`;
    } else {
      speechText = label || 'Elemento';
    }

    speakText(speechText);
  };

  // CONTROLADOR TECLADO MODAL INICIAL (ENTER / ESC)
  useEffect(() => {
    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (showModal) {
        if (e.key === 'Enter') {
          e.preventDefault();
          activateA11y();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          deactivateA11y();
        }
      }
    };
    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [showModal]);

  // CONTROLADOR NAVEGACIÓN TECLAS DE DIRECCIONAMIENTO (FLECHAS)
  useEffect(() => {
    if (!a11yEnabled) return;

    const handleArrowNavigation = (e: KeyboardEvent) => {
      if (showModal) return;

      const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Tab'];
      if (!keys.includes(e.key)) return;

      const navList = getNavigableElements();
      if (navList.length === 0) return;

      e.preventDefault();
      elementsRef.current = navList;

      let nextIndex = currentIndex;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
        nextIndex = (currentIndex + 1) % navList.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
        nextIndex = (currentIndex - 1 + navList.length) % navList.length;
      }

      setCurrentIndex(nextIndex);
      if (navList[nextIndex]) {
        announceElement(navList[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleArrowNavigation);
    return () => window.removeEventListener('keydown', handleArrowNavigation);
  }, [a11yEnabled, showModal, currentIndex]);

  const activateA11y = () => {
    setA11yEnabled(true);
    setShowModal(false);
    sessionStorage.setItem('ltp_a11y_prompt_shown', 'true');
    document.body.classList.add('high-contrast-mode');
    speakText('Asistente de accesibilidad por voz activado. Utilice las teclas de flecha arriba, abajo, izquierda y derecha para navegar entre las opciones de la aplicación.');
  };

  const deactivateA11y = () => {
    setA11yEnabled(false);
    setShowModal(false);
    sessionStorage.setItem('ltp_a11y_prompt_shown', 'true');
    document.body.classList.remove('high-contrast-mode');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  return (
    <>
      {/* ESTILO DEL RESALTE VISUAL DE NAVEGACIÓN */}
      <style>{`
        .a11y-focused-ring {
          outline: 4px solid #facc15 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 16px #facc15 !important;
        }
      `}</style>

      {/* ------------------------------------------------------------------- */}
      {/* VENTANA MODAL INICIAL DE CONFIRMACIÓN */}
      {/* ------------------------------------------------------------------- */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.88)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', padding: '2.5rem 2rem', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
            
            {/* ÍCONO */}
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
              <User size={28} color="#2563eb" />
            </div>

            {/* TÍTULO */}
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Asistente de Accesibilidad
            </h3>

            {/* DESCRIPCIÓN */}
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.75rem', padding: '0 0.5rem' }}>
              ¿Desea activar las funciones de asistencia por voz y navegación simplificada con teclas de direccionamiento para personas con discapacidad visual?
            </p>

            {/* BOTONES */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={activateA11y}
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
              >
                Sí, activar (Enter)
              </button>
              
              <button
                onClick={deactivateA11y}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                No, gracias (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE DISCRETO EN LA ESQUINA INFERIOR DERECHA (🔊) */}
      {!showModal && (
        <button
          onClick={() => {
            if (!a11yEnabled) {
              activateA11y();
            } else {
              deactivateA11y();
            }
          }}
          title={a11yEnabled ? 'Desactivar Asistente de Voz' : 'Activar Asistente de Voz'}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: a11yEnabled ? '#2563eb' : '#94a3b8',
            color: '#ffffff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            cursor: 'pointer',
            zIndex: 9999
          }}
        >
          <Volume2 size={22} />
        </button>
      )}
    </>
  );
};
