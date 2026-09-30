import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Phone, Mail, Briefcase, GraduationCap, Printer, Shield, UserCheck, Eye, X, Filter, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';

interface GuardiansListModuleProps {
  token: string;
}

export const GuardiansListModule: React.FC<GuardiansListModuleProps> = ({ token }) => {
  const [guardians, setGuardians] = useState<any[]>([]);
  const [studentsWithoutGuardian, setStudentsWithoutGuardian] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'guardians' | 'sin_apoderado'>('guardians');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSinApoderado, setSearchSinApoderado] = useState('');
  const [courseFilter, setCourseFilter] = useState('Todos');
  const [relationFilter, setRelationFilter] = useState('Todos');
  const [selectedGuardian, setSelectedGuardian] = useState<any | null>(null);

  useEffect(() => {
    fetchGuardians();
  }, [token]);

  const fetchGuardians = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apoderados/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.guardians)) {
          // Filtrado estricto en cliente: descartar registros corruptos o cadenas 'null'
          const safeGuardians = data.guardians.filter((g: any) => {
            const r = String(g.run || '').trim().toLowerCase();
            const n = String(g.name || '').trim().toLowerCase();
            return r && r !== 'null' && r !== 'undefined' && n !== 'null' && n !== 'undefined';
          });
          setGuardians(safeGuardians);
          setStudentsWithoutGuardian(data.studentsWithoutGuardian || []);
          setTotalStudents(data.totalStudents || 0);
        }
      }
    } catch (err) {
      console.error('Error al cargar nómina de apoderados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener lista única de cursos para el filtro
  const coursesList = useMemo(() => {
    const courses = new Set<string>();
    guardians.forEach(g => {
      if (Array.isArray(g.pupils)) {
        g.pupils.forEach((p: string) => {
          const match = p.match(/\((.*?)\)/);
          if (match && match[1]) courses.add(match[1].trim());
        });
      }
    });
    return Array.from(courses).sort();
  }, [guardians]);

  // Filtrado dinámico de apoderados
  const filteredGuardians = useMemo(() => {
    return guardians.filter(g => {
      // 1. Buscador de texto libre
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRun = String(g.run || '').toLowerCase().includes(q);
        const matchName = String(g.name || '').toLowerCase().includes(q);
        const matchPhone = String(g.phone || '').toLowerCase().includes(q);
        const matchEmail = String(g.email || '').toLowerCase().includes(q);
        const matchOcc = String(g.occupation || '').toLowerCase().includes(q);
        const matchPupils = String(g.pupilsSummary || '').toLowerCase().includes(q);
        if (!matchRun && !matchName && !matchPhone && !matchEmail && !matchOcc && !matchPupils) {
          return false;
        }
      }

      // 2. Filtro por Curso
      if (courseFilter !== 'Todos') {
        const hasCourse = Array.isArray(g.pupils) && g.pupils.some((p: string) => p.includes(`(${courseFilter})`));
        if (!hasCourse) return false;
      }

      // 3. Filtro por Parentesco / Vínculo
      if (relationFilter !== 'Todos') {
        const matchRel = String(g.relation || '').toLowerCase().includes(relationFilter.toLowerCase());
        if (!matchRel) return false;
      }

      return true;
    });
  }, [guardians, searchQuery, courseFilter, relationFilter]);

  // Filtrado de estudiantes sin apoderado
  const filteredSinApoderado = useMemo(() => {
    if (!searchSinApoderado.trim()) return studentsWithoutGuardian;
    const q = searchSinApoderado.toLowerCase();
    return studentsWithoutGuardian.filter((s: any) =>
      String(s.name || '').toLowerCase().includes(q) ||
      String(s.run || '').toLowerCase().includes(q) ||
      String(s.course || '').toLowerCase().includes(q)
    );
  }, [studentsWithoutGuardian, searchSinApoderado]);

  // Estadísticas KPI
  const stats = useMemo(() => {
    const total = guardians.length;
    const multiPupils = guardians.filter(g => Array.isArray(g.pupils) && g.pupils.length > 1).length;
    const withPhone = guardians.filter(g => g.phone && String(g.phone).trim().length > 5).length;
    const withEmail = guardians.filter(g => g.email && String(g.email).includes('@')).length;
    return { total, multiPupils, withPhone, withEmail };
  }, [guardians]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* CABECERA & TITULO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck size={28} color="#4f46e5" /> Registro & Nómina General de Apoderados
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Directorio institucional unificado de apoderados titulares, suplentes, padres y madres de familia
          </p>
        </div>
        <button
          onClick={handlePrint}
          style={{
            background: '#ffffff',
            color: '#475569',
            border: '1px solid #cbd5e1',
            padding: '0.6rem 1.1rem',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <Printer size={16} /> Imprimir {activeTab === 'guardians' ? 'Nómina de Apoderados' : 'Alumnos Sin Apoderado'}
        </button>
      </div>

      {/* TARJETAS KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* TOTAL APODERADOS */}
        <div
          onClick={() => setActiveTab('guardians')}
          style={{
            background: activeTab === 'guardians' ? '#eff6ff' : '#ffffff',
            border: activeTab === 'guardians' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
            borderRadius: '12px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ background: '#e0e7ff', padding: '0.75rem', borderRadius: '10px', color: '#4f46e5' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Apoderados</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
            <div style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 600 }}>Con pupilos asignados</div>
          </div>
        </div>

        {/* MATRÍCULA TOTAL ESTUDIANTES */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '10px', color: '#334155' }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Matrícula Total</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{totalStudents || (stats.total + studentsWithoutGuardian.length)}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Alumnos en establecimiento</div>
          </div>
        </div>

        {/* ESTUDIANTES SIN APODERADO */}
        <div
          onClick={() => setActiveTab('sin_apoderado')}
          style={{
            background: activeTab === 'sin_apoderado' ? '#fffbeb' : '#ffffff',
            border: activeTab === 'sin_apoderado' ? '2px solid #d97706' : '1px solid #fde68a',
            borderRadius: '12px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '10px', color: '#d97706' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>Sin Apoderado</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{studentsWithoutGuardian.length}</div>
            <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700 }}>Click para ver nómina</div>
          </div>
        </div>

        {/* CON MÚLTIPLES PUPILOS */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '10px', color: '#15803d' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Múltiples Pupilos</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{stats.multiPupils}</div>
            <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>2 o más hermanos</div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE PESTAÑAS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('guardians')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: activeTab === 'guardians' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
            background: activeTab === 'guardians' ? '#4f46e5' : '#ffffff',
            color: activeTab === 'guardians' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === 'guardians' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} /> Directorio de Apoderados ({guardians.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sin_apoderado')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: activeTab === 'sin_apoderado' ? '2px solid #d97706' : '1px solid #fed7aa',
            background: activeTab === 'sin_apoderado' ? '#d97706' : '#fffbeb',
            color: activeTab === 'sin_apoderado' ? '#ffffff' : '#b45309',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === 'sin_apoderado' ? '0 4px 12px rgba(217, 119, 6, 0.25)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <AlertTriangle size={18} /> Estudiantes Sin Apoderado Registrado ({studentsWithoutGuardian.length})
        </button>
      </div>

      {activeTab === 'guardians' ? (
        <>
          {/* BARRA DE FILTROS & BÚSQUEDA APODERADOS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              {/* BUSCADOR LIBRE */}
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar apoderado por Nombre, RUT, Teléfono, Correo o Pupilo..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* FILTRO POR CURSO */}
              <div>
                <select
                  value={courseFilter}
                  onChange={e => setCourseFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, background: '#ffffff', color: '#1e1b4b' }}
                >
                  <option value="Todos">🏫 Todos los Cursos</option>
                  {coursesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* FILTRO POR PARENTESCO */}
              <div>
                <select
                  value={relationFilter}
                  onChange={e => setRelationFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700, background: '#ffffff', color: '#1e1b4b' }}
                >
                  <option value="Todos">🤝 Todos los Roles/Parentescos</option>
                  <option value="Titular">Apoderado Titular</option>
                  <option value="Suplente">Apoderado Suplente</option>
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE APODERADOS */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                Cargando directorio unificado de apoderados...
              </div>
            ) : filteredGuardians.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                No se encontraron apoderados que coincidan con los filtros aplicados.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      <th style={{ padding: '0.85rem 1.1rem' }}>RUT APODERADO</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>NOMBRE COMPLETO</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>VÍNCULO / ROL</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>TELÉFONO CONTACTO</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>CORREO ELECTRÓNICO</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>PUPILOS ASOCIADOS</th>
                      <th style={{ padding: '0.85rem 1.1rem', textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuardians.map((g, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                        <td style={{ padding: '0.85rem 1.1rem', fontWeight: 800, color: '#4f46e5' }}>
                          {g.run || 'Sin RUT'}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', fontWeight: 700, color: '#0f172a' }}>
                          {g.name || 'Sin Nombre'}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <span style={{
                            background: '#e0e7ff', color: '#3730a3',
                            padding: '0.2rem 0.6rem', borderRadius: '6px',
                            fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {g.relation || 'Apoderado'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', fontWeight: 600, color: '#334155' }}>
                          {g.phone ? (
                            <a href={`tel:${g.phone}`} style={{ color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              📞 {g.phone}
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Sin número</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', color: '#475569', fontSize: '0.82rem' }}>
                          {g.email ? (
                            <a href={`mailto:${g.email}`} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                              ✉️ {g.email}
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Sin correo</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {Array.isArray(g.pupils) && g.pupils.length > 0 ? (
                              g.pupils.map((pupil: string, pIdx: number) => (
                                <span key={pIdx} style={{
                                  background: '#f1f5f9', color: '#1e293b',
                                  border: '1px solid #cbd5e1', padding: '0.2rem 0.55rem',
                                  borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700
                                }}>
                                  🎓 {pupil}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sin pupilos asociados</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1.1rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedGuardian(g)}
                            style={{
                              background: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.45rem 0.85rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Eye size={14} /> Ver Ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* VISTA DE ALUMNOS SIN APODERADO REGISTRADO */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {/* BANNER INFORMATIVO */}
          <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <AlertTriangle size={22} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.92rem' }}>
                Estudiantes sin Apoderado Registrado ({studentsWithoutGuardian.length} alumnos en total)
              </div>
              <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '0.15rem' }}>
                Estos alumnos están matriculados pero no disponen de un apoderado titular o suplente con RUT válido asignado. Se excluyen de la nómina general de apoderados para evitar registros ficticios o nulos.
              </div>
            </div>
          </div>

          {/* BUSCADOR DENTRO DE SIN APODERADO */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ position: 'relative', maxWidth: '480px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchSinApoderado}
                onChange={e => setSearchSinApoderado(e.target.value)}
                placeholder="Filtrar estudiante por Nombre, RUT o Curso..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {filteredSinApoderado.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              {studentsWithoutGuardian.length === 0
                ? '🎉 Excelente, todos los estudiantes disponen de al menos un apoderado registrado.'
                : 'No se encontraron alumnos que coincidan con la búsqueda.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    <th style={{ padding: '0.85rem 1.1rem' }}>RUT ALUMNO</th>
                    <th style={{ padding: '0.85rem 1.1rem' }}>NOMBRE DEL ESTUDIANTE</th>
                    <th style={{ padding: '0.85rem 1.1rem' }}>CURSO / GRADO</th>
                    <th style={{ padding: '0.85rem 1.1rem' }}>TELÉFONO CONTACTO</th>
                    <th style={{ padding: '0.85rem 1.1rem' }}>CORREO ALUMNO</th>
                    <th style={{ padding: '0.85rem 1.1rem', textAlign: 'center' }}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSinApoderado.map((stu: any, sIdx: number) => (
                    <tr key={stu.id || sIdx} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                      <td style={{ padding: '0.85rem 1.1rem', fontWeight: 800, color: '#4f46e5' }}>
                        {stu.run || 'Sin RUT'}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', fontWeight: 700, color: '#0f172a' }}>
                        {stu.name}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem' }}>
                        <span style={{
                          background: '#f1f5f9', color: '#1e293b',
                          border: '1px solid #cbd5e1', padding: '0.2rem 0.55rem',
                          borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700
                        }}>
                          🎓 {stu.course}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', color: '#334155', fontWeight: 600 }}>
                        {stu.phone && stu.phone !== 'Sin contacto' ? (
                          <a href={`tel:${stu.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                            📞 {stu.phone}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Sin teléfono</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', color: '#475569', fontSize: '0.82rem' }}>
                        {stu.email && stu.email !== 'Sin correo' ? (
                          <a href={`mailto:${stu.email}`} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                            ✉️ {stu.email}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Sin correo</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', textAlign: 'center' }}>
                        <span style={{
                          background: '#fef3c7', color: '#b45309',
                          border: '1px solid #fde68a',
                          padding: '0.25rem 0.65rem', borderRadius: '6px',
                          fontSize: '0.75rem', fontWeight: 800
                        }}>
                          ⚠️ Falta Apoderado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALLE DE FICHA DEL APODERADO */}
      {selectedGuardian && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 3000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🛡️ Ficha Institucional del Apoderado
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>RUT: <strong style={{ color: '#4f46e5' }}>{selectedGuardian.run}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuardian(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Nombre Completo</label>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', marginTop: '0.2rem' }}>{selectedGuardian.name}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Vínculo Principal</label>
                <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: '0.95rem', marginTop: '0.2rem' }}>{selectedGuardian.relation || 'Apoderado Titular'}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Teléfono Directo</label>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', marginTop: '0.2rem' }}>{selectedGuardian.phone || 'No registrado'}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Correo Electrónico</label>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', marginTop: '0.2rem', wordBreak: 'break-all' }}>{selectedGuardian.email || 'No registrado'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', fontSize: '0.9rem', fontWeight: 800 }}>🎓 Estudiantes y Cursos Asignados:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Array.isArray(selectedGuardian.pupils) && selectedGuardian.pupils.length > 0 ? (
                  selectedGuardian.pupils.map((pupil: string, idx: number) => (
                    <div key={idx} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '8px', color: '#15803d', fontWeight: 800, fontSize: '0.85rem' }}>
                      🎓 {pupil}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No registra pupilos asignados activos.</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedGuardian(null)}
                style={{ background: '#cbd5e1', color: '#1e293b', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
