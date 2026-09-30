import React from 'react';
import { PAUTA_PEDAGOGICA_INDICADORES, PAUTA_SOCIAL_INDICADORES, getChileanDateComponents, formatChileDate } from './MineducConstants';

export const MineducPrintStyles: React.FC = () => (
  <style>{`
    @media print {
      @page {
        size: letter;
        margin: 15mm 15mm 15mm 15mm;
      }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #0f172a;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body * {
        visibility: hidden;
      }
      #mineduc-print-sheet, #mineduc-print-sheet * {
        visibility: visible;
      }
      #mineduc-print-sheet {
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        background: #ffffff !important;
      }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; break-after: always; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    }
    .print-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.4;
    }
    .grid-table {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid #000;
      gap: 1px;
      background-color: #000;
      margin-bottom: 1.25rem;
    }
    .grid-cell {
      background-color: #fff;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
    }
    .grid-cell.span-2 { grid-column: span 2; }
    .grid-cell.span-3 { grid-column: span 3; }
    .cell-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 2px;
    }
    .cell-value {
      font-size: 9.5pt;
      font-weight: 500;
      color: #000;
    }
    .table-bordered {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }
    .table-bordered th, .table-bordered td {
      border: 1px solid #000;
      padding: 6px 8px;
      font-size: 8.5pt;
    }
    .table-bordered th {
      background-color: #f1f5f9;
      font-weight: 700;
      text-align: left;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      background-color: #f8fafc;
      border-left: 4px solid #002b49;
      padding: 4px 8px;
      margin: 1rem 0 0.5rem 0;
    }
    .section-title.fus {
      border-left: 4px solid #002b49;
      background-color: #f1f5f9;
      color: #0f172a;
    }
    .section-title.paec {
      border-left: 4px solid #7c3aed;
      background-color: #f5f3ff;
      color: #5b21b6;
    }
    .section-title.family {
      border-left: 4px solid #1e3a8a;
      background-color: #eff6ff;
      color: #1e3a8a;
    }
    .section-title.psycho {
      border-left: 4px solid #0f766e;
      background-color: #f0fdfa;
      color: #0f766e;
    }
    .section-title.simce {
      border-left: 4px solid #0284c7;
      background-color: #f0f9ff;
      color: #0369a1;
    }
    .signature-box {
      width: 220px;
      text-align: center;
      border-top: 1px solid #000;
      padding-top: 5px;
      font-size: 8.5pt;
    }
  `}</style>
);

// =============================================================================
// 1. PLANTILLA: CERTIFICADO SIMCE NEEP
// Propósito: Presentación ante la Agencia de Calidad de la Educación.
// =============================================================================
export const SimceNeepCertificate: React.FC<{ data: any; student: any; institution: any }> = ({
  data,
  student,
  institution
}) => {
  const dateComp = (data.dia && data.mes && data.anio)
    ? { dia: String(data.dia), mes: String(data.mes), anio: String(data.anio) }
    : getChileanDateComponents(data.evaluation_date || data.fechaEmision);
  const folio = data.folio || `SIMCE-${student?.run?.replace(/[^0-9kK]/g, '') || '001'}-${dateComp.anio}`;
  const estudianteNombre = student?.full_name || data.estudianteNombre || '—';
  const estudianteRut = student?.run || data.estudianteRut || '—';
  const estudianteCurso = student?.desc_grado || data.estudianteCurso || '—';
  const diagnostico = data.diagnostico || student?.pie_diagnosis || 'Necesidades Educativas Especiales Permanentes';
  const diagnosticoAdicional = data.diagnosticoAdicional || '';
  const directorNombre = data.directorNombre || institution?.director || 'Víctor Ojeda Ojeda';
  const coordinadorNombre = data.coordinadorNombre || data.professional_name || 'Scarlette Burgos Sandoval';

  return (
    <div className="print-root print-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Encabezado Institucional */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '25px' }}>
        <img src="/images/logo_liceo.png" alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '13pt', fontWeight: 800 }}>LICEO T.P. CAMPANARIO</h2>
          <h3 style={{ margin: '2px 0', fontSize: '11pt', fontWeight: 700 }}>MARCOS DELUCCHI FONCK</h3>
          <p style={{ margin: 0, fontSize: '9.5pt' }}>Programa de Integración Escolar (PIE)</p>
        </div>
        <div style={{ width: '90px', fontSize: '8pt', textAlign: 'right', fontWeight: 700 }}>
          FOLIO:<br />{folio}
        </div>
      </div>

      {/* Título del Certificado */}
      <div style={{ textAlign: 'center', margin: '35px 0 30px 0' }}>
        <h1 style={{ fontSize: '15pt', fontWeight: 900, textDecoration: 'underline', letterSpacing: '0.5px' }}>
          CERTIFICADO ESTUDIANTE CON NEEP
        </h1>
      </div>

      {/* Cuerpo Legal */}
      <div style={{ fontSize: '11pt', lineHeight: 2, textAlign: 'justify', marginBottom: '40px' }}>
        <p>
          Por medio del presente, se certifica que el/la estudiante <strong>{estudianteNombre}</strong>,{' '}
          RUT <strong>{estudianteRut}</strong>, del curso <strong>{estudianteCurso}</strong>,{' '}
          pertenece al Programa de Integración Escolar {dateComp.anio} del Liceo T.P Campanario, RBD: 3941-1, Comuna de Yungay,{' '}
          y presenta Necesidades Educativas Permanentes bajo el diagnóstico de <strong>{diagnostico}{diagnosticoAdicional ? `, ${diagnosticoAdicional}` : ''}</strong>.
        </p>

        <p>
          Se extiende el presente certificado para ser presentado en la Plataforma de Certificados SIMCE,{' '}
          para los fines de acreditación que correspondan.
        </p>

        <p>
          Se adjuntan los documentos requeridos del estudiante donde se valida la información mencionada.
        </p>

        <p style={{ textAlign: 'right', marginTop: '30px' }}>
          Campanario, {dateComp.dia} de {dateComp.mes} de {dateComp.anio}.
        </p>
      </div>

      {/* Firmas Autorizadas */}
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '80px' }} className="avoid-break">
        <div className="signature-box">
          <strong>{directorNombre}</strong><br />
          Director(a)<br />
          Liceo T.P. Campanario
        </div>
        <div className="signature-box">
          <strong>{coordinadorNombre}</strong><br />
          Coordinador(a) PIE<br />
          Liceo T.P. Campanario
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 2. PLANTILLA: FORMULARIO ÚNICO PIE (FUS / FORMATO MINISTERIAL MINEDUC)
// Normativa: Decreto 170 / 2010.
// =============================================================================
export const FusMineducReport: React.FC<{ data: any; student: any; institution: any }> = ({
  data,
  student,
  institution
}) => {
  const nombreIdentidad = data.nombreIdentidad || student?.full_name || '—';
  const run = data.run || student?.run || '—';
  const nombreSocial = data.nombreSocial || student?.first_name || nombreIdentidad;
  const fechaNacimiento = data.fechaNacimiento || student?.birth_date || '—';
  const edad = data.edad || student?.calculatedAge?.text || '—';
  const cursoNivel = data.cursoNivel || student?.desc_grado || '—';
  const establecimiento = data.establecimiento || institution?.name || 'Liceo Técnico Profesional Campanario Marcos Delucchi Fonck';

  const profNombre = data.profNombre || data.professional_name || '—';
  const profRut = data.profRut || data.professional_run || '—';
  const profRol = data.profRol || data.professional_role || 'Educadora Diferencial';
  const fechaEntrega = data.fechaEntrega || data.evaluation_date || '—';
  const profTelefono = data.profTelefono || '+56 9 8765 4321';
  const profEmail = data.profEmail || 'contacto@liceo.cl';

  const recibeNombre = data.recibeNombre || student?.guardian_name || '—';
  const recibeRut = data.recibeRut || student?.guardian_run || '—';
  const recibeRelacion = data.recibeRelacion || student?.guardian_relation || 'Apoderado Titular';
  const recibeTelefono = data.recibeTelefono || student?.guardian_phone || '—';
  const recibeTitular = data.recibeTitular !== undefined ? data.recibeTitular : true;
  const recibePoder = data.recibePoder || '';
  const presenciaDe = data.presenciaDe || (student?.profesor_jefe ? `${student.profesor_jefe} (Profesor Jefe)` : 'Equipo de Gestión PIE');

  const motivo = data.motivo || 'Evaluación Diagnóstica Integral de Ingreso / Reevaluación PIE';
  const fechaEvaluacion = data.fechaEvaluacion || data.evaluation_date || '—';
  const instrumentos = data.instrumentos || 'Batería Evalúa, Pruebas de Dominio Lector, WISC-V, Pauta de Observación Directa';
  const diagnostico = data.diagnostico || student?.pie_diagnosis || 'Trastorno Específico del Aprendizaje';

  const pedagogicoFortalezas = data.pedagogicoFortalezas || 'Demuestra interés por aprender, buena disposición al trabajo en aula de recursos y entusiasmo en tareas con apoyo visual.';
  const pedagogicoNecesidades = data.pedagogicoNecesidades || 'Requiere apoyo continuo en comprensión lectora, resolución de problemas matemáticos y mediación para estructurar respuestas.';
  const socialFortalezas = data.socialFortalezas || 'Mantiene relaciones afectuosas con sus pares, respeta normas de convivencia y participa activamente en juegos grupales.';
  const socialNecesidades = data.socialNecesidades || 'Fortalecer la autorregulación ante tareas de mayor exigencia y tolerancia a la frustración.';

  const trabajoColaborativo = data.trabajoColaborativo || 'Co-docencia en aula regular 8 horas semanales entre docente de asignatura y educadora diferencial. Apoyo especializado en aula de recursos 2 horas semanales con adecuaciones curriculares DUA.';
  const apoyoHogar = data.apoyoHogar || 'Establecer hábitos de estudio diarios de 20 minutos, reforzar lectura compartida en el hogar, supervisar asistencia y mantener comunicación regular con el equipo PIE.';
  const acuerdos = data.acuerdos || 'Reuniones de seguimiento bimensual entre apoderado y equipo de aula para evaluar avances y reajustar metas pedagógicas.';

  return (
    <div className="print-root print-container" style={{ maxWidth: '850px', margin: '0 auto', fontSize: '9pt' }}>
      {/* Cabecera Mineduc */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
        <img src="/images/logo_mineduc.jpg" alt="Mineduc" style={{ height: '60px', marginRight: '15px' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '8pt', textTransform: 'uppercase' }}>
            Evaluación Diagnóstica Integral de Ingreso a Modalidad de Educación Especial
          </p>
          <h1 style={{ margin: '3px 0 0 0', fontSize: '13pt', fontWeight: 900 }}>
            INFORME PARA LA FAMILIA
          </h1>
        </div>
      </div>

      <div style={{ backgroundColor: '#f1f5f9', padding: '6px 10px', fontSize: '7.5pt', fontStyle: 'italic', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
        Según el Decreto Nº 170/2010, y reconociendo el rol fundamental de la familia en el proceso educativo, se entregan los resultados de la evaluación de su pupilo/a.
      </div>

      {/* I. Identificación Estudiante */}
      <div className="section-title fus">I. IDENTIFICACIÓN DEL ESTUDIANTE</div>
      <div className="grid-table">
        <div className="grid-cell span-2"><span className="cell-label">Nombre de Identidad</span><span className="cell-value">{nombreIdentidad}</span></div>
        <div className="grid-cell"><span className="cell-label">RUT / IPE</span><span className="cell-value">{run}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Nombre Social</span><span className="cell-value">{nombreSocial}</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha Nacimiento</span><span className="cell-value">{fechaNacimiento}</span></div>
        <div className="grid-cell"><span className="cell-label">Edad</span><span className="cell-value">{edad}</span></div>
        <div className="grid-cell"><span className="cell-label">Curso / Nivel</span><span className="cell-value">{cursoNivel}</span></div>
        <div className="grid-cell"><span className="cell-label">Establecimiento</span><span className="cell-value">{establecimiento}</span></div>
      </div>

      {/* II. Identificación Profesional */}
      <div className="section-title fus">II. IDENTIFICACIÓN DEL PROFESIONAL</div>
      <div className="grid-table">
        <div className="grid-cell span-2"><span className="cell-label">Nombre del Profesional</span><span className="cell-value">{profNombre}</span></div>
        <div className="grid-cell"><span className="cell-label">RUT</span><span className="cell-value">{profRut}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Rol / Cargo</span><span className="cell-value">{profRol}</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha Entrega Informe</span><span className="cell-value">{fechaEntrega}</span></div>
        <div className="grid-cell"><span className="cell-label">Teléfono</span><span className="cell-value">{profTelefono}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">E-mail</span><span className="cell-value">{profEmail}</span></div>
      </div>

      {/* III. Identificación Quien Recibe */}
      <div className="section-title fus">III. IDENTIFICACIÓN DE LA PERSONA QUE RECIBE LA INFORMACIÓN</div>
      <div className="grid-table">
        <div className="grid-cell span-2"><span className="cell-label">Nombre Completo</span><span className="cell-value">{recibeNombre}</span></div>
        <div className="grid-cell"><span className="cell-label">RUT / Pasaporte</span><span className="cell-value">{recibeRut}</span></div>
        <div className="grid-cell"><span className="cell-label">Parentesco / Relación</span><span className="cell-value">{recibeRelacion}</span></div>
        <div className="grid-cell"><span className="cell-label">Teléfono</span><span className="cell-value">{recibeTelefono}</span></div>
        <div className="grid-cell"><span className="cell-label">Condición</span><span className="cell-value">{recibeTitular ? 'Apoderado Titular' : `Apoderado Suplente (Poder: ${recibePoder || 'Registrado'})`}</span></div>
        <div className="grid-cell span-3"><span className="cell-label">En presencia de</span><span className="cell-value">{presenciaDe}</span></div>
      </div>

      {/* IV. Resultados Evaluación */}
      <div className="section-title fus">IV. RESULTADOS DE LA EVALUACIÓN</div>
      <div className="grid-table" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="grid-cell"><span className="cell-label">Motivo de Evaluación</span><span className="cell-value">{motivo}</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha de Evaluación</span><span className="cell-value">{fechaEvaluacion}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Instrumentos Aplicados</span><span className="cell-value">{instrumentos}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Diagnóstico NEE (Sin siglas)</span><span className="cell-value"><strong>{diagnostico}</strong></span></div>
      </div>

      <div className="page-break"></div>

      {/* V. Fortalezas y Necesidades por Ámbitos */}
      <div className="section-title fus">V. FORTALEZAS Y NECESIDADES DE APOYO</div>
      
      <p style={{ fontWeight: 700, margin: '8px 0 4px 0', fontSize: '8.5pt' }}>ÁMBITO PEDAGÓGICO</p>
      <table className="table-bordered">
        <tbody>
          <tr>
            <th style={{ width: '50%' }}>Fortalezas - Logros - Talentos</th>
            <th style={{ width: '50%' }}>Necesidades de Apoyo</th>
          </tr>
          <tr>
            <td style={{ height: '90px', verticalAlign: 'top' }}>{pedagogicoFortalezas}</td>
            <td style={{ height: '90px', verticalAlign: 'top' }}>{pedagogicoNecesidades}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontWeight: 700, margin: '8px 0 4px 0', fontSize: '8.5pt' }}>ÁMBITO SOCIAL / AFECTIVO</p>
      <table className="table-bordered">
        <tbody>
          <tr>
            <th style={{ width: '50%' }}>Fortalezas - Logros - Talentos</th>
            <th style={{ width: '50%' }}>Necesidades de Apoyo</th>
          </tr>
          <tr>
            <td style={{ height: '90px', verticalAlign: 'top' }}>{socialFortalezas}</td>
            <td style={{ height: '90px', verticalAlign: 'top' }}>{socialNecesidades}</td>
          </tr>
        </tbody>
      </table>

      {/* VI. Trabajo Colaborativo y Hogar */}
      <div className="section-title fus">VI. TRABAJO COLABORATIVO Y APOYO EN EL HOGAR</div>
      <table className="table-bordered">
        <tbody>
          <tr><th>Estrategias de Trabajo Colaborativo (Aula común / Aula de recursos)</th></tr>
          <tr><td style={{ height: '65px', verticalAlign: 'top' }}>{trabajoColaborativo}</td></tr>
          <tr><th>Compromisos y Apoyo en el Hogar (Hábitos, asistencia, autonomía)</th></tr>
          <tr><td style={{ height: '65px', verticalAlign: 'top' }}>{apoyoHogar}</td></tr>
          <tr><th>Acuerdos Específicos</th></tr>
          <tr><td style={{ height: '55px', verticalAlign: 'top' }}>{acuerdos}</td></tr>
        </tbody>
      </table>

      {/* VII. Fechas de Evaluación y Firmas */}
      <div className="avoid-break" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
          <div className="signature-box">
            Firma y Timbre<br />
            <strong>Responsable Equipo de Gestión</strong>
          </div>
          <div className="signature-box">
            Firma y RUN<br />
            <strong>Familiar o Representante que Recibe</strong>
          </div>
        </div>
        <p style={{ fontSize: '6.5pt', textAlign: 'center', color: '#64748b', marginTop: '25px', textTransform: 'uppercase' }}>
          Formato Ministerial Oficial para Evaluación de Ingreso y Reevaluación (Fin año 2) - Decreto 170/2010
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// 3. PLANTILLA: INFORME PARA LA FAMILIA (SEMESTRAL PIE)
// =============================================================================
export const FamilyReportSemester: React.FC<{ data: any; student: any; institution: any }> = ({
  data,
  student,
  institution
}) => {
  const semester = data.semester || 1;
  const folio = data.folio || `INF-FAM-${student?.run?.replace(/[^0-9kK]/g, '') || '001'}-2026`;
  const estudianteNombre = student?.full_name || data.estudianteNombre || '—';
  const estudianteRut = student?.run || data.estudianteRut || '—';
  const estudianteCurso = student?.desc_grado || data.estudianteCurso || '—';
  const diagnostico = data.diagnostico || student?.pie_diagnosis || 'NEE en Seguimiento';
  const estudianteEstablecimiento = data.estudianteEstablecimiento || institution?.name || 'Liceo T.P. Campanario';
  const profesionalFechaInforme = data.profesionalFechaInforme || data.profesional_data?.fecha || data.evaluation_date || '—';

  const apoderadoNombre = data.apoderadoNombre || data.apoderado_data?.nombre || student?.guardian_name || 'Apoderado Titular';
  const apoderadoRut = data.apoderadoRut || data.apoderado_data?.rut || student?.guardian_run || '—';
  const apoderadoRelacion = data.apoderadoRelacion || data.apoderado_data?.relacion || student?.guardian_relation || 'Apoderado';
  const profesorJefe = data.profesorJefe || data.profesor_jefe || student?.profesor_jefe || 'Profesor(a) Jefe';
  const profesionalNombre = data.profesionalNombre || data.profesional_data?.nombre || data.professional_name || 'Educadora Diferencial';

  const reportePsicopedagogico = data.reportePsicopedagogico || data.reportes_area?.psicopedagogico || 'El estudiante evidencia avance progresivo en habilidades lectoras y cálculo. Se aplican adaptaciones curriculares DUA en aula común y aula de recursos.';
  const reportePsicologico = data.reportePsicologico || data.reportes_area?.psicologico || 'Buena integración con sus pares. Mantiene motivación escolar y participa con agrado de las actividades mediadas.';
  const reporteFonoaudiologico = data.reporteFonoaudiologico || data.reportes_area?.fonoaudiologico || 'Desarrollo adecuado en comprensión auditiva y expresión verbal, logrando transmitir ideas con claridad.';
  const reporteKinesiologico = data.reporteKinesiologico || data.reportes_area?.kinesiologico || 'Sin observaciones motoras significativas. Participa activamente en actividades de educación física.';
  const reporteTerapiaOcupacional = data.reporteTerapiaOcupacional || data.reportes_area?.terapia_ocupacional || 'Adecuada organización de materiales y autorregulación en tareas escolares.';

  const sugerenciasApoyo = data.sugerenciasApoyo || data.sugerencias_apoyo || 'Fomentar la lectura diaria compartida en casa durante 15 minutos, felicitar sus logros cotidianos, supervisar la agenda escolar y mantener asistencia regular a clases.';

  const firmaUsuarioNombre = data.firmaUsuarioNombre || data.firma_usuario_nombre || data.professional_name || 'Profesional Evaluador';
  const firmaUsuarioCargo = data.firmaUsuarioCargo || data.firma_usuario_cargo || data.professional_role || 'Docente Especialista PIE';

  return (
    <div className="print-root print-container" style={{ maxWidth: '850px', margin: '0 auto', fontSize: '9pt' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '10px', marginBottom: '15px' }}>
        <img src="/images/logo_liceo.png" alt="Logo" style={{ height: '65px' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '13pt', fontWeight: 800, color: '#1e3a8a' }}>INFORME PARA LA FAMILIA - 2026</h1>
          <p style={{ margin: '3px 0 0 0', fontWeight: 600, color: '#475569' }}>{semester}° Semestre</p>
        </div>
        <div style={{ fontSize: '8pt', fontWeight: 'bold', border: '1px solid #1e3a8a', color: '#1e3a8a', padding: '4px 8px' }}>
          FOLIO: {folio}
        </div>
      </div>

      <div className="section-title family">I. ANTECEDENTES DEL ESTUDIANTE</div>
      <div className="grid-table">
        <div className="grid-cell span-2"><span className="cell-label">Nombre del Estudiante</span><span className="cell-value">{estudianteNombre}</span></div>
        <div className="grid-cell"><span className="cell-label">RUN</span><span className="cell-value">{estudianteRut}</span></div>
        <div className="grid-cell"><span className="cell-label">Curso</span><span className="cell-value">{estudianteCurso}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Diagnóstico NEE</span><span className="cell-value">{diagnostico}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Establecimiento</span><span className="cell-value">{estudianteEstablecimiento}</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha Informe</span><span className="cell-value">{profesionalFechaInforme}</span></div>
      </div>

      <div className="section-title family">II. IDENTIFICACIÓN DEL APODERADO Y EQUIPO DE AULA</div>
      <div className="grid-table">
        <div className="grid-cell span-2"><span className="cell-label">Nombre Apoderado</span><span className="cell-value">{apoderadoNombre}</span></div>
        <div className="grid-cell"><span className="cell-label">RUT / Parentesco</span><span className="cell-value">{apoderadoRut} ({apoderadoRelacion})</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Profesor(a) Jefe</span><span className="cell-value">{profesorJefe}</span></div>
        <div className="grid-cell"><span className="cell-label">Docente Especialista</span><span className="cell-value">{profesionalNombre}</span></div>
      </div>

      <div className="section-title family">III. REPORTE DE ÁREAS DE APOYO</div>
      <table className="table-bordered">
        <tbody>
          <tr><th style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}>ÁREA PSICOPEDAGÓGICA / EDUCACIÓN DIFERENCIAL</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{reportePsicopedagogico}</td></tr>
          <tr><th style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}>ÁREA PSICOLÓGICA</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{reportePsicologico}</td></tr>
          <tr><th style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}>ÁREA FONOAUDIOLÓGICA</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{reporteFonoaudiologico}</td></tr>
          <tr><th style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}>ÁREA KINESIOLÓGICA</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{reporteKinesiologico}</td></tr>
          <tr><th style={{ backgroundColor: '#eff6ff', color: '#1e3a8a' }}>ÁREA TERAPIA OCUPACIONAL</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{reporteTerapiaOcupacional}</td></tr>
        </tbody>
      </table>

      <div className="avoid-break">
        <div className="section-title family">IV. SUGERENCIAS DE APOYO EN EL HOGAR</div>
        <div style={{ border: '1px solid #000', padding: '10px', minHeight: '80px', marginBottom: '25px', fontSize: '9pt', lineHeight: 1.5 }}>
          {sugerenciasApoyo}
        </div>

        {/* Firmas */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
          <div className="signature-box">
            <strong>{firmaUsuarioNombre}</strong><br />
            {firmaUsuarioCargo}
          </div>
          <div className="signature-box">
            <strong>{apoderadoNombre}</strong><br />
            RUT: {apoderadoRut}<br />
            Firma Apoderado
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 4. PLANTILLA: PLAN DE MANEJO INDIVIDUAL (PAEC / PLAN TEA)
// =============================================================================
export const PaecPlanTea: React.FC<{ data: any; student: any; institution: any }> = ({
  data,
  student,
  institution
}) => {
  let parsedPerfil: any = {};
  if (data.perfil_data) {
    try {
      parsedPerfil = typeof data.perfil_data === 'string' ? JSON.parse(data.perfil_data) : data.perfil_data;
    } catch (_) { parsedPerfil = {}; }
  }
  let parsedMatriz: any = null;
  if (data.matriz_crisis) {
    try {
      parsedMatriz = typeof data.matriz_crisis === 'string' ? JSON.parse(data.matriz_crisis) : data.matriz_crisis;
    } catch (_) { parsedMatriz = null; }
  }
  const merged = { ...parsedPerfil, ...data };

  const folio = merged.folio || `PAEC-${student?.run?.replace(/[^0-9kK]/g, '') || '001'}-2026`;
  const fechaElaboracion = merged.fechaElaboracion || merged.fecha_elaboracion || merged.evaluation_date || '—';
  const estudianteCurso = student?.desc_grado || merged.estudianteCurso || '—';
  const estudianteNombre = student?.full_name || merged.estudianteNombre || '—';
  const estudianteRut = student?.run || merged.estudianteRut || '—';
  const estudianteNombreSocial = merged.estudianteNombreSocial || student?.first_name || estudianteNombre;
  const estudianteFechaNac = merged.estudianteFechaNac || student?.birth_date || '—';
  const estudianteEdad = merged.estudianteEdad || student?.calculatedAge?.years || student?.edad || '—';
  const neet = merged.neet || false;
  const neep = merged.neep !== undefined ? merged.neep : true;
  const diagnostico = merged.diagnostico || student?.pie_diagnosis || 'Trastorno del Espectro Autista (TEA)';
  const profesorJefe = merged.profesorJefe || student?.profesor_jefe || '—';

  const apoderadoPref = merged.apoderadoPreferente || {
    nombres: student?.guardian_name || 'Apoderado Preferente',
    paterno: '',
    materno: '',
    parentesco: student?.guardian_relation || 'Madre',
    run: student?.guardian_run || '—',
    celular: student?.guardian_phone || '—',
    correo: student?.guardian_email || '—'
  };

  const apoderadoAlt = merged.apoderadoAlternativo || {
    nombres: 'Contacto de Respaldo',
    celular: '—'
  };

  const responsablesPaec = merged.responsablesPaec || {
    encargado: {
      nombre: merged.encargadoNombre || data.professional_name || 'Scarlette Burgos Sandoval',
      cargo: merged.encargadoCargo || data.professional_role || 'Educadora Diferencial PIE',
      telefono: merged.encargadoTelefono || '+56 9 8765 4321',
      correo: merged.encargadoCorreo || 'pie@liceo.cl'
    },
    acompananteInterno: {
      nombre: merged.acompananteInternoNombre || student?.profesor_jefe || 'Profesor(a) de Aula Regular',
      cargo: merged.acompananteInternoCargo || 'Acompañante de Aula Regular',
      telefono: merged.acompananteInternoTelefono || '—'
    },
    acompananteExterno: {
      nombre: merged.acompananteExternoNombre || 'Especialista Externo de Red de Salud',
      institucion: merged.acompananteExternoInstitucion || 'Centro de Salud Familiar / Terapeuta Particular',
      telefono: merged.acompananteExternoTelefono || '—'
    }
  };

  const indicacionesVulnerabilidad = merged.indicacionesVulnerabilidad || 'Sensibilidad al ruido ambiente imprevisto y cambios de rutina sin anticipación previa.';
  const indMedicas = merged.indicacionesMedicas || { posee: 'no', detalle: '' };
  const medicamentos = merged.medicamentos || { ingiere: 'no', detalle: '' };
  const fortalezasDesafios = merged.fortalezasDesafios || 'Fortaleza en memoria fotográfica y atención al detalle. Desafío en flexibilización y contacto visual sostenido.';
  const gatilladores = merged.gatilladores || 'Ruidos estridentes o imprevistos (timbre, taladro), aglomeraciones y cambios bruscos de actividad.';
  const intereses = merged.intereses || 'Dibujo técnico, astronomía, lectura de cómics, armado de figuras legos.';
  const estimulos = merged.estimulos || 'Sensibilidad auditiva ante tonos altos; agrado por texturas lisas y música instrumental suave.';
  const objetosInteres = merged.objetosInteres || 'Audífonos con cancelación de ruido, pelota antiestrés, cuaderno de dibujo.';
  const palabrasClave = merged.palabrasClave || 'Vamos a respirar juntos; Tómate un momento; ¿Quieres ir al espacio de calma?';

  const matrizCrisis = merged.matrizCrisis || parsedMatriz || {
    inicio: {
      manifestaciones: 'Inquietud motora, balanceo leve, taparse los oídos, desconexión visual.',
      estrategias: 'Anticipación verbal en tono calmo, ofrecer audífonos protectores, validar emoción y reducir estímulos.'
    },
    crecimiento: {
      manifestaciones: 'Aumento del ritmo respiratorio, verbalizaciones repetitivas o negativas, negarse a trabajar.',
      estrategias: 'Disminuir exigencia curricular, trasladar a zona de baja estimulación, evitar preguntas excesivas.'
    },
    explosion: {
      manifestaciones: 'Llanto intenso, crisis de angustia, gritos o conducta disruptiva motora.',
      estrategias: 'Resguardar la seguridad física del estudiante y compañeros. Acompañamiento silencioso sin invadir espacio corporal.'
    },
    recuperacion: {
      manifestaciones: 'Cese del llanto, respiración pausada, fatiga evidente, búsqueda de contención.',
      estrategias: 'Ofrecer agua, permitir descanso en colchoneta o sillón de calma, reincorporación paulatina a actividades placenteras.'
    }
  };

  return (
    <div className="print-root print-container" style={{ maxWidth: '850px', margin: '0 auto', fontSize: '8.5pt' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #7c3aed', paddingBottom: '6px', marginBottom: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '13pt', color: '#5b21b6', textTransform: 'uppercase' }}>PLAN DE ACOMPAÑAMIENTO ESTRATÉGICO (PAEC)</h1>
        <p style={{ margin: '2px 0 0 0', fontSize: '8pt', color: '#475569' }}>Protocolo de Apoyo Individual y Desescalada Conductual - Ley TEA N° 21.545</p>
      </div>

      {/* 1. Identificación */}
      <div className="section-title paec">1. IDENTIFICACIÓN DEL ESTUDIANTE</div>
      <div className="grid-table">
        <div className="grid-cell"><span className="cell-label">N° Folio</span><span className="cell-value">{folio}</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha Elaboración</span><span className="cell-value">{fechaElaboracion}</span></div>
        <div className="grid-cell"><span className="cell-label">Curso</span><span className="cell-value">{estudianteCurso}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Nombre Completo</span><span className="cell-value">{estudianteNombre}</span></div>
        <div className="grid-cell"><span className="cell-label">RUN</span><span className="cell-value">{estudianteRut}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Nombre Social</span><span className="cell-value">{estudianteNombreSocial}</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha Nac. / Edad</span><span className="cell-value">{estudianteFechaNac} ({estudianteEdad} años)</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Diagnóstico</span><span className="cell-value">[{neet ? 'X' : ' '}] NEET &nbsp; [{neep ? 'X' : ' '}] NEEP &nbsp; - <strong>{diagnostico}</strong></span></div>
        <div className="grid-cell"><span className="cell-label">Profesor(a) Jefe</span><span className="cell-value">{profesorJefe}</span></div>
      </div>

      {/* 2. Responsables del Plan (Ley TEA) */}
      <div className="section-title paec">2. RESPONSABLES DEL PLAN DE ACOMPAÑAMIENTO (LEY TEA)</div>
      <table className="table-bordered">
        <thead>
          <tr style={{ backgroundColor: '#f3e8ff', color: '#5b21b6' }}>
            <th style={{ width: '22%' }}>ESTAMENTO / ROL</th>
            <th style={{ width: '32%' }}>NOMBRE COMPLETO</th>
            <th style={{ width: '23%' }}>CARGO / INSTITUCIÓN</th>
            <th style={{ width: '23%' }}>CONTACTO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 700, backgroundColor: '#faf5ff' }}>Encargado(a) del Plan</td>
            <td>{responsablesPaec.encargado?.nombre || '—'}</td>
            <td>{responsablesPaec.encargado?.cargo || 'Educadora Diferencial PIE'}</td>
            <td>{responsablesPaec.encargado?.telefono || '—'} {responsablesPaec.encargado?.correo ? `| ${responsablesPaec.encargado?.correo}` : ''}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700, backgroundColor: '#faf5ff' }}>Acompañante Interno</td>
            <td>{responsablesPaec.acompananteInterno?.nombre || '—'}</td>
            <td>{responsablesPaec.acompananteInterno?.cargo || 'Docente / Asistente'}</td>
            <td>{responsablesPaec.acompananteInterno?.telefono || '—'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700, backgroundColor: '#faf5ff' }}>Acompañante Externo</td>
            <td>{responsablesPaec.acompananteExterno?.nombre || '—'}</td>
            <td>{responsablesPaec.acompananteExterno?.institucion || 'Especialista Red'}</td>
            <td>{responsablesPaec.acompananteExterno?.telefono || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* 3. Apoderados */}
      <div className="section-title paec">3. CONTACTOS DE APODERADOS</div>
      <div className="grid-table">
        <div className="grid-cell span-2">
          <span className="cell-label">Apoderado Preferente</span>
          <span className="cell-value">{apoderadoPref.nombres} {apoderadoPref.paterno || ''} {apoderadoPref.materno || ''}</span>
        </div>
        <div className="grid-cell">
          <span className="cell-label">Parentesco / RUN</span>
          <span className="cell-value">{apoderadoPref.parentesco} - {apoderadoPref.run}</span>
        </div>
        <div className="grid-cell span-2">
          <span className="cell-label">Teléfono / Correo</span>
          <span className="cell-value">{apoderadoPref.celular} | {apoderadoPref.correo}</span>
        </div>
        <div className="grid-cell">
          <span className="cell-label">Alternativo</span>
          <span className="cell-value">{apoderadoAlt.nombres} ({apoderadoAlt.celular})</span>
        </div>
      </div>

      {/* 4. Perfil y Gatillantes */}
      <div className="section-title paec">4. PERFIL SENSORIAL, VULNERABILIDAD Y ESTRATEGIA PREVENTIVA</div>
      <table className="table-bordered">
        <tbody>
          <tr><th style={{ width: '30%' }}>Indicaciones Vulnerabilidad</th><td>{indicacionesVulnerabilidad}</td></tr>
          <tr><th>Indicaciones Médicas</th><td>{indMedicas.posee === 'si' ? indMedicas.detalle : 'No presenta'}</td></tr>
          <tr><th>Medicamentos</th><td>{medicamentos.ingiere === 'si' ? medicamentos.detalle : 'No consume'}</td></tr>
          <tr><th>Fortalezas y Desafíos</th><td>{fortalezasDesafios}</td></tr>
          <tr><th>Gatilladores / Estresores</th><td><strong>{gatilladores}</strong></td></tr>
          <tr><th>Intereses y Disfrute</th><td>{intereses}</td></tr>
          <tr><th>Estímulos Sensoriales</th><td>{estimulos}</td></tr>
          <tr><th>Objetos de Enfoque / Calma</th><td>{objetosInteres}</td></tr>
          <tr><th>Palabras y Frases Clave</th><td>{palabrasClave}</td></tr>
        </tbody>
      </table>

      <div className="page-break"></div>

      {/* 5. Matriz de Crisis */}
      <div className="section-title paec">5. MATRIZ DE CRISIS Y DESESCALADA CONDUCTUAL</div>
      <table className="table-bordered">
        <thead>
          <tr style={{ backgroundColor: '#f3e8ff' }}>
            <th style={{ width: '15%', textAlign: 'center' }}>FASE</th>
            <th style={{ width: '42%' }}>MANIFESTACIONES OBSERVABLES</th>
            <th style={{ width: '43%' }}>ESTRATEGIAS DE ACCIÓN Y CONTENCIÓN</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 800, background: '#faf5ff', textAlign: 'center' }}>1. INICIO</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.inicio.manifestaciones}</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.inicio.estrategias}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 800, background: '#f3e8ff', textAlign: 'center' }}>2. CRECIMIENTO</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.crecimiento.manifestaciones}</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.crecimiento.estrategias}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 800, background: '#ede9fe', textAlign: 'center' }}>3. EXPLOSIÓN</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.explosion.manifestaciones}</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.explosion.estrategias}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 800, background: '#f5f3ff', textAlign: 'center' }}>4. RECUPERACIÓN</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.recuperacion.manifestaciones}</td>
            <td style={{ verticalAlign: 'top' }}>{matrizCrisis.recuperacion.estrategias}</td>
          </tr>
        </tbody>
      </table>

      {/* Firmas */}
      <div className="avoid-break" style={{ marginTop: '50px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div className="signature-box">
            Nombre, Firma y Timbre<br />
            <strong>Profesional Responsable</strong>
          </div>
          <div className="signature-box">
            Nombre y Firma<br />
            <strong>Apoderado / Tutor</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 5. PLANTILLA: INFORME DE EVALUACIÓN PSICOPEDAGÓGICA (DECRETO 170)
// Incluye el texto literal y oficial de los 10 indicadores de observación pedagógica
// y los 10 indicadores de observación social.
// =============================================================================
export const PsychopedagogicalReport: React.FC<{ data: any; student: any; institution: any }> = ({
  data,
  student,
  institution
}) => {
  const estudianteNombre = student?.full_name || data.estudianteNombre || '—';
  const estudianteRut = student?.run || data.estudianteRut || '—';
  const estudianteCurso = student?.desc_grado || data.estudianteCurso || '—';
  const estudianteFechaNac = data.estudianteFechaNac || student?.birth_date || '—';
  const estudianteEdad = data.estudianteEdad || student?.calculatedAge?.years || student?.edad || '—';
  const fechaEvaluacion = data.fechaEvaluacion || data.evaluation_date || '—';
  const diagnostico = data.diagnostico || student?.pie_diagnosis || 'Trastorno Específico del Aprendizaje';
  const motivoEvaluacion = data.motivoEvaluacion || 'Reevaluación de procesos de aprendizaje e ingreso Decreto 170 / 2010';
  const instrumentosAplicados = data.instrumentosAplicados || 'Batería Psicopedagógica Evalúa, Pruebas de Dominio Lector, Pauta de Observación Pedagógica';
  const antecedentesEscolares = data.antecedentesEscolares || 'Estudiante ingresa al establecimiento con historial de apoyo en Programa de Integración Escolar.';

  const analisisCognitivo = data.analisisCognitivo || 'Presenta atención selectiva adecuada en actividades de su interés. En razonamiento lógico y memoria de trabajo se beneficia significativamente de esquemas visuales y mediación guiada.';
  const analisisSocioemocional = data.analisisSocioemocional || 'Mantiene relaciones afectuosas con sus pares y equipo de aula. Manifiesta disposición positiva hacia las tareas cuando se desglosan en metas progresivas.';
  const analisisMotor = data.analisisMotor || 'Adecuada coordinación motriz fina y gruesa. No presenta dificultades sensoriales ni limitaciones motoras en su desplazamiento o escritura.';

  const sintesisCognitivo = data.sintesisCognitivo || 'Habilidades cognitivas en rango esperado con apoyo en velocidad de procesamiento.';
  const sintesisSocioemocional = data.sintesisSocioemocional || 'Buen ajuste socioescolar y capacidad de trabajo en equipo.';
  const sintesisMotor = data.sintesisMotor || 'Desarrollo psicomotor acorde a su etapa etaria.';
  const sintesisConclusion = data.sintesisConclusion || `El estudiante cumple con los criterios de ${diagnostico} según el Decreto Supremo Nº 170/2010, requiriendo continuidad de apoyos especializados.`;

  const sugerenciasEstablecimiento = data.sugerenciasEstablecimiento || 'Garantizar el acceso a recursos adaptados y monitoreo periódico de asistencia escolar.';
  const sugerenciasEquipoAula = data.sugerenciasEquipoAula || 'Diversificar estrategias evaluativas (DUA), conceder tiempo extra y reforzar logros.';
  const sugerenciasEstudiante = data.sugerenciasEstudiante || 'Expresar oportunamente sus dudas y participar con entusiasmo en aula de recursos.';
  const sugerenciasFamilia = data.sugerenciasFamilia || 'Acompañar y supervisar rutinas diarias de estudio, manteniendo comunicación con el equipo PIE.';

  const pautaPedagogica = data.pautaPedagogica || { '0': '2', '1': '2', '2': '2', '3': '2', '4': '2', '5': '2', '6': '2', '7': '2', '8': '2', '9': '2' };
  const pautaSocial = data.pautaSocial || { '0': '2', '1': '2', '2': '2', '3': '2', '4': '2', '5': '2', '6': '2', '7': '2', '8': '2', '9': '2' };

  const profesionalNombre = data.profesionalNombre || data.professional_name || 'Educadora Diferencial';
  const profesionalProfesion = data.profesionalProfesion || data.professional_role || 'Profesora de Educación Diferencial';
  const profesionalRegistro = data.profesionalRegistro || data.professional_reg || '123456';
  const docenteNombre = data.docenteNombre || student?.profesor_jefe || 'Docente de Aula';
  const docenteProfesion = data.docenteProfesion || 'Profesor(a) de Educación Regular';
  const docenteRut = data.docenteRut || '';

  return (
    <div className="print-root print-container" style={{ maxWidth: '850px', margin: '0 auto', fontSize: '8.5pt' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #0f766e', paddingBottom: '8px', marginBottom: '12px' }}>
        <p style={{ margin: 0, fontSize: '7.5pt', fontWeight: 800, color: '#0f766e' }}>DECRETO 170 / 2010 - MINEDUC</p>
        <h1 style={{ margin: '3px 0 0 0', fontSize: '13pt', fontWeight: 900, color: '#0f766e' }}>INFORME DE EVALUACIÓN PSICOPEDAGÓGICA INTEGRAL</h1>
        <p style={{ margin: '2px 0 0 0', fontSize: '8pt', fontStyle: 'italic', color: '#475569' }}>Detección y Valoración de Necesidades Educativas Especiales</p>
      </div>

      <div className="section-title psycho">I. IDENTIFICACIÓN Y MOTIVO</div>
      <div className="grid-table">
        <div className="grid-cell span-2"><span className="cell-label">Estudiante</span><span className="cell-value">{estudianteNombre}</span></div>
        <div className="grid-cell"><span className="cell-label">RUN</span><span className="cell-value">{estudianteRut}</span></div>
        <div className="grid-cell"><span className="cell-label">Curso</span><span className="cell-value">{estudianteCurso}</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha Nac. / Edad</span><span className="cell-value">{estudianteFechaNac} ({estudianteEdad} años)</span></div>
        <div className="grid-cell"><span className="cell-label">Fecha Evaluación</span><span className="cell-value">{fechaEvaluacion}</span></div>
        <div className="grid-cell span-2"><span className="cell-label">Diagnóstico NEE</span><span className="cell-value"><strong>{diagnostico}</strong></span></div>
        <div className="grid-cell"><span className="cell-label">Motivo</span><span className="cell-value">{String(motivoEvaluacion).toUpperCase()}</span></div>
        <div className="grid-cell span-3"><span className="cell-label">Instrumentos Aplicados</span><span className="cell-value">{instrumentosAplicados}</span></div>
        <div className="grid-cell span-3"><span className="cell-label">Antecedentes de Historia Escolar</span><span className="cell-value">{antecedentesEscolares}</span></div>
      </div>

      <div className="section-title psycho">II. ANÁLISIS CUALITATIVO Y CUANTITATIVO POR DIMENSIÓN</div>
      <table className="table-bordered">
        <tbody>
          <tr><th style={{ backgroundColor: '#f0fdfa', color: '#0f766e' }}>a) Habilidades Cognitivas y Comunicativas (Atención, memoria, funciones ejecutivas, razonamiento)</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{analisisCognitivo}</td></tr>
          <tr><th style={{ backgroundColor: '#f0fdfa', color: '#0f766e' }}>b) Habilidades Personales, Socioemocionales y de Aproximación al Aprendizaje</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{analisisSocioemocional}</td></tr>
          <tr><th style={{ backgroundColor: '#f0fdfa', color: '#0f766e' }}>c) Habilidades Motoras, de Autonomía y Sensoriales</th></tr>
          <tr><td style={{ minHeight: '75px', verticalAlign: 'top' }}>{analisisMotor}</td></tr>
        </tbody>
      </table>

      <div className="page-break"></div>

      <div className="section-title psycho">III. SÍNTESIS DIAGNÓSTICA Y CONCLUSIÓN</div>
      <table className="table-bordered">
        <tbody>
          <tr><th style={{ width: '30%', backgroundColor: '#f0fdfa' }}>Síntesis Cognitiva/Comunicativa</th><td>{sintesisCognitivo}</td></tr>
          <tr><th style={{ backgroundColor: '#f0fdfa' }}>Síntesis Socioemocional</th><td>{sintesisSocioemocional}</td></tr>
          <tr><th style={{ backgroundColor: '#f0fdfa' }}>Síntesis Motora/Sensorial</th><td>{sintesisMotor}</td></tr>
          <tr style={{ backgroundColor: '#f8fafc' }}><th style={{ backgroundColor: '#f0fdfa' }}>Conclusión Pedagógica</th><td><strong>{sintesisConclusion}</strong></td></tr>
        </tbody>
      </table>

      <div className="section-title psycho">IV. SUGERENCIAS Y ORIENTACIONES</div>
      <table className="table-bordered">
        <tbody>
          <tr><th style={{ width: '25%', backgroundColor: '#f0fdfa' }}>Al Establecimiento</th><td>{sugerenciasEstablecimiento}</td></tr>
          <tr><th style={{ backgroundColor: '#f0fdfa' }}>Al Equipo de Aula</th><td>{sugerenciasEquipoAula}</td></tr>
          <tr><th style={{ backgroundColor: '#f0fdfa' }}>Al Estudiante</th><td>{sugerenciasEstudiante}</td></tr>
          <tr><th style={{ backgroundColor: '#f0fdfa' }}>A la Familia</th><td>{sugerenciasFamilia}</td></tr>
        </tbody>
      </table>

      <div className="page-break"></div>

      {/* V. Pautas de Observación (20 Indicadores Literales Oficiales) */}
      <div className="section-title psycho">V. PAUTA DE OBSERVACIÓN PEDAGÓGICA (CONTEXTO ESCOLAR)</div>
      <div style={{ fontSize: '7pt', marginBottom: '6px' }}>Escala: <strong>1:</strong> En inicio | <strong>2:</strong> En desarrollo | <strong>3:</strong> Logrado | <strong>N/O:</strong> No observado</div>
      
      <table className="table-bordered">
        <thead>
          <tr style={{ backgroundColor: '#f0fdfa', color: '#0f766e' }}>
            <th style={{ width: '80%' }}>Indicador Pedagógico</th>
            <th style={{ textAlign: 'center', width: '5%' }}>1</th>
            <th style={{ textAlign: 'center', width: '5%' }}>2</th>
            <th style={{ textAlign: 'center', width: '5%' }}>3</th>
            <th style={{ textAlign: 'center', width: '5%' }}>N/O</th>
          </tr>
        </thead>
        <tbody>
          {PAUTA_PEDAGOGICA_INDICADORES.map((indicador, idx) => {
            const val = pautaPedagogica[String(idx)] || '';
            return (
              <tr key={idx}>
                <td>{indicador}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === '1' ? 'X' : ''}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === '2' ? 'X' : ''}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === '3' ? 'X' : ''}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === 'N/O' ? 'X' : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="section-title psycho">VI. PAUTA ANTECEDENTES SOCIALES Y COMUNICATIVOS</div>
      <table className="table-bordered">
        <thead>
          <tr>
            <th style={{ width: '80%' }}>Indicador Social / Comunicativo</th>
            <th style={{ textAlign: 'center', width: '5%' }}>1</th>
            <th style={{ textAlign: 'center', width: '5%' }}>2</th>
            <th style={{ textAlign: 'center', width: '5%' }}>3</th>
            <th style={{ textAlign: 'center', width: '5%' }}>N/O</th>
          </tr>
        </thead>
        <tbody>
          {PAUTA_SOCIAL_INDICADORES.map((indicador, idx) => {
            const val = pautaSocial[String(idx)] || '';
            return (
              <tr key={idx}>
                <td>{indicador}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === '1' ? 'X' : ''}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === '2' ? 'X' : ''}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === '3' ? 'X' : ''}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{val === 'N/O' ? 'X' : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Firmas del Informe Psicopedagógico */}
      <div className="avoid-break" style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div className="signature-box">
            <strong>{profesionalNombre}</strong><br />
            {profesionalProfesion}<br />
            Reg. Mineduc: {profesionalRegistro}<br />
            Firma y Timbre
          </div>
          <div className="signature-box">
            <strong>{docenteNombre}</strong><br />
            {docenteProfesion}<br />
            {docenteRut ? `RUT: ${docenteRut}` : 'RUT: —'}<br />
            Firma Docente de Aula
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 6. PLANTILLA OFICIAL 100%: FORMULARIO ÚNICO SÍNTESIS DE REVALUACIÓN MINEDUC
// Formato original e idéntico de 4 páginas oficiales (Decreto Supremo Nº 170/2009)
// Utilizado para TEL, DEA, FIL, TEA, TDA, Discapacidad Intelectual y Sensorial
// =============================================================================
export const OfficialFuReevaluacionMineduc: React.FC<{
  data: any;
  student: any;
  institution: any;
  reportTypeObj?: any;
}> = ({ data, student, institution, reportTypeObj }) => {
  const cleanTitle = (reportTypeObj?.title || data.diagnostico || 'TRASTORNO ESPECÍFICO DEL LENGUAJE (TEL)').toUpperCase();
  const run = student?.run || data.student_run || '—';
  const fullName = student?.full_name || data.estudianteNombre || '—';
  const birthDate = formatChileDate(student?.birth_date || data.estudianteFechaNac);
  const age = student?.calculatedAge?.text || data.estudianteEdad || '—';
  const grade = student?.desc_grado || data.estudianteCurso || '—';
  const establishment = institution?.name || data.establecimiento || 'Liceo Técnico Profesional Campanario';
  const director = institution?.director || data.directorNombre || 'Víctor Ojeda Ojeda';
  const rbd = institution?.rbd || '3941-1';

  const profResponsable = data.professional_name || data.profesionalNombre || 'Scarlette Burgos Sandoval';
  const profRut = data.professional_run || data.profesionalRut || '17.892.456-8';
  const profRole = data.professional_role || data.profesionalProfesion || 'Educadora Diferencial PIE';
  const profReg = data.professional_reg || data.profesionalRegistro || 'Reg. Especial MINEDUC Nº 89412';
  const profPhone = data.professional_phone || '+56 9 8765 4321';
  const profEmail = data.professional_email || 'pie@liceo.cl';
  const evalDate = formatChileDate(data.evaluation_date || new Date().toISOString().split('T')[0]);

  const sintesis = data.sintesis || {};
  const avances = data.avances || {};
  const isContinuidad = (sintesis.decision_pie || 'CONTINUIDAD') === 'CONTINUIDAD';
  const isEgreso = (sintesis.decision_pie || '') === 'EGRESO';

  const headerMinisterial = (pageNumber: number, showRun: boolean = false) => (
    <div style={{ marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '3px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '7.5pt', color: '#1e293b' }}>
            Evaluación Diagnóstica Integral de Necesidades Educativas Especiales (Decreto Supremo 170/09)
          </div>
          <div style={{ fontSize: '9pt', fontWeight: 900, textTransform: 'uppercase', margin: '2px 0' }}>
            FORMULARIO ÚNICO SÍNTESIS REVALUACIÓN – {cleanTitle}
          </div>
          <div style={{ fontSize: '6.5pt', fontWeight: 700, color: '#334155', letterSpacing: '0.2px' }}>
            LOS DATOS CONTENIDOS EN ESTE DOCUMENTO SON CONFIDENCIALES, SU DIVULGACIÓN O USO INDEBIDO ES PENADA POR LA LEY
          </div>
        </div>
        <div style={{ width: '30px', textAlign: 'right', fontSize: '11pt', fontWeight: 900 }}>
          {pageNumber}
        </div>
      </div>
      {showRun && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '8pt', fontWeight: 700, marginTop: '2px' }}>
          RUN estudiante: <span style={{ textDecoration: 'underline', marginLeft: '5px' }}>{run}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="print-root print-container" style={{
      maxWidth: '850px',
      margin: '0 auto',
      fontSize: '8pt',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: '#000000',
      lineHeight: 1.3
    }}>
      {/* =====================================================================
          PÁGINA 1: SÍNTESIS GENERAL DE REVALUACIÓN
          ===================================================================== */}
      <div style={{ minHeight: '980px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {headerMinisterial(1, false)}

          <div style={{ fontSize: '7.5pt', fontStyle: 'italic', margin: '6px 0 10px 0', textAlign: 'justify', lineHeight: 1.35 }}>
            La evaluación de la efectividad de la respuesta educativa implementada para el/la estudiante debe ser realizada colaborativamente por el equipo de profesionales. Este formulario, debe considerar la información del progreso del alumno/a recogida en el proceso de REVALUACIÓN.
          </div>

          <div style={{ fontWeight: 900, fontSize: '9pt', margin: '6px 0 4px 0', textTransform: 'uppercase' }}>
            I &nbsp; SÍNTESIS GENERAL DE REVALUACIÓN
          </div>

          <div style={{ fontWeight: 800, fontSize: '8pt', marginBottom: '4px' }}>
            1.- DATOS DE IDENTIFICACIÓN <span style={{ fontWeight: 400, fontSize: '7pt' }}>(Escriba con letra legible o marque con una equis (X) según corresponda)</span>
          </div>

          {/* A) DEL ESTUDIANTE */}
          <div style={{ fontWeight: 800, fontSize: '7.5pt', background: '#f8fafc', padding: '2px 4px', border: '1px solid #000', borderBottom: 'none' }}>
            A) DEL ESTUDIANTE
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td style={{ width: '40%' }}><strong>Nombres y Apellidos:</strong><br />{fullName}</td>
                <td style={{ width: '20%' }}><strong>Fecha nac. (dd/mm/aaaa):</strong><br />{birthDate}</td>
                <td style={{ width: '20%' }}><strong>Edad (en años y meses):</strong><br />{age}</td>
                <td style={{ width: '20%' }}><strong>RUN:</strong><br />{run}</td>
              </tr>
              <tr>
                <td colSpan={2}>
                  Revaluación de proceso o avance educativo: &nbsp; [ &nbsp; ] Escuela Lenguaje &nbsp; <strong>[ X ] PIE</strong><br />
                  Fundamentación de egreso o continuidad: &nbsp; [ &nbsp; ] Escuela Lenguaje &nbsp; <strong>[ X ] PIE</strong>
                </td>
                <td colSpan={2}>
                  Participación en PIE desde: <strong>2024</strong><br />
                  Año actual: <strong>2026</strong> &nbsp; Curso actual: <strong>{grade}</strong>
                </td>
              </tr>
              <tr>
                <td colSpan={2}><strong>Nombre del Establecimiento:</strong><br />{establishment}</td>
                <td><strong>Nombre Director/a:</strong><br />{director}</td>
                <td><strong>RBD:</strong><br />{rbd}</td>
              </tr>
            </tbody>
          </table>

          {/* B) DE LOS PROFESIONALES */}
          <div style={{ fontWeight: 800, fontSize: '7.5pt', background: '#f8fafc', padding: '2px 4px', border: '1px solid #000', borderBottom: 'none' }}>
            B) DE LOS PROFESIONALES
          </div>
          <div style={{ fontSize: '7pt', fontStyle: 'italic', padding: '2px 4px', borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>
            - Profesional responsable del proceso de REVALUACIÓN integral del estudiante.
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '4px' }}>
            <tbody>
              <tr>
                <td style={{ width: '60%' }}><strong>Nombres y Apellidos:</strong> {profResponsable}</td>
                <td style={{ width: '40%' }}><strong>RUN:</strong> {profRut}</td>
              </tr>
              <tr>
                <td><strong>Profesión/ Especialidad:</strong> {profRole}</td>
                <td><strong>Cargo:</strong> {data.professional_role || 'Docente Especialista PIE'}</td>
              </tr>
              <tr>
                <td><strong>Fono contacto:</strong> {profPhone} &nbsp;|&nbsp; <strong>E-mail:</strong> {profEmail}</td>
                <td><strong>Registro profesional:</strong> {profReg}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: '7pt', fontStyle: 'italic', margin: '4px 0 2px 0' }}>
            - Profesional/les que han participado en el proceso de entrega de apoyos al estudiante durante el período que se evalúa (profesores, especialistas, familiares, asistentes, compañeros de curso, el propio estudiante, otros).
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '6px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', fontSize: '7pt' }}>
                <th style={{ width: '35%' }}>Profesionales (Nombre completo)</th>
                <th style={{ width: '30%' }}>Profesión / Especialidad / Cargo</th>
                <th style={{ width: '20%' }}>Fono / E-mail</th>
                <th style={{ width: '15%' }}>Registro profesional</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{profResponsable}</td>
                <td>{profRole}</td>
                <td>{profPhone}</td>
                <td>{profReg}</td>
              </tr>
              <tr>
                <td>{student?.profesor_jefe || data.docenteNombre || 'Docente de Aula'}</td>
                <td>Profesor(a) de Educación Regular / Jefe</td>
                <td>contacto@liceo.cl</td>
                <td>Docente Regular</td>
              </tr>
              <tr>
                <td>Scarlette Burgos Sandoval</td>
                <td>Coordinadora PIE / Educadora Diferencial</td>
                <td>pie@liceo.cl</td>
                <td>Reg. Especial Nº 89412</td>
              </tr>
            </tbody>
          </table>

          {/* 2. SÍNTESIS DE LA REVALUACIÓN DE NEE */}
          <div style={{ fontWeight: 800, fontSize: '8pt', margin: '6px 0 2px 0' }}>
            2. SÍNTESIS DE LA REVALUACIÓN DE NEE
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td style={{ width: '65%' }}>
                  <strong>DIAGNÓSTICO:</strong> Indique el diagnóstico del déficit asociado a NEE, actualmente vigente para el/la estudiante y en base al cual el establecimiento educacional recibe la subvención de educación especial:<br />
                  <div style={{ margin: '4px 0' }}>
                    <strong>[ X ] {cleanTitle}</strong> &nbsp; [{reportTypeObj?.category || 'NEET'}]
                  </div>
                  Fecha emisión diagnóstico actual: <strong>{evalDate}</strong>
                </td>
                <td style={{ width: '35%', verticalAlign: 'top' }}>
                  ¿Existen cambios al diagnóstico de ingreso actualmente vigente?<br /><br />
                  <span style={{ fontSize: '8.5pt' }}>[ &nbsp; ] <strong>SI</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] NO</strong></span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <strong>AVANCES EDUCATIVOS:</strong><br />
                  <span style={{ fontSize: '7.5pt', color: '#334155' }}>Describa los principales progresos del estudiante en su proceso educativo y en la evolución de sus NEE:</span><br />
                  {avances.contexto_escolar || `El estudiante demuestra avance sistemático en los objetivos curriculares priorizados durante el período académico 2026. Con mediación pedagógica diversificada (DUA) logra consolidar aprendizajes base y participar activamente en el aula común.`}
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>¿Se mantienen sus NEE? &nbsp; <strong>[ X ] SI</strong> &nbsp; [ &nbsp; ] NO</div>
                    <div>¿Requiere continuar con apoyos especializados? &nbsp; <strong>[ X ] SI</strong> &nbsp; [ &nbsp; ] NO</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. DOCUMENTOS ADJUNTOS */}
          <div style={{ fontWeight: 800, fontSize: '7.5pt', marginBottom: '2px' }}>
            3. DOCUMENTOS (EVIDENCIAS) DEL PROCESO DE REVALUACIÓN QUE SE ADJUNTAN A ESTE FORMULARIO:
          </div>
          <div style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '7pt', lineHeight: 1.4 }}>
            <strong>[ X ] Anamnesis</strong> &nbsp;&nbsp; <strong>[ X ] Entrevista a la familia</strong> &nbsp;&nbsp; <strong>[ X ] Pauta de Observación</strong> &nbsp;&nbsp; <strong>[ X ] Protocolos de evaluación</strong><br />
            <strong>[ X ] Escolar</strong> &nbsp; <strong>[ X ] Social</strong> &nbsp; <strong>[ X ] Psicológica</strong> &nbsp; <strong>[ X ] Fonoaudiológica</strong> &nbsp; <strong>[ X ] Pedagógica / Psicopedagógica</strong> &nbsp; <strong>[ X ] Evaluación de aprendizaje</strong><br />
            <strong>[ X ] Examen general de salud</strong> &nbsp; [ &nbsp; ] Examen especializado de salud &nbsp; <strong>Otro(s):</strong> Certificado de Calificaciones 2026
          </div>
        </div>
      </div>

      <div className="page-break" style={{ pageBreakAfter: 'always', breakAfter: 'always' }}></div>

      {/* =====================================================================
          PÁGINA 2: REVALUACIÓN PSICOEDUCATIVA Y ESPECIALIZADA
          ===================================================================== */}
      <div style={{ minHeight: '980px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {headerMinisterial(2, true)}

          <div style={{ fontWeight: 900, fontSize: '9pt', margin: '8px 0 4px 0', textTransform: 'uppercase' }}>
            II &nbsp; REVALUACIÓN PSICOEDUCATIVA Y ESPECIALIZADA
          </div>

          <div style={{ fontWeight: 800, fontSize: '8pt', marginBottom: '2px' }}>
            1. AVANCES DEL/LA ESTUDIANTE EN EL CONTEXTO ESCOLAR
          </div>
          <div style={{ fontSize: '7pt', fontStyle: 'italic', marginBottom: '4px' }}>
            - Evolución en su desempeño y participación en los aprendizajes del currículo:
          </div>

          <table className="table-bordered" style={{ marginTop: 0 }}>
            <tbody>
              <tr>
                <th>Describa brevemente los principales aprendizajes curriculares y de desarrollo logrados por el/la estudiante en el período evaluado:</th>
              </tr>
              <tr>
                <td style={{ height: '70px', verticalAlign: 'top' }}>
                  {avances.contexto_escolar || `Progreso favorable en adquisición de vocabulario contextual, comprensión de consignas estructuradas y resolución de operaciones matemáticas iniciales. Asignaturas de mayor progreso: ${avances.asignaturas_mayor_progreso || 'Lenguaje y Comunicación, Matemáticas, Artes Visuales'}.`}
                </td>
              </tr>
              <tr>
                <th>Describa brevemente los aprendizajes curriculares y de desarrollo no logrados o en que mantiene dificultades:</th>
              </tr>
              <tr>
                <td style={{ height: '65px', verticalAlign: 'top' }}>
                  {avances.asignaturas_menor_progreso || `Presenta lentitud en velocidad de procesamiento y comprensión lectora inferencial ante textos extensos sin andamiaje visual. Requiere apoyo continuo en estructuración escrita y organización del tiempo.`}
                </td>
              </tr>
              <tr>
                <th>- Evolución en habilidades para aprender y participar en la sala de clases, y otros espacios (aula, patio, otros):</th>
              </tr>
              <tr>
                <td style={{ height: '60px', verticalAlign: 'top' }}>
                  {avances.habilidades_aprender || `Mantiene adecuada relación con sus pares y respeto por las normas de convivencia. Manifiesta disposición al trabajo en equipo y solicita mediación cuando experimenta dudas en la ejecución de actividades.`}
                </td>
              </tr>
              <tr>
                <th>- Señale aquellos aspectos destacados respecto del curso o nivel y del establecimiento escolar (disminución de barreras):</th>
              </tr>
              <tr>
                <td style={{ height: '55px', verticalAlign: 'top' }}>
                  {avances.disminucion_barreras || `Implementación efectiva de estrategias DUA por el equipo de co-docencia: diversificación de medios de representación (apoyo visual y auditivo), pausas activas y flexibilización en tiempos evaluativos.`}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 800, fontSize: '8pt', margin: '6px 0 2px 0' }}>
            2. AVANCES EN EL CONTEXTO FAMILIAR Y SOCIAL
          </div>
          <table className="table-bordered" style={{ marginTop: 0 }}>
            <tbody>
              <tr>
                <th>Describa aquellos aspectos destacados respecto a la participación de la familia en los progresos del/la estudiante:</th>
              </tr>
              <tr>
                <td style={{ height: '55px', verticalAlign: 'top' }}>
                  {avances.contexto_familiar_social || `La familia (Apoderado: ${student?.guardian_name || 'Apoderado Titular'}) mantiene una comunicación periódica con el equipo PIE y asiste responsablemente a entrevistas de seguimiento y citaciones.`}
                </td>
              </tr>
              <tr>
                <th>Describa aquellos aspectos a los cuales dar énfasis en el trabajo con la familia durante el próximo período:</th>
              </tr>
              <tr>
                <td style={{ height: '55px', verticalAlign: 'top' }}>
                  {avances.enfasis_familia || `Fortalecer hábitos sistemáticos de lectura compartida en el hogar durante 20 minutos diarios, supervisar la agenda escolar y fomentar la autonomía personal en rutinas de estudio.`}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 800, fontSize: '8pt', margin: '6px 0 2px 0' }}>
            3. AVANCES ESPECÍFICOS ({cleanTitle})
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: 0 }}>
            <tbody>
              <tr>
                <th>A) Describa los progresos del/la estudiante en relación a su diagnóstico con los apoyos especializados:</th>
              </tr>
              <tr>
                <td style={{ height: '65px', verticalAlign: 'top' }}>
                  {avances.avances_especificos && Object.values(avances.avances_especificos).length > 0
                    ? Object.entries(avances.avances_especificos).map(([k, v]) => `${k}: ${v}`).join(' | ')
                    : `Evidencia afianzamiento de habilidades adaptativas y comunicativas base. Con mediación especializada en aula de recursos logra superar barreras de acceso curricular y mejorar su autoestima académica.`}
                </td>
              </tr>
              <tr>
                <th>B) Señale aspectos a los cuales dar énfasis durante el próximo periodo académico:</th>
              </tr>
              <tr>
                <td style={{ height: '55px', verticalAlign: 'top' }}>
                  <strong>Nivel Curricular:</strong> Comprensión lectora analítica y resolución de problemas.<br />
                  <strong>Nivel Socioemocional y Adaptativo:</strong> Tolerancia a la frustración y autorregulación en tareas de alta demanda.<br />
                  <strong>Estrategias de Aprendizaje:</strong> Uso de organizadores gráficos y técnicas de estudio autónomo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="page-break" style={{ pageBreakAfter: 'always', breakAfter: 'always' }}></div>

      {/* =====================================================================
          PÁGINA 3: EVALUACIÓN DE LOS APOYOS
          ===================================================================== */}
      <div style={{ minHeight: '980px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {headerMinisterial(3, true)}

          <div style={{ fontWeight: 900, fontSize: '9pt', margin: '8px 0 4px 0', textTransform: 'uppercase' }}>
            III. &nbsp; EVALUACIÓN DE LOS APOYOS
          </div>

          <div style={{ fontSize: '7.5pt', marginBottom: '4px' }}>
            Señale ámbitos generales en los que el/la estudiante requirió apoyos especializados:
          </div>
          <div style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '7pt', lineHeight: 1.4, marginBottom: '6px' }}>
            <strong>[ X ] lenguaje oral</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] curricular general</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] contenidos específicos</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] afectivo social</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] autonomía</strong><br />
            <strong>[ X ] funciones cognitivas</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] funciones ejecutivas</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] comunicación</strong> &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] adaptación social</strong>
          </div>

          <div style={{ fontWeight: 800, fontSize: '7.5pt', marginBottom: '2px' }}>
            1.- Describa la EFECTIVIDAD DE LOS DISTINTOS TIPOS DE APOYOS IMPLEMENTADOS durante el período evaluado:
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '6px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', fontSize: '7pt' }}>
                <th style={{ width: '22%' }}>APOYO ESPECÍFICO</th>
                <th style={{ width: '38%' }}>EFECTIVIDAD DE LA RESPUESTA</th>
                <th style={{ width: '12%', textAlign: 'center' }}>CONTINUIDAD</th>
                <th style={{ width: '28%' }}>OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>PERSONAL</strong></td>
                <td>Co-docencia en aula regular 8 hrs/sem y apoyo especializado en aula de recursos.</td>
                <td style={{ textAlign: 'center' }}><strong>[X] SI</strong> &nbsp; [ ] NO</td>
                <td>Efectividad Alta. Fortalece comprensión de instrucciones.</td>
              </tr>
              <tr>
                <td><strong>CURRICULAR</strong></td>
                <td>Adecuaciones curriculares de acceso DUA: tiempo adicional y evaluaciones diversificadas.</td>
                <td style={{ textAlign: 'center' }}><strong>[X] SI</strong> &nbsp; [ ] NO</td>
                <td>Efectividad Alta. Permite demostrar aprendizajes reales.</td>
              </tr>
              <tr>
                <td><strong>MEDIOS Y RECURSOS MATERIALES</strong></td>
                <td>Uso de esquemas gráficos, material concreto, calculadora y guías estructuradas.</td>
                <td style={{ textAlign: 'center' }}><strong>[X] SI</strong> &nbsp; [ ] NO</td>
                <td>Efectividad Media-Alta. Facilita la retención de conceptos.</td>
              </tr>
              <tr>
                <td><strong>ORGANIZATIVO</strong></td>
                <td>Ubicación cercana al docente y mediación entre pares tutores.</td>
                <td style={{ textAlign: 'center' }}><strong>[X] SI</strong> &nbsp; [ ] NO</td>
                <td>Efectividad Alta. Disminuye la dispersión atencional.</td>
              </tr>
              <tr>
                <td><strong>FAMILIAR</strong></td>
                <td>Entrevistas de seguimiento quincenal y pautas de reforzamiento en el hogar.</td>
                <td style={{ textAlign: 'center' }}><strong>[X] SI</strong> &nbsp; [ ] NO</td>
                <td>Efectividad Alta. Apoderado comprometido con el proceso.</td>
              </tr>
              <tr>
                <td><strong>OTROS APOYOS</strong></td>
                <td>Talleres de habilidades prosociales y orientación vocacional liceana.</td>
                <td style={{ textAlign: 'center' }}><strong>[X] SI</strong> &nbsp; [ ] NO</td>
                <td>Efectividad Media-Alta. Refuerza su proyecto de vida.</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 800, fontSize: '8pt', margin: '6px 0 2px 0' }}>
            2. ESTRATEGIAS
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '6px' }}>
            <tbody>
              <tr>
                <th>Describa brevemente las estrategias de trabajo utilizadas por el equipo de aula y/o por otros profesionales:</th>
              </tr>
              <tr>
                <td style={{ height: '55px', verticalAlign: 'top' }}>
                  {data.estrategias_adecuaciones || `Planificación conjunta semanal entre docente de asignatura y educadora diferencial. Se privilegia el trabajo colaborativo en aula regular, la graduación de exigencias y el refuerzo positivo sistemático.`}
                </td>
              </tr>
              <tr>
                <th>Describa brevemente la efectividad de las estrategias hacia la familia y recomendaciones para período escolar siguiente:</th>
              </tr>
              <tr>
                <td style={{ height: '55px', verticalAlign: 'top' }}>
                  {data.sugerencias_familia || `Comunicación expedita mediante libreta escolar y entrevistas presenciales. Para el próximo período se recomienda mantener canales activos y supervisión diaria en casa.`}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 800, fontSize: '8pt', margin: '6px 0 2px 0' }}>
            3.- COMENTARIOS, OBSERVACIONES Y SUGERENCIAS GENERALES PARA EL PRÓXIMO PERÍODO:
          </div>
          <div style={{ border: '1px solid #000', padding: '6px', minHeight: '65px', fontSize: '7.5pt' }}>
            El/la estudiante es <strong>PROMOVIDO/A</strong> de curso en consideración a sus avances pedagógicos y asistencia regular. Requiere <strong>CONTINUIDAD en el Programa de Integración Escolar (PIE) año 2026</strong> para afianzar competencias curriculares y consolidar su autonomía en el ciclo educativo correspondiente.
          </div>
        </div>
      </div>

      <div className="page-break" style={{ pageBreakAfter: 'always', breakAfter: 'always' }}></div>

      {/* =====================================================================
          PÁGINA 4: REVALUACIÓN DE EGRESO Y/O CONTINUIDAD DEL ESTUDIANTE
          ===================================================================== */}
      <div style={{ minHeight: '980px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {headerMinisterial(4, false)}

          <div style={{ fontWeight: 900, fontSize: '9pt', margin: '8px 0 6px 0', textTransform: 'uppercase' }}>
            IV.- REVALUACIÓN DE EGRESO Y/O CONTINUIDAD DEL ESTUDIANTE &nbsp;&nbsp;&nbsp;&nbsp; <strong>[ X ] EN EL PIE</strong> &nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] EN LA ESCUELA DE LENGUAJE
          </div>

          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td style={{ width: '65%' }}><strong>Nombres y Apellidos del/la estudiante:</strong><br />{fullName}</td>
                <td style={{ width: '35%' }}><strong>RUN:</strong><br />{run}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 800, fontSize: '8pt', marginBottom: '2px' }}>
            PROFESIONAL/LES QUE HAN PARTICIPADO EN EL PROCESO DE REVALUACIÓN DE NEE:
          </div>
          <table className="table-bordered" style={{ marginTop: 0, marginBottom: '8px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', fontSize: '7pt' }}>
                <th style={{ width: '30%' }}>Profesionales (Nombre completo)</th>
                <th style={{ width: '28%' }}>Profesión/ Especialidad/ Cargo</th>
                <th style={{ width: '22%' }}>Fono / E-mail</th>
                <th style={{ width: '20%' }}>Registro profesional</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{profResponsable}</td>
                <td>{profRole}</td>
                <td>{profPhone}</td>
                <td>{profReg}</td>
              </tr>
              <tr>
                <td>{student?.profesor_jefe || data.docenteNombre || 'Docente de Aula'}</td>
                <td>Profesor(a) de Educación Regular</td>
                <td>contacto@liceo.cl</td>
                <td>Docente Regular</td>
              </tr>
              <tr>
                <td>Scarlette Burgos Sandoval</td>
                <td>Coordinadora PIE / Educadora</td>
                <td>pie@liceo.cl</td>
                <td>Reg. Especial Nº 89412</td>
              </tr>
              <tr>
                <td>{data.profesionalPsicologo || 'Equipo de Convivencia y Psicología'}</td>
                <td>Psicólogo(a) Educacional</td>
                <td>psicologia@liceo.cl</td>
                <td>Reg. Ministerial</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontWeight: 800, fontSize: '8pt', marginBottom: '2px' }}>
            EVALUACIÓN DEL DÉFICIT ASOCIADO A LAS NEE:
          </div>
          <div style={{ fontSize: '7pt', fontStyle: 'italic', marginBottom: '2px' }}>
            Registre fecha, resultados, procedimientos, exámenes y pruebas utilizadas (Adjunte evidencias).
          </div>
          <div style={{ border: '1px solid #000', padding: '6px', minHeight: '60px', fontSize: '7.5pt', marginBottom: '8px' }}>
            <strong>Fecha Reevaluación:</strong> {evalDate}<br />
            <strong>Procedimientos e Instrumentos:</strong> Batería Psicopedagógica Evalúa, Pauta de Observación Pedagógica en Aula Regular, Pruebas de Dominio Lector y Revisión de Cuadernos.<br />
            <strong>Resultados Técnicos:</strong> El estudiante presenta desempeño acorde a necesidades educativas especiales que se benefician directamente de adecuaciones de acceso Decreto 83 y acompañamiento continuo de aula de recursos.
          </div>

          <div style={{ fontWeight: 800, fontSize: '8pt', marginBottom: '2px' }}>
            DECISIÓN DEL EQUIPO QUE REVALÚA AÑO ESCOLAR 2026:
          </div>
          <div style={{ fontSize: '7pt', fontStyle: 'italic', marginBottom: '2px' }}>
            Considerando los progresos en el aprendizaje y en la evolución del déficit del estudiante durante el período evaluado (anual) la decisión del equipo es la siguiente:
          </div>
          <div style={{ border: '1px solid #000', padding: '6px', fontSize: '8pt', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div>[ &nbsp; ] El/la estudiante debe egresar del PIE</div>
              <div><strong>[ X ] El/la estudiante debe continuar en el PIE</strong></div>
              <div>Fecha: <strong>{evalDate}</strong></div>
            </div>
            <div style={{ fontSize: '7.5pt', marginTop: '4px' }}>
              <strong>Fundamentos de la decisión:</strong><br />
              {sintesis.fundamentacion_decision || `El/la estudiante requiere la continuidad de los apoyos especializados del Programa de Integración Escolar (PIE) para consolidar sus procesos de aprendizaje y garantizar su trayectoria educativa regular en el establecimiento.`}
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: '8pt', marginBottom: '2px' }}>
            COMENTARIOS, RECOMENDACIONES, OBSERVACIONES:
          </div>
          <div style={{ border: '1px solid #000', padding: '6px', minHeight: '50px', fontSize: '7.5pt', marginBottom: '25px' }}>
            {data.observaciones_generales || `Se recomienda mantener el trabajo coordinado de co-docencia y el monitoreo trimestral de metas curriculares. Se entrega copia informativa al apoderado titular.`}
          </div>
        </div>

        {/* FIRMAS OFICIALES DE CIERRE */}
        <div className="avoid-break" style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
            <div className="signature-box" style={{ width: '200px' }}>
              <strong>{profResponsable}</strong><br />
              {profRole}<br />
              Reg. Mineduc: {profReg}<br />
              Firma Profesional Evaluador
            </div>
            <div className="signature-box" style={{ width: '200px' }}>
              <strong>Scarlette Burgos Sandoval</strong><br />
              Coordinadora PIE<br />
              Liceo T.P. Campanario<br />
              Firma y Timbre
            </div>
            <div className="signature-box" style={{ width: '200px' }}>
              <strong>{director}</strong><br />
              Director(a)<br />
              Liceo T.P. Campanario<br />
              Firma y Timbre Institucional
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
