import { useId } from 'react'
import { CHART_COLORS, compactNumber, formatDay, formatNumber } from '../lib/ui'

interface Series {
  name: string
  color: string
  data: number[]
  dashed?: boolean
  area?: boolean
}

const W = 760
const H = 250
const PAD = { top: 16, right: 12, bottom: 26, left: 36 }

/** Catmull-Rom → cubic bezier for a soft, restrained curve. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length < 3) return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

export function LineChart({
  labels,
  series,
  height = 250,
  yTicks = 4,
}: {
  labels: string[]
  series: Series[]
  height?: number
  yTicks?: number
}) {
  const uid = useId().replace(/[:]/g, '')
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const all = series.flatMap((s) => s.data)
  const rawMax = Math.max(1, ...all)
  const step = Math.max(1, Math.ceil(rawMax / yTicks))
  const max = step * yTicks

  const xAt = (i: number) => PAD.left + (labels.length <= 1 ? innerW / 2 : (i * innerW) / (labels.length - 1))
  const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => i * step)
  const labelEvery = Math.max(1, Math.ceil(labels.length / 6))

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.name).join(' and ')} style={{ height }}>
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={s.name} id={`${uid}-g${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        <g className="chart-grid">
          {tickValues.map((tick) => (
            <line key={tick} x1={PAD.left} x2={W - PAD.right} y1={yAt(tick)} y2={yAt(tick)} />
          ))}
        </g>

        <g className="chart-axis">
          {tickValues.map((tick) => (
            <text key={tick} x={PAD.left - 9} y={yAt(tick) + 3} textAnchor="end">
              {tick}
            </text>
          ))}
          {labels.map((label, i) =>
            i % labelEvery === 0 || i === labels.length - 1 ? (
              <text key={`${label}-${i}`} x={xAt(i)} y={H - 6} textAnchor="middle">
                {formatDay(label)}
              </text>
            ) : null,
          )}
        </g>

        {series.map((s, idx) => {
          const pts = s.data.map((value, i) => ({ x: xAt(i), y: yAt(value) }))
          const path = smoothPath(pts)
          const areaPath = `${path} L${pts[pts.length - 1]?.x ?? PAD.left},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`
          return (
            <g key={s.name}>
              {s.area !== false ? <path d={areaPath} fill={`url(#${uid}-g${idx})`} /> : null}
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray={s.dashed ? '4 5' : undefined}
                vectorEffect="non-scaling-stroke"
              />
              {pts.map((p, i) =>
                i === pts.length - 1 ? <circle key={i} cx={p.x} cy={p.y} r={3.4} fill="#fffdf8" stroke={s.color} strokeWidth={2} /> : null,
              )}
            </g>
          )
        })}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ data, color = '#2f7f75' }: { data: number[]; color?: string }) {
  const w = 132
  const h = 36
  const max = Math.max(1, ...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((value, i) => ({
    x: (i / Math.max(1, data.length - 1)) * w,
    y: h - 4 - ((value - min) / range) * (h - 8),
  }))
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function BarList({
  items,
  valueLabel,
  tone,
}: {
  items: { label: string; value: number; color?: string }[]
  valueLabel?: (value: number) => string
  tone?: 'teal' | 'amber' | 'olive'
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="bar-list">
      {items.map((item, index) => (
        <div key={item.label}>
          <div className="bar-item__head">
            <span>{item.label}</span>
            <strong>{valueLabel ? valueLabel(item.value) : formatNumber(item.value)}</strong>
          </div>
          <MeterBar
            value={(item.value / max) * 100}
            color={item.color ?? (tone === 'amber' ? '#d29a34' : tone === 'olive' ? '#7f8e56' : CHART_COLORS[index % CHART_COLORS.length])}
          />
        </div>
      ))}
    </div>
  )
}

function MeterBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="meter">
      <span style={{ width: `${Math.max(2, value)}%`, background: color }} />
    </div>
  )
}

export function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 168,
}: {
  segments: { label: string; value: number; color: string }[]
  centerValue: string
  centerLabel: string
  size?: number
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  const stroke = 17
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ivory-200)" strokeWidth={stroke} />
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference
            const dash = `${Math.max(0, length - 2.5)} ${circumference - Math.max(0, length - 2.5)}`
            const el = (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )
            offset += length
            return el
          })}
        </svg>
        <div className="donut-center">
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="donut-legend">
        {segments.map((segment) => (
          <div className="donut-legend__row" key={segment.label}>
            <i style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StackedBar({ segments, height = 8 }: { segments: { value: number; color: string; label?: string }[]; height?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  return (
    <div className="city-bar__track" style={{ height }}>
      {segments.map((segment, index) => (
        <i
          key={`${segment.color}-${index}`}
          title={segment.label ? `${segment.label}: ${segment.value}` : undefined}
          style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }}
        />
      ))}
    </div>
  )
}

export function MiniBars({ data, color = '#2f7f75' }: { data: number[]; color?: string }) {
  const max = Math.max(1, ...data)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 34 }} aria-hidden="true">
      {data.map((value, index) => (
        <span
          key={index}
          style={{
            flex: 1,
            height: `${Math.max(8, (value / max) * 100)}%`,
            background: index === data.length - 1 ? color : 'var(--teal-200)',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  )
}

export function CountUpLabel({ value, suffix }: { value: number; suffix?: string }) {
  return (
    <span>
      {compactNumber(value)}
      {suffix ? <span className="muted"> {suffix}</span> : null}
    </span>
  )
}
