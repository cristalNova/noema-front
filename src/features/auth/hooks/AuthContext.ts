import { createContext } from 'react'
import type { Credentials } from '../model/Account'
import type { Session } from '../model/Session'

export interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  /** Inicia sesión, guarda el token y actualiza el estado global. */
  login: (credentials: Credentials) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
