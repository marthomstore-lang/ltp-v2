import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import { 
  Users, 
  X, 
  Plus, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  BookOpen, 
  Edit2, 
  Trash2, 
  UserCheck, 
  Sparkles,
  Info,
  CheckCircle2, 
  FileText,
  Search,
  ChevronDown,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface CourseSupportProfessional {
  id: number;
  course_name: string;
  professional_name: string;
  role: string;
  intervention_days: string;
  intervention_type: string;
  target_students: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  academic_year: number;
  created_at?: string;
}

interface CourseSupportModalProps {
  courseName: string;
  isOpen: boolean;
  onClose: () => void;
  availableCourses?: string[];
}

const COMMON_ROLES = [
  'Educador(a) Diferencial PIE',
  'Psicólogo(a) Escolar',
  'Fonoaudiólogo(a)',
  'Terapeuta Ocupacional',
  'Asistente de Aula / Técnico',
  'Trabajador(a) Social',
  'Encargado(a) de Convivencia Escolar',
  'Tutor(a) Pedagógico(a)',
  'Psicopedagogo(a)'
];

const COMMON_TYPES = [
  'Aula Regular / Co-docencia con profesor de asignatura',
  'Aula de Recursos PIE (Apoyo específico)',
  'Atención Individualizada en Box / Sesión clínica',
  'Taller Grupal / Refuerzo Pedagógico',
  'Acompañamiento Socioemocional y Recreos',
  'Evaluaciones Diagnósticas y Reevaluaciones PIE'
];

const getRoleColor = (role: string) => {
  const r = (role || '').toLowerCase();
  if (r.includes('diferencial') || r.includes('pie')) {
    return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' };
  }
  if (r.includes('psicolog')) {
    return { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
  }
  if (r.includes('fono')) {
    return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
  }
  if (r.includes('terapeut') || r.includes('ocupacional')) {
    return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
  }
  if (r.includes('asistente') || r.includes('tecnico')) {
    return { bg: '#fdf4ff', text: '#86198f', border: '#f5d0fe' };
  }
  if (r.includes('social') || r.includes('convivencia')) {
    return { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' };
  }
  return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
};

const matchStaffRole = (u: any): { role: string; customRole: string } => {
  const combined = `${u.job_function || ''} ${u.role || ''} ${u.staff_type || ''}`.toLowerCase();
  if (combined.includes('diferencial')) return { role: 'Educador(a) Diferencial PIE', customRole: '' };
  if (combined.includes('psicolog')) return { role: 'Psicólogo(a)', customRole: '' };
  if (combined.includes('fono')) return { role: 'Fonoaudiólogo(a)', customRole: '' };
  if (combined.includes('terapeuta') || combined.includes('ocupacional')) return { role: 'Terapeuta Ocupacional', customRole: '' };
  if (combined.includes('asistente') && (combined.includes('aula') || combined.includes('educación') || combined.includes('educacion'))) {
    return { role: 'Asistente de Aula', customRole: '' };
  }
  if (combined.includes('social') || combined.includes('trabajador')) return { role: 'Trabajador(a) Social', customRole: '' };
  if (combined.includes('kinesiol')) return { role: 'Kinesiólogo(a)', customRole: '' };
  if (combined.includes('psicopedag')) return { role: 'Psicopedagogo(a)', customRole: '' };
  if (combined.includes('orientad')) return { role: 'Orientador(a)', customRole: '' };
  if (combined.includes('tutor')) return { role: 'Tutor(a) Pedagógico', customRole: '' };
  if (combined.includes('docente') || combined.includes('profesor')) return { role: 'Docente de Apoyo / Refuerzo', customRole: '' };

  if (u.job_function && u.job_function !== 'DOCENTE DE AULA') {
    return { role: 'Otro', customRole: u.job_function };
  }
  return { role: COMMON_ROLES[0], customRole: '' };
};

export const CourseSupportModal: React.FC<CourseSupportModalProps> = ({
  courseName: initialCourseName,
  isOpen,
  onClose,
  availableCourses = []
}) => {
  const { token, user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState(initialCourseName);
  const [professionals, setProfessionals] = useState<CourseSupportProfessional[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Lista de funcionarios registrados en la base de datos
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [selectedStaffUser, setSelectedStaffUser] = useState<any | null>(null);

  // Formulario
  const [formData, setFormData] = useState({
    professional_name: '',
    role: COMMON_ROLES[0],
    custom_role: '',
    intervention_days: '',
    intervention_type: COMMON_TYPES[0],
    target_students: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
    academic_year: new Date().getFullYear()
  });

  // Estados para horarios diferidos por día
  const [scheduleEntries, setScheduleEntries] = useState<Array<{ day: string; start: string; end: string }>>([]);
  const [scheduleDay, setScheduleDay] = useState('Lunes');
  const [scheduleStart, setScheduleStart] = useState('08:30');
  const [scheduleEnd, setScheduleEnd] = useState('10:00');

  const handleAddScheduleEntry = () => {
    if (!scheduleDay || !scheduleStart || !scheduleEnd) return;
    const newEntry = { day: scheduleDay, start: scheduleStart, end: scheduleEnd };
    const updated = [...scheduleEntries, newEntry];
    setScheduleEntries(updated);
    const formatted = updated.map(e => `${e.day}: ${e.start} a ${e.end} hrs`).join(' | ');
    setFormData(prev => ({ ...prev, intervention_days: formatted }));
  };

  const handleRemoveScheduleEntry = (index: number) => {
    const updated = scheduleEntries.filter((_, idx) => idx !== index);
    setScheduleEntries(updated);
    const formatted = updated.map(e => `${e.day}: ${e.start} a ${e.end} hrs`).join(' | ');
    setFormData(prev => ({ ...prev, intervention_days: formatted }));
  };

  useEffect(() => {
    setSelectedCourse(initialCourseName);
  }, [initialCourseName]);

  useEffect(() => {
    if (isOpen && selectedCourse) {
      loadProfessionals(selectedCourse);
    }
  }, [isOpen, selectedCourse]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setStaffUsers(data);
          }
        })
        .catch(err => console.error('Error al cargar funcionarios de la base de datos:', err));
    }
  }, [isOpen, token]);

  const filteredStaffUsers = useMemo(() => {
    if (!staffSearchQuery.trim()) {
      return staffUsers.slice(0, 25);
    }
    const q = staffSearchQuery.toLowerCase().trim();
    return staffUsers.filter(u => {
      const name = (u.name || '').toLowerCase();
      const run = (u.run || '').toLowerCase();
      const job = (u.job_function || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || run.includes(q) || job.includes(q) || role.includes(q) || email.includes(q);
    }).slice(0, 30);
  }, [staffUsers, staffSearchQuery]);

  const handleSelectStaffUser = (u: any) => {
    const { role: matchedRole, customRole: matchedCustomRole } = matchStaffRole(u);
    setSelectedStaffUser(u);
    setFormData(prev => ({
      ...prev,
      professional_name: u.name || '',
      contact_email: u.email || prev.contact_email,
      contact_phone: u.phone || prev.contact_phone,
      role: matchedRole,
      custom_role: matchedCustomRole
    }));
    setStaffSearchQuery(u.name);
    setShowStaffDropdown(false);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Datos de ${u.name} seleccionados`,
      timer: 1600,
      showConfirmButton: false
    });
  };

  const loadProfessionals = async (cName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(cName)}/support-professionals`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data && Array.isArray(data.professionals)) {
        setProfessionals(data.professionals);
      } else {
        setProfessionals([]);
      }
    } catch (err) {
      console.error('Error al cargar profesionales de apoyo:', err);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      professional_name: '',
      role: COMMON_ROLES[0],
      custom_role: '',
      intervention_days: '',
      intervention_type: COMMON_TYPES[0],
      target_students: '',
      contact_email: '',
      contact_phone: '',
      notes: '',
      academic_year: new Date().getFullYear()
    });
    setEditingId(null);
    setSelectedStaffUser(null);
    setStaffSearchQuery('');
    setShowStaffDropdown(false);
    setShowForm(false);
    setScheduleEntries([]);
  };

  const handleStartEdit = (prof: CourseSupportProfessional) => {
    const isStandardRole = COMMON_ROLES.includes(prof.role);
    setFormData({
      professional_name: prof.professional_name || '',
      role: isStandardRole ? prof.role : 'Otro',
      custom_role: isStandardRole ? '' : prof.role,
      intervention_days: prof.intervention_days || '',
      intervention_type: prof.intervention_type || COMMON_TYPES[0],
      target_students: prof.target_students || '',
      contact_email: prof.contact_email || '',
      contact_phone: prof.contact_phone || '',
      notes: prof.notes || '',
      academic_year: prof.academic_year || new Date().getFullYear()
    });
    // Parsear días y horarios diferidos si vienen separados por |
    const parsedEntries: Array<{ day: string; start: string; end: string }> = [];
    if (prof.intervention_days) {
      const parts = prof.intervention_days.split('|');
      parts.forEach(p => {
        const match = p.trim().match(/^([A-Za-záéíóúÁÉÍÓÚñÑ]+):\s*(\d{1,2}:\d{2})\s*(?:a|-)\s*(\d{1,2}:\d{2})/);
        if (match) {
          parsedEntries.push({ day: match[1], start: match[2], end: match[3] });
        }
      });
    }
    setScheduleEntries(parsedEntries);
    setEditingId(prof.id);
    setSelectedStaffUser(null);
    setStaffSearchQuery(prof.professional_name || '');
    setShowStaffDropdown(false);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.professional_name.trim()) {
      Swal.fire('Atención', 'Por favor ingresa el nombre del profesional.', 'warning');
      return;
    }

    const finalRole = formData.role === 'Otro' ? (formData.custom_role.trim() || 'Profesional de Apoyo') : formData.role;

    try {
      const url = editingId 
        ? `/api/courses/support-professionals/${editingId}`
        : `/api/courses/${encodeURIComponent(selectedCourse)}/support-professionals`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          professional_name: formData.professional_name.trim(),
          role: finalRole,
          intervention_days: formData.intervention_days.trim(),
          intervention_type: formData.intervention_type.trim(),
          target_students: formData.target_students.trim(),
          contact_email: formData.contact_email.trim(),
          contact_phone: formData.contact_phone.trim(),
          notes: formData.notes.trim(),
          academic_year: formData.academic_year
        })
      });

      const data = await res.json();
      if (data && data.success) {
        Swal.fire({
          icon: 'success',
          title: editingId ? 'Actualizado' : 'Registrado',
          text: data.message || 'Profesional de apoyo guardado correctamente.',
          timer: 2000,
          showConfirmButton: false
        });
        resetForm();
        loadProfessionals(selectedCourse);
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Fallo de conexión al servidor.', 'error');
    }
  };

  const handleDelete = async (prof: CourseSupportProfessional) => {
    const result = await Swal.fire({
      title: '¿Eliminar profesional del curso?',
      html: `¿Estás seguro de desvincular a <strong>${prof.professional_name}</strong> (${prof.role}) de <strong>${selectedCourse}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/courses/support-professionals/${prof.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data && data.success) {
          Swal.fire('Eliminado', data.message, 'success');
          loadProfessionals(selectedCourse);
        } else {
          Swal.fire('Error', data.error || 'No se pudo eliminar.', 'error');
        }
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Fallo de conexión.', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* ENCABEZADO */}
        <div style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <Users size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                Equipo de Apoyo y Profesionales en Aula
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#c7d2fe' }}>
                Profesionales PIE, psicólogos, asistentes y especialistas que intervienen en el curso
              </p>
            </div>
          </div>
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

        {/* BARRA SUPERIOR: SELECTOR DE CURSO Y ACCIÓN NUEVO */}
        <div style={{
          padding: '0.9rem 1.75rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
              📚 Curso seleccionado:
            </label>
            {availableCourses && availableCourses.length > 1 ? (
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#1e1b4b',
                  background: '#ffffff'
                }}
              >
                {availableCourses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <span style={{
                background: '#e0e7ff',
                color: '#3730a3',
                padding: '0.3rem 0.75rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                {selectedCourse}
              </span>
            )}

            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#ffffff', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              Año Escolar {formData.academic_year}
            </span>
          </div>

          <button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            style={{
              background: showForm ? '#f1f5f9' : '#4f46e5',
              color: showForm ? '#475569' : '#ffffff',
              border: showForm ? '1px solid #cbd5e1' : 'none',
              borderRadius: '8px',
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cerrar Formulario' : 'Asignar Profesional'}
          </button>
        </div>

        {/* CONTENEDOR CON SCROLL */}
        <div style={{ padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          
          {/* FORMULARIO AGREGAR / EDITAR */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} color="#4f46e5" />
                {editingId ? 'Modificar Registro de Profesional' : `Registrar Profesional que Interviene en ${selectedCourse}`}
              </h4>

              {/* BUSCADOR DE PROFESIONALES EN LA BASE DE DATOS */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Search size={15} color="#2563eb" /> Buscar Funcionario / Especialista en la Base de Datos ({staffUsers.length} registrados):
                  </label>
                  {selectedStaffUser && (
                    <span style={{ fontSize: '0.74rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> {selectedStaffUser.name}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStaffUser(null);
                          setStaffSearchQuery('');
                        }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#047857', marginLeft: '4px', fontWeight: 800 }}
                        title="Quitar selección"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={15} color="#60a5fa" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Escribe para buscar por nombre, apellido, RUT o cargo (ej: Macarena, Diferencial, Psicólogo, Solís)..."
                        value={staffSearchQuery}
                        onChange={e => {
                          setStaffSearchQuery(e.target.value);
                          setShowStaffDropdown(true);
                        }}
                        onFocus={() => setShowStaffDropdown(true)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                          borderRadius: '8px',
                          border: '1px solid #93c5fd',
                          fontSize: '0.84rem',
                          background: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 600,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStaffDropdown(prev => !prev)}
                      style={{
                        padding: '0.55rem 0.85rem',
                        background: '#ffffff',
                        border: '1px solid #93c5fd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ChevronDown size={14} /> Ver Lista
                    </button>
                  </div>

                  {/* MENÚ DESPLEGABLE CON LOS FUNCIONARIOS FILTRADOS */}
                  {showStaffDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      maxHeight: '230px',
                      overflowY: 'auto',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                      marginTop: '4px'
                    }}>
                      <div style={{ padding: '0.4rem 0.75rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Mostrando {filteredStaffUsers.length} funcionarios de la base de datos (haz clic para autorellenar):</span>
                        <span style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 800 }} onClick={() => setShowStaffDropdown(false)}>Cerrar ✕</span>
                      </div>

                      {filteredStaffUsers.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                          No se encontraron funcionarios para &quot;{staffSearchQuery}&quot;. Puedes escribir el nombre manualmente en los campos inferiores.
                        </div>
                      ) : (
                        filteredStaffUsers.map(u => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectStaffUser(u)}
                            style={{
                              padding: '0.6rem 0.85rem',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>
                                {u.name}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '0.6rem', marginTop: '2px', flexWrap: 'wrap' }}>
                                {u.email && <span>✉️ {u.email}</span>}
                                {u.run && <span>🆔 {u.run}</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                              <span style={{
                                background: (u.job_function || '').toLowerCase().includes('diferencial') || (u.job_function || '').toLowerCase().includes('pie') ? '#f3e8ff' : '#eff6ff',
                                color: (u.job_function || '').toLowerCase().includes('diferencial') || (u.job_function || '').toLowerCase().includes('pie') ? '#7e22ce' : '#1d4ed8',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}>
                                {u.job_function || u.role || 'Funcionario'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    👤 Nombre Completo del Profesional: *
                    {selectedStaffUser && (
                      <span style={{ color: '#16a34a', fontSize: '0.72rem', fontWeight: 600, marginLeft: '6px' }}>
                        ✓ Seleccionado desde BD
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.professional_name}
                    onChange={e => setFormData({ ...formData, professional_name: e.target.value })}
                    placeholder="Ej: Macarena Valenzuela / Roberto Silva"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: selectedStaffUser ? '#f0fdf4' : '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    🏷️ Rol / Especialidad: *
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
                  >
                    {COMMON_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="Otro">Otro (Especificar)</option>
                  </select>
                </div>

                {formData.role === 'Otro' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                      Especifique Rol: *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.custom_role}
                      onChange={e => setFormData({ ...formData, custom_role: e.target.value })}
                      placeholder="Ej: Intérprete de Señas, Kinesiólogo..."
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    />
                  </div>
                )}

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      📅 Días y Horarios de Intervención: *
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#4f46e5', fontWeight: 600 }}>
                      + Agregar horarios diferidos por día
                    </span>
                  </div>

                  {/* Constructor de Horarios Diferidos */}
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.65rem', background: '#ffffff', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <select
                      value={scheduleDay}
                      onChange={e => setScheduleDay(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff', fontWeight: 600 }}
                    >
                      <option value="Lunes">Lunes</option>
                      <option value="Martes">Martes</option>
                      <option value="Miércoles">Miércoles</option>
                      <option value="Jueves">Jueves</option>
                      <option value="Viernes">Viernes</option>
                      <option value="Sábado">Sábado</option>
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#475569' }}>
                      <span>De:</span>
                      <input
                        type="time"
                        value={scheduleStart}
                        onChange={e => setScheduleStart(e.target.value)}
                        style={{ padding: '0.3rem 0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                      <span>a:</span>
                      <input
                        type="time"
                        value={scheduleEnd}
                        onChange={e => setScheduleEnd(e.target.value)}
                        style={{ padding: '0.3rem 0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddScheduleEntry}
                      style={{
                        padding: '0.35rem 0.75rem',
                        background: '#4f46e5',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      + Añadir Día
                    </button>
                  </div>

                  {/* Chips de días y horarios diferidos añadidos */}
                  {scheduleEntries.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
                      {scheduleEntries.map((entry, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          🗓️ {entry.day}: {entry.start} a {entry.end} hrs
                          <button
                            type="button"
                            onClick={() => handleRemoveScheduleEntry(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800, padding: 0 }}
                            title="Quitar este horario"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Campo de texto general editable y sincronizado */}
                  <input
                    type="text"
                    required
                    value={formData.intervention_days}
                    onChange={e => setFormData({ ...formData, intervention_days: e.target.value })}
                    placeholder="Ej: Lunes: 08:30 a 10:00 hrs | Miércoles: 10:15 a 11:50 hrs"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    * Agrega cada día con su horario específico arriba o edita el texto directamente si lo prefieres.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    🏢 Modalidad / Tipo de Intervención: *
                  </label>
                  <select
                    value={formData.intervention_type}
                    onChange={e => setFormData({ ...formData, intervention_type: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  >
                    {COMMON_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    👥 Estudiantes con quienes trabaja / Foco de Atención:
                  </label>
                  <input
                    type="text"
                    value={formData.target_students}
                    onChange={e => setFormData({ ...formData, target_students: e.target.value })}
                    placeholder="Ej: Estudiantes PIE (Juan P., Ana S.) / Todo el curso / Convivencia"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    ✉️ Correo Electrónico Institucional:
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="profesional@liceocampanario.cl"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    📞 Teléfono / Anexo de Contacto:
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+56 9 1234 5678"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    📝 Observaciones o Notas Pedagógicas:
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Detalles sobre acuerdos, apoyo en pruebas, adaptaciones..."
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <CheckCircle2 size={14} /> {editingId ? 'Guardar Cambios' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          )}

          {/* LISTA DE PROFESIONALES ASIGNADOS */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Cargando profesionales asignados...</div>
            </div>
          ) : professionals.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '2px dashed #e2e8f0'
            }}>
              <Users size={40} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.35rem', color: '#334155', fontSize: '1rem', fontWeight: 700 }}>
                No hay profesionales de apoyo registrados para {selectedCourse}
              </h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                Registra a las Educadoras Diferenciales PIE, Psicólogos, Fonoaudiólogos o Asistentes de Aula para que todos los profesores del curso sepan qué días asisten y con qué estudiantes trabajan.
              </p>
              <button
                onClick={() => setShowForm(true)}
                style={{
                  marginTop: '1rem',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Plus size={15} /> Asignar Primer Profesional
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', paddingBottom: '0.25rem' }}>
                <span>Total asignados: <strong>{professionals.length} profesional(es)</strong></span>
                <span style={{ fontStyle: 'italic' }}>Información visible para los profesores de {selectedCourse}</span>
              </div>

              {professionals.map(prof => {
                const styleColors = getRoleColor(prof.role);
                return (
                  <div
                    key={prof.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '1.1rem 1.25rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          {prof.professional_name}
                        </h4>
                        <span style={{
                          background: styleColors.bg,
                          color: styleColors.text,
                          border: `1px solid ${styleColors.border}`,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.73rem',
                          fontWeight: 800
                        }}>
                          {prof.role}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleStartEdit(prof)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.3rem 0.55rem',
                            color: '#4f46e5',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Editar profesional"
                        >
                          <Edit2 size={13} /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(prof)}
                          style={{
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            borderRadius: '6px',
                            padding: '0.3rem 0.55rem',
                            color: '#be123c',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Eliminar profesional"
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem', fontSize: '0.82rem', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e293b' }}>
                        <Calendar size={15} color="#4f46e5" />
                        <span><strong>Días / Horario:</strong> {prof.intervention_days || 'No especificado'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e293b' }}>
                        <BookOpen size={15} color="#059669" />
                        <span><strong>Modalidad:</strong> {prof.intervention_type || 'Aula Regular'}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#1e293b' }}>
                        <UserCheck size={15} color="#d97706" />
                        <span><strong>Estudiantes / Foco:</strong> {prof.target_students || 'Curso completo / PIE'}</span>
                      </div>

                      {(prof.contact_email || prof.contact_phone) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569' }}>
                          {prof.contact_email && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Mail size={13} color="#64748b" /> {prof.contact_email}
                            </span>
                          )}
                          {prof.contact_phone && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Phone size={13} color="#64748b" /> {prof.contact_phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {prof.notes && (
                      <div style={{ background: '#f8fafc', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#475569', borderLeft: '3px solid #6366f1' }}>
                        <strong>Notas:</strong> {prof.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA */}
        <div style={{
          padding: '0.85rem 1.75rem',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Liceo Técnico Profesional Campanario • Módulo de Gestión de Apoyo en Aula
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
