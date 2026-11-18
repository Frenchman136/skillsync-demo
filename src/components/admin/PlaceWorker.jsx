import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { tradeName } from '../../lib/data.js'

/**
 * The core of the agency: pick an approved, free worker of the right trade for one open position.
 * The server re-checks every rule, so the list below is a convenience, not the protection.
 */
export default function PlaceWorker({ request, line, onPlaced }) {
  const [options, setOptions] = useState(null)
  const [choice, setChoice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    api.get(`/workers?status=Approved&trade=${encodeURIComponent(line.trade)}&available=true`)
      .then((w) => { if (live) setOptions(w) })
      .catch((e) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [line.trade, line.filled])

  async function place() {
    if (!choice || busy) return
    setBusy(true); setError('')
    try {
      const updated = await api.post(`/requests/${request.id}/lines/${line.id}/assignments`, { workerId: Number(choice) })
      setChoice('')
      onPlaced(updated)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!options) return <p className="small">{error || 'Finding workers…'}</p>
  return (
    <div className="place">
      {options.length ? (
        <div className="row">
          <select aria-label={`Approved ${tradeName(line.trade).toLowerCase()} to place`} value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Choose an approved {tradeName(line.trade).toLowerCase().replace(/s$/, '')}…</option>
            {options.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.county} · {w.kind}</option>)}
          </select>
          <button className="btn sm" disabled={!choice || busy} onClick={place}>{busy ? 'Placing…' : 'Place'}</button>
        </div>
      ) : (
        <p className="small">No free approved {tradeName(line.trade).toLowerCase()}. Verify and approve some on the Workers tab.</p>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  )
}
