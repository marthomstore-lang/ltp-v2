import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  style
}) => {
  return (
    <div
      className="page-header-ui"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        marginBottom: '1.5rem',
        ...style
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#64748b' }}>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: '#cbd5e1' }}>/</span>}
              {b.onClick ? (
                <button
                  type="button"
                  onClick={b.onClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#4f46e5',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 'inherit'
                  }}
                >
                  {b.label}
                </button>
              ) : (
                <span style={{ fontWeight: i === breadcrumbs.length - 1 ? 700 : 500, color: i === breadcrumbs.length - 1 ? '#0f172a' : '#64748b' }}>
                  {b.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h1
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '1.55rem',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.2
              }}
            >
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: '0.86rem',
                color: '#64748b',
                margin: '0.25rem 0 0',
                lineHeight: 1.45
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div
            className="page-header-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              flexWrap: 'wrap'
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
