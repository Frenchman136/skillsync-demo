import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Field from '../components/Field.jsx'
import { TRADES } from '../lib/data.js'
import { store, cleanPhone } from '../lib/store.js'

const today = () => new Date().toISOString().slice(0, 10)

export default function Request() {
  const { state } = useLocation()
  const [qty, setQty] = useState(() => ({ ...(state?.picked || {}) }))
  const [f, setF] = useState({ name: '', company: '', phone: '', email: '', site: '', start: '', length: '3 months or more', notes: '' })
  const [err, setErr] = useState({})
  const [done, setDone] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const step = (id, d) => setQty((q) => { const v = Math.max(0, Math.min(99, (q[id] || 0) + d)); const n = { ...q }; if (v) n[id] = v; else delete n[id]; return n })

  function submit(e) {
    e.preventDefault()
    const x = {}
    if (!Object.keys(qty).length) x.trades = 'Choose at least one trade and how many workers.'
    if (!f.name.trim()) x.name = 'Please enter your name.'
    if (!cleanPhone(f.phone)) x.phone = 'Enter a Kenyan mobile number, like 0712 345 678.'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'That email does not look right.'
    if (!f.site.trim()) x.site = 'Tell us where the site is.'
    if (!f.start) x.start = 'Choose a start date.'
    else if (f.start < today()) x.start = 'The start date cannot be in the past.'
    setErr(x)
    if (Object.keys(x).length) { document.querySelector('[role=alert]')?.scrollIntoView({ block: 'center' }); return }
    const row = store.add('ss_requests', { ...f, phone: cleanPhone(f.phone), trades: qty, status: 'New' })
    setDone(row)
  }

  if (done) {
    return (
      <section className="wrap narrow center pad">
        <div className="okmark" aria-hidden="true">✓</div>
        <h1>Request sent.</h1>
        <p className="sub">Thank you, {done.name.split(' ')[0]}. We will check the work and reply on {done.phone} within one working day.</p>
        <p className="small">Reference {done.id}</p>
        <p><Link className="btn" to="/">Back to home</Link></p>
      </section>
    )
  }

  return (
    <section className="wrap narrow pad">
      <h1>Request workers</h1>
      <p className="sub">Tell us the work. We check it, agree the price with you, then place workers.</p>
      <form className="form" onSubmit={submit} noValidate>
        <fieldset className="box">
          <legend>1. Which trades, and how many?</legend>
          {err.trades && <p className="err" role="alert">{err.trades}</p>}
          <div className="trades">
            {TRADES.map((t) => (
              <div key={t.id} className={'trade-row' + (qty[t.id] ? ' on' : '')}>
                <span>{t.name}</span>
                <span className="stepper">
                  <button type="button" onClick={() => step(t.id, -1)} aria-label={`Fewer ${t.name}`}>−</button>
                  <output aria-label={`${t.name} needed`}>{qty[t.id] || 0}</output>
                  <button type="button" onClick={() => step(t.id, 1)} aria-label={`More ${t.name}`}>+</button>
                </span>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="box">
          <legend>2. The job</legend>
          <Field id="site" label="Site location" error={err.site}><input id="site" value={f.site} onChange={set('site')} placeholder="Street, estate or landmark" /></Field>
          <div className="two">
            <Field id="start" label="Start date" error={err.start}><input id="start" type="date" min={today()} value={f.start} onChange={set('start')} /></Field>
            <Field id="length" label="How long?"><select id="length" value={f.length} onChange={set('length')}><option>1 to 3 months</option><option>3 months or more</option><option>6 months or more</option><option>Not sure yet</option></select></Field>
          </div>
          <Field id="notes" label="Anything else? (optional)"><textarea id="notes" value={f.notes} onChange={set('notes')} placeholder="For example: blockwork for a 3-storey block" /></Field>
        </fieldset>

        <fieldset className="box">
          <legend>3. Who are you?</legend>
          <div className="two">
            <Field id="name" label="Your name" error={err.name}><input id="name" autoComplete="name" value={f.name} onChange={set('name')} /></Field>
            <Field id="company" label="Company (optional)"><input id="company" autoComplete="organization" value={f.company} onChange={set('company')} /></Field>
            <Field id="phone" label="Phone" error={err.phone}><input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} placeholder="0712 345 678" /></Field>
            <Field id="email" label="Email (optional)" error={err.email}><input id="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></Field>
          </div>
        </fieldset>
        <button className="btn" type="submit">Send request</button>
      </form>
    </section>
  )
}
