import React, { useState } from 'react';
import { Printer, X, CheckCircle2, AlertTriangle, Type } from 'lucide-react';

export interface PassData {
  id: string;
  folio: number;
  student_id: string;
  student_run: string;
  student_name: string;
  course_name: string;
  pass_type: string;
  pass_date: string;
  pass_time: string;
  reason: string;
  status: string;
  justification_detail?: string | null;
  inspector_name: string;
  inspector_id?: string | null;
  academic_year?: number;
  period?: string;
  created_at?: string;
  monthlyLatesCount?: number;
  yearlyLatesCount?: number;
}

export type ThermalPassData = PassData;

export type PassFontScale = 'normal' | 'large' | 'extralarge';

export interface FontScaleConfig {
  name: string;
  bodySize: string;
  headerTitleSize: string;
  headerSubSize: string;
  folioSize: string;
  passTypeSize: string;
  tableSize: string;
  studentNameSize: string;
  statusBadgeSize: string;
  countersSize: string;
  sigSize: string;
  footerSize: string;
}

export const FONT_SCALE_CONFIGS: Record<PassFontScale, FontScaleConfig> = {
  normal: {
    name: 'Normal (13px)',
    bodySize: '13px',
    headerTitleSize: '14px',
    headerSubSize: '11.5px',
    folioSize: '16px',
    passTypeSize: '13px',
    tableSize: '12.5px',
    studentNameSize: '14px',
    statusBadgeSize: '12.5px',
    countersSize: '11.5px',
    sigSize: '10.5px',
    footerSize: '10px'
  },
  large: {
    name: 'Grande - Recomendado (15px)',
    bodySize: '15px',
    headerTitleSize: '16.5px',
    headerSubSize: '13px',
    folioSize: '19.5px',
    passTypeSize: '15px',
    tableSize: '14px',
    studentNameSize: '16px',
    statusBadgeSize: '14.5px',
    countersSize: '13px',
    sigSize: '12px',
    footerSize: '11px'
  },
  extralarge: {
    name: 'Extra Grande (17px)',
    bodySize: '17px',
    headerTitleSize: '18.5px',
    headerSubSize: '14.5px',
    folioSize: '22px',
    passTypeSize: '16.5px',
    tableSize: '15.5px',
    studentNameSize: '18px',
    statusBadgeSize: '16.5px',
    countersSize: '14.5px',
    sigSize: '13px',
    footerSize: '12px'
  }
};

export const getSavedPassFontScale = (): PassFontScale => {
  try {
    const saved = localStorage.getItem('ltp_pass_font_size');
    if (saved === 'normal' || saved === 'large' || saved === 'extralarge') {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return 'large';
};

/**
 * Función utilitaria para formatear la fecha a DD/MM/AAAA
 */
export const formatDateDMY = (dateStr?: string): string => {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) return str.replace(/\//g, '-');
  if (str.includes('T')) {
    const [y, m, d] = str.split('T')[0].split('-');
    return `${d}-${m}-${y}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${d}-${m}-${y}`;
  }
  return str;
};

/**
 * Función principal para imprimir el voucher directamente en la EPSON TM-T20II (80mm)
 * Soporta escala de fuentes con alta legibilidad para impresoras térmicas
 */
export const printThermalPass = (
  pass: PassData,
  monthlyCount?: number,
  yearlyCount?: number,
  fontScale?: PassFontScale
) => {
  const activeScale = fontScale || getSavedPassFontScale();
  const cfg = FONT_SCALE_CONFIGS[activeScale] || FONT_SCALE_CONFIGS.large;

  const printWindow = window.open('', '_blank', 'width=420,height=650');
  if (!printWindow) {
    alert('Por favor permite ventanas emergentes para imprimir el voucher térmico.');
    return;
  }

  const padFolio = String(pass.folio || 1).padStart(5, '0');
  const dateFormatted = formatDateDMY(pass.pass_date);
  const timeFormatted = pass.pass_time ? String(pass.pass_time).slice(0, 5) + ' hrs' : '';
  const mCount = typeof monthlyCount === 'number' ? monthlyCount : (pass.monthlyLatesCount || 1);
  const yCount = typeof yearlyCount === 'number' ? yearlyCount : (pass.yearlyLatesCount || 1);
  const isAlert = mCount >= 3 || yCount >= 5;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pase de Entrada #${padFolio} - Liceo Técnico Profesional Campanario Marcos Delucchi Fonck</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 74mm;
      max-width: 74mm;
      margin: 0 auto;
      padding: 3mm 2mm;
      /* Tipografía sans-serif de alto contraste para cabezal térmico de 203 DPI */
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif;
      font-size: ${cfg.bodySize};
      line-height: 1.32;
      color: #000000;
      background: #ffffff;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .logo-container {
      margin-bottom: 4px;
      text-align: center;
    }
    .school-logo {
      height: 48px;
      max-width: 58mm;
      object-fit: contain;
      filter: grayscale(100%) contrast(160%);
      display: inline-block;
    }
    .header-title {
      font-size: ${cfg.headerTitleSize};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 2px;
    }
    .header-sub {
      font-size: ${cfg.headerSubSize};
      font-weight: 800;
      margin-bottom: 2px;
    }
    .divider {
      border-top: 1.5px dashed #000;
      margin: 5px 0;
    }
    .double-divider {
      border-top: 2.5px solid #000;
      margin: 6px 0;
    }
    .folio-box {
      font-size: ${cfg.folioSize};
      font-weight: 900;
      padding: 3px 0;
      letter-spacing: 0.5px;
    }
    .pass-type {
      font-size: ${cfg.passTypeSize};
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .info-table {
      width: 100%;
      text-align: left;
      font-size: ${cfg.tableSize};
      margin: 4px 0;
      border-collapse: collapse;
    }
    .info-table td {
      padding: 2px 0;
      vertical-align: top;
    }
    .label {
      font-weight: 800;
      width: 32%;
      white-space: nowrap;
    }
    .value {
      font-weight: 700;
      width: 68%;
      word-break: break-word;
    }
    .student-val {
      font-size: ${cfg.studentNameSize};
      font-weight: 900;
    }
    .status-badge {
      display: inline-block;
      border: 2px solid #000;
      padding: 2px 8px;
      font-weight: 900;
      font-size: ${cfg.statusBadgeSize};
      text-transform: uppercase;
      margin: 4px 0;
    }
    .alert-box {
      border: 2px dashed #000;
      padding: 4px 3px;
      margin: 5px 0;
      font-weight: 900;
      font-size: ${cfg.countersSize};
      text-transform: uppercase;
    }
    .signatures {
      margin-top: 16px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      text-align: center;
      font-size: ${cfg.sigSize};
      font-weight: 700;
    }
    .sig-block {
      width: 46%;
      text-align: center;
    }
    .sig-line {
      border-top: 1.5px solid #000;
      margin-bottom: 4px;
    }
    .footer-note {
      font-size: ${cfg.footerSize};
      font-weight: 600;
      font-style: italic;
      margin-top: 6px;
      line-height: 1.25;
    }
  </style>
</head>
<body>
  <div class="logo-container">
    <img src="/logo.png" class="school-logo" alt="LTP" onerror="this.style.display='none'" />
  </div>
  <div class="header-title">LICEO TÉCNICO PROFESIONAL CAMPANARIO<br/>MARCOS DELUCCHI FONCK</div>
  <div class="header-sub">INSPECTORÍA GENERAL</div>
  <div class="folio-box">FOLIO PASE: #${padFolio}</div>
  <div class="pass-type">*** ${pass.pass_type || 'PASE DE INGRESO'} ***</div>

  <div class="double-divider"></div>

  <table class="info-table">
    <tr>
      <td class="label">FECHA/HORA:</td>
      <td class="value">${dateFormatted} - ${timeFormatted}</td>
    </tr>
    <tr>
      <td class="label">ESTUDIANTE:</td>
      <td class="value student-val">${pass.student_name}</td>
    </tr>
    <tr>
      <td class="label">RUN ALUMNO:</td>
      <td class="value">${pass.student_run}</td>
    </tr>
    <tr>
      <td class="label">CURSO:</td>
      <td class="value" style="font-weight: 900;">${pass.course_name}</td>
    </tr>
    <tr>
      <td class="label">MOTIVO:</td>
      <td class="value">${pass.reason}</td>
    </tr>
    ${pass.justification_detail ? `
    <tr>
      <td class="label">DETALLE:</td>
      <td class="value">${pass.justification_detail}</td>
    </tr>` : ''}
    <tr>
      <td class="label">INSPECTOR:</td>
      <td class="value">${pass.inspector_name}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <div style="font-weight: 800; font-size: ${cfg.tableSize};">CONDICIÓN DE INGRESO:</div>
  <div class="status-badge">[ ${String(pass.status || 'INJUSTIFICADO').toUpperCase()} ]</div>

  <div style="font-size: ${cfg.countersSize}; font-weight: 700; margin-top: 3px; line-height: 1.35;">
    • Atraso N° <strong>${mCount}</strong> de este mes<br/>
    • Atraso N° <strong>${yCount}</strong> del año escolar ${pass.academic_year || 2026}
  </div>

  ${isAlert ? `
  <div class="alert-box">
    ⚠️ REINCIDENCIA DE ATRASOS<br/>
    REQUIERE CITACIÓN DE APODERADO
  </div>` : ''}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      Firma Inspectoría
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      Firma Docente Aula
    </div>
  </div>

  <div class="divider"></div>
  <div class="footer-note">
    Ticket oficial válido para ingreso a sala de clases.<br/>
    El apoderado puede revisar este registro en su portal.
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Esperar a que la imagen y recursos terminen de cargar para invocar el print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
};

/**
 * Modal de Vista Previa del Voucher Térmico (80mm) con opción de Imprimir y selector de tamaño
 */
interface ThermalReceiptPreviewModalProps {
  pass: PassData | null;
  monthlyCount?: number;
  yearlyCount?: number;
  onClose: () => void;
  onPrint?: () => void;
}

export const ThermalReceiptPreviewModal: React.FC<ThermalReceiptPreviewModalProps> = ({
  pass,
  monthlyCount,
  yearlyCount,
  onClose,
  onPrint
}) => {
  const [fontScale, setFontScale] = useState<PassFontScale>(() => getSavedPassFontScale());

  if (!pass) return null;

  const cfg = FONT_SCALE_CONFIGS[fontScale] || FONT_SCALE_CONFIGS.large;
  const padFolio = String(pass.folio || 1).padStart(5, '0');
  const dateFormatted = formatDateDMY(pass.pass_date);
  const timeFormatted = pass.pass_time ? String(pass.pass_time).slice(0, 5) + ' hrs' : '';
  const mCount = typeof monthlyCount === 'number' ? monthlyCount : (pass.monthlyLatesCount || 1);
  const yCount = typeof yearlyCount === 'number' ? yearlyCount : (pass.yearlyLatesCount || 1);
  const isAlert = mCount >= 3 || yCount >= 5;

  const handleScaleChange = (scale: PassFontScale) => {
    setFontScale(scale);
    try {
      localStorage.setItem('ltp_pass_font_size', scale);
    } catch (e) {
      console.warn('No se pudo guardar la preferencia de fuente:', e);
    }
  };

  const handlePrintClick = () => {
    printThermalPass(pass, mCount, yCount, fontScale);
    if (onPrint) onPrint();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '94vh',
        overflow: 'hidden'
      }}>
        {/* Cabecera del Modal */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={20} color="#4f46e5" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
              Vista Previa Voucher Térmico (EPSON TM-T20II)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra selectora de Tamaño de Letra */}
        <div style={{
          padding: '0.65rem 1.25rem',
          background: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Type size={16} color="#4f46e5" />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
              Tamaño de Letra:
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: '0.25rem',
            background: '#e2e8f0',
            padding: '3px',
            borderRadius: '8px'
          }}>
            <button
              type="button"
              onClick={() => handleScaleChange('normal')}
              style={{
                border: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: fontScale === 'normal' ? 800 : 600,
                background: fontScale === 'normal' ? '#ffffff' : 'transparent',
                color: fontScale === 'normal' ? '#4f46e5' : '#64748b',
                boxShadow: fontScale === 'normal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => handleScaleChange('large')}
              style={{
                border: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: fontScale === 'large' ? 800 : 600,
                background: fontScale === 'large' ? '#ffffff' : 'transparent',
                color: fontScale === 'large' ? '#4f46e5' : '#64748b',
                boxShadow: fontScale === 'large' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ⭐ Grande (Recomendado)
            </button>
            <button
              type="button"
              onClick={() => handleScaleChange('extralarge')}
              style={{
                border: 'none',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: fontScale === 'extralarge' ? 800 : 600,
                background: fontScale === 'extralarge' ? '#ffffff' : 'transparent',
                color: fontScale === 'extralarge' ? '#4f46e5' : '#64748b',
                boxShadow: fontScale === 'extralarge' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Extra Grande
            </button>
          </div>
        </div>

        {/* Contenedor del Ticket Térmico Simulando Rollo 80mm */}
        <div style={{
          padding: '1.25rem',
          overflowY: 'auto',
          background: '#e2e8f0',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '340px',
            background: '#ffffff',
            padding: '1.25rem 1rem',
            borderRadius: '6px',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
            border: '1.5px solid #cbd5e1',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, Helvetica, sans-serif',
            fontSize: cfg.bodySize,
            lineHeight: 1.32,
            color: '#000000',
            textAlign: 'center'
          }}>
            {/* Logo del Liceo */}
            <div style={{ marginBottom: '8px' }}>
              <img
                src="/logo.png"
                alt="LTP Logo"
                style={{ height: '48px', width: 'auto', objectFit: 'contain', filter: 'grayscale(100%) contrast(150%)' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>

            <div style={{ fontWeight: 900, fontSize: cfg.headerTitleSize, textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.25 }}>
              LICEO TÉCNICO PROFESIONAL CAMPANARIO<br/>MARCOS DELUCCHI FONCK
            </div>
            <div style={{ fontSize: cfg.headerSubSize, fontWeight: 800, color: '#1e293b' }}>
              INSPECTORÍA GENERAL
            </div>
            <div style={{ fontSize: cfg.folioSize, fontWeight: 900, margin: '4px 0', letterSpacing: '0.5px' }}>
              FOLIO: #{padFolio}
            </div>
            <div style={{ fontSize: cfg.passTypeSize, fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>
              *** {pass.pass_type || 'PASE DE INGRESO'} ***
            </div>

            <div style={{ borderTop: '2.5px solid #000', margin: '8px 0' }}></div>

            <div style={{ textAlign: 'left', fontSize: cfg.tableSize }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ fontWeight: 800, width: '32%' }}>FECHA/HORA:</span>
                <span style={{ fontWeight: 700, width: '68%', textAlign: 'right' }}>{dateFormatted} {timeFormatted}</span>
              </div>
              <div style={{ padding: '3px 0' }}>
                <span style={{ fontWeight: 800 }}>ESTUDIANTE:</span><br/>
                <span style={{ fontWeight: 900, fontSize: cfg.studentNameSize }}>{pass.student_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ fontWeight: 800, width: '32%' }}>RUN:</span>
                <span style={{ fontWeight: 700, width: '68%', textAlign: 'right' }}>{pass.student_run}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ fontWeight: 800, width: '32%' }}>CURSO:</span>
                <span style={{ fontWeight: 900, width: '68%', textAlign: 'right' }}>{pass.course_name}</span>
              </div>
              <div style={{ padding: '3px 0' }}>
                <span style={{ fontWeight: 800 }}>MOTIVO:</span>
                <div style={{ fontWeight: 700 }}>{pass.reason}</div>
              </div>
              {pass.justification_detail && (
                <div style={{ padding: '3px 0' }}>
                  <span style={{ fontWeight: 800 }}>DETALLE:</span>
                  <div style={{ fontWeight: 700 }}>{pass.justification_detail}</div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                <span style={{ fontWeight: 800, width: '32%' }}>INSPECTOR:</span>
                <span style={{ fontWeight: 700, width: '68%', textAlign: 'right' }}>{pass.inspector_name}</span>
              </div>
            </div>

            <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>

            <div style={{ fontWeight: 800, fontSize: cfg.tableSize }}>CONDICIÓN DE INGRESO:</div>
            <div style={{
              display: 'inline-block',
              border: '2px solid #000',
              padding: '2px 8px',
              fontWeight: 900,
              fontSize: cfg.statusBadgeSize,
              margin: '4px 0'
            }}>
              [ {String(pass.status || 'INJUSTIFICADO').toUpperCase()} ]
            </div>

            <div style={{ fontSize: cfg.countersSize, fontWeight: 700, marginTop: '4px', color: '#000000', lineHeight: 1.35 }}>
              • Atraso N° <strong>{mCount}</strong> de este mes<br/>
              • Atraso N° <strong>{yCount}</strong> del año escolar {pass.academic_year || 2026}
            </div>

            {isAlert && (
              <div style={{
                border: '2px dashed #dc2626',
                color: '#dc2626',
                padding: '4px',
                margin: '8px 0',
                fontWeight: 900,
                fontSize: cfg.countersSize
              }}>
                ⚠️ ALERTA DE REINCIDENCIA<br/>
                REQUIERE CITACIÓN DE APODERADO
              </div>
            )}

            <div style={{ marginTop: '20px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: cfg.sigSize, fontWeight: 700 }}>
              <div style={{ width: '45%', textAlign: 'center' }}>
                <div style={{ borderTop: '1.5px solid #000', marginBottom: '4px' }}></div>
                Firma Inspectoría
              </div>
              <div style={{ width: '45%', textAlign: 'center' }}>
                <div style={{ borderTop: '1.5px solid #000', marginBottom: '4px' }}></div>
                Firma Docente Aula
              </div>
            </div>

            <div style={{ borderTop: '1.5px dashed #000', margin: '8px 0' }}></div>
            <div style={{ fontSize: cfg.footerSize, fontWeight: 600, fontStyle: 'italic', color: '#1e293b', lineHeight: 1.25 }}>
              Ticket oficial válido para ingresar a sala de clases.<br/>
              Registro sincronizado con el Portal del Apoderado.
            </div>
          </div>
        </div>

        {/* Botones de Acción del Modal */}
        <div style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          background: '#ffffff',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            className="btn"
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>

          <button
            onClick={handlePrintClick}
            className="btn"
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.35)'
            }}
          >
            <Printer size={16} /> Imprimir en EPSON TM-T20II
          </button>
        </div>
      </div>
    </div>
  );
};
