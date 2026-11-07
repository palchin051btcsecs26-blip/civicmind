import { Link } from 'react-router-dom'
import { AgentMapWorkspace } from '../../components/AgentMapWorkspace'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { LineChart, StackedBar } from '../../components/charts'
import {
  Badge,
  Button,
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
import type { Analytics, Overview } from '../../lib/types'
import { formatDay, formatNumber, timeAgo } from '../../lib/ui'

export function AuthorityOverview() {
  const { data, loading, error, reload } = useApi<Overview>('/api/overview')
  const { data: analytics } = useApi<Analytics>('/api/analytics')

  const totals = data?.totals
  const labels = data?.trend.map((point) => point.date) ?? []
  const received = data?.trend.map((point) => point.received) ?? []
  const resolved = data?.trend.map((point) => point.resolved) ?? []
  const maxCity = Math.max(1, ...(data?.byCity.map((city) => city.total) ?? [1]))

  return (
    <AppShell workspace="authority">
      <PageHeader
        eyebrow="Municipal control room"
        title="Today’s civic workload."
        sub="Live intake, priority and department load across the Goa pilot. Figures are generated from the simulated demonstration dataset."
        actions={
          <>
            <Button variant="ghost" size="sm" icon="refresh" onClick={reload}>
              Refresh
            </Button>
            <Link to="/authority/incidents" className="btn btn--accent btn--sm">
              Open complaint queue
            </Link>
          </>
        }
      />

      <AgentMapWorkspace role="admin" />

      {loading ? <Loading label="Loading the municipal overview…" /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data && totals ? (
        <>
          {totals.critical > 0 ? (
            <div className="alert-banner" style={{ marginBottom: 16 }}>
              <div className="alert-banner__main">
                <span className="alert-banner__icon">
                  <Icon name="alert" />
                </span>
                <div>
                  <strong>
                    {totals.critical} critical incident{totals.critical === 1 ? '' : 's'} currently open
                  </strong>
                  <span>Prioritised for immediate departmental review across the three pilot cities.</span>
                </div>
              </div>
              <Link to="/authority/priority" className="btn btn--ghost btn--sm">
                Review priority queue
                <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          ) : null}

          <div className="stat-grid mt-16">
            <StatCard
              label="Open incidents"
              value={formatNumber(totals.open)}
              foot={`${formatNumber(totals.total)} total in the pilot`}
              icon="file"
            />
            <StatCard
              label="Critical alerts"
              value={totals.critical}
              foot="Open, severity critical"
              icon="alert"
              alert={totals.critical > 0}
            />
            <StatCard
              label="SLA breaches"
              value={totals.slaBreaches}
              foot="Open beyond department target"
              icon="clock"
              alert={totals.slaBreaches > 0}
            />
            <StatCard
              label="resolution rate"
              value={`${totals.resolutionRate}%`}
              foot={`${totals.avgResolutionDays}d average closure`}
              icon="checkCircle"
            />
            <StatCard label="People affected" value={formatNumber(totals.affectedPeople)} foot="Across all open and closed reports" icon="users" />
          </div>

          <div className="grid grid--sidebar mt-16">
            <div className="stack gap-16">
              <Card className="chart-card">
                <CardHead
                  title="Intake vs resolution"
                  sub="Complaints received and incidents resolved over the last three weeks."
                  action={<Badge tone="neutral">21-day window</Badge>}
                />
                <CardBody>
                  <LineChart
                    labels={labels}
                    series={[
                      { name: 'Received', color: '#2f7f75', data: received, area: true },
                      { name: 'Resolved', color: '#d29a34', data: resolved, area: false },
                    ]}
                    height={250}
                  />
                  <div className="row-between" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--slate-400)' }}>
                      Latest day · {labels.at(-1) ? formatDay(labels.at(-1)!) : '—'}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>
                      {received.at(-1) ?? 0} received · {resolved.at(-1) ?? 0} resolved
                    </span>
                  </div>
                </CardBody>
              </Card>

              <div className="grid grid--2">
                <Card>
                  <CardHead title="City load" sub="Total complaints by municipality." />
                  <CardBody>
                    <div className="city-bars">
                      {data.byCity.map((city) => {
                        const open = city.open
                        const closed = Math.max(0, city.total - open)
                        return (
                          <div key={city.city}>
                            <div className="city-bar__head">
                              <strong>{city.city}</strong>
                              <span>
                                {open} open / {city.total}
                              </span>
                            </div>
                            <StackedBar
                              segments={[
                                { value: open, color: '#2f7f75', label: 'Open' },
                                { value: closed, color: '#e7e0cf', label: 'Resolved' },
                              ]}
                            />
                          </div>
                        )
                      })}
                    </div>
                    <div className="chart-legend">
                      <span>
                        <i style={{ background: '#2f7f75' }} /> Open
                      </span>
                      <span>
                        <i style={{ background: '#e7e0cf' }} /> Resolved
                      </span>
                    </div>
                    <div className="row-between" style={{ marginTop: 12 }}>
                      <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                        Largest caseload
                      </span>
                      <strong style={{ fontSize: 12 }}>
                        {data.byCity.slice().sort((a, b) => b.total - a.total)[0]?.city ?? '—'}
                      </strong>
                    </div>
                    <div className="meter" style={{ marginTop: 8 }} aria-hidden="true">
                      <span
                        style={{
                          width: `${(Math.max(...data.byCity.map((c) => c.total)) / maxCity) * 100}%`,
                          background: 'var(--teal-500)',
                        }}
                      />
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHead title="Status mix" sub="Where open work currently sits." />
                  <CardBody>
                    <div className="stack gap-10">
                      {Object.entries(data.byStatus)
                        .filter(([status]) => status !== 'resolved')
                        .sort((a, b) => b[1] - a[1])
                        .map(([status, count]) => {
                          return (
                            <div className="row-between" key={status}>
                              <div className="row-wrap" style={{ gap: 8 }}>
                                <StatusBadge status={status as never} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, marginLeft: 10 }}>
                                <div className="meter" style={{ flex: 1 }}>
                                  <span style={{ width: `${(count / Math.max(1, totals.open)) * 100}%` }} />
                                </div>
                                <strong style={{ fontSize: 12, minWidth: 18, textAlign: 'right' }}>{count}</strong>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    <div className="row-between" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>Resolved to date</span>
                      <Badge tone="resolved">{totals.resolved}</Badge>
                    </div>
                  </CardBody>
                </Card>
              </div>

              <Card className="table-card">
                <CardHead
                  title="Department workload"
                  sub="Open cases against configured SLA targets."
                  action={
                    <Link to="/authority/departments" className="btn btn--quiet btn--sm">
                      All departments <Icon name="arrowRight" size={13} />
                    </Link>
                  }
                />
                <div className="card-body" style={{ paddingTop: 6 }}>
                  {data.departments.map((department) => (
                    <Link
                      key={department.id}
                      to={`/authority/incidents?department=${department.id}`}
                      className="dept-row"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="dept-row__head">
                        <strong>{department.name}</strong>
                        <span>
                          {department.open_cases} open · {department.avg_resolution_days || '—'}d avg
                        </span>
                      </div>
                      <div className="progress-row">
                        <div className="meter">
                          <span
                            style={{
                              width: `${Math.min(100, (department.open_cases / Math.max(1, ...data.departments.map((d) => d.open_cases || 1))) * 100)}%`,
                              background: department.open_cases > 3 ? 'var(--amber-500)' : 'var(--teal-500)',
                            }}
                          />
                        </div>
                        <span className="progress-value">{department.sla_target_days}d SLA</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </div>

            <div className="stack gap-16">
              <Card>
                <CardHead
                  title="Priority queue"
                  sub="Ranked by severity, reach and recurrence."
                  action={<Badge tone="critical">{totals.critical} critical</Badge>}
                />
                <CardBody style={{ paddingTop: 6 }}>
                  {data.priorityQueue.map((item) => (
                    <Link
                      key={item.ref}
                      to={`/authority/incidents/${item.ref}`}
                      className="queue-item"
                      style={{ textDecoration: 'none' }}
                    >
                      <span className={`queue-item__score${item.priorityScore >= 85 ? ' is-critical' : item.priorityScore >= 65 ? ' is-high' : ''}`}>
                        {item.priorityScore}
                      </span>
                      <div className="queue-item__main">
                        <strong>{item.title}</strong>
                        <span>
                          {item.ref} · {item.city} · {item.department}
                        </span>
                        <div className="row-wrap" style={{ marginTop: 6 }}>
                          <SeverityBadge severity={item.severity} />
                          <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                            {timeAgo(item.reportedAt)}
                          </span>
                        </div>
                      </div>
                      <Icon name="chevronRight" />
                    </Link>
                  ))}
                  {analytics ? (
                    <div className="row-between" style={{ marginTop: 14 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>
                        {analytics.recurrence.length} recurring groups flagged
                      </span>
                      <Link to="/intelligence" className="btn btn--quiet btn--xs">
                        Intelligence
                      </Link>
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              <Card>
                <CardHead title="Category distribution" sub="Across all pilot complaints." />
                <CardBody>
                  <div className="stack gap-10">
                    {data.byCategory.slice(0, 6).map((category) => (
                      <div className="row-between" key={category.category}>
                        <span style={{ fontSize: 11.5, color: 'var(--slate-600)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {category.category}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 96 }}>
                          <div className="meter" style={{ flex: 1 }}>
                            <span style={{ width: `${(category.total / Math.max(1, data.byCategory[0].total)) * 100}%`, background: 'var(--olive-500)' }} />
                          </div>
                          <strong style={{ fontSize: 11, minWidth: 14, textAlign: 'right' }}>{category.total}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card dark>
                <CardBody>
                  <span className="eyebrow" style={{ color: 'var(--teal-400)' }}>
                    Control room note
                  </span>
                  <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.65, color: 'rgba(243,239,227,0.66)' }}>
                    Priority scores combine severity, affected population and recurrence. The CivicMind agent above can
                    classify a new incident and recommend a department; every assignment and status change remains a
                    deliberate manual decision by an authorised officer.
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <Link to="/authority/departments" className="btn btn--ghost-light btn--sm btn--block">
                      Review department performance
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
