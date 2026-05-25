import { useFilter } from '../context/FilterContext';

export default function DimensionFilters({ dimensions = [] }) {
  const { activeFilters, setFilter, clearAllFilters, hasActiveFilters } = useFilter();

  if (!dimensions.length) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.inner}>
        {dimensions.map(dim => (
          <div key={dim.id} style={styles.group}>
            <span style={styles.dimLabel}>{dim.label}</span>
            <div style={styles.chips}>
              {(dim.values || []).map(val => {
                const isActive = activeFilters[dim.id] === val;
                return (
                  <button
                    key={val}
                    aria-label={`Filter by ${dim.label}: ${val}`}
                    aria-pressed={isActive}
                    onClick={() => setFilter(dim.id, val)}
                    style={{
                      ...styles.chip,
                      background: isActive ? 'var(--accent)' : 'transparent',
                      color:      isActive ? '#ffffff'       : 'var(--text-muted)',
                      border:     isActive ? 'none'          : '1px solid var(--card-border)',
                      fontWeight: isActive ? 600             : 400,
                      // Keep layout stable when border disappears
                      padding:    isActive ? 'calc(0.25rem + 1px) calc(0.75rem + 1px)' : '0.25rem 0.75rem',
                    }}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {hasActiveFilters && (
          <button
            className="no-print"
            onClick={clearAllFilters}
            style={styles.resetBtn}
            aria-label="Clear all filters"
          >
            ✕ Clear all
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.75rem',
    padding: '1rem 1.25rem',
    marginBottom: '1.25rem',
  },
  inner: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center',
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  dimLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  chip: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease-in-out',
    whiteSpace: 'nowrap',
  },
  resetBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    border: '1px solid var(--card-border)',
    color: 'var(--text-secondary)',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
};
