import { useCallback, useState } from 'react'
import { CivicAgent } from './CivicAgent'
import { IncidentDrawer } from './IncidentDrawer'
import { LiveCivicMap } from './LiveCivicMap'
import { Badge, Button, Card, CardBody, CardHead } from './ui'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Incident, Role } from '../lib/types'

interface AgentMapWorkspaceProps {
  /** Role shapes the agent's welcome and suggestions; it is never inferred from a URL. */
  role: Role
}

const MAP_COPY: Record<Role, { title: string; sub: string }> = {
  citizen: {
    title: 'Your city, live',
    sub: 'Explore reported issues across Goa. Open a marker to read the case, or send it to the agent for a recommendation.',
  },
  admin: {
    title: 'Live incident map',
    sub: 'Every active case in the pilot. Filter, cluster and open a marker; send it to the agent for triage support.',
  },
  guest: {
    title: 'Public civic map',
    sub: 'Read-only incidents from the simulated pilot dataset. Open a marker for public details.',
  },
}

export function AgentMapWorkspace({ role }: AgentMapWorkspaceProps) {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi<{ incidents: Incident[] }>('/api/incidents?limit=100')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [agentContext, setAgentContext] = useState<{ incident: Incident; nonce: number } | null>(null)

  const incidents = data?.incidents ?? []
  const mapCopy = MAP_COPY[role]

  const openIncident = useCallback((incident: Incident) => setSelectedIncident(incident), [])

  const analyseIncident = useCallback((incident: Incident) => {
    setSelectedIncident(null)
    setAgentContext({ incident, nonce: Date.now() })
    window.setTimeout(() => {
      document.querySelector('.agent-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }, [])

  return (
    <>
      <div className="intel-hero" aria-label="CivicMind AI and live incident map">
        <CivicAgent
          incidents={incidents}
          role={role}
          userName={user?.name}
          contextIncident={agentContext?.incident ?? null}
          contextNonce={agentContext?.nonce ?? 0}
          onHighlight={setHighlightedIds}
          onOpenIncident={openIncident}
        />

        <Card className="map-card map-card--live">
          <CardHead
            title={mapCopy.title}
            sub={mapCopy.sub}
            action={<Badge tone="progress">{role === 'guest' ? 'Public view' : 'Live pilot view'}</Badge>}
          />
          <CardBody>
            <LiveCivicMap
              incidents={incidents}
              highlightedIds={highlightedIds}
              selectedId={selectedIncident?.id ?? null}
              loading={loading}
              error={error}
              onSelectIncident={openIncident}
              onClearHighlight={() => setHighlightedIds([])}
            />
          </CardBody>
          {error ? (
            <div className="map-card__retry">
              <Button variant="ghost" size="sm" icon="refresh" onClick={reload}>
                Retry map data
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      <IncidentDrawer incident={selectedIncident} onClose={() => setSelectedIncident(null)} onAnalyse={analyseIncident} />
    </>
  )
}
