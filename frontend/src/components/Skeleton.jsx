import { motion } from 'framer-motion';

function SkeletonBlock({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--card-border)',
        ...style,
      }}
    />
  );
}

export default function DashboardSkeleton() {
  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* Title skeleton */}
      <div style={{ marginBottom: '2rem' }}>
        <SkeletonBlock width="60%" height="28px" style={{ marginBottom: '10px' }} />
        <SkeletonBlock width="40%" height="16px" />
      </div>

      {/* KPI cards skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <SkeletonBlock width="50%" height="12px" />
            <SkeletonBlock width="70%" height="32px" />
            <SkeletonBlock width="90%" height="12px" />
            <SkeletonBlock width="80%" height="12px" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {[1, 2].map(i => (
          <div key={i} style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <SkeletonBlock width="60%" height="16px" />
            <SkeletonBlock width="100%" height="180px" borderRadius="8px" />
          </div>
        ))}
      </div>

      {/* Narrative skeleton */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        <SkeletonBlock width="30%" height="14px" />
        <SkeletonBlock width="100%" height="12px" />
        <SkeletonBlock width="95%" height="12px" />
        <SkeletonBlock width="88%" height="12px" />
        <SkeletonBlock width="92%" height="12px" />
      </div>
    </div>
  );
}
