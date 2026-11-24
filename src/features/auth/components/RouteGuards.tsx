import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { hasAnyPermission } from '../model/permissions'
import { AccessDenied } from './AccessDenied'

/** Ruta privada: sin sesión redirige al login. `replace` evita que "Atrás" vuelva a ella. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
}

export function RequirePermission({ anyOf }: { anyOf: readonly string[] }) {
  const { session } = useAuth()
  return hasAnyPermission(session?.user, anyOf) ? <Outlet /> : <AccessDenied />
}
