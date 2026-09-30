import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Lock, Unlock, UserPlus, Send, QrCode, CheckCircle, Clock,
  Plus, Trash2, Printer, Eye, Link as LinkIcon, Upload, FileText, Check, X,
  Shield, Calendar, User, Save, Edit, RefreshCw, PenTool, ExternalLink,
  Search, GraduationCap, Briefcase, Users, Phone, Sparkles, AlertTriangle
} from 'lucide-react';
import Swal from 'sweetalert2';

interface InterviewsModuleProps {
  token: string;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  statement: string;
  signature?: string;
  user_id?: string;
  user_run?: string;
  status?: 'BORRADOR' | 'PENDIENTE' | 'COMPLETADO' | 'EXPIRADO';
  requested_at?: string;
  request_deadline?: string;
  time_limit_minutes?: number;
  secondsRemaining?: number;
}

interface DriveLinkItem {
  id: string;
  url: string;
  title: string;
}

// Utilidades institucionales para formateo legible de Fecha y Hora
const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return 'Sin fecha';
  try {
    const clean = String(dateStr).split('T')[0];
    const [year, month, day] = clean.split('-');
    if (year && month && day) {
      const months = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ];
      const mIdx = parseInt(month, 10) - 1;
      const monthName = months[mIdx] || month;
      return `${parseInt(day, 10)} ${monthName}, ${year}`;
    }
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
};

const formatDateFullSpanish = (dateStr?: string) => {
  if (!dateStr) return 'Fecha no especificada';
  try {
    const clean = String(dateStr).split('T')[0];
    const [year, month, day] = clean.split('-');
    if (year && month && day) {
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const mIdx = parseInt(month, 10) - 1;
      const monthName = months[mIdx] || month;
      const d = new Date(parseInt(year, 10), mIdx, parseInt(day, 10));
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = days[d.getDay()] || '';
      return `${dayName} ${parseInt(day, 10)} de ${monthName}, ${year}`;
    }
    return String(dateStr);
  } catch {
    return String(dateStr);
  }
};

const formatTimeDisplay = (timeStr?: string) => {
  if (!timeStr) return '10:00 hrs';
  const parts = String(timeStr).split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]} hrs`;
  }
  return `${timeStr} hrs`;
};

const formatTimer = (totalSeconds: number) => {
  if (totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const InterviewsModule: React.FC<InterviewsModuleProps> = ({ token }) => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Búsqueda inteligente de entidades (Estudiantes, Funcionarios, Apoderados)
  const [searchFilterCategory, setSearchFilterCategory] = useState<'all' | 'students' | 'staff' | 'guardians'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    students: any[];
    staff: any[];
    guardians: any[];
  }>({ students: [], staff: [], guardians: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Caché local para autocompletar instantáneo
  const [cachedStudents, setCachedStudents] = useState<any[]>([]);
  const [cachedUsers, setCachedUsers] = useState<any[]>([]);

  // Form Fields - Bloque 1: Datos del Entrevistado
  const [intervieweeRun, setIntervieweeRun] = useState('');
  const [intervieweeName, setIntervieweeName] = useState('');
  const [intervieweeRole, setIntervieweeRole] = useState('Estudiante');
  const [courseName, setCourseName] = useState('');
  const [homeroomTeacher, setHomeroomTeacher] = useState('');
  const [subjectTeacher, setSubjectTeacher] = useState('');
  const [pieSpecialist, setPieSpecialist] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showInResume, setShowInResume] = useState(true);

  // Form Fields - Bloque 2: Antecedentes y Compromisos
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [interviewerName, setInterviewerName] = useState('Equipo de Convivencia Escolar');
  const [status, setStatus] = useState<'Abierta' | 'En seguimiento' | 'Cerrada' | 'Derivada'>('Abierta');
  const [privacy, setPrivacy] = useState<'Pública' | 'Confidencial'>('Pública');
  const [followupDate, setFollowupDate] = useState('');

  // Evidencias / Drive
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [driveTitleInput, setDriveTitleInput] = useState('');
  const [driveLinks, setDriveLinks] = useState<DriveLinkItem[]>([]);

  // Bloque 3: Objetivos y Acuerdos
  const [objective, setObjective] = useState('');
  const [agreements, setAgreements] = useState('');

  // Bloque 4: Motivo / Detalle de los Hechos
  const [reason, setReason] = useState('');

  // Bloque 5: Participantes Adicionales y Declaraciones
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [showParticipantSearchResults, setShowParticipantSearchResults] = useState(false);
  const [participantSearchResults, setParticipantSearchResults] = useState<{
    students: any[];
    staff: any[];
    guardians: any[];
  }>({ students: [], staff: [], guardians: [] });
  const [isSearchingParticipant, setIsSearchingParticipant] = useState(false);

  // Bloque 6: Observaciones Generales
  const [generalObservations, setGeneralObservations] = useState('');

  // Modales de Soporte
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrSessionCode, setQrSessionCode] = useState('');
  const [previewInterviewData, setPreviewInterviewData] = useState<any>(null);

  // Modal de Firma Digital
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSigningParticipantId, setCurrentSigningParticipantId] = useState<string | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Carga de entrevistas
  const loadInterviews = () => {
    fetch('/api/interviews', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setInterviews(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error cargando entrevistas:', err));
  };

  // Carga inicial de datos de apoyo
  useEffect(() => {
    loadInterviews();

    // Precargar alumnos y funcionarios para búsqueda instantánea
    fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCachedStudents(data);
      })
      .catch(() => {});

    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCachedUsers(data);
      })
      .catch(() => {});
  }, [token]);

  // Manejo de búsqueda en tiempo real (debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ students: [], staff: [], guardians: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/interviews/search-entities?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          setSearchResults({
            students: Array.isArray(data.students) ? data.students : [],
            staff: Array.isArray(data.staff) ? data.staff : [],
            guardians: Array.isArray(data.guardians) ? data.guardians : []
          });
          setIsSearching(false);
        })
        .catch(() => {
          // Fallback con caché local
          const qLower = searchQuery.toLowerCase();
          const matchedStudents = cachedStudents.filter(
            s => (s.full_name && s.full_name.toLowerCase().includes(qLower)) || (s.run && s.run.includes(qLower))
          ).slice(0, 6);

          const matchedStaff = cachedUsers.filter(
            u => (u.name && u.name.toLowerCase().includes(qLower)) || (u.run && u.run.includes(qLower))
          ).slice(0, 6);

          const matchedGuardians = cachedStudents
            .filter(
              s =>
                s.guardian_name &&
                (s.guardian_name.toLowerCase().includes(qLower) || (s.guardian_run && s.guardian_run.includes(qLower)))
            )
            .map(s => ({
              student_id: s.id,
              guardian_name: s.guardian_name,
              guardian_run: s.guardian_run,
              guardian_phone: s.guardian_phone,
              guardian_relation: s.guardian_relation,
              student_name: s.full_name,
              student_course: s.desc_grado,
              profesor_jefe: s.profesor_jefe,
              profesor_asignatura: s.profesor_asignatura,
              profesor_pie: s.profesor_pie
            }))
            .slice(0, 6);

          setSearchResults({
            students: matchedStudents,
            staff: matchedStaff,
            guardians: matchedGuardians
          });
          setIsSearching(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, token, cachedStudents, cachedUsers]);

  // Manejo de búsqueda de participantes para el Bloque 5 (debounced)
  useEffect(() => {
    if (!participantSearchQuery.trim()) {
      setParticipantSearchResults({ students: [], staff: [], guardians: [] });
      setIsSearchingParticipant(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearchingParticipant(true);
      fetch(`/api/interviews/search-entities?q=${encodeURIComponent(participantSearchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          setParticipantSearchResults({
            students: Array.isArray(data.students) ? data.students : [],
            staff: Array.isArray(data.staff) ? data.staff : [],
            guardians: Array.isArray(data.guardians) ? data.guardians : []
          });
          setIsSearchingParticipant(false);
        })
        .catch(() => {
          setIsSearchingParticipant(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [participantSearchQuery, token]);

  // Actualización periódica en vivo del temporizador de participantes
  useEffect(() => {
    const timer = setInterval(() => {
      setParticipants(prev =>
        prev.map(p => {
          if (p.status === 'PENDIENTE' && typeof p.secondsRemaining === 'number') {
            const nextSecs = Math.max(0, p.secondsRemaining - 1);
            return {
              ...p,
              secondsRemaining: nextSecs,
              status: nextSecs === 0 ? 'EXPIRADO' : 'PENDIENTE'
            };
          }
          return p;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling automático cada 8s para refrescar los relatos enviados por los participantes
  useEffect(() => {
    const pendingIds = participants.filter(p => p.status === 'PENDIENTE').map(p => p.id);
    if (pendingIds.length === 0) return;

    const interval = setInterval(() => {
      fetch(`/api/interviews/participants-status?ids=${encodeURIComponent(pendingIds.join(','))}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setParticipants(prev =>
              prev.map(p => {
                const match = data.find((d: any) => d.id === p.id);
                if (match && match.status === 'COMPLETADO') {
                  return {
                    ...p,
                    status: 'COMPLETADO',
                    statement: match.comment || p.statement,
                    signature: match.signature || p.signature,
                    secondsRemaining: 0
                  };
                }
                return p;
              })
            );
          }
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [participants, token]);

  // Selección de Estudiante
  const selectStudentEntity = (stu: any) => {
    setIntervieweeRun(stu.run || '');
    setIntervieweeName(stu.full_name || '');
    setIntervieweeRole('Estudiante');
    setCourseName(stu.desc_grado || stu.course || '');
    setHomeroomTeacher(stu.profesor_jefe || '');
    setSubjectTeacher(stu.profesor_asignatura || '');
    setPieSpecialist(stu.profesor_pie || '');
    setStudentId(stu.id);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Selección de Funcionario / Docente
  const selectStaffEntity = (stf: any) => {
    setIntervieweeRun(stf.run || '');
    setIntervieweeName(stf.name || '');
    setIntervieweeRole(stf.role || 'Docente');
    setCourseName(stf.role === 'Docente' ? 'Docente de Asignatura' : (stf.role || 'Funcionario'));
    setHomeroomTeacher('');
    setSubjectTeacher(stf.role === 'Docente' ? stf.name : '');
    setPieSpecialist('');
    setStudentId(null);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Selección de Apoderado
  const selectGuardianEntity = (grd: any) => {
    setIntervieweeRun(grd.guardian_run || grd.run || '');
    setIntervieweeName(grd.guardian_name || grd.name || '');
    setIntervieweeRole(`Apoderado (${grd.guardian_relation || 'Titular'})`);
    setCourseName(`Apoderado de: ${grd.student_name || 'Alumno'} (${grd.student_course || ''})`);
    setHomeroomTeacher(grd.profesor_jefe || '');
    setSubjectTeacher(grd.profesor_asignatura || '');
    setPieSpecialist(grd.profesor_pie || '');
    setStudentId(grd.student_id || null);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Agregar enlace Drive
  const handleAddDriveLink = () => {
    if (!driveUrlInput.trim()) {
      Swal.fire('Atención', 'Ingrese una URL válida de Google Drive o archivo', 'warning');
      return;
    }
    const newItem: DriveLinkItem = {
      id: `DRV-${Date.now()}`,
      url: driveUrlInput.trim(),
      title: driveTitleInput.trim() || 'Documento adjunto'
    };
    setDriveLinks([...driveLinks, newItem]);
    setDriveUrlInput('');
    setDriveTitleInput('');
  };

  // Subir Archivo directamente a Google Drive
  const handleFileUploadDrive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Swal.fire({
      title: 'Subiendo a Google Drive...',
      text: `Enviando "${file.name}" a la nube institucional de Google Drive. Por favor espera...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subFolder', 'Entrevistas');

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newItem: DriveLinkItem = {
          id: `DRV-${Date.now()}`,
          url: data.fileUrl || data.downloadUrl,
          title: `${file.name} (Google Drive)`
        };
        setDriveLinks(prev => [...prev, newItem]);
        Swal.fire({
          icon: 'success',
          title: '¡Subido a Google Drive!',
          text: `El archivo "${file.name}" fue guardado exitosamente en Google Drive.`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const newItem: DriveLinkItem = {
          id: `FILE-${Date.now()}`,
          url: `#archivo-local-${file.name}`,
          title: `Archivo local: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        };
        setDriveLinks(prev => [...prev, newItem]);
        Swal.fire({
          icon: 'info',
          title: 'Adjuntado localmente',
          text: data.error || 'Google Drive aún no está vinculado. El archivo se guardó como referencia local.'
        });
      }
    } catch (err: any) {
      const newItem: DriveLinkItem = {
        id: `FILE-${Date.now()}`,
        url: `#archivo-local-${file.name}`,
        title: `Archivo: ${file.name}`
      };
      setDriveLinks(prev => [...prev, newItem]);
      Swal.fire({
        icon: 'warning',
        title: 'Adjuntado como referencia',
        text: 'No se pudo conectar con Google Drive. El archivo se guardó como referencia.'
      });
    } finally {
      e.target.value = '';
    }
  };

  // Agregar Participante manual
  const handleAddParticipant = () => {
    const newP: Participant = {
      id: `PRT-${Date.now()}`,
      name: '',
      role: 'Apoderado',
      statement: '',
      status: 'BORRADOR'
    };
    setParticipants([...participants, newP]);
  };

  // Agregar participante seleccionado directamente de la BD
  const handleAddParticipantFromDb = (person: any, type: 'student' | 'staff' | 'guardian') => {
    const newP: Participant = {
      id: `PRT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: type === 'student' ? person.full_name : type === 'staff' ? person.name : (person.guardian_name || person.full_name),
      role: type === 'student' ? 'Estudiante' : type === 'staff' ? (person.role || 'Docente') : 'Apoderado',
      statement: '',
      user_id: type === 'guardian' ? (person.student_id || person.id) : person.id,
      user_run: type === 'guardian' ? person.guardian_run : person.run,
      status: 'BORRADOR'
    };
    setParticipants([...participants, newP]);
    setParticipantSearchQuery('');
    setShowParticipantSearchResults(false);
    Swal.fire({
      icon: 'success',
      title: 'Participante Añadido',
      text: `${newP.name} (${newP.role}) ha sido agregado al acta de la entrevista.`,
      timer: 1600,
      showConfirmButton: false
    });
  };

  // Solicitar relato digital formal con plazo en minutos y notificación
  const handleRequestStatement = async (participant: Participant, minutes: number = 30) => {
    try {
      const res = await fetch('/api/interviews/request-participant-statement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          interviewId: previewInterviewData?.id || `ACTA-${date.replace(/-/g, '')}`,
          participantId: participant.id,
          timeLimitMinutes: minutes,
          targetUserId: participant.user_id,
          targetRun: participant.user_run,
          targetName: participant.name,
          targetRole: participant.role,
          intervieweeName: intervieweeName,
          objective: objective
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar relato');

      setParticipants(prev =>
        prev.map(p =>
          p.id === participant.id
            ? {
                ...p,
                status: 'PENDIENTE',
                time_limit_minutes: minutes,
                secondsRemaining: minutes * 60,
                request_deadline: data.requestDeadline,
                requested_at: data.requestedAt
              }
            : p
        )
      );

      Swal.fire({
        icon: 'success',
        title: '¡Solicitud de Relato Enviada!',
        html: `
          <div style="text-align: left; font-size: 0.9rem; color: #334155;">
            <p>Se ha notificado formalmente a <strong>${participant.name}</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-top: 0.5rem;">
              <div>⏱️ <strong>Plazo Límite:</strong> ${minutes} minutos</div>
              <div>📅 <strong>Fecha Límite:</strong> ${data.requestDeadline}</div>
              <div style="color: #059669; font-weight: 600; margin-top: 0.35rem;">
                El participante podrá redactar su relato y firmar digitalmente desde su perfil.
              </div>
            </div>
          </div>
        `,
        confirmButtonColor: '#4f46e5'
      });
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleUpdateParticipant = (id: string, field: keyof Participant, value: string) => {
    setParticipants(participants.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  // Canvas de Firma Digital
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !currentSigningParticipantId) return;
    const dataUrl = canvas.toDataURL('image/png');
    setParticipants(participants.map(p => (p.id === currentSigningParticipantId ? { ...p, signature: dataUrl } : p)));
    setShowSignatureModal(false);
    setCurrentSigningParticipantId(null);
    Swal.fire({
      icon: 'success',
      title: 'Firma registrada',
      text: 'La firma digital ha sido vinculada al participante',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Abrir Firma para un participante
  const openSignaturePad = (pId: string) => {
    setCurrentSigningParticipantId(pId);
    setShowSignatureModal(true);
    setTimeout(() => {
      clearCanvas();
    }, 100);
  };

  // Guardar Participantes / Relatos de forma inmediata
  const handleSaveParticipantsOnly = () => {
    if (participants.length === 0) {
      Swal.fire('Atención', 'No hay participantes adicionales registrados para guardar.', 'info');
      return;
    }
    Swal.fire({
      icon: 'success',
      title: 'Participantes Registrados',
      text: `Se han configurado ${participants.length} participante(s) con sus declaraciones para la entrevista.`,
      timer: 1800,
      showConfirmButton: false
    });
  };

  // Compartir Pantalla QR (Multivista en Vivo)
  const handleOpenQR = () => {
    const code = qrSessionCode || `LTP-${Math.floor(100000 + Math.random() * 900000)}`;
    setQrSessionCode(code);

    fetch('/api/multiview/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionCode: code,
        data: {
          interviewee_name: intervieweeName || 'Sin asignar',
          objective: objective || 'En proceso de redacción...',
          agreements: agreements || 'Pendiente de acuerdos.',
          status: 'Redacción en Vivo'
        }
      })
    }).catch(() => {});

    setShowQRModal(true);
  };

  // Limpiar Formulario
  const handleResetForm = () => {
    setIntervieweeRun('');
    setIntervieweeName('');
    setIntervieweeRole('Estudiante');
    setCourseName('');
    setHomeroomTeacher('');
    setSubjectTeacher('');
    setPieSpecialist('');
    setStudentId(null);
    setShowInResume(true);
    setDate(new Date().toISOString().split('T')[0]);
    setTime('10:00');
    setStatus('Abierta');
    setPrivacy('Pública');
    setFollowupDate('');
    setDriveLinks([]);
    setObjective('');
    setAgreements('');
    setReason('');
    setParticipants([]);
    setGeneralObservations('');
  };

  // Guardar Entrevista Completa
  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervieweeName.trim()) {
      Swal.fire('Error', 'Debe ingresar el nombre del entrevistado', 'warning');
      return;
    }

    try {
      const payload = {
        intervieweeName,
        intervieweeRun,
        intervieweeRole,
        courseName,
        homeroomTeacher,
        subjectTeacher,
        pieSpecialist,
        studentId,
        showInResume,
        date,
        time,
        interviewerName,
        status,
        privacy,
        followupDate,
        driveUrl: driveLinks.map(d => `${d.title}: ${d.url}`).join(' | '),
        driveTitle: driveLinks.length > 0 ? driveLinks[0].title : '',
        objective,
        agreements,
        reason,
        generalObservations,
        participants: participants.map(p => ({
          name: p.name,
          role: p.role,
          statement: p.statement,
          signature: p.signature || ''
        }))
      };

      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la entrevista');

      setShowModal(false);
      handleResetForm();
      Swal.fire({
        icon: 'success',
        title: '¡Ficha de Entrevista Guardada!',
        html: `
          <div style="text-align: left; font-size: 0.9rem; color: #334155; margin-top: 0.5rem;">
            <p style="margin-bottom: 0.5rem;">El acta <strong>${data.id || ''}</strong> ha sido registrada con éxito en el sistema.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem;">
              <div style="font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">🗓️ ${formatDateFullSpanish(payload.date)}</div>
              <div style="color: #059669; font-weight: 600;">⏰ ${formatTimeDisplay(payload.time)}</div>
              ${payload.followupDate ? `<div style="color: #d97706; font-size: 0.82rem; margin-top: 0.35rem; font-weight: 600;">📌 Próxima revisión: ${formatDateDisplay(payload.followupDate)}</div>` : ''}
            </div>
          </div>
        `,
        confirmButtonColor: '#4f46e5'
      });
      loadInterviews();
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const totalResultsCount =
    (searchResults.students?.length || 0) +
    (searchResults.staff?.length || 0) +
    (searchResults.guardians?.length || 0);

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)' }}>
      {/* Encabezado del Módulo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Gestión de Entrevistas y Compromisos
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem', margin: 0 }}>
            Registro de actas institucionales, firmas colaborativas y seguimiento de casos
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            color: '#ffffff',
            padding: '0.7rem 1.4rem',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <MessageSquare size={18} /> Nueva Entrevista
        </button>
      </div>

      {/* Tabla de Actas Existentes */}
      <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em', fontWeight: 700 }}>
              <th style={{ padding: '0.9rem 1.25rem' }}>CÓDIGO</th>
              <th style={{ padding: '0.9rem 1.25rem' }}>ENTREVISTADO</th>
              <th style={{ padding: '0.9rem 1.25rem' }}>FECHA / HORA</th>
              <th style={{ padding: '0.9rem 1.25rem' }}>RESPONSABLE</th>
              <th style={{ padding: '0.9rem 1.25rem' }}>PRIVACIDAD</th>
              <th style={{ padding: '0.9rem 1.25rem' }}>ESTADO</th>
            </tr>
          </thead>
          <tbody>
            {interviews.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                  <MessageSquare size={40} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.35, color: '#6366f1' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#475569', margin: '0 0 0.25rem' }}>No hay entrevistas registradas aún</p>
                  <p style={{ fontSize: '0.82rem', margin: 0 }}>Haga clic en <strong>"Nueva Entrevista"</strong> para crear la primera ficha con el nuevo formato institucional.</p>
                </td>
              </tr>
            ) : (
              interviews.map(i => (
                <tr
                  key={i.id}
                  onClick={() => {
                    setPreviewInterviewData(i);
                    setShowPreviewModal(true);
                  }}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                >
                  <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, color: '#4f46e5' }}>{i.id}</td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{i.interviewee_name || i.student_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {i.course_name ? `${i.course_name} • ` : ''}{i.interviewee_role || 'Estudiante'} {i.interviewee_run ? `(${i.interviewee_run})` : ''}
                    </div>
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', color: '#334155' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#1e293b', fontSize: '0.84rem' }}>
                        <Calendar size={14} color="#4f46e5" />
                        {formatDateDisplay(i.date)}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#047857', fontSize: '0.78rem', fontWeight: 600, background: '#ecfdf5', padding: '1px 7px', borderRadius: '5px', width: 'fit-content' }}>
                        <Clock size={12} color="#059669" />
                        {formatTimeDisplay(i.time)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', color: '#334155' }}>{i.interviewer_name}</td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: i.privacy === 'Confidencial' ? '#fee2e2' : '#e0e7ff',
                        color: i.privacy === 'Confidencial' ? '#b91c1c' : '#4338ca',
                        border: `1px solid ${i.privacy === 'Confidencial' ? '#fca5a5' : '#c7d2fe'}`
                      }}
                    >
                      {i.privacy === 'Confidencial' ? <Lock size={12} /> : <Unlock size={12} />}
                      {i.privacy || 'Pública'}
                    </span>
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background:
                          i.status === 'Cerrada'
                            ? '#dcfce7'
                            : i.status === 'En seguimiento'
                            ? '#fef3c7'
                            : i.status === 'Derivada'
                            ? '#f3e8ff'
                            : '#e0f2fe',
                        color:
                          i.status === 'Cerrada'
                            ? '#15803d'
                            : i.status === 'En seguimiento'
                            ? '#b45309'
                            : i.status === 'Derivada'
                            ? '#7e22ce'
                            : '#0369a1'
                      }}
                    >
                      {i.status || 'Abierta'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL PRINCIPAL: FICHA DE NUEVA ENTREVISTA INSTITUCIONAL PROFESIONAL */}
      {/* ========================================================================= */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '1.5rem 1rem'
          }}
        >
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1380px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              marginBottom: '2rem'
            }}
          >
            {/* Header de la Ficha */}
            <div
              style={{
                background: '#ffffff',
                padding: '1.25rem 2rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                position: 'sticky',
                top: 0,
                zIndex: 40
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                    Ficha de Nueva Entrevista Institucional
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Protocolo Unificado de Convivencia Escolar, Docencia y Apoderados
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: showInResume ? '#1d4ed8' : '#64748b',
                    background: showInResume ? '#eff6ff' : '#f1f5f9',
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    border: `1px solid ${showInResume ? '#bfdbfe' : '#cbd5e1'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showInResume}
                    onChange={e => setShowInResume(e.target.checked)}
                    style={{ accentColor: '#2563eb', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span>🔄 Mostrar en la hoja de vida</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Formulario Principal */}
            <form onSubmit={handleCreateInterview} style={{ padding: '1.75rem 2rem' }}>
              {/* ------------------------------------------------------------- */}
              {/* BLOQUE 1: DATOS DEL ENTREVISTADO Y BUSCADOR CRUZADO GLOBAL */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>
                    <User size={18} color="#4f46e5" />
                    <span>Datos del Entrevistado</span>
                  </div>

                  {/* Barra de Búsqueda Inteligente Multiestamento */}
                  <div style={{ position: 'relative', minWidth: '340px', flex: 1, maxWidth: '520px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#f8fafc',
                        border: '1.5px solid #6366f1',
                        borderRadius: '8px',
                        padding: '0.35rem 0.75rem',
                        gap: '0.5rem',
                        boxShadow: '0 2px 4px rgba(99, 102, 241, 0.08)'
                      }}
                    >
                      <Search size={16} color="#6366f1" />
                      <input
                        type="text"
                        placeholder="Buscar estudiante, funcionario o apoderado por nombre o RUT..."
                        value={searchQuery}
                        onChange={e => {
                          setSearchQuery(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          fontSize: '0.82rem',
                          width: '100%',
                          color: '#1e293b'
                        }}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults({ students: [], staff: [], guardians: [] });
                          }}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Menú Desplegable con Categorías de Búsqueda */}
                    {showSearchResults && (searchQuery.trim().length > 0 || totalResultsCount > 0) && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '110%',
                          left: 0,
                          right: 0,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          boxShadow: '0 15px 30px -5px rgba(0,0,0,0.18)',
                          zIndex: 60,
                          maxHeight: '360px',
                          overflowY: 'auto',
                          padding: '0.5rem'
                        }}
                      >
                        {/* Selector de Pestañas en el Menú */}
                        <div style={{ display: 'flex', gap: '0.3rem', padding: '0.25rem 0.5rem 0.6rem', borderBottom: '1px solid #f1f5f9' }}>
                          <button
                            type="button"
                            onClick={() => setSearchFilterCategory('all')}
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none',
                              background: searchFilterCategory === 'all' ? '#4f46e5' : '#f1f5f9',
                              color: searchFilterCategory === 'all' ? '#ffffff' : '#64748b'
                            }}
                          >
                            Todos ({totalResultsCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchFilterCategory('students')}
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none',
                              background: searchFilterCategory === 'students' ? '#0ea5e9' : '#f1f5f9',
                              color: searchFilterCategory === 'students' ? '#ffffff' : '#64748b'
                            }}
                          >
                            🎓 Estudiantes ({searchResults.students.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchFilterCategory('staff')}
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none',
                              background: searchFilterCategory === 'staff' ? '#8b5cf6' : '#f1f5f9',
                              color: searchFilterCategory === 'staff' ? '#ffffff' : '#64748b'
                            }}
                          >
                            👔 Funcionarios ({searchResults.staff.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchFilterCategory('guardians')}
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: 'none',
                              background: searchFilterCategory === 'guardians' ? '#f59e0b' : '#f1f5f9',
                              color: searchFilterCategory === 'guardians' ? '#ffffff' : '#64748b'
                            }}
                          >
                            👨‍👩‍👧 Apoderados ({searchResults.guardians.length})
                          </button>
                        </div>

                        {isSearching ? (
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                            <RefreshCw size={16} className="spin" style={{ display: 'inline', marginRight: '6px' }} />
                            Buscando en la base de datos...
                          </div>
                        ) : totalResultsCount === 0 ? (
                          <div style={{ padding: '1.25rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                            No se encontraron coincidencias para "{searchQuery}".
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.35rem' }}>
                            {/* Grupo Estudiantes */}
                            {(searchFilterCategory === 'all' || searchFilterCategory === 'students') &&
                              searchResults.students.map(s => (
                                <div
                                  key={`stu-${s.id}`}
                                  onClick={() => selectStudentEntity(s)}
                                  style={{
                                    padding: '0.55rem 0.75rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{s.full_name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      RUT: <strong>{s.run}</strong> • Curso: <strong>{s.desc_grado || 'Sin curso'}</strong>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                                    🎓 ESTUDIANTE
                                  </span>
                                </div>
                              ))}

                            {/* Grupo Funcionarios */}
                            {(searchFilterCategory === 'all' || searchFilterCategory === 'staff') &&
                              searchResults.staff.map(u => (
                                <div
                                  key={`stf-${u.id}`}
                                  onClick={() => selectStaffEntity(u)}
                                  style={{
                                    padding: '0.55rem 0.75rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#faf5ff')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      RUT: <strong>{u.run || 'Sin RUT'}</strong> • Rol: <strong>{u.role || 'Funcionario'}</strong>
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#f3e8ff', color: '#7e22ce', fontWeight: 700 }}>
                                    👔 FUNCIONARIO
                                  </span>
                                </div>
                              ))}

                            {/* Grupo Apoderados */}
                            {(searchFilterCategory === 'all' || searchFilterCategory === 'guardians') &&
                              searchResults.guardians.map((g, idx) => (
                                <div
                                  key={`grd-${g.student_id || idx}`}
                                  onClick={() => selectGuardianEntity(g)}
                                  style={{
                                    padding: '0.55rem 0.75rem',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#fffbeb')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{g.guardian_name}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      RUT: <strong>{g.guardian_run || 'N/A'}</strong> • Apoderado de: <strong>{g.student_name}</strong> ({g.student_course})
                                    </div>
                                  </div>
                                  <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>
                                    👨‍👩‍👧 APODERADO
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fila 1: RUT, Nombre, Curso/Estamento, Cargo/Función */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      RUT entrevistado
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9kK\.\-]*"
                      placeholder="Ej: 12.345.678-9"
                      value={intervieweeRun}
                      onChange={e => setIntervieweeRun(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none',
                        transition: 'border 0.15s'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      placeholder="Escriba nombre o RUT para autocompletar..."
                      value={intervieweeName}
                      onChange={e => setIntervieweeName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Curso / Estamento
                    </label>
                    <input
                      type="text"
                      placeholder="Estudiante, Docente, Asistente, etc."
                      value={intervieweeRole}
                      onChange={e => setIntervieweeRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Cargo / Función
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 1° Medio Mecánica o Auxiliar Aseo"
                      value={courseName}
                      onChange={e => setCourseName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Fila 2: Profesor Jefe, Profesor Asignatura, Profesor/Especialista PIE */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Profesor Jefe (Curso)
                    </label>
                    <input
                      type="text"
                      placeholder="Solo aplica si el entrevistado es estudiante"
                      value={homeroomTeacher}
                      onChange={e => setHomeroomTeacher(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Profesor Asignatura
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Mecánica Industrial"
                      value={subjectTeacher}
                      onChange={e => setSubjectTeacher(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Profesor / Especialista PIE
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del especialista del programa PIE"
                      value={pieSpecialist}
                      onChange={e => setPieSpecialist(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BLOQUE 2: ANTECEDENTES Y COMPROMISOS DE LA ENTREVISTA */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '1.2rem' }}>
                  <Calendar size={18} color="#4f46e5" />
                  <span>Antecedentes y Compromisos de la Entrevista</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                  {/* Columna Izquierda: Fechas, Responsable, Estado y Privacidad */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.85fr 1.35fr', gap: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Fecha de la cita
                          </label>
                          <button
                            type="button"
                            onClick={() => setDate(new Date().toISOString().split('T')[0])}
                            style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', cursor: 'pointer' }}
                          >
                            Hoy
                          </button>
                        </div>
                        <input
                          type="date"
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          required
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Hora
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const hh = String(now.getHours()).padStart(2, '0');
                              const mm = String(now.getMinutes()).padStart(2, '0');
                              setTime(`${hh}:${mm}`);
                            }}
                            style={{ background: '#ecfdf5', color: '#047857', border: 'none', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', cursor: 'pointer' }}
                          >
                            Ahora
                          </button>
                        </div>
                        <input
                          type="time"
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          required
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                          Responsable de entrevista
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre y firma de quien entrevista"
                          value={interviewerName}
                          onChange={e => setInterviewerName(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    {/* Previsualización en vivo de la Cita */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: '#334155', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#4338ca' }}>
                        <Calendar size={13} color="#4f46e5" />
                        {formatDateFullSpanish(date)}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#047857' }}>
                        <Clock size={12} color="#059669" />
                        {formatTimeDisplay(time)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                          Estado de la ficha
                        </label>
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value as any)}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: '#ffffff' }}
                        >
                          <option value="Abierta">Abierta</option>
                          <option value="En seguimiento">En seguimiento</option>
                          <option value="Cerrada">Cerrada</option>
                          <option value="Derivada">Derivada</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                          Privacidad / Seguridad
                        </label>
                        <select
                          value={privacy}
                          onChange={e => setPrivacy(e.target.value as any)}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', background: '#ffffff' }}
                        >
                          <option value="Pública">Pública (Todos pueden ver)</option>
                          <option value="Confidencial">Confidencial (Solo Responsables/Admin)</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Próx. Revisión
                          </label>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const base = date ? new Date(date + 'T12:00:00') : new Date();
                                base.setDate(base.getDate() + 7);
                                setFollowupDate(base.toISOString().split('T')[0]);
                              }}
                              title="Sumar 7 días"
                              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, padding: '0 4px', cursor: 'pointer' }}
                            >
                              +7d
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const base = date ? new Date(date + 'T12:00:00') : new Date();
                                base.setDate(base.getDate() + 15);
                                setFollowupDate(base.toISOString().split('T')[0]);
                              }}
                              title="Sumar 15 días"
                              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, padding: '0 4px', cursor: 'pointer' }}
                            >
                              +15d
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const base = date ? new Date(date + 'T12:00:00') : new Date();
                                base.setDate(base.getDate() + 30);
                                setFollowupDate(base.toISOString().split('T')[0]);
                              }}
                              title="Sumar 30 días"
                              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, padding: '0 4px', cursor: 'pointer' }}
                            >
                              +30d
                            </button>
                            {followupDate && (
                              <button
                                type="button"
                                onClick={() => setFollowupDate('')}
                                title="Limpiar fecha"
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, padding: '0 4px', cursor: 'pointer' }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="date"
                          value={followupDate}
                          onChange={e => setFollowupDate(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                        {followupDate && (
                          <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} color="#d97706" /> {formatDateDisplay(followupDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Evidencias / Documentos Google Drive */}
                  <div
                    style={{
                      background: '#fefce8',
                      border: '1px solid #fef08a',
                      borderRadius: '12px',
                      padding: '1.15rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          📁 Evidencias / Documentos y Carpetas Google Drive
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#a16207' }}>
                          Guía archivos o pegue enlaces Drive
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <input
                          type="text"
                          placeholder="Pegar enlace de archivo o carpeta Google Drive..."
                          value={driveUrlInput}
                          onChange={e => setDriveUrlInput(e.target.value)}
                          style={{ flex: 2, padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px solid #fde047', fontSize: '0.8rem', background: '#ffffff', outline: 'none' }}
                        />
                        <input
                          type="text"
                          placeholder="Nombre o título opcional..."
                          value={driveTitleInput}
                          onChange={e => setDriveTitleInput(e.target.value)}
                          style={{ flex: 1, padding: '0.5rem 0.7rem', borderRadius: '6px', border: '1px solid #fde047', fontSize: '0.8rem', background: '#ffffff', outline: 'none' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={handleAddDriveLink}
                          style={{
                            background: '#4f46e5',
                            color: '#ffffff',
                            fontSize: '0.78rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                          }}
                        >
                          <LinkIcon size={14} /> Agregar Link
                        </button>

                        <label
                          style={{
                            background: '#6366f1',
                            color: '#ffffff',
                            fontSize: '0.78rem',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                          }}
                        >
                          <Upload size={14} /> Subir a Google Drive
                          <input type="file" onChange={handleFileUploadDrive} style={{ display: 'none' }} />
                        </label>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.85rem', minHeight: '38px' }}>
                      {driveLinks.length === 0 ? (
                        <p style={{ fontSize: '0.75rem', color: '#a16207', margin: 0, fontStyle: 'italic' }}>
                          No hay documentos ni carpetas adjuntas en esta entrevista.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {driveLinks.map(d => (
                            <div
                              key={d.id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #fef08a',
                                borderRadius: '6px',
                                padding: '0.25rem 0.6rem',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <FileText size={13} color="#ca8a04" />
                              <a href={d.url} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', textDecoration: 'none', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                {d.title}
                              </a>
                              <button
                                type="button"
                                onClick={() => setDriveLinks(driveLinks.filter(x => x.id !== d.id))}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, fontWeight: 700 }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BLOQUE 3: OBJETIVOS Y ACUERDOS (PARALELO) */}
              {/* ------------------------------------------------------------- */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
                    <span>🎯</span> Objetivo de la entrevista
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describa el propósito principal del encuentro académico/conductual..."
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical', outline: 'none' }}
                  />
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#15803d', marginBottom: '0.5rem' }}>
                    <span>✅</span> Acuerdos / compromisos establecidos
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Escriba los compromisos tomados por cada una de las partes..."
                    value={agreements}
                    onChange={e => setAgreements(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical', outline: 'none' }}
                  />
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BLOQUE 4: MOTIVO / ANTECEDENTES Y DETALLE DE LOS HECHOS */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                    <span>📝</span> Motivo / Antecedentes y Detalle de los Hechos
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>
                    Recuadro amplio para narrativa extensa
                  </span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Detalle minuciosamente los antecedentes previos, los hechos ocurridos, la situación planteada por las partes o el hecho concreto..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical', outline: 'none' }}
                />
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BLOQUE 5: PARTICIPANTES ADICIONALES Y DECLARACIONES */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                        <Users size={18} color="#2563eb" />
                        <span>Participantes Adicionales y Declaraciones / Relatos</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Busque participantes en la base de datos institucional o agréguelos manualmente. Puede solicitarles su relato digital con plazo configurable y firma digital.
                      </div>
                    </div>

                    {/* Botonera superior */}
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleAddParticipant}
                        style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          fontSize: '0.76rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        <UserPlus size={14} /> + Agregar Manual
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveParticipantsOnly}
                        style={{
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '0.76rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        <Save size={14} /> Guardar Relatos
                      </button>
                    </div>
                  </div>

                  {/* BUSCADOR DE PARTICIPANTES EN LA BASE DE DATOS */}
                  <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.5rem 0.85rem' }}>
                      <Search size={16} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Buscar por Nombre o RUT para agregar participante desde la Base de Datos..."
                        value={participantSearchQuery}
                        onChange={e => {
                          setParticipantSearchQuery(e.target.value);
                          setShowParticipantSearchResults(true);
                        }}
                        onFocus={() => setShowParticipantSearchResults(true)}
                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.86rem', color: '#1e293b' }}
                      />
                      {participantSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setParticipantSearchQuery('');
                            setShowParticipantSearchResults(false);
                          }}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Desplegable de Resultados de Búsqueda */}
                    {showParticipantSearchResults && participantSearchQuery && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          background: '#ffffff',
                          borderRadius: '12px',
                          boxShadow: '0 12px 28px -4px rgba(0,0,0,0.18)',
                          border: '1px solid #cbd5e1',
                          maxHeight: '340px',
                          overflowY: 'auto',
                          zIndex: 50,
                          padding: '0.5rem'
                        }}
                      >
                        {isSearchingParticipant ? (
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                            Buscando personas en la base de datos...
                          </div>
                        ) : (participantSearchResults.students.length === 0 && participantSearchResults.staff.length === 0 && participantSearchResults.guardians.length === 0) ? (
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                            No se encontraron coincidencias para "{participantSearchQuery}". Puede agregarlo manualmente con el botón superior.
                          </div>
                        ) : (
                          <div>
                            {/* Estudiantes */}
                            {participantSearchResults.students.length > 0 && (
                              <div style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', padding: '0.35rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Estudiantes Registrados ({participantSearchResults.students.length})
                                </div>
                                {participantSearchResults.students.map(s => (
                                  <div
                                    key={`stu-${s.id}`}
                                    onClick={() => handleAddParticipantFromDb(s, 'student')}
                                    style={{ padding: '0.5rem 0.65rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{s.full_name}</div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>RUT: {s.run || 'S/R'} • Curso: {s.desc_grado || 'N/A'}</div>
                                    </div>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '2px 8px', borderRadius: '6px' }}>
                                      + Agregar Estudiante
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Docentes y Funcionarios */}
                            {participantSearchResults.staff.length > 0 && (
                              <div style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', padding: '0.35rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Docentes y Funcionarios ({participantSearchResults.staff.length})
                                </div>
                                {participantSearchResults.staff.map(u => (
                                  <div
                                    key={`usr-${u.id}`}
                                    onClick={() => handleAddParticipantFromDb(u, 'staff')}
                                    style={{ padding: '0.5rem 0.65rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#ecfdf5')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{u.name}</div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>RUT: {u.run || 'S/R'} • Cargo: {u.role || 'Docente'}</div>
                                    </div>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '6px' }}>
                                      + Agregar Funcionario
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Apoderados */}
                            {participantSearchResults.guardians.length > 0 && (
                              <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed', padding: '0.35rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Apoderados ({participantSearchResults.guardians.length})
                                </div>
                                {participantSearchResults.guardians.map((g, idx) => (
                                  <div
                                    key={`gdn-${idx}`}
                                    onClick={() => handleAddParticipantFromDb(g, 'guardian')}
                                    style={{ padding: '0.5rem 0.65rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s ease' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{g.guardian_name}</div>
                                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>RUT: {g.guardian_run || 'S/R'} • Apoderado de: {g.student_name} ({g.student_course})</div>
                                    </div>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: '6px' }}>
                                      + Agregar Apoderado
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* LISTA DE PARTICIPANTES CARGADOS */}
                  {participants.length === 0 ? (
                    <div
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '2.5rem 1.5rem',
                        textAlign: 'center',
                        background: '#f8fafc'
                      }}
                    >
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', fontWeight: 500 }}>
                        No hay participantes añadidos a esta entrevista aún. Busque una persona en la base de datos o agréguela de forma manual.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddParticipant}
                        style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          padding: '0.55rem 1.25rem',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600,
                          boxShadow: '0 2px 5px rgba(79, 70, 229, 0.25)'
                        }}
                      >
                        <UserPlus size={15} /> + Agregar Participante Manual
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {participants.map(p => {
                        const isPending = p.status === 'PENDIENTE';
                        const isCompleted = p.status === 'COMPLETADO';
                        const isExpired = p.status === 'EXPIRADO';

                        return (
                          <div
                            key={p.id}
                            style={{
                              background: isCompleted ? '#f0fdf4' : isPending ? '#fffbeb' : '#f8fafc',
                              border: `1px solid ${isCompleted ? '#bbf7d0' : isPending ? '#fde68a' : '#e2e8f0'}`,
                              borderRadius: '12px',
                              padding: '1.15rem',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Cabecera del Participante */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <input
                                  type="text"
                                  placeholder="Nombre del participante..."
                                  value={p.name}
                                  onChange={e => handleUpdateParticipant(p.id, 'name', e.target.value)}
                                  style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', minWidth: '220px', background: '#ffffff' }}
                                />
                                <select
                                  value={p.role}
                                  onChange={e => handleUpdateParticipant(p.id, 'role', e.target.value)}
                                  style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff', fontWeight: 600 }}
                                >
                                  <option value="Apoderado">Apoderado</option>
                                  <option value="Estudiante">Estudiante</option>
                                  <option value="Docente">Docente</option>
                                  <option value="Convivencia Escolar">Convivencia Escolar</option>
                                  <option value="Profesional PIE">Profesional PIE</option>
                                  <option value="Directivo">Directivo</option>
                                  <option value="Testigo">Testigo</option>
                                </select>

                                {p.user_run && (
                                  <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                    🆔 {p.user_run}
                                  </span>
                                )}
                              </div>

                              {/* Badges de Estado y Acciones de Notificación */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isPending ? (
                                  <span
                                    style={{
                                      fontSize: '0.76rem',
                                      background: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      padding: '4px 10px',
                                      borderRadius: '9999px',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                  >
                                    <Clock size={13} color="#d97706" />
                                    Esperando relato: {formatTimer(p.secondsRemaining || 0)} min (Plazo: {p.time_limit_minutes || 30}m)
                                  </span>
                                ) : isCompleted ? (
                                  <span
                                    style={{
                                      fontSize: '0.76rem',
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac',
                                      padding: '4px 10px',
                                      borderRadius: '9999px',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <CheckCircle size={13} color="#16a34a" /> Relato Entregado y Firmado
                                  </span>
                                ) : isExpired ? (
                                  <span
                                    style={{
                                      fontSize: '0.76rem',
                                      background: '#fee2e2',
                                      color: '#dc2626',
                                      border: '1px solid #fca5a5',
                                      padding: '4px 10px',
                                      borderRadius: '9999px',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <AlertTriangle size={13} color="#dc2626" /> Plazo Expirado
                                  </span>
                                ) : (
                                  /* Selector para Solicitar Relato Digital */
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <select
                                      id={`time-limit-${p.id}`}
                                      defaultValue="30"
                                      style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.76rem', background: '#ffffff' }}
                                    >
                                      <option value="15">15 min</option>
                                      <option value="30">30 min</option>
                                      <option value="60">1 hora</option>
                                      <option value="120">2 horas</option>
                                      <option value="1440">24 horas</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const selectEl = document.getElementById(`time-limit-${p.id}`) as HTMLSelectElement;
                                        const mins = selectEl ? parseInt(selectEl.value, 10) : 30;
                                        handleRequestStatement(p, mins);
                                      }}
                                      style={{
                                        background: '#4f46e5',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '0.42rem 0.8rem',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      title="Enviar notificación al perfil del participante para que aporte su relato"
                                    >
                                      <Send size={12} /> Solicitar Relato Digital
                                    </button>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openSignaturePad(p.id)}
                                  style={{
                                    background: p.signature ? '#dcfce7' : '#fef3c7',
                                    color: p.signature ? '#15803d' : '#b45309',
                                    border: '1px solid',
                                    borderColor: p.signature ? '#86efac' : '#fde68a',
                                    borderRadius: '6px',
                                    padding: '0.42rem 0.75rem',
                                    fontSize: '0.76rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 700
                                  }}
                                >
                                  <PenTool size={12} /> {p.signature ? 'Firmado' : 'Firmar en Pantalla'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveParticipant(p.id)}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem' }}
                                  title="Quitar participante"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Área de Texto del Relato / Declaración */}
                            <textarea
                              rows={3}
                              placeholder={
                                isPending
                                  ? `Esperando que ${p.name || 'el participante'} redacte su relato oficial desde su perfil... (También puede escribir directamente aquí)`
                                  : `Escriba el testimonio, aporte o declaración de ${p.name || 'este participante'}...`
                              }
                              value={p.statement}
                              onChange={e => handleUpdateParticipant(p.id, 'statement', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.84rem',
                                resize: 'vertical',
                                background: '#ffffff',
                                boxSizing: 'border-box'
                              }}
                            />

                            {p.signature && (
                              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 800 }}>Firma Digital Validada:</span>
                                <img src={p.signature} alt="Firma" style={{ height: '36px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', padding: '2px' }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              {/* ------------------------------------------------------------- */}
              {/* BLOQUE 6: OBSERVACIONES GENERALES Y CONCLUSIONES */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
                  <span>💬</span> Observaciones Generales y Conclusiones
                </label>
                <textarea
                  rows={3}
                  placeholder="Información complementaria, citaciones adicionales, derivaciones o acuerdos de seguimiento..."
                  value={generalObservations}
                  onChange={e => setGeneralObservations(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical', outline: 'none' }}
                />
              </div>

              {/* ------------------------------------------------------------- */}
              {/* BARRA INFERIOR DE ACCIONES (FOOTER) */}
              {/* ------------------------------------------------------------- */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  gap: '0.85rem',
                  paddingTop: '0.75rem',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.75rem 1.65rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
                    fontSize: '0.9rem'
                  }}
                >
                  <Save size={18} /> Guardar entrevista
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewInterviewData({
                      id: 'BORRADOR',
                      interviewee_name: intervieweeName || 'Sin asignar',
                      interviewee_run: intervieweeRun || 'N/A',
                      interviewee_role: intervieweeRole,
                      course_name: courseName,
                      homeroom_teacher: homeroomTeacher,
                      subject_teacher: subjectTeacher,
                      pie_specialist: pieSpecialist,
                      date,
                      time,
                      interviewer_name: interviewerName,
                      status,
                      privacy,
                      followup_date: followupDate,
                      objective,
                      agreements,
                      reason,
                      general_observations: generalObservations,
                      participants
                    });
                    setShowPreviewModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '0.75rem 1.4rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)',
                    fontSize: '0.9rem'
                  }}
                >
                  <Eye size={18} /> Previsualizar reporte
                </button>

                <button
                  type="button"
                  onClick={handleOpenQR}
                  style={{
                    background: '#ffffff',
                    color: '#2563eb',
                    border: '1.5px solid #bfdbfe',
                    fontWeight: 700,
                    padding: '0.72rem 1.4rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  <QrCode size={18} /> Compartir Pantalla (QR)
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  style={{
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1.5px solid #cbd5e1',
                    fontWeight: 600,
                    padding: '0.72rem 1.4rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  <X size={18} /> Cancelar / Limpiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PREVISUALIZAR E IMPRIMIR ACTA (FORMATO OFICIAL LTP v2.0) */}
      {/* ========================================================================= */}
      {showPreviewModal && previewInterviewData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
          >
            {/* Header del Preview */}
            <div
              style={{
                padding: '1rem 1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={18} color="#4f46e5" />
                <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                  Acta Oficial de Entrevista — {previewInterviewData.id}
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#4f46e5',
                    color: '#fff',
                    fontSize: '0.82rem',
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Contenido Imprimible del Acta */}
            <div style={{ padding: '2.5rem', overflowY: 'auto', fontSize: '0.88rem', color: '#1e293b' }}>
              {/* Membrete */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                  Liceo Técnico Profesional Campanario Marcos Delucchi Fonck
                </h2>
                <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Unidad de Convivencia Escolar, Orientación y Formación Integral
                </p>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.6rem 0 0', color: '#4f46e5' }}>
                  ACTA DE ENTREVISTA Y COMPROMISOS INSTITUCIONALES
                </h3>
              </div>

              {/* Ficha Resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.85rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div><strong>Entrevistado:</strong> {previewInterviewData.interviewee_name || previewInterviewData.student_name}</div>
                <div><strong>RUT:</strong> {previewInterviewData.interviewee_run || 'N/A'}</div>
                <div><strong>Estamento / Cargo:</strong> {previewInterviewData.course_name ? `${previewInterviewData.course_name} (${previewInterviewData.interviewee_role || 'Estudiante'})` : (previewInterviewData.interviewee_role || 'Estudiante')}</div>
                <div><strong>Responsable:</strong> {previewInterviewData.interviewer_name}</div>
                <div><strong>Estado:</strong> {previewInterviewData.status || 'Abierta'}</div>
                <div><strong>Privacidad:</strong> {previewInterviewData.privacy || 'Pública'}</div>

                <div style={{ gridColumn: 'span 2', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                    <Calendar size={16} color="#4f46e5" />
                    <span><strong>Fecha de la Sesión:</strong> {formatDateFullSpanish(previewInterviewData.date)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', background: '#ecfdf5', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem' }}>
                    <Clock size={14} color="#059669" />
                    <span>{formatTimeDisplay(previewInterviewData.time)}</span>
                  </div>
                </div>

                {previewInterviewData.followup_date && (
                  <div style={{ gridColumn: 'span 2', background: '#fffbeb', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '0.82rem' }}>
                    <Calendar size={15} color="#d97706" />
                    <span><strong>Próxima Revisión / Seguimiento:</strong> {formatDateFullSpanish(previewInterviewData.followup_date)}</span>
                  </div>
                )}
              </div>

              {/* Objetivos */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4f46e5', margin: '0 0 0.3rem' }}>1. OBJETIVO DEL ENCUENTRO</h4>
                <p style={{ margin: 0, padding: '0.75rem', background: '#f1f5f9', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                  {previewInterviewData.objective || 'Sin objetivo especificado.'}
                </p>
              </div>

              {/* Motivo y Hechos */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4f46e5', margin: '0 0 0.3rem' }}>2. ANTECEDENTES Y DETALLE DE LOS HECHOS</h4>
                <p style={{ margin: 0, padding: '0.75rem', background: '#f1f5f9', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                  {previewInterviewData.reason || 'Sin antecedentes registrados.'}
                </p>
              </div>

              {/* Acuerdos */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#15803d', margin: '0 0 0.3rem' }}>3. ACUERDOS Y COMPROMISOS ADQUIRIDOS</h4>
                <p style={{ margin: 0, padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px', whiteSpace: 'pre-wrap', borderLeft: '4px solid #16a34a' }}>
                  {previewInterviewData.agreements || 'Sin compromisos registrados.'}
                </p>
              </div>

              {/* Participantes */}
              {Array.isArray(previewInterviewData.participants) && previewInterviewData.participants.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {previewInterviewData.participants.some((p: any) => p.status === 'PENDIENTE') && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontSize: '0.82rem' }}>
                      <Clock size={16} color="#d97706" />
                      <div>
                        <strong>Aviso Importante antes de Imprimir:</strong> Existen participantes con solicitud de relato pendiente con plazo activo. Se recomienda esperar la recepción de sus testimonios y firmas antes de imprimir el acta final.
                      </div>
                    </div>
                  )}

                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4f46e5', margin: '0 0 0.5rem' }}>4. PARTICIPANTES Y DECLARACIONES OFICIALES</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {previewInterviewData.participants.map((p: any, idx: number) => {
                      const isPending = p.status === 'PENDIENTE';
                      return (
                        <div key={idx} style={{ padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {p.name || p.username} <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>({p.role}) {p.user_run ? `• RUT: ${p.user_run}` : ''}</span>
                            </div>
                            {isPending ? (
                              <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                ⏳ Relato Pendiente de Entrega
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                ✅ Relato Validado
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.3rem', whiteSpace: 'pre-wrap' }}>
                            {p.statement || p.comment || (isPending ? 'Pendiente de redacción por parte del participante.' : 'Presente en la sesión.')}
                          </div>
                          {p.signature && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Firma Digital Validada:</span>
                              <img src={p.signature} alt="Firma" style={{ height: '36px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', padding: '2px' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Firmas */}
              <div style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', textAlign: 'center' }}>
                <div>
                  <div style={{ borderTop: '1px solid #0f172a', width: '80%', margin: '0 auto', paddingTop: '0.5rem' }}>
                    <strong>{previewInterviewData.interviewer_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Responsable Entrevista / Convivencia</div>
                  </div>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid #0f172a', width: '80%', margin: '0 auto', paddingTop: '0.5rem' }}>
                    <strong>{previewInterviewData.interviewee_name || previewInterviewData.student_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Entrevistado / Apoderado</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL COMPARTIR PANTALLA (QR / MULTIVISTA DUAL EN VIVO) */}
      {/* ========================================================================= */}
      {showQRModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ width: '56px', height: '56px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#2563eb' }}>
              <QrCode size={30} />
            </div>

            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              Multivista Dual en Vivo
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Escanea este código desde cualquier celular, tablet o notebook conectado a la misma red Wi-Fi para seguir y firmar el acta en vivo.
            </p>

            {/* Código QR Dinámico */}
            <div style={{ display: 'inline-block', padding: '1rem', background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '14px', marginBottom: '1.25rem' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  `http://${window.location.hostname === 'localhost' ? '192.168.1.12' : window.location.hostname}:3000/?session=${qrSessionCode}`
                )}`}
                alt="Código QR de la entrevista"
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
              <span style={{ color: '#64748b' }}>Dirección LAN directa:</span><br />
              <strong style={{ color: '#2563eb', fontSize: '0.9rem' }}>
                http://{window.location.hostname === 'localhost' ? '192.168.1.12' : window.location.hostname}:3000
              </strong>
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Código de Sesión: <strong>{qrSessionCode}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQRModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', fontWeight: 600 }}
            >
              Listo, Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE FIRMA DIGITAL CON CANVAS TÁCTIL */}
      {/* ========================================================================= */}
      {showSignatureModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2500,
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PenTool size={20} color="#d97706" />
                <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>
                  Captura de Firma Digital / Manuscrita
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
              Firme con el dedo o puntero en pantalla táctil, o con el mouse:
            </p>

            {/* Canvas de Firma */}
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '10px', background: '#fafafa', overflow: 'hidden', marginBottom: '1rem', touchAction: 'none' }}>
              <canvas
                ref={signatureCanvasRef}
                width={470}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ display: 'block', width: '100%', height: '180px', cursor: 'crosshair' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={clearCanvas}
                style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.82rem', padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Limpiar Firma
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(false)}
                  style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.82rem', padding: '0.55rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  style={{ background: '#059669', color: '#ffffff', fontSize: '0.82rem', padding: '0.55rem 1.3rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Guardar Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
