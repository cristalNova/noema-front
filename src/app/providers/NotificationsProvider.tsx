import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth'
import { notificationsApi, UnreadContext, type UnreadContextValue } from '@/features/notifications'
import { useMyProfile } from '@/features/profiles'

const POLL_INTERVAL_MS = 60_000

interface Counted {
  userId: string
  count: number
}

/**
 * Mantiene el conteo de notificaciones sin leer para la barra y la pantalla de notificaciones.
 * Solo consulta con sesión y perfil (el backend exige perfil), y se refresca cada minuto
 * mientras la pestaña está visible y cada vez que vuelve a primer plano.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { status } = useMyProfile()
  const userId = session?.user.id ?? null
  const enabled = userId !== null && status === 'ready'

  const [counted, setCounted] = useState<Counted | null>(null)
  // Sube con cada ajuste local: una respuesta del servidor pedida antes ya está desactualizada.
  const version = useRef(0)

  const refresh = useCallback(() => {
    if (userId === null) return
    const requested = version.current
    notificationsApi
      .countUnread()
      .then((count) => {
        if (version.current === requested) setCounted({ userId, count })
      })
      .catch(() => {
        /* sin conteo la campana simplemente no muestra insignia */
      })
  }, [userId])

  useEffect(() => {
    if (!enabled) return

    refresh()
    const tick = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const interval = window.setInterval(tick, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [enabled, refresh])

  const adjust = useCallback(
    (delta: number) => {
      if (userId === null) return
      version.current += 1
      setCounted((previous) => {
        const base = previous?.userId === userId ? previous.count : 0
        return { userId, count: Math.max(0, base + delta) }
      })
    },
    [userId],
  )

  const clear = useCallback(() => {
    if (userId === null) return
    version.current += 1
    setCounted({ userId, count: 0 })
  }, [userId])

  // Un conteo guardado de otro usuario (cierre de sesión y nuevo ingreso) no se muestra.
  const unread = enabled && counted?.userId === userId ? counted.count : 0

  const value = useMemo<UnreadContextValue>(
    () => ({ unread, refresh, adjust, clear }),
    [unread, refresh, adjust, clear],
  )

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
}
