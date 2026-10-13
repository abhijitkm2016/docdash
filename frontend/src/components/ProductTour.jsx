import { useState, useEffect, useRef } from 'react';

export const TOUR_HOME_KEY = 'docdash_tour_home_done';
export const TOUR_DASH_KEY = 'docdash_tour_dashboard_done';

const TW        = 296;   // tooltip width
const EDGE_PAD  = 14;    // min gap from any viewport edge
const SPOT_PAD  = 10;    // padding inflating the spotlight ring
const ARROW_H   = 9;     // arrow triangle height
const GAP       = 4;     // extra gap between arrow tip and spotlight edge
const MIN_H     = 180;   // minimum usable tooltip height; below this we use the fallback

function lockScroll()   { document.body.style.overflow = 'hidden'; }
function unlockScroll() { document.body.style.overflow = ''; }

// ── TourOverlay ───────────────────────────────────────────────────────────────
function TourOverlay({ steps, onComplete }) {
  const [index,    setIndex]    = useState(0);
  const [rect,     setRect]     = useState(null);
  const [visible,  setVisible]  = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const timerRef = useRef(null);

  const step   = steps[index];
  const isLast = index === steps.length - 1;

  // Unlock scroll when tour unmounts
  useEffect(() => () => unlockScroll(), []);

  // Per step: unlock → scroll to target → lock → measure → reveal
  useEffect(() => {
    setVisible(false);
    setRect(null);
    clearTimeout(timerRef.current);
    unlockScroll();

    const el = step?.selector ? document.querySelector(step.selector) : null;

    // If a selector was specified but the element isn't in the DOM (e.g. watch
    // list not present for this document), skip this step entirely.
    if (step?.selector && !el) {
      timerRef.current = setTimeout(() => {
        setIndex(i => {
          const next = i + 1;
          if (next >= steps.length) { unlockScroll(); onComplete(false); return i; }
          return next;
        });
      }, 0);
      return () => clearTimeout(timerRef.current);
    }

    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    timerRef.current = setTimeout(() => {
      lockScroll();
      if (el) setRect(el.getBoundingClientRect());
      setVisible(true);
    }, el ? 420 : 60);

    return () => clearTimeout(timerRef.current);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(skip = false) {
    unlockScroll();
    onComplete(dontShow);
  }

  // ── Positioning ───────────────────────────────────────────────────────────────
  // KEY PRINCIPLE: use `bottom` CSS when placing above the target so the card
  // grows UPWARD, and `top` CSS when placing below so it grows DOWNWARD.
  // Either way the edge closest to the spotlight is the fixed anchor —
  // the card can never grow INTO the highlighted element regardless of its height.

  const VW = window.innerWidth;
  const VH = window.innerHeight;

  let posStyle   = {};   // { top } or { bottom }
  let maxH       = 400;  // maxHeight fed to the card
  let arrowDir   = null; // 'up' | 'down' | null
  let arrowLeft  = TW / 2 - ARROW_H; // arrow x inside tooltip box
  let tooltipLeft = VW / 2 - TW / 2; // horizontal position

  if (rect) {
    const sTop    = rect.top    - SPOT_PAD;        // spotlight top edge
    const sBottom = rect.bottom + SPOT_PAD;        // spotlight bottom edge
    const sCX     = rect.left   + rect.width / 2;  // target horizontal centre

    const spaceBelow = VH - sBottom - GAP - ARROW_H - EDGE_PAD;
    const spaceAbove = sTop          - GAP - ARROW_H - EDGE_PAD;

    if (spaceBelow >= MIN_H || spaceBelow >= spaceAbove) {
      if (spaceBelow >= MIN_H) {
        // Enough room below — place below with arrow pointing up
        arrowDir = 'up';
        posStyle = { top: sBottom + GAP + ARROW_H };
        maxH     = spaceBelow;
      } else if (spaceAbove >= MIN_H) {
        // Enough room above — place above with arrow pointing down
        arrowDir = 'down';
        posStyle = { bottom: VH - sTop + GAP + ARROW_H };
        maxH     = spaceAbove;
      } else {
        // Target fills most of the viewport — dock tooltip at bottom, centered, no arrow
        arrowDir    = null;
        posStyle    = { bottom: EDGE_PAD };
        maxH        = Math.max(MIN_H, spaceBelow, spaceAbove);
        tooltipLeft = Math.max(EDGE_PAD, Math.min(VW - TW - EDGE_PAD, VW / 2 - TW / 2));
      }
    } else if (spaceAbove >= MIN_H) {
      arrowDir = 'down';
      posStyle = { bottom: VH - sTop + GAP + ARROW_H };
      maxH     = spaceAbove;
    } else {
      // Neither side has MIN_H — dock at bottom centered, no arrow
      arrowDir    = null;
      posStyle    = { bottom: EDGE_PAD };
      maxH        = Math.max(MIN_H, spaceBelow, spaceAbove);
      tooltipLeft = Math.max(EDGE_PAD, Math.min(VW - TW - EDGE_PAD, VW / 2 - TW / 2));
    }

    // Horizontal: centre on target, clamp so tooltip stays on screen (skip when docked)
    if (arrowDir !== null) {
      tooltipLeft = Math.max(EDGE_PAD, Math.min(VW - TW - EDGE_PAD, sCX - TW / 2));
    }

    // Arrow x: points at the target centre from inside the tooltip box
    if (arrowDir !== null) {
      arrowLeft = Math.max(14, Math.min(TW - 14 - ARROW_H * 2, sCX - tooltipLeft - ARROW_H));
    }
  } else {
    // No target selector — centered modal card, no arrow
    posStyle = { top: VH / 2 - 160 };
    maxH     = 320;
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Click-catcher: transparent full-screen div — captures "click outside" but
          adds no visual darkening so it never dims the spotlight target.
          When there is no rect (welcome step) we add a background here instead. */}
      <div
        onClick={() => finish(true)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1999,
          background: rect ? 'transparent' : 'rgba(3,7,18,0.85)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: visible ? 'auto' : 'none',
        }}
      />

      {/* Spotlight — the box-shadow IS the dark overlay (everything outside the div
          is darkened); the div itself has no background so the target shows through
          at full brightness. Never add a background colour here. */}
      {rect && (
        <div style={{
          position:  'fixed',
          top:       rect.top    - SPOT_PAD,
          left:      rect.left   - SPOT_PAD,
          width:     rect.width  + SPOT_PAD * 2,
          height:    rect.height + SPOT_PAD * 2,
          borderRadius: 10,
          zIndex:    2000,
          pointerEvents: 'none',
          background: 'transparent',
          boxShadow: [
            '0 0 0 9999px rgba(3,7,18,0.82)',          // dims everything OUTSIDE the spotlight
            '0 0 0 2px rgba(255,255,255,0.18)',         // subtle white inner edge
            '0 0 0 4px #3B82F6',                       // solid blue ring
            '0 0 0 6px rgba(59,130,246,0.25)',          // soft blue halo
            '0 0 28px 6px rgba(96,165,250,0.45)',       // outer blue glow
          ].join(', '),
          opacity:   visible ? 1 : 0,
          transition: 'opacity 0.2s ease, top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease',
        }} />
      )}

      {/* Tooltip container — positioned with top OR bottom anchor */}
      <div style={{
        position: 'fixed',
        left:     tooltipLeft,
        width:    TW,
        zIndex:   2001,
        opacity:  visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        ...posStyle,
      }}>

        {/* Up-arrow (tooltip is below spotlight) */}
        {arrowDir === 'up' && (
          <div style={{
            position: 'absolute', top: -ARROW_H, left: arrowLeft,
            width: 0, height: 0,
            borderLeft:   `${ARROW_H}px solid transparent`,
            borderRight:  `${ARROW_H}px solid transparent`,
            borderBottom: `${ARROW_H}px solid #111827`,
          }} />
        )}

        {/* Down-arrow (tooltip is above spotlight) */}
        {arrowDir === 'down' && (
          <div style={{
            position: 'absolute', bottom: -ARROW_H, left: arrowLeft,
            width: 0, height: 0,
            borderLeft:  `${ARROW_H}px solid transparent`,
            borderRight: `${ARROW_H}px solid transparent`,
            borderTop:   `${ARROW_H}px solid #111827`,
          }} />
        )}

        {/* Card */}
        <div style={{
          background:   '#111827',
          border:       '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          boxShadow:    '0 16px 48px rgba(0,0,0,0.65)',
          overflowY:    'auto',
          maxHeight:    maxH,
          boxSizing:    'border-box',
          display:      'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Top row: step dots + close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    title={`Go to step ${i + 1}`}
                    style={{
                      width:      i === index ? 18 : 6,
                      height:     6,
                      borderRadius: 3,
                      background: i === index ? '#3B82F6' : i < index ? '#1D4ED8' : '#1E293B',
                      border:     i === index ? 'none' : '1px solid #334155',
                      padding:    0,
                      cursor:     'pointer',
                      transition: 'width 0.22s ease, background 0.2s',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => finish(true)}
                aria-label="Close tour"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border:     '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color:      '#64748B',
                  width: 22, height: 22,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize: 15, lineHeight: 1,
                  cursor:     'pointer',
                  padding:    0,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Title */}
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.35 }}>
              {step.title}
            </p>

            {/* Body */}
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: '#94A3B8', lineHeight: 1.65 }}>
              {step.body}
            </p>

            {/* CTA — compact inline note */}
            {step.cta && (
              <p style={{
                margin: '0 0 12px',
                fontSize: 12,
                color: '#60A5FA',
                fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 11 }}>☝</span>
                {step.cta}
              </p>
            )}

            {/* Don't show again — every step, honoured by Skip as well as Done */}
            {(
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7,
                marginBottom: 12, cursor: 'pointer', userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={e => setDontShow(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#3B82F6', width: 13, height: 13 }}
                />
                <span style={{ fontSize: 11.5, color: '#475569' }}>Don't show this again</span>
              </label>
            )}

            {/* Footer */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              paddingTop:     10,
              borderTop:      '1px solid rgba(255,255,255,0.06)',
            }}>
              <button
                onClick={() => finish(true)}
                style={{
                  background: 'none', border: 'none',
                  color: '#475569', fontSize: 12,
                  cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                }}
              >
                Skip tour
              </button>

              <div style={{ display: 'flex', gap: 6 }}>
                {index > 0 && (
                  <button
                    onClick={() => setIndex(i => i - 1)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border:     '1px solid rgba(255,255,255,0.1)',
                      color:      '#94A3B8', borderRadius: 8,
                      padding:    '5px 12px', fontSize: 12,
                      cursor:     'pointer', fontFamily: 'inherit',
                    }}
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={() => isLast ? finish(false) : setIndex(i => i + 1)}
                  style={{
                    background: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '5px 15px', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.45)',
                  }}
                >
                  {isLast ? 'Done ✓' : 'Next →'}
                </button>
              </div>
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
    selector: null,
    title: '👋 Welcome to DocDash',
    body: 'Upload any document and get a live visual dashboard — KPIs, charts, and insights — in under a minute. This quick tour shows you how.',
  },
  {
    selector: '[data-tour="upload-zone"]',
    title: 'Drop your file here',
    body: 'Drag & drop or click to browse. Supports PDF, Word, and plain text up to 10 MB.',
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
    body: 'Try the built-in sample — see a full dashboard in seconds with no file needed.',
    cta: 'Click to see a live example',
  },
];

// ── Dashboard tour steps ──────────────────────────────────────────────────────
const DASH_STEPS = [
  {
    selector: '[data-tour="kpi-cards"]',
    title: 'Key metrics',
    body: 'The most important numbers from your document, with trend context and what to watch.',
  },
  {
    selector: '[data-tour="charts"]',
    title: 'Visual breakdowns',
    body: 'Charts built automatically from your data. Use the dimension filters to slice by time, segment, or category.',
  },
  {
    selector: '[data-tour="ask-data"]',
    title: 'Ask your data anything',
    body: 'Type any question in plain English — answers are grounded in your document.',
    cta: 'Try "What is the biggest risk here?"',
  },
  {
    selector: '[data-tour="watch-list"]',
    title: 'Executive watch list',
    body: 'Risks and trends that need attention, each backed by a specific data point.',
  },
  {
    selector: '[data-tour="export-btn"]',
    title: 'Export or share',
    body: 'Download as PDF, PowerPoint, or HTML. Share a public link — no sign-in needed for viewers.',
    cta: 'Click Export to see all options',
  },
  {
    selector: '[data-tour="remix-btn"]',
    title: 'Remix',
    body: 'Generate a fresh take on the same document with a different analytical angle.',
    cta: 'Click Remix to try another perspective',
  },
  {
    selector: '[data-tour="command-palette-btn"]',
    title: '⌘K Command Palette',
    body: 'Press Cmd+K (or Ctrl+K) anywhere to instantly access any action — export, share, remix, history, and more — without leaving your keyboard.',
  },
];

export function HomeTour({ onComplete }) {
  return <TourOverlay steps={HOME_STEPS} onComplete={onComplete} />;
}

export function DashboardTour({ onComplete }) {
  const [activeSteps, setActiveSteps] = useState([]);

  useEffect(() => {
    const found = DASH_STEPS.filter(s => !s.selector || !!document.querySelector(s.selector));
    setActiveSteps(found);
  }, []);

  if (!activeSteps.length) return null;
  return <TourOverlay steps={activeSteps} onComplete={onComplete} />;
}
