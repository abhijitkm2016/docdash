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
import AdminPanel       from './components/AdminPanel';
import ProfileMenu      from './components/ProfileMenu';
import { HomeTour, DashboardTour, TOUR_HOME_KEY, TOUR_DASH_KEY } from './components/ProductTour';
import confetti from 'canvas-confetti';
import Tooltip from './components/Tooltip';
import Toast from './components/Toast';
import CommandPalette from './components/CommandPalette';
import { exportToHtml } from './utils/exportHtml';
import { exportToPdf }  from './utils/exportPdf';
import { exportToPpt }  from './utils/exportPpt';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardSkeleton from './components/Skeleton';

const FIRST_GEN_KEY = 'docdash_first_gen_done';

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
  const { saveDocument, loadDocument, updateDocument, refetch } = useDocuments();
  const { credits, fetchCredits } = useCredits();
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
  const [guestLimitMessage, setGuestLimitMessage] = useState(null);
  const [currentMode,       setCurrentMode]       = useState('auto');
  const [toast,             setToast]             = useState(null);
  // toast shape: { message, variant, position, dismissible, autoDismiss }
  const [showAdminPanel,      setShowAdminPanel]      = useState(false);
  const [showHomeTour,        setShowHomeTour]        = useState(false);
  const [showDashboardTour,   setShowDashboardTour]   = useState(false);
  const [showCommandPalette,  setShowCommandPalette]  = useState(false);
  const [showMobileMenu,      setShowMobileMenu]      = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore shortcuts when typing in an input, textarea, or contenteditable
      const tag = e.target.tagName.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

      // Cmd+K — command palette (always)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(p => !p);
        return;
      }

      // Single key shortcuts — only when not typing
      if (isTyping) return;

      if (e.key === 'h' || e.key === 'H') {
        setShowHistory(h => !h);
      }
      if ((e.key === 'n' || e.key === 'N') && result) {
        handleReset();
      }
      if ((e.key === 'r' || e.key === 'R') && result && sessionId) {
        setShowRemixPopover(v => !v);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowRemixPopover(false);
        setShowHistory(false);
        setShowPricingModal(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [result, sessionId]);

  function showToast(message, variant = 'success', options = {}) {
    setToast({ message, variant, ...options });
    if (options.autoDismiss !== false) {
      setTimeout(() => setToast(null), options.dismissAfter || 3000);
    }
  }

  // ── Product tour auto-show ────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading) {
      if (!localStorage.getItem(TOUR_HOME_KEY)) setShowHomeTour(true);
    }
  }, [authLoading]);

  useEffect(() => {
    if (result?.dashboardData?.title) {
      document.title = `${result.dashboardData.title} — DocDash`;
    } else {
      document.title = 'DocDash — Turn any document into an executive dashboard';
    }
  }, [result]);

  useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [result, isLoading]);

  useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  function handleHomeTourComplete(dontShow) {
    setShowHomeTour(false);
    if (dontShow) localStorage.setItem(TOUR_HOME_KEY, 'true');
  }

  function handleDashboardTourComplete(dontShow) {
    setShowDashboardTour(false);
    if (dontShow) localStorage.setItem(TOUR_DASH_KEY, 'true');
  }

  function handleShowHomeTour()      { setShowHomeTour(true); }
  function handleShowDashboardTour() { setShowDashboardTour(true); }

  async function handleResult(data, fileName) {
    setResult(data);
    setSessionId(data.sessionId || null);
    setCurrentFileName(fileName || 'document');
    setCurrentDocumentId(null);
    setRemixVersion(0);
    setAnimKey(k => k + 1);
    setError(null);
    setCurrentMode(data.mode || 'auto');

    // Confetti on first ever generation
    if (!localStorage.getItem(FIRST_GEN_KEY)) {
      localStorage.setItem(FIRST_GEN_KEY, 'true');
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#60A5FA', '#BFDBFE', '#1D4ED8', '#ffffff'],
        });
      }, 600);
    }

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

    // Credits are charged server-side before generation; just refresh the balance.
    if (user) await fetchCredits();
  }

  // Called by FileUpload before processing starts — returns false to abort
  async function handleBeforeProcess(creditsNeeded = 1) {
    if (user) {
      if (!credits || credits.credits_remaining < creditsNeeded) {
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

    // The server charges (and refunds on failure); we only refresh the balance.
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
      if (res.status === 402) {
        setShowPricingModal(true);
        return;
      }
      if (!res.ok) throw new Error(data.message || data.error || 'Remix failed');
      setResult(data);
      setSessionId(data.sessionId || sessionId);
      setRemixVersion(v => v + 1);
      setAnimKey(k => k + 1);
      success = true;
    } catch (err) {
      setError(err.message);
    } finally {
      await fetchCredits();
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
    setIsLoading(true);
    const doc = await loadDocument(docId);
    setIsLoading(false);
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

  async function handleTitleSave(newTitle) {
    if (!currentDocumentId || !result) return;
    const ok = await updateDocument(currentDocumentId, { title: newTitle });
    if (ok && result.dashboardData) {
      setResult(prev => ({
        ...prev,
        dashboardData: { ...prev.dashboardData, title: newTitle },
      }));
      document.title = `${newTitle} — DocDash`;
      refetch();
    }
  }

  async function handleShare() {
    if (!currentDocumentId) return;
    const share = await createShare(currentDocumentId);
    if (share) {
      const url = `${window.location.origin}/share/${share.share_token}`;
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard', 'success');
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

  useEffect(() => {
    if (result) {
      if (!localStorage.getItem(TOUR_DASH_KEY)) {
        setTimeout(() => setShowDashboardTour(true), 800);
      }
    }
  }, [result]);

  // Remix control — always visible; custom tooltip works even when disabled
  const remixControl = (() => {
    const isDisabled = !sessionId || remixLoading;
    const tooltipText = !sessionId
      ? 'Upload your document again to remix — DocDash keeps your dashboards, not your files.'
      : remixLoading
        ? 'Remixing…'
        : 'Generate a new perspective on this document';

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Tooltip text={tooltipText}>
          <button
            onClick={() => { if (!isDisabled) setShowRemixPopover(v => !v); }}
            disabled={isDisabled}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px',
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              color: isDisabled ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontSize: '13px', fontWeight: '600',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              animation: remixLoading ? 'pulse 1s ease-in-out infinite' : 'none',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            🔀 {remixLoading ? 'Remixing…' : 'Remix'}
          </button>
        </Tooltip>
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
  })();

  // ── Command palette commands — context-aware ─────────────────────────────────
  const commands = [
    {
      id: 'new-file',
      icon: '📄',
      label: 'New File',
      description: 'Start a new document analysis',
      shortcut: 'N',
      keywords: ['upload', 'new', 'start', 'reset'],
      action: handleReset,
    },
    {
      id: 'toggle-history',
      icon: '📂',
      label: 'Open History',
      description: 'View your previously generated dashboards',
      shortcut: 'H',
      keywords: ['history', 'documents', 'previous', 'saved'],
      action: () => setShowHistory(h => !h),
    },
    {
      id: 'buy-credits',
      icon: '⚡',
      label: 'Buy Credits',
      description: 'Purchase more analysis credits',
      keywords: ['credits', 'pay', 'purchase', 'pricing'],
      action: () => setShowPricingModal(true),
    },
    {
      id: 'take-tour',
      icon: '?',
      label: 'Take a Tour',
      description: 'See a guided walkthrough of DocDash',
      keywords: ['tour', 'help', 'guide', 'walkthrough'],
      action: () => result ? handleShowDashboardTour() : handleShowHomeTour(),
    },
    ...(result ? [
      {
        id: 'export-html',
        icon: '🌐',
        label: 'Export as HTML',
        description: 'Download interactive web dashboard',
        keywords: ['export', 'html', 'download', 'web'],
        action: () => exportToHtml(result.dashboardData),
      },
      {
        id: 'export-pdf',
        icon: '📄',
        label: 'Export as PDF',
        description: 'Download structured analyst report',
        keywords: ['export', 'pdf', 'download', 'report'],
        action: () => exportToPdf(result.dashboardData),
      },
      {
        id: 'export-ppt',
        icon: '📊',
        label: 'Export as PowerPoint',
        description: 'Download 5-slide presentation deck',
        keywords: ['export', 'ppt', 'powerpoint', 'slides', 'presentation'],
        action: () => exportToPpt(result.dashboardData),
      },
      {
        id: 'share',
        icon: '🔗',
        label: 'Share as Link',
        description: 'Copy a public shareable URL',
        keywords: ['share', 'link', 'copy', 'public'],
        action: handleShare,
      },
      {
        id: 'remix',
        icon: '🔀',
        label: 'Auto Remix',
        description: 'Generate a new perspective on this document',
        shortcut: 'R',
        keywords: ['remix', 'regenerate', 'new perspective'],
        action: handleAutoRemix,
      },
    ] : []),
    ...(user ? [
      {
        id: 'sign-out',
        icon: '👋',
        label: 'Sign Out',
        description: `Signed in as ${user.email}`,
        keywords: ['sign out', 'logout', 'exit'],
        action: signOut,
      },
    ] : [
      {
        id: 'sign-in',
        icon: '👤',
        label: 'Sign In',
        description: 'Sign in to save and share dashboards',
        keywords: ['sign in', 'login', 'account'],
        action: () => setShowAuthModal(true),
      },
    ]),
  ];

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
      <AnimatePresence mode="wait">
        <motion.div
          key={`dashboard-${animKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
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
          truncated={!!result.truncated}
          onShowTour={handleShowDashboardTour}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onTitleSave={user && currentDocumentId ? handleTitleSave : null}
        />
        {showDashboardTour && <DashboardTour onComplete={handleDashboardTourComplete} />}
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          commands={commands}
        />

        {/* GuestBanner — bottom persistent nudge for non-signed-in users */}
        {!user && <GuestBanner onSignIn={() => setShowAuthModal(true)} />}

        {warning && (
          <Toast
            message={warning}
            variant="warning"
            position="bottom"
            autoDismiss={false}
            dismissible={true}
            onDismiss={() => setWarning(null)}
          />
        )}
        {error && (
          <Toast
            message={`Error: ${error}`}
            variant="error"
            position="bottom"
            autoDismiss={false}
            dismissible={true}
            onDismiss={() => setError(null)}
          />
        )}

        {showAuthModal && (
          <>
            {guestLimitMessage && (
              <Toast
                message={guestLimitMessage}
                variant="warning"
                position="top"
                autoDismiss={false}
                dismissible={true}
                onDismiss={() => setGuestLimitMessage(null)}
              />
            )}
            <AuthModal onClose={() => { setShowAuthModal(false); setGuestLimitMessage(null); }} />
          </>
        )}
        {showPricingModal && (
          <PricingModal
            onClose={() => setShowPricingModal(false)}
            onSuccess={(amount, planName) => {
              showToast(`${amount} credits added — ${planName}`, 'success');
              fetchCredits();
            }}
          />
        )}
        {toast && (
          <Toast
            message={toast.message}
            variant={toast.variant || 'success'}
            position={toast.position || 'bottom'}
            autoDismiss={toast.autoDismiss !== false}
            dismissible={toast.dismissible || false}
            onDismiss={() => setToast(null)}
          />
        )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Landing auth bar (shared between WelcomeScreen and upload views) ─────────
  const landingBarSpacer = <div style={{ height: 48 }} />;

  const landingBar = (
    <div style={{ ...styles.landingAuthBar, flexWrap: 'wrap' }} className="landing-nav-mobile">
      <button
        onClick={() => window.location.href = '/'}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{ fontSize: '1rem' }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>DocDash</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user && (
          <div className="landing-nav-secondary">
            <Tooltip text="View your document history">
              <button
                onClick={() => setShowHistory(h => !h)}
                style={{ fontSize: '12px', color: '#64748B', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '7px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                📄 History
              </button>
            </Tooltip>
          </div>
        )}
        <div className="landing-nav-secondary">
          <Tooltip text="Take a tour">
            <button
              onClick={handleShowHomeTour}
              style={{
                background: 'transparent',
                border: '1px solid var(--card-border)',
                borderRadius: '7px',
                padding: '5px 10px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ?
            </button>
          </Tooltip>
        </div>
        <div className="landing-nav-secondary">
          <Tooltip text="Command palette">
            <button
              onClick={() => setShowCommandPalette(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--card-border)',
                borderRadius: '7px',
                padding: '5px 10px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.03em',
              }}
            >
              ⌘K
            </button>
          </Tooltip>
        </div>
        {user ? (
          <>
            {user?.id === '363022d8-cfc1-4e58-ac29-ef9fe6ac287e' && (
              <div className="landing-nav-secondary">
                <button onClick={() => setShowAdminPanel(true)} style={{ fontSize: '12px', color: '#64748B', background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '7px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>⚙️ Admin</button>
              </div>
            )}
            <Tooltip text="Buy more credits">
              <button
                onClick={() => setShowPricingModal(true)}
                style={creditChipStyle}
              >
                <span>⚡</span>
                <span>{credits?.credits_remaining ?? '—'} Credits</span>
              </button>
            </Tooltip>
            <ProfileMenu user={user} onSignOut={signOut} onRequestSignIn={() => setShowAuthModal(true)} />
          </>
        ) : (
          <Tooltip text="Sign in or create a free account">
            <button onClick={() => setShowAuthModal(true)} style={navBtnStyle}>
              Sign in
            </button>
          </Tooltip>
        )}
        {/* Hamburger button — visible only on mobile */}
        <button
          className="hamburger-btn"
          onClick={() => setShowMobileMenu(m => !m)}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--card-border)',
            borderRadius: '7px',
            padding: '5px 10px',
            fontSize: '16px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            minHeight: 0,
            minWidth: 0,
          }}
          aria-label="Menu"
        >
          {showMobileMenu ? '✕' : '☰'}
        </button>
      </div>
      {/* Mobile dropdown menu */}
      {showMobileMenu && (
        <div
          className="mobile-menu"
          style={{
            display: 'none',
            flexDirection: 'column',
            width: '100%',
            borderTop: '1px solid var(--card-border)',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            gap: '0.25rem',
          }}
        >
          {user && (
            <button
              onClick={() => { setShowHistory(h => !h); setShowMobileMenu(false); }}
              style={mobileMenuItemStyle}
            >
              📄 History
            </button>
          )}
          <button
            onClick={() => { handleShowHomeTour(); setShowMobileMenu(false); }}
            style={mobileMenuItemStyle}
          >
            ? Tour
          </button>
          <button
            onClick={() => { setShowCommandPalette(true); setShowMobileMenu(false); }}
            style={mobileMenuItemStyle}
          >
            ⌘K Command Palette
          </button>
          {user?.id === '363022d8-cfc1-4e58-ac29-ef9fe6ac287e' && (
            <button
              onClick={() => { setShowAdminPanel(true); setShowMobileMenu(false); }}
              style={mobileMenuItemStyle}
            >
              ⚙️ Admin
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ── WelcomeScreen: logged-out users who haven't chosen guest mode yet ─────────
  if (!authLoading && !user && !guestMode) {
    return (
      <>
        {landingBar}
        {landingBarSpacer}
        {historySidebar}
        <WelcomeScreen
          onSignIn={() => setShowAuthModal(true)}
          onContinueAsGuest={() => setGuestMode(true)}
        />
        {showAuthModal && (
          <>
            {guestLimitMessage && (
              <Toast
                message={guestLimitMessage}
                variant="warning"
                position="top"
                autoDismiss={false}
                dismissible={true}
                onDismiss={() => setGuestLimitMessage(null)}
              />
            )}
            <AuthModal onClose={() => { setShowAuthModal(false); setGuestLimitMessage(null); }} />
          </>
        )}
        {showPricingModal && (
          <PricingModal
            onClose={() => setShowPricingModal(false)}
            onSuccess={(amount, planName) => {
              showToast(`${amount} credits added — ${planName}`, 'success');
              fetchCredits();
            }}
          />
        )}
        {toast && (
          <Toast
            message={toast.message}
            variant={toast.variant || 'success'}
            position={toast.position || 'bottom'}
            autoDismiss={toast.autoDismiss !== false}
            dismissible={toast.dismissible || false}
            onDismiss={() => setToast(null)}
          />
        )}
        {showAdminPanel && <AdminPanel user={user} onClose={() => setShowAdminPanel(false)} />}
        {showHomeTour && <HomeTour onComplete={handleHomeTourComplete} />}
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          commands={commands}
        />
      </>
    );
  }

  // ── Upload / loading / error view ─────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="upload-view"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
      <>
        {landingBar}
        {landingBarSpacer}
        {historySidebar}

      {/* Loading overlay — shown while Claude processes */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <LoadingState />
        </motion.div>
      )}

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
          onInsufficientCredits={() => { setShowPricingModal(true); fetchCredits(); }}
        />
      </div>

      {warning && (
        <Toast
          message={warning}
          variant="warning"
          position="bottom"
          autoDismiss={false}
          dismissible={true}
          onDismiss={() => setWarning(null)}
        />
      )}
      {showAuthModal && (
        <>
          {guestLimitMessage && (
            <Toast
              message={guestLimitMessage}
              variant="warning"
              position="top"
              autoDismiss={false}
              dismissible={true}
              onDismiss={() => setGuestLimitMessage(null)}
            />
          )}
          <AuthModal onClose={() => { setShowAuthModal(false); setGuestLimitMessage(null); }} />
        </>
      )}
      {showPricingModal && (
        <PricingModal
          onClose={() => setShowPricingModal(false)}
          onSuccess={(amount, planName) => {
            showToast(`${amount} credits added — ${planName}`, 'success');
              fetchCredits();
          }}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant || 'success'}
          position={toast.position || 'bottom'}
          autoDismiss={toast.autoDismiss !== false}
          dismissible={toast.dismissible || false}
          onDismiss={() => setToast(null)}
        />
      )}
      {showAdminPanel && <AdminPanel user={user} onClose={() => setShowAdminPanel(false)} />}
      {showHomeTour && <HomeTour onComplete={handleHomeTourComplete} />}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />
      </>
      </motion.div>
    </AnimatePresence>
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

const mobileMenuItemStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '14px',
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  width: '100%',
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
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2100,
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
  sidebar: {
    position: 'fixed',
    left: 0,
    top: '57px',
    width: 280,
    height: 'calc(100vh - 57px)',
    background: '#ffffff',
    borderRight: '1px solid #E2E8F0',
    boxShadow: '4px 0 12px rgba(0,0,0,0.06)',
    zIndex: 90,
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
};
