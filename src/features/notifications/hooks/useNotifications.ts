import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api'
import type { Paginated } from '@/shared/types/Paginated'
import { readPageParam } from '@/shared/utils/pagination'
import { notificationsApi } from '../api/notificationsApi'
import { useUnreadCount } from './useUnreadCount'
import type { AppNotification } from '../model/Notification'

interface Settled {
  page: number
  attempt: number
  result: Paginated<AppNotification> | null
  error: string
}

/** Caso de uso: listar mis notificaciones. La página vive en la URL (`?page=`). */
export function useNotifications() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = readPageParam(searchParams)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled | null>(null)
  const [markError, setMarkError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const { unread, adjust, clear } = useUnreadCount()

  const setPage = useCallback(
    (next: number, options?: { replace?: boolean }) => {
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous)
        if (next <= 1) params.delete('page')
        else params.set('page', String(next))
        return params
      }, options)
    },
    [setSearchParams],
  )

  useEffect(() => {
    const controller = new AbortController()
    notificationsApi
      .list({ page }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSettled({ page, attempt, result, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ page, attempt, result: null, error: getErrorMessage(reason) })
      })
    return () => controller.abort()
  }, [page, attempt])

  // Solo vale la respuesta de la página y el intento actuales; si no, seguimos "cargando".
  const current = settled?.page === page && settled.attempt === attempt ? settled : null
  const result = current?.result ?? null
  const lastPage = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1
  // El backend responde 200 con la lista vacía si la página no existe (URL antigua o ya se borraron).
  const isOutOfRange = result !== null && page > lastPage

  useEffect(() => {
    if (isOutOfRange) setPage(lastPage, { replace: true })
  }, [isOutOfRange, lastPage, setPage])

  const setRead = useCallback((id: number, isRead: boolean) => {
    setSettled((previous) => {
      if (!previous?.result) return previous
      const data = previous.result.data.map((item) => (item.id === id ? { ...item, isRead } : item))
      return { ...previous, result: { ...previous.result, data } }
    })
  }, [])

  /**
   * Marca como leída al instante (sin recargar la lista) y confirma con el servidor.
   * Si el servidor falla, la deja como estaba y expone el error.
   */
  const markAsRead = useCallback(
    async (id: number): Promise<boolean> => {
      setMarkError('')
      setRead(id, true)
      adjust(-1)
      setAnnouncement('Notificación marcada como leída.')
      try {
        await notificationsApi.markAsRead(id)
        return true
      } catch (reason) {
        setRead(id, false)
        adjust(1)
        setAnnouncement('')
        setMarkError(getErrorMessage(reason))
        return false
      }
    },
    [setRead, adjust],
  )

  /** Marca todas (también las de otras páginas). El servidor decide cuántas eran no leídas. */
  const markAllAsRead = useCallback(async (): Promise<void> => {
    setMarkError('')
    setIsMarkingAll(true)
    try {
      const updated = await notificationsApi.markAllAsRead()
      setSettled((previous) => {
        if (!previous?.result) return previous
        const data = previous.result.data.map((item) => ({ ...item, isRead: true }))
        return { ...previous, result: { ...previous.result, data } }
      })
      clear()
      setAnnouncement(
        updated === 1 ? '1 notificación marcada como leída.' : `${updated} notificaciones marcadas como leídas.`,
      )
    } catch (reason) {
      setMarkError(getErrorMessage(reason))
    } finally {
      setIsMarkingAll(false)
    }
  }, [clear])

  return {
    notifications: result?.data ?? [],
    total: result?.total ?? 0,
    limit: result?.limit ?? 20,
    page,
    isLoading: current === null || isOutOfRange,
    error: current?.error ?? '',
    setPage,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    markAsRead,
    markAllAsRead,
    isMarkingAll,
    unread,
    markError,
    announcement,
  }
}
