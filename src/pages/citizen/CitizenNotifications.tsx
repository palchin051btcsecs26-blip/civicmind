import { useEffect, useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { Icon } from '../../components/Icon'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHead,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
} from '../../components/ui'
import { api, useApi } from '../../lib/api'
import type { CitizenPayload } from '../../lib/types'
import { formatDate, timeAgo } from '../../lib/ui'

type Filter = 'all' | 'unread'

export function CitizenNotifications() {
  const { data, loading, error, reload } = useApi<CitizenPayload>('/api/citizen')
  const [filter, setFilter] = useState<Filter>('all')
  const [notifications, setNotifications] = useState<CitizenPayload['notifications']>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (data) setNotifications(data.notifications)
  }, [data])

  const unread = notifications.filter((notification) => !notification.read).length
  const shown = filter === 'unread' ? notifications.filter((notification) => !notification.read) : notifications

  async function markRead(id: string) {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: 1 } : item)))
    try {
      await api(`/api/notifications/${id}/read`, { method: 'POST' })
      window.dispatchEvent(new Event('civicmind:data-changed'))
    } catch {
      /* local state already reflects the intent; the next load re-syncs */
    }
  }

  async function markAll() {
    setBusy(true)
    setNotifications((current) => current.map((item) => ({ ...item, read: 1 })))
    try {
      await api('/api/notifications/read-all', { method: 'POST', body: JSON.stringify({ citizenId: 'cit-001' }) })
      window.dispatchEvent(new Event('civicmind:data-changed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell workspace="citizen">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications."
        sub="Status changes, assignments and resolution evidence for the complaints you have filed."
        actions={
          <Button variant="ghost" size="sm" icon="check" onClick={markAll} disabled={busy || unread === 0}>
            Mark all as read
          </Button>
        }
      />

      {loading ? <Loading label="Loading notifications…" /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <div className="grid grid--sidebar-wide">
          <Card className="card--flush">
            <CardHead
              title="Activity"
              sub={`${unread} unread of ${notifications.length} notifications`}
              action={
                <div className="tabs">
                  <button type="button" className={`tab${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>
                    All
                  </button>
                  <button type="button" className={`tab${filter === 'unread' ? ' is-active' : ''}`} onClick={() => setFilter('unread')}>
                    Unread
                  </button>
                </div>
              }
            />
            <CardBody style={{ padding: 0 }}>
              {shown.length ? (
                shown.map((notification) => (
                  <div className={`notif-item${notification.read ? '' : ' is-unread'}`} key={notification.id}>
                    <span
                      className={`notif-icon${
                        notification.type === 'resolved' ? ' notif-icon--resolved' : notification.type === 'assigned' ? ' notif-icon--assigned' : ''
                      }`}
                    >
                      <Icon
                        name={
                          notification.type === 'resolved'
                            ? 'checkCircle'
                            : notification.type === 'assigned'
                              ? 'building'
                              : notification.type === 'receipt'
                                ? 'send'
                                : 'bell'
                        }
                      />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row-between" style={{ alignItems: 'baseline' }}>
                        <strong>{notification.title}</strong>
                        <time style={{ marginTop: 0 }}>{timeAgo(notification.created_at)}</time>
                      </div>
                      <p>{notification.body}</p>
                      <div className="row-wrap" style={{ marginTop: 8 }}>
                        <Badge tone={notification.type === 'resolved' ? 'resolved' : notification.type === 'assigned' ? 'progress' : 'neutral'}>
                          {notification.ref ?? notification.type}
                        </Badge>
                        <span className="mono" style={{ fontSize: 9, color: 'var(--slate-400)' }}>
                          {formatDate(notification.created_at, true)}
                        </span>
                        {!notification.read ? (
                          <button
                            type="button"
                            className="btn btn--quiet btn--xs"
                            onClick={() => markRead(notification.id)}
                            style={{ marginLeft: 'auto' }}
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {!notification.read ? <span className="notif-dot" /> : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  icon="bell"
                  title={filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
                  description="Updates about your complaints will appear here as the municipality moves them forward."
                />
              )}
            </CardBody>
          </Card>

          <div className="stack gap-16">
            <Card>
              <CardBody>
                <span className="eyebrow">Notification settings</span>
                <h3 style={{ marginTop: 10, fontSize: 14.5, fontWeight: 600 }}>What you will receive</h3>
                <div className="stack gap-10" style={{ marginTop: 12 }}>
                  {[
                    { label: 'Complaint receipt', detail: 'Reference number on submission' },
                    { label: 'Assignment updates', detail: 'When a department takes ownership' },
                    { label: 'Resolution evidence', detail: 'When closure evidence is uploaded' },
                  ].map((item) => (
                    <div className="row-between" key={item.label}>
                      <div>
                        <strong style={{ fontSize: 12, display: 'block' }}>{item.label}</strong>
                        <span style={{ fontSize: 11.5, color: 'var(--slate-500)' }}>{item.detail}</span>
                      </div>
                      <span className="switch" aria-hidden="true">
                        <input type="checkbox" checked readOnly tabIndex={-1} />
                        <span className="switch-track" />
                      </span>
                    </div>
                  ))}
                </div>
                <div className="disclosure" style={{ marginTop: 16 }}>
                  <Icon name="alertCircle" />
                  <div>Preference controls are illustrative in this build; SMS and email delivery are not connected.</div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <span className="eyebrow">Contact details</span>
                <div className="kv" style={{ marginTop: 12 }}>
                  <dt>Name</dt>
                  <dd>{data.citizen.name}</dd>
                  <dt>Phone</dt>
                  <dd>{data.citizen.phone ?? '—'}</dd>
                  <dt>Email</dt>
                  <dd style={{ fontSize: 11 }}>{data.citizen.email}</dd>
                  <dt>Ward</dt>
                  <dd>{data.citizen.ward}</dd>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
