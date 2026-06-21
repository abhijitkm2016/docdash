import { useState, useRef, useEffect } from 'react'
import { useShares } from '../hooks/useShares'
import AuthGate from './AuthGate'

export default function ShareButton({ documentId, isAuthenticated, onRequestSignIn }) {
  const { createShare } = useShares()
  const [shareUrl, setShareUrl] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [showGate, setShowGate] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setShowGate(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Guest: show Share button → AuthGate on click (no documentId needed)
  if (!isAuthenticated) {
    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setShowGate(o => !o)}
          style={btnStyle}
        >
          ↗ Share
        </button>
        {showGate && (
          <AuthGate
            action="share"
            onSignIn={() => { setShowGate(false); onRequestSignIn?.() }}
            onDismiss={() => setShowGate(false)}
          />
        )}
      </div>
    )
  }

  // Authenticated but no document saved yet — nothing to share
  if (!documentId) return null

  const handleShare = async () => {
    setLoading(true)
    const share = await createShare(documentId)
    if (share) {
      setShareUrl(`${window.location.origin}/share/${share.share_token}`)
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (shareUrl) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        readOnly
        value={shareUrl}
        style={{
          fontSize: '12px', padding: '5px 10px',
          borderRadius: '6px', border: '1px solid #E2E8F0',
          color: '#475569', background: '#F8FAFC',
          width: '220px', outline: 'none',
        }}
      />
      <button onClick={handleCopy} style={{
        fontSize: '12px', padding: '5px 10px',
        borderRadius: '6px', border: '1px solid #E2E8F0',
        background: copied ? '#F0FDF4' : '#fff',
        color: copied ? '#16A34A' : '#475569',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      style={{
        ...btnStyle,
        cursor: loading ? 'wait' : 'pointer',
      }}
    >
      {loading ? 'Generating...' : '↗ Share'}
    </button>
  )
}

const btnStyle = {
  fontSize: '12px', padding: '5px 12px',
  borderRadius: '6px', border: '1px solid var(--card-border)',
  background: 'var(--card-bg)', color: 'var(--text-secondary)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '5px',
  fontFamily: 'inherit', fontWeight: 500,
}
