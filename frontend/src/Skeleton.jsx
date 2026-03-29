import React from 'react';

export default function Skeleton({ width = '100%', height = '20px', borderRadius = '8px', style = {} }) {
  return (
    <div 
      className="skeleton-box" 
      style={{ width, height, borderRadius, ...style }}
    ></div>
  );
}

export function SkeletonRow({ count = 1, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height="40px" />
      ))}
    </div>
  );
}
