import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Printer,
  Save,
  Users,
  Sparkles,
  BookOpen,
  Edit3,
  Plus,
  Trash2,
  RotateCcw,
  Layers,
  CheckCircle2,
  ArrowLeft,
  Home
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  PERSONALITY_REPORT_TEMPLATES,
  ReportLevelKey,
  ReportLevelTemplate,
  detectReportTemplateKey,
  getQualifierStyle
} from '../utils/personalityIndicators';
import { getStudentCourse, isStudentRetired, sortCoursesList, getStudentYear } from '../utils/course';

interface PersonalityReportsModuleProps {
  token: string;
  selectedYear?: number;
  onBack?: () => void;
}

type LevelFilterType = 'all' | ReportLevelKey;

const cloneTemplates = (
  source: Record<ReportLevelKey, ReportLevelTemplate>
): Record<ReportLevelKey, ReportLevelTemplate> => JSON.parse(JSON.stringify(source));

export const PersonalityReportsModule: React.FC<PersonalityReportsModuleProps> = ({
  token,
  selectedYear = 2026,
  onBack
}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [coursesInfo, setCoursesInfo] = useState<any[]>([]);
  const [allReportsMap, setAllReportsMap] = useState<Record<string, any>>({});
  const [templatesMap, setTemplatesMap] = useState<Record<ReportLevelKey, ReportLevelTemplate>>(() =>
    cloneTemplates(PERSONALITY_REPORT_TEMPLATES)
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);

  // Modo de vista: Evaluar/Imprimir vs Editar Pauta e Indicadores
  const [activeMode, setActiveMode] = useState<'evaluate' | 'edit_template'>('evaluate');

  // Filtro de nivel ('all' = Ver Todos los Cursos, o un nivel específico)
  const [levelFilter, setLevelFilter] = useState<LevelFilterType>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');
  const [semesterView, setSemesterView] = useState<'all' | 'sem1' | 'sem2'>('all');

  // Datos editables de encabezado / firmas
  const [teacherInput, setTeacherInput] = useState<string>('Educador(a) / Profesor(a) Jefe');
  const [directorInput, setDirectorInput] = useState<string>('Dirección del Establecimiento');
  const [customStudentName, setCustomStudentName] = useState<string>('');
  const [customStudentRun, setCustomStudentRun] = useState<string>('');
  const [customCourseLabel, setCustomCourseLabel] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    const authToken = token || sessionStorage.getItem('ltp_token') || '';
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    Promise.all([
      fetch('/api/students', { headers }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/staff', { headers }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/courses', { headers }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/config/institutional-settings', { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/personality-reports', { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/personality-templates', { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    ]).then(([studentsData, staffData, coursesData, instSettings, reportsData, customTplData]) => {
      const validStudents = Array.isArray(studentsData)
        ? studentsData.filter(s => !isStudentRetired(s) && Number(getStudentYear(s)) === Number(selectedYear))
        : [];
      setStudents(validStudents);

      if (Array.isArray(staffData)) setStaffList(staffData);
      if (Array.isArray(coursesData)) setCoursesInfo(coursesData);
      if (instSettings?.directorName) setDirectorInput(instSettings.directorName);
      if (reportsData?.reports) setAllReportsMap(reportsData.reports);

      if (customTplData?.templates && typeof customTplData.templates === 'object') {
        setTemplatesMap(prev => ({
          ...prev,
          ...customTplData.templates
        }));
      }

      const studentCourses = validStudents.map(s => getStudentCourse(s)).filter(Boolean);
      const dbCourseNames = Array.isArray(coursesData)
        ? coursesData.map((c: any) => c.name || c.course_name).filter(Boolean)
        : [];
      const baseCourses = [
        '1er nivel de Transición (Pre-kinder) A',
        '2do nivel de Transición (Kinder) A',
        '1° Básico A',
        '2° Básico A',
        '3° Básico A',
        '4° Básico A',
        '5° Básico A',
        '6° Básico A',
        '7° Básico A',
        '8° Básico A',
        '1° Medio A',
        '2° Medio A',
        '3° Medio A',
        '4° Medio A'
      ];
      const allUnique = sortCoursesList(Array.from(new Set([...studentCourses, ...dbCourseNames, ...baseCourses])));
      if (allUnique.length > 0) {
        const firstWithStudents = allUnique.find(c => validStudents.some(s => getStudentCourse(s) === c)) || allUnique[0];
        setSelectedCourse(firstWithStudents);
      }
      setLoading(false);
    });
  }, [token, selectedYear]);

  // Todos los cursos disponibles en el colegio (ordenados de Pre-Kínder a 4° Medio)
  const allSchoolCourses = useMemo(() => {
    const fromStudents = students.map(s => getStudentCourse(s)).filter(Boolean);
    const fromCoursesInfo = coursesInfo.map((c: any) => c.name || c.course_name).filter(Boolean);
    const fallbackCoursesByLevel: Record<ReportLevelKey, string[]> = {
      prekinder: ['1er nivel de Transición (Pre-kinder) A'],
      kinder: ['2do nivel de Transición (Kinder) A'],
      basica_1_6: ['1° Básico A', '2° Básico A', '3° Básico A', '4° Básico A', '5° Básico A', '6° Básico A'],
      basica_7_media_2: ['7° Básico A', '8° Básico A', '1° Medio A', '2° Medio A'],
      media_3_4: ['3° Medio A', '4° Medio A']
    };

    const combined = new Set<string>([...fromStudents, ...fromCoursesInfo]);
    // Asegurar que cada nivel tenga al menos sus cursos base si aún no tienen alumnos cargados
    (Object.keys(fallbackCoursesByLevel) as ReportLevelKey[]).forEach(lvlKey => {
      const hasAnyInLevel = Array.from(combined).some(c => detectReportTemplateKey(c) === lvlKey);
      if (!hasAnyInLevel) {
        fallbackCoursesByLevel[lvlKey].forEach(fc => combined.add(fc));
      }
    });

    return sortCoursesList(Array.from(combined));
  }, [students, coursesInfo]);

  // Cursos filtrados estrictamente según el botón de nivel seleccionado (o todos si levelFilter === 'all')
  const filteredCourses = useMemo(() => {
    if (levelFilter === 'all') {
      return allSchoolCourses;
    }
    return allSchoolCourses.filter(c => detectReportTemplateKey(c) === levelFilter);
  }, [allSchoolCourses, levelFilter]);

  // Cuando cambia el filtro de nivel (ej: usuario selecciona "1° a 6° Básico" o "Kínder"),
  // actualizar automáticamente el curso seleccionado al primer curso de ese nivel
  const handleSelectLevelFilter = (nextFilter: LevelFilterType) => {
    setLevelFilter(nextFilter);
    setPrintMode('single');
    const matching =
      nextFilter === 'all'
        ? allSchoolCourses
        : allSchoolCourses.filter(c => detectReportTemplateKey(c) === nextFilter);

    if (matching.length > 0) {
      // Si el curso actual ya pertenece al filtro, mantenerlo; si no, elegir el primero con alumnos o el primero de la lista
      if (!matching.includes(selectedCourse)) {
        const firstWithStudents =
          matching.find(c => students.some(s => getStudentCourse(s) === c)) || matching[0];
        setSelectedCourse(firstWithStudents);
      }
    }
  };

  // Nivel de pauta activo: si hay un filtro específico se usa ese; si está en "Todos", se detecta según el curso elegido
  const activeReportLevelKey: ReportLevelKey = useMemo(() => {
    if (levelFilter !== 'all') {
      return levelFilter;
    }
    return detectReportTemplateKey(selectedCourse);
  }, [levelFilter, selectedCourse]);

  const currentTemplate: ReportLevelTemplate =
    templatesMap[activeReportLevelKey] || PERSONALITY_REPORT_TEMPLATES[activeReportLevelKey];

  // Nómina de estudiantes del curso seleccionado
  const courseStudents = useMemo(() => {
    const filtered = students.filter(s => getStudentCourse(s) === selectedCourse);
    return filtered.sort((a, b) => {
      const na = Number(a.list_number || 9999);
      const nb = Number(b.list_number || 9999);
      if (na !== nb) return na - nb;
      return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'es');
    });
  }, [students, selectedCourse]);

  useEffect(() => {
    if (courseStudents.length > 0) {
      if (!courseStudents.some(s => String(s.id) === String(selectedStudentId))) {
        setSelectedStudentId(String(courseStudents[0].id));
      }
    } else {
      setSelectedStudentId('');
    }
  }, [courseStudents, selectedStudentId]);

  useEffect(() => {
    if (!selectedCourse) return;
    const foundCourse = coursesInfo.find(
      c => String(c.name || c.course_name || '').toLowerCase() === selectedCourse.toLowerCase()
    );
    const firstSt = courseStudents[0];
    const profJefe =
      foundCourse?.teacher_name ||
      foundCourse?.homeroom_teacher ||
      firstSt?.profesor_jefe ||
      firstSt?.teacher_name ||
      '';
    if (profJefe && profJefe !== 'null' && profJefe !== 'Sin Asignar') {
      setTeacherInput(profJefe.startsWith('Prof.') ? profJefe : `Prof. ${profJefe}`);
    }
  }, [selectedCourse, coursesInfo, courseStudents]);

  const currentStudent = useMemo(() => {
    if (courseStudents.length === 0) {
      return {
        id: `demo-${selectedCourse || activeReportLevelKey}`,
        full_name: 'ESTUDIANTE (PAUTA OFICIAL DEL NIVEL)',
        run: 'Sin RUN registrado en este curso',
        level_name: selectedCourse || currentTemplate.shortLabel,
        list_number: 1
      };
    }
    return courseStudents.find(s => String(s.id) === String(selectedStudentId)) || courseStudents[0];
  }, [courseStudents, selectedStudentId, selectedCourse, activeReportLevelKey, currentTemplate]);

  // Sincronizar campos editables de alumno cuando cambia el alumno seleccionado
  useEffect(() => {
    const evalSaved = getStudentEval(currentStudent);
    setCustomStudentName(evalSaved.customStudentName || currentStudent.full_name || currentStudent.Nombres || '');
    setCustomStudentRun(evalSaved.customStudentRun || currentStudent.run || currentStudent.RUT || '');
    setCustomCourseLabel(evalSaved.customCourseLabel || getStudentCourse(currentStudent) || selectedCourse || '');
  }, [currentStudent, selectedCourse]);

  const getStudentKey = (st: any) =>
    String(st?.id || st?.run || st?.RUT || st?.full_name || 'student').trim();

  function getStudentEval(st: any) {
    const key = getStudentKey(st);
    const byId = allReportsMap[key];
    const runKey = st?.run || st?.RUT ? String(st.run || st.RUT).trim() : '';
    const byRun = runKey ? allReportsMap[runKey] : undefined;
    return byId || byRun || { sem1: {}, sem2: {}, observations: '' };
  }

  const hasSavedEval = (st: any) => {
    const key = getStudentKey(st);
    const runKey = st?.run || st?.RUT ? String(st.run || st.RUT).trim() : '';
    return Boolean(allReportsMap[key] || (runKey && allReportsMap[runKey]));
  };

  const handleSetIndicator = (st: any, semester: 'sem1' | 'sem2', indicatorId: string, value: string) => {
    const key = getStudentKey(st);
    setAllReportsMap(prev => {
      const existing = prev[key] || { sem1: {}, sem2: {}, observations: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          studentName: customStudentName || st.full_name || st.Nombres || '',
          studentRun: customStudentRun || st.run || st.RUT || '',
          course: customCourseLabel || getStudentCourse(st) || selectedCourse,
          levelKey: activeReportLevelKey,
          [semester]: {
            ...(existing[semester] || {}),
            [indicatorId]: value
          }
        }
      };
    });
  };

  const handleSetObservations = (st: any, text: string) => {
    const key = getStudentKey(st);
    setAllReportsMap(prev => {
      const existing = prev[key] || { sem1: {}, sem2: {}, observations: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          studentName: customStudentName || st.full_name || st.Nombres || '',
          studentRun: customStudentRun || st.run || st.RUT || '',
          course: customCourseLabel || getStudentCourse(st) || selectedCourse,
          levelKey: activeReportLevelKey,
          observations: text
        }
      };
    });
  };

  const handleQuickFill = (st: any, semester: 'sem1' | 'sem2', qualifier: string) => {
    const nextSem: Record<string, string> = {};
    currentTemplate.ambitos.forEach(amb =>
      amb.sections.forEach(sec =>
        sec.indicators.forEach(ind => {
          nextSem[ind.id] = qualifier;
        })
      )
    );
    const key = getStudentKey(st);
    setAllReportsMap(prev => {
      const existing = prev[key] || { sem1: {}, sem2: {}, observations: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          studentName: customStudentName || st.full_name || st.Nombres || '',
          studentRun: customStudentRun || st.run || st.RUT || '',
          course: customCourseLabel || getStudentCourse(st) || selectedCourse,
          levelKey: activeReportLevelKey,
          [semester]: nextSem
        }
      };
    });
  };

  const handleSaveEvaluation = async (st: any) => {
    if (!st) return;
    setSaving(true);
    try {
      const key = getStudentKey(st);
      const evalData = getStudentEval(st);
      const authToken = token || sessionStorage.getItem('ltp_token') || '';
      const payload = {
        studentName: customStudentName || st.full_name || st.Nombres || '',
        studentRun: customStudentRun || st.run || st.RUT || '',
        course: customCourseLabel || getStudentCourse(st) || selectedCourse,
        customStudentName,
        customStudentRun,
        customCourseLabel,
        levelKey: activeReportLevelKey,
        sem1: evalData.sem1 || {},
        sem2: evalData.sem2 || {},
        observations: evalData.observations || ''
      };

      const res = await fetch('/api/personality-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          studentKey: key,
          reportData: payload
        })
      });
      if (!res.ok) throw new Error('No se pudo guardar en Supabase');
      setAllReportsMap(prev => ({ ...prev, [key]: payload }));
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Informe guardado (${payload.studentName})`,
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al guardar el informe', 'error');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // FUNCIONES PARA EDITAR LA PAUTA / INDICADORES DEL NIVEL ACTIVO
  // =========================================================================
  const updateActiveTemplate = (updater: (tpl: ReportLevelTemplate) => ReportLevelTemplate) => {
    setTemplatesMap(prev => {
      const copy = JSON.parse(JSON.stringify(prev[activeReportLevelKey]));
      return {
        ...prev,
        [activeReportLevelKey]: updater(copy)
      };
    });
  };

  const handleSaveCustomTemplatesToCloud = async () => {
    setSavingTemplate(true);
    try {
      const authToken = token || sessionStorage.getItem('ltp_token') || '';
      const res = await fetch('/api/personality-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ templates: templatesMap })
      });
      if (!res.ok) throw new Error('No se pudo guardar la pauta en el servidor');
      Swal.fire({
        icon: 'success',
        title: 'Pauta e Indicadores Guardados',
        text: `Las modificaciones para ${currentTemplate.shortLabel} se han guardado en la nube correctamente.`,
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al guardar cambios de la pauta', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleRestoreDefaultTemplate = async () => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `¿Restaurar pauta original de ${currentTemplate.shortLabel}?`,
      text: 'Se volverán a cargar los indicadores oficiales originales para este nivel.',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, restaurar original',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    const restored = JSON.parse(JSON.stringify(PERSONALITY_REPORT_TEMPLATES[activeReportLevelKey]));
    const nextMap = {
      ...templatesMap,
      [activeReportLevelKey]: restored
    };
    setTemplatesMap(nextMap);

    try {
      const authToken = token || sessionStorage.getItem('ltp_token') || '';
      await fetch('/api/personality-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ templates: nextMap })
      });
      Swal.fire('Restaurado', 'Se ha restaurado la pauta oficial del nivel.', 'success');
    } catch {}
  };

  const studentsToRender =
    printMode === 'all' && courseStudents.length > 0 ? courseStudents : [currentStudent];

  return (
    <div className="personality-module-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`
        /* Estilos compactos y optimizados de impresion institucional MINEDUC */
        @media print {
          @page {
            size: letter portrait;
            margin: 0.8cm 1cm 0.8cm 1cm;
          }
          body, html {
            background: #ffffff !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .app-sidebar, .sidebar, .header, .nav, .app-header, .no-print, .tab-buttons, .admin-sidebar, .header-container, .top-bar {
            display: none !important;
          }
          #root, .app-container, .main-content, .dashboard-container, .dashboard-layout, .module-wrapper, .admin-layout, .admin-content {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .personality-print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .personality-printable-sheet {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 0 1rem 0 !important;
            padding: 0.5rem !important;
            border: none !important;
            box-shadow: none !important;
            font-size: 10pt !important;
          }
          .personality-header-box {
            margin-bottom: 0.35rem !important;
          }
          .personality-student-card {
            padding: 0.45rem 0.75rem !important;
            margin-bottom: 0.45rem !important;
          }
          .personality-scale-box {
            padding: 0.35rem 0.65rem !important;
            margin-bottom: 0.45rem !important;
          }
          table {
            page-break-inside: auto !important;
            border-collapse: collapse !important;
            margin-bottom: 0.4rem !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th, td {
            padding: 0.22rem 0.45rem !important;
            font-size: 0.72rem !important;
          }
          thead {
            display: table-header-group !important;
          }
          .print-badge-cell {
            display: inline-block !important;
          }
          .interactive-select-cell {
            display: none !important;
          }
          .print-observations-box {
            display: block !important;
          }
          .interactive-observations-input {
            display: none !important;
          }
          .personality-signatures {
            margin-top: 1.4rem !important;
          }
          .personality-signature-line {
            height: 28px !important;
          }
        }
        @media screen {
          .print-badge-cell {
            display: none !important;
          }
          .print-observations-box {
            display: none !important;
          }
        }
      `}</style>

      {/* ENCABEZADO DEL MÓDULO (NO SE IMPRIME) */}
      <div className="no-print" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem 1.65rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              if (activeMode === 'edit_template') {
                setActiveMode('evaluate');
              } else if (onBack) {
                onBack();
              } else {
                window.dispatchEvent(new CustomEvent('ltp_navigate_tab', { detail: 'home' }));
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.95rem',
              borderRadius: '10px',
              border: '1.5px solid rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.14)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={activeMode === 'edit_template' ? 'Volver a la vista de Evaluar e Imprimir' : 'Volver a la pantalla anterior'}
          >
            <ArrowLeft size={16} />
            {activeMode === 'edit_template' ? 'Volver a Evaluar' : 'Volver Atrás'}
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Award size={26} color="#facc15" />
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900 }}>
                Informes al Hogar e Informes de Personalidad (Pre-Kínder a 4° Medio)
              </h2>
            </div>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.84rem', color: '#c7d2fe' }}>
              Filtra por nivel o curso, evalúa a cada estudiante, imprime informes o edita los indicadores si requieres modificaciones.
            </p>
          </div>
        </div>

        {/* CONMUTADOR DE MODO: EVALUAR/IMPRIMIR VS EDITAR PAUTA E INDICADORES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.14)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveMode('evaluate')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeMode === 'evaluate' ? '#ffffff' : 'transparent',
                color: activeMode === 'evaluate' ? '#1e1b4b' : '#e0e7ff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={16} /> Evaluar e Imprimir
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('edit_template')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeMode === 'edit_template' ? '#facc15' : 'transparent',
                color: activeMode === 'edit_template' ? '#0f172a' : '#e0e7ff',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={16} /> Editar Indicadores / Pauta
            </button>
          </div>

          {activeMode === 'evaluate' && (
            <>
              <button
                type="button"
                onClick={() => handleSaveEvaluation(currentStudent)}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: saving ? 'wait' : 'pointer',
                  boxShadow: '0 4px 10px rgba(22, 163, 74, 0.35)'
                }}
              >
                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Evaluación'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0,0,0,0.22)', padding: '0.25rem 0.45rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#e0e7ff', textTransform: 'uppercase', marginRight: '2px' }}>
                  Semestre a Imprimir:
                </span>
                <button
                  type="button"
                  onClick={() => setSemesterView('all')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: semesterView === 'all' ? '#ffffff' : 'transparent',
                    color: semesterView === 'all' ? '#1e1b4b' : '#cbd5e1',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Ambos Semestres
                </button>
                <button
                  type="button"
                  onClick={() => setSemesterView('sem1')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: semesterView === 'sem1' ? '#4f46e5' : 'transparent',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Solo 1° Semestre
                </button>
                <button
                  type="button"
                  onClick={() => setSemesterView('sem2')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: semesterView === 'sem2' ? '#4f46e5' : 'transparent',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Solo 2° Semestre
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPrintMode('single');
                  setTimeout(() => window.print(), 100);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(79, 70, 229, 0.35)'
                }}
              >
                <Printer size={16} /> Imprimir Alumno ({semesterView === 'all' ? 'Ambos' : semesterView === 'sem1' ? '1° Sem' : '2° Sem'})
              </button>

              {courseStudents.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setPrintMode('all');
                    setTimeout(() => window.print(), 150);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #a5b4fc',
                    background: 'rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <Users size={16} /> Imprimir Curso ({courseStudents.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* PANEL SUPERIOR DE FILTRO DE NIVEL + CURSO + ESTUDIANTE (NO SE IMPRIME) */}
      <div className="no-print" style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '1.15rem 1.35rem',
        border: '1px solid #cbd5e1',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* 1. BOTONES DE FILTRO POR NIVEL + OPCIÓN "VER TODOS" */}
        <div>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#475569',
            textTransform: 'uppercase',
            marginBottom: '0.55rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={15} color="#4f46e5" /> Seleccione el Nivel / Filtro de Cursos:
            </span>
            <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700, textTransform: 'none' }}>
              Mostrando {filteredCourses.length} curso(s) en el selector • Pauta activa: <strong>{currentTemplate.shortLabel}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* OPCIÓN VER TODOS LOS CURSOS */}
            <button
              type="button"
              onClick={() => handleSelectLevelFilter('all')}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: levelFilter === 'all' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                background: levelFilter === 'all' ? '#eef2ff' : '#f8fafc',
                color: levelFilter === 'all' ? '#312e81' : '#334155',
                fontWeight: levelFilter === 'all' ? 800 : 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Layers size={15} color={levelFilter === 'all' ? '#4f46e5' : '#64748b'} />
              <span>Ver Todos los Cursos</span>
              <span style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: '999px',
                background: levelFilter === 'all' ? '#4f46e5' : '#e2e8f0',
                color: levelFilter === 'all' ? '#ffffff' : '#475569',
                fontWeight: 800
              }}>
                {allSchoolCourses.length}
              </span>
            </button>

            {/* BOTONES DE CADA TRAMO OFICIAL */}
            {(Object.keys(templatesMap) as ReportLevelKey[]).map(key => {
              const tpl = templatesMap[key];
              const isSelected = levelFilter === key;
              const countInLevel = allSchoolCourses.filter(c => detectReportTemplateKey(c) === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectLevelFilter(key)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: isSelected ? '#eef2ff' : '#f8fafc',
                    color: isSelected ? '#312e81' : '#334155',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tpl.category === 'parvularia' ? '🧸' : '🎓'}</span>
                  <span>{tpl.shortLabel}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '999px',
                    background: isSelected ? '#4f46e5' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontWeight: 800
                  }}>
                    {tpl.category === 'parvularia' ? `Informe al Hogar (${countInLevel})` : `Personalidad (${countInLevel})`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. SELECTORES DE CURSO, ESTUDIANTE Y DATOS EDITABLES */}
        {activeMode === 'evaluate' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>
                  🏫 Curso ({levelFilter === 'all' ? 'Todos los niveles' : `Filtro: ${currentTemplate.shortLabel}`}):
                </label>
                <select
                  value={selectedCourse}
                  onChange={e => {
                    setSelectedCourse(e.target.value);
                    setPrintMode('single');
                  }}
                  style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1.5px solid #4f46e5', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', background: '#f8fafc' }}
                >
                  {filteredCourses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>
                  👤 Estudiante ({courseStudents.length} en nómina):
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => {
                    setSelectedStudentId(e.target.value);
                    setPrintMode('single');
                  }}
                  style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', background: '#ffffff' }}
                >
                  {courseStudents.length === 0 ? (
                    <option value="">Vista Previa de Pauta ({selectedCourse})</option>
                  ) : (
                    courseStudents.map((st, idx) => (
                      <option key={st.id} value={st.id}>
                        #{st.list_number || idx + 1} - {st.full_name || st.Nombres} {hasSavedEval(st) ? '✅' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>
                  ✍️ Educador(a) / Profesor(a) Jefe:
                </label>
                <input
                  type="text"
                  value={teacherInput}
                  onChange={e => setTeacherInput(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>
                  ✍️ Director(a):
                </label>
                <input
                  type="text"
                  value={directorInput}
                  onChange={e => setDirectorInput(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* EDICIÓN RÁPIDA DE DATOS DEL ALUMNO EN EL INFORME (POR SI REQUIERE CORRECCIÓN) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', background: '#f8fafc', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  ✏️ Nombre del Estudiante en el Informe (Editable):
                </label>
                <input
                  type="text"
                  value={customStudentName}
                  onChange={e => setCustomStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.38rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  ✏️ RUN / RUT en el Informe (Editable):
                </label>
                <input
                  type="text"
                  value={customStudentRun}
                  onChange={e => setCustomStudentRun(e.target.value)}
                  style={{ width: '100%', padding: '0.38rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '2px' }}>
                  ✏️ Nombre del Curso Impreso (Editable):
                </label>
                <input
                  type="text"
                  value={customCourseLabel}
                  onChange={e => setCustomCourseLabel(e.target.value)}
                  style={{ width: '100%', padding: '0.38rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#4f46e5', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* BOTONES DE AUTOCOMPLETADO RÁPIDO POR SEMESTRE */}
            <div style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '0.65rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.78rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Sparkles size={15} color="#4f46e5" />
                <strong style={{ color: '#1e293b' }}>Autocompletar 1er Semestre con:</strong>
                {currentTemplate.scale.map(sc => (
                  <button
                    key={`s1-${sc.code}`}
                    type="button"
                    onClick={() => handleQuickFill(currentStudent, 'sem1', sc.code)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      border: `1px solid ${sc.color}`,
                      background: sc.bgColor,
                      color: sc.color,
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {sc.code} ({sc.label})
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <strong style={{ color: '#1e293b' }}>Autocompletar 2do Semestre con:</strong>
                {currentTemplate.scale.map(sc => (
                  <button
                    key={`s2-${sc.code}`}
                    type="button"
                    onClick={() => handleQuickFill(currentStudent, 'sem2', sc.code)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      border: `1px solid ${sc.color}`,
                      background: sc.bgColor,
                      color: sc.color,
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {sc.code}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickFill(currentStudent, 'sem2', '-')}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #94a3b8',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Limpiar 2° Sem
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODO 2: EDITOR COMPLETO DE PAUTA, ÁMBITOS, NÚCLEOS E INDICADORES      */}
      {/* ===================================================================== */}
      {activeMode === 'edit_template' && (
        <div className="no-print" style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '1.5rem',
          border: '2px solid #4f46e5',
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="#4f46e5" />
                Editor de Indicadores y Pauta Oficial — {currentTemplate.shortLabel}
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Modifica textos de indicadores, códigos OA, nombres de núcleos/áreas, agrega nuevos indicadores o elimina los que no utilices.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveMode('evaluate')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1.5px solid #4f46e5',
                  background: '#eef2ff',
                  color: '#312e81',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={15} /> Volver a Evaluar e Imprimir
              </button>

              <button
                type="button"
                onClick={handleRestoreDefaultTemplate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={15} /> Restaurar Pauta Original
              </button>

              <button
                type="button"
                onClick={handleSaveCustomTemplatesToCloud}
                disabled={savingTemplate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: savingTemplate ? 'wait' : 'pointer',
                  boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)'
                }}
              >
                <Save size={16} /> {savingTemplate ? 'Guardando...' : 'Guardar Modificaciones de la Pauta'}
              </button>
            </div>
          </div>

          {/* TÍTULO Y ETIQUETA DEL NIVEL */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>
                📄 Título Oficial del Documento:
              </label>
              <input
                type="text"
                value={currentTemplate.reportTitle}
                onChange={e => {
                  const val = e.target.value;
                  updateActiveTemplate(tpl => ({ ...tpl, reportTitle: val }));
                }}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>
                🏷️ Subtítulo / Nivel Impreso:
              </label>
              <input
                type="text"
                value={currentTemplate.levelLabel}
                onChange={e => {
                  const val = e.target.value;
                  updateActiveTemplate(tpl => ({ ...tpl, levelLabel: val }));
                }}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* ÁMBITOS, NÚCLEOS / ÁREAS E INDICADORES EDITABLES */}
          {currentTemplate.ambitos.map((ambito, ambIdx) => (
            <div key={ambito.id || ambIdx} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
              {ambito.ambitoTitle !== undefined && (
                <div style={{ background: '#1e1b4b', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: '#facc15', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                    Ámbito:
                  </span>
                  <input
                    type="text"
                    value={ambito.ambitoTitle}
                    onChange={e => {
                      const val = e.target.value;
                      updateActiveTemplate(tpl => {
                        tpl.ambitos[ambIdx].ambitoTitle = val;
                        return tpl;
                      });
                    }}
                    style={{
                      flex: 1,
                      padding: '0.38rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #4f46e5',
                      background: '#312e81',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.84rem'
                    }}
                  />
                </div>
              )}

              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', background: '#ffffff' }}>
                {ambito.sections.map((section, secIdx) => (
                  <div key={section.id || secIdx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.9rem', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <strong style={{ fontSize: '0.78rem', color: '#004b87', whiteSpace: 'nowrap' }}>
                          {currentTemplate.category === 'parvularia' ? 'Núcleo:' : 'Área / Dimensión:'}
                        </strong>
                        <input
                          type="text"
                          value={section.title}
                          onChange={e => {
                            const val = e.target.value;
                            updateActiveTemplate(tpl => {
                              tpl.ambitos[ambIdx].sections[secIdx].title = val;
                              return tpl;
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: '0.4rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #94a3b8',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            color: '#0f172a',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          updateActiveTemplate(tpl => {
                            const newId = `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                            tpl.ambitos[ambIdx].sections[secIdx].indicators.push({
                              id: newId,
                              ...(tpl.category === 'parvularia' ? { oa: 'OA' } : {}),
                              text: 'Nuevo indicador de evaluación...'
                            });
                            return tpl;
                          });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#4f46e5',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.76rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={14} /> Agregar Indicador
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {section.indicators.map((ind, indIdx) => (
                        <div key={ind.id || indIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', width: '24px', textAlign: 'right' }}>
                            {indIdx + 1}.
                          </span>

                          {currentTemplate.category === 'parvularia' && (
                            <input
                              type="text"
                              value={ind.oa || ''}
                              placeholder="Ej: OA 1"
                              onChange={e => {
                                const val = e.target.value;
                                updateActiveTemplate(tpl => {
                                  tpl.ambitos[ambIdx].sections[secIdx].indicators[indIdx].oa = val;
                                  return tpl;
                                });
                              }}
                              style={{
                                width: '72px',
                                padding: '0.38rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                color: '#004b87',
                                textAlign: 'center'
                              }}
                            />
                          )}

                          <input
                            type="text"
                            value={ind.text}
                            onChange={e => {
                              const val = e.target.value;
                              updateActiveTemplate(tpl => {
                                tpl.ambitos[ambIdx].sections[secIdx].indicators[indIdx].text = val;
                                return tpl;
                              });
                            }}
                            style={{
                              flex: 1,
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.8rem',
                              color: '#1e293b',
                              background: '#ffffff'
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => {
                              updateActiveTemplate(tpl => {
                                tpl.ambitos[ambIdx].sections[secIdx].indicators.splice(indIdx, 1);
                                return tpl;
                              });
                            }}
                            title="Eliminar este indicador"
                            style={{
                              padding: '0.38rem 0.55rem',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveTemplate(tpl => {
                        tpl.ambitos[ambIdx].sections.push({
                          id: `sec_${Date.now()}`,
                          title: currentTemplate.category === 'parvularia' ? 'Núcleo: Nuevo Núcleo' : 'Nueva Área de Evaluación',
                          indicators: [
                            {
                              id: `ind_${Date.now()}`,
                              ...(currentTemplate.category === 'parvularia' ? { oa: 'OA 1' } : {}),
                              text: 'Descripción del indicador...'
                            }
                          ]
                        });
                        return tpl;
                      });
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px dashed #4f46e5',
                      background: '#eef2ff',
                      color: '#4338ca',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={15} /> Agregar {currentTemplate.category === 'parvularia' ? 'Nuevo Núcleo' : 'Nueva Área / Dimensión'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODO 1: DOCUMENTO OFICIAL INTERACTIVO E IMPRIMIBLE                    */}
      {/* ===================================================================== */}
      {activeMode === 'evaluate' && (
        <div className="personality-print-area">
          {studentsToRender.map((st, idx) => {
            const evalData = getStudentEval(st);
            const isSingle = studentsToRender.length === 1;
            const displayStudentName = isSingle
              ? customStudentName || st.full_name || st.Nombres
              : evalData.customStudentName || st.full_name || st.Nombres;
            const displayStudentRun = isSingle
              ? customStudentRun || st.run || st.RUT || 'Sin Registro'
              : evalData.customStudentRun || st.run || st.RUT || 'Sin Registro';
            const displayCourseName = isSingle
              ? customCourseLabel || getStudentCourse(st) || selectedCourse || currentTemplate.shortLabel
              : evalData.customCourseLabel || getStudentCourse(st) || selectedCourse || currentTemplate.shortLabel;

            return (
              <div
                key={st.id || idx}
                className="personality-printable-sheet"
                style={{
                  background: '#ffffff',
                  border: '2px solid #0f172a',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
                  fontFamily: 'Arial, sans-serif',
                  color: '#0f172a'
                }}
              >
                {/* ENCABEZADO CON LOGOS OFICIALES */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ width: '115px' }}>
                    <img
                      src="/images/logo_mineduc.jpg"
                      alt="MINEDUC"
                      style={{ maxHeight: '48px', maxWidth: '115px', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#004b87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      REPÚBLICA DE CHILE • MINISTERIO DE EDUCACIÓN
                    </div>
                    <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase' }}>
                      LICEO TÉCNICO PROFESIONAL CAMPANARIO MARCOS DELUCCHI FONCK
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#004b87', textTransform: 'uppercase', marginTop: '2px' }}>
                      {currentTemplate.reportTitle} — AÑO ESCOLAR {selectedYear}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                      {currentTemplate.levelLabel} • RBD: 3941-1
                    </div>
                  </div>

                  <div style={{ width: '115px', display: 'flex', justifyContent: 'flex-end' }}>
                    <img
                      src="/images/logo_liceo.png"
                      alt="Insignia LTP"
                      style={{ maxHeight: '52px', maxWidth: '75px', objectFit: 'contain' }}
                    />
                  </div>
                </div>

                {/* FRANJA BICOLOR */}
                <div style={{ display: 'flex', height: '3.5px', width: '100%', marginBottom: '1rem' }}>
                  <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
                  <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
                </div>

                {/* FICHA DEL ALUMNO */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.75rem 1.15rem',
                  marginBottom: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.82rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>ESTUDIANTE</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a', textTransform: 'uppercase' }}>
                      {displayStudentName}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>RUN / RUT</span>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{displayStudentRun}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>CURSO / NIVEL</span>
                    <strong style={{ fontSize: '0.9rem', color: '#4f46e5' }}>{displayCourseName}</strong>
                  </div>
                </div>

                {/* ESCALA DE EVALUACIÓN OFICIAL */}
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.55rem 0.9rem',
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  fontSize: '0.76rem'
                }}>
                  <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>
                    Escala de Evaluación (Calificadores):
                  </strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {currentTemplate.scale.map(sc => (
                      <span key={sc.code} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <strong style={{
                          background: sc.bgColor,
                          color: sc.color,
                          padding: '1px 7px',
                          borderRadius: '4px',
                          border: `1px solid ${sc.color}`
                        }}>
                          {sc.code}
                        </strong>
                        <span style={{ color: '#1e293b', fontWeight: 700 }}>{sc.label}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* TABLA DE ÁMBITOS, NÚCLEOS / DIMENSIONES E INDICADORES */}
                {currentTemplate.ambitos.map((ambito, ambIdx) => (
                  <div key={ambIdx} style={{ marginBottom: '1.1rem' }}>
                    {ambito.ambitoTitle && (
                      <div style={{
                        background: '#1e1b4b',
                        color: '#ffffff',
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase',
                        borderRadius: '6px 6px 0 0'
                      }}>
                        {ambito.ambitoTitle}
                      </div>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', marginBottom: '0.65rem' }}>
                      <thead>
                        <tr style={{ background: '#004b87', color: '#ffffff' }}>
                          <th style={{ padding: '0.32rem 0.6rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                            {ambito.ambitoTitle ? 'Núcleo / Indicadores de Evaluación' : 'Área / Indicadores de Evaluación'}
                          </th>
                          {(semesterView === 'all' || semesterView === 'sem1') && (
                            <th style={{ padding: '0.32rem 0.4rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '85px' }}>1er Sem</th>
                          )}
                          {(semesterView === 'all' || semesterView === 'sem2') && (
                            <th style={{ padding: '0.32rem 0.4rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '85px' }}>2do Sem</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {ambito.sections.map((section, secIdx) => (
                          <React.Fragment key={secIdx}>
                            <tr style={{ background: '#e2e8f0' }}>
                              <td colSpan={3} style={{ padding: '0.42rem 0.7rem', fontWeight: 800, color: '#0f172a', border: '1px solid #cbd5e1', fontSize: '0.79rem' }}>
                                {section.title}
                              </td>
                            </tr>
                            {section.indicators.map((ind, indIdx) => {
                              const val1 = evalData.sem1?.[ind.id] || currentTemplate.defaultQualifier;
                              const val2 = evalData.sem2?.[ind.id] || '-';
                              const style1 = getQualifierStyle(val1, currentTemplate.category);
                              const style2 = getQualifierStyle(val2, currentTemplate.category);

                              return (
                                <tr key={ind.id} style={{ background: indIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                  <td style={{ padding: '0.38rem 0.7rem', border: '1px solid #cbd5e1', lineHeight: 1.38, color: '#1e293b' }}>
                                    {ind.oa && (
                                      <strong style={{ color: '#004b87', marginRight: '0.4rem', fontSize: '0.74rem' }}>
                                        ({ind.oa})
                                      </strong>
                                    )}
                                    {ind.text}
                                  </td>
                                  {(semesterView === 'all' || semesterView === 'sem1') && (
                                  <td style={{ padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                    <div className="interactive-select-cell">
                                      <select
                                        value={val1}
                                        onChange={e => handleSetIndicator(st, 'sem1', ind.id, e.target.value)}
                                        style={{
                                          width: '100%',
                                          textAlign: 'center',
                                          fontWeight: 800,
                                          fontSize: '0.74rem',
                                          padding: '2px 3px',
                                          borderRadius: '4px',
                                          border: '1px solid #cbd5e1',
                                          background: style1.bgColor,
                                          color: style1.color,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {currentTemplate.scale.map(sc => (
                                          <option key={sc.code} value={sc.code}>{sc.code}</option>
                                        ))}
                                        <option value="-">-</option>
                                      </select>
                                    </div>
                                    <div className="print-badge-cell">
                                      <span style={{
                                        display: 'inline-block',
                                        minWidth: '26px',
                                        padding: '1px 6px',
                                        borderRadius: '3px',
                                        fontWeight: 900,
                                        fontSize: '0.74rem',
                                        background: val1 === '-' ? '#f1f5f9' : style1.bgColor,
                                        color: val1 === '-' ? '#94a3b8' : style1.color,
                                        border: `1.2px solid ${val1 === '-' ? '#cbd5e1' : style1.color}`,
                                        textAlign: 'center'
                                      }}>
                                        {val1}
                                      </span>
                                    </div>
                                  </td>
                                  )}
                                  {(semesterView === 'all' || semesterView === 'sem2') && (
                                  <td style={{ padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                    <div className="interactive-select-cell">
                                      <select
                                        value={val2}
                                        onChange={e => handleSetIndicator(st, 'sem2', ind.id, e.target.value)}
                                        style={{
                                          width: '100%',
                                          textAlign: 'center',
                                          fontWeight: 800,
                                          fontSize: '0.74rem',
                                          padding: '2px 3px',
                                          borderRadius: '4px',
                                          border: '1px solid #cbd5e1',
                                          background: style2.bgColor,
                                          color: style2.color,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <option value="-">-</option>
                                        {currentTemplate.scale.map(sc => (
                                          <option key={sc.code} value={sc.code}>{sc.code}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="print-badge-cell">
                                      <span style={{
                                        display: 'inline-block',
                                        minWidth: '26px',
                                        padding: '1px 6px',
                                        borderRadius: '3px',
                                        fontWeight: 900,
                                        fontSize: '0.74rem',
                                        background: val2 === '-' ? '#f1f5f9' : style2.bgColor,
                                        color: val2 === '-' ? '#94a3b8' : style2.color,
                                        border: `1.2px solid ${val2 === '-' ? '#cbd5e1' : style2.color}`,
                                        textAlign: 'center'
                                      }}>
                                        {val2}
                                      </span>
                                    </div>
                                  </td>
                                  )}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* OBSERVACIONES */}
                <div style={{ marginTop: '0.75rem', marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    Observaciones y Sugerencias al Hogar:
                  </div>
                  <div className="interactive-observations-input">
                    <textarea
                    value={evalData.observations || ''}
                    onChange={e => handleSetObservations(st, e.target.value)}
                    placeholder="Escriba aquí observaciones cualitativas, fortalezas o compromisos formativos del estudiante..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                  </div>
                  <div className="print-observations-box" style={{
                    minHeight: '48px',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.82rem',
                    color: '#1e293b',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {evalData.observations || 'Sin observaciones adicionales para el período evaluado.'}
                  </div>
                </div>

                {/* FIRMAS OFICIALES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginTop: '2.5rem', textAlign: 'center', fontSize: '0.78rem', color: '#1e293b' }}>
                  <div>
                    <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.4rem', height: '38px' }}></div>
                    <strong style={{ display: 'block' }}>{teacherInput}</strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Educador(a) / Profesor(a) Jefe</span>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.4rem', height: '38px' }}></div>
                    <strong style={{ display: 'block' }}>{directorInput}</strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Dirección del Establecimiento</span>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.4rem', height: '38px' }}></div>
                    <strong style={{ display: 'block' }}>Firma Apoderado(a)</strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Toma de Conocimiento</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PersonalityReportsModule;
