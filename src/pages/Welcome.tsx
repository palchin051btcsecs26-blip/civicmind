import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Notice } from '../components/ui'
import { AuthLoading, roleHome, useAuth } from '../lib/auth'
import { CITIES } from '../lib/ui'

type Entry = 'citizen' | 'admin'
type Mode = 'login' | 'signup'

export function Welcome() {
  const { user, loading, login, signup, continueAsGuest } = useAuth()
  const navigate = useNavigate()

  const [entry, setEntry] = useState<Entry>('citizen')
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState<string>('Panaji')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'form' | 'guest' | null>(null)

  if (loading) return <AuthLoading label="Opening CivicMind…" />
  if (user) return <Navigate to={roleHome(user.role)} replace />

  function chooseEntry(next: Entry) {
    setEntry(next)
    setError(null)
    if (next === 'admin') setMode('login')
  }

  function fillDemo(kind: Entry) {
    setEntry(kind)
    setMode('login')
    setError(null)
    if (kind === 'admin') {
      setEmail('admin@civicmind.demo')
      setPassword('admin1234')
    } else {
      setEmail('aarav@civicmind.demo')
      setPassword('citizen1234')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy('form')
    try {
      if (entry === 'citizen' && mode === 'signup') {
        if (password.length < 8) throw new Error('Use a password of at least 8 characters.')
        const account = await signup({ name, email, password, city, phone })
        navigate(roleHome(account.role), { replace: true })
      } else {
        const account = await login(email, password, entry)
        navigate(roleHome(account.role), { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function handleGuest() {
    setError(null)
    setBusy('guest')
    try {
      const account = await continueAsGuest()
      navigate(roleHome(account.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest access is unavailable right now.')
      setBusy(null)
    }
  }

  return (
    <div className="welcome">
      <aside className="welcome__aside">
        <Link to="/welcome" className="welcome__brand" aria-label="CivicMind welcome">
          <span className="brand__mark">
            <Icon name="compass" />
          </span>
          <span className="brand__text">
            <span className="brand__name">CivicMind</span>
            <span className="brand__tag">From complaints to action</span>
          </span>
        </Link>

        <div className="welcome__hero">
          <span className="eyebrow">Goa pilot · Panaji · Calangute · Margao</span>
          <h1>
            Every complaint.
            <br />
            <em>One clear next action.</em>
          </h1>
          <p className="welcome__lead">
            A civic operating layer that reads what citizens report, finds the pattern behind it and routes it to the
            people who can fix it.
          </p>

          <div className="welcome__roles">
            <div className="welcome__role">
              <span className="welcome__role-icon">
                <Icon name="megaphone" />
              </span>
              <div>
                <strong>Citizen</strong>
                <p>Report an issue with photos and voice, then track every municipal response.</p>
              </div>
            </div>
            <div className="welcome__role">
              <span className="welcome__role-icon">
                <Icon name="building" />
              </span>
              <div>
                <strong>Municipal authority</strong>
                <p>Triage the queue, assign departments, record evidence and close the loop.</p>
              </div>
            </div>
            <div className="welcome__role">
              <span className="welcome__role-icon">
                <Icon name="eye" />
              </span>
              <div>
                <strong>Guest</strong>
                <p>Explore the public civic intelligence dashboard and live issue map, read-only.</p>
              </div>
            </div>
          </div>
        </div>

        <footer className="welcome__footer">
          <div className="welcome__cities">
            {CITIES.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p>
            <Icon name="alertCircle" size={13} /> Every citizen, complaint and resolution is simulated for this
            demonstration. Not official government data.
          </p>
        </footer>
      </aside>

      <main className="welcome__main">
        <div className="auth-card">
          <div className="auth-card__head">
            <span className="eyebrow">{entry === 'admin' ? 'Municipal workspace' : 'Citizen workspace'}</span>
            <h2>
              {entry === 'admin'
                ? 'Authority sign in.'
                : mode === 'login'
                  ? 'Welcome back.'
                  : 'Create your civic account.'}
            </h2>
            <p>
              {entry === 'admin'
                ? 'Restricted access for municipal officers and department leads.'
                : mode === 'login'
                  ? 'Sign in to report an issue or follow your complaints.'
                  : 'File complaints, attach evidence and track the response in one place.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Choose an entry point">
            <button
              type="button"
              role="tab"
              aria-selected={entry === 'citizen'}
              className={`auth-tab${entry === 'citizen' ? ' is-active' : ''}`}
              onClick={() => chooseEntry('citizen')}
            >
              <Icon name="megaphone" size={15} /> Citizen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={entry === 'admin'}
              className={`auth-tab${entry === 'admin' ? ' is-active' : ''}`}
              onClick={() => chooseEntry('admin')}
            >
              <Icon name="shield" size={15} /> Authority
            </button>
          </div>

          {entry === 'citizen' ? (
            <div className="auth-mode" role="group" aria-label="Citizen access mode">
              <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
                Log in
              </button>
              <button type="button" className={mode === 'signup' ? 'is-active' : ''} onClick={() => setMode('signup')}>
                Sign up
              </button>
            </div>
          ) : (
            <p className="auth-admin-note">
              <Icon name="shield" size={14} /> Public admin registration is disabled. Accounts are provisioned by the
              municipality.
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {entry === 'citizen' && mode === 'signup' ? (
              <>
                <label className="field">
                  <span className="field-label">Full name</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                    required
                  />
                </label>
                <div className="auth-form__row">
                  <label className="field">
                    <span className="field-label">City</span>
                    <select className="select" value={city} onChange={(event) => setCity(event.target.value)}>
                      {CITIES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">
                      Phone <span>optional</span>
                    </span>
                    <input
                      className="input"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      autoComplete="tel"
                      placeholder="+91"
                    />
                  </label>
                </div>
              </>
            ) : null}

            <label className="field">
              <span className="field-label">Email address</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder={entry === 'admin' ? 'officer@municipality.goa' : 'you@example.in'}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                minLength={8}
                required
              />
            </label>

            {error ? (
              <Notice tone="error" icon="alertCircle">
                {error}
              </Notice>
            ) : null}

            <button className="btn btn--accent btn--block auth-submit" type="submit" disabled={busy !== null}>
              {busy === 'form' ? (
                <span className="spinner spinner--sm" />
              ) : (
                <Icon name={entry === 'admin' ? 'shield' : 'arrowRight'} />
              )}
              {entry === 'admin'
                ? 'Enter authority workspace'
                : mode === 'login'
                  ? 'Log in to CivicMind'
                  : 'Create citizen account'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button className="btn btn--ghost btn--block" type="button" onClick={handleGuest} disabled={busy !== null}>
            {busy === 'guest' ? <span className="spinner spinner--sm" /> : <Icon name="eye" />}
            Continue as guest
          </button>
          <p className="auth-guest-note">Public read-only dashboard and map. No citizen or authority data.</p>

          <div className="auth-demo">
            <div className="auth-demo__head">
              <span className="eyebrow">Demo accounts</span>
              <span className="badge badge--neutral badge--plain">Simulated</span>
            </div>
            <div className="auth-demo__buttons">
              <button type="button" onClick={() => fillDemo('citizen')}>
                <Icon name="megaphone" size={14} />
                <span>
                  <strong>Citizen</strong>
                  <em>aarav@civicmind.demo · citizen1234</em>
                </span>
              </button>
              <button type="button" onClick={() => fillDemo('admin')}>
                <Icon name="shield" size={14} />
                <span>
                  <strong>Authority</strong>
                  <em>admin@civicmind.demo · admin1234</em>
                </span>
              </button>
            </div>
          </div>
        </div>

        <p className="welcome__legal">
          CivicMind demo · <Link to="/about">About the platform</Link> · Data is illustrative and no real municipal
          records are stored.
        </p>
      </main>
    </div>
  )
}
