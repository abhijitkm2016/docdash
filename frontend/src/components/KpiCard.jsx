export default function KpiCard({ label, value, unit, trend, soWhat, nowWhat }) {
  const trendColor =
    trend === 'up'   ? 'var(--success)' :
    trend === 'down' ? 'var(--alert)'   : 'var(--text-primary)';

  const trendIcon =
    trend === 'up'   ? '↑' :
    trend === 'down' ? '↓' : null;

  const valueStr = String(value ?? '');
  // Suppress unit if value already contains it (prevents "62.8% %" double-symbol)
  const showUnit = unit && !valueStr.includes(unit.trim());

  return (
    <div className="kpi-card" style={styles.card}>
      <p style={styles.label}>{label}</p>

      <div style={{ ...styles.valueRow, color: trendColor }}>
        <span style={styles.value}>{valueStr}</span>
        {showUnit  && <span style={styles.unit}>{unit}</span>}
        {trendIcon && <span style={styles.trendIcon}>{trendIcon}</span>}
      </div>

      {soWhat && (
        <p style={styles.soWhat}>{soWhat}</p>
      )}

      {nowWhat && (
        <p style={styles.nowWhat}>
          <span style={styles.nowWhatBadge}>→</span> {nowWhat}
        </p>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--card-bg)',
    borderRadius: '0.75rem',
    padding: '20px 18px',
    border: '1px solid var(--card-border)',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    minWidth: '180px',
  },
  label: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.25rem',
    flexWrap: 'wrap',
  },
  value: {
    fontSize: 'clamp(22px, 2.5vw, 32px)',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  unit: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: 400,
  },
  trendIcon: {
    fontSize: '1rem',
    fontWeight: 700,
  },
  soWhat: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginTop: '0.25rem',
  },
  nowWhat: {
    fontSize: '0.75rem',
    color: 'var(--accent)',
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.25rem',
    marginTop: '0.25rem',
  },
  nowWhatBadge: {
    fontWeight: 700,
    flexShrink: 0,
  },
};
