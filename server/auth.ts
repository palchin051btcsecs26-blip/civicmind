import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

/**
 * Session-based demo authentication.
 *
 * Accounts and sessions live in D1. Passwords are salted PBKDF2-SHA256 hashes
 * (Web Crypto), and the browser only ever receives an opaque HttpOnly cookie.
 * This is intentionally small, but it enforces real role separation between the
 * citizen, municipal and guest surfaces.
 */

export type Role = 'citizen' | 'admin' | 'guest'

export interface AccountIdentity {
  id: string
  role: 'citizen' | 'admin'
  name: string
  email: string
  citizenId: string | null
  city: string | null
  initials: string
}

export interface SessionUser {
  accountId: string | null
  role: Role
  name: string
  email: string | null
  citizenId: string | null
  city: string | null
  initials: string
}

interface AccountRow {
  id: string
  role: 'citizen' | 'admin'
  name: string
  email: string
  password_hash: string
  salt: string
  citizen_id: string | null
  citizen_city: string | null
  citizen_initials: string | null
}

interface SessionRow {
  id: string
  role: Role
  expires_at: string
  account_id: string | null
  name: string | null
  email: string | null
  citizen_id: string | null
  city: string | null
  initials: string | null
}

export const SESSION_COOKIE = 'civicmind_session'

export const DEMO_CITIZEN = { email: 'aarav@civicmind.demo', password: 'citizen1234' }
export const DEMO_ADMIN = { email: 'admin@civicmind.demo', password: 'admin1234' }

const encoder = new TextEncoder()

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function randomHex(bytes = 32): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)
  return toHex(buffer)
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return toHex(new Uint8Array(digest))
}

async function derivePassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex) as unknown as BufferSource, iterations: 120_000, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

export async function hashPassword(password: string, saltHex = randomHex(16)): Promise<{ hash: string; salt: string }> {
  return { hash: await derivePassword(password, saltHex), salt: saltHex }
}

export async function verifyPassword(password: string, account: Pick<AccountRow, 'password_hash' | 'salt'>): Promise<boolean> {
  const candidate = await derivePassword(password, account.salt)
  const expected = account.password_hash
  if (candidate.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < candidate.length; i += 1) mismatch |= candidate.charCodeAt(i) ^ expected.charCodeAt(i)
  return mismatch === 0
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'CM'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

let accountsPromise: Promise<void> | null = null

/** Creates the two demo accounts once per database. Passwords are never stored in plain text. */
export async function ensureAccounts(db: D1Database): Promise<void> {
  if (!accountsPromise) {
    accountsPromise = seedAccounts(db).catch((error) => {
      accountsPromise = null
      throw error
    })
  }
  await accountsPromise
}

async function seedAccounts(db: D1Database): Promise<void> {
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM accounts').first<{ n: number }>()
  if (existing && existing.n > 0) return

  const now = new Date().toISOString()
  const demoCitizen = await db.prepare("SELECT id FROM citizens WHERE id = 'cit-001'").first<{ id: string }>()
  if (!demoCitizen) {
    await db
      .prepare('INSERT OR IGNORE INTO citizens (id, name, email, phone, city, ward, initials, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind('cit-001', 'Aarav Naik', 'aarav.naik@example.in', '+91 98220 11041', 'Panaji', 'Ward 3 — St. Inez', 'AN', now)
      .run()
  }

  const citizen = await hashPassword(DEMO_CITIZEN.password)
  const admin = await hashPassword(DEMO_ADMIN.password)

  await db.batch([
    db
      .prepare('INSERT OR IGNORE INTO accounts (id, role, name, email, password_hash, salt, citizen_id, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind('acc-citizen-demo', 'citizen', 'Aarav Naik', DEMO_CITIZEN.email, citizen.hash, citizen.salt, 'cit-001', now),
    db
      .prepare('INSERT OR IGNORE INTO accounts (id, role, name, email, password_hash, salt, citizen_id, created_at) VALUES (?,?,?,?,?,?,?,?)')
      .bind('acc-admin-demo', 'admin', 'Rui Fernandes', DEMO_ADMIN.email, admin.hash, admin.salt, null, now),
  ])
}

export async function findAccountByEmail(db: D1Database, email: string): Promise<AccountRow | null> {
  return db
    .prepare(
      `SELECT a.*, c.city AS citizen_city, c.initials AS citizen_initials
       FROM accounts a LEFT JOIN citizens c ON c.id = a.citizen_id
       WHERE lower(a.email) = lower(?) LIMIT 1`,
    )
    .bind(email)
    .first<AccountRow>()
}

export function identityFromAccount(account: AccountRow): AccountIdentity {
  return {
    id: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    citizenId: account.citizen_id,
    city: account.citizen_city,
    initials: account.citizen_initials ?? initialsFor(account.name),
  }
}

export async function resolveSession(c: Context, db: D1Database): Promise<SessionUser | null> {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return null

  const tokenId = await sha256(token)
  const row = await db
    .prepare(
      `SELECT s.id, s.role, s.expires_at, a.id AS account_id, a.name, a.email, a.citizen_id,
              ci.city, ci.initials
       FROM sessions s
       LEFT JOIN accounts a ON a.id = s.account_id
       LEFT JOIN citizens ci ON ci.id = a.citizen_id
       WHERE s.id = ? LIMIT 1`,
    )
    .bind(tokenId)
    .first<SessionRow>()

  if (!row) return null

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(tokenId).run()
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return null
  }

  if (row.role === 'guest') {
    return { accountId: null, role: 'guest', name: 'Guest visitor', email: null, citizenId: null, city: null, initials: 'GV' }
  }

  if (!row.account_id) return null

  return {
    accountId: row.account_id,
    role: row.role,
    name: row.name ?? 'CivicMind user',
    email: row.email,
    citizenId: row.citizen_id,
    city: row.city,
    initials: row.initials ?? initialsFor(row.name ?? 'CivicMind user'),
  }
}

export async function issueSession(c: Context, db: D1Database, account: AccountIdentity | null): Promise<SessionUser> {
  const role: Role = account?.role ?? 'guest'
  const token = randomHex(32)
  const tokenId = await sha256(token)
  const now = new Date()
  const ttlSeconds = role === 'guest' ? 60 * 60 * 12 : 60 * 60 * 24 * 7

  await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now.toISOString()).run()
  await db
    .prepare('INSERT INTO sessions (id, account_id, role, expires_at, created_at) VALUES (?,?,?,?,?)')
    .bind(tokenId, account?.id ?? null, role, new Date(now.getTime() + ttlSeconds * 1000).toISOString(), now.toISOString())
    .run()

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
    maxAge: ttlSeconds,
  })

  if (!account) {
    return { accountId: null, role: 'guest', name: 'Guest visitor', email: null, citizenId: null, city: null, initials: 'GV' }
  }

  return {
    accountId: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    citizenId: account.citizenId,
    city: account.city,
    initials: account.initials,
  }
}

export async function clearSession(c: Context, db: D1Database): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run()
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

/** Only this shape ever reaches the browser. */
export function publicUser(user: SessionUser) {
  return {
    role: user.role,
    name: user.name,
    email: user.email,
    citizenId: user.citizenId,
    city: user.city,
    initials: user.initials,
  }
}
