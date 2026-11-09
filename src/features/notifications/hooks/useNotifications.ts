import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api'
import type { Paginated } from '@/shared/types/Paginated'
import { readPageParam } from '@/shared/utils/pagination'
import { notificationsApi } from '../api/notificationsApi'
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

  return {
    notifications: result?.data ?? [],
    total: result?.total ?? 0,
    limit: result?.limit ?? 20,
    page,
    isLoading: current === null || isOutOfRange,
    error: current?.error ?? '',
    setPage,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
  }
}
