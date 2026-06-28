import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  const [pos,     setPos]     = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  if (!text) return children;

  function handleMouseEnter() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      top:  rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
  }

  function handleMouseLeave() {
    setVisible(false);
  }

  return (
    <div
      ref={ref}
      style={{ display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && createPortal(
        <div style={{
          position:      'fixed',
          top:           pos.top,
          left:          pos.left,
          transform:     'translateX(-50%)',
          background:    '#0F172A',
          color:         '#F8FAFC',
          fontSize:      '11px',
          fontWeight:    500,
          padding:       '5px 9px',
          borderRadius:  '6px',
          whiteSpace:    'nowrap',
          pointerEvents: 'none',
          zIndex:        9999,
          fontFamily:    'inherit',
          letterSpacing: '0.01em',
          boxShadow:     '0 2px 8px rgba(0,0,0,0.25)',
          animation:     'fadeIn 0.1s ease',
        }}>
          {text}
        </div>,
        document.body
      )}
    </div>
  );
}
