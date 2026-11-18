import 'dotenv/config'

function need(key) {
  const v = process.env[key]
  if (!v) throw new Error(`Missing environment variable ${key}. See server/.env.example`)
  return v
}

const jwtSecret = need('JWT_SECRET')
if (jwtSecret.length < 16) throw new Error('JWT_SECRET must be at least 16 characters.')
const adminPassword = need('ADMIN_PASSWORD')
if (adminPassword.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters.')

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  databaseUrl: need('DATABASE_URL'),
  jwtSecret,
  adminEmail: need('ADMIN_EMAIL').trim().toLowerCase(),
  adminPassword,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
}
