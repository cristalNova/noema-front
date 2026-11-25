import './Logo.css'

interface LogoProps {
  /** Muestra "Noema" junto al símbolo. */
  withWordmark?: boolean
}

/** Símbolo órbita (anillo, idea y satélite) sobre fondo negro, con el nombre opcional. */
export function Logo({ withWordmark = true }: LogoProps) {
  return (
    <span className="logo" role={withWordmark ? undefined : 'img'} aria-label={withWordmark ? undefined : 'Noema'}>
      <svg className="logo__mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#1a1a1f" />
        <circle cx="32" cy="32" r="20" stroke="#e9dcc3" strokeWidth="2.5" />
        <circle cx="30.6" cy="34.1" r="6.4" fill="#8a7fd0" />
        <circle cx="46.3" cy="17.7" r="4.3" fill="#1a1a1f" stroke="#e9dcc3" strokeWidth="2.2" />
      </svg>
      {withWordmark && <span className="logo__word">Noema</span>}
    </span>
  )
}
