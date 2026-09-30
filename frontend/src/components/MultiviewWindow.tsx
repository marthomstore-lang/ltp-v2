import React, { useState, useEffect } from 'react';
import { Monitor, QrCode, RefreshCw } from 'lucide-react';

interface MultiviewWindowProps {
  sessionCode: string;
  onClose: () => void;
}

export const MultiviewWindow: React.FC<MultiviewWindowProps> = ({ sessionCode, onClose }) => {
  const [liveData, setLiveData] = useState<any>({
    interviewee_name: 'Juan Pérez',
    objective: 'Revisión de rendimiento y compromisos de convivencia',
    agreements: '1. Asistir puntualmente a clases.\n2. Cumplir con entregas de taller.',
    status: 'En Redacción Live'
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Polling de sincronización en tiempo real (GET /api/multiview/live?session=XXX)
      fetch(`/api/multiview/live?session=${sessionCode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.interviewee_name) {
            setLiveData(data);
          }
        })
        .catch(() => {});
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionCode]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0f172a', color: '#ffffff', zIndex: 2000, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Monitor size={32} color="#818cf8" />
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem' }}>Pantalla Dual en Vivo — Liceo Técnico Profesional Campanario Marcos Delucchi Fonck</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ background: '#1e1b4b', color: '#818cf8', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
            Sesión QR: {sessionCode}
          </span>
          <button onClick={onClose} className="btn" style={{ background: '#ef4444', color: 'white' }}>Cerrar Multivista</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Panel de Visualización del Entrevistado */}
        <div style={{ background: '#1e293b', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.4rem' }}>ENTREVISTADO / ALUMNO</h3>
            <h2 style={{ fontSize: '1.75rem', color: '#38bdf8' }}>{liveData.interviewee_name}</h2>
          </div>

          <div>
            <h3 style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.4rem' }}>OBJETIVO DE LA REUNIÓN</h3>
            <p style={{ fontSize: '1.1rem', background: '#0f172a', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #818cf8' }}>
              {liveData.objective}
            </p>
          </div>

          <div>
            <h3 style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.4rem' }}>COMPROMISOS Y ACUERDOS (EN TIEMPO REAL)</h3>
            <div style={{ fontSize: '1.1rem', whiteSpace: 'pre-wrap', background: '#0f172a', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              {liveData.agreements}
            </div>
          </div>
        </div>

        {/* Panel Lateral QR y Estado */}
        <div style={{ background: '#1e293b', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            {/* Simulación QR Code */}
            <div style={{ width: '160px', height: '160px', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', borderRadius: '8px', fontWeight: 700 }}>
              <QrCode size={120} color="#ffffff" />
            </div>
          </div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Escanea con tu Móvil</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Abre la pantalla secundaria desde cualquier dispositivo de la red</p>
        </div>
      </div>
    </div>
  );
};
