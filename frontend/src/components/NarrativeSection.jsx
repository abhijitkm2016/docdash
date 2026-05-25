export default function NarrativeSection({ narrative }) {
  const paragraphs = narrative.split(/\n\n+/).filter(Boolean);

  return (
    <div style={styles.box}>
      {paragraphs.map((p, i) => (
        <p key={i} style={styles.para}>{p.trim()}</p>
      ))}
    </div>
  );
}

const styles = {
  box: {
    background: 'var(--card-bg)',
    borderRadius: '0.75rem',
    border: '1px solid var(--card-border)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: 'var(--shadow)',
  },
  para: {
    color: 'var(--text-secondary)',
    lineHeight: 1.75,
    fontSize: '0.9375rem',
  },
};
