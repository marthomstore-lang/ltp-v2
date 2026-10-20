import React, { useState, useEffect, useMemo } from 'react';
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
  BookmarkCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import Swal from 'sweetalert2';

export interface ContinuityActivityItem {
  number: number;
  title: string;
  points: number;
  description: string;
  questions: string[];
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
  activity_type: 'guia_autonoma' | 'taller_practico' | 'reforzamiento' | 'evaluacion_formativa';
  title: string;
  pedagogical_context?: string;
  instructions_for_students: string;
  instructions_for_substitute: string;
  content_summary: string;
  activities_json: ContinuityActivityItem[];
  exit_ticket: string;
  answer_key: string;
  rubric_criteria: string;
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
  // Sub-pestaña activa dentro del módulo
  const [subTab, setSubTab] = useState<'create' | 'preview_student' | 'preview_substitute' | 'editor' | 'history'>('create');

  // Formulario de Selección y Contexto
  const [courseName, setCourseName] = useState<string>(preselectedPlan?.course_name || coursesList[0] || '');
  const [subjectName, setSubjectName] = useState<string>(preselectedPlan?.subject_name || subjectsList[0] || '');
  const [teacherName, setTeacherName] = useState<string>(preselectedPlan?.teacher_name || user?.name || '');
  const [substituteTeacherName, setSubstituteTeacherName] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [activityType, setActivityType] = useState<'guia_autonoma' | 'taller_practico' | 'reforzamiento' | 'evaluacion_formativa'>('guia_autonoma');
  const [unitName, setUnitName] = useState<string>('Unidad 1: Nivelación y Diagnóstico Inicial');
  const [oaCode, setOaCode] = useState<string>('OA 1');
  const [oaTitle, setOaTitle] = useState<string>('');
  const [lastCoveredTopics, setLastCoveredTopics] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Contexto detectado automáticamente del plan y clases
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectedContext, setDetectedContext] = useState<any>(null);

  // Estado de Generación IA
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentActivity, setCurrentActivity] = useState<ContinuityActivity | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Historial de Actividades
  const [historyList, setHistoryList] = useState<ContinuityActivity[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyCourseFilter, setHistoryCourseFilter] = useState<string>('all');

  // Si viene un preselectedPlan al montar, inicializar
  useEffect(() => {
    if (preselectedPlan) {
      if (preselectedPlan.course_name) setCourseName(preselectedPlan.course_name);
      if (preselectedPlan.subject_name) setSubjectName(preselectedPlan.subject_name);
      if (preselectedPlan.teacher_name) setTeacherName(preselectedPlan.teacher_name);
      if (preselectedPlan.substitute_teacher_name) setSubstituteTeacherName(preselectedPlan.substitute_teacher_name);
    }
  }, [preselectedPlan]);

  // Cargar historial al iniciar
  useEffect(() => {
    loadHistory();
  }, []);

  // Detectar automáticamente el contexto pedagógico cuando cambia el curso o la asignatura
  useEffect(() => {
    if (courseName && subjectName) {
      detectCurriculumContext();
    }
  }, [courseName, subjectName, teacherName]);

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

        // Auto-completar unidad y OA si están disponibles
        if (data.suggestedUnit) {
          setUnitName(data.suggestedUnit);
        }
        if (data.suggestedOa) {
          setOaCode(data.suggestedOa);
        }
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
      console.warn('Error al cargar historial de actividades de reemplazo:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Generar Material con Inteligencia Artificial
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
        substitute_teacher_name: substituteTeacherName || 'Docente de Reemplazo / Asistente de Aula',
        annual_plan_id: detectedContext?.annualPlan?.id || null,
        unit_name: unitName,
        oa_code: oaCode,
        oa_title: oaTitle || (detectedContext?.suggestedOa || 'Objetivo de Aprendizaje Priorizado'),
        duration_minutes: durationMinutes,
        activity_type: activityType,
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

      if (!res.ok) {
        throw new Error('Error en el servidor al generar material.');
      }

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
        activity_type: activityType,
        title: generated.title || `Guía de Continuidad: ${subjectName}`,
        pedagogical_context: generated.pedagogical_context || '',
        instructions_for_students: generated.instructions_for_students || '',
        instructions_for_substitute: generated.instructions_for_substitute || '',
        content_summary: generated.content_summary || '',
        activities_json: generated.activities || [],
        exit_ticket: generated.exit_ticket || '',
        answer_key: generated.answer_key || '',
        rubric_criteria: generated.rubric_criteria || '',
        status: 'generada'
      };

      setCurrentActivity(newActivity);
      setSubTab('preview_student');

      Swal.fire({
        icon: 'success',
        title: '¡Material Generado con Éxito!',
        text: `Se ha creado la guía "${newActivity.title}" conectada a la materia en curso. Puedes revisarla, editarla e imprimirla de inmediato.`,
        timer: 2600,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error al generar actividad:', err);
      Swal.fire('Error', err.message || 'No se pudo generar la actividad.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Guardar actividad en base de datos
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
        title: 'Guardada en Repositorio',
        text: 'La actividad ha sido almacenada para consulta del docente titular y UTP.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error al guardar actividad:', err);
      Swal.fire('Error', err.message || 'No se pudo guardar la actividad.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar actividad guardada
  const handleDeleteActivity = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: '¿Eliminar actividad?',
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
          Swal.fire('Eliminado', 'La actividad fue eliminada.', 'success');
          loadHistory();
          if (currentActivity?.id === id) {
            setCurrentActivity(null);
            setSubTab('create');
          }
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la actividad.', 'error');
      }
    }
  };

  // Copiar al portapapeles
  const handleCopyToClipboard = () => {
    if (!currentActivity) return;
    const textToCopy = `
LICEO TÉCNICO PROFESIONAL CAMPANARIO
GUÍA DE APRENDIZAJE Y CONTINUIDAD PEDAGÓGICA (REEMPLAZO)

TÍTULO: ${currentActivity.title}
CURSO: ${currentActivity.course_name}
ASIGNATURA: ${currentActivity.subject_name}
DOCENTE TITULAR: ${currentActivity.teacher_name}
DOCENTE DE REEMPLAZO: ${currentActivity.substitute_teacher_name || 'Docente a cargo'}
DURACIÓN: ${currentActivity.duration_minutes} minutos
OBJETIVO DE APRENDIZAJE: ${currentActivity.oa_code} - ${currentActivity.oa_title}

CONTEXTO CURRICULAR:
${currentActivity.pedagogical_context || ''}

INSTRUCCIONES PARA EL ESTUDIANTE:
${currentActivity.instructions_for_students}

SÍNTESIS CONCEPTUAL / MARCO TEÓRICO:
${currentActivity.content_summary}

ACTIVIDADES:
${currentActivity.activities_json.map(act => `
${act.title} (${act.points} pts)
${act.description}
${act.questions.map(q => `  • ${q}`).join('\n')}
`).join('\n')}

TICKET DE SALIDA:
${currentActivity.exit_ticket}

=======================================================
PAUTA PARA EL DOCENTE DE REEMPLAZO:
${currentActivity.instructions_for_substitute}

SOLUCIONARIO Y RESPUESTAS ESPERADAS:
${currentActivity.answer_key}

CRITERIOS DE EVALUACIÓN:
${currentActivity.rubric_criteria}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    Swal.fire({
      icon: 'success',
      title: '¡Copiado!',
      text: 'El contenido completo fue copiado al portapapeles para pegar en Word o Google Docs.',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Función de impresión con estilos dedicados
  const handlePrint = () => {
    window.print();
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

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* ===================================================================== */}
      {/* ESTILOS DE IMPRESIÓN OFICIAL PARA GUÍA DEL ESTUDIANTE Y SOLUCIONARIO  */}
      {/* ===================================================================== */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-worksheet, #printable-worksheet * {
            visibility: visible;
          }
          #printable-worksheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 1cm;
            font-family: 'Arial', sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>

      {/* ENCABEZADO Y TÍTULO DEL MÓDULO */}
      <div className="no-print" style={{
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
        border: '1.5px solid #fdba74',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            color: '#ffffff',
            borderRadius: '14px',
            width: '52px',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)'
          }}>
            <Sparkles size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#9a3412', margin: 0 }}>
                Generador de Actividades & Continuidad Pedagógica
              </h2>
              <span style={{
                background: '#ea580c',
                color: '#ffffff',
                padding: '0.15rem 0.6rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800
              }}>
                INTELIGENCIA ARTIFICIAL
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.86rem', color: '#7c2d12', maxWidth: '850px', lineHeight: 1.4 }}>
              Crea material didáctico, guías de trabajo autónomo y pautas para el docente de reemplazo cuando un profesor se ausente.
              Conecta automáticamente con la <strong>materia en curso</strong> y los <strong>Objetivos de Aprendizaje (OA)</strong> para garantizar continuidad curricular sin pérdida de clases.
            </p>
          </div>
        </div>

        {/* BOTÓN RÁPIDO PARA IR A CREAR O VER HISTORIAL */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setSubTab('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '10px',
              border: subTab === 'create' ? '2px solid #ea580c' : '1px solid #fed7aa',
              background: subTab === 'create' ? '#ffffff' : 'rgba(255,255,255,0.7)',
              color: '#9a3412',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={16} />
            Crear Nueva Guía
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
              border: subTab === 'history' ? '2px solid #ea580c' : '1px solid #fed7aa',
              background: subTab === 'history' ? '#ffffff' : 'rgba(255,255,255,0.7)',
              color: '#9a3412',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            <BookmarkCheck size={16} />
            Historial de Reemplazos ({historyList.length})
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VISTA 1: FORMULARIO GENERADOR Y DETECCIÓN EN VIVO                     */}
      {/* ===================================================================== */}
      {subTab === 'create' && (
        <div className="no-print">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            {/* COLUMNA 1: SELECCIÓN DE CURSO, ASIGNATURA Y DOCENTE */}
            <div style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="#ea580c" />
                1. Selección del Curso y Asignatura
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Curso / Nivel Escolar:
                  </label>
                  <select
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#1e293b'
                    }}
                  >
                    {coursesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Asignatura o Módulo TP:
                  </label>
                  <select
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#1e293b'
                    }}
                  >
                    {subjectsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
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
                      placeholder="Nombre del profesor titular"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem'
                      }}
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
                      placeholder="Ej: Juan Pérez / Docente Volante"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      Duración de la Actividad:
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}
                    >
                      <option value={45}>45 Minutos (1 Bloque)</option>
                      <option value={90}>90 Minutos (2 Bloques / 1 Sesión Estándar)</option>
                      <option value={135}>135 Minutos (3 Bloques / Taller Largo)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                      Tipo de Material:
                    </label>
                    <select
                      value={activityType}
                      onChange={e => setActivityType(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}
                    >
                      <option value="guia_autonoma">📄 Guía de Trabajo Autónomo</option>
                      <option value="taller_practico">🛠️ Taller Práctico / Problemas</option>
                      <option value="reforzamiento">📈 Reforzamiento y Nivelación</option>
                      <option value="evaluacion_formativa">📝 Control / Evaluación Formativa</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA 2: DETECCIÓN DE CONTINUIDAD CURRICULAR EN VIVO */}
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
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} color="#0284c7" />
                    2. Continuidad Curricular Detectada
                  </h3>
                  {isDetecting && (
                    <span style={{ fontSize: '0.75rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <RefreshCw size={12} className="spin" /> Analizando planificaciones...
                    </span>
                  )}
                </div>

                {detectedContext?.annualPlan ? (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    marginBottom: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#166534', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                      <CheckCircle2 size={16} />
                      Plan Anual Oficial Vinculado:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#14532d' }}>
                      Docente: <strong>{detectedContext.annualPlan.teacher_name}</strong> | Total Unidades: <strong>{detectedContext.units?.length || 0}</strong>
                    </div>
                    {detectedContext.lastLesson && (
                      <div style={{ marginTop: '0.45rem', fontSize: '0.78rem', color: '#166534', background: '#dcfce7', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                        📌 <strong>Última clase dictada:</strong> Clase #{detectedContext.lastLesson.class_number} ({detectedContext.lastLesson.class_goal || 'Sin detalle'})
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
                    fontSize: '0.78rem',
                    color: '#854d0e'
                  }}>
                    ℹ️ No se detectó un plan anual previo específico para este curso/asignatura. La IA creará la actividad basándose en las bases curriculares oficiales del MINEDUC para {courseName}.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                      Unidad de Aprendizaje:
                    </label>
                    <input
                      type="text"
                      value={unitName}
                      onChange={e => setUnitName(e.target.value)}
                      placeholder="Ej: Unidad 1: Nivelación y Diagnóstico Inicial"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                      Objetivo de Aprendizaje (OA):
                    </label>
                    <input
                      type="text"
                      value={oaCode}
                      onChange={e => setOaCode(e.target.value)}
                      placeholder="Ej: OA 1, OA 3 o código específico"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                      ¿Qué materia estaba pasando el docente? (Para dar continuidad exacta):
                    </label>
                    <textarea
                      rows={2}
                      value={lastCoveredTopics}
                      onChange={e => setLastCoveredTopics(e.target.value)}
                      placeholder="Ej: Se revisó la definición de textos narrativos; falta ejercitar la extracción de información implícita y personajes."
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* BOTÓN DE GENERACIÓN */}
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
                    background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                    color: '#ffffff',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    boxShadow: isGenerating ? 'none' : '0 4px 12px rgba(234, 88, 12, 0.35)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sparkles size={20} />
                  {isGenerating ? 'Generando Actividad Pedagógica con IA...' : 'Generar Material de Continuidad con IA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BARRA DE NAVEGACIÓN DE VISTAS (SI HAY ACTIVIDAD GENERADA O SELECCIONADA) */}
      {/* ===================================================================== */}
      {currentActivity && (
        <div className="no-print" style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '0.5rem',
          border: '1px solid #e2e8f0',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSubTab('preview_student')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'preview_student' ? '#ea580c' : '#f1f5f9',
                color: subTab === 'preview_student' ? '#ffffff' : '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <FileText size={16} />
              1. Guía del Estudiante (Para Fotocopiar)
            </button>

            <button
              type="button"
              onClick={() => setSubTab('preview_substitute')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'preview_substitute' ? '#0284c7' : '#f1f5f9',
                color: subTab === 'preview_substitute' ? '#ffffff' : '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={16} />
              2. Pauta y Solucionario Docente Reemplazante
            </button>

            <button
              type="button"
              onClick={() => setSubTab('editor')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'editor' ? '#7c3aed' : '#f1f5f9',
                color: subTab === 'editor' ? '#ffffff' : '#334155',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={16} />
              3. Editor Personalizado
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #0284c7',
                background: '#0284c7',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={16} />
              Imprimir Formato Oficial
            </button>

            <button
              type="button"
              onClick={handleCopyToClipboard}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
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
              Copiar Texto
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveActivity}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
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
              {isSaving ? 'Guardando...' : 'Guardar en Repositorio'}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 2: GUÍA IMPRIMIBLE DEL ESTUDIANTE                               */}
      {/* ===================================================================== */}
      {subTab === 'preview_student' && currentActivity && (
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
          {/* ENCABEZADO FORMAL LICEO */}
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
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7' }}>
                Unidad Técnica Pedagógica • Material de Continuidad Curricular
              </div>
            </div>

            {/* TABLA DE CALIFICACIÓN RÁPIDA */}
            <table style={{ borderCollapse: 'collapse', border: '1.5px solid #0f172a', fontSize: '0.75rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #0f172a', padding: '0.25rem 0.5rem' }}>Puntaje Ideal</th>
                  <th style={{ border: '1px solid #0f172a', padding: '0.25rem 0.5rem' }}>Puntaje Obtenido</th>
                  <th style={{ border: '1px solid #0f172a', padding: '0.25rem 0.5rem' }}>Calificación</th>
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

          {/* DATOS DEL ESTUDIANTE Y SESIÓN */}
          <div style={{
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            background: '#fafafa',
            fontSize: '0.84rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div><strong>Nombre del Estudiante:</strong> __________________________________________________</div>
              <div><strong>Curso:</strong> {currentActivity.course_name}</div>
              <div><strong>Fecha:</strong> ____ / ____ / 2026</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '0.75rem' }}>
              <div><strong>Asignatura / Módulo:</strong> {currentActivity.subject_name}</div>
              <div><strong>Docente Titular:</strong> {currentActivity.teacher_name}</div>
              <div><strong>Tiempo:</strong> {currentActivity.duration_minutes} min</div>
            </div>
          </div>

          {/* TÍTULO Y OBJETIVO DE LA GUÍA */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.35rem 0', textTransform: 'uppercase' }}>
              {currentActivity.title}
            </h2>
            <div style={{
              display: 'inline-block',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              color: '#334155'
            }}>
              <strong>Objetivo de Aprendizaje:</strong> {currentActivity.oa_code} — {currentActivity.oa_title}
            </div>
          </div>

          {/* INSTRUCCIONES PARA EL ESTUDIANTE */}
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
            <strong>INSTRUCCIONES GENERALES:</strong>
            <p style={{ margin: '0.3rem 0 0 0', whiteSpace: 'pre-line' }}>
              {currentActivity.instructions_for_students}
            </p>
          </div>

          {/* MARCO CONCEPTUAL / CONTENIDOS SINTÉTICOS */}
          {currentActivity.content_summary && (
            <div style={{
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
              background: '#f8fafc'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📖 Marco Conceptual y Síntesis de Contenidos:
              </h3>
              <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                {currentActivity.content_summary}
              </div>
            </div>
          )}

          {/* ACTIVIDADES Y PREGUNTAS */}
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
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
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
                      {/* LÍNEAS PARA ESCRIBIR RESPUESTAS */}
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
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626' }}>
                  OBLIGATORIO
                </span>
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

          {/* PIE DE PÁGINA OFICIAL */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: '#64748b'
          }}>
            <div>LTP Campanario — Excelencia Técnico Profesional y Humana</div>
            <div>Documento generado por Asistente de Continuidad Curricular IA</div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 3: PAUTA Y SOLUCIONARIO PARA EL DOCENTE DE REEMPLAZO            */}
      {/* ===================================================================== */}
      {subTab === 'preview_substitute' && currentActivity && (
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
          {/* ENCABEZADO PAUTA TÉCNICA */}
          <div style={{
            borderBottom: '2.5px solid #0284c7',
            paddingBottom: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LICEO TÉCNICO PROFESIONAL CAMPANARIO • UNIDAD TÉCNICA PEDAGÓGICA (UTP)
            </div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0' }}>
              PAUTA DE AULA Y SOLUCIONARIO PARA DOCENTE DE REEMPLAZO
            </h1>
            <div style={{ fontSize: '0.84rem', color: '#475569' }}>
              Guía de referencia para el cuidado de curso y continuidad pedagógica durante la ausencia docente.
            </div>
          </div>

          {/* FICHA TÉCNICA DEL CURSO Y COBERTURA */}
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
              <div><strong>Docente Titular Ausente:</strong> {currentActivity.teacher_name}</div>
              <div><strong>Docente de Reemplazo a Cargo:</strong> {currentActivity.substitute_teacher_name || 'Docente a cargo'}</div>
              <div><strong>Tiempo Pedagógico:</strong> {currentActivity.duration_minutes} minutos</div>
              <div><strong>Objetivo de Aprendizaje:</strong> {currentActivity.oa_code}</div>
            </div>
          </div>

          {/* INSTRUCCIONES PASO A PASO PARA EL DOCENTE DE REEMPLAZO */}
          <div style={{
            background: '#eff6ff',
            border: '1.5px solid #bfdbfe',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e40af', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Clock size={18} />
              Protocolo y Guión de Gestión de Aula (Minuto a Minuto):
            </h3>
            <div style={{ fontSize: '0.84rem', color: '#1e3a8a', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {currentActivity.instructions_for_substitute}
            </div>
          </div>

          {/* SOLUCIONARIO DETALLADO */}
          <div style={{
            border: '1.5px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            background: '#ffffff'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0', borderBottom: '2px solid #0f172a', paddingBottom: '0.3rem' }}>
              SOLUCIONARIO Y RESPUESTAS MODELO ESPERADAS:
            </h3>
            <div style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
              {currentActivity.answer_key}
            </div>
          </div>

          {/* RÚBRICA Y ESCALA DE APRECIACIÓN */}
          {currentActivity.rubric_criteria && (
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                📊 Criterios de Evaluación y Escala de Logro:
              </h3>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                {currentActivity.rubric_criteria}
              </div>
            </div>
          )}

          {/* ESPACIO PARA FIRMAS Y RECEPCIÓN EN UTP */}
          <div style={{
            marginTop: '2.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2rem',
            textAlign: 'center',
            fontSize: '0.78rem'
          }}>
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
      {/* VISTA 4: EDITOR Y PERSONALIZACIÓN                                     */}
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
            Editor Personalizado de la Actividad
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Título de la Guía:
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
                Instrucciones para el Estudiante:
              </label>
              <textarea
                rows={3}
                value={currentActivity.instructions_for_students}
                onChange={e => setCurrentActivity({ ...currentActivity, instructions_for_students: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
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
                Pauta e Instrucciones para el Docente de Reemplazo:
              </label>
              <textarea
                rows={4}
                value={currentActivity.instructions_for_substitute}
                onChange={e => setCurrentActivity({ ...currentActivity, instructions_for_substitute: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Solucionario y Respuestas Modelo:
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
                onClick={() => setSubTab('preview_student')}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Ver Guía Actualizada
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 5: HISTORIAL Y REPOSITORIO DE ACTIVIDADES DE REEMPLAZO         */}
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
                Repositorio de Actividades de Reemplazo y Continuidad
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                Registro institucional de todas las guías creadas por ausencia de docentes para seguimiento de UTP y profesores titulares.
              </p>
            </div>

            {/* BÚSQUEDA Y FILTRO */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Buscar por curso, docente u OA..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    width: '240px'
                  }}
                />
              </div>

              <select
                value={historyCourseFilter}
                onChange={e => setHistoryCourseFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem'
                }}
              >
                <option value="all">Todos los Cursos</option>
                {coursesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadHistory}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
              Cargando historial de actividades...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', border: '1.5px dashed #cbd5e1', borderRadius: '12px' }}>
              <BookmarkCheck size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ fontWeight: 700, margin: '0 0 0.3rem 0' }}>No hay actividades de reemplazo registradas aún.</p>
              <p style={{ fontSize: '0.8rem', margin: 0 }}>Crea una nueva guía con IA usando el botón superior.</p>
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
                      setSubTab('preview_student');
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
                      <span style={{
                        background: '#fed7aa',
                        color: '#9a3412',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
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
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Eye size={14} /> Ver y Usar
                      </span>
                      <button
                        type="button"
                        onClick={(e) => act.id && handleDeleteActivity(act.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          borderRadius: '4px'
                        }}
                        title="Eliminar del historial"
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
