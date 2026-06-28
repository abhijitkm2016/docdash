import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProfileMenu from './ProfileMenu';
import Tooltip from './Tooltip';
import ErrorBoundary from './ErrorBoundary';
import { FilterProvider, useFilter } from '../context/FilterContext';
import AuthGate from './AuthGate';
import { useTheme } from '../context/ThemeContext';
import { exportToHtml } from '../utils/exportHtml';
import { exportToPdf } from '../utils/exportPdf';
import { exportToPpt } from '../utils/exportPpt';
import KpiCard          from './KpiCard';
import ChartPanel       from './ChartPanel';
import DataTable        from './DataTable';
import NarrativeSection from './NarrativeSection';
import DownloadButton   from './DownloadButton';
import PrintButton      from './PrintButton';
import DimensionFilters from './DimensionFilters';
import DataInventory    from './DataInventory';
import WatchList        from './WatchList';
import AskYourData      from './AskYourData';

// ── Privacy modal ─────────────────────────────────────────────────────────────
function PrivacyModal({ onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.box} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button style={modalStyles.close} onClick={onClose} aria-label="Close">×</button>
        <p style={modalStyles.heading}>Data &amp; Privacy</p>
        <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
          <strong>Your uploaded files are never stored.</strong> DocDash
          processes your document via the Anthropic API to generate the
          dashboard, then discards it immediately. Only the generated
          dashboard output is saved to your account — never the original
          file.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          For details on how AI processes your content, see{' '}
          <a
            href="https://www.anthropic.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2563EB', textDecoration: 'underline' }}
          >
            Anthropic's privacy policy
          </a>.
        </p>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  box: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.75rem',
    padding: '1.75rem 2rem',
    maxWidth: 480,
    width: '90%',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
  },
  close: {
    position: 'absolute', top: '0.75rem', right: '1rem',
    background: 'none', border: 'none',
    fontSize: '1.5rem', lineHeight: 1,
    color: 'var(--text-muted)', cursor: 'pointer',
  },
  heading: {
    fontSize: '1rem', fontWeight: 700,
    color: 'var(--text-primary)', marginBottom: '0.75rem',
  },
  body: {
    fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65,
  },
  trustBox: {
    background: 'var(--accent-muted, #EFF6FF)',
    border: '1px solid var(--accent-border, #BFDBFE)',
    borderRadius: '0.5rem',
    padding: '0.75rem 1rem',
    marginBottom: '0.875rem',
  },
  trustText: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    margin: 0,
  },
};

// ── Export dropdown ───────────────────────────────────────────────────────────
function ExportButton({ dashboardData, isAuthenticated, onRequestSignIn, onShare }) {
  const [open,     setOpen]     = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [copying,  setCopying]  = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setShowGate(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleClick() {
    setOpen(o => !o);
    setShowGate(false);
  }

  function handleHtml() { exportToHtml(dashboardData); setOpen(false); }
  function handlePdf()  { exportToPdf(dashboardData);  setOpen(false); }
  function handlePpt()  { exportToPpt(dashboardData);  setOpen(false); }

  async function handleShare() {
    if (!isAuthenticated) { setShowGate(o => !o); return; }
    setOpen(false);
    setCopying(true);
    await onShare?.();
    setTimeout(() => setCopying(false), 2500);
  }

  const exportOptions = [
    { label: '🌐 HTML Dashboard', action: handleHtml, desc: 'Interactive web file' },
    { label: '📄 PDF Report',     action: handlePdf,  desc: 'Structured analyst report' },
    { label: '📊 PPT Deck',       action: handlePpt,  desc: '5-slide presentation' },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }} className="no-print">
      <button
        style={exportStyles.btn}
        onClick={handleClick}
        aria-haspopup="true"
        aria-expanded={open || showGate}
      >
        {copying ? '✓ Link copied' : '⬇ Export'}{' '}
        <span style={{ fontSize: '10px', opacity: 0.6, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>
      {open && (
        <div style={exportStyles.dropdown}>
          {exportOptions.map((opt, idx) => (
            <button
              key={opt.label}
              onClick={opt.action}
              style={{ ...exportStyles.item, borderBottom: '1px solid var(--card-border)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--table-header-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{opt.label}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>{opt.desc}</span>
            </button>
          ))}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleShare}
              style={{ ...exportStyles.item, borderBottom: 'none', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--table-header-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ↗ Share as Link
                {!isAuthenticated && <span style={{ fontSize: '11px', opacity: 0.5 }}>🔒</span>}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                {isAuthenticated ? 'Copy sharable URL' : 'Sign in to share'}
              </span>
            </button>
            {showGate && (
              <AuthGate
                action="share"
                onSignIn={() => { setShowGate(false); setOpen(false); onRequestSignIn?.(); }}
                onDismiss={() => setShowGate(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const exportStyles = {
  btn: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    color: 'var(--text-secondary)',
    padding: '0.5rem 0.875rem',
    borderRadius: '0.5rem',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.625rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    minWidth: 200,
    zIndex: 200,
    overflow: 'hidden',
  },
  item: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    padding: '10px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.1s ease',
  },
};

// ── Theme toggle ──────────────────────────────────────────────────────────────
function ThemeToggle({ asIcon = false }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const icon  = theme === 'dark' ? '☀️' : '🌙';
  if (asIcon) {
    return (
      <Tooltip text={label}>
        <button className="no-print" onClick={toggle} style={styles.iconBtn} aria-label={label}>
          {icon}
        </button>
      </Tooltip>
    );
  }
  return (
    <button className="no-print" onClick={toggle} style={styles.ctrlBtn} aria-label={label}>
      {icon} {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
    </button>
  );
}

// ── Icon button ───────────────────────────────────────────────────────────────
function IconButton({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip text={label}>
      <button
        className="no-print"
        onClick={onClick}
        aria-label={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...styles.iconBtn,
          borderColor: hovered ? 'var(--accent)' : 'var(--card-border)',
          color: hovered ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

// ── Inline markdown → React (bold + italic only, safe — no dangerouslySetInnerHTML) ──
function InlineMarkdown({ text }) {
  // Split on **bold** and *italic* tokens, return mixed React nodes
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('**') && tok.endsWith('**')) {
          return <strong key={i}>{tok.slice(2, -2)}</strong>;
        }
        if (tok.startsWith('*') && tok.endsWith('*')) {
          return <em key={i}>{tok.slice(1, -1)}</em>;
        }
        return tok;
      })}
    </>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={styles.section}>
      {title && <p style={styles.sectionTitle}>{title}</p>}
      {children}
    </div>
  );
}

// ── Active filter bar ─────────────────────────────────────────────────────────
function ActiveFilterBar({ dimensions }) {
  const { activeFilters, clearFilter, clearAllFilters, hasActiveFilters } = useFilter();
  if (!hasActiveFilters) return null;
  return (
    <div className="no-print" style={styles.filterBar}>
      <span style={styles.filterBarLabel}>Filtered:</span>
      {Object.entries(activeFilters).map(([dimId, value]) => {
        const dim = dimensions.find(d => d.id === dimId);
        return (
          <span key={dimId} style={styles.filterChip}>
            {dim ? `${dim.label}: ` : ''}<strong>{value}</strong>
            <button onClick={() => clearFilter(dimId)} style={styles.chipRemove}
              aria-label={`Remove ${value} filter`}>×</button>
          </span>
        );
      })}
      <button onClick={clearAllFilters} style={styles.clearAllBtn}>Clear all</button>
    </div>
  );
}

// ── Dashboard inner ───────────────────────────────────────────────────────────
function DashboardInner({
  data, standaloneHtml, sessionId,
  onReset, remixControl, remixLoading, remixVersion,
  readOnly, isAuthenticated, onRequestSignIn,
  user, onSignOut, onShowHistory, onShowPrivacy, onShare, truncated, onShowTour,
}) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const dimensions       = data.dimensions       || [];
  const chartAnnotations = data.chartAnnotations || [];
  const fieldMetadata    = data.fieldMetadata    || {};

  const privacyHandler = onShowPrivacy || (() => setShowPrivacy(true));

  return (
    <>
    {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: remixLoading ? 0.6 : 1 }}
      transition={{ duration: 0.3 }}
      style={styles.page}
    >
      {/* ── Topbar ───────────────────────────────────────────── */}
      <div style={styles.topbar} className="no-print">
        {/* Brand */}
        <button
          onClick={() => window.location.href = '/'}
          title="Go to DocDash home"
          style={{ ...styles.brandRow, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={styles.brandIcon}>⚡</span>
          <span style={styles.brandName}>DocDash</span>
          {remixVersion > 0 && (
            <span style={styles.perspectiveBadge}>Perspective #{remixVersion + 1}</span>
          )}
        </button>

        {/* Controls: secondary icons → primary actions → profile */}
        <div style={styles.controls}>
          {/* Secondary icon buttons */}
          <IconButton icon="📂" label="Document history" onClick={onShowHistory} />
          <ThemeToggle asIcon />
          <IconButton icon="🛡️" label="Data & Privacy" onClick={privacyHandler} />
          {onShowTour && <IconButton icon="?" label="Take a tour" onClick={onShowTour} />}

          <div style={styles.topbarDivider} />

          {/* Primary actions */}
          {!readOnly && (
            <Tooltip text="Export or share this dashboard">
              <div data-tour="export-btn" style={{ display: 'inline-block' }}>
                <ExportButton
                  dashboardData={data}
                  isAuthenticated={isAuthenticated}
                  onRequestSignIn={onRequestSignIn}
                  onShare={onShare}
                />
              </div>
            </Tooltip>
          )}
          <Tooltip text="Generate a new perspective on this document">
            <div data-tour="remix-btn" style={{ display: 'inline-block' }}>
              {!readOnly && remixControl}
            </div>
          </Tooltip>
          {!readOnly && (
            <Tooltip text="Start a new analysis">
              <button onClick={onReset} style={styles.primaryBtn}>↑ New File</button>
            </Tooltip>
          )}

          <div style={styles.topbarDivider} />

          {/* Profile */}
          <ProfileMenu user={user} onSignOut={onSignOut} onRequestSignIn={onRequestSignIn} />
        </div>
      </div>

      {/* ── Title block: full width ───────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={styles.titleBlock}
      >
        <h1 style={styles.h1}>{data.title}</h1>
        {data.standfirst && (
          <p style={styles.standfirst}>{data.standfirst}</p>
        )}
        <p style={styles.metaLine}>Generated from source document</p>
      </motion.div>

      {truncated && (
        <div style={{
          margin: '0 0 1.5rem',
          padding: '10px 16px',
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
              Large document — standard analysis only
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#B45309', lineHeight: 1.5 }}>
              This document exceeded the standard analysis limit and was condensed. Some metrics may be incomplete. Use Deep Analysis (5 credits) for full document coverage.
            </p>
          </div>
        </div>
      )}

      {/* ── Executive Summary ─────────────────────────────────── */}
      <Section title="Executive Summary">
        <ul style={styles.summaryList}>
          {(data.summary || []).map((s, i) => (
            <li key={i} style={{ ...styles.summaryItem, ...(i === 0 ? styles.summaryPrimary : styles.summarySecondary) }}>
              {i === 0 && <span style={styles.primaryDot} />}
              <InlineMarkdown text={s} />
            </li>
          ))}
        </ul>
      </Section>

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <Section title="Key Metrics">
        <ErrorBoundary label="Key Metrics">
          <div data-tour="kpi-cards" style={styles.kpiGrid}>
            {(data.kpis || []).slice(0, 5).map((kpi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07, ease: 'easeOut' }}
              >
                <KpiCard {...kpi} />
              </motion.div>
            ))}
          </div>
        </ErrorBoundary>
      </Section>

      {/* ── Charts ────────────────────────────────────────────── */}
      <Section title="Charts">
        <ErrorBoundary label="Charts">
          {dimensions.length > 0 && (
            <DimensionFilters dimensions={dimensions} />
          )}
          <ActiveFilterBar dimensions={dimensions} />
          <div data-tour="charts" style={styles.chartsGrid}>
            {(data.charts || []).map((chart, i) => (
              <motion.div
                key={chart.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.08, ease: 'easeOut' }}
              >
                <ChartPanel
                  chart={chart}
                  annotations={chartAnnotations.filter(a => a.chartId === chart.id)}
                  fieldMeta={fieldMetadata}
                />
              </motion.div>
            ))}
          </div>
        </ErrorBoundary>
      </Section>

      {/* ── Ask Your Data ─────────────────────────────────────── */}
      <Section title="Ask Your Data">
        <ErrorBoundary label="Ask Your Data">
          <div data-tour="ask-data">
            <AskYourData sessionId={sessionId} dashboardData={data} />
          </div>
        </ErrorBoundary>
      </Section>

      {/* ── Analysis ──────────────────────────────────────────── */}
      {data.narrative && (
        <ErrorBoundary label="Analysis">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            style={styles.section}
          >
            <NarrativeSection narrative={data.narrative} />
          </motion.section>
        </ErrorBoundary>
      )}

      {/* ── Watch List ────────────────────────────────────────── */}
      {data.watchList && (
        <ErrorBoundary label="Executive Watch List">
          <Section title="Executive Watch List">
            <motion.div
              data-tour="watch-list"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
            >
              <WatchList watchList={data.watchList} />
            </motion.div>
          </Section>
        </ErrorBoundary>
      )}

      {/* ── Data Table ────────────────────────────────────────── */}
      <ErrorBoundary label="Data Table">
        {data.tableData?.rows?.length > 0 && (
          <Section title="Data Table">
            <DataTable
              columns={data.tableData.columns}
              rows={data.tableData.rows}
              dimensions={dimensions}
            />
          </Section>
        )}
      </ErrorBoundary>

      {/* ── Data Inventory ────────────────────────────────────── */}
      <ErrorBoundary label="Data Inventory">
        {data.dataInventory && (
          <Section title="Data Inventory">
            <DataInventory inventory={data.dataInventory} metadata={data.metadata} />
          </Section>
        )}
      </ErrorBoundary>
    </motion.div>
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function Dashboard(props) {
  return (
    <FilterProvider>
      <DashboardInner {...props} />
    </FilterProvider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' },

  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 2100,
    background: 'var(--surface, var(--card-bg))',
    borderBottom: '1px solid var(--card-border)',
    padding: '0.625rem 0',
    marginLeft: '-1.5rem',
    marginRight: '-1.5rem',
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
  },
  topbarDivider: {
    width: 1,
    height: 20,
    background: 'var(--card-border)',
    flexShrink: 0,
  },
  iconBtn: {
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--card-border)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: 'var(--text-secondary)',
    transition: 'border-color 0.15s, color 0.15s',
    padding: 0,
    flexShrink: 0,
  },
  signInBtn: {
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.375rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.03em',
    flexShrink: 0,
  },
  profileDropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.625rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    minWidth: 200,
    zIndex: 200,
    overflow: 'hidden',
  },
  profileInfo: {
    padding: '12px 14px',
  },
  profileDivider: {
    height: 1,
    background: 'var(--card-border)',
    margin: '0',
  },
  signOutBtn: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    padding: '10px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#DC2626',
  },
  titleBlock: {
    marginBottom: '2rem',
  },

  brandRow:   { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  brandIcon:  { fontSize: '1.125rem' },
  brandName:  { fontSize: '0.9375rem', fontWeight: 700, color: 'var(--accent)' },
  perspectiveBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    background: 'var(--chip-bg)',
    padding: '0.15rem 0.6rem',
    borderRadius: '9999px',
  },

  h1: {
    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.25,
    marginBottom: '0.5rem',
    letterSpacing: '-0.02em',
  },
  standfirst: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    marginBottom: '0.375rem',
  },
  metaLine: { fontSize: '0.8125rem', color: 'var(--text-muted)' },

  controls: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 },
  ctrlBtn: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    color: 'var(--text-secondary)',
    padding: '0.5rem 0.875rem',
    borderRadius: '0.5rem',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  primaryBtn: {
    background: 'var(--accent)',
    border: 'none',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  privacyLink: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    padding: '0.25rem 0.25rem',
    whiteSpace: 'nowrap',
  },

  section:      { marginBottom: '2.5rem' },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '1rem',
  },

  summaryList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  summaryItem: {
    background: 'var(--card-bg)',
    borderLeft: '3px solid var(--summary-border)',
    borderRadius: '0 0.5rem 0.5rem 0',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',      // bullets 2-5: 14px
    fontWeight: 400,
    color: 'var(--text-secondary)',
    lineHeight: 1.55,
    boxShadow: 'var(--shadow)',
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  summarySecondary: {
    // inherits summaryItem — no override needed
  },
  summaryPrimary: {
    fontSize: '1rem',            // 16px
    fontWeight: 600,
    color: 'var(--text-primary)',
    borderLeft: '4px solid var(--summary-border)',  // thicker accent
    background: 'var(--accent-badge)',              // subtle tint
  },
  primaryDot: {
    display: 'inline-block',
    width: 7, height: 7,
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0,
    marginTop: '0.35rem',
  },

  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    maxWidth: '100%',
    gap: '12px',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
  },

  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '1rem',
    padding: '0.625rem 1rem',
    background: 'var(--accent-muted)',
    border: '1px solid var(--accent)',
    borderRadius: '0.5rem',
  },
  filterBarLabel: { fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 },
  filterChip: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '9999px',
    padding: '0.2rem 0.5rem 0.2rem 0.75rem',
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  chipRemove: {
    background: 'none', border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: 0,
  },
  clearAllBtn: {
    background: 'none', border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 600,
    marginLeft: 'auto',
    padding: 0,
  },
};
