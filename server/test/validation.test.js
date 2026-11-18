import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { pool, reset, startServer, goodRequest, goodWorker, yesterday, query } from './helpers.js'
// Note: package.json runs test files one at a time, because each file wipes the same test database.

let api
before(async () => { await reset(); api = await startServer() })
after(async () => { await api.close(); await pool.end() })

const post = (path, body) => api.call('POST', path, { body })

test('a good request saves, normalises the phone and creates lines', async () => {
  const r = await post('/requests', goodRequest())
  assert.equal(r.status, 201)
  const { rows } = await query('SELECT phone, status FROM requests WHERE id = $1', [r.body.id])
  assert.equal(rows[0].phone, '0722111222')
  assert.equal(rows[0].status, 'New')
  const lines = await query('SELECT trade, quantity FROM request_lines WHERE request_id = $1 ORDER BY trade', [r.body.id])
  assert.deepEqual(lines.rows, [{ trade: 'labour', quantity: 1 }, { trade: 'mason', quantity: 2 }])
})

const badRequests = [
  ['no trades', { trades: {} }, 'trades'],
  ['trades missing', { trades: undefined }, 'trades'],
  ['trades is an array', { trades: ['mason'] }, 'trades'],
  ['unknown trade', { trades: { astronaut: 1 } }, 'trades'],
  ['quantity zero', { trades: { mason: 0 } }, 'trades'],
  ['quantity 100', { trades: { mason: 100 } }, 'trades'],
  ['quantity fraction', { trades: { mason: 1.5 } }, 'trades'],
  ['quantity as text', { trades: { mason: '2' } }, 'trades'],
  ['blank name', { name: '   ' }, 'name'],
  ['name not text', { name: 42 }, 'name'],
  ['bad phone', { phone: '12345' }, 'phone'],
  ['landline phone', { phone: '020 123 4567' }, 'phone'],
  ['bad email', { email: 'nope' }, 'email'],
  ['blank site', { site: '' }, 'site'],
  ['no start date', { start: '' }, 'start'],
  ['start in the past', { start: yesterday() }, 'start'],
  ['impossible date', { start: '2030-02-31' }, 'start'],
  ['length not in list', { length: 'forever' }, 'length'],
]
for (const [label, patch, field] of badRequests) {
  test(`request rejected: ${label}`, async () => {
    const r = await post('/requests', { ...goodRequest(), ...patch })
    assert.equal(r.status, 400)
    assert.ok(r.body.fields[field], `expected an error on ${field}, got ${JSON.stringify(r.body.fields)}`)
  })
}

test('a request that fails saves nothing', async () => {
  const before = (await query('SELECT count(*)::int AS n FROM requests')).rows[0].n
  await post('/requests', { ...goodRequest(), trades: { mason: 1000 } })
  const after = (await query('SELECT count(*)::int AS n FROM requests')).rows[0].n
  assert.equal(after, before)
})

test('a body that is not valid JSON gets a clean 400, not a crash', async () => {
  const res = await fetch(`${api.base}/requests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' })
  assert.equal(res.status, 400)
  assert.ok((await res.json()).error)
})

test('a JSON body that is not an object is rejected, not a crash', async () => {
  const r = await post('/requests', 'just a string')
  assert.equal(r.status, 400)
})

test('a good worker application saves', async () => {
  const r = await post('/workers', goodWorker())
  assert.equal(r.status, 201)
  const { rows } = await query('SELECT status, phone FROM workers WHERE id = $1', [r.body.id])
  assert.equal(rows[0].status, 'Pending')
  assert.equal(rows[0].phone, '0733000111')
})

const badWorkers = [
  ['one-word name', { name: 'Peter' }, 'name'],
  ['bad phone', { phone: '999' }, 'phone'],
  ['short id', { nationalId: '123456' }, 'nationalId'],
  ['letters in id', { nationalId: '1234567a' }, 'nationalId'],
  ['no dob', { dob: '' }, 'dob'],
  ['under 18', { dob: new Date(Date.now() - 17 * 365.25 * 86400000).toISOString().slice(0, 10) }, 'dob'],
  ['over 35', { dob: '1970-01-01' }, 'dob'],
  ['unknown trade', { trade: 'wizard' }, 'trade'],
  ['unknown county', { county: 'Atlantis' }, 'county'],
  ['bad kind', { kind: 'expert' }, 'kind'],
  ['no consent', { consent: false }, 'consent'],
  ['consent as text', { consent: 'true' }, 'consent'],
]
for (const [label, patch, field] of badWorkers) {
  test(`worker rejected: ${label}`, async () => {
    const r = await post('/workers', goodWorker(patch))
    assert.equal(r.status, 400)
    assert.ok(r.body.fields[field], `expected an error on ${field}, got ${JSON.stringify(r.body.fields)}`)
  })
}

test('the same national ID cannot apply twice', async () => {
  const w = goodWorker()
  assert.equal((await post('/workers', w)).status, 201)
  const again = await post('/workers', w)
  assert.equal(again.status, 409)
  assert.ok(again.body.fields.nationalId)
})

test('the honeypot field quietly saves nothing', async () => {
  const w = goodWorker({ website: 'http://spam.example' })
  const r = await post('/workers', w)
  assert.equal(r.status, 201)
  const { rows } = await query('SELECT 1 FROM workers WHERE national_id = $1', [w.nationalId])
  assert.equal(rows.length, 0)
})
