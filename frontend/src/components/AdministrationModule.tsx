import React, { useState } from 'react';
import { FileText, Plus, CheckCircle, Clock, Archive } from 'lucide-react';
import Swal from 'sweetalert2';

interface AdministrationModuleProps {
  token: string;
}

export const AdministrationModule: React.FC<AdministrationModuleProps> = ({ token }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Protocolo');
  const [responsible, setResponsible] = useState('');

  const loadDocuments = () => {
    fetch('/api/admin/documents', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setDocuments(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  React.useEffect(() => {
    loadDocuments();
  }, [token]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !responsible) return;

    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          type,
          title,
          responsible,
          status: 'Pendiente'
        })
      });

      if (!res.ok) throw new Error('Error al registrar documento');

      setShowModal(false);
      setTitle('');
      setResponsible('');
      Swal.fire('Documento Registrado', 'Se ingresó el documento a la gestión administrativa exitosamente.', 'success');
      loadDocuments();
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 700 }}>Gestión Documental y Protocolos Institucionales</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Archivo de Oficios, Resoluciones, Circulares y Reglamentos</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Nuevo Documento
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Título / Referencia</th>
              <th>Emisor / Responsable</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(d => (
              <tr key={d.id}>
                <td>{d.date}</td>
                <td><span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{d.type}</span></td>
                <td><strong>{d.title}</strong></td>
                <td>{d.responsible}</td>
                <td>
                  <span style={{ color: d.status === 'Finalizado' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', marginBottom: '1rem', color: '#4f46e5' }}>Registrar Documento Institucional</h3>
            <form onSubmit={handleAddDocument}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tipo de Documento</label>
                <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="Protocolo">Protocolo</option>
                  <option value="Oficio">Oficio</option>
                  <option value="Resolución">Resolución</option>
                  <option value="Reglamento">Reglamento</option>
                  <option value="Acta de Consejo">Acta de Consejo</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Título / Referencia</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Oficio N°12 Ord. SEP" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Responsable / Emisor</label>
                <input type="text" required value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nombre o Depto." style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn" style={{ background: '#cbd5e1' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Documento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
