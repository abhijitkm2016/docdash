/**
 * Session store for Ask Your Data + Remix.
 *
 * On Vercel, api/analyze.js and api/[...slug].js are separate functions that
 * never share process memory. An in-memory Map therefore loses sessions the
 * moment a different function invocation handles /api/ask or /api/remix.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (Vercel
 * env vars), sessions are stored in Upstash Redis with a 1-hour TTL.
 * Without those vars (local dev), the in-memory Map is used as before.
 */

const TTL_SECONDS = 60 * 60; // 1 hour

// ── Upstash Redis client (lazy — only initialised if env vars are present) ──
let _redis = null;

function getRedis() {
  if (_redis) return _redis;
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = require('@upstash/redis');
    _redis = new Redis({ url, token });
  } catch {
    // Package not installed — fall back to memory silently
  }
  return _redis;
}

// ── In-memory fallback (local dev) ──────────────────────────────────────────
const _mem    = new Map();
const TTL_MS  = TTL_SECONDS * 1000;

function _memSet(id, data) {
  _mem.set(id, { ...data, _createdAt: Date.now() });
  // lazy cleanup
  for (const [k, v] of _mem.entries()) {
    if (Date.now() - v._createdAt > TTL_MS) _mem.delete(k);
  }
}

function _memGet(id) {
  const s = _mem.get(id);
  if (!s) return null;
  if (Date.now() - s._createdAt > TTL_MS) { _mem.delete(id); return null; }
  return s;
}

// ── Public API ───────────────────────────────────────────────────────────────
async function set(id, data) {
  const redis = getRedis();
  if (redis) {
    await redis.set(`session:${id}`, JSON.stringify(data), { ex: TTL_SECONDS });
  } else {
    _memSet(id, data);
  }
}

async function get(id) {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(`session:${id}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  return _memGet(id);
}

module.exports = { set, get };
