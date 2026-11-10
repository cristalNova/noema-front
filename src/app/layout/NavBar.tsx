import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { useUnreadCount } from '@/features/notifications'
import { useMyProfile } from '@/features/profiles'
import { Logo } from '@/shared/components/Logo'
import './NavBar.css'

export function NavBar() {
  const { session, isAuthenticated, logout } = useAuth()
  const { unread } = useUnreadCount()
  const { profile } = useMyProfile()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  // Si la foto no carga (URL rota) se vuelve a la inicial; se reintenta al cambiar la URL.
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const photoFailed = failedPhoto !== null && failedPhoto === profile?.photoUrl
  const [menuOpen, setMenuOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        <Logo />
      </Link>

      <nav className="navbar__main" aria-label="Navegación principal">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/articles">Leer ensayos</NavLink>
        <NavLink to="/communities">Comunidades</NavLink>
        <NavLink to="/posts">Publicaciones</NavLink>
        <NavLink to="/app/articles" end>Mis ensayos</NavLink>
        <NavLink to="/app/articles/new">Escribir</NavLink>
      </nav>

      {isAuthenticated && session ? (
        <nav className="navbar__actions" aria-label="Sesión">
          <NavLink
            to="/app/notifications"
            className="navbar__icon"
            aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
            title="Notificaciones"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
              <path d="M10.3 20a2 2 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && (
              <span className="navbar__badge" aria-hidden="true">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </NavLink>
          <div className="navbar__account" ref={accountRef}>
            <button
              type="button"
              ref={triggerRef}
              className="navbar__account-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="navbar-account-menu"
              aria-label={`Cuenta de ${profile?.name ?? session.user.email}`}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="navbar__avatar" aria-hidden="true">
                {profile?.photoUrl && !photoFailed ? (
                  <img src={profile.photoUrl} alt="" onError={() => setFailedPhoto(profile.photoUrl)} />
                ) : (
                  (profile?.name ?? session.user.email).charAt(0).toUpperCase()
                )}
              </span>
              <svg className="navbar__chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <div className="navbar__menu" id="navbar-account-menu" role="menu">
                {profile ? (
                  <p className="navbar__menu-email">
                    <strong className="navbar__menu-name">{profile.name}</strong>@{profile.username}
                  </p>
                ) : (
                  <p className="navbar__menu-email">{session.user.email}</p>
                )}
                {profile && <Link role="menuitem" className="navbar__menu-item" to={`/profiles/${profile.id}`} onClick={() => setMenuOpen(false)}>Mi perfil</Link>}
                {profile && <Link role="menuitem" className="navbar__menu-item" to="/app/profile/edit" onClick={() => setMenuOpen(false)}>Editar perfil</Link>}
                <Link role="menuitem" className="navbar__menu-item" to="/onboarding/interests" onClick={() => setMenuOpen(false)}>Mis intereses</Link>
                {profile && <Link role="menuitem" className="navbar__menu-item" to="/communities/mine" onClick={() => setMenuOpen(false)}>Mis comunidades</Link>}
                <Link role="menuitem" className="navbar__menu-item" to="/app/plans" onClick={() => setMenuOpen(false)}>
                  Mis planes
                </Link>
                <Link role="menuitem" className="navbar__menu-item" to="/app/collections" onClick={() => setMenuOpen(false)}>Mis colecciones</Link>
                <button type="button" role="menuitem" className="navbar__menu-item" onClick={handleLogout} disabled={loggingOut}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
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
