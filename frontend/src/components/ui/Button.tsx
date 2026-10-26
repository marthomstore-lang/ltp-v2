import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontWeight: 600,
    borderRadius: '10px',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.65 : 1,
    transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease-out, border-color 0.15s ease-out, box-shadow 0.15s ease-out, opacity 0.15s ease-out',
    textDecoration: 'none',
    border: '1px solid transparent',
    boxSizing: 'border-box',
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    outline: 'none',
    ...style
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: '0.38rem 0.75rem',
      fontSize: '0.78rem',
      minHeight: '32px'
    },
    md: {
      padding: '0.52rem 1.05rem',
      fontSize: '0.84rem',
      minHeight: '40px'
    },
    lg: {
      padding: '0.7rem 1.35rem',
      fontSize: '0.92rem',
      minHeight: '46px'
    }
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
      color: '#ffffff',
      borderColor: '#4338ca',
      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
    },
    secondary: {
      background: '#ffffff',
      color: '#0f172a',
      borderColor: '#e2e8f0',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)'
    },
    outline: {
      background: 'transparent',
      color: '#4f46e5',
      borderColor: '#c7d2fe'
    },
    ghost: {
      background: 'transparent',
      color: '#64748b',
      borderColor: 'transparent'
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      borderColor: '#dc2626',
      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
    },
    success: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
      borderColor: '#059669',
      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
    }
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`btn-ui btn-ui-${variant} btn-ui-${size} ${className}`}
      style={{
        ...baseStyles,
        ...sizeStyles[size],
        ...variantStyles[variant]
      }}
    >
      {loading ? (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.65s linear infinite'
          }}
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
};
