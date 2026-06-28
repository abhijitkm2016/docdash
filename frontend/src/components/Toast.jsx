import { useEffect } from 'react';

const VARIANTS = {
  success: {
    background: '#0F172A',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
    icon: '✓',
  },
  warning: {
    background: '#78350F',
    color: '#FDE68A',
    border: '1px solid #D97706',
    icon: '⚠',
  },
  error: {
    background: '#7F1D1D',
    color: '#FCA5A5',
    border: '1px solid #EF4444',
    icon: '✕',
  },
  info: {
    background: '#1E3A5F',
    color: '#BFDBFE',
    border: '1px solid #3B82F6',
    icon: 'ℹ',
  },
};

export default function Toast({
  message,
  variant = 'success',
  position = 'bottom',
  autoDismiss = true,
  dismissAfter = 3000,
  dismissible = false,
  onDismiss,
}) {
  const v = VARIANTS[variant] || VARIANTS.success;

  useEffect(() => {
    if (!autoDismiss || !onDismiss) return;
    const timer = setTimeout(onDismiss, dismissAfter);
    return () => clearTimeout(timer);
  }, [autoDismiss, dismissAfter, onDismiss]);

  const isTop = position === 'top';

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      style={{
        position: 'fixed',
        [isTop ? 'top' : 'bottom']: isTop ? '20px' : '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        background: v.background,
        color: v.color,
        border: v.border,
        padding: '10px 20px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        whiteSpace: 'nowrap',
        maxWidth: '90vw',
        animation: 'fadeInUp 0.2s ease',
      }}
    >
      <span style={{ flexShrink: 0 }}>{v.icon}</span>
      <span>{message}</span>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            color: v.color,
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: 1,
            padding: '0 0 0 8px',
            opacity: 0.7,
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
