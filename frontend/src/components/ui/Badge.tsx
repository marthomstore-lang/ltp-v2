import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  className = '',
  style
}) => {
  const variantStyles: Record<string, { bg: string; text: string; border: string; dotColor: string }> = {
    success: {
      bg: '#ecfdf5',
      text: '#065f46',
      border: '#a7f3d0',
      dotColor: '#10b981'
    },
    warning: {
      bg: '#fffbeb',
      text: '#92400e',
      border: '#fde68a',
      dotColor: '#f59e0b'
    },
    danger: {
      bg: '#fff1f2',
      text: '#9f1239',
      border: '#fecdd3',
      dotColor: '#f43f5e'
    },
    info: {
      bg: '#eff6ff',
      text: '#1e40af',
      border: '#bfdbfe',
      dotColor: '#3b82f6'
    },
    purple: {
      bg: '#f5f3ff',
      text: '#5b21b6',
      border: '#ddd6fe',
      dotColor: '#8b5cf6'
    },
    neutral: {
      bg: '#f1f5f9',
      text: '#334155',
      border: '#cbd5e1',
      dotColor: '#64748b'
    }
  };

  const current = variantStyles[variant] || variantStyles.neutral;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      fontSize: '0.7rem',
      padding: '0.15rem 0.5rem',
      gap: '0.3rem'
    },
    md: {
      fontSize: '0.76rem',
      padding: '0.22rem 0.65rem',
      gap: '0.38rem'
    }
  };

  return (
    <span
      className={`badge-ui badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 700,
        borderRadius: '9999px',
        border: `1px solid ${current.border}`,
        backgroundColor: current.bg,
        color: current.text,
        letterSpacing: '0.015em',
        lineHeight: 1.25,
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        boxSizing: 'border-box',
        ...sizeStyles[size],
        ...style
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: current.dotColor,
            flexShrink: 0,
            animation: pulse ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
          }}
        />
      )}
      {icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
