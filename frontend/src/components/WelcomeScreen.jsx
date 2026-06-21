export default function WelcomeScreen({ onSignIn, onContinueAsGuest }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - 60px)', padding: '24px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px',
        border: '1px solid #E2E8F0',
        padding: '48px 40px', width: '100%', maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          fontSize: '28px', fontWeight: 700, color: '#0F172A',
          marginBottom: '8px', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          <span>⚡</span><span>DocDash</span>
        </div>

        <p style={{
          fontSize: '15px', color: '#64748B',
          marginBottom: '32px', lineHeight: 1.6
        }}>
          Turn any document into an executive dashboard. Upload any document. Get KPI cards, charts,
          and AI analysis — instantly. Then ask questions about your data.
          Sign in to save and share your dashboards, or try it as a guest first.
        </p>

        <button
          onClick={onSignIn}
          style={{
            width: '100%', padding: '12px',
            background: '#2563EB', color: '#fff',
            border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', marginBottom: '12px',
            fontFamily: 'inherit',
          }}
        >
          Sign in or create account
        </button>

        <button
          onClick={onContinueAsGuest}
          style={{
            background: 'none', border: 'none',
            color: '#64748B', fontSize: '13px',
            cursor: 'pointer', textDecoration: 'underline',
            textUnderlineOffset: '3px', fontFamily: 'inherit',
          }}
        >
          Continue as Guest →
        </button>

        <div style={{
          marginTop: '32px', paddingTop: '24px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'center', gap: '24px'
        }}>
          {[
            { icon: '⚡', label: 'Instant Dashboard' },
            { icon: '📊', label: 'Visual Analytics' },
            { icon: '💬', label: 'Ask Your Data' }
          ].map(f => (
            <div key={f.label} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px'
            }}>
              <span style={{ fontSize: '18px' }}>{f.icon}</span>
              <span style={{
                fontSize: '10px', color: '#94A3B8',
                fontWeight: 500, letterSpacing: '0.03em'
              }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
