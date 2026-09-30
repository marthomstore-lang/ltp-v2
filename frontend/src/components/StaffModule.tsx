import React, { useState, useEffect } from 'react';
import { UserCheck, Award, Briefcase, Plus, ShieldCheck, Edit2, Search, Trash2, CheckCircle2, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { formatPhone } from '../utils/phone';

interface StaffMember {
  id: string;
  run: string;
  name: string;
  staff_type: string;
  job_function: string;
  contract_hours: number;
  suitability: string;
  email?: string;
  phone?: string;
}

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
          const mapped: StaffMember[] = data.map((s: any) => ({
            id: s.id || s.user_id,
            run: s.run,
            name: s.full_name || s.name,
            staff_type: s.staff_type || 'Docente',
            job_function: s.job_function || 'Docente de Aula',
            contract_hours: s.contract_hours || 44,
            suitability: s.suitability || 'HABILITADO MINEDUC',
            email: s.email || '',
            phone: s.phone || ''
          }));
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
    setStaffType('Docente');
    setJobFunction('');
    setHours(44);
    setEmail('');
    setPhone('');
    setSuitability('HABILITADO');
    setShowModal(true);
  };

  const handleOpenEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setName(s.name);
    setRun(s.run);
    setStaffType(s.staff_type);
    setJobFunction(s.job_function);
    setHours(s.contract_hours);
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setSuitability(s.suitability || 'HABILITADO');
    setShowModal(true);
  };

  // GUARDAR EDICIÓN O CREACIÓN DE PERFIL
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();

    // CERRAR LA VENTANA DE EDICIÓN PRIMERO
    setShowModal(false);

    if (editingStaff) {
      // EDITAR
      setStaffList(prev => prev.map(s => s.id === editingStaff.id ? {
        ...s,
        name,
        run,
        staff_type: staffType,
        job_function: jobFunction,
        contract_hours: hours,
        email,
        phone,
        suitability
      } : s));
      Swal.fire({
        icon: 'success',
        title: '¡Datos Guardados Exitosamente!',
        text: `Los datos personales de ${name} han sido actualizados en la plataforma.`,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Aceptar'
      });
    } else {
      // CREAR
      const newStaff: StaffMember = {
        id: `STF-${Date.now()}`,
        run,
        name,
        staff_type: staffType,
        job_function: jobFunction,
        contract_hours: hours,
        email,
        phone,
        suitability
      };
      setStaffList(prev => [...prev, newStaff]);
      Swal.fire({
        icon: 'success',
        title: '¡Datos Guardados Exitosamente!',
        text: `El registro de ${name} ha sido guardado exitosamente en la plataforma.`,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Aceptar'
      });
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
                  <span style={{
                    background: s.staff_type === 'Admin' ? '#fee2e2' : s.staff_type === 'Director' ? '#e0e7ff' : s.staff_type === 'Docente' ? '#dcfce7' : '#fef3c7',
                    color: s.staff_type === 'Admin' ? '#991b1b' : s.staff_type === 'Director' ? '#3730a3' : s.staff_type === 'Docente' ? '#166534' : '#92400e',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {s.staff_type}
                  </span>
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
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {editingStaff ? '✏️ Modificar Información de Perfil' : '➕ Registrar Nuevo Funcionario'}
                </h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.9, margin: 0 }}>
                  {editingStaff ? `Modificando datos de: ${editingStaff.name}` : 'Ingresa los datos personales y el perfil de acceso del funcionario'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '1.2rem' }}>×</button>
            </div>

            <form onSubmit={handleSaveStaff} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>1. Nombre Completo</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: María López González" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>2. RUT Funcionario</label>
                <input type="text" required value={run} onChange={e => setRun(e.target.value)} placeholder="12.345.678-9" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontFamily: 'monospace', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>3. Perfil de Acceso / Rol de Plataforma</label>
                <select value={staffType} onChange={e => setStaffType(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff', outline: 'none' }}>
                  <option value="Admin">👑 Admin (Control Total)</option>
                  <option value="Director">🎓 Director (Gestión Directiva)</option>
                  <option value="Docente">👨‍🏫 Docente (Profesor de Aula)</option>
                  <option value="Entrevistador">🗣️ Entrevistador (Convivencia / PIE)</option>
                  <option value="Administrativo">📋 Administrativo (Matrícula)</option>
                  <option value="Apoderado">👨‍👩‍👧 Apoderado</option>
                  <option value="Visita">👁️ Visita (Solo Lectura)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>4. Cargo / Función Especifica</label>
                <input type="text" required value={jobFunction} onChange={e => setJobFunction(e.target.value)} placeholder="Ej: Docente de Matemática / Psicóloga PIE / Directora" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>5. Correo Institucional</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@liceo.cl" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>6. Teléfono</label>
                  <input type="text" value={phone} onFocus={e => { if (!e.target.value) setPhone('+56'); }} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="+56912345678" style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>7. Horas Contrato</label>
                  <input type="number" min="1" max="44" value={hours} onChange={e => setHours(Number(e.target.value))} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>8. Estado Idoneidad</label>
                  <select value={suitability} onChange={e => setSuitability(e.target.value)} style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, background: '#ffffff', outline: 'none' }}>
                    <option value="HABILITADO">HABILITADO MINEDUC</option>
                    <option value="EN REVISIÓN">EN REVISIÓN</option>
                    <option value="PENDIENTE FIRMA">PENDIENTE FIRMA</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
