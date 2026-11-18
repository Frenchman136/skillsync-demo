import rateLimit from 'express-rate-limit'
import { requireAuth, requireRole } from '../auth.js'

const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } })

export const loginLimit = limiter(15 * 60 * 1000, 20, 'Too many sign-in attempts. Try again in a few minutes.')
export const submitLimit = limiter(60 * 60 * 1000, 40, 'Too many submissions from this address. Try again later.')

/** Middleware list for admin-only routes. */
export const admin = [requireAuth, requireRole('admin')]
