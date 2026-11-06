import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { Icon } from './Icon'
import type { Incident } from '../lib/types'
import { CATEGORIES, CITIES, STATUS_META, STATUS_ORDER } from '../lib/ui'

interface LiveMapProps {
  incidents: Incident[]
  highlightedIds: string[]
  selectedId?: string | null
  loading?: boolean
  error?: string | null
  onSelectIncident: (incident: Incident) => void
  onClearHighlight?: () => void
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function LiveCivicMap({
  incidents,
  highlightedIds,
  selectedId,
  loading,
  error,
  onSelectIncident,
  onClearHighlight,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const highlightLayerRef = useRef<L.LayerGroup | null>(null)
  const [city, setCity] = useState('All')
  const [category, setCategory] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [status, setStatus] = useState('All')

  const filtered = useMemo(
    () =>
      incidents.filter((incident) => {
        if (!incident.lat || !incident.lng) return false
        if (city !== 'All' && incident.city !== city) return false
        if (category !== 'All' && incident.category !== category) return false
        if (severity !== 'All' && incident.severity !== severity) return false
        if (status !== 'All' && incident.status !== status) return false
        return true
      }),
    [incidents, city, category, severity, status],
  )

  const filtersActive = [city, category, severity, status].some((value) => value !== 'All')

  useEffect(() => {
    const element = containerRef.current
    if (!element || mapRef.current) return

    const map = L.map(element, {
      center: [15.44, 73.88],
      zoom: 10,
      minZoom: 8,
      maxZoom: 16,
      scrollWheelZoom: true,
      zoomControl: true,
    })

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution:
        'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 16,
    }).addTo(map)

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 44,
      iconCreateFunction: (group) =>
        L.divIcon({
          className: 'civic-cluster-wrap',
          html: `<div class="civic-cluster"><span>${group.getChildCount()}</span></div>`,
          iconSize: L.point(38, 38),
        }),
    })
    map.addLayer(cluster)
    const aiPane = map.createPane('civicAiPane')
    aiPane.style.zIndex = '650'
    const highlights = L.layerGroup().addTo(map)

    mapRef.current = map
    clusterRef.current = cluster
    highlightLayerRef.current = highlights

    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(element)
    const timer = window.setTimeout(() => map.invalidateSize(), 180)

    return () => {
      resize.disconnect()
      window.clearTimeout(timer)
      map.remove()
      mapRef.current = null
      clusterRef.current = null
      highlightLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const cluster = clusterRef.current
    const highlightLayer = highlightLayerRef.current
    if (!map || !cluster || !highlightLayer) return

    cluster.clearLayers()
    highlightLayer.clearLayers()
    const markers: L.Marker[] = []

    for (const incident of filtered) {
      if (incident.lat == null || incident.lng == null) continue
      const highlighted = highlightedIds.includes(incident.id)
      const selected = selectedId === incident.id
      const icon = L.divIcon({
        className: `civic-marker civic-marker--${incident.severity}${highlighted ? ' is-ai' : ''}${selected ? ' is-selected' : ''}`,
        html: '<span></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      const marker = L.marker([incident.lat, incident.lng], {
        icon,
        title: `${incident.ref} · ${incident.title}`,
        alt: `${incident.ref}, ${incident.category}, ${incident.city}`,
        keyboard: true,
      })
      marker.bindTooltip(`${incident.ref} · ${incident.title}`, {
        direction: 'top',
        offset: [0, -10],
        className: 'civic-tooltip',
        opacity: 1,
      })
      marker.on('click', () => onSelectIncident(incident))
      markers.push(marker)

      if (highlighted) {
        const aiMarker = L.marker([incident.lat, incident.lng], {
          icon: L.divIcon({
            className: 'civic-marker civic-marker--ai',
            html: '<span></span>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          pane: 'civicAiPane',
          zIndexOffset: 1000,
          title: `${incident.ref} · ${incident.title}`,
          alt: `AI match: ${incident.ref}, ${incident.category}, ${incident.city}`,
          keyboard: true,
        })
        aiMarker.bindTooltip(`${incident.ref} · AI match`, {
          direction: 'top',
          offset: [0, -11],
          className: 'civic-tooltip',
          opacity: 1,
        })
        aiMarker.on('click', () => onSelectIncident(incident))
        highlightLayer.addLayer(aiMarker)
      }
    }

    cluster.addLayers(markers)

    const highlighted = filtered.filter((incident) => highlightedIds.includes(incident.id))
    const focus = highlighted.length ? highlighted : filtered

    if (focus.length) {
      const bounds = L.latLngBounds(focus.map((incident) => [incident.lat as number, incident.lng as number]))
      map.fitBounds(bounds.pad(0.16), { maxZoom: highlighted.length === 1 ? 14 : 12, animate: false })
    } else {
      map.setView([15.44, 73.88], 10, { animate: false })
    }
  }, [filtered, highlightedIds, selectedId, onSelectIncident])

  function resetFilters() {
    setCity('All')
    setCategory('All')
    setSeverity('All')
    setStatus('All')
  }

  return (
    <div className="live-map">
      <div className="map-filters" role="group" aria-label="Filter incidents on the map">
        <label>
          <span>Location</span>
          <select className="select" value={city} onChange={(event) => setCity(event.target.value)} aria-label="Filter map by location">
            <option value="All">All Goa</option>
            {CITIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter map by category">
            <option value="All">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select className="select" value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter map by priority">
            <option value="All">All priorities</option>
            {(['critical', 'high', 'medium', 'low'] as const).map((item) => (
              <option key={item} value={item}>
                {SEVERITY_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter map by status">
            <option value="All">All statuses</option>
            {STATUS_ORDER.map((item) => (
              <option key={item} value={item}>
                {STATUS_META[item].label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="map-filter-reset"
          onClick={resetFilters}
          disabled={!filtersActive}
          title="Reset map filters"
        >
          <Icon name="refresh" size={14} />
          <span>Reset</span>
        </button>
      </div>

      <div className="live-map__status">
        <span>
          <strong>{filtered.length}</strong> of {incidents.length} incidents on the map
        </span>
        {highlightedIds.length ? (
          <button type="button" className="map-ai-chip" onClick={onClearHighlight}>
            <Icon name="sparkle" size={12} /> AI highlighted {highlightedIds.length}
            <Icon name="close" size={11} />
          </button>
        ) : (
          <span className="map-hint">Click a marker for details</span>
        )}
      </div>

      <div className="live-map__canvas">
        <div ref={containerRef} className="live-map__leaflet" role="application" aria-label="Interactive map of civic incidents across Goa" />
        {loading ? (
          <div className="live-map__overlay">
            <span className="spinner" />
            <span>Plotting incidents…</span>
          </div>
        ) : null}
        {error ? <div className="live-map__overlay live-map__overlay--error">{error}</div> : null}
      </div>

      <div className="live-map__legend">
        {(['critical', 'high', 'medium', 'low'] as const).map((tone) => (
          <span key={tone}>
            <i className={`legend-dot legend-dot--${tone}`} /> {SEVERITY_LABEL[tone]}
          </span>
        ))}
        {highlightedIds.length ? (
          <span>
            <i className="legend-dot legend-dot--ai" /> AI match
          </span>
        ) : null}
        <span className="live-map__source">Esri dark basemap · simulated incidents</span>
      </div>
    </div>
  )
}
