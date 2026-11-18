import { Router } from 'express'
import { query } from '../db.js'
import { hashPassword } from '../auth.js'
import { HttpError, parseId } from '../errors.js'
import { validateContractor } from '../validate.js'
import { admin } from './shared.js'

export const router = Router()

const shape = (u) => ({ id: u.id, email: u.email, name: u.name, company: u.company, phone: u.phone, createdAt: u.created_at, requests: u.requests ?? 0 })

// The admin creates contractor accounts. There is no self-registration.
router.get('/users', ...admin, async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.company, u.phone, u.created_at,
            (SELECT count(*)::int FROM requests r WHERE r.contractor_id = u.id) AS requests
     FROM users u WHERE u.role = 'contractor' ORDER BY u.created_at DESC, u.id DESC`)
  res.json(rows.map(shape))
})

router.post('/users', ...admin, async (req, res) => {
  const v = validateContractor(req.body)
  const hash = await hashPassword(v.password)
  try {
    const { rows } = await query(
      `INSERT INTO users (email, name, company, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5,'contractor')
       RETURNING id, email, name, company, phone, created_at`,
      [v.email, v.name, v.company, v.phone, hash])
    res.status(201).json(shape(rows[0]))
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'An account with that email already exists.', { email: 'An account with that email already exists.' })
    throw e
  }
})

router.delete('/users/:id', ...admin, async (req, res) => {
  const { rowCount } = await query("DELETE FROM users WHERE id = $1 AND role = 'contractor'", [parseId(req.params.id)])
  if (!rowCount) throw new HttpError(404, 'Contractor not found.')
  res.status(204).end()
})
