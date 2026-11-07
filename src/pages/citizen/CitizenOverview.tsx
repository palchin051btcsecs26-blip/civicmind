import { Link } from 'react-router-dom'
import { AgentMapWorkspace } from '../../components/AgentMapWorkspace'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { Badge, Card, CardBody, CardHead, LinkButton, PageHeader, SeverityBadge, StatCard, StatusBadge } from '../../components/ui'
import { useApi } from '../../lib/api'
import type { CitizenPayload, Incident } from '../../lib/types'
import { daysOpen, formatDate, timeAgo } from '../../lib/ui'

export function CitizenOverview() {
  const { data } = useApi<CitizenPayload>('/api/citizen')
  const { data: nearby } = useApi<{ incidents: Incident[] }>('/api/incidents?city=Panaji&limit=6')

  const reports = data?.reports ?? []
  const open = reports.filter((report) => report.status !== 'resolved')
  const resolved = reports.filter((report) => report.status === 'resolved')
  const unread = data?.notifications.filter((notification) => !notification.read) ?? []
  const nearbyIssues = (nearby?.incidents ?? []).filter((issue) => issue.status !== 'resolved').slice(0, 4)

  return (
    <AppShell workspace="citizen">
      <PageHeader
        eyebrow="Citizen workspace"
        title={`Good morning, ${data?.citizen.name.split(' ')[0] ?? 'citizen'}.`}
        sub="Your civic record for Panaji, with the issues you have reported and what the municipality is doing about them."
        actions={
          <>
            <LinkButton to="/citizen/reports" variant="ghost" icon="file">
              Track complaints
            </LinkButton>
            <LinkButton to="/citizen/report" variant="accent" icon="plus">
              Report an issue
            </LinkButton>
          </>
        }
      />

      <AgentMapWorkspace role="citizen" />

      <div className="stat-grid mt-16">
        <StatCard label="My complaints" value={data?.stats.total ?? '—'} foot="Across Panaji wards" icon="file" />
        <StatCard label="Open now" value={data?.stats.open ?? '—'} foot="With municipal teams" icon="clock" />
        <StatCard label="Resolved" value={data?.stats.resolved ?? '—'} foot="Evidence uploaded on closure" icon="checkCircle" />
        <StatCard
          label="Unread updates"
          value={data?.unreadNotifications ?? '—'}
          foot="Status changes and resolutions"
          icon="bell"
          alert={Boolean(data?.unreadNotifications)}
        />
      </div>

      <div className="grid grid--sidebar mt-16">
        <div className="stack gap-16">
          <Card className="table-card">
            <CardHead
              title="Your complaints in motion"
              sub="Latest status from the municipal control room."
              action={
                <LinkButton to="/citizen/reports" variant="quiet" size="sm" iconRight="arrowRight">
                  View all
                </LinkButton>
              }
            />
            <div className="card-body" style={{ paddingTop: 6 }}>
              {open.length ? (
                open.slice(0, 4).map((report) => (
                  <Link
                    to={`/citizen/reports?ref=${report.ref}`}
                    className="queue-item"
                    key={report.id}
                    style={{ textDecoration: 'none' }}
                  >
                    <span className="queue-item__score" style={{ background: 'var(--teal-50)', color: 'var(--teal-700)' }}>
                      <Icon name="file" size={15} />
                    </span>
                    <div className="queue-item__main">
                      <strong>{report.title}</strong>
                      <span>
                        {report.ref} · {report.location_name} · {timeAgo(report.updated_at)}
                      </span>
                    </div>
                    <div className="queue-item__side">
                      <StatusBadge status={report.status} />
                      <Icon name="chevronRight" />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="muted" style={{ fontSize: 13, padding: '10px 0' }}>
                  No open complaints. Everything you reported is closed.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHead
              title="Nearby civic issues in Panaji"
              sub="Reports from your ward and the surrounding neighbourhoods."
              action={<Badge tone="neutral">Simulated</Badge>}
            />
            <CardBody>
              <div className="stack">
                {nearbyIssues.length ? (
                  nearbyIssues.map((issue) => (
                    <div className="list-row" key={issue.id}>
                      <span
                        className="notif-icon"
                        style={{
                          background:
                            issue.severity === 'critical' ? 'var(--coral-100)' : issue.severity === 'high' ? 'var(--amber-100)' : 'var(--ivory-200)',
                          color:
                            issue.severity === 'critical' ? 'var(--coral-700)' : issue.severity === 'high' ? 'var(--amber-700)' : 'var(--slate-600)',
                        }}
                      >
                        <Icon name="pin" />
                      </span>
                      <div className="list-row__main">
                        <strong>{issue.title}</strong>
                        <span>
                          {issue.location_name} · {issue.category} · {daysOpen(issue.reported_at)}d open
                        </span>
                      </div>
                      <SeverityBadge severity={issue.severity} />
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ fontSize: 13 }}>
                    No nearby open issues in the demo dataset.
                  </p>
                )}
              </div>
              <LinkButton to="/citizen/nearby" variant="ghost" size="sm" block iconRight="arrowRight" className="mt-16">
                Open nearby issue map
              </LinkButton>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title="Recently resolved"
              sub="Closures need a written summary and photographic evidence."
              action={
                <LinkButton to="/citizen/reports" variant="quiet" size="sm">
                  Review
                </LinkButton>
              }
            />
            <CardBody>
              {resolved.length ? (
                resolved.slice(0, 2).map((report) => (
                  <div className="list-row" key={report.id}>
                    <span className="notif-icon notif-icon--resolved">
                      <Icon name="checkCircle" />
                    </span>
                    <div className="list-row__main">
                      <strong>{report.title}</strong>
                      <span>
                        {report.ref} · closed {report.resolved_at ? formatDate(report.resolved_at) : 'recently'}
                      </span>
                    </div>
                    <Badge tone="resolved">Resolved</Badge>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No resolved complaints yet in your record.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="stack gap-16">
          <Card dark>
            <CardBody>
              <span className="eyebrow" style={{ color: 'var(--teal-400)' }}>
                How tracking works
              </span>
              <h3 style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 25, lineHeight: 1.1 }}>
                One reference. A visible trail.
              </h3>
              <div className="stack gap-14" style={{ marginTop: 18 }}>
                {[
                  { icon: 'send' as const, title: 'Submitted', copy: 'You receive a reference number immediately.' },
                  { icon: 'building' as const, title: 'Assigned', copy: 'A department and officer are made responsible.' },
                  { icon: 'camera' as const, title: 'Evidenced', copy: 'Closure requires a summary and photo evidence.' },
                ].map((step) => (
                  <div className="row-wrap" key={step.title} style={{ alignItems: 'flex-start' }}>
                    <span
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        background: 'rgba(87,160,151,0.14)',
                        color: 'var(--teal-400)',
                        flex: 'none',
                      }}
                    >
                      <Icon name={step.icon} size={15} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 12.5, display: 'block' }}>{step.title}</strong>
                      <span style={{ fontSize: 11.5, color: 'rgba(243,239,227,0.5)', lineHeight: 1.5 }}>{step.copy}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20 }}>
                <LinkButton to="/citizen/report" variant="accent" size="sm" block iconRight="arrowRight">
                  Report a new issue
                </LinkButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title="Notifications"
              sub={`${unread.length} unread update${unread.length === 1 ? '' : 's'}`}
              action={
                <LinkButton to="/citizen/notifications" variant="quiet" size="sm">
                  All
                </LinkButton>
              }
            />
            <CardBody style={{ paddingTop: 4 }}>
              {data?.notifications.length ? (
                data.notifications.slice(0, 3).map((notification) => (
                  <div className="notif-item" key={notification.id} style={{ padding: '11px 0' }}>
                    <span className={`notif-icon${notification.type === 'resolved' ? ' notif-icon--resolved' : ' notif-icon--assigned'}`}>
                      <Icon name={notification.type === 'resolved' ? 'checkCircle' : 'bell'} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong>{notification.title}</strong>
                      <p style={{ fontSize: 11.5 }}>{notification.body}</p>
                      <time>{timeAgo(notification.created_at)}</time>
                    </div>
                    {!notification.read ? <span className="notif-dot" /> : null}
                  </div>
                ))
              ) : (
                <p className="muted" style={{ fontSize: 13 }}>
                  No notifications yet.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="row-between">
                <span className="eyebrow">Your ward</span>
                <Icon name="pin" size={15} />
              </div>
              <h3 style={{ marginTop: 8, fontSize: 15, fontWeight: 600 }}>{data?.citizen.ward ?? 'Panaji'}</h3>
              <p style={{ marginTop: 4, fontSize: 12, color: 'var(--slate-500)', lineHeight: 1.6 }}>
                {data?.citizen.city ?? 'Panaji'} · demo citizen profile
              </p>
              <hr className="divider" style={{ margin: '14px 0' }} />
              <div className="kv">
                <dt>Contact</dt>
                <dd>{data?.citizen.phone ?? '—'}</dd>
                <dt>Email</dt>
                <dd style={{ fontSize: 11 }}>{data?.citizen.email ?? '—'}</dd>
                <dt>Workspace</dt>
                <dd>Citizen</dd>
              </div>
              <div className="notice notice--info" style={{ marginTop: 14 }}>
                <Icon name="alertCircle" />
                <div>Signed in with your CivicMind citizen account. Contact details stay private to you.</div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
