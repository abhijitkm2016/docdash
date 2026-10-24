import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'node:module'
import express from 'express'
import request from 'supertest'

const require = createRequire(import.meta.url)
const { createRequireUser } = require('../../src/middleware/requireUser')
const { createRateLimiters } = require('../../src/middleware/rateLimit')

const USER = { id: 'user-1', email: 'a@example.com' }

// verify stub: only "good-token" belongs to a user
const verify = vi.fn(async (token) => (token === 'good-token' ? USER : null))

function appWith(...middleware) {
  const app = express()
  app.post('/', ...middleware, (req, res) => res.json({ ok: true, user: req.user?.id ?? null }))
  return app
}

function fakeRedis() {
  const store = new Map()
  return {
    get: vi.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    set: vi.fn(async (k, v) => { store.set(k, v) }),
  }
}

describe('requireUser', () => {
  const app = appWith(createRequireUser({ verify }))

  it('401 when there is no Authorization header', async () => {
    const res = await request(app).post('/')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('invalid_token')
  })

  it('401 for a malformed header ("Authorization: x")', async () => {
    const res = await request(app).post('/').set('Authorization', 'x')
    expect(res.status).toBe(401)
  })

  it('401 when the token does not verify', async () => {
    const res = await request(app).post('/').set('Authorization', 'Bearer nope')
    expect(res.status).toBe(401)
  })

  it('passes a valid token through and sets req.user', async () => {
    const res = await request(app).post('/').set('Authorization', 'Bearer good-token')
    expect(res.status).toBe(200)
    expect(res.body.user).toBe('user-1')
  })

  it('fails closed (503) when the auth backend throws', async () => {
    const boom = appWith(createRequireUser({ verify: async () => { throw new Error('down') } }))
    const res = await request(boom).post('/').set('Authorization', 'Bearer good-token')
    expect(res.status).toBe(503)
  })
})

describe('guestGenerationLimit', () => {
  function setup() {
    const redis = fakeRedis()
    const { guestGenerationLimit } = createRateLimiters({ redis: () => redis, verify })
    return { redis, app: appWith(guestGenerationLimit) }
  }

  it('no header -> guest limiter: first request passes, second is 429', async () => {
    const { redis, app } = setup()
    const first = await request(app).post('/').set('X-Forwarded-For', '1.2.3.4')
    expect(first.status).toBe(200)
    expect(first.body.user).toBeNull()
    const second = await request(app).post('/').set('X-Forwarded-For', '1.2.3.4')
    expect(second.status).toBe(429)
    expect(second.body.requiresAuth).toBe(true)
    expect(redis.get).toHaveBeenCalled()
  })

  it('"Authorization: x" -> 401, and does NOT bypass or touch the guest limiter', async () => {
    const { redis, app } = setup()
    const res = await request(app).post('/').set('Authorization', 'x')
    expect(res.status).toBe(401)
    expect(redis.get).not.toHaveBeenCalled()
  })

  it('well-formed but unverifiable token -> 401, no bypass', async () => {
    const { app } = setup()
    const res = await request(app).post('/').set('Authorization', 'Bearer forged')
    expect(res.status).toBe(401)
  })

  it('valid token -> next() with req.user, guest limiter skipped', async () => {
    const { redis, app } = setup()
    const res = await request(app).post('/').set('Authorization', 'Bearer good-token')
    expect(res.status).toBe(200)
    expect(res.body.user).toBe('user-1')
    expect(redis.get).not.toHaveBeenCalled()
  })

  it('fails open for guests when Redis is down', async () => {
    const broken = { get: async () => { throw new Error('redis down') }, set: async () => {} }
    const { guestGenerationLimit } = createRateLimiters({ redis: () => broken, verify })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await request(appWith(guestGenerationLimit)).post('/')
    spy.mockRestore()
    expect(res.status).toBe(200)
  })
})

describe('guestRemixBlock', () => {
  const { guestRemixBlock } = createRateLimiters({ redis: fakeRedis, verify })
  const app = appWith(guestRemixBlock)

  it('no header -> 403 remix_requires_auth (legacy contract)', async () => {
    const res = await request(app).post('/')
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('remix_requires_auth')
  })

  it('bad token -> 401', async () => {
    expect((await request(app).post('/').set('Authorization', 'x')).status).toBe(401)
  })

  it('valid token -> next()', async () => {
    const res = await request(app).post('/').set('Authorization', 'Bearer good-token')
    expect(res.status).toBe(200)
    expect(res.body.user).toBe('user-1')
  })
})
