import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { useDocuments } from './hooks/useDocuments';
import FileUpload       from './components/FileUpload';
import Dashboard        from './components/Dashboard';
import AuthModal        from './components/AuthModal';
import DocumentHistory  from './components/DocumentHistory';
import ShareButton      from './components/ShareButton';
import SharedView       from './components/SharedView';
import LoadingState     from './components/LoadingState';
import ErrorState       from './components/ErrorState';

function detectErrorType(msg) {
  if (!msg) return 'generic';
  const m = msg.toLowerCase();
  if (m.includes('10mb') || m.includes('too large') || m.includes('413') || m.includes('size limit') || m.includes('exceeds')) return 'filesize';
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network') || m.includes('connection')) return 'network';
  if (m.includes('timed out') || m.includes('claude') || m.includes('server error 5') || m.includes('processing') || m.includes('analysis')) return 'processing';
  if (m.includes('upload') || m.includes('unsupported') || m.includes('parse') || m.includes("couldn't read")) return 'upload';
  return 'generic';
}

// ── Shared route — check before anything else ─────────────────────────────────
function SharedRoute() {
  const parts = window.location.pathname.split('/');
  if (parts[1] === 'share' && parts[2]) {
    return <SharedView shareToken={parts[2]} />;
  }
  return null;
}

// ── Main app ──────────────────────────────────────────────────────────────────
function AppInner() {
  // ── Shared route short-circuit ────────────────────────────────────────────
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] === 'share' && pathParts[2]) {
    return <SharedView shareToken={pathParts[2]} />;
  }

  const { user, signOut } = useAuth();
  const { saveDocument, loadDocument } = useDocuments();

  const [result,            setResult]            = useState(null);
  const [sessionId,         setSessionId]         = useState(null);
  const [currentFileName,   setCurrentFileName]   = useState(null);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [error,             setError]             = useState(null);
  const [warning,           setWarning]           = useState(null);
  const [remixing,          setRemixing]          = useState(false);
  const [remixVersion,      setRemixVersion]      = useState(0);
  const [animKey,           setAnimKey]           = useState(0);
  const [isSample,          setIsSample]          = useState(false);
  const [showAuthModal,     setShowAuthModal]     = useState(false);
  const [showHistory,       setShowHistory]       = useState(false);
  const [isLoading,         setIsLoading]         = useState(false);

  async function handleResult(data, fileName) {
    setResult(data);
    setSessionId(data.sessionId || null);
    setCurrentFileName(fileName || 'document');
    setCurrentDocumentId(null);
    setRemixVersion(0);
    setAnimKey(k => k + 1);
    setError(null);

    // Auto-save if signed in
    if (user && data.dashboardData) {
      const saved = await saveDocument({
        fileName:      fileName || 'document',
        title:         data.dashboardData.title || fileName || 'document',
        dashboardData: data.dashboardData,
      });
      if (saved) setCurrentDocumentId(saved.id);
    }
  }

  function handleReset() {
    setResult(null);
    setSessionId(null);
    setCurrentFileName(null);
    setCurrentDocumentId(null);
    setRemixVersion(0);
    setError(null);
    setWarning(null);
    setIsSample(false);
    setShowHistory(false);
    setIsLoading(false);
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

      setResult(data);
      setSessionId(data.sessionId || sessionId);
      setRemixVersion(v => v + 1);
      setAnimKey(k => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemixing(false);
    }
  }

  async function handleLoadFromHistory(docId) {
    const doc = await loadDocument(docId);
    if (!doc) return;
    // Reconstruct a result-shaped object from the stored dashboard_data
    setResult({ dashboardData: doc.dashboard_data, standaloneHtml: '', sessionId: null });
    setSessionId(null);
    setCurrentFileName(doc.file_name);
    setCurrentDocumentId(docId);
    setRemixVersion(0);
    setAnimKey(k => k + 1);
    setError(null);
    setIsSample(false);
    setShowHistory(false);
  }

  // ── Auth controls rendered into Dashboard's navbar ──────────────────────────
  const authControls = (
    <>
      <button
        onClick={() => setShowHistory(h => !h)}
        style={navBtnStyle}
        className="no-print"
        title="Document history"
      >
        📄 History
      </button>
      {user ? (
        <>
          <span style={userEmailStyle} title={user.email}>
            {user.email.length > 22 ? user.email.slice(0, 20) + '…' : user.email}
          </span>
          <button onClick={signOut} style={textLinkStyle} className="no-print">
            Sign out
          </button>
        </>
      ) : (
        <button
          onClick={() => setShowAuthModal(true)}
          style={navBtnStyle}
          className="no-print"
        >
          Sign in
        </button>
      )}
    </>
  );

  if (result) {
    const showNudge = !user && !isSample;
    return (
      <div key={animKey} style={{ animation: 'fadeInUp 0.35s ease' }}>
        {isSample && (
          <div style={styles.sampleBanner}>
            Viewing sample document — upload your own file to analyse it
          </div>
        )}
        {showNudge && (
          <div style={styles.nudgeBanner}>
            Sign in to save this dashboard and access it later.{' '}
            <button onClick={() => setShowAuthModal(true)} style={styles.nudgeLink}>
              Sign in
            </button>
          </div>
        )}

        {/* History sidebar */}
        {showHistory && (
          <div style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <span style={styles.sidebarTitle}>Document History</span>
              <button onClick={() => setShowHistory(false)} style={styles.sidebarClose}>×</button>
            </div>
            {user ? (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <DocumentHistory
                  onLoadDocument={handleLoadFromHistory}
                  currentDocumentId={currentDocumentId}
                />
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 12px' }}>
                  Sign in to access your document history.
                </p>
                <button onClick={() => { setShowAuthModal(true); setShowHistory(false); }} style={styles.signInBtn}>
                  Sign in
                </button>
              </div>
            )}
          </div>
        )}

        <Dashboard
          data={result.dashboardData}
          standaloneHtml={result.standaloneHtml}
          sessionId={sessionId}
          onReset={handleReset}
          onRemix={handleRemix}
          remixing={remixing}
          remixVersion={remixVersion}
          authControls={authControls}
          shareButton={<ShareButton documentId={currentDocumentId} />}
        />

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

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      </div>
    );
  }

  return (
    <>
      {/* ── Landing page auth bar — always visible ──────────────── */}
      <div style={styles.landingAuthBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '1rem' }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>DocDash</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user ? (
            <>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user.email.length > 28 ? user.email.slice(0, 26) + '…' : user.email}
              </span>
              <button onClick={signOut} style={textLinkStyle}>Sign out</button>
            </>
          ) : (
            <button onClick={() => setShowAuthModal(true)} style={navBtnStyle}>
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* Loading overlay — shown while Claude processes */}
      {isLoading && <LoadingState />}

      {/* Error state — shown when something goes wrong */}
      {!isLoading && error && (
        <ErrorState
          errorType={detectErrorType(error)}
          message={error}
          onRetry={() => setError(null)}
          onReset={handleReset}
        />
      )}

      {/* FileUpload — always mounted to preserve file list state; hidden when loading or error */}
      <div style={{ display: isLoading || error ? 'none' : undefined }}>
        <FileUpload
          onResult={handleResult}
          onError={setError}
          onWarning={setWarning}
          onSampleLoad={() => setIsSample(true)}
          onLoadingChange={setIsLoading}
        />
      </div>

      {warning && (
        <div style={styles.warningBanner} role="status">
          ⚠ {warning}
          <button onClick={() => setWarning(null)} style={styles.dismissBtn} aria-label="Dismiss">✕</button>
        </div>
      )}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
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

// ── Inline nav button styles (passed into Dashboard as JSX) ───────────────────
const navBtnStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  color: 'var(--text-secondary)',
  padding: '0.5rem 0.875rem',
  borderRadius: '0.5rem',
  fontWeight: 500,
  fontSize: '0.875rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
};

const textLinkStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '0.8125rem',
  cursor: 'pointer',
  padding: '0.25rem',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
};

const userEmailStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  maxWidth: 160,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const styles = {
  landingAuthBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.625rem 1.5rem',
    borderBottom: '1px solid var(--card-border)',
    background: 'var(--card-bg)',
  },
  sampleBanner: {
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    color: '#1E40AF',
    fontSize: '0.75rem',
    padding: '8px 16px',
    textAlign: 'center',
    maxWidth: 1200,
    margin: '0 auto 0',
  },
  nudgeBanner: {
    background: '#FFF7ED',
    borderBottom: '1px solid #FED7AA',
    color: '#92400E',
    fontSize: '0.75rem',
    padding: '6px 24px',
    textAlign: 'center',
  },
  nudgeLink: {
    background: 'none',
    border: 'none',
    color: '#C2410C',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    fontFamily: 'inherit',
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: 280,
    height: '100vh',
    background: '#ffffff',
    borderRight: '1px solid #E2E8F0',
    boxShadow: '4px 0 12px rgba(0,0,0,0.06)',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid #E2E8F0',
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0F172A',
  },
  sidebarClose: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#94A3B8',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '2px 4px',
  },
  signInBtn: {
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBanner: {
    position: 'fixed',
    bottom: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#7f1d1d',
    border: '1px solid var(--alert)',
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
