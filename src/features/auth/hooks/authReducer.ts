import { tokenStorage } from '@/shared/api'
import { isExpired, sessionFromToken } from '../model/authMappers'
import type { Session } from '../model/Session'

export interface AuthState {
  session: Session | null
}

export type AuthAction = { type: 'signedIn'; session: Session } | { type: 'signedOut' }

export function authReducer(_state: AuthState, action: AuthAction): AuthState {
  return { session: action.type === 'signedIn' ? action.session : null }
}

/** Restaura la sesión guardada; descarta tokens inválidos o vencidos. */
export function loadInitialState(): AuthState {
  const token = tokenStorage.get()
  const session = token ? sessionFromToken(token) : null
  if (!session || isExpired(session)) {
    if (token) tokenStorage.clear()
    return { session: null }
  }
  return { session }
}
