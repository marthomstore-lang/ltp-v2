import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  FileText,
  FileCheck2,
  Printer,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  GraduationCap,
  Sparkles,
  Filter,
  ArrowLeft,
  Save,
  RefreshCw,
  FolderOpen,
  Info,
  Clock,
  ShieldAlert,
  UserCheck,
  Building2,
  Award,
  Users
} from 'lucide-react';

interface MineducReportsModuleProps {
  token: string;
  user: any;
  selectedYear?: number;
  onOpenStudentProfile?: (student: any) => void;
}

import {
  ALL_MINEDUC_REPORT_TYPES,
  MINEDUC_OFFICIAL_TEMPLATES,
  MINEDUC_DIAGNOSTIC_REPORT_TYPES,
  MineducReportType,
  formatChileDate
} from './mineduc/MineducConstants';
import {
  MineducPrintStyles,
  SimceNeepCertificate,
  FusMineducReport,
  FamilyReportSemester,
  PaecPlanTea,
  PsychopedagogicalReport,
  OfficialFuReevaluacionMineduc
} from './mineduc/MineducTemplates';
import {
  SimceNeepEditor,
  FusMineducEditor,
  FamilyReportSemesterEditor,
  PaecPlanTeaEditor,
  PsychopedagogicalReportEditor
} from './mineduc/MineducTemplateEditors';
import { getModuleSubTabFromUrl, syncModuleSubUrl } from '../utils/urlRouter';

const MINEDUC_REPORT_TYPES = ALL_MINEDUC_REPORT_TYPES;

export const MineducReportsModule: React.FC<MineducReportsModuleProps> = ({
  token,
  user,
  selectedYear = 2026,
  onOpenStudentProfile
}) => {
  // Estados de vista
  const [viewMode, setViewMode] = useState<'list' | 'select_student' | 'editor' | 'printable'>(() => {
    const initial = getModuleSubTabFromUrl<string>('mineduc_reports', 'list');
    // Si no hay informe seleccionado aún, iniciar seguro en 'list' o 'select_student'
    return (initial === 'select_student' ? 'select_student' : 'list');
  });

  useEffect(() => {
    syncModuleSubUrl('mineduc_reports', viewMode);
  }, [viewMode]);

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('TODOS');
  const [yearFilter, setYearFilter] = useState<number>(selectedYear);
  const [reportCourseFilter, setReportCourseFilter] = useState<string>('TODOS');

  // Estados para nuevo informe
  const [catalogCategory, setCatalogCategory] = useState<'ALL' | 'OFFICIAL' | 'DIAGNOSTIC'>('ALL');
  const [selectedReportType, setSelectedReportType] = useState<string>('SIMCE_NEEP');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('TODOS');
  const [selectedStudentRun, setSelectedStudentRun] = useState<string>('');

  // Reglas de Permisos por Rol:
  // - Docentes de aula común: solo modo lectura/impresión (sin crear, editar ni eliminar informes PIE).
  // - Profesionales PIE: pueden crear y editar/eliminar sus propios informes.
  // - Administrador / Coordinador(a) PIE: acceso total.
  const userRoleLower = (user?.role || '').toLowerCase();
  const isFullAdmin = user?.role === 'Admin' || userRoleLower.includes('admin') || userRoleLower.includes('coordinad');
  const isClassroomTeacher = userRoleLower.includes('docente') || userRoleLower.includes('profesor') || userRoleLower.includes('aula');
  const isPieSpecialist = !isClassroomTeacher && (
    userRoleLower.includes('pie') ||
    userRoleLower.includes('diferencial') ||
    userRoleLower.includes('psic') ||
    userRoleLower.includes('fono') ||
    userRoleLower.includes('kine') ||
    userRoleLower.includes('terap')
  );

  const canCreateReport = isFullAdmin || isPieSpecialist;

  const canEditReport = (r: any) => {
    if (isFullAdmin) return true;
    if (isClassroomTeacher) return false;
    // Especialistas PIE solo editan sus propios informes
    return r.professional_run === user?.run || r.professional_name === user?.name;
  };

  const canDeleteReport = (r: any) => {
    if (isFullAdmin) return true;
    if (isClassroomTeacher) return false;
    return r.professional_run === user?.run || r.professional_name === user?.name;
  };

  // Contexto del estudiante cargado desde la BD
  const [studentContext, setStudentContext] = useState<any | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // Informe activo (en edición o vista de impresión)
  const [activeReport, setActiveReport] = useState<any | null>(null);

  useEffect(() => {
    const handlePop = () => {
      const next = getModuleSubTabFromUrl<string>('mineduc_reports', 'list') as any;
      if ((next === 'editor' || next === 'printable') && !activeReport) {
        setViewMode('list');
      } else {
        setViewMode(next);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [activeReport]);
  const [formData, setFormData] = useState<any>({
    evaluation_date: new Date().toISOString().split('T')[0],
    professional_run: user?.run || '',
    professional_name: user?.name || '',
    professional_role: user?.role || 'Educadora Diferencial',
    professional_reg: '',
    status: 'Borrador',
    // Secciones técnicas Decreto 170
    sintesis: {
      diagnostico_ingreso: '',
      diagnostico_actual: '',
      decision_pie: 'CONTINUIDAD', // 'CONTINUIDAD' | 'EGRESO' | 'CAMBIO_DIAGNOSTICO'
      fundamentacion_decision: '',
      fecha_reevaluacion: new Date().toISOString().split('T')[0],
      evidencias_adjuntas: ['Informe Psicopedagógico', 'Evaluación de Aula']
    },
    avances: {
      contexto_escolar: '',
      asignaturas_mayor_progreso: '',
      asignaturas_menor_progreso: '',
      contexto_familiar_social: '',
      avances_especificos: {} as Record<string, string>
    },
    apoyos: [
      { tipo: 'Aula Común (Co-docencia)', efectividad: 'Alta', continuidad: 'SI', observaciones: 'Estrategias DUA implementadas favorablemente.' },
      { tipo: 'Aula de Recursos (Apoyo Especializado)', efectividad: 'Media-Alta', continuidad: 'SI', observaciones: 'Refuerzo de habilidades base.' }
    ],
    estrategias_adecuaciones: 'Diversificación de la enseñanza Decreto 83, tiempo adicional en evaluaciones y mediación con material concreto.',
    sugerencias_familia: 'Mantener rutina estructurada de estudio en el hogar y comunicación quincenal mediante libreta de comunicaciones.',
    observaciones_generales: '',
    responsablesPaec: {
      encargado: {
        nombre: user?.name || '',
        cargo: user?.role === 'Admin' ? 'Coordinador(a) PIE' : (user?.role || 'Educadora Diferencial PIE'),
        telefono: user?.phone || '+56 9 8765 4321',
        correo: user?.email || 'pie@liceo.cl'
      },
      acompananteInterno: {
        nombre: '',
        cargo: 'Profesor(a) de Aula Regular',
        telefono: ''
      },
      acompananteExterno: {
        nombre: '',
        institucion: 'Centro de Salud Familiar / Especialista Externo',
        telefono: ''
      }
    }
  });

  // Cargar lista de informes con filtros combinados (año, tipo, curso, búsqueda)
  const loadReports = async () => {
    setLoading(true);
    try {
      const courseParam = reportCourseFilter !== 'TODOS' ? `&course=${encodeURIComponent(reportCourseFilter)}` : '';
      const res = await fetch(`/api/mineduc-reports?year=${yearFilter}&type=${typeFilter}${courseParam}&search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error cargando informes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar estudiantes de la matrícula para el selector
  const loadStudents = async () => {
    try {
      const res = await fetch('/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllStudents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error cargando estudiantes:', err);
    }
  };

  useEffect(() => {
    loadReports();
  }, [token, yearFilter, typeFilter, reportCourseFilter]);

  useEffect(() => {
    loadStudents();
  }, [token]);

  // Obtener cursos únicos disponibles
  const coursesList = useMemo(() => {
    const list = Array.from(new Set(allStudents.map(s => s.desc_grado).filter(Boolean)));
    return list.sort();
  }, [allStudents]);

  // Filtrar estudiantes para el selector
  // Regla institucional: la duplicidad de RUN solo existe legalmente cuando un estudiante se cambia de curso
  // (figura como Retirado en el curso anterior y como Vigente en el nuevo curso de destino).
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const matchCourse = courseFilter === 'TODOS' || s.desc_grado === courseFilter;
      const cleanSearch = studentSearch.toLowerCase().trim();
      const matchText = !cleanSearch ||
        (s.full_name && s.full_name.toLowerCase().includes(cleanSearch)) ||
        (s.run && s.run.toLowerCase().includes(cleanSearch));
      return matchCourse && matchText;
    });
  }, [allStudents, courseFilter, studentSearch]);

  // Limpiar valores inválidos o códigos de plantillas guardados por error en pie_diagnosis
  const cleanPieDiagnosis = (diag?: string | null): string => {
    const d = String(diag || '').trim();
    if (!d) return '';
    const invalid = new Set([
      'S/I', '152', 'SIN REGISTRO', 'NO', 'NINGUNO', 'SIN INFORMACIÓN', 'SIN INFORMACION',
      'INFORME_FAMILIA_SEMESTRAL', 'FUS_MINEDUC', 'SIMCE_NEEP', 'PAEC_PLAN_TEA', 'PSICOPEDAGOGICO_DEC170',
      'INFORME PARA LA FAMILIA (SEMESTRAL PIE)', 'FORMULARIO ÚNICO SÍNTESIS (FUS - MINEDUC)', 'NECESIDADES EDUCATIVAS ESPECIALES'
    ]);
    return invalid.has(d.toUpperCase()) ? '' : d;
  };

  // Normalizar campos heredados (snake_case de importaciones previas -> camelCase de los editores)
  const normalizeSavedReportData = (raw: any) => {
    if (!raw || typeof raw !== 'object') return {};
    const boilerplateStrings = new Set([
      'El estudiante evidencia avance progresivo en habilidades lectoras y cálculo. Se aplican adaptaciones curriculares DUA en aula común y aula de recursos.',
      'Buena integración con sus pares. Mantiene motivación escolar y participa con agrado de las actividades mediadas.',
      'Desarrollo adecuado en comprensión auditiva y expresión verbal, logrando transmitir ideas con claridad.',
      'Sin observaciones motoras significativas. Participa activamente en actividades de educación física.',
      'Adecuada organización de materiales y autorregulación en tareas escolares.',
      'Fomentar la lectura diaria compartida en casa durante 15 minutos, felicitar sus logros cotidianos, supervisar la agenda escolar y mantener asistencia regular a clases.',
      'Sensibilidad al ruido ambiente imprevisto y cambios de rutina sin anticipación previa.',
      'Fortaleza en memoria fotográfica y atención al detalle. Desafío en flexibilización y contacto visual sostenido.',
      'Ruidos estridentes o imprevistos (timbre, taladro), aglomeraciones y cambios bruscos de actividad.',
      'Dibujo técnico, astronomía, lectura de cómics, armado de figuras legos.',
      'Sensibilidad auditiva ante tonos altos; agrado por texturas lisas y música instrumental suave.',
      'Audífonos con cancelación de ruido, pelota antiestrés, cuaderno de dibujo.',
      'Vamos a respirar juntos; Tómate un momento; ¿Quieres ir al espacio de calma?'
    ]);
    const cleanText = (val: any) => {
      if (typeof val !== 'string') return val;
      return boilerplateStrings.has(val.trim()) ? '' : val;
    };

    let parsedPerfil: any = {};
    if (raw.perfil_data) {
      try {
        parsedPerfil = typeof raw.perfil_data === 'string' ? JSON.parse(raw.perfil_data) : raw.perfil_data;
      } catch (_) {}
    }
    let parsedMatriz: any = undefined;
    if (raw.matriz_crisis) {
      try {
        parsedMatriz = typeof raw.matriz_crisis === 'string' ? JSON.parse(raw.matriz_crisis) : raw.matriz_crisis;
      } catch (_) {}
    }
    const merged: any = { ...parsedPerfil, ...raw };
    if (merged.reportes_area && typeof merged.reportes_area === 'object') {
      if (merged.reportePsicopedagogico === undefined) merged.reportePsicopedagogico = merged.reportes_area.psicopedagogico || '';
      if (merged.reportePsicologico === undefined) merged.reportePsicologico = merged.reportes_area.psicologico || '';
      if (merged.reporteFonoaudiologico === undefined) merged.reporteFonoaudiologico = merged.reportes_area.fonoaudiologico || '';
      if (merged.reporteKinesiologico === undefined) merged.reporteKinesiologico = merged.reportes_area.kinesiologico || '';
      if (merged.reporteTerapiaOcupacional === undefined) merged.reporteTerapiaOcupacional = merged.reportes_area.terapia_ocupacional || '';
    }
    if (merged.sugerenciasApoyo === undefined && merged.sugerencias_apoyo !== undefined) {
      merged.sugerenciasApoyo = merged.sugerencias_apoyo;
    }
    merged.reportePsicopedagogico = cleanText(merged.reportePsicopedagogico);
    merged.reportePsicologico = cleanText(merged.reportePsicologico);
    merged.reporteFonoaudiologico = cleanText(merged.reporteFonoaudiologico);
    merged.reporteKinesiologico = cleanText(merged.reporteKinesiologico);
    merged.reporteTerapiaOcupacional = cleanText(merged.reporteTerapiaOcupacional);
    merged.sugerenciasApoyo = cleanText(merged.sugerenciasApoyo);

    if (merged.profesional_data && typeof merged.profesional_data === 'object') {
      if (!merged.profesionalNombre && merged.profesional_data.nombre) merged.profesionalNombre = merged.profesional_data.nombre;
      if (!merged.profesionalFechaInforme && merged.profesional_data.fecha) merged.profesionalFechaInforme = merged.profesional_data.fecha;
    }
    if (merged.apoderado_data && typeof merged.apoderado_data === 'object') {
      if (!merged.apoderadoNombre && merged.apoderado_data.nombre) merged.apoderadoNombre = merged.apoderado_data.nombre;
      if (!merged.apoderadoRut && merged.apoderado_data.rut) merged.apoderadoRut = merged.apoderado_data.rut;
      if (!merged.apoderadoRelacion && merged.apoderado_data.relacion) merged.apoderadoRelacion = merged.apoderado_data.relacion;
    }
    if (!merged.matrizCrisis && parsedMatriz) {
      merged.matrizCrisis = parsedMatriz;
    }
    const cleanDiag = cleanPieDiagnosis(merged.diagnostico);
    if (cleanDiag) {
      merged.diagnostico = cleanDiag;
    } else {
      delete merged.diagnostico;
    }
    return merged;
  };

  // Cargar contexto del estudiante al seleccionarlo (y recuperar informe guardado si ya existe)
  const handleSelectStudent = async (studentRun: string, reportTypeId?: string, studentId?: string, courseName?: string) => {
    setSelectedStudentRun(studentRun);
    setLoadingContext(true);
    const targetType = reportTypeId || selectedReportType;

    try {
      const qParams = new URLSearchParams();
      if (studentId) qParams.set('studentId', studentId);
      if (courseName) qParams.set('course', courseName);
      const qs = qParams.toString() ? `?${qParams.toString()}` : '';

      const res = await fetch(`/api/mineduc-reports/student-context/${encodeURIComponent(studentRun)}${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('No se pudo cargar el expediente del estudiante.');
      }

      const data = await res.json();
      setStudentContext(data);

      const stu = data.student || {};
      const grades = data.gradesSummary || {};
      const repTypeObj = MINEDUC_REPORT_TYPES.find(r => r.id === targetType);

      // Buscar si el estudiante ya tiene un informe guardado para este tipo de documento
      const cleanStudentRun = String(stu.run || studentRun).replace(/[^0-9kK]/g, '').toUpperCase();
      const historyList: any[] = Array.isArray(data.history) ? data.history : [];
      let existingReport = historyList.find((h: any) => h.report_type === targetType);

      if (!existingReport) {
        const matchedFromList = reports.find(
          (r: any) => r.report_type === targetType && String(r.student_run || '').replace(/[^0-9kK]/g, '').toUpperCase() === cleanStudentRun
        );
        if (matchedFromList) {
          const detailRes = await fetch(`/api/mineduc-reports/${matchedFromList.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => null);
          if (detailRes && detailRes.ok) {
            existingReport = await detailRes.json();
          } else {
            existingReport = matchedFromList;
          }
        }
      }

      // Determinar diagnóstico real del estudiante (desde ficha o desde historial de informes)
      const historyDiagnosis = historyList
        .map((h: any) => cleanPieDiagnosis(h.report_data?.diagnostico))
        .find(Boolean);
      const resolvedDiagnosis = cleanPieDiagnosis(stu.pie_diagnosis) || historyDiagnosis || '';

      // Pre-poblar los campos de avances específicos con las áreas del reporte
      const specificInit: Record<string, string> = {};
      if (repTypeObj && repTypeObj.specificAreas) {
        repTypeObj.specificAreas.forEach(area => {
          specificInit[area] = '';
        });
      }

      const currentYear = new Date().getFullYear();
      const baseFolio = `${targetType.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}-${(stu.run || '').replace(/[^0-9kK]/g, '') || '001'}-${currentYear}`;

      const baseFormData: any = {
        id: undefined,
        evaluation_date: new Date().toISOString().split('T')[0],
        professional_run: user?.run || '',
        professional_name: user?.name || '',
        professional_role: user?.role === 'Admin' ? 'Coordinador PIE / Evaluador' : (user?.role || 'Educadora Diferencial'),
        professional_reg: '',
        status: 'Borrador',

        // Campos comunes universales
        folio: baseFolio,
        estudianteNombre: stu.full_name || '',
        estudianteRut: stu.run || '',
        estudianteCurso: stu.desc_grado || '',
        estudianteNombreSocial: stu.first_name || stu.full_name || '',
        estudianteFechaNac: stu.birth_date || '',
        estudianteEdad: stu.calculatedAge?.years || stu.edad || '—',
        diagnostico: resolvedDiagnosis,
        diagnosticoAdicional: '',
        profesorJefe: stu.profesor_jefe || '',
        apoderadoNombre: stu.guardian_name || '',
        apoderadoRut: stu.guardian_run || '',
        apoderadoRelacion: stu.guardian_relation || 'Apoderado Titular',
        apoderadoTelefono: stu.guardian_phone || '',
        apoderadoEmail: stu.guardian_email || '',

        // Específico SIMCE NEEP
        directorNombre: data.institution?.director || 'Rodrigo Fonck Delucchi',
        coordinadorNombre: user?.name || 'Coordinador(a) PIE',

        // Específico FUS MINEDUC
        nombreIdentidad: stu.full_name || '',
        run: stu.run || '',
        nombreSocial: stu.first_name || stu.full_name || '',
        fechaNacimiento: stu.birth_date || '',
        edad: stu.calculatedAge?.text || '—',
        cursoNivel: stu.desc_grado || '',
        establecimiento: data.institution?.name || 'Liceo Técnico Profesional Campanario Marcos Delucchi Fonck',
        profNombre: user?.name || '',
        profRut: user?.run || '',
        profRol: user?.role || 'Educadora Diferencial',
        fechaEntrega: new Date().toISOString().split('T')[0],
        profTelefono: user?.phone || '+56 9 8765 4321',
        profEmail: user?.email || 'contacto@liceo.cl',
        recibeNombre: stu.guardian_name || '',
        recibeRut: stu.guardian_run || '',
        recibeRelacion: stu.guardian_relation || 'Apoderado Titular',
        recibeTelefono: stu.guardian_phone || '',
        recibeTitular: true,
        recibePoder: '',
        presenciaDe: stu.profesor_jefe ? `${stu.profesor_jefe} (Profesor Jefe)` : 'Equipo de Gestión PIE',
        motivo: 'Evaluación Diagnóstica Integral de Ingreso / Reevaluación PIE',
        fechaEvaluacion: new Date().toISOString().split('T')[0],
        instrumentos: '',
        pedagogicoFortalezas: '',
        pedagogicoNecesidades: '',
        socialFortalezas: '',
        socialNecesidades: '',
        trabajoColaborativo: '',
        apoyoHogar: '',
        acuerdos: '',

        // Específico Semestral (vacío por defecto cuando no existe informe previo)
        semester: 1,
        estudianteEstablecimiento: data.institution?.name || 'Liceo T.P. Campanario',
        profesionalFechaInforme: new Date().toISOString().split('T')[0],
        profesionalNombre: user?.name || '',
        reportePsicopedagogico: '',
        reportePsicologico: '',
        reporteFonoaudiologico: '',
        reporteKinesiologico: '',
        reporteTerapiaOcupacional: '',
        sugerenciasApoyo: '',
        firmaUsuarioNombre: user?.name || 'Profesional Evaluador',
        firmaUsuarioCargo: user?.role || 'Docente Especialista PIE',

        // Específico PAEC
        fechaElaboracion: new Date().toISOString().split('T')[0],
        neet: false,
        neep: true,
        apoderadoPreferente: {
          nombres: stu.guardian_name || 'Apoderado Preferente',
          paterno: '',
          materno: '',
          parentesco: stu.guardian_relation || 'Madre',
          run: stu.guardian_run || '—',
          celular: stu.guardian_phone || '—',
          correo: stu.guardian_email || '—'
        },
        apoderadoAlternativo: {
          nombres: 'Contacto de Respaldo',
          celular: '—'
        },
        indicacionesVulnerabilidad: '',
        indicacionesMedicas: { posee: 'no', detalle: '' },
        medicamentos: { ingiere: 'no', detalle: '' },
        fortalezasDesafios: '',
        gatilladores: '',
        intereses: '',
        estimulos: '',
        objetosInteres: '',
        palabrasClave: '',
        matrizCrisis: {
          inicio: { manifestaciones: '', estrategias: '' },
          crecimiento: { manifestaciones: '', estrategias: '' },
          explosion: { manifestaciones: '', estrategias: '' },
          recuperacion: { manifestaciones: '', estrategias: '' }
        },
        responsablesPaec: {
          encargado: {
            nombre: user?.name || '',
            cargo: user?.role === 'Admin' ? 'Coordinador(a) PIE' : (user?.role || 'Educadora Diferencial PIE'),
            telefono: user?.phone || '+56 9 8765 4321',
            correo: user?.email || 'pie@liceo.cl'
          },
          acompananteInterno: {
            nombre: stu.profesor_jefe || '',
            cargo: 'Profesor(a) de Aula Regular',
            telefono: ''
          },
          acompananteExterno: {
            nombre: '',
            institucion: 'Centro de Salud Familiar / Especialista Externo',
            telefono: ''
          }
        },

        // Específico Psicopedagógico
        motivoEvaluacion: 'Reevaluación de procesos de aprendizaje e ingreso Decreto 170 / 2010',
        instrumentosAplicados: '',
        antecedentesEscolares: '',
        analisisCognitivo: '',
        analisisSocioemocional: '',
        analisisMotor: '',
        sintesisCognitivo: '',
        sintesisSocioemocional: '',
        sintesisMotor: '',
        sintesisConclusion: '',
        sugerenciasEstablecimiento: '',
        sugerenciasEquipoAula: '',
        sugerenciasEstudiante: '',
        sugerenciasFamilia: '',
        pautaPedagogica: {},
        pautaSocial: {},
        profesionalProfesion: user?.role || 'Profesora de Educación Diferencial',
        profesionalRegistro: '',
        docenteNombre: stu.profesor_jefe || 'Docente de Aula',
        docenteProfesion: 'Profesor(a) de Educación Regular',
        docenteRut: '',

        // Secciones técnicas de reevaluación existentes
        sintesis: {
          diagnostico_ingreso: resolvedDiagnosis,
          diagnostico_actual: resolvedDiagnosis,
          decision_pie: 'CONTINUIDAD',
          fundamentacion_decision: '',
          fecha_reevaluacion: new Date().toISOString().split('T')[0],
          evidencias_adjuntas: ['Informe Psicopedagógico de Reevaluación', 'Registro de Co-docencia y Aula de Recursos']
        },
        avances: {
          contexto_escolar: '',
          asignaturas_mayor_progreso: grades.topSubjects && grades.topSubjects.length > 0 ? grades.topSubjects.join(', ') : '',
          asignaturas_menor_progreso: grades.needsSupportSubjects && grades.needsSupportSubjects.length > 0 ? grades.needsSupportSubjects.join(', ') : '',
          contexto_familiar_social: '',
          avances_especificos: specificInit
        },
        apoyos: [
          { tipo: 'Aula Común (Co-docencia y Estrategias DUA)', efectividad: 'Alta', continuidad: 'SI', observaciones: 'Estrategias de acceso curricular y evaluación diversificada.' },
          { tipo: 'Aula de Recursos (Educadora Diferencial)', efectividad: 'Alta', continuidad: 'SI', observaciones: 'Fortalecimiento de funciones cognitivas y lenguaje.' },
          { tipo: 'Apoyo Fonoaudiológico / Psicológico', efectividad: 'Media-Alta', continuidad: 'SI', observaciones: 'Atención según necesidad específica.' }
        ],
        estrategias_adecuaciones: '',
        sugerencias_familia: '',
        observaciones_generales: ''
      };

      setSelectedReportType(targetType);

      if (existingReport) {
        const normalizedSaved = normalizeSavedReportData(existingReport.report_data);
        setActiveReport(existingReport);
        setFormData({
          ...baseFormData,
          ...normalizedSaved,
          id: existingReport.id,
          evaluation_date: existingReport.evaluation_date || normalizedSaved.evaluation_date || baseFormData.evaluation_date,
          professional_run: existingReport.professional_run || normalizedSaved.professional_run || baseFormData.professional_run,
          professional_name: existingReport.professional_name || normalizedSaved.professional_name || baseFormData.professional_name,
          professional_role: existingReport.professional_role || normalizedSaved.professional_role || baseFormData.professional_role,
          professional_reg: existingReport.professional_reg || normalizedSaved.professional_reg || baseFormData.professional_reg,
          status: existingReport.status || normalizedSaved.status || 'Completado',
          diagnostico: cleanPieDiagnosis(normalizedSaved.diagnostico) || resolvedDiagnosis
        });
      } else {
        setActiveReport(null);
        setFormData(baseFormData);
      }

      setViewMode('editor');
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al obtener datos del estudiante.', 'error');
    } finally {
      setLoadingContext(false);
    }
  };

  // Abrir informe existente para ver o editar
  const handleOpenReport = async (reportId: string, mode: 'editor' | 'printable' = 'editor') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mineduc-reports/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('No se pudo cargar el informe.');

      const data = await res.json();
      setActiveReport(data);
      setSelectedReportType(data.report_type);
      setSelectedStudentRun(data.student_run);

      // Cargar también el contexto del estudiante para tener los datos de la institución y notas
      let stuDiag = '';
      const ctxRes = await fetch(`/api/mineduc-reports/student-context/${encodeURIComponent(data.student_run)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (ctxRes.ok) {
        const ctxData = await ctxRes.json();
        setStudentContext(ctxData);
        stuDiag = cleanPieDiagnosis(ctxData?.student?.pie_diagnosis);
      }

      const normalizedSaved = normalizeSavedReportData(data.report_data);

      setFormData({
        ...normalizedSaved,
        id: data.id,
        evaluation_date: data.evaluation_date || normalizedSaved.evaluation_date || new Date().toISOString().split('T')[0],
        professional_run: data.professional_run || normalizedSaved.professional_run || '',
        professional_name: data.professional_name || normalizedSaved.professional_name || '',
        professional_role: data.professional_role || normalizedSaved.professional_role || '',
        professional_reg: data.professional_reg || normalizedSaved.professional_reg || '',
        status: data.status || 'Borrador',
        diagnostico: cleanPieDiagnosis(normalizedSaved.diagnostico) || stuDiag
      });

      const canEdit = canEditReport(data);
      const targetMode = (mode === 'editor' && !canEdit) ? 'printable' : mode;
      if (mode === 'editor' && !canEdit) {
        Swal.fire({
          icon: 'info',
          title: 'Modo de Solo Lectura',
          text: 'Como docente de aula o usuario colaborador, tienes acceso de visualización e impresión para este informe ministerial.',
          timer: 2500,
          showConfirmButton: false
        });
      }

      setViewMode(targetMode);
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Guardar informe en la base de datos
  const handleSaveReport = async (targetStatus: 'Borrador' | 'Completado' | 'Firmado' = 'Borrador') => {
    if (!selectedStudentRun) {
      Swal.fire('Falta Estudiante', 'Debe seleccionar un estudiante para asociar el informe.', 'warning');
      return;
    }

    if (formData.id && !canEditReport(formData)) {
      Swal.fire('Acceso Restringido', 'No tienes permisos de edición sobre este informe ministerial.', 'warning');
      return;
    }
    if (!formData.id && !canCreateReport) {
      Swal.fire('Acceso Restringido', 'Solo los especialistas PIE y la coordinación pueden emitir informes oficiales.', 'warning');
      return;
    }

    try {
      const payload = {
        id: formData.id,
        student_run: selectedStudentRun,
        report_type: selectedReportType,
        academic_year: yearFilter,
        evaluation_date: formData.evaluation_date,
        professional_run: formData.professional_run,
        professional_name: formData.professional_name,
        professional_role: formData.professional_role,
        professional_reg: formData.professional_reg,
        status: targetStatus,
        report_data: {
          ...formData,
          status: targetStatus
        }
      };

      const res = await fetch('/api/mineduc-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el informe.');

      Swal.fire({
        icon: 'success',
        title: targetStatus === 'Borrador' ? 'Borrador Guardado' : 'Informe Oficial Guardado',
        text: `El informe para el RUT ${selectedStudentRun} ha sido guardado exitosamente en la base de datos.`,
        confirmButtonColor: '#0284c7'
      });

      setFormData((prev: any) => ({ ...prev, id: data.id, status: targetStatus }));
      if (cleanPieDiagnosis(formData.diagnostico)) {
        setStudentContext((prev: any) => prev ? ({
          ...prev,
          student: { ...(prev.student || {}), pie_diagnosis: cleanPieDiagnosis(formData.diagnostico) }
        }) : prev);
      }
      loadReports();
      loadStudents();
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Eliminar informe
  const handleDeleteReport = async (reportId: string, run: string) => {
    const reportToDelete = reports.find(r => r.id === reportId);
    if (reportToDelete && !canDeleteReport(reportToDelete)) {
      Swal.fire('Acceso Restringido', 'No tienes permisos para eliminar este informe ministerial.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: '¿Eliminar Formulario MINEDUC?',
      text: `Se eliminará el informe registrado para el RUT ${run}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/mineduc-reports/${reportId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al eliminar informe.');

        Swal.fire('Eliminado', 'El informe ha sido eliminado de la plataforma.', 'success');
        loadReports();
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const currentTypeInfo = useMemo(() => {
    return MINEDUC_REPORT_TYPES.find(r => r.id === selectedReportType) || MINEDUC_REPORT_TYPES[0];
  }, [selectedReportType]);

  const displayedCatalog = useMemo(() => {
    if (catalogCategory === 'OFFICIAL') return MINEDUC_OFFICIAL_TEMPLATES;
    if (catalogCategory === 'DIAGNOSTIC') return MINEDUC_DIAGNOSTIC_REPORT_TYPES;
    return ALL_MINEDUC_REPORT_TYPES;
  }, [catalogCategory]);

  // =========================================================================
  // VISTA 1: LISTADO DE INFORMES EXISTENTES
  // =========================================================================
  if (viewMode === 'list') {
    return (
      <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100%', borderRadius: '16px' }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.35rem' }}>
              <div style={{ background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
                <img
                  src="/images/logo_mineduc.jpg"
                  alt="MINEDUC"
                  style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
                />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Informes PIE & Formularios Oficiales MINEDUC
                </h1>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  Decreto Supremo Nº 170/2009 — Reevaluación Diagnóstica Integral & Ley TEA N° 21.545 (PAEC)
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {canCreateReport && (
              <button
                onClick={() => {
                  setViewMode('select_student');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Plus size={18} />
                Generar Nuevo Informe PIE
              </button>
            )}
          </div>
        </div>

        {/* Panel de Catálogo de Informes y Plantillas MINEDUC */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: '#0284c7' }} />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                Catálogo de Formularios e Informes PIE ({displayedCatalog.length} Modelos)
              </h2>
            </div>

            {/* Selector de Categorías del Catálogo */}
            <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setCatalogCategory('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: catalogCategory === 'ALL' ? '#ffffff' : 'transparent',
                  color: catalogCategory === 'ALL' ? '#0f172a' : '#64748b',
                  boxShadow: catalogCategory === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                Todos ({ALL_MINEDUC_REPORT_TYPES.length})
              </button>
              <button
                type="button"
                onClick={() => setCatalogCategory('OFFICIAL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: catalogCategory === 'OFFICIAL' ? '#ffffff' : 'transparent',
                  color: catalogCategory === 'OFFICIAL' ? '#0284c7' : '#64748b',
                  boxShadow: catalogCategory === 'OFFICIAL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                🌟 Certificados e Informes ({MINEDUC_OFFICIAL_TEMPLATES.length})
              </button>
              <button
                type="button"
                onClick={() => setCatalogCategory('DIAGNOSTIC')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: catalogCategory === 'DIAGNOSTIC' ? '#ffffff' : 'transparent',
                  color: catalogCategory === 'DIAGNOSTIC' ? '#7c3aed' : '#64748b',
                  boxShadow: catalogCategory === 'DIAGNOSTIC' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                📋 Reevaluaciones por Diagnóstico ({MINEDUC_DIAGNOSTIC_REPORT_TYPES.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {displayedCatalog.map(rt => (
              <div
                key={rt.id}
                onClick={() => {
                  setSelectedReportType(rt.id);
                  setViewMode('select_student');
                }}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  background: '#ffffff',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = rt.badgeColor;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: rt.badgeColor, background: rt.badgeBg, padding: '2px 6px', borderRadius: '4px' }}>
                      {rt.category}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>
                      {rt.code}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.35rem 0', lineHeight: 1.3 }}>
                    {rt.title}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rt.description}
                  </p>
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: rt.badgeColor, fontSize: '0.75rem', fontWeight: 700 }}>
                  <Plus size={14} /> Seleccionar Estudiante
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros y Buscador */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar por nombre, RUT de estudiante o evaluador..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadReports()}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={loadReports}
              style={{ padding: '0.5rem 0.85rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
            >
              Buscar
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#64748b' }}>
              <Filter size={15} /> Filtros:
            </div>

            {/* Filtro por Curso */}
            <select
              value={reportCourseFilter}
              onChange={e => setReportCourseFilter(e.target.value)}
              style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff', fontWeight: 600, color: '#0f172a' }}
            >
              <option value="TODOS">Todos los Cursos</option>
              {coursesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
            >
              <option value="TODOS">Todos los Formularios</option>
              {MINEDUC_REPORT_TYPES.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.code} - {rt.title}</option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={e => setYearFilter(parseInt(e.target.value, 10))}
              style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
            >
              <option value={2026}>Año 2026</option>
              <option value={2025}>Año 2025</option>
              <option value={2024}>Año 2024</option>
            </select>

            <button
              onClick={loadReports}
              title="Recargar"
              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={15} style={{ color: '#475569' }} />
            </button>
          </div>
        </div>

        {/* Tabla de Informes Emitidos */}
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
              Historial de Informes Registrados ({reports.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Vinculados de forma nativa al RUT único de cada estudiante
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Cargando informes ministeriales...</p>
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <FolderOpen size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
              <p style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No se han emitido informes con los filtros seleccionados.</p>
              <p style={{ margin: '0.35rem 0 1rem 0', fontSize: '0.8rem' }}>Haz clic en "Generar Nuevo Informe PIE" para comenzar.</p>
              {canCreateReport && (
                <button
                  onClick={() => setViewMode('select_student')}
                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Generar Primer Informe
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>RUT Estudiante</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Nombre del Estudiante</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Curso</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Tipo de Informe (Dec. 170)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Fecha Evaluación</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Profesional Evaluador</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => {
                    const repInfo = MINEDUC_REPORT_TYPES.find(t => t.id === r.report_type) || {
                      code: r.report_type,
                      title: r.report_type,
                      badgeBg: '#f1f5f9',
                      badgeColor: '#475569',
                      category: 'NEE'
                    };
                    const editable = canEditReport(r);
                    const deletable = canDeleteReport(r);

                    return (
                      <tr
                        key={r.id || i}
                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                          {r.student_run}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                          {r.student_name || 'Estudiante'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                          {r.desc_grado || 'Sin curso'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: repInfo.badgeBg,
                            color: repInfo.badgeColor
                          }}>
                            {repInfo.code} — {repInfo.title.substring(0, 32)}...
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                          {r.evaluation_date || 'En proceso'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                          <div style={{ fontWeight: 600 }}>{r.professional_name || 'Sin Asignar'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{r.professional_role || ''}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: r.status === 'Completado' || r.status === 'Firmado' ? '#dcfce7' : '#fef3c7',
                            color: r.status === 'Completado' || r.status === 'Firmado' ? '#15803d' : '#b45309'
                          }}>
                            {r.status || 'Borrador'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleOpenReport(r.id, 'printable')}
                              title="Imprimir / Vista Oficial"
                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', color: '#0284c7' }}
                            >
                              <Printer size={15} />
                            </button>
                            {editable ? (
                              <button
                                onClick={() => handleOpenReport(r.id, 'editor')}
                                title="Editar Formulario"
                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                              >
                                <Edit size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenReport(r.id, 'printable')}
                                title="Ver Informe (Solo Lectura)"
                                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', color: '#64748b' }}
                              >
                                <Eye size={15} />
                              </button>
                            )}
                            {deletable && (
                              <button
                                onClick={() => handleDeleteReport(r.id, r.student_run)}
                                title="Eliminar"
                                style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', color: '#b91c1c' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA 2: SELECCIÓN DE ESTUDIANTE Y TIPO DE INFORME
  // =========================================================================
  if (viewMode === 'select_student') {
    return (
      <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100%', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#334155'
            }}
          >
            <ArrowLeft size={16} /> Volver a Informes
          </button>

          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Paso 1 de 2: Seleccionar Tipo de Informe y Estudiante
          </span>
        </div>

        {/* Paso 1: Seleccionar Tipo de Informe */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            1. Selecciona el Tipo de Formulario Único MINEDUC a emitir
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
            Cada formulario adapta automáticamente sus criterios de reevaluación según el Decreto 170.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {MINEDUC_REPORT_TYPES.map(rt => {
              const isSelected = selectedReportType === rt.id;
              return (
                <div
                  key={rt.id}
                  onClick={() => setSelectedReportType(rt.id)}
                  style={{
                    border: isSelected ? `2px solid ${rt.badgeColor}` : '1px solid #e2e8f0',
                    background: isSelected ? rt.badgeBg : '#ffffff',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: rt.badgeColor }}>
                      {rt.category} ({rt.code})
                    </span>
                    {isSelected && <CheckCircle size={16} style={{ color: rt.badgeColor }} />}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                    {rt.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                    {rt.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Paso 2: Seleccionar Estudiante */}
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                2. Selecciona al Estudiante desde la Base de Matrícula
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Sus antecedentes, notas, edad cronológica y profesor jefe se pre-cargarán de forma automática usando su RUT único.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                style={{ padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              >
                <option value="TODOS">Todos los Cursos</option>
                {coursesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filtrar por RUT o Nombre..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  style={{ padding: '0.45rem 0.65rem 0.45rem 1.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', minWidth: '220px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '0.65rem 1rem' }}>RUT</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Estudiante</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Curso</th>
                  <th style={{ padding: '0.65rem 1rem' }}>Diagnóstico Previo</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No se encontraron estudiantes con los filtros especificados.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(s => {
                    const isSelected = selectedStudentRun === s.run;
                    const cleanRunKey = String(s.run || '').replace(/[^0-9kK]/g, '').toUpperCase();
                    const studentReports = reports.filter(
                      (r: any) => String(r.student_run || '').replace(/[^0-9kK]/g, '').toUpperCase() === cleanRunKey
                    );
                    const existingForType = studentReports.find((r: any) => r.report_type === selectedReportType);
                    const cleanDiag = cleanPieDiagnosis(s.pie_diagnosis);
                    return (
                      <tr
                        key={s.id || `${s.run}-${s.desc_grado}`}
                        style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f0f9ff' : 'transparent' }}
                      >
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                          {s.run}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                          {s.full_name}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 500, color: '#334155' }}>{s.desc_grado}</span>
                            {(!s.is_retired && s.status !== 'Retirado') ? (
                              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                Vigente
                              </span>
                            ) : (
                              <span 
                                title={s.withdrawal_reason || 'Estudiante retirado del curso'}
                                style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}
                              >
                                Retirado {s.withdrawal_reason ? `(${s.withdrawal_reason})` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {cleanDiag ? (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                {cleanDiag}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Sin registro</span>
                            )}
                            {existingForType && (
                              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                ✓ Informe guardado
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleSelectStudent(s.run, undefined, s.id, s.desc_grado)}
                            disabled={loadingContext}
                            style={{
                              background: existingForType ? '#0d9488' : '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.4rem 0.85rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Sparkles size={14} /> {existingForType ? 'Editar Informe Guardado' : 'Redactar Informe'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA 3: EDITOR DEL FORMULARIO ÚNICO MINEDUC
  // =========================================================================
  if (viewMode === 'editor') {
    const student = studentContext?.student || {};
    const grades = studentContext?.gradesSummary || {};
    const institution = studentContext?.institution || {};
    const staffList = studentContext?.staffList || [];

    return (
      <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100%', borderRadius: '16px' }}>
        {/* Barra superior de acciones (Sticky para fácil acceso al hacer scroll) */}
        <div style={{
          position: 'sticky',
          top: '-1.5rem',
          zIndex: 40,
          background: 'rgba(248, 250, 252, 0.96)',
          backdropFilter: 'blur(8px)',
          padding: '0.85rem 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderBottom: '1px solid #e2e8f0'
        }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#334155'
              }}
            >
              <ArrowLeft size={16} /> Volver
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, background: currentTypeInfo.badgeBg, color: currentTypeInfo.badgeColor, padding: '2px 8px', borderRadius: '4px' }}>
                  {currentTypeInfo.code}
                </span>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {currentTypeInfo.title}
                </h1>
                {formData.id ? (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '6px' }}>
                    ✓ Guardado en BD ({formData.status || 'Completado'})
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '6px' }}>
                    Nuevo Informe (Sin guardar aún)
                  </span>
                )}
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Estudiante: <strong>{student.full_name}</strong> (RUT: {student.run}) — Curso: <strong>{student.desc_grado}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => handleSaveReport('Borrador')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Save size={16} /> Guardar Borrador
            </button>

            <button
              onClick={() => handleSaveReport('Completado')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <CheckCircle size={16} /> Finalizar Informe
            </button>

            <button
              onClick={() => setViewMode('printable')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Printer size={16} /> Vista Previa e Impresión Oficial
            </button>
          </div>
        </div>

        {/* Ficha Resumen de Datos Extraídos de la Matrícula */}
        <div style={{ background: '#ffffff', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          {/* Cabecera del Establecimiento Educacional */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Establecimiento Educacional Oficial
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {institution.name || 'Liceo Técnico Profesional'}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span><strong>RBD:</strong> {institution.rbd || '—'}</span>
                  <span>•</span>
                  <span><strong>Comuna:</strong> {institution.commune || '—'}</span>
                  <span>•</span>
                  <span><strong>Director(a):</strong> {institution.director || 'Director(a) Establecimiento'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
              <CheckCircle size={14} /> Expediente Sincronizado
            </div>
          </div>

          {/* Rejilla de Antecedentes Institucionales del Estudiante */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {/* Tarjeta 1: Alumno y Curso */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <GraduationCap size={15} /> Estudiante & Curso Actual
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
                {student.full_name || 'Estudiante'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>RUN: <strong>{student.run || '—'}</strong></span>
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  {student.desc_grado || 'Matriculado'}
                </span>
              </div>
            </div>

            {/* Tarjeta 2: Fecha de Nacimiento y Edad Cronológica */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <Calendar size={15} /> Fecha de Nacimiento & Edad
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                {formatChileDate(student.birth_date)}
              </div>
              <div>
                <span style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Clock size={12} /> {student.calculatedAge?.text || 'Calculada al día de hoy'}
                </span>
              </div>
            </div>

            {/* Tarjeta 3: Jefatura y Apoderado */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <UserCheck size={15} /> Jefatura & Familia
              </div>
              <div style={{ fontSize: '0.78rem', color: '#334155', marginBottom: '0.25rem' }}>
                <span style={{ color: '#64748b' }}>Prof. Jefe:</span> <strong>{student.profesor_jefe || 'Sin Asignar'}</strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                <span style={{ color: '#64748b' }}>Apoderado:</span> <strong>{student.guardian_name || 'No registrado'}</strong> {student.guardian_relation ? `(${student.guardian_relation})` : ''}
              </div>
            </div>

            {/* Tarjeta 4: Rendimiento Curricular & PIE */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.85rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <Award size={15} /> Calificaciones & Diagnóstico
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: grades.overallAverage ? '#0284c7' : '#64748b', marginBottom: '0.2rem' }}>
                Promedio General: {grades.overallAverage ? grades.overallAverage.toFixed(1) : 'S/N'} ({grades.totalGradesCount || 0} calificaciones)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                Diagnóstico PIE: <strong style={{ color: (cleanPieDiagnosis(formData.diagnostico) || cleanPieDiagnosis(student.pie_diagnosis)) ? '#0369a1' : '#64748b' }}>{cleanPieDiagnosis(formData.diagnostico) || cleanPieDiagnosis(student.pie_diagnosis) || 'Sin diagnóstico registrado'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Renderizado de Editor según tipo de informe */}
        {selectedReportType === 'SIMCE_NEEP' ? (
          <SimceNeepEditor formData={formData} setFormData={setFormData} student={student} institution={institution} />
        ) : selectedReportType === 'FUS_MINEDUC' ? (
          <FusMineducEditor formData={formData} setFormData={setFormData} student={student} institution={institution} />
        ) : selectedReportType === 'INFORME_FAMILIA_SEMESTRAL' ? (
          <FamilyReportSemesterEditor formData={formData} setFormData={setFormData} student={student} institution={institution} />
        ) : selectedReportType === 'PAEC_PLAN_TEA' ? (
          <PaecPlanTeaEditor formData={formData} setFormData={setFormData} student={student} institution={institution} />
        ) : selectedReportType === 'PSICOPEDAGOGICO_DEC170' ? (
          <PsychopedagogicalReportEditor formData={formData} setFormData={setFormData} student={student} institution={institution} />
        ) : (
          /* Formulario Decreto 170 Dividido en Secciones (Diagnóstico Específico) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* SECCIÓN I: IDENTIFICACIÓN DEL PROFESIONAL Y SÍNTESIS DIAGNÓSTICA */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7', margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              I. Síntesis General de Reevaluación & Profesional Responsable
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Profesional Responsable (Selección Rápida)
                </label>
                <select
                  value={formData.professional_name}
                  onChange={e => {
                    const sel = staffList.find((s: any) => s.name === e.target.value);
                    if (sel) {
                      setFormData({
                        ...formData,
                        professional_name: sel.name,
                        professional_run: sel.run || formData.professional_run,
                        professional_role: sel.role || formData.professional_role
                      });
                    } else {
                      setFormData({ ...formData, professional_name: e.target.value });
                    }
                  }}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                >
                  <option value="">-- Seleccionar de la nómina docente/PIE --</option>
                  {staffList.map((st: any) => (
                    <option key={st.run || st.name} value={st.name}>{st.name} ({st.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  RUN Profesional
                </label>
                <input
                  type="text"
                  value={formData.professional_run}
                  onChange={e => setFormData({ ...formData, professional_run: e.target.value })}
                  placeholder="Ej: 15.678.901-2"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Cargo / Especialidad
                </label>
                <input
                  type="text"
                  value={formData.professional_role}
                  onChange={e => setFormData({ ...formData, professional_role: e.target.value })}
                  placeholder="Ej: Educadora Diferencial / Psicólogo"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Registro Profesional / MINEDUC
                </label>
                <input
                  type="text"
                  value={formData.professional_reg}
                  onChange={e => setFormData({ ...formData, professional_reg: e.target.value })}
                  placeholder="Ej: Reg. Especial Nº 45892"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Fecha de Reevaluación
                </label>
                <input
                  type="date"
                  value={formData.evaluation_date}
                  onChange={e => setFormData({ ...formData, evaluation_date: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Decisión del Proceso de Reevaluación
                </label>
                <select
                  value={formData.sintesis?.decision_pie}
                  onChange={e => setFormData({
                    ...formData,
                    sintesis: { ...formData.sintesis, decision_pie: e.target.value }
                  })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  <option value="CONTINUIDAD">Continuidad en PIE</option>
                  <option value="EGRESO">Egreso del PIE</option>
                  <option value="CAMBIO_DIAGNOSTICO">Cambio de Diagnóstico</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                Fundamentación Técnica de Egreso o Continuidad en el PIE
              </label>
              <textarea
                rows={3}
                value={formData.sintesis?.fundamentacion_decision}
                onChange={e => setFormData({
                  ...formData,
                  sintesis: { ...formData.sintesis, fundamentacion_decision: e.target.value }
                })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* SECCIÓN II: AVANCES DEL ESTUDIANTE EN CONTEXTO ESCOLAR Y ÁREAS ESPECÍFICAS */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7', margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              II. Reevaluación Psicoeducativa & Avances Curriculares
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                1. Avances del/la Estudiante en el Contexto Escolar y de Aula Regular
              </label>
              <textarea
                rows={3}
                value={formData.avances?.contexto_escolar}
                onChange={e => setFormData({
                  ...formData,
                  avances: { ...formData.avances, contexto_escolar: e.target.value }
                })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Asignaturas o Áreas de Mayor Progreso
                </label>
                <input
                  type="text"
                  value={formData.avances?.asignaturas_mayor_progreso}
                  onChange={e => setFormData({
                    ...formData,
                    avances: { ...formData.avances, asignaturas_mayor_progreso: e.target.value }
                  })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Asignaturas o Áreas con Menor Progreso (Requieren Apoyo Prioritario)
                </label>
                <input
                  type="text"
                  value={formData.avances?.asignaturas_menor_progreso}
                  onChange={e => setFormData({
                    ...formData,
                    avances: { ...formData.avances, asignaturas_menor_progreso: e.target.value }
                  })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                2. Avances en el Contexto Familiar y Social
              </label>
              <textarea
                rows={2}
                value={formData.avances?.contexto_familiar_social}
                onChange={e => setFormData({
                  ...formData,
                  avances: { ...formData.avances, contexto_familiar_social: e.target.value }
                })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </div>

            {/* Áreas Específicas del Diagnóstico */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.75rem 0' }}>
                3. Avances Específicos para {currentTypeInfo.title}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {currentTypeInfo.specificAreas?.map(area => (
                  <div key={area}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      {area}:
                    </label>
                    <textarea
                      rows={2}
                      placeholder={`Describa avances en ${area}...`}
                      value={formData.avances?.avances_especificos?.[area] || ''}
                      onChange={e => {
                        const updated = { ...formData.avances?.avances_especificos, [area]: e.target.value };
                        setFormData({
                          ...formData,
                          avances: { ...formData.avances, avances_especificos: updated }
                        });
                      }}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN III: EVALUACIÓN DE LOS APOYOS IMPLEMENTADOS */}
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0284c7', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                III. Evaluación de los Apoyos Implementados (Decreto 170)
              </h2>
              <button
                type="button"
                onClick={() => {
                  const currentApoyos = formData.apoyos || [];
                  setFormData({
                    ...formData,
                    apoyos: [...currentApoyos, { tipo: 'Nuevo Apoyo', efectividad: 'Media', continuidad: 'SI', observaciones: '' }]
                  });
                }}
                style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
              >
                + Agregar Apoyo
              </button>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.5rem' }}>Tipo de Apoyo Especializado</th>
                    <th style={{ padding: '0.5rem', width: '150px' }}>Efectividad</th>
                    <th style={{ padding: '0.5rem', width: '130px' }}>¿Continuidad?</th>
                    <th style={{ padding: '0.5rem' }}>Observaciones y Progreso</th>
                    <th style={{ padding: '0.5rem', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.apoyos || []).map((apoyo: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem' }}>
                        <input
                          type="text"
                          value={apoyo.tipo}
                          onChange={e => {
                            const copy = [...formData.apoyos];
                            copy[idx].tipo = e.target.value;
                            setFormData({ ...formData, apoyos: copy });
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.4rem' }}>
                        <select
                          value={apoyo.efectividad}
                          onChange={e => {
                            const copy = [...formData.apoyos];
                            copy[idx].efectividad = e.target.value;
                            setFormData({ ...formData, apoyos: copy });
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        >
                          <option value="Muy Alta">Muy Alta</option>
                          <option value="Alta">Alta</option>
                          <option value="Media-Alta">Media-Alta</option>
                          <option value="Media">Media</option>
                          <option value="Baja">Baja</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem' }}>
                        <select
                          value={apoyo.continuidad}
                          onChange={e => {
                            const copy = [...formData.apoyos];
                            copy[idx].continuidad = e.target.value;
                            setFormData({ ...formData, apoyos: copy });
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          <option value="SI">Sí, continuar</option>
                          <option value="NO">No, retirar</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.4rem' }}>
                        <input
                          type="text"
                          value={apoyo.observaciones}
                          onChange={e => {
                            const copy = [...formData.apoyos];
                            copy[idx].observaciones = e.target.value;
                            setFormData({ ...formData, apoyos: copy });
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = formData.apoyos.filter((_: any, i: number) => i !== idx);
                            setFormData({ ...formData, apoyos: copy });
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Estrategias de Diversificación de la Enseñanza & Adecuaciones Curriculares (Dec. 83)
                </label>
                <textarea
                  rows={3}
                  value={formData.estrategias_adecuaciones}
                  onChange={e => setFormData({ ...formData, estrategias_adecuaciones: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Sugerencias & Orientaciones para la Familia / Apoderado
                </label>
                <textarea
                  rows={3}
                  value={formData.sugerencias_familia}
                  onChange={e => setFormData({ ...formData, sugerencias_familia: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Barra inferior de acciones (siempre accesible al finalizar la edición) */}
        <div style={{

          marginTop: '1.75rem',
          padding: '1.25rem',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Volver a la Lista
          </button>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSaveReport('Borrador')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Save size={16} /> Guardar Borrador
            </button>

            <button
              type="button"
              onClick={() => handleSaveReport('Completado')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
              }}
            >
              <CheckCircle size={16} /> Finalizar Informe Oficial
            </button>

            <button
              type="button"
              onClick={() => setViewMode('printable')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
              }}
            >
              <Printer size={16} /> Ver Versión Impresa (FUS)
            </button>
          </div>
        </div>
      </div>

  );
}

  // =========================================================================
  // VISTA 4: DOCUMENTO IMPRIMIBLE OFICIAL MINEDUC (DECRETO 170)
  // =========================================================================
  const student = studentContext?.student || {};
  const institution = studentContext?.institution || {};
  const currentReportTypeObj = currentTypeInfo;

  return (
    <div style={{ padding: '1.5rem', background: '#64748b', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Botonera de control (oculta en la impresión) */}
      <div className="no-print" style={{
        width: '100%',
        maxWidth: '850px',
        background: '#ffffff',
        padding: '0.75rem 1.25rem',
        borderRadius: '10px',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => setViewMode('editor')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#334155'
          }}
        >
          <ArrowLeft size={16} /> Volver al Editor
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)'
            }}
          >
            <Printer size={16} /> Imprimir / Guardar en PDF
          </button>
        </div>
      </div>

      {/* HOJA OFICIAL CON DISEÑO IDÉNTICO AL MINEDUC */}
      <div
        id="mineduc-print-sheet"
        style={{
          width: '100%',
          maxWidth: '850px',
          background: '#ffffff',
          padding: '1.5rem 2rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          borderRadius: '4px',
          fontFamily: '"Inter", "Arial", "Helvetica", sans-serif',
          color: '#000000',
          fontSize: '11px',
          lineHeight: '1.4'
        }}
      >
        <MineducPrintStyles />

        {selectedReportType === 'SIMCE_NEEP' ? (
          <SimceNeepCertificate data={formData} student={student} institution={institution} />
        ) : selectedReportType === 'FUS_MINEDUC' ? (
          <FusMineducReport data={formData} student={student} institution={institution} />
        ) : selectedReportType === 'INFORME_FAMILIA_SEMESTRAL' ? (
          <FamilyReportSemester data={formData} student={student} institution={institution} />
        ) : selectedReportType === 'PAEC_PLAN_TEA' ? (
          <PaecPlanTea data={formData} student={student} institution={institution} />
        ) : selectedReportType === 'PSICOPEDAGOGICO_DEC170' ? (
          <PsychopedagogicalReport data={formData} student={student} institution={institution} />
        ) : (
          <OfficialFuReevaluacionMineduc
            data={formData}
            student={student}
            institution={institution}
            reportTypeObj={currentReportTypeObj}
          />
        )}
      </div>
    </div>
  );
};
