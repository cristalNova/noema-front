import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage, toApiError } from '@/shared/api'
import type { Paginated } from '@/shared/types/Paginated'
import { readPageParam } from '@/shared/utils/pagination'
import { notificationsApi } from '../api/notificationsApi'
import { useUnreadCount } from './useUnreadCount'
import type { AppNotification } from '../model/Notification'

/** Tiempo para deshacer una eliminación antes de enviarla al servidor. */
export const UNDO_DELETE_MS = 6000

interface PendingDeletion {
  notification: AppNotification
  timer: number
}

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
  const { unread, adjust, clear, hold } = useUnreadCount()
  // Eliminadas que se ocultan ya, pero se envían al servidor cuando termina el plazo para deshacer.
  const pending = useRef(new Map<number, PendingDeletion>())
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<number>>(() => new Set())
  const [undoable, setUndoable] = useState<AppNotification | null>(null)
  // Recargas en segundo plano: actualizan la página sin pasar por "Cargando…".
  const [revision, setRevision] = useState(0)
  const lastRevision = useRef(0)

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

  useEffect(() => {
    if (revision === lastRevision.current) return
    lastRevision.current = revision
    const controller = new AbortController()
    notificationsApi
      .list({ page }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setSettled((previous) => (previous?.page === page && previous.result ? { ...previous, result } : previous))
      })
      .catch(() => {
        /* se conserva lo que ya se muestra; la próxima recarga lo corregirá */
      })
    return () => controller.abort()
  }, [revision, page])

  // Solo vale la respuesta de la página y el intento actuales; si no, seguimos "cargando".
  const current = settled?.page === page && settled.attempt === attempt ? settled : null
  const result = current?.result ?? null
  const lastPage = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1
  // El backend responde 200 con la lista vacía si la página no existe (URL antigua o ya se borraron).
  const isOutOfRange = result !== null && page > lastPage

  useEffect(() => {
    if (isOutOfRange) setPage(lastPage, { replace: true })
  }, [isOutOfRange, lastPage, setPage])

  const pageItems = result?.data ?? []
  const notifications = pageItems.filter((item) => !hiddenIds.has(item.id))
  const hiddenOnPage = pageItems.length - notifications.length
  // Al eliminar lo último de una página, se pasa a la anterior sin esperar al servidor.
  const pageEmptied = result !== null && pageItems.length > 0 && notifications.length === 0

  useEffect(() => {
    if (pageEmptied && page > 1) setPage(page - 1, { replace: true })
  }, [pageEmptied, page, setPage])

  const setHidden = useCallback((id: number, hidden: boolean) => {
    setHiddenIds((previous) => {
      const next = new Set(previous)
      if (hidden) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  /** Envía la eliminación al servidor. Si falla, la notificación vuelve a la lista. */
  const commitDeletion = useCallback(
    async (id: number) => {
      const entry = pending.current.get(id)
      if (!entry) return
      pending.current.delete(id)
      window.clearTimeout(entry.timer)
      setUndoable((current) => (current?.id === id ? null : current))
      const wasUnread = !entry.notification.isRead
      try {
        await notificationsApi.remove(id)
      } catch (reason) {
        // 404: ya no existe (p. ej. se borró en otra pestaña); el resultado es el buscado.
        if (toApiError(reason).status !== 404) {
          setHidden(id, false)
          if (wasUnread) hold(-1)
          setMarkError(`No se pudo eliminar la notificación. ${getErrorMessage(reason)}`)
          return
        }
      }
      // Ya no existe en el servidor: deja de descontarse y pasa a restarse del conteo guardado.
      if (wasUnread) {
        adjust(-1)
        hold(-1)
      }
      setRevision((value) => value + 1)
    },
    [adjust, hold, setHidden],
  )

  /** Oculta la notificación al instante y la elimina al terminar el plazo, salvo que se deshaga. */
  const remove = useCallback(
    (notification: AppNotification) => {
      if (pending.current.has(notification.id)) return
      setMarkError('')
      setHidden(notification.id, true)
      if (!notification.isRead) hold(1)
      const timer = window.setTimeout(() => void commitDeletion(notification.id), UNDO_DELETE_MS)
      pending.current.set(notification.id, { notification, timer })
      setUndoable(notification)
    },
    [commitDeletion, hold, setHidden],
  )

  const undo = useCallback(() => {
    if (!undoable) return
    const entry = pending.current.get(undoable.id)
    setUndoable(null)
    if (!entry) return
    window.clearTimeout(entry.timer)
    pending.current.delete(undoable.id)
    setHidden(undoable.id, false)
    if (!entry.notification.isRead) hold(-1)
    setAnnouncement('Se restauró la notificación.')
    // Si se había pasado a otra página, la restaurada vuelve a su sitio al recargar.
    setRevision((value) => value + 1)
  }, [undoable, hold, setHidden])

  // Al salir de la pantalla no se pierde lo eliminado: se envía sin esperar el plazo.
  const commitRef = useRef(commitDeletion)
  useEffect(() => {
    commitRef.current = commitDeletion
  }, [commitDeletion])
  useEffect(() => {
    const deletions = pending.current
    return () => {
      for (const id of [...deletions.keys()]) void commitRef.current(id)
    }
  }, [])

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
      // Las que esperan para eliminarse también quedaron leídas en el servidor: ya no hay que descontarlas.
      for (const entry of pending.current.values()) {
        if (!entry.notification.isRead) {
          entry.notification = { ...entry.notification, isRead: true }
          hold(-1)
        }
      }
      setAnnouncement(
        updated === 1 ? '1 notificación marcada como leída.' : `${updated} notificaciones marcadas como leídas.`,
      )
    } catch (reason) {
      setMarkError(getErrorMessage(reason))
    } finally {
      setIsMarkingAll(false)
    }
  }, [clear, hold])

  return {
    notifications,
    total: Math.max(0, (result?.total ?? 0) - hiddenOnPage),
    /** La página quedó vacía pero hay más en las siguientes: llegarán al confirmar la eliminación. */
    isRefilling: pageEmptied && page === 1 && (result?.total ?? 0) > pageItems.length,
    limit: result?.limit ?? 20,
    page,
    isLoading: current === null || isOutOfRange,
    error: current?.error ?? '',
    setPage,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    markAsRead,
    markAllAsRead,
    remove,
    undo,
    undoable,
    isMarkingAll,
    unread,
    markError,
    announcement,
  }
}
