import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AgentMapWorkspace } from '../../components/AgentMapWorkspace'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import { BarList, Donut, StackedBar } from '../../components/charts'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  ErrorState,
  Loading,
  Meter,
  Notice,
  PageHeader,
  StatCard,
} from '../../components/ui'
import { useApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Analytics } from '../../lib/types'
import { CATEGORY_COLORS, CHART_COLORS, CITIES, CITY_META, formatNumber, formatDay } from '../../lib/ui'

export function Intelligence() {
  const { data, loading, error, reload } = useApi<Analytics>('/api/analytics')
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'

  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [params] = useSearchParams()
  const view = params.get('view')

  useEffect(() => {
    if (!view) return
    const id = `intel-${view}`
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [view])

  const categoryTotals = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    for (const city of data.cityTotals) {
      for (const [category, value] of Object.entries(city.categories)) {
        counts.set(category, (counts.get(category) ?? 0) + value)
      }
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [data])

  const totalComplaints = categoryTotals.reduce((sum, item) => sum + item.value, 0)
  const donutSegments = categoryTotals.slice(0, 6).map((item, index) => ({
    label: item.label,
    value: item.value,
    color: CATEGORY_COLORS[item.label] ?? CHART_COLORS[index],
  }))
  const other = categoryTotals.slice(6).reduce((sum, item) => sum + item.value, 0)
  if (other > 0) donutSegments.push({ label: 'Other categories', value: other, color: '#cfc6b0' })

  const activeCity = data?.cities.find((city) => city.name === selectedCity) ?? null
  const cityHotspots = (data?.heat ?? [])
    .filter((spot) => (selectedCity ? spot.city === selectedCity : true))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5)

  const topCategoriesForCity = useMemo(() => {
    if (!data || !selectedCity) return []
    const entry = data.cityTotals.find((city) => city.city === selectedCity)
    if (!entry) return []
    return Object.entries(entry.categories)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [data, selectedCity])

  return (
    <AppShell workspace="intelligence">
      <PageHeader
        eyebrow="Civic intelligence"
        title="Where the city is under stress."
        sub="Ask the CivicMind agent, explore live incidents on the map, and read the ward-level patterns behind complaint density, recurrence and resolution performance."
        actions={
          <>
            {isGuest ? <Badge tone="review">Guest · read-only</Badge> : null}
            <Button variant="ghost" size="sm" icon="refresh" onClick={reload}>
              Refresh data
            </Button>
            <Badge tone="neutral">Simulated dataset</Badge>
          </>
        }
      />

      {isGuest ? (
        <Notice tone="info" icon="eye">
          You are browsing the public dashboard as a guest. Citizen reports, notifications and authority actions stay
          private. Sign out from the sidebar to enter with a citizen or municipal account.
        </Notice>
      ) : null}

      {loading ? <Loading label="Building the intelligence view…" /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <AgentMapWorkspace role={user?.role ?? 'guest'} />

      {data ? (
        <>
          <div className="stat-grid mt-16">
            <StatCard
              label="Open incidents"
              value={formatNumber(data.cities.reduce((sum, city) => sum + city.open, 0))}
              foot={`${formatNumber(data.cities.reduce((sum, city) => sum + city.total, 0))} in the pilot`}
              icon="file"
            />
            <StatCard label="Recurring groups" value={data.recurrence.length} foot="Repeat failures at one location" icon="refresh" />
            <StatCard label="Tourism exposure" value={formatNumber(data.tourism.visitorExposure)} foot="People affected, Calangute corridor" icon="waves" />
            <StatCard
              label="Avg. resolution"
              value={`${Math.round((data.performance.reduce((sum, item) => sum + item.avgResolutionDays, 0) / Math.max(1, data.performance.length)) * 10) / 10}d`}
              foot="Across departments with closures"
              icon="clock"
            />
          </div>

          <div className="intel-summary-grid">
            <Card>
              <CardHead
                title="Pilot overview"
                sub="All three municipalities combined"
                action={
                  selectedCity ? (
                    <Button variant="quiet" size="xs" icon="close" onClick={() => setSelectedCity(null)}>
                      Clear
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                {activeCity ? (
                  <>
                    <div className="stat-inline">
                      <div>
                        <span>Total</span>
                        <strong>{activeCity.total}</strong>
                      </div>
                      <div>
                        <span>Open</span>
                        <strong>{activeCity.open}</strong>
                      </div>
                      <div>
                        <span>Critical</span>
                        <strong style={{ color: activeCity.critical ? 'var(--coral-700)' : undefined }}>{activeCity.critical}</strong>
                      </div>
                      <div>
                        <span>Resolved</span>
                        <strong>{activeCity.resolved}</strong>
                      </div>
                    </div>
                    <p className="map-detail__note" style={{ marginTop: 12 }}>
                      {CITY_META[activeCity.name]?.blurb}
                    </p>
                    <hr className="divider" style={{ margin: '14px 0' }} />
                    <span className="eyebrow">Category mix</span>
                    <div style={{ marginTop: 10 }}>
                      <BarList items={topCategoriesForCity.slice(0, 5)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stat-inline">
                      <div>
                        <span>Total</span>
                        <strong>{formatNumber(totalComplaints)}</strong>
                      </div>
                      <div>
                        <span>Cities</span>
                        <strong>3</strong>
                      </div>
                      <div>
                        <span>Hotspots</span>
                        <strong>{data.heat.filter((spot) => spot.open > 0).length}</strong>
                      </div>
                    </div>
                    <p className="map-detail__note" style={{ marginTop: 12 }}>
                      Complaint density concentrates along the Panaji creek corridor, the Calangute beach belt and the
                      Margao market and bus-stand wards. Select a hotspot to read its city profile.
                    </p>
                    <hr className="divider" style={{ margin: '14px 0' }} />
                    <span className="eyebrow">Highest intensity hotspots</span>
                    <div style={{ marginTop: 8 }}>
                      {cityHotspots.map((spot) => (
                        <button
                          key={spot.id}
                          type="button"
                          className="heat-row"
                          style={{
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            textAlign: 'left',
                            borderBottom: '1px solid var(--line-soft)',
                          }}
                          onClick={() => setSelectedCity(spot.city)}
                        >
                          <div className="heat-row__main">
                            <strong>{spot.name}</strong>
                            <span>
                              {spot.city} · {spot.total} complaints
                            </span>
                          </div>
                          <Meter value={(spot.intensity / Math.max(1, ...data.heat.map((s) => s.intensity))) * 100} tone="amber" />
                          <span className="heat-score">{spot.intensity}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHead title="City comparison" sub="Open versus closed in the current dataset." />
              <CardBody>
                <div className="city-bars">
                  {data.cities.map((city) => (
                    <div key={city.name}>
                      <div className="city-bar__head">
                        <strong>{city.name}</strong>
                        <span>
                          {city.total} total · {city.resolved} resolved
                        </span>
                      </div>
                      <StackedBar
                        segments={[
                          { value: city.open, color: '#2f7f75', label: 'Open' },
                          { value: city.resolved, color: '#e0d9c7', label: 'Resolved' },
                        ]}
                      />
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <span>
                    <i style={{ background: '#2f7f75' }} /> Open
                  </span>
                  <span>
                    <i style={{ background: '#e0d9c7' }} /> Resolved
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Severity mix" sub="Across all pilot incidents, weighted by open and closed reports." />
              <CardBody>
                <div className="stack gap-14">
                  {data.severityMix.map((item) => (
                    <div key={item.severity}>
                      <div className="row-between" style={{ marginBottom: 5 }}>
                        <span style={{ fontSize: 11.5, textTransform: 'capitalize', color: 'var(--slate-600)' }}>{item.severity}</span>
                        <strong style={{ fontSize: 11.5 }}>{item.total}</strong>
                      </div>
                      <Meter
                        value={(item.total / Math.max(1, totalComplaints)) * 100}
                        tone={
                          item.severity === 'critical'
                            ? 'coral'
                            : item.severity === 'high'
                              ? 'amber'
                              : item.severity === 'medium'
                                ? 'olive'
                                : 'teal'
                        }
                      />
                    </div>
                  ))}
                </div>
                <hr className="divider" style={{ margin: '16px 0' }} />
                <p style={{ fontSize: 11.5, lineHeight: 1.65, color: 'var(--slate-500)' }}>
                  Critical and high severity incidents drive the priority queue in the municipal workspace and are the first
                  candidates for escalation.
                </p>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid--2 mt-16" id="intel-categories">
            <Card>
              <CardHead
                title="Issue category distribution"
                sub="Share of all pilot complaints by civic category."
                action={<Badge tone="neutral">{formatNumber(totalComplaints)} reports</Badge>}
              />
              <CardBody>
                <Donut segments={donutSegments} centerValue={String(totalComplaints)} centerLabel="Complaints" />
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Category mix by city" sub="Where each municipality's complaint pressure sits." />
              <CardBody>
                <div className="city-bars">
                  {CITIES.map((city) => {
                    const entry = data.cityTotals.find((item) => item.city === city)
                    const top = Object.entries(entry?.categories ?? {})
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 4)
                    const total = top.reduce((sum, [, value]) => sum + value, 0)
                    return (
                      <div key={city}>
                        <div className="city-bar__head">
                          <strong>{city}</strong>
                          <span>{entry?.total ?? 0} reports</span>
                        </div>
                        <StackedBar
                          height={9}
                          segments={top.map(([label, value], index) => ({
                            value,
                            color: CATEGORY_COLORS[label] ?? CHART_COLORS[index],
                            label,
                          }))}
                        />
                        <div className="row-wrap" style={{ marginTop: 6, gap: 10 }}>
                          {top.map(([label, value], index) => (
                            <span
                              key={label}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--slate-500)' }}
                            >
                              <i
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 2,
                                  background: CATEGORY_COLORS[label] ?? CHART_COLORS[index],
                                  display: 'inline-block',
                                }}
                              />
                              {label} {Math.round((value / Math.max(1, total)) * 100)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p style={{ marginTop: 14, fontSize: 11, color: 'var(--slate-400)' }}>
                  Percentages are shares of each city&rsquo;s top four categories in the simulated dataset.
                </p>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid--sidebar mt-16" id="intel-recurrence">
            <Card>
              <CardHead
                title="Recurring incident indicators"
                sub="Places where the same civic failure has been reported more than once."
                action={<Badge tone="review">{data.recurrence.length} groups</Badge>}
              />
              <CardBody style={{ paddingTop: 4 }}>
                {data.recurrence.map((group) => (
                  <div className="heat-row" key={group.group}>
                    <span
                      className="notif-icon"
                      style={{ width: 30, height: 30, background: 'var(--ivory-200)', color: 'var(--slate-600)', flex: 'none' }}
                    >
                      <Icon name="refresh" size={14} />
                    </span>
                    <div className="heat-row__main">
                      <strong>{group.group}</strong>
                      <span>
                        {group.city} · {group.category} · {group.occurrences} reports · {group.openCount} open
                      </span>
                    </div>
                    <div style={{ width: 90, flex: 'none' }}>
                      <Meter value={group.heat} tone={group.heat > 75 ? 'coral' : group.heat > 50 ? 'amber' : 'teal'} />
                    </div>
                    <span className="heat-score">{group.heat}</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHead title="Location analytics" sub="Neighbourhoods ranked by complaint intensity." />
              <CardBody style={{ paddingTop: 4 }}>
                {data.heat
                  .slice()
                  .sort((a, b) => b.intensity - a.intensity)
                  .slice(0, 7)
                  .map((spot) => (
                    <div className="heat-row" key={spot.id}>
                      <div className="heat-row__main">
                        <strong>{spot.name}</strong>
                        <span>
                          {spot.city} · {spot.total} complaints · {spot.topCategory ?? 'mixed'}
                        </span>
                      </div>
                      <span className="badge badge--low">{spot.open} open</span>
                    </div>
                  ))}
                <div className="notice" style={{ marginTop: 14 }}>
                  <Icon name="alertCircle" />
                  <div>Heat intensity weights critical incidents more heavily than low-severity reports.</div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="mt-16" id="intel-tourism">
            <Card>
              <CardHead
                title="Tourism exposure"
                sub="Complaint pressure in visitor-heavy coastal wards."
                action={<Badge tone="neutral">Calangute corridor</Badge>}
              />
              <CardBody>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <div className="insight">
                    <span className="insight__icon">
                      <Icon name="file" />
                    </span>
                    <div>
                      <strong>Linked reports</strong>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink-900)' }}>
                        {data.tourism.linkedIncidents}
                      </p>
                    </div>
                  </div>
                  <div className="insight">
                    <span className="insight__icon">
                      <Icon name="waves" />
                    </span>
                    <div>
                      <strong>Beach &amp; sanitation</strong>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink-900)' }}>
                        {data.tourism.beachAndSanitation}
                      </p>
                    </div>
                  </div>
                  <div className="insight">
                    <span className="insight__icon">
                      <Icon name="users" />
                    </span>
                    <div>
                      <strong>Visitor exposure</strong>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink-900)' }}>
                        {formatNumber(data.tourism.visitorExposure)}
                      </p>
                    </div>
                  </div>
                  <div className="insight">
                    <span className="insight__icon">
                      <Icon name="alert" />
                    </span>
                    <div>
                      <strong>Open critical</strong>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--coral-700)' }}>
                        {data.tourism.openCritical}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid--2" style={{ marginTop: 16, gap: 18 }}>
                  <div>
                    <span className="eyebrow">Tourism-linked categories</span>
                    <div style={{ marginTop: 12 }}>
                      <BarList
                        items={data.tourism.byCategory.map((item) => ({ label: item.category, value: item.total }))}
                        valueLabel={(value) => `${value}`}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="eyebrow">What the signal means</span>
                    <p style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.7, color: 'var(--slate-500)' }}>
                      Beach cleanliness, public sanitation, waste and signage complaints cluster along the Calangute–Baga
                      belt, where visitor footfall amplifies the cost of service failure. These wards need faster SLAs
                      during peak season and preventive cleaning cycles rather than one-off cleanups.
                    </p>
                    <div className="feature__meta" style={{ paddingTop: 12 }}>
                      <span>Hotspot · {data.tourism.hotspot}</span>
                      <span>{data.tourism.resolved} resolved</span>
                    </div>
                  </div>
                </div>

                <div className="disclosure" style={{ marginTop: 16 }}>
                  <Icon name="alertCircle" />
                  <div>{data.tourism.note}</div>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="mt-16 table-card" id="intel-performance">
            <CardHead
              title="Resolution performance"
              sub="Departments measured on closure time against their configured service-level target."
              action={<Badge tone="neutral">Illustrative</Badge>}
            />
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Assigned</th>
                    <th>Resolved</th>
                    <th>Open</th>
                    <th>Avg. closure</th>
                    <th>SLA target</th>
                    <th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.performance.map((item) => (
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
                          <Meter
                            value={item.slaCompliance}
                            tone={item.slaCompliance >= 70 ? 'olive' : item.slaCompliance >= 45 ? 'amber' : 'coral'}
                          />
                          <span className="progress-value">{item.slaCompliance}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid--3 mt-16">
            {data.recurrence.slice(0, 3).map((group, index) => (
              <Card key={group.group}>
                <CardBody>
                  <div className="row-between">
                    <span className="eyebrow">Pattern 0{index + 1}</span>
                    <Badge tone={group.heat > 75 ? 'critical' : 'high'}>Heat {group.heat}</Badge>
                  </div>
                  <h3 style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 400, lineHeight: 1.15 }}>
                    {group.group}
                  </h3>
                  <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.65, color: 'var(--slate-500)' }}>
                    {group.occurrences} reports across {group.city}. {group.openCount} remain open, affecting roughly{' '}
                    {formatNumber(group.affectedPeople)} people. Last reported {formatDay(group.lastReportedAt)}.
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
