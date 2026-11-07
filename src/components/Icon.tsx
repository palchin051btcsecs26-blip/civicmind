import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.6 12 3.6l8.5 7" />
      <path d="M5.6 9.3V20a1 1 0 0 0 1 1H10v-5.4h4V21h3.4a1 1 0 0 0 1-1V9.3" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 17-5.5v13L3 14v-3Z" />
      <path d="M11.5 17.2a3.2 3.2 0 1 1-6.2-1.5" />
      <path d="M20 9.5v5" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="3.5" width="7.2" height="7.2" rx="1.4" />
      <rect x="13.8" y="3.5" width="7.2" height="4.4" rx="1.4" />
      <rect x="13.8" y="11.5" width="7.2" height="9" rx="1.4" />
      <rect x="3" y="14.3" width="7.2" height="6.2" rx="1.4" />
    </>
  ),
  map: (
    <>
      <path d="m3 6.2 6-2.7 6 2.7 6-2.7v14.4l-6 2.7-6-2.7-6 2.7V6.2Z" />
      <path d="M9 3.5v14.4M15 6.2v14.4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 16.4v-4.6M12 8.2h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <path d="M6.2 8.6a5.8 5.8 0 0 1 11.6 0c0 6.6 2 7.6 2 7.6H4.2s2-1 2-7.6Z" />
      <path d="M10.2 19.6a2 2 0 0 0 3.6 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m20 20-4.4-4.4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  arrowRight: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17 17 7M8.2 7H17v8.8" />,
  alert: (
    <>
      <path d="m12 3.4 9.2 16.2H2.8L12 3.4Z" />
      <path d="M12 9.4v4.4M12 17.2h.01" />
    </>
  ),
  alertCircle: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.8v4.8M12 16.2h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3.2 2" />
    </>
  ),
  check: <path d="m20 6.5-10.5 11L4 12" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m8.4 12.2 2.5 2.5 4.7-5" />
    </>
  ),
  users: (
    <>
      <path d="M15.8 20.4v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.4a3.6 3.6 0 0 0-3.6 3.6v1.8" />
      <circle cx="9.3" cy="7.6" r="3.6" />
      <path d="M21.2 20.4v-1.8a3.6 3.6 0 0 0-2.7-3.5M15.4 4.2a3.6 3.6 0 0 1 0 6.9" />
    </>
  ),
  camera: (
    <>
      <path d="M14.4 4.4H9.6L8 7.4H5a1.8 1.8 0 0 0-1.8 1.8v8.4A1.8 1.8 0 0 0 5 19.4h14a1.8 1.8 0 0 0 1.8-1.8V9.2A1.8 1.8 0 0 0 19 7.4h-3l-1.6-3Z" />
      <circle cx="12" cy="13.2" r="3.2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.8" width="6" height="11" rx="3" />
      <path d="M5 11.2a7 7 0 0 0 14 0M12 18.2v3" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10.2c0 6-8 11.4-8 11.4S4 16.2 4 10.2a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="2.8" />
    </>
  ),
  upload: (
    <>
      <path d="M20.5 15v3.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V15" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5M12 4.2v11.6" />
    </>
  ),
  download: (
    <>
      <path d="M20.5 15v3.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V15" />
      <path d="m7.5 11.5 4.5 4.5 4.5-4.5M12 16V4.2" />
    </>
  ),
  filter: <path d="M3.5 5.2h17L14 13v6.2l-4 1.8V13L3.5 5.2Z" />,
  refresh: (
    <>
      <path d="M20.6 12a8.6 8.6 0 1 1-2.9-6.4" />
      <path d="M20.6 3.4v6h-6" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 3.6v16.8h17" />
      <path d="M7.4 15.6v3M12 10.6v8M16.6 6.6v12" />
    </>
  ),
  activity: <path d="M3 12.2h3.8l2.8 7.2 4.2-15 3 9.8h4.2" />,
  layers: (
    <>
      <path d="m12 2.8 9 4.8-9 4.8-9-4.8 9-4.8Z" />
      <path d="m3 12.2 9 4.8 9-4.8M3 16.8l9 4.8 9-4.8" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M19 16.5v3.2M17.4 18.1h3.2" />
    </>
  ),
  building: (
    <>
      <path d="M4.4 20.4V5.2a1.4 1.4 0 0 1 1.4-1.4h9.2a1.4 1.4 0 0 1 1.4 1.4v15.2" />
      <path d="M16.4 9.6H19a1 1 0 0 1 1 1v9.8M3 20.4h18" />
      <path d="M8 7.6h3M8 11.2h3M8 14.8h3M8 18.4h3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9.4 7V4.2h5.2V7M6.4 7l.9 13h9.4l.9-13" />
      <path d="M10.4 11v5.4M13.6 11v5.4" />
    </>
  ),
  droplet: <path d="M12 2.8 6.4 8.5a7.9 7.9 0 1 0 11.2 0L12 2.8Z" />,
  bolt: <path d="M13.2 2.4 4.4 14h6.8l-1.2 7.6L19.6 10h-6.8l.4-7.6Z" />,
  tree: (
    <>
      <path d="M12 21.4V16" />
      <path d="M12 16a5.2 5.2 0 0 0 0-10.4 4.2 4.2 0 0 0-7.8 2.1A3.7 3.7 0 0 0 6.2 16H12Z" />
    </>
  ),
  paw: (
    <>
      <circle cx="7" cy="8" r="1.9" />
      <circle cx="11.4" cy="5.6" r="1.9" />
      <circle cx="16.2" cy="7.1" r="1.9" />
      <circle cx="18.2" cy="11.4" r="1.9" />
      <path d="M12 11.6c-2.8 0-5 2.4-5 4.6a2.6 2.6 0 0 0 4.4 1.9 2.6 2.6 0 0 0 4.4-1.9c0-2.2-1.2-4.6-3.8-4.6Z" />
    </>
  ),
  traffic: (
    <>
      <circle cx="6" cy="18.4" r="2.6" />
      <circle cx="18" cy="5.6" r="2.6" />
      <path d="M9 18.4h4.6a4.4 4.4 0 0 0 4.4-4.4V8.2" />
    </>
  ),
  waves: (
    <>
      <path d="M2.4 7c1.8 0 2.6-1.2 4.8-1.2S10 7 11.8 7s2.7-1.2 4.9-1.2S19.4 7 21.6 7" />
      <path d="M2.4 12.2c1.8 0 2.6-1.2 4.8-1.2s2.8 1.2 4.6 1.2 2.7-1.2 4.9-1.2 2.7 1.2 4.9 1.2" />
      <path d="M2.4 17.4c1.8 0 2.6-1.2 4.8-1.2s2.8 1.2 4.6 1.2 2.7-1.2 4.9-1.2 2.7 1.2 4.9 1.2" />
    </>
  ),
  road: (
    <>
      <path d="M5 21 8 3M19 21l-3-18" />
      <path d="M12 5v3M12 12v3M12 19v2" />
    </>
  ),
  shield: <path d="M12 21.4s8-4 8-10.2V5.4L12 2.6 4 5.4v5.8c0 6.2 8 10.2 8 10.2Z" />,
  send: <path d="M21.6 2.4 15 21.6l-4.2-7.8-7.8-4.2 18.6-7.2Z" />,
  calendar: (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="16" rx="2" />
      <path d="M16 2.8v3.6M8 2.8v3.6M3.4 10h17.2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="m15.6 8.4-2.2 5-5 2.2 2.2-5 5-2.2Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12S5.8 6 12 6s9.6 6 9.6 6-3.4 6-9.6 6-9.6-6-9.6-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 21v-6M4 10V3M12 21v-9M12 7V3M20 21v-4M20 12V3" />
      <path d="M1.8 15h4.4M9.8 7h4.4M17.8 17h4.4" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 20.4A7.4 7.4 0 0 1 3.6 13c0-6.4 8.4-9.6 16.8-9.6 0 8.4-3.2 17-9.4 17Z" />
      <path d="M3.6 21.4c3.2-6.4 7.4-9.8 12.8-11.8" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2M12 3.4c2.4 3 2.4 14.2 0 17.2M12 3.4c-2.4 3-2.4 14.2 0 17.2" />
    </>
  ),
  file: (
    <>
      <path d="M13.4 2.8H6.6a1.8 1.8 0 0 0-1.8 1.8v14.8a1.8 1.8 0 0 0 1.8 1.8h10.8a1.8 1.8 0 0 0 1.8-1.8V8.4l-5.6-5.6Z" />
      <path d="M13.4 2.8v5.6h5.6M8.4 13h7M8.4 16.6h4.6" />
    </>
  ),
  logout: (
    <>
      <path d="M9.4 4.4H5.8a1.8 1.8 0 0 0-1.8 1.8v11.6a1.8 1.8 0 0 0 1.8 1.8h3.6" />
      <path d="M15 8.2 18.8 12 15 15.8M9.4 12h9.4" />
    </>
  ),
}

export type IconName = keyof typeof paths

interface IconProps {
  name: IconName | string
  size?: number
  strokeWidth?: number
  className?: string
}

export function Icon({ name, size = 18, strokeWidth = 1.6, className }: IconProps) {
  const content = paths[name] ?? paths.info
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  )
}
