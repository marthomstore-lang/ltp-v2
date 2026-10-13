import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Save, BarChart2, CheckCircle2, Clipboard, Zap, Sparkles, HelpCircle, FileSpreadsheet } from 'lucide-react';
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

  // MODAL ASISTENTE PARA PEGAR DESDE EXCEL
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteTargetSubId, setPasteTargetSubId] = useState<string>('all');
  const [pastedRawText, setPastedRawText] = useState<string>('');

  // HELPER UNIVERSAL PARA CONVERTIR TEXTO A NOTA VÁLIDA (1.0 A 7.0)
  const parseRawGrade = (valStr: string): number => {
    if (!valStr) return 0;
    const cleaned = valStr.trim().replace(/[^0-9.,]/g, '');
    if (!cleaned) return 0;
    const digitsOnly = cleaned.replace(/[.,]/g, '');
    let val = parseFloat(cleaned.replace(',', '.'));
    if (!cleaned.includes(',') && !cleaned.includes('.')) {
      if (digitsOnly.length === 1) {
        val = parseInt(digitsOnly, 10);
      } else if (digitsOnly.length >= 2) {
        val = parseInt(digitsOnly.slice(0, 2), 10) / 10.0;
      }
    }
    if (isNaN(val) || val <= 0) return 0;
    if (val > 7.0 && val <= 70.0) val = val / 10.0;
    if (val > 7.0) val = 7.0;
    return Math.round(val * 10) / 10;
  };

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

  // PEGAR CALIFICACIONES DIRECTO DESDE EXCEL EN LAS CELDAS (CTRL + V)
  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIndex: number,
    startSubIndex: number
  ) => {
    const pasteData = e.clipboardData.getData('text');
    if (!pasteData) return;

    const lines = pasteData.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Si es un solo valor simple sin tabulaciones ni saltos de línea
    if (lines.length === 1 && !lines[0].includes('\t')) {
      const singleGrade = parseRawGrade(lines[0]);
      if (singleGrade > 0) {
        e.preventDefault();
        const st = students[startStudentIndex];
        const sub = subEvaluations[startSubIndex];
        if (st && sub && !isStudentRetired(st)) {
          setSubGradesMap(prev => ({ ...prev, [`${st.id}_${sub.id}`]: singleGrade }));
        }
      }
      return;
    }

    e.preventDefault();

    const newGrades = { ...subGradesMap };
    let appliedCount = 0;

    lines.forEach((line, lineOffset) => {
      const targetStudentIdx = startStudentIndex + lineOffset;
      if (targetStudentIdx >= students.length) return;
      const targetStudent = students[targetStudentIdx];
      if (isStudentRetired(targetStudent)) return;

      const cols = line.split('\t');
      cols.forEach((colVal, colOffset) => {
        const targetSubIdx = startSubIndex + colOffset;
        if (targetSubIdx >= subEvaluations.length) return;
        const targetSub = subEvaluations[targetSubIdx];
        const parsed = parseRawGrade(colVal);
        if (parsed > 0) {
          newGrades[`${targetStudent.id}_${targetSub.id}`] = parsed;
          appliedCount++;
        }
      });
    });

    if (appliedCount > 0) {
      setSubGradesMap(newGrades);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `¡${appliedCount} notas pegadas desde Excel!`,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'No se detectaron notas válidas en el texto copiado',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // ASIGNACIÓN RÁPIDA MASIVA / RELLENAR NOTA BASE (EJ: 7,0 O NOTA DE GUÍA)
  const handleBulkFillSubEvaluation = async (sub: SubEvaluation) => {
    const { value: formValues } = await Swal.fire({
      title: `⚡ Asignar Nota Masiva: ${sub.title}`,
      html: `
        <div style="text-align: left; font-size: 0.88rem; color: #334155; margin-top: 0.5rem;">
          <label style="font-weight: 700; display: block; margin-bottom: 0.35rem;">Nota a Asignar (1,0 - 7,0):</label>
          <input id="swal-bulk-grade" type="text" class="swal2-input" placeholder="Ej: 7.0 o 70" value="7.0" style="margin: 0 0 1rem 0; width: 100%; font-size: 1.15rem; font-weight: 800; text-align: center; color: #4338ca;">
          
          <label style="font-weight: 700; display: block; margin-bottom: 0.35rem;">¿A quiénes aplicar?:</label>
          <div style="display: flex; flex-direction: column; gap: 0.5rem; background: #f8fafc; padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="radio" name="bulk-mode" value="empty" checked style="accent-color: #4f46e5;">
              <span><strong>Solo casillas vacías</strong> (conservar las notas que ya ingresaste)</span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="radio" name="bulk-mode" value="all" style="accent-color: #4f46e5;">
              <span><strong>A todos los estudiantes</strong> activos del curso</span>
            </label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aplicar Nota',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      preConfirm: () => {
        const gradeInput = (document.getElementById('swal-bulk-grade') as HTMLInputElement)?.value;
        const mode = (document.querySelector('input[name="bulk-mode"]:checked') as HTMLInputElement)?.value;
        const parsed = parseRawGrade(gradeInput || '');
        if (!parsed || parsed < 1.0 || parsed > 7.0) {
          Swal.showValidationMessage('Ingresa una calificación válida entre 1,0 y 7,0');
          return false;
        }
        return { grade: parsed, mode };
      }
    });

    if (formValues) {
      const { grade, mode } = formValues;
      const newGrades = { ...subGradesMap };
      let updatedCount = 0;

      students.forEach(st => {
        if (isStudentRetired(st)) return;
        const key = `${st.id}_${sub.id}`;
        const current = newGrades[key];
        if (mode === 'all' || !current || current <= 0) {
          newGrades[key] = grade;
          updatedCount++;
        }
      });

      setSubGradesMap(newGrades);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Se asignó ${grade.toFixed(1).replace('.', ',')} a ${updatedCount} estudiantes`,
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // APLICAR NOTAS DESDE EL MODAL ASISTENTE DE EXCEL
  const handleApplyPastedModalText = () => {
    if (!pastedRawText || !pastedRawText.trim()) {
      Swal.fire('Atención', 'Pega primero las notas copiadas de Excel en el cuadro de texto.', 'warning');
      return;
    }

    const lines = pastedRawText.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      Swal.fire('Atención', 'No se encontraron líneas de texto para procesar.', 'warning');
      return;
    }

    const newGrades = { ...subGradesMap };
    let appliedCount = 0;

    const targetSub = subEvaluations.find(s => s.id === pasteTargetSubId);

    lines.forEach((line, lineOffset) => {
      if (lineOffset >= students.length) return;
      const st = students[lineOffset];
      if (isStudentRetired(st)) return;

      if (targetSub) {
        // Pegar a una sola columna seleccionada
        const parts = line.split('\t');
        const lastPart = parts[parts.length - 1];
        const parsed = parseRawGrade(lastPart) || parseRawGrade(parts[0]);
        if (parsed > 0) {
          newGrades[`${st.id}_${targetSub.id}`] = parsed;
          appliedCount++;
        }
      } else {
        // Modo 'all': Pegar multicolumna
        const cols = line.split('\t');
        cols.forEach((colVal, cIdx) => {
          if (cIdx >= subEvaluations.length) return;
          const s = subEvaluations[cIdx];
          const parsed = parseRawGrade(colVal);
          if (parsed > 0) {
            newGrades[`${st.id}_${s.id}`] = parsed;
            appliedCount++;
          }
        });
      }
    });

    if (appliedCount > 0) {
      setSubGradesMap(newGrades);
      setShowPasteModal(false);
      setPastedRawText('');
      Swal.fire({
        icon: 'success',
        title: '¡Notas Importadas con Éxito!',
        text: `Se aplicaron ${appliedCount} calificaciones a los estudiantes del curso. Recuerda hacer clic en "Guardar y Calcular Promedio" para persistir.`,
        confirmButtonColor: '#4f46e5'
      });
    } else {
      Swal.fire('Atención', 'No se reconocieron notas numéricas válidas en el texto pegado.', 'warning');
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

            <button
              onClick={() => {
                setPastedRawText('');
                setShowPasteModal(true);
              }}
              disabled={isLocked}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                borderRadius: '8px',
                background: '#ede9fe',
                color: '#4f46e5',
                border: '1px solid #c7d2fe',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.1)',
                transition: 'all 0.15s'
              }}
              title="Abrir asistente para importar o pegar columnas de notas desde Excel"
            >
              <FileSpreadsheet size={16} /> Pegar desde Excel
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
                              onClick={() => handleBulkFillSubEvaluation(sub)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f59e0b', padding: '2px' }}
                              title="⚡ Asignar nota masiva o rellenar casillas vacías en esta sub-evaluación"
                            >
                              <Zap size={13} />
                            </button>
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
                                onPaste={e => handleCellPaste(e, idx, subIdx)}
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

      {/* MODAL ASISTENTE: PEGAR DESDE EXCEL */}
      {showPasteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          zIndex: 5000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.25rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: '#4338ca',
              color: '#ffffff',
              padding: '1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={20} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Asistente para Pegar desde Excel
                </h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#166534' }}>
                💡 <strong>Instrucciones sencillas:</strong>
                <ol style={{ margin: '0.4rem 0 0 1.25rem', padding: 0 }}>
                  <li>Selecciona la columna de notas en tu archivo Excel o Google Sheets y presiona <code>Ctrl + C</code> (Copiar).</li>
                  <li>Pega el contenido aquí abajo con <code>Ctrl + V</code>.</li>
                  <li>El sistema asignará automáticamente cada nota según el orden de lista de los estudiantes.</li>
                </ol>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  ¿A qué columna deseas asignar las notas pegadas?:
                </label>
                <select
                  value={pasteTargetSubId}
                  onChange={e => setPasteTargetSubId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#4338ca',
                    background: '#f8fafc'
                  }}
                >
                  <option value="all">Todas las columnas consecutivas (si copiaste varias columnas)</option>
                  {subEvaluations.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Pega aquí las notas copiadas de Excel (Ctrl + V):
                </label>
                <textarea
                  value={pastedRawText}
                  onChange={e => setPastedRawText(e.target.value)}
                  placeholder={`Ejemplo:\n6.5\n5.0\n7.0\n4.2`}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #a5b4fc',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Previsualización en tiempo real */}
              {pastedRawText.trim() && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4338ca', marginBottom: '0.5rem' }}>
                    Previsualización de Asignación:
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#64748b' }}>
                          <th style={{ padding: '4px 8px', textAlign: 'center', width: '35px' }}>N°</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>Estudiante</th>
                          <th style={{ padding: '4px 8px', textAlign: 'center', width: '90px' }}>Nota Leída</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastedRawText.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0).slice(0, 15).map((line, lIdx) => {
                          const st = students[lIdx];
                          const parts = line.split('\t');
                          const gradeVal = parseRawGrade(parts[parts.length - 1]) || parseRawGrade(parts[0]);
                          return (
                            <tr key={lIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ textAlign: 'center', padding: '3px 6px', fontWeight: 700, color: '#64748b' }}>
                                {st?.list_number || lIdx + 1}
                              </td>
                              <td style={{ padding: '3px 6px', color: st ? (isStudentRetired(st) ? '#dc2626' : '#1e293b') : '#94a3b8' }}>
                                {st ? st.full_name : `Fila adicional ${lIdx + 1}`}
                                {st && isStudentRetired(st) ? ' (Retirado - Se omitirá)' : ''}
                              </td>
                              <td style={{ textAlign: 'center', padding: '3px 6px', fontWeight: 800, color: gradeVal >= 4 ? '#16a34a' : gradeVal > 0 ? '#ef4444' : '#94a3b8' }}>
                                {gradeVal > 0 ? gradeVal.toFixed(1).replace('.', ',') : 'Inválida'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              background: '#f8fafc',
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setShowPasteModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyPastedModalText}
                disabled={!pastedRawText.trim()}
                className="btn btn-primary"
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem', fontWeight: 800 }}
              >
                <Sparkles size={15} /> Aplicar Notas a la Planilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
