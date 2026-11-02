import { Navigate, Outlet } from 'react-router-dom'
import { LoadingScreen } from '@/shared/components/LoadingScreen'
import { useMyProfile } from '../hooks/useMyProfile'

/**
 * Ruta que exige perfil: quien está autenticado pero no lo ha creado va al formulario.
 * Va dentro de una ruta autenticada (el provider solo consulta el perfil si hay sesión).
 */
export function RequireProfile() {
  const { status, reload } = useMyProfile()

  if (status === 'idle' || status === 'loading') return <LoadingScreen />
  if (status === 'missing') return <Navigate to="/profile/new" replace />
  if (status === 'error') {
    return (
      <div role="alert" style={{ padding: 24 }}>
        <p>No pudimos cargar tu perfil.</p>
        <button type="button" onClick={reload}>
          Reintentar
        </button>
      </div>
    )
  }
  return <Outlet />
}
