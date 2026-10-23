import React from 'react';
import { FolderSearch } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style
}) => {
  return (
    <div
      className="empty-state-ui"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px dashed #cbd5e1',
        margin: '1rem 0',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: '#f1f5f9',
          color: '#6366f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}
      >
        {icon || <FolderSearch size={28} />}
      </div>

      <h4
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '1.15rem',
          fontWeight: 700,
          color: '#0f172a',
          margin: '0 0 0.35rem 0'
        }}
      >
        {title}
      </h4>

      {description && (
        <p
          style={{
            fontSize: '0.85rem',
            color: '#64748b',
            maxWidth: '460px',
            margin: '0 0 1.25rem 0',
            lineHeight: 1.5
          }}
        >
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
