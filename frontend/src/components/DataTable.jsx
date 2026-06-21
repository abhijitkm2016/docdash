import { useState, useMemo } from 'react';
import { useFilteredRows } from '../hooks/useFilteredData';

export default function DataTable({ columns, rows, dimensions = [] }) {
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');
  const [sortCol, setSortCol]   = useState(-1);
  const [sortDir, setSortDir]   = useState(1);

  const contextFiltered = useFilteredRows(columns, rows, dimensions);

  const displayed = useMemo(() => {
    let result = contextFiltered;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(row => row.some(cell => String(cell).toLowerCase().includes(q)));
    }

    if (sortCol >= 0) {
      result = [...result].sort((a, b) => {
        const an = Number(a[sortCol]), bn = Number(b[sortCol]);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir;
        return String(a[sortCol]).localeCompare(String(b[sortCol])) * sortDir;
      });
    }

    return result;
  }, [contextFiltered, search, sortCol, sortDir]);

  function toggleSort(i) {
    if (sortCol === i) setSortDir(d => d * -1);
    else { setSortCol(i); setSortDir(1); }
  }

  return (
    <div style={styles.wrap}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...styles.toggle, borderBottom: open ? '1px solid var(--card-border)' : 'none' }}
        aria-expanded={open}
      >
        <span style={styles.toggleIcon}>{open ? '▾' : '▸'}</span>
        <span style={styles.toggleLabel}>Data Table</span>
        <span style={styles.toggleMeta}>{rows.length} rows · {columns.length} columns</span>
      </button>

      <div style={{ display: open ? undefined : 'none' }}>
      <div style={styles.controls}>
        <input
          style={styles.search}
          type="text"
          placeholder="Search table…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search table rows"
        />
        <span style={styles.count}>
          {displayed.length} / {rows.length} rows
          {contextFiltered.length < rows.length ? ' (filtered)' : ''}
        </span>
      </div>

      <div style={styles.scroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{ ...styles.th, color: sortCol === i ? 'var(--accent)' : 'var(--text-secondary)' }}
                  onClick={() => toggleSort(i)}
                  aria-sort={sortCol === i ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
                >
                  {col}
                  <span style={{ marginLeft: 4, opacity: 0.6 }}>
                    {sortCol === i ? (sortDir === 1 ? '↑' : '↓') : '↕'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.slice(0, 100).map((row, ri) => (
              <tr
                key={ri}
                style={styles.tr}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map((_, ci) => (
                  <td key={ci} style={styles.td}>{String(row[ci] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {displayed.length > 100 && (
        <p style={styles.footer}>Showing first 100 of {displayed.length} rows</p>
      )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: 'var(--card-bg)',
    borderRadius: '0.75rem',
    border: '1px solid var(--card-border)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  },
  toggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.875rem 1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  toggleIcon: {
    fontSize: '0.75rem',
    color: 'var(--accent)',
    flexShrink: 0,
    width: 12,
  },
  toggleLabel: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  toggleMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  controls: {
    padding: '1rem',
    borderBottom: '1px solid var(--card-border)',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  search: {
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: '0.5rem',
    color: 'var(--text-primary)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    flex: 1,
    minWidth: 200,
    outline: 'none',
  },
  count: { color: 'var(--text-muted)', fontSize: '0.8125rem', whiteSpace: 'nowrap' },
  scroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: {
    background: 'var(--table-header-bg)',
    textAlign: 'left',
    padding: '0.75rem 1rem',
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--card-border)',
  },
  tr: { transition: 'background 0.1s' },
  td: {
    padding: '0.625rem 1rem',
    borderBottom: '1px solid var(--table-row-border)',
    color: 'var(--text-secondary)',
  },
  footer: {
    padding: '0.75rem 1rem',
    color: 'var(--text-muted)',
    fontSize: '0.8125rem',
    borderTop: '1px solid var(--card-border)',
  },
};
