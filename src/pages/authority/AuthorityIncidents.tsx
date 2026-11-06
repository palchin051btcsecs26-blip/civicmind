import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Loading,
  PageHeader,
  Pagination,
  SearchField,
  SeverityBadge,
  StatusBadge,
} from '../../components/ui'
import { buildQuery, useApi } from '../../lib/api'
import type { Department, Incident } from '../../lib/types'
import { CATEGORIES, CITIES, STATUS_ORDER, STATUS_META, daysOpen, formatNumber } from '../../lib/ui'

const PAGE_SIZE = 10

export function AuthorityIncidents() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const [search, setSearch] = useState(params.get('q') ?? '')
  const [city, setCity] = useState(params.get('city') ?? 'All')
  const [category, setCategory] = useState(params.get('category') ?? 'All')
  const [status, setStatus] = useState(params.get('status') ?? 'All')
  const [severity, setSeverity] = useState(params.get('severity') ?? 'All')
  const [department, setDepartment] = useState(params.get('department') ?? 'All')
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState(params.get('q') ?? '')

  useEffect(() => {
    setQuery(params.get('q') ?? '')
    setSearch(params.get('q') ?? '')
    setCity(params.get('city') ?? 'All')
    setStatus(params.get('status') ?? 'All')
    setCategory(params.get('category') ?? 'All')
    setSeverity(params.get('severity') ?? 'All')
    setDepartment(params.get('department') ?? 'All')
  }, [params])

  const path = `/api/incidents${buildQuery({ q: query, city, category, status, severity, department, limit: 200 })}`
  const { data, loading, error, reload } = useApi<{ incidents: Incident[] }>(path)
  const { data: departments } = useApi<{ departments: Department[] }>('/api/departments')

  const incidents = data?.incidents ?? []
  const paged = useMemo(() => incidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [incidents, page])

  useEffect(() => {
    setPage(1)
  }, [query, city, category, status, severity, department])

  function apply(next?: { q?: string }) {
    const built: Record<string, string> = {}
    if ((next?.q ?? search).trim()) built.q = (next?.q ?? search).trim()
    if (city !== 'All') built.city = city
    if (category !== 'All') built.category = category
    if (status !== 'All') built.status = status
    if (severity !== 'All') built.severity = severity
    if (department !== 'All') built.department = department
    setParams(built, { replace: true })
    setQuery((next?.q ?? search).trim())
  }

  function reset() {
    setSearch('')
    setCity('All')
    setCategory('All')
    setStatus('All')
    setSeverity('All')
    setDepartment('All')
    setParams({}, { replace: true })
    setQuery('')
  }

  const activeFilters = [city, category, status, severity, department].filter((value) => value !== 'All').length + (query ? 1 : 0)

  return (
    <AppShell workspace="authority">
      <PageHeader
        eyebrow="Complaint management"
        title="Every complaint, one queue."
        sub="Filter by city, category, department, severity or status. Priorities are recalculated from severity, affected population and recurrence."
        actions={
          <>
            <Button variant="ghost" size="sm" icon="refresh" onClick={reload}>
              Refresh
            </Button>
            <Badge tone="neutral">{formatNumber(incidents.length)} matching</Badge>
          </>
        }
      />

      <div className="filter-card">
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value)
            setQuery(value)
          }}
          placeholder="Search title, reference or neighbourhood"
          onSubmit={() => apply()}
        />
        <div className="field-inline">
          <select className="select" value={city} onChange={(event) => setCity(event.target.value)} aria-label="Filter by city">
            <option value="All">All cities</option>
            {CITIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="field-inline">
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            {STATUS_ORDER.map((option) => (
              <option key={option} value={option}>
                {STATUS_META[option].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field-inline">
          <select className="select" value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by severity">
            <option value="All">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="field-inline">
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="All">All categories</option>
            {CATEGORIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="field-inline">
          <select className="select" value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department">
            <option value="All">All departments</option>
            {departments?.departments.map((option) => (
              <option key={option.id} value={option.id}>
                {option.short_name}
              </option>
            ))}
          </select>
        </div>
        <Button variant="primary" size="sm" icon="filter" onClick={() => apply()}>
          Apply
        </Button>
        {activeFilters ? (
          <button type="button" className="btn btn--quiet btn--xs" onClick={reset}>
            Clear ({activeFilters})
          </button>
        ) : null}
        <span className="filter-count">{loading ? 'Searching…' : `${incidents.length} results`}</span>
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <Card className="card--flush table-card">
        <div className="card-head card-head--bordered">
          <div>
            <h3 className="card-title">Complaint register</h3>
            <p className="card-sub">Sorted by priority score, then most recent report.</p>
          </div>
          <Badge tone="neutral">Simulated dataset</Badge>
        </div>

        {loading ? <Loading label="Loading the complaint register…" /> : null}

        {!loading && !incidents.length ? (
          <div className="table-empty">
            <Icon name="search" size={20} />
            <p style={{ marginTop: 8 }}>No complaints match these filters.</p>
            <Button variant="ghost" size="sm" onClick={reset} style={{ marginTop: 12 }}>
              Clear filters
            </Button>
          </div>
        ) : null}

        {!loading && incidents.length ? (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Department</th>
                    <th>Age</th>
                    <th aria-label="Open" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((incident) => (
                    <tr
                      key={incident.id}
                      className="is-clickable"
                      onClick={() => navigate(`/authority/incidents/${incident.ref}`)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') navigate(`/authority/incidents/${incident.ref}`)
                      }}
                    >
                      <td>
                        <div className="cell-title">
                          <strong>{incident.title}</strong>
                          <span>
                            {incident.ref} · {incident.location_name}, {incident.city}
                          </span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{incident.category}</td>
                      <td>
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td>
                        <span className={`badge badge--${incident.priority_score >= 85 ? 'critical' : incident.priority_score >= 65 ? 'high' : 'low'} badge--plain`}>
                          {incident.priority_score}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={incident.status} />
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{incident.department_short ?? '—'}</td>
                      <td className="cell-ref">{incident.status === 'resolved' ? 'Closed' : `${daysOpen(incident.reported_at)}d`}</td>
                      <td>
                        <Icon name="chevronRight" size={14} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={incidents.length} onChange={setPage} />
          </>
        ) : null}
      </Card>
    </AppShell>
  )
}
