import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Check, X, RefreshCw, Save, GripVertical } from 'lucide-react';
import Swal from 'sweetalert2';
import { sortCoursesList, sortStudentsList, getStudentCourse } from '../utils/course';

interface ReorderModalProps {
  students: any[];
  token: string;
  onClose: () => void;
  onSuccess: (updatedStudents?: any[]) => void;
}

export const ReorderStudentsModal: React.FC<ReorderModalProps> = ({ students, token, onClose, onSuccess }) => {
  const [list, setList] = useState<any[]>(() => {
    return sortStudentsList(students);
  });

  const [selectedCourse, setSelectedCourse] = useState<string>('Todos');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Cursos dinámicos desde la lista de alumnos
  const uniqueCourses = sortCoursesList(Array.from(new Set(students.map(getStudentCourse))).filter(Boolean) as string[]);

  const filteredList = selectedCourse === 'Todos' 
    ? list 
    : list.filter(s => getStudentCourse(s) === selectedCourse);

  // 1. REORDENAMIENTO AUTOMÁTICO A-Z POR APELLIDOS
  const handleAutoReorderAZ = () => {
    const sorted = [...list].sort((a, b) => {
      const surnameA = (a.paternal_surname || a.full_name || '').toLowerCase();
      const surnameB = (b.paternal_surname || b.full_name || '').toLowerCase();
      return surnameA.localeCompare(surnameB, 'es', { sensitivity: 'base' });
    });

    const renumbered = sorted.map((std, idx) => ({
      ...std,
      list_number: idx + 1
    }));

    setList(renumbered);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Lista reordenada alfabéticamente A-Z',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // 2. ARRASTRE Y SOLTADO (DRAG AND DROP)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const currentDisplayList = [...filteredList];
    const [movedItem] = currentDisplayList.splice(draggedIndex, 1);
    currentDisplayList.splice(targetIndex, 0, movedItem);

    // Recalcular N° de Lista correlativamente (1..N)
    const renumberedDisplay = currentDisplayList.map((std, idx) => ({
      ...std,
      list_number: idx + 1
    }));

    if (selectedCourse === 'Todos') {
      setList(renumberedDisplay);
    } else {
      const updatedMain = list.map(std => {
        const found = renumberedDisplay.find(item => item.id === std.id);
        return found ? found : std;
      });
      setList(updatedMain);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 3. MOVER ELEMENTO ARRIBA (SUBIR N° LISTA)
  const moveUp = (index: number) => {
    if (index <= 0) return;
    const currentDisplayList = [...filteredList];
    const temp = currentDisplayList[index];
    currentDisplayList[index] = currentDisplayList[index - 1];
    currentDisplayList[index - 1] = temp;

    const renumbered = currentDisplayList.map((std, idx) => ({
      ...std,
      list_number: idx + 1
    }));

    if (selectedCourse === 'Todos') {
      setList(renumbered);
    } else {
      const updatedMain = list.map(std => {
        const found = renumbered.find(item => item.id === std.id);
        return found ? found : std;
      });
      setList(updatedMain);
    }
  };

  // 4. MOVER ELEMENTO ABAJO (BAJAR N° LISTA)
  const moveDown = (index: number) => {
    if (index >= filteredList.length - 1) return;
    const currentDisplayList = [...filteredList];
    const temp = currentDisplayList[index];
    currentDisplayList[index] = currentDisplayList[index + 1];
    currentDisplayList[index + 1] = temp;

    const renumbered = currentDisplayList.map((std, idx) => ({
      ...std,
      list_number: idx + 1
    }));

    if (selectedCourse === 'Todos') {
      setList(renumbered);
    } else {
      const updatedMain = list.map(std => {
        const found = renumbered.find(item => item.id === std.id);
        return found ? found : std;
      });
      setList(updatedMain);
    }
  };

  // 5. CAMBIO DIRECTO DE NÚMERO DE LISTA
  const handleListNumberChange = (id: any, newNum: number) => {
    const updated = list.map(std => {
      if (std.id === id) {
        return { ...std, list_number: newNum };
      }
      return std;
    });
    setList(updated);
  };

  // 6. GUARDAR ORDEN OFICIAL EN SERVIDOR
  const handleSaveOrder = async () => {
    try {
      const res = await fetch('/api/students/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reorderedStudents: list })
      });

      if (res.ok) {
        Swal.fire('Orden Guardado', 'Los números de lista se han actualizado correctamente en la base de datos.', 'success');
        onSuccess(list);
        onClose();
      } else {
        Swal.fire('Atención', 'No se pudo guardar el nuevo orden de lista.', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión al servidor.', 'error');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#4f46e5', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>
              <ArrowUpDown size={22} /> Modificar Orden de Lista de Estudiantes
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
              Arrastra los alumnos con el icono <GripVertical size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> para reordenar rápidamente o usa los botones A-Z.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
        </div>

        {/* ACCIONES Y FILTRO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Curso:</span>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#4f46e5' }}
            >
              <option value="Todos">🏫 Todos los Cursos</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAutoReorderAZ}
            className="btn"
            style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} /> Reordenar A-Z Automático
          </button>
        </div>

        {/* LISTA DE ESTUDIANTES CON DRAG AND DROP (ARRASTRE) */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem', marginBottom: '1.25rem' }}>
          {filteredList.map((std, idx) => {
            const isDragging = draggedIndex === idx;
            const isDragOver = dragOverIndex === idx;

            return (
              <div
                key={std.id || idx}
                draggable
                onDragStart={e => handleDragStart(e, idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  border: isDragOver ? '2px dashed #4f46e5' : '1px solid #e2e8f0',
                  background: isDragging ? '#e0e7ff' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc'),
                  opacity: isDragging ? 0.5 : 1,
                  borderRadius: '8px',
                  marginBottom: '0.35rem',
                  cursor: 'grab',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {/* ICONO DE ARRASTRE */}
                  <div title="Arrastrar para mover posición" style={{ cursor: 'grab', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    <GripVertical size={18} />
                  </div>

                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', width: '22px' }}>#{idx + 1}</span>
                  
                  <input
                    type="number"
                    value={std.list_number || idx + 1}
                    onChange={e => handleListNumberChange(std.id, parseInt(e.target.value, 10) || idx + 1)}
                    style={{ width: '55px', padding: '0.3rem', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: '#4f46e5' }}
                  />

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{std.full_name || std.Nombres}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RUT: {std.run || std.RUT} | {std.level_name || (std.desc_grado ? `${std.desc_grado} ${std.letra_curso || ''}`.trim() : '1° Medio A')}</div>
                  </div>
                </div>

                {/* BOTONES DE MOVER ARRIBA Y ABAJO */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="Mover alumno arriba"
                    style={{ opacity: idx === 0 ? 0.3 : 1, padding: '0.35rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    <ArrowUp size={14} color="#334155" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === filteredList.length - 1}
                    title="Mover alumno abajo"
                    style={{ opacity: idx === filteredList.length - 1 ? 0.3 : 1, padding: '0.35rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: idx === filteredList.length - 1 ? 'not-allowed' : 'pointer' }}
                  >
                    <ArrowDown size={14} color="#334155" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* PIE DE PÁGINA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <button onClick={onClose} className="btn" style={{ background: '#cbd5e1', color: '#1e293b' }}>Cancelar</button>
          <button onClick={handleSaveOrder} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <Save size={16} /> Guardar Orden Oficial
          </button>
        </div>

      </div>
    </div>
  );
};
