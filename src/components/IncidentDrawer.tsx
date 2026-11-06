import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { SeverityBadge, StatusBadge } from './ui'
import { useAuth } from '../lib/auth'
import type { Incident } from '../lib/types'
import { formatDate, timeAgo } from '../lib/ui'

interface DrawerProps {
  incident: Incident | null
  onClose: () => void
  onAnalyse: (incident: Incident) => void
}

export function IncidentDrawer({ incident, onClose, onAnalyse }: DrawerProps) {
  const { user } = useAuth()

  useEffect(() => {
    if (!incident) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [incident, onClose])

  if (!incident) return null

  return (
    <div className="incident-drawer-shell">
      <button type="button" className="incident-drawer__backdrop" aria-label="Close incident details" onClick={onClose} />
      <aside className="incident-drawer" role="dialog" aria-modal="true" aria-label={`Incident ${incident.ref}`}>
        <header className="incident-drawer__head">
          <div>
            <span className="cell-ref">{incident.ref}</span>
            <h2>{incident.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close incident details">
            <Icon name="close" />
          </button>
        </header>

        <div className="row-wrap" style={{ marginTop: 12 }}>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
          <span className="badge badge--neutral badge--plain">Priority {incident.priority_score}</span>
        </div>

        <p className="incident-drawer__desc">{incident.description}</p>

        <div className="incident-drawer__meta">
          <div>
            <span>Location</span>
            <strong>{incident.location_name ?? '—'}</strong>
          </div>
          <div>
            <span>City</span>
            <strong>{incident.city}</strong>
          </div>
          <div>
            <span>Department</span>
            <strong>{incident.department_short ?? 'Awaiting triage'}</strong>
          </div>
          <div>
            <span>Reported</span>
            <strong>{formatDate(incident.reported_at)}</strong>
          </div>
          <div>
            <span>Updated</span>
            <strong>{timeAgo(incident.updated_at)}</strong>
          </div>
          <div>
            <span>Category</span>
            <strong>{incident.category}</strong>
          </div>
        </div>

        {incident.photo_count ? (
          <div className="photo-strip" aria-label="Reported evidence">
            {Array.from({ length: Math.min(3, incident.photo_count) }).map((_, index) => (
              <div className="photo-tile" key={index} title="Simulated evidence thumbnail">
                <Icon name="camera" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="incident-drawer__actions">
          <button type="button" className="btn btn--accent btn--sm" onClick={() => onAnalyse(incident)}>
            <Icon name="sparkle" /> Analyse this incident with AI
          </button>
          {user?.role === 'admin' ? (
            <Link className="btn btn--ghost btn--sm" to={`/authority/incidents/${incident.ref}`} onClick={onClose}>
              Open full case file <Icon name="arrowRight" />
            </Link>
          ) : null}
        </div>

        {user?.role === 'guest' ? (
          <p className="incident-drawer__note">
            <Icon name="eye" size={13} /> Guest view: public incident details only. Reporter identity and authority
            assignment are restricted.
          </p>
        ) : null}
      </aside>
    </div>
  )
}
