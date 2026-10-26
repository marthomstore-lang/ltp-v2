import React from 'react';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  trend,
  colorScheme = 'indigo',
  onClick
}) => {
  const schemes: Record<string, { iconBg: string; iconColor: string; borderHover: string }> = {
    indigo: { iconBg: '#eef2ff', iconColor: '#4f46e5', borderHover: '#c7d2fe' },
    emerald: { iconBg: '#ecfdf5', iconColor: '#059669', borderHover: '#a7f3d0' },
    amber: { iconBg: '#fffbeb', iconColor: '#d97706', borderHover: '#fde68a' },
    rose: { iconBg: '#fff1f2', iconColor: '#e11d48', borderHover: '#fecdd3' },
    sky: { iconBg: '#f0f9ff', iconColor: '#0284c7', borderHover: '#bae6fd' },
    purple: { iconBg: '#faf5ff', iconColor: '#7c3aed', borderHover: '#ddd6fe' }
  };

  const scheme = schemes[colorScheme] || schemes.indigo;

  return (
    <div
      onClick={onClick}
      className="stat-card-ui"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.35rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease-out, border-color 0.18s ease-out',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: scheme.iconBg,
            color: scheme.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {icon}
        </div>
      </div>

      <div>
        <div
          className="tabular-nums"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '1.9rem',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            margin: '0 0 0.35rem 0'
          }}
        >
          {value}
        </div>

        {(subtitle || trend) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {trend && (
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: trend.isPositive ? '#059669' : '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {subtitle && (
              <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
