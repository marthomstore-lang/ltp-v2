/**
 * Utilidades para generación e impresión de Reportes Oficiales de Llamadas a Apoderados
 * Soporta reporte individual por estudiante y reporte consolidado general con gráficos y registros.
 */

export interface GuardianCallRecord {
  id: string;
  folio?: number;
  student_id?: string;
  student_run?: string;
  student_name: string;
  course_name?: string;
  guardian_name?: string;
  guardian_phone?: string;
  caller_name?: string;
  caller_id?: string;
  call_date: string;
  reason: string;
  status: string;
  notes?: string;
  commitment?: string;
  academic_year?: number;
  period?: string;
  created_at?: string;
}

export interface StudentReportTarget {
  name: string;
  run?: string;
  course?: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface CallsSummaryStats {
  total: number;
  accepted: number;
  rejected: number;
  contactRate: number;
  commitmentsCount: number;
  uniqueStudentsCount: number;
  statusBreakdown: Array<{ label: string; count: number; percentage: number; color: string }>;
  reasonBreakdown: Array<{ reason: string; count: number; percentage: number }>;
}

export const isCallAccepted = (status: string = ''): boolean => {
  const s = status.toLowerCase();
  return s.includes('contest') || s.includes('aceptad') || s.includes('acordado') || s.includes('exitosa');
};

export const isCallRejected = (status: string = ''): boolean => {
  const s = status.toLowerCase();
  return (
    s.includes('no contesta') ||
    s.includes('rechaz') ||
    s.includes('cort') ||
    s.includes('buz') ||
    s.includes('ocupado') ||
    s.includes('equivocado') ||
    s.includes('erróneo')
  );
};

const getStatusColor = (status: string = ''): string => {
  if (isCallAccepted(status)) {
    if (status.toLowerCase().includes('acordado')) return '#2563eb';
    return '#16a34a';
  }
  if (status.toLowerCase().includes('no contesta')) return '#d97706';
  if (status.toLowerCase().includes('buz') || status.toLowerCase().includes('ocupado')) return '#4b5563';
  return '#dc2626';
};

/**
 * Imprime el Reporte Oficial Individual por Estudiante
 */
export const printStudentCallReport = (
  student: StudentReportTarget,
  calls: GuardianCallRecord[],
  options?: { institutionName?: string; academicYear?: number }
) => {
  const institutionName = options?.institutionName || 'LICEO TÉCNICO PROFESIONAL';
  const academicYear = options?.academicYear || 2026;
  const now = new Date();
  const printDateStr = now.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const printTimeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const totalCalls = calls.length;
  const acceptedCalls = calls.filter((c) => isCallAccepted(c.status)).length;
  const rejectedCalls = calls.filter((c) => isCallRejected(c.status)).length;
  const rate = totalCalls > 0 ? Math.round((acceptedCalls / totalCalls) * 100) : 0;
  const commitments = calls.filter((c) => c.commitment && c.commitment.trim().length > 0);

  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (!printWindow) {
    alert('Por favor permita las ventanas emergentes (pop-ups) para generar la impresión del reporte.');
    return;
  }

  const callsRowsHtml =
    calls.length === 0
      ? `<tr><td colspan="7" style="text-align:center; padding: 24px; color: #64748b;">No existen llamadas registradas para este estudiante.</td></tr>`
      : calls
          .map((c, idx) => {
            const cDate = new Date(c.call_date);
            const dateStr = !isNaN(cDate.getTime())
              ? cDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : '-';
            const timeStr = !isNaN(cDate.getTime())
              ? cDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
              : '';
            const statusColor = getStatusColor(c.status);

            return `
            <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 8px 10px; font-weight: bold; color: #0f172a; white-space: nowrap;">
                #${c.folio || c.id?.slice(-4) || idx + 1}
              </td>
              <td style="padding: 8px 10px; white-space: nowrap; font-size: 11px;">
                <strong>${dateStr}</strong><br/>
                <span style="color: #64748b;">${timeStr} hrs</span>
              </td>
              <td style="padding: 8px 10px; font-size: 11px;">
                <strong>${c.caller_name || 'Funcionario'}</strong>
              </td>
              <td style="padding: 8px 10px;">
                <span style="background: #e2e8f0; color: #1e293b; padding: 3px 8px; border-radius: 4px; font-size: 10.5px; font-weight: bold;">
                  ${c.reason}
                </span>
              </td>
              <td style="padding: 8px 10px; white-space: nowrap;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; font-weight: bold; color: ${statusColor}; border: 1px solid ${statusColor}44; background: ${statusColor}11;">
                  ${c.status}
                </span>
              </td>
              <td style="padding: 8px 10px; font-size: 11px; color: #334155; max-width: 260px;">
                ${c.notes ? `<div style="margin-bottom: 3px;">${c.notes}</div>` : '<span style="color:#94a3b8;">-</span>'}
                ${c.commitment ? `<div style="color: #2563eb; font-weight: 600; font-size: 10.5px;">🤝 Compromiso: ${c.commitment}</div>` : ''}
              </td>
              <td style="padding: 8px 10px; font-size: 11px; white-space: nowrap; color: #475569;">
                ${c.guardian_phone || student.guardianPhone || '-'}
              </td>
            </tr>
          `;
          })
          .join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte de Contacto Telefónico - ${student.name}</title>
  <style>
    @page {
      size: letter portrait;
      margin: 1.2cm 1.2cm 1.4cm 1.2cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-logo {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }
    .header-titles {
      flex: 1;
      padding-left: 14px;
    }
    .header-titles h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .header-titles h2 {
      margin: 2px 0 0;
      font-size: 13px;
      font-weight: 800;
      color: #0f766e;
    }
    .header-titles p {
      margin: 2px 0 0;
      font-size: 10.5px;
      color: #64748b;
    }
    .header-badge {
      text-align: right;
      font-size: 10.5px;
      color: #475569;
    }
    .card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
      background: #f8fafc;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .kpi-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-title {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 900;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 8px 10px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .progress-bar {
      height: 10px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background: ${rate >= 60 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444'};
      width: ${rate}%;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 36px;
      text-align: center;
      font-size: 10.5px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1.5px solid #334155;
      padding-top: 6px;
      font-weight: 700;
      color: #1e293b;
    }
    .sig-sub {
      font-size: 9.5px;
      color: #64748b;
    }
    .footer-note {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 9.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #0f172a; color: #fff; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-radius: 6px;">
    <div><strong>Vista de Impresión Oficial</strong> &bull; Reporte Individual de Llamadas</div>
    <div>
      <button onclick="window.print()" style="background: #10b981; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">
        🖨️ Imprimir / Guardar PDF
      </button>
      <button onclick="window.close()" style="background: #475569; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-left: 8px; font-size: 13px;">
        Cerrar
      </button>
    </div>
  </div>

  <div class="header">
    <img src="/images/logo_liceo.png" onerror="this.src='/logo.png'" alt="Logo" class="header-logo"/>
    <div class="header-titles">
      <h1>${institutionName}</h1>
      <h2>CONSTANCIA OFICIAL DE CONTACTO TELEFÓNICO CON APODERADOS</h2>
      <p>Bitácora de Trazabilidad, Citaciones y Acuerdos Institucionales &bull; Año Académico ${academicYear}</p>
    </div>
    <div class="header-badge">
      <strong>Fecha Emisión:</strong><br/>
      ${printDateStr}<br/>
      ${printTimeStr} hrs
    </div>
  </div>

  <div class="card">
    <div class="grid-2">
      <div>
        <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Estudiante:</div>
        <div style="font-size: 14px; font-weight: 900; color: #0f172a;">${student.name}</div>
        <div style="font-size: 11px; color: #475569; margin-top: 2px;">
          <strong>RUN:</strong> ${student.run || 'No informado'} &bull; <strong>Curso:</strong> ${student.course || 'No especificado'}
        </div>
      </div>
      <div>
        <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Apoderado(a) Registrado(a):</div>
        <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${student.guardianName || 'Apoderado no registrado'}</div>
        <div style="font-size: 11px; color: #0284c7; font-weight: 700; margin-top: 2px;">
          📞 Teléfono: ${student.guardianPhone || 'Sin teléfono informado'}
        </div>
      </div>
    </div>
  </div>

  <!-- Métricas Rápidas del Estudiante -->
  <div class="grid-4" style="margin-bottom: 14px;">
    <div class="kpi-box">
      <div class="kpi-title">Total Llamados</div>
      <div class="kpi-value" style="color: #0284c7;">${totalCalls}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Contestadas / Efectivas</div>
      <div class="kpi-value" style="color: #16a34a;">${acceptedCalls}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">No Contesta / Rechazadas</div>
      <div class="kpi-value" style="color: #dc2626;">${rejectedCalls}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Efectividad de Contacto</div>
      <div class="kpi-value" style="color: ${rate >= 60 ? '#16a34a' : rate >= 40 ? '#d97706' : '#dc2626'};">${rate}%</div>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
    </div>
  </div>

  <!-- TABLA DE HISTORIAL DE LLAMADAS -->
  <div style="margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
    <table>
      <thead>
        <tr>
          <th>Folio</th>
          <th>Fecha / Hora</th>
          <th>Funcionario</th>
          <th>Motivo</th>
          <th>Resultado</th>
          <th>Detalle de la Conversación y Acuerdos</th>
          <th>Tel. Contactado</th>
        </tr>
      </thead>
      <tbody>
        ${callsRowsHtml}
      </tbody>
    </table>
  </div>

  ${
    commitments.length > 0
      ? `
    <div style="border: 1px solid #bfdbfe; background: #eff6ff; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px;">
      <div style="font-weight: 800; font-size: 11px; color: #1e40af; margin-bottom: 4px;">
        🤝 COMPROMISOS Y ACUERDOS VIGENTES CON EL APODERADO:
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #1e3a8a;">
        ${commitments.map((c) => `<li><strong>${new Date(c.call_date).toLocaleDateString('es-CL')}:</strong> ${c.commitment}</li>`).join('')}
      </ul>
    </div>
    `
      : ''
  }

  <div class="signatures">
    <div>
      <div class="sig-line">Funcionario Responsable</div>
      <div class="sig-sub">Registro y Trazabilidad Institucional</div>
    </div>
    <div>
      <div class="sig-line">Inspectoría General / Convivencia</div>
      <div class="sig-sub">Validación y Seguimiento Escolar</div>
    </div>
    <div>
      <div class="sig-line">Firma Apoderado(a)</div>
      <div class="sig-sub">Toma de Conocimiento (Citación / Entrevista)</div>
    </div>
  </div>

  <div class="footer-note">
    <span>Documento generado oficialmente por el Sistema de Gestión Institucional LTP v2.0.</span>
    <span>Página 1 de 1 &bull; Validez interna institucional</span>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
};

/**
 * Imprime el Reporte General Consolidado de Todas las Llamadas
 * Incluye cabecera, indicadores globales, gráficos analíticos y el registro detallado completo
 */
export const printConsolidatedCallReport = (
  calls: GuardianCallRecord[],
  stats: CallsSummaryStats,
  topStudents: any[] = [],
  options?: {
    institutionName?: string;
    academicYear?: number;
    includeCharts?: boolean;
    includeRanking?: boolean;
    includeRecords?: boolean;
    includeSignatures?: boolean;
    filterDescription?: string;
  }
) => {
  const institutionName = options?.institutionName || 'LICEO TÉCNICO PROFESIONAL';
  const academicYear = options?.academicYear || 2026;
  const includeCharts = options?.includeCharts !== false;
  const includeRanking = options?.includeRanking !== false;
  const includeRecords = options?.includeRecords !== false;
  const includeSignatures = options?.includeSignatures !== false;
  const filterDesc = options?.filterDescription || 'Todas las llamadas registradas en el sistema';

  const now = new Date();
  const printDateStr = now.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const printTimeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const printWindow = window.open('', '_blank', 'width=1000,height=850');
  if (!printWindow) {
    alert('Por favor permita las ventanas emergentes (pop-ups) para generar la impresión del reporte.');
    return;
  }

  // Gráficos en formato HTML / SVG Vectorial para impresión
  const statusChartsHtml = stats.statusBreakdown
    .map((s) => {
      return `
      <div style="margin-bottom: 7px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-bottom: 2px;">
          <span>${s.label}</span>
          <span style="color: ${s.color};">${s.count} (${s.percentage}%)</span>
        </div>
        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${s.percentage}%; background: ${s.color};"></div>
        </div>
      </div>
    `;
    })
    .join('');

  const reasonChartsHtml = stats.reasonBreakdown
    .map((r, i) => {
      const colors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
      const color = colors[i % colors.length];
      return `
      <div style="margin-bottom: 7px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-bottom: 2px;">
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${r.reason}</span>
          <span style="color: ${color};">${r.count} (${r.percentage}%)</span>
        </div>
        <div style="height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${r.percentage}%; background: ${color};"></div>
        </div>
      </div>
    `;
    })
    .join('');

  const topStudentsRowsHtml = topStudents
    .slice(0, 5)
    .map((top, idx) => {
      const total = parseInt(String(top.total_calls || '0'), 10);
      const accepted = parseInt(String(top.accepted_calls || '0'), 10);
      const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
      return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 6px 8px; font-weight: bold; text-align: center;">#${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${top.student_name}</td>
        <td style="padding: 6px 8px; color: #475569;">${top.course_name || '-'}</td>
        <td style="padding: 6px 8px; color: #64748b;">${top.guardian_phone || '-'}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 900; color: #0284c7;">${total}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: ${rate >= 60 ? '#16a34a' : '#dc2626'};">${rate}% (${accepted} ok)</td>
      </tr>
    `;
    })
    .join('');

  const recordsRowsHtml = calls
    .map((c, idx) => {
      const cDate = new Date(c.call_date);
      const dateStr = !isNaN(cDate.getTime())
        ? cDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
        : '-';
      const timeStr = !isNaN(cDate.getTime())
        ? cDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        : '';
      const statusColor = getStatusColor(c.status);

      return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 6px 8px; font-weight: bold; white-space: nowrap;">#${c.folio || c.id?.slice(-4) || idx + 1}</td>
        <td style="padding: 6px 8px; white-space: nowrap; font-size: 10px;">${dateStr} ${timeStr}</td>
        <td style="padding: 6px 8px;">
          <strong style="color: #0f172a;">${c.student_name}</strong><br/>
          <span style="font-size: 9.5px; color: #64748b;">${c.course_name || 'Sin curso'}</span>
        </td>
        <td style="padding: 6px 8px; font-size: 10px;">
          ${c.guardian_name || '-'}<br/>
          <span style="color: #0284c7;">${c.guardian_phone || ''}</span>
        </td>
        <td style="padding: 6px 8px; font-size: 10px;">
          <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${c.reason}</span>
        </td>
        <td style="padding: 6px 8px; white-space: nowrap;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 9.5px; font-weight: bold; color: ${statusColor}; border: 1px solid ${statusColor}44; background: ${statusColor}11;">
            ${c.status}
          </span>
        </td>
        <td style="padding: 6px 8px; font-size: 9.5px; color: #334155; max-width: 220px;">
          ${c.notes ? c.notes : '-'}
          ${c.commitment ? `<div style="color: #2563eb; font-weight: 600;">🤝 Acordó: ${c.commitment}</div>` : ''}
        </td>
        <td style="padding: 6px 8px; font-size: 9.5px; color: #475569; white-space: nowrap;">${c.caller_name || 'Funcionario'}</td>
      </tr>
    `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte Consolidado de Llamadas a Apoderados</title>
  <style>
    @page {
      size: letter portrait;
      margin: 1.2cm 1.2cm 1.4cm 1.2cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header-logo {
      width: 65px;
      height: 65px;
      object-fit: contain;
    }
    .header-titles {
      flex: 1;
      padding-left: 12px;
    }
    .header-titles h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .header-titles h2 {
      margin: 2px 0 0;
      font-size: 12px;
      font-weight: 800;
      color: #0284c7;
    }
    .header-titles p {
      margin: 2px 0 0;
      font-size: 10px;
      color: #64748b;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
    }
    .kpi-title {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .kpi-value {
      font-size: 17px;
      font-weight: 900;
      margin-top: 1px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 12px 0 6px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .chart-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fafafa;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 28px;
      text-align: center;
      font-size: 10px;
      page-break-inside: avoid;
    }
    .sig-line {
      border-top: 1.5px solid #334155;
      padding-top: 5px;
      font-weight: 700;
      color: #1e293b;
    }
    .sig-sub {
      font-size: 9px;
      color: #64748b;
    }
    .footer-note {
      margin-top: 20px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
      font-size: 9px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #0f172a; color: #fff; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-radius: 6px;">
    <div><strong>Reporte Consolidado Institucional de Llamadas</strong> &bull; ${calls.length} registros cargados</div>
    <div>
      <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">
        🖨️ Imprimir Reporte / PDF
      </button>
      <button onclick="window.close()" style="background: #475569; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-left: 8px; font-size: 13px;">
        Cerrar
      </button>
    </div>
  </div>

  <div class="header">
    <img src="/images/logo_liceo.png" onerror="this.src='/logo.png'" alt="Logo" class="header-logo"/>
    <div class="header-titles">
      <h1>${institutionName}</h1>
      <h2>INFORME EJECUTIVO CONSOLIDADO DE CONTACTO TELEFÓNICO CON APODERADOS</h2>
      <p>Estadísticas de Contactabilidad, Motivos, Citaciones y Acuerdos &bull; Año Académico ${academicYear}</p>
    </div>
    <div style="text-align: right; font-size: 10px; color: #475569;">
      <strong>Fecha:</strong> ${printDateStr}<br/>
      <strong>Hora:</strong> ${printTimeStr} hrs<br/>
      <span style="color: #64748b; font-size: 9px;">${filterDesc}</span>
    </div>
  </div>

  <!-- RESUMEN EJECUTIVO KPI -->
  <div class="grid-4">
    <div class="kpi-box">
      <div class="kpi-title">Total Llamados</div>
      <div class="kpi-value" style="color: #0284c7;">${stats.total}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Contestadas / Aceptadas</div>
      <div class="kpi-value" style="color: #16a34a;">${stats.accepted}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">No Contesta / Rechazadas</div>
      <div class="kpi-value" style="color: #dc2626;">${stats.rejected}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Contactabilidad Efectiva</div>
      <div class="kpi-value" style="color: #b45309;">${stats.contactRate}%</div>
    </div>
  </div>

  <div class="grid-4" style="margin-top: -4px;">
    <div class="kpi-box">
      <div class="kpi-title">Estudiantes Contactados</div>
      <div class="kpi-value" style="color: #7c3aed;">${stats.uniqueStudentsCount}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Compromisos Acordados</div>
      <div class="kpi-value" style="color: #2563eb;">${stats.commitmentsCount}</div>
    </div>
    <div class="kpi-box" style="grid-column: span 2; text-align: left; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div class="kpi-title">Tasa de Efectividad</div>
        <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-top: 2px;">
          ${stats.contactRate >= 60 ? '🟢 Nivel Óptimo de Respuesta Familiar' : stats.contactRate >= 40 ? '🟡 Nivel Regular (Requiere insistencia)' : '🔴 Alerta de Contactabilidad Familiar'}
        </div>
      </div>
      <div style="text-align: right; font-size: 10px; color: #64748b;">
        Muestra: ${stats.total} contactos
      </div>
    </div>
  </div>

  ${
    includeCharts
      ? `
  <!-- GRÁFICOS ANALÍTICOS INTEGRADOS EN EL REPORTE -->
  <div class="section-title">📊 ANÁLISIS GRÁFICO DE CONTACTABILIDAD Y RESULTADOS</div>
  <div class="charts-grid">
    <div class="chart-card">
      <div style="font-weight: 800; font-size: 10.5px; color: #1e293b; margin-bottom: 8px;">
        1. Distribución por Resultado del Contacto
      </div>
      ${statusChartsHtml}
    </div>
    <div class="chart-card">
      <div style="font-weight: 800; font-size: 10.5px; color: #1e293b; margin-bottom: 8px;">
        2. Distribución por Motivo de Llamada
      </div>
      ${reasonChartsHtml}
    </div>
  </div>
  `
      : ''
  }

  ${
    includeRanking && topStudents.length > 0
      ? `
  <!-- RANKING ESTUDIANTES MÁS CONTACTADOS -->
  <div class="section-title">🔥 ESTUDIANTES CON MAYOR REGISTRO DE CONTACTO TELEFÓNICO</div>
  <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Estudiante</th>
          <th>Curso</th>
          <th>Teléfono Contactado</th>
          <th style="text-align: center;">Total Llamadas</th>
          <th style="text-align: center;">% Efectividad</th>
        </tr>
      </thead>
      <tbody>
        ${topStudentsRowsHtml}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  ${
    includeRecords
      ? `
  <!-- REGISTRO COMPLETO Y DETALLADO DE LLAMADAS -->
  <div class="section-title">📋 BITÁCORA Y REGISTRO DETALLADO DE LLAMADAS (${calls.length})</div>
  <div style="border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin-bottom: 14px;">
    <table>
      <thead>
        <tr>
          <th>Folio</th>
          <th>Fecha</th>
          <th>Estudiante & Curso</th>
          <th>Apoderado & Tel.</th>
          <th>Motivo</th>
          <th>Resultado</th>
          <th>Detalle / Compromiso</th>
          <th>Funcionario</th>
        </tr>
      </thead>
      <tbody>
        ${recordsRowsHtml}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  ${
    includeSignatures
      ? `
  <div class="signatures">
    <div>
      <div class="sig-line">Inspectoría General / Encargado de Bitácora</div>
      <div class="sig-sub">Validación y Trazabilidad de Llamadas</div>
    </div>
    <div>
      <div class="sig-line">Dirección del Establecimiento</div>
      <div class="sig-sub">${institutionName}</div>
    </div>
  </div>
  `
      : ''
  }

  <div class="footer-note">
    <span>Reporte consolidado generado oficialmente desde el Tablero Ejecutivo LTP v2.0.</span>
    <span>Documento de Control y Gestión Institucional &bull; Año Académico ${academicYear}</span>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
};
