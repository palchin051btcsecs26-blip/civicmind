import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { Button, LinkButton } from './ui'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Citizen Portal', to: '/citizen' },
  { label: 'Authority Dashboard', to: '/authority' },
  { label: 'Civic Intelligence', to: '/intelligence' },
  { label: 'About CivicMind', to: '/about' },
]

export function SiteHeader({ theme = 'dark' }: { theme?: 'dark' | 'light' }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to))

  return (
    <header className={`site-header site-header--${theme}`}>
      <div className="site-header__inner">
        <Link to="/" className="brand" aria-label="CivicMind home">
          <span className="brand__mark">
            <Icon name="compass" />
          </span>
          <span className="brand__text">
            <span className="brand__name">CivicMind</span>
            <span className="brand__tag">From complaints to action</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={isActive(item.to) ? 'is-active' : undefined} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <LinkButton to="/citizen" variant={theme === 'dark' ? 'ghost-light' : 'ghost'} size="sm">
            Report an issue
          </LinkButton>
          <LinkButton to="/authority" variant="accent" size="sm" iconRight="arrowRight">
            Open dashboard
          </LinkButton>
          <button
            className="header-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation menu"
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      <div className={`mobile-nav${open ? ' is-open' : ''}`}>
        {NAV.map((item) => (
          <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Button variant="accent" block iconRight="arrowRight" onClick={() => (window.location.href = '/authority')}>
          Open authority dashboard
        </Button>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link to="/" className="brand" aria-label="CivicMind home" style={{ color: 'var(--on-dark)' }}>
              <span className="brand__mark">
                <Icon name="compass" />
              </span>
              <span className="brand__text">
                <span className="brand__name">CivicMind</span>
                <span className="brand__tag">From complaints to action</span>
              </span>
            </Link>
            <p>
              A civic intelligence and grievance resolution platform for Indian municipalities. Built for the Goa pilot —
              Panaji, Calangute and Margao — with an architecture designed to scale to other cities.
            </p>
          </div>

          <div>
            <h4>Product</h4>
            <div className="site-footer__links">
              <Link to="/citizen">Citizen portal</Link>
              <Link to="/authority">Authority dashboard</Link>
              <Link to="/intelligence">Civic intelligence</Link>
              <Link to="/citizen/report">Report an issue</Link>
            </div>
          </div>

          <div>
            <h4>Pilot region</h4>
            <div className="site-footer__links">
              <Link to="/intelligence">Panaji</Link>
              <Link to="/intelligence">Calangute</Link>
              <Link to="/intelligence">Margao</Link>
              <Link to="/about">Scalability approach</Link>
            </div>
          </div>

          <div>
            <h4>Platform</h4>
            <div className="site-footer__links">
              <Link to="/about">About CivicMind</Link>
              <Link to="/about#architecture">Architecture</Link>
              <Link to="/about#roadmap">Roadmap</Link>
              <Link to="/about#data">Data disclosure</Link>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© 2026 CivicMind · Independent hackathon demonstration project, not affiliated with any government body.</span>
          <span>Simulated data · Goa pilot</span>
        </div>
      </div>
    </footer>
  )
}
