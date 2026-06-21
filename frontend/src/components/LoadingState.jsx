import { useState, useEffect, useRef } from 'react';

const LOADING_STEPS = [
  { icon: '📄', text: 'Reading your document...' },
  { icon: '🔍', text: 'Extracting key metrics and data points...' },
  { icon: '📊', text: 'Structuring your executive dashboard...' },
  { icon: '🧠', text: 'Generating insights and analysis...' },
  { icon: '🔎', text: 'Identifying data gaps...' },
  { icon: '✨', text: 'Finalising your dashboard...' },
];

const STEP_INTERVAL  = 2500;  // ms between step advances
const MAX_DURATION   = 15000; // assumed max for progress bar

export default function LoadingState() {
  const [stepIndex, setStepIndex] = useState(0);
  const [fade,      setFade]      = useState(true);  // true = visible
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      // fade out
      setFade(false);
      setTimeout(() => {
        setStepIndex(i => Math.min(i + 1, LOADING_STEPS.length - 1));
        setFade(true);
      }, 300);
    }, STEP_INTERVAL);

    return () => clearInterval(intervalRef.current);
  }, []);

  const step = LOADING_STEPS[stepIndex];

  return (
    <>
      <style>{`
        @keyframes ls-progress {
          from { width: 0%; }
          to   { width: 95%; }
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.brand}>⚡ DocDash</div>

        <div style={{ ...styles.icon, opacity: fade ? 1 : 0 }}>
          {step.icon}
        </div>

        <div style={{ ...styles.text, opacity: fade ? 1 : 0 }}>
          {step.text}
        </div>

        <div style={styles.barTrack}>
          <div style={styles.barFill} />
        </div>

        <div style={styles.hint}>This usually takes 10–20 seconds</div>
      </div>
    </>
  );
}

const styles = {
  container: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '80px 24px',
    textAlign:      'center',
  },
  brand: {
    fontSize:     '13px',
    color:        '#94A3B8',
    marginBottom: '32px',
    fontWeight:   600,
    letterSpacing: '0.02em',
  },
  icon: {
    fontSize:     '36px',
    marginBottom: '12px',
    transition:   'opacity 0.3s ease',
  },
  text: {
    fontSize:     '16px',
    color:        '#1E293B',
    fontWeight:   500,
    marginBottom: '20px',
    transition:   'opacity 0.3s ease',
  },
  barTrack: {
    width:           '240px',
    height:          '3px',
    background:      '#E2E8F0',
    borderRadius:    '2px',
    overflow:        'hidden',
    marginBottom:    '8px',
  },
  barFill: {
    height:           '100%',
    background:       '#2563EB',
    borderRadius:     '2px',
    animation:        `ls-progress ${MAX_DURATION}ms linear forwards`,
  },
  hint: {
    fontSize: '12px',
    color:    '#94A3B8',
  },
};
