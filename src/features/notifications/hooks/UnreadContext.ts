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
  /**
   * Descuenta notificaciones no leídas que aún existen en el servidor pero ya no se muestran
   * (eliminadas a la espera de "Deshacer"). A diferencia de `adjust`, sobrevive a las consultas
   * periódicas: se resta de cada conteo que llegue. +1 al ocultar una, -1 al restaurarla o al
   * confirmar su eliminación.
   */
  hold: (delta: number) => void
}

export const UnreadContext = createContext<UnreadContextValue | null>(null)
