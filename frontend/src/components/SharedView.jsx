import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useShares } from '../hooks/useShares'
import Dashboard from './Dashboard'
import DashboardSkeleton from './Skeleton'

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
    <div>
      <div style={{
        background: '#F0FDF4', borderBottom: '1px solid #BBF7D0',
        padding: '8px 24px', textAlign: 'center',
        fontSize: '12px', color: '#166534',
      }}>
        Loading shared dashboard...
      </div>
      <DashboardSkeleton />
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{ paddingBottom: '60px' }}
    >
      <div style={{
        background: '#F0FDF4', borderBottom: '1px solid #BBF7D0',
        padding: '8px 24px', textAlign: 'center',
        fontSize: '12px', color: '#166534',
      }}>
        This is a shared DocDash dashboard — read only.{' '}
        <a href="/" style={{ color: '#15803D', fontWeight: 500 }}>Create your own →</a>
      </div>
      <Dashboard data={doc.dashboard_data} readOnly={true} />

      {/* Watermark — growth loop for shared views */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '44px',
        background: '#0F172A',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        zIndex: 1000,
        padding: '0 20px',
      }}>
        <span style={{ fontSize: '13px', color: '#94A3B8' }}>Made with</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⚡ DocDash
        </span>
        <span style={{ width: '1px', height: '14px', background: '#334155' }} />
        <a
          href="https://docdash-dusky.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '13px', fontWeight: '600', color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.15s ease' }}
          onMouseEnter={e => e.currentTarget.style.color = '#60A5FA'}
          onMouseLeave={e => e.currentTarget.style.color = '#2563EB'}
        >
          Try it free →
        </a>
      </div>
    </motion.div>
  )
}
