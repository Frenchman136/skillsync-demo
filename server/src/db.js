import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { config } from './config.js'

// Return DATE columns as plain 'YYYY-MM-DD' strings (not JS Dates, which shift by timezone).
pg.types.setTypeParser(1082, (v) => v)

// Render's external database address needs SSL. A local database does not.
const useSsl = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : /\.render\.com/.test(config.databaseUrl)

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: 5,
})

export const query = (text, params) => pool.query(text, params)

/** Run fn(client) inside a transaction. Commits on success, rolls back on any error. */
export async function tx(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

export async function migrate() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  await pool.query(sql)
}
