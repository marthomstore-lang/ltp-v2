import React, { useState, useEffect } from 'react';
import { UserCheck, Award, BookOpen, MessageSquare, ChevronRight, ChevronDown, User, Search, Clock, PenTool, AlertTriangle, AlertCircle, ShieldAlert, FileText, Printer, CheckCircle2 } from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';
import { SubmitStatementModal, PendingStatementItem } from './SubmitStatementModal';
import { ThermalReceiptPreviewModal, ThermalPassData } from './ThermalPassReceipt';

interface ApoderadoViewProps {
  token: string;
}

interface Grade {
  label: string;
  value: number;
  date?: string | null;
}

interface Subject {
  name: string;
  teacher: string;
  average: number;
  status: string;
  grades: Grade[];
}

interface RedGradeDetail {
  subjectName: string;
  teacher: string;
  gradeLabel: string;
  gradeValue: number;
  date?: string | null;
}

interface Observation {
  date: string;
  created_at?: string;
  type: string;
  detail: string;
  author: string;
}

const formatDateTime24h = (dateStr?: string, createdAtStr?: string) => {
  const target = createdAtStr || dateStr;
  if (!target) return { date: '-', time: '' };
  try {
    const d = new Date(target);
    if (isNaN(d.getTime())) return { date: String(target), time: '' };
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hours}:${minutes} hrs`;
    const hasTime = Boolean(createdAtStr || (dateStr && dateStr.includes('T') && !dateStr.endsWith('T00:00:00.000Z') && !dateStr.endsWith('T04:00:00.000Z')));
    return { date: dateFormatted, time: (createdAtStr || hasTime) ? timeFormatted : '' };
  } catch (_) {
    return { date: String(target), time: '' };
  }
};

const safeFormatPassDate = (dateVal?: any): string => {
  if (!dateVal) return '-';
  try {
    const str = String(dateVal).trim();
    const datePart = str.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch (_) {}
  return String(dateVal);
};

interface Interview {
  date: string;
  objective: string;
  status: string;
  agreement: string;
}

export const ApoderadoView: React.FC<ApoderadoViewProps> = ({ token }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pendingStatements, setPendingStatements] = useState<PendingStatementItem[]>([]);
  const [selectedStatementItem, setSelectedStatementItem] = useState<PendingStatementItem | null>(null);
  const [pupilos, setPupilos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPupiloId, setSelectedPupiloId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'grades' | 'observations' | 'interviews' | 'lates' | 'communications'>('grades');
  const [previewPass, setPreviewPass] = useState<ThermalPassData | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [searchRut, setSearchRut] = useState('');

  const fetchPendingStatements = () => {
    if (!token) return;
    fetch('/api/interviews/pending-statements', { credentials: 'omit', headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPendingStatements(data);
        }
      })
      .catch(err => console.error('Error cargando relatos pendientes:', err));
  };

  useEffect(() => {
    fetchPupilos();
    fetchPendingStatements();
    const interval = setInterval(fetchPendingStatements, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchPupilos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apoderado/pupilos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pupilos) && data.pupilos.length > 0) {
          setPupilos(data.pupilos);
          setSelectedPupiloId(data.pupilos[0].id);
        } else {
          setPupilos([]);
        }
      } else {
        setPupilos([]);
      }
    } catch (err) {
      console.error('Error al cargar pupilos:', err);
      setPupilos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPupilos = pupilos.filter(p => {
    if (!searchRut) return true;
    const cleanSearch = searchRut.replace(/\./g, '').trim().toLowerCase();
    const cleanRun = String(p.run || '').replace(/\./g, '').trim().toLowerCase();
    const nameMatch = String(p.fullName || '').toLowerCase().includes(cleanSearch);
    return cleanRun.includes(cleanSearch) || nameMatch;
  });

  const currentPupilo = pupilos.find(p => String(p.id) === String(selectedPupiloId)) || filteredPupilos[0] || pupilos[0] || null;

  const redGradesList: RedGradeDetail[] = React.useMemo(() => {
    if (!currentPupilo || !Array.isArray(currentPupilo.subjects)) return [];
    const list: RedGradeDetail[] = [];
    currentPupilo.subjects.forEach((sub: any) => {
      if (Array.isArray(sub.grades)) {
        sub.grades.forEach((g: any) => {
          const val = typeof g.value === 'number' ? g.value : parseFloat(g.value);
          if (!isNaN(val) && val > 0 && val < 4.0) {
            list.push({
              subjectName: sub.name,
              teacher: sub.teacher,
              gradeLabel: g.label || 'Evaluación Parcial',
              gradeValue: val,
              date: g.date || null
            });
          }
        });
      }
    });
    return list;
  }, [currentPupilo]);

  const uniquePasses = React.useMemo(() => {
    if (!currentPupilo || !Array.isArray(currentPupilo.passes)) return [];
    const map = new Map<string, any>();
    currentPupilo.passes.forEach((p: any) => {
      const key = String(p.id || p.folio);
      if (!map.has(key)) {
        map.set(key, p);
      }
    });
    return Array.from(map.values());
  }, [currentPupilo]);

  const totalLatesCount = React.useMemo(() => {
    return uniquePasses.filter((p: any) => String(p.pass_type || '').toLowerCase().includes('atraso')).length;
  }, [uniquePasses]);

  const unjustifiedLatesCount = React.useMemo(() => {
    return uniquePasses.filter((p: any) => String(p.pass_type || '').toLowerCase().includes('atraso') && String(p.status || '').toLowerCase().includes('injustificado')).length;
  }, [uniquePasses]);

  const justifiedLatesCount = React.useMemo(() => {
    return uniquePasses.filter((p: any) => String(p.pass_type || '').toLowerCase().includes('atraso') && String(p.status || '').toLowerCase().includes('justificado')).length;
  }, [uniquePasses]);

  const toggleSubject = (name: string) => {
    setExpandedSubjects(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* BANNER DE SOLICITUD DE RELATO DIGITAL PENDIENTE */}
      {pendingStatements.length > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          color: '#ffffff',
          padding: '0.85rem 1.25rem',
          borderRadius: '14px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 14px rgba(49, 46, 129, 0.25)',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={22} color="#fbbf24" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>Estimado Apoderado: Tiene {pendingStatements.length} solicitud de declaración / relato pendiente</span>
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  Plazo Activo
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '2px' }}>
                {pendingStatements[0]?.objective ? `"${pendingStatements[0].objective}" • ` : ''}
                Tiempo restante para guardar relato: <strong style={{ color: '#fbbf24' }}>{Math.max(0, Math.floor((pendingStatements[0]?.secondsRemaining || 0) / 60))} min</strong>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedStatementItem(pendingStatements[0])}
            style={{
              background: '#fbbf24',
              color: '#1e1b4b',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <PenTool size={16} /> Entregar Declaración y Firmar →
          </button>
        </div>
      )}

      {/* HEADER DE BIENVENIDA APODERADO */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '1.5rem', borderRadius: '16px', color: '#ffffff', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(49, 46, 129, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <img src="/logo.png" alt="LTP Logo" style={{ height: '40px', width: 'auto', borderRadius: '6px', background: '#ffffff', padding: '3px' }} />
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LICEO PRO — Portal Oficial de Apoderados
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.4rem 0 0.2rem 0' }}>
              Portal de Consulta Familiar y Notas
            </h1>
            <p style={{ fontSize: '0.875rem', opacity: 0.85, margin: '0 0 0.5rem 0' }}>
              Acceso a calificaciones, hoja de vida, citaciones y actas de tus pupilos asignados.
            </p>
            <button
              onClick={() => setShowProfileModal(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.4)',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <User size={15} /> Editar Mis Datos Personales
            </button>
          </div>

          {/* SELECTOR DE PUPILO CON BÚSQUEDA POR RUT */}
          {pupilos.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', minWidth: '290px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Seleccionar Pupil@ (Hijo/a):
              </label>
              <select
                value={selectedPupiloId}
                onChange={e => setSelectedPupiloId(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '8px', border: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', marginBottom: '0.4rem' }}
              >
                {filteredPupilos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} — {p.levelName} ({p.relacion}) [RUT: {p.run}]
                  </option>
                ))}
              </select>

              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar / Filtrar por RUT..."
                  value={searchRut}
                  onChange={e => setSearchRut(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem 0.35rem 1.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(255,255,255,0.95)',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '3rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
          Cargando información del estudiante desde la base de datos...
        </div>
      ) : !currentPupilo ? (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <UserCheck size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Sin Pupilos ni Calificaciones en la Base de Datos
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
            No se encontraron estudiantes matriculados ni calificaciones registradas en el servidor para este perfil.
          </p>
        </div>
      ) : (
        <>
          {/* BANNER / TARJETA DESTACADA DE ALERTA ACADÉMICA ROJA (NOTAS ROJAS 1.0 A 3.9) */}
          {redGradesList.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '12px',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(220, 38, 38, 0.35)'
                  }}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      Alerta Académica: Calificaciones Insuficientes ({redGradesList.length})
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600 }}>
                      Se han registrado evaluaciones con notas rojas (escala 1.0 a 3.9) para {currentPupilo.fullName}:
                    </p>
                  </div>
                </div>
                <span style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
                }}>
                  Reforzamiento Urgente
                </span>
              </div>

              {/* LISTADO DE NOTAS ROJAS DETALLADAS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {redGradesList.map((rg, idx) => (
                  <div key={idx} style={{
                    background: '#ffffff',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ flex: 1, marginRight: '0.75rem' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem', display: 'block' }}>
                        {rg.subjectName}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        <span style={{ fontWeight: 600, color: '#475569' }}>{rg.gradeLabel}</span>
                        {rg.date ? ` • ${formatDateTime24h(rg.date).date}` : ''}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        Docente: {rg.teacher}
                      </div>
                    </div>
                    <div style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1.5px solid #f87171',
                      borderRadius: '10px',
                      padding: '0.35rem 0.75rem',
                      fontWeight: 900,
                      fontSize: '1.25rem',
                      minWidth: '52px',
                      textAlign: 'center',
                      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.1)'
                    }}>
                      {rg.gradeValue.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TARJETA DE RESUMEN DEL PUPILO SELECCIONADO */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Estudiante</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{currentPupilo.fullName}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>RUN: {currentPupilo.run} | {currentPupilo.levelName}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tu Vinculación</div>
              <div style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 800 }}>
                {currentPupilo.relacion}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Prof. Jefe: {currentPupilo.profesorJefe}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Promedio General</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: currentPupilo.promedioGeneral >= 5.5 ? '#16a34a' : (currentPupilo.promedioGeneral > 0 ? '#2563eb' : '#64748b') }}>
                {currentPupilo.promedioGeneral > 0 ? currentPupilo.promedioGeneral.toFixed(1) : '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Asistencia Acumulada</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (typeof currentPupilo.asistencia === 'number' && currentPupilo.asistencia > 0) ? '#059669' : '#64748b' }}>
                {(typeof currentPupilo.asistencia === 'number' && currentPupilo.asistencia > 0) ? `${currentPupilo.asistencia}%` : '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Atrasos Inspectoría</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: unjustifiedLatesCount >= 3 ? '#dc2626' : totalLatesCount > 0 ? '#d97706' : '#16a34a' }}>
                {totalLatesCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: unjustifiedLatesCount >= 3 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                {unjustifiedLatesCount >= 3 ? '⚠️ Alerta Reincidencia' : `${justifiedLatesCount} justif. / ${unjustifiedLatesCount} inj.`}
              </div>
            </div>
          </div>

          {/* PESTAÑAS DE NAVEGACIÓN DEL APODERADO */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveSubTab('grades')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: activeSubTab === 'grades' ? '#4f46e5' : '#f1f5f9', color: activeSubTab === 'grades' ? '#ffffff' : '#64748b' }}
              >
                <BookOpen size={16} /> Libreta de Calificaciones
              </button>
              <button
                onClick={() => setActiveSubTab('observations')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: activeSubTab === 'observations' ? '#4f46e5' : '#f1f5f9', color: activeSubTab === 'observations' ? '#ffffff' : '#64748b' }}
              >
                <Award size={16} /> Hoja de Vida & Anotaciones ({(currentPupilo.observations || []).length})
              </button>
              <button
                onClick={() => setActiveSubTab('interviews')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: activeSubTab === 'interviews' ? '#4f46e5' : '#f1f5f9', color: activeSubTab === 'interviews' ? '#ffffff' : '#64748b' }}
              >
                <MessageSquare size={16} /> Actas y Citaciones ({(currentPupilo.interviews || []).length})
              </button>
              <button
                onClick={() => setActiveSubTab('lates')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  background: activeSubTab === 'lates' ? '#4f46e5' : '#f1f5f9',
                  color: activeSubTab === 'lates' ? '#ffffff' : '#64748b'
                }}
              >
                <Clock size={16} /> Pases & Atrasos ({uniquePasses.length})
                {unjustifiedLatesCount >= 3 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    Alerta
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('communications')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  background: activeSubTab === 'communications' ? '#4f46e5' : '#f1f5f9',
                  color: activeSubTab === 'communications' ? '#ffffff' : '#64748b'
                }}
              >
                📢 Comunicados Oficiales ({(currentPupilo.communications || []).length})
              </button>
            </div>

            {/* CONTENIDO TAB 1: LIBRETA DE CALIFICACIONES DEL PUPILO */}
            {activeSubTab === 'grades' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                  Detalle de Calificaciones por Asignatura — 1er Semestre 2026
                </h3>

                {redGradesList.length > 0 ? (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    color: '#991b1b',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}>
                    <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                    <span>
                      Atención: El estudiante registra <strong>{redGradesList.length} calificación(es) insuficiente(s)</strong> (notas bajo 4.0) en las evaluaciones parciales. Se sugiere coordinar apoyo pedagógico con los docentes correspondientes.
                    </span>
                  </div>
                ) : (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    color: '#166534',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}>
                    <ShieldAlert size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                    <span>
                      Excelente: El estudiante no registra calificaciones insuficientes (todas sus evaluaciones parciales registradas son iguales o superiores a 4.0).
                    </span>
                  </div>
                )}

                {(!currentPupilo.subjects || currentPupilo.subjects.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px', fontWeight: 600 }}>
                    Sin asignaturas ni calificaciones ingresadas en la base de datos.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ASIGNATURA</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>DOCENTE RESPONSABLE</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>PROMEDIO</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>ESTADO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPupilo.subjects.map((sub: Subject, idx: number) => {
                          const isExpanded = !!expandedSubjects[sub.name];
                          const isRed = sub.status === 'REPROBADO';
                          return (
                            <React.Fragment key={idx}>
                              <tr
                                onClick={() => toggleSubject(sub.name)}
                                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#ffffff' }}
                              >
                                <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  {isExpanded ? <ChevronDown size={16} color="#4f46e5" /> : <ChevronRight size={16} color="#94a3b8" />}
                                  {sub.name}
                                </td>
                                <td style={{ padding: '0.8rem 1rem', color: '#64748b' }}>{sub.teacher}</td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'center', fontWeight: 800, fontSize: '1.05rem', color: isRed ? '#dc2626' : (sub.average > 0 ? '#16a34a' : '#64748b') }}>
                                  {sub.average > 0 ? sub.average.toFixed(1) : '-'}
                                </td>
                                <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                                  <span style={{ background: isRed ? '#fee2e2' : (sub.status === 'APROBADO' ? '#dcfce7' : '#f1f5f9'), color: isRed ? '#991b1b' : (sub.status === 'APROBADO' ? '#15803d' : '#64748b'), padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 }}>
                                    {sub.status}
                                  </span>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <td colSpan={4} style={{ padding: '0.75rem 1.25rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                                      Calificaciones Parciales Ingresadas:
                                    </div>
                                    {(!sub.grades || sub.grades.length === 0) ? (
                                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin calificaciones parciales en esta asignatura.</div>
                                    ) : (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        {sub.grades.map((gr: Grade, gIdx: number) => (
                                          <div key={gIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.75rem', textAlign: 'center', minWidth: '80px' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>{gr.label}</div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: gr.value >= 4.0 ? '#2563eb' : '#dc2626' }}>
                                              {gr.value.toFixed(1)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CONTENIDO TAB 2: HOJA DE VIDA Y ANOTACIONES */}
            {activeSubTab === 'observations' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                  Anotaciones de Convivencia y Conducta
                </h3>
                {(!currentPupilo.observations || currentPupilo.observations.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    El estudiante no registra observaciones en la hoja de vida.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {currentPupilo.observations.map((obs: Observation, idx: number) => {
                      const dt = formatDateTime24h(obs.date, obs.created_at);
                      return (
                        <div key={idx} style={{ background: obs.type === 'Positiva' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${obs.type === 'Positiva' ? '#bbf7d0' : '#fecaca'}`, borderRadius: '10px', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: obs.type === 'Positiva' ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              Anotación {obs.type} — {dt.date} {dt.time && <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.85 }}>({dt.time})</span>}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Registrado por: {obs.author}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>{obs.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CONTENIDO TAB 3: ACTAS Y REUNIONES */}
            {activeSubTab === 'interviews' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                  Actas de Entrevistas y Compromisos Familiares
                </h3>
                {(!currentPupilo.interviews || currentPupilo.interviews.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No existen citaciones o entrevistas registradas previamente.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {currentPupilo.interviews.map((it: Interview, idx: number) => {
                      const dt = formatDateTime24h(it.date);
                      return (
                        <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                              {it.objective}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#4338ca', background: '#e0e7ff', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              🗓️ {dt.date} {dt.time ? `• ⏰ ${dt.time}` : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.3rem' }}>
                            <strong>Acuerdo Institucional:</strong> {it.agreement}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* CONTENIDO TAB 4: ATRASOS Y PASES DE INSPECTORÍA DEL PUPILO */}
            {activeSubTab === 'lates' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                      Registro Oficial de Atrasos y Pases de Inspectoría — Período 2026
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Control oficial de ingreso a la jornada y entrega de pases impresos para {currentPupilo.fullName}.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#475569', background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '8px', fontWeight: 700 }}>
                      🏛️ Inspectoría General
                    </span>
                  </div>
                </div>

                {/* KPI CARDS RESUMEN ATRASOS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Atrasos</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalLatesCount > 0 ? '#1e293b' : '#16a34a', marginTop: '0.2rem' }}>
                      {totalLatesCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Registrados en el año</div>
                  </div>

                  <div style={{ background: unjustifiedLatesCount >= 3 ? '#fff1f2' : '#f8fafc', border: `1px solid ${unjustifiedLatesCount >= 3 ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: unjustifiedLatesCount >= 3 ? '#dc2626' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Injustificados</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: unjustifiedLatesCount >= 3 ? '#dc2626' : '#d97706', marginTop: '0.2rem' }}>
                      {unjustifiedLatesCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: unjustifiedLatesCount >= 3 ? '#dc2626' : '#64748b', fontWeight: 700, marginTop: '0.2rem' }}>
                      {unjustifiedLatesCount >= 3 ? '⚠️ Umbral de citación superado' : 'Sin citación requerida'}
                    </div>
                  </div>

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Justificados</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
                      {justifiedLatesCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '0.2rem' }}>Con respaldo formal</div>
                  </div>
                </div>

                {/* BANNER DE ALERTA FORMATIVA POR REINCIDENCIA (>= 3 ATRASOS INJUSTIFICADOS) */}
                {unjustifiedLatesCount >= 3 && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
                    border: '2px solid #ef4444',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                  }}>
                    <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.85rem', color: '#991b1b', lineHeight: '1.4' }}>
                      <strong style={{ display: 'block', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                        Alerta de Reincidencia en Atrasos ({unjustifiedLatesCount} eventos injustificados)
                      </strong>
                      Estimado apoderado: Su pupilo acumula 3 o más atrasos no justificados en el presente período lectivo. Conforme al Reglamento Interno y de Convivencia Escolar (RICE), la reiteración de atrasos requiere entrevista con el apoderado para establecer un plan de compromiso de puntualidad.
                    </div>
                  </div>
                )}

                {/* TABLA DE PASES REGISTRADOS */}
                {uniquePasses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <CheckCircle2 size={42} color="#16a34a" style={{ margin: '0 auto 0.75rem auto' }} />
                    <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                      Sin Atrasos Registrados
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      El estudiante no registra ingresos atrasados ni pases emitidos por Inspectoría. ¡Felicitaciones por la puntualidad!
                    </p>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>FOLIO / TIPO</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>FECHA Y HORA</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>MOTIVO REGISTRADO</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>CONDICIÓN</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>INSPECTORÍA</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>VOUCHER OFICIAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniquePasses.map((p: any, idx: number) => {
                          const isJustified = String(p.status || '').toLowerCase() === 'justificado';
                          return (
                            <tr key={p.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ fontWeight: 800, color: '#4338ca', fontSize: '0.85rem' }}>
                                  #{String(p.folio || p.id).padStart(5, '0')}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                  {p.pass_type || 'ATRASO'}
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                  {safeFormatPassDate(p.pass_date)}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                                  <Clock size={12} color="#94a3b8" /> {String(p.pass_time || '08:15').slice(0, 5)} hrs
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <div style={{ fontWeight: 700, color: '#1e293b' }}>
                                  {p.reason || 'Sin motivo detallado'}
                                </div>
                                {p.justification_detail && (
                                  <div style={{ fontSize: '0.74rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                                    Nota: {p.justification_detail}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  background: isJustified ? '#dcfce7' : '#fee2e2',
                                  color: isJustified ? '#15803d' : '#b91c1c',
                                  border: `1px solid ${isJustified ? '#86efac' : '#fca5a5'}`
                                }}>
                                  {isJustified ? '✓ Justificado' : '✗ Injustificado'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                                👤 {p.inspector_name || 'Inspector de Turno'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    const previewData: ThermalPassData = {
                                      id: String(p.id),
                                      folio: Number(p.folio || p.id || 1),
                                      student_id: String(p.student_id || currentPupilo.id || ''),
                                      student_name: p.student_name || currentPupilo.fullName,
                                      student_run: p.student_run || currentPupilo.run,
                                      course_name: p.course_name || currentPupilo.levelName,
                                      pass_date: p.pass_date,
                                      pass_time: p.pass_time || '08:15',
                                      pass_type: p.pass_type || 'ATRASO',
                                      reason: p.reason,
                                      status: p.status || 'INJUSTIFICADO',
                                      inspector_name: p.inspector_name || 'Inspectoría General',
                                      monthlyLatesCount: totalLatesCount || 1,
                                      yearlyLatesCount: totalLatesCount || 1,
                                      justification_detail: p.justification_detail
                                    };
                                    setPreviewPass(previewData);
                                  }}
                                  style={{
                                    background: '#e0e7ff',
                                    color: '#4338ca',
                                    border: '1px solid #c7d2fe',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.65rem',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                  title="Ver boucher térmico oficial Epson TM-T20II"
                                >
                                  <Printer size={13} /> Ver Voucher
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CONTENIDO TAB 5: COMUNICADOS OFICIALES DEL LICEO Y DEL CURSO */}
            {activeSubTab === 'communications' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  📢 Comunicados Oficiales y Circulares — {currentPupilo.levelName} & Liceo
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: 0, marginBottom: '1.1rem' }}>
                  Aquí se muestran todas las comunicaciones oficiales enviadas por Dirección, UTP, Inspectoría o Jefatura de Curso tanto a nivel de <strong>{currentPupilo.levelName}</strong> como masivas a todo el establecimiento.
                </p>

                {(!currentPupilo.communications || currentPupilo.communications.length === 0) ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2.5rem 1.5rem',
                    color: '#64748b',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px dashed #cbd5e1',
                    fontWeight: 600
                  }}>
                    📭 No hay comunicados oficiales registrados para este curso en este momento.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {currentPupilo.communications.map((comm: any, idx: number) => {
                      const dt = formatDateTime24h(comm.created_at, comm.created_at);
                      const isUrgent = String(comm.title || '').includes('🚨') || String(comm.message || '').includes('URGENTE');
                      const isImportant = String(comm.title || '').includes('⚠️') || String(comm.message || '').includes('IMPORTANTE');
                      return (
                        <div
                          key={comm.id || idx}
                          style={{
                            background: isUrgent ? '#fef2f2' : isImportant ? '#fffbeb' : '#f8fafc',
                            border: `1px solid ${isUrgent ? '#fca5a5' : isImportant ? '#fde68a' : '#e2e8f0'}`,
                            borderLeft: `5px solid ${isUrgent ? '#dc2626' : isImportant ? '#d97706' : '#4f46e5'}`,
                            borderRadius: '12px',
                            padding: '1.1rem 1.25rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{
                                background: comm.scope === 'Masivo Liceo' ? '#dbeafe' : '#e0e7ff',
                                color: comm.scope === 'Masivo Liceo' ? '#1e40af' : '#3730a3',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '999px'
                              }}>
                                {comm.scope === 'Masivo Liceo' ? '🌐 Comunicado General Liceo' : `🏫 Curso ${comm.scope}`}
                              </span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                                {comm.title}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700 }}>
                              📅 {dt.date} {dt.time ? `• ${dt.time}` : ''}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.86rem',
                            color: '#334155',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-line',
                            background: '#ffffff',
                            padding: '0.85rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                          }}>
                            {comm.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </>
      )}

      {showProfileModal && (
        <UserProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* MODAL VISTA PREVIA / REIMPRESIÓN VOUCHER EPSON TM-T20II */}
      {previewPass && (
        <ThermalReceiptPreviewModal
          pass={previewPass}
          onClose={() => setPreviewPass(null)}
        />
      )}

      {/* MODAL REDACTAR Y FIRMAR RELATO DIGITAL */}
      {selectedStatementItem && (
        <SubmitStatementModal
          item={selectedStatementItem}
          token={token || ''}
          onClose={() => setSelectedStatementItem(null)}
          onSubmitted={() => {
            setSelectedStatementItem(null);
            fetchPendingStatements();
          }}
        />
      )}
    </div>
  );
};

export default ApoderadoView;
