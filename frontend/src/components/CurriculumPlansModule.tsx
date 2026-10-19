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
  X,
  Award,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Eye,
  ArrowRightLeft,
  UserPlus
} from 'lucide-react';
import Swal from 'sweetalert2';
import { SchoolSchedulesModule } from './SchoolSchedulesModule';

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
  class_count?: number;
  hours_count?: number;
  unit_goal?: string;
  transversal_goals?: string;
  resources?: string;
  evaluation_type?: string;
  estimated_date?: string;
}

interface AnnualPlan {
  id: string;
  academic_year: number;
  semester: string;
  course_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_email?: string;
  substitute_teacher_name?: string | null;
  total_hours: number;
  weekly_sessions?: number;
  description?: string;
  status: string;
  units?: AnnualUnit[];
  created_at?: string;
}

interface LessonPlan {
  id?: string;
  annual_plan_id?: string;
  unit_id?: string;
  unit_name?: string;
  course_name: string;
  subject_name: string;
  teacher_name: string;
  substitute_teacher_name?: string | null;
  class_number: number;
  class_date?: string;
  class_goal: string;
  status?: string; // 'por_realizar' | 'realizada'
  oa_codes?: string;
  ticket_salida?: string;
  moment_start: string;
  moment_development: string;
  moment_closing: string;
  pedagogical_resources: string;
  evaluation_indicators: string;
  dua_accommodations: string;
  homework?: string;
  reflection_notes?: string;
}

interface CoverageStats {
  totalOfficialOAs: number;
  coveredOAsCount: number;
  coveredOAList: string[];
  plannedClassesCount: number;
  completedClassesCount: number;
  pendingClassesCount: number;
  coveragePercentage: number;
  executionPercentage: number;
  coverageLevel: 'optima' | 'media' | 'critica';
  officialGoals: Array<LearningGoal & { isCompleted: boolean; isPlanned: boolean }>;
}

interface TeacherAiMemory {
  preferred_style: string;
  concise_mode: boolean;
  include_dua: boolean;
  focus_areas: string;
  total_interactions?: number;
}

interface TeacherAssignment {
  id: string;
  teacher_name: string;
  level_name: string;
  subject_name: string;
  academic_year?: number;
}

interface CurriculumPlansModuleProps {
  token: string;
  user: any;
}

export const CurriculumPlansModule: React.FC<CurriculumPlansModuleProps> = ({ token, user }) => {
  const [activeTab, setActiveTab] = useState<'annual' | 'units' | 'lessons' | 'catalog' | 'ai_config' | 'schedules'>('annual');

  // Modo de visualización: Editor (permite modificar y guardar) vs Solo Vista (lectura e impresión)
  const [viewMode, setViewMode] = useState<'edit' | 'readonly'>('edit');

  // Traspaso de Plan / Docente de Reemplazo (por licencia médica o cambio)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetTeacher, setTransferTargetTeacher] = useState<string>('');
  const [transferCustomTeacher, setTransferCustomTeacher] = useState<string>('');
  const [transferMode, setTransferMode] = useState<'set_substitute' | 'transfer_ownership'>('set_substitute');
  const [transferReason, setTransferReason] = useState<string>('Licencia médica del docente titular');
  const [isTransferring, setIsTransferring] = useState(false);

  // Listas institucionales y asignaciones docentes
  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [allAssignments, setAllAssignments] = useState<TeacherAssignment[]>([]);
  const [myAssignments, setMyAssignments] = useState<TeacherAssignment[]>([]);
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>(() => {
    return (user?.role === 'Admin' || user?.role === 'Director' || user?.role === 'Administrador') ? 'all' : 'my_profile';
  });

  // Estado de Planificación Anual
  const [allAnnualPlans, setAllAnnualPlans] = useState<AnnualPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<AnnualPlan | null>(null);
  const [isEditingAnnual, setIsEditingAnnual] = useState(false);
  const [loadingAnnual, setLoadingAnnual] = useState(false);
  const [savingAnnual, setSavingAnnual] = useState(false);

  // Estado de Planificación por Unidad
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const [savingUnit, setSavingUnit] = useState(false);
  const [generatingUnitAi, setGeneratingUnitAi] = useState(false);
  const [unitForm, setUnitForm] = useState<AnnualUnit>({
    unit_number: 1,
    unit_name: 'Unidad 1: Nivelación y Diagnóstico Inicial',
    learning_goals: '',
    evaluation_instruments: 'Evaluación diagnóstica inicial; Guías formativas; Rúbrica sumativa',
    temporality: '8 Semanas',
    class_count: 8,
    hours_count: 16,
    unit_goal: 'Desarrollar y nivelar conocimientos y destrezas esenciales de la asignatura.',
    transversal_goals: 'Demostrar rigor, puntualidad y trabajo colaborativo.',
    resources: 'Guías de aprendizaje, proyector multimedia, textos de estudio.',
    evaluation_type: 'Formativa y Sumativa',
    estimated_date: 'Marzo - Abril 2026'
  });

  // Formulario de Plan Anual
  const [annualForm, setAnnualForm] = useState<{
    academic_year: number;
    semester: string;
    course_name: string;
    subject_name: string;
    teacher_name: string;
    total_hours: number;
    weekly_sessions: number;
    status: string;
    units: AnnualUnit[];
  }>({
    academic_year: 2026,
    semester: 'PRIMER Y SEGUNDO SEMESTRE',
    course_name: '',
    subject_name: '',
    teacher_name: user?.name || '',
    total_hours: 4,
    weekly_sessions: 1,
    status: 'Oficial / Aprobada',
    units: []
  });

  // Estado de Planificación Clase a Clase
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  // Formulario Clase a Clase
  const [lessonForm, setLessonForm] = useState<LessonPlan>({
    class_number: 1,
    class_date: new Date().toISOString().split('T')[0],
    course_name: '',
    subject_name: '',
    teacher_name: user?.name || '',
    class_goal: '',
    status: 'por_realizar',
    oa_codes: '',
    ticket_salida: '',
    moment_start: '',
    moment_development: '',
    moment_closing: '',
    pedagogical_resources: '',
    evaluation_indicators: '',
    dua_accommodations: ''
  });

  // Cobertura Curricular
  const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  // Catálogo de Objetivos MINEDUC
  const [learningGoals, setLearningGoals] = useState<LearningGoal[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGradeFilter, setCatalogGradeFilter] = useState('');
  const [catalogSubjectFilter, setCatalogSubjectFilter] = useState('');
  const [catalogPriorityFilter, setCatalogPriorityFilter] = useState<'all' | 'prioritized' | 'standard'>('all');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [showOaPickerModal, setShowOaPickerModal] = useState(false);
  const [targetUnitIndexForOa, setTargetUnitIndexForOa] = useState<number | null>(null);
  const [modalGradeFilter, setModalGradeFilter] = useState('');
  const [modalSubjectFilter, setModalSubjectFilter] = useState('');
  const [modalPriorityFilter, setModalPriorityFilter] = useState<'all' | 'prioritized' | 'standard'>('all');

  // Asistente IA y Memoria
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiActivityIdea, setAiActivityIdea] = useState<string>('');
  const [aiMemory, setAiMemory] = useState<TeacherAiMemory>({
    preferred_style: 'Equilibrado y Práctico',
    concise_mode: true,
    include_dua: true,
    focus_areas: 'Actividades dinámicas y aplicación contextualizada al LTP'
  });
  const [savingAiMemory, setSavingAiMemory] = useState(false);

  const isAdmin = user?.role === 'Admin' || user?.role === 'Director';

  // Normalización para comparaciones de nombres y RUTs
  const normalizeStr = (str: any) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const isUserMatch = (cand: any, targetUser = user) => {
    if (!targetUser || !cand) return false;
    const c = normalizeStr(cand);
    const uName = normalizeStr(targetUser.name);
    const uRun = normalizeStr(targetUser.run).replace(/[^0-9k]/g, '');
    const cRun = c.replace(/[^0-9k]/g, '');

    if (c === uName) return true;
    if (uRun && cRun && uRun === cRun && uRun.length >= 6) return true;
    if (c.length > 5 && (uName.includes(c) || c.includes(uName))) return true;

    const cWords = c.split(/\s+/).filter(w => w.length >= 3);
    const uWords = uName.split(/\s+/).filter(w => w.length >= 3);
    if (cWords.length >= 2 && uWords.length >= 2) {
      const matchCount = cWords.filter(cw => uWords.includes(cw)).length;
      if (matchCount >= 2) return true;
    }
    return false;
  };

  // ===========================================================================
  // CARGA INICIAL DE DATOS
  // ===========================================================================
  useEffect(() => {
    loadInstitutionalData();
    loadAnnualPlans();
    loadLearningGoals();
    loadAiPreferences();
  }, []);

  const loadInstitutionalData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [cRes, sRes, aRes] = await Promise.all([
        fetch('/api/courses', { headers }).catch(() => null),
        fetch('/api/subjects', { headers }).catch(() => null),
        fetch('/api/assignments', { headers }).catch(() => null)
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
      if (aRes && aRes.ok) {
        const aData = await aRes.json();
        const rawList = Array.isArray(aData) ? aData : [];
        setAllAssignments(rawList);

        // Lista única de docentes
        const tSet = new Set<string>();
        rawList.forEach((a: any) => {
          if (a.teacher_name) tSet.add(a.teacher_name);
        });
        setTeachersList(Array.from(tSet).sort());

        // Asignaciones de este docente
        const mine = rawList.filter((a: any) => isUserMatch(a.teacher_name));
        setMyAssignments(mine);
      }
    } catch (err) {
      console.warn('Error cargando datos institucionales:', err);
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
        const plans = data.plans || [];
        setAllAnnualPlans(plans);

        // Si hay planes para el filtro actual, seleccionar el primero
        let activeFilter = selectedTeacherFilter;
        let visible = getVisiblePlans(plans, activeFilter);
        if (visible.length === 0 && (user?.role === 'Admin' || user?.role === 'Director' || user?.role === 'Administrador') && plans.length > 0) {
          activeFilter = 'all';
          setSelectedTeacherFilter('all');
          visible = plans;
        }
        if (visible.length > 0) {
          selectAnnualPlan(visible[0]);
        } else {
          setSelectedPlan(null);
        }
      }
    } catch (err) {
      console.error('Error cargando planes anuales:', err);
    } finally {
      setLoadingAnnual(false);
    }
  };

  // Filtrado de planes según perfil y selección
  const getVisiblePlans = (plans: AnnualPlan[], teacherFilter: string) => {
    if (!isAdmin || teacherFilter === 'my_profile') {
      return plans.filter(p => isUserMatch(p.teacher_name) || isUserMatch(p.substitute_teacher_name) || p.teacher_email === user?.email);
    }
    if (teacherFilter === 'all') {
      return plans;
    }
    return plans.filter(p => p.teacher_name === teacherFilter || p.substitute_teacher_name === teacherFilter);
  };

  const visiblePlans = useMemo(() => {
    return getVisiblePlans(allAnnualPlans, selectedTeacherFilter);
  }, [allAnnualPlans, selectedTeacherFilter, user]);

  const loadLearningGoals = async (grade = '', subj = '', search = '', priority = 'all') => {
    setLoadingCatalog(true);
    try {
      const params = new URLSearchParams();
      if (grade) params.append('grade_level', grade);
      if (subj) params.append('subject', subj);
      if (search) params.append('search', search);
      if (priority === 'prioritized') params.append('is_prioritized', 'true');
      if (priority === 'standard') params.append('is_prioritized', 'false');

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

  const loadCoverageStats = async (courseName: string, subjectName: string) => {
    if (!courseName || !subjectName) return;
    setLoadingCoverage(true);
    try {
      const res = await fetch(
        `/api/curriculum/coverage-stats?course_name=${encodeURIComponent(courseName)}&subject_name=${encodeURIComponent(subjectName)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setCoverageStats(data.stats || null);
      }
    } catch (err) {
      console.error('Error cargando estadísticas de cobertura curricular:', err);
    } finally {
      setLoadingCoverage(false);
    }
  };

  const parseUnitWeeks = (temporality?: string): number => {
    const match = String(temporality || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  const getMaxClassesForUnit = (unit?: AnnualUnit | null, weeklySessions = 1): number => {
    if (!unit) return 999;
    const weeks = parseUnitWeeks(unit.temporality);
    return weeks * (weeklySessions || 1);
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
      weekly_sessions: plan.weekly_sessions || 1,
      status: plan.status || 'Borrador',
      units: plan.units ? JSON.parse(JSON.stringify(plan.units)) : []
    });
    setIsEditingAnnual(false);

    if (plan.units && plan.units.length > 0) {
      setSelectedUnitIndex(0);
      const u0 = plan.units[0];
      setUnitForm({
        ...u0,
        class_count: u0.class_count || 8,
        hours_count: u0.hours_count || 16,
        unit_goal: u0.unit_goal || '',
        transversal_goals: u0.transversal_goals || '',
        resources: u0.resources || '',
        evaluation_type: u0.evaluation_type || 'Formativa y Sumativa',
        estimated_date: u0.estimated_date || ''
      });
    }

    // Cargar clases de este plan y cobertura curricular
    loadLessonsForPlan(plan.id);
    loadCoverageStats(plan.course_name, plan.subject_name);
  };

  const loadLessonsForPlan = async (planId: string) => {
    setLoadingLessons(true);
    try {
      const res = await fetch(`/api/curriculum/lesson-plans?annual_plan_id=${planId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const lessons: LessonPlan[] = data.lessonPlans || [];
        setLessonPlans(lessons);

        // Si hay clases, inicializar el formulario con la primera o una nueva
        if (lessons.length > 0) {
          setLessonForm(lessons[0]);
        } else if (selectedPlan) {
          resetLessonFormForNewClass(1, selectedPlan);
        }
      }
    } catch (err) {
      console.error('Error cargando clases del plan:', err);
    } finally {
      setLoadingLessons(false);
    }
  };

  const resetLessonFormForNewClass = (classNumber: number, plan: AnnualPlan | null, targetUnit?: AnnualUnit | null) => {
    const units = plan?.units || [];
    let assignedUnit = targetUnit;

    if (!assignedUnit && units.length > 0) {
      for (const u of units) {
        const count = lessonPlans.filter(l => (u.id && l.unit_id === u.id) || l.unit_name === u.unit_name).length;
        const maxC = getMaxClassesForUnit(u, plan?.weekly_sessions || 1);
        if (count < maxC) {
          assignedUnit = u;
          break;
        }
      }
      if (!assignedUnit) assignedUnit = units[units.length - 1];
    }

    setLessonForm({
      class_number: classNumber,
      unit_id: assignedUnit?.id || (assignedUnit ? assignedUnit.unit_name : undefined),
      unit_name: assignedUnit?.unit_name || '',
      class_date: new Date().toISOString().split('T')[0],
      course_name: plan?.course_name || '',
      subject_name: plan?.subject_name || '',
      teacher_name: plan?.teacher_name || user?.name || '',
      class_goal: '',
      status: 'por_realizar',
      oa_codes: '',
      ticket_salida: '',
      moment_start: '',
      moment_development: '',
      moment_closing: '',
      pedagogical_resources: '',
      evaluation_indicators: '',
      dua_accommodations: ''
    });
  };

  const handleAddNewClass = () => {
    if (!selectedPlan) {
      Swal.fire('Atención', 'Selecciona primero una Planificación Anual.', 'info');
      return;
    }
    const units = selectedPlan.units || [];
    if (units.length === 0) {
      Swal.fire('Sin Unidades', 'Esta planificación anual no tiene unidades registradas. Agrega unidades en la Planificación Anual primero.', 'warning');
      return;
    }

    let currentUnit = units.find(u => (u.id && u.id === lessonForm.unit_id) || u.unit_name === lessonForm.unit_name);
    if (!currentUnit) currentUnit = units[0];

    const currentUnitClasses = lessonPlans.filter(l => (currentUnit.id && l.unit_id === currentUnit.id) || l.unit_name === currentUnit.unit_name);
    const maxAllowed = getMaxClassesForUnit(currentUnit, selectedPlan.weekly_sessions || 1);

    if (currentUnitClasses.length >= maxAllowed) {
      const currIdx = units.findIndex(u => u === currentUnit);
      const nextUnit = units[currIdx + 1];

      if (nextUnit) {
        Swal.fire({
          title: `Límite de Clases de la ${currentUnit.unit_name}`,
          html: `La <strong>${currentUnit.unit_name}</strong> tiene asignadas <strong>${parseUnitWeeks(currentUnit.temporality)} semanas</strong> (${maxAllowed} clases máx) y ya tiene sus <strong>${maxAllowed} clases completadas</strong>.<br><br>¿Deseas comenzar a planificar la siguiente unidad: <strong>${nextUnit.unit_name}</strong>?`,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: `Sí, pasar a ${nextUnit.unit_name}`,
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#0284c7'
        }).then(res => {
          if (res.isConfirmed) {
            resetLessonFormForNewClass(lessonPlans.length + 1, selectedPlan, nextUnit);
          }
        });
        return;
      } else {
        Swal.fire({
          title: 'Todas las Unidades Completas',
          html: `Has alcanzado la cantidad total de clases planificadas para todas las unidades de <strong>${selectedPlan.subject_name}</strong>.<br><br>Si necesitas más clases, amplía las semanas de la unidad en la <strong>Planificación Anual</strong>.`,
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        return;
      }
    }

    resetLessonFormForNewClass(lessonPlans.length + 1, selectedPlan, currentUnit);
  };

  // ===========================================================================
  // ACCIONES DE PLANIFICACIÓN ANUAL
  // ===========================================================================
  const handleStartPlanFromAssignment = (asn: TeacherAssignment) => {
    setSelectedPlan(null);
    setAnnualForm({
      academic_year: 2026,
      semester: 'PRIMER Y SEGUNDO SEMESTRE',
      course_name: asn.level_name,
      subject_name: asn.subject_name,
      teacher_name: user?.name || asn.teacher_name,
      total_hours: 4,
      weekly_sessions: 1,
      status: 'Borrador',
      units: [
        {
          unit_number: 1,
          unit_name: 'Unidad 1: Nivelación y Diagnóstico Inicial',
          learning_goals: '',
          evaluation_instruments: 'Evaluación diagnóstica inicial; Guías de trabajo formativo; Prueba sumativa',
          temporality: '2 Semanas'
        }
      ]
    });
    setIsEditingAnnual(true);
  };

  const handleCreateNewAnnual = () => {
    setSelectedPlan(null);
    const defaultCourse = myAssignments[0]?.level_name || coursesList[0] || '1° Medio A';
    const defaultSubj = myAssignments[0]?.subject_name || subjectsList[0] || 'Matemática';

    setAnnualForm({
      academic_year: 2026,
      semester: 'PRIMER Y SEGUNDO SEMESTRE',
      course_name: defaultCourse,
      subject_name: defaultSubj,
      teacher_name: user?.name || '',
      total_hours: 4,
      weekly_sessions: 1,
      status: 'Borrador',
      units: [
        {
          unit_number: 1,
          unit_name: 'Unidad 1: Nivelación y Diagnóstico Inicial',
          learning_goals: '',
          evaluation_instruments: 'Evaluación diagnóstica inicial; Guías formativas; Prueba sumativa',
          temporality: '2 Semanas'
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
    if (!annualForm.course_name || !annualForm.subject_name) {
      Swal.fire('Campos Faltantes', 'Debes seleccionar el curso y la asignatura.', 'warning');
      return;
    }

    setSavingAnnual(true);
    try {
      const isUpdate = Boolean(selectedPlan?.id);
      const url = isUpdate ? `/api/curriculum/annual-plans/${selectedPlan?.id}` : '/api/curriculum/annual-plans';
      const method = isUpdate ? 'PUT' : 'POST';

      const payload = {
        ...annualForm,
        teacher_name: annualForm.teacher_name || user?.name || ''
      };

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
          title: 'Planificación Anual Guardada',
          text: `La planificación anual de ${annualForm.subject_name} para ${annualForm.course_name} fue registrada con éxito.`,
          timer: 2000,
          showConfirmButton: false
        });
        setIsEditingAnnual(false);
        await loadAnnualPlans();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.error || 'No se pudo guardar la planificación anual.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Error de conexión al guardar.', 'error');
    } finally {
      setSavingAnnual(false);
    }
  };

  const handleDeleteAnnualPlan = async (id: string) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar Planificación Anual?',
      text: 'Esta acción eliminará la planificación anual, todas sus unidades y sus clases asociadas.',
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
          Swal.fire('Eliminado', 'La planificación anual y sus clases fueron eliminadas.', 'success');
          setSelectedPlan(null);
          await loadAnnualPlans();
        } else {
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo eliminar la planificación.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la planificación.', 'error');
      }
    }
  };

  // Eliminación masiva por el Administrador de todas las planificaciones de un docente
  const handleDeleteTeacherAllPlans = async (teacherName: string) => {
    if (!isAdmin) return;
    const confirm = await Swal.fire({
      title: `¿Eliminar TODAS las planificaciones de ${teacherName}?`,
      text: `Esta acción de administración eliminará de forma irreversible todas las planificaciones anuales, unidades temáticas y clases registradas para este docente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/curriculum/teacher-plans?teacher_name=${encodeURIComponent(teacherName)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Planificaciones Eliminadas',
            text: `Se eliminaron ${data.deletedAnnualPlansCount || 0} planificaciones anuales y ${data.deletedLessonsCount || 0} clases de Prof. ${teacherName}.`,
            timer: 2500,
            showConfirmButton: false
          });
          setSelectedPlan(null);
          await loadAnnualPlans();
        } else {
          Swal.fire('Error', data.error || 'No se pudieron eliminar las planificaciones.', 'error');
        }
      } catch (err: any) {
        Swal.fire('Error', err?.message || 'Error de conexión.', 'error');
      }
    }
  };

  // Traspaso de Planificación a Docente de Reemplazo
  const handleOpenTransferModal = () => {
    if (!selectedPlan) return;
    setTransferTargetTeacher(selectedPlan.substitute_teacher_name || teachersList[0] || '');
    setTransferCustomTeacher('');
    setTransferMode('set_substitute');
    setTransferReason('Licencia médica del docente titular');
    setShowTransferModal(true);
  };

  const handleTransferPlan = async () => {
    if (!selectedPlan) return;
    const finalTargetTeacher = transferTargetTeacher === '__custom__'
      ? transferCustomTeacher.trim()
      : transferTargetTeacher.trim();

    if (!finalTargetTeacher) {
      Swal.fire('Docente Requerido', 'Por favor selecciona o ingresa el nombre del docente.', 'warning');
      return;
    }

    setIsTransferring(true);
    try {
      const res = await fetch('/api/curriculum/transfer-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          target_teacher_name: finalTargetTeacher,
          transfer_mode: transferMode,
          reason: transferReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowTransferModal(false);
        Swal.fire({
          icon: 'success',
          title: transferMode === 'set_substitute' ? 'Reemplazo Asignado' : 'Plan Traspasado',
          text: data.message || 'La operación se realizó con éxito.',
          timer: 2500,
          showConfirmButton: false
        });
        await loadAnnualPlans();
      } else {
        Swal.fire('Error', data.error || 'No se pudo procesar el traspaso.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Error de conexión al traspasar.', 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleRemoveSubstitute = async () => {
    if (!selectedPlan) return;
    const confirm = await Swal.fire({
      title: '¿Reanudar Titularidad?',
      text: `El docente titular (${selectedPlan.teacher_name}) retomará el control directo de este plan y se removerá al docente de reemplazo.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reanudar titular',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch('/api/curriculum/transfer-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            plan_id: selectedPlan.id,
            target_teacher_name: selectedPlan.teacher_name,
            transfer_mode: 'transfer_ownership',
            reason: 'Reincorporación del docente titular tras término de licencia médica'
          })
        });
        if (res.ok) {
          Swal.fire('Reincorporado', 'El titular ha retomado la planificación.', 'success');
          await loadAnnualPlans();
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo reanudar la titularidad.', 'error');
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

  const handleGenerateAiLesson = async (specificMode?: string | React.MouseEvent) => {
    if (!lessonForm.subject_name && !annualForm.subject_name) {
      Swal.fire('Atención', 'Selecciona una asignatura para que la IA genere la clase.', 'info');
      return;
    }

    setGeneratingAi(true);
    try {
      const oaCodes = lessonForm.oa_codes || 'OA de la Clase';
      const modeToUse = typeof specificMode === 'string' ? specificMode : 'suggest_class_activities';
      const res = await fetch('/api/curriculum/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: modeToUse,
          grade_level: lessonForm.course_name || annualForm.course_name,
          subject: lessonForm.subject_name || annualForm.subject_name,
          oa_code: oaCodes,
          oa_title: lessonForm.class_goal || `Clase N° ${lessonForm.class_number} de ${lessonForm.subject_name || annualForm.subject_name}`,
          context: aiActivityIdea.trim() || undefined,
          class_duration_mins: 90
        })
      });

      const data = await res.json();
      if (res.ok && data.data) {
        const ai = data.data;
        if (modeToUse === 'suggest_goal') {
          setLessonForm(prev => ({ ...prev, class_goal: ai.class_goal || prev.class_goal }));
          Swal.fire({ icon: 'success', title: 'Objetivo de Clase Generado', timer: 1500, showConfirmButton: false });
        } else if (modeToUse === 'suggest_moments') {
          setLessonForm(prev => ({
            ...prev,
            moment_start: ai.moment_start || prev.moment_start,
            moment_development: ai.moment_development || prev.moment_development,
            moment_closing: ai.moment_closing || prev.moment_closing
          }));
          Swal.fire({ icon: 'success', title: '3 Momentos Didácticos Generados', timer: 1500, showConfirmButton: false });
        } else if (modeToUse === 'suggest_ticket') {
          setLessonForm(prev => ({ ...prev, ticket_salida: ai.ticket_salida || prev.ticket_salida }));
          Swal.fire({ icon: 'success', title: 'Ticket de Salida Generado', timer: 1500, showConfirmButton: false });
        } else if (modeToUse === 'suggest_indicators') {
          setLessonForm(prev => ({ ...prev, evaluation_indicators: ai.evaluation_indicators || prev.evaluation_indicators }));
          Swal.fire({ icon: 'success', title: 'Indicadores de Evaluación Generados', timer: 1500, showConfirmButton: false });
        } else if (modeToUse === 'suggest_dua') {
          setLessonForm(prev => ({
            ...prev,
            dua_accommodations: ai.dua_accommodations || prev.dua_accommodations,
            pedagogical_resources: ai.pedagogical_resources || prev.pedagogical_resources
          }));
          Swal.fire({ icon: 'success', title: 'DUA y Recursos Generados', timer: 1500, showConfirmButton: false });
        } else {
          setLessonForm(prev => ({
            ...prev,
            class_goal: ai.class_goal || prev.class_goal,
            moment_start: ai.moment_start || prev.moment_start,
            moment_development: ai.moment_development || prev.moment_development,
            moment_closing: ai.moment_closing || prev.moment_closing,
            ticket_salida: ai.ticket_salida || prev.ticket_salida,
            pedagogical_resources: ai.pedagogical_resources || prev.pedagogical_resources,
            evaluation_indicators: ai.evaluation_indicators || prev.evaluation_indicators,
            dua_accommodations: ai.dua_accommodations || prev.dua_accommodations
          }));

          Swal.fire({
            icon: 'success',
            title: 'Clase Generada con IA Exitosamente',
            text: aiActivityIdea.trim()
              ? 'Se integraron tus OAs y tu idea de actividad en los 3 momentos didácticos, Ticket de Salida, Recursos e Inclusión DUA.'
              : 'Se han estructurado los 3 momentos (Inicio, Desarrollo, Cierre), Ticket de Salida, Recursos, Indicadores y DUA.',
            timer: 2300,
            showConfirmButton: false
          });
        }
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
  // PLANIFICACIÓN POR UNIDAD: CONTROLADORES Y ACCIONES
  // ===========================================================================
  const handleSelectUnitForDetail = (index: number) => {
    setSelectedUnitIndex(index);
    const targetUnit = annualForm.units[index] || selectedPlan?.units?.[index];
    if (targetUnit) {
      setUnitForm({
        ...targetUnit,
        class_count: targetUnit.class_count || 8,
        hours_count: targetUnit.hours_count || 16,
        unit_goal: targetUnit.unit_goal || '',
        transversal_goals: targetUnit.transversal_goals || '',
        resources: targetUnit.resources || '',
        evaluation_type: targetUnit.evaluation_type || 'Formativa y Sumativa',
        estimated_date: targetUnit.estimated_date || ''
      });
    }
    setActiveTab('units');
  };

  const handleAddNewUnitToPlan = () => {
    const nextNum = (annualForm.units?.length || 0) + 1;
    const newUnit: AnnualUnit = {
      unit_number: nextNum,
      unit_name: `Unidad ${nextNum}: Nueva Unidad de Aprendizaje`,
      learning_goals: '',
      evaluation_instruments: 'Pauta de evaluación, Rúbrica formativa, Guía de trabajo',
      temporality: '8 Semanas',
      class_count: 8,
      hours_count: 16,
      unit_goal: '',
      transversal_goals: 'Trabajo en equipo, responsabilidad y proactividad.',
      resources: 'Guías de aprendizaje, proyector multimedia, textos de estudio.',
      evaluation_type: 'Formativa y Sumativa',
      estimated_date: ''
    };

    const updated = [...annualForm.units, newUnit];
    setAnnualForm(prev => ({
      ...prev,
      units: updated
    }));
    if (selectedPlan) {
      setSelectedPlan(prev => prev ? {
        ...prev,
        units: updated
      } : null);
    }
    setSelectedUnitIndex(updated.length - 1);
    setUnitForm(newUnit);
  };

  const handleSaveUnit = async () => {
    if (!selectedPlan && !annualForm.course_name) {
      Swal.fire('Atención', 'No hay un plan anual seleccionado.', 'warning');
      return;
    }

    setSavingUnit(true);
    try {
      const updatedUnits = [...annualForm.units];
      if (selectedUnitIndex >= 0 && selectedUnitIndex < updatedUnits.length) {
        updatedUnits[selectedUnitIndex] = { ...unitForm };
      } else {
        updatedUnits.push({ ...unitForm });
      }

      setAnnualForm(prev => ({ ...prev, units: updatedUnits }));
      if (selectedPlan) {
        setSelectedPlan(prev => prev ? { ...prev, units: updatedUnits } : null);
      }

      if (unitForm.id) {
        const res = await fetch(`/api/curriculum/units/${unitForm.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(unitForm)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al actualizar unidad');
        }
      } else if (selectedPlan?.id) {
        const res = await fetch(`/api/curriculum/annual-plans/${selectedPlan.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...annualForm,
            units: updatedUnits
          })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al persistir unidades en el plan anual');
        }
        await loadAnnualPlans();
      }

      Swal.fire({
        icon: 'success',
        title: 'Planificación de Unidad Guardada',
        text: `La ${unitForm.unit_name} fue guardada exitosamente.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo guardar la planificación de la unidad.', 'error');
    } finally {
      setSavingUnit(false);
    }
  };

  const handleGenerateUnitWithAi = async () => {
    const course = selectedPlan?.course_name || annualForm.course_name;
    const subject = selectedPlan?.subject_name || annualForm.subject_name;

    if (!course || !subject) {
      Swal.fire('Atención', 'Selecciona primero un curso y asignatura.', 'info');
      return;
    }

    setGeneratingUnitAi(true);
    try {
      const res = await fetch('/api/curriculum/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: 'suggest_unit_detail',
          grade_level: course,
          subject: subject,
          unit_name: unitForm.unit_name,
          unit_number: unitForm.unit_number || selectedUnitIndex + 1,
          oa_title: unitForm.learning_goals || `Unidad ${unitForm.unit_number}: ${unitForm.unit_name}`,
          learning_goals: unitForm.learning_goals
        })
      });

      const data = await res.json();
      if (res.ok && data.data) {
        const d = data.data;
        setUnitForm(prev => ({
          ...prev,
          unit_name: d.unit_name || prev.unit_name,
          unit_goal: d.unit_goal || prev.unit_goal,
          transversal_goals: d.transversal_goals || prev.transversal_goals,
          resources: d.resources || prev.resources,
          evaluation_type: d.evaluation_type || prev.evaluation_type,
          evaluation_instruments: d.evaluation_instruments || prev.evaluation_instruments,
          class_count: d.class_count || prev.class_count,
          hours_count: d.hours_count || prev.hours_count,
          temporality: d.temporality || prev.temporality,
          estimated_date: d.estimated_date || prev.estimated_date
        }));

        Swal.fire({
          icon: 'success',
          title: 'Planificación de Unidad Asistida por IA',
          html: `La IA ha estructurado el objetivo de la unidad, horas (${d.hours_count || 16} hrs), ${d.class_count || 8} clases, OATs, recursos didácticos e instrumentos de evaluación según el estándar MINEDUC.`,
          timer: 3000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error IA', data.error || 'No se pudo generar la propuesta pedagógica de la unidad.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error IA', err?.message || 'Error de conexión con el asistente pedagógico.', 'error');
    } finally {
      setGeneratingUnitAi(false);
    }
  };

  const handlePrintUnitReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const course = selectedPlan?.course_name || annualForm.course_name || '';
    const subject = selectedPlan?.subject_name || annualForm.subject_name || '';
    const teacher = selectedPlan?.teacher_name || annualForm.teacher_name || user?.name || '';
    const semester = selectedPlan?.semester || annualForm.semester || 'PRIMER Y SEGUNDO SEMESTRE';
    const year = selectedPlan?.academic_year || annualForm.academic_year || 2026;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PLANIFICACIÓN POR UNIDAD — ${unitForm.unit_name} • ${course}</title>
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; margin: 0; padding: 10px; line-height: 1.45; }
          .header-title { text-align: center; margin-bottom: 12px; }
          .header-title h2 { margin: 0; font-size: 15px; font-weight: bold; text-transform: uppercase; }
          .header-title p { margin: 3px 0 0; font-size: 11px; color: #333; }
          table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          table.info-table td { border: 1px solid #000; padding: 6px 10px; font-size: 10.5px; }
          table.info-table td.label { font-weight: bold; width: 140px; background-color: #f7f7f7; text-transform: uppercase; }
          .section-block { border: 1px solid #000; padding: 10px 12px; margin-bottom: 10px; border-radius: 4px; page-break-inside: avoid; }
          .section-title { font-weight: bold; font-size: 11px; margin-bottom: 6px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
          .signatures { margin-top: 35px; display: flex; justify-content: space-around; text-align: center; page-break-inside: avoid; }
          .sign-line { width: 220px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold; font-size: 10px; text-transform: uppercase; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header-title">
          <h2>LICEO TÉCNICO PROFESIONAL CAMPANARIO</h2>
          <p>PLANIFICACIÓN DIDÁCTICA POR UNIDAD DE APRENDIZAJE • AÑO ${year}</p>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">Curso:</td>
            <td><strong>${course}</strong></td>
            <td class="label">Asignatura:</td>
            <td><strong>${subject}</strong></td>
          </tr>
          <tr>
            <td class="label">Docente:</td>
            <td>${teacher}</td>
            <td class="label">Semestre:</td>
            <td>${semester}</td>
          </tr>
          <tr>
            <td class="label">Unidad N°:</td>
            <td><strong>Unidad ${unitForm.unit_number || selectedUnitIndex + 1}</strong></td>
            <td class="label">Título Unidad:</td>
            <td><strong>${unitForm.unit_name}</strong></td>
          </tr>
          <tr>
            <td class="label">N° de Clases:</td>
            <td><strong>${unitForm.class_count || 8} clases</strong></td>
            <td class="label">N° de Horas:</td>
            <td><strong>${unitForm.hours_count || 16} horas pedagógicas</strong></td>
          </tr>
          <tr>
            <td class="label">Temporalidad:</td>
            <td>${unitForm.temporality || '8 Semanas'}</td>
            <td class="label">Fecha Estimada:</td>
            <td><strong>${unitForm.estimated_date || 'Marzo - Mayo 2026'}</strong></td>
          </tr>
        </table>

        <div class="section-block">
          <div class="section-title">🎯 Objetivo de la Unidad (Propósito Formativo):</div>
          <div>${(unitForm.unit_goal || 'Sin objetivo de unidad registrado').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">📚 Objetivos de Aprendizaje (OA MINEDUC):</div>
          <div>${(unitForm.learning_goals || 'Sin OAs asignados').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">⭐ Objetivos de Aprendizaje Transversales (OAT):</div>
          <div>${(unitForm.transversal_goals || 'Sin objetivos transversales definidos').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">📦 Recursos Didácticos y Tecnológicos:</div>
          <div>${(unitForm.resources || 'Guías pedagógicas, textos escolares, proyector multimedia, talleres prácticos').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">📝 Tipo de Evaluación:</div>
          <div>${(unitForm.evaluation_type || 'Formativa y Sumativa').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">📋 Instrumentos de Evaluación:</div>
          <div>${(unitForm.evaluation_instruments || 'Rúbricas analíticas, listas de cotejo, pruebas de desempeño práctico').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="signatures">
          <div>
            <div class="sign-line">Firma Docente de Asignatura<br><span style="font-weight: normal; font-size: 9px;">${teacher}</span></div>
          </div>
          <div>
            <div class="sign-line">Firma y Timbre UTP<br><span style="font-weight: normal; font-size: 9px;">Liceo TP Campanario</span></div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // ===========================================================================
  // SELECTOR RÁPIDO DE OA MINEDUC
  // ===========================================================================
  const openOaPicker = (unitIndex: number) => {
    setTargetUnitIndexForOa(unitIndex);
    const initialGrade = annualForm.course_name;
    const initialSubj = annualForm.subject_name;
    setModalGradeFilter(initialGrade);
    setModalSubjectFilter(initialSubj);
    setModalPriorityFilter('all');
    setCatalogSearch('');
    setShowOaPickerModal(true);
    loadLearningGoals(initialGrade, initialSubj, '', 'all');
  };

  const openOaPickerForUnitTab = () => {
    setTargetUnitIndexForOa(-1);
    const initialGrade = selectedPlan?.course_name || annualForm.course_name;
    const initialSubj = selectedPlan?.subject_name || annualForm.subject_name;
    setModalGradeFilter(initialGrade);
    setModalSubjectFilter(initialSubj);
    setModalPriorityFilter('all');
    setCatalogSearch('');
    setShowOaPickerModal(true);
    loadLearningGoals(initialGrade, initialSubj, '', 'all');
  };

  const handleApplyOaToUnit = (oa: LearningGoal) => {
    const formatted = `${oa.oa_code}: ${oa.oa_title}`;
    if (targetUnitIndexForOa === -1) {
      setUnitForm(prev => {
        const current = prev.learning_goals || '';
        return {
          ...prev,
          learning_goals: current ? `${current}\n\n${formatted}` : formatted
        };
      });
      setShowOaPickerModal(false);
      setTargetUnitIndexForOa(null);
      Swal.fire({
        icon: 'success',
        title: 'Objetivo Agregado a la Unidad',
        text: `Se agregó ${oa.oa_code} a la planificación de la unidad.`,
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }

    if (targetUnitIndexForOa !== null && targetUnitIndexForOa >= 0) {
      const current = annualForm.units[targetUnitIndexForOa]?.learning_goals || '';
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
  // GUARDAR Y CAMBIAR ESTADO DE CLASE
  // ===========================================================================
  const handleToggleLessonStatus = async (lesson: LessonPlan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!lesson.id) return;
    const newStatus = lesson.status === 'realizada' ? 'por_realizar' : 'realizada';
    try {
      const res = await fetch(`/api/curriculum/lesson-plans/${lesson.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setLessonPlans(prev => prev.map(l => (l.id === lesson.id ? { ...l, status: newStatus } : l)));
        if (lessonForm.id === lesson.id) {
          setLessonForm(prev => ({ ...prev, status: newStatus }));
        }
        if (selectedPlan) {
          loadCoverageStats(selectedPlan.course_name, selectedPlan.subject_name);
        }
        Swal.fire({
          icon: 'success',
          title: newStatus === 'realizada' ? 'Clase Realizada ✓' : 'Clase Por Realizar ⏳',
          text: `Se recalculó la cobertura curricular en tiempo real.`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo cambiar el estado de la clase.', 'error');
    }
  };

  const handleSaveLessonPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.class_goal) {
      Swal.fire('Falta Objetivo', 'Por favor redacta el objetivo de la clase.', 'warning');
      return;
    }

    setSavingLesson(true);
    try {
      const defaultUnit = selectedPlan?.units && selectedPlan.units.length > 0 ? selectedPlan.units[0] : null;
      const effectiveUnitId = lessonForm.unit_id || defaultUnit?.id || (defaultUnit ? defaultUnit.unit_name : null);
      const effectiveUnitName = lessonForm.unit_name || defaultUnit?.unit_name || null;

      const payload = {
        ...lessonForm,
        annual_plan_id: selectedPlan?.id || null,
        unit_id: effectiveUnitId,
        unit_name: effectiveUnitName,
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
        const resData = await res.json().catch(() => ({}));
        const savedId = resData.id || lessonForm.id;

        // Mantener sincronizado el formulario en memoria
        setLessonForm(prev => ({
          ...prev,
          id: savedId,
          unit_id: effectiveUnitId || undefined,
          unit_name: effectiveUnitName || undefined
        }));

        Swal.fire({
          icon: 'success',
          title: 'Clase Guardada Exitosamente',
          text: `La clase N° ${lessonForm.class_number} ha quedado registrada.`,
          timer: 1800,
          showConfirmButton: false
        });
        if (selectedPlan) {
          await loadLessonsForPlan(selectedPlan.id);
          loadCoverageStats(selectedPlan.course_name, selectedPlan.subject_name);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        Swal.fire('Error al Guardar', errorData.error || 'No se pudo guardar la clase.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'No se pudo guardar la clase.', 'error');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLessonPlan = async (lessonId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirm = await Swal.fire({
      title: '¿Eliminar esta clase?',
      text: 'Se eliminará la planificación de esta clase.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/curriculum/lesson-plans/${lessonId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setLessonPlans(prev => prev.filter(l => l.id !== lessonId));
          if (selectedPlan) {
            loadCoverageStats(selectedPlan.course_name, selectedPlan.subject_name);
            resetLessonFormForNewClass(lessonPlans.length, selectedPlan);
          }
          Swal.fire('Eliminada', 'La clase fue eliminada.', 'success');
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar la clase.', 'error');
      }
    }
  };

  // OAs disponibles para la asignatura activa (con prioridad en la unidad seleccionada)
  const availableOAsForClass = useMemo(() => {
    const unitOas: { oa_code: string; oa_title: string; isUnitOa: boolean }[] = [];
    const otherOas: { oa_code: string; oa_title: string; isUnitOa: boolean }[] = [];
    const seen = new Set<string>();

    // 1. OAs de la unidad activa en la clase
    const currentUnit = selectedPlan?.units?.find(
      u => (u.id && u.id === lessonForm.unit_id) || u.unit_name === lessonForm.unit_name
    );

    if (currentUnit && currentUnit.learning_goals) {
      const matches = currentUnit.learning_goals.match(/OA\s*\d+/gi) || [];
      matches.forEach(m => {
        const code = m.toUpperCase().replace(/\s+/, ' ');
        if (!seen.has(code)) {
          seen.add(code);
          unitOas.push({
            oa_code: code,
            oa_title: `Objetivo de ${currentUnit.unit_name}`,
            isUnitOa: true
          });
        }
      });
    }

    // 2. Del resto de las unidades del plan anual
    if (selectedPlan && selectedPlan.units) {
      selectedPlan.units.forEach(u => {
        const raw = u.learning_goals || '';
        const matches = raw.match(/OA\s*\d+/gi) || [];
        matches.forEach(m => {
          const code = m.toUpperCase().replace(/\s+/, ' ');
          if (!seen.has(code)) {
            seen.add(code);
            otherOas.push({
              oa_code: code,
              oa_title: `OA ${code} de ${u.unit_name}`,
              isUnitOa: false
            });
          }
        });
      });
    }

    // 3. Del catálogo oficial cargado
    learningGoals.forEach(g => {
      const code = g.oa_code.toUpperCase().replace(/\s+/, ' ');
      if (!seen.has(code)) {
        seen.add(code);
        otherOas.push({ oa_code: code, oa_title: g.oa_title, isUnitOa: false });
      }
    });

    return { unitOas, otherOas, allOas: [...unitOas, ...otherOas] };
  }, [selectedPlan, learningGoals, lessonForm.unit_id, lessonForm.unit_name]);

  // ===========================================================================
  // IMPRESIÓN OFICIAL DEL FORMATO MINEDUC
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
            <td class="label">Docente:</td>
            <td>${plan.teacher_name || ''}</td>
            <td class="label">Semestre:</td>
            <td>${plan.semester || 'PRIMER Y SEGUNDO SEMESTRE'}</td>
          </tr>
          <tr>
            <td class="label">Curso:</td>
            <td>${plan.course_name || ''}</td>
            <td class="label">Asignatura:</td>
            <td>${plan.subject_name || ''}</td>
          </tr>
        </table>

        <table class="matrix">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">N° Unidad</th>
              <th style="width: 220px;">Nombre de la Unidad</th>
              <th>Objetivos de Aprendizaje (OA)</th>
              <th style="width: 240px;">Instrumentos de Evaluación</th>
              <th style="width: 110px; text-align: center;">Temporalidad</th>
            </tr>
          </thead>
          <tbody>
            ${unitsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handlePrintLessonPlan = (lesson: LessonPlan) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CLASE N° ${lesson.class_number} — ${lesson.course_name} • ${lesson.subject_name}</title>
        <style>
          @page { size: portrait; margin: 15mm; }
          body { font-family: 'Arial', sans-serif; font-size: 11px; color: #000; margin: 0; padding: 10px; line-height: 1.4; }
          .header-title { text-align: center; margin-bottom: 12px; }
          .header-title h2 { margin: 0; font-size: 15px; font-weight: bold; text-transform: uppercase; }
          .header-title p { margin: 3px 0 0; font-size: 11px; color: #444; }
          table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          table.info-table td { border: 1px solid #000; padding: 6px 10px; font-size: 10.5px; }
          table.info-table td.label { font-weight: bold; width: 140px; background-color: #f7f7f7; text-transform: uppercase; }
          .section-block { border: 1px solid #000; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
          .section-title { font-weight: bold; font-size: 11px; margin-bottom: 5px; text-transform: uppercase; }
          .ticket-cutout { border: 2px dashed #000; padding: 12px; margin-top: 25px; border-radius: 6px; page-break-inside: avoid; }
          .ticket-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 4px; font-size: 10.5px; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header-title">
          <h2>LICEO TÉCNICO PROFESIONAL CAMPANARIO</h2>
          <p>PLANIFICACIÓN CLASE A CLASE • ESTÁNDAR MARCO DE LA BUENA ENSEÑANZA MINEDUC</p>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">Curso:</td>
            <td><strong>${lesson.course_name || selectedPlan?.course_name || ''}</strong></td>
            <td class="label">N° de Clase:</td>
            <td><strong>Clase ${lesson.class_number}</strong> (${lesson.status === 'realizada' ? '✓ Realizada' : 'Por Realizar'})</td>
          </tr>
          <tr>
            <td class="label">Asignatura:</td>
            <td>${lesson.subject_name || selectedPlan?.subject_name || ''}</td>
            <td class="label">Fecha:</td>
            <td>${lesson.class_date ? new Date(lesson.class_date).toLocaleDateString('es-CL') : 'Sin fecha'}</td>
          </tr>
          <tr>
            <td class="label">Docente:</td>
            <td>${lesson.teacher_name || user?.name || ''}</td>
            <td class="label">OAs de la Clase:</td>
            <td><strong>${lesson.oa_codes || 'No especificados'}</strong></td>
          </tr>
        </table>

        <div class="section-block">
          <div class="section-title">🎯 Objetivo de la Clase (Bloom):</div>
          <div>${lesson.class_goal || 'Sin objetivo registrado'}</div>
        </div>

        <div class="section-block">
          <div class="section-title">🟡 1. Momento de Inicio (15 min):</div>
          <div style="font-size: 10px; color: #444; margin-bottom: 4px;">Activación de conocimientos previos, motivación inicial y presentación del objetivo.</div>
          <div>${(lesson.moment_start || 'Sin actividades registradas').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">🔵 2. Momento de Desarrollo (60 min):</div>
          <div style="font-size: 10px; color: #444; margin-bottom: 4px;">Modelamiento docente, práctica guiada/colaborativa y aplicación independiente.</div>
          <div>${(lesson.moment_development || 'Sin actividades registradas').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">🟢 3. Momento de Cierre (15 min):</div>
          <div style="font-size: 10px; color: #444; margin-bottom: 4px;">Síntesis grupal, preguntas de metacognición y comprobación rápida.</div>
          <div>${(lesson.moment_closing || 'Sin actividades registradas').replace(/\n/g, '<br>')}</div>
        </div>

        <div class="section-block">
          <div class="section-title">📦 Recursos & Adecuaciones DUA:</div>
          <div><strong>Recursos:</strong> ${lesson.pedagogical_resources || 'Material estándar de aula'}</div>
          <div style="margin-top: 4px;"><strong>Adecuaciones DUA:</strong> ${lesson.dua_accommodations || 'Diseño universal para el grupo'}</div>
        </div>

        <!-- TALÓN RECORTABLE DEL TICKET DE SALIDA -->
        <div class="ticket-cutout">
          <div style="font-size: 10px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">
            ✂️ TALÓN RECORTABLE PARA EL ESTUDIANTE • TICKET DE SALIDA
          </div>
          <div class="ticket-header">
            <span>Nombre del Estudiante: __________________________________________________</span>
            <span>Fecha: ___/___/2026</span>
          </div>
          <div style="font-size: 10.5px; font-weight: bold; margin-bottom: 4px;">
            Preguntas de Evaluación Formativa Rápida (Ticket de Salida):
          </div>
          <div style="font-size: 10px; line-height: 1.5;">
            ${(lesson.ticket_salida || '1. ¿Qué concepto o aprendizaje clave descubriste en esta clase?\n2. ¿Qué te resultó más fácil o más desafiante de resolver?').replace(/\n/g, '<br>')}
          </div>
          <div style="margin-top: 15px; border-bottom: 1px dotted #888; height: 35px;">
            Espacio de respuesta del estudiante:
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ===================================================================== */}
      {/* CABECERA PRINCIPAL DEL MÓDULO                                         */}
      {/* ===================================================================== */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem 1.75rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.18)',
            padding: '0.65rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalendarDays size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.3px' }}>
                Planificaciones Curriculares & Asistente IA
              </h2>
              <span style={{
                background: '#facc15',
                color: '#713f12',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 900
              }}>
                OFICIAL MINEDUC 2026
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: '#e0f2fe' }}>
              Diseño macro (Planificación Anual) y micro (Clase a Clase) con medición de Cobertura Curricular y apoyo IA.
            </p>
          </div>
        </div>

        {/* CONTROLES DERECHA: MODO EDITOR / SOLO VISTA Y SUPERVISIÓN ADMIN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* SWITCH: MODO EDITOR VS MODO SOLO VISTA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.2)',
            padding: '4px',
            borderRadius: '10px',
            gap: '3px'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'edit' ? '#ffffff' : 'transparent',
                color: viewMode === 'edit' ? '#0369a1' : '#ffffff',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'edit' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Edit3 size={13} />
              Modo Editor
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('readonly');
                setIsEditingAnnual(false);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'readonly' ? '#ffffff' : 'transparent',
                color: viewMode === 'readonly' ? '#0369a1' : '#ffffff',
                fontWeight: 800,
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: viewMode === 'readonly' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Eye size={13} />
              Modo Solo Vista
            </button>
          </div>

          {/* SELECTOR DE SUPERVISIÓN PARA ADMINS */}
          {isAdmin && teachersList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255,255,255,0.16)', padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
              <UserCheck size={15} color="#ffffff" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Supervisar:</span>
              <select
                value={selectedTeacherFilter}
                onChange={e => {
                  setSelectedTeacherFilter(e.target.value);
                  const visible = getVisiblePlans(allAnnualPlans, e.target.value);
                  if (visible.length > 0) {
                    selectAnnualPlan(visible[0]);
                  } else {
                    setSelectedPlan(null);
                  }
                }}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.32rem 0.6rem',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <option value="my_profile">👨‍🏫 Mi Perfil Docente ({user?.name || 'Yo'})</option>
                <option value="all">🌐 Todos los Docentes ({allAnnualPlans.length} planes)</option>
                {teachersList.map(t => (
                  <option key={t} value={t}>
                    Prof. {t}
                  </option>
                ))}
              </select>

              {/* BOTÓN ADMIN PARA VACIAR/ELIMINAR TODAS LAS PLANIFICACIONES DEL DOCENTE FILTRADO */}
              {selectedTeacherFilter !== 'all' && selectedTeacherFilter !== 'my_profile' && viewMode === 'edit' && (
                <button
                  type="button"
                  onClick={() => handleDeleteTeacherAllPlans(selectedTeacherFilter)}
                  title={`Eliminar todas las planificaciones y clases de Prof. ${selectedTeacherFilter}`}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Trash2 size={13} />
                  Limpiar Todo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BANNER INFORMATIVO CUANDO ESTÁ EN MODO SOLO VISTA */}
      {viewMode === 'readonly' && (
        <div style={{
          background: '#eff6ff',
          border: '1.5px solid #60a5fa',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Eye size={20} color="#0284c7" />
            <div>
              <strong style={{ fontSize: '0.84rem', color: '#1e3a8a' }}>MODO SOLO VISTA:</strong>
              <span style={{ fontSize: '0.8rem', color: '#1e40af', marginLeft: '0.35rem' }}>
                La visualización, impresión y revisión de Cobertura Curricular están habilitadas. Las modificaciones, creaciones y eliminaciones están bloqueadas.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('edit')}
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Activar Modo Editor
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* WIDGET COBERTURA CURRICULAR EN TIEMPO REAL                            */}
      {/* ===================================================================== */}
      {selectedPlan && coverageStats && (
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '14px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#64748b' }}>
                  Cobertura Curricular Nacional:
                </span>
                <span style={{
                  background: coverageStats.coverageLevel === 'optima' ? '#dcfce7' : coverageStats.coverageLevel === 'media' ? '#fef3c7' : '#fee2e2',
                  color: coverageStats.coverageLevel === 'optima' ? '#15803d' : coverageStats.coverageLevel === 'media' ? '#b45309' : '#b91c1c',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {coverageStats.coverageLevel === 'optima' ? '🟢 Cobertura Óptima (≥85%)' : coverageStats.coverageLevel === 'media' ? '🟡 Cobertura Media (60-84%)' : '🔴 Cobertura Crítica (<60%)'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <strong style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                  {coverageStats.coveragePercentage}%
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                  ({coverageStats.coveredOAsCount} de {coverageStats.totalOfficialOAs} OAs oficiales trabajados en clases realizadas)
                </span>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '0.2rem' }}>
                Avance de Clases:
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                {coverageStats.completedClassesCount} / {coverageStats.plannedClassesCount} Clases Realizadas ({coverageStats.executionPercentage}%)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => setShowCoverageModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Layers size={14} color="#0284c7" />
              Ver Detalle de OAs Cubiertos
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BARRA DE NAVEGACIÓN ENTRE SECCIONES                                   */}
      {/* ===================================================================== */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.5rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('annual')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'annual' ? '#ffffff' : 'transparent',
            color: activeTab === 'annual' ? '#0284c7' : '#475569',
            fontWeight: activeTab === 'annual' ? 800 : 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'annual' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <BookOpen size={16} />
          1. Planificación Anual (1x al Año)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('units')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'units' ? '#ffffff' : 'transparent',
            color: activeTab === 'units' ? '#0284c7' : '#475569',
            fontWeight: activeTab === 'units' ? 800 : 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'units' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <FileText size={16} />
          2. Planificación por Unidad (Mineduc)
          {annualForm.units.length > 0 && (
            <span style={{
              background: '#0284c7',
              color: '#ffffff',
              borderRadius: '999px',
              padding: '0.1rem 0.5rem',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {annualForm.units.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'lessons' ? '#ffffff' : 'transparent',
            color: activeTab === 'lessons' ? '#0284c7' : '#475569',
            fontWeight: activeTab === 'lessons' ? 800 : 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'lessons' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Clock size={16} />
          3. Planificación Clase a Clase
          {lessonPlans.length > 0 && (
            <span style={{
              background: '#0284c7',
              color: '#ffffff',
              borderRadius: '999px',
              padding: '0.1rem 0.5rem',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {lessonPlans.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'catalog' ? '#ffffff' : 'transparent',
            color: activeTab === 'catalog' ? '#0284c7' : '#475569',
            fontWeight: activeTab === 'catalog' ? 800 : 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'catalog' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Search size={16} />
          4. Catálogo OAs MINEDUC
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai_config')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'ai_config' ? '#ffffff' : 'transparent',
            color: activeTab === 'ai_config' ? '#7c3aed' : '#475569',
            fontWeight: activeTab === 'ai_config' ? 800 : 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'ai_config' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Brain size={16} />
          5. Asistente IA & Memoria Pedagógica
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedules')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'schedules' ? '#ffffff' : 'transparent',
            color: activeTab === 'schedules' ? '#0d9488' : '#475569',
            fontWeight: activeTab === 'schedules' ? 800 : 600,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'schedules' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <CalendarDays size={16} />
          6. Horarios Escolares & aSc Horarios
        </button>
      </div>

      {/* ===================================================================== */}
      {/* PESTAÑA 1: PLANIFICACIÓN ANUAL (1X AL AÑO)                            */}
      {/* ===================================================================== */}
      {activeTab === 'annual' && (
        <div>
          {/* PANTALLA INICIAL EN 0 CUANDO NO HAY PLANES REGISTRADOS */}
          {visiblePlans.length === 0 && !isEditingAnnual && (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px dashed #94a3b8',
              padding: '2.5rem 1.75rem',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              maxWidth: '850px',
              margin: '0 auto'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: '#0284c7'
              }}>
                <BookOpen size={32} />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.4rem' }}>
                Bienvenido(a) a tus Planificaciones Curriculares 2026
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '580px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                Aún no tienes planificaciones anuales registradas. Cada docente parte desde cero para estructurar sus cursos y asignaturas asignadas.
              </p>

              {myAssignments.length > 0 ? (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '1rem' }}>
                    Tus Cursos y Asignaturas Asignadas Listas para Planificar:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', textAlign: 'left' }}>
                    {myAssignments.map((asn, idx) => (
                      <div key={asn.id || idx} style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {asn.level_name}
                          </span>
                          <h5 style={{ margin: '0.5rem 0 0.2rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                            {asn.subject_name}
                          </h5>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Docente: {user?.name || asn.teacher_name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartPlanFromAssignment(asn)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            background: '#0284c7',
                            color: '#ffffff',
                            padding: '0.55rem',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={15} /> Crear Plan Anual
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateNewAnnual}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#0284c7',
                    color: '#ffffff',
                    padding: '0.65rem 1.35rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <Plus size={17} /> Crear Primera Planificación Anual
                </button>
              )}
            </div>
          )}

          {/* VISTA DEL PLAN ANUAL (TABLA MINEDUC EXACTA) */}
          {(visiblePlans.length > 0 || isEditingAnnual) && (
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
                  {visiblePlans.length > 0 && !isEditingAnnual && (
                    <>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        Planificación Activa:
                      </label>
                      <select
                        value={selectedPlan?.id || ''}
                        onChange={e => {
                          const p = visiblePlans.find(plan => plan.id === e.target.value);
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
                        {visiblePlans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.course_name} — {p.subject_name} ({p.teacher_name})
                          </option>
                        ))}
                      </select>
                    </>
                  )}

                  {!isEditingAnnual && viewMode !== 'readonly' && (
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
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {viewMode !== 'readonly' && (
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
                  )}

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

                  {viewMode !== 'readonly' && (
                    <>
                      {isEditingAnnual ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingAnnual(false);
                              if (selectedPlan) selectAnnualPlan(selectedPlan);
                            }}
                            style={{
                              padding: '0.55rem 0.9rem',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              background: '#f1f5f9',
                              color: '#475569',
                              fontWeight: 700,
                              fontSize: '0.82rem',
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
                            {savingAnnual ? 'Guardando...' : 'Guardar Plan Anual'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setIsEditingAnnual(true)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              background: '#f8fafc',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              padding: '0.55rem 0.95rem',
                              borderRadius: '10px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <Edit3 size={15} />
                            Editar Plan
                          </button>

                          {/* BOTÓN TRASPASAR A DOCENTE DE REEMPLAZO O CAMBIAR TITULAR */}
                          {selectedPlan && (isAdmin || isUserMatch(selectedPlan.teacher_name)) && (
                            <button
                              type="button"
                              onClick={handleOpenTransferModal}
                              title="Asignar reemplazo por licencia médica o transferir curso"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                padding: '0.55rem 0.95rem',
                                borderRadius: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              <ArrowRightLeft size={15} />
                              Traspasar / Reemplazo
                            </button>
                          )}

                          {/* BOTÓN ELIMINAR PLAN ANUAL */}
                          {selectedPlan && (isAdmin || isUserMatch(selectedPlan.teacher_name)) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnualPlan(selectedPlan.id)}
                              title="Eliminar este plan anual y sus clases"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '0.55rem 0.85rem',
                                borderRadius: '10px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={15} />
                              Eliminar Plan
                            </button>
                          )}
                        </div>
                      )}
                    </>
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
                  margin: '0 0 1.25rem 0',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  PLANIFICACIÓN ANUAL {annualForm.academic_year}
                </h3>

                {/* ALERTA DE DOCENTE EN REEMPLAZO POR LICENCIA */}
                {selectedPlan?.substitute_teacher_name && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#fef3c7',
                    border: '1.5px solid #f59e0b',
                    borderRadius: '10px',
                    padding: '0.65rem 1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e', fontSize: '0.84rem', fontWeight: 800 }}>
                      <ArrowRightLeft size={16} />
                      <span>
                        En Reemplazo Docente: <strong>Prof. {selectedPlan.substitute_teacher_name}</strong> (Docente Titular: Prof. {selectedPlan.teacher_name})
                      </span>
                    </div>
                    {viewMode !== 'readonly' && (isAdmin || isUserMatch(selectedPlan.teacher_name)) && (
                      <button
                        type="button"
                        onClick={handleRemoveSubstitute}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #d97706',
                          color: '#b45309',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Reanudar Titularidad
                      </button>
                    )}
                  </div>
                )}

                {/* ENCABEZADO MINEDUC: TABLA DE IDENTIFICACIÓN */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '1.5rem',
                  border: '1.5px solid #000000'
                }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '150px', fontWeight: 800, padding: '8px 12px', border: '1px solid #000000', background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.82rem' }}>
                        Docente:
                      </td>
                      <td style={{ padding: '8px 12px', border: '1px solid #000000', fontSize: '0.86rem' }}>
                        {isEditingAnnual ? (
                          <input
                            type="text"
                            value={annualForm.teacher_name}
                            onChange={e => setAnnualForm({ ...annualForm, teacher_name: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        ) : (
                          <strong>{annualForm.teacher_name}</strong>
                        )}
                      </td>
                      <td style={{ width: '150px', fontWeight: 800, padding: '8px 12px', border: '1px solid #000000', background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.82rem' }}>
                        Semestre:
                      </td>
                      <td style={{ padding: '8px 12px', border: '1px solid #000000', fontSize: '0.86rem' }}>
                        {isEditingAnnual ? (
                          <select
                            value={annualForm.semester}
                            onChange={e => setAnnualForm({ ...annualForm, semester: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          >
                            <option value="PRIMER Y SEGUNDO SEMESTRE">PRIMER Y SEGUNDO SEMESTRE</option>
                            <option value="PRIMER SEMESTRE">PRIMER SEMESTRE</option>
                            <option value="SEGUNDO SEMESTRE">SEGUNDO SEMESTRE</option>
                          </select>
                        ) : (
                          annualForm.semester
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: '8px 12px', border: '1px solid #000000', background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.82rem' }}>
                        Curso:
                      </td>
                      <td style={{ padding: '8px 12px', border: '1px solid #000000', fontSize: '0.86rem' }}>
                        {isEditingAnnual ? (
                          <select
                            value={annualForm.course_name}
                            onChange={e => setAnnualForm({ ...annualForm, course_name: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          >
                            <option value="">Selecciona Curso...</option>
                            {coursesList.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <strong>{annualForm.course_name}</strong>
                        )}
                      </td>
                      <td style={{ fontWeight: 800, padding: '8px 12px', border: '1px solid #000000', background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.82rem' }}>
                        Asignatura:
                      </td>
                      <td style={{ padding: '8px 12px', border: '1px solid #000000', fontSize: '0.86rem' }}>
                        {isEditingAnnual ? (
                          <select
                            value={annualForm.subject_name}
                            onChange={e => setAnnualForm({ ...annualForm, subject_name: e.target.value })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          >
                            <option value="">Selecciona Asignatura...</option>
                            {subjectsList.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <strong>{annualForm.subject_name}</strong>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 800, padding: '8px 12px', border: '1px solid #000000', background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.82rem' }}>
                        Horas Pedagógicas:
                      </td>
                      <td style={{ padding: '8px 12px', border: '1px solid #000000', fontSize: '0.86rem' }}>
                        {isEditingAnnual ? (
                          <input
                            type="number"
                            min={1}
                            max={44}
                            value={annualForm.total_hours}
                            onChange={e => setAnnualForm({ ...annualForm, total_hours: parseInt(e.target.value, 10) || 4 })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          />
                        ) : (
                          `${annualForm.total_hours || 4} Horas Semanales`
                        )}
                      </td>
                      <td style={{ fontWeight: 800, padding: '8px 12px', border: '1px solid #000000', background: '#f8fafc', textTransform: 'uppercase', fontSize: '0.82rem' }}>
                        Clases por Semana:
                      </td>
                      <td style={{ padding: '8px 12px', border: '1px solid #000000', fontSize: '0.86rem' }}>
                        {isEditingAnnual ? (
                          <select
                            value={annualForm.weekly_sessions || 1}
                            onChange={e => setAnnualForm({ ...annualForm, weekly_sessions: parseInt(e.target.value, 10) || 1 })}
                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700 }}
                          >
                            <option value={1}>1 clase semanal (1 sesión)</option>
                            <option value={2}>2 clases semanales (2 sesiones)</option>
                            <option value={3}>3 clases semanales (3 sesiones)</option>
                            <option value={4}>4 clases semanales (4 sesiones)</option>
                            <option value={5}>5 clases semanales (5 sesiones)</option>
                          </select>
                        ) : (
                          <strong>{annualForm.weekly_sessions || 1} clase(s) a la semana</strong>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* MATRIZ DE UNIDADES (TABLA PRINCIPAL) */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1.5px solid #000000'
                  }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', width: '70px', textAlign: 'center' }}>
                          N° Unidad
                        </th>
                        <th style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', width: '220px' }}>
                          Nombre de la Unidad
                        </th>
                        <th style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          Objetivos de Aprendizaje (OA)
                        </th>
                        <th style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', width: '250px' }}>
                          Instrumentos de Evaluación
                        </th>
                        <th style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', width: '120px', textAlign: 'center' }}>
                          Temporalidad
                        </th>
                        {!isEditingAnnual && (
                          <th style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', width: '130px', textAlign: 'center' }}>
                            Unidad Didáctica
                          </th>
                        )}
                        {isEditingAnnual && (
                          <th style={{ border: '1px solid #000000', padding: '8px', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>
                            Acción
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {annualForm.units.map((unit, index) => (
                        <tr key={unit.id || index}>
                          <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', fontWeight: 800, verticalAlign: 'top' }}>
                            {unit.unit_number || index + 1}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '8px', verticalAlign: 'top' }}>
                            {isEditingAnnual ? (
                              <textarea
                                rows={3}
                                value={unit.unit_name}
                                onChange={e => handleUnitChange(index, 'unit_name', e.target.value)}
                                style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem' }}
                              />
                            ) : (
                              <strong>{unit.unit_name}</strong>
                            )}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '8px', verticalAlign: 'top', lineHeight: 1.4 }}>
                            {isEditingAnnual ? (
                              <div>
                                <textarea
                                  rows={5}
                                  value={unit.learning_goals}
                                  onChange={e => handleUnitChange(index, 'learning_goals', e.target.value)}
                                  placeholder="OA1: Describir y fundamentar... OA2: Resolver problemas..."
                                  style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => openOaPicker(index)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    marginTop: '4px',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    border: '1px solid #bae6fd',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Search size={13} />
                                  Seleccionar OA del Catálogo
                                </button>
                              </div>
                            ) : (
                              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem' }}>
                                {unit.learning_goals || 'Sin OAs definidos'}
                              </div>
                            )}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '8px', verticalAlign: 'top', fontSize: '0.82rem', lineHeight: 1.4 }}>
                            {isEditingAnnual ? (
                              <textarea
                                rows={4}
                                value={unit.evaluation_instruments}
                                onChange={e => handleUnitChange(index, 'evaluation_instruments', e.target.value)}
                                placeholder="Evaluación diagnóstica; Prueba escrita; Rúbrica..."
                                style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem' }}
                              />
                            ) : (
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {unit.evaluation_instruments || 'Evaluación continua'}
                              </div>
                            )}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', verticalAlign: 'top' }}>
                            {isEditingAnnual ? (
                              <div>
                                <input
                                  type="text"
                                  value={unit.temporality}
                                  onChange={e => handleUnitChange(index, 'temporality', e.target.value)}
                                  placeholder="Ej: 2 Semanas"
                                  style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', textAlign: 'center' }}
                                />
                                <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                                  ({parseUnitWeeks(unit.temporality) * (annualForm.weekly_sessions || 1)} Clases)
                                </div>
                              </div>
                            ) : (
                              <div>
                                <strong>{unit.temporality || '8 Semanas'}</strong>
                                <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700, marginTop: '2px' }}>
                                  ({parseUnitWeeks(unit.temporality) * (annualForm.weekly_sessions || 1)} Clases est.)
                                </div>
                              </div>
                            )}
                          </td>
                          {!isEditingAnnual && (
                            <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                onClick={() => handleSelectUnitForDetail(index)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  border: '1px solid #bae6fd',
                                  padding: '0.4rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Planificar Unidad →
                              </button>
                            </td>
                          )}
                          {isEditingAnnual && (
                            <td style={{ border: '1px solid #000000', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveUnitRow(index)}
                                title="Eliminar fila"
                                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 6px', cursor: 'pointer' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* BOTÓN AGREGAR UNIDAD EN MODO EDICIÓN */}
                {isEditingAnnual && (
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={handleAddUnitRow}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#f1f5f9',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        padding: '0.55rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={16} /> Agregar Unidad
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 2: PLANIFICACIÓN POR UNIDAD (MINEDUC)                         */}
      {/* ===================================================================== */}
      {activeTab === 'units' && (
        <div>
          {!selectedPlan && annualForm.units.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px dashed #cbd5e1',
              padding: '3rem 2rem',
              textAlign: 'center'
            }}>
              <BookOpen size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem' }}>
                Primero selecciona o crea una Planificación Anual
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                Para planificar una unidad didáctica, debes contar con un Plan Anual y sus unidades temáticas asignadas.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('annual')}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Ir a Planificación Anual
              </button>
            </div>
          ) : (
            <div>
              {/* SELECTOR SUPERIOR DE UNIDADES Y DATOS GENERALES */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.25rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '1rem',
                  paddingBottom: '0.85rem',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Asignatura & Curso Oficial:
                    </span>
                    <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                      {selectedPlan?.course_name || annualForm.course_name} — {selectedPlan?.subject_name || annualForm.subject_name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Docente: <strong>{selectedPlan?.teacher_name || annualForm.teacher_name || user?.name}</strong> • {selectedPlan?.semester || annualForm.semester}
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN DE LA UNIDAD */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={generatingUnitAi}
                      onClick={handleGenerateUnitWithAi}
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
                      {generatingUnitAi ? 'Generando con IA...' : 'Completar Unidad con IA'}
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintUnitReport}
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
                      Imprimir Ficha Oficial
                    </button>

                    <button
                      type="button"
                      disabled={savingUnit}
                      onClick={handleSaveUnit}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: '#059669',
                        color: '#ffffff',
                        padding: '0.55rem 1.25rem',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                      }}
                    >
                      <Save size={16} />
                      {savingUnit ? 'Guardando...' : 'Guardar Planificación'}
                    </button>
                  </div>
                </div>

                {/* SELECTOR EN PESTAÑAS DE CADA UNIDAD */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.45rem', textTransform: 'uppercase' }}>
                    Seleccionar Unidad a Planificar:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(annualForm.units || []).map((u, idx) => {
                      const isSelected = selectedUnitIndex === idx;
                      return (
                        <button
                          key={u.id || idx}
                          type="button"
                          onClick={() => handleSelectUnitForDetail(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 0.85rem',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                            background: isSelected ? '#eff6ff' : '#ffffff',
                            color: isSelected ? '#0369a1' : '#334155',
                            fontWeight: isSelected ? 900 : 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span>{u.unit_name ? (u.unit_name.length > 25 ? u.unit_name.slice(0, 25) + '...' : u.unit_name) : `Unidad ${idx + 1}`}</span>
                          <span style={{
                            background: isSelected ? '#0284c7' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#475569',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '999px'
                          }}>
                            {u.class_count || 8} cl / {u.hours_count || 16} h
                          </span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={handleAddNewUnitToPlan}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px dashed #0284c7',
                        background: '#f0f9ff',
                        color: '#0284c7',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={15} />
                      Agregar Unidad
                    </button>
                  </div>
                </div>
              </div>

              {/* FORMULARIO DE DETALLE DE LA UNIDAD */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #000000',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
              }}>
                <div style={{
                  borderBottom: '2px solid #000000',
                  paddingBottom: '0.75rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase', color: '#000000' }}>
                      Planificación Didáctica • {unitForm.unit_name || `Unidad ${selectedUnitIndex + 1}`}
                    </h3>
                    <span style={{ fontSize: '0.76rem', color: '#555555' }}>
                      Estándar Marco de la Buena Enseñanza y Bases Curriculares MINEDUC
                    </span>
                  </div>
                  <span style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 900
                  }}>
                    UNIDAD N° {unitForm.unit_number || selectedUnitIndex + 1}
                  </span>
                </div>

                {/* FILA 1: DATOS CLAVE Y ESTIMACIONES */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '0.35rem' }}>
                      Título o Nombre de la Unidad: *
                    </label>
                    <input
                      type="text"
                      value={unitForm.unit_name}
                      onChange={e => setUnitForm({ ...unitForm, unit_name: e.target.value })}
                      placeholder="Ej: Unidad 1: Nivelación y Diagnóstico Inicial"
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '0.35rem' }}>
                      N° de Clases (Estimadas): *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={unitForm.class_count || 8}
                      onChange={e => setUnitForm({ ...unitForm, class_count: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '0.35rem' }}>
                      N° de Horas Pedagógicas: *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={unitForm.hours_count || 16}
                      onChange={e => setUnitForm({ ...unitForm, hours_count: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '0.35rem' }}>
                      Temporalidad (Semanas):
                    </label>
                    <input
                      type="text"
                      value={unitForm.temporality || '8 Semanas'}
                      onChange={e => setUnitForm({ ...unitForm, temporality: e.target.value })}
                      placeholder="Ej: 8 Semanas"
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', marginBottom: '0.35rem' }}>
                      Fecha Estimada (Período): *
                    </label>
                    <input
                      type="text"
                      value={unitForm.estimated_date || ''}
                      onChange={e => setUnitForm({ ...unitForm, estimated_date: e.target.value })}
                      placeholder="Ej: 15 de Marzo al 30 de Abril 2026"
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* FILA 2: OBJETIVO DE LA UNIDAD Y OBJETIVOS DE APRENDIZAJE */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.4rem' }}>
                      🎯 Objetivo de la Unidad (Propósito Formativo): *
                    </label>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.73rem', color: '#64748b' }}>
                      Describe la meta global, conceptos articuladores y habilidades que los estudiantes dominarán al finalizar la unidad.
                    </p>
                    <textarea
                      rows={5}
                      value={unitForm.unit_goal || ''}
                      onChange={e => setUnitForm({ ...unitForm, unit_goal: e.target.value })}
                      placeholder="Ej: Comprender y aplicar los principios fundamentales de la disciplina a través de la resolución de problemas prácticos y el análisis crítico..."
                      style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', lineHeight: 1.45 }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
                        📚 Objetivos de Aprendizaje (OA MINEDUC): *
                      </label>
                      <button
                        type="button"
                        onClick={openOaPickerForUnitTab}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        <Search size={13} />
                        Catálogo OAs
                      </button>
                    </div>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.73rem', color: '#64748b' }}>
                      OAs basales y complementarios seleccionados para esta unidad didáctica.
                    </p>
                    <textarea
                      rows={5}
                      value={unitForm.learning_goals || ''}
                      onChange={e => setUnitForm({ ...unitForm, learning_goals: e.target.value })}
                      placeholder="OA 1: Describir y fundamentar...&#10;&#10;OA 3: Resolver problemas contextualizados..."
                      style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', lineHeight: 1.45 }}
                    />
                  </div>
                </div>

                {/* FILA 3: TRANSVERSALES Y RECURSOS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.4rem' }}>
                      ⭐ Objetivos de Aprendizaje Transversales (OAT): *
                    </label>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.73rem', color: '#64748b' }}>
                      Valores institucionales, actitudes, rigor técnico-profesional y convivencia formativa.
                    </p>
                    <textarea
                      rows={4}
                      value={unitForm.transversal_goals || ''}
                      onChange={e => setUnitForm({ ...unitForm, transversal_goals: e.target.value })}
                      placeholder="Ej: Demostrar puntualidad, rigor en el uso de herramientas, trabajo colaborativo y respeto por las normas de seguridad..."
                      style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', lineHeight: 1.45 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.4rem' }}>
                      📦 Recursos Didácticos, Tecnológicos y de Taller: *
                    </label>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.73rem', color: '#64748b' }}>
                      Materiales impresos, proyectores, computadores, laboratorio, herramientas TP y software.
                    </p>
                    <textarea
                      rows={4}
                      value={unitForm.resources || ''}
                      onChange={e => setUnitForm({ ...unitForm, resources: e.target.value })}
                      placeholder="Ej: Guías de aprendizaje impresas, proyector multimedia, textos escolares MINEDUC, software especializado, instrumental de laboratorio..."
                      style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', lineHeight: 1.45 }}
                    />
                  </div>
                </div>

                {/* FILA 4: EVALUACIONES E INSTRUMENTOS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.4rem' }}>
                      📝 Tipo de Evaluación: *
                    </label>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.73rem', color: '#64748b' }}>
                      Modalidad pedagógica de valoración de los aprendizajes.
                    </p>
                    <select
                      value={unitForm.evaluation_type || 'Formativa y Sumativa'}
                      onChange={e => setUnitForm({ ...unitForm, evaluation_type: e.target.value })}
                      style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.5rem' }}
                    >
                      <option value="Diagnóstica, Formativa y Sumativa">Diagnóstica, Formativa y Sumativa</option>
                      <option value="Formativa y Sumativa">Formativa y Sumativa</option>
                      <option value="Evaluación Formativa Continua">Evaluación Formativa Continua</option>
                      <option value="Evaluación Sumativa y de Desempeño Práctico">Evaluación Sumativa y de Desempeño Práctico</option>
                      <option value="Coevaluación y Autoevaluación">Coevaluación y Autoevaluación</option>
                    </select>
                    <input
                      type="text"
                      value={unitForm.evaluation_type}
                      onChange={e => setUnitForm({ ...unitForm, evaluation_type: e.target.value })}
                      placeholder="O especifica un tipo personalizado..."
                      style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', marginBottom: '0.4rem' }}>
                      📋 Instrumentos de Evaluación: *
                    </label>
                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.73rem', color: '#64748b' }}>
                      Rúbricas analíticas, listas de cotejo, pruebas escritas o pautas de observación.
                    </p>
                    <textarea
                      rows={4}
                      value={unitForm.evaluation_instruments || ''}
                      onChange={e => setUnitForm({ ...unitForm, evaluation_instruments: e.target.value })}
                      placeholder="Ej: Evaluación diagnóstica inicial; Rúbrica de proceso para guías grupales; Prueba sumativa escrita; Pauta de cotejo para taller práctico..."
                      style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', lineHeight: 1.45 }}
                    />
                  </div>
                </div>

                {/* BOTÓN INFERIOR GUARDAR */}
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={handlePrintUnitReport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#f1f5f9',
                      color: '#0f172a',
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={16} /> Imprimir Ficha
                  </button>

                  <button
                    type="button"
                    disabled={savingUnit}
                    onClick={handleSaveUnit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background: '#0284c7',
                      color: '#ffffff',
                      padding: '0.6rem 1.5rem',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                    }}
                  >
                    <Save size={16} />
                    {savingUnit ? 'Guardando...' : 'Guardar Planificación de Unidad'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 3: PLANIFICACIÓN CLASE A CLASE (1X CADA SESIÓN)                */}
      {/* ===================================================================== */}
      {activeTab === 'lessons' && (
        <div>
          {!selectedPlan ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px dashed #cbd5e1',
              padding: '3rem 2rem',
              textAlign: 'center'
            }}>
              <BookOpen size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem' }}>
                Primero selecciona o crea una Planificación Anual
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                Las clases deben anclarse a una asignatura y curso con Plan Anual para medir la Cobertura Curricular oficial.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('annual')}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ← Ir a Planificación Anual
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* PANEL IZQUIERDO: LISTA DE CLASES DEL PLAN CON TOGGLE RÁPIDO */}
              <div style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                    Clases Planificadas ({lessonPlans.length})
                  </h4>
                  {viewMode !== 'readonly' && (
                    <button
                      type="button"
                      onClick={handleAddNewClass}
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
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#64748b', marginBottom: '0.3rem' }}>
                    Plan Anual Activo:
                  </label>
                  <select
                    value={selectedPlan?.id || ''}
                    onChange={e => {
                      const p = visiblePlans.find(plan => plan.id === e.target.value);
                      if (p) selectAnnualPlan(p);
                    }}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    {visiblePlans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.course_name} — {p.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* LISTADO DE CLASES ORGANIZADAS POR UNIDAD TEMÁTICA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '620px', overflowY: 'auto' }}>
                  {selectedPlan?.units && selectedPlan.units.length > 0 ? (
                    (() => {
                      const units = selectedPlan.units;
                      const unassignedClasses = lessonPlans.filter(l =>
                        !units.some(u => (u.id && l.unit_id === u.id) || (u.unit_name && l.unit_name === u.unit_name))
                      );

                      return units.map((unit, uIdx) => {
                        const directClasses = lessonPlans.filter(l => (unit.id && l.unit_id === unit.id) || l.unit_name === unit.unit_name);
                        const unitClasses = uIdx === 0 && unassignedClasses.length > 0
                          ? [...directClasses, ...unassignedClasses.filter(uc => !directClasses.some(dc => dc.id === uc.id))]
                          : directClasses;
                        const maxForUnit = getMaxClassesForUnit(unit, selectedPlan.weekly_sessions);
                        const isCompleted = unitClasses.length >= maxForUnit;
                        const cleanUnitTitle = (unit.unit_name || '').replace(new RegExp(`^Unidad\\s*${unit.unit_number || uIdx + 1}\\s*[:\\-]?\\s*`, 'i'), '');

                        return (
                          <div key={unit.id || uIdx} style={{
                            border: isCompleted ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            background: isCompleted ? '#f0fdf4' : '#ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                          }}>
                            {/* CABECERA DE LA UNIDAD */}
                            <div style={{
                              padding: '0.5rem 0.75rem',
                              background: isCompleted ? '#dcfce7' : '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a' }}>
                                Unidad {unit.unit_number || uIdx + 1}: {cleanUnitTitle || unit.unit_name}
                              </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              padding: '0.12rem 0.45rem',
                              borderRadius: '999px',
                              background: isCompleted ? '#16a34a' : '#0284c7',
                              color: '#ffffff',
                              whiteSpace: 'nowrap'
                            }}>
                              {unitClasses.length} / {maxForUnit} clases
                            </span>
                          </div>

                          {/* CLASES DE LA UNIDAD */}
                          <div style={{ padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {unitClasses.map((lesson) => {
                              const isSelected = lessonForm.class_number === lesson.class_number;
                              const isRealizada = lesson.status === 'realizada';

                              return (
                                <div
                                  key={lesson.id || lesson.class_number}
                                  onClick={() => setLessonForm(lesson)}
                                  style={{
                                    padding: '0.65rem 0.75rem',
                                    borderRadius: '8px',
                                    border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                                    background: isSelected ? '#f0f9ff' : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '4px' }}>
                                    <span style={{
                                      background: isSelected ? '#0284c7' : '#e2e8f0',
                                      color: isSelected ? '#ffffff' : '#334155',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 900
                                    }}>
                                      Clase N° {lesson.class_number}
                                    </span>

                                    <button
                                      type="button"
                                      disabled={viewMode === 'readonly'}
                                      onClick={(e) => {
                                        if (viewMode === 'readonly') return;
                                        handleToggleLessonStatus(lesson, e);
                                      }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '0.12rem 0.45rem',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: isRealizada ? '#dcfce7' : '#fef3c7',
                                        color: isRealizada ? '#15803d' : '#b45309',
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        cursor: viewMode === 'readonly' ? 'default' : 'pointer'
                                      }}
                                    >
                                      {isRealizada ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                      {isRealizada ? 'Realizada' : 'Por Realizar'}
                                    </button>
                                  </div>

                                  {lesson.oa_codes && (
                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.2rem' }}>
                                      OAs: {lesson.oa_codes}
                                    </div>
                                  )}

                                  <p style={{ margin: 0, fontSize: '0.76rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {lesson.class_goal || 'Sin objetivo redactado aún'}
                                  </p>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                      {lesson.class_date ? new Date(lesson.class_date).toLocaleDateString('es-CL') : 'Sin fecha'}
                                    </span>
                                    {lesson.id && viewMode !== 'readonly' && (isAdmin || isUserMatch(lesson.teacher_name) || isUserMatch(lesson.substitute_teacher_name)) && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteLessonPlan(lesson.id!, e)}
                                        title="Eliminar clase"
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {unitClasses.length === 0 && (
                              <div style={{ textAlign: 'center', padding: '0.5rem', color: '#94a3b8', fontSize: '0.72rem' }}>
                                Sin clases planificadas aún para esta unidad.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
                  ) : (
                    lessonPlans.map((lesson, idx) => {
                      const isSelected = lessonForm.class_number === lesson.class_number;
                      const isRealizada = lesson.status === 'realizada';

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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '4px' }}>
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

                            <button
                              type="button"
                              disabled={viewMode === 'readonly'}
                              onClick={(e) => {
                                if (viewMode === 'readonly') return;
                                handleToggleLessonStatus(lesson, e);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '0.18rem 0.5rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: isRealizada ? '#dcfce7' : '#fef3c7',
                                color: isRealizada ? '#15803d' : '#b45309',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                cursor: viewMode === 'readonly' ? 'default' : 'pointer'
                              }}
                            >
                              {isRealizada ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {isRealizada ? 'Realizada' : 'Por Realizar'}
                            </button>
                          </div>

                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                            {lesson.class_goal || 'Sin objetivo redactado aún'}
                          </p>
                        </div>
                      );
                    })
                  )}

                  {lessonPlans.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                      Aún no hay clases registradas. Haz clic en "+ Nueva Clase" para crear la primera clase de la Unidad 1.
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL DERECHO: FORMULARIO CLASE A CLASE (3 MOMENTOS + TICKET SALIDA + DUA) */}
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

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {viewMode !== 'readonly' && (
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={() => handleGenerateAiLesson()}
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
                        {generatingAi ? 'Generando...' : 'Sugerir Clase con IA'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handlePrintLessonPlan(lessonForm)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={15} />
                      Imprimir Ficha & Ticket
                    </button>

                    {viewMode !== 'readonly' && (
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
                    )}
                  </div>
                </div>

                {/* SELECTOR DE UNIDAD TEMÁTICA A LA QUE PERTENECE ESTA CLASE */}
                {selectedPlan && selectedPlan.units && selectedPlan.units.length > 0 && (
                  <div style={{ marginBottom: '1rem', background: '#f0f9ff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0369a1' }}>
                        🏷️ Unidad Temática a la que pertenece esta Clase:
                      </label>
                      {(() => {
                        const activeUnit = selectedPlan.units.find(u => (u.id && u.id === lessonForm.unit_id) || u.unit_name === lessonForm.unit_name) || selectedPlan.units[0];
                        const count = lessonPlans.filter(l => (activeUnit.id && l.unit_id === activeUnit.id) || l.unit_name === activeUnit.unit_name).length;
                        const maxC = getMaxClassesForUnit(activeUnit, selectedPlan.weekly_sessions || 1);
                        return (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: count >= maxC ? '#b45309' : '#0284c7', background: '#ffffff', padding: '0.15rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            {count} de {maxC} Clases ({parseUnitWeeks(activeUnit.temporality)} Semanas)
                          </span>
                        );
                      })()}
                    </div>
                    <select
                      value={lessonForm.unit_id || lessonForm.unit_name || ''}
                      onChange={e => {
                        const val = e.target.value;
                        const foundUnit = selectedPlan.units?.find(u => u.id === val || u.unit_name === val);
                        if (foundUnit) {
                          setLessonForm(prev => ({
                            ...prev,
                            unit_id: foundUnit.id || foundUnit.unit_name,
                            unit_name: foundUnit.unit_name
                          }));
                        }
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #0284c7', fontSize: '0.84rem', fontWeight: 700, background: '#ffffff' }}
                    >
                      {selectedPlan.units.map((u, i) => {
                        const count = lessonPlans.filter(l => (u.id && l.unit_id === u.id) || l.unit_name === u.unit_name).length;
                        const maxC = getMaxClassesForUnit(u, selectedPlan.weekly_sessions || 1);
                        const cleanUnitName = (u.unit_name || '').replace(new RegExp(`^Unidad\\s*${u.unit_number || i + 1}\\s*[:\\-]?\\s*`, 'i'), '');
                        return (
                          <option key={u.id || i} value={u.id || u.unit_name}>
                            Unidad {u.unit_number || i + 1}: {cleanUnitName || u.unit_name} — ({count}/{maxC} Clases • {u.temporality || '2 Semanas'})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* FILA DE CONTROLES: N° CLASE, FECHA Y ESTADO (REALIZADA VS POR REALIZAR) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                      N° de Clase:
                    </label>
                    <input
                      type="number"
                      required
                      value={lessonForm.class_number}
                      onChange={e => setLessonForm({ ...lessonForm, class_number: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                      Fecha de la Clase:
                    </label>
                    <input
                      type="date"
                      value={lessonForm.class_date || ''}
                      onChange={e => setLessonForm({ ...lessonForm, class_date: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                      Estado de la Clase:
                    </label>
                    <button
                      type="button"
                      onClick={() => setLessonForm(prev => ({
                        ...prev,
                        status: prev.status === 'realizada' ? 'por_realizar' : 'realizada'
                      }))}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: lessonForm.status === 'realizada' ? '#dcfce7' : '#fef3c7',
                        color: lessonForm.status === 'realizada' ? '#15803d' : '#b45309',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {lessonForm.status === 'realizada' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      {lessonForm.status === 'realizada' ? '✓ Clase Realizada' : '⏳ Por Realizar (Planificada)'}
                    </button>
                  </div>
                </div>

                {/* SELECTOR DE OAs A TRABAJAR EN ESTA CLASE */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                      📚 Objetivos de Aprendizaje (OA) que se abordarán en esta Clase:
                    </label>
                    {availableOAsForClass.unitOas.length > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 800, background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        ⭐ {availableOAsForClass.unitOas.length} OAs sugeridos de esta Unidad
                      </span>
                    )}
                  </div>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Selecciona los OAs del currículum que se trabajarán. Cada OA marcado como realizado sumará automáticamente a la Cobertura Curricular.
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', maxHeight: '140px', overflowY: 'auto', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {availableOAsForClass.allOas.map((oa) => {
                      const isSelected = (lessonForm.oa_codes || '').includes(oa.oa_code);
                      return (
                        <button
                          key={oa.oa_code}
                          type="button"
                          onClick={() => {
                            const currentCodes = (lessonForm.oa_codes || '').split(',').map(c => c.trim()).filter(Boolean);
                            let nextCodes: string[];
                            if (currentCodes.includes(oa.oa_code)) {
                              nextCodes = currentCodes.filter(c => c !== oa.oa_code);
                            } else {
                              nextCodes = [...currentCodes, oa.oa_code];
                            }
                            setLessonForm(prev => ({
                              ...prev,
                              oa_codes: nextCodes.join(', ')
                            }));
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.28rem 0.65rem',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid #0284c7' : oa.isUnitOa ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                            background: isSelected ? '#0284c7' : oa.isUnitOa ? '#e0f2fe' : '#ffffff',
                            color: isSelected ? '#ffffff' : oa.isUnitOa ? '#0369a1' : '#334155',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                          title={oa.oa_title}
                        >
                          {isSelected && <Check size={12} />}
                          {oa.oa_code} {oa.isUnitOa && !isSelected && '★'}
                        </button>
                      );
                    })}
                  </div>
                  {lessonForm.oa_codes && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', color: '#0369a1', fontWeight: 700 }}>
                      OAs seleccionados para esta clase: <strong>{lessonForm.oa_codes}</strong>
                    </div>
                  )}
                </div>

                {/* BLOQUE ASISTENTE IA: GENERADOR DE IDEAS Y ACTIVIDADES PEDAGÓGICAS */}
                <div style={{
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)',
                  borderRadius: '12px',
                  border: '1.5px solid #c7d2fe',
                  padding: '1.1rem 1.25rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 2px 6px rgba(99, 102, 241, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>✨</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: '#4338ca' }}>
                          Asistente IA: Generador de Ideas Pedagógicas y Actividades
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>
                          Complemento inteligente para optimizar el tiempo docente y redactar actividades didácticas según los OAs seleccionados
                        </span>
                      </div>
                    </div>
                    {generatingAi && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={13} className="spin-animation" /> Diseñando propuesta con IA...
                      </span>
                    )}
                  </div>

                  {/* INPUT PARA ESCRIBIR LA IDEA / ACTIVIDAD DE LA CLASE */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#312e81', marginBottom: '0.3rem' }}>
                      💡 Describe brevemente tu idea de actividad o dinámica de clase (opcional pero recomendado):
                    </label>
                    <textarea
                      rows={2}
                      value={aiActivityIdea}
                      onChange={e => setAiActivityIdea(e.target.value)}
                      placeholder="Ej: Trabajo en parejas resolviendo una guía contextualizada al taller con debate grupal final y ticket de salida..."
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1.5px solid #a5b4fc',
                        fontSize: '0.82rem',
                        lineHeight: 1.4,
                        background: '#ffffff',
                        color: '#1e1b4b'
                      }}
                    />
                  </div>

                  {/* BOTONES DE ACCIÓN RÁPIDA DE IA */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={() => handleGenerateAiLesson()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: '#ffffff',
                        padding: '0.45rem 1rem',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 900,
                        cursor: generatingAi ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)'
                      }}
                    >
                      <Sparkles size={15} />
                      {generatingAi ? 'Generando...' : '✨ Generar Planificación Completa con IA'}
                    </button>

                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={() => handleGenerateAiLesson('suggest_goal')}
                      style={{
                        padding: '0.38rem 0.75rem',
                        borderRadius: '7px',
                        border: '1px solid #c7d2fe',
                        background: '#ffffff',
                        color: '#4338ca',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: generatingAi ? 'not-allowed' : 'pointer'
                      }}
                    >
                      🎯 Sugerir Objetivo
                    </button>

                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={() => handleGenerateAiLesson('suggest_moments')}
                      style={{
                        padding: '0.38rem 0.75rem',
                        borderRadius: '7px',
                        border: '1px solid #c7d2fe',
                        background: '#ffffff',
                        color: '#4338ca',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: generatingAi ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ⏱️ 3 Momentos Didácticos
                    </button>

                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={() => handleGenerateAiLesson('suggest_ticket')}
                      style={{
                        padding: '0.38rem 0.75rem',
                        borderRadius: '7px',
                        border: '1px solid #fed7aa',
                        background: '#fffbeb',
                        color: '#b45309',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: generatingAi ? 'not-allowed' : 'pointer'
                      }}
                    >
                      🎫 Ticket de Salida
                    </button>

                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={() => handleGenerateAiLesson('suggest_dua')}
                      style={{
                        padding: '0.38rem 0.75rem',
                        borderRadius: '7px',
                        border: '1px solid #bbf7d0',
                        background: '#f0fdf4',
                        color: '#15803d',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        cursor: generatingAi ? 'not-allowed' : 'pointer'
                      }}
                    >
                      🌱 DUA e Inclusión
                    </button>
                  </div>
                </div>

                {/* OBJETIVO DE LA CLASE */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                      🎯 Objetivo Específico de la Clase (Bloom): *
                    </label>
                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={() => handleGenerateAiLesson('suggest_goal')}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Sparkles size={11} color="#6366f1" /> Sugerir con IA
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={lessonForm.class_goal}
                    onChange={e => setLessonForm({ ...lessonForm, class_goal: e.target.value })}
                    placeholder="Ej: Aplicar modelos y procedimientos guiados para resolver problemas contextualizados..."
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
                    Estructura Didáctica de la Clase (Estándar de los 3 Momentos)
                  </h4>

                  {/* 1. INICIO */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                        🟡 1. Inicio de la Clase (Aprox. 15 minutos):
                      </label>
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={() => handleGenerateAiLesson('suggest_moments')}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Sparkles size={11} color="#6366f1" /> Sugerir con IA
                      </button>
                    </div>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                        🔵 2. Desarrollo de la Clase (Aprox. 60 minutos):
                      </label>
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={() => handleGenerateAiLesson('suggest_moments')}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Sparkles size={11} color="#6366f1" /> Sugerir con IA
                      </button>
                    </div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.35rem' }}>
                      Modelamiento docente ("Yo hago"), práctica guiada ("Nosotros hacemos") y práctica independiente ("Tú haces").
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
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                        🟢 3. Cierre de la Clase (Aprox. 15 minutos):
                      </label>
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={() => handleGenerateAiLesson('suggest_moments')}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Sparkles size={11} color="#6366f1" /> Sugerir con IA
                      </button>
                    </div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.35rem' }}>
                      Síntesis de ideas clave y preguntas de metacognición (¿cómo aprendí hoy?).
                    </span>
                    <textarea
                      rows={3}
                      value={lessonForm.moment_closing}
                      onChange={e => setLessonForm({ ...lessonForm, moment_closing: e.target.value })}
                      placeholder="1. Síntesis grupal... 2. Metacognición: ¿Qué aprendimos hoy y qué nos costó más?..."
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>

                  {/* 4. TICKET DE SALIDA FORMATIVO */}
                  <div style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '10px',
                    padding: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e' }}>
                        🎫 Ticket de Salida de la Clase (Evaluación Formativa Rápida 1-3 preguntas):
                      </label>
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={() => handleGenerateAiLesson('suggest_ticket')}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fcd34d',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#b45309',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Sparkles size={11} color="#f59e0b" /> Sugerir con IA
                      </button>
                    </div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#b45309', marginBottom: '0.35rem' }}>
                      Preguntas breves para que el estudiante responda en 2 minutos al término de la clase y compruebe el logro del objetivo.
                    </span>
                    <textarea
                      rows={2}
                      value={lessonForm.ticket_salida || ''}
                      onChange={e => setLessonForm({ ...lessonForm, ticket_salida: e.target.value })}
                      placeholder="1. ¿Cuál es el concepto clave que aprendimos hoy?... 2. Resuelve este mini ejercicio breve..."
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #fcd34d', background: '#ffffff', fontSize: '0.82rem' }}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                        📊 Indicadores de Logro / Evaluación:
                      </label>
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={() => handleGenerateAiLesson('suggest_indicators')}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Sparkles size={11} color="#6366f1" /> Sugerir con IA
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={lessonForm.evaluation_indicators}
                      onChange={e => setLessonForm({ ...lessonForm, evaluation_indicators: e.target.value })}
                      placeholder="Identifica el concepto... Resuelve problemas con precisión... Justifica procedimientos..."
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857' }}>
                        🤝 Adecuaciones Inclusivas DUA / Programa PIE:
                      </label>
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={() => handleGenerateAiLesson('suggest_dua')}
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#047857',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <Sparkles size={11} color="#059669" /> Sugerir con IA
                      </button>
                    </div>
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
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
              Catálogo Oficial de Objetivos de Aprendizaje (OA) MINEDUC
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
              Consulta las Bases Curriculares nacionales para Educación Básica, Media y Técnico-Profesional (TP).
            </p>
          </div>

          {/* FILTROS DE BÚSQUEDA DEL CATÁLOGO */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '10px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Filtrar por Nivel / Grado:
              </label>
              <select
                value={catalogGradeFilter}
                onChange={e => {
                  setCatalogGradeFilter(e.target.value);
                  loadLearningGoals(e.target.value, catalogSubjectFilter, catalogSearch, catalogPriorityFilter);
                }}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="">Todos los Niveles</option>
                {coursesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Filtrar por Asignatura:
              </label>
              <select
                value={catalogSubjectFilter}
                onChange={e => {
                  setCatalogSubjectFilter(e.target.value);
                  loadLearningGoals(catalogGradeFilter, e.target.value, catalogSearch, catalogPriorityFilter);
                }}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="">Todas las Asignaturas</option>
                {subjectsList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Tipo de Objetivo (OA):
              </label>
              <select
                value={catalogPriorityFilter}
                onChange={e => {
                  const val = e.target.value as 'all' | 'prioritized' | 'standard';
                  setCatalogPriorityFilter(val);
                  loadLearningGoals(catalogGradeFilter, catalogSubjectFilter, catalogSearch, val);
                }}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}
              >
                <option value="all">Todos los OAs (Priorizados y Complementarios)</option>
                <option value="prioritized">★ Solo Priorizados / Basales</option>
                <option value="standard">Solo Complementarios / No Priorizados</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem' }}>
                Buscar por Código o Palabra Clave:
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  placeholder="Ej: OA 1, cálculo, ecuación..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      loadLearningGoals(catalogGradeFilter, catalogSubjectFilter, catalogSearch, catalogPriorityFilter);
                    }
                  }}
                  style={{ flex: 1, padding: '0.45rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={() => loadLearningGoals(catalogGradeFilter, catalogSubjectFilter, catalogSearch, catalogPriorityFilter)}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Search size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* LISTA DE OAs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {learningGoals.map(oa => (
              <div key={oa.id} style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 900
                    }}>
                      {oa.oa_code}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      {oa.axis || 'Eje General'}
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                    {oa.oa_title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                    {oa.description}
                  </p>
                </div>

                <div style={{ marginTop: '0.85rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {oa.grade_level} • {oa.subject}
                  </span>
                  {oa.is_prioritized ? (
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#065f46', background: '#d1fae5', padding: '0.18rem 0.5rem', borderRadius: '4px' }}>
                      ★ Priorizado / Basal
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '0.18rem 0.5rem', borderRadius: '4px' }}>
                      Complementario
                    </span>
                  )}
                </div>
              </div>
            ))}

            {learningGoals.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                No se encontraron Objetivos de Aprendizaje con los filtros aplicados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 4: ASISTENTE IA & MEMORIA PEDAGÓGICA                          */}
      {/* ===================================================================== */}
      {activeTab === 'ai_config' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#ede9fe', padding: '0.65rem', borderRadius: '12px', color: '#7c3aed' }}>
              <Brain size={28} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                Configuración y Aprendizaje del Asistente Pedagógico IA
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Personaliza cómo la Inteligencia Artificial redacta las sugerencias de tus clases según tus preferencias.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                Estilo de Redacción Preferido:
              </label>
              <select
                value={aiMemory.preferred_style}
                onChange={e => setAiMemory({ ...aiMemory, preferred_style: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="Equilibrado y Práctico">Equilibrado y Práctico (Recomendado para TP y HC)</option>
                <option value="Técnico y Procedimental">Técnico y Procedimental (Foco en Talleres, Máquinas y Normas)</option>
                <option value="Constructivista y Desafiante">Constructivista y Desafiante (Foco en Resolución de Problemas)</option>
                <option value="Lúdico y Sensorial">Lúdico y Sensorial (Foco en Párvulo y Primer Ciclo)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0f172a' }}>
                  Modo Síntesis y Conciso (Agilizar Trabajo Docente)
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  La IA entregará respuestas directas, esquemáticas y listas para pegar sin rodeos teóricos.
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiMemory.concise_mode}
                onChange={e => setAiMemory({ ...aiMemory, concise_mode: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.84rem', color: '#0f172a' }}>
                  Incluir Siempre Estrategias Inclusivas DUA / PIE
                </strong>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Añade automáticamente adaptaciones de representación y expresión para estudiantes con NEE.
                </span>
              </div>
              <input
                type="checkbox"
                checked={aiMemory.include_dua}
                onChange={e => setAiMemory({ ...aiMemory, include_dua: e.target.checked })}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                Foco Institucional o Contexto de Aprendizaje:
              </label>
              <textarea
                rows={3}
                value={aiMemory.focus_areas}
                onChange={e => setAiMemory({ ...aiMemory, focus_areas: e.target.value })}
                placeholder="Ej: Actividades prácticas para el Liceo Técnico Profesional Campanario, uso de talleres y trabajo colaborativo..."
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
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
                  padding: '0.6rem 1.4rem',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
                }}
              >
                <Save size={16} />
                {savingAiMemory ? 'Guardando Preferencias...' : 'Guardar Preferencias de IA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 5: HORARIOS ESCOLARES & ASC HORARIOS                         */}
      {/* ===================================================================== */}
      {activeTab === 'schedules' && (
        <SchoolSchedulesModule
          token={token}
          user={user}
          coursesList={coursesList}
          subjectsList={subjectsList}
          teachersList={teachersList}
          onSelectForPlanning={(courseName, subjectName) => {
            // Buscar si ya existe un plan anual para este curso y asignatura
            const foundPlan = allAnnualPlans.find(p => p.course_name === courseName && p.subject_name === subjectName);
            if (foundPlan) {
              selectAnnualPlan(foundPlan);
              setActiveTab('lessons');
            } else {
              setAnnualForm({
                academic_year: 2026,
                semester: 'PRIMER Y SEGUNDO SEMESTRE',
                course_name: courseName,
                subject_name: subjectName,
                teacher_name: user?.name || '',
                total_hours: 4,
                weekly_sessions: 1,
                status: 'Borrador',
                units: [
                  {
                    unit_number: 1,
                    unit_name: 'Unidad 1: Nivelación y Diagnóstico Inicial',
                    learning_goals: '',
                    evaluation_instruments: 'Evaluación diagnóstica inicial; Guías formativas; Rúbrica sumativa',
                    temporality: '2 Semanas'
                  }
                ]
              });
              setIsEditingAnnual(true);
              setActiveTab('annual');
            }
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* MODAL: SELECTOR RÁPIDO DE OA MINEDUC PARA LA UNIDAD ANUAL             */}
      {/* ===================================================================== */}
      {showOaPickerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>


            {/* ENCABEZADO MODAL */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0284c7',
              color: '#ffffff'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                  Seleccionar Objetivo de Aprendizaje (OA)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#e0f2fe' }}>
                  {modalGradeFilter || annualForm.course_name} • {modalSubjectFilter || annualForm.subject_name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOaPickerModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* BARRA DE FILTROS Y BÚSQUEDA DEL MODAL */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                    Nivel / Curso:
                  </label>
                  <select
                    value={modalGradeFilter}
                    onChange={e => {
                      setModalGradeFilter(e.target.value);
                      loadLearningGoals(e.target.value, modalSubjectFilter, catalogSearch, modalPriorityFilter);
                    }}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    <option value="">Todos los Niveles</option>
                    {coursesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                    Asignatura:
                  </label>
                  <select
                    value={modalSubjectFilter}
                    onChange={e => {
                      setModalSubjectFilter(e.target.value);
                      loadLearningGoals(modalGradeFilter, e.target.value, catalogSearch, modalPriorityFilter);
                    }}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    <option value="">Todas las Asignaturas</option>
                    {subjectsList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                    Tipo de Objetivo (OA):
                  </label>
                  <select
                    value={modalPriorityFilter}
                    onChange={e => {
                      const val = e.target.value as 'all' | 'prioritized' | 'standard';
                      setModalPriorityFilter(val);
                      loadLearningGoals(modalGradeFilter, modalSubjectFilter, catalogSearch, val);
                    }}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}
                  >
                    <option value="all">Todos los OAs (Priorizados y Complementarios)</option>
                    <option value="prioritized">★ Solo Priorizados / Basales</option>
                    <option value="standard">Solo Complementarios / No Priorizados</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Buscar por código (ej. OA 1, OA 2) o palabra clave..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      loadLearningGoals(modalGradeFilter, modalSubjectFilter, catalogSearch, modalPriorityFilter);
                    }
                  }}
                  style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => loadLearningGoals(modalGradeFilter, modalSubjectFilter, catalogSearch, modalPriorityFilter)}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Search size={14} />
                  Buscar
                </button>
              </div>
            </div>

            {/* LISTADO DE OAs */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '55vh', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loadingCatalog && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#0284c7', fontSize: '0.84rem', fontWeight: 700 }}>
                  Consultando catálogo oficial de Objetivos de Aprendizaje MINEDUC...
                </div>
              )}

              {!loadingCatalog && learningGoals.map(oa => (
                <div key={oa.id} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ background: '#0284c7', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 900 }}>
                        {oa.oa_code}
                      </span>
                      <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>{oa.oa_title}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                        {oa.axis || 'Eje Curricular'}
                      </span>
                      {oa.is_prioritized ? (
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#065f46', background: '#d1fae5', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                          ★ Priorizado / Basal
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                          Complementario
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                      {oa.description}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', display: 'block' }}>
                      {oa.grade_level} • {oa.subject}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyOaToUnit(oa)}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 0.95rem',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>
              ))}

              {!loadingCatalog && learningGoals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                  <AlertCircle size={36} color="#94a3b8" style={{ marginBottom: '0.6rem' }} />
                  <p style={{ margin: '0 0 0.85rem', fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
                    No se encontraron OAs para {modalGradeFilter || 'este nivel'} y {modalSubjectFilter || 'esta asignatura'}.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setModalSubjectFilter('');
                        loadLearningGoals(modalGradeFilter, '', '');
                      }}
                      style={{
                        background: '#f1f5f9',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      🌐 Ver todos los OAs de {modalGradeFilter || 'este nivel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalGradeFilter('');
                        setModalSubjectFilter('');
                        loadLearningGoals('', '', '');
                      }}
                      style={{
                        background: '#f1f5f9',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📚 Ver catálogo completo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DETALLE COMPLETO DE COBERTURA CURRICULAR POR OA                */}
      {/* ===================================================================== */}
      {showCoverageModal && coverageStats && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '820px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0f172a',
              color: '#ffffff'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900 }}>
                  Detalle de Cobertura Curricular Nacional (MINEDUC)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {selectedPlan?.course_name} • {selectedPlan?.subject_name} • Año 2026
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCoverageModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.25rem',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '10px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Cobertura Curricular:</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: coverageStats.coverageLevel === 'optima' ? '#15803d' : coverageStats.coverageLevel === 'media' ? '#b45309' : '#b91c1c' }}>
                    {coverageStats.coveragePercentage}%
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>OAs Impartidos:</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                    {coverageStats.coveredOAsCount} / {coverageStats.totalOfficialOAs}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>Clases Realizadas:</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>
                    {coverageStats.completedClassesCount} / {coverageStats.plannedClassesCount}
                  </div>
                </div>
              </div>

              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                Desglose por Objetivo de Aprendizaje (OA):
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {coverageStats.officialGoals.map(oa => (
                  <div key={oa.id || oa.oa_code} style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    background: oa.isCompleted ? '#f0fdf4' : oa.isPlanned ? '#fffbeb' : '#ffffff'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{
                          background: oa.isCompleted ? '#16a34a' : oa.isPlanned ? '#d97706' : '#94a3b8',
                          color: '#ffffff',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 900
                        }}>
                          {oa.oa_code}
                        </span>
                        <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>{oa.oa_title}</strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b', lineHeight: 1.35 }}>
                        {oa.description}
                      </p>
                    </div>

                    <div>
                      {oa.isCompleted ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          ✓ Realizado en Clase
                        </span>
                      ) : oa.isPlanned ? (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          ⏳ Planificado Pendiente
                        </span>
                      ) : (
                        <span style={{ background: '#f1f5f9', color: '#64748b', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          ⚪ Por Planificar
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: TRASPASO DE PLANIFICACIÓN / DOCENTE DE REEMPLAZO POR LICENCIA */}
      {/* ===================================================================== */}
      {showTransferModal && selectedPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0369a1',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ArrowRightLeft size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>
                  Traspaso de Planificación / Reemplazo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Planificación a Traspasar:</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>
                  {selectedPlan.course_name} — {selectedPlan.subject_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '0.2rem' }}>
                  Docente Titular Actual: <strong>Prof. {selectedPlan.teacher_name}</strong>
                  {selectedPlan.substitute_teacher_name && (
                    <span style={{ color: '#d97706', marginLeft: '0.5rem' }}>
                      (Reemplazo actual: Prof. {selectedPlan.substitute_teacher_name})
                    </span>
                  )}
                </div>
              </div>

              {/* MODALIDAD DE TRASPASO */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Modalidad de Traspaso:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: transferMode === 'set_substitute' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: transferMode === 'set_substitute' ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="transfer_mode"
                      value="set_substitute"
                      checked={transferMode === 'set_substitute'}
                      onChange={() => setTransferMode('set_substitute')}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.84rem', color: '#0369a1', display: 'block' }}>
                        🔄 Reemplazo Temporal por Licencia Médica (Recomendado)
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.35, display: 'block', marginTop: '2px' }}>
                        Conserva al docente titular en el registro oficial, pero otorga acceso y visibilidad completa al docente de reemplazo para saber en qué clase va el curso y continuar la cobertura.
                      </span>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: transferMode === 'transfer_ownership' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: transferMode === 'transfer_ownership' ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="transfer_mode"
                      value="transfer_ownership"
                      checked={transferMode === 'transfer_ownership'}
                      onChange={() => setTransferMode('transfer_ownership')}
                      style={{ marginTop: '0.2rem' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a', display: 'block' }}>
                        👤 Traspaso de Titularidad Definitivo
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.35, display: 'block', marginTop: '2px' }}>
                        Cambia de forma permanente el titular del plan y todas sus clases al nuevo docente.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* SELECCIÓN DEL DOCENTE DE DESTINO / REEMPLAZO */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                  Docente de Reemplazo / Destino:
                </label>
                <select
                  value={transferTargetTeacher}
                  onChange={e => setTransferTargetTeacher(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  <option value="">-- Seleccionar Docente de la Institución --</option>
                  {teachersList.map(t => (
                    <option key={t} value={t}>Prof. {t}</option>
                  ))}
                  <option value="__custom__">➕ Otro Docente (Escribir Nombre Nuevo)</option>
                </select>

                {transferTargetTeacher === '__custom__' && (
                  <input
                    type="text"
                    placeholder="Escribe el nombre completo del docente de reemplazo..."
                    value={transferCustomTeacher}
                    onChange={e => setTransferCustomTeacher(e.target.value)}
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                )}
              </div>

              {/* MOTIVO / OBSERVACIÓN */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                  Motivo del Traspaso / Licencia:
                </label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  placeholder="Ej: Licencia médica 15 días, reasignación horaria UTP..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                />
              </div>

              {/* ACCIONES MODAL */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isTransferring}
                  onClick={handleTransferPlan}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#0284c7',
                    color: '#ffffff',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <Check size={16} />
                  {isTransferring ? 'Procesando...' : 'Confirmar Traspaso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumPlansModule;
