import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { query, world, ADMIN } from './helpers.js'

let w
before(async () => { w = await world() })
after(async () => { await w.close() })

test('the admin password is stored hashed, never as text', async () => {
  const { rows } = await query("SELECT password_hash FROM users WHERE role = 'admin'")
  assert.notEqual(rows[0].password_hash, ADMIN.password)
  assert.match(rows[0].password_hash, /^\$2[aby]\$/)
})

test('wrong password and unknown email give the same 401', async () => {
  const a = await w.api.call('POST', '/auth/login', { body: { email: ADMIN.email, password: 'wrong-password' } })
  const b = await w.api.call('POST', '/auth/login', { body: { email: 'nobody@x.test', password: 'wrong-password' } })
  assert.equal(a.status, 401)
  assert.equal(b.status, 401)
  assert.equal(a.body.error, b.body.error)
})

test('login with no password is a 400', async () => {
  assert.equal((await w.api.call('POST', '/auth/login', { body: { email: ADMIN.email } })).status, 400)
})

test('protected routes need a valid token', async () => {
  for (const path of ['/requests', '/workers', '/users', '/stats', '/auth/me']) {
    assert.equal((await w.api.call('GET', path)).status, 401, path)
    assert.equal((await w.api.call('GET', path, { token: 'garbage.token.here' })).status, 401, path)
  }
})

test('a token signed with another secret is refused', async () => {
  const { default: jwt } = await import('jsonwebtoken')
  const forged = jwt.sign({ role: 'admin' }, 'some-other-secret-0123456789', { subject: '1' })
  assert.equal((await w.api.call('GET', '/workers', { token: forged })).status, 401)
})

test('the password hash is never sent to the browser', async () => {
  const me = await w.api.call('GET', '/auth/me', { token: w.adminToken })
  assert.equal(me.status, 200)
  assert.ok(!JSON.stringify(me.body).includes('password'))
  assert.ok(!JSON.stringify((await w.A('GET', '/users')).body).includes('password'))
})

test('changing the env password and restarting changes the admin login', async () => {
  const { ensureAdmin } = await import('../src/auth.js')
  const { config } = await import('../src/config.js')
  const old = config.adminPassword
  config.adminPassword = 'BrandNewPass99'
  await ensureAdmin()
  assert.equal((await w.api.call('POST', '/auth/login', { body: { email: ADMIN.email, password: 'BrandNewPass99' } })).status, 200)
  assert.equal((await w.api.call('POST', '/auth/login', { body: { email: ADMIN.email, password: old } })).status, 401)
  config.adminPassword = old
  await ensureAdmin()
})
