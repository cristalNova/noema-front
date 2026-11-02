/** Solo recuperar destinos internos guardados por los guards de navegación. */
export function getReturnTo(state: unknown, fallback = '/'): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return fallback
  const from = state.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.includes('\\')
    ? from : fallback
}
