import { Link } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { Badge, Card, CardBody, CardHead, ErrorState, Loading, Meter, PageHeader, StatCard } from '../../components/ui'
import { useApi } from '../../lib/api'
import type { Analytics, Department } from '../../lib/types'

export function AuthorityDepartments() {
  const { data, loading, error, reload } = useApi<{ departments: Department[] }>('/api/departments')
  const { data: analytics } = useApi<Analytics>('/api/analytics')

  const departments = data?.departments ?? []
  const totalOpen = departments.reduce((sum, department) => sum + department.open_cases, 0)
  const performance = analytics?.performance ?? []

  return (
    <AppShell workspace="authority">
      <PageHeader
        eyebrow="Departments & ownership"
        title="Who owns what."
        sub="Departmental caseload, service-level targets and measured resolution performance across the pilot dataset."
        actions={<Badge tone="neutral">Simulated SLAs</Badge>}
      />

      {loading ? <Loading label="Loading departments…" /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <div className="stat-grid">
            <StatCard label="Configured departments" value={departments.length} foot="Across the Goa pilot" icon="building" />
            <StatCard label="Open cases" value={totalOpen} foot="Assigned or awaiting review" icon="file" />
            <StatCard
              label="Avg. resolution"
              value={`${analytics ? Math.round((analytics.performance.reduce((sum, d) => sum + d.avgResolutionDays, 0) / Math.max(1, analytics.performance.length)) * 10) / 10 : '—'}d`}
              foot="Across resolved incidents"
              icon="clock"
            />
            <StatCard
              label="SLA compliance"
              value={`${performance.length ? Math.round(performance.reduce((sum, d) => sum + d.slaCompliance, 0) / performance.length) : '—'}%`}
              foot="Resolved within target"
              icon="checkCircle"
            />
          </div>

          <div className="grid grid--2 mt-16">
            {departments.map((department) => {
              const perf = performance.find((item) => item.id === department.id)
              const load = Math.min(100, (department.open_cases / Math.max(1, ...departments.map((d) => d.open_cases || 1))) * 100)
              return (
                <Card key={department.id}>
                  <CardBody>
                    <div className="row-between" style={{ alignItems: 'flex-start' }}>
                      <div className="row-wrap" style={{ alignItems: 'flex-start' }}>
                        <span className="notif-icon notif-icon--assigned" style={{ width: 36, height: 36, borderRadius: 10 }}>
                          <Icon name="building" />
                        </span>
                        <div>
                          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>{department.name}</h3>
                          <p style={{ fontSize: 11.5, color: 'var(--slate-500)', marginTop: 2 }}>
                            {department.short_name} · {department.head ?? 'Head not assigned'}
                          </p>
                        </div>
                      </div>
                      <Badge tone={department.open_cases > 3 ? 'high' : 'progress'}>{department.open_cases} open</Badge>
                    </div>

                    <div className="row-between" style={{ marginTop: 16, marginBottom: 6 }}>
                      <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                        Current caseload
                      </span>
                      <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                        {department.total_cases ?? 0} total
                      </span>
                    </div>
                    <Meter value={load} tone={load > 70 ? 'amber' : 'teal'} />

                    <div className="meta-strip" style={{ marginTop: 14, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                      <div>
                        <span>SLA target</span>
                        <strong>{department.sla_target_days} days</strong>
                      </div>
                      <div>
                        <span>Avg closure</span>
                        <strong>{perf?.avgResolutionDays || '—'} days</strong>
                      </div>
                      <div>
                        <span>Compliance</span>
                        <strong>{perf ? `${perf.slaCompliance}%` : '—'}</strong>
                      </div>
                    </div>

                    <div className="row-wrap" style={{ marginTop: 14 }}>
                      <Link to={`/authority/incidents?department=${department.id}`} className="btn btn--ghost btn--sm">
                        <Icon name="filter" size={13} />
                        View assigned complaints
                      </Link>
                      <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)', marginLeft: 'auto' }}>
                        {perf ? `${perf.resolved} resolved · ${perf.open} open` : 'No performance data'}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>

          <Card className="mt-16 table-card">
            <CardHead
              title="Resolution performance"
              sub="Measured from resolution records: days to close against the department's configured target."
              action={<Badge tone="neutral">Evidence-linked</Badge>}
            />
            <div className="table-wrap">
              <table className="data performance-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Assigned</th>
                    <th>Resolved</th>
                    <th>Open</th>
                    <th>Avg. days</th>
                    <th>SLA target</th>
                    <th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="cell-title">
                          <strong>{item.name}</strong>
                          <span>{item.head ?? '—'}</span>
                        </div>
                      </td>
                      <td className="table-num">{item.assigned}</td>
                      <td className="table-num">{item.resolved}</td>
                      <td className="table-num">{item.open}</td>
                      <td className="table-num">{item.avgResolutionDays || '—'}d</td>
                      <td className="table-num">{item.slaTargetDays}d</td>
                      <td style={{ minWidth: 150 }}>
                        <div className="progress-row">
                          <Meter value={item.slaCompliance} tone={item.slaCompliance >= 70 ? 'olive' : item.slaCompliance >= 45 ? 'amber' : 'coral'} />
                          <span className="progress-value">{item.slaCompliance}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line-soft)' }}>
              <p style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>
                SLA compliance is illustrative and calculated only for incidents that have a resolution record in the
                demonstration dataset.
              </p>
            </div>
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
