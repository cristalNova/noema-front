import type { CSSProperties, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import './BookBackdrop.css'

// Portadas abstractas (sin texto) para decorar los márgenes; cada una es un SVG propio.
const DESIGNS = {
  sun: {
    base: '#6256a8',
    art: (
      <>
        <circle cx="64" cy="76" r="30" fill="#e0a96d" />
        <rect x="22" y="110" width="84" height="6" rx="3" fill="#f8f0e2" />
        <rect x="22" y="124" width="56" height="4" rx="2" fill="#f8f0e2" opacity="0.6" />
        <rect x="22" y="22" width="40" height="5" rx="2.5" fill="#f8f0e2" opacity="0.7" />
      </>
    ),
  },
  stripes: {
    base: '#f3e9db',
    art: (
      <>
        <rect x="22" y="26" width="84" height="22" fill="#8c4f2f" />
        <rect x="22" y="54" width="84" height="22" fill="#d98c9a" />
        <rect x="22" y="82" width="84" height="22" fill="#22212b" />
        <rect x="22" y="122" width="60" height="5" rx="2.5" fill="#22212b" opacity="0.7" />
        <rect x="22" y="134" width="38" height="4" rx="2" fill="#22212b" opacity="0.4" />
      </>
    ),
  },
  arch: {
    base: '#9bb7a8',
    art: (
      <>
        <path d="M30 118 V70 a30 30 0 0 1 60 0 V118 Z" fill="#fffdfa" />
        <path d="M44 118 V74 a16 16 0 0 1 32 0 V118 Z" fill="#6256a8" />
        <rect x="22" y="130" width="76" height="5" rx="2.5" fill="#22212b" opacity="0.7" />
        <rect x="22" y="22" width="30" height="4" rx="2" fill="#22212b" opacity="0.5" />
      </>
    ),
  },
  dots: {
    base: '#22212b',
    art: (
      <>
        <circle cx="42" cy="58" r="16" fill="#d98c9a" />
        <circle cx="78" cy="58" r="16" fill="#c7c5f4" />
        <circle cx="60" cy="88" r="16" fill="#e0a96d" />
        <rect x="22" y="124" width="64" height="5" rx="2.5" fill="#f8f0e2" opacity="0.85" />
        <rect x="22" y="136" width="40" height="4" rx="2" fill="#f8f0e2" opacity="0.45" />
      </>
    ),
  },
  wave: {
    base: '#4b6a88',
    art: (
      <>
        <path d="M22 58 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#f8f0e2" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M22 78 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#9bb7a8" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M22 98 q10 -10 20 0 t20 0 t20 0 t20 0" stroke="#e0a96d" strokeWidth="5" strokeLinecap="round" fill="none" />
        <rect x="22" y="126" width="62" height="5" rx="2.5" fill="#f8f0e2" opacity="0.8" />
        <rect x="22" y="22" width="34" height="4" rx="2" fill="#f8f0e2" opacity="0.55" />
      </>
    ),
  },
  moon: {
    base: '#d98c9a',
    art: (
      <>
        <circle cx="58" cy="80" r="32" fill="#f8f0e2" />
        <circle cx="72" cy="70" r="28" fill="#d98c9a" />
        <circle cx="34" cy="38" r="2.5" fill="#f8f0e2" />
        <circle cx="88" cy="32" r="2" fill="#f8f0e2" />
        <rect x="22" y="126" width="66" height="5" rx="2.5" fill="#22212b" opacity="0.7" />
        <rect x="22" y="138" width="36" height="4" rx="2" fill="#22212b" opacity="0.4" />
      </>
    ),
  },
} satisfies Record<string, { base: string; art: ReactNode }>

type Design = keyof typeof DESIGNS

interface Placement {
  design: Design
  side: 'left' | 'right'
  top: string
  tilt: number
  delay: number
}

// Mismas portadas, distinta composición según la sección para que ninguna página se sienta idéntica.
const HOME: Placement[] = [
  { design: 'sun', side: 'left', top: '24vh', tilt: -14, delay: 0 },
  { design: 'dots', side: 'left', top: '64vh', tilt: 9, delay: 3.8 },
  { design: 'arch', side: 'right', top: '30vh', tilt: -7, delay: 2.6 },
  { design: 'stripes', side: 'right', top: '68vh', tilt: 11, delay: 1.4 },
]

const ARTICLES: Placement[] = [
  { design: 'arch', side: 'left', top: '20vh', tilt: 8, delay: 1 },
  { design: 'wave', side: 'left', top: '62vh', tilt: -10, delay: 3.2 },
  { design: 'sun', side: 'right', top: '36vh', tilt: 12, delay: 2 },
  { design: 'moon', side: 'right', top: '72vh', tilt: -6, delay: 0.4 },
]

const COMMUNITIES: Placement[] = [
  { design: 'dots', side: 'left', top: '30vh', tilt: -9, delay: 2.2 },
  { design: 'stripes', side: 'left', top: '68vh', tilt: 7, delay: 0.8 },
  { design: 'wave', side: 'right', top: '22vh', tilt: 11, delay: 3 },
  { design: 'sun', side: 'right', top: '62vh', tilt: -12, delay: 1.6 },
]

const WRITING: Placement[] = [
  { design: 'moon', side: 'left', top: '26vh', tilt: 10, delay: 1.2 },
  { design: 'arch', side: 'left', top: '66vh', tilt: -8, delay: 3.4 },
  { design: 'stripes', side: 'right', top: '30vh', tilt: -11, delay: 0.2 },
  { design: 'dots', side: 'right', top: '64vh', tilt: 8, delay: 2.4 },
]

// Páginas de lectura y el resto: solo dos portadas para no distraer.
const QUIET: Placement[] = [
  { design: 'wave', side: 'left', top: '44vh', tilt: -8, delay: 0.6 },
  { design: 'moon', side: 'right', top: '52vh', tilt: 9, delay: 2.8 },
]

function placementsFor(pathname: string): Placement[] {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (path === '/' || path === '/app') return HOME
  if (path === '/articles') return ARTICLES
  if (path.startsWith('/communities')) return COMMUNITIES
  if (path.startsWith('/app/articles')) return WRITING
  return QUIET
}

/** Capa fija detrás del contenido con portadas en los márgenes laterales; cambia de composición por ruta. */
export function BookBackdrop() {
  const { pathname } = useLocation()
  return (
    <div className="book-backdrop" aria-hidden="true">
      {placementsFor(pathname).map(({ design, side, top, tilt, delay }) => {
        const { base, art } = DESIGNS[design]
        const style = { '--top': top, '--tilt': `${tilt}deg`, '--delay': `${delay}s` } as CSSProperties
        return (
          <svg key={`${design}-${side}`} className={`book-backdrop__cover book-backdrop__cover--${side}`} style={style} viewBox="0 0 120 170" role="presentation">
            <rect width="120" height="170" rx="7" fill={base} />
            {art}
            <rect width="9" height="170" rx="4" fill="#22212b" opacity="0.16" />
            <rect x="9" width="1.5" height="170" fill="#fff" opacity="0.35" />
          </svg>
        )
      })}
    </div>
  )
}
