import { SiteFooter, SiteHeader } from '../components/Chrome'
import { Icon } from '../components/Icon'
import { Card, CardBody, CardHead, LinkButton, Notice } from '../components/ui'

const PRINCIPLES = [
  {
    title: 'Citizen-first intake',
    copy: 'Reporting is a two-minute task: a photograph, a voice note, a location. Language and accessibility support come next.',
  },
  {
    title: 'Explainable prioritisation',
    copy: 'Priority is a transparent score built from severity, affected population and recurrence — not an opaque ranking.',
  },
  {
    title: 'Accountability over activity',
    copy: 'Resolution needs evidence. Dashboards measure outcomes and SLA performance, not just closure counts.',
  },
  {
    title: 'Intelligence that changes decisions',
    copy: 'Analytics are tied to assignments, ward planning and recurring failure groups rather than decorative charts.',
  },
]

const ENTITIES = [
  { label: 'Citizens', value: 'Identity, ward, contact and notification preferences' },
  { label: 'Reports', value: 'Raw submission: title, description, media, channel' },
  { label: 'Incidents', value: 'The civic case: category, severity, priority, location, SLA' },
  { label: 'Departments', value: 'Ownership, SLA targets and resolution performance' },
  { label: 'Assignments', value: 'Officer, department, timestamp and handover note' },
  { label: 'Resolution records', value: 'Summary, evidence count, citizen confirmation, days to close' },
  { label: 'Status updates', value: 'Immutable timeline from intake to verification' },
  { label: 'Notifications', value: 'Citizen-facing status, assignment and resolution messages' },
]

const ROADMAP = [
  {
    phase: 'Phase 1 · this build',
    title: 'Product foundation',
    copy: 'Landing page, three connected dashboards, design system, navigation, responsive layouts and the seeded demonstration dataset.',
    status: 'Delivered',
  },
  {
    phase: 'Phase 2',
    title: 'Groq-powered triage',
    copy: 'Automatic category, severity and summary generation from complaint text and voice transcripts, with confidence review by the control room.',
    status: 'Prepared, not integrated',
  },
  {
    phase: 'Phase 3',
    title: 'Municipal accounts & workflows',
    copy: 'Role-based access for departments, ward officers and supervisors, plus assignment handovers and escalation rules.',
    status: 'Planned',
  },
  {
    phase: 'Phase 4',
    title: 'Live civic integrations',
    copy: 'Municipal GIS layers, real photograph storage, SMS and WhatsApp intake, and open data feeds for public accountability.',
    status: 'Planned',
  },
]

export function About() {
  return (
    <div className="landing">
      <SiteHeader theme="light" />

      <section className="section section--ivory" style={{ paddingBottom: 40 }}>
        <div className="section__inner">
          <div className="about-hero">
            <span className="eyebrow">About CivicMind</span>
            <h1>A civic operating layer for Indian cities.</h1>
            <p>
              CivicMind is an AI-ready civic intelligence and grievance resolution platform. It gives citizens a direct way to
              report public infrastructure problems, and gives municipal teams the structure to analyse, prioritise, assign and
              resolve them — with evidence.
            </p>
            <div className="row-wrap" style={{ marginTop: 24 }}>
              <LinkButton to="/citizen/report" variant="accent" iconRight="arrowRight">
                Try the citizen flow
              </LinkButton>
              <LinkButton to="/intelligence" variant="ghost" icon="map">
                Explore intelligence
              </LinkButton>
            </div>
          </div>

          <div className="about-layout">
            <div className="stack gap-18">
              <Card>
                <CardBody>
                  <span className="eyebrow">The problem</span>
                  <h3 className="section-title" style={{ fontSize: 24, marginTop: 10, marginBottom: 10 }}>
                    Complaints are collected. Action is not.
                  </h3>
                  <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--slate-500)' }}>
                    Most Indian municipalities already receive civic complaints — through phone lines, messaging groups, ward
                    offices and social media. What is missing is a shared record: one place where the report, the responsible
                    department, the service-level clock and the final evidence live together.
                  </p>
                  <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.7, color: 'var(--slate-500)' }}>
                    CivicMind closes that gap. Every complaint becomes an incident with a category, a priority, an owner and a
                    timeline. Citizens can see what happened. Departments can see what is waiting. Analysts can see what keeps
                    failing.
                  </p>
                  <div className="arch-grid" style={{ marginTop: 18 }}>
                    <div className="arch-item">
                      <span>Problem</span>
                      <strong>Fragmented intake</strong>
                    </div>
                    <div className="arch-item">
                      <span>Response</span>
                      <strong>One civic record</strong>
                    </div>
                    <div className="arch-item">
                      <span>Outcome</span>
                      <strong>Evidence-based closure</strong>
                    </div>
                    <div className="arch-item">
                      <span>Signal</span>
                      <strong>Recurring failure detection</strong>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHead title="Product principles" sub="The decisions that shaped this first build." />
                <CardBody>
                  <div className="principle-list">
                    {PRINCIPLES.map((principle, index) => (
                      <div className="principle" key={principle.title}>
                        <span className="principle__num">0{index + 1}</span>
                        <div>
                          <strong>{principle.title}</strong>
                          <p>{principle.copy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card id="architecture">
                <CardHead title="Architecture & data model" sub="Designed for a municipal pilot and multi-city expansion." />
                <CardBody>
                  <div className="stack gap-14">
                    <div className="insight">
                      <span className="insight__icon">
                        <Icon name="layers" />
                      </span>
                      <div>
                        <strong>React + TypeScript front end</strong>
                        <p>
                          A single responsive web application with modular pages, a reusable design system, shared chart
                          primitives and a custom schematic map.
                        </p>
                      </div>
                    </div>
                    <div className="insight">
                      <span className="insight__icon">
                        <Icon name="building" />
                      </span>
                      <div>
                        <strong>Worker API on an edge database</strong>
                        <p>
                          The backend is a Cloudflare Worker service backed by D1 (SQLite). Incidents, assignments and resolution
                          records are queried server-side with relational integrity.
                        </p>
                      </div>
                    </div>
                    <div className="insight">
                      <span className="insight__icon">
                        <Icon name="sparkle" />
                      </span>
                      <div>
                        <strong>AI-ready, not AI-dependent</strong>
                        <p>
                          Incident records already carry <code>ai_summary</code>, <code>ai_tags</code> and{' '}
                          <code>ai_confidence</code> fields. Groq integration arrives in the next phase; no AI is running in
                          this build.
                        </p>
                      </div>
                    </div>
                  </div>

                  <h4 className="card-title" style={{ marginTop: 20, marginBottom: 10 }}>
                    Core entities
                  </h4>
                  <div className="arch-grid">
                    {ENTITIES.map((entity) => (
                      <div className="arch-item" key={entity.label}>
                        <span>{entity.label}</span>
                        <strong style={{ fontWeight: 500, fontSize: 11.5, lineHeight: 1.45, color: 'var(--slate-600)' }}>
                          {entity.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card id="roadmap">
                <CardHead title="Roadmap" sub="What this phase includes, and what deliberately comes later." />
                <CardBody>
                  <div className="principle-list">
                    {ROADMAP.map((item) => (
                      <div className="principle" key={item.phase}>
                        <div style={{ minWidth: 118 }}>
                          <span className="principle__num" style={{ paddingTop: 0 }}>
                            {item.phase}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="row-between" style={{ alignItems: 'baseline' }}>
                            <strong>{item.title}</strong>
                            <span
                              className={`badge ${
                                item.status === 'Delivered'
                                  ? 'badge--resolved'
                                  : item.status === 'Prepared, not integrated'
                                    ? 'badge--review'
                                    : 'badge--low'
                              }`}
                              style={{ fontSize: 10 }}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p>{item.copy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="stack gap-18">
              <Card id="data" dark>
                <CardBody>
                  <span className="eyebrow" style={{ color: 'var(--teal-400)' }}>
                    Data disclosure
                  </span>
                  <h3 style={{ marginTop: 10, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, lineHeight: 1.1 }}>
                    Simulated, clearly labelled, never presented as official.
                  </h3>
                  <p style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.7, color: 'rgba(243,239,227,0.62)' }}>
                    The Goa dataset in this demonstration is synthetic. Complaint titles, citizens, timestamps, response times and
                    photographs are illustrative. Every dashboard carries a simulated-data label.
                  </p>
                  <div style={{ marginTop: 16 }}>
                    <Notice tone="amber">
                      <strong>No live municipal feed.</strong> This build does not connect to any government system, and no figure
                      should be cited as a government statistic.
                    </Notice>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHead title="Pilot coverage" sub="Three municipalities, chosen for contrasting civic pressure." />
                <CardBody>
                  <div className="stack gap-14">
                    <div>
                      <div className="row-between">
                        <strong style={{ fontSize: 12.5 }}>Panaji</strong>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                          Capital · pilot core
                        </span>
                      </div>
                      <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--slate-500)', lineHeight: 1.55 }}>
                        Drainage, heritage footpaths and promenade sanitation across ward-level reporting.
                      </p>
                    </div>
                    <hr className="divider" />
                    <div>
                      <div className="row-between">
                        <strong style={{ fontSize: 12.5 }}>Calangute</strong>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                          Coastal · tourism
                        </span>
                      </div>
                      <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--slate-500)', lineHeight: 1.55 }}>
                        Beach cleanliness, sanitation and access issues under seasonal visitor pressure.
                      </p>
                    </div>
                    <hr className="divider" />
                    <div>
                      <div className="row-between">
                        <strong style={{ fontSize: 12.5 }}>Margao</strong>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                          Commercial · drainage
                        </span>
                      </div>
                      <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--slate-500)', lineHeight: 1.55 }}>
                        Market waste, monsoon drainage and arterial road condition.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <span className="eyebrow">Scalability</span>
                  <h3 style={{ marginTop: 10, fontSize: 15, fontWeight: 600 }}>
                    New cities are data, not a rebuild.
                  </h3>
                  <ul className="check-list" style={{ marginTop: 10 }}>
                    <li>
                      <Icon name="check" /> Locations are city- and ward-scoped
                    </li>
                    <li>
                      <Icon name="check" /> Departments carry their own SLA targets
                    </li>
                    <li>
                      <Icon name="check" /> Categories are configuration, not hard-coded screens
                    </li>
                    <li>
                      <Icon name="check" /> Analytics aggregate by city without schema change
                    </li>
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <span className="eyebrow">Demo access</span>
                  <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--slate-500)', lineHeight: 1.6 }}>
                    This build has no authentication. The workspaces are open so reviewers can move between citizen, municipal
                    and intelligence views instantly.
                  </p>
                  <div className="stack gap-8" style={{ marginTop: 14 }}>
                    <LinkButton to="/citizen" variant="ghost" size="sm" block iconRight="arrowRight">
                      Citizen portal
                    </LinkButton>
                    <LinkButton to="/authority" variant="ghost" size="sm" block iconRight="arrowRight">
                      Authority dashboard
                    </LinkButton>
                    <LinkButton to="/intelligence" variant="ghost" size="sm" block iconRight="arrowRight">
                      Civic intelligence
                    </LinkButton>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
