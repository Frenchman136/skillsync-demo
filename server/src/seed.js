// Loads demo data: `npm run seed` (from /server). Safe to run again: it wipes the demo tables and reloads them.
// The admin account is NOT touched here. It comes from ADMIN_EMAIL / ADMIN_PASSWORD when the server starts.
import { migrate, pool, tx } from './db.js'
import { ensureAdmin, hashPassword } from './auth.js'

const CONTRACTOR_PASSWORD = process.env.SEED_CONTRACTOR_PASSWORD || 'Contractor123'

const daysFromNow = (n) => {
  const d = new Date(Date.now() + n * 86400000)
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

const contractors = [
  { email: 'jane@acme.example', name: 'Jane Wanjiru', company: 'Acme Construction', phone: '0722111222' },
  { email: 'david@kileleng.example', name: 'David Kilele', company: 'Kilele Engineering', phone: '0733444555' },
]

// [first name, phone, national id, dob, county, trade, kind, status]
const workers = [
  ['Peter Otieno', '0733000111', '31234567', '1998-03-14', 'Nairobi', 'plumber', 'skilled', 'Approved'],
  ['Samuel Kamau', '0711222333', '29876543', '1996-07-02', 'Kiambu', 'mason', 'skilled', 'Approved'],
  ['Joseph Mwangi', '0722333444', '32456781', '2000-11-21', 'Nairobi', 'mason', 'skilled', 'Approved'],
  ['Brian Odhiambo', '0745111222', '33112233', '2001-05-09', 'Kisumu', 'mason', 'general', 'Approved'],
  ['Grace Achieng', '0701234567', '34223344', '1999-01-30', 'Nairobi', 'labour', 'general', 'Approved'],
  ['Kevin Mutua', '0712987654', '30998877', '1997-09-18', 'Machakos', 'labour', 'general', 'Approved'],
  ['Daniel Kiprop', '0723456789', '31887766', '1995-12-05', 'Nakuru', 'labour', 'general', 'Approved'],
  ['Moses Njoroge', '0734567890', '32776655', '1998-08-27', 'Kiambu', 'electrician', 'skilled', 'Approved'],
  ['Alice Wambui', '0756789012', '33665544', '2002-02-11', 'Nairobi', 'painter', 'general', 'Verified'],
  ['John Barasa', '0767890123', '34554433', '1994-04-16', 'Uasin Gishu', 'carpenter', 'skilled', 'Verified'],
  ['Mary Chebet', '0778901234', '35443322', '2003-06-23', 'Nairobi', 'tiler', 'general', 'Pending'],
  ['Ibrahim Hassan', '0789012345', '28332211', '1992-10-08', 'Mombasa', 'welder', 'skilled', 'Pending'],
  ['Lucy Nyambura', '0790123456', '36221100', '2004-03-03', 'Kajiado', 'labour', 'general', 'Pending'],
  ['Tom Ouma', '0701112223', '27110099', '1993-01-12', 'Kisumu', 'roofer', 'skilled', 'Rejected'],
]

// owner: index in contractors, or null for a walk-in request from the public form.
const requests = [
  { owner: 0, name: 'Jane Wanjiru', site: 'Upper Hill, Nairobi', start: 14, length: '6 months or more', status: 'New',
    notes: 'Blockwork and site cleaning for a 6-storey block.', lines: { mason: 2, labour: 3 } },
  { owner: 0, name: 'Jane Wanjiru', site: 'Kilimani, Nairobi', start: 30, length: '3 months or more', status: 'Quoted',
    notes: 'Plumbing for a new apartment block.', lines: { plumber: 1, electrician: 1 } },
  { owner: 1, name: 'David Kilele', site: 'Thika Road, Kiambu', start: 7, length: '1 to 3 months', status: 'Contacted',
    notes: null, lines: { labour: 2 } },
  { owner: null, name: 'Sarah Muthoni', company: 'Muthoni Builders', phone: '0799888777', site: 'Ruaka, Kiambu', start: 21,
    length: 'Not sure yet', status: 'New', notes: 'Walk-in request from the website form.', lines: { painter: 2, tiler: 1 } },
]

// Placements to show on load: [request index, trade, worker national id]
const placements = [
  [1, 'plumber', '31234567'],
  [2, 'labour', '30998877'],
]

async function main() {
  await migrate()
  await ensureAdmin()
  const hash = await hashPassword(CONTRACTOR_PASSWORD)

  await tx(async (c) => {
    await c.query('TRUNCATE assignments, request_lines, requests, workers RESTART IDENTITY CASCADE')
    await c.query("DELETE FROM users WHERE role = 'contractor'")

    const ownerIds = []
    for (const u of contractors) {
      const { rows } = await c.query(
        "INSERT INTO users (email, name, company, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5,'contractor') RETURNING id",
        [u.email, u.name, u.company, u.phone, hash])
      ownerIds.push(rows[0].id)
    }

    const workerIds = {}
    for (const [name, phone, nid, dob, county, trade, kind, status] of workers) {
      const { rows } = await c.query(
        `INSERT INTO workers (name, phone, national_id, dob, county, trade, kind, status, verified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $8 IN ('Verified','Approved') THEN now() END) RETURNING id`,
        [name, phone, nid, dob, county, trade, kind, status])
      workerIds[nid] = rows[0].id
    }

    const lineIds = []
    for (const r of requests) {
      const owner = r.owner === null ? null : contractors[r.owner]
      const { rows } = await c.query(
        `INSERT INTO requests (contractor_id, name, company, phone, site, start_date, length, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [r.owner === null ? null : ownerIds[r.owner], r.name, owner?.company ?? r.company, owner?.phone ?? r.phone,
          r.site, daysFromNow(r.start), r.length, r.notes, r.status])
      const lines = {}
      for (const [trade, qty] of Object.entries(r.lines)) {
        const l = await c.query('INSERT INTO request_lines (request_id, trade, quantity) VALUES ($1,$2,$3) RETURNING id', [rows[0].id, trade, qty])
        lines[trade] = l.rows[0].id
      }
      lineIds.push(lines)
    }

    for (const [ri, trade, nid] of placements) {
      await c.query('INSERT INTO assignments (request_line_id, worker_id) VALUES ($1,$2)', [lineIds[ri][trade], workerIds[nid]])
    }
  })

  console.log(`Seeded ${workers.length} workers, ${requests.length} requests, ${contractors.length} contractors.`)
  console.log(`Contractor logins: ${contractors.map((c) => c.email).join(', ')} / password: ${CONTRACTOR_PASSWORD}`)
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => pool.end())
