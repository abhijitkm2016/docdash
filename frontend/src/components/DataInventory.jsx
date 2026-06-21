import { useState } from 'react';

export default function DataInventory({ inventory, metadata }) {
  const [open, setOpen] = useState(false);

  if (!inventory) return null;

  const { sources = [], joins = [], gaps = [], ignoredColumns = [], unexposedDimensions = [] } = inventory;
  const hasContent = sources.length || joins.length || gaps.length || ignoredColumns.length || unexposedDimensions.length;
  if (!hasContent) return null;

  const gapCount = gaps.length;

  return (
    <div style={styles.wrap}>
      {/* Toggle header */}
      <button
        className="no-print"
        onClick={() => setOpen(o => !o)}
        style={styles.toggle}
        aria-expanded={open}
        aria-label="Toggle data inventory"
      >
        <span style={{
          ...styles.toggleIcon,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>▸</span>
        <span style={styles.toggleLabel}>DATA INVENTORY</span>
        {gapCount > 0 && (
          <span style={styles.gapBadge}>
            {sources.length} source{sources.length !== 1 ? 's' : ''} · {gapCount} gap{gapCount !== 1 ? 's' : ''}
          </span>
        )}
        {!gapCount && (
          <span style={styles.toggleMeta}>
            {sources.length} source{sources.length !== 1 ? 's' : ''}
            {joins.length ? ` · ${joins.length} join${joins.length !== 1 ? 's' : ''}` : ''}
          </span>
        )}
      </button>

      {/* Body */}
      <div style={{ ...styles.body, ...(open ? {} : styles.bodyCollapsed) }}>

        {/* Sources */}
        {sources.length > 0 && (
          <InventorySection title="Sources">
            {sources.map((s, i) => (
              <div key={i} style={styles.sourceRow}>
                <span style={styles.sourcePill}>{s.file}</span>
                <span style={styles.sourceArrow}>→</span>
                <span style={styles.sourceType}>
                  {s.sheet || 'N/A — single document'}
                </span>
                {s.columns?.length > 0 && (
                  <span style={styles.colList}>{s.columns.join(', ')}</span>
                )}
              </div>
            ))}
          </InventorySection>
        )}

        {/* Joins */}
        {joins.length > 0 && (
          <InventorySection title="Joins">
            {joins.map((j, i) => (
              <div key={i} style={styles.sourceRow}>
                <span style={styles.joinTag}>{j.type}</span>
                <span style={styles.sourceArrow}>on {(j.keys || []).join(', ')}</span>
                {j.description && <span style={styles.dimText}> — {j.description}</span>}
              </div>
            ))}
          </InventorySection>
        )}

        {/* Data Gaps */}
        {gaps.length > 0 && (
          <InventorySection title="Data Gaps">
            {gaps.map((g, i) => (
              <div key={i} style={styles.gapCard}>
                <span style={styles.gapWarningBadge}>⚠</span>
                <span style={styles.gapText}>{g}</span>
              </div>
            ))}
            <p style={styles.gapFootnote}>
              Gaps indicate data that could strengthen this analysis if added to the source document.
            </p>
          </InventorySection>
        )}

        {/* Ignored Columns */}
        {ignoredColumns.length > 0 && (
          <InventorySection title="Ignored Columns">
            {ignoredColumns.map((c, i) => (
              <div key={i} style={styles.sourceRow}>
                <span style={styles.dimTag}>{c.column}</span>
                <span style={styles.dimText}>{c.reason}</span>
              </div>
            ))}
          </InventorySection>
        )}

        {/* Unexposed Dimensions */}
        {unexposedDimensions.length > 0 && (
          <InventorySection title="Detected but Not Exposed">
            {unexposedDimensions.map((d, i) => (
              <div key={i} style={styles.sourceRow}>
                <span style={styles.dimTag}>{d.dimension}</span>
                <span style={styles.dimText}>{d.reason}</span>
              </div>
            ))}
          </InventorySection>
        )}

        {/* Footer metadata */}
        {metadata && (
          <div style={styles.footer}>
            {metadata.source && <span>Source: {metadata.source}</span>}
            {metadata.asOf && <span> · As of: {metadata.asOf}</span>}
            {metadata.sheetsAnalysed?.length > 0 && (
              <span> · Sheets: {metadata.sheetsAnalysed.join(', ')}</span>
            )}
            {metadata.generatedAt && (
              <span> · Generated: {new Date(metadata.generatedAt).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InventorySection({ title, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <p style={secStyle}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {children}
      </div>
    </div>
  );
}

const secStyle = {
  fontSize: '0.6875rem',
  fontWeight: 700,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.5rem',
};

const styles = {
  wrap: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    borderTop: '1px solid #E2E8F0',
  },
  toggle: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    textAlign: 'left',
  },
  toggleIcon: {
    fontSize: '0.75rem',
    color: '#64748B',
    width: 12,
    display: 'inline-block',
  },
  toggleLabel: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  toggleMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginLeft: '0.25rem',
  },
  gapBadge: {
    fontSize: '0.6875rem',
    color: '#92400E',
    background: '#FEF3C7',
    border: '1px solid #FDE68A',
    padding: '2px 8px',
    borderRadius: '100px',
    fontWeight: 500,
    marginLeft: '0.25rem',
  },
  body: {
    padding: '0 1.25rem 1.25rem',
    borderTop: '1px solid var(--card-border)',
    paddingTop: '1.25rem',
  },
  bodyCollapsed: { display: 'none' },

  // Sources
  sourceRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  sourcePill: {
    background: '#F0FDF4',
    color: '#166534',
    border: '1px solid #BBF7D0',
    fontSize: '0.75rem',
    padding: '3px 10px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  sourceArrow: {
    color: '#94A3B8',
    fontSize: '0.75rem',
  },
  sourceType: {
    color: '#64748B',
    fontSize: '0.75rem',
    fontStyle: 'italic',
  },
  colList: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },

  // Joins
  joinTag: {
    background: 'var(--accent-muted)',
    color: 'var(--accent)',
    fontSize: '0.75rem',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 500,
  },
  dimTag: {
    background: 'var(--chip-bg)',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 500,
  },
  dimText: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
  },

  // Gaps
  gapCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    background: '#FFFBEB',
    borderRadius: '6px',
    padding: '10px 12px',
    borderLeft: '3px solid #F97316',
    marginBottom: '0',
  },
  gapWarningBadge: {
    fontSize: '0.75rem',
    background: '#FFF7ED',
    border: '1px solid #FED7AA',
    borderRadius: '4px',
    padding: '1px 4px',
    color: '#F97316',
    flexShrink: 0,
    lineHeight: 1.5,
  },
  gapText: {
    fontSize: '0.8125rem',
    color: '#78350F',
    lineHeight: 1.6,
  },
  gapFootnote: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: '0.75rem',
    marginBottom: 0,
    lineHeight: 1.5,
  },

  footer: {
    marginTop: '1rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--card-border)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
};
