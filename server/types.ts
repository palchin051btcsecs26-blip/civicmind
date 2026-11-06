export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved'
export type City = 'Panaji' | 'Calangute' | 'Margao'

export interface CitizenRow {
  id: string
  name: string
  email: string
  phone: string | null
  city: string
  ward: string | null
  initials: string
  created_at: string
}

export interface DepartmentRow {
  id: string
  name: string
  short_name: string
  head: string | null
  city: string
  contact_email: string | null
  sla_target_days: number
  open_cases: number
  avg_resolution_days: number
}

export interface LocationRow {
  id: string
  name: string
  city: string
  ward: string | null
  lat: number
  lng: number
  kind: string
}

export interface IncidentRow {
  id: string
  ref: string
  report_id: string | null
  title: string
  description: string
  category: string
  city: string
  location_id: string | null
  lat: number | null
  lng: number | null
  severity: Severity
  priority_score: number
  status: IncidentStatus
  department_id: string | null
  reported_by: string | null
  reported_at: string
  updated_at: string
  sla_due_at: string | null
  resolved_at: string | null
  recurrence_group: string | null
  affected_people: number
  ai_summary: string | null
  ai_tags: string | null
  ai_confidence: number | null
}

export interface ResolutionRow {
  id: string
  incident_id: string
  department_id: string | null
  resolved_by: string | null
  resolved_at: string
  summary: string
  evidence_count: number
  citizen_confirmed: number
  days_to_resolve: number
}

export interface UpdateRow {
  id: string
  incident_id: string
  actor: string
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}
