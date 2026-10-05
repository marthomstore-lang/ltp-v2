import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const INITIAL_MODAL_SPEECH =
  'Asistente de Accesibilidad. ¿Desea activar las funciones de asistencia por voz y navegación simplificada con teclas de direccionamiento para personas con discapacidad visual? Presione la tecla Enter para Sí, activar; o presione la tecla Escape para No, gracias.';

export const AccessibilityAssistant: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [showModal, setShowModal] = useState(true);
  const [a11yEnabled, setA11yEnabled] = useState(false);
  const [modalSelectedBtn, setModalSelectedBtn] = useState<'yes' | 'no'>('yes');
  const [currentCaption, setCurrentCaption] = useState<string>('');

  const currentIndexRef = useRef<number>(-1);
  const elementsRef = useRef<HTMLElement[]>([]);
  const speechTimeoutRef = useRef<number | null>(null);
  const modalSpeechStartedRef = useRef<boolean>(false);
  const yesBtnRef = useRef<HTMLButtonElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastAnnouncedSwalRef = useRef<string>('');
  const prevAuthRef = useRef<boolean>(isAuthenticated);

  // Seleccionar la mejor voz en español disponible en el sistema operativo / navegador
  const getPreferredSpanishVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const priorities = ['es-cl', 'es-mx', 'es-es', 'es-419', 'es-us', 'es-ar', 'es'];
    for (const langPrefix of priorities) {
      const match = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(langPrefix));
      if (match) return match;
    }
    return voices[0] || null;
  }, []);

  // SÍNTESIS DE VOZ EN ESPAÑOL (con corrección del bug de cancel() síncrono en Chromium)
  const speakText = useCallback(
    (text: string, onStartCallback?: () => void) => {
      if (!text) return;
      setCurrentCaption(text);

      if (!('speechSynthesis' in window)) return;

      if (speechTimeoutRef.current) {
        window.clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }

      const executeSpeak = () => {
        try {
          window.speechSynthesis.resume();
          const utterance = new SpeechSynthesisUtterance(text);
          const voice = getPreferredSpanishVoice();
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang || 'es-ES';
          } else {
            utterance.lang = 'es-ES';
          }
          utterance.rate = 0.98;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          if (onStartCallback) {
            utterance.onstart = () => {
              onStartCallback();
            };
          }

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('Error en síntesis de voz:', err);
        }
      };

      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
        speechTimeoutRef.current = window.setTimeout(executeSpeak, 65);
      } else {
        executeSpeak();
      }
    },
    [getPreferredSpanishVoice]
  );

  // Mostrar la consulta de accesibilidad al iniciar o al cerrar sesión y volver al Login
  useEffect(() => {
    if (!isAuthenticated && !a11yEnabled && !sessionStorage.getItem('ltp_a11y_prompt_shown')) {
      setShowModal(true);
      setModalSelectedBtn('yes');
    }
  }, [isAuthenticated, a11yEnabled]);

  // Enfocar automáticamente el botón "Sí, activar (Enter)" y leer el modal en voz alta al abrirse
  useEffect(() => {
    if (!showModal) {
      modalSpeechStartedRef.current = false;
      return;
    }

    setTimeout(() => {
      yesBtnRef.current?.focus();
    }, 50);

    const trySpeakModal = () => {
      if (!showModal || modalSpeechStartedRef.current) return;
      speakText(INITIAL_MODAL_SPEECH, () => {
        modalSpeechStartedRef.current = true;
      });
    };

    // Intentos escalonados para cubrir la carga asíncrona de voces del navegador
    const t1 = window.setTimeout(trySpeakModal, 80);
    const t2 = window.setTimeout(trySpeakModal, 450);
    const t3 = window.setTimeout(trySpeakModal, 1100);

    const handleVoicesChanged = () => {
      if (!modalSpeechStartedRef.current && showModal) {
        trySpeakModal();
      }
    };

    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }

    // Si el navegador bloquea el audio sin gesto previo (política Autoplay),
    // reproducir inmediatamente al primer movimiento, foco, clic o tecla.
    const unlockSpeechOnInteraction = () => {
      if (showModal && !modalSpeechStartedRef.current) {
        trySpeakModal();
      }
    };

    window.addEventListener('pointerdown', unlockSpeechOnInteraction);
    window.addEventListener('pointermove', unlockSpeechOnInteraction, { once: true });
    window.addEventListener('mousemove', unlockSpeechOnInteraction, { once: true });
    window.addEventListener('touchstart', unlockSpeechOnInteraction, { once: true });
    window.addEventListener('focus', unlockSpeechOnInteraction);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      }
      window.removeEventListener('pointerdown', unlockSpeechOnInteraction);
      window.removeEventListener('pointermove', unlockSpeechOnInteraction);
      window.removeEventListener('mousemove', unlockSpeechOnInteraction);
      window.removeEventListener('touchstart', unlockSpeechOnInteraction);
      window.removeEventListener('focus', unlockSpeechOnInteraction);
    };
  }, [showModal, speakText]);

  // RECOLECTAR TODOS LOS ELEMENTOS NAVEGABLES E INFORMATIVOS DE LA PANTALLA ACTUAL
  const getNavigableElements = useCallback((): HTMLElement[] => {
    // Si hay un modal activo (ej. SweetAlert2 o Selección de Perfil Multi-Rol), navegar dentro de ese modal
    const swalPopup = document.querySelector<HTMLElement>('.swal2-popup');
    const customModal = document.querySelector<HTMLElement>('.a11y-active-modal, [role="dialog"][aria-modal="true"]');

    let rootContainer: ParentNode = document;
    if (swalPopup && swalPopup.offsetParent !== null) {
      rootContainer = swalPopup;
    } else if (customModal && customModal.offsetParent !== null) {
      rootContainer = customModal;
    }

    const selectors = [
      'h1',
      'h2',
      'h3',
      '.a11y-readable',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      'button:not(#a11y-floating-toggle)',
      'a[href]',
      '.nav-item',
      '.stat-card',
      '[role="button"]',
      'tbody tr',
      '[tabindex="0"]:not(#a11y-floating-toggle)'
    ].join(', ');

    const rawList = Array.from(rootContainer.querySelectorAll<HTMLElement>(selectors));

    const visibleList = rawList.filter(el => {
      if (el.id === 'a11y-floating-toggle') return false;
      if ((el as HTMLButtonElement).disabled) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      return true;
    });

    // Evitar duplicar contenedores padres e hijos que tengan exactamente el mismo texto
    return visibleList.filter((el, idx) => {
      const tag = el.tagName.toLowerCase();
      if (['h1', 'h2', 'h3'].includes(tag)) {
        const parentReadable = el.closest('.a11y-readable, .stat-card, button, .nav-item');
        if (parentReadable && parentReadable !== el) return false;
      }
      if (idx > 0) {
        const prev = visibleList[idx - 1];
        if (prev.contains(el) && ['button', 'a'].includes(prev.tagName.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, []);

  // CONSTRUIR DESCRIPCIÓN HABLADA CLARA PARA CADA ELEMENTO DE LA PLATAFORMA
  const describeElement = useCallback((el: HTMLElement): string => {
    const tagName = el.tagName.toLowerCase();
    const ariaLabel = el.getAttribute('aria-label');
    const titleAttr = el.getAttribute('title');
    const cleanText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

    if (tagName === 'input') {
      const inputEl = el as HTMLInputElement;
      const type = (inputEl.type || 'text').toLowerCase();
      const placeholder = (inputEl.placeholder || '').toLowerCase();
      const currentVal = inputEl.value || '';

      if (type === 'password' || placeholder.includes('•') || (ariaLabel && ariaLabel.toLowerCase().includes('contraseña'))) {
        const hasVal = currentVal.length > 0 ? `Tiene ${currentVal.length} caracteres ingresados.` : 'Campo vacío.';
        return `Campo Contraseña Secreta. ${hasVal} Escriba su contraseña y presione Enter para iniciar sesión, o use las flechas de dirección para navegar.`;
      }

      if (placeholder.includes('12.345') || (ariaLabel && ariaLabel.toLowerCase().includes('rut'))) {
        const valText = currentVal ? `Valor actual: ${currentVal.split('').join(' ')}.` : 'Campo vacío.';
        return `Campo RUT. ${valText} Escriba su RUT y presione flecha abajo o Enter para ir a la contraseña.`;
      }

      if (type === 'checkbox' || type === 'radio') {
        const stateText = inputEl.checked ? 'Marcado' : 'No marcado';
        return `Casilla ${ariaLabel || titleAttr || cleanText || ''}: ${stateText}. Presione Enter o Espacio para cambiar.`;
      }

      const labelText = ariaLabel || titleAttr || inputEl.placeholder || 'Campo de texto';
      const valText = currentVal ? `Texto actual: ${currentVal}.` : 'Vacío.';
      return `${labelText}. ${valText} Escriba para completar o use las flechas de dirección para continuar.`;
    }

    if (tagName === 'select') {
      const selectEl = el as HTMLSelectElement;
      const selectedText = selectEl.options[selectEl.selectedIndex]?.text || selectEl.value || 'Sin selección';
      const label = ariaLabel || titleAttr || 'Lista desplegable';
      return `Selector ${label}. Opción actual: ${selectedText}.`;
    }

    if (tagName === 'textarea') {
      const areaEl = el as HTMLTextAreaElement;
      const label = ariaLabel || titleAttr || areaEl.placeholder || 'Área de texto';
      return `${label}. ${areaEl.value ? `Contenido: ${areaEl.value}` : 'Vacío.'}`;
    }

    if (el.classList.contains('nav-item')) {
      const label = ariaLabel || titleAttr || cleanText || 'Opción de menú';
      const isActive = el.classList.contains('active') ? ' (Sección actual)' : '';
      return `Menú de navegación: ${label}${isActive}. Presione Enter para abrir.`;
    }

    if (el.classList.contains('stat-card')) {
      return `Tarjeta de resumen: ${cleanText || titleAttr || ''}. Presione Enter para abrir esta sección.`;
    }

    if (tagName === 'button' || el.classList.contains('btn') || el.getAttribute('role') === 'button') {
      const label = ariaLabel || cleanText || titleAttr || 'Botón';
      return `Botón: ${label}. Presione Enter para activar.`;
    }

    if (tagName === 'a') {
      return `Enlace: ${ariaLabel || cleanText || titleAttr || 'Enlace'}. Presione Enter para abrir.`;
    }

    if (tagName === 'tr') {
      return `Fila de registro: ${cleanText}.`;
    }

    if (['h1', 'h2', 'h3'].includes(tagName)) {
      return `Título: ${ariaLabel || cleanText}.`;
    }

    return ariaLabel || cleanText || titleAttr || 'Elemento de la plataforma';
  }, []);

  // ENFOCAR, RESALTAR Y LEER EN VOZ ALTA EL ELEMENTO SELECCIONADO
  const announceElement = useCallback(
    (el: HTMLElement, prefixText?: string) => {
      if (!el) return;

      // Asegurar que elementos div/tr/h2 puedan recibir foco real de teclado
      const tagName = el.tagName.toLowerCase();
      if (!['input', 'select', 'textarea', 'button', 'a'].includes(tagName) && !el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }

      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      document.querySelectorAll('.a11y-focused-ring').forEach(item => item.classList.remove('a11y-focused-ring'));
      el.classList.add('a11y-focused-ring');

      const description = describeElement(el);
      const fullSpeech = prefixText ? `${prefixText} ${description}` : description;
      speakText(fullSpeech);
    },
    [describeElement, speakText]
  );

  // ACTIVAR ASISTENTE DE VOZ Y ENFOCAR EL PRIMER ELEMENTO INTERACTIVO
  const activateA11y = useCallback(() => {
    setA11yEnabled(true);
    setShowModal(false);
    sessionStorage.setItem('ltp_a11y_prompt_shown', 'true');
    document.body.classList.add('high-contrast-mode');

    setTimeout(() => {
      const navList = getNavigableElements();
      elementsRef.current = navList;

      // Priorizar el campo RUT en el Login o el primer control interactivo
      const firstInputIdx = navList.findIndex(el => el.tagName.toLowerCase() === 'input');
      const targetIdx = firstInputIdx >= 0 ? firstInputIdx : navList.length > 0 ? 0 : -1;
      currentIndexRef.current = targetIdx;

      const welcomePrefix =
        'Asistente de accesibilidad por voz activado. Use las teclas de flecha arriba, abajo, izquierda y derecha para recorrer toda la plataforma, y presione Enter para seleccionar o ingresar.';

      if (targetIdx >= 0 && navList[targetIdx]) {
        announceElement(navList[targetIdx], welcomePrefix);
      } else {
        speakText(welcomePrefix);
      }
    }, 120);
  }, [announceElement, getNavigableElements, speakText]);

  const deactivateA11y = useCallback(() => {
    setA11yEnabled(false);
    setShowModal(false);
    sessionStorage.setItem('ltp_a11y_prompt_shown', 'true');
    document.body.classList.remove('high-contrast-mode');
    document.querySelectorAll('.a11y-focused-ring').forEach(item => item.classList.remove('a11y-focused-ring'));
    setCurrentCaption('');
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  // CONTROLADOR DE TECLADO CUANDO EL MODAL INICIAL ESTÁ ABIERTO
  useEffect(() => {
    if (!showModal) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (modalSelectedBtn === 'no') {
          deactivateA11y();
        } else {
          activateA11y();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        deactivateA11y();
        return;
      }

      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Tab'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        const nextBtn = modalSelectedBtn === 'yes' ? 'no' : 'yes';
        setModalSelectedBtn(nextBtn);
        if (nextBtn === 'yes') {
          yesBtnRef.current?.focus();
          speakText(
            `${!modalSpeechStartedRef.current ? INITIAL_MODAL_SPEECH + ' ' : ''}Opción seleccionada: Sí, activar asistente de voz. Presione Enter para confirmar.`,
            () => {
              modalSpeechStartedRef.current = true;
            }
          );
        } else {
          noBtnRef.current?.focus();
          speakText(
            `${!modalSpeechStartedRef.current ? INITIAL_MODAL_SPEECH + ' ' : ''}Opción seleccionada: No, gracias. Presione Enter o Escape para continuar sin asistencia.`,
            () => {
              modalSpeechStartedRef.current = true;
            }
          );
        }
        return;
      }

      // Cualquier otra tecla (ej. Espacio) lee inmediatamente las instrucciones del modal
      if (e.key === ' ' || !modalSpeechStartedRef.current) {
        if (e.key === ' ') e.preventDefault();
        speakText(INITIAL_MODAL_SPEECH, () => {
          modalSpeechStartedRef.current = true;
        });
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true);
    return () => window.removeEventListener('keydown', handleModalKeyDown, true);
  }, [showModal, modalSelectedBtn, activateA11y, deactivateA11y, speakText]);

  // CONTROLADOR GLOBAL DE NAVEGACIÓN POR TECLAS DE DIRECCIÓN, ENTER Y LECTURA DE ESCRITURA
  useEffect(() => {
    if (!a11yEnabled || showModal) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const activeTag = activeEl ? activeEl.tagName.toLowerCase() : '';
      const isInputOrTextarea = activeTag === 'input' || activeTag === 'textarea';

      // 1. NAVEGACIÓN CON LAS 4 TECLAS DE DIRECCIÓN (FLECHAS ARRIBA, ABAJO, IZQUIERDA, DERECHA Y TAB)
      const isNextKey =
        e.key === 'ArrowDown' ||
        e.key === 'ArrowRight' ||
        (e.key === 'Tab' && !e.shiftKey);
      const isPrevKey =
        e.key === 'ArrowUp' ||
        e.key === 'ArrowLeft' ||
        (e.key === 'Tab' && e.shiftKey);

      if (isNextKey || isPrevKey) {
        const navList = getNavigableElements();
        if (navList.length === 0) return;

        e.preventDefault();
        e.stopPropagation();
        elementsRef.current = navList;

        // Sincronizar índice con el elemento actualmente enfocado si existe
        const focusedIdx = activeEl ? navList.indexOf(activeEl) : -1;
        const baseIdx = focusedIdx >= 0 ? focusedIdx : currentIndexRef.current;

        let nextIndex = 0;
        if (isNextKey) {
          nextIndex = baseIdx < 0 ? 0 : (baseIdx + 1) % navList.length;
        } else {
          nextIndex = baseIdx <= 0 ? navList.length - 1 : (baseIdx - 1 + navList.length) % navList.length;
        }

        currentIndexRef.current = nextIndex;
        announceElement(navList[nextIndex]);
        return;
      }

      // 2. TECLA ENTER: EJECUTAR ACCIÓN, AVANZAR EN LOGIN O ABRIR SECCIÓN DE LA PLATAFORMA
      if (e.key === 'Enter') {
        const targetEl =
          activeEl && activeEl !== document.body
            ? activeEl
            : elementsRef.current[currentIndexRef.current] || null;

        if (!targetEl) return;

        const tag = targetEl.tagName.toLowerCase();

        // Si está en un campo input (ej. RUT o Contraseña en Login)
        if (tag === 'input') {
          const inputEl = targetEl as HTMLInputElement;
          const form = inputEl.closest('form');
          if (form) {
            e.preventDefault();
            const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'));
            const idx = inputs.indexOf(inputEl);
            // Si está en el RUT y falta la contraseña, pasar automáticamente al campo contraseña
            if (idx === 0 && inputs.length > 1 && !inputs[1].value) {
              const navList = getNavigableElements();
              const nextNavIdx = navList.indexOf(inputs[1]);
              if (nextNavIdx >= 0) currentIndexRef.current = nextNavIdx;
              announceElement(inputs[1]);
              return;
            }
            // Enviar el formulario de inicio de sesión
            speakText('Iniciando sesión, por favor espere.');
            const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
            if (submitBtn) {
              submitBtn.click();
            } else {
              form.requestSubmit();
            }
            return;
          }
        }

        // Si es un elemento de menú lateral (.nav-item), tarjeta (.stat-card), botón o fila interactiva
        if (tag !== 'button' && tag !== 'a' && tag !== 'input') {
          e.preventDefault();
          targetEl.click();
        }

        // Después de activar un botón o menú, anunciar la nueva vista cargada
        setTimeout(() => {
          const updatedList = getNavigableElements();
          elementsRef.current = updatedList;
          if (targetEl.classList.contains('nav-item') || targetEl.classList.contains('stat-card')) {
            const label = (targetEl.innerText || targetEl.getAttribute('title') || 'sección').replace(/\s+/g, ' ').trim();
            const mainContentEl = document.querySelector('.main-content');
            const firstMainIdx = mainContentEl
              ? updatedList.findIndex(item => mainContentEl.contains(item) && !item.classList.contains('search-input'))
              : -1;
            const targetIdx = firstMainIdx >= 0 ? firstMainIdx : 0;
            currentIndexRef.current = targetIdx;
            if (updatedList[targetIdx]) {
              announceElement(updatedList[targetIdx], `Sección abierta: ${label}.`);
            } else {
              speakText(`Sección abierta: ${label}.`);
            }
          }
        }, 380);
        return;
      }

      // 3. LECTURA EN VIVO AL ESCRIBIR EN CAMPOS DE TEXTO (RUT, CONTRASEÑA, BUSCADOR)
      if (isInputOrTextarea && activeEl) {
        const inputEl = activeEl as HTMLInputElement;
        const isPassword = (inputEl.type || '').toLowerCase() === 'password';

        if (e.key === 'Backspace') {
          speakText(isPassword ? 'Carácter borrado' : 'Borrado');
          return;
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          if (isPassword) {
            speakText('Asterisco');
          } else {
            const charMap: Record<string, string> = {
              '-': 'guion',
              '.': 'punto',
              ' ': 'espacio',
              '@': 'arroba'
            };
            speakText(charMap[e.key] || e.key);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [a11yEnabled, showModal, getNavigableElements, announceElement, speakText]);

  // ANUNCIAR AUTOMÁTICAMENTE CUANDO SE INICIA SESIÓN Y SE ENTRA AL PANEL PRINCIPAL
  useEffect(() => {
    if (a11yEnabled && isAuthenticated && !prevAuthRef.current) {
      setTimeout(() => {
        const navList = getNavigableElements();
        elementsRef.current = navList;
        currentIndexRef.current = navList.length > 0 ? 0 : -1;
        const welcomeMsg = `Sesión iniciada correctamente. Bienvenido ${user?.name || ''} al panel de ${user?.role || 'Liceo Pro'}. Use las flechas de dirección para recorrer el menú lateral y todas las secciones de la plataforma, y presione Enter para ingresar a cualquier módulo.`;
        if (navList[0]) {
          announceElement(navList[0], welcomeMsg);
        } else {
          speakText(welcomeMsg);
        }
      }, 500);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, a11yEnabled, user, getNavigableElements, announceElement, speakText]);

  // OBSERVADOR DE CAMBIOS EN PANTALLA: LEER ALERTAS SWEETALERT2 Y MODAL MULTI-PERFIL AUTOMÁTICAMENTE
  useEffect(() => {
    if (!a11yEnabled) return;

    const observer = new MutationObserver(() => {
      // 1. Detectar alertas o avisos SweetAlert2 (.swal2-popup)
      const swalPopup = document.querySelector<HTMLElement>('.swal2-popup');
      if (swalPopup && swalPopup.offsetParent !== null) {
        const title = document.querySelector('#swal2-title')?.textContent?.trim() || '';
        const html = document.querySelector('#swal2-html-container')?.textContent?.trim() || '';
        const combined = `${title}. ${html}`.trim();
        if (combined && combined !== '.' && combined !== lastAnnouncedSwalRef.current) {
          lastAnnouncedSwalRef.current = combined;
          speakText(`Aviso del sistema: ${combined}`);
          const confirmBtn = swalPopup.querySelector<HTMLElement>('.swal2-confirm');
          if (confirmBtn && !swalPopup.classList.contains('swal2-toast')) {
            setTimeout(() => confirmBtn.focus(), 100);
          }
        }
      } else {
        lastAnnouncedSwalRef.current = '';
      }

      // 2. Detectar modal de selección de perfil multi-rol en Login
      const multiRoleModal = document.querySelector<HTMLElement>('.a11y-active-modal');
      if (multiRoleModal && multiRoleModal.dataset.a11yAnnounced !== 'true') {
        multiRoleModal.dataset.a11yAnnounced = 'true';
        setTimeout(() => {
          const navList = getNavigableElements();
          elementsRef.current = navList;
          const firstRoleBtnIdx = navList.findIndex(
            el => el.tagName.toLowerCase() === 'button' && (el.getAttribute('aria-label') || '').includes('Ingresar como')
          );
          const idx = firstRoleBtnIdx >= 0 ? firstRoleBtnIdx : 0;
          currentIndexRef.current = idx;
          if (navList[idx]) {
            announceElement(
              navList[idx],
              'Selección de perfil de acceso. Use las flechas arriba y abajo para elegir con qué perfil desea ingresar hoy y presione Enter.'
            );
          }
        }, 200);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [a11yEnabled, getNavigableElements, announceElement, speakText]);

  return (
    <>
      {/* ESTILO DEL RESALTE VISUAL DE ALTO CONTRASTE PARA NAVEGACIÓN POR TECLADO */}
      <style>{`
        .a11y-focused-ring {
          outline: 4px solid #facc15 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 18px rgba(250, 204, 21, 0.95) !important;
          transition: outline 0.12s ease, box-shadow 0.12s ease !important;
        }
      `}</style>

      {/* ------------------------------------------------------------------- */}
      {/* VENTANA MODAL INICIAL DE CONFIRMACIÓN DE ACCESIBILIDAD */}
      {/* ------------------------------------------------------------------- */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-modal-title"
          aria-describedby="a11y-modal-desc"
          onClick={() => {
            if (!modalSpeechStartedRef.current) {
              speakText(INITIAL_MODAL_SPEECH, () => {
                modalSpeechStartedRef.current = true;
              });
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15,23,42,0.88)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '2.5rem 2rem',
              maxWidth: '450px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* ÍCONO */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}
            >
              <User size={28} color="#2563eb" />
            </div>

            {/* BOTÓN PARA REPETIR LECTURA EN VOZ ALTA */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                speakText(INITIAL_MODAL_SPEECH, () => {
                  modalSpeechStartedRef.current = true;
                });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '999px',
                padding: '0.3rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '0.85rem'
              }}
            >
              <Volume2 size={15} /> Escuchar instrucciones (Espacio)
            </button>

            {/* TÍTULO */}
            <h3
              id="a11y-modal-title"
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '0.75rem'
              }}
            >
              Asistente de Accesibilidad
            </h3>

            {/* DESCRIPCIÓN */}
            <p
              id="a11y-modal-desc"
              style={{
                color: '#64748b',
                fontSize: '0.88rem',
                lineHeight: 1.5,
                marginBottom: '1.75rem',
                padding: '0 0.5rem'
              }}
            >
              ¿Desea activar las funciones de asistencia por voz y navegación simplificada con teclas de direccionamiento para personas con discapacidad visual?
            </p>

            {/* BOTONES */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                ref={yesBtnRef}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  activateA11y();
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: modalSelectedBtn === 'yes' ? '3px solid #facc15' : 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                Sí, activar (Enter)
              </button>

              <button
                ref={noBtnRef}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  deactivateA11y();
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: modalSelectedBtn === 'no' ? '3px solid #2563eb' : 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                No, gracias (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA INFERIOR GUÍA DE VOZ Y TECLAS DE DIRECCIONAMIENTO CUANDO ESTÁ ACTIVO */}
      {a11yEnabled && !showModal && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.94)',
            color: '#f8fafc',
            border: '2px solid #facc15',
            borderRadius: '14px',
            padding: '0.55rem 1.1rem',
            maxWidth: 'min(92vw, 760px)',
            width: 'max-content',
            zIndex: 9998,
            boxShadow: '0 10px 25px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            textAlign: 'center',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fde047' }}>
            🔊 {currentCaption || 'Modo Accesibilidad Activo'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 500 }}>
            ⬆️⬇️⬅️➡️ Flechas: Recorrer plataforma • ⏎ Enter: Seleccionar / Ingresar
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE DISCRETO EN LA ESQUINA INFERIOR DERECHA (🔊) */}
      {!showModal && (
        <button
          id="a11y-floating-toggle"
          type="button"
          onClick={() => {
            if (!a11yEnabled) {
              activateA11y();
            } else {
              deactivateA11y();
            }
          }}
          title={a11yEnabled ? 'Desactivar Asistente de Voz' : 'Activar Asistente de Voz'}
          aria-label={a11yEnabled ? 'Desactivar Asistente de Voz' : 'Activar Asistente de Voz'}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: a11yEnabled ? '#2563eb' : '#94a3b8',
            color: '#ffffff',
            border: a11yEnabled ? '3px solid #facc15' : 'none',
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
