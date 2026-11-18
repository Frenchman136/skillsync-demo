import { useState, useCallback } from 'react'
import { store } from '../lib/store.js'
import { tradeName } from '../lib/data.js'

// Demo only. A real system checks a password on a server.
const DEMO_PASSWORD = 'skillsync'
const REQ_STATUS = ['New', 'Contacted', 'Quoted', 'Placed', 'Closed']
const WORKER_STATUS = ['Pending', 'Verified', 'Approved', 'Rejected']
const fmt = (iso) => new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Admin() {
  const [ok, setOk] = useState(() => sessionStorage.getItem('ss_admin') === '1')
  const [pw, setPw] = useState('')
  const [bad, setBad] = useState(false)
  const [tab, setTab] = useState('requests')
  const [, tick] = useState(0)
  const refresh = useCallback(() => tick((n) => n + 1), [])

  if (!ok) {
    return (
      <section className="wrap narrow pad">
        <form className="box form" onSubmit={(e) => { e.preventDefault(); if (pw === DEMO_PASSWORD) { sessionStorage.setItem('ss_admin', '1'); setOk(true) } else setBad(true) }}>
          <h1>Admin sign in</h1>
          <p className="sub">Demo only. The password is <code>{DEMO_PASSWORD}</code>.</p>
          <div className="field"><label htmlFor="pw">Password</label><input id="pw" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setBad(false) }} autoFocus />{bad && <span className="err" role="alert">That password is not right.</span>}</div>
          <button className="btn" type="submit">Sign in</button>
        </form>
      </section>
    )
  }

  const requests = store.list('ss_requests')
  const workers = store.list('ss_workers')
  const act = (fn) => () => { fn(); refresh() }

  function sample() {
    store.add('ss_requests', { name: 'Jane Wanjiru', company: 'Acme Construction', phone: '0722111222', site: 'Upper Hill, Nairobi', start: '2026-12-01', length: '6 months or more', trades: { mason: 4, labour: 6 }, status: 'New', notes: 'Sample row' })
    store.add('ss_workers', { name: 'Peter Otieno', phone: '0733000111', nationalId: '31234567', age: 27, county: 'Nairobi', trade: 'plumber', kind: 'skilled', status: 'Pending' })
    refresh()
  }

  return (
    <section className="wrap pad">
      <div className="headrow">
        <div><h1>Admin</h1><p className="sub">Demo data saved in this browser only.</p></div>
        <div className="row"><button className="btn line sm" onClick={sample}>Add sample data</button><button className="btn line sm" onClick={() => { sessionStorage.removeItem('ss_admin'); setOk(false) }}>Sign out</button></div>
      </div>
      <div className="kpis">
        <div className="kpi"><span>New requests</span><b>{requests.filter((r) => r.status === 'New').length}</b></div>
        <div className="kpi"><span>Total requests</span><b>{requests.length}</b></div>
        <div className="kpi"><span>Workers to check</span><b>{workers.filter((w) => w.status === 'Pending').length}</b></div>
        <div className="kpi"><span>Approved workers</span><b>{workers.filter((w) => w.status === 'Approved').length}</b></div>
      </div>
      <div className="tabs" role="tablist">
        {[['requests', `Requests (${requests.length})`], ['workers', `Workers (${workers.length})`]].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'requests' && (
        <div className="box list">
          {!requests.length && <p className="empty">No requests yet. Send one from the Request page.</p>}
          {requests.map((r) => (
            <article key={r.id} className="item">
              <div className="grow">
                <b>{r.company || r.name}</b> <span className="small">· {r.id} · {fmt(r.createdAt)}</span>
                <p>{Object.entries(r.trades).map(([t, n]) => `${n} ${tradeName(t).toLowerCase()}`).join(', ')}</p>
                <p className="small">{r.site} · starts {r.start} · {r.length}</p>
                <p className="small">{r.name} · {r.phone}{r.email ? ` · ${r.email}` : ''}</p>
                {r.notes && <p className="small">“{r.notes}”</p>}
              </div>
              <div className="actions">
                <select aria-label="Status" value={r.status} onChange={(e) => { store.update('ss_requests', r.id, { status: e.target.value }); refresh() }}>{REQ_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
                <button className="linkbtn" onClick={act(() => store.remove('ss_requests', r.id))}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === 'workers' && (
        <div className="box list">
          {!workers.length && <p className="empty">No applications yet. Apply from the worker page.</p>}
          {workers.map((w) => (
            <article key={w.id} className="item">
              <div className="grow">
                <b>{w.name}</b> <span className="small">· {w.id} · {fmt(w.createdAt)}</span>
                <p>{tradeName(w.trade)} · {w.kind === 'skilled' ? 'Skilled' : 'General'} · age {w.age} · {w.county}</p>
                <p className="small">{w.phone} · ID {w.nationalId}</p>
                {w.experience && <p className="small">“{w.experience}”</p>}
              </div>
              <div className="actions">
                <select aria-label="Status" value={w.status} onChange={(e) => { store.update('ss_workers', w.id, { status: e.target.value }); refresh() }}>{WORKER_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
                <button className="linkbtn" onClick={act(() => store.remove('ss_workers', w.id))}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
