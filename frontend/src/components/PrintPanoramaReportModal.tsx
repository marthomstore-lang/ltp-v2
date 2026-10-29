import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Settings, BarChart3, AlertTriangle, Users, Award, BookOpen, CheckCircle2, Type } from 'lucide-react';
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
  const [fontScale, setFontScale] = useState<'normal' | 'compact' | 'large'>('normal');

  const [schoolName, setSchoolName] = useState<string>('LICEO CAMPANARIO');
  const [rbd, setRbd] = useState<string>('3941-1');
  const [commune, setCommune] = useState<string>('YUNGAY');
  const [region, setRegion] = useState<string>('XVI REGIÓN DE ÑUBLE');
  const [directorName, setDirectorName] = useState<string>('VÍCTOR ROBINSON OJEDA OJEDA');
  const [directorRun, setDirectorRun] = useState<string>('14.230.851-7');
  const [utpName, setUtpName] = useState<string>('JOSÉ JULIO IGNACIO LIZAMA ALARCÓN');
  const [utpRun, setUtpRun] = useState<string>('17.246.556-0');
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

  // Manejo de scroll en body y tecla Escape
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
          if (data.utpName) setUtpName(data.utpName.toUpperCase());
          if (data.utpRun) setUtpRun(data.utpRun);
        }
      })
      .catch(() => {});
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  // Filtrar asignaturas regulares (excluir religión u orientación de la matriz numérica si aplica)
  const regularSubjects = courseData.subjects.filter(
    s => !s.name.toLowerCase().includes('orientaci') && !s.name.toLowerCase().includes('relig')
  );

  // Alumnos en riesgo o con alertas
  const riskStudents = courseData.students.filter(
    st => st.promedioGeneral < 4.0 || st.rojas > 0 || st.alerts.length > 0
  );

  // Definición de multiplicador de fuentes según escala seleccionada
  const typography = {
    compact: {
      headerSchool: '11px',
      headerRbd: '8.5px',
      headerUtp: '7.8px',
      titleMain: '10.5px',
      titleSub: '9.2px',
      kpiTitle: '7.5px',
      kpiNumber: '15px',
      kpiSub: '7px',
      sectionTitle: '9px',
      tableHeader: '8.2px',
      tableCell: '8px',
      matrixNames: '8.5px',
      matrixRun: '8.5px',
      matrixGrade: '8.5px',
      matrixRowPadding: '2.5px 3px',
      boxPadding: '3px 6px',
      signaturesPadding: '18px 4px 4px 4px',
      signaturesMinHeight: '52px',
      signaturesName: '8.5px',
      footer: '7.5px'
    },
    normal: {
      headerSchool: '13px',
      headerRbd: '9.5px',
      headerUtp: '8.5px',
      titleMain: '11.5px',
      titleSub: '10px',
      kpiTitle: '8.5px',
      kpiNumber: '18px',
      kpiSub: '8px',
      sectionTitle: '10px',
      tableHeader: '9.5px',
      tableCell: '9.5px',
      matrixNames: '10px',
      matrixRun: '9.5px',
      matrixGrade: '10px',
      matrixRowPadding: '4px 5px',
      boxPadding: '5px 8px',
      signaturesPadding: '26px 6px 6px 6px',
      signaturesMinHeight: '65px',
      signaturesName: '10px',
      footer: '8.5px'
    },
    large: {
      headerSchool: '14.5px',
      headerRbd: '10.5px',
      headerUtp: '9.5px',
      titleMain: '13px',
      titleSub: '11px',
      kpiTitle: '9.5px',
      kpiNumber: '21px',
      kpiSub: '9px',
      sectionTitle: '11.5px',
      tableHeader: '11px',
      tableCell: '10.5px',
      matrixNames: '11px',
      matrixRun: '10.5px',
      matrixGrade: '11px',
      matrixRowPadding: '5.5px 6px',
      boxPadding: '6px 10px',
      signaturesPadding: '32px 8px 8px 8px',
      signaturesMinHeight: '75px',
      signaturesName: '11px',
      footer: '9.5px'
    }
  }[fontScale];

  const modalContent = (
    <div
      className="panorama-report-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.90)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto'
      }}
    >
      {/* BARRA SUPERIOR DE ACCIONES (NO PRINT) */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #334155',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BarChart3 size={20} style={{ color: '#38bdf8' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.3px' }}>
              INFORME DE PANORAMA DE CALIFICACIONES
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {courseName} — {period} ({academicYear})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* SELECTOR DE TAMAÑO DE LETRA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: '#1e293b',
            padding: '0.25rem 0.55rem',
            borderRadius: '6px',
            border: '1px solid #475569',
            fontSize: '0.74rem',
            color: '#cbd5e1'
          }}>
            <Type size={13} style={{ color: '#38bdf8' }} />
            <span style={{ marginRight: '2px' }}>Letra:</span>
            <button
              type="button"
              onClick={() => setFontScale('normal')}
              style={{
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: fontScale === 'normal' ? 700 : 500,
                backgroundColor: fontScale === 'normal' ? '#2563eb' : '#334155',
                color: '#fff',
                fontSize: '0.72rem'
              }}
              title="Tamaño nítido, claro y 100% legible (Recomendado)"
            >
              Normal (Legible)
            </button>
            <button
              type="button"
              onClick={() => setFontScale('compact')}
              style={{
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: fontScale === 'compact' ? 700 : 500,
                backgroundColor: fontScale === 'compact' ? '#2563eb' : '#334155',
                color: '#fff',
                fontSize: '0.72rem'
              }}
              title="Tamaño optimizado para cursos con más de 35 estudiantes"
            >
              Compacta
            </button>
            <button
              type="button"
              onClick={() => setFontScale('large')}
              style={{
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: fontScale === 'large' ? 700 : 500,
                backgroundColor: fontScale === 'large' ? '#2563eb' : '#334155',
                color: '#fff',
                fontSize: '0.72rem'
              }}
              title="Tamaño de letra grande para máxima visualización"
            >
              Grande
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.76rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <Settings size={14} /> Ajustar Encabezado y Firmas
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              padding: '0.45rem 1.15rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(79,70,229,0.4)'
            }}
          >
            <Printer size={15} /> Imprimir Panorama Oficial (Landscape)
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Cerrar (Esc)"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* PANEL DE CONFIGURACIÓN DE FIRMAS Y METADATOS (NO PRINT) */}
      {showConfig && (
        <div
          className="no-print"
          style={{
            backgroundColor: '#1e293b',
            borderBottom: '2px solid #475569',
            padding: '1rem 1.5rem',
            color: '#f1f5f9',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.65rem', color: '#38bdf8' }}>
            Ajustes del Informe de Panorama (Establecimiento y Firmantes)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem'
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Establecimiento</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>R.B.D.</label>
              <input
                type="text"
                value={rbd}
                onChange={e => setRbd(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Comuna / Región</label>
              <input
                type="text"
                value={`${commune} — ${region}`}
                onChange={e => setCommune(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Profesor(a) Jefe</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>R.U.N. Profesor(a) Jefe</label>
              <input
                type="text"
                value={teacherRun}
                onChange={e => setTeacherRun(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Jefe(a) UTP</label>
              <input
                type="text"
                value={utpName}
                onChange={e => setUtpName(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>R.U.N. Jefe(a) UTP</label>
              <input
                type="text"
                value={utpRun}
                onChange={e => setUtpRun(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Director(a)</label>
              <input
                type="text"
                value={directorName}
                onChange={e => setDirectorName(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>R.U.N. Director(a)</label>
              <input
                type="text"
                value={directorRun}
                onChange={e => setDirectorRun(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Fecha de Emisión</label>
              <input
                type="text"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Observaciones Técnico-Pedagógicas</label>
              <input
                type="text"
                value={customObservations}
                onChange={e => setCustomObservations(e.target.value)}
                style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '0.76rem' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ÁREA IMPRIMIBLE DEL INFORME DE PANORAMA */}
      <div style={{ flex: 1, padding: '1rem', display: 'flex', justifyContent: 'center' }}>
        <div
          className="panorama-print-sheet"
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            width: '100%',
            maxWidth: '1280px',
            padding: '8mm 8mm',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontFamily: '"Helvetica Neue", Arial, sans-serif'
          }}
        >
          {/* ========================================================== */}
          {/* 1. CABECERA INSTITUCIONAL FORMAL                           */}
          {/* ========================================================== */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #000000',
              paddingBottom: '6px',
              marginBottom: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  border: '1.5px solid #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '7.5px',
                  textAlign: 'center',
                  lineHeight: '1.05'
                }}
              >
                ESCUDO<br />CHILE
              </div>
              <div>
                <div style={{ fontSize: typography.headerSchool, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {schoolName}
                </div>
                <div style={{ fontSize: typography.headerRbd, color: '#1e293b', fontWeight: 700 }}>
                  R.B.D.: {rbd} &nbsp;|&nbsp; COMUNA: {commune} &nbsp;|&nbsp; {region}
                </div>
                <div style={{ fontSize: typography.headerUtp, color: '#475569', fontWeight: 600 }}>
                  UNIDAD TÉCNICA PEDAGÓGICA (UTP) — REPORTE OFICIAL DE JEFATURA
                </div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #000000', padding: '4px 10px', textAlign: 'center', minWidth: '300px' }}>
              <div style={{ fontSize: typography.titleMain, fontWeight: 900, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                INFORME DE PANORAMA DE CALIFICACIONES DEL CURSO
              </div>
              <div style={{ fontSize: typography.titleSub, fontWeight: 800, marginTop: '1px', color: '#1e293b' }}>
                {courseName.toUpperCase()} — {period.toUpperCase()} ({academicYear})
              </div>
              <div style={{ fontSize: typography.headerUtp, color: '#475569', marginTop: '1px' }}>
                Profesor(a) Jefe: {teacherName.toUpperCase()}
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 2. TARJETAS DE MÉTRICAS CLAVE (KPIS DEL CURSO)              */}
          {/* ========================================================== */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              marginBottom: '8px'
            }}
          >
            <div style={{ border: '1px solid #000', padding: typography.boxPadding, textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: typography.kpiTitle, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>PROMEDIO GENERAL CURSO</div>
              <div style={{ fontSize: typography.kpiNumber, fontWeight: 900, color: courseData.promedioCurso >= 4.0 ? '#047857' : '#b91c1c', fontFamily: 'monospace' }}>
                {courseData.promedioCurso > 0 ? courseData.promedioCurso.toFixed(1) : '-'}
              </div>
              <div style={{ fontSize: typography.kpiSub, color: '#64748b' }}>Escala 1.0 a 7.0</div>
            </div>

            <div style={{ border: '1px solid #000', padding: typography.boxPadding, textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: typography.kpiTitle, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>MATRÍCULA TOTAL</div>
              <div style={{ fontSize: typography.kpiNumber, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                {courseData.alumnosRegistrados}
              </div>
              <div style={{ fontSize: typography.kpiSub, color: '#64748b' }}>Estudiantes en nómina</div>
            </div>

            <div style={{ border: '1px solid #000', padding: typography.boxPadding, textAlign: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: typography.kpiTitle, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>CALIFICACIONES REGISTRADAS</div>
              <div style={{ fontSize: typography.kpiNumber, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                {courseData.calificacionesTotales}
              </div>
              <div style={{ fontSize: typography.kpiSub, color: '#64748b' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>{courseData.azulesTotales} Azules ({courseData.azulesPorcentaje}%)</span>
                {' / '}
                <span style={{ color: '#b91c1c', fontWeight: 700 }}>{courseData.rojasTotales} Rojas ({courseData.rojasPorcentaje}%)</span>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: typography.boxPadding, textAlign: 'center', backgroundColor: courseData.alumnosEnRiesgo > 0 ? '#fee2e2' : '#f0fdf4' }}>
              <div style={{ fontSize: typography.kpiTitle, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>ESTUDIANTES EN ALERTA</div>
              <div style={{ fontSize: typography.kpiNumber, fontWeight: 900, color: courseData.alumnosEnRiesgo > 0 ? '#b91c1c' : '#047857', fontFamily: 'monospace' }}>
                {courseData.alumnosEnRiesgo}
              </div>
              <div style={{ fontSize: typography.kpiSub, color: '#64748b' }}>
                {courseData.alumnosBajoCuatro} con promedio bajo 4.0
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 3. RESUMEN DE ASIGNATURAS Y DOCENTES (TABLA COMPACTA)      */}
          {/* ========================================================== */}
          <div style={{ marginBottom: '8px' }} className="page-break-avoid">
            <div style={{ fontSize: typography.sectionTitle, fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.3px' }}>
              RESUMEN DE ASIGNATURAS Y COBERTURA DE CALIFICACIONES
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #000',
                fontSize: typography.tableCell
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000' }}>
                  <th style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'left', fontSize: typography.tableHeader }}>ASIGNATURA</th>
                  <th style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'left', fontSize: typography.tableHeader }}>DOCENTE RESPONSABLE</th>
                  <th style={{ border: '1px solid #000', padding: '2px 3px', width: '80px', textAlign: 'center', fontSize: typography.tableHeader }}>CALIFICACIONES</th>
                  <th style={{ border: '1px solid #000', padding: '2px 3px', width: '70px', textAlign: 'center', fontSize: typography.tableHeader }}>PROMEDIO</th>
                  <th style={{ border: '1px solid #000', padding: '2px 3px', width: '80px', textAlign: 'center', fontSize: typography.tableHeader }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {courseData.subjects.map((sub, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ border: '1px solid #000', padding: typography.matrixRowPadding, fontWeight: 700 }}>{sub.name}</td>
                    <td style={{ border: '1px solid #000', padding: typography.matrixRowPadding }}>{sub.teacher || teacherName}</td>
                    <td style={{ border: '1px solid #000', padding: typography.matrixRowPadding, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                      {sub.registeredCount} {sub.registeredCount === 1 ? 'nota' : 'notas'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: typography.matrixRowPadding, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: sub.courseAverage >= 4.0 ? '#047857' : '#b91c1c' }}>
                      {sub.courseAverage > 0 ? sub.courseAverage.toFixed(1) : '-'}
                    </td>
                    <td style={{ border: '1px solid #000', padding: typography.matrixRowPadding, textAlign: 'center', fontWeight: 700, color: sub.status === 'CON NOTAS' ? '#047857' : '#d97706' }}>
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
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: typography.sectionTitle, fontWeight: 900, textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.3px', display: 'flex', justifyContent: 'space-between' }}>
              <span>MATRIZ GENERAL DE RENDIMIENTO POR ESTUDIANTE</span>
              <span style={{ fontWeight: 600, color: '#475569' }}>Total Alumnos: {courseData.students.length}</span>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #000',
                fontSize: typography.matrixGrade
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000' }}>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '22px', textAlign: 'center', fontSize: typography.tableHeader }}>N°</th>
                  <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left', minWidth: '180px', fontSize: typography.tableHeader }}>
                    APELLIDOS Y NOMBRES
                  </th>
                  <th style={{ border: '1px solid #000', padding: '3px 4px', width: '80px', minWidth: '80px', textAlign: 'center', fontSize: typography.tableHeader, whiteSpace: 'nowrap' }}>R.U.N.</th>

                  {/* COLUMNAS POR ASIGNATURA */}
                  {regularSubjects.map((sub, idx) => (
                    <th
                      key={idx}
                      style={{
                        border: '1px solid #000',
                        padding: '3px 2px',
                        width: '28px',
                        minWidth: '28px',
                        textAlign: 'center',
                        fontSize: typography.tableHeader
                      }}
                      title={sub.name}
                    >
                      {sub.name.slice(0, 4).toUpperCase()}
                    </th>
                  ))}

                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '24px', textAlign: 'center', color: '#047857', fontSize: typography.tableHeader }}>AZ</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '24px', textAlign: 'center', color: '#b91c1c', fontSize: typography.tableHeader }}>RO</th>
                  <th style={{ border: '1px solid #000', padding: '3px 2px', width: '32px', textAlign: 'center', backgroundColor: '#e2e8f0', fontWeight: 900, fontSize: typography.tableHeader }}>PROM</th>
                  <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '68px', fontSize: typography.tableHeader, whiteSpace: 'nowrap' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {courseData.students.map((st) => {
                  const hasRedAvg = st.promedioGeneral > 0 && st.promedioGeneral < 4.0;
                  return (
                    <tr
                      key={st.id}
                      style={{
                        borderBottom: '1px solid #000',
                        backgroundColor: hasRedAvg ? '#fee2e2' : st.rojas > 0 ? '#fffbeb' : 'transparent'
                      }}
                    >
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: typography.matrixRowPadding, fontWeight: 700, fontSize: typography.matrixGrade }}>{st.number}</td>
                      <td style={{ border: '1px solid #000', padding: typography.matrixRowPadding, fontWeight: 700, fontSize: typography.matrixNames, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {st.fullName.toUpperCase()}
                      </td>
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: typography.matrixRowPadding, fontVariantNumeric: 'tabular-nums', fontWeight: 600, letterSpacing: '0.2px', fontSize: typography.matrixRun, whiteSpace: 'nowrap' }}>{st.run}</td>

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
                              padding: typography.matrixRowPadding,
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: avgVal !== '-' ? 700 : 400,
                              fontSize: typography.matrixGrade,
                              color: isRed ? '#b91c1c' : '#000000'
                            }}
                          >
                            {typeof avgVal === 'number' ? avgVal.toFixed(1).replace('.', ',') : avgVal}
                          </td>
                        );
                      })}

                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: typography.matrixRowPadding, fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: typography.matrixGrade, color: '#047857' }}>
                        {st.azules}
                      </td>
                      <td style={{ border: '1px solid #000', textAlign: 'center', padding: typography.matrixRowPadding, fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: typography.matrixGrade, color: st.rojas > 0 ? '#b91c1c' : '#94a3b8' }}>
                        {st.rojas}
                      </td>
                      <td style={{
                        border: '1px solid #000',
                        textAlign: 'center',
                        padding: typography.matrixRowPadding,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 900,
                        fontSize: typography.matrixGrade,
                        backgroundColor: '#f1f5f9',
                        color: st.promedioGeneral >= 4.0 ? '#047857' : '#b91c1c'
                      }}>
                        {st.promedioGeneral > 0 ? st.promedioGeneral.toFixed(1).replace('.', ',') : '-'}
                      </td>
                      <td style={{
                        border: '1px solid #000',
                        textAlign: 'center',
                        padding: typography.matrixRowPadding,
                        fontSize: typography.tableCell,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        color: hasRedAvg ? '#b91c1c' : st.rojas > 0 ? '#d97706' : '#047857'
                      }}>
                        {hasRedAvg ? 'EN RIESGO' : st.rojas > 0 ? 'CON ROJAS' : 'AL DÍA'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* LEYENDA Y GLOSARIO DE ABREVIATURAS DE LA MATRIZ */}
            <div
              className="page-break-avoid"
              style={{
                marginTop: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                padding: '4px 8px',
                fontSize: typography.footer,
                color: '#334155',
                lineHeight: 1.4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px', color: '#0f172a', letterSpacing: '0.2px' }}>
                <span>📌 GLOSARIO DE ABREVIATURAS DEL INFORME:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
                <span><strong>R.U.N.:</strong> Rol Único Nacional</span>
                <span><strong style={{ color: '#047857' }}>AZ (Azules):</strong> Total notas aprobadas (≥ 4.0)</span>
                <span><strong style={{ color: '#b91c1c' }}>RO (Rojas):</strong> Total notas reprobadas (&lt; 4.0)</span>
                <span><strong>PROM:</strong> Promedio general ponderado del estudiante</span>
                <span><strong>AL DÍA:</strong> Sin asignaturas reprobadas</span>
                <span><strong>CON ROJAS:</strong> Presenta calificaciones insuficientes (&lt; 4.0)</span>
                <span><strong>EN RIESGO:</strong> Promedio general insuficiente (&lt; 4.0)</span>
              </div>
              {regularSubjects.length > 0 && (
                <div style={{ marginTop: '3px', borderTop: '1px dotted #cbd5e1', paddingTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '5px 12px' }}>
                  <strong style={{ color: '#475569' }}>Asignaturas:</strong>
                  {regularSubjects.map((sub, idx) => (
                    <span key={idx}><strong>{sub.name.slice(0, 4).toUpperCase()}:</strong> {sub.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* 5. ESTUDIANTES EN ALERTA PEDAGÓGICA (SI EXISTEN)           */}
          {/* ========================================================== */}
          {riskStudents.length > 0 && (
            <div
              className="page-break-avoid"
              style={{
                border: '1px solid #b91c1c',
                backgroundColor: '#fff1f2',
                padding: typography.boxPadding,
                marginBottom: '8px',
                fontSize: typography.tableCell
              }}
            >
              <div style={{ fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '2px', fontSize: typography.tableHeader }}>
                ⚠️ ESTUDIANTES PRIORITARIOS / EN RIESGO ACADÉMICO ({riskStudents.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '3px' }}>
                {riskStudents.map(st => (
                  <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #fecdd3', paddingBottom: '1px' }}>
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
          <div
            className="page-break-avoid"
            style={{
              border: '1px solid #000',
              padding: typography.boxPadding,
              marginBottom: '8px',
              fontSize: typography.tableCell
            }}
          >
            <strong>OBSERVACIONES DE JEFATURA & UTP:</strong> {customObservations}
          </div>

          {/* ========================================================== */}
          {/* 6. FIRMAS DE VALIDACIÓN OFICIAL                           */}
          {/* ========================================================== */}
          <div
            className="page-break-avoid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              textAlign: 'center',
              fontSize: typography.tableCell,
              marginBottom: '8px'
            }}
          >
            <div style={{ border: '1px solid #000', padding: typography.signaturesPadding, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: typography.signaturesMinHeight }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '2px' }}>
                <div style={{ fontWeight: 800, fontSize: typography.signaturesName }}>{teacherName.toUpperCase()}</div>
                <div style={{ fontSize: typography.footer }}>R.U.N. {teacherRun || '—'}</div>
                <div style={{ fontWeight: 700, fontSize: typography.footer, marginTop: '1px' }}>PROFESOR(A) JEFE</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: typography.signaturesPadding, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: typography.signaturesMinHeight }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '2px' }}>
                <div style={{ fontWeight: 800, fontSize: typography.signaturesName }}>{utpName.toUpperCase()}</div>
                <div style={{ fontSize: typography.footer }}>R.U.N. {utpRun || '—'}</div>
                <div style={{ fontWeight: 700, fontSize: typography.footer, marginTop: '1px' }}>JEFE(A) UNIDAD TÉCNICA PEDAGÓGICA</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', padding: typography.signaturesPadding, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: typography.signaturesMinHeight }}>
              <div style={{ borderTop: '1px dotted #000', paddingTop: '2px' }}>
                <div style={{ fontWeight: 800, fontSize: typography.signaturesName }}>{directorName.toUpperCase()}</div>
                <div style={{ fontSize: typography.footer }}>R.U.N. {directorRun || '—'}</div>
                <div style={{ fontWeight: 700, fontSize: typography.footer, marginTop: '1px' }}>DIRECTOR(A) / TIMBRE</div>
              </div>
            </div>
          </div>

          {/* PIE DE PÁGINA */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: typography.footer,
              color: '#334155',
              borderTop: '1px solid #94a3b8',
              paddingTop: '3px'
            }}
          >
            <div>
              LUGAR Y FECHA DE EMISIÓN: {commune}, {issueDate}.
            </div>
            <div>
              SISTEMA INTEGRADO DE GESTIÓN EDUCATIVA — {schoolName} (RBD {rbd})
            </div>
          </div>

        </div>
      </div>

      {/* ESTILOS DE IMPRESIÓN OFICIAL LANDSCAPE AISLADOS */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 4mm 4mm 4mm 4mm;
          }

          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Ocultar la aplicación principal (#root) y todo lo ajeno al modal */
          #root,
          #root * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }

          body > *:not(.panorama-report-overlay) {
            display: none !important;
            visibility: hidden !important;
          }

          body * {
            visibility: hidden;
          }

          .panorama-report-overlay,
          .panorama-report-overlay * {
            visibility: visible !important;
          }

          .panorama-report-overlay {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 99999999 !important;
            overflow: visible !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .panorama-print-sheet {
            box-shadow: none !important;
            border: none !important;
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

          .page-break-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
};

export default PrintPanoramaReportModal;
