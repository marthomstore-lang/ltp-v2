import React from 'react';
import { PAUTA_PEDAGOGICA_INDICADORES, PAUTA_SOCIAL_INDICADORES } from './MineducConstants';

// -----------------------------------------------------------------------------
// 1. EDITOR: CERTIFICADO SIMCE NEEP
// -----------------------------------------------------------------------------
export const SimceNeepEditor: React.FC<{
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  student: any;
  institution: any;
}> = ({ formData, setFormData, student, institution }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '1rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0369a1', fontSize: '0.95rem', fontWeight: 800 }}>
          📋 Certificado Oficial SIMCE — Agencia de Calidad de la Educación
        </h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#0c4a6e' }}>
          Este documento certifica legalmente la pertenencia al Programa de Integración Escolar (PIE) con diagnóstico permanente (NEEP) para la acreditación en la Plataforma SIMCE.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            N° de Folio Institucional:
          </label>
          <input
            type="text"
            value={formData.folio || ''}
            onChange={e => setFormData((prev: any) => ({ ...prev, folio: e.target.value }))}
            placeholder="Ej: SIMCE-2026-0042"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Fecha de Emisión del Certificado:
          </label>
          <input
            type="date"
            value={formData.evaluation_date || ''}
            onChange={e => setFormData((prev: any) => ({ ...prev, evaluation_date: e.target.value }))}
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Diagnóstico Oficial de Necesidad Educativa Permanente (NEEP):
          </label>
          <input
            type="text"
            value={formData.diagnostico || student?.pie_diagnosis || ''}
            onChange={e => setFormData((prev: any) => ({ ...prev, diagnostico: e.target.value }))}
            placeholder="Ej: Trastorno del Espectro Autista (TEA) / Discapacidad Intelectual Leve"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Diagnóstico Adicional o Especificación (Opcional):
          </label>
          <input
            type="text"
            value={formData.diagnosticoAdicional || ''}
            onChange={e => setFormData((prev: any) => ({ ...prev, diagnosticoAdicional: e.target.value }))}
            placeholder="Ej: con compromiso severo del lenguaje oral"
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Nombre del Director(a):
          </label>
          <input
            type="text"
            value={formData.directorNombre || institution?.director || ''}
            onChange={e => setFormData((prev: any) => ({ ...prev, directorNombre: e.target.value }))}
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Nombre Coordinador(a) PIE:
          </label>
          <input
            type="text"
            value={formData.coordinadorNombre || formData.professional_name || ''}
            onChange={e => setFormData((prev: any) => ({ ...prev, coordinadorNombre: e.target.value }))}
            style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          />
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 2. EDITOR: FORMULARIO ÚNICO PIE (FUS / DECRETO 170)
// -----------------------------------------------------------------------------
export const FusMineducEditor: React.FC<{
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  student: any;
  institution: any;
}> = ({ formData, setFormData, student, institution }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sección II: Profesional */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          II. Identificación del Profesional Responsable
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Nombre Profesional:</label>
            <input
              type="text"
              value={formData.profNombre || formData.professional_name || ''}
              onChange={e => setFormData((p: any) => ({ ...p, profNombre: e.target.value, professional_name: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>RUT Profesional:</label>
            <input
              type="text"
              value={formData.profRut || formData.professional_run || ''}
              onChange={e => setFormData((p: any) => ({ ...p, profRut: e.target.value, professional_run: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Rol / Cargo:</label>
            <input
              type="text"
              value={formData.profRol || formData.professional_role || ''}
              onChange={e => setFormData((p: any) => ({ ...p, profRol: e.target.value, professional_role: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Fecha Entrega Informe:</label>
            <input
              type="date"
              value={formData.fechaEntrega || formData.evaluation_date || ''}
              onChange={e => setFormData((p: any) => ({ ...p, fechaEntrega: e.target.value, evaluation_date: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Teléfono Profesional:</label>
            <input
              type="text"
              value={formData.profTelefono || ''}
              onChange={e => setFormData((p: any) => ({ ...p, profTelefono: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>E-mail Profesional:</label>
            <input
              type="email"
              value={formData.profEmail || ''}
              onChange={e => setFormData((p: any) => ({ ...p, profEmail: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* Sección III: Quien Recibe */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          III. Identificación de la Persona que Recibe la Información (Familia)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Nombre Completo:</label>
            <input
              type="text"
              value={formData.recibeNombre || student?.guardian_name || ''}
              onChange={e => setFormData((p: any) => ({ ...p, recibeNombre: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>RUT / Pasaporte:</label>
            <input
              type="text"
              value={formData.recibeRut || student?.guardian_run || ''}
              onChange={e => setFormData((p: any) => ({ ...p, recibeRut: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Parentesco / Relación:</label>
            <input
              type="text"
              value={formData.recibeRelacion || student?.guardian_relation || ''}
              onChange={e => setFormData((p: any) => ({ ...p, recibeRelacion: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Teléfono Contacto:</label>
            <input
              type="text"
              value={formData.recibeTelefono || student?.guardian_phone || ''}
              onChange={e => setFormData((p: any) => ({ ...p, recibeTelefono: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.recibeTitular !== false}
                onChange={e => setFormData((p: any) => ({ ...p, recibeTitular: e.target.checked }))}
              />
              Es Apoderado Titular
            </label>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>En Presencia de:</label>
            <input
              type="text"
              value={formData.presenciaDe || (student?.profesor_jefe ? `${student.profesor_jefe} (Profesor Jefe)` : 'Equipo PIE')}
              onChange={e => setFormData((p: any) => ({ ...p, presenciaDe: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* Sección IV: Resultados Evaluación */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          IV. Resultados de la Evaluación Integral
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Motivo de Evaluación:</label>
            <input
              type="text"
              list="mineduc-official-motivos"
              value={formData.motivo || 'Ingreso y Evaluación Diagnóstica Integral PIE'}
              onChange={e => setFormData((p: any) => ({ ...p, motivo: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <datalist id="mineduc-official-motivos">
              <option value="Evaluación Diagnóstica Integral de Ingreso (Decreto 170)" />
              <option value="Reevaluación Diagnóstica Integral (Continuidad PIE)" />
              <option value="Reevaluación Diagnóstica de Egreso" />
              <option value="Reevaluación por Cambio de Diagnóstico" />
            </datalist>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Fecha de Evaluación:</label>
            <input
              type="date"
              value={formData.fechaEvaluacion || formData.evaluation_date || ''}
              onChange={e => setFormData((p: any) => ({ ...p, fechaEvaluacion: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Instrumentos Aplicados:</label>
            <input
              type="text"
              value={formData.instrumentos || 'Batería Evalúa, Pruebas de Dominio Lector, WISC-V, Pauta de Observación Directa'}
              onChange={e => setFormData((p: any) => ({ ...p, instrumentos: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              Diagnóstico NEE (Sin Siglas — Oficial Decreto 170):
            </label>
            <input
              type="text"
              list="mineduc-official-diagnoses"
              value={formData.diagnostico || student?.pie_diagnosis || ''}
              onChange={e => setFormData((p: any) => ({ ...p, diagnostico: e.target.value }))}
              placeholder="Seleccionar o escribir diagnóstico oficial..."
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0f172a' }}
            />
            <datalist id="mineduc-official-diagnoses">
              <option value="Trastorno del Lenguaje" />
              <option value="Trastorno del Espectro Autista" />
              <option value="Dificultades Específicas del Aprendizaje" />
              <option value="Funcionamiento Intelectual Limítrofe" />
              <option value="Discapacidad Intelectual Leve" />
              <option value="Discapacidad Intelectual Moderada" />
              <option value="Trastorno por Déficit de Atención con Hiperactividad" />
              <option value="Hipoacusia / Discapacidad Auditiva" />
              <option value="Discapacidad Motora" />
              <option value="Discapacidad Visual" />
              <option value="Discapacidad Múltiple" />
              <option value="En Evaluación Diagnóstica Integral" />
            </datalist>
          </div>
        </div>
      </div>

      {/* Sección V: Fortalezas y Necesidades por Ámbitos */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          V. Fortalezas y Necesidades de Apoyo
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1' }}>Ámbito Pedagógico — Fortalezas / Logros:</label>
            <textarea
              rows={3}
              value={formData.pedagogicoFortalezas || ''}
              onChange={e => setFormData((p: any) => ({ ...p, pedagogicoFortalezas: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>Ámbito Pedagógico — Necesidades de Apoyo:</label>
            <textarea
              rows={3}
              value={formData.pedagogicoNecesidades || ''}
              onChange={e => setFormData((p: any) => ({ ...p, pedagogicoNecesidades: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1' }}>Ámbito Social/Afectivo — Fortalezas / Logros:</label>
            <textarea
              rows={3}
              value={formData.socialFortalezas || ''}
              onChange={e => setFormData((p: any) => ({ ...p, socialFortalezas: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c' }}>Ámbito Social/Afectivo — Necesidades de Apoyo:</label>
            <textarea
              rows={3}
              value={formData.socialNecesidades || ''}
              onChange={e => setFormData((p: any) => ({ ...p, socialNecesidades: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Sección VI: Trabajo Colaborativo y Compromisos */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          VI. Trabajo Colaborativo y Apoyo en el Hogar
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Estrategias de Trabajo Colaborativo (Aula común / Aula de recursos):</label>
            <textarea
              rows={2}
              value={formData.trabajoColaborativo || ''}
              onChange={e => setFormData((p: any) => ({ ...p, trabajoColaborativo: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Compromisos y Apoyo en el Hogar (Hábitos, asistencia, autonomía):</label>
            <textarea
              rows={2}
              value={formData.apoyoHogar || ''}
              onChange={e => setFormData((p: any) => ({ ...p, apoyoHogar: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Acuerdos Específicos:</label>
            <textarea
              rows={2}
              value={formData.acuerdos || ''}
              onChange={e => setFormData((p: any) => ({ ...p, acuerdos: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 3. EDITOR: INFORME PARA LA FAMILIA (SEMESTRAL PIE)
// -----------------------------------------------------------------------------
export const FamilyReportSemesterEditor: React.FC<{
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  student: any;
  institution: any;
}> = ({ formData, setFormData, student, institution }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Semestre:</label>
          <select
            value={formData.semester || 1}
            onChange={e => setFormData((p: any) => ({ ...p, semester: parseInt(e.target.value, 10) }))}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <option value={1}>1° Semestre</option>
            <option value={2}>2° Semestre</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>N° de Folio:</label>
          <input
            type="text"
            value={formData.folio || ''}
            onChange={e => setFormData((p: any) => ({ ...p, folio: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Docente Especialista:</label>
          <input
            type="text"
            value={formData.profesionalNombre || formData.professional_name || ''}
            onChange={e => setFormData((p: any) => ({ ...p, profesionalNombre: e.target.value, professional_name: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          III. Reporte por Áreas de Apoyo del Equipo Multidisciplinario
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Área Psicopedagógica / Educación Diferencial:</label>
            <textarea
              rows={3}
              placeholder="Redacte los avances y apoyos del área psicopedagógica / educación diferencial..."
              value={formData.reportePsicopedagogico ?? formData.reportes_area?.psicopedagogico ?? ''}
              onChange={e => setFormData((p: any) => ({ ...p, reportePsicopedagogico: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Área Psicológica:</label>
            <textarea
              rows={2}
              placeholder="Redacte los avances y observaciones del área psicológica (o indique NO APLICA)..."
              value={formData.reportePsicologico ?? formData.reportes_area?.psicologico ?? ''}
              onChange={e => setFormData((p: any) => ({ ...p, reportePsicologico: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Área Fonoaudiológica:</label>
            <textarea
              rows={2}
              placeholder="Redacte los avances y observaciones del área fonoaudiológica (o indique NO APLICA)..."
              value={formData.reporteFonoaudiologico ?? formData.reportes_area?.fonoaudiologico ?? ''}
              onChange={e => setFormData((p: any) => ({ ...p, reporteFonoaudiologico: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Área Kinesiológica:</label>
            <textarea
              rows={2}
              placeholder="Redacte los avances y observaciones del área kinesiológica (o indique NO APLICA)..."
              value={formData.reporteKinesiologico ?? formData.reportes_area?.kinesiologico ?? ''}
              onChange={e => setFormData((p: any) => ({ ...p, reporteKinesiologico: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Área Terapia Ocupacional:</label>
            <textarea
              rows={2}
              placeholder="Redacte los avances y observaciones del área de terapia ocupacional (o indique NO APLICA)..."
              value={formData.reporteTerapiaOcupacional ?? formData.reportes_area?.terapia_ocupacional ?? ''}
              onChange={e => setFormData((p: any) => ({ ...p, reporteTerapiaOcupacional: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
          IV. Sugerencias de Apoyo en el Hogar
        </h3>
        <textarea
          rows={3}
          placeholder="Ingrese sugerencias para la familia y el establecimiento..."
          value={formData.sugerenciasApoyo ?? formData.sugerencias_apoyo ?? ''}
          onChange={e => setFormData((p: any) => ({ ...p, sugerenciasApoyo: e.target.value }))}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 4. EDITOR: PLAN DE MANEJO INDIVIDUAL (PAEC / PLAN TEA)
// -----------------------------------------------------------------------------
export const PaecPlanTeaEditor: React.FC<{
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  student: any;
  institution: any;
}> = ({ formData, setFormData, student, institution }) => {
  const apoderadoPref = formData.apoderadoPreferente || {};
  const apoderadoAlt = formData.apoderadoAlternativo || {};
  const matriz = formData.matrizCrisis || {
    inicio: {},
    crecimiento: {},
    explosion: {},
    recuperacion: {}
  };

  const responsables = formData.responsablesPaec || {
    encargado: {
      nombre: formData.professional_name || '',
      cargo: formData.professional_role || 'Educadora Diferencial PIE',
      telefono: '+56 9 8765 4321',
      correo: 'pie@liceo.cl'
    },
    acompananteInterno: {
      nombre: student?.profesor_jefe || '',
      cargo: 'Profesor(a) de Aula Regular',
      telefono: ''
    },
    acompananteExterno: {
      nombre: '',
      institucion: 'Centro de Salud Familiar / Terapeuta Externo',
      telefono: ''
    }
  };

  const updateResponsable = (tipo: string, field: string, val: string) => {
    setFormData((p: any) => {
      const cur = p.responsablesPaec || responsables;
      return {
        ...p,
        responsablesPaec: {
          ...cur,
          [tipo]: {
            ...(cur[tipo] || {}),
            [field]: val
          }
        }
      };
    });
  };

  const updateMatriz = (phase: string, field: string, val: string) => {
    setFormData((p: any) => ({
      ...p,
      matrizCrisis: {
        ...(p.matrizCrisis || {}),
        [phase]: {
          ...((p.matrizCrisis && p.matrizCrisis[phase]) || {}),
          [field]: val
        }
      }
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 2. Responsables del Plan (Ley TEA N° 21.545) */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#6d28d9' }}>
          2. Apartado de Responsables del Plan (Ley TEA N° 21.545 - Circular 586)
        </h3>

        {/* Encargado(a) del Plan */}
        <div style={{ marginBottom: '1rem', padding: '0.85rem', background: '#faf5ff', borderRadius: '8px', border: '1px solid #ede9fe' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, color: '#5b21b6' }}>
            Encargado(a) del Plan de Acompañamiento
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Nombre Completo:</label>
              <input
                type="text"
                value={responsables.encargado?.nombre || ''}
                onChange={e => updateResponsable('encargado', 'nombre', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Cargo / Rol PIE:</label>
              <input
                type="text"
                value={responsables.encargado?.cargo || ''}
                onChange={e => updateResponsable('encargado', 'cargo', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Teléfono Contacto:</label>
              <input
                type="text"
                value={responsables.encargado?.telefono || ''}
                onChange={e => updateResponsable('encargado', 'telefono', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Correo Institucional:</label>
              <input
                type="email"
                value={responsables.encargado?.correo || ''}
                onChange={e => updateResponsable('encargado', 'correo', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* Acompañante Interno y Acompañante Externo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Acompañante Interno */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
              Acompañante Interno (Establecimiento)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Nombre Completo:</label>
                <input
                  type="text"
                  value={responsables.acompananteInterno?.nombre || ''}
                  onChange={e => updateResponsable('acompananteInterno', 'nombre', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Cargo / Función:</label>
                <input
                  type="text"
                  value={responsables.acompananteInterno?.cargo || ''}
                  onChange={e => updateResponsable('acompananteInterno', 'cargo', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Teléfono:</label>
                <input
                  type="text"
                  value={responsables.acompananteInterno?.telefono || ''}
                  onChange={e => updateResponsable('acompananteInterno', 'telefono', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>

          {/* Acompañante Externo */}
          <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
              Acompañante Externo / Especialista Tratante
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Nombre Completo:</label>
                <input
                  type="text"
                  value={responsables.acompananteExterno?.nombre || ''}
                  onChange={e => updateResponsable('acompananteExterno', 'nombre', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Institución / Especialidad:</label>
                <input
                  type="text"
                  value={responsables.acompananteExterno?.institucion || ''}
                  onChange={e => updateResponsable('acompananteExterno', 'institucion', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700 }}>Teléfono Contacto:</label>
                <input
                  type="text"
                  value={responsables.acompananteExterno?.telefono || ''}
                  onChange={e => updateResponsable('acompananteExterno', 'telefono', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contactos Apoderados */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#6d28d9' }}>
          3. Contactos de Apoderados
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Apoderado Preferente (Nombre):</label>
            <input
              type="text"
              value={apoderadoPref.nombres || student?.guardian_name || ''}
              onChange={e => setFormData((p: any) => ({
                ...p,
                apoderadoPreferente: { ...(p.apoderadoPreferente || {}), nombres: e.target.value }
              }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Parentesco / RUN:</label>
            <input
              type="text"
              value={`${apoderadoPref.parentesco || student?.guardian_relation || 'Madre'} - ${apoderadoPref.run || student?.guardian_run || ''}`}
              onChange={e => {
                const parts = e.target.value.split('-');
                setFormData((p: any) => ({
                  ...p,
                  apoderadoPreferente: {
                    ...(p.apoderadoPreferente || {}),
                    parentesco: parts[0]?.trim() || 'Madre',
                    run: parts[1]?.trim() || ''
                  }
                }));
              }}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Celular Preferente:</label>
            <input
              type="text"
              value={apoderadoPref.celular || student?.guardian_phone || ''}
              onChange={e => setFormData((p: any) => ({
                ...p,
                apoderadoPreferente: { ...(p.apoderadoPreferente || {}), celular: e.target.value }
              }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Contacto Alternativo (Nombre y Fono):</label>
            <input
              type="text"
              value={apoderadoAlt.nombres || ''}
              onChange={e => setFormData((p: any) => ({
                ...p,
                apoderadoAlternativo: { ...(p.apoderadoAlternativo || {}), nombres: e.target.value }
              }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* 4. Perfil y Gatillantes */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#6d28d9' }}>
          4. Perfil Sensorial, Vulnerabilidad y Estrategia Preventiva
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Gatilladores / Estresores Principales:</label>
            <input
              type="text"
              value={formData.gatilladores || ''}
              onChange={e => setFormData((p: any) => ({ ...p, gatilladores: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Intereses y Disfrute:</label>
            <input
              type="text"
              value={formData.intereses || ''}
              onChange={e => setFormData((p: any) => ({ ...p, intereses: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Estímulos Sensoriales:</label>
            <input
              type="text"
              value={formData.estimulos || ''}
              onChange={e => setFormData((p: any) => ({ ...p, estimulos: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Objetos de Enfoque / Calma:</label>
            <input
              type="text"
              value={formData.objetosInteres || ''}
              onChange={e => setFormData((p: any) => ({ ...p, objetosInteres: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Palabras y Frases Clave:</label>
            <input
              type="text"
              value={formData.palabrasClave || ''}
              onChange={e => setFormData((p: any) => ({ ...p, palabrasClave: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* 5. Matriz de Crisis en 4 Fases */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#6d28d9' }}>
          5. Matriz de Crisis y Desescalada Conductual (4 Fases Oficiales)
        </h3>
        
        {/* Fase 1 */}
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#faf5ff', borderRadius: '8px', border: '1px solid #ede9fe' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#5b21b6' }}>1. FASE DE INICIO</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Manifestaciones Observables:</label>
              <textarea
                rows={2}
                value={matriz.inicio?.manifestaciones || ''}
                onChange={e => updateMatriz('inicio', 'manifestaciones', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Estrategias de Acción y Contención:</label>
              <textarea
                rows={2}
                value={matriz.inicio?.estrategias || ''}
                onChange={e => updateMatriz('inicio', 'estrategias', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* Fase 2 */}
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f3e8ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#5b21b6' }}>2. FASE DE CRECIMIENTO</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Manifestaciones Observables:</label>
              <textarea
                rows={2}
                value={matriz.crecimiento?.manifestaciones || ''}
                onChange={e => updateMatriz('crecimiento', 'manifestaciones', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Estrategias de Acción y Contención:</label>
              <textarea
                rows={2}
                value={matriz.crecimiento?.estrategias || ''}
                onChange={e => updateMatriz('crecimiento', 'estrategias', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* Fase 3 */}
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ede9fe', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#5b21b6' }}>3. FASE DE EXPLOSIÓN</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Manifestaciones Observables:</label>
              <textarea
                rows={2}
                value={matriz.explosion?.manifestaciones || ''}
                onChange={e => updateMatriz('explosion', 'manifestaciones', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Estrategias de Acción y Contención:</label>
              <textarea
                rows={2}
                value={matriz.explosion?.estrategias || ''}
                onChange={e => updateMatriz('explosion', 'estrategias', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* Fase 4 */}
        <div style={{ padding: '0.75rem', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #ede9fe' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#5b21b6' }}>4. FASE DE RECUPERACIÓN</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Manifestaciones Observables:</label>
              <textarea
                rows={2}
                value={matriz.recuperacion?.manifestaciones || ''}
                onChange={e => updateMatriz('recuperacion', 'manifestaciones', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700 }}>Estrategias de Acción y Contención:</label>
              <textarea
                rows={2}
                value={matriz.recuperacion?.estrategias || ''}
                onChange={e => updateMatriz('recuperacion', 'estrategias', e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 5. EDITOR: INFORME DE EVALUACIÓN PSICOPEDAGÓGICA (DECRETO 170)
// -----------------------------------------------------------------------------
export const PsychopedagogicalReportEditor: React.FC<{
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  student: any;
  institution: any;
}> = ({ formData, setFormData, student, institution }) => {
  const pautaPed = formData.pautaPedagogica || {};
  const pautaSoc = formData.pautaSocial || {};

  const setAllPed = (val: string) => {
    const updated: Record<string, string> = {};
    for (let i = 0; i < 10; i++) updated[String(i)] = val;
    setFormData((p: any) => ({ ...p, pautaPedagogica: updated }));
  };

  const setAllSoc = (val: string) => {
    const updated: Record<string, string> = {};
    for (let i = 0; i < 10; i++) updated[String(i)] = val;
    setFormData((p: any) => ({ ...p, pautaSocial: updated }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* II. Análisis por Dimensión */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f766e' }}>
          II. Análisis Cualitativo y Cuantitativo por Dimensión
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              a) Habilidades Cognitivas y Comunicativas (Atención, memoria, funciones ejecutivas, razonamiento):
            </label>
            <textarea
              rows={3}
              value={formData.analisisCognitivo || ''}
              onChange={e => setFormData((p: any) => ({ ...p, analisisCognitivo: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              b) Habilidades Personales, Socioemocionales y de Aproximación al Aprendizaje:
            </label>
            <textarea
              rows={3}
              value={formData.analisisSocioemocional || ''}
              onChange={e => setFormData((p: any) => ({ ...p, analisisSocioemocional: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
              c) Habilidades Motoras, de Autonomía y Sensoriales:
            </label>
            <textarea
              rows={2}
              value={formData.analisisMotor || ''}
              onChange={e => setFormData((p: any) => ({ ...p, analisisMotor: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* V. Pauta Pedagógica 10 Indicadores */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f766e' }}>
              V. Pauta de Observación Pedagógica (10 Indicadores Oficiales)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Escala Oficial: 1: En inicio | 2: En desarrollo | 3: Logrado | N/O: No observado
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setAllPed('2')}
              style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, color: '#166534' }}
            >
              Marcar Todos: 2 (En desarrollo)
            </button>
            <button
              type="button"
              onClick={() => setAllPed('3')}
              style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, color: '#1e40af' }}
            >
              Marcar Todos: 3 (Logrado)
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Indicador Pedagógico</th>
              {['1', '2', '3', 'N/O'].map(v => (
                <th key={v} style={{ width: '45px', textAlign: 'center', padding: '6px 4px' }}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAUTA_PEDAGOGICA_INDICADORES.map((ind, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px' }}>{ind}</td>
                {['1', '2', '3', 'N/O'].map(val => (
                  <td key={val} style={{ textAlign: 'center', padding: '6px 4px' }}>
                    <input
                      type="radio"
                      name={`ped_${idx}`}
                      checked={pautaPed[String(idx)] === val}
                      onChange={() => setFormData((p: any) => ({
                        ...p,
                        pautaPedagogica: { ...(p.pautaPedagogica || {}), [String(idx)]: val }
                      }))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VI. Pauta Social 10 Indicadores */}
      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f766e' }}>
              VI. Pauta de Antecedentes Sociales y Comunicativos (10 Indicadores Oficiales)
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Escala Oficial: 1: En inicio | 2: En desarrollo | 3: Logrado | N/O: No observado
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setAllSoc('2')}
              style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, color: '#166534' }}
            >
              Marcar Todos: 2 (En desarrollo)
            </button>
            <button
              type="button"
              onClick={() => setAllSoc('3')}
              style={{ padding: '3px 8px', fontSize: '0.72rem', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, color: '#1e40af' }}
            >
              Marcar Todos: 3 (Logrado)
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Indicador Social / Comunicativo</th>
              {['1', '2', '3', 'N/O'].map(v => (
                <th key={v} style={{ width: '45px', textAlign: 'center', padding: '6px 4px' }}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAUTA_SOCIAL_INDICADORES.map((ind, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px' }}>{ind}</td>
                {['1', '2', '3', 'N/O'].map(val => (
                  <td key={val} style={{ textAlign: 'center', padding: '6px 4px' }}>
                    <input
                      type="radio"
                      name={`soc_${idx}`}
                      checked={pautaSoc[String(idx)] === val}
                      onChange={() => setFormData((p: any) => ({
                        ...p,
                        pautaSocial: { ...(p.pautaSocial || {}), [String(idx)]: val }
                      }))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
