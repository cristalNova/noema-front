import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/shared/components/Logo'
import './AuthLayout.css'

interface AuthLayoutProps {
  heading: string
  title: string
  footer: ReactNode
  children: ReactNode
  /** Si se indica, se ofrece un botón para salir de la pantalla sin completar el acceso. */
  backTo?: string
  backLabel?: string
}

/** Estructura común de las pantallas de acceso: título grande sobre lavanda + hoja blanca. */
export function AuthLayout({ heading, title, footer, children, backTo, backLabel = 'Volver al inicio' }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <header className="auth-layout__hero">
        <div className="auth-layout__top">
          <Link className="auth-layout__brand" to="/"><Logo /></Link>
          {backTo && (
            <Link className="auth-layout__back" to={backTo}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
              {backLabel}
            </Link>
          )}
        </div>
        <h1>{heading}</h1>
      </header>

      <section className="auth-layout__sheet" aria-labelledby="auth-title">
        <h2 id="auth-title">{title}</h2>
        {children}
        <p className="auth-layout__alt">{footer}</p>
      </section>
    </main>
  )
}
