import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { Avatar } from './ui'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { CitizenPayload } from '../lib/types'

export type Workspace = 'citizen' | 'authority' | 'intelligence'

interface NavItem {
  label: string
  to: string
  icon: IconName
  match?: string
}

const TOP_NAV: { label: string; to: string; icon: IconName; workspace?: Workspace }[] = [
  { label: 'Home', to: '/', icon: 'home' },
  { label: 'Citizen Portal', to: '/citizen', icon: 'megaphone', workspace: 'citizen' },
  { label: 'Authority Dashboard', to: '/authority', icon: 'layout', workspace: 'authority' },
  { label: 'Civic Intelligence', to: '/intelligence', icon: 'map', workspace: 'intelligence' },
  { label: 'About CivicMind', to: '/about', icon: 'info' },
]

const WORKSPACES: Record<
  Workspace,
  {
    label: string
    eyebrow: string
    role: string
    blurb: string
    user: { name: string; initials: string; meta: string }
    items: NavItem[]
  }
> = {
  citizen: {
    label: 'Citizen Portal',
    eyebrow: 'Citizen workspace',
    role: 'Citizen',
    blurb: 'Report · track · confirm',
    user: { name: 'Aarav Naik', initials: 'AN', meta: 'Panaji · Ward 3' },
    items: [
      { label: 'Overview', to: '/citizen', icon: 'layout' },
      { label: 'Report an issue', to: '/citizen/report', icon: 'plus' },
      { label: 'My complaints', to: '/citizen/reports', icon: 'file' },
      { label: 'Nearby issues', to: '/citizen/nearby', icon: 'pin' },
      { label: 'Notifications', to: '/citizen/notifications', icon: 'bell' },
    ],
  },
  authority: {
    label: 'Authority Dashboard',
    eyebrow: 'Municipal workspace',
    role: 'Municipal authority',
    blurb: 'Triage · assign · resolve',
    user: { name: 'Rui Fernandes', initials: 'RF', meta: 'Ward officer · Panaji' },
    items: [
      { label: 'Overview', to: '/authority', icon: 'layout' },
      { label: 'Complaint queue', to: '/authority/incidents', icon: 'file', match: '/authority/incidents' },
      { label: 'Priority & SLA', to: '/authority/priority', icon: 'alert' },
      { label: 'Departments', to: '/authority/departments', icon: 'building' },
    ],
  },
  intelligence: {
    label: 'Civic Intelligence',
    eyebrow: 'Intelligence cell',
    role: 'Civic analyst',
    blurb: 'Patterns · hotspots · performance',
    user: { name: 'Ananya Kamat', initials: 'AK', meta: 'Insights cell · Goa' },
    items: [
      { label: 'City intelligence', to: '/intelligence', icon: 'map' },
      { label: 'Recurring incidents', to: '/intelligence?view=recurrence', icon: 'refresh', match: '/intelligence?view=recurrence' },
      { label: 'Tourism impact', to: '/intelligence?view=tourism', icon: 'waves', match: '/intelligence?view=tourism' },
      { label: 'Resolution performance', to: '/intelligence?view=performance', icon: 'activity', match: '/intelligence?view=performance' },
    ],
  },
}

function navItemActive(item: NavItem, pathname: string, search: string) {
  if (item.match?.includes('?')) return item.match === `${pathname}${search}`
  if (item.match) return pathname.startsWith(item.match)
  if (item.to === '/intelligence') return pathname === '/intelligence' && !search
  return pathname === item.to
}

export function AppShell({ workspace, children }: { workspace: Workspace; children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const meta = WORKSPACES[workspace]
  const { user, logout } = useAuth()
  const role = user?.role
  const { data: citizenData, reload: reloadCitizen } = useApi<CitizenPayload>(role === 'citizen' ? '/api/citizen' : null)
  const identity = user
    ? {
        name: user.name,
        initials: user.initials,
        meta:
          role === 'admin'
            ? 'Municipal authority · Goa'
            : role === 'guest'
              ? 'Guest · read-only access'
              : `${user.city ?? 'Goa'} · Citizen`,
      }
    : meta.user
  const roleLabel = role === 'admin' ? 'Municipal authority' : role === 'guest' ? 'Guest · read-only' : 'Citizen'
  const visibleTop = TOP_NAV.filter((item) => {
    if (!item.workspace) return true
    if (item.workspace === 'citizen') return role === 'citizen'
    if (item.workspace === 'authority') return role === 'admin'
    return true
  })

  async function signOut() {
    await logout()
    navigate('/welcome', { replace: true })
  }

  useEffect(() => {
    setNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname, location.search])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', navOpen)
    return () => document.body.classList.remove('no-scroll')
  }, [navOpen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const refresh = () => reloadCitizen()
    window.addEventListener('civicmind:data-changed', refresh)
    return () => window.removeEventListener('civicmind:data-changed', refresh)
  }, [reloadCitizen])

  const activeSub = meta.items.find((item) => navItemActive(item, location.pathname, location.search))
  const unread = citizenData?.unreadNotifications ?? 0

  return (
    <div className={`app${navOpen ? ' is-nav-open' : ''}`}>
      <aside className="sidebar" aria-label="Application sidebar">
        <div className="sidebar__brand">
          <Link to="/" className="brand" aria-label="CivicMind home">
            <span className="brand__mark">
              <Icon name="compass" />
            </span>
            <span className="brand__text">
              <span className="brand__name">CivicMind</span>
              <span className="brand__tag">From complaints to action</span>
            </span>
          </Link>
          <button className="icon-btn sidebar__close" onClick={() => setNavOpen(false)} aria-label="Close navigation">
            <Icon name="close" />
          </button>
        </div>

        <div className="sidebar__workspace">
          <div className="workspace-row">
            <span className="workspace-dot">
              <Icon name="pin" />
            </span>
            <div>
              <strong>Goa pilot</strong>
              <span>Panaji · Calangute · Margao</span>
            </div>
          </div>
          <div className="workspace-meta">
            <span className="badge badge--dark badge--plain">Simulated data</span>
            <span className="badge badge--dark badge--plain">Demo v0.1</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Primary navigation">
          <div className="sidebar__label">Workspaces</div>
          {visibleTop.map((item) => {
            const isActive = item.workspace ? item.workspace === workspace : false
            return (
              <Link key={item.to} to={item.to} className={`nav-item${isActive ? ' is-active' : ''}`}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.workspace === 'citizen' && unread > 0 ? <span className="nav-item__count">{unread}</span> : null}
              </Link>
            )
          })}

          <div className="sidebar__label">{meta.eyebrow}</div>
          <div className="nav-group">
            {meta.items.map((item) => {
              const active = navItemActive(item, location.pathname, location.search)
              return (
                <Link key={item.to} to={item.to} className={`nav-item${active ? ' is-active' : ''}`}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.label === 'Notifications' && unread > 0 ? <span className="nav-item__count">{unread}</span> : null}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="sidebar__footer">
          <div className="demo-note">
            <Icon name="alertCircle" />
            <div>
              <strong style={{ display: 'block', color: 'rgba(243,239,227,0.82)', fontWeight: 550 }}>Illustrative dataset</strong>
              Goa pilot figures are simulated for product demonstration. Not official government data.
            </div>
          </div>
          <div className="sidebar-user">
            <Avatar initials={identity.initials} dark />
            <div className="sidebar-user__main">
              <strong>{identity.name}</strong>
              <span>{identity.meta}</span>
            </div>
          </div>
          <button type="button" className="sidebar-signout" onClick={() => void signOut()}>
            <Icon name="arrowRight" size={13} /> Sign out
          </button>
        </div>
      </aside>

      <div className="app__backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="app-main">
        <header className="topbar">
          <button className="icon-btn topbar__menu" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <div className="topbar__crumbs">
            <Link to="/">{meta.label}</Link>
            <Icon name="chevronRight" />
            <strong>{activeSub?.label ?? meta.label}</strong>
            <span className="topbar__role">
              <Icon name="shield" size={11} />
              {roleLabel}
            </span>
          </div>

          <div className="topbar__right">
            {role === 'admin' ? (
            <form
              className="topbar__search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                if (!query.trim()) return
                navigate(`/authority/incidents?q=${encodeURIComponent(query.trim())}`)
                setQuery('')
              }}
            >
              <div className="search-input">
                <Icon name="search" />
                <input
                  className="input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search complaints, wards, refs"
                  aria-label="Search complaints"
                />
              </div>
            </form>
            ) : null}

            {role === 'citizen' ? (
              <Link to="/citizen/notifications" className="icon-btn topbar__bell" aria-label={`Notifications (${unread} unread)`}>
                <Icon name="bell" />
                {unread > 0 ? <span className="pill-count">{unread}</span> : null}
              </Link>
            ) : null}

            <div className="topbar__user">
              <Avatar initials={identity.initials} small />
              <div className="identity">
                <strong>{identity.name}</strong>
                <span>{identity.meta}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
