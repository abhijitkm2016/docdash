const { Redis } = require('@upstash/redis')
const { describeError } = require('../utils/errorInfo')
const { authenticate } = require('./requireUser')

// KV_REST_API_* are set by the Vercel Upstash integration; UPSTASH_REDIS_REST_* is the legacy/local name
let _redis = null
function getRedis() {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
    })
  }
  return _redis
}

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.ip || req.connection?.remoteAddress || 'unknown'
}

/**
 * Factory so tests can inject a fake Redis / verifier.
 *
 * guestGenerationLimit:
 *   - no Authorization header  -> guest path, 1 generation per IP per 24h
 *   - any Authorization header -> must verify; failure is a 401, never a bypass
 */
function createRateLimiters({ redis = getRedis, verify } = {}) {
  async function guestGenerationLimit(req, res, next) {
    if (req.headers.authorization !== undefined) {
      const result = await authenticate(req, verify)
      if (!result.user) return res.status(result.status).json(result.body)
      req.user = result.user
      return next()
    }

    const ip = getClientIP(req)
    const key = `docdash:guest:gen:${ip}`

    try {
      const client = redis()
      const count = await client.get(key)

      if (count !== null && parseInt(count) >= 1) {
        return res.status(429).json({
          error: 'guest_limit_reached',
          message: 'Sign in for 5 free credits — no payment needed.',
          requiresAuth: true
        })
      }

      await client.set(key, 1, { ex: 86400 })
      next()
    } catch (error) {
      // Redis failure — fail open, never block legitimate users
      console.error('Rate limit check failed:', JSON.stringify(describeError(error, 'rate-limit')))
      next()
    }
  }

  // Remix is for signed-in users only. No header keeps the legacy 403 the
  // frontend already understands; a header must verify (401 otherwise).
  async function guestRemixBlock(req, res, next) {
    if (req.headers.authorization === undefined) {
      return res.status(403).json({
        error: 'remix_requires_auth',
        message: 'Sign in to remix dashboards.',
        requiresAuth: true
      })
    }
    const result = await authenticate(req, verify)
    if (!result.user) return res.status(result.status).json(result.body)
    req.user = result.user
    return next()
  }

  return { guestGenerationLimit, guestRemixBlock }
}

module.exports = { ...createRateLimiters(), createRateLimiters, getRedis }
