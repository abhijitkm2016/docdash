export default function DownloadButton({ standaloneHtml, title }) {
  function download() {
    const blob = new Blob([standaloneHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'dashboard').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className="no-print"
      onClick={download}
      style={styles.btn}
      aria-label="Download dashboard as standalone HTML"
    >
      ↓ Download
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
    whiteSpace: 'nowrap',
  },
};
