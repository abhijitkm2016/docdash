import { useEffect, useState } from 'react'
import { useShares } from '../hooks/useShares'
import Dashboard from './Dashboard'

export default function SharedView({ shareToken }) {
  const { getSharedDocument } = useShares()
  const [doc,      setDoc]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const result = await getSharedDocument(shareToken)
      if (!result) setNotFound(true)
      else setDoc(result)
      setLoading(false)
    }
    load()
  }, [shareToken])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748B', fontSize: '14px' }}>
      Loading shared dashboard...
    </div>
  )

  if (notFound) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px' }}>
      <div style={{ fontSize: '32px' }}>⚡</div>
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>Dashboard not found</div>
      <div style={{ fontSize: '14px', color: '#64748B' }}>This share link may have expired or been deleted.</div>
      <a href="/" style={{ fontSize: '13px', color: '#2563EB' }}>Create your own dashboard →</a>
    </div>
  )

  return (
    <div>
      <div style={{
        background: '#F0FDF4', borderBottom: '1px solid #BBF7D0',
        padding: '8px 24px', textAlign: 'center',
        fontSize: '12px', color: '#166534',
      }}>
        This is a shared DocDash dashboard — read only.{' '}
        <a href="/" style={{ color: '#15803D', fontWeight: 500 }}>Create your own →</a>
      </div>
      <Dashboard data={doc.dashboard_data} readOnly={true} />
    </div>
  )
}
