import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { setUnauthorizedHandler, tokenStorage } from '@/shared/api'
import { AuthContext, authApi, authReducer, loadInitialState, type AuthContextValue } from '@/features/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, loadInitialState)

  // Un 401 fuera del login (token vencido o revocado) cierra la sesión local.
  useEffect(() => {
    setUnauthorizedHandler(() => dispatch({ type: 'signedOut' }))
    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session: state.session,
      isAuthenticated: state.session !== null,
      async login(credentials) {
        const session = await authApi.login(credentials)
        tokenStorage.set(session.token)
        dispatch({ type: 'signedIn', session })
      },
    }),
    [state.session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
