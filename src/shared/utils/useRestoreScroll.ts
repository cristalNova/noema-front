import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const RESTORE_TIMEOUT_MS = 3000

/**
 * Tras volver de iniciar sesión, devuelve el scroll donde la persona lo dejó.
 * El contenido suele cargar de forma asíncrona, así que reintenta hasta que la página
 * sea lo bastante alta; se detiene si la persona empieza a desplazarse por su cuenta.
 */
export function useRestoreScroll() {
  const location = useLocation()
  const state: unknown = location.state
  const target =
    state && typeof state === 'object' && 'restoreScrollY' in state && typeof state.restoreScrollY === 'number'
      ? state.restoreScrollY
      : null

  useEffect(() => {
    if (target === null) return

    const start = performance.now()
    let frame = 0
    const stop = () => cancelAnimationFrame(frame)
    const tick = () => {
      window.scrollTo(0, target)
      if (Math.abs(window.scrollY - target) > 2 && performance.now() - start < RESTORE_TIMEOUT_MS) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    const events = ['wheel', 'touchstart', 'keydown'] as const
    events.forEach((name) => window.addEventListener(name, stop, { once: true, passive: true }))
    return () => {
      stop()
      events.forEach((name) => window.removeEventListener(name, stop))
    }
  }, [location.key, target])
}
