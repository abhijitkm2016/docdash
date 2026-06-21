import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export default function AuthModal({ onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.box} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button onClick={onClose} style={styles.close} aria-label="Close">×</button>

        <div style={styles.header}>
          <div style={styles.brand}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <span style={styles.brandName}>DocDash</span>
          </div>
          <p style={styles.subtitle}>
            Sign in to save dashboards and access document history
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563EB',
                  brandAccent: '#1D4ED8',
                },
              },
            },
            style: {
              button: { borderRadius: '8px' },
              anchor: { color: '#2563EB' },
            },
          }}
          providers={['google']}
          redirectTo={window.location.origin}
          magicLink={true}
        />
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  },
  box: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
  },
  close: {
    position: 'absolute', top: '16px', right: '16px',
    background: 'none', border: 'none',
    fontSize: '20px', cursor: 'pointer',
    color: '#94A3B8', lineHeight: 1,
  },
  header: { marginBottom: '24px' },
  brand: {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px',
  },
  brandName: { fontWeight: 700, fontSize: '18px', color: '#0F172A' },
  subtitle: { fontSize: '14px', color: '#64748B', margin: 0 },
}
