import React, { useState, useEffect } from 'react';
import { X, Printer, Settings, BarChart3, AlertTriangle, Users, Award, BookOpen, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { CourseData, CourseSubject, StudentData } from './GradesOverview';

interface PrintPanoramaReportModalProps {
  courseName: string;
  academicYear?: number | string;
  period?: string;
  homeroomTeacher?: string;
  courseData: CourseData;
  onClose: () => void;
}

export const PrintPanoramaReportModal: React.FC<PrintPanoramaReportModalProps> = ({
  courseName,
  academicYear = 2026,
  period = '1er Semestre',
  homeroomTeacher = 'MAGALY DE LAS NIEVES SEGURA NOVOA',
  courseData,
  onClose
}) => {
  const { token: authContextToken } = useAuth();
  const token = authContextToken || sessionStorage.getItem('ltp_token') || localStorage.getItem('ltp_token') || localStorage.getItem('token') || '';

  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [schoolName, setSchoolName] = useState<string>('LICEO CAMPANARIO');
  const [rbd, setRbd] = useState<string>('3941-1');
  const [commune, setCommune] = useState<string>('YUNGAY');
  const [region, setRegion] = useState<string>('XVI REGIÓN DE ÑUBLE');
  const [directorName, setDirectorName] = useState<string>('VÍCTOR ROBINSON OJEDA OJEDA');
  const [directorRun, setDirectorRun] = useState<string>('14.230.851-7');
  const [utpName, setUtpName] = useState<string>('SCARLETTE CATALINA BURGOS SANDOVAL');
  const [utpRun, setUtpRun] = useState<string>('19.251.099-6');
  const [teacherName, setTeacherName] = useState<string>(homeroomTeacher);
  const [teacherRun, setTeacherRun] = useState<string>('9.453.480-1');
  const [customObservations, setCustomObservations] = useState<string>(
    'Informe generado para análisis técnico-pedagógico en consejo de profesores y seguimiento de estudiantes en riesgo académico.'
  );

  const [issueDate, setIssueDate] = useState<string>(() => {
    const today = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${today.getDate()} de ${meses[today.getMonth()]} de ${today.getFullYear()}`;
  });

  useEffect(() => {
    fetch('/api/config/institutional-settings', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.schoolName) setSchoolName(data.schoolName.toUpperCase());
          if (data.rbd && data.rbd !== '1234-5') setRbd(data.rbd);
          if (data.commune && !data.commune.toLowerCase().includes('comuna escolar')) setCommune(data.commune.toUpperCase());
          if (data.region && data.region.toLowerCase() !== 'region') setRegion(data.region.toUpperCase());
          if (data.directorName && !data.directorName.toLowerCase().includes('director(a) establecimiento')) {
            setDirectorName(data.directorName.toUpperCase());
          }
          if (data.directorRun && data.directorRun !== '11.111.111-1') setDirectorRun(data.directorRun);
        }
      })
      .catch(() => {});
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  // Filtrar asignaturas regulares (excluir religión u orientación de la matriz numérica principal si aplica)
  const regularSubjects = courseData.subjects.filter(
    s => !s.name.toLowerCase().includes('orientaci') && !s.name.toLowerCase().includes('relig')
  );

  // Alumnos en riesgo o con alertas
  const riskStudents = courseData.students.filter(
    st => st.promedioGeneral < 4.0 || st.rojas > 0 || st.alerts.length > 0
  );

  return (
    <div className="panorama-report-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* BARRA SUPERIOR DE ACCIONES (NO PRINT) */}
      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #334155',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={22} style={{ color: '#38bdf8' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
              INFORME DETALLADO DE PANORAMA DE NOTAS Y RENDIMIENTO ESCOLAR
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {courseName} — {period} ({academicYear})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Settings size={15} /> Ajustar Encabezado y Firmas
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(79,70,229,0.4)'
            }}
          >
            <Printer size={16} /> Imprimir Panorama Oficial (Landscape)
          </button>

          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* PANEL DE CONFIGURACIÓN DE FIRMAS Y METADATOS (NO PRINT) */}
      {showConfig && (
        <div className="no-print" style={{
          backgroundColor: '#1e293b',
          borderBottom: '2px solid #475569',
          padding: '1.25rem 2rem',
          color: '#f1f5f9',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#38bdf8' }}>
            Ajustes del Informe de Panorama (Establecimiento y Firmantes)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Establecimiento</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>R.B.D.</label>
              <input
                type="text"
                value={rbd}
                onChange={e => setRbd(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Comuna / Región</label>
              <input
                type="text"
                value={`${commune} — ${region}`}
                onChange={e => setCommune(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Profesor(a) Jefe</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>R.U.N. Profesor(a) Jefe</label>
              <input
                type="text"
                value={teacherRun}
                onChange={e => setTeacherRun(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Jefe(a) UTP</label>
              <input
                type="text"
                value={utpName}
                onChange={e => setUtpName(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>R.U.N. Jefe(a) UTP</label>
              <input
                type="text"
                value={utpRun}
                onChange={e => setUtpRun(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Director(a)</label>
              <input
                type="text"
                value={directorName}
                onChange={e => setDirectorName(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>R.U.N. Director(a)</label>
              <input
                type="text"
                value={directorRun}
                onChange={e => setDirectorRun(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Fecha de Emisión</label>
              <input
                type="text"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Observaciones Técnico-Pedagógicas</label>
              <input
                type="text"
                value={customObservations}
                onChange={e => setCustomObservations(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ÁREA IMPRIMIBLE DEL INFORME DE PANORAMA */}
      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div className="panorama-print-sheet" style={{
          backgroundColor: '#ffffff',
          color: '#000000',
          width: '100%',
          maxWidth: '1280px',
          padding: '12mm 10mm',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          fontFamily: '"Helvetica Neue", Arial, sans-serif'
        }}>

          {/* ========================================================== */}
          {/* 1. CABECERA INSTITUCIONAL FORMAL                           */}
          {/* ========================================================== */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2px solid #000000',
            paddingBottom: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '46px', height: '46px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '9px', textAlign: 'center', lineHeight: '1.1' }}>
                ESCUDO<br />CHILE
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {schoolName}
                </div>
                <div style={{ fontSize: '8.5px', color: '#334155', fontWeight: 700 }}>
                  R.B.D.: {rbd} &nbsp;|&nbsp; COMUNA: {commune} &nbsp;|&nbsp; {region}
                </div>
                <div style={{ fontSize: '8px', color: '#64748b' }}>
                  UNIDAD TÉCNICA PEDAGÓGICA (UTP) — REPORTE OFICIAL DE JEFATURA
                </div>
              </div>
            </div>

            <div style={{ border: '2px solid #000000', padding: '6px 14px', textAlign: 'center', minWidth: '340px' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                INFORME DE PANORAMA DE CALIFICACIONES DEL CURSO
              </div>
              <div style={{ fontSize: '9.5px', fontWeight: 800, marginTop: '2px', color: '#1e293b' }}>
                {courseName.toUpperCase()} — {period.toUpperCase()} ({academicYear})
              </div>
              <div style={{ fontSize: '8px', color: '#475569', marginTop: '1px' }}>
                Profesor(a) Jefe: {teacherName.toUpperCase()}
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 2. TARJETAS DE MÉTRICAS CLAVE (KPIS DEL CURSO)              */}
          {/* ========================================================== */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>PROMEDIO GENERAL CURSO</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: courseData.promedioCurso >= 4.0 ? '#047857' : '#b91c1c', fontFamily: 'monospace' }}>
                {courseData.promedioCurso > 0 ? courseData.promedioCurso.toFixed(1) : '-'}
              </div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>Escala 1.0 a 7.0</div>
            </div>

            <div style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>MATRÍCULA TOTAL</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                {courseData.alumnosRegistrados}
              </div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>Estudiantes en nómina</div>
            </div>

            <div style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>CALIFICACIONES REGISTRADAS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                {courseData.calificacionesTotales}
              </div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>{courseData.azulesTotales} Azules ({courseData.azulesPorcentaje}%)</span>
                {' / '}
                <span style={{ color: '#b91c1c', fontWeight: 700 }}>{courseData.rojasTotales} Rojas ({courseData.rojasPorcentaje}%)</span>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', backgroundColor: courseData.alumnosEnRiesgo > 0 ? '#fee2e2' : '#f0fdf4' }}>
              <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>ESTUDIANTES EN ALERTA</div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: courseData.alumnosEnRiesgo > 0 ? '#b91c1c' : '#047857', fontFamily: 'monospace' }}>
                {courseData.alumnosEnRiesgo}
              </div>
              <div style={{ fontSize: '7px', color: '#64748b' }}>
                {courseData.alumnosBajoCuatro} con promedio bajo 4.0
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 3. RESUMEN DE ASIGNATURAS Y DOCENTES (TABLA COMPACTA)      */}
          {/* ========================================================== */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.4px' }}>
              RESUMEN DE ASIGNATURAS Y COBERTURA DE CALIFICACIONES
            </div>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #000',
              fontSize: '7.5px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000' }}>
                  <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left' }}>ASIGNATURA</th>
                  <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left' }}>DOCENTE RESPONSABLE</th>
                  <th style={{ border: '1px solid #000', padding: '3px', width: '90px', textAlign: 'center' }}>CALIFICACIONES</th>
                  <th style={{ border: '1px solid #000', padding: '3px', width: '80px', textAlign: 'center' }}>PROMEDIO</th>
                  <th style={{ border: '1px solid #000', padding: '3px', width: '90px', textAlign: 'center' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {courseData.subjects.map((sub, i) => (
                  <tr key={i} style={{ height: '14px', borderBottom: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: '2px 6px', fontWeight: 700 }}>{sub.name}</td>
                    <td style={{ border: '1px solid #000', padding: '2px 6px' }}>{sub.teacher || teacherName}</td>
                    <td style={{ border: '1px solid #000', textAlign: 'center', fontFamily: 'monospace' }}>
                      {sub.registeredCount} {sub.registeredCount === 1 ? 'nota' : 'notas'}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: sub.courseAverage >= 4.0 ? '#047857' : '#b91c1c' }}>
                      {sub.courseAverage > 0 ? sub.courseAverage.toFixed(1) : '-'}
                    </td>
                    <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700, color: sub.status === 'CON NOTAS' ? '#047857' : '#d97706' }}>
                      {sub.status === 'CON NOTAS' ? 'CON NOTAS' : 'PENDIENTE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ========================================================== */}
          {/* 4. MATRIZ DETALLADA DE RENDIMIENTO POR ESTUDIANTE          */}
          {/* ========================================================== */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>MATRIZ GENERAL DE RENDIMIENTO POR ESTUDIANTE</span>
              <span style={{ fontWeight: 600, color: '#475569' }}>Total Alumnos: {courseData.students.length}</span>
            </div>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #000',
              fontSize: '7px'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000' }}>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '20px', textAlign: 'center' }}>N°</th>
                  <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', minWidth: '160px' }}>
                    APELLIDOS Y NOMBRES
                  </th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '60px', textAlign: 'center' }}>R.U.N.</th>
                  
                  {/* COLUMNA POR ASIGNATURA */}
                  {regularSubjects.map((sub, idx) => (
                    <th
                      key={idx}
                      style={{
                        border: '1px solid #000',
                        padding: '2px 1px',
                        width: '24px',
                        textAlign: 'center',
                        fontSize: '6.5px'
                      }}
                      title={sub.name}
                    >
                      {sub.name.slice(0, 4).toUpperCase()}
                    </th>
                  ))}

                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '22px', textAlign: 'center', color: '#047857' }}>AZ</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '22px', textAlign: 'center', color: '#b91c1c' }}>RO</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '28px', textAlign: 'center', backgroundColor: '#e2e8f0', fontWeight: 900 }}>PROM</th>
                  <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '60px' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {courseData.students.map((st) => {
                  const hasRedAvg = st.promedioGeneral > 0 && st.promedioGeneral < 4.0;
                  return (
                    <tr
                      key={st.id}
                      style={{
                        height: '13px',
                        borderBottom: '1px solid #000',
                        backgroundColor: hasRedAvg ? '#fee2e2' : st.rojas > 0 ? '#fffbeb' : 'transparent'
                      }}
                    >
                      <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{st.number}</td>
                      <td style={{ border: '1px solid #000', padding: '1px 4px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {st.fullName.toUpperCase()}
                      </td>
                      <td style={{ border: '1px solid #000', textAlign: 'center', fontFamily: 'monospace', fontSize: '6.5px' }}>{st.run}</td>

                      {/* NOTAS POR ASIGNATURA */}
                      {regularSubjects.map((sub, idx) => {
                        const perf = st.subjectGrades[sub.name];
                        const avgVal = perf ? perf.average : '-';
                        const numVal = parseFloat(String(avgVal).replace(',', '.'));
                        const isRed = !isNaN(numVal) && numVal > 0 && numVal < 4.0;
                        return (
                          <td
                            key={idx}
                            style={{
                              border: '1px solid #000',
                              textAlign: 'center',
                              fontFamily: 'monospace',
                              fontWeight: avgVal !== '-' ? 700 : 400,
                              color: isRed ? '#b91c1c' : '#000000'
                            }}
                          >
                            {typeof avgVal === 'number' ? avgVal.toFixed(1).replace('.', ',') : avgVal}
                          </td>
                        );
                      })}

                      <td style={{ border: '1px solid #000', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#047857' }}>
                        {st.azules}
                      </td>
                      <td style={{ border: '1px solid #000', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: st.rojas > 0 ? '#b91c1c' : '#94a3b8' }}>
                        {st.rojas}
                      </td>
                      <td style={{
                        border: '1px solid #000',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        backgroundColor: '#f1f5f9',
                        color: st.promedioGeneral >= 4.0 ? '#047857' : '#b91c1c'
                      }}>
                        {st.promedioGeneral > 0 ? st.promedioGeneral.toFixed(1).replace('.', ',') : '-'}
                      </td>
                      <td style={{
                        border: '1px solid #000',
                        textAlign: 'center',
                        fontSize: '6.5px',
                        fontWeight: 800,
                        color: hasRedAvg ? '#b91c1c' : st.rojas > 0 ? '#d97706' : '#047857'
                      }}>
                        {hasRedAvg ? 'EN RIESGO' : st.rojas > 0 ? 'CON ROJAS' : 'AL DÍA'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========================================================== */}
          {/* 5. ESTUDIANTES EN ALERTA PEDAGÓGICA (SI EXISTEN)           */}
          {/* ========================================================== */}
          {riskStudents.length > 0 && (
            <div style={{
              border: '1px solid #b91c1c',
              backgroundColor: '#fff1f2',
              padding: '6px 10px',
              marginBottom: '12px',
              fontSize: '7.5px'
            }}>
              <div style={{ fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '3px' }}>
                ⚠️ ESTUDIANTES PRIORITARIOS / EN RIESGO ACADÉMICO ({riskStudents.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '4px' }}>
                {riskStudents.map(st => (
                  <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #fecdd3', paddingBottom: '2px' }}>
                    <span><strong>#{st.number} {st.fullName}</strong> ({st.run})</span>
                    <span style={{ fontWeight: 800, color: '#b91c1c', fontFamily: 'monospace' }}>
                      Prom: {st.promedioGeneral.toFixed(1)} | {st.rojas} rojas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OBSERVACIÓN TÉCNICO PEDAGÓGICA */}
          <div style={{ border: '1px solid #000', padding: '4px 8px', marginBottom: '14px', fontSize: '7.5px' }}>
            <strong>OBSERVACIONES DE JEFATURA & UTP:</strong> {customObservations}
          </div>

          {/* ========================================================== */}
          {/* 6. FIRMAS DE VALIDACIÓN OFICIAL                           */}
          {/* ========================================================== */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '14px',
            textAlign: 'center',
            fontSize: '7.5px',
            marginBottom: '10px'
          }}>
            <div style={{ border: '1px solid #000', padding: '28px 6px 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '65px' }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '3px' }}>
                <div style={{ fontWeight: 800 }}>{teacherName.toUpperCase()}</div>
                <div style={{ fontSize: '7px' }}>R.U.N. {teacherRun || '—'}</div>
                <div style={{ fontWeight: 700, fontSize: '6.5px', marginTop: '1px' }}>PROFESOR(A) JEFE</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: '28px 6px 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '65px' }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '3px' }}>
                <div style={{ fontWeight: 800 }}>{utpName.toUpperCase()}</div>
                <div style={{ fontSize: '7px' }}>R.U.N. {utpRun || '—'}</div>
                <div style={{ fontWeight: 700, fontSize: '6.5px', marginTop: '1px' }}>JEFE(A) UNIDAD TÉCNICA PEDAGÓGICA</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: '28px 6px 6px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '65px' }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '3px' }}>
                <div style={{ fontWeight: 800 }}>{directorName.toUpperCase()}</div>
                <div style={{ fontSize: '7px' }}>R.U.N. {directorRun || '—'}</div>
                <div style={{ fontWeight: 700, fontSize: '6.5px', marginTop: '1px' }}>DIRECTOR(A) / TIMBRE</div>
              </div>
            </div>
          </div>

          {/* PIE DE PÁGINA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7px', color: '#475569', borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
            <div>
              LUGAR Y FECHA DE EMISIÓN: {commune}, {issueDate}.
            </div>
            <div>
              SISTEMA INTEGRADO DE GESTIÓN EDUCATIVA — {schoolName} (RBD {rbd})
            </div>
          </div>

        </div>
      </div>

      {/* ESTILOS DE IMPRESIÓN OFICIAL LANDSCAPE */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm 6mm 6mm 6mm;
          }

          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .panorama-report-overlay {
            position: static !important;
            background: none !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .panorama-print-sheet {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintPanoramaReportModal;
