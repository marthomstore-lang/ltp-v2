import React, { useState, useEffect } from 'react';
import { UserCheck, Award, Briefcase, Plus, ShieldCheck, Edit2, Search, Trash2, CheckCircle2, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { formatPhone } from '../utils/phone';

interface StaffMember {
  id: string;
  user_id?: string;
  run: string;
  name: string;
  role: string;
  roles: string[];
  staff_type: string;
  job_function: string;
  contract_hours: number;
  suitability: string;
  email?: string;
  phone?: string;
}

const normalizeProfileRoleId = (val?: string): string => {
  const r = (val || '').trim();
  if (!r) return 'Docente';
  const u = r.toUpperCase();
  if (u === 'ADMIN' || u === 'ADMINISTRADOR') return 'Admin';
  if (u === 'DIRECTOR' || u === 'DIRECTIVO') return 'Director';
  if (u === 'DOCENTE' || u === 'PROFESOR') return 'Docente';
  if (u === 'ENTREVISTADOR' || u === 'ASISTENTE DE LA EDUCACIÓN' || u === 'ASISTENTE') return 'Entrevistador';
  if (u === 'ADMINISTRATIVO') return 'Administrativo';
  if (u === 'APODERADO') return 'Apoderado';
  if (u === 'VISITA') return 'Visita';
  return r;
};

interface StaffModuleProps {
  token: string;
}

export const StaffModule: React.FC<StaffModuleProps> = ({ token }) => {
  const [activeTab, setActiveTab] = useState<'todos' | 'docentes' | 'asistentes' | 'directivos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const fetchStaffData = () => {
    fetch('/api/staff', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: StaffMember[] = data.map((s: any) => {
            const primaryRole = normalizeProfileRoleId(s.role || s.staff_type || 'Docente');
            let parsedRoles: string[] = [primaryRole];
            if (Array.isArray(s.roles) && s.roles.length > 0) {
              parsedRoles = Array.from(new Set(s.roles.map((r: string) => normalizeProfileRoleId(r)).filter(Boolean)));
            } else if (typeof s.roles === 'string' && s.roles.trim()) {
              try {
                const p = JSON.parse(s.roles);
                if (Array.isArray(p) && p.length > 0) {
                  parsedRoles = Array.from(new Set(p.map((r: string) => normalizeProfileRoleId(r)).filter(Boolean)));
                }
              } catch {
                parsedRoles = Array.from(new Set(s.roles.split(',').map((r: string) => normalizeProfileRoleId(r)).filter(Boolean)));
              }
            }
            if (!parsedRoles.includes(primaryRole)) parsedRoles.unshift(primaryRole);

            return {
              id: s.user_id || s.id,
              user_id: s.user_id,
              run: s.run,
              name: s.full_name || s.name,
              role: primaryRole,
              roles: parsedRoles,
              staff_type: s.staff_type || 'Docente',
              job_function: s.job_function || 'Docente de Aula',
              contract_hours: s.contract_hours || 44,
              suitability: s.suitability || 'HABILITADO MINEDUC',
              email: s.email || '',
              phone: s.phone || ''
            };
          });
          setStaffList(mapped);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStaffData();
  }, [token]);

  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // CAMPOS DEL FORMULARIO
  const [name, setName] = useState('');
  const [run, setRun] = useState('');
  const [primaryRole, setPrimaryRole] = useState('Docente');
  const [assignedRoles, setAssignedRoles] = useState<string[]>(['Docente']);
  const [staffType, setStaffType] = useState('Docente');
  const [jobFunction, setJobFunction] = useState('');
  const [hours, setHours] = useState(44);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [suitability, setSuitability] = useState('HABILITADO');

  // ABRIR MODAL PARA CREAR O EDITAR
  const handleOpenCreate = () => {
    setEditingStaff(null);
    setName('');
    setRun('');
    setPrimaryRole('Docente');
    setAssignedRoles(['Docente']);
    setStaffType('Docente');
    setJobFunction('');
    setHours(44);
    setEmail('');
    setPhone('');
    setSuitability('HABILITADO');
    setShowModal(true);
  };

  const handleOpenEdit = (s: StaffMember) => {
    const pRole = normalizeProfileRoleId(s.role || s.staff_type || 'Docente');
    const rList = Array.isArray(s.roles) && s.roles.length > 0
      ? Array.from(new Set(s.roles.map(r => normalizeProfileRoleId(r))))
      : [pRole];
    if (!rList.includes(pRole)) rList.unshift(pRole);

    setEditingStaff(s);
    setName(s.name);
    setRun(s.run);
    setPrimaryRole(pRole);
    setAssignedRoles(rList);
    setStaffType(s.staff_type);
    setJobFunction(s.job_function);
    setHours(s.contract_hours);
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setSuitability(s.suitability || 'HABILITADO');
    setShowModal(true);
  };

  // GUARDAR EDICIÓN O CREACIÓN DE PERFIL
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    const rolesToSave = Array.from(new Set([primaryRole, ...assignedRoles].filter(Boolean)));
    const payload = {
      name: name.trim(),
      run: run.trim(),
      email: email.trim(),
      role: primaryRole,
      roles: rolesToSave,
      staff_type: staffType,
      job_function: jobFunction
    };

    try {
      if (editingStaff) {
        const res = await fetch(`/api/users/${encodeURIComponent(editingStaff.id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          Swal.fire('Error', err.error || 'No se pudo actualizar el funcionario', 'error');
          return;
        }
        setShowModal(false);
        setStaffList(prev => prev.map(s => s.id === editingStaff.id ? {
          ...s,
          name,
          run,
          role: primaryRole,
          roles: rolesToSave,
          staff_type: staffType,
          job_function: jobFunction,
          contract_hours: hours,
          email,
          phone,
          suitability
        } : s));
        fetchStaffData();
        Swal.fire({
          icon: 'success',
          title: '¡Datos Guardados Exitosamente!',
          text: `Los datos y perfiles (${rolesToSave.join(', ')}) de ${name} han sido actualizados en la plataforma.`,
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'Aceptar'
        });
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          Swal.fire('Error', err.error || 'No se pudo crear el funcionario', 'error');
          return;
        }
        setShowModal(false);
        fetchStaffData();
        Swal.fire({
          icon: 'success',
          title: '¡Datos Guardados Exitosamente!',
          text: `El registro de ${name} ha sido guardado exitosamente en la plataforma.`,
          confirmButtonColor: '#4f46e5',
          confirmButtonText: 'Aceptar'
        });
      }
    } catch {
      Swal.fire('Error', 'Error de conexión con el servidor local.', 'error');
    }
  };

  // ELIMINAR REGISTRO DE RRHH
  const handleDeleteStaff = (id: string, name: string) => {
    Swal.fire({
      title: '¿Eliminar Funcionario?',
      text: `¿Estás seguro de desvincular el registro de ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        setStaffList(prev => prev.filter(s => s.id !== id));
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Funcionario eliminado', timer: 1200, showConfirmButton: false });
      }
    });
  };

  // FILTRADO DE PERSONAL
  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.run.toLowerCase().includes(searchTerm.toLowerCase()) || (s.job_function || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'docentes') return s.staff_type === 'Docente';
    if (activeTab === 'asistentes') return s.staff_type === 'Asistente de la Educación' || s.staff_type === 'Asistente' || s.staff_type === 'Administrativo';
    if (activeTab === 'directivos') return s.staff_type === 'Admin' || s.staff_type === 'Director' || (s.job_function || '').toUpperCase().includes('DIRECTOR') || (s.job_function || '').toUpperCase().includes('JEFE');
    return true;
  });

  const docentesCount = staffList.filter(s => s.staff_type === 'Docente').length;
  const asistentesCount = staffList.filter(s => s.staff_type === 'Asistente de la Educación' || s.staff_type === 'Asistente' || s.staff_type === 'Administrativo').length;
  const directivosCount = staffList.filter(s => s.staff_type === 'Admin' || s.staff_type === 'Director' || (s.job_function || '').toUpperCase().includes('DIRECTOR') || (s.job_function || '').toUpperCase().includes('JEFE')).length;

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER DE MÓDULO RRHH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#0f172a' }}>
            Nómina Completa de Funcionarios y Recursos Humanos
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Información personal, roles MINEDUC, horas de contrato e idoneidad docente de los 96 funcionarios del establecimiento.
          </p>
        </div>
        
        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '10px', fontWeight: 700 }}>
          <Plus size={18} /> Crear / Registrar Funcionario
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA Y PESTAÑAS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('todos')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: activeTab === 'todos' ? '#4f46e5' : '#f1f5f9', color: activeTab === 'todos' ? '#ffffff' : '#64748b' }}
          >
            🏫 Todos los Funcionarios ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('docentes')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: activeTab === 'docentes' ? '#4f46e5' : '#f1f5f9', color: activeTab === 'docentes' ? '#ffffff' : '#64748b' }}
          >
            👨‍🏫 Docentes de Aula ({docentesCount})
          </button>
          <button
            onClick={() => setActiveTab('asistentes')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: activeTab === 'asistentes' ? '#4f46e5' : '#f1f5f9', color: activeTab === 'asistentes' ? '#ffffff' : '#64748b' }}
          >
            🤝 Asistentes de la Educación ({asistentesCount})
          </button>
          <button
            onClick={() => setActiveTab('directivos')}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: activeTab === 'directivos' ? '#4f46e5' : '#f1f5f9', color: activeTab === 'directivos' ? '#ffffff' : '#64748b' }}
          >
            🎓 Directivos & UTP ({directivosCount})
          </button>
        </div>

        {/* INPUT DE BÚSQUEDA */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o RUT..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>
      </div>

      {/* TABLA DE PERSONAL E INFORMACIÓN DE PERFILES */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>RUT</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>Nombre Completo</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>Perfil / Rol</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>Cargo / Función</th>
              <th style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>Horas</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Idoneidad</th>
              <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{s.run}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                  <div>{s.name}</div>
                  {s.email && <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>{s.email}</div>}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(Array.isArray(s.roles) && s.roles.length > 0 ? s.roles : [s.role || s.staff_type]).map((r: string, idx: number) => (
                      <span key={idx} style={{
                        background: r === 'Admin' ? '#fee2e2' : r === 'Director' ? '#e0e7ff' : r === 'Docente' ? '#dcfce7' : '#fef3c7',
                        color: r === 'Admin' ? '#991b1b' : r === 'Director' ? '#3730a3' : r === 'Docente' ? '#166534' : '#92400e',
                        padding: '0.22rem 0.55rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        border: idx === 0 ? '1.5px solid currentColor' : 'none'
                      }}>
                        {idx === 0 ? '⭐ ' : ''}{r}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: 600 }}>{s.job_function}</td>
                <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#475569' }}>{s.contract_hours} hrs</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} />
                    {s.suitability}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={() => handleOpenEdit(s)}
                      style={{ background: '#e0e7ff', color: '#4338ca', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Modificar información del perfil"
                    >
                      <Edit2 size={13} /> Modificar Perfil
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id, s.name)}
                      style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                      title="Eliminar registro"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL PARA CREAR O EDITAR PERFIL DE FUNCIONARIO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {editingStaff ? '✏️ Modificar Información de Perfil' : '➕ Registrar Nuevo Funcionario'}
                </h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.9, margin: 0 }}>
                  {editingStaff ? `Modificando datos de: ${editingStaff.name}` : 'Ingresa los datos personales y los perfiles de acceso del funcionario'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '1.2rem' }}>×</button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>1. Nombre Completo</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: María López González" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, outline: 'none' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>2. RUT Funcionario</label>
                  <input type="text" required value={run} onChange={e => setRun(e.target.value)} placeholder="12.345.678-9" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontFamily: 'monospace', outline: 'none' }} />
                </div>
              </div>

              <div style={{ marginBottom: '1rem', background: '#f5f3ff', padding: '0.85rem', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 900, color: '#4c1d95', display: 'block' }}>
                    🔀 3. Perfiles Asignados (Multi-Rol)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allRoleIds = ['Admin', 'Director', 'Docente', 'Entrevistador', 'Administrativo', 'Apoderado', 'Visita'];
                      setAssignedRoles(allRoleIds);
                    }}
                    style={{ background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', borderRadius: '6px', padding: '0.2rem 0.55rem', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Marcar Todos
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.6rem' }}>
                  {[
                    { id: 'Admin', label: '👑 Administrador (Control Total)' },
                    { id: 'Director', label: '🎓 Directivo / UTP / Inspectoría' },
                    { id: 'Docente', label: '👨‍🏫 Docente de Aula' },
                    { id: 'Entrevistador', label: '🗣️ Entrevistador (Convivencia / PIE)' },
                    { id: 'Administrativo', label: '📋 Administrativo (Matrícula)' },
                    { id: 'Apoderado', label: '👨‍👩‍👧 Apoderado' },
                    { id: 'Visita', label: '👁️ Visita (Solo Lectura)' }
                  ].map(opt => {
                    const isChecked = assignedRoles.includes(opt.id);
                    const isPrimary = primaryRole === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => {
                          setAssignedRoles(prev => {
                            let next = prev.includes(opt.id)
                              ? prev.filter(r => r !== opt.id)
                              : [...prev, opt.id];
                            if (next.length === 0) next = [opt.id];
                            if (!next.includes(primaryRole)) {
                              setPrimaryRole(next[0]);
                            }
                            return next;
                          });
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', padding: '0.45rem 0.6rem', borderRadius: '8px', border: isChecked ? '2px solid #7c3aed' : '1px solid #cbd5e1', background: isChecked ? '#ede9fe' : '#ffffff', color: isChecked ? '#4c1d95' : '#475569', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: isChecked ? '#7c3aed' : '#e2e8f0', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', flexShrink: 0 }}>
                            {isChecked ? '✓' : ''}
                          </span>
                          {opt.label}
                        </span>
                        {isPrimary && <span style={{ fontSize: '0.6rem', background: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: '999px' }}>Principal</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#5b21b6' }}>⭐ Perfil Principal por defecto:</span>
                  <select
                    value={primaryRole}
                    onChange={e => {
                      const newPrimary = e.target.value;
                      setPrimaryRole(newPrimary);
                      setStaffType(newPrimary);
                      setAssignedRoles(prev => prev.includes(newPrimary) ? prev : [newPrimary, ...prev]);
                    }}
                    style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '0.75rem', fontWeight: 800, color: '#4c1d95', background: '#ffffff' }}
                  >
                    {assignedRoles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>4. Estamento RRHH</label>
                  <select value={staffType} onChange={e => setStaffType(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff', outline: 'none' }}>
                    <option value="Docente">Docente</option>
                    <option value="Directivo">Directivo</option>
                    <option value="Asistente de la Educación">Asistente de la Educación</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>5. Cargo / Función Específica</label>
                  <input type="text" required value={jobFunction} onChange={e => setJobFunction(e.target.value)} placeholder="Ej: Docente de Matemática / Directora" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.9rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>6. Correo Institucional</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@liceo.cl" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>7. Teléfono</label>
                  <input type="text" value={phone} onFocus={e => { if (!e.target.value) setPhone('+56'); }} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="+56912345678" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>8. Horas Contrato</label>
                  <input type="number" min="1" max="44" value={hours} onChange={e => setHours(Number(e.target.value))} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>9. Estado Idoneidad</label>
                  <select value={suitability} onChange={e => setSuitability(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff', outline: 'none' }}>
                    <option value="HABILITADO">HABILITADO MINEDUC</option>
                    <option value="EN REVISIÓN">EN REVISIÓN</option>
                    <option value="PENDIENTE FIRMA">PENDIENTE FIRMA</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', position: 'sticky', bottom: 0, background: '#ffffff', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontWeight: 800 }}>
                  {editingStaff ? 'Guardar Cambios de Perfil' : 'Crear Registro de Funcionario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffModule;
