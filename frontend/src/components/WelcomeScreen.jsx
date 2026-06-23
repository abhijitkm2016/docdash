const PRICING = [
  {
    name: 'Free',
    price: '₹0',
    credits: '5 credits',
    perCredit: 'To try',
    highlight: false,
    badge: null
  },
  {
    name: 'Starter',
    price: '₹199',
    credits: '5 credits',
    perCredit: '₹39 each',
    highlight: false,
    badge: 'Save 33%'
  },
  {
    name: 'Value',
    price: '₹499',
    credits: '15 credits',
    perCredit: '₹33 each',
    highlight: true,
    badge: 'Popular'
  },
  {
    name: 'Pro',
    price: '₹999',
    credits: '40 credits',
    perCredit: '₹25 each',
    highlight: false,
    badge: 'Save 58%'
  }
]

export default function WelcomeScreen({ onSignIn, onContinueAsGuest }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
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

      {/* Pricing section */}
      <div style={{
        textAlign: 'center', margin: '24px 0 16px',
        fontSize: '12px', color: '#94A3B8',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        fontWeight: 500
      }}>
        Simple pricing — credits never expire
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        maxWidth: '420px',
        width: '100%',
        margin: '0 auto'
      }}>
        {PRICING.map(plan => (
          <div key={plan.name} style={{
            background: plan.highlight ? '#EFF6FF' : '#F8FAFC',
            border: plan.highlight
              ? '1px solid #BFDBFE'
              : '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '12px 8px',
            textAlign: 'center',
            position: 'relative'
          }}>
            {plan.badge && (
              <div style={{
                position: 'absolute', top: '-8px',
                left: '50%', transform: 'translateX(-50%)',
                background: plan.highlight ? '#2563EB' : '#64748B',
                color: '#fff', fontSize: '9px', fontWeight: 700,
                padding: '2px 6px', borderRadius: '100px',
                whiteSpace: 'nowrap', letterSpacing: '0.04em'
              }}>
                {plan.badge}
              </div>
            )}

            <div style={{
              fontSize: '11px', fontWeight: 600,
              color: plan.highlight ? '#1D4ED8' : '#64748B',
              marginBottom: '6px'
            }}>
              {plan.name}
            </div>

            <div style={{
              fontSize: '16px', fontWeight: 700,
              color: '#0F172A', marginBottom: '2px'
            }}>
              {plan.price}
            </div>

            <div style={{
              fontSize: '11px', color: '#64748B',
              marginBottom: '2px'
            }}>
              {plan.credits}
            </div>

            <div style={{
              fontSize: '10px', color: '#94A3B8'
            }}>
              {plan.perCredit}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        textAlign: 'center', marginTop: '12px',
        fontSize: '12px', color: '#94A3B8'
      }}>
        Or pay as you go — ₹59 per dashboard · No subscription
      </div>

      <div style={{
        textAlign: 'center', marginTop: '6px',
        fontSize: '11px', color: '#CBD5E1'
      }}>
        Start free · Credits never expire · Restored automatically on errors
      </div>

      <p style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        marginTop: '12px',
      }}>
        🔒 Your documents are never stored. Processed securely via Anthropic API.
      </p>
    </div>
  )
}
