import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Sparkles,
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Save,
  Printer,
  Search,
  CheckCircle2,
  Layers,
  Brain,
  Sliders,
  FileText,
  Clock,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';

interface LearningGoal {
  id: string;
  grade_level: string;
  subject: string;
  oa_code: string;
  oa_title: string;
  description: string;
  axis: string;
  is_prioritized: boolean;
}

interface AnnualUnit {
  id?: string;
  unit_number: number;
  unit_name: string;
  learning_goals: string;
  evaluation_instruments: string;
  temporality: string;
}

interface AnnualPlan {
  id: string;
  academic_year: number;
  semester: string;
  course_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_email?: string;
  total_hours: number;
  description?: string;
  status: string;
  units?: AnnualUnit[];
  created_at?: string;
}

interface LessonPlan {
  id?: string;
  annual_plan_id?: string;
  unit_id?: string;
  course_name: string;
  subject_name: string;
  teacher_name: string;
  class_number: number;
  class_date?: string;
  class_goal: string;
  moment_start: string;
  moment_development: string;
  moment_closing: string;
  pedagogical_resources: string;
  evaluation_indicators: string;
  dua_accommodations: string;
  homework?: string;
  reflection_notes?: string;
}

interface TeacherAiMemory {
  preferred_style: string;
  concise_mode: boolean;
  include_dua: boolean;
  focus_areas: string;
  total_interactions?: number;
}

interface CurriculumPlansModuleProps {
  token: string;
  user: any;
}

export const CurriculumPlansModule: React.FC<CurriculumPlansModuleProps> = ({ token, user }) => {
  const [activeTab, setActiveTab] = useState<'annual' | 'lessons' | 'catalog' | 'ai_config'>('annual');

  // Listas institucionales
  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);

  // Estado de Planificación Anual
  const [annualPlans, setAnnualPlans] = useState<AnnualPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AnnualPlan | null>(null);
  const [isEditingAnnual, setIsEditingAnnual] = useState(false);
  const [loadingAnnual, setLoadingAnnual] = useState(false);
  const [savingAnnual, setSavingAnnual] = useState(false);

  // Formulario de Plan Anual
  const [annualForm, setAnnualForm] = useState<{
    academic_year: number;
    semester: string;
    course_name: string;
    subject_name: string;
    teacher_name: string;
    total_hours: number;
    status: string;
    units: AnnualUnit[];
  }>({
    academic_year: 2026,
    semester: 'PRIMER Y SEGUNDO SEMESTRE',
    course_name: '4° Medio Técnico Niños (Atención de Párvulos) A',
    subject_name: 'Matemática',
    teacher_name: user?.name || 'Josué Alveal Gajardo',
    total_hours: 4,
    status: 'Oficial / Aprobada',
    units: []
  });

  // Estado de Planificación Clase a Clase
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [selectedLessonPlanFilter, setSelectedLessonPlanFilter] = useState<string>('');
  const [selectedLessonUnitFilter, setSelectedLessonUnitFilter] = useState<string>('');

  // Formulario Clase a Clase
  const [lessonForm, setLessonForm] = useState<LessonPlan>({
    class_number: 1,
    class_date: new Date().toISOString().split('T')[0],
    course_name: '',
    subject_name: '',
    teacher_name: user?.name || '',
    class_goal: '',
    moment_start: '',
    moment_development: '',
    moment_closing: '',
    pedagogical_resources: '',
    evaluation_indicators: '',
    dua_accommodations: ''
  });

  // Catálogo de Objetivos MINEDUC
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGradeFilter, setCatalogGradeFilter] = useState('');
  const [catalogSubjectFilter, setCatalogSubjectFilter] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [showOaPickerModal, setShowOaPickerModal] = useState(false);
  const [targetUnitIndexForOa, setTargetUnitIndexForOa] = useState<number | null>(null);

  // Asistente IA y Memoria
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiMemory, setAiMemory] = useState<TeacherAiMemory>({
    preferred_style: 'Equilibrado y Práctico',
    concise_mode: true,
    include_dua: true,
    focus_areas: 'Actividades dinámicas y aplicación contextualizada al LTP'
  });
  const [savingAiMemory, setSavingAiMemory] = useState(false);

  // ===========================================================================
  // CARGA INICIAL DE DATOS
  // ===========================================================================
  useEffect(() => {
    loadCoursesAndSubjects();
    loadAnnualPlans();
    loadLearningGoals();
    loadAiPreferences();
  }, []);

  const loadCoursesAndSubjects = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [cRes, sRes] = await Promise.all([
        fetch('/api/courses', { headers }).catch(() => null),
        fetch('/api/subjects', { headers }).catch(() => null)
      ]);

      if (cRes && cRes.ok) {
        const cData = await cRes.json();
        const list = (Array.isArray(cData) ? cData : cData?.courses || []).map((c: any) => c.name || c).filter(Boolean);
        setCoursesList(list);
      }
      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        const list = (Array.isArray(sData) ? sData : sData?.subjects || []).map((s: any) => s.name || s).filter(Boolean);
        setSubjectsList(list);
      }
    } catch (err) {
      console.warn('Error cargando cursos y asignaturas:', err);
    }
  };

  const loadAnnualPlans = async () => {
    setLoadingAnnual(true);
    try {
      const res = await fetch('/api/curriculum/annual-plans?academic_year=2026', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnnualPlans(data.plans || []);
        if (data.plans && data.plans.length > 0 && !selectedPlan) {
          selectAnnualPlan(data.plans[0]);
        }
      }
    } catch (err) {
      console.error('Error cargando planes anuales:', err);
    } finally {
      setLoadingAnnual(false);
    }
  };

  const loadLearningGoals = async (grade = '', subj = '', search = '') => {
    setLoadingCatalog(true);
    try {
      const params = new URLSearchParams();
      if (grade) params.append('grade_level', grade);
      if (subj) params.append('subject', subj);
      if (search) params.append('search', search);

      const res = await fetch(`/api/curriculum/learning-goals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLearningGoals(data.learningGoals || []);
      }
    } catch (err) {
      console.error('Error cargando catálogo OA:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const loadAiPreferences = async () => {
    try {
      const res = await fetch('/api/curriculum/ai-preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          setAiMemory(data.preferences);
        }
      }
    } catch (err) {
      console.warn('Error cargando preferencias de IA:', err);
    }
  };

  const selectAnnualPlan = (plan: AnnualPlan) => {
    setSelectedPlan(plan);
    setAnnualForm({
      academic_year: plan.academic_year || 2026,
      semester: plan.semester || 'PRIMER Y SEGUNDO SEMESTRE',
      course_name: plan.course_name,
      subject_name: plan.subject_name,
      teacher_name: plan.teacher_name,
      total_hours: plan.total_hours || 4,
      status: plan.status || 'Borrador',
      units: plan.units ? JSON.parse(JSON.stringify(plan.units)) : []
    });
    setIsEditingAnnual(false);

    // Cargar clases de este plan
    loadLessonsForPlan(plan.id);
  };

  const loadLessonsForPlan = async (planId: string) => {
    setLoadingLessons(true);
    try {
      const res = await fetch(`/api/curriculum/lesson-plans?annual_plan_id=${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLessonPlans(data.lessonPlans || []);
      }
    } catch (err) {
      console.error('Error cargando clases del plan:', err);
    } finally {
      setLoadingLessons(false);
    }
  };

  // ===========================================================================
  // ACCIONES DE PLANIFICACIÓN ANUAL
  // ===========================================================================
  const handleCreateNewAnnual = () => {
    setSelectedPlan(null);
    setAnnualForm({
      academic_year: 2026,
      semester: 'PRIMER Y SEGUNDO SEMESTRE',
      course_name: coursesList[0] || '1° Medio A',
      subject_name: subjectsList[0] || 'Matemática',
      teacher_name: user?.name || '',
      total_hours: 4,
      status: 'Borrador',
      units: [
        {
          unit_number: 1,
          unit_name: 'Unidad 1: Nivelación y Diagnóstico Inicial',
          learning_goals: 'OA1: Fundamentar decisiones...',
          evaluation_instruments: 'Diagnóstico inicial; Evaluación formativa continua; Prueba escrita',
          temporality: '8 Semanas'
        }
      ]
    });
    setIsEditingAnnual(true);
  };

  const handleAddUnitRow = () => {
    const nextNum = annualForm.units.length + 1;
    setAnnualForm(prev => ({
      ...prev,
      units: [
        ...prev.units,
        {
          unit_number: nextNum,
          unit_name: `Unidad ${nextNum}: Nueva Unidad Temática`,
          learning_goals: '',
          evaluation_instruments: 'Diagnóstico formativo; Guía de resolución; Prueba sumativa',
          temporality: '8 Semanas'
        }
      ]
    }));
  };

  const handleRemoveUnitRow = (index: number) => {
    setAnnualForm(prev => ({
      ...prev,
      units: prev.units.filter((_, i) => i !== index)
    }));
  };

  const handleUnitChange = (index: number, field: keyof AnnualUnit, value: any) => {
    setAnnualForm(prev => {
      const updated = [...prev.units];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, units: updated };
    });
  };

  const handleSaveAnnualPlan = async () => {
    if (!annualForm.course_name || !annualForm.subject_name || !annualForm.teacher_name) {
      Swal.fire('Campos requeridos', 'Por favor ingresa Curso, Asignatura y Nombre del Docente.', 'warning');
      return;
    }

    setSavingAnnual(true);
    try {
      const isUpdate = Boolean(selectedPlan && selectedPlan.id);
      const url = isUpdate ? `/api/curriculum/annual-plans/${selectedPlan?.id}` : '/api/curriculum/annual-plans';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(annualForm)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Planificación Anual Guardada',
          text: 'La planificación anual y su matriz de unidades quedaron sincronizadas con la base de datos.',
          timer: 2000,
          showConfirmButton: false
        });
        setIsEditingAnnual(false);
        await loadAnnualPlans();
      } else {
        Swal.fire('Error al guardar', data.error || 'Ocurrió un error inesperado.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Error de conexión con el servidor.', 'error');
    } finally {
      setSavingAnnual(false);
    }
  };

  const handleDeleteAnnualPlan = async (id: string) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar Planificación Anual?',
      text: 'Esta acción eliminará la planificación anual y todas sus unidades asociadas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/curriculum/annual-plans/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          Swal.fire('Eliminado', 'La planificación anual fue eliminada.', 'success');
          setSelectedPlan(null);
          await loadAnnualPlans();
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la planificación.', 'error');
      }
    }
  };

  // ===========================================================================
  // INTELIGENCIA ARTIFICIAL: PROPUESTAS DIDÁCTICAS Y APRENDIZAJE
  // ===========================================================================
  const handleGenerateAiUnits = async () => {
    setGeneratingAi(true);
    try {
      const res = await fetch('/api/curriculum/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: 'suggest_annual_units',
          grade_level: annualForm.course_name,
          subject: annualForm.subject_name,
          oa_code: 'OA General del Nivel',
          oa_title: `Distribución anual MINEDUC para ${annualForm.subject_name}`
        })
      });

      const data = await res.json();
      if (res.ok && data.data && Array.isArray(data.data.units)) {
        setAnnualForm(prev => ({
          ...prev,
          units: data.data.units
        }));
        setIsEditingAnnual(true);
        Swal.fire({
          icon: 'success',
          title: 'Unidades Sugeridas por IA',
          html: `La IA ha estructurado <strong>${data.data.units.length} unidades</strong> para ${annualForm.subject_name} considerando tiempos e instrumentos de evaluación idóneos.`,
          timer: 2500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire('Error IA', 'No se pudieron generar unidades automáticas.', 'error');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleGenerateAiLesson = async () => {
    if (!lessonForm.class_goal && !lessonForm.subject_name) {
      Swal.fire('Atención', 'Selecciona una asignatura o escribe una idea de objetivo para que la IA genere la clase.', 'info');
      return;
    }

    setGeneratingAi(true);
    try {
      const res = await fetch('/api/curriculum/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: 'suggest_class_activities',
          grade_level: lessonForm.course_name || annualForm.course_name,
          subject: lessonForm.subject_name || annualForm.subject_name,
          oa_code: 'OA de la Clase',
          oa_title: lessonForm.class_goal,
          class_duration_mins: 90
        })
      });

      const data = await res.json();
      if (res.ok && data.data) {
        const ai = data.data;
        setLessonForm(prev => ({
          ...prev,
          class_goal: ai.class_goal || prev.class_goal,
          moment_start: ai.moment_start || prev.moment_start,
          moment_development: ai.moment_development || prev.moment_development,
          moment_closing: ai.moment_closing || prev.moment_closing,
          pedagogical_resources: ai.pedagogical_resources || prev.pedagogical_resources,
          evaluation_indicators: ai.evaluation_indicators || prev.evaluation_indicators,
          dua_accommodations: ai.dua_accommodations || prev.dua_accommodations
        }));

        Swal.fire({
          icon: 'success',
          title: 'Clase Generada con IA',
          text: 'Se han estructurado los 3 momentos pedagógicos (Inicio, Desarrollo, Cierre), Recursos, Indicadores y DUA.',
          timer: 2200,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire('Error IA', 'No se pudo generar la propuesta de clase.', 'error');
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveAiPreferences = async () => {
    setSavingAiMemory(true);
    try {
      const res = await fetch('/api/curriculum/ai-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(aiMemory)
      });
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Preferencias de IA Guardadas',
          text: 'La IA adaptará sus sugerencias a tu estilo pedagógico institucional.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudieron guardar las preferencias de IA.', 'error');
    } finally {
      setSavingAiMemory(false);
    }
  };

  // ===========================================================================
  // SELECTOR RÁPIDO DE OA MINEDUC
  // ===========================================================================
  const openOaPicker = (unitIndex: number) => {
    setTargetUnitIndexForOa(unitIndex);
    setShowOaPickerModal(true);
    loadLearningGoals(annualForm.course_name, annualForm.subject_name);
  };

  const handleApplyOaToUnit = (oa: LearningGoal) => {
    if (targetUnitIndexForOa !== null) {
      const current = annualForm.units[targetUnitIndexForOa]?.learning_goals || '';
      const formatted = `${oa.oa_code}: ${oa.oa_title}`;
      const newGoals = current ? `${current}\n\n${formatted}` : formatted;
      handleUnitChange(targetUnitIndexForOa, 'learning_goals', newGoals);
      setShowOaPickerModal(false);
      setTargetUnitIndexForOa(null);
      Swal.fire({
        icon: 'success',
        title: 'Objetivo de Aprendizaje Agregado',
        text: `Se agregó ${oa.oa_code} a la unidad.`,
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  // ===========================================================================
  // GUARDAR CLASE CLASE A CLASE
  // ===========================================================================
  const handleSaveLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.class_goal) {
      Swal.fire('Falta Objetivo', 'Por favor redacta el objetivo de la clase.', 'warning');
      return;
    }

    setSavingLesson(true);
    try {
      const payload = {
        ...lessonForm,
        annual_plan_id: selectedPlan?.id || null,
        course_name: lessonForm.course_name || selectedPlan?.course_name || annualForm.course_name,
        subject_name: lessonForm.subject_name || selectedPlan?.subject_name || annualForm.subject_name,
        teacher_name: lessonForm.teacher_name || selectedPlan?.teacher_name || user?.name || ''
      };

      const isUpdate = Boolean(lessonForm.id);
      const url = isUpdate ? `/api/curriculum/lesson-plans/${lessonForm.id}` : '/api/curriculum/lesson-plans';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Clase Guardada Exitosamente',
          text: `La clase N° ${lessonForm.class_number} ha quedado planificada y registrada.`,
          timer: 2000,
          showConfirmButton: false
        });
        if (selectedPlan) {
          await loadLessonsForPlan(selectedPlan.id);
        }
        // Avanzar automáticamente a la siguiente clase
        setLessonForm(prev => ({
          ...prev,
          id: undefined,
          class_number: prev.class_number + 1,
          class_goal: '',
          moment_start: '',
          moment_development: '',
          moment_closing: '',
          evaluation_indicators: '',
          dua_accommodations: ''
        }));
      }
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo guardar la clase.', 'error');
    } finally {
      setSavingLesson(false);
    }
  };

  // ===========================================================================
  // IMPRESIÓN OFICIAL DEL FORMATO MINEDUC (IDÉNTICO A LA FOTO)
  // ===========================================================================
  const handlePrintAnnualReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const plan = selectedPlan || {
      academic_year: annualForm.academic_year,
      semester: annualForm.semester,
      course_name: annualForm.course_name,
      subject_name: annualForm.subject_name,
      teacher_name: annualForm.teacher_name,
      units: annualForm.units
    };

    const unitsHtml = (plan.units || []).map((u, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold; padding: 10px; border: 1px solid #000; vertical-align: top; width: 60px;">
          ${u.unit_number || idx + 1}
        </td>
        <td style="padding: 10px; border: 1px solid #000; vertical-align: top; width: 220px; font-weight: 500;">
          ${u.unit_name || ''}
        </td>
        <td style="padding: 10px; border: 1px solid #000; vertical-align: top; line-height: 1.45;">
          ${(u.learning_goals || '').replace(/\n/g, '<br>')}
        </td>
        <td style="padding: 10px; border: 1px solid #000; vertical-align: top; width: 240px; font-size: 11px; line-height: 1.4;">
          ${(u.evaluation_instruments || '').replace(/\n/g, '<br>')}
        </td>
        <td style="text-align: center; padding: 10px; border: 1px solid #000; vertical-align: top; width: 110px; font-weight: 600;">
          ${u.temporality || '8 Semanas'}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PLANIFICACIÓN ANUAL ${plan.academic_year} — ${plan.course_name}</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 12px; color: #000; margin: 0; padding: 10px; }
          h2 { text-align: center; font-size: 16px; margin: 0 0 15px 0; letter-spacing: 0.5px; text-transform: uppercase; font-weight: bold; }
          table.header-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          table.header-box td { border: 1px solid #000; padding: 7px 12px; font-size: 11px; }
          table.header-box td.label { font-weight: bold; width: 160px; text-transform: uppercase; }
          table.matrix { width: 100%; border-collapse: collapse; }
          table.matrix th { border: 1px solid #000; padding: 8px; font-size: 11px; background-color: #f2f2f2; text-transform: uppercase; font-weight: bold; text-align: left; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h2>PLANIFICACIÓN ANUAL ${plan.academic_year}</h2>
        <table class="header-box">
          <tr>
            <td class="label">SEMESTRE</td>
            <td colspan="3" style="text-transform: uppercase; font-weight: bold;">${plan.semester || 'PRIMER Y SEGUNDO SEMESTRE'}</td>
          </tr>
          <tr>
            <td class="label">ASIGNATURA</td>
            <td colspan="3" style="text-transform: uppercase; font-weight: bold;">${plan.subject_name}</td>
          </tr>
          <tr>
            <td class="label">CURSO</td>
            <td style="font-weight: bold; width: 35%;">${plan.course_name}</td>
            <td class="label" style="width: 140px;">PROFESOR</td>
            <td style="font-weight: bold;">${plan.teacher_name}</td>
          </tr>
        </table>

        <table class="matrix">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">Und. N°</th>
              <th style="width: 220px;">NOMBRE DE LA UNIDAD</th>
              <th>OBJETIVOS (n° de cada OA del programa)</th>
              <th style="width: 240px;">INST. EVALUACION</th>
              <th style="width: 110px; text-align: center;">TEMPORALIDAD<br><span style="font-size: 9px; font-weight: normal;">(N° de clases o Cant. de semanas)</span></th>
            </tr>
          </thead>
          <tbody>
            ${unitsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px;">Sin unidades registradas.</td></tr>'}
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ===========================================================================
  // RENDER PRINCIPAL
  // ===========================================================================
  return (
    <div style={{ padding: '1.25rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ENCABEZADO Y PESTAÑAS PRINCIPALES */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
          }}>
            <CalendarDays size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Planificaciones Curriculares & Asistente IA
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Planificación Anual, desglose Clase a Clase y Catálogo Oficial MINEDUC con sugerencias inteligentes
            </p>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('annual')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'annual' ? '#ffffff' : 'transparent',
              color: activeTab === 'annual' ? '#0284c7' : '#475569',
              fontWeight: activeTab === 'annual' ? 800 : 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'annual' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <CalendarDays size={16} />
            1. Planificación Anual
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lessons')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'lessons' ? '#ffffff' : 'transparent',
              color: activeTab === 'lessons' ? '#0284c7' : '#475569',
              fontWeight: activeTab === 'lessons' ? 800 : 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'lessons' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Layers size={16} />
            2. Clase a Clase
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'catalog' ? '#ffffff' : 'transparent',
              color: activeTab === 'catalog' ? '#0284c7' : '#475569',
              fontWeight: activeTab === 'catalog' ? 800 : 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'catalog' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <BookOpen size={16} />
            3. Objetivos MINEDUC (OA)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai_config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'ai_config' ? '#ffffff' : 'transparent',
              color: activeTab === 'ai_config' ? '#7c3aed' : '#475569',
              fontWeight: activeTab === 'ai_config' ? 800 : 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'ai_config' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <Sparkles size={16} color="#7c3aed" />
            Memoria & IA
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PESTAÑA 1: PLANIFICACIÓN ANUAL (FORMATO EXACTO DE LA FOTO MINEDUC)   */}
      {/* ===================================================================== */}
      {activeTab === 'annual' && (
        <div>
          {/* BARRA SUPERIOR DE ACCIONES DE PLAN ANUAL */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                Planificación Activa:
              </label>
              <select
                value={selectedPlan?.id || ''}
                onChange={e => {
                  const p = annualPlans.find(plan => plan.id === e.target.value);
                  if (p) selectAnnualPlan(p);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#1e293b'
                }}
              >
                {annualPlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.course_name} — {p.subject_name} ({p.teacher_name})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleCreateNewAnnual}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} />
                Nueva Planificación Anual
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={generatingAi}
                onClick={handleGenerateAiUnits}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: '#ffffff',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
                }}
              >
                <Sparkles size={16} />
                {generatingAi ? 'Generando con IA...' : 'Sugerir Unidades con IA'}
              </button>

              <button
                type="button"
                onClick={handlePrintAnnualReport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Printer size={16} />
                Imprimir Formato Oficial
              </button>

              {isEditingAnnual && (
                <button
                  type="button"
                  disabled={savingAnnual}
                  onClick={handleSaveAnnualPlan}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#059669',
                    color: '#ffffff',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <Save size={16} />
                  {savingAnnual ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </div>
          </div>

          {/* CONTENEDOR ESTILO DOCUMENTO OFICIAL (IDÉNTICO A LA FOTO) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '2px solid #000000',
            padding: '1.5rem',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              textAlign: 'center',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 1.25rem'
            }}>
              PLANIFICACIÓN ANUAL {annualForm.academic_year}
            </h3>

            {/* TABLA DE ENCABEZADO INSTITUCIONAL */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '2px solid #000000',
              marginBottom: '1.5rem'
            }}>
              <tbody>
                <tr>
                  <td style={{
                    width: '180px',
                    border: '1px solid #000000',
                    padding: '0.65rem 0.85rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    textTransform: 'uppercase'
                  }}>
                    SEMESTRE
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', padding: '0.45rem 0.75rem' }}>
                    {isEditingAnnual ? (
                      <select
                        value={annualForm.semester}
                        onChange={e => setAnnualForm({ ...annualForm, semester: e.target.value })}
                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #94a3b8', borderRadius: '6px', fontWeight: 700 }}
                      >
                        <option value="PRIMER Y SEGUNDO SEMESTRE">PRIMER Y SEGUNDO SEMESTRE (ANUAL)</option>
                        <option value="PRIMER SEMESTRE">PRIMER SEMESTRE</option>
                        <option value="SEGUNDO SEMESTRE">SEGUNDO SEMESTRE</option>
                      </select>
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{annualForm.semester}</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td style={{
                    border: '1px solid #000000',
                    padding: '0.65rem 0.85rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    textTransform: 'uppercase'
                  }}>
                    ASIGNATURA
                  </td>
                  <td colSpan={3} style={{ border: '1px solid #000000', padding: '0.45rem 0.75rem' }}>
                    {isEditingAnnual ? (
                      <input
                        type="text"
                        value={annualForm.subject_name}
                        onChange={e => setAnnualForm({ ...annualForm, subject_name: e.target.value })}
                        placeholder="Ej: Matemática, Lenguaje, Mecánica Industrial..."
                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #94a3b8', borderRadius: '6px', fontWeight: 800 }}
                      />
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', textTransform: 'uppercase' }}>{annualForm.subject_name}</span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td style={{
                    border: '1px solid #000000',
                    padding: '0.65rem 0.85rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    textTransform: 'uppercase'
                  }}>
                    CURSO
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '0.45rem 0.75rem', width: '35%' }}>
                    {isEditingAnnual ? (
                      <select
                        value={annualForm.course_name}
                        onChange={e => setAnnualForm({ ...annualForm, course_name: e.target.value })}
                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #94a3b8', borderRadius: '6px', fontWeight: 700 }}
                      >
                        {coursesList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{annualForm.course_name}</span>
                    )}
                  </td>

                  <td style={{
                    border: '1px solid #000000',
                    padding: '0.65rem 0.85rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    background: '#f8fafc',
                    width: '140px',
                    textTransform: 'uppercase'
                  }}>
                    PROFESOR
                  </td>
                  <td style={{ border: '1px solid #000000', padding: '0.45rem 0.75rem' }}>
                    {isEditingAnnual ? (
                      <input
                        type="text"
                        value={annualForm.teacher_name}
                        onChange={e => setAnnualForm({ ...annualForm, teacher_name: e.target.value })}
                        placeholder="Nombre completo del docente"
                        style={{ width: '100%', padding: '0.4rem', border: '1px solid #94a3b8', borderRadius: '6px', fontWeight: 700 }}
                      />
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{annualForm.teacher_name}</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TABLA DE MATRIZ DE UNIDADES (IDÉNTICA A LA IMAGEN) */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '2px solid #000000'
              }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #000000', padding: '0.65rem', width: '70px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 900 }}>
                      Und. N°
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '0.65rem', width: '240px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 900 }}>
                      NOMBRE DE LA UNIDAD
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '0.65rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 900 }}>
                      OBJETIVOS (n° de cada OA del programa)
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '0.65rem', width: '260px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 900 }}>
                      INST. EVALUACION
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '0.65rem', width: '140px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 900 }}>
                      TEMPORALIDAD<br />
                      <span style={{ fontSize: '0.68rem', fontWeight: 500 }}>(N° clases / semanas)</span>
                    </th>
                    {isEditingAnnual && (
                      <th style={{ border: '1px solid #000000', padding: '0.65rem', width: '50px', textAlign: 'center' }}>
                        Acción
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {annualForm.units.map((unit, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      {/* Und N° */}
                      <td style={{ border: '1px solid #000000', padding: '0.65rem', textAlign: 'center', verticalAlign: 'top', fontWeight: 800, fontSize: '0.9rem' }}>
                        {isEditingAnnual ? (
                          <input
                            type="number"
                            value={unit.unit_number}
                            onChange={e => handleUnitChange(idx, 'unit_number', parseInt(e.target.value, 10))}
                            style={{ width: '45px', textAlign: 'center', padding: '0.25rem', fontWeight: 800, border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        ) : (
                          unit.unit_number
                        )}
                      </td>

                      {/* Nombre de la Unidad */}
                      <td style={{ border: '1px solid #000000', padding: '0.65rem', verticalAlign: 'top', fontWeight: 600, fontSize: '0.84rem' }}>
                        {isEditingAnnual ? (
                          <textarea
                            rows={3}
                            value={unit.unit_name}
                            onChange={e => handleUnitChange(idx, 'unit_name', e.target.value)}
                            placeholder="Nombre temático de la unidad..."
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', resize: 'vertical' }}
                          />
                        ) : (
                          <span>{unit.unit_name}</span>
                        )}
                      </td>

                      {/* Objetivos (n° de cada OA) */}
                      <td style={{ border: '1px solid #000000', padding: '0.65rem', verticalAlign: 'top', fontSize: '0.82rem', lineHeight: 1.45 }}>
                        {isEditingAnnual ? (
                          <div>
                            <textarea
                              rows={4}
                              value={unit.learning_goals}
                              onChange={e => handleUnitChange(idx, 'learning_goals', e.target.value)}
                              placeholder="OA1: Descripción del objetivo..."
                              style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', resize: 'vertical' }}
                            />
                            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => openOaPicker(idx)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  border: '1px solid #bae6fd',
                                  borderRadius: '6px',
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <Search size={12} />
                                + Insertar OA Oficial MINEDUC
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{unit.learning_goals}</div>
                        )}
                      </td>

                      {/* Instrumentos de Evaluación */}
                      <td style={{ border: '1px solid #000000', padding: '0.65rem', verticalAlign: 'top', fontSize: '0.78rem', lineHeight: 1.4 }}>
                        {isEditingAnnual ? (
                          <textarea
                            rows={3}
                            value={unit.evaluation_instruments}
                            onChange={e => handleUnitChange(idx, 'evaluation_instruments', e.target.value)}
                            placeholder="Diagnóstico inicial; Evaluación formativa... Prueba escrita..."
                            style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', resize: 'vertical' }}
                          />
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{unit.evaluation_instruments}</div>
                        )}
                      </td>

                      {/* Temporalidad */}
                      <td style={{ border: '1px solid #000000', padding: '0.65rem', verticalAlign: 'top', textAlign: 'center', fontWeight: 700, fontSize: '0.84rem' }}>
                        {isEditingAnnual ? (
                          <input
                            type="text"
                            value={unit.temporality}
                            onChange={e => handleUnitChange(idx, 'temporality', e.target.value)}
                            placeholder="Ej: 8 Semanas"
                            style={{ width: '90px', padding: '0.35rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700 }}
                          />
                        ) : (
                          <span>{unit.temporality || '8 Semanas'}</span>
                        )}
                      </td>

                      {/* Acción Eliminar Fila */}
                      {isEditingAnnual && (
                        <td style={{ border: '1px solid #000000', padding: '0.65rem', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveUnitRow(idx)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '0.35rem', cursor: 'pointer' }}
                            title="Eliminar fila"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {annualForm.units.length === 0 && (
                    <tr>
                      <td colSpan={isEditingAnnual ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No hay unidades agregadas. Haz clic en "Modificar / Editar Plan" o "Sugerir con IA" para comenzar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* BOTONES INFERIORES DE LA TABLA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem', alignItems: 'center' }}>
              <div>
                {!isEditingAnnual ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingAnnual(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: '#334155',
                      color: '#ffffff',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={15} />
                    Editar / Modificar Plan Anual
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddUnitRow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: '#0284c7',
                      color: '#ffffff',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} />
                    + Agregar Fila de Unidad
                  </button>
                )}
              </div>

              {isEditingAnnual && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAnnual(false);
                      if (selectedPlan) selectAnnualPlan(selectedPlan);
                    }}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={savingAnnual}
                    onClick={handleSaveAnnualPlan}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: '#059669',
                      color: '#ffffff',
                      padding: '0.55rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Save size={16} />
                    {savingAnnual ? 'Guardando...' : 'Guardar Plan Anual'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 2: PLANIFICACIÓN CLASE A CLASE (ESTÁNDAR MINEDUC INICIO/DES/CIERRE) */}
      {/* ===================================================================== */}
      {activeTab === 'lessons' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* PANEL IZQUIERDO: LISTA DE CLASES DEL PLAN */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Clases Planificadas
              </h4>
              <button
                type="button"
                onClick={() => {
                  setLessonForm({
                    class_number: lessonPlans.length + 1,
                    class_date: new Date().toISOString().split('T')[0],
                    course_name: selectedPlan?.course_name || '',
                    subject_name: selectedPlan?.subject_name || '',
                    teacher_name: selectedPlan?.teacher_name || user?.name || '',
                    class_goal: '',
                    moment_start: '',
                    moment_development: '',
                    moment_closing: '',
                    pedagogical_resources: '',
                    evaluation_indicators: '',
                    dua_accommodations: ''
                  });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                + Nueva Clase
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem' }}>
                Plan Anual Asociado:
              </label>
              <select
                value={selectedPlan?.id || ''}
                onChange={e => {
                  const p = annualPlans.find(plan => plan.id === e.target.value);
                  if (p) selectAnnualPlan(p);
                }}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}
              >
                {annualPlans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.course_name} — {p.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '560px', overflowY: 'auto' }}>
              {lessonPlans.map((lesson, idx) => {
                const isSelected = lessonForm.class_number === lesson.class_number;
                return (
                  <div
                    key={lesson.id || idx}
                    onClick={() => setLessonForm(lesson)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{
                        background: isSelected ? '#0284c7' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#334155',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 900
                      }}>
                        Clase N° {lesson.class_number}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {lesson.class_date ? new Date(lesson.class_date).toLocaleDateString('es-CL') : 'Sin fecha'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {lesson.class_goal || 'Sin objetivo redactado aún'}
                    </p>
                  </div>
                );
              })}

              {lessonPlans.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                  Aún no hay clases registradas para este plan. Haz clic en "+ Nueva Clase" o genera con IA.
                </div>
              )}
            </div>
          </div>

          {/* PANEL DERECHO: EDITOR ESTRUCTURADO CLASE A CLASE */}
          <form onSubmit={handleSaveLessonPlan} style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                  Ficha de Planificación: Clase N° {lessonForm.class_number}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedPlan ? `${selectedPlan.course_name} • ${selectedPlan.subject_name}` : 'Estándar Marco Buena Enseñanza MINEDUC'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={generatingAi}
                  onClick={handleGenerateAiLesson}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                    color: '#ffffff',
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
                  }}
                >
                  <Sparkles size={15} />
                  {generatingAi ? 'Generando...' : 'Generar Clase con IA'}
                </button>

                <button
                  type="submit"
                  disabled={savingLesson}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#059669',
                    color: '#ffffff',
                    padding: '0.5rem 1.15rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  <Save size={15} />
                  {savingLesson ? 'Guardando...' : 'Guardar Clase'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  N° de Clase:
                </label>
                <input
                  type="number"
                  required
                  value={lessonForm.class_number}
                  onChange={e => setLessonForm({ ...lessonForm, class_number: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Fecha Estimada de la Clase:
                </label>
                <input
                  type="date"
                  value={lessonForm.class_date || ''}
                  onChange={e => setLessonForm({ ...lessonForm, class_date: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>
            </div>

            {/* OBJETIVO DE LA CLASE */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                🎯 Objetivo de Aprendizaje Específico de la Clase: *
              </label>
              <textarea
                rows={2}
                required
                value={lessonForm.class_goal}
                onChange={e => setLessonForm({ ...lessonForm, class_goal: e.target.value })}
                placeholder="Ej: Analizar y calcular tasas de interés simple en situaciones financieras cotidianas a partir de modelos matemáticos..."
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #94a3b8', fontSize: '0.84rem', fontWeight: 600, lineHeight: 1.4 }}
              />
            </div>

            {/* ESTRUCTURA PEDAGÓGICA DE LOS 3 MOMENTOS (MINEDUC) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Estructura de la Clase (Estándar de los 3 Momentos)
              </h4>

              {/* 1. INICIO */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.3rem' }}>
                  🟡 1. Inicio de la Clase (Aprox. 15 minutos):
                </label>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.35rem' }}>
                  Activación de conocimientos previos, desafío motivacional inicial y presentación del objetivo.
                </span>
                <textarea
                  rows={3}
                  value={lessonForm.moment_start}
                  onChange={e => setLessonForm({ ...lessonForm, moment_start: e.target.value })}
                  placeholder="1. Saludo y presentación de objetivo en pizarra... 2. Preguntas de activación previa... 3. Pregunta detonante..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              {/* 2. DESARROLLO */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.3rem' }}>
                  🔵 2. Desarrollo de la Clase (Aprox. 60 minutos):
                </label>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.35rem' }}>
                  Modelamiento docente, actividad práctica guiada / colaborativa y retroalimentación formativa.
                </span>
                <textarea
                  rows={4}
                  value={lessonForm.moment_development}
                  onChange={e => setLessonForm({ ...lessonForm, moment_development: e.target.value })}
                  placeholder="1. Explicación conceptual paso a paso... 2. Trabajo en parejas resolviendo guía práctica... 3. Monitoreo docente en aula..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              {/* 3. CIERRE */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.3rem' }}>
                  🟢 3. Cierre de la Clase (Aprox. 15 minutos):
                </label>
                <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.35rem' }}>
                  Síntesis de ideas clave, metacognición y Ticket de Salida de comprobación rápida.
                </span>
                <textarea
                  rows={3}
                  value={lessonForm.moment_closing}
                  onChange={e => setLessonForm({ ...lessonForm, moment_closing: e.target.value })}
                  placeholder="1. Síntesis grupal... 2. Metacognición: ¿Qué aprendimos hoy y qué nos costó más?... 3. Ticket de salida de 2 min..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* RECURSOS, INDICADORES Y DUA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  📦 Recursos Pedagógicos & Materiales:
                </label>
                <textarea
                  rows={2}
                  value={lessonForm.pedagogical_resources}
                  onChange={e => setLessonForm({ ...lessonForm, pedagogical_resources: e.target.value })}
                  placeholder="Guía impresa, calculadora, proyector multimedia, pizarra, herramientas de taller..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  📊 Indicadores de Logro / Evaluación:
                </label>
                <textarea
                  rows={2}
                  value={lessonForm.evaluation_indicators}
                  onChange={e => setLessonForm({ ...lessonForm, evaluation_indicators: e.target.value })}
                  placeholder="Identifica el concepto... Resuelve problemas con precisión... Justifica procedimientos..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#047857', marginBottom: '0.3rem' }}>
                  🤝 Adecuaciones Inclusivas DUA / Programa PIE:
                </label>
                <textarea
                  rows={2}
                  value={lessonForm.dua_accommodations}
                  onChange={e => setLessonForm({ ...lessonForm, dua_accommodations: e.target.value })}
                  placeholder="Uso de esquemas visuales, apoyo mutuo entre pares, supervisión diferenciada por profesional de co-docencia..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#f0fdf4', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 3: CATÁLOGO OFICIAL DE OBJETIVOS MINEDUC (CHILE)              */}
      {/* ===================================================================== */}
      {activeTab === 'catalog' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Catálogo Oficial de Objetivos de Aprendizaje (OA) MINEDUC
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Bases Curriculares vigentes de Chile para Educación Básica, Media y Especialidades Técnico-Profesionales
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Buscar por palabra clave (ej: financiero, probabilidad, CNC, párvulo)..."
                value={catalogSearch}
                onChange={e => {
                  setCatalogSearch(e.target.value);
                  loadLearningGoals(catalogGradeFilter, catalogSubjectFilter, e.target.value);
                }}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  width: '280px'
                }}
              />

              <select
                value={catalogSubjectFilter}
                onChange={e => {
                  setCatalogSubjectFilter(e.target.value);
                  loadLearningGoals(catalogGradeFilter, e.target.value, catalogSearch);
                }}
                style={{ padding: '0.55rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="">Todas las asignaturas</option>
                <option value="Matemática">Matemática</option>
                <option value="Lengua">Lengua y Literatura</option>
                <option value="Ciencias">Ciencias Naturales</option>
                <option value="Historia">Historia / Ciudadanía</option>
                <option value="Párvulo">Atención de Párvulo (TP)</option>
                <option value="Mecánica">Mecánica Industrial (TP)</option>
              </select>
            </div>
          </div>

          {/* LISTADO DE TARJETAS DE OA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
            {learningGoals.map(oa => (
              <div
                key={oa.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 800
                    }}>
                      {oa.oa_code}
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569' }}>
                      {oa.grade_level} • {oa.subject}
                    </span>
                  </div>

                  <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.35 }}>
                    {oa.oa_title}
                  </h5>

                  {oa.axis && (
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.75rem' }}>
                      <strong>Eje:</strong> {oa.axis}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${oa.oa_code}: ${oa.oa_title}`);
                      Swal.fire({
                        icon: 'success',
                        title: 'OA Copiado',
                        text: 'El objetivo de aprendizaje fue copiado al portapapeles para pegarlo en tu planificación.',
                        timer: 1500,
                        showConfirmButton: false
                      });
                    }}
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Copiar OA
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 4: MEMORIA Y PREFERENCIAS DE INTELIGENCIA ARTIFICIAL         */}
      {/* ===================================================================== */}
      {activeTab === 'ai_config' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          maxWidth: '780px',
          margin: '0 auto',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed'
            }}>
              <Brain size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Memoria y Aprendizaje Pedagógico de la IA
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Configura cómo la IA debe adaptarse a tu ritmo y estilo de enseñanza en el liceo
              </p>
            </div>
          </div>

          <div style={{
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: '#6b21a8',
            lineHeight: 1.45
          }}>
            🧠 <strong>Aprendizaje Activo:</strong> La IA recuerda tus asignaturas preferidas, ajusta la extensión de las propuestas didácticas para no sobrecargarte de texto y genera sugerencias cada vez más directas y ágiles para acelerar tu labor docente.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                Estilo Pedagógico Preferido:
              </label>
              <select
                value={aiMemory.preferred_style}
                onChange={e => setAiMemory({ ...aiMemory, preferred_style: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="Equilibrado y Práctico">Equilibrado y Práctico (Recomendado para LTP)</option>
                <option value="Técnico-Profesional Aplicado a Taller">Técnico-Profesional (Enfoque en taller, máquinas y casos reales)</option>
                <option value="Lúdico y Participativo">Lúdico y Participativo (Dinámicas grupales y motivación)</option>
                <option value="Directo y Sintético">Directo y Sintético (Puntos breves, sin rodeos teóricos)</option>
                <option value="Profundización y Rigor Académico">Profundización y Rigor Académico (Preparación PAES / Superior)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                Áreas de Enfoque Institucional del Docente:
              </label>
              <textarea
                rows={3}
                value={aiMemory.focus_areas}
                onChange={e => setAiMemory({ ...aiMemory, focus_areas: e.target.value })}
                placeholder="Ej: Resolución de problemas de la vida cotidiana, trabajo en equipo, inclusión DUA y pensamiento crítico..."
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.84rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aiMemory.concise_mode}
                  onChange={e => setAiMemory({ ...aiMemory, concise_mode: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                />
                Modo Conciso: Sugerencias en viñetas directas para rellenar rápido la planificación
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.84rem', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aiMemory.include_dua}
                  onChange={e => setAiMemory({ ...aiMemory, include_dua: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
                />
                Incluir siempre sugerencias de Adecuación DUA / PIE en las clases generadas
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                disabled={savingAiMemory}
                onClick={handleSaveAiPreferences}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#7c3aed',
                  color: '#ffffff',
                  padding: '0.6rem 1.35rem',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
                }}
              >
                <Save size={16} />
                {savingAiMemory ? 'Guardando...' : 'Guardar Preferencias de Memoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL FLOTANTE: INSERTAR OA OFICIAL MINEDUC EN LA UNIDAD             */}
      {/* ===================================================================== */}
      {showOaPickerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '720px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* ENCABEZADO MODAL */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Seleccionar Objetivo de Aprendizaje MINEDUC
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Haz clic en un OA para insertarlo directamente en la unidad {targetUnitIndexForOa !== null ? targetUnitIndexForOa + 1 : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOaPickerModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* LISTA CON SCROLL */}
            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {learningGoals.map(oa => (
                <div
                  key={oa.id}
                  onClick={() => handleApplyOaToUnit(oa)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#0284c7';
                    e.currentTarget.style.background = '#f0f9ff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#ffffff';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ background: '#0284c7', color: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                      {oa.oa_code}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                      {oa.grade_level} • {oa.subject}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.35 }}>
                    {oa.oa_title}
                  </p>
                </div>
              ))}

              {learningGoals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No se encontraron OAs para este curso y asignatura.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumPlansModule;
