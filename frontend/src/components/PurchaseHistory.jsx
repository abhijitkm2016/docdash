import { useTransactions } from '../hooks/useTransactions'

const TYPE_CONFIG = {
  purchase:    { label: 'Purchase',     color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  promo:       { label: 'Promo Code',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  free_tier:   { label: 'Free Credits', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  deduction:   { label: 'Used',         color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  restoration: { label: 'Restored',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
}

const PLAN_NAMES = {
  per_gen: 'Per Generation',
  starter: 'Starter Pack',
  value:   'Value Pack',
  pro:     'Pro Pack',
  promo:   'Promo Code',
  free:    'Free Tier',
}

function formatAmount(paise) {
  if (!paise) return null
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export default function PurchaseHistory() {
  const { transactions, loading } = useTransactions()

  if (loading) return (
    <div style={{ padding: '20px', color: '#94A3B8', fontSize: '13px', textAlign: 'center' }}>
      Loading history...
    </div>
  )

  if (transactions.length === 0) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
      <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
        No transactions yet.
      </p>
    </div>
  )

  const creditEvents = transactions.filter(t =>
    ['purchase', 'promo', 'free_tier'].includes(t.transaction_type)
  )
  const usageEvents = transactions.filter(t =>
    ['deduction', 'restoration'].includes(t.transaction_type)
  )

  return (
    <div style={{ padding: '8px' }}>
      {/* Credits & Purchases */}
      {creditEvents.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '10px', color: '#94A3B8', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0 8px', marginBottom: '8px',
          }}>
            Credits &amp; Purchases
          </div>
          {creditEvents.map(t => {
            const config = TYPE_CONFIG[t.transaction_type]
            return (
              <div key={t.id} style={{
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid ${config.border}`,
                background: config.bg, marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '2px' }}>
                      {t.plan_id ? (PLAN_NAMES[t.plan_id] || t.plan_id) : config.label}
                    </div>
                    {t.promo_code && (
                      <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                        {t.promo_code}
                      </div>
                    )}
                    {t.razorpay_payment_id && (
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                        ID: {t.razorpay_payment_id.slice(0, 20)}...
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                      {new Date(t.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: config.color }}>
                      +{t.credits_delta} credits
                    </div>
                    {formatAmount(t.amount_paise) && (
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {formatAmount(t.amount_paise)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Usage */}
      {usageEvents.length > 0 && (
        <div>
          <div style={{
            fontSize: '10px', color: '#94A3B8', fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0 8px', marginBottom: '8px',
          }}>
            Usage
          </div>
          {usageEvents.map(t => {
            const config = TYPE_CONFIG[t.transaction_type]
            return (
              <div key={t.id} style={{
                padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #F1F5F9', background: '#FAFAFA',
                marginBottom: '4px', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                    {t.description || config.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {new Date(t.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
                <div style={{
                  fontSize: '12px', fontWeight: 600,
                  color: t.transaction_type === 'restoration' ? '#D97706' : '#94A3B8',
                }}>
                  {t.credits_delta > 0 ? '+' : ''}{t.credits_delta}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
