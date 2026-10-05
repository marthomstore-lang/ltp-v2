import React, { useState, useEffect } from 'react';
import { Printer, X, User, Users, Save, FileSpreadsheet, Award, Layers } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  PERSONALITY_REPORT_TEMPLATES,
  ReportLevelKey,
  detectReportTemplateKey,
  getQualifierStyle
} from '../utils/personalityIndicators';

export interface SubjectGrade {
  name: string;
  n1?: number | string;
  n2?: number | string;
  n3?: number | string;
  n4?: number | string;
  n5?: number | string;
  n6?: number | string;
  n7?: number | string;
  n8?: number | string;
  n9?: number | string;
  n10?: number | string;
  average?: number | string;
}

export interface StudentReportData {
  id: string;
  listNumber?: number;
  fullName: string;
  run: string;
  course: string;
  promedioGeneral: number | string;
  azules: number;
  rojas: number;
  subjectGrades: SubjectGrade[];
  homeroomTeacher?: string;
}

interface PrintGradeReportModalProps {
  courseName: string;
  academicYear?: number | string;
  period?: string;
  homeroomTeacher?: string;
  directorName?: string;
  students: StudentReportData[];
  onClose: () => void;
  initialStudentId?: string;
  initialReportType?: 'grades' | 'personality' | 'both';
}

export const PrintGradeReportModal: React.FC<PrintGradeReportModalProps> = ({
  courseName,
  academicYear = 2026,
  period = '1er Semestre',
  homeroomTeacher = 'Profesor(a) Jefe',
  directorName = 'Dirección del Establecimiento',
  students = [],
  onClose,
  initialStudentId,
  initialReportType = 'grades'
}) => {
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');
  const [reportType, setReportType] = useState<'grades' | 'personality' | 'both'>(initialReportType);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students.length > 0 ? students[0].id : '')
  );

  // Pauta oficial de Informe al Hogar / Personalidad según nivel del curso
  const [reportLevelKey, setReportLevelKey] = useState<ReportLevelKey>(() =>
    detectReportTemplateKey(courseName)
  );
  const [allReportsMap, setAllReportsMap] = useState<Record<string, any>>({});
  const [savingPersonality, setSavingPersonality] = useState<boolean>(false);

  // Nombres editables para las firmas
  const [teacherInput, setTeacherInput] = useState<string>(homeroomTeacher);
  const [directorInput, setDirectorInput] = useState<string>(directorName);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    setReportLevelKey(detectReportTemplateKey(courseName));
  }, [courseName]);

  useEffect(() => {
    fetch('/api/staff')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStaffList(data);
        }
      })
      .catch(() => {});

    fetch('/api/config/institutional-settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.directorName) {
          setDirectorInput(data.directorName);
        }
      })
      .catch(() => {});

    fetch('/api/personality-reports')
      .then(res => res.json())
      .then(data => {
        if (data && data.reports) {
          setAllReportsMap(data.reports);
        }
      })
      .catch(() => {});
  }, []);

  const handleTriggerPrint = () => {
    window.print();
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const studentsToPrint = printMode === 'all' ? students : selectedStudent ? [selectedStudent] : [];

  const getStudentReportKey = (st: StudentReportData) =>
    String(st.id || st.run || st.fullName || 'student').trim();

  const getStudentEvaluation = (st: StudentReportData) => {
    const key = getStudentReportKey(st);
    const byId = allReportsMap[key];
    const byRun = st.run ? allReportsMap[String(st.run).trim()] : undefined;
    return byId || byRun || { sem1: {}, sem2: {}, observations: '' };
  };

  const handleUpdateIndicator = (
    st: StudentReportData,
    semester: 'sem1' | 'sem2',
    indicatorId: string,
    value: string
  ) => {
    const key = getStudentReportKey(st);
    setAllReportsMap(prev => {
      const existing = prev[key] || { sem1: {}, sem2: {}, observations: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          studentName: st.fullName,
          studentRun: st.run,
          course: st.course || courseName,
          levelKey: reportLevelKey,
          [semester]: {
            ...(existing[semester] || {}),
            [indicatorId]: value
          }
        }
      };
    });
  };

  const handleUpdateObservations = (st: StudentReportData, text: string) => {
    const key = getStudentReportKey(st);
    setAllReportsMap(prev => {
      const existing = prev[key] || { sem1: {}, sem2: {}, observations: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          studentName: st.fullName,
          studentRun: st.run,
          course: st.course || courseName,
          levelKey: reportLevelKey,
          observations: text
        }
      };
    });
  };

  const handleQuickFillStudent = (st: StudentReportData, semester: 'sem1' | 'sem2', qualifier: string) => {
    const tpl = PERSONALITY_REPORT_TEMPLATES[reportLevelKey];
    const nextSem: Record<string, string> = {};
    tpl.ambitos.forEach(amb =>
      amb.sections.forEach(sec =>
        sec.indicators.forEach(ind => {
          nextSem[ind.id] = qualifier;
        })
      )
    );
    const key = getStudentReportKey(st);
    setAllReportsMap(prev => {
      const existing = prev[key] || { sem1: {}, sem2: {}, observations: '' };
      return {
        ...prev,
        [key]: {
          ...existing,
          studentName: st.fullName,
          studentRun: st.run,
          course: st.course || courseName,
          levelKey: reportLevelKey,
          [semester]: nextSem
        }
      };
    });
  };

  const handleSaveStudentPersonality = async (st: StudentReportData) => {
    if (!st) return;
    setSavingPersonality(true);
    try {
      const key = getStudentReportKey(st);
      const evalData = getStudentEvaluation(st);
      const authToken = sessionStorage.getItem('ltp_token') || '';
      const res = await fetch('/api/personality-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          studentKey: key,
          reportData: {
            studentName: st.fullName,
            studentRun: st.run,
            course: st.course || courseName,
            levelKey: reportLevelKey,
            sem1: evalData.sem1 || {},
            sem2: evalData.sem2 || {},
            observations: evalData.observations || ''
          }
        })
      });
      if (!res.ok) throw new Error('Error al guardar en Supabase');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Informe de ${st.fullName} guardado`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo guardar el informe', 'error');
    } finally {
      setSavingPersonality(false);
    }
  };

  // Actualizar automáticamente el profesor jefe si el estudiante seleccionado tiene uno asignado
  useEffect(() => {
    if (selectedStudent && selectedStudent.homeroomTeacher && selectedStudent.homeroomTeacher !== 'Sin Asignar') {
      const formatted = selectedStudent.homeroomTeacher.startsWith('Prof.')
        ? selectedStudent.homeroomTeacher
        : `Prof. ${selectedStudent.homeroomTeacher}`;
      setTeacherInput(formatted);
    }
  }, [selectedStudentId, selectedStudent]);

  // Función para filtrar solo las asignaturas que tienen al menos una nota o promedio válido
  const hasAnyGrade = (sub: SubjectGrade) => {
    const keys: (keyof SubjectGrade)[] = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'];
    const hasNote = keys.some(k => {
      const val = sub[k];
      if (val === undefined || val === null || val === '' || val === '-') return false;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return !isNaN(num) && num > 0;
    });
    const hasAvg = sub.average && sub.average !== '-' && !isNaN(parseFloat(String(sub.average)));
    return hasNote || hasAvg;
  };

  const currentTemplate = PERSONALITY_REPORT_TEMPLATES[reportLevelKey];

  return (
    <div className="print-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* IMPRESION CSS OBLIGATORIA EN PANTALLA Y EN IMPRESORA */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-modal-overlay,
          .print-modal-overlay * {
            visibility: visible !important;
          }
          .print-modal-overlay {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-report-page {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 1.2cm !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '1020px',
        width: '100%',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>

        {/* CONTROLES SUPERIORES (NO SE IMPRIMEN) */}
        <div className="no-print" style={{
          padding: '1rem 1.5rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer color="#4f46e5" size={22} />
                Emisión de Informes Oficiales — {courseName}
              </h2>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Año Lectivo: {academicYear} | Período: {period}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              {/* SELECTOR DE TIPO DE INFORME */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '2px' }}>
                <button
                  onClick={() => setReportType('grades')}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    background: reportType === 'grades' ? '#ffffff' : 'transparent',
                    color: reportType === 'grades' ? '#4f46e5' : '#475569',
                    boxShadow: reportType === 'grades' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <FileSpreadsheet size={14} /> Notas
                </button>
                <button
                  onClick={() => setReportType('personality')}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    background: reportType === 'personality' ? '#ffffff' : 'transparent',
                    color: reportType === 'personality' ? '#0f766e' : '#475569',
                    boxShadow: reportType === 'personality' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Award size={14} /> Informe Hogar / Personalidad
                </button>
                <button
                  onClick={() => setReportType('both')}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    background: reportType === 'both' ? '#ffffff' : 'transparent',
                    color: reportType === 'both' ? '#1e40af' : '#475569',
                    boxShadow: reportType === 'both' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Layers size={14} /> Ambos
                </button>
              </div>

              {/* SELECTOR MODO DE IMPRESIÓN */}
              <div style={{ display: 'flex', background: '#cbd5e1', padding: '3px', borderRadius: '8px' }}>
                <button
                  onClick={() => setPrintMode('single')}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    background: printMode === 'single' ? '#ffffff' : 'transparent',
                    color: printMode === 'single' ? '#4f46e5' : '#475569',
                    boxShadow: printMode === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <User size={14} /> 1 por 1
                </button>
                <button
                  onClick={() => setPrintMode('all')}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    background: printMode === 'all' ? '#ffffff' : 'transparent',
                    color: printMode === 'all' ? '#4f46e5' : '#475569',
                    boxShadow: printMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Users size={14} /> Curso ({students.length})
                </button>
              </div>

              {/* SELECTOR DE ESTUDIANTE INDIVIDUAL */}
              {printMode === 'single' && (
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  style={{
                    padding: '0.42rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#0f172a',
                    background: '#ffffff',
                    maxWidth: '240px'
                  }}
                >
                  {students.map((st, idx) => (
                    <option key={st.id} value={st.id}>
                      {(st.listNumber || idx + 1)}. {st.fullName}
                    </option>
                  ))}
                </select>
              )}

              {/* BOTÓN IMPRIMIR */}
              <button
                onClick={handleTriggerPrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Printer size={17} /> Imprimir {printMode === 'single' ? 'Informe' : `Curso (${students.length})`}
              </button>

              {/* BOTÓN CERRAR */}
              <button
                onClick={onClose}
                style={{
                  background: '#cbd5e1',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#334155'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* BARRA DE CONFIGURACIÓN DE PAUTA DE PERSONALIDAD / HOGAR */}
          {(reportType === 'personality' || reportType === 'both') && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.65rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534' }}>
                  📚 Pauta Oficial (Pre-Kínder a 4° Medio):
                </span>
                <select
                  value={reportLevelKey}
                  onChange={e => setReportLevelKey(e.target.value as ReportLevelKey)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #86efac',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                >
                  {Object.values(PERSONALITY_REPORT_TEMPLATES).map(tpl => (
                    <option key={tpl.key} value={tpl.key}>
                      {tpl.levelLabel} — {tpl.reportTitle}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent && printMode === 'single' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#15803d' }}>Rellenar 1er Sem:</span>
                  {currentTemplate.scale.map(sc => (
                    <button
                      key={`qf1-${sc.code}`}
                      type="button"
                      onClick={() => handleQuickFillStudent(selectedStudent, 'sem1', sc.code)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '5px',
                        border: `1px solid ${sc.color}`,
                        background: sc.bgColor,
                        color: sc.color,
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {sc.code}
                    </button>
                  ))}

                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#15803d', marginLeft: '0.35rem' }}>2do Sem:</span>
                  {currentTemplate.scale.map(sc => (
                    <button
                      key={`qf2-${sc.code}`}
                      type="button"
                      onClick={() => handleQuickFillStudent(selectedStudent, 'sem2', sc.code)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '5px',
                        border: `1px solid ${sc.color}`,
                        background: sc.bgColor,
                        color: sc.color,
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {sc.code}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleSaveStudentPersonality(selectedStudent)}
                    disabled={savingPersonality}
                    style={{
                      marginLeft: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: savingPersonality ? 'wait' : 'pointer'
                    }}
                  >
                    <Save size={14} /> {savingPersonality ? 'Guardando...' : 'Guardar en Nube'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EDICIÓN DE NOMBRES PARA FIRMAS CON SELECTOR DE DOCENTES/DIRECTIVOS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b' }}>
                  ✍️ Nombre Educador(a) / Profesor(a) Jefe:
                </label>
                <select
                  onChange={e => {
                    if (e.target.value) setTeacherInput(e.target.value);
                  }}
                  value=""
                  style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontWeight: 700, cursor: 'pointer', maxWidth: '210px' }}
                >
                  <option value="">👤 Elegir de Funcionarios...</option>
                  {staffList.map(s => {
                    const fullName = s.full_name || s.name;
                    const val = fullName.startsWith('Prof.') ? fullName : `Prof. ${fullName}`;
                    return (
                      <option key={s.id || s.run} value={val}>
                        {fullName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <input
                type="text"
                value={teacherInput}
                onChange={e => setTeacherInput(e.target.value)}
                placeholder="Ej: Prof. Solange Isabel Umanzor Dastres"
                style={{ width: '100%', padding: '0.38rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b' }}>
                  ✍️ Nombre del Director(a):
                </label>
                <select
                  onChange={e => {
                    if (e.target.value) setDirectorInput(e.target.value);
                  }}
                  value=""
                  style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontWeight: 700, cursor: 'pointer', maxWidth: '210px' }}
                >
                  <option value="">🎓 Elegir de Directivos...</option>
                  {staffList.map(s => {
                    const fullName = s.full_name || s.name;
                    const val = fullName.startsWith('Don') || fullName.startsWith('Dña') ? fullName : `Don/Dña. ${fullName}`;
                    return (
                      <option key={s.id || s.run} value={val}>
                        {fullName}
                      </option>
                    );
                  })}
                </select>
              </div>
              <input
                type="text"
                value={directorInput}
                onChange={e => setDirectorInput(e.target.value)}
                placeholder="Ej: Juan Pérez González"
                style={{ width: '100%', padding: '0.38rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        {/* VISTA PREVIA / DOCUMENTOS IMPRIMIBLES */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#525659' }}>
          {studentsToPrint.length === 0 ? (
            <div style={{ background: '#ffffff', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
              No se encontraron alumnos para este curso.
            </div>
          ) : (
            studentsToPrint.map((st, sIndex) => {
              const avgNum = typeof st.promedioGeneral === 'number' ? st.promedioGeneral : parseFloat(String(st.promedioGeneral));
              const isApproved = isNaN(avgNum) || avgNum >= 4.0;
              const displayCourseName = st.course && st.course !== 'Curso' ? st.course : courseName;
              const activeSubjectGrades = st.subjectGrades ? st.subjectGrades.filter(hasAnyGrade) : [];
              const studentEval = getStudentEvaluation(st);

              return (
                <React.Fragment key={st.id || sIndex}>
                  {/* =================================================================== */}
                  {/* PÁGINA 1: INFORME DE CALIFICACIONES (SI ESTÁ ACTIVO)                */}
                  {/* =================================================================== */}
                  {(reportType === 'grades' || reportType === 'both') && (
                    <div
                      className="printable-report-page"
                      style={{
                        background: '#ffffff',
                        borderRadius: '8px',
                        padding: '2rem',
                        marginBottom: '2rem',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                        color: '#0f172a',
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      {/* ENCABEZADO INSTITUCIONAL CON LOGOS Y FRANJA MINISTERIAL */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingBottom: '0.65rem' }}>
                        <div style={{ width: '120px' }}>
                          <img
                            src="/images/logo_mineduc.jpg"
                            alt="Ministerio de Educación"
                            style={{ maxHeight: '48px', maxWidth: '120px', objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#004b87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            REPÚBLICA DE CHILE • MINISTERIO DE EDUCACIÓN
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#1e293b' }}>
                            LICEO TÉCNICO PROFESIONAL CAMPANARIO MARCOS DELUCCHI FONCK
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            RBD: 3941-1 • Yungay, Región del Ñuble
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#004b87', textTransform: 'uppercase', marginTop: '3px' }}>
                            INFORME DE CALIFICACIONES — {period} ({academicYear})
                          </div>
                        </div>

                        <div style={{ width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <img
                            src="/images/logo_liceo.png"
                            alt="Insignia LTP Campanario"
                            style={{ maxHeight: '52px', maxWidth: '75px', objectFit: 'contain' }}
                          />
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                            {new Date().toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      </div>

                      {/* Franja Bicolor Oficial */}
                      <div style={{ display: 'flex', height: '3.5px', width: '100%', marginBottom: '1.25rem' }}>
                        <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
                        <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
                      </div>

                      {/* FICHA DEL ESTUDIANTE */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>ESTUDIANTE</span>
                          <strong style={{ fontSize: '1rem', color: '#0f172a', textTransform: 'uppercase' }}>{st.fullName}</strong>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>RUN / RUT</span>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{st.run || 'Sin Registro'}</strong>
                        </div>

                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, display: 'block' }}>NIVEL / CURSO</span>
                          <strong style={{ fontSize: '0.95rem', color: '#4f46e5' }}>{displayCourseName}</strong>
                        </div>
                      </div>

                      {/* TABLA DE NOTAS */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1' }}>
                          <thead>
                            <tr style={{ background: '#e2e8f0', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase' }}>
                              <th style={{ padding: '0.6rem', textAlign: 'left', border: '1px solid #cbd5e1', width: '32%' }}>ASIGNATURA</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N1</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N2</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N3</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N4</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N5</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N6</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N7</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N8</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N9</th>
                              <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '5.5%' }}>N10</th>
                              <th style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid #94a3b8', background: '#dbeafe', color: '#1e40af', width: '13%', fontWeight: 900 }}>PROM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeSubjectGrades.length > 0 ? (
                              activeSubjectGrades.map((sub, subIdx) => {
                                const renderGrade = (val: any) => {
                                  if (val === undefined || val === null || val === '' || val === 0 || val === '0') return '-';
                                  const num = typeof val === 'number' ? val : parseFloat(String(val));
                                  if (isNaN(num) || num <= 0) return '-';
                                  const formatted = num.toFixed(1);
                                  const isRed = num < 4.0;
                                  return (
                                    <span style={{ color: isRed ? '#dc2626' : '#1d4ed8', fontWeight: isRed ? 800 : 700 }}>
                                      {formatted}
                                    </span>
                                  );
                                };

                                const avgFormatted = () => {
                                  if (!sub.average || sub.average === '-') return '-';
                                  const num = typeof sub.average === 'number' ? sub.average : parseFloat(String(sub.average));
                                  if (isNaN(num) || num <= 0) return '-';
                                  return (
                                    <strong style={{ color: num < 4.0 ? '#dc2626' : '#15803d', fontSize: '0.9rem' }}>
                                      {num.toFixed(1)}
                                    </strong>
                                  );
                                };

                                return (
                                  <tr key={subIdx} style={{ background: subIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                    <td style={{ padding: '0.5rem 0.6rem', border: '1px solid #cbd5e1', fontWeight: 700, color: '#334155' }}>
                                      {sub.name}
                                    </td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n1)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n2)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n3)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n4)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n5)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n6)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n7)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n8)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n9)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{renderGrade(sub.n10)}</td>
                                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #94a3b8', background: '#eff6ff' }}>{avgFormatted()}</td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={12} style={{ padding: '1.25rem', textAlign: 'center', color: '#64748b', fontStyle: 'italic', fontWeight: 600 }}>
                                  El estudiante no registra asignaturas con notas ingresadas para este período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* CUADRO DE RESUMEN Y PROMEDIO GENERAL */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '2.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                            RESUMEN DE CALIFICACIONES
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem', display: 'flex', gap: '1rem' }}>
                            <span>Notas Azules (≥4.0): <strong style={{ color: '#1d4ed8' }}>{st.azules}</strong></span>
                            <span>Notas Rojas (&lt;4.0): <strong style={{ color: '#dc2626' }}>{st.rojas}</strong></span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
                            PROMEDIO GENERAL:
                          </div>
                          <div style={{
                            fontSize: '1.6rem',
                            fontWeight: 900,
                            color: isApproved ? '#1d4ed8' : '#dc2626',
                            background: '#ffffff',
                            padding: '0.3rem 1rem',
                            borderRadius: '8px',
                            border: '2px solid #94a3b8'
                          }}>
                            {typeof st.promedioGeneral === 'number' ? st.promedioGeneral.toFixed(1) : st.promedioGeneral}
                          </div>
                        </div>
                      </div>

                      {/* FIRMAS INSTITUCIONALES */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '3.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#1e293b' }}>
                        <div>
                          <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.5rem', height: '45px' }}></div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                            {teacherInput || st.homeroomTeacher || 'Profesor(a) Jefe'}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                            Profesor(a) Jefe - {displayCourseName}
                          </span>
                        </div>

                        <div>
                          <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.5rem', height: '45px' }}></div>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                            {directorInput || 'Director(a) Establecimiento'}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                            Director(a) Establecimiento Educacional
                          </span>
                        </div>
                      </div>

                      <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                        Documento oficial emitido por la Plataforma Unificada LTP v2.0 • Auditoría Silent-Watch Verificada
                      </div>
                    </div>
                  )}

                  {/* =================================================================== */}
                  {/* PÁGINA 2: INFORME AL HOGAR / INFORME DE PERSONALIDAD (PK A 4°M)    */}
                  {/* =================================================================== */}
                  {(reportType === 'personality' || reportType === 'both') && (
                    <div
                      className="printable-report-page"
                      style={{
                        background: '#ffffff',
                        borderRadius: '8px',
                        padding: '1.6rem 1.85rem',
                        marginBottom: '2rem',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                        color: '#0f172a',
                        fontFamily: 'Arial, sans-serif'
                      }}
                    >
                      {/* ENCABEZADO INSTITUCIONAL */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingBottom: '0.5rem' }}>
                        <div style={{ width: '110px' }}>
                          <img
                            src="/images/logo_mineduc.jpg"
                            alt="Ministerio de Educación"
                            style={{ maxHeight: '46px', maxWidth: '110px', objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#004b87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            REPÚBLICA DE CHILE • MINISTERIO DE EDUCACIÓN
                          </div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 900, textTransform: 'uppercase', color: '#1e293b' }}>
                            LICEO TÉCNICO PROFESIONAL CAMPANARIO MARCOS DELUCCHI FONCK
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#004b87', textTransform: 'uppercase', marginTop: '2px' }}>
                            {currentTemplate.reportTitle} — AÑO ESCOLAR {academicYear}
                          </div>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>
                            {currentTemplate.levelLabel}
                          </div>
                        </div>

                        <div style={{ width: '110px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <img
                            src="/images/logo_liceo.png"
                            alt="Insignia LTP Campanario"
                            style={{ maxHeight: '50px', maxWidth: '72px', objectFit: 'contain' }}
                          />
                        </div>
                      </div>

                      {/* Franja Bicolor Oficial */}
                      <div style={{ display: 'flex', height: '3px', width: '100%', marginBottom: '0.9rem' }}>
                        <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
                        <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
                      </div>

                      {/* FICHA DEL ESTUDIANTE */}
                      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.65rem 1rem', marginBottom: '0.85rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.6rem', fontSize: '0.8rem' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>ESTUDIANTE</span>
                          <strong style={{ fontSize: '0.92rem', color: '#0f172a', textTransform: 'uppercase' }}>{st.fullName}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>RUN / RUT</span>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{st.run || 'Sin Registro'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>NIVEL / CURSO</span>
                          <strong style={{ fontSize: '0.88rem', color: '#4f46e5' }}>{displayCourseName}</strong>
                        </div>
                      </div>

                      {/* ESCALA DE EVALUACIÓN */}
                      <div style={{ marginBottom: '0.85rem', padding: '0.45rem 0.8rem', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.73rem' }}>
                        <strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>Escala de Evaluación (Calificadores):</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                          {currentTemplate.scale.map(sc => (
                            <span key={sc.code} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <strong style={{ background: sc.bgColor, color: sc.color, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${sc.color}` }}>
                                {sc.code}
                              </strong>
                              <span style={{ color: '#334155', fontWeight: 600 }}>{sc.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* TABLAS DE ÁMBITOS, NÚCLEOS / DIMENSIONES E INDICADORES */}
                      {currentTemplate.ambitos.map((ambito, ambIdx) => (
                        <div key={ambIdx} style={{ marginBottom: '0.9rem' }}>
                          {ambito.ambitoTitle && (
                            <div style={{
                              background: '#1e1b4b',
                              color: '#ffffff',
                              padding: '0.35rem 0.7rem',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              letterSpacing: '0.4px',
                              textTransform: 'uppercase',
                              borderRadius: '4px 4px 0 0'
                            }}>
                              {ambito.ambitoTitle}
                            </div>
                          )}

                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                            <thead>
                              <tr style={{ background: '#004b87', color: '#ffffff' }}>
                                <th style={{ padding: '0.38rem 0.6rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                                  {ambito.ambitoTitle ? 'Núcleo / Indicadores de Evaluación' : 'Área / Indicadores de Evaluación'}
                                </th>
                                <th style={{ padding: '0.38rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '75px' }}>1er Sem</th>
                                <th style={{ padding: '0.38rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '75px' }}>2do Sem</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ambito.sections.map((section, secIdx) => (
                                <React.Fragment key={secIdx}>
                                  <tr style={{ background: '#e2e8f0' }}>
                                    <td colSpan={3} style={{ padding: '0.35rem 0.6rem', fontWeight: 800, color: '#0f172a', border: '1px solid #cbd5e1', fontSize: '0.74rem' }}>
                                      {section.title}
                                    </td>
                                  </tr>
                                  {section.indicators.map((ind, indIdx) => {
                                    const val1 = studentEval.sem1?.[ind.id] || currentTemplate.defaultQualifier;
                                    const val2 = studentEval.sem2?.[ind.id] || '-';
                                    const style1 = getQualifierStyle(val1, currentTemplate.category);
                                    const style2 = getQualifierStyle(val2, currentTemplate.category);

                                    return (
                                      <tr key={ind.id} style={{ background: indIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                        <td style={{ padding: '0.3rem 0.6rem', border: '1px solid #cbd5e1', lineHeight: 1.32, color: '#1e293b' }}>
                                          {ind.oa && (
                                            <strong style={{ color: '#004b87', marginRight: '0.35rem', fontSize: '0.7rem' }}>
                                              ({ind.oa})
                                            </strong>
                                          )}
                                          {ind.text}
                                        </td>
                                        <td style={{ padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                          <select
                                            value={val1}
                                            onChange={e => handleUpdateIndicator(st, 'sem1', ind.id, e.target.value)}
                                            style={{
                                              width: '100%',
                                              textAlign: 'center',
                                              fontWeight: 800,
                                              fontSize: '0.72rem',
                                              padding: '1px 3px',
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
                                        </td>
                                        <td style={{ padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                          <select
                                            value={val2}
                                            onChange={e => handleUpdateIndicator(st, 'sem2', ind.id, e.target.value)}
                                            style={{
                                              width: '100%',
                                              textAlign: 'center',
                                              fontWeight: 800,
                                              fontSize: '0.72rem',
                                              padding: '1px 3px',
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
                                        </td>
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
                      <div style={{ marginTop: '0.6rem', marginBottom: '1.4rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                          Observaciones y Sugerencias al Hogar:
                        </div>
                        <textarea
                          value={studentEval.observations || ''}
                          onChange={e => handleUpdateObservations(st, e.target.value)}
                          placeholder="Observaciones pedagógicas o formativas del semestre..."
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.75rem',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* FIRMAS OFICIALES */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: '#1e293b' }}>
                        <div>
                          <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.35rem', height: '36px' }}></div>
                          <strong style={{ display: 'block' }}>{teacherInput || st.homeroomTeacher || 'Profesor(a) Jefe'}</strong>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Educador(a) / Profesor(a) Jefe</span>
                        </div>
                        <div>
                          <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.35rem', height: '36px' }}></div>
                          <strong style={{ display: 'block' }}>{directorInput || 'Director(a) Establecimiento'}</strong>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Dirección Académica</span>
                        </div>
                        <div>
                          <div style={{ borderBottom: '1.5px solid #0f172a', marginBottom: '0.35rem', height: '36px' }}></div>
                          <strong style={{ display: 'block' }}>Apoderado(a)</strong>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Toma de Conocimiento</span>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintGradeReportModal;
