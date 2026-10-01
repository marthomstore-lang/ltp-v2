import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, BarChart2, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { isStudentRetired, getStudentWithdrawalDate } from '../utils/course';

export interface SubEvaluation {
  id: string;
  title: string;
  description?: string;
}

export interface Student {
  id: string;
  run?: string;
  full_name: string;
  list_number?: number;
  enrollment_number?: string;
  is_retired?: number | boolean;
}

interface CumulativeGradesModalProps {
  token: string;
  gradeColumnId: string;
  columnTitle: string;
  courseName: string;
  subjectName: string;
  levelId: number;
  subjectId: number;
  academicYear: number;
  period: string;
  students: Student[];
  isLocked?: boolean;
  onClose: () => void;
  onSaved: (calculatedAverages: Record<string, number>, subEvaluationsCount: number) => void;
}

export const CumulativeGradesModal: React.FC<CumulativeGradesModalProps> = ({
  token,
  gradeColumnId,
  columnTitle,
  courseName,
  subjectName,
  levelId,
  subjectId,
  academicYear,
  period,
  students,
  isLocked = false,
  onClose,
  onSaved
}) => {
  const [subEvaluations, setSubEvaluations] = useState<SubEvaluation[]>([
    { id: 'sub-1', title: 'Sub-Nota 1 (Guía / Tarea)' },
    { id: 'sub-2', title: 'Sub-Nota 2 (Control / Trabajo)' }
  ]);
  const [subGradesMap, setSubGradesMap] = useState<Record<string, number>>({});
  const [editingCell, setEditingCell] = useState<{ key: string; text: string; freshFocus?: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [gradeScaleMode, setGradeScaleMode] = useState<'decimal' | 'entera'>('decimal');

  // Cargar sub-evaluaciones y sub-notas existentes desde el backend
  useEffect(() => {
    setLoading(true);
    fetch(`/api/grades/cumulative?gradeColumnId=${encodeURIComponent(gradeColumnId)}&levelId=${levelId}&subjectId=${subjectId}&academicYear=${academicYear}&period=${encodeURIComponent(period)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.evaluation && Array.isArray(data.evaluation.sub_evaluations) && data.evaluation.sub_evaluations.length > 0) {
          setSubEvaluations(data.evaluation.sub_evaluations);
        }
        if (data.subGrades && typeof data.subGrades === 'object') {
          setSubGradesMap(data.subGrades);
        }
      })
      .catch(err => console.error('Error al cargar acumulativas:', err))
      .finally(() => setLoading(false));
  }, [gradeColumnId, levelId, subjectId, academicYear, period, token]);

  // Manejo de cambio en casilla de sub-nota
  const handleSubGradeChange = (studentId: string, subId: string, valStr: string) => {
    const st = students.find(s => s.id === studentId);
    if (st && isStudentRetired(st)) return;

    const key = `${studentId}_${subId}`;
    let workingStr = valStr;
    if (editingCell && editingCell.key === key && editingCell.freshFocus && editingCell.text) {
      const prevFormatted = editingCell.text;
      if (workingStr.length === prevFormatted.length + 1 && workingStr.startsWith(prevFormatted)) {
        const addedChar = workingStr.slice(prevFormatted.length);
        if (/^[1-7]$/.test(addedChar)) {
          workingStr = addedChar;
        }
      } else if (workingStr.length === prevFormatted.length + 1 && workingStr.endsWith(prevFormatted)) {
        const addedChar = workingStr.slice(0, 1);
        if (/^[1-7]$/.test(addedChar)) {
          workingStr = addedChar;
        }
      }
    }

    const cleanedInput = workingStr.replace(/[^0-9.,]/g, '').slice(0, 4);
    setEditingCell({ key, text: cleanedInput, freshFocus: false });

    if (!cleanedInput || !cleanedInput.trim()) {
      setSubGradesMap(prev => ({ ...prev, [key]: 0 }));
      return;
    }

    const digitsOnly = cleanedInput.replace(/[.,]/g, '');
    let val = parseFloat(cleanedInput.replace(',', '.'));

    if (!cleanedInput.includes(',') && !cleanedInput.includes('.')) {
      if (digitsOnly.length === 1) {
        val = parseInt(digitsOnly, 10);
      } else if (digitsOnly.length >= 2) {
        const twoDigits = parseInt(digitsOnly.slice(0, 2), 10);
        val = twoDigits / 10.0;
      }
    } else if (cleanedInput.endsWith(',') || cleanedInput.endsWith('.')) {
      val = parseFloat(cleanedInput.slice(0, -1));
    }

    if (isNaN(val) || val <= 0) {
      setSubGradesMap(prev => ({ ...prev, [key]: 0 }));
      return;
    }

    // Escala entera (ej: 65 -> 6.5)
    if (val > 7.0 && val <= 70.0) {
      val = val / 10.0;
    }
    if (val > 7.0) val = 7.0;

    setSubGradesMap(prev => ({ ...prev, [key]: val }));
  };

  // Formato para casilla de nota
  const formatCellValue = (val: number | undefined | null) => {
    if (val === undefined || val === null || val === 0) return '';
    let num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num) || num <= 0) return '';

    if (num > 7.0 && num <= 70.0) num = num / 10.0;

    if (gradeScaleMode === 'entera') {
      return Math.round(num * 10).toString();
    } else {
      return num.toFixed(1).replace('.', ',');
    }
  };

  const persistSubEvaluationsConfig = async (evals: SubEvaluation[], currentGrades?: Record<string, number>) => {
    try {
      await fetch('/api/grades/cumulative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          gradeColumnId,
          title: columnTitle,
          subEvaluations: evals,
          subGrades: currentGrades || subGradesMap,
          levelId,
          subjectId,
          academicYear,
          period
        })
      });
    } catch (err) {
      console.warn('Auto-sync subEvaluations notice:', err);
    }
  };

  // Agregar nueva sub-evaluación
  const handleAddSubEvaluation = async () => {
    const nextNum = subEvaluations.length + 1;
    const defaultName = `Sub-Nota ${nextNum} (Control / Tarea)`;

    const { value: title } = await Swal.fire({
      title: 'Nueva Sub-Evaluación Acumulativa',
      text: 'Escribe el nombre o contenido de esta evaluación acumulativa:',
      input: 'text',
      inputValue: defaultName,
      showCancelButton: true,
      confirmButtonText: 'Crear Sub-Evaluación',
      cancelButtonText: 'Cancelar',
      inputValidator: (val) => {
        if (!val || !val.trim()) return 'Debes ingresar un nombre válido.';
      }
    });

    if (title && title.trim()) {
      const newSub: SubEvaluation = {
        id: `sub_${Date.now()}`,
        title: title.trim()
      };
      const updated = [...subEvaluations, newSub];
      setSubEvaluations(updated);
      persistSubEvaluationsConfig(updated);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Sub-evaluación "${title.trim()}" agregada`, timer: 1500, showConfirmButton: false });
    }
  };

  // Renombrar sub-evaluación
  const handleRenameSubEvaluation = async (sub: SubEvaluation) => {
    const { value: newTitle } = await Swal.fire({
      title: 'Renombrar Sub-Evaluación',
      text: `Escribe el nuevo nombre para "${sub.title}":`,
      input: 'text',
      inputValue: sub.title,
      showCancelButton: true,
      confirmButtonText: 'Guardar Nombre',
      cancelButtonText: 'Cancelar',
      inputValidator: (val) => {
        if (!val || !val.trim()) return 'Debes ingresar un nombre.';
      }
    });

    if (newTitle && newTitle.trim()) {
      const updated = subEvaluations.map(s => s.id === sub.id ? { ...s, title: newTitle.trim() } : s);
      setSubEvaluations(updated);
      persistSubEvaluationsConfig(updated);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nombre actualizado', timer: 1200, showConfirmButton: false });
    }
  };

  // Eliminar sub-evaluación
  const handleDeleteSubEvaluation = (sub: SubEvaluation) => {
    if (subEvaluations.length <= 1) {
      Swal.fire('Atención', 'Debe existir al menos 1 sub-evaluación en la nota acumulativa.', 'warning');
      return;
    }

    Swal.fire({
      title: `¿Eliminar "${sub.title}"?`,
      text: 'Se eliminarán las calificaciones registradas en esta sub-evaluación.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        const updated = subEvaluations.filter(s => s.id !== sub.id);
        setSubEvaluations(updated);
        // Limpiar sub-notas asociadas
        const newGrades = { ...subGradesMap };
        Object.keys(newGrades).forEach(k => {
          if (k.endsWith(`_${sub.id}`)) {
            delete newGrades[k];
          }
        });
        setSubGradesMap(newGrades);
        persistSubEvaluationsConfig(updated, newGrades);
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Sub-evaluación eliminada', timer: 1200, showConfirmButton: false });
      }
    });
  };

  // Calcular promedio acumulativo de un estudiante
  const calculateStudentSubAverage = (studentId: string): { formatted: string; raw: number; isRed: boolean } => {
    let sum = 0;
    let count = 0;

    subEvaluations.forEach(sub => {
      const val = subGradesMap[`${studentId}_${sub.id}`];
      if (val && val > 0) {
        sum += val;
        count++;
      }
    });

    if (count === 0) return { formatted: '-', raw: 0, isRed: false };

    const rawAvg = sum / count;
    const isRed = rawAvg < 4.0;

    if (gradeScaleMode === 'entera') {
      return { formatted: Math.round(rawAvg * 10).toString(), raw: rawAvg, isRed };
    } else {
      return { formatted: rawAvg.toFixed(1).replace('.', ','), raw: rawAvg, isRed };
    }
  };

  // Navegación por teclado tipo Excel
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    sIndex: number,
    subIndex: number
  ) => {
    let targetS = sIndex;
    let targetSub = subIndex;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetS = Math.min(students.length - 1, sIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetS = Math.max(0, sIndex - 1);
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        if (subIndex < subEvaluations.length - 1) {
          e.preventDefault();
          targetSub = subIndex + 1;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        if (subIndex > 0) {
          e.preventDefault();
          targetSub = subIndex - 1;
        }
      }
    }

    if (targetS !== sIndex || targetSub !== subIndex) {
      const el = document.getElementById(`sub-grade-${targetS}-${targetSub}`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Guardar sub-notas y enviar promedio calculado al backend
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/grades/cumulative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          gradeColumnId,
          title: columnTitle,
          subEvaluations,
          subGrades: subGradesMap,
          levelId,
          subjectId,
          academicYear,
          period
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar notas acumulativas');

      Swal.fire({
        icon: 'success',
        title: '¡Notas Acumulativas Guardadas!',
        text: 'Se han guardado todas las sub-evaluaciones y se ha actualizado automáticamente el promedio en la planilla de calificaciones.',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Aceptar'
      });

      onSaved(data.calculatedAverages || {}, subEvaluations.length);
      onClose();
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudieron guardar las notas acumulativas.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      zIndex: 4000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.25rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '1100px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* HEADER DEL MODAL */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)',
          padding: '1.25rem 1.75rem',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.35rem', borderRadius: '8px' }}>
                <BarChart2 size={22} color="#ffffff" />
              </div>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                Notas Acumulativas: {columnTitle}
              </h2>
            </div>
            <p style={{ margin: '0.35rem 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
              {courseName} • {subjectName} • {period} ({academicYear})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TOOLBAR DEL MODAL */}
        <div style={{
          background: '#f8fafc',
          padding: '1rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleAddSubEvaluation}
              disabled={isLocked}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '8px'
              }}
            >
              <Plus size={16} /> + Agregar Sub-Evaluación
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Escala:</span>
              <select
                value={gradeScaleMode}
                onChange={e => setGradeScaleMode(e.target.value as any)}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  background: '#ffffff',
                  color: '#4f46e5'
                }}
              >
                <option value="decimal">Decimal (1,0 - 7,0)</option>
                <option value="entera">Entera (10 - 70)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleSaveAll}
              disabled={saving || isLocked}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: saving || isLocked ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)'
              }}
            >
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar y Calcular Promedio'}
            </button>
          </div>
        </div>

        {/* TABLA DE SUB-NOTAS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Cargando notas acumulativas...
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto', background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ width: '45px', padding: '0.75rem 0.5rem', textAlign: 'center' }}>N°</th>
                    <th style={{ width: '100px', padding: '0.75rem 0.5rem', textAlign: 'center' }}>RUN / Matrícula</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', minWidth: '220px' }}>Estudiante</th>

                    {/* Columnas de Sub-Evaluaciones */}
                    {subEvaluations.map((sub, sIdx) => (
                      <th key={sub.id} style={{ textAlign: 'center', padding: '0.75rem 0.6rem', minWidth: '130px', borderLeft: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <div style={{ fontWeight: 800, color: '#1e1b4b', fontSize: '0.82rem' }}>
                            {sub.title}
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              onClick={() => handleRenameSubEvaluation(sub)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4f46e5', padding: '2px' }}
                              title="Renombrar sub-evaluación"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteSubEvaluation(sub)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                              title="Eliminar sub-evaluación"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}

                    {/* Promedio Acumulativo Resultante */}
                    <th style={{
                      textAlign: 'center',
                      background: '#eff6ff',
                      color: '#1e40af',
                      fontWeight: 800,
                      padding: '0.75rem 1rem',
                      borderLeft: '2px solid #bfdbfe',
                      minWidth: '110px'
                    }}>
                      PROMEDIO ACUMULATIVO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, idx) => {
                    const retired = isStudentRetired(st);
                    const retiredDate = getStudentWithdrawalDate(st);
                    const avgResult = calculateStudentSubAverage(st.id);

                    return (
                      <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', background: retired ? '#fef2f2' : 'transparent' }}>
                        <td style={{ textAlign: 'center', padding: '0.55rem 0.5rem', fontWeight: 700, color: retired ? '#dc2626' : '#64748b' }}>
                          {st.list_number || idx + 1}
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.55rem 0.5rem', fontSize: '0.8rem', color: retired ? '#dc2626' : '#4f46e5', fontWeight: 700, textDecoration: retired ? 'line-through' : 'none' }}>
                          {st.enrollment_number || st.run || `MAT-${idx + 1}`}
                        </td>
                        <td style={{ padding: '0.55rem 1rem', fontWeight: 700, color: retired ? '#dc2626' : '#0f172a', textTransform: 'uppercase' }}>
                          <span style={{ textDecoration: retired ? 'line-through' : 'none' }}>{st.full_name}</span>
                          {retired && (
                            <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: '#991b1b', background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.1rem 0.35rem', borderRadius: '4px', textTransform: 'none' }}>
                              🔴 Retirado {retiredDate ? `(${retiredDate})` : ''}
                            </span>
                          )}
                        </td>

                        {/* Celdas de Sub-Notas */}
                        {subEvaluations.map((sub, subIdx) => {
                          const key = `${st.id}_${sub.id}`;
                          const rawVal = subGradesMap[key];
                          const formattedVal = formatCellValue(rawVal);
                          const isEditingThis = editingCell?.key === key;
                          const displayVal = isEditingThis ? editingCell.text : formattedVal;
                          const isSubRed = rawVal !== undefined && rawVal > 0 && rawVal < 4.0;

                          return (
                            <td key={sub.id} style={{ textAlign: 'center', padding: '0.35rem 0.45rem', borderLeft: '1px solid #f1f5f9' }}>
                              <input
                                id={`sub-grade-${idx}-${subIdx}`}
                                type="text"
                                disabled={isLocked || retired}
                                value={displayVal}
                                onChange={e => handleSubGradeChange(st.id, sub.id, e.target.value)}
                                onBlur={() => setEditingCell(prev => (prev?.key === key ? null : prev))}
                                onKeyDown={e => handleKeyDown(e, idx, subIdx)}
                                onFocus={e => {
                                  if (!retired) {
                                    setEditingCell({ key, text: formattedVal, freshFocus: true });
                                    e.target.select();
                                    setTimeout(() => { try { e.target.select(); } catch (_) {} }, 0);
                                  }
                                }}
                                onMouseUp={e => {
                                  if (!retired && editingCell?.key === key && editingCell.freshFocus) {
                                    e.preventDefault();
                                    try { e.currentTarget.select(); } catch (_) {}
                                  }
                                }}
                                placeholder="-"
                                title={retired ? `Estudiante retirado ${retiredDate ? `(${retiredDate})` : ''}: No admite ingreso de calificaciones` : undefined}
                                style={{
                                  width: '58px',
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  color: retired ? '#94a3b8' : isSubRed ? '#ef4444' : formattedVal ? '#2563eb' : '#0f172a',
                                  padding: '0.35rem',
                                  borderRadius: '6px',
                                  border: retired ? '1px dashed #cbd5e1' : '1px solid #cbd5e1',
                                  outline: 'none',
                                  fontSize: '0.9rem',
                                  background: retired ? '#f1f5f9' : isSubRed ? '#fff1f2' : '#ffffff',
                                  cursor: retired ? 'not-allowed' : 'text'
                                }}
                              />
                            </td>
                          );
                        })}

                        {/* Promedio Acumulativo de la Fila */}
                        <td style={{
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          color: avgResult.isRed ? '#ef4444' : avgResult.formatted !== '-' ? '#16a34a' : '#64748b',
                          background: '#f8fafc',
                          padding: '0.55rem 0.75rem',
                          borderLeft: '2px solid #bfdbfe'
                        }}>
                          {avgResult.formatted}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER DEL MODAL */}
        <div style={{
          background: '#f8fafc',
          padding: '0.85rem 1.75rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} color="#16a34a" />
            <span>
              <strong>{subEvaluations.length}</strong> sub-evaluaciones acumulativas configuradas. El promedio resultante se actualiza de forma automática en la casilla principal de <strong>{columnTitle}</strong>.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', borderRadius: '8px' }}
            >
              Cerrar
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || isLocked}
              className="btn btn-primary"
              style={{ padding: '0.45rem 1.25rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '8px' }}
            >
              <Save size={14} /> Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
