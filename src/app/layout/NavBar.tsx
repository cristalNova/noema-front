import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import './NavBar.css'

export function NavBar() {
  const { session, isAuthenticated } = useAuth()

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        Noema
      </Link>

      {isAuthenticated && session ? (
        <nav className="navbar__actions" aria-label="Sesión">
          <button type="button" className="navbar__icon" aria-label="Notificaciones">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10.3 20a2 2 0 0 0 3.4 0" />
            </svg>
          </button>
          <span className="navbar__avatar" role="img" aria-label={`Cuenta de ${session.user.email}`}>
            {session.user.email.charAt(0).toUpperCase()}
          </span>
        </nav>
      ) : (
        <nav className="navbar__actions" aria-label="Acceso">
          <Link to="/login" className="navbar__link">
            Iniciar sesión
          </Link>
          <Link to="/register" className="navbar__cta">
            Crear cuenta
          </Link>
        </nav>
      )}
    </header>
  )
}
