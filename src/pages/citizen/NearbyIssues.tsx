import { useMemo, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { GoaMap } from '../../components/GoaMap'
import { Icon } from '../../components/Icon'
import {
  Badge,
  Card,
  CardBody,
  CardHead,
  ErrorState,
  LinkButton,
  Loading,
  PageHeader,
  SeverityBadge,
  StatusBadge,
} from '../../components/ui'
import { useApi } from '../../lib/api'
import type { Analytics, Incident } from '../../lib/types'
import { CITIES, timeAgo } from '../../lib/ui'

export function NearbyIssues() {
  const [city, setCity] = useState<string>('Panaji')
  const { data: analytics, loading: analyticsLoading, error: analyticsError, reload } = useApi<Analytics>('/api/analytics')
  const { data: incidents, loading: incidentsLoading, error: incidentsError, reload: reloadIncidents } = useApi<{
    incidents: Incident[]
  }>(`/api/incidents?city=${encodeURIComponent(city)}`)

  const cityInfo = analytics?.cities.find((item) => item.name === city)
  const nearby = useMemo(
    () => (incidents?.incidents ?? []).filter((incident) => incident.status !== 'resolved').slice(0, 8),
    [incidents],
  )
  const hotspots = useMemo(
    () => (analytics?.heat ?? []).filter((location) => location.city === city).sort((a, b) => b.open - a.open).slice(0, 4),
    [analytics, city],
  )

  return (
    <AppShell workspace="citizen">
      <PageHeader
        eyebrow="Around you"
        title="Nearby civic issues."
        sub="See what other residents have reported in your city and which issues are still open. Areas with repeated complaints are highlighted on the map."
        actions={
          <LinkButton to="/citizen/report" variant="accent" icon="plus">
            Report an issue
          </LinkButton>
        }
      />

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {CITIES.map((item) => (
          <button key={item} type="button" className={`tag${city === item ? ' tag--active' : ''}`} onClick={() => setCity(item)}>
            <Icon name="pin" size={13} />
            {item}
          </button>
        ))}
        <Badge tone="neutral">Simulated reports</Badge>
      </div>

      <div className="grid grid--sidebar-wide">
        <Card className="card--flush">
          <div className="card-head card-head--bordered">
            <div>
              <h3 className="card-title">{city} civic map</h3>
              <p className="card-sub">Heat intensity reflects complaint volume and severity in each neighbourhood.</p>
            </div>
          </div>
          <div style={{ padding: 12 }}>
            {analyticsLoading ? <Loading label="Loading the pilot map…" /> : null}
            {analyticsError ? <ErrorState message={analyticsError} onRetry={reload} /> : null}
            {analytics ? (
              <GoaMap
                locations={analytics.heat}
                cities={analytics.cities}
                selectedCity={city}
                onSelectCity={(next) => {
                  if (next) setCity(next)
                }}
                showTourismCorridor={city === 'Calangute'}
              />
            ) : null}
          </div>
        </Card>

        <div className="stack gap-16">
          <Card>
            <CardHead title={`${city} at a glance`} sub="Live totals from the demonstration dataset." />
            <CardBody>
              <div className="stat-inline">
                <div>
                  <span>Total</span>
                  <strong>{cityInfo?.total ?? '—'}</strong>
                </div>
                <div>
                  <span>Open</span>
                  <strong>{cityInfo?.open ?? '—'}</strong>
                </div>
                <div>
                  <span>Critical</span>
                  <strong style={{ color: cityInfo?.critical ? 'var(--coral-700)' : undefined }}>{cityInfo?.critical ?? '—'}</strong>
                </div>
                <div>
                  <span>Resolved</span>
                  <strong>{cityInfo?.resolved ?? '—'}</strong>
                </div>
              </div>
              <hr className="divider" style={{ margin: '16px 0' }} />
              <span className="eyebrow">Neighbourhood hotspots</span>
              <div style={{ marginTop: 8 }}>
                {hotspots.length ? (
                  hotspots.map((spot) => (
                    <div className="heat-row" key={spot.id}>
                      <div className="heat-row__main">
                        <strong>{spot.name}</strong>
                        <span>
                          {spot.open} open · top: {spot.topCategory ?? 'mixed'}
                        </span>
                      </div>
                      <span className="badge badge--low">{spot.total}</span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ fontSize: 12.5 }}>
                    No hotspots recorded in this city.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <span className="eyebrow">A note on this map</span>
              <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--slate-500)', lineHeight: 1.65 }}>
                This is a schematic pilot map, not a cadastral or survey map. Locations are approximate neighbourhood
                centroids and all complaint markers are simulated for the demonstration.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Card className="mt-16">
        <CardHead
          title="Open issues nearby"
          sub="Reports from other residents in this city, ordered by priority."
          action={
            <span className="filter-count">
              {nearby.length} open · updated {incidents?.incidents.length ? timeAgo(incidents.incidents[0].updated_at) : '—'}
            </span>
          }
        />
        <CardBody style={{ paddingTop: 6 }}>
          {incidentsLoading ? <Loading label="Loading nearby issues…" /> : null}
          {incidentsError ? <ErrorState message={incidentsError} onRetry={reloadIncidents} /> : null}
          {!incidentsLoading && !incidentsError && !nearby.length ? (
            <p className="muted" style={{ fontSize: 13 }}>
              No open issues in this city within the demonstration dataset.
            </p>
          ) : null}
          <div className="grid grid--2" style={{ gap: 12 }}>
            {nearby.map((issue) => (
              <div
                key={issue.id}
                className="card"
                style={{ padding: 14, boxShadow: 'none', background: 'var(--ivory-50)' }}
              >
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <span className="cell-ref">{issue.ref}</span>
                  <SeverityBadge severity={issue.severity} />
                </div>
                <strong style={{ display: 'block', marginTop: 7, fontSize: 12.5, fontWeight: 550, lineHeight: 1.4 }}>
                  {issue.title}
                </strong>
                <div className="report-item__meta" style={{ marginTop: 7 }}>
                  <span>{issue.location_name}</span>
                  <i />
                  <span>{issue.category}</span>
                  <i />
                  <span>{timeAgo(issue.reported_at)}</span>
                </div>
                <div className="row-between" style={{ marginTop: 10 }}>
                  <StatusBadge status={issue.status} />
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--slate-400)' }}>
                    {issue.department_short ?? 'Triage'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </AppShell>
  )
}
