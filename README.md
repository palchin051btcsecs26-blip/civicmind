# CivicMind

**From complaints to action.**

CivicMind is a civic intelligence and grievance resolution platform for Indian municipalities. This build is the
Phase 1 product foundation for the **Goa pilot** (Panaji, Calangute, Margao): a welcome and authentication entry,
a citizen portal, a municipal authority dashboard and a civic intelligence workspace. Every signed-in workspace
opens with the CivicMind AI agent and the live incident map, with its role-specific records and tools below.

> **Data disclosure:** every citizen, complaint, resolution and response time in this repository is **synthetic**.
> The dataset was authored for demonstration. It is not sourced from municipal records and must not be presented as
> official government statistics or live complaints. When no Groq key is configured, a deterministic local demo
> reasoner answers instead of a hosted model.

---

## Stack

| Layer      | Choice                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| Front end  | React 19 + TypeScript + Vite, React Router                                   |
| Styling    | Hand-built design system (CSS custom properties, no UI framework)            |
| Type       | Plus Jakarta Sans (UI) + Fraunces (display) via Fontsource                   |
| Backend    | Cloudflare Worker (Hono) REST API                                            |
| Database   | Cloudflare D1 (SQLite), schema in [`db/schema.sql`](db/schema.sql)           |
| Map        | Leaflet + `leaflet.markercluster`, Esri dark basemap with OSM attribution    |
| AI         | Groq chat, vision and Whisper transcription, with a local fallback reasoner  |

The Worker serves `/api/*` and the built SPA from `dist/`. Vite proxies `/api` to the Worker during development.

## Run locally

```bash
npm install

# 1. Create the local D1 tables
npm run db:local

# 2. Start the API on :8787 (seeds the demo dataset and accounts on first request)
npm run api

# 3. In a second terminal, start the web app on :3000
npm run dev
```

Open <http://localhost:3000>. The first API request seeds 45 illustrative Goa incidents, eight demo citizens and
the demo accounts into local D1.

### Optional Groq AI

The agent works without a key using a local, deterministic reasoner (clearly labelled **Local Demo** in the UI).
To enable hosted Groq reasoning, image understanding and voice transcription, add a key to `.dev.vars` in the
project root (do not commit it):

```ini
GROQ_API_KEY=your_key_here
```

The Worker reads `GROQ_API_KEY`, `GROQ_CHAT_MODEL`, `GROQ_VISION_MODEL` and `GROQ_TRANSCRIPTION_MODEL` from its
environment. Defaults are `llama-3.3-70b-versatile`, `meta-llama/llama-4-scout-17b-16e-instruct` and
`whisper-large-v3-turbo`. Groq failures fall back to the local reasoner and surface a notice in the response.
Without a key, photo attachments are accepted but image contents and audio are not analysed.

Production build:

```bash
npm run build     # type-checks, then builds the SPA into dist/
npx wrangler deploy
```

## Demo accounts

| Role      | Email                    | Password      |
| --------- | ------------------------ | ------------- |
| Citizen   | `aarav@civicmind.demo`   | `citizen1234` |
| Authority | `admin@civicmind.demo`   | `admin1234`   |

The welcome page can fill either account in one click. Authority accounts cannot be created publicly. Guest access
creates a 12-hour read-only session without an account. Citizen and authority sessions last seven days.

The profile menu at the top right of every workspace shows the current role and offers **Log out** for citizens and
officers, or **Exit guest** for visitors. Logging out calls the API, invalidates the session in D1 and clears the
HttpOnly cookie before returning to `/welcome`; a previous session cannot reopen a protected route.

## Entry and access

`/welcome` is the default entry for signed-out visitors. It offers three routes:

- **Citizen** — log in or create an account, then report and track complaints.
- **Authority** — secure login for municipal officers only.
- **Guest** — continue without an account to the public dashboard and live map, read-only.

Sessions are D1-backed and carried in an HttpOnly `SameSite=Lax` cookie. Passwords use PBKDF2-SHA256 with per-user
salts; only a SHA-256 hash of the opaque session token is stored. Guest and citizen incident responses strip reporter
contact details and internal assignment data. `RequireRole` guards the client routes, and the Worker enforces
the same roles on every API request.

## Routes

| Route                     | Access            | Surface                                                         |
| ------------------------- | ----------------- | --------------------------------------------------------------- |
| `/welcome`                | Signed out        | Welcome and sign-in/sign-up/guest entry (default redirect)      |
| `/login`                  | Signed out        | Redirects to `/welcome`                                         |
| `/`                       | Any session       | Landing page; signed-out visitors are sent to `/welcome`        |
| `/about`                  | Public            | About, architecture, roadmap, data disclosure                   |
| `/citizen`                | Citizen           | AI agent, live map, personal complaint tracking                |
| `/citizen/report`         | Citizen           | Complaint submission (photos, voice note, location)             |
| `/citizen/reports`        | Citizen           | Complaint history + full status timeline                        |
| `/citizen/nearby`         | Citizen           | Nearby civic issues and city map                                |
| `/citizen/notifications`  | Citizen           | Notification inbox                                              |
| `/authority`              | Authority         | AI agent, live map, intake, SLA and priority queue              |
| `/authority/incidents`    | Authority         | Filterable complaint register                                   |
| `/authority/incidents/:ref` | Authority       | Incident detail, assignment, status updates, resolution         |
| `/authority/priority`     | Authority         | Priority and SLA risk queue                                     |
| `/authority/departments`  | Authority         | Department workload and resolution performance                  |
| `/intelligence`           | Any session       | AI agent, public map and civic analytics                        |

Unauthorised roles are redirected to their own workspace. The `/intelligence` page also accepts
`?view=recurrence`, `?view=tourism` and `?view=performance` for the sidebar shortcuts.

## Primary dashboard experience

Every citizen, authority and guest workspace opens with the same AI-and-map section before its statistics and tools.

- **CivicMind AI agent** greets the signed-in user by role and name, classifies a description, estimates severity
  and priority, recommends a department, identifies possible duplicates, explains its reasoning and highlights
  matching incidents on the map. Citizens can ask about their own complaint history; the agent answers from their
  D1 records, with status, department and next step, and never reads another citizen's cases. With a Groq key it
  also understands attached images and transcribes voice notes. The agent is read-only.
- **Live civic map** uses Leaflet with clustered markers, filters for location, category, priority and status,
  AI-match highlighting, and an incident drawer that can hand a selected marker back to the agent for analysis.
- The desktop layout places the agent and map side by side; on mobile the agent comes first and the map follows
  immediately. Statistics, personal reports, filters and authority tools sit below this section. The intelligence
  page retains its category, recurrence, tourism and departmental performance analytics.

## API

All `/api/*` endpoints except `/api/health` and the auth endpoints require a session.

| Method | Endpoint                            | Purpose                                        |
| ------ | ----------------------------------- | ---------------------------------------------- |
| GET    | `/api/health`                       | Service check                                  |
| POST   | `/api/auth/signup`                  | Create a citizen account and session           |
| POST   | `/api/auth/login`                   | Citizen or authority login                     |
| POST   | `/api/auth/guest`                   | Create a read-only guest session               |
| POST   | `/api/auth/logout`                  | Clear the session                              |
| GET    | `/api/auth/me`                      | Current session user                           |
| POST   | `/api/ai/agent`                     | Classify, de-duplicate, route and explain      |
| GET    | `/api/overview`                     | KPI totals, trend, priority queue              |
| GET    | `/api/incidents`                    | Filter by `q`, `city`, `category`, `status`, `severity`, `department`, `limit` |
| GET    | `/api/incidents/:ref`               | Incident, timeline, assignment, resolution     |
| POST   | `/api/incidents`                    | Citizen report + incident                      |
| PATCH  | `/api/incidents/:ref`               | Authority status, severity or department update |
| POST   | `/api/incidents/:ref/assignments`   | Assign a department/officer                    |
| POST   | `/api/incidents/:ref/resolutions`   | Record resolution evidence and close           |
| GET    | `/api/analytics`                    | Heat, category mix, recurrence, tourism, SLA   |
| GET    | `/api/departments`                  | Department load                                |
| GET    | `/api/citizen`                      | Session citizen, own reports and notifications |
| GET    | `/api/notifications`                | Notification list                              |
| POST   | `/api/notifications/:id/read`       | Mark one read                                  |
| POST   | `/api/notifications/read-all`       | Mark all read                                  |
| GET    | `/api/meta`                         | Locations, departments, citizens (authority)   |

## Data model

`citizens`, `reports`, `incidents`, `departments`, `locations`, `assignments`, `resolution_records`,
`incident_updates`, `notifications`, `accounts` and `sessions` — defined in [`db/schema.sql`](db/schema.sql).
Incidents retain optional `ai_summary`, `ai_tags` and `ai_confidence` columns for hosted triage metadata.

## Demo behaviour

- The welcome page is the only public entry to the workspaces; the marketing landing page is available after sign-in.
- Citizen submissions create a real D1 report and incident with a generated `CM-xxxx` reference, tied to the
  signed-in citizen.
- Authority actions (assign, status change, resolution) write to local D1 and appear across dashboards.
- Photo and voice capture are functional in the browser where permissions allow; files are not stored in this phase.
  Evidence is counted and thumbnails are illustrative.
- Map tiles come from Esri; the map requires an internet connection even when the app runs locally.

## Not in this phase

- Real file storage, SMS/WhatsApp channels and municipal GIS integration
- Production identity provider, password reset and account administration
- Live municipal data ingestion
