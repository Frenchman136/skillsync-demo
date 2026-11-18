import { useState } from 'react'
import { Link } from 'react-router-dom'
import Field from '../components/Field.jsx'
import { TRADES, COUNTIES } from '../lib/data.js'
import { cleanPhone, ageFrom } from '../lib/checks.js'
import { api, ApiError } from '../lib/api.js'

export default function Join() {
  const [f, setF] = useState({ name: '', phone: '', nationalId: '', dob: '', county: 'Nairobi', trade: 'labour', kind: 'general', experience: '', consent: false, website: '' })
  const [err, setErr] = useState({})
  const [done, setDone] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (f.website) return // honeypot: real people never fill this
    const x = {}
    if (f.name.trim().split(/\s+/).length < 2) x.name = 'Please enter your full name (first and last).'
    if (!cleanPhone(f.phone)) x.phone = 'Enter a Kenyan mobile number, like 0712 345 678.'
    if (!/^\d{7,8}$/.test(f.nationalId.trim())) x.nationalId = 'A national ID number is 7 or 8 numbers.'
    const age = f.dob ? ageFrom(f.dob) : null
    if (age === null) x.dob = 'Enter your date of birth.'
    else if (age < 18 || age > 35) x.dob = 'We take workers aged 18 to 35.'
    if (!f.consent) x.consent = 'Please agree so we can check your details.'
    setErr(x)
    if (Object.keys(x).length) { document.querySelector('[role=alert]')?.scrollIntoView({ block: 'center' }); return }
    setBusy(true)
    try {
      // The server checks everything again, including whether this ID has already applied.
      setDone(await api.post('/workers', { ...f, phone: cleanPhone(f.phone), nationalId: f.nationalId.trim() }))
    } catch (ex) {
      if (ex instanceof ApiError && Object.keys(ex.fields).length) setErr(ex.fields)
      else setErr({ form: ex.message })
      document.querySelector('[role=alert]')?.scrollIntoView({ block: 'center' })
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <section className="wrap narrow center pad">
        <div className="okmark" aria-hidden="true">✓</div>
        <h1>Application received.</h1>
        <p className="sub">Thank you, {done.name.split(' ')[0]}. We will check your details and text you on {done.phone}.</p>
        <p className="small">Reference W-{done.id}</p>
        <p><Link className="btn" to="/">Back to home</Link></p>
      </section>
    )
  }

  return (
    <section className="wrap narrow pad">
      <h1>Work with Skill Sync</h1>
      <p className="sub">We employ skilled and general construction workers on longer assignments. It is free to apply.</p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="box">
          <Field id="name" label="Full name" error={err.name}><input id="name" autoComplete="name" value={f.name} onChange={set('name')} /></Field>
          <div className="two">
            <Field id="phone" label="Phone (M-Pesa)" error={err.phone}><input id="phone" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="0712 345 678" /></Field>
            <Field id="nid" label="National ID number" error={err.nationalId}><input id="nid" inputMode="numeric" value={f.nationalId} onChange={set('nationalId')} /></Field>
            <Field id="dob" label="Date of birth" error={err.dob}><input id="dob" type="date" value={f.dob} onChange={set('dob')} /></Field>
            <Field id="county" label="County"><select id="county" value={f.county} onChange={set('county')}>{COUNTIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          </div>
          <Field id="trade" label="Your trade"><select id="trade" value={f.trade} onChange={set('trade')}>{TRADES.map((t) => <option key={t.id} value={t.id}>{t.name.replace(/s$/, '')}</option>)}</select></Field>
          <div className="seg" role="radiogroup" aria-label="Kind of worker">
            {[['skilled', 'Skilled (certified or experienced)'], ['general', 'General site worker']].map(([v, l]) => (
              <label key={v}><input type="radio" name="kind" checked={f.kind === v} onChange={() => setF({ ...f, kind: v })} /><span>{l}</span></label>
            ))}
          </div>
          <Field id="exp" label="Experience (optional)"><textarea id="exp" value={f.experience} onChange={set('experience')} placeholder="Where you have worked and for how long" /></Field>
          <div className="hp" aria-hidden="true"><label>Website<input tabIndex="-1" autoComplete="off" value={f.website} onChange={set('website')} /></label></div>
          <label className="check"><input type="checkbox" checked={f.consent} onChange={set('consent')} /><span>I agree that Skill Sync may check my ID and contact me about work.</span></label>
          {err.consent && <p className="err" role="alert">{err.consent}</p>}
        </div>
        {err.form && <p className="err" role="alert">{err.form}</p>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Apply'}</button>
      </form>
    </section>
  )
}
