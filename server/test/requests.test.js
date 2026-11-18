import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { query, world } from './helpers.js'

let w
before(async () => { w = await world() })
after(async () => { await w.close() })

test('request status and contractor link are validated', async () => {
  const id = await w.newRequest(undefined)
  assert.equal((await w.A('PATCH', `/requests/${id}`, { status: 'Nonsense' })).status, 400)
  assert.equal((await w.A('PATCH', `/requests/${id}`, {})).status, 400)
  assert.equal((await w.A('PATCH', `/requests/${id}`, { status: 'Contacted' })).body.status, 'Contacted')
  assert.equal((await w.A('PATCH', `/requests/${id}`, { contractorId: 999999 })).status, 400)
  assert.equal((await w.A('PATCH', `/requests/${id}`, { contractorId: 'x' })).status, 400)
  assert.equal((await w.A('PATCH', '/requests/999999', { status: 'Closed' })).status, 404)
})

test('linking a walk-in request to a contractor makes it appear in their list', async () => {
  const id = await w.newRequest(undefined)
  assert.ok(!(await w.api.call('GET', '/requests', { token: w.bob.token })).body.some((r) => r.id === id))
  assert.equal((await w.A('PATCH', `/requests/${id}`, { contractorId: w.bob.id })).status, 200)
  assert.ok((await w.api.call('GET', '/requests', { token: w.bob.token })).body.some((r) => r.id === id))
})

test('ids in the URL that are not numbers are a 404, and SQL in them does nothing', async () => {
  assert.equal((await w.A('GET', '/requests/abc')).status, 404)
  assert.equal((await w.A('GET', '/requests/1;DROP TABLE requests')).status, 404)
  assert.equal((await w.A('GET', '/requests/99999999999')).status, 404)
  assert.equal((await w.A('GET', '/requests')).status, 200)
})

test('stats add up, and unknown API paths are a JSON 404', async () => {
  await w.newRequest(undefined)
  const s = (await w.A('GET', '/stats')).body
  const { rows } = await query('SELECT (SELECT count(*)::int FROM requests) AS r, (SELECT count(*)::int FROM assignments) AS a')
  assert.equal(s.requests, rows[0].r)
  assert.equal(s.placements, rows[0].a)
  const nope = await w.api.call('GET', '/nope')
  assert.equal(nope.status, 404)
  assert.ok(nope.body.error)
})

test('the health check answers without signing in', async () => {
  const r = await w.api.call('GET', '/health')
  assert.equal(r.status, 200)
  assert.equal(r.body.ok, true)
})
