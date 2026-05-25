import { FilterProvider, useFilter } from '../context/FilterContext';
import { useTheme } from '../context/ThemeContext';
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

// ── Theme toggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button className="no-print" onClick={toggle} style={styles.ctrlBtn}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
      {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
    </button>
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
  onReset, onRemix, remixing, remixVersion,
}) {
  const dimensions       = data.dimensions       || [];
  const chartAnnotations = data.chartAnnotations || [];
  const fieldMetadata    = data.fieldMetadata    || {};

  return (
    <div
      style={{
        ...styles.page,
        opacity:    remixing ? 0.6 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* ── Header ───────────────────────────���──────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.brandRow}>
            <span style={styles.brandIcon}>⚡</span>
            <span style={styles.brandName}>DocDash</span>
            {remixVersion > 0 && (
              <span style={styles.perspectiveBadge}>
                Perspective #{remixVersion + 1}
              </span>
            )}
          </div>

          {/* Insight-driven H1 */}
          <h1 style={styles.h1}>{data.title}</h1>

          {/* Standfirst */}
          {data.standfirst && (
            <p style={styles.standfirst}>{data.standfirst}</p>
          )}

          {data.metadata?.source && (
            <p style={styles.metaLine}>
              {data.metadata.source}
              {data.metadata.asOf ? ` · As of ${data.metadata.asOf}` : ''}
              {' · '}
              <em style={{ fontStyle: 'normal', color: 'var(--text-muted)' }}>
                AI-Generated Analysis
              </em>
            </p>
          )}
        </div>

        {/* Controls */}
        <div style={styles.controls} className="no-print">
          <ThemeToggle />
          <PrintButton />
          <DownloadButton standaloneHtml={standaloneHtml} title={data.title} />
          {/* Remix button */}
          <button
            onClick={onRemix}
            disabled={remixing}
            style={{
              ...styles.ctrlBtn,
              animation: remixing ? 'pulse 1s ease-in-out infinite' : 'none',
            }}
            aria-label="Generate a fresh perspective on this data"
          >
            🔀 {remixing ? 'Remixing…' : 'Remix'}
          </button>
          <button onClick={onReset} style={styles.primaryBtn}>
            ↑ New File
          </button>
        </div>
      </div>

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
        <div style={styles.kpiGrid}>
          {(data.kpis || []).map((kpi, i) => (
            <KpiCard key={i} {...kpi} />
          ))}
        </div>
      </Section>

      {/* ── Charts ────────────────────────────────────────────── */}
      <Section title="Charts">
        {dimensions.length > 0 && (
          <DimensionFilters dimensions={dimensions} />
        )}
        <ActiveFilterBar dimensions={dimensions} />
        <div style={styles.chartsGrid}>
          {(data.charts || []).map(chart => (
            <ChartPanel
              key={chart.id}
              chart={chart}
              annotations={chartAnnotations.filter(a => a.chartId === chart.id)}
              fieldMeta={fieldMetadata}
            />
          ))}
        </div>
      </Section>

      {/* ── Data Table ────────────────────────────────────────── */}
      {data.tableData?.rows?.length > 0 && (
        <Section title="Data Table">
          <DataTable
            columns={data.tableData.columns}
            rows={data.tableData.rows}
            dimensions={dimensions}
          />
        </Section>
      )}

      {/* ── Analysis ──────────────────────────────────────────── */}
      {data.narrative && (
        <Section title="Analysis">
          <NarrativeSection narrative={data.narrative} />
        </Section>
      )}

      {/* ── Watch List ────────────────────────────────────────── */}
      {data.watchList && (
        <Section title="Executive Watch List">
          <WatchList watchList={data.watchList} />
        </Section>
      )}

      {/* ── Ask Your Data (no heading — placeholder IS the invite) */}
      {sessionId && (
        <Section>
          <AskYourData sessionId={sessionId} />
        </Section>
      )}

      {/* ── Data Inventory ────────────────────────────────────── */}
      {data.dataInventory && (
        <Section title="Data Inventory">
          <DataInventory inventory={data.dataInventory} metadata={data.metadata} />
        </Section>
      )}
    </div>
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

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1.25rem',
    marginBottom: '2.5rem',
  },
  headerLeft: { flex: 1, minWidth: 280 },

  brandRow:   { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' },
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
    maxWidth: 680,
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
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
