import React from 'react';

export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}> = ({ width = '100%', height = '16px', borderRadius = '8px', style }) => (
  <div
    className="skeleton-shimmer"
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: '#e2e8f0',
      ...style
    }}
  />
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div style={{ width: '100%', overflowX: 'auto', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, c) => (
            <th key={c} style={{ padding: '0.9rem 1.25rem' }}>
              <Skeleton height="14px" width="70%" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} style={{ padding: '0.9rem 1.25rem' }}>
                <Skeleton height="15px" width={c === 0 ? '40%' : c === 1 ? '60%' : '85%'} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const CardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.5rem'
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '1.35rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <Skeleton width="45%" height="12px" />
          <Skeleton width="34px" height="34px" borderRadius="10px" />
        </div>
        <Skeleton width="60%" height="28px" borderRadius="6px" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="80%" height="12px" />
      </div>
    ))}
  </div>
);
