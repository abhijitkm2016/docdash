import { getAuthHeaders } from '../lib/authHeaders'
import { useState } from 'react'
import { useCredits } from '../hooks/useCredits'

const PLANS = [
  {
    id: 'per_gen',
    name: 'Per Generation',
    price: 59,
    credits: 1,
    description: 'Pay as you go',
    perCredit: '₹59 per dashboard',
    highlight: false,
    badge: null
  },
  {
    id: 'starter',
    name: 'Starter Pack',
    price: 199,
    credits: 5,
    description: '5 dashboards',
    perCredit: '₹39.80 per dashboard',
    highlight: false,
    badge: 'Save 33%'
  },
  {
    id: 'value',
    name: 'Value Pack',
    price: 499,
    credits: 15,
    description: '15 dashboards',
    perCredit: '₹33.27 per dashboard',
    highlight: true,
    badge: 'Most Popular'
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    price: 999,
    credits: 40,
    description: '40 dashboards',
    perCredit: '₹24.97 per dashboard',
    highlight: false,
    badge: 'Save 58%'
  }
]

export default function PricingModal({ onClose, onSuccess }) {
  const { redeemPromoCode } = useCredits()
  const [loading, setLoading] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoMessage, setPromoMessage] = useState(null)
  const [showPromo, setShowPromo] = useState(false)
  const [processingPlan, setProcessingPlan] = useState(null)

  const handlePurchase = async (plan) => {
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!razorpayKey || razorpayKey === 'undefined') {
      console.error('Razorpay key not configured')
      alert('Payment configuration error. Please try again later.')
      return
    }

    setProcessingPlan(plan.id)
    setLoading(true)
    try {
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ planId: plan.id })
      })
      const orderData = await orderRes.json()
      if (!orderData.orderId) throw new Error('Order creation failed')

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: 'INR',
        name: 'DocDash',
        description: plan.name,
        order_id: orderData.orderId,
        theme: { color: '#2563EB' },
        handler: async (response) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id
            })
          })
          const verifyData = await verifyRes.json()
          if (verifyData.success) {
            // Credits were granted by the server; nothing to write from the browser.
            onSuccess(verifyData.credits, plan.name)
            onClose()
          } else {
            alert(verifyData.error || 'Payment verification failed. If you were charged, contact support with your payment ID.')
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            setProcessingPlan(null)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error('Payment failed:', error)
      setLoading(false)
      setProcessingPlan(null)
    }
  }

  const handlePromoRedeem = async () => {
    if (!promoInput.trim()) return
    const result = await redeemPromoCode(promoInput)
    setPromoMessage(result)
    if (result.success) {
      setTimeout(() => {
        onSuccess(result.creditsGranted, 'Promo Code')
        onClose()
      }, 1500)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={styles.close}>×</button>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            ⚡ Get more credits
          </div>
          <div style={{ fontSize: '14px', color: '#64748B' }}>
            Credits never expire. Use them anytime.
          </div>
        </div>

        <div style={styles.plansGrid}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              ...styles.planCard,
              border: plan.highlight ? '2px solid #2563EB' : '1px solid #E2E8F0',
              background: plan.highlight ? '#EFF6FF' : '#fff',
            }}>
              {plan.badge && (
                <div style={{
                  ...styles.badge,
                  background: plan.highlight ? '#2563EB' : '#0F172A',
                }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                {plan.name}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                ₹{plan.price}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>
                {plan.perCredit}
              </div>
              <button
                onClick={() => handlePurchase(plan)}
                disabled={loading}
                style={{
                  width: '100%', padding: '8px',
                  background: plan.highlight ? '#2563EB' : '#F8FAFC',
                  color: plan.highlight ? '#fff' : '#475569',
                  border: plan.highlight ? 'none' : '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px', fontWeight: 600,
                  cursor: loading ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {processingPlan === plan.id
                  ? 'Opening…'
                  : `Buy ${plan.credits} credit${plan.credits > 1 ? 's' : ''}`}
              </button>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
          {!showPromo ? (
            <button
              onClick={() => setShowPromo(true)}
              style={styles.promoToggle}
            >
              Have a promo code?
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  onKeyDown={e => e.key === 'Enter' && handlePromoRedeem()}
                  style={styles.promoInput}
                />
                <button onClick={handlePromoRedeem} style={styles.promoBtn}>
                  Apply
                </button>
              </div>
              {promoMessage && (
                <div style={{
                  fontSize: '12px', textAlign: 'center',
                  color: promoMessage.success ? '#16A34A' : '#DC2626',
                  fontWeight: 500
                }}>
                  {promoMessage.success ? '✓ ' : '✕ '}
                  {promoMessage.message}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#94A3B8' }}>
          Payments secured by Razorpay · Credits never expire · Restored automatically on errors
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  },
  box: {
    background: '#fff', borderRadius: '20px',
    padding: '32px', width: '100%', maxWidth: '560px',
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
    position: 'relative',
  },
  close: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'none', border: 'none', fontSize: '20px',
    cursor: 'pointer', color: '#94A3B8', lineHeight: 1,
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px', marginBottom: '20px',
  },
  planCard: {
    borderRadius: '12px', padding: '16px',
    position: 'relative', cursor: 'pointer',
  },
  badge: {
    position: 'absolute', top: '-10px',
    left: '50%', transform: 'translateX(-50%)',
    color: '#fff', fontSize: '10px', fontWeight: 700,
    padding: '2px 10px', borderRadius: '100px',
    whiteSpace: 'nowrap', letterSpacing: '0.05em',
  },
  promoToggle: {
    background: 'none', border: 'none',
    color: '#2563EB', fontSize: '13px',
    cursor: 'pointer', textDecoration: 'underline',
    textUnderlineOffset: '3px', display: 'block',
    margin: '0 auto', fontFamily: 'inherit',
  },
  promoInput: {
    flex: 1, padding: '9px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px', fontSize: '13px',
    outline: 'none', fontFamily: 'inherit',
    letterSpacing: '0.05em', textTransform: 'uppercase',
  },
  promoBtn: {
    padding: '9px 16px', background: '#0F172A',
    color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
  },
}
