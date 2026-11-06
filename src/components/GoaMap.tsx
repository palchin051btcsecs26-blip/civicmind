import { useMemo, useState } from 'react'
import type { HeatLocation } from '../lib/types'

const W = 760
const H = 520
const BOUNDS = { minLng: 73.655, maxLng: 74.35, minLat: 14.87, maxLat: 15.8 }

const px = (lng: number) => ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W
const py = (lat: number) => ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H

/** Stylised Goa outline — intentionally schematic, not a survey boundary. */
const LAND: [number, number][] = [
  [73.69, 15.79],
  [73.86, 15.77],
  [74.0, 15.77],
  [74.13, 15.78],
  [74.22, 15.74],
  [74.3, 15.66],
  [74.33, 15.55],
  [74.335, 15.42],
  [74.325, 15.3],
  [74.3, 15.18],
  [74.24, 15.04],
  [74.15, 14.955],
  [74.05, 14.9],
  [73.99, 14.925],
  [73.985, 14.985],
  [73.955, 15.035],
  [73.925, 15.085],
  [73.915, 15.13],
  [73.905, 15.175],
  [73.915, 15.22],
  [73.905, 15.265],
  [73.885, 15.305],
  [73.875, 15.345],
  [73.845, 15.375],
  [73.815, 15.41],
  [73.802, 15.445],
  [73.798, 15.475],
  [73.815, 15.502],
  [73.8, 15.515],
  [73.783, 15.517],
  [73.772, 15.535],
  [73.752, 15.552],
  [73.742, 15.575],
  [73.745, 15.605],
  [73.728, 15.64],
  [73.722, 15.675],
  [73.708, 15.705],
  [73.697, 15.745],
]

const RIVERS: [number, number][][] = [
  [
    [74.02, 15.57],
    [73.94, 15.545],
    [73.89, 15.535],
    [73.845, 15.52],
    [73.815, 15.503],
  ],
  [
    [74.06, 15.425],
    [73.99, 15.415],
    [73.93, 15.395],
    [73.88, 15.375],
    [73.855, 15.35],
    [73.835, 15.325],
  ],
  [
    [73.995, 15.245],
    [73.965, 15.225],
    [73.938, 15.2],
  ],
]

const CITY_POINTS: Record<string, { lat: number; lng: number }> = {
  Panaji: { lat: 15.4909, lng: 73.8278 },
  Calangute: { lat: 15.5439, lng: 73.7553 },
  Margao: { lat: 15.2832, lng: 73.9862 },
}

const landPath = `${LAND.map(([lng, lat], index) => `${index === 0 ? 'M' : 'L'}${px(lng).toFixed(1)},${py(lat).toFixed(1)}`).join(' ')} Z`

const riverPaths = RIVERS.map((river) =>
  river.map(([lng, lat], index) => `${index === 0 ? 'M' : 'L'}${px(lng).toFixed(1)},${py(lat).toFixed(1)}`).join(' '),
)

function heatColor(ratio: number) {
  if (ratio > 0.72) return { core: '#d4614f', halo: 'url(#heatHigh)' }
  if (ratio > 0.42) return { core: '#d29a34', halo: 'url(#heatMid)' }
  return { core: '#57a097', halo: 'url(#heatLow)' }
}

interface GoaMapProps {
  locations: HeatLocation[]
  cities: { name: string; total: number; open: number; critical?: number }[]
  selectedCity?: string | null
  onSelectCity?: (city: string | null) => void
  compact?: boolean
  showTourismCorridor?: boolean
}

export function GoaMap({
  locations,
  cities,
  selectedCity = null,
  onSelectCity,
  compact = false,
  showTourismCorridor = true,
}: GoaMapProps) {
  const [heatOn, setHeatOn] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)

  const maxIntensity = useMemo(() => Math.max(1, ...locations.map((l) => l.intensity)), [locations])
  const visible = useMemo(
    () => (selectedCity ? locations.filter((l) => l.city === selectedCity) : locations),
    [locations, selectedCity],
  )
  const cityList = useMemo(
    () =>
      (Object.keys(CITY_POINTS) as string[]).map((name) => {
        const found = cities.find((c) => c.name === name)
        return { name, total: found?.total ?? 0, open: found?.open ?? 0, critical: found?.critical ?? 0 }
      }),
    [cities],
  )

  const cityLabelOffsets: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
    Panaji: { dx: 14, dy: 4, anchor: 'start' },
    Calangute: { dx: -14, dy: -6, anchor: 'end' },
    Margao: { dx: 14, dy: 4, anchor: 'start' },
  }

  return (
    <div className="map-shell">
      {!compact && onSelectCity ? (
        <div className="map-toolbar">
          <div className="map-toolbar__group">
            <button type="button" className={`map-pill${selectedCity === null ? ' is-active' : ''}`} onClick={() => onSelectCity(null)}>
              <i />
              All Goa
            </button>
            {cityList.map((city) => (
              <button
                key={city.name}
                type="button"
                className={`map-pill${selectedCity === city.name ? ' is-active' : ''}`}
                onClick={() => onSelectCity(selectedCity === city.name ? null : city.name)}
              >
                {city.name}
                <span style={{ opacity: 0.55 }}>{city.total}</span>
              </button>
            ))}
          </div>
          <div className="map-toolbar__group">
            <button
              type="button"
              className={`map-pill${heatOn ? ' is-active' : ''}`}
              onClick={() => setHeatOn((value) => !value)}
              aria-pressed={heatOn}
            >
              Heat layer
            </button>
          </div>
        </div>
      ) : null}

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Schematic map of the Goa pilot area showing civic complaint density in Panaji, Calangute and Margao">
        <defs>
          <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#122b3a" />
            <stop offset="55%" stopColor="#0b1c28" />
            <stop offset="100%" stopColor="#07121b" />
          </linearGradient>
          <linearGradient id="land" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#1d3a44" />
            <stop offset="100%" stopColor="#142c36" />
          </linearGradient>
          <radialGradient id="heatLow">
            <stop offset="0%" stopColor="#57a097" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#57a097" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heatMid">
            <stop offset="0%" stopColor="#d29a34" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#d29a34" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heatHigh">
            <stop offset="0%" stopColor="#d4614f" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#d4614f" stopOpacity="0" />
          </radialGradient>
          <pattern id="mapGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="rgba(243,239,227,0.045)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={W} height={H} fill="url(#ocean)" />
        <rect width={W} height={H} fill="url(#mapGrid)" />

        {/* Ocean depth rings */}
        <g fill="none" stroke="rgba(87,160,151,0.09)">
          <path d="M-20 430 C 90 390, 150 300, 160 190 S 240 60, 330 20" />
          <path d="M-30 490 C 90 450, 165 360, 175 240 S 260 100, 360 60" />
        </g>

        <text x={44} y={286} fill="rgba(243,239,227,0.24)" fontSize="9" letterSpacing="4.5" fontFamily="var(--font-mono)" transform="rotate(-90 44 286)">
          ARABIAN SEA
        </text>
        <text x={672} y={132} fill="rgba(243,239,227,0.2)" fontSize="8" letterSpacing="3" fontFamily="var(--font-mono)" textAnchor="middle">
          MAHARASHTRA
        </text>
        <text x={678} y={458} fill="rgba(243,239,227,0.2)" fontSize="8" letterSpacing="3" fontFamily="var(--font-mono)" textAnchor="middle">
          KARNATAKA
        </text>

        <path d={landPath} fill="url(#land)" stroke="rgba(243,239,227,0.22)" strokeWidth="1.2" strokeLinejoin="round" />
        <path
          d={landPath}
          fill="none"
          stroke="rgba(87,160,151,0.35)"
          strokeWidth="4"
          strokeLinejoin="round"
          opacity="0.35"
          style={{ filter: 'blur(6px)' }}
        />

        {riverPaths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke="rgba(120,185,190,0.36)"
            strokeWidth={index === 0 ? 2.2 : 1.6}
            strokeLinecap="round"
          />
        ))}

        {showTourismCorridor ? (
          <g>
            <ellipse
              cx={px(73.757)}
              cy={py(15.548)}
              rx="54"
              ry="38"
              fill="rgba(210,154,52,0.05)"
              stroke="rgba(210,154,52,0.4)"
              strokeDasharray="3 4"
            />
            <text
              x={px(73.757)}
              y={py(15.548) - 48}
              fill="rgba(210,154,52,0.72)"
              fontSize="7.5"
              letterSpacing="1.4"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              TOURISM CORRIDOR
            </text>
          </g>
        ) : null}

        {heatOn
          ? visible.map((location) => {
              const ratio = location.intensity / maxIntensity
              const colors = heatColor(ratio)
              const cx = px(location.lng)
              const cy = py(location.lat)
              const radius = 16 + ratio * 30
              return (
                <g key={location.id} opacity={selectedCity && location.city !== selectedCity ? 0.3 : 1}>
                  <circle cx={cx} cy={cy} r={radius} fill={colors.halo} />
                  <circle cx={cx} cy={cy} r={4 + ratio * 3} fill={colors.core} opacity="0.92" />
                  {location.intensity >= maxIntensity * 0.7 ? (
                    <circle cx={cx} cy={cy} r={11 + ratio * 6} fill="none" stroke={colors.core} strokeWidth="0.8" strokeDasharray="2 3" opacity="0.8" />
                  ) : null}
                  <title>{`${location.name} — ${location.total} complaints, ${location.open} open`}</title>
                </g>
              )
            })
          : null}

        {cityList.map((city) => {
          const point = CITY_POINTS[city.name]
          const cx = px(point.lng)
          const cy = py(point.lat)
          const active = selectedCity === city.name
          const dim = selectedCity !== null && !active
          const offset = cityLabelOffsets[city.name]
          return (
            <g
              key={city.name}
              className="map-marker"
              opacity={dim ? 0.45 : 1}
              onClick={() => onSelectCity?.(active ? null : city.name)}
              role={onSelectCity ? 'button' : undefined}
              tabIndex={onSelectCity ? 0 : undefined}
              aria-label={`${city.name}: ${city.open} open complaints`}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && onSelectCity) {
                  event.preventDefault()
                  onSelectCity(active ? null : city.name)
                }
              }}
              onMouseEnter={() => setHovered(city.name)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle className="hit" cx={cx} cy={cy} r="24" />
              <circle cx={cx} cy={cy} r={active ? 17 : 13} fill="none" stroke={active ? '#fbf8ef' : 'rgba(243,239,227,0.45)'} strokeWidth="1" />
              <circle cx={cx} cy={cy} r="5.5" fill={active || hovered === city.name ? '#fbf8ef' : '#9ecac2'} />
              <circle cx={cx} cy={cy} r="2" fill="#0a1420" />
              <text className="map-label" x={cx + offset.dx} y={cy + offset.dy} textAnchor={offset.anchor}>
                {city.name}
              </text>
              <text
                className="map-sublabel"
                x={cx + offset.dx}
                y={cy + offset.dy + 13}
                textAnchor={offset.anchor}
                fontSize="8.5"
                fill="rgba(243,239,227,0.5)"
                fontFamily="var(--font-mono)"
                stroke="none"
              >
                {city.open} OPEN · {city.total} TOTAL
              </text>
            </g>
          )
        })}

        {/* North arrow + scale */}
        <g transform={`translate(${W - 58} 58)`} stroke="rgba(243,239,227,0.5)" fill="none" strokeWidth="1">
          <path d="M0 26V-6M0 -6l-4 8M0 -6l4 8" />
          <text x="0" y="-14" textAnchor="middle" fill="rgba(243,239,227,0.5)" fontSize="8" stroke="none" fontFamily="var(--font-mono)">
            N
          </text>
        </g>
        <g transform={`translate(${W - 158} ${H - 34})`}>
          <path d="M0 0h72" stroke="rgba(243,239,227,0.35)" strokeWidth="1" />
          <path d="M0 -3v3M36 -2v2M72 -3v3" stroke="rgba(243,239,227,0.35)" strokeWidth="1" />
          <text x="0" y="13" fill="rgba(243,239,227,0.35)" fontSize="7.5" fontFamily="var(--font-mono)" letterSpacing="1">
            10 KM
          </text>
        </g>
      </svg>

      {heatOn ? (
        <div className="map-legend">
          <span>Low</span>
          <i className="map-legend__ramp" />
          <span>High</span>
        </div>
      ) : null}
      <div className="map-caption">
        Schematic pilot view · not to survey scale
        <br />
        Simulated demonstration data
      </div>
    </div>
  )
}

/** Minimal, static map used inside hero and form summary panels. */
export function MapThumbnail({ className = '' }: { className?: string }) {
  return (
    <div className={`console-map ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 380 220">
        <defs>
          <linearGradient id="thumbOcean" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#16303f" />
            <stop offset="100%" stopColor="#08141d" />
          </linearGradient>
          <radialGradient id="thumbHeat">
            <stop offset="0%" stopColor="#d29a34" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#d29a34" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="thumbHeatRed">
            <stop offset="0%" stopColor="#d4614f" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#d4614f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="380" height="220" fill="url(#thumbOcean)" />
        <g opacity="0.5">
          <path d="M96 0c14 52 4 92-18 124S56 196 66 220" fill="none" stroke="rgba(243,239,227,0.16)" strokeWidth="1" />
          <path
            d="M78 -10 C 100 40 100 80 84 116 S 70 180 84 230 L 300 230 L 300 -10 Z"
            fill="#1b3540"
            stroke="rgba(243,239,227,0.2)"
            strokeWidth="1"
          />
        </g>
        <circle cx="112" cy="82" r="44" fill="url(#thumbHeatRed)" />
        <circle cx="122" cy="80" r="4" fill="#d4614f" />
        <circle cx="96" cy="112" r="34" fill="url(#thumbHeat)" />
        <circle cx="96" cy="112" r="3" fill="#d29a34" />
        <circle cx="140" cy="160" r="30" fill="url(#thumbHeat)" />
        <circle cx="140" cy="160" r="3" fill="#d29a34" />
        <text x="128" y="76" fill="#f3efe3" fontSize="8" fontFamily="var(--font-sans)">
          Calangute
        </text>
        <text x="104" y="126" fill="#f3efe3" fontSize="8" fontFamily="var(--font-sans)">
          Panaji
        </text>
        <text x="150" y="174" fill="#f3efe3" fontSize="8" fontFamily="var(--font-sans)">
          Margao
        </text>
        <g stroke="rgba(243,239,227,0.18)" strokeWidth="1">
          <path d="M12 12h18M12 12v18M368 208h-18M368 208v-18" />
        </g>
      </svg>
    </div>
  )
}
