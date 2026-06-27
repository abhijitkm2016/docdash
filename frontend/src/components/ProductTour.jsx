import { useState, useEffect, useRef } from 'react';

export const TOUR_HOME_KEY = 'docdash_tour_home_done';
export const TOUR_DASH_KEY = 'docdash_tour_dashboard_done';

// ── Constants ─────────────────────────────────────────────────────────────────
const TW          = 310;   // tooltip width px
const TH_MAX      = 240;   // conservative max tooltip height for positioning
const EDGE_PAD    = 14;    // min gap from viewport edge
const SPOT_PAD    = 10;    // padding around spotlight target
const ARROW_SIZE  = 9;     // triangle half-height

// ── Scroll-lock helpers ───────────────────────────────────────────────────────
function lockScroll() {
  document.body.style.overflow = 'hidden';
}
function unlockScroll() {
  document.body.style.overflow = '';
}

// ── TourOverlay ───────────────────────────────────────────────────────────────
function TourOverlay({ steps, onComplete }) {
  const [index,   setIndex]   = useState(0);
  const [rect,    setRect]    = useState(null);
  const [visible, setVisible] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const timerRef = useRef(null);

  const step   = steps[index];
  const isLast = index === steps.length - 1;

  // Unlock scroll on unmount
  useEffect(() => () => unlockScroll(), []);

  // Per-step: unlock → scroll → lock → measure → show
  useEffect(() => {
    setVisible(false);
    setRect(null);
    clearTimeout(timerRef.current);

    unlockScroll();

    const el = step?.selector ? document.querySelector(step.selector) : null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Wait for scroll to settle, then lock and measure
    timerRef.current = setTimeout(() => {
      lockScroll();
      if (el) setRect(el.getBoundingClientRect());
      setVisible(true);
    }, el ? 420 : 60);

    return () => clearTimeout(timerRef.current);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(skip = false) {
    unlockScroll();
    onComplete(skip ? false : dontShow);
  }

  // ── Position tooltip fully within current viewport ──────────────────────────
  const VW = window.innerWidth;
  const VH = window.innerHeight;

  let top, left, arrowDir, arrowOffset;

  if (rect) {
    const sTop    = rect.top    - SPOT_PAD;          // spotlight top edge
    const sBottom = rect.bottom + SPOT_PAD;           // spotlight bottom edge
    const sCX     = rect.left   + rect.width / 2;     // spotlight centre-x

    const spaceBelow = VH - sBottom - EDGE_PAD;
    const spaceAbove = sTop           - EDGE_PAD;

    if (spaceBelow >= TH_MAX + ARROW_SIZE) {
      arrowDir = 'up';
      top = sBottom + ARROW_SIZE + 2;
    } else if (spaceAbove >= TH_MAX + ARROW_SIZE) {
      arrowDir = 'down';
      top = sTop - TH_MAX - ARROW_SIZE - 2;
    } else {
      // Not enough room on either side — pick the larger one and clamp
      arrowDir = spaceBelow >= spaceAbove ? 'up' : 'down';
      top = arrowDir === 'up'
        ? sBottom + ARROW_SIZE + 2
        : sTop - TH_MAX - ARROW_SIZE - 2;
    }

    // Hard clamp: tooltip must stay within viewport
    top  = Math.max(EDGE_PAD, Math.min(VH - TH_MAX - EDGE_PAD, top));

    // Horizontal: centre over target, clamp to viewport
    left = sCX - TW / 2;
    left = Math.max(EDGE_PAD, Math.min(VW - TW - EDGE_PAD, left));

    // Arrow x relative to tooltip box — points at spotlight centre
    arrowOffset = Math.max(16, Math.min(TW - 32, sCX - left - ARROW_SIZE));
  } else {
    // No target — centre of viewport
    top      = VH / 2 - TH_MAX / 2;
    left     = VW / 2 - TW  / 2;
    arrowDir = null;
    arrowOffset = TW / 2 - ARROW_SIZE;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop — click to skip */}
      <div
        onClick={() => finish(true)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1999,
          background: 'rgba(8, 12, 24, 0.78)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Spotlight ring */}
      {rect && (
        <div style={{
          position: 'fixed',
          top:    rect.top    - SPOT_PAD,
          left:   rect.left   - SPOT_PAD,
          width:  rect.width  + SPOT_PAD * 2,
          height: rect.height + SPOT_PAD * 2,
          borderRadius: 12,
          zIndex: 2000,
          pointerEvents: 'none',
          // The magic: casts a 9999px shadow over everything else
          boxShadow: '0 0 0 9999px rgba(8, 12, 24, 0.78), 0 0 0 2px #3B82F6, 0 0 18px rgba(59,130,246,0.45)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.22s ease, top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease',
        }} />
      )}

      {/* Tooltip */}
      <div style={{
        position: 'fixed',
        top,
        left,
        width: TW,
        maxHeight: VH - EDGE_PAD * 2,
        zIndex: 2001,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Arrow pointing at spotlight */}
        {arrowDir === 'up' && (
          <div style={{
            position: 'absolute', top: -ARROW_SIZE,
            left: arrowOffset,
            width: 0, height: 0,
            borderLeft:   `${ARROW_SIZE}px solid transparent`,
            borderRight:  `${ARROW_SIZE}px solid transparent`,
            borderBottom: `${ARROW_SIZE}px solid #0F172A`,
            filter: 'drop-shadow(0 -1px 0 rgba(255,255,255,0.08))',
          }} />
        )}
        {arrowDir === 'down' && (
          <div style={{
            position: 'absolute', bottom: -ARROW_SIZE,
            left: arrowOffset,
            width: 0, height: 0,
            borderLeft:  `${ARROW_SIZE}px solid transparent`,
            borderRight: `${ARROW_SIZE}px solid transparent`,
            borderTop:   `${ARROW_SIZE}px solid #0F172A`,
          }} />
        )}

        {/* Card */}
        <div style={{
          background: '#0F172A',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: '18px 18px 16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}>

          {/* Header row: dots left, X right */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  style={{
                    width:  i === index ? 20 : 7,
                    height: 7,
                    borderRadius: 4,
                    background: i === index ? '#3B82F6' : (i < index ? '#334155' : '#1E293B'),
                    border: i === index ? 'none' : '1px solid #334155',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'width 0.25s ease, background 0.2s',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* Close */}
            <button
              onClick={() => finish(true)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: '#64748B',
                width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, lineHeight: 1,
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Close tour"
            >
              ×
            </button>
          </div>

          {/* Title */}
          <p style={{
            margin: '0 0 7px',
            fontSize: 15, fontWeight: 700,
            color: '#F1F5F9', lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}>
            {step.title}
          </p>

          {/* Body */}
          <p style={{
            margin: '0 0 14px',
            fontSize: 13, color: '#94A3B8', lineHeight: 1.65,
          }}>
            {step.body}
          </p>

          {/* CTA hint */}
          {step.cta && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 14,
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 7,
              padding: '7px 10px',
            }}>
              <span style={{ fontSize: 12 }}>☝️</span>
              <span style={{ fontSize: 12, color: '#93C5FD', fontWeight: 500 }}>
                {step.cta}
              </span>
            </div>
          )}

          {/* Don't show again — last step only */}
          {isLast && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 7,
              marginBottom: 14, cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={dontShow}
                onChange={e => setDontShow(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#3B82F6', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 12, color: '#475569' }}>Don't show this tour again</span>
            </label>
          )}

          {/* Footer: skip left, back+next right */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            <button
              onClick={() => finish(true)}
              style={{
                background: 'none', border: 'none',
                color: '#475569', fontSize: 12,
                cursor: 'pointer', padding: 0,
                fontFamily: 'inherit',
              }}
            >
              Skip
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              {index > 0 && (
                <button
                  onClick={() => setIndex(i => i - 1)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94A3B8', borderRadius: 8,
                    padding: '6px 13px', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => isLast ? finish(false) : setIndex(i => i + 1)}
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 16px', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                }}
              >
                {isLast ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Home tour steps (upload page, post-login) ─────────────────────────────────
// Pre-sign-in WelcomeScreen intentionally has no tour —
// it's a two-CTA marketing screen; a tour there would be noise.
const HOME_STEPS = [
  {
    selector: null,
    title: '👋 Welcome to DocDash',
    body: 'Upload any document and get a live visual dashboard — KPIs, charts, insights — in under a minute. This quick tour shows you around.',
  },
  {
    selector: '[data-tour="upload-zone"]',
    title: 'Drop your file here',
    body: 'Drag & drop or click to browse. DocDash accepts PDF, Word, and plain text files up to 10 MB.',
    cta: 'Click or drag a file to get started',
  },
  {
    selector: '[data-tour="mode-selector"]',
    title: 'Pick an analysis mode',
    body: 'Auto works for most documents. Switch to Finance, HR, Sales, or Research to get domain-specific metrics and sharper insights.',
  },
  {
    selector: '[data-tour="sample-doc"]',
    title: 'Not ready to upload?',
    body: 'Click here to generate a full dashboard from a built-in sample document — no file needed. Great for exploring DocDash before committing.',
    cta: 'Click to see a live example now',
  },
];

// ── Dashboard tour steps ──────────────────────────────────────────────────────
const DASH_STEPS = [
  {
    selector: '[data-tour="kpi-cards"]',
    title: 'Key metrics',
    body: 'DocDash extracted the most important numbers from your document — with trend context and what to watch.',
  },
  {
    selector: '[data-tour="charts"]',
    title: 'Visual breakdowns',
    body: 'Charts built automatically from your data. Use the dimension filters above the charts to slice by time, segment, or category.',
  },
  {
    selector: '[data-tour="ask-data"]',
    title: 'Ask your data anything',
    body: 'Type any question in plain English. Answers are grounded in your document — not guessed.',
    cta: 'Try "What is the biggest risk here?"',
  },
  {
    selector: '[data-tour="watch-list"]',
    title: 'Executive watch list',
    body: 'Risks and trends that need attention, each backed by a specific data point from your document.',
  },
  {
    selector: '[data-tour="export-btn"]',
    title: 'Export or share',
    body: 'Download as PDF, PowerPoint, or HTML. Share a public link — no sign-in required for viewers.',
    cta: 'Click Export to see all options',
  },
  {
    selector: '[data-tour="remix-btn"]',
    title: 'Remix',
    body: 'Not happy with this view? Remix generates a fresh take on the same document — different angle, same data.',
    cta: 'Click Remix to try another perspective',
  },
];

export function HomeTour({ onComplete }) {
  return <TourOverlay steps={HOME_STEPS} onComplete={onComplete} />;
}

export function DashboardTour({ onComplete }) {
  return <TourOverlay steps={DASH_STEPS} onComplete={onComplete} />;
}
