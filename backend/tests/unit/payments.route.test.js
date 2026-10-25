import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import crypto from 'node:crypto'
import express from 'express'
import request from 'supertest'

const require = createRequire(import.meta.url)
const src = path.resolve(import.meta.dirname, '../../src')

process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy'
process.env.RAZORPAY_KEY_SECRET = 'test_secret_for_unit_tests'

// Fake Razorpay SDK (no network). orders.fetch / orders.create are spies.
const fetchOrder = vi.fn()
const createOrder = vi.fn()
class FakeRazorpay {
  constructor() { this.orders = { fetch: fetchOrder, create: createOrder } }
}
const rzpId = require.resolve('razorpay', { paths: [src] })
require.cache[rzpId] = { id: rzpId, filename: rzpId, loaded: true, exports: FakeRazorpay }

const ledger = require('../../src/services/ledger')
const grant = vi.fn()
ledger.grantCredits = (...a) => grant(...a)

const payments = require('../../src/routes/payments')

const app = express()
app.use(express.json())
app.use((req, _res, next) => { req.user = { id: 'u1' }; next() })
app.use('/api/payments', payments)

const sign = (orderId, paymentId) =>
  crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')

function verifyBody(over = {}) {
  const order = 'order_1', pay = 'pay_1'
  return { razorpay_order_id: order, razorpay_payment_id: pay, razorpay_signature: sign(order, pay), planId: 'starter', ...over }
}

beforeEach(() => {
  fetchOrder.mockReset().mockResolvedValue({ id: 'order_1', amount: 19900, currency: 'INR', notes: { planId: 'starter', userId: 'u1' } })
  createOrder.mockReset().mockResolvedValue({ id: 'order_1' })
  grant.mockReset().mockResolvedValue({ balance: 10, alreadyGranted: false })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/payments/create-order', () => {
  it('binds the order to the signed-in user', async () => {
    const res = await request(app).post('/api/payments/create-order').send({ planId: 'starter' })
    expect(res.status).toBe(200)
    expect(createOrder.mock.calls[0][0].notes).toMatchObject({ planId: 'starter', userId: 'u1' })
  })
})

describe('POST /api/payments/verify', () => {
  it('valid payment -> grants the PLAN credits server-side (5 for starter), keyed on the payment id', async () => {
    const res = await request(app).post('/api/payments/verify').send(verifyBody())
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ success: true, credits: 5, balance: 10 })
    expect(grant).toHaveBeenCalledTimes(1)
    expect(grant.mock.calls[0][0]).toMatchObject({ userId: 'u1', amount: 5, requestId: 'payment:pay_1' })
  })

  it('ignores any client-supplied credit amount', async () => {
    await request(app).post('/api/payments/verify').send(verifyBody({ credits: 9999, amount: 1 }))
    expect(grant.mock.calls[0][0].amount).toBe(5)
  })

  it('bad signature -> 400, nothing granted, Razorpay not queried', async () => {
    const res = await request(app).post('/api/payments/verify').send(verifyBody({ razorpay_signature: 'f'.repeat(64) }))
    expect(res.status).toBe(400)
    expect(grant).not.toHaveBeenCalled()
    expect(fetchOrder).not.toHaveBeenCalled()
  })

  it('missing fields -> 400', async () => {
    const res = await request(app).post('/api/payments/verify').send({ planId: 'starter' })
    expect(res.status).toBe(400)
    expect(grant).not.toHaveBeenCalled()
  })

  it('cheap order replayed against an expensive plan -> 400 (amount mismatch)', async () => {
    fetchOrder.mockResolvedValue({ id: 'order_1', amount: 5900, currency: 'INR', notes: { planId: 'per_gen', userId: 'u1' } })
    const res = await request(app).post('/api/payments/verify').send(verifyBody({ planId: 'pro' }))
    expect(res.status).toBe(400)
    expect(grant).not.toHaveBeenCalled()
  })

  it("someone else's order -> 403, nothing granted", async () => {
    fetchOrder.mockResolvedValue({ id: 'order_1', amount: 19900, currency: 'INR', notes: { planId: 'starter', userId: 'someone-else' } })
    const res = await request(app).post('/api/payments/verify').send(verifyBody())
    expect(res.status).toBe(403)
    expect(grant).not.toHaveBeenCalled()
  })

  it('replay is idempotent: reports alreadyGranted and does not error', async () => {
    grant.mockResolvedValue({ balance: 10, alreadyGranted: true })
    const res = await request(app).post('/api/payments/verify').send(verifyBody())
    expect(res.status).toBe(200)
    expect(res.body.alreadyGranted).toBe(true)
  })

  it('grant failure -> 500 with a support-friendly message (payment id is logged)', async () => {
    grant.mockRejectedValue(new Error('db down'))
    const res = await request(app).post('/api/payments/verify').send(verifyBody())
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })
})
