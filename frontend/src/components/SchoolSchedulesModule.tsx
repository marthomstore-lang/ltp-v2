import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  BookOpen,
  User,
  Plus,
  Trash2,
  Edit2,
  Upload,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  Filter,
  RefreshCw,
  MapPin,
  ExternalLink
} from 'lucide-react';
import Swal from 'sweetalert2';

export interface SchoolPeriod {
  id: string;
  period_number: number;
  period_name: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  shift?: string;
  sort_order: number;
}

export interface ClassSchedule {
  id: string;
  academic_year: number;
  course_name: string;
  day_of_week: number; // 1=Lunes ... 5=Viernes
  day_name: string;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
  classroom: string;
  source?: string;
}

interface SchoolSchedulesModuleProps {
  token: string;
  user: any;
  coursesList: string[];
  subjectsList: string[];
  teachersList: string[];
  onSelectForPlanning?: (courseName: string, subjectName: string) => void;
}

const DAYS = [
  { num: 1, name: 'Lunes' },
  { num: 2, name: 'Martes' },
  { num: 3, name: 'Miércoles' },
  { num: 4, name: 'Jueves' },
  { num: 5, name: 'Viernes' }
];

export const SchoolSchedulesModule: React.FC<SchoolSchedulesModuleProps> = ({
  token,
  user,
  coursesList,
  subjectsList,
  teachersList,
  onSelectForPlanning
}) => {
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Modo de visualización: 'teacher' (Mi horario docente) | 'course' (Horario por curso) | 'asc_import' (Importador aSc)
  const isTeacher = user?.role === 'Docente' || user?.role === 'Profesor' || user?.role === 'Profesor Jefe';
  const isAdmin = user?.role === 'Admin' || user?.role === 'Director' || user?.role === 'Jefe UTP' || user?.role === 'Inspector General';

  const [activeView, setActiveView] = useState<'teacher' | 'course' | 'asc_import'>(
    isTeacher ? 'teacher' : 'course'
  );

  const [selectedCourse, setSelectedCourse] = useState<string>('1° Básico A');
  const [selectedTeacher, setSelectedTeacher] = useState<string>(user?.name || '');

  // Modal para edición manual de bloque de horario
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<{
    id?: string;
    course_name: string;
    day_of_week: number;
    period_number: number;
    start_time: string;
    end_time: string;
    subject_name: string;
    teacher_name: string;
    classroom: string;
  }>({
    course_name: '',
    day_of_week: 1,
    period_number: 1,
    start_time: '08:00',
    end_time: '09:30',
    subject_name: '',
    teacher_name: '',
    classroom: 'Sala 1'
  });

  // Importador aSc Horarios
  const [ascXmlFile, setAscXmlFile] = useState<File | null>(null);
  const [ascRawTable, setAscRawTable] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  useEffect(() => {
    loadPeriods();
    loadSchedules();
  }, []);

  useEffect(() => {
    if (coursesList.length > 0 && !selectedCourse) {
      setSelectedCourse(coursesList[0]);
    }
    if (user?.name && !selectedTeacher) {
      setSelectedTeacher(user.name);
    }
  }, [coursesList, user]);

  const loadPeriods = async () => {
    try {
      const res = await fetch('/api/schedules/periods', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods || []);
      }
    } catch (err) {
      console.error('Error al cargar períodos:', err);
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedules?academic_year=2026', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.error('Error al cargar horarios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Comparador de nombres docentes
  const isMatchTeacher = (cand: string, target: string) => {
    if (!cand || !target) return false;
    const c = cand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const t = target.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return c === t || c.includes(t) || t.includes(c);
  };

  // Filtrado según vista activa
  const displayedSchedules = useMemo(() => {
    if (activeView === 'teacher') {
      const target = selectedTeacher || user?.name || '';
      return schedules.filter(s => isMatchTeacher(s.teacher_name, target));
    }
    if (activeView === 'course') {
      const target = (selectedCourse || '').toLowerCase().trim();
      return schedules.filter(s => s.course_name.toLowerCase().trim() === target);
    }
    return schedules;
  }, [schedules, activeView, selectedTeacher, selectedCourse, user]);

  // Mapa de acceso rápido: [day_of_week]-[period_number] -> ClassSchedule
  const scheduleMatrix = useMemo(() => {
    const map: Record<string, ClassSchedule> = {};
    displayedSchedules.forEach(s => {
      const key = `${s.day_of_week}-${s.period_number}`;
      map[key] = s;
    });
    return map;
  }, [displayedSchedules]);

  // Colores visuales consistentes según asignatura
  const getSubjectColor = (subj: string) => {
    const s = subj.toLowerCase();
    if (s.includes('lengua') || s.includes('literat') || s.includes('comunic')) {
      return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', badge: '#dbeafe' };
    }
    if (s.includes('matemát') || s.includes('financ')) {
      return { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c', badge: '#fee2e2' };
    }
    if (s.includes('ciencia') || s.includes('biolog') || s.includes('químic') || s.includes('físic')) {
      return { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', badge: '#dcfce7' };
    }
    if (s.includes('historia') || s.includes('ciudadan') || s.includes('social')) {
      return { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', badge: '#fef3c7' };
    }
    if (s.includes('inglés') || s.includes('idioma')) {
      return { bg: '#faf5ff', border: '#a855f7', text: '#7e22ce', badge: '#f3e8ff' };
    }
    if (s.includes('física') || s.includes('deporte')) {
      return { bg: '#ecfeff', border: '#06b6d4', text: '#0e7490', badge: '#cffafe' };
    }
    if (s.includes('mep') || s.includes('mecánic') || s.includes('párvulo') || s.includes('taller')) {
      return { bg: '#fdf4ff', border: '#d946ef', text: '#86198f', badge: '#fae8ff' };
    }
    return { bg: '#f8fafc', border: '#64748b', text: '#334155', badge: '#e2e8f0' };
  };

  // Abrir modal para editar o crear bloque
  const handleOpenEditSlot = (dayNum: number, pNum: number, pStart: string, pEnd: string, existing?: ClassSchedule) => {
    if (!isAdmin) return; // Solo UTP / Admin edita bloques
    if (existing) {
      setEditingSlot({
        id: existing.id,
        course_name: existing.course_name,
        day_of_week: existing.day_of_week,
        period_number: existing.period_number,
        start_time: existing.start_time,
        end_time: existing.end_time,
        subject_name: existing.subject_name,
        teacher_name: existing.teacher_name,
        classroom: existing.classroom || 'Sala de Clases'
      });
    } else {
      setEditingSlot({
        course_name: activeView === 'course' ? selectedCourse : (coursesList[0] || '1° Básico A'),
        day_of_week: dayNum,
        period_number: pNum,
        start_time: pStart,
        end_time: pEnd,
        subject_name: subjectsList[0] || 'Lenguaje y Comunicación',
        teacher_name: activeView === 'teacher' ? selectedTeacher : (teachersList[0] || user?.name || ''),
        classroom: 'Sala 1'
      });
    }
    setShowEditModal(true);
  };

  // Guardar bloque de horario
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingSlot)
      });
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Bloque Horario Guardado',
          text: `${editingSlot.course_name} — ${editingSlot.subject_name}`,
          timer: 1500,
          showConfirmButton: false
        });
        setShowEditModal(false);
        await loadSchedules();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.error || 'No se pudo guardar el bloque.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de red al guardar bloque.', 'error');
    }
  };

  // Eliminar bloque
  const handleDeleteSlot = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirm = await Swal.fire({
      title: '¿Eliminar este bloque?',
      text: 'Se liberará este período horario.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/schedules/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setShowEditModal(false);
          await loadSchedules();
          Swal.fire('Eliminado', 'Bloque horario eliminado.', 'success');
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo eliminar el bloque.', 'error');
      }
    }
  };

  // Importar desde aSc Horarios (XML o Tabla copiada)
  const handleImportAsc = async () => {
    if (!ascXmlFile && !ascRawTable.trim()) {
      Swal.fire('Atención', 'Selecciona un archivo XML exportado desde aSc Horarios o pega el contenido copiado de la tabla.', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      if (ascXmlFile) {
        formData.append('asc_file', ascXmlFile);
      }
      if (ascRawTable.trim()) {
        formData.append('raw_table', ascRawTable);
      }
      formData.append('academic_year', '2026');
      formData.append('replace_existing', String(replaceExisting));

      const res = await fetch('/api/schedules/import-asc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Horario aSc Importado!',
          html: `<div style="text-align: left; font-size: 0.9rem;">
            <p>${data.message}</p>
            <ul>
              <li><strong>Bloques cargados:</strong> ${data.insertedCount || data.count || 0}</li>
              ${data.coursesCount ? `<li><strong>Cursos procesados:</strong> ${data.coursesCount}</li>` : ''}
              ${data.teachersCount ? `<li><strong>Docentes detectados:</strong> ${data.teachersCount}</li>` : ''}
            </ul>
          </div>`
        });
        setAscXmlFile(null);
        setAscRawTable('');
        setActiveView('course');
        await loadSchedules();
      } else {
        Swal.fire('Error al Importar aSc', data.error || 'No se pudo procesar el archivo aSc Horarios.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err?.message || 'Error de conexión al importar aSc.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Impresión oficial del horario en PDF / Hoja de Impresión
  const handlePrintSchedule = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const titleText = activeView === 'teacher'
      ? `HORARIO DOCENTE: ${selectedTeacher.toUpperCase()}`
      : `HORARIO SEMANAL: ${selectedCourse.toUpperCase()}`;

    const subtitleText = activeView === 'teacher'
      ? `Colegio / Liceo Técnico Profesional — Año Académico 2026`
      : `Profesor Jefe / Docente a cargo — Jornada Escolar 2026`;

    // Armar tabla de impresión
    const rowsHtml = periods
      .filter(p => !p.is_break)
      .map(p => {
        const cellsHtml = DAYS.map(d => {
          const slot = scheduleMatrix[`${d.num}-${p.period_number}`];
          if (!slot) {
            return `<td style="border: 1px solid #000; padding: 6px; text-align: center; color: #777; font-size: 11px;">—</td>`;
          }
          const primary = activeView === 'teacher' ? slot.course_name : slot.subject_name;
          const secondary = activeView === 'teacher' ? slot.subject_name : (slot.teacher_name || 'Sin Asignar');
          const room = slot.classroom ? `(${slot.classroom})` : '';

          return `
            <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 11px; vertical-align: middle;">
              <strong style="display: block; font-size: 12px; color: #000;">${primary}</strong>
              <span style="font-size: 11px; color: #222;">${secondary}</span>
              ${room ? `<div style="font-size: 9px; color: #555;">${room}</div>` : ''}
            </td>
          `;
        }).join('');

        return `
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; background-color: #f2f2f2; text-align: center; width: 120px; font-size: 11px;">
              ${p.period_name}<br>
              <span style="font-size: 10px; font-weight: normal; color: #444;">${p.start_time} - ${p.end_time}</span>
            </td>
            ${cellsHtml}
          </tr>
        `;
      }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${titleText}</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 10px; color: #000; }
          h2 { text-align: center; font-size: 16px; margin: 0 0 4px 0; text-transform: uppercase; font-weight: bold; }
          p.subtitle { text-align: center; font-size: 11px; margin: 0 0 14px 0; color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { border: 1px solid #000; padding: 8px; background-color: #e5e7eb; font-size: 12px; text-transform: uppercase; }
          td { border: 1px solid #000; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h2>${titleText}</h2>
        <p class="subtitle">${subtitleText}</p>
        <table>
          <thead>
            <tr>
              <th style="width: 120px;">Horario / Bloque</th>
              <th>Lunes</th>
              <th>Martes</th>
              <th>Miércoles</th>
              <th>Jueves</th>
              <th>Viernes</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* ===================================================================== */}
      {/* CABECERA Y SELECTOR DE VISTAS                                         */}
      {/* ===================================================================== */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={22} color="#0d9488" />
              Horarios Escolares & aSc Timetables
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Gestión visual de campanas, carga horaria semanal por curso, horarios para docentes y apoderados, e integración con aSc Horarios.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveView('teacher')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: activeView === 'teacher' ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                background: activeView === 'teacher' ? '#f0fdfa' : '#ffffff',
                color: activeView === 'teacher' ? '#0f766e' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <User size={14} />
              Mi Horario Docente
            </button>

            <button
              type="button"
              onClick={() => setActiveView('course')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: activeView === 'course' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                background: activeView === 'course' ? '#f0f9ff' : '#ffffff',
                color: activeView === 'course' ? '#0369a1' : '#475569',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <BookOpen size={14} />
              Horario por Curso (Apoderados / Alumnos)
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveView('asc_import')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: activeView === 'asc_import' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                  background: activeView === 'asc_import' ? '#faf5ff' : '#ffffff',
                  color: activeView === 'asc_import' ? '#6d28d9' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Upload size={14} />
                📥 Importador aSc Horarios (XML / Excel)
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintSchedule}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #0f172a',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              Imprimir Horario
            </button>
          </div>
        </div>

        {/* CONTROLES DE FILTRO SEGÚN LA VISTA SELECCIONADA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          {activeView === 'course' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                Seleccionar Curso:
              </label>
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  minWidth: '220px'
                }}
              >
                {coursesList.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeView === 'teacher' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155' }}>
                Docente:
              </label>
              {isAdmin ? (
                <select
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    minWidth: '240px'
                  }}
                >
                  <option value={user?.name || ''}>Mi Perfil ({user?.name})</option>
                  {teachersList.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0d9488' }}>
                  {user?.name || 'Docente'}
                </span>
              )}
            </div>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Bloques asignados: <strong>{displayedSchedules.length}</strong></span>
            {isAdmin && <span style={{ color: '#0284c7' }}>(Haz clic en cualquier celda para editar o asignar)</span>}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VISTA 1 Y 2: GRILLA SEMANAL (LUNES A VIERNES)                         */}
      {/* ===================================================================== */}
      {activeView !== 'asc_import' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '130px', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Bloque / Hora
                  </th>
                  {DAYS.map(d => (
                    <th key={d.num} style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => {
                  if (period.is_break) {
                    return (
                      <tr key={period.id} style={{ background: '#f1f5f9', borderBottom: '1px dashed #cbd5e1' }}>
                        <td colSpan={6} style={{ padding: '0.4rem 1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>
                          ☕ {period.period_name} ({period.start_time} - {period.end_time})
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={period.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* COLUMNA PERÍODO */}
                      <td style={{
                        padding: '0.75rem 1rem',
                        background: '#fafafa',
                        borderRight: '1px solid #f1f5f9',
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a' }}>
                          {period.period_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <Clock size={11} />
                          {period.start_time} - {period.end_time}
                        </div>
                      </td>

                      {/* COLUMNAS DE DÍAS (1 A 5) */}
                      {DAYS.map(day => {
                        const slot = scheduleMatrix[`${day.num}-${period.period_number}`];
                        const colors = slot ? getSubjectColor(slot.subject_name) : null;

                        return (
                          <td
                            key={day.num}
                            onClick={() => {
                              if (isAdmin) {
                                handleOpenEditSlot(day.num, period.period_number, period.start_time, period.end_time, slot);
                              }
                            }}
                            style={{
                              padding: '0.55rem',
                              borderRight: '1px solid #f1f5f9',
                              verticalAlign: 'top',
                              cursor: isAdmin ? 'pointer' : 'default',
                              background: slot ? colors?.bg : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            {slot ? (
                              <div style={{
                                borderLeft: `3px solid ${colors?.border}`,
                                padding: '0.45rem 0.55rem',
                                borderRadius: '6px',
                                background: '#ffffff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: colors?.text, lineHeight: 1.25 }}>
                                    {activeView === 'teacher' ? slot.course_name : slot.subject_name}
                                  </span>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteSlot(slot.id, e)}
                                      title="Eliminar este bloque"
                                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>

                                <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                                  {activeView === 'teacher' ? slot.subject_name : (slot.teacher_name || 'Sin Asignar')}
                                </span>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '0.68rem', color: '#64748b' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <MapPin size={10} />
                                    {slot.classroom || 'Sala'}
                                  </span>

                                  {/* BOTÓN RÁPIDO PARA IR A PLANIFICAR ESTA CLASE */}
                                  {onSelectForPlanning && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectForPlanning(slot.course_name, slot.subject_name);
                                      }}
                                      title="Ir a planificar las clases de este curso y asignatura"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        background: '#0284c7',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '0.15rem 0.4rem',
                                        fontSize: '0.66rem',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Planificar
                                      <ExternalLink size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                minHeight: '65px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px dashed #e2e8f0',
                                borderRadius: '6px',
                                color: '#cbd5e1',
                                fontSize: '0.7rem'
                              }}>
                                {isAdmin ? '+ Asignar' : '—'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 3: IMPORTADOR NATIVO DE aSc HORARIOS (XML / EXCEL)              */}
      {/* ===================================================================== */}
      {activeView === 'asc_import' && (
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#f3e8ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Upload size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
                Importador Nativo de aSc Horarios (aSc Timetables)
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Carga el archivo generado por aSc Horarios para sincronizar instantáneamente todos los cursos, profesores, asignaturas y campanas.
              </p>
            </div>
          </div>

          {/* INSTRUCCIONES RÁPIDAS aSc */}
          <div style={{
            background: '#faf5ff',
            border: '1px solid #e9d5ff',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: '#581c87',
            lineHeight: 1.5
          }}>
            <strong>📋 ¿Cómo exportar desde aSc Horarios en tu colegio?</strong>
            <ol style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
              <li>Abre tu horario en <strong>aSc Horarios (aSc Timetables)</strong>.</li>
              <li>Haz clic en el menú superior <strong>Archivo &gt; Exportar &gt; aSc Timetables XML</strong>.</li>
              <li>Guarda el archivo <code>.xml</code> en tu computador y selecciónalo a continuación.</li>
              <li>(Alternativa): Si prefieres copiar y pegar, copia la tabla de horarios de aSc o Excel y pégala en la casilla inferior.</li>
            </ol>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* OPCIÓN A: SUBIR ARCHIVO XML aSc */}
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              background: ascXmlFile ? '#f0fdf4' : '#fafafa'
            }}>
              <FileText size={36} color={ascXmlFile ? '#16a34a' : '#94a3b8'} style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                Opción 1: Archivo XML Oficial (.xml)
              </h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.76rem', color: '#64748b' }}>
                Exportado desde "Archivo &gt; Exportar &gt; aSc Timetables XML"
              </p>

              <input
                type="file"
                accept=".xml,text/xml"
                id="ascFileInput"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setAscXmlFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />

              <label
                htmlFor="ascFileInput"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Upload size={14} />
                {ascXmlFile ? 'Cambiar Archivo XML' : 'Seleccionar Archivo XML de aSc'}
              </label>

              {ascXmlFile && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 800, color: '#16a34a' }}>
                  ✓ {ascXmlFile.name} ({(ascXmlFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* OPCIÓN B: PEGAR TABLA DE EXCEL / PORTAPAPELES */}
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              background: '#ffffff'
            }}>
              <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                Opción 2: Pegar Tabla desde Portapapeles / Excel
              </h4>
              <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.74rem', color: '#64748b' }}>
                Columnas esperadas: <code>[Día, Bloque, Curso, Asignatura, Profesor, Sala]</code>
              </p>

              <textarea
                rows={6}
                value={ascRawTable}
                onChange={e => setAscRawTable(e.target.value)}
                placeholder="Ejemplo:
Lunes	1	1° Básico A	Lenguaje y Comunicación	David Vidal	Sala 1
Lunes	2	1° Básico A	Matemática	Profesor Matemática	Sala 1"
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          {/* OPCIONES DE REEMPLAZO Y BOTÓN DE ACCIÓN */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={e => setReplaceExisting(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#7c3aed' }}
              />
              <strong>Reemplazar completamente el horario escolar actual del año 2026</strong>
            </label>

            <button
              type="button"
              disabled={isImporting || (!ascXmlFile && !ascRawTable.trim())}
              onClick={handleImportAsc}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: '#ffffff',
                padding: '0.65rem 1.45rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.86rem',
                fontWeight: 900,
                cursor: isImporting || (!ascXmlFile && !ascRawTable.trim()) ? 'not-allowed' : 'pointer',
                opacity: isImporting || (!ascXmlFile && !ascRawTable.trim()) ? 0.6 : 1,
                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)'
              }}
            >
              <Sparkles size={16} />
              {isImporting ? 'Procesando archivo aSc...' : 'Importar y Sincronizar Horarios'}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL PARA EDITAR O CREAR UN BLOQUE HORARIO MANUAL                    */}
      {/* ===================================================================== */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>
              {editingSlot.id ? 'Editar Bloque de Horario' : 'Asignar Nuevo Bloque de Horario'}
            </h3>

            <form onSubmit={handleSaveSlot}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                    Día de la Semana:
                  </label>
                  <select
                    value={editingSlot.day_of_week}
                    onChange={e => setEditingSlot({ ...editingSlot, day_of_week: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  >
                    {DAYS.map(d => (
                      <option key={d.num} value={d.num}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                    Bloque N°:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingSlot.period_number}
                    onChange={e => setEditingSlot({ ...editingSlot, period_number: parseInt(e.target.value, 10) || 1 })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                  Curso:
                </label>
                <select
                  value={editingSlot.course_name}
                  onChange={e => setEditingSlot({ ...editingSlot, course_name: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  {coursesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                  Asignatura:
                </label>
                <select
                  value={editingSlot.subject_name}
                  onChange={e => setEditingSlot({ ...editingSlot, subject_name: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 700 }}
                >
                  {subjectsList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                  Profesor / Docente a Cargo:
                </label>
                <select
                  value={editingSlot.teacher_name}
                  onChange={e => setEditingSlot({ ...editingSlot, teacher_name: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                >
                  <option value="Sin Asignar">Sin Asignar</option>
                  {teachersList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
                    Inicio:
                  </label>
                  <input
                    type="time"
                    value={editingSlot.start_time}
                    onChange={e => setEditingSlot({ ...editingSlot, start_time: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
                    Fin:
                  </label>
                  <input
                    type="time"
                    value={editingSlot.end_time}
                    onChange={e => setEditingSlot({ ...editingSlot, end_time: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
                    Sala / Taller:
                  </label>
                  <input
                    type="text"
                    value={editingSlot.classroom}
                    onChange={e => setEditingSlot({ ...editingSlot, classroom: e.target.value })}
                    placeholder="Sala 1"
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {editingSlot.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(editingSlot.id!)}
                    style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      marginRight: 'auto'
                    }}
                  >
                    Eliminar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    background: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Guardar Bloque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSchedulesModule;
