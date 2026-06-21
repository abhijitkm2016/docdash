import { useState, useEffect, useRef } from 'react';

export default function RemixPopover({ onAutoRemix, onGuidedRemix, onClose, loading }) {
  const [instructions, setInstructions] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={styles.wrap}>
      <div style={styles.section}>
        <p style={styles.label}>Auto Remix</p>
        <p style={styles.desc}>Re-run AI analysis on the same document for a completely fresh perspective</p>
        <button
          onClick={() => { onAutoRemix(); onClose(); }}
          disabled={loading}
          style={{ ...styles.autoBtn, opacity: loading ? 0.5 : 1 }}
        >
          ⚡ Auto Remix
        </button>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <p style={styles.label}>Guided Remix</p>
        <p style={styles.desc}>Tell the AI what angle or focus to take</p>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="e.g. Focus on cash flow risks, highlight Q4 vs Q3 trends, lead with revenue..."
          style={styles.textarea}
          rows={3}
          disabled={loading}
        />
        <button
          onClick={() => { onGuidedRemix(instructions); onClose(); }}
          disabled={loading || !instructions.trim()}
          style={{
            ...styles.guidedBtn,
            opacity: loading || !instructions.trim() ? 0.5 : 1,
            cursor: loading || !instructions.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          🔀 Remix with this
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    width: 288,
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.75rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    zIndex: 200,
    overflow: 'hidden',
  },
  section: { padding: '14px 16px' },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 4px',
  },
  desc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: '0 0 10px',
    lineHeight: 1.45,
  },
  autoBtn: {
    width: '100%',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  divider: {
    height: 1,
    background: 'var(--card-border)',
  },
  textarea: {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    resize: 'vertical',
    marginBottom: '8px',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    outline: 'none',
  },
  guidedBtn: {
    width: '100%',
    background: 'var(--card-bg)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--card-border)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
