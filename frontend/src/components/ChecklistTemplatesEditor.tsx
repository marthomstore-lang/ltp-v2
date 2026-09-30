import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { 
  FileCheck, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Check, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Info,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface ChecklistTemplateItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
}

export interface ChecklistTemplatesState {
  withdrawal: ChecklistTemplateItem[];
  enrollment_new: ChecklistTemplateItem[];
  enrollment_old: ChecklistTemplateItem[];
}

const COMMON_CATEGORIES = [
  'Ministerial',
  'Académico',
  'Administrativo',
  'Identificación',
  'Salud',
  'PIE',
  'Convivencia',
  'Materiales',
  'Contacto',
  'General'
];

interface ChecklistTemplatesEditorProps {
  token?: string;
  onSaved?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const ChecklistTemplatesEditor: React.FC<ChecklistTemplatesEditorProps> = ({
  token: propToken,
  onSaved,
  isModal = false,
  onClose
}) => {
  const { token: authTok } = useAuth();
  const token = propToken || authTok;
  const [activeTab, setActiveTab] = useState<'withdrawal' | 'enrollment_new' | 'enrollment_old'>('withdrawal');
  const [templates, setTemplates] = useState<ChecklistTemplatesState>({
    withdrawal: [],
    enrollment_new: [],
    enrollment_old: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulario agregar nuevo documento
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState(COMMON_CATEGORIES[0]);
  const [newDefaultChecked, setNewDefaultChecked] = useState(false);

  // Modo edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState(COMMON_CATEGORIES[0]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config/checklist-templates', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data && data.success && data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Error al cargar plantillas de checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentList = templates[activeTab] || [];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      Swal.fire('Atención', 'Ingrese el nombre del documento o requisito.', 'warning');
      return;
    }

    const newItem: ChecklistTemplateItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: newLabel.trim(),
      category: newCategory,
      checked: newDefaultChecked
    };

    setTemplates(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newItem]
    }));

    setNewLabel('');
    setNewDefaultChecked(false);
  };

  const handleDeleteItem = (id: string, label: string) => {
    Swal.fire({
      title: '¿Eliminar requisito?',
      text: `¿Desea quitar "${label}" de esta plantilla?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then(res => {
      if (res.isConfirmed) {
        setTemplates(prev => ({
          ...prev,
          [activeTab]: prev[activeTab].filter(i => i.id !== id)
        }));
      }
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const list = [...currentList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    setTemplates(prev => ({
      ...prev,
      [activeTab]: list
    }));
  };

  const startEdit = (item: ChecklistTemplateItem) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditCategory(item.category || COMMON_CATEGORIES[0]);
  };

  const saveEdit = (id: string) => {
    if (!editLabel.trim()) return;
    setTemplates(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(i => i.id === id ? { ...i, label: editLabel.trim(), category: editCategory } : i)
    }));
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config/checklist-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ templates })
      });
      const data = await res.json();
      if (data && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Plantillas Guardadas',
          text: 'Las listas de verificación oficiales se actualizaron correctamente.',
          timer: 2000,
          showConfirmButton: false
        });
        if (onSaved) onSaved();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar la configuración.', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Fallo de conexión al servidor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    Swal.fire({
      title: '¿Restablecer Predeterminados?',
      text: 'Se restablecerán los documentos sugeridos oficiales para Retiro y Matrícula.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restablecer',
      cancelButtonText: 'Cancelar'
    }).then(async res => {
      if (res.isConfirmed) {
        // Enviar plantilla vacía o recargar base
        loadTemplates();
        Swal.fire('Restablecido', 'Plantillas recargadas a los valores originales.', 'info');
      }
    });
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: isModal ? '16px' : '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
      {/* CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#1e1b4b', margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck size={22} color="#4f46e5" /> Configuración de Requisitos y Checklists Oficiales
          </h3>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.825rem' }}>
            Personaliza la lista de documentos exigidos y entregados al matricular o retirar un estudiante en el establecimiento.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.45rem 0.8rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={13} /> Restablecer
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            style={{
              background: '#4f46e5',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#ffffff',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>

          {isModal && onClose && (
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* SELECTOR DE PLANTILLA (RETIRO / MATRÍCULA NUEVO / MATRÍCULA ANTIGUO) */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('withdrawal')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            background: activeTab === 'withdrawal' ? '#ef4444' : '#f8fafc',
            color: activeTab === 'withdrawal' ? '#ffffff' : '#64748b',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: activeTab === 'withdrawal' ? '#dc2626' : '#cbd5e1'
          }}
        >
          🚪 1. Documentos de Retiro Escolar ({templates.withdrawal?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enrollment_new')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            background: activeTab === 'enrollment_new' ? '#10b981' : '#f8fafc',
            color: activeTab === 'enrollment_new' ? '#ffffff' : '#64748b',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: activeTab === 'enrollment_new' ? '#059669' : '#cbd5e1'
          }}
        >
          🌟 2. Matrícula: Estudiante Nuevo ({templates.enrollment_new?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enrollment_old')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            background: activeTab === 'enrollment_old' ? '#3b82f6' : '#f8fafc',
            color: activeTab === 'enrollment_old' ? '#ffffff' : '#64748b',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: activeTab === 'enrollment_old' ? '#2563eb' : '#cbd5e1'
          }}
        >
          🔄 3. Matrícula: Estudiante Antiguo ({templates.enrollment_old?.length || 0})
        </button>
      </div>

      {/* FORMULARIO AGREGAR REQUISITO */}
      <form onSubmit={handleAddItem} style={{
        background: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
            ➕ Nuevo Documento o Requisito a Exigir:
          </label>
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Ej: Certificado de Residencia / Evaluación Fonoaudiológica"
            style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
            Categoría / Área:
          </label>
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600 }}
          >
            {COMMON_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.5rem' }}>
          <input
            type="checkbox"
            id="newDefaultChecked"
            checked={newDefaultChecked}
            onChange={e => setNewDefaultChecked(e.target.checked)}
            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <label htmlFor="newDefaultChecked" style={{ fontSize: '0.78rem', color: '#475569', cursor: 'pointer', userSelect: 'none', fontWeight: 600 }}>
            Marcado por defecto
          </label>
        </div>

        <button
          type="submit"
          style={{
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Plus size={15} /> Agregar Requisito
        </button>
      </form>

      {/* TABLA DE REQUISITOS CONFIGURADOS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando requisitos...</div>
      ) : currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          No hay documentos configurados para esta lista. Agrega uno arriba o restablece los predeterminados.
        </div>
      ) : (
        <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem', width: '70px', textAlign: 'center' }}>Orden</th>
                <th style={{ padding: '0.6rem 0.75rem' }}>Documento / Requisito</th>
                <th style={{ padding: '0.6rem 0.75rem', width: '140px' }}>Área</th>
                <th style={{ padding: '0.6rem 0.75rem', width: '110px', textAlign: 'center' }}>Por Defecto</th>
                <th style={{ padding: '0.6rem 0.75rem', width: '110px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map((item, idx) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfc' }}>
                    {/* ORDEN */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '2px' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'up')}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px',
                            cursor: idx === 0 ? 'default' : 'pointer',
                            color: idx === 0 ? '#cbd5e1' : '#4f46e5'
                          }}
                          title="Subir orden"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentList.length - 1}
                          onClick={() => handleMove(idx, 'down')}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px',
                            cursor: idx === currentList.length - 1 ? 'default' : 'pointer',
                            color: idx === currentList.length - 1 ? '#cbd5e1' : '#4f46e5'
                          }}
                          title="Bajar orden"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>

                    {/* DOCUMENTO / REQUISITO */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          style={{ width: '100%', padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid #3b82f6', fontSize: '0.82rem' }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {item.label}
                        </span>
                      )}
                    </td>

                    {/* CATEGORÍA */}
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {isEditing ? (
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                          style={{ width: '100%', padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid #3b82f6', fontSize: '0.8rem' }}
                        >
                          {COMMON_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600 }}>
                          {item.category || 'General'}
                        </span>
                      )}
                    </td>

                    {/* POR DEFECTO */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={e => {
                          const checkedVal = e.target.checked;
                          setTemplates(prev => ({
                            ...prev,
                            [activeTab]: prev[activeTab].map(i => i.id === item.id ? { ...i, checked: checkedVal } : i)
                          }));
                        }}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        title="Marcar si este documento normalmente viene listo por defecto"
                      />
                    </td>

                    {/* ACCIONES */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(item.id)}
                              style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                              title="Guardar"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                              title="Cancelar"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              style={{ background: '#f8fafc', color: '#4f46e5', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                              title="Editar texto"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.label)}
                              style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '4px', padding: '3px 6px', cursor: 'pointer' }}
                              title="Eliminar requisito"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PIE INFORMATIVO */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Info size={14} color="#6366f1" /> Los cambios guardados se aplicarán automáticamente a cada nuevo checklist que se genere en el Liceo.
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveAll}
          style={{
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Save size={13} /> {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>
    </div>
  );
};
