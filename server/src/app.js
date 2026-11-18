import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import { router } from './routes.js'
import { HttpError } from './errors.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1) // Render puts one proxy in front. Needed for correct client IPs in rate limits.
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({
    origin(origin, cb) {
      // No Origin header = curl, UptimeRobot, same-server calls. Browsers always send one.
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true)
      cb(null, false)
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  }))
  app.use(express.json({ limit: '20kb' }))

  app.get('/', (_req, res) => res.json({ name: 'Skill Sync API', status: 'ok' }))
  app.use('/api', router)
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')))

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...(err.fields ? { fields: err.fields } : {}) })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request body is not valid JSON.' })
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'The request is too large.' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong on the server.' })
  })
  return app
}
