import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import request from 'supertest'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '../../..')
process.env.VERCEL = '1' // keep api/analyze.js from loading backend/.env

// Replace a module in Node's require cache so api/analyze.js picks up the stub.
function stub(rel, exports) {
  const id = require.resolve(path.join(root, rel))
  require.cache[id] = { id, filename: id, loaded: true, exports }
}

const parseFile = vi.fn(async () => ({ text: 'a,b\n1,2', type: 'csv' }))
const analyzeDocument = vi.fn(async () => ({ title: 'T' }))

stub('backend/src/services/fileParser.js', { parseFile: (...a) => parseFile(...a) })
stub('backend/src/services/claudeClient.js', { analyzeDocument: (...a) => analyzeDocument(...a) })
stub('backend/src/utils/htmlExporter.js', { buildStandaloneHtml: () => '<html/>' })
stub('backend/src/utils/condenseText.js', { condenseText: (p) => p.text })
stub('backend/src/services/sessionStore.js', { set: async () => {}, get: async () => null })
// Auth is covered in requireUser.test.js; here a header just names the user.
stub('backend/src/middleware/rateLimit.js', {
  guestGenerationLimit: (req, _res, next) => {
    const id = req.headers['x-test-user']
    if (id) req.user = { id }
    next()
  },
})

// Real ledger module (so InsufficientCreditsError is the real class), with its
// two network functions replaced by spies. analyze.js reads them off the same
// exports object at call time.
const ledger = require('../../src/services/ledger')
const consume = vi.fn()
const refund = vi.fn()
ledger.consumeCredits = (...a) => consume(...a)
ledger.refundCredits = (...a) => refund(...a)

const app = require(path.join(root, 'api/analyze.js'))

function upload(extra = {}) {
  let r = request(app).post('/').attach('files', Buffer.from('a,b\n1,2'), 'data.csv')
  for (const [k, v] of Object.entries(extra)) r = r.field(k, v)
  return r
}

beforeEach(() => {
  consume.mockReset().mockResolvedValue(4)
  refund.mockReset().mockResolvedValue(5)
  analyzeDocument.mockReset().mockResolvedValue({ title: 'T' })
  parseFile.mockReset().mockResolvedValue({ text: 'a,b\n1,2', type: 'csv' })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/analyze credits', () => {
  it('insufficient credits -> 402 and the Claude client is NOT called', async () => {
    consume.mockRejectedValue(new ledger.InsufficientCreditsError())
    const res = await upload().set('X-Test-User', 'u1')
    expect(res.status).toBe(402)
    expect(res.body.error).toBe('insufficient_credits')
    expect(analyzeDocument).not.toHaveBeenCalled()
    expect(refund).not.toHaveBeenCalled()
  })

  it('charges 1 credit for a standard analysis, before calling Claude', async () => {
    const order = []
    consume.mockImplementation(async () => { order.push('consume'); return 4 })
    analyzeDocument.mockImplementation(async () => { order.push('claude'); return { title: 'T' } })
    const res = await upload().set('X-Test-User', 'u1')
    expect(res.status).toBe(200)
    expect(res.text).toContain('event: result')
    expect(order).toEqual(['consume', 'claude'])
    expect(consume).toHaveBeenCalledTimes(1)
    expect(consume.mock.calls[0][0]).toMatchObject({ userId: 'u1', amount: 1 })
    expect(refund).not.toHaveBeenCalled()
  })

  it('charges 5 credits for deep analysis (cost is decided server-side)', async () => {
    await upload({ deep: 'true' }).set('X-Test-User', 'u1')
    expect(consume.mock.calls[0][0].amount).toBe(5)
  })

  it('model failure -> refund called exactly once with the same request id', async () => {
    analyzeDocument.mockRejectedValue(new Error('model exploded'))
    const res = await upload().set('X-Test-User', 'u1')
    expect(res.text).toContain('event: error')
    expect(consume).toHaveBeenCalledTimes(1)
    expect(refund).toHaveBeenCalledTimes(1)
    expect(refund.mock.calls[0][0].requestId).toBe(consume.mock.calls[0][0].requestId)
  })

  it('parse failure happens before any charge', async () => {
    parseFile.mockRejectedValue(new Error('bad file'))
    const res = await upload().set('X-Test-User', 'u1')
    expect(res.status).toBe(422)
    expect(consume).not.toHaveBeenCalled()
    expect(refund).not.toHaveBeenCalled()
  })

  it('guests are never charged', async () => {
    const res = await upload()
    expect(res.status).toBe(200)
    expect(consume).not.toHaveBeenCalled()
  })
})
