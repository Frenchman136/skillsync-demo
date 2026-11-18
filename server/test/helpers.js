// Test setup. Must be imported BEFORE anything from ../src so the env vars are in place.
// It points the app at TEST_DATABASE_URL and wipes that database, so never aim it at real data.
import 'dotenv/config'

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl) throw new Error('Set TEST_DATABASE_URL (a throwaway database) to run the tests.')
if (testUrl === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL: the tests wipe it.')

process.env.DATABASE_URL = testUrl
process.env.ADMIN_EMAIL = 'admin@test.local'
process.env.ADMIN_PASSWORD = 'TestAdminPass1'
process.env.JWT_SECRET = 'test-secret-test-secret-123456'

const { migrate, pool, query } = await import('../src/db.js')
const { ensureAdmin } = await import('../src/auth.js')
const { createApp } = await import('../src/app.js')

export { pool, query }
export const ADMIN = { email: 'admin@test.local', password: 'TestAdminPass1' }

export async function reset() {
  await migrate()
  await query('TRUNCATE assignments, request_lines, requests, workers, users RESTART IDENTITY CASCADE')
  await ensureAdmin()
}

export async function startServer() {
  const server = createApp().listen(0)
  await new Promise((r) => server.once('listening', r))
  const base = `http://127.0.0.1:${server.address().port}/api`
  async function call(method, path, { token, body } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    return { status: res.status, body: text ? JSON.parse(text) : null }
  }
  return { call, base, close: () => new Promise((r) => server.close(r)) }
}

/** Fresh database, running server, an admin token and two contractor accounts (Jane and Bob). */
export async function world() {
  await reset()
  const api = await startServer()
  const adminToken = (await api.call('POST', '/auth/login', { body: ADMIN })).body.token
  const mk = async (email, name) => {
    const r = await api.call('POST', '/users', { token: adminToken, body: { email, name, password: 'Password123', company: name + ' Ltd' } })
    if (r.status !== 201) throw new Error('could not create contractor ' + email)
    const login = await api.call('POST', '/auth/login', { body: { email, password: 'Password123' } })
    return { token: login.body.token, id: r.body.id }
  }
  const jane = await mk('jane@c.test', 'Jane')
  const bob = await mk('bob@c.test', 'Bob')
  const A = (method, path, body) => api.call(method, path, { token: adminToken, body })

  async function newRequest(token, trades = { mason: 2, labour: 1 }) {
    const r = await api.call('POST', '/requests', { token, body: { ...goodRequest(), trades } })
    if (r.status !== 201) throw new Error('could not create request: ' + JSON.stringify(r.body))
    return r.body.id
  }
  async function approvedWorker(trade = 'mason') {
    const w = (await api.call('POST', '/workers', { body: goodWorker({ trade }) })).body
    await A('PATCH', `/workers/${w.id}`, { status: 'Verified', idChecked: true })
    await A('PATCH', `/workers/${w.id}`, { status: 'Approved' })
    return w.id
  }
  const lineFor = async (requestId, trade) => (await A('GET', `/requests/${requestId}`)).body.lines.find((l) => l.trade === trade).id
  const place = async (requestId, trade, workerId) => A('POST', `/requests/${requestId}/lines/${await lineFor(requestId, trade)}/assignments`, { workerId })

  return { api, adminToken, jane, bob, A, newRequest, approvedWorker, lineFor, place, close: async () => { await api.close(); await pool.end() } }
}

export const tomorrow = () => new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
export const yesterday = () => new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

export const goodRequest = () => ({
  name: 'Jane Wanjiru', company: 'Acme', phone: '0722 111 222', email: 'jane@acme.example',
  site: 'Upper Hill, Nairobi', start: tomorrow(), length: '6 months or more', notes: 'Test', trades: { mason: 2, labour: 1 },
})

let nid = 40000000
export const goodWorker = (over = {}) => ({
  name: 'Peter Otieno', phone: '+254 733 000 111', nationalId: String(nid++), dob: '1998-03-14',
  county: 'Nairobi', trade: 'mason', kind: 'skilled', experience: '', consent: true, ...over,
})
