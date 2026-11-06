import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import {
  Badge,
  Card,
  CardBody,
  CardHead,
  EmptyState,
  ErrorState,
  LinkButton,
  Loading,
  PageHeader,
  SeverityBadge,
  StatusBadge,
  Timeline,
} from '../../components/ui'
import { useApi } from '../../lib/api'
import type { CitizenPayload, IncidentDetail } from '../../lib/types'
import { daysOpen, formatDate, timeAgo } from '../../lib/ui'

type Filter = 'all' | 'open' | 'resolved'

export function CitizenReports() {
  const { data, loading, error, reload } = useApi<CitizenPayload>('/api/citizen')
  const [filter, setFilter] = useState<Filter>('all')
  const [params, setParams] = useSearchParams()
  const [selectedRef, setSelectedRef] = useState<string | null>(params.get('ref'))

  const reports = useMemo(() => data?.reports ?? [], [data])
  const filtered = useMemo(() => {
    if (filter === 'open') return reports.filter((report) => report.status !== 'resolved')
    if (filter === 'resolved') return reports.filter((report) => report.status === 'resolved')
    return reports
  }, [reports, filter])

  useEffect(() => {
    const refFromUrl = params.get('ref')
    if (refFromUrl) {
      setSelectedRef(refFromUrl)
      return
    }
    if (!selectedRef && filtered.length) setSelectedRef(filtered[0].ref)
  }, [params, filtered, selectedRef])

  const selected = reports.find((report) => report.ref === selectedRef) ?? filtered[0] ?? null
  const { data: detail, loading: detailLoading, error: detailError, reload: reloadDetail } = useApi<IncidentDetail>(
    selected ? `/api/incidents/${selected.ref}` : null,
  )

  function select(ref: string) {
    setSelectedRef(ref)
    setParams({ ref }, { replace: true })
  }

  return (
    <AppShell workspace="citizen">
      <PageHeader
        eyebrow="Complaint history"
        title="Your civic record."
        sub="Every complaint you have filed in the Goa pilot, with the full municipal trail behind each status."
        actions={
          <>
            <LinkButton to="/citizen/nearby" variant="ghost" icon="pin">
              Nearby issues
            </LinkButton>
            <LinkButton to="/citizen/report" variant="accent" icon="plus">
              New complaint
            </LinkButton>
          </>
        }
      />

      {loading ? <Loading /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <div className="split-view">
          <Card className="card--flush">
            <div className="card-head card-head--bordered">
              <div>
                <h3 className="card-title">Complaints</h3>
                <p className="card-sub">{reports.length} filed from your demo profile</p>
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-soft)' }}>
              <div className="tabs" style={{ width: '100%' }}>
                {(
                  [
                    ['all', 'All', reports.length],
                    ['open', 'Open', reports.filter((r) => r.status !== 'resolved').length],
                    ['resolved', 'Resolved', reports.filter((r) => r.status === 'resolved').length],
                  ] as [Filter, string, number][]
                ).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    className={`tab${filter === value ? ' is-active' : ''}`}
                    onClick={() => setFilter(value)}
                    style={{ flex: 1 }}
                  >
                    {label} <span style={{ color: 'var(--slate-400)', fontSize: 10.5 }}>{count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="report-list">
              {filtered.length ? (
                filtered.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    className={`report-item${selected?.ref === report.ref ? ' is-active' : ''}`}
                    onClick={() => select(report.ref)}
                  >
                    <div className="report-item__top">
                      <span className="cell-ref">{report.ref}</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <strong>{report.title}</strong>
                    <div className="report-item__meta">
                      <span>{report.category}</span>
                      <i />
                      <span>{report.location_name}</span>
                      <i />
                      <span>{timeAgo(report.reported_at)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState title="No complaints in this view" description="Try a different filter or file a new complaint." />
              )}
            </div>
          </Card>

          <div className="stack gap-16">
            {selected ? (
              <>
                <Card>
                  <CardBody>
                    <div className="detail-top">
                      <div>
                        <div className="row-wrap">
                          <span className="cell-ref">{selected.ref}</span>
                          <SeverityBadge severity={selected.severity} />
                          <StatusBadge status={selected.status} />
                        </div>
                        <h2 className="detail-title">{selected.title}</h2>
                        <p className="detail-desc">{selected.description}</p>
                      </div>
                      <div className="stack gap-8" style={{ minWidth: 150 }}>
                        <LinkButton to="/citizen/nearby" variant="ghost" size="sm" icon="map">
                          See on map
                        </LinkButton>
                      </div>
                    </div>

                    <div className="meta-strip">
                      <div>
                        <span>Location</span>
                        <strong>{selected.location_name}</strong>
                      </div>
                      <div>
                        <span>Department</span>
                        <strong>{selected.department_short ?? 'Awaiting triage'}</strong>
                      </div>
                      <div>
                        <span>Reported</span>
                        <strong>{formatDate(selected.reported_at)}</strong>
                      </div>
                      <div>
                        <span>Open for</span>
                        <strong>{selected.status === 'resolved' ? 'Closed' : `${daysOpen(selected.reported_at)} days`}</strong>
                      </div>
                    </div>

                    {selected.photo_count ? (
                      <div className="photo-strip">
                        {Array.from({ length: Math.min(4, selected.photo_count) }).map((_, index) => (
                          <div className="photo-tile" key={index} title="Simulated evidence thumbnail">
                            <Icon name="camera" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardBody>
                </Card>

                <div className="grid grid--2">
                  <Card>
                    <CardHead title="Status trail" sub="Updates published by the municipal control room." />
                    <CardBody>
                      {detailLoading ? <Loading label="Loading timeline…" /> : null}
                      {detailError ? <ErrorState message={detailError} onRetry={reloadDetail} /> : null}
                      {detail ? <Timeline updates={detail.updates} /> : null}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHead title="Resolution" sub="Closure evidence recorded by the department." />
                    <CardBody>
                      {detail?.resolution ? (
                        <div className="stack gap-14">
                          <div className="row-wrap">
                            <Badge tone="resolved">Resolved</Badge>
                            <span className="mono" style={{ fontSize: 9.5, color: 'var(--slate-400)' }}>
                              {formatDate(detail.resolution.resolved_at, true)}
                            </span>
                          </div>
                          <p style={{ fontSize: 12.5, lineHeight: 1.65, color: 'var(--slate-600)' }}>{detail.resolution.summary}</p>
                          <div className="kv">
                            <dt>Resolved by</dt>
                            <dd>{detail.resolution.resolved_by}</dd>
                            <dt>Evidence files</dt>
                            <dd>{detail.resolution.evidence_count}</dd>
                            <dt>Days to close</dt>
                            <dd>{detail.resolution.days_to_resolve}</dd>
                            <dt>Citizen confirmed</dt>
                            <dd>{detail.resolution.citizen_confirmed ? 'Yes' : 'Pending'}</dd>
                          </div>
                          <div className="notice notice--info">
                            <Icon name="camera" />
                            <div>Evidence thumbnails are simulated in this demonstration build.</div>
                          </div>
                        </div>
                      ) : (
                        <EmptyState
                          icon="clock"
                          title="Awaiting resolution"
                          description="The department has not uploaded closure evidence yet. You will be notified when the status changes."
                        />
                      )}
                    </CardBody>
                  </Card>
                </div>

                <Card>
                  <CardHead
                    title="Need to add something?"
                    sub="Additional context can help the field team verify the issue."
                    action={<Badge tone="neutral">Demo flow</Badge>}
                  />
                  <CardBody>
                    <div className="row-wrap">
                      <LinkButton to="/citizen/report" variant="ghost" size="sm" icon="camera">
                        File an updated report
                      </LinkButton>
                      <LinkButton to="/citizen/notifications" variant="ghost" size="sm" icon="bell">
                        Notification history
                      </LinkButton>
                    </div>
                  </CardBody>
                </Card>
              </>
            ) : (
              <Card>
                <EmptyState title="Select a complaint" description="Choose a complaint from the list to see its full status trail." />
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
