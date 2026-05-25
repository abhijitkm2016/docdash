/**
 * In-memory session store for Ask Your Data + Remix.
 * Sessions expire after 1 hour.
 */
const sessions = new Map();
const TTL_MS   = 60 * 60 * 1000; // 1 hour

function set(id, data) {
  sessions.set(id, { ...data, createdAt: Date.now() });
  _cleanup();
}

function get(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > TTL_MS) {
    sessions.delete(id);
    return null;
  }
  return session;
}

function _cleanup() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > TTL_MS) sessions.delete(id);
  }
}

module.exports = { set, get };
