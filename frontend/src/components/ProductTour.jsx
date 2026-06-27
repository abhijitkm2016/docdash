import { useState } from 'react';

export const TOUR_HOME_KEY       = 'docdash_tour_home_done';
export const TOUR_DASH_KEY       = 'docdash_tour_dashboard_done';
export const TOUR_HOME_COUNT_KEY = 'docdash_tour_home_count';
export const TOUR_DASH_COUNT_KEY = 'docdash_tour_dashboard_count';

const HOME_STEPS = [
  {
    emoji: '⚡',
    title: 'Welcome to DocDash',
    body: 'Upload any document — PDF, Word, or text — and DocDash turns it into a visual dashboard in seconds using AI.',
  },
  {
    emoji: '📊',
    title: 'Instant dashboards',
    body: 'DocDash extracts KPIs, charts, tables, and a narrative summary automatically. No templates, no manual setup.',
  },
  {
    emoji: '🔀',
    title: 'Remix your view',
    body: 'Not happy with the first cut? Hit Remix to generate a fresh perspective on the same document.',
  },
  {
    emoji: '🔬',
    title: 'Deep Analysis',
    body: 'Enable Deep Analysis for longer documents or when you need richer insights. It uses more context and costs 5 credits.',
  },
];

const DASH_STEPS = [
  {
    emoji: '📂',
    title: 'Document history',
    body: 'Your dashboards are saved automatically. Click the 📂 icon in the top bar to browse and reload past documents.',
  },
  {
    emoji: '🔀',
    title: 'Remix',
    body: 'Use the Remix button to regenerate the dashboard with a new angle. You can also give guided instructions to steer the output.',
  },
  {
    emoji: '📤',
    title: 'Export',
    body: 'Export your dashboard as HTML, PDF, or PowerPoint using the Export button in the top bar.',
  },
  {
    emoji: '🔗',
    title: 'Share',
    body: 'Click Share to copy a public link to this dashboard that anyone can view without signing in.',
  },
];

function TourModal({ steps, onComplete }) {
  const [step, setStep]           = useState(0);
  const [dontShow, setDontShow]   = useState(false);
  const current = steps[step];
  const isLast  = step === steps.length - 1;

  function finish() { onComplete(dontShow); }

  return (
    <div style={overlay} onClick={finish}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        {/* progress dots */}
        <div style={dotsRow}>
          {steps.map((_, i) => (
            <span
              key={i}
              onClick={() => setStep(i)}
              style={{ ...dot, background: i === step ? '#2563EB' : '#CBD5E1', cursor: 'pointer' }}
            />
          ))}
        </div>

        <div style={emojiEl}>{current.emoji}</div>
        <p style={titleEl}>{current.title}</p>
        <p style={bodyEl}>{current.body}</p>

        <div style={footer}>
          <label style={dontShowLabel}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Don't show again
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={btnSecondary}>Back</button>
            )}
            {!isLast ? (
              <button onClick={() => setStep(s => s + 1)} style={btnPrimary}>Next →</button>
            ) : (
              <button onClick={finish} style={btnPrimary}>Done ✓</button>
            )}
          </div>
        </div>

        <button onClick={finish} style={closeBtn} aria-label="Close tour">×</button>
      </div>
    </div>
  );
}

export function HomeTour({ onComplete }) {
  return <TourModal steps={HOME_STEPS} onComplete={onComplete} />;
}

export function DashboardTour({ onComplete }) {
  return <TourModal steps={DASH_STEPS} onComplete={onComplete} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(15,23,42,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000,
};

const modal = {
  background: 'var(--card-bg, #fff)',
  border: '1px solid var(--card-border, #E2E8F0)',
  borderRadius: '1rem',
  padding: '2rem 2rem 1.5rem',
  maxWidth: 420,
  width: '90%',
  position: 'relative',
  boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
  textAlign: 'center',
};

const dotsRow = {
  display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1.25rem',
};

const dot = {
  width: 8, height: 8, borderRadius: '50%', display: 'inline-block', transition: 'background 0.2s',
};

const emojiEl = { fontSize: '2.5rem', marginBottom: '0.5rem' };

const titleEl = {
  fontSize: '1.1rem', fontWeight: 700,
  color: 'var(--text-primary, #0F172A)',
  margin: '0 0 0.5rem',
};

const bodyEl = {
  fontSize: '0.9rem', lineHeight: 1.65,
  color: 'var(--text-secondary, #475569)',
  margin: '0 0 1.5rem',
};

const footer = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  borderTop: '1px solid var(--card-border, #E2E8F0)',
  paddingTop: '1rem', marginTop: '0.25rem', gap: 8,
};

const dontShowLabel = {
  display: 'flex', alignItems: 'center',
  fontSize: '12px', color: 'var(--text-secondary, #64748B)',
  cursor: 'pointer', userSelect: 'none',
};

const btnPrimary = {
  background: '#2563EB', color: '#fff',
  border: 'none', borderRadius: '0.5rem',
  padding: '7px 18px', fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};

const btnSecondary = {
  background: 'var(--surface, #F8FAFC)',
  color: 'var(--text-secondary, #475569)',
  border: '1px solid var(--card-border, #E2E8F0)',
  borderRadius: '0.5rem',
  padding: '7px 14px', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit',
};

const closeBtn = {
  position: 'absolute', top: '0.75rem', right: '1rem',
  background: 'none', border: 'none',
  fontSize: '1.4rem', lineHeight: 1,
  color: 'var(--text-muted, #94A3B8)', cursor: 'pointer',
};
