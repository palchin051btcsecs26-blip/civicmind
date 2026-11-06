-- CivicMind — demonstration schema (Cloudflare D1 / SQLite)
-- Entities are shaped for a future Groq-powered triage layer:
-- ai_summary, ai_tags and ai_confidence are optional fields the AI layer will populate.

CREATE TABLE IF NOT EXISTS citizens (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  city            TEXT NOT NULL,
  ward            TEXT,
  initials        TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  short_name          TEXT NOT NULL,
  head                TEXT,
  city                TEXT NOT NULL,
  contact_email       TEXT,
  sla_target_days     INTEGER NOT NULL DEFAULT 5,
  open_cases          INTEGER NOT NULL DEFAULT 0,
  avg_resolution_days REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS locations (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  city      TEXT NOT NULL,
  ward      TEXT,
  lat       REAL NOT NULL,
  lng       REAL NOT NULL,
  kind      TEXT NOT NULL DEFAULT 'neighbourhood'
);

CREATE TABLE IF NOT EXISTS reports (
  id           TEXT PRIMARY KEY,
  citizen_id   TEXT NOT NULL REFERENCES citizens(id),
  location_id  TEXT NOT NULL REFERENCES locations(id),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  category     TEXT NOT NULL,
  channel      TEXT NOT NULL DEFAULT 'web',
  photo_count  INTEGER NOT NULL DEFAULT 0,
  voice_note   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  is_simulated INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS incidents (
  id               TEXT PRIMARY KEY,
  ref              TEXT NOT NULL UNIQUE,
  report_id        TEXT REFERENCES reports(id),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  category         TEXT NOT NULL,
  city             TEXT NOT NULL,
  location_id      TEXT REFERENCES locations(id),
  lat              REAL,
  lng              REAL,
  severity         TEXT NOT NULL DEFAULT 'medium',
  priority_score   INTEGER NOT NULL DEFAULT 50,
  status           TEXT NOT NULL DEFAULT 'submitted',
  department_id    TEXT REFERENCES departments(id),
  reported_by      TEXT REFERENCES citizens(id),
  reported_at      TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  sla_due_at       TEXT,
  resolved_at      TEXT,
  recurrence_group TEXT,
  affected_people  INTEGER NOT NULL DEFAULT 0,
  ai_summary       TEXT,
  ai_tags          TEXT,
  ai_confidence    REAL
);

CREATE TABLE IF NOT EXISTS assignments (
  id            TEXT PRIMARY KEY,
  incident_id   TEXT NOT NULL REFERENCES incidents(id),
  department_id TEXT NOT NULL REFERENCES departments(id),
  assigned_to   TEXT,
  assigned_by   TEXT,
  assigned_at   TEXT NOT NULL,
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS resolution_records (
  id               TEXT PRIMARY KEY,
  incident_id      TEXT NOT NULL REFERENCES incidents(id),
  department_id    TEXT REFERENCES departments(id),
  resolved_by      TEXT,
  resolved_at      TEXT NOT NULL,
  summary          TEXT NOT NULL,
  evidence_count   INTEGER NOT NULL DEFAULT 0,
  citizen_confirmed INTEGER NOT NULL DEFAULT 0,
  days_to_resolve  REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS incident_updates (
  id          TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id),
  actor       TEXT NOT NULL,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  note        TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  citizen_id  TEXT NOT NULL REFERENCES citizens(id),
  incident_id TEXT REFERENCES incidents(id),
  type        TEXT NOT NULL DEFAULT 'status',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  read        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS accounts (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('citizen', 'admin')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  citizen_id    TEXT REFERENCES citizens(id),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  account_id  TEXT REFERENCES accounts(id),
  role        TEXT NOT NULL CHECK (role IN ('citizen', 'admin', 'guest')),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_city ON incidents(city);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_reported ON incidents(reported_at);
CREATE INDEX IF NOT EXISTS idx_reports_citizen ON reports(citizen_id);
CREATE INDEX IF NOT EXISTS idx_notifications_citizen ON notifications(citizen_id);
