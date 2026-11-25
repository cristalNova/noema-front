import { createContext } from 'react'

export interface AuthPromptContextValue {
  /**
   * Abre el aviso "inicia sesión o regístrate".
   * `reason` completa la frase "Necesitas una cuenta para …".
   * `returnTo` fuerza otra URL de regreso (por defecto, la página actual).
   */
  promptLogin: (reason?: string, returnTo?: string) => void
}

export const AuthPromptContext = createContext<AuthPromptContextValue | null>(null)
