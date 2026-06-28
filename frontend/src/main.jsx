import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Force scroll to top on every page load
window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('DocDash error boundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={styles.page}>
          <div style={styles.card}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.heading}>Something went wrong</h2>
            <p style={styles.body}>
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              style={styles.btn}
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    padding: '2rem',
  },
  card: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '1rem',
    padding: '2.5rem 2rem',
    maxWidth: 420,
    width: '100%',
    textAlign: 'center',
    boxShadow: 'var(--shadow)',
  },
  icon:    { fontSize: '2.5rem', marginBottom: '1rem' },
  heading: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' },
  body:    { fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' },
  btn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    padding: '0.625rem 1.5rem',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
