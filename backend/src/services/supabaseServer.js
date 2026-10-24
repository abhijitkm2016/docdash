/**
 * Server-side Supabase clients.
 *
 *  - anon client:    verifies a user's JWT (auth.getUser). Safe to use with the anon key.
 *  - service client: calls the credit ledger functions. SERVER ONLY — the
 *                    service-role key bypasses RLS and must never reach the browser.
 *
 * VITE_* names are accepted as a fallback for the URL / anon key because those
 * already exist in the Vercel project; the service-role key has no fallback.
 */
const { createClient } = require('@supabase/supabase-js');

const OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };

let _anon = null;
let _service = null;

function supabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

function getAnonClient() {
  if (_anon) return _anon;
  const url = supabaseUrl();
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY are not set');
  _anon = createClient(url, key, OPTIONS);
  return _anon;
}

function getServiceClient() {
  if (_service) return _service;
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
  _service = createClient(url, key, OPTIONS);
  return _service;
}

module.exports = { getAnonClient, getServiceClient };
