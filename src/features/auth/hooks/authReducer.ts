import { tokenStorage } from '@/shared/api'
import { isExpired, sessionFromToken } from '../model/authMappers'
import type { Session } from '../model/Session'

export interface AuthState {
  session: Session | null
  /** La sesión terminó por vencimiento (no por cierre voluntario): la UI muestra un aviso. */
  expired: boolean
}

export type AuthAction =
  | { type: 'signedIn'; session: Session }
  | { type: 'signedOut' }
  | { type: 'expired' }
  | { type: 'synced'; state: AuthState }

export function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'signedIn':
      return { session: action.session, expired: false }
    case 'signedOut':
      return { session: null, expired: false }
    case 'expired':
      return { session: null, expired: true }
    case 'synced':
      return action.state
  }
}

/** Restaura la sesión guardada; descarta tokens inválidos o vencidos. */
export function loadInitialState(): AuthState {
  const token = tokenStorage.get()
  if (!token) return { session: null, expired: false }

  const session = sessionFromToken(token)
  if (!session || isExpired(session)) {
    tokenStorage.clear()
    return { session: null, expired: session !== null }
  }
  return { session, expired: false }
}
