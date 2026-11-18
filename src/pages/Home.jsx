import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TRADES, STEPS, FAQ } from '../lib/data.js'

export default function Home() {
  const nav = useNavigate()
  const [picked, setPicked] = useState({})
  const toggle = (id) => setPicked((p) => { const n = { ...p }; if (n[id]) delete n[id]; else n[id] = 2; return n })
  const go = () => nav('/request', { state: { picked } })
  const count = Object.keys(picked).length

  return (
    <>
      <section className="hero wrap center">
        <h1>Skilled hands.<br /><span className="mute">Synced to your site.</span></h1>
        <p className="lead">Skill Sync is a Nairobi construction staffing agency. We employ, verify and supervise the people on your project.</p>
        <div className="row center-row">
          <Link className="btn" to="/request">Request workers</Link>
          <Link className="textlink" to="/join">Join as a worker ›</Link>
        </div>
      </section>

      <section id="trades" className="band">
        <div className="wrap">
          <h2>Pick the trades you need.</h2>
          <p className="sub">Choose one or more, then tell us how many.</p>
          <div className="cards">
            {TRADES.map((t) => (
              <button key={t.id} type="button" className={'card trade' + (picked[t.id] ? ' on' : '')} aria-pressed={!!picked[t.id]} onClick={() => toggle(t.id)}>
                {t.img
                  ? <img className="ph" src={`/img/${t.img}.webp`} alt={t.alt} width="720" height="540" loading="lazy" />
                  : <div className="ph blank" aria-hidden="true">{t.name[0]}</div>}
                <div><h3>{t.name}</h3><p>{t.task}</p></div>
                <span className="add" aria-hidden="true">{picked[t.id] ? '✓' : '+'}</span>
              </button>
            ))}
          </div>
          <div className="sticky-cta">
            <button className="btn" type="button" onClick={go}>{count ? `Continue with ${count} trade${count > 1 ? 's' : ''}` : 'Continue to request'}</button>
          </div>
        </div>
      </section>

      <section id="how" className="wrap pad">
        <h2>How it works.</h2>
        <ol className="steps">
          {STEPS.map(([h, p], i) => <li key={h}><span className="num">{i + 1}</span><h3>{h}</h3><p>{p}</p></li>)}
        </ol>
      </section>

      <section id="why" className="band">
        <div className="wrap bento">
          <div className="tile"><h3>Longer assignments only.</h3><p>The same crew stays on your site, learns your standards, and gets faster every week.</p></div>
          <div className="tile photo"><img src="/img/site.webp" alt="Workers on a building site in hi-vis vests and hard hats" width="720" height="1280" loading="lazy" /><div><h3>Attendance confirmed daily.</h3><p>Our supervisor records it. You approve it.</p></div></div>
          <div className="tile"><h3>We handle the paperwork.</h3><p>Contracts, pay and statutory deductions. You get one invoice.</p></div>
          <div className="tile"><h3>Checked before they start.</h3><p>Every worker is verified against their national ID.</p></div>
        </div>
      </section>

      <section id="faq" className="wrap narrow pad">
        <h2>Questions.</h2>
        {FAQ.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
      </section>

      <section className="band center pad">
        <div className="wrap narrow">
          <h2>Ready when you are.</h2>
          <p className="sub">Tell us what you need. We reply within one working day.</p>
          <p><Link className="btn" to="/request">Request workers</Link></p>
        </div>
      </section>
    </>
  )
}
