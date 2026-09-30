import React, { useState, useEffect } from 'react';
import { Settings, Lock, Unlock, Eye, EyeOff, Plus, Link, BookOpen, UserCheck, ShieldCheck, ListOrdered, FileCheck, Layers, Trash2, Edit, Shield, X, Save, RefreshCw, Search, ArrowUp, ArrowDown, Copy, Mail, CheckSquare, Check, GraduationCap, ExternalLink, Globe, CheckCircle2, AlertCircle, Filter, Building2, School, Users } from 'lucide-react';
import { PermissionsMatrix } from './PermissionsMatrix';
import { ChecklistTemplatesEditor } from './ChecklistTemplatesEditor';
import { CourseSupportModal } from './CourseSupportModal';
import { formatRut } from '../utils/rut';
import { getStudentCourse, isStudentRetired, sortCoursesList, isParvulariaCourse, getDefaultSubjectsForCourse } from '../utils/course';
import Swal from 'sweetalert2';

interface ConfigModuleProps {
  token: string;
}

export const ConfigModule: React.FC<ConfigModuleProps> = ({ token }) => {
  const [subTab, setSubTab] = useState<'teachers' | 'courses' | 'subjects' | 'assignments' | 'homeroom' | 'subject_order' | 'templates' | 'locks' | 'links' | 'permissions' | 'enrollment_config' | 'institution_config' | 'checklists_config'>('courses');
  const [showPlainPassword, setShowPlainPassword] = useState<Record<string, boolean>>({});

  // CONFIGURACIÓN CENTRALIZADA DEL ESTABLECIMIENTO Y DIRECTOR
  const [institutionConfig, setInstitutionConfig] = useState<any>({
    schoolName: 'Liceo Técnico Profesional',
    shortName: 'LTP',
    rbd: '',
    commune: '',
    locality: '',
    region: '',
    dependence: 'Municipal / SLEP',
    directorId: '',
    directorName: '',
    directorRun: '',
    directorEmail: '',
    address: '',
    phone: '',
    email: '',
    calendarEmail: '',
    calendarId: ''
  });
  const [savingInstitution, setSavingInstitution] = useState(false);

  // CONFIGURACIÓN DE FICHA DE MATRÍCULA Y TEXTO DE COMPROMISO
  const [enrollmentConfig, setEnrollmentConfig] = useState<any>({
    commitment_text: "Yo, {GUARDIAN_NAME}, RUN: {GUARDIAN_RUN}, declaro conocer, respetar, cumplir, hacer cumplir y aceptar de forma íntegra el Proyecto Educativo Institucional, el Reglamento de Convivencia Educativa y el Reglamento de Evaluación y Promoción Escolar del Liceo. AUTORIZO LAS SALIDAS DE MI PUPILO (A) a actividades curriculares y extracurriculares programadas fuera del establecimiento (actos, ceremonias, salidas pedagógicas, compromisos deportivos, recreativos y culturales, campañas solidarias y otras...) dentro de la comuna.",
    show_guardian_suplente: true,
    show_health_pie: true,
    show_family_convivencia: true,
    show_religion_ethnicity: true,
    show_school_signatures: true,
    show_student_contacts: true
  });
  const [staffFilter, setStaffFilter] = useState<'Todos' | 'Docente' | 'Asistente'>('Todos');
  const [positionsList, setPositionsList] = useState<any[]>([]);
  const [showPositionsModal, setShowPositionsModal] = useState<boolean>(false);
  const [newPositionName, setNewPositionName] = useState<string>('');
  const [newPositionCategory, setNewPositionCategory] = useState<'Docente' | 'Asistente'>('Docente');
  const [driveWebhookUrl, setDriveWebhookUrl] = useState('');
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [testingDrive, setTestingDrive] = useState(false);
  const [supportCourseModal, setSupportCourseModal] = useState<string | null>(null);

  const fetchDriveStatus = () => {
    if (!token) return;
    fetch('/api/drive/status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setDriveStatus(data);
        if (data && data.webhookUrl) setDriveWebhookUrl(data.webhookUrl);
      })
      .catch(() => {});
  };

  const handleSaveDriveWebhook = async () => {
    if (!driveWebhookUrl.trim().startsWith('http')) {
      Swal.fire('Atención', 'Ingrese una URL válida de Google Apps Script (empieza con https://script.google.com/macros/s/...)', 'warning');
      return;
    }
    setTestingDrive(true);
    try {
      const res = await fetch('/api/drive/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ webhookUrl: driveWebhookUrl.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Google Drive Conectado!',
          text: `Conexión segura y disociada establecida con la cuenta: ${data.user || 'Google Drive'}. Los archivos se guardarán con nombres aleatorios y cifrados.`
        });
        fetchDriveStatus();
      } else {
        Swal.fire('Error', data.error || 'No se pudo verificar la conexión con Google Drive.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', 'Fallo al conectar con el servidor.', 'error');
    } finally {
      setTestingDrive(false);
    }
  };

  const normalizeRoleId = (r: any): string => {
    const raw = String(r || '').trim();
    const low = raw.toLowerCase();
    if (!raw) return 'Docente';
    if (low === 'admin' || low === 'administrador') return 'Admin';
    if (low === 'director' || low === 'directivo' || low === 'directivo / utp' || low === 'utp') return 'Director';
    if (low === 'docente' || low === 'profesor' || low === 'docente de aula') return 'Docente';
    if (low === 'entrevistador' || low === 'convivencia') return 'Entrevistador';
    if (low === 'asistente' || low === 'asistente de la educación' || low === 'asistente de la educacion' || low === 'asistente ed.') return 'Asistente';
    if (low === 'administrativo' || low === 'inspector' || low === 'inspector/a' || low === 'secretario/a') return 'Administrativo';
    if (low === 'profesionales' || low === 'profesional pie' || low === 'pie') return 'Profesionales';
    if (low === 'apoderado') return 'Apoderado';
    if (low === 'visita') return 'Visita';
    return raw;
  };

  const parseRolesList = (rawRoles: any, fallbackRole?: any): string[] => {
    const primary = normalizeRoleId(fallbackRole || 'Docente');
    let list: string[] = [];
    if (Array.isArray(rawRoles)) {
      list = rawRoles.map(normalizeRoleId).filter(Boolean);
    } else if (typeof rawRoles === 'string' && rawRoles.trim() !== '' && rawRoles.trim() !== 'null') {
      try {
        const parsed = JSON.parse(rawRoles);
        if (Array.isArray(parsed)) {
          list = parsed.map(normalizeRoleId).filter(Boolean);
        }
      } catch (_) {
        list = rawRoles
          .replace(/^\[|\]$/g, '')
          .replace(/"/g, '')
          .split(',')
          .map(s => normalizeRoleId(s))
          .filter(Boolean);
      }
    }
    if (list.length === 0) {
      list = [primary];
    } else if (fallbackRole && !list.includes(primary)) {
      list = [primary, ...list];
    }
    return Array.from(new Set(list));
  };

  const fetchUsers = () => {
    fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setUsersList(data.map(s => {
            const primaryRole = normalizeRoleId(s.role || 'Docente');
            const parsedRoles = parseRolesList(s.roles, primaryRole);
            const cleanEmail = s.email && String(s.email) !== 'null' ? String(s.email) : '';
            return {
              id: s.user_id || s.id,
              staff_id: s.staff_id || s.id,
              run: s.run,
              name: s.full_name || s.name,
              email: cleanEmail,
              role: primaryRole,
              roles: parsedRoles,
              staff_type: s.staff_type || (primaryRole === 'Administrativo' || primaryRole === 'Asistente' ? 'Asistente de la Educación' : 'Docente'),
              job_function: s.job_function || 'Docente de Aula',
              password_plain: s.password_plain || 'Profe2026!'
            };
          }));
        } else {
          // Fallback a /api/users
          fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(usrData => {
              if (Array.isArray(usrData)) {
                setUsersList(usrData.map(u => {
                  const primaryRole = normalizeRoleId(u.role || 'Docente');
                  const parsedRoles = parseRolesList(u.roles, primaryRole);
                  return {
                    ...u,
                    email: u.email && String(u.email) !== 'null' ? String(u.email) : '',
                    role: primaryRole,
                    roles: parsedRoles,
                    staff_type: u.staff_type || (primaryRole === 'Administrativo' || primaryRole === 'Asistente' ? 'Asistente de la Educación' : 'Docente'),
                    job_function: u.job_function || 'Docente de Aula'
                  };
                }));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    // Cargar catálogo de cargos institucionales
    fetch('/api/staff-positions', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPositionsList(data);
      })
      .catch(() => {});
  };

  const loadConfigData = () => {
    fetchUsers();

    // 1. Cargar Asignaturas Reales desde la base de datos
    fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSubjectsList(data.map((s, i) => ({ id: s.id || i + 1, name: s.name, order: i + 1 })));
        }
      })
      .catch(() => {});

    // 2. Cargar Asignaciones Docentes Reales desde la base de datos
    fetch('/api/assignments', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((a: any) => {
            let t1 = (a.teacher_name || '').trim();
            let t2 = (a.teacher_name_2 || '').trim();
            if (!t2 && t1.includes(' / ')) {
              const parts = t1.split(' / ');
              t1 = parts[0].trim();
              t2 = parts[1].trim();
            }
            return {
              ...a,
              teacher_name: t1,
              teacher_name_2: t2 || null
            };
          });
          setAssignmentsList(normalized);
        }
      })
      .catch(() => {});

    // 3. Cargar Cursos, Capacidad y Jefaturas guardadas desde la Base de Datos
    Promise.all([
      fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ([]))
    ]).then(([coursesRes, studentsData]) => {
      const savedCourses = (coursesRes && Array.isArray(coursesRes.courses)) ? coursesRes.courses : [];
      const studentsList = Array.isArray(studentsData) ? studentsData : [];
      setAllStudentsList(studentsList);

      const courseMap: Record<string, { enrolled: number; teacher: string; capacity: number }> = {};
      
      // Registrar cursos guardados en la BD primero
      savedCourses.forEach((sc: any) => {
        if (sc.name) {
          courseMap[sc.name] = {
            enrolled: 0,
            teacher: (sc.teacher && sc.teacher !== 'null' && sc.teacher !== 'undefined') ? sc.teacher : 'Sin Asignar',
            capacity: Number(sc.capacity) || 45
          };
        }
      });

      // Mapear matriculados y jefaturas desde los estudiantes
      studentsList.forEach((s: any) => {
        const cName = getStudentCourse(s);
        const cleanT = (s.profesor_jefe && s.profesor_jefe !== 'null' && s.profesor_jefe !== 'undefined') ? s.profesor_jefe : 'Sin Asignar';
        if (!courseMap[cName]) {
          const isTP = cName.includes('Industrial') || cName.includes('Técnico Niños') || cName.includes('Mecánica') || cName.includes('Párvulos');
          const defaultCap = isTP ? 35 : (cName.includes('Pre-kinder') || cName.includes('Kinder') ? 30 : 45);
          courseMap[cName] = {
            enrolled: 0,
            teacher: cleanT,
            capacity: defaultCap
          };
        }
        if (!isStudentRetired(s)) {
          courseMap[cName].enrolled += 1;
        }
        if (cleanT && cleanT !== 'Sin Asignar' && (!courseMap[cName].teacher || courseMap[cName].teacher === 'Sin Asignar')) {
          courseMap[cName].teacher = cleanT;
        }
      });

      const formattedCourses = sortCoursesList(Object.keys(courseMap).map((cName, idx) => ({
        id: idx + 1,
        name: cName,
        capacity: courseMap[cName].capacity,
        enrolled: courseMap[cName].enrolled,
        teacher: courseMap[cName].teacher
      })));

      setCoursesList(formattedCourses);
      const firstGradeable = formattedCourses.find(c => !isParvulariaCourse(c.name));
      if (firstGradeable) {
        setSelectedCourseForOrder(prev => (prev && !isParvulariaCourse(prev)) ? prev : firstGradeable.name);
      } else if (formattedCourses.length > 0) {
        setSelectedCourseForOrder(prev => prev || formattedCourses[0].name);
      }
    }).catch(() => {});

    // 4. Cargar Reglas de Bloqueo de Períodos y Candados
    fetch('/api/config/period-locks', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setLocksList(data);
        }
      })
      .catch(() => {});

    // 5. Cargar Orden de Asignaturas por Curso (Sub-ventana 6.6)
    fetch('/api/config/course-subject-order', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data && data.orders) {
          setCourseSubjectOrders(data.orders);
        }
      })
      .catch(() => {});

    // 6. Cargar Enlaces Institucionales & Plataformas de Interés (Sub-ventana 6.9)
    fetch('/api/institutional-links', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLinksList(data);
        }
      })
      .catch(() => {});
  };

  const [directorNameConfig, setDirectorNameConfig] = useState<string>('');

  useEffect(() => {
    fetch('/api/config/enrollment-settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.commitment_text) {
          setEnrollmentConfig(data);
        }
      })
      .catch(() => {});

    fetch('/api/config/institutional-settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setInstitutionConfig(data);
          if (data.directorName) {
            setDirectorNameConfig(data.directorName);
          }
        }
      })
      .catch(() => {});

    loadConfigData();
    fetchDriveStatus();
  }, [token]);

  const handleSaveInstitutionConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingInstitution(true);
    try {
      const res = await fetch('/api/config/institutional-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(institutionConfig)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInstitutionConfig(data.settings);
        setDirectorNameConfig(data.settings.directorName || '');
        Swal.fire({
          icon: 'success',
          title: '¡Configuración Institucional Actualizada!',
          html: `
            <div style="text-align: left; font-size: 0.9rem; color: #334155;">
              <p>Los datos oficiales han sido guardados centralmente para toda la plataforma:</p>
              <ul style="margin: 0.5rem 0 0.5rem 1.25rem; font-size: 0.85rem;">
                <li><strong>Director(a):</strong> ${data.settings.directorName} (RUN: ${data.settings.directorRun || '—'})</li>
                <li><strong>Establecimiento:</strong> ${data.settings.schoolName} (RBD: ${data.settings.rbd})</li>
                <li><strong>Comuna / Localidad:</strong> ${data.settings.commune}</li>
              </ul>
              <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem;">
                Esta configuración se refleja automáticamente en todos los certificados, informes ministeriales (Decreto 170), actas y documentos oficiales.
              </p>
            </div>
          `,
          confirmButtonColor: '#0284c7'
        });
        fetchUsers();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar la configuración institucional.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Fallo de conexión al guardar los datos institucionales.', 'error');
    } finally {
      setSavingInstitution(false);
    }
  };

  const handlePromoteAcademicYear = () => {
    handleOpenPromotionWizard();
  };

  const handleAddJobPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionName.trim()) {
      Swal.fire('Atención', 'Ingrese el nombre del nuevo cargo u oficio.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/staff-positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ category: newPositionCategory, name: newPositionName.trim() })
      });

      if (res.ok) {
        Swal.fire('Cargo Agregado', `"${newPositionName}" registrado como cargo institucional en la base de datos.`, 'success');
        setNewPositionName('');
        fetchUsers();
      } else {
        Swal.fire('Atención', 'No se pudo registrar el nuevo cargo.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión al servidor.', 'error');
    }
  };

  const handleDeleteJobPosition = async (id: number, name: string) => {
    confirmDelete(name, async () => {
      try {
        const res = await fetch(`/api/staff-positions/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          Swal.fire('Eliminado', `Cargo "${name}" eliminado de la base de datos.`, 'success');
          fetchUsers();
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión.', 'error');
      }
    });
  };

  const handleSaveEnrollmentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/config/enrollment-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(enrollmentConfig)
      });
      if (res.ok) {
        Swal.fire('Configuración Guardada', 'El texto de compromiso y los campos impresos de matrícula se han actualizado correctamente en la base de datos.', 'success');
      } else {
        Swal.fire('Atención', 'No se pudo guardar la configuración.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión al servidor.', 'error');
    }
  };

  // ESTADOS DE EDICIÓN (MODALES)
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState<boolean>(false);
  const [newAssignment, setNewAssignment] = useState({ teacherName: '', teacherName2: '', levelName: '', subjectName: '' });

  // 1. Usuarios (Cargados desde la base de datos)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSendingBatch, setIsSendingBatch] = useState<boolean>(false);

  // 2. Cursos (Cargados dinámicamente desde la base de datos)
  const [coursesList, setCoursesList] = useState<any[]>([]);

  // 3. Asignaturas (Cargadas dinámicamente desde la base de datos)
  const [subjectsList, setSubjectsList] = useState<any[]>([]);

  // 4. Asignaciones Docentes (Cargadas dinámicamente desde la base de datos)
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);

  // 6.6 Orden de Asignaturas por Curso (Sub-ventana 6.6)
  const [selectedCourseForOrder, setSelectedCourseForOrder] = useState<string>('');
  const [courseSubjectOrders, setCourseSubjectOrders] = useState<Record<string, any[]>>({});
  const [newSubjectForCourseOrder, setNewSubjectForCourseOrder] = useState<string>('');
  const [savingCourseOrder, setSavingCourseOrder] = useState<boolean>(false);

  const normalizeStr = (str: any) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const currentCourseSubjects = React.useMemo(() => {
    if (!selectedCourseForOrder) return [];

    // Pre-Kínder y Kínder no tienen asignaturas evaluadas con notas numéricas
    if (isParvulariaCourse(selectedCourseForOrder)) {
      return [];
    }

    // 1. Si ya hay un orden guardado para este curso en el estado / backend
    if (courseSubjectOrders[selectedCourseForOrder] && Array.isArray(courseSubjectOrders[selectedCourseForOrder]) && courseSubjectOrders[selectedCourseForOrder].length > 0) {
      return courseSubjectOrders[selectedCourseForOrder];
    }

    // 2. Si no hay orden personalizado guardado, construirlo a partir de las asignaciones de este curso (6.4 Asignación Docente)
    const normCourse = normalizeStr(selectedCourseForOrder);
    const assignedInCourse = assignmentsList.filter(a => {
      const aLevel = normalizeStr(a.level_name || a.level_id);
      return aLevel === normCourse || normCourse.includes(aLevel) || aLevel.includes(normCourse);
    });

    const uniqueMap = new Map<string, any>();
    assignedInCourse.forEach((a, idx) => {
      const sName = a.subject_name || a.subject_id;
      if (sName && !uniqueMap.has(sName)) {
        uniqueMap.set(sName, {
          id: a.subject_id || `s-${idx + 1}`,
          name: sName,
          teacher: a.teacher_name ? (a.teacher_name + (a.teacher_name_2 ? ` / ${a.teacher_name_2}` : '')) : 'Sin Asignar',
          order: uniqueMap.size + 1,
          is_official: true
        });
      }
    });

    if (uniqueMap.size > 0) {
      return Array.from(uniqueMap.values());
    }

    // Si aún no tiene asignaciones registradas, sugerir asignaturas oficiales según el nivel MINEDUC del curso
    const defaults = getDefaultSubjectsForCourse(selectedCourseForOrder);
    return defaults.map((subName, idx) => {
      const found = subjectsList.find(s => normalizeStr(s.name) === normalizeStr(subName));
      return {
        id: found ? found.id : `s-${idx + 1}`,
        name: subName,
        teacher: 'Sin Asignar',
        order: idx + 1,
        is_official: true
      };
    });
  }, [selectedCourseForOrder, courseSubjectOrders, assignmentsList, subjectsList]);

  const moveCourseSubject = (fromIdx: number, toIdx: number) => {
    if (!selectedCourseForOrder) return;
    const list = [...(courseSubjectOrders[selectedCourseForOrder] || currentCourseSubjects)];
    if (toIdx < 0 || toIdx >= list.length) return;

    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setCourseSubjectOrders(prev => ({
      ...prev,
      [selectedCourseForOrder]: reordered
    }));
  };

  const removeSubjectFromCourseOrder = (subjectName: string) => {
    if (!selectedCourseForOrder) return;
    const list = [...(courseSubjectOrders[selectedCourseForOrder] || currentCourseSubjects)];
    const filtered = list.filter(s => s.name !== subjectName).map((item, idx) => ({ ...item, order: idx + 1 }));
    setCourseSubjectOrders(prev => ({
      ...prev,
      [selectedCourseForOrder]: filtered
    }));
    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: `Asignatura excluida del orden de ${selectedCourseForOrder}`, timer: 1500, showConfirmButton: false });
  };

  const addSubjectToCourseOrder = (subjectName: string) => {
    if (!selectedCourseForOrder || !subjectName) return;
    const list = [...(courseSubjectOrders[selectedCourseForOrder] || currentCourseSubjects)];
    if (list.some(s => s.name === subjectName)) {
      Swal.fire('Atención', `La asignatura "${subjectName}" ya se encuentra en la lista de ${selectedCourseForOrder}.`, 'warning');
      return;
    }

    // Buscar si hay docente asignado para esta asignatura en este curso
    const normCourse = normalizeStr(selectedCourseForOrder);
    const normSub = normalizeStr(subjectName);
    const matchingAssign = assignmentsList.find(a => {
      const aLevel = normalizeStr(a.level_name || a.level_id);
      const aSub = normalizeStr(a.subject_name || a.subject_id);
      return (aLevel === normCourse || normCourse.includes(aLevel)) && (aSub === normSub || normSub.includes(aSub));
    });

    const newItem = {
      id: `subj-${Date.now()}`,
      name: subjectName,
      teacher: matchingAssign ? (matchingAssign.teacher_name + (matchingAssign.teacher_name_2 ? ` / ${matchingAssign.teacher_name_2}` : '')) : 'Sin Asignar',
      order: list.length + 1,
      is_official: true
    };

    const updated = [...list, newItem];
    setCourseSubjectOrders(prev => ({
      ...prev,
      [selectedCourseForOrder]: updated
    }));
    setNewSubjectForCourseOrder('');
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Asignatura agregada a ${selectedCourseForOrder}`, timer: 1500, showConfirmButton: false });
  };

  const saveCourseSubjectOrder = async () => {
    if (!selectedCourseForOrder) return;
    const listToSave = courseSubjectOrders[selectedCourseForOrder] || currentCourseSubjects;
    setSavingCourseOrder(true);

    try {
      const res = await fetch('/api/config/course-subject-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseName: selectedCourseForOrder,
          subjects: listToSave
        })
      });

      if (!res.ok) throw new Error('Error al guardar el orden en el servidor');

      Swal.fire({
        icon: 'success',
        title: '¡Orden de Asignaturas Guardado!',
        text: `Se ha guardado exitosamente el orden oficial de asignaturas para ${selectedCourseForOrder}.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de guardado',
        text: err.message || 'No se pudo guardar el orden de asignaturas.'
      });
    } finally {
      setSavingCourseOrder(false);
    }
  };

  const copyOrderToOtherCourse = async () => {
    if (!selectedCourseForOrder) return;
    const currentList = courseSubjectOrders[selectedCourseForOrder] || currentCourseSubjects;
    const otherCourses = coursesList.filter(c => c.name !== selectedCourseForOrder && !isParvulariaCourse(c.name));

    if (otherCourses.length === 0) {
      Swal.fire('Información', 'No hay otros cursos disponibles para copiar el orden.', 'info');
      return;
    }

    const optionsHtml = otherCourses.map(c => `<option value="${c.name}">${c.name}</option>`).join('');

    const { value: targetCourse } = await Swal.fire({
      title: 'Copiar Orden de Asignaturas',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #334155;">
          <p style="margin-bottom: 0.75rem;">
            Copiar la estructura y orden de asignaturas de <strong>${selectedCourseForOrder}</strong> al siguiente curso:
          </p>
          <select id="swal-target-course" style="width: 100%; padding: 0.6rem; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">
            ${optionsHtml}
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Copiar y Aplicar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const select = document.getElementById('swal-target-course') as HTMLSelectElement;
        return select ? select.value : null;
      }
    });

    if (targetCourse) {
      setCourseSubjectOrders(prev => ({
        ...prev,
        [targetCourse]: currentList
      }));

      // Guardar también en backend
      await fetch('/api/config/course-subject-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseName: targetCourse,
          subjects: currentList
        })
      });

      Swal.fire({
        icon: 'success',
        title: '¡Orden Copiado!',
        text: `El orden de asignaturas se aplicó exitosamente a ${targetCourse}.`,
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // 5. Enlaces Externos & Plataformas de Interés
  const [linksList, setLinksList] = useState<any[]>([]);
  const [editingLink, setEditingLink] = useState<{ isNew?: boolean; id?: string; name: string; url: string; category?: string; color?: string } | null>(null);

  // Asistente de Promoción Escolar y Cierre de Año (2026 -> 2027)
  const [allStudentsList, setAllStudentsList] = useState<any[]>([]);
  const [showPromotionModal, setShowPromotionModal] = useState<boolean>(false);
  const [promotionCourseFilter, setPromotionCourseFilter] = useState<string>('Todos');
  const [promotionSearchTerm, setPromotionSearchTerm] = useState<string>('');
  const [promotionDecisions, setPromotionDecisions] = useState<Record<string, { status: 'PROMOVIDO' | 'REPITENTE' | 'CAMBIO_LICEO' | 'EGRESADO'; targetGrade?: string }>>({});

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink || !editingLink.name || !editingLink.url) {
      Swal.fire('Atención', 'Título y URL del enlace son obligatorios.', 'warning');
      return;
    }
    let updatedList: any[] = [];
    if (editingLink.isNew) {
      const newLnk = {
        id: `lnk_${Date.now()}`,
        name: editingLink.name.trim(),
        url: editingLink.url.trim(),
        category: editingLink.category || 'Plataforma Institucional',
        color: editingLink.color || 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
      };
      updatedList = [...linksList, newLnk];
    } else {
      updatedList = linksList.map(l => l.id === editingLink.id ? { ...l, ...editingLink } : l);
    }
    setLinksList(updatedList);
    setEditingLink(null);

    try {
      const res = await fetch('/api/institutional-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ links: updatedList })
      });
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Plataforma Guardada!',
          text: 'El enlace se ha actualizado exitosamente.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (_) {
      Swal.fire('Error', 'No se pudo guardar el enlace en el servidor.', 'error');
    }
  };

  const handleDeleteLink = (linkId: string, linkName: string) => {
    confirmDelete(linkName, async () => {
      const updatedList = linksList.filter(l => l.id !== linkId);
      setLinksList(updatedList);
      try {
        await fetch('/api/institutional-links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ links: updatedList })
        });
        Swal.fire({
          icon: 'success',
          title: 'Enlace Eliminado',
          text: `"${linkName}" fue removido de plataformas de interés.`,
          timer: 1500,
          showConfirmButton: false
        });
      } catch (_) {}
    });
  };

  const getNextGradeProjection = (currentGrade: string, currentLetter: string = 'A'): string => {
    const low = (currentGrade || '').toLowerCase();
    if (low.includes('pre-kinder') || low.includes('prekinder') || low.includes('1er nivel')) {
      return `Kinder ${currentLetter}`;
    } else if (low.includes('kinder') || low.includes('2° nivel')) {
      return `1° Básico ${currentLetter}`;
    } else if (low.includes('1° básico') || low.includes('1° basico')) {
      return `2° Básico ${currentLetter}`;
    } else if (low.includes('2° básico') || low.includes('2° basico')) {
      return `3° Básico ${currentLetter}`;
    } else if (low.includes('3° básico') || low.includes('3° basico')) {
      return `4° Básico ${currentLetter}`;
    } else if (low.includes('4° básico') || low.includes('4° basico')) {
      return `5° Básico ${currentLetter}`;
    } else if (low.includes('5° básico') || low.includes('5° basico')) {
      return `6° Básico ${currentLetter}`;
    } else if (low.includes('6° básico') || low.includes('6° basico')) {
      return `7° Básico ${currentLetter}`;
    } else if (low.includes('7° básico') || low.includes('7° basico')) {
      return `8° Básico ${currentLetter}`;
    } else if (low.includes('8° básico') || low.includes('8° basico')) {
      return `1° Medio ${currentLetter}`;
    } else if (low.includes('1° medio')) {
      return `2° Medio ${currentLetter}`;
    } else if (low.includes('2° medio')) {
      return `3° Medio Industrial ${currentLetter}`;
    } else if (low.includes('3° medio')) {
      return `4° Medio Industrial ${currentLetter}`;
    } else if (low.includes('4° medio')) {
      return 'Egresado / Licenciado 2026';
    }
    return `${currentGrade} (Siguiente nivel)`;
  };

  const handleOpenPromotionWizard = () => {
    const initialDecisions: Record<string, { status: 'PROMOVIDO' | 'REPITENTE' | 'CAMBIO_LICEO' | 'EGRESADO'; targetGrade?: string }> = {};
    allStudentsList.forEach(s => {
      const cName = (s.desc_grado || '').toLowerCase();
      const is4toMedio = cName.includes('4° medio');
      initialDecisions[s.id] = {
        status: is4toMedio ? 'EGRESADO' : 'PROMOVIDO'
      };
    });
    setPromotionDecisions(initialDecisions);
    setShowPromotionModal(true);
  };

  const handleMarkFilteredAs = (status: 'PROMOVIDO' | 'REPITENTE' | 'CAMBIO_LICEO' | 'EGRESADO') => {
    setPromotionDecisions(prev => {
      const updated = { ...prev };
      allStudentsList.forEach(s => {
        if (isStudentRetired(s)) return;
        const cCourse = getStudentCourse(s);
        if (promotionCourseFilter !== 'Todos' && cCourse !== promotionCourseFilter) return;
        const term = promotionSearchTerm.toLowerCase();
        const fullName = `${s.nombres || ''} ${s.apellido_paterno || ''} ${s.apellido_materno || ''}`.toLowerCase();
        const run = (s.run || '').toLowerCase();
        if (term && !fullName.includes(term) && !run.includes(term)) return;

        updated[s.id] = { status };
      });
      return updated;
    });
  };

  const handleExecutePromotion = async () => {
    let countPromoted = 0;
    let countRepeater = 0;
    let countTransferred = 0;
    let countGraduated = 0;

    const decisionsPayload: any[] = [];

    allStudentsList.forEach(s => {
      const dec = promotionDecisions[s.id] || { status: (s.desc_grado || '').toLowerCase().includes('4° medio') ? 'EGRESADO' : 'PROMOVIDO' };
      if (dec.status === 'PROMOVIDO') countPromoted++;
      else if (dec.status === 'REPITENTE') countRepeater++;
      else if (dec.status === 'CAMBIO_LICEO') countTransferred++;
      else if (dec.status === 'EGRESADO') countGraduated++;

      decisionsPayload.push({
        studentId: s.id,
        run: s.run,
        status: dec.status
      });
    });

    const confirmRes = await Swal.fire({
      title: '¿Confirmar y Ejecutar Promoción Escolar 2026 ➔ 2027?',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #334155; line-height: 1.6;">
          <p>Se procesarán <strong>${allStudentsList.length}</strong> estudiantes con las siguientes decisiones:</p>
          <ul style="margin: 0.5rem 0 1rem 1.25rem;">
            <li>🟢 <strong>Promovidos al siguiente nivel:</strong> ${countPromoted}</li>
            <li>🟡 <strong>Repitentes (permanecen en su nivel):</strong> ${countRepeater}</li>
            <li>🔴 <strong>Cambio de liceo / Traslados:</strong> ${countTransferred}</li>
            <li>🎓 <strong>Egresados (4° Medio):</strong> ${countGraduated}</li>
          </ul>
          <p style="color: #4f46e5; font-weight: 700;">✓ Las calificaciones y registros del año 2026 se mantendrán intactos en la base de datos.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Ejecutar Promoción 2027',
      cancelButtonText: 'Revisar Nómina'
    });

    if (!confirmRes.isConfirmed) return;

    Swal.fire({
      title: 'Procesando Promoción Escolar...',
      text: 'Actualizando nóminas en la base de datos',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await fetch('/api/academic-year/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fromYear: 2026,
          toYear: 2027,
          studentDecisions: decisionsPayload
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowPromotionModal(false);
        Swal.fire({
          icon: 'success',
          title: '¡Promoción Escolar 2027 Completada!',
          html: `
            <div style="text-align: center;">
              <p style="font-size: 1.1rem; font-weight: 700; color: #16a34a; margin-bottom: 0.5rem;">Año Lectivo 2027 Inicializado con Éxito</p>
              <p>
                <strong>${data.promotedCount}</strong> promovidos<br/>
                <strong>${data.repeaterCount}</strong> repitentes<br/>
                <strong>${data.transferredCount}</strong> traslados/retirados<br/>
                <strong>${data.graduatedCount}</strong> egresados
              </p>
            </div>
          `,
          confirmButtonColor: '#4f46e5'
        });
        loadConfigData();
      } else {
        Swal.fire('Error', data.error || 'No se pudo completar la promoción.', 'error');
      }
    } catch (_) {
      Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
  };

  // 6. Bloqueos Semestrales
  const [locksList, setLocksList] = useState<any[]>([]);
  const [showLockModal, setShowLockModal] = useState<boolean>(false);
  const [newLockRule, setNewLockRule] = useState({ levelName: '', subjectName: 'Todas las Asignaturas', period: '1er Semestre', isLocked: true });
  const [quickCourseLock, setQuickCourseLock] = useState({ courseName: '', period: '1er Semestre' });

  const savePeriodLocks = async (newList: any[]) => {
    setLocksList(newList);
    try {
      const res = await fetch('/api/config/period-locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ locks: newList })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.locks)) {
          setLocksList(data.locks);
        }
      }
    } catch (_) {}
  };

  const toggleLock = async (idx: number) => {
    const updated = locksList.map((item, i) => (i === idx ? { ...item, is_locked: !item.is_locked } : item));
    await savePeriodLocks(updated);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: updated[idx].is_locked ? 'warning' : 'success',
      title: `${updated[idx].level_name} (${updated[idx].subject_name} - ${updated[idx].period}): ${updated[idx].is_locked ? '🔒 Bloqueado' : '🔓 Habilitado'}`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  const handleGlobalPeriodLock = (period: string, lock: boolean) => {
    Swal.fire({
      title: `¿${lock ? 'Bloquear' : 'Habilitar'} todo el ${period}?`,
      text: lock
        ? `Todos los cursos y asignaturas quedarán cerrados para edición de calificaciones en el ${period}.`
        : `Se habilitará la edición de calificaciones para todos los cursos en el ${period}.`,
      icon: lock ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: lock ? '#ef4444' : '#16a34a',
      confirmButtonText: lock ? 'Sí, Bloquear Todo' : 'Sí, Habilitar Todo',
      cancelButtonText: 'Cancelar'
    }).then(async result => {
      if (result.isConfirmed) {
        const globalId = `global_${period.replace(/\s+/g, '_').toLowerCase()}`;
        const hasGlobal = locksList.some(
          l => l.period === period && l.level_name === 'Todos los Cursos' && l.subject_name === 'Todas las Asignaturas'
        );
        let updated = locksList.map(l => (l.period === period ? { ...l, is_locked: lock } : l));
        if (!hasGlobal) {
          updated = [
            {
              id: globalId,
              level_name: 'Todos los Cursos',
              subject_name: 'Todas las Asignaturas',
              period,
              is_locked: lock
            },
            ...updated
          ];
        }
        await savePeriodLocks(updated);
        Swal.fire({
          icon: 'success',
          title: `¡${period} ${lock ? 'Bloqueado' : 'Habilitado'}!`,
          text: `Las calificaciones del ${period} están ahora ${lock ? 'bloqueadas para edición en todos los cursos' : 'habilitadas para ingreso de notas'}.`,
          timer: 1800,
          showConfirmButton: false
        });
      }
    });
  };

  const handleQuickCourseLock = async (lock: boolean) => {
    if (!quickCourseLock.courseName) {
      Swal.fire('Atención', 'Seleccione un curso para aplicar el bloqueo o habilitación.', 'warning');
      return;
    }
    const targetCourse = quickCourseLock.courseName;
    const targetPeriod = quickCourseLock.period;

    const existingIdx = locksList.findIndex(
      l => l.level_name === targetCourse && l.subject_name === 'Todas las Asignaturas' && l.period === targetPeriod
    );

    let updated = [...locksList];
    if (existingIdx >= 0) {
      updated[existingIdx] = { ...updated[existingIdx], is_locked: lock };
    } else {
      updated = [
        {
          id: `lock_course_${Date.now()}`,
          level_name: targetCourse,
          subject_name: 'Todas las Asignaturas',
          period: targetPeriod,
          is_locked: lock
        },
        ...updated
      ];
    }

    // También actualizar cualquier regla específica de asignaturas de ese mismo curso y semestre
    updated = updated.map(l =>
      l.level_name === targetCourse && l.period === targetPeriod ? { ...l, is_locked: lock } : l
    );

    await savePeriodLocks(updated);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: lock ? 'warning' : 'success',
      title: `${targetCourse} (${targetPeriod}): ${lock ? '🔒 Curso Bloqueado' : '🔓 Curso Habilitado'}`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleAddLockRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLockRule.levelName || !newLockRule.subjectName) {
      Swal.fire('Atención', 'Curso y Asignatura son obligatorios.', 'warning');
      return;
    }
    const existingIdx = locksList.findIndex(
      l =>
        l.level_name === newLockRule.levelName &&
        l.subject_name === newLockRule.subjectName &&
        l.period === newLockRule.period
    );

    let updated: any[];
    if (existingIdx >= 0) {
      updated = locksList.map((item, i) =>
        i === existingIdx ? { ...item, is_locked: newLockRule.isLocked } : item
      );
    } else {
      const newRule = {
        id: `lock_${Date.now()}`,
        level_name: newLockRule.levelName,
        subject_name: newLockRule.subjectName,
        period: newLockRule.period,
        is_locked: newLockRule.isLocked
      };
      updated = [...locksList, newRule];
    }

    await savePeriodLocks(updated);
    setShowLockModal(false);
    setNewLockRule({ levelName: '', subjectName: 'Todas las Asignaturas', period: '1er Semestre', isLocked: true });
    Swal.fire('Regla Guardada', 'La regla de bloqueo semestral ha sido aplicada y guardada en la base de datos.', 'success');
  };

  const confirmDelete = (title: string, onDelete: () => void) => {
    Swal.fire({
      title: '¿Confirmar eliminación?',
      text: `Se eliminará "${title}" permanentemente de la base de datos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete();
      }
    });
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPlainPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // GUARDAR EDICIÓN DE USUARIOS EN BASE DE DATOS
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.run || !editingUser.name) {
      Swal.fire('Atención', 'RUT y Nombre son requeridos', 'warning');
      return;
    }

    const targetUser = { ...editingUser };
    const isNew = !!targetUser.isNew;
    const url = isNew ? '/api/users' : `/api/users/${encodeURIComponent(targetUser.id)}`;
    const method = isNew ? 'POST' : 'PUT';

    const userEmail = targetUser.email && String(targetUser.email) !== 'null' ? String(targetUser.email).trim() : '';
    const userName = String(targetUser.name).trim();
    const rolesToSave = parseRolesList(targetUser.roles, targetUser.role);
    const primaryRole = targetUser.role ? normalizeRoleId(targetUser.role) : (rolesToSave[0] || 'Docente');
    if (!rolesToSave.includes(primaryRole)) rolesToSave.unshift(primaryRole);

    const staffTypeToSave = targetUser.staff_type || (primaryRole === 'Administrativo' || primaryRole === 'Asistente' ? 'Asistente de la Educación' : 'Docente');
    const jobFunctionToSave = targetUser.job_function || 'Docente de Aula';
    const passwordToSave = targetUser.password_plain || targetUser.password || 'Ltp2026!';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          run: targetUser.run,
          name: userName,
          role: primaryRole,
          roles: rolesToSave,
          staff_type: staffTypeToSave,
          job_function: jobFunctionToSave,
          email: userEmail,
          password: passwordToSave
        })
      });

      if (res.ok) {
        // Actualizar estado en memoria inmediatamente para reflejar los múltiples perfiles sin demora
        setUsersList(prev => {
          if (isNew) {
            return [
              ...prev,
              {
                id: `USR-${String(targetUser.run).replace(/[^0-9kK]/g, '')}`,
                run: targetUser.run,
                name: userName,
                email: userEmail,
                role: primaryRole,
                roles: rolesToSave,
                staff_type: staffTypeToSave,
                job_function: jobFunctionToSave,
                password_plain: passwordToSave
              }
            ];
          }
          return prev.map(u =>
            (u.id === targetUser.id || u.run === targetUser.run)
              ? {
                  ...u,
                  run: targetUser.run,
                  name: userName,
                  email: userEmail || u.email,
                  role: primaryRole,
                  roles: rolesToSave,
                  staff_type: staffTypeToSave,
                  job_function: jobFunctionToSave,
                  password_plain: passwordToSave
                }
              : u
          );
        });

        // Si el usuario editado es el usuario con sesión iniciada, sincronizar localStorage
        try {
          const savedSessionUser = localStorage.getItem('ltp_user');
          if (savedSessionUser) {
            const parsedSession = JSON.parse(savedSessionUser);
            const cleanSessionRun = String(parsedSession.run || '').replace(/\./g, '').trim();
            const cleanTargetRun = String(targetUser.run || '').replace(/\./g, '').trim();
            if (parsedSession.id === targetUser.id || (cleanSessionRun && cleanSessionRun === cleanTargetRun)) {
              parsedSession.roles = rolesToSave;
              localStorage.setItem('ltp_user', JSON.stringify(parsedSession));
            }
          }
        } catch (_) {}

        setEditingUser(null);

        Swal.fire({
          icon: 'success',
          title: '¡Perfiles y Datos Guardados!',
          text: `Los datos y perfiles [${rolesToSave.join(', ')}] de ${userName} se guardaron correctamente.`,
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'Aceptar'
        });
        fetchUsers();
      } else {
        const errData = await res.json().catch(() => ({}));
        Swal.fire('Error', errData.error || 'No se pudo guardar el usuario.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con el servidor local.', 'error');
    }
  };

  const handleDeleteUser = (u: any) => {
    confirmDelete(u.name, async () => {
      try {
        const res = await fetch(`/api/users/${u.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          Swal.fire('Eliminado', `Usuario "${u.name}" eliminado de la base de datos.`, 'success');
          fetchUsers();
        } else {
          Swal.fire('Error', 'No se pudo eliminar de la base de datos.', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión al servidor.', 'error');
      }
    });
  };

  // GUARDAR EDICIÓN DE CURSOS Y PROFESOR JEFE EN SUPABASE
  const handleSaveCourseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse.name) return;

    try {
      const teacherName = editingCourse.teacher || 'Sin Asignar';
      
      // CERRAR MODAL DE EDICIÓN PRIMERO
      const targetCourse = { ...editingCourse };
      setEditingCourse(null);

      // Guardar Profesor Jefe y Capacidad en la base de datos
      await fetch('/api/courses/homeroom', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseName: targetCourse.name,
          teacherName,
          capacity: targetCourse.capacity
        })
      });

      if (targetCourse.isNew) {
        const newCourse = { ...targetCourse, id: Date.now() };
        delete newCourse.isNew;
        setCoursesList(prev => sortCoursesList([...prev, newCourse]));
      } else {
        setCoursesList(prev => sortCoursesList(prev.map(c => c.id === targetCourse.id ? targetCourse : c)));
      }

      loadConfigData();

      Swal.fire({
        icon: 'success',
        title: '¡Curso y Jefatura Actualizados!',
        text: `El curso "${targetCourse.name}" (Capacidad: ${targetCourse.capacity} cupos) y el profesor jefe "${teacherName}" han sido guardados correctamente.`,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Aceptar'
      });
    } catch (err) {
      Swal.fire('Error', 'No se pudo guardar la asignación de jefatura en la base de datos.', 'error');
    }
  };

  // CREAR / EDITAR ASIGNACIÓN DOCENTE EN BASE DE DATOS
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.teacherName || !newAssignment.levelName || !newAssignment.subjectName) {
      Swal.fire('Atención', 'Profesor Docente, Curso y Asignatura son requeridos', 'warning');
      return;
    }

    try {
      setShowAssignmentModal(false);
      const isEdit = !!editingAssignment;
      const url = isEdit ? `/api/assignments/${editingAssignment.id}` : '/api/assignments';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          teacherId: newAssignment.teacherName,
          teacherName: newAssignment.teacherName,
          teacherId2: newAssignment.teacherName2,
          teacherName2: newAssignment.teacherName2,
          levelId: newAssignment.levelName,
          levelName: newAssignment.levelName,
          subjectId: newAssignment.subjectName,
          subjectName: newAssignment.subjectName,
          academicYear: 2026
        })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: isEdit ? '¡Asignación Actualizada!' : '¡Asignación Creada!',
          text: `Se ${isEdit ? 'actualizó' : 'registró'} la asignación de "${newAssignment.subjectName}" en ${newAssignment.levelName} para ${newAssignment.teacherName}${newAssignment.teacherName2 ? ` y ${newAssignment.teacherName2}` : ''}.`,
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'Aceptar'
        });

        // Recargar y normalizar asignaciones de la base de datos
        fetch('/api/assignments', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              const normalized = data.map((a: any) => {
                let t1 = (a.teacher_name || '').trim();
                let t2 = (a.teacher_name_2 || '').trim();
                if (!t2 && t1.includes(' / ')) {
                  const parts = t1.split(' / ');
                  t1 = parts[0].trim();
                  t2 = parts[1].trim();
                }
                return {
                  ...a,
                  teacher_name: t1,
                  teacher_name_2: t2 || null
                };
              });
              setAssignmentsList(normalized);
            }
          })
          .catch(() => {});

        setEditingAssignment(null);
        setNewAssignment({ teacherName: '', teacherName2: '', levelName: '', subjectName: '' });
      } else {
        Swal.fire('Error', 'No se pudo guardar la asignación docente.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con la base de datos.', 'error');
    }
  };

  // GUARDAR EDICIÓN DE ASIGNATURAS
  const handleSaveSubjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject?.name?.trim()) {
      Swal.fire('Atención', 'Nombre de asignatura es requerido', 'warning');
      return;
    }

    try {
      if (editingSubject.isNew) {
        const res = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: editingSubject.name.trim() })
        });
        if (!res.ok) {
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo crear asignatura', 'error');
          return;
        }
      } else {
        const res = await fetch(`/api/subjects/${editingSubject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: editingSubject.name.trim() })
        });
        if (!res.ok) {
          const err = await res.json();
          Swal.fire('Error', err.error || 'No se pudo actualizar asignatura', 'error');
          return;
        }
      }

      Swal.fire('Guardado', `Asignatura "${editingSubject.name}" guardada exitosamente`, 'success');
      setEditingSubject(null);
      // Recargar desde base de datos
      fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSubjectsList(data.map((s, i) => ({ id: s.id || i + 1, name: s.name, order: i + 1 })));
          }
        })
        .catch(() => {});
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con la base de datos.', 'error');
    }
  };

  const handleDeleteSubject = (s: any) => {
    confirmDelete(s.name, async () => {
      try {
        const res = await fetch(`/api/subjects?id=${s.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          Swal.fire('Eliminado', `Asignatura "${s.name}" eliminada correctamente.`, 'success');
          setSubjectsList(prev => prev.filter(x => x.id !== s.id));
        } else {
          Swal.fire('Atención', data.error || 'No se pudo eliminar la asignatura.', 'warning');
        }
      } catch (err) {
        Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
      }
    });
  };

  // GUARDAR EDICIÓN DE ENLACES EXTERNOS
  const handleSaveLinkEdit = (e: React.FormEvent) => {
    handleSaveLink(e);
  };

  const isDocenteUser = (u: any) => u.staff_type === 'Docente' || u.role === 'Docente' || u.role === 'Admin' || u.role === 'Director';
  const isAsistenteUser = (u: any) => u.staff_type === 'Asistente de la Educación' || u.staff_type === 'Asistente' || u.role === 'Administrativo' || u.role === 'Asistente de la Educación';

  const filteredUsers = usersList.filter(u => {
    if (staffFilter === 'Docente' && !isDocenteUser(u)) {
      return false;
    }
    if (staffFilter === 'Asistente' && !isAsistenteUser(u)) {
      return false;
    }
    if (userSearchTerm.trim() !== '') {
      const q = userSearchTerm.toLowerCase().trim();
      const nMatch = (u.name || '').toLowerCase().includes(q);
      const rMatch = (u.run || '').toLowerCase().includes(q);
      const eMatch = (u.email || '').toLowerCase().includes(q);
      const fMatch = (u.job_function || '').toLowerCase().includes(q);
      const roleMatch = (u.role || '').toLowerCase().includes(q);
      return nMatch || rMatch || eMatch || fMatch || roleMatch;
    }
    return true;
  });

  const docentesCount = usersList.filter(isDocenteUser).length;
  const asistentesCount = usersList.filter(isAsistenteUser).length;

  const handleToggleUserSelect = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const currentFilteredIds = filteredUsers.map(u => u.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every(id => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  const handleSendBatchAccess = async () => {
    if (selectedUserIds.length === 0) {
      Swal.fire('Atención', 'Seleccione al menos un funcionario para enviar credenciales.', 'warning');
      return;
    }

    const count = selectedUserIds.length;
    const result = await Swal.fire({
      title: '¿Enviar Credenciales de Acceso?',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #334155;">
          <p>Se enviarán las credenciales de acceso oficial a <strong>${count} funcionario(s)</strong> seleccionado(s).</p>
          <div style="background: #f8fafc; padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 0.5rem;">
            <p style="margin: 0 0 0.4rem 0; font-weight: 700; color: #1e293b;">📨 Datos del Mensaje de Bienvenida:</p>
            <p style="margin: 0; font-size: 0.8rem; color: #64748b; line-height: 1.4;">
              • Enlace de Acceso a la Plataforma Institucional.<br/>
              • Usuario: Correo oficial <code>@eduvallediguillin.gob.cl</code>.<br/>
              • Contraseña inicial y recomendación de cambio en el primer ingreso.
            </p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: `Sí, Enviar a ${count} Funcionario(s)`,
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setIsSendingBatch(true);
      Swal.fire({
        title: 'Enviando Credenciales...',
        html: 'Por favor espere mientras se despachan los accesos a los correos oficiales.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const selectedUsers = usersList.filter(u => selectedUserIds.includes(u.id) || selectedUserIds.includes(u.run));
        const res = await fetch('/api/users/send-credentials-batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            users: selectedUsers.map(u => ({ 
              id: u.id, 
              run: u.run, 
              name: u.name, 
              email: u.email,
              password_plain: u.password_plain 
            }))
          })
        });

        const data = await res.json();
        setIsSendingBatch(false);

        if (res.ok && data.success) {
          Swal.fire({
            icon: 'success',
            title: '¡Correos Enviados con Éxito!',
            html: `
              <div style="text-align: center; font-size: 0.9rem;">
                <p style="color: #16a34a; font-weight: 700; margin-bottom: 0.5rem;">
                  ✓ Se enviaron ${data.successCount || count} correos oficiales de bienvenida a Google Workspace.
                </p>
                <p style="color: #64748b; font-size: 0.82rem;">
                  Los docentes recibirán en su bandeja de entrada el enlace directo a la plataforma y su clave inicial para acceder y configurar su cuenta.
                </p>
              </div>
            `,
            confirmButtonColor: '#4f46e5'
          });
          handleClearSelection();
        } else {
          Swal.fire('Atención', data.error || 'Hubo un inconveniente al enviar las credenciales.', 'error');
        }
      } catch (err) {
        setIsSendingBatch(false);
        Swal.fire('Error', 'Error de conexión con el servidor al enviar las credenciales.', 'error');
      }
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Configuración Institucional & Control RBAC (10 Sub-ventanas)</h2>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Edición completa de usuarios, claves, cursos, asignaturas, candados y accesos por el Administrador en la base de datos</p>

      {/* BARRA DE LAS 11 SUB-VENTANAS CON ICONOS Y ORDENADAS */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button onClick={() => setSubTab('courses')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'courses' ? '#4f46e5' : '#f1f5f9', color: subTab === 'courses' ? '#ffffff' : '#64748b' }}>
          <Layers size={14} /> 6.1 Cursos y Vacantes
        </button>
        <button onClick={() => setSubTab('subjects')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'subjects' ? '#4f46e5' : '#f1f5f9', color: subTab === 'subjects' ? '#ffffff' : '#64748b' }}>
          <BookOpen size={14} /> 6.2 Asignaturas
        </button>
        <button onClick={() => setSubTab('teachers')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'teachers' ? '#4f46e5' : '#f1f5f9', color: subTab === 'teachers' ? '#ffffff' : '#64748b' }}>
          <UserCheck size={14} /> 6.3 Profesores y Claves ({usersList.length})
        </button>
        <button onClick={() => setSubTab('assignments')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'assignments' ? '#4f46e5' : '#f1f5f9', color: subTab === 'assignments' ? '#ffffff' : '#64748b' }}>
          <Layers size={14} /> 6.4 Asignación Docente
        </button>
        <button onClick={() => setSubTab('homeroom')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'homeroom' ? '#4f46e5' : '#f1f5f9', color: subTab === 'homeroom' ? '#ffffff' : '#64748b' }}>
          <UserCheck size={14} /> 6.5 Profesor Jefe
        </button>
        <button onClick={() => setSubTab('subject_order')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'subject_order' ? '#4f46e5' : '#f1f5f9', color: subTab === 'subject_order' ? '#ffffff' : '#64748b' }}>
          <ListOrdered size={14} /> 6.6 Orden Asignaturas
        </button>
        <button onClick={() => setSubTab('templates')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'templates' ? '#4f46e5' : '#f1f5f9', color: subTab === 'templates' ? '#ffffff' : '#64748b' }}>
          <FileCheck size={14} /> 6.7 Plantillas Informes
        </button>
        <button onClick={() => setSubTab('locks')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'locks' ? '#4f46e5' : '#f1f5f9', color: subTab === 'locks' ? '#ffffff' : '#64748b' }}>
          <Lock size={14} /> 6.8 Cierre Semestral
        </button>
        <button onClick={() => setSubTab('links')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'links' ? '#4f46e5' : '#f1f5f9', color: subTab === 'links' ? '#ffffff' : '#64748b' }}>
          <Link size={14} /> 6.9 Enlaces Externos
        </button>
        <button onClick={() => setSubTab('permissions')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'permissions' ? '#4f46e5' : '#f1f5f9', color: subTab === 'permissions' ? '#ffffff' : '#64748b' }}>
          <ShieldCheck size={14} /> 6.10 Permisos por Rol
        </button>
        <button onClick={() => setSubTab('enrollment_config')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'enrollment_config' ? '#4f46e5' : '#f1f5f9', color: subTab === 'enrollment_config' ? '#ffffff' : '#64748b' }}>
          <FileCheck size={14} /> 6.11 Ficha & Compromiso Matrícula
        </button>
        <button onClick={() => setSubTab('institution_config')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'institution_config' ? '#0284c7' : '#f1f5f9', color: subTab === 'institution_config' ? '#ffffff' : '#64748b' }}>
          <Building2 size={14} /> 6.12 Establecimiento & Dirección
        </button>
        <button onClick={() => setSubTab('checklists_config')} style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: subTab === 'checklists_config' ? '#4f46e5' : '#f1f5f9', color: subTab === 'checklists_config' ? '#ffffff' : '#64748b' }}>
          <CheckSquare size={14} /> 6.13 Checklists Documentales
        </button>
      </div>

      {/* SUB-VENTANA 6.11: FICHA & COMPROMISO DE MATRÍCULA */}
      {subTab === 'enrollment_config' && (
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📝 Configuración del Texto de Compromiso Institucional y Campos Impresos
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Personaliza las cláusulas legales del compromiso de matrícula y activa o desactiva las secciones de datos que se imprimen en la Ficha Oficial de Matrícula MINEDUC/FIDE.
          </p>

          <form onSubmit={handleSaveEnrollmentConfig}>
            {/* TEXTO DE COMPROMISO CON BOTONES DE ETIQUETAS DINÁMICAS */}
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                📜 Texto del Compromiso con la Normativa del Establecimiento Educacional
              </label>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Haz clic en cualquiera de las siguientes etiquetas dinámicas para insertarla en el texto. El sistema la reemplazará automáticamente con la información real de cada estudiante o apoderado al generar o imprimir la ficha:
              </p>

              {/* BOTONES DE ETIQUETAS DINÁMICAS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem', background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', width: '100%', marginBottom: '0.2rem' }}>Insertar Datos del Apoderado Titular:</span>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {GUARDIAN_NAME}' }))} style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Nombre Apoderado Titular
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {GUARDIAN_RUN}' }))} style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + RUT Apoderado Titular
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {GUARDIAN_RELATION}' }))} style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Parentesco Titular
                </button>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', width: '100%', marginTop: '0.4rem', marginBottom: '0.2rem' }}>Insertar Datos del Apoderado Suplente:</span>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {GUARDIAN_SEC_NAME}' }))} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Nombre Apoderado Suplente
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {GUARDIAN_SEC_RUN}' }))} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + RUT Apoderado Suplente
                </button>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', width: '100%', marginTop: '0.4rem', marginBottom: '0.2rem' }}>Insertar Datos de Padre y Madre:</span>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {FATHER_NAME}' }))} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Nombre del Padre
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {FATHER_RUN}' }))} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + RUT del Padre
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {MOTHER_NAME}' }))} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Nombre de la Madre
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {MOTHER_RUN}' }))} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + RUT de la Madre
                </button>

                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', width: '100%', marginTop: '0.4rem', marginBottom: '0.2rem' }}>Insertar Datos del Estudiante / Curso:</span>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {STUDENT_NAME}' }))} style={{ background: '#fae8ff', color: '#a21caf', border: '1px solid #f5d0fe', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Nombre Estudiante
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {STUDENT_RUN}' }))} style={{ background: '#fae8ff', color: '#a21caf', border: '1px solid #f5d0fe', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + RUT Estudiante
                </button>
                <button type="button" onClick={() => setEnrollmentConfig((prev: any) => ({ ...prev, commitment_text: (prev.commitment_text || '') + ' {LEVEL_NAME}' }))} style={{ background: '#fae8ff', color: '#a21caf', border: '1px solid #f5d0fe', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                  + Curso / Nivel
                </button>
              </div>

              <textarea
                rows={6}
                value={enrollmentConfig.commitment_text || ''}
                onChange={e => setEnrollmentConfig({ ...enrollmentConfig, commitment_text: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', lineHeight: 1.5, fontFamily: 'sans-serif' }}
              />
            </div>

            {/* SELECCIÓN DE CAMPOS VISIBLES EN DOCUMENTOS IMPRESOS */}
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '1rem' }}>
                📋 Secciones y Campos Visibles en la Ficha Impresa de Matrícula
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_guardian_main ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_guardian_main: e.target.checked })}
                  />
                  Mostrar Apoderado Titular (Nombre, RUT, Parentesco, Teléfono)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_guardian_suplente ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_guardian_suplente: e.target.checked })}
                  />
                  Mostrar Apoderado Suplente (Nombre, RUT, Parentesco)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_parents_info ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_parents_info: e.target.checked })}
                  />
                  Mostrar Datos del Padre y de la Madre (Nombres, RUT, Teléfono)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_health_pie ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_health_pie: e.target.checked })}
                  />
                  Mostrar Salud, Alergias y Diagnóstico PIE / SEP
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_family_convivencia ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_family_convivencia: e.target.checked })}
                  />
                  Mostrar Antecedentes Familiares y Hermanos
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_religion_ethnicity ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_religion_ethnicity: e.target.checked })}
                  />
                  Mostrar Estado Civil, Religión y Etnia / Pueblo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_school_signatures ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_school_signatures: e.target.checked })}
                  />
                  Mostrar Firma de Funcionario LTP y Timbre de Matrícula
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={enrollmentConfig.show_student_contacts ?? true}
                    onChange={e => setEnrollmentConfig({ ...enrollmentConfig, show_student_contacts: e.target.checked })}
                  />
                  Mostrar Teléfono y Correo Electrónico del Alumno
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, padding: '0.6rem 1.25rem' }}>
                <Save size={18} /> Guardar Configuración de Matrícula
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VENTANA 6.12: CONFIGURACIÓN CENTRALIZADA DEL ESTABLECIMIENTO Y DIRECTOR */}
      {subTab === 'institution_config' && (
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#0f172a', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
                <Building2 size={22} style={{ color: '#0284c7' }} /> Establecimiento Educacional & Director(a) Oficial
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                Configuración centralizada para toda la plataforma. El Director(a) y los datos definidos aquí se aplican automáticamente a cualquier certificado, informe de calificaciones, actas y formularios oficiales MINEDUC Decreto 170.
              </p>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
              <CheckCircle2 size={15} /> Configuración Única para Toda la Plataforma
            </div>
          </div>

          <form onSubmit={handleSaveInstitutionConfig}>
            {/* SECCIÓN 1: SELECCIÓN DEL DIRECTOR(A) DESDE LA LISTA DE USUARIOS */}
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <UserCheck size={18} style={{ color: '#0284c7' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  1. Director(a) Oficial del Establecimiento (Seleccionado desde los Usuarios del Sistema)
                </h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                Selecciona al funcionario que ejerce la Dirección del Liceo de la lista de usuarios. Sus datos oficiales (Nombre, RUN, Correo) se asociarán de forma inmediata a todas las firmas institucionales y encabezados legales.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Seleccionar Usuario / Funcionario Registrado:
                  </label>
                  <select
                    value={institutionConfig.directorId || ''}
                    onChange={e => {
                      const selUser = usersList.find(u => u.id === e.target.value || u.run === e.target.value);
                      if (selUser) {
                        setInstitutionConfig((prev: any) => ({
                          ...prev,
                          directorId: selUser.id,
                          directorName: selUser.name,
                          directorRun: selUser.run,
                          directorEmail: selUser.email || prev.directorEmail
                        }));
                        setDirectorNameConfig(selUser.name);
                      }
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, background: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="">👤 Seleccionar funcionario de la lista...</option>
                    {usersList.map(u => (
                      <option key={u.id || u.run} value={u.id}>
                        {u.name} — RUN: {u.run} ({u.role || u.job_function || 'Funcionario'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nombre Oficial para Firmas y Certificados:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.directorName || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, directorName: e.target.value }))}
                    placeholder="Ej: Juan Pérez González"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Ficha Visual de Previsualización del Director */}
              <div style={{ marginTop: '1rem', background: '#f0f9ff', borderRadius: '10px', padding: '0.85rem', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem' }}>
                    {(institutionConfig.directorName || 'D')[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0369a1' }}>
                      {institutionConfig.directorName || 'Sin Asignar'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span>RUN: <strong>{institutionConfig.directorRun || '—'}</strong></span>
                      <span>•</span>
                      <span>Correo: <strong>{institutionConfig.directorEmail || '—'}</strong></span>
                      <span>•</span>
                      <span>Cargo Oficial: <strong>Director(a) Establecimiento</strong></span>
                    </div>
                  </div>
                </div>

                <span style={{ background: '#0284c7', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                  Director Oficial Activo
                </span>
              </div>
            </div>

            {/* SECCIÓN 2: ANTECEDENTES OFICIALES DEL ESTABLECIMIENTO */}
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <School size={18} style={{ color: '#0284c7' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  2. Datos Oficiales del Establecimiento Educacional
                </h4>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                Datos ministeriales que encabezan todos los documentos emitidos (RBD, Dependencia, Comuna y Contacto).
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Nombre Oficial del Establecimiento Educacional:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.schoolName || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, schoolName: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Nombre Corto / Sigla Institucional:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.shortName || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, shortName: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    RBD Oficial del MINEDUC:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.rbd || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, rbd: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Comuna y Localidad:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.commune || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, commune: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Región:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.region || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, region: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Dependencia Administrativa:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.dependence || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, dependence: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Dirección Institucional:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.address || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, address: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Teléfono Oficial:
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.phone || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, phone: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Correo Electrónico Oficial:
                  </label>
                  <input
                    type="email"
                    value={institutionConfig.email || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: CUENTA Y CORREO INSTITUCIONAL DE GOOGLE WORKSPACE / CALENDAR */}
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={18} style={{ color: '#4f46e5' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                    3. Cuenta Institucional de Google Workspace & Calendario Oficial del Liceo
                  </h4>
                </div>
                {institutionConfig.calendarId && (
                  <a
                    href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(institutionConfig.calendarId)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={13} /> Abrir Google Calendar ↗
                  </a>
                )}
              </div>

              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 1rem 0', lineHeight: '1.5' }}>
                Define la cuenta de correo institucional oficial y el ID del Calendario de Google utilizado para la sincronización de fechas de evaluaciones docentes, adecuaciones PIE, citaciones y notificaciones de la plataforma.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    ✉️ Correo Institucional Google Workspace (para Calendar y Avisos):
                  </label>
                  <input
                    type="email"
                    value={institutionConfig.calendarEmail || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, calendarEmail: e.target.value }))}
                    placeholder="ej: contacto@liceocampanario.cl o tu_correo@eduvallediguillin.gob.cl"
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginTop: '3px' }}>
                    Correo de la cuenta institucional con permisos sobre el calendario.
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    📅 Google Calendar ID (Identificador del Calendario Público / Compartido):
                  </label>
                  <input
                    type="text"
                    value={institutionConfig.calendarId || ''}
                    onChange={e => setInstitutionConfig((prev: any) => ({ ...prev, calendarId: e.target.value }))}
                    placeholder="ej: c_9c0e3902...group.calendar.google.com o correo@liceo.cl"
                    style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace', color: '#3730a3', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', marginTop: '3px' }}>
                    Se utiliza para incrustar la vista mensual y sincronizar eventos con el equipo PIE.
                  </small>
                </div>
              </div>
            </div>

            {/* BOTÓN DE GUARDADO */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={savingInstitution}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.9rem',
                  background: '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.25)'
                }}
              >
                <Save size={18} /> {savingInstitution ? 'Guardando...' : 'Guardar Configuración Institucional y Director'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VENTANA 6.13: CONFIGURACIÓN DE CHECKLISTS DOCUMENTALES (RETIRO Y MATRÍCULA) */}
      {subTab === 'checklists_config' && (
        <ChecklistTemplatesEditor token={token} />
      )}

      {/* SUB-VENTANA 6.3: PROFESORES Y CLAVES */}
      {subTab === 'teachers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>Directorio Completo de Funcionarios y Permisos ({filteredUsers.length})</h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                Gestión del personal y funcionarios registrados en la base de datos (Docentes de Aula, Directivos, UTP, Orientadores y Asistentes de la Educación)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowPositionsModal(true)}
                className="btn"
                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}
              >
                <Layers size={16} /> Gestor de Cargos & Oficios
              </button>

              <button
                onClick={() => setEditingUser({ isNew: true, run: '', name: '', role: 'Docente', roles: ['Docente'], staff_type: 'Docente', job_function: 'Docente de Aula', password_plain: 'Profe2026!' })}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}
              >
                <Plus size={16} /> Crear Nuevo Funcionario
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS Y BÚSQUEDA EN TIEMPO REAL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStaffFilter('Todos')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: staffFilter === 'Todos' ? '#4f46e5' : '#f1f5f9',
                  color: staffFilter === 'Todos' ? '#ffffff' : '#64748b'
                }}
              >
                👥 Todos los Funcionarios ({usersList.length})
              </button>
              <button
                onClick={() => setStaffFilter('Docente')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: staffFilter === 'Docente' ? '#4f46e5' : '#f1f5f9',
                  color: staffFilter === 'Docente' ? '#ffffff' : '#64748b'
                }}
              >
                👩‍🏫 Docentes ({docentesCount})
              </button>
              <button
                onClick={() => setStaffFilter('Asistente')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '20px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: staffFilter === 'Asistente' ? '#4f46e5' : '#f1f5f9',
                  color: staffFilter === 'Asistente' ? '#ffffff' : '#64748b'
                }}
              >
                🛠️ Asistentes de la Educación ({asistentesCount})
              </button>
            </div>

            {/* BARRA DE BÚSQUEDA EN TIEMPO REAL */}
            <div style={{ position: 'relative', minWidth: '280px', flex: '0 1 360px' }}>
              <Search size={18} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Buscar funcionario por Nombre, RUT o Correo..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.4rem',
                  borderRadius: '20px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.825rem',
                  outline: 'none',
                  background: '#ffffff',
                  fontWeight: 600,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              />
              {userSearchTerm && (
                <button
                  onClick={() => setUserSearchTerm('')}
                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  title="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* BARRA FLOTANTE / SUPERIOR DE ACCIONES EN LOTE (ENVÍO DE CREDENCIALES) */}
          {selectedUserIds.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: '10px',
              padding: '0.65rem 1.25rem',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.1)',
              animation: 'fadeIn 0.2s ease-in-out',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontWeight: 800, color: '#3730a3', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={18} color="#4f46e5" />
                  {selectedUserIds.length} funcionario{selectedUserIds.length > 1 ? 's' : ''} seleccionado{selectedUserIds.length > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>
                  ({selectedUserIds.filter(id => {
                    const usr = usersList.find(x => x.id === id);
                    return usr && isDocenteUser(usr);
                  }).length} docentes)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleSendBatchAccess}
                  disabled={isSendingBatch}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    padding: '0.5rem 1.15rem',
                    background: '#4f46e5',
                    boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <Mail size={16} /> Enviar Credenciales de Acceso ({selectedUserIds.length})
                </button>

                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="btn"
                  style={{
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '0.5rem 0.85rem'
                  }}
                >
                  Deseleccionar
                </button>
              </div>
            </div>
          )}

          <div className="table-container" style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 0.75rem', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id))}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      title="Seleccionar todos los visibles"
                    />
                  </th>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', minWidth: '120px', color: '#475569', fontSize: '0.8rem', fontWeight: 800 }}>RUT</th>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', minWidth: '240px', color: '#475569', fontSize: '0.8rem', fontWeight: 800 }}>Nombre Funcionario</th>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', minWidth: '220px', color: '#475569', fontSize: '0.8rem', fontWeight: 800 }}>Correo Electrónico</th>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', minWidth: '150px', color: '#475569', fontSize: '0.8rem', fontWeight: 800 }}>Tipo / Categoría</th>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', minWidth: '150px', color: '#475569', fontSize: '0.8rem', fontWeight: 800 }}>Contraseña Secreta</th>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', minWidth: '160px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}>Acciones de Administrador</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      No hay funcionarios registrados en el sistema. Los funcionarios se reflejarán cuando estén registrados en la base de datos o use "+ Crear Nuevo Funcionario".
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#eff6ff' : undefined,
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleUserSelect(u.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                        {formatRut(u.run) || u.run}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>
                        {u.name}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.82rem', color: u.email ? '#0284c7' : '#94a3b8', fontWeight: u.email ? 600 : 400 }}>
                          {u.email || 'Sin correo'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const isAsist = u.staff_type === 'Asistente de la Educación' || u.staff_type === 'Asistente' || u.role === 'Administrativo';
                          const userRoles: string[] = parseRolesList(u.roles, u.role);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                width: 'fit-content',
                                whiteSpace: 'nowrap',
                                background: isAsist ? '#fef3c7' : '#e0e7ff',
                                color: isAsist ? '#b45309' : '#3730a3',
                                border: isAsist ? '1px solid #fde68a' : '1px solid #c7d2fe'
                              }}>
                                {isAsist ? '🛠️ Asistente' : '👩‍🏫 Docente'}
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                {userRoles.map((r, rIdx) => (
                                  <span
                                    key={rIdx}
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      background: r === u.role ? '#4f46e5' : '#f1f5f9',
                                      color: r === u.role ? '#ffffff' : '#334155',
                                      padding: '1px 6px',
                                      borderRadius: '6px',
                                      border: r === u.role ? '1px solid #4338ca' : '1px solid #cbd5e1'
                                    }}
                                    title={r === u.role ? 'Rol Principal Activo' : 'Rol Asignado'}
                                  >
                                    {r === u.role ? `⭐ ${r}` : r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <code style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {showPlainPassword[u.id] ? u.password_plain : '••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '2px' }}
                            title={showPlainPassword[u.id] ? 'Ocultar contraseña' : 'Ver contraseña'}
                          >
                            {showPlainPassword[u.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              const initRoles = parseRolesList(u.roles, u.role);
                              const initPrimary = normalizeRoleId(u.role || initRoles[0] || 'Docente');
                              setEditingUser({
                                ...u,
                                role: initPrimary,
                                roles: initRoles
                              });
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                          >
                            <Edit size={13} /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="btn"
                            style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.35rem 0.7rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: GESTOR DE CARGOS Y OFICIOS INSTITUCIONALES */}
      {showPositionsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 2500, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💼 Gestor de Cargos, Oficios & Rangos Institucionales
              </h3>
              <button onClick={() => setShowPositionsModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            {/* FORMULARIO AGREGAR CARGO */}
            <form onSubmit={handleAddJobPosition} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <select
                value={newPositionCategory}
                onChange={e => setNewPositionCategory(e.target.value as any)}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem' }}
              >
                <option value="Docente">👩‍🏫 Docente</option>
                <option value="Asistente">🛠️ Asistente de la Ed.</option>
              </select>
              <input
                type="text"
                value={newPositionName}
                onChange={e => setNewPositionName(e.target.value)}
                placeholder="Nombre del nuevo cargo (ej: Fonoaudiólogo/a, Directivo, Chofer...)"
                style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                + Agregar Cargo
              </button>
            </form>

            {/* LISTADO DE CARGOS EXISTENTES */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem' }}>Cargos Habilitados en la base de datos:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {positionsList.map(pos => (
                  <div key={pos.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{pos.name}</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '6px' }}>({pos.category})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteJobPosition(pos.id, pos.name)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#be123c' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPositionsModal(false)} className="btn" style={{ background: '#cbd5e1', color: '#1e293b' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VENTANA 6.1: CURSOS Y VACANTES */}
      {subTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <h3>Gestión de Cursos y Vacantes</h3>
            <button onClick={() => setEditingCourse({ isNew: true, name: '', capacity: 45, enrolled: 0, teacher: 'Sin Asignar' })} className="btn btn-primary">
              + Nuevo Curso
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre Curso</th>
                  <th>Capacidad Total</th>
                  <th>Matriculados Activos</th>
                  <th>Vacantes Disponibles</th>
                  <th>Profesor Jefe Asignado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {coursesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      No hay cursos registrados en el sistema. Los cursos se reflejarán cuando estén registrados en la base de datos o use "+ Nuevo Curso".
                    </td>
                  </tr>
                ) : (
                  coursesList.map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.capacity} cupos</td>
                    <td>{c.enrolled} alumnos</td>
                    <td><span style={{ color: '#10b981', fontWeight: 700 }}>{c.capacity - c.enrolled} vacantes</span></td>
                    <td>{(!c.teacher || c.teacher === 'null' || c.teacher === 'undefined') ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin Asignar</span> : c.teacher}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setSupportCourseModal(c.name)}
                          className="btn"
                          style={{
                            background: '#ecfdf5',
                            color: '#065f46',
                            border: '1px solid #a7f3d0',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 700
                          }}
                          title={`Ver y gestionar equipo de apoyo y profesionales PIE de ${c.name}`}
                        >
                          <Users size={12} /> Apoyo PIE
                        </button>
                        <button onClick={() => setEditingCourse({ ...c })} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                          <Edit size={12} /> Editar
                        </button>
                        <button
                          onClick={() => confirmDelete(c.name, async () => {
                            try {
                              const res = await fetch(`/api/courses?name=${encodeURIComponent(c.name)}&id=${encodeURIComponent(c.id)}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (res.ok) {
                                setCoursesList(prev => prev.filter(x => x.id !== c.id && x.name !== c.name));
                                Swal.fire('Eliminado', `El curso "${c.name}" ha sido eliminado permanentemente.`, 'success');
                              } else {
                                Swal.fire('Error', 'No se pudo eliminar el curso.', 'error');
                              }
                            } catch (_) {
                              Swal.fire('Error', 'Error de conexión al eliminar el curso.', 'error');
                            }
                          })}
                          className="btn"
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>

          {/* MODAL DE APOYO Y PROFESIONALES DEL CURSO */}
          {supportCourseModal && (
            <CourseSupportModal
              isOpen={true}
              onClose={() => setSupportCourseModal(null)}
              courseName={supportCourseModal}
              availableCourses={coursesList.map(c => c.name)}
            />
          )}
        </div>
      )}

      {/* SUB-VENTANA 6.2: ASIGNATURAS */}
      {subTab === 'subjects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Directorio de Asignaturas Impartidas</h3>
            <button onClick={() => setEditingSubject({ isNew: true, name: '', order: subjectsList.length + 1 })} className="btn btn-primary">+ Nueva Asignatura</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre Materia</th>
                  <th>Validación checkSubjectGrades</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subjectsList.map(s => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td><strong>{s.name}</strong></td>
                    <td><span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>✅ Protegida con Notas</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => setEditingSubject({ ...s })} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                          <Edit size={12} /> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(s)}
                          className="btn"
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VENTANA 6.4: ASIGNACIÓN DOCENTE */}
      {subTab === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#0f172a', margin: 0 }}>
              Asignación de Cursos y Asignaturas a Docentes
            </h3>
            <button
              onClick={() => {
                setEditingAssignment(null);
                setNewAssignment({ teacherName: '', teacherName2: '', levelName: '', subjectName: '' });
                setShowAssignmentModal(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <Plus size={16} /> + Nueva Asignación Docente
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Profesor Docente (Titular)</th>
                  <th>2° Docente / Co-Docente</th>
                  <th>Curso / Nivel Asignado</th>
                  <th>Asignatura Mapeada</th>
                  <th>Año Lectivo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {assignmentsList.map(a => {
                  let t1 = (a.teacher_name || '').trim();
                  let t2 = (a.teacher_name_2 || '').trim();
                  if (!t2 && t1.includes(' / ')) {
                    const parts = t1.split(' / ');
                    t1 = parts[0].trim();
                    t2 = parts[1].trim();
                  }

                  return (
                    <tr key={a.id}>
                      <td><strong>👩‍🏫 {t1}</strong></td>
                      <td>
                        {t2 ? (
                          <span style={{ color: '#0369a1', fontWeight: 700 }}>👩‍🏫 {t2}</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>🚫 Sin Co-Docente</span>
                        )}
                      </td>
                      <td><span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>{a.level_name}</span></td>
                      <td><strong>{a.subject_name}</strong></td>
                      <td>{a.academic_year || a.year || 2026}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              setEditingAssignment(a);
                              setNewAssignment({
                                teacherName: t1,
                                teacherName2: t2,
                                levelName: a.level_name || '',
                                subjectName: a.subject_name || ''
                              });
                              setShowAssignmentModal(true);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Edit size={12} /> Editar
                          </button>
                        <button
                          onClick={() => confirmDelete(`Asignación de ${a.subject_name} en ${a.level_name} para ${a.teacher_name}`, async () => {
                            try {
                              await fetch(`/api/assignments/${a.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              setAssignmentsList(prev => prev.filter(x => x.id !== a.id));
                              Swal.fire('Eliminado', 'Asignación docente eliminada de la base de datos.', 'success');
                            } catch (err) {
                              Swal.fire('Error', 'No se pudo eliminar la asignación.', 'error');
                            }
                          })}
                          className="btn"
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VENTANA 6.5: PROFESOR JEFE & DIRECTIVA */}
      {subTab === 'homeroom' && (
        <div>
          {/* TARJETA DE CONFIGURACIÓN DEL DIRECTOR(A) INSTITUCIONAL */}
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🎓 Director(a) Oficial del Establecimiento (Para Informes y Certificados)
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  El nombre configurado aquí aparecerá automáticamente en todos los informes de calificaciones, actas y certificados oficiales.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                  Seleccionar Directivo/Funcionario Registrado:
                </label>
                <select
                  value={institutionConfig.directorId || ''}
                  onChange={e => {
                    const selUser = usersList.find(u => u.id === e.target.value || u.run === e.target.value);
                    if (selUser) {
                      setInstitutionConfig((prev: any) => ({
                        ...prev,
                        directorId: selUser.id,
                        directorName: selUser.name,
                        directorRun: selUser.run,
                        directorEmail: selUser.email || prev.directorEmail
                      }));
                      setDirectorNameConfig(selUser.name);
                    }
                  }}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600, background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
                >
                  <option value="">👤 Seleccionar de la lista de funcionarios...</option>
                  {usersList.map(u => (
                    <option key={u.id || u.run} value={u.id}>
                      {u.name} — RUN: {u.run} ({u.job_function || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                  Nombre Oficial para Firmas:
                </label>
                <input
                  type="text"
                  value={directorNameConfig}
                  onChange={e => {
                    setDirectorNameConfig(e.target.value);
                    setInstitutionConfig((prev: any) => ({ ...prev, directorName: e.target.value }));
                  }}
                  placeholder="Ej: Juan Pérez González"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/config/institutional-settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          ...institutionConfig,
                          directorName: directorNameConfig
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.settings) setInstitutionConfig(data.settings);
                        Swal.fire({ icon: 'success', title: '¡Director Oficial Guardado!', text: `"${directorNameConfig}" guardado en la base de datos para todas las firmas e informes.`, timer: 2000, showConfirmButton: false });
                      }
                    } catch (err) {
                      Swal.fire('Error', 'No se pudo guardar la configuración.', 'error');
                    }
                  }}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', height: '38px', fontWeight: 700 }}
                >
                  <Save size={15} /> Guardar Director
                </button>

                <button
                  type="button"
                  onClick={() => setSubTab('institution_config')}
                  className="btn"
                  style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.85rem', height: '38px', fontWeight: 700 }}
                  title="Configurar todos los datos del establecimiento y director"
                >
                  <Building2 size={15} /> Ficha Completa (6.12)
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Asignación de Profesores Jefes por Curso</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Curso / Nivel (Orden Oficial)</th>
                  <th>Profesor Jefe Responsable</th>
                  <th>Seleccionar / Asignar Docente</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {coursesList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      No hay cursos registrados para asignar jefaturas. Los cursos se reflejarán cuando estén registrados en la base de datos.
                    </td>
                  </tr>
                ) : (
                  sortCoursesList(coursesList).map(c => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>
                      {c.teacher && c.teacher !== 'Sin Asignar' ? (
                        <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          👩‍🏫 {c.teacher}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin Asignar</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={c.teacher || 'Sin Asignar'}
                        onChange={async e => {
                          const newTeacher = e.target.value;
                          try {
                            await fetch('/api/courses/homeroom', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ courseName: c.name, teacherName: newTeacher })
                            });
                            setCoursesList(prev => sortCoursesList(prev.map(x => x.id === c.id ? { ...x, teacher: newTeacher } : x)));
                            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Jefatura de ${c.name} asignada a ${newTeacher}`, timer: 1500, showConfirmButton: false });
                          } catch (err) {
                            Swal.fire('Error', 'No se pudo guardar la jefatura.', 'error');
                          }
                        }}
                        style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600, background: '#ffffff', color: '#0f172a', cursor: 'pointer', maxWidth: '260px' }}
                      >
                        <option value="Sin Asignar">-- Sin Asignar --</option>
                        {usersList.filter(isDocenteUser).map(u => (
                          <option key={u.id || u.run} value={`Prof. ${u.name}`}>
                            Prof. {u.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => setEditingCourse({ ...c })} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Edit size={12} /> Editar
                        </button>
                        <button
                          onClick={() => confirmDelete(`Jefatura de ${c.name}`, async () => {
                            await fetch('/api/courses/homeroom', {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ courseName: c.name, teacherName: 'Sin Asignar' })
                            });
                            setCoursesList(prev => sortCoursesList(prev.map(x => x.id === c.id ? { ...x, teacher: 'Sin Asignar' } : x)));
                            Swal.fire('Desasignado', `Se retiró la jefatura de ${c.name} en la base de datos`, 'success');
                          })}
                          className="btn"
                          style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={12} /> Desasignar
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VENTANA 6.6: ORDEN DE ASIGNATURAS POR CURSO (SEPARADOS CON SUB-MENÚ) */}
      {subTab === 'subject_order' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          
          {/* ENCABEZADO Y EXPLICACIÓN NORMATIVA */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListOrdered size={22} color="#4f46e5" /> 6.6 Orden Oficial de Asignaturas por Curso
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Configura y personaliza el orden de prelación oficial con el que se imprimen las asignaturas en los Certificados de Notas y Concentraciones Oficiales FIDE / MINEDUC para cada curso según sus asignaciones docentes.
            </p>
          </div>

          {coursesList.filter(c => !isParvulariaCourse(c.name)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              <ListOrdered size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5, display: 'block' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontWeight: 700 }}>No hay cursos disponibles para ordenar asignaturas</h4>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Los cursos y sus asignaturas se reflejarán cuando estén registrados en la base de datos o creados en la pestaña 6.1.
              </p>
            </div>
          ) : (
            <>
              {/* SUB-MENÚ / BARRA DE SELECCIÓN DE CURSO */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Seleccionar Curso para Configurar Orden:
                </label>
                <select
                  value={selectedCourseForOrder}
                  onChange={e => setSelectedCourseForOrder(e.target.value)}
                  style={{
                    padding: '0.55rem 0.9rem',
                    borderRadius: '8px',
                    border: '1.5px solid #6366f1',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    background: '#ffffff',
                    cursor: 'pointer',
                    minWidth: '320px',
                    boxShadow: '0 1px 3px rgba(99, 102, 241, 0.15)'
                  }}
                >
                  {coursesList.filter(c => !isParvulariaCourse(c.name)).map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* BADGE DE TOTAL DE ASIGNATURAS ASIGNADAS */}
              <div style={{ alignSelf: 'flex-end', paddingBottom: '0.25rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#e0e7ff', color: '#4338ca', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #c7d2fe' }}>
                  <ListOrdered size={14} />
                  {currentCourseSubjects.length} Asignaturas en este curso
                </span>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN GLOBAL DEL CURSO */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={copyOrderToOtherCourse}
                className="btn"
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.55rem 0.95rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  borderRadius: '8px'
                }}
                title="Copiar este mismo orden a un curso paralelo"
              >
                <Copy size={15} color="#6366f1" /> Copiar a Otro Curso
              </button>

              <button
                onClick={saveCourseSubjectOrder}
                disabled={savingCourseOrder}
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                }}
              >
                <Save size={16} /> {savingCourseOrder ? 'Guardando...' : `Guardar Orden de ${selectedCourseForOrder || 'este Curso'}`}
              </button>
            </div>
          </div>

          {/* BARRA PARA AGREGAR ASIGNATURAS ADICIONALES */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
              + Agregar Asignatura a este curso:
            </span>
            <select
              value={newSubjectForCourseOrder}
              onChange={e => setNewSubjectForCourseOrder(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff', fontWeight: 600, minWidth: '240px' }}
            >
              <option value="">-- Seleccionar Asignatura del Catálogo --</option>
              {subjectsList.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <button
              onClick={() => addSubjectToCourseOrder(newSubjectForCourseOrder)}
              disabled={!newSubjectForCourseOrder}
              className="btn"
              style={{
                background: '#ffffff',
                color: '#4f46e5',
                border: '1px solid #c7d2fe',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: newSubjectForCourseOrder ? 'pointer' : 'not-allowed',
                opacity: newSubjectForCourseOrder ? 1 : 0.6,
                borderRadius: '6px'
              }}
            >
              <Plus size={14} /> + Agregar al Curso
            </button>
          </div>

          {/* TABLA DE ORDEN DE ASIGNATURAS DEL CURSO SELECCIONADO */}
          {isParvulariaCourse(selectedCourseForOrder) ? (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', margin: '1rem 0' }}>
              <AlertCircle size={48} color="#d97706" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ color: '#92400e', marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.2rem' }}>
                Educación Parvularia ({selectedCourseForOrder})
              </h4>
              <p style={{ color: '#b45309', maxWidth: '640px', margin: '0 auto', fontSize: '0.92rem', lineHeight: '1.6' }}>
                La Educación Parvularia (Pre-Kínder y Kínder) no utiliza asignaturas con calificaciones numéricas ni emisión de certificados oficiales de notas según las Bases Curriculares de la Educación Parvularia (BCEP). Su evaluación es formativa y cualitativa.
              </p>
            </div>
          ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Posición</th>
                  <th>Nombre Asignatura</th>
                  <th>Docente Asignado en este Curso</th>
                  <th>Aparición Certificados</th>
                  <th style={{ width: '190px', textAlign: 'center' }}>Reordenar</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {currentCourseSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>No hay asignaturas configuradas para {selectedCourseForOrder}.</p>
                      <span style={{ fontSize: '0.8rem' }}>Puedes agregar una desde el selector superior o registrar asignaciones docentes en la sub-ventana 6.4.</span>
                    </td>
                  </tr>
                ) : (
                  currentCourseSubjects.map((s, idx) => (
                    <tr key={s.name || idx}>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', width: '30px', height: '30px', lineHeight: '30px', borderRadius: '50%', background: '#e0e7ff', fontWeight: 800, color: '#3730a3', fontSize: '0.85rem', border: '1px solid #c7d2fe' }}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {s.name}
                      </td>
                      <td style={{ color: s.teacher && s.teacher !== 'Sin Asignar' ? '#1e293b' : '#94a3b8', fontWeight: 600 }}>
                        {s.teacher || 'Sin Asignar'}
                      </td>
                      <td>
                        <span style={{ color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-block' }}>
                          Oficial FIDE / MINEDUC
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => moveCourseSubject(idx, idx - 1)}
                            disabled={idx === 0}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: idx === 0 ? '#f1f5f9' : '#ffffff',
                              color: idx === 0 ? '#94a3b8' : '#1e293b',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                            title="Subir posición"
                          >
                            <ArrowUp size={13} /> Subir
                          </button>
                          <button
                            onClick={() => moveCourseSubject(idx, idx + 1)}
                            disabled={idx === currentCourseSubjects.length - 1}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: idx === currentCourseSubjects.length - 1 ? '#f1f5f9' : '#ffffff',
                              color: idx === currentCourseSubjects.length - 1 ? '#94a3b8' : '#1e293b',
                              cursor: idx === currentCourseSubjects.length - 1 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                            title="Bajar posición"
                          >
                            <ArrowDown size={13} /> Bajar
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => removeSubjectFromCourseOrder(s.name)}
                          className="btn"
                          style={{
                            background: '#fff1f2',
                            color: '#be123c',
                            border: '1px solid #fecdd3',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            borderRadius: '6px'
                          }}
                        >
                          <Trash2 size={13} /> Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}
          </>
          )}
        </div>
      )}

      {/* SUB-VENTANA 6.7: PLANTILLAS DE INFORMES */}
      {subTab === 'templates' && (
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#4f46e5' }}>Plantillas de Desarrollo Personal y Social</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1rem' }}>Criterios evaluativos: Adquirido (A), En Proceso (EP), Por Adquirir (PA), No Evaluado (NE).</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="role-chip">Área Socio-Afectiva</span>
            <span className="role-chip">Área Cognitiva</span>
            <span className="role-chip">Educación Parvularia</span>
          </div>
        </div>
      )}

      {/* SUB-VENTANA 6.8: CIERRE SEMESTRAL, CANDADOS Y PROMOCIÓN MULTI-AÑO */}
      {subTab === 'locks' && (
        <div>
          {/* TARJETA DE PROMOCIÓN DE AÑO LECTIVO MULTI-AÑO (2026 -> 2027) */}
          <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎓 Cierre de Año Lectivo & Promoción Escolar Multi-Año (2026 ➔ 2027)
                </h3>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                  Asistente de cierre de año lectivo y promoción: revise la nómina por curso y elija individualmente qué estudiantes avanzan, repiten curso o se cambian de liceo, conservando intacto el historial académico 2026.
                </p>
              </div>

              <button
                onClick={handlePromoteAcademicYear}
                className="btn"
                style={{ background: '#ffffff', color: '#4f46e5', fontWeight: 800, padding: '0.65rem 1.35rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                <GraduationCap size={18} /> Asistente de Promoción Escolar por Curso
              </button>
            </div>
          </div>

          {/* CONTROLES GLOBALES DE CIERRE SEMESTRAL */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                <h4 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                  🔒 Control Global de Bloqueo por Semestre
                </h4>
                {(() => {
                  const s1Global = locksList.find(l => l.level_name === 'Todos los Cursos' && l.subject_name === 'Todas las Asignaturas' && l.period === '1er Semestre');
                  const s2Global = locksList.find(l => l.level_name === 'Todos los Cursos' && l.subject_name === 'Todas las Asignaturas' && l.period === '2do Semestre');
                  return (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '9999px', background: s1Global?.is_locked ? '#fee2e2' : '#dcfce7', color: s1Global?.is_locked ? '#991b1b' : '#15803d', border: `1px solid ${s1Global?.is_locked ? '#fca5a5' : '#86efac'}` }}>
                        1er Sem: {s1Global?.is_locked ? '🔒 BLOQUEADO' : '🔓 HABILITADO'}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.55rem', borderRadius: '9999px', background: s2Global?.is_locked ? '#fee2e2' : '#dcfce7', color: s2Global?.is_locked ? '#991b1b' : '#15803d', border: `1px solid ${s2Global?.is_locked ? '#fca5a5' : '#86efac'}` }}>
                        2do Sem: {s2Global?.is_locked ? '🔒 BLOQUEADO' : '🔓 HABILITADO'}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Cierra o habilita la edición de planillas de calificaciones para todo el establecimiento con un solo clic.
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleGlobalPeriodLock('1er Semestre', true)}
                className="btn"
                style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <Lock size={14} /> Bloquear 1er Semestre
              </button>
              <button
                onClick={() => handleGlobalPeriodLock('1er Semestre', false)}
                className="btn"
                style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <Unlock size={14} /> Habilitar 1er Semestre
              </button>
              <button
                onClick={() => handleGlobalPeriodLock('2do Semestre', true)}
                className="btn"
                style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <Lock size={14} /> Bloquear 2do Semestre
              </button>
              <button
                onClick={() => handleGlobalPeriodLock('2do Semestre', false)}
                className="btn"
                style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <Unlock size={14} /> Habilitar 2do Semestre
              </button>
            </div>
          </div>

          {/* BLOQUEO RÁPIDO POR CURSO COMPLETO Y SEMESTRE */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h4 style={{ margin: '0 0 0.2rem 0', color: '#1e3a8a', fontWeight: 800, fontSize: '0.92rem' }}>
                🏫 Bloqueo Rápido por Curso Completo (Todas las Asignaturas)
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#3b82f6' }}>
                Seleccione un curso y semestre para bloquear o habilitar todas las notas de ese curso inmediatamente.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={quickCourseLock.courseName}
                onChange={e => setQuickCourseLock({ ...quickCourseLock, courseName: e.target.value })}
                style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid #93c5fd', fontWeight: 700, fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', outline: 'none' }}
              >
                <option value="">-- Seleccionar Curso --</option>
                <option value="Todos los Cursos">🌐 Todos los Cursos (Establecimiento Completo)</option>
                {sortCoursesList(coursesList).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <select
                value={quickCourseLock.period}
                onChange={e => setQuickCourseLock({ ...quickCourseLock, period: e.target.value })}
                style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid #93c5fd', fontWeight: 700, fontSize: '0.8rem', background: '#ffffff', color: '#0f172a', outline: 'none' }}
              >
                <option value="1er Semestre">1er Semestre</option>
                <option value="2do Semestre">2do Semestre</option>
                <option value="Ambos Semestres">Ambos Semestres (Anual)</option>
              </select>

              <button
                type="button"
                onClick={() => handleQuickCourseLock(true)}
                className="btn"
                style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Lock size={14} /> Bloquear Curso
              </button>
              <button
                type="button"
                onClick={() => handleQuickCourseLock(false)}
                className="btn"
                style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Unlock size={14} /> Habilitar Curso
              </button>
            </div>
          </div>

          {/* ENCABEZADO DE TABLA Y BOTÓN AGREGAR REGLA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
              Reglas Específicas de Candados por Asignatura y Curso
            </h4>
            <button
              onClick={() => setShowLockModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
            >
              <Plus size={15} /> + Nueva Regla de Bloqueo
            </button>
          </div>

          <div className="table-container">
            <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Asignatura</th>
                <th>Período Académico</th>
                <th>Estado Bloqueo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {locksList.map((l, idx) => (
                <tr key={idx}>
                  <td><strong>{l.level_name}</strong></td>
                  <td>{l.subject_name}</td>
                  <td>{l.period}</td>
                  <td>
                    {l.is_locked ? (
                      <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={14} /> CERRADO / BLOQUEADO
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Unlock size={14} /> HABILITADO
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => toggleLock(idx)} className="btn" style={{ background: l.is_locked ? '#dcfce7' : '#fee2e2', color: l.is_locked ? '#15803d' : '#b91c1c', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                        {l.is_locked ? 'Desbloquear' : 'Bloquear Edición'}
                      </button>
                      <button
                        onClick={() => confirmDelete(`Bloqueo de ${l.subject_name}`, () => {
                          const updated = locksList.filter((_, i) => i !== idx);
                          savePeriodLocks(updated);
                        })}
                        className="btn"
                        style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={12} /> Eliminar Regla
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL NUEVA REGLA DE BLOQUEO */}
        {showLockModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  🔒 Agregar Regla de Bloqueo
                </h3>
                <button onClick={() => setShowLockModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleAddLockRule}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Curso</label>
                  <select
                    value={newLockRule.levelName}
                    onChange={e => setNewLockRule({ ...newLockRule, levelName: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                    required
                  >
                    <option value="">-- Seleccionar Curso --</option>
                    <option value="Todos los Cursos">🌐 Todos los Cursos (Establecimiento Completo)</option>
                    {sortCoursesList(coursesList).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Asignatura</label>
                  <select
                    value={newLockRule.subjectName}
                    onChange={e => setNewLockRule({ ...newLockRule, subjectName: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                    required
                  >
                    <option value="Todas las Asignaturas">📚 Todas las Asignaturas (Curso Completo)</option>
                    {subjectsList.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Período</label>
                  <select
                    value={newLockRule.period}
                    onChange={e => setNewLockRule({ ...newLockRule, period: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="1er Semestre">1er Semestre</option>
                    <option value="2do Semestre">2do Semestre</option>
                    <option value="Ambos Semestres">Ambos Semestres (Anual)</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Estado Inicial</label>
                  <select
                    value={newLockRule.isLocked ? 'true' : 'false'}
                    onChange={e => setNewLockRule({ ...newLockRule, isLocked: e.target.value === 'true' })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="true">🔒 Bloqueado (Edición Deshabilitada)</option>
                    <option value="false">🔓 Habilitado (Edición Permitida)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setShowLockModal(false)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                    <Save size={16} /> Guardar Regla
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
      )}

      {/* SUB-VENTANA 6.9: ENLACES EXTERNOS */}
      {subTab === 'links' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Directorio de Enlaces Externos e Institucionales</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Administre los enlaces directos y plataformas que se presentan en el módulo <strong>"Plataformas de Interés"</strong> del Dashboard.
              </p>
            </div>
            <button
              onClick={() => setEditingLink({ isNew: true, name: '', url: 'https://', category: 'Plataforma Institucional', color: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' })}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <Plus size={16} /> Nuevo Enlace
            </button>
          </div>

          {/* TARJETA DE INTEGRACIÓN SEGURA GOOGLE DRIVE */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>☁️</span>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    Conector Seguro Google Drive & Workspace
                  </h4>
                  <span style={{
                    background: driveStatus?.connected ? '#dcfce7' : '#fee2e2',
                    color: driveStatus?.connected ? '#166534' : '#991b1b',
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 800
                  }}>
                    {driveStatus?.connected ? `🟢 Conectado (${driveStatus.user || 'Cuenta Activa'})` : '⚪ No Vinculado'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                  Cumplimiento <strong>Ley de Protección de Datos Personales (Ley 19.628 / 21.096)</strong>, <strong>Ley de Garantías de la Niñez (21.430)</strong> y <strong>Ley Karin</strong>. Los archivos y carpetas se almacenan en Google Drive con nombres aleatorios y hashes disociados que impiden identificar a las personas en caso de filtración.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const instructions = `Instrucciones: El archivo Google_Apps_Script_Drive_Conector.js está disponible en la carpeta raíz del proyecto para implementarlo en script.google.com.`;
                  Swal.fire({
                    title: 'Conector Google Drive',
                    text: 'El código del script seguro con anonimización legal se encuentra en el archivo local Google_Apps_Script_Drive_Conector.js. Al implementarlo como Aplicación Web con acceso público e indicar el token LTP_SEC_2026_LEGAL_VAULT_KEY, pega la URL generada aquí abajo.',
                    icon: 'info'
                  });
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              >
                ℹ️ Ver Instrucciones de Seguridad
              </button>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <input
                type="url"
                value={driveWebhookUrl}
                onChange={e => setDriveWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace'
                }}
              />
              <button
                type="button"
                onClick={handleSaveDriveWebhook}
                disabled={testingDrive}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {testingDrive ? '🔄 Verificando...' : '💾 Guardar y Vincular Drive'}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Título del Enlace</th>
                  <th>Categoría</th>
                  <th>URL Directa</th>
                  <th>Acceso Rápido</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {linksList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No hay enlaces registrados. Haga clic en "+ Nuevo Enlace" para agregar plataformas de interés.
                    </td>
                  </tr>
                ) : (
                  linksList.map(lnk => (
                    <tr key={lnk.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: lnk.color || '#4f46e5', display: 'inline-block' }}></span>
                          <strong>{lnk.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {lnk.category || 'Plataforma Institucional'}
                        </span>
                      </td>
                      <td><a href={lnk.url} target="_blank" rel="noreferrer" style={{ color: '#4f46e5' }}>{lnk.url}</a></td>
                      <td>
                        <a href={lnk.url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Abrir Link ↗
                        </a>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => setEditingLink({ ...lnk })} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Edit size={12} /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteLink(lnk.id, lnk.name)}
                            className="btn"
                            style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VENTANA 6.10: MATRIZ DE PERMISOS */}
      {subTab === 'permissions' && (
        <PermissionsMatrix token={token} />
      )}

      {/* MODAL 1: EDICIÓN / ALTA DE USUARIOS Y CLAVES (SUB-VENTANA 6.3) */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.35rem 1.5rem', width: '100%', maxWidth: '520px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: 0, fontSize: '1.15rem' }}>
                {editingUser.isNew ? 'Crear Nuevo Usuario / Funcionario' : 'Editar Usuario / Funcionario'}
              </h3>
              <button type="button" onClick={() => setEditingUser(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveUserEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '145px 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>RUT Funcionario</label>
                  <input
                    type="text"
                    value={editingUser.run || ''}
                    onChange={e => {
                      const val = formatRut(e.target.value);
                      setEditingUser((prev: any) => ({ ...prev, run: val }));
                    }}
                    placeholder="12.345.678-9"
                    style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>Nombre Completo</label>
                  <input
                    type="text"
                    value={editingUser.name || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingUser((prev: any) => ({ ...prev, name: val }));
                    }}
                    placeholder="Nombre y Apellidos"
                    style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>Estamento / Categoría</label>
                  <select
                    value={editingUser.staff_type || (editingUser.role === 'Administrativo' || editingUser.role === 'Asistente' ? 'Asistente de la Educación' : 'Docente')}
                    onChange={e => {
                      const newType = e.target.value;
                      setEditingUser((prev: any) => {
                        const prevRoles = parseRolesList(prev.roles, prev.role);
                        return {
                          ...prev,
                          staff_type: newType,
                          roles: prevRoles
                        };
                      });
                    }}
                    style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 700, background: '#f8fafc', fontSize: '0.82rem' }}
                  >
                    <option value="Docente">👩‍🏫 Docente / Directivo</option>
                    <option value="Asistente de la Educación">🛠️ Asistente de la Educación</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>Función / Cargo Específico</label>
                  <input
                    type="text"
                    value={editingUser.job_function || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingUser((prev: any) => ({ ...prev, job_function: val }));
                    }}
                    placeholder="Ej: Inspector/a, Psicólogo/a, Docente..."
                    style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* SELECTOR MÚLTIPLE DE PERFILES Y ROLES */}
              <div style={{ marginBottom: '0.9rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
                    🔀 Perfiles Asignados (Multi-Rol):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const allRoleIds = ['Docente', 'Director', 'Entrevistador', 'Asistente', 'Administrativo', 'Profesionales', 'Admin', 'Apoderado'];
                        setEditingUser((prev: any) => ({
                          ...prev,
                          roles: allRoleIds,
                          role: prev.role || 'Docente'
                        }));
                      }}
                      style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '2px 7px', cursor: 'pointer' }}
                      title="Marcar todos los perfiles"
                    >
                      Marcar Todos
                    </button>
                    <span style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 800, background: '#eef2ff', padding: '2px 8px', borderRadius: '10px', border: '1px solid #c7d2fe' }}>
                      {parseRolesList(editingUser.roles, editingUser.role).length} perfil(es) asignado(s)
                    </span>
                  </div>
                </div>
                <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.74rem', color: '#64748b', lineHeight: '1.3' }}>
                  Marca todos los perfiles que desempeñará este funcionario. El usuario podrá alternar entre ellos desde la barra superior.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginBottom: '0.7rem' }}>
                  {[
                    { id: 'Docente', label: 'Docente', icon: '👨‍🏫' },
                    { id: 'Director', label: 'Directivo / UTP', icon: '🎓' },
                    { id: 'Entrevistador', label: 'Entrevistador', icon: '🗣️' },
                    { id: 'Asistente', label: 'Asistente Ed.', icon: '🤝' },
                    { id: 'Administrativo', label: 'Administrativo', icon: '📋' },
                    { id: 'Profesionales', label: 'Profesional PIE', icon: '🧠' },
                    { id: 'Admin', label: 'Administrador', icon: '👑' },
                    { id: 'Apoderado', label: 'Apoderado', icon: '👨‍👩‍👧' }
                  ].map(r => {
                    const currentRoles: string[] = parseRolesList(editingUser.roles, editingUser.role);
                    const isChecked = currentRoles.includes(r.id);

                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => {
                          setEditingUser((prev: any) => {
                            const prevRoles = parseRolesList(prev.roles, prev.role);
                            const alreadyChecked = prevRoles.includes(r.id);
                            let nextRoles: string[];
                            if (alreadyChecked) {
                              if (prevRoles.length <= 1) {
                                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'El usuario debe mantener al menos 1 perfil activo.', timer: 2000, showConfirmButton: false });
                                return prev;
                              }
                              nextRoles = prevRoles.filter(x => x !== r.id);
                            } else {
                              nextRoles = [...prevRoles, r.id];
                            }
                            const prevPrimary = normalizeRoleId(prev.role || nextRoles[0]);
                            const newPrimary = nextRoles.includes(prevPrimary) ? prevPrimary : nextRoles[0];
                            return {
                              ...prev,
                              roles: nextRoles,
                              role: newPrimary
                            };
                          });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.42rem 0.6rem',
                          borderRadius: '8px',
                          border: isChecked ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: isChecked ? '#eef2ff' : '#ffffff',
                          color: isChecked ? '#3730a3' : '#475569',
                          fontWeight: isChecked ? 800 : 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <span style={{ fontSize: '0.95rem' }}>{r.icon}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                        {isChecked && <Check size={14} color="#4f46e5" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>

                {/* SELECTOR DE ROL PRINCIPAL / PREDETERMINADO */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.55rem' }}>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap' }}>
                    ⭐ Perfil Principal:
                  </label>
                  <select
                    value={normalizeRoleId(editingUser.role || parseRolesList(editingUser.roles, editingUser.role)[0] || 'Docente')}
                    onChange={e => {
                      const newPrimary = normalizeRoleId(e.target.value);
                      setEditingUser((prev: any) => {
                        const prevRoles = parseRolesList(prev.roles, prev.role);
                        const nextRoles = prevRoles.includes(newPrimary) ? prevRoles : [newPrimary, ...prevRoles];
                        return { ...prev, role: newPrimary, roles: nextRoles };
                      });
                    }}
                    style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', background: '#ffffff' }}
                  >
                    {parseRolesList(editingUser.roles, editingUser.role).map((r: string) => (
                      <option key={r} value={r}>{r} (Predeterminado al entrar)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>Correo Institucional</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingUser((prev: any) => ({ ...prev, email: val }));
                    }}
                    placeholder="ejemplo@eduvallediguillin.gob.cl"
                    style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>Contraseña Secreta</label>
                  <input
                    type="text"
                    value={editingUser.password_plain || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingUser((prev: any) => ({ ...prev, password_plain: val }));
                    }}
                    placeholder="Contraseña del usuario"
                    style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', position: 'sticky', bottom: 0, background: '#ffffff' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn" style={{ background: '#e2e8f0', color: '#334155', fontWeight: 700 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, padding: '0.55rem 1.2rem' }}>
                  <Save size={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDICIÓN DE CURSOS (SUB-VENTANA 6.1) */}
      {editingCourse && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5' }}>
                {editingCourse.isNew ? 'Crear Nuevo Curso' : 'Editar Curso / Nivel'}
              </h3>
              <button onClick={() => setEditingCourse(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveCourseEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Nombre del Curso</label>
                <input
                  type="text"
                  value={editingCourse.name || ''}
                  onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })}
                  placeholder="Ej: 1° Medio A"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Capacidad Total (Cupos)</label>
                <input
                  type="number"
                  value={editingCourse.capacity || 45}
                  onChange={e => setEditingCourse({ ...editingCourse, capacity: parseInt(e.target.value, 10) || 45 })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Profesor Jefe Asignado</label>
                <select
                  value={editingCourse.teacher || 'Sin Asignar'}
                  onChange={e => setEditingCourse({ ...editingCourse, teacher: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  <option value="Sin Asignar">🚫 Sin Asignar</option>
                  {editingCourse.teacher && editingCourse.teacher !== 'Sin Asignar' && !usersList.some((u: any) => u.name === editingCourse.teacher) && (
                    <option value={editingCourse.teacher}>{editingCourse.teacher}</option>
                  )}
                  {usersList.map((u: any) => (
                    <option key={u.id} value={u.name}>{u.name} ({u.job_function || u.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingCourse(null)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDICIÓN DE ASIGNATURAS (SUB-VENTANA 6.2) */}
      {editingSubject && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5' }}>
                {editingSubject.isNew ? 'Crear Nueva Asignatura' : 'Editar Asignatura'}
              </h3>
              <button onClick={() => setEditingSubject(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveSubjectEdit}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Nombre de la Asignatura</label>
                <input
                  type="text"
                  value={editingSubject.name || ''}
                  onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  placeholder="Ej: Matemática"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingSubject(null)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDICIÓN DE ENLACES EXTERNOS (SUB-VENTANA 6.9) */}
      {editingLink && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5' }}>
                {editingLink.isNew ? 'Crear Nuevo Enlace' : 'Editar Enlace Externo'}
              </h3>
              <button onClick={() => setEditingLink(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveLinkEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>Título del Enlace</label>
                <input
                  type="text"
                  value={editingLink.name || ''}
                  onChange={e => setEditingLink({ ...editingLink, name: e.target.value })}
                  placeholder="Ej: Lira Mineduc"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>URL Directa</label>
                <input
                  type="url"
                  value={editingLink.url || ''}
                  onChange={e => setEditingLink({ ...editingLink, url: e.target.value })}
                  placeholder="https://ejemplo.cl"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingLink(null)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: NUEVA O EDICIÓN DE ASIGNACIÓN DOCENTE */}
      {showAssignmentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {editingAssignment ? 'Editar Asignación Docente' : 'Crear Nueva Asignación Docente'}
              </h3>
              <button onClick={() => { setShowAssignmentModal(false); setEditingAssignment(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateAssignment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Profesor Docente Principal (Titular)</label>
                <select
                  value={newAssignment.teacherName}
                  onChange={e => setNewAssignment({ ...newAssignment, teacherName: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                  required
                >
                  <option value="">-- Seleccionar Profesor Principal --</option>
                  {newAssignment.teacherName && !usersList.some(u => u.name === newAssignment.teacherName) && (
                    <option value={newAssignment.teacherName}>👩‍🏫 {newAssignment.teacherName}</option>
                  )}
                  {usersList.map(u => (
                    <option key={u.id} value={u.name}>
                      👩‍🏫 {u.name} ({u.run || 'Sin RUT'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>2° Profesor Docente / Co-Docente (Opcional - Ingreso de Notas)</label>
                <select
                  value={newAssignment.teacherName2}
                  onChange={e => setNewAssignment({ ...newAssignment, teacherName2: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                >
                  <option value="">🚫 Ninguno / Sin Co-Docente</option>
                  {newAssignment.teacherName2 && newAssignment.teacherName2 !== '🚫 Ninguno / Sin Co-Docente' && !usersList.some(u => u.name === newAssignment.teacherName2) && (
                    <option value={newAssignment.teacherName2}>👩‍🏫 {newAssignment.teacherName2}</option>
                  )}
                  {usersList.filter(u => u.name !== newAssignment.teacherName).map(u => (
                    <option key={u.id} value={u.name}>
                      👩‍🏫 {u.name} ({u.run || 'Sin RUT'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Curso / Nivel Asignado</label>
                <select
                  value={newAssignment.levelName}
                  onChange={e => setNewAssignment({ ...newAssignment, levelName: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                  required
                >
                  <option value="">-- Seleccionar Curso --</option>
                  {sortCoursesList(coursesList).map(c => (
                    <option key={c.id} value={c.name}>
                      🏫 {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Asignatura / Materia Mapeada</label>
                <select
                  value={newAssignment.subjectName}
                  onChange={e => setNewAssignment({ ...newAssignment, subjectName: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600 }}
                  required
                >
                  <option value="">-- Seleccionar Asignatura --</option>
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.name}>
                      📚 {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => { setShowAssignmentModal(false); setEditingAssignment(null); }} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <Save size={16} /> {editingAssignment ? 'Actualizar Asignación' : 'Guardar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 5: AGREGAR / EDITAR PLATAFORMA DE INTERÉS O ENLACE INSTITUCIONAL */}
      {editingLink && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: 0 }}>
                {editingLink.isNew ? 'Nueva Plataforma de Interés' : 'Editar Plataforma Institucional'}
              </h3>
              <button onClick={() => setEditingLink(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveLink}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Título / Nombre de la Plataforma</label>
                <input
                  type="text"
                  value={editingLink.name || ''}
                  onChange={e => setEditingLink({ ...editingLink, name: e.target.value })}
                  placeholder="ej: Uso de Dispositivos Móviles, Netcore / Lira Mineduc..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>URL Directa de Acceso</label>
                <input
                  type="url"
                  value={editingLink.url || ''}
                  onChange={e => setEditingLink({ ...editingLink, url: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Categoría / Tipo de Acceso</label>
                <select
                  value={editingLink.category || 'Plataforma Institucional'}
                  onChange={e => setEditingLink({ ...editingLink, category: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 600 }}
                >
                  <option value="Plataforma Institucional">Plataforma Institucional</option>
                  <option value="Herramienta Pedagógica">Herramienta Pedagógica</option>
                  <option value="Gestión & Registros">Gestión & Registros</option>
                  <option value="MINEDUC & Normativa">MINEDUC & Normativa</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Estilo de Color de la Tarjeta</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Índigo', val: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' },
                    { label: 'Azul', val: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
                    { label: 'Verde', val: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' },
                    { label: 'Púrpura', val: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' },
                    { label: 'Ámbar', val: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }
                  ].map(col => (
                    <button
                      type="button"
                      key={col.val}
                      onClick={() => setEditingLink({ ...editingLink, color: col.val })}
                      style={{
                        background: col.val,
                        color: '#ffffff',
                        border: (editingLink.color === col.val || (!editingLink.color && col.label === 'Índigo')) ? '3px solid #0f172a' : '1px solid transparent',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setEditingLink(null)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <Save size={16} /> Guardar Enlace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ASISTENTE DE PROMOCIÓN ESCOLAR ASISTIDA POR CURSO (2026 ➔ 2027) */}
      {showPromotionModal && (() => {
        const activeStudents = allStudentsList.filter(s => !isStudentRetired(s));
        let totalPromoted = 0;
        let totalRepeater = 0;
        let totalTransferred = 0;
        let totalGraduated = 0;

        activeStudents.forEach(s => {
          const dec = promotionDecisions[s.id] || { status: (s.desc_grado || '').toLowerCase().includes('4° medio') ? 'EGRESADO' : 'PROMOVIDO' };
          if (dec.status === 'PROMOVIDO') totalPromoted++;
          else if (dec.status === 'REPITENTE') totalRepeater++;
          else if (dec.status === 'CAMBIO_LICEO') totalTransferred++;
          else if (dec.status === 'EGRESADO') totalGraduated++;
        });

        const filteredStudents = activeStudents.filter(s => {
          const cName = getStudentCourse(s);
          const matchesCourse = promotionCourseFilter === 'Todos' || cName === promotionCourseFilter;
          const term = promotionSearchTerm.toLowerCase().trim();
          const fullName = `${s.nombres || ''} ${s.apellido_paterno || ''} ${s.apellido_materno || ''}`.toLowerCase();
          const run = (s.run || '').toLowerCase();
          const matchesSearch = !term || fullName.includes(term) || run.includes(term);
          return matchesCourse && matchesSearch;
        });

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '1100px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              {/* ENCABEZADO DEL ASISTENTE */}
              <div style={{ padding: '1.25rem 1.75rem', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                    <GraduationCap size={24} /> Asistente de Cierre de Año y Promoción Escolar (2026 ➔ 2027)
                  </h3>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                    Seleccione cada curso para verificar quiénes continúan al nivel siguiente, quiénes repiten curso o quiénes se trasladan de liceo.
                  </p>
                </div>
                <button
                  onClick={() => setShowPromotionModal(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* BARRA DE ESTADÍSTICAS EN VIVO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', padding: '1rem 1.75rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ background: '#ffffff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Total en Nómina</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{activeStudents.length}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>🟢 Promovidos (Avanzan)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>{totalPromoted}</div>
                </div>
                <div style={{ background: '#fefce8', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #fef08a', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#854d0e', fontWeight: 700 }}>🟡 Repitentes (Permanecen)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a16207' }}>{totalRepeater}</div>
                </div>
                <div style={{ background: '#fff1f2', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #fecdd3', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9f1239', fontWeight: 700 }}>🔴 Se Cambian de Liceo</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#be123c' }}>{totalTransferred}</div>
                </div>
                <div style={{ background: '#e0e7ff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #c7d2fe', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#3730a3', fontWeight: 700 }}>🎓 Egresados 2026</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4338ca' }}>{totalGraduated}</div>
                </div>
              </div>

              {/* FILTROS Y ACCIONES EN LOTE POR CURSO */}
              <div style={{ padding: '0.85rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Filter size={16} color="#4f46e5" />
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Filtrar Curso:</label>
                    <select
                      value={promotionCourseFilter}
                      onChange={e => setPromotionCourseFilter(e.target.value)}
                      style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, background: '#ffffff', color: '#0f172a' }}
                    >
                      <option value="Todos">🏫 Todos los Cursos ({activeStudents.length} estudiantes)</option>
                      {sortCoursesList(coursesList).map(c => (
                        <option key={c.id} value={c.name}>
                          🏫 {c.name} ({c.enrolled} alumnos)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Buscar por RUN o Alumno..."
                      value={promotionSearchTerm}
                      onChange={e => setPromotionSearchTerm(e.target.value)}
                      style={{ padding: '0.45rem 0.6rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '100%' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Acciones rápidas (visibles):</span>
                  <button
                    onClick={() => handleMarkFilteredAs('PROMOVIDO')}
                    className="btn"
                    style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Marcar Promovidos
                  </button>
                  <button
                    onClick={() => handleMarkFilteredAs('REPITENTE')}
                    className="btn"
                    style={{ background: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Marcar Repitentes
                  </button>
                  <button
                    onClick={() => handleMarkFilteredAs('CAMBIO_LICEO')}
                    className="btn"
                    style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', padding: '0.35rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Marcar Cambio Liceo
                  </button>
                </div>
              </div>

              {/* TABLA SCROLLABLE CON SELECTOR INDIVIDUAL */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 700 }}>RUN</th>
                      <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 700 }}>Estudiante</th>
                      <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 700 }}>Curso Actual 2026</th>
                      <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 700, minWidth: '320px' }}>Decisión de Promoción</th>
                      <th style={{ padding: '0.75rem', color: '#475569', fontWeight: 700 }}>Destino 2027 Proyectado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                          No se encontraron estudiantes para el curso o búsqueda seleccionada.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(s => {
                        const fullName = `${s.nombres || ''} ${s.apellido_paterno || ''} ${s.apellido_materno || ''}`.trim() || 'Estudiante';
                        const currentCourse = getStudentCourse(s);
                        const is4to = (s.desc_grado || '').toLowerCase().includes('4° medio');
                        const dec = promotionDecisions[s.id] || { status: is4to ? 'EGRESADO' : 'PROMOVIDO' };
                        const currentStatus = dec.status;

                        let projected = '';
                        if (currentStatus === 'PROMOVIDO') {
                          projected = `➔ ${getNextGradeProjection(s.desc_grado, s.letra_curso)}`;
                        } else if (currentStatus === 'REPITENTE') {
                          projected = `↺ Permanece en ${s.desc_grado || currentCourse}`;
                        } else if (currentStatus === 'CAMBIO_LICEO') {
                          projected = '✕ Retirado (Cambio de Liceo)';
                        } else if (currentStatus === 'EGRESADO') {
                          projected = '🎓 Licenciado / Egresado 2026';
                        }

                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#334155' }}>
                              {s.run || 'Sin RUN'}
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                              {fullName}
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>
                              <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                                {currentCourse}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem' }}>
                              <div style={{ display: 'inline-flex', gap: '0.35rem', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => setPromotionDecisions(prev => ({ ...prev, [s.id]: { status: 'PROMOVIDO' } }))}
                                  style={{
                                    border: 'none',
                                    background: currentStatus === 'PROMOVIDO' ? '#16a34a' : 'transparent',
                                    color: currentStatus === 'PROMOVIDO' ? '#ffffff' : '#334155',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Continúa al curso siguiente"
                                >
                                  🟢 Promovido
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPromotionDecisions(prev => ({ ...prev, [s.id]: { status: 'REPITENTE' } }))}
                                  style={{
                                    border: 'none',
                                    background: currentStatus === 'REPITENTE' ? '#ca8a04' : 'transparent',
                                    color: currentStatus === 'REPITENTE' ? '#ffffff' : '#334155',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Permanece en el mismo nivel para 2027"
                                >
                                  🟡 Repite
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPromotionDecisions(prev => ({ ...prev, [s.id]: { status: 'CAMBIO_LICEO' } }))}
                                  style={{
                                    border: 'none',
                                    background: currentStatus === 'CAMBIO_LICEO' ? '#dc2626' : 'transparent',
                                    color: currentStatus === 'CAMBIO_LICEO' ? '#ffffff' : '#334155',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Se cambia de liceo / Retirado"
                                >
                                  🔴 Se cambia de liceo
                                </button>
                                {is4to && (
                                  <button
                                    type="button"
                                    onClick={() => setPromotionDecisions(prev => ({ ...prev, [s.id]: { status: 'EGRESADO' } }))}
                                    style={{
                                      border: 'none',
                                      background: currentStatus === 'EGRESADO' ? '#4f46e5' : 'transparent',
                                      color: currentStatus === 'EGRESADO' ? '#ffffff' : '#334155',
                                      padding: '0.25rem 0.55rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title="Licenciado de 4° Medio"
                                  >
                                    🎓 Egresa
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, color: currentStatus === 'PROMOVIDO' ? '#15803d' : (currentStatus === 'REPITENTE' ? '#854d0e' : (currentStatus === 'CAMBIO_LICEO' ? '#9f1239' : '#4338ca')) }}>
                              {projected}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PIE DE PÁGINA CON BOTÓN DE EJECUCIÓN */}
              <div style={{ padding: '1rem 1.75rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Mostrando <strong>{filteredStudents.length}</strong> de <strong>{activeStudents.length}</strong> estudiantes. Verifique antes de continuar.
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowPromotionModal(false)}
                    className="btn"
                    style={{ background: '#e2e8f0', color: '#334155', fontWeight: 600 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecutePromotion}
                    className="btn btn-primary"
                    style={{ fontWeight: 800, padding: '0.65rem 1.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                  >
                    <CheckCircle2 size={18} /> Confirmar y Ejecutar Promoción Escolar 2026 ➔ 2027
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
