import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Clock,
  Printer,
  Copy,
  Save,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Search,
  RefreshCw,
  Eye,
  Check,
  Send,
  Sliders,
  ChevronRight,
  ChevronLeft,
  BookmarkCheck,
  Layers,
  ArrowRight,
  Monitor,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Zap,
  HelpCircle,
  Target,
  Wand2,
  FileCheck,
  Award
} from 'lucide-react';
import Swal from 'sweetalert2';

export interface ContinuityActivityItem {
  number: number;
  title: string;
  points: number;
  description: string;
  questions: string[];
}

export interface SlideItem {
  slide_number: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  teacher_prompt?: string;
  time_estimate?: string;
}

export interface ScaffoldTier {
  title: string;
  guidelines: string;
  hints: string[];
  simplified_questions: string[];
}

export interface StretchTier {
  title: string;
  guidelines: string;
  challenge_questions: string[];
}

export interface WarmUpItem {
  title: string;
  time_minutes: number;
  prompt: string;
  instructions: string;
}

export interface ContinuityActivity {
  id?: string;
  academic_year: number;
  annual_plan_id?: string;
  unit_name: string;
  course_name: string;
  subject_name: string;
  teacher_name: string;
  substitute_teacher_name?: string;
  oa_code: string;
  oa_title: string;
  duration_minutes: number;
  activity_type: 'guia_autonoma' | 'slides_deck' | 'starter_exit' | 'taller_practico';
  title: string;
  pedagogical_context?: string;
  instructions_for_students: string;
  instructions_for_substitute: string;
  content_summary: string;
  activities_json: ContinuityActivityItem[];
  exit_ticket: string;
  answer_key: string;
  rubric_criteria: string;
  slides_json?: SlideItem[];
  scaffold_json?: ScaffoldTier;
  stretch_json?: StretchTier;
  warm_up_json?: WarmUpItem;
  status?: string;
  created_at?: string;
}

interface PedagogicalContinuityModuleProps {
  token: string;
  user: any;
  coursesList: string[];
  subjectsList: string[];
  teachersList: string[];
  annualPlans?: any[];
  preselectedPlan?: any;
}

export const PedagogicalContinuityModule: React.FC<PedagogicalContinuityModuleProps> = ({
  token,
  user,
  coursesList,
  subjectsList,
  teachersList,
  annualPlans = [],
  preselectedPlan
}) => {
  // Pestaña principal de navegación
  const [subTab, setSubTab] = useState<'studio' | 'worksheet' | 'slides' | 'differentiation' | 'substitute_guide' | 'editor' | 'history'>('studio');

  // Nivel de diferenciación activo para la ficha
  const [diffTier, setDiffTier] = useState<'standard' | 'scaffold' | 'stretch'>('standard');

  // Herramienta Chalkie seleccionada
  const [selectedTool, setSelectedTool] = useState<'guia_autonoma' | 'slides_deck' | 'starter_exit' | 'taller_practico'>('guia_autonoma');

  // Formulario y Contexto
  const [courseName, setCourseName] = useState<string>(preselectedPlan?.course_name || coursesList[0] || '');
  const [subjectName, setSubjectName] = useState<string>(preselectedPlan?.subject_name || subjectsList[0] || '');
  const [teacherName, setTeacherName] = useState<string>(preselectedPlan?.teacher_name || user?.name || '');
  const [substituteTeacherName, setSubstituteTeacherName] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [unitName, setUnitName] = useState<string>('Unidad 1: Nivelación y Diagnóstico Inicial');
  const [oaCode, setOaCode] = useState<string>('OA 1');
  const [oaTitle, setOaTitle] = useState<string>('');
  const [lastCoveredTopics, setLastCoveredTopics] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Contexto detectado automáticamente
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectedContext, setDetectedContext] = useState<any>(null);

  // Estado de Generación IA
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentActivity, setCurrentActivity] = useState<ContinuityActivity | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Asistente Co-Piloto de Refinamiento IA (Chalkie Co-Pilot)
  const [copilotPrompt, setCopilotPrompt] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);

  // Presentador de Diapositivas
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // Temporizador de Aula para Diapositivas
  const [timerSeconds, setTimerSeconds] = useState<number>(600); // 10 min por defecto
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Historial de Actividades
  const [historyList, setHistoryList] = useState<ContinuityActivity[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyCourseFilter, setHistoryCourseFilter] = useState<string>('all');

  // Sincronizar preselectedPlan
  useEffect(() => {
    if (preselectedPlan) {
      if (preselectedPlan.course_name) setCourseName(preselectedPlan.course_name);
      if (preselectedPlan.subject_name) setSubjectName(preselectedPlan.subject_name);
      if (preselectedPlan.teacher_name) setTeacherName(preselectedPlan.teacher_name);
      if (preselectedPlan.substitute_teacher_name) setSubstituteTeacherName(preselectedPlan.substitute_teacher_name);
    }
  }, [preselectedPlan]);

  // Cargar historial
  useEffect(() => {
    loadHistory();
  }, []);

  // Detectar automáticamente el contexto cuando cambia curso o asignatura
  useEffect(() => {
    if (courseName && subjectName) {
      detectCurriculumContext();
    }
  }, [courseName, subjectName, teacherName]);

  // Manejo del temporizador
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      Swal.fire({
        icon: 'info',
        title: '¡Tiempo Cumplido!',
        text: 'El temporizador de la actividad ha finalizado.',
        timer: 3000,
        showConfirmButton: false
      });
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const detectCurriculumContext = async () => {
    if (!courseName || !subjectName) return;
    setIsDetecting(true);
    try {
      const qParams = new URLSearchParams({
        course_name: courseName,
        subject_name: subjectName,
        teacher_name: teacherName || ''
      });
      const res = await fetch(`/api/curriculum/continuity-context?${qParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetectedContext(data);

        if (data.suggestedUnit) setUnitName(data.suggestedUnit);
        if (data.suggestedOa) setOaCode(data.suggestedOa);
        if (data.lastCoveredSummary) {
          setLastCoveredTopics(data.lastCoveredSummary);
        } else if (data.lastLesson) {
          setLastCoveredTopics(`Clase #${data.lastLesson.class_number}: ${data.lastLesson.class_goal || ''}`);
        }
      }
    } catch (err) {
      console.warn('Error al detectar contexto de continuidad:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/curriculum/continuity-activities?academic_year=2026', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.activities || []);
      }
    } catch (err) {
      console.warn('Error al cargar historial de actividades:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Generar Material con Inteligencia Artificial estilo Chalkie
  const handleGenerateActivity = async () => {
    if (!courseName || !subjectName) {
      Swal.fire('Atención', 'Por favor selecciona el curso y la asignatura.', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        course_name: courseName,
        subject_name: subjectName,
        teacher_name: teacherName || user?.name || 'Docente Titular',
        substitute_teacher_name: substituteTeacherName || 'Docente de Reemplazo / Apoyo',
        annual_plan_id: detectedContext?.annualPlan?.id || null,
        unit_name: unitName,
        oa_code: oaCode,
        oa_title: oaTitle || (detectedContext?.suggestedOa || 'Objetivo de Aprendizaje Priorizado'),
        duration_minutes: durationMinutes,
        activity_type: selectedTool,
        last_covered_topics: lastCoveredTopics,
        additional_instructions: additionalNotes
      };

      const res = await fetch('/api/curriculum/generate-continuity-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error en el servidor al generar material.');

      const resData = await res.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData.error || 'No se recibieron datos pedagógicos válidos.');
      }

      const generated = resData.data;

      const newActivity: ContinuityActivity = {
        academic_year: 2026,
        annual_plan_id: detectedContext?.annualPlan?.id || undefined,
        unit_name: unitName,
        course_name: courseName,
        subject_name: subjectName,
        teacher_name: teacherName || user?.name || 'Docente Titular',
        substitute_teacher_name: substituteTeacherName || 'Docente de Reemplazo / Asistente',
        oa_code: oaCode,
        oa_title: oaTitle || (detectedContext?.suggestedOa || 'Objetivo de Aprendizaje'),
        duration_minutes: durationMinutes,
        activity_type: selectedTool,
        title: generated.title || `Recurso Pedagógico: ${subjectName}`,
        pedagogical_context: generated.pedagogical_context || '',
        instructions_for_students: generated.instructions_for_students || '',
        instructions_for_substitute: generated.instructions_for_substitute || '',
        content_summary: generated.content_summary || '',
        activities_json: generated.activities || [],
        exit_ticket: generated.exit_ticket || '',
        answer_key: generated.answer_key || '',
        rubric_criteria: generated.rubric_criteria || '',
        slides_json: generated.slides || [],
        scaffold_json: generated.scaffold || undefined,
        stretch_json: generated.stretch || undefined,
        warm_up_json: generated.warm_up || undefined,
        status: 'generada'
      };

      setCurrentActivity(newActivity);
      setCurrentSlideIndex(0);

      // Si seleccionó slides, abrir vista slides; si no, abrir ficha
      if (selectedTool === 'slides_deck') {
        setSubTab('slides');
      } else {
        setSubTab('worksheet');
      }

      Swal.fire({
        icon: 'success',
        title: '¡Recurso Generado al Estilo Chalkie!',
        text: 'Se han creado la guía diferenciada, las diapositivas de aula y la pauta docente conectadas a la materia en curso.',
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error al generar actividad:', err);
      Swal.fire('Error', err.message || 'No se pudo generar la actividad.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Asistente Co-Piloto de Refinamiento IA (Chalkie AI Co-Pilot)
  const handleRefineActivity = async (promptToUse?: string) => {
    const textPrompt = promptToUse || copilotPrompt;
    if (!currentActivity || !textPrompt.trim()) return;

    setIsRefining(true);
    try {
      const res = await fetch('/api/curriculum/refine-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentActivity,
          prompt: textPrompt
        })
      });

      if (!res.ok) throw new Error('Error al refinar recurso.');
      const data = await res.json();
      if (!data.success || !data.activity) throw new Error(data.error || 'No se recibió respuesta válida.');

      setCurrentActivity(data.activity);
      setCopilotPrompt('');

      Swal.fire({
        icon: 'success',
        title: '¡Recurso Adaptado por la IA!',
        text: `Se aplicó la instrucción: "${textPrompt.substring(0, 50)}..."`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error al refinar con IA:', err);
      Swal.fire('Error', err.message || 'No se pudo adaptar el recurso.', 'error');
    } finally {
      setIsRefining(false);
    }
  };

  // Guardar en repositorio de Supabase
  const handleSaveActivity = async () => {
    if (!currentActivity) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/curriculum/continuity-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(currentActivity)
      });
      if (!res.ok) throw new Error('Error al guardar en el servidor.');
      const data = await res.json();

      setCurrentActivity({
        ...currentActivity,
        id: data.id
      });

      await loadHistory();

      Swal.fire({
        icon: 'success',
        title: 'Guardado en Repositorio Institucional',
        text: 'El recurso está disponible para consulta de UTP y los docentes.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error al guardar:', err);
      Swal.fire('Error', err.message || 'No se pudo guardar el recurso.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar recurso
  const handleDeleteActivity = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: '¿Eliminar recurso?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/curriculum/continuity-activities/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          Swal.fire('Eliminado', 'El recurso fue eliminado.', 'success');
          loadHistory();
          if (currentActivity?.id === id) {
            setCurrentActivity(null);
            setSubTab('studio');
          }
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar el recurso.', 'error');
      }
    }
  };

  // Pantalla completa para Diapositivas
  const toggleFullscreen = () => {
    if (!slideContainerRef.current) return;
    if (!document.fullscreenElement) {
      slideContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Copiar al portapapeles
  const handleCopyToClipboard = () => {
    if (!currentActivity) return;
    const textToCopy = `
LICEO TÉCNICO PROFESIONAL CAMPANARIO
${currentActivity.title}

CURSO: ${currentActivity.course_name} | ASIGNATURA: ${currentActivity.subject_name}
DOCENTE TITULAR: ${currentActivity.teacher_name} | REEMPLAZO: ${currentActivity.substitute_teacher_name || 'Docente a cargo'}
OBJETIVO: ${currentActivity.oa_code} — ${currentActivity.oa_title}

MARCO TEÓRICO:
${currentActivity.content_summary}

ACTIVIDADES:
${currentActivity.activities_json.map(a => `• ${a.title} (${a.points} pts):\n${a.questions.map(q => `  - ${q}`).join('\n')}`).join('\n\n')}

TICKET DE SALIDA:
${currentActivity.exit_ticket}

SOLUCIONARIO DOCENTE:
${currentActivity.answer_key}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    Swal.fire({
      icon: 'success',
      title: '¡Copiado!',
      text: 'Contenido completo copiado para pegar en Word, PowerPoint o Google Docs.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Filtrado de historial
  const filteredHistory = useMemo(() => {
    return historyList.filter(act => {
      const matchCourse = historyCourseFilter === 'all' || act.course_name === historyCourseFilter;
      const s = historySearch.toLowerCase();
      const matchSearch = !s ||
        act.title.toLowerCase().includes(s) ||
        act.course_name.toLowerCase().includes(s) ||
        act.subject_name.toLowerCase().includes(s) ||
        act.teacher_name.toLowerCase().includes(s) ||
        act.oa_code.toLowerCase().includes(s);
      return matchCourse && matchSearch;
    });
  }, [historyList, historyCourseFilter, historySearch]);

  const slides = currentActivity?.slides_json || [];
  const currentSlide = slides[currentSlideIndex] || null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* ===================================================================== */}
      {/* ESTILOS DE IMPRESIÓN OFICIALES                                        */}
      {/* ===================================================================== */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-worksheet, #printable-worksheet * { visibility: visible; }
          #printable-worksheet {
            position: absolute; left: 0; top: 0; width: 100%;
            background: #ffffff !important; color: #000000 !important;
            padding: 1cm; font-family: 'Arial', sans-serif !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* HEADER ESTILO CHALKIE STUDIO */}
      <div className="no-print" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 20px rgba(49, 46, 129, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            borderRadius: '14px',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
          }}>
            <Wand2 size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                Chalkie LTP — Studio de Creación Pedagógica con IA
              </h2>
              <span style={{
                background: '#f59e0b',
                color: '#1e1b4b',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 900,
                letterSpacing: '0.04em'
              }}>
                CHALKIE AI WORKFLOW
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.86rem', color: '#c7d2fe', maxWidth: '850px', lineHeight: 1.4 }}>
              Genera clases completas, diapositivas proyectables, guías diferenciadas (DUA/PIE y Desafío) y material de continuidad
              alineado automáticamente con lo que el docente estaba pasando en el aula.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setSubTab('studio')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              border: subTab === 'studio' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)',
              background: subTab === 'studio' ? '#ffffff' : 'rgba(255,255,255,0.1)',
              color: subTab === 'studio' ? '#1e1b4b' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={16} />
            Crear Recurso
          </button>
          <button
            type="button"
            onClick={() => { setSubTab('history'); loadHistory(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              border: subTab === 'history' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)',
              background: subTab === 'history' ? '#ffffff' : 'rgba(255,255,255,0.1)',
              color: subTab === 'history' ? '#1e1b4b' : '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <BookmarkCheck size={16} />
            Biblioteca ({historyList.length})
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PESTAÑA 1: STUDIO DE CREACIÓN ESTILO CHALKIE                         */}
      {/* ===================================================================== */}
      {subTab === 'studio' && (
        <div className="no-print">
          {/* PASO 1: SELECCIONAR HERRAMIENTA CHALKIE */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} color="#4338ca" />
              1. ¿Qué deseas crear hoy? (Selecciona el tipo de recurso pedagógico)
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem'
            }}>
              {/* HERRAMIENTA 1: GUÍA DIFERENCIADA */}
              <div
                onClick={() => setSelectedTool('guia_autonoma')}
                style={{
                  border: selectedTool === 'guia_autonoma' ? '2px solid #4338ca' : '1px solid #cbd5e1',
                  background: selectedTool === 'guia_autonoma' ? '#eef2ff' : '#ffffff',
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selectedTool === 'guia_autonoma' ? '0 4px 10px rgba(67, 56, 202, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <FileText size={22} color={selectedTool === 'guia_autonoma' ? '#4338ca' : '#64748b'} />
                  {selectedTool === 'guia_autonoma' && <CheckCircle2 size={18} color="#4338ca" />}
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  Guía & Ficha Diferenciada
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
                  Genera la guía estándar + versión de apoyo DUA/PIE + versión de extensión/desafío.
                </p>
              </div>

              {/* HERRAMIENTA 2: SLIDES PARA EL AULA */}
              <div
                onClick={() => setSelectedTool('slides_deck')}
                style={{
                  border: selectedTool === 'slides_deck' ? '2px solid #4338ca' : '1px solid #cbd5e1',
                  background: selectedTool === 'slides_deck' ? '#eef2ff' : '#ffffff',
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selectedTool === 'slides_deck' ? '0 4px 10px rgba(67, 56, 202, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <Monitor size={22} color={selectedTool === 'slides_deck' ? '#4338ca' : '#64748b'} />
                  {selectedTool === 'slides_deck' && <CheckCircle2 size={18} color="#4338ca" />}
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  Diapositivas de Aula (Slides)
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
                  Diapositivas listas para proyectar en Data Show con pantalla completa y temporizador.
                </p>
              </div>

              {/* HERRAMIENTA 3: ACTIVACIÓN Y TICKET DE SALIDA */}
              <div
                onClick={() => setSelectedTool('starter_exit')}
                style={{
                  border: selectedTool === 'starter_exit' ? '2px solid #4338ca' : '1px solid #cbd5e1',
                  background: selectedTool === 'starter_exit' ? '#eef2ff' : '#ffffff',
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selectedTool === 'starter_exit' ? '0 4px 10px rgba(67, 56, 202, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <Zap size={22} color={selectedTool === 'starter_exit' ? '#4338ca' : '#64748b'} />
                  {selectedTool === 'starter_exit' && <CheckCircle2 size={18} color="#4338ca" />}
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  Kit de Inicio & Cierre Rápido
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
                  Dinámica de activación (Warm-up) de 5 min y Ticket de Salida para comprobar logros.
                </p>
              </div>

              {/* HERRAMIENTA 4: TALLER PRÁCTICO TP */}
              <div
                onClick={() => setSelectedTool('taller_practico')}
                style={{
                  border: selectedTool === 'taller_practico' ? '2px solid #4338ca' : '1px solid #cbd5e1',
                  background: selectedTool === 'taller_practico' ? '#eef2ff' : '#ffffff',
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selectedTool === 'taller_practico' ? '0 4px 10px rgba(67, 56, 202, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <Award size={22} color={selectedTool === 'taller_practico' ? '#4338ca' : '#64748b'} />
                  {selectedTool === 'taller_practico' && <CheckCircle2 size={18} color="#4338ca" />}
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  Taller Técnico / Caso Real TP
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.35 }}>
                  Resolución de casos en puesto de trabajo, taller industrial o sala de párvulos.
                </p>
              </div>
            </div>
          </div>

          {/* PASO 2: PARÁMETROS Y DETECCIÓN AUTOMÁTICA */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            {/* COLUMNA IZQUIERDA: CURSO, ASIGNATURA Y REEMPLAZO */}
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <BookOpen size={17} color="#4338ca" />
                2. Curso, Asignatura y Docente
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Curso / Nivel:
                  </label>
                  <select
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                  >
                    {coursesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Asignatura o Módulo TP:
                  </label>
                  <select
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                  >
                    {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      Docente Titular (Ausente):
                    </label>
                    <input
                      type="text"
                      value={teacherName}
                      onChange={e => setTeacherName(e.target.value)}
                      placeholder="Docente titular"
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      Docente de Reemplazo:
                    </label>
                    <input
                      type="text"
                      value={substituteTeacherName}
                      onChange={e => setSubstituteTeacherName(e.target.value)}
                      placeholder="Ej: Profesor de apoyo / volante"
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Duración Estimada de la Clase:
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  >
                    <option value={45}>45 Minutos (1 Bloque Corto)</option>
                    <option value={90}>90 Minutos (2 Bloques / 1 Sesión Completa)</option>
                    <option value={135}>135 Minutos (3 Bloques / Taller Extenso)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: CONTINUIDAD CURRICULAR DETECTADA */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Layers size={17} color="#0284c7" />
                    3. Continuidad Curricular Detectada
                  </h3>
                  {isDetecting && (
                    <span style={{ fontSize: '0.74rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <RefreshCw size={12} className="spin" /> Sincronizando...
                    </span>
                  )}
                </div>

                {detectedContext?.annualPlan ? (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '0.8rem',
                    marginBottom: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 800, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <CheckCircle2 size={15} /> Planificación Oficial Sincronizada
                    </div>
                    {detectedContext.lastLesson && (
                      <div style={{ fontSize: '0.78rem', color: '#166534', background: '#dcfce7', padding: '0.35rem 0.55rem', borderRadius: '6px' }}>
                        📌 <strong>Última clase realizada:</strong> Clase #{detectedContext.lastLesson.class_number} ({detectedContext.lastLesson.class_goal || 'Sin detalle'})
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fef08a',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    marginBottom: '0.85rem',
                    fontSize: '0.77rem',
                    color: '#854d0e'
                  }}>
                    ℹ️ Creando recurso basado en los marcos y bases curriculares oficiales del MINEDUC para {courseName}.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      Unidad de Aprendizaje:
                    </label>
                    <input
                      type="text"
                      value={unitName}
                      onChange={e => setUnitName(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      Objetivo de Aprendizaje (OA):
                    </label>
                    <input
                      type="text"
                      value={oaCode}
                      onChange={e => setOaCode(e.target.value)}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      ¿Qué materia estaba pasando el docente? (Para continuidad exacta):
                    </label>
                    <textarea
                      rows={2}
                      value={lastCoveredTopics}
                      onChange={e => setLastCoveredTopics(e.target.value)}
                      placeholder="Ej: Se explicó la teoría; falta ejercitar problemas de aplicación..."
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* BOTÓN PRINCIPAL ESTILO CHALKIE */}
              <div style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateActivity}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)',
                    color: '#ffffff',
                    padding: '0.9rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.96rem',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    boxShadow: isGenerating ? 'none' : '0 6px 15px rgba(67, 56, 202, 0.35)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={20} color="#f59e0b" />
                  {isGenerating ? 'Generando Clase y Recursos con IA...' : 'Generar Clase Completa con IA (Chalkie)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BARRA DE NAVEGACIÓN MULTIMODAL ESTILO CHALKIE (SI HAY MATERIAL)       */}
      {/* ===================================================================== */}
      {currentActivity && (
        <div className="no-print" style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '0.65rem',
          border: '1.5px solid #e0e7ff',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          boxShadow: '0 2px 6px rgba(67, 56, 202, 0.06)'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSubTab('worksheet')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'worksheet' ? '#4338ca' : '#f1f5f9',
                color: subTab === 'worksheet' ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <FileText size={16} />
              1. Ficha / Guía de Aula
            </button>

            <button
              type="button"
              onClick={() => setSubTab('differentiation')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'differentiation' ? '#059669' : '#f1f5f9',
                color: subTab === 'differentiation' ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Layers size={16} />
              2. Diferenciación (DUA / Desafío)
            </button>

            <button
              type="button"
              onClick={() => setSubTab('slides')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'slides' ? '#d97706' : '#f1f5f9',
                color: subTab === 'slides' ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Monitor size={16} />
              3. Diapositivas para Proyectar ({slides.length})
            </button>

            <button
              type="button"
              onClick={() => setSubTab('substitute_guide')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'substitute_guide' ? '#0284c7' : '#f1f5f9',
                color: subTab === 'substitute_guide' ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={16} />
              4. Pauta & Solucionario Docente
            </button>

            <button
              type="button"
              onClick={() => setSubTab('editor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'editor' ? '#7c3aed' : '#f1f5f9',
                color: subTab === 'editor' ? '#ffffff' : '#334155',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={16} />
              5. Editor
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={16} />
              Imprimir
            </button>

            <button
              type="button"
              onClick={handleCopyToClipboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Copy size={16} />
              Copiar
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveActivity}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Save size={16} />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ASISTENTE CO-PILOTO CHALKIE AI (BARRA DE REFINAMIENTO EN TIEMPO REAL) */}
      {/* ===================================================================== */}
      {currentActivity && (
        <div className="no-print" style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1.5px solid #86efac',
          borderRadius: '14px',
          padding: '1rem',
          marginBottom: '1.25rem',
          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <Wand2 size={18} color="#16a34a" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
              Chalkie Co-Pilot: Pídele a la IA ajustar o enriquecer este recurso
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <input
              type="text"
              placeholder="Ej: Añade 2 preguntas de selección múltiple, hazlo más fácil para DUA, o enfócalo en un caso de taller..."
              value={copilotPrompt}
              onChange={e => setCopilotPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRefineActivity()}
              style={{
                flex: 1,
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #86efac',
                fontSize: '0.84rem',
                background: '#ffffff'
              }}
            />
            <button
              type="button"
              disabled={isRefining || !copilotPrompt.trim()}
              onClick={() => handleRefineActivity()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: isRefining ? '#94a3b8' : '#16a34a',
                color: '#ffffff',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: isRefining ? 'not-allowed' : 'pointer'
              }}
            >
              <Sparkles size={16} />
              {isRefining ? 'Refinando...' : 'Adaptar con IA'}
            </button>
          </div>

          {/* BOTONES DE REFINAMIENTO RÁPIDO ESTILO CHALKIE */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleRefineActivity('Diferenciar y simplificar instrucciones con apoyos visuales para estudiantes PIE / DUA')}
              style={{
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.74rem',
                color: '#166534',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🪄 Adaptar para DUA/PIE
            </button>

            <button
              type="button"
              onClick={() => handleRefineActivity('Hacer las actividades más prácticas enfocadas en situaciones reales de taller o comunidad')}
              style={{
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.74rem',
                color: '#166534',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🪄 Enfoque Práctico TP
            </button>

            <button
              type="button"
              onClick={() => handleRefineActivity('Agregar 2 preguntas de selección múltiple con 4 alternativas')}
              style={{
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.74rem',
                color: '#166534',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🪄 Añadir Selección Múltiple
            </button>

            <button
              type="button"
              onClick={() => handleRefineActivity('Agregar un desafío de extensión y pensamiento crítico avanzado')}
              style={{
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                padding: '0.3rem 0.6rem',
                fontSize: '0.74rem',
                color: '#166534',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🪄 Añadir Desafío Avanzado
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 1: FICHA / GUÍA DE AULA IMPRIMIBLE                              */}
      {/* ===================================================================== */}
      {subTab === 'worksheet' && currentActivity && (
        <div id="printable-worksheet" style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          maxWidth: '900px',
          margin: '0 auto',
          color: '#0f172a'
        }}>
          {/* ENCABEZADO OFICIAL */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2.5px solid #0f172a',
            paddingBottom: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                República de Chile — Región de Ñuble — Comuna de Yungay
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0' }}>
                LICEO TÉCNICO PROFESIONAL CAMPANARIO
              </h1>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4338ca' }}>
                Unidad Técnica Pedagógica • Ficha de Trabajo y Continuidad Curricular
              </div>
            </div>

            <table style={{ borderCollapse: 'collapse', border: '1.5px solid #0f172a', fontSize: '0.75rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #0f172a', padding: '0.25rem 0.5rem' }}>Puntaje Ideal</th>
                  <th style={{ border: '1px solid #0f172a', padding: '0.25rem 0.5rem' }}>Puntaje Obtenido</th>
                  <th style={{ border: '1px solid #0f172a', padding: '0.25rem 0.5rem' }}>Nota</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #0f172a', padding: '0.4rem', fontWeight: 800 }}>24 pts</td>
                  <td style={{ border: '1px solid #0f172a', padding: '0.4rem', minWidth: '70px' }}></td>
                  <td style={{ border: '1px solid #0f172a', padding: '0.4rem', minWidth: '70px' }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* DATOS DEL ESTUDIANTE */}
          <div style={{
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            background: '#fafafa',
            fontSize: '0.84rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div><strong>Estudiante:</strong> __________________________________________________</div>
              <div><strong>Curso:</strong> {currentActivity.course_name}</div>
              <div><strong>Fecha:</strong> ____ / ____ / 2026</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '0.75rem' }}>
              <div><strong>Asignatura:</strong> {currentActivity.subject_name}</div>
              <div><strong>Docente Titular:</strong> {currentActivity.teacher_name}</div>
              <div><strong>Tiempo:</strong> {currentActivity.duration_minutes} min</div>
            </div>
          </div>

          {/* TÍTULO Y OBJETIVO */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem 0', textTransform: 'uppercase' }}>
              {currentActivity.title}
            </h2>
            <div style={{
              display: 'inline-block',
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              color: '#312e81'
            }}>
              <strong>Objetivo de Aprendizaje:</strong> {currentActivity.oa_code} — {currentActivity.oa_title}
            </div>
          </div>

          {/* INSTRUCCIONES */}
          <div style={{
            background: '#fffbeb',
            borderLeft: '4px solid #f59e0b',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: '4px',
            fontSize: '0.82rem',
            color: '#78350f',
            lineHeight: 1.4
          }}>
            <strong>INSTRUCCIONES DE TRABAJO:</strong>
            <p style={{ margin: '0.3rem 0 0 0', whiteSpace: 'pre-line' }}>
              {currentActivity.instructions_for_students}
            </p>
          </div>

          {/* MARCO CONCEPTUAL */}
          {currentActivity.content_summary && (
            <div style={{
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              background: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>
                📖 Marco Conceptual y Síntesis de Contenidos:
              </h3>
              <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {currentActivity.content_summary}
              </div>
            </div>
          )}

          {/* ACTIVIDADES */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: '0 0 1rem 0', borderBottom: '2px solid #0f172a', paddingBottom: '0.3rem' }}>
              ACTIVIDADES DE DESARROLLO Y APLICACIÓN:
            </h3>

            {currentActivity.activities_json.map((act, idx) => (
              <div key={idx} style={{
                marginBottom: '1.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                background: '#ffffff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.4rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {act.title}
                  </h4>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    {act.points} Puntos
                  </span>
                </div>

                {act.description && (
                  <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0 0 0.75rem 0', fontStyle: 'italic' }}>
                    {act.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {act.questions.map((q, qIdx) => (
                    <div key={qIdx} style={{ fontSize: '0.84rem', color: '#1e293b' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{q}</div>
                      <div style={{
                        height: '60px',
                        borderBottom: '1px dotted #94a3b8',
                        background: 'repeating-linear-gradient(transparent, transparent 24px, #e2e8f0 25px)',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* TICKET DE SALIDA */}
          {currentActivity.exit_ticket && (
            <div style={{
              border: '2px solid #0f172a',
              borderRadius: '8px',
              padding: '1rem',
              background: '#fafafa',
              marginTop: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                  🎟️ TICKET DE SALIDA (Completar y entregar 3 minutos antes del timbre)
                </h4>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626' }}>OBLIGATORIO</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', whiteSpace: 'pre-line', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                {currentActivity.exit_ticket}
              </div>
              <div style={{
                height: '50px',
                borderBottom: '1px dotted #94a3b8',
                background: 'repeating-linear-gradient(transparent, transparent 24px, #e2e8f0 25px)'
              }}></div>
            </div>
          )}

          <div style={{
            marginTop: '2rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#64748b'
          }}>
            <div>LTP Campanario — Excelencia Técnico Profesional y Humana</div>
            <div>Recurso generado con Chalkie LTP Curricular AI</div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 2: DIFERENCIACIÓN SIMULTÁNEA (DUA / PIE / DESAFÍO)              */}
      {/* ===================================================================== */}
      {subTab === 'differentiation' && currentActivity && (
        <div className="no-print" style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          maxWidth: '920px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Layers size={20} color="#059669" />
                Diferenciación Simultánea (Scaffold & Stretch — Chalkie)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Adapta el mismo contenido a los diferentes ritmos y estilos de aprendizaje de los estudiantes.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setDiffTier('standard')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: diffTier === 'standard' ? '2px solid #4338ca' : '1px solid #cbd5e1',
                  background: diffTier === 'standard' ? '#eef2ff' : '#ffffff',
                  color: diffTier === 'standard' ? '#4338ca' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🌟 Estándar
              </button>
              <button
                type="button"
                onClick={() => setDiffTier('scaffold')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: diffTier === 'scaffold' ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: diffTier === 'scaffold' ? '#ecfdf5' : '#ffffff',
                  color: diffTier === 'scaffold' ? '#059669' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                ♿ Nivel Apoyo (DUA / PIE)
              </button>
              <button
                type="button"
                onClick={() => setDiffTier('stretch')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: diffTier === 'stretch' ? '2px solid #d97706' : '1px solid #cbd5e1',
                  background: diffTier === 'stretch' ? '#fffbeb' : '#ffffff',
                  color: diffTier === 'stretch' ? '#d97706' : '#475569',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🚀 Nivel Desafío (Stretch)
              </button>
            </div>
          </div>

          {/* CONTENIDO SEGÚN NIVEL */}
          {diffTier === 'standard' && (
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
                🌟 Versión Estándar (Todo el Curso)
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                Esta es la guía base configurada con 3 ítems de resolución graduada, marco conceptual y ticket de salida.
              </p>
              <button
                type="button"
                onClick={() => setSubTab('worksheet')}
                style={{ marginTop: '0.5rem', padding: '0.45rem 0.85rem', background: '#4338ca', color: '#ffffff', borderRadius: '6px', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Ver Ficha Estándar Completa
              </button>
            </div>
          )}

          {diffTier === 'scaffold' && (
            <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid #86efac' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ background: '#059669', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  ADECUACIÓN DUA / PIE
                </span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#065f46', margin: 0 }}>
                  {currentActivity.scaffold_json?.title || 'Versión de Apoyo Guiado'}
                </h4>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#047857', marginBottom: '1rem', fontStyle: 'italic' }}>
                {currentActivity.scaffold_json?.guidelines || 'Instrucciones simplificadas y pistas paso a paso para estudiantes con necesidades de apoyo.'}
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.84rem', color: '#065f46' }}>💡 Pistas de Apoyo y Pasos Resumidos:</strong>
                <ul style={{ margin: '0.4rem 0 0 1rem', padding: 0, fontSize: '0.82rem', color: '#14532d', lineHeight: 1.6 }}>
                  {currentActivity.scaffold_json?.hints?.map((h, i) => <li key={i}>{h}</li>) || (
                    <>
                      <li>Pista 1: Revisa el marco conceptual antes de responder.</li>
                      <li>Pista 2: Subraya las palabras clave de la pregunta.</li>
                      <li>Pista 3: Apóyate en tu compañero tutor asignado.</li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <strong style={{ fontSize: '0.84rem', color: '#065f46' }}>📝 Preguntas Guiadas / Simplificadas:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {currentActivity.scaffold_json?.simplified_questions?.map((sq, i) => (
                    <div key={i} style={{ background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#14532d' }}>
                      {sq}
                    </div>
                  )) || (
                    <div style={{ background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#14532d' }}>
                      1. Explica con tus palabras la idea central de la clase.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {diffTier === 'stretch' && (
            <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ background: '#d97706', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                  DESAFÍO Y EXTENSIÓN
                </span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                  {currentActivity.stretch_json?.title || 'Nivel Desafío y Pensamiento Crítico'}
                </h4>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#b45309', marginBottom: '1rem', fontStyle: 'italic' }}>
                {currentActivity.stretch_json?.guidelines || 'Para estudiantes que terminan con rapidez o requieren profundizar en aplicaciones avanzadas.'}
              </p>

              <div>
                <strong style={{ fontSize: '0.84rem', color: '#92400e' }}>🚀 Preguntas de Desafío y Aplicación Avanzada:</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {currentActivity.stretch_json?.challenge_questions?.map((cq, i) => (
                    <div key={i} style={{ background: '#ffffff', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '0.82rem', color: '#78350f' }}>
                      <strong>Reto {i + 1}:</strong> {cq}
                    </div>
                  )) || (
                    <div style={{ background: '#ffffff', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '0.82rem', color: '#78350f' }}>
                      Diseña una propuesta de solución alternativa y fundamenta sus ventajas técnicas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 3: DIAPOSITIVAS INTERACTIVAS PARA PROYECTAR EN SALA (SLIDES)    */}
      {/* ===================================================================== */}
      {subTab === 'slides' && currentActivity && (
        <div className="no-print" style={{ maxWidth: '950px', margin: '0 auto' }}>
          {/* BARRA SUPERIOR DE CONTROL DEL PRESENTADOR */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#1e293b',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px 12px 0 0',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b' }}>
                Modo Presentación de Aula
              </span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Diapositiva {currentSlideIndex + 1} de {slides.length}
              </span>
            </div>

            {/* TEMPORIZADOR DE AULA EN VIVO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
              <Clock size={15} color="#f59e0b" />
              <span style={{ fontSize: '0.9rem', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff' }}>
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0 0.2rem' }}
                title={timerRunning ? 'Pausar' : 'Iniciar'}
              >
                {timerRunning ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                type="button"
                onClick={() => { setTimerRunning(false); setTimerSeconds(600); }}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 0.2rem' }}
                title="Reiniciar (10 min)"
              >
                <RotateCcw size={13} />
              </button>
            </div>

            {/* PANTALLA COMPLETA */}
            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#334155',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isFullscreen ? 'Salir' : 'Pantalla Completa'}
            </button>
          </div>

          {/* CONTENEDOR DE LA DIAPOSITIVA (VISOR PROYECTABLE) */}
          <div
            ref={slideContainerRef}
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              color: '#ffffff',
              minHeight: '440px',
              padding: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            {currentSlide ? (
              <>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Liceo Técnico Profesional Campanario • {currentActivity.course_name}
                    </span>
                    {currentSlide.time_estimate && (
                      <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px', color: '#c7d2fe' }}>
                        ⏱️ Tiempo sugerido: {currentSlide.time_estimate}
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
                    {currentSlide.title}
                  </h2>

                  {currentSlide.subtitle && (
                    <div style={{ fontSize: '1.05rem', color: '#93c5fd', marginBottom: '1.5rem', fontWeight: 600 }}>
                      {currentSlide.subtitle}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {currentSlide.bullets.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '1.1rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                        <span style={{ color: '#f59e0b', fontWeight: 900 }}>•</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {currentSlide.teacher_prompt && (
                  <div style={{
                    marginTop: '2rem',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    borderLeft: '4px solid #f59e0b',
                    fontSize: '0.82rem',
                    color: '#cbd5e1'
                  }}>
                    <strong>Indicación para el Docente en Proyector:</strong> {currentSlide.teacher_prompt}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem' }}>No hay diapositivas generadas para este recurso.</div>
            )}
          </div>

          {/* CONTROLES DE NAVEGACIÓN DE DIAPOSITIVAS */}
          <div style={{
            background: '#ffffff',
            borderRadius: '0 0 12px 12px',
            padding: '0.75rem 1.25rem',
            border: '1px solid #cbd5e1',
            borderTop: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              type="button"
              disabled={currentSlideIndex === 0}
              onClick={() => setCurrentSlideIndex(i => Math.max(0, i - 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: currentSlideIndex === 0 ? '#f1f5f9' : '#ffffff',
                color: currentSlideIndex === 0 ? '#94a3b8' : '#1e293b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} /> Diapositiva Anterior
            </button>

            {/* PUNTOS INDICADORES DE DIAPOSITIVA */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {slides.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  style={{
                    width: currentSlideIndex === idx ? '24px' : '10px',
                    height: '10px',
                    borderRadius: '999px',
                    background: currentSlideIndex === idx ? '#4338ca' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={currentSlideIndex === slides.length - 1}
              onClick={() => setCurrentSlideIndex(i => Math.min(slides.length - 1, i + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: currentSlideIndex === slides.length - 1 ? '#94a3b8' : '#4338ca',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: currentSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Siguiente Diapositiva <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 4: PAUTA Y SOLUCIONARIO PARA EL DOCENTE DE REEMPLAZO            */}
      {/* ===================================================================== */}
      {subTab === 'substitute_guide' && currentActivity && (
        <div id="printable-worksheet" style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          maxWidth: '900px',
          margin: '0 auto',
          color: '#0f172a'
        }}>
          <div style={{ borderBottom: '2.5px solid #0284c7', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
              LICEO TÉCNICO PROFESIONAL CAMPANARIO • UNIDAD TÉCNICA PEDAGÓGICA (UTP)
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0' }}>
              PAUTA DE AULA Y SOLUCIONARIO PARA DOCENTE DE REEMPLAZO
            </h1>
            <div style={{ fontSize: '0.84rem', color: '#475569' }}>
              Guía didáctica y soluciones oficiales para asegurar continuidad formativa sin el docente titular.
            </div>
          </div>

          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.84rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div><strong>Curso:</strong> {currentActivity.course_name}</div>
              <div><strong>Asignatura:</strong> {currentActivity.subject_name}</div>
              <div><strong>Docente Titular:</strong> {currentActivity.teacher_name}</div>
              <div><strong>Docente a Cargo:</strong> {currentActivity.substitute_teacher_name || 'Docente de reemplazo'}</div>
              <div><strong>Tiempo:</strong> {currentActivity.duration_minutes} min</div>
              <div><strong>OA:</strong> {currentActivity.oa_code}</div>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e40af', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Clock size={18} />
              Protocolo de Gestión de Aula (Minuto a Minuto):
            </h3>
            <div style={{ fontSize: '0.84rem', color: '#1e3a8a', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {currentActivity.instructions_for_substitute}
            </div>
          </div>

          <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', background: '#ffffff' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0', borderBottom: '2px solid #0f172a', paddingBottom: '0.3rem' }}>
              SOLUCIONARIO Y RESPUESTAS MODELO ESPERADAS:
            </h3>
            <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {currentActivity.answer_key}
            </div>
          </div>

          {currentActivity.rubric_criteria && (
            <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                📊 Criterios de Evaluación y Escala de Logro:
              </h3>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                {currentActivity.rubric_criteria}
              </div>
            </div>
          )}

          <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'center', fontSize: '0.78rem' }}>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '0.3rem', height: '40px' }}></div>
              <strong>Firma Docente de Reemplazo</strong>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Nombre y RUN</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '0.3rem', height: '40px' }}></div>
              <strong>Recepción UTP / Docente Titular</strong>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Fecha y V°B° de continuidad</div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 5: EDITOR DIRECTO DE CONTENIDO                                  */}
      {/* ===================================================================== */}
      {subTab === 'editor' && currentActivity && (
        <div className="no-print" style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          maxWidth: '950px',
          margin: '0 auto'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={20} color="#7c3aed" />
            Editor Personalizado del Recurso
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Título de la Guía o Recurso:
              </label>
              <input
                type="text"
                value={currentActivity.title}
                onChange={e => setCurrentActivity({ ...currentActivity, title: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Marco Teórico Conceptual / Síntesis:
              </label>
              <textarea
                rows={5}
                value={currentActivity.content_summary}
                onChange={e => setCurrentActivity({ ...currentActivity, content_summary: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Ticket de Salida:
              </label>
              <textarea
                rows={3}
                value={currentActivity.exit_ticket}
                onChange={e => setCurrentActivity({ ...currentActivity, exit_ticket: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Solucionario y Pauta de Corrección:
              </label>
              <textarea
                rows={5}
                value={currentActivity.answer_key}
                onChange={e => setCurrentActivity({ ...currentActivity, answer_key: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setSubTab('worksheet')}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: '#4338ca', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer' }}
              >
                Ver Ficha Actualizada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 6: HISTORIAL Y BIBLIOTECA INSTITUCIONAL                         */}
      {/* ===================================================================== */}
      {subTab === 'history' && (
        <div className="no-print" style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.2rem 0' }}>
                Biblioteca Institucional de Recursos Pedagógicos Chalkie
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Historial completo de guías, diapositivas y pautas creadas con IA para continuidad de clases en el Liceo.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Buscar por curso, docente u OA..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '240px' }}
                />
              </div>

              <select
                value={historyCourseFilter}
                onChange={e => setHistoryCourseFilter(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="all">Todos los Cursos</option>
                {coursesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <button
                type="button"
                onClick={loadHistory}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer' }}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
              Cargando biblioteca institucional...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', border: '1.5px dashed #cbd5e1', borderRadius: '12px' }}>
              <BookmarkCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: 700, margin: '0 0 0.3rem 0' }}>No hay recursos guardados aún.</p>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Crea una nueva clase con IA usando el botón superior.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {filteredHistory.map((act) => {
                const actsParsed = Array.isArray(act.activities_json) 
                  ? act.activities_json 
                  : (typeof act.activities_json === 'string' ? JSON.parse(act.activities_json || '[]') : []);
                const safeAct = { ...act, activities_json: actsParsed };

                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setCurrentActivity(safeAct);
                      setSubTab('worksheet');
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1rem',
                      background: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                        {act.course_name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {act.created_at ? new Date(act.created_at).toLocaleDateString('es-CL') : ''}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0', lineHeight: 1.3 }}>
                      {act.title}
                    </h4>

                    <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '0.6rem' }}>
                      <strong>Asignatura:</strong> {act.subject_name} | <strong>Docente:</strong> {act.teacher_name}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '6px', marginBottom: '0.75rem' }}>
                      🎯 <strong>{act.oa_code}</strong> — {act.unit_name}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Eye size={14} /> Abrir Clase
                      </span>
                      <button
                        type="button"
                        onClick={(e) => act.id && handleDeleteActivity(act.id, e)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                        title="Eliminar de biblioteca"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PedagogicalContinuityModule;
