import { useState, useRef } from 'react';

const ACCEPTED       = '.pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt';
const ACCEPTED_LABEL = 'PDF · Excel · CSV · Word · PowerPoint';

export default function FileUpload({ onResult, onError }) {
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [fileName, setFileName]   = useState('');
  const [progress, setProgress]   = useState('Uploading…');
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    setProgress('Uploading…');
    onError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress('Parsing document…');
      const res  = await fetch('/api/analyze', { method: 'POST', body: formData });
      setProgress('Claude is analysing…');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Analysis failed');
      onResult(json);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div style={styles.page}>
      <div style={styles.brand}>
        <span style={styles.brandIcon}>⚡</span>
        <span style={styles.brandName}>DocDash</span>
      </div>
      <p style={styles.tagline}>
        Upload any document — get an instant executive dashboard
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload file — click or drag and drop"
        style={{
          ...styles.dropzone,
          ...(dragging ? styles.dropzoneActive : {}),
          cursor: loading ? 'default' : 'pointer',
        }}
        onDragOver={e => { e.preventDefault(); if (!loading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && !loading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner} />
            <p style={styles.loadingFile}>{fileName}</p>
            <p style={styles.loadingStatus}>{progress}</p>
          </div>
        ) : (
          <>
            <div style={styles.uploadIcon}>📄</div>
            <p style={styles.dropText}>Drag & drop your file here</p>
            <p style={styles.dropSub}>or click to browse</p>
            <p style={styles.acceptedLabel}>{ACCEPTED_LABEL}</p>
            <div style={styles.browseBtn}>Choose File</div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    gap: '0.75rem',
    background: 'var(--bg)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  brandIcon: { fontSize: '2rem' },
  brandName: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.03em',
  },
  tagline: { color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.75rem' },
  dropzone: {
    width: '100%',
    maxWidth: 520,
    background: 'var(--card-bg)',
    border: '2px dashed var(--card-border)',
    borderRadius: '1rem',
    padding: '3rem 2rem',
    textAlign: 'center',
    transition: 'border-color 0.2s, background 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.625rem',
  },
  dropzoneActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-muted)',
  },
  uploadIcon: { fontSize: '3rem' },
  dropText: { fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' },
  dropSub: { color: 'var(--text-muted)', fontSize: '0.875rem' },
  acceptedLabel: { color: 'var(--text-muted)', fontSize: '0.8125rem' },
  browseBtn: {
    marginTop: '0.5rem',
    background: 'var(--accent)',
    color: '#fff',
    padding: '0.625rem 1.5rem',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontSize: '0.9375rem',
  },
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' },
  spinner: {
    width: 40, height: 40,
    border: '3px solid var(--card-border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingFile: { color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 600 },
  loadingStatus: { color: 'var(--text-muted)', fontSize: '0.875rem' },
};

if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}
