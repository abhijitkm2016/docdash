import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import pg from 'pg'
import crypto from 'node:crypto'

// LOCAL Supabase only (`supabase start`). Default is the CLI's local DB port.
const DB_URL = process.env.LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
if (!/(127\.0\.0\.1|localhost|\[::1\])/.test(DB_URL)) {
  throw new Error('Refusing to run SQL tests against a non-local database: ' + DB_URL)
}

const { Pool } = pg
const pool = new Pool({ connectionString: DB_URL, max: 12 })
const createdUsers = []

async function createUser() {
  const id = crypto.randomUUID()
  await pool.query(
    "insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')",
    [id, `ledger-${id}@example.test`]
  )
  createdUsers.push(id)
  return id
}

const balance = async (id) =>
  (await pool.query('select credits_remaining, credits_used from credits where user_id = $1', [id])).rows[0]

// Run fn inside a transaction as a given Postgres role (+ JWT sub), then roll back.
async function asRole(role, userId, fn) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${role}`)
    if (userId) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role }),
      ])
    }
    return await fn(client)
  } finally {
    await client.query('rollback').catch(() => {})
    client.release()
  }
}

const consume = (id, amount, reqId) =>
  pool.query('select public.consume_credits($1, $2, $3, $4) as bal', [id, amount, 'test', reqId])
    .then(r => r.rows[0].bal)

beforeAll(async () => { await pool.query('select 1') })

afterAll(async () => {
  if (createdUsers.length) {
    await pool.query('delete from public.credit_events where user_id = any($1)', [createdUsers])
    await pool.query('delete from auth.users where id = any($1)', [createdUsers])
  }
  await pool.end()
})

describe('signup seeding', () => {
  it('a new auth user gets 5 credits and a free_tier transaction', async () => {
    const id = await createUser()
    expect(await balance(id)).toEqual({ credits_remaining: 5, credits_used: 0 })
    const tx = await pool.query("select credits_delta from transactions where user_id=$1 and transaction_type='free_tier'", [id])
    expect(tx.rows).toEqual([{ credits_delta: 5 }])
  })
})

describe('browser (authenticated) cannot write balances', () => {
  it('update credits_remaining = 999 -> permission denied', async () => {
    const id = await createUser()
    await expect(asRole('authenticated', id, c =>
      c.query('update credits set credits_remaining = 999 where user_id = $1', [id])
    )).rejects.toThrow(/permission denied/i)
    expect((await balance(id)).credits_remaining).toBe(5)
  })

  it('insert into credits / transactions -> permission denied', async () => {
    const id = await createUser()
    await expect(asRole('authenticated', id, c =>
      c.query('insert into credits (user_id, credits_remaining) values ($1, 100)', [crypto.randomUUID()])
    )).rejects.toThrow(/permission denied/i)
    await expect(asRole('authenticated', id, c =>
      c.query("insert into transactions (user_id, transaction_type, credits_delta) values ($1, 'purchase', 100)", [id])
    )).rejects.toThrow(/permission denied/i)
  })

  it('can still read only their own credits row', async () => {
    const a = await createUser()
    const b = await createUser()
    const own = await asRole('authenticated', a, c => c.query('select user_id from credits'))
    expect(own.rows.map(r => r.user_id)).toEqual([a])
    const other = await asRole('authenticated', a, c => c.query('select 1 from credits where user_id = $1', [b]))
    expect(other.rowCount).toBe(0)
  })

  it('cannot execute the ledger functions', async () => {
    const id = await createUser()
    await expect(asRole('authenticated', id, c =>
      c.query("select public.consume_credits($1, 1, 'x', $2)", [id, 'rq:' + crypto.randomUUID()])
    )).rejects.toThrow(/permission denied/i)
    await expect(asRole('anon', null, c =>
      c.query("select public.refund_credits('x')")
    )).rejects.toThrow(/permission denied/i)
  })

  it('service_role can execute them', async () => {
    const id = await createUser()
    const r = await asRole('service_role', null, c =>
      c.query("select public.consume_credits($1, 1, 'x', $2) as bal", [id, 'rq:' + crypto.randomUUID()])
    )
    expect(r.rows[0].bal).toBe(4)
  })
})

describe('consume_credits', () => {
  it('rejects when the balance is insufficient, leaving it untouched', async () => {
    const id = await createUser()
    await expect(consume(id, 6, 'rq:' + crypto.randomUUID())).rejects.toThrow(/insufficient_credits/)
    expect((await balance(id)).credits_remaining).toBe(5)
  })

  it('two concurrent consumes of 1 credit with balance 1 -> exactly one succeeds', async () => {
    const id = await createUser()
    await pool.query('update credits set credits_remaining = 1, credits_used = 0 where user_id = $1', [id])
    const results = await Promise.allSettled([
      consume(id, 1, 'rq:' + crypto.randomUUID()),
      consume(id, 1, 'rq:' + crypto.randomUUID()),
    ])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const failed = results.filter(r => r.status === 'rejected')
    expect(failed).toHaveLength(1)
    expect(failed[0].reason.message).toMatch(/insufficient_credits/)
    expect(await balance(id)).toEqual({ credits_remaining: 0, credits_used: 1 })
  })

  it('12 concurrent consumes with balance 5 -> exactly 5 succeed, never negative', async () => {
    const id = await createUser()
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => consume(id, 1, 'rq:' + crypto.randomUUID()))
    )
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5)
    expect((await balance(id)).credits_remaining).toBe(0)
  })

  it('is idempotent on request_id: a repeat does not charge twice', async () => {
    const id = await createUser()
    const reqId = 'rq:' + crypto.randomUUID()
    expect(await consume(id, 2, reqId)).toBe(3)
    expect(await consume(id, 2, reqId)).toBe(3)
    expect(await balance(id)).toEqual({ credits_remaining: 3, credits_used: 2 })
  })

  it('refuses a request_id already used by a different user', async () => {
    const a = await createUser()
    const b = await createUser()
    const reqId = 'rq:' + crypto.randomUUID()
    await consume(a, 1, reqId)
    await expect(consume(b, 1, reqId)).rejects.toThrow(/request_id_conflict/)
    expect((await balance(b)).credits_remaining).toBe(5)
  })
})

describe('refund_credits', () => {
  it('restores the balance exactly once', async () => {
    const id = await createUser()
    const reqId = 'rq:' + crypto.randomUUID()
    await consume(id, 1, reqId)
    expect((await balance(id)).credits_remaining).toBe(4)

    const first = await pool.query('select public.refund_credits($1) as bal', [reqId])
    expect(first.rows[0].bal).toBe(5)
    const second = await pool.query('select public.refund_credits($1) as bal', [reqId])
    expect(second.rows[0].bal).toBe(5)
    expect(await balance(id)).toEqual({ credits_remaining: 5, credits_used: 0 })
  })

  it('concurrent refunds still restore only once', async () => {
    const id = await createUser()
    const reqId = 'rq:' + crypto.randomUUID()
    await consume(id, 3, reqId)
    await Promise.all(Array.from({ length: 5 }, () => pool.query('select public.refund_credits($1)', [reqId])))
    expect((await balance(id)).credits_remaining).toBe(5)
  })

  it('an unknown request id is a harmless no-op', async () => {
    const r = await pool.query("select public.refund_credits('rq:does-not-exist') as bal")
    expect(r.rows[0].bal).toBeNull()
  })
})
