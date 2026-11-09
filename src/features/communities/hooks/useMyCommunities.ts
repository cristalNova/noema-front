import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '@/shared/api'
import type { Paginated } from '@/shared/types/Paginated'
import { readPageParam } from '@/shared/utils/pagination'
import { listMyCommunities } from '../api/myCommunitiesApi'
import type { MyCommunity } from '../model/myCommunity'

interface Settled {
  page: number
  attempt: number
  result: Paginated<MyCommunity> | null
  error: string
}

/** Caso de uso: listar mis comunidades. La página vive en la URL (`?page=`). */
export function useMyCommunities() {
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
    listMyCommunities({ page }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSettled({ page, attempt, result, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setSettled({ page, attempt, result: null, error: getErrorMessage(reason) })
      })
    return () => controller.abort()
  }, [page, attempt])

  const current = settled?.page === page && settled.attempt === attempt ? settled : null
  const result = current?.result ?? null
  const lastPage = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1
  // Si al salir de la última comunidad de una página esta queda vacía, se vuelve a la anterior.
  const isOutOfRange = result !== null && page > lastPage

  useEffect(() => {
    if (isOutOfRange) setPage(lastPage, { replace: true })
  }, [isOutOfRange, lastPage, setPage])

  /** Quita la comunidad de la lista al instante, sin recargarla. */
  const remove = useCallback((communityId: number) => {
    setSettled((previous) => {
      if (!previous?.result) return previous
      const data = previous.result.data.filter((item) => item.id !== communityId)
      const total = Math.max(0, previous.result.total - (data.length < previous.result.data.length ? 1 : 0))
      return { ...previous, result: { ...previous.result, data, total } }
    })
  }, [])

  return {
    communities: result?.data ?? [],
    total: result?.total ?? 0,
    limit: result?.limit ?? 20,
    page,
    isLoading: current === null || isOutOfRange,
    error: current?.error ?? '',
    setPage,
    reload: useCallback(() => setAttempt((value) => value + 1), []),
    remove,
  }
}
