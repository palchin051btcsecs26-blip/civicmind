import type { IncidentStatus, Severity } from './types'

export const SEVERITY_META: Record<Severity, { label: string; tone: string; rank: number }> = {
  critical: { label: 'Critical', tone: 'critical', rank: 4 },
  high: { label: 'High', tone: 'high', rank: 3 },
  medium: { label: 'Medium', tone: 'medium', rank: 2 },
  low: { label: 'Low', tone: 'low', rank: 1 },
}

export const STATUS_META: Record<IncidentStatus, { label: string; tone: string; short: string }> = {
  submitted: { label: 'Submitted', tone: 'neutral', short: 'New' },
  under_review: { label: 'Under review', tone: 'review', short: 'Review' },
  assigned: { label: 'Assigned', tone: 'assigned', short: 'Assigned' },
  in_progress: { label: 'In progress', tone: 'progress', short: 'Working' },
  resolved: { label: 'Resolved', tone: 'resolved', short: 'Resolved' },
}

export const STATUS_ORDER: IncidentStatus[] = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved']

export const CATEGORIES = [
  'Roads & Potholes',
  'Drainage & Flooding',
  'Waste Management',
  'Street Lighting',
  'Water Supply',
  'Public Sanitation',
  'Stray Animals',
  'Parks & Public Spaces',
  'Traffic & Signage',
  'Beach Cleanliness',
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  'Roads & Potholes': '#2f7f75',
  'Drainage & Flooding': '#4b7f9e',
  'Waste Management': '#7f8e56',
  'Street Lighting': '#d29a34',
  'Water Supply': '#57a097',
  'Public Sanitation': '#b5a37c',
  'Stray Animals': '#8a7a5c',
  'Parks & Public Spaces': '#6b8f6a',
  'Traffic & Signage': '#d4614f',
  'Beach Cleanliness': '#3f8b93',
}

export const CHART_COLORS = ['#2f7f75', '#7f8e56', '#d29a34', '#d4614f', '#4b7f9e', '#b5a37c', '#6b8f6a', '#8a7a5c', '#57a097', '#a56a5a']

export const CITIES = ['Panaji', 'Calangute', 'Margao'] as const

export const CITY_META: Record<string, { tag: string; blurb: string; focus: string }> = {
  Panaji: {
    tag: 'Capital · pilot core',
    blurb: 'Ward-level grievance routing across the capital’s promenade, market and creek corridors.',
    focus: 'Drainage, heritage footpaths and sanitation',
  },
  Calangute: {
    tag: 'Coastal · tourism pressure',
    blurb: 'Beach waste, sanitation and access issues measured against seasonal visitor load.',
    focus: 'Beach cleanliness, public sanitation',
  },
  Margao: {
    tag: 'Commercial · drainage',
    blurb: 'Roads, market waste and monsoon drainage across the commercial capital’s wards.',
    focus: 'Roads, drainage and market waste',
  },
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n)
}

export function compactNumber(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function daysOpen(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

export function priorityTone(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

export function titleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
