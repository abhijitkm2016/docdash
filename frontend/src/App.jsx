import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { useDocuments } from './hooks/useDocuments';
import { useCredits } from './hooks/useCredits';
import FileUpload       from './components/FileUpload';
import Dashboard        from './components/Dashboard';
import AuthModal        from './components/AuthModal';
import DocumentHistory  from './components/DocumentHistory';
import { useShares }    from './hooks/useShares';
import SharedView       from './components/SharedView';
import LoadingState     from './components/LoadingState';
import ErrorState       from './components/ErrorState';
import WelcomeScreen    from './components/WelcomeScreen';
import GuestBanner      from './components/GuestBanner';
import PricingModal     from './components/PricingModal';
import RemixPopover     from './components/RemixPopover';
import PurchaseHistory  from './components/PurchaseHistory';

function detectErrorType(msg) {
  if (!msg) return 'generic';
  const m = msg.toLowerCase();
  if (m.includes('billing') || m.includes('quota') || m.includes('overloaded') || m.includes('rate limit') || m.includes('authentication') || m.includes('credit was not charged')) return 'service';
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

  const { user, signOut, loading: authLoading } = useAuth();
  const { saveDocument, loadDocument } = useDocuments();
  const { credits, deductCredit, restoreCredit } = useCredits();
  const { createShare } = useShares();

  const [result,            setResult]            = useState(null);
  const [sessionId,         setSessionId]         = useState(null);
  const [currentFileName,   setCurrentFileName]   = useState(null);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [error,             setError]             = useState(null);
  const [warning,           setWarning]           = useState(null);
  const [remixLoading,      setRemixLoading]      = useState(false);
  const [showRemixPopover,  setShowRemixPopover]  = useState(false);
  const [remixVersion,      setRemixVersion]      = useState(0);
  const [animKey,           setAnimKey]           = useState(0);
  const [isSample,          setIsSample]          = useState(false);
  const [showAuthModal,     setShowAuthModal]     = useState(false);
  const [showHistory,       setShowHistory]       = useState(false);
  const [historyTab,        setHistoryTab]        = useState('documents');
  const [isLoading,         setIsLoading]         = useState(false);
  const [guestMode,         setGuestMode]         = useState(false);
  const [showPricingModal,  setShowPricingModal]  = useState(false);
  const [creditSuccess,     setCreditSuccess]     = useState(null);
  const [guestLimitMessage, setGuestLimitMessage] = useState(null);
  const [currentMode,       setCurrentMode]       = useState('auto');
  const [toast,             setToast]             = useState(null);

  async function handleResult(data, fileName) {
    setResult(data);
    setSessionId(data.sessionId || null);
    setCurrentFileName(fileName || 'document');
    setCurrentDocumentId(null);
    setRemixVersion(0);
    setAnimKey(k => k + 1);
    setError(null);
    setCurrentMode(data.mode || 'auto');

    // Auto-save if signed in
    if (user && data.dashboardData) {
      const saved = await saveDocument({
        fileName:      fileName || 'document',
        title:         data.dashboardData.title || fileName || 'document',
        dashboardData: data.dashboardData,
        mode:          data.mode || 'auto',
      });
      if (saved) setCurrentDocumentId(saved.id);
    }

    // Deduct credit after successful generation
    if (user) {
      await deductCredit(fileName || 'Document generation');
    }
  }

  // Called by FileUpload before processing starts — returns false to abort
  async function handleBeforeProcess() {
    if (user) {
      if (!credits || credits.credits_remaining <= 0) {
        setShowPricingModal(true);
        return false;
      }
      return true;
    }
    // Guest: track uploads in localStorage, allow 5 free then force sign-in
    const guestUploads = parseInt(localStorage.getItem('docdash_guest_uploads') || '0');
    if (guestUploads >= 5) {
      setShowAuthModal(true);
      return false;
    }
    localStorage.setItem('docdash_guest_uploads', String(guestUploads + 1));
    return true;
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

  async function doRemix(endpoint, extraBody = {}, description = 'Remix') {
    if (!sessionId || remixLoading) return;
    if (!user) { setShowAuthModal(true); return; }
    if (credits && credits.credits_remaining <= 0) { setShowPricingModal(true); return; }

    setRemixLoading(true);
    setError(null);
    await deductCredit(description);

    let success = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/remix/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ sessionId, ...extraBody }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error === 'remix_requires_auth') {
        setShowAuthModal(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Remix failed');
      setResult(data);
      setSessionId(data.sessionId || sessionId);
      setRemixVersion(v => v + 1);
      setAnimKey(k => k + 1);
      success = true;
    } catch (err) {
      setError(err.message);
    } finally {
      if (!success) await restoreCredit();
      setRemixLoading(false);
    }
  }

  function handleAutoRemix() { doRemix('auto', {}, 'Auto Remix'); }
  function handleGuidedRemix(instructions) {
    doRemix(
      'guided',
      { instructions },
      `Guided Remix${instructions ? ': ' + instructions.slice(0, 40) : ''}`
    );
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

  async function handleShare() {
    if (!currentDocumentId) return;
    const share = await createShare(currentDocumentId);
    if (share) {
      const url = `${window.location.origin}/share/${share.share_token}`;
      await navigator.clipboard.writeText(url);
      setToast('Link copied to clipboard');
      setTimeout(() => setToast(null), 3000);
    }
  }

  // ── Mid-session save: fires when user signs in with a dashboard already open ─
  const prevUserIdRef = useRef(user?.id ?? null);
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = user?.id ?? null;

    if (user) setGuestMode(false);

    // User just signed in (transitioned from null → non-null)
    if (user && !prevUserId && result?.dashboardData && !currentDocumentId) {
      saveDocument({
        fileName:      currentFileName || 'document',
        title:         result.dashboardData.title || currentFileName || 'document',
        dashboardData: result.dashboardData,
        mode:          currentMode,
      }).then(saved => {
        if (saved) setCurrentDocumentId(saved.id);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Remix control — always visible; disabled when no live session (history loads)
  const remixControl = (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowRemixPopover(v => !v)}
        disabled={!sessionId || remixLoading}
        title={
          !sessionId
            ? "Remix is available immediately after generation — we don't store your document"
            : remixLoading
              ? 'Remixing…'
              : 'Generate a new perspective on this document'
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: '8px',
          border: '1.5px solid var(--border)',
          background: 'var(--surface)',
          color: !sessionId ? 'var(--text-secondary)' : 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: '600',
          cursor: !sessionId ? 'not-allowed' : 'pointer',
          opacity: remixLoading ? 0.5 : !sessionId ? 0.5 : 1,
          animation: remixLoading ? 'pulse 1s ease-in-out infinite' : 'none',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
        }}
      >
        🔀 {remixLoading ? 'Remixing…' : 'Remix'}
      </button>
      {showRemixPopover && sessionId && (
        <RemixPopover
          onAutoRemix={handleAutoRemix}
          onGuidedRemix={handleGuidedRemix}
          onClose={() => setShowRemixPopover(false)}
          loading={remixLoading}
        />
      )}
    </div>
  );

  // ── History sidebar — position:fixed, renders over any view ─────────────────
  const historySidebar = showHistory && (
    <div style={styles.sidebar}>
      <div style={{ flexShrink: 0, borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 0 16px' }}>
          <div style={{ display: 'flex' }}>
            {[
              { key: 'documents', label: 'Documents' },
              { key: 'credits',   label: 'Credits & Usage' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setHistoryTab(tab.key)}
                style={{
                  padding: '10px 10px',
                  fontSize: '12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: historyTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
                  color: historyTab === tab.key ? '#2563EB' : '#94A3B8',
                  fontWeight: historyTab === tab.key ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowHistory(false)} style={styles.sidebarClose}>×</button>
        </div>
      </div>
      {user ? (
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {historyTab === 'documents' ? (
            <DocumentHistory
              onLoadDocument={handleLoadFromHistory}
              currentDocumentId={currentDocumentId}
            />
          ) : (
            <PurchaseHistory />
          )}
        </div>
      ) : (
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 12px' }}>
            Sign in to access your history.
          </p>
          <button onClick={() => { setShowAuthModal(true); setShowHistory(false); }} style={styles.signInBtn}>
            Sign in
          </button>
        </div>
      )}
    </div>
  );

  if (result) {
    return (
      <div key={animKey} style={{ animation: 'fadeInUp 0.35s ease' }}>
        {isSample && (
          <div style={styles.sampleBanner}>
            Viewing sample document — upload your own file to analyse it
          </div>
        )}

        {historySidebar}

        <Dashboard
          data={result.dashboardData}
          standaloneHtml={result.standaloneHtml}
          sessionId={sessionId}
          onReset={handleReset}
          remixControl={remixControl}
          remixLoading={remixLoading}
          remixVersion={remixVersion}
          isAuthenticated={!!user}
          onRequestSignIn={() => setShowAuthModal(true)}
          user={user}
          onSignOut={signOut}
          onShowHistory={() => setShowHistory(h => !h)}
          onShare={handleShare}
        />

        {/* GuestBanner — bottom persistent nudge for non-signed-in users */}
        {!user && <GuestBanner onSignIn={() => setShowAuthModal(true)} />}

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

        {showAuthModal && (
          <>
            {guestLimitMessage && (
              <div style={styles.guestLimitBanner}>{guestLimitMessage}</div>
            )}
            <AuthModal onClose={() => { setShowAuthModal(false); setGuestLimitMessage(null); }} />
          </>
        )}
        {showPricingModal && (
          <PricingModal
            onClose={() => setShowPricingModal(false)}
            onSuccess={(amount, planName) => {
              setCreditSuccess(`${amount} credits added — ${planName}`);
              setTimeout(() => setCreditSuccess(null), 4000);
            }}
          />
        )}
        {creditSuccess && (
          <div style={styles.creditToast}>
            <span>✓</span> {creditSuccess}
          </div>
        )}
        {toast && (
          <div style={styles.creditToast}>
            <span>✓</span> {toast}
          </div>
        )}
      </div>
    );
  }

  // ── Landing profile menu ──────────────────────────────────────────────────────
  function LandingProfileMenu({ user, onSignOut }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);

    React.useEffect(() => {
      function handleClick(e) {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const name = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const email = user.email || '';
    const initials = (name || email)
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || email[0]?.toUpperCase() || '?';

    return (
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          title={name || email}
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: '#2563EB', color: '#FFFFFF', border: 'none',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {initials}
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '200px', zIndex: 1000, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 14px 10px' }}>
              {name && (
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {name}
                </p>
              )}
              <p style={{ margin: name ? '2px 0 0' : 0, fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                {email}
              </p>
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
            <button
              onClick={() => { onSignOut(); setOpen(false); }}
              style={{
                display: 'block', width: '100%', padding: '10px 14px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                textAlign: 'left', fontSize: '13px', color: '#DC2626',
                fontWeight: '500', transition: 'background 0.1s ease', fontFamily: 'inherit',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Landing auth bar (shared between WelcomeScreen and upload views) ─────────
  const landingBar = (
    <div style={styles.landingAuthBar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '1rem' }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>DocDash</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user && (
          <button
            onClick={() => setShowHistory(h => !h)}
            style={{ fontSize: '12px', color: '#64748B', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '7px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📄 History
          </button>
        )}
        {user ? (
          <>
            <button
              onClick={() => setShowPricingModal(true)}
              style={creditChipStyle}
              title="Buy more credits"
            >
              <span>⚡</span>
              <span>{credits?.credits_remaining ?? '—'} Credits</span>
            </button>
            <LandingProfileMenu user={user} onSignOut={signOut} />
          </>
        ) : (
          <button onClick={() => setShowAuthModal(true)} style={navBtnStyle}>
            Sign in
          </button>
        )}
      </div>
    </div>
  );

  // ── WelcomeScreen: logged-out users who haven't chosen guest mode yet ─────────
  if (!authLoading && !user && !guestMode) {
    return (
      <>
        {landingBar}
        {historySidebar}
        <WelcomeScreen
          onSignIn={() => setShowAuthModal(true)}
          onContinueAsGuest={() => setGuestMode(true)}
        />
        {showAuthModal && (
          <>
            {guestLimitMessage && (
              <div style={styles.guestLimitBanner}>{guestLimitMessage}</div>
            )}
            <AuthModal onClose={() => { setShowAuthModal(false); setGuestLimitMessage(null); }} />
          </>
        )}
        {showPricingModal && (
          <PricingModal
            onClose={() => setShowPricingModal(false)}
            onSuccess={(amount, planName) => {
              setCreditSuccess(`${amount} credits added — ${planName}`);
              setTimeout(() => setCreditSuccess(null), 4000);
            }}
          />
        )}
        {creditSuccess && (
          <div style={styles.creditToast}>
            <span>✓</span> {creditSuccess}
          </div>
        )}
      </>
    );
  }

  // ── Upload / loading / error view ─────────────────────────────────────────────
  return (
    <>
      {landingBar}
      {historySidebar}

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
          onBeforeProcess={handleBeforeProcess}
          onAuthRequired={(msg) => {
            setGuestLimitMessage(msg);
            setShowAuthModal(true);
          }}
        />
      </div>

      {warning && (
        <div style={styles.warningBanner} role="status">
          ⚠ {warning}
          <button onClick={() => setWarning(null)} style={styles.dismissBtn} aria-label="Dismiss">✕</button>
        </div>
      )}
      {showAuthModal && (
          <>
            {guestLimitMessage && (
              <div style={styles.guestLimitBanner}>{guestLimitMessage}</div>
            )}
            <AuthModal onClose={() => { setShowAuthModal(false); setGuestLimitMessage(null); }} />
          </>
        )}
      {showPricingModal && (
        <PricingModal
          onClose={() => setShowPricingModal(false)}
          onSuccess={(amount, planName) => {
            setCreditSuccess(`${amount} credits added — ${planName}`);
            setTimeout(() => setCreditSuccess(null), 4000);
          }}
        />
      )}
      {creditSuccess && (
        <div style={styles.creditToast}>
          <span>✓</span> {creditSuccess}
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

const creditChipStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: '20px',
  padding: '4px 12px',
  fontSize: '12px',
  color: '#475569',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
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
  guestLimitBanner: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 60,
    background: '#FFF7ED',
    border: '1px solid #FED7AA',
    borderRadius: '10px',
    padding: '12px 20px',
    fontSize: '13px',
    color: '#92400E',
    fontWeight: 500,
    textAlign: 'center',
    maxWidth: '380px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    whiteSpace: 'nowrap',
  },
  creditToast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    background: '#0F172A',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
};
