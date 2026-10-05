import React, { useState, useEffect, useMemo } from 'react';
import { Award, Printer, Save, User, Users, CheckCircle2, Search, Sparkles, BookOpen } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  PERSONALITY_REPORT_TEMPLATES,
  ReportLevelKey,
  detectReportTemplateKey,
  getQualifierStyle
} from '../utils/personalityIndicators';
import { getStudentCourse, isStudentRetired, sortCoursesList, getStudentYear } from '../utils/course';

interface PersonalityReportsModuleProps {
  token: string;
  selectedYear?: number;
}

export const PersonalityReportsModule: React.FC<PersonalityReportsModuleProps> = ({
  token,
  selectedYear = 2026
}) => {
  const [students, setStudents] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [coursesInfo, setCoursesInfo] = useState<any[]>([]);
  const [allReportsMap, setAllReportsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');

  const [reportLevelKey, setReportLevelKey] = useState<ReportLevelKey>('basica_7_media_2');
  const [teacherInput, setTeacherInput] = useState<string>('Educador(a) / Profesor(a) Jefe');
  const [directorInput, setDirectorInput] = useState<string>('Dirección del Establecimiento');

  useEffect(() => {
    setLoading(true);
    const authToken = token || sessionStorage.getItem('ltp_token') || '';
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    Promise.all([
      fetch('/api/students', { headers }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/staff', { headers }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/courses', { headers }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/config/institutional-settings', { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/personality-reports', { headers }).then(r => (r.ok ? r.json() : null)).catch(() => null)
    ]).then(([studentsData, staffData, coursesData, instSettings, reportsData]) => {
      const validStudents = Array.isArray(studentsData)
        ? studentsData.filter(s => !isStudentRetired(s) && Number(getStudentYear(s)) === Number(selectedYear))
        : [];
      setStudents(validStudents);

      if (Array.isArray(staffData)) setStaffList(staffData);
      if (Array.isArray(coursesData)) setCoursesInfo(coursesData);
      if (instSettings?.directorName) setDirectorInput(instSettings.directorName);
      if (reportsData?.reports) setAllReportsMap(reportsData.reports);

      // Extraer cursos únicos ordenados desde Pre-Kínder hasta 4° Medio
      const defaultParvulariaAndSchoolCourses = [
        'Pre-Kínder',
        'Kínder',
        ...validStudents.map(s => getStudentCourse(s)).filter(Boolean)
      ];
      const uniqueCourses = sortCoursesList(Array.from(new Set(defaultParvulariaAndSchoolCourses)));
      if (uniqueCourses.length > 0) {
        const initialCourse = uniqueCourses.find(c => validStudents.some(s => getStudentCourse(s) === c)) || uniqueCourses[0];
        setSelectedCourse(initialCourse);
        setReportLevelKey(detectReportTemplateKey(initialCourse));
      }
      setLoading(false);
    });
  }, [token, selectedYear]);

  const availableCourses = useMemo(() => {
    const fromStudents = students.map(s => getStudentCourse(s)).filter(Boolean);
    const baseCourses = ['Pre-Kínder', 'Kínder', '1° Básico', '2° Básico', '3° Básico', '4° Básico', '5° Básico', '6° Básico', '7° Básico', '8° Básico', '1° Medio A', '2° Medio A', '3° Medio A', '4° Medio A'];
    return sortCoursesList(Array.from(new Set([...baseCourses, ...fromStudents])));
  }, [students]);

  const courseStudents = useMemo(() => {
    const filtered = students.filter(s => {
      const c = getStudentCourse(s);
      if (selectedCourse && c !== selectedCourse) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const name = String(s.full_name || s.Nombres || '').toLowerCase();
        const run = String(s.run || s.RUT || '').toLowerCase();
        return name.includes(q) || run.includes(q);
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const na = Number(a.list_number || 9999);
      const nb = Number(b.list_number || 9999);
      if (na !== nb) return na - nb;
      return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'es');
    });
  }, [students, selectedCourse, searchTerm]);

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
    setReportLevelKey(detectReportTemplateKey(selectedCourse));
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
        id: `demo-${selectedCourse || 'curso'}`,
        full_name: 'ESTUDIANTE DE EJEMPLO (PAUTA OFICIAL)',
        run: 'Sin RUN registrado en este curso',
        level_name: selectedCourse || 'Pre-Kínder',
        list_number: 1
      };
    }
    return courseStudents.find(s => String(s.id) === String(selectedStudentId)) || courseStudents[0];
  }, [courseStudents, selectedStudentId, selectedCourse]);

  const getStudentKey = (st: any) =>
    String(st?.id || st?.run || st?.RUT || st?.full_name || 'student').trim();

  const getStudentEval = (st: any) => {
    const key = getStudentKey(st);
    const byId = allReportsMap[key];
    const runKey = st?.run || st?.RUT ? String(st.run || st.RUT).trim() : '';
    const byRun = runKey ? allReportsMap[runKey] : undefined;
    return byId || byRun || { sem1: {}, sem2: {}, observations: '' };
  };

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
          studentName: st.full_name || st.Nombres || '',
          studentRun: st.run || st.RUT || '',
          course: getStudentCourse(st) || selectedCourse,
          levelKey: reportLevelKey,
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
          studentName: st.full_name || st.Nombres || '',
          studentRun: st.run || st.RUT || '',
          course: getStudentCourse(st) || selectedCourse,
          levelKey: reportLevelKey,
          observations: text
        }
      };
    });
  };

  const handleQuickFill = (st: any, semester: 'sem1' | 'sem2', qualifier: string) => {
    const tpl = PERSONALITY_REPORT_TEMPLATES[reportLevelKey];
    const nextSem: Record<string, string> = {};
    tpl.ambitos.forEach(amb =>
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
          studentName: st.full_name || st.Nombres || '',
          studentRun: st.run || st.RUT || '',
          course: getStudentCourse(st) || selectedCourse,
          levelKey: reportLevelKey,
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
      const res = await fetch('/api/personality-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          studentKey: key,
          reportData: {
            studentName: st.full_name || st.Nombres || '',
            studentRun: st.run || st.RUT || '',
            course: getStudentCourse(st) || selectedCourse,
            levelKey: reportLevelKey,
            sem1: evalData.sem1 || {},
            sem2: evalData.sem2 || {},
            observations: evalData.observations || ''
          }
        })
      });
      if (!res.ok) throw new Error('No se pudo guardar en Supabase');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Informe guardado (${st.full_name || st.Nombres})`,
        timer: 2200,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al guardar el informe', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentTemplate = PERSONALITY_REPORT_TEMPLATES[reportLevelKey];
  const studentsToRender =
    printMode === 'all' && courseStudents.length > 0 ? courseStudents : [currentStudent];

  return (
    <div className="personality-module-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .personality-print-area,
          .personality-print-area * {
            visibility: visible !important;
          }
          .personality-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .personality-printable-sheet {
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
            border: 1px solid #0f172a !important;
            margin: 0 !important;
            padding: 1cm !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* ENCABEZADO DEL MÓDULO (NO SE IMPRIME) */}
      <div className="no-print" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.35rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={26} color="#facc15" />
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
              Informes al Hogar e Informes de Personalidad (Pre-Kínder a 4° Medio)
            </h2>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#c7d2fe' }}>
            Evaluación oficial por Ámbitos, Núcleos y Dimensiones Formativas con respaldo en línea en Supabase.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleSaveEvaluation(currentStudent)}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: '#16a34a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 4px 10px rgba(22, 163, 74, 0.35)'
            }}
          >
            <Save size={17} /> {saving ? 'Guardando...' : 'Guardar Evaluación'}
          </button>

          <button
            type="button"
            onClick={() => {
              setPrintMode('single');
              setTimeout(() => window.print(), 100);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: '#4f46e5',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.35)'
            }}
          >
            <Printer size={17} /> Imprimir Alumno Actual
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
                gap: '0.45rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                border: '1px solid #a5b4fc',
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer'
              }}
            >
              <Users size={17} /> Imprimir Curso ({courseStudents.length})
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE SELECTORES DE NIVEL, CURSO, ESTUDIANTE Y FIRMAS (NO SE IMPRIME) */}
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
        {/* SELECTOR RÁPIDO DE LAS 5 PAUTAS OFICIALES */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BookOpen size={15} color="#4f46e5" /> Seleccione el Nivel / Tipo de Informe Oficial:
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(Object.keys(PERSONALITY_REPORT_TEMPLATES) as ReportLevelKey[]).map(key => {
              const tpl = PERSONALITY_REPORT_TEMPLATES[key];
              const isSelected = reportLevelKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReportLevelKey(key)}
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
                    {tpl.category === 'parvularia' ? 'Informe al Hogar' : 'Personalidad'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FILTROS DE CURSO, ESTUDIANTE Y FIRMAS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.9rem' }}>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '0.3rem' }}>
              🏫 Curso:
            </label>
            <select
              value={selectedCourse}
              onChange={e => {
                setSelectedCourse(e.target.value);
                setPrintMode('single');
              }}
              style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', background: '#f8fafc' }}
            >
              {availableCourses.map(c => (
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
                <option value="">Vista Previa de Pauta Oficial ({selectedCourse})</option>
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
      </div>

      {/* DOCUMENTO OFICIAL INTERACTIVO E IMPRIMIBLE */}
      <div className="personality-print-area">
        {studentsToRender.map((st, idx) => {
          const evalData = getStudentEval(st);
          const studentCourseName = getStudentCourse(st) || selectedCourse || currentTemplate.shortLabel;

          return (
            <div
              key={st.id || idx}
              className="personality-printable-sheet"
              style={{
                background: '#ffffff',
                border: '2px solid #0f172a',
                borderRadius: '12px',
                padding: '2rem',
                marginBottom: '2rem',
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
                    {st.full_name || st.Nombres}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>RUN / RUT</span>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{st.run || st.RUT || 'Sin Registro'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>CURSO / NIVEL</span>
                  <strong style={{ fontSize: '0.9rem', color: '#4f46e5' }}>{studentCourseName}</strong>
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

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#004b87', color: '#ffffff' }}>
                        <th style={{ padding: '0.45rem 0.7rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                          {ambito.ambitoTitle ? 'Núcleo / Indicadores de Evaluación' : 'Área / Indicadores de Evaluación'}
                        </th>
                        <th style={{ padding: '0.45rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '90px' }}>1er Sem</th>
                        <th style={{ padding: '0.45rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '90px' }}>2do Sem</th>
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
                                <td style={{ padding: '0.25rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                  <select
                                    value={val1}
                                    onChange={e => handleSetIndicator(st, 'sem1', ind.id, e.target.value)}
                                    style={{
                                      width: '100%',
                                      textAlign: 'center',
                                      fontWeight: 800,
                                      fontSize: '0.76rem',
                                      padding: '3px 4px',
                                      borderRadius: '5px',
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
                                <td style={{ padding: '0.25rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                  <select
                                    value={val2}
                                    onChange={e => handleSetIndicator(st, 'sem2', ind.id, e.target.value)}
                                    style={{
                                      width: '100%',
                                      textAlign: 'center',
                                      fontWeight: 800,
                                      fontSize: '0.76rem',
                                      padding: '3px 4px',
                                      borderRadius: '5px',
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
              <div style={{ marginTop: '0.75rem', marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                  Observaciones y Sugerencias al Hogar:
                </div>
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
    </div>
  );
};

export default PersonalityReportsModule;
