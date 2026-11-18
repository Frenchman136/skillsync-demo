import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { tradeName } from '../../lib/data.js'
import { fmt, fmtDate, refNo, filledText, REQUEST_STATUS } from '../../lib/format.js'
import Status from '../Status.jsx'
import PlaceWorker from './PlaceWorker.jsx'

export default function RequestsTab({ onChange }) {
  const [requests, setRequests] = useState(null)
  const [contractors, setContractors] = useState([])
  const [open, setOpen] = useState(null) // request id whose placement panel is open
  const [filter, setFilter] = useState('All')
  const [error, setError] = useState('')

  const load = useCallback(() => api.get('/requests').then(setRequests).catch((e) => setError(e.message)), [])
  useEffect(() => { load(); api.get('/users').then(setContractors).catch(() => {}) }, [load])

  const replace = (r) => { setRequests((all) => all.map((x) => (x.id === r.id ? r : x))); onChange() }

  async function patch(r, body) {
    setError('')
    try { replace(await api.patch(`/requests/${r.id}`, body)) } catch (e) { setError(e.message); load() }
  }
  async function unplace(assignmentId) {
    setError('')
    try { replace(await api.del(`/assignments/${assignmentId}`)) } catch (e) { setError(e.message) }
  }
  async function remove(r) {
    if (!window.confirm(`Delete request ${refNo(r.id)}? Its placed workers become free again.`)) return
    try { await api.del(`/requests/${r.id}`); await load(); onChange() } catch (e) { setError(e.message) }
  }

  if (!requests) return <div className="box"><p className="empty">{error || 'Loading…'}</p></div>
  const shown = filter === 'All' ? requests : requests.filter((r) => r.status === filter)

  return (
    <>
      <div className="tabs" aria-label="Filter requests">
        {['All', ...REQUEST_STATUS].map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>
            {s} ({s === 'All' ? requests.length : requests.filter((r) => r.status === s).length})
          </button>
        ))}
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="box list">
        {!shown.length && <p className="empty">No requests here.</p>}
        {shown.map((r) => (
          <article key={r.id} className="item">
            <div className="grow">
              <b>{r.company || r.name}</b> <Status value={r.status} /> <span className="small">· {refNo(r.id)} · {fmt(r.createdAt)}</span>
              <p className="small">{r.site} · starts {fmtDate(r.start)} · {r.length}</p>
              <p className="small">{r.name} · {r.phone}{r.email ? ` · ${r.email}` : ''}</p>
              {r.notes && <p className="small">“{r.notes}”</p>}
              <p className="small">{r.contractor ? `Account: ${r.contractor.email}` : 'Walk-in (no account)'}</p>

              <p className="placed-line"><b>{filledText(r.lines)}</b>
                <button className="linkbtn" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide positions' : 'Place workers'}</button>
              </p>
              {open === r.id && (
                <ul className="lines">
                  {r.lines.map((l) => (
                    <li key={l.id}>
                      <div className="linehead"><b>{tradeName(l.trade)}</b> <span className="small">{l.filled} of {l.quantity}</span></div>
                      {l.workers.map((w) => (
                        <div key={w.assignmentId} className="placedworker">
                          <span>{w.name} <span className="small">· {w.phone}</span></span>
                          <button className="linkbtn" onClick={() => unplace(w.assignmentId)}>Remove</button>
                        </div>
                      ))}
                      {l.filled < l.quantity && r.status !== 'Closed' && <PlaceWorker request={r} line={l} onPlaced={replace} />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="actions">
              <select aria-label={`Status of ${refNo(r.id)}`} value={r.status} onChange={(e) => patch(r, { status: e.target.value })}>
                {REQUEST_STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select aria-label={`Account for ${refNo(r.id)}`} value={r.contractor?.id ?? ''} onChange={(e) => patch(r, { contractorId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">No account</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
              </select>
              <button className="linkbtn" onClick={() => remove(r)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
