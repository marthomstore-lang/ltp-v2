import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, AlertTriangle, CheckCircle2, User, Search, Plus, Filter, Mail, ArrowRight, ShieldAlert, FileText, CheckSquare, RefreshCw, X, Save, ExternalLink, Printer, Trash2, Eye } from 'lucide-react';
import { getStudentCourse, sortCoursesList } from '../utils/course';
import { getModuleSubTabFromUrl, syncModuleSubUrl } from '../utils/urlRouter';
import Swal from 'sweetalert2';
import { ComputerLabModule } from './ComputerLabModule';

interface Props {
  token: string;
  user: any;
}

export const LibraryCRAModule: React.FC<Props> = ({ token, user }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'books' | 'reading_plan' | 'loans' | 'returns' | 'daily_materials' | 'communications' | 'withdrawal_check' | 'reports' | 'reservations'>(() =>
    getModuleSubTabFromUrl('library', 'dashboard') as any
  );

  useEffect(() => {
    syncModuleSubUrl('library', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handlePop = () => {
      setActiveTab(getModuleSubTabFromUrl('library', 'dashboard') as any);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // ESTADOS DEL DASHBOARD Y RESUMEN
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ESTADOS DE CATALOGO DE LIBROS
  const [booksList, setBooksList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [levelFilter, setLevelFilter] = useState<string>('Todos');

  // ESTADOS DE PRÉSTAMOS
  const [loansList, setLoansList] = useState<any[]>([]);
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('Activos');

  // ESTADOS DE MATERIALES DIARIOS
  const [dailyMaterials, setDailyMaterials] = useState<any[]>([]);
  const [pendingDailyLoans, setPendingDailyLoans] = useState<any[]>([]);

  // ESTADOS DE ESTUDIANTES Y DEUDA
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  // MODALES
  const [showNewBookModal, setShowNewBookModal] = useState<boolean>(false);
  const [newBookForm, setNewBookForm] = useState({
    title: '', author: '', publisher: '', year: 2024, isbn: '', category: 'Lectura Complementaria', levelSuggested: '', isReadingPlan: true, readingPeriod: 'Marzo - Abril', location: 'Estante A1', totalCopies: 5, observations: ''
  });

  const [showNewLoanModal, setShowNewLoanModal] = useState<boolean>(false);
  const [selectedCourseForLoan, setSelectedCourseForLoan] = useState<string>('Todos');
  const [selectedStudentForLoan, setSelectedStudentForLoan] = useState<any>(null);
  const [studentDebtCheck, setStudentDebtCheck] = useState<any>(null);
  const [bookSearchTermInModal, setBookSearchTermInModal] = useState<string>('');
  const [teacherSearchTermInModal, setTeacherSearchTermInModal] = useState<string>('');
  const [newLoanForm, setNewLoanForm] = useState({
    studentId: '', studentName: '', courseName: '', teacherName: '', bookId: '', copyCode: '', customDueDate: '', overrideReason: '', observations: ''
  });

  const [showReturnModal, setShowReturnModal] = useState<any>(null);
  const [returnCondition, setReturnCondition] = useState<string>('Devuelto Correctamente');

  const [showDailyLoanModal, setShowDailyLoanModal] = useState<boolean>(false);
  const [selectedCourseForDailyLoan, setSelectedCourseForDailyLoan] = useState<string>('Todos');
  const [newDailyForm, setNewDailyForm] = useState({
    materialId: '', studentName: '', courseName: '', observations: ''
  });

  // CURSOS Y FILTROS DINÁMICOS DE ESTUDIANTES NORMALIZADOS
  const availableCourses = React.useMemo(() => {
    const set = new Set<string>();
    studentsList.forEach(s => {
      const c = getStudentCourse(s);
      if (c && c.trim() && c !== 'Sin Curso') {
        set.add(c.trim());
      }
    });
    return sortCoursesList(Array.from(set));
  }, [studentsList]);

  const filteredStudentsForLoan = React.useMemo(() => {
    if (!selectedCourseForLoan || selectedCourseForLoan === 'Todos') {
      return studentsList;
    }
    return studentsList.filter(s => getStudentCourse(s) === selectedCourseForLoan);
  }, [studentsList, selectedCourseForLoan]);

  const filteredStudentsForDailyLoan = React.useMemo(() => {
    if (!selectedCourseForDailyLoan || selectedCourseForDailyLoan === 'Todos') {
      return studentsList;
    }
    return studentsList.filter(s => getStudentCourse(s) === selectedCourseForDailyLoan);
  }, [studentsList, selectedCourseForDailyLoan]);

  // FILTROS EN TIEMPO REAL PARA EL MODAL DE PRÉSTAMO (LIBROS Y DOCENTES)
  const filteredBooksInModal = React.useMemo(() => {
    if (!bookSearchTermInModal.trim()) return booksList;
    const term = bookSearchTermInModal.toLowerCase().trim();
    return booksList.filter(b =>
      (b.title && b.title.toLowerCase().includes(term)) ||
      (b.author && b.author.toLowerCase().includes(term)) ||
      (b.biblio_code && b.biblio_code.toLowerCase().includes(term)) ||
      (b.category && b.category.toLowerCase().includes(term)) ||
      (b.level_suggested && b.level_suggested.toLowerCase().includes(term))
    );
  }, [booksList, bookSearchTermInModal]);

  const filteredTeachersInModal = React.useMemo(() => {
    if (!teacherSearchTermInModal.trim()) return teachersList;
    const term = teacherSearchTermInModal.toLowerCase().trim();
    return teachersList.filter(t =>
      (t.full_name && t.full_name.toLowerCase().includes(term)) ||
      (t.name && t.name.toLowerCase().includes(term)) ||
      (t.subject_specialty && t.subject_specialty.toLowerCase().includes(term)) ||
      (t.department && t.department.toLowerCase().includes(term)) ||
      (t.role && t.role.toLowerCase().includes(term))
    );
  }, [teachersList, teacherSearchTermInModal]);

  // COMUNICACIONES Y PREVISUALIZACIÓN DE CORREO
  const [pendingComms, setPendingComms] = useState<any[]>([]);
  const [previewEmailModal, setPreviewEmailModal] = useState<any>(null);

  // VERIFICACIÓN DE RETIRO
  const [withdrawalStudentSearch, setWithdrawalStudentSearch] = useState<string>('');
  const [withdrawalResult, setWithdrawalResult] = useState<any>(null);

  // VERIFICACIÓN DE EJEMPLARES
  const [viewCopiesModal, setViewCopiesModal] = useState<any>(null);
  const [bookCopiesList, setBookCopiesList] = useState<any[]>([]);

  // CARGAR DATOS GENERALES
  const loadDashboard = () => {
    setLoading(true);
    fetch('/api/library/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setDashboardStats(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const loadBooks = () => {
    fetch(`/api/library/books?search=${encodeURIComponent(searchTerm)}&category=${encodeURIComponent(categoryFilter)}&level=${encodeURIComponent(levelFilter)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setBooksList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const loadLoans = () => {
    fetch(`/api/library/loans?search=${encodeURIComponent(searchTerm)}&status=${encodeURIComponent(loanStatusFilter)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setLoansList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const loadDailyMaterials = () => {
    fetch('/api/library/daily-materials', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setDailyMaterials(data.materials || []);
          setPendingDailyLoans(data.pendingLoans || []);
        }
      })
      .catch(err => console.error(err));
  };

  const loadCommunications = () => {
    fetch('/api/library/communications/pending', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPendingComms(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const loadStudents = () => {
    fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStudentsList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const loadTeachers = () => {
    fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTeachersList(data);
        } else {
          fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(usrData => {
              if (Array.isArray(usrData)) {
                setTeachersList(usrData.filter((u: any) => u.role === 'Docente' || u.role === 'Admin'));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadDashboard();
    loadBooks();
    loadLoans();
    loadDailyMaterials();
    loadCommunications();
    loadStudents();
    loadTeachers();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'books' || activeTab === 'reading_plan') loadBooks();
    if (activeTab === 'loans' || activeTab === 'returns') loadLoans();
    if (activeTab === 'daily_materials') loadDailyMaterials();
    if (activeTab === 'communications') loadCommunications();
  }, [activeTab, searchTerm, categoryFilter, levelFilter, loanStatusFilter]);

  // REGLA CRÍTICA: VERIFICAR DEUDA AL SELECCIONAR UN ESTUDIANTE EN PRÉSTAMO
  const handleSelectStudentForLoan = (stName: string) => {
    const found = studentsList.find(s => s.full_name === stName || s.run === stName);
    const stId = found ? found.id : stName;
    const cName = found ? found.desc_grado : '';

    setNewLoanForm(prev => ({ ...prev, studentId: stId, studentName: stName, courseName: cName }));

    if (stName) {
      fetch(`/api/library/students/check-debt/${encodeURIComponent(stId || stName)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setStudentDebtCheck(data))
        .catch(err => console.error(err));
    } else {
      setStudentDebtCheck(null);
    }
  };

  // REGISTRAR PRÉSTAMO CON CÁLCULO DE 21 DÍAS Y EXCEPCIÓN
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanForm.studentName || !newLoanForm.bookId) {
      Swal.fire('Atención', 'Debe seleccionar un estudiante y un libro.', 'warning');
      return;
    }

    if (studentDebtCheck && studentDebtCheck.hasDebt && !newLoanForm.overrideReason) {
      Swal.fire({
        icon: 'error',
        title: 'Estudiante con Devolución Pendiente',
        text: `El estudiante ${newLoanForm.studentName} registra libros no devueltos. Para proceder de forma excepcional, ingrese el motivo de autorización.`,
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    try {
      const res = await fetch('/api/library/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newLoanForm)
      });
      const data = await res.json();

      if (res.ok) {
        setShowNewLoanModal(false);
        setSearchTerm('');
        setLoanStatusFilter('Activos');
        setActiveTab('loans');
        Swal.fire({
          icon: 'success',
          title: '¡Préstamo Registrado!',
          text: `Préstamo creado exitosamente para ${newLoanForm.studentName}. Ejemplar: ${data.assignedCopyCode}. Vence el: ${data.dueDate} (21 días).`,
          confirmButtonColor: '#4f46e5'
        });
        loadLoans();
        loadDashboard();
        loadBooks();
        loadCommunications();
        setNewLoanForm({ studentId: '', studentName: '', courseName: '', teacherName: '', bookId: '', copyCode: '', customDueDate: '', overrideReason: '', observations: '' });
        setStudentDebtCheck(null);
      } else {
        Swal.fire('Error', data.error || 'No se pudo crear el préstamo.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
    }
  };

  // REGISTRAR DEVOLUCIÓN DE LIBRO
  const handleConfirmReturn = async () => {
    if (!showReturnModal) return;
    try {
      const res = await fetch(`/api/library/loans/${showReturnModal.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ returnCondition })
      });
      if (res.ok) {
        setShowReturnModal(null);
        Swal.fire('Devuelto', 'El libro ha sido ingresado al inventario y el préstamo cerrado.', 'success');
        loadLoans();
        loadDashboard();
        loadBooks();
      } else {
        Swal.fire('Error', 'No se pudo registrar la devolución.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de comunicación.', 'error');
    }
  };

  // CREAR PRÉSTAMO DIARIO
  const handleCreateDailyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDailyForm.materialId || !newDailyForm.studentName) {
      Swal.fire('Atención', 'Seleccione un material y el estudiante.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/library/daily-materials/loan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newDailyForm)
      });
      if (res.ok) {
        setShowDailyLoanModal(false);
        Swal.fire('Préstamo Diario Creado', 'Material registrado correctamente. Debe ser devuelto durante la jornada.', 'success');
        loadDailyMaterials();
        loadDashboard();
        setNewDailyForm({ materialId: '', studentName: '', courseName: '', observations: '' });
      } else {
        Swal.fire('Error', 'No se pudo registrar préstamo diario.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Falló conexión con el servidor.', 'error');
    }
  };

  // DEVOLUCIÓN DE MATERIAL DIARIO
  const handleReturnDailyLoan = async (loanId: string) => {
    try {
      const res = await fetch(`/api/library/daily-materials/return/${loanId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        Swal.fire('Material Devuelto', 'Devolución diaria registrada exitosamente.', 'success');
        loadDailyMaterials();
        loadDashboard();
      }
    } catch (err) {
      Swal.fire('Error', 'No se pudo devolver el material.', 'error');
    }
  };

  // CREAR NUEVO LIBRO
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookForm.title || !newBookForm.author) {
      Swal.fire('Atención', 'Título y Autor son obligatorios.', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/library/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newBookForm)
      });
      const data = await res.json();
      if (res.ok) {
        setShowNewBookModal(false);
        Swal.fire('Libro Creado', `Libro "${newBookForm.title}" registrado con ${newBookForm.totalCopies} ejemplares en inventario.`, 'success');
        loadBooks();
        loadDashboard();
      } else {
        Swal.fire('Error', data.error || 'Error al guardar libro.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Fallo de conexión.', 'error');
    }
  };

  // PREVISUALIZAR Y ENVIAR CORREO A DOCENTE
  const handleOpenEmailPreview = (commGroup: any) => {
    const casesText = commGroup.cases.map((c: any, idx: number) => (
      `${idx + 1}. Estudiante: ${c.student_name} (${c.course_name})\n   - Libro: ${c.book_title} [Código: ${c.copy_code}]\n   - Vencimiento: ${c.due_date} (${c.overdue_days > 0 ? `${c.overdue_days} días de atraso` : 'Próximo a vencer'})`
    )).join('\n\n');

    const body = `Estimado/a Profesor/a ${commGroup.teacherName}:\n\n` +
      `Junto con saludar, le solicitamos su valiosa colaboración en el Centro de Recursos para el Aprendizaje (Biblioteca CRA - Liceo Técnico Profesional Campanario Marcos Delucchi Fonck) ` +
      `para recordar a los siguientes estudiantes pertenecientes a sus asignaturas/jefatura la devolución de sus textos pendientes:\n\n` +
      `${casesText}\n\n` +
      `Agradecemos enormemente su gestión para mantener la disponibilidad de libros para toda la comunidad escolar.\n\n` +
      `Atentamente,\n` +
      `Encargado/a Biblioteca CRA\n` +
      `Liceo Técnico Profesional Campanario Marcos Delucchi Fonck`;

    setPreviewEmailModal({
      teacherName: commGroup.teacherName,
      teacherEmail: commGroup.teacherEmail,
      subject: `Recordatorio Devolución Libros Biblioteca CRA – ${commGroup.teacherName}`,
      bodyText: body,
      casesCount: commGroup.cases.length,
      cases: commGroup.cases
    });
  };

  const handleSendEmail = async () => {
    if (!previewEmailModal) return;
    try {
      const res = await fetch('/api/library/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(previewEmailModal)
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewEmailModal(null);
        if (data.status === 'Abrir Gmail') {
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(previewEmailModal.teacherEmail)}&su=${encodeURIComponent(previewEmailModal.subject)}&body=${encodeURIComponent(previewEmailModal.bodyText)}`;
          window.open(gmailUrl, '_blank');
          Swal.fire('Gmail Abierto', 'Se abrió la ventana de composición de Gmail con el mensaje previsualizado listo para enviar.', 'info');
        } else {
          Swal.fire('Correo Enviado', `Se envió el recordatorio formal a ${previewEmailModal.teacherEmail} exitosamente via SMTP Google Workspace.`, 'success');
        }
        loadCommunications();
      } else {
        Swal.fire('Error', 'No se pudo procesar el envío de correo.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error al comunicar con servidor.', 'error');
    }
  };

  // MÓDULO RETIRO DE ESTUDIANTES
  const handleCheckWithdrawal = () => {
    if (!withdrawalStudentSearch) return;
    fetch(`/api/library/withdrawal-check/${encodeURIComponent(withdrawalStudentSearch)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setWithdrawalResult(data))
      .catch(() => Swal.fire('Error', 'No se encontró el estudiante.', 'error'));
  };

  // VER EJEMPLARES
  const handleViewCopies = (book: any) => {
    setViewCopiesModal(book);
    fetch(`/api/library/books/${book.id}/copies`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setBookCopiesList(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  return (
    <div style={{ padding: '0.5rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* CABECERA INSTITUCIONAL BIBLIOTECA CRA LICEO CAMPANARIO */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <BookOpen size={28} color="#818cf8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#c7d2fe' }}>
              Sistema de Gestión y Control Digital
            </span>
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            BIBLIOTECA CRA – LICEO TÉCNICO PROFESIONAL CAMPANARIO MARCOS DELUCCHI FONCK
          </h1>
          <p style={{ fontSize: '0.95rem', opacity: 0.9, margin: '0.4rem 0 0 0', fontWeight: 500 }}>
            Control Integral de Inventario, Plan de Lectura 1° Básico a 4° Medio, Préstamos de 21 Días y Materiales Diarios
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowNewLoanModal(true)}
            style={{
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              padding: '0.7rem 1.2rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)'
            }}
          >
            <Plus size={18} /> + Nuevo Préstamo Libro (21 Días)
          </button>
          <button
            onClick={() => setShowDailyLoanModal(true)}
            style={{
              background: '#f59e0b',
              color: '#ffffff',
              border: 'none',
              padding: '0.7rem 1.2rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
            }}
          >
            <Clock size={18} /> + Nuevo Préstamo Diario
          </button>
        </div>
      </div>

      {/* MENÚ DE NAVEGACIÓN TAB NATIVO DEL MÓDULO CRA */}
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        background: '#ffffff',
        padding: '0.5rem',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        {[
          { id: 'dashboard', label: '1. Inicio / KPIs', icon: BookOpen },
          { id: 'books', label: '2. Catálogo & Inventario', icon: FileText },
          { id: 'reading_plan', label: '3. Plan de Lectura', icon: CheckSquare },
          { id: 'loans', label: '4. Préstamos Activos', icon: Calendar },
          { id: 'returns', label: '5. Devoluciones', icon: RefreshCw },
          { id: 'daily_materials', label: '6. Materiales Diarios', icon: Clock },
          { id: 'communications', label: '7. Comunicaciones Gmail', icon: Mail },
          { id: 'withdrawal_check', label: '8. Retiro Estudiantes', icon: ShieldAlert },
          { id: 'reports', label: '9. Reportes & PDF/Excel', icon: Printer }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: 'none',
                background: active ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : 'transparent',
                color: active ? '#ffffff' : '#475569',
                fontWeight: active ? 800 : 600,
                fontSize: '0.825rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} color={active ? '#ffffff' : '#64748b'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 1. DASHBOARD / INICIO (KPIS Y ALERTAS PRIORITARIAS)                     */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && dashboardStats && (
        <div>
          {/* TARJETAS RESUMEN DE INDICADORES EN GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Títulos</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e1b4b', marginTop: '0.2rem' }}>{dashboardStats.totalTitles}</div>
              <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600, marginTop: '0.2rem' }}>{dashboardStats.totalExemplars} Ejemplares Totales</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Disponibles</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{dashboardStats.availableExemplars}</div>
              <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, marginTop: '0.2rem' }}>Libres en Estantes</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Préstamos Activos</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>{dashboardStats.activeLoans}</div>
              <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600, marginTop: '0.2rem' }}>En poder de alumnos</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #fde68a', backgroundColor: '#fffbeb' }}>
              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700, textTransform: 'uppercase' }}>Vencen Hoy</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{dashboardStats.dueToday}</div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '0.2rem' }}>Devolución Esperada</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #fecdd3', backgroundColor: '#fff1f2' }}>
              <div style={{ fontSize: '0.75rem', color: '#be123c', fontWeight: 700, textTransform: 'uppercase' }}>Libros Atrasados</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{dashboardStats.overdueNormal}</div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, marginTop: '0.2rem' }}>Atraso de 1 a 7 días</div>
            </div>

            <div style={{ background: '#7f1d1d', padding: '1.25rem', borderRadius: '14px', color: '#ffffff', boxShadow: '0 8px 16px rgba(127, 29, 29, 0.3)' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 700, textTransform: 'uppercase' }}>Atrasos Críticos</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.2rem' }}>{dashboardStats.overdueCritical}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 600, marginTop: '0.2rem' }}>Más de 7 días atrasados</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Materiales Diarios</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{dashboardStats.pendingDailyMaterials}</div>
              <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, marginTop: '0.2rem' }}>Pendientes jornada</div>
            </div>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Alumnos con Deuda</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4c1d95', marginTop: '0.2rem' }}>{dashboardStats.studentsWithDebt}</div>
              <div style={{ fontSize: '0.75rem', color: '#5b21b6', fontWeight: 600, marginTop: '0.2rem' }}>Bloqueados para retiro</div>
            </div>
          </div>

          {/* SECCIÓN ALERTAS PRIORITARIAS ORDENADAS POR GRAVEDAD */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <AlertTriangle size={22} color="#dc2626" />
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                ALERTAS PRIORITARIAS BIBLIOTECA CRA
              </h2>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Prioridad / Gravedad</th>
                    <th>Estudiante</th>
                    <th>Curso / Nivel</th>
                    <th>Docente Relacionado</th>
                    <th>Libro / Título</th>
                    <th>Código Ejemplar</th>
                    <th>Fecha Vencimiento</th>
                    <th>Contador / Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardStats.priorityAlerts && dashboardStats.priorityAlerts.length > 0 ? (
                    dashboardStats.priorityAlerts.map((alt: any) => {
                      const overdue = parseInt(alt.overdue_days || '0', 10);
                      const remaining = parseInt(alt.days_remaining || '0', 10);

                      let badgeBg = '#ecfdf5';
                      let badgeColor = '#047857';
                      let badgeText = `${remaining} días restantes`;

                      if (overdue > 7) {
                        badgeBg = '#7f1d1d';
                        badgeColor = '#ffffff';
                        badgeText = `🔴 ATRASO CRÍTICO (${overdue} días)`;
                      } else if (overdue > 0) {
                        badgeBg = '#fff1f2';
                        badgeColor = '#be123c';
                        badgeText = `⚠️ ATRASADO (${overdue} días)`;
                      } else if (remaining === 0) {
                        badgeBg = '#fffbeb';
                        badgeColor = '#b45309';
                        badgeText = '⏰ VENCE HOY';
                      } else if (remaining <= 3) {
                        badgeBg = '#fef3c7';
                        badgeColor = '#92400e';
                        badgeText = `🟡 Vence en ${remaining} días`;
                      }

                      return (
                        <tr key={alt.id}>
                          <td>
                            <span style={{ background: badgeBg, color: badgeColor, padding: '0.3rem 0.65rem', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem' }}>
                              {badgeText}
                            </span>
                          </td>
                          <td><strong>{alt.student_name}</strong></td>
                          <td>{alt.course_name}</td>
                          <td>{alt.teacher_name || 'Sin Asignar'}</td>
                          <td><strong>{alt.book_title}</strong></td>
                          <td><code>{alt.copy_code}</code></td>
                          <td>{alt.due_date}</td>
                          <td>{alt.status}</td>
                          <td>
                            <button
                              onClick={() => setShowReturnModal(alt)}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              Devolver →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        ✅ No se registran alertas ni atrasos pendientes en la Biblioteca CRA.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 2. MÓDULO CATÁLOGO & INVENTARIO DE LIBROS                               */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'books' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Catálogo de Libros e Inventario Bibliográfico
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Diferenciación entre Título General y Ejemplares Físicos Únicos
              </p>
            </div>

            <button
              onClick={() => setShowNewBookModal(true)}
              className="btn btn-primary"
              style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={16} /> + Registrar Nuevo Libro / Título
            </button>
          </div>

          {/* FILTROS Y BUSCADOR */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar por Título, Autor o Código Bibliográfico..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              >
                <option value="Todos">Todas las Categorías</option>
                <option value="Novela / Plan Lector">Novela / Plan Lector</option>
                <option value="Cuento / Infantil">Cuento / Infantil</option>
                <option value="Novela / Realismo">Novela / Realismo</option>
                <option value="Infantil / Clásico">Infantil / Clásico</option>
              </select>
            </div>
          </div>

          {/* TABLA DE LIBROS */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título del Libro</th>
                  <th>Autor</th>
                  <th>Categoría</th>
                  <th>Nivel Sugerido</th>
                  <th>Plan Lector</th>
                  <th>Ubicación</th>
                  <th>Stock Ejemplares (Total / Disp / Prest)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {booksList.map(bk => (
                  <tr key={bk.id}>
                    <td><code>{bk.biblio_code}</code></td>
                    <td><strong>{bk.title}</strong></td>
                    <td>{bk.author}</td>
                    <td><span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>{bk.category}</span></td>
                    <td>{bk.level_suggested || 'General'}</td>
                    <td>{bk.is_reading_plan ? '✅ Sí (Plan)' : 'No'}</td>
                    <td>{bk.location || 'Estante A1'}</td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{bk.total_copies}</strong> totales |{' '}
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>{bk.available_copies} libres</span> |{' '}
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>{bk.borrowed_copies} prestados</span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleViewCopies(bk)}
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} /> Ver Ejemplares ({bk.total_copies})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 3. MÓDULO PLAN DE LECTURA COMPLEMENTARIA (1° BÁSICO A 4° MEDIO)        */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'reading_plan' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
            Plan de Lectura Complementaria (1° Básico a 4° Medio)
          </h2>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nivel / Curso</th>
                  <th>Período de Lectura</th>
                  <th>Título del Libro</th>
                  <th>Autor</th>
                  <th>Disponibilidad Actual</th>
                  <th>Acción Rápida</th>
                </tr>
              </thead>
              <tbody>
                {booksList.filter(b => b.is_reading_plan).map(b => (
                  <tr key={b.id}>
                    <td><span style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.65rem', borderRadius: '6px', fontWeight: 700 }}>{b.level_suggested}</span></td>
                    <td><strong>{b.reading_period || '1er Semestre'}</strong></td>
                    <td><strong>{b.title}</strong></td>
                    <td>{b.author}</td>
                    <td>
                      <span style={{ color: b.available_copies > 0 ? '#16a34a' : '#dc2626', fontWeight: 800 }}>
                        {b.available_copies > 0 ? `🟢 ${b.available_copies} Disponibles` : '🔴 Agotado'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setNewLoanForm(prev => ({ ...prev, bookId: b.id }));
                          setShowNewLoanModal(true);
                        }}
                        disabled={b.available_copies <= 0}
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        + Préstamo Plan Lector
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 4. MÓDULO PRÉSTAMOS ACTIVOS CON CONTADOR DE DÍAS                        */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'loans' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Directorio de Préstamos Registrados
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['Activos', 'Atrasados', 'VenceHoy', 'Todos'].map(st => (
                <button
                  key={st}
                  onClick={() => setLoanStatusFilter(st)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: loanStatusFilter === st ? '#4f46e5' : '#ffffff',
                    color: loanStatusFilter === st ? '#ffffff' : '#334155',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Curso</th>
                  <th>Docente</th>
                  <th>Libro</th>
                  <th>Ejemplar</th>
                  <th>Fecha Préstamo</th>
                  <th>Fecha Devolución (21d)</th>
                  <th>Contador de Días</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loansList.map(l => {
                  const overdue = parseInt(l.overdue_days || '0', 10);
                  const remaining = parseInt(l.days_remaining || '0', 10);
                  const isReturned = l.status === 'Devuelto';

                  let badgeColor = '#16a34a';
                  let badgeText = `${remaining} días restantes`;

                  if (isReturned) {
                    badgeColor = '#64748b';
                    badgeText = 'Devuelto';
                  } else if (overdue > 7) {
                    badgeColor = '#7f1d1d';
                    badgeText = `🔴 ATRASO CRÍTICO (${overdue}d)`;
                  } else if (overdue > 0) {
                    badgeColor = '#dc2626';
                    badgeText = `⚠️ ATRASADO (${overdue}d)`;
                  } else if (remaining === 0) {
                    badgeColor = '#d97706';
                    badgeText = '⏰ VENCE HOY';
                  }

                  return (
                    <tr key={l.id}>
                      <td><strong>{l.student_name}</strong></td>
                      <td>{l.course_name}</td>
                      <td>{l.teacher_name || 'Sin Asignar'}</td>
                      <td><strong>{l.book_title}</strong></td>
                      <td><code>{l.copy_code}</code></td>
                      <td>{l.loan_date}</td>
                      <td>{l.due_date}</td>
                      <td>
                        <span style={{ color: badgeColor, fontWeight: 800, fontSize: '0.8rem' }}>
                          {badgeText}
                        </span>
                      </td>
                      <td>
                        {!isReturned && (
                          <button
                            onClick={() => setShowReturnModal(l)}
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            Devolver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 5. MÓDULO DEVOLUCIONES DE LIBROS Y RECEPCIÓN DE EJEMPLARES              */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'returns' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Gestión de Devoluciones y Recepción de Libros
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Seleccione un préstamo activo para registrar su ingreso y estado físico, o consulte el historial de devoluciones
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['Activos', 'Devueltos', 'Todos'].map(st => (
                <button
                  key={st}
                  onClick={() => setLoanStatusFilter(st)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: loanStatusFilter === st ? '#4f46e5' : '#ffffff',
                    color: loanStatusFilter === st ? '#ffffff' : '#334155',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  {st === 'Activos' ? 'Pendientes de Devolución' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Curso</th>
                  <th>Libro</th>
                  <th>Ejemplar</th>
                  <th>Fecha Préstamo</th>
                  <th>Fecha Vencimiento</th>
                  <th>Estado / Recepción</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loansList.length > 0 ? (
                  loansList.map(l => {
                    const isReturned = l.status === 'Devuelto';
                    return (
                      <tr key={l.id}>
                        <td><strong>{l.student_name}</strong></td>
                        <td>{l.course_name}</td>
                        <td><strong>{l.book_title}</strong></td>
                        <td><code>{l.copy_code}</code></td>
                        <td>{l.loan_date}</td>
                        <td>{l.due_date}</td>
                        <td>
                          {isReturned ? (
                            <span style={{ background: '#ecfdf5', color: '#047857', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              ✅ Devuelto ({l.return_date || 'OK'}) — {l.return_condition || 'Correcto'}
                            </span>
                          ) : (
                            <span style={{ background: '#fffbeb', color: '#b45309', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                              ⏳ En préstamo ({l.days_remaining}d restantes)
                            </span>
                          )}
                        </td>
                        <td>
                          {!isReturned ? (
                            <button
                              onClick={() => setShowReturnModal(l)}
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              Registrar Devolución →
                            </button>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>Recibido por {l.returned_by || 'CRA'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      No hay registros para el filtro seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 6. MÓDULO MATERIALES DIARIOS (CALCULADORAS, REGLAS, DICCIONARIOS)      */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'daily_materials' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Préstamos Diarios de Materiales (Retiro y Devolución Mismo Día)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Control digital de salida de Calculadoras, Reglas, Diccionarios y Cuentos
              </p>
            </div>
            <button onClick={() => setShowDailyLoanModal(true)} className="btn btn-primary" style={{ fontWeight: 800 }}>
              + Nuevo Préstamo Diario
            </button>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
            Materiales Actualmente Pendientes de Devolución
          </h3>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Hora Salida</th>
                  <th>Material Entregado</th>
                  <th>Código</th>
                  <th>Estudiante</th>
                  <th>Curso</th>
                  <th>Registrado Por</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingDailyLoans.length > 0 ? (
                  pendingDailyLoans.map(p => (
                    <tr key={p.id}>
                      <td><strong>⏰ {p.time_out}</strong></td>
                      <td><strong>{p.material_name}</strong></td>
                      <td><code>{p.material_code}</code></td>
                      <td>{p.student_name}</td>
                      <td>{p.course_name}</td>
                      <td>{p.registered_by}</td>
                      <td>
                        <button
                          onClick={() => handleReturnDailyLoan(p.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Devolver Mismo Día ✓
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      ✅ No hay materiales diarios pendientes de devolución en la jornada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 7. CENTRO DE COMUNICACIONES Y PREVISUALIZACIÓN DE CORREOS              */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'communications' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
            Centro de Comunicaciones a Docentes (Google Workspace / Gmail)
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Generación automática de recordatorios por profesor asociando sus casos pendientes
          </p>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Docente Responsable</th>
                  <th>Correo Institucional</th>
                  <th>Casos Pendientes</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendingComms.map((cg, idx) => (
                  <tr key={idx}>
                    <td><strong>👩‍🏫 {cg.teacherName}</strong></td>
                    <td>{cg.teacherEmail}</td>
                    <td><span style={{ background: '#fff1f2', color: '#be123c', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>{cg.cases.length} Alumnos con Préstamo / Atrasados</span></td>
                    <td>
                      <button
                        onClick={() => handleOpenEmailPreview(cg)}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Mail size={14} /> Preparar Correo →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 8. MÓDULO REVISIÓN PARA RETIRO DE ESTUDIANTES                           */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'reservations' && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <ComputerLabModule token={token} user={user} roomName="Biblioteca CRA" />
        </div>
      )}

      {activeTab === 'withdrawal_check' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: '#0f172a' }}>
            Verificación de Deuda para Retiro Definitivo de Estudiante
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
            Consulta automática previa al retiro formal del alumno del establecimiento
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', maxWidth: '500px' }}>
            <input
              type="text"
              placeholder="Ingrese RUT o Nombre del Estudiante..."
              value={withdrawalStudentSearch}
              onChange={e => setWithdrawalStudentSearch(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
            <button onClick={handleCheckWithdrawal} className="btn btn-primary" style={{ fontWeight: 800 }}>
              Consultar Deuda
            </button>
          </div>

          {withdrawalResult && (
            <div style={{
              background: withdrawalResult.hasDebt ? '#fff1f2' : '#ecfdf5',
              border: `1px solid ${withdrawalResult.hasDebt ? '#fecdd3' : '#a7f3d0'}`,
              borderRadius: '14px',
              padding: '1.5rem'
            }}>
              <h3 style={{ margin: 0, color: withdrawalResult.hasDebt ? '#be123c' : '#047857', fontSize: '1.2rem', fontWeight: 800 }}>
                {withdrawalResult.hasDebt ? '🔴 ESTUDIANTE CON DEVOLUCIONES PENDIENTES' : '🟢 ESTUDIANTE HABILITADO / SIN DEUDAS'}
              </h3>
              <p style={{ margin: '0.4rem 0 1rem 0', fontSize: '0.9rem', color: '#334155' }}>
                Estudiante: <strong>{withdrawalResult.studentName}</strong> | RUT: {withdrawalResult.run} | Curso: {withdrawalResult.courseName}
              </p>

              {withdrawalResult.hasDebt && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#be123c', marginBottom: '0.5rem' }}>Libros No Devueltos:</h4>
                  <ul>
                    {withdrawalResult.pendingBooks.map((b: any) => (
                      <li key={b.id} style={{ fontSize: '0.85rem', marginBottom: '0.3rem', color: '#991b1b' }}>
                        <strong>{b.book_title}</strong> (Código: {b.copy_code}) — Vencía: {b.due_date} ({b.overdue_days} días de atraso)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 9. REPORTES & EXPORTACIÓN PDF / EXCEL                                   */}
      {/* ----------------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Reportes Oficiales de Biblioteca CRA (Impresión / PDF)
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Nómina consolidada de préstamos vigentes, atrasos e inventario general
              </p>
            </div>
            <button onClick={() => window.print()} className="btn btn-primary" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Printer size={16} /> Imprimir / Guardar PDF
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Curso</th>
                  <th>Docente</th>
                  <th>Libro</th>
                  <th>Ejemplar</th>
                  <th>Fecha Préstamo</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loansList.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.student_name}</strong></td>
                    <td>{l.course_name}</td>
                    <td>{l.teacher_name || 'Sin Asignar'}</td>
                    <td><strong>{l.book_title}</strong></td>
                    <td><code>{l.copy_code}</code></td>
                    <td>{l.loan_date}</td>
                    <td>{l.due_date}</td>
                    <td>{l.current_status || l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRÉSTAMO CON REGLA DE BLOQUEO POR DEUDA */}
      {showNewLoanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4338ca', margin: 0, fontWeight: 800, fontSize: '1.35rem' }}>
                  📖 Nuevo Préstamo de Libro (Estándar 21 Días)
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Seleccione el curso y alumno para verificar deuda y asignar ejemplar.
                </p>
              </div>
              <button onClick={() => setShowNewLoanModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLoan}>
              {/* FILTROS DINÁMICOS: CURSO Y ESTUDIANTE */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  {/* FILTRO 1: CURSO O NIVEL */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#4338ca', marginBottom: '0.4rem' }}>
                      🏫 1. Filtrar por Curso / Nivel
                    </label>
                    <select
                      value={selectedCourseForLoan}
                      onChange={e => {
                        setSelectedCourseForLoan(e.target.value);
                        setNewLoanForm(prev => ({ ...prev, studentId: '', studentName: '', courseName: e.target.value !== 'Todos' ? e.target.value : '' }));
                        setStudentDebtCheck(null);
                      }}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #818cf8', fontWeight: 600, background: '#ffffff', fontSize: '0.9rem' }}
                    >
                      <option value="Todos">-- Ver Todos los Cursos ({studentsList.length} estudiantes) --</option>
                      {availableCourses.map(c => (
                        <option key={c} value={c}>
                          🏫 {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FILTRO 2: ESTUDIANTE PERTENECIENTE AL CURSO */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
                      🎓 2. Estudiante / Alumno {selectedCourseForLoan !== 'Todos' ? `(${filteredStudentsForLoan.length} inscritos en ${selectedCourseForLoan})` : ''}
                    </label>
                    <select
                      value={newLoanForm.studentName}
                      onChange={e => handleSelectStudentForLoan(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600, background: '#ffffff', fontSize: '0.9rem' }}
                      required
                    >
                      <option value="">-- Seleccionar Estudiante ({filteredStudentsForLoan.length} disponibles) --</option>
                      {filteredStudentsForLoan.map(s => (
                        <option key={s.id || s.run} value={s.full_name}>
                          🎓 {s.full_name} — {getStudentCourse(s)} (RUT: {s.run})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* CARTEL DE VALIDACIÓN DE DEUDA EN TIEMPO REAL */}
              {studentDebtCheck && (
                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '10px',
                  marginBottom: '1.25rem',
                  background: studentDebtCheck.hasDebt ? '#fff1f2' : '#ecfdf5',
                  border: `1.5px solid ${studentDebtCheck.hasDebt ? '#fecdd3' : '#a7f3d0'}`,
                  color: studentDebtCheck.hasDebt ? '#be123c' : '#047857',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}>
                  {studentDebtCheck.message}
                </div>
              )}

              {/* SI TIENE DEUDA: CAMPO OBLIGATORIO DE MOTIVO DE EXCEPCIÓN */}
              {studentDebtCheck && studentDebtCheck.hasDebt && (
                <div style={{ marginBottom: '1.25rem', background: '#fffbeb', padding: '1rem', borderRadius: '10px', border: '1.5px solid #fde68a' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#b45309', marginBottom: '0.4rem' }}>
                    ⚠️ Motivo de Excepción (Requerido para autorizar con deuda pendiente)
                  </label>
                  <input
                    type="text"
                    value={newLoanForm.overrideReason}
                    onChange={e => setNewLoanForm({ ...newLoanForm, overrideReason: e.target.value })}
                    placeholder="Ej: Autorizado por Inspectoría General / Material necesario para evaluación"
                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #d97706', fontSize: '0.85rem' }}
                    required
                  />
                </div>
              )}

              {/* BÚSQUEDA Y SELECCIÓN DE LIBRO (INTERACTIVE CARD PICKER) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    📚 Libro / Título Requerido
                  </label>
                  {!newLoanForm.bookId && bookSearchTermInModal && (
                    <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>
                      {filteredBooksInModal.length} resultado(s)
                    </span>
                  )}
                </div>

                {newLoanForm.bookId ? (
                  // TARJETA DE LIBRO SELECCIONADO
                  (() => {
                    const selBook = booksList.find(b => b.id === newLoanForm.bookId);
                    return (
                      <div style={{
                        background: '#eef2ff',
                        border: '1.5px solid #818cf8',
                        borderRadius: '12px',
                        padding: '0.85rem 1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.75rem' }}>📖</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#312e81', fontSize: '0.95rem' }}>
                              {selBook?.title || 'Libro Seleccionado'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#4338ca' }}>
                              {selBook?.author} {selBook?.category ? `• ${selBook?.category}` : ''} {selBook?.location ? `• Ubicación: ${selBook?.location}` : ''}
                            </div>
                            <div style={{ marginTop: '0.2rem' }}>
                              <span style={{
                                background: (selBook?.available_copies || 0) > 0 ? '#dcfce7' : '#fee2e2',
                                color: (selBook?.available_copies || 0) > 0 ? '#15803d' : '#b91c1c',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {(selBook?.available_copies || 0) > 0 ? `🟢 ${selBook?.available_copies} disponibles` : '🔴 Agotado'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewLoanForm(prev => ({ ...prev, bookId: '' }));
                            setBookSearchTermInModal('');
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #c7d2fe',
                            color: '#4338ca',
                            padding: '0.4rem 0.85rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🔄 Cambiar
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  // BUSCADOR Y LISTA INTERACTIVA DE LIBROS
                  <div>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <Search size={16} color="#6366f1" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        value={bookSearchTermInModal}
                        onChange={e => setBookSearchTermInModal(e.target.value)}
                        placeholder="🔍 Escribe título, autor o código para buscar libros..."
                        style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 2.25rem', borderRadius: '8px', border: '1.5px solid #818cf8', fontSize: '0.85rem', background: '#f8fafc' }}
                        autoFocus
                      />
                      {bookSearchTermInModal && (
                        <button
                          type="button"
                          onClick={() => setBookSearchTermInModal('')}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 800 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      background: '#ffffff'
                    }}>
                      {filteredBooksInModal.length > 0 ? (
                        filteredBooksInModal.map(b => {
                          const isAvailable = (b.available_copies || 0) > 0;
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                if (isAvailable) {
                                  setNewLoanForm(prev => ({ ...prev, bookId: b.id }));
                                  setBookSearchTermInModal('');
                                }
                              }}
                              style={{
                                padding: '0.65rem 1rem',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: isAvailable ? 'pointer' : 'not-allowed',
                                background: isAvailable ? '#ffffff' : '#f8fafc',
                                opacity: isAvailable ? 1 : 0.6,
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={e => { if (isAvailable) e.currentTarget.style.background = '#f1f5f9'; }}
                              onMouseLeave={e => { if (isAvailable) e.currentTarget.style.background = '#ffffff'; }}
                            >
                              <div>
                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                                  📖 {b.title}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {b.author} {b.location ? `• ${b.location}` : ''}
                                </div>
                              </div>
                              <span style={{
                                background: isAvailable ? '#dcfce7' : '#fee2e2',
                                color: isAvailable ? '#15803d' : '#b91c1c',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}>
                                {isAvailable ? `${b.available_copies} disp.` : 'Agotado'}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          ❌ No se encontraron libros con ese nombre o código.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* BÚSQUEDA Y SELECCIÓN DE DOCENTE (INTERACTIVE CARD PICKER) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    👨‍🏫 Docente Relacionado (Opcional)
                  </label>
                  {!newLoanForm.teacherName && teacherSearchTermInModal && (
                    <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>
                      {filteredTeachersInModal.length} docente(s)
                    </span>
                  )}
                </div>

                {newLoanForm.teacherName ? (
                  // TARJETA DE DOCENTE SELECCIONADO
                  (() => {
                    const selTeacher = teachersList.find(t => (t.full_name || t.name) === newLoanForm.teacherName);
                    return (
                      <div style={{
                        background: '#f0fdfa',
                        border: '1.5px solid #5eead4',
                        borderRadius: '12px',
                        padding: '0.75rem 1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>👨‍🏫</span>
                          <div>
                            <div style={{ fontWeight: 800, color: '#134e4a', fontSize: '0.9rem' }}>
                              {newLoanForm.teacherName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#0f766e' }}>
                              {selTeacher?.subject_specialty ? `Especialidad: ${selTeacher.subject_specialty}` : (selTeacher?.department || 'Docente Institucional')}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewLoanForm(prev => ({ ...prev, teacherName: '' }));
                            setTeacherSearchTermInModal('');
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #99f6e4',
                            color: '#0f766e',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  // BUSCADOR Y LISTA INTERACTIVA DE DOCENTES
                  <div>
                    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                      <Search size={16} color="#0d9488" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        value={teacherSearchTermInModal}
                        onChange={e => setTeacherSearchTermInModal(e.target.value)}
                        placeholder="🔍 Escribe nombre o especialidad para buscar docentes..."
                        style={{ width: '100%', padding: '0.65rem 2rem 0.65rem 2.25rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', background: '#f8fafc' }}
                      />
                      {teacherSearchTermInModal && (
                        <button
                          type="button"
                          onClick={() => setTeacherSearchTermInModal('')}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 800 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      background: '#ffffff'
                    }}>
                      {filteredTeachersInModal.length > 0 ? (
                        filteredTeachersInModal.map((t: any) => {
                          const tName = t.full_name || t.name;
                          return (
                            <div
                              key={t.id || t.run || tName}
                              onClick={() => {
                                setNewLoanForm(prev => ({ ...prev, teacherName: tName }));
                                setTeacherSearchTermInModal('');
                              }}
                              style={{
                                padding: '0.55rem 1rem',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f0fdfa'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                            >
                              <div>
                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                                  👨‍🏫 {tName}
                                </span>
                                {t.subject_specialty && (
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                    ({t.subject_specialty})
                                  </span>
                                )}
                              </div>
                              <span style={{
                                background: '#e0e7ff',
                                color: '#4338ca',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                Seleccionar →
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '0.85rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                          ❌ No se encontraron docentes con ese criterio.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowNewLoanModal(false)} className="btn" style={{ background: '#e2e8f0', color: '#475569', fontWeight: 600, padding: '0.65rem 1.25rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800, padding: '0.65rem 1.5rem', background: '#4338ca' }}>
                  Confirmar Préstamo (21 Días)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR DEVOLUCIÓN */}
      {showReturnModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4338ca', margin: '0 0 1rem 0', fontWeight: 800 }}>
              📥 Registrar Devolución de Libro
            </h3>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#334155', margin: '0 0 0.5rem 0' }}>
                Estudiante: <strong>{showReturnModal.student_name}</strong> ({showReturnModal.course_name})
              </p>
              <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0 }}>
                Libro: <strong>{showReturnModal.book_title}</strong> (Código: <code>{showReturnModal.copy_code}</code>)
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>Estado Físico de Devolución</label>
              <select
                value={returnCondition}
                onChange={e => setReturnCondition(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600, fontSize: '0.9rem' }}
              >
                <option value="Devuelto Correctamente">🟢 Devuelto Correctamente</option>
                <option value="Dañado">🟡 Devuelto Dañado</option>
                <option value="Incompleto">🟠 Devuelto Incompleto</option>
                <option value="Extraviado">🔴 Declarado Extraviado</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setShowReturnModal(null)} className="btn" style={{ background: '#e2e8f0', color: '#475569' }}>Cancelar</button>
              <button onClick={handleConfirmReturn} className="btn btn-primary" style={{ fontWeight: 800, background: '#4338ca' }}>Confirmar Ingreso a Inventario</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO LIBRO */}
      {showNewBookModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: '0 0 1rem 0' }}>Registrar Nuevo Título de Libro</h3>
            <form onSubmit={handleCreateBook}>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título del Libro</label>
                <input type="text" value={newBookForm.title} onChange={e => setNewBookForm({ ...newBookForm, title: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Autor</label>
                <input type="text" value={newBookForm.author} onChange={e => setNewBookForm({ ...newBookForm, author: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Categoría</label>
                  <input type="text" value={newBookForm.category} onChange={e => setNewBookForm({ ...newBookForm, category: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cantidad Ejemplares</label>
                  <input type="number" value={newBookForm.totalCopies} onChange={e => setNewBookForm({ ...newBookForm, totalCopies: parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} min={1} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowNewBookModal(false)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>Guardar Libro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRÉSTAMO DIARIO */}
      {showDailyLoanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4338ca', margin: 0, fontWeight: 800 }}>
                🎒 Préstamo Diario de Material de Sala (Retiro Mismo Día)
              </h3>
              <button onClick={() => setShowDailyLoanModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDailyLoan}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Seleccionar Material</label>
                <select value={newDailyForm.materialId} onChange={e => setNewDailyForm({ ...newDailyForm, materialId: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }} required>
                  <option value="">-- Seleccionar Material --</option>
                  {dailyMaterials.map(m => (
                    <option key={m.id} value={m.id} disabled={m.available_qty <= 0}>
                      {m.name} ({m.available_qty} libres)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4338ca', marginBottom: '0.4rem', display: 'block' }}>🏫 Filtrar por Curso</label>
                  <select
                    value={selectedCourseForDailyLoan}
                    onChange={e => {
                      setSelectedCourseForDailyLoan(e.target.value);
                      setNewDailyForm(prev => ({ ...prev, studentName: '', courseName: e.target.value !== 'Todos' ? e.target.value : '' }));
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #818cf8', fontWeight: 600, background: '#ffffff', fontSize: '0.9rem' }}
                  >
                    <option value="Todos">-- Ver Todos los Cursos ({studentsList.length} estudiantes) --</option>
                    {availableCourses.map(c => (
                      <option key={c} value={c}>
                        🏫 {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', display: 'block' }}>
                    🎓 Estudiante / Alumno {selectedCourseForDailyLoan !== 'Todos' ? `(${filteredStudentsForDailyLoan.length})` : ''}
                  </label>
                  <select
                    value={newDailyForm.studentName}
                    onChange={e => {
                      const stName = e.target.value;
                      const found = studentsList.find(s => s.full_name === stName || s.run === stName);
                      setNewDailyForm({
                        ...newDailyForm,
                        studentName: stName,
                        courseName: found ? getStudentCourse(found) : (newDailyForm.courseName || '')
                      });
                    }}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600, fontSize: '0.9rem' }}
                    required
                  >
                    <option value="">-- Seleccionar Estudiante ({filteredStudentsForDailyLoan.length} disponibles) --</option>
                    {filteredStudentsForDailyLoan.map(s => (
                      <option key={s.id || s.run} value={s.full_name}>
                        🎓 {s.full_name} — {getStudentCourse(s)} (RUT: {s.run})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowDailyLoanModal(false)} className="btn" style={{ background: '#e2e8f0', color: '#475569' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800, background: '#4338ca' }}>Confirmar Entrega</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER EJEMPLARES */}
      {viewCopiesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: 0 }}>Ejemplares Físicos Únicos</h3>
              <button onClick={() => setViewCopiesModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '1rem' }}>
              Libro: <strong>{viewCopiesModal.title}</strong>
            </p>
            <div className="table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Código Ejemplar</th>
                    <th>Estado Físico</th>
                    <th>Estudiante Asignado / Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {bookCopiesList.map(c => (
                    <tr key={c.id || c.copy_code}>
                      <td><code>{c.copy_code}</code></td>
                      <td>
                        <span style={{
                          background: c.status === 'Disponible' ? '#ecfdf5' : '#fff1f2',
                          color: c.status === 'Disponible' ? '#047857' : '#be123c',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.75rem'
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.student_name ? (
                          <div style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                            <strong>🎓 {c.student_name}</strong> ({c.course_name})
                            {c.due_date && <span style={{ color: '#64748b', marginLeft: '6px' }}>• Vence: {c.due_date}</span>}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>En estantería</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVISUALIZACIÓN DE CORREO A DOCENTE */}
      {previewEmailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.75)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: 0, fontWeight: 700 }}>
                Previsualización de Correo Recordatorio CRA
              </h3>
              <button onClick={() => setPreviewEmailModal(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Para (Correo Docente):</label>
              <input
                type="email"
                value={previewEmailModal.teacherEmail}
                onChange={e => setPreviewEmailModal({ ...previewEmailModal, teacherEmail: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Asunto del Mensaje:</label>
              <input
                type="text"
                value={previewEmailModal.subject}
                onChange={e => setPreviewEmailModal({ ...previewEmailModal, subject: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Cuerpo del Mensaje (Editable):</label>
              <textarea
                rows={8}
                value={previewEmailModal.bodyText}
                onChange={e => setPreviewEmailModal({ ...previewEmailModal, bodyText: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.825rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setPreviewEmailModal(null)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
              <button onClick={handleSendEmail} className="btn btn-primary" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={16} /> Enviar Vía SMTP / Gmail →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
