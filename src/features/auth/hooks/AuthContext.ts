import { createContext } from 'react'
import type { Credentials } from '../model/Account'
import type { Session } from '../model/Session'

export interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  /** true si la última sesión terminó por vencimiento del token. */
  sessionExpired: boolean
  /** Inicia sesión, guarda el token y actualiza el estado global. */
  login: (credentials: Credentials) => Promise<void>
  /** Revoca el token en el servidor (si se puede) y limpia la sesión local siempre. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
