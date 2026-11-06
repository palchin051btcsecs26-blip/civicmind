import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  ErrorState,
  Field,
  LinkButton,
  Loading,
  Notice,
  SeverityBadge,
  StatusBadge,
  Timeline,
} from '../../components/ui'
import { api, useApi } from '../../lib/api'
import type { IncidentDetail as DetailPayload, MetaPayload, Severity } from '../../lib/types'
import { STATUS_META, formatDate, formatNumber, timeAgo } from '../../lib/ui'

export function IncidentDetail() {
  const { ref } = useParams<{ ref: string }>()
  const { data, loading, error, reload } = useApi<DetailPayload>(ref ? `/api/incidents/${ref}` : null)
  const { data: meta } = useApi<MetaPayload>('/api/meta')

  const [departmentId, setDepartmentId] = useState('')
  const [officer, setOfficer] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [status, setStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [resolutionSummary, setResolutionSummary] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const incident = data?.incident

  useEffect(() => {
    if (!incident) return
    setDepartmentId(incident.department_id ?? '')
    setStatus(incident.status)
    setSeverity(incident.severity)
  }, [incident])

  useEffect(() => {
    setMessage(null)
    setProblem(null)
    setOfficer('')
    setAssignNote('')
    setStatusNote('')
    setResolutionSummary('')
    setEvidenceFiles([])
  }, [ref])

  async function run(kind: string, action: () => Promise<string>) {
    setBusy(kind)
    setMessage(null)
    setProblem(null)
    try {
      const note = await action()
      setMessage(note)
      reload()
    } catch (err) {
      setProblem(err instanceof Error ? err.message : 'The update could not be saved.')
    } finally {
      setBusy(null)
    }
  }

  function assign() {
    if (!departmentId) {
      setProblem('Choose a department before assigning the incident.')
      return
    }
    void run('assign', async () => {
      await api(`/api/incidents/${incident?.ref}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          departmentId,
          assignedTo: officer || undefined,
          note: assignNote || undefined,
        }),
      })
      setAssignNote('')
      return 'Incident assigned. The citizen has been notified of the change.'
    })
  }

  function updateStatus() {
    if (!status) return
    void run('status', async () => {
      await api(`/api/incidents/${incident?.ref}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          severity,
          departmentId: departmentId || undefined,
          note: statusNote || undefined,
          actor: 'Rui Fernandes · Ward officer',
        }),
      })
      setStatusNote('')
      return `Status updated to ${STATUS_META[status as keyof typeof STATUS_META]?.label ?? status}.`
    })
  }

  function addEvidence(files: FileList | null) {
    if (!files) return
    setEvidenceFiles(Array.from(files).map((file) => file.name).slice(0, 4))
  }

  function resolveIncident() {
    if (resolutionSummary.trim().length < 10) {
      setProblem('Add a resolution summary of at least 10 characters.')
      return
    }
    void run('resolve', async () => {
      await api(`/api/incidents/${incident?.ref}/resolutions`, {
        method: 'POST',
        body: JSON.stringify({
          summary: resolutionSummary.trim(),
          evidenceCount: evidenceFiles.length || 1,
          resolvedBy: 'Rui Fernandes · Ward officer',
        }),
      })
      setResolutionSummary('')
      setEvidenceFiles([])
      return 'Resolution recorded with evidence. The complaint is now closed.'
    })
  }

  if (loading) {
    return (
      <AppShell workspace="authority">
        <Loading label="Loading incident record…" />
      </AppShell>
    )
  }

  if (error || !data || !incident) {
    return (
      <AppShell workspace="authority">
        <ErrorState message={error ?? 'Incident not found.'} onRetry={reload} />
        <div style={{ marginTop: 16 }}>
          <LinkButton to="/authority/incidents" variant="ghost" size="sm" icon="chevronLeft">
            Back to complaint queue
          </LinkButton>
        </div>
      </AppShell>
    )
  }

  const isResolved = incident.status === 'resolved'
  const slaLate = Boolean(incident.sla_due_at && !isResolved && new Date(incident.sla_due_at) < new Date())

  return (
    <AppShell workspace="authority">
      <div className="row-wrap" style={{ marginBottom: 14 }}>
        <Link to="/authority/incidents" className="btn btn--quiet btn--sm" style={{ paddingLeft: 0 }}>
          <Icon name="chevronLeft" size={14} />
          Complaint queue
        </Link>
        <span className="mono" style={{ fontSize: 9.5, color: 'var(--slate-400)' }}>
          / {incident.ref}
        </span>
      </div>

      <div className="detail-top" style={{ marginBottom: 18 }}>
        <div>
          <div className="row-wrap">
            <span className="cell-ref">{incident.ref}</span>
            <StatusBadge status={incident.status} />
            <SeverityBadge severity={incident.severity} />
            <Badge tone={slaLate ? 'critical' : 'neutral'}>{slaLate ? 'SLA breached' : `SLA ${formatDate(incident.sla_due_at)}`}</Badge>
            {incident.recurrence_group ? <Badge tone="review">Recurring</Badge> : null}
          </div>
          <h1 className="detail-title">{incident.title}</h1>
          <p className="detail-desc">{incident.description}</p>
        </div>
        <div className="page-actions">
          <span className="badge badge--low">Priority {incident.priority_score}</span>
          <a href={`tel:+91`} className="btn btn--ghost btn--sm" onClick={(event) => event.preventDefault()} style={{ cursor: 'default' }}>
            <Icon name="users" size={14} />
            {incident.citizen_name ?? 'Citizen'}
          </a>
        </div>
      </div>

      {message ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="info" icon="checkCircle">
            {message}
          </Notice>
        </div>
      ) : null}
      {problem ? (
        <div style={{ marginBottom: 14 }}>
          <Notice tone="error" icon="alertCircle">
            {problem}
          </Notice>
        </div>
      ) : null}

      <div className="grid grid--detail">
        <div className="stack gap-16">
          <Card>
            <CardBody>
              <div className="meta-strip" style={{ marginTop: 0 }}>
                <div>
                  <span>Location</span>
                  <strong>{incident.location_name}</strong>
                </div>
                <div>
                  <span>Ward</span>
                  <strong>{incident.ward ?? incident.city}</strong>
                </div>
                <div>
                  <span>Reported</span>
                  <strong>{formatDate(incident.reported_at, true)}</strong>
                </div>
                <div>
                  <span>Affected</span>
                  <strong>{formatNumber(incident.affected_people)} people</strong>
                </div>
              </div>

              <div className="row-between" style={{ marginTop: 18 }}>
                <span className="eyebrow">Civic intelligence</span>
                <Badge tone="neutral">Simulated evidence</Badge>
              </div>

              <div className="grid grid--2" style={{ marginTop: 12, gap: 12 }}>
                <div className="insight">
                  <span className="insight__icon">
                    <Icon name="layers" />
                  </span>
                  <div>
                    <strong>Category</strong>
                    <p>{incident.category}</p>
                  </div>
                </div>
                <div className="insight">
                  <span className="insight__icon">
                    <Icon name="pin" />
                  </span>
                  <div>
                    <strong>Coordinates</strong>
                    <p>
                      {incident.lat?.toFixed(4) ?? '—'}, {incident.lng?.toFixed(4) ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="insight">
                  <span className="insight__icon">
                    <Icon name="building" />
                  </span>
                  <div>
                    <strong>Owning department</strong>
                    <p>{incident.department_name ?? 'Awaiting assignment'}</p>
                  </div>
                </div>
                <div className="insight">
                  <span className="insight__icon">
                    <Icon name="refresh" />
                  </span>
                  <div>
                    <strong>Recurrence</strong>
                    <p>{incident.recurrence_group ?? 'No repeat pattern recorded'}</p>
                  </div>
                </div>
              </div>

              <div className="photo-strip">
                {Array.from({ length: Math.max(2, incident.photo_count ?? 2) }).slice(0, 4).map((_, index) => (
                  <div className="photo-tile" key={index} title="Simulated citizen photo">
                    <Icon name="camera" />
                  </div>
                ))}
              </div>
              <p style={{ marginTop: 8, fontSize: 11, color: 'var(--slate-400)' }}>
                Photo placeholders represent citizen evidence. File storage is simulated in this build.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title="Incident timeline"
              sub="Every status change is recorded with actor, time and note."
              action={<Badge tone="neutral">{data.updates.length} entries</Badge>}
            />
            <CardBody>
              <Timeline updates={data.updates} />
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title="Resolution evidence"
              sub={isResolved ? 'Closure has been recorded for this incident.' : 'Closure requires a written summary and photographic evidence.'}
              action={isResolved ? <Badge tone="resolved">Closed</Badge> : <Badge tone="neutral">Open</Badge>}
            />
            <CardBody>
              {data.resolution ? (
                <div className="stack gap-14">
                  <div className="kv">
                    <dt>Resolved by</dt>
                    <dd>{data.resolution.resolved_by}</dd>
                    <dt>Closed on</dt>
                    <dd>{formatDate(data.resolution.resolved_at, true)}</dd>
                    <dt>Days to resolve</dt>
                    <dd>{data.resolution.days_to_resolve}</dd>
                    <dt>Evidence files</dt>
                    <dd>{data.resolution.evidence_count}</dd>
                    <dt>Citizen confirmed</dt>
                    <dd>{data.resolution.citizen_confirmed ? 'Confirmed' : 'Awaiting confirmation'}</dd>
                  </div>
                  <div className="insight">
                    <span className="insight__icon">
                      <Icon name="checkCircle" />
                    </span>
                    <div>
                      <strong>Resolution summary</strong>
                      <p>{data.resolution.summary}</p>
                    </div>
                  </div>
                  <div className="photo-strip" style={{ marginTop: 0 }}>
                    {Array.from({ length: Math.min(4, data.resolution.evidence_count) }).map((_, index) => (
                      <div className="photo-tile" key={index} title="Simulated resolution evidence">
                        <Icon name="check" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="stack gap-14">
                  <Field label="Resolution summary" hint="What was fixed, and how was it verified?">
                    <textarea
                      className="textarea"
                      value={resolutionSummary}
                      onChange={(event) => setResolutionSummary(event.target.value)}
                      placeholder="E.g. Storm drain desilted, two collapsed slabs replaced and the lane cleared of standing water."
                      style={{ minHeight: 92 }}
                    />
                  </Field>
                  <div>
                    <span className="field-label" style={{ marginBottom: 7 }}>
                      Evidence photographs <span>Optional placeholder</span>
                    </span>
                    <label className="dropzone" style={{ padding: 16 }}>
                      <Icon name="upload" />
                      <strong>Attach evidence</strong>
                      <span>Photo storage is simulated in this demonstration.</span>
                      <input type="file" accept="image/*" multiple hidden onChange={(event) => addEvidence(event.target.files)} />
                    </label>
                    {evidenceFiles.length ? (
                      <div className="row-wrap" style={{ marginTop: 8 }}>
                        {evidenceFiles.map((file) => (
                          <span className="badge badge--neutral" key={file}>
                            {file.length > 22 ? `${file.slice(0, 22)}…` : file}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button variant="accent" icon="check" onClick={resolveIncident} disabled={busy === 'resolve'}>
                    {busy === 'resolve' ? 'Recording…' : 'Record resolution & close'}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="panel-stack">
          <Card>
            <CardBody>
              <div className="panel-title">
                <Icon name="alert" />
                Priority & service level
              </div>
              <div className="stat-inline" style={{ marginTop: 14 }}>
                <div>
                  <span>Priority</span>
                  <strong>{incident.priority_score}</strong>
                </div>
                <div>
                  <span>Affected</span>
                  <strong>{incident.affected_people}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 13, paddingTop: 4 }}>{STATUS_META[incident.status].label}</strong>
                </div>
              </div>
              <div className="meter" style={{ marginTop: 14 }}>
                <span
                  style={{
                    width: `${incident.priority_score}%`,
                    background: slaLate ? 'var(--coral-500)' : 'var(--teal-500)',
                  }}
                />
              </div>
              <hr className="divider" style={{ margin: '14px 0' }} />
              <div className="kv">
                <dt>SLA target</dt>
                <dd>{incident.sla_target_days ?? 7} days</dd>
                <dt>Due</dt>
                <dd>{formatDate(incident.sla_due_at)}</dd>
                <dt>Last update</dt>
                <dd>{timeAgo(incident.updated_at)}</dd>
                <dt>Reported by</dt>
                <dd>{incident.citizen_name ?? 'Citizen'}</dd>
              </div>
              {slaLate ? (
                <div className="notice" style={{ marginTop: 12 }}>
                  <Icon name="clock" />
                  <div>This incident is past its service-level target.</div>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="panel-title">
                <Icon name="building" />
                Department assignment
              </div>
              <p className="panel-note">
                {data.assignment
                  ? `Currently with ${data.assignment.department_short ?? incident.department_short} · ${data.assignment.assigned_to}`
                  : 'Not yet assigned to a department.'}
              </p>
              <div className="stack gap-12" style={{ marginTop: 14 }}>
                <Field label="Department">
                  <select className="select" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                    <option value="">Select department</option>
                    {meta?.departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Field officer" hint="Leave blank to auto-assign from the ward roster.">
                  <input className="input" value={officer} onChange={(event) => setOfficer(event.target.value)} placeholder="e.g. Aarti Parab" />
                </Field>
                <Field label="Assignment note">
                  <input
                    className="input"
                    value={assignNote}
                    onChange={(event) => setAssignNote(event.target.value)}
                    placeholder="Instruction for the field team"
                  />
                </Field>
                <Button variant="primary" icon="send" onClick={assign} disabled={busy === 'assign'}>
                  {busy === 'assign' ? 'Assigning…' : 'Assign incident'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="panel-title">
                <Icon name="refresh" />
                Update status
              </div>
              <p className="panel-note">Status changes notify the citizen and are written to the timeline.</p>
              <div className="stack gap-12" style={{ marginTop: 14 }}>
                <Field label="New status">
                  <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
                    {(['under_review', 'assigned', 'in_progress'] as const).map((option) => (
                      <option key={option} value={option}>
                        {STATUS_META[option].label}
                      </option>
                    ))}
                    {isResolved ? <option value="resolved">Resolved</option> : null}
                  </select>
                </Field>
                <Field label="Severity">
                  <select className="select" value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </Field>
                <Field label="Internal note" hint="Optional. Visible in the incident timeline.">
                  <textarea
                    className="textarea"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    style={{ minHeight: 72 }}
                    placeholder="E.g. Field inspection scheduled for tomorrow morning."
                  />
                </Field>
                <Button variant="ghost" icon="check" onClick={updateStatus} disabled={busy === 'status'}>
                  {busy === 'status' ? 'Saving…' : 'Save status update'}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card dark>
            <CardBody>
              <span className="eyebrow" style={{ color: 'var(--teal-400)' }}>
                Demo actions
              </span>
              <p style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.6, color: 'rgba(243,239,227,0.62)' }}>
                Assignments, status changes and resolutions you make here are written to the local D1 database and reflected
                across all dashboards. The dataset is simulated.
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </AppShell>
  )
}
