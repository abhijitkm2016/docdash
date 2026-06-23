const ERROR_CONFIG = {
  upload: {
    icon:     '📁',
    title:    'Upload failed',
    subtitle: "We couldn't read your file. Try a different format.",
  },
  processing: {
    icon:     '⚡',
    title:    'Processing failed',
    subtitle: "Claude couldn't process this document. Try a shorter document or plain text.",
  },
  network: {
    icon:     '🌐',
    title:    'Connection error',
    subtitle: 'Check your connection and try again.',
  },
  filesize: {
    icon:     '📦',
    title:    'File too large',
    subtitle: 'Please upload a file under 10MB.',
  },
  service: {
    icon:     '⚠️',
    title:    'Service Unavailable',
    subtitle: null,
  },
  generic: {
    icon:     '⚠️',
    title:    'Something went wrong',
    subtitle: null,
  },
};

export default function ErrorState({ errorType = 'generic', message, onRetry, onReset }) {
  const config   = ERROR_CONFIG[errorType] || ERROR_CONFIG.generic;
  const subtitle = config.subtitle ?? (message || 'An unexpected error occurred.');

  return (
    <div style={styles.outer}>
      <div style={styles.card}>
        <div style={styles.icon}>{config.icon}</div>
        <div style={styles.title}>{config.title}</div>
        <div style={styles.subtitle}>{subtitle}</div>

        <div style={styles.buttons}>
          <button onClick={onRetry} style={styles.primary}>Try Again</button>
          <button onClick={onReset} style={styles.secondary}>Upload a different file</button>
        </div>

        <div style={styles.footnote}>
          If this keeps happening, try converting your document to plain text (.txt) before uploading.
        </div>
      </div>
    </div>
  );
}

const styles = {
  outer: {
    padding: '60px 16px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    maxWidth:     '480px',
    width:        '100%',
    background:   '#FFF',
    border:       '1px solid #FEE2E2',
    borderRadius: '16px',
    padding:      '40px 36px',
    textAlign:    'center',
    boxShadow:    '0 4px 24px rgba(0,0,0,0.06)',
  },
  icon: {
    fontSize:     '40px',
    marginBottom: '16px',
  },
  title: {
    fontSize:     '20px',
    fontWeight:   600,
    color:        '#0F172A',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize:     '14px',
    color:        '#64748B',
    lineHeight:   1.6,
    marginBottom: '28px',
  },
  buttons: {
    display:        'flex',
    justifyContent: 'center',
    gap:            '10px',
    flexWrap:       'wrap',
  },
  primary: {
    background:   '#2563EB',
    color:        '#fff',
    padding:      '10px 24px',
    borderRadius: '8px',
    border:       'none',
    fontSize:     '14px',
    fontWeight:   600,
    cursor:       'pointer',
    fontFamily:   'inherit',
  },
  secondary: {
    background:   '#fff',
    color:        '#475569',
    padding:      '10px 24px',
    border:       '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize:     '14px',
    cursor:       'pointer',
    fontFamily:   'inherit',
  },
  footnote: {
    fontSize:   '12px',
    color:      '#94A3B8',
    marginTop:  '20px',
    lineHeight: 1.5,
  },
};
