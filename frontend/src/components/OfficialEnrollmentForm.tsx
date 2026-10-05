import React, { useState, useEffect } from 'react';
import { Printer, X, FileText, CheckCircle2, Award, ShieldCheck, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import {
  PERSONALITY_REPORT_TEMPLATES,
  ReportLevelKey,
  detectReportTemplateKey,
  getQualifierStyle
} from '../utils/personalityIndicators';

interface OfficialFormProps {
  student: any;
  onClose: () => void;
}

export const OfficialEnrollmentForm: React.FC<OfficialFormProps> = ({ student, onClose }) => {
  const { user, token } = useAuth();
  const [docType, setDocType] = useState<'fide_ficha' | 'alumno_regular' | 'informe_hogar' | 'rice_compromiso' | 'checklist'>('fide_ficha');
  const [checklistType, setChecklistType] = useState<'nuevo' | 'antiguo' | 'retiro'>('nuevo');

  const studentCourse = student.level_name || student.course || '1° Medio A';
  const studentKey = String(student.id || student.run || student.RUT || student.full_name || 'student').trim();
  const [reportLevelKey, setReportLevelKey] = useState<ReportLevelKey>(() => detectReportTemplateKey(studentCourse));
  const [sem1Values, setSem1Values] = useState<Record<string, string>>({});
  const [sem2Values, setSem2Values] = useState<Record<string, string>>({});
  const [reportObservations, setReportObservations] = useState<string>('');
  const [savingReport, setSavingReport] = useState<boolean>(false);

  const schoolYear = student.anno || student.academic_year || student.entry_year || 2026;
  const officerName = student.enrolled_by_name || user?.name || 'Funcionario Responsable de Matrícula';
  const officerRun = student.enrolled_by_run || user?.run || '';
  const officerRole = student.enrolled_by_role || user?.role || 'Encargado de Matrícula';
  const [config, setConfig] = useState<any>({
    commitment_text: "Yo, {GUARDIAN_NAME}, RUN: {GUARDIAN_RUN}, declaro conocer, respetar, cumplir, hacer cumplir y aceptar de forma íntegra el Proyecto Educativo Institucional, el Reglamento de Convivencia Educativa y el Reglamento de Evaluación y Promoción Escolar del Liceo. AUTORIZO LAS SALIDAS DE MI PUPILO (A) a actividades curriculares y extracurriculares programadas fuera del establecimiento (actos, ceremonias, salidas pedagógicas, compromisos deportivos, recreativos y culturales, campañas solidarias y otras...) dentro de la comuna.",
    show_guardian_suplente: true,
    show_health_pie: true,
    show_family_convivencia: true,
    show_religion_ethnicity: true,
    show_school_signatures: true,
    show_student_contacts: true
  });

  useEffect(() => {
    fetch('/api/config/enrollment-settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.commitment_text) {
          setConfig(data);
        }
      })
      .catch(() => {});

    // Cargar evaluación guardada del estudiante desde Supabase
    fetch(`/api/personality-reports?studentKey=${encodeURIComponent(studentKey)}`)
      .then(res => res.json())
      .then(data => {
        if (data?.report) {
          if (data.report.levelKey && PERSONALITY_REPORT_TEMPLATES[data.report.levelKey as ReportLevelKey]) {
            setReportLevelKey(data.report.levelKey as ReportLevelKey);
          }
          if (data.report.sem1) setSem1Values(data.report.sem1);
          if (data.report.sem2) setSem2Values(data.report.sem2);
          if (data.report.observations !== undefined) setReportObservations(data.report.observations);
        } else {
          // Inicializar 1er semestre con el calificador por defecto del nivel
          const tpl = PERSONALITY_REPORT_TEMPLATES[detectReportTemplateKey(studentCourse)];
          const initialSem1: Record<string, string> = {};
          tpl.ambitos.forEach(amb =>
            amb.sections.forEach(sec =>
              sec.indicators.forEach(ind => {
                initialSem1[ind.id] = tpl.defaultQualifier;
              })
            )
          );
          setSem1Values(initialSem1);
        }
      })
      .catch(() => {});
  }, [studentKey, studentCourse]);

  const handleQuickFillSemester = (semester: 'sem1' | 'sem2', qualifier: string) => {
    const tpl = PERSONALITY_REPORT_TEMPLATES[reportLevelKey];
    const nextMap: Record<string, string> = {};
    tpl.ambitos.forEach(amb =>
      amb.sections.forEach(sec =>
        sec.indicators.forEach(ind => {
          nextMap[ind.id] = qualifier;
        })
      )
    );
    if (semester === 'sem1') {
      setSem1Values(prev => ({ ...prev, ...nextMap }));
    } else {
      setSem2Values(prev => ({ ...prev, ...nextMap }));
    }
  };

  const handleSavePersonalityReport = async () => {
    setSavingReport(true);
    try {
      const authToken = token || sessionStorage.getItem('ltp_token') || '';
      const res = await fetch('/api/personality-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          studentKey,
          reportData: {
            studentName: student.full_name || student.Nombres || '',
            studentRun: student.run || student.RUT || '',
            course: studentCourse,
            levelKey: reportLevelKey,
            sem1: sem1Values,
            sem2: sem2Values,
            observations: reportObservations
          }
        })
      });
      if (!res.ok) throw new Error('Error al guardar en el servidor');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Informe guardado en la nube',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo guardar el informe', 'error');
    } finally {
      setSavingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Reemplazar dinámicamente las variables en el texto de compromiso
  const renderCommitmentText = () => {
    let text = config.commitment_text || '';
    text = text.replace(/{GUARDIAN_NAME}/g, student.guardian_name || '-');
    text = text.replace(/{GUARDIAN_RUN}/g, student.guardian_run || 'S/R');
    text = text.replace(/{GUARDIAN_RELATION}/g, student.guardian_relation || 'Apoderado');
    text = text.replace(/{GUARDIAN_SEC_NAME}/g, student.guardian_sec_name || '-');
    text = text.replace(/{GUARDIAN_SEC_RUN}/g, student.guardian_sec_run || 'S/R');
    text = text.replace(/{GUARDIAN_SEC_RELATION}/g, student.guardian_sec_relation || 'Suplente');
    text = text.replace(/{FATHER_NAME}/g, student.father_name || '-');
    text = text.replace(/{FATHER_RUN}/g, student.father_run || 'S/R');
    text = text.replace(/{MOTHER_NAME}/g, student.mother_name || '-');
    text = text.replace(/{MOTHER_RUN}/g, student.mother_run || 'S/R');
    text = text.replace(/{STUDENT_NAME}/g, student.full_name || student.Nombres || '-');
    text = text.replace(/{STUDENT_RUN}/g, student.run || student.RUT || 'S/R');
    text = text.replace(/{LEVEL_NAME}/g, student.level_name || '-');
    return text;
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', zIndex: 3000, overflowY: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '850px', borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', height: 'fit-content' }}>
        
        {/* ENCABEZADO Y SELECTOR DE DOCUMENTO (NO IMPRESO) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', fontSize: '1.3rem', fontWeight: 700 }}>
              Generador Oficial de Documentos Institucionales
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Emisión oficial para: {student.full_name || student.Nombres} | RUT: {student.run || student.RUT}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
              <Printer size={16} /> Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="btn" style={{ background: '#cbd5e1' }}><X size={16} /></button>
          </div>
        </div>

        {/* SELECTOR DE TIPO DE DOCUMENTO A GENERAR */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', background: '#f8fafc', padding: '0.6rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button onClick={() => setDocType('fide_ficha')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: docType === 'fide_ficha' ? '#4f46e5' : '#ffffff', color: docType === 'fide_ficha' ? '#ffffff' : '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            📄 1. Ficha Matrícula FIDE (Oficial {schoolYear})
          </button>
          <button onClick={() => setDocType('alumno_regular')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: docType === 'alumno_regular' ? '#4f46e5' : '#ffffff', color: docType === 'alumno_regular' ? '#ffffff' : '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            🎓 2. Certificado Alumno Regular
          </button>
          <button onClick={() => setDocType('informe_hogar')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: docType === 'informe_hogar' ? '#4f46e5' : '#ffffff', color: docType === 'informe_hogar' ? '#ffffff' : '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            📊 3. Informe al Hogar
          </button>
          <button onClick={() => setDocType('rice_compromiso')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: docType === 'rice_compromiso' ? '#4f46e5' : '#ffffff', color: docType === 'rice_compromiso' ? '#ffffff' : '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            🛡️ 4. Compromiso RICE
          </button>
          <button onClick={() => setDocType('checklist')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', background: docType === 'checklist' ? '#4f46e5' : '#ffffff', color: docType === 'checklist' ? '#ffffff' : '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            📋 5. Control Documental (Checklist)
          </button>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* DOCUMENTO 1: FICHA OFICIAL DE MATRÍCULA MINEDUC / FIDE */}
        {/* ------------------------------------------------------------------- */}
        {docType === 'fide_ficha' && (
          <div id="official-document" style={{ padding: '1.5rem 2rem', fontFamily: '"Times New Roman", Times, serif', color: '#000000', background: '#ffffff', fontSize: '0.85rem' }}>
            
            {/* ENCABEZADO FORMULARIO CON LOGO MINEDUC, INSIGNIA Y FRANJA OFICIAL */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem', gap: '1rem' }}>
              {/* Logo MINEDUC */}
              <div style={{ width: '130px', display: 'flex', alignItems: 'center' }}>
                <img
                  src="/images/logo_mineduc.jpg"
                  alt="Ministerio de Educación - Gobierno de Chile"
                  style={{ maxHeight: '55px', maxWidth: '130px', objectFit: 'contain' }}
                />
              </div>

              {/* Título Central */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#004b87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  REPÚBLICA DE CHILE • MINISTERIO DE EDUCACIÓN
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '2px 0', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#0f172a' }}>
                  LICEO TÉCNICO PROFESIONAL CAMPANARIO MARCOS DELUCCHI FONCK
                </h2>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, margin: 0, color: '#475569', textTransform: 'uppercase' }}>
                  RBD: 3941-1 • Yungay, Región del Ñuble • FIDE
                </p>
                <div style={{ marginTop: '3px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#1e1b4b', letterSpacing: '0.5px' }}>
                    FICHA DE MATRÍCULA OFICIAL
                  </span>
                  <span style={{ marginLeft: '8px', fontSize: '0.8rem', fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                    AÑO ESCOLAR {schoolYear}
                  </span>
                </div>
              </div>

              {/* Insignia del Liceo */}
              <div style={{ width: '130px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <img
                  src="/images/logo_liceo.png"
                  alt="Insignia LTP Campanario"
                  style={{ maxHeight: '58px', maxWidth: '80px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Franja Bicolor Oficial del Gobierno de Chile */}
            <div style={{ display: 'flex', height: '3.5px', width: '100%', marginBottom: '1rem' }}>
              <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
              <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
            </div>

            {/* SECCIÓN 1: ANTECEDENTES DEL ALUMNO(A) */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderLeft: '4px solid #000', paddingLeft: '0.5rem', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>
                1. ANTECEDENTES DEL ALUMNO(A)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>RUN</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.run || student.RUT || '23621969-0'}</span></div>
                <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>NOMBRE COMPLETO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.full_name || student.Nombres || 'Agüero Contreras Juan Pablo'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>CURSO {schoolYear}</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.level_name || '1° Medio'}</span></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>FECHA INGRESO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.entry_date || `01/03/${schoolYear}`}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>F. NACIMIENTO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.birth_date || '16/04/2011'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>SEXO</span> <span style={{ textDecoration: 'underline', fontWeight: 600, textTransform: 'uppercase' }}>{student.gender || 'MASCULINO'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>NACIONALIDAD</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.nationality || 'Chilena'}</span></div>
              </div>

              {config.show_religion_ethnicity && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>ESTADO CIVIL</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.marital_status || 'Soltero/a'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>RELIGIÓN</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.religion || 'Evangélica'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>ETNIA/PUEBLO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.ethnicity || 'No pertenece'}</span></div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>DIRECCIÓN</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.address || 'Ranchillo Bajo S/N'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>REGIÓN</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.region || 'Región de Ñuble'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>COMUNA</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.commune || 'Alto Biobío'}</span></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 1rem' }}>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>COLEGIO PROCEDENCIA</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.previous_school || '-'}</span></div>
                {config.show_student_contacts && (
                  <>
                    <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>TELÉFONO ALUMNO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.student_phone || '-'}</span></div>
                    <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>EMAIL ALUMNO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.student_email || '-'}</span></div>
                  </>
                )}
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>PREVISIÓN (SALUD)</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.health_system || 'Fonasa A'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>N° MATRÍCULA</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.enrollment_number || student.numero_matricula || student.list_number || '001'}</span></div>
              </div>

              {/* REGISTRO OFICIAL DEL FUNCIONARIO MATRICULADOR */}
              <div style={{ marginTop: '0.75rem', padding: '0.45rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong style={{ textTransform: 'uppercase', color: '#1e293b' }}>Funcionario que Matriculó ({schoolYear}):</strong>{' '}
                  <span style={{ textDecoration: 'underline', fontWeight: 700, textTransform: 'uppercase' }}>{officerName}</span>
                  {officerRun && <span style={{ marginLeft: '6px', color: '#475569' }}>• RUN: <strong style={{ color: '#0f172a' }}>{officerRun}</strong></span>}
                  {officerRole && <span style={{ marginLeft: '6px', color: '#475569' }}>• Cargo: <strong style={{ color: '#0f172a' }}>{officerRole}</strong></span>}
                </div>
                <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.7rem' }}>
                  Responsable Institucional de Documentación LTP
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ANTECEDENTES FAMILIARES Y CONVIVENCIA */}
            {config.show_family_convivencia && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderLeft: '4px solid #000', paddingLeft: '0.5rem', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>
                  2. ANTECEDENTES FAMILIARES Y CONVIVENCIA
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>VIVE CON</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.lives_with || 'Ambos Padres'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>GRUPO FAMILIAR (INTEGRANTES)</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.family_members || '4'}</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 1rem' }}>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>TOTAL HERMANOS</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.total_siblings || '2'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>HERMANOS ESCOLARES</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.school_siblings || '1'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>HERMANOS EN ESTE LICEO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.siblings_in_school || '0'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>LUGAR ENTRE HERMANOS</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.sibling_position || '1'}</span></div>
                </div>
              </div>
            )}

            {/* SECCIÓN 3: DATOS DE APODERADOS */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderLeft: '4px solid #000', paddingLeft: '0.5rem', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>
                3. DATOS DE APODERADOS
              </h4>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', textDecoration: 'underline', marginBottom: '0.4rem', textTransform: 'uppercase' }}>APODERADO TITULAR</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>NOMBRE COMPLETO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_name || '-'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>RUT</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_run || 'S/R'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>PARENTESCO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_relation || 'Madre / Padre'}</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>TELÉFONO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_phone || '-'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>EMAIL</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_email || '-'}</span></div>
                <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>DIRECCIÓN APODERADO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_address || student.address || '-'}</span></div>
              </div>

              {config.show_guardian_suplente && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', textDecoration: 'underline', marginBottom: '0.4rem', textTransform: 'uppercase' }}>APODERADO SUPLENTE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                    <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>NOMBRE COMPLETO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_sec_name || '-'}</span></div>
                    <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>RUT</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_sec_run || '-'}</span></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem' }}>
                    <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>PARENTESCO</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_sec_relation || '-'}</span></div>
                    <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>TELÉFONO SUPLENTE</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_sec_phone || '-'}</span></div>
                    <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>EMAIL SUPLENTE</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.guardian_sec_email || '-'}</span></div>
                  </div>
                </>
              )}
            </div>

            {/* SECCIÓN 4: SALUD Y OBSERVACIONES */}
            {config.show_health_pie && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderLeft: '4px solid #000', paddingLeft: '0.5rem', margin: '0 0 0.75rem 0', textTransform: 'uppercase' }}>
                  4. SALUD Y OBSERVACIONES
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>SANGRE</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.blood_type || 'ORH+'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>ALERGIAS</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.allergies || 'Ninguna'}</span></div>
                  <div><span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>ENFERMEDADES/CRÓNICOS</span> <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.chronic_conditions || 'Ninguna'}</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>PREVISIÓN DE SALUD</span>
                    <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.health_system || 'Fonasa A'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>SEGURO DE SALUD COMPLEMENTARIO</span>
                    <span style={{ textDecoration: 'underline', fontWeight: 600 }}>
                      {student.has_complementary_insurance 
                        ? `SÍ — ${student.complementary_insurance_name || 'Compañía sin especificar'} (${student.complementary_insurance_coverage || 'Cobertura estándar'})`
                        : 'NO POSEE SEGURO COMPLEMENTARIO'}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: '#444' }}>OBSERVACIONES GENERALES</span>
                  <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{student.general_observations || 'Sin observaciones registradas'}</span>
                </div>
              </div>
            )}

            {/* AUTORIZACIÓN DE USO DE IMAGEN Y REGISTRO AUDIOVISUAL */}
            <div style={{ border: '1px solid #000000', padding: '0.75rem 1rem', marginTop: '1rem', marginBottom: '1rem', background: student.authorize_image_use !== 0 && student.image_auth_scope !== 'ninguna' ? '#f0fdf4' : '#fef2f2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <strong style={{ fontSize: '0.82rem', textTransform: 'uppercase' }}>
                  AUTORIZACIÓN INSTITUCIONAL DE USO DE IMAGEN DEL ESTUDIANTE:
                </strong>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', textDecoration: 'underline', color: student.authorize_image_use !== 0 && student.image_auth_scope !== 'ninguna' ? '#15803d' : '#b91c1c' }}>
                  {(!student.authorize_image_use || student.image_auth_scope === 'ninguna')
                    ? 'NO AUTORIZADO (NO)'
                    : student.image_auth_scope === 'grupal'
                      ? 'AUTORIZADO (SOLO FOTOS Y VIDEOS GRUPALES)'
                      : student.image_auth_scope === 'personal'
                        ? 'AUTORIZADO (SOLO FOTOS PERSONALES / INDIVIDUALES)'
                        : 'AUTORIZADO (PERSONAL Y GRUPAL)'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.4, textAlign: 'justify', color: '#334155' }}>
                {(!student.authorize_image_use || student.image_auth_scope === 'ninguna')
                  ? 'El apoderado declara haber sido informado y RECHAZA expresamente el uso, captación, registro fotográfico y audiovisual del estudiante para cualquier fin y en cualquier medio institucional.'
                  : student.image_auth_scope === 'grupal'
                    ? 'El apoderado declara haber sido informado y consiente el uso y registro fotográfico y audiovisual del estudiante EXCLUSIVAMENTE EN ACTIVIDADES GRUPALES (salidas a terreno, actos y talleres), prohibiendo registros individuales en primer plano exclusivo.'
                    : student.image_auth_scope === 'personal'
                      ? 'El apoderado declara haber sido informado y consiente el registro de imágenes del estudiante ÚNICAMENTE DE FORMA PERSONAL / INDIVIDUAL para fines de registro escolar interno, credenciales y documentación institucional.'
                      : 'El apoderado declara haber sido informado y consiente expresamente el uso, registro fotográfico y audiovisual del estudiante de forma personal (individual) y grupal para fines exclusivamente pedagógicos, actividades extracurriculares y difusión en medios de comunicación oficiales del Liceo Técnico Profesional Campanario Marcos Delucchi Fonck.'}
              </p>
            </div>

            {/* RECUADRO DE COMPROMISO CON LA NORMATIVA DEL ESTABLECIMIENTO EDUCACIONAL */}
            <div style={{ border: '2px solid #000000', padding: '1rem', marginTop: '1.5rem', marginBottom: '2.5rem', background: '#fafafa' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 0.5rem 0', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                COMPROMISO CON LA NORMATIVA DEL ESTABLECIMIENTO EDUCACIONAL
              </h4>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5, margin: 0, textAlign: 'justify' }}>
                {renderCommitmentText()}
              </p>
            </div>

            {/* SECCIÓN DE FIRMAS Y TIMBRE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', marginTop: '3.5rem', textAlign: 'center', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '85%', borderTop: '1.5px solid #000000', marginBottom: '0.4rem' }}></div>
                <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>Firma Apoderado Titular</div>
                <div style={{ color: '#111827', fontWeight: 700, fontSize: '0.82rem', marginTop: '0.2rem' }}>{student.guardian_name || '-'}</div>
                <div style={{ color: '#475569', fontSize: '0.78rem' }}>{student.guardian_run || 'S/R'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '85%', borderTop: '1.5px solid #000000', marginBottom: '0.4rem' }}></div>
                <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>Firma Funcionario LTP</div>
                <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.84rem', marginTop: '0.2rem', textTransform: 'uppercase' }}>
                  {officerName}
                </div>
                <div style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 600, marginTop: '0.1rem' }}>
                  {officerRun ? `RUN: ${officerRun}` : ''} {officerRun && officerRole ? '—' : ''} {officerRole ? `Cargo: ${officerRole}` : ''}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontStyle: 'italic', marginTop: '0.2rem' }}>Timbre de Matrícula</div>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* DOCUMENTO 2: CERTIFICADO DE ALUMNO REGULAR */}
        {/* ------------------------------------------------------------------- */}
        {docType === 'alumno_regular' && (
          <div id="official-document" style={{ border: '2px solid #0f172a', padding: '2.5rem', fontFamily: 'serif', background: '#ffffff' }}>
            {/* Encabezado Ministerial Oficial */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem', gap: '1rem' }}>
              <div style={{ width: '130px', display: 'flex', alignItems: 'center' }}>
                <img
                  src="/images/logo_mineduc.jpg"
                  alt="Ministerio de Educación"
                  style={{ maxHeight: '55px', maxWidth: '130px', objectFit: 'contain' }}
                />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#004b87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  REPÚBLICA DE CHILE • MINISTERIO DE EDUCACIÓN
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '2px 0', textTransform: 'uppercase', color: '#0f172a' }}>
                  Liceo Técnico Profesional Campanario Marcos Delucchi Fonck — RBD 3941-1
                </h4>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '0.5rem', textDecoration: 'underline', color: '#1e1b4b' }}>
                  CERTIFICADO DE ALUMNO REGULAR
                </h2>
              </div>
              <div style={{ width: '130px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <img
                  src="/images/logo_liceo.png"
                  alt="Insignia LTP Campanario"
                  style={{ maxHeight: '58px', maxWidth: '80px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Franja Bicolor Oficial */}
            <div style={{ display: 'flex', height: '3.5px', width: '100%', marginBottom: '2rem' }}>
              <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
              <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
            </div>

            <div style={{ fontSize: '1.05rem', lineHeight: 2, textAlign: 'justify', marginBottom: '4rem' }}>
              <p>
                La Dirección del <strong>Liceo Técnico Profesional Campanario Marcos Delucchi Fonck (RBD 3941-1)</strong> certifica que el/la estudiante <strong>{student.full_name || student.Nombres}</strong>, Cédula de Identidad RUT <strong>{student.run || student.RUT}</strong>, se encuentra oficialmente matriculado/a y cursa estudios como <strong>ALUMNO REGULAR</strong> en el nivel <strong>{student.level_name || '1° Medio A'}</strong> durante el Año Lectivo <strong>{schoolYear}</strong>.
              </p>
              <p style={{ marginTop: '1.5rem' }}>
                Se extiende el presente certificado a petición del apoderado para los fines que estime convenientes.
              </p>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '5rem', fontSize: '0.95rem' }}>
              Yungay, {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
              <div style={{ borderTop: '1px solid #000000', paddingTop: '0.5rem', width: '320px', textAlign: 'center', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                Dirección Académica<br />Liceo Técnico Profesional Campanario Marcos Delucchi Fonck<br />RBD 3941-1
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* DOCUMENTO 3: INFORME AL HOGAR / INFORME DE PERSONALIDAD (PK A 4°M) */}
        {/* ------------------------------------------------------------------- */}
        {docType === 'informe_hogar' && (() => {
          const currentTemplate = PERSONALITY_REPORT_TEMPLATES[reportLevelKey];
          return (
            <div>
              {/* Barra de herramientas interactiva (no se imprime) */}
              <div className="no-print" style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '0.9rem 1.1rem',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                      📚 Pauta Oficial por Nivel:
                    </label>
                    <select
                      value={reportLevelKey}
                      onChange={e => setReportLevelKey(e.target.value as ReportLevelKey)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #94a3b8',
                        fontWeight: 700,
                        fontSize: '0.82rem',
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

                  <button
                    onClick={handleSavePersonalityReport}
                    disabled={savingReport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: savingReport ? 'wait' : 'pointer',
                      boxShadow: '0 2px 5px rgba(22, 163, 74, 0.25)'
                    }}
                  >
                    <Save size={15} /> {savingReport ? 'Guardando...' : 'Guardar Evaluación'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.76rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#334155' }}>Autocompletar 1er Sem:</strong>
                    {currentTemplate.scale.map(sc => (
                      <button
                        key={`s1-${sc.code}`}
                        type="button"
                        onClick={() => handleQuickFillSemester('sem1', sc.code)}
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: `1px solid ${sc.color}`,
                          background: sc.bgColor,
                          color: sc.color,
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                        title={`Marcar todo el 1er Semestre como ${sc.label}`}
                      >
                        {sc.code}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#334155' }}>Autocompletar 2do Sem:</strong>
                    {currentTemplate.scale.map(sc => (
                      <button
                        key={`s2-${sc.code}`}
                        type="button"
                        onClick={() => handleQuickFillSemester('sem2', sc.code)}
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: `1px solid ${sc.color}`,
                          background: sc.bgColor,
                          color: sc.color,
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                        title={`Marcar todo el 2do Semestre como ${sc.label}`}
                      >
                        {sc.code}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleQuickFillSemester('sem2', '-')}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        border: '1px solid #94a3b8',
                        background: '#ffffff',
                        color: '#475569',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      Limpiar 2° Sem
                    </button>
                  </div>
                </div>
              </div>

              <div id="official-document" style={{ border: '2px solid #0f172a', padding: '1.5rem 1.75rem', fontFamily: 'Arial, sans-serif', background: '#ffffff', color: '#0f172a' }}>
                {/* Encabezado con Logos */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '1rem' }}>
                  <div style={{ width: '110px' }}>
                    <img
                      src="/images/logo_mineduc.jpg"
                      alt="MINEDUC"
                      style={{ maxHeight: '46px', maxWidth: '110px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#004b87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      REPÚBLICA DE CHILE • MINISTERIO DE EDUCACIÓN
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e1b4b', margin: '2px 0' }}>
                      {currentTemplate.reportTitle} — AÑO ESCOLAR {schoolYear}
                    </h3>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                      {currentTemplate.levelLabel}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#004b87', margin: '2px 0 0 0', fontWeight: 700 }}>
                      Liceo Técnico Profesional Campanario Marcos Delucchi Fonck (RBD: 3941-1)
                    </p>
                  </div>
                  <div style={{ width: '110px', display: 'flex', justifyContent: 'flex-end' }}>
                    <img
                      src="/images/logo_liceo.png"
                      alt="Insignia"
                      style={{ maxHeight: '50px', maxWidth: '72px', objectFit: 'contain' }}
                    />
                  </div>
                </div>

                {/* Franja Bicolor */}
                <div style={{ display: 'flex', height: '3px', width: '100%', marginBottom: '0.9rem' }}>
                  <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
                  <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
                </div>

                {/* Datos del Estudiante */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1rem', marginBottom: '0.9rem', background: '#f8fafc', padding: '0.7rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                  <div><strong>Estudiante:</strong> {student.full_name || student.Nombres}</div>
                  <div><strong>RUN / RUT:</strong> {student.run || student.RUT}</div>
                  <div><strong>Curso / Nivel:</strong> {studentCourse}</div>
                  <div><strong>Educador(a) / Profesor(a) Jefe:</strong> {student.profesor_jefe || student.homeroomTeacher || 'Docente Jefe'}</div>
                </div>

                {/* Escala de Evaluación (Calificadores) */}
                <div style={{ marginBottom: '0.9rem', padding: '0.5rem 0.85rem', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.74rem' }}>
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

                {/* Tablas de Ámbitos / Núcleos / Áreas e Indicadores */}
                {currentTemplate.ambitos.map((ambito, ambIdx) => (
                  <div key={ambIdx} style={{ marginBottom: '1rem' }}>
                    {ambito.ambitoTitle && (
                      <div style={{
                        background: '#1e1b4b',
                        color: '#ffffff',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase',
                        borderRadius: '4px 4px 0 0'
                      }}>
                        {ambito.ambitoTitle}
                      </div>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ background: '#004b87', color: '#ffffff' }}>
                          <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                            {ambito.ambitoTitle ? 'Núcleo / Indicadores de Evaluación' : 'Área / Indicadores de Evaluación'}
                          </th>
                          <th style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '78px' }}>1er Sem</th>
                          <th style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '78px' }}>2do Sem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ambito.sections.map((section, secIdx) => (
                          <React.Fragment key={secIdx}>
                            <tr style={{ background: '#e2e8f0' }}>
                              <td colSpan={3} style={{ padding: '0.38rem 0.6rem', fontWeight: 800, color: '#0f172a', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}>
                                {section.title}
                              </td>
                            </tr>
                            {section.indicators.map((ind, indIdx) => {
                              const val1 = sem1Values[ind.id] || currentTemplate.defaultQualifier;
                              const val2 = sem2Values[ind.id] || '-';
                              const style1 = getQualifierStyle(val1, currentTemplate.category);
                              const style2 = getQualifierStyle(val2, currentTemplate.category);

                              return (
                                <tr key={ind.id} style={{ background: indIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                  <td style={{ padding: '0.35rem 0.6rem', border: '1px solid #cbd5e1', lineHeight: 1.35, color: '#1e293b' }}>
                                    {ind.oa && (
                                      <strong style={{ color: '#004b87', marginRight: '0.35rem', fontSize: '0.72rem' }}>
                                        ({ind.oa})
                                      </strong>
                                    )}
                                    {ind.text}
                                  </td>
                                  <td style={{ padding: '0.25rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                    <select
                                      value={val1}
                                      onChange={e => setSem1Values(prev => ({ ...prev, [ind.id]: e.target.value }))}
                                      style={{
                                        width: '100%',
                                        textAlign: 'center',
                                        fontWeight: 800,
                                        fontSize: '0.74rem',
                                        padding: '2px 4px',
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
                                  <td style={{ padding: '0.25rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                    <select
                                      value={val2}
                                      onChange={e => setSem2Values(prev => ({ ...prev, [ind.id]: e.target.value }))}
                                      style={{
                                        width: '100%',
                                        textAlign: 'center',
                                        fontWeight: 800,
                                        fontSize: '0.74rem',
                                        padding: '2px 4px',
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

                {/* Observaciones Generales */}
                <div style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                    Observaciones y Sugerencias al Hogar:
                  </div>
                  <textarea
                    value={reportObservations}
                    onChange={e => setReportObservations(e.target.value)}
                    placeholder="Escriba aquí observaciones cualitativas, fortalezas o compromisos pedagógicos del estudiante..."
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.78rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Firmas Oficiales */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '2.2rem', textAlign: 'center', fontSize: '0.76rem' }}>
                  <div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.35rem', fontWeight: 700 }}>
                      Educador(a) / Profesor(a) Jefe
                    </div>
                  </div>
                  <div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.35rem', fontWeight: 700 }}>
                      Dirección / UTP
                    </div>
                  </div>
                  <div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.35rem', fontWeight: 700 }}>
                      Firma Apoderado(a)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ------------------------------------------------------------------- */}
        {/* DOCUMENTO 4: COMPROMISO RICE */}
        {/* ------------------------------------------------------------------- */}
        {docType === 'rice_compromiso' && (
          <div id="official-document" style={{ border: '2px solid #0f172a', padding: '2rem', fontFamily: 'serif', background: '#ffffff' }}>
            {/* Encabezado con Logos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '1rem' }}>
              <div style={{ width: '120px' }}>
                <img
                  src="/images/logo_mineduc.jpg"
                  alt="MINEDUC"
                  style={{ maxHeight: '48px', maxWidth: '120px', objectFit: 'contain' }}
                />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                  COMPROMISO DE CONVIVENCIA ESCOLAR RICE {schoolYear}
                </h3>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '2px 0 0 0', color: '#004b87' }}>
                  Liceo Técnico Profesional Campanario Marcos Delucchi Fonck — RBD 3941-1
                </h4>
              </div>
              <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end' }}>
                <img
                  src="/images/logo_liceo.png"
                  alt="Insignia"
                  style={{ maxHeight: '52px', maxWidth: '75px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Franja Bicolor */}
            <div style={{ display: 'flex', height: '3px', width: '100%', marginBottom: '1.5rem' }}>
              <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
              <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
            </div>

            <div style={{ fontSize: '0.95rem', lineHeight: 1.8, textAlign: 'justify', marginBottom: '3rem' }}>
              <p>
                Yo, <strong>{student.guardian_name || 'Apoderado Responsable'}</strong>, apoderado del estudiante <strong>{student.full_name || student.Nombres}</strong> (RUT: {student.run || student.RUT}), matriculado en el nivel <strong>{student.level_name || '1° Medio A'}</strong>, declaro haber recibido el Reglamento Interno de Convivencia Escolar (RICE) y acepto colaborar activamente en la formación ética y disciplinaria de mi pupilo/a.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', marginTop: '5rem', textTransform: 'uppercase', fontSize: '0.85rem', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000000', paddingTop: '0.5rem' }}>
                Firma Apoderado<br />RUT: {student.guardian_run || '___________________'}
              </div>
              <div style={{ borderTop: '1px solid #000000', paddingTop: '0.5rem' }}>
                Encargado Convivencia Escolar<br />Liceo Técnico Profesional Campanario Marcos Delucchi Fonck
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* DOCUMENTO 5: CONTROL DOCUMENTAL DE MATRÍCULA Y RETIRO (CHECKLIST)   */}
        {/* ------------------------------------------------------------------- */}
        {docType === 'checklist' && (
          <div id="official-document" style={{ border: '2px solid #0f172a', padding: '2rem', fontFamily: 'serif', background: '#ffffff' }}>
            {/* Selector de tipo en pantalla (no print) */}
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setChecklistType('nuevo')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: checklistType === 'nuevo' ? '#10b981' : '#ffffff',
                  color: checklistType === 'nuevo' ? '#ffffff' : '#334155'
                }}
              >
                🌟 Estudiante Nuevo (Ingreso / SAE)
              </button>
              <button
                type="button"
                onClick={() => setChecklistType('antiguo')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: checklistType === 'antiguo' ? '#10b981' : '#ffffff',
                  color: checklistType === 'antiguo' ? '#ffffff' : '#334155'
                }}
              >
                🔄 Estudiante Antiguo (Continuidad)
              </button>
              <button
                type="button"
                onClick={() => setChecklistType('retiro')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: checklistType === 'retiro' ? '#ef4444' : '#ffffff',
                  color: checklistType === 'retiro' ? '#ffffff' : '#334155'
                }}
              >
                🚪 Retiro de Estudiante
              </button>
            </div>

            {/* Encabezado con Logos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '1rem' }}>
              <div style={{ width: '120px' }}>
                <img
                  src="/images/logo_mineduc.jpg"
                  alt="MINEDUC"
                  style={{ maxHeight: '48px', maxWidth: '120px', objectFit: 'contain' }}
                />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                  {checklistType === 'retiro' 
                    ? `ACTA OFICIAL DE ENTREGA DE DOCUMENTOS POR RETIRO (${schoolYear})`
                    : `CONTROL DOCUMENTAL DE CARPETA DE MATRÍCULA (${checklistType === 'nuevo' ? 'ESTUDIANTE NUEVO' : 'ESTUDIANTE ANTIGUO'} ${schoolYear})`}
                </h3>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '2px 0 0 0', color: '#004b87' }}>
                  Liceo Técnico Profesional Campanario Marcos Delucchi Fonck — RBD 3941-1
                </h4>
              </div>
              <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end' }}>
                <img
                  src="/images/logo_liceo.png"
                  alt="Insignia"
                  style={{ maxHeight: '52px', maxWidth: '75px', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Franja Bicolor */}
            <div style={{ display: 'flex', height: '3px', width: '100%', marginBottom: '1.25rem' }}>
              <div style={{ flex: '0 0 65%', background: '#004b87' }}></div>
              <div style={{ flex: '0 0 35%', background: '#e2211c' }}></div>
            </div>

            {/* Datos del Estudiante */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '0.6rem 0.85rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.4rem'
            }}>
              <div><strong>Estudiante:</strong> {student.full_name || student.Nombres}</div>
              <div><strong>RUT / RUN:</strong> {student.run || student.RUT}</div>
              <div><strong>Curso:</strong> {student.level_name || student.desc_grado || '-'}</div>
              <div><strong>Apoderado:</strong> {student.guardian_name || '-'}</div>
            </div>

            {/* Tabla de Documentos según tipo */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                  <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center', width: '60px' }}>ESTADO</th>
                  <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>DOCUMENTO REQUERIDO / REQUISITO</th>
                  <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', width: '130px' }}>TIPO</th>
                  <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left', width: '180px' }}>OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {checklistType === 'retiro' ? (
                  <>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Certificado Oficial de Retiro Escolar</td><td style={{ padding: '0.35rem' }}>Ministerial</td><td style={{ padding: '0.35rem' }}>Original entregado al apoderado</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Concentración de Notas Parciales al Día</td><td style={{ padding: '0.35rem' }}>Académico</td><td style={{ padding: '0.35rem' }}>Firmado por UTP</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Informe de Desarrollo Personal y Social</td><td style={{ padding: '0.35rem' }}>Convivencia</td><td style={{ padding: '0.35rem' }}>Informe al hogar emitido</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Copia de Ficha Oficial de Matrícula</td><td style={{ padding: '0.35rem' }}>Registro</td><td style={{ padding: '0.35rem' }}>Archivo institucional</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[     ]</td><td style={{ padding: '0.35rem' }}>Informe Técnico PIE / PAI (si corresponde)</td><td style={{ padding: '0.35rem' }}>PIE</td><td style={{ padding: '0.35rem' }}>Si el estudiante es de integración</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Certificado de No Deuda Biblioteca / CRA</td><td style={{ padding: '0.35rem' }}>Materiales</td><td style={{ padding: '0.35rem' }}>Sin libros pendientes</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Devolución de Certificado de Nacimiento Original</td><td style={{ padding: '0.35rem' }}>Custodia</td><td style={{ padding: '0.35rem' }}>Entregado conforme</td></tr>
                  </>
                ) : checklistType === 'nuevo' ? (
                  <>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Certificado de Nacimiento para Matrícula</td><td style={{ padding: '0.35rem' }}>Identificación</td><td style={{ padding: '0.35rem' }}>Vigente y legible</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Certificado Anual de Estudios años anteriores</td><td style={{ padding: '0.35rem' }}>Académico</td><td style={{ padding: '0.35rem' }}>MINEDUC / Mineduc.cl</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Informe de Personalidad colegio de procedencia</td><td style={{ padding: '0.35rem' }}>Convivencia</td><td style={{ padding: '0.35rem' }}>Antecedentes conductuales</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Fotocopia C.I. Estudiante y Apoderados</td><td style={{ padding: '0.35rem' }}>Identificación</td><td style={{ padding: '0.35rem' }}>Ambos lados fotocopiados</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Ficha de Antecedentes de Salud / Vacunación</td><td style={{ padding: '0.35rem' }}>Salud</td><td style={{ padding: '0.35rem' }}>Alergias y tratamientos</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[     ]</td><td style={{ padding: '0.35rem' }}>Diagnóstico PIE / FUDEC (si postula a PIE)</td><td style={{ padding: '0.35rem' }}>PIE</td><td style={{ padding: '0.35rem' }}>Valoración de salud</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Ficha Oficial de Matrícula FIDE firmada</td><td style={{ padding: '0.35rem' }}>Institucional</td><td style={{ padding: '0.35rem' }}>Completada por apoderado</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Compromiso con el RICE firmado</td><td style={{ padding: '0.35rem' }}>Convivencia</td><td style={{ padding: '0.35rem' }}>Reglamento interno</td></tr>
                  </>
                ) : (
                  <>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Actualización de Ficha de Matrícula FIDE</td><td style={{ padding: '0.35rem' }}>Institucional</td><td style={{ padding: '0.35rem' }}>Datos actualizados</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Fotocopia C.I. vigente del Apoderado Titular</td><td style={{ padding: '0.35rem' }}>Identificación</td><td style={{ padding: '0.35rem' }}>Copia archivada</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Actualización de Teléfonos y Domicilio de Emergencia</td><td style={{ padding: '0.35rem' }}>Contacto</td><td style={{ padding: '0.35rem' }}>Verificados</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Ficha de Salud y Alergias (cambios recientes)</td><td style={{ padding: '0.35rem' }}>Salud</td><td style={{ padding: '0.35rem' }}>Actualizada</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[     ]</td><td style={{ padding: '0.35rem' }}>Consentimiento de Continuidad PIE</td><td style={{ padding: '0.35rem' }}>PIE</td><td style={{ padding: '0.35rem' }}>Si aplica a integración</td></tr>
                    <tr style={{ borderBottom: '1px solid #cbd5e1' }}><td style={{ textAlign: 'center', padding: '0.35rem' }}>[  ✓  ]</td><td style={{ padding: '0.35rem' }}>Ratificación de Compromiso RICE {schoolYear}</td><td style={{ padding: '0.35rem' }}>Convivencia</td><td style={{ padding: '0.35rem' }}>Firma apoderado</td></tr>
                  </>
                )}
              </tbody>
            </table>

            {/* Firmas Oficiales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', marginTop: '3.5rem', textTransform: 'uppercase', fontSize: '0.85rem', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000000', paddingTop: '0.5rem' }}>
                Firma Apoderado Responsable<br />
                RUT: {student.guardian_run || '___________________'}
              </div>
              <div style={{ borderTop: '1px solid #000000', paddingTop: '0.5rem' }}>
                {officerName}<br />
                {officerRole} • LTP Campanario
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
