import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { STATUS_META, SEVERITY_META, formatDate, timeAgo } from '../lib/ui'
import type { IncidentStatus, IncidentUpdate, Severity } from '../lib/types'

/* ---------------------------------- Buttons --------------------------------- */
type Variant = 'primary' | 'accent' | 'ghost' | 'ghost-light' | 'quiet' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'xs'
  icon?: IconName
  iconRight?: IconName
  block?: boolean
}

export function Button({ variant = 'primary', size, icon, iconRight, block, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={['btn', `btn--${variant}`, size ? `btn--${size}` : '', block ? 'btn--block' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} /> : null}
    </button>
  )
}

interface LinkButtonProps {
  to: string
  variant?: Variant
  size?: 'sm' | 'xs'
  icon?: IconName
  iconRight?: IconName
  className?: string
  children: ReactNode
  onClick?: () => void
  block?: boolean
}

export function LinkButton({ to, variant = 'primary', size, icon, iconRight, className = '', children, onClick, block }: LinkButtonProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={['btn', `btn--${variant}`, size ? `btn--${size}` : '', block ? 'btn--block' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} /> : null}
    </Link>
  )
}

/* ---------------------------------- Badges ---------------------------------- */
export function Badge({ tone = 'neutral', children, plain }: { tone?: string; children: ReactNode; plain?: boolean }) {
  return <span className={`badge badge--${tone}${plain ? ' badge--plain' : ''}`}>{children}</span>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={SEVERITY_META[severity].tone}>{SEVERITY_META[severity].label}</Badge>
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={STATUS_META[status].tone}>{STATUS_META[status].label}</Badge>
}

export function PriorityPill({ score }: { score: number }) {
  const tone = score >= 85 ? 'critical' : score >= 65 ? 'high' : score >= 45 ? 'medium' : 'low'
  return <Badge tone={tone} plain>{score}</Badge>
}

/* ---------------------------------- Surfaces -------------------------------- */
export function Card({
  children,
  className = '',
  dark,
  id,
  style,
}: {
  children: ReactNode
  className?: string
  dark?: boolean
  id?: string
  style?: CSSProperties
}) {
  return (
    <section id={id} style={style} className={['card', dark ? 'card--dark' : '', className].filter(Boolean).join(' ')}>
      {children}
    </section>
  )
}

export function CardHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="card-head">
      <div>
        <h3 className="card-title">{title}</h3>
        {sub ? <p className="card-sub">{sub}</p> : null}
      </div>
      {action ? <div className="row-wrap">{action}</div> : null}
    </header>
  )
}

export function CardBody({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`card-body ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-desc">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

/* ---------------------------------- Stats ----------------------------------- */
export function StatCard({
  label,
  value,
  suffix,
  foot,
  delta,
  deltaTone = 'down',
  icon,
  alert,
  dark,
}: {
  label: string
  value: string | number
  suffix?: string
  foot?: string
  delta?: string
  deltaTone?: 'down' | 'up' | 'flat'
  icon?: IconName
  alert?: boolean
  dark?: boolean
}) {
  return (
    <div className={`stat${alert ? ' stat--alert' : ''}${dark ? ' stat--dark' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {value}
        {suffix ? <small> {suffix}</small> : null}
      </div>
      <div className="stat-foot">
        {delta ? <span className={`stat-delta stat-delta--${deltaTone}`}>{delta}</span> : null}
        {foot}
      </div>
      {icon ? (
        <span className="stat-icon">
          <Icon name={icon} />
        </span>
      ) : null}
    </div>
  )
}

/* -------------------------------- Page header ------------------------------- */
export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow: string
  title: string
  sub?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="page-header__title">{title}</h1>
        {sub ? <p className="page-header__sub">{sub}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  )
}

/* ---------------------------------- Notice ---------------------------------- */
export function Notice({
  children,
  tone = 'amber',
  icon = 'alert',
}: {
  children: ReactNode
  tone?: 'amber' | 'info' | 'error'
  icon?: IconName
}) {
  const cls = tone === 'info' ? 'notice notice--info' : tone === 'error' ? 'notice notice--error' : 'notice'
  return (
    <div className={cls}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}

/* ------------------------------- Empty / loading ---------------------------- */
export function EmptyState({ title, description, icon = 'file' }: { title: string; description?: string; icon?: IconName }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} />
      </span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  )
}

export function Loading({ label = 'Loading CivicMind data…' }: { label?: string }) {
  return (
    <div className="loading-block">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="stack gap-14">
      <Notice tone="error" icon="alertCircle">
        <strong>We couldn’t load this view.</strong> {message}
      </Notice>
      {onRetry ? (
        <div>
          <Button variant="ghost" size="sm" icon="refresh" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/* ---------------------------------- Avatar ---------------------------------- */
export function Avatar({ initials, dark, small }: { initials: string; dark?: boolean; small?: boolean }) {
  return <span className={`avatar${dark ? ' avatar--dark' : ''}${small ? ' avatar--sm' : ''}`}>{initials}</span>
}

/* --------------------------------- Timeline --------------------------------- */
export function Timeline({ updates }: { updates: IncidentUpdate[] }) {
  if (!updates.length) {
    return <p className="muted" style={{ fontSize: 12.5 }}>No status updates recorded yet.</p>
  }
  return (
    <div className="timeline">
      {updates
        .slice()
        .reverse()
        .map((update) => {
          const meta = STATUS_META[update.to_status as IncidentStatus]
          const dotClass =
            update.to_status === 'resolved' ? 'timeline-dot' : update.to_status === 'submitted' ? 'timeline-dot timeline-dot--muted' : 'timeline-dot'
          return (
            <div className="timeline-item" key={update.id}>
              <span className={dotClass} />
              <div className="timeline-head">
                <strong>{meta ? meta.label : update.to_status}</strong>
                <time>{formatDate(update.created_at, true)}</time>
              </div>
              {update.note ? <p>{update.note}</p> : null}
              <span className="timeline-actor">Updated by {update.actor}</span>
            </div>
          )
        })}
    </div>
  )
}

/* ---------------------------------- Misc ------------------------------------ */
export function Meter({ value, tone = 'teal' }: { value: number; tone?: 'teal' | 'amber' | 'coral' | 'olive' }) {
  const cls = tone === 'teal' ? 'meter' : `meter meter--${tone}`
  return (
    <div className={cls} role="presentation">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Field({
  label,
  hint,
  optional,
  children,
  className = '',
}: {
  label: string
  hint?: string
  optional?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`field ${className}`.trim()}>
      <span className="field-label">
        {label}
        {optional ? <span>{optional}</span> : null}
      </span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: () => void
}) {
  return (
    <div className="search-input">
      <Icon name="search" />
      <input
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onSubmit) onSubmit()
        }}
      />
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)
  return (
    <div className="pagination">
      <span>
        Showing {start}–{end} of {total} complaints
      </span>
      <div className="pagination__buttons">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <Icon name="chevronLeft" />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  )
}

export function RelativeTime({ iso }: { iso: string }) {
  return <time dateTime={iso}>{timeAgo(iso)}</time>
}
