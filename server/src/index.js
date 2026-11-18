import { config } from './config.js'
import { migrate, pool } from './db.js'
import { ensureAdmin } from './auth.js'
import { createApp } from './app.js'

await migrate()
await ensureAdmin()

const server = createApp().listen(config.port, () => {
  console.log(`Skill Sync API listening on port ${config.port}`)
})

const stop = () => server.close(() => pool.end().then(() => process.exit(0)))
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
