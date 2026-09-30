import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { 
  FileCheck, 
  X, 
  Save, 
  Printer, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Building, 
  School,
  ArrowRight,
  ClipboardList,
  CheckSquare,
  Square,
  History,
  Info,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChecklistTemplatesEditor } from './ChecklistTemplatesEditor';

export interface ChecklistItem {
  id: string;
  label: string;
  category?: string;
  checked: boolean;
  notes?: string;
}

export interface StudentChecklistRecord {
  id: number;
  student_id: number | string;
  type: 'retiro' | 'matricula';
  student_type: 'nuevo' | 'antiguo' | 'n/a';
  items: ChecklistItem[] | string;
  completed_items: number;
  total_items: number;
  receiver_name?: string;
  receiver_run?: string;
  officer_name?: string;
  destination_school?: string;
  notes?: string;
  academic_year: number;
  created_at?: string;
  updated_at?: string;
}

interface StudentDocumentChecklistModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'retiro' | 'matricula';
}

const DEFAULT_WITHDRAWAL_ITEMS: ChecklistItem[] = [
  { id: 'w1', label: 'Certificado de Retiro Oficial MINEDUC / LTP', category: 'Ministerial', checked: true },
  { id: 'w2', label: 'Concentración de Notas Parciales / Calificaciones al Día', category: 'Académico', checked: true },
  { id: 'w3', label: 'Informe de Desarrollo Personal y Social (Informe al Hogar)', category: 'Académico', checked: true },
  { id: 'w4', label: 'Copia de Ficha Oficial de Matrícula (FIDE / Registro Institucional)', category: 'Administrativo', checked: true },
  { id: 'w5', label: 'Informe Técnico Pedagógico PIE / PAI (si corresponde a PIE)', category: 'PIE', checked: false },
  { id: 'w6', label: 'Informes de Especialistas en Custodia (Psicología / Fonoaudiología)', category: 'PIE', checked: false },
  { id: 'w7', label: 'Certificado de No Deuda Biblioteca / CRA (Libros y textos escolares)', category: 'Materiales', checked: true },
  { id: 'w8', label: 'Devolución de Dispositivos / Equipamiento Escolar (Tablet / Notebook)', category: 'Materiales', checked: false },
  { id: 'w9', label: 'Entrega de Certificado de Nacimiento Original en Archivo', category: 'Administrativo', checked: true },
  { id: 'w10', label: 'Informe de Asistencia Escolar Acumulada', category: 'Académico', checked: true }
];

const DEFAULT_NEW_STUDENT_ITEMS: ChecklistItem[] = [
  { id: 'm_n1', label: 'Certificado de Nacimiento para Matrícula (con RUN legible)', category: 'Identificación', checked: false },
  { id: 'm_n2', label: 'Certificado Anual de Estudios / Calificaciones de años anteriores', category: 'Académico', checked: false },
  { id: 'm_n3', label: 'Informe de Personalidad / Conducta del establecimiento de origen', category: 'Académico', checked: false },
  { id: 'm_n4', label: 'Certificado de Matrícula o Traslado del colegio anterior (si ingresa a mitad de año)', category: 'Administrativo', checked: false },
  { id: 'm_n5', label: 'Fotocopia Cédula de Identidad del Estudiante (ambos lados)', category: 'Identificación', checked: false },
  { id: 'm_n6', label: 'Fotocopia Cédula de Identidad del Apoderado Titular y Suplente', category: 'Identificación', checked: false },
  { id: 'm_n7', label: 'Ficha de Antecedentes de Salud / Carnet de Vacunación al día', category: 'Salud', checked: false },
  { id: 'm_n8', label: 'Documentación Integral PIE / FUDEC / Diagnóstico Médico (si postula a PIE)', category: 'PIE', checked: false },
  { id: 'm_n9', label: 'Ficha Oficial de Matrícula FIDE / LTP completada y firmada', category: 'Administrativo', checked: false },
  { id: 'm_n10', label: 'Toma de Conocimiento y Firma del RICE (Reglamento Interno)', category: 'Convivencia', checked: false },
  { id: 'm_n11', label: 'Consentimiento y Autorización de Uso de Imagen Escolar', category: 'Convivencia', checked: false }
];

const DEFAULT_OLD_STUDENT_ITEMS: ChecklistItem[] = [
  { id: 'm_o1', label: 'Actualización y Ratificación de Ficha Oficial de Matrícula FIDE / LTP', category: 'Administrativo', checked: false },
  { id: 'm_o2', label: 'Fotocopia actualizada de Cédula de Identidad del Apoderado Titular', category: 'Identificación', checked: false },
  { id: 'm_o3', label: 'Verificación y actualización de Teléfonos, Correos y Domicilio de Emergencia', category: 'Contacto', checked: false },
  { id: 'm_o4', label: 'Actualización de Ficha de Salud / Certificado Médico si hubiese patología nueva', category: 'Salud', checked: false },
  { id: 'm_o5', label: 'Firma de Consentimiento de Continuidad de Apoyo PIE (si aplica)', category: 'PIE', checked: false },
  { id: 'm_o6', label: 'Firma y Renovación de Compromiso con el RICE vigente', category: 'Convivencia', checked: false },
  { id: 'm_o7', label: 'Renovación de Consentimiento de Uso de Imagen y Difusión Institucional', category: 'Convivencia', checked: false },
  { id: 'm_o8', label: 'Paz y Salvo / Devolución de Textos Escolares y Material CRA año anterior', category: 'Materiales', checked: false }
];

export const StudentDocumentChecklistModal: React.FC<StudentDocumentChecklistModalProps> = ({
  student,
  isOpen,
  onClose,
  initialMode = 'retiro'
}) => {
  const { user, token, isSuperAdmin } = useAuth();
  const canConfigure = isSuperAdmin || user?.role === 'Admin' || user?.role === 'Director' || user?.role === 'Administrativo';
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<'retiro' | 'matricula'>(initialMode);
  const [studentType, setStudentType] = useState<'nuevo' | 'antiguo'>('nuevo');

  // Items en memoria
  const [withdrawalItems, setWithdrawalItems] = useState<ChecklistItem[]>(DEFAULT_WITHDRAWAL_ITEMS);
  const [enrollmentNewItems, setEnrollmentNewItems] = useState<ChecklistItem[]>(DEFAULT_NEW_STUDENT_ITEMS);
  const [enrollmentOldItems, setEnrollmentOldItems] = useState<ChecklistItem[]>(DEFAULT_OLD_STUDENT_ITEMS);

  // Campos adicionales para retiro
  const [receiverName, setReceiverName] = useState('');
  const [receiverRun, setReceiverRun] = useState('');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  // Historial de checklists guardados
  const [history, setHistory] = useState<StudentChecklistRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadChecklistTemplates = async () => {
    try {
      const res = await fetch('/api/config/checklist-templates', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data && data.success && data.templates) {
        return data.templates;
      }
    } catch (err) {
      console.error('Error al cargar plantillas de checklist:', err);
    }
    return null;
  };

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (student) {
      setReceiverName(student.apoderado_nombre || student.guardian_name || '');
      setReceiverRun(student.apoderado_run || student.guardian_rut || '');
      setDestinationSchool('');
      setWithdrawalNotes(student.motivo_retiro || student.retirement_reason || '');
      loadChecklistHistory();
    }
  }, [student, isOpen]);

  const loadChecklistHistory = async (forceRefreshTemplates = false) => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const [tpls, historyRes] = await Promise.all([
        loadChecklistTemplates(),
        fetch(`/api/students/${student.id}/checklists`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).then(r => r.json()).catch(() => null)
      ]);

      const data = historyRes;
      const checklists = (data && Array.isArray(data.checklists)) ? data.checklists : [];
      setHistory(checklists);

      // Si existe un checklist de retiro previo, cargarlo (a menos que se fuerce refresco)
      const prevRetiro = checklists.find((c: any) => c.type === 'retiro');
      if (prevRetiro && prevRetiro.items && !forceRefreshTemplates) {
        const parsed = typeof prevRetiro.items === 'string' ? JSON.parse(prevRetiro.items) : prevRetiro.items;
        if (Array.isArray(parsed)) setWithdrawalItems(parsed);
        if (prevRetiro.receiver_name) setReceiverName(prevRetiro.receiver_name);
        if (prevRetiro.receiver_run) setReceiverRun(prevRetiro.receiver_run);
        if (prevRetiro.destination_school) setDestinationSchool(prevRetiro.destination_school);
        if (prevRetiro.notes) setWithdrawalNotes(prevRetiro.notes);
      } else if (tpls?.withdrawal) {
        setWithdrawalItems(tpls.withdrawal);
      }

      // Si existe un checklist de matrícula previo
      const prevMatricula = checklists.find((c: any) => c.type === 'matricula');
      if (prevMatricula && prevMatricula.items && !forceRefreshTemplates) {
        const parsed = typeof prevMatricula.items === 'string' ? JSON.parse(prevMatricula.items) : prevMatricula.items;
        if (prevMatricula.student_type === 'antiguo') {
          setStudentType('antiguo');
          if (Array.isArray(parsed)) setEnrollmentOldItems(parsed);
          if (tpls?.enrollment_new) setEnrollmentNewItems(tpls.enrollment_new);
        } else {
          setStudentType('nuevo');
          if (Array.isArray(parsed)) setEnrollmentNewItems(parsed);
          if (tpls?.enrollment_old) setEnrollmentOldItems(tpls.enrollment_old);
        }
      } else {
        if (tpls?.enrollment_new) setEnrollmentNewItems(tpls.enrollment_new);
        if (tpls?.enrollment_old) setEnrollmentOldItems(tpls.enrollment_old);
      }
    } catch (err) {
      console.error('Error al cargar historial de checklists:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentItems = useMemo(() => {
    if (activeTab === 'retiro') return withdrawalItems;
    return studentType === 'nuevo' ? enrollmentNewItems : enrollmentOldItems;
  }, [activeTab, studentType, withdrawalItems, enrollmentNewItems, enrollmentOldItems]);

  const toggleItem = (itemId: string) => {
    if (activeTab === 'retiro') {
      setWithdrawalItems(prev => prev.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item));
    } else if (studentType === 'nuevo') {
      setEnrollmentNewItems(prev => prev.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item));
    } else {
      setEnrollmentOldItems(prev => prev.map(item => item.id === itemId ? { ...item, checked: !item.checked } : item));
    }
  };

  const handleItemNote = (itemId: string, note: string) => {
    if (activeTab === 'retiro') {
      setWithdrawalItems(prev => prev.map(item => item.id === itemId ? { ...item, notes: note } : item));
    } else if (studentType === 'nuevo') {
      setEnrollmentNewItems(prev => prev.map(item => item.id === itemId ? { ...item, notes: note } : item));
    } else {
      setEnrollmentOldItems(prev => prev.map(item => item.id === itemId ? { ...item, notes: note } : item));
    }
  };

  const completedCount = currentItems.filter(i => i.checked).length;
  const totalCount = currentItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSave = async () => {
    if (!student?.id) return;
    setSaving(true);
    try {
      const payload = {
        type: activeTab,
        student_type: activeTab === 'matricula' ? studentType : 'n/a',
        items: currentItems,
        completed_items: completedCount,
        total_items: totalCount,
        receiver_name: activeTab === 'retiro' ? receiverName.trim() : '',
        receiver_run: activeTab === 'retiro' ? receiverRun.trim() : '',
        officer_name: user?.name || 'Funcionario LTP',
        destination_school: activeTab === 'retiro' ? destinationSchool.trim() : '',
        notes: activeTab === 'retiro' ? withdrawalNotes.trim() : '',
        academic_year: new Date().getFullYear()
      };

      const res = await fetch(`/api/students/${student.id}/checklists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Checklist Guardado',
          text: data.message || 'El checklist se registró exitosamente.',
          timer: 2000,
          showConfirmButton: false
        });
        loadChecklistHistory();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar el checklist.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Fallo de conexión al guardar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const studentName = student?.full_name || `${student?.nombres || ''} ${student?.apellido_paterno || ''} ${student?.apellido_materno || ''}`.trim() || 'Estudiante';
  const studentRun = student?.run || student?.rut || 'Sin RUN';
  const studentCourse = student?.desc_grado || student?.course_name || student?.curso || 'Sin Curso';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-checklist-area, #printable-checklist-area * {
            visibility: visible;
          }
          #printable-checklist-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 1.5cm;
            background: #ffffff;
            color: #000000;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '960px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* ENCABEZADO MODAL (NO PRINT) */}
        <div className="no-print" style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <FileCheck size={24} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                Control Documental & Checklists Oficiales
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                Verificación de entrega y recepción de documentos para Retiro y Matrícula escolar
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {canConfigure && (
              <button
                type="button"
                onClick={() => setShowConfigEditor(true)}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  transition: 'all 0.15s ease'
                }}
                title="Modificar en la configuración los requisitos exigidos para Retiro y Matrícula"
              >
                <Settings size={15} /> Modificar Requisitos
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.4rem',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* DATOS DEL ESTUDIANTE (NO PRINT) */}
        <div className="no-print" style={{
          padding: '0.85rem 1.75rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
              {studentName}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#475569', background: '#ffffff', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              RUT: <strong>{studentRun}</strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#3730a3', background: '#e0e7ff', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
              {studentCourse}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('retiro')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                background: activeTab === 'retiro' ? '#ef4444' : '#f1f5f9',
                color: activeTab === 'retiro' ? '#ffffff' : '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🚪 Checklist de Retiro
            </button>
            <button
              onClick={() => setActiveTab('matricula')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                background: activeTab === 'matricula' ? '#10b981' : '#f1f5f9',
                color: activeTab === 'matricula' ? '#ffffff' : '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📝 Checklist de Matrícula
            </button>
          </div>
        </div>

        {/* ÁREA PRINCIPAL CON SCROLL / IMPRESIÓN */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          <div id="printable-checklist-area">
            
            {/* MEMBRETE INSTITUCIONAL PARA IMPRESIÓN */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '0.75rem',
              marginBottom: '1.25rem'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a' }}>
                  Liceo Técnico Profesional Campanario
                </h2>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  RBD: 17565-1 • Fono: 42 287 0134 • Comuna de Yungay, Región de Ñuble
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                  {activeTab === 'retiro' 
                    ? 'COMPROBANTE OFICIAL DE ENTREGA DE DOCUMENTOS POR RETIRO ESCOLAR' 
                    : `FICHA DE CONTROL Y RECEPCIÓN DOCUMENTAL DE MATRÍCULA (${studentType === 'nuevo' ? 'ESTUDIANTE NUEVO' : 'ESTUDIANTE ANTIGUO'})`}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b' }}>
                <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CL')}</div>
                <div><strong>Año Escolar:</strong> {new Date().getFullYear()}</div>
              </div>
            </div>

            {/* RESUMEN DEL ALUMNO (TABLA IMPRESA) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.5rem'
            }}>
              <div><strong>Estudiante:</strong> {studentName}</div>
              <div><strong>RUT / RUN:</strong> {studentRun}</div>
              <div><strong>Curso:</strong> {studentCourse}</div>
              <div><strong>Responsable LTP:</strong> {user?.name || 'Secretaría / Inspectoría'}</div>
            </div>

            {/* SELECTOR NUEVO / ANTIGUO (EN MODO MATRÍCULA - NO PRINT) */}
            {activeTab === 'matricula' && (
              <div className="no-print" style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>
                    Tipo de Estudiante para Matrícula:
                  </span>
                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => setStudentType('nuevo')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: studentType === 'nuevo' ? '#10b981' : '#ffffff',
                        color: studentType === 'nuevo' ? '#ffffff' : '#334155',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: studentType === 'nuevo' ? '#059669' : '#cbd5e1'
                      }}
                    >
                      🌟 Estudiante Nuevo (Ingreso / SAE)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentType('antiguo')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: studentType === 'antiguo' ? '#10b981' : '#ffffff',
                        color: studentType === 'antiguo' ? '#ffffff' : '#334155',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: studentType === 'antiguo' ? '#059669' : '#cbd5e1'
                      }}
                    >
                      🔄 Estudiante Antiguo (Continuidad)
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#15803d', fontStyle: 'italic' }}>
                  {studentType === 'nuevo' ? 'Documentación completa de ingreso y certificados previos' : 'Actualización de ficha, salud, apoderados y compromisos'}
                </div>
              </div>
            )}

            {/* BARRA DE PROGRESO DE COMPLETITUD */}
            <div className="no-print" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                <span>Progreso Documental: {completedCount} de {totalCount} documentos verificados</span>
                <span>{progressPercent}% Completado</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: progressPercent === 100 ? '#10b981' : progressPercent >= 60 ? '#3b82f6' : '#f59e0b',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* TABLA DE CHECKLIST */}
            <div style={{ marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '0.55rem 0.75rem', width: '45px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '0.55rem 0.75rem' }}>Documento / Requisito</th>
                    <th style={{ padding: '0.55rem 0.75rem', width: '120px' }}>Área</th>
                    <th style={{ padding: '0.55rem 0.75rem' }}>Observación / Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        background: item.checked ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#fcfcfc',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                        {item.checked ? (
                          <CheckSquare size={17} color="#059669" />
                        ) : (
                          <Square size={17} color="#94a3b8" />
                        )}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: item.checked ? 700 : 500, color: item.checked ? '#065f46' : '#1e293b' }}>
                        {item.label}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem' }} onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={e => handleItemNote(item.id, e.target.value)}
                          placeholder="Nota o fecha de recepción..."
                          style={{
                            width: '100%',
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem'
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SECCIÓN ESPECÍFICA PARA RETIRO: RECEPTOR Y COLEGIO DESTINO */}
            {activeTab === 'retiro' && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building size={16} color="#d97706" /> Datos de Recepción y Traslado del Estudiante Retirado
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#78350f', marginBottom: '0.2rem' }}>
                      👤 Nombre de quien Retira la Documentación:
                    </label>
                    <input
                      type="text"
                      value={receiverName}
                      onChange={e => setReceiverName(e.target.value)}
                      placeholder="Nombre del apoderado o tutor"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#78350f', marginBottom: '0.2rem' }}>
                      🆔 RUN de quien Retira:
                    </label>
                    <input
                      type="text"
                      value={receiverRun}
                      onChange={e => setReceiverRun(e.target.value)}
                      placeholder="Ej: 12.345.678-9"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#78350f', marginBottom: '0.2rem' }}>
                      🏫 Establecimiento Educacional de Destino:
                    </label>
                    <input
                      type="text"
                      value={destinationSchool}
                      onChange={e => setDestinationSchool(e.target.value)}
                      placeholder="Nombre del colegio de destino / Comuna"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontWeight: 700, color: '#78350f', marginBottom: '0.2rem' }}>
                      📝 Motivo o Detalle del Retiro:
                    </label>
                    <input
                      type="text"
                      value={withdrawalNotes}
                      onChange={e => setWithdrawalNotes(e.target.value)}
                      placeholder="Ej: Cambio de domicilio familiar a otra ciudad / Decisión vocacional"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECCIÓN DE FIRMAS PARA IMPRESIÓN OFICIAL */}
            <div style={{
              marginTop: '3.5rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '4rem',
              textAlign: 'center'
            }}>
              <div style={{ borderTop: '1px solid #000000', paddingTop: '0.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  {activeTab === 'retiro' ? (receiverName || 'Firma Apoderado que Retira') : 'Firma Apoderado Titular'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  RUT: {activeTab === 'retiro' ? (receiverRun || '___________________') : '___________________'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                  {activeTab === 'retiro' ? 'Declaro recibir conforme la documentación indicada' : 'Declaro entregar la documentación fidedigna requerida'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #000000', paddingTop: '0.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  {user?.name || 'Funcionario Responsable'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  Secretaría / Inspectoría General • LTP Campanario
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                  Timbre y Firma Institucional
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BARRA INFERIOR DE ACCIONES (NO PRINT) */}
        <div className="no-print" style={{
          padding: '0.9rem 1.75rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
            <Info size={14} color="#6366f1" />
            <span>Los registros se archivan automáticamente en la base de datos escolar.</span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.5rem 0.9rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Printer size={15} /> Imprimir Comprobante
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              style={{
                background: '#4f46e5',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1.1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#ffffff',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                opacity: saving ? 0.7 : 1
              }}
            >
              <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Checklist'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL EMERGENTE DE CONFIGURACIÓN DE PLANTILLAS DE CHECKLIST */}
      {showConfigEditor && (
        <ChecklistTemplatesEditor
          token={token || ''}
          isModal={true}
          onClose={() => setShowConfigEditor(false)}
          onSaved={() => {
            loadChecklistHistory(true);
            setShowConfigEditor(false);
          }}
        />
      )}
    </div>
  );
};
