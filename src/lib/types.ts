export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Role = 'citizen' | 'admin' | 'guest'

export interface AuthUser {
  role: Role
  name: string
  email: string | null
  citizenId: string | null
  city: string | null
  initials: string
}

export interface AgentFinding {
  category: string
  severity: Severity
  priority: number
  department: string
  departmentId: string | null
  location: string | null
  locationId: string | null
  city: string | null
  confidence: number
  summary: string
}

export interface AgentDuplicate {
  id: string
  ref: string
  title: string
  city: string
  status: string
  severity: string
}

export interface AgentResult {
  source: 'groq' | 'local'
  kind?: 'analysis' | 'records'
  reply: string
  findings?: AgentFinding
  duplicates: AgentDuplicate[]
  matchedIncidentIds: string[]
  notice?: string
  transcript?: string | null
  imageAnalysed: boolean
  contextRef?: string | null
}
export type IncidentStatus = 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved'
export type CityName = 'Panaji' | 'Calangute' | 'Margao'

export interface Incident {
  id: string
  ref: string
  report_id: string | null
  title: string
  description: string
  category: string
  city: string
  severity: Severity
  priority_score: number
  status: IncidentStatus
  department_id: string | null
  reported_at: string
  updated_at: string
  sla_due_at: string | null
  resolved_at: string | null
  recurrence_group: string | null
  affected_people: number
  lat: number | null
  lng: number | null
  location_name?: string
  ward?: string | null
  department_short?: string | null
  department_name?: string | null
  citizen_name?: string
  citizen_initials?: string
  photo_count?: number
}

export interface Department {
  id: string
  name: string
  short_name: string
  head: string | null
  city: string
  contact_email?: string | null
  sla_target_days: number
  open_cases: number
  avg_resolution_days: number
  total_cases?: number
}

export interface Citizen {
  id: string
  name: string
  initials: string
  city: string
  email: string
  phone: string | null
  ward: string | null
}

export interface NotificationItem {
  id: string
  citizen_id: string
  incident_id: string | null
  type: string
  title: string
  body: string
  created_at: string
  read: number
  ref?: string
  city?: string
  category?: string
}

export interface TrendPoint {
  date: string
  received: number
  resolved: number
}

export interface PriorityItem {
  ref: string
  title: string
  city: string
  category: string
  severity: Severity
  status: IncidentStatus
  priorityScore: number
  reportedAt: string
  department: string
  affectedPeople: number
}

export interface Overview {
  dataset: string
  generatedAt: string
  totals: {
    total: number
    open: number
    resolved: number
    critical: number
    slaBreaches: number
    avgResolutionDays: number
    affectedPeople: number
    resolutionRate: number
  }
  byStatus: Record<string, number>
  byCity: { city: string; total: number; open: number }[]
  byCategory: { category: string; total: number }[]
  departments: Department[]
  trend: TrendPoint[]
  priorityQueue: PriorityItem[]
}

export interface HeatLocation {
  id: string
  name: string
  city: string
  lat: number
  lng: number
  total: number
  open: number
  intensity: number
  topCategory: string | null
}

export interface Analytics {
  dataset: string
  generatedAt: string
  cities: { name: string; lat: number; lng: number; total: number; open: number; critical: number; resolved: number }[]
  cityTotals: { city: string; total: number; categories: Record<string, number> }[]
  categoryByCity: { city: string; total: number; categories: Record<string, number> }[]
  recurrence: {
    group: string
    city: string
    occurrences: number
    category: string
    openCount: number
    affectedPeople: number
    lastReportedAt: string
    heat: number
  }[]
  performance: {
    id: string
    name: string
    shortName: string
    head: string | null
    slaTargetDays: number
    assigned: number
    resolved: number
    open: number
    avgResolutionDays: number
    slaCompliance: number
  }[]
  heat: HeatLocation[]
  tourism: {
    city: string
    linkedIncidents: number
    beachAndSanitation: number
    resolved: number
    openCritical: number
    visitorExposure: number
    byCategory: { category: string; total: number }[]
    hotspot: string
    note: string
  }
  severityMix: { severity: Severity; total: number }[]
}

export interface IncidentUpdate {
  id: string
  incident_id: string
  actor: string
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}

export interface Assignment {
  id: string
  incident_id: string
  department_id: string
  assigned_to: string
  assigned_by: string
  assigned_at: string
  note: string
  status: string
  department_short?: string
}

export interface ResolutionRecord {
  id: string
  incident_id: string
  department_id: string | null
  resolved_by: string
  resolved_at: string
  summary: string
  evidence_count: number
  citizen_confirmed: number
  days_to_resolve: number
}

export interface IncidentDetail {
  incident: Incident & {
    department_head?: string | null
    sla_target_days?: number
    citizen_phone?: string
    citizen_email?: string
    location_kind?: string
  }
  updates: IncidentUpdate[]
  assignment: Assignment | null
  resolution: ResolutionRecord | null
}

export interface CitizenPayload {
  citizen: Citizen
  reports: Incident[]
  notifications: NotificationItem[]
  stats: { total: number; open: number; resolved: number; awaitingConfirmation: number; photos: number }
  unreadNotifications: number
}

export interface LocationMeta {
  id: string
  name: string
  city: string
  ward: string
  lat: number
  lng: number
  kind: string
}

export interface MetaPayload {
  locations: LocationMeta[]
  departments: Pick<Department, 'id' | 'name' | 'short_name' | 'head' | 'sla_target_days'>[]
  citizens: Pick<Citizen, 'id' | 'name' | 'initials' | 'city'>[]
}
