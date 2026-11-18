import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

export default function Layout() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) { document.getElementById(hash.slice(1))?.scrollIntoView() } else { window.scrollTo(0, 0) }
  }, [pathname, hash])
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav">
        <div className="wrap navin">
          <Link to="/" className="logo">Skill Sync</Link>
          <nav className="links" aria-label="Main">
            <Link to="/#trades">Trades</Link>
            <Link to="/#how">How it works</Link>
            <Link to="/#faq">FAQ</Link>
            <NavLink to="/join">For workers</NavLink>
          </nav>
          <Link className="btn sm" to="/request">Request workers</Link>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="foot">
        <div className="wrap footin">
          <div><b>Skill Sync</b><p>Construction staffing for Nairobi sites.</p></div>
          <div><b>Contractors</b><p><Link to="/request">Request workers</Link></p></div>
          <div><b>Workers</b><p><Link to="/join">Apply to work with us</Link></p></div>
          <div><b>Staff</b><p><Link to="/admin">Admin demo</Link></p></div>
        </div>
        <p className="wrap small">School project demo. Forms save in your browser only. © {new Date().getFullYear()} Skill Sync</p>
      </footer>
    </>
  )
}
