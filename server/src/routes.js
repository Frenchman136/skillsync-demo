import { Router } from 'express'
import { query } from './db.js'
import { login, requireAuth, publicUser } from './auth.js'
import { TRADES } from './constants.js'
import { validateLogin } from './validate.js'
import { admin, loginLimit } from './routes/shared.js'
import { router as requests } from './routes/requests.js'
import { router as workers } from './routes/workers.js'
import { router as placements } from './routes/placements.js'
import { router as users } from './routes/users.js'

export const router = Router()

router.get('/health', async (_req, res) => {
  await query('SELECT 1')
  res.json({ ok: true })
})
router.get('/trades', (_req, res) => res.json(TRADES))

router.post('/auth/login', loginLimit, async (req, res) => {
  const { email, password } = validateLogin(req.body)
  res.json(await login(email, password))
})
router.get('/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

router.get('/stats', ...admin, async (_req, res) => {
  const { rows } = await query(`
    SELECT (SELECT count(*)::int FROM requests WHERE status = 'New') AS new_requests,
           (SELECT count(*)::int FROM requests) AS requests,
           (SELECT count(*)::int FROM workers WHERE status = 'Pending') AS to_verify,
           (SELECT count(*)::int FROM workers WHERE status = 'Verified') AS to_approve,
           (SELECT count(*)::int FROM workers WHERE status = 'Approved') AS approved,
           (SELECT count(*)::int FROM assignments) AS placements`)
  const s = rows[0]
  res.json({ newRequests: s.new_requests, requests: s.requests, toVerify: s.to_verify, toApprove: s.to_approve, approved: s.approved, placements: s.placements })
})

router.use(requests)
router.use(workers)
router.use(placements)
router.use(users)
