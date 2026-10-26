import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  borderAccent?: 'none' | 'primary' | 'success' | 'warning' | 'danger';
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hoverable = false,
  borderAccent = 'none',
  className = '',
  style,
  ...props
}) => {
  const paddingStyles: Record<string, string> = {
    none: '0',
    sm: '0.9rem 1.1rem',
    md: '1.25rem 1.5rem',
    lg: '1.65rem 1.85rem'
  };

  const accentBorders: Record<string, string> = {
    none: 'none',
    primary: '4px solid #4f46e5',
    success: '4px solid #10b981',
    warning: '4px solid #f59e0b',
    danger: '4px solid #ef4444'
  };

  return (
    <div
      {...props}
      className={`card-ui ${hoverable ? 'card-hoverable' : ''} ${className}`}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        borderLeft: borderAccent !== 'none' ? accentBorders[borderAccent] : '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
        padding: paddingStyles[padding],
        boxSizing: 'border-box',
        transition: hoverable ? 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease-out, border-color 0.2s ease-out' : 'none',
        ...style
      }}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ title, subtitle, action, style }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '1rem',
      marginBottom: subtitle ? '1rem' : '0.75rem',
      flexWrap: 'wrap',
      ...style
    }}
  >
    <div style={{ flex: 1, minWidth: '200px' }}>
      <h3
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.15rem',
          fontWeight: 700,
          color: '#0f172a',
          margin: 0,
          letterSpacing: '-0.01em'
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
          {subtitle}
        </p>
      )}
    </div>
    {action && <div style={{ flexShrink: 0 }}>{action}</div>}
  </div>
);
