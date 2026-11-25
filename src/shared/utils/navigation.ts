/** Estado que viaja en la navegación hacia login/registro para poder volver. */
export interface ReturnState {
  from: string
  scrollY?: number
}

/** Solo recuperar destinos internos guardados por los guards de navegación. */
export function getReturnTo(state: unknown, fallback = '/'): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return fallback
  const from = state.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\')
    ? from : fallback
}

/** Captura dónde está la persona ahora (o `returnTo`, si la acción debe volver a otra URL). */
export function captureReturnState(returnTo?: string): ReturnState {
  const { pathname, search, hash } = window.location
  return {
    from: returnTo ?? `${pathname}${search}${hash}`,
    scrollY: Math.round(window.scrollY),
  }
}

/** Posición de scroll a la que volver, si el estado la trae. */
export function getRestoreScrollY(state: unknown): number | null {
  if (!state || typeof state !== 'object') return null
  const y = 'restoreScrollY' in state ? state.restoreScrollY : 'scrollY' in state ? state.scrollY : null
  return typeof y === 'number' && Number.isFinite(y) && y > 0 ? y : null
}

/** Estado para la navegación de regreso: la página destino restaura el scroll con él. */
export function getRestoreState(state: unknown): { restoreScrollY: number } | undefined {
  const y = getRestoreScrollY(state)
  return y === null ? undefined : { restoreScrollY: y }
}
