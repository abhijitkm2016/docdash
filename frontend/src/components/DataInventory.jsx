import { useState } from 'react';

export default function DataInventory({ inventory, metadata }) {
  const [open, setOpen] = useState(false);

  if (!inventory) return null;

  const { sources = [], joins = [], gaps = [], ignoredColumns = [], unexposedDimensions = [] } = inventory;
  const hasContent = sources.length || joins.length || gaps.length || ignoredColumns.length || unexposedDimensions.length;
  if (!hasContent) return null;

  return (
    <div style={styles.wrap}>
      <button
        className="no-print"
        onClick={() => setOpen(o => !o)}
        style={styles.toggle}
        aria-expanded={open}
        aria-label="Toggle data inventory"
      >
        <span style={styles.toggleIcon}>{open ? '▾' : '▸'}</span>
        <span style={styles.toggleLabel}>Data Inventory</span>
        <span style={styles.toggleMeta}>
          {sources.length} source{sources.length !== 1 ? 's' : ''}
          {joins.length ? ` · ${joins.length} join${joins.length !== 1 ? 's' : ''}` : ''}
          {gaps.length ? ` · ${gaps.length} gap${gaps.length !== 1 ? 's' : ''}` : ''}
        </span>
      </button>

      {/* print-expand forces this open when printing */}
      <div
        className={open ? 'print-expand' : 'print-expand'}
        style={{ ...styles.body, ...(open ? {} : styles.bodyCollapsed) }}
      >
        {sources.length > 0 && (
          <InventorySection title="Sources">
            {sources.map((s, i) => (
              <Row key={i}>
                <Tag>{s.file}</Tag>
                {s.sheet && <span style={styles.arrow}>→</span>}
                {s.sheet && <Tag dim>{s.sheet}</Tag>}
                {s.columns?.length > 0 && (
                  <span style={styles.colList}>{s.columns.join(', ')}</span>
                )}
              </Row>
            ))}
          </InventorySection>
        )}

        {joins.length > 0 && (
          <InventorySection title="Joins">
            {joins.map((j, i) => (
              <Row key={i}>
                <Tag accent>{j.type}</Tag>
                <span style={styles.joinKeys}>on {(j.keys || []).join(', ')}</span>
                {j.description && <span style={styles.dim}> — {j.description}</span>}
              </Row>
            ))}
          </InventorySection>
        )}

        {gaps.length > 0 && (
          <InventorySection title="Data Gaps">
            {gaps.map((g, i) => (
              <Row key={i}>
                <span style={styles.gapIcon}>⚠</span>
                <span style={styles.gapText}>{g}</span>
              </Row>
            ))}
          </InventorySection>
        )}

        {ignoredColumns.length > 0 && (
          <InventorySection title="Ignored Columns">
            {ignoredColumns.map((c, i) => (
              <Row key={i}>
                <Tag dim>{c.column}</Tag>
                <span style={styles.dim}>{c.reason}</span>
              </Row>
            ))}
          </InventorySection>
        )}

        {unexposedDimensions.length > 0 && (
          <InventorySection title="Detected but Not Exposed">
            {unexposedDimensions.map((d, i) => (
              <Row key={i}>
                <Tag dim>{d.dimension}</Tag>
                <span style={styles.dim}>{d.reason}</span>
              </Row>
            ))}
          </InventorySection>
        )}

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
    <div style={{ marginBottom: '1rem' }}>
      <p style={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '0.5rem',
      }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.375rem' }}>
      {children}
    </div>
  );
}

function Tag({ children, dim, accent }) {
  return (
    <span style={{
      background: accent ? 'var(--accent-muted)' : 'var(--chip-bg)',
      color: accent ? 'var(--accent)' : dim ? 'var(--text-muted)' : 'var(--text-secondary)',
      fontSize: '0.75rem',
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontWeight: 500,
    }}>
      {children}
    </span>
  );
}

const styles = {
  wrap: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
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
  toggleIcon: { fontSize: '0.875rem', color: 'var(--text-muted)', width: 12 },
  toggleLabel: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' },
  toggleMeta: { fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.25rem' },
  body: {
    padding: '0 1.25rem 1.25rem',
    borderTop: '1px solid var(--card-border)',
    paddingTop: '1rem',
  },
  bodyCollapsed: { display: 'none' },
  arrow: { color: 'var(--text-muted)', fontSize: '0.75rem' },
  colList: { fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' },
  joinKeys: { fontSize: '0.8125rem', color: 'var(--text-secondary)' },
  dim: { fontSize: '0.8125rem', color: 'var(--text-muted)' },
  gapIcon: { color: 'var(--warning)', fontSize: '0.875rem' },
  gapText: { fontSize: '0.8125rem', color: 'var(--text-secondary)' },
  footer: {
    marginTop: '1rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--card-border)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
};
