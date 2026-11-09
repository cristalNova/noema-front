import { createContext } from 'react'

export interface UnreadContextValue {
  /** Notificaciones sin leer del usuario actual (0 si no hay sesión o aún no se sabe). */
  unread: number
  /** Vuelve a pedir el conteo al servidor. */
  refresh: () => void
  /** Ajuste local inmediato (-1 al marcar una como leída, +1 si hay que revertirlo). */
  adjust: (delta: number) => void
  /** Todas leídas: deja el conteo en 0. */
  clear: () => void
}

export const UnreadContext = createContext<UnreadContextValue | null>(null)
