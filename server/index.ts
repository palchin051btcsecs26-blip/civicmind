import { Hono } from 'hono'
import { SEED_CITIZENS, SEED_DEPARTMENTS, SEED_INCIDENTS, SEED_LOCATIONS, OFFICERS } from './seed'
import type { CitizenRow, DepartmentRow, IncidentRow, LocationRow, ResolutionRow, UpdateRow } from './types'
import { runAgent, type AgentResult, type ReferenceDepartment, type ReferenceIncident, type ReferenceLocation } from './ai'
import {
  clearSession,
  ensureAccounts,
  findAccountByEmail,
  hashPassword,
  identityFromAccount,
  initialsFor,
  issueSession,
  publicUser,
  resolveSession,
  verifyPassword,
  type SessionUser,
} from './auth'

type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
  GROQ_VISION_MODEL?: string
  GROQ_WHISPER_MODEL?: string
}

type Variables = { session: SessionUser | null }

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const CITIES = ['Panaji', 'Calangute', 'Margao'] as const
const PRIVATE_INCIDENT_FIELDS = ['citizen_name', 'citizen_initials', 'citizen_phone', 'citizen_email', 'reported_by']

function stripPrivateIncident(row: unknown): Record<string, unknown> {
  const copy = { ...(row as Record<string, unknown>) }
  for (const key of PRIVATE_INCIDENT_FIELDS) delete copy[key]
  return copy
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

const iso = (daysAgo: number) => {
  const d = new Date()
  d.setUTCHours(9, 30, 0, 0)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString()
}

const addDays = (isoDate: string, days: number) => {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

const daysBetween = (from: string, to: string) =>
  Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000))

const priorityFor = (severity: string, affected: number, recurring: boolean) => {
  const base = severity === 'critical' ? 74 : severity === 'high' ? 58 : severity === 'medium' ? 40 : 24
  const reach = Math.min(18, Math.round(affected / 70))
  return Math.min(99, base + reach + (recurring ? 6 : 0))
}

const refNumber = (ref: string) => Number(ref.replace(/[^0-9]/g, '')) || 0

let seedPromise: Promise<void> | null = null

async function seedIfEmpty(db: D1Database) {
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM incidents').first<{ n: number }>()
  if (existing && existing.n > 0) return

  const statements: D1PreparedStatement[] = []

  for (const c of SEED_CITIZENS) {
    statements.push(
      db
        .prepare('INSERT OR REPLACE INTO citizens (id, name, email, phone, city, ward, initials, created_at) VALUES (?,?,?,?,?,?,?,?)')
        .bind(c.id, c.name, c.email, c.phone, c.city, c.ward, c.initials, iso(120)),
    )
  }

  for (const d of SEED_DEPARTMENTS) {
    statements.push(
      db
        .prepare(
          'INSERT OR REPLACE INTO departments (id, name, short_name, head, city, contact_email, sla_target_days, open_cases, avg_resolution_days) VALUES (?,?,?,?,?,?,?,?,?)',
        )
        .bind(d.id, d.name, d.short_name, d.head, d.city, d.contact_email, d.sla_target_days, 0, 0),
    )
  }

  for (const l of SEED_LOCATIONS) {
    statements.push(
      db
        .prepare('INSERT OR REPLACE INTO locations (id, name, city, ward, lat, lng, kind) VALUES (?,?,?,?,?,?,?)')
        .bind(l.id, l.name, l.city, l.ward, l.lat, l.lng, 'neighbourhood'),
    )
  }

  SEED_INCIDENTS.forEach((inc, index) => {
    const id = `inc-${String(index + 1).padStart(3, '0')}`
    const reportId = `rep-${String(index + 1).padStart(3, '0')}`
    const reportedAt = iso(inc.reportedDaysAgo)
    const resolvedAt = inc.resolvedDaysAgo !== undefined ? iso(inc.resolvedDaysAgo) : null
    const dept = SEED_DEPARTMENTS.find((d) => d.id === inc.departmentId)
    const location = SEED_LOCATIONS.find((l) => l.id === inc.locationId)!
    const updatedAt = resolvedAt ?? iso(Math.max(0, inc.reportedDaysAgo - 1))
    const priority = priorityFor(inc.severity, inc.affectedPeople, Boolean(inc.recurrenceGroup))

    statements.push(
      db
        .prepare(
          'INSERT OR REPLACE INTO reports (id, citizen_id, location_id, title, description, category, channel, photo_count, voice_note, created_at, is_simulated) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
        )
        .bind(reportId, inc.citizenId, inc.locationId, inc.title, inc.description, inc.category, inc.voiceNote ? 'voice+web' : 'web', inc.photoCount, inc.voiceNote ? 1 : 0, reportedAt),
    )

    statements.push(
      db
        .prepare(
          `INSERT OR REPLACE INTO incidents
            (id, ref, report_id, title, description, category, city, location_id, lat, lng, severity, priority_score, status,
             department_id, reported_by, reported_at, updated_at, sla_due_at, resolved_at, recurrence_group, affected_people)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          id,
          inc.ref,
          reportId,
          inc.title,
          inc.description,
          inc.category,
          inc.city,
          inc.locationId,
          location.lat + (Math.random() - 0.5) * 0.004,
          location.lng + (Math.random() - 0.5) * 0.004,
          inc.severity,
          priority,
          inc.status,
          inc.departmentId,
          inc.citizenId,
          reportedAt,
          updatedAt,
          addDays(reportedAt, dept?.sla_target_days ?? 7),
          resolvedAt,
          inc.recurrenceGroup ?? null,
          inc.affectedPeople,
        ),
    )

    statements.push(
      db
        .prepare('INSERT OR REPLACE INTO incident_updates (id, incident_id, actor, from_status, to_status, note, created_at) VALUES (?,?,?,?,?,?,?)')
        .bind(
          `upd-${id}-1`,
          id,
          'CivicMind intake',
          null,
          'submitted',
          `Complaint received via ${inc.voiceNote ? 'voice note and web form' : 'web form'} with ${inc.photoCount} photo${inc.photoCount === 1 ? '' : 's'}. Routed to ${dept?.short_name ?? 'triage'}.`,
          reportedAt,
        ),
    )

    if (inc.status !== 'submitted') {
      statements.push(
        db
          .prepare('INSERT OR REPLACE INTO incident_updates (id, incident_id, actor, from_status, to_status, note, created_at) VALUES (?,?,?,?,?,?,?)')
          .bind(
            `upd-${id}-2`,
            id,
            dept?.head ?? 'Ward officer',
            'submitted',
            inc.status === 'resolved' ? 'in_progress' : inc.status,
            inc.status === 'resolved' ? 'Field inspection completed and works scheduled.' : 'Reviewed and assigned to the ward field team.',
            iso(Math.max(0, inc.reportedDaysAgo - 1)),
          ),
      )
    }

    if (inc.status === 'assigned' || inc.status === 'in_progress' || inc.status === 'resolved') {
      statements.push(
        db
          .prepare(
            'INSERT OR REPLACE INTO assignments (id, incident_id, department_id, assigned_to, assigned_by, assigned_at, note, status) VALUES (?,?,?,?,?,?,?,?)',
          )
          .bind(
            `asg-${id}`,
            id,
            inc.departmentId,
            OFFICERS[index % OFFICERS.length],
            'Municipal control room',
            iso(Math.max(0, inc.reportedDaysAgo - 1)),
            'Assigned with a field verification request and photo evidence requirement.',
            inc.status === 'resolved' ? 'complete' : 'active',
          ),
      )
    }

    if (resolvedAt) {
      const days = Math.max(0.5, Math.round(daysBetween(reportedAt, resolvedAt) * 10) / 10)
      statements.push(
        db
          .prepare(
            'INSERT OR REPLACE INTO resolution_records (id, incident_id, department_id, resolved_by, resolved_at, summary, evidence_count, citizen_confirmed, days_to_resolve) VALUES (?,?,?,?,?,?,?,?,?)',
          )
          .bind(
            `res-${id}`,
            id,
            inc.departmentId,
            dept?.head ?? 'Ward officer',
            resolvedAt,
            inc.resolutionSummary ?? 'Works completed and verified by the ward field team.',
            inc.evidenceCount ?? 2,
            inc.citizenConfirmed ? 1 : 0,
            days,
          ),
      )
    }
  })

  statements.push(
    ...SEED_CITIZENS.flatMap((c, i) => {
      const mine = SEED_INCIDENTS.filter((inc) => inc.citizenId === c.id).slice(0, 4)
      return mine.map((inc, j) =>
        db
          .prepare('INSERT OR REPLACE INTO notifications (id, citizen_id, incident_id, type, title, body, created_at, read) VALUES (?,?,?,?,?,?,?,?)')
          .bind(
            `ntf-${c.id}-${j}`,
            c.id,
            `inc-${String(SEED_INCIDENTS.indexOf(inc) + 1).padStart(3, '0')}`,
            inc.status === 'resolved' ? 'resolved' : j === 0 ? 'assigned' : 'status',
            inc.status === 'resolved' ? `${inc.ref} marked resolved` : `${inc.ref} status updated`,
            inc.status === 'resolved'
              ? 'Resolution evidence was uploaded and the complaint has been closed. Please confirm the fix.'
              : `Your complaint is now ${inc.status.replace('_', ' ')} with ${SEED_DEPARTMENTS.find((d) => d.id === inc.departmentId)?.short_name}.`,
            iso(Math.max(0, inc.reportedDaysAgo - 1)),
            i === 0 && j === 0 ? 0 : j > 1 ? 1 : 0,
          ),
      )
    }),
  )

  for (let i = 0; i < statements.length; i += 60) {
    await db.batch(statements.slice(i, i + 60))
  }

  // Derive live department load metrics from the seeded incidents.
  await db.batch([
    db.prepare(
      `UPDATE departments SET
        open_cases = (SELECT COUNT(*) FROM incidents i WHERE i.department_id = departments.id AND i.status != 'resolved'),
        avg_resolution_days = COALESCE((
          SELECT ROUND(AVG(r.days_to_resolve), 1) FROM resolution_records r WHERE r.department_id = departments.id
        ), 0)`,
    ),
  ])
}

async function ensureData(db: D1Database) {
  if (!seedPromise) {
    seedPromise = seedIfEmpty(db).catch((err) => {
      seedPromise = null
      throw err
    })
  }
  await seedPromise
}

app.use('/api/*', async (c, next) => {
  await ensureData(c.env.DB)
  await ensureAccounts(c.env.DB)

  const session = await resolveSession(c, c.env.DB)
  c.set('session', session)

  const path = new URL(c.req.url).pathname
  const isOpen = path === '/api/health' || path.startsWith('/api/auth/')
  if (!isOpen && !session) return json({ error: 'Sign in to continue.' }, 401)

  await next()
})

app.get('/api/health', () => json({ ok: true, service: 'civicmind-api', dataset: 'simulated-goa-demo' }))

/* ---------------------------------- Auth ---------------------------------- */

app.post('/api/auth/signup', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return json({ error: 'Invalid JSON body' }, 400)

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const city = String(body.city ?? '')
  const phone = body.phone ? String(body.phone).trim() : null

  if (name.length < 2) return json({ error: 'Enter your full name.' }, 422)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 422)
  if (password.length < 8) return json({ error: 'Use a password of at least 8 characters.' }, 422)
  if (!CITIES.includes(city as (typeof CITIES)[number])) return json({ error: 'Choose Panaji, Calangute or Margao.' }, 422)

  const existing = await c.env.DB.prepare('SELECT id FROM accounts WHERE lower(email) = lower(?)').bind(email).first()
  if (existing) return json({ error: 'An account with this email already exists. Log in instead.' }, 409)

  const citizenId = `cit-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
  const accountId = `acc-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
  const initials = initialsFor(name)
  const now = new Date().toISOString()
  const { hash, salt } = await hashPassword(password)

  try {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO citizens (id, name, email, phone, city, ward, initials, created_at) VALUES (?,?,?,?,?,?,?,?)').bind(
        citizenId,
        name,
        email,
        phone,
        city,
        null,
        initials,
        now,
      ),
      c.env.DB.prepare(
        'INSERT INTO accounts (id, role, name, email, password_hash, salt, citizen_id, created_at) VALUES (?,?,?,?,?,?,?,?)',
      ).bind(accountId, 'citizen', name, email, hash, salt, citizenId, now),
    ])
  } catch {
    return json({ error: 'This account could not be created. The email may already be in use.' }, 409)
  }

  const user = await issueSession(c, c.env.DB, { id: accountId, role: 'citizen', name, email, citizenId, city, initials })
  c.header('cache-control', 'no-store')
  return c.json({ ok: true, user: publicUser(user) }, 201)
})

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return json({ error: 'Invalid JSON body' }, 400)

  const email = String(body.email ?? '').trim()
  const password = String(body.password ?? '')
  const wantedRole = body.role === 'admin' ? 'admin' : 'citizen'

  if (!email || !password) return json({ error: 'Enter your email and password.' }, 422)

  const account = await findAccountByEmail(c.env.DB, email)
  if (!account || !(await verifyPassword(password, account)) || account.role !== wantedRole) {
    return json(
      {
        error:
          wantedRole === 'admin'
            ? 'These credentials do not match a municipal authority account.'
            : 'Email or password is incorrect.',
      },
      401,
    )
  }

  const user = await issueSession(c, c.env.DB, identityFromAccount(account))
  c.header('cache-control', 'no-store')
  return c.json({ ok: true, user: publicUser(user) })
})

app.post('/api/auth/guest', async (c) => {
  const user = await issueSession(c, c.env.DB, null)
  c.header('cache-control', 'no-store')
  return c.json({ ok: true, user: publicUser(user) })
})

app.post('/api/auth/logout', async (c) => {
  await clearSession(c, c.env.DB)
  c.header('cache-control', 'no-store')
  return c.json({ ok: true })
})

app.get('/api/auth/me', (c) => {
  const session = c.get('session')
  c.header('cache-control', 'no-store')
  return c.json({ user: session ? publicUser(session) : null })
})

app.get('/api/incidents', async (c) => {
  const { city, category, status, severity, q, department, limit } = c.req.query()
  const where: string[] = []
  const binds: (string | number)[] = []

  if (city && city !== 'All') { where.push('i.city = ?'); binds.push(city) }
  if (category && category !== 'All') { where.push('i.category = ?'); binds.push(category) }
  if (status && status !== 'All') { where.push('i.status = ?'); binds.push(status) }
  if (severity && severity !== 'All') { where.push('i.severity = ?'); binds.push(severity) }
  if (department && department !== 'All') { where.push('i.department_id = ?'); binds.push(department) }
  if (q) { where.push('(i.title LIKE ? OR i.ref LIKE ? OR l.name LIKE ?)'); binds.push(`%${q}%`, `%${q}%`, `%${q}%`) }

  const sql = `
    SELECT i.*, l.name AS location_name, l.ward AS ward, d.short_name AS department_short, d.name AS department_name,
           c.name AS citizen_name, c.initials AS citizen_initials,
           (SELECT photo_count FROM reports r WHERE r.id = i.report_id) AS photo_count,
           (SELECT COUNT(*) FROM assignments a WHERE a.incident_id = i.id) AS assignment_count,
           (SELECT COUNT(*) FROM resolution_records r WHERE r.incident_id = i.id) AS resolution_count
    FROM incidents i
    LEFT JOIN locations l ON l.id = i.location_id
    LEFT JOIN departments d ON d.id = i.department_id
    LEFT JOIN citizens c ON c.id = i.reported_by
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY i.priority_score DESC, i.reported_at DESC
    ${limit ? `LIMIT ${Number(limit) || 100}` : ''}`

  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  return json({ incidents: session.role === 'admin' ? results : (results as unknown[]).map(stripPrivateIncident) })
})

app.get('/api/incidents/:ref', async (c) => {
  const ref = c.req.param('ref')
  const incident = await c.env.DB.prepare(
    `SELECT i.*, l.name AS location_name, l.ward AS ward, l.kind AS location_kind,
            d.short_name AS department_short, d.name AS department_name, d.head AS department_head, d.sla_target_days,
            c.name AS citizen_name, c.initials AS citizen_initials, c.phone AS citizen_phone, c.email AS citizen_email,
            (SELECT photo_count FROM reports r WHERE r.id = i.report_id) AS photo_count
     FROM incidents i
     LEFT JOIN locations l ON l.id = i.location_id
     LEFT JOIN departments d ON d.id = i.department_id
     LEFT JOIN citizens c ON c.id = i.reported_by
     WHERE i.ref = ? OR i.id = ?`,
  ).bind(ref, ref).first()

  if (!incident) return json({ error: 'Incident not found' }, 404)

  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  const owner = (incident as unknown as IncidentRow).reported_by
  if (session.role === 'citizen' && owner !== session.citizenId) {
    return json({ error: 'This complaint belongs to another citizen.' }, 403)
  }

  const id = (incident as { id: string }).id
  const [updates, assignment, resolution] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at ASC').bind(id).all<UpdateRow>(),
    c.env.DB.prepare('SELECT a.*, d.short_name AS department_short FROM assignments a LEFT JOIN departments d ON d.id = a.department_id WHERE a.incident_id = ? ORDER BY a.assigned_at DESC').bind(id).all(),
    c.env.DB.prepare('SELECT * FROM resolution_records WHERE incident_id = ? LIMIT 1').bind(id).first<ResolutionRow>(),
  ])

  const canSeeInternal = session.role === 'admin'
  return json({
    incident: canSeeInternal ? incident : stripPrivateIncident(incident),
    updates: updates.results,
    assignment: canSeeInternal ? assignment.results[0] ?? null : null,
    resolution,
  })
})

app.post('/api/incidents', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return json({ error: 'Invalid JSON body' }, 400)

  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'citizen' || !session.citizenId) {
    return json({ error: 'Only signed-in citizen accounts can file a complaint.' }, 403)
  }

  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const category = String(body.category ?? '').trim()
  const city = String(body.city ?? 'Panaji')
  const locationId = String(body.locationId ?? '')
  const severity = String(body.severity ?? 'medium')
  const citizenId = session.citizenId
  const photoCount = Number(body.photoCount ?? 0)
  const voiceNote = Boolean(body.voiceNote)

  if (title.length < 8) return json({ error: 'A short title of at least 8 characters is required.' }, 422)
  if (description.length < 15) return json({ error: 'Please describe the issue in at least 15 characters.' }, 422)
  if (!category) return json({ error: 'Choose a category.' }, 422)

  const location = await c.env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(locationId).first<LocationRow>()
  if (!location) return json({ error: 'Choose a valid location.' }, 422)

  const last = await c.env.DB.prepare("SELECT ref FROM incidents ORDER BY CAST(REPLACE(ref,'CM-','') AS INTEGER) DESC LIMIT 1").first<{ ref: string }>()
  const nextNumber = Math.max(2077, refNumber(last?.ref ?? 'CM-2076') + 1)
  const ref = `CM-${nextNumber}`
  const id = `inc-new-${Date.now()}`
  const reportId = `rep-new-${Date.now()}`
  const now = new Date().toISOString()
  const affected = Number(body.affectedPeople ?? 120)
  const priority = priorityFor(severity, affected, false)

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO reports (id, citizen_id, location_id, title, description, category, channel, photo_count, voice_note, created_at, is_simulated) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
    ).bind(reportId, citizenId, locationId, title, description, category, voiceNote ? 'voice+web' : 'web', photoCount, voiceNote ? 1 : 0, now),
    c.env.DB.prepare(
      `INSERT INTO incidents (id, ref, report_id, title, description, category, city, location_id, lat, lng, severity, priority_score, status, reported_by, reported_at, updated_at, sla_due_at, affected_people)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'submitted',?,?,?,?,?)`,
    ).bind(id, ref, reportId, title, description, category, city, locationId, location.lat, location.lng, severity, priority, citizenId, now, now, addDays(now, 7), affected),
    c.env.DB.prepare('INSERT INTO incident_updates (id, incident_id, actor, from_status, to_status, note, created_at) VALUES (?,?,?,?,?,?,?)').bind(
      `upd-${id}`,
      id,
      'CivicMind intake',
      null,
      'submitted',
      `Complaint received${photoCount ? ` with ${photoCount} photo${photoCount === 1 ? '' : 's'}` : ''}${voiceNote ? ' and a voice note' : ''}. Awaiting municipal triage.`,
      now,
    ),
    c.env.DB.prepare('INSERT INTO notifications (id, citizen_id, incident_id, type, title, body, created_at, read) VALUES (?,?,?,?,?,?,?,0)').bind(
      `ntf-${id}`,
      citizenId,
      id,
      'receipt',
      `${ref} received`,
      'Your complaint has been logged and will be reviewed by the municipal control room.',
      now,
    ),
  ])

  return json({ ok: true, incident: { id, ref, status: 'submitted', title, city, priority_score: priority } }, 201)
})

app.patch('/api/incidents/:ref', async (c) => {
  const ref = c.req.param('ref')
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'admin') return json({ error: 'Municipal authority access is required.' }, 403)
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return json({ error: 'Invalid JSON body' }, 400)

  const incident = await c.env.DB.prepare('SELECT * FROM incidents WHERE ref = ? OR id = ?').bind(ref, ref).first<IncidentRow>()
  if (!incident) return json({ error: 'Incident not found' }, 404)

  const status = body.status ? String(body.status) : incident.status
  const severity = body.severity ? String(body.severity) : incident.severity
  const departmentId = body.departmentId ? String(body.departmentId) : incident.department_id
  const note = body.note ? String(body.note) : null
  const now = new Date().toISOString()

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare('UPDATE incidents SET status = ?, severity = ?, department_id = ?, updated_at = ? WHERE id = ?').bind(
      status,
      severity,
      departmentId,
      now,
      incident.id,
    ),
    c.env.DB.prepare('INSERT INTO incident_updates (id, incident_id, actor, from_status, to_status, note, created_at) VALUES (?,?,?,?,?,?,?)').bind(
      `upd-${Date.now()}`,
      incident.id,
      String(body.actor ?? 'Municipal control room'),
      incident.status,
      status,
      note ?? `Status set to ${status.replace('_', ' ')}.`,
      now,
    ),
    c.env.DB.prepare('INSERT INTO notifications (id, citizen_id, incident_id, type, title, body, created_at, read) VALUES (?,?,?,?,?,?,?,0)').bind(
      `ntf-${Date.now()}`,
      incident.reported_by ?? 'cit-001',
      incident.id,
      status === 'resolved' ? 'resolved' : 'status',
      `${incident.ref} ${status === 'resolved' ? 'marked resolved' : 'status updated'}`,
      note ?? `Your complaint is now ${status.replace('_', ' ')}.`,
      now,
    ),
  ]

  if (status === 'resolved' && incident.status !== 'resolved') {
    const dept = await c.env.DB.prepare('SELECT * FROM departments WHERE id = ?').bind(departmentId).first<DepartmentRow>()
    statements.push(
      c.env.DB.prepare('UPDATE incidents SET resolved_at = ? WHERE id = ?').bind(now, incident.id),
      c.env.DB.prepare(
        'INSERT INTO resolution_records (id, incident_id, department_id, resolved_by, resolved_at, summary, evidence_count, citizen_confirmed, days_to_resolve) VALUES (?,?,?,?,?,?,?,0,?)',
      ).bind(
        `res-${Date.now()}`,
        incident.id,
        departmentId,
        String(body.actor ?? dept?.head ?? 'Ward officer'),
        now,
        String(body.resolutionSummary ?? 'Works completed and verified by the ward field team.'),
        Number(body.evidenceCount ?? 1),
        Math.max(0.5, daysBetween(incident.reported_at, now)),
      ),
    )
    if (departmentId) {
      statements.push(
        c.env.DB.prepare(
          "UPDATE departments SET open_cases = (SELECT COUNT(*) FROM incidents i WHERE i.department_id = departments.id AND i.status != 'resolved') WHERE id = ?",
        ).bind(departmentId),
      )
    }
  }

  await c.env.DB.batch(statements)
  const updated = await c.env.DB.prepare('SELECT * FROM incidents WHERE id = ?').bind(incident.id).first<IncidentRow>()
  return json({ ok: true, incident: updated })
})

app.post('/api/incidents/:ref/assignments', async (c) => {
  const ref = c.req.param('ref')
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'admin') return json({ error: 'Municipal authority access is required.' }, 403)
  const body = (await c.req.json<Record<string, unknown>>().catch(() => ({}))) as Record<string, unknown>
  const incident = await c.env.DB.prepare('SELECT * FROM incidents WHERE ref = ? OR id = ?').bind(ref, ref).first<IncidentRow>()
  if (!incident) return json({ error: 'Incident not found' }, 404)

  const departmentId = String(body.departmentId ?? incident.department_id ?? 'dept-pwd')
  const department = await c.env.DB.prepare('SELECT * FROM departments WHERE id = ?').bind(departmentId).first<DepartmentRow>()
  if (!department) return json({ error: 'Department not found' }, 404)

  const now = new Date().toISOString()
  const assignedTo = String(body.assignedTo ?? OFFICERS[Math.floor(Math.random() * OFFICERS.length)])

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO assignments (id, incident_id, department_id, assigned_to, assigned_by, assigned_at, note, status) VALUES (?,?,?,?,?,?,?,?)',
    ).bind(
      `asg-${Date.now()}`,
      incident.id,
      departmentId,
      assignedTo,
      String(body.assignedBy ?? 'Municipal control room'),
      now,
      String(body.note ?? `Assigned to ${department.short_name} for field verification.`),
      'active',
    ),
    c.env.DB.prepare(
      "UPDATE incidents SET department_id = ?, status = CASE WHEN status = 'submitted' OR status = 'under_review' THEN 'assigned' ELSE status END, updated_at = ? WHERE id = ?",
    ).bind(departmentId, now, incident.id),
    c.env.DB.prepare('INSERT INTO incident_updates (id, incident_id, actor, from_status, to_status, note, created_at) VALUES (?,?,?,?,?,?,?)').bind(
      `upd-${Date.now()}`,
      incident.id,
      'Municipal control room',
      incident.status,
      incident.status === 'submitted' || incident.status === 'under_review' ? 'assigned' : incident.status,
      `Assigned to ${assignedTo} (${department.short_name}).`,
      now,
    ),
  ])

  return json({ ok: true, department: department.short_name, assignedTo })
})

app.post('/api/incidents/:ref/resolutions', async (c) => {
  const ref = c.req.param('ref')
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'admin') return json({ error: 'Municipal authority access is required.' }, 403)
  const body = (await c.req.json<Record<string, unknown>>().catch(() => ({}))) as Record<string, unknown>
  const incident = await c.env.DB.prepare('SELECT * FROM incidents WHERE ref = ? OR id = ?').bind(ref, ref).first<IncidentRow>()
  if (!incident) return json({ error: 'Incident not found' }, 404)

  const summary = String(body.summary ?? '').trim()
  if (summary.length < 10) return json({ error: 'Add a short resolution summary.' }, 422)

  const now = new Date().toISOString()
  const evidenceCount = Number(body.evidenceCount ?? 1)

  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO resolution_records (id, incident_id, department_id, resolved_by, resolved_at, summary, evidence_count, citizen_confirmed, days_to_resolve) VALUES (?,?,?,?,?,?,?,?,?)',
    ).bind(
      `res-${incident.id}`,
      incident.id,
      incident.department_id,
      String(body.resolvedBy ?? 'Ward field team'),
      now,
      summary,
      evidenceCount,
      0,
      Math.max(0.5, daysBetween(incident.reported_at, now)),
    ),
    c.env.DB.prepare("UPDATE incidents SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE id = ?").bind(now, now, incident.id),
    c.env.DB.prepare('INSERT INTO incident_updates (id, incident_id, actor, from_status, to_status, note, created_at) VALUES (?,?,?,?,?,?,?)').bind(
      `upd-${Date.now()}`,
      incident.id,
      String(body.resolvedBy ?? 'Ward field team'),
      incident.status,
      'resolved',
      `Resolution evidence uploaded (${evidenceCount} file${evidenceCount === 1 ? '' : 's'}). ${summary}`,
      now,
    ),
    c.env.DB.prepare('INSERT INTO notifications (id, citizen_id, incident_id, type, title, body, created_at, read) VALUES (?,?,?,?,?,?,?,0)').bind(
      `ntf-${Date.now()}`,
      incident.reported_by ?? 'cit-001',
      incident.id,
      'resolved',
      `${incident.ref} marked resolved`,
      'Resolution evidence has been uploaded. Please confirm whether the issue is fixed.',
      now,
    ),
  ])

  return json({ ok: true })
})

app.get('/api/overview', async (c) => {
  const [cityRows, categoryRows, statusRows, deptRows, allIncidents, resolvedRows] = await Promise.all([
    c.env.DB.prepare('SELECT city, COUNT(*) AS total, SUM(CASE WHEN status != \'resolved\' THEN 1 ELSE 0 END) AS open FROM incidents GROUP BY city').all<{ city: string; total: number; open: number }>(),
    c.env.DB.prepare('SELECT category, COUNT(*) AS total FROM incidents GROUP BY category ORDER BY total DESC').all<{ category: string; total: number }>(),
    c.env.DB.prepare("SELECT status, COUNT(*) AS total FROM incidents GROUP BY status").all<{ status: string; total: number }>(),
    c.env.DB.prepare('SELECT * FROM departments ORDER BY name').all<DepartmentRow>(),
    c.env.DB.prepare('SELECT * FROM incidents').all<IncidentRow>(),
    c.env.DB.prepare('SELECT * FROM resolution_records').all<ResolutionRow>(),
  ])

  const incidents = allIncidents.results
  const resolutions = resolvedRows.results
  const open = incidents.filter((i) => i.status !== 'resolved')
  const resolved = incidents.filter((i) => i.status === 'resolved')
  const slaBreaches = open.filter((i) => i.sla_due_at && new Date(i.sla_due_at) < new Date())
  const avgResolution = resolutions.length
    ? Math.round((resolutions.reduce((sum, r) => sum + r.days_to_resolve, 0) / resolutions.length) * 10) / 10
    : 0

  const bucket = (date: Date) => date.toISOString().slice(0, 10)
  const trend: { date: string; received: number; resolved: number }[] = []
  for (let d = 20; d >= 0; d--) {
    const day = new Date()
    day.setUTCHours(0, 0, 0, 0)
    day.setUTCDate(day.getUTCDate() - d)
    const key = bucket(day)
    trend.push({
      date: key,
      received: incidents.filter((i) => bucket(new Date(i.reported_at)) === key).length,
      resolved: resolutions.filter((r) => bucket(new Date(r.resolved_at)) === key).length,
    })
  }

  return json({
    dataset: 'simulated',
    generatedAt: new Date().toISOString(),
    totals: {
      total: incidents.length,
      open: open.length,
      resolved: resolved.length,
      critical: open.filter((i) => i.severity === 'critical').length,
      slaBreaches: slaBreaches.length,
      avgResolutionDays: avgResolution,
      affectedPeople: incidents.reduce((sum, i) => sum + i.affected_people, 0),
      resolutionRate: incidents.length ? Math.round((resolved.length / incidents.length) * 100) : 0,
    },
    byStatus: Object.fromEntries(statusRows.results.map((r) => [r.status, r.total])),
    byCity: cityRows.results,
    byCategory: categoryRows.results,
    departments: deptRows.results,
    trend,
    priorityQueue: open
      .slice()
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 6)
      .map((i) => ({
        ref: i.ref,
        title: i.title,
        city: i.city,
        category: i.category,
        severity: i.severity,
        status: i.status,
        priorityScore: i.priority_score,
        reportedAt: i.reported_at,
        department: deptRows.results.find((d) => d.id === i.department_id)?.short_name ?? 'Unassigned',
        affectedPeople: i.affected_people,
      })),
  })
})

app.get('/api/analytics', async (c) => {
  const [incidentsRes, deptsRes, locationsRes, resolutionsRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM incidents').all<IncidentRow>(),
    c.env.DB.prepare('SELECT * FROM departments').all<DepartmentRow>(),
    c.env.DB.prepare('SELECT * FROM locations').all<LocationRow>(),
    c.env.DB.prepare('SELECT * FROM resolution_records').all<ResolutionRow>(),
  ])

  const incidents = incidentsRes.results
  const departments = deptsRes.results
  const locations = locationsRes.results
  const resolutions = resolutionsRes.results

  const cities = ['Panaji', 'Calangute', 'Margao'] as const
  const categoryByCity = cities.map((city) => {
    const rows = incidents.filter((i) => i.city === city)
    const counts: Record<string, number> = {}
    for (const row of rows) counts[row.category] = (counts[row.category] ?? 0) + 1
    return { city, total: rows.length, categories: counts }
  })

  const recurrenceMap = new Map<string, IncidentRow[]>()
  for (const inc of incidents) {
    if (!inc.recurrence_group) continue
    const list = recurrenceMap.get(inc.recurrence_group) ?? []
    list.push(inc)
    recurrenceMap.set(inc.recurrence_group, list)
  }

  const recurrence = [...recurrenceMap.entries()]
    .map(([group, rows]) => ({
      group,
      city: rows[0].city,
      occurrences: rows.length,
      category: rows[0].category,
      openCount: rows.filter((r) => r.status !== 'resolved').length,
      affectedPeople: rows.reduce((sum, r) => sum + r.affected_people, 0),
      lastReportedAt: rows.map((r) => r.reported_at).sort().at(-1),
      heat: Math.min(100, 30 + rows.length * 22 + Math.round(rows.reduce((s, r) => s + r.affected_people, 0) / 300)),
    }))
    .sort((a, b) => b.heat - a.heat)

  const performance = departments.map((dept) => {
    const mine = incidents.filter((i) => i.department_id === dept.id)
    const resolved = mine.filter((i) => i.status === 'resolved')
    const resolutionRows = resolutions.filter((r) => r.department_id === dept.id)
    const avg = resolutionRows.length
      ? Math.round((resolutionRows.reduce((s, r) => s + r.days_to_resolve, 0) / resolutionRows.length) * 10) / 10
      : 0
    const withinSla = resolutionRows.filter((r) => r.days_to_resolve <= dept.sla_target_days).length
    return {
      id: dept.id,
      name: dept.name,
      shortName: dept.short_name,
      head: dept.head,
      slaTargetDays: dept.sla_target_days,
      assigned: mine.length,
      resolved: resolved.length,
      open: mine.length - resolved.length,
      avgResolutionDays: avg,
      slaCompliance: resolutionRows.length ? Math.round((withinSla / resolutionRows.length) * 100) : 100,
    }
  })

  const heat = locations.map((loc) => {
    const rows = incidents.filter((i) => i.location_id === loc.id)
    const open = rows.filter((i) => i.status !== 'resolved').length
    const intensity = rows.reduce((sum, r) => sum + (r.severity === 'critical' ? 3 : r.severity === 'high' ? 2 : 1), 0)
    return {
      id: loc.id,
      name: loc.name,
      city: loc.city,
      lat: loc.lat,
      lng: loc.lng,
      total: rows.length,
      open,
      intensity,
      topCategory: rows.length
        ? Object.entries(rows.reduce<Record<string, number>>((acc, r) => { acc[r.category] = (acc[r.category] ?? 0) + 1; return acc }, {}))
            .sort((a, b) => b[1] - a[1])[0][0]
        : null,
    }
  })

  const tourismCategories = ['Beach Cleanliness', 'Public Sanitation', 'Waste Management', 'Traffic & Signage']
  const tourismIncidents = incidents.filter(
    (i) => i.city === 'Calangute' && (tourismCategories.includes(i.category) || i.category === 'Roads & Potholes' || i.category === 'Drainage & Flooding'),
  )

  const tourism = {
    city: 'Calangute',
    linkedIncidents: tourismIncidents.length,
    beachAndSanitation: tourismIncidents.filter((i) => i.category === 'Beach Cleanliness' || i.category === 'Public Sanitation').length,
    resolved: tourismIncidents.filter((i) => i.status === 'resolved').length,
    openCritical: tourismIncidents.filter((i) => i.status !== 'resolved' && i.severity === 'critical').length,
    visitorExposure: tourismIncidents.reduce((sum, i) => sum + i.affected_people, 0),
    byCategory: tourismCategories.map((category) => ({
      category,
      total: incidents.filter((i) => i.city === 'Calangute' && i.category === category).length,
    })),
    hotspot: 'Calangute beach stretch',
    note: 'Tourism exposure is modelled from complaint volume in visitor-heavy wards. It is an illustrative index, not an official visitor count.',
  }

  return json({
    dataset: 'simulated',
    generatedAt: new Date().toISOString(),
    cities: cities.map((name) => ({
      name,
      lat: locations.find((l) => l.city === name)?.lat ?? 0,
      lng: locations.find((l) => l.city === name)?.lng ?? 0,
      total: incidents.filter((i) => i.city === name).length,
      open: incidents.filter((i) => i.city === name && i.status !== 'resolved').length,
      critical: incidents.filter((i) => i.city === name && i.status !== 'resolved' && i.severity === 'critical').length,
      resolved: incidents.filter((i) => i.city === name && i.status === 'resolved').length,
    })),
    cityTotals: categoryByCity,
    categoryByCity,
    recurrence,
    performance,
    heat,
    tourism,
    severityMix: ['critical', 'high', 'medium', 'low'].map((severity) => ({
      severity,
      total: incidents.filter((i) => i.severity === severity).length,
    })),
  })
})

app.get('/api/departments', async (c) => {
  const [depts, incidents] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM departments ORDER BY name').all<DepartmentRow>(),
    c.env.DB.prepare('SELECT department_id, status FROM incidents').all<{ department_id: string; status: string }>(),
  ])
  return json({
    departments: depts.results.map((d) => {
      const mine = incidents.results.filter((i) => i.department_id === d.id)
      return { ...d, open_cases: mine.filter((i) => i.status !== 'resolved').length, total_cases: mine.length }
    }),
  })
})

app.get('/api/citizen', async (c) => {
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'citizen' || !session.citizenId) {
    return json({ error: 'Citizen access is required for this workspace.' }, 403)
  }
  const id = session.citizenId
  const citizen = await c.env.DB.prepare('SELECT * FROM citizens WHERE id = ?').bind(id).first<CitizenRow>()
  if (!citizen) return json({ error: 'Citizen not found' }, 404)

  const [reports, notifications] = await Promise.all([
    c.env.DB.prepare(
      `SELECT i.*, l.name AS location_name, d.short_name AS department_short,
              (SELECT COUNT(*) FROM resolution_records r WHERE r.incident_id = i.id) AS resolution_count
       FROM incidents i
       LEFT JOIN locations l ON l.id = i.location_id
       LEFT JOIN departments d ON d.id = i.department_id
       WHERE i.reported_by = ? ORDER BY i.reported_at DESC`,
    ).bind(id).all(),
    c.env.DB.prepare('SELECT * FROM notifications WHERE citizen_id = ? ORDER BY created_at DESC').bind(id).all(),
  ])

  const mine = reports.results as unknown as IncidentRow[]
  const resolved = mine.filter((i) => i.status === 'resolved')

  return json({
    citizen,
    reports: reports.results,
    notifications: notifications.results,
    stats: {
      total: mine.length,
      open: mine.length - resolved.length,
      resolved: resolved.length,
      awaitingConfirmation: resolved.length,
      photos: 0,
    },
    unreadNotifications: (notifications.results as { read: number }[]).filter((n) => !n.read).length,
  })
})

app.get('/api/notifications', async (c) => {
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'citizen' || !session.citizenId) return json({ error: 'Citizen access is required.' }, 403)
  const id = session.citizenId
  const { results } = await c.env.DB.prepare(
    `SELECT n.*, i.ref, i.city, i.category FROM notifications n LEFT JOIN incidents i ON i.id = n.incident_id
     WHERE n.citizen_id = ? ORDER BY n.created_at DESC`,
  ).bind(id).all()
  return json({ notifications: results })
})

app.post('/api/notifications/:id/read', async (c) => {
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'citizen' || !session.citizenId) return json({ error: 'Citizen access is required.' }, 403)
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND citizen_id = ?')
    .bind(c.req.param('id'), session.citizenId)
    .run()
  return json({ ok: true })
})

app.post('/api/notifications/read-all', async (c) => {
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to continue.' }, 401)
  if (session.role !== 'citizen' || !session.citizenId) return json({ error: 'Citizen access is required.' }, 403)
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE citizen_id = ?').bind(session.citizenId).run()
  return json({ ok: true })
})

app.get('/api/meta', async (c) => {
  const session = c.get('session')
  const [locations, departments, citizens] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM locations ORDER BY city, name').all<LocationRow>(),
    c.env.DB.prepare('SELECT id, name, short_name, head, sla_target_days FROM departments ORDER BY name').all(),
    c.env.DB.prepare('SELECT id, name, initials, city FROM citizens ORDER BY name').all(),
  ])
  return json({
    locations: locations.results,
    departments: departments.results,
    citizens: session?.role === 'admin' ? citizens.results : [],
  })
})

/* --------------------------------- AI agent -------------------------------- */

const PERSONAL_COMPLAINT = /\b(complaint|complaints|report|reports|issue|issues|case|cases)\b/i
const STATUS_QUESTION =
  /\b(status|update|updates|track|progress|where|what|when|how|show|list|summar|closed|resolved|open|latest)\b/i

function asksAboutOwnComplaints(message: string) {
  if (/CM-\d+/i.test(message)) return true
  return /\b(my|mine)\b/i.test(message) && PERSONAL_COMPLAINT.test(message) && STATUS_QUESTION.test(message)
}

interface PersonalComplaintRow {
  id: string
  ref: string
  title: string
  status: string
  severity: string
  category: string
  priority_score: number
  updated_at: string
  department_short: string | null
}

function complaintStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}

function complaintNextStep(status: string) {
  if (status === 'submitted') return 'It has been received and is waiting for intake routing.'
  if (status === 'under_review') return 'The department is reviewing it before field assignment.'
  if (status === 'assigned') return 'A field team has been assigned and should verify the site next.'
  if (status === 'in_progress') return 'Work is in progress with the assigned department.'
  if (status === 'resolved') return 'It is closed. If the fix is not right, reopen it from your complaint page.'
  return 'The municipal team has the latest update on this case.'
}

async function answerFromComplaintRecords(
  db: D1Database,
  citizenId: string,
  message: string,
): Promise<AgentResult | null> {
  if (!asksAboutOwnComplaints(message)) return null

  const { results } = await db
    .prepare(
      `SELECT i.id, i.ref, i.title, i.status, i.severity, i.category, i.priority_score, i.updated_at,
              d.short_name AS department_short
       FROM incidents i
       LEFT JOIN departments d ON d.id = i.department_id
       WHERE i.reported_by = ?
       ORDER BY i.reported_at DESC`,
    )
    .bind(citizenId)
    .all<PersonalComplaintRow>()

  const ref = message.match(/CM-\d+/i)?.[0]?.toUpperCase() ?? null
  const reports = results ?? []

  if (!reports.length) {
    return {
      source: 'local',
      kind: 'records',
      reply:
        "I could not find any complaints filed from your CivicMind account yet. Describe the issue here for a classification, or use Report an issue to file it with the municipality.",
      duplicates: [],
      matchedIncidentIds: [],
      imageAnalysed: false,
      notice: 'Answered from the complaint records attached to your CivicMind account.',
    }
  }

  const target = ref ? reports.find((report) => report.ref === ref) ?? null : null
  if (ref && !target) {
    return {
      source: 'local',
      kind: 'records',
      reply: `I cannot find ${ref} among the complaints filed from your CivicMind account. For privacy, I can only read your own complaint records. Ask me about another reference, or open My complaints to review your full history.`,
      duplicates: [],
      matchedIncidentIds: [],
      imageAnalysed: false,
      notice: 'Answered from the complaint records attached to your CivicMind account.',
    }
  }

  const selected = target ? [target] : reports.slice(0, 5)
  const open = reports.filter((report) => report.status !== 'resolved').length
  const resolved = reports.filter((report) => report.status === 'resolved').length
  const intro = target
    ? `Here is where ${target.ref} stands in your complaint history.`
    : `You have ${reports.length} complaint${reports.length === 1 ? '' : 's'} on record: ${open} still open and ${resolved} resolved.${reports.length > 5 ? ' These are the five most recent.' : ''}`
  const lines = selected.map((report) => {
    const updated = new Date(report.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${report.ref} — ${report.title}\n${complaintStatusLabel(report.status)} · ${report.department_short ?? 'Intake'} · ${report.severity} severity · updated ${updated}\n${complaintNextStep(report.status)}`
  })

  return {
    source: 'local',
    kind: 'records',
    reply: `${intro}\n\n${lines.join('\n\n')}\n\nFor the full timeline and any resolution evidence, open My complaints.`,
    duplicates: [],
    matchedIncidentIds: selected.map((report) => report.id),
    imageAnalysed: false,
    notice: 'Answered from the complaint records attached to your CivicMind account.',
  }
}

app.post('/api/ai/agent', async (c) => {
  const session = c.get('session')
  if (!session) return json({ error: 'Sign in to use the CivicMind AI agent.' }, 401)

  const body = await c.req.json<Record<string, unknown>>().catch(() => null)
  if (!body) return json({ error: 'Invalid JSON body' }, 400)

  const message = String(body.message ?? '').trim().slice(0, 4000)
  const incidentId = body.incidentId ? String(body.incidentId) : null
  const rawImage = body.image as { data?: unknown; mimeType?: unknown } | undefined
  const rawAudio = body.audio as { data?: unknown; mimeType?: unknown } | undefined

  const image = rawImage?.data ? { data: String(rawImage.data), mimeType: String(rawImage.mimeType ?? 'image/jpeg') } : null
  const audio = rawAudio?.data ? { data: String(rawAudio.data), mimeType: String(rawAudio.mimeType ?? 'audio/webm') } : null

  if (image) {
    if (!image.mimeType.startsWith('image/')) return json({ error: 'Attach a PNG, JPEG or WebP image.' }, 422)
    if (image.data.length > 5_500_000) return json({ error: 'The image is too large. Use one under 4 MB.' }, 413)
  }
  if (audio) {
    if (!audio.mimeType.startsWith('audio/')) return json({ error: 'Attach an audio recording.' }, 422)
    if (audio.data.length > 6_500_000) return json({ error: 'The voice note is too long. Keep it under 20 seconds.' }, 413)
  }

  if (!message && !image && !audio && !incidentId) {
    return json({ error: 'Ask a question, attach a photo or voice note, or select an incident first.' }, 422)
  }

  // A selected marker is an incident-analysis request, even when its reference is in the prompt.
  if (session.role === 'citizen' && session.citizenId && !image && !audio && message && !incidentId) {
    const recordsAnswer = await answerFromComplaintRecords(c.env.DB, session.citizenId, message)
    if (recordsAnswer) return json({ ...recordsAnswer, contextRef: null })
  }

  const history = Array.isArray(body.history)
    ? (body.history as { role?: unknown; content?: unknown }[])
        .filter((entry) => (entry.role === 'user' || entry.role === 'assistant') && typeof entry.content === 'string')
        .slice(-6)
        .map((entry) => ({ role: entry.role as 'user' | 'assistant', content: String(entry.content).slice(0, 1500) }))
    : []

  const [incidentRows, locationRows, departmentRows] = await Promise.all([
    c.env.DB.prepare(
      `SELECT i.id, i.ref, i.title, i.description, i.category, i.city, i.location_id, l.name AS location_name,
              i.status, i.severity, i.priority_score, d.short_name AS department_short, i.reported_at
       FROM incidents i
       LEFT JOIN locations l ON l.id = i.location_id
       LEFT JOIN departments d ON d.id = i.department_id
       ORDER BY i.priority_score DESC`,
    ).all<ReferenceIncident>(),
    c.env.DB.prepare('SELECT id, name, city, lat, lng FROM locations ORDER BY name').all<ReferenceLocation>(),
    c.env.DB.prepare('SELECT id, name, short_name FROM departments ORDER BY name').all<ReferenceDepartment>(),
  ])

  const incidents = incidentRows.results
  const locations = locationRows.results
  const departments = departmentRows.results
  const context = incidentId ? incidents.find((incident) => incident.id === incidentId || incident.ref === incidentId) ?? null : null

  const result = await runAgent(
    c.env,
    { message, history, image, audio, incidentId },
    incidents,
    locations,
    departments,
    context,
  )

  return json({ ...result, contextRef: context?.ref ?? null })
})

app.notFound(() => json({ error: 'Unknown API route' }, 404))
app.onError((err) => {
  console.error('CivicMind API error', err)
  return json({ error: 'Unexpected server error.' }, 500)
})

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
  GROQ_VISION_MODEL?: string
  GROQ_WHISPER_MODEL?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx)
    }
    return env.ASSETS.fetch(request)
  },
}
