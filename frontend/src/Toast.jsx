import React, { useEffect, useState } from 'react'

// ── Toast item ────────────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in
    const showTimer = setTimeout(() => setVisible(true), 10)
    // Auto dismiss
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 350)
    }, toast.duration || 3500)
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
  }, [toast.id])

  const configs = {
    success: { bg: 'linear-gradient(135deg,#1a6b3c,#2ecc71)', border: '#2ecc71', icon: '✅' },
    error:   { bg: 'linear-gradient(135deg,#7b1414,#e74c3c)', border: '#e74c3c', icon: '❌' },
    warning: { bg: 'linear-gradient(135deg,#7a4a00,#f39c12)', border: '#f39c12', icon: '⚠️' },
    info:    { bg: 'linear-gradient(135deg,#0d2b6b,#667eea)', border: '#667eea', icon: '🏏' },
  }
  const cfg = configs[toast.type] || configs.info

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 350) }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.border}`,
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)`,
        cursor: 'pointer',
        minWidth: '280px',
        maxWidth: '400px',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{cfg.icon}</span>
      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: '700', fontSize: '13px', color: '#fff',
            marginBottom: toast.message ? '4px' : 0, letterSpacing: '0.3px'
          }}>
            {toast.title}
          </div>
        )}
        {toast.message && (
          <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
            {toast.message}
          </div>
        )}
      </div>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>×</span>
    </div>
  )
}

// ── Toast Container ───────────────────────────────────────────────────────────
export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}

// ── Hook ─────────────────────────────────────────────────────────────────────
let _addToast = null
export function setToastHandler(fn) { _addToast = fn }

export function toast(type, title, message, duration) {
  if (_addToast) _addToast({ type, title, message, duration })
  else console.log(`[Toast] ${type}: ${title} — ${message}`)
}

