// School-project storage: everything lives in this browser (localStorage).
// A real deployment would send these to a server. See README.
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || [] } catch { return [] } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode: ignore */ } }
const id = () => Math.random().toString(36).slice(2, 8).toUpperCase()

export const store = {
  list: (k) => read(k),
  add(k, item) { const all = read(k); const row = { id: id(), createdAt: new Date().toISOString(), ...item }; write(k, [row, ...all]); return row },
  update(k, rid, patch) { write(k, read(k).map((r) => (r.id === rid ? { ...r, ...patch } : r))) },
  remove(k, rid) { write(k, read(k).filter((r) => r.id !== rid)) },
  clear(k) { write(k, []) },
}

/** Accepts 07xx, 01xx, +254, 254. Returns 07xxxxxxxx style or null. */
export function cleanPhone(raw) {
  const d = String(raw).replace(/[\s\-()]/g, '')
  const m = d.match(/^(?:\+?254|0)([17]\d{8})$/)
  return m ? '0' + m[1] : null
}

export function ageFrom(dob) {
  const b = new Date(dob); if (Number.isNaN(b.getTime())) return null
  const n = new Date(); let a = n.getFullYear() - b.getFullYear()
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--
  return a
}
