export default function AuthGate({ action, onSignIn, onDismiss }) {
  return (
    <div style={{
      position: 'absolute', top: '100%', right: 0,
      marginTop: '8px', zIndex: 100,
      background: '#fff', borderRadius: '12px',
      border: '1px solid #E2E8F0', padding: '20px',
      width: '260px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)'
    }}>
      <div style={{
        fontSize: '13px', fontWeight: 600,
        color: '#0F172A', marginBottom: '6px'
      }}>
        Sign in to {action} this dashboard
      </div>
      <div style={{
        fontSize: '12px', color: '#64748B',
        marginBottom: '16px', lineHeight: 1.5
      }}>
        Create a free account to {action}, save, and
        access your dashboards anytime.
      </div>
      <button
        onClick={onSignIn}
        style={{
          width: '100%', padding: '9px',
          background: '#2563EB', color: '#fff',
          border: 'none', borderRadius: '8px',
          fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', marginBottom: '8px',
          fontFamily: 'inherit',
        }}
      >
        Sign in or create account
      </button>
      <button
        onClick={onDismiss}
        style={{
          width: '100%', padding: '6px',
          background: 'none', border: 'none',
          color: '#94A3B8', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Maybe later
      </button>
    </div>
  )
}
