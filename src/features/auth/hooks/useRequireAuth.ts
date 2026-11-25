import { useCallback, useContext } from 'react'
import { AuthPromptContext } from './AuthPromptContext'
import { useAuth } from './useAuth'

/**
 * Para acciones que exigen cuenta (guardar, comentar, reaccionar, seguir, publicar…).
 * Devuelve true si hay sesión; si no, muestra el aviso con acceso a login/registro
 * y devuelve false para que el llamador no ejecute la acción.
 *
 *   const requireAuth = useRequireAuth()
 *   function onSave() {
 *     if (!requireAuth('guardar este ensayo')) return
 *     ...
 *   }
 */
export function useRequireAuth() {
  const { isAuthenticated } = useAuth()
  const prompt = useContext(AuthPromptContext)
  if (!prompt) throw new Error('useRequireAuth debe usarse dentro de <AuthPromptProvider>')
  const { promptLogin } = prompt

  return useCallback(
    (reason?: string, returnTo?: string): boolean => {
      if (isAuthenticated) return true
      promptLogin(reason, returnTo)
      return false
    },
    [isAuthenticated, promptLogin],
  )
}
