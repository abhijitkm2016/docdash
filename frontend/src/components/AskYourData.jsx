import { useState, useRef, useEffect } from 'react';

export default function AskYourData({ sessionId, dashboardData }) {
  const [question, setQuestion]   = useState('');
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const inputRef  = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question: q, dashboardData: dashboardData || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get answer');
      setHistory(prev => [...prev, { question: q, answer: data.answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const showSend = question.trim().length > 0;

  return (
    <div style={styles.wrap}>
      {/* Conversation history */}
      {history.map((item, i) => (
        <div key={i} style={styles.pair}>
          <p style={styles.questionText}>{item.question}</p>
          <div style={styles.answerCard}>
            <span style={styles.aiBadge}>AI</span>
            <p style={styles.answerText}>{item.answer}</p>
          </div>
        </div>
      ))}

      {/* Loading indicator */}
      {loading && (
        <div style={styles.pair}>
          <div style={{ ...styles.answerCard, ...styles.answerLoading }}>
            <span style={styles.aiBadge}>AI</span>
            <span style={styles.loadingDots}>Thinking<DotDot /></span>
          </div>
        </div>
      )}

      {error && (
        <p style={styles.errorText}>{error}</p>
      )}

      <div ref={bottomRef} />

      <p style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        opacity: 0.7,
        margin: '0 0 0.25rem',
      }}>
        Answers are based on this dashboard's output, not the raw source document.
      </p>

      {/* Input row */}
      <div style={styles.inputRow}>
        <textarea
          ref={inputRef}
          style={styles.input}
          rows={1}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="💬  Ask a question — e.g. 'What does this show about career trajectory?'"
          aria-label="Ask a question about your data"
          disabled={loading}
        />
        <button
          onClick={submit}
          disabled={!showSend || loading}
          aria-label="Send question"
          style={{
            ...styles.sendBtn,
            opacity: showSend ? 1 : 0,
            pointerEvents: showSend ? 'auto' : 'none',
            transform: showSend ? 'scale(1)' : 'scale(0.8)',
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

function DotDot() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(id);
  }, []);
  return <span>{dots}</span>;
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  pair: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  questionText: {
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    fontWeight: 500,
    paddingLeft: '1rem',
    borderLeft: '2px solid var(--accent)',
  },
  answerCard: {
    background: 'var(--accent-muted)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.625rem',
    padding: '1rem 1.25rem',
    position: 'relative',
    animation: 'fadeInUp 0.25s ease',
  },
  answerLoading: {
    color: 'var(--text-muted)',
  },
  aiBadge: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.875rem',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
  },
  answerText: {
    fontSize: '0.9375rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.7,
    paddingRight: '2.5rem',
  },
  loadingDots: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
  },
  errorText: {
    fontSize: '0.8125rem',
    color: 'var(--alert)',
    padding: '0.5rem 0',
  },
  inputRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-end',
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.75rem',
    padding: '0.625rem 0.75rem',
    boxShadow: 'var(--shadow)',
    transition: 'border-color 0.15s',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    fontFamily: 'inherit',
  },
  sendBtn: {
    background: 'var(--accent)',
    border: 'none',
    color: '#fff',
    borderRadius: '0.5rem',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.125rem',
    fontWeight: 700,
    flexShrink: 0,
    transition: 'opacity 0.15s, transform 0.15s',
  },
};
