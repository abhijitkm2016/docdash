import { useState, useRef, useEffect } from 'react';

export default function ProfileMenu({ user, onSignOut, onRequestSignIn }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <button
        onClick={onRequestSignIn}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          color: 'var(--text-secondary)',
          padding: '0.5rem 0.875rem',
          borderRadius: '0.5rem',
          fontWeight: 500,
          fontSize: '0.875rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
      >
        Sign in
      </button>
    );
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const email = user.email || '';
  const initials = (name || email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || email[0]?.toUpperCase() || '?';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        title={name || email}
        style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: '#2563EB', color: '#FFFFFF', border: 'none',
          fontSize: '13px', fontWeight: '700', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'opacity 0.15s ease',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {initials}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--card-bg)', border: '1.5px solid var(--card-border)',
          borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          minWidth: '200px', zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px' }}>
            {name && (
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {name}
              </p>
            )}
            <p style={{ margin: name ? '2px 0 0' : 0, fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {email}
            </p>
          </div>
          <div style={{ height: '1px', background: 'var(--card-border)' }} />
          <button
            onClick={() => { onSignOut(); setOpen(false); }}
            style={{
              display: 'block', width: '100%', padding: '10px 14px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              textAlign: 'left', fontSize: '13px', color: '#DC2626',
              fontWeight: 500, fontFamily: 'inherit',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--card-border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
