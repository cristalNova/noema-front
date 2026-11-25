const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const absolute = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

const MINUTE = 60
const HOUR = 3600
const DAY = 86400

/**
 * Fecha relativa en español ("hace 5 minutos", "ayer"). Pasada una semana (o si la fecha
 * está claramente en el futuro) muestra la fecha corta, porque "hace 40 días" dice poco.
 */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''

  const diff = Math.round((time - now) / 1000)
  const seconds = Math.abs(diff)

  if (diff > MINUTE) return absolute.format(time)
  if (seconds < MINUTE) return 'ahora mismo'
  if (seconds < HOUR) return relative.format(-Math.floor(seconds / MINUTE), 'minute')
  if (seconds < DAY) return relative.format(-Math.floor(seconds / HOUR), 'hour')
  if (seconds < 7 * DAY) return relative.format(-Math.floor(seconds / DAY), 'day')
  return absolute.format(time)
}
