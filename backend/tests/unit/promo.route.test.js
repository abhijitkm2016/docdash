import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import express from 'express'
import request from 'supertest'

const require = createRequire(import.meta.url)
const ledger = require('../../src/services/ledger')
const createPromoRouter = require('../../src/routes/promo')

const redeem = vi.fn()
ledger.redeemPromo = (...a) => redeem(...a)

function fakeRedis() {
  const store = new Map()
  return {
    get: vi.fn(async (k) => store.get(k) ?? null),
    incr: vi.fn(async (k) => { store.set(k, (store.get(k) || 0) + 1) }),
    expire: vi.fn(async () => {}),
  }
}

function makeApp(redis) {
  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => { req.user = { id: 'u1' }; next() })
  app.use('/api/promo', createPromoRouter({ redis: () => redis }))
  return app
}

beforeEach(() => {
  redeem.mockReset().mockResolvedValue({ creditsGranted: 10, balance: 15 })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/promo/redeem', () => {
  it('redeems and reports the credits', async () => {
    const res = await request(makeApp(fakeRedis())).post('/api/promo/redeem').send({ code: ' mihir10 ' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ success: true, creditsGranted: 10, balance: 15 })
    expect(redeem.mock.calls[0][0]).toMatchObject({ userId: 'u1', code: 'mihir10' })
  })

  it('rejects an empty or non-string code with 400', async () => {
    const app = makeApp(fakeRedis())
    expect((await request(app).post('/api/promo/redeem').send({})).status).toBe(400)
    expect((await request(app).post('/api/promo/redeem').send({ code: 42 })).status).toBe(400)
    expect(redeem).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid_code', 404, 'Invalid code'],
    ['code_expired', 410, 'This code has expired'],
    ['code_exhausted', 409, 'This code has been fully redeemed'],
    ['already_redeemed', 409, "You've already used this code"],
  ])('maps %s -> %i', async (code, status, message) => {
    redeem.mockRejectedValue(new ledger.PromoError(code))
    const res = await request(makeApp(fakeRedis())).post('/api/promo/redeem').send({ code: 'X' })
    expect(res.status).toBe(status)
    expect(res.body).toEqual({ success: false, message })
  })

  it('unexpected failure -> 500 with a generic message', async () => {
    redeem.mockRejectedValue(new Error('db down'))
    const res = await request(makeApp(fakeRedis())).post('/api/promo/redeem').send({ code: 'X' })
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })

  it('blocks guessing: after 10 invalid codes the 11th attempt is 429 and never reaches the database', async () => {
    redeem.mockRejectedValue(new ledger.PromoError('invalid_code'))
    const app = makeApp(fakeRedis())
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post('/api/promo/redeem').send({ code: 'G' + i })).status).toBe(404)
    }
    redeem.mockClear()
    const res = await request(app).post('/api/promo/redeem').send({ code: 'REAL10' })
    expect(res.status).toBe(429)
    expect(redeem).not.toHaveBeenCalled()
  })

  it('does not count expired / already-used codes as guesses', async () => {
    redeem.mockRejectedValue(new ledger.PromoError('already_redeemed'))
    const redis = fakeRedis()
    const app = makeApp(redis)
    for (let i = 0; i < 12; i++) await request(app).post('/api/promo/redeem').send({ code: 'USED' })
    expect(redis.incr).not.toHaveBeenCalled()
  })

  it('fails open if Redis is down', async () => {
    const broken = { get: async () => { throw new Error('redis down') }, incr: async () => {}, expire: async () => {} }
    const res = await request(makeApp(broken)).post('/api/promo/redeem').send({ code: 'X' })
    expect(res.status).toBe(200)
  })
})
