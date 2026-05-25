export default function PrintButton() {
  return (
    <button
      className="no-print"
      onClick={() => window.print()}
      style={styles.btn}
      aria-label="Print or save as PDF"
      title="Print / Save as PDF"
    >
      🖨 Print / PDF
    </button>
  );
}

const styles = {
  btn: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    color: 'var(--text-secondary)',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  },
};
