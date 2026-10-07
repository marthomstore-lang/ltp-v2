import React, { useState, useEffect } from 'react';
import { Shield, X, Save, RefreshCw, Plus, Eye, Edit3 } from 'lucide-react';
import Swal from 'sweetalert2';
import { FUNCTION_ID_TO_PATH, AccessLevel, normalizeAccessLevel } from '../utils/urlRouter';

interface PermissionsMatrixProps {
  token: string;
}

export interface PermissionRow {
  functionId: string;
  functionName: string;
  Admin: AccessLevel;
  Director: AccessLevel;
  Docente: AccessLevel;
  Asistente: AccessLevel;
  Profesionales: AccessLevel;
  Comunicaciones: AccessLevel;
  Estudiante: AccessLevel;
  Apoderado: AccessLevel;
}

type RoleKey = 'Admin' | 'Director' | 'Docente' | 'Asistente' | 'Profesionales' | 'Comunicaciones' | 'Estudiante' | 'Apoderado';

const OBSOLETE_PERMISSION_IDS = new Set([
  'enrollment_docs_gen',
  'enrollment_config',
  'pie_sep_health',
  'personality',
  'jefatura_report',
  'course_support',
  'student_checklists',
  'password_assist',
  'semester_locks'
]);

export const DEFAULT_PERMISSIONS_MATRIX: PermissionRow[] = [
  { functionId: 'dashboard', functionName: 'Dashboard General & KPIs / Portal', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'view', Profesionales: 'view', Comunicaciones: 'view', Estudiante: 'view', Apoderado: 'view' },
  { functionId: 'enrollment', functionName: 'Matrícula Completa MINEDUC/FIDE (Ficha, Checklists y Salud/PIE)', Admin: 'edit', Director: 'edit', Docente: 'view', Asistente: 'view', Profesionales: 'view', Comunicaciones: 'view', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'apoderados', functionName: 'Nómina & Registro Institucional de Apoderados', Admin: 'edit', Director: 'edit', Docente: 'view', Asistente: 'view', Profesionales: 'view', Comunicaciones: 'view', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'communications', functionName: 'Centro de Comunicaciones y Registro de Envíos (¿A quién se envió?)', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'view', Profesionales: 'edit', Comunicaciones: 'edit', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'grades', functionName: 'Libro de Calificaciones Ponderadas', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'none', Profesionales: 'view', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'overview', functionName: 'Panorama de Notas & Reporte de Jefatura', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'view', Profesionales: 'view', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'computer_lab', functionName: 'Reserva Sala de Computación & Horarios', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'edit', Profesionales: 'edit', Comunicaciones: 'view', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'evaluations_pie', functionName: 'Portal de Evaluaciones & Integración PIE', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'view', Profesionales: 'edit', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'mineduc_reports', functionName: 'Informes y Formularios Únicos MINEDUC (Dec. 170)', Admin: 'edit', Director: 'view', Docente: 'view', Asistente: 'view', Profesionales: 'edit', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'interviews', functionName: 'Actas de Entrevistas & Compromisos', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'view', Profesionales: 'edit', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'observations', functionName: 'Hoja de Vida & Anotaciones RICE', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'edit', Profesionales: 'edit', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'inspector_passes', functionName: 'Control de Atrasos & Pases de Inspectoría', Admin: 'edit', Director: 'edit', Docente: 'view', Asistente: 'edit', Profesionales: 'view', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'pedagogical_trips', functionName: 'Salidas Pedagógicas & Autorizaciones', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'view', Profesionales: 'edit', Comunicaciones: 'view', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'hr_staff', functionName: 'Recursos Humanos & Idoneidad', Admin: 'edit', Director: 'view', Docente: 'none', Asistente: 'none', Profesionales: 'none', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'admin_docs', functionName: 'Documentos & Protocolos Institucionales', Admin: 'edit', Director: 'edit', Docente: 'view', Asistente: 'view', Profesionales: 'view', Comunicaciones: 'view', Estudiante: 'view', Apoderado: 'view' },
  { functionId: 'library', functionName: 'Biblioteca CRA', Admin: 'edit', Director: 'edit', Docente: 'view', Asistente: 'edit', Profesionales: 'view', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'permissions', functionName: 'Matriz de Permisos RBAC', Admin: 'edit', Director: 'none', Docente: 'none', Asistente: 'none', Profesionales: 'none', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'config', functionName: 'Ajustes y Configuración del Sistema (13 Sub-ventanas)', Admin: 'edit', Director: 'none', Docente: 'none', Asistente: 'none', Profesionales: 'none', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'audit_logs', functionName: 'Auditoría Silent-Watch', Admin: 'view', Director: 'none', Docente: 'none', Asistente: 'none', Profesionales: 'none', Comunicaciones: 'none', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'course_messaging', functionName: 'Herramienta Superior: Comunicar a Curso (Mensajería Docente)', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'none', Profesionales: 'edit', Comunicaciones: 'edit', Estudiante: 'none', Apoderado: 'none' },
  { functionId: 'multiview', functionName: 'Herramienta Superior: Multivista QR Dual Screen', Admin: 'edit', Director: 'edit', Docente: 'edit', Asistente: 'view', Profesionales: 'view', Comunicaciones: 'view', Estudiante: 'none', Apoderado: 'none' }
];

const ROLES_LIST: { key: RoleKey; label: string }[] = [
  { key: 'Admin', label: '🛡️ Administrador' },
  { key: 'Director', label: '🎓 Director' },
  { key: 'Docente', label: '👨‍🏫 Profesor' },
  { key: 'Asistente', label: '🤝 Asistente' },
  { key: 'Profesionales', label: '🩺 Profesionales' },
  { key: 'Comunicaciones', label: '📢 Comunicaciones' },
  { key: 'Estudiante', label: '🎓 Estudiante' },
  { key: 'Apoderado', label: '👨‍👩‍👧 Apoderado' },
];

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({ token }) => {
  const cleanHtmlEntities = (str: string): string => {
    if (!str) return '';
    let res = str;
    for (let i = 0; i < 5; i++) {
      if (!res.includes('&amp;') && !res.includes('&#x2F;') && !res.includes('&lt;') && !res.includes('&gt;')) break;
      res = res.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
    return res;
  };

  const [matrix, setMatrix] = useState<PermissionRow[]>(() =>
    DEFAULT_PERMISSIONS_MATRIX.map(r => ({ ...r }))
  );

  const [saving, setSaving] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');

  useEffect(() => {
    fetch('/api/permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const byId = new Map<string, any>();
          data.forEach((row: any) => {
            if (!row || !row.functionId || OBSOLETE_PERMISSION_IDS.has(row.functionId)) return;
            byId.set(row.functionId, {
              ...row,
              functionName: cleanHtmlEntities(row.functionName),
            });
          });

          const canonicalIds = new Set(DEFAULT_PERMISSIONS_MATRIX.map(r => r.functionId));
          const merged: PermissionRow[] = DEFAULT_PERMISSIONS_MATRIX.map(def => {
            const saved = byId.get(def.functionId);
            if (!saved) return { ...def };
            return {
              functionId: def.functionId,
              functionName: def.functionName,
              Admin: def.functionId === 'permissions' ? 'edit' : normalizeAccessLevel(saved.Admin, def.Admin),
              Director: normalizeAccessLevel(saved.Director, def.Director),
              Docente: normalizeAccessLevel(saved.Docente, def.Docente),
              Asistente: normalizeAccessLevel(saved.Asistente, def.Asistente),
              Profesionales: normalizeAccessLevel(saved.Profesionales, def.Profesionales),
              Comunicaciones: normalizeAccessLevel(saved.Comunicaciones, def.Comunicaciones),
              Estudiante: def.functionId === 'permissions' ? 'none' : normalizeAccessLevel(saved.Estudiante, def.Estudiante),
              Apoderado: def.functionId === 'permissions' ? 'none' : normalizeAccessLevel(saved.Apoderado, def.Apoderado),
            };
          });

          byId.forEach((row, id) => {
            if (!canonicalIds.has(id)) {
              merged.push({
                functionId: row.functionId,
                functionName: row.functionName,
                Admin: normalizeAccessLevel(row.Admin, 'edit'),
                Director: normalizeAccessLevel(row.Director, 'none'),
                Docente: normalizeAccessLevel(row.Docente, 'none'),
                Asistente: normalizeAccessLevel(row.Asistente, 'none'),
                Profesionales: normalizeAccessLevel(row.Profesionales, 'none'),
                Comunicaciones: normalizeAccessLevel(row.Comunicaciones, 'none'),
                Estudiante: normalizeAccessLevel(row.Estudiante, 'none'),
                Apoderado: normalizeAccessLevel(row.Apoderado, 'none'),
              });
            }
          });

          setMatrix(merged);
        }
      })
      .catch(err => console.error(err));
  }, [token]);

  const cyclePermission = (idx: number, role: RoleKey) => {
    const row = matrix[idx];
    // Protección vital: Admin no puede bloquearse a sí mismo de la Matriz de Permisos
    if (role === 'Admin' && row.functionId === 'permissions') {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'El Administrador debe mantener siempre Edición en la Matriz de Permisos',
        timer: 2200,
        showConfirmButton: false
      });
      return;
    }
    // Protección vital: Apoderado y Estudiante jamás pueden acceder a la gestión de permisos
    if ((role === 'Apoderado' || role === 'Estudiante') && row.functionId === 'permissions') {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Los apoderados y estudiantes no pueden tener acceso a la Matriz de Permisos',
        timer: 2200,
        showConfirmButton: false
      });
      return;
    }

    // Ciclo de 3 estados: Edición ('edit') -> Solo Vista ('view') -> Bloqueado ('none') -> Edición ('edit')
    const current = normalizeAccessLevel(row[role], 'none');
    const next: AccessLevel = current === 'edit' ? 'view' : current === 'view' ? 'none' : 'edit';

    const updated = [...matrix];
    updated[idx] = { ...updated[idx], [role]: next };
    setMatrix(updated);
  };

  const handleResetDefaults = () => {
    Swal.fire({
      title: '¿Restablecer Permisos Institucionales (3 Niveles)?',
      text: 'Se aplicará la configuración recomendada por perfil (Edición, Solo Vista y Bloqueado), incluyendo Solo Vista en Matrícula para Asistentes y Profesores.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Sí, Restablecer',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        setMatrix(DEFAULT_PERMISSIONS_MATRIX.map(r => ({ ...r })));
        Swal.fire('Restablecido', 'Valores institucionales recomendados cargados. Haz clic en "Guardar Permisos" para sincronizar.', 'info');
      }
    });
  };

  const handleAddFunction = () => {
    if (!newFunctionName.trim()) return;
    const newId = `func_${Date.now()}`;
    const newRow: PermissionRow = {
      functionId: newId,
      functionName: newFunctionName.trim(),
      Admin: 'edit',
      Director: 'none',
      Docente: 'none',
      Asistente: 'none',
      Profesionales: 'none',
      Comunicaciones: 'none',
      Estudiante: 'none',
      Apoderado: 'none'
    };
    setMatrix(prev => [...prev, newRow]);
    setNewFunctionName('');
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Función "${newFunctionName}" agregada a la matriz`, timer: 1500, showConfirmButton: false });
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ matrix })
      });
      if (!res.ok) throw new Error('Error al guardar la matriz');
      const data = await res.json().catch(() => ({}));
      const savedMatrix = Array.isArray(data?.matrix) ? data.matrix : matrix;
      setMatrix(savedMatrix);
      window.dispatchEvent(new CustomEvent('ltp_permissions_updated', { detail: savedMatrix }));
      Swal.fire('Guardado', 'Matriz de permisos por perfil (Edición / Solo Vista / Bloqueado) actualizada exitosamente', 'success');
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderLevelButton = (idx: number, role: RoleKey, rawVal: any) => {
    const level = normalizeAccessLevel(rawVal, 'none');
    if (level === 'edit') {
      return (
        <button
          onClick={() => cyclePermission(idx, role)}
          title="Nivel actual: Edición Completa. Haz clic para cambiar a Solo Vista."
          style={{
            border: '1px solid #86efac',
            background: '#dcfce7',
            color: '#15803d',
            padding: '0.38rem 0.75rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.74rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          <Edit3 size={13} /> Edición
        </button>
      );
    }
    if (level === 'view') {
      return (
        <button
          onClick={() => cyclePermission(idx, role)}
          title="Nivel actual: Solo Vista (Lectura e Impresión). Haz clic para cambiar a Bloqueado."
          style={{
            border: '1px solid #93c5fd',
            background: '#dbeafe',
            color: '#1d4ed8',
            padding: '0.38rem 0.75rem',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.74rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease'
          }}
        >
          <Eye size={13} /> Solo Vista
        </button>
      );
    }
    return (
      <button
        onClick={() => cyclePermission(idx, role)}
        title="Nivel actual: Bloqueado (Sin Acceso). Haz clic para cambiar a Edición."
        style={{
          border: '1px solid #fecdd3',
          background: '#fee2e2',
          color: '#be123c',
          padding: '0.38rem 0.75rem',
          borderRadius: '9999px',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.74rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease'
        }}
      >
        <X size={13} /> Bloqueado
      </button>
    );
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={24} color="#4f46e5" /> Matriz de Perfiles y Niveles de Acceso (Edición / Solo Vista / Bloqueado)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Haz clic sobre cualquier botón para alternar entre los 3 niveles de permiso por perfil en cada ventana oficial.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleResetDefaults} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <RefreshCw size={15} /> Restablecer Recomendados
          </button>
          <button onClick={handleSaveMatrix} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Permisos'}
          </button>
        </div>
      </div>

      {/* LEYENDA DE LOS 3 NIVELES DE PERFIL */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.85rem',
        padding: '0.75rem 1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        marginBottom: '1.25rem',
        fontSize: '0.8rem',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: 800, color: '#334155' }}>Niveles de Perfil:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 10px', borderRadius: '9999px', fontWeight: 700 }}>
          <Edit3 size={12} /> Edición: Ver, crear, modificar y eliminar
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', padding: '2px 10px', borderRadius: '9999px', fontWeight: 700 }}>
          <Eye size={12} /> Solo Vista: Consultar, buscar e imprimir (sin editar)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fee2e2', color: '#be123c', border: '1px solid #fecdd3', padding: '2px 10px', borderRadius: '9999px', fontWeight: 700 }}>
          <X size={12} /> Bloqueado: Oculto en el menú y sin acceso
        </span>
      </div>

      {/* AGREGAR NUEVA FUNCIÓN DINÁMICA */}
      <div style={{ background: '#f8fafc', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <input
          type="text"
          value={newFunctionName}
          onChange={e => setNewFunctionName(e.target.value)}
          placeholder="Nombre de nueva función/ventana a incorporar a la matriz..."
          style={{ flex: 1, padding: '0.55rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
        />
        <button onClick={handleAddFunction} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Incorporar Función
        </button>
      </div>

      {/* TABLA DE MATRIZ DE PERMISOS */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Función / Ventana de la Aplicación</th>
              {ROLES_LIST.map(r => (
                <th key={r.key} style={{ textAlign: 'center' }}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, idx) => {
              const pathBadge = FUNCTION_ID_TO_PATH[row.functionId];
              return (
                <tr key={row.functionId || idx}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <strong>{row.functionName}</strong>
                      {pathBadge && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontFamily: pathBadge.startsWith('/') ? 'monospace' : 'inherit',
                          color: pathBadge.startsWith('/') ? '#4f46e5' : '#0284c7',
                          background: pathBadge.startsWith('/') ? '#eef2ff' : '#e0f2fe',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          width: 'fit-content',
                          fontWeight: 600
                        }}>
                          {pathBadge.startsWith('/') ? `🔗 ${pathBadge}` : `⚡ ${pathBadge}`}
                        </span>
                      )}
                    </div>
                  </td>
                  {ROLES_LIST.map(r => (
                    <td key={r.key} style={{ textAlign: 'center' }}>
                      {renderLevelButton(idx, r.key, row[r.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
