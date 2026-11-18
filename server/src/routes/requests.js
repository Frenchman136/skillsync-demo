import { Router } from 'express'
import { query, tx } from '../db.js'
import { optionalAuth, requireAuth } from '../auth.js'
import { HttpError, parseId } from '../errors.js'
import { REQUEST_STATUS } from '../constants.js'
import { validateRequest } from '../validate.js'
import { admin, submitLimit } from './shared.js'

export const router = Router()

// Lines carry how many are needed and how many are filled. Only the admin also gets who fills them.
function requestSql(where, withWorkers) {
  const workersCol = withWorkers
    ? `, 'workers', COALESCE((SELECT json_agg(json_build_object('assignmentId', a.id, 'workerId', w.id, 'name', w.name, 'phone', w.phone) ORDER BY a.id)
                               FROM assignments a JOIN workers w ON w.id = a.worker_id WHERE a.request_line_id = l.id), '[]'::json)`
    : ''
  return `
    SELECT r.id, r.contractor_id, r.name, r.company, r.phone, r.email, r.site, r.start_date, r.length, r.notes, r.status, r.created_at,
           u.name AS contractor_name, u.email AS contractor_email,
           COALESCE((SELECT json_agg(json_build_object('id', l.id, 'trade', l.trade, 'quantity', l.quantity,
                       'filled', (SELECT count(*)::int FROM assignments a WHERE a.request_line_id = l.id)${workersCol}) ORDER BY l.id)
                     FROM request_lines l WHERE l.request_id = r.id), '[]'::json) AS lines
    FROM requests r LEFT JOIN users u ON u.id = r.contractor_id
    ${where}
    ORDER BY r.created_at DESC, r.id DESC`
}

function shapeRequest(r, isAdmin) {
  const out = {
    id: r.id, name: r.name, company: r.company, phone: r.phone, email: r.email, site: r.site,
    start: r.start_date, length: r.length, notes: r.notes, status: r.status, createdAt: r.created_at, lines: r.lines,
  }
  if (isAdmin) out.contractor = r.contractor_id ? { id: r.contractor_id, name: r.contractor_name, email: r.contractor_email } : null
  return out
}

/** A contractor only ever gets their own requests. An admin gets all of them. */
export async function loadRequests(user, id) {
  const isAdmin = user.role === 'admin'
  const conds = []
  const params = []
  if (!isAdmin) { params.push(user.id); conds.push(`r.contractor_id = $${params.length}`) }
  if (id !== undefined) { params.push(id); conds.push(`r.id = $${params.length}`) }
  const { rows } = await query(requestSql(conds.length ? 'WHERE ' + conds.join(' AND ') : '', isAdmin), params)
  return rows.map((r) => shapeRequest(r, isAdmin))
}

// Anyone can send a request. If a contractor is signed in, it is saved under their account.
router.post('/requests', submitLimit, optionalAuth, async (req, res) => {
  const v = validateRequest(req.body)
  const contractorId = req.user?.role === 'contractor' ? req.user.id : null
  const id = await tx(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO requests (contractor_id, name, company, phone, email, site, start_date, length, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [contractorId, v.name, v.company, v.phone, v.email, v.site, v.start, v.length, v.notes],
    )
    for (const l of v.lines) {
      await c.query('INSERT INTO request_lines (request_id, trade, quantity) VALUES ($1,$2,$3)', [rows[0].id, l.trade, l.quantity])
    }
    return rows[0].id
  })
  res.status(201).json({ id, name: v.name, phone: v.phone })
})

router.get('/requests', requireAuth, async (req, res) => {
  res.json(await loadRequests(req.user))
})

router.get('/requests/:id', requireAuth, async (req, res) => {
  const [r] = await loadRequests(req.user, parseId(req.params.id))
  if (!r) throw new HttpError(404, 'Request not found.')
  res.json(r)
})

router.patch('/requests/:id', ...admin, async (req, res) => {
  const id = parseId(req.params.id)
  const { status, contractorId } = req.body ?? {}
  if (status === undefined && contractorId === undefined) throw new HttpError(400, 'Nothing to change.')
  await tx(async (c) => {
    const { rows } = await c.query('SELECT id FROM requests WHERE id = $1 FOR UPDATE', [id])
    if (!rows[0]) throw new HttpError(404, 'Request not found.')
    if (status !== undefined) {
      if (!REQUEST_STATUS.includes(status)) throw new HttpError(400, 'That is not a valid status.', { status: 'Choose a status from the list.' })
      if (status === 'Placed') {
        const { rows: open } = await c.query(
          `SELECT 1 FROM request_lines l WHERE l.request_id = $1
             AND l.quantity > (SELECT count(*) FROM assignments a WHERE a.request_line_id = l.id) LIMIT 1`, [id])
        if (open[0]) throw new HttpError(409, 'Place a worker in every open position before marking this request Placed.')
      }
      await c.query('UPDATE requests SET status = $1 WHERE id = $2', [status, id])
    }
    if (contractorId !== undefined) {
      if (contractorId !== null) {
        if (!Number.isInteger(contractorId)) throw new HttpError(400, 'That contractor account does not exist.')
        const { rows: u } = await c.query("SELECT 1 FROM users WHERE id = $1 AND role = 'contractor'", [contractorId])
        if (!u[0]) throw new HttpError(400, 'That contractor account does not exist.')
      }
      await c.query('UPDATE requests SET contractor_id = $1 WHERE id = $2', [contractorId, id])
    }
  })
  const [r] = await loadRequests(req.user, id)
  res.json(r)
})

router.delete('/requests/:id', ...admin, async (req, res) => {
  const { rowCount } = await query('DELETE FROM requests WHERE id = $1', [parseId(req.params.id)])
  if (!rowCount) throw new HttpError(404, 'Request not found.')
  res.status(204).end()
})
