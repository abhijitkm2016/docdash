import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import express from 'express'
import request from 'supertest'

const require = createRequire(import.meta.url)
const src = path.resolve(import.meta.dirname, '../../src')

function stub(rel, exports) {
  const id = require.resolve(path.join(src, rel))
  require.cache[id] = { id, filename: id, loaded: true, exports }
}

const analyzeDocument = vi.fn()
stub('services/claudeClient.js', { analyzeDocument: (...a) => analyzeDocument(...a) })
stub('utils/htmlExporter.js', { buildStandaloneHtml: () => '<html/>' })
const sessionGet = vi.fn()
stub('services/sessionStore.js', { get: (...a) => sessionGet(...a), set: async () => {} })

const ledger = require('../../src/services/ledger')
const consume = vi.fn()
const refund = vi.fn()
ledger.consumeCredits = (...a) => consume(...a)
ledger.refundCredits = (...a) => refund(...a)

const remixRouter = require('../../src/routes/remix')

const app = express()
app.use(express.json())
app.use((req, _res, next) => { req.user = { id: 'u1' }; next() })
app.use('/api/remix', remixRouter)

beforeEach(() => {
  sessionGet.mockReset().mockResolvedValue({ parsedFile: { text: 'x' }, fileName: 'f.csv' })
  consume.mockReset().mockResolvedValue(4)
  refund.mockReset().mockResolvedValue(5)
  analyzeDocument.mockReset().mockResolvedValue({ title: 'T' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/remix/*', () => {
  it('charges 1 credit then remixes', async () => {
    const res = await request(app).post('/api/remix/auto').send({ sessionId: 's1' })
    expect(res.status).toBe(200)
    expect(consume.mock.calls[0][0]).toMatchObject({ userId: 'u1', amount: 1 })
    expect(refund).not.toHaveBeenCalled()
  })

  it('insufficient credits -> 402 and no model call', async () => {
    consume.mockRejectedValue(new ledger.InsufficientCreditsError())
    const res = await request(app).post('/api/remix/guided').send({ sessionId: 's1', instructions: 'x' })
    expect(res.status).toBe(402)
    expect(analyzeDocument).not.toHaveBeenCalled()
  })

  it('model failure -> refund once with the same request id', async () => {
    analyzeDocument.mockRejectedValue(new Error('boom'))
    const res = await request(app).post('/api/remix/auto').send({ sessionId: 's1' })
    expect(res.status).toBe(500)
    expect(refund).toHaveBeenCalledTimes(1)
    expect(refund.mock.calls[0][0].requestId).toBe(consume.mock.calls[0][0].requestId)
  })

  it('session store outage -> 503 JSON, no charge, no crash', async () => {
    sessionGet.mockRejectedValue(new Error('redis down'))
    const res = await request(app).post('/api/remix/auto').send({ sessionId: 's1' })
    expect(res.status).toBe(503)
    expect(consume).not.toHaveBeenCalled()
  })
})
