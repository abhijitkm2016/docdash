import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ── Constants ─────────────────────────────────────────────────────────────────
const ACCEPTED       = '.pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt';
const ACCEPTED_LABEL = 'PDF · Excel · CSV · Word · PowerPoint';

const SAMPLE_TEXT = `EXECUTIVE BRIEFING — Q2 2026 PRODUCT PERFORMANCE REVIEW
Prepared by: Product Strategy Team
Date: June 2026

OVERVIEW
DocDash processed 1,247 documents in Q2 2026, representing a 340% increase from Q1 (283 documents). Average processing time improved from 8.2 seconds to 4.7 seconds following the April infrastructure upgrade. User retention at day-7 stands at 34%, above the 28% SaaS benchmark for document tools.

KEY METRICS
- Total documents processed: 1,247 (Q2) vs 283 (Q1) — +340% QoQ
- Average processing time: 4.7 seconds (improved from 8.2s)
- Day-7 retention: 34% (benchmark: 28%)
- Export actions per session: 1.8 (Print/PDF: 62%, Download: 38%)
- Most common document types: Financial reports (38%), Resumes/profiles (24%), Strategy memos (19%), Contracts (11%), Other (8%)
- API cost per document: $0.18 average
- Gross margin at current pricing: 71%

HIGHLIGHTS
The panel discussion feature (launched June 1) has driven the highest session depth of any feature — users who engage with the panel spend 4.2x longer in the app and have a 61% higher export rate.

RISKS AND GAPS
- No user authentication means zero repeat-user identification — the 34% retention figure is estimated, not measured
- API cost variance is high: simple 1-page documents cost $0.04, complex 40-page reports cost $0.67 — pricing model needs tiering
- Mobile usage accounts for 12% of sessions but bounce rate on mobile is 74% vs 31% on desktop
- No data on whether exported dashboards are being shared externally`;

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
function shouldSuggestDeep(files) {
  return files.some(f => {
    const ext = getExt(f.name);
    if (['pdf', 'docx', 'doc', 'pptx', 'ppt'].includes(ext) && f.size > 500 * 1024) return true;
    if (['xlsx', 'xls'].includes(ext) && f.size > 200 * 1024) return true;
    return false;
  });
}

function truncateName(name, max = 42) {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return name.slice(0, max - ext.length - 4) + '….' + ext;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FileUpload({ onResult, onError, onWarning, onSampleLoad, onLoadingChange, onBeforeProcess, onAuthRequired }) {
  const [files,         setFiles]         = useState([]);   // File[]
  const [dragging,      setDragging]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [progress,      setProgress]      = useState('');
  const [ctxOpen,       setCtxOpen]       = useState(false);
  const [context,       setContext]       = useState('');
  const [selectedMode,  setSelectedMode]  = useState('auto');
  const [deep,          setDeep]          = useState(false);

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

  // Core SSE fetch — accepts a ready FormData.
  // Callers are responsible for setting loading=true before calling this.
  async function runAnalysis(formData) {
    setProgress('Uploading…');
    onError(null);

    let analysingStart = null;
    let elapsedTimer  = null;

    function startElapsedTicker() {
      analysingStart = Date.now();
      elapsedTimer = setInterval(() => {
        const s = Math.round((Date.now() - analysingStart) / 1000);
        setProgress(`Claude is analysing… (${s}s)`);
      }, 1000);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { 'Authorization': `Bearer ${session.access_token}` }
        : {};

      const res = await fetch('/api/analyze', { method: 'POST', body: formData, headers });

      if (res.status === 429) {
        const data = await res.json();
        if (data.requiresAuth) {
          setLoading(false);
          onLoadingChange?.(false);
          onAuthRequired?.(data.message);
          return;
        }
      }

      if (!res.ok) {
        const text = await res.text();
        let msg;
        try { msg = JSON.parse(text).error; } catch { msg = text; }
        throw new Error(msg || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotResult = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop();

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;

          const eventLine = chunk.split('\n').find(l => l.startsWith('event:'));
          const dataLine  = chunk.split('\n').find(l => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace('event:', '').trim();
          const data      = JSON.parse(dataLine.replace('data:', '').trim());

          if (eventType === 'heartbeat') {
            if (data.status === 'received') {
              setProgress('Parsing document…');
            } else if (data.status === 'analysing' && !analysingStart) {
              startElapsedTicker();
            }
          } else if (eventType === 'result') {
            gotResult = true;
            clearInterval(elapsedTimer);
            onLoadingChange?.(false);
            if (data.truncated) {
              onWarning?.('Large document condensed for analysis — results reflect the full document\'s structure.');
            }
            onResult({ ...data, mode: data.mode || selectedMode }, files[0]?.name || 'document');
            return;
          } else if (eventType === 'error') {
            throw new Error(data.message);
          }
        }
      }

      if (!gotResult) {
        throw new Error('Analysis timed out. The document may be too large or complex. Please try again.');
      }
    } catch (err) {
      clearInterval(elapsedTimer);
      onError(err.message);
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  // Change 5 — generation triggered explicitly
  async function handleGenerate() {
    if (!files.length || loading) return;
    const oversized = files.find(f => f.size > 10 * 1024 * 1024);
    if (oversized) {
      onError(`File "${oversized.name}" exceeds the 10MB limit. Please upload a smaller file.`);
      return;
    }
    // Credit/guest gate — must run before loading state so modal can appear cleanly
    if (onBeforeProcess) {
      const creditsNeeded = deep ? 5 : 1;
      const allowed = await onBeforeProcess(creditsNeeded);
      if (!allowed) return;
    }
    // Set loading state first — before building formData or awaiting anything
    setLoading(true);
    onLoadingChange?.(true);
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (context.trim()) formData.append('context', context.trim());
    formData.append('mode', selectedMode);
    formData.append('deep', String(deep));
    await runAnalysis(formData);
  }

  // Sample document — send as CSV so backend fileFilter and fileParser both accept it
  async function handleSampleClick() {
    if (loading) return;
    // Credit/guest gate
    if (onBeforeProcess) {
      const allowed = await onBeforeProcess();
      if (!allowed) return;
    }
    // Set loading state as the very first thing — before onSampleLoad or any
    // other state update — so React flushes isLoading=true before the fetch starts
    setLoading(true);
    onLoadingChange?.(true);
    const blob = new Blob([SAMPLE_TEXT], { type: 'text/csv' });
    const file = new File([blob], 'sample-q2-2026-product-review.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('files', file);
    onSampleLoad?.();
    await runAnalysis(formData);
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

          {/* Analysis Mode — Segmented Control */}
          <div style={{ padding: '1.25rem 2rem 0' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--text-secondary)',
              marginBottom: '10px',
              marginTop: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Analysis Mode
            </p>
            <div style={{
              display: 'flex',
              width: '100%',
              background: 'var(--border)',
              borderRadius: '10px',
              padding: '3px',
              gap: '2px',
              boxSizing: 'border-box',
            }}>
              {[
                { id: 'auto',     label: '✨ Auto' },
                { id: 'finance',  label: '💰 Finance' },
                { id: 'hr',       label: '👥 HR' },
                { id: 'sales',    label: '📈 Sales' },
                { id: 'research', label: '🔬 Research' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  style={{
                    flex: 1,
                    padding: '7px 4px',
                    borderRadius: '7px',
                    border: 'none',
                    background: selectedMode === mode.id
                      ? 'var(--surface-elevated, #FFFFFF)'
                      : 'transparent',
                    color: selectedMode === mode.id
                      ? '#2563EB'
                      : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: selectedMode === mode.id ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    boxShadow: selectedMode === mode.id
                      ? '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)'
                      : 'none',
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

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

          {/* Sample document link */}
          {!hasFiles && !loading && (
            <button onClick={handleSampleClick} style={styles.sampleLink}>
              or try a sample document →
            </button>
          )}

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

          {/* Deep Analysis toggle */}
          {hasFiles && !loading && (
            <div style={{ margin: '0.75rem 2rem 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {shouldSuggestDeep(files) && !deep && (
                <div style={{
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                  borderRadius: '8px', padding: '8px 12px',
                  fontSize: '12px', color: '#1E40AF', lineHeight: 1.5,
                }}>
                  💡 Large document detected — Deep Analysis recommended for better accuracy.
                </div>
              )}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: deep ? '#EFF6FF' : 'var(--table-header-bg)',
                  border: deep ? '1px solid #BFDBFE' : '1px solid var(--card-border)',
                  borderRadius: '8px', padding: '8px 12px', cursor: 'pointer',
                }}
                onClick={() => setDeep(d => !d)}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: deep ? '#1D4ED8' : 'var(--text-primary)' }}>
                    🔍 Deep Analysis
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    Full document · richer output · 5 credits
                  </span>
                </div>
                <div style={{
                  width: '36px', height: '20px', borderRadius: '10px',
                  background: deep ? '#2563EB' : '#CBD5E1',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: deep ? '19px' : '3px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </div>
              </div>
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

  // Sample link
  sampleLink: {
    display: 'block',
    background: 'none',
    border: 'none',
    fontSize: '0.8125rem',
    color: '#2563EB',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginTop: '0.75rem',
    textAlign: 'center',
    fontFamily: 'inherit',
    padding: 0,
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
