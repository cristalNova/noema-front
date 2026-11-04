import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { setUnauthorizedHandler, tokenStorage } from '@/shared/api'
import {
  AuthContext,
  authApi,
  authReducer,
  loadInitialState,
  type AuthContextValue,
} from '@/features/auth'
import { captureReturnState } from '@/shared/utils/navigation'
import { router } from '../router'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, loadInitialState)

  useEffect(() => {
    // 401 con sesión activa (token vencido o revocado): limpiar y mandar al login con aviso.
    setUnauthorizedHandler(() => {
      dispatch({ type: 'expired' })
      const { pathname } = router.state.location
      const onAuthScreen = pathname === '/login' || pathname === '/register'
      void router.navigate('/login', { replace: true, state: onAuthScreen ? undefined : captureReturnState() })
    })

    // Re-lee el almacenamiento cuando otra pestaña inicia/cierra sesión o cuando el navegador
    // restaura la página desde su caché "atrás/adelante" (bfcache), que no vuelve a ejecutar JS.
    const sync = () => dispatch({ type: 'synced', state: loadInitialState() })
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) sync()
    }
    const unsubscribe = tokenStorage.subscribe(sync)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      setUnauthorizedHandler(null)
      unsubscribe()
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session: state.session,
      isAuthenticated: state.session !== null,
      sessionExpired: state.expired,
      async login(credentials) {
        const session = await authApi.login(credentials)
        tokenStorage.set(session.token)
        dispatch({ type: 'signedIn', session })
      },
      async logout() {
        try {
          await authApi.logout()
        } catch {
          /* sin red o token ya revocado: igual se cierra la sesión local */
        }
        tokenStorage.clear()
        dispatch({ type: 'signedOut' })
      },
    }),
    [state.session, state.expired],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
