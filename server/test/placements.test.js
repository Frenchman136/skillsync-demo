import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { query, world, goodWorker } from './helpers.js'

let w
before(async () => { w = await world() })
after(async () => { await w.close() })

const url = async (id, trade) => `/requests/${id}/lines/${await w.lineFor(id, trade)}/assignments`

test('placing an approved worker fills the position', async () => {
  const id = await w.newRequest(w.jane.token, { mason: 2 })
  const worker = await w.approvedWorker('mason')
  const r = await w.place(id, 'mason', worker)
  assert.equal(r.status, 201)
  assert.equal(r.body.lines[0].filled, 1)
  assert.equal(r.body.lines[0].workers[0].workerId, worker)
  assert.equal(r.body.status, 'New', 'not every position is full yet')
})

test('only approved workers can be placed', async () => {
  const id = await w.newRequest(undefined, { mason: 1 })
  const pending = (await w.api.call('POST', '/workers', { body: goodWorker() })).body.id
  const verified = (await w.api.call('POST', '/workers', { body: goodWorker() })).body.id
  await w.A('PATCH', `/workers/${verified}`, { status: 'Verified', idChecked: true })
  for (const wid of [pending, verified]) assert.equal((await w.place(id, 'mason', wid)).status, 409)
})

test('the worker trade must match the position', async () => {
  const id = await w.newRequest(undefined, { mason: 1 })
  const r = await w.place(id, 'mason', await w.approvedWorker('plumber'))
  assert.equal(r.status, 409)
  assert.match(r.body.error, /plumber/)
})

test('a full position refuses another worker', async () => {
  const id = await w.newRequest(undefined, { mason: 1 })
  assert.equal((await w.place(id, 'mason', await w.approvedWorker('mason'))).status, 201)
  const r = await w.place(id, 'mason', await w.approvedWorker('mason'))
  assert.equal(r.status, 409)
  assert.match(r.body.error, /full/)
})

test('a worker cannot be on two requests at once', async () => {
  const one = await w.newRequest(undefined, { mason: 1 })
  const two = await w.newRequest(undefined, { mason: 1 })
  const worker = await w.approvedWorker('mason')
  assert.equal((await w.place(one, 'mason', worker)).status, 201)
  const r = await w.place(two, 'mason', worker)
  assert.equal(r.status, 409)
  assert.match(r.body.error, /already placed/)
})

test('a line from a different request is refused', async () => {
  const one = await w.newRequest(undefined, { mason: 1 })
  const two = await w.newRequest(undefined, { mason: 1 })
  const r = await w.A('POST', `/requests/${one}/lines/${await w.lineFor(two, 'mason')}/assignments`, { workerId: await w.approvedWorker('mason') })
  assert.equal(r.status, 404)
})

test('placement input is checked: missing, wrong type, unknown worker, bad ids', async () => {
  const id = await w.newRequest(undefined, { mason: 1 })
  const u = await url(id, 'mason')
  assert.equal((await w.A('POST', u, {})).status, 400)
  assert.equal((await w.A('POST', u, { workerId: '5' })).status, 400)
  assert.equal((await w.A('POST', u, { workerId: 999999 })).status, 404)
  assert.equal((await w.A('POST', '/requests/abc/lines/1/assignments', { workerId: 1 })).status, 404)
})

test('two admins racing for the last place: exactly one wins', async () => {
  const id = await w.newRequest(undefined, { mason: 1 })
  const u = await url(id, 'mason')
  const ids = [await w.approvedWorker('mason'), await w.approvedWorker('mason'), await w.approvedWorker('mason'), await w.approvedWorker('mason')]
  const results = await Promise.all(ids.map((workerId) => w.A('POST', u, { workerId })))
  assert.equal(results.filter((r) => r.status === 201).length, 1)
  assert.equal(results.filter((r) => r.status === 409).length, 3)
  const { rows } = await query('SELECT count(*)::int AS n FROM request_lines l JOIN assignments a ON a.request_line_id = l.id WHERE l.request_id = $1', [id])
  assert.equal(rows[0].n, 1)
})

test('the same worker sent to two requests at the same moment is placed once', async () => {
  const a = await w.newRequest(undefined, { mason: 1 })
  const b = await w.newRequest(undefined, { mason: 1 })
  const worker = await w.approvedWorker('mason')
  const results = await Promise.all([w.place(a, 'mason', worker), w.place(b, 'mason', worker)])
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409])
})

test('filling every position marks the request Placed; removing someone reopens it', async () => {
  const id = await w.newRequest(undefined, { mason: 1, labour: 1 })
  await w.place(id, 'mason', await w.approvedWorker('mason'))
  const done = await w.place(id, 'labour', await w.approvedWorker('labour'))
  assert.equal(done.body.status, 'Placed')
  const assignmentId = done.body.lines.find((x) => x.trade === 'mason').workers[0].assignmentId
  const undone = await w.A('DELETE', `/assignments/${assignmentId}`)
  assert.equal(undone.status, 200)
  assert.equal(undone.body.status, 'Quoted')
  assert.equal(undone.body.lines.find((x) => x.trade === 'mason').filled, 0)
  assert.equal((await w.A('DELETE', `/assignments/${assignmentId}`)).status, 404)
})

test('Placed cannot be set by hand while positions are open', async () => {
  const id = await w.newRequest(undefined, { mason: 2 })
  assert.equal((await w.A('PATCH', `/requests/${id}`, { status: 'Placed' })).status, 409)
})

test('a closed request cannot take new placements', async () => {
  const id = await w.newRequest(undefined, { mason: 1 })
  await w.A('PATCH', `/requests/${id}`, { status: 'Closed' })
  assert.equal((await w.place(id, 'mason', await w.approvedWorker('mason'))).status, 409)
})

test('deleting a request frees its workers', async () => {
  const id = await w.newRequest(undefined, { mason: 1 })
  const worker = await w.approvedWorker('mason')
  await w.place(id, 'mason', worker)
  assert.equal((await w.A('DELETE', `/requests/${id}`)).status, 204)
  const again = await w.newRequest(undefined, { mason: 1 })
  assert.equal((await w.place(again, 'mason', worker)).status, 201)
})
