import React, { useState, useEffect } from 'react';
import { Globe, ExternalLink, Smartphone, Monitor, BookOpen, Award, CheckCircle } from 'lucide-react';

interface LinkItem {
  id: string;
  name: string;
  url: string;
  image?: string;
  color?: string;
  category?: string;
}

interface Props {
  token?: string;
  userName?: string;
  userRole?: string;
  customSubtitle?: string;
}

const DEFAULT_LINKS: LinkItem[] = [];

export const InstitutionalPlatformsSection: React.FC<Props> = ({ token, userName, userRole, customSubtitle }) => {
  // Las plataformas de interés y gestión interna (evaluaciones, uso de sala, lira, etc.) NO deben ser visibles para Apoderados
  if (userRole === 'Apoderado') {
    return null;
  }

  const [links, setLinks] = useState<LinkItem[]>(DEFAULT_LINKS);

  useEffect(() => {
    if (!token) return;
    fetch('/api/institutional-links', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setLinks(data.map((l, idx) => ({
            id: l.id || String(idx + 1),
            name: l.name || l.title,
            url: l.url,
            image: l.image || DEFAULT_LINKS[idx % DEFAULT_LINKS.length]?.image || '/platform_images/mobile_devices.jpg',
            color: l.color || DEFAULT_LINKS[idx % DEFAULT_LINKS.length]?.color || 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            category: l.category || DEFAULT_LINKS[idx % DEFAULT_LINKS.length]?.category || 'Plataforma Institucional'
          })));
        }
      })
      .catch(() => {});
  }, [token]);

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* BANNER MULTICOLOR EXACTO A LA IMAGEN DE REFERENCIA */}
      <div style={{
        background: 'linear-gradient(135deg, #d97706 0%, #ca8a04 40%, #16a34a 100%)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: '0 10px 20px -5px rgba(217, 119, 6, 0.3)'
      }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          ¡Hola, {userName || 'Usuario'}!
        </h1>
        <p style={{ fontSize: '0.95rem', opacity: 0.95, margin: '0.4rem 0 0 0', fontWeight: 500 }}>
          {customSubtitle || `Panel de ${userRole || 'Acceso'} • Liceo Pro / LTP v2.0`}
        </p>
      </div>

      {/* TÍTULO CON ÍCONO DE GLOBE DE LA IMAGEN DE REFERENCIA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Globe size={22} color="#d97706" />
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Plataformas de Interés
        </h2>
      </div>

      {/* GRID DE TARJETAS MULTICOLOR CON IMÁGENES TEMÁTICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        {links.map((item, idx) => {
          const defaultRef = DEFAULT_LINKS[idx % Math.max(1, DEFAULT_LINKS.length)];
          const bgGradient = item.color || defaultRef?.color || 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)';
          const imgUrl = item.image || defaultRef?.image || '/platform_images/mobile_devices.jpg';
          const lowerName = (item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const isInternalEval = lowerName.includes('evaluacion') || item.url === '/evaluaciones-pie';
          const isInternalLab = lowerName.includes('computacion') || lowerName.includes('sala de comput') || item.url === '/sala-computacion';

          return (
            <div
              key={item.id || idx}
              onClick={() => {
                if (isInternalEval) {
                  window.dispatchEvent(new CustomEvent('ltp_navigate_tab', { detail: 'evaluations_pie' }));
                  return;
                }
                if (isInternalLab) {
                  window.dispatchEvent(new CustomEvent('ltp_navigate_tab', { detail: 'computer_lab' }));
                  return;
                }
                window.open(item.url, '_blank');
              }}
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.12)',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.25 ease, boxShadow 0.25 ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 20px 30px -10px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.12)';
              }}
            >
              {/* VISTA DE LA IMAGEN TEMÁTICA DE LA PLATAFORMA */}
              <div style={{ position: 'relative', height: '140px', overflow: 'hidden', background: '#0f172a' }}>
                <img
                  src={imgUrl}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '0.6rem',
                  left: '0.6rem',
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(4px)',
                  color: '#ffffff',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  {isInternalEval || isInternalLab ? 'Módulo Interno Integrado' : (item.category || defaultRef?.category || 'Plataforma Institucional')}
                </div>
              </div>

              {/* PIE DE TARJETA CON GRADIENTE Y BOTÓN DE ACCESO */}
              <div style={{
                background: bgGradient,
                padding: '1.25rem',
                color: '#ffffff',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.05rem', fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
                  {item.name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.1rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    Acceder →
                  </span>
                  <ExternalLink size={16} opacity={0.9} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
