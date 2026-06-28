import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export default function CommandPalette({ isOpen, onClose, commands }) {
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef  = useRef(null);
  const listRef   = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    (cmd.keywords || []).some(k => k.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selected]) {
        filtered[selected].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 10000,
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '20vh',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '520px',
              background: 'var(--card-bg)',
              borderRadius: '14px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              border: '1px solid var(--card-border)',
              zIndex: 10001,
              overflow: 'hidden',
            }}
          >
            {/* Search input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 16px',
              borderBottom: '1px solid var(--card-border)',
            }}>
              <span style={{ fontSize: '16px', opacity: 0.5 }}>⌘</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '15px',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              <kbd style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--table-header-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontFamily: 'inherit',
              }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '6px',
              }}
            >
              {filtered.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}>
                  No commands found for "{query}"
                </div>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => { cmd.action(); onClose(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: i === selected
                        ? 'var(--accent-muted, #EFF6FF)'
                        : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
                      {cmd.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 500,
                        color: i === selected ? '#2563EB' : 'var(--text-primary)',
                      }}>
                        {cmd.label}
                      </p>
                      {cmd.description && (
                        <p style={{
                          margin: '1px 0 0',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}>
                          {cmd.description}
                        </p>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        background: 'var(--table-header-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontFamily: 'inherit',
                        flexShrink: 0,
                      }}>
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--card-border)',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
            }}>
              {[
                { key: '↑↓', label: 'navigate' },
                { key: '↵',  label: 'select' },
                { key: 'esc', label: 'close' },
              ].map(hint => (
                <div key={hint.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <kbd style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    background: 'var(--table-header-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontFamily: 'inherit',
                  }}>
                    {hint.key}
                  </kbd>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hint.label}</span>
                </div>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                ⌘K to open
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
