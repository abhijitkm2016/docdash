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

const sessionGet = vi.fn()
const answerQuestion = vi.fn()
stub('services/sessionStore.js', { get: (...a) => sessionGet(...a), set: async () => {} })
stub('services/claudeClient.js', { answerQuestion: (...a) => answerQuestion(...a) })

const askRouter = require('../../src/routes/ask')
const app = express()
app.use(express.json())
app.use((req, _res, next) => { req.user = { id: 'u1' }; next() })
app.use('/api/ask', askRouter)

beforeEach(() => {
  sessionGet.mockReset()
  answerQuestion.mockReset().mockResolvedValue('an answer')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/ask', () => {
  it("does not answer from another user's session", async () => {
    sessionGet.mockResolvedValue({ userId: 'someone-else', dashboardData: { secret: true } })
    const res = await request(app).post('/api/ask').send({ sessionId: 's1', question: 'q?' })
    expect(res.status).toBe(404)
    expect(answerQuestion).not.toHaveBeenCalled()
  })

  it('answers from the caller\'s own session', async () => {
    sessionGet.mockResolvedValue({ userId: 'u1', dashboardData: { ok: true } })
    const res = await request(app).post('/api/ask').send({ sessionId: 's1', question: 'q?' })
    expect(res.status).toBe(200)
    expect(answerQuestion.mock.calls[0][0]).toEqual({ ok: true })
  })

  it('survives a session-store outage when the client sent the dashboard', async () => {
    sessionGet.mockRejectedValue(new Error('redis down'))
    const res = await request(app).post('/api/ask').send({ sessionId: 's1', question: 'q?', dashboardData: { ok: 1 } })
    expect(res.status).toBe(200)
  })
})
