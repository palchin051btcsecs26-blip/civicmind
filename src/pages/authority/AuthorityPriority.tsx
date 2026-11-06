import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import {
  Badge,
  Card,
  CardBody,
  CardHead,
  ErrorState,
  Loading,
  PageHeader,
  SeverityBadge,
  StatCard,
  StatusBadge,
} from '../../components/ui'
import { useApi } from '../../lib/api'
import type { Incident } from '../../lib/types'
import { daysOpen, formatDate, timeAgo } from '../../lib/ui'

function slaState(incident: Incident) {
  if (incident.status === 'resolved') return { label: 'Closed', tone: 'resolved' as const }
  if (!incident.sla_due_at) return { label: 'No target', tone: 'low' as const }
  const hoursLeft = (new Date(incident.sla_due_at).getTime() - Date.now()) / 3_600_000
  if (hoursLeft < 0) {
    const daysLate = Math.ceil(Math.abs(hoursLeft) / 24)
    return { label: `${daysLate}d over SLA`, tone: 'critical' as const }
  }
  if (hoursLeft < 72) return { label: `${Math.ceil(hoursLeft)}h left`, tone: 'high' as const }
  return { label: `${Math.ceil(hoursLeft / 24)}d left`, tone: 'low' as const }
}

export function AuthorityPriority() {
  const { data, loading, error, reload } = useApi<{ incidents: Incident[] }>('/api/incidents?limit=200')

  const incidents = data?.incidents ?? []
  const open = incidents.filter((incident) => incident.status !== 'resolved')
  const breached = open.filter((incident) => incident.sla_due_at && new Date(incident.sla_due_at) < new Date())
  const critical = open.filter((incident) => incident.severity === 'critical')
  const recurring = open.filter((incident) => incident.recurrence_group)
  const ranked = open.slice().sort((a, b) => b.priority_score - a.priority_score)

  return (
    <AppShell workspace="authority">
      <PageHeader
        eyebrow="Priority & SLA"
        title="The work that cannot wait."
        sub="Critical incidents, recurring failures and cases that have passed their department response target. Ranked for the morning control-room stand-up."
        actions={
          <Link to="/authority/incidents" className="btn btn--ghost btn--sm">
            <Icon name="file" size={14} />
            Full register
          </Link>
        }
      />

      {loading ? <Loading label="Ranking open incidents…" /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <div className="stat-grid">
            <StatCard label="Open incidents" value={open.length} foot="All severities" icon="file" />
            <StatCard label="Critical" value={critical.length} foot="Requires immediate review" icon="alert" alert={critical.length > 0} />
            <StatCard label="SLA breached" value={breached.length} foot="Past department target" icon="clock" alert={breached.length > 0} />
            <StatCard label="Recurring open" value={recurring.length} foot="Linked to repeat groups" icon="refresh" />
          </div>

          {critical.length ? (
            <div className="alert-banner mt-16">
              <div className="alert-banner__main">
                <span className="alert-banner__icon">
                  <Icon name="alert" />
                </span>
                <div>
                  <strong>
                    {critical.length} critical incident{critical.length === 1 ? '' : 's'} needing assignment
                  </strong>
                  <span>
                    {critical.filter((incident) => !incident.department_short).length} unassigned · open in{' '}
                    {[...new Set(critical.map((incident) => incident.city))].join(', ')}
                  </span>
                </div>
              </div>
              <Badge tone="critical">Escalated</Badge>
            </div>
          ) : null}

          <div className="grid grid--sidebar mt-16">
            <Card className="card--flush">
              <CardHead
                title="Ranked open queue"
                sub="Priority score combines severity, affected population and recurrence."
                action={<Badge tone="neutral">{ranked.length} open</Badge>}
              />
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Complaint</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>SLA</th>
                      <th>Owner</th>
                      <th aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.slice(0, 12).map((incident, index) => {
                      const sla = slaState(incident)
                      return (
                        <tr
                          key={incident.id}
                          className="is-clickable"
                          onClick={() => (window.location.href = `/authority/incidents/${incident.ref}`)}
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') window.location.href = `/authority/incidents/${incident.ref}`
                          }}
                        >
                          <td className="cell-ref">{String(index + 1).padStart(2, '0')}</td>
                          <td>
                            <div className="cell-title">
                              <strong>{incident.title}</strong>
                              <span>
                                {incident.ref} · {incident.location_name}, {incident.city} · {timeAgo(incident.reported_at)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <SeverityBadge severity={incident.severity} />
                          </td>
                          <td>
                            <StatusBadge status={incident.status} />
                          </td>
                          <td>
                            <Badge tone={sla.tone}>{sla.label}</Badge>
                          </td>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{incident.department_short ?? 'Unassigned'}</td>
                          <td>
                            <Icon name="chevronRight" size={14} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="stack gap-16">
              <Card>
                <CardHead title="SLA risk" sub="Open cases closest to breaching their target." />
                <CardBody style={{ paddingTop: 6 }}>
                  {breached.length ? (
                    breached.slice(0, 5).map((incident) => (
                      <Link
                        key={incident.id}
                        to={`/authority/incidents/${incident.ref}`}
                        className="queue-item"
                        style={{ textDecoration: 'none' }}
                      >
                        <span className="queue-item__score is-critical">
                          <Icon name="clock" size={14} />
                        </span>
                        <div className="queue-item__main">
                          <strong>{incident.title}</strong>
                          <span>
                            {incident.ref} · {incident.city} · due {formatDate(incident.sla_due_at)}
                          </span>
                        </div>
                        <Icon name="chevronRight" />
                      </Link>
                    ))
                  ) : (
                    <p className="muted" style={{ fontSize: 12.5 }}>
                      No open cases are past their SLA target.
                    </p>
                  )}
                  <div className="notice notice--info" style={{ marginTop: 14 }}>
                    <Icon name="clock" />
                    <div>SLA clocks are derived from each department&rsquo;s configured target days in the demo dataset.</div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHead title="Recurring failures" sub="Open incidents with a repeat history at the same location." />
                <CardBody style={{ paddingTop: 6 }}>
                  {recurring.length ? (
                    recurring.slice(0, 4).map((incident) => (
                      <Link
                        key={incident.id}
                        to={`/authority/incidents/${incident.ref}`}
                        className="queue-item"
                        style={{ textDecoration: 'none' }}
                      >
                        <span className="queue-item__score">
                          <Icon name="refresh" size={14} />
                        </span>
                        <div className="queue-item__main">
                          <strong>{incident.recurrence_group}</strong>
                          <span>
                            {incident.ref} · {incident.location_name} · {daysOpen(incident.reported_at)}d open
                          </span>
                        </div>
                        <SeverityBadge severity={incident.severity} />
                      </Link>
                    ))
                  ) : (
                    <p className="muted" style={{ fontSize: 12.5 }}>
                      No recurring groups currently have open incidents.
                    </p>
                  )}
                </CardBody>
              </Card>

              <Card dark>
                <CardBody>
                  <span className="eyebrow" style={{ color: 'var(--teal-400)' }}>
                    Triage discipline
                  </span>
                  <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.65, color: 'rgba(243,239,227,0.66)' }}>
                    Scores are deterministic and explainable: severity base, reach from affected population, and a recurrence
                    uplift. AI-assisted triage is a later phase.
                  </p>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
