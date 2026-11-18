import { Router } from 'express'
import { tx } from '../db.js'
import { HttpError, parseId } from '../errors.js'
import { admin } from './shared.js'
import { loadRequests } from './requests.js'

export const router = Router()

// All the rules run inside one transaction with row locks, so two admins cannot over-fill a line.
router.post('/requests/:id/lines/:lineId/assignments', ...admin, async (req, res) => {
  const requestId = parseId(req.params.id)
  const lineId = parseId(req.params.lineId)
  const workerId = req.body?.workerId
  if (!Number.isInteger(workerId) || workerId < 1) throw new HttpError(400, 'Choose a worker.', { workerId: 'Choose a worker.' })

  await tx(async (c) => {
    const { rows: lines } = await c.query(
      `SELECT l.id, l.trade, l.quantity, r.status AS request_status
       FROM request_lines l JOIN requests r ON r.id = l.request_id
       WHERE l.id = $1 AND l.request_id = $2 FOR UPDATE OF l`, [lineId, requestId])
    const line = lines[0]
    if (!line) throw new HttpError(404, 'That position does not exist on this request.')
    if (line.request_status === 'Closed') throw new HttpError(409, 'This request is closed.')

    const { rows: ws } = await c.query('SELECT id, name, trade, status FROM workers WHERE id = $1 FOR UPDATE', [workerId])
    const w = ws[0]
    if (!w) throw new HttpError(404, 'Worker not found.')
    if (w.status !== 'Approved') throw new HttpError(409, `${w.name} is ${w.status}. Only approved workers can be placed.`)
    if (w.trade !== line.trade) throw new HttpError(409, `${w.name} is a ${w.trade}, but this position needs a ${line.trade}.`)

    const { rows: used } = await c.query('SELECT count(*)::int AS n FROM assignments WHERE request_line_id = $1', [lineId])
    if (used[0].n >= line.quantity) throw new HttpError(409, 'This position is already full.')

    try {
      await c.query('INSERT INTO assignments (request_line_id, worker_id) VALUES ($1, $2)', [lineId, workerId])
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, `${w.name} is already placed on a request.`)
      throw e
    }
    await syncPlacedStatus(c, requestId)
  })
  const [r] = await loadRequests(req.user, requestId)
  res.status(201).json(r)
})

router.delete('/assignments/:id', ...admin, async (req, res) => {
  const id = parseId(req.params.id)
  const requestId = await tx(async (c) => {
    const { rows } = await c.query(
      'SELECT l.request_id FROM assignments a JOIN request_lines l ON l.id = a.request_line_id WHERE a.id = $1', [id])
    if (!rows[0]) throw new HttpError(404, 'Placement not found.')
    await c.query('SELECT id FROM requests WHERE id = $1 FOR UPDATE', [rows[0].request_id])
    await c.query('DELETE FROM assignments WHERE id = $1', [id])
    await syncPlacedStatus(c, rows[0].request_id)
    return rows[0].request_id
  })
  const [r] = await loadRequests(req.user, requestId)
  res.json(r)
})

/** Every position full -> Placed. A Placed request that loses someone drops back to Quoted. */
async function syncPlacedStatus(c, requestId) {
  const { rows } = await c.query(
    `SELECT r.status,
            NOT EXISTS (SELECT 1 FROM request_lines l WHERE l.request_id = r.id
                          AND l.quantity > (SELECT count(*) FROM assignments a WHERE a.request_line_id = l.id)) AS full
     FROM requests r WHERE r.id = $1`, [requestId])
  const { status, full } = rows[0]
  if (full && ['New', 'Contacted', 'Quoted'].includes(status)) await c.query("UPDATE requests SET status = 'Placed' WHERE id = $1", [requestId])
  else if (!full && status === 'Placed') await c.query("UPDATE requests SET status = 'Quoted' WHERE id = $1", [requestId])
}
