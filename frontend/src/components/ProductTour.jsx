import { useState, useEffect, useCallback } from 'react';

export const TOUR_HOME_KEY = 'docdash_tour_home_done';
export const TOUR_DASH_KEY = 'docdash_tour_dashboard_done';

// ── Spotlight + Tooltip engine ────────────────────────────────────────────────
function TourOverlay({ steps, onComplete }) {
  const [index,  setIndex]  = useState(0);
  const [rect,   setRect]   = useState(null);
  const [visible, setVisible] = useState(false);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    if (!step?.selector) { setRect(null); return; }
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // slight delay so scroll settles before we measure
      setTimeout(() => setRect(el.getBoundingClientRect()), 220);
    } else {
      setRect(null);
    }
  }, [step?.selector]);

  useEffect(() => {
    setVisible(false);
    measure();
    const t = setTimeout(() => setVisible(true), 280);
    return () => clearTimeout(t);
  }, [index, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  function advance() {
    if (isLast) { onComplete(false); return; }
    setIndex(i => i + 1);
  }

  function finish(dontShow) {
    onComplete(dontShow);
  }

  const PAD    = 8;
  const TW     = 300;
  const TH_EST = 190;
  const VW     = window.innerWidth;
  const VH     = window.innerHeight;

  // Tooltip position — prefer below, fall back to above, clamp horizontally
  let tooltipTop  = 0;
  let tooltipLeft = 0;
  let arrowDir    = 'up'; // arrow points up (tooltip is below the target)

  if (rect) {
    const spaceBelow = VH - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow >= TH_EST + PAD * 2 || spaceBelow >= spaceAbove) {
      tooltipTop = rect.bottom + PAD + 6;
      arrowDir   = 'up';
    } else {
      tooltipTop = rect.top - TH_EST - PAD - 6;
      arrowDir   = 'down';
    }

    // Align tooltip centre to target centre, then clamp
    tooltipLeft = rect.left + rect.width / 2 - TW / 2;
    tooltipLeft = Math.max(PAD, Math.min(VW - TW - PAD, tooltipLeft));
  } else {
    // No target — center the tooltip
    tooltipTop  = VH / 2 - TH_EST / 2;
    tooltipLeft = VW / 2 - TW / 2;
    arrowDir    = null;
  }

  // Arrow horizontal offset relative to tooltip box
  const arrowLeft = rect
    ? Math.min(TW - 24, Math.max(12, rect.left + rect.width / 2 - tooltipLeft - 8))
    : TW / 2 - 8;

  return (
    <>
      {/* Dark backdrop — click to skip */}
      <div
        onClick={() => finish(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1999,
          background: 'rgba(10, 15, 30, 0.72)',
          transition: 'opacity 0.25s',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Spotlight cut-out around target */}
      {rect && (
        <div style={{
          position: 'fixed',
          top:    rect.top    - PAD,
          left:   rect.left   - PAD,
          width:  rect.width  + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 10,
          zIndex: 2000,
          pointerEvents: 'none',
          boxShadow: '0 0 0 9999px rgba(10, 15, 30, 0.72)',
          border: '2px solid rgba(99, 160, 255, 0.7)',
          transition: 'opacity 0.25s, top 0.25s, left 0.25s, width 0.25s, height 0.25s',
          opacity: visible ? 1 : 0,
        }} />
      )}

      {/* Tooltip */}
      <div style={{
        position: 'fixed',
        top:    tooltipTop,
        left:   tooltipLeft,
        width:  TW,
        zIndex: 2001,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.25s, transform 0.25s',
      }}>
        {/* Arrow */}
        {arrowDir === 'up' && (
          <div style={{
            position: 'absolute',
            top: -7,
            left: arrowLeft,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid #1E293B',
          }} />
        )}
        {arrowDir === 'down' && (
          <div style={{
            position: 'absolute',
            bottom: -7,
            left: arrowLeft,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #1E293B',
          }} />
        )}

        {/* Card */}
        <div style={{
          background: '#1E293B',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '16px 18px 14px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}>
          {/* Step counter */}
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: '#6B9BF4', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {index + 1} / {steps.length}
            {/* Progress bar */}
            <span style={{
              display: 'inline-block',
              marginLeft: 8,
              width: 60,
              height: 3,
              background: '#334155',
              borderRadius: 2,
              verticalAlign: 'middle',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <span style={{
                position: 'absolute', inset: 0,
                width: `${((index + 1) / steps.length) * 100}%`,
                background: '#6B9BF4',
                transition: 'width 0.3s ease',
              }} />
            </span>
          </div>

          {/* Title */}
          <p style={{
            margin: '0 0 6px',
            fontSize: 14, fontWeight: 700,
            color: '#F1F5F9', lineHeight: 1.3,
          }}>
            {step.title}
          </p>

          {/* Body */}
          <p style={{
            margin: '0 0 14px',
            fontSize: 12.5, color: '#94A3B8', lineHeight: 1.65,
          }}>
            {step.body}
          </p>

          {/* CTA hint if present */}
          {step.cta && (
            <p style={{
              margin: '0 0 12px',
              fontSize: 11.5,
              color: '#6B9BF4',
              fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>👆</span> {step.cta}
            </p>
          )}

          {/* Don't-show checkbox — last step only */}
          {isLast && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 12, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                id="dontShowAgain"
                style={{ cursor: 'pointer', accentColor: '#6B9BF4' }}
              />
              <span style={{ fontSize: 11, color: '#64748B' }}>Don't show this again</span>
            </label>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => finish(false)}
              style={{
                background: 'none', border: 'none',
                color: '#475569', fontSize: 12,
                cursor: 'pointer', padding: 0,
                fontFamily: 'inherit',
              }}
            >
              Skip tour
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              {index > 0 && (
                <button
                  onClick={() => setIndex(i => i - 1)}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94A3B8', borderRadius: 8,
                    padding: '6px 14px', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    const cb = document.getElementById('dontShowAgain');
                    finish(cb?.checked ?? false);
                  } else {
                    advance();
                  }
                }}
                style={{
                  background: '#2563EB', color: '#fff',
                  border: 'none', borderRadius: 8,
                  padding: '6px 16px', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {isLast ? 'Finish ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Home tour steps ───────────────────────────────────────────────────────────
const HOME_STEPS = [
  {
    selector: null, // centred welcome card
    title: '👋 Welcome to DocDash',
    body: 'Upload any document and DocDash turns it into a live visual dashboard — KPIs, charts, summaries, and insights — in under a minute.',
  },
  {
    selector: '[data-tour="upload-zone"]',
    title: '📎 Drop your file here',
    body: 'Drag & drop or click to browse. DocDash accepts PDFs, Word documents, and plain text up to 10 MB.',
    cta: 'Click or drag a file to get started',
  },
  {
    selector: '[data-tour="mode-selector"]',
    title: '🎯 Pick an analysis mode',
    body: 'Auto works for most documents. Choose Finance, HR, Sales, or Research to tune the AI for your specific domain and get sharper metrics.',
  },
  {
    selector: '[data-tour="sample-doc"]',
    title: '⚡ Not ready to upload? Try the sample',
    body: 'Click here to instantly generate a full dashboard from a built-in sample document — no file needed. Perfect for exploring what DocDash can do.',
    cta: 'Click to see a live example',
  },
];

// ── Dashboard tour steps ──────────────────────────────────────────────────────
const DASH_STEPS = [
  {
    selector: '[data-tour="kpi-cards"]',
    title: '📊 Your key metrics',
    body: 'DocDash has extracted the most important numbers from your document — with context on trend and what to watch.',
  },
  {
    selector: '[data-tour="charts"]',
    title: '📈 Visual breakdowns',
    body: 'Charts built automatically from your data. Use the dimension filters above to slice by time period, segment, or category.',
  },
  {
    selector: '[data-tour="ask-data"]',
    title: '💬 Ask your data anything',
    body: 'Type any question in plain English. Answers are grounded in the dashboard data — not hallucinated.',
    cta: 'Try asking "What’s the biggest risk?"',
  },
  {
    selector: '[data-tour="watch-list"]',
    title: '🚨 Executive watch list',
    body: 'Risks and trends that need your attention, each backed by a specific data point from your document.',
  },
  {
    selector: '[data-tour="export-btn"]',
    title: '⬇ Export or share',
    body: 'Download as PDF, PowerPoint, or interactive HTML. Share a public link — viewers don\'t need to sign in.',
    cta: 'Click Export to see your options',
  },
  {
    selector: '[data-tour="remix-btn"]',
    title: '🔀 Not happy? Remix it',
    body: 'Generate a fresh take on the same document. Auto Remix picks a new analytical angle; Guided Remix follows your instructions.',
    cta: 'Click Remix to regenerate the dashboard',
  },
];

export function HomeTour({ onComplete }) {
  return <TourOverlay steps={HOME_STEPS} onComplete={onComplete} />;
}

export function DashboardTour({ onComplete }) {
  return <TourOverlay steps={DASH_STEPS} onComplete={onComplete} />;
}
