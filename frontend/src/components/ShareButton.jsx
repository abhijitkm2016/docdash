import { useState } from 'react'
import { useShares } from '../hooks/useShares'

export default function ShareButton({ documentId }) {
  const { createShare } = useShares()
  const [shareUrl, setShareUrl] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState(false)

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
        cursor: 'pointer',
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
        fontSize: '12px', padding: '5px 12px',
        borderRadius: '6px', border: '1px solid var(--card-border)',
        background: 'var(--card-bg)', color: 'var(--text-secondary)',
        cursor: loading ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '5px',
        fontFamily: 'inherit', fontWeight: 500,
      }}
    >
      {loading ? 'Generating...' : '↗ Share'}
    </button>
  )
}
