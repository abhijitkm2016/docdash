import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import FileUpload from './components/FileUpload';
import Dashboard  from './components/Dashboard';

function AppInner() {
  const [result,       setResult]       = useState(null);
  const [sessionId,    setSessionId]    = useState(null);
  const [error,        setError]        = useState(null);
  const [warning,      setWarning]      = useState(null);
  const [remixing,     setRemixing]     = useState(false);
  const [remixVersion, setRemixVersion] = useState(0);
  const [animKey,      setAnimKey]      = useState(0);

  function handleResult(data) {
    setResult(data);
    setSessionId(data.sessionId || null);
    setRemixVersion(0);
    setAnimKey(k => k + 1);
    setError(null);
  }

  function handleReset() {
    setResult(null);
    setSessionId(null);
    setRemixVersion(0);
    setError(null);
    setWarning(null);
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

  if (result) {
    return (
      <div key={animKey} style={{ animation: 'fadeInUp 0.35s ease' }}>
        <Dashboard
          data={result.dashboardData}
          standaloneHtml={result.standaloneHtml}
          sessionId={sessionId}
          onReset={handleReset}
          onRemix={handleRemix}
          remixing={remixing}
          remixVersion={remixVersion}
        />
        {warning && (
          <div style={styles.warningBanner} role="status">
            ⚠ {warning}
          </div>
        )}
        {error && (
          <div style={styles.errorBanner} role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <FileUpload onResult={handleResult} onError={setError} onWarning={setWarning} />
      {warning && (
        <div style={styles.warningBanner} role="status">
          ⚠ {warning}
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
  },
};
