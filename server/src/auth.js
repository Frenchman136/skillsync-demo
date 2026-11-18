import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { query } from './db.js'
import { HttpError } from './errors.js'

const ROUNDS = 10

export const hashPassword = (pw) => bcrypt.hash(pw, ROUNDS)
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash)

// Compared against when the email is unknown, so the response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS)

export function signToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, { subject: String(user.id), expiresIn: '8h' })
}

export const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, company: u.company, role: u.role })

export async function login(email, password) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email])
  const user = rows[0]
  const ok = await checkPassword(password, user ? user.password_hash : DUMMY_HASH)
  if (!user || !ok) throw new HttpError(401, 'Email or password is not right.')
  return { token: signToken(user), user: publicUser(user) }
}

/**
 * Create or update the admin from ADMIN_EMAIL and ADMIN_PASSWORD.
 * Only the bcrypt hash is stored. Changing the env var and restarting changes the password.
 */
export async function ensureAdmin() {
  const hash = await hashPassword(config.adminPassword)
  await query(
    `INSERT INTO users (email, name, password_hash, role) VALUES ($1, 'Administrator', $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [config.adminEmail, hash],
  )
}

function readToken(req) {
  const h = req.get('authorization') || ''
  const m = h.match(/^Bearer (.+)$/)
  if (!m) return null
  try { return jwt.verify(m[1], config.jwtSecret) } catch { return null }
}

/** Sets req.user when a valid token is present. Never rejects. Used where login is optional. */
export async function optionalAuth(req, _res, next) {
  try {
    const payload = readToken(req)
    if (payload) {
      const { rows } = await query('SELECT * FROM users WHERE id = $1', [Number(payload.sub)])
      if (rows[0]) req.user = rows[0]
    }
    next()
  } catch (e) { next(e) }
}

/** Requires a valid token whose user still exists. Role is read from the database, not the token. */
export async function requireAuth(req, _res, next) {
  try {
    const payload = readToken(req)
    if (!payload) throw new HttpError(401, 'Please sign in.')
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [Number(payload.sub)])
    if (!rows[0]) throw new HttpError(401, 'Please sign in again.')
    req.user = rows[0]
    next()
  } catch (e) { next(e) }
}

export const requireRole = (role) => (req, _res, next) =>
  req.user?.role === role ? next() : next(new HttpError(403, 'You do not have access to this.'))
