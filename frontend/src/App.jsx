import { useState, useRef, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import FileUpload from './components/FileUpload';

function AppInner() {
  const [html,         setHtml]         = useState(null);
  const [sessionId,    setSessionId]    = useState(null);
  const [error,        setError]        = useState(null);
  const [warning,      setWarning]      = useState(null);
  const [remixing,     setRemixing]     = useState(false);
  const [remixVersion, setRemixVersion] = useState(0);

  // Ask Your Data
  const [askOpen,    setAskOpen]    = useState(false);
  const [question,   setQuestion]   = useState('');
  const [answer,     setAnswer]     = useState('');
  const [asking,     setAsking]     = useState(false);

  const iframeRef = useRef(null);

  function handleResult(data) {
    setHtml(data.html);
    setSessionId(data.sessionId || null);
    setRemixVersion(0);
    setError(null);
    setAnswer('');
  }

  function handleReset() {
    setHtml(null);
    setSessionId(null);
    setRemixVersion(0);
    setError(null);
    setWarning(null);
    setAskOpen(false);
    setAnswer('');
  }

  async function handleRemix() {
    if (!sessionId || remixing) return;
    setRemixing(true);
    setError(null);

    try {
      const res  = await fetch('/api/remix', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Remix failed');

      setHtml(data.html);
      setSessionId(data.sessionId || sessionId);
      setRemixVersion(v => v + 1);
      setAnswer('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRemixing(false);
    }
  }

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim() || asking || !sessionId) return;
    setAsking(true);
    setAnswer('');
    try {
      const res  = await fetch('/api/ask', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId, question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get answer');
      setAnswer(data.answer);
    } catch (err) {
      setAnswer('Error: ' + err.message);
    } finally {
      setAsking(false);
    }
  }

  // Auto-resize iframe to content height
  useEffect(() => {
    if (!html || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const resize = () => {
      try {
        const h = iframe.contentWindow?.document?.body?.scrollHeight;
        if (h) iframe.style.height = h + 'px';
      } catch {}
    };
    iframe.addEventListener('load', resize);
    return () => iframe.removeEventListener('load', resize);
  }, [html]);

  // Handle download — save the raw HTML file
  function handleDownload() {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'docdash-dashboard.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (html) {
    return (
      <div style={styles.dashboardPage}>
        {/* ── Toolbar ──────────────────────────────────────────────── */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarBrand}>
            <span>⚡</span>
            <span style={styles.toolbarName}>DocDash</span>
            {remixVersion > 0 && (
              <span style={styles.remixBadge}>Remix #{remixVersion}</span>
            )}
          </div>
          <div style={styles.toolbarActions}>
            {sessionId && (
              <button
                onClick={() => { setAskOpen(o => !o); setAnswer(''); }}
                style={{ ...styles.toolBtn, background: askOpen ? 'var(--accent)' : undefined }}
              >
                💬 Ask Your Data
              </button>
            )}
            <button
              onClick={handleRemix}
              disabled={remixing || !sessionId}
              style={{ ...styles.toolBtn, opacity: remixing ? 0.6 : 1 }}
            >
              {remixing ? '⏳ Remixing…' : '🔀 Remix'}
            </button>
            <button onClick={handleDownload} style={styles.toolBtn}>
              ⬇ Download
            </button>
            <button onClick={handleReset} style={styles.toolBtnDanger}>
              ✕ New Analysis
            </button>
          </div>
        </div>

        {/* ── Ask Your Data panel ──────────────────────────────────── */}
        {askOpen && (
          <div style={styles.askPanel}>
            <form onSubmit={handleAsk} style={styles.askForm}>
              <input
                style={styles.askInput}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask a question about the document…"
                disabled={asking}
                autoFocus
              />
              <button type="submit" disabled={asking || !question.trim()} style={styles.askBtn}>
                {asking ? '…' : 'Ask'}
              </button>
            </form>
            {answer && (
              <div style={styles.answerBox}>
                <p style={styles.answerText}>{answer}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Banners ──────────────────────────────────────────────── */}
        {warning && (
          <div style={styles.warningBanner} role="status">
            ⚠ {warning}
            <button onClick={() => setWarning(null)} style={styles.dismissBtn} aria-label="Dismiss">✕</button>
          </div>
        )}
        {error && (
          <div style={styles.errorBanner} role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── Dashboard iframe ─────────────────────────────────────── */}
        <iframe
          ref={iframeRef}
          key={`${sessionId}-${remixVersion}`}
          srcDoc={html}
          style={styles.dashFrame}
          title="DocDash Dashboard"
          sandbox="allow-scripts"
        />
      </div>
    );
  }

  return (
    <>
      <FileUpload onResult={handleResult} onError={setError} onWarning={setWarning} />
      {warning && (
        <div style={styles.warningBanner} role="status">
          ⚠ {warning}
          <button onClick={() => setWarning(null)} style={styles.dismissBtn} aria-label="Dismiss">✕</button>
        </div>
      )}
      {error && (
        <div style={styles.errorBanner} role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const styles = {
  dashboardPage: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
  },

  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.625rem 1.5rem',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  toolbarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#f8fafc',
  },
  toolbarName: { color: '#6366f1' },
  remixBadge: {
    fontSize: '0.6875rem',
    background: 'rgba(99,102,241,0.2)',
    color: '#6366f1',
    border: '1px solid rgba(99,102,241,0.4)',
    borderRadius: '9999px',
    padding: '0.1rem 0.5rem',
    fontWeight: 600,
  },
  toolbarActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  toolBtn: {
    background: '#334155',
    border: 'none',
    color: '#e2e8f0',
    padding: '0.4rem 0.875rem',
    borderRadius: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  toolBtnDanger: {
    background: 'rgba(127,29,29,0.6)',
    border: '1px solid #7f1d1d',
    color: '#fca5a5',
    padding: '0.4rem 0.875rem',
    borderRadius: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  askPanel: {
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '0.875rem 1.5rem',
    flexShrink: 0,
  },
  askForm: {
    display: 'flex',
    gap: '0.5rem',
  },
  askInput: {
    flex: 1,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    color: '#e2e8f0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  askBtn: {
    background: '#6366f1',
    border: 'none',
    color: '#fff',
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  answerBox: {
    marginTop: '0.75rem',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '0.5rem',
    padding: '0.75rem 1rem',
  },
  answerText: {
    margin: 0,
    color: '#e2e8f0',
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },

  dashFrame: {
    width: '100%',
    border: 'none',
    minHeight: '100vh',
    display: 'block',
    flexGrow: 1,
  },

  errorBanner: {
    position: 'fixed',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#7f1d1d',
    border: '1px solid #f87171',
    color: '#fca5a5',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    maxWidth: '90vw',
    zIndex: 100,
  },
  warningBanner: {
    position: 'fixed',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#78350f',
    border: '1px solid #d97706',
    color: '#fde68a',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    maxWidth: '90vw',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    color: '#fde68a',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: 0,
    flexShrink: 0,
    opacity: 0.7,
  },
};
