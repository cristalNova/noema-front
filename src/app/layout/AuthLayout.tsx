import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/shared/components/Logo'
import './AuthLayout.css'

interface AuthLayoutProps {
  heading: string
  title: string
  footer: ReactNode
  children: ReactNode
}

/** Estructura común de las pantallas de acceso: título grande sobre lavanda + hoja blanca. */
export function AuthLayout({ heading, title, footer, children }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <header className="auth-layout__hero">
        <Link className="auth-layout__brand" to="/"><Logo /></Link>
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
