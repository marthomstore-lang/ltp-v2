import React, { useState } from 'react';
import { User, Shield, Heart, FileText, CheckCircle, X, Users, Home, Search, ClipboardList } from 'lucide-react';
import { formatRut } from '../utils/rut';
import { formatPhone } from '../utils/phone';
import { getStudentCourse, isStudentRetired, sortCoursesList } from '../utils/course';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import { StudentDocumentChecklistModal } from './StudentDocumentChecklistModal';
import { getModuleSubTabFromUrl, syncModuleSubUrl } from '../utils/urlRouter';

interface StudentWindowProps {
  student: any;
  onClose: () => void;
  onSave: (updatedStudent: any) => void;
  onPrint?: (student: any) => void;
  token: string;
  readOnly?: boolean;
}

function formatDateForInput(dateVal: any): string {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (str.includes('T')) {
    return str.split('T')[0];
  }
  if (str.length >= 10 && str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return str.slice(0, 10);
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return str;
}

const cleanEnrollmentVal = (val: any) => {
  if (!val) return '';
  const s = String(val).trim();
  if (s === 'null' || s === 'undefined') return '';
  return s;
};

export function calculateExactAge(birthDateString: string | null): string {
  if (!birthDateString) return 'Sin fecha de nacimiento';
  const str = String(birthDateString).trim();
  let parts;
  if (str.includes('T')) {
    parts = str.split('T')[0].split('-');
  } else if (str.includes('/')) {
    const p = str.split('/');
    if (p.length === 3) parts = [p[2], p[1], p[0]];
  } else {
    parts = str.split('-');
  }
  
  if (!parts || parts.length !== 3) return 'Fecha invÃ¡lida';
  
  const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (isNaN(birthDate.getTime())) return 'Fecha invÃ¡lida';
  
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const previousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += previousMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return `${years} aÃ±os, ${months} meses y ${days} dÃ­as`;
}

export const StudentWindow: React.FC<StudentWindowProps> = ({ student, onClose, onSave, onPrint, token, readOnly = false }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'guardian_main' | 'guardian_secondary' | 'parents_family' | 'health_sep'>(() =>
    getModuleSubTabFromUrl('students', 'personal') as any
  );

  React.useEffect(() => {
    syncModuleSubUrl('students', activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    const handlePop = () => {
      const sub = getModuleSubTabFromUrl('students', 'personal') as any;
      setActiveTab(sub);
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      syncModuleSubUrl('students', null, true);
    };
  }, []);
  const [formData, setFormData] = useState<any>({
    ...student,
    has_complementary_insurance: student?.has_complementary_insurance ? 1 : 0,
    complementary_insurance_name: student?.complementary_insurance_name || '',
    complementary_insurance_coverage: student?.complementary_insurance_coverage || '',
    authorize_image_use: student?.authorize_image_use !== undefined ? (student?.authorize_image_use ? 1 : 0) : 1,
    image_auth_scope: student?.image_auth_scope || (student?.authorize_image_use === 0 ? 'ninguna' : 'personal_y_grupal'),
    enrollment_number: cleanEnrollmentVal(student?.enrollment_number || student?.numero_matricula),
    is_retired: isStudentRetired(student),
    anno: student?.anno || student?.academic_year || student?.entry_year || 2027,
    enrolled_by_name: student?.enrolled_by_name || user?.name || '',
    enrolled_by_run: student?.enrolled_by_run || user?.run || '',
    enrolled_by_role: student?.enrolled_by_role || user?.role || 'Encargado de MatrÃ­cula'
  });

  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [showSiblingModal, setShowSiblingModal] = useState(false);
  const [siblingSearch, setSiblingSearch] = useState('');
  const [siblingCourseFilter, setSiblingCourseFilter] = useState('Todos');

  const [showGuardianSearchModal, setShowGuardianSearchModal] = useState(false);
  const [targetGuardianType, setTargetGuardianType] = useState<'guardian' | 'guardian_sec' | 'mother' | 'father'>('guardian');
  const [guardianSearchQuery, setGuardianSearchQuery] = useState('');
  const [registeredGuardiansList, setRegisteredGuardiansList] = useState<any[]>([]);
  const [loadingGuardians, setLoadingGuardians] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistMode, setChecklistMode] = useState<'retiro' | 'matricula'>('retiro');

  React.useEffect(() => {
    if (allStudents.length > 0) {
      const currentCourse = getStudentCourse(formData);
      if (currentCourse && !formData.profesor_jefe) {
        const assigned = allStudents.find((s: any) => getStudentCourse(s) === currentCourse && s.profesor_jefe)?.profesor_jefe;
        if (assigned) {
          setFormData((prev: any) => ({ ...prev, profesor_jefe: assigned }));
        }
      }
    }
  }, [allStudents, formData.level_name, formData.desc_grado]);

  // Auto-asignar NÃºmero de MatrÃ­cula Ãºnico (ej: 2026-004) si no lo tiene asignado aÃºn
  React.useEffect(() => {
    const currentMat = cleanEnrollmentVal(formData.enrollment_number);
    if (allStudents.length > 0 && !currentMat) {
      let maxSeq = 0;
      allStudents.forEach((s: any) => {
        const str = cleanEnrollmentVal(s.enrollment_number || s.numero_matricula);
        if (str) {
          const parts = str.split('-');
          let lastPart = parts[parts.length - 1].replace(/[^0-9]/g, '');
          if (lastPart.startsWith('2026') && lastPart.length > 4) {
            lastPart = lastPart.slice(4);
          }
          const n = parseInt(lastPart, 10);
          if (!isNaN(n) && n > maxSeq) maxSeq = n;
        }
      });
      const year = new Date().getFullYear();
      const nextSeq = String(maxSeq + 1).padStart(3, '0');
      setFormData((prev: any) => ({
        ...prev,
        enrollment_number: `${year}-${nextSeq}`
      }));
    }
  }, [allStudents, formData.enrollment_number]);

  // Soporte para cerrar la ventana con la tecla Escape (ESC)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGuardianSearchModal) {
          setShowGuardianSearchModal(false);
        } else if (showSiblingModal) {
          setShowSiblingModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showGuardianSearchModal, showSiblingModal]);

  // Recalcular NÂ° de Lista correlativo exacto segÃºn la posiciÃ³n en el curso asignado
  const currentCourseForList = getStudentCourse(formData);
  const courseStudentsForList = allStudents
    .filter((s: any) => getStudentCourse(s) === currentCourseForList)
    .sort((a: any, b: any) => {
      const numA = typeof a.list_number === 'number' ? a.list_number : 999;
      const numB = typeof b.list_number === 'number' ? b.list_number : 999;
      if (numA !== numB) return numA - numB;
      return String(a.full_name || '').localeCompare(String(b.full_name || ''));
    });

  const studentCourseIndex = courseStudentsForList.findIndex((s: any) =>
    (s.id && s.id === formData.id) ||
    (s.run && formatRut(s.run) === formatRut(formData.run))
  );

  const calculatedListNumber = (formData.list_number && formData.list_number > 0)
    ? formData.list_number
    : (studentCourseIndex >= 0 ? studentCourseIndex + 1 : 1);

  React.useEffect(() => {
    // 1. Obtener Cursos y Estudiantes desde la base de datos
    fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllStudents(data);
          const uniqueCourses = Array.from(new Set(data.map((s: any) => getStudentCourse(s)))).filter(Boolean) as string[];
          if (uniqueCourses.length > 0) {
            setCoursesList(sortCoursesList(uniqueCourses));
          }
        }
      })
      .catch(() => {});

    fetch('/api/levels', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(levels => {
        if (Array.isArray(levels) && levels.length > 0) {
          const levelNames = levels.map((l: any) => l.name);
          setCoursesList(prev => sortCoursesList(Array.from(new Set([...prev, ...levelNames]))));
        }
      })
      .catch(() => {});

    // 2. Obtener Profesores / Funcionarios desde MySQL XAMPP
    fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(staff => {
        if (Array.isArray(staff) && staff.length > 0) {
          setTeachersList(staff.map((s: any) => ({
            id: s.id || s.user_id,
            name: s.full_name || s.name,
            role: s.job_function || s.role || 'Docente'
          })));
        } else {
          fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(users => {
              if (Array.isArray(users)) {
                setTeachersList(users.map((u: any) => ({
                  id: u.id,
                  name: u.name,
                  role: u.role || 'Docente'
                })));
              }
            }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [token]);

  const populateGuardianFields = (data: { name?: string; phone?: string; email?: string; occupation?: string; relation?: string; education?: string }, targetType: 'guardian' | 'guardian_sec' | 'mother' | 'father') => {
    if (!data || !data.name) return;
    setFormData((prev: any) => {
      const next = { ...prev };
      if (targetType === 'guardian') {
        next.guardian_name = data.name;
        if (data.phone) next.guardian_phone = data.phone;
        if (data.email) next.guardian_email = data.email;
        if (data.occupation) next.guardian_occupation = data.occupation;
        if (data.relation) next.guardian_relation = data.relation;
      } else if (targetType === 'guardian_sec') {
        next.guardian_sec_name = data.name;
        if (data.phone) next.guardian_sec_phone = data.phone;
        if (data.email) next.guardian_sec_email = data.email;
        if (data.occupation) next.guardian_sec_occupation = data.occupation;
        if (data.relation) next.guardian_sec_relation = data.relation;
      } else if (targetType === 'mother') {
        next.mother_name = data.name;
        if (data.phone) next.mother_phone = data.phone;
        if (data.email) next.mother_email = data.email;
        if (data.occupation) next.mother_occupation = data.occupation;
        if (data.education) next.mother_education = data.education;
      } else if (targetType === 'father') {
        next.father_name = data.name;
        if (data.phone) next.father_phone = data.phone;
        if (data.email) next.father_email = data.email;
        if (data.occupation) next.father_occupation = data.occupation;
        if (data.education) next.father_education = data.education;
      }
      return next;
    });

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `âœ¨ Datos de "${data.name}" autocompletados por RUT`,
      showConfirmButton: false,
      timer: 2200
    });
  };

  const handleGuardianRutLookup = async (rut: string, targetType: 'guardian' | 'guardian_sec' | 'mother' | 'father') => {
    const cleanDigits = String(rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
    if (cleanDigits.length <= 4) return;

    // 1. Buscar primero en nÃ³mina cargada en memoria
    const match = allStudents.find((s: any) => {
      const g1 = String(s.guardian_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const g2 = String(s.guardian_sec_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const m = String(s.mother_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const f = String(s.father_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const st = String(s.run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      return g1.includes(cleanDigits) || g2.includes(cleanDigits) || m.includes(cleanDigits) || f.includes(cleanDigits) || st.includes(cleanDigits);
    });

    if (match) {
      let gData: any = null;
      const g1 = String(match.guardian_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const g2 = String(match.guardian_sec_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const m = String(match.mother_run || '').replace(/[^0-9kK]/g, '').toLowerCase();
      const f = String(match.father_run || '').replace(/[^0-9kK]/g, '').toLowerCase();

      if (g1.includes(cleanDigits)) gData = { name: match.guardian_name, phone: match.guardian_phone, email: match.guardian_email, occupation: match.guardian_occupation, relation: match.guardian_relation };
      else if (g2.includes(cleanDigits)) gData = { name: match.guardian_sec_name, phone: match.guardian_sec_phone, email: match.guardian_sec_email, occupation: match.guardian_sec_occupation, relation: match.guardian_sec_relation };
      else if (m.includes(cleanDigits)) gData = { name: match.mother_name, phone: match.mother_phone, email: match.mother_email, occupation: match.mother_occupation, education: match.mother_education, relation: 'Madre' };
      else if (f.includes(cleanDigits)) gData = { name: match.father_name, phone: match.father_phone, email: match.father_email, occupation: match.father_occupation, education: match.father_education, relation: 'Padre' };

      if (gData && gData.name) {
        populateGuardianFields(gData, targetType);
        return;
      }
    }

    // 2. Consulta en tiempo real a la API backend
    try {
      const res = await fetch(`/api/apoderados/lookup?rut=${cleanDigits}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.match && data.match.name) {
          populateGuardianFields(data.match, targetType);
        }
      }
    } catch (_) {}
  };

  const openGuardianSearchModal = async (type: 'guardian' | 'guardian_sec' | 'mother' | 'father') => {
    setTargetGuardianType(type);
    setGuardianSearchQuery('');
    setShowGuardianSearchModal(true);
    setLoadingGuardians(true);

    try {
      const res = await fetch('/api/apoderados/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.guardians)) {
          setRegisteredGuardiansList(data.guardians);
        }
      }
    } catch (_) {
      const gMap = new Map<string, any>();
      allStudents.forEach((s: any) => {
        if (s.guardian_run) gMap.set(s.guardian_run, { run: s.guardian_run, name: s.guardian_name, phone: s.guardian_phone, email: s.guardian_email, occupation: s.guardian_occupation, relation: s.guardian_relation });
        if (s.guardian_sec_run) gMap.set(s.guardian_sec_run, { run: s.guardian_sec_run, name: s.guardian_sec_name, phone: s.guardian_sec_phone, email: s.guardian_sec_email, occupation: s.guardian_sec_occupation, relation: s.guardian_sec_relation });
        if (s.mother_run) gMap.set(s.mother_run, { run: s.mother_run, name: s.mother_name, phone: s.mother_phone, email: s.mother_email, occupation: s.mother_occupation, relation: 'Madre' });
        if (s.father_run) gMap.set(s.father_run, { run: s.father_run, name: s.father_name, phone: s.father_phone, email: s.father_email, occupation: s.father_occupation, relation: 'Padre' });
      });
      setRegisteredGuardiansList(Array.from(gMap.values()));
    } finally {
      setLoadingGuardians(false);
    }
  };

  const selectGuardianFromModal = (gData: any) => {
    populateGuardianFields(gData, targetGuardianType);
    setShowGuardianSearchModal(false);
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      if (field === 'first_name' || field === 'paternal_surname' || field === 'maternal_surname') {
        const fn = field === 'first_name' ? value : (prev.first_name || '');
        const ps = field === 'paternal_surname' ? value : (prev.paternal_surname || '');
        const ms = field === 'maternal_surname' ? value : (prev.maternal_surname || '');
        const full = `${fn} ${ps} ${ms}`.trim();
        if (full) updated.full_name = full;
      }
      return updated;
    });

    if (field === 'guardian_run') handleGuardianRutLookup(value, 'guardian');
    if (field === 'guardian_sec_run') handleGuardianRutLookup(value, 'guardian_sec');
    if (field === 'mother_run') handleGuardianRutLookup(value, 'mother');
    if (field === 'father_run') handleGuardianRutLookup(value, 'father');
  };

  const handleSave = async () => {
    if (readOnly) {
      Swal.fire('Solo Vista', 'Tu perfil solo tiene acceso de consulta e impresiÃ³n en esta ficha.', 'info');
      return;
    }
    try {
      const payload = {
        ...formData,
        anno: formData.anno || 2027,
        enrolled_by_name: formData.enrolled_by_name || user?.name || 'Administrador',
        enrolled_by_run: formData.enrolled_by_run || user?.run || '',
        enrolled_by_role: formData.enrolled_by_role || user?.role || 'Encargado de MatrÃ­cula',
        list_number: formData.list_number !== undefined && formData.list_number !== null ? formData.list_number : calculatedListNumber,
        enrollment_number: formData.enrollment_number || '',
        gender: formData.gender === 'OTRO' ? (formData.gender_custom || 'OTRO') : formData.gender,
        ethnicity: formData.ethnicity === 'Otro' ? (formData.ethnicity_custom || 'Otro') : formData.ethnicity
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      
      Swal.fire({
        title: 'Â¡Ficha Guardada con Ã‰xito!',
        text: 'Los datos del estudiante han sido guardados exitosamente en la base de datos. Â¿Desea imprimir la Ficha Oficial FIDE ahora?',
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ðŸ–¨ï¸ Guardar e Imprimir Ficha FIDE',
        cancelButtonText: 'ðŸ’¾ Solo Guardar'
      }).then((result) => {
        onSave(payload);
        onClose();
        if (result.isConfirmed && onPrint) {
          onPrint(payload);
        }
      });
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', width: '96vw', maxWidth: '1280px', maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Encabezado de la Ventana Modal Distribuido */}
        <div style={{ background: '#4f46e5', color: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Ficha Institucional del Estudiante
              </h2>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '9999px', background: formData.is_retired ? '#ef4444' : '#10b981', color: '#ffffff', fontWeight: 700 }}>
                {formData.is_retired ? 'RETIRADO' : 'MATRICULADO / VIGENTE'}
              </span>
              {readOnly && (
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '9999px', background: '#fef3c7', color: '#92400e', fontWeight: 800 }}>
                  ðŸ‘ï¸ MODO SOLO VISTA
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, background: 'rgba(255,255,255,0.18)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                ðŸ‘¤ {formData.full_name || 'Nuevo Alumno'}
              </span>
              <span style={{ fontSize: '0.85rem', opacity: 0.95 }}>ðŸ†” RUT: <strong>{formData.run || 'Sin registro'}</strong></span>
              <span style={{ fontSize: '0.85rem', opacity: 0.95 }}>ðŸ« Curso: <strong>{getStudentCourse(formData)}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setChecklistMode(formData.is_retired ? 'retiro' : 'matricula');
                setShowChecklistModal(true);
              }}
              className="btn"
              style={{
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Abrir verificaciÃ³n documental de Retiro o MatrÃ­cula"
            >
              <ClipboardList size={13} color="#4f46e5" /> Checklist Documental
            </button>

            {!readOnly && (formData.is_retired ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setChecklistMode('retiro');
                    setShowChecklistModal(true);
                  }}
                  className="btn"
                  style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                  title="Ver o imprimir documentos entregados en el retiro"
                >
                  ðŸšª Doc. Retiro
                </button>
                <button
                  onClick={() => {
                    setFormData((prev: any) => ({ ...prev, is_retired: false }));
                    Swal.fire('Reincorporado', 'Estudiante reincorporado correctamente', 'success');
                  }}
                  className="btn"
                  style={{ background: '#dcfce7', color: '#15803d', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  ðŸ”„ Reincorporar
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  Swal.fire({
                    title: 'Â¿Retirar Estudiante?',
                    text: 'Ingrese motivo o fecha de retiro del alumno:',
                    input: 'text',
                    inputPlaceholder: 'Ej: Traslado a otro establecimiento / Retiro voluntario',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'Confirmar Retiro',
                    cancelButtonText: 'Cancelar'
                  }).then((res) => {
                    if (res.isConfirmed) {
                      setFormData((prev: any) => ({ ...prev, is_retired: true, retirement_reason: res.value }));
                      Swal.fire({
                        title: 'Estudiante Retirado',
                        text: 'Â¿Deseas abrir el Checklist Oficial de Retiro para registrar los documentos que se lleva el apoderado?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'SÃ­, abrir Checklist',
                        cancelButtonText: 'MÃ¡s tarde',
                        confirmButtonColor: '#4f46e5'
                      }).then(subRes => {
                        if (subRes.isConfirmed) {
                          setChecklistMode('retiro');
                          setShowChecklistModal(true);
                        }
                      });
                    }
                  });
                }}
                className="btn"
                style={{ background: '#fee2e2', color: '#be123c', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
              >
                âš ï¸ Retirar Estudiante
              </button>
            ))}

            {!readOnly && (
              <button
                onClick={() => {
                  Swal.fire({
                    title: 'Cambiar de Curso',
                    input: 'select',
                    inputOptions: {
                      '1Â° Medio A': '1Â° Medio A',
                      '1Â° Medio B': '1Â° Medio B',
                      '2Â° Medio A': '2Â° Medio A',
                      '3Â° Medio TP Telecomunicaciones': '3Â° Medio TP Telecomunicaciones',
                      '4Â° Medio TP Electricidad': '4Â° Medio TP Electricidad'
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Cambiar Curso'
                  }).then((res) => {
                    if (res.isConfirmed && res.value) {
                      setFormData((prev: any) => ({ ...prev, level_name: res.value }));
                      Swal.fire('Cambiado', `Curso cambiado a ${res.value}`, 'success');
                    }
                  });
                }}
                className="btn"
                style={{ background: '#e0e7ff', color: '#3730a3', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
              >
                ðŸ”€ Cambiar de Curso
              </button>
            )}

            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {/* PestaÃ±as de NavegaciÃ³n FIDE/MINEDUC Alineadas en 1 Sola Fila Limpia */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', padding: '0.5rem 1.25rem 0 1.25rem', gap: '0.5rem', flexWrap: 'nowrap', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <button
            onClick={() => setActiveTab('personal')}
            style={{ padding: '0.65rem 1.1rem', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', background: activeTab === 'personal' ? '#ffffff' : 'transparent', color: activeTab === 'personal' ? '#4f46e5' : '#475569', boxShadow: activeTab === 'personal' ? '0 -2px 5px rgba(0,0,0,0.04)' : 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <User size={16} /> Datos Personales
          </button>
          <button
            onClick={() => setActiveTab('guardian_main')}
            style={{ padding: '0.65rem 1.1rem', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', background: activeTab === 'guardian_main' ? '#ffffff' : 'transparent', color: activeTab === 'guardian_main' ? '#4f46e5' : '#475569', boxShadow: activeTab === 'guardian_main' ? '0 -2px 5px rgba(0,0,0,0.04)' : 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Shield size={16} /> Apoderado Titular
          </button>
          <button
            onClick={() => setActiveTab('guardian_secondary')}
            style={{ padding: '0.65rem 1.1rem', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', background: activeTab === 'guardian_secondary' ? '#ffffff' : 'transparent', color: activeTab === 'guardian_secondary' ? '#4f46e5' : '#475569', boxShadow: activeTab === 'guardian_secondary' ? '0 -2px 5px rgba(0,0,0,0.04)' : 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Shield size={16} /> Apoderado Suplente
          </button>
          <button
            onClick={() => setActiveTab('parents_family')}
            style={{ padding: '0.65rem 1.1rem', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', background: activeTab === 'parents_family' ? '#ffffff' : 'transparent', color: activeTab === 'parents_family' ? '#4f46e5' : '#475569', boxShadow: activeTab === 'parents_family' ? '0 -2px 5px rgba(0,0,0,0.04)' : 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={16} /> Padres y Familia
          </button>
          <button
            onClick={() => setActiveTab('health_sep')}
            style={{ padding: '0.65rem 1.1rem', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', background: activeTab === 'health_sep' ? '#ffffff' : 'transparent', color: activeTab === 'health_sep' ? '#4f46e5' : '#475569', boxShadow: activeTab === 'health_sep' ? '0 -2px 5px rgba(0,0,0,0.04)' : 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Heart size={16} /> Salud y PIE / SEP
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
          
          {/* SECCIÃ“N 1: DATOS PERSONALES DEL ESTUDIANTE */}
          {activeTab === 'personal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* TARJETA 1: IDENTIFICACIÃ“N Y NOMBRES DESGLOSADOS */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
                  <h4 style={{ color: '#4f46e5', margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ðŸ‘¤ Nombres y Apellidos Desglosados del Estudiante
                  </h4>
                  <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                    InformaciÃ³n oficial de filiaciÃ³n del alumno segÃºn CÃ©dula de Identidad o Certificado de Nacimiento MINEDUC
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem 1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Nombres del Alumno(a)</label>
                    <input
                      type="text"
                      value={formData.first_name || ''}
                      onChange={e => handleChange('first_name', e.target.value)}
                      placeholder="Ej: Juan Esteban"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Apellido Paterno</label>
                    <input
                      type="text"
                      value={formData.paternal_surname || ''}
                      onChange={e => handleChange('paternal_surname', e.target.value)}
                      placeholder="Ej: PÃ©rez"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Apellido Materno</label>
                    <input
                      type="text"
                      value={formData.maternal_surname || ''}
                      onChange={e => handleChange('maternal_surname', e.target.value)}
                      placeholder="Ej: GonzÃ¡lez"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>Nombre Completo Unificado (Fide / Mineduc)</label>
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={e => handleChange('full_name', e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* TARJETA 2: CÃ‰DULA & DATOS DEMOGRÃFICOS Y PUEBLOS ORIGINARIOS */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem', marginBottom: '1.25rem' }}>
                  <h4 style={{ color: '#0f172a', margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ðŸ†” CÃ©dula, DemografÃ­a & Pueblo Originario
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem 1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>RUT Alumno</label>
                    <input
                      type="text"
                      value={formData.run || ''}
                      onChange={e => handleChange('run', formatRut(e.target.value))}
                      placeholder="12.345.678-9"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#4338ca', marginBottom: '0.4rem' }}>NÂ° de MatrÃ­cula (Ãšnico)</label>
                    <input
                      type="text"
                      value={formData.enrollment_number || ''}
                      onChange={e => handleChange('enrollment_number', e.target.value)}
                      placeholder="2026-001"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '2px solid #6366f1', fontWeight: 800, color: '#312e81', fontSize: '0.85rem', background: '#f5f3ff', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>NÂ° de Lista en Libro</label>
                    <input
                      type="number"
                      value={formData.list_number !== undefined && formData.list_number !== null ? formData.list_number : calculatedListNumber}
                      onChange={e => handleChange('list_number', parseInt(e.target.value, 10) || 1)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#0284c7', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Fecha de Nacimiento</label>
                                        <input
                      type="date"
                      value={formatDateForInput(formData.birth_date)}
                      onChange={e => handleChange('birth_date', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                    <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#2563eb', fontWeight: 700 }}>
                      â³ Edad: {calculateExactAge(formData.birth_date)}
                    </div>
                    
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
                  {/* SEXO / GÃ‰NERO */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Sexo</label>
                    <select
                      value={String(formData.gender || 'M').toUpperCase() === 'FEMENINO' ? 'F' : (String(formData.gender || 'M').toUpperCase() === 'MASCULINO' ? 'M' : String(formData.gender || 'M').toUpperCase())}
                      onChange={e => handleChange('gender', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem', boxSizing: 'border-box' }}
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="OTRO">Otro (Especificar)</option>
                    </select>
                    {formData.gender === 'OTRO' && (
                      <input
                        type="text"
                        value={formData.gender_custom || ''}
                        onChange={e => handleChange('gender_custom', e.target.value)}
                        placeholder="Ingresar gÃ©nero manualmente..."
                        style={{ width: '100%', marginTop: '0.4rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>

                  {/* ETNIA / PUEBLO ORIGINARIO */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Etnia / Pueblo Originario</label>
                    <select
                      value={formData.ethnicity || 'Ninguno'}
                      onChange={e => handleChange('ethnicity', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem', boxSizing: 'border-box' }}
                    >
                      <option value="Ninguno">No pertenece a pueblo originario</option>
                      <option value="Mapuche">Mapuche</option>
                      <option value="Aymara">Aymara</option>
                      <option value="Rapa Nui">Rapa Nui (Pascuense)</option>
                      <option value="AtacameÃ±o">AtacameÃ±o (Likan Antai)</option>
                      <option value="Quechua">Quechua</option>
                      <option value="Colla">Colla</option>
                      <option value="Diaguita">Diaguita</option>
                      <option value="KawÃ©sqar">KawÃ©sqar</option>
                      <option value="YagÃ¡n">YagÃ¡n (YÃ¡mana)</option>
                      <option value="Chango">Chango</option>
                      <option value="Otro">Otro (Especificar)</option>
                    </select>
                    {formData.ethnicity === 'Otro' && (
                      <input
                        type="text"
                        value={formData.ethnicity_custom || ''}
                        onChange={e => handleChange('ethnicity_custom', e.target.value)}
                        placeholder="Ingresar pueblo originario..."
                        style={{ width: '100%', marginTop: '0.4rem', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>

                  {/* NACIONALIDAD */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Nacionalidad</label>
                    <input
                      type="text"
                      value={formData.nationality || 'Chilena'}
                      onChange={e => handleChange('nationality', e.target.value)}
                      placeholder="Chilena, Venezolana, etc."
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                    
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Estado Civil</label>
                    <input
                      type="text"
                      value={formData.marital_status || 'Soltero/a'}
                      onChange={e => handleChange('marital_status', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                    
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>ReligiÃ³n / Creencia</label>
                    <input
                      type="text"
                      value={formData.religion || 'Ninguna'}
                      onChange={e => handleChange('religion', e.target.value)}
                      placeholder="EvangÃ©lica, CatÃ³lica, etc."
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                    
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>PrevisiÃ³n de Salud</label>
                    <select
                      value={formData.health_system || 'Fonasa A'}
                      onChange={e => handleChange('health_system', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    >
                      <option value="Fonasa A">Fonasa A</option>
                      <option value="Fonasa B">Fonasa B</option>
                      <option value="Fonasa C">Fonasa C</option>
                      <option value="Fonasa D">Fonasa D</option>
                      <option value="Isapre">Isapre</option>
                      <option value="Ninguna">Ninguna / Particular</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* TARJETA: FUNCIONARIO RESPONSABLE DE MATRÃCULA & PERÃODO LECTIVO */}
              <div style={{ background: '#ffffff', border: '1.5px solid #c7d2fe', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.05)' }}>
                <div style={{ borderBottom: '1px solid #e0e7ff', paddingBottom: '0.6rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ color: '#3730a3', margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      âœï¸ Funcionario que Matricula & PerÃ­odo Lectivo (Ficha Oficial)
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                      Datos del funcionario que realiza o registra la matrÃ­cula. SaldrÃ¡n impresos en la Ficha Oficial FIDE para saber a quiÃ©n consultar si falta documentaciÃ³n.
                    </p>
                  </div>
                  {user && (
                    <span style={{ fontSize: '0.74rem', background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.65rem', borderRadius: '6px', fontWeight: 700 }}>
                      SesiÃ³n Activa: {user.name} ({user.role})
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem 1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3730a3', marginBottom: '0.4rem' }}>AÃ±o Lectivo MatrÃ­cula</label>
                    <select
                      value={formData.anno || 2027}
                      onChange={e => handleChange('anno', parseInt(e.target.value, 10))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '2px solid #6366f1', fontWeight: 800, color: '#312e81', fontSize: '0.85rem', background: '#f5f3ff', boxSizing: 'border-box' }}
                    >
                      <option value={2026}>AÃ±o Escolar 2026</option>
                      <option value={2027}>AÃ±o Escolar 2027 (PrÃ³ximo AÃ±o)</option>
                      <option value={2028}>AÃ±o Escolar 2028</option>
                      <option value={2029}>AÃ±o Escolar 2029</option>
                      <option value={2030}>AÃ±o Escolar 2030</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Nombre y Apellidos Funcionario</label>
                    <input
                      type="text"
                      value={formData.enrolled_by_name || ''}
                      onChange={e => handleChange('enrolled_by_name', e.target.value)}
                      placeholder="Nombre y Apellidos del funcionario"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box', color: '#0f172a' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>RUT Funcionario</label>
                    <input
                      type="text"
                      value={formData.enrolled_by_run || ''}
                      onChange={e => handleChange('enrolled_by_run', formatRut(e.target.value))}
                      placeholder="12.345.678-9"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box', color: '#4f46e5' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Cargo / FunciÃ³n</label>
                    <input
                      type="text"
                      value={formData.enrolled_by_role || ''}
                      onChange={e => handleChange('enrolled_by_role', e.target.value)}
                      placeholder="Ej: Encargado de MatrÃ­cula / Administrativo"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem', boxSizing: 'border-box', color: '#334155' }}
                    />
                  </div>
                </div>
              </div>

              {/* TARJETA 3: ASIGNACIÃ“N ACADÃ‰MICA Y CONTACTO HOGAR */}
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem', marginBottom: '1.25rem' }}>
                  <h4 style={{ color: '#0f172a', margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ðŸ« AsignaciÃ³n Escolar & Domicilio del Estudiante
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem 1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Curso / Nivel</label>
                    <select
                      value={getStudentCourse(formData)}
                      onChange={e => {
                        const newCourse = e.target.value;
                        handleChange('level_name', newCourse);
                        handleChange('desc_grado', newCourse);
                        const assignedTeacher = allStudents.find((s: any) => getStudentCourse(s) === newCourse && s.profesor_jefe)?.profesor_jefe;
                        if (assignedTeacher) {
                          handleChange('profesor_jefe', assignedTeacher);
                        }
                      }}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', boxSizing: 'border-box', background: '#ffffff', color: '#1e1b4b' }}
                    >
                      <option value="">-- Seleccionar Curso --</option>
                      {coursesList.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Profesor Jefe Asignado</label>
                    <select
                      value={formData.profesor_jefe || (allStudents.find((s: any) => getStudentCourse(s) === getStudentCourse(formData) && s.profesor_jefe)?.profesor_jefe) || ''}
                      onChange={e => handleChange('profesor_jefe', e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box', background: '#ffffff', color: '#1e1b4b', fontWeight: 700 }}
                    >
                      <option value="">-- Seleccionar Profesor Jefe --</option>
                      {(formData.profesor_jefe || (allStudents.find((s: any) => getStudentCourse(s) === getStudentCourse(formData) && s.profesor_jefe)?.profesor_jefe)) &&
                       !teachersList.some(t => t.name === (formData.profesor_jefe || allStudents.find((s: any) => getStudentCourse(s) === getStudentCourse(formData) && s.profesor_jefe)?.profesor_jefe)) && (
                        <option key="fallback-pj" value={formData.profesor_jefe || allStudents.find((s: any) => getStudentCourse(s) === getStudentCourse(formData) && s.profesor_jefe)?.profesor_jefe}>
                          {formData.profesor_jefe || allStudents.find((s: any) => getStudentCourse(s) === getStudentCourse(formData) && s.profesor_jefe)?.profesor_jefe}
                        </option>
                      )}
                      {teachersList.map(t => (
                        <option key={t.id || t.name} value={t.name}>{t.name} ({t.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>DirecciÃ³n / Domicilio</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={e => handleChange('address', e.target.value)}
                      placeholder="Av. O'Higgins 450, ChillÃ¡n"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                    
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* SECCIÃ“N 2: APODERADO TITULAR */}
          {activeTab === 'guardian_main' && (
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem', marginBottom: '1.25rem' }}>
                <h4 style={{ color: '#4f46e5', margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ðŸ›¡ï¸ InformaciÃ³n del Apoderado Titular (Primer Responsable)
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                  Persona responsable directa matriculante ante el establecimiento y firma de documentos oficiales
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem 1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>RUT Apoderado Titular</label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input type="text" value={formData.guardian_run || ''} onChange={e => handleChange('guardian_run', formatRut(e.target.value))} placeholder="12.345.678-9" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }} />
                    <button
                      type="button"
                      onClick={() => openGuardianSearchModal('guardian')}
                      title="Buscar y seleccionar apoderado registrado"
                      style={{ padding: '0.6rem 0.75rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Nombre Completo Apoderado Titular</label>
                  <input type="text" value={formData.guardian_name || ''} onChange={e => handleChange('guardian_name', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Parentesco / VÃ­nculo</label>
                  <input type="text" value={formData.guardian_relation || ''} onChange={e => handleChange('guardian_relation', e.target.value)} placeholder="Madre / Padre / Tutor Legal" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>TelÃ©fono Contacto Directo</label>
                  <input type="text" value={formData.guardian_phone || ''} onFocus={e => { if (!e.target.value) handleChange('guardian_phone', '+56'); }} onChange={e => handleChange('guardian_phone', formatPhone(e.target.value))} placeholder="+56912345678" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Correo ElectrÃ³nico</label>
                  <input type="email" value={formData.guardian_email || ''} onChange={e => handleChange('guardian_email', e.target.value)} placeholder="apoderado@correo.cl" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>OcupaciÃ³n / ProfesiÃ³n</label>
                  <input type="text" value={formData.guardian_occupation || ''} onChange={e => handleChange('guardian_occupation', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
              </div>
            </div>
          )}

          {/* SECCIÃ“N 3: APODERADO SUPLENTE */}
          {activeTab === 'guardian_secondary' && (
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem', marginBottom: '1.25rem' }}>
                <h4 style={{ color: '#4f46e5', margin: 0, fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ðŸ›¡ï¸ Registro de Apoderado Suplente (Segundo Responsable)
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                  Persona autorizada institucionalmente en caso de emergencia o ausencia del apoderado titular
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem 1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>RUT Apoderado Suplente</label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input type="text" value={formData.guardian_sec_run || ''} onChange={e => handleChange('guardian_sec_run', formatRut(e.target.value))} placeholder="12.345.678-9" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }} />
                    <button
                      type="button"
                      onClick={() => openGuardianSearchModal('guardian_sec')}
                      title="Buscar y seleccionar apoderado registrado"
                      style={{ padding: '0.6rem 0.75rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Nombre Completo Apoderado Suplente</label>
                  <input type="text" value={formData.guardian_sec_name || ''} onChange={e => handleChange('guardian_sec_name', e.target.value)} placeholder="Nombre y Apellidos" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Parentesco / VÃ­nculo</label>
                  <select value={formData.guardian_sec_relation || 'Abuelo/a'} onChange={e => handleChange('guardian_sec_relation', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}>
                    <option value="Abuelo/a">Abuelo / Abuela</option>
                    <option value="TÃ­o/a">TÃ­o / TÃ­a</option>
                    <option value="Hermano/a">Hermano / Hermana Mayor</option>
                    <option value="Padre/Madre">Padre / Madre</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Otro">Otro Familiar</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>TelÃ©fono de Contacto Directo</label>
                  <input type="text" value={formData.guardian_sec_phone || ''} onFocus={e => { if (!e.target.value) handleChange('guardian_sec_phone', '+56'); }} onChange={e => handleChange('guardian_sec_phone', formatPhone(e.target.value))} placeholder="+56912345678" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Correo ElectrÃ³nico</label>
                  <input type="email" value={formData.guardian_sec_email || ''} onChange={e => handleChange('guardian_sec_email', e.target.value)} placeholder="suplente@correo.cl" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>OcupaciÃ³n / ProfesiÃ³n</label>
                  <input type="text" value={formData.guardian_sec_occupation || ''} onChange={e => handleChange('guardian_sec_occupation', e.target.value)} placeholder="Ej: Comerciante / TÃ©cnico" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                </div>
              </div>
            </div>
          )}

          {/* SECCIÃ“N 4: PADRES Y FAMILIA (PADRE, MADRE U OTRO TUTOR) */}
          {activeTab === 'parents_family' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* SUB-SECCIÃ“N MADRE */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  ðŸ‘© Datos BiolÃ³gicos o Legales de la Madre
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Nombre Completo Madre</label>
                    <input type="text" value={formData.mother_name || ''} onChange={e => handleChange('mother_name', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>RUT Madre</label>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input type="text" value={formData.mother_run || ''} onChange={e => handleChange('mother_run', formatRut(e.target.value))} placeholder="12.345.678-9" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem' }} />
                      <button
                        type="button"
                        onClick={() => openGuardianSearchModal('mother')}
                        title="Buscar y seleccionar apoderada (madre) registrada"
                        style={{ padding: '0.6rem 0.75rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Search size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>TelÃ©fono Madre</label>
                    <input type="text" value={formData.mother_phone || ''} onFocus={e => { if (!e.target.value) handleChange('mother_phone', '+56'); }} onChange={e => handleChange('mother_phone', formatPhone(e.target.value))} placeholder="+56912345678" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Email Madre</label>
                    <input type="email" value={formData.mother_email || ''} onChange={e => handleChange('mother_email', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Nivel Educacional</label>
                    <input type="text" value={formData.mother_education || ''} onChange={e => handleChange('mother_education', e.target.value)} placeholder="Ej: Media Completa / Superior" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>OcupaciÃ³n / Empleo</label>
                    <input type="text" value={formData.mother_occupation || ''} onChange={e => handleChange('mother_occupation', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>

              {/* SUB-SECCIÃ“N PADRE */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  ðŸ‘¨ Datos BiolÃ³gicos o Legales del Padre
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Nombre Completo Padre</label>
                    <input type="text" value={formData.father_name || ''} onChange={e => handleChange('father_name', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>RUT Padre</label>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input type="text" value={formData.father_run || ''} onChange={e => handleChange('father_run', formatRut(e.target.value))} placeholder="12.345.678-9" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem' }} />
                      <button
                        type="button"
                        onClick={() => openGuardianSearchModal('father')}
                        title="Buscar y seleccionar apoderado (padre) registrado"
                        style={{ padding: '0.6rem 0.75rem', background: '#4f46e5', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Search size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>TelÃ©fono Padre</label>
                    <input type="text" value={formData.father_phone || ''} onFocus={e => { if (!e.target.value) handleChange('father_phone', '+56'); }} onChange={e => handleChange('father_phone', formatPhone(e.target.value))} placeholder="+56912345678" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Email Padre</label>
                    <input type="email" value={formData.father_email || ''} onChange={e => handleChange('father_email', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Nivel Educacional</label>
                    <input type="text" value={formData.father_education || ''} onChange={e => handleChange('father_education', e.target.value)} placeholder="Ej: Media Completa / Universitario" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>OcupaciÃ³n / Empleo</label>
                    <input type="text" value={formData.father_occupation || ''} onChange={e => handleChange('father_occupation', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>

              {/* SUB-SECCIÃ“N INFORMACIÃ“N DEL HOGAR Y OTROS TUTORES */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: '#3730a3', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  ðŸ  Convivencia Familiar & Tutores Legales
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3730a3', marginBottom: '0.35rem' }}>Alumno Vive Con</label>
                    <select value={formData.lives_with || 'Ambos Padres'} onChange={e => handleChange('lives_with', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}>
                      <option value="Ambos Padres">Ambos Padres</option>
                      <option value="Solo Madre">Solo Madre</option>
                      <option value="Solo Padre">Solo Padre</option>
                      <option value="Abuelos">Abuelos / Abuelas</option>
                      <option value="Tutor Legal">Tutor Legal</option>
                      <option value="Otro">Otro Familiar</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3730a3', marginBottom: '0.35rem' }}>NÂ° Integrantes Grupo Familiar</label>
                    <input type="number" value={formData.family_count || 4} onChange={e => handleChange('family_count', parseInt(e.target.value, 10) || 4)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#3730a3', marginBottom: '0.35rem' }}>Tutor u Otro Familiar Responsable</label>
                    <input type="text" value={formData.other_tutor_name || ''} onChange={e => handleChange('other_tutor_name', e.target.value)} placeholder="Nombre de Tutor Adicional" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>

              {/* SUB-SECCIÃ“N HERMANOS EN EL ESTABLECIMIENTO */}
              <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ color: '#166534', fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      ðŸ§’ Hermanos Estudiando en el Establecimiento Liceo Pro
                    </h4>
                    <p style={{ color: '#15803d', fontSize: '0.78rem', margin: '0.2rem 0 0 0' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setShowSiblingModal(true)}
                          className="btn btn-secondary"
                          style={{ background: '#0284c7', color: '#ffffff', borderColor: '#0284c7', padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          ðŸ” Buscar / Seleccionar Hermano(a) del Liceo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentSiblings = formData.siblings || [];
                            setFormData((prev: any) => ({
                              ...prev,
                              siblings: [...currentSiblings, { name: '', run: '', level: '1Â° Medio A', relation: 'Hermano/a' }]
                            }));
                          }}
                          className="btn btn-primary"
                          style={{ background: '#16a34a', borderColor: '#16a34a', padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          + Agregar Hermano(a) Manual
                        </button>
                      </div>
                    </p>
                  </div>
                </div>

                {(!formData.siblings || formData.siblings.length === 0) ? (
                  <p style={{ fontSize: '0.85rem', color: '#15803d', fontStyle: 'italic', margin: 0 }}>
                    No se han registrado hermanos estudiando en el establecimiento. Presione "ðŸ” Buscar / Seleccionar Hermano(a) del Liceo" o "+ Agregar Hermano(a) Manual".
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {formData.siblings.map((sib: any, idx: number) => (
                      <div key={idx} style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>Nombre del Hermano(a)</label>
                          <input
                            type="text"
                            value={sib.name || ''}
                            onChange={e => {
                              const updated = [...formData.siblings];
                              updated[idx].name = e.target.value;
                              setFormData((prev: any) => ({ ...prev, siblings: updated }));
                            }}
                            placeholder="Nombre y Apellidos"
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>RUT Hermano(a)</label>
                          <input
                            type="text"
                            value={sib.run || ''}
                            onChange={e => {
                              const updated = [...formData.siblings];
                              updated[idx].run = formatRut(e.target.value);
                              setFormData((prev: any) => ({ ...prev, siblings: updated }));
                            }}
                            placeholder="12.345.678-9"
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.82rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>Curso en LTP</label>
                          <input
                            type="text"
                            value={sib.level || ''}
                            onChange={e => {
                              const updated = [...formData.siblings];
                              updated[idx].level = e.target.value;
                              setFormData((prev: any) => ({ ...prev, siblings: updated }));
                            }}
                            placeholder="Ej: 7Â° BÃ¡sico A"
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>VÃ­nculo</label>
                          <select
                            value={sib.relation || 'Hermano/a ConsanguÃ­neo'}
                            onChange={e => {
                              const updated = [...formData.siblings];
                              updated[idx].relation = e.target.value;
                              setFormData((prev: any) => ({ ...prev, siblings: updated }));
                            }}
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                          >
                            <option value="Hermano/a ConsanguÃ­neo">Hermano/a ConsanguÃ­neo</option>
                            <option value="Medio Hermano/a">Medio Hermano/a</option>
                            <option value="Hermano/a Crianza">Hermano/a Crianza</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.siblings.filter((_: any, i: number) => i !== idx);
                            setFormData((prev: any) => ({ ...prev, siblings: updated }));
                          }}
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.45rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginTop: '1.2rem' }}
                        >
                          âœ• Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÃ“N 5: SALUD Y PIE / SEP */}
          {activeTab === 'health_sep' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* SALUD Y ALERGIAS */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  ðŸ¥ Ficha MÃ©dica, PrevisiÃ³n & Salud
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Sistema de PrevisiÃ³n de Salud</label>
                    <select value={formData.health_system || 'Fonasa A'} onChange={e => handleChange('health_system', e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                      <option value="Fonasa A">Fonasa Tramo A</option>
                      <option value="Fonasa B">Fonasa Tramo B</option>
                      <option value="Fonasa C">Fonasa Tramo C</option>
                      <option value="Fonasa D">Fonasa Tramo D</option>
                      <option value="Isapre">Isapre</option>
                      <option value="Particular">Particular / Sin PrevisiÃ³n</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Grupo SanguÃ­neo</label>
                    <input type="text" value={formData.blood_type || ''} onChange={e => handleChange('blood_type', e.target.value)} placeholder="Ej: ORH+" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Alergias o Contraindicaciones</label>
                    <input type="text" value={formData.allergies || ''} onChange={e => handleChange('allergies', e.target.value)} placeholder="Ej: Penicilina / Polen" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                </div>
              </div>

              {/* PROGRAMA DE INTEGRACIÃ“N ESCOLAR (PIE) */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: '#4f46e5', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  ðŸŒŸ Programa de IntegraciÃ³n Escolar (PIE) & Prioridad SEP
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Pertenece a Programa PIE</label>
                    <select value={formData.pie_program ? 'SÃ­' : 'No'} onChange={e => handleChange('pie_program', e.target.value === 'SÃ­')} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: formData.pie_program ? '#16a34a' : '#64748b', fontSize: '0.85rem' }}>
                      <option value="No">No pertenece a PIE</option>
                      <option value="SÃ­">SÃ­ pertenece a PIE</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>DiagnÃ³stico PIE Registrado</label>
                    <input type="text" value={formData.pie_diagnosis || ''} onChange={e => handleChange('pie_diagnosis', e.target.value)} placeholder="Ej: TEL Mixto / DEA / TDAH" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Prioridad SEP / Alumno Prioritario</label>
                    <select value={formData.sep_priority ? 'SÃ­' : 'No'} onChange={e => handleChange('sep_priority', e.target.value === 'SÃ­')} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, color: formData.sep_priority ? '#d97706' : '#64748b', fontSize: '0.85rem' }}>
                      <option value="No">No Prioritario</option>
                      <option value="SÃ­">SÃ­ Prioritario SEP</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0f9ff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #bae6fd', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>
                    <FileText size={16} /> Formularios Ãšnicos de ReevaluaciÃ³n Integral (Decreto 170 / MINEDUC)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      sessionStorage.setItem('ltp_admin_tab', 'mineduc_reports');
                      window.dispatchEvent(new CustomEvent('ltp_navigate_tab', { detail: 'mineduc_reports' }));
                    }}
                    style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Gestionar en Informes MINEDUC â†’
                  </button>
                </div>
              </div>

              {/* SEGURO DE SALUD COMPLEMENTARIO */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: '#0284c7', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  ðŸ›¡ï¸ Seguro de Salud Complementario
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem 1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Â¿Posee Seguro Complementario?
                    </label>
                    <select
                      value={formData.has_complementary_insurance ? 'SÃ­' : 'No'}
                      onChange={e => handleChange('has_complementary_insurance', e.target.value === 'SÃ­' ? 1 : 0)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 700,
                        color: formData.has_complementary_insurance ? '#0284c7' : '#64748b',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="No">No posee seguro complementario</option>
                      <option value="SÃ­">SÃ­ posee seguro complementario</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Nombre de la CompaÃ±Ã­a / Aseguradora
                    </label>
                    <input
                      type="text"
                      disabled={!formData.has_complementary_insurance}
                      value={formData.complementary_insurance_name || ''}
                      onChange={e => handleChange('complementary_insurance_name', e.target.value)}
                      placeholder={formData.has_complementary_insurance ? 'Ej: MetLife / BiceVida / ClÃ­nica...' : 'No aplica'}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: formData.has_complementary_insurance ? '#ffffff' : '#f1f5f9'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Detalle de Cobertura
                    </label>
                    <input
                      type="text"
                      disabled={!formData.has_complementary_insurance}
                      value={formData.complementary_insurance_coverage || ''}
                      onChange={e => handleChange('complementary_insurance_coverage', e.target.value)}
                      placeholder={formData.has_complementary_insurance ? 'Ej: Accidentes, hospitalizaciÃ³n, cirugÃ­as...' : 'No aplica'}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: formData.has_complementary_insurance ? '#ffffff' : '#f1f5f9'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* AUTORIZACIÃ“N DE USO DE IMAGEN DEL ESTUDIANTE */}
              <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  ðŸ“¸ AutorizaciÃ³n de Uso de Imagen Institucional
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Modalidad de AutorizaciÃ³n de Imagen:
                    </label>
                    <select
                      value={formData.image_auth_scope || (formData.authorize_image_use ? 'personal_y_grupal' : 'ninguna')}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({
                          ...prev,
                          image_auth_scope: val,
                          authorize_image_use: val === 'ninguna' ? 0 : 1
                        }));
                      }}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 800,
                        color: formData.authorize_image_use ? '#16a34a' : '#dc2626',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="personal_y_grupal">âœ… SÃ­, Autorizo uso Personal y Grupal</option>
                      <option value="grupal">ðŸ‘¥ SÃ­, Solo uso Grupal (Actos y Salidas)</option>
                      <option value="personal">ðŸ‘¤ SÃ­, Solo uso Personal / Individual</option>
                      <option value="ninguna">â›” No Autorizo uso de imagen</option>
                    </select>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                    <strong style={{ color: '#1e293b', display: 'block', marginBottom: '0.2rem' }}>
                      Consentimiento Informado Institucional:
                    </strong>
                    {(!formData.authorize_image_use || formData.image_auth_scope === 'ninguna') ? (
                      <span>El apoderado <strong>NO autoriza</strong> la captaciÃ³n, registro ni difusiÃ³n de imÃ¡genes o videos del estudiante en ninguna modalidad (ni personal ni grupal).</span>
                    ) : formData.image_auth_scope === 'grupal' ? (
                      <span>El apoderado autoriza la captaciÃ³n y difusiÃ³n <strong>exclusivamente de forma GRUPAL</strong> en actividades de curso, talleres, salidas a terreno y eventos institucionales en medios y redes oficiales del establecimiento, no autorizando registros individuales o en primer plano.</span>
                    ) : formData.image_auth_scope === 'personal' ? (
                      <span>El apoderado autoriza la captaciÃ³n de imÃ¡genes <strong>Ãºnicamente de forma PERSONAL / INDIVIDUAL</strong> para fines pedagÃ³gicos internos, credenciales y registro institucional del estudiante.</span>
                    ) : (
                      <span>El apoderado autoriza la captaciÃ³n, ediciÃ³n y difusiÃ³n de imÃ¡genes y videos del estudiante <strong>tanto de forma personal (individual) como grupal</strong> en actividades curriculares, pedagÃ³gicas, salidas a terreno, talleres y eventos institucionales en medios y redes oficiales del Liceo TÃ©cnico Profesional Campanario Marcos Delucchi Fonck.</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
          </fieldset>
        </div>

        {/* MODAL SELECTOR DE HERMANOS DEL LICEO DESDE SUPABASE */}
        {showSiblingModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
              <div style={{ background: '#166534', color: '#ffffff', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  ðŸ§’ Seleccionar Hermano(a) Matriculado en el Liceo
                </h3>
                <button onClick={() => setShowSiblingModal(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={siblingSearch}
                  onChange={e => setSiblingSearch(e.target.value)}
                  placeholder="ðŸ” Buscar por nombre o RUT del hermano(a)..."
                  style={{ flex: 1, minWidth: '220px', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
                <select
                  value={siblingCourseFilter}
                  onChange={e => setSiblingCourseFilter(e.target.value)}
                  style={{ padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="Todos">ðŸ« Todos los Cursos</option>
                  {coursesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
                {allStudents
                  .filter(s => s.id !== formData.id)
                  .filter(s => {
                    const term = siblingSearch.toLowerCase();
                    const course = getStudentCourse(s);
                    const matchQuery = (s.full_name || '').toLowerCase().includes(term) || (s.run || '').toLowerCase().includes(term);
                    const matchCourse = siblingCourseFilter === 'Todos' || course === siblingCourseFilter;
                    return matchQuery && matchCourse;
                  })
                  .slice(0, 50)
                  .map(st => (
                    <div key={st.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.5rem', background: '#ffffff', transition: 'all 0.15s ease' }}>
                      <div>
                        <strong style={{ color: '#0f172a', fontSize: '0.9rem', display: 'block' }}>{st.full_name}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>RUT: {st.run} | Curso: <strong style={{ color: '#15803d' }}>{getStudentCourse(st)}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const currentSiblings = formData.siblings || [];
                          const newSibling = {
                            name: st.full_name,
                            run: st.run,
                            level: getStudentCourse(st),
                            relation: 'Hermano/a'
                          };
                          setFormData((prev: any) => ({
                            ...prev,
                            siblings: [...currentSiblings, newSibling]
                          }));
                          setShowSiblingModal(false);
                          Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: `Hermano(a) ${st.full_name} agregado(a)`,
                            showConfirmButton: false,
                            timer: 2000
                          });
                        }}
                        className="btn btn-primary"
                        style={{ background: '#16a34a', borderColor: '#16a34a', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        âž• Seleccionar Hermano(a)
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE SELECCIÃ“N DE APODERADOS Y TUTORES REGISTRADOS */}
        {showGuardianSearchModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 3000, padding: '1rem'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '780px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ðŸ” Registro Institucional de Apoderados
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                    Selecciona un apoderado registrado para autocompletar sus datos en la secciÃ³n: <strong style={{ color: '#4f46e5' }}>{targetGuardianType === 'guardian' ? 'Apoderado Titular' : targetGuardianType === 'guardian_sec' ? 'Apoderado Suplente' : targetGuardianType === 'mother' ? 'Madre' : 'Padre'}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuardianSearchModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
                >
                  âœ•
                </button>
              </div>

              {/* BARRA DE BÃšSQUEDA */}
              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={guardianSearchQuery}
                  onChange={e => setGuardianSearchQuery(e.target.value)}
                  placeholder="Filtrar por RUT, Nombre de Apoderado, TelÃ©fono o Alumnos..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* TABLA DE APODERADOS */}
              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                {loadingGuardians ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontWeight: 600 }}>
                    Cargando nÃ³mina de apoderados...
                  </div>
                ) : registeredGuardiansList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No se encontraron apoderados registrados.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                        <th style={{ padding: '0.75rem 1rem' }}>RUT APODERADO</th>
                        <th style={{ padding: '0.75rem 1rem' }}>NOMBRE COMPLETO</th>
                        <th style={{ padding: '0.75rem 1rem' }}>CONTACTO</th>
                        <th style={{ padding: '0.75rem 1rem' }}>PUPILOS ASOCIADOS</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>ACCIÃ“N</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registeredGuardiansList
                        .filter(g => {
                          if (!guardianSearchQuery) return true;
                          const q = guardianSearchQuery.toLowerCase();
                          return String(g.run || '').toLowerCase().includes(q) ||
                                 String(g.name || '').toLowerCase().includes(q) ||
                                 String(g.phone || '').toLowerCase().includes(q) ||
                                 String(g.pupilsSummary || '').toLowerCase().includes(q);
                        })
                        .map((g, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#4f46e5' }}>{g.run || 'Sin RUT'}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>{g.name}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                              <div>ðŸ“ž {g.phone || 'Sin TelÃ©fono'}</div>
                              {g.email && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>âœ‰ï¸ {g.email}</div>}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: '#334155', fontSize: '0.78rem' }}>
                              {g.pupilsSummary || 'Sin datos'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => selectGuardianFromModal(g)}
                                style={{
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '0.4rem 0.85rem',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Seleccionar âž”
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer con Botones */}
        <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            {readOnly && (
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
                ðŸ‘ï¸ Perfil en Modo Solo Vista: puedes consultar todas las pestaÃ±as e imprimir documentos, pero no modificar la ficha.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onClose} className="btn" style={{ background: '#cbd5e1', color: '#1e293b' }}>
              {readOnly ? 'Cerrar Ficha' : 'Cancelar'}
            </button>
            {readOnly ? (
              onPrint && (
                <button onClick={() => onPrint(formData)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#4f46e5' }}>
                  ðŸ–¨ï¸ Imprimir Ficha Oficial
                </button>
              )
            ) : (
              <button onClick={handleSave} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={16} /> Guardar Ficha Completa
              </button>
            )}
          </div>
        </div>

        {/* MODAL CHECKLIST DOCUMENTAL (RETIRO / MATRÃCULA) */}
        <StudentDocumentChecklistModal
          isOpen={showChecklistModal}
          onClose={() => setShowChecklistModal(false)}
          student={formData}
          initialMode={checklistMode}
        />
      </div>
    </div>
  );
};


