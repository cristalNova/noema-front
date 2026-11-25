import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ADMIN_PERMISSIONS, hasAnyPermission, useAuth } from '@/features/auth'
import './ProfileShortcuts.css'

interface Shortcut {
  to: string
  label: string
  icon: ReactNode
  adminOnly?: boolean
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

/** Accesos a lo propio de la cuenta. Antes vivían en el menú desplegable del NavBar, que ya era demasiado largo. */
const SHORTCUTS: readonly Shortcut[] = [
  { to: '/app/continue-reading', label: 'Continuar leyendo', icon: <Icon><path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z" /><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z" /></Icon> },
  { to: '/app/favorites', label: 'Mis favoritos', icon: <Icon><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" /></Icon> },
  { to: '/app/bookmarks', label: 'Mis marcadores', icon: <Icon><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" /></Icon> },
  { to: '/app/reading-lists', label: 'Mis listas', icon: <Icon><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></Icon> },
  { to: '/app/collections', label: 'Mis colecciones', icon: <Icon><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></Icon> },
  { to: '/communities/mine', label: 'Mis comunidades', icon: <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></Icon> },
  { to: '/onboarding/interests', label: 'Mis intereses', icon: <Icon><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.2" /></Icon> },
  { to: '/app/plans', label: 'Mis planes', icon: <Icon><path d="m12 2 10 5-10 5L2 7Z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></Icon> },
  { to: '/app/subscriptions', label: 'Mis suscripciones', icon: <Icon><path d="m17 2 4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 22-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></Icon> },
  { to: '/app/payments', label: 'Historial de pagos', icon: <Icon><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></Icon> },
  { to: '/app/profile/edit', label: 'Editar perfil', icon: <Icon><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon> },
  { to: '/admin', label: 'Administración', adminOnly: true, icon: <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></Icon> },
]

/** Solo se muestra en el perfil propio. */
export function ProfileShortcuts() {
  const { session } = useAuth()
  const isAdmin = hasAnyPermission(session?.user, ADMIN_PERMISSIONS)
  const shortcuts = SHORTCUTS.filter((shortcut) => !shortcut.adminOnly || isAdmin)

  return (
    <section className="profile-shortcuts" aria-labelledby="profile-shortcuts-heading">
      <div className="profile-shortcuts__heading">
        <h2 id="profile-shortcuts-heading">Mi espacio</h2>
        <span>Todo lo tuyo en un solo lugar</span>
      </div>
      <ul className="profile-shortcuts__grid">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.to}>
            <Link className="profile-shortcuts__tile" to={shortcut.to}>
              <span className="profile-shortcuts__icon">{shortcut.icon}</span>
              <span className="profile-shortcuts__label">{shortcut.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
