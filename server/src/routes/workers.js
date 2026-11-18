import { Router } from 'express'
import { query, tx } from '../db.js'
import { HttpError, parseId } from '../errors.js'
import { WORKER_STATUS, WORKER_TRANSITIONS } from '../constants.js'
import { validateWorker } from '../validate.js'
import { admin, submitLimit } from './shared.js'

export const router = Router()

// Public application form. Not an account: workers never sign in.
router.post('/workers', submitLimit, async (req, res) => {
  if (req.body?.website) return res.status(201).json({ id: 0, name: 'Applicant', phone: '' }) // honeypot: pretend it worked
  const v = validateWorker(req.body)
  try {
    const { rows } = await query(
      `INSERT INTO workers (name, phone, national_id, dob, county, trade, kind, experience)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [v.name, v.phone, v.nationalId, v.dob, v.county, v.trade, v.kind, v.experience],
    )
    res.status(201).json({ id: rows[0].id, name: v.name, phone: v.phone })
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'This ID number has already applied.', { nationalId: 'This ID number has already applied.' })
    throw e
  }
})

const WORKER_SQL = `
  SELECT w.id, w.name, w.phone, w.national_id, w.dob, date_part('year', age(w.dob))::int AS age, w.county, w.trade, w.kind,
         w.experience, w.status, w.verified_at, w.created_at,
         a.id AS assignment_id, r.id AS placed_request_id, l.trade AS placed_trade
  FROM workers w
  LEFT JOIN assignments a ON a.worker_id = w.id
  LEFT JOIN request_lines l ON l.id = a.request_line_id
  LEFT JOIN requests r ON r.id = l.request_id`

const shapeWorker = (w) => ({
  id: w.id, name: w.name, phone: w.phone, nationalId: w.national_id, dob: w.dob, age: w.age, county: w.county,
  trade: w.trade, kind: w.kind, experience: w.experience, status: w.status, verifiedAt: w.verified_at, createdAt: w.created_at,
  placement: w.assignment_id ? { assignmentId: w.assignment_id, requestId: w.placed_request_id, trade: w.placed_trade } : null,
})

router.get('/workers', ...admin, async (req, res) => {
  const conds = []
  const params = []
  const { status, trade, available } = req.query
  if (status !== undefined) {
    if (!WORKER_STATUS.includes(status)) throw new HttpError(400, 'Unknown status filter.')
    params.push(status); conds.push(`w.status = $${params.length}`)
  }
  if (trade !== undefined) { params.push(String(trade)); conds.push(`w.trade = $${params.length}`) }
  if (available === 'true') conds.push('a.id IS NULL')
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  const { rows } = await query(`${WORKER_SQL} ${where} ORDER BY w.created_at DESC, w.id DESC`, params)
  res.json(rows.map(shapeWorker))
})

// Verify, approve or reject. The server enforces the order Pending -> Verified -> Approved.
router.patch('/workers/:id', ...admin, async (req, res) => {
  const id = parseId(req.params.id)
  const { status, idChecked } = req.body ?? {}
  if (!WORKER_STATUS.includes(status)) throw new HttpError(400, 'That is not a valid status.', { status: 'Choose a status from the list.' })
  await tx(async (c) => {
    const { rows } = await c.query(
      'SELECT w.status, EXISTS (SELECT 1 FROM assignments a WHERE a.worker_id = w.id) AS placed FROM workers w WHERE w.id = $1 FOR UPDATE OF w', [id])
    const w = rows[0]
    if (!w) throw new HttpError(404, 'Worker not found.')
    if (w.status === status) return
    if (!WORKER_TRANSITIONS[w.status].includes(status)) {
      throw new HttpError(409, status === 'Approved'
        ? 'A worker must be verified before they can be approved.'
        : `A ${w.status} worker cannot be moved to ${status}.`)
    }
    if (w.placed) throw new HttpError(409, 'This worker is placed on a request. Remove the placement first.')
    if (status === 'Verified' && idChecked !== true) {
      throw new HttpError(400, 'Confirm that you checked the national ID before verifying.', { idChecked: 'Tick to confirm the ID was checked.' })
    }
    await c.query(
      `UPDATE workers SET status = $1, verified_at = CASE WHEN $1 = 'Verified' THEN now() WHEN $1 = 'Pending' THEN NULL ELSE verified_at END WHERE id = $2`,
      [status, id])
  })
  const { rows } = await query(`${WORKER_SQL} WHERE w.id = $1`, [id])
  res.json(shapeWorker(rows[0]))
})

router.delete('/workers/:id', ...admin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM workers WHERE id = $1', [parseId(req.params.id)])
    if (!rowCount) throw new HttpError(404, 'Worker not found.')
    res.status(204).end()
  } catch (e) {
    if (e.code === '23503') throw new HttpError(409, 'This worker is placed on a request. Remove the placement first.')
    throw e
  }
})
