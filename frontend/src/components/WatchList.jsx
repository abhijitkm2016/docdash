const CONFIG = {
  risk:   { border: 'var(--alert)',   bg: 'rgba(217,48,37,0.06)'  },
  watch:  { border: 'var(--warning)', bg: 'rgba(249,171,0,0.06)'  },
  action: { border: 'var(--success)', bg: 'rgba(30,142,62,0.06)'  },
};

export default function WatchList({ watchList }) {
  if (!watchList || watchList.length === 0) return null;

  return (
    <div style={styles.grid}>
      {watchList.map((item, i) => {
        const cfg = CONFIG[item.type] || CONFIG.watch;
        return (
          <div
            key={i}
            style={{
              ...styles.card,
              borderLeft: `4px solid ${cfg.border}`,
              background: cfg.bg,
            }}
          >
            <p style={styles.text}>{item.text}</p>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    borderRadius: '0 0.625rem 0.625rem 0',
    border: '1px solid var(--card-border)',
    borderLeft: '4px solid var(--card-border)', // overridden inline
    padding: '1rem 1.25rem',
    boxShadow: 'var(--shadow)',
  },
  text: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
};
