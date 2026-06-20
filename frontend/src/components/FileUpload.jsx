import { useState, useRef } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCEPTED       = '.pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt';
const ACCEPTED_LABEL = 'PDF · Excel · CSV · Word · PowerPoint';

// ── File-type metadata ────────────────────────────────────────────────────────
const FILE_TYPE = {
  pdf:  { label: 'PDF',  color: '#DC2626', bg: 'rgba(220,38,38,0.1)',  icon: '📄' },
  xlsx: { label: 'XLSX', color: '#16A34A', bg: 'rgba(22,163,74,0.1)',  icon: '📊' },
  xls:  { label: 'XLS',  color: '#16A34A', bg: 'rgba(22,163,74,0.1)',  icon: '📊' },
  csv:  { label: 'CSV',  color: '#0D9488', bg: 'rgba(13,148,136,0.1)', icon: '📋' },
  docx: { label: 'DOCX', color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  icon: '📝' },
  doc:  { label: 'DOC',  color: '#2563EB', bg: 'rgba(37,99,235,0.1)',  icon: '📝' },
  pptx: { label: 'PPTX', color: '#D97706', bg: 'rgba(217,119,6,0.1)',  icon: '📑' },
  ppt:  { label: 'PPT',  color: '#D97706', bg: 'rgba(217,119,6,0.1)',  icon: '📑' },
};

function getExt(name)  { return (name.split('.').pop() || '').toLowerCase(); }
function formatSize(b) {
  return b < 1024 * 1024
    ? `${(b / 1024).toFixed(1)} KB`
    : `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function truncateName(name, max = 42) {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return name.slice(0, max - ext.length - 4) + '….' + ext;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FileUpload({ onResult, onError }) {
  const [files,       setFiles]       = useState([]);   // File[]
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [progress,    setProgress]    = useState('');
  const [ctxOpen,     setCtxOpen]     = useState(false);
  const [context,     setContext]     = useState('');

  const inputRef   = useRef(null);   // initial upload input
  const addMoreRef = useRef(null);   // "add more files" input

  // Change 8 — deduplicate by name + size
  function addFiles(incoming) {
    const list = Array.from(incoming || []);
    setFiles(prev => {
      const next = [...prev];
      for (const f of list) {
        const dupe = next.some(x => x.name === f.name && x.size === f.size);
        if (!dupe) next.push(f);
      }
      return next;
    });
  }

  function removeFile(idx) {
    setFiles(prev => {
      const next = prev.filter((_, i) => i !== idx);
      // Collapse context section if no files remain
      if (!next.length) setCtxOpen(false);
      return next;
    });
  }

  // Change 4 — drop adds to list only; no auto-generation
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (!loading) addFiles(e.dataTransfer.files);
  }

  // Change 5 — generation triggered explicitly
  async function handleGenerate() {
    if (!files.length || loading) return;
    setLoading(true);
    setProgress('Uploading…');
    onError(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (context.trim()) formData.append('context', context.trim());

    try {
      setProgress('Parsing document…');
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      setProgress('Claude is analysing…');

      if (!res.ok) {
        const text = await res.text();
        let msg;
        try { msg = JSON.parse(text).error; } catch { msg = text; }
        throw new Error(msg || `Server error ${res.status}`);
      }

      const json = await res.json();
      setLoading(false);
      onResult(json);
    } catch (err) {
      onError(err.message);
      setLoading(false);
    }
  }

  const hasFiles = files.length > 0;

  return (
    <>
      {/* Responsive tweaks injected once */}
      <style>{`
        @media (max-width: 480px) {
          .fd-tagline  { font-size: 1rem !important; }
          .fd-dropzone { margin: 0 1rem !important; padding: 1.75rem 1rem !important; }
          .fd-filelist { margin: 1rem 1rem 0 !important; }
          .fd-ctx      { margin: 0.75rem 1rem 0 !important; }
          .fd-genbtn   { margin: 1rem 1rem !important; width: calc(100% - 2rem) !important; }
        }
      `}</style>

      <div style={styles.page}>
        {/* ── Card ─────────────────────────────────────────────── */}
        <div style={styles.card}>

          {/* Change 2 — Topbar */}
          <div style={styles.topbar}>
            <div style={styles.topbarBrand}>
              <span>⚡</span>
              <span style={styles.topbarName}>DocDash</span>
            </div>
            <span style={styles.topbarPowered}>Powered by Claude</span>
          </div>

          {/* Hero tagline */}
          <div style={styles.hero}>
            <p className="fd-tagline" style={styles.tagline}>
              Upload any document — get an instant executive dashboard
            </p>
          </div>

          {/* Hidden inputs — kept outside interactive elements to avoid event loops */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            style={{ display: 'none' }}
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={addMoreRef}
            type="file"
            accept={ACCEPTED}
            multiple
            style={{ display: 'none' }}
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />

          {/* Change 1 — Drop zone (no longer triggers generation) */}
          <div
            className="fd-dropzone"
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
            <div style={styles.uploadIcon}>📄</div>
            <p style={styles.dropText}>Drag & drop your file here</p>
            <p style={styles.dropSub}>or click to browse</p>
            <p style={styles.acceptedLabel}>{ACCEPTED_LABEL}</p>
            {/* Change 7 — "Choose Files" (plural) */}
            <div style={styles.browseBtn}>Choose Files</div>
          </div>

          {/* Change 6 — File list */}
          {hasFiles && (
            <div className="fd-filelist" style={styles.fileList}>
              {files.map((f, i) => {
                const ext = getExt(f.name);
                const ft  = FILE_TYPE[ext] || {
                  label: ext.toUpperCase() || 'FILE',
                  color: '#6B7280',
                  bg:    'rgba(107,114,128,0.1)',
                  icon:  '📎',
                };
                return (
                  <div key={`${f.name}-${f.size}-${i}`} style={styles.fileCard}>
                    {/* Colour-coded type icon */}
                    <div style={{ ...styles.fileIconWrap, color: ft.color, background: ft.bg }}>
                      {ft.icon}
                    </div>
                    {/* Name + size */}
                    <div style={styles.fileMeta}>
                      <span style={styles.fileName}>{truncateName(f.name)}</span>
                      <span style={styles.fileSize}>{formatSize(f.size)}</span>
                    </div>
                    {/* Type badge */}
                    <span style={{ ...styles.fileBadge, color: ft.color, background: ft.bg }}>
                      {ft.label}
                    </span>
                    {/* Trash */}
                    <button
                      onClick={() => removeFile(i)}
                      disabled={loading}
                      style={styles.trashBtn}
                      aria-label={`Remove ${f.name}`}
                      title="Remove file"
                    >
                      🗑
                    </button>
                  </div>
                );
              })}

              {/* Change 7 — "Add more files" secondary button */}
              {!loading && (
                <button
                  onClick={() => addMoreRef.current?.click()}
                  style={styles.addMoreBtn}
                >
                  + Add more files
                </button>
              )}

              {/* Multi-file hint */}
              {files.length >= 2 && (
                <p style={styles.multiHint}>
                  💡 For best results, upload files that are related to each other.
                </p>
              )}
            </div>
          )}

          {/* Change 9 — Collapsible context input */}
          {hasFiles && !loading && (
            <div className="fd-ctx" style={styles.ctxSection}>
              <button
                style={styles.ctxToggle}
                onClick={() => setCtxOpen(o => !o)}
                aria-expanded={ctxOpen}
              >
                <span style={styles.ctxLabel}>
                  Add context
                  <span style={styles.ctxBadge}>optional</span>
                </span>
                <span style={{
                  ...styles.ctxChevron,
                  transform: ctxOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▾</span>
              </button>

              {ctxOpen && (
                <div style={styles.ctxBody}>
                  <textarea
                    style={styles.ctxTextarea}
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    rows={3}
                    placeholder="e.g. This is a Q3 board report — focus on liquidity metrics and flag any anomalies."
                  />
                  <p style={styles.ctxHint}>
                    Tell the AI what to focus on. This sharpens the dashboard output.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Change 5 — Generate Dashboard button */}
          {hasFiles && (
            <button
              className="fd-genbtn"
              onClick={handleGenerate}
              disabled={loading}
              style={{
                ...styles.generateBtn,
                opacity: loading ? 0.75 : 1,
                animation: loading ? 'pulse 1s ease-in-out infinite' : 'none',
              }}
            >
              {loading ? (
                <>
                  <span style={styles.btnSpinner} />
                  {progress}
                </>
              ) : (
                '⚡ Generate Dashboard'
              )}
            </button>
          )}

          {/* Change 3 — Footer */}
          <div style={styles.footer}>
            <span style={styles.footerUrl}>docdash-dusky.vercel.app</span>
            <span style={styles.footerBuilt}>
              <span style={styles.footerDot} />
              Built by Abhijit Mishra
            </span>
          </div>

        </div>{/* end card */}
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  // Change 1 — outer page wrapper
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 16px',
    boxSizing: 'border-box',
    background: 'var(--bg)',
  },

  // Change 1 — card: max-width 780px
  card: {
    width: '100%',
    maxWidth: 780,
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '1.25rem',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
  },

  // Change 2 — Topbar
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    borderBottom: '1px solid var(--card-border)',
    background: 'var(--table-header-bg)',
  },
  topbarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.9375rem',
  },
  topbarName: { fontWeight: 700, color: 'var(--accent)' },
  topbarPowered: { fontSize: '0.75rem', color: 'var(--text-muted)' },

  // Hero
  hero: { padding: '1.75rem 2rem 0' },
  tagline: {
    fontSize: 'clamp(1.0625rem, 2.5vw, 1.3125rem)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    margin: '0 0 1.25rem',
    textAlign: 'center',
    lineHeight: 1.3,
  },

  // Drop zone
  dropzone: {
    margin: '0 2rem',
    background: 'var(--input-bg)',
    border: '2px dashed var(--card-border)',
    borderRadius: '0.875rem',
    padding: '2.25rem 2rem',
    textAlign: 'center',
    transition: 'border-color 0.2s, background 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dropzoneActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-muted)',
  },
  uploadIcon:    { fontSize: '2rem' },
  dropText:      { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  dropSub:       { color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 },
  acceptedLabel: { color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 },
  browseBtn: {
    marginTop: '0.5rem',
    background: 'var(--accent)',
    color: '#fff',
    padding: '0.5rem 1.25rem',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontSize: '0.875rem',
    userSelect: 'none',
  },

  // Change 6 — File list
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    margin: '1.25rem 2rem 0',
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'var(--table-header-bg)',
    borderRadius: '0.625rem',
    padding: '0.625rem 0.875rem',
    border: '1px solid var(--card-border)',
  },
  fileIconWrap: {
    fontSize: '1.25rem',
    width: 36,
    height: 36,
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.1rem',
    minWidth: 0,
  },
  fileName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
  },
  fileSize: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  fileBadge: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    flexShrink: 0,
    textTransform: 'uppercase',
  },
  trashBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    padding: '0.25rem',
    color: 'var(--text-muted)',
    flexShrink: 0,
    lineHeight: 1,
    borderRadius: '0.25rem',
  },

  // Multi-file hint
  multiHint: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    margin: '0.25rem 0 0',
    lineHeight: 1.5,
  },

  // Change 7 — "Add more files"
  addMoreBtn: {
    alignSelf: 'flex-start',
    background: 'transparent',
    border: '1px dashed var(--card-border)',
    color: 'var(--text-secondary)',
    borderRadius: '0.5rem',
    padding: '0.4rem 0.875rem',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    fontWeight: 500,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, color 0.15s',
  },

  // Change 9 — Context section
  ctxSection: {
    margin: '1rem 2rem 0',
    border: '1px solid var(--card-border)',
    borderRadius: '0.625rem',
    overflow: 'hidden',
  },
  ctxToggle: {
    width: '100%',
    background: 'var(--table-header-bg)',
    border: 'none',
    padding: '0.625rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ctxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  ctxBadge: {
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    background: 'var(--chip-bg)',
    padding: '0.1rem 0.45rem',
    borderRadius: '9999px',
    fontWeight: 400,
    letterSpacing: '0.02em',
  },
  ctxChevron: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    transition: 'transform 0.2s ease',
    display: 'inline-block',
  },
  ctxBody: {
    padding: '0.75rem 1rem',
    borderTop: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
  },
  ctxTextarea: {
    width: '100%',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    outline: 'none',
    minHeight: 72,
  },
  ctxHint: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.375rem',
    marginBottom: 0,
    lineHeight: 1.5,
  },

  // Change 5 — Generate button
  generateBtn: {
    margin: '1.25rem 2rem',
    width: 'calc(100% - 4rem)',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.75rem',
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    letterSpacing: '-0.01em',
    transition: 'opacity 0.2s',
  },
  btnSpinner: {
    display: 'inline-block',
    width: 18,
    height: 18,
    border: '2.5px solid rgba(255,255,255,0.35)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },

  // Change 3 — Footer
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.625rem 1.5rem',
    borderTop: '1px solid var(--card-border)',
    background: 'var(--table-header-bg)',
    marginTop: 'auto',
  },
  footerUrl: {
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
    fontFamily: 'ui-monospace, "Cascadia Code", monospace',
    letterSpacing: '0.01em',
  },
  footerBuilt: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.6875rem',
    color: 'var(--text-muted)',
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0,
  },
};
