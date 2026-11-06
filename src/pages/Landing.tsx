import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/Chrome'
import { Icon, type IconName } from '../components/Icon'
import { MapThumbnail } from '../components/GoaMap'
import { LinkButton } from '../components/ui'
import { useApi } from '../lib/api'
import type { Analytics, Overview } from '../lib/types'
import { CITIES, CITY_META, formatNumber, timeAgo } from '../lib/ui'

const FEATURES: { icon: IconName; title: string; copy: string; meta: string[] }[] = [
  {
    icon: 'megaphone',
    title: 'Frictionless citizen reporting',
    copy: 'Photographs, a voice note and an automatic location are enough to file a complaint. No forms in triplicate, no counter queues.',
    meta: ['Photo upload', 'Voice input', 'Auto location'],
  },
  {
    icon: 'layers',
    title: 'Triage that ranks real risk',
    copy: 'Complaints are scored on severity, reach and recurrence so ward teams open with the issues affecting the most people first.',
    meta: ['Priority score', 'Severity', 'Recurrence'],
  },
  {
    icon: 'building',
    title: 'Assignment with accountability',
    copy: 'Every incident carries a department, an officer, a service-level clock and a full status trail from intake to closure.',
    meta: ['Department routing', 'SLA clock', 'Audit trail'],
  },
  {
    icon: 'map',
    title: 'Civic intelligence map',
    copy: 'A ward-level view of complaint density across Panaji, Calangute and Margao, with hotspots that stay visible after closure.',
    meta: ['Heatmap', 'Ward drill-down', 'Hotspot ranking'],
  },
  {
    icon: 'refresh',
    title: 'Recurring incident detection',
    copy: 'CivicMind groups repeat complaints at the same location so drainage and waste failures are fixed at the cause, not closed one by one.',
    meta: ['Repeat groups', 'Root-cause view'],
  },
  {
    icon: 'waves',
    title: 'Tourism impact intelligence',
    copy: 'Coastal wards carry seasonal pressure. Beach, sanitation and access complaints are read against visitor-heavy corridors.',
    meta: ['Calangute corridor', 'Seasonal exposure'],
  },
]

const WORKFLOW = [
  {
    step: '01',
    title: 'Citizen reports',
    copy: 'A resident captures the issue with photos, a voice note and a precise location. CivicMind issues a reference instantly.',
  },
  {
    step: '02',
    title: 'Intelligence triages',
    copy: 'Category, severity and recurrence are resolved on intake, producing a priority score the control room can defend.',
  },
  {
    step: '03',
    title: 'Department acts',
    copy: 'The incident is assigned with an SLA target. Field teams post status updates as work progresses.',
  },
  {
    step: '04',
    title: 'Resolution is evidenced',
    copy: 'Closure requires a written summary and evidence photos. The citizen sees the fix and can confirm it.',
  },
]

const SURFACES = [
  {
    tag: '01 · Citizen',
    title: 'Citizen Portal',
    copy: 'A calm, mobile-ready workspace to report an issue, follow every status change and confirm that a fix actually landed.',
    to: '/citizen',
    points: ['Guided complaint form', 'Live status timeline', 'Nearby civic issues'],
    icon: 'megaphone' as IconName,
  },
  {
    tag: '02 · Municipal',
    title: 'Authority Dashboard',
    copy: 'The control room: incoming volume, high-priority alerts, department assignment and evidence-backed resolution.',
    to: '/authority',
    points: ['Prioritised queue', 'Department workload', 'Resolution evidence'],
    icon: 'layout' as IconName,
  },
  {
    tag: '03 · Intelligence',
    title: 'Civic Intelligence',
    copy: 'A regional read on where civic stress concentrates, which issues recur and how resolution performance compares.',
    to: '/intelligence',
    points: ['Goa heatmap', 'Category distribution', 'SLA performance'],
    icon: 'map' as IconName,
  },
]

export function Landing() {
  const { data: overview } = useApi<Overview>('/api/overview')
  const { data: analytics } = useApi<Analytics>('/api/analytics')

  const totals = overview?.totals
  const queue = overview?.priorityQueue.slice(0, 3) ?? []

  return (
    <div className="landing">
      <SiteHeader theme="dark" />

      <section className="hero">
        <div className="hero__inner">
          <div className="hero__copy">
            <span className="eyebrow">Goa civic intelligence pilot · 2026</span>
            <h1>
              From complaints <em>to action.</em>
            </h1>
            <p className="hero__lead">
              CivicMind turns scattered citizen reports into prioritised, accountable municipal work — and gives Goa&rsquo;s
              authorities a live read on what needs fixing first.
            </p>
            <div className="hero__actions">
              <LinkButton to="/citizen/report" variant="accent" iconRight="arrowRight">
                Report an issue
              </LinkButton>
              <LinkButton to="/intelligence" variant="ghost" icon="map">
                Explore civic intelligence
              </LinkButton>
            </div>
            <div className="hero__trust">
              <div>
                <strong>{totals ? formatNumber(totals.open) : '—'}</strong>
                <span>Open incidents</span>
              </div>
              <div>
                <strong>{totals ? `${totals.resolutionRate}%` : '—'}</strong>
                <span>Resolution rate</span>
              </div>
              <div>
                <strong>{totals ? totals.critical : '—'}</strong>
                <span>Critical alerts</span>
              </div>
              <div>
                <strong>{totals ? `${totals.avgResolutionDays}d` : '—'}</strong>
                <span>Avg. resolution</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="console">
              <div className="console__bar">
                <span className="console__label">
                  <span className="console__dot" />
                  Civic control room · Goa
                </span>
                <span className="badge badge--dark badge--plain">Simulated</span>
              </div>
              <div className="console__body">
                <MapThumbnail />
                <div className="console__stats">
                  <div className="console-stat">
                    <span>Open</span>
                    <strong>{totals ? totals.open : '—'}</strong>
                  </div>
                  <div className="console-stat">
                    <span>Resolved</span>
                    <strong>
                      {totals ? totals.resolved : '—'} <i>/ {totals?.total ?? '—'}</i>
                    </strong>
                  </div>
                  <div className="console-stat">
                    <span>Critical</span>
                    <strong style={{ color: '#e08d7d' }}>{totals ? totals.critical : '—'}</strong>
                  </div>
                </div>
                <div className="console-queue">
                  {queue.length
                    ? queue.map((item) => (
                        <div className="console-queue__row" key={item.ref}>
                          <span className="ref">{item.ref}</span>
                          <span className="title">{item.title}</span>
                          <span
                            className="sev"
                            style={{
                              background:
                                item.severity === 'critical' ? '#d4614f' : item.severity === 'high' ? '#d29a34' : '#7f8e56',
                            }}
                          />
                        </div>
                      ))
                    : Array.from({ length: 3 }).map((_, index) => (
                        <div className="console-queue__row" key={index}>
                          <span className="ref skeleton" style={{ width: 46, height: 8 }} />
                          <span className="title skeleton" style={{ height: 8 }} />
                        </div>
                      ))}
                </div>
              </div>
            </div>
            <div className="floating-card">
              <span className="floating-card__label">
                <Icon name="clock" size={11} />
                SLA watch
              </span>
              <strong>{overview ? `${overview.totals.slaBreaches} incidents past target` : 'Monitoring response targets'}</strong>
              <p>Department clocks recalculated on every status change.</p>
              <div className="floating-card__meter">
                <div className="meter meter--amber">
                  <span style={{ width: overview ? `${Math.min(100, overview.totals.slaBreaches * 18)}%` : '35%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="city-strip">
          {CITIES.map((city) => {
            const row = overview?.byCity.find((c) => c.city === city)
            return (
              <div className="city-strip__item" key={city}>
                <Icon name="pin" />
                <div>
                  <strong>
                    {city} <span style={{ fontWeight: 400 }}>· {CITY_META[city].tag}</span>
                  </strong>
                  <span>
                    {row ? `${row.open} open of ${row.total} complaints` : 'Pilot city · simulated dataset'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="band">
        <div className="band__inner">
          <div className="band__item">
            <strong>3</strong>
            <span>Cities in the Goa demonstration pilot</span>
          </div>
          <div className="band__item">
            <strong>10</strong>
            <span>Civic issue categories structured for triage</span>
          </div>
          <div className="band__item">
            <strong>8</strong>
            <span>Municipal departments with SLA targets</span>
          </div>
          <div className="band__item">
            <strong>100%</strong>
            <span>Illustrative data, clearly labelled throughout</span>
          </div>
        </div>
      </div>

      <section className="section section--ivory">
        <div className="section__inner">
          <div className="section-head-split">
            <div>
              <span className="eyebrow">The platform</span>
              <h2>One system for the whole civic loop.</h2>
            </div>
            <p>
              Reporting, triage, assignment and resolution stop living in separate registers. Every complaint has an owner, a
              clock and a visible outcome.
            </p>
          </div>

          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature" key={feature.title}>
                <span className="feature__icon">
                  <Icon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
                <div className="feature__meta">
                  {feature.meta.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="section__inner">
          <div className="section-head-split">
            <div>
              <span className="eyebrow">Accountability by design</span>
              <h2>A complaint is only closed when the fix is evidenced.</h2>
            </div>
            <p>
              Status changes are recorded with the actor, department and note. Resolution needs a summary and photographic
              evidence, so performance metrics mean something.
            </p>
          </div>

          <div className="workflow">
            {WORKFLOW.map((step) => (
              <div className="workflow-step" key={step.step}>
                <span className="workflow-step__num">STEP {step.step}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--ivory">
        <div className="section__inner">
          <div className="section-head-split">
            <div>
              <span className="eyebrow">Three surfaces</span>
              <h2>One civic record, three ways to work with it.</h2>
            </div>
            <p>Each workspace shares the same dataset and the same design system — no re-keying between citizen, municipal and analyst views.</p>
          </div>

          <div className="feature-grid">
            {SURFACES.map((surface) => (
              <Link to={surface.to} className="feature" key={surface.title}>
                <div className="row-between">
                  <span className="feature__icon">
                    <Icon name={surface.icon} />
                  </span>
                  <span className="mono" style={{ color: 'var(--slate-400)', fontSize: 9 }}>
                    {surface.tag}
                  </span>
                </div>
                <h3>{surface.title}</h3>
                <p>{surface.copy}</p>
                <ul className="check-list" style={{ marginTop: 4 }}>
                  {surface.points.map((point) => (
                    <li key={point}>
                      <Icon name="check" />
                      {point}
                    </li>
                  ))}
                </ul>
                <span className="eyebrow" style={{ marginTop: 8, color: 'var(--teal-600)' }}>
                  Open workspace <Icon name="arrowRight" size={13} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--paper">
        <div className="section__inner">
          <div className="section-head-split">
            <div>
              <span className="eyebrow">Goa pilot</span>
              <h2>Three very different civic pressures.</h2>
            </div>
            <p>
              The pilot deliberately spans a capital city, a tourism corridor and a commercial hub so the platform is tested
              against more than one pattern of municipal demand.
            </p>
          </div>

          <div className="city-grid">
            {CITIES.map((city) => {
              const row = overview?.byCity.find((c) => c.city === city)
              const detail = analytics?.cities.find((c) => c.name === city)
              return (
                <article className="city-card" key={city}>
                  <div className="city-card__top">
                    <h3>{city}</h3>
                    <span className="city-card__tag">{CITY_META[city].tag}</span>
                  </div>
                  <p>{CITY_META[city].blurb}</p>
                  <p style={{ color: 'var(--teal-700)', fontSize: 11.5 }}>{CITY_META[city].focus}</p>
                  <div className="city-card__stats">
                    <div>
                      <span>Open</span>
                      <strong>{row ? row.open : '—'}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{row ? row.total : '—'}</strong>
                    </div>
                    <div>
                      <span>Critical</span>
                      <strong style={{ color: detail?.critical ? 'var(--coral-700)' : undefined }}>{detail ? detail.critical : '—'}</strong>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="section__inner">
          <div className="section-head-split">
            <div>
              <span className="eyebrow">Intelligence layer</span>
              <h2 style={{ color: '#fbf8ef' }}>Patterns, not just paperwork.</h2>
            </div>
            <div style={{ color: 'rgba(243,239,227,0.6)', fontSize: 13.5, lineHeight: 1.65, maxWidth: '42ch' }}>
              The intelligence workspace reads the same complaint record for location stress, repeat failures, tourism exposure
              and departmental performance.
            </div>
          </div>

          <div className="grid grid--3">
            <div className="card card--dark card--pad">
              <span className="stat-label" style={{ color: 'rgba(243,239,227,0.5)' }}>Recurring groups</span>
              <div className="stat-value" style={{ color: '#fbf8ef' }}>
                {analytics ? analytics.recurrence.length : '—'}
              </div>
              <p className="card-sub" style={{ color: 'rgba(243,239,227,0.55)' }}>
                Locations where the same civic failure has been reported more than once.
              </p>
              <div style={{ marginTop: 16 }} className="stack gap-8">
                {analytics?.recurrence.slice(0, 2).map((group) => (
                  <div key={group.group} className="row-between" style={{ fontSize: 11.5, color: 'rgba(243,239,227,0.75)' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '74%' }}>{group.group}</span>
                    <span className="mono" style={{ color: 'var(--teal-400)', fontSize: 9.5 }}>{group.occurrences}×</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card--dark card--pad">
              <span className="stat-label" style={{ color: 'rgba(243,239,227,0.5)' }}>Tourism exposure</span>
              <div className="stat-value" style={{ color: '#fbf8ef' }}>
                {analytics ? formatNumber(analytics.tourism.visitorExposure) : '—'}
              </div>
              <p className="card-sub" style={{ color: 'rgba(243,239,227,0.55)' }}>
                People affected by coastal complaints in the Calangute corridor, from simulated reports.
              </p>
              <div className="row-wrap" style={{ marginTop: 16 }}>
                <span className="badge badge--dark badge--plain">{analytics?.tourism.hotspot ?? 'Calangute corridor'}</span>
                <span className="badge badge--dark badge--plain">{analytics?.tourism.openCritical ?? '—'} open critical</span>
              </div>
            </div>

            <div className="card card--dark card--pad">
              <span className="stat-label" style={{ color: 'rgba(243,239,227,0.5)' }}>Critical open</span>
              <div className="stat-value" style={{ color: '#fbf8ef' }}>
                {overview ? overview.totals.critical : '—'}
              </div>
              <p className="card-sub" style={{ color: 'rgba(243,239,227,0.55)' }}>
                Severe incidents still open across the three pilot cities, tracked against departmental SLA targets.
              </p>
              {overview?.priorityQueue[0] ? (
                <p className="card-sub" style={{ color: 'rgba(243,239,227,0.5)', marginTop: 16 }}>
                  Top priority {overview.priorityQueue[0].ref} · {overview.priorityQueue[0].city} ·{' '}
                  {timeAgo(overview.priorityQueue[0].reportedAt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--ivory">
        <div className="section__inner">
          <div className="grid grid--2" style={{ alignItems: 'stretch' }}>
            <div className="card card--pad">
              <span className="eyebrow">Built for scale</span>
              <h2 className="section-title" style={{ marginTop: 12, fontSize: 30 }}>
                Architecture that can leave Goa.
              </h2>
              <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7, color: 'var(--slate-500)' }}>
                Cities, wards, departments and incidents are first-class records. Adding a new municipality means adding
                configuration and data — not rebuilding the product.
              </p>
              <ul className="check-list" style={{ marginTop: 18 }}>
                <li>
                  <Icon name="check" /> Multi-city data model with ward-level locations
                </li>
                <li>
                  <Icon name="check" /> Department and SLA configuration per municipality
                </li>
                <li>
                  <Icon name="check" /> AI-ready triage fields prepared for Groq integration in the next phase
                </li>
                <li>
                  <Icon name="check" /> Accessible, keyboard-friendly, responsive interface
                </li>
              </ul>
              <div style={{ marginTop: 20 }}>
                <LinkButton to="/about" variant="ghost" size="sm" iconRight="arrowRight">
                  Read the architecture
                </LinkButton>
              </div>
            </div>

            <div className="card card--pad">
              <span className="eyebrow">Data transparency</span>
              <h2 className="section-title" style={{ marginTop: 12, fontSize: 30 }}>
                Clearly a demonstration.
              </h2>
              <div className="disclosure" style={{ marginTop: 14 }}>
                <Icon name="alertCircle" />
                <div>
                  <strong>All figures on this site are simulated.</strong> The Goa dataset was created for this hackathon
                  demonstration. It is not sourced from municipal records and must not be presented as official government
                  statistics or live complaints.
                </div>
              </div>
              <p style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.7, color: 'var(--slate-500)' }}>
                Citizens, reports, response times and resolution records are illustrative. The product architecture, database
                entities and interfaces are real and designed for a production pilot once municipal data-sharing is in place.
              </p>
              <div className="arch-grid">
                <div className="arch-item">
                  <span>Citizens</span>
                  <strong>8 demo profiles</strong>
                </div>
                <div className="arch-item">
                  <span>Incidents</span>
                  <strong>{overview ? overview.totals.total : '—'} records</strong>
                </div>
                <div className="arch-item">
                  <span>Departments</span>
                  <strong>{overview ? overview.departments.length : '—'} configured</strong>
                </div>
                <div className="arch-item">
                  <span>Locations</span>
                  <strong>17 wards &amp; neighbourhoods</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--tight section--ivory">
        <div className="section__inner">
          <div className="cta-panel">
            <div>
              <h2>See what a prioritised civic queue looks like.</h2>
              <p>
                Open the Goa demonstration workspaces. Every screen runs on the illustrative pilot dataset, so you can explore
                intake, assignment and resolution end to end.
              </p>
            </div>
            <div className="row-wrap">
              <LinkButton to="/authority" variant="accent" iconRight="arrowRight">
                Open authority dashboard
              </LinkButton>
              <LinkButton to="/citizen" variant="ghost-light">
                Citizen portal
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
