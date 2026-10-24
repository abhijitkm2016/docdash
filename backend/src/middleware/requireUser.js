/**
 * Server-side authentication.
 *
 * Reads `Authorization: Bearer <jwt>`, verifies it with Supabase
 * (auth.getUser) and sets req.user. Anything else — missing header, wrong
 * scheme, unverifiable token — is a 401. A header is never trusted just
 * because it is present.
 */
const { getAnonClient } = require('../services/supabaseServer');

function extractBearer(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

// Default verifier: ask Supabase who owns this token. Returns the user or null.
async function verifyWithSupabase(token) {
  const { data, error } = await getAnonClient().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Resolve the caller from the request.
 * Resolves to { user } on success, { status, body } on failure.
 */
async function authenticate(req, verify = verifyWithSupabase) {
  const token = extractBearer(req);
  if (!token) {
    return { status: 401, body: { error: 'invalid_token', message: 'Missing or malformed Authorization header.' } };
  }
  try {
    const user = await verify(token);
    if (!user) {
      return { status: 401, body: { error: 'invalid_token', message: 'Your session is invalid or has expired. Please sign in again.' } };
    }
    return { user };
  } catch (err) {
    // Auth backend unreachable / misconfigured: fail closed, but say so.
    console.error('Token verification failed:', err.message);
    return { status: 503, body: { error: 'auth_unavailable', message: 'Could not verify your session right now. Please try again.' } };
  }
}

function createRequireUser({ verify } = {}) {
  return async function requireUser(req, res, next) {
    const result = await authenticate(req, verify);
    if (result.user) {
      req.user = result.user;
      return next();
    }
    return res.status(result.status).json(result.body);
  };
}

module.exports = {
  requireUser: createRequireUser(),
  createRequireUser,
  authenticate,
  extractBearer,
};
