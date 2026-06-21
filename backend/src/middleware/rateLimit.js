const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.ip || req.connection?.remoteAddress || 'unknown'
}

// 1 generation per IP per 24 hours for guests
async function guestGenerationLimit(req, res, next) {
  // Signed-in users bypass entirely
  const authHeader = req.headers.authorization
  if (authHeader) return next()

  const ip = getClientIP(req)
  const key = `docdash:guest:gen:${ip}`

  try {
    const count = await redis.get(key)

    if (count !== null && parseInt(count) >= 1) {
      return res.status(429).json({
        error: 'guest_limit_reached',
        message: 'Sign in for 5 free credits — no payment needed.',
        requiresAuth: true
      })
    }

    await redis.set(key, 1, { ex: 86400 })
    next()
  } catch (error) {
    // Redis failure — fail open, never block legitimate users
    console.error('Rate limit check failed:', error)
    next()
  }
}

// Remix blocked for guests entirely
async function guestRemixBlock(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader) return next()

  return res.status(403).json({
    error: 'remix_requires_auth',
    message: 'Sign in to remix dashboards.',
    requiresAuth: true
  })
}

module.exports = { guestGenerationLimit, guestRemixBlock }
