import React, { useState, useEffect } from 'react';
import { X, Printer, Settings, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SubjectColumn {
  colNumber: number;
  internalName: string;
  officialCode: number | string;
  officialName: string;
  teacherName: string;
  teacherRun: string;
  teacherStatus: string;
}

interface StudentActaRow {
  listNumber: number;
  id: string;
  fullName: string;
  run: string;
  gender: 'M' | 'F';
  birthDate: string;
  subjectGrades: Record<string, string>;
  promedio: string;
  religion: string;
  orientacion: string;
  attendance: string;
  sf: 'P' | 'R' | 'Y';
  observaciones: string;
}

interface StatsGroup {
  m: number;
  f: number;
  total: number;
}

interface ActaData {
  institution: {
    schoolName: string;
    rbd: string;
    commune: string;
    province: string;
    region: string;
    directorName: string;
    directorRun: string;
  };
  course: {
    name: string;
    level: string;
    modality: string;
    specialty: string;
    academicYear: number;
    homeroomTeacher: string;
  };
  legal: {
    decretoEvaluacion: string;
    decretoPlanes: string;
    resolucionReconocimiento: string;
  };
  subjectColumns: SubjectColumn[];
  students: StudentActaRow[];
  stats: {
    matInicial: StatsGroup;
    retirados: StatsGroup;
    matFinal: StatsGroup;
    promovidos: StatsGroup;
    repRendimiento: StatsGroup;
    repInasistencia: StatsGroup;
    repTotal: StatsGroup;
  };
  verificationCode: string;
}

interface FinalActaModalProps {
  courseName: string;
  academicYear?: number | string;
  onClose: () => void;
}

export const FinalActaModal: React.FC<FinalActaModalProps> = ({
  courseName,
  academicYear = 2026,
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actaData, setActaData] = useState<ActaData | null>(null);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Formulario de ajustes de impresión / metadatos oficiales
  const [editableDecretoEval, setEditableDecretoEval] = useState<string>('Decreto N° 67 / 2018');
  const [editableDecretoPlanes, setEditableDecretoPlanes] = useState<string>('Decreto Exento N° 193 / 2019');
  const [editableResolucion, setEditableResolucion] = useState<string>('Res. Ex. N° 0925 de 1982');
  const [editableEncargadoActa, setEditableEncargadoActa] = useState<string>('');
  const [editableEncargadoRun, setEditableEncargadoRun] = useState<string>('');
  const [editableProfesorJefe, setEditableProfesorJefe] = useState<string>('');
  const [editableProfesorRun, setEditableProfesorRun] = useState<string>('');
  const [editableDirector, setEditableDirector] = useState<string>('');
  const [editableDirectorRun, setEditableDirectorRun] = useState<string>('');
  const [editableFechaEmision, setEditableFechaEmision] = useState<string>(() => {
    const today = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${today.getDate()} de ${meses[today.getMonth()]} de ${today.getFullYear()}`;
  });

  const { token: authContextToken } = useAuth();
  const token = authContextToken || sessionStorage.getItem('ltp_token') || localStorage.getItem('ltp_token') || localStorage.getItem('token') || '';

  const loadActa = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(
        `/api/reports/acta-final?courseName=${encodeURIComponent(courseName)}&academicYear=${academicYear}${token ? `&token=${encodeURIComponent(token)}` : ''}`,
        {
          headers
        }
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al obtener datos del acta oficial.');
      }
      const data: ActaData = await res.json();
      setActaData(data);

      setEditableDecretoEval(data.legal.decretoEvaluacion || 'Decreto N° 67 / 2018');
      setEditableDecretoPlanes(data.legal.decretoPlanes || 'Decreto Exento N° 193 / 2019');
      setEditableResolucion(data.legal.resolucionReconocimiento || 'Res. Ex. N° 0925 de 1982');
      setEditableProfesorJefe(data.course.homeroomTeacher || '');
      setEditableDirector(data.institution.directorName || '');
      setEditableDirectorRun(data.institution.directorRun || '');
      if (!editableEncargadoActa) {
        setEditableEncargadoActa(data.course.homeroomTeacher || 'ENCARGADO(A) DE ACTAS');
      }
    } catch (err: any) {
      console.error('Error cargando acta:', err);
      setError(err.message || 'No se pudo generar el acta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActa();
  }, [courseName, academicYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="final-acta-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* BARRA SUPERIOR DE ACCIONES (OCULTA AL IMPRIMIR) */}
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
          <Award size={22} style={{ color: '#fbbf24' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
              ACTA OFICIAL DE CALIFICACIONES FINALES Y PROMOCIÓN ESCOLAR (MINEDUC)
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {courseName} — Año Lectivo {academicYear}
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
            <Settings size={15} /> Metadatos y Firmas
          </button>

          <button
            onClick={loadActa}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
              padding: '0.45rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Recargar datos desde la base de datos"
          >
            <RefreshCw size={14} /> Recargar
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || !actaData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(5,150,105,0.4)'
            }}
          >
            <Printer size={16} /> Imprimir Acta (Landscape / Oficio)
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

      {/* PANEL DESPLEGABLE DE METADATOS Y FIRMAS (OCULTO AL IMPRIMIR) */}
      {showConfig && actaData && (
        <div className="no-print" style={{
          backgroundColor: '#1e293b',
          borderBottom: '2px solid #475569',
          padding: '1.25rem 2rem',
          color: '#f1f5f9',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#38bdf8' }}>
            Ajustes de Decretos Legales y Firmantes Oficiales del Acta
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Decreto de Evaluación</label>
              <input
                type="text"
                value={editableDecretoEval}
                onChange={e => setEditableDecretoEval(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Decreto Planes y Programas</label>
              <input
                type="text"
                value={editableDecretoPlanes}
                onChange={e => setEditableDecretoPlanes(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Resolución Reconocimiento Oficial</label>
              <input
                type="text"
                value={editableResolucion}
                onChange={e => setEditableResolucion(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Encargado(a) Confección Acta</label>
              <input
                type="text"
                value={editableEncargadoActa}
                onChange={e => setEditableEncargadoActa(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>R.U.N. Encargado(a)</label>
              <input
                type="text"
                value={editableEncargadoRun}
                onChange={e => setEditableEncargadoRun(e.target.value)}
                placeholder="Ej: 15.654.321-K"
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Profesor(a) Jefe</label>
              <input
                type="text"
                value={editableProfesorJefe}
                onChange={e => setEditableProfesorJefe(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>R.U.N. Profesor(a) Jefe</label>
              <input
                type="text"
                value={editableProfesorRun}
                onChange={e => setEditableProfesorRun(e.target.value)}
                placeholder="Ej: 16.789.012-3"
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Director(a) del Establecimiento</label>
              <input
                type="text"
                value={editableDirector}
                onChange={e => setEditableDirector(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>R.U.N. Director(a)</label>
              <input
                type="text"
                value={editableDirectorRun}
                onChange={e => setEditableDirectorRun(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Fecha de Emisión</label>
              <input
                type="text"
                value={editableFechaEmision}
                onChange={e => setEditableFechaEmision(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE CONTENIDO Y VISTA PREVIA IMPRIMIBLE */}
      <div style={{ flex: 1, padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        {loading && (
          <div style={{ color: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
            <RefreshCw className="animate-spin" size={36} style={{ color: '#38bdf8' }} />
            <p style={{ fontWeight: 600 }}>Generando Acta Oficial de Calificaciones Finales y Promoción Escolar...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: '#7f1d1d', border: '1px solid #b91c1c', borderRadius: '8px', padding: '1.5rem', maxWidth: '600px', color: '#fecaca', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AlertCircle size={28} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>Error al generar Acta</div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
              <button onClick={loadActa} style={{ marginTop: '0.75rem', background: '#dc2626', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {!loading && actaData && (
          <div className="acta-print-container" style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            width: '100%',
            maxWidth: '1240px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontFamily: '"Helvetica Neue", Arial, sans-serif'
          }}>

            {/* ======================================================== */}
            {/* PÁGINA 1: CUADRO GENERAL DE CALIFICACIONES Y PROMOCIÓN   */}
            {/* ======================================================== */}
            <div className="acta-page acta-page-1" style={{
              padding: '12mm 10mm 10mm 10mm',
              minHeight: '210mm',
              boxSizing: 'border-box'
            }}>
              
              {/* CABECERA GUBERNAMENTAL OFICIAL */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '6px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '9px', textAlign: 'center', lineHeight: '1.1' }}>
                    ESCUDO<br />CHILE
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      MINISTERIO DE EDUCACIÓN
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>
                      DIVISIÓN DE EDUCACIÓN GENERAL
                    </div>
                    <div style={{ fontSize: '8px', color: '#333' }}>
                      DOCUMENTO OFICIAL DEL ESTADO DE CHILE
                    </div>
                  </div>
                </div>

                <div style={{ border: '2px solid #000000', padding: '4px 10px', textAlign: 'center', minWidth: '320px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.5px' }}>
                    ACTA DE REGISTRO DE CALIFICACIONES FINALES Y PROMOCIÓN ESCOLAR
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 800, marginTop: '2px' }}>
                    CURSO: {actaData.course.name.toUpperCase()} — AÑO ESCOLAR: {actaData.course.academicYear}
                  </div>
                </div>
              </div>

              {/* CUADRO IDENTIFICATORIO DEL ESTABLECIMIENTO Y DECRETOS */}
              <div style={{
                border: '1px solid #000000',
                fontSize: '8px',
                lineHeight: '1.3',
                marginBottom: '8px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr'
              }}>
                <div style={{ padding: '4px 6px', borderRight: '1px solid #000000' }}>
                  <div><strong>REGIÓN:</strong> {actaData.institution.region}</div>
                  <div><strong>PROVINCIA:</strong> {actaData.institution.province} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>COMUNA:</strong> {actaData.institution.commune}</div>
                  <div><strong>ESTABLECIMIENTO:</strong> {actaData.institution.schoolName}</div>
                  <div><strong>R.B.D.:</strong> {actaData.institution.rbd}</div>
                  <div><strong>PROFESOR(A) JEFE:</strong> {editableProfesorJefe.toUpperCase()}</div>
                </div>
                <div style={{ padding: '4px 6px' }}>
                  <div><strong>MODALIDAD:</strong> {actaData.course.modality}</div>
                  <div><strong>ESPECIALIDAD:</strong> {actaData.course.specialty}</div>
                  <div><strong>DEC. EVALUACIÓN N°:</strong> {editableDecretoEval}</div>
                  <div><strong>DEC. PLANES Y PROG. N°:</strong> {editableDecretoPlanes}</div>
                  <div><strong>RES. REC. OFICIAL N°:</strong> {editableResolucion}</div>
                </div>
              </div>

              {/* TABLA PRINCIPAL DE ALUMNOS Y NOTAS */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #000000',
                  fontSize: '7.5px',
                  textAlign: 'center'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000' }}>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '22px' }}>N°</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', minWidth: '170px' }}>
                        NÓMINA DE ALUMNOS (APELLIDOS Y NOMBRES)
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '64px' }}>R.U.N.</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '16px' }}>SEX</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '50px' }}>F. NAC.</th>
                      <th colSpan={actaData.subjectColumns.length} style={{ border: '1px solid #000', padding: '2px', letterSpacing: '0.5px' }}>
                        CALIFICACIONES POR ASIGNATURA O SUBSECTOR (NUMERACIÓN 1 A {actaData.subjectColumns.length})
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '26px', backgroundColor: '#e2e8f0', fontWeight: 800 }}>PROM.</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '22px' }}>RELI.</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '20px' }}>ORIE.</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '28px' }}>% ASIS</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 2px', width: '20px', fontWeight: 900 }}>S.F.</th>
                      <th rowSpan={2} style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', minWidth: '85px' }}>OBSERVACIONES</th>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #000000' }}>
                      {actaData.subjectColumns.map(col => (
                        <th
                          key={col.colNumber}
                          style={{
                            border: '1px solid #000',
                            padding: '2px 1px',
                            width: '24px',
                            fontWeight: 800,
                            fontSize: '8px'
                          }}
                          title={`Columna ${col.colNumber}: [${col.officialCode}] ${col.officialName}`}
                        >
                          {col.colNumber}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actaData.students.map((st) => (
                      <tr key={st.id} style={{
                        height: '14px',
                        borderBottom: '1px solid #000000',
                        backgroundColor: st.sf === 'Y' ? '#f8fafc' : 'transparent'
                      }}>
                        <td style={{ border: '1px solid #000', padding: '1px', fontWeight: 700 }}>{st.listNumber}</td>
                        <td style={{ border: '1px solid #000', padding: '1px 4px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {st.fullName}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '1px', fontFamily: 'monospace', fontSize: '7px' }}>{st.run}</td>
                        <td style={{ border: '1px solid #000', padding: '1px' }}>{st.gender}</td>
                        <td style={{ border: '1px solid #000', padding: '1px', fontSize: '7px' }}>{st.birthDate}</td>

                        {/* NOTAS POR ASIGNATURA */}
                        {actaData.subjectColumns.map(col => {
                          const gradeVal = st.subjectGrades[String(col.colNumber)] || '-';
                          const isRed = gradeVal !== '-' && parseFloat(gradeVal.replace(',', '.')) < 4.0;
                          return (
                            <td
                              key={col.colNumber}
                              style={{
                                border: '1px solid #000',
                                padding: '1px',
                                fontFamily: 'monospace',
                                fontWeight: gradeVal !== '-' ? 700 : 400,
                                color: isRed ? '#b91c1c' : '#000000'
                              }}
                            >
                              {gradeVal}
                            </td>
                          );
                        })}

                        {/* PROMEDIO GENERAL */}
                        <td style={{
                          border: '1px solid #000',
                          padding: '1px',
                          backgroundColor: '#f1f5f9',
                          fontFamily: 'monospace',
                          fontWeight: 800
                        }}>
                          {st.promedio}
                        </td>

                        {/* RELIGIÓN Y ORIENTACIÓN */}
                        <td style={{ border: '1px solid #000', padding: '1px', fontWeight: 600 }}>{st.religion}</td>
                        <td style={{ border: '1px solid #000', padding: '1px', color: '#64748b' }}>{st.orientacion}</td>

                        {/* ASISTENCIA */}
                        <td style={{ border: '1px solid #000', padding: '1px', fontFamily: 'monospace' }}>{st.attendance}</td>

                        {/* SITUACIÓN FINAL (P / R / Y) */}
                        <td style={{
                          border: '1px solid #000',
                          padding: '1px',
                          fontWeight: 900,
                          color: st.sf === 'P' ? '#047857' : st.sf === 'R' ? '#b91c1c' : '#64748b'
                        }}>
                          {st.sf}
                        </td>

                        {/* OBSERVACIONES */}
                        <td style={{ border: '1px solid #000', padding: '1px 3px', textAlign: 'left', fontSize: '7px', whiteSpace: 'nowrap' }}>
                          {st.observaciones}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PIE DE PÁGINA 1 */}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', color: '#475569' }}>
                <div>
                  <strong>Simbología:</strong> P = Promovido(a) &nbsp;|&nbsp; R = Reprobado(a) &nbsp;|&nbsp; Y = Retirado(a) &nbsp;|&nbsp; RELI: MB (Muy Bueno), B (Bueno), S (Suficiente), I (Insuficiente), N/O (No Observa)
                </div>
                <div>
                  <strong>Cód. Verificación:</strong> {actaData.verificationCode} &nbsp;|&nbsp; PÁGINA 1 DE 2
                </div>
              </div>
            </div>

            {/* SALTO DE PÁGINA PARA IMPRESIÓN */}
            <div className="page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }} />

            {/* ======================================================== */}
            {/* PÁGINA 2: SUBSECTORES, RESUMEN ESTADÍSTICO Y FIRMAS      */}
            {/* ======================================================== */}
            <div className="acta-page acta-page-2" style={{
              padding: '12mm 10mm 10mm 10mm',
              minHeight: '210mm',
              boxSizing: 'border-box'
            }}>
              
              {/* CABECERA PÁGINA 2 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 800 }}>
                  {actaData.institution.schoolName} — R.B.D. {actaData.institution.rbd}
                </div>
                <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>
                  ACTA DE CALIFICACIONES FINALES Y PROMOCIÓN ESCOLAR — PÁGINA 2
                </div>
                <div style={{ fontSize: '8px', color: '#475569' }}>
                  CURSO: {actaData.course.name.toUpperCase()} ({actaData.course.academicYear})
                </div>
              </div>

              {/* TABLA DE ASIGNATURAS / SUBSECTORES Y DOCENTES */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.4px' }}>
                  NÓMINA DE ASIGNATURAS, SUBSECTORES OFICIALES (MINEDUC) Y DOCENTES A CARGO
                </div>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #000',
                  fontSize: '7.5px'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000' }}>
                      <th style={{ border: '1px solid #000', padding: '3px', width: '25px', textAlign: 'center' }}>N°</th>
                      <th style={{ border: '1px solid #000', padding: '3px', width: '65px', textAlign: 'center' }}>CÓD. MINEDUC</th>
                      <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left' }}>ASIGNATURA O SUBSECTOR OFICIAL</th>
                      <th style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left' }}>NOMBRE DEL PROFESOR(A)</th>
                      <th style={{ border: '1px solid #000', padding: '3px', width: '75px', textAlign: 'center' }}>R.U.N.</th>
                      <th style={{ border: '1px solid #000', padding: '3px', width: '65px', textAlign: 'center' }}>CONDICIÓN</th>
                      <th style={{ border: '1px solid #000', padding: '3px', width: '90px', textAlign: 'center' }}>FIRMA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actaData.subjectColumns.map(col => (
                      <tr key={col.colNumber} style={{ height: '14px', borderBottom: '1px solid #000' }}>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 800 }}>{col.colNumber}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>
                          {col.officialCode}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '1px 6px', fontWeight: 700 }}>
                          {col.officialName}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '1px 6px' }}>
                          {col.teacherName}
                        </td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontFamily: 'monospace', fontSize: '7px' }}>
                          {col.teacherRun || '-'}
                        </td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontSize: '7px' }}>
                          {col.teacherStatus}
                        </td>
                        <td style={{ border: '1px solid #000' }}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECCIÓN INFERIOR: RESUMEN ESTADÍSTICO Y FIRMAS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.6fr',
                gap: '12px',
                marginTop: '10px'
              }}>
                
                {/* CUADRO RESUMEN ESTADÍSTICO OFICIAL */}
                <div>
                  <div style={{ fontSize: '8.5px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.4px' }}>
                    RESUMEN ESTADÍSTICO DE RENDIMIENTO ESCOLAR
                  </div>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #000',
                    fontSize: '7.5px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000' }}>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left' }}>CONCEPTO</th>
                        <th style={{ border: '1px solid #000', padding: '3px', width: '40px', textAlign: 'center' }}>VAR. (M)</th>
                        <th style={{ border: '1px solid #000', padding: '3px', width: '40px', textAlign: 'center' }}>DAM. (F)</th>
                        <th style={{ border: '1px solid #000', padding: '3px', width: '45px', textAlign: 'center', backgroundColor: '#e2e8f0' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '2px 4px' }}>MATRÍCULA INICIAL</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.matInicial.m}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.matInicial.f}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 800 }}>{actaData.stats.matInicial.total}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '2px 4px' }}>RETIRADOS DURANTE EL AÑO</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.retirados.m}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.retirados.f}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 800 }}>{actaData.stats.retirados.total}</td>
                      </tr>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 800 }}>MATRÍCULA FINAL</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{actaData.stats.matFinal.m}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{actaData.stats.matFinal.f}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>{actaData.stats.matFinal.total}</td>
                      </tr>
                      <tr style={{ color: '#047857' }}>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 800 }}>TOTAL PROMOVIDOS (P)</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{actaData.stats.promovidos.m}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{actaData.stats.promovidos.f}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>{actaData.stats.promovidos.total}</td>
                      </tr>
                      <tr style={{ color: '#b91c1c' }}>
                        <td style={{ border: '1px solid #000', padding: '2px 4px' }}>REPROBADOS POR RENDIMIENTO</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.repRendimiento.m}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.repRendimiento.f}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 800 }}>{actaData.stats.repRendimiento.total}</td>
                      </tr>
                      <tr style={{ color: '#b91c1c' }}>
                        <td style={{ border: '1px solid #000', padding: '2px 4px' }}>REPROBADOS POR INASISTENCIA</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.repInasistencia.m}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center' }}>{actaData.stats.repInasistencia.f}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 800 }}>{actaData.stats.repInasistencia.total}</td>
                      </tr>
                      <tr style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 800 }}>TOTAL REPROBADOS (R)</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{actaData.stats.repTotal.m}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{actaData.stats.repTotal.f}</td>
                        <td style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>{actaData.stats.repTotal.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* CUADRO DE FIRMAS Y TIMBRE OFICIAL */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    textAlign: 'center',
                    fontSize: '7.5px'
                  }}>
                    {/* FIRMA 1 */}
                    <div style={{ border: '1px solid #000', padding: '26px 4px 6px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '68px' }}>
                      <div style={{ borderTop: '1px dotted #000', paddingTop: '3px' }}>
                        <div style={{ fontWeight: 800 }}>{editableEncargadoActa.toUpperCase()}</div>
                        <div style={{ fontSize: '7px' }}>R.U.N. {editableEncargadoRun || '—'}</div>
                        <div style={{ fontWeight: 700, fontSize: '6.5px', marginTop: '1px' }}>ENCARGADO(A) CONFECCIÓN ACTA</div>
                      </div>
                    </div>

                    {/* FIRMA 2 */}
                    <div style={{ border: '1px solid #000', padding: '26px 4px 6px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '68px' }}>
                      <div style={{ borderTop: '1px dotted #000', paddingTop: '3px' }}>
                        <div style={{ fontWeight: 800 }}>{editableProfesorJefe.toUpperCase()}</div>
                        <div style={{ fontSize: '7px' }}>R.U.N. {editableProfesorRun || '—'}</div>
                        <div style={{ fontWeight: 700, fontSize: '6.5px', marginTop: '1px' }}>PROFESOR(A) JEFE</div>
                      </div>
                    </div>

                    {/* FIRMA 3 */}
                    <div style={{ border: '1px solid #000', padding: '26px 4px 6px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '68px' }}>
                      <div style={{ borderTop: '1px dotted #000', paddingTop: '3px' }}>
                        <div style={{ fontWeight: 800 }}>{editableDirector.toUpperCase()}</div>
                        <div style={{ fontSize: '7px' }}>R.U.N. {editableDirectorRun || '—'}</div>
                        <div style={{ fontWeight: 700, fontSize: '6.5px', marginTop: '1px' }}>DIRECTOR(A) / TIMBRE</div>
                      </div>
                    </div>
                  </div>

                  {/* LUGAR, FECHA Y CÓDIGO DE VALIDACIÓN */}
                  <div style={{
                    marginTop: '8px',
                    padding: '4px 6px',
                    border: '1px solid #000',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '7.5px'
                  }}>
                    <div>
                      <strong>LUGAR Y FECHA DE EMISIÓN:</strong> {actaData.institution.commune}, {editableFechaEmision}.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Código de barras decorativo SVG */}
                      <svg width="100" height="16" viewBox="0 0 100 16">
                        <rect x="0" y="0" width="2" height="16" fill="#000" />
                        <rect x="3" y="0" width="1" height="16" fill="#000" />
                        <rect x="6" y="0" width="3" height="16" fill="#000" />
                        <rect x="11" y="0" width="1" height="16" fill="#000" />
                        <rect x="14" y="0" width="2" height="16" fill="#000" />
                        <rect x="18" y="0" width="4" height="16" fill="#000" />
                        <rect x="24" y="0" width="1" height="16" fill="#000" />
                        <rect x="27" y="0" width="3" height="16" fill="#000" />
                        <rect x="32" y="0" width="2" height="16" fill="#000" />
                        <rect x="36" y="0" width="1" height="16" fill="#000" />
                        <rect x="39" y="0" width="3" height="16" fill="#000" />
                        <rect x="44" y="0" width="2" height="16" fill="#000" />
                        <rect x="48" y="0" width="4" height="16" fill="#000" />
                        <rect x="54" y="0" width="1" height="16" fill="#000" />
                        <rect x="57" y="0" width="2" height="16" fill="#000" />
                        <rect x="61" y="0" width="3" height="16" fill="#000" />
                        <rect x="66" y="0" width="1" height="16" fill="#000" />
                        <rect x="69" y="0" width="2" height="16" fill="#000" />
                        <rect x="73" y="0" width="4" height="16" fill="#000" />
                        <rect x="79" y="0" width="1" height="16" fill="#000" />
                        <rect x="82" y="0" width="3" height="16" fill="#000" />
                        <rect x="87" y="0" width="2" height="16" fill="#000" />
                        <rect x="91" y="0" width="1" height="16" fill="#000" />
                        <rect x="94" y="0" width="3" height="16" fill="#000" />
                        <rect x="98" y="0" width="2" height="16" fill="#000" />
                      </svg>
                      <div>
                        <strong>CÓD. VERIFICACIÓN:</strong> {actaData.verificationCode}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* PIE DE PÁGINA 2 */}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', color: '#475569' }}>
                <div>
                  Registro de Calificaciones Finales y Promoción Escolar conforme a normativa vigente MINEDUC (Decreto N° 67 / 2018).
                </div>
                <div>
                  PÁGINA 2 DE 2
                </div>
              </div>

            </div>

          </div>
        )}
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

          .final-acta-overlay {
            position: static !important;
            background: none !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .acta-print-container {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .acta-page {
            page-break-after: always;
            break-after: page;
            min-height: auto !important;
            padding: 0 !important;
          }

          .page-break {
            page-break-before: always !important;
            break-before: page !important;
            height: 0 !important;
          }

          table {
            page-break-inside: avoid;
          }

          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default FinalActaModal;
