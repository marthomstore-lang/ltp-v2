import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Send,
  Users,
  Mail,
  Bell,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Globe,
  Search,
  ClipboardList,
  Eye,
  Printer,
  Trash2,
  RefreshCw,
  Calendar,
  UserCheck,
  Clock,
  FileText,
  Filter
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { sortCoursesList, getStudentCourse } from '../utils/course';

interface CourseTeacher {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  hasEmail: boolean;
  run?: string;
  isHomeroom: boolean;
  roles: string[];
  subjects: string[];
}

interface CourseStudent {
  id: string;
  name: string;
  run: string;
  courseName: string;
  studentEmail?: string;
  guardianName?: string;
  guardianRun?: string;
  guardianEmail?: string;
  guardianSecName?: string;
  guardianSecRun?: string;
  guardianSecEmail?: string;
  emails: string[];
  email?: string;
  hasEmail: boolean;
}

export interface CommunicationRecipientLog {
  recipientType: 'student' | 'teacher';
  id: string;
  userId?: string | null;
  name: string;
  run?: string;
  role?: string;
  courseName?: string;
  guardianName?: string;
  guardianRun?: string;
  emails?: string[];
  emailSent?: boolean;
  platformSent?: boolean;
  notificationIds?: string[];
  isReadInPlatform?: boolean;
  readAt?: string | null;
}

export interface CommunicationHistoryItem {
  id: string;
  course_name: string;
  audience: string;
  channels: string[];
  priority: 'normal' | 'importante' | 'urgente' | string;
  category: string;
  subject: string;
  message: string;
  sender_id?: string;
  sender_name: string;
  sender_role: string;
  recipients: CommunicationRecipientLog[];
  total_recipients: number;
  platform_count: number;
  email_sent_count: number;
  email_failed_count: number;
  read_count?: number;
  created_at: string;
}

interface CourseMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourse?: string;
  onMessageSent?: () => void;
  isEmbedded?: boolean;
  initialTab?: 'send' | 'history';
  readOnly?: boolean;
}

export const CourseMessageModal: React.FC<CourseMessageModalProps> = ({
  isOpen,
  onClose,
  initialCourse = '',
  onMessageSent,
  isEmbedded = false,
  initialTab = 'send',
  readOnly = false
}) => {
  const { token, user } = useAuth();

  const [activeView, setActiveView] = useState<'send' | 'history'>(readOnly ? 'history' : initialTab);

  const [coursesList, setCoursesList] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse || 'ALL');
  const [audience, setAudience] = useState<'teachers' | 'students' | 'both'>('students');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [teachers, setTeachers] = useState<CourseTeacher[]>([]);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Record<string, boolean>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
  const [loadingRecipients, setLoadingRecipients] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // Formulario de envío
  const [channels, setChannels] = useState<'both' | 'platform' | 'email'>('both');
  const [priority, setPriority] = useState<'normal' | 'importante' | 'urgente'>('normal');
  const [category, setCategory] = useState<string>('General');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // Estado de Historial / Registro de Comunicados Enviados
  const [historyList, setHistoryList] = useState<CommunicationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyCourseFilter, setHistoryCourseFilter] = useState<string>('ALL_FILTER');
  const [historyAudienceFilter, setHistoryAudienceFilter] = useState<string>('ALL');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<CommunicationHistoryItem | null>(null);
  const [recipientModalSearch, setRecipientModalSearch] = useState<string>('');

  const fetchHistory = useCallback(() => {
    if (!token) return;
    setLoadingHistory(true);
    fetch('/api/communications/history', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.communications)) {
          setHistoryList(data.communications);
        } else if (Array.isArray(data)) {
          setHistoryList(data);
        }
      })
      .catch(err => console.error('Error cargando registro de comunicaciones:', err))
      .finally(() => setLoadingHistory(false));
  }, [token]);

  useEffect(() => {
    if (readOnly) {
      setActiveView('history');
    }
  }, [readOnly]);

  // Cargar lista de cursos disponibles e historial inicial
  useEffect(() => {
    if ((!isOpen && !isEmbedded) || !token) return;

    fetchHistory();

    Promise.all([
      fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => [])
    ]).then(([coursesRes, studentsData]) => {
      const set = new Set<string>();

      if (coursesRes && Array.isArray(coursesRes.courses)) {
        coursesRes.courses.forEach((c: any) => {
          if (c && c.name) set.add(c.name);
        });
      }

      if (Array.isArray(studentsData)) {
        studentsData.forEach((s: any) => {
          const cName = getStudentCourse(s);
          if (cName && cName !== 'Sin Curso') set.add(cName);
        });
      }

      const sorted = sortCoursesList(Array.from(set).map(name => ({ name }))).map((c: any) => c.name);
      setCoursesList(sorted);

      if (initialCourse) {
        setSelectedCourse(initialCourse);
      } else if (!selectedCourse) {
        setSelectedCourse('ALL');
      }
    }).catch(err => console.error('Error cargando cursos:', err));
  }, [isOpen, isEmbedded, token, initialCourse, fetchHistory]);

  // Cargar docentes y estudiantes asignados al curso seleccionado (o todo el liceo si es 'ALL')
  useEffect(() => {
    if ((!isOpen && !isEmbedded) || !token || !selectedCourse) return;

    setLoadingRecipients(true);
    fetch(`/api/courses/teachers-summary?course=${encodeURIComponent(selectedCourse)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.teachers)) {
          setTeachers(data.teachers);
          const tMap: Record<string, boolean> = {};
          data.teachers.forEach((t: CourseTeacher) => {
            const key = t.id || t.email || t.name;
            tMap[key] = true;
          });
          setSelectedTeacherIds(tMap);
        } else {
          setTeachers([]);
          setSelectedTeacherIds({});
        }

        if (data && Array.isArray(data.students)) {
          setStudents(data.students);
          const sMap: Record<string, boolean> = {};
          data.students.forEach((s: CourseStudent) => {
            const key = s.id || s.run || s.name;
            sMap[key] = true;
          });
          setSelectedStudentIds(sMap);
        } else {
          setStudents([]);
          setSelectedStudentIds({});
        }
      })
      .catch(err => {
        console.error('Error al cargar destinatarios:', err);
        setTeachers([]);
        setStudents([]);
      })
      .finally(() => setLoadingRecipients(false));
  }, [isOpen, isEmbedded, token, selectedCourse]);

  const selectedTeachers = useMemo(
    () => (audience === 'teachers' || audience === 'both')
      ? teachers.filter(t => selectedTeacherIds[t.id || t.email || t.name])
      : [],
    [teachers, selectedTeacherIds, audience]
  );

  const selectedStudents = useMemo(
    () => (audience === 'students' || audience === 'both')
      ? students.filter(s => selectedStudentIds[s.id || s.run || s.name])
      : [],
    [students, selectedStudentIds, audience]
  );

  const totalSelectedCount = selectedTeachers.length + selectedStudents.length;

  const totalUniqueEmails = useMemo(() => {
    const emailSet = new Set<string>();
    selectedTeachers.forEach(t => {
      if (t.email && t.email.includes('@')) emailSet.add(t.email.toLowerCase());
    });
    selectedStudents.forEach(s => {
      if (Array.isArray(s.emails)) {
        s.emails.forEach(em => {
          if (em && em.includes('@')) emailSet.add(em.toLowerCase());
        });
      } else if (s.email && s.email.includes('@')) {
        emailSet.add(s.email.toLowerCase());
      }
    });
    return emailSet.size;
  }, [selectedTeachers, selectedStudents]);

  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return teachers;
    const q = searchQuery.toLowerCase();
    return teachers.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      t.subjects.join(' ').toLowerCase().includes(q)
    );
  }, [teachers, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.run || '').toLowerCase().includes(q) ||
      (s.guardianName || '').toLowerCase().includes(q) ||
      (s.courseName || '').toLowerCase().includes(q) ||
      s.emails.join(' ').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Filtrado del historial de comunicados enviados
  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      if (historyCourseFilter !== 'ALL_FILTER') {
        if (historyCourseFilter === 'MASIVO_ALL') {
          if (item.course_name !== 'ALL') return false;
        } else {
          const matchesCourseDirect = item.course_name === historyCourseFilter;
          const matchesRecipientCourse = Array.isArray(item.recipients) && item.recipients.some(r => r.courseName === historyCourseFilter);
          if (!matchesCourseDirect && !matchesRecipientCourse) return false;
        }
      }

      if (historyAudienceFilter !== 'ALL' && item.audience !== historyAudienceFilter) {
        return false;
      }

      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase().trim();
      const inBasic =
        (item.subject || '').toLowerCase().includes(q) ||
        (item.message || '').toLowerCase().includes(q) ||
        (item.sender_name || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.course_name || '').toLowerCase().includes(q);

      if (inBasic) return true;

      if (Array.isArray(item.recipients)) {
        return item.recipients.some(r =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.run || '').toLowerCase().includes(q) ||
          (r.guardianName || '').toLowerCase().includes(q) ||
          (r.guardianRun || '').toLowerCase().includes(q) ||
          (Array.isArray(r.emails) && r.emails.join(' ').toLowerCase().includes(q))
        );
      }
      return false;
    });
  }, [historyList, historyCourseFilter, historyAudienceFilter, historySearch]);

  const historyStats = useMemo(() => {
    let totalRecipients = 0;
    let totalPlatform = 0;
    let totalEmails = 0;
    let totalReads = 0;
    historyList.forEach(h => {
      totalRecipients += Number(h.total_recipients || (Array.isArray(h.recipients) ? h.recipients.length : 0));
      totalPlatform += Number(h.platform_count || 0);
      totalEmails += Number(h.email_sent_count || 0);
      totalReads += Number(h.read_count || 0);
    });
    return {
      totalMessages: historyList.length,
      totalRecipients,
      totalPlatform,
      totalEmails,
      totalReads
    };
  }, [historyList]);

  const filteredModalRecipients = useMemo(() => {
    if (!selectedHistoryItem || !Array.isArray(selectedHistoryItem.recipients)) return [];
    if (!recipientModalSearch.trim()) return selectedHistoryItem.recipients;
    const q = recipientModalSearch.toLowerCase().trim();
    return selectedHistoryItem.recipients.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.run || '').toLowerCase().includes(q) ||
      (r.courseName || '').toLowerCase().includes(q) ||
      (r.guardianName || '').toLowerCase().includes(q) ||
      (r.guardianRun || '').toLowerCase().includes(q) ||
      (Array.isArray(r.emails) && r.emails.join(' ').toLowerCase().includes(q))
    );
  }, [selectedHistoryItem, recipientModalSearch]);

  if (!isOpen && !isEmbedded) return null;

  const isAllCourses = selectedCourse === 'ALL';
  const scopeDisplay = isAllCourses ? 'Todos los Cursos (Masivo Liceo)' : selectedCourse;

  // Acciones de selección
  const toggleTeacher = (key: string) => {
    setSelectedTeacherIds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleStudent = (key: string) => {
    setSelectedStudentIds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllVisible = () => {
    if (audience === 'teachers' || audience === 'both') {
      const tMap = { ...selectedTeacherIds };
      filteredTeachers.forEach(t => {
        tMap[t.id || t.email || t.name] = true;
      });
      setSelectedTeacherIds(tMap);
    }
    if (audience === 'students' || audience === 'both') {
      const sMap = { ...selectedStudentIds };
      filteredStudents.forEach(s => {
        sMap[s.id || s.run || s.name] = true;
      });
      setSelectedStudentIds(sMap);
    }
  };

  const deselectAllVisible = () => {
    if (audience === 'teachers' || audience === 'both') {
      const tMap = { ...selectedTeacherIds };
      filteredTeachers.forEach(t => {
        delete tMap[t.id || t.email || t.name];
      });
      setSelectedTeacherIds(tMap);
    }
    if (audience === 'students' || audience === 'both') {
      const sMap = { ...selectedStudentIds };
      filteredStudents.forEach(s => {
        delete sMap[s.id || s.run || s.name];
      });
      setSelectedStudentIds(sMap);
    }
  };

  // Enviar mensaje
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourse) {
      Swal.fire('Atención', 'Por favor seleccione un curso o alcance.', 'warning');
      return;
    }
    if (!subject.trim()) {
      Swal.fire('Atención', 'Debe ingresar el asunto o título del comunicado.', 'warning');
      return;
    }
    if (!message.trim()) {
      Swal.fire('Atención', 'Debe escribir el contenido del comunicado.', 'warning');
      return;
    }
    if (totalSelectedCount === 0) {
      Swal.fire('Atención', 'Debe seleccionar al menos un destinatario.', 'warning');
      return;
    }

    const channelList = channels === 'both' ? ['platform', 'email'] : [channels];
    const audienceText = audience === 'students'
      ? `${selectedStudents.length} Estudiante(s) / Apoderado(s)`
      : audience === 'teachers'
        ? `${selectedTeachers.length} Docente(s)`
        : `${selectedTeachers.length} Docente(s) + ${selectedStudents.length} Estudiante(s)/Apoderado(s)`;

    const confirmResult = await Swal.fire({
      title: '¿Confirmar Envío de Comunicado Oficial?',
      html: `
        <div style="text-align: left; font-size: 0.92rem; line-height: 1.55;">
          <p><strong>🏫 Alcance:</strong> ${scopeDisplay}</p>
          <p><strong>👥 Destinatarios:</strong> ${audienceText}</p>
          <p><strong>📡 Canales:</strong> ${channels === 'both' ? `🌐 Plataforma y Correo (${totalUniqueEmails} casillas únicas)` : channels === 'platform' ? '📱 Solo Plataforma (Portal Apoderado/Docente)' : `📧 Solo Correo Electrónico (${totalUniqueEmails} casillas)`}</p>
          <p><strong>📌 Asunto:</strong> ${subject}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Despachar Comunicado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5'
    });

    if (!confirmResult.isConfirmed) return;

    setSending(true);

    try {
      const combinedRecipients = [
        ...selectedTeachers.map(t => ({
          recipientType: 'teacher',
          id: t.id,
          userId: t.userId,
          name: t.name,
          email: t.email,
          emails: t.email ? [t.email] : [],
          run: t.run,
          role: 'Docente',
          courseName: isAllCourses ? 'ALL' : selectedCourse
        })),
        ...selectedStudents.map(s => ({
          recipientType: 'student',
          id: s.id,
          name: s.name,
          run: s.run,
          guardianName: s.guardianName,
          guardianRun: s.guardianRun,
          email: s.email,
          emails: s.emails,
          role: 'Estudiante',
          courseName: s.courseName || (isAllCourses ? 'ALL' : selectedCourse)
        }))
      ];

      const res = await fetch('/api/courses/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseName: selectedCourse,
          audience,
          channels: channelList,
          priority,
          category,
          subject: subject.trim(),
          message: message.trim(),
          recipients: combinedRecipients
        })
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (_) {
        throw new Error(
          res.status === 504 || rawText.includes('TIMEOUT') || rawText.includes('An error occurred')
            ? 'El servidor demoró demasiado procesando el envío masivo. Por favor intente nuevamente.'
            : `Respuesta inesperada del servidor (HTTP ${res.status}).`
        );
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Ocurrió un error al despachar el comunicado.');
      }

      fetchHistory();
      if (onMessageSent) onMessageSent();

      const postResult = await Swal.fire({
        title: '¡Comunicado Despachado y Registrado!',
        html: `
          <div style="text-align: left; font-size: 0.92rem; line-height: 1.6;">
            <p style="color: #166534; font-weight: 700;">✅ La comunicación fue entregada a <strong>${scopeDisplay}</strong> y quedó guardada en el Registro Oficial de Comunicaciones.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 8px;">
              <div>👥 <strong>Destinatarios Registrados en Nómina:</strong> ${totalSelectedCount} persona(s)</div>
              <div>📱 <strong>Notificaciones en Plataforma (Portal Docente / Apoderado / Estudiante):</strong> ${data.summary?.platformNotificationsCount || 0} entregadas</div>
              <div>📧 <strong>Correos Electrónicos Oficiales:</strong> ${data.summary?.emailsSentCount || 0} despachados</div>
              ${data.summary?.emailsFailedCount > 0 ? `<div style="color: #dc2626;">⚠️ Correos con incidencia: ${data.summary.emailsFailedCount}</div>` : ''}
            </div>
          </div>
        `,
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#64748b',
        confirmButtonText: '📋 Ver en Registro de Enviados',
        cancelButtonText: isEmbedded ? 'Seguir Aquí' : 'Cerrar Ventana'
      });

      setSubject('');
      setMessage('');

      if (postResult.isConfirmed) {
        setActiveView('history');
      } else if (!isEmbedded) {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.message || 'Error al enviar la comunicación.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteHistoryItem = async (item: CommunicationHistoryItem) => {
    const confirm = await Swal.fire({
      title: '¿Eliminar registro de comunicado?',
      text: `Se eliminará del historial el comunicado "${item.subject}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/communications/history/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo eliminar el registro');
      }
      setHistoryList(prev => prev.filter(x => x.id !== item.id));
      if (selectedHistoryItem?.id === item.id) {
        setSelectedHistoryItem(null);
      }
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Registro eliminado', timer: 1800, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Error al eliminar registro', 'error');
    }
  };

  const handlePrintCommunicationReceipt = (item: CommunicationHistoryItem) => {
    const win = window.open('', '_blank', 'width=960,height=750');
    if (!win) {
      Swal.fire('Atención', 'Por favor habilite las ventanas emergentes para imprimir el comprobante.', 'info');
      return;
    }

    const recipients = Array.isArray(item.recipients) ? item.recipients : [];
    const scopeLabel = item.course_name === 'ALL' ? 'Todos los Cursos (Masivo Establecimiento)' : item.course_name;
    const audienceLabel =
      item.audience === 'students'
        ? 'Estudiantes y Apoderados'
        : item.audience === 'teachers'
          ? 'Equipo Docente'
          : 'Comunidad Completa (Docentes + Estudiantes/Apoderados)';

    const rowsHtml = recipients.map((r, idx) => {
      const typeLabel = r.recipientType === 'teacher' ? 'Docente' : 'Estudiante / Apoderado';
      const guardianInfo = r.recipientType === 'student'
        ? `${r.guardianName || 'Sin registro'}${r.guardianRun ? ` (${r.guardianRun})` : ''}`
        : '—';
      const emailsStr = Array.isArray(r.emails) && r.emails.length > 0 ? r.emails.join(', ') : 'Sin correo';
      const statusStr = r.isReadInPlatform
        ? `Leído (${r.readAt ? new Date(r.readAt).toLocaleString('es-CL') : 'Confirmado'})`
        : 'Entregado en Portal';

      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td><strong>${r.name || '-'}</strong><br/><span style="font-size: 11px; color: #555;">RUT: ${r.run || 'S/R'}</span></td>
          <td>${typeLabel}</td>
          <td>${r.courseName === 'ALL' ? 'General' : (r.courseName || item.course_name)}</td>
          <td>${guardianInfo}</td>
          <td style="font-size: 11px;">${emailsStr}</td>
          <td>${statusStr}</td>
        </tr>
      `;
    }).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Comprobante de Comunicado Oficial - ${item.subject}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 28px; font-size: 13px; }
          .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 18px; font-weight: 800; color: #1e1b4b; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
          .meta-item { font-size: 12.5px; }
          .message-box { background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #4f46e5; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; white-space: pre-line; line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; color: #334155; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">LICEO BICENTENARIO ENRIQUE KIRBERG — REGISTRO OFICIAL DE COMUNICACIONES</h1>
            <div class="subtitle">Acta de Despacho y Nómina de Destinatarios Notificados</div>
          </div>
          <button class="no-print" onclick="window.print()" style="background:#4f46e5;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-weight:700;cursor:pointer;">🖨️ Imprimir</button>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><strong>📌 Asunto:</strong> ${item.subject}</div>
          <div class="meta-item"><strong>📅 Fecha y Hora de Envío:</strong> ${new Date(item.created_at).toLocaleString('es-CL')}</div>
          <div class="meta-item"><strong>👤 Enviado por:</strong> ${item.sender_name} (${item.sender_role})</div>
          <div class="meta-item"><strong>🏫 Curso / Alcance:</strong> ${scopeLabel}</div>
          <div class="meta-item"><strong>🎯 Audiencia:</strong> ${audienceLabel}</div>
          <div class="meta-item"><strong>📁 Categoría / Prioridad:</strong> ${item.category} (${String(item.priority).toUpperCase()})</div>
          <div class="meta-item"><strong>👥 Total Destinatarios:</strong> ${recipients.length} persona(s)</div>
          <div class="meta-item"><strong>📡 Entregas:</strong> ${item.platform_count || 0} en Plataforma / ${item.email_sent_count || 0} Correos</div>
        </div>

        <div style="font-weight: 700; margin-bottom: 6px; color: #334155;">Contenido del Comunicado:</div>
        <div class="message-box">${item.message}</div>

        <div style="font-weight: 800; font-size: 14px; margin-bottom: 8px; color: #1e1b4b;">
          Nómina Detallada de Destinatarios (${recipients.length})
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 34px; text-align: center;">N°</th>
              <th>Nombre Destinatario (Estudiante / Docente)</th>
              <th>Rol</th>
              <th>Curso</th>
              <th>Apoderado Vinculado</th>
              <th>Correo(s) Electrónico(s)</th>
              <th>Estado Plataforma</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center;">Sin destinatarios detallados</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `);
    win.document.close();
  };

  const mainContent = (
    <div style={{
      background: '#ffffff',
      borderRadius: isEmbedded ? '16px' : '20px',
      width: '100%',
      maxWidth: isEmbedded ? '100%' : '980px',
      maxHeight: isEmbedded ? 'none' : '94vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: isEmbedded ? '0 4px 20px rgba(15, 23, 42, 0.06)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}>
      {/* Cabecera */}
      <div style={{
        padding: '1.15rem 1.75rem',
        background: 'linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%)',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Send size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
              Centro de Comunicaciones y Registro Oficial de Envíos
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#e0e7ff' }}>
              Envíe comunicados a Cursos, Estudiantes, Apoderados y Docentes con trazabilidad completa de destinatarios
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Pestañas Superiores: Enviar vs Registro Histórico */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.35)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setActiveView('send')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeView === 'send' ? '#ffffff' : 'transparent',
                  color: activeView === 'send' ? '#1e1b4b' : '#e0e7ff',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={14} /> Nuevo Comunicado
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setActiveView('history');
                fetchHistory();
              }}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: activeView === 'history' ? '#ffffff' : 'transparent',
                color: activeView === 'history' ? '#1e1b4b' : '#e0e7ff',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <ClipboardList size={14} /> Registro de Enviados ({historyList.length})
            </button>
          </div>

          {!isEmbedded && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer'
              }}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* VISTA 1: FORMULARIO DE NUEVO COMUNICADO */}
      {activeView === 'send' && !readOnly ? (
        <form onSubmit={handleSubmit} style={{ overflowY: isEmbedded ? 'visible' : 'auto', padding: '1.35rem 1.75rem', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>

            {/* 1. Selector de Alcance (Curso o Liceo Completo) y Canal */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
              gap: '1rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Selector de Alcance / Curso */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                  🏫 Alcance / Curso Destinatario:
                </label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '10px',
                    border: selectedCourse === 'ALL' ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: selectedCourse === 'ALL' ? '#3730a3' : '#1e293b',
                    background: selectedCourse === 'ALL' ? '#eef2ff' : '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">📢 TODOS LOS CURSOS — Masivo a Todo el Liceo</option>
                  <optgroup label="Cursos Específicos del Establecimiento">
                    {coursesList.map(c => (
                      <option key={c} value={c}>🏫 Curso: {c}</option>
                    ))}
                  </optgroup>
                </select>
                <span style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  {isAllCourses
                    ? 'Se enviará de forma masiva a todos los cursos del establecimiento.'
                    : `Focalizado exclusivamente en el curso ${selectedCourse}.`}
                </span>
              </div>

              {/* Selector de Canal */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                  📡 Canal de Entrega:
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setChannels('both')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: channels === 'both' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: channels === 'both' ? '#eef2ff' : '#ffffff',
                      color: channels === 'both' ? '#4338ca' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Sparkles size={14} /> Ambos Canales
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannels('platform')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: channels === 'platform' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: channels === 'platform' ? '#eef2ff' : '#ffffff',
                      color: channels === 'platform' ? '#4338ca' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Bell size={14} /> Solo Plataforma
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannels('email')}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: channels === 'email' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: channels === 'email' ? '#eef2ff' : '#ffffff',
                      color: channels === 'email' ? '#4338ca' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Mail size={14} /> Solo Correo
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Selector de Audiencia (Estudiantes/Apoderados, Docentes o Ambos) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.45rem' }}>
                🎯 ¿A quién va dirigido este comunicado?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setAudience('students')}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    border: audience === 'students' ? '2px solid #10b981' : '1px solid #cbd5e1',
                    background: audience === 'students' ? '#ecfdf5' : '#ffffff',
                    color: audience === 'students' ? '#065f46' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left'
                  }}
                >
                  <GraduationCap size={20} color={audience === 'students' ? '#059669' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>🎓 Estudiantes y Apoderados</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{students.length} alumno(s) / familia(s)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAudience('teachers')}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    border: audience === 'teachers' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: audience === 'teachers' ? '#eef2ff' : '#ffffff',
                    color: audience === 'teachers' ? '#3730a3' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left'
                  }}
                >
                  <Users size={20} color={audience === 'teachers' ? '#4f46e5' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>👨‍🏫 Equipo Docente</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>{teachers.length} profesor(es)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAudience('both')}
                  style={{
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    border: audience === 'both' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: audience === 'both' ? '#f0f9ff' : '#ffffff',
                    color: audience === 'both' ? '#075985' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left'
                  }}
                >
                  <Globe size={20} color={audience === 'both' ? '#0284c7' : '#64748b'} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>🌐 Comunidad Completa</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>Docentes + Estudiantes/Apoderados</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Nómina de Destinatarios con Buscador y Selección */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                    Destinatarios en {scopeDisplay}
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '2px 9px',
                    borderRadius: '12px',
                    fontWeight: 800
                  }}>
                    {totalSelectedCount} seleccionado(s)
                  </span>
                  <span style={{
                    fontSize: '0.73rem',
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '2px 9px',
                    borderRadius: '12px',
                    fontWeight: 700
                  }}>
                    📧 {totalUniqueEmails} correo(s) activo(s)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} color="#64748b" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Filtrar por nombre, RUT o curso..."
                      style={{
                        padding: '4px 8px 4px 26px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.75rem',
                        width: '190px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllVisible}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {loadingRecipients ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                  ⏳ Cargando nómina de destinatarios de {scopeDisplay}...
                </div>
              ) : (
                <div style={{
                  maxHeight: '210px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  background: '#ffffff'
                }}>
                  {/* Lista de Docentes si aplica */}
                  {(audience === 'teachers' || audience === 'both') && filteredTeachers.map(t => {
                    const key = t.id || t.email || t.name;
                    const isChecked = !!selectedTeacherIds[key];
                    return (
                      <div
                        key={`t-${key}`}
                        onClick={() => toggleTeacher(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.9rem',
                          borderBottom: '1px solid #f1f5f9',
                          background: isChecked ? '#f8faff' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                                👨‍🏫 {t.name}
                              </span>
                              {t.isHomeroom && (
                                <span style={{
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  fontSize: '0.66rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '6px'
                                }}>
                                  👑 Prof. Jefe
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {t.subjects.length > 0 ? t.subjects.join(' • ') : 'Docencia General'}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.72rem' }}>
                          {t.hasEmail ? (
                            <span style={{ color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} color="#16a34a" /> {t.email}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontWeight: 600 }}>📱 Notif. Plataforma</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Lista de Estudiantes y Apoderados si aplica */}
                  {(audience === 'students' || audience === 'both') && filteredStudents.map(s => {
                    const key = s.id || s.run || s.name;
                    const isChecked = !!selectedStudentIds[key];
                    return (
                      <div
                        key={`s-${key}`}
                        onClick={() => toggleStudent(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.9rem',
                          borderBottom: '1px solid #f1f5f9',
                          background: isChecked ? '#f0fdf4' : '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                                🎓 {s.name}
                              </span>
                              <span style={{
                                background: '#e0f2fe',
                                color: '#0369a1',
                                fontSize: '0.66rem',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '6px'
                              }}>
                                {s.courseName}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                              RUT Alumno: {s.run || 'S/R'} • 👨‍👩‍👧 Apoderado: {s.guardianName || 'Sin registro'} {s.guardianRun ? `(${s.guardianRun})` : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', fontSize: '0.72rem' }}>
                          {s.hasEmail ? (
                            <span style={{ color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} color="#16a34a" /> {s.emails.join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: '#0369a1', fontWeight: 600 }}>
                              📱 Portal Apoderado / Alumno
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Prioridad y Categoría */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  ⚡ Nivel de Prioridad:
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: priority === 'urgente' ? '#991b1b' : priority === 'importante' ? '#9a3412' : '#334155',
                    background: priority === 'urgente' ? '#fef2f2' : priority === 'importante' ? '#fffbeb' : '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="normal">Informativo / Normal</option>
                  <option value="importante">⚠️ Importante (Requiere Atención)</option>
                  <option value="urgente">🚨 URGENTE (Prioridad Máxima)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  📁 Categoría / Ámbito:
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    color: '#334155',
                    background: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="General">General / Comunicado Oficial</option>
                  <option value="Reunión de Apoderados">Reunión de Apoderados / Citación</option>
                  <option value="Académico">Académico / Evaluaciones / Calificaciones</option>
                  <option value="Convivencia">Convivencia Escolar / Inspectoría</option>
                  <option value="Suspensión o Cambio Horario">Cambio de Horario / Actividad Especial</option>
                  <option value="Administrativo">Coordinación Administrativa / UTP</option>
                </select>
              </div>
            </div>

            {/* 5. Asunto / Título */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                📌 Asunto / Título del Comunicado:
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej: Citación a Reunión de Apoderados / Informativo General del Liceo"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                maxLength={140}
              />
            </div>

            {/* 6. Mensaje */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  ✍️ Mensaje / Contenido del Comunicado:
                </label>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {message.length} caracteres
                </span>
              </div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escriba aquí el comunicado para los estudiantes, apoderados y/o docentes..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Caja resumen */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              padding: '0.7rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: '#0369a1'
            }}>
              <span>
                💡 <strong>Resumen de Envío:</strong> {totalSelectedCount} destinatario(s) en <strong>{scopeDisplay}</strong>
                {channels !== 'platform' && ` (${totalUniqueEmails} correo(s) electrónico(s) + Portal de Apoderados/Docentes)`}. Quedará respaldado en el <strong>Registro de Enviados</strong>.
              </span>
              <span style={{ fontWeight: 800, color: '#0284c7' }}>
                {channels === 'both' ? 'Plataforma + Email' : channels === 'platform' ? 'Solo Plataforma' : 'Solo Email'}
              </span>
            </div>

          </div>

          {/* Botones de acción */}
          <div style={{
            marginTop: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1rem',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={() => {
                setActiveView('history');
                fetchHistory();
              }}
              style={{
                background: '#eef2ff',
                color: '#4338ca',
                border: '1px solid #c7d2fe',
                borderRadius: '10px',
                padding: '0.6rem 1.1rem',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <ClipboardList size={16} /> Ver Registro de Comunicados Enviados ({historyList.length})
            </button>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {!isEmbedded && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '0.6rem 1.25rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={sending || totalSelectedCount === 0}
                style={{
                  background: sending ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.6rem 1.4rem',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }}
              >
                {sending ? (
                  <>⏳ Despachando Comunicado...</>
                ) : (
                  <>
                    <Send size={16} /> Despachar a {totalSelectedCount} Destinatario(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* VISTA 2: REGISTRO E HISTORIAL DE COMUNICADOS ENVIADOS (¿A QUIÉN SE ENVIÓ?) */
        <div style={{ overflowY: isEmbedded ? 'visible' : 'auto', padding: '1.35rem 1.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Tarjetas KPI de Trazabilidad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '0.85rem'
          }}>
            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eef2ff 100%)', border: '1px solid #c7d2fe', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>Comunicados Enviados</div>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#1e1b4b', marginTop: '2px' }}>{historyStats.totalMessages}</div>
              <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>Respaldados en bitácora oficial</div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Destinatarios Registrados</div>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#14532d', marginTop: '2px' }}>{historyStats.totalRecipients}</div>
              <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Alumnos, apoderados y docentes</div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)', border: '1px solid #bae6fd', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>Entregas en Plataforma</div>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0c4a6e', marginTop: '2px' }}>
                {historyStats.totalPlatform} <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7' }}>({historyStats.totalReads} leídos)</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>Portal Apoderado / Docente</div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>Correos Despachados</div>
              <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#4c1d95', marginTop: '2px' }}>{historyStats.totalEmails}</div>
              <div style={{ fontSize: '0.72rem', color: '#7e22ce', fontWeight: 600 }}>Notificaciones vía Email</div>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.65rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            padding: '0.85rem 1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="Buscar por alumno, RUT, apoderado, docente, asunto o contenido..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Filter size={14} color="#4f46e5" />
                <select
                  value={historyCourseFilter}
                  onChange={e => setHistoryCourseFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: '#ffffff',
                    color: '#1e293b',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL_FILTER">🏫 Todos los Cursos</option>
                  <option value="MASIVO_ALL">📢 Masivo Todo el Liceo</option>
                  {coursesList.map(c => (
                    <option key={c} value={c}>Curso: {c}</option>
                  ))}
                </select>
              </div>

              <select
                value={historyAudienceFilter}
                onChange={e => setHistoryAudienceFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: '#ffffff',
                  color: '#1e293b',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">👥 Todas las Audiencias</option>
                <option value="students">🎓 Estudiantes / Apoderados</option>
                <option value="teachers">👨‍🏫 Equipo Docente</option>
                <option value="both">🌐 Comunidad Completa</option>
              </select>

              <button
                type="button"
                onClick={fetchHistory}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title="Actualizar historial de comunicados"
              >
                <RefreshCw size={14} /> Actualizar
              </button>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setActiveView('send')}
                  style={{
                    background: '#4f46e5',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Send size={13} /> + Redactar Nuevo
                </button>
              )}
            </div>
          </div>

          {/* Lista de Comunicados Enviados */}
          {loadingHistory ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '12px' }}>
              ⏳ Cargando registro histórico de comunicados enviados y nóminas de destinatarios...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
              <ClipboardList size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.3rem' }}>
                No se encontraron comunicados en el registro
              </div>
              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
                {historySearch ? 'Pruebe con otro término de búsqueda o limpie los filtros.' : 'Todos los mensajes y comunicados que envíe quedarán registrados aquí con el detalle exacto de a quién se enviaron.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredHistory.map(item => {
                const recipients = Array.isArray(item.recipients) ? item.recipients : [];
                const isUrgent = item.priority === 'urgente';
                const isImportant = item.priority === 'importante';
                const scopeLabel = item.course_name === 'ALL' ? '📢 Todos los Cursos (Liceo Completo)' : `🏫 Curso ${item.course_name}`;
                const previewRecipients = recipients.slice(0, 5);
                const remainingCount = Math.max(0, recipients.length - previewRecipients.length);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#ffffff',
                      border: isUrgent ? '1.5px solid #fca5a5' : isImportant ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                      borderLeft: isUrgent ? '5px solid #dc2626' : isImportant ? '5px solid #d97706' : '5px solid #4f46e5',
                      borderRadius: '14px',
                      padding: '1rem 1.25rem',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    {/* Fila Superior: Badges y Fecha */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span style={{
                          background: item.course_name === 'ALL' ? '#eef2ff' : '#e0f2fe',
                          color: item.course_name === 'ALL' ? '#3730a3' : '#0369a1',
                          fontSize: '0.73rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '8px',
                          border: item.course_name === 'ALL' ? '1px solid #c7d2fe' : '1px solid #bae6fd'
                        }}>
                          {scopeLabel}
                        </span>

                        <span style={{
                          background: item.audience === 'students' ? '#ecfdf5' : item.audience === 'teachers' ? '#f5f3ff' : '#f0f9ff',
                          color: item.audience === 'students' ? '#065f46' : item.audience === 'teachers' ? '#5b21b6' : '#075985',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '8px'
                        }}>
                          {item.audience === 'students' ? '🎓 Estudiantes y Apoderados' : item.audience === 'teachers' ? '👨‍🏫 Docentes' : '🌐 Comunidad Completa'}
                        </span>

                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.71rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          📁 {item.category || 'General'}
                        </span>

                        {isUrgent && (
                          <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                            🚨 URGENTE
                          </span>
                        )}
                        {isImportant && (
                          <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                            ⚠️ IMPORTANTE
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        <Clock size={13} />
                        <span>{new Date(item.created_at).toLocaleString('es-CL')}</span>
                      </div>
                    </div>

                    {/* Asunto y Contenido */}
                    <div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                        {item.subject}
                      </div>
                      <div style={{
                        fontSize: '0.84rem',
                        color: '#334155',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line',
                        background: '#f8fafc',
                        padding: '0.65rem 0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #f1f5f9',
                        maxHeight: '110px',
                        overflowY: 'auto'
                      }}>
                        {item.message}
                      </div>
                    </div>

                    {/* Vista Rápida de ¿A quién se envió? */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.6rem 0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <UserCheck size={14} color="#4f46e5" /> ¿A quién se envió este mensaje? ({recipients.length || item.total_recipients} destinatario{recipients.length === 1 ? '' : 's'}):
                        </span>
                        <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>
                          <span style={{ color: '#0369a1' }}>
                            📱 {item.platform_count || 0} en Portal ({item.read_count || 0} leído{(item.read_count || 0) === 1 ? '' : 's'})
                          </span>
                          <span style={{ color: '#15803d' }}>
                            📧 {item.email_sent_count || 0} email(s)
                          </span>
                        </div>
                      </div>

                      {previewRecipients.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {previewRecipients.map((r, rIdx) => (
                            <span
                              key={rIdx}
                              style={{
                                fontSize: '0.72rem',
                                background: r.recipientType === 'teacher' ? '#eef2ff' : '#f0fdf4',
                                color: r.recipientType === 'teacher' ? '#3730a3' : '#166534',
                                border: r.recipientType === 'teacher' ? '1px solid #c7d2fe' : '1px solid #bbf7d0',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {r.recipientType === 'teacher' ? '👨‍🏫' : '🎓'} {r.name}
                              {r.courseName && r.courseName !== 'ALL' ? ` (${r.courseName})` : ''}
                              {r.guardianName ? ` • Apod: ${r.guardianName}` : ''}
                            </span>
                          ))}
                          {remainingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setRecipientModalSearch('');
                                setSelectedHistoryItem(item);
                              }}
                              style={{
                                fontSize: '0.72rem',
                                background: '#e0e7ff',
                                color: '#4338ca',
                                border: '1px solid #a5b4fc',
                                padding: '2px 9px',
                                borderRadius: '999px',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              +{remainingCount} destinatario(s) más... (Ver todos)
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Destinatarios registrados en el curso {item.course_name}. Haga clic en "Ver Nómina de Destinatarios" para consultar el detalle.
                        </div>
                      )}
                    </div>

                    {/* Pie de tarjeta: Emisor y Botones */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', paddingTop: '0.2rem' }}>
                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        Enviado por: <strong style={{ color: '#0f172a' }}>{item.sender_name || 'Administración'}</strong>{' '}
                        <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '5px', fontWeight: 700, fontSize: '0.7rem' }}>
                          {item.sender_role || 'Institucional'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setRecipientModalSearch('');
                            setSelectedHistoryItem(item);
                          }}
                          style={{
                            background: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.42rem 0.85rem',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.22)'
                          }}
                        >
                          <Eye size={14} /> Ver Nómina de Destinatarios ({recipients.length || item.total_recipients})
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintCommunicationReceipt(item)}
                          style={{
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '0.42rem 0.75rem',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Printer size={14} /> Imprimir Comprobante
                        </button>

                        {(user?.role === 'Admin' || user?.role === 'Director' || user?.role === 'Comunicaciones') && !readOnly && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryItem(item)}
                            style={{
                              background: '#fff1f2',
                              color: '#be123c',
                              border: '1px solid #fecdd3',
                              borderRadius: '8px',
                              padding: '0.42rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Eliminar registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALLE DE NÓMINA DE DESTINATARIOS DE UN COMUNICADO */}
      {selectedHistoryItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(4px)',
          zIndex: 2200,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '940px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#ffffff' }}>
                  👥 Nómina Oficial de Destinatarios — ¿A quién se envió el comunicado?
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#c7d2fe', marginTop: '2px' }}>
                  📌 <strong>{selectedHistoryItem.subject}</strong> • Enviado el {new Date(selectedHistoryItem.created_at).toLocaleString('es-CL')} por {selectedHistoryItem.sender_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={recipientModalSearch}
                  onChange={e => setRecipientModalSearch(e.target.value)}
                  placeholder="Filtrar destinatario por nombre de alumno, apoderado, docente, RUT o curso..."
                  style={{
                    width: '100%',
                    padding: '0.48rem 0.75rem 0.48rem 2rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', background: '#e2e8f0', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
                  Mostrando {filteredModalRecipients.length} destinatario(s)
                </span>
                <button
                  type="button"
                  onClick={() => handlePrintCommunicationReceipt(selectedHistoryItem)}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Printer size={14} /> Imprimir Nómina
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem 0.5rem', width: '40px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Destinatario (Alumno / Docente)</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Curso</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Apoderado Vinculado</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Correo(s) Notificado(s)</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>Estado en Plataforma</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No se encontraron destinatarios con ese criterio de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredModalRecipients.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            {r.recipientType === 'teacher' ? '👨‍🏫 ' : '🎓 '}
                            {r.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            RUT: {r.run || 'S/R'} • {r.recipientType === 'teacher' ? 'Docente' : 'Estudiante'}
                          </div>
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          <span style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            padding: '2px 7px',
                            borderRadius: '6px'
                          }}>
                            {r.courseName === 'ALL' ? 'General' : (r.courseName || selectedHistoryItem.course_name)}
                          </span>
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          {r.recipientType === 'student' ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                👨‍👩‍👧 {r.guardianName || 'Sin registro'}
                              </div>
                              {r.guardianRun && (
                                <div style={{ fontSize: '0.71rem', color: '#64748b' }}>
                                  RUT Apod: {r.guardianRun}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.74rem' }}>
                          {Array.isArray(r.emails) && r.emails.length > 0 ? (
                            <span style={{ color: '#15803d', fontWeight: 600 }}>
                              📧 {r.emails.join(', ')}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Solo Plataforma</span>
                          )}
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem' }}>
                          {r.isReadInPlatform ? (
                            <span style={{
                              background: '#dcfce7',
                              color: '#166534',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle2 size={12} /> Leído en Portal
                            </span>
                          ) : (
                            <span style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '3px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              📱 Entregado en Portal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '0.85rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedHistoryItem(null)}
                style={{
                  background: '#1e293b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cerrar Nómina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return mainContent;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.72)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1050,
      padding: '1rem'
    }}>
      {mainContent}
    </div>
  );
};
