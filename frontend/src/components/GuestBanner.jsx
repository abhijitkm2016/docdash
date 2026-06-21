import { useState } from 'react'

export default function GuestBanner({ onSignIn }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#F8FAFC', borderTop: '1px solid #E2E8F0',
      padding: '12px 24px', zIndex: 30,
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <span style={{ fontSize: '13px', color: '#64748B' }}>
        Enjoying DocDash? Sign in to save this dashboard
        and access it anytime.
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onSignIn}
          style={{
            padding: '7px 16px', background: '#fff',
            border: '1px solid #2563EB', borderRadius: '7px',
            color: '#2563EB', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Sign in
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none', border: 'none',
            color: '#CBD5E1', fontSize: '16px',
            cursor: 'pointer', lineHeight: 1, padding: '0',
            fontFamily: 'inherit',
          }}
        >✕</button>
      </div>
    </div>
  )
}
