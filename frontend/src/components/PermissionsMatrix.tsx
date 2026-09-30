import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Save, RefreshCw, Plus, Filter } from 'lucide-react';
import Swal from 'sweetalert2';

interface PermissionsMatrixProps {
  token: string;
}

export interface PermissionRow {
  functionId: string;
  functionName: string;
  Admin: boolean;
  Director: boolean;
  Docente: boolean;
  Asistente: boolean;
  Profesionales: boolean;
  Estudiante: boolean;
  Apoderado: boolean;
}

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

  const [matrix, setMatrix] = useState<PermissionRow[]>([
    { functionId: 'dashboard', functionName: 'Dashboard General & KPIs / Portal', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: true, Apoderado: true },
    { functionId: 'enrollment', functionName: 'Matrícula Completa MINEDUC/FIDE', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'apoderados', functionName: 'Nómina & Registro Institucional de Apoderados', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'enrollment_docs_gen', functionName: 'Generador de Ficha de Matrícula & Compromiso', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'enrollment_config', functionName: 'Configuración de Texto de Compromiso & Ficha', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'pie_sep_health', functionName: 'Programa PIE / SEP & Salud Estudiantil', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'grades', functionName: 'Libro de Calificaciones Ponderadas', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'overview', functionName: 'Panorama de Notas & Rendimiento', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'computer_lab', functionName: 'Reserva Sala de Computación & Horarios', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'evaluations_pie', functionName: 'Portal de Evaluaciones & Integración PIE', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'mineduc_reports', functionName: 'Informes y Formularios Únicos MINEDUC (Dec. 170)', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'interviews', functionName: 'Actas de Entrevistas & Compromisos', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'multiview', functionName: 'Multivista QR Dual Screen', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'observations', functionName: 'Hoja de Vida & Anotaciones RICE', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'inspector_passes', functionName: 'Control de Atrasos & Pases de Inspectoría', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'hr_staff', functionName: 'Recursos Humanos & Idoneidad', Admin: true, Director: true, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'admin_docs', functionName: 'Documentos & Protocolos', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: true, Apoderado: true },
    { functionId: 'personality', functionName: 'Informes de Desarrollo Personal', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'library', functionName: 'Biblioteca CRA', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'jefatura_report', functionName: 'Reporte de Jefatura & Análisis de Curso', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'course_support', functionName: 'Gestión de Apoyo y Profesionales del Curso (PIE)', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'student_checklists', functionName: 'Control Documental & Checklists (Retiro y Matrícula)', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'course_messaging', functionName: 'Comunicación Focalizada a Docentes por Curso', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: true, Estudiante: false, Apoderado: false },
    { functionId: 'config', functionName: 'Ajustes y Configuración del Sistema (13 Sub-ventanas)', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'permissions', functionName: 'Matriz de Permisos RBAC', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'password_assist', functionName: 'Asistencia de Claves Administrador', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'semester_locks', functionName: 'Cierre y Bloqueo Semestral', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
    { functionId: 'audit_logs', functionName: 'Auditoría Silent-Watch', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false }
  ]);

  const [saving, setSaving] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');

  useEffect(() => {
    fetch('/api/permissions', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const sanitized = data.map((row: any) => ({
            ...row,
            functionName: cleanHtmlEntities(row.functionName),
            Director: row.Director !== undefined ? Boolean(row.Director) : (row.functionId !== 'password_assist' && row.functionId !== 'semester_locks' && row.functionId !== 'audit_logs' && row.functionId !== 'enrollment_config')
          }));

          // Incorporar automáticamente funciones nuevas del sistema que no existían en versiones previas
          setMatrix(prev => {
            const existingIds = new Set(sanitized.map((r: any) => r.functionId));
            const missing = prev.filter(r => !existingIds.has(r.functionId));
            return [...sanitized, ...missing];
          });
        }
      })
      .catch(err => console.error(err));
  }, [token]);

  const togglePermission = (idx: number, role: 'Admin' | 'Director' | 'Docente' | 'Asistente' | 'Profesionales' | 'Estudiante' | 'Apoderado') => {
    // Protección vital: Admin no puede bloquearse a sí mismo de la Matriz de Permisos
    if (role === 'Admin' && matrix[idx].functionId === 'permissions') {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'El Administrador debe mantener siempre acceso a la Matriz de Permisos',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    // Protección vital: Apoderado y Estudiante jamás pueden acceder a la gestión de permisos
    if ((role === 'Apoderado' || role === 'Estudiante') && matrix[idx].functionId === 'permissions') {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'Los apoderados y estudiantes no pueden tener acceso a la Matriz de Permisos',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }
    const updated = [...matrix];
    updated[idx][role] = !updated[idx][role];
    setMatrix(updated);
  };

  const handleResetDefaults = () => {
    Swal.fire({
      title: '¿Restablecer Permisos Institucionales?',
      text: 'Se aplicará la configuración recomendada del establecimiento con acceso directivo para Director y permisos pedagógicos para Profesores y Asistentes.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Sí, Restablecer',
      cancelButtonText: 'Cancelar'
    }).then((res) => {
      if (res.isConfirmed) {
        const defaultMatrix: PermissionRow[] = [
          { functionId: 'dashboard', functionName: 'Dashboard General & KPIs / Portal', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: true, Apoderado: true },
          { functionId: 'enrollment', functionName: 'Matrícula Completa MINEDUC/FIDE', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'apoderados', functionName: 'Nómina & Registro Institucional de Apoderados', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'enrollment_docs_gen', functionName: 'Generador de Ficha de Matrícula & Compromiso', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'enrollment_config', functionName: 'Configuración de Texto de Compromiso & Ficha', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'pie_sep_health', functionName: 'Programa PIE / SEP & Salud Estudiantil', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'grades', functionName: 'Libro de Calificaciones Ponderadas', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'overview', functionName: 'Panorama de Notas & Rendimiento', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'computer_lab', functionName: 'Reserva Sala de Computación & Horarios', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'evaluations_pie', functionName: 'Portal de Evaluaciones & Integración PIE', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'mineduc_reports', functionName: 'Informes y Formularios Únicos MINEDUC (Dec. 170)', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'interviews', functionName: 'Actas de Entrevistas & Compromisos', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'multiview', functionName: 'Multivista QR Dual Screen', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'observations', functionName: 'Hoja de Vida & Anotaciones RICE', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'inspector_passes', functionName: 'Control de Atrasos & Pases de Inspectoría', Admin: true, Director: true, Docente: false, Asistente: true, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'hr_staff', functionName: 'Recursos Humanos & Idoneidad', Admin: true, Director: true, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'admin_docs', functionName: 'Documentos & Protocolos', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: true, Apoderado: true },
          { functionId: 'personality', functionName: 'Informes de Desarrollo Personal', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'library', functionName: 'Biblioteca CRA', Admin: true, Director: true, Docente: true, Asistente: true, Profesionales: true, Estudiante: false, Apoderado: false },
          { functionId: 'jefatura_report', functionName: 'Reporte de Jefatura & Análisis de Curso', Admin: true, Director: true, Docente: true, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'config', functionName: 'Ajustes y Configuración del Sistema (10 Sub-ventanas)', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'permissions', functionName: 'Matriz de Permisos RBAC', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'password_assist', functionName: 'Asistencia de Claves Administrador', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'semester_locks', functionName: 'Cierre y Bloqueo Semestral', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false },
          { functionId: 'audit_logs', functionName: 'Auditoría Silent-Watch', Admin: true, Director: false, Docente: false, Asistente: false, Profesionales: false, Estudiante: false, Apoderado: false }
        ];
        setMatrix(defaultMatrix);
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
      Admin: true,
      Director: false,
      Docente: false,
      Asistente: false,
      Profesionales: false,
      Estudiante: false,
      Apoderado: false
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
      Swal.fire('Guardado', 'Matriz de permisos por rol actualizada exitosamente', 'success');
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={24} color="#4f46e5" /> Matriz Dinámica de Permisos y Control de Acceso (RBAC)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Habilita o deniega accesos por rol: Administrador, Director, Profesor, Asistente, Profesionales (PIE/Psicólogos), Estudiante y Apoderado
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

      {/* AGREGAR NUEVA FUNCIÓN DINÁMICA */}
      <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <input
          type="text"
          value={newFunctionName}
          onChange={e => setNewFunctionName(e.target.value)}
          placeholder="Nombre de nueva función/ventana a incorporar a la matriz..."
          style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
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
              <th style={{ textAlign: 'center' }}>🛡️ Administrador</th>
              <th style={{ textAlign: 'center' }}>🎓 Director</th>
              <th style={{ textAlign: 'center' }}>👨‍🏫 Profesor</th>
              <th style={{ textAlign: 'center' }}>🤝 Asistente</th>
              <th style={{ textAlign: 'center' }}>🩺 Profesionales</th>
              <th style={{ textAlign: 'center' }}>🎓 Estudiante</th>
              <th style={{ textAlign: 'center' }}>👨‍👩‍👧 Apoderado</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, idx) => (
              <tr key={row.functionId || idx}>
                <td><strong>{row.functionName}</strong></td>
                
                {/* 1. ADMIN */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePermission(idx, 'Admin')}
                    style={{
                      border: 'none',
                      background: row.Admin ? '#dcfce7' : '#fee2e2',
                      color: row.Admin ? '#15803d' : '#be123c',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {row.Admin ? <Check size={14} /> : <X size={14} />} {row.Admin ? 'Permitido' : 'Denegado'}
                  </button>
                </td>

                {/* 2. DIRECTOR */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePermission(idx, 'Director')}
                    style={{
                      border: 'none',
                      background: row.Director ? '#dcfce7' : '#fee2e2',
                      color: row.Director ? '#15803d' : '#be123c',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {row.Director ? <Check size={14} /> : <X size={14} />} {row.Director ? 'Permitido' : 'Denegado'}
                  </button>
                </td>

                {/* 2. PROFESOR */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePermission(idx, 'Docente')}
                    style={{
                      border: 'none',
                      background: row.Docente ? '#dcfce7' : '#fee2e2',
                      color: row.Docente ? '#15803d' : '#be123c',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {row.Docente ? <Check size={14} /> : <X size={14} />} {row.Docente ? 'Permitido' : 'Denegado'}
                  </button>
                </td>

                {/* 3. ASISTENTE */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePermission(idx, 'Asistente')}
                    style={{
                      border: 'none',
                      background: row.Asistente ? '#dcfce7' : '#fee2e2',
                      color: row.Asistente ? '#15803d' : '#be123c',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {row.Asistente ? <Check size={14} /> : <X size={14} />} {row.Asistente ? 'Permitido' : 'Denegado'}
                  </button>
                </td>

                {/* 4. PROFESIONALES */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePermission(idx, 'Profesionales')}
                    style={{
                      border: 'none',
                      background: row.Profesionales ? '#dcfce7' : '#fee2e2',
                      color: row.Profesionales ? '#15803d' : '#be123c',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {row.Profesionales ? <Check size={14} /> : <X size={14} />} {row.Profesionales ? 'Permitido' : 'Denegado'}
                  </button>
                </td>

                {/* 5. ESTUDIANTE */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePermission(idx, 'Estudiante')}
                    style={{
                      border: 'none',
                      background: row.Estudiante ? '#dcfce7' : '#fee2e2',
                      color: row.Estudiante ? '#15803d' : '#be123c',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {row.Estudiante ? <Check size={14} /> : <X size={14} />} {row.Estudiante ? 'Permitido' : 'Denegado'}
                  </button>
                </td>

                {/* 6. APODERADO */}
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => togglePermission(idx, 'Apoderado')}
                    style={{
                      border: 'none',
                      background: row.Apoderado ? '#dcfce7' : '#fee2e2',
                      color: row.Apoderado ? '#15803d' : '#be123c',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {row.Apoderado ? <Check size={14} /> : <X size={14} />} {row.Apoderado ? 'Permitido' : 'Denegado'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
