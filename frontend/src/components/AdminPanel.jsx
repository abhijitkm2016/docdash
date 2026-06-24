import { useState } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_USER_ID = '363022d8-cfc1-4e58-ac29-ef9fe6ac287e';

export default function AdminPanel({ user, onClose }) {
  const [firstName, setFirstName] = useState('');
  const [credits, setCredits] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [expires, setExpires] = useState('2026-12-31');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  if (!user || user.id !== ADMIN_USER_ID) return null;

  const generatedCode = firstName && credits
    ? `${firstName.toUpperCase().trim()}${credits}`
    : '';

  async function handleCreate() {
    if (!firstName.trim() || !credits) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const code = generatedCode;
    const { error: insertError } = await supabase
      .from('promo_codes')
      .insert({
        code,
        credits_granted: parseInt(credits),
        max_uses: parseInt(maxUses),
        uses_count: 0,
        expires_at: new Date(expires).toISOString(),
      });

    if (insertError) {
      setError(insertError.message.includes('duplicate') || insertError.message.includes('unique')
        ? `Code ${code} already exists.`
        : insertError.message);
    } else {
      setResult({ code, credits: parseInt(credits), maxUses: parseInt(maxUses) });
      setFirstName('');
      setCredits('');
      setMaxUses('1');
    }
    setLoading(false);
  }

  async function loadCodes() {
    setLoadingCodes(true);
    const { data } = await supabase
      .from('promo_codes')
      .select('code, credits_granted, max_uses, uses_count, expires_at')
      .order('expires_at', { ascending: false });
    setCodes(data || []);
    setLoadingCodes(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: '16px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--card-border)',
          background: 'var(--table-header-bg)',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              ⚙️ Admin — Promo Codes
            </p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              Visible only to you
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px',
            color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, padding: '2px 6px',
          }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                First name
              </label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Hemang"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  border: '1px solid var(--card-border)', background: 'var(--input-bg)',
                  color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Credits
              </label>
              <input
                type="number"
                value={credits}
                onChange={e => setCredits(e.target.value)}
                placeholder="10"
                min="1"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  border: '1px solid var(--card-border)', background: 'var(--input-bg)',
                  color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Max uses
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={e => setMaxUses(e.target.value)}
                min="1"
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  border: '1px solid var(--card-border)', background: 'var(--input-bg)',
                  color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
                Expires
              </label>
              <input
                type="date"
                value={expires}
                onChange={e => setExpires(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  border: '1px solid var(--card-border)', background: 'var(--input-bg)',
                  color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Code preview */}
          {generatedCode && (
            <div style={{
              background: 'var(--accent-muted)', border: '1px solid var(--card-border)',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code preview</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#2563EB', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                {generatedCode}
              </span>
            </div>
          )}

          {error && (
            <p style={{ fontSize: '12px', color: '#DC2626', margin: '0 0 12px', padding: '8px 12px', background: '#FEF2F2', borderRadius: '6px' }}>
              {error}
            </p>
          )}

          {result && (
            <div style={{ fontSize: '12px', color: '#15803D', margin: '0 0 12px', padding: '8px 12px', background: '#F0FDF4', borderRadius: '6px', lineHeight: 1.6 }}>
              ✓ Created <strong>{result.code}</strong> — {result.credits} credits, {result.maxUses === 1 ? 'single use' : `${result.maxUses} uses`}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!firstName.trim() || !credits || loading}
            style={{
              width: '100%', padding: '10px', borderRadius: '8px',
              background: (!firstName.trim() || !credits) ? '#CBD5E1' : '#2563EB',
              color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700,
              cursor: (!firstName.trim() || !credits) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', marginBottom: '12px',
            }}
          >
            {loading ? 'Creating…' : `Create ${generatedCode || 'Code'}`}
          </button>

          {/* View all codes toggle */}
          <button
            onClick={loadCodes}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px',
              background: 'transparent', border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loadingCodes ? 'Loading…' : '📋 View all codes'}
          </button>

          {/* Codes table */}
          {codes.length > 0 && (
            <div style={{ marginTop: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                    {['Code', 'Credits', 'Used', 'Max', 'Expires'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codes.map(c => (
                    <tr key={c.code} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{c.code}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-primary)' }}>{c.credits_granted}</td>
                      <td style={{ padding: '6px 8px', color: c.uses_count >= c.max_uses ? '#DC2626' : 'var(--text-primary)' }}>{c.uses_count}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{c.max_uses}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{new Date(c.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
