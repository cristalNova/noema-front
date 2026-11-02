import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Ruta privada: sin sesión redirige al login. `replace` evita que "Atrás" vuelva a ella. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
}
